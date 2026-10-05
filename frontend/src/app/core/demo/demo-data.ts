// Sample company for demo mode (`npm run demo`). Only bundled in the "demo" build configuration.
import { addDays, isWeekend, todayIso, workingDays } from '../../shared/util/dates';
import {
  Attendance,
  Correction,
  Department,
  Designation,
  EmployeeDetail,
  EmployeeStatus,
  Holiday,
  LeaveRequest,
  LeaveType,
  RequestStatus,
} from '../api/models';
import { Role } from '../auth/roles';

export interface DemoPerson extends EmployeeDetail {
  roles: Role[];
}

export interface DemoAttendance extends Attendance {
  userId: string;
  name: string;
}

export interface DemoDb {
  seq: number;
  departments: Department[];
  designations: Designation[];
  people: DemoPerson[];
  leaveTypes: LeaveType[];
  leaves: LeaveRequest[];
  holidays: Holiday[];
  attendance: DemoAttendance[];
  corrections: Correction[];
}

export const PERSONAS = {
  employee: { userId: '44444444-4444-4444-8444-444444444444', label: 'Employee (Esha)' },
  manager: { userId: '33333333-3333-4333-8333-333333333333', label: 'Manager (Manoj)' },
  hr: { userId: '22222222-2222-4222-8222-222222222222', label: 'HR (Harini)' },
  admin: { userId: '11111111-1111-4111-8111-111111111111', label: 'Admin (Asha)' },
} as const;

export type PersonaKey = keyof typeof PERSONAS;

/** First weekday on or after `iso`. */
function weekday(iso: string): string {
  let d = iso;
  while (isWeekend(d)) {
    d = addDays(d, 1);
  }
  return d;
}

/** Instant for a local wall-clock time on a given day. */
export function at(iso: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = iso.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).toISOString();
}

