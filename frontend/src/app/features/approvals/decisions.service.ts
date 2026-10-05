import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, filter, map, switchMap } from 'rxjs';
import { LeaveApi } from '../../core/api/leave.api';
import { Correction, LeaveRequest } from '../../core/api/models';
import { NotifyService } from '../../core/notify/notify.service';
import { apiMessage } from '../../core/http/api-error';
import { openConfirm } from '../../shared/ui/confirm-dialog';
import { fmtDay, fmtRange } from '../../shared/util/dates';

/**
 * Approve/reject for leave requests and attendance corrections, shared by the dashboard inbox and the
 * Approvals page. Approving is one click; rejecting asks for an optional reason the employee will see.
 * Each method emits `true` once the change is saved (and nothing if the user backs out).
 */
@Injectable({ providedIn: 'root' })
export class DecisionsService {
  private readonly api = inject(LeaveApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  approveLeave(r: LeaveRequest): Observable<boolean> {
    return this.save(this.api.approve(r.id), `Approved ${firstName(r.employeeName)}'s ${r.leaveTypeName.toLowerCase()}`);
  }

  rejectLeave(r: LeaveRequest): Observable<boolean> {
    return this.askReason(`Reject ${firstName(r.employeeName)}'s leave?`, `${r.leaveTypeName}, ${fmtRange(r.startDate, r.endDate)} (${r.days} day${r.days === 1 ? '' : 's'}).`).pipe(
      switchMap((comment) => this.save(this.api.reject(r.id, comment), `Rejected ${firstName(r.employeeName)}'s leave`)),
    );
  }

  approveCorrection(c: Correction): Observable<boolean> {
    return this.save(this.api.approveCorrection(c.id), `Approved ${firstName(c.employeeName)}'s attendance fix`);
  }

  rejectCorrection(c: Correction): Observable<boolean> {
    return this.askReason(`Reject ${firstName(c.employeeName)}'s attendance fix?`, `For ${fmtDay(c.workDate)}.`).pipe(
      switchMap((comment) => this.save(this.api.rejectCorrection(c.id, comment), `Rejected ${firstName(c.employeeName)}'s attendance fix`)),
    );
  }

  private askReason(title: string, message: string): Observable<string> {
    return openConfirm(this.dialog, {
      title,
      message,
      confirmLabel: 'Reject',
      tone: 'danger',
      withComment: true,
      commentLabel: 'Reason (shown to the employee)',
    }).pipe(
      filter((r) => !!r),
      map((r) => (r ? r.comment : '')),
    );
  }

  private save(request: Observable<unknown>, done: string): Observable<boolean> {
    return new Observable<boolean>((sub) => {
      const s = request.subscribe({
        next: () => {
          this.notify.success(done);
          sub.next(true);
          sub.complete();
        },
        error: (err) => {
          // 403/5xx are already reported by the interceptor; show the rest (e.g. 409 already decided)
          const status = (err as { status?: number }).status ?? 0;
          if (status === 400 || status === 404 || status === 409) {
            this.notify.error(apiMessage(err));
          }
          sub.next(false);
          sub.complete();
        },
      });
      return () => s.unsubscribe();
    });
  }
}

function firstName(full: string): string {
  return full.split(' ')[0];
}
