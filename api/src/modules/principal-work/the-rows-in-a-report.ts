/**
 * THE ROWS IN A REPORT, KEPT AS THEY WERE SAID (change 2: report rows on the record).
 *
 * Weekly and monthly reports arrive as tables: a correspondence table in a Word report, a tracker sheet, a bill tracker, a table on a slide.
 * Each row is an item with its words, where it stands, who has it, and notes. Read as text, the table was gone, so the same item could not be
 * followed from one week to the next, and nothing could say how long it had been open or where in the file it sits.
 *
 * Here, in code and with no model, every table in a forwarded file (read as its cells, documents/a-file-as-cells.ts) whose headings name an
 * item and where it stands is kept row by row, every version: `report_rows`. The register (outstanding/the-outstanding-register.ts) reads them
 * as one more source, so the same rows reach "what is open", her day, her week and the year-end register, each with its file, table and row.
 *
 * Which column is which is read from the headings. What a status means is read only as far as the register's own rule needs (done is a claim,
 * never proof; nothing is closed because it was not mentioned). What a colour means is not decided here: the fill is kept for the stream's rule.
 */
import * as crypto from 'crypto';
import { rowsOf, type TheCells } from '../documents/a-file-as-cells';
import { readDate } from './the-payments-tracker';

export interface ARowRead {
  tableName: string;
  row: number;
  rowKey: string;
  item: string;
  owner: string | null;
  status: string | null;
  note: string | null;
  dueOn: Date | null;
  fill: string | null;
  fields: Record<string, string>;
}

type Column = 'ref' | 'item' | 'status' | 'note' | 'owner' | 'due';
const HEADINGS: Record<Column, RegExp> = {
  ref: /^(?:ref|reference|ref no|reference no|reference number|file no|file number|our ref|application no|application number|invoice no|invoice number|id|item no|bill no|bill number)$/,
  item: /^(?:item|items|subject|description|matter|matters|correspondence|title|bill|bill title|title of bill|project|activity|request|requests|issue|issues|details|particulars|task|letter|engagement)$/,
  status: /^(?:status|current status|stage|progress|state|position|status update)$/,
  note: /^(?:remark|remarks|note|notes|comment|comments|update|latest update|pending action|pending actions|next step|next steps|action|action required|action taken|hq communication|observation|observations)$/,
  owner: /^(?:owner|officer|responsible|responsible officer|responsible person|action by|action officer|handled by|focal person|assigned to|desk officer|lead|by whom)$/,
  due: /^(?:due|due date|deadline|target date|date due|expected date|timeline)$/,
};
const heading = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** The heading row of a table and which column is which: the first of its first ten rows that names an item and where it stands. */
function theHeadings(rows: { values: string[] }[]): { at: number; cols: Partial<Record<Column, number>> } | null {
  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const cols: Partial<Record<Column, number>> = {};
    rows[i].values.forEach((v, j) => {
      const h = heading(v);
      for (const c of Object.keys(HEADINGS) as Column[]) if (cols[c] === undefined && HEADINGS[c].test(h)) cols[c] = j;
    });
    if (cols.item !== undefined && (cols.status !== undefined || cols.note !== undefined)) return { at: i, cols };
  }
  return null;
}