export function seedDb(): DemoDb {
  const today = todayIso();
  const year = Number(today.slice(0, 4));

  const departments: Department[] = [
    { id: 1, code: 'ADM', name: 'Administration', description: 'Company administration' },
    { id: 2, code: 'HR', name: 'Human Resources', description: 'People operations' },
    { id: 3, code: 'ENG', name: 'Engineering', description: 'Product and software engineering' },
    { id: 4, code: 'FIN', name: 'Finance', description: 'Accounts and payroll' },
    { id: 5, code: 'OPS', name: 'Operations', description: 'Day-to-day operations' },
  ];
  const designations: Designation[] = [
    { id: 1, title: 'Software Engineer', level: 2, description: null },
    { id: 2, title: 'Accountant', level: 2, description: null },
    { id: 3, title: 'HR Executive', level: 2, description: null },
    { id: 4, title: 'Senior Software Engineer', level: 3, description: null },
    { id: 5, title: 'System Administrator', level: 3, description: null },
    { id: 6, title: 'Operations Lead', level: 3, description: null },
    { id: 7, title: 'HR Manager', level: 4, description: null },
    { id: 8, title: 'Engineering Manager', level: 5, description: null },
  ];

  const raw: [number, string | null, string, string, number, number, number | null, Role[], EmployeeStatus, string][] = [
    [1, PERSONAS.admin.userId, 'Asha', 'Admin', 1, 5, null, ['ADMIN', 'MANAGER', 'EMPLOYEE'], 'ACTIVE', '2022-01-10'],
    [2, PERSONAS.hr.userId, 'Harini', 'Rao', 2, 7, 1, ['HR', 'EMPLOYEE'], 'ACTIVE', '2022-03-01'],
    [3, PERSONAS.manager.userId, 'Manoj', 'Kumar', 3, 8, 1, ['MANAGER', 'EMPLOYEE'], 'ACTIVE', '2021-06-15'],
    [4, PERSONAS.employee.userId, 'Esha', 'Patel', 3, 1, 3, ['EMPLOYEE'], 'ACTIVE', '2024-08-01'],
    [5, 'demo-05', 'Rohan', 'Mehta', 3, 4, 3, ['EMPLOYEE'], 'ACTIVE', '2023-02-13'],
    [6, 'demo-06', 'Kavya', 'Iyer', 3, 1, 3, ['EMPLOYEE'], 'ACTIVE', '2024-01-08'],
    [7, 'demo-07', 'Arjun', 'Nair', 3, 1, 3, ['EMPLOYEE'], 'ACTIVE', '2025-04-21'],
    [8, 'demo-08', 'Sneha', 'Kulkarni', 3, 1, 3, ['EMPLOYEE'], 'ACTIVE', '2023-09-04'],
    [9, 'demo-09', 'Imran', 'Shaikh', 3, 4, 3, ['EMPLOYEE'], 'ON_NOTICE', '2022-11-14'],
    [10, 'demo-10', 'Priya', 'Sharma', 4, 2, 1, ['EMPLOYEE'], 'ACTIVE', '2023-05-02'],
    [11, 'demo-11', 'Vikram', 'Singh', 5, 6, 1, ['EMPLOYEE'], 'ACTIVE', '2022-07-18'],
    [12, 'demo-12', 'Neha', 'Gupta', 2, 3, 2, ['EMPLOYEE'], 'ACTIVE', '2025-01-06'],
    [13, null, 'Rahul', 'Verma', 5, 6, 11, ['EMPLOYEE'], 'RESIGNED', '2021-02-01'],
  ];
  const people: DemoPerson[] = raw.map(([id, uid, first, last, dept, desg, mgr, roles, status, joined]) => ({
    id,
    keycloakUserId: uid,
    empCode: 'EMP' + String(id).padStart(4, '0'),
    firstName: first,
    lastName: last,
    fullName: `${first} ${last}`,
    email: id <= 4 ? ['admin', 'hr', 'manager', 'employee'][id - 1] + '@ems.local' : `${first}.${last}@ems.local`.toLowerCase(),
    phone: `+91 98${String(id).padStart(3, '0')} 4${String(id * 7).padStart(4, '0')}`,
    dateOfBirth: `${1985 + (id % 12)}-${String((id % 12) + 1).padStart(2, '0')}-${String((id * 3) % 27 + 1).padStart(2, '0')}`,
    joinDate: joined,
    departmentId: dept,
    departmentName: departments.find((d) => d.id === dept)!.name,
    designationId: desg,
    designationTitle: designations.find((d) => d.id === desg)!.title,
    managerId: mgr,
    managerName: null,
    status,
    bankAccount: `5010${String(id).padStart(2, '0')}2233${String(id * 13).padStart(4, '0')}`,
    bankAccountMasked: false,
    address: id % 2 ? 'Baner, Pune, Maharashtra' : 'Indiranagar, Bengaluru, Karnataka',
    emergencyContactName: id % 2 ? 'Ravi ' + last : 'Meera ' + last,
    emergencyContactPhone: '+91 90000 1' + String(id).padStart(4, '0'),
    createdAt: joined + 'T05:00:00Z',
    updatedAt: joined + 'T05:00:00Z',
    roles,
  }));
  people.forEach((p) => (p.managerName = people.find((m) => m.id === p.managerId)?.fullName ?? null));

  const leaveTypes: LeaveType[] = [
    { id: 1, code: 'CL', name: 'Casual Leave', annualQuota: 12, paid: true, unlimited: false, active: true },
    { id: 2, code: 'SL', name: 'Sick Leave', annualQuota: 8, paid: true, unlimited: false, active: true },
    { id: 3, code: 'EL', name: 'Earned Leave', annualQuota: 15, paid: true, unlimited: false, active: true },
    { id: 4, code: 'UL', name: 'Unpaid Leave', annualQuota: 0, paid: false, unlimited: true, active: true },
  ];

  const holidays: Holiday[] = [
    [`${year}-01-26`, 'Republic Day'],
    [`${year}-03-04`, 'Holi'],
    [`${year}-08-15`, 'Independence Day'],
    [`${year}-10-02`, 'Gandhi Jayanti'],
    [`${year}-10-20`, 'Dussehra'],
    [`${year}-11-08`, 'Diwali'],
    [`${year}-12-25`, 'Christmas'],
    [`${year + 1}-01-26`, 'Republic Day'],
  ].map(([date, name], i) => ({ id: i + 1, date, name }));
  const holidaySet = new Set(holidays.map((h) => h.date));

  let seq = 100;
  const leaves: LeaveRequest[] = [];
  const leave = (personId: number, typeId: number, startOffset: number, length: number, status: RequestStatus, reason: string) => {
    const p = people.find((x) => x.id === personId)!;
    const t = leaveTypes.find((x) => x.id === typeId)!;
    const start = weekday(addDays(today, startOffset));
    let end = start;
    while (workingDays(start, end, holidaySet) < length) {
      end = addDays(end, 1);
    }
    leaves.push({
      id: ++seq,
      employeeUserId: p.keycloakUserId!,
      employeeId: p.id,
      employeeName: p.fullName,
      leaveTypeId: t.id,
      leaveTypeCode: t.code,
      leaveTypeName: t.name,
      startDate: start,
      endDate: end,
      days: workingDays(start, end, holidaySet),
      reason,
      status,
      decidedByName: status === 'APPROVED' ? 'Manoj Kumar' : null,
      decisionComment: null,
      decidedAt: status === 'APPROVED' ? new Date().toISOString() : null,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    });
  };
  // Kavya is out today; a few requests wait for Manoj; some leave is coming up for the team
  if (!isWeekend(today)) {
    leave(6, 1, 0, 1, 'APPROVED', 'Family function');
  }
  leave(5, 1, 7, 2, 'PENDING', 'Cousin\'s wedding');
  leave(7, 2, 2, 1, 'PENDING', 'Doctor appointment');
  leave(8, 3, 16, 3, 'APPROVED', 'Trip home');
  leave(9, 3, 21, 5, 'APPROVED', 'Notice period leave');
  leave(4, 1, -24, 1, 'APPROVED', 'Personal work');
  leave(4, 2, -45, 2, 'APPROVED', 'Fever');
  leave(4, 3, 30, 3, 'PENDING', 'Diwali break');
  leave(2, 4, 12, 1, 'PENDING', 'Moving house');
  leave(10, 1, 4, 1, 'APPROVED', 'Bank work');

  // Esha forgot to check in on the last working day before yesterday; she has a correction waiting
  let missed = addDays(today, -3);
  while (isWeekend(missed) || holidaySet.has(missed)) {
    missed = addDays(missed, -1);
  }

  // Attendance for the last four weeks, plus this morning's check-ins
  const attendance: DemoAttendance[] = [];
  const onLeave = (uid: string, d: string) =>
    leaves.some((l) => l.employeeUserId === uid && l.status === 'APPROVED' && l.startDate <= d && l.endDate >= d);
  for (let back = 28; back >= 1; back--) {
    const d = addDays(today, -back);
    if (isWeekend(d) || holidaySet.has(d)) {
      continue;
    }
    people
      .filter((p) => p.keycloakUserId && p.status !== 'RESIGNED' && !onLeave(p.keycloakUserId, d))
      .forEach((p, i) => {
        if (p.id === 4 && d === missed) {
          return;
        }
        const inMin = 8 * 60 + 40 + ((p.id * 7 + back * 3) % 55);
        const outMin = inMin + 8 * 60 + 30 + ((p.id + back) % 40);
        const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        attendance.push({
          id: ++seq + i,
          userId: p.keycloakUserId!,
          name: p.fullName,
          workDate: d,
          checkIn: at(d, hhmm(inMin)),
          checkOut: at(d, hhmm(outMin)),
          workedMinutes: outMin - inMin,
          corrected: false,
        });
      });
  }
  seq += 200;
  if (!isWeekend(today)) {
    ([[4, '09:04'], [5, '08:51'], [7, '09:30'], [8, '10:02'], [10, '09:15'], [11, '09:41'], [12, '09:22']] as const).forEach(
      ([id, t]) => {
        if (Date.parse(at(today, t)) > Date.now()) {
          return; // too early in the day for this person to have arrived
        }
        const p = people.find((x) => x.id === id)!;
        attendance.push({
          id: ++seq,
          userId: p.keycloakUserId!,
          name: p.fullName,
          workDate: today,
          checkIn: at(today, t),
          checkOut: null,
          workedMinutes: null,
          corrected: false,
        });
      },
    );
  }

  const corrections: Correction[] = [
    {
      id: ++seq,
      employeeUserId: PERSONAS.employee.userId,
      employeeName: 'Esha Patel',
      workDate: missed,
      requestedCheckIn: at(missed, '09:30'),
      requestedCheckOut: at(missed, '18:00'),
      reason: 'Forgot to check in, was in the office all day',
      status: 'PENDING',
      decidedByName: null,
      decisionComment: null,
      decidedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];

  return { seq, departments, designations, people, leaveTypes, leaves, holidays, attendance, corrections };
}
