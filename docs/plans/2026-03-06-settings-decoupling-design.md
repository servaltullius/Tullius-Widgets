# useSettings Decoupling Design

**Goal:** `useSettings`의 저장 동기화/브리지 등록 책임을 분리하면서 외부 API와 동작은 유지한다.

**Current Problem**
- `view/src/hooks/useSettings.ts`가 UI state, bridge handler 등록, settings sync debounce/retry, JSON merge/parsing까지 모두 들고 있다.
- 재시도 로직과 bridge wiring이 같은 effect 안에 있어 테스트 범위가 넓고, 작은 변경도 훅 전체를 다시 읽어야 한다.

**Chosen Approach**
- `useSettings`는 화면에서 쓰는 state 조합과 공개 API만 유지한다.
- settings sync 전송/재시도는 `useSettingsSync`로 분리한다.
- native bridge handler 등록은 `useSettingsBridge`로 분리한다.
- 기존 `useSettings` 테스트는 public contract 회귀 방지에 유지하고, 새 분리 단위에는 작은 focused test를 추가한다.

**Why This Approach**
- 공개 인터페이스를 바꾸지 않아 App/컴포넌트 영향이 작다.
- 브리지와 sync를 개별 테스트 가능하게 만들어 후속 변경 비용을 줄인다.
- 지금 범위에서 파일 수는 조금 늘지만, 과한 controller abstraction까지는 가지 않아 변경 폭을 통제할 수 있다.

**Planned File Shape**
- Create: `view/src/hooks/useSettingsSync.ts`
- Create: `view/src/hooks/useSettingsBridge.ts`
- Modify: `view/src/hooks/useSettings.ts`
- Add/Modify tests around extracted behavior while preserving existing `useSettings` regression coverage

**Data Flow**
1. `useSettings`가 state/ref/setter를 준비한다.
2. `useSettingsSync`가 `notifySettingsChanged`, same-value retry, sync result callback을 담당한다.
3. `useSettingsBridge`가 `updateSettings`, `importSettingsFromNative`, `toggleSettings`, runtime diagnostics bridge를 연결한다.
4. `useSettings`는 반환 shape를 그대로 유지한다.

**Safety Rails**
- bridge namespace/handler contract는 유지한다.
- 저장 payload의 `schemaVersion`/`rev` 규칙은 유지한다.
- same-value retry 동작은 기존 테스트를 유지하고 분리 후에도 새 테스트로 재확인한다.

**Verification**
- `cd view && npm test`
- `cd view && npm run lint`
