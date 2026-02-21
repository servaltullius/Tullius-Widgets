# 로컬 빌드/릴리즈 가이드 (Windows)

CI 없이 로컬에서 빌드하고 ZIP을 만들어 GitHub 릴리즈까지 올리는 절차입니다.

## 사전 준비
- OS: Windows
- 필수 도구:
  - Node.js + npm
  - xmake
  - Visual Studio C++ Build Tools (MSVC)
  - GitHub CLI (`gh`) 로그인 완료

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
