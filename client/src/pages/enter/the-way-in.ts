/*
 * THE WAY INTO A NEW CHECK-IN, IN THE PROTOTYPE'S OWN WORDS (U.6, B1).
 *
 * Every sentence here is copied from docs/prototype/screens/B1-starting-a-check-in/*.txt:
 * start.txt for someone signed out, new.txt for someone signed in, and all-situations.txt for the
 * list of every situation. Where a screen has no words, the fewest plain words are used, and each
 * one is listed in docs/morning-report-ui.md.
 */

/** start.txt: the first screen someone signed out meets. */
export const THE_DOOR_SIGNED_OUT = {
  heading: 'What do you need updates on, or want to track?',
  help: 'A goal, a new hire, a decision. Describe it and we’ll set it up in about two minutes.',
  placeholder: 'For example: our sales targets this quarter',
  button: 'Continue',
} as const

/** new.txt: the same moment for someone signed in. */
export const THE_DOOR_SIGNED_IN = {
  crumbs: ['Check-ins', 'New check-in'],
  heading: 'Set up a check-in',
  help: 'Describe it in your own words. Nothing is sent to anyone until you press send.',
  question: 'What do you want your team to check in about?',
  placeholder: 'For example: our sales targets this quarter',
  button: 'Send',
} as const

/** start.txt: the five examples. Pressing one puts its words in the box, to change or send. */
export const THE_EXAMPLES = [
  'Track the team’s targets for the quarter',
  'Sales are behind and I don’t know why',
  'A new hire starts on Monday',
  'Someone isn’t delivering',
  'We have to choose a supplier',
] as const

/** start.txt: the way to the list. */
export const RATHER_PICK = { before: 'Rather pick from a list?', link: 'See every situation' } as const

/** all-situations.txt: the list of every situation. */
export const EVERY_SITUATION = {
  heading: 'What do you want people to check in about?',
  help: 'Say it in your own words, or start from one of the situations below. Either way, it’s set up as you talk, and nothing is sent to anyone until you say so.',
  start: 'Start',
  somethingElse: 'Something else',
  somethingElseHelp: 'None of these fit? Describe it and we’ll work out what it is together.',
  describeIt: 'Describe it',
  youPicked: 'You picked',
  forExample: 'For example',
  startWithThis: 'Start with this',
  /** "It starts the conversation with: “…” You can change every word." */
  itStartsWith: (opener: string) => `It starts the conversation with: “${opener}” You can change every word.`,
  noAccountNeeded: 'You don’t need an account to start. We ask for your email when there’s something worth keeping.',
} as const

/** all-situations.txt: the group headings, in the prototype's order. The keys are the catalogue's. */
export const THE_GROUPS_IN_ORDER: { key: 'starting' | 'planning' | 'reading' | 'person' | 'off'; heading: string }[] = [
  { key: 'starting', heading: 'Something is starting' },
  { key: 'planning', heading: 'Goals and plans' },
  { key: 'reading', heading: 'Keeping a read' },
  { key: 'person', heading: 'About one person' },
  { key: 'off', heading: 'Something has gone off' },
]

/**
 * all-situations.txt: the one line under each situation, by the catalogue's card key, in the
 * prototype's order within each group. A card with no line here keeps the catalogue's own line and
 * goes last in its group (today, only "Onboarding several people at once").
 */
export const THE_ONE_LINE: Record<string, string> = {
  NEW_HIRE: 'Clear expectations from day one, from both sides.',
  ROLE_HANDOVER: 'More than a list of tasks for whoever takes over.',
  NEW_PROJECT: 'Scope and “done” agreed before anyone starts.',
  NEW_COFOUNDER: 'The assumptions said out loud first.',
  NEW_MANAGER: 'A clear handover of the team and the work.',
  NEW_ADVISOR: 'What they’ll actually contribute, and on what terms.',
  CONTRACT_REVIEW: 'What each side thinks it means, before you sign.',
  OKR_ALIGNMENT: 'Targets, and a daily read on what’s actually moving.',
  OKR_CASCADE: 'One goal at the top, and whether the rest add up to it.',
  WORKPLAN_BUDGET: 'Each person’s plan, checked against the resources.',
  BOARD_STRATEGY: 'Each leader’s own read before the room debates it.',
  CRISIS_ALIGNMENT: 'The honest views first, before everyone nods along.',
  TEAM_UPDATES: 'Ask one thing, get one report back.',
  PULSE_CHECK: 'What moved, what’s stuck and what changed, every week.',
  SNAPSHOT: 'One honest read from everyone, once.',
  COHORT_CHECK: 'Several people in one role, each on their own.',
  DISCOVERY: 'Ask a group what they know, once, and find a direction.',
  IMPLEMENTATION_TRACKING: 'Whether what you do still matches what you signed.',
  PIP: 'Both sides on the concern, before the conversation.',
  RECOGNITION: 'The same evidence in front of both of you.',
  CONTRACT_RENEWAL: 'An honest read of how the term went, from both sides.',
  DRIFT: 'Where it drifted from what was agreed, and why.',
  REALIGN_TEAM: 'Both accounts kept, nobody framed as wrong.',
  ACUTE_SHOCK: 'The real picture, fast, from everyone involved.',
  DESCRIBE_OWN: 'Describe it and work out what it is together.',
}

/** Where a card sits within its group: the prototype's order, then anything it does not show. */
export function orderWithinGroup(cardKey: string): number {
  const at = Object.keys(THE_ONE_LINE).indexOf(cardKey)
  return at === -1 ? 1000 : at
}
