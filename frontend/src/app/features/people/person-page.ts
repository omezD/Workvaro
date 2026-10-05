import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { EmployeeApi } from '../../core/api/employee.api';
import { AuthService } from '../../core/auth/auth.service';
import { NotifyService } from '../../core/notify/notify.service';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { LoadError } from '../../shared/ui/load-error';
import { StatusChip } from '../../shared/ui/status-chip';
import { EmployeeDetails } from './employee-details';
import { openStatusDialog } from './status-dialog';

/** A colleague's profile. The server decides what the viewer may see (403 for non-managers). */
@Component({
  selector: 'wv-person-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, Avatar, StatusChip, EmployeeDetails, EmptyState, LoadError, Icon],
  template: `
    <a class="back" routerLink="/app/people"><wv-icon name="arrowLeft" [size]="16" /> People</a>

    @if (person.hasValue() && person.value(); as p) {
      <header class="head">
        <wv-avatar [name]="p.fullName" [size]="72" />
        <div class="title">
          <h1>{{ p.fullName }}</h1>
          <p>{{ p.designationTitle ?? 'No designation' }}{{ p.departmentName ? ', ' + p.departmentName : '' }}</p>
        </div>
        <wv-status-chip [status]="p.status" />
        @if (isHr()) {
          <div class="actions">
            <button mat-stroked-button type="button" (click)="changeStatus()">Change status</button>
            <a mat-flat-button [routerLink]="['/app/people', p.id, 'edit']">Edit profile</a>
          </div>
        }
      </header>
      <wv-employee-details [e]="p" />
    } @else if (forbidden()) {
      <section class="wv-card">
        <wv-empty-state icon="lock" title="This profile is private"
          text="You can open your own profile and the profiles of people who report to you. Contact details for everyone are in the directory.">
          <a mat-flat-button routerLink="/app/people">Back to people</a>
        </wv-empty-state>
      </section>
    } @else if (notFound()) {
      <section class="wv-card">
        <wv-empty-state icon="compass" title="This person isn't in Workvaro" text="They may have been removed, or the link is wrong.">
          <a mat-flat-button routerLink="/app/people">Back to people</a>
        </wv-empty-state>
      </section>
    } @else if (person.error()) {
      <section class="wv-card"><wv-load-error (retry)="person.reload()" /></section>
    } @else {
      <div class="wv-skeleton"><span style="height: 90px"></span><span style="height: 220px"></span></div>
    }
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; text-decoration: none; margin-bottom: 18px; }
    .head { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-bottom: 24px; }
    .title { min-width: 0; }
    h1 { font-size: var(--wv-text-3xl); letter-spacing: -0.025em; }
    .title p { margin: 4px 0 0; color: var(--wv-muted); }
    .actions { margin-left: auto; display: flex; gap: 10px; }
  `,
})
export class PersonPage {
  private readonly api = inject(EmployeeApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  /** Route param :id */
  readonly id = input.required<string>();

  protected readonly isHr = computed(() => this.auth.hasAnyRole('HR', 'ADMIN'));
  protected readonly person = this.api.employee(computed(() => Number(this.id()) || null));
  private readonly errorStatus = computed(() => (this.person.error() as HttpErrorResponse | undefined)?.status);
  protected readonly forbidden = computed(() => this.errorStatus() === 403);
  protected readonly notFound = computed(() => this.errorStatus() === 404 || this.errorStatus() === 400);

  protected changeStatus(): void {
    const p = this.person.value();
    if (!p) {
      return;
    }
    openStatusDialog(this.dialog, p.fullName, p.status).subscribe((change) => {
      if (!change) {
        return;
      }
      this.api.changeStatus(p.id, change.status, change.reason || undefined).subscribe(() => {
        this.notify.success(`${p.firstName}'s status updated`);
        this.person.reload();
      });
    });
  }
}
