import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { LeaveApi } from '../../core/api/leave.api';
import { NotifyService } from '../../core/notify/notify.service';
import { apiMessage } from '../../core/http/api-error';
import { fmtDuration, fmtTime, monthKey, todayIso } from '../../shared/util/dates';
import { openCorrection } from './correction-dialog';

const WORKDAY_MINUTES = 9 * 60;

/** The day's check-in/out. The one bold (forest) card on each dashboard. */
@Component({
  selector: 'wv-my-day-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule],
  template: `
    <svg class="arc" viewBox="0 0 220 220" aria-hidden="true">
      <circle cx="110" cy="110" r="90" fill="none" stroke="rgb(255 255 255 / 7%)" stroke-width="18" />
      <circle cx="110" cy="110" r="90" fill="none" stroke="var(--wv-leaf)" stroke-width="18" stroke-linecap="round"
        [attr.stroke-dasharray]="arcLength" [attr.stroke-dashoffset]="arcOffset()" transform="rotate(-90 110 110)" />
    </svg>
    <h2>My day</h2>
    @switch (state()) {
      @case ('loading') {
        <p class="sub">Loading your day...</p>
        <div class="big">--:--</div>
      }
      @case ('out') {
        <p class="sub">You haven't checked in yet</p>
        <div class="big">{{ clock() }}</div>
        <p class="sub">Check in when you start work. Your hours are counted from then.</p>
      }
      @case ('in') {
        <p class="sub">Checked in at {{ time(record()!.checkIn) }}</p>
        <div class="big">{{ hours() }}<small>so far</small></div>
        <p class="sub">A standard day is 9 hours. Check out when you leave.</p>
      }
      @case ('done') {
        <p class="sub">Done for today, {{ time(record()!.checkIn) }} to {{ time(record()!.checkOut!) }}</p>
        <div class="big">{{ hours() }}<small>worked</small></div>
        <p class="sub">See you tomorrow.</p>
      }
    }
    <div class="actions">
      @if (state() === 'out') {
        <button mat-flat-button type="button" [disabled]="busy()" (click)="checkIn()">Check in</button>
      } @else if (state() === 'in') {
        <button mat-flat-button type="button" [disabled]="busy()" (click)="checkOut()">Check out</button>
      }
      <button mat-stroked-button type="button" class="ghost" (click)="requestFix()">Request a correction</button>
    </div>
  `,
  styles: `
    :host {
      display: block; position: relative; overflow: hidden; padding: 22px;
      border-radius: var(--wv-radius-card); background: var(--wv-forest); color: var(--wv-forest-ink);
    }
    :host-context([data-theme='dark']) { box-shadow: inset 0 0 0 1px rgb(82 209 142 / 28%); }
    h2 { font-size: var(--wv-text-lg); }
    .sub { color: var(--wv-forest-muted); margin: 4px 0 0; font-size: var(--wv-text-sm); position: relative; }
    .big {
      font-family: var(--wv-font-display); font-weight: 600; font-size: clamp(44px, 6vw, 64px);
      letter-spacing: -0.04em; line-height: 1; margin: 18px 0 6px; position: relative;
    }
    .big small { font-size: 20px; letter-spacing: 0; color: var(--wv-forest-muted); margin-left: 8px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; position: relative; }
    .ghost { --mat-button-outlined-label-text-color: var(--wv-forest-ink); --mat-button-outlined-outline-color: rgb(255 255 255 / 22%); }
    .arc { position: absolute; right: -44px; top: -44px; width: 220px; height: 220px; }
    .arc circle:last-child { transition: stroke-dashoffset 0.8s ease-out; }
  `,
})
export class MyDayCard {
  private readonly api = inject(LeaveApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  /** Emits after a check-in, check-out or correction request, so the page can refresh related data. */
  readonly changed = output<void>();

  private readonly month = signal(monthKey());
  private readonly attendance = this.api.myAttendance(this.month);
  private readonly now = signal(Date.now());
  protected readonly busy = signal(false);

  protected readonly record = computed(() => this.attendance.value().find((a) => a.workDate === todayIso()) ?? null);
  protected readonly state = computed(() => {
    if (this.attendance.isLoading() && !this.attendance.hasValue()) {
      return 'loading';
    }
    const r = this.record();
    return !r ? 'out' : r.checkOut ? 'done' : 'in';
  });

  private readonly minutes = computed(() => {
    const r = this.record();
    if (!r) {
      return 0;
    }
    const end = r.checkOut ? Date.parse(r.checkOut) : this.now();
    return Math.max(0, Math.round((end - Date.parse(r.checkIn)) / 60000));
  });
  protected readonly hours = computed(() => {
    const m = this.minutes();
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  });
  protected readonly clock = computed(() => fmtTime(new Date(this.now()).toISOString()));

  protected readonly arcLength = 2 * Math.PI * 90;
  protected readonly arcOffset = computed(() => this.arcLength * (1 - Math.min(1, this.minutes() / WORKDAY_MINUTES)));

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected time(instant: string): string {
    return fmtTime(instant);
  }

  protected checkIn(): void {
    this.run(this.api.checkIn(), (a) => `Checked in at ${fmtTime(a.checkIn)}`);
  }

  protected checkOut(): void {
    this.run(this.api.checkOut(), (a) => `Checked out. ${fmtDuration(a.workedMinutes ?? 0)} today`);
  }

  protected requestFix(): void {
    openCorrection(this.dialog).subscribe((created) => {
      if (created) {
        this.notify.success('Sent to your manager for approval');
        this.changed.emit();
      }
    });
  }

  private run<T extends { checkIn: string; workedMinutes: number | null }>(
    request: Observable<T>,
    message: (a: T) => string,
  ): void {
    this.busy.set(true);
    request.subscribe({
      next: (a) => {
        this.busy.set(false);
        this.now.set(Date.now());
        this.notify.success(message(a));
        this.attendance.reload();
        this.changed.emit();
      },
      error: (err) => {
        this.busy.set(false);
        if ((err as { status?: number }).status === 409) {
          this.notify.error(apiMessage(err));
          this.attendance.reload();
        }
      },
    });
  }
}
