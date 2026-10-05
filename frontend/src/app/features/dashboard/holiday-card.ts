import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Holiday } from '../../core/api/models';
import { fmtDay, parseIso, todayIso } from '../../shared/util/dates';

@Component({
  selector: 'wv-holiday-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'wv-card' },
  template: `
    <h2>Next holiday</h2>
    @if (next(); as h) {
      <div class="next">
        <div class="chip" aria-hidden="true"><i>{{ monthShort(h.date) }}</i><b>{{ dayNum(h.date) }}</b></div>
        <div>
          <strong>{{ h.name }}</strong>
          <div class="wv-muted">{{ weekday(h.date) }}, {{ inDays(h.date) }}</div>
        </div>
      </div>
      @if (later().length) {
        <ul>
          @for (h of later(); track h.id) {
            <li><span>{{ h.name }}</span><span class="wv-muted">{{ day(h.date) }}</span></li>
          }
        </ul>
      }
    } @else {
      <p class="wv-muted">No holidays in the next three months.</p>
    }
    <a routerLink="/app/holidays" class="all">All holidays</a>
  `,
  styles: `
    :host { display: flex; flex-direction: column; }
    h2 { font-size: var(--wv-text-lg); margin-bottom: 14px; }
    .next { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
    .chip { width: 56px; border-radius: 12px; overflow: hidden; text-align: center; border: 1px solid var(--wv-line); flex: none; }
    .chip i { display: block; font-style: normal; background: var(--wv-gold); color: var(--wv-gold-ink); font-size: 12px; font-weight: 600; padding: 2px 0; }
    .chip b { display: block; font-family: var(--wv-font-display); font-size: 24px; padding: 4px 0 6px; }
    ul { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px solid var(--wv-line); display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
    li { display: flex; justify-content: space-between; gap: 8px; }
    .all { margin-top: auto; padding-top: 12px; font-size: 14px; font-weight: 500; text-decoration: none; }
  `,
})
export class HolidayCard {
  readonly holidays = input<Holiday[]>([]);

  private readonly upcoming = computed(() => this.holidays().filter((h) => h.date >= todayIso()));
  protected readonly next = computed(() => this.upcoming()[0] ?? null);
  protected readonly later = computed(() => this.upcoming().slice(1, 3));

  protected monthShort(iso: string) {
    return parseIso(iso).toLocaleString('en-IN', { month: 'short' });
  }
  protected dayNum(iso: string) {
    return Number(iso.slice(8));
  }
  protected weekday(iso: string) {
    return parseIso(iso).toLocaleString('en-IN', { weekday: 'long' });
  }
  protected day(iso: string) {
    return fmtDay(iso);
  }
  protected inDays(iso: string) {
    const days = Math.round((parseIso(iso).getTime() - parseIso(todayIso()).getTime()) / 86400000);
    return days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  }
}
