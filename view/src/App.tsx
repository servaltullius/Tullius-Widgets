import { useCallback, useState } from 'react';
import { DraggableWidgetGroup } from './components/DraggableWidgetGroup';
import { StatWidget } from './components/StatWidget';
import { SettingsPanel } from './components/SettingsPanel';
import { ScreenEffects } from './components/ScreenEffects';
import { useGameStats } from './hooks/useGameStats';
import { useSettings } from './hooks/useSettings';
import { getDefaultPositions } from './data/defaultSettings';
import type { GroupPosition } from './types/settings';

const ELEMENTAL_RESIST_CAP = 85;
const ELEMENTAL_RESIST_MIN = -100;
const DISEASE_RESIST_CAP = 100;
const DISEASE_RESIST_MIN = 0;
const CRIT_CHANCE_CAP = 100;
const CRIT_CHANCE_MIN = 0;
const GROUP_IDS = ['playerInfo', 'resistances', 'defense', 'offense', 'movement'] as const;
const SNAP_THRESHOLD = 15;
const GRID = 10;
const FALLBACK_POS: GroupPosition = { x: 100, y: 100 };

function formatWeight(v: number) {
  return v.toFixed(1);
}

function formatGold(v: number) {
  return v.toLocaleString();
}

function snapPosition(
  groupId: string,
  rawX: number,
  rawY: number,
  getPositionById: (id: string) => GroupPosition,
): GroupPosition {
  let x = rawX;
  let y = rawY;
  let snappedX = false;
  let snappedY = false;

  for (const otherId of GROUP_IDS) {
    if (otherId === groupId) continue;
    const otherPos = getPositionById(otherId);
    if (!snappedX && Math.abs(x - otherPos.x) < SNAP_THRESHOLD) {
      x = otherPos.x;
      snappedX = true;
    }
    if (!snappedY && Math.abs(y - otherPos.y) < SNAP_THRESHOLD) {
      y = otherPos.y;
      snappedY = true;
    }
  }

  if (!snappedX) x = Math.round(x / GRID) * GRID;
  if (!snappedY) y = Math.round(y / GRID) * GRID;

  return { x, y };
}

