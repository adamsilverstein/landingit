import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { timeAgo } from '../utils/timeAgo.js';

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for dates less than 60 seconds ago', () => {
    expect(timeAgo('2026-03-25T11:59:30Z')).toBe('just now');
  });

  it('returns minutes for dates less than an hour ago', () => {
    expect(timeAgo('2026-03-25T11:45:00Z')).toBe('15m ago');
    expect(timeAgo('2026-03-25T11:01:00Z')).toBe('59m ago');
  });

  it('returns hours for dates less than a day ago', () => {
    expect(timeAgo('2026-03-25T09:00:00Z')).toBe('3h ago');
    expect(timeAgo('2026-03-24T13:00:00Z')).toBe('23h ago');
  });

  it('returns days for dates less than 30 days ago', () => {
    expect(timeAgo('2026-03-24T12:00:00Z')).toBe('1d ago');
    expect(timeAgo('2026-03-01T12:00:00Z')).toBe('24d ago');
  });

  it('returns months for dates 30+ days ago', () => {
    expect(timeAgo('2026-02-20T12:00:00Z')).toBe('1mo ago');
    expect(timeAgo('2025-12-25T12:00:00Z')).toBe('3mo ago');
  });

  it('handles NaN/invalid dates gracefully', () => {
    const result = timeAgo('not-a-date');
    expect(typeof result).toBe('string');
  });

  it('handles future dates', () => {
    const result = timeAgo('2026-04-01T00:00:00Z');
    // Future dates result in negative seconds, which is < 60
    expect(result).toBe('just now');
  });
});
