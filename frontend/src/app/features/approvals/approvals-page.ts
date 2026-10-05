import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { LeaveApi } from '../../core/api/leave.api';
import { Correction, LeaveRequest } from '../../core/api/models';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { LoadError } from '../../shared/ui/load-error';
import { PageHeader } from '../../shared/ui/page-header';
import { fmtDate, fmtRange, fmtTime, fmtWeekday } from '../../shared/util/dates';
import { DecisionsService } from './decisions.service';

/** Everything waiting for the signed-in manager (their team) or HR (everyone except themself). */
@Component({
  selector: 'wv-approvals-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, MatButtonModule, Avatar, EmptyState, LoadError],
  template: `
    <wv-page-header title="Approvals" [subtitle]="subtitle()" />

    <section class="wv-card" aria-labelledby="leave-h">
      <h2 id="leave-h">Leave requests <span class="count">{{ leaves.value().length }}</span></h2>
      @if (leaves.error()) {
        <wv-load-error (retry)="leaves.reload()" />
      } @else if (leaves.isLoading() && !leaves.hasValue()) {
        <div class="wv-skeleton"><span></span><span></span></div>
      } @else if (leaves.value().length === 0) {
        <wv-empty-state icon="check" title="No leave requests waiting" text="When someone you approve for applies, their request shows up here and on your dashboard." />
      } @else {
        <ul>
          @for (l of leaves.value(); track l.id) {
            <li [class.busy]="busy() === 'L' + l.id">
              <wv-avatar [name]="l.employeeName" />
              <div class="who">
                <b>{{ l.employeeName }}</b>
                <span>{{ l.leaveTypeName }}, {{ l.days }} working day{{ l.days === 1 ? '' : 's' }}</span>
              </div>
              <div class="what">
                <b>{{ range(l) }}</b>
                <span>{{ l.reason || 'No reason given' }}</span>
                <span class="wv-muted">Requested {{ date(l.createdAt.slice(0, 10)) }}</span>
              </div>
              <div class="acts">
                <button mat-stroked-button type="button" class="reject" (click)="rejectLeave(l)">Reject</button>
                <button mat-flat-button type="button" (click)="approveLeave(l)">Approve</button>
              </div>
            </li>
          }
        </ul>
      }
    </section>

    <section class="wv-card" aria-labelledby="fix-h">
      <h2 id="fix-h">Attendance fixes <span class="count">{{ fixes.value().length }}</span></h2>
      @if (fixes.error()) {
        <wv-load-error (retry)="fixes.reload()" />
      } @else if (fixes.isLoading() && !fixes.hasValue()) {
        <div class="wv-skeleton"><span></span></div>
      } @else if (fixes.value().length === 0) {
        <p class="wv-muted">No attendance fixes waiting.</p>
      } @else {
        <ul>
          @for (c of fixes.value(); track c.id) {
            <li [class.busy]="busy() === 'C' + c.id">
              <wv-avatar [name]="c.employeeName" />
              <div class="who">
                <b>{{ c.employeeName }}</b>
                <span>{{ weekday(c.workDate) }}</span>
              </div>
              <div class="what">
                <b>{{ time(c.requestedCheckIn) }} to {{ time(c.requestedCheckOut) }}</b>
                <span>{{ c.reason }}</span>
              </div>
              <div class="acts">
                <button mat-stroked-button type="button" class="reject" (click)="rejectFix(c)">Reject</button>
                <button mat-flat-button type="button" (click)="approveFix(c)">Approve</button>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 18px; }
    h2 { font-size: var(--wv-text-lg); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
    .count { font-family: var(--wv-font-text); font-size: 13px; font-weight: 600; padding: 1px 9px; border-radius: 99px; background: var(--wv-gold-soft); color: var(--wv-gold-text); }
    ul { list-style: none; margin: 0; padding: 0; }
    li {
      display: grid; grid-template-columns: auto minmax(140px, 1fr) minmax(0, 2fr) auto; gap: 16px; align-items: center;
      padding: 16px 0; border-top: 1px solid var(--wv-line); transition: opacity 0.2s;
    }
    li:first-child { border-top: 0; padding-top: 0; }
    li.busy { opacity: 0.5; pointer-events: none; }
    .who, .what { display: flex; flex-direction: column; min-width: 0; }
    .who span, .what span { font-size: var(--wv-text-sm); }
    .acts { display: flex; gap: 8px; }
    .reject { --mat-button-outlined-label-text-color: var(--wv-alert-text); }
    @media (max-width: 760px) {
      li { grid-template-columns: auto 1fr; }
      .what, .acts { grid-column: 1 / -1; }
    }
  `,
})
export class ApprovalsPage {
  private readonly api = inject(LeaveApi);
  private readonly decisions = inject(DecisionsService);

  protected readonly leaves = this.api.pendingLeaves(signal(true));
  protected readonly fixes = this.api.pendingCorrections(signal(true));
  protected readonly busy = signal<string | null>(null);

  protected readonly subtitle = computed(() => {
    const n = this.leaves.value().length + this.fixes.value().length;
    return n === 0 ? 'Nothing is waiting for your decision.' : `${n} request${n === 1 ? ' is' : 's are'} waiting for your decision, oldest first.`;
  });

  protected range(l: LeaveRequest) {
    return fmtRange(l.startDate, l.endDate);
  }
  protected date(iso: string) {
    return fmtDate(iso);
  }
  protected weekday(iso: string) {
    return fmtWeekday(iso);
  }
  protected time(instant: string) {
    return fmtTime(instant);
  }

  protected approveLeave(l: LeaveRequest) {
    this.track('L' + l.id, this.decisions.approveLeave(l));
  }
  protected rejectLeave(l: LeaveRequest) {
    this.track('L' + l.id, this.decisions.rejectLeave(l));
  }
  protected approveFix(c: Correction) {
    this.track('C' + c.id, this.decisions.approveCorrection(c));
  }
  protected rejectFix(c: Correction) {
    this.track('C' + c.id, this.decisions.rejectCorrection(c));
  }

  private track(key: string, op: Observable<boolean>) {
    this.busy.set(key);
    op.subscribe({
      next: () => {
        this.leaves.reload();
        this.fixes.reload();
      },
      complete: () => this.busy.set(null),
    });
  }
}
