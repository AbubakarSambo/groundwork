/**
 * THE SWITCHBOARD: THE PROTOTYPE'S OWN TABLE OF WHICH SECTIONS EACH SITUATION TURNS ON.
 *
 * docs/prototype/screens/B1-starting-a-check-in/switchboard.txt and .jpg picture one table: 24
 * situations, grouped under 5 headings, against a header row of 30 named sections ("Targets",
 * "Work plan", "Deal grid", "Forecast", "Starting agreement", ... "Questions for the lead"), each
 * cell either on (a filled square), optional (a hollow square) or off by design (a cross).
 *
 * WHAT THIS FILE CARRIES, AND WHAT IT DOES NOT.
 *
 * The five scenario groups and the 24 situations under them, and the legend for the example
 * scenario the prototype has open ("Help someone get back on track": Switched on, Optional, Off by
 * design) are plain text in switchboard.txt and are transcribed here exactly, with a test that
 * checks the transcription against that file.
 *
 * THE FULL 24-BY-30 GRID IS NOT TRANSCRIBED HERE. switchboard.jpg is the only record of which
 * square is filled, hollow or crossed for every one of the other 23 situations, and at the
 * resolution this session could read it, a filled, hollow and crossed square are not reliably
 * distinguishable cell by cell. Copying guessed values into a table the board actually renders from
 * would be worse than leaving it undone: a wrong "on" silently shows a lead a section their
 * situation was never meant to have, and a wrong "off" silently hides one they need. This is called
 * out in the morning report and in Needs Hafsah rather than guessed at.
 *
 * THE SECTION NAMES DO NOT MATCH THE BACKEND'S. The prototype's header row has 30 named sections;
 * `BoardSection` in client/src/api/board.ts (mirroring api/src/modules/board/board-families.ts) has
 * 16. `PROTOTYPE_SECTION_TO_BOARD_SECTION` below maps every prototype name this pass could match
 * with reasonable confidence to the served section that already carries that data, and leaves the
 * rest `null` with a one-line reason - these are the purple, scenario-specific sections
 * ("Blocker check", "Where the time went", "Requirements review", "Behaviour to result", "The
 * other side", "Evidence index", "Dependency ledger", "Commitment threads", "Pattern history",
 * "Contradictions", "Activity vs progress", "Questions for the lead") that only new hire, drift,
 * PIP and contract renewal situations show, and nothing in the served board carries their data yet.
 * Building them is a new report-synthesis job, which is the engine's to scope - see Needs Hafsah.
 */

/** The five headings the 24 situations sit under, in the prototype's own order. */
export const SWITCHBOARD_GROUPS: { group: string; situations: string[] }[] = [
  {
    group: 'Something is starting',
    situations: [
      'Help a new hire get started',
      'Hand over a role smoothly',
      'Get a new project off to a good start',
      'Start a new partnership well',
      'Help a new manager take over',
      'Start an advisor or board relationship',
      'Check an agreement before signing',
    ],
  },
  {
    group: 'Planning and goals',
    situations: [
      'Set goals and keep the team on track',
      'Build a workplan and budget',
      'Align on strategy',
      'Work through a big decision',
    ],
  },
  {
    group: 'Keeping a read',
    situations: [
      'Keep a read on live work',
      'Get updates from your team',
      'Work out where to focus',
      'Take the pulse of the team',
      'Check how the same role is going',
      'Check how an agreement is going',
    ],
  },
  {
    group: 'About one person',
    situations: [
      'Support a raise or promotion',
      'Check in before a renewal',
      'Help someone get back on track',
    ],
  },
  {
    group: 'Something has gone off',
    situations: [
      'Get a project back on track',
      'See where people see things differently',
      'Make sense of something serious',
    ],
  },
  {
    group: 'Open',
    situations: [
      'Work through something else',
    ],
  },
]

/** Every situation, in table order, flattened - 24 in total, matching "All 24 situations" in the heading. */
export const SWITCHBOARD_SITUATIONS: string[] = SWITCHBOARD_GROUPS.flatMap((g) => g.situations)

