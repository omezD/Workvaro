import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Statuses from the backend plus attendance states, mapped to one consistent colour meaning. */
export type ChipStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  | 'ACTIVE' | 'ON_NOTICE' | 'RESIGNED' | 'TERMINATED'
  | 'CHECKED_IN' | 'CHECKED_OUT' | 'ON_LEAVE' | 'NOT_CHECKED_IN';

const STYLE: Record<ChipStatus, { tone: 'ok' | 'wait' | 'no' | 'idle'; label: string }> = {
  PENDING: { tone: 'wait', label: 'Pending' },
  APPROVED: { tone: 'ok', label: 'Approved' },
  REJECTED: { tone: 'no', label: 'Rejected' },
  CANCELLED: { tone: 'idle', label: 'Cancelled' },
  ACTIVE: { tone: 'ok', label: 'Active' },
  ON_NOTICE: { tone: 'wait', label: 'On notice' },
  RESIGNED: { tone: 'idle', label: 'Resigned' },
  TERMINATED: { tone: 'no', label: 'Terminated' },
  CHECKED_IN: { tone: 'ok', label: 'In' },
  CHECKED_OUT: { tone: 'idle', label: 'Checked out' },
  ON_LEAVE: { tone: 'wait', label: 'On leave' },
  NOT_CHECKED_IN: { tone: 'idle', label: 'Not in' },
};

/** Green = approved/present, gold = pending/away, red = rejected, grey = inactive. */
@Component({
  selector: 'wv-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'style().tone' },
  template: `{{ label() ?? style().label }}`,
  styles: `
    :host {
      display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
      font-size: var(--wv-text-sm); font-weight: 500; padding: 3px 10px; border-radius: 99px;
    }
    :host::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    :host(.ok) { background: var(--wv-leaf-soft); color: var(--wv-leaf-text); }
    :host(.wait) { background: var(--wv-gold-soft); color: var(--wv-gold-text); }
    :host(.no) { background: var(--wv-alert-soft); color: var(--wv-alert-text); }
    :host(.idle) { background: var(--wv-idle-soft); color: var(--wv-idle-text); }
  `,
})
export class StatusChip {
  readonly status = input.required<ChipStatus>();
  /** Overrides the default label, e.g. "4 in". */
  readonly label = input<string>();
  protected readonly style = computed(() => STYLE[this.status()]);
}
