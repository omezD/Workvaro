import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Workvaro mark: a leaf tile with a "W" stroke. `withName` adds the wordmark. */
@Component({
  selector: 'wv-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#3DBE7A" />
      <path d="M7 9l3.2 10L14 11l3.8 8L21 9" fill="none" stroke="#0F3B25" stroke-width="2.4"
        stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    @if (withName()) {
      <span>Workvaro</span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 10px; }
    span { font-family: var(--wv-font-display); font-weight: 700; font-size: 21px; letter-spacing: -0.02em; }
  `,
})
export class Logo {
  readonly size = input(28);
  readonly withName = input(true);
}
