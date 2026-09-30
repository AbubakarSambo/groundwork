/**
 * PARSING FOR TWO OF THE THREE DOORS ASK GROUNDWORK OPENS ONTO THE OLD CONTEXT PAGE'S OWN WRITES
 * (decision 50, step (b), piece 2, items 9 and 17).
 *
 * Both of these are typed directly, with no back-and-forth: the lead names the kind (or says
 * "private") and the line follows. Nothing here writes anything - see `proposeContextLine` and
 * `proposeLeadNote` in `assistant.service.ts`, which say it back and wait for a yes, the same as
 * every other write this chat makes.
 */

export type TypedContextKind = 'STRATEGY' | 'WAY_OF_WORKING' | 'DECISION' | 'UNSETTLED' | 'NOTE';

const KIND_WORDS: { pattern: RegExp; kind: TypedContextKind; label: string }[] = [
  { pattern: /^\s*strategy\s*[:\-]\s*/i, kind: 'STRATEGY', label: 'a strategy note' },
  { pattern: /^\s*way\s+of\s+working\s*[:\-]\s*/i, kind: 'WAY_OF_WORKING', label: 'a way of working' },
  { pattern: /^\s*decision\s*[:\-]\s*/i, kind: 'DECISION', label: 'a decision' },
  { pattern: /^\s*unsettled\s*[:\-]\s*/i, kind: 'UNSETTLED', label: 'something unsettled' },
  { pattern: /^\s*context\s+note\s*[:\-]\s*/i, kind: 'NOTE', label: 'a note' },
];

/** The plain word for a kind, for the sentence said back before it is saved. */
export function labelForContextKind(kind: string): string {
  return KIND_WORDS.find((k) => k.kind === kind)?.label ?? 'a line';
}

/**
 * "decision: we will drop the pilot" -> { kind: 'DECISION', text: 'we will drop the pilot' }.
 * Anchored on the whole message, so the kind word has to open it - the same shape the router's
 * `context_line` patterns already require before this is ever called.
 */
export function parseContextLine(message: string): { kind: TypedContextKind; text: string } | null {
  const raw = (message ?? '').trim();
  for (const { pattern, kind } of KIND_WORDS) {
    const m = pattern.exec(raw);
    if (m) {
      const text = raw.slice(m[0].length).trim();
      if (text) return { kind, text };
    }
  }
  return null;
}

/**
 * "private note: Dayo keeps missing the Friday call" -> { about: null, text: '...' }.
 * "private note about Dayo: keeps missing the Friday call" -> { about: 'Dayo', text: '...' }.
 * Whoever it is about is a name to be matched against the check-in's own roster - never guessed on
 * here, only carried through as the words the lead typed. See `proposeLeadNote`.
 */
export function parseLeadNote(message: string): { about: string | null; text: string } | null {
  const raw = (message ?? '').trim();
  const withAbout = /^\s*(?:private|personal)\s+note\s+about\s+(.+?)\s*[:\-]\s*(.+)$/i.exec(raw)
    ?? /^\s*note\s+(?:privately|only\s+for\s+me|just\s+for\s+me)\s+about\s+(.+?)\s*[:\-]\s*(.+)$/i.exec(raw);
  if (withAbout) {
    const about = withAbout[1].trim();
    const text = withAbout[2].trim();
    return text ? { about: about || null, text } : null;
  }
  const plain = /^\s*(?:private|personal)\s+note\s*[:\-]\s*(.+)$/i.exec(raw)
    ?? /^\s*note\s+(?:privately|only\s+for\s+me|just\s+for\s+me)\s*[:\-]?\s*(.+)$/i.exec(raw);
  if (plain) {
    const text = plain[1].trim();
    return text ? { about: null, text } : null;
  }
  return null;
}

/**
 * A CHANGE TO A LINE ALREADY ON THE RECORD (decision 50, piece 3, item 2: `changeContextLine`).
 *
 * "reword the line 'X' to 'Y'", "share the line 'X'", "make the line 'X' private", "retire the line
 * 'X'" - the quoted words are enough of the line for `manageContextLineByChat` to find it among what
 * is open on the check-in; nothing here decides which line that is, or whether it may be shared (the
 * chat's `mayBeShared` rule for a line about a person lives entirely inside `changeContextLine`
 * itself). With no quoted words at all, `fragment` comes back null and the caller lists what is open
 * instead of guessing.
 */
export function parseChangeContextLine(
  message: string,
): { action: 'reword' | 'share' | 'private' | 'retire'; fragment: string | null; newText?: string } | null {
  const raw = (message ?? '').trim();

  const reword = /\b(?:reword|change)\s+the\s+line\s+["'“](.+?)["'”]\s+to\s+["'“](.+?)["'”]/i.exec(raw);
  if (reword) return { action: 'reword', fragment: reword[1].trim(), newText: reword[2].trim() };

  const share = /\bshare\s+the\s+line\s+["'“](.+?)["'”]/i.exec(raw);
  if (share) return { action: 'share', fragment: share[1].trim() };

  /* Both word orders. Greedy on the quoted words, so an apostrophe inside them ("Rukia's plan") stays in. */
  const priv = /\bmake\s+the\s+line\s+["'“](.+)["'”]\s+private\b/i.exec(raw)
    ?? /\bmake\s+the\s+line\s+private\s*[:\-]?\s*["'“](.+)["'”]/i.exec(raw);
  if (priv) return { action: 'private', fragment: priv[1].trim() };

  const retire = /\bretire\s+the\s+line\s+["'“](.+?)["'”]/i.exec(raw);
  if (retire) return { action: 'retire', fragment: retire[1].trim() };

  /* The action is clear but nothing is quoted - the caller lists the open lines instead of guessing. */
  if (/\b(?:reword|change)\s+the\s+line\b/i.test(raw)) return { action: 'reword', fragment: null };
  if (/\bshare\s+the\s+line\b/i.test(raw)) return { action: 'share', fragment: null };
  if (/\bmake\s+the\s+line\s+private\b/i.test(raw)) return { action: 'private', fragment: null };
  if (/\bretire\s+the\s+line\b/i.test(raw)) return { action: 'retire', fragment: null };
  return null;
}
