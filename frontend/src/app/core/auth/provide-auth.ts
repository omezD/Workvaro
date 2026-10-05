import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  AutoRefreshTokenService,
  INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
  IncludeBearerTokenCondition,
  UserActivityService,
  createInterceptorCondition,
  provideKeycloak,
  withAutoRefreshToken,
} from 'keycloak-angular';
import { environment } from '../../../environments/environment';

/**
 * Keycloak sign-in (Authorization Code + PKCE).
 * `check-sso` keeps the landing page public: we learn whether the visitor already has a session
 * without forcing a sign-in. Protected routes trigger the sign-in through `authGuard`.
 */
export function provideAuth(): EnvironmentProviders {
  const origin = window.location.origin;
  return makeEnvironmentProviders([
    provideKeycloak({
      config: environment.keycloak,
      initOptions: {
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
        checkLoginIframe: false,
        // Don't hold up the first paint for long if Keycloak is unreachable
        messageReceiveTimeout: 4000,
      },
      features: [
        withAutoRefreshToken({
          onInactivityTimeout: 'logout',
          sessionTimeout: environment.sessionTimeoutMs,
          logoutOptions: { redirectUri: origin + '/' },
        }),
      ],
      providers: [AutoRefreshTokenService, UserActivityService],
    }),
    {
      // Attach the access token to our own API only, never to third-party URLs
      provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
      useValue: [
        createInterceptorCondition<IncludeBearerTokenCondition>({
          urlPattern: new RegExp(`^${environment.apiBaseUrl}(/|$)`),
        }),
      ],
    },
  ]);
}
