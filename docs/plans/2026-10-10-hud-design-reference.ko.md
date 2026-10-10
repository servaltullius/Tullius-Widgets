# Skyrim HUD 디자인 레퍼런스 조사 (2026-10-10)

**추천은 ‘왼쪽 아래 압축 계기형’이다.** 첨부 모드팩 HUD의 **자원 바 중심 계층, 작은 스탯 띠, 장비 슬롯, 최소한의 배경**을 기본 문법으로 삼고, Tullius의 원값·상한·정확한 계산을 필요할 때 명확히 드러내는 방향이 가장 설득력 있다.

사용자의 “인기 있는 유형을 보고 배워야 한다”는 의견에 동의한다. 특히 첨부 이미지에서 배울 점은 개별 아이콘의 모양보다 **정보를 중요도에 따라 서로 다른 크기와 형식으로 배치한 방식**이다.

기존 [기능 경쟁 분석](</home/kdw73/Tullius Widgets/docs/plans/2026-10-10-stb-widgets-competitive-research.ko.md>)을 읽고, 이번 보고서는 시각 디자인과 구성에 집중했다. 파일은 수정하지 않았다.

> **자료 기준:** 모든 외부 링크의 확인일은 **2026-10-10**이다. 댓글에는 작성일을 별도로 표시했다. 저자 설명·설정 문서는 확인 사실, 선호 패턴과 Tullius 진단은 해석, 아래 디자인 수치는 제안이다. 외부 이미지 원본의 세부 픽셀·알파값·폰트 크기를 계측하지 않았으므로 임의의 실측값을 붙이지 않았다. 첨부 이미지 세 장은 직접 관찰했다.

## 1. 인기 HUD·위젯·테마 조사

### 인기 지표의 해석

아래 엔도스는 Nexus 검색에 노출된 **Top Lists의 반올림된 표시값**이다. 검색 캐시의 시점이 서로 달라 정확한 당일 수치나 순위로 취급하면 안 된다. 다운로드 수는 열람 결과에서 대부분 `--`로 표시되어 확인하지 못했다.

