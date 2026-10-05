import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { LeaveApi, LeaveSearch } from '../../core/api/leave.api';
import { LeaveRequest, RequestStatus } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { NotifyService } from '../../core/notify/notify.service';
import { apiMessage } from '../../core/http/api-error';
import { BalanceRing } from '../../shared/ui/balance-ring';
import { openConfirm } from '../../shared/ui/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { LeaveStrip } from '../../shared/ui/leave-strip';
import { LoadError } from '../../shared/ui/load-error';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusChip } from '../../shared/ui/status-chip';
import { addMonths, fmtDate, fmtMonth, fmtRange, monthKey, todayIso } from '../../shared/util/dates';
import { openApplyLeave } from './apply-leave-dialog';

@Component({
  selector: 'wv-leave-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader, MatTabsModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatPaginatorModule, FormsModule,
    BalanceRing, StatusChip, EmptyState, LeaveStrip, LoadError, Icon,
  ],
  templateUrl: './leave-page.html',
  styleUrl: './leave-page.scss',
})
export class LeavePage {
  private readonly api = inject(LeaveApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  protected readonly canSeeTeam = computed(() => this.auth.hasAnyRole('MANAGER', 'HR', 'ADMIN'));
  protected readonly orgWide = computed(() => this.auth.hasAnyRole('HR', 'ADMIN'));

  // ----- my leave -----
  protected readonly year = signal(new Date().getFullYear());
  protected readonly balances = this.api.myBalances(this.year);
  protected readonly mine = this.api.myLeaves();
  protected readonly upcoming = computed(() => this.mine.value().filter((l) => isOpen(l)));
  protected readonly history = computed(() => this.mine.value().filter((l) => !isOpen(l)));

  // ----- team calendar -----
  protected readonly month = signal(monthKey());
  protected readonly calendar = this.api.teamCalendar(computed(() => (this.canSeeTeam() ? this.month() : null)));
  private readonly holidayYear = computed(() => Number(this.month().slice(0, 4)));
  private readonly holidays = this.api.holidays(this.holidayYear);
  protected readonly holidayMap = computed(() => Object.fromEntries(this.holidays.value().map((h) => [h.date, h.name])));

  // ----- all requests -----
  protected readonly status = signal<RequestStatus | ''>('PENDING');
  protected readonly page = signal(0);
  protected readonly pageSize = 15;
  private readonly query = computed<LeaveSearch | null>(() =>
    this.canSeeTeam() ? { status: this.status() || null, page: this.page(), size: this.pageSize } : null,
  );
  protected readonly all = this.api.search(this.query);

  protected readonly statuses: { value: RequestStatus | ''; label: string }[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: '', label: 'Any status' },
  ];

  protected readonly fmtRange = fmtRange;
  protected readonly fmtDate = fmtDate;

  protected monthLabel(): string {
    return fmtMonth(this.month());
  }

  protected shiftMonth(delta: number): void {
    this.month.update((m) => addMonths(m, delta));
  }

  protected setStatus(value: RequestStatus | ''): void {
    this.status.set(value);
    this.page.set(0);
  }

  protected onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
  }

  protected apply(): void {
    openApplyLeave(this.dialog).subscribe((created) => {
      if (created) {
        this.notify.success(`Leave request sent for ${created.days} day${created.days === 1 ? '' : 's'}. Your manager will review it.`);
        this.refresh();
      }
    });
  }

  protected cancel(l: LeaveRequest): void {
    openConfirm(this.dialog, {
      title: 'Cancel this leave request?',
      message: `${l.leaveTypeName}, ${fmtRange(l.startDate, l.endDate)}. Your manager will no longer see it.`,
      confirmLabel: 'Cancel request',
      tone: 'danger',
    }).subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.api.cancel(l.id).subscribe({
        next: () => {
          this.notify.success('Leave request cancelled');
          this.refresh();
        },
        error: (err) => {
          if (err.status === 409) {
            this.notify.error(apiMessage(err));
            this.refresh();
          }
        },
      });
    });
  }

  private refresh(): void {
    this.mine.reload();
    this.balances.reload();
    this.calendar.reload();
    this.all.reload();
  }
}

function isOpen(l: LeaveRequest): boolean {
  return (l.status === 'PENDING' || l.status === 'APPROVED') && l.endDate >= todayIso();
}
