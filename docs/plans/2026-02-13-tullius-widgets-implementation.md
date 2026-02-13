# Tullius Widgets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prisma UI + React(TypeScript) 기반 스카이림 SE 전투 스탯 HUD 위젯 모드 구축

**Architecture:** C++ SKSE 플러그인이 게임 엔진에서 전투 스탯을 수집하여 JSON으로 직렬화한 뒤, Prisma UI의 Invoke()를 통해 React 앱에 전달. React가 미니말 아이콘 + 수치로 화면에 렌더링. 설정은 JSON 파일 기반 자체 설정 패널 (F10 토글).

**Tech Stack:** Prisma UI (WebKit/DX11), React 19 + TypeScript, Vite, C++23, CommonLib-NG, XMake

---

## Task 1: 프로젝트 초기화 & 템플릿 클론

**Files:**
- Create: `.gitignore`
- Clone: `lib/commonlibsse-ng` (git submodule)
- Clone: `lib/PrismaUI_API.h` (from example-skse-plugin)
- Create: `src/pch.h`

**Step 1: Git 저장소 초기화**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git init
```

**Step 2: .gitignore 생성**

```gitignore
# Build
build/
dist/
.xmake/

# React
view/node_modules/
view/dist/

# IDE
.vs/
.vscode/
*.user

# OS
.DS_Store
Thumbs.db
```

**Step 3: example-skse-plugin 템플릿에서 필요한 파일 가져오기**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git clone --recurse-submodules https://github.com/PrismaUI-SKSE/example-skse-plugin.git _template
cp -r _template/lib ./lib
cp -r _template/src/pch.h ./src/pch.h
cp -r _template/src/PrismaUI_API.h ./src/PrismaUI_API.h
cp -r _template/src/keyhandler ./src/keyhandler
rm -rf _template
```

**Step 4: 초기 커밋**

```bash
git add .gitignore lib/ src/pch.h src/PrismaUI_API.h src/keyhandler/
git commit -m "chore: initialize project from PrismaUI example template"
```

---

## Task 2: React 프론트엔드 프로젝트 셋업

**Files:**
- Create: `view/package.json`
- Create: `view/tsconfig.json`
- Create: `view/vite.config.ts`
- Create: `view/index.html`
- Create: `view/src/main.tsx`

**Step 1: Vite + React + TypeScript 프로젝트 생성**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
npm create vite@latest view -- --template react-ts
```

**Step 2: vite.config.ts 수정 (상대 경로 빌드)**

`view/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
```

**Step 3: 기본 파일 정리**

Vite가 생성한 기본 파일 중 불필요한 것을 정리:
- 삭제: `view/src/App.css`, `view/src/index.css`, `view/src/assets/react.svg`, `view/public/vite.svg`

**Step 4: view/index.html을 Prisma UI용으로 수정**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tullius Widgets</title>
</head>
<body style="margin:0; background:transparent; overflow:hidden;">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**Step 5: 의존성 설치 & 빌드 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npm install
npm run build
```

Expected: `view/dist/` 에 `index.html`, `assets/` 생성

**Step 6: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/
git commit -m "chore: set up React + TypeScript + Vite frontend"
```

---

## Task 3: TypeScript 타입 정의 & 모크 데이터

**Files:**
- Create: `view/src/types/stats.ts`
- Create: `view/src/data/mockStats.ts`
- Create: `view/src/types/settings.ts`
- Create: `view/src/data/defaultSettings.ts`

**Step 1: 전투 스탯 타입 정의**

`view/src/types/stats.ts`:
```typescript
export interface Resistances {
  magic: number;
  fire: number;
  frost: number;
  shock: number;
  poison: number;
  disease: number;
}

export interface Defense {
  armorRating: number;
  damageReduction: number;
}

export interface Offense {
  rightHandDamage: number;
  leftHandDamage: number;
  critChance: number;
}

export interface Movement {
  speedMult: number;
}

