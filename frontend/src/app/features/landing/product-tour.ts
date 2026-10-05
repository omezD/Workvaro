import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { Avatar } from '../../shared/ui/avatar';
import { Logo } from '../../shared/ui/logo';
import { motion, prefersReducedMotion } from './motion';

const STEPS = [
  { title: 'Esha applies for leave', text: 'Three working days, counted for her.' },
  { title: 'Manoj approves it', text: 'It was waiting on his dashboard.' },
  { title: "Esha's balance updates", text: 'Approved, and deducted, right away.' },
  { title: 'HR sees the whole company', text: "Who's in, who's away, what's pending." },
];

/** 880x550 design canvas, scaled to the frame width. */
const CANVAS_W = 880;

/**
 * Autoplaying product tour in place of a video: a scripted run through the real flow, looping while
 * it's on screen. Visitors can pause it; with reduced motion it shows a still of the last scene.
 */
@Component({
  selector: 'wv-product-tour',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Logo],
  templateUrl: './product-tour.html',
  styleUrl: './product-tour.scss',
})
export class ProductTour {
  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly playing = signal(false);
  protected readonly reduced = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private timeline?: gsap.core.Timeline;
  private userPaused = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const root = this.host.nativeElement as HTMLElement;
      const frame = root.querySelector<HTMLElement>('.screen')!;
      const canvas = root.querySelector<HTMLElement>('.canvas')!;
      const fit = () => canvas.style.setProperty('--scale', String(frame.clientWidth / CANVAS_W));
      fit();
      const resize = new ResizeObserver(fit);
      resize.observe(frame);
      destroyRef.onDestroy(() => resize.disconnect());

