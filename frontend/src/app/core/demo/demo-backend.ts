// In-browser stand-in for the API gateway, used only by `npm run demo`.
// It applies the same main rules as the real services (ownership, roles, overlaps, balances) so the
// screens behave realistically, but it is not a substitute for the backend's own tests.
import { addDays, isWeekend, monthKey, todayIso, workingDays } from '../../shared/util/dates';
import { Correction, EmployeeDetail, EmployeeSummary, LeaveBalance, LeaveRequest, PageResponse, TodayEntry } from '../api/models';
import { DemoDb, DemoPerson, at } from './demo-data';

export interface DemoResponse {
  status: number;
  body: unknown;
}

class DemoError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

const CURRENT = ['ACTIVE', 'ON_NOTICE'];

export function handleDemoRequest(
  db: DemoDb,
  userId: string,
  method: string,
  url: URL,
  body: Record<string, unknown> | null,
): DemoResponse {
  try {
    const result = route(new Ctx(db, userId), method, url.pathname.replace(/^\/api/, ''), url.searchParams, body ?? {});
    return { status: method === 'POST' ? 201 : result === undefined ? 204 : 200, body: result ?? null };
  } catch (e) {
    if (e instanceof DemoError) {
      return {
        status: e.status,
        body: { timestamp: new Date().toISOString(), status: e.status, error: '', message: e.message, path: url.pathname, fieldErrors: e.fieldErrors },
      };
    }
    console.error(e);
    return { status: 500, body: { status: 500, message: 'Unexpected server error', path: url.pathname } };
  }
}

class Ctx {
  constructor(
    readonly db: DemoDb,
    readonly userId: string,
  ) {}

  get me(): DemoPerson {
    return this.db.people.find((p) => p.keycloakUserId === this.userId)!;
  }
  has(...roles: string[]) {
    return roles.some((r) => (this.me.roles as string[]).includes(r));
  }
  get hrOrAdmin() {
    return this.has('HR', 'ADMIN');
  }
  requireRole(...roles: string[]) {
    if (!this.has(...roles)) {
      throw new DemoError(403, 'You do not have permission to perform this action');
    }
  }
  /** null = everyone (HR/Admin); otherwise the caller's direct reports. */
  visibleUserIds(): Set<string> | null {
    if (this.hrOrAdmin) {
      return null;
    }
    if (this.has('MANAGER')) {
      return new Set(this.team().map((p) => p.keycloakUserId!));
    }
    throw new DemoError(403, 'Only managers and HR can view team requests');
  }
  team(): DemoPerson[] {
    return this.db.people.filter((p) => p.managerId === this.me.id && CURRENT.includes(p.status) && p.keycloakUserId);
  }
  assertCanDecide(employeeUserId: string) {
    if (employeeUserId === this.userId) {
      throw new DemoError(403, 'You cannot approve or reject your own request');
    }
    if (this.has('HR')) {
      return;
    }
    const emp = this.db.people.find((p) => p.keycloakUserId === employeeUserId);
    if (this.has('MANAGER') && emp?.managerId === this.me.id) {
      return;
    }
    throw new DemoError(403, "Only the employee's manager or HR can decide on this request");
  }
  nextId() {
    return ++this.db.seq;
  }
  holidaySet() {
    return new Set(this.db.holidays.map((h) => h.date));
  }
}