export interface CombatStats {
  resistances: Resistances;
  defense: Defense;
  offense: Offense;
  movement: Movement;
  isInCombat: boolean;
}
```

**Step 2: 설정 타입 정의**

`view/src/types/settings.ts`:
```typescript
export type WidgetPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetSettings {
  general: {
    visible: boolean;
    combatOnly: boolean;
    opacity: number;
    size: WidgetSize;
    position: WidgetPosition;
  };
  resistances: {
    magic: boolean;
    fire: boolean;
    frost: boolean;
    shock: boolean;
    poison: boolean;
    disease: boolean;
  };
  defense: {
    armorRating: boolean;
    damageReduction: boolean;
  };
  offense: {
    rightHandDamage: boolean;
    leftHandDamage: boolean;
    critChance: boolean;
  };
  movement: {
    speedMult: boolean;
  };
}
```

**Step 3: 모크 데이터 생성**

`view/src/data/mockStats.ts`:
```typescript
import type { CombatStats } from '../types/stats';

export const mockStats: CombatStats = {
  resistances: {
    magic: 50,
    fire: 45,
    frost: 30,
    shock: 20,
    poison: 15,
    disease: 100,
  },
  defense: {
    armorRating: 287,
    damageReduction: 55,
  },
  offense: {
    rightHandDamage: 45,
    leftHandDamage: 0,
    critChance: 12,
  },
  movement: {
    speedMult: 100,
  },
  isInCombat: false,
};
```

**Step 4: 기본 설정값 생성**

`view/src/data/defaultSettings.ts`:
```typescript
import type { WidgetSettings } from '../types/settings';

export const defaultSettings: WidgetSettings = {
  general: {
    visible: true,
    combatOnly: false,
    opacity: 85,
    size: 'medium',
    position: 'bottom-right',
  },
  resistances: {
    magic: true,
    fire: true,
    frost: true,
    shock: true,
    poison: true,
    disease: false,
  },
  defense: {
    armorRating: true,
    damageReduction: true,
  },
  offense: {
    rightHandDamage: true,
    leftHandDamage: true,
    critChance: true,
  },
  movement: {
    speedMult: true,
  },
};
```

**Step 5: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/src/types/ view/src/data/
git commit -m "feat: add TypeScript type definitions and mock data"
```

---

## Task 4: StatWidget 컴포넌트

**Files:**
- Create: `view/src/components/StatWidget.tsx`

**Step 1: StatWidget 컴포넌트 작성**

`view/src/components/StatWidget.tsx`:
```tsx
interface StatWidgetProps {
  icon: string;
  value: number;
  unit?: string;
  visible: boolean;
  cap?: number;
}

export function StatWidget({ icon, value, unit = '', visible, cap }: StatWidgetProps) {
  if (!visible) return null;

  const isAtCap = cap !== undefined && value >= cap;
  const isNegative = value < 0;

  const valueColor = isAtCap ? '#ffd700' : isNegative ? '#ff4444' : '#ffffff';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '2px 0',
    }}>
      <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{icon}</span>
      <span style={{
        color: valueColor,
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: 'bold',
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        minWidth: '40px',
        textAlign: 'right',
      }}>
        {Math.round(value)}{unit}
      </span>
    </div>
  );
}
```

**Step 2: 빌드 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npx tsc --noEmit
```

Expected: 타입 에러 없음

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/src/components/StatWidget.tsx
git commit -m "feat: add StatWidget component with cap/negative highlighting"
```

---

## Task 5: WidgetGroup 컴포넌트

**Files:**
- Create: `view/src/components/WidgetGroup.tsx`

**Step 1: WidgetGroup 컴포넌트 작성**

`view/src/components/WidgetGroup.tsx`:
```tsx
import type { ReactNode } from 'react';

interface WidgetGroupProps {
  children: ReactNode;
}

export function WidgetGroup({ children }: WidgetGroupProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      paddingBottom: '4px',
      marginBottom: '4px',
    }}>
      {children}
    </div>
  );
}
```

**Step 2: 빌드 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/src/components/WidgetGroup.tsx
git commit -m "feat: add WidgetGroup component"
```

---

## Task 6: WidgetContainer 컴포넌트

**Files:**
- Create: `view/src/components/WidgetContainer.tsx`

**Step 1: WidgetContainer 컴포넌트 작성**

`view/src/components/WidgetContainer.tsx`:
```tsx
import type { ReactNode } from 'react';
import type { WidgetPosition, WidgetSize } from '../types/settings';