/**
 * "Help someone get back on track", the example the prototype's switchboard page has open, and the
 * only row whose full legend (not just the grid square) is given in words rather than only a square:
 * "Switched on" / "Optional" / "Off by design", each with the sections it names.
 */
export const EXAMPLE_SWITCHBOARD_ROW = {
  situation: 'Help someone get back on track',
  switchedOn: [
    'Starting agreement', 'Accounts side by side', 'Person history', 'Change since last',
    'Coaching', 'Lead actions', 'Blocker check', 'Where the time went', 'Requirements review',
    'Behaviour to result', 'The other side', 'Evidence index', 'Dependency ledger',
    'Commitment threads', 'Pattern history', 'Contradictions', 'Activity vs progress',
    'Questions for the lead',
  ],
  optional: ['Targets', 'Work plan', 'Deal grid', 'Known, believed, unknown', 'Blockers', 'Patterns'],
  offByDesign: [
    { section: 'Forecast', why: 'A forecast about one person feels like a judgement on them. The deal grid stays, as evidence for both accounts.' },
    { section: 'Check-in grades', why: 'Check-in grades would feel like a judgement on the person here, so they stay off.' },
  ],
}

/**
 * THE MAPPING, AS FAR AS THIS PASS CAN STAND BEHIND IT. `null` means the prototype's section has no
 * counterpart in what the board serves today - see the file comment above for why those are left
 * for a request rather than guessed. Names here are switchboard.txt's own (slightly different
 * wording from G2's in a few places - "Known, believed, unknown" for G2's "Known and unknown", and
 * so on); `G2_NAME_FOR` below carries the correspondence so both can be looked up either way.
 */
export const PROTOTYPE_SECTION_TO_BOARD_SECTION: Record<string, string | null> = {
  'Targets': 'objectives',
  'Starting agreement': 'startingState',
  'Accounts side by side': 'divergence',
  'Known, believed, unknown': 'whatTheRoomIsAbout',
  'Blockers': 'dependencies',
  'Patterns': 'patterns',
  'Change since last': 'quickRead',
  'Check-in grades': null, // off by design everywhere, per Hafsah's decisions - no labels or scores on a person.
  // Not yet served: each needs new report-synthesis data the engine has not built (request to follow).
  'Work plan': null,
  'Deal grid': null,
  'Forecast': null,
  'Timeline': null,
  'Themes': null,
  'Obligations': null,
  'Person history': null,
  'Risks': null,
  'Coaching': null,
  'Lead actions': null,
  'Blocker check': null,
  'Where the time went': null,
  'Requirements review': null,
  'Behaviour to result': null,
  'The other side': null,
  'Evidence index': null,
  'Dependency ledger': null,
  'Commitment threads': null,
  'Pattern history': null,
  'Contradictions': null,
  'Activity vs progress': null,
  'Questions for the lead': null,
}

/**
 * ITEM A, U.10 RE-REVIEW: G2's OWN 30 SECTIONS AND 24-BY-30 GRID, AS DATA.
 *
 * docs/modules.md section G2 ("The switchboard: which sections each situation uses") writes the
 * whole grid out in words - every one of the 24 situations, each with "Sections on", "Optional",
 * "Off on purpose" and "Backend has it" - because the prototype's own picture
 * (docs/prototype/screens/B1-starting-a-check-in/switchboard.jpg) is cut off before the grid ends.
 * This is transcribed from that text, checked by a test that reads docs/modules.md and confirms the
 * transcription against it line by line, rather than trusted by eye. Where switchboard.txt is
 * readable it agrees with G2; where they differ only in wording (a handful of section names), G2's
 * words are used throughout, per instruction.
 */