function route(c: Ctx, method: string, path: string, q: URLSearchParams, body: Record<string, unknown>): unknown {
  const m = (pattern: RegExp) => path.match(pattern);
  let match: RegExpMatchArray | null;

  // ----- employees -----
  if (method === 'GET' && path === '/employees') return directory(c, q);
  if (method === 'GET' && path === '/employees/stats') return (c.requireRole('HR', 'ADMIN'), stats(c));
  if (method === 'GET' && path === '/employees/me') return detail(c.me, false);
  if (method === 'PUT' && path === '/employees/me') {
    validatePhones(body);
    Object.assign(c.me, pick(body, ['phone', 'address', 'emergencyContactName', 'emergencyContactPhone']));
    return detail(c.me, false);
  }
  if (method === 'GET' && path === '/employees/me/team') {
    c.requireRole('HR', 'ADMIN', 'MANAGER');
    return c.team().map(summary);
  }
  if ((match = m(/^\/employees\/(\d+)$/))) {
    const p = person(c, Number(match[1]));
    if (method === 'GET') {
      if (c.hrOrAdmin || p.keycloakUserId === c.userId) return detail(p, false);
      if (p.managerId === c.me.id) return detail(p, true);
      throw new DemoError(403, 'You can only view your own profile or your direct reports');
    }
    if (method === 'PUT') {
      c.requireRole('HR', 'ADMIN');
      return saveEmployee(c, p, body);
    }
  }
  if (method === 'POST' && path === '/employees') {
    c.requireRole('HR', 'ADMIN');
    if (c.db.people.some((p) => p.empCode.toLowerCase() === String(body['empCode'] ?? '').toLowerCase())) {
      throw new DemoError(409, 'Employee code already exists');
    }
    const p = { id: c.nextId(), empCode: String(body['empCode']).toUpperCase(), status: 'ACTIVE', roles: ['EMPLOYEE'], createdAt: new Date().toISOString() } as DemoPerson;
    c.db.people.push(p);
    return saveEmployee(c, p, body);
  }
  if ((match = m(/^\/employees\/(\d+)\/status$/)) && method === 'PATCH') {
    c.requireRole('HR', 'ADMIN');
    const p = person(c, Number(match[1]));
    if (p.keycloakUserId === c.userId) throw new DemoError(403, 'You cannot change your own employment status');
    p.status = body['status'] as DemoPerson['status'];
    return detail(p, false);
  }

  // ----- departments / designations -----
  if (path === '/departments' && method === 'GET') return [...c.db.departments].sort((a, b) => a.name.localeCompare(b.name));
  if (path === '/designations' && method === 'GET') return [...c.db.designations].sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));
  if ((match = m(/^\/(departments|designations)(?:\/(\d+))?$/))) {
    c.requireRole('HR', 'ADMIN');
    const list = (match[1] === 'departments' ? c.db.departments : c.db.designations) as { id: number }[];
    const id = match[2] ? Number(match[2]) : null;
    const key = match[1] === 'departments' ? 'departmentId' : 'designationId';
    if (method === 'POST') {
      const item = { id: c.nextId(), description: null, ...body };
      list.push(item);
      return item;
    }
    const item = list.find((x) => x.id === id);
    if (!item) throw new DemoError(404, 'Not found');
    if (method === 'PUT') return Object.assign(item, body);
    if (method === 'DELETE') {
      if (c.db.people.some((p) => p[key] === id)) throw new DemoError(409, 'Still assigned to employees; move them first');
      list.splice(list.indexOf(item), 1);
      return undefined;
    }
  }

  // ----- leave types & balances -----
  if (path === '/leave-types' && method === 'GET') {
    return c.db.leaveTypes.filter((t) => q.get('activeOnly') === 'false' || t.active);
  }
  if ((match = m(/^\/leave-types(?:\/(\d+))?$/))) {
    c.requireRole('HR', 'ADMIN');
    if (method === 'POST') {
      const t = { id: c.nextId(), ...body } as never;
      c.db.leaveTypes.push(t);
      return t;
    }
    const t = c.db.leaveTypes.find((x) => x.id === Number(match![1]));
    if (t && method === 'PUT') return Object.assign(t, body);
  }
  if (path === '/leaves/balance/me') return balances(c, c.userId, Number(q.get('year') ?? todayIso().slice(0, 4)));

  // ----- leave requests -----
  if (path === '/leaves' && method === 'POST') return applyLeave(c, body);
  if (path === '/leaves/me') {
    return c.db.leaves
      .filter((l) => l.employeeUserId === c.userId && (!q.get('status') || l.status === q.get('status')))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }
  if (path === '/leaves/pending') {
    c.requireRole('HR', 'ADMIN', 'MANAGER');
    const visible = c.visibleUserIds();
    return c.db.leaves
      .filter((l) => l.status === 'PENDING' && l.employeeUserId !== c.userId && (!visible || visible.has(l.employeeUserId)))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }
  if (path === '/leaves' && method === 'GET') {
    c.requireRole('HR', 'ADMIN', 'MANAGER');
    const visible = c.visibleUserIds();
    const from = q.get('from');
    const to = q.get('to');
    const rows = c.db.leaves
      .filter((l) => !visible || visible.has(l.employeeUserId))
      .filter((l) => !q.get('status') || l.status === q.get('status'))
      .filter((l) => (!from || l.endDate >= from) && (!to || l.startDate <= to))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
    return page(rows, Number(q.get('page') ?? 0), Number(q.get('size') ?? 20));
  }
  if (path === '/leaves/team-calendar') {
    c.requireRole('HR', 'ADMIN', 'MANAGER');
    const month = q.get('month') ?? monthKey();
    const visible = c.visibleUserIds();
    visible?.add(c.userId);
    return c.db.leaves
      .filter((l) => ['PENDING', 'APPROVED'].includes(l.status) && (!visible || visible.has(l.employeeUserId)))
      .filter((l) => l.startDate <= `${month}-31` && l.endDate >= `${month}-01`)
      .map((l) => ({ requestId: l.id, employeeUserId: l.employeeUserId, employeeName: l.employeeName, leaveTypeCode: l.leaveTypeCode, startDate: l.startDate, endDate: l.endDate, days: l.days, status: l.status }));
  }
  if ((match = m(/^\/leaves\/(\d+)\/(cancel|approve|reject)$/))) {
    const l = c.db.leaves.find((x) => x.id === Number(match![1]));
    if (!l) throw new DemoError(404, 'Leave request not found');
    return decideLeave(c, l, match[2], body['comment'] as string | null);
  }

  // ----- holidays -----
  if (path === '/holidays' && method === 'GET') {
    const year = q.get('year') ?? todayIso().slice(0, 4);
    return c.db.holidays.filter((h) => h.date.startsWith(year)).sort((a, b) => a.date.localeCompare(b.date));
  }
  if (path === '/holidays' && method === 'POST') {
    c.requireRole('HR', 'ADMIN');
    if (c.db.holidays.some((h) => h.date === body['date'])) throw new DemoError(409, `A holiday already exists on ${body['date']}`);
    const h = { id: c.nextId(), date: String(body['date']), name: String(body['name']) };
    c.db.holidays.push(h);
    return h;
  }
  if ((match = m(/^\/holidays\/(\d+)$/)) && method === 'DELETE') {
    c.requireRole('HR', 'ADMIN');
    c.db.holidays = c.db.holidays.filter((h) => h.id !== Number(match![1]));
    return undefined;
  }

  // ----- attendance -----
  const today = todayIso();
  const mine = (d: string) => c.db.attendance.find((a) => a.userId === c.userId && a.workDate === d);
  if (path === '/attendance/check-in') {
    if (mine(today)) throw new DemoError(409, 'You have already checked in today');
    const a = { id: c.nextId(), userId: c.userId, name: c.me.fullName, workDate: today, checkIn: new Date().toISOString(), checkOut: null, workedMinutes: null, corrected: false };
    c.db.attendance.push(a);
    return strip(a);
  }
  if (path === '/attendance/check-out') {
    const a = mine(today);
    if (!a) throw new DemoError(409, 'You have not checked in today');
    if (a.checkOut) throw new DemoError(409, 'You have already checked out today');
    a.checkOut = new Date().toISOString();
    a.workedMinutes = Math.round((Date.parse(a.checkOut) - Date.parse(a.checkIn)) / 60000);
    return strip(a);
  }
  if (path === '/attendance/me') {
    const month = q.get('month') ?? monthKey();
    return c.db.attendance.filter((a) => a.userId === c.userId && a.workDate.startsWith(month)).sort((a, b) => a.workDate.localeCompare(b.workDate)).map(strip);
  }
  if (path === '/attendance/today') {
    c.requireRole('HR', 'ADMIN', 'MANAGER');
    const people = c.hrOrAdmin ? c.db.people.filter((p) => CURRENT.includes(p.status) && p.keycloakUserId) : c.team();
    return board(c, people);
  }
  if (path === '/attendance/corrections' && method === 'POST') return requestCorrection(c, body);
  if (path === '/attendance/corrections/me') {
    return c.db.corrections.filter((x) => x.employeeUserId === c.userId).sort((a, b) => b.workDate.localeCompare(a.workDate));
  }
  if (path === '/attendance/corrections/pending') {
    c.requireRole('HR', 'ADMIN', 'MANAGER');
    const visible = c.visibleUserIds();
    return c.db.corrections.filter((x) => x.status === 'PENDING' && x.employeeUserId !== c.userId && (!visible || visible.has(x.employeeUserId)));
  }
  if ((match = m(/^\/attendance\/corrections\/(\d+)\/(approve|reject)$/))) {
    return decideCorrection(c, Number(match[1]), match[2], body['comment'] as string | null);
  }

  // ----- dashboards -----
  if (path === '/dashboard/me') {
    const upcomingHolidays = c.db.holidays.filter((h) => h.date >= today && h.date <= addDays(today, 90)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    return {
      balances: balances(c, c.userId, Number(today.slice(0, 4))),
      today: mine(today) ? strip(mine(today)!) : null,
      myPendingLeaves: c.db.leaves.filter((l) => l.employeeUserId === c.userId && l.status === 'PENDING').length,
      upcomingLeaves: c.db.leaves.filter((l) => l.employeeUserId === c.userId && ['PENDING', 'APPROVED'].includes(l.status) && l.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 5),
      upcomingHolidays,
    };
  }
  if (path === '/dashboard/manager') {
    c.requireRole('MANAGER');
    const team = c.team();
    const ids = new Set(team.map((p) => p.keycloakUserId!));
    const b = board(c, team);
    return {
      teamSize: team.length,
      pendingLeaveApprovals: c.db.leaves.filter((l) => l.status === 'PENDING' && ids.has(l.employeeUserId)).length,
      pendingCorrectionApprovals: c.db.corrections.filter((x) => x.status === 'PENDING' && ids.has(x.employeeUserId)).length,
      presentToday: b.present,
      onLeaveToday: b.onLeave,
      onLeave: b.employees.filter((e) => e.state === 'ON_LEAVE'),
    };
  }
  if (path === '/dashboard/hr') {
    c.requireRole('HR', 'ADMIN');
    const everyone = c.db.people.filter((p) => CURRENT.includes(p.status) && p.keycloakUserId);
    const b = board(c, everyone);
    return {
      activeEmployees: everyone.length,
      pendingLeaveApprovals: c.db.leaves.filter((l) => l.status === 'PENDING').length,
      pendingCorrectionApprovals: c.db.corrections.filter((x) => x.status === 'PENDING').length,
      presentToday: b.present,
      onLeaveToday: b.onLeave,
      notCheckedInToday: b.notCheckedIn,
      upcomingHolidays: c.db.holidays.filter((h) => h.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    };
  }

  throw new DemoError(404, `Demo backend has no handler for ${method} ${path}`);
}

// ---------- helpers ----------

function person(c: Ctx, id: number): DemoPerson {
  const p = c.db.people.find((x) => x.id === id);
  if (!p) throw new DemoError(404, `Employee ${id} not found`);
  return p;
}

function summary(p: DemoPerson): EmployeeSummary {
  const { id, empCode, firstName, lastName, fullName, email, phone, departmentId, departmentName, designationId, designationTitle, status } = p;
  return { id, empCode, firstName, lastName, fullName, email, phone, departmentId, departmentName, designationId, designationTitle, status };
}

function detail(p: DemoPerson, masked: boolean): EmployeeDetail {
  const { roles, ...rest } = p;
  const bank = p.bankAccount;
  return masked && bank ? { ...rest, bankAccount: '*'.repeat(bank.length - 4) + bank.slice(-4), bankAccountMasked: true } : { ...rest, bankAccountMasked: false };
}

function directory(c: Ctx, q: URLSearchParams): PageResponse<EmployeeSummary> {
  const search = (q.get('search') ?? '').toLowerCase();
  const dept = q.get('dept');
  const status = q.get('status');
  const rows = c.db.people
    .filter((p) => (status && c.hrOrAdmin ? p.status === status : CURRENT.includes(p.status)))
    .filter((p) => !dept || p.departmentId === Number(dept))
    .filter((p) => !search || [p.firstName, p.lastName, p.email, p.empCode].some((v) => v.toLowerCase().includes(search)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map(summary);
  return page(rows, Number(q.get('page') ?? 0), Number(q.get('size') ?? 20));
}

function page<T>(rows: T[], pageNo: number, size: number): PageResponse<T> {
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  return { content: rows.slice(pageNo * size, pageNo * size + size), page: pageNo, size, totalElements: rows.length, totalPages, last: pageNo >= totalPages - 1 };
}

function stats(c: Ctx) {
  const current = c.db.people.filter((p) => CURRENT.includes(p.status));
  const byStatus = { ACTIVE: 0, ON_NOTICE: 0, RESIGNED: 0, TERMINATED: 0 } as Record<string, number>;
  c.db.people.forEach((p) => byStatus[p.status]++);
  const byDept = new Map<string, number>();
  current.forEach((p) => byDept.set(p.departmentName ?? 'Unassigned', (byDept.get(p.departmentName ?? 'Unassigned') ?? 0) + 1));
  return {
    totalCurrent: current.length,
    byStatus,
    byDepartment: [...byDept.entries()].map(([departmentName, headcount]) => ({ departmentId: c.db.departments.find((d) => d.name === departmentName)?.id ?? null, departmentName, headcount })).sort((a, b) => b.headcount - a.headcount),
  };
}

function validatePhones(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  for (const f of ['phone', 'emergencyContactPhone']) {
    const v = body[f];
    if (v && !/^\+?[0-9 ()-]{7,20}$/.test(String(v))) errors[f] = 'invalid phone number';
  }
  if (Object.keys(errors).length) throw new DemoError(400, 'Validation failed', errors);
}

function pick(body: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, (body[k] as string) || null]));
}

