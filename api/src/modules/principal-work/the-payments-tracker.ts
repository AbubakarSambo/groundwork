/**
 * READING A PAYMENT TRACKER (Ebele, increment 6b; plan section 12). The sheet has already been turned into text by the one reader every upload uses
 * (documents.service xlsxToText: "--- Sheet: Name ---" then the sheet as CSV). This turns that text into lines, in code: which column is which is found
 * from the headings, every amount is read into whole minor units, and a row that cannot be read is said, never guessed.
 *
 * What a row SAYS about being paid or approved is kept as what it said (`statedStatus`, `statedApproval`). It is a claim, and nothing here makes it a fact.
 */
import * as crypto from 'crypto';
import { currencyIn, readMoney, type AMoney } from './the-money';
import { rowsOf, type TheCells } from '../documents/a-file-as-cells';

export interface ATrackerLine {
  rowNumber: number;
  /** The sheet the row is on, by its own name. */
  sheet?: string | null;
  paymentKey: string;
  payee: string;
  reference: string | null;
  description: string | null;
  amount: AMoney | null;
  owner: string | null;
  dueOn: Date | null;
  statedStatus: string | null;
  statedApproval: string | null;
  evidence: string | null;
  /** The bank's own confirmation of the transfer, as the sheet gives it (a confirmation number or reference). Proof that the money went; a named document is not. */
  confirmation: string | null;
  raw: Record<string, string>;
}
export interface TheTrackerRead { lines: ATrackerLine[]; unreadable: { rowNumber: number; because: string }[]; sheet: string | null }