/** The 30 sections G2 names, in its own order, with what each shows in plain words. */
export const G2_SECTIONS: { name: string; shows: string }[] = [
  { name: 'Targets', shows: 'The numbers the team is aiming for' },
  { name: 'Work plan', shows: 'Who is doing what, and by when' },
  { name: 'Deal grid', shows: 'Every deal or work item, and its stage. Needs work with stages' },
  { name: 'Forecast', shows: 'Where the numbers are likely to end up. Needs a target' },
  { name: 'Starting agreement', shows: 'What was agreed at the start, and how things drifted from it' },
  { name: 'Accounts side by side', shows: 'Each person’s account next to the others’' },
  { name: 'Known and unknown', shows: 'What is proven, what people believe, and what nobody knows yet' },
  { name: 'Timeline', shows: 'What happened, in order' },
  { name: 'Themes', shows: 'Many answers grouped by what they are about, without losing any' },
  { name: 'Obligations', shows: 'What each side promised the other' },
  { name: 'Person history', shows: 'One person’s record over time' },
  { name: 'Change since last', shows: 'What changed since the last check-in' },
  { name: 'Blockers', shows: 'What is stuck, and what it waits on' },
  { name: 'Risks', shows: 'What could go wrong' },
  { name: 'Patterns', shows: 'What keeps happening, shown after 3 check-ins' },
  { name: 'Coaching', shows: 'One thing to do better, for each person' },
  { name: 'Lead actions', shows: 'What the lead needs to do' },
  { name: 'Check-in grades', shows: 'How complete and specific each check-in was' },
  { name: 'Blocker check', shows: 'Whether a blocker is real: a named person, what was tried, and a date' },
  { name: 'Where the time went', shows: 'What the person’s time was spent on' },
  { name: 'Requirements review', shows: 'Whether what was required was met' },
  { name: 'Actions and their results', shows: 'What someone did, and what came of it' },
  { name: 'The other side', shows: 'The other person’s account' },
  { name: 'Evidence index', shows: 'Every piece of proof, in one list' },
  { name: 'Who waited on whom', shows: 'Every time someone waited on someone else' },
  { name: 'Commitments followed over time', shows: 'Each promise, from when it was made to what happened' },
  { name: 'Pattern history', shows: 'How a pattern started and changed' },
  { name: 'Contradictions', shows: 'Where the record says two different things' },
  { name: 'Busy or moving', shows: 'Whether activity is turning into progress' },
  { name: 'Questions for the lead', shows: 'Questions only the lead can answer' },
]

export const G2_SECTION_NAMES: string[] = G2_SECTIONS.map((s) => s.name)

/**
 * Every situation's own row from G2's "Every situation" table, in the table's own order, each
 * matched to the `GroundScenario` key it runs on (client/src/lib/scenario-catalog.ts's own
 * `SCENARIO_LABELS`, keyed the same way, is the cross-check the test uses).
 */
export interface SwitchboardRow {
  group: string
  situation: string
  /** The GroundScenario this situation runs on. */
  scenario: string
  sectionsOn: string[]
  optional: string[]
  offOnPurpose: string[]
  /** Whether the backend already builds a board for this situation at all (G2's "Backend has it"). */
  backendHasIt: boolean
}

