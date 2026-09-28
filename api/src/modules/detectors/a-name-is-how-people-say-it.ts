/**
 * NOBODY SAYS "THE ATLAS MARKET ENTRY STUDY". THEY SAY "ATLAS".
 *
 * Measured on a whole fictional consulting firm, 25 September 2026: eleven people, seven subjects,
 * four check-ins, twenty-eight conversations about three named projects. The contribution table
 * came out as 27 ASSIGNED rows and ZERO STATED and ZERO REFERENCED - not one turn in twenty-eight
 * conversations was matched to any piece of work.
 *
 * And then the organisation-level read told the firm this, six times over:
 *
 *   "Zainab Yusuf is listed on 4 pieces of work and has not been mentioned in any of them: Atlas
 *    market entry study, Borno agricultural value chain review..."
 *
 * She had spent the whole quarter on them and said so. `nominal_only` is a real and useful
 * detector - somebody carried on a roster who appears in nobody's account - and it fired on six of
 * seven people because the matching underneath it never matched anything.
 *
 * WHY THE STRICT RULE WAS CHOSEN, AND IT WAS NOT WRONG. Its own comment says it: "a loose match
 * here would produce dependencies nobody has, which is worse than producing none - the finding is
 * about two named objectives and being wrong about which ones is the whole error." That is correct.
 * Requiring EVERY word of the title is one way to be certain, and it is the way that never matches
 * how anybody speaks. Every downstream read - who is actually carrying what, unattached work,
 * undeclared dependencies, unowned gaps, unrecognised contributors - runs off this, so all of them
 * were computing over an empty set and reporting confidently about it.
 *
 * WHAT A NAME IS. A word an organisation CAPITALISED in the title of a piece of work, that appears
 * in exactly one title, is at least four letters, and is not one of the words every piece of
 * consulting work contains. "Atlas", "Borno", "Chad" are names. "market", "entry" and "agricultural"
 * are not, and that distinction is why capitalisation is the signal rather than rarity: the first
 * version counted any word unique to one title, which made "market" a name and would have attached
 * every sentence about market conditions to the Atlas project. Being wrong about which objective is
 * the whole error, and the strict rule existed to avoid exactly that.
 *
 * WHERE CAPITALISATION CARRIES NOTHING, IT IS IGNORED. A title in Title Case or SHOUTING has every
 * word capitalised and so tells us nothing about which of them is a name; those fall back to the
 * share rule alone, which is the conservative direction.
 *
 * A name on its own is a mention. Everything else still has to clear half the title's words AND
 * include something distinctive, so "the billing service rebuild is slipping" matches "Rebuild the
 * billing service" and a bare "billing" still does not.
 */

/** Words every piece of work in a consultancy contains, plus the verbs a title opens with. */
export const NEVER_A_NAME = new Set([
  'delivery', 'deliver', 'project', 'projects', 'client', 'clients', 'review', 'study', 'work',
  'plan', 'planning', 'report', 'reporting', 'analysis', 'data', 'quality', 'revenue', 'growth',
  'team', 'teams', 'objective', 'target', 'phase', 'stream', 'workstream', 'support', 'service',
  'services', 'programme', 'program', 'initiative', 'strategy', 'business', 'final', 'annual',
  'quarterly', 'monthly', 'weekly', 'internal', 'external', 'core',
  /* Titles usually open with one of these, and a capital there means the start of a sentence. */
  'hold', 'grow', 'build', 'rebuild', 'launch', 'improve', 'increase', 'reduce', 'complete',
  'drive', 'expand', 'maintain', 'develop', 'design', 'create', 'establish', 'secure', 'move',
  'make', 'take', 'keep', 'bring', 'close', 'open', 'start', 'finish', 'raise', 'lower',
]);

/** How much of a title may be capitalised before capitalisation stops telling us anything. */
export const TITLE_CASE_TELLS_US_NOTHING = 0.5;

export interface ASubjectTitle {
  externalId: string;
  /** The title as the organisation wrote it, capitals and all. */
  title: string;
  /** Its meaningful words, lower-cased, as the caller already computes them. */
  words: string[];
}

/** The capitalised words of a title, lower-cased - or none, where everything is capitalised. */
function capitalisedIn(title: string): Set<string> {
  const all = (title ?? '').split(/\s+/).filter(Boolean);
  const caps = all.filter((w) => /^[A-Z]/.test(w));
  if (!all.length || caps.length / all.length > TITLE_CASE_TELLS_US_NOTHING) return new Set();
  return new Set(caps.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, '')));
}

/** The words that name one subject and nothing else. */
export function namesFor(subjects: ASubjectTitle[]): Map<string, string[]> {
  const howManyTitles = new Map<string, number>();
  for (const s of subjects) {
    for (const w of new Set(s.words)) howManyTitles.set(w, (howManyTitles.get(w) ?? 0) + 1);
  }
  const out = new Map<string, string[]>();
  for (const s of subjects) {
    const caps = capitalisedIn(s.title);
    out.set(
      s.externalId,
      [...new Set(s.words)].filter((w) => w.length >= 4 && !NEVER_A_NAME.has(w) && howManyTitles.get(w) === 1 && caps.has(w)),
    );
  }
  return out;
}

/** Enough of a descriptive title to be sure which one is meant. */
export const ENOUGH_OF_A_TITLE = 0.5;

/**
 * Does this turn mention this subject?
 *
 * `flat` is the turn with its punctuation and spaces stripped, the way the caller already prepares
 * it, so "Atlas'" and "Atlas," match.
 */
export function turnMentions(
  flat: string,
  words: string[],
  names: string[],
): boolean {
  if (!words.length) return false;
  /* Every word: the original rule, kept, because when it fires it is certain. */
  if (words.every((w) => flat.includes(w))) return true;
  /* A name on its own: how people actually refer to a piece of work. */
  const nameHere = names.find((n) => flat.includes(n));
  if (nameHere) return true;
  /* Otherwise enough of the title to be sure, and something distinctive among it. */
  const hit = words.filter((w) => flat.includes(w));
  return hit.length / words.length >= ENOUGH_OF_A_TITLE && hit.some((w) => names.includes(w));
}
