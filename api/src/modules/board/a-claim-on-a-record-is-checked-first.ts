/**
 * A RECORD WITH NOBODY'S NAME BECOMES SOMEBODY'S ONLY ONCE THE LEAD SAYS YES (decision 76, item 3).
 *
 * Request 111 (c) found two deals the lead had added on the board with nobody's name on them, and
 * a740e362 made such a record the deal of whoever next said it was theirs. Hafsah's answer: a claim
 * is checked first (decision 12), so a person saying a record is theirs is a proposal, said back to
 * the lead in a plain sentence on her board ("Amani Wekesa says the Westgate Deli deal is theirs.
 * Is it?"), and only the lead's yes sets the owner. Until then the record keeps nobody's name.
 *
 * The proposal is kept on the record's own `fields`, under a key that is never served: `plainFields`
 * serves only text values, and these are not text. So no new column, and nothing of it reaches a
 * reader except through `theClaimAsTheLeadReadsIt`.
 */

/** Who said the record is theirs, from which line, and when. */
export interface AClaim {
  participantId: string;
  sourceEntryId: string | null;
  at: string;
}

const CLAIM = '_ownerClaim';
/** People the lead has said it is not theirs, so the same claim is not put to her again. */
const NOT_THEIRS = '_notTheirs';

function asObject(fields: unknown): Record<string, unknown> {
  return fields && typeof fields === 'object' && !Array.isArray(fields) ? { ...(fields as Record<string, unknown>) } : {};
}

/** The claim waiting for the lead's answer, or null. */
export function theClaimOn(fields: unknown): AClaim | null {
  const c = asObject(fields)[CLAIM] as any;
  return c && typeof c === 'object' && typeof c.participantId === 'string'
    ? { participantId: c.participantId, sourceEntryId: typeof c.sourceEntryId === 'string' ? c.sourceEntryId : null, at: String(c.at ?? '') }
    : null;
}

function notTheirs(fields: unknown): string[] {
  const n = asObject(fields)[NOT_THEIRS];
  return Array.isArray(n) ? n.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * The fields with this person's claim on them. A claim already waiting stays as it is (the lead
 * answers one at a time), and a person the lead has already said no to is not put to her again.
 */
export function withAClaim(fields: unknown, participantId: string, sourceEntryId: string | null, at: Date): Record<string, unknown> {
  const out = asObject(fields);
  if (theClaimOn(out) || notTheirs(out).includes(participantId)) return out;
  out[CLAIM] = { participantId, sourceEntryId, at: at.toISOString() };
  return out;
}

/** The fields once the lead has answered: the claim is gone, and on a no the person is remembered. */
export function afterTheLeadsAnswer(fields: unknown, yes: boolean): Record<string, unknown> {
  const out = asObject(fields);
  const claim = theClaimOn(out);
  delete out[CLAIM];
  if (!yes && claim) out[NOT_THEIRS] = [...new Set([...notTheirs(out), claim.participantId])];
  return out;
}

/** What the record holds that is not the record's own details, kept when the lead edits its details. */
export function whatIsNotADetail(fields: unknown): Record<string, unknown> {
  const f = asObject(fields);
  return Object.fromEntries(Object.entries(f).filter(([k]) => k === CLAIM || k === NOT_THEIRS));
}

/**
 * The question as the lead reads it on her board. `who` is the person's name, or null where the lead
 * herself said it, so she reads "You said ... is yours." The record is named with its kind: "the
 * Westgate Deli deal".
 */
export function theClaimQuestion(who: string | null, record: { name: string; kind: string }): string {
  const what = `the ${record.name.trim()} ${record.kind}`;
  return who ? `${who} says ${what} is theirs. Is it?` : `You said ${what} is yours. Is it?`;
}

/** What the lead reads back once she has answered. */
export function theAnswerSaidBack(who: string | null, record: { name: string; kind: string }, yes: boolean): string {
  const what = `${record.name.trim()} ${record.kind}`;
  if (yes) return who ? `The ${what} is now ${who}'s.` : `The ${what} is now yours.`;
  return `The ${what} still has nobody's name on it.`;
}
