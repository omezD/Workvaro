import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page title with an optional one-line description and right-aligned actions (projected). */
@Component({
  selector: 'wv-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text">
      <h1>{{ title() }}</h1>
      @if (subtitle()) {
        <p>{{ subtitle() }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    h1 { font-size: var(--wv-text-3xl); letter-spacing: -0.025em; }
    p { margin: 6px 0 0; color: var(--wv-muted); max-width: 64ch; }
    .actions { margin-left: auto; display: flex; gap: 10px; align-items: center; }
    .actions:empty { display: none; }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
