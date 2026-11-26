/**
 * WHAT IN A REPORT'S ROWS NEEDS SOMEBODY, IN CODE (change 3: the stream rules).
 *
 * The rows of every forwarded report are kept, every version (the-rows-in-a-report.ts). These rules read them and say, for each item, the few
 * things a director must not miss, each with where the row is and how long it has been so:
 *
 *   approved, not paid      the row says it was approved and nothing since says it was paid
 *   awaiting approval       the row waits on an approval (the Minister's, or anybody's), and how long it has waited
 *   colour and words        the row's colour says one thing and its words another: its colour is the one the table gives rows whose words say
 *                           something else. Nothing assumes what a colour means: each table's own rows say which colour goes with which words
 *   overdue                 something waiting past the office's overdue point, in working days
 *
 * Days are counted by code from when the row first said so, never by a model. The thresholds are the office's own, in one place
 * (`theThresholds`), with the brief's placeholders until the office says otherwise. A rule here flags; it never closes, sends or decides.
 */
import { theStateOf, whereTheRowIs, type ARowState } from './the-rows-in-a-report';

export interface TheThresholds {
  /** Days an approved row may stay unpaid, or an approval stay awaited, before it needs her. */
  approvalDays: number;
  /** Working days a waiting item may go before it is overdue. */
  overdueWorkingDays: number;
}
/** The placeholders the office has not answered yet (the brief's open inputs): fourteen days, and ten working days. */
export const PLACEHOLDER_THRESHOLDS: TheThresholds = { approvalDays: 14, overdueWorkingDays: 10 };

/** The office's thresholds: the principal's own setting where she has given one, else the placeholders. One place, read by every rule. */
export function theThresholds(preferences: any): TheThresholds {
  const t = preferences?.thresholds ?? {};
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return { approvalDays: n(t.approvalDays, PLACEHOLDER_THRESHOLDS.approvalDays), overdueWorkingDays: n(t.overdueWorkingDays, PLACEHOLDER_THRESHOLDS.overdueWorkingDays) };
}

export type AFlagKind = 'approved, not paid' | 'awaiting approval' | 'colour and words' | 'overdue';
export interface AFlag {
  rowKey: string;
  kind: AFlagKind;
  item: string;
  owner: string | null;
  /** Where the latest row is: "Refunds 2026.xlsx, sheet 2026, row 3". */
  where: string;
  /** Since when it has been so, and for how many days (working days for "overdue"). */
  since: Date;
  days: number;
  /** Past the threshold: it needs her. Under it: it is one to watch. */
  due: boolean;
  /** One plain sentence of what the record shows. */
  says: string;
}

const DAY = 86_400_000;
const lower = (s: string | null | undefined) => String(s ?? '').toLowerCase();
const APPROVED = /\bapproved\b/;
const NOT_APPROVED = /\b(?:not|un)[ -]?approved\b|\b(?:awaiting|pending)\s+approval\b/;
const PAID = /\b(?:paid|disbursed|remitted|refunded|settled)\b/;
const NOT_PAID = /\b(?:not (?:yet )?paid|unpaid|awaiting payment|pending payment|payment pending|yet to be paid)\b/;
const WAITS_ON_APPROVAL = /\b(?:awaiting|pending|waiting for|yet to (?:get|receive))\b[^.]*\b(?:approval|sign(?:ature|-off| off)|minister|ministerial)\b|\bfor (?:the )?minister'?s? approval\b/;

/** Working days from one day to the next, Monday to Friday. */
export function workingDaysBetween(from: Date, to: Date): number {
  let n = 0;
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  while (d.getTime() < end) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}

/** The versions of one item, oldest first, as the record kept them. */
type Version = { rowKey: string; item: string; owner: string | null; status: string | null; note: string | null; fill: string | null; fileName: string; tableName: string; row: number; receivedAt: Date | string };

/** Since when the latest run of versions has matched: the first version of the unbroken run at the end that passes `test`. */
function sinceWhen(versions: Version[], test: (v: Version) => boolean): Date | null {
  let since: Date | null = null;
  for (const v of versions) since = test(v) ? since ?? new Date(v.receivedAt) : null;
  return since;
}

