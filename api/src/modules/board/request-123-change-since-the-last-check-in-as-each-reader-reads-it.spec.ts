import { GroundScenario, PartyType } from '@prisma/client';
import { person, boardAs, commitment, handoff, answered } from './the-switchboards-sections-harness';

/**
 * REQUEST 123: "CHANGE SINCE LAST CHECK-IN" ON A NEW HIRE'S BOARD, AS EACH READER READS IT.
 *
 * Nothing was sent for it. Now one row per area comes from the record between the last two finished sessions:
 * the commitments, the waits, and each goal told to Tobi. Amina runs it; Tobi is the new hire; Juma is an
 * admin with no access to this evaluation check-in.
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
  checkIns: [
    answered('p-amina', 1, '2026-09-01T16:00:00Z'), answered('p-tobi', 1, '2026-09-01T17:00:00Z'),
    answered('p-tobi', 2, '2026-09-08T17:00:00Z'), answered('p-tobi', 3, '2026-09-15T17:00:00Z'),
  ],
  commitments: [
    commitment('k-1', 'p-tobi', 'I will read the contract for each of the five clients.', { statedInSession: 1, saidWordForWord: true }),
    commitment('k-2', 'p-tobi', 'I will visit two clients.', { statedInSession: 2, status: 'DONE', settledBy: 'SAID', settledAt: new Date('2026-09-15T16:00:00Z') }),
    commitment('k-3', 'p-tobi', 'I will send the renewal list.', { statedInSession: 3 }),
  ],
  dependencies: [
    handoff('d-1', 'p-tobi', 'the commercial terms for each client', { onParticipantId: 'p-amina', createdAt: new Date('2026-09-02T09:00:00Z') }),
    handoff('d-2', 'p-tobi', 'access to the client folders', { createdAt: new Date('2026-09-14T09:00:00Z'), clearedAt: new Date('2026-09-15T12:00:00Z'), status: 'CLEARED' }),
  ],
  personObjectives: [
    goal('o-1', 'Know the five biggest clients', { dueDate: new Date('2026-09-10T00:00:00Z') }),
    goal('o-2', 'Lead a renewal conversation', { status: 'MET', statusChangedAt: new Date('2026-09-15T16:30:00Z'), dueDate: new Date('2026-12-01T00:00:00Z') }),
    goal('o-3', 'Take over the pricing decisions', { awareness: 'NOT_TOLD', dueDate: new Date('2026-09-10T00:00:00Z') }),
    goal('o-4', 'Own all five clients', { dueDate: new Date('2026-12-01T00:00:00Z') }),
  ],
};

describe('request 123: change since last check-in, as each reader reads it', () => {
  it('Amina reads one row per area between session 2 and session 3, moved, held or late', async () => {
    const b = await boardAs(SETUP, 'u-amina', 'MEMBER');
    expect(b.changeSinceLast.heading).toBe('Change since last check-in');
    expect(b.changeSinceLast.between).toBe('Between session 2 and session 3.');
    const row = (area: string) => b.changeSinceLast.rows.find((r: any) => r.area === area);
    expect(row('Commitments')).toMatchObject({
      state: 'late',
      says: 'Tobi Adewale made 1 commitment in session 3. Of Tobi Adewale\'s commitments, 1 was marked done since session 2. Tobi Adewale still has 1 commitment open from before session 2.',
    });
    expect(row('Waits')).toMatchObject({
      state: 'late',
      says: 'Tobi Adewale is waiting on you for the commercial terms for each client, and has been since 2 September. The wait for access to the client folders was cleared on 15 September.',
    });
    expect(row('Know the five biggest clients')).toMatchObject({ state: 'late', says: 'This goal was due on 10 September and is still open.' });
    expect(row('Lead a renewal conversation')).toMatchObject({ state: 'moved', says: 'This goal was marked met between session 2 and session 3.' });
    expect(row('Own all five clients')).toMatchObject({ state: 'held', says: 'Nothing has changed on this goal between session 2 and session 3.' });
    expect(JSON.stringify(b.changeSinceLast)).not.toContain('pricing decisions');
  });

  it('Tobi reads the same rows with "you", never the lead\'s goal that has not been told', async () => {
    const b = await boardAs(SETUP, 'u-tobi', 'MEMBER');
    const says = b.changeSinceLast.rows.map((r: any) => r.says).join(' ');
    expect(says).toContain('You made 1 commitment in session 3.');
    expect(says).toContain('You still have 1 commitment open from before session 2.');
    expect(says).toContain('You are waiting on Amina Bello for the commercial terms for each client');
    expect(says).not.toContain('Tobi Adewale');
    expect(JSON.stringify(b.changeSinceLast)).not.toContain('pricing decisions');
  });

  it('an admin with no access to this evaluation check-in reads nothing of it', async () => {
    const b = await boardAs(SETUP, 'u-juma', 'ADMIN').then((x) => x, (e) => e);
    expect(b instanceof Error ? undefined : b.changeSinceLast).toBeUndefined();
  });

  it('with one finished session there is no "last check-in" to compare with, so nothing is sent', async () => {
    const b = await boardAs({ ...SETUP, checkIns: [answered('p-tobi', 1, '2026-09-01T17:00:00Z')] }, 'u-amina', 'MEMBER');
    expect(b.changeSinceLast).toBeUndefined();
  });

  it('a row with nothing changed is held, and says so in a sentence', async () => {
    const b = await boardAs({ ...SETUP, commitments: [commitment('k-9', 'p-tobi', 'I will visit two clients.', { statedInSession: 2 })], dependencies: [], personObjectives: [] }, 'u-amina', 'MEMBER');
    expect(b.changeSinceLast.rows).toEqual([expect.objectContaining({ area: 'Commitments', state: 'held', says: 'Nothing changed in the commitments between session 2 and session 3.' })]);
  });
});
