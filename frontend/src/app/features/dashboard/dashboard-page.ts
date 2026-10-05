import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS } from '../../core/layout/nav-items';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';

/** Greets the user and confirms who they are signed in as. Role widgets arrive in Step 9. */
@Component({
  selector: 'wv-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, EmptyState],
  template: `
    <wv-page-header [title]="greeting()" [subtitle]="today" />
    <section class="wv-card">
      <wv-empty-state icon="dashboard" title="Your dashboard is on its way"
        [text]="'Signed in as ' + (auth.user()?.email ?? '') + ' with access as ' + roles() + '. Leave balances, check-in and approvals appear here next.'" />
    </section>
  `,
})
export class DashboardPage {
  protected readonly auth = inject(AuthService);

  protected readonly today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = this.auth.user()?.firstName;
    return name ? `${part}, ${name}` : part;
  });

  protected readonly roles = computed(() =>
    this.auth.roles().map((r) => ROLE_LABELS[r]).join(', ') || 'no role yet',
  );
}
