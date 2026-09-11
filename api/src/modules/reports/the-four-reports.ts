import { RUN_ONLY_FIELDS } from './a-read-needs-a-run';

/**
 * THE FOUR REPORTS, NAMED ONCE.
 *
 * Eight surfaces show a report and each one decided for itself what belonged on it. That is why the
 * same content renders in up to four places, why two of those places disagree about the objective,
 * and why a read that needs several sessions could appear on a page about one. Nothing here
 * computes anything: every read named below is already built. This says which of the four things
 * each one belongs to, in one file, so the surfaces stop each having an opinion.
 *
 * TWO READERS AND TWO SCOPES, WHICH IS FOUR AND NOT EIGHT.
 *
 *   A · session   what one person said this time, private to them
 *   A · run       that person's own account across the whole thing
 *   B · session   the shared picture of one sitting
 *   B · run       the shared picture across the whole thing - which is the board
 *
 * THE SCOPE RULE IS NOT NEW AND IS NOT DUPLICATED HERE. `a-read-needs-a-run` already removes what a
 * single round cannot support, and `own-reads-only` already removes what a reader may not see. This
 * composes those two rather than restating them: a rule stated twice is a rule that will disagree
 * with itself, and these two are the ones that must not.
 *
 * WHAT THE MAP IS FOR. Every field a surface can render is placed. A field in no cell is a field
 * nobody decided about, and the spec next door fails on one - which is the whole mechanism. The map
 * is the thing that gets argued with; the assembly is arithmetic over it.
 */

export type Cell = 'A_SESSION' | 'A_RUN' | 'B_SESSION' | 'B_RUN';

export const EVERY_CELL: Cell[] = ['A_SESSION', 'A_RUN', 'B_SESSION', 'B_RUN'];

export const WHAT_EACH_CELL_IS: Record<Cell, string> = {
  A_SESSION: 'What you said this time. Private to you.',
  A_RUN: 'Your own account, across the whole thing. Private to you.',
  B_SESSION: 'The shared picture of one sitting.',
  B_RUN: 'The shared picture across the whole thing.',
};

/** Whether a cell is one person's own half. Decides the reader wall, never the scope. */
export const isYourOwn = (cell: Cell) => cell === 'A_SESSION' || cell === 'A_RUN';
/** Whether a cell reads across sessions. Decides the scope rule, never the wall. */
export const readsARun = (cell: Cell) => cell === 'A_RUN' || cell === 'B_RUN';

/**
 * WHERE EVERY FIELD BELONGS.
 *
 * One cell each. A field that genuinely belongs to two is a field that is two things - the shared
 * picture and somebody's own account of the same session are different objects with the same
 * subject - and splitting it is the work, not widening the map.
 *
 * `leadOnly` is orthogonal to the cell. A lead-only field still belongs to one of the four; it is
 * removed for other readers by `own-reads-only`, which is the only thing entitled to decide that.
 */
export interface Placed {
  cell: Cell;
  /** Removed for anybody but whoever runs the check-in. Enforced elsewhere; recorded here. */
  leadOnly?: true;
  /** Why it is where it is, where that is not obvious from the name. */
  because?: string;
}

