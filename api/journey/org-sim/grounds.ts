/**
 * Eighteen grounds, one org, run in order.
 *
 * The point of running them in sequence rather than in parallel is that the org
 * accumulates: Sahar is new exactly once, most people are returning by ground
 * five, and the free allowance runs out at ground eleven. Run them concurrently
 * and none of that is true any more - the free/paid gate, the
 * returning-versus-new recognition and the org's own state all depend on the
 * order. Sessions WITHIN a ground run together, because those genuinely are
 * independent people answering separately.
 *
 * The scenario each ground picks is what a real person would plausibly pick from
 * the card list given their situation - including, deliberately, the couple of
 * places where two cards look like they both fit. Where the obvious card is
 * ambiguous the spec records what a person would hesitate over, because that
 * hesitation is one of the things being measured.
 */
import { GroundScenario, GroundMoment, Cadence } from '@prisma/client';

export interface GroundSpec {
  n: number;
  label: string;
  scenario: GroundScenario;
  moment: GroundMoment;
  cadence: Cadence;
  timelineDays: number;
  sessions: number;
  /** Who runs it. Sahar is the admin on every ground; the lead may be someone else. */
  lead: string;
  participants: string[];
  /** Do these people see each other's work? Decides the fairness reads. */
  peopleWorkTogether: boolean;
  brief: string;
  /** What the ground is about, in the words the actors would use. */
  subject: string;
  /** Free until the allowance runs out. */
  expectPaid: boolean;
  /** What a real person would hesitate over on the card screen, if anything. */
  cardNote: string;
}

