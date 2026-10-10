// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClassicVoiceWidget } from './ClassicVoiceWidget';

describe('ClassicVoiceWidget', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
  });

  function render(cooldownSec: number) {
    act(() => {
      root!.render(
        <ClassicVoiceWidget icon="voice" iconColor="#d8c17a" value="불사의 외침" visible cooldownSec={cooldownSec} cooldownTemplate="대기 {n}초" />,
      );
    });
    return container.textContent ?? '';
  }

  it('shows the remaining shout cooldown only while recovering', () => {
    expect(render(12)).toContain('대기 12초');
    act(() => root!.unmount());
    root = createRoot(container);
    expect(render(0)).not.toContain('대기');
  });
});