export const WHERE_IT_BELONGS: Record<string, Placed> = {
  // ── What this is for. The objective leads every cell that has one.
  againstSuccess: { cell: 'B_SESSION', because: 'The stated objective and each condition\'s standing. The run version is the board\'s.' },
  cascade: { cell: 'B_SESSION', because: 'What the objective sits under. It qualifies the objective, so it travels with it.' },
  whereThingsStand: { cell: 'B_SESSION' },
  atAGlance: { cell: 'B_SESSION', because: 'Four reads of one sitting. The run-scope version is the board\'s own.' },

  // ── The shared picture of one sitting.
  sharedPicture: { cell: 'B_SESSION' },
  pictureLines: { cell: 'B_SESSION' },
  writtenPicture: { cell: 'B_SESSION' },
  pictureBasis: { cell: 'B_SESSION' },
  /**
   * A DIFFERENCE IS NAMED ON THE SESSION AND READ IN FULL ON THE BOARD, and that split is
   * deliberate rather than an omission.
   *
   * On the session's own report each difference arrives as a title in the still-open column: this
   * is what has not been settled. The board carries the substance - both accounts, what each rests
   * on, and what it costs if it holds - because `the-board-answers-its-own-question` moved it there
   * so the board would stop sending a reader to a second document for it.
   *
   * So the field is session-scoped and `whereThingsStand` is the block that draws it. The run-scope
   * block `whereAccountsDiffer` is the fuller read of the same thing, and the two are not
   * duplication: one says a difference exists, the other says what it is.
   */
  divergences: { cell: 'B_SESSION', because: 'Named here as a title under still-open; read in full on the board.' },
  agreements: { cell: 'B_SESSION' },
  centralQuestion: { cell: 'B_SESSION' },
  theConversationWorthHaving: { cell: 'B_SESSION' },
  whatEachPersonSaid: { cell: 'B_SESSION', because: 'Each person\'s own work, folded. Never what anybody said about anybody.' },
  counting: { cell: 'B_SESSION' },
  confidence: { cell: 'B_SESSION', because: 'How much there is to go on. A reading on the document, not on a person.' },
  restsOn: { cell: 'B_SESSION' },
  inferences: { cell: 'B_SESSION' },
  parties: { cell: 'B_SESSION' },

  // ── Lead-only, and still shared-picture rather than anybody's own half.
  concernFlags: { cell: 'B_RUN', leadOnly: true, because: 'Reads a run - see RUN_ONLY_FIELDS - and is raised with a person, never delivered to them.' },
  hiddenContributors: { cell: 'B_RUN', leadOnly: true, because: 'Reads a run. Who has been carrying work quietly is not visible in one sitting.' },
  leadershipGaps: { cell: 'B_RUN', leadOnly: true },
  probes: { cell: 'B_SESSION', leadOnly: true },
  softSpots: { cell: 'B_SESSION', leadOnly: true },

  // ── One person's own half, this session.
  myRows: { cell: 'A_SESSION', because: 'The lines taken from what they said, as rows, theirs to dispute.' },
  howClearThisWas: { cell: 'A_SESSION', because: 'Specificity is per session and sits on the session - two-reads-not-one-grade.' },
  mySoftSpots: { cell: 'A_SESSION' },
  coaching: { cell: 'A_SESSION', because: 'Written for one person about one sitting. Across a run it becomes a standing judgement.' },
  postReportGuide: { cell: 'A_SESSION' },
  correctable: { cell: 'A_SESSION' },
  whyNotCorrectable: { cell: 'A_SESSION' },
  startSelfCorrection: { cell: 'A_SESSION' },
  startClarification: { cell: 'A_SESSION' },

  // ── One person's own half, across the run.
  rounds: { cell: 'A_RUN', because: 'Their own sessions, listed once, as the thing they can act from.' },
  iHaveShownMine: { cell: 'A_RUN' },

  // ── Placed after running the map over forty real reports, which is what it is for.
  //
  // Every one of these was stored and rendered by nobody, or by one dead component. Placing them
  // does not light them up - it records the decision so the next surface that spreads the payload
  // does not get to make it by accident.
  documentBacked: { cell: 'B_SESSION', because: 'How much of the record has a document behind it. The Solid? reading.' },
  documentBackedPct: { cell: 'B_SESSION' },
  coverageBand: { cell: 'B_SESSION', because: 'The band the document-backed share and the turn counts produce together.' },
  pictureConfidence: { cell: 'B_SESSION' },
  sessionCounts: { cell: 'B_SESSION', because: 'Turns per party. Counted, never shown as a ranking.' },
  difficultyDisclosures: { cell: 'B_SESSION' },
  currentBestReading: { cell: 'B_SESSION' },
  specificityNotes: { cell: 'A_SESSION', because: 'Own row only. Specificity is per session and stays on the person it is about.' },
  specificityCauses: { cell: 'A_SESSION' },
  specificitySignal: { cell: 'A_SESSION' },
  recallNotes: { cell: 'A_SESSION', because: 'Own row only, filtered by label in own-reads-only.' },
  whatCouldBeChecked: { cell: 'A_SESSION' },
  session2Focus: { cell: 'A_SESSION', because: 'What to carry into the next one, written at the end of this one.' },
  postReportGuides: { cell: 'A_SESSION', because: 'The map is stripped for everybody; the owner gets their one guide as postReportGuide.' },
  arcSignals: { cell: 'B_RUN', leadOnly: true, because: 'Reads the whole arc, and never leaves the admin surface.' },

  // ── The shared picture across the run. This is the board.
  patterns: { cell: 'B_RUN', because: 'Two periods minimum. One observation is not a pattern.' },
  contribution: { cell: 'B_RUN', because: 'Needs several sessions before it says anything. It cannot exist in a session cell.' },
  coverage: { cell: 'B_RUN' },
  dependencies: { cell: 'B_RUN' },
  whoOwnsWhat: { cell: 'B_RUN' },
  objectives: { cell: 'B_RUN', because: 'Movement against each measure, which is a journey rather than a moment.' },
  phaseSpine: { cell: 'B_RUN' },
  checkInGrid: { cell: 'B_RUN' },
  startingState: { cell: 'B_RUN' },
  decisions: { cell: 'B_RUN' },
  release: { cell: 'B_RUN', leadOnly: true },
  everybodyHasShownTheirs: { cell: 'B_RUN' },
  showsEverybody: { cell: 'B_RUN' },
};

