import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { startWith } from 'rxjs';
import { LeaveApi } from '../../core/api/leave.api';
import { LeaveRequest } from '../../core/api/models';
import { apiErrorOf } from '../../core/http/api-error';
import { addDays, fmtWeekday, isoDate, parseIso, todayIso, workingDays } from '../../shared/util/dates';

/** Leave application. The working-day count updates live using the same rule as the server. */
@Component({
  selector: 'wv-apply-leave-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>Apply for leave</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Leave type</mat-label>
          <mat-select formControlName="leaveTypeId">
            @for (t of types.value(); track t.id) {
              <mat-option [value]="t.id">
                {{ t.name }}
                <span class="hint">{{ balanceHint(t.id) }}</span>
              </mat-option>
            }
          </mat-select>
          @if (serverErrors()['leaveTypeId']; as e) {
            <mat-error>{{ e }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Dates</mat-label>
          <mat-date-range-input [rangePicker]="picker" [min]="minDate">
            <input matStartDate formControlName="start" placeholder="First day" />
            <input matEndDate formControlName="end" placeholder="Last day" />
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-date-range-picker #picker />
          <mat-hint>Pick the first and last day you'll be away</mat-hint>
        </mat-form-field>

        @if (summary(); as s) {
          <div class="summary" [class.warn]="s.warn" role="status">
            <strong>{{ s.title }}</strong>
            <span>{{ s.detail }}</span>
          </div>
        }

        <mat-form-field appearance="outline">
          <mat-label>Reason (optional)</mat-label>
          <textarea matInput rows="2" maxlength="500" formControlName="reason"></textarea>
        </mat-form-field>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving() || !canSubmit()">
          {{ saving() ? 'Sending...' : 'Send request' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field { width: 100%; }
    form { display: contents; }
    .hint { color: var(--wv-muted); font-size: var(--wv-text-sm); margin-left: 6px; }
    .summary {
      display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; margin: 6px 0 18px;
      border-radius: var(--wv-radius-control); background: var(--wv-leaf-soft); color: var(--wv-leaf-text);
    }
    .summary.warn { background: var(--wv-gold-soft); color: var(--wv-gold-text); }
    .summary span { font-size: var(--wv-text-sm); }
    .error { color: var(--wv-alert-text); background: var(--wv-alert-soft); padding: 10px 14px; border-radius: var(--wv-radius-control); margin: 0; }
  `,
})
export class ApplyLeaveDialog {
  private readonly api = inject(LeaveApi);
  private readonly ref = inject<MatDialogRef<ApplyLeaveDialog, LeaveRequest>>(MatDialogRef);

  protected readonly minDate = parseIso(addDays(todayIso(), -30));

  protected readonly form = new FormGroup({
    leaveTypeId: new FormControl<number | null>(null, Validators.required),
    start: new FormControl<Date | null>(null, Validators.required),
    end: new FormControl<Date | null>(null, Validators.required),
    reason: new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) }),
  });
  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  // Form validity as a signal: computeds can't track `form.valid` directly
  private readonly status = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)), {
    initialValue: this.form.status,
  });

  private readonly startIso = computed(() => (this.value().start ? isoDate(this.value().start!) : null));
  private readonly endIso = computed(() => (this.value().end ? isoDate(this.value().end!) : null));
  private readonly year = computed(() => Number((this.startIso() ?? todayIso()).slice(0, 4)));

  protected readonly types = this.api.leaveTypes(signal(true));
  private readonly balances = this.api.myBalances(this.year);
  private readonly holidays = this.api.holidays(this.year);

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly serverErrors = signal<Record<string, string>>({});

  private readonly days = computed(() => {
    const s = this.startIso();
    const e = this.endIso();
    if (!s || !e) {
      return null;
    }
    return workingDays(s, e, new Set(this.holidays.value().map((h) => h.date)));
  });

  protected readonly summary = computed(() => {
    const s = this.startIso();
    const e = this.endIso();
    const days = this.days();
    if (!s || !e || days === null) {
      return null;
    }
    if (s.slice(0, 4) !== e.slice(0, 4)) {
      return { warn: true, title: 'Split this into two requests', detail: 'A request has to stay within one calendar year.' };
    }
    if (days === 0) {
      return { warn: true, title: 'No working days selected', detail: 'Weekends and holidays are not counted as leave.' };
    }
    const range = s === e ? fmtWeekday(s) : `${fmtWeekday(s)} to ${fmtWeekday(e)}`;
    const typeId = this.value().leaveTypeId;
    const b = this.balances.value().find((x) => x.leaveTypeId === typeId);
    if (b && !b.unlimited && days > b.available) {
      return { warn: true, title: `${days} working day${days === 1 ? '' : 's'}, but only ${b.available} left`, detail: `${b.leaveTypeName}: choose fewer days or another leave type.` };
    }
    return {
      warn: false,
      title: `${days} working day${days === 1 ? '' : 's'}`,
      detail: `${range}. Weekends and holidays are not counted.`,
    };
  });

  protected readonly canSubmit = computed(() => this.status() === 'VALID' && !!this.summary() && !this.summary()!.warn);

  protected balanceHint(typeId: number): string {
    const b = this.balances.value().find((x) => x.leaveTypeId === typeId);
    if (!b) {
      return '';
    }
    return b.unlimited ? 'no limit' : `${b.available} left`;
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.api
      .apply({ leaveTypeId: v.leaveTypeId!, startDate: this.startIso()!, endDate: this.endIso()!, reason: v.reason || null })
      .subscribe({
        next: (created) => this.ref.close(created),
        error: (err) => {
          this.saving.set(false);
          const body = apiErrorOf(err);
          this.serverErrors.set(body?.fieldErrors ?? {});
          if (body && body.status < 500 && body.status !== 403) {
            this.error.set(body.fieldErrors ? Object.values(body.fieldErrors).join('. ') : body.message);
          }
        },
      });
  }
}

export function openApplyLeave(dialog: MatDialog) {
  return dialog.open<ApplyLeaveDialog, void, LeaveRequest>(ApplyLeaveDialog, { width: '480px', autoFocus: 'first-tabbable' }).afterClosed();
}