| 모드 | 확인 가능한 엔도스 표시값 | 지표 출처 |
|---|---:|---|
| SkyHUD | 약 67.3k | [Nexus 목록](https://www.nexusmods.com/skyrimspecialedition/mods/topalltime?adult=0&cat=0&offset=68) |
| TrueHUD | 약 61.8k | [Nexus 목록](https://www.nexusmods.com/skyrimspecialedition/mods/topalltime?adult=0&cat=0&offset=78) |
| A Matter of Time | 약 50.8k | [Nexus 목록](https://www.nexusmods.com/skyrimspecialedition/mods/topalltime?adult=0&cat=0&offset=93) |
| moreHUD / Immersive HUD | 약 48.4k / 44.6k | [Nexus 목록](https://www.nexusmods.com/skyrimspecialedition/mods/topalltime?adult=0&cat=0&offset=99) |
| Nordic UI / iWant Widgets | 약 24.6k / 18.8k | [Nexus 목록](https://www.nexusmods.com/skyrimspecialedition/mods/top?offset=1120) |
| Untarnished UI | 약 7.4k | [Nexus 목록](https://www.nexusmods.com/skyrimspecialedition/mods/top?offset=2018) |
| STB Widgets | 약 7.2k | [Nexus 목록](https://www.nexusmods.com/skyrimspecialedition/mods/top?offset=22) |
| Dragonborn Reskin — TrueHUD / STB | 약 5.7k / 5.2k | [TrueHUD 목록](https://www.nexusmods.com/skyrimspecialedition/mods/top?offset=112), [STB 목록](https://www.nexusmods.com/skyrimspecialedition/mods/top?offset=204) |
| Vel’dun UI / Skyrim Party Sheet | 약 1.5k / 1.4k | [Vel’dun 목록](https://www.nexusmods.com/skyrimspecialedition/mods/top?offset=1493), [Party Sheet 목록](https://www.nexusmods.com/skyrimspecialedition/mods/top?offset=1723) |
| Mizuna Reskin — STB | 39 | [Nexus 목록](https://www.nexusmods.com/skyrimspecialedition/mods/topalltime?adult=0&cat=0&offset=57180) |

**해석:** 장기간 배포된 기반 모드의 엔도스에는 기능·의존성·배포 기간도 영향을 준다. 이 수치만으로 “왼쪽 아래를 선호하는 사람이 몇 %” 또는 “로어 스타일이 현대 스타일보다 인기”라고 결론낼 수는 없다. Mizuna는 인기 상위 사례보다는 **단색 리스킨 사례**로 보는 것이 정확하다.

### HUD와 장비·동료 구성

정확한 폰트명은 명시된 경우만 적었다. 나머지는 스킨·폰트 교체에 따라 달라지는 것으로 처리했다.

| 모드·레퍼런스 | 시각 디자인 언어 | 밀도·배치·등장 방식 |
|---|---|---|
| **[STB Widgets](https://www.nexusmods.com/skyrimspecialedition/mods/136148)** · [갤러리](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=images) | 아이콘과 숫자, 장비 정보를 모듈별로 제공하는 구조. 첨부 **TKL Edit**에서는 저항 아이콘 띠·작은 생활 정보 줄·그림이 중심인 장비 슬롯으로 압축되어 있다. 이 크롭을 STB 순정 디자인으로 일반화해서는 안 된다. | 첨부 구성은 왼쪽 아래에 높은 밀도로 모였지만 자원 바보다 보조 정보가 작다. 순정과 커스텀 SWF·INI의 배치 및 등장 설정은 구분해야 한다. |
| **[Mizuna STB](https://www.nexusmods.com/skyrimspecialedition/mods/138089)** | 저자가 **단색으로 다른 UI와 어울리는 것**을 목표로 설명한다. 여러 정보·장비 영역을 리스킨하고 XP·외침은 원본을 유지한다. 정확한 글꼴·배경 알파·전환 시간은 미확인. | 기존 위젯 동작을 유지하는 외형 변경. Tullius에는 “색을 줄여 테마와 충돌을 줄이는 방법”이 참고점이다. |
| **[Dragonborn STB](https://www.nexusmods.com/skyrimspecialedition/mods/140283)** · [배치 예시](https://staticdelivery.nexusmods.com/mods/1704/images/140283/140283-1770389578-1283904742.jpg) | 손그림 계열 아이콘, 선화·컬러 장비 표현, 흰색·금색 변형. 질감과 불규칙한 선이 정체성을 만든다. | 작은 스탯 기호와 장비 그림의 역할을 구분한다. 애니메이션의 정확한 길이는 미확인. |
| **[TrueHUD](https://www.nexusmods.com/skyrimspecialedition/mods/62775)** · [갤러리](https://www.nexusmods.com/skyrimspecialedition/mods/62775?tab=images) | **바가 주인공**인 디자인. 체력·마력·지구력 색, 대상·보스·플레이어의 서로 다른 계층, 피해 잔상과 자원 변화 표현. 세부 테두리·글꼴은 스킨에 따라 달라진다. | 플레이어 바, 화면 속 대상 바, 보스 바의 위치·크기가 역할에 맞게 다르다. 상시·전투·자원 변경에 따른 표시와 바 애니메이션을 지원한다. |
| **[Dragonborn TrueHUD](https://www.nexusmods.com/skyrimspecialedition/mods/152796)** · [스타일 예시](https://www.nexusmods.com/skyrimspecialedition/images/282893) | 세 가지 바 디자인, 다섯 색 프리셋, 분절 표현, 외침 기호 변형. 바 위 숫자를 플레이어·보스·적별로 선택할 수 있다. | 저자는 전술적 가독성을 목표로 명시한다. 피해·생존 페널티를 바 안에서 읽게 하고 보스 배치도 재설계한다. |
| **[SkyHUD](https://www.nexusmods.com/skyrimspecialedition/mods/463)** | 바닐라 요소의 크기·위치·형식을 조정하는 기반. 가는 나침반, 점 조준점, 왼쪽 정렬 자원 바 등. 전체 카드 패널을 추가하는 방식보다 기존 HUD를 재구성하는 성격이 강하다. | 배치와 크기 조정이 핵심. 자동 숨김은 사용하는 버전·테마·iHUD 조합을 함께 봐야 한다. |
| **[Skyrim Party Sheet](https://www.nexusmods.com/skyrimspecialedition/mods/167538)** · [갤러리](https://www.nexusmods.com/skyrimspecialedition/mods/167538?tab=images) | 첨부 이미지에서는 **얼굴 → 체력 → 이름 → 레벨·상태 배지** 순으로 읽힌다. 사진형 초상화, 원형 또는 Halo 계열 표현, 좁은 이름·체력 영역. | 동료별 반복 단위가 분명한 세로 스택. 게시판에는 유휴 상태에서 초상화가 축소되는 동작과 이를 설정하는 방법이 확인된다. |
| **[HUD NG](https://www.nexusmods.com/skyrimspecialedition/mods/191835)** | **독립적인 스킨이 아니라 배치 편집기**다. 기존 HUD의 그림·폰트·질감을 유지한다. 격자와 가이드는 편집용이다. | 이동·크기·불투명도·표시 조건·페이드 등을 조정한다. 따라서 자유 배치 자체만으로 Tullius의 시각적 차별성이 완성되지는 않는다. |
| **[Immersive HUD](https://www.nexusmods.com/skyrimspecialedition/mods/12440)** | 기존 HUD의 외형을 유지하면서 보이는 시간을 줄인다. 디자인의 핵심은 장식보다 **화면에 남는 정보의 양**이다. | 자원이 가득 찼을 때 빠르게 숨기기, 필요한 상황의 조준점 표시, 나침반·조준점 투명도 조정 등이 명시되어 있다. |

### UI 테마

| 테마 | 시각 언어와 숫자·색 표현 | 배치에서 배울 점 |
|---|---|---|
| **[Vel’dun UI](https://www.nexusmods.com/skyrimspecialedition/mods/176230)** · [쇼케이스](https://staticdelivery.nexusmods.com/mods/1704/images/176230/176230-1775053317-1825867005.png) | 저자가 Morrowind·Dunmer 왕실 미감을 명시한다. TrueHUD·STB·moreHUD 등을 함께 리스킨해 **전체 화면의 일관성**을 만든다. 정확한 HUD 폰트명·알파값은 미확인. | 지원 위젯을 동일한 시각 체계로 묶는 접근. 개별 위젯의 완성도와 주변 UI와의 통일감을 함께 봐야 한다. |
| **[Untarnished UI](https://www.nexusmods.com/skyrimspecialedition/mods/75188)** · [HUD＋Elden Equip 예시](https://staticdelivery.nexusmods.com/mods/1704/images/75188/75188-1672415737-621950179.png) | 저자가 Elden Ring에서 영감을 받은 **깨끗하고 평평한** UI로 설명한다. TrueHUD 스킨도 포함한다. 숫자 없는 바를 원하는 사용자 반응도 있다. | 자원 바와 장비의 형식을 구분하고, 숫자 밀도를 취향에 맞게 조절한다. 사용자 MO2의 “Untarnished UI - TrueHUD” 명칭은 설치 구성 정보로 받아들였다. |
| **[Dragonborn UI](https://www.nexusmods.com/skyrimspecialedition/mods/163074)** | 저자가 불필요한 프레임·구분선 제거, 의도적인 투명도, 손그림, 용 문양의 절제, 용도에 따른 서로 다른 형태를 명시한다. 일부 아이콘은 흑백 옵션도 있다. | 기본 자원 바는 아래 중앙, 대안은 왼쪽 아래다. **두 앵커 모두 실제 제공되는 선택지**다. [HUD 설정 문서, 2025-11-14](https://www.nexusmods.com/skyrimspecialedition/articles/11096) |
| **[Nordic UI](https://www.nexusmods.com/skyrimspecialedition/mods/49881)** · [갤러리](https://www.nexusmods.com/skyrimspecialedition/mods/49881?tab=images) | 북유럽 문양과 Skyrim에 맞춘 전체 UI 통일이 중심. **Sovngarde 폰트**를 기준으로 설계했다고 명시한다. 특정 폰트를 사용하는 SWF 테마가 Prisma의 HTML 글꼴에도 자동 적용되는 것은 아니다. | 본체와 TrueHUD 조합의 구성을 함께 봐야 한다. [TrueHUD용 대체 SkyHUD 프리셋](https://www.nexusmods.com/skyrimspecialedition/mods/67541)은 왼쪽 위로 정보를 모으는 사례다. |

### 상황별 위젯과 시계

| 모드 | 시각 언어 | 밀도·배치·등장 방식 |
|---|---|---|
| **[iWant Widgets](https://www.nexusmods.com/skyrimspecialedition/mods/36457)** | 글자·이미지·미터 등을 표시하는 **프레임워크**다. 하나의 고정된 글꼴·배경·앵커·미감으로 분류할 수 없다. | 이를 사용하는 개별 위젯과 테마를 조사해야 실제 HUD 디자인이 드러난다. |
| **[iWant Themes](https://www.nexusmods.com/skyrimspecialedition/mods/171718)** | 지역·Simplicity·Snow 등 여러 테마, 그라디언트·알파·페이드와 개별 기호·바의 예외 설정. | 같은 기능을 여러 스타일로 일관되게 바꾸는 접근. 특정 테마를 전체 사용자 선호로 일반화할 근거는 없다. |
| **[Interesting Casting Bar](https://www.nexusmods.com/skyrimspecialedition/mods/106558)** | 주문은 룬, 활은 화살, 외침은 Thu’um 표현으로 **행위별 모양을 달리한다**. 일반적인 색 막대보다 의미가 강하다. | 시전·당김·외침 진행 시 나타나는 상황형 정보. 진행 표현과 위치를 설정할 수 있으나 정확한 전환 시간은 미확인. |
| **[Oxygen Meter 2](https://www.nexusmods.com/skyrimspecialedition/mods/64532)** | 바닐라 계열 산소 바. 이동·크기·회전·색 설정, 낮은 산소에서 점멸. [폐 모양 변형](https://www.nexusmods.com/skyrimspecialedition/mods/171910)도 존재한다. | **물속에서 필요할 때 등장**한다. 저산소 경고가 장식보다 우선한다. |
| **[moreHUD](https://www.nexusmods.com/skyrimspecialedition/mods/12688)** | 조준 대상 주변에 텍스트와 작은 기호를 추가하는 방식. 대상 레벨·물건 정보 등이며 세부 미감은 리스킨에 따라 달라진다. | 정보가 대상과 연결된다. 무게도 물건을 집을 수 있는 상황에 표시하는 설정이 있어 상시 패널을 줄일 수 있다. |
| **[A Matter of Time](https://www.nexusmods.com/skyrimspecialedition/mods/12937)** | 문자 시계와 날짜, SkyDial·천문 관측기 계열 기호를 선택한다. 게임·현실 시계를 별도로 제공한다. | 위치·크기·투명도와 상시·단축키·주기적 표시를 설정한다. **현실 시계는 Tullius만의 독점 기능이 아니다.** |

iWant Themes, HUD NG, Interesting Casting Bar, Oxygen Meter 2, Dragonborn UI의 신뢰할 만한 인기 수치는 이번 열람에서 확인하지 못했다.

### 실제 사용자 반응

짧은 원문을 인용하고, 무엇을 입증하는지 구분했다. 개별 댓글은 **사용자의 요구가 실제로 존재한다는 증거**이며 대표성 있는 여론조사는 아니다.

| 대상 | 실제 반응·작성일 | 디자인상 시사점 |
|---|---|---|
| **STB** | Saturnal69가 시계에 대해 “More layout/style options for the clock would be great too.” — **2026-09-19**. Mailer99는 “wouldn't hijack my HUD layout”을 희망 — **2026-09-27**. 후속 댓글은 TrueHUD 프리셋 설치가 선택 사항이라고 설명한다. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts) | 스타일 선택과 기존 배치를 존중하는 설치 경험이 중요하다. 강제 변경이 항상 발생한다는 뜻은 아니다. |
| **Dragonborn STB** | herbivoor: “by far my favorite UI skin” — **2026-08-16**. 장비 이름 숨김을 요청했다. Aelarr는 색 통일 요청에 “For consistency, if nothing else.” — **2026-07-20**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/140283?tab=posts) | 일관된 색 체계와 장비 텍스트의 선택적 표시를 원한다. |
| **TrueHUD** | Maplesyrupjedi: “How in the world do you REMOVE the special bar?” — **2026-09-23**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/62775?tab=posts) | 필요하지 않은 추가 바가 거슬릴 수 있다. 개별 사용자의 구성 문제를 보편적 결함으로 일반화하지 않는다. |
| **Dragonborn TrueHUD** | FARZYTTTT4: “its so clean” — **2026-08-03**. 별도 스타일 이미지에서는 congusdongus가 “the hard cutoffs are noticeable imo”라며 바 끝 처리 개선을 요청 — **2025-09-12**. [게시판](https://www.nexusmods.com/skyrimspecialedition/mods/152796?tab=posts), [이미지 댓글](https://www.nexusmods.com/skyrimspecialedition/images/282893) | 깔끔함과 함께 끝단·잔상·프레임의 작은 마감도 평가 대상이다. |
| **SkyHUD** | mrmaynard13: “message text to be aligned to the centre” — **2026-08-01**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/463?tab=posts) | 글자 정렬도 취향·화면비와 연결된다. |
| **Party Sheet** | LordDawnWeaver: “reminds me of Dragon Age Origins” — **2026-09-30**. WoW처럼 소환수 초상화를 작게 분리하는 구성을 요청했다. SkyPatcherFan: “The drag drop widget placement is INSANE.” — **2026-10-01**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/167538?tab=posts) | 파티 RPG·MMO 문법을 원하는 사용자가 존재한다. 같은 댓글군에는 XP를 백분율 대신 절대값으로 표시해 달라는 요구도 있다. |
| **Vel’dun** | JPSteel2: “Superbly done, artstyle is on point!” — **2026-04-01**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/176230?tab=posts) | 고유한 세계관 미감 자체가 호평 대상이다. |
| **Untarnished** | Fami07: “How do i disable the numbers in the stamina/health/magicka bars?” — **2026-07-24**. scoffye: “The font is very small.” — **2026-08-12**, 책·스크롤 등 메뉴 글꼴에 관한 불평. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/75188?tab=posts) | 숫자 밀도 선택과 가독성 조절이 필요하다. 메뉴 글꼴 불평을 HUD 전체의 문제로 확대하지 않는다. |
| **Dragonborn UI** | JohnTheJohner: “It's lovely, uncluttered” — **2026-04-09**. trampek: “there is no difference between some buffs” — **2026-09-25**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/163074?tab=posts) | 손그림·절제된 구성이 호평받지만 비슷한 기호로 여러 효과를 표현하면 식별성이 떨어진다. |
| **Nordic UI** | Frostsoul626: “the subtitle text is too darn small.” — **2026-04-30**. vengel은 다른 UI들의 미감에 “nothing in style of skyrim”이라고 불평 — **2026-05-23**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/49881?tab=posts) | 크기 조절과 Skyrim에 어울리는 스타일을 요구하는 사용자도 있다. |
| **HUD NG** | darchitechtlp: “a UI layout that actually looks good in widescreen” — **2026-10-01**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/191835?tab=posts) | 배치·화면비 대응은 외형 완성도의 일부다. |
| **iWant Themes** | gamerpk2: “and instant too” — **2026-02-08**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/171718?tab=posts) | 테마 적용 경험에 대한 호평이다. 특정 테마의 시각적 우수성을 입증하는 평가는 아니다. |
| **moreHUD 조합** | RYOmk913: “part of it gets cut off.” — **2026-08-28**. 이후 BTPS의 2D 위젯 크기 조정으로 해결했다고 보고했다. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/12688?tab=posts) | 긴 설명의 크기·화면 경계 처리가 중요하다. moreHUD 자체 결함의 증거로 사용하지 않는다. |
| **A Matter of Time** | hudauphong: “Why there 2 times on widgets ?” — **2026-07-14**. [출처](https://www.nexusmods.com/skyrimspecialedition/mods/12937?tab=posts) | 게임 시계와 현실 시계를 이름·기호로 명확히 구분할 필요가 있다. |

**디자인 평가를 확인하지 못한 항목:** [Mizuna](https://www.nexusmods.com/skyrimspecialedition/mods/138089?tab=posts)와 [Interesting Casting Bar](https://www.nexusmods.com/skyrimspecialedition/mods/106558?tab=posts)는 게시판 열람에 실패했다. [Oxygen Meter 2](https://www.nexusmods.com/skyrimspecialedition/mods/64532?tab=posts)의 확인한 댓글은 호환성 논의가 중심이었다. iWant Widgets와 iHUD의 독립적인 디자인 평가 인용도 확보하지 못했다. 저자 설명을 사용자 칭찬으로 바꾸어 인용하지 않았다.

## 2. 공통 디자인 원칙

아래는 자료에서 도출한 **설계 해석**이다. 하나의 스타일이 모든 Skyrim 사용자에게 우세하다는 결론은 아니다.

| 원칙 | 근거 | Tullius에 적용할 의미 |
|---|---|---|
| **정보마다 형식과 크기를 다르게 준다** | TrueHUD의 자원·대상·보스 계층, Party Sheet의 초상화, Dragonborn UI의 용도별 형태 | 장비는 슬롯, 저항은 띠, XP는 진행 바, 시계는 짧은 글자로 표현한다. |
| **배경은 정보 묶음을 돕는 정도로 사용한다** | Dragonborn UI의 프레임 제거 의도, Untarnished의 평평한 미감, 첨부 모드팩의 작은 보조 정보 | 항목마다 큰 카드를 반복하기보다 글자 대비와 선택적인 작은 배경을 사용한다. |
| **자원 바 주위에 전투 정보를 모은다** | 첨부 모드팩, SkyHUD 왼쪽 정렬, Dragonborn의 아래 중앙·왼쪽 아래 프리셋 | 익숙한 자원 바 앵커를 출발점으로 삼는다. **왼쪽 아래를 바닐라의 유일한 원래 위치로 부르면 부정확하다.** |
| **표시하는 시간도 디자인이다** | iHUD, 산소 바, 시전 바, moreHUD의 대상 상황, A Matter of Time의 표시 모드 | 항상 필요한 정보·전투 정보·변경 알림을 따로 다룬다. |
| **색은 상태와 역할을 설명한다** | 자원 색, 저산소 경고, TrueHUD의 대상 구분, Dragonborn의 색 프리셋 | 모든 아이콘의 상시 발광보다 위험·상한·변경을 구별하는 색이 가치 있다. |
| **읽기 편한 크기와 세밀한 마감이 필요하다** | Nordic·Untarnished의 작은 글꼴 불평, Dragonborn 바 끝단 개선 요청 | 작은 숫자까지 실제 게임 거리에서 확인한다. 얇은 그림자·외곽선은 이를 위한 구현 수단이지 선호 조사로 입증된 장식은 아니다. |
| **통일감과 식별성을 함께 지킨다** | Vel’dun·Dragonborn의 호평, 구분하기 어려운 버프 기호에 대한 불평 | 주변 테마와 어울리면서 화염·냉기·독 등의 실루엣은 구분되어야 한다. |
| **선택권도 완성도다** | 숫자 숨김, 색 통일, 장비 이름 숨김, 초상화 분리·배치 요구 | 기본값은 잘 정돈하고, 숫자·원값·레이블·이름·위치는 항목별로 조절한다. |

미감은 최소한 세 갈래로 보인다.

- **바닐라·로어 친화:** Nordic, Vel’dun, Dragonborn의 손그림·문양.
- **Souls 계열의 절제된 현대 미감:** Untarnished 및 장비 슬롯 조합.
- **파티 RPG·MMO형:** Party Sheet의 초상화·Halo·분리된 소환수 정보 요구.

이들의 **사용자 비율은 확인할 수 없다.** 다만 서로 다른 미감에서도 가독성, 통일감, 표시량 조절에 대한 요구가 반복된다.

## 3. 현재 Tullius 디자인 진단

### 첨부 이미지에서 보이는 차이

| 이미지 | 먼저 읽히는 정보 | 구성상의 특징 |
|---|---|---|
| **모드팩 왼쪽 아래** | 초상화·자원 바 → 장비 → 작은 스탯 | 주 정보와 보조 정보의 크기 차이가 크다. 장비는 그림과 슬롯으로 읽힌다. |
| **Party Sheet** | 동료 얼굴 → 체력 → 이름 → 배지 | 반복 단위는 같지만 내부 계층이 분명하다. |
| **현재 Tullius** | 큰 카드들의 숫자와 프레임 | XP·골드·시계·저항·공격·장비가 비슷한 카드 문법을 공유한다. 중요도 차이가 약하다. |

모드팩 구성 모드의 귀속은 사용자가 제공한 MO2 확인 내용을 기준으로 했다. 자원 바·초상화까지 STB 디자인으로 묶지 않았다. 전체 화면이 없는 크롭이므로 실제 게임 화면 점유율의 직접 비교는 하지 않았다.

### 코드와 연결한 문제점

| 항목 | 확인한 구현 | 디자인 진단 |
|---|---|---|
| **기본 배치와 크기** | 실제 항목 기본 좌표는 1920×1080 기준 오른쪽 위 그리드다. 4K에서는 좌표·크기가 대략 2배로 확대된다. [widgetItemRegistry.ts](</home/kdw73/Tullius Widgets/view/src/data/widgetItemRegistry.ts:55>) · [해상도 변환](</home/kdw73/Tullius Widgets/view/src/data/widgetItemRegistry.ts:590>) | 해상도 대응은 이미 있다. 문제는 기본 그리드의 면적이다. 코드 치수로 추정하면 4K에서 일반 숫자 카드 폭 약 260px, XP 약 700px가 되어 첨부처럼 큰 덩어리가 된다. |
| **배경의 반복** | 각 항목에 짙은 그라디언트, 테두리, 패딩, 그림자, `backdrop-filter: blur(4px)`가 적용된다. [EditableWidgetItem.tsx](</home/kdw73/Tullius Widgets/view/src/components/EditableWidgetItem.tsx:283>) | 작은 숫자 하나도 독립 패널처럼 보인다. 시선이 숫자보다 반복되는 카드 경계에 분산된다. |
| **이중 장식** | 아이콘에도 어두운 프레임·절단 모서리·밑줄·발광 필터가 있다. [hud-widgets.css](</home/kdw73/Tullius Widgets/view/src/assets/hud-widgets.css:44>) | 카드와 아이콘 프레임이 동시에 정보를 둘러싼다. `transparentBg`로 외부 배경을 없애도 내부 프레임은 남는다. |
| **여백·숫자 열** | 숫자형 최소 폭 112/108px, 글자형 190px. 저항에는 별도 108px 폭이 있다. [hud-widgets.css](</home/kdw73/Tullius Widgets/view/src/assets/hud-widgets.css:24>) | 긴 이름과 짧은 `0%`가 모두 넓은 영역을 얻는다. 항목별 자유 배치의 장점이 기본값에서는 큰 정형 그리드로 나타난다. |
| **정보 계층** | 저항의 유효값과 원값을 함께 표시하고, 동일한 값도 보조값으로 표시한다. XP는 다이아몬드 레벨과 ‘레벨’ 문구를 반복한다. [HudWidgetItems.tsx](</home/kdw73/Tullius Widgets/view/src/components/HudWidgetItems.tsx:82>) · [ExperienceWidget.tsx](</home/kdw73/Tullius Widgets/view/src/components/ExperienceWidget.tsx:44>) | `0% / 원본 0%`와 중복 레벨이 시각적 비용을 만든다. **차이가 생기는 순간에는 크게, 같을 때는 간결하게** 표현할 여지가 있다. |
| **타이포그래피** | 표준 숫자 정렬은 이미 `tabular-nums`를 사용한다. 기본 글꼴은 Segoe UI 계열, 한국어는 폴백, XP 레벨은 Georgia다. 저항 주값 16px·원값 8px. [CSS](</home/kdw73/Tullius Widgets/view/src/assets/hud-widgets.css:15>) · [fontPresets.ts](</home/kdw73/Tullius Widgets/view/src/utils/fontPresets.ts:19>) | 숫자 정렬은 유지할 장점이다. 원값의 작은 크기와 서로 다른 글꼴의 결합은 재조정이 필요하다. 이름이 ‘classic’인 프리셋도 Skyrim 폰트와 동일한 것은 아니다. |
| **색·불투명도** | 기본 전체 불투명도 70%. 아이콘은 속성색, 장비 손은 빨강·파랑, 상한·음수에는 별도 색을 사용한다. [defaultSettings.ts](</home/kdw73/Tullius Widgets/view/src/data/defaultSettings.ts:4>) · [장비 표시](</home/kdw73/Tullius Widgets/view/src/components/HudWidgetItems.tsx:603>) | 글자도 배경과 함께 옅어진다. 색이 속성·손 구분·경고·상한을 동시에 맡아 의미가 많다. **배경 투명도와 글자 불투명도를 분리**하는 편이 낫다. |
| **장비 표현** | 현재 장비는 일반 `StatWidget` 안의 손 기호와 이름이다. 데이터는 양손 이름과 외침 종류를 제공한다. [stats.ts](</home/kdw73/Tullius Widgets/view/src/types/stats.ts:23>) | STB 슬롯의 ‘어떤 장비인지 그림으로 읽는 경험’과 차이가 있다. 실제 장비 실루엣을 선택하려면 장비 분류 데이터가 추가로 필요하다. |
| **등장 정책** | 기본은 전투·변경 조건 없이 표시. 표시 조건은 HUD 전체에 적용된다. 현실 시계는 변경 서명에 매초 포함된다. [hudPresentation.ts](</home/kdw73/Tullius Widgets/view/src/utils/hudPresentation.ts:89>) · [App.tsx](</home/kdw73/Tullius Widgets/view/src/App.tsx:139>) | 현실 시계가 켜진 상태에서 ‘변경 시 표시’를 사용하면 전체 표시 창이 계속 갱신될 수 있다. 항목별 등장 정책은 CSS 변경만으로 해결되지 않는다. |

현재 구조의 좋은 기반은 **항목별 좌표·가시성·배율, 해상도 변환, 숫자 정렬, 원값과 상한 메타데이터**다. 이것을 유지하면서 표시 형식을 바꾸는 것이 적합하다.

또한 일반 플레이에서는 래퍼의 `pointerEvents`가 꺼져 있다. 따라서 원값·상한을 **마우스 호버 툴팁에만 맡기는 설계는 부적합**하다. 화면 표시 옵션이나 상세 표시 키가 필요하다. [근거 코드](</home/kdw73/Tullius Widgets/view/src/components/EditableWidgetItem.tsx:328>)

## 4. 디자인 방향 세 가지

**아래 수치와 색·애니메이션은 모두 제안값**이다. 화면 픽셀 기준으로 1080p → 1440p → 4K를 약 **1 → 1.33 → 2배**로 잡았다. 항목 자유 배치를 유지하고, 프리셋은 권장 좌표를 제공한다.

### A. Tullius Compact — 자원 바 곁의 작은 계기와 장비 슬롯

**컨셉:** “전투에 필요한 수치를 익숙한 자원 바 주위에서 짧게 읽는다.”

레퍼런스: 첨부 TKL Edit 조합, [Untarnished HUD](https://staticdelivery.nexusmods.com/mods/1704/images/75188/75188-1672415737-621950179.png), [Dragonborn STB](https://www.nexusmods.com/skyrimspecialedition/mods/140283).

| 요소 | 구체 스펙 |
|---|---|
| **기본 배치** | 왼쪽 아래. 화면 가장자리 여백 **24 / 32 / 48px**. 자원 바와 장비까지 고려한 권장 묶음 영역 **480×160 / 640×213 / 960×320px**. 기존 TrueHUD 바 위치에 맞춘 프리셋 제공. |
| **배경·테두리** | 스탯·생활 정보는 기본 배경 없음. 작은 검은 외곽선 또는 `0 1px 2px` 그림자. 장비 슬롯에만 검정 알파 **0.20–0.28**, 1px의 옅은 선. blur·아이콘 발광 없음. 글자는 불투명도 100%. |
| **글꼴·숫자** | 한국어 포함 한 글꼴로 통일, 우선 Noto Sans KR 계열. 주 숫자 **14 / 19 / 28px**, 보조 정보 **12 / 16 / 24px**. 주값 600, 레이블 400–500. 숫자는 고정 폭·오른쪽 정렬, `%`·단위는 조금 작게. |
| **아이콘·색** | 프레임 없는 **16 / 21 / 32px** 기호. 기본 글자 `#E6E2D7`, 보조 `#B9B5A9`. 화염 `#D17B62`, 냉기 `#8BB8CE`, 전기 `#C8BA65`, 마법 `#AC91C4`, 독 `#8FAC86`. 색은 작은 기호에 집중. 경고 `#D6A45C`, 위험 `#D66A62`. |
| **장비 슬롯** | R/L/Z 세 칸, 각 **42×58 / 56×77 / 84×116px**. 키 배지 위, 장비 실루엣 중앙, 피해·수량 아래. 이름은 교체 후 약 3초 또는 상시 표시 옵션. 긴 이름은 2줄까지. 실제 장비 분류를 받기 전에는 기존 손·외침 기호 사용. |
| **저항·스탯 띠** | 저항 6칸은 **330×30 / 440×40 / 660×60px** 내외. 방어·공격은 별도 얇은 줄. 기본은 유효값, **원값이 다르면 작은 보조값을 상시 표시**, 상한 도달은 작은 끝단 표식. ‘원값 항상 표시’ 선택은 유지. |
| **XP·시계** | XP는 작은 레벨 배지 하나＋가는 바. 생활 줄은 골드·무게·`게임 14:24`·`현실 12:59`처럼 축약. 전체 날짜·초는 상세 표시에서 제공하고 상시 표시 선택도 유지. |
| **등장·애니메이션** | 전투 띠는 전투·장비 변경 때 표시, 종료 후 약 4초 유지. 위험 상태는 유지. 골드·무게는 변경 시 강조, 현실 시계는 독립 표시. 등장 120ms·퇴장 180ms, 바 변화 150ms, 변경 강조는 1회만. 시계 갱신은 전투 HUD 표시 시간을 연장하지 않음. |

**STB 사용자에게:** 배치와 정보 읽는 순서가 익숙하고, 원값·상한 차이를 작은 공간에서도 확인할 수 있다. 대신 축약된 기본 화면에서는 전체 날짜와 장비 이름을 계속 보고 싶은 사용자가 표시 옵션을 조절해야 한다.

**구현 난이도: 중간.** 기존 래퍼에 배경 없는 변형을 추가하고 저항·장비 전용 표현과 항목별 표시 정책을 만든다. 실제 장비 실루엣 자동 선택까지 포함하면 SKSE 데이터 확장으로 난이도가 올라간다.

**Prisma 적합성: 높음.** 작은 정적 SVG, 짧은 opacity 전환, 필요한 영역만 갱신하는 구성이다.

### B. Tullius Relic — 노르드 문양과 손그림 계기

**컨셉:** “캐릭터의 장비와 능력을 Skyrim 세계 안의 문양처럼 표현한다.”

레퍼런스: [Nordic UI](https://www.nexusmods.com/skyrimspecialedition/mods/49881), [Dragonborn UI](https://www.nexusmods.com/skyrimspecialedition/mods/163074), [Vel’dun UI](https://www.nexusmods.com/skyrimspecialedition/mods/176230).

| 요소 | 구체 스펙 |
|---|---|
| **기본 배치** | 아래 중앙, 자원 바 위. 본체 **420×130 / 560×173 / 840×260px**. 화면 아래에서 **110 / 147 / 220px** 띄워 기존 자원 바 공간을 확보. 왼쪽 아래 대안 프리셋도 제공. |
| **배경·테두리** | 전체 외곽 카드 대신 양 끝의 작은 매듭 문양·짧은 선. 필요 시 묶음 뒤 검정 알파 **0.18–0.24**. 질감은 작은 정적 이미지 하나로 제한. blur·광택·발광 없음. |
| **글꼴·숫자** | 한국어 본문은 Sans **14 / 19 / 28px**. 숫자는 **18 / 24 / 36px**, 500–600, 고정 폭. 레벨에만 serif 또는 문양용 글꼴을 제한적으로 사용. 한글 폴백과 숫자 폭은 실제 폰트로 확인. |
| **아이콘·색** | 손그림 SVG **20 / 27 / 40px**. 획과 실루엣을 통일하되 속성별 형태는 구분. 기본 `#DDD6C3`, 금속 강조 `#BCA56D`, 보조 `#AAA494`, 위험 `#BB6157`. 속성색은 작고 낮은 채도로 사용. |
| **장비 슬롯** | 세 개의 문양형 받침, 각 **52×52 / 69×69 / 104×104px**. 장비 기호가 주인공. 이름은 교체 시 아래에 한 줄, 피해는 작은 숫자. 빈 슬롯도 자리를 유지해 레이아웃이 흔들리지 않게 함. |
| **저항·스탯 띠** | 기호＋숫자 묶음을 짧은 구분점으로 연결. 상한은 외곽의 짧은 추가 획으로 표시. 상세 표시에서는 아래에 `유효값 / 원값 / 상한`을 펼침. 원값 차이는 기본 화면에서도 표시 가능. |
| **XP·시계** | 레벨 배지 하나와 짧은 진행 선. 게임 시계는 작은 해·달 기호＋시각, 현실 시계는 별도 `현실` 표기. 긴 날짜는 상세 화면 또는 사용자 선택. |
| **등장·애니메이션** | 기본 전투 정보는 전투·변경 시, 상세 정보는 표시 키로 펼침. 등장 160ms·퇴장 220ms. 문양 회전·지속적인 반짝임은 사용하지 않고 색 또는 선의 1회 변화로 알림. |

**STB 사용자에게:** Dragonborn·Nordic·Vel’dun 계열에 자연스럽게 어울리고 Tullius의 고유한 얼굴을 만들 수 있다. 대신 장식과 룬이 지나치면 속성 식별이 느려질 수 있고, Untarnished의 평평한 UI와는 결이 달라진다.

**구현 난이도: 중간~높음.** 레이아웃 외에 일관된 손그림 기호·문양·폰트 검증이 필요하다. 기존 Lucide의 획만 바꾸는 수준으로는 완성도가 나오기 어렵다.

**Prisma 적합성: 높음, 자산 구성에 좌우됨.** 정적 SVG·작은 질감은 적합하다. 복잡한 필터와 계속 움직이는 문양은 제외한다.

### C. Tullius Tactical — 오른쪽 위의 간결한 전술 패널

**컨셉:** “많은 수치와 계산 차이를 고정된 열에서 빠르게 비교한다.”

레퍼런스: [TrueHUD](https://www.nexusmods.com/skyrimspecialedition/mods/62775)의 역할 구분, [iWant Themes](https://www.nexusmods.com/skyrimspecialedition/mods/171718)의 스타일 선택, [Party Sheet](https://www.nexusmods.com/skyrimspecialedition/mods/167538)의 반복 단위와 배지.

| 요소 | 구체 스펙 |
|---|---|
| **기본 배치** | 오른쪽 위, 우측 여백 **24 / 32 / 48px**, 상단 **72 / 96 / 144px**. 본체 **300×240 / 400×320 / 600×480px**. 효과 목록은 왼쪽 옆에 분리해 나침반과 겹침을 피함. |
| **배경·테두리** | 묶음 뒤 단일 배경 `#11181C`, 알파 **0.25–0.32**. 항목 카드는 제거하고 구역 사이 짧은 1px 선만 사용. 자유 배치 시 공통 배경을 끌 수 있게 함. blur·큰 shadow 없음. |
| **글꼴·숫자** | 레이블 **12 / 16 / 24px**, 주요 숫자 **18 / 24 / 36px**. 400/600 두 굵기 중심. 숫자 열은 1080p 기준 약 70px, 오른쪽 정렬·고정 폭. |
| **아이콘·색** | 기호 **16 / 21 / 32px**. 기본 `#E5ECEF`, 보조 `#A7B3BA`, 강조 `#83A8B8`, 경고 `#D7AB62`, 위험 `#DB7168`. 속성색은 기호와 짧은 선에만 사용. |
| **장비 슬롯** | 하단에 가로 세 칸, 각 **78×46 / 104×61 / 156×92px**. 기호·키·피해 중심. 이름은 펼친 상태에서 표시. 장비 분류 데이터 확장은 A·B와 같은 조건. |
| **저항·스탯 띠** | 저항 2열×3행, 방어·공격은 다음 구역. `유효값`과 `원값/상한`의 열 위치를 맞춤. 상한·음수는 색＋작은 기호로 구분. |
| **XP·시계** | XP는 맨 위의 작은 진행 줄. 시계는 최하단에 게임·현실을 분리. 절대 XP와 원값을 많이 보고 싶은 사용자에게 상세 열을 상시 제공. |
| **등장·애니메이션** | 기본은 고정된 짧은 패널. 탐험 때 저항·공격 구역을 축소하거나 숨기는 선택 제공. 등장 120ms·퇴장 180ms. 수치는 즉시 갱신하고 변경된 행만 200ms 강조. 매초 바뀌는 시계는 강조하지 않음. |

**STB 사용자에게:** 많은 숫자와 계산 차이를 비교하기 쉽고, 현재 Tullius 사용자의 이동 부담도 작다. 대신 자원 바와 시선 거리가 멀고 정보 패널의 존재감이 커서 첨부 모드팩 취향에는 A보다 덜 맞는다.

**구현 난이도: 낮음~중간.** 현재 컴포넌트와 오른쪽 위 배치를 가장 많이 재사용한다. 공통 배경·열 정렬은 비교적 간단하지만 항목별 등장 정책은 별도 작업이다.

**Prisma 적합성: 높음.** 단순한 배경과 고정 열을 사용한다. 상세 정보가 많아도 매 프레임 전체를 다시 그리는 구현은 피해야 한다.

### 세 안의 비교

| 기준 | A — Compact | B — Relic | C — Tactical |
|---|---|---|---|
| 첨부 모드팩 취향과의 거리 | **가장 가까움** | 로어 테마 사용자에게 가까움 | 수치 중심 사용자에게 가까움 |
| 기본 화면의 존재감 | 낮음 | 낮음~중간 | 중간 |
| 원값·상한의 상시 비교 | 선택적으로 강함 | 상세 표시 중심 | **가장 강함** |
| 고유한 시각 정체성 | 배치·마감·읽기 경험 | **자산과 문양** | 숫자 체계·정보 비교 |
| 현재 구조 재사용 | 높음 | 중간 | **가장 높음** |
| 주요 비용 | 슬롯·표시 정책 | 아이콘·문양·폰트 | 열 정렬·표시 정책 |

Prisma 공식 문서는 현재 **CPU 렌더링, UI 갱신 60FPS 상한, WebGL·비디오 미지원**을 명시하고, 많은 그림자·필터·그라디언트·blur를 피하라고 안내한다. 세 안 모두 이 조건을 기준으로 설계했다. 현재 코드의 효과가 실제 FPS 저하를 일으킨다는 실측은 하지 않았다. [Prisma Limitations, 확인 2026-10-10](https://www.prismaui.dev/getting-started/limitations/)

## 5. 추천: A를 기본값으로, Tullius의 정확성을 시각적으로 드러낸다

**A — Tullius Compact를 추천한다.** 사용자가 제시한 모드팩과 읽는 순서가 가장 가깝고, 기존 TrueHUD·SkyHUD·테마와 조합하기 쉽다. 현재 코드의 항목별 배치와 해상도 대응을 활용하면서 카드 반복과 큰 기본 그리드를 줄일 수 있다.

Tullius의 우위는 다음 네 가지를 함께 제공할 때 명확해진다.

| 유지할 강점 | 추천하는 시각적 표현 |
|---|---|
| **항목별 자유 배치** | 띠와 슬롯은 권장 정렬일 뿐, 저항 하나·시계 하나도 개별 이동·숨김·배율 조절 가능. |
| **원값·상한 정보** | 유효값을 먼저 읽고, 차이가 있을 때 원값을 함께 표시. 상세 상태에서는 `유효 / 원값 / 상한`을 명시. ‘원값 항상 표시’도 유지. |
| **현실 시계** | `게임`과 `현실`을 명확히 구분. 시계의 갱신이 다른 전투 항목을 계속 등장시키지 않게 분리. |
| **정확한 계산** | 상한·음수·계산 차이를 색 하나에 맡기지 않고 기호와 숫자로 표시. 상한값은 기존 `calcMeta`를 사용하고 디자인 안에 고정하지 않음. [메타데이터](</home/kdw73/Tullius Widgets/view/src/types/stats.ts:80>) |

디자인 품질을 판단할 기준도 구체적으로 잡는 편이 좋다.

- **면적:** 1080p 기본 묶음의 권장 영역 480×160px 이내. 약 3.7%의 화면 경계 면적이라는 **설계 목표**이며, 실제 게임에서 검증해야 한다.
- **가독성:** 눈밭·밝은 하늘·어두운 던전에서 보조 숫자까지 읽히는지 확인.
- **식별성:** 아이콘만 보고 저항 종류를 구별하고, 원값 차이·상한 도달을 즉시 알아볼 수 있는지 확인.
- **마감:** 긴 한국어 장비명, 큰 숫자, 빈 슬롯, 장비 교체에서 정렬이 흔들리지 않는지 확인.
- **등장 정책:** 전투 종료 후 전투 정보가 사라지고, 현실 시계만 독립적으로 남는지 확인.

**기본 화면은 작은 계기처럼 정돈하고, 상세 상태에서는 계산 근거까지 읽히게 만드는 것**이 Tullius에 가장 적합하다. 인기 HUD의 익숙한 문법을 따르면서도, 정확한 수치를 자유롭게 배치하고 해석할 수 있는 경험으로 차별화할 수 있다.