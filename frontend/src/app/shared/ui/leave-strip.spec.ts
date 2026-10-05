import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TeamCalendarEntry } from '../../core/api/models';
import { LeaveStrip } from './leave-strip';

function entry(name: string, start: string, end: string, status: 'APPROVED' | 'PENDING' = 'APPROVED'): TeamCalendarEntry {
  return { requestId: Math.random(), employeeUserId: name, employeeName: name, leaveTypeCode: 'CL', startDate: start, endDate: end, days: 1, status };
}

function render(month: string, entries: TeamCalendarEntry[], holidays: Record<string, string> = {}) {
  const fixture = TestBed.createComponent(LeaveStrip);
  fixture.componentRef.setInput('month', month);
  fixture.componentRef.setInput('entries', entries);
  fixture.componentRef.setInput('holidays', holidays);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('LeaveStrip', () => {
  it('draws one row per person with a bar spanning the leave days', () => {
    const el = render('2026-10', [entry('Rohan Mehta', '2026-10-13', '2026-10-14'), entry('Arjun Nair', '2026-10-08', '2026-10-08', 'PENDING')]);

    const rows = [...el.querySelectorAll('[role=row]')].slice(1);
    expect(rows.map((r) => r.querySelector('[role=rowheader]')!.textContent!.trim())).toEqual(['Arjun Nair', 'Rohan Mehta']);
    // 31 days -> 31 cells per row, with the two-day bar counted as one cell spanning 2
    const rohanCells = rows[1].querySelectorAll('[role=cell]');
    expect(rohanCells.length).toBe(30);
    expect((rohanCells[12] as HTMLElement).style.gridColumn).toBe('span 2');
    expect(rows[0].querySelector('.bar')!.classList).toContain('pending');
  });

  it('clips leave that starts before or ends after the month', () => {
    const el = render('2026-10', [entry('Imran Shaikh', '2026-09-28', '2026-10-02'), entry('Sneha Kulkarni', '2026-10-30', '2026-11-03')]);

    const [imran, sneha] = [...el.querySelectorAll('[role=row]')].slice(1);
    expect((imran.querySelector('.bar-cell') as HTMLElement).style.gridColumn).toBe('span 2');
    expect((sneha.querySelector('.bar-cell') as HTMLElement).style.gridColumn).toBe('span 2');
  });

  it('marks holidays and says so when nobody is away', () => {
    expect(render('2026-10', []).textContent).toContain('Nobody is away this month.');

    const el = render('2026-10', [entry('Kavya Iyer', '2026-10-05', '2026-10-05')], { '2026-10-20': 'Dussehra' });
    expect(el.querySelector('.cell.hol')!.getAttribute('title')).toBe('Dussehra');
  });
});
