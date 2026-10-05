import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { LeaveRequest } from '../../core/api/models';
import { StatusChip } from '../../shared/ui/status-chip';
import { fmtRange } from '../../shared/util/dates';

/** The signed-in person's coming leave, pending and approved. */
@Component({
  selector: 'wv-upcoming-leave-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusChip, RouterLink, MatButtonModule],
  host: { class: 'wv-card' },
  template: `
    <div class="head">
      <h2>My upcoming leave</h2>
      <a routerLink="/app/leave">All my requests</a>
    </div>
    @if (leaves().length === 0) {
      <div class="empty">
        <p class="wv-muted">No leave planned. When you need time off, apply and your manager is notified on their dashboard.</p>
        <button mat-stroked-button type="button" (click)="apply.emit()">Apply for leave</button>
      </div>
    } @else {
      <ul>
        @for (l of leaves(); track l.id) {
          <li>
            <div>
              <b>{{ range(l) }}</b>
              <span class="wv-muted">{{ l.leaveTypeName }}, {{ l.days }} day{{ l.days === 1 ? '' : 's' }}</span>
            </div>
            <wv-status-chip [status]="l.status" />
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host { display: block; }
    .head { display: flex; align-items: baseline; margin-bottom: 12px; }
    .head a { margin-left: auto; font-size: 14px; font-weight: 500; text-decoration: none; }
    h2 { font-size: var(--wv-text-lg); }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--wv-line); }
    li:first-child { border-top: 0; padding-top: 0; }
    li div { display: flex; flex-direction: column; }
    li span { font-size: 13px; }
    .empty { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
    .empty p { margin: 0; }
  `,
})
export class UpcomingLeaveCard {
  readonly leaves = input<LeaveRequest[]>([]);
  readonly apply = output<void>();

  protected range(l: LeaveRequest) {
    return fmtRange(l.startDate, l.endDate);
  }
}
