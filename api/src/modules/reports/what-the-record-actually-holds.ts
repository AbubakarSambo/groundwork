import { HIDDEN } from '../documents/bank-details-are-never-kept';

/**
 * THE ARITHMETIC BEHIND G10, G31 AND G34, KEPT AWAY FROM THE SERVICE.
 *
 * Three modules were built this week that take numbers nobody was producing:
 * softSpots() wants to know how much of an account anything else touches,
 * provenanceLine() wants to know how many accounts a claim rests on, and
 * whatALeaderCanWeigh() wants to know which stated standards the record ever
 * reached. Each of them is tested and none of them was consumed, which is the
 * exact shape of a bug this project has already had: computed, correct, and
 * wired to nothing.
 *
 * So this is the read. Pure functions over rows, so they can be tested against
 * real records rather than against a mock of a service.
 *
 * THE OVERLAP TEST IS DELIBERATELY CRUDE, and it is worth saying why rather than
 * pretending otherwise. Two people describing the same thing usually share the
 * nouns - a client name, a system, a date - and rarely share the verbs. So
 * "touching" is two or more shared content words. That will miss a pair who
 * describe the same event in entirely different words, and it will occasionally
 * link two unrelated entries about the same client.
 *
 * Both errors are acceptable because of what the number is FOR: it lowers
 * confidence and raises a question. A missed overlap makes the product less sure
 * than it needs to be, which is the safe direction. A false overlap makes it
 * surer, which is why the threshold is two words rather than one. What would not
 * be acceptable is using this to say somebody was contradicted - and nothing
 * here does.
 */

/** Words that appear in every account and carry no information about what it is about. */
const NOISE = new Set([
  'about', 'after', 'again', 'against', 'because', 'been', 'before', 'being',
  'between', 'both', 'could', 'doing', 'from', 'have', 'having', 'into', 'more',
  'other', 'over', 'said', 'same', 'should', 'some', 'still', 'such', 'than',
  'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'under', 'until', 'were', 'what', 'when', 'where', 'which', 'while',
  'with', 'would', 'your', 'work', 'working', 'week', 'session', 'thing',
  'things', 'something', 'anything', 'nothing', 'really', 'quite', 'just',
]);

const VERIFIABILITY = /^\[VERIFIABILITY:(\w+)\]\s*/;

/** The content words of a piece of text, for the overlap test described above. */
export function contentWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of (text ?? '').replace(VERIFIABILITY, '').toLowerCase().match(/[a-z][a-z0-9'-]{3,}/g) ?? []) {
    if (!NOISE.has(raw)) out.add(raw);
  }
  return out;
}

/** Whether two pieces of text are describing the same thing, on the crude test. */
export function touches(a: string, b: string): boolean {
  const wa = contentWords(a);
  if (wa.size < 2) return false;
  let shared = 0;
  for (const w of contentWords(b)) {
    if (wa.has(w) && ++shared >= 2) return true;
  }
  return false;
}

export interface EntryRow {
  participantId: string;
  type: string;
  text: string;
  /** Which session it came from, so a repeat can be told from a first mention. */
  sessionNumber: number;
}

/**
 * Entry types only their author can state, so corroboration is the wrong question.
 *
 * SUCCESS_DEFINITION is the target somebody was given or set for themselves.
 * TIMEFRAME is the when of it. Both are acts of communication rather than
 * descriptions of events, and asking a colleague's account to confirm one is asking
 * the wrong thing - the answer is always no, and the no reads as a weakness.
 */
export const ONLY_ONE_PERSON_CAN_SAY_IT = ['SUCCESS_DEFINITION', 'TIMEFRAME'];

export interface DocumentRow {
  participantId: string | null;
  name: string;
}

/**
 * G34's input, for one person, from the ground's rows.
 *
 * Everything here is counted about the RECORD. Nothing counts a person.
 */
