# Deep Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 프로젝트 심층 리뷰에서 발견된 안정성·성능·인프라 이슈 10건을 순차 수정

**Architecture:** C++ SKSE 플러그인 안전성 패치 (Task 1-4, 8-9) + React 프론트엔드 훅 정확성·성능 개선 (Task 3, 5-6) + GitHub Actions CI 강화 (Task 7, 10). 각 수정은 독립적이며 순차 커밋.

**Tech Stack:** C++23/CommonLib-NG, React 19/TypeScript, GitHub Actions, Vitest

---

### Task 1: CriticalChanceEvaluator null 타겟 가드

**Files:**
- Modify: `src/CriticalChanceEvaluator.cpp:66-74`

**Step 1: Add null guard before HandleEntryPoint call**

`src/CriticalChanceEvaluator.cpp` 66줄 — `target`이 null이면 perk entry point 평가 없이 base crit chance만 반환:

```cpp
    auto* target = SelectCurrentTarget(player);

    // Some perk conditions dereference the combat target; skip entry point evaluation
    // when there is no target to avoid potential null-dereference in game code.
    if (target) {
        RE::BGSEntryPoint::HandleEntryPoint(
            RE::BGSEntryPoint::ENTRY_POINT::kCalculateMyCriticalHitChance,
            player,
            weapon,
            target,
            std::addressof(critChance));
    }
```

변경 범위: 66-74줄을 위 코드로 교체.

**Step 2: Verify build compiles**

Run (WSL, 문법 확인만):
```bash
cd "$(git rev-parse --show-toplevel)" && grep -n "target" src/CriticalChanceEvaluator.cpp
```
Expected: 수정된 null guard 코드 확인

**Step 3: Commit**

```bash
git add src/CriticalChanceEvaluator.cpp
git commit -m "fix(crit): guard HandleEntryPoint against null combat target"
```

---

### Task 2: NativeStorage ExportPreset에 temp+rename 패턴 적용

**Files:**
- Modify: `src/NativeStorage.cpp:221-240`

**배경:** `SaveSettingsSync`은 이미 temp→rename 패턴을 사용하지만, `ExportPreset`은 직접 쓰기(line 226). 크래시 시 프리셋 파일 손상 가능.

**Step 1: Refactor ExportPreset to use temp+rename**

`src/NativeStorage.cpp` 221-240줄을 다음으로 교체:

```cpp
bool ExportPreset(const std::filesystem::path& gameRootPath, std::string_view jsonData)
{
    if (!EnsureSettingsDirectory(gameRootPath)) return false;

    const auto presetPath = GetPresetPath(gameRootPath);
    auto tempPath = presetPath;
    tempPath += ".tmp";

    {
        std::ofstream file(tempPath, std::ios::binary | std::ios::trunc);
        if (!file.is_open()) {
            logger::error("Failed to open temp preset file for write: {}", tempPath.string());
            return false;
        }

        file.write(jsonData.data(), static_cast<std::streamsize>(jsonData.size()));
        file.flush();
        if (!file.good()) {
            logger::error("Preset export write failed: {}", tempPath.string());
            return false;
        }
    }

    std::error_code ec;
    std::filesystem::rename(tempPath, presetPath, ec);
    if (ec) {
        std::error_code removeEc;
        std::filesystem::remove(presetPath, removeEc);
        ec.clear();
        std::filesystem::rename(tempPath, presetPath, ec);
    }

    if (ec) {
        logger::error("Failed to replace preset file '{}': {}", presetPath.string(), ec.message());
        std::error_code cleanupEc;
        std::filesystem::remove(tempPath, cleanupEc);
        return false;
    }

    logger::info("Preset exported");
    return true;
}
```

**Step 2: Commit**

```bash
git add src/NativeStorage.cpp
git commit -m "fix(storage): use temp+rename for preset export to prevent corruption"
```

---

### Task 3: toggleWidgetsVisibilityHandler stale closure 수정

**Files:**
- Modify: `view/src/hooks/useSettings.ts:208-210`

**문제:** `settingsRef`가 `useEffect`를 통해 비동기 업데이트 → 상태 변경과 ref 갱신 사이에 stale 데이터 읽기 가능.

**Step 1: Replace useEffect-based ref sync with synchronous assignment**