/**
 * For each table, which colour goes with which words: the colour most rows of that state carry. A row whose colour is another state's colour,
 * and not its own state's, says one thing in colour and another in words. Two states sharing a colour say nothing either way.
 */
function coloursOfStates(rows: Version[]): Map<string, Map<ARowState, string>> {
  const out = new Map<string, Map<ARowState, string>>();
  const by = new Map<string, Map<ARowState, Map<string, number>>>();
  for (const r of rows) {
    if (!r.fill) continue;
    const table = `${r.fileName}|${r.tableName}`;
    const st = theStateOf(r.status, r.note);
    const t = by.get(table) ?? new Map(); by.set(table, t);
    const c = t.get(st) ?? new Map<string, number>(); t.set(st, c);
    c.set(r.fill, (c.get(r.fill) ?? 0) + 1);
  }
  for (const [table, states] of by) {
    const m = new Map<ARowState, string>();
    for (const [st, counts] of states) {
      const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      if (top && top[1] >= 2) m.set(st, top[0]);
    }
    out.set(table, m);
  }
  return out;
}

/** Every flag on the record now, from all the versions of every row. */
export function theFlags(rows: Version[], a: { now: Date; thresholds: TheThresholds }): AFlag[] {
  const versionsOf = new Map<string, Version[]>();
  for (const r of [...rows].sort((x, y) => new Date(x.receivedAt).getTime() - new Date(y.receivedAt).getTime() || x.row - y.row)) versionsOf.set(r.rowKey, [...(versionsOf.get(r.rowKey) ?? []), r]);
  const colours = coloursOfStates(rows);
  const flags: AFlag[] = [];
  for (const [rowKey, vs] of versionsOf) {
    const l = vs[vs.length - 1];
    const words = (v: Version) => `${lower(v.status)} ${lower(v.note)}`;
    const base = { rowKey, item: l.item, owner: l.owner, where: whereTheRowIs(l) };
    const state = theStateOf(l.status, l.note);
    if (state === 'cancelled') continue;

    const approvedUnpaid = (v: Version) => APPROVED.test(words(v)) && !NOT_APPROVED.test(words(v)) && (NOT_PAID.test(words(v)) || !PAID.test(words(v)));
    if (approvedUnpaid(l)) {
      const since = sinceWhen(vs, approvedUnpaid)!;
      const days = Math.floor((a.now.getTime() - since.getTime()) / DAY);
      flags.push({ ...base, kind: 'approved, not paid', since, days, due: days >= a.thresholds.approvalDays, says: `It was approved and the report does not show it paid, for ${days === 1 ? 'one day' : `${days} days`} now.` });
    } else if (WAITS_ON_APPROVAL.test(words(l))) {
      const since = sinceWhen(vs, (v) => WAITS_ON_APPROVAL.test(words(v)))!;
      const days = Math.floor((a.now.getTime() - since.getTime()) / DAY);
      flags.push({ ...base, kind: 'awaiting approval', since, days, due: days >= a.thresholds.approvalDays, says: `It has been waiting for approval for ${days === 1 ? 'one day' : `${days} days`}.` });
    } else if (state === 'waiting') {
      const since = sinceWhen(vs, (v) => theStateOf(v.status, v.note) === 'waiting')!;
      const days = workingDaysBetween(since, a.now);
      if (days >= a.thresholds.overdueWorkingDays) flags.push({ ...base, kind: 'overdue', since, days, due: true, says: `It has been waiting for ${days} working days with no change in the report.` });
    }

    if (l.fill) {
      const table = colours.get(`${l.fileName}|${l.tableName}`);
      const other = table?.get(state) === l.fill ? undefined : [...(table?.entries() ?? [])].find(([st, c]) => st !== state && c === l.fill);
      if (other) flags.push({ ...base, kind: 'colour and words', since: new Date(l.receivedAt), days: 0, due: true, says: `Its colour, ${l.fill}, is the colour this table gives rows that are ${STATE_SAID[other[0]]}, but its words say "${l.status || l.note || ''}".` });
    }
  }
  return flags;
}

const STATE_SAID: Record<ARowState, string> = { done: 'done', cancelled: 'cancelled', blocked: 'held up or queried', waiting: 'waiting', moving: 'in progress', open: 'open' };
