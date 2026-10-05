import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LeaveApi } from '../../core/api/leave.api';
import { Correction } from '../../core/api/models';
import { apiErrorOf } from '../../core/http/api-error';
import { addDays, isoDate, parseIso, todayIso } from '../../shared/util/dates';

/** Ask the manager to fix a day's attendance (missed check-in, wrong times). */
@Component({
  selector: 'wv-correction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>Request an attendance fix</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <p class="lead">Your manager approves it, and the day is updated with these times.</p>
        <mat-form-field appearance="outline">
          <mat-label>Day</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="workDate" [min]="minDate" [max]="maxDate" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
          <mat-hint>Up to 31 days back</mat-hint>
        </mat-form-field>
        <div class="times">
          <mat-form-field appearance="outline">
            <mat-label>Arrived at</mat-label>
            <input matInput type="time" formControlName="checkIn" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Left at</mat-label>
            <input matInput type="time" formControlName="checkOut" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>What happened?</mat-label>
          <textarea matInput rows="2" maxlength="500" formControlName="reason" placeholder="e.g. Forgot to check in"></textarea>
          @if (form.controls.reason.touched && form.controls.reason.invalid) {
            <mat-error>Add a short reason for your manager</mat-error>
          }
        </mat-form-field>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Sending...' : 'Send for approval' }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    form { display: contents; }
    mat-form-field { width: 100%; }
    .lead { margin: 0 0 16px; color: var(--wv-muted); }
    .times { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .error { color: var(--wv-alert-text); background: var(--wv-alert-soft); padding: 10px 14px; border-radius: var(--wv-radius-control); margin: 0; }
  `,
})
export class CorrectionDialog {
  private readonly api = inject(LeaveApi);
  private readonly ref = inject<MatDialogRef<CorrectionDialog, Correction>>(MatDialogRef);
  private readonly preset = inject<{ date?: string } | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly minDate = parseIso(addDays(todayIso(), -31));
  protected readonly maxDate = parseIso(todayIso());

  protected readonly form = new FormGroup({
    workDate: new FormControl<Date | null>(this.preset?.date ? parseIso(this.preset.date) : null, Validators.required),
    checkIn: new FormControl('09:30', { nonNullable: true, validators: Validators.required }),
    checkOut: new FormControl('18:00', { nonNullable: true, validators: Validators.required }),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
  });
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected submit(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (v.checkOut <= v.checkIn) {
      this.error.set('The time you left has to be after the time you arrived.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.requestCorrection({ workDate: isoDate(v.workDate!), checkIn: v.checkIn, checkOut: v.checkOut, reason: v.reason.trim() }).subscribe({
      next: (c) => this.ref.close(c),
      error: (err) => {
        this.saving.set(false);
        const body = apiErrorOf(err);
        if (body && body.status < 500 && body.status !== 403) {
          this.error.set(body.fieldErrors ? Object.values(body.fieldErrors).join('. ') : body.message);
        }
      },
    });
  }
}

export function openCorrection(dialog: MatDialog, date?: string) {
  return dialog.open<CorrectionDialog, { date?: string }, Correction>(CorrectionDialog, { width: '460px', data: { date } }).afterClosed();
}
