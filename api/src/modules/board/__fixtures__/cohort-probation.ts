import { CheckInStatus, DependencyStatus } from '@prisma/client';
import type { ReadInput } from '../reads';

/**
 * A COHORT WHERE NOBODY WORKS TOGETHER, AND THE PERIOD DECIDES SOMEONE'S JOB.
 *
 * Unlike real-run.json beside this file, this is NOT captured model output. It is
 * a designed fixture: the record four clinic managers would leave if each ran a
 * separate clinic in a different town, all onboarding at once under one shared
 * trainer, over twelve weekly sessions that double as their probation.
 *
 * It is hand-built on purpose, because the situation it describes is the one the
 * board is most likely to get wrong and the one we cannot yet produce live. What
 * it encodes is structural, not stylistic:
 *
 *   NO CROSS-ATTRIBUTION IS POSSIBLE. These four never see each other's work, so
 *   nobody can credit anybody and nobody can cover for anybody. Every fairness
 *   read on the board is built on colleagues describing each other - and here
 *   there are no colleagues. The only cross-person link that can honestly exist
 *   is each manager naming the shared trainer as what they are waiting on.
 *
 *   WHICH REMOVES THE SAFETY NET. The protection for the quiet, competent person
 *   works by noticing that others keep crediting them while their own account
 *   goes modest. Here there is nobody to do the crediting. So the modest
 *   engineer's equivalent - the manager who does the work and describes it as
 *   "fine" - has no evidence in his favour at all, on a ground that decides
 *   whether he keeps his job.
 *
 * Session-by-session shapes match journey/personas-cohort.ts, so a live run can
 * later be compared against the same expectations.
 */

const S = CheckInStatus.COMPLETED;
const PEOPLE = ['hafsah', 'adam', 'abubakar', 'nate', 'kavon'];
const SESSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** HIGH/MEDIUM = checkable. LOW = said, but nobody else could verify it. */
const e = (participantId: string, sessionNumber: number, tier: 'HIGH' | 'MEDIUM' | 'LOW', text: string) => ({
  participantId,
  sessionNumber,
  text: `[VERIFIABILITY:${tier}] ${text}`,
});

