import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { Avatar } from '../../shared/ui/avatar';
import { motion, prefersReducedMotion } from './motion';

interface Person {
  name: string;
  team: string;
  /** Final state after the opening animation. */
  state: 'in' | 'leave' | 'out';
  time?: string;
}

const PEOPLE: Person[] = [
  { name: 'Esha Patel', team: 'Engineering', state: 'in', time: '09:04' },
  { name: 'Rohan Mehta', team: 'Engineering', state: 'in', time: '08:51' },
  { name: 'Kavya Iyer', team: 'Engineering', state: 'leave' },
  { name: 'Priya Sharma', team: 'Finance', state: 'in', time: '09:15' },
  { name: 'Vikram Singh', team: 'Operations', state: 'in', time: '09:41' },
  { name: 'Imran Shaikh', team: 'Engineering', state: 'out' },
];

/**
 * The hero's one orchestrated moment: this morning's check-ins arrive one by one, then a leave
 * request comes in and is approved. Plays once on load; reduced motion shows the end state.
 */
@Component({
  selector: 'wv-hero-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar],
  template: `
    <div class="board" aria-hidden="true">
      <div class="head">
        <div>
          <b>Today at Workvaro</b>
          <span>Tuesday, 9:42 am</span>
        </div>
        <span class="count"><b class="in-count">4</b> in</span>
      </div>
      <ul>
        @for (p of people; track p.name; let i = $index) {
          <li [attr.data-i]="i" [attr.data-state]="p.state">
            <wv-avatar [name]="p.name" [size]="34" [dot]="p.state === 'in' ? 'in' : p.state === 'leave' ? 'away' : 'none'" />
            <span class="who"><b>{{ p.name }}</b><small>{{ p.team }}</small></span>
            <span class="state">
              @if (p.state === 'in') {
                <span class="pill in">In since {{ p.time }}</span>
              } @else if (p.state === 'leave') {
                <span class="pill away">On leave</span>
              } @else {
                <span class="pill idle">Not in yet</span>
              }
            </span>
          </li>
        }
      </ul>
    </div>

    <div class="request" aria-hidden="true">
      <wv-avatar name="Arjun Nair" [size]="36" />
      <div class="req-text">
        <b>Arjun Nair, casual leave</b>
        <span>Mon 12 to Wed 14 Oct, 3 working days</span>
      </div>
      <span class="decision">
        <span class="btn">Approve</span>
        <span class="pill in done">Approved</span>
      </span>
    </div>
    <p class="sr-only">An example Workvaro board showing who has checked in today and a leave request being approved.</p>
  `,
  styleUrl: './hero-board.scss',
})
export class HeroBoard {
  protected readonly people = PEOPLE;
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (prefersReducedMotion()) {
        this.host.nativeElement.classList.add('static');
        return;
      }
      const { gsap } = motion();
      const root = this.host.nativeElement as HTMLElement;
      const counter = { n: 0 };
      const countEl = root.querySelector('.in-count')!;
      const rows = gsap.utils.toArray<HTMLElement>('li', root);
      const ins = rows.filter((r) => r.dataset['state'] === 'in');

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      // Starting state, applied before anything is drawn: nobody in yet, request not decided
      tl.set(ins.map((r) => r.querySelector('.state')), { opacity: 0 }, 0)
        .set(ins.map((r) => r.querySelector('.dot')), { scale: 0 }, 0)
        .set(root.querySelector('.request .btn'), { opacity: 1 }, 0)
        .set(root.querySelector('.request .done'), { opacity: 0 }, 0)
        .call(() => (countEl.textContent = '0'), [], 0)
        .from(root.querySelector('.board'), { y: 24, opacity: 0, duration: 0.7 }, 0.35)
        .from(rows, { opacity: 0, x: -12, duration: 0.4, stagger: 0.07 }, '-=0.35');
      ins.forEach((row, i) => {
        tl.to(row.querySelector('.state'), { opacity: 1, duration: 0.3 }, i === 0 ? '+=0.15' : '+=0.28')
          .fromTo(row, { backgroundColor: 'rgba(61, 190, 122, 0.18)' }, { backgroundColor: 'rgba(61, 190, 122, 0)', duration: 0.9, immediateRender: false }, '<')
          .to(row.querySelector('.dot'), { scale: 1, duration: 0.3, ease: 'back.out(3)' }, '<')
          .to(counter, { n: i + 1, duration: 0.2, snap: { n: 1 }, onUpdate: () => (countEl.textContent = String(counter.n)) }, '<');
      });
      tl.from(root.querySelector('.request'), { y: 30, opacity: 0, duration: 0.6 }, '+=0.3')
        .to(root.querySelector('.request .btn'), { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 }, '+=0.7')
        .to(root.querySelector('.request .btn'), { opacity: 0, duration: 0.2 })
        .fromTo(root.querySelector('.request .done'), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, '<');

      destroyRef.onDestroy(() => tl.kill());
    });
  }
}
