# STB Widgets 경쟁 분석 (2026-10-10)

**Tullius는 항목별 배치, 현실 시계, 한국어 접근성에서 이미 강점이 있다. 하지만 장비 상세 정보·포효 재사용 대기시간·누적 플레이시간이 부족해, 현재 코드로는 STB 완전 대체를 선언하기 어렵다.** 가장 큰 전환 동기는 “필요한 정보가 빠짐없이 나오면서, 설정하기 쉽고 HUD가 안정적으로 유지되는 것”이다.

STB는 업데이트가 중단된 경쟁자가 아니다. **2026-09-02에 3.0을 배포했고, 2.9에서 Skyrim 1.7.99 대응을 명시했다.** 유지보수 중인 제품과 그 리스킨·HUD 편집 생태계를 경쟁 기준으로 삼아야 한다. [STB 공식 페이지](https://www.nexusmods.com/skyrimspecialedition/mods/136148)

모든 외부 자료의 **조회일은 2026-10-10**이다. 게시일·업데이트일은 확인되는 경우 별도로 적었다. 아래에서 **확인**은 공식 문서·공개 코드에서 확인한 사실, **사용자 보고**는 재현되지 않은 증언, **제안/추정**은 조사 결과를 바탕으로 한 판단이다. 저장소는 읽기만 했으며, 파일 수정이나 인게임 성능·호환성 시험은 수행하지 않았다.

## 1. STB Widgets 조사

### 1.1 기본 정보와 현재 상태

| 항목 | 확인 결과 | 출처·날짜 |
|---|---|---|
| 정확한 모드 | **STB Widgets, Nexus ID 136148** | [공식 페이지](https://www.nexusmods.com/skyrimspecialedition/mods/136148) |
| 제작자 | **STB team**, 업로더 `STBteam` | 같은 페이지 |
| 최초 공개 | **2024-12-16** | 같은 페이지 |
| 최신 배포 | **3.0 / 2026-09-02** | [Files](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=files) |
| 기본 의존성 | SKSE64, Address Library, **SKSE Menu Framework** | [Requirements](https://www.nexusmods.com/skyrimspecialedition/mods/136148) |
| UI 방식 | 게임 HUD는 SWF/Scaleform, 설정은 ImGui 계열 SKSE Menu Framework. Prisma UI 기반이 아님 | [공개 저장소](https://github.com/STB-Team/STB-Widgets-Nexus), [설정 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/ImGuiMenu.cpp) |
| 선택 의존성 | TrueHUD·SkyHUD는 해당 선택 프리셋을 설치할 때 필요 | [Requirements](https://www.nexusmods.com/skyrimspecialedition/mods/136148) |
| 소스·라이선스 | C++ 저장소 공개, GitHub에 **MIT** 표시. 최신 3.0 DLL과 공개 코드가 정확히 일치하는지는 미검증 | [저장소](https://github.com/STB-Team/STB-Widgets-Nexus), [제작자 조직](https://github.com/STB-Team) |
| 배포 자산 권한 | Nexus는 출처 표기 조건으로 수정·재배포·자산 사용 허용, 유료 판매용 사용 금지, Donation Points 허용으로 표시 | [Permissions](https://www.nexusmods.com/skyrimspecialedition/mods/136148) |
| 인기도 | 엔도스·고유 다운로드·총 다운로드는 페이지에서 공란/`--`로 반환되어 **숫자 확인 불가**. 조회 화면에는 Posts 716, Bugs 18이 표시됨 | [Posts](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), [Stats](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=stats) |

게시물·버그 건수는 다운로드 규모나 버그 발생률을 의미하지 않는다. 원본 STB의 권한과 **제삼자 리스킨의 권한도 별개**다. 예를 들어 Mizuna 리스킨은 자산 사용에 제작자 허가를 요구한다. [Mizuna Reskin 권한, 2025-01-04](https://www.nexusmods.com/skyrimspecialedition/mods/138089)

| 런타임 | 확인 수준 |
|---|---|
| **1.5.97 / SE** | 공식적으로 SE 지원. 최신 3.0의 1.5.97 실측 결과와 상세 지원표는 확보하지 못함 |
| **1.6.x / AE** | 공식 AE 지원. 1.1 변경로그에 **1.6.1170 미만 AE 지원 추가** 명시. 모든 패치 버전의 개별 검증표는 없음 |
| **1.7.99** | **2.9에서 대응을 명시** |
| **1.7.104 및 기타 1.7.x** | 1.7.104 사용자 실행·충돌 보고는 존재하지만, 전체 1.7.x 지원을 확정할 근거는 부족 |
| **VR** | 공식 VR 지원 명시나 검증된 VR 배포를 찾지 못함 |

출처: [공식 변경로그](https://www.nexusmods.com/skyrimspecialedition/mods/136148), [사용자 게시판—2026-08-30~09-02 및 10-09 보고](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts). **“1.7 미지원”이나 “개발 중단”으로 분류하면 부정확하다.**

### 1.2 주요 업데이트 이력

| 버전·배포일 | 경쟁 분석에 중요한 변화 |
|---|---|
| 0.9 — 2024-12-16 | 최초 공개 |
| 1.0~1.1 — 개별 배포일 미확인 | AE 범위 확대, 위젯별 전투/변경 표시, F11 숨김, FOMOD |
| 1.7~1.9 — 개별 배포일 미확인 | 별도 모드 **STB Active Effects** 연동 |
| 2.0~2.2 — 2.0 날짜 미확인; 2.1 2026-02-24, 2.2 2026-03-04 | SKSE Menu Framework로 전환. 거래 후 HUD 복구·설정 저장·직렬화 포인터 문제 수정 |
| 2.6 — 2026-07-08 | 지도 등으로 위젯이 사라지는 문제 수정, XP 숫자 숨김 추가 |
| 2.8 — 2026-08-02 | 제작 중 CTD, 두 번째 포효 단어, 모드 포션 관련 수정. 정적 위젯을 매 프레임 갱신에서 타이머 갱신으로 변경 |
| 2.9 — 2026-08-29 | **1.7.99 대응** |
| 3.0 — 2026-09-02 | **SkyPatcher-AE 동시 설치 시 CTD 수정** |

출처: [버전별 변경로그](https://www.nexusmods.com/skyrimspecialedition/mods/136148), [파일 이력](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=files).

### 1.3 전체 위젯과 표시 정보

STB 본체는 **8개 위젯**이다. 장비 위젯 하나에 여러 정보가 묶여 있으므로, Tullius의 독립 항목 25개와 숫자만 비교하면 안 된다. [공개 저장소의 위젯 목록](https://github.com/STB-Team/STB-Widgets-Nexus)

| 위젯 | 표시 정보·주의점 |
|---|---|
| **저항·이동속도** | 화염·냉기·전격·마법·독·질병·물리 저항, 이동속도. 문서의 ‘물리 저항’은 공개 코드상 **DamageResist 방어도 원값**을 사용 |
| **장비** | 양손 무기·주문 이름과 종류 아이콘, 능력·포효 이름 및 포효 위력/단계, 무기 피해·주문/지팡이 위력, 인챈트 피해, 독 위력·남은 적용 횟수, 화살·볼트 개수, 최근 사용 회복 포션의 보유 개수. 공개 코드에는 방패 방어도·맨손 피해 처리도 있음 |
| **레벨·경험치** | 현재 레벨, 현재/다음 레벨 필요 XP, 진행 바, 전투 상태. XP 숫자를 숨기고 바·레벨만 유지 가능 |
| **포효 재사용 대기시간** | 사용 후 재충전 시간. 비활성화하면 바닐라 표시 복원 |
| **게임 시계** | 게임 내 시간, 3가지 스타일 |
| **골드** | 현재 소지 골드 |
| **무게** | 현재 소지 무게 / 최대 무게 |
| **플레이시간** | 플레이어의 누적 실제 플레이시간, 2가지 스타일. **현실의 현재 시각과는 다른 정보** |

근거: [저항 수집 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/WidgetResist.cpp), [장비 수집 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/WidgetEquip.cpp), [플레이시간 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/WidgetPlayTime.cpp), [위젯 설명](https://www.nexusmods.com/skyrimspecialedition/mods/136148), [설정 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/ImGuiMenu.cpp).

장비 위력은 모든 효과를 합산한 최종 실전 피해와 동일하다고 볼 수 없다. 공개 코드의 일부 주문·인챈트·독 처리는 **첫 효과의 magnitude**를 사용한다. 최근 사용 포션 표시도 모든 포션을 자유롭게 고르는 퀵슬롯과는 범위가 다르다. [장비 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/WidgetEquip.cpp)

**체력·매지카·스태미나 바는 STB 본체 기능이 아니다.** 제공되는 TrueHUD/SkyHUD 선택 프리셋과 구분해야 한다. [공식 설명](https://www.nexusmods.com/skyrimspecialedition/mods/136148)

#### 별도 경쟁 범위: STB Active Effects

버프 기능은 별도 모드 **STB Active Effects, ID 140002**다. 최신 **2.1 / 2026-09-02**, 2.0에서 1.7.99 대응을 명시했다. 실제 전환 계획은 **STB 본체 대체**와 **STB + Active Effects 조합 대체**를 나누어야 한다. [공식 페이지](https://www.nexusmods.com/skyrimspecialedition/mods/140002)

| 영역 | 확인된 기능 |
|---|---|
| 표시 | 효과 아이콘, 시간·만료 정보, 효과 크기, 출처 |
| 시간 형식 | HH:MM:SS, 자동 HH:MM:SS/MM:SS, 두 종류의 MM:SS |
| 배치·필터 | 위치·크기·투명도, 가로/세로, 늘어나는 방향, 아이콘 간격, 열당 개수, 지속시간 기준 숨김 |
| 요약 | 음식·포션·술·스크롤 출처별 그룹화. 그룹 개수와 가장 짧은 효과의 시간 표시 |
| 확장 | 사용자 아이콘·JSON 매핑, 배우 값 기반 아이콘 fallback, 원형 진행 표시와 교체 가능한 자산 |
| 호환 | Survival Mode·Mysticism 패치 예시. SkyUI의 같은 효과 아이콘과 중복 표시하지 않도록 안내 |

출처: [STB Active Effects 기능·변경로그](https://www.nexusmods.com/skyrimspecialedition/mods/140002). 영구 효과의 구체적인 포함 범위는 이번에 확보한 문서만으로 확정하지 않았다.

### 1.4 커스터마이징과 시각 디자인

| 항목 | STB에서 확인한 내용 |
|---|---|
| 위치·크기·투명도 | **위젯별** X/Y·크기·opacity·활성화 |
| 표시 조건 | 저항·장비·레벨·골드·무게에 **각각** 전투 모드, 변경 모드, 변경 후 표시 시간 |
| 스타일 | 저항 2종 및 가로/세로, 장비 3종—이름 왼쪽/오른쪽/텍스트 없음, 게임 시계 3종, 플레이시간 2종 |
| 색·폰트 | 내장 임의 RGB 선택기·폰트 선택기는 확인하지 못함. SWF 리스킨으로 외형 교체 가능 |
| 프리셋 | 기본 16:9·21:9, 선택 TrueHUD/SkyHUD 프리셋. 비표준 모니터용 위치 슬라이더 범위 확장 |
| 설정 진입 | **SKSE Menu Framework 기본 F1 → STB 설정**, INI 저장·기본값 복원 |
| MCM·핫키 | 현재 공식 설정은 MCM 방식이 아님. 전체 숨김 기본 **F11**, INI에서 변경 가능 |

근거: [공개 설정 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/ImGuiMenu.cpp), [프리셋·핫키 설명](https://www.nexusmods.com/skyrimspecialedition/mods/136148), [제작자 F1 안내—2026-03-19](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts). 예전 SSE ImGui/SSE GUI/SSE Hooks·End 키 설치법을 현재 설치법으로 안내하면 안 된다.

**시각 해석:** 공식 갤러리와 검색 미리보기에서는 작은 아이콘 옆 수치, 저항 묶음, 손별 장비 아이콘·이름, 레벨/XP 바를 분산 배치하는 구성이 보인다. 정보 밀도가 높고, 게임 화면을 크게 덮지 않는 HUD 방향이다. 다만 이번 환경에서는 원본 이미지 픽셀과 인게임 애니메이션을 직접 검증하지 못했으므로, 전환 효과·부드러움·가독성의 우열은 확정하지 않는다. [공식 갤러리—대표 이미지 2024-12-14](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=images)

기본 스킨만 경쟁 대상으로 삼아서도 안 된다. **Mizuna Reskin**은 단색으로 다른 UI 교체 모드와 어울리도록 만들었다고 설명하며, 저항·장비·시간·골드·무게 등을 교체한다. 즉, 사용자에게는 기본 STB 외형보다 **자신의 UI 테마와 맞는 리스킨**이 중요한 선택 이유일 수 있다. [Mizuna Reskin—2025-01-04](https://www.nexusmods.com/skyrimspecialedition/mods/138089)

### 1.5 사용자 평가와 전환 기회

아래 증언은 사용자 만족·불만의 **사례**다. 표본 전체의 의견이나 확인된 원인으로 일반화하지 않았다.

| 구분 | 구체적인 평가·요청 | 우리가 얻을 수 있는 전환 동기 | 출처·게시일 |
|---|---|---|---|
| 칭찬 | wyllravengard: 실시간 편집을 **“live - that's awesome!”**로 평가 | 설정 중 결과가 바로 보이는 경험은 유지해야 함 | [Nexus Posts](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), 2026-09-30 |
| 칭찬 | Mailer99: 모듈별 켜기/끄기의 자유를 높이 평가 | 작은 구성부터 시작하고 필요한 기능만 추가 | [Nexus Posts](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), 2026-09-27 |
| 설치 불만 | 같은 사용자는 **“hijack my HUD layout”**라며 기존 TrueHUD/SkyHUD 배치 변경을 불평. 10-06 답변은 FOMOD 선택 항목이라고 정정 | 선택 프리셋의 영향을 설치 화면에서 명확히 설명 | [Nexus Posts](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), 2026-09-27·10-06 |
| 설정 진입 혼란 | End 키로 열리지 않아 질문했고 F1 안내 후 해결 | 첫 실행 안내, 현재 키 표시, 설정 진입 경로 검색 가능성 | [Reddit](https://www.reddit.com/r/skyrimmods/comments/1tzjphq/stb_widgets_end_key_not_opening_the_settings_menu/), 2026-06-07 |
| 기능 요청 | Saturnal69: **“system clock (real-life time)”** 및 시계 스타일 추가 요청 | **우리 현실 시계는 이미 직접적인 차별점** | [Nexus Posts](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), 2026-09-19 |
| 연동 요청 | EnormousDuckling: **“via Papyrus script”**로 STB와 효과 HUD를 일시 숨길 수 있는지 질문 | 외부 모드용 표시 제어 API | [Nexus Posts](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), 2026-09-23 |
| 런타임 문제 | Skeerimplayer64: 1.7 모드리스트에서 처음에는 실행됐지만 이후 DLL이 **“incompatible with SKSE”**로 거부됐다고 보고 | 패치별 검증표와 DLL 로딩 실패 진단 안내 | [Nexus Posts](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), 2026-10-09 |
| HUD 소실 불만 | 나침반·조준점이 일정 시간 후 사라지는 글에서 STB 관련 경험이 논의됨 | 장시간 실행·메뉴 전환 후 복구 검증을 제품 신뢰 요소로 제시 | [Reddit](https://www.reddit.com/r/skyrimmods/comments/1wue5uy/compass_and_crosshair_disappear_randomly_and_only/), 2026-09-30~10-04 |

설정 진입 사례의 실제 반응:

> “Why is it on F1”

출처: [Reddit, 2026-06-07](https://www.reddit.com/r/skyrimmods/comments/1tzjphq/stb_widgets_end_key_not_opening_the_settings_menu/). 제작자는 이미 3월에 F1 안내를 고정해 두었다. 이 사례는 문서가 전혀 없다는 증거보다 **사용자가 안내를 발견하기 어렵다는 증거**다.

HUD 소실 논의에는 다음 반응도 있다.

> “That mod is cool, but sadly many of us have had to drop it”

출처: [Reddit, 2026-10-01](https://www.reddit.com/r/skyrimmods/comments/1wue5uy/compass_and_crosshair_disappear_randomly_and_only/). 관련 글의 JContainers·Infinity UI 변경 후 개선 경험은 짧은 관찰과 여러 모드가 섞인 사례이므로, 확정된 해결책으로 취급할 수 없다.

### 1.6 성능·호환성·버그의 현재 해석

| 근거 | 확인된 범위 | 해석 |
|---|---|---|
| **SkyPatcher-AE 충돌** | 제작자가 충돌을 확인했고 **3.0에서 수정** | 현재도 미해결 충돌이라고 쓰면 안 됨 |
| **HUD 소실** | 버그 탭의 **“Disappearing UI Elements”**는 1.9, 추가 정보 필요 상태. 마지막 게시 2026-09-30 | 오래된 버전 신고와 최신 버전의 재현 여부를 분리 |
| **3.0 + TrueHUD 선택 SWF** | 체력이 가득 차지 않아도 체력 바가 사라진다는 신규 신고, 마지막 게시 2026-09-18 | 본체·선택 프리셋·TrueHUD 설정을 나눠 재현 필요 |
| **3.0 + 즐겨찾기** | A/D 입력으로 위젯이 켜졌다 꺼진다는 신규 신고, 마지막 게시 2026-09-03 | 메뉴 중 입력 처리 검증 사례 |
| **3.0 + Dragonborn 리스킨** | 오류 신고, 마지막 게시 2026-10-09 | 리스킨 버전 호환도 전환·업데이트 품질의 일부 |
| **2.8 대기 중 깜빡임** | 마지막 게시 2026-08-23 | 최신 3.0에서 지속되는지는 미확인 |
| **2.7 스레드 문제 제기** | GitHub 이슈가 Papyrus VM 스레드에서 UI 호출할 위험을 지적. 제안 패치는 게임 테스트되지 않았다고 명시 | 기술적 검토 가치가 있으나 **3.0의 확정 결함으로 인용하면 안 됨** |

출처: [제작자 확인—2026-09-02](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), [Bugs 탭](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=bugs), [GitHub 이슈 #2—2026-07-23](https://github.com/STB-Team/STB-Widgets-Nexus/issues/2). 버그 탭은 제목·버전·상태·마지막 게시일을 확인했으며, 개별 신고의 전체 본문은 확보하지 못했다.

**성능 수치:** STB는 2.8에서 정적 위젯 갱신을 타이머로 바꿨다. 그러나 동일 환경의 CPU 시간·프레임타임·메모리 비교 자료는 찾지 못했다. 따라서 Tullius가 더 빠르거나 더 안정적이라고 아직 주장할 근거는 없다. [2.8 변경로그](https://www.nexusmods.com/skyrimspecialedition/mods/136148)

**공개 Discord:** 검색으로 검증 가능한 STB 관련 대화 원문을 확보하지 못했다. 비공개 채널 내용이나 출처 없는 요약은 사용하지 않았다.

## 2. STB를 넘기 위한 참고 사례

아래 기능은 각 모드의 공식 설명에서 확인했다. **차용 방향과 난이도는 제안**이며, 모든 기능을 Tullius에 추가할 필요는 없다.

| 사례 | 차용할 기능·디자인 패턴 | Tullius 적용 방향 | 출처—확인 2026-10-10 |
|---|---|---|---|
| **TrueHUD** | 대상·보스·플레이어 정보의 계층화, 상황별 자원 바 숨김, 인챈트 충전, 외부 특수 자원 API | 위험·타깃 정보는 크게, 보조 스탯은 작게. 적·보스 HUD는 기존 모드와 연동 우선 | [TrueHUD, ID 62775](https://www.nexusmods.com/skyrimspecialedition/mods/62775) |
| **moreHUD** | 조준 대상에 맞춰 무게·골드·아이템 비교·보유 개수·읽음/습득 여부 표시 | 항상 모든 숫자를 노출하기보다 필요할 때 상세 정보를 펼치기. 대상 수집은 네이티브 작업 필요 | [moreHUD SE, ID 12688](https://www.nexusmods.com/skyrimspecialedition/mods/12688) |
| **iWant Widgets + iWant Themes** | 범용 위젯 제공, 공통 테마 적용과 개별 예외, 테마 저장 | 표시 컴포넌트와 데이터 제공자를 분리하고 테마를 상속하게 구성 | [iWant Widgets](https://www.nexusmods.com/skyrimspecialedition/mods/36457), [iWant Themes](https://www.nexusmods.com/skyrimspecialedition/mods/171718) |
| **A Matter of Time** | 게임/현실 시계·날짜, 태양·달 표현, 항상/일시/토글/주기 표시 | 텍스트 시계에 저렴한 SVG 낮·밤 표시와 잠깐 보기 추가 | [A Matter of Time, ID 12937](https://www.nexusmods.com/skyrimspecialedition/mods/12937) |
| **HUD NG** | 실제 위젯 드래그, 그룹, 독립 너비/높이, Undo/Redo, 이름 있는 프리셋, 화면비 가이드, 표시 조건, 컨트롤러 | 편집 경험의 가장 중요한 기준. 우리 편집기에 다중 선택·되돌리기·프리셋 라이브러리 도입 | [HUD NG, ID 191835](https://www.nexusmods.com/skyrimspecialedition/mods/191835) |
| **Survival Mode Prisma Widgets** | 허기·추위·수면 및 선택 갈증 데이터, SVG 채움 표현, 해당 상태에서만 표시 | 생존 모드 지원은 데이터 제공자 형태로 추가. 간단한 SVG 진행 표현 참고 | [Prisma 위젯, ID 185796](https://www.nexusmods.com/skyrimspecialedition/mods/185796) |
| **Skyrim Party Sheet** | 간결한 HUD와 상세 캐릭터 시트 분리, 장비 충전·내구도, 효과 필터, 프리셋, 게임패드, 해상도 대응 | 상세 스탯은 단축키 패널로 분리. 장비 정보와 입력 접근성의 기준으로 활용 | [Party Sheet, ID 167538](https://www.nexusmods.com/skyrimspecialedition/mods/167538) |
| **The Witcher 3 Friendly HUD** | 전투·위험 시 자동 표시, 키를 누르는 동안 보기, 원하는 모듈 고정 | “항상 보기/상황별 보기/잠깐 보기”를 일관된 표시 모델로 제공 | [Friendly HUD, ID 365](https://www.nexusmods.com/witcher3/mods/365) |

특히 **HUD NG는 STB 3.0의 8개 위젯을 편집 대상으로 지원하지만, Prisma 오버레이는 대상에서 제외한다고 명시**한다. 이것은 공존 불가라는 뜻이 아니다. 다만 Tullius 사용자는 해당 편집 기능을 이용할 수 없으므로, 우리 자체 편집기의 완성도가 더 중요해진다. [HUD NG 지원 범위](https://www.nexusmods.com/skyrimspecialedition/mods/191835)

상세 스탯 계열의 기준은 Party Sheet에서 얻을 수 있다. 현재 설명에는 캐릭터 시트·장비·효과·생존 정보와 **1.7.104 지원**이 있다. STB보다 많은 정보를 모으는 것만으로 우위를 확보하기는 어려우며, **HUD와 상세 조회 화면을 잘 나누는 것**이 더 유효하다. [Party Sheet 설명·변경로그](https://www.nexusmods.com/skyrimspecialedition/mods/167538)

## 3. 우리 코드와의 비교

### 3.1 현재 구현 범위

읽은 핵심 자료는 [README](</home/kdw73/Tullius Widgets/README.md>), [Nexus 한국어 설명](</home/kdw73/Tullius Widgets/docs/nexus-description-ko.txt>), [payload 스키마](</home/kdw73/Tullius Widgets/docs/stats-payload-schema.md>), [StatsCollector](</home/kdw73/Tullius Widgets/src/StatsCollector.cpp>), React 위젯·설정·i18n이다.

[위젯 레지스트리](</home/kdw73/Tullius Widgets/view/src/data/widgetItemRegistry.ts>)에는 다음 **25개 독립 항목**이 있다.

| 그룹 | 항목 |
|---|---|
| 경험치·플레이어 | XP, 레벨, 골드, 소지 무게, 체력, 매지카, 스태미나 |
| 저항·방어 | 마법·화염·냉기·전격·독·질병, 방어도, 피해 감소율 |
| 공격·장비 | 오른손/왼손 공격력, 치명타 확률, 오른손/왼손 장비명, 선택 능력·포효명 |
| 시간·기타 | 게임 시간, 현실 시간, 이동속도, 시간제 효과 목록 |

### 3.2 기능 격차표

**난이도는 계획 추정**이다. `UI`는 현재 데이터로 구현 가능, `네이티브`는 SKSE 수집·payload 변경 필요, `Prisma`는 렌더링 또는 다른 HUD 프레임워크와의 경계가 주요 제약이다.

| 판정 | 항목 | STB 대비 현재 Tullius | 필요한 작업·난이도 |
|---|---|---|---|
| **없음** | 포효 재사용 대기시간 | 선택 포효 이름·종류만 있고 쿨다운 없음 | **네이티브·중** |
| **열세** | 포효 단계·위력 | 이름은 있으나 단어 단계·위력 없음 | **네이티브·중** |
| **없음** | 화살·볼트·포션 개수 | 탄약 및 최근 사용 회복 포션 보유량 없음 | **네이티브·중** |
| **열세** | 주문·지팡이·맨손·방패 정보 | 손별 피해 수집은 무기 중심. 주문·맨손은 0, 방패 개별 방어도 표시 없음 | **네이티브·높음** |
| **없음** | 인챈트·독 상세 | 인챈트 위력, 독 위력·남은 적용 횟수 없음 | **네이티브·높음** |
| **없음** | 누적 플레이시간 | 현실 현재 시각은 있지만 누적 플레이시간 없음 | **네이티브·낮음~중** |
| **열세** | 장비의 간결한 표현 | 장비명은 있지만 종류별 아이콘·이름 좌우/숨김 표현이 부족 | **UI + 종류 데이터·중** |
| **열세** | 위젯별 표시 조건·투명도 | 전투/변경 조건과 opacity가 **전역** 설정 | **UI·중** |
| **열세** | XP 표현·전투 상태 | XP 숫자 숨김과 명시적 전투 상태 표식 부족 | **UI·낮음** |
| **열세** | 시계 스타일 | 텍스트 중심. STB의 여러 시각 스타일과 비교하면 선택 폭 부족 | **UI·낮음~중** |
| **열세—AE 조합** | 효과 표현·필터 | 이름·출처·초 단위 타이머·바는 있지만 효과 아이콘·위력·출처별 그룹·시간 형식·열/성장 방향 부족 | **UI + 네이티브·중~높음** |
| **열세** | 즉시 쓸 수 있는 배치·테마 | JSON 가져오기/내보내기는 있으나 이름 있는 프리셋 라이브러리·미리보기 부족 | **UI·중** |
| **열세** | 핫키 변경·게임패드 | Insert/ESC/F11이 네이티브 상수. 사용자 재지정·게임패드 편집 없음 | **네이티브·중~높음** |
| **생태계 격차** | HUD NG 편집 | STB는 지원됨. Prisma 오버레이는 편집 대상에서 제외 | 자체 편집기 보강은 **UI·중**, 직접 연동은 **Prisma·높음/가능성 미검증** |
| **우세—STB 단독 대비** | 배치 단위·정밀 편집 | 각 저항·스탯을 따로 이동·크기 조절, 잠금·레이어·스냅·정렬 지원 | 이미 구현. HUD NG 조합 대비 우위는 별도 평가 |
| **우세** | 원값·상한 정보 | 저항 원값과 제한된 값, 계산 메타데이터를 구분 | 이미 구현. 계산 정확도 검증 필요 |
| **우세—STB 본체 대비** | 추가 전투 정보 | 치명타 확률, 자원 표시, 저자원·과적 경고 | 이미 구현. TrueHUD 전체 기능의 대체를 뜻하지는 않음 |
| **우세** | 현실 시계 | STB 게시판의 실제 요청을 이미 충족 | 이미 구현 |
| **우세** | 한국어 접근성·폰트 | 내장 한/영, 외부 번역 JSON, 4개 폰트 프리셋, 강조색·아이콘 테마 | 이미 구현. STB에도 별도 번역·리스킨이 있음 |
| **우세 가능성** | 첫 실행 안내·진단 | 온보딩과 런타임/설정 저장 경고 구현 | 코드상 강점. 실제 사용성 검증 필요 |

로컬 근거: [설정 타입](</home/kdw73/Tullius Widgets/view/src/types/settings.ts>), [장비·수치 UI](</home/kdw73/Tullius Widgets/view/src/components/HudWidgetItems.tsx>), [경험치 UI](</home/kdw73/Tullius Widgets/view/src/components/ExperienceWidget.tsx>), [효과 UI](</home/kdw73/Tullius Widgets/view/src/components/TimedEffectList.tsx>), [프리셋](</home/kdw73/Tullius Widgets/view/src/components/settings/PresetSection.tsx>), [핫키](</home/kdw73/Tullius Widgets/src/WidgetHotkeys.cpp>), [번역](</home/kdw73/Tullius Widgets/view/src/i18n/translations.ts>).

STB 측 비교 근거는 앞의 [장비 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/WidgetEquip.cpp), [설정 코드](https://github.com/STB-Team/STB-Widgets-Nexus/blob/main/src/ImGuiMenu.cpp), [Active Effects](https://www.nexusmods.com/skyrimspecialedition/mods/140002), [HUD NG](https://www.nexusmods.com/skyrimspecialedition/mods/191835)이다.

### 3.3 계획 전에 반영해야 할 코드상 문제

| 발견 | 의미와 조치 |
|---|---|
| **변경 시 표시가 전역이며 현실 시계의 매초 갱신도 ‘변경’으로 계산** | 현실 시계가 켜져 있고 표시 시간이 1초보다 길면, 변경 모드에서도 HUD가 계속 보일 수 있다. 시간 흐름과 사용자가 알아야 할 변화 이벤트를 분리해야 함 |
| **선택 포효/능력이 변경 감지 서명에서 빠짐** | 다른 값이 변하지 않는 상황의 능력 교체가 변경 표시를 깨우지 못할 수 있음 |
| **영구 효과 제외** | `NoDuration` 또는 지속시간 0 이하를 제외한다. 현재 효과 목록을 전체 능력·질병·상시 버프 목록으로 설명하면 부정확 |
| **피해 감소율은 고정 모델** | `방어도 × 0.12`, 상한 80의 계산이다. 착용 상태·모드가 바꾸는 계산과 상한까지 정확한지 검증해야 함 |
| **런타임 지원 판정은 큰 범위의 추정** | major=1, minor=5~7이면 지원 가능으로 판단한다. 패치별 DLL 호환성 검증을 대신하지 못함 |
| **저자원 경고의 큰 그림자** | 화면 전체에 130~180px inset shadow와 반복 pulse를 사용한다. 요청에서 정한 Prisma CPU 렌더링 예산과 맞추려면 먼저 비용을 측정하고 단순화해야 함 |

근거: [변경 감지·표시 판단](</home/kdw73/Tullius Widgets/view/src/utils/hudPresentation.ts:93>), [네이티브 수집](</home/kdw73/Tullius Widgets/src/StatsCollector.cpp:88>), [런타임 진단](</home/kdw73/Tullius Widgets/src/RuntimeDiagnostics.cpp:13>), [화면 경고 효과](</home/kdw73/Tullius Widgets/view/src/components/ScreenEffects.tsx:18>).

반대로 메뉴·사진 모드·자유 카메라·게임 자체 HUD 숨김을 따르는 처리는 이미 존재한다. 이를 신규 기능으로 다시 계획하기보다 복구 동작을 검증하는 편이 맞다. 이벤트 수집·주기적 갱신 구조도 구현되어 있으므로 **현재 구조를 활용하되 실제 성능과 안정성을 측정해야 한다.** [가시성 상태](</home/kdw73/Tullius Widgets/src/WidgetVisibilityState.cpp>), [런타임 갱신](</home/kdw73/Tullius Widgets/src/WidgetRuntime.cpp>)

## 4. 전환 우선순위와 대체 선언 기준

### 4.1 상위 10개 우선순위

영향도·난이도는 **1~5의 추정치**이며 큰 수치가 높다는 뜻이다. 순서는 구현 효율과 함께 **STB 대체를 막는 필수 격차**를 반영했다.

| 순위 | 작업 | 영향 / 난이도 | 구현 범위 | 완료를 판단할 기준 |
|---:|---|:---:|---|---|
| **1** | **위젯별 표시 조건과 변경 감지 수정** | **5 / 2** | UI | 시계가 장비·골드를 깨우지 않음. 항목별 상시/전투/변경·지연 설정, 능력 교체 감지 |
| **2** | **장비 정보 완성** | **5 / 4** | 네이티브 + UI | 탄약·최근 포션, 종류 아이콘, 주문/지팡이/맨손/방패, 인챈트·독 정보를 누락 없이 표시 |
| **3** | **포효 쿨다운·단어 단계** | **5 / 3** | 네이티브 + UI | 포효 이름·단계·재사용 가능 시점을 알 수 있고 관련 게임 동작을 방해하지 않음 |
| **4** | **런타임·데이터 정확도·HUD 복구 검증** | **5 / 4** | 네이티브 + 인게임 검증 | 패치별 로딩 표, 메뉴·저장/로드·변신·제작 후 정상 복구, 표시값의 계산 근거 공개 |
| **5** | **전환용 기본 테마·화면비 프리셋** | **4 / 2** | UI | STB 사용자가 설치 직후 익숙한 작은 배치를 선택. 16:9·21:9·고해상도에서 읽기 쉬움 |
| **6** | **Active Effects 수준으로 효과 HUD 확장** | **5 / 4** | UI + 네이티브 | 아이콘·위력·시간 형식·필터·그룹·성장 방향. 영구 효과의 지원 범위 명시 |
| **7** | **Prisma 렌더링 비용 절감** | **4 / 2** | UI + 측정 | 큰 그림자 경고를 저렴한 표현으로 교체하고 경고·효과 다수 상황의 비용 확인 |
| **8** | **편집기의 Undo·그룹·프리셋 라이브러리** | **4 / 3** | UI | 편집 취소/되돌리기, 다중 선택, 이름 있는 저장·미리보기, 항목별 투명도·간결한 표현 |
| **9** | **핫키 재지정·게임패드 접근성** | **4 / 3** | 네이티브 + UI | 충돌하는 키 변경, 패드로 설정 진입·닫기·기본 조작, 입력 안내 일치 |
| **10** | **누적 플레이시간** | **3 / 2** | 네이티브 + UI | 현실 시계와 별도 항목으로 누적 플레이시간 제공 |

실행 순서는 **1·5로 즉시 사용성을 개선하면서 2·3을 수집 계층에서 진행**하는 편이 효율적이다. 4·7의 검증은 마지막 출시 단계에 몰아두지 말고 기능이 추가될 때 함께 수행해야 한다.

후속 차별화 후보는 외부 모드용 표시 제어 API, 스킬 진행률, 생존 데이터 제공자다. 동료·적·보스 HUD 전체를 추가하는 작업은 범위가 크므로, 초기에는 TrueHUD 등과의 연동 품질을 높이는 것이 유리하다. API 요청은 [2026-09-23 STB 게시물](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts), 스킬 진행률 요청은 [2026-08-22 게시물](https://www.nexusmods.com/skyrimspecialedition/mods/136148?tab=posts)에서 확인했다.

### 4.2 “STB 완전 대체” 최소 기준

**STB 본체 대체**를 선언하려면 다음을 충족해야 한다.

- [ ] **8개 영역 충족:** 저항·속도, 장비, 레벨/XP·전투 상태, 포효 쿨다운, 게임 시계, 골드, 무게, 누적 플레이시간.
- [ ] **장비 정보 누락 없음:** 양손·능력/포효, 무기/주문 위력, 인챈트·독·탄약·최근 포션 개수. 맨손·방패·지팡이도 의미 있는 값 표시.
- [ ] **위젯별 제어:** 위치·크기·투명도·활성화, 적용 가능한 전투/변경 조건과 표시 시간.
- [ ] **간결한 표현:** 장비명 좌우/숨김, 저항 가로/세로, XP 숫자 숨김, 여러 시계·플레이시간 표현.
- [ ] **설정 접근성과 보존:** 첫 실행 안내, 키 재지정, 저장·로드 후 설정 유지, 기본값 복원, 배치 프리셋.
- [ ] **실제 호환성 검증:** 1.5.97, 지원을 선언할 대표 1.6.x, 1.7.99·1.7.104를 각각 검증. Steam/GOG·VR 지원 범위 별도 명시.
- [ ] **복구·공존 검증:** 메뉴 연속 개폐, 대기, 빠른 로드, 변신, 제작, 사진 모드 후 정상 복구. TrueHUD·SkyHUD·주요 UI 조합에서 기존 설정을 존중.
- [ ] **성능 근거 확보:** 동일 조건에서 STB/Tullius 비교. 프레임타임·CPU 비용·메모리와 장시간 실행 결과 공개.

**STB + Active Effects 조합까지 대체**한다고 선언하려면 추가로:

- [ ] 효과 아이콘, 시간·위력·출처, 시간 형식, 필터, 출처별 그룹화, 열·간격·성장 방향 제공.
- [ ] 사용자 아이콘 매핑 및 모드 효과 fallback 제공.
- [ ] 영구 효과·질병·능력의 포함/제외 정책 명시.
- [ ] 중복 효과·재적용·게임 일시정지·다수 효과 상황에서 안정적인 타이머와 식별 유지.

현재 구현만으로 충족한 항목과 앞으로 해야 할 항목이 섞여 있으므로, 출시 전에 각각 실제 동작으로 판정해야 한다.

### 4.3 디자인 방향

| 방향 | 제안 |
|---|---|
| **기본 외형** | 현재 노르딕 방향을 유지하되 배경 면적·테두리·라벨을 줄이고 숫자 정렬을 강화. 전환용 **컴팩트·바닐라 단색 프리셋**도 제공 |
| **정보 우선순위** | 전투 중에는 장비·탄약·포효·위험 상태, 탐험 중에는 시간·무게·골드. 저항과 상세 계산은 요청하거나 변했을 때 노출 |
| **장비 표현** | 무기 종류·마법 학파를 아이콘으로 구분하고, 이름은 선택적으로 표시. 기본 상태는 작은 슬롯 구성 |
| **효과 표현** | 아이콘 중심의 작은 목록과 상세 텍스트 목록을 선택. 디버프·만료 임박 효과는 색 외에도 모양·정렬로 구별 |
| **상세 정보** | 원값·상한·계산 설명은 단축키 상세 패널로 이동. 평상시 HUD에는 판단에 필요한 값 우선 |
| **테마 구조** | 글꼴·색·간격·선 두께를 공통 토큰으로 관리하고 항목별 예외 허용. 한국어·긴 장비명에서도 배치 유지 |
| **애니메이션** | 이벤트 때 짧은 표시 전환만 사용하고 애니메이션 끄기 제공. 지속적인 강조는 제한 |
| **Prisma 예산** | 요청의 CPU 렌더링·UI 60FPS 상한을 전제로 단순 SVG·텍스처·얇은 외곽선 사용. 큰 blur/shadow 대신 작은 경고 표식이나 비용을 확인한 비네트 사용 |

차별점은 **“작은 HUD에서 필요한 정보를 빠짐없이 보여주고, 상세 정보와 편집은 쉽게 펼칠 수 있는 경험”**으로 잡는 것이 좋다. 기능 수보다 정보의 정확성, 상황별 노출, 초기 배치, 장시간 안정성을 출시 품질 기준으로 삼아야 한다.