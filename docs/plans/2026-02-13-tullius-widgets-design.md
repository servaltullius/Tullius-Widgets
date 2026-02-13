# Tullius Widgets - 설계 문서

> STB Widgets의 대안으로, Prisma UI 프레임워크를 활용한 스카이림 SE 전투 스탯 HUD 위젯

## 개요

Tullius Widgets는 스카이림 SE용 전투 스탯 HUD 위젯 모드입니다. 기존 STB Widgets의 SWF/Flash 기반 제약과 버그를 해결하기 위해 Prisma UI(WebKit 기반 차세대 웹 UI 프레임워크)와 React를 활용합니다.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| UI 프레임워크 | Prisma UI (WebKit, DirectX 11 오버레이) |
| 프론트엔드 | React + TypeScript |
| 백엔드(플러그인) | C++23 SKSE 플러그인 (CommonLib-NG) |
| 설정 관리 | PMCM (Prisma Mod Configuration Manager) |
| 빌드 시스템 | XMake |
| 데이터 통신 | JSON (C++ ↔ JavaScript 양방향) |

## 아키텍처

```
┌─────────────────────────────────────────────┐
│                  Skyrim SE                   │
│                                              │
│  ┌──────────────────┐   ┌────────────────┐  │
│  │  SKSE Plugin      │   │  Prisma UI     │  │
│  │  (C++ / 최소)     │   │  (WebKit)      │  │
│  │                   │   │                │  │
│  │  • 플레이어 스탯  │──▶│  React App     │  │
│  │    수집 (매 1~2초)│   │  • 위젯 렌더링 │  │
│  │  • JSON 직렬화    │   │  • 아이콘 표시  │  │
│  │  • Invoke() 호출  │◀──│  • PMCM 설정   │  │
│  │                   │   │                │  │
│  └──────────────────┘   └────────────────┘  │
└─────────────────────────────────────────────┘
```

### 데이터 흐름

1. C++ SKSE 플러그인이 게임 엔진에서 플레이어 전투 스탯을 주기적으로 수집
2. 수집된 스탯을 JSON 객체로 직렬화
3. Prisma UI `Invoke()`로 React 앱의 JavaScript 함수 호출하여 데이터 전달
4. React가 미니말 아이콘 + 수치로 화면에 렌더링
5. PMCM 설정 변경 시 `RegisterJSListener()`로 React에 전달

## 프로젝트 구조

```
Tullius-Widgets/
├── src/                        # C++ SKSE 플러그인
│   ├── main.cpp                # 플러그인 진입점, Prisma UI 초기화
│   ├── StatsCollector.h/.cpp   # 전투 스탯 수집 로직
│   └── PrismaUI_API.h          # Prisma UI API 헤더
├── view/                       # React 프론트엔드
│   ├── src/
│   │   ├── App.tsx             # 메인 앱 컴포넌트
│   │   ├── components/
│   │   │   ├── WidgetContainer.tsx   # 전체 위젯 영역
│   │   │   ├── WidgetGroup.tsx       # 카테고리별 그룹
│   │   │   └── StatWidget.tsx        # 개별 스탯 위젯
│   │   ├── hooks/
│   │   │   ├── useGameStats.ts       # 게임 데이터 수신 훅
│   │   │   └── useSettings.ts        # PMCM 설정 관리 훅
│   │   ├── types/
│   │   │   └── stats.ts              # TypeScript 인터페이스
│   │   └── assets/
│   │       └── icons/                # SVG 아이콘
│   ├── package.json
│   ├── tsconfig.json
│   └── index.html
├── xmake.lua                   # 빌드 설정
└── docs/
    └── plans/
```

## 전투 스탯 데이터 모델

```typescript
interface CombatStats {
  resistances: {
    magic: number;      // 마법 저항 (%)
    fire: number;       // 화염 저항 (%)
    frost: number;      // 냉기 저항 (%)
    shock: number;      // 전기 저항 (%)
    poison: number;     // 독 저항 (%)
    disease: number;    // 질병 저항 (%)
  };
  defense: {
    armorRating: number;     // 방어력
    damageReduction: number; // 데미지 감소 (%)
  };
  offense: {
    rightHandDamage: number;  // 오른손 무기 데미지
    leftHandDamage: number;   // 왼손 무기 데미지
    critChance: number;       // 크리티컬 확률 (%)
  };
  movement: {
    speedMult: number;  // 이동속도 배율 (%)
  };
}
```

## UI 디자인

### 레이아웃

화면 우측 하단에 컴팩트한 세로 그리드로 배치:

```
                              ┌─────────────┐
                              │  🔥 45%     │  화염 저항
                              │  ❄️ 30%     │  냉기 저항
                              │  ⚡ 20%     │  전기 저항
                              │  🟣 50%     │  마법 저항
                              │  ☠️ 15%     │  독 저항
                              │  🛡️ 287     │  방어력
                              │  ⚔️ 45      │  무기 데미지
                              │  💨 100%    │  이동속도
                              └─────────────┘
```

### 시각적 특징

- **SVG 아이콘**: 스카이림 분위기에 맞는 커스텀 벡터 아이콘
- **수치 변화 애니메이션**: 값이 바뀔 때 부드러운 숫자 전환
- **조건부 하이라이트**: 저항력 캡(85%) 도달 시 골드색, 0% 이하 시 빨간색
- **전투 감지**: 전투 중에만 표시하는 옵션 (평시 자동 숨김)

### React 컴포넌트 구조

| 컴포넌트 | 역할 |
|----------|------|
| `WidgetContainer` | 전체 래퍼, 위치/투명도/스케일 제어 |
| `WidgetGroup` | 카테고리별 묶음 (접기/펼치기 가능) |
| `StatWidget` | 개별 아이콘 + 수치 표시 |
| `useGameStats` | C++에서 오는 데이터를 받는 커스텀 훅 |
| `useSettings` | PMCM 설정값 관리 훅 |

## PMCM 설정 구조

```
Tullius Widgets 설정
├── 일반
│   ├── 위젯 전체 표시/숨김     [On/Off]
│   ├── 전투 중에만 표시        [On/Off]
│   ├── 위젯 투명도             [0~100% 슬라이더]
│   ├── 위젯 크기               [소/중/대]
│   └── 위젯 위치               [좌상/우상/좌하/우하]
├── 저항력 위젯
│   ├── 마법/화염/냉기/전기/독/질병 저항 표시  [각각 On/Off]
├── 방어 위젯
│   ├── 방어력/데미지 감소율 표시               [각각 On/Off]
├── 공격 위젯
│   ├── 무기 데미지/크리티컬 확률 표시          [각각 On/Off]
└── 이동 위젯
    └── 이동속도 표시                          [On/Off]
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| Prisma UI 미설치 | SKSE 로그에 경고, 크래시 없이 플러그인 비활성화 |
| 플레이어 데이터 없음 (메인 메뉴) | 위젯 자동 숨김 |
| JSON 파싱 실패 | 기본값 사용, 에러 로그 기록 |
| 설정 파일 손상 | 기본 설정으로 자동 복구 |

## 호환성

- **다른 HUD 모드**: Prisma UI는 기존 SWF UI와 독립 동작하므로 충돌 없음
- **게임 버전**: CommonLib-NG로 AE/SE 모두 지원
- **성능**: 데이터 수집 1~2초 간격, React는 데이터 변경 시에만 리렌더링

## 의존성

- Skyrim SE / AE
- SKSE64
- Address Library for SKSE Plugins
- Prisma UI Framework
- PMCM (Prisma Mod Configuration Manager)
