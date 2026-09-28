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
 * for a request rather than guessed.
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
