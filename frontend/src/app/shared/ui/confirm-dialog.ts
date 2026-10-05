import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';

export interface ConfirmData {
  title: string;
  message?: string;
  confirmLabel: string;
  /** 'danger' for destructive or negative actions (reject, delete). */
  tone?: 'primary' | 'danger';
  /** Show an optional comment box; its text is returned. */
  withComment?: boolean;
  commentLabel?: string;
}

/** Result: `false` if dismissed, otherwise `{ comment }` (empty string when no comment). */
export type ConfirmResult = false | { comment: string };

@Component({
  selector: 'wv-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (data.message) {
        <p>{{ data.message }}</p>
      }
      @if (data.withComment) {
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ data.commentLabel ?? 'Comment (optional)' }}</mat-label>
          <textarea matInput rows="3" maxlength="500" [ngModel]="comment()" (ngModelChange)="comment.set($event)"></textarea>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" [class.danger]="data.tone === 'danger'" (click)="confirm()">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    p { margin: 0 0 12px; color: var(--wv-muted); }
    .full { width: 100%; }
    .danger { --mat-button-filled-container-color: var(--wv-alert); --mat-button-filled-label-text-color: #fff; }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ConfirmDialog, ConfirmResult>>(MatDialogRef);
  protected readonly comment = signal('');

  protected confirm(): void {
    this.ref.close({ comment: this.comment().trim() });
  }
}

/** Opens the confirm dialog; emits once with the result. */
export function openConfirm(dialog: MatDialog, data: ConfirmData): Observable<ConfirmResult | undefined> {
  return dialog.open<ConfirmDialog, ConfirmData, ConfirmResult>(ConfirmDialog, { data, width: '440px', autoFocus: 'dialog' }).afterClosed();
}
