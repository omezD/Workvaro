import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmployeeDetail } from '../../core/api/models';
import { fmtDate } from '../../shared/util/dates';

/** Read-only profile sections, shared by a colleague's profile and "My profile". */
@Component({
  selector: 'wv-employee-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="wv-card">
      <h2>Work</h2>
      <dl>
        <div><dt>Employee code</dt><dd>{{ e().empCode }}</dd></div>
        <div><dt>Department</dt><dd>{{ e().departmentName ?? 'Unassigned' }}</dd></div>
        <div><dt>Designation</dt><dd>{{ e().designationTitle ?? 'Not set' }}</dd></div>
        <div>
          <dt>Reports to</dt>
          <dd>
            @if (e().managerId) {
              <a [routerLink]="['/app/people', e().managerId]">{{ e().managerName }}</a>
            } @else {
              Nobody
            }
          </dd>
        </div>
        <div><dt>Joined</dt><dd>{{ date(e().joinDate) }}</dd></div>
      </dl>
    </section>

    <section class="wv-card">
      <h2>Contact</h2>
      <dl>
        <div><dt>Email</dt><dd><a [href]="'mailto:' + e().email">{{ e().email }}</a></dd></div>
        <div><dt>Phone</dt><dd>{{ e().phone ?? 'Not added' }}</dd></div>
        <div><dt>Address</dt><dd>{{ e().address ?? 'Not added' }}</dd></div>
        <div>
          <dt>Emergency contact</dt>
          <dd>{{ e().emergencyContactName ? e().emergencyContactName + (e().emergencyContactPhone ? ', ' + e().emergencyContactPhone : '') : 'Not added' }}</dd>
        </div>
      </dl>
    </section>

    <section class="wv-card">
      <h2>Personal and payroll</h2>
      <dl>
        <div><dt>Date of birth</dt><dd>{{ e().dateOfBirth ? date(e().dateOfBirth!) : 'Not added' }}</dd></div>
        <div>
          <dt>Bank account</dt>
          <dd>
            {{ e().bankAccount ?? 'Not added' }}
            @if (e().bankAccountMasked) {
              <span class="hint">Only HR and the employee see the full number</span>
            }
          </dd>
        </div>
      </dl>
    </section>
  `,
  styles: `
    :host { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; align-items: start; }
    h2 { font-size: var(--wv-text-lg); margin-bottom: 14px; }
    dl { margin: 0; display: flex; flex-direction: column; gap: 12px; }
    dl div { display: grid; grid-template-columns: 140px 1fr; gap: 12px; font-size: 14px; }
    dt { color: var(--wv-muted); }
    dd { margin: 0; overflow-wrap: anywhere; }
    a { text-decoration: none; font-weight: 500; }
    .hint { display: block; font-size: 12px; color: var(--wv-muted); margin-top: 2px; }
  `,
})
export class EmployeeDetails {
  readonly e = input.required<EmployeeDetail>();

  protected date(iso: string) {
    return fmtDate(iso);
  }
}
