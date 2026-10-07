/**
 * ONE-OFF: WRITE THE OLD-SHAPE FIXTURE FOR RIVERBANK TRADING (user journey sweep, E1, 8 October 2026).
 *
 * Reads a few check-ins, with their answers, finished sessions, released reports and boards, from the
 * local made-up existing-client copy (gw_existing_6oct_a), gives every person a Riverbank stand-in,
 * scrambles every name, address and organisation name in every text, moves every date so the newest
 * lands yesterday, and writes api/journey/sweep/riverbank-old-shape.json. The seed (seed.ts) reads that
 * file and never touches the copy. Run again only if the choice of check-ins changes:
 *
 *   cd api && npx ts-node -T journey/sweep/export-old-shape.ts
 *
 * It reads only a database on this computer, and writes nothing to it.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { itIsADatabaseOnThisComputer, NOT_A_DATABASE_ON_THIS_COMPUTER } from '../a-database-on-this-computer';

const SOURCE = process.env.OLD_SHAPE_SOURCE ?? `postgresql://${process.env.USER}@localhost:5432/gw_existing_6oct_a?schema=public`;
if (!itIsADatabaseOnThisComputer(SOURCE)) throw new Error(NOT_A_DATABASE_ON_THIS_COMPUTER);

/** Source check-in -> the Riverbank people who stand in for the people in it, in the order the source lists them (the initiator first). */
const PICKS: { id: string; slots: string[]; label: string }[] = [
  { id: 'f69fcf24-30b7-423d-b7fb-1d03d202094e', label: 'Okr alignment', slots: ['lead', 'dov', 'pia'] },
  { id: '0dc4b9f5-45d9-4456-bb67-024c0a3bb759', label: 'Renewal push', slots: ['lead', 'dov', 'qx7', 'pia'] },
  { id: '387d4b4f-0cac-48cf-8bed-b8653f31ad98', label: 'Group revenue 2027', slots: ['lead', 'dov', 'ines'] },
  { id: 'b4430bab-ecf4-4f79-8d9a-7b5ea8b891f9', label: 'Chidi joining the ward team', slots: ['ines', 'fo4'] },
  { id: '231eb4f7-f572-403b-8a68-563aaa6282f5', label: 'Dee, performance', slots: ['ines', 'lu8'] },
  { id: 'bfb45c32-f0ed-440f-b672-bc98366d2d38', label: 'Night rota, the F2s', slots: ['ines', 'lu8'] },
  { id: '287035bd-e0a0-4da9-b7ba-88cf05824c08', label: 'The Fleet Street lease', slots: ['lead', 'bn5'] },
];
/** The names Riverbank's stand-ins have in a text. A person with no name on their sign-in is still called something in old words. */
const NAMES: Record<string, [string, string]> = {
  lead: ['Mira', 'Costa'], dov: ['Dov', 'Ellison'], pia: ['Pia', 'Lund'], ines: ['Ines', 'Barros'],
  qx7: ['Quentin', 'Xavier'], bn5: ['Bina', 'Nair'], lu8: ['Luis', 'Uribe'], fo4: ['Fola', 'Okon'],
};
const DOMAIN = 'riverbank.test';
/** Tables that are not the record of a check-in (mail and WhatsApp bookkeeping, billing, organisation-wide memory). */
const LEAVE_OUT = new Set(['billing_events', 'email_deliveries', 'ops_integration', 'organization_memories', 'usage_events', 'whatsapp_sends', 'whatsapp_threads', 'entry_drafts', 'membership_requests', 'scenario_candidates', 'role_gap_notes', 'contributor_code_redemptions', 'what_an_account_shows']);

type Row = Record<string, unknown>;

