/**
 * WHAT CHANGED IN A DECK SINCE LAST WEEK, IN CODE (change 3, decks: "one cell changes in a twenty-slide deck: the diff names the cell, the slide,
 * the old and the new value, and the site lead's explanation is attached").
 *
 * A weekly deck repeats its tables, so what matters hides in one changed number. When a deck (or a workbook) arrives and an earlier version of the
 * same file is kept, both are read as their cells (documents/a-file-as-cells.ts) and compared here: tables are matched by their heading rows (else by
 * their place), rows by their first column, cells by their column's heading. Every value that differs is a change, with where it is and both values.
 * Code compares; no model is asked what changed.
 *
 * The changes are kept with the deck (year_end_log, "deck-changes:<file>"), put once to whoever sent it ("what is behind these changes?"), and read
 * into her weekly brief under "For information", with their answer when it comes.
 */
import { rowsOf, type TheCells, type ACell } from '../documents/a-file-as-cells';

export interface AChange {
  /** "Slide 4, table 1" or "sheet Prices". */
  where: string;
  /** The row's label (its first column) and the column's heading. */
  row: string;
  column: string;
  was: string;
  now: string;
}

interface ATableRead { where: string; key: string; head: string[]; rows: Map<string, string[]> }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
function tablesOf(cells: TheCells): ATableRead[] {
  const tables = cells.kind === 'workbook' ? cells.sheets.map((s) => ({ where: `sheet ${s.name}`, cells: s.cells })) : cells.tables.map((t) => ({ where: t.where, cells: t.cells as ACell[] }));
  return tables.map((t, i) => {
    const rs = rowsOf(t.cells);
    const head = rs[0]?.values ?? [];
    const rows = new Map<string, string[]>();
    for (const r of rs.slice(1)) { const label = (r.values[0] ?? '').trim(); if (label && !rows.has(norm(label))) rows.set(norm(label), r.values); }
    return { where: t.where, key: head.map(norm).join('|') || `#${i}`, head, rows };
  });
}

/** Every value that differs between two versions of the same file, table by table. Rows only in one version are said as added or gone. */
export function whatChanged(before: TheCells | null, after: TheCells | null): AChange[] {
  if (!before || !after) return [];
  const old = tablesOf(before);
  const used = new Set<ATableRead>();
  const out: AChange[] = [];
  tablesOf(after).forEach((t, i) => {
    const match = old.find((o) => !used.has(o) && o.key === t.key) ?? (old[i] && !used.has(old[i]) && old[i].head.length === t.head.length ? old[i] : undefined);
    if (!match) return;
    used.add(match);
    for (const [label, values] of t.rows) {
      const was = match.rows.get(label);
      const rowName = values[0].trim();
      if (!was) { out.push({ where: t.where, row: rowName, column: '', was: '', now: 'a new row' }); continue; }
      values.slice(1).forEach((v, j) => {
        const w = was[j + 1] ?? '';
        if (norm(v) !== norm(w)) out.push({ where: t.where, row: rowName, column: (t.head[j + 1] ?? `column ${j + 2}`).trim(), was: w.trim(), now: v.trim() });
      });
    }
    for (const [label, values] of match.rows) if (!t.rows.has(label)) out.push({ where: t.where, row: values[0].trim(), column: '', was: 'a row', now: 'gone' });
  });
  return out;
}

/** One change as a person reads it, in one sentence. */
export const aChangeSaid = (c: AChange): string =>
  c.now === 'a new row' ? `On ${c.where}, there is a new row, "${c.row}".`
    : c.now === 'gone' ? `On ${c.where}, the row "${c.row}" is no longer there.`
      : `On ${c.where}, ${c.column ? `the ${c.column} for ${c.row}` : c.row} was ${c.was || 'empty'} last time and is ${c.now || 'empty'} now.`;
