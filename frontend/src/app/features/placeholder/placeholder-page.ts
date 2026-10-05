import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyState } from '../../shared/ui/empty-state';
import { IconName } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';

/**
 * Temporary screen for sections built in Step 9. Title, description and icon come from the
 * route's `data` (bound to inputs by withComponentInputBinding).
 */
@Component({
  selector: 'wv-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, EmptyState],
  template: `
    <wv-page-header [title]="title()" [subtitle]="subtitle()" />
    <section class="wv-card">
      <wv-empty-state [icon]="icon()" title="This screen is being built"
        text="The navigation, sign-in and permissions for this section are ready. Its content arrives in the next build step." />
    </section>
  `,
})
export class PlaceholderPage {
  readonly title = input('');
  readonly subtitle = input('');
  readonly icon = input<IconName>('compass');
}