export function accountShapeFor(
  participantId: string,
  entries: EntryRow[],
  documents: DocumentRow[],
  sessions: number,
) {
  const mine = entries.filter((e) => e.participantId === participantId);
  const theirs = entries.filter((e) => e.participantId !== participantId);

  /**
   * YOU CANNOT BE MARKED UNCHECKED ON A STATEMENT NOBODY ELSE COULD CHECK.
   *
   * Probed after Hafsah pointed out the same mistake three times: a lead who does
   * exactly the right thing - states the target, restates it when priorities move -
   * came back with `corroborated: 0` and a soft spot saying their whole account
   * rests on one person having described it accurately. It lowered confidence in
   * the picture BECAUSE they had done their job.
   *
   * A target is uncorroborable by design. The lead is the only possible source for
   * what the lead asked of somebody, which is what makes it a target rather than a
   * shared observation - so it must not sit in the denominator of a corroboration
   * test. What CAN be corroborated is a description of what happened, and that is
   * what the test is for.
   */
  const corroborable = mine.filter((m) => !ONLY_ONE_PERSON_CAN_SAY_IT.includes(m.type));
  const corroborated = corroborable.filter((m) => theirs.some((t) => touches(m.text, t.text))).length;

  // A specific is something the engine already scored as checkable. Reusing that
  // read rather than inventing a second one, because two definitions of
  // "specific" in one codebase is how the last specificity bug happened.
  const specifics = mine.filter((m) => /^\[VERIFIABILITY:(HIGH|MEDIUM)\]/.test(m.text));
  const repeatedSpecifics = specifics.filter((m) =>
    specifics.some((other) => other !== m && other.sessionNumber < m.sessionNumber && touches(m.text, other.text)),
  ).length;

  const myDocs = documents.filter((d) => d.participantId === participantId);
  const allText = entries.map((e) => e.text.toLowerCase()).join(' ');
  const documentsReferredTo = myDocs.filter((d) => {
    /**
     * The file name without its extension, split on the punctuation file names
     * use and prose does not.
     *
     * My first version passed the stem straight to contentWords, whose token
     * pattern keeps hyphens - so "meridian-handover-plan.pdf" stayed one word and
     * no account would ever contain it. Every attached document read as unused,
     * which is a soft spot fired at everybody: the fastest way to have a real
     * signal ignored.
     */
    const stem = d.name.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[-_.]+/g, ' ');
    const words = [...contentWords(stem)];
    return words.length > 0 && words.some((w) => allText.includes(w));
  }).length;

  return {
    sessions,
    corroborated,
    /**
     * How many of their statements anybody COULD have touched. Carried out of here
     * so softSpots can tell "nobody corroborated a corroborable account" from
     * "this person only stated targets", which are opposite situations that a bare
     * zero cannot distinguish.
     */
    corroborable: corroborable.length,
    specifics: specifics.length,
    repeatedSpecifics,
    documents: myDocs.length,
    documentsReferredTo,
  };
}

/**
 * G31's input for one claim: how many separate accounts touch it, whether
 * anything else supports it, and where it was first said.
 *
 * "Contradicted" is deliberately NOT computed here. Text overlap can tell you two
 * people are talking about the same thing; it cannot tell you they disagree, and
 * a guess in that direction is an accusation. It stays false unless the synthesis,
 * which reads meaning, says otherwise.
 */
export function provenanceFor(claim: string, entries: EntryRow[]) {
  const touching = entries.filter((e) => touches(claim, e.text));
  const accounts = new Set(touching.map((e) => e.participantId)).size;
  const firstSeenSession = touching.length
    ? Math.min(...touching.map((e) => e.sessionNumber))
    : undefined;
  return {
    accounts: Math.max(accounts, 1),
    // Supported means something else in the record touches it beyond the one
    // entry that IS it.
    supported: touching.length > 1,
    contradicted: false,
    firstSeenSession,
  };
}

/**
 * G10's input: the lead's own stated standards, and which of them the record ever
 * reached.
 *
 * The untouched ones are the whole value of the section, so the test is applied in
 * the direction that keeps them honest: a standard counts as reached only if
 * somebody ELSE'S entry touches it, or one of the lead's own from a later session.
 * The entry that states the standard cannot be the evidence for it.
 */
export function standardsAndWhatTouchedThem(
  leadParticipantId: string,
  entries: EntryRow[],
): { statedStandards: { text: string; session: number }[]; standardsTouched: string[] } {
  const standards = entries.filter(
    (e) => e.participantId === leadParticipantId && e.type === 'SUCCESS_DEFINITION',
  );

  const touched: string[] = [];
  for (const s of standards) {
    const reached = entries.some(
      (e) =>
        e !== s &&
        (e.participantId !== leadParticipantId || e.sessionNumber > s.sessionNumber) &&
        touches(s.text, e.text),
    );
    if (reached) touched.push(cleanText(s.text));
  }

  return {
    statedStandards: standards.map((s) => ({ text: cleanText(s.text), session: s.sessionNumber })),
    standardsTouched: touched,
  };
}

