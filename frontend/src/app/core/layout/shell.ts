import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ALL_ROLES } from '../auth/roles';
import { ThemeService } from '../theme/theme.service';
import { Avatar } from '../../shared/ui/avatar';
import { Icon } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';
import { NAV_ITEMS, ROLE_LABELS } from './nav-items';

/** Signed-in layout: forest sidebar (drawer on small screens) and the routed page. */
@Component({
  selector: 'wv-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatMenuModule, MatButtonModule, Icon, Avatar, Logo],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly isMobile = toSignal(
    inject(BreakpointObserver).observe('(max-width: 900px)').pipe(map((s) => s.matches)),
    { initialValue: false },
  );
  protected readonly menuOpen = signal(false);

  protected readonly nav = computed(() =>
    NAV_ITEMS.filter((item) => !item.roles || this.auth.hasAnyRole(...item.roles)),
  );

  /** e.g. "HR" or "Manager"; the most senior role the user holds. */
  protected readonly roleLabel = computed(() => {
    const mine = this.auth.roles();
    const top = ALL_ROLES.find((r) => mine.includes(r));
    return top ? ROLE_LABELS[top] : '';
  });

  protected closeOnMobile(): void {
    if (this.isMobile()) {
      this.menuOpen.set(false);
    }
  }
}
