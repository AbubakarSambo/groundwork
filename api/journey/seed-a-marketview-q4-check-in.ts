/**
 * LOADS THE MARKETVIEW Q4 TEST CHECK-IN into a database on this computer, with no model call.
 *
 * The rows are in seed-a-marketview-q4-check-in.json, exported read only from a finished check-in.
 * Passwords, tokens and keys are left empty, so nobody signs in with a password: the three people
 * sign in by emailed link.
 *
 * It accepts only a database on this computer: the host in the connection string must be exactly
 * localhost or 127.0.0.1. Anything else is refused and nothing is read or written.
 *
 * From api/, with the connection string as the argument (or in this computer's own DATABASE_URL):
 *
 *   npx ts-node -T journey/seed-a-marketview-q4-check-in.ts postgresql://localhost:5432/groundwork_dev
 *
 * The database must already have its migrations applied. Running it twice changes nothing the second time.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { itIsADatabaseOnThisComputer as theRule, NOT_A_DATABASE_ON_THIS_COMPUTER } from './a-database-on-this-computer';

/* The rule lives in a-database-on-this-computer.ts so both seeds share one. Re-exported here
   because this file's own name is what the decision and the instructions point at. */
export { itIsADatabaseOnThisComputer } from './a-database-on-this-computer';

const q = (s: string) => '"' + s.replace(/"/g, '""') + '"';

export async function loadTheSeed(url: string, file = path.join(__dirname, 'seed-a-marketview-q4-check-in.json')) {
  if (!theRule(url)) {
    throw new Error(NOT_A_DATABASE_ON_THIS_COMPUTER);
  }
  const seed = JSON.parse(fs.readFileSync(file, 'utf8')) as { checkIn: string; tables: Record<string, any[]> };
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const fks = (await db.$queryRawUnsafe(`
      select c.conrelid::regclass::text t, c.confrelid::regclass::text p
      from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace`)) as { t: string; p: string }[];
    const names = Object.keys(seed.tables);
    const parentsOf = (t: string) => fks.filter((f) => f.t.replace(/"/g, '') === t && f.p.replace(/"/g, '') !== t).map((f) => f.p.replace(/"/g, ''));
    const order: string[] = [];
    const done = new Set<string>();
    const visit = (t: string, trail: string[]) => {
      if (done.has(t) || trail.includes(t)) return;
      for (const p of parentsOf(t)) if (names.includes(p)) visit(p, [...trail, t]);
      done.add(t);
      order.push(t);
    };
    names.forEach((t) => visit(t, []));

    const [{ rolsuper }] = (await db.$queryRawUnsafe(`select rolsuper from pg_roles where rolname = current_user`)) as { rolsuper: boolean }[];
    const counts: Record<string, number> = {};
    await db.$transaction(async (tx) => {
      if (rolsuper) await tx.$executeRawUnsafe(`set local session_replication_role = replica`);
      for (const t of order) {
        const rows = seed.tables[t];
        if (!rows.length) continue;
        counts[t] = await tx.$executeRawUnsafe(
          `insert into ${q(t)} select * from json_populate_recordset(null::${q(t)}, $1::json) on conflict do nothing`,
          JSON.stringify(rows),
        );
      }
    }, { timeout: 120000 });
    return { checkIn: seed.checkIn, counts };
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  const { checkIn, counts } = await loadTheSeed(url ?? '');
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`Loaded ${total} rows. The check-in is ${checkIn}, "MarketView, Q4".`);
  console.log('Sign in by emailed link as wairimu.mvq4@example.test (leads), otieno.mvq4@example.test or naliaka.mvq4@example.test (check in).');
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
