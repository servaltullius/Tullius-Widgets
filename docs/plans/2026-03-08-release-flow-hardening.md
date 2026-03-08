# 2026-03-08 Release Flow Hardening Plan

## Goal
- 깨진 로컬 `pre-commit` 훅을 저장소 기준 엔트리포인트로 정리한다.
- `scripts/release-local.ps1`의 GitHub 게시 흐름이 `gh` 호출 결과를 명시적으로 판정하도록 안정화한다.

## Non-goals
- 릴리즈 버전 상향 또는 새 GitHub 릴리즈 생성
- 네이티브/프런트 기능 추가

## Affected Files
- `scripts/install_hooks.py`
- `scripts/precommit.py`
- `scripts/release-local.lib.ps1`
- `scripts/release-local.ps1`
- `scripts/release-local.Tests.ps1`
- `README.md`

## Constraints
- 훅은 `.vibe/` 유무와 무관하게 현재 저장소에서 바로 실행 가능해야 한다.
- GitHub 게시 경로는 WSL UNC worktree와 일반 Windows 경로 모두에서 같은 성공/실패 판정 모델을 사용해야 한다.
- 로컬 훅은 지나치게 무겁지 않게 유지한다.

## Milestones
- 기존 훅/설치 스크립트의 깨진 참조를 제거한다.
- 저장소 기준 `pre-commit` 스크립트를 추가하고 훅 설치 로직을 갱신한다.
- `Invoke-GhCommand`가 실행 결과를 반환하도록 바꾸고 릴리즈 스크립트의 존재 확인 로직을 수정한다.
- 관련 테스트와 문서를 동기화한다.

## Validation
- `python3 scripts/precommit.py`
- `python3 scripts/install_hooks.py --force`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w scripts/release-local.Tests.ps1)"`
- `cd view && npm run lint`

## Risks / Rollback
- 훅 체크 범위를 너무 넓히면 커밋 시간이 길어질 수 있으므로 staged 변경 기준의 경량 검증만 넣는다.
- `gh` 호출 래퍼 변경으로 릴리즈 경로가 달라질 수 있으므로 기존 실패/성공 케이스를 테스트로 고정한다.