`view/src/hooks/useSettings.ts` 208-210줄:
```typescript
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
```

위를 다음으로 교체 (useEffect 제거, 동기 할당):
```typescript
  settingsRef.current = settings;
```

이렇게 하면 render 시점에 즉시 ref가 갱신되어, 이후 실행되는 모든 핸들러에서 최신 settings를 읽음.

**Step 2: Run frontend tests**

```bash
cd "$(git rev-parse --show-toplevel)/view" && npm run test
```
Expected: PASS

**Step 3: Run lint**

```bash
cd "$(git rev-parse --show-toplevel)/view" && npm run lint
```
Expected: 0 errors

**Step 4: Commit**

```bash
git add view/src/hooks/useSettings.ts
git commit -m "fix(settings): sync settingsRef synchronously to prevent stale closure"
```

---

### Task 4: StatsCollector JSON 생성 최적화

**Files:**
- Modify: `src/StatsCollector.cpp:430`

**문제:** `json += "..." + value + ","` 패턴이 ~80회 반복 → 임시 string 객체 다수 생성. `reserve()` + `append()`로 개선.

**Step 1: Add reserve and use append pattern**

`src/StatsCollector.cpp` 430줄 변경:

```cpp
    std::string json;
    json.reserve(4096);
    json += '{';
```

기존 `std::string json = "{";` → 위 3줄로 교체.

그리고 `safeFloat()` 호출의 임시 string 생성을 줄이기 위해, `safeFloat()` 함수 (292-297줄)에 직접 append하는 오버로드 추가:

292줄 바로 아래에 새 함수 추가:
```cpp
static void appendFloat(std::string& out, float v) {
    if (std::isnan(v) || std::isinf(v)) {
        out += '0';
        return;
    }
    char buf[32];
    std::snprintf(buf, sizeof(buf), "%.2f", v);
    out += buf;
}
```

그 뒤 CollectStats 내부에서 자주 나오는 패턴:
```cpp
json += "\"magic\":" + safeFloat(resistMagic.effective) + ",";
```
을 다음으로 변환:
```cpp
json += "\"magic\":";
appendFloat(json, resistMagic.effective);
json += ',';
```

**이 패턴을 CollectStats 전체에 적용** — `safeFloat()`를 반환값으로 쓰는 곳을 모두 `appendFloat(json, ...)` + `json += ','`로 변경. `std::to_string()` 호출도 동일하게 `std::snprintf` → direct append.

> 변경 범위가 크므로 (432-606줄), 전체 CollectStats 함수 교체 권장.

**Step 2: Commit**

```bash
git add src/StatsCollector.cpp
git commit -m "perf(stats): pre-allocate JSON buffer and eliminate temporary strings"
```

---

### Task 5: trackedChangeSignature deps 세분화

**Files:**
- Modify: `view/src/App.tsx:108-135`

**문제:** `stats` 전체 객체가 deps에 포함 (134줄) → 어떤 스탯이 바뀌든 전체 재계산. C++에서 모든 스탯이 한 번에 오므로 실질적 차이는 작지만, deps를 정확하게 맞추는 것이 올바른 관행.

**Step 1: Replace `stats` with individual sub-objects in deps**

`view/src/App.tsx` 108-135줄의 deps 배열을:

```typescript
  ], [
    nowMs,
    settings.defense.armorRating,
    settings.defense.damageReduction,
    settings.equipped.leftHand,
    settings.equipped.rightHand,
    settings.experience.enabled,
    settings.movement.speedMult,
    settings.offense.critChance,
    settings.offense.leftHandDamage,
    settings.offense.rightHandDamage,
    settings.playerInfo.carryWeight,
    settings.playerInfo.gold,
    settings.playerInfo.health,
    settings.playerInfo.level,
    settings.playerInfo.magicka,
    settings.playerInfo.stamina,
    settings.resistances.disease,
    settings.resistances.fire,
    settings.resistances.frost,
    settings.resistances.magic,
    settings.resistances.poison,
    settings.resistances.shock,
    settings.time.gameDateTime,
    settings.time.realDateTime,
    settings.timedEffects.enabled,
    stats.isInCombat,
    stats.resistances,
    stats.defense,
    stats.offense,
    stats.equipped,
    stats.movement,
    stats.playerInfo,
    stats.time,
    stats.timedEffects,
    stats.calcMeta,
  ]);
```

