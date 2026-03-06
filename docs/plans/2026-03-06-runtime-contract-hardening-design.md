# Runtime Contract Hardening Design

**Goal:** 브리지 계약 테스트, Windows 검증/패키징 루프, 네이티브 오케스트레이션 구조를 함께 강화해 릴리즈 회귀를 줄인다.

**Context**
- 이 저장소는 `C++ runtime -> Prisma UI bridge -> React view` 3계층 결합도가 높다.
- 최근 변경 이력도 XP/stats payload, settings sync, release-local/verify-runtime 흐름에 집중돼 있다.
- 현재 자동 검증은 프런트 훅과 일부 스크립트 계약에는 강하지만, 브리지 계약과 네이티브 orchestration 구조는 드리프트를 조기에 잡는 장치가 더 필요하다.

**Chosen Approach**
1. 브리지 계약은 canonical fixture + focused test로 묶는다.
   - `useGameStats`는 stats payload schema drift를 한 번 경고하도록 보강한다.
   - `useGameStats` / `useSettingsBridge` 테스트는 공통 fixture를 사용해 example payload를 재사용한다.
2. Windows 검증/패키징 루프는 `release-local.lib.ps1` helper를 단일 소스로 삼는다.
   - version 파싱, verify->release-local packaging 인수 계산, 공통 command helper를 lib에 둔다.
   - `verify-runtime-windows.ps1`는 로컬 helper 중복 정의를 제거하고 lib를 재사용한다.
3. 네이티브 오케스트레이션은 `main.cpp`에서 stats scheduling/heartbeat 책임을 별도 모듈로 분리한다.
   - view/bootstrap wiring은 `main.cpp`에 남기고,
   - gameLoaded, pending dispatch, scheduled due-time, heartbeat loop는 새 runtime 모듈로 이동한다.

**Alternatives Considered**
- 테스트만 추가하고 코드 구조는 유지:
  - 장점: 가장 안전하고 빠르다.
  - 단점: `main.cpp` 결합도와 스크립트 중복이 그대로 남아 다음 변경 비용이 계속 높다.
- 더 큰 리아키텍처로 plugin state 전체를 class 기반으로 전환:
  - 장점: 장기적으로 가장 깔끔할 수 있다.
  - 단점: 현재 검증 수단으로는 변경 폭이 너무 크고, 진행 중 워크트리 변경과 충돌 위험이 높다.

**Decision**
- 이번 턴에서는 “작게 자르되, 다음 변경 비용이 줄어드는” 절단면만 취한다.
- 새 모듈은 `WidgetRuntime` 1개로 제한하고, 브리지와 스크립트는 기존 public contract를 유지한다.

**Verification Strategy**
- 브리지: `cd view && npm test -- --run`
- 프런트 품질: `cd view && npm run lint`, `cd view && npm run build`
- 스크립트 계약: `node --test scripts/verify-runtime-windows.contract.test.mjs`, `node --test scripts/native-orchestration.contract.test.mjs`
- PowerShell helper 회귀: Windows PowerShell/Pester가 가능하면 `Invoke-Pester ./scripts/release-local.Tests.ps1`
- 네이티브 실빌드: 현재 세션이 WSL이면 직접 MSVC 빌드 불가 여부를 근거와 함께 보고하고, 가능한 범위의 계약 검증을 남긴다.
