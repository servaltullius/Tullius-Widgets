# PrismaUI 탈의존 로드맵

작성일: 2026-03-21

## 목적

Tullius Widgets가 현재 의존 중인 PrismaUI 호스트를 즉시 제거할 필요가 있는지 판단하고, 필요 시 어떤 순서로 안전하게 탈의존할지 로드맵을 정의한다.

## 결론

- 단기적으로는 PrismaUI를 유지한다.
- 중기적으로는 PrismaUI 직접 호출부를 호스트 추상화 뒤로 숨긴다.
- 장기적으로만 대체 호스트를 검토한다.

즉, 지금 당장 갈아엎는 방향이 아니라 `의존은 유지하되 탈출 가능한 구조로 바꾸는 방향`이 권장안이다.

## 현재 상태

현재 Tullius Widgets는 PrismaUI를 단순 렌더러가 아니라 런타임 호스트로 사용한다.

핵심 결합 지점:

- 플러그인 API 초기화: `src/main.cpp`
- view 생성과 DOM ready 라이프사이클: `src/WidgetBootstrap.cpp`
- JS interop, show/hide, focus/unfocus: `src/WidgetViewBridge.cpp`
- JS listener 등록: `src/WidgetJsListeners.cpp`
- 배포 구조: `dist/PrismaUI/views/TulliusWidgets`, `Data/PrismaUI/views/TulliusWidgets`

즉, PrismaUI를 제거하려면 단순 import 교체가 아니라 아래를 동시에 대체해야 한다.

- HTML/JS view hosting
- native ↔ JS 브리지 호출
- focus 및 input 제어
- 화면 표시/숨김 라이프사이클
- 배포/패키징 경로

## 왜 지금 당장 교체하지 않는가

장점보다 비용과 회귀 위험이 더 크다.

- 현재 제품은 PrismaUI 위에서 이미 안정화되어 있다.
- 설정 패널, 핫키, 커서 포커스, 실시간 stats sync가 이미 PrismaUI 계약에 맞춰 정리되어 있다.
- 제거 작업은 기능 개발이 아니라 플랫폼 교체에 가깝다.
- 최근 업데이트가 느리더라도, PrismaUI가 이미 즉시 사용 불가능한 상태라고 보긴 어렵다.

## PrismaUI를 벗어날 때의 장단점

### 장점

- 외부 프레임워크 업데이트 중단 리스크 감소
- focus, input, JS bridge 제어권 확보
- 장기적으로 배포 구조 단순화 가능
- HUD 및 설정 UI 런타임을 우리가 원하는 방식으로 최적화 가능

### 단점

- 초기 개발 비용이 큼
- HTML/React UI를 유지하려면 대체 web host가 필요함
- 아니면 UI 전체를 다시 써야 할 수 있음
- 안정화된 입력/포커스 경로가 다시 깨질 위험이 큼
- 기능 개발 속도가 한동안 떨어짐

## 대안 비교

### 옵션 A. PrismaUI 유지

장점:

- 가장 안전함
- 현재 릴리즈 흐름 유지 가능
- 기능 개발을 계속 진행 가능

단점:

- 외부 호스트 리스크를 그대로 감수해야 함

### 옵션 B. 호스트 추상화 후 PrismaUI 유지

장점:

- 지금 기능은 유지하면서 미래 대체 가능성 확보
- 리플랫폼 비용을 여러 단계로 분산 가능
- 테스트 가능 경계가 생김

단점:

- 당장 사용자 기능은 늘지 않음
- 구조 정리 비용이 필요함

### 옵션 C. PrismaUI 완전 제거

장점:

- 장기적으로 가장 깔끔함

단점:

- 지금 시점에서는 과한 범위
- 사실상 `Tullius Widgets 2.0`급 작업이 될 가능성이 높음

## 권장안

옵션 B를 권장한다.

즉, `PrismaUI를 유지한 채 PrismaUI 직접 의존부를 인터페이스 뒤로 숨긴다`.

## 목표 아키텍처

현재:

`main / bootstrap / listeners / bridge -> PrismaUI API 직접 호출`

목표:

`widget runtime -> IWidgetHost -> PrismaUIHost`

후속 가능성:

`widget runtime -> IWidgetHost -> NativeHost 또는 다른 Host`

## 단계별 로드맵

### 1단계. 호스트 추상화 도입

목표:

- PrismaUI 직접 호출을 한곳으로 모은다.

작업:

