import { describe, expect, it } from 'vitest';
import { addMonths, daysInMonth, fmtDuration, fmtRange, workingDays } from './dates';

describe('workingDays (mirrors the backend rule)', () => {
  // 2026-10-05 is a Monday
  it('counts weekdays only', () => {
    expect(workingDays('2026-10-05', '2026-10-11')).toBe(5);
  });

  it('skips holidays', () => {
    expect(workingDays('2026-10-19', '2026-10-23', new Set(['2026-10-20']))).toBe(4);
  });

  it('is zero for a weekend-only or reversed range', () => {
    expect(workingDays('2026-10-10', '2026-10-11')).toBe(0);
    expect(workingDays('2026-10-12', '2026-10-09')).toBe(0);
  });
});

describe('month helpers', () => {
  it('moves across year boundaries', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('knows month lengths', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-10')).toBe(31);
  });
});

describe('formatting', () => {
  it('formats ranges and durations', () => {
    expect(fmtRange('2026-10-12', '2026-10-13')).toBe('12 to 13 Oct');
    expect(fmtRange('2026-10-07', '2026-10-07')).toBe('7 Oct');
    expect(fmtDuration(134)).toBe('2h 14m');
    expect(fmtDuration(45)).toBe('45m');
  });
});
