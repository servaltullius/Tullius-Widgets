# Keyboard Widget Nudge Design

**Date:** 2026-03-21

## Goal

선택된 HUD 위젯을 키보드 방향키로도 이동할 수 있게 만들어, 마우스로 대략 배치한 뒤 가로/세로 간격을 정밀하게 맞출 수 있게 한다.

## Problem

현재 위젯 편집은 마우스 드래그와 설정창 quick edit 카드의 `±1` 버튼만 지원한다. 드래그만으로는 여러 위젯의 열 정렬, 행 간격, 아이콘 세로 스택 간 간격을 일정하게 맞추기 어렵다.

이미 선택된 위젯에 대한 `nudgeSelectedItem(deltaX, deltaY)` 액션은 존재하지만, 이 동작이 키보드 입력과는 연결돼 있지 않다. 사용자는 위젯을 집은 뒤에도 마우스만으로 위치를 맞춰야 한다.

## Non-Goals

- 새로운 “키보드 이동 모드”를 추가하지 않는다.
- 드래그, 리사이즈, 스냅, reset, z-index 로직을 재설계하지 않는다.
- 방향키 이동에 새 그리드 스냅 규칙을 추가하지 않는다.
- 설정창 quick edit 카드의 `±1` 버튼을 제거하지 않는다.

## Design

### Interaction model

방향키는 선택된 위젯이 있을 때만 동작한다.

- `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`: 1px 이동
- `Shift + Arrow*`: 10px 이동
- `Escape`: 기존처럼 선택 해제 유지

이동은 현재 선택된 item 하나에만 적용한다. 다중 선택이나 그룹 이동은 이번 범위에 포함하지 않는다.

### Ownership of keyboard handling

선택 상태 관리와 실제 위치 변경 책임은 분리한다.

- `useWidgetEditSelection.ts`
  - 선택 여부와 `Escape` 해제를 계속 담당
- 새 키보드 이동 훅
  - 선택된 item과 `SelectedItemLayoutActions`를 받아 방향키 입력을 `nudgeSelectedItem(...)`로 연결

이 구조가 맞는 이유:

- 선택/해제 책임은 기존 훅에 그대로 남긴다.
- 실제 위치 변경은 이미 있는 canonical item layout 액션을 재사용한다.
- 키보드 입력과 드래그/리사이즈 상호작용을 분리해 유지보수성을 지킨다.

### Focus conflict handling

폼 컨트롤과의 충돌은 반드시 막는다.

다음 요소에 포커스가 있을 때는 키보드 nudge를 무시한다.

- `input`
- `select`
- `textarea`
- `contenteditable`

특히 range slider와 select는 방향키를 자체 동작에 계속 사용해야 하므로, 이 경우 위젯은 움직이면 안 된다.

### Scope gate

키보드 이동은 아래 조건을 모두 만족할 때만 켠다.

- 설정창이 열려 있다.
- 선택된 위젯이 있다.
- 선택된 위젯 액션이 존재한다.
- 현재 active element가 폼 입력 계열이 아니다.

이 조건으로 패널 조작과 위젯 조작의 충돌을 줄인다.

### Layout behavior

키보드 이동은 quick edit 카드의 `±1` 버튼과 동일한 경로를 사용한다.

- `nudgeSelectedItem(deltaX, deltaY)`만 호출한다.
- canonical `itemLayouts`를 바로 갱신한다.
- viewport clamp와 기존 `nudgeItemLayout(...)` 동작은 그대로 재사용한다.
- 드래그 preview state나 alignment guide는 키보드 이동에서는 따로 만들지 않는다.

즉, 키보드 이동은 “간단한 정밀 보정”으로만 취급한다.

### Discoverability

이번 단계에서는 새 오버레이나 도움말은 추가하지 않는다.

다만 quick edit 카드 근처 또는 테스트에서 확인 가능한 최소 텍스트 보강은 허용한다. 실제 사용성 피드백이 더 쌓이면 이후 단계에서 `방향키 / Shift+방향키` 힌트를 패널에 추가할 수 있다.

## Affected Files

- `view/src/App.tsx`
- `view/src/App.test.tsx`
- `view/src/hooks/useSelectedItemLayoutActions.ts`
- `view/src/hooks/useWidgetEditSelection.ts`
- `view/src/hooks/useWidgetKeyboardNudge.ts` (new)
- `view/src/hooks/useWidgetKeyboardNudge.test.tsx` (new) 또는 `App.test.tsx`에 통합
- 필요 시 `view/src/components/settings/SelectedWidgetQuickEditCard.tsx`

## Risks

- 방향키 핸들러가 너무 전역적으로 잡히면 슬라이더, 셀렉트, 텍스트 입력과 충돌할 수 있다.
- `Escape` 처리와 새 방향키 처리가 같은 단계에서 섞이면 이벤트 소비 순서가 꼬일 수 있다.
- 드래그 preview가 살아 있는 상태에서 키보드 이동을 허용하면 canonical layout과 preview layout이 어긋날 수 있다.

## Validation

- 선택된 위젯이 있을 때 방향키로 `x/y`가 1px씩 이동한다.
- `Shift + 방향키`로 10px씩 이동한다.
- 선택이 없으면 방향키 입력으로 아무 것도 바뀌지 않는다.
- `input`, `select`, `textarea`, `contenteditable`에 포커스가 있으면 위젯이 움직이지 않는다.
- 기존 `Escape` 선택 해제 동작은 그대로 유지된다.
- `npm run lint`, `npm test`, `npm run build` 통과.
