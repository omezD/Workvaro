import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Ring showing how much of a leave allowance is still available ("8 of 12"). */
@Component({
  selector: 'wv-balance-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 76 76" [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--wv-sunk)" stroke-width="8" />
      @if (!unlimited()) {
        <circle cx="38" cy="38" r="31" fill="none" stroke="var(--wv-leaf)" stroke-width="8" stroke-linecap="round"
          [attr.stroke-dasharray]="circumference" [attr.stroke-dashoffset]="offset()" transform="rotate(-90 38 38)" />
      }
    </svg>
    <strong>{{ unlimited() ? used() + ' used' : available() + ' of ' + total() }}</strong>
    <span>{{ label() }}</span>
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; min-width: 0; }
    strong { font-family: var(--wv-font-display); font-size: 19px; font-weight: 600; }
    span { font-size: var(--wv-text-sm); color: var(--wv-muted); }
    circle { transition: stroke-dashoffset 0.6s ease-out; }
  `,
  host: { role: 'img', '[attr.aria-label]': 'ariaLabel()' },
})
export class BalanceRing {
  readonly label = input.required<string>();
  readonly available = input(0);
  readonly total = input(0);
  readonly used = input(0);
  readonly unlimited = input(false);
  readonly size = input(76);

  protected readonly circumference = 2 * Math.PI * 31;
  protected readonly offset = computed(() => {
    const share = this.total() > 0 ? Math.max(0, Math.min(1, this.available() / this.total())) : 0;
    return this.circumference * (1 - share);
  });
  protected readonly ariaLabel = computed(() =>
    this.unlimited()
      ? `${this.label()}: ${this.used()} days used`
      : `${this.label()}: ${this.available()} of ${this.total()} days available`,
  );
}
