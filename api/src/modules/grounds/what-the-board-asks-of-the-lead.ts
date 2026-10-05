import type { Need } from './what-needs-you';

/**
 * WHAT THE BOARD ASKS OF THE LEAD, SAID ON TODAY TOO (screens request 122, part 1).
 *
 * Rukia's Today said "Nothing needs you right now." while her board's "What needs you in this check-in" listed
 * Baraka Mwangi and Amani Wekesa waiting on her, and two commitments of hers still open. The two were read from
 * different records. Today now takes these items from the board's own `leadActions` and `decisions`, as the board
 * serves them to this reader, so the two cannot disagree. Only for a check-in this reader runs, because those are
 * written to the one who runs it ("You need to get back to Baraka Mwangi..."), and nobody else is given them.
 *
 * Each item carries `onTheBoardToo: true`. The board page draws Today's items for its own check-in above its own
 * lists, so it must leave these out, or the lead would read each one twice.
 */
export function whatTheBoardAsksOfTheLead(board: any, check: { id: string; organizationId: string; label?: string | null }): Need[] {
  if (!board || typeof board !== 'object') return [];
  const base = { groundId: check.id, organizationId: check.organizationId, ...(check.label?.trim() ? { checkInLabel: check.label.trim() } : {}), onTheBoardToo: true as const, action: { label: 'Open it', to: `/grounds/${check.id}` } };
  const said = (t: unknown): string | null => (typeof t === 'string' && t.trim() ? t.trim() : null);
  const out: Need[] = [];
  /* Each thing once, however the board lists it (request 151, E6). */
  const seen = new Set<string>();
  const isNew = (t: string) => { const k = t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); if (seen.has(k)) return false; seen.add(k); return true; };
  for (const d of Array.isArray(board.decisions) ? board.decisions : []) {
    const title = said(d?.question);
    if (!title || !isNew(title)) continue;
    out.push({ ...base, key: `board-decision-${check.id}-${out.length}`, kind: 'decide', title, detail: said(d?.why) });
  }
  for (const a of Array.isArray(board.leadActions) ? board.leadActions : []) {
    const title = said(a?.says);
    if (!title || !isNew(title)) continue;
    out.push({ ...base, key: `board-action-${check.id}-${said(a?.id) ?? out.length}`, kind: 'look', title, detail: said(a?.because) });
  }
  return out;
}
