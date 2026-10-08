/**
 * THE OLD SHAPE, PUT INTO RIVERBANK TRADING (user journey sweep, E1, 8 October 2026).
 *
 * Reads riverbank-old-shape.json (see export-old-shape.ts) and writes, into one organisation, the
 * check-ins an existing client had before the rebuild: their answers, finished sessions, released
 * reports and boards, in exactly the columns the product wrote then. Every id is made new, every
 * person is one of the organisation's own people, and every date is moved so the newest is yesterday.
 * No model is called.
 */
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

type Row = Record<string, unknown>;
interface Fixture {
  anchoredAt: string;
  fks: Record<string, Record<string, string>>;
  columns: Record<string, { c: string; d: string }[]>;
  sourceUsersByGround: Record<string, Record<string, string>>;
  sourceUsers: Record<string, string>;
  picks: { id: string; label: string; slots: string[] }[];
  tables: Record<string, Row[]>;
}

export interface PutIn { id: string; label: string; scenario: string; status: string; cadence: string; lead: string; participants: string[] }

export async function putTheOldShapeIn(db: PrismaClient, orgId: string, domain: string, userOf: (key: string) => string): Promise<PutIn[]> {
  const f: Fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'riverbank-old-shape.json'), 'utf8'));
  const shift = Date.now() - new Date(f.anchoredAt).getTime();
  const ids = new Map<string, Map<string, string>>();
  const idOf = (t: string, old: unknown): string | null => (old == null ? null : ids.get(t)?.get(String(old)) ?? null);
  for (const [t, rows] of Object.entries(f.tables)) {
    const m = new Map<string, string>();
    for (const r of rows) if (r.id != null) m.set(String(r.id), randomUUID());
    ids.set(t, m);
  }
  /* Tables in the order their keys need. */
  const names = Object.keys(f.tables);
  const done = new Set<string>(); const order: string[] = [];
  const visit = (t: string, seen: Set<string> = new Set()) => {
    if (done.has(t) || seen.has(t)) return;
    seen.add(t);
    for (const ref of Object.values(f.fks[t] ?? {})) if (ref !== t && names.includes(ref)) visit(ref, seen);
    done.add(t); order.push(t);
  };
  names.forEach((t) => visit(t));

  const groundOf = (t: string, r: Row): string | null => (t === 'grounds' ? String(r.id) : r.ground_id != null ? String(r.ground_id) : null);
  const leadOf = (gid: string | null) => f.picks.find((p) => p.id === gid)?.slots[0] ?? 'lead';
  /* A participant's own row says who stands in; a user column on any other row is swapped the way that ground swapped it. */
  const slotOfParticipant = new Map<string, string>();
  for (const r of f.tables.ground_participants ?? []) slotOfParticipant.set(String(r.id), String(r.__slot));

  const put: PutIn[] = [];
  for (const t of order) {
    const rows = f.tables[t];
    if (!rows.length) continue;
    const cols = f.columns[t].map((c) => c.c).filter((c) => c !== '__slot');
    const fixed = rows.map((r) => {
      const o: Row = {};
      for (const c of cols) {
        let v = r[c];
        if (c === 'id' && v != null) v = idOf(t, v);
        else if (f.fks[t]?.[c]) {
          const ref = f.fks[t][c];
          if (v == null) { /* stays empty */ }
          else if (ref === 'organizations') v = orgId;
          else if (ref === 'users') {
            const gid = groundOf(t, r);
            const key = t === 'ground_participants' ? String(r.__slot) : (gid && f.sourceUsersByGround[gid]?.[String(v)]) ?? f.sourceUsers[String(v)] ?? leadOf(gid);
            v = userOf(key);
          } else if (ids.has(ref)) v = idOf(ref, v);
          else v = null;
        }
        o[c] = v;
      }
      return o;
    });
    /* Dates: moved on by the same amount, wherever the column holds one. */
    const tsCols = f.columns[t].filter((c) => String(c.d).startsWith('timestamp')).map((c) => c.c);
    for (const o of fixed) for (const c of tsCols) if (typeof o[c] === 'string') o[c] = new Date(new Date(`${String(o[c]).replace(/Z$/, '')}Z`).getTime() + shift).toISOString().replace('Z', '');
    const list = cols.map((c) => `"${c}"`).join(', ');
    await db.$executeRawUnsafe(`INSERT INTO "${t}" (${list}) SELECT ${list} FROM jsonb_populate_recordset(NULL::"${t}", $1::jsonb)`, JSON.stringify(fixed));
  }
  for (const g of f.tables.grounds) {
    const pick = f.picks.find((p) => p.id === g.id)!;
    const mine = (f.tables.ground_participants ?? []).filter((p) => p.ground_id === g.id).map((p) => String(p.__slot));
    put.push({ id: idOf('grounds', g.id)!, label: String(g.label), scenario: String(g.scenario), status: String(g.status), cadence: String(g.cadence), lead: `${pick.slots[0]}@${domain}`, participants: mine.filter((k) => k !== pick.slots[0]).map((k) => `${k}@${domain}`) });
  }
  return put;
}
