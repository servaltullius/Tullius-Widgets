import { describe, expect, it } from 'vitest';
import { formatDaysPassed } from './timeWidgetShared';

describe('formatDaysPassed', () => {
  it('shows whole days with the singular form for exactly one day', () => {
    expect(formatDaysPassed(0, '{n} day', '{n} days')).toBe('0 days');
    expect(formatDaysPassed(1, '{n} day', '{n} days')).toBe('1 day');
    expect(formatDaysPassed(41, '{n} day', '{n} days')).toBe('41 days');
  });

  it('floors partial days and never goes below zero', () => {
    expect(formatDaysPassed(41.99, '{n}일', '{n}일')).toBe('41일');
    expect(formatDaysPassed(-3, '{n}일', '{n}일')).toBe('0일');
  });

  it('shows zero rather than NaN for a value that is not a number', () => {
    expect(formatDaysPassed(Number.NaN, '{n} day', '{n} days')).toBe('0 days');
    expect(formatDaysPassed(Number.POSITIVE_INFINITY, '{n} day', '{n} days')).toBe('0 days');
  });

  it('groups thousands', () => {
    expect(formatDaysPassed(1234, '{n} day', '{n} days')).toBe('1,234 days');
  });
});
