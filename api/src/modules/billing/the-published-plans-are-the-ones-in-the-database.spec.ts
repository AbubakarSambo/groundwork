import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE PUBLISHED PLANS ARE THE ONES IN THE DATABASE (U.19). Hafsah, 27 September:
 *
 *   Starter $25 a month, up to 5 people; Small Team $90, up to 20; Growth $400, up to 100;
 *   Business $900, up to 250; Scale $1,650, up to 500.
 *
 * The plans live in `pricing_plans` (edited at Admin, System, Pricing), and every screen reads them
 * from `GET /billing/pricing`. This replays every migration that writes that table, in order, and
 * checks the table a fresh database ends with. Enterprise is kept as a row with no price, because it
 * is "Contact us", never sold through a card.
 */
const DIR = join(__dirname, '../../../prisma/migrations');

function theTableAfterEveryMigration() {
  const table: Record<string, { amountCents: number | null; memberCap: number | null }> = {};
  for (const dir of readdirSync(DIR).filter((d) => !d.endsWith('.toml')).sort()) {
    let sql: string;
    try { sql = readFileSync(join(DIR, dir, 'migration.sql'), 'utf8'); } catch { continue; }
    if (!sql.includes('pricing_plans')) continue;
    /* Comments stripped first, block and line, so a commented-out INSERT can never satisfy this. */
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
    for (const ins of sql.matchAll(/INSERT INTO "pricing_plans" \(([^)]*)\)\s*VALUES([\s\S]*?)(?:ON CONFLICT[\s\S]*?)?;/g)) {
      const cols = ins[1].split(',').map((c) => c.trim().replace(/"/g, ''));
      for (const row of ins[2].matchAll(/\(([^()]*(?:\([^()]*\))?[^()]*)\)/g)) {
        const vals = row[1].split(',').map((v) => v.trim());
        const plan = vals[cols.indexOf('plan')].replace(/'/g, '');
        const num = (c: string) => (cols.includes(c) ? (vals[cols.indexOf(c)] === 'NULL' ? null : Number(vals[cols.indexOf(c)])) : undefined);
        table[plan] = { amountCents: num('amount_cents') ?? null, memberCap: num('member_cap') ?? table[plan]?.memberCap ?? null };
      }
    }
    for (const up of sql.matchAll(/UPDATE "pricing_plans" SET ([^;]*?) WHERE "plan" = '(\w+)';/g)) {
      const plan = up[2];
      for (const set of up[1].matchAll(/"(\w+)" = (NULL|\d+)/g)) {
        const v = set[2] === 'NULL' ? null : Number(set[2]);
        if (set[1] === 'amount_cents') table[plan].amountCents = v;
        if (set[1] === 'member_cap') table[plan].memberCap = v;
      }
    }
  }
  return table;
}

describe('the plans a fresh database ends with', () => {
  it('are exactly the five published plans, and Enterprise to ask about', () => {
    expect(theTableAfterEveryMigration()).toEqual({
      STARTER: { amountCents: 2500, memberCap: 5 },
      SMALL_TEAM: { amountCents: 9000, memberCap: 20 },
      GROWTH: { amountCents: 40000, memberCap: 100 },
      BUSINESS: { amountCents: 90000, memberCap: 250 },
      SCALE: { amountCents: 165000, memberCap: 500 },
      ENTERPRISE: { amountCents: null, memberCap: null },
    });
  });
});
