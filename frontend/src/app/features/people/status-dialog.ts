import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EmployeeStatus } from '../../core/api/models';

export interface StatusChange {
  status: EmployeeStatus;
  reason: string;
}

const OPTIONS: { value: EmployeeStatus; label: string; hint: string }[] = [
  { value: 'ACTIVE', label: 'Active', hint: 'Working normally' },
  { value: 'ON_NOTICE', label: 'On notice', hint: 'Has resigned and is serving notice; still in the directory' },
  { value: 'RESIGNED', label: 'Resigned', hint: 'Has left; hidden from the directory' },
  { value: 'TERMINATED', label: 'Terminated', hint: 'Employment ended; hidden from the directory' },
];

@Component({
  selector: 'wv-status-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Change status for {{ data.name }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Employment status</mat-label>
          <mat-select formControlName="status">
            @for (o of options; track o.value) {
              <mat-option [value]="o.value">{{ o.label }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ hint() }}</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Reason (kept in the audit log)</mat-label>
          <textarea matInput rows="2" maxlength="500" formControlName="reason"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="selected() === data.current">Save status</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `form { display: contents; } mat-form-field { width: 100%; margin-bottom: 8px; }`,
})
export class StatusDialog {
  protected readonly data = inject<{ name: string; current: EmployeeStatus }>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<StatusDialog, StatusChange>>(MatDialogRef);
  protected readonly options = OPTIONS;
  protected readonly form = new FormGroup({
    status: new FormControl<EmployeeStatus>(this.data.current, { nonNullable: true, validators: Validators.required }),
    reason: new FormControl('', { nonNullable: true }),
  });

  protected readonly selected = toSignal(this.form.controls.status.valueChanges, { initialValue: this.data.current });
  protected readonly hint = computed(() => OPTIONS.find((o) => o.value === this.selected())?.hint ?? '');

  protected save(): void {
    this.ref.close(this.form.getRawValue());
  }
}

export function openStatusDialog(dialog: MatDialog, name: string, current: EmployeeStatus) {
  return dialog.open<StatusDialog, { name: string; current: EmployeeStatus }, StatusChange>(StatusDialog, { width: '440px', data: { name, current } }).afterClosed();
}
