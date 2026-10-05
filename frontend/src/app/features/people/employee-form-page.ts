import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { EmployeeApi } from '../../core/api/employee.api';
import { EmployeeRequest } from '../../core/api/models';
import { NotifyService } from '../../core/notify/notify.service';
import { apiErrorOf } from '../../core/http/api-error';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { isoDate, parseIso, todayIso } from '../../shared/util/dates';

const PHONE = /^\+?[0-9 ()-]{7,20}$/;

/** HR/Admin: add a new employee or edit one (route /people/new or /people/:id/edit). */
@Component({
  selector: 'wv-employee-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, PageHeader, Icon],
  templateUrl: './employee-form-page.html',
  styleUrl: './employee-form-page.scss',
})
export class EmployeeFormPage {
  private readonly api = inject(EmployeeApi);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);

  /** Route param; absent when adding. */
  readonly id = input<string>();
  protected readonly editing = computed(() => !!this.id());
  private readonly employeeId = computed(() => (this.id() ? Number(this.id()) : null));

  protected readonly existing = this.api.employee(this.employeeId);
  protected readonly departments = this.api.departments();
  protected readonly designations = this.api.designations();
  /** Everyone current, for the "Reports to" list (the company is small enough for one page). */
  protected readonly everyone = this.api.directory(signal({ size: 100 }));
  protected readonly managers = computed(() =>
    (this.everyone.value()?.content ?? []).filter((p) => p.id !== this.employeeId()),
  );

  protected readonly maxBirth = parseIso(`${Number(todayIso().slice(0, 4)) - 16}-12-31`);

  protected readonly form = new FormGroup({
    empCode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9-]+$/)] }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(150)] }),
    phone: new FormControl<string | null>(null, Validators.pattern(PHONE)),
    dateOfBirth: new FormControl<Date | null>(null),
    joinDate: new FormControl<Date | null>(parseIso(todayIso()), Validators.required),
    departmentId: new FormControl<number | null>(null),
    designationId: new FormControl<number | null>(null),
    managerId: new FormControl<number | null>(null),
    bankAccount: new FormControl<string | null>(null, Validators.pattern(/^[0-9]{6,20}$/)),
    address: new FormControl<string | null>(null, Validators.maxLength(500)),
    emergencyContactName: new FormControl<string | null>(null, Validators.maxLength(100)),
    emergencyContactPhone: new FormControl<string | null>(null, Validators.pattern(PHONE)),
    keycloakUserId: new FormControl<string | null>(null, Validators.maxLength(64)),
  });

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  private loadedId: number | null = null;

  constructor() {
    // Fill the form once when editing; the employee code can't change after creation
    effect(() => {
      const e = this.existing.value();
      if (!e || this.loadedId === e.id) {
        return;
      }
      this.loadedId = e.id;
      this.form.reset({
        empCode: e.empCode,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phone: e.phone,
        dateOfBirth: e.dateOfBirth ? parseIso(e.dateOfBirth) : null,
        joinDate: parseIso(e.joinDate),
        departmentId: e.departmentId,
        designationId: e.designationId,
        managerId: e.managerId,
        bankAccount: null,
        address: e.address,
        emergencyContactName: e.emergencyContactName,
        emergencyContactPhone: e.emergencyContactPhone,
        keycloakUserId: e.keycloakUserId,
      });
      this.form.controls.empCode.disable();
    });
  }

  protected fieldError(name: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[name];
    if (!c.errors || !(c.touched || c.dirty)) {
      return null;
    }
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return 'Required';
    if (c.errors['email']) return 'Enter a valid email address';
    if (c.errors['pattern']) {
      return name === 'bankAccount' ? '6 to 20 digits' : name === 'empCode' ? 'Letters, digits and dashes only' : 'Use digits, spaces, brackets or dashes (7 to 20 characters)';
    }
    if (c.errors['maxlength']) return 'Too long';
    return 'Check this value';
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Some fields need attention.');
      return;
    }
    const v = this.form.getRawValue();
    const clean = (s: string | null) => (s && s.trim() ? s.trim() : null);
    const body: EmployeeRequest = {
      empCode: v.empCode.trim(),
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim(),
      phone: clean(v.phone),
      dateOfBirth: v.dateOfBirth ? isoDate(v.dateOfBirth) : null,
      joinDate: isoDate(v.joinDate!),
      departmentId: v.departmentId,
      designationId: v.designationId,
      managerId: v.managerId,
      bankAccount: clean(v.bankAccount),
      address: clean(v.address),
      emergencyContactName: clean(v.emergencyContactName),
      emergencyContactPhone: clean(v.emergencyContactPhone),
      keycloakUserId: clean(v.keycloakUserId),
    };
    this.saving.set(true);
    this.error.set('');
    const request = this.editing() ? this.api.update(this.employeeId()!, body) : this.api.create(body);
    request.subscribe({
      next: (saved) => {
        this.notify.success(this.editing() ? `${saved.firstName}'s profile saved` : `${saved.fullName} added`);
        void this.router.navigate(['/app/people', saved.id]);
      },
      error: (err) => {
        this.saving.set(false);
        const body = apiErrorOf(err);
        if (!body || body.status >= 500 || body.status === 403) {
          return;
        }
        for (const [name, message] of Object.entries(body.fieldErrors ?? {})) {
          const control = this.form.get(name);
          control?.setErrors({ server: message });
          control?.markAsTouched();
        }
        this.error.set(body.fieldErrors ? 'Some fields need attention.' : body.message);
      },
    });
  }
}
