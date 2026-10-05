import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DEMO_MODE, DemoBar } from './core/demo/demo-mode';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, DemoBar],
  template: `
    <router-outlet />
    @if (demo) {
      <wv-demo-bar />
    }
  `,
})
export class App {
  // Created at start-up so the saved light/dark choice is applied on every page
  private readonly theme = inject(ThemeService);
  protected readonly demo = DEMO_MODE;
}
