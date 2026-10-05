import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EmployeeApi } from '../../core/api/employee.api';
import { LeaveApi } from '../../core/api/leave.api';
import { AuthService } from '../../core/auth/auth.service';
import { NotifyService } from '../../core/notify/notify.service';
import { LeaveStrip } from '../../shared/ui/leave-strip';
import { LoadError } from '../../shared/ui/load-error';
import { PageHeader } from '../../shared/ui/page-header';
import { fmtMonth, monthKey } from '../../shared/util/dates';
import { MyDayCard } from '../attendance/my-day-card';
import { openApplyLeave } from '../leave/apply-leave-dialog';
import { ApprovalsInbox } from './approvals-inbox';
import { BalancesCard } from './balances-card';
import { HeadcountCard } from './headcount-card';
import { HolidayCard } from './holiday-card';
import { TeamTodayCard } from './team-today-card';
import { UpcomingLeaveCard } from './upcoming-leave-card';

/**
 * One dashboard, composed by role:
 * everyone sees their day, balances and holidays; managers and HR add who's in, the approvals inbox
 * and the month's leave strip; HR and Admin add headcount by department.
 */
@Component({
  selector: 'wv-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, MyDayCard, BalancesCard, HolidayCard, TeamTodayCard, ApprovalsInbox, HeadcountCard, UpcomingLeaveCard, LeaveStrip, LoadError],
  template: `
    <wv-page-header [title]="greeting()" [subtitle]="subtitle()" />

    @if (my.error()) {
      <section class="wv-card"><wv-load-error message="Your dashboard couldn't load." (retry)="my.reload()" /></section>
    }

    <div class="grid">
      <wv-my-day-card class="span-5" (changed)="refreshMine()" />
      <wv-balances-card class="span-4" [balances]="my.value()?.balances ?? []" [loading]="!my.hasValue()" (apply)="apply()" />
      <wv-holiday-card class="span-3" [holidays]="my.value()?.upcomingHolidays ?? []" />

      @if (approver()) {
        <wv-team-today-card class="span-7" [title]="isHrOrAdmin() ? 'Company today' : 'Team today'" [board]="board.value()" />
        <wv-approvals-inbox class="span-5" [leaves]="pendingLeaves.value()" [corrections]="pendingFixes.value()"
          [loading]="pendingLeaves.isLoading() && !pendingLeaves.hasValue()" (decided)="refreshTeam()" />
        <section class="wv-card span-12" aria-labelledby="strip-title">
          <h2 id="strip-title">{{ isHrOrAdmin() ? "Who's away" : "Who's away in your team" }}, {{ monthLabel }}</h2>
          <wv-leave-strip [month]="month()" [entries]="calendar.value()" [holidays]="holidayMap()" />
        </section>
      } @else {
        <wv-upcoming-leave-card class="span-12" [leaves]="my.value()?.upcomingLeaves ?? []" (apply)="apply()" />
      }

      @if (isHrOrAdmin()) {
        <wv-headcount-card class="span-6" [stats]="stats.value()" />
        <wv-upcoming-leave-card class="span-6" [leaves]="my.value()?.upcomingLeaves ?? []" (apply)="apply()" />
      } @else if (approver()) {
        <wv-upcoming-leave-card class="span-12" [leaves]="my.value()?.upcomingLeaves ?? []" (apply)="apply()" />
      }
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 18px; align-items: start; }
    .grid > * { min-width: 0; }
    .span-3 { grid-column: span 3; }
    .span-4 { grid-column: span 4; }
    .span-5 { grid-column: span 5; }
    .span-6 { grid-column: span 6; }
    .span-7 { grid-column: span 7; }
    .span-12 { grid-column: span 12; }
    h2 { font-size: var(--wv-text-lg); margin-bottom: 4px; }
    wv-my-day-card, wv-balances-card, wv-holiday-card { align-self: stretch; }
    @media (max-width: 1180px) {
      .span-3, .span-4 { grid-column: span 6; }
      .span-5, .span-7 { grid-column: span 12; }
    }
    @media (max-width: 720px) {
      .grid > * { grid-column: span 12; }
    }
  `,
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly leaveApi = inject(LeaveApi);
  private readonly employeeApi = inject(EmployeeApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  protected readonly approver = computed(() => this.auth.hasAnyRole('MANAGER', 'HR'));
  protected readonly isHrOrAdmin = computed(() => this.auth.hasAnyRole('HR', 'ADMIN'));
  protected readonly month = signal(monthKey());
  protected readonly monthLabel = fmtMonth(monthKey());
  private readonly year = signal(new Date().getFullYear());

  protected readonly my = this.leaveApi.myDashboard();
  protected readonly board = this.leaveApi.todayBoard(computed(() => this.approver() || this.isHrOrAdmin()));
  protected readonly pendingLeaves = this.leaveApi.pendingLeaves(this.approver);
  protected readonly pendingFixes = this.leaveApi.pendingCorrections(this.approver);
  protected readonly calendar = this.leaveApi.teamCalendar(computed(() => (this.approver() ? this.month() : null)));
  private readonly holidays = this.leaveApi.holidays(this.year);
  protected readonly stats = this.employeeApi.stats(this.isHrOrAdmin);

  protected readonly holidayMap = computed(() => Object.fromEntries(this.holidays.value().map((h) => [h.date, h.name])));

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = this.auth.user()?.firstName;
    return name ? `${part}, ${name}` : part;
  });

  protected readonly subtitle = computed(() => {
    const date = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    if (this.approver()) {
      const waiting = this.pendingLeaves.value().length + this.pendingFixes.value().length;
      if (waiting) {
        return `${date}. ${waiting === 1 ? 'One request is' : waiting + ' requests are'} waiting for you.`;
      }
    }
    const mine = this.my.value()?.myPendingLeaves ?? 0;
    return mine ? `${date}. ${mine === 1 ? 'Your leave request is' : mine + ' of your leave requests are'} waiting for approval.` : `${date}.`;
  });

  protected apply(): void {
    openApplyLeave(this.dialog).subscribe((created) => {
      if (created) {
        this.notify.success(`Leave request sent for ${created.days} day${created.days === 1 ? '' : 's'}`);
        this.refreshMine();
        this.calendar.reload();
      }
    });
  }

  protected refreshMine(): void {
    this.my.reload();
    if (this.approver()) {
      this.board.reload();
    }
  }

  protected refreshTeam(): void {
    this.pendingLeaves.reload();
    this.pendingFixes.reload();
    this.calendar.reload();
    this.board.reload();
  }
}
