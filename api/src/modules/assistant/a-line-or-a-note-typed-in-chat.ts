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
