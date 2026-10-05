import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { NotifyService } from '../notify/notify.service';
import { apiErrorOf } from './api-error';

/**
 * Handles API failures that no screen can fix by itself: offline, expired session, no permission,
 * rate limiting and server errors. 400/404/409 are left to the screen that made the request, which
 * knows how to show them (for example next to a form field). The error is always re-thrown.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotifyService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && req.url.startsWith(environment.apiBaseUrl)) {
        const body = apiErrorOf(err);
        if (err.status === 0) {
          notify.error("Can't reach Workvaro. Check your connection and try again.");
        } else if (err.status === 401) {
          void auth.login(router.url);
        } else if (err.status === 403) {
          notify.error(body?.message ?? "You don't have permission to do that.");
        } else if (err.status === 429) {
          notify.error('Too many requests. Wait a minute, then try again.');
        } else if (err.status === 503 && body?.message) {
          notify.error(body.message);
        } else if (err.status >= 500) {
          notify.error('Something went wrong on our side. Try again in a moment.');
        }
      }
      return throwError(() => err);
    }),
  );
};
