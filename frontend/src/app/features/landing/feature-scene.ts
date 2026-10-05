import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input } from '@angular/core';
import { Avatar } from '../../shared/ui/avatar';
import { motion, prefersReducedMotion } from './motion';

export type SceneKind = 'checkin' | 'apply' | 'approve' | 'away';

/**
 * Small, self-playing demo of one feature. Plays from the start whenever `active` turns true;
 * the markup's default (no animation) is the scene's finished state.
 */
@Component({
  selector: 'wv-feature-scene',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar],
  templateUrl: './feature-scene.html',
  styleUrl: './feature-scene.scss',
  host: { 'aria-hidden': 'true', '[class]': 'kind()' },
})
export class FeatureScene {
  readonly kind = input.required<SceneKind>();
  readonly active = input(false);

  protected readonly week = [
    { d: 'Mon', n: 12, on: true },
    { d: 'Tue', n: 13, on: true },
    { d: 'Wed', n: 14, on: true },
    { d: 'Thu', n: 15, on: false },
    { d: 'Fri', n: 16, on: false },
    { d: 'Sat', n: 17, weekend: true },
    { d: 'Sun', n: 18, weekend: true },
  ];
  protected readonly away = [
    { name: 'Kavya Iyer', from: 2, span: 2, pending: false },
    { name: 'Rohan Mehta', from: 9, span: 2, pending: true },
    { name: 'Sneha Kulkarni', from: 15, span: 3, pending: false },
    { name: 'Imran Shaikh', from: 20, span: 5, pending: false },
  ];
  protected readonly days = Array.from({ length: 26 }, (_, i) => i);

  private readonly host = inject(ElementRef<HTMLElement>);
  private timeline?: gsap.core.Timeline;

  constructor() {
    afterNextRender(() => {
      if (!prefersReducedMotion()) {
        this.timeline = this.build();
        if (this.active()) {
          this.timeline.restart();
        }
      }
    });
    effect(() => {
      if (this.active()) {
        this.timeline?.restart();
      }
    });
    inject(DestroyRef).onDestroy(() => this.timeline?.kill());
  }

  private build(): gsap.core.Timeline {
    const { gsap } = motion();
    const root = this.host.nativeElement as HTMLElement;
    const q = (s: string) => root.querySelector(s);
    const qa = (s: string) => gsap.utils.toArray<HTMLElement>(s, root);
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });

    switch (this.kind()) {
      case 'checkin': {
        const arc = q('.arc-fill') as SVGCircleElement;
        const len = 2 * Math.PI * 54;
        tl.set(q('.state-in'), { opacity: 0 })
          .set(q('.state-out'), { opacity: 1 })
          .set(q('.press'), { opacity: 1, scale: 1 })
          .set(arc, { strokeDashoffset: len })
          .to(q('.press'), { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 }, 0.6)
          .to(q('.state-out'), { opacity: 0, duration: 0.2 })
          .to(q('.press'), { opacity: 0, duration: 0.2 }, '<')
          .to(q('.state-in'), { opacity: 1, duration: 0.3 })
          .to(arc, { strokeDashoffset: len * 0.62, duration: 1.4, ease: 'power1.inOut' }, '<');
        break;
      }
      case 'apply': {
        const counter = { n: 0 };
        const countEl = q('.days-count')!;
        tl.set(qa('.day.on'), { backgroundColor: 'transparent', color: 'inherit' })
          .set(q('.toast'), { opacity: 0, y: 10 })
          .call(() => (countEl.textContent = '0'));
        qa('.day.on').forEach((day, i) => {
          tl.to(day, { backgroundColor: 'var(--wv-leaf)', color: 'var(--wv-leaf-ink)', duration: 0.25 }, 0.4 + i * 0.35).to(
            counter,
            { n: i + 1, duration: 0.2, snap: { n: 1 }, onUpdate: () => (countEl.textContent = String(counter.n)) },
            '<',
          );
        });
        tl.fromTo(qa('.day.weekend'), { opacity: 0.4 }, { opacity: 1, duration: 0.3, yoyo: true, repeat: 1 }, '+=0.1')
          .to(q('.send'), { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1 }, '+=0.3')
          .to(q('.toast'), { opacity: 1, y: 0, duration: 0.35 });
        break;
      }
      case 'approve': {
        const ring = q('.ring-fill') as SVGCircleElement;
        const len = 2 * Math.PI * 31;
        const counter = { n: 11 };
        const countEl = q('.left')!;
        tl.set(q('.chip-pending'), { opacity: 1 })
          .set(q('.chip-approved'), { opacity: 0, scale: 0.8 })
          .set(qa('.decide'), { opacity: 1 })
          .set(ring, { strokeDashoffset: len * (1 - 11 / 12) })
          .call(() => (countEl.textContent = '11'))
          .to(q('.decide.yes'), { scale: 0.88, duration: 0.12, yoyo: true, repeat: 1 }, 0.7)
          .to(qa('.decide'), { opacity: 0, duration: 0.2 })
          .to(q('.chip-pending'), { opacity: 0, duration: 0.2 }, '<')
          .to(q('.chip-approved'), { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' })
          .to(ring, { strokeDashoffset: len * (1 - 8 / 12), duration: 0.9 }, '+=0.2')
          .to(counter, { n: 8, duration: 0.9, snap: { n: 1 }, onUpdate: () => (countEl.textContent = String(counter.n)) }, '<');
        break;
      }
      case 'away': {
        tl.fromTo(qa('.bar'), { scaleX: 0 }, { scaleX: 1, duration: 0.6, stagger: 0.18, ease: 'power3.out', transformOrigin: 'left center' }, 0.3).fromTo(
          q('.today'),
          { opacity: 0 },
          { opacity: 1, duration: 0.4 },
          '-=0.2',
        );
        break;
      }
    }
    return tl;
  }
}