- `IWidgetHost` 인터페이스 도입
- 책임 분리:
  - `CreateView`
  - `RegisterJsListener`
  - `InteropCall`
  - `Invoke`
  - `Show`
  - `Hide`
  - `Focus`
  - `Unfocus`
  - `HasFocus`
- `WidgetBootstrap`, `WidgetViewBridge`, `WidgetJsListeners`, `main`은 인터페이스만 보도록 정리
- 기존 PrismaUI 구현은 `PrismaWidgetHost`로 캡슐화

완료 기준:

- 제품 동작은 그대로
- PrismaUI 헤더 포함과 API 직접 호출이 호스트 구현체 내부로 제한됨

### 2단계. 배포/빌드 경로 분리

목표:

- PrismaUI 경로 가정을 런타임/패키징 레벨에서 분리한다.

작업:

- frontend output path를 host-aware 구조로 정리
- `scripts/package.sh`, `scripts/release-local.ps1`, 릴리즈 노트 문구를 host abstraction 기준으로 정리
- `PrismaUI/views/TulliusWidgets` 하드코딩을 설정값 또는 호스트별 경로 계산으로 이동

완료 기준:

- 배포 스크립트가 특정 호스트명에 덜 묶임
- 문서상 설치 경로도 호스트 개념으로 설명 가능

### 3단계. 브리지 계약 고정

목표:

- 프런트엔드가 PrismaUI가 아니라 `TulliusWidgets bridge contract`에 의존하도록 명확히 고정한다.

작업:

- 현재 JS bridge contract를 문서화
- lifecycle:
  - DOM ready
  - settings sync
  - stats push
  - focus/unfocus
  - visibility
- 테스트에서 host와 무관한 contract 검증 강화

완료 기준:

- 프런트가 host 교체와 무관하게 동일 bridge contract로 동작

### 4단계. 대체 호스트 탐색

목표:

- PrismaUI 대체 가능성만 검증한다. 아직 기본 경로는 바꾸지 않는다.

후보:

- 다른 web host
- 게임 내 native/scaleform 기반 host
- 커스텀 overlay host

검증 항목:

- 입력 포커스
- 마우스 커서
- JS bridge 성능
- Skyrim 런타임 안정성
- 패키징 복잡도

완료 기준:

- `기술적으로 가능하다` 또는 `비용 대비 의미 없다`를 판단할 수 있는 PoC 결과 확보

### 5단계. 전환 여부 결정

전환 조건:

- PrismaUI가 실제로 유지 중단 상태로 보임
- 최신 Skyrim 런타임과 호환성 문제가 누적됨
- 대체 호스트가 focus/input/bridge 요구사항을 충족함

전환하지 않는 조건:

- PrismaUI가 계속 충분히 작동함
- 대체 호스트의 회귀 위험이 큼
- 기능 개발보다 플랫폼 교체 비용이 더 큼

## 비기능 요구사항

탈의존 준비 작업은 아래를 만족해야 한다.

- 기존 기능 회귀 최소화
- 현재 릴리즈/패키징 흐름 유지 가능
- 설정 패널 focus/hotkey 동작 유지
- stats payload 경로 변화 없음
- 프런트 bridge 계약 안정성 유지

## 리스크

### 리스크 1. 추상화만 늘고 이득이 없을 수 있음

대응:

- 1단계 범위를 `직접 API 호출 분리`로 제한

### 리스크 2. 포커스/입력 경로 회귀

대응:

- hotkey, settings panel, widget edit, cursor 관련 통합 테스트 유지

### 리스크 3. 배포 문서와 실제 산출물 불일치

대응:

- 스크립트와 릴리즈 노트를 함께 정리

## 추천 실행 순서

1. `IWidgetHost` 도입
2. PrismaUI 구현체로 기존 동작 유지
3. 패키징/문서 경로 정리
4. JS bridge contract 문서화
5. 대체 호스트 PoC 여부 판단

## 지금 하지 않을 것

- 즉시 PrismaUI 제거
- UI 전체 재작성
- Scaleform 또는 완전 native HUD로의 즉시 전환
- 사용자 기능보다 플랫폼 교체를 우선하는 대규모 리라이트

## 최종 판단

현재 시점에서 PrismaUI는 `지금 즉시 제거해야 하는 장애물`은 아니다.  
하지만 단일 외부 호스트 의존은 장기 리스크이므로, 다음 아키텍처 정리 작업에서는 `PrismaUI 탈의존 준비`를 해두는 것이 맞다.
