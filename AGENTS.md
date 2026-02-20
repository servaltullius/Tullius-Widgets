# AGENTS.md (Repo Local)

## Quick context
- Project purpose: Skyrim SE용 전투 스탯 HUD 위젯 모드(Tullius Widgets).
- Key directories: `src/`(SKSE C++ 플러그인), `view/`(React UI), `dist/`(배포 산출물), `docs/`.
- Critical invariants (must not break):
  - Prisma UI와의 JS 브릿지(`updateStats`, `updateSettings`) 호환성 유지
  - 릴리즈 zip 구조(`Data/SKSE/Plugins/...`, `PrismaUI/views/TulliusWidgets/...`) 유지
  - 기존 설정 파일 경로 호환(`Data/SKSE/Plugins/TulliusWidgets.json`)

## Setup commands
- Install: `cd view && npm install`
- Dev server: `cd view && npm run dev`
- Env vars (.env.example / secrets policy): 현재 별도 `.env` 미사용
- Database/migrations: 해당 없음

## Test & verification
- Unit tests: `N/A (현재 유닛 테스트 명령 미구성)`
- Integration/e2e: `N/A (현재 명령 미구성)`
- Lint/format: `cd view && npm run lint`
- Typecheck/build:
  - 프론트: `cd view && npm run build`
  - 플러그인(Windows/MSVC): `xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false && xmake build`
- How to run a single test quickly: `N/A (현재 테스트 러너 미구성)`

## Coding standards
- Language/version: C++23, TypeScript(React 19)
- Style rules (lint/formatter): `view/`는 ESLint 규칙 준수, C++은 기존 코드 스타일 유지
- Error handling conventions: 런타임 실패는 안전한 기본값/가드 처리 후 로그 기록
- Logging conventions: SKSE logger 사용 (`logger::info/error/critical`)
- API conventions: JSON payload 키 스키마는 하위호환 유지

## Required fields
- Install command: `cd view && npm install`
- Dev server command: `cd view && npm run dev`
- Unit test command: `N/A (현재 유닛 테스트 명령 미구성)`
- Lint/format command: `cd view && npm run lint`
- Typecheck/build command: `cd view && npm run build` / `xmake f -p windows -a x64 -m release -y --skyrim_se=true --skyrim_ae=true --skyrim_vr=false && xmake build`
- Primary entrypoint path: `src/main.cpp` (plugin), `view/src/main.tsx` (UI)

## Release policy (required)
- Release/Pre-release name format: `Tullius Widgets v<version>`
- Patch notes language: 한국어로 작성
- ZIP artifact:
  - CI 아티팩트: `TulliusWidgets-v<version>-ci.zip`
  - 로컬 패키징: `TulliusWidgets-v<version>.zip`
  - 릴리즈마다 ZIP 산출물 첨부 필수
- Patch note file path: `docs/release-notes/<version>.ko.md`
- Minimum patch note sections:
  - 변경 요약
  - 사용자 영향/호환성
  - 설치/업데이트 안내