으로 교체. `stats` 단일 참조 → 실제 사용되는 하위 객체별 참조로 분리.

**Step 2: Run lint and tests**

```bash
cd "$(git rev-parse --show-toplevel)/view" && npm run lint && npm run test
```
Expected: PASS

**Step 3: Commit**

```bash
git add view/src/App.tsx
git commit -m "perf(app): granulate trackedChangeSignature deps to sub-objects"
```

---

### Task 6: useWidgetPositions handleGroupMove stale dragPositions 수정

**Files:**
- Modify: `view/src/hooks/useWidgetPositions.ts:62-80`

**문제:** `handleGroupMove`와 `handleGroupMoveEnd`가 `dragPositions`를 deps에 포함 → 드래그 중 매 프레임 콜백 재생성. 또한 `dragPositions`를 클로저에서 직접 읽어 stale 될 수 있음.

**Step 1: Use functional setState to read latest dragPositions**

`view/src/hooks/useWidgetPositions.ts` 62-80줄을 다음으로 교체:

```typescript
  const handleGroupMove = useCallback((groupId: string, rawX: number, rawY: number) => {
    setDragPositions(previous => {
      const getPositionById = (id: string): GroupPosition =>
        previous[id] ?? settingsPositions[id] ?? defaults[id] ?? fallbackPos;
      const snapped = snapPosition(groupIds, snapThreshold, grid, groupId, rawX, rawY, getPositionById);
      return { ...previous, [groupId]: snapped };
    });
  }, [defaults, fallbackPos, grid, groupIds, settingsPositions, snapThreshold]);

  const handleGroupMoveEnd = useCallback((groupId: string, rawX: number, rawY: number) => {
    setDragPositions(previous => {
      const getPositionById = (id: string): GroupPosition =>
        previous[id] ?? settingsPositions[id] ?? defaults[id] ?? fallbackPos;
      const snapped = snapPosition(groupIds, snapThreshold, grid, groupId, rawX, rawY, getPositionById);
      updateSetting(`positions.${groupId}`, snapped);
      const next = { ...previous };
      delete next[groupId];
      return next;
    });
  }, [defaults, fallbackPos, grid, groupIds, settingsPositions, snapThreshold, updateSetting]);
```

핵심: `dragPositions` → deps에서 제거, `setDragPositions(previous => ...)` 함수형 업데이트로 최신 값 접근.

**Step 2: Run lint and tests**

```bash
cd "$(git rev-parse --show-toplevel)/view" && npm run lint && npm run test
```
Expected: PASS

**Step 3: Commit**

```bash
git add view/src/hooks/useWidgetPositions.ts
git commit -m "fix(drag): use functional setState to avoid stale dragPositions in move handlers"
```

---

### Task 7: CI 프론트엔드 테스트 워크플로우 추가

**Files:**
- Create: `.github/workflows/frontend-test.yml`

**Step 1: Create the workflow file**

```yaml
name: Frontend Lint & Test

on:
  pull_request:
  push:
    branches: [master]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: view/package-lock.json

      - name: Install dependencies
        run: cd view && npm ci

      - name: Lint
        run: cd view && npm run lint

      - name: Type check
        run: cd view && npx tsc -b --noEmit

      - name: Test
        run: cd view && npm run test
```

**Step 2: Verify locally**

```bash
cd "$(git rev-parse --show-toplevel)/view" && npm run lint && npx tsc -b --noEmit && npm run test
```
Expected: 모두 PASS

**Step 3: Commit**

```bash
git add .github/workflows/frontend-test.yml
git commit -m "ci: add frontend lint, typecheck, and test workflow"
```

---

### Task 8: main.cpp 전역 상태를 구조체로 캡슐화

**Files:**
- Modify: `src/main.cpp:16-35`

**문제:** 17개 정적 변수가 파일 스코프에 산재. 관련 상태를 구조체로 묶어 가독성·초기화 안전성 향상.

**Step 1: Define PluginState struct and replace globals**

`src/main.cpp` 16-35줄을 다음으로 교체:

```cpp
PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;

namespace {

// Compile-time throttle intervals
constexpr auto kFastIntervalCombat = std::chrono::milliseconds(100);
constexpr auto kFastIntervalIdle   = std::chrono::milliseconds(500);
constexpr auto kFullIntervalCombat = std::chrono::milliseconds(500);
constexpr auto kFullIntervalIdle   = std::chrono::milliseconds(1500);
constexpr auto kHeartbeatInterval  = std::chrono::seconds(3);
constexpr auto kHeartbeatPoll      = std::chrono::milliseconds(100);
constexpr auto kPausedRetryDelay   = std::chrono::milliseconds(250);

struct PluginState {
    PrismaView view{0};
    std::atomic<bool> gameLoaded{false};
    std::atomic<bool> viewDomReady{false};
    std::atomic<bool> heartbeatStarted{false};
    std::atomic<std::int64_t> scheduledStatsDueMs{0};
    TulliusWidgets::RuntimeDiagnostics::State runtimeDiagnostics{};

    std::chrono::steady_clock::time_point lastFastUpdateTime{};
    std::chrono::steady_clock::time_point lastFullUpdateTime{};
    std::mutex statsUpdateMutex;

    std::jthread heartbeatThread;
};

PluginState g_state;

}  // namespace
```

**Step 2: Update all references throughout main.cpp**

모든 참조를 `g_state.` 접두사로 변경:
- `view` → `g_state.view`
- `gameLoaded` → `g_state.gameLoaded`
- `g_viewDomReady` → `g_state.viewDomReady`
- `g_heartbeatStarted` → `g_state.heartbeatStarted`
- `g_scheduledStatsDueMs` → `g_state.scheduledStatsDueMs`
- `g_runtimeDiagnostics` → `g_state.runtimeDiagnostics`
- `lastFastUpdateTime` → `g_state.lastFastUpdateTime`
- `lastFullUpdateTime` → `g_state.lastFullUpdateTime`
- `statsUpdateMutex` → `g_state.statsUpdateMutex`
- `g_heartbeatThread` → `g_state.heartbeatThread`
- `UPDATE_INTERVAL_*` → `kFastIntervalCombat` 등

그리고 `constexpr` 상수들은 구조체 밖 namespace에 유지 (컴파일 타임 상수).

**Step 3: Commit**

```bash
git add src/main.cpp
git commit -m "refactor(main): encapsulate global state into PluginState struct"
```

---

### Task 9: C++ 매직넘버 상수화

**Files:**
- Modify: `src/main.cpp:111`
- Modify: `src/StatsCollector.cpp:306`

**Step 1: Name the magic numbers**

`src/main.cpp` 111줄 — `0xFFFFFF` → 이미 Task 8에서 리팩터 시 주석 또는 상수 추가:
```cpp
static constexpr std::uint32_t kDefaultHUDColor = 0xFFFFFF;  // white
```

`SendHUDColorToView()` 내부에서 `uint32_t color = kDefaultHUDColor;`로 사용.

`src/StatsCollector.cpp` 306줄 — `0.12f` 앞에 이미 주석이 있지만 상수화:
```cpp
// Skyrim armor formula: displayed_armor_rating * multiplier, capped at kDamageReductionCap
static constexpr float kArmorRatingMultiplier = 0.12f;
```

305-306줄을 변경:
```cpp
float StatsCollector::CalculateRawDamageReduction(float armorRating) {
    return armorRating * kArmorRatingMultiplier;
}
```

**Step 2: Commit**

```bash
git add src/main.cpp src/StatsCollector.cpp
git commit -m "refactor: extract magic numbers into named constants"
```

---