interface WidgetContainerProps {
  children: ReactNode;
  position: WidgetPosition;
  opacity: number;
  size: WidgetSize;
  visible: boolean;
}

const positionStyles: Record<WidgetPosition, React.CSSProperties> = {
  'top-left': { top: '20px', left: '20px' },
  'top-right': { top: '20px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '20px' },
};

const scaleMap: Record<WidgetSize, number> = {
  small: 0.8,
  medium: 1.0,
  large: 1.2,
};

export function WidgetContainer({ children, position, opacity, size, visible }: WidgetContainerProps) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      ...positionStyles[position],
      opacity: opacity / 100,
      transform: `scale(${scaleMap[size]})`,
      transformOrigin: position.includes('right') ? 'right' : 'left',
      background: 'rgba(0, 0, 0, 0.4)',
      borderRadius: '8px',
      padding: '8px 12px',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      {children}
    </div>
  );
}
```

**Step 2: 빌드 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/src/components/WidgetContainer.tsx
git commit -m "feat: add WidgetContainer with position/opacity/size support"
```

---

## Task 7: useGameStats 훅 (C++ 브리지)

**Files:**
- Create: `view/src/hooks/useGameStats.ts`

**Step 1: useGameStats 훅 작성**

이 훅은 C++ SKSE 플러그인에서 Invoke()를 통해 호출되는 글로벌 함수를 등록하고, React state로 관리합니다.

`view/src/hooks/useGameStats.ts`:
```typescript
import { useState, useEffect } from 'react';
import type { CombatStats } from '../types/stats';
import { mockStats } from '../data/mockStats';

const isDev = !window.hasOwnProperty('sendDataToSKSE');

export function useGameStats(): CombatStats {
  const [stats, setStats] = useState<CombatStats>(mockStats);

  useEffect(() => {
    // C++ calls window.updateStats(jsonString) via PrismaUI->Invoke()
    (window as any).updateStats = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as CombatStats;
        setStats(parsed);
      } catch (e) {
        console.error('Failed to parse stats JSON:', e);
      }
    };

    if (isDev) {
      console.log('[TulliusWidgets] Dev mode - using mock stats');
    }

    return () => {
      delete (window as any).updateStats;
    };
  }, []);

  return stats;
}
```

**Step 2: 빌드 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/src/hooks/useGameStats.ts
git commit -m "feat: add useGameStats hook with C++ bridge and dev mode"
```

---

## Task 8: useSettings 훅

**Files:**
- Create: `view/src/hooks/useSettings.ts`

**Step 1: useSettings 훅 작성**

`view/src/hooks/useSettings.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import type { WidgetSettings } from '../types/settings';
import { defaultSettings } from '../data/defaultSettings';

export function useSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // C++ calls window.updateSettings(jsonString) to push saved settings
    (window as any).updateSettings = (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString) as WidgetSettings;
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse settings JSON:', e);
      }
    };

    // C++ calls window.toggleSettings() when user presses F10
    (window as any).toggleSettings = () => {
      setSettingsOpen(prev => !prev);
    };

    return () => {
      delete (window as any).updateSettings;
      delete (window as any).toggleSettings;
    };
  }, []);

  const updateSetting = useCallback((path: string, value: any) => {
    setSettings(prev => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;

      // Notify C++ of the change
      if ((window as any).onSettingsChanged) {
        (window as any).onSettingsChanged(JSON.stringify(next));
      }

      return next;
    });
  }, []);

  return { settings, settingsOpen, setSettingsOpen, updateSetting };
}
```

**Step 2: 빌드 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/src/hooks/useSettings.ts
git commit -m "feat: add useSettings hook with C++ bridge and path-based updates"
```

---

## Task 9: SettingsPanel 컴포넌트

**Files:**
- Create: `view/src/components/SettingsPanel.tsx`

**Step 1: SettingsPanel 작성**

