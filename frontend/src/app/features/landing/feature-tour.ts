import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { FeatureScene, SceneKind } from './feature-scene';
import { motion, prefersReducedMotion } from './motion';

interface Feature {
  kind: SceneKind;
  title: string;
  text: string;
  points: string[];
}

const FEATURES: Feature[] = [
  {
    kind: 'checkin',
    title: 'Check in with one tap',
    text: 'People start their day from the dashboard, on a laptop or a phone. Forgot? They ask for a fix and their manager approves it.',
    points: ['Hours counted from check-in to check-out', 'Missed days flagged automatically'],
  },
  {
    kind: 'apply',
    title: 'Apply for leave in seconds',
    text: 'Pick the dates and Workvaro counts the working days as you go, skipping weekends and company holidays, and checks the balance before you send.',
    points: ['No overlapping requests', 'Balances per leave type, per year'],
  },
  {
    kind: 'approve',
    title: 'Approve from one inbox',
    text: "Managers see their team's requests the moment they're sent. Approve in one click, or reject with a reason the employee will read.",
    points: ['Only the right manager or HR can decide', 'Balance updates on approval'],
  },
  {
    kind: 'away',
    title: "See who's away before you plan",
    text: "A month view of the team's approved and pending leave, with weekends and holidays marked, so nobody plans a release on the wrong week.",
    points: ['Team view for managers', 'Company view for HR'],
  },
];

/**
 * The features, one at a time. On wide screens the text scrolls past a pinned screen whose demo
 * switches to the feature being read; on phones each feature has its own demo inline.
 */
@Component({
  selector: 'wv-feature-tour',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FeatureScene],
  template: `
    <div class="intro">
      <h2 id="features-title">Everything a working day needs, and nothing it doesn't.</h2>
      <p>Four things your team does every week, made quick and clear.</p>
    </div>

    <div class="layout">
      <div class="texts">
        @for (f of features; track f.kind; let i = $index) {
          <article [class.active]="active() === i" [attr.data-i]="i">
            <h3>{{ f.title }}</h3>
            <p>{{ f.text }}</p>
            <ul>
              @for (p of f.points; track p) {
                <li>{{ p }}</li>
              }
            </ul>
            <wv-feature-scene class="inline" [kind]="f.kind" [active]="seen()[i]" />
          </article>
        }
      </div>
      <div class="stage">
        <div class="stage-inner">
          @for (f of features; track f.kind; let i = $index) {
            <wv-feature-scene class="staged" [class.on]="active() === i" [kind]="f.kind" [active]="active() === i" />
          }
          <div class="dots" aria-hidden="true">
            @for (f of features; track f.kind; let i = $index) {
              <span [class.on]="active() === i"></span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './feature-tour.scss',
})
export class FeatureTour {
  protected readonly features = FEATURES;
  protected readonly active = signal(0);
  /** Phone layout: which inline demos have scrolled into view (they play once each time). */
  protected readonly seen = signal<boolean[]>(FEATURES.map(() => false));

  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (prefersReducedMotion()) {
        this.seen.set(FEATURES.map(() => true));
        return;
      }
      const { ScrollTrigger } = motion();
      const articles = Array.from((this.host.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('article'));
      const triggers = articles.map((el, i) =>
        ScrollTrigger.create({
          trigger: el,
          start: 'top 60%',
          end: 'bottom 60%',
          onToggle: (self) => {
            if (self.isActive) {
              this.active.set(i);
              this.seen.update((s) => s.map((v, j) => (j === i ? true : v)));
            }
          },
          onLeaveBack: () => this.seen.update((s) => s.map((v, j) => (j === i ? false : v))),
        }),
      );
      destroyRef.onDestroy(() => triggers.forEach((t) => t.kill()));
    });
  }
}
