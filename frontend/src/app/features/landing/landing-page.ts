import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { Icon } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';

/**
 * Public front page. This is the working entry point (sign in / open the app); the full landing
 * experience with the feature reel and product tour replaces the body in a later step.
 */
@Component({
  selector: 'wv-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, RouterLink, Icon, Logo],
  template: `
    <header class="bar">
      <wv-logo />
      <div class="bar-actions">
        <button mat-icon-button type="button" (click)="theme.toggle()"
          [attr.aria-label]="theme.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'">
          <wv-icon [name]="theme.mode() === 'dark' ? 'sun' : 'moon'" />
        </button>
        @if (auth.authenticated()) {
          <a mat-flat-button routerLink="/app/dashboard">Open Workvaro</a>
        } @else {
          <button mat-flat-button type="button" (click)="auth.login()">Sign in</button>
        }
      </div>
    </header>

    <main class="hero">
      <h1>Leave, attendance and your team, in one calm place.</h1>
      <p>
        Workvaro is where your company applies for leave, checks in for the day and approves requests,
        with every rule applied the same way for everyone.
      </p>
      <div class="cta">
        @if (auth.authenticated()) {
          <a mat-flat-button routerLink="/app/dashboard">Go to my dashboard</a>
        } @else {
          <button mat-flat-button type="button" (click)="auth.login()">Sign in with your work account</button>
        }
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--wv-canvas); }
    .bar { display: flex; align-items: center; padding: 20px clamp(16px, 5vw, 64px); }
    .bar-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
    .hero { padding: clamp(48px, 12vh, 140px) clamp(16px, 5vw, 64px); max-width: 980px; }
    h1 { font-size: clamp(40px, 7vw, var(--wv-text-display)); letter-spacing: -0.035em; line-height: 1.02; max-width: 16ch; }
    p { font-size: var(--wv-text-lg); color: var(--wv-muted); max-width: 56ch; margin: 24px 0 0; }
    .cta { margin-top: 32px; }
  `,
})
export class LandingPage {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
}
