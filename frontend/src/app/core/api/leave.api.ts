import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApplyLeave,
  Attendance,
  Correction,
  CorrectionRequest,
  HrDashboard,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  LeaveTypeRequest,
  ManagerDashboard,
  MyDashboard,
  PageResponse,
  RequestStatus,
  TeamCalendarEntry,
  TodayAttendance,
} from './models';
import { api } from './url';

export interface LeaveSearch {
  status?: RequestStatus | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  size?: number;
}

/**
 * leave-attendance-service: leave, holidays, attendance and dashboards.
 * Read methods return signal resources (call in an injection context); writes return Observables.
 * A resource whose URL function returns undefined stays idle, which is how role-gated reads are skipped.
 */
@Injectable({ providedIn: 'root' })
export class LeaveApi {
  private readonly http = inject(HttpClient);

  // ----- leave types & balances -----

  leaveTypes(activeOnly: Signal<boolean>) {
    return httpResource<LeaveType[]>(() => api('/leave-types', { activeOnly: activeOnly() }), { defaultValue: [] });
  }

  myBalances(year: Signal<number>) {
    return httpResource<LeaveBalance[]>(() => api('/leaves/balance/me', { year: year() }), { defaultValue: [] });
  }

  createLeaveType(body: LeaveTypeRequest): Observable<LeaveType> {
    return this.http.post<LeaveType>(api('/leave-types'), body);
  }

  updateLeaveType(id: number, body: LeaveTypeRequest): Observable<LeaveType> {
    return this.http.put<LeaveType>(api(`/leave-types/${id}`), body);
  }

  // ----- leave requests -----

  myLeaves() {
    return httpResource<LeaveRequest[]>(() => api('/leaves/me'), { defaultValue: [] });
  }

  pendingLeaves(enabled: Signal<boolean>) {
    return httpResource<LeaveRequest[]>(() => (enabled() ? api('/leaves/pending') : undefined), { defaultValue: [] });
  }

  search(query: Signal<LeaveSearch | null>) {
    return httpResource<PageResponse<LeaveRequest>>(() => {
      const q = query();
      return q ? api('/leaves', { ...q, sort: 'startDate,desc' }) : undefined;
    });
  }

  teamCalendar(month: Signal<string | null>) {
    return httpResource<TeamCalendarEntry[]>(() => (month() ? api('/leaves/team-calendar', { month: month() }) : undefined), {
      defaultValue: [],
    });
  }

  apply(body: ApplyLeave): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(api('/leaves'), body);
  }

  cancel(id: number): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(api(`/leaves/${id}/cancel`), null);
  }

  approve(id: number, comment?: string | null): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(api(`/leaves/${id}/approve`), { comment: comment || null });
  }

  reject(id: number, comment?: string | null): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(api(`/leaves/${id}/reject`), { comment: comment || null });
  }

  // ----- holidays -----

  holidays(year: Signal<number>) {
    return httpResource<Holiday[]>(() => api('/holidays', { year: year() }), { defaultValue: [] });
  }

  addHoliday(body: { date: string; name: string }): Observable<Holiday> {
    return this.http.post<Holiday>(api('/holidays'), body);
  }

  deleteHoliday(id: number): Observable<void> {
    return this.http.delete<void>(api(`/holidays/${id}`));
  }

  // ----- attendance -----

  myAttendance(month: Signal<string>) {
    return httpResource<Attendance[]>(() => api('/attendance/me', { month: month() }), { defaultValue: [] });
  }

  todayBoard(enabled: Signal<boolean>) {
    return httpResource<TodayAttendance>(() => (enabled() ? api('/attendance/today') : undefined));
  }

  checkIn(): Observable<Attendance> {
    return this.http.post<Attendance>(api('/attendance/check-in'), null);
  }

  checkOut(): Observable<Attendance> {
    return this.http.post<Attendance>(api('/attendance/check-out'), null);
  }

  myCorrections() {
    return httpResource<Correction[]>(() => api('/attendance/corrections/me'), { defaultValue: [] });
  }

  pendingCorrections(enabled: Signal<boolean>) {
    return httpResource<Correction[]>(() => (enabled() ? api('/attendance/corrections/pending') : undefined), {
      defaultValue: [],
    });
  }

  requestCorrection(body: CorrectionRequest): Observable<Correction> {
    return this.http.post<Correction>(api('/attendance/corrections'), body);
  }

  approveCorrection(id: number, comment?: string | null): Observable<Correction> {
    return this.http.patch<Correction>(api(`/attendance/corrections/${id}/approve`), { comment: comment || null });
  }

  rejectCorrection(id: number, comment?: string | null): Observable<Correction> {
    return this.http.patch<Correction>(api(`/attendance/corrections/${id}/reject`), { comment: comment || null });
  }

  // ----- dashboards -----

  myDashboard() {
    return httpResource<MyDashboard>(() => api('/dashboard/me'));
  }

  managerDashboard(enabled: Signal<boolean>) {
    return httpResource<ManagerDashboard>(() => (enabled() ? api('/dashboard/manager') : undefined));
  }

  hrDashboard(enabled: Signal<boolean>) {
    return httpResource<HrDashboard>(() => (enabled() ? api('/dashboard/hr') : undefined));
  }
}
