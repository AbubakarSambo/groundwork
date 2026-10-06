import { GroundScenario, PartyType } from '@prisma/client';
import { person, boardAs, commitment, answered } from './the-switchboards-sections-harness';

/**
 * REQUEST 123: "WHAT WAS AGREED AT THE START" ON A NEW HIRE'S BOARD, AS EACH READER READS IT.
 *
 * `startingState` was null on every first 90 days, so the screen could not draw the prototype's list of what
 * was agreed on day 1 and by day 30, 60 and 90 (B6-ending-a-check-in/day-30-and-60.txt). Amina runs the
 * check-in; Tobi is the new hire; Juma is an admin of the organisation with no access to it. The first
 * session's commitments and the goals told to Tobi make the list; a goal not told yet does not.
 */
const PEOPLE = [
  person('p-amina', 'u-amina', 'Amina', 'Bello', PartyType.INITIATOR),
  person('p-tobi', 'u-tobi', 'Tobi', 'Adewale'),
];
const goal = (id: string, text: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', participantId: 'p-tobi', text, kind: 'GOAL', dueSaid: null, dueDate: null, status: 'OPEN', statusChangedAt: null,
  awareness: 'TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-01T09:00:00Z'), ...more,
});
const SETUP = {
  scenario: GroundScenario.NEW_HIRE, people: PEOPLE, initiatorId: 'u-amina', label: 'Engagement Director, first 90 days', peersVisibleToEachOther: false,
  clock: { startsAt: new Date('2026-09-01T08:00:00Z') },
  checkIns: [answered('p-amina', 1, '2026-09-01T16:00:00Z'), answered('p-tobi', 1, '2026-09-01T17:00:00Z'), answered('p-tobi', 2, '2026-09-08T17:00:00Z')],
  personObjectives: [
    goal('o-1', 'Know the five biggest clients and what each one buys', { dueDate: new Date('2026-09-30T00:00:00Z') }),
    goal('o-2', 'Lead the renewal conversation for one client', { dueDate: new Date('2026-10-30T00:00:00Z') }),
    goal('o-3', 'Own the relationship with all five clients', { dueDate: new Date('2026-11-29T00:00:00Z') }),
    goal('o-4', 'Make a first visit to each client', { dueSaid: 'in the first week' }),
    goal('o-5', 'Take over the pricing decisions', { awareness: 'NOT_TOLD', dueDate: new Date('2026-11-29T00:00:00Z') }),
  ],
  commitments: [
    commitment('k-1', 'p-tobi', 'I will read the contract for each of the five clients.', { statedInSession: 1, saidWordForWord: true }),
    commitment('k-2', 'p-tobi', 'I will ask Amina for the commercial terms.', { statedInSession: 2, saidWordForWord: true }),
  ],
};

const everything = (b: any) => JSON.stringify(b.startingState ?? null);

describe('request 123: what was agreed at the start, as each reader reads it', () => {
  it('Amina, who runs it, reads what was agreed on day 1 and by day 30, 60 and 90, and not the goal she has not told Tobi', async () => {
    const b = await boardAs(SETUP, 'u-amina', 'MEMBER');
    expect(b.startingState.heading).toBe('What was agreed at the start');
    expect(b.startingState.rows.map((r: any) => [r.when, r.kind])).toEqual([
      ['Day 1', 'goal'], ['Day 1', 'commitment'], ['By day 30', 'goal'], ['By day 60', 'goal'], ['By day 90', 'goal'],
    ]);
    const says = b.startingState.rows.map((r: any) => r.says);
    expect(says).toContain('A goal was agreed for Tobi Adewale, to be met by day 30.');
    expect(says).toContain('A goal was agreed for Tobi Adewale, to be met by day 90.');
    expect(says).toContain('A goal was agreed for Tobi Adewale, and the time given for it was "in the first week".');
    expect(b.startingState.rows.find((r: any) => r.when === 'By day 60').what).toBe('Lead the renewal conversation for one client');
    expect(everything(b)).not.toContain('pricing decisions');
    expect(everything(b)).not.toMatch(/session 2|commercial terms/);
  });

  it('Tobi reads the same list, as "you", with the goals told to him and what he said in the first session', async () => {
    const b = await boardAs(SETUP, 'u-tobi', 'MEMBER');
    const says = b.startingState.rows.map((r: any) => r.says);
    expect(says).toContain('A goal was agreed for you, to be met by day 30.');
    expect(b.startingState.rows.some((r: any) => r.kind === 'commitment' && /read the contract for each of the five clients/.test(r.says))).toBe(true);
    expect(b.startingState.rows.every((r: any) => r.whose === 'You')).toBe(true);
    expect(everything(b)).not.toContain('pricing decisions');
    expect(everything(b)).not.toContain('Tobi Adewale');
  });

  it('an admin of the organisation with no access to this evaluation check-in reads nothing of it', async () => {
    const b = await boardAs(SETUP, 'u-juma', 'ADMIN').then((x) => x, (e) => e);
    /* On an evaluation check-in such an admin is not let in at all; either way nothing of it is read. */
    expect(everything(b instanceof Error ? {} : b)).toBe('null');
  });

  it('the admin who set it up for Amina reads it as she does', async () => {
    const b = await boardAs({ ...SETUP, createdByUserId: 'u-setup' }, 'u-setup', 'ADMIN');
    expect(b.startingState.rows).toHaveLength(5);
  });

  it('a board on another family is unchanged: its starting state is still the sentence stored at creation', async () => {
    const b = await boardAs({ ...SETUP, scenario: GroundScenario.OKR_ALIGNMENT }, 'u-amina', 'MEMBER');
    expect(typeof b.startingState === 'string' || b.startingState === null).toBe(true);
  });

  it('with nothing agreed yet, nothing is sent', async () => {
    const b = await boardAs({ ...SETUP, personObjectives: [], commitments: [] }, 'u-amina', 'MEMBER');
    expect(b.startingState).toBeNull();
  });
});
