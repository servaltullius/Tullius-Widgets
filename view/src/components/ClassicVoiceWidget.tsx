import { memo, type ComponentProps } from 'react';
import { useCooldown } from '../hooks/useCooldown';
import { StatWidget } from './StatWidget';

type ClassicVoiceWidgetProps = Omit<ComponentProps<typeof StatWidget>, 'helperText' | 'helperTone'> & {
  cooldownSec: number;
  cooldownTemplate: string;
};

// Classic voice card: shows the shout/power and, while it recovers, a ticking "{n}s" line.
export const ClassicVoiceWidget = memo(function ClassicVoiceWidget({ cooldownSec, cooldownTemplate, ...props }: ClassicVoiceWidgetProps) {
  const { remaining } = useCooldown(cooldownSec);
  const helperText = remaining > 0.05 ? cooldownTemplate.replace('{n}', String(Math.ceil(remaining))) : undefined;
  return <StatWidget {...props} helperText={helperText} helperTone="warning" />;
});
