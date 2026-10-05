import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { apiErrorOf } from '../../core/http/api-error';

export interface FieldSpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'checkbox';
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  hint?: string;
}

export interface EntityDialogData<T> {
  title: string;
  submitLabel: string;
  fields: FieldSpec[];
  value: Record<string, unknown>;
  /** Saves the form value; errors are shown inside the dialog. */
  save: (value: Record<string, unknown>) => Observable<T>;
}

/** Small add/edit form used for departments, designations and leave types. */
@Component({
  selector: 'wv-entity-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-dialog-content>
        @for (f of data.fields; track f.key) {
          @switch (f.type) {
            @case ('checkbox') {
              <mat-checkbox [formControlName]="f.key">{{ f.label }}</mat-checkbox>
              @if (f.hint) {
                <p class="check-hint">{{ f.hint }}</p>
              }
            }
            @case ('textarea') {
              <mat-form-field appearance="outline">
                <mat-label>{{ f.label }}</mat-label>
                <textarea matInput rows="2" [formControlName]="f.key"></textarea>
                <mat-error>{{ errorFor(f) }}</mat-error>
              </mat-form-field>
            }
            @default {
              <mat-form-field appearance="outline">
                <mat-label>{{ f.label }}</mat-label>
                <input matInput [type]="f.type" [formControlName]="f.key" [attr.min]="f.min" [attr.max]="f.max" />
                @if (f.hint) {
                  <mat-hint>{{ f.hint }}</mat-hint>
                }
                <mat-error>{{ errorFor(f) }}</mat-error>
              </mat-form-field>
            }
          }
        }
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Saving...' : data.submitLabel }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    form { display: contents; }
    mat-form-field { width: 100%; }
    mat-checkbox { display: block; margin: 4px 0; }
    .check-hint { margin: -2px 0 12px 40px; font-size: var(--wv-text-sm); color: var(--wv-muted); }
    .error { color: var(--wv-alert-text); background: var(--wv-alert-soft); padding: 10px 14px; border-radius: var(--wv-radius-control); margin: 4px 0 0; }
  `,
})
export class EntityDialog {
  protected readonly data = inject<EntityDialogData<unknown>>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<EntityDialog, unknown>>(MatDialogRef);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly form = new FormGroup(
    Object.fromEntries(
      this.data.fields.map((f) => {
        const validators: ValidatorFn[] = [];
        if (f.required) validators.push(Validators.required);
        if (f.maxLength) validators.push(Validators.maxLength(f.maxLength));
        if (f.min !== undefined) validators.push(Validators.min(f.min));
        if (f.max !== undefined) validators.push(Validators.max(f.max));
        if (f.pattern) validators.push(Validators.pattern(f.pattern));
        const initial = this.data.value[f.key] ?? (f.type === 'checkbox' ? false : f.type === 'number' ? null : '');
        return [f.key, new FormControl(initial, validators)];
      }),
    ),
  );

  protected errorFor(f: FieldSpec): string {
    const e = this.form.controls[f.key].errors;
    if (!e) return '';
    if (e['server']) return e['server'];
    if (e['required']) return 'Required';
    if (e['pattern']) return f.patternMessage ?? 'Check the format';
    if (e['min'] || e['max']) return `Between ${f.min} and ${f.max}`;
    if (e['maxlength']) return `At most ${f.maxLength} characters`;
    return 'Check this value';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = Object.fromEntries(
      Object.entries(this.form.getRawValue()).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]),
    );
    this.saving.set(true);
    this.error.set('');
    this.data.save(value).subscribe({
      next: (saved) => this.ref.close(saved),
      error: (err) => {
        this.saving.set(false);
        const body = apiErrorOf(err);
        if (!body || body.status >= 500 || body.status === 403) {
          return;
        }
        for (const [key, message] of Object.entries(body.fieldErrors ?? {})) {
          this.form.get(key)?.setErrors({ server: message });
        }
        this.error.set(body.fieldErrors ? 'Some fields need attention.' : body.message);
      },
    });
  }
}

export function openEntityDialog<T>(dialog: MatDialog, data: EntityDialogData<T>): Observable<T | undefined> {
  return dialog.open<EntityDialog, EntityDialogData<T>, T>(EntityDialog, { width: '460px', data }).afterClosed();
}
