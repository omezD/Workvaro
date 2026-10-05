import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { LeaveApi } from '../../core/api/leave.api';
import { Attendance } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { NotifyService } from '../../core/notify/notify.service';
import { Icon } from '../../shared/ui/icon';
import { LoadError } from '../../shared/ui/load-error';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusChip } from '../../shared/ui/status-chip';
import { addDays, addMonths, daysInMonth, fmtDuration, fmtMonth, fmtTime, fmtWeekday, isWeekend, monthKey, todayIso } from '../../shared/util/dates';
import { TeamTodayCard } from '../dashboard/team-today-card';
import { openCorrection } from './correction-dialog';
import { MyDayCard } from './my-day-card';

interface DayRow {
  date: string;
  record: Attendance | null;
  /** Why there is no record, when that's expected. */
  reason: 'holiday' | 'leave' | null;
  label: string | null;
  fixPending: boolean;
}

@Component({
  selector: 'wv-attendance-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, MatTabsModule, MatButtonModule, MyDayCard, TeamTodayCard, StatusChip, LoadError, Icon],
  templateUrl: './attendance-page.html',
  styleUrl: './attendance-page.scss',
})
export class AttendancePage {
  private readonly api = inject(LeaveApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  protected readonly canSeeTeam = computed(() => this.auth.hasAnyRole('MANAGER', 'HR', 'ADMIN'));
  protected readonly orgWide = computed(() => this.auth.hasAnyRole('HR', 'ADMIN'));

  protected readonly month = signal(monthKey());
  protected readonly isCurrentMonth = computed(() => this.month() === monthKey());
  private readonly year = computed(() => Number(this.month().slice(0, 4)));

  protected readonly attendance = this.api.myAttendance(this.month);
  protected readonly corrections = this.api.myCorrections();
  private readonly leaves = this.api.myLeaves();
  private readonly holidays = this.api.holidays(this.year);
  protected readonly board = this.api.todayBoard(this.canSeeTeam);

  /** Every weekday of the month up to today (newest first), with the record or the reason it's missing. */
  protected readonly days = computed<DayRow[]>(() => {
    const m = this.month();
    const today = todayIso();
    const byDate = new Map(this.attendance.value().map((a) => [a.workDate, a]));
    const holidays = new Map(this.holidays.value().map((h) => [h.date, h.name]));
    const approvedLeave = this.leaves.value().filter((l) => l.status === 'APPROVED');
    const pendingFix = new Set(this.corrections.value().filter((c) => c.status === 'PENDING').map((c) => c.workDate));
    const rows: DayRow[] = [];
    for (let i = daysInMonth(m); i >= 1; i--) {
      const date = `${m}-${String(i).padStart(2, '0')}`;
      const record = byDate.get(date) ?? null;
      if (date > today || (isWeekend(date) && !record)) {
        continue;
      }
      const leave = approvedLeave.find((l) => l.startDate <= date && l.endDate >= date);
      const holiday = holidays.get(date);
      rows.push({
        date,
        record,
        reason: record ? null : holiday ? 'holiday' : leave ? 'leave' : null,
        label: holiday ?? (leave ? leave.leaveTypeName : null),
        fixPending: pendingFix.has(date),
      });
    }
    return rows;
  });

  protected readonly summary = computed(() => {
    const worked = this.attendance.value().filter((a) => a.workedMinutes !== null);
    const total = worked.reduce((s, a) => s + (a.workedMinutes ?? 0), 0);
    const missing = this.days().filter((d) => !d.record && !d.reason && d.date !== todayIso()).length;
    return {
      present: this.attendance.value().length,
      average: worked.length ? fmtDuration(Math.round(total / worked.length)) : 'n/a',
      corrected: this.attendance.value().filter((a) => a.corrected).length,
      missing,
    };
  });

  protected readonly monthLabel = computed(() => fmtMonth(this.month()));
  protected readonly fmtWeekday = fmtWeekday;
  protected readonly fmtTime = fmtTime;
  protected readonly fmtDuration = fmtDuration;
  protected readonly today = todayIso();
  protected readonly yesterday = addDays(todayIso(), -1);

  protected shiftMonth(delta: number): void {
    this.month.update((m) => addMonths(m, delta));
  }

  protected requestFix(date?: string): void {
    openCorrection(this.dialog, date).subscribe((created) => {
      if (created) {
        this.notify.success('Sent to your manager for approval');
        this.corrections.reload();
      }
    });
  }

  protected refresh(): void {
    this.attendance.reload();
    this.corrections.reload();
    if (this.canSeeTeam()) {
      this.board.reload();
    }
  }
}
