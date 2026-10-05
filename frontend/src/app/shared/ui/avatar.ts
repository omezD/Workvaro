import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { initialsOf } from '../util/initials';

export type PresenceDot = 'in' | 'away' | 'none';

/** Six soft tints; a person always gets the same one (hashed from their name). */
const TINTS = ['leaf', 'gold', 'blue', 'rose', 'teal', 'violet'] as const;

/**
 * Initials avatar. Photos come later with the document service, so every person is shown with
 * readable initials on a consistent tint, plus an optional presence dot.
 */
@Component({
  selector: 'wv-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"tint-" + tint()',
    '[style.--size.px]': 'size()',
    '[attr.title]': 'name()',
  },
  template: `
    {{ initials() }}
    @if (dot() !== 'none') {
      <span class="dot" [class.away]="dot() === 'away'"></span>
    }
  `,
  styles: `
    :host {
      --size: 38px;
      width: var(--size); height: var(--size); border-radius: 50%;
      display: inline-grid; place-items: center; flex: none; position: relative;
      font-weight: 600; font-size: calc(var(--size) * 0.36); letter-spacing: 0.02em;
      background: var(--bg); color: var(--fg);
    }
    :host(.tint-leaf) { --bg: #ddf3e6; --fg: #1c7a4b; }
    :host(.tint-gold) { --bg: #fbefcf; --fg: #8a5a00; }
    :host(.tint-blue) { --bg: #e2e8f8; --fg: #2e4a9e; }
    :host(.tint-rose) { --bg: #f6e0ec; --fg: #8e2d62; }
    :host(.tint-teal) { --bg: #dff0f2; --fg: #1d6670; }
    :host(.tint-violet) { --bg: #ede6f7; --fg: #5b3a8c; }
    :host-context([data-theme='dark']) { filter: saturate(0.8) brightness(0.85); }
    .dot {
      position: absolute; right: -1px; bottom: -1px; width: 30%; height: 30%; border-radius: 50%;
      background: var(--wv-leaf); border: 2px solid var(--wv-surface);
    }
    .dot.away { background: var(--wv-gold); }
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input(38);
  readonly dot = input<PresenceDot>('none');

  protected readonly initials = computed(() => initialsOf(this.name()));
  protected readonly tint = computed(() => {
    let h = 0;
    for (const c of this.name()) {
      h = (h * 31 + c.charCodeAt(0)) >>> 0;
    }
    return TINTS[h % TINTS.length];
  });
}
