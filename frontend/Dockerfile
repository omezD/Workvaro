# Builds the Angular app and serves it with Caddy (HTTPS + reverse proxy). Build from the repo root:
#   docker build -f frontend/Dockerfile --build-arg AUTH_DOMAIN=auth.client.com -t ems/web .
FROM node:24-alpine AS build
ARG AUTH_DOMAIN
ARG DEMO_URL=""
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# Point the production build at the real Keycloak domain
RUN test -n "$AUTH_DOMAIN" || (echo "AUTH_DOMAIN build arg is required" && exit 1); \
    sed -i "s#https://auth.example.com#https://${AUTH_DOMAIN}#" src/environments/environment.prod.ts; \
    if [ -n "$DEMO_URL" ]; then sed -i "s#https://demo.example.com/app/dashboard#${DEMO_URL}#" src/environments/environment.prod.ts; fi; \
    npx ng build --configuration production

FROM caddy:2-alpine
COPY --from=build /app/dist/frontend/browser /srv/app
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