async function main() {
  const db = new PrismaClient({ datasourceUrl: SOURCE });
  const q = async (sql: string, ...args: unknown[]): Promise<Row[]> => db.$queryRawUnsafe(sql, ...args) as Promise<Row[]>;
  try {
    const cols = await q(`select table_name t, column_name c, data_type d, is_nullable n from information_schema.columns where table_schema='public'`);
    const colsOf = (t: string) => cols.filter((r) => r.t === t);
    const fkRows = await q(`select conrelid::regclass::text t, a.attname c, confrelid::regclass::text r from pg_constraint k join pg_attribute a on a.attrelid=k.conrelid and a.attnum=any(k.conkey) where k.contype='f'`);
    const fks: Record<string, Record<string, string>> = {};
    for (const f of fkRows) (fks[String(f.t).replace(/"/g, '')] ??= {})[String(f.c)] = String(f.r).replace(/"/g, '');
    const tableHas = (t: string, c: string) => colsOf(t).some((r) => r.c === c);

    const groundIds = PICKS.map((p) => p.id);
    const out: Record<string, Row[]> = {};
    const text = new Map<string, string>(); // source text -> stand-in text
    const sourceUsers = new Map<string, string>(); // source user id -> slot key
    const byGround: Record<string, Record<string, string>> = {}; // ground -> source user id -> slot key

    const grounds = await q(`select * from grounds where id = any($1::text[])`, groundIds);
    out.grounds = grounds.map((g) => ({ ...g }));
    const sourceOrgIds = [...new Set(grounds.map((g) => String(g.organization_id ?? g.organizationId)))];
    for (const o of await q(`select name from organizations where id = any($1::text[])`, sourceOrgIds)) text.set(String(o.name), 'Riverbank Trading');

    /* Participants first: they decide who stands in for whom. */
    const parts = await q(`select * from ground_participants where ground_id = any($1::text[])`, groundIds);
    const order = (p: Row) => (String(p.partyType) === 'INITIATOR' ? 0 : 1);
    for (const pick of PICKS) {
      const ps = parts.filter((p) => p.ground_id === pick.id).sort((a, b) => order(a) - order(b) || String(a.created_at).localeCompare(String(b.created_at)));
      if (ps.length > pick.slots.length) throw new Error(`${pick.label} has ${ps.length} people and only ${pick.slots.length} stand-ins.`);
      for (const [i, p] of ps.entries()) {
        const key = pick.slots[i];
        const u = p.user_id ? (await q(`select first_name f, last_name l, email e from users where id=$1`, p.user_id))[0] : undefined;
        const e = String(p.email ?? u?.e ?? '');
        if (e) text.set(e, `${key}@${DOMAIN}`);
        if (u?.f) text.set(String(u.f), NAMES[key][0]);
        if (u?.l) text.set(String(u.l), NAMES[key][1]);
        if (p.user_id) { sourceUsers.set(String(p.user_id), key); (byGround[pick.id] ??= {})[String(p.user_id)] = key; }
        (p as Row).__slot = key;
      }
    }

    const keep = (t: string) => !LEAVE_OUT.has(t) && t !== 'grounds' && t !== 'ground_participants';
    const owning = cols.filter((r) => r.c === 'ground_id' || r.c === 'participant_id' || r.c === 'check_in_id').map((r) => String(r.t));
    const tables = [...new Set(owning)].filter(keep).sort();
    out.ground_participants = parts;
    const pIds = parts.map((p) => String(p.id));
    const checkIns = await q(`select * from check_ins where ground_id = any($1::text[])`, groundIds);
    const ciIds = checkIns.map((c) => String(c.id));
    out.check_ins = checkIns;
    for (const t of tables) {
      if (t === 'check_ins') continue;
      const conds: string[] = []; const args: unknown[][] = [];
      if (tableHas(t, 'ground_id')) { conds.push(`ground_id = any($${conds.length + 1}::text[])`); args.push(groundIds); }
      if (tableHas(t, 'check_in_id')) { conds.push(`check_in_id = any($${conds.length + 1}::text[])`); args.push(ciIds); }
      if (tableHas(t, 'participant_id')) { conds.push(`participant_id = any($${conds.length + 1}::text[])`); args.push(pIds); }
      if (!conds.length) continue;
      /* A row belongs if it is tied to one of ours by every key it has, so a row of another check-in is never taken. */
      const rows = await q(`select * from "${t}" where ${conds.join(' and ')}`, ...args);
      if (rows.length) out[t] = rows;
    }

    /* Rows to text-scramble, dates to shift. */
    let newest = 0;
    const isTs = (t: string, c: string) => colsOf(t).some((r) => r.c === c && String(r.d).startsWith('timestamp'));
    for (const t of Object.keys(out)) for (const r of out[t]) for (const c of Object.keys(r)) {
      const v = r[c];
      if (isTs(t, c) && v instanceof Date) newest = Math.max(newest, v.getTime());
    }
    const exportedAt = Date.now(); const shift = exportedAt - 86_400_000 - newest;
    const keys = [...text.keys()].filter((k) => k.length > 1).sort((a, b) => b.length - a.length);
    const scramble = (s: string): string => { let x = s; for (const k of keys) x = x.split(k).join(text.get(k)!); return x; };
    const walk = (v: unknown): unknown => {
      if (typeof v === 'string') return scramble(v);
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object' && !(v instanceof Date)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
      return v;
    };
    const finished: Record<string, Row[]> = {};
    for (const t of Object.keys(out)) {
      finished[t] = out[t].map((r) => {
        const o: Row = {};
        for (const [c, v] of Object.entries(r)) {
          if (c === '__slot') continue;
          o[c] = v instanceof Date ? new Date(v.getTime() + shift).toISOString() : walk(v);
        }
        if (t === 'ground_participants') {
          const slot = String(r.__slot);
          o.email = `${slot}@${DOMAIN}`;
          o.__slot = slot;
        }
        return o;
      });
    }
    /* Keep which user stands in where, by the source user id, so the seed can swap a user column for a Riverbank user. */
    const fixture = { anchoredAt: new Date(exportedAt).toISOString(), about: 'Check-ins made before the rebuild, with their answers, finished sessions, released reports and boards, copied in shape from a made-up existing-client copy. Every name, address and organisation name is scrambled. Dates are shifted so the newest is yesterday.', shiftedByDays: Math.round(shift / 86_400_000), fks, columns: Object.fromEntries(Object.keys(finished).map((t) => [t, colsOf(t).map((r) => ({ c: r.c, d: r.d }))])), sourceUsers: Object.fromEntries(sourceUsers), sourceUsersByGround: byGround, picks: PICKS, tables: finished };
    const file = path.join(__dirname, 'riverbank-old-shape.json');
    fs.writeFileSync(file, JSON.stringify(fixture));
    console.log(`Wrote ${file}`);
    for (const t of Object.keys(finished)) console.log(`${t}: ${finished[t].length}`);
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
