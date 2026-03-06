# Settings Hardening Plan

**Goal:** `useSettings` 주변 구조를 더 분리하고, bridge 계약/저장 실패 UX/설정 schema 정합성을 함께 강화한다.

**Scope**
- `settings schema` 파싱/병합/리비전 수용 로직 추출
- `useSettingsBridge` 직접 테스트 추가
- 저장 sync 상태를 `retrying`/`failed`까지 드러내 UX 개선
- 관련 회귀 테스트와 빌드 검증

**Execution Order**
1. failing test 추가
2. `settingsSchema.ts` 추출
3. `useSettingsBridge`/`useSettingsSync` 상태 보강
4. App 경고 문구를 상태 기반으로 갱신
5. `npm test`, `npm run lint`, `npm run build`