function saveEmployee(c: Ctx, p: DemoPerson, body: Record<string, unknown>) {
  validatePhones(body);
  const email = String(body['email'] ?? '').toLowerCase();
  if (c.db.people.some((x) => x !== p && x.email === email)) throw new DemoError(409, 'Email already belongs to another employee');
  const managerId = (body['managerId'] as number | null) ?? null;
  if (managerId === p.id) throw new DemoError(400, 'An employee cannot be their own manager');
  const dept = c.db.departments.find((d) => d.id === body['departmentId']);
  const desg = c.db.designations.find((d) => d.id === body['designationId']);
  Object.assign(p, pick(body, ['phone', 'address', 'emergencyContactName', 'emergencyContactPhone', 'dateOfBirth']), {
    keycloakUserId: (body['keycloakUserId'] as string) || p.keycloakUserId || null,
    firstName: body['firstName'],
    lastName: body['lastName'],
    fullName: `${body['firstName']} ${body['lastName']}`,
    email,
    joinDate: body['joinDate'],
    departmentId: dept?.id ?? null,
    departmentName: dept?.name ?? null,
    designationId: desg?.id ?? null,
    designationTitle: desg?.title ?? null,
    managerId,
    managerName: c.db.people.find((x) => x.id === managerId)?.fullName ?? null,
    updatedAt: new Date().toISOString(),
  });
  if (body['bankAccount']) p.bankAccount = String(body['bankAccount']);
  return detail(p, false);
}

