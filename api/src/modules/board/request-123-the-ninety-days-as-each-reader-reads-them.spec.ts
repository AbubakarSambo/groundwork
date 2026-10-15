import { GroundScenario, PartyType } from '@prisma/client';
import { person, boardAs, commitment, handoff, answered, THE_BOARDS_CLOCK } from './the-switchboards-sections-harness';

/**
 * REQUEST 123, THE REST: THE 90 DAYS, IN THREE STEPS, AS EACH READER READS IT.
 *
 * Amina runs the check-in; Tobi is the new hire, on day 32 of 90. The steps are plain sentences from the goals, the
 * commitments and the waits.
 */
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(THE_BOARDS_CLOCK.getTime() - days * DAY);
const PEOPLE = [
  person('p-amina', 'u-amina', 'Amina', 'Bello', PartyType.INITIATOR),
  person('p-tobi', 'u-tobi', 'Tobi', 'Adewale'),
];
const goal = (id: string, text: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', participantId: 'p-tobi', text, kind: 'GOAL', dueSaid: null, dueDate: null, status: 'OPEN', statusChangedAt: null,
  awareness: 'TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-01T09:00:00Z'), ...more,
});
const pattern = (id: string, code: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', participantId: 'p-tobi', code, status: 'SURFACED', observationText: 'The engine sentence.', seenInSessions: [1, 2, 3], periodsObserved: 3,
  readyAt: ago(1), shownToPersonAt: null, personAnswer: null, personAnsweredAt: null, leadMark: null, talkedAboutAt: null, talkedAboutAtPeriod: null,
  evidenceSource: 'model', lastSeenAt: ago(1), createdAt: ago(30), ...more,
});
const SETUP = {
  scenario: GroundScenario.NEW_HIRE, people: PEOPLE, initiatorId: 'u-amina', label: 'Engagement Director, first 90 days', peersVisibleToEachOther: false,
  clock: { startsAt: new Date('2026-09-01T08:00:00Z') },
  checkIns: [1, 2, 3].flatMap((n) => [answered('p-amina', n, `2026-09-0${n * 2}T16:00:00Z`), answered('p-tobi', n, `2026-09-0${n * 2}T17:00:00Z`)]),
  personObjectives: [
    goal('o-1', 'Know the five biggest clients', { dueDate: new Date('2026-09-30T00:00:00Z'), status: 'MET' }),
    goal('o-2', 'Make a first visit to each client', { dueDate: new Date('2026-09-29T00:00:00Z') }),
    goal('o-3', 'Lead one renewal conversation', { dueDate: new Date('2026-10-30T00:00:00Z') }),
    goal('o-4', 'Own all five client relationships', { dueDate: new Date('2026-11-29T00:00:00Z') }),
    goal('o-5', 'Take over the pricing decisions', { awareness: 'NOT_TOLD', dueDate: new Date('2026-09-29T00:00:00Z') }),
  ],
  commitments: [
    commitment('k-1', 'p-tobi', 'I will read the contract for each client.', { statedInSession: 1, saidWordForWord: true, status: 'DONE' }),
    commitment('k-2', 'p-tobi', 'I will visit the Lagos client.', { statedInSession: 2, saidWordForWord: true }),
  ],
  dependencies: [handoff('h-1', 'p-tobi', 'the commercial terms for each client', { onParticipantId: 'p-amina', status: 'WAITING', createdAt: new Date('2026-09-10T10:00:00Z') })],
  patterns: [
    pattern('pd-answered', 'A2', { shownToPersonAt: ago(2), personAnswer: 'Nobody gave me the terms', personAnsweredAt: ago(1) }),
    pattern('pd-new', 'K3', { readyAt: ago(0.1) }),
  ],
};

describe('request 123: the 90 days in three steps', () => {
  it('Amina reads each step in plain sentences, and the third as hers to decide', async () => {
    const b = await boardAs(SETUP as any, 'u-amina', 'MEMBER');
    expect(b.ninetyDays.heading).toBe('The 90 days, in three steps');
    expect(b.ninetyDays.steps.map((s: any) => s.question)).toEqual(['Is Tobi Adewale settled in?', 'Is Tobi Adewale doing the job?', 'What you need to decide']);
    expect(b.ninetyDays.steps.map((s: any) => s.says)).toEqual([
      '2 goals were agreed for Tobi Adewale to be met by day 30. 1 is marked met and 1 is still open. Tobi Adewale has made 2 commitments so far, and 1 is marked done.',
      'This step comes on 30 October. 1 goal was agreed for Tobi Adewale to be met by day 60. It is still open.',
      'This step comes on 29 November. 1 goal was agreed for Tobi Adewale to be met by day 90. It is still open.',
    ]);
    expect(JSON.stringify(b.ninetyDays)).not.toContain('pricing decisions');
  });

  it('Tobi reads the same steps as "you"', async () => {
    const b = await boardAs(SETUP as any, 'u-tobi', 'MEMBER');
    expect(b.ninetyDays.steps.map((s: any) => s.question)).toEqual(['Are you settled in?', 'Are you doing the job?', 'What Amina needs to decide']);
    expect(b.ninetyDays.steps[0].says).toBe('2 goals were agreed for you to be met by day 30. 1 is marked met and 1 is still open. You have made 2 commitments so far, and 1 is marked done.');
    expect(JSON.stringify(b.ninetyDays)).not.toContain('Tobi Adewale');
  });

  it('after day 60 the second step says what the person is waiting on', async () => {
    const b = await boardAs({ ...SETUP, clock: { startsAt: new Date('2026-08-01T08:00:00Z') } } as any, 'u-amina', 'MEMBER');
    expect(b.ninetyDays.steps[1].says).toContain('Tobi Adewale is waiting on you for the commercial terms for each client.');
  });
});