export const SWITCHBOARD_MATRIX: SwitchboardRow[] = [
  {
    group: 'Something is starting', situation: 'Help a new hire get started', scenario: 'NEW_HIRE',
    sectionsOn: ['Work plan', 'Starting agreement', 'Accounts side by side', 'Known and unknown', 'Person history', 'Change since last', 'Blockers', 'Patterns', 'Coaching', 'Lead actions', 'Blocker check', 'Where the time went', 'Requirements review', 'Actions and their results', 'The other side', 'Evidence index', 'Who waited on whom', 'Commitments followed over time', 'Pattern history', 'Contradictions', 'Busy or moving', 'Questions for the lead'],
    optional: ['Targets', 'Deal grid', 'Risks', 'Check-in grades'], offOnPurpose: [], backendHasIt: true,
  },
  {
    group: 'Something is starting', situation: 'Hand over a role smoothly', scenario: 'ROLE_HANDOVER',
    sectionsOn: ['Starting agreement', 'Obligations', 'Change since last', 'Blockers', 'Risks', 'Lead actions'],
    optional: ['Work plan', 'Accounts side by side'], offOnPurpose: [], backendHasIt: false,
  },
  {
    group: 'Something is starting', situation: 'Get a new project off to a good start', scenario: 'NEW_PROJECT',
    sectionsOn: ['Targets', 'Work plan', 'Deal grid', 'Forecast', 'Starting agreement', 'Blockers', 'Blocker check', 'Risks', 'Patterns', 'Lead actions'],
    optional: ['Timeline', 'Change since last', 'Coaching', 'Check-in grades'], offOnPurpose: [], backendHasIt: true,
  },
  {
    group: 'Something is starting', situation: 'Start a new partnership well', scenario: 'NEW_COFOUNDER',
    sectionsOn: ['Starting agreement', 'Accounts side by side', 'Change since last', 'Patterns'],
    optional: ['Targets', 'Work plan', 'Obligations', 'Blockers', 'Risks'], offOnPurpose: ['Check-in grades'], backendHasIt: true,
  },
  {
    group: 'Something is starting', situation: 'Help a new manager take over', scenario: 'NEW_MANAGER',
    sectionsOn: ['Targets', 'Starting agreement', 'Accounts side by side', 'Change since last', 'Blockers', 'Patterns', 'Coaching', 'Lead actions'],
    optional: ['Work plan', 'Themes', 'Risks', 'Check-in grades'], offOnPurpose: [], backendHasIt: true,
  },
  {
    group: 'Something is starting', situation: 'Start an advisor or board relationship', scenario: 'NEW_ADVISOR',
    sectionsOn: ['Starting agreement', 'Obligations'],
    optional: ['Accounts side by side', 'Change since last', 'Patterns', 'Lead actions'], offOnPurpose: ['Check-in grades'], backendHasIt: true,
  },
  {
    group: 'Something is starting', situation: 'Check an agreement before signing', scenario: 'CONTRACT_REVIEW',
    sectionsOn: ['Starting agreement', 'Accounts side by side', 'Obligations', 'Risks', 'Lead actions'],
    optional: ['Known and unknown', 'Blockers'], offOnPurpose: ['Check-in grades'], backendHasIt: false,
  },
  {
    group: 'Planning and goals', situation: 'Set goals and keep the team on track', scenario: 'OKR_ALIGNMENT',
    sectionsOn: ['Targets', 'Work plan', 'Deal grid', 'Forecast', 'Blockers', 'Blocker check', 'Risks', 'Patterns', 'Coaching', 'Lead actions', 'Check-in grades'],
    optional: ['Starting agreement', 'Accounts side by side', 'Change since last'], offOnPurpose: [], backendHasIt: true,
  },
  {
    group: 'Planning and goals', situation: 'Build a workplan and budget', scenario: 'WORKPLAN_BUDGET',
    sectionsOn: ['Targets', 'Work plan', 'Deal grid', 'Forecast', 'Starting agreement', 'Blockers', 'Risks', 'Lead actions'],
    optional: ['Change since last', 'Patterns', 'Coaching', 'Check-in grades'], offOnPurpose: [], backendHasIt: true,
  },
  {
    group: 'Planning and goals', situation: 'Align on strategy', scenario: 'BOARD_STRATEGY',
    sectionsOn: ['Accounts side by side', 'Known and unknown', 'Themes', 'Risks', 'Lead actions'],
    optional: ['Targets', 'Starting agreement'], offOnPurpose: ['Check-in grades'], backendHasIt: true,
  },
  {
    group: 'Planning and goals', situation: 'Work through a big decision', scenario: 'CRISIS_ALIGNMENT',
    sectionsOn: ['Accounts side by side', 'Known and unknown', 'Timeline', 'Change since last', 'Blockers', 'Risks', 'Lead actions'],
    optional: ['Themes'], offOnPurpose: ['Check-in grades'], backendHasIt: true,
  },
  {
    group: 'Keeping a read', situation: 'Keep a read on live work', scenario: 'PULSE_CHECK',
    sectionsOn: ['Change since last', 'Blockers', 'Blocker check', 'Patterns'],
    optional: ['Targets', 'Work plan', 'Deal grid', 'Starting agreement', 'Risks', 'Coaching', 'Lead actions', 'Check-in grades'], offOnPurpose: [], backendHasIt: true,
  },
  {
    group: 'Keeping a read', situation: 'Get updates from your team', scenario: 'TEAM_UPDATES',
    sectionsOn: ['Deal grid', 'Change since last', 'Blockers', 'Patterns', 'Lead actions', 'Check-in grades'],
    optional: ['Targets', 'Work plan', 'Forecast', 'Themes', 'Risks', 'Coaching'], offOnPurpose: [], backendHasIt: false,
  },
  {
    group: 'Keeping a read', situation: 'Work out where to focus', scenario: 'DISCOVERY',
    sectionsOn: ['Themes'],
    optional: ['Accounts side by side', 'Known and unknown', 'Patterns', 'Lead actions'], offOnPurpose: ['Check-in grades'], backendHasIt: false,
  },
  {
    group: 'Keeping a read', situation: 'Take the pulse of the team', scenario: 'SNAPSHOT',
    sectionsOn: ['Themes'],
    optional: ['Accounts side by side'], offOnPurpose: ['Work plan', 'Patterns', 'Check-in grades'], backendHasIt: false,
  },
  {
    group: 'Keeping a read', situation: 'Check how the same role is going', scenario: 'COHORT_CHECK',
    sectionsOn: ['Targets', 'Themes', 'Blockers', 'Blocker check', 'Patterns'],
    optional: ['Deal grid', 'Person history', 'Change since last', 'Coaching', 'Lead actions', 'Check-in grades'], offOnPurpose: [], backendHasIt: true,
  },
  {
    group: 'Keeping a read', situation: 'Check how an agreement is going', scenario: 'IMPLEMENTATION_TRACKING',
    sectionsOn: ['Starting agreement', 'Obligations', 'Change since last', 'Blockers', 'Risks', 'Lead actions'],
    optional: ['Work plan', 'Accounts side by side', 'Patterns'], offOnPurpose: [], backendHasIt: false,
  },
  {
    group: 'About one person', situation: 'Support a raise or promotion', scenario: 'RECOGNITION',
    sectionsOn: ['Targets', 'Person history', 'Patterns'],
    optional: ['Deal grid', 'Starting agreement', 'Accounts side by side', 'Lead actions'], offOnPurpose: ['Check-in grades'], backendHasIt: true,
  },
  {
    group: 'About one person', situation: 'Check in before a renewal', scenario: 'CONTRACT_RENEWAL',
    sectionsOn: ['Starting agreement', 'Accounts side by side', 'Known and unknown', 'Obligations', 'Person history', 'Risks', 'Lead actions', 'Blocker check', 'Where the time went', 'Requirements review', 'Actions and their results', 'The other side', 'Evidence index', 'Who waited on whom', 'Commitments followed over time', 'Pattern history', 'Contradictions', 'Busy or moving', 'Questions for the lead'],
    optional: ['Targets', 'Deal grid', 'Patterns'], offOnPurpose: ['Check-in grades'], backendHasIt: true,
  },
  {
    group: 'About one person', situation: 'Help someone get back on track', scenario: 'PIP',
    sectionsOn: ['Starting agreement', 'Accounts side by side', 'Person history', 'Change since last', 'Coaching', 'Lead actions', 'Blocker check', 'Where the time went', 'Requirements review', 'Actions and their results', 'The other side', 'Evidence index', 'Who waited on whom', 'Commitments followed over time', 'Pattern history', 'Contradictions', 'Busy or moving', 'Questions for the lead'],
    optional: ['Targets', 'Work plan', 'Deal grid', 'Known and unknown', 'Blockers', 'Patterns'], offOnPurpose: ['Forecast', 'Check-in grades'], backendHasIt: true,
  },
  {
    group: 'Something has gone off', situation: 'Get a project back on track', scenario: 'DRIFT',
    sectionsOn: ['Targets', 'Work plan', 'Deal grid', 'Forecast', 'Starting agreement', 'Timeline', 'Blockers', 'Risks', 'Patterns', 'Lead actions', 'Blocker check', 'Actions and their results', 'The other side', 'Who waited on whom', 'Commitments followed over time', 'Pattern history', 'Contradictions', 'Busy or moving'],
    optional: ['Accounts side by side', 'Known and unknown', 'Change since last', 'Coaching', 'Check-in grades', 'Where the time went', 'Evidence index', 'Questions for the lead'], offOnPurpose: [], backendHasIt: true,
  },
  {
    group: 'Something has gone off', situation: 'See where people see things differently', scenario: 'REALIGN_TEAM',
    sectionsOn: ['Starting agreement', 'Accounts side by side', 'Themes', 'Lead actions'],
    optional: ['Targets', 'Work plan', 'Known and unknown', 'Blockers', 'Risks', 'Patterns'], offOnPurpose: ['Check-in grades'], backendHasIt: true,
  },
  {
    group: 'Something has gone off', situation: 'Make sense of something serious', scenario: 'ACUTE_SHOCK',
    sectionsOn: ['Accounts side by side', 'Known and unknown', 'Timeline', 'Change since last', 'Blockers', 'Risks', 'Lead actions'],
    optional: [], offOnPurpose: ['Check-in grades'], backendHasIt: true,
  },
  {
    group: 'Open', situation: 'Work through something else', scenario: 'OPEN_READ',
    sectionsOn: ['Accounts side by side', 'Known and unknown', 'Themes'],
    optional: ['Timeline', 'Change since last', 'Blockers', 'Risks', 'Patterns', 'Lead actions'], offOnPurpose: ['Check-in grades'], backendHasIt: false,
  },
]

