/**
 * WHETHER WHAT A WAIT IS ON IS SOMEBODY, OR A THING (request 107 b).
 *
 * The extraction writes what a person is waiting on into `onLabel`, and it is not always a person or a
 * team. Served as one, it read "You cannot move on the data structure decision until it comes from the
 * data structure decision." and "waiting on a decision on who owns them for owners with dates for the
 * API format". A label is somebody when it names a body of people ("the credit committee", "the
 * police", "the Head of Credit"), and a thing when it is the same as what is waited for, starts "a" or
 * "an", or names a thing that gets made or decided ("the data structure decision", "the pipeline fix").
 * Anything else is taken as somebody, because that is what a name is.
 */
const A_BODY_OF_PEOPLE = /\b(?:committee|team|board|office|officers?|department|dept|manager|managers|head|director|directors|provider|providers|customers?|clients?|police|bank|partners?|suppliers?|vendors?|ministry|government|lead|leads|finance|legal|hr|ops|operations|compliance|council|panel|staff|engineers?|agents?|people|landlord|regulator|auditors?|lawyers?|counsel|ceo|cfo|cto|coo|founder|founders|owner|owners|buyer|buyers|officer)\b/i;
const A_THING = /\b(?:decision|decisions|approval|sign-off|signoff|fix|answer|reply|confirmation|agreement|budget|access|data|structure|format|document|documents|report|plan|list|numbers|figures|payment|funding|release|update|information|details|clarification|review|go-ahead|spec|specification|design|contract|quote|estimate|feedback|result|results|outcome|money|cash|stock|delivery|parts?)\b/i;
const sameWords = (a: string) => a.toLowerCase().replace(/^(?:the|a|an)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** Whether two phrases name the same thing: "the data structure decision" and "data structure decision". */
export function theSameThing(x: string | null | undefined, y: string | null | undefined): boolean {
  const a = sameWords(x ?? ''); const b = sameWords(y ?? '');
  /* The label holds the whole of what is waited for. Not the other way round: "the Head of Credit's
     reply" holds "the Head of Credit", who is somebody. */
  return !!a && !!b && ` ${a} `.includes(` ${b} `);
}

export function aPartyOutside(d: { onLabel?: string | null; what?: string | null }): boolean {
  const on = (d.onLabel ?? '').trim();
  if (!on) return false;
  if (theSameThing(on, d.what)) return false;
  /* What a thing is "on" or "about" is not who it is: "a decision on who owns them" is a decision. */
  const head = on.split(/\s+(?:on|about|of|for|from|to|with|over)\s+/i)[0];
  if (A_BODY_OF_PEOPLE.test(head)) return true;
  if (/^(?:a|an)\s/i.test(on)) return false;
  return !A_THING.test(head);
}

/**
 * A WAIT ON ONESELF IS NOT A WAIT (screens request 111 e). Read by Rukia, who runs the sales board: "You are
 * waiting on themselves to approve a discount for Baraka Mwangi." The extraction wrote what she still had to
 * do herself as a wait, with "themselves" where the person waited on goes. Nobody waits on themselves: it
 * is their own thing to do, and Baraka's wait on her for the discount is already its own wait. So it is
 * never written, and one already on record is not read as a wait.
 */
const ONESELF = /^(?:themselves|themself|himself|herself|myself|yourself|yourselves|ourselves|itself|oneself|self|me|myself alone)$/i;
export function aWaitOnOneself(d: { fromParticipantId?: string | null; onParticipantId?: string | null; onLabel?: string | null }): boolean {
  if (d.onParticipantId && d.fromParticipantId && d.onParticipantId === d.fromParticipantId) return true;
  return ONESELF.test((d.onLabel ?? '').trim().replace(/[.!?]+$/, ''));
}

/**
 * A WAIT ON "THE LEAD" IS A WAIT ON THE LEAD (request 123, item 4). The extraction can write the person waited on as
 * the words the person used for them, "the lead", with nobody named. Read as it was stored, Amina read "waiting on the
 * lead" and Tobi read "Waiting on: the lead". It is the check-in's lead, so it is read as that person: "you" to
 * Amina and "Amina" to Tobi, by every sentence that already names a person waited on.
 *
 * ONLY "THE LEAD", and the words that plainly mean the person who runs this check-in. "My manager", "the boss" and "my
 * supervisor" are somebody's own manager, who may not run this check-in at all, so they stay as said (request 125).
 */
const THE_LEAD = /^(?:the|your|my|our)?\s*(?:team\s+|check-in\s+)?lead$/i;
export function aWaitOnTheLeadIsOnTheLead<T extends { onParticipantId?: string | null; onLabel?: string | null }>(rows: readonly T[], leadParticipantId: string | null | undefined): T[] {
  if (!leadParticipantId) return [...rows];
  return rows.map((d) => (!d.onParticipantId && THE_LEAD.test((d.onLabel ?? '').trim().replace(/[.!?]+$/, ''))
    ? { ...d, onParticipantId: leadParticipantId, onLabel: null }
    : d));
}

/**
 * ONE WAIT, SAID ONCE (request 123, item 5). The same person waiting on the same person for "the commercial terms for each
 * client, including pricing structures and renewal processes", "any historical data related to these aspects", "the
 * commercial terms and historical data" and "the commercial and historical data" was written as four waits, so the
 * board listed four, counted four, and gave three different counts of how long it had been open.
 *
 * Open waits by the same person on the same person (or the same outside party) are one wait where what they are
 * waiting for shares at least two words that carry meaning and at least half of the shorter one's. Each is then said in
 * the fullest words of the four, so the board groups them as it groups any wait raised again, and it is blocking if any
 * of them was. A cleared wait is left alone.
 */
const NOT_A_WORD_OF_THE_WORK = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'on', 'in', 'any', 'all', 'each', 'every', 'some', 'this', 'that', 'these', 'those', 'their', 'its', 'his', 'her', 'my', 'our', 'your', 'with', 'from', 'about', 'related', 'including', 'such', 'as', 'be', 'is', 'are', 'by', 'at', 'it', 'what', 'which', 'needed', 'need', 'needs', 'more']);
const wordsOfAWait = (t: string): Set<string> => new Set(
  t.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').split(/\s+/).filter((w) => w.length > 2 && !NOT_A_WORD_OF_THE_WORK.has(w)).map((w) => w.replace(/s$/, '')),
);
const theSameWait = (a: Set<string>, b: Set<string>): boolean => {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared >= 2 && shared / Math.min(a.size, b.size) >= 0.5;
};
export function oneWaitSaidOnce<T extends { id?: string; what?: string | null; status?: any; fromParticipantId?: string | null; onParticipantId?: string | null; onLabel?: string | null; createdAt?: Date | string | null }>(rows: readonly T[]): T[] {
  const open = (d: T) => String(d.status ?? '').toUpperCase() !== 'CLEARED';
  const key = (d: T) => `${d.fromParticipantId ?? ''}::${d.onParticipantId ?? (d.onLabel ?? '').trim().toLowerCase()}`;
  /*
   * A HOLDER THAT IS ONLY THE THING (requests 127 and 134). "Aisha Wanjiku is waiting on the pipeline for a fix for the pipeline"
   * and "... for the pipeline fix" were two waits because one had the pipeline as its holder and the other had none. A
   * holder that is not a person and whose words are all in what is waited for is the thing, not who holds it, so two waits
   * that differ only in that are the same wait.
   */
  const labelOf = (d: T) => (d.onParticipantId ? '' : (d.onLabel ?? '').trim());
  const justTheThing = (d: T) => { const l = labelOf(d); if (!l) return false; const lw = wordsOfAWait(l); const ww = wordsOfAWait(String(d.what ?? '')); return lw.size > 0 && [...lw].every((w) => ww.has(w)); };
  const holdersAgree = (a: T, b: T) => key(a) === key(b) || justTheThing(a) || justTheThing(b) || (!a.onParticipantId && !labelOf(a)) || (!b.onParticipantId && !labelOf(b));
  /* A wait that matches two groups joins them: the third phrasing is what shows the first and the second are one. */
  type Cluster = { at: number; key: string; rows: T[]; words: Set<string>[] };
  const clusters: Cluster[] = [];
  const loose: { at: number; row: T }[] = [];
  rows.forEach((d, at) => {
    if (!open(d) || !(d.what ?? '').trim()) { loose.push({ at, row: d }); return; }
    const w = wordsOfAWait(String(d.what));
    const hits = clusters.filter((c) => c.rows.some((x, i) => x.fromParticipantId === d.fromParticipantId && holdersAgree(x, d) && theSameWait(c.words[i], w)));
    if (!hits.length) { clusters.push({ at, key: key(d), rows: [d], words: [w] }); return; }
    const [first, ...rest] = hits;
    first.rows.push(d); first.words.push(w);
    for (const c of rest) { first.rows.push(...c.rows); first.words.push(...c.words); first.at = Math.min(first.at, c.at); clusters.splice(clusters.indexOf(c), 1); }
  });
  /* Every phrasing is said in the fullest words, and each row stays: how often it was raised, and since when, are counted from the rows. */
  const merged = clusters.flatMap((c) => {
    if (c.rows.length === 1) return [{ at: c.at, row: c.rows[0] }];
    const fullest = [...c.rows].sort((a, b) => String(b.what).length - String(a.what).length)[0];
    const blocking = c.rows.some((r) => String(r.status ?? '').toUpperCase() === 'BLOCKING');
    return c.rows.map((r) => ({ at: rows.indexOf(r), row: { ...r, what: fullest.what, ...(blocking ? { status: 'BLOCKING' } : {}) } as T }));
  });
  return [...loose, ...merged].sort((a, b) => a.at - b.at).map((x) => x.row);
}

/** The waits as a board reads them: none on oneself, a wait on "the lead" on the lead, and one wait said four ways as one. */
export function theWaitsAsABoardReadsThem<T extends { id?: string; what?: string | null; status?: any; fromParticipantId?: string | null; onParticipantId?: string | null; onLabel?: string | null; createdAt?: Date | string | null }>(rows: readonly T[], leadParticipantId: string | null | undefined): T[] {
  return oneWaitSaidOnce(aWaitOnTheLeadIsOnTheLead(rows.filter((d) => !aWaitOnOneself(d)), leadParticipantId).filter((d) => !aWaitOnOneself(d)));
}
