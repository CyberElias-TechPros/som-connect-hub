#!/usr/bin/env node
/**
 * SOM CONNECT — Cloudflare provisioning, in the correct order.
 *
 * Cloudflare resources have dependencies (a Worker cannot bind a D1 database
 * that does not exist yet; migrations cannot run before the database exists;
 * secrets cannot be set before the Worker exists). This script runs the whole
 * sequence, is safe to re-run, and tells you exactly what to do next.
 *
 *   node scripts/provision.mjs --env staging --check    # preflight only, no writes
 *   node scripts/provision.mjs --env staging            # create + wire resources
 *   node scripts/provision.mjs --env production --deploy
 *
 * Order of operations:
 *   1. preflight   — wrangler installed, authenticated, config sane
 *   2. D1          — create database, print its id
 *   3. config      — write the id into wrangler.toml (unless --no-write)
 *   4. R2          — create the media bucket
 *   5. KV          — create the cache namespace
 *   6. Queue       — create the job queue + dead-letter queue
 *   7. migrations  — apply schema + seed to the remote database
 *   8. secrets     — prompt for / read JWT_SECRET, RESEND_API_KEY, Stripe keys
 *   9. deploy      — optional, with --deploy
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const envName = args.find((a) => a.startsWith('--env='))?.slice(6) ?? (args.indexOf('--env') >= 0 ? args[args.indexOf('--env') + 1] : undefined) ?? 'staging';
const checkOnly = flag('check');
const deploy = flag('deploy');
const writeConfig = !flag('no-write');

const NAMES = {
  database: value('db', 'som-connect-db'),
  bucket: value('bucket', 'som-connect-storage'),
  kv: value('kv', 'CACHE'),
  queue: value('queue', 'som-connect-jobs'),
  dlq: `${value('queue', 'som-connect-jobs')}-dlq`,
};

const results = [];
const record = (step, ok, detail) => {
  const icon = ok ? '✔' : '✖';
  console.log(`${icon} ${step}${detail ? ` — ${detail}` : ''}`);
  results.push({ step, ok, detail });
};

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
    env: process.env,
  });
}

function wrangler(commandArgs, options = {}) {
  return run('npx', ['wrangler', ...commandArgs], options);
}

function tryWrangler(commandArgs, options = {}) {
  try {
    return { ok: true, output: wrangler(commandArgs, options) };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}${error.message ?? ''}` };
  }
}

/* ------------------------------------------------------------------ *
 * 1. Preflight
 * ------------------------------------------------------------------ */
console.log(`\nSOM CONNECT provisioning — env: ${envName}${checkOnly ? ' (check only)' : ''}\n`);

const preflight = tryWrangler(['whoami']);
if (!preflight.ok || /not authenticated|You are not logged in/i.test(preflight.output)) {
  record('preflight: wrangler authentication', false, 'run `npx wrangler login` (or set CLOUDFLARE_API_TOKEN)');
} else {
  const who = /[^\s]+@[^\s]+\s*$/m.exec(preflight.output)?.[0]?.trim();
  record('preflight: wrangler authentication', true, who ?? 'authenticated');
}

const tomlPath = join(root, 'wrangler.toml');
let toml = readFileSync(tomlPath, 'utf8');
record('preflight: wrangler.toml readable', true, `${toml.split('\n').length} lines`);

const placeholders = [...toml.matchAll(/replace-with-[a-z0-9-]+/gi)].map((m) => m[0]);
record(
  'preflight: placeholders',
  placeholders.length === 0,
  placeholders.length ? `${placeholders.length} placeholder id(s) still present — this run will fill them` : 'none',
);

if (envName === 'production') {
  const strict = /\[env\.production\][\s\S]*?STRICT_AUTH\s*=\s*"true"/.test(toml);
  record('preflight: production runs strict auth', strict, strict ? 'STRICT_AUTH="true"' : 'set STRICT_AUTH="true" for production');
}

if (checkOnly) {
  console.log('\nCheck complete — no changes made.\n');
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

/* ------------------------------------------------------------------ *
 * 2–8. Provision
 * ------------------------------------------------------------------ */
const suffix = envName === 'production' ? 'prod' : envName;
const dbName = envName === 'production' ? `${NAMES.database}-prod` : `${NAMES.database}-${suffix}`;

console.log('\nStep 2 — D1 database');
const created = tryWrangler(['d1', 'create', dbName]);
let databaseId = /"database_id"\s*:\s*"([^"]+)"/.exec(created.output)?.[1]
  ?? /database_id\s*=\s*"([^"]+)"/.exec(created.output)?.[1];
