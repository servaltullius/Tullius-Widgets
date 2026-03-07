# 2026-03-07 Prerelease Publish Plan

## Goal
- 현재 런타임/UI 하드닝 변경분을 `v1.2.1-rc.9` 프리릴리즈로 정리해 커밋, 푸시, GitHub 프리릴리즈 게시까지 완료한다.

## Non-goals
- 게임 내 수동 시나리오 검증 결과를 새로 작성하는 것 외의 추가 기능 개발
- 정식 릴리즈 전환

## Affected Files
- `xmake.lua`
- `docs/release-notes/1.2.1-rc.9.ko.md`
- `docs/plans/runtime-verification-report-*.ko.md`
- 현재 작업 트리의 런타임/UI 하드닝 변경 파일 일체

## Constraints
- 플러그인 빌드는 WSL UNC 경로에서 직접 실행하지 않고 Windows staging 경로를 사용한다.
- GitHub 릴리즈는 기존 `v1.2.1-rc.8`와 충돌하지 않도록 새 태그를 사용한다.

## Milestones
- 버전을 `1.2.1-rc.9`로 상향하고 릴리즈 노트를 준비한다.
- Windows 검증 스크립트로 빌드 산출물과 런타임 보고서 생성을 다시 확인한다.
- 변경분을 커밋하고 `origin/master`에 푸시한다.
- `scripts/release-local.ps1`로 GitHub 프리릴리즈를 게시한다.

## Validation
- `pwsh/powershell -File scripts/verify-runtime-windows.ps1`
- `powershell -File scripts/release-local.ps1 -Repo servaltullius/Tullius-Widgets -Channel pre`
- `git status --short`

## Risks / Rollback
- 릴리즈 게시 전 실패 시 태그/릴리즈가 일부만 생성될 수 있으므로 `gh release view`로 결과를 확인한다.
- 게시 후 문제가 발견되면 `v1.2.1-rc.9` 릴리즈를 삭제하거나 `draft`로 전환하는 대신 후속 RC를 올리는 쪽을 우선 고려한다.