`view/src/components/SettingsPanel.tsx`:
```tsx
import type { WidgetSettings, WidgetPosition, WidgetSize } from '../types/settings';

interface SettingsPanelProps {
  settings: WidgetSettings;
  open: boolean;
  onClose: () => void;
  onUpdate: (path: string, value: any) => void;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}>
      <span style={{ color: '#ddd', fontSize: '13px' }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <h3 style={{ color: '#ffd700', fontSize: '14px', margin: '0 0 6px 0', borderBottom: '1px solid rgba(255,215,0,0.3)', paddingBottom: '4px' }}>{title}</h3>
      {children}
    </div>
  );
}

export function SettingsPanel({ settings, open, onClose, onUpdate }: SettingsPanelProps) {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 20, 30, 0.95)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      minWidth: '320px',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 1000,
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#ffd700', margin: 0, fontSize: '18px' }}>Tullius Widgets</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>X</button>
      </div>

      <Section title="General">
        <Toggle label="Show Widgets" checked={settings.general.visible} onChange={v => onUpdate('general.visible', v)} />
        <Toggle label="Combat Only" checked={settings.general.combatOnly} onChange={v => onUpdate('general.combatOnly', v)} />
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#ddd', fontSize: '13px' }}>Opacity: {settings.general.opacity}%</span>
          <input type="range" min={10} max={100} value={settings.general.opacity} onChange={e => onUpdate('general.opacity', Number(e.target.value))} />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#ddd', fontSize: '13px' }}>Size</span>
          <select value={settings.general.size} onChange={e => onUpdate('general.size', e.target.value as WidgetSize)}
            style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', padding: '2px 6px' }}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: '#ddd', fontSize: '13px' }}>Position</span>
          <select value={settings.general.position} onChange={e => onUpdate('general.position', e.target.value as WidgetPosition)}
            style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', padding: '2px 6px' }}>
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </label>
      </Section>

      <Section title="Resistances">
        <Toggle label="Magic" checked={settings.resistances.magic} onChange={v => onUpdate('resistances.magic', v)} />
        <Toggle label="Fire" checked={settings.resistances.fire} onChange={v => onUpdate('resistances.fire', v)} />
        <Toggle label="Frost" checked={settings.resistances.frost} onChange={v => onUpdate('resistances.frost', v)} />
        <Toggle label="Shock" checked={settings.resistances.shock} onChange={v => onUpdate('resistances.shock', v)} />
        <Toggle label="Poison" checked={settings.resistances.poison} onChange={v => onUpdate('resistances.poison', v)} />
        <Toggle label="Disease" checked={settings.resistances.disease} onChange={v => onUpdate('resistances.disease', v)} />
      </Section>

      <Section title="Defense">
        <Toggle label="Armor Rating" checked={settings.defense.armorRating} onChange={v => onUpdate('defense.armorRating', v)} />
        <Toggle label="Damage Reduction" checked={settings.defense.damageReduction} onChange={v => onUpdate('defense.damageReduction', v)} />
      </Section>

      <Section title="Offense">
        <Toggle label="Right Hand Damage" checked={settings.offense.rightHandDamage} onChange={v => onUpdate('offense.rightHandDamage', v)} />
        <Toggle label="Left Hand Damage" checked={settings.offense.leftHandDamage} onChange={v => onUpdate('offense.leftHandDamage', v)} />
        <Toggle label="Critical Chance" checked={settings.offense.critChance} onChange={v => onUpdate('offense.critChance', v)} />
      </Section>

      <Section title="Movement">
        <Toggle label="Speed" checked={settings.movement.speedMult} onChange={v => onUpdate('movement.speedMult', v)} />
      </Section>
    </div>
  );
}
```

**Step 2: 빌드 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/src/components/SettingsPanel.tsx
git commit -m "feat: add SettingsPanel component with all widget toggles"
```

---

## Task 10: App.tsx - 전체 연결

**Files:**
- Modify: `view/src/App.tsx`
- Modify: `view/src/main.tsx`

**Step 1: App.tsx 작성**

`view/src/App.tsx`:
```tsx
import { WidgetContainer } from './components/WidgetContainer';
import { WidgetGroup } from './components/WidgetGroup';
import { StatWidget } from './components/StatWidget';
import { SettingsPanel } from './components/SettingsPanel';
import { useGameStats } from './hooks/useGameStats';
import { useSettings } from './hooks/useSettings';

const RESIST_CAP = 85;