function balances(c: Ctx, userId: string, year: number): LeaveBalance[] {
  return c.db.leaveTypes
    .filter((t) => t.active)
    .map((t) => {
      const mine = c.db.leaves.filter((l) => l.employeeUserId === userId && l.leaveTypeId === t.id && l.startDate.startsWith(String(year)));
      const used = mine.filter((l) => l.status === 'APPROVED').reduce((s, l) => s + l.days, 0);
      const pending = mine.filter((l) => l.status === 'PENDING').reduce((s, l) => s + l.days, 0);
      const allocated = t.unlimited ? 0 : t.annualQuota;
      return { leaveTypeId: t.id, leaveTypeCode: t.code, leaveTypeName: t.name, year, allocated, used, pending, available: t.unlimited ? 0 : Math.max(0, allocated - used - pending), unlimited: t.unlimited };
    })
    .sort((a, b) => a.leaveTypeName.localeCompare(b.leaveTypeName));
}

function applyLeave(c: Ctx, body: Record<string, unknown>): LeaveRequest {
  const start = String(body['startDate'] ?? '');
  const end = String(body['endDate'] ?? '');
  const type = c.db.leaveTypes.find((t) => t.id === body['leaveTypeId']);
  const fieldErrors: Record<string, string> = {};
  if (!type) fieldErrors['leaveTypeId'] = 'must not be null';
  if (!start) fieldErrors['startDate'] = 'must not be null';
  if (!end) fieldErrors['endDate'] = 'must not be null';
  if (start && end && end < start) fieldErrors['validRange'] = 'endDate must be on or after startDate';
  if (Object.keys(fieldErrors).length) throw new DemoError(400, 'Validation failed', fieldErrors);
  if (start.slice(0, 4) !== end.slice(0, 4)) throw new DemoError(400, 'A leave request cannot span two calendar years; split it into two requests');
  if (start < addDays(todayIso(), -30)) throw new DemoError(400, 'Leave can be back-dated by at most 30 days');
  const days = workingDays(start, end, c.holidaySet());
  if (days === 0) throw new DemoError(400, 'The selected dates contain no working days');
  if (c.db.leaves.some((l) => l.employeeUserId === c.userId && ['PENDING', 'APPROVED'].includes(l.status) && l.startDate <= end && l.endDate >= start)) {
    throw new DemoError(409, 'You already have a pending or approved leave overlapping these dates');
  }
  if (!type!.unlimited) {
    const b = balances(c, c.userId, Number(start.slice(0, 4))).find((x) => x.leaveTypeId === type!.id)!;
    if (days > b.available) throw new DemoError(400, `Insufficient ${type!.name} balance: requested ${days} day(s), available ${b.available}`);
  }
  const l: LeaveRequest = {
    id: c.nextId(), employeeUserId: c.userId, employeeId: c.me.id, employeeName: c.me.fullName, leaveTypeId: type!.id, leaveTypeCode: type!.code,
    leaveTypeName: type!.name, startDate: start, endDate: end, days, reason: (body['reason'] as string) || null, status: 'PENDING',
    decidedByName: null, decisionComment: null, decidedAt: null, createdAt: new Date().toISOString(),
  };
  c.db.leaves.push(l);
  return l;
}

