# Voice Slot Widget Design

## Goal

현재 선택된 포효/파워를 HUD에서 이름으로 확인할 수 있게, 기존 장비 위젯과 같은 계열의 `포효/파워` 슬롯 위젯 1개를 추가한다.

## Context

현재 payload와 프론트엔드는 장비 슬롯을 `equipped.rightHand`, `equipped.leftHand` 두 개만 다룬다. 스카이림의 포효 슬롯은 실제로 포효와 파워가 같은 선택 슬롯을 공유하므로, 포효만 따로 지원하는 것보다 `포효/파워` 공용 슬롯으로 다루는 편이 사용자 기대와 엔진 구조에 더 잘 맞는다.

이번 작업은 다음 문제를 해결한다.

- 현재 선택된 포효/파워를 HUD에서 볼 수 없다.
- 장비/마법 위젯과 달리 포효 슬롯은 사용자 커스터마이즈 대상에 없다.
- 이름이 바뀔 때 이전 텍스트가 남아 겹치는 기존 런타임 특성을 새 슬롯에도 방지해야 한다.

## Recommended Approach

`equipped.voice`와 `equipped.voiceType`을 payload에 추가하고, 프론트엔드에는 `equipped.voice` 위젯 1개를 새 item으로 등록한다.

이 방식의 장점:

- 기존 `equipped.*` 패턴을 그대로 따른다.
- 설정 패널, item registry, HUD 렌더러를 기존 구조 위에 얹을 수 있다.
- 나중에 `voiceType`을 이용해 아이콘/톤/쿨다운 확장으로 자연스럽게 발전시킬 수 있다.

## Data Contract

### Native Payload

`StatsPayload::EquippedSnapshot`에 다음 필드를 추가한다.

- `voice: std::string`
- `voiceType: std::string`

`voiceType` 값은 아래 셋만 허용한다.

- `empty`
- `shout`
- `power`

### JSON Bridge

`equipped` 오브젝트는 아래처럼 확장된다.

```json
"equipped": {
  "rightHand": "Daedric Sword",
  "leftHand": "Chain Lightning",
  "voice": "Unrelenting Force",
  "voiceType": "shout"
}
```

### Frontend Types

`view/src/types/stats.ts`의 `Equipped` 타입에도 동일 필드를 추가한다.

설정은 기존 `equipped` 블록을 확장한다.

- `equipped.voice: boolean`

기본값은 `false`로 둔다. 이미 HUD 항목이 많은 사용자가 업데이트 직후 레이아웃이 크게 바뀌지 않게 하는 편이 안전하다.

## Native Collection Design

포효/파워 수집은 `PlayerCharacter`/`Actor`의 현재 선택된 power 슬롯을 읽는 방식으로 구현한다.

수집 규칙:

1. 선택된 form을 가져온다.
2. 이름은 기존 장비 슬롯과 동일하게 display name 우선으로 해석한다.
3. `TESShout`면 `voiceType = "shout"`.
4. `SpellItem` 또는 기타 power 계열 form이면 `voiceType = "power"`.
5. 슬롯이 비어 있거나 이름을 얻지 못하면 `voice = ""`, `voiceType = "empty"`.

이 단계에서는 cooldown, dragon soul state, shout readiness는 다루지 않는다.

## Frontend Presentation

### Widget Identity

새 widget item id:

- `equipped.voice`

기본 배치 힌트:

- `legacyGroupId: "equipped"`
- `defaultPlacementHint.groupId: "equipped"`
- `order: 2`

즉 오른손, 왼손 다음에 포효/파워가 오도록 한다.

### Visuals

렌더링은 기존 `StatWidget`을 재사용한다.

- 빈 값이면 `equippedEmpty` 번역 사용
- `prominence="secondary"`
- 이름 변경 시 remount가 필요하므로 `remountValueOnChange` 적용

아이콘 정책:

- 이번 단계에서는 `voiceType`이 `shout`/`power`여도 아이콘 하나로 통일한다.
- 필요하면 `voiceType`에 따라 색상 정도만 다르게 줄 수 있다.

추천 초기값:

- icon key: 새 `voice` 아이콘
- iconColor: `#d8c17a` 같은 중립 골드 톤

### Settings Panel

`전투 수치 -> 장비` 섹션에 토글 1개를 추가한다.

- 라벨: `포효/파워`

위젯 커스터마이즈 경로도 기존 장비 항목과 동일한 방식으로 item-based 토글을 사용한다.

## Internationalization

다음 번역 키를 추가한다.

- `voiceEquipped`
- `voicePower`
- `voiceShout`

이 단계에서 UI 라벨은 `voiceEquipped`만 직접 노출된다.
`voicePower`, `voiceShout`는 향후 tooltip 또는 타입 표시에 재사용할 수 있도록 같이 마련한다.

## Error Handling

- 네이티브 쪽에서 선택된 power form을 읽지 못해도 빈 문자열/`empty`로 안전하게 떨어져야 한다.
- 프론트는 `voiceType`이 알 수 없는 값이어도 `equippedEmpty`나 기본 아이콘으로 폴백해야 한다.
- 기존 저장 설정에 `equipped.voice`가 없어도 schema merge에서 `false` 기본값으로 병합되어야 한다.

## Testing Strategy

### Native

- payload snapshot test 또는 string writer test에 `voice` / `voiceType`이 포함되는지 확인한다.

### Frontend

- stats type / mock data가 새 필드를 수용하는지 검증
- settings schema가 `equipped.voice`를 병합하는지 검증
- widget registry에 `equipped.voice`가 등록되는지 검증
- `HudWidgetItems`가 `equipped.voice`를 렌더하는지 검증
- 이름이 바뀔 때 value node가 remount되는지 검증

## Out of Scope

이번 작업에서는 아래를 하지 않는다.

- 포효 cooldown 표시
- shout/power별 서로 다른 대형 레이아웃
- 선택된 포효/파워의 세부 타입/효과 설명
- 포효 아이콘 세분화

## Rollout Notes

기능은 additive change다.

- 기존 HUD 레이아웃은 그대로 유지
- 새 토글은 기본 `off`
- 사용자가 원할 때만 `포효/파워` 위젯을 켤 수 있다