export function App() {
  const stats = useGameStats();
  const { settings, settingsOpen, setSettingsOpen, updateSetting } = useSettings();

  const shouldShow = settings.general.visible &&
    (!settings.general.combatOnly || stats.isInCombat);

  return (
    <>
      <WidgetContainer
        position={settings.general.position}
        opacity={settings.general.opacity}
        size={settings.general.size}
        visible={shouldShow}
      >
        <WidgetGroup>
          <StatWidget icon="🔮" value={stats.resistances.magic} unit="%" visible={settings.resistances.magic} cap={RESIST_CAP} />
          <StatWidget icon="🔥" value={stats.resistances.fire} unit="%" visible={settings.resistances.fire} cap={RESIST_CAP} />
          <StatWidget icon="❄" value={stats.resistances.frost} unit="%" visible={settings.resistances.frost} cap={RESIST_CAP} />
          <StatWidget icon="⚡" value={stats.resistances.shock} unit="%" visible={settings.resistances.shock} cap={RESIST_CAP} />
          <StatWidget icon="☠" value={stats.resistances.poison} unit="%" visible={settings.resistances.poison} cap={RESIST_CAP} />
          <StatWidget icon="🦠" value={stats.resistances.disease} unit="%" visible={settings.resistances.disease} cap={RESIST_CAP} />
        </WidgetGroup>

        <WidgetGroup>
          <StatWidget icon="🛡" value={stats.defense.armorRating} visible={settings.defense.armorRating} />
          <StatWidget icon="🔰" value={stats.defense.damageReduction} unit="%" visible={settings.defense.damageReduction} />
        </WidgetGroup>

        <WidgetGroup>
          <StatWidget icon="⚔" value={stats.offense.rightHandDamage} visible={settings.offense.rightHandDamage} />
          <StatWidget icon="🗡" value={stats.offense.leftHandDamage} visible={settings.offense.leftHandDamage} />
          <StatWidget icon="💥" value={stats.offense.critChance} unit="%" visible={settings.offense.critChance} />
        </WidgetGroup>

        <WidgetGroup>
          <StatWidget icon="💨" value={stats.movement.speedMult} unit="%" visible={settings.movement.speedMult} />
        </WidgetGroup>
      </WidgetContainer>

      <SettingsPanel
        settings={settings}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpdate={updateSetting}
      />
    </>
  );
}
```

**Step 2: main.tsx 정리**

`view/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**Step 3: 빌드 + 브라우저에서 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npx tsc --noEmit && npm run build
```

Expected: 빌드 성공. `npm run dev`로 로컬 브라우저에서 모크 데이터로 위젯이 표시되는지 확인.

**Step 4: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/src/App.tsx view/src/main.tsx
git commit -m "feat: wire up App with all widgets, settings, and game stats"
```

---

## Task 11: xmake.lua 빌드 설정

**Files:**
- Create: `xmake.lua`

**Step 1: xmake.lua 작성**

`xmake.lua`:
```lua
-- set minimum xmake version
set_xmakever("2.8.2")

includes("lib/commonlibsse-ng")

set_project("TulliusWidgets")
set_version("0.1.0")
set_license("MIT")

set_languages("c++23")
set_warnings("allextra")

set_policy("package.requires_lock", true)

add_rules("mode.release")
add_rules("plugin.vsxmake.autoupdate")

target("TulliusWidgets")
    add_deps("commonlibsse-ng")

    add_rules("commonlibsse-ng.plugin", {
        name = "TulliusWidgets",
        author = "kdw73",
        description = "Combat stats HUD widgets powered by Prisma UI"
    })

    add_files("src/**.cpp")
    add_headerfiles("src/**.h")
    add_includedirs("src")
    set_pcxxheader("src/pch.h")
```

**Step 2: 빌드 확인 (Windows PowerShell 경유)**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
powershell.exe -Command "cd '$(wslpath -w .)'; xmake build 2>&1"
```

Expected: CommonLib-NG 의존성 빌드 시작 (시간이 걸릴 수 있음). main.cpp가 아직 없으므로 링크 에러 예상.

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add xmake.lua
git commit -m "chore: add xmake build configuration for SKSE plugin"
```

---

## Task 12: C++ StatsCollector 모듈

**Files:**
- Create: `src/StatsCollector.h`
- Create: `src/StatsCollector.cpp`

**Step 1: StatsCollector.h 작성**

