import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LeaveApi } from '../../core/api/leave.api';
import { Holiday } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { NotifyService } from '../../core/notify/notify.service';
import { apiMessage } from '../../core/http/api-error';
import { openConfirm } from '../../shared/ui/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { LoadError } from '../../shared/ui/load-error';
import { PageHeader } from '../../shared/ui/page-header';
import { fmtDate, isoDate, isWeekend, parseIso, todayIso } from '../../shared/util/dates';

@Component({
  selector: 'wv-holidays-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, EmptyState, LoadError, Icon],
  template: `
    <wv-page-header title="Holidays" subtitle="Company holidays are never counted as leave days.">
      <div class="year">
        <button mat-icon-button type="button" aria-label="Previous year" (click)="year.set(year() - 1)"><wv-icon name="arrowLeft" /></button>
        <strong>{{ year() }}</strong>
        <button mat-icon-button type="button" aria-label="Next year" (click)="year.set(year() + 1)"><wv-icon name="arrowLeft" class="flip" /></button>
      </div>
    </wv-page-header>

    <div class="layout">
      <section class="wv-card">
        @if (holidays.error()) {
          <wv-load-error (retry)="holidays.reload()" />
        } @else if (holidays.isLoading() && !holidays.hasValue()) {
          <div class="wv-skeleton"><span></span><span></span><span></span></div>
        } @else if (holidays.value().length === 0) {
          <wv-empty-state icon="star" [title]="'No holidays for ' + year() + ' yet'"
            [text]="canEdit() ? 'Add the company holidays for this year so leave days are counted correctly.' : 'HR publishes the holiday list here.'" />
        } @else {
          <ul>
            @for (h of holidays.value(); track h.id) {
              <li [class.past]="h.date < today">
                <div class="chip" aria-hidden="true"><i>{{ month(h.date) }}</i><b>{{ day(h.date) }}</b></div>
                <div class="text">
                  <b>{{ h.name }}</b>
                  <span class="wv-muted">{{ weekday(h.date) }}{{ weekend(h.date) ? ', falls on a weekend' : '' }}</span>
                </div>
                @if (canEdit()) {
                  <button mat-button type="button" (click)="remove(h)" [attr.aria-label]="'Remove ' + h.name">Remove</button>
                }
              </li>
            }
          </ul>
        }
      </section>

      @if (canEdit()) {
        <section class="wv-card add">
          <h2>Add a holiday</h2>
          <form [formGroup]="form" (ngSubmit)="add()">
            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="date" />
              <mat-datepicker-toggle matIconSuffix [for]="picker" />
              <mat-datepicker #picker />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" maxlength="100" placeholder="e.g. Diwali" />
            </mat-form-field>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="saving()">Add holiday</button>
          </form>
        </section>
      }
    </div>
  `,
  styles: `
    .year { display: flex; align-items: center; gap: 4px; }
    .year strong { font-family: var(--wv-font-display); font-size: var(--wv-text-xl); min-width: 56px; text-align: center; }
    .flip { transform: scaleX(-1); }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: flex; align-items: center; gap: 16px; padding: 12px 0; border-top: 1px solid var(--wv-line); }
    li:first-child { border-top: 0; padding-top: 0; }
    li.past { opacity: 0.55; }
    .chip { width: 52px; border-radius: 12px; overflow: hidden; text-align: center; border: 1px solid var(--wv-line); flex: none; }
    .chip i { display: block; font-style: normal; background: var(--wv-gold); color: var(--wv-gold-ink); font-size: 12px; font-weight: 600; padding: 2px 0; }
    .chip b { display: block; font-family: var(--wv-font-display); font-size: 22px; padding: 2px 0 4px; }
    .text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .text span { font-size: var(--wv-text-sm); }
    h2 { font-size: var(--wv-text-lg); margin-bottom: 16px; }
    form { display: flex; flex-direction: column; }
    .error { color: var(--wv-alert-text); background: var(--wv-alert-soft); padding: 10px 14px; border-radius: var(--wv-radius-control); margin: 0 0 12px; }
  `,
})
export class HolidaysPage {
  private readonly api = inject(LeaveApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  protected readonly canEdit = computed(() => this.auth.hasAnyRole('HR', 'ADMIN'));
  protected readonly year = signal(new Date().getFullYear());
  protected readonly holidays = this.api.holidays(this.year);
  protected readonly today = todayIso();

  protected readonly form = new FormGroup({
    date: new FormControl<Date | null>(null, Validators.required),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
  });
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected month(iso: string) {
    return parseIso(iso).toLocaleString('en-IN', { month: 'short' });
  }
  protected day(iso: string) {
    return Number(iso.slice(8));
  }
  protected weekday(iso: string) {
    return parseIso(iso).toLocaleString('en-IN', { weekday: 'long' });
  }
  protected weekend(iso: string) {
    return isWeekend(iso);
  }

  protected add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { date, name } = this.form.getRawValue();
    const iso = isoDate(date!);
    this.saving.set(true);
    this.error.set('');
    this.api.addHoliday({ date: iso, name: name.trim() }).subscribe({
      next: (h) => {
        this.saving.set(false);
        this.notify.success(`${h.name} added for ${fmtDate(h.date)}`);
        this.form.reset();
        if (Number(iso.slice(0, 4)) !== this.year()) {
          this.year.set(Number(iso.slice(0, 4)));
        } else {
          this.holidays.reload();
        }
      },
      error: (err) => {
        this.saving.set(false);
        if (err.status === 400 || err.status === 409) {
          this.error.set(apiMessage(err));
        }
      },
    });
  }

  protected remove(h: Holiday): void {
    openConfirm(this.dialog, {
      title: `Remove ${h.name}?`,
      message: `${fmtDate(h.date)} will count as a normal working day for new leave requests.`,
      confirmLabel: 'Remove holiday',
      tone: 'danger',
    }).subscribe((ok) => {
      if (ok) {
        this.api.deleteHoliday(h.id).subscribe(() => {
          this.notify.success(`${h.name} removed`);
          this.holidays.reload();
        });
      }
    });
  }
}
