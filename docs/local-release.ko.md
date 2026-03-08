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
이제는 WSL UNC worktree에서도 공식 스크립트로 바로 빌드할 수 있습니다. 스크립트가 필요한 파일을 임시 Windows 경로로 스테이징한 뒤 `VsDevCmd.bat` + `xmake`를 호출합니다.

권장 절차:
1. WSL에서 프런트와 패키지까지 한 번에 만들려면 아래를 실행합니다.

```bash
./scripts/package.sh
```

2. Windows PowerShell에서 전체 검증 또는 패키징만 하려면 아래를 실행합니다.

```powershell
pwsh -File .\scripts\verify-runtime-windows.ps1
pwsh -File .\scripts\release-local.ps1 -NoPublish
```

3. 수동으로 네이티브 DLL만 빌드하고 싶다면 여전히 Windows PowerShell 또는 Developer Command Prompt에서 직접 `xmake`를 실행할 수 있습니다.

```powershell
xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false
xmake build -y -v
```

설치된 Visual Studio 에디션/버전에 따라 `VsDevCmd.bat` 경로는 달라질 수 있지만, 공식 스크립트는 일반적인 설치 경로를 자동 탐색합니다.

관련 스크립트 역할:

- `verify-runtime-windows.ps1`는 frontend lint/build와 native plugin build를 함께 확인합니다.
- `release-local.ps1`는 zip 생성과 GitHub 릴리즈 게시를 담당합니다.
- 두 스크립트 모두 WSL UNC worktree에서 실행해도 필요한 빌드는 임시 로컬 스테이징 경로에서 수행한 뒤 결과물을 작업 저장소로 복사합니다.

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
- Windows에서 `xmake`를 찾지 못하면 `C:\Program Files\xmake\xmake.exe` 설치 여부와 PATH를 확인하세요.
- Visual Studio 탐지가 실패하면 Build Tools 또는 Community 설치 상태와 `VsDevCmd.bat` 존재 여부를 확인하세요.
- WSL에서 `./scripts/package.sh` 실행 시 `powershell.exe`가 없으면 Windows 연동이 불가능하므로, Windows 쪽 PowerShell에서 `release-local.ps1`를 직접 실행해야 합니다.
