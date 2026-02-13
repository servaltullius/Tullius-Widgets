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
