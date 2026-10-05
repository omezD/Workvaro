import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, parseIso, todayIso } from '../../shared/util/dates';
import { LeaveBalance, LeaveRequest } from '../api/models';
import { handleDemoRequest } from './demo-backend';
import { DemoDb, PERSONAS, seedDb } from './demo-data';

// The demo backend is what clients see in `npm run demo`, so its rules should match the real services.
describe('demo backend', () => {
  let db: DemoDb;
  const call = (who: keyof typeof PERSONAS, method: string, path: string, body: Record<string, unknown> | null = null) =>
    handleDemoRequest(db, PERSONAS[who].userId, method, new URL(path, 'http://localhost'), body);

  /** A Monday-to-Wednesday stretch well in the future, free of seeded leave. */
  function freeWeek(): [string, string] {
    let d = addDays(todayIso(), 60);
    while (parseIso(d).getDay() !== 1) {
      d = addDays(d, 1);
    }
    return [d, addDays(d, 2)];
  }

  beforeEach(() => {
    db = seedDb();
  });

  it('applies, blocks overlaps, and deducts the balance only on approval', () => {
    const [start, end] = freeWeek();
    const year = start.slice(0, 4);
    const casual = () => (call('employee', 'GET', `/api/leaves/balance/me?year=${year}`).body as LeaveBalance[]).find((b) => b.leaveTypeCode === 'CL')!;
    const before = casual();

    const applied = call('employee', 'POST', '/api/leaves', { leaveTypeId: 1, startDate: start, endDate: end });
    expect(applied.status).toBe(201);
    const leave = applied.body as LeaveRequest;
    expect(leave.days).toBe(3);
    expect(casual().pending).toBe(before.pending + 3);

    expect(call('employee', 'POST', '/api/leaves', { leaveTypeId: 4, startDate: start, endDate: start }).status).toBe(409);

    expect(call('employee', 'PATCH', `/api/leaves/${leave.id}/approve`).status).toBe(403);
    expect(call('manager', 'PATCH', `/api/leaves/${leave.id}/approve`, { comment: 'ok' }).status).toBe(200);
    expect(casual().used).toBe(before.used + 3);
    expect(call('manager', 'PATCH', `/api/leaves/${leave.id}/approve`).status).toBe(409);
  });

  it('rejects weekend-only and over-balance requests', () => {
    let sat = addDays(todayIso(), 30);
    while (parseIso(sat).getDay() !== 6) {
      sat = addDays(sat, 1);
    }
    expect(call('employee', 'POST', '/api/leaves', { leaveTypeId: 1, startDate: sat, endDate: addDays(sat, 1) }).status).toBe(400);

    const [start] = freeWeek();
    // 10 working days of sick leave (8 allowed); stay inside one calendar year
    const end = addDays(start, 13) <= `${start.slice(0, 4)}-12-31` ? addDays(start, 13) : `${start.slice(0, 4)}-12-31`;
    const tooLong = call('employee', 'POST', '/api/leaves', { leaveTypeId: 2, startDate: start, endDate: end });
    expect(tooLong.status).toBe(400);
    expect((tooLong.body as { message: string }).message).toContain('Insufficient Sick Leave balance');
  });

  it("keeps profiles private and only lets the employee's own manager decide", () => {
    expect(call('employee', 'GET', '/api/employees/3').status).toBe(403);
    expect(call('manager', 'GET', '/api/employees/4').status).toBe(200);
    expect((call('manager', 'GET', '/api/employees/4').body as { bankAccountMasked: boolean }).bankAccountMasked).toBe(true);
    expect((call('hr', 'GET', '/api/employees/4').body as { bankAccountMasked: boolean }).bankAccountMasked).toBe(false);

    const hrLeave = db.leaves.find((l) => l.employeeName === 'Harini Rao' && l.status === 'PENDING')!;
    expect(call('manager', 'PATCH', `/api/leaves/${hrLeave.id}/approve`).status).toBe(403);
    expect(call('hr', 'PATCH', `/api/leaves/${hrLeave.id}/approve`).status).toBe(403);
    expect(call('admin', 'PATCH', `/api/leaves/${hrLeave.id}/approve`).status).toBe(200);
  });

  it('enforces roles on HR endpoints', () => {
    expect(call('employee', 'GET', '/api/employees/stats').status).toBe(403);
    expect(call('employee', 'POST', '/api/holidays', { date: '2030-01-01', name: 'x' }).status).toBe(403);
    expect(call('hr', 'GET', '/api/employees/stats').status).toBe(200);
  });
});
