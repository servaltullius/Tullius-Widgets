# Tullius Widgets Bridge Payload Schema

본 문서는 C++ SKSE 플러그인과 Prisma UI(React) 사이의 브릿지 JSON 스키마를 정의합니다.

## 1) `updateStats(jsonString)`

플러그인에서 주기적으로 보내는 전투/표시 데이터입니다.

```json
{
  "resistances": {
    "magic": 85.0,
    "fire": 85.0,
    "frost": 30.0,
    "shock": 85.0,
    "poison": 15.0,
    "disease": 100.0
  },
  "defense": {
    "armorRating": 712.0,
    "damageReduction": 80.0
  },
  "offense": {
    "rightHandDamage": 85.0,
    "leftHandDamage": 10.0,
    "critChance": 100.0
  },
  "equipped": {
    "rightHand": "Daedric Sword",
    "leftHand": "Chain Lightning"
  },
  "movement": {
    "speedMult": 100.0
  },
  "time": {
    "year": 201,
    "month": 7,
    "day": 24,
    "hour": 5,
    "minute": 18,
    "monthName": "Last Seed",
    "timeScale": 20.0
  },
  "playerInfo": {
    "level": 8,
    "experience": 1280.0,
    "expToNextLevel": 620.0,
    "nextLevelTotalXp": 1900.0,
    "gold": 3433,
    "carryWeight": 241.71,
    "maxCarryWeight": 445.0,
    "health": 300.0,
    "magicka": 100.0,
    "stamina": 100.0
  },
  "alertData": {
    "healthPct": 100.0,
    "magickaPct": 100.0,
    "staminaPct": 100.0,
    "carryPct": 54.0
  },
  "timedEffects": [
    {
      "instanceId": 102,
      "sourceName": "Talos Blessing",
      "effectName": "Fortify Shout",
      "remainingSec": 1594,
      "totalSec": 1800,
      "isDebuff": false,
      "sourceFormId": 12345,
      "effectFormId": 67890,
      "spellFormId": 112233
    }
  ],
  "calcMeta": {
    "rawResistances": {
      "magic": 91.0,
      "fire": 120.0,
      "frost": 30.0,
      "shock": 91.0,
      "poison": 15.0,
      "disease": 100.0
    },
    "rawCritChance": 120.0,
    "rawDamageReduction": 85.44,
    "armorCapForMaxReduction": 666.67,
    "caps": {
      "elementalResist": 85.0,
      "elementalResistMin": -100.0,
      "diseaseResist": 100.0,
      "diseaseResistMin": 0.0,
      "critChance": 100.0,
      "damageReduction": 80.0
    },
    "flags": {
      "anyResistanceClamped": true,
      "critChanceClamped": true,
      "damageReductionClamped": true
    }
  },
  "isInCombat": false
}
```

### 핵심 규칙

- `resistances`, `offense.critChance`, `defense.damageReduction`는 **실효 표시값**입니다.
- 원본 계산값은 `calcMeta.rawResistances`, `calcMeta.rawCritChance`, `calcMeta.rawDamageReduction`에 전달됩니다.
- UI는 `calcMeta.caps` 기준으로 캡/보조 텍스트를 표시합니다.
- 장착 표시 계약:
  - `equipped.rightHand`, `equipped.leftHand`는 가능한 경우 인벤토리 표시명(`InventoryEntryData::GetDisplayName`)을 우선 사용합니다.
  - 왼손은 주문/무기 외에 방패 슬롯 보강 판별을 포함합니다.
  - 장착 이벤트 직후 값은 안정성을 위해 한 틱 지연 후 반영될 수 있습니다.
- 경험치 계약:
  - `playerInfo.experience` = 현재 누적 XP
  - `playerInfo.expToNextLevel` = 레벨업까지 남은 XP
  - `playerInfo.nextLevelTotalXp` = 다음 레벨 총 필요 XP(누적 기준)
  - UI 권장 표기: `experience / nextLevelTotalXp`

## 2) `updateRuntimeStatus(jsonString)`

플러그인 로드시 런타임 호환성 진단 데이터를 보냅니다.

```json
{
  "runtimeVersion": "1.5.97.0",
  "skseVersion": "2.0.20.0",
  "addressLibraryPath": "C:/Games/Skyrim Special Edition/Data/SKSE/Plugins/version-1-5-97-0.bin",
  "addressLibraryPresent": true,
  "runtimeSupported": true,
  "usesAddressLibrary": true,
  "warningCode": "none"
}
```

### `warningCode` 값

- `none`
- `unsupported-runtime`
- `missing-address-library`
- `unsupported-runtime-and-missing-address-library`

## 3) 하위 호환성

- 기존 키(`updateStats`, `updateSettings`)는 유지됩니다.
- 신규 필드(`calcMeta`, `updateRuntimeStatus`)는 선택적 확장으로, 구버전 UI에서도 치명 오류 없이 무시 가능합니다.
