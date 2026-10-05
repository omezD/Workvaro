import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { DirectoryQuery, EmployeeApi } from '../../core/api/employee.api';
import { EmployeeStatus } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { LoadError } from '../../shared/ui/load-error';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusChip } from '../../shared/ui/status-chip';

const PAGE_SIZE = 12;

/** Company directory as cards. Contact details only; profiles open on click (if the viewer may see them). */
@Component({
  selector: 'wv-people-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatPaginatorModule, RouterLink, Avatar, StatusChip, EmptyState, LoadError, Icon],
  template: `
    <wv-page-header title="People" [subtitle]="subtitle()">
      @if (isHr()) {
        <a mat-flat-button routerLink="/app/people/new">Add employee</a>
      }
    </wv-page-header>

    <div class="filters" role="search">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
        <mat-label>Search by name, email or employee code</mat-label>
        <wv-icon name="search" matIconPrefix class="prefix" />
        <input matInput [ngModel]="searchText()" (ngModelChange)="onSearch($event)" autocomplete="off" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Department</mat-label>
        <mat-select [ngModel]="deptId()" (ngModelChange)="setDept($event)">
          <mat-option [value]="null">All departments</mat-option>
          @for (d of departments.value(); track d.id) {
            <mat-option [value]="d.id">{{ d.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (isHr()) {
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Status</mat-label>
          <mat-select [ngModel]="status()" (ngModelChange)="setStatus($event)">
            <mat-option [value]="null">Current staff</mat-option>
            <mat-option value="ACTIVE">Active</mat-option>
            <mat-option value="ON_NOTICE">On notice</mat-option>
            <mat-option value="RESIGNED">Resigned</mat-option>
            <mat-option value="TERMINATED">Terminated</mat-option>
          </mat-select>
        </mat-form-field>
      }
    </div>

    @if (people.error()) {
      <section class="wv-card"><wv-load-error (retry)="people.reload()" /></section>
    } @else if (!people.hasValue()) {
      <div class="grid" aria-hidden="true">
        @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
          <div class="card skeleton"></div>
        }
      </div>
    } @else if (people.value()!.content.length === 0) {
      <section class="wv-card">
        <wv-empty-state icon="people" title="No one matches" text="Try another name or clear the department filter." />
      </section>
    } @else {
      <div class="grid" [class.loading]="people.isLoading()">
        @for (p of people.value()!.content; track p.id) {
          <a class="card" [routerLink]="['/app/people', p.id]">
            <div class="top">
              <wv-avatar [name]="p.fullName" [size]="48" />
              <div class="name">
                <b>{{ p.fullName }}</b>
                <span>{{ p.designationTitle ?? 'No designation' }}</span>
              </div>
              @if (p.status !== 'ACTIVE') {
                <wv-status-chip [status]="p.status" />
              }
            </div>
            <dl>
              <div><dt>Department</dt><dd>{{ p.departmentName ?? 'Unassigned' }}</dd></div>
              <div><dt>Email</dt><dd>{{ p.email }}</dd></div>
              <div><dt>Phone</dt><dd>{{ p.phone ?? 'Not added' }}</dd></div>
            </dl>
            <span class="code">{{ p.empCode }}</span>
          </a>
        }
      </div>
      @if (people.value()!.totalPages > 1) {
        <mat-paginator [length]="people.value()!.totalElements" [pageSize]="pageSize" [pageIndex]="page()" [hidePageSize]="true"
          (page)="onPage($event)" aria-label="Pages of people" />
      }
    }
  `,
  styles: `
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .filters mat-form-field { width: 200px; }
    .filters .search { flex: 1; min-width: 240px; max-width: 460px; }
    .prefix { margin: 0 4px 0 12px; color: var(--wv-muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; transition: opacity 0.15s; }
    .grid.loading { opacity: 0.6; }
    .card {
      position: relative; display: flex; flex-direction: column; gap: 14px; padding: 18px;
      background: var(--wv-surface); border: 1px solid var(--wv-line); border-radius: var(--wv-radius-card);
      color: inherit; text-decoration: none; transition: border-color 0.15s, transform 0.15s;
    }
    .card:hover { border-color: var(--wv-leaf); transform: translateY(-2px); }
    .card.skeleton { height: 214px; background: var(--wv-sunk); border-color: transparent; }
    .top { display: flex; align-items: center; gap: 12px; }
    .name { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .name b { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .name span { font-size: var(--wv-text-sm); color: var(--wv-muted); }
    dl { margin: 0; padding-top: 12px; border-top: 1px solid var(--wv-line); display: flex; flex-direction: column; gap: 8px; }
    dl div { display: grid; grid-template-columns: 84px 1fr; gap: 8px; font-size: 13px; }
    dt { color: var(--wv-muted); }
    dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .code { position: absolute; top: 12px; right: 14px; font-size: 11px; color: var(--wv-muted); letter-spacing: 0.02em; }
    .card:has(wv-status-chip) .code { display: none; }
    mat-paginator { margin-top: 16px; background: transparent; }
  `,
})
export class PeoplePage {
  private readonly api = inject(EmployeeApi);
  private readonly auth = inject(AuthService);

  /** `?dept=3` from the HR dashboard. */
  readonly dept = input<string | undefined>();

  protected readonly isHr = computed(() => this.auth.hasAnyRole('HR', 'ADMIN'));
  protected readonly searchText = signal('');
  private readonly search = signal('');
  protected readonly deptId = signal<number | null>(null);
  protected readonly status = signal<EmployeeStatus | null>(null);
  protected readonly page = signal(0);
  protected readonly pageSize = PAGE_SIZE;

  private readonly query = computed<DirectoryQuery>(() => ({
    search: this.search(),
    dept: this.deptId(),
    status: this.status(),
    page: this.page(),
    size: PAGE_SIZE,
  }));
  protected readonly people = this.api.directory(this.query);
  protected readonly departments = this.api.departments();

  protected readonly subtitle = computed(() => {
    const total = this.people.value()?.totalElements;
    return total === undefined ? 'Everyone at the company.' : `${total} ${total === 1 ? 'person' : 'people'}${this.search() || this.deptId() ? ' match' : ' at the company'}.`;
  });

  private debounce?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const d = this.dept();
      this.deptId.set(d ? Number(d) : null);
    });
  }

  protected onSearch(text: string): void {
    this.searchText.set(text);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.search.set(text.trim());
      this.page.set(0);
    }, 250);
  }

  protected setDept(id: number | null): void {
    this.deptId.set(id);
    this.page.set(0);
  }

  protected setStatus(s: EmployeeStatus | null): void {
    this.status.set(s);
    this.page.set(0);
  }

  protected onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
  }
}