/** Everything that belongs to one cell, in the order the map declares it. */
export function theFieldsOf(cell: Cell, opts: { leadOnly?: boolean } = {}): string[] {
  return Object.entries(WHERE_IT_BELONGS)
    .filter(([, p]) => p.cell === cell && (opts.leadOnly === undefined || !!p.leadOnly === opts.leadOnly))
    .map(([k]) => k);
}

export function whichCell(field: string): Placed | null {
  return WHERE_IT_BELONGS[field] ?? null;
}

/**
 * WHAT A SURFACE IS, SAID AS A CROP RATHER THAN AS A LIST.
 *
 * A surface names its cell and which of that cell's fields it leaves out, with a reason. Nothing
 * names fields it wants: a surface that lists what it takes silently stops taking anything added
 * later, which is how a section ends up rendering on five pages and not the sixth.
 */
export interface Crop {
  cell: Cell;
  /** Fields of the cell this surface does not show, each with why. */
  without?: Record<string, string>;
}

export function whatThisSurfaceShows(crop: Crop, opts: { leadOnly?: boolean } = {}): string[] {
  const out = new Set(theFieldsOf(crop.cell, opts));
  for (const field of Object.keys(crop.without ?? {})) out.delete(field);
  return [...out];
}

/**
 * THE EIGHT SURFACES, AND WHICH OF THE FOUR EACH ONE IS.
 *
 * A surface names its cell and what it leaves out. Two of the eight name no cell at all, and that
 * is the decision rather than an omission - see below.
 */
