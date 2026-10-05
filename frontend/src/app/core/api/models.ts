// TypeScript mirrors of the backend DTOs (employee-service and leave-attendance-service).
// Dates are ISO strings: LocalDate -> "2026-10-05", Instant -> "2026-10-05T04:30:00Z", LocalTime -> "09:30".

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// ---------- employee-service ----------

export type EmployeeStatus = 'ACTIVE' | 'ON_NOTICE' | 'RESIGNED' | 'TERMINATED';

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface DepartmentRequest {
  code: string;
  name: string;
  description?: string | null;
}

export interface Designation {
  id: number;
  title: string;
  level: number;
  description: string | null;
}

export interface DesignationRequest {
  title: string;
  level: number;
  description?: string | null;
}

export interface EmployeeSummary {
  id: number;
  empCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  departmentId: number | null;
  departmentName: string | null;
  designationId: number | null;
  designationTitle: string | null;
  status: EmployeeStatus;
}

export interface EmployeeDetail {
  id: number;
  keycloakUserId: string | null;
  empCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  joinDate: string;
  departmentId: number | null;
  departmentName: string | null;
  designationId: number | null;
  designationTitle: string | null;
  managerId: number | null;
  managerName: string | null;
  status: EmployeeStatus;
  bankAccount: string | null;
  bankAccountMasked: boolean;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

/** HR create/update payload. `empCode` is ignored on update; a null bankAccount keeps the stored one. */
export interface EmployeeRequest {
  keycloakUserId?: string | null;
  empCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  joinDate: string;
  departmentId?: number | null;
  designationId?: number | null;
  managerId?: number | null;
  bankAccount?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface MyProfileUpdate {
  phone: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export interface EmployeeStats {
  totalCurrent: number;
  byStatus: Record<EmployeeStatus, number>;
  byDepartment: { departmentId: number | null; departmentName: string; headcount: number }[];
}

// ---------- leave-attendance-service ----------

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  annualQuota: number;
  paid: boolean;
  unlimited: boolean;
  active: boolean;
}

export type LeaveTypeRequest = Omit<LeaveType, 'id'>;

export interface LeaveBalance {
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  available: number;
  unlimited: boolean;
}

export interface LeaveRequest {
  id: number;
  employeeUserId: string;
  employeeId: number;
  employeeName: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: RequestStatus;
  decidedByName: string | null;
  decisionComment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface ApplyLeave {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export interface TeamCalendarEntry {
  requestId: number;
  employeeUserId: string;
  employeeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  days: number;
  status: RequestStatus;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface Attendance {
  id: number;
  workDate: string;
  checkIn: string;
  checkOut: string | null;
  workedMinutes: number | null;
  corrected: boolean;
}

export type PresenceState = 'CHECKED_IN' | 'CHECKED_OUT' | 'ON_LEAVE' | 'NOT_CHECKED_IN';

export interface TodayEntry {
  employeeUserId: string;
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  state: PresenceState;
  checkIn: string | null;
  checkOut: string | null;
  leaveTypeCode: string | null;
}

export interface TodayAttendance {
  date: string;
  workingDay: boolean;
  present: number;
  onLeave: number;
  notCheckedIn: number;
  employees: TodayEntry[];
}

export interface CorrectionRequest {
  workDate: string;
  checkIn: string;
  checkOut: string;
  reason: string;
}

export interface Correction {
  id: number;
  employeeUserId: string;
  employeeName: string;
  workDate: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: RequestStatus;
  decidedByName: string | null;
  decisionComment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface MyDashboard {
  balances: LeaveBalance[];
  today: Attendance | null;
  myPendingLeaves: number;
  upcomingLeaves: LeaveRequest[];
  upcomingHolidays: Holiday[];
}

export interface ManagerDashboard {
  teamSize: number;
  pendingLeaveApprovals: number;
  pendingCorrectionApprovals: number;
  presentToday: number;
  onLeaveToday: number;
  onLeave: TodayEntry[];
}

export interface HrDashboard {
  activeEmployees: number;
  pendingLeaveApprovals: number;
  pendingCorrectionApprovals: number;
  presentToday: number;
  onLeaveToday: number;
  notCheckedInToday: number;
  upcomingHolidays: Holiday[];
}