function decideLeave(c: Ctx, l: LeaveRequest, action: string, comment: string | null): LeaveRequest {
  if (action === 'cancel') {
    if (l.employeeUserId !== c.userId) throw new DemoError(403, 'You can only cancel your own leave requests');
    if (l.status !== 'PENDING') throw new DemoError(409, `Only pending requests can be cancelled (current status: ${l.status})`);
    l.status = 'CANCELLED';
    return l;
  }
  c.requireRole('HR', 'MANAGER');
  if (l.status !== 'PENDING') throw new DemoError(409, `Request is already ${l.status}`);
  c.assertCanDecide(l.employeeUserId);
  Object.assign(l, { status: action === 'approve' ? 'APPROVED' : 'REJECTED', decidedByName: c.me.fullName, decisionComment: comment, decidedAt: new Date().toISOString() });
  return l;
}

function requestCorrection(c: Ctx, body: Record<string, unknown>): Correction {
  const workDate = String(body['workDate'] ?? '');
  const checkIn = String(body['checkIn'] ?? '');
  const checkOut = String(body['checkOut'] ?? '');
  const reason = String(body['reason'] ?? '').trim();
  const errors: Record<string, string> = {};
  if (!workDate) errors['workDate'] = 'must not be null';
  if (!reason) errors['reason'] = 'must not be blank';
  if (checkIn && checkOut && checkOut <= checkIn) errors['validRange'] = 'checkOut must be after checkIn';
  if (Object.keys(errors).length) throw new DemoError(400, 'Validation failed', errors);
  if (workDate > todayIso()) throw new DemoError(400, 'Corrections can only be requested for past days or today');
  if (Date.parse(at(workDate, checkOut)) > Date.now()) throw new DemoError(400, 'Check-out time cannot be in the future');
  if (c.db.corrections.some((x) => x.employeeUserId === c.userId && x.workDate === workDate && x.status === 'PENDING')) {
    throw new DemoError(409, `You already have a pending correction for ${workDate}`);
  }
  const x: Correction = {
    id: c.nextId(), employeeUserId: c.userId, employeeName: c.me.fullName, workDate, requestedCheckIn: at(workDate, checkIn),
    requestedCheckOut: at(workDate, checkOut), reason, status: 'PENDING', decidedByName: null, decisionComment: null, decidedAt: null,
    createdAt: new Date().toISOString(),
  };
  c.db.corrections.push(x);
  return x;
}

