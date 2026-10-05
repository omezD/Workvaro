// Date helpers that work on plain "yyyy-MM-dd" strings, matching the backend's LocalDate values.
// All calculations use the browser's local calendar day, never UTC, so dates don't shift by a day.

/** Date -> "2026-10-05" in local time. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-10-05" -> local midnight Date. */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(): string {
  return isoDate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** "2026-10" for the month containing `iso` (default: today). */
export function monthKey(iso: string = todayIso()): string {
  return iso.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return isoDate(d).slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function isWeekend(iso: string): boolean {
  const day = parseIso(iso).getDay();
  return day === 0 || day === 6;
}

/**
 * Leave days between two dates inclusive, skipping Saturdays, Sundays and holidays.
 * Same rule as the backend's LeaveDayCalculator, used for the live count in the apply form.
 */
export function workingDays(start: string, end: string, holidays: ReadonlySet<string> = new Set()): number {
  if (end < start) {
    return 0;
  }
  let count = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!isWeekend(d) && !holidays.has(d)) {
      count++;
    }
  }
  return count;
}

const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const weekdayDayMonth = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
const time = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

/** "5 Oct" */
export const fmtDay = (iso: string) => dayMonth.format(parseIso(iso));
/** "5 Oct 2026" */
export const fmtDate = (iso: string) => dayMonthYear.format(parseIso(iso));
/** "Mon, 5 Oct" */
export const fmtWeekday = (iso: string) => weekdayDayMonth.format(parseIso(iso));
/** "October 2026" */
export const fmtMonth = (month: string) => monthYear.format(parseIso(month + '-01'));
/** Instant -> "09:12" in local time */
export const fmtTime = (instant: string) => time.format(new Date(instant));

/** "12 to 13 Oct" or "7 Oct" */
export function fmtRange(start: string, end: string): string {
  if (start === end) {
    return fmtDay(start);
  }
  const s = parseIso(start);
  const e = parseIso(end);
  return s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
    ? `${s.getDate()} to ${fmtDay(end)}`
    : `${fmtDay(start)} to ${fmtDay(end)}`;
}

/** 134 -> "2h 14m" */
export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