export function App() {
  const stats = useGameStats();
  const { settings, settingsOpen, closeSettings, updateSetting, accentColor } = useSettings();
  const [dragPositions, setDragPositions] = useState<Record<string, GroupPosition>>({});
  const defaults = getDefaultPositions();

  const shouldShow = settings.general.visible &&
    (!settings.general.combatOnly || stats.isInCombat);

  const resolvePosition = useCallback((groupId: string): GroupPosition => {
    return dragPositions[groupId] ?? settings.positions[groupId] ?? defaults[groupId] ?? FALLBACK_POS;
  }, [defaults, dragPositions, settings.positions]);

  const handleGroupMove = useCallback((groupId: string, rawX: number, rawY: number) => {
    const getPositionById = (id: string): GroupPosition =>
      dragPositions[id] ?? settings.positions[id] ?? defaults[id] ?? FALLBACK_POS;
    const snapped = snapPosition(groupId, rawX, rawY, getPositionById);
    setDragPositions(prev => ({ ...prev, [groupId]: snapped }));
  }, [defaults, dragPositions, settings.positions]);

  const handleGroupMoveEnd = useCallback((groupId: string, rawX: number, rawY: number) => {
    const getPositionById = (id: string): GroupPosition =>
      dragPositions[id] ?? settings.positions[id] ?? defaults[id] ?? FALLBACK_POS;
    const snapped = snapPosition(groupId, rawX, rawY, getPositionById);

    setDragPositions(prev => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    updateSetting(`positions.${groupId}`, snapped);
  }, [defaults, dragPositions, settings.positions, updateSetting]);

  const groupProps = (groupId: string) => {
    const pos = resolvePosition(groupId);
    return {
      groupId,
      x: pos.x,
      y: pos.y,
      opacity: settings.general.opacity,
      size: settings.general.size,
      layout: settings.layouts[groupId] ?? 'vertical',
      accentColor,
      transparentBg: settings.general.transparentBg,
      draggable: settingsOpen,
      onMove: handleGroupMove,
      onDragEnd: handleGroupMoveEnd,
    };
  };

  const hasVisibleResistance = Object.values(settings.resistances).some(Boolean);
  const hasVisibleDefense = Object.values(settings.defense).some(Boolean);
  const hasVisibleOffense = Object.values(settings.offense).some(Boolean);
  const hasVisibleMovement = settings.movement.speedMult;
  const hasVisiblePlayerInfo = Object.values(settings.playerInfo).some(Boolean);

  return (
    <>
      {shouldShow && (
        <>
          {hasVisiblePlayerInfo && (
            <DraggableWidgetGroup {...groupProps('playerInfo')}>
              <StatWidget icon="level" iconColor="#ffd700" value={stats.playerInfo.level} visible={settings.playerInfo.level} />
              <StatWidget icon="gold" iconColor="#f0c040" value={stats.playerInfo.gold} visible={settings.playerInfo.gold} format={formatGold} />
              <StatWidget icon="weight" iconColor="#cc9966" value={stats.playerInfo.carryWeight} unit={`/${Math.round(stats.playerInfo.maxCarryWeight)}`} visible={settings.playerInfo.carryWeight} format={formatWeight} />
              <StatWidget icon="health" iconColor="#e84040" value={stats.playerInfo.health} visible={settings.playerInfo.health} />
              <StatWidget icon="magicka" iconColor="#4090e8" value={stats.playerInfo.magicka} visible={settings.playerInfo.magicka} />
              <StatWidget icon="stamina" iconColor="#40c840" value={stats.playerInfo.stamina} visible={settings.playerInfo.stamina} />
            </DraggableWidgetGroup>
          )}

          {hasVisibleResistance && (
            <DraggableWidgetGroup {...groupProps('resistances')}>
              <StatWidget icon="magic" iconColor="#b366ff" value={stats.resistances.magic} unit="%" visible={settings.resistances.magic} min={ELEMENTAL_RESIST_MIN} cap={ELEMENTAL_RESIST_CAP} />
              <StatWidget icon="fire" iconColor="#ff6633" value={stats.resistances.fire} unit="%" visible={settings.resistances.fire} min={ELEMENTAL_RESIST_MIN} cap={ELEMENTAL_RESIST_CAP} />
              <StatWidget icon="frost" iconColor="#66ccff" value={stats.resistances.frost} unit="%" visible={settings.resistances.frost} min={ELEMENTAL_RESIST_MIN} cap={ELEMENTAL_RESIST_CAP} />
              <StatWidget icon="shock" iconColor="#ffdd33" value={stats.resistances.shock} unit="%" visible={settings.resistances.shock} min={ELEMENTAL_RESIST_MIN} cap={ELEMENTAL_RESIST_CAP} />
              <StatWidget icon="poison" iconColor="#66ff66" value={stats.resistances.poison} unit="%" visible={settings.resistances.poison} min={ELEMENTAL_RESIST_MIN} cap={ELEMENTAL_RESIST_CAP} />
              <StatWidget icon="disease" iconColor="#99cc66" value={stats.resistances.disease} unit="%" visible={settings.resistances.disease} min={DISEASE_RESIST_MIN} cap={DISEASE_RESIST_CAP} />
            </DraggableWidgetGroup>
          )}

          {hasVisibleDefense && (
            <DraggableWidgetGroup {...groupProps('defense')}>
              <StatWidget icon="armor" iconColor="#aabbcc" value={stats.defense.armorRating} visible={settings.defense.armorRating} />
              <StatWidget icon="damageReduce" iconColor="#44aaaa" value={stats.defense.damageReduction} unit="%" visible={settings.defense.damageReduction} />
            </DraggableWidgetGroup>
          )}

          {hasVisibleOffense && (
            <DraggableWidgetGroup {...groupProps('offense')}>
              <StatWidget icon="rightHand" iconColor="#e85050" value={stats.offense.rightHandDamage} visible={settings.offense.rightHandDamage} />
              <StatWidget icon="leftHand" iconColor="#e88080" value={stats.offense.leftHandDamage} visible={settings.offense.leftHandDamage} />
              <StatWidget icon="crit" iconColor="#ff8800" value={stats.offense.critChance} unit="%" visible={settings.offense.critChance} min={CRIT_CHANCE_MIN} cap={CRIT_CHANCE_CAP} />
            </DraggableWidgetGroup>
          )}

          {hasVisibleMovement && (
            <DraggableWidgetGroup {...groupProps('movement')}>
              <StatWidget icon="speed" iconColor="#44ddff" value={stats.movement.speedMult} unit="%" visible={settings.movement.speedMult} />
            </DraggableWidgetGroup>
          )}
        </>
      )}

      <ScreenEffects alertData={stats.alertData} settings={settings} />

      <SettingsPanel
        settings={settings}
        open={settingsOpen}
        onClose={closeSettings}
        onUpdate={updateSetting}
        accentColor={accentColor}
      />
    </>
  );
}
