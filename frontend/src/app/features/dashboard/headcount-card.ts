import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmployeeStats } from '../../core/api/models';

/** HR/Admin: current headcount by department as simple proportional bars. */
@Component({
  selector: 'wv-headcount-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'wv-card' },
  template: `
    <div class="head">
      <h2>People by department</h2>
      @if (stats(); as s) {
        <span class="total"><b>{{ s.totalCurrent }}</b> current employees</span>
      }
    </div>
    @if (!stats()) {
      <div class="skeleton" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    } @else {
      <ul>
        @for (d of stats()!.byDepartment; track d.departmentName) {
          <li>
            <a [routerLink]="['/app/people']" [queryParams]="{ dept: d.departmentId }">{{ d.departmentName }}</a>
            <span class="bar"><span [style.width.%]="share(d.headcount)"></span></span>
            <b>{{ d.headcount }}</b>
          </li>
        }
      </ul>
      @if (stats()!.byStatus.ON_NOTICE) {
        <p class="wv-muted note">{{ stats()!.byStatus.ON_NOTICE }} on notice period.</p>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    h2 { font-size: var(--wv-text-lg); }
    .total { margin-left: auto; color: var(--wv-muted); font-size: 14px; }
    .total b { color: var(--wv-ink); font-family: var(--wv-font-display); font-size: 20px; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    li { display: grid; grid-template-columns: 140px 1fr 32px; gap: 12px; align-items: center; font-size: 14px; }
    li a { color: inherit; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    li a:hover { color: var(--wv-leaf-text); }
    .bar { height: 10px; border-radius: 99px; background: var(--wv-sunk); overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: 99px; background: var(--wv-leaf); }
    li b { text-align: right; }
    .note { margin: 14px 0 0; font-size: 13px; }
    .skeleton { display: flex; flex-direction: column; gap: 14px; }
    .skeleton span { height: 14px; border-radius: 99px; background: var(--wv-sunk); }
  `,
})
export class HeadcountCard {
  readonly stats = input<EmployeeStats | undefined>();
  private readonly max = computed(() => Math.max(1, ...(this.stats()?.byDepartment.map((d) => d.headcount) ?? [1])));

  protected share(n: number): number {
    return Math.round((n / this.max()) * 100);
  }
}