function decideCorrection(c: Ctx, id: number, action: string, comment: string | null): Correction {
  c.requireRole('HR', 'MANAGER');
  const x = c.db.corrections.find((r) => r.id === id);
  if (!x) throw new DemoError(404, 'Attendance correction not found');
  if (x.status !== 'PENDING') throw new DemoError(409, `Correction is already ${x.status}`);
  c.assertCanDecide(x.employeeUserId);
  if (action === 'approve') {
    let a = c.db.attendance.find((r) => r.userId === x.employeeUserId && r.workDate === x.workDate);
    if (!a) {
      a = { id: c.nextId(), userId: x.employeeUserId, name: x.employeeName, workDate: x.workDate, checkIn: '', checkOut: null, workedMinutes: null, corrected: true };
      c.db.attendance.push(a);
    }
    Object.assign(a, { checkIn: x.requestedCheckIn, checkOut: x.requestedCheckOut, corrected: true, workedMinutes: Math.round((Date.parse(x.requestedCheckOut) - Date.parse(x.requestedCheckIn)) / 60000) });
  }
  Object.assign(x, { status: action === 'approve' ? 'APPROVED' : 'REJECTED', decidedByName: c.me.fullName, decisionComment: comment, decidedAt: new Date().toISOString() });
  return x;
}

