import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { DEMO_MODE } from '../../core/demo/demo-mode';
import { ThemeService } from '../../core/theme/theme.service';
import { Icon } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';
import { FeatureTour } from './feature-tour';
import { HeroBoard } from './hero-board';
import { FAQS, PLANS } from './landing-content';
import { motion, prefersReducedMotion } from './motion';
import { ProductTour } from './product-tour';

/** Public product site for Workvaro: hero, features, product tour, how it works, security, pricing, FAQ. */
@Component({
  selector: 'wv-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, RouterLink, Icon, Logo, HeroBoard, FeatureTour, ProductTour],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly plans = PLANS;
  protected readonly faqs = FAQS;
  protected readonly year = new Date().getFullYear();
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onScroll = () => this.scrolled.set(window.scrollY > 12);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
      if (!prefersReducedMotion()) {
        this.animate(destroyRef);
      }
    });
  }

  /** Opens the live demo: in-app when this build is the demo, otherwise the public demo site. */
  protected tryDemo(): void {
    if (DEMO_MODE) {
      void this.auth.login('/app/dashboard');
    } else {
      window.location.href = environment.demoUrl;
    }
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private animate(destroyRef: DestroyRef): void {
    const { gsap } = motion();
    const root = this.host.nativeElement as HTMLElement;
    const ctx = gsap.context(() => {
      // Hero copy, once on load
      gsap.from('.hero-copy > *', { y: 28, opacity: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out', delay: 0.1 });

      // How it works: the line draws as you scroll, each step lights up when the line reaches it
      gsap.fromTo(
        '.steps-line i',
        { scaleX: 0 },
        { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.how-steps', start: 'top 75%', end: 'bottom 55%', scrub: 0.6 } },
      );
      gsap.utils.toArray<HTMLElement>('.how-step').forEach((step, i) => {
        gsap.from(step, {
          y: 24,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.how-steps', start: `top ${75 - i * 8}%`, toggleActions: 'play none none reverse' },
        });
      });
    }, root);
    destroyRef.onDestroy(() => ctx.revert());
  }

  protected price(n: number): string {
    return '₹' + n.toLocaleString('en-IN');
  }
}
