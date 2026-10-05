import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { NotifyService } from '../notify/notify.service';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const notify = { error: vi.fn(), success: vi.fn(), info: vi.fn() };
  const auth = { login: vi.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotifyService, useValue: notify },
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  /** Sends a request, answers it with `status`, and returns the error the caller received. */
  function fail(url: string, status: number, body: object | null = null, method: 'GET' | 'PATCH' = 'GET'): unknown {
    let received: unknown;
    http.request(method, url, { body: method === 'GET' ? undefined : {} }).subscribe({ error: (e) => (received = e) });
    backend.expectOne(url).flush(body, { status, statusText: 'x' });
    return received;
  }

  it('shows the server message when an action is refused (403) and still passes the error on', () => {
    const err = fail('/api/leaves/9/approve', 403, { status: 403, message: 'Only the employee manager can decide' }, 'PATCH');

    expect(notify.error).toHaveBeenCalledWith('Only the employee manager can decide');
    expect(err).toBeTruthy();
  });

  it('leaves a refused read (403 on GET) to the screen', () => {
    fail('/api/employees/3', 403, { status: 403, message: 'You can only view your own profile' });
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('starts sign-in again when the session has expired', () => {
    fail('/api/employees/me', 401);
    expect(auth.login).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('leaves validation and conflict errors to the screen', () => {
    fail('/api/leaves', 400, { status: 400, message: 'Validation failed', fieldErrors: { endDate: 'required' } });
    fail('/api/leaves', 409, { status: 409, message: 'Overlapping leave' });
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('explains rate limiting and server errors in plain words', () => {
    fail('/api/employees', 429);
    fail('/api/employees', 500, { status: 500, message: 'Unexpected server error' });

    expect(notify.error).toHaveBeenNthCalledWith(1, 'Too many requests. Wait a minute, then try again.');
    expect(notify.error).toHaveBeenNthCalledWith(2, 'Something went wrong on our side. Try again in a moment.');
  });

  it('passes on 503 messages from the services (e.g. directory unavailable)', () => {
    fail('/api/leaves', 503, { status: 503, message: 'Employee directory is temporarily unavailable, please retry' });
    expect(notify.error).toHaveBeenCalledWith('Employee directory is temporarily unavailable, please retry');
  });

  it('ignores requests to other hosts', () => {
    fail('https://example.com/data.json', 500);
    expect(notify.error).not.toHaveBeenCalled();
  });
});