### Task 10: CI 자동 릴리스 워크플로우 추가

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Create the release workflow**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release:
    runs-on: ${{ vars.WINDOWS_RUNNER_LABEL != '' && vars.WINDOWS_RUNNER_LABEL || 'windows-latest' }}
    timeout-minutes: 40
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: view/package-lock.json

      - name: Build frontend
        shell: bash
        run: |
          cd view
          npm ci
          npm run lint
          npm run test
          npm run build

      - name: Setup xmake
        uses: xmake-io/github-action-setup-xmake@v1
        with:
          xmake-version: 2.9.7

      - name: Restore xmake compiler cache
        uses: actions/cache@v4
        with:
          path: .xmake-cache/ccache
          key: ${{ runner.os }}-xmake-ccache-${{ github.ref_name }}-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-xmake-ccache-${{ github.ref_name }}-
            ${{ runner.os }}-xmake-ccache-

      - name: Build plugin
        shell: pwsh
        run: |
          $ccacheDir = Join-Path $env:GITHUB_WORKSPACE ".xmake-cache\ccache"
          New-Item -ItemType Directory -Path $ccacheDir -Force | Out-Null
          xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false --ccache=y --ccachedir="$ccacheDir"
          xmake build -y -v

      - name: Resolve version and validate release note
        shell: pwsh
        id: meta
        run: |
          $versionMatch = Select-String -Path "xmake.lua" -Pattern 'set_version\("([^"]+)"\)' | Select-Object -First 1
          if (-not $versionMatch) { throw "Unable to parse version from xmake.lua" }
          $version = $versionMatch.Matches[0].Groups[1].Value
          $tag = "v$version"
          $zipName = "TulliusWidgets-v$version.zip"
          $notePath = "docs/release-notes/$version.ko.md"

          if (!(Test-Path $notePath)) { throw "Release note missing: $notePath" }
          $content = Get-Content $notePath -Raw
          foreach ($required in @("## 변경 요약", "## 사용자 영향/호환성", "## 설치/업데이트 안내")) {
            if ($content -notmatch [regex]::Escape($required)) {
              throw "Required section missing in $notePath : $required"
            }
          }

          "VERSION=$version" | Out-File -FilePath $env:GITHUB_ENV -Append
          "ZIP_NAME=$zipName" | Out-File -FilePath $env:GITHUB_ENV -Append
          "NOTE_PATH=$notePath" | Out-File -FilePath $env:GITHUB_ENV -Append

      - name: Package
        shell: pwsh
        run: |
          if (!(Test-Path "dist/PrismaUI/views/TulliusWidgets/index.html")) {
            throw "Frontend build output missing"
          }
          if (!(Test-Path "build/windows/x64/release/TulliusWidgets.dll")) {
            throw "Plugin DLL missing"
          }
          New-Item -ItemType Directory -Path "dist/SKSE/Plugins" -Force | Out-Null
          Copy-Item "build/windows/x64/release/TulliusWidgets.dll" "dist/SKSE/Plugins/TulliusWidgets.dll" -Force
          if (Test-Path $env:ZIP_NAME) { Remove-Item $env:ZIP_NAME -Force }
          Compress-Archive -Path "dist/*" -DestinationPath $env:ZIP_NAME

      - name: Create GitHub Release
        shell: bash
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          TAG="${GITHUB_REF_NAME}"
          IS_PRERELEASE=false
          if [[ "$TAG" == *"-rc"* ]] || [[ "$TAG" == *"-beta"* ]] || [[ "$TAG" == *"-alpha"* ]]; then
            IS_PRERELEASE=true
          fi

          RELEASE_ARGS=(
            release create "$TAG"
            "$ZIP_NAME"
            --repo "${{ github.repository }}"
            --title "Tullius Widgets $TAG"
            --notes-file "$NOTE_PATH"
          )
          if [ "$IS_PRERELEASE" = true ]; then
            RELEASE_ARGS+=(--prerelease)
          else
            RELEASE_ARGS+=(--latest)
          fi

          gh "${RELEASE_ARGS[@]}"
```

**Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add automated GitHub Release workflow on tag push"
```

---

## Execution Summary

| Task | 영역 | 변경 파일 | 난이도 |
|------|------|----------|--------|
| 1 | C++ | CriticalChanceEvaluator.cpp | 낮음 |
| 2 | C++ | NativeStorage.cpp | 낮음 |
| 3 | React | useSettings.ts | 낮음 |
| 4 | C++ | StatsCollector.cpp | 중간 |
| 5 | React | App.tsx | 낮음 |
| 6 | React | useWidgetPositions.ts | 낮음 |
| 7 | CI | .github/workflows/frontend-test.yml | 낮음 |
| 8 | C++ | main.cpp | 중간 |
| 9 | C++ | main.cpp, StatsCollector.cpp | 낮음 |
| 10 | CI | .github/workflows/release.yml | 중간 |

**총 커밋**: 10개 (Task당 1개)
**테스트**: Task 3, 5, 6에서 프론트엔드 테스트 실행, Task 7에서 CI 검증
