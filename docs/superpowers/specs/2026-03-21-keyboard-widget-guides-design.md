# Keyboard Widget Guides Design

**Date:** 2026-03-21

## Goal

선택된 HUD 위젯을 키보드로 이동할 때도 주변 위젯과의 정렬선을 시각적으로 확인할 수 있게 만들어, 마우스 드래그 없이도 간격과 열 정렬을 쉽게 맞출 수 있게 한다.

## Problem

현재 키보드 위젯 이동은 `nudgeSelectedItem(deltaX, deltaY)`를 통해 좌표만 바꾼다. 마우스 드래그는 `snapWidgetMove(...)`를 거쳐 alignment guides를 계산하고 [`WidgetEditGuides`](/home/kdw73/Tullius%20Widgets/.worktrees/keyboard-widget-guides/view/src/components/WidgetEditGuides.tsx)가 이를 렌더하지만, 키보드 이동은 그 경로를 타지 않기 때문에 사용자는 정렬선 도움 없이 수치만 감으로 맞춰야 한다.

## Non-Goals

- 키보드 이동에 자동 스냅을 추가하지 않는다.
- 방향키 이동의 `1px / Shift+10px` 감각을 바꾸지 않는다.
- 드래그 preview 동작을 키보드 이동 전체로 확장하지 않는다.
- 새로운 키보드 편집 모드나 보조 키 조합을 추가하지 않는다.

## Design

### Recommended behavior

키보드 이동은 지금처럼 정확히 좌표만 바꾸고, 정렬 가능한 위치가 가까울 때는 **가이드라인만 잠깐 표시**한다.

- `Arrow*`: 1px 이동
- `Shift + Arrow*`: 10px 이동
- 실제 좌표는 기존 `nudgeSelectedItem(...)` 경로를 그대로 사용
- 하지만 이동 후 현재 위치 기준으로 `snapWidgetMove(...)`를 다시 호출해 alignment guides만 계산

즉, 키보드 이동은 “스냅 없이 가이드만 보여주는 정밀 보정”으로 정의한다.

### Why not keyboard snapping

키보드 이동의 핵심 가치는 미세조정이다. 여기서 마우스 드래그와 같은 자동 스냅을 적용하면,

- 1px 이동을 기대했는데 갑자기 10px grid나 다른 위젯 선으로 붙어버릴 수 있고
- 마우스 드래그와는 다른 종류의 답답함이 생길 수 있다.

따라서 이번 단계에서는 사용자가 정렬선을 보고 **직접 맞추게 돕는 것**만 목표로 한다.

### Guide computation model

이미 있는 스냅 계산기를 그대로 재사용한다.

- 입력:
  - `selectedItemId`
  - nudge 후의 `rawX`, `rawY`
  - 현재 widget bounds map
- 출력:
  - `guides`
  - `position`

키보드 이동에서는 `position`의 snapped 값은 무시하고, `guides`만 사용한다.

이 방식으로:

- 마우스와 같은 정렬선 계산 기준을 유지하고
- 중복 계산 로직을 만들지 않으며
- 키보드와 마우스의 시각 언어를 통일한다.

### Guide lifecycle

키보드 가이드는 영구적으로 남기지 않고 짧게만 유지한다.

- 방향키 입력으로 위젯이 움직이면 guide를 즉시 보여준다.
- 일정 시간이 지나면 guide를 자동으로 지운다.
- 다른 위젯을 선택하거나 설정창을 닫아도 guide는 즉시 지운다.

권장 유지 시간은 `250ms ~ 400ms` 수준이다. 시작 값은 `300ms`를 추천한다.

### Ownership and file boundaries

기존 선택/키보드 이동 책임을 크게 흔들지 않고, app 수준에서 guide state만 보강한다.

- [`useWidgetKeyboardNudge.ts`](/home/kdw73/Tullius%20Widgets/.worktrees/keyboard-widget-guides/view/src/hooks/useWidgetKeyboardNudge.ts)
  - 여전히 키보드 입력 해석과 nudge 호출만 담당
- [`App.tsx`](/home/kdw73/Tullius%20Widgets/.worktrees/keyboard-widget-guides/view/src/App.tsx)
  - item element refs와 `computeMovePreview(...)`를 이미 알고 있으므로
  - 키보드 이동 후 guide 계산 및 짧은 수명 관리를 담당

이 구조가 맞는 이유:

- `useWidgetKeyboardNudge`가 DOM bounds 측정 책임까지 가져가면 훅이 무거워진다.
- `App.tsx`는 이미 drag preview와 `activeGuides` state를 관리하고 있어, keyboard guide까지 함께 관리하는 편이 자연스럽다.

### Event handoff shape

키보드 이동 훅은 nudge 호출 외에 “이번 이동으로 guide를 갱신해야 한다”는 알림을 상위에 줄 수 있어야 한다.

추천 형태:

- 새 콜백: `onKeyboardNudge(deltaX, deltaY)`
- 또는 `onKeyboardNudge(nextX, nextY)`

이 중 추천은 `deltaX, deltaY`이다.

이유:

- 실제 canonical 좌표 변경은 기존 액션이 맡는다.
- 상위는 현재 canonical layout과 delta를 합쳐 `computeMovePreview(...)` 입력을 만들 수 있다.

### State consistency

키보드 이동은 canonical item layout만 바꾸고 preview layout은 만들지 않는다.

- 드래그 중이 아닐 때만 키보드 guide를 계산한다.
- 만약 preview layout이 살아 있는 상태라면, keyboard guide는 그 preview를 기준으로 계산하지 않는다.
- 기존처럼 interaction reset이나 settings close 시 preview/guides는 모두 비운다.

## Affected Files

- `view/src/App.tsx`
- `view/src/App.integration.test.tsx`
- `view/src/hooks/useWidgetKeyboardNudge.ts`
- `view/src/hooks/useWidgetKeyboardNudge.test.tsx`
- 필요 시 `view/src/components/WidgetEditGuides.tsx`

## Risks

- guide 자동 해제 타이머를 잘못 관리하면 방향키를 연속 입력할 때 깜빡임이 생길 수 있다.
- guide 계산에 snapped position을 잘못 재사용하면, 의도치 않게 실제 좌표도 스냅된 것처럼 보정될 수 있다.
- 드래그 preview와 keyboard guide가 동시에 살아 있으면 어떤 guides를 보여줘야 하는지 모호해질 수 있다.

## Validation

- 선택된 위젯을 방향키로 이동하면 정렬 가능한 위치에서 guide line이 잠깐 표시된다.
- 실제 좌표는 스냅되지 않고 `1px / 10px` 이동 규칙을 그대로 유지한다.
- guide는 일정 시간이 지나면 사라진다.
- slider/select 포커스 중에는 guide도 새로 생기지 않는다.
- 기존 마우스 드래그 guide 동작은 그대로 유지된다.
- `npm run lint`, `npm test`, `npm run build` 통과.
