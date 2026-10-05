import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { includeBearerTokenInterceptor } from 'keycloak-angular';
import { routes } from './app.routes';
import { provideAuth } from './core/auth/provide-auth';
import { DEMO_MODE, demoInterceptors, demoProviders } from './core/demo/demo-mode';
import { AppErrorHandler } from './core/errors/app-error-handler';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    ...(DEMO_MODE ? demoProviders() : [provideAuth()]),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    // The demo interceptor (demo build only) comes last so the error interceptor still sees its responses
    provideHttpClient(withInterceptors([includeBearerTokenInterceptor, apiErrorInterceptor, ...demoInterceptors])),
    provideNativeDateAdapter(),
  ],
};
