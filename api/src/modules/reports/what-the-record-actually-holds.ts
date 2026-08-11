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

  const corroborated = mine.filter((m) => theirs.some((t) => touches(m.text, t.text))).length;

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

/** The verifiability marker is machinery and must never reach a reader. */
export function cleanText(text: string): string {
  return (text ?? '').replace(VERIFIABILITY, '').trim();
}

/** The kinds G10 will weigh, as they are spelled in the database. */
export const WEIGHABLE_TYPES = [
  'SUCCESS_DEFINITION', 'COMMITMENT', 'TIMEFRAME', 'ASK', 'TOLERANCE', 'WORRY', 'TENSION',
];
