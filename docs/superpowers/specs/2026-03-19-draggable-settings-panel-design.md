# Draggable Settings Panel Design

**Date:** 2026-03-19

## Goal

설정창을 드래그로 옮기고 위치를 기억할 수 있게 만들어, 패널 뒤에 가려진 HUD 위젯도 사용자가 직접 선택하고 재배치할 수 있게 한다. 동시에 위젯 위치 초기화는 현재 해상도 기준의 적절한 기본 배치를 계속 유지하도록 명시적으로 고정한다.

## Problem

현재 설정창은 `fixed + translate(-50%, -50%)`로 화면 중앙에 고정되어 있다. 이 상태에서는 패널 뒤에 있는 위젯을 클릭할 수 없고, 사용자가 원하는 위젯이 패널 뒤로 가면 위치 조정이 막힌다.

추가로 위젯 위치 초기화는 이미 현재 viewport를 사용해 기본 배치를 다시 계산하지만, 이 동작이 테스트로 고정돼 있지 않아 이후 수정에서 해상도별 기본 reset 위치가 흔들릴 수 있다.

## Non-Goals

- 설정창을 클릭스루로 만들지 않는다.
- 위젯 선택 우선권을 패널보다 높이지 않는다.
- 새로운 “뒤 위젯 선택 모드”나 별도 핫키를 이번 단계에서 추가하지 않는다.
- 위젯 기본 배치 규칙 자체를 전면 재설계하지 않는다.

## Design

### Panel movement model

설정창은 헤더 영역만 드래그 핸들로 사용한다.

- 제목과 닫기 버튼이 있는 상단 헤더를 드래그 시작 지점으로 사용한다.
- 본문, 체크박스, 셀렉트, 스크롤 영역은 기존처럼 패널 조작에만 사용한다.
- 닫기 버튼이나 탭 같은 실제 컨트롤을 누를 때는 드래그가 시작되지 않도록 막는다.

### Position persistence model

패널 위치는 절대 픽셀 기준의 `left/top` 좌표로 저장한다.

- 저장 데이터 형태:
  - `left: number`
  - `top: number`
- 저장 키는 `SETTINGS_PANEL_STORAGE_KEYS`에 `position`을 추가한다.
- 탭/섹션 확장 상태는 기존처럼 `sessionStorage`를 유지한다.
- 패널 위치는 사용자 선호로 보는 게 자연스러우므로 `localStorage`에 저장하고, 저장 실패 시에는 무시한다.

### First open and reopen behavior

- 저장된 위치가 없으면 패널은 기존처럼 화면 중앙에서 연다.
- 저장된 위치가 있으면 그 좌표로 연다.
- 사용자가 한 번 옮긴 뒤 다시 열면 마지막 위치를 유지한다.

### Viewport clamping

패널은 열릴 때와 viewport resize 때 항상 화면 안으로 다시 클램프한다.

- 패널이 화면 밖으로 완전히 밀려나지 않게 최소 여백을 둔다.
- 4K에서 옮겨 둔 패널을 FHD에서 다시 열어도 최소한 헤더와 닫기 버튼은 보이게 한다.
- 패널 크기는 `panelScale`에 따라 달라지므로, 실제 DOM `getBoundingClientRect()` 기준으로 클램프한다.

### Drag behavior

- 드래그 시작 시 현재 패널의 실제 `left/top`를 기준점으로 잡는다.
- pointer 이동 동안 패널 위치 state를 갱신한다.
- pointer up 시 클램프된 위치를 저장한다.
- 패널은 움직여도 `z-index`, 배경, 스케일, 내부 레이아웃은 그대로 유지한다.

### Widget selection behavior

패널과 위젯의 우선순위는 바꾸지 않는다.

- 사용자는 패널을 원하는 곳으로 치운 뒤 뒤에 있던 위젯을 선택한다.
- 기존 `EditableWidgetItem` 선택/드래그 로직은 그대로 둔다.
- 설정창을 옮기는 것으로 “가려진 위젯을 집을 수 없는 문제”를 해결한다.

### Reset behavior across resolutions

`resetItemToDefaultPlacement(...)`는 계속 현재 viewport 기준 기본 배치를 사용한다.

- `buildItemLayoutsFromLegacySettings(..., viewportWidth, viewportHeight)` 경로를 유지한다.
- reset regression 테스트를 추가해 FHD/UHD에서 현재 viewport 기준 `x/y`가 선택되는지 고정한다.
- 만약 테스트나 런타임 확인에서 특정 그룹이 해상도별로 어색한 위치로 reset 된다면, 그때만 `widgetRegistry.ts` 기본 앵커를 조정한다.

## Affected Files

- `view/src/components/SettingsPanel.tsx`
- `view/src/components/SettingsPanel.test.tsx`
- `view/src/components/settings/settingsPanelState.ts`
- `view/src/constants/bridge.ts`
- `view/src/utils/itemLayoutEditing.test.ts`
- 필요 시 `view/src/data/widgetRegistry.ts`
- 필요 시 `view/src/data/widgetRegistry.test.ts`

## Risks

- 드래그 시작 처리가 헤더 컨트롤과 충돌하면 닫기 버튼/탭 클릭이 불안정해질 수 있다.
- 저장된 패널 위치를 resize 시 클램프하지 않으면 작은 해상도에서 패널이 반쯤 사라질 수 있다.
- reset 보강을 명시만 하고 테스트를 안 남기면, 나중에 default placement 로직을 만질 때 해상도별 초기화가 다시 깨질 수 있다.

## Validation

- 저장된 위치가 없을 때 설정창이 중앙에 열린다.
- 헤더를 드래그하면 설정창이 움직인다.
- 패널을 닫고 다시 열어도 마지막 위치가 유지된다.
- viewport를 줄였을 때 패널이 화면 밖으로 완전히 사라지지 않는다.
- 패널을 옮긴 뒤 뒤에 있던 HUD 위젯을 실제로 선택할 수 있다.
- `resetItemToDefaultPlacement(...)`가 FHD/UHD 각각에서 현재 viewport 기준 기본 좌표를 사용한다.
- `npm run lint`, `npm test`, `npm run build` 통과.