      if (prefersReducedMotion()) {
        this.reduced.set(true);
        this.step.set(3);
        root.classList.add('static');
        return;
      }
      const { ScrollTrigger } = motion();
      this.timeline = this.build(root);
      const trigger = ScrollTrigger.create({
        trigger: frame,
        start: 'top 75%',
        end: 'bottom 20%',
        onToggle: (self) => {
          if (self.isActive && !this.userPaused) {
            this.timeline!.play();
            this.playing.set(true);
          } else if (!self.isActive) {
            this.timeline!.pause();
            this.playing.set(false);
          }
        },
      });
      destroyRef.onDestroy(() => {
        trigger.kill();
        this.timeline?.kill();
      });
    });
  }

  protected toggle(): void {
    if (!this.timeline) {
      return;
    }
    if (this.playing()) {
      this.userPaused = true;
      this.timeline.pause();
      this.playing.set(false);
    } else {
      this.userPaused = false;
      this.timeline.play();
      this.playing.set(true);
    }
  }

  private build(root: HTMLElement): gsap.core.Timeline {
    const { gsap } = motion();
    const q = (s: string) => root.querySelector(s)!;
    const cursor = q('.cursor');
    /** Moves the cursor onto an element (canvas coordinates), then "clicks" it. */
    const clickOn = (tl: gsap.core.Timeline, selector: string, at?: string) => {
      const target = q(selector) as HTMLElement;
      const canvas = q('.canvas') as HTMLElement;
      const box = () => {
        const scale = Number(getComputedStyle(canvas).getPropertyValue('--scale')) || 1;
        const c = canvas.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        return { x: (t.left - c.left + t.width * 0.6) / scale, y: (t.top - c.top + t.height * 0.6) / scale };
      };
      tl.to(cursor, { x: () => box().x, y: () => box().y, duration: 0.9, ease: 'power2.inOut' }, at)
        .to(cursor, { scale: 0.8, duration: 0.1, yoyo: true, repeat: 1 })
        .to(target, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 }, '<');
    };
    const setChip = (selector: string, tone: 'ok' | 'wait', text: string) => () => {
      const chip = q(selector) as HTMLElement;
      chip.className = `chip ${tone}`;
      chip.textContent = text;
    };
    const balance = { n: 11 };
    const days = { n: 1 };
    const tiles = { n: 0 };
    const tileEls = gsap.utils.toArray<HTMLElement>('.hr-tile b', root);
    const ringLen = 2 * Math.PI * 31;

    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.5, defaults: { ease: 'power2.out' } });
    tl.call(() => this.step.set(0))
      // Reset everything to the opening state
      .set(gsap.utils.toArray('.view', root), { autoAlpha: 0 })
      .set(q('.view.esha'), { autoAlpha: 1 })
      .set([q('.dialog'), q('.toast')], { autoAlpha: 0 })
      .call(setChip('.esha-upcoming .chip', 'wait', 'Pending'))
      .call(setChip('.inbox-row .chip', 'wait', 'Pending'))
      .set(q('.inbox-row .acts'), { autoAlpha: 1 })
      .set(q('.esha-upcoming'), { autoAlpha: 0, y: 8 })
      .set(q('.ring-fill'), { strokeDashoffset: ringLen * (1 - 11 / 12) })
      .set(q('.ring-num'), { textContent: '11' })
      .set(gsap.utils.toArray('.hr-bars span', root), { scaleX: 0 })
      .set(cursor, { x: 700, y: 470, autoAlpha: 1 });

    // 1. Esha applies
    clickOn(tl, '.apply-btn', '+=0.5');
    tl.to(q('.dialog'), { autoAlpha: 1, y: 0, duration: 0.35 }, '+=0.05')
      .fromTo(days, { n: 1 }, { n: 3, duration: 0.9, snap: { n: 1 }, onUpdate: () => (q('.dialog .days').textContent = String(days.n)) }, '+=0.2');
    clickOn(tl, '.send-btn', '+=0.3');
    tl.to(q('.dialog'), { autoAlpha: 0, duration: 0.25 })
      .to(q('.esha-upcoming'), { autoAlpha: 1, y: 0, duration: 0.4 })
      .set(q('.toast'), { textContent: 'Leave request sent for 3 days' })
      .to(q('.toast'), { autoAlpha: 1, duration: 0.3 }, '<')
      .to(q('.toast'), { autoAlpha: 0, duration: 0.3 }, '+=1.1');

    // 2. Manoj approves
    tl.call(() => this.step.set(1))
      .to(q('.view.esha'), { autoAlpha: 0, duration: 0.35 })
      .to(q('.view.manager'), { autoAlpha: 1, duration: 0.35 }, '<');
    clickOn(tl, '.approve-btn', '+=0.4');
    tl.to(q('.inbox-row .acts'), { autoAlpha: 0, duration: 0.2 })
      .call(setChip('.inbox-row .chip', 'ok', 'Approved'))
      .fromTo(q('.inbox-row .chip'), { scale: 0.8 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' })
      .set(q('.toast'), { textContent: "Approved Esha's casual leave" }, '<')
      .to(q('.toast'), { autoAlpha: 1, duration: 0.3 }, '<')
      .to(q('.toast'), { autoAlpha: 0, duration: 0.3 }, '+=1.1');

    // 3. Esha's balance
    tl.call(() => this.step.set(2))
      .to(q('.view.manager'), { autoAlpha: 0, duration: 0.35 })
      .to(q('.view.esha'), { autoAlpha: 1, duration: 0.35 }, '<')
      .call(setChip('.esha-upcoming .chip', 'ok', 'Approved'))
      .to(q('.ring-fill'), { strokeDashoffset: ringLen * (1 - 8 / 12), duration: 1.1, ease: 'power1.inOut' }, '+=0.3')
      .to(balance, { n: 8, duration: 1.1, snap: { n: 1 }, onUpdate: () => (q('.ring-num').textContent = String(balance.n)) }, '<')
      .to(cursor, { autoAlpha: 0, duration: 0.3 }, '<');

    // 4. HR overview
    tl.call(() => this.step.set(3), [], '+=1.2')
      .to(q('.view.esha'), { autoAlpha: 0, duration: 0.35 })
      .to(q('.view.hr'), { autoAlpha: 1, duration: 0.35 }, '<')
      .fromTo(tiles, { n: 0 }, { n: 1, duration: 1, onUpdate: () => tileEls.forEach((el) => (el.textContent = String(Math.round(Number(el.dataset['n']) * tiles.n)))) }, '+=0.1')
      .to(gsap.utils.toArray('.hr-bars span', root), { scaleX: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out' }, '<0.2')
      .to({}, { duration: 2.4 });
    return tl;
  }
}
