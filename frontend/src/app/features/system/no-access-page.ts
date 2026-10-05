import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/ui/empty-state';

@Component({
  selector: 'wv-no-access-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, MatButtonModule, RouterLink],
  template: `
    <section class="wv-card">
      <wv-empty-state icon="lock" title="This section isn't part of your role"
        text="Your account doesn't include access to this page. If you need it for your work, ask HR to update your role.">
        <a mat-flat-button routerLink="/app/dashboard">Back to dashboard</a>
      </wv-empty-state>
    </section>
  `,
})
export class NoAccessPage {}
