/**
 * EXPORTS THE MARKETVIEW Q4 TEST CHECK-IN, READ ONLY, into journey/seed-a-marketview-q4-check-in.json.
 *
 * It starts at the check-in and its organisation, takes every row that belongs to them (following
 * the foreign keys downwards), and every row those rows point at (following them upwards, without
 * taking what else points at those). Nothing is written to the database it reads from.
 * Any column that looks like a password, token, key or other secret is written empty.
 *
 *   DATABASE_URL=postgresql://localhost/gw_pw9_1786222102 npx ts-node -T journey/export-a-marketview-q4-check-in.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const THE_CHECK_IN = '6e84ca43-31d4-4e33-bf38-91defee0543a';
const SECRET = /pass(word|wd)|token(?!_epoch)|secret|credential|api_?key|hash|salt|private_?key|otp|code_digest|signing/i;
const q = (s: string) => '"' + s.replace(/"/g, '""') + '"';

type Fk = { table: string; cols: string[]; parent: string; pcols: string[] };

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/^postgres(ql)?:\/\/[^/]*@?(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) throw new Error('Only a database on this computer can be read.');
  const db = new PrismaClient();
  const all = async (sql: string, ...a: unknown[]) => (await db.$queryRawUnsafe(sql, ...a)) as any[];

  const fks: Fk[] = (await all(`
    select c.conrelid::regclass::text t, c.confrelid::regclass::text p,
      (select array_agg(a.attname order by k.ord) from unnest(c.conkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n) cols,
      (select array_agg(a.attname order by k.ord) from unnest(c.confkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.n) pcols
    from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace`)).map((r) => ({ table: r.t.replace(/"/g, ''), parent: r.p.replace(/"/g, ''), cols: r.cols, pcols: r.pcols }));
  const cols: Record<string, { name: string; notnull: boolean }[]> = {};
  for (const r of await all(`select table_name t, column_name c, is_nullable n from information_schema.columns where table_schema='public' order by table_name, ordinal_position`))
    (cols[r.t] ??= []).push({ name: r.c, notnull: r.n === 'NO' });

  const rows: Record<string, Map<string, any>> = {};
  const owned = new Set<string>();
  const queue: { table: string; where: string; params: unknown[]; expand: boolean }[] = [];
  const keyOf = (row: any) => JSON.stringify(row);
  const take = async (table: string, where: string, params: unknown[], expand: boolean) => {
    const found = await all(`select to_jsonb(t) j from ${q(table)} t where ${where}`, ...params);
    for (const f of found) {
      const row = f.j;
      const m = (rows[table] ??= new Map());
      const k = keyOf(row);
      const wasOwned = owned.has(table + k);
      if (m.has(k) && (wasOwned || !expand)) continue;
      m.set(k, row);
      if (expand) owned.add(table + k);
      // upwards
      for (const fk of fks.filter((x) => x.table === table)) {
        const vals = fk.cols.map((c) => row[c]);
        if (vals.some((v) => v === null || v === undefined)) continue;
        queue.push({ table: fk.parent, where: fk.pcols.map((c, i) => `${q(c)} = $${i + 1}::text::${'text'}`).join(' and '), params: vals, expand: false });
      }
      // downwards
      if (expand)
        for (const fk of fks.filter((x) => x.parent === table)) {
          const vals = fk.pcols.map((c) => row[c]);
          queue.push({ table: fk.table, where: fk.cols.map((c, i) => `${q(c)}::text = $${i + 1}::text`).join(' and '), params: vals, expand: true });
        }
    }
  };
  // parents use text comparison too
  const fix = (w: string) => w.replace(/(\"[^\"]+\") = \$(\d+)::text::text/g, '$1::text = $$$2::text');
  await take('grounds', `id::text = $1::text`, [THE_CHECK_IN], true);
  const [g] = [...rows.grounds.values()];
  await take('organizations', `id::text = $1::text`, [g.organization_id], true);
  while (queue.length) {
    const n = queue.shift()!;
    await take(n.table, fix(n.where), n.params, n.expand);
  }

  const blanked: Record<string, string[]> = {};
  const out: Record<string, any[]> = {};
  for (const [t, m] of Object.entries(rows)) {
    out[t] = [...m.values()].map((r) => {
      const c = { ...r };
      for (const col of cols[t] ?? []) if (SECRET.test(col.name) && c[col.name] != null) { c[col.name] = col.notnull ? '' : null; (blanked[t] ??= []).includes(col.name) || (blanked[t] ??= []).push(col.name); }
      return c;
    });
  }
  const file = path.join(__dirname, 'seed-a-marketview-q4-check-in.json');
  fs.writeFileSync(file, JSON.stringify({ checkIn: THE_CHECK_IN, tables: out }, null, 1));
  for (const [t, r] of Object.entries(out).sort()) console.log(String(r.length).padStart(6), t);
  console.log('left empty:', JSON.stringify(blanked));
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
