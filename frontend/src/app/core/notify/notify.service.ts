import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Short status messages at the bottom of the screen. */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3500, panelClass: 'wv-snack-success' });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 7000, panelClass: 'wv-snack-error' });
  }

  info(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3500 });
  }
}
