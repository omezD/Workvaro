import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Correction, LeaveRequest } from '../../core/api/models';
import { Avatar } from '../../shared/ui/avatar';
import { Icon } from '../../shared/ui/icon';
import { fmtRange, fmtTime, fmtWeekday } from '../../shared/util/dates';
import { DecisionsService } from '../approvals/decisions.service';

type Item = { kind: 'leave'; at: string; leave: LeaveRequest } | { kind: 'fix'; at: string; fix: Correction };

/** Leave requests and attendance fixes waiting for the signed-in manager or HR, oldest first. */
@Component({
  selector: 'wv-approvals-inbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Icon, RouterLink],
  host: { class: 'wv-card' },
  template: `
    <div class="head">
      <h2>Waiting for you</h2>
      <a routerLink="/app/approvals">See all</a>
    </div>
    @if (loading()) {
      <div class="skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
    } @else if (items().length === 0) {
      <p class="wv-muted">You're all caught up. New requests from your team appear here.</p>
    } @else {
      <ul>
        @for (item of shown(); track item.kind + id(item)) {
          <li>
            @if (item.kind === 'leave') {
              <wv-avatar [name]="item.leave.employeeName" [size]="36" />
              <div class="text">
                <b>{{ item.leave.employeeName }}, {{ item.leave.leaveTypeName.toLowerCase() }}</b>
                <p>{{ range(item.leave) }}, {{ item.leave.days }} day{{ item.leave.days === 1 ? '' : 's' }}{{ item.leave.reason ? '. ' + item.leave.reason : '' }}</p>
              </div>
              <div class="acts">
                <button type="button" class="no" [attr.aria-label]="'Reject ' + item.leave.employeeName + '\\'s leave'" (click)="rejectLeave(item.leave)"><wv-icon name="close" [size]="16" /></button>
                <button type="button" class="yes" [attr.aria-label]="'Approve ' + item.leave.employeeName + '\\'s leave'" (click)="approveLeave(item.leave)"><wv-icon name="check" [size]="16" [stroke]="2.4" /></button>
              </div>
            } @else {
              <wv-avatar [name]="item.fix.employeeName" [size]="36" />
              <div class="text">
                <b>{{ item.fix.employeeName }}, attendance fix</b>
                <p>{{ weekday(item.fix.workDate) }}, {{ time(item.fix.requestedCheckIn) }} to {{ time(item.fix.requestedCheckOut) }}. {{ item.fix.reason }}</p>
              </div>
              <div class="acts">
                <button type="button" class="no" [attr.aria-label]="'Reject ' + item.fix.employeeName + '\\'s attendance fix'" (click)="rejectFix(item.fix)"><wv-icon name="close" [size]="16" /></button>
                <button type="button" class="yes" [attr.aria-label]="'Approve ' + item.fix.employeeName + '\\'s attendance fix'" (click)="approveFix(item.fix)"><wv-icon name="check" [size]="16" [stroke]="2.4" /></button>
              </div>
            }
          </li>
        }
      </ul>
      @if (items().length > limit()) {
        <a class="more" routerLink="/app/approvals">{{ items().length - limit() }} more waiting</a>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .head { display: flex; align-items: baseline; margin-bottom: 12px; }
    .head a { margin-left: auto; font-size: 14px; font-weight: 500; text-decoration: none; }
    h2 { font-size: var(--wv-text-lg); }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 12px 0; border-top: 1px solid var(--wv-line); }
    li:first-child { border-top: 0; padding-top: 0; }
    .text { min-width: 0; }
    b { font-weight: 600; font-size: 14px; }
    p { margin: 1px 0 0; font-size: 13px; color: var(--wv-muted); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .acts { display: flex; gap: 6px; }
    .acts button {
      width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
      border: 1px solid var(--wv-line); background: var(--wv-surface); color: var(--wv-ink);
    }
    .acts .no:hover { border-color: var(--wv-alert); color: var(--wv-alert-text); }
    .acts .yes { background: var(--wv-leaf); border-color: var(--wv-leaf); color: var(--wv-leaf-ink); }
    .skeleton { display: flex; flex-direction: column; gap: 10px; }
    .skeleton span { height: 52px; border-radius: 10px; background: var(--wv-sunk); }
    .more { display: inline-block; margin-top: 10px; font-size: 14px; font-weight: 500; text-decoration: none; }
  `,
})
export class ApprovalsInbox {
  private readonly decisions = inject(DecisionsService);

  readonly leaves = input<LeaveRequest[]>([]);
  readonly corrections = input<Correction[]>([]);
  readonly loading = input(false);
  readonly limit = input(4);
  /** Emits after any approve/reject so the page can reload counts. */
  readonly decided = output<void>();

  protected readonly items = computed<Item[]>(() =>
    [
      ...this.leaves().map((leave) => ({ kind: 'leave' as const, at: leave.createdAt, leave })),
      ...this.corrections().map((fix) => ({ kind: 'fix' as const, at: fix.createdAt, fix })),
    ].sort((a, b) => a.at.localeCompare(b.at)),
  );
  protected readonly shown = computed(() => this.items().slice(0, this.limit()));

  protected id(item: Item): number {
    return item.kind === 'leave' ? item.leave.id : item.fix.id;
  }
  protected range(l: LeaveRequest) {
    return fmtRange(l.startDate, l.endDate);
  }
  protected weekday(iso: string) {
    return fmtWeekday(iso);
  }
  protected time(instant: string) {
    return fmtTime(instant);
  }

  protected approveLeave(l: LeaveRequest) {
    this.decisions.approveLeave(l).subscribe(() => this.decided.emit());
  }
  protected rejectLeave(l: LeaveRequest) {
    this.decisions.rejectLeave(l).subscribe(() => this.decided.emit());
  }
  protected approveFix(c: Correction) {
    this.decisions.approveCorrection(c).subscribe(() => this.decided.emit());
  }
  protected rejectFix(c: Correction) {
    this.decisions.rejectCorrection(c).subscribe(() => this.decided.emit());
  }
}
