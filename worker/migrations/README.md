# D1 migrations

Generated from `src/db/schema.sql` and `src/db/seed.sql` by `npm run db:build`.

Apply locally:  `npm run db:migrate:local`
Apply to prod:  `npm run db:migrate:remote`

Both the runtime bootstrap in `src/lib/db.ts` and these files share the same SQL,
so a fresh worker instance self-heals an empty database automatically.