`src/StatsCollector.h`:
```cpp
#pragma once

#include <string>

namespace TulliusWidgets {

class StatsCollector {
public:
    // Collect all combat stats and return as JSON string
    static std::string CollectStats();

private:
    static float GetResistance(RE::ActorValue av);
    static float GetArmorRating();
    static float CalculateDamageReduction(float armorRating);
};

}  // namespace TulliusWidgets
```

**Step 2: StatsCollector.cpp 작성**

`src/StatsCollector.cpp`:
```cpp
#include "StatsCollector.h"

namespace TulliusWidgets {

float StatsCollector::GetResistance(RE::ActorValue av) {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return 0.0f;
    return player->AsActorValueOwner()->GetActorValue(av);
}

float StatsCollector::GetArmorRating() {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return 0.0f;
    return player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kDamageResist);
}

float StatsCollector::CalculateDamageReduction(float armorRating) {
    // Skyrim armor formula: reduction = armor / (armor + 400) * 100
    // Cap at 80% (displayed armor rating 567)
    float reduction = (armorRating / (armorRating + 400.0f)) * 100.0f;
    return std::min(reduction, 80.0f);
}

std::string StatsCollector::CollectStats() {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return "{}";

    auto av = player->AsActorValueOwner();
    float armorRating = GetArmorRating();
    bool inCombat = player->IsInCombat();

    // Build JSON manually to avoid external dependency
    std::string json = "{";

    // Resistances
    json += "\"resistances\":{";
    json += "\"magic\":" + std::to_string(GetResistance(RE::ActorValue::kResistMagic)) + ",";
    json += "\"fire\":" + std::to_string(GetResistance(RE::ActorValue::kResistFire)) + ",";
    json += "\"frost\":" + std::to_string(GetResistance(RE::ActorValue::kResistFrost)) + ",";
    json += "\"shock\":" + std::to_string(GetResistance(RE::ActorValue::kResistShock)) + ",";
    json += "\"poison\":" + std::to_string(GetResistance(RE::ActorValue::kPoisonResist)) + ",";
    json += "\"disease\":" + std::to_string(GetResistance(RE::ActorValue::kResistDisease));
    json += "},";

    // Defense
    json += "\"defense\":{";
    json += "\"armorRating\":" + std::to_string(armorRating) + ",";
    json += "\"damageReduction\":" + std::to_string(CalculateDamageReduction(armorRating));
    json += "},";

    // Offense
    float rightDmg = 0.0f;
    float leftDmg = 0.0f;
    auto rightHand = player->GetEquippedObject(false);  // right hand
    auto leftHand = player->GetEquippedObject(true);     // left hand

    if (rightHand) {
        auto weapon = rightHand->As<RE::TESObjectWEAP>();
        if (weapon) {
            rightDmg = player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kMeleeDamage);
        }
    }
    if (leftHand) {
        auto weapon = leftHand->As<RE::TESObjectWEAP>();
        if (weapon) {
            leftDmg = static_cast<float>(weapon->GetAttackDamage());
        }
    }

    json += "\"offense\":{";
    json += "\"rightHandDamage\":" + std::to_string(rightDmg) + ",";
    json += "\"leftHandDamage\":" + std::to_string(leftDmg) + ",";
    json += "\"critChance\":0";  // TODO: calculate from perks
    json += "},";

    // Movement
    json += "\"movement\":{";
    json += "\"speedMult\":" + std::to_string(av->GetActorValue(RE::ActorValue::kSpeedMult));
    json += "},";

    // Combat state
    json += "\"isInCombat\":" + std::string(inCombat ? "true" : "false");

    json += "}";
    return json;
}

}  // namespace TulliusWidgets
```

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add src/StatsCollector.h src/StatsCollector.cpp
git commit -m "feat: add StatsCollector for combat stats collection"
```

---

## Task 13: C++ main.cpp - 플러그인 진입점

**Files:**
- Create: `src/main.cpp`

**Step 1: main.cpp 작성**

`src/main.cpp`:
```cpp
#include "PrismaUI_API.h"
#include "StatsCollector.h"
#include <keyhandler/keyhandler.h>

PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;
static PrismaView view = 0;

