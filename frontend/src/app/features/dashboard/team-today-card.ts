import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TodayAttendance, TodayEntry } from '../../core/api/models';
import { Avatar, PresenceDot } from '../../shared/ui/avatar';
import { StatusChip } from '../../shared/ui/status-chip';
import { fmtTime } from '../../shared/util/dates';

/** Who is in today: tally chips plus a grid of people (team for managers, everyone for HR). */
@Component({
  selector: 'wv-team-today-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, StatusChip, RouterLink],
  host: { class: 'wv-card' },
  template: `
    <div class="head">
      <h2>{{ title() }}</h2>
      @if (board(); as b) {
        <div class="tally">
          <wv-status-chip status="CHECKED_IN" [label]="b.present + ' in'" />
          <wv-status-chip status="ON_LEAVE" [label]="b.onLeave + ' on leave'" />
          <wv-status-chip status="NOT_CHECKED_IN" [label]="b.notCheckedIn + ' not in'" />
        </div>
      }
    </div>
    @if (!board()) {
      <div class="people skeleton" aria-hidden="true">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <span></span>
        }
      </div>
    } @else if (board()!.employees.length === 0) {
      <p class="wv-muted">No one reports to you yet.</p>
    } @else {
      @if (!board()!.workingDay) {
        <p class="wv-muted note">Today is a weekend or holiday.</p>
      }
      <div class="people">
        @for (e of shown(); track e.employeeUserId) {
          <a class="person" [routerLink]="['/app/people', e.employeeId]">
            <wv-avatar [name]="e.employeeName" [dot]="dot(e)" />
            <span class="who">
              <b>{{ e.employeeName }}</b>
              <small>{{ line(e) }}</small>
            </span>
          </a>
        }
      </div>
      @if (board()!.employees.length > limit()) {
        <a class="more" routerLink="/app/attendance">See all {{ board()!.employees.length }} people</a>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    h2 { font-size: var(--wv-text-lg); }
    .tally { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
    .note { margin: -6px 0 12px; }
    .people { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .skeleton span { height: 62px; border-radius: 12px; background: var(--wv-sunk); }
    .person {
      display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px;
      background: var(--wv-sunk); color: inherit; text-decoration: none; min-width: 0;
    }
    .person:hover { background: var(--wv-leaf-soft); }
    .who { display: flex; flex-direction: column; min-width: 0; }
    b { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    small { color: var(--wv-muted); font-size: 13px; }
    .more { display: inline-block; margin-top: 14px; font-size: 14px; font-weight: 500; text-decoration: none; }
  `,
})
export class TeamTodayCard {
  readonly title = input('Team today');
  readonly board = input<TodayAttendance | undefined>();
  readonly limit = input(9);

  /** People who are out of the office first: leave, then not in, then present. */
  protected readonly shown = computed(() => {
    const order = { ON_LEAVE: 0, NOT_CHECKED_IN: 1, CHECKED_IN: 2, CHECKED_OUT: 3 };
    return [...(this.board()?.employees ?? [])].sort((a, b) => order[a.state] - order[b.state]).slice(0, this.limit());
  });

  protected dot(e: TodayEntry): PresenceDot {
    return e.state === 'CHECKED_IN' ? 'in' : e.state === 'ON_LEAVE' ? 'away' : 'none';
  }

  protected line(e: TodayEntry): string {
    switch (e.state) {
      case 'CHECKED_IN':
        return `In since ${fmtTime(e.checkIn!)}`;
      case 'CHECKED_OUT':
        return `Left at ${fmtTime(e.checkOut!)}`;
      case 'ON_LEAVE':
        return `On leave (${e.leaveTypeCode})`;
      default:
        return 'Not checked in';
    }
  }
}