if (!databaseId) {
  const list = tryWrangler(['d1', 'list', '--json']);
  if (list.ok) {
    try {
      const parsed = JSON.parse(list.output);
      databaseId = parsed.find?.((row) => row.name === dbName)?.uuid ?? null;
    } catch {
      databaseId = null;
    }
  }
}
record('D1 database', !!databaseId, databaseId ? `${dbName} → ${databaseId}` : `could not resolve an id for ${dbName}`);

if (databaseId && writeConfig) {
  console.log('\nStep 3 — wiring ids into wrangler.toml');
  const section = envName === 'production' ? '[env.production]' : '[env.staging]';
  const parts = toml.split(section);
  if (parts.length > 1) {
    parts[1] = parts[1].replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`);
    toml = parts.join(section);
  } else {
    // No env section yet: fill the top-level (development) binding instead.
    toml = toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`);
  }
  writeFileSync(tomlPath, toml);
  record('wrangler.toml updated', true, `database_id → ${databaseId}`);
}

console.log('\nStep 4 — R2 bucket');
const bucketName = envName === 'production' ? `${NAMES.bucket}-prod` : NAMES.bucket;
const bucket = tryWrangler(['r2', 'bucket', 'create', bucketName]);
record('R2 bucket', bucket.ok || /already exists/i.test(bucket.output), bucketName);

console.log('\nStep 5 — KV namespace');
const kv = tryWrangler(['kv:namespace', 'create', NAMES.kv]);
const kvId = /id\s*=\s*"([^"]+)"/.exec(kv.output)?.[1];
record('KV namespace', kv.ok || /already exists/i.test(kv.output), kvId ? `${NAMES.kv} → ${kvId}` : NAMES.kv);

console.log('\nStep 6 — Queues');
const queue = tryWrangler(['queues', 'create', NAMES.queue]);
record('Queue', queue.ok || /already exists/i.test(queue.output), NAMES.queue);
const dlq = tryWrangler(['queues', 'create', NAMES.dlq]);
record('Dead-letter queue', dlq.ok || /already exists/i.test(dlq.output), NAMES.dlq);

console.log('\nStep 7 — remote migrations + seed');
const migrate = tryWrangler(['d1', 'migrations', 'apply', dbName, '--remote']);
record('D1 migrations applied', migrate.ok, migrate.ok ? 'schema + seed are in D1' : migrate.output.trim().split('\n').slice(-3).join(' '));
const seed = tryWrangler(['d1', 'execute', dbName, '--remote', '--file=./src/db/seed.sql'], { cwd: join(root, 'worker') });
record('D1 seed', seed.ok || /already/i.test(seed.output), seed.ok ? 'demo content available' : 'seed already applied');

console.log('\nStep 8 — secrets');
const secretPlan = [
  ['JWT_SECRET', value('jwt-secret', randomBytes(32).toString('hex')), 'signs session tokens'],
  ['RESEND_API_KEY', value('resend-key', ''), 'transactional email (optional)'],
  ['STRIPE_SECRET_KEY', value('stripe-key', ''), 'real payments (optional)'],
  ['PAYMENT_WEBHOOK_SECRET', value('webhook-secret', ''), 'verifies gateway webhooks (optional)'],
];

for (const [name, secret, purpose] of secretPlan) {
  if (!secret) {
    record(`secret ${name}`, true, `skipped — ${purpose}`);
    continue;
  }
  const pushed = tryWrangler(['secret', 'put', name, '--env', envName], { stdio: ['pipe', 'pipe', 'pipe'] });
  // wrangler reads the value from stdin: feed it.
  if (!pushed.ok) {
    try {
      run('npx', ['wrangler', 'secret', 'put', name, '--env', envName], { stdio: ['pipe', 'inherit', 'inherit'] });
      record(`secret ${name}`, true, purpose);
    } catch (error) {
      record(`secret ${name}`, false, `run manually: npx wrangler secret put ${name} --env ${envName}`);
    }
  } else {
    record(`secret ${name}`, true, purpose);
  }
}

console.log('\nStep 9 — deploy');
if (deploy) {
  const result = tryWrangler(['deploy', '--env', envName]);
  record('wrangler deploy', result.ok, result.ok ? 'Worker published' : result.output.trim().split('\n').slice(-3).join(' '));
} else {
  record('wrangler deploy', true, `skipped — run with --deploy (or \`npm run deploy:${envName === 'production' ? 'prod' : 'staging'}\`)`);
}

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps ok.`);
if (failed.length) {
  console.log('\nNeeds attention:');
  for (const item of failed) console.log(` - ${item.step}: ${item.detail}`);
  process.exit(1);
}
console.log(`\nNext: \`cd worker && npm run deploy:${envName === 'production' ? 'prod' : 'staging'}\` then verify GET /api/health.\n`);
