import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Department,
  DepartmentRequest,
  Designation,
  DesignationRequest,
  EmployeeDetail,
  EmployeeRequest,
  EmployeeStats,
  EmployeeStatus,
  EmployeeSummary,
  MyProfileUpdate,
  PageResponse,
} from './models';
import { api } from './url';

export interface DirectoryQuery {
  search?: string;
  dept?: number | null;
  status?: EmployeeStatus | null;
  page?: number;
  size?: number;
}

/**
 * employee-service. Read methods return signal resources and must be called from a component or
 * service constructor/field (injection context); write methods return Observables.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeApi {
  private readonly http = inject(HttpClient);

  // ----- reads -----

  directory(query: Signal<DirectoryQuery>) {
    return httpResource<PageResponse<EmployeeSummary>>(() => api('/employees', { ...query() }));
  }

  employee(id: Signal<number | null>) {
    return httpResource<EmployeeDetail>(() => (id() ? api(`/employees/${id()}`) : undefined));
  }

  me() {
    return httpResource<EmployeeDetail>(() => api('/employees/me'));
  }

  myTeam(enabled: Signal<boolean>) {
    return httpResource<EmployeeSummary[]>(() => (enabled() ? api('/employees/me/team') : undefined), {
      defaultValue: [],
    });
  }

  stats(enabled: Signal<boolean>) {
    return httpResource<EmployeeStats>(() => (enabled() ? api('/employees/stats') : undefined));
  }

  departments() {
    return httpResource<Department[]>(() => api('/departments'), { defaultValue: [] });
  }

  designations() {
    return httpResource<Designation[]>(() => api('/designations'), { defaultValue: [] });
  }

  // ----- writes -----

  create(body: EmployeeRequest): Observable<EmployeeDetail> {
    return this.http.post<EmployeeDetail>(api('/employees'), body);
  }

  update(id: number, body: EmployeeRequest): Observable<EmployeeDetail> {
    return this.http.put<EmployeeDetail>(api(`/employees/${id}`), body);
  }

  changeStatus(id: number, status: EmployeeStatus, reason?: string): Observable<EmployeeDetail> {
    return this.http.patch<EmployeeDetail>(api(`/employees/${id}/status`), { status, reason });
  }

  updateMe(body: MyProfileUpdate): Observable<EmployeeDetail> {
    return this.http.put<EmployeeDetail>(api('/employees/me'), body);
  }

  createDepartment(body: DepartmentRequest): Observable<Department> {
    return this.http.post<Department>(api('/departments'), body);
  }

  updateDepartment(id: number, body: DepartmentRequest): Observable<Department> {
    return this.http.put<Department>(api(`/departments/${id}`), body);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(api(`/departments/${id}`));
  }

  createDesignation(body: DesignationRequest): Observable<Designation> {
    return this.http.post<Designation>(api('/designations'), body);
  }

  updateDesignation(id: number, body: DesignationRequest): Observable<Designation> {
    return this.http.put<Designation>(api(`/designations/${id}`), body);
  }

  deleteDesignation(id: number): Observable<void> {
    return this.http.delete<void>(api(`/designations/${id}`));
  }
}
