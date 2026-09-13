/**
 * "THE GROUP TARGET" AND "THE GROUP NUMBER IN WRITING" ARE ONE BLOCKER, AND THE ADVICE QUOTED THE
 * STALE ONE.
 *
 * `dedupeDependencies` collapses handoffs whose text contains one another - "the finance sign-off"
 * and "finance sign-off" - and that is the right rule for what it catches. It cannot catch this,
 * and no string measure should try: "a specific request" and "the finance dependency" share not one
 * content word, and a similarity threshold loose enough to join them would also join "the budget
 * line" to "the Q3 forecast", which are two real things somebody is waiting on from one team.
 * Collapsing two genuine blockers is worse than showing one twice, because the person is then
 * coached about a thing nobody mentioned.
 *
 * So the signal is not how alike two rows are. It is whether a row says anything AT ALL.
 *
 * Read out of one live run, every one of these from the same three-person check-in:
 *
 *     "a specific request"      on finance
 *     "the finance dependency"  on finance
 *     "the finance situation"   on finance
 *     "finance"                 on finance
 *
 * None of them names a thing. Each is a placeholder the extraction produced when somebody mentioned
 * being stuck without saying on what - so a second placeholder against the same person and the same
 * owner is not a second blocker, it is the same one mentioned again.
 *
 * WHY NOT `blockerHasSubstance`. That bar exists for a different job - being blocked switches off
 * every negative read about somebody, so it asks whether a claim is worth that protection, and it
 * passes anything of three words with a named owner. All four rows above clear it. The question
 * here is narrower and has a different answer: does this row tell you what to go and do.
 *
 * IT NEVER DROPS THE ONLY THING SOMEBODY SAID. Where every row for a person and an owner is a
 * placeholder, the newest survives - they are still blocked, and the board must still say so.
 */
import { ReadDependency } from './reads';

/** How we talk ABOUT a blocker. Never the thing being waited on. */
const A_WORD_FOR_BEING_STUCK = new Set([
  'dependency', 'dependencies', 'blocker', 'blockers', 'situation', 'request', 'requests',
  'issue', 'issues', 'thing', 'things', 'item', 'items', 'matter', 'stuff', 'update', 'updates',
  'response', 'reply', 'answer', 'progress', 'help', 'input', 'support', 'work', 'side', 'end',
]);

/** Carries no meaning on its own, whatever it is attached to. */
const CARRIES_NOTHING = new Set([
  'the', 'a', 'an', 'my', 'our', 'his', 'her', 'their', 'this', 'that', 'these', 'those',
  'some', 'any', 'more', 'for', 'to', 'of', 'on', 'in', 'from', 'with', 'and', 'or',
  'specific', 'certain', 'relevant', 'outstanding', 'pending', 'other', 'further', 'overall',
  'is', 'are', 'was', 'were', 'be', 'being', 'been', 'it', 'they', 'them',
]);

const words = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

/**
 * Does this row name the thing being waited on, or only the fact of waiting?
 *
 * The owner's own words come out first, because "the finance dependency" on finance says exactly
 * what "finance" on finance says - the owner is already a column, and repeating it in the text adds
 * nothing a reader could act on.
 */
export function namesWhatIsWaitedOn(what: string, owner: string | null): boolean {
  const ownerWords = new Set(words(owner ?? ''));
  return words(what).some((w) => !ownerWords.has(w) && !CARRIES_NOTHING.has(w) && !A_WORD_FOR_BEING_STUCK.has(w));
}

/**
 * DID THEY NAME IT - THE MODEL'S ANSWER WHERE WE HAVE IT, THE WORD LISTS WHERE WE DO NOT.
 *
 * `namesWhatIsWaitedOn` above reads the text against two lists, and that is as far as reading text
 * can get: it answers "how this connects to anything" wrong, and the only repair is a longer list,
 * and then a longer one. Whether somebody named the thing they are waiting on is a reading of what
 * they SAID, so the extraction asks the model and keeps the answer on the row.
 *
 * The fallback is not a nicety. Every row written before that column existed has null in it, and
 * treating null as "they did not name it" would silently empty half the board.
 */
export function theyNamedWhatTheyAreWaitingOn(d: { what: string; onLabel?: string | null; namedTheThing?: boolean | null }): boolean {
  if (typeof d.namedTheThing === 'boolean') return d.namedTheThing;
  return namesWhatIsWaitedOn(d.what, (d.onLabel ?? null) as string | null);
}

const stamp = (d?: Date | number) => (d instanceof Date ? d.getTime() : (d ?? 0));

/**
 * Collapse the rows that name nothing into the one that does, per person and per owner.
 *
 * Runs AFTER `dedupeDependencies`, not instead of it: that one joins two descriptions of the same
 * named thing, this one joins the times somebody said they were stuck without naming it.
 */
export function oneBlockerPerThingWaitedOn<T extends ReadDependency>(deps: T[]): T[] {
  const keyOf = (d: T) => `${d.fromParticipantId}::${(d.onParticipantId ?? d.onLabel ?? '').toString().toLowerCase().trim()}`;

  const emptyByKey = new Map<string, T>();
  const out: T[] = [];
  for (const d of [...deps].sort((a, b) => stamp(a.createdAt) - stamp(b.createdAt))) {
    if (theyNamedWhatTheyAreWaitingOn(d as any)) { out.push(d); continue; }
    /* A placeholder. The newest one stands in for all of them. */
    emptyByKey.set(keyOf(d), d);
  }

  for (const [key, placeholder] of emptyByKey) {
    /*
     * Dropped only where something real is already standing against the same owner - the person is
     * blocked either way, and the row that names the thing is the one worth showing and coaching on.
     */
    if (out.some((d) => keyOf(d) === key)) continue;
    out.push(placeholder);
  }
  return out.sort((a, b) => stamp(a.createdAt) - stamp(b.createdAt));
}
