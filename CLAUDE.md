# Tullius Widgets - Skyrim SE HUD Widget Mod

## Overview
Prisma UI (WebKit) + React/TypeScript 프론트엔드 + C++23 SKSE 플러그인으로 구성된 스카이림 SE 전투 스탯 HUD 위젯 모드.

## Tech Stack
- **C++ SKSE Plugin**: C++23, CommonLib-NG, XMake, MSVC (VS2022)
- **Frontend**: React 19, TypeScript, Vite, lucide-react
- **UI Framework**: Prisma UI (WebKit 기반 DX11 오버레이)
- **Build**: XMake (C++, Windows 전용), Vite (프론트엔드, WSL)
- **Environment**: WSL2 Ubuntu + Windows (C++ 빌드는 반드시 Windows MSVC)

## Architecture
```
C++ StatsCollector (Skyrim ActorValue 수집)
  → JSON string via PrismaUI.Invoke("updateStats('...')")
    → React useGameStats hook (window.updateStats)
      → App.tsx → DraggableWidgetGroup → StatWidget

Settings: SettingsPanel → useSettings → window.onSettingsChanged → C++ SaveSettings
```

## Project Structure
```
src/                          # C++ SKSE 플러그인 (864줄)
  main.cpp                    # 플러그인 진입점, Prisma UI 연동, 이벤트 싱크, 키 핸들러
  StatsCollector.cpp/h        # 게임 스탯 수집 → JSON
  PrismaUI_API.h              # Prisma UI API 헤더 (외부)
  pch.h                       # 프리컴파일 헤더
  keyhandler/                 # 키 입력 핸들러 (Insert=설정 토글, ESC=닫기)
view/                         # React 프론트엔드 (1,277줄)
  src/App.tsx                 # 메인 앱, 위젯 그룹 배치, 드래그 스냅 로직
  src/components/
    StatWidget.tsx             # 개별 스탯 위젯 (도로롱 PNG 아이콘 + lucide 뱃지)
    DraggableWidgetGroup.tsx   # 드래그 가능한 위젯 컨테이너
    SettingsPanel.tsx          # 인게임 설정 패널
    ScreenEffects.tsx          # 비네트 시각 알림 효과
  src/hooks/
    useGameStats.ts            # C++ → JS 스탯 데이터 수신
    useSettings.ts             # 설정 상태 관리 + C++ 양방향 통신
  src/types/                   # TypeScript 인터페이스
  src/data/                    # 기본 설정값, 목업 데이터
  src/i18n/translations.ts     # 한/영 번역
  src/assets/icons/            # 도로롱 커스텀 PNG 아이콘 18종
lib/commonlibsse-ng/           # CommonLib-NG (git submodule)
dist/                          # 빌드 산출물 (zip 패키징 대상)
  SKSE/Plugins/TulliusWidgets.dll
  PrismaUI/views/TulliusWidgets/
```

## Build Instructions

### Frontend (WSL)
```bash
cd view && npm run build
```
Output: `dist/PrismaUI/views/TulliusWidgets/`

### C++ DLL (Windows MSVC 필수)
WSL에서 직접 빌드 불가. Windows 파일시스템에 복사 후 빌드:
```bash
# 1. Windows 경로로 복사
rsync -a --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='.xmake' \
  "/home/kdw73/projects/Tullius Widgets/" /mnt/c/temp/TulliusWidgets/

# 2. Windows PowerShell로 빌드
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -Command \
  "cd 'C:\temp\TulliusWidgets'; xmake build -y"

# 3. DLL 복사
cp /mnt/c/temp/TulliusWidgets/build/windows/x64/release/TulliusWidgets.dll \
  "dist/SKSE/Plugins/"
```

### Zip 패키징
```bash
cd dist && zip -r ../TulliusWidgets.zip .
```

## Key Features
- 스탯 18종: 저항력 6종, 방어력 2종, 공격력 3종, 이동속도, 플레이어 정보 6종
- 도로롱(니케) 커스텀 아이콘 + lucide-react 뱃지 오버레이
- 위젯 그룹 드래그 배치 + 이웃 위젯 스냅 (15px 임계값, 10px 그리드 폴백)
- 비네트 시각 알림 (체력/매지카/스태미나 부족, 과적재)
- 설정 JSON 자동 저장 (`Data/SKSE/Plugins/TulliusWidgets.json`)
- 프리셋 내보내기/가져오기
- 18종 게임 메뉴 자동 숨김
- HUD 색상 자동 감지 + 수동 색상 선택
- 한/영 다국어

## Key Design Decisions
- **C++ → JS 통신**: `PrismaUI->Invoke()` + `EscapeForJS()`로 JSON 인젝션 방어
- **설정 하위호환**: `mergeWithDefaults()` - 새 필드 추가해도 기존 저장파일 호환
- **이벤트 기반 업데이트**: 전투/장비/효과 변경 이벤트 + 250ms 쓰로틀
- **settingsRef 패턴**: `useRef(settings)` + `settingsRef.current = settings`로 useCallback 내 최신 상태 접근
- **메뉴 리스트**: `kHiddenMenus` 파일 스코프 상수로 단일 정의, 2곳에서 재사용
- **배경 투명**: 기본값 `transparentBg: true` - HP바와 조화
- **크리티컬 확률**: `kCriticalChance` AV는 바닐라 기본값 0이라 무의미. `GetEffectiveCritChance()`에서 장착 무기 타입 + 바닐라 퍽(Bladesman/DeepWounds/CriticalShot) 직접 체크 후 AV 합산. 다른 모드 자체 크리티컬 시스템은 읽을 수 없음
- **체력/매지카/스태미나**: `GetActorValue()`는 base 값만 반환. 실제 현재값은 `base + GetActorValueModifier(kDamage, ...)` 필요

## C++ ↔ JS Bridge
| 방향 | 함수 | 용도 |
|------|------|------|
| C++ → JS | `updateStats('json')` | 스탯 데이터 전송 |
| C++ → JS | `updateSettings('json')` | 저장된 설정 로드 |
| C++ → JS | `setHUDColor('#hex')` | HUD 색상 전달 |
| C++ → JS | `toggleSettings()` / `closeSettings()` | 설정 패널 제어 |
| JS → C++ | `onSettingsChanged` | 설정 변경 알림 → 저장 |
| JS → C++ | `onExportSettings` / `onImportSettings` | 프리셋 내보내기/가져오기 |
| JS → C++ | `onRequestUnfocus` | 포커스 해제 요청 |

## Notes
- 도로롱 아이콘은 Shift Up 저작권 (개인 사용만, 배포 불가)
- `#include <algorithm>`은 `EscapeForJS`에서 사용하지 않지만 향후 필요시 대비
- XMake UNC 경로(`\\wsl.localhost\...`)에서 lock 파일 생성 불가 → 반드시 Windows 로컬 경로로 복사 후 빌드
