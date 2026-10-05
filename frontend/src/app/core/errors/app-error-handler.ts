import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { NotifyService } from '../notify/notify.service';

/**
 * Last-resort handler for errors nothing else caught. HTTP errors are skipped because
 * apiErrorInterceptor and the screens already reported them.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  // Resolved lazily: the snackbar service can't be injected while the ErrorHandler is being created
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    console.error(error);
    const cause = (error as { rejection?: unknown })?.rejection ?? error;
    if (cause instanceof HttpErrorResponse) {
      return;
    }
    this.injector.get(NotifyService).error('Something went wrong. Reload the page if this keeps happening.');
  }
}
