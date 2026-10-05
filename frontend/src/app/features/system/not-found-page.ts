import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/ui/empty-state';

@Component({
  selector: 'wv-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, MatButtonModule, RouterLink],
  template: `
    <main>
      <wv-empty-state icon="compass" title="There's no page at this address"
        text="The link may be old or mistyped. Start again from the home page.">
        <a mat-flat-button routerLink="/">Go to home page</a>
      </wv-empty-state>
    </main>
  `,
  styles: `main { min-height: 100vh; display: grid; place-items: center; }`,
})
export class NotFoundPage {}
