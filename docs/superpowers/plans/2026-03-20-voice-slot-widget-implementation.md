# Voice Slot Widget Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 선택된 포효/파워 이름을 표시하는 `equipped.voice` 위젯과 설정 토글을 추가한다.

**Architecture:** 네이티브 payload의 `equipped` 블록을 `voice`/`voiceType`으로 확장하고, 프론트엔드는 기존 장비 위젯 경로를 재사용해 새 item을 등록한다. UI는 `StatWidget` 기반의 secondary equipment widget로 렌더하며, 이름 변경 시 remount 패턴으로 텍스트 겹침을 방지한다.

**Tech Stack:** CommonLibSSE NG C++, React, TypeScript, Vitest

---

## File Map

- `src/StatsPayload.h`
  - `EquippedSnapshot`에 `voice`, `voiceType` 필드를 추가한다.
- `src/StatsCollector.cpp`
  - 현재 선택된 포효/파워를 읽는 helper와 snapshot 수집 로직을 추가한다.
- `src/StatsJsonWriter.cpp`
  - `equipped.voice`, `equipped.voiceType`을 JSON으로 직렬화한다.
- `docs/stats-payload-schema.md`
  - 브릿지 payload 예시에 새 필드를 반영한다.
- `view/src/types/stats.ts`
  - `Equipped` 타입을 확장한다.
- `view/src/types/settings.ts`
  - `equipped.voice` visibility 설정을 추가한다.
- `view/src/data/defaultSettings.ts`
  - `equipped.voice` 기본값을 `false`로 추가한다.
- `view/src/hooks/settingsSchema.ts`
  - `equipped.voice` merge를 보강한다.
- `view/src/data/mockStats.ts`
  - voice mock 값을 추가한다.
- `view/src/data/widgetItemRegistry.ts`
  - `equipped.voice` item registry entry를 추가한다.
- `view/src/components/HudWidgetItems.tsx`
  - 새 위젯 렌더 branch를 추가한다.
- `view/src/components/settings/SettingsTabSections.tsx`
  - 장비 섹션에 `포효/파워` 토글을 추가한다.
- `view/src/i18n/translations.ts`
  - 관련 번역 키를 추가한다.
- 테스트 파일들
  - `view/src/hooks/settingsSchema.test.ts`
  - `view/src/data/widgetItemRegistry.test.ts`
  - `view/src/components/HudWidgetItems.test.tsx`
  - `view/src/components/settings/SettingsTabSections.test.tsx`

## Chunk 1: Native Payload Extension

### Task 1: Extend the equipped payload with voice slot data

**Files:**
- Modify: `src/StatsPayload.h`
- Modify: `src/StatsCollector.cpp`
- Modify: `src/StatsJsonWriter.cpp`

- [ ] **Step 1: Add a focused native regression check**

가능한 가장 작은 수준으로 native regression guard를 만든다.

- 기존 JSON writer test가 있으면 `equipped.voice`/`equipped.voiceType` assertion 추가
- 없으면 `StatsJsonWriter`를 직접 호출하는 최소 단위 테스트 또는 임시 verification harness 추가

- [ ] **Step 2: Run the focused native verification and confirm the pre-change gap**

프로젝트에 있는 native test/verification entrypoint를 사용해 새 필드가 아직 없음을 확인한다. 별도 테스트 harness가 없다면 writer output spot-check command를 plan note로 남긴다.

- [ ] **Step 3: Implement native collection**

- `EquippedSnapshot`에 `voice`, `voiceType` 추가
- 현재 선택된 power form을 읽는 helper 추가
- 이름 해석과 타입(`shout|power|empty`) 판별 구현
- `StatsJsonWriter::AppendEquipped`에 새 필드 직렬화 추가

- [ ] **Step 4: Re-run the focused native verification**

새 payload에 `voice`와 `voiceType`이 들어가는지 다시 확인한다.

- [ ] **Step 5: Commit**

```bash
git add src/StatsPayload.h src/StatsCollector.cpp src/StatsJsonWriter.cpp
git commit -m "feat: add voice slot payload data"
```

## Chunk 2: Frontend Types and Settings

### Task 2: Add voice slot support to frontend data contracts

**Files:**
- Modify: `view/src/types/stats.ts`
- Modify: `view/src/types/settings.ts`
- Modify: `view/src/data/defaultSettings.ts`
- Modify: `view/src/hooks/settingsSchema.ts`
- Modify: `view/src/data/mockStats.ts`
- Test: `view/src/hooks/settingsSchema.test.ts`

- [ ] **Step 1: Write the failing schema test**

