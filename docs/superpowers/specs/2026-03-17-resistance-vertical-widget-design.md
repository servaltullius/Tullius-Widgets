# Resistance Vertical Widget Design

**Date:** 2026-03-17

## Goal

저항력 HUD가 현재의 가로형 `아이콘 + 숫자/보조텍스트` 구조 때문에 차지하는 폭이 넓게 느껴지는 문제를 줄인다. 저항력 항목만 STB에 가까운 `숫자 위 / 아이콘 아래` 구조로 바꿔서 같은 정보량을 더 좁은 면적으로 전달한다.

## Non-Goals

- 플레이어 정보, 공격, 방어, 시간 위젯의 레이아웃은 바꾸지 않는다.
- 새 설정 옵션이나 스키마 필드는 추가하지 않는다.
- 저항력 그룹의 기본 위치나 편집 방식은 바꾸지 않는다.

## Design

### Resistance-only renderer

저항력 6종(`magic`, `fire`, `frost`, `shock`, `poison`, `disease`)에만 전용 세로형 렌더러를 도입한다. 기존 `StatWidget`을 억지로 세로 배치하는 대신, 저항력만의 좁고 단단한 표현을 별도 컴포넌트로 분리한다.

### Information hierarchy

- 메인 수치: 상단에 크게 표시
- 보조 수치: `둘 다`일 때만 작은 글씨로 메인 수치 아래에 표시
- 아이콘: 맨 아래에 크게 표시

이 구조로 시선이 `값 -> 의미(아이콘)` 순서로 흐르도록 한다.

### Display-mode behavior

- `effectiveOnly`: 상단에 실효값만 표시
- `rawOnly`: 상단에 원본값만 표시
- `both`: 상단에 실효값, 그 아래 작은 보조 수치로 원본값 표시

`both`에서도 가로 보조 문구를 길게 늘어놓지 않고, 세로 카드 안에서 처리한다.

### Visual direction

- 카드 폭은 현재 `StatWidget` 기반 저항력보다 확실히 좁게 유지
- 아이콘은 수치 아래에서 중심을 잡는 크기로 유지
- 상단 수치는 여전히 `%` 단위를 포함해 읽기 쉽게 표시
- cap 초과 경고/툴팁 같은 기존 의미 정보는 유지

## Affected Areas

- `view/src/components/HudWidgetItems.tsx`
- `view/src/components/StatWidget.tsx` 또는 새 저항력 전용 컴포넌트
- `view/src/components/HudWidgetItems.test.tsx`
- 새 컴포넌트 테스트 파일이 필요하면 추가

## Risks

- 세로형 카드가 너무 좁으면 `둘 다` 모드의 보조 수치 가독성이 나빠질 수 있다.
- 저항력만 새 렌더러로 분리하면서 cap, tone, tooltip 처리 일관성이 깨질 수 있다.

## Validation

- 저항력 6종이 모두 세로형 렌더러를 사용한다.
- `effectiveOnly`, `rawOnly`, `both` 표시 모드가 유지된다.
- 기존 HUD 편집, 위치 이동, 표시/숨김은 그대로 동작한다.
- `npm run lint`, `npm test`, `npm run build` 통과.
