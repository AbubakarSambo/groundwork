import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * HAFSAH, 14 OCTOBER: EVERY ORGANISATION ALREADY SIGNED UP GETS ONE FREE MONTH, WHATSAPP INCLUDED (migration 98).
 * Checked on a fresh seeded database (gw_sweep_fix6): only the one organisation on the free tier was given the month
 * (Groundwork staff, Starter, to 14 November); the four paying ones and Fieldnote Studio, mid-trial, were untouched; a
 * second run gave nothing. These hold the rules the SQL must keep.
 */
const DIR = join(__dirname, '..', '..', '..', 'prisma', 'migrations');
const name = readdirSync(DIR).find((d) => d.endsWith('_a_free_month_for_every_organisation_already_here'));
const SQL = name ? readFileSync(join(DIR, name, 'migration.sql'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '') : '';

describe('migration 98: a free month for every organisation already here', () => {
  it('exists, adds only its marker column, and deletes or drops nothing', () => {
    expect(name).toBeTruthy();
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS "free_month_of_release_at"/);
    expect(SQL).not.toMatch(/\b(DROP|DELETE|TRUNCATE)\b/i);
  });
  it('a paying organisation, one with a free run still going, and one already given it are not touched', () => {
    expect(SQL).toMatch(/NOT \(o\."subscription_plan" IS NOT NULL AND o\."subscription_status" = 'active'\)/);
    expect(SQL).toMatch(/\(o\."free_until" IS NULL OR o\."free_until" <= now\(\)\)/);
    expect(SQL).toMatch(/o\."free_month_of_release_at" IS NULL/);
  });
  it('one month from when it runs, on the plan that holds its people, WhatsApp included, and never shortened', () => {
    expect(SQL).toMatch(/"free_until" = now\(\) \+ interval '1 month'/);
    expect(SQL).toMatch(/p\."member_cap" IS NULL OR p\."member_cap" >= GREATEST\(s\."people", 1\)/);
    expect(SQL).toMatch(/"whatsapp_free_until" = GREATEST\(COALESCE\(o\."whatsapp_free_until", now\(\)\), now\(\) \+ interval '1 month'\)/);
  });
});
