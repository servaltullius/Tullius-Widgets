import { useMemo } from 'react';
import type { Language } from '../types/settings';
import type { GameTimeInfo } from '../types/stats';
import { StatWidget } from './StatWidget';
import {
  formatGameDateTime,
  formatRealDateTime,
  TIME_WIDGET_VALUE_MAX_WIDTH,
  useSharedTimeWidgetClock,
} from '../utils/timeWidgetShared';

interface TimeWidgetListProps {
  gameTime: GameTimeInfo;
  showGameDateTime: boolean;
  showRealDateTime: boolean;
  lang: Language;
}

export function TimeWidgetList({ gameTime, showGameDateTime, showRealDateTime, lang }: TimeWidgetListProps) {
  const nowMs = useSharedTimeWidgetClock(gameTime.snapshotAtMs);

  const gameDateTime = useMemo(() => formatGameDateTime(gameTime, nowMs, lang), [gameTime, nowMs, lang]);
  const realDateTime = useMemo(() => formatRealDateTime(nowMs, lang), [nowMs, lang]);

  return (
    <>
      <StatWidget
        icon="gameTime"
        iconColor="#d8b96b"
        value={gameDateTime}
        visible={showGameDateTime}
        prominence="secondary"
        valueMaxWidth={TIME_WIDGET_VALUE_MAX_WIDTH}
      />
      <StatWidget
        icon="realTime"
        iconColor="#77d8ff"
        value={realDateTime}
        visible={showRealDateTime}
        prominence="secondary"
        valueMaxWidth={TIME_WIDGET_VALUE_MAX_WIDTH}
      />
    </>
  );
}