`settingsSchema.test.ts`에 `equipped.voice`가 병합되고 기본값 `false`로 폴백되는 케이스를 추가한다.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `cd view && npm test -- settingsSchema`

Expected: FAIL because `equipped.voice` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

- `Equipped` 타입에 `voice`, `voiceType`
- `WidgetSettings.equipped.voice`
- `defaultSettings.equipped.voice = false`
- schema merge 반영
- mock stats에 기본 voice 값 추가

- [ ] **Step 4: Re-run the targeted test**

Run: `cd view && npm test -- settingsSchema`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/types/stats.ts view/src/types/settings.ts view/src/data/defaultSettings.ts view/src/hooks/settingsSchema.ts view/src/data/mockStats.ts view/src/hooks/settingsSchema.test.ts
git commit -m "feat: add voice slot frontend settings"
```

## Chunk 3: UI Registration and Rendering

### Task 3: Register and render the voice slot widget

**Files:**
- Modify: `view/src/data/widgetItemRegistry.ts`
- Modify: `view/src/components/HudWidgetItems.tsx`
- Test: `view/src/data/widgetItemRegistry.test.ts`
- Test: `view/src/components/HudWidgetItems.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

- `widgetItemRegistry.test.ts`에 `equipped.voice` 등록 assertion 추가
- `HudWidgetItems.test.tsx`에 `equipped.voice` 렌더 assertion 추가
- 이름이 바뀔 때 value node remount assertion 추가

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
cd view
npm test -- widgetItemRegistry HudWidgetItems
```

Expected: FAIL because the new item is not registered or rendered.

- [ ] **Step 3: Write the minimal implementation**

- registry에 `equipped.voice` 추가
- default placement order를 오른손/왼손 다음으로 설정
- `HudWidgetItems.tsx`에 `equipped.voice` branch 추가
- 빈 값이면 `equippedEmpty` 사용
- `remountValueOnChange` 적용

- [ ] **Step 4: Re-run the targeted tests**

Run:

```bash
cd view
npm test -- widgetItemRegistry HudWidgetItems
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/data/widgetItemRegistry.ts view/src/data/widgetItemRegistry.test.ts view/src/components/HudWidgetItems.tsx view/src/components/HudWidgetItems.test.tsx
git commit -m "feat: add voice slot widget"
```

## Chunk 4: Settings Panel and Translations

### Task 4: Add settings UI and labels for the voice slot widget

**Files:**
- Modify: `view/src/components/settings/SettingsTabSections.tsx`
- Modify: `view/src/i18n/translations.ts`
- Test: `view/src/components/settings/SettingsTabSections.test.tsx`
- Optional Test: `view/src/i18n/translations.test.ts`

- [ ] **Step 1: Write the failing settings UI test**

`SettingsTabSections.test.tsx`에 장비 섹션에 `포효/파워` 토글이 보이고 `equipped.voice`를 업데이트하는 케이스를 추가한다.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
cd view
npm test -- SettingsTabSections translations
```

Expected: FAIL because translation key and toggle do not exist.

- [ ] **Step 3: Write the minimal implementation**

- `translations.ts`에 `voiceEquipped`, `voicePower`, `voiceShout` 추가
- `SettingsTabSections.tsx` 장비 섹션에 `equipped.voice` 토글 추가

- [ ] **Step 4: Re-run the targeted tests**

Run:

```bash
cd view
npm test -- SettingsTabSections translations
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add view/src/components/settings/SettingsTabSections.tsx view/src/components/settings/SettingsTabSections.test.tsx view/src/i18n/translations.ts view/src/i18n/translations.test.ts
git commit -m "feat: add voice slot settings toggle"
```

## Chunk 5: Docs and Full Verification

### Task 5: Update schema docs and verify end-to-end readiness

**Files:**
- Modify: `docs/stats-payload-schema.md`

- [ ] **Step 1: Update the payload schema document**

`equipped` 예시에 `voice`, `voiceType`을 추가하고 핵심 규칙에 포효/파워 슬롯 설명을 덧붙인다.

- [ ] **Step 2: Run the full frontend verification**

Run:

```bash
cd view
npm run lint
npm test
npm run build
```

Expected: all PASS

- [ ] **Step 3: Run native packaging or verification entrypoint if the payload path changed materially**

가능하면 repo의 권장 entrypoint를 사용한다.

- `./scripts/package.sh`
  또는
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w scripts/verify-runtime-windows.ps1)"`

native build 환경 제약 때문에 실제 실행이 불가하면, 그 사실과 이유를 최종 보고에 명시한다.

- [ ] **Step 4: Commit docs and verification state**

```bash
git add docs/stats-payload-schema.md
git commit -m "docs: document voice slot payload"
```