/**
 * G2's SECTION NAME -> THE SERVED BOARD SECTION, OR `null`. Kept separate from
 * `PROTOTYPE_SECTION_TO_BOARD_SECTION` (switchboard.txt's slightly different names) so the mapping
 * BoardPage actually uses matches the names `SWITCHBOARD_MATRIX` carries. The three sections the
 * prototype never shows a participant ("Contribution against role", "Where work is landing", "How
 * the leading is landing") are not G2 names at all - they map from the served `contribution` and
 * `coverage` fields directly, drawn lead-only, below G2's own sections (see BoardPage.tsx).
 */
/**
 * 1 OCTOBER, THE SWITCHBOARD'S 22 SECTIONS (docs/answers-from-engine.md, "1 October: the
 * switchboard's 22 sections"). Thirteen names below still map to `null` because the engine's own
 * table ("What is left after the second pass, and where each is served") says they are served
 * already, under a field this page draws elsewhere (Deal grid, Coaching, Themes, Pattern history,
 * The other side, Commitments followed over time, Actions and their results, Requirements review),
 * or are not served at all because the record does not hold them (Check-in grades, Where the time
 * went). Drawing those again here under a second name would be a second place for a wall to be
 * forgotten - see the file's own top comment. The rest now point at the new top-level fields
 * `board.ts` carries (request 70, both passes).
 */