const HEADINGS: Record<string, RegExp> = {
  payee: /^(payee|beneficiary|vendor|supplier|paid to|pay to|name of payee|contractor|recipient)$/i,
  amount: /^(amount|sum|value|total|amount due|amount \(.+\)|payment amount|gross amount)$/i,
  currency: /^(currency|ccy|cur)$/i,
  owner: /^(owner|responsible|responsible person|handled by|assigned to|requested by|coordinator|officer|action owner|requester)$/i,
  due: /^(due|due date|pay by|payment date|deadline|date due|due on)$/i,
  approval: /^(approval|approval status|approved|approved\?|approved by|authori[sz]ed|authori[sz]ation|sign.?off)$/i,
  status: /^(status|payment status|paid|paid\?|state)$/i,
  evidence: /^(evidence|proof|proof of payment|pop|receipt|evidence ref|evidence reference|supporting document|payment proof|bank advice)$/i,
  confirmation: /^(bank confirmation|bank confirmation no|bank ref|bank reference|transfer reference|transaction reference|transaction id)$/i,
  reference: /^(ref|reference|invoice|invoice no|invoice number|invoice #|po|po number|voucher|voucher no|ref no|payment ref)$/i,
  description: /^(description|purpose|for|narration|details|item|particulars)$/i,
};

/** What each column is, by its heading. The roles a model may give: the headings above, by name. */
export const THE_ROLES = Object.keys(HEADINGS);
export type TheColumns = Record<string, number>;
/**
 * WHAT THE HEADINGS MEAN, READ BY A MODEL WHEN THERE IS ONE (Halden stress test, D11: the "Bank confirmation" column was never read, because no list held its
 * name). Given the first rows of a sheet, it says which row is the heading row and what each column is. Without a model, or with an answer that does not hold
 * a payee or a reference and an amount, the headings are read by their usual names, as before.
 */
export type AHeadingReader = (rows: string[][]) => Promise<{ row: number; columns: TheColumns } | null>;

/** A payment tracker has a payee or a reference, an amount, and at least one more of the headings above. Said before anything is stored. */
export function isAPaymentTracker(text: string | null | undefined): boolean {
  return !!findTheHeader(parseCsv(String(text ?? '')));
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = String(text ?? '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) { if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

const columnsOf = (cells: string[]): Record<string, number> => {
  const out: Record<string, number> = {};
  cells.forEach((c, i) => { const h = c.trim().replace(/\s+/g, ' '); for (const [k, re] of Object.entries(HEADINGS)) if (re.test(h) && !(k in out)) out[k] = i; });
  return out;
};

const holdsAPayment = (cols: TheColumns) => ('payee' in cols || 'reference' in cols) && 'amount' in cols && Object.keys(cols).length >= 3;

function findTheHeader(rows: string[][], read?: { row: number; columns: TheColumns } | null): { at: number; cols: Record<string, number> } | null {
  if (read && read.row >= 0 && read.row < rows.length && holdsAPayment(read.columns)) return { at: read.row, cols: read.columns };
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cols = columnsOf(rows[i]);
    if (('payee' in cols || 'reference' in cols) && 'amount' in cols && Object.keys(cols).length >= 3) return { at: i, cols };
  }
  return null;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** A date as the sheet wrote it. Day first for 05/12/2026, as the office writes it. Null when it is not a date, so nothing is guessed. */
export function readDate(raw: string | null | undefined): Date | null {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return mk(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(t);
  if (m) return mk(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})$/i.exec(t);
  if (m) { const mo = MONTHS.findIndex((x) => x.startsWith(m![2].toLowerCase().slice(0, 3))); return mo >= 0 ? mk(+m[3], mo + 1, +m[1]) : null; }
  m = /^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i.exec(t);
  if (m) { const mo = MONTHS.findIndex((x) => x.startsWith(m![1].toLowerCase().slice(0, 3))); return mo >= 0 ? mk(+m[3], mo + 1, +m[2]) : null; }
  if (/^\d{5}$/.test(t) && +t > 40000 && +t < 60000) return new Date(Date.UTC(1899, 11, 30) + +t * 86_400_000);
  return null;
}
function mk(y: number, mo: number, d: number): Date | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt : null;
}

const nothing = (s: string | null | undefined) => !s || /^\s*(?:-+|n\/?a|none|nil|tbc|tba|pending|\?+|not yet)\s*$/i.test(s);

export const normaliseStatus = (s: string | null | undefined): string | null => {
  const t = String(s ?? '').trim().toLowerCase();
  if (!t) return null;
  if (/^(?:yes|y|true)$/.test(t) || /\b(?:paid|settled|completed|done|remitted|disbursed)\b/.test(t) && !/\b(?:not|un|part)\W*paid\b/.test(t)) return 'paid';
  if (/\b(?:cancel|void|stopped)/.test(t)) return 'cancelled';
  if (/\bhold\b/.test(t)) return 'on hold';
  if (/\b(?:schedul|processing|in progress|queued|submitted)/.test(t)) return 'scheduled';
  if (/^(?:no|n|false)$/.test(t) || /\b(?:unpaid|not paid|pending|outstanding|open|due|awaiting|owing|overdue)\b/.test(t)) return 'pending';
  return t.slice(0, 40);
};
export const normaliseApproval = (s: string | null | undefined): string | null => {
  const t = String(s ?? '').trim().toLowerCase();
  if (!t) return null;
  if (/\b(?:reject|declin|refus|denied)/.test(t)) return 'rejected';
  if (/\b(?:not approved|unapproved|awaiting|pending|waiting)\b/.test(t) || /^(?:no|n|false)$/.test(t)) return 'pending';
  if (/\b(?:approved|authori[sz]ed|signed|cleared|ok)\b/.test(t) || /^(?:yes|y|true)$/.test(t)) return 'approved';
  return 'pending';
};

const stripCompany = (s: string) => s.toLowerCase().replace(/\b(?:limited|ltd|plc|inc|llc|nig|nigeria|enterprises?|company|co)\b\.?/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
export const payeeKey = (payee: string): string => stripCompany(payee);
export const referenceKey = (ref: string | null | undefined): string => String(ref ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** The one key a payment is known by: the payee and its reference, else the payee and the due date. Two rows with the same key are one payment. */
export const paymentKeyOf = (payee: string, reference: string | null, dueOn: Date | null): string => `${payeeKey(payee)}|${referenceKey(reference) || (dueOn ? dueOn.toISOString().slice(0, 10) : '')}`;

const sectionsOf = (body: string) => { const xs = body.split(/^--- Sheet: .+? ---$/m).map((x) => x.trim()).filter(Boolean); return xs.length ? xs : [body]; };

/**
 * ONE SHEET AS ROWS, EACH WITH THE ROW NUMBER THE FILE GIVES IT (Halden brief, change 1). Read from the workbook's own cells where the bytes are
 * kept (documents/a-file-as-cells.ts): Excel's row, the sheet's own name. From text only where there are no cells, where the number is the CSV
 * line, which is the sheet's row only when its used range starts at row 1.
 */
export interface ASection { sheet: string | null; rows: string[][]; rowNumbers: number[] }
function theSections(text: string | null | undefined, cells?: TheCells | null): ASection[] {
  if (cells?.kind === 'workbook' && cells.sheets.some((s) => s.cells.length)) {
    return cells.sheets.filter((s) => s.cells.length).map((s) => { const rs = rowsOf(s.cells); return { sheet: s.name, rows: rs.map((r) => r.values), rowNumbers: rs.map((r) => r.row) }; });
  }
  const body = String(text ?? '');
  const names = [...body.matchAll(/^--- Sheet: (.+?) ---$/gm)].map((m) => m[1]);
  return sectionsOf(body).map((x, i) => { const rows = parseCsv(x); return { sheet: names[i] ?? null, rows, rowNumbers: rows.map((_, j) => j + 1) }; });
}

/** The sheet, with its headings read by the model where there is one. The lines themselves are always read by the code below. */
export async function readTheTrackerReadingItsHeadings(text: string | null | undefined, readHeadings?: AHeadingReader | null, cells?: TheCells | null): Promise<TheTrackerRead> {
  if (!readHeadings) return readTheTracker(text, [], cells);
  const read = await Promise.all(theSections(text, cells).map((x) => readHeadings(x.rows.slice(0, 8)).catch(() => null)));
  return readTheTracker(text, read, cells);
}

export function readTheTracker(text: string | null | undefined, headingsRead: ({ row: number; columns: TheColumns } | null)[] = [], cells?: TheCells | null): TheTrackerRead {
  const sections = theSections(text, cells);
  const sheet = sections[0]?.sheet ?? null;
  const lines: ATrackerLine[] = [];
  const unreadable: { rowNumber: number; because: string }[] = [];
  for (const [n, section] of sections.entries()) {
    const rows = section.rows;
    const header = findTheHeader(rows, headingsRead[n]);
    if (!header) continue;
    const cell = (r: string[], k: string) => (k in header.cols ? (r[header.cols[k]] ?? '').trim() : '');
    for (let i = header.at + 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.every((c) => !c.trim())) continue;
      const rowNumber = section.rowNumbers[i] ?? i + 1;
      const payee = cell(r, 'payee') || cell(r, 'description');
      const currencyText = cell(r, 'currency');
      const amount = readMoney(cell(r, 'amount'), currencyText || null);
      if (/^(?:total|sub-?total|grand total)\b/i.test(payee)) continue;
      if (!payee) { unreadable.push({ rowNumber, because: 'it has no payee' }); continue; }
      if (!amount) { unreadable.push({ rowNumber, because: `I could not read an amount for ${payee}` }); continue; }
      const reference = cell(r, 'reference') || null;
      const dueOn = readDate(cell(r, 'due'));
      const approvalCell = cell(r, 'approval');
      const evidence = cell(r, 'evidence');
      const confirmation = cell(r, 'confirmation');
      const raw: Record<string, string> = {};
      rows[header.at].forEach((h, j) => { if (h.trim() && (r[j] ?? '').trim()) raw[h.trim()] = (r[j] ?? '').trim(); });
      lines.push({
        rowNumber, sheet: section.sheet, paymentKey: paymentKeyOf(payee, reference, dueOn), payee, reference, description: cell(r, 'description') || null, amount: { ...amount, currency: amount.currency ?? currencyIn(currencyText) },
        owner: cell(r, 'owner') || null, dueOn, statedStatus: normaliseStatus(cell(r, 'status')), statedApproval: normaliseApproval(approvalCell), evidence: nothing(evidence) ? null : evidence, confirmation: nothing(confirmation) ? null : confirmation, raw,
      });
    }
  }
  return { lines, unreadable, sheet };
}

/** One row of one file, once. The sheet is in the key only where it is known, so rows kept before sheets were read keep their keys. */
export const lineKeyOf = (fileHash: string | null, fileName: string, rowNumber: number, sheet?: string | null): string => crypto.createHash('sha256').update(`${fileHash ?? fileName}:${sheet ? `${sheet}:` : ''}${rowNumber}`).digest('hex').slice(0, 40);