/** Every row of every table in the file whose headings name an item and where it stands. A payment tracker is read by its own reader, not here. */
export function readTheRows(cells: TheCells | null): ARowRead[] {
  if (!cells) return [];
  const tables = cells.kind === 'workbook'
    ? cells.sheets.map((s) => ({ name: `sheet ${s.name}`, cells: s.cells }))
    : cells.tables.map((t) => ({ name: t.where, cells: t.cells }));
  const out: ARowRead[] = [];
  for (const t of tables) {
    const rows = rowsOf(t.cells);
    const found = theHeadings(rows);
    if (!found) continue;
    const head = rows[found.at].values;
    const at = (r: { values: string[] }, c: Column) => (found.cols[c] !== undefined ? (r.values[found.cols[c]!] ?? '').trim() : '');
    for (const r of rows.slice(found.at + 1)) {
      const item = at(r, 'item');
      if (!item) continue;
      const ref = at(r, 'ref');
      const fields: Record<string, string> = {};
      head.forEach((h, j) => { if (h.trim() && (r.values[j] ?? '').trim()) fields[h.trim()] = r.values[j].trim(); });
      const fills = r.fills.filter((f): f is string => !!f);
      const fill = fills.length ? t.cells.find((c) => c.row === r.row && c.fill === mostOf(fills))?.fillName ?? null : null;
      const due = at(r, 'due');
      out.push({
        tableName: t.name, row: r.row,
        rowKey: ref ? `ref:${words(ref)}` : `item:${words(item)}`,
        item, owner: at(r, 'owner') || null, status: at(r, 'status') || null, note: at(r, 'note') || null,
        dueOn: due ? (/^\d{4}-\d{2}-\d{2}$/.test(due) ? new Date(`${due}T00:00:00Z`) : readDate(due)) : null,
        fill, fields,
      });
    }
  }
  return out;
}
const mostOf = (xs: string[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0][0];

/**
 * Where a row says it stands, as far as the register's rule needs it. Fixed words, because whether something is said to be finished decides
 * what is shown as open: "done" is a claim the register shows as unverified, never as completed.
 */
export type ARowState = 'done' | 'cancelled' | 'blocked' | 'waiting' | 'moving' | 'open';
export function theStateOf(status: string | null, note?: string | null): ARowState {
  const s = words(status ?? '');
  const n = words(note ?? '');
  if (/\b(?:cancel|withdrawn|dropped|void|abandon)/.test(s)) return 'cancelled';
  if (/\b(?:not (?:yet )?(?:done|completed|paid|received|signed)|undone|incomplete|outstanding|unpaid)\b/.test(s)) return /\b(?:await|pending|waiting)/.test(s) ? 'waiting' : 'open';
  if (/\b(?:done|completed?|closed|resolved|concluded|settled|delivered|received|signed|paid|passed|treated|finali[sz]ed)\b/.test(s)) return 'done';
  if (/\b(?:blocked|stuck|queried|query|on hold|rejected|declined|returned)\b/.test(s)) return 'blocked';
  if (/\b(?:await|pending|waiting|yet to|no response|not responded)/.test(s) || (!s && /\b(?:await|pending|waiting|yet to|no response)/.test(n))) return 'waiting';
  if (/\b(?:in progress|ongoing|on going|under review|processing|started|underway|in view)\b/.test(s)) return 'moving';
  return 'open';
}

/** Keeps every row of every table in one forwarded file, as this version says it. A row already kept is not kept twice. Returns how many were new. */
export async function keepTheRows(prisma: any, a: { organizationId: string; principalUserId: string; materialId: string; fileName: string; receivedAt: Date; sentFrom?: string | null; cells: TheCells | null }): Promise<number> {
  const rows = readTheRows(a.cells);
  if (!rows.length || !prisma.reportRow?.createMany) return 0;
  const r = await prisma.reportRow.createMany({
    data: rows.map((x) => ({
      organizationId: a.organizationId, principalUserId: a.principalUserId, materialId: a.materialId, fileName: a.fileName, tableName: x.tableName, row: x.row,
      rowKey: x.rowKey, item: x.item, owner: x.owner, status: x.status, note: x.note, dueOn: x.dueOn, fill: x.fill, fields: x.fields, sentFrom: a.sentFrom ?? null, receivedAt: a.receivedAt,
    })),
    skipDuplicates: true,
  });
  return r?.count ?? 0;
}

/** One item, from all the versions of its row: where it was first seen, where it stands in the latest. */
export interface AnItemFromRows { rowKey: string; first: any; latest: any; states: ARowState[] }
export function itemsFromRows(rows: any[]): AnItemFromRows[] {
  const by = new Map<string, any[]>();
  for (const r of [...rows].sort((x, y) => new Date(x.receivedAt).getTime() - new Date(y.receivedAt).getTime() || x.row - y.row)) by.set(r.rowKey, [...(by.get(r.rowKey) ?? []), r]);
  return [...by.entries()].map(([rowKey, vs]) => ({ rowKey, first: vs[0], latest: vs[vs.length - 1], states: vs.map((v) => theStateOf(v.status, v.note)) }));
}

/** Where a row is, as a person reads it: "Weekly report 13 November.docx, Table 1, row 4". */
export const whereTheRowIs = (r: { fileName: string; tableName: string; row: number }): string => `${r.fileName}, ${r.tableName.replace(/^sheet /, 'sheet ')}, row ${r.row}`;

/** A stable id for a row key, short enough for a register note. */
export const rowKeyId = (rowKey: string): string => crypto.createHash('sha256').update(rowKey).digest('hex').slice(0, 24);
