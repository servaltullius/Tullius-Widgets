# Resolution-Stable Item Layouts Design

**Date:** 2026-03-17

## Goal

사용자가 직접 옮긴 HUD 위젯이 FHD와 UHD 사이를 오갈 때도 화면 비율상 같은 자리에 유지되도록 만든다.

## Problem

현재 canonical `itemLayouts`는 `x/y`를 절대 픽셀로 저장한다. 이 값은 저장 당시 해상도 정보 없이 그대로 다시 렌더되므로, 1920x1080에서 맞춘 위젯은 3840x2160에서 상대적으로 다른 위치에 보인다.

## Non-Goals

- 그룹 기본 배치 로직 자체를 재설계하지 않는다.
- 스냅, 드래그, 퀵에딧 UX를 새로 바꾸지 않는다.
- 위젯 크기(`scale`)를 해상도에 따라 자동 보정하지 않는다.

## Design

### Canonical layout metadata

`WidgetItemLayout`에 저장 기준 해상도 메타데이터를 추가한다.

- `viewportWidth?: number`
- `viewportHeight?: number`

기존 저장 데이터는 이 필드가 없을 수 있으므로 optional로 둔다.

### Resolution-aware rendering

`resolveWidgetItemLayouts(...)`는 canonical layout을 읽을 때 현재 viewport와 저장 viewport가 모두 있으면 `x/y`를 비율 변환한 값으로 렌더한다.

- `resolvedX = savedX * currentWidth / savedWidth`
- `resolvedY = savedY * currentHeight / savedHeight`

저장 viewport가 없으면 기존처럼 `x/y`를 그대로 사용한다.

### Writing canonical layouts

canonical `itemLayouts`가 새로 생기거나 `x/y`가 갱신되는 모든 경로에서 현재 viewport 메타데이터를 같이 저장한다.

주요 경로:
- 직접 드래그 종료
- quick-edit nudge
- quick-edit reset position
- missing canonical layout seed

### Backward compatibility

- 구버전 설정은 그대로 읽는다.
- viewport 메타데이터가 없는 기존 canonical layout은 한 번 수정/저장되기 전까지는 기존 픽셀 좌표 그대로 동작한다.
- schema version은 새 메타데이터를 공식화하기 위해 올린다.

## Affected Files

- `view/src/types/settings.ts`
- `view/src/data/widgetItemRegistry.ts`
- `view/src/hooks/settingsShared.ts`
- `view/src/hooks/settingsSchema.ts`
- `view/src/hooks/useSettings.ts`
- `view/src/App.tsx`
- `view/src/hooks/useSelectedItemLayoutActions.ts`
- `view/src/utils/itemLayoutEditing.ts`
- 관련 테스트 파일들

## Risks

- 한 경로라도 viewport 메타데이터 기록을 빼먹으면 일부 편집 방식만 해상도 왕복에 취약해질 수 있다.
- 저장 좌표와 렌더 좌표를 혼동하면 드래그 preview나 reset 동작이 꼬일 수 있다.

## Validation

- FHD에서 저장한 canonical 위치가 UHD에서 동일한 상대 위치로 렌더된다.
- UHD에서 다시 FHD로 돌아와도 상대 위치가 유지된다.
- nudge/reset/drag가 모두 viewport 메타데이터를 보존한다.
- `npm run lint`, `npm test`, `npm run build` 통과.
