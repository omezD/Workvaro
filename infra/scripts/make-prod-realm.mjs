// Turns the dev realm (infra/keycloak/realm-ems.json) into a production realm:
//  - removes the dev-only "ems-api-test" client (password grant)
//  - points the web client's redirect/logout URLs at https://APP_DOMAIN
//  - requires HTTPS, gives every seed user a random one-time password, and forces
//    "set new password" + "set up authenticator app (TOTP)" on first login
// Usage (from the repo root):  node infra/scripts/make-prod-realm.mjs
// Reads APP_DOMAIN from infra/.env. Writes infra/keycloak/prod/realm-ems.json (git-ignored)
// and prints the one-time passwords once. Hand them over privately.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const infra = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(infra, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^\s*[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const appDomain = env.APP_DOMAIN;
if (!appDomain || appDomain.includes('example.com')) {
  console.error('Set a real APP_DOMAIN in infra/.env first.');
  process.exit(1);
}

const realm = JSON.parse(readFileSync(join(infra, 'keycloak', 'realm-ems.json'), 'utf8'));
const origin = `https://${appDomain}`;
realm.sslRequired = 'all';
realm.clients = realm.clients.filter((c) => c.clientId !== 'ems-api-test');
for (const c of realm.clients) {
  if (c.clientId === 'ems-frontend') {
    c.redirectUris = [`${origin}/*`];
    c.webOrigins = [origin];
    c.rootUrl = origin;
    c.attributes = { ...c.attributes, 'post.logout.redirect.uris': `${origin}/*` };
  }
}

// Meets the realm password policy: upper, lower, digit, special, length 16
const pick = (s) => s[randomInt(s.length)];
const password = () => {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#%+=!'];
  const all = sets.join('');
  const chars = [...sets.map(pick), ...Array.from({ length: 12 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

const issued = [];
for (const u of realm.users ?? []) {
  const pw = password();
  u.credentials = [{ type: 'password', value: pw, temporary: true }];
  u.requiredActions = ['UPDATE_PASSWORD', 'CONFIGURE_TOTP'];
  issued.push({ user: u.username, oneTimePassword: pw });
}

mkdirSync(join(infra, 'keycloak', 'prod'), { recursive: true });
writeFileSync(join(infra, 'keycloak', 'prod', 'realm-ems.json'), JSON.stringify(realm, null, 2));
console.log(`Wrote infra/keycloak/prod/realm-ems.json for ${origin}`);
console.log('One-time passwords (shown only now; each user must change it and set up TOTP at first login):');
console.table(issued);
