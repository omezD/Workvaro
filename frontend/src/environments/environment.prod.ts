// Production: the reverse proxy (Caddy/Nginx) serves the app and routes /api to the gateway.
// Update the Keycloak URL to the real auth domain before deploying.
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  keycloak: {
    url: 'https://auth.example.com',
    realm: 'ems',
    clientId: 'ems-frontend',
  },
  sessionTimeoutMs: 30 * 60 * 1000,
};
