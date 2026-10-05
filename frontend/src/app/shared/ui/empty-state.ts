import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from './icon';

/** Shown when a list or screen has nothing in it yet. Tells people what to do next (projected actions). */
@Component({
  selector: 'wv-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <span class="badge"><wv-icon [name]="icon()" [size]="24" /></span>
    <h2>{{ title() }}</h2>
    @if (text()) {
      <p>{{ text() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; }
    .badge {
      width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center;
      background: var(--wv-leaf-soft); color: var(--wv-leaf-text); margin-bottom: 16px;
    }
    h2 { font-size: var(--wv-text-xl); }
    p { margin: 8px 0 0; color: var(--wv-muted); max-width: 48ch; }
    .actions { margin-top: 20px; display: flex; gap: 10px; }
    .actions:empty { display: none; }
  `,
})
export class EmptyState {
  readonly icon = input<IconName>('compass');
  readonly title = input.required<string>();
  readonly text = input<string>();
}
