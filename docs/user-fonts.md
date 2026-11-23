# 사용자 글꼴 / User fonts

글꼴 파일을 폴더에 넣으면 설정 → 일반 → 글꼴 프리셋에서 **사용자 글꼴**을 고를 수 있습니다. 클래식 카드와 컴팩트 HUD 모두에 적용됩니다. 설정 창은 기존 프리셋 글꼴을 사용합니다.

Install font files in a folder, then pick it in Settings > General > Font Preset. User fonts apply to both HUD styles. The settings panel keeps the preset font.

## 폴더 구조 / Layout

```text
Data/PrismaUI/views/TulliusWidgets/user-fonts/
  <글꼴 이름 / font name>/
    MyFont-Regular.ttf
    MyFont-SemiBold.ttf
    MyFont-Bold.ttf
```

- 글꼴마다 폴더 하나를 만들고 파일을 바로 안에 넣습니다. 폴더 이름이 목록에 표시됩니다. 새 글꼴은 게임을 다시 시작하거나 세이브를 불러오면 나타납니다.
- 폴더와 파일 이름은 유효한 UTF-8로 1~192바이트까지 쓸 수 있습니다. 한글·이모지 등 비ASCII 문자와 영문·숫자·공백·`_ - . ( ) ' [ ] + & , ! # @ ~ = ;`를 허용합니다. `.`으로 시작하거나 끝나는 이름, `..`가 들어간 이름, 앞이나 뒤에 공백이 있는 이름은 건너뜁니다. 파일 이름의 바이트 수에 확장자도 포함됩니다.
- TTF, OTF, WOFF2, WOFF를 인식하며 확장자의 대소문자는 구분하지 않습니다. 게임(1.6.1170)에서 TTF와 OTF가 동작하는 것을 확인했고, 동봉 글꼴로 쓰는 정적 WOFF2도 동작합니다. 파일 크기가 0바이트이면 목록에서 제외됩니다.
- 이름순으로 최대 32개 글꼴과 폴더당 최대 16개 파일을 읽습니다. 글꼴 파일은 하위 폴더까지 찾지 않습니다.

New fonts appear after restarting the game or loading a save. Folder and file names are limited to 192 UTF-8 bytes, including the extension. Non-ASCII characters, ASCII letters and digits, spaces, and `_ - . ( ) ' [ ] + & , ! # @ ~ = ;` are allowed. Leading or trailing dots or spaces, and consecutive dots, are skipped. TTF and OTF were confirmed in game (1.6.1170), and static WOFF2 works for the bundled font. WOFF is also recognized.

## 굵기 / Weights

파일 이름에서 마지막 확장자를 떼고 영문자만 남긴 뒤, 아래 이름이 들어 있는지 대소문자 구분 없이 검사합니다. `Extra Light`나 `Semi-Bold`처럼 구분자를 넣어도 됩니다. `Italic`이나 `Oblique`가 들어간 파일은 건너뜁니다.

| 이름 / Filename keyword | 굵기 / Weight |
| --- | ---: |
| Thin, Hairline | 100 |
| ExtraLight, UltraLight | 200 |
| Light | 300 |
| Regular, Normal, Book, Roman 또는 해당 이름 없음 / no match | 400 |
| Medium | 500 |
| SemiBold, DemiBold | 600 |
| Bold | 700 |
| ExtraBold, UltraBold | 800 |
| Black, Heavy | 900 |

`Bookman-Bold`처럼 이름 안에 Book·Roman·Normal·Regular가 섞여 있어도 Bold·Medium 같은 실제 굵기 이름을 먼저 봅니다. 파일이 하나뿐이면 그 파일의 굵기로 등록되고, 다른 굵기의 글자에도 그 파일이 쓰입니다.

같은 굵기의 여러 형식은 WOFF2 → WOFF → OTF → TTF 순으로 시도합니다. 굵기와 형식이 같으면 파일 이름을 UTF-8 바이트순으로 정렬해 첫 파일을 씁니다. 영문 대소문자만 다른 파일 이름은 하나로 칩니다.

Weight is inferred from the filename after removing the final extension and non-ASCII-letter characters. Weight words such as Bold or Medium win over Book, Roman, Normal and Regular inside family names (`Bookman-Bold` is 700). A single file is registered at its own weight and serves every weight. Italic and Oblique files are skipped. File names that differ only in ASCII case count once. For each weight, the HUD tries WOFF2, WOFF, OTF and TTF in that order, using the first file by UTF-8 byte order within each format.

## 기본 글꼴 표시 / Fallback

- 영문 전용 글꼴에서 한글처럼 빠진 글자는 기존 글꼴로 표시됩니다.
- 글꼴 폴더를 지우거나 글꼴을 불러오지 못하면 HUD는 프리셋 글꼴을 사용합니다. 저장된 선택은 유지되므로 폴더를 다시 설치하면 재시작 또는 세이브 로드 후 다시 적용됩니다.
- 굵기 파일 하나가 깨져 있어도 읽힌 굵기로 표시합니다. 불러오는 동안(큰 글꼴은 수십 초)은 설정 창에 "불러오는 중"이 뜨고 HUD는 프리셋 글꼴을 씁니다.
- 불러오지 못한 글꼴 파일을 같은 이름의 정상 파일로 바꿨다면 게임을 다시 시작하세요. 같은 목록으로는 다시 불러오지 않습니다.
- 프리셋을 내보내면 선택한 폴더 이름이 저장됩니다. 다른 환경에서 프리셋을 가져올 때는 글꼴 폴더도 따로 설치하세요.

Missing glyphs use the existing HUD font. If a folder goes missing or a font fails to load, the HUD uses the preset font and keeps the saved choice. A broken weight file does not discard the weights that loaded. While a font loads (large fonts can take tens of seconds) the settings panel says so and the HUD keeps the preset font. After replacing a broken font file with a good one of the same name, restart the game. Presets include the folder name. Install the font files separately on the destination setup.

## 애드온 배포 / Sharing

- 압축 루트부터 `PrismaUI/views/TulliusWidgets/user-fonts/<글꼴 이름>/...` 경로가 되게 만들면 MO2·Vortex에서 모드로 설치할 수 있습니다.
- MO2는 `PrismaUI` 폴더만 있는 압축에서 "<data>의 내용물이 유효하지 않은 것으로 보입니다"라고 경고할 수 있습니다. 압축 경로가 위와 같으면 그대로 확인을 누르면 됩니다.
- 두 애드온이 같은 글꼴 폴더 이름을 쓰면 게임의 가상 `Data`에서 파일이 한 폴더로 합쳐집니다. 겹치는 파일은 모드 우선순위가 결정하므로 애드온마다 고유한 폴더 이름을 사용하세요.
- 재배포가 허용된 글꼴만 배포하고 라이선스 파일을 함께 넣으세요.

Use `PrismaUI/views/TulliusWidgets/user-fonts/<font name>/...` at the archive root. MO2 may warn that the `<data>` contents look invalid for an archive containing only `PrismaUI`. You can click OK when the layout matches this example. Add-ons with the same font folder name merge their files in the virtual `Data` folder. Choose a distinct folder name. Share fonts you are allowed to redistribute and include their license files.
