import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LeaveBalance } from '../../core/api/models';
import { BalanceRing } from '../../shared/ui/balance-ring';

@Component({
  selector: 'wv-balances-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BalanceRing, MatButtonModule],
  host: { class: 'wv-card' },
  template: `
    <div class="head">
      <h2>Leave balance</h2>
      <span class="wv-muted">{{ year }}</span>
      <button mat-button type="button" class="apply" (click)="apply.emit()">Apply for leave</button>
    </div>
    @if (loading()) {
      <div class="rings skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
    } @else {
      <div class="rings">
        @for (b of limited(); track b.leaveTypeId) {
          <wv-balance-ring [label]="short(b.leaveTypeName)" [available]="b.available" [total]="b.allocated" />
        }
      </div>
      <div class="foot">
        <span>{{ pendingText() }}</span>
        @if (unpaid(); as u) {
          <span class="wv-muted">Unpaid used: {{ u.used }}</span>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
    h2 { font-size: var(--wv-text-lg); }
    .apply { margin-left: auto; }
    .rings { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .skeleton span { height: 112px; border-radius: 12px; background: var(--wv-sunk); }
    .foot {
      margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--wv-line);
      display: flex; justify-content: space-between; gap: 12px; font-size: 14px;
    }
  `,
})
export class BalancesCard {
  readonly balances = input<LeaveBalance[]>([]);
  readonly loading = input(false);
  readonly apply = output<void>();

  protected readonly year = new Date().getFullYear();
  protected readonly limited = computed(() => this.balances().filter((b) => !b.unlimited).slice(0, 3));
  protected readonly unpaid = computed(() => this.balances().find((b) => b.unlimited) ?? null);
  protected readonly pendingText = computed(() => {
    const days = this.balances().reduce((s, b) => s + b.pending, 0);
    return days ? `${days} day${days === 1 ? '' : 's'} waiting for approval` : 'Nothing waiting for approval';
  });

  /** "Casual Leave" -> "Casual" */
  protected short(name: string): string {
    return name.replace(/ leave$/i, '');
  }
}
