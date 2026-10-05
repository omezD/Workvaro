// `ng serve` forwards /api to the API gateway, so the browser talks to one origin (no CORS in dev).
// Gateway on another port (e.g. Apache holds 8080)? Run:  $env:GATEWAY_URL="http://localhost:8090"; npm start
const target = process.env.GATEWAY_URL ?? 'http://localhost:8080';

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
  },
};
