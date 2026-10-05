import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TeamCalendarEntry } from '../../core/api/models';
import { daysInMonth, fmtRange, isWeekend, todayIso } from '../util/dates';

interface Row {
  name: string;
  cells: ({ kind: 'day'; date: string; weekend: boolean; holiday: string | null } | { kind: 'leave'; span: number; entry: TeamCalendarEntry })[];
}

/**
 * "Who's away" month strip: one row per person, one column per day. Approved leave is a solid bar,
 * pending leave a dashed one; weekends are hatched and holidays tinted gold.
 */
@Component({
  selector: 'wv-leave-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legend" aria-hidden="true">
      <span><i class="sw approved"></i>Approved</span>
      <span><i class="sw pending"></i>Pending</span>
      <span><i class="sw holiday"></i>Holiday</span>
    </div>
    @if (rows().length === 0) {
      <p class="empty">Nobody is away this month.</p>
    } @else {
      <div class="scroll">
        <div class="grid" [style.--days]="days().length" role="table" [attr.aria-label]="'Leave in ' + month()">
          <div role="row" class="row head">
            <div role="columnheader" class="name"><span class="sr-only">Person</span></div>
            @for (d of days(); track d.date) {
              <div role="columnheader" class="d" [class.we]="d.weekend" [class.today]="d.date === today">{{ d.num }}</div>
            }
          </div>
          @for (row of rows(); track row.name) {
            <div role="row" class="row">
              <div role="rowheader" class="name" [title]="row.name">{{ row.name }}</div>
              @for (cell of row.cells; track $index) {
                @if (cell.kind === 'leave') {
                  <div role="cell" class="bar-cell" [style.grid-column]="'span ' + cell.span">
                    <div class="bar" [class.pending]="cell.entry.status === 'PENDING'"
                      [title]="cell.entry.employeeName + ', ' + cell.entry.leaveTypeCode + ', ' + range(cell.entry) + (cell.entry.status === 'PENDING' ? ' (pending)' : '')">
                      {{ cell.entry.leaveTypeCode }}
                    </div>
                  </div>
                } @else {
                  <div role="cell" class="cell" [class.we]="cell.weekend" [class.hol]="!!cell.holiday" [title]="cell.holiday ?? ''"></div>
                }
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .legend { display: flex; gap: 16px; justify-content: flex-end; font-size: var(--wv-text-sm); color: var(--wv-muted); margin-bottom: 12px; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .sw { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
    .sw.approved { background: var(--wv-leaf); }
    .sw.pending { background: var(--wv-gold-soft); border: 1px dashed var(--wv-gold); }
    .sw.holiday { background: var(--wv-gold-soft); }
    .empty { color: var(--wv-muted); margin: 8px 0; }
    .scroll { overflow-x: auto; }
    .grid { min-width: 760px; display: flex; flex-direction: column; gap: 8px; }
    .row { display: grid; grid-template-columns: 150px repeat(var(--days), minmax(0, 1fr)); align-items: center; }
    .d { text-align: center; font-size: 12px; color: var(--wv-muted); }
    .d.we { opacity: 0.55; }
    .d.today { color: var(--wv-ink); font-weight: 700; }
    .name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px; }
    .cell { height: 26px; border-left: 1px solid var(--wv-line); }
    .cell.we { background: repeating-linear-gradient(135deg, transparent 0 4px, var(--wv-line) 4px 5px); }
    .cell.hol { background: var(--wv-gold-soft); }
    .bar-cell { min-width: 0; }
    .bar {
      height: 22px; margin: 2px; border-radius: 7px; display: flex; align-items: center; padding: 0 8px;
      font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden;
      background: var(--wv-leaf); color: var(--wv-leaf-ink);
    }
    .bar.pending { background: var(--wv-gold-soft); color: var(--wv-gold-text); border: 1px dashed var(--wv-gold); }
  `,
})
export class LeaveStrip {
  /** "2026-10" */
  readonly month = input.required<string>();
  readonly entries = input<TeamCalendarEntry[]>([]);
  /** date -> holiday name */
  readonly holidays = input<Record<string, string>>({});

  protected readonly today = todayIso();

  protected readonly days = computed(() =>
    Array.from({ length: daysInMonth(this.month()) }, (_, i) => {
      const date = `${this.month()}-${String(i + 1).padStart(2, '0')}`;
      return { date, num: i + 1, weekend: isWeekend(date) };
    }),
  );

  protected readonly rows = computed<Row[]>(() => {
    const first = `${this.month()}-01`;
    const last = `${this.month()}-${String(this.days().length).padStart(2, '0')}`;
    const byPerson = new Map<string, TeamCalendarEntry[]>();
    for (const e of this.entries()) {
      byPerson.set(e.employeeName, [...(byPerson.get(e.employeeName) ?? []), e]);
    }
    return [...byPerson.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]) => {
        const cells: Row['cells'] = [];
        let i = 0;
        while (i < this.days().length) {
          const day = this.days()[i];
          const entry = list.find((e) => (e.startDate < first ? first : e.startDate) === day.date);
          if (entry) {
            const end = entry.endDate > last ? last : entry.endDate;
            const span = Number(end.slice(8)) - day.num + 1;
            cells.push({ kind: 'leave', span, entry });
            i += span;
          } else {
            cells.push({ kind: 'day', date: day.date, weekend: day.weekend, holiday: this.holidays()[day.date] ?? null });
            i++;
          }
        }
        return { name, cells };
      });
  });

  protected range(e: TeamCalendarEntry): string {
    return fmtRange(e.startDate, e.endDate);
  }
}