/**
 * THE MARKERS ARE MACHINERY AND MUST NEVER REACH A READER.
 *
 * `[VERIFIABILITY:HIGH]` was the one this was written for. Running a real check-in end to end
 * turned up a second: an entry in the Risks band read
 *
 *   "I have said it to Nadia but I have not told Tunde or Priya that hiring goes through her now.
 *    [INFERRED: Nadia is being asked to enforce a rule Tunde and Priya do not know exists]"
 *
 * on the shared report both people read. The extraction marks an inference so the record can tell
 * what somebody SAID from what was worked out about it - which is exactly the distinction this
 * product exists to keep - and then the marker was printed at the reader as though it were part of
 * their own sentence.
 *
 * Matched as a family rather than one by one: `[WORD:` or `[WORD ...]` in shouting caps at the end
 * of an entry is machinery in every case, and the next marker somebody adds will be caught by the
 * same rule instead of shipping to a reader and being found the same way.
 */
const A_MACHINE_MARKER = /\s*\[[A-Z][A-Z_]{2,}(?::|\s)[^\]]*\]/g;

/**
 * AND THE EXTRACTION'S OWN EDITORIAL ADDITIONS, WHICH ARE NOT MACHINERY BUT ARE NOT THEIRS EITHER.
 *
 * Extraction sometimes finishes somebody's sentence for them inside square brackets, so the record
 * holds words they did not say:
 *
 *   "Nobody has said [what I am supposed to have learned by when]"
 *   "Hit eight [deals]"
 *
 * Helpful in intent and wrong in a product whose entire claim is that it holds what people
 * actually said. The bracket goes and the sentence stays as they left it - a little blunter, and
 * theirs. Where the insertion is the whole entry there is nothing of theirs to keep, so it is left
 * alone rather than emptied.
 *
 * Lower-case or mixed-case inside the brackets, deliberately: the SHOUTING form above is machinery
 * and already handled, and telling them apart is what stops this eating "[Q3]" or "[draft]".
 */
/* Never the product's own "[account number hidden]": that is what stands where they typed a bank or
   card number (decision 35), and a quote of the line has to say a number was hidden. */
const A_HIDDEN_NUMBER = Object.values(HIDDEN).map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const AN_EDITORIAL_INSERTION = new RegExp(`\\s*(?!${A_HIDDEN_NUMBER})\\[(?=[^\\]]*[a-z])[^\\]]{6,}\\]`, 'g');
/* And a one-word insertion - "not [given] a specific date" (a participant's report, 20 Sep 2026) - is
   too short for the rule above, so the brackets come off and the word stays: it reads as theirs either
   way, and "not a specific date" is the worse sentence. */
const A_ONE_WORD_INSERTION = /\[(given|said|done|sent|made|told|asked|agreed|set|the|a|an|to|of|it|them|him|her|that|this|these|those|by|from|with|on|in|for|is|was|are|were|has|have|had|be|been|not|no|yet|still|and|or|but|so|then|now|there|here|they|we|i|you|he|she|my|our|their|its|his)\]/gi;

export function cleanText(text: string): string {
  const withoutMarkers = (text ?? '').replace(VERIFIABILITY, '').replace(A_MACHINE_MARKER, '');
  const withoutEditorial = withoutMarkers.replace(AN_EDITORIAL_INSERTION, '').replace(A_ONE_WORD_INSERTION, '$1');
  /* Never hand back nothing: an entry that was ONLY an insertion keeps its original text, because
     an empty line on a report is worse than a clumsy one. */
  return (withoutEditorial.trim() || withoutMarkers.trim());
}

/** The kinds G10 will weigh, as they are spelled in the database. */
export const WEIGHABLE_TYPES = [
  'SUCCESS_DEFINITION', 'PROGRESS', 'COMMITMENT', 'TIMEFRAME', 'ASK', 'TOLERANCE', 'WORRY', 'TENSION',
];