export const EVERY_SURFACE: Record<string, Crop | NotAReport> = {
  endOfTheEntryChat: {
    cell: 'A_SESSION',
    without: {
      whereYouAre: 'there is no movement on a first session, and it says so rather than drawing an empty block',
      howMuchYouGaveIt: 'no second account to be solid against yet',
    },
  },
  endOfASignedInCheckIn: { cell: 'A_SESSION' },
  theSessionReportTop: { cell: 'A_SESSION' },
  theSessionReportBottom: { cell: 'B_SESSION' },
  myRecord: { cell: 'A_RUN' },
  theBoard: { cell: 'B_RUN' },
  /**
   * TWO OF THE EIGHT "REPORT SURFACES" CARRY NO REPORT, AND THAT IS CORRECT.
   *
   * The audit counted eight surfaces that show a report. Reading what they actually send: the
   * WhatsApp message carries a check-in question and a link, and the report-ready mail carries four
   * sentences about what a shared picture is, and a button. Neither holds a single read.
   *
   * I had drawn the WhatsApp one as a crop - three blocks and then the link - and that is the wrong
   * object. A notification is not a short report. It is the thing that says a report exists, and
   * the moment it starts carrying content it inherits every rule the report has and can honour
   * almost none of them: a difference between two accounts, read on a phone, in a message with no
   * way to answer it or correct it, is the single worst place that block could land.
   *
   * So they name no cell, the same as the index does, and for a related reason: an absence with no
   * name invites somebody to fill it.
   */
  overWhatsApp: {
    notAReport: true,
    because: 'a check-in question and a link. A notification is not a short report - it says one exists.',
  },
  theReportReadyEmail: {
    notAReport: true,
    because: 'says what a shared picture is and offers the way in. It carries no read, deliberately.',
  },

  /**
   * THE REPORT TAB IS AN INDEX, AND THAT IS A DECISION SOMEBODY MADE ON PURPOSE.
   *
   * It held a report body once. It was taken out, and the three things that had nowhere else to go
   * were each given a home deliberately: the private lines for the conversation ahead went to My
   * record, the inferred claims to the page that already corrects the record, and how it is put
   * together to the foot of the board. What was left is a list of the sessions, who answered each,
   * and the one door to the board.
   *
   * A redesign proposed putting the body back. It was put to Hafsah as three options - keep the
   * index, refill the tab, or drop the tab entirely - and the answer was to keep the index.
   *
   * SO IT NAMES NO CELL. It is not a fifth report and it is not a crop of one: it is how somebody
   * finds the reports, which is a job none of the four does. Recorded here rather than left as an
   * absence, because an absence is what invites the next person with a template to fill it.
   */
  theReportTab: {
    index: true,
    because: 'how somebody finds the reports, which is not one of them. Emptied deliberately; kept as an index by decision, 11 September 2026.',
  },
};

/**
 * THE TWO KINDS OF SURFACE THAT ARE NOT REPORTS.
 *
 * An INDEX is how somebody finds the reports. A NOTIFICATION is how somebody learns one exists.
 * Neither is a crop, and calling either one a thin report is how content leaks onto a surface that
 * cannot carry the rules that content comes with.
 */
export type NotAReport =
  | { index: true; because: string }
  | { notAReport: true; because: string };

export function isAnIndex(s: Crop | NotAReport): s is { index: true; because: string } {
  return 'index' in s;
}

export function isANotification(s: Crop | NotAReport): s is { notAReport: true; because: string } {
  return 'notAReport' in s;
}

export function isACrop(s: Crop | NotAReport): s is Crop {
  return !isAnIndex(s) && !isANotification(s);
}

/**
 * THE CHECK THAT KEEPS THE MAP HONEST.
 *
 * Given the keys a payload actually carries, say which are placed nowhere. The spec runs this
 * against the real payload, so a field added to a report without anybody deciding where it goes
 * fails a test rather than rendering in whichever surface happened to spread the object.
 *
 * `known` is for the handful that are not report content at all - ids, flags, the plumbing a client
 * needs - which are listed rather than pattern-matched, because a pattern is how the next unplaced
 * field slips through.
 */
export const NOT_REPORT_CONTENT = [
  'id', 'groundId', 'checkInId', 'sessionNumber', 'title', 'state', 'activated', 'allActivated',
  'released', 'releasedAt', 'takenAt', 'amendedAt', 'amendedNote', 'answered', 'stillToAnswer',
  'sessionReport', 'sections', 'items', 'get', 'saying', 'about', 'whyNoQuestion',
  'createdAt', 'updatedAt', 'promptVersionId', 'docStatus', 'note',
  /* Containers rather than content: their own keys are placed individually above. */
  'engagement', 'finalSynthesis',
];

