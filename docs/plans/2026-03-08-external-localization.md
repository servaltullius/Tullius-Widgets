# External Localization Plan

## Goal
- 영어/한국어만 하드코딩된 현재 UI 번역 구조를 외부 JSON 파일 기반으로 전환한다.
- 새 언어를 추가할 때 DLL/TS 코드 수정 없이 `view/public/i18n/*.json` 파일 추가와 manifest 갱신만으로 가능하게 만든다.

## Non-goals
- 네이티브 DLL 로그/진단 문자열 전체를 다국어화하지 않는다.
- 게임 본문 텍스트(장비명, 효과명 등) 자체를 번역하지 않는다.
- 이번 작업에서 번역 기여 워크플로우 자동화까지 만들지 않는다.

## Affected Areas
- `view/src/i18n/*`
- `view/src/types/settings.ts`
- `view/src/hooks/settingsSchema.ts`
- `view/src/components/settings/*`
- `view/src/App.tsx`
- `view/public/i18n/*`
- 필요 시 `README.md` 또는 관련 문서

## Constraints
- 기존 `ko`/`en` 사용자는 업데이트 후에도 바로 정상 동작해야 한다.
- 외부 JSON 파일이 일부 누락되거나 잘못되어도 UI 전체가 깨지지 않도록 fallback이 있어야 한다.
- 번역 키는 기존 UI 계약을 유지하고, 없는 키는 기본 언어 문자열로 대체한다.
- 과도한 방어코드는 피하고, 배포 구조(`dist/PrismaUI/views/TulliusWidgets`)와 호환되어야 한다.

## Milestones
1. 기존 번역을 기본 fallback 사전으로 분리한다.
2. `manifest.json` + 언어별 JSON 파일을 `public/i18n`에 추가한다.
3. 런타임에 manifest/활성 언어 JSON을 읽는 i18n 로더를 구현한다.
4. 언어 설정 타입/검증과 설정 패널 선택지를 동적 언어 목록 기준으로 갱신한다.
5. 문서와 테스트를 업데이트하고 프런트엔드 검증을 통과한다.

## Validation
- `cd view && npm run lint`
- `cd view && npm test -- --runInBand`
- `cd view && npm run build`

## Risks / Rollback
- PrismaUI 런타임에서 정적 JSON fetch 경로가 예상과 다를 수 있다.
  - 대응: 번들 기본 사전을 유지하고, 로딩 실패 시 기존 번역으로 fallback.
- 기존 설정 파일에 저장된 언어 코드가 manifest에서 사라질 수 있다.
  - 대응: 기본 언어(`ko`) 또는 영어 fallback으로 복구.