static void SendStatsToView() {
    if (!PrismaUI || !view) return;

    std::string stats = TulliusWidgets::StatsCollector::CollectStats();
    PrismaUI->Invoke(view, "updateStats('" + stats + "')");
}

// Event sink: combat state change
class CombatEventSink : public RE::BSTEventSink<RE::TESCombatEvent> {
public:
    static CombatEventSink* GetSingleton() {
        static CombatEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESCombatEvent*, RE::BSTEventSource<RE::TESCombatEvent>*) override {
        SendStatsToView();
        return RE::BSEventNotifyControl::kContinue;
    }
};

// Event sink: equip/unequip
class EquipEventSink : public RE::BSTEventSink<RE::TESEquipEvent> {
public:
    static EquipEventSink* GetSingleton() {
        static EquipEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESEquipEvent*, RE::BSTEventSource<RE::TESEquipEvent>*) override {
        SendStatsToView();
        return RE::BSEventNotifyControl::kContinue;
    }
};

// Event sink: active effects (buffs/debuffs)
class ActiveEffectEventSink : public RE::BSTEventSink<RE::TESActiveEffectApplyRemoveEvent> {
public:
    static ActiveEffectEventSink* GetSingleton() {
        static ActiveEffectEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESActiveEffectApplyRemoveEvent*, RE::BSTEventSource<RE::TESActiveEffectApplyRemoveEvent>*) override {
        SendStatsToView();
        return RE::BSEventNotifyControl::kContinue;
    }
};

static void RegisterEventSinks() {
    auto scriptEventSource = RE::ScriptEventSourceHolder::GetSingleton();
    if (scriptEventSource) {
        scriptEventSource->AddEventSink(CombatEventSink::GetSingleton());
        scriptEventSource->AddEventSink(EquipEventSink::GetSingleton());
        scriptEventSource->AddEventSink(ActiveEffectEventSink::GetSingleton());
        logger::info("Event sinks registered");
    }
}

static void SKSEMessageHandler(SKSE::MessagingInterface::Message* message) {
    switch (message->type) {
    case SKSE::MessagingInterface::kDataLoaded: {
        // 1. Initialize PrismaUI API
        PrismaUI = static_cast<PRISMA_UI_API::IVPrismaUI1*>(
            PRISMA_UI_API::RequestPluginAPI(PRISMA_UI_API::InterfaceVersion::V1)
        );

        if (!PrismaUI) {
            logger::error("Failed to initialize PrismaUI API. Is PrismaUI installed?");
            return;
        }

        logger::info("PrismaUI API initialized");

        // 2. Create view
        view = PrismaUI->CreateView("TulliusWidgets/index.html", [](PrismaView v) -> void {
            logger::info("TulliusWidgets view ready (id: {})", v);
            // Send initial stats when DOM is ready
            SendStatsToView();
        });

        // 3. Register JS listener for settings changes
        PrismaUI->RegisterJSListener(view, "onSettingsChanged", [](const char* data) -> void {
            logger::info("Settings changed from UI");
            // TODO: Save settings to file
        });

        // 4. Register event sinks for reactive updates
        RegisterEventSinks();

        // 5. Set up key handlers
        KeyHandler::RegisterSink();
        KeyHandler* keyHandler = KeyHandler::GetSingleton();

        // F10 = 0x44 to toggle settings panel
        keyHandler->Register(0x44, KeyEventType::KEY_DOWN, []() {
            if (PrismaUI && view) {
                PrismaUI->Invoke(view, "toggleSettings()");

                auto hasFocus = PrismaUI->HasFocus(view);
                if (!hasFocus) {
                    PrismaUI->Focus(view);
                } else {
                    PrismaUI->Unfocus(view);
                }
            }
        });

        // F11 = 0x57 to toggle widget visibility
        keyHandler->Register(0x57, KeyEventType::KEY_DOWN, []() {
            if (PrismaUI && view) {
                static bool hidden = false;
                hidden = !hidden;
                if (hidden) {
                    PrismaUI->Hide(view);
                } else {
                    PrismaUI->Show(view);
                    SendStatsToView();
                }
            }
        });

        break;
    }
    }
}

