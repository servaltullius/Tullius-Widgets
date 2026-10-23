# 아이콘 팩 만들기 / Making an icon pack

컴팩트 HUD의 아이콘을 직접 그린 PNG로 바꿀 수 있습니다(v1.9.0부터). 팩은 폴더 하나이고, 넣고 싶은 아이콘만 넣으면 됩니다. 팩에 없는 아이콘은 기본 테마의 아이콘으로 보입니다.

You can replace the compact HUD's icons with your own PNGs (v1.9.0 and later). A pack is one folder holding only the icons you want to change; anything missing uses the base theme's built-in icon. English notes follow each section.

## 폴더 구조 / Layout

```
Data/PrismaUI/views/TulliusWidgets/icon-packs/
  <팩 이름 / pack name>/
    pack.json            (선택 / optional)
    health.png
    gold.png
    slot-sword.png
    slot-sword-left.png
    ...
```

- 팩 이름(폴더 이름)은 64자까지, 한글·영문·숫자·공백·`_ - . ( ) ' [ ]`를 쓸 수 있습니다. `.`으로 시작하거나 `..`가 들어간 이름은 무시됩니다.
- 아이콘 파일 이름은 영문·숫자·`_`·`-`만, 확장자는 `.png`입니다. 대소문자는 구분하지 않습니다.
- MO2에서는 모드 하나로 만들어 `PrismaUI/views/TulliusWidgets/icon-packs/<팩 이름>/`에 넣으면 됩니다.
- 새 팩은 게임을 다시 시작하거나 세이브를 불러오면 설정 → 일반 → 아이콘 스타일 목록에 "아이콘 팩: <이름>"으로 나타납니다(컴팩트 HUD 전용).

Folder names: up to 64 characters (letters in any script, digits, spaces and `_ - . ( ) ' [ ]`); names starting with `.` or containing `..` are skipped. Icon file names: ASCII letters, digits, `_` and `-`, extension `.png`, case-insensitive. A new pack appears in Settings > General > Icon Style after restarting the game or loading a save.

## pack.json

```json
{
  "name": "룬 아이콘",
  "author": "제작자 이름",
  "version": "1.0",
  "base": "dororong"
}
```

| 키 / key | 설명 / meaning |
|---|---|
| `name` | 목록에 보일 이름(40자). 없으면 폴더 이름 / Display name; defaults to the folder name |
| `author`, `version` | 설정 화면에 "이름 버전 — 제작 작성자"로 표시 / Shown under the icon style select |
| `base` | `dororong`(기본) 또는 `standard` / `dororong` (default) or `standard` |

`base`는 배치와 아이콘 크기, 그리고 팩에 없는 아이콘을 무엇으로 채울지 정합니다.

| base | 배치 / layout | 수치 아이콘 / stat icons | 슬롯 그림 / slot art | 빠진 아이콘 / missing icons |
|---|---|---|---|---|
| `dororong` | 간격이 넓은 도로롱 배치 / roomy Dororong layout | 28–32px | 56px | 도로롱 그림 / Dororong art |
| `standard` | 표준 배치 / standard layout | 14–16px | 36px | 선 아이콘 / line icons |

같은 base끼리 팩을 바꾸면 사용자가 옮긴 위젯 배치가 그대로 유지됩니다. base가 다른 팩이나 테마로 바꾸면 그 스타일의 기본 배치로 이동합니다.

Switching between packs (or themes) with the same base keeps the player's widget arrangement; changing the base moves widgets to that style's default layout.

## 그림 규격 / Image guidelines

- 정사각형, 투명 배경 PNG. 96–256px 권장(작게 줄여 그려지므로 큰 그림이 깔끔합니다).
- 실제 화면에서는 아주 작게 보입니다(위 표). 실제 크기로 줄여 보고 알아볼 수 있는지 확인하세요.
- 슬롯 그림은 아래쪽 모서리에 공격력·개수 숫자가 겹치므로, 중요한 부분을 위쪽·가운데에 두세요.
- 참고용 원본: 도로롱 아이콘 73종이 같은 이름 규칙으로 저장소에 있습니다.
  - 256px 원본: `docs/design/dororong-mini/source/` (이 폴더만 수치 아이콘 이름 앞에 `small-`이 붙어 있습니다. 팩에서는 `small-`을 떼세요.)
  - 실제 사용 크기 96px: `view/src/assets/dororong-mini/`

