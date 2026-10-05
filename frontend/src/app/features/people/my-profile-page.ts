import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EmployeeApi } from '../../core/api/employee.api';
import { AuthService } from '../../core/auth/auth.service';
import { NotifyService } from '../../core/notify/notify.service';
import { apiErrorOf } from '../../core/http/api-error';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { LoadError } from '../../shared/ui/load-error';
import { StatusChip } from '../../shared/ui/status-chip';
import { EmployeeDetails } from './employee-details';

const PHONE = /^\+?[0-9 ()-]{7,20}$/;

/** The signed-in person's own record. Contact details are editable; everything else is kept by HR. */
@Component({
  selector: 'wv-my-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, Avatar, StatusChip, EmployeeDetails, EmptyState, LoadError],
  template: `
    @if (me.hasValue() && me.value(); as p) {
      <header class="head">
        <wv-avatar [name]="p.fullName" [size]="72" />
        <div>
          <h1>{{ p.fullName }}</h1>
          <p>{{ p.designationTitle ?? 'No designation' }}{{ p.departmentName ? ', ' + p.departmentName : '' }}</p>
        </div>
        <wv-status-chip [status]="p.status" />
        <div class="actions">
          <button mat-stroked-button type="button" (click)="auth.manageAccount()">Password and sign-in security</button>
          @if (!editing()) {
            <button mat-flat-button type="button" (click)="edit()">Edit contact details</button>
          }
        </div>
      </header>

      @if (editing()) {
        <section class="wv-card form-card">
          <h2>Contact details</h2>
          <p class="wv-muted">Your name, role, department and bank details are kept by HR. Ask them if something there is wrong.</p>
          <form [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" inputmode="tel" />
              @if (form.controls.phone.invalid) {
                <mat-error>Use digits, spaces, brackets or dashes (7 to 20 characters)</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Address</mat-label>
              <textarea matInput rows="2" maxlength="500" formControlName="address"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Emergency contact name</mat-label>
              <input matInput maxlength="100" formControlName="emergencyContactName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Emergency contact phone</mat-label>
              <input matInput formControlName="emergencyContactPhone" inputmode="tel" />
              @if (form.controls.emergencyContactPhone.invalid) {
                <mat-error>Use digits, spaces, brackets or dashes (7 to 20 characters)</mat-error>
              }
            </mat-form-field>
            <div class="buttons wide">
              <button mat-button type="button" (click)="editing.set(false)">Cancel</button>
              <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save changes' }}</button>
            </div>
          </form>
        </section>
      }
      <wv-employee-details [e]="p" />
    } @else if (me.error()) {
      @if (apiStatus() === 404) {
        <section class="wv-card">
          <wv-empty-state icon="people" title="Your profile isn't set up yet"
            text="Your sign-in works, but HR hasn't added your employee record. Ask HR to create it with the same email address you sign in with." />
        </section>
      } @else {
        <section class="wv-card"><wv-load-error (retry)="me.reload()" /></section>
      }
    } @else {
      <div class="wv-skeleton"><span style="height: 90px"></span><span style="height: 220px"></span></div>
    }
  `,
  styles: `
    .head { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-bottom: 24px; }
    h1 { font-size: var(--wv-text-3xl); letter-spacing: -0.025em; }
    .head p { margin: 4px 0 0; color: var(--wv-muted); }
    .actions { margin-left: auto; display: flex; gap: 10px; flex-wrap: wrap; }
    .form-card { margin-bottom: 18px; }
    h2 { font-size: var(--wv-text-lg); }
    .form-card > p { margin: 6px 0 18px; }
    form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
    .wide { grid-column: 1 / -1; }
    .buttons { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 640px) { form { grid-template-columns: 1fr; } }
  `,
})
export class MyProfilePage {
  private readonly api = inject(EmployeeApi);
  private readonly notify = inject(NotifyService);
  protected readonly auth = inject(AuthService);

  protected readonly me = this.api.me();
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly apiStatus = signal<number | null>(null);

  protected readonly form = new FormGroup({
    phone: new FormControl<string | null>(null, Validators.pattern(PHONE)),
    address: new FormControl<string | null>(null, Validators.maxLength(500)),
    emergencyContactName: new FormControl<string | null>(null, Validators.maxLength(100)),
    emergencyContactPhone: new FormControl<string | null>(null, Validators.pattern(PHONE)),
  });

  constructor() {
    effect(() => this.apiStatus.set(apiErrorOf(this.me.error())?.status ?? (this.me.error() ? 0 : null)));
  }

  protected edit(): void {
    const p = this.me.value()!;
    this.form.reset({ phone: p.phone, address: p.address, emergencyContactName: p.emergencyContactName, emergencyContactPhone: p.emergencyContactPhone });
    this.editing.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const clean = (s: string | null) => (s && s.trim() ? s.trim() : null);
    this.saving.set(true);
    this.api
      .updateMe({ phone: clean(v.phone), address: clean(v.address), emergencyContactName: clean(v.emergencyContactName), emergencyContactPhone: clean(v.emergencyContactPhone) })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(false);
          this.notify.success('Contact details saved');
          this.me.reload();
        },
        error: (err) => {
          this.saving.set(false);
          const fields = apiErrorOf(err)?.fieldErrors ?? {};
          for (const [name, message] of Object.entries(fields)) {
            this.form.get(name)?.setErrors({ server: message });
          }
        },
      });
  }
}
