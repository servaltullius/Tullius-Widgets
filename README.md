# Tullius Widgets

Skyrim SE용 전투 스탯 HUD 위젯 모드. [Prisma UI](https://www.nexusmods.com/skyrimspecialedition/mods/117592) 프레임워크 기반.

![Widgets](docs/screenshot-widgets.png)

## Features

- **스탯 20종 표시**
  - 플레이어 정보: 레벨, 골드, 소지 무게, 체력, 매지카, 스태미나
  - 저항력: 마법, 화염, 냉기, 전기, 독, 질병
  - 방어: 방어도, 피해 감소율
  - 공격: 양손 공격력, 치명타 확률
  - 이동: 이동 속도
- **시간 위젯** — 스카이림 날짜/시간(4E 연도, 월 이름, 일, 시:분) + 현실 날짜/시간 표시
- **커스텀 아이콘** + 스탯 심볼 뱃지 오버레이
- **장착 슬롯 표시** — 오른손/왼손 장비(무기/마법/주문서/방패) 이름 표시
- **지속 버프/디버프 리스트** — 주문/포션 소스명 우선 + 효과명 + 남은 시간(초)을 인스턴스 단위로 동적 표시
- **드래그 배치** — 설정 패널에서 위젯 그룹을 자유롭게 드래그, 이웃 위젯에 자동 스냅

![Drag](docs/screenshot-drag.webp)
- **주기 동기화(Heartbeat)** — 이벤트가 없는 구간에도 짧은 주기로 스탯을 재동기화해 표기 정지/드리프트를 완화
- **값 변화 기반 표시 모드** — 설정에서 `값 변화 시에만 표시`를 켜면 최근 변경 후 N초 동안만 위젯 표시
- **런타임 진단 경고 배너** — 런타임/SKSE/Address Library 조합 이상 시 게임 내 경고 표시
- **첫 실행 온보딩 카드** — Insert/F11/표시 모드 핵심 사용법 안내
- **비네트 시각 알림** — 체력/매지카/스태미나 부족, 과적재 시 화면 가장자리 경고 효과
- **설정 패널** (Insert 키)
  - 위젯별 표시/숨김
  - 값 변화 표시 모드 + 표시 유지 시간(초)
  - 투명도, 크기, 레이아웃 (세로/가로)
  - 색상 톤 (자동 HUD 감지 or 수동)
  - 배경 투명 모드
  - 프리셋 내보내기/가져오기
- **게임 메뉴 자동 숨김** — 인벤토리, 지도, 제작 등 18종 메뉴 감지
- **외부 JSON 다국어 지원** — 기본 한국어/영어 제공, 추가 언어는 JSON 파일로 확장 가능

![Settings](docs/screenshot-settings.png)

## Requirements

- Skyrim SE (1.5.97 / 1.6.x)
- [SKSE64](https://skse.silverlock.org/)
- [Prisma UI](https://www.nexusmods.com/skyrimspecialedition/mods/117592)
- [Address Library for SKSE Plugins](https://www.nexusmods.com/skyrimspecialedition/mods/32444)

## Installation

1. [Releases](https://github.com/servaltullius/Tullius-Widgets/releases) 에서 `TulliusWidgets-v*.zip` 다운로드
2. zip 내용물을 `Skyrim Special Edition/Data/` 폴더에 복사
3. 게임 실행

설치 후 폴더 구조:
```
Data/
  SKSE/Plugins/TulliusWidgets.dll
  PrismaUI/views/TulliusWidgets/index.html
  PrismaUI/views/TulliusWidgets/i18n/manifest.json
  PrismaUI/views/TulliusWidgets/i18n/ko.json
  PrismaUI/views/TulliusWidgets/i18n/en.json
  PrismaUI/views/TulliusWidgets/assets/...
```

## Localization

- 기본 번역 파일 위치:
  - `Data/PrismaUI/views/TulliusWidgets/i18n/manifest.json`
  - `Data/PrismaUI/views/TulliusWidgets/i18n/ko.json`
  - `Data/PrismaUI/views/TulliusWidgets/i18n/en.json`
- 새 언어를 추가하려면:
  1. `i18n/<language-code>.json` 파일을 추가합니다. 예: `fr.json`
  2. `manifest.json`의 `defaultLanguage`와 `languages` 배열을 필요에 맞게 갱신합니다.
  3. 게임에서 설정 패널의 `Language` 드롭다운으로 선택합니다.
- 번역 JSON은 평평한 key-value 구조이며, 일부 키가 비어 있으면 기본 영어 문자열로 fallback됩니다.
- 번역 파일이 깨지거나 누락돼도 기본 내장 한국어/영어 번역으로 UI가 계속 동작합니다.

## Controls

| 키 | 동작 |
|----|------|
| `Insert` | 설정 패널 열기/닫기 |
| `F11` | 위젯 전체 표시/숨김 |
| `ESC` | 설정 패널 닫기 |
| 드래그 | 설정 패널 열린 동안 위젯 그룹 이동 |

## Release Notes Policy

- 릴리즈/프리릴리즈 제목: `Tullius Widgets v<version>`
- ZIP 산출물:
  - 기본(권장, CI 없이): `TulliusWidgets-v<version>.zip`
  - CI 아티팩트(선택): `TulliusWidgets-v<version>-ci.zip`
- ZIP 루트 구조: `SKSE/Plugins/...` + `PrismaUI/views/TulliusWidgets/...`
- 한국어 패치노트 파일: `docs/release-notes/<version>.ko.md`
- 로컬 릴리즈 스크립트(Windows): `pwsh -File .\scripts\release-local.ps1`
- 로컬 릴리즈 가이드: `docs/local-release.ko.md`
- 필수 섹션:
  - `## 변경 요약`
  - `## 사용자 영향/호환성`
  - `## 설치/업데이트 안내`

## 표시값 기준 (원본/실효 분리)

- 치명타 확률: 런타임 계산 `원본값`을 기반으로 `실효 표시 0% ~ 100%`로 출력
- 저항(마법/화염/냉기/전기/독): `원본값`은 별도 보조 텍스트로 표시, 실효값은 `85%` 상한 기준으로 안내
- 질병 저항: `원본값`/`실효값` 분리, 실효값은 `0% ~ 100%`
- 방어도/피해감소: 피해감소는 `80%` 캡 적용, 방어도는 `최대 효율 AR` 기준 보조 표기로 안내
- 오른손/왼손 공격력: 표시 안전 범위 `0 ~ 9999`

브릿지 payload 스키마 문서: `docs/stats-payload-schema.md`

## Building from Source

### Requirements
- Windows
  - Visual Studio C++ Build Tools 또는 Visual Studio Community
  - [XMake](https://xmake.io/)
  - PowerShell
- WSL/Linux
  - Node.js 22+, npm
  - `powershell.exe` 사용 가능한 WSL 환경

### 권장 빌드 경로
- 프런트만 확인할 때는 WSL/Linux에서 `view` 기준으로 빌드하면 됩니다.
- DLL까지 포함한 전체 빌드/패키징은 Windows MSVC가 필요합니다.
- WSL에서 저장소를 열고 작업 중이어도 `./scripts/package.sh` 또는 `scripts/release-local.ps1`가 내부적으로 Windows 쪽 빌드를 위임하므로, 별도 수동 복사 없이 현재 worktree에서 실행해도 됩니다.

### Frontend
```bash
cd view
npm install
npm run build
```

### C++ SKSE Plugin (Windows MSVC 필수)
Windows PowerShell 또는 Developer Command Prompt에서 실행:

```powershell
xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
xmake build -y -v
```

WSL에서 개발 중이라면 직접 `xmake`를 WSL 안에서 호출하지 말고, 아래 패키징/검증 스크립트를 사용하는 편이 안전합니다.

### 전체 검증 (권장)
Windows PowerShell:

```powershell
pwsh -File .\scripts\verify-runtime-windows.ps1
```

이 스크립트는 다음을 한 번에 확인합니다.
- 프런트 lint/build
- Windows MSVC 네이티브 빌드
- WSL UNC worktree 사용 시 임시 Windows 스테이징 경로를 통한 빌드

### Packaging
Windows PowerShell:

```powershell
pwsh -File .\scripts\release-local.ps1 -NoPublish
```

WSL/Linux:

```bash
./scripts/package.sh
```

동작 방식:
- WSL에서 `./scripts/package.sh` 실행 시 프런트는 WSL에서 빌드
- 네이티브 DLL과 zip 패키징은 Windows `release-local.ps1`로 위임
- 결과물: `TulliusWidgets-v<version>.zip`

### 검증 스크립트 참고
Windows 검증 스크립트:

```powershell
pwsh -File .\scripts\verify-runtime-windows.ps1
```

- Windows PowerShell에서 실행하는 검증 진입점입니다.
- WSL UNC worktree에서 호출해도 필요한 frontend/plugin 빌드는 임시 로컬 경로로 스테이징해서 실행합니다.

### 값 이상치 트러블슈팅
- 치명타 확률이 `100%` 초과, 저항이 `85%` 초과로 보이면 구버전 DLL일 가능성이 큽니다.
- 최신 빌드는 내부 계산 후 다음 범위로 표시값을 제한합니다.
  - 치명타 확률: `0 ~ 100`
  - 마법/화염/냉기/전기/독 저항: `-100 ~ 85`
  - 질병 저항: `0 ~ 100`
  - 오른손/왼손 공격력: `0 ~ 9999`
- 로드 직후(또는 새 게임 직후) CTD가 난다면 `v1.1.3-rc.5` 이상으로 업데이트하고, 모드 매니저에서 구버전 `TulliusWidgets.dll` 중복 활성화를 해제하세요.

## Tech Stack

- **C++ SKSE Plugin** — C++23, [CommonLib-NG](https://github.com/CharmedBaryon/CommonLibSSE-NG), XMake
- **Frontend** — React 19, TypeScript, Vite, [lucide-react](https://lucide.dev/)
- **UI Framework** — [Prisma UI](https://www.nexusmods.com/skyrimspecialedition/mods/117592) (WebKit-based DX11 overlay)

## License

MIT
