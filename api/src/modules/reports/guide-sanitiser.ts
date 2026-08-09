/**
 * STRIP NAMES AND QUOTES AT THE READ. DO NOT ASK THE MODEL NICELY.
 *
 * The post-report guide is per-party advice built from BOTH the shared synthesis
 * and the other side's record. Its prompt has always forbidden quoting and
 * naming. On a real seven-party ground it produced, twice:
 *
 *   "I want to acknowledge Eric's consistent focus on the strategic outcome."
 *   "...Eric's consistent push to define the 'why'..."
 *
 * That is one participant being told, by name, what another participant said in
 * their private check-in. It breaks "it never says who said what about whom",
 * which is one of four load-bearing promises on the landing page, and it is not a
 * wording problem - the instruction was there and was ignored. A prompt is a
 * request, and a model that complies most of the time is worse than one that
 * never does, because it passes review and fails in production.
 *
 * This is the second time the same failure has happened. The `atStake` pass was
 * fixed by never handing the model the party labels at all - it cannot name
 * someone it was never told about - and that one has held. Here the model must
 * see the party's own record, which names colleagues, so withholding is not
 * available and the strip has to happen on the way out.
 *
 * Modelled on `board.service.ts` buildManagerAlignment(), which drops any
 * leadership gap containing a quotation or a party label rather than trusting the
 * prompt that also forbids it. Same discipline, same reason.
 *
 * DROP, NEVER REDACT. A sentence with a name cut out of it ("I want to
 * acknowledge ___'s focus") still says a specific person exists and was
 * discussed, and reads as a redaction, which is worse than silence. Losing one
 * line of advice costs nothing; leaking one name costs the reason people answer
 * honestly.
 */

/** The three fields of a post-report guide. Any of them may come back absent. */
export interface PostReportGuide {
  openingLine?: string;
  questionToCarry?: string;
  toAcknowledge?: string;
}

/**
 * Given names that are also ordinary English words.
 *
 * THIS LIST IS NOT DECORATION. Groundwork's users are largely in Nigeria and
 * Kenya, where Success, Progress, Blessing, Precious, Favour, Gift, Comfort,
 * Peace, Patience, Mercy, Faith, Hope, Charity, Grace, Joy, Wisdom, Goodluck,
 * Innocent and the weekday names are all common given names. Matching those
 * case-insensitively against a report about what success means for the quarter
 * strips every sentence in it: a real ground with a participant called Success
 * produced no guide at all under the first version, because the word appears in
 * essentially every line.
 *
 * A name in this list is matched CASE-SENSITIVELY instead. "Success has been
 * clear about the deadline" is caught; "what success means this quarter" is not.
 * The trade is a name written in lowercase by the model would slip through -
 * which is far rarer than the word appearing in ordinary prose, and the prompt
 * asks for no names at all as the first line of defence.
 */
const NAMES_THAT_ARE_ALSO_WORDS = new Set(
  [
    // Common in this product's market.
    'success', 'progress', 'blessing', 'precious', 'favour', 'favor', 'gift',
    'comfort', 'peace', 'patience', 'mercy', 'faith', 'hope', 'charity', 'grace',
    'joy', 'wisdom', 'goodluck', 'innocent', 'godwin', 'promise', 'praise',
    'sunday', 'monday', 'friday', 'saturday', 'gladness', 'goodness', 'justice',
    'prudence', 'temperance', 'silver', 'gold', 'emmanuel',
    // Common in English generally.
    'will', 'mark', 'summer', 'may', 'june', 'august', 'art', 'bill', 'rose',
    'dawn', 'sunny', 'angel', 'chase', 'drew', 'earl', 'frank', 'gene', 'hunter',
    'jack', 'king', 'lane', 'lily', 'miles', 'page', 'pearl', 'rich', 'rob',
    'sky', 'star', 'victor', 'noble', 'young', 'best', 'love', 'honour', 'honor',
  ].map((w) => w.toLowerCase()),
);

/** How a given name must be matched. */
export interface ForbiddenName {
  value: string;
  /**
   * True when the name collides with ordinary English, or is short enough that a
   * loose match would be noisy. Case-sensitive matching keeps the strip usable.
   */
  caseSensitive: boolean;
}

/**
 * Names that must never appear in a guide: every person on the ground.
 *
 * Built from the ground's own participants at generation time - never a fixed
 * list - so it is correct for whoever is actually on it.
 *
 * Includes the recipient's own name. They know who they are, but a guide that
 * addresses them in the third person reads as a dossier about them rather than
 * advice for them, and the same sentence template is what leaks the other party.
 */
