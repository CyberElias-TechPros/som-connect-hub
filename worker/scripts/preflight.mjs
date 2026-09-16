#!/usr/bin/env node
/**
 * SOM CONNECT — preflight gate.
 *
 * Runs in CI and before a release. Fails loudly on the things that break a
 * deploy *after* it is already live: unresolved Cloudflare ids, missing
 * production secrets, a stale SQL build, or a production env that still
 * behaves like a demo.
 *
 *   node scripts/preflight.mjs            # warn + fail on errors
 *   node scripts/preflight.mjs --env production --strict
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const args = process.argv.slice(2);
const envArgIndex = args.indexOf('--env');
const envName = args.find((a) => a.startsWith('--env='))?.slice(6) ?? (envArgIndex >= 0 ? args[envArgIndex + 1] : undefined) ?? 'staging';
const strict = args.includes('--strict');

const problems = [];
const warnings = [];
const passes = [];

const fail = (message) => problems.push(message);
const warn = (message) => warnings.push(message);
const pass = (message) => passes.push(message);

/* ------------------------------------------------------------------ *
 * wrangler.toml
 * ------------------------------------------------------------------ */
const tomlPath = join(root, 'wrangler.toml');
if (!existsSync(tomlPath)) {
  fail('worker/wrangler.toml is missing');
} else {
  const toml = readFileSync(tomlPath, 'utf8');
  pass('wrangler.toml present');

  const placeholders = [...toml.matchAll(/replace-with-[a-z0-9-]+/gi)].map((m) => m[0]);
  if (placeholders.length) warn(`${placeholders.length} placeholder id(s) in wrangler.toml (${[...new Set(placeholders)].join(', ')}) — run \`npm run provision:${envName === 'production' ? 'prod' : 'staging'}\``);
  else pass('no placeholder ids');

  for (const binding of ['[[d1_databases]]', '[[r2_buckets]]', '[[kv_namespaces]]', '[[queues.producers]]', '[[queues.consumers]]', '[[durable_objects.bindings]]']) {
    if (toml.includes(binding)) pass(`binding ${binding}`);
    else fail(`binding ${binding} is missing from wrangler.toml`);
  }

  if (envName === 'production') {
    const section = toml.split('[env.production]')[1] ?? '';
    if (/STRICT_AUTH\s*=\s*"true"/.test(section)) pass('production: STRICT_AUTH=true');
    else fail('production must set STRICT_AUTH="true" (no auto-provisioning of unknown emails)');

    if (/ALLOW_ALL_ORIGINS\s*=\s*"false"/.test(section)) pass('production: CORS locked to ALLOWED_ORIGINS');
    else fail('production must set ALLOW_ALL_ORIGINS="false" and list ALLOWED_ORIGINS');

    if (/database_id\s*=\s*"replace-with/.test(section)) fail('production D1 database_id is still a placeholder');
    else if (section.includes('database_id')) pass('production D1 id looks real');
  }

  if (/\[triggers\][\s\S]*crons/.test(toml)) pass('cron trigger configured');
  else warn('no cron trigger found — daily devotionals and renewals will not run');
}

/* ------------------------------------------------------------------ *
 * Generated SQL is current
 * ------------------------------------------------------------------ */
const schemaPath = join(root, 'src/db/schema.sql');
const generatedPath = join(root, 'src/db/sql.generated.ts');
if (!existsSync(generatedPath)) {
  fail('src/db/sql.generated.ts is missing — run `npm run db:build`');
} else if (existsSync(schemaPath)) {
  if (statSync(schemaPath).mtimeMs > statSync(generatedPath).mtimeMs + 1000) {
    fail('schema.sql is newer than sql.generated.ts — run `npm run db:build`');
  } else {
    pass('generated SQL is up to date');
  }
}

/* ------------------------------------------------------------------ *
 * TypeScript
 * ------------------------------------------------------------------ */
try {
  execFileSync('npx', ['tsc', '--noEmit'], { cwd: root, stdio: 'pipe' });
  pass('worker typecheck passes');
} catch (error) {
  fail(`worker typecheck failed:\n${`${error.stdout ?? ''}`.toString().split('\n').slice(0, 6).join('\n')}`);
}

/* ------------------------------------------------------------------ *
 * Secrets expectations
 * ------------------------------------------------------------------ */
const optional = [
  ['RESEND_API_KEY', 'email falls back to the KV outbox (no real delivery)'],
  ['STRIPE_SECRET_KEY', 'payments use the deterministic mock provider'],
  ['PAYMENT_WEBHOOK_SECRET', 'webhook signatures are NOT verified'],
];
for (const [name, consequence] of optional) {
  if (process.env[name]) pass(`secret ${name} present`);
  else if (envName === 'production' && name === 'PAYMENT_WEBHOOK_SECRET') fail(`${name} is required in production — ${consequence}`);
  else warn(`${name} not set in this shell — ${consequence}`);
}
if (!process.env.JWT_SECRET) warn('JWT_SECRET not set in this shell — production sessions would fall back to a dev secret (blocked by resolveJwtSecret)');

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
console.log(`\nSOM CONNECT preflight (${envName})\n`);
for (const line of passes) console.log(`✔ ${line}`);
for (const line of warnings) console.log(`▲ ${line}`);
for (const line of problems) console.log(`✖ ${line}`);

const hardFail = problems.length > 0 || (strict && warnings.length > 0);
console.log(`\n${passes.length} ok · ${warnings.length} warning(s) · ${problems.length} error(s)`);
if (hardFail) {
  console.log('\nPreflight failed.\n');
  process.exit(1);
}
console.log('\nPreflight passed.\n');