function board(c: Ctx, people: DemoPerson[]) {
  const today = todayIso();
  const employees: TodayEntry[] = people.map((p) => {
    const a = c.db.attendance.find((r) => r.userId === p.keycloakUserId && r.workDate === today);
    const leave = c.db.leaves.find((l) => l.employeeUserId === p.keycloakUserId && l.status === 'APPROVED' && l.startDate <= today && l.endDate >= today);
    const state = a ? (a.checkOut ? 'CHECKED_OUT' : 'CHECKED_IN') : leave ? 'ON_LEAVE' : 'NOT_CHECKED_IN';
    return { employeeUserId: p.keycloakUserId!, employeeId: p.id, employeeName: p.fullName, departmentName: p.departmentName, state, checkIn: a?.checkIn ?? null, checkOut: a?.checkOut ?? null, leaveTypeCode: leave?.leaveTypeCode ?? null };
  });
  const present = employees.filter((e) => e.state === 'CHECKED_IN' || e.state === 'CHECKED_OUT').length;
  const onLeave = employees.filter((e) => e.state === 'ON_LEAVE').length;
  return { date: today, workingDay: !isWeekend(today) && !c.holidaySet().has(today), present, onLeave, notCheckedIn: employees.length - present - onLeave, employees };
}

function strip(a: { id: number; workDate: string; checkIn: string; checkOut: string | null; workedMinutes: number | null; corrected: boolean }) {
  const workedMinutes = a.checkOut ? Math.round((Date.parse(a.checkOut) - Date.parse(a.checkIn)) / 60000) : null;
  return { id: a.id, workDate: a.workDate, checkIn: a.checkIn, checkOut: a.checkOut, workedMinutes, corrected: a.corrected };
}