/**
 * WHAT IS PLACED AND STILL REACHES NOBODY.
 *
 * Running the map over forty real reports found twenty-two fields nobody had placed, and most of
 * them turned out to be stored, computed every run, and rendered by nothing - or rendered only
 * inside `ReportBody`, 983 lines of a client file that no longer has a single importer.
 *
 * This list is not a to-do. It is the honest state, recorded next to the map so that "where does
 * this go" and "does anybody see it" are answered in the same place. A field leaving this list is
 * a surface gaining a section; a field joining it is a regression.
 */
export const REACHES_NO_SCREEN = [
  'concernFlags', 'hiddenContributors', 'softSpots', 'arcSignals',
  'coverageBand', 'currentBestReading', 'difficultyDisclosures', 'pictureConfidence',
  'recallNotes', 'session2Focus', 'specificityNotes',
] as const;

export function placedNowhere(keys: string[]): string[] {
  const skip = new Set<string>(NOT_REPORT_CONTENT);
  return keys.filter((k) => !skip.has(k) && !WHERE_IT_BELONGS[k]);
}

/**
 * THE ORDER A CELL IS READ IN, DECLARED ONCE.
 *
 * Eight surfaces each held their own order in their own JSX, which is why the objective appears
 * third on one page and not at all on another. These are block names rather than field names,
 * because a block can draw two fields and a reader does not care which.
 *
 * THE THREE RULES INSIDE THE ORDER, so that changing it is an argument rather than a preference:
 *
 *   What this is FOR comes before anything measured against it. Every line underneath means
 *   something different depending on what it was in service of.
 *
 *   THE SHARP PART COMES BEFORE THE PROSE. Established already for the other body in
 *   `the-sharp-part-first`: what is still open, and what everybody agrees, before the narrative.
 *
 *   THE METHOD GOES LAST AND FOLDED. A caveat above the thing it qualifies reads as a verdict.
 */
export const THE_ORDER: Record<Cell, string[]> = {
  A_SESSION: [
    'whatThisIsFor',      // the objective, your part in it, and why the number is the number
    'whereYouAre',        // your own rows only, moving / stuck / not spoken to
    'whatYouSaid',        // the extracted lines, yours to dispute
    'stillOpenForYou',    // what you are waiting on, and who is waiting on you
    'whatYouCarry',       // one thing, with a name and a date - and the private note
    'howMuchYouGaveIt',   // the bar and its five dimensions. Last, because it is the method.
  ],
  A_RUN: [
    'whatThisIsFor',
    'whereYouAreAcrossSessions',
    'yourSessions',
    'howMuchThereIsToGoOn',
  ],
  B_SESSION: [
    'whatThisSitsUnder',  // qualifies the objective, so it comes before it
    'againstWhatGoodLooksLike',
    'whereThingsStand',
    'whatPeopleSaid',
    'thePictureFromEverybody', // the prose, after the sharp part
    'notRaisedAgain',
    'theConversationWorthHaving',
    'whatThisRestsOn',    // folded, last
  ],
  B_RUN: [
    'whatThisSitsUnder',
    'againstWhatGoodLooksLike',
    'whereItStands',
    'whereAccountsDiffer',
    'whoOwnsWhatAndWhatIsInTheWay',
    'theConversationWorthHaving',
    'whatMovedBetweenSessions',
    'contributionAndCoverage',
    'whatKeepsShowingUp',
    'howThisEnds',
    'whatThisRestsOn',
  ],
};

/**
 * Blocks that may not appear on a session-scoped surface, by name.
 *
 * The field-level rule is `RUN_ONLY_FIELDS`, borrowed above. This is the same rule one level up,
 * at the block a reader actually sees: "seen across four sessions" and "what moved between
 * sessions" are run claims however they are assembled, and a session report carrying them is the
 * duplication the whole map exists to end. One session is a position; the distance between two
 * descriptions is a movement.
 */
export const RUN_BLOCKS: string[] = [
  'whatKeepsShowingUp', 'whatMovedBetweenSessions', 'contributionAndCoverage', 'howThisEnds',
];

/** The scope rule, borrowed rather than restated. A session cell may hold none of these. */
export const WHAT_A_SESSION_CELL_MAY_NOT_HOLD: readonly string[] = RUN_ONLY_FIELDS;