export const G2_SECTION_TO_BOARD_SECTION: Record<string, string | null> = {
  'Targets': 'objectives',
  'Starting agreement': 'startingState',
  'Accounts side by side': 'divergence',
  'Known and unknown': 'whatTheRoomIsAbout',
  'Blockers': 'dependencies',
  'Patterns': 'patterns',
  'Change since last': 'quickRead',
  'Check-in grades': null,
  'Work plan': 'workPlan',
  'Deal grid': null,
  'Forecast': 'forecast',
  'Timeline': 'timeline',
  'Themes': null,
  'Obligations': 'obligations',
  'Person history': 'personHistory',
  'Risks': 'risks',
  'Coaching': null,
  'Lead actions': 'leadActions',
  'Blocker check': 'blockerCheck',
  'Where the time went': null,
  'Requirements review': null,
  'Actions and their results': null,
  'The other side': null,
  'Evidence index': 'evidenceIndex',
  'Who waited on whom': 'whoWaitedOnWhom',
  'Commitments followed over time': null,
  'Pattern history': null,
  'Contradictions': 'contradictions',
  'Busy or moving': 'busyOrMoving',
  'Questions for the lead': 'questionsForTheLead',
}

/** Every row of `SWITCHBOARD_MATRIX`, keyed by the GroundScenario it runs on. */
export const SWITCHBOARD_ROW_FOR_SCENARIO: Record<string, SwitchboardRow> =
  Object.fromEntries(SWITCHBOARD_MATRIX.map((r) => [r.scenario, r]))