export const COHORT_PROBATION: ReadInput = {
  // A cohort by definition: same role, separate places, deliberately not
  // influencing each other. Nobody can corroborate anybody.
  peopleWorkTogether: false,

  participants: [
    {
      id: 'hafsah',
      roleAsDescribed: 'Clinical operations lead. Runs onboarding for the four new clinic managers.',
      managingOnly: false,
      detectedFunction: 'MANAGEMENT',
      detectedFunctionConfidence: 0.8,
    },
    ...['adam', 'abubakar', 'nate', 'kavon'].map((id) => ({
      id,
      roleAsDescribed: 'Clinic manager. Protocol sign-off, run the clinic, be safe unsupervised.',
      managingOnly: false,
      detectedFunction: 'OPERATIONS',
      detectedFunctionConfidence: 0.8,
    })),
  ],

  checkIns: PEOPLE.flatMap((participantId) =>
    SESSIONS.map((sessionNumber) => ({ participantId, sessionNumber, status: S })),
  ),

  entries: [
    // ADAM - specific and ahead the whole way. Any negative read is a false positive.
    ...SESSIONS.map((n) =>
      e('adam', n, n % 3 === 0 ? 'HIGH' : 'MEDIUM', `Modules ${n * 1} and ${n * 1 + 1} signed off, ${90 + n} patients seen this week`),
    ),
    e('adam', 3, 'HIGH', 'Needle-stick incident on Tuesday, reported within the hour, staff member seen same day'),
    e('adam', 5, 'HIGH', 'First full audit submitted on the fourteenth, two minor findings both closed'),
    e('adam', 9, 'HIGH', 'Priya and Tom are through module eight'),

    // ABUBAKAR - does the work, describes it in the flattest possible words.
    // THE HARD CASE: nothing here is checkable, and there is nobody who could
    // corroborate him even in principle.
    ...SESSIONS.map((n) => e('abubakar', n, 'LOW', n % 2 ? 'Fine week, ticking along' : 'All good, nothing to report')),
    // Two genuine facts, buried in twelve weeks of understatement.
    e('abubakar', 7, 'MEDIUM', 'I finished the modules this week, all fourteen'),
    e('abubakar', 10, 'MEDIUM', 'Signed off unsupervised now'),

    // NATE - blocked by a regulator for six sessions, working around it all along.
    // The most damaging false positive available on a probation ground.
    ...[1, 2, 3, 4, 5, 6].map((n) =>
      e('nate', n, 'MEDIUM', `Modules ${n} and ${n + 1} done, licence variation still with the regulator`),
    ),
    e('nate', 3, 'MEDIUM', 'Wrote the job descriptions and lined up two candidates so I can move the day it clears'),
    e('nate', 4, 'HIGH', 'Called the regulator directly and got a reference number'),
    e('nate', 7, 'HIGH', 'All fourteen modules done at week seven'),
    e('nate', 8, 'HIGH', 'Variation approved on the eleventh, made offers to two candidates the same day'),
    e('nate', 9, 'HIGH', 'Second consulting room opened on the nineteenth, capacity now a hundred a week'),
    ...[10, 11, 12].map((n) => e('nate', n, 'MEDIUM', `Eight staff now, ${90 + n} patients this week`)),

    // KAVON - sounds engaged every week, says nothing anyone could check, and is
    // NOT blocked. The one person a concerned read is genuinely correct about.
    e('kavon', 1, 'LOW', 'Really pleased to be here, made a start on getting my head around it'),
    ...SESSIONS.slice(1).map((n) =>
      e('kavon', n, 'LOW', 'Going well, lots of small improvements, no blockers, everything I need'),
    ),
    e('kavon', 12, 'LOW', 'I have not got as far as I should have on the modules, nothing was blocking me'),

    // HAFSAH - the shared trainer. Attends to two of the four, and says so.
    ...SESSIONS.map((n) => e('hafsah', n, n === 1 ? 'MEDIUM' : 'LOW', `Onboarding running, got to two of them properly in week ${n}`)),
    e('hafsah', 9, 'MEDIUM', 'Sat down with Kavon and asked for specifics this week'),
    e('hafsah', 12, 'MEDIUM', 'Extending Kavon rather than deciding, I do not have enough to decide on'),
  ],

  // THE WHOLE POINT: the only cross-person links that can honestly exist here.
  // Three of the four name the trainer as what they are waiting on. Nobody
  // credits anybody, because nobody can see anybody else's clinic.
  mentions: [
    { sourceParticipantId: 'nate', aboutParticipantId: 'hafsah', kind: 'BLOCKED_BY', sessionNumber: 2 },
    { sourceParticipantId: 'nate', aboutParticipantId: 'hafsah', kind: 'BLOCKED_BY', sessionNumber: 3 },
    { sourceParticipantId: 'nate', aboutParticipantId: 'hafsah', kind: 'BLOCKED_BY', sessionNumber: 5 },
    { sourceParticipantId: 'nate', aboutParticipantId: 'hafsah', kind: 'BLOCKED_BY', sessionNumber: 6 },
    { sourceParticipantId: 'abubakar', aboutParticipantId: 'hafsah', kind: 'BLOCKED_BY', sessionNumber: 8 },
    { sourceParticipantId: 'abubakar', aboutParticipantId: 'hafsah', kind: 'BLOCKED_BY', sessionNumber: 9 },
  ],

  dependencies: [
    {
      fromParticipantId: 'nate',
      onParticipantId: null,
      onLabel: 'the regulator',
      what: 'the licence variation for the second consulting room',
      status: DependencyStatus.CLEARED,
      createdAt: 1,
    },
    {
      fromParticipantId: 'abubakar',
      onParticipantId: 'hafsah',
      onLabel: null,
      what: 'the unsupervised sign-off visit',
      status: DependencyStatus.CLEARED,
      createdAt: 2,
    },
  ],
};

/** What is ACTUALLY true, written from the scripted shapes rather than opinion. */
export const COHORT_TRUTH = [
  {
    key: 'adam',
    name: 'Adam Grunewald',
    truth: 'Specific and ahead every week. Any negative read is a false positive.',
    mustNotBeFlagged: true,
  },
  {
    key: 'abubakar',
    name: 'Abubakar Sambo',
    truth:
      'Did the work and described it as "fine" for twelve weeks. Finished the modules and got signed off. NOBODY CAN CORROBORATE HIM - the four never see each other - so the usual protection for the quiet contributor has nothing to stand on. Must not be read as losing ownership of his work.',
    mustNotBeFlagged: true,
  },
  {
    key: 'nate',
    name: 'Nate Peterson',
    truth:
      'Blocked by a regulator for six weeks and worked around it the whole time, then converted in a day. Reading him as weak for the role would cost him his job over something no effort of his could change.',
    mustNotBeFlagged: true,
  },
  {
    key: 'kavon',
    name: 'Kavon Badie',
    truth:
      'Sounds engaged every week, names nothing checkable in twelve, and is not blocked. The one person a concerned read is correct about - but it must arrive as "nothing here can be checked" rather than as a verdict on him.',
    mustNotBeFlagged: false,
  },
  {
    key: 'hafsah',
    name: 'Hafsah Jumare',
    truth:
      'The shared trainer, and the only thing the four have in common. Two of them named her as what they were waiting on across four and two sessions. Attended to two of the four and left the weakest one until session nine.',
    mustNotBeFlagged: true,
  },
];
