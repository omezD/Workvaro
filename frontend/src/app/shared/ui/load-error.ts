import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/** Inline message when a section couldn't load, with a retry button. */
@Component({
  selector: 'wv-load-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule],
  template: `
    <p>{{ message() }}</p>
    <button mat-stroked-button type="button" (click)="retry.emit()">Try again</button>
  `,
  styles: `
    :host { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 0; }
    p { margin: 0; color: var(--wv-muted); }
  `,
})
export class LoadError {
  readonly message = input("This section couldn't load.");
  readonly retry = output<void>();
}
