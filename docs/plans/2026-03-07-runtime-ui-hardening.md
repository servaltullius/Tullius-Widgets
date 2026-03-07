# Runtime/UI Hardening Plan

**Goal:** 브릿지 계약의 정확도를 높이고, stats/설정 동기화 실패 시 복원력을 강화하며, 반복되는 UI 스타일과 상태 기억 방식을 더 유지보수 가능하게 만든다.

**Non-Goals**
- Skyrim 런타임 로직 자체의 새로운 기능 추가
- Prisma UI 프레임워크 교체
- 네이티브 빌드 파이프라인 재설계

**Scope**
- settings sync 결과 콜백에 revision 컨텍스트를 추가해 stale ack를 무시
- stats payload 처리 실패 시 마지막 정상 상태를 유지하도록 HUD 복원력 강화
- bridge payload 누락/이상 계약에 대한 1회 경고 추가
- HUD overlay/settings 패널의 공통 토큰을 CSS 변수로 추출
- settings 패널의 탭/섹션 기억 상태를 모듈 전역 변수 대신 `sessionStorage` 기반으로 전환
- bridge/hotkey 관련 문자열과 매직 넘버를 상수화

**Affected Files**
- `src/WidgetJsListeners.cpp`
- `src/WidgetHotkeys.cpp`
- `src/main.cpp`
- `src/JsonUtils.h`
- `src/WidgetInteropContracts.h` (new)
- `view/src/hooks/useSettings.ts`
- `view/src/hooks/useSettingsSync.ts`
- `view/src/hooks/useSettingsBridge.ts`
- `view/src/hooks/useGameStats.ts`
- `view/src/components/SettingsPanel.tsx`
- `view/src/components/HudOverlays.tsx`
- `view/src/types/bridge.d.ts`
- `view/src/assets/ui-theme.css` (new)
- `view/src/constants/bridge.ts` (new)
- 관련 테스트/문서

**Execution Order**
1. 계획 기반 테스트 갱신
2. settings sync revision-aware ack 구현
3. stats 실패 복원력과 계약 경고 구현
4. UI 토큰화와 settings 패널 상태 기억 방식 정리
5. 상수 정리 및 계약 문서 업데이트
6. lint/test/build/contract test 검증

**Validation**
- `cd view && npm test`
- `cd view && npm run lint`
- `cd view && npm run build`
- `node --test scripts/stats-collector.contract.test.mjs scripts/native-orchestration.contract.test.mjs scripts/verify-runtime-windows.contract.test.mjs`

**Risks / Rollback Notes**
- settings sync ack 시그니처 확장은 브릿지 하위 호환성을 깨지 않도록 첫 번째 인자를 계속 `success`로 유지한다.
- stats 실패 복원력은 “마지막 정상 payload 유지”에 초점을 두고, 초기 미수신 상태를 live 로 오인하지 않도록 별도 테스트로 고정한다.
- UI 토큰화는 스타일 값만 이동하고 DOM 구조는 유지해 회귀 범위를 제한한다.