export function forbiddenNames(
  parties: { firstName?: string | null; lastName?: string | null; email?: string | null }[],
): ForbiddenName[] {
  /**
   * Keyed by LOWERCASE name, holding one canonical spelling.
   *
   * The de-duplication is load-bearing, not tidiness. Names arrive from the
   * profile ("Success") and from the email local part ("success"), and an
   * earlier version kept both as separate case-sensitive entries - so the
   * lowercase one matched the ordinary word "success" exactly, and the whole
   * point of the case-sensitive rule was defeated. One entry per name, spelled
   * the way a name is written.
   */
  const byKey = new Map<string, string>();

  const add = (raw?: string | null) => {
    const n = raw?.trim();
    // A single character is an initial, not a name.
    if (!n || n.length < 2) return;
    const key = n.toLowerCase();
    const existing = byKey.get(key);
    // Prefer a spelling that starts with a capital, because that is how a name
    // appears in prose. An email-derived token gets capitalised rather than
    // stored lowercase.
    const capitalised = n[0] === n[0].toUpperCase() ? n : n[0].toUpperCase() + n.slice(1);
    if (!existing || (existing[0] !== existing[0].toUpperCase() && capitalised !== existing)) {
      byKey.set(key, capitalised);
    }
  };

  for (const p of parties) {
    add(p.firstName);
    add(p.lastName);
    // The email local part, because "eric.abbott@" yields "eric" and "abbott" -
    // which catches a surname missing from the profile.
    const local = p.email?.split('@')[0];
    if (local) for (const token of local.split(/[._\-+0-9]+/)) add(token);
  }

  return [...byKey.entries()].map(([key, value]) => ({
    value,
    // Case-sensitive for names that collide with ordinary English, and for very
    // short ones. The first version instead SKIPPED anything under three
    // characters, which left people called Jo, Ng, Li or Bo with no protection at
    // all - the failure landing hardest on the shortest names, which is not a
    // trade worth making. "\bJo\b" cannot match inside "job" or "join", so the
    // word boundary does the work.
    caseSensitive: key.length <= 3 || NAMES_THAT_ARE_ALSO_WORDS.has(key),
  }));
}

/** Escape a name for use inside a RegExp. */
function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Does this text name anyone on the ground?
 *
 * Word-boundary matched. Possessives are the exact form the leak took ("Eric's
 * focus"), and \b handles them: the boundary falls between the name and the
 * apostrophe.
 *
 * Case sensitivity is per name, decided in forbiddenNames(). Most names match
 * case-insensitively, so a model lowercasing one still gets caught. Names that
 * collide with ordinary English, and very short ones, match case-sensitively -
 * otherwise a participant called Success or Will would empty every guide.
 */
export function namesAnyone(text: string, names: ForbiddenName[]): boolean {
  return names.some((n) =>
    new RegExp(`\\b${escape(n.value)}\\b`, n.caseSensitive ? '' : 'i').test(text),
  );
}

/**
 * Does this text quote someone?
 *
 * Double quotes of any kind count, as does a single-quoted run of two or more
 * characters - which deliberately catches the model's habit of scare-quoting a
 * phrase lifted from a record ("the 'why'", "a 'stable v1'"). Those look
 * harmless and are exactly how a private form of words reaches another party.
 *
 * WORD-INTERNAL APOSTROPHES ARE NOT QUOTATION MARKS, and getting this wrong
 * costs real output. The first version borrowed the board's rule, which only
 * excuses possessive `'s`. That is fine for the board, whose text is
 * third-person report prose. A guide is first-person speech and full of
 * contractions, and on the first real run it silently dropped two perfectly
 * clean opening lines:
 *
 *   "I'm thinking about the gap ... the work we're logging"
 *
 * No quotation anywhere - the apostrophe in "I'm" opened a match that closed on
 * the one in "we're". So every apostrophe BETWEEN two word characters is
 * neutralised first: contractions and possessives alike. What remains is an
 * apostrophe at a word edge, which is what actual quoting looks like.
 *
 * The direction of that error matters. A false positive here silently deletes
 * good advice and makes the strip look expensive, which is how a safety
 * mechanism ends up being argued away.
 */
export function containsQuote(text: string): boolean {
  const withoutWordInternal = text.replace(/(\w)['’](\w)/g, '$1$2');
  return /["“”]|['‘][^'’]{2,}['’]/.test(withoutWordInternal);
}

/** Why a field was dropped, for the log. */
export type DropReason = 'names-a-party' | 'contains-a-quote';

/**
 * Remove any field that names someone or quotes them.
 *
 * Returns the surviving fields and what was dropped. A guide reduced to nothing
 * returns an empty object, and the caller must treat that as "no guide for this
 * party" rather than storing a blank one.
 */
export function sanitiseGuide(
  guide: PostReportGuide,
  names: ForbiddenName[],
): { guide: PostReportGuide; dropped: { field: keyof PostReportGuide; reason: DropReason }[] } {
  const clean: PostReportGuide = {};
  const dropped: { field: keyof PostReportGuide; reason: DropReason }[] = [];

  for (const field of ['openingLine', 'questionToCarry', 'toAcknowledge'] as const) {
    const text = guide[field]?.trim();
    if (!text) continue;

    if (namesAnyone(text, names)) {
      dropped.push({ field, reason: 'names-a-party' });
      continue;
    }
    if (containsQuote(text)) {
      dropped.push({ field, reason: 'contains-a-quote' });
      continue;
    }
    clean[field] = text;
  }

  return { guide: clean, dropped };
}
