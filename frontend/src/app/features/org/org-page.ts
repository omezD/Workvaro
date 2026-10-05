import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import { EmployeeApi } from '../../core/api/employee.api';
import { LeaveApi } from '../../core/api/leave.api';
import { Department, DepartmentRequest, Designation, DesignationRequest, LeaveType, LeaveTypeRequest } from '../../core/api/models';
import { NotifyService } from '../../core/notify/notify.service';
import { apiMessage } from '../../core/http/api-error';
import { openConfirm } from '../../shared/ui/confirm-dialog';
import { LoadError } from '../../shared/ui/load-error';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusChip } from '../../shared/ui/status-chip';
import { FieldSpec, openEntityDialog } from './entity-dialog';

const DEPARTMENT_FIELDS: FieldSpec[] = [
  { key: 'code', label: 'Code', type: 'text', required: true, maxLength: 20, pattern: /^[A-Za-z0-9_-]+$/, patternMessage: "Letters, digits, '-' and '_' only", hint: 'Short code, e.g. ENG' },
  { key: 'name', label: 'Name', type: 'text', required: true, maxLength: 100 },
  { key: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
];

const DESIGNATION_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, maxLength: 100 },
  { key: 'level', label: 'Level', type: 'number', required: true, min: 1, max: 20, hint: '1 = entry level; higher is more senior' },
  { key: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
];

const LEAVE_TYPE_FIELDS: FieldSpec[] = [
  { key: 'code', label: 'Code', type: 'text', required: true, maxLength: 10, pattern: /^[A-Za-z0-9_]+$/, patternMessage: "Letters, digits and '_' only", hint: 'e.g. CL' },
  { key: 'name', label: 'Name', type: 'text', required: true, maxLength: 60 },
  { key: 'annualQuota', label: 'Days per year', type: 'number', required: true, min: 0, max: 365, hint: 'New allowances use this; existing balances are not changed' },
  { key: 'paid', label: 'Paid leave', type: 'checkbox' },
  { key: 'unlimited', label: 'No yearly limit', type: 'checkbox', hint: 'For unpaid leave: no balance check' },
  { key: 'active', label: 'Available to apply for', type: 'checkbox' },
];

/** HR/Admin reference data: departments, designations and leave types. */
@Component({
  selector: 'wv-org-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, MatTabsModule, MatButtonModule, LoadError, StatusChip],
  templateUrl: './org-page.html',
  styleUrl: './org-page.scss',
})
export class OrgPage {
  private readonly employees = inject(EmployeeApi);
  private readonly leave = inject(LeaveApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  protected readonly departments = this.employees.departments();
  protected readonly designations = this.employees.designations();
  protected readonly leaveTypes = this.leave.leaveTypes(signal(false));

  // ----- departments -----
  protected editDepartment(d?: Department): void {
    openEntityDialog(this.dialog, {
      title: d ? `Edit ${d.name}` : 'Add a department',
      submitLabel: d ? 'Save' : 'Add department',
      fields: DEPARTMENT_FIELDS,
      value: { ...d },
      save: (v) => (d ? this.employees.updateDepartment(d.id, v as unknown as DepartmentRequest) : this.employees.createDepartment(v as unknown as DepartmentRequest)),
    }).subscribe((saved) => this.done(saved, d ? 'Department saved' : 'Department added', () => this.departments.reload()));
  }

  protected deleteDepartment(d: Department): void {
    this.confirmDelete(d.name, 'department', this.employees.deleteDepartment(d.id), () => this.departments.reload());
  }

  // ----- designations -----
  protected editDesignation(d?: Designation): void {
    openEntityDialog(this.dialog, {
      title: d ? `Edit ${d.title}` : 'Add a designation',
      submitLabel: d ? 'Save' : 'Add designation',
      fields: DESIGNATION_FIELDS,
      value: d ? { ...d } : { level: 1 },
      save: (v) => (d ? this.employees.updateDesignation(d.id, v as unknown as DesignationRequest) : this.employees.createDesignation(v as unknown as DesignationRequest)),
    }).subscribe((saved) => this.done(saved, d ? 'Designation saved' : 'Designation added', () => this.designations.reload()));
  }

  protected deleteDesignation(d: Designation): void {
    this.confirmDelete(d.title, 'designation', this.employees.deleteDesignation(d.id), () => this.designations.reload());
  }

  // ----- leave types -----
  protected editLeaveType(t?: LeaveType): void {
    openEntityDialog(this.dialog, {
      title: t ? `Edit ${t.name}` : 'Add a leave type',
      submitLabel: t ? 'Save' : 'Add leave type',
      fields: LEAVE_TYPE_FIELDS,
      value: t ? { ...t } : { annualQuota: 0, paid: true, unlimited: false, active: true },
      save: (v) => (t ? this.leave.updateLeaveType(t.id, v as unknown as LeaveTypeRequest) : this.leave.createLeaveType(v as unknown as LeaveTypeRequest)),
    }).subscribe((saved) => this.done(saved, t ? 'Leave type saved' : 'Leave type added', () => this.leaveTypes.reload()));
  }

  private done(saved: unknown, message: string, reload: () => void): void {
    if (saved) {
      this.notify.success(message);
      reload();
    }
  }

  private confirmDelete(name: string, kind: string, request: Observable<void>, reload: () => void): void {
    openConfirm(this.dialog, {
      title: `Delete ${name}?`,
      message: `Only possible when no employee has this ${kind}.`,
      confirmLabel: `Delete ${kind}`,
      tone: 'danger',
    }).subscribe((ok) => {
      if (!ok) {
        return;
      }
      request.subscribe({
        next: () => {
          this.notify.success(`${name} deleted`);
          reload();
        },
        error: (err) => {
          if (err.status === 409 || err.status === 404) {
            this.notify.error(apiMessage(err));
          }
        },
      });
    });
  }
}
