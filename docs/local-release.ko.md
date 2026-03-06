# 로컬 빌드/릴리즈 가이드 (Windows)

CI를 사용하지 않고 로컬에서 빌드한 결과물만으로 ZIP 생성과 GitHub 프리릴리즈/정식릴리즈 게시까지 진행할 수 있습니다.

## 사전 준비
- OS: Windows
- 필수 도구:
  - Node.js + npm
  - xmake
  - Visual Studio C++ Build Tools (MSVC)
  - GitHub CLI (`gh`) 로그인 완료

## WSL에서 작업 중인 경우
WSL에서 저장소를 열어 개발하는 것은 가능하지만, 플러그인 빌드는 WSL 작업 경로(UNC 경로)에서 바로 실행하지 않는 것을 권장합니다. 실제 검증에서 이 경로는 Windows 파일 락/빌드 아티팩트 처리와 충돌할 수 있었습니다.

권장 절차:
1. 저장소를 로컬 Windows 경로로 복사하거나 스테이징합니다.
   - 예: `C:\Users\Public\tullius-native-build`
2. Windows에서 Visual Studio Developer Command Prompt를 엽니다.
3. 스테이징한 경로로 이동한 뒤 플러그인 빌드를 실행합니다.

```bat
call "C:\Program Files\Microsoft Visual Studio\2026\Community\Common7\Tools\VsDevCmd.bat" -arch=x64
cd /d C:\Users\Public\tullius-native-build
xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
xmake build
```

설치된 Visual Studio 에디션/버전에 따라 `VsDevCmd.bat` 경로는 달라질 수 있습니다.

Windows PowerShell에서 검증만 먼저 돌리고 싶다면 아래 스크립트를 사용할 수 있습니다.

```powershell
pwsh -File .\scripts\verify-runtime-windows.ps1
```

- 이 스크립트는 frontend lint/test/build와 native plugin build를 함께 확인합니다.
- WSL UNC worktree에서 실행해도 필요한 빌드는 임시 로컬 스테이징 경로에서 수행한 뒤 결과물을 작업 저장소로 복사합니다.

## 1) 버전/패치노트 준비
1. `xmake.lua`의 `set_version("...")`를 원하는 버전으로 설정
2. `docs/release-notes/<version>.ko.md` 생성
3. 아래 섹션이 반드시 포함되어야 함
   - `## 변경 요약`
   - `## 사용자 영향/호환성`
   - `## 설치/업데이트 안내`

## 2) 로컬 빌드 + ZIP만 생성
```powershell
pwsh -File .\scripts\release-local.ps1 -NoPublish
```

생성 파일:
- `TulliusWidgets-v<version>.zip`
- ZIP 루트 구조: `SKSE/Plugins/...`, `PrismaUI/views/TulliusWidgets/...`

## 3) 로컬 빌드 + GitHub 릴리즈까지 게시
기본값은 프리릴리즈입니다.

```powershell
pwsh -File .\scripts\release-local.ps1 -Repo servaltullius/Tullius-Widgets -Channel pre
```

정식 릴리즈:
```powershell
pwsh -File .\scripts\release-local.ps1 -Repo servaltullius/Tullius-Widgets -Channel full
```

드래프트 릴리즈:
```powershell
pwsh -File .\scripts\release-local.ps1 -Repo servaltullius/Tullius-Widgets -Channel draft
```

## 옵션
- `-SkipLint`: 프론트 lint 생략
- `-SkipFrontendBuild`: 프론트 빌드 생략
- `-SkipPluginBuild`: 플러그인 빌드 생략
- `-NoPublish`: GitHub 게시 생략 (ZIP만 생성)

## 트러블슈팅
- 릴리즈 작업 폴더에 로컬 변경이 남아 있으면 `git pull --ff-only`가 실패해 이전 버전으로 빌드될 수 있습니다.
  - 권장: 릴리즈 전용 경로를 새로 clone해서 사용하거나, 작업 폴더를 깨끗한 상태로 맞춘 뒤 실행
- ZIP 파일명이 기대 버전과 다르면(`TulliusWidgets-v<version>.zip`) 먼저 `xmake.lua`의 `set_version`과 현재 브랜치 HEAD를 확인하세요.
- WSL 경로에서 `xmake`가 lock 실패나 Visual Studio 탐지 문제를 보이면, Windows 로컬 경로로 저장소를 옮겨 같은 명령을 다시 실행하세요.
  - 예: `C:\Users\Public\tullius-native-build`