export const GROUNDS: GroundSpec[] = [
  {
    n: 1, label: 'Abubakar - new hire, first 90 days',
    scenario: GroundScenario.NEW_HIRE, moment: GroundMoment.STARTING,
    cadence: Cadence.WEEKLY, timelineDays: 90, sessions: 12,
    lead: 'hafsah', participants: ['abubakar'], peopleWorkTogether: true,
    brief: 'A new hire and his manager getting on the same page about the role and what early success looks like in the first ninety days.',
    subject: 'the role, what early success looks like, and what he owns',
    expectPaid: false,
    cardNote: '"New hire" is unambiguous. The only wobble is whether a manager reads it as "for the hire" or "for both of us".',
  },
  {
    n: 2, label: 'Atlas build - scope and ownership before we start',
    scenario: GroundScenario.NEW_PROJECT, moment: GroundMoment.STARTING,
    cadence: Cadence.WEEKLY, timelineDays: 60, sessions: 8,
    lead: 'kennedy', participants: ['ejiro', 'maureen', 'eric', 'hafeezah', 'abubakar'],
    peopleWorkTogether: true,
    brief: 'A new project kicking off. The team needs to line up on scope, ownership and what done means before any work starts.',
    subject: 'scope, who owns what, and what done means',
    expectPaid: false,
    cardNote: '"New project" is clear, but "Goals & planning" also looks plausible to someone thinking about scope.',
  },
  {
    n: 3, label: 'Adam - advisor terms',
    scenario: GroundScenario.NEW_ADVISOR, moment: GroundMoment.STARTING,
    cadence: Cadence.MONTHLY, timelineDays: 90, sessions: 3,
    lead: 'maureen', participants: ['adam'], peopleWorkTogether: true,
    brief: 'Bringing on an advisor. Pin down what he will actually contribute and on what terms, so available does not stand in for contributing.',
    subject: 'what the advisor will actually contribute, and on what terms',
    expectPaid: false,
    cardNote: 'Clear card. Some would look for the word "consultant" and not find it.',
  },
  {
    n: 4, label: 'Hafsah and Abubakar - partnership terms',
    scenario: GroundScenario.NEW_COFOUNDER, moment: GroundMoment.STARTING,
    cadence: Cadence.FORTNIGHTLY, timelineDays: 90, sessions: 6,
    lead: 'hafsah', participants: ['abubakar'], peopleWorkTogether: true,
    brief: 'Two partners putting what each expects to build, own and contribute in writing, before those assumptions collide.',
    subject: 'what each of us expects to build, own and contribute',
    expectPaid: false,
    cardNote: 'A partner who is not a co-founder may not see themselves in "New partner or co-founder".',
  },
  {
    n: 5, label: 'Rime steps into the delivery team',
    scenario: GroundScenario.NEW_MANAGER, moment: GroundMoment.STARTING,
    cadence: Cadence.WEEKLY, timelineDays: 90, sessions: 13,
    lead: 'rime', participants: ['kennedy', 'ejiro', 'eric'], peopleWorkTogether: true,
    brief: 'A new manager stepping into an existing team. Scope, reporting lines and what success looks like all need to be clear.',
    subject: 'scope, who reports to whom, and what success looks like',
    expectPaid: false,
    cardNote: 'Between "New manager or lead" and "Get a team back on the same page" for someone who has inherited friction.',
  },
  {
    n: 6, label: 'Nate - contract renewal',
    scenario: GroundScenario.CONTRACT_RENEWAL, moment: GroundMoment.RESOLUTION,
    cadence: Cadence.WEEKLY, timelineDays: 14, sessions: 2,
    lead: 'eric', participants: ['nate'], peopleWorkTogether: true,
    brief: 'A contractor term ending. Both sides give an honest account of how it actually went and what a fair next one looks like.',
    subject: 'how the term actually went, and what a fair next one looks like',
    expectPaid: false,
    cardNote: 'Clear. The moment picker is the harder question here - this is an ending, not a start.',
  },
  {
    n: 7, label: 'Kavon - the case for a raise',
    scenario: GroundScenario.RECOGNITION, moment: GroundMoment.RECOGNITION,
    cadence: Cadence.ONE_TIME, timelineDays: 7, sessions: 1,
    lead: 'hafsah', participants: ['kavon'], peopleWorkTogether: true,
    brief: 'Someone building the evidence behind a raise, and the decision-maker reading the same record, so both start from the same picture.',
    subject: 'the evidence behind the ask, and how the decision-maker reads it',
    expectPaid: false,
    cardNote: 'Clear, but the person asking may not want to click a card that says "recognition" about themselves.',
  },
  {
    n: 8, label: 'Hafeezah - improvement plan',
    scenario: GroundScenario.PIP, moment: GroundMoment.STARTING,
    cadence: Cadence.WEEKLY, timelineDays: 60, sessions: 8,
    lead: 'kennedy', participants: ['hafeezah'], peopleWorkTogether: true,
    brief: 'A formal improvement plan, run fairly: the concern, the support available, and what success looks like at the end.',
    subject: 'the concern, the support available, and what success looks like',
    expectPaid: false,
    cardNote: 'The heaviest label on the board. Some managers will avoid it and pick "Something is off track" instead.',
  },
  {
    n: 9, label: 'Q3 goals across the team',
    scenario: GroundScenario.OKR_ALIGNMENT, moment: GroundMoment.STARTING,
    cadence: Cadence.WEEKLY, timelineDays: 90, sessions: 11,
    lead: 'hafsah',
    participants: ['kennedy', 'ejiro', 'maureen', 'eric', 'abubakar', 'nate'],
    peopleWorkTogether: true,
    brief: 'Checking everyone is genuinely on the same goals and plan, and catching the gaps and overlaps before the cycle locks in.',
    subject: 'whether our goals actually connect, and where they overlap or leave a gap',
    expectPaid: false,
    cardNote: '"Goals & planning" versus "Workplan & budget" is a real coin-flip for a planning-season ground.',
  },
  {
    n: 10, label: 'Q3 workplan and budget',
    scenario: GroundScenario.WORKPLAN_BUDGET, moment: GroundMoment.STARTING,
    cadence: Cadence.FORTNIGHTLY, timelineDays: 90, sessions: 6,
    lead: 'eric', participants: ['maureen', 'ejiro', 'kavon'], peopleWorkTogether: true,
    brief: 'Each person has actually built their plan and budget, and it holds up against the resources available.',
    subject: 'whether each plan and budget holds up against the resources we actually have',
    expectPaid: false,
    cardNote: 'Same coin-flip as ground 9, from the other side. Last free ground.',
  },
  {
    n: 11, label: 'Weekly pulse - delivery',
    scenario: GroundScenario.PULSE_CHECK, moment: GroundMoment.RECOGNITION,
    cadence: Cadence.WEEKLY, timelineDays: 112, sessions: 16,
    lead: 'hafsah',
    participants: ['abubakar', 'kavon', 'adam', 'nate', 'ejiro'], peopleWorkTogether: true,
    brief: 'A fast repeatable read from each person on what is moving, what is stuck, and what has changed.',
    subject: 'what is moving, what is stuck, what changed this week',
    expectPaid: true,
    cardNote: 'Clear. THE PAYWALL SHOULD FIRE BEFORE THIS ONE OPENS - it is the eleventh.',
  },
  {
    n: 12, label: 'Delivery slipped - what actually happened',
    scenario: GroundScenario.DRIFT, moment: GroundMoment.RESOLUTION,
    cadence: Cadence.ONE_TIME, timelineDays: 7, sessions: 1,
    lead: 'kennedy', participants: ['nate', 'adam'], peopleWorkTogether: true,
    brief: 'Naming what was agreed, what actually happened, and the exact gap, so a vague worry becomes something you can act on.',
    subject: 'what was agreed, what actually happened, and the gap',
    expectPaid: true,
    cardNote: 'Overlaps hard with "Performance improvement plan" if the worry is about a person rather than a project.',
  },
  {
    n: 13, label: 'Strategy read before the offsite',
    scenario: GroundScenario.BOARD_STRATEGY, moment: GroundMoment.STARTING,
    cadence: Cadence.WEEKLY, timelineDays: 14, sessions: 2,
    lead: 'hafsah', participants: ['kennedy', 'abubakar', 'maureen'], peopleWorkTogether: true,
    brief: 'Each leader gives their own read on strategy before the room debates it, so quiet disagreement shows up now rather than after the decision.',
    subject: 'my honest read on the strategy, before the room talks',
    expectPaid: true,
    cardNote: 'Clear for a board. A startup team without a board may not think it applies to them.',
  },
  {
    n: 14, label: 'Field officers - ongoing cohort read',
    scenario: GroundScenario.COHORT_CHECK, moment: GroundMoment.RECOGNITION,
    cadence: Cadence.WEEKLY, timelineDays: 70, sessions: 10,
    lead: 'maureen',
    participants: ['abubakar', 'kavon', 'adam', 'nate', 'ejiro', 'eric', 'hafeezah', 'kennedy'],
    peopleWorkTogether: false,
    brief: 'Many people in the same role, each answering on their own, so the pattern shows without them swaying each other.',
    subject: 'how my own patch is going against the same questions everyone gets',
    expectPaid: true,
    cardNote: 'Now competing with the new "Onboarding a group" card. Right choice here is the recurring one.',
  },
  {
    n: 15, label: 'Clinic managers - onboarding and probation',
    scenario: GroundScenario.COHORT_CHECK, moment: GroundMoment.STARTING,
    cadence: Cadence.WEEKLY, timelineDays: 90, sessions: 12,
    lead: 'hafsah', participants: ['abubakar', 'kavon', 'adam', 'nate'],
    peopleWorkTogether: false,
    brief: 'Four newly hired clinic managers, each running a separate clinic. A three month onboarding that is also their probation.',
    subject: 'settling into the clinic, the protocol sign-offs, and what is in my way',
    expectPaid: true,
    cardNote: 'The card added for exactly this. Watch whether "Onboarding a group" is found over "Cohort check-in".',
  },
  {
    n: 16, label: 'The client pulled out overnight',
    scenario: GroundScenario.ACUTE_SHOCK, moment: GroundMoment.RESOLUTION,
    cadence: Cadence.ONE_TIME, timelineDays: 3, sessions: 1,
    lead: 'kennedy',
    participants: ['ejiro', 'eric', 'maureen', 'abubakar', 'nate', 'adam', 'kavon'],
    peopleWorkTogether: true,
    brief: 'A jarring event just happened. Get everyone honest read of what actually happened and where things really stand, before anyone decides anything.',
    subject: 'what I actually saw or was told, not the version going around',
    expectPaid: true,
    cardNote: 'Clear under pressure, which is when it will be picked.',
  },
  {
    n: 17, label: 'Team pulling two ways',
    scenario: GroundScenario.REALIGN_TEAM, moment: GroundMoment.RECOGNITION,
    cadence: Cadence.DAILY, timelineDays: 6, sessions: 2,
    lead: 'hafsah',
    participants: ['kennedy', 'ejiro', 'eric', 'maureen', 'abubakar'], peopleWorkTogether: true,
    brief: 'The team sees the situation differently. Each person gives their honest read before the group talks, so the conversation starts from a shared picture.',
    subject: 'where I actually think we are, before the meeting',
    expectPaid: true,
    cardNote: 'Overlaps with "A shock just hit" and "Something is off track". Three cards could fit a bad week.',
  },
  {
    n: 18, label: 'Described in her own words - clinic probation cohort',
    scenario: GroundScenario.REALIGN_TEAM, moment: GroundMoment.STARTING,
    cadence: Cadence.WEEKLY, timelineDays: 90, sessions: 12,
    lead: 'maureen',
    participants: ['abubakar', 'kavon', 'adam', 'nate', 'ejiro'], peopleWorkTogether: false,
    brief: 'Cohort onboarding for clinic managers on a three month probation who do not work together but share one onboarding source.',
    subject: 'settling into the clinic and the sign-offs, on a probation',
    expectPaid: true,
    cardNote: 'DELIBERATELY NOT PICKING A CARD - uses "Describe your own situation". The test is whether the ground it sets up matches what was described, or silently becomes something else.',
  },
];