Square, transparent PNGs of 96–256px work best. They are drawn small (see the table), so check them at that size. Damage and count figures sit in a slot's bottom corner; keep the subject high and centred. The 73 Dororong icons in the repository follow the same names and make a good template (drop the `small-` prefix used in `docs/design/dororong-mini/source/`).

## 아이콘 이름 / Icon names

### 수치·시계·날씨 / Stats, clocks, weather

| 파일 / file | 쓰이는 곳 / used for |
|---|---|
| `health` `magicka` `stamina` | 자원 막대 / resource bars |
| `magic` `fire` `frost` `shock` `poison` `disease` | 저항 / resistances |
| `armor` `damageReduce` | 방어도, 피해 감소 / armor rating, damage reduction |
| `rightHandDamage` `leftHandDamage` `crit` | 손별 공격력, 치명타 / per-hand damage, critical chance |
| `speed` | 이동 속도 / movement speed |
| `gold` `weight` `level` | 금화, 소지 무게, 레벨 / gold, carry weight, level |
| `gameTime` `realTime` `playtime` | 게임 시계, 현실 시계, 누적 플레이 시간 / clocks, time played |
| `clear` `cloudy` `rain` `snow` `indoor` | 날씨 / weather |

### 지속 효과 분류 / Timed effect categories

`health` `magicka` `stamina` `fire` `frost` `shock` `magic` `poison` `disease` `armor` `speed` `weight` `water` `invisibility` `paralysis` `vision` `cloak` `time` `ethereal` `skill` `other`

수치 아이콘과 이름이 같은 분류(`health`, `fire` 등)는 같은 그림을 씁니다. / Categories that share a stat's name use the same file.

### 장비 슬롯 / Equipment slots

| 파일 / file | 쓰이는 곳 / used for |
|---|---|
| `slot-<종류>` | 오른손(R) 슬롯, 왼손 그림이 없을 때 왼손(L) / right hand, and the left hand when no `-left` file exists |
| `slot-<종류>-left` | 왼손(L) 슬롯(선택) / left hand (optional) |
| `slot-voice` | 포효·파워(Z) / shout or power |
| `slot-potion-health` `slot-potion-magicka` `slot-potion-stamina` `slot-potion-other` | 최근 마신 물약(P) / last potion |
| `slot-empty` | 빈 손 / empty hand |

`<종류>` / kinds: `unarmed` `sword` `dagger` `waraxe` `mace` `greatsword` `battleaxe` `warhammer` `bow` `crossbow` `staff` `spell` `destruction` `restoration` `alteration` `illusion` `conjuration` `shield` `torch` `other`

팩에 `slot-sword`만 있고 `slot-sword-left`가 없으면 왼손에도 팩의 `slot-sword`를 씁니다(한 슬롯에 두 스타일이 섞이지 않게). / A pack with `slot-sword` but no `slot-sword-left` uses its own `slot-sword` for the left hand too.

## 배포 / Sharing

- 팩만 따로 모드로 배포할 수 있습니다. 압축 안 경로를 `PrismaUI/views/TulliusWidgets/icon-packs/<팩 이름>/...`로 만들면 MO2·Vortex에서 바로 설치됩니다.
- MO2는 `PrismaUI` 폴더만 있는 압축을 설치할 때 "<data>의 내용물이 유효하지 않은 것으로 보입니다"라고 경고합니다. 구조가 위와 같다면 그대로 확인을 누르면 됩니다(MO2가 SKSE·meshes 같은 익숙한 폴더가 없어서 띄우는 경고입니다).
- 다른 작품의 캐릭터나 아이콘을 쓴다면 원작자의 이용 규정을 확인하세요.

Packs can be shared as standalone mods; use the archive path `PrismaUI/views/TulliusWidgets/icon-packs/<pack name>/...`. MO2 warns that the <data> contents look invalid for an archive holding only a `PrismaUI` folder; with this layout it is safe to click OK. If you draw someone else's characters or icons, check the original creator's terms.
