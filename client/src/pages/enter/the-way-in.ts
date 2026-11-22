import { inASentence } from '@/lib/how-long-setup-takes'

/*
 * THE WAY INTO A NEW CHECK-IN, IN THE PROTOTYPE'S OWN WORDS (U.6, B1).
 *
 * Every sentence here is copied from docs/prototype/screens/B1-starting-a-check-in/*.txt:
 * start.txt for someone signed out, new.txt for someone signed in, and all-situations.txt for the
 * list of every situation. Where a screen has no words, the fewest plain words are used, and each
 * one is listed in docs/morning-report-ui.md.
 */

/**
 * start.txt: the way in, for everybody (F5, the approved target journey, stage 1). A lead who has just made the organisation meets
 * the same screen as somebody signed out: one question, the examples as buttons that fill the box, one button. "Describe it in your
 * own words" and the sentence about pressing send are gone, and there is no example text in the box, so no example can ever be kept
 * as something the lead said. How long it takes is the server's one figure (useACheckInTakes), the same one every page says.
 */
export const THE_DOOR = {
  heading: 'What do you need updates on, or want to track?',
  /* How long, as the server's one figure says it (useACheckInTakes); nothing is said about the length until it is served. */
  help: (takes: string | null) => (takes ? `A goal, a new hire, a decision. Describe it and I’ll set it up in ${inASentence(takes)}.` : 'A goal, a new hire, a decision. Describe it and I’ll set it up.'),
  button: 'Continue',
} as const

/** new.txt: where a signed-in lead is, above the same words. */
export const THE_DOOR_CRUMBS = ['Check-ins', 'New check-in'] as const

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
  /** Choosing another kind inside setup: nothing already said is lost. */
  useThisKind: 'Use this kind of check-in',
  keepsWhatWasSaid: 'Everything you have said so far is kept. Only the kind of check-in changes.',
  keepIt: 'Keep it as it is',
  /** "It starts the conversation with: “…” You can change every word." */
  itStartsWith: (opener: string) => `It starts the conversation with: “${opener}” You can change every word.`,
  noAccountNeeded: 'You don’t need to sign up to start. We ask for your email when there’s something worth keeping.',
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
  PULSE_CHECK: 'What moved, what’s stuck and what changed.',
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

/**
 * "For example", in the "You picked" panel (U.6 review). The catalogue's examples are written for
 * scanning and several are broken sentences or jargon ("A capability concern where you want a fair
 * record, not a he-said-she-said.", "...re-litigate afterwards."). This panel shows two per situation
 * in plain full sentences: the prototype's own where it has them (all-situations.txt shows them for
 * "Help someone get back on track"), and otherwise the catalogue's, rewritten plainly where needed.
 */
export const FOR_EXAMPLE: Record<string, [string, string]> = {
  NEW_HIRE: ['You hired a sales lead, and they start on Monday.', 'Someone starts on Monday and you want to be sure you both mean the same thing by “doing well”.'],
  ROLE_HANDOVER: ['Someone is leaving in four weeks and their replacement has already started.', 'A role is moving between two people and nobody has written down what the first one was carrying.'],
  NEW_PROJECT: ['You are starting a six-month build with four people on it.', 'You want the scope and what “done” means agreed before anyone starts.'],
  NEW_COFOUNDER: ['You and your co-founder are splitting equity next week.', 'A new equal partner is joining the founding team.'],
  NEW_MANAGER: ['A new manager is taking over a team of eight in the middle of a project.', 'An interim leader is stepping into a team for six months.'],
  NEW_ADVISOR: ['An advisor is joining for 1% and you want their year set out before they start.', 'A new board member is joining and you each want to write down what you expect.'],
  CONTRACT_REVIEW: ['You are two weeks from signing and both sides think it is clear.', 'You share revenue with a partner, and neither of you has said out loud what the percentage applies to.'],
  OKR_ALIGNMENT: ['The quarter starts in two weeks and six people would name different priorities.', 'Two teams depend on each other’s goals and you are not sure the handover between them is agreed.'],
  OKR_CASCADE: ['Three departments each write their own results under one company target.', 'Each team’s goals look sensible, and you are not sure they add up to the goal at the top.'],
  WORKPLAN_BUDGET: ['Two teams have each budgeted for the same hire.', 'The plan looks fine, but you think its budget was assumed and never approved.'],
  BOARD_STRATEGY: ['The board agreed the strategy in the room, and two of them have since told you privately they disagree.', 'Before a strategy day, you want each leader’s real view so quiet disagreement shows up early.'],
  CRISIS_ALIGNMENT: ['You are deciding this month whether to close a product line.', 'Everyone will agree in the meeting, and you expect them to argue about it again afterwards.'],
  TEAM_UPDATES: ['What shipped this week, and what slipped?', 'What is the one thing you need from me before Friday?'],
  PULSE_CHECK: ['You want to know what your team is actually doing.', 'You want a short, regular update without calling a meeting.'],
  SNAPSHOT: ['You want one honest read from everyone this week.', 'Something feels wrong across the team and you want a read before deciding whether it needs watching.'],
  COHORT_CHECK: ['You have twenty field officers, and you only hear from the three who call.', 'You run a training group and want to see who is on track and who is stuck, without them influencing each other.'],
  COHORT_ONBOARDING: ['Six new managers started this month, each running a different branch.', 'You need to know by the second month, not the third, which new starters need help.'],
  DISCOVERY: ['Where should we grow next, and what would we need to know to do it?', 'What is stopping our customers from growing?'],
  IMPLEMENTATION_TRACKING: ['The contract has been running for eight months and neither side has looked at it since.', 'What you do has quietly drifted from what was signed, and both sides half know it.'],
  PIP: ['A senior hire’s delivery is slipping and you both want the real picture before the conversation.', 'You’re putting someone on a formal plan and want both sides on the concern and what good looks like.'],
  RECOGNITION: ['Someone asked for a raise on Friday.', 'Someone is up for promotion and you want their record and your view to match before you talk.'],
  CONTRACT_RENEWAL: ['An agency contract ends in six weeks and you are not sure what you got.', 'A contractor’s term is ending and you are deciding whether to renew it.'],
  DRIFT: ['The project is eight weeks late and everyone has a different reason.', 'Money is tight and you need everyone to see the same runway and what has to change.'],
  REALIGN_TEAM: ['You and your operations lead have stopped agreeing on what matters.', 'Priorities changed and everyone is working from a different idea of what matters now.'],
  ACUTE_SHOCK: ['Your biggest client left on Tuesday and you want them back.', 'Something stopped working and people are rushing to understand what happened.'],
}

/**
 * all-situations.txt's line under the name, for "Help someone get back on track": "You put their side
 * and yours written down before you talk. Neither of you sees the other’s answers until you both have
 * answered." Only the first sentence is shown. Nothing on the server holds one person's answers back
 * until the other has answered (people in a check-in may read each other's words, and the lead reads
 * the person's), so the second would not be true. See item 17 of docs/morning-report-ui.md.
 */
export const HOW_IT_WORKS: Record<string, string> = {
  PIP: 'You put their side and yours written down before you talk.',
}