extern "C" DLLEXPORT bool SKSEAPI SKSEPlugin_Load(const SKSE::LoadInterface* a_skse) {
    REL::Module::reset();

    auto g_messaging = reinterpret_cast<SKSE::MessagingInterface*>(
        a_skse->QueryInterface(SKSE::LoadInterface::kMessaging)
    );

    if (!g_messaging) {
        logger::critical("Failed to load messaging interface! Plugin will not load.");
        return false;
    }

    SKSE::Init(a_skse);
    SKSE::AllocTrampoline(1 << 10);

    g_messaging->RegisterListener("SKSE", SKSEMessageHandler);

    logger::info("TulliusWidgets loaded");
    return true;
}
```

**Step 2: 빌드 확인**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
powershell.exe -Command "cd '$(wslpath -w .)'; xmake build 2>&1"
```

Expected: 컴파일 성공 → `build/` 에 `TulliusWidgets.dll` 생성

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add src/main.cpp
git commit -m "feat: add SKSE plugin entry point with Prisma UI, events, and key handlers"
```

---

## Task 14: React 프론트엔드 빌드 & 출력 경로 설정

**Files:**
- Modify: `view/vite.config.ts`

**Step 1: Vite 빌드 설정을 Prisma UI 배포 구조에 맞게 수정**

Prisma UI는 `Skyrim/Data/PrismaUI/views/TulliusWidgets/` 에서 파일을 로드합니다.

`view/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../dist/PrismaUI/views/TulliusWidgets',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
```

**Step 2: 빌드 실행**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npm run build
```

Expected: `dist/PrismaUI/views/TulliusWidgets/` 에 `index.html` + `assets/` 생성

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add view/vite.config.ts
git commit -m "chore: configure Vite output for Prisma UI directory structure"
```

---

## Task 15: 배포 패키지 & FOMOD 구조

**Files:**
- Create: `scripts/package.sh`

**Step 1: 패키징 스크립트 작성**

`scripts/package.sh`:
```bash
#!/bin/bash
set -e

DIST_DIR="dist"
PLUGIN_NAME="TulliusWidgets"

echo "=== Building React frontend ==="
cd view && npm run build && cd ..

echo "=== Building SKSE plugin ==="
powershell.exe -Command "cd '$(wslpath -w .)'; xmake build 2>&1"

echo "=== Packaging ==="
# Copy DLL to dist
mkdir -p "$DIST_DIR/SKSE/Plugins"
cp "build/windows/x64/release/$PLUGIN_NAME.dll" "$DIST_DIR/SKSE/Plugins/" 2>/dev/null || \
  echo "WARNING: DLL not found. Build the C++ plugin on Windows first."

echo "=== Package ready in $DIST_DIR/ ==="
echo "Copy contents of $DIST_DIR/ into Skyrim/Data/ to install."
```

**Step 2: 실행 권한 부여**

```bash
chmod +x "/home/kdw73/projects/Tullius Widgets/scripts/package.sh"
```

**Step 3: 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add scripts/package.sh
git commit -m "chore: add packaging script for distribution"
```

---

## Task 16: 브라우저에서 최종 확인 & 정리

**Step 1: React 개발 서버 실행**

```bash
cd "/home/kdw73/projects/Tullius Widgets/view"
npm run dev
```

Expected: 브라우저에서 `http://localhost:5173` 접속 → 모크 데이터로 위젯이 우측 하단에 표시

**Step 2: 기능 확인 목록**

브라우저 콘솔에서 테스트:
```javascript
// 스탯 업데이트 시뮬레이션
window.updateStats(JSON.stringify({
  resistances: { magic: 85, fire: 60, frost: 0, shock: -10, poison: 50, disease: 100 },
  defense: { armorRating: 400, damageReduction: 50 },
  offense: { rightHandDamage: 120, leftHandDamage: 30, critChance: 25 },
  movement: { speedMult: 130 },
  isInCombat: true
}));

// 설정 패널 토글
window.toggleSettings();
```

Expected:
- magic=85% 는 골드색으로 표시 (캡 도달)
- shock=-10% 는 빨간색으로 표시 (음수)
- 설정 패널에서 개별 위젯 on/off 작동

**Step 3: 최종 커밋**

```bash
cd "/home/kdw73/projects/Tullius Widgets"
git add -A
git commit -m "feat: complete Tullius Widgets v0.1.0 - React frontend + SKSE plugin"
```
