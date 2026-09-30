import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, JUMA, RUKIA, SETUP_ADMIN, boardAs, commitment, handoff, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * A PERSON'S HISTORY, AS EACH READER READS IT (request 70, the switchboard's "Person history").
 *
 * One person's record over time, session by session, in facts: what they committed to, what they named
 * the work as waiting on, what became of it. It is never a score or a verdict. The person reads their
 * own, whoever runs the check-in reads everybody's, and nobody reads a colleague's.
 */
const RECORD: Setup = {
  checkIns: [answered('p-rukia', 1, '2026-09-02T16:00:00Z'), answered('p-rukia', 2, '2026-09-16T16:00:00Z'), answered('p-baraka', 1, '2026-09-03T08:00:00Z')],
  commitments: [
    commitment('k-1', 'p-rukia', 'I will send the Westgate quote.', { statedInSession: 1 }),
    commitment('k-2', 'p-rukia', 'I will finish the stock count.', { statedInSession: 2, status: 'DONE' }),
    commitment('k-3', 'p-rukia', 'I will call Finance.', { statedInSession: 2, status: 'NOT_DONE' }),
    commitment('k-4', 'p-baraka', 'I will call the Kisumu depot.', { statedInSession: 1 }),
  ],
  dependencies: [handoff('d-1', 'p-rukia', 'the credit terms', { onLabel: 'Finance', sourceCheckInId: 'c1-p-rukia' })],
};
const byName = (b: any, id: string) => (b.personHistory ?? []).find((p: any) => p.participantId === id);

describe('A person\'s history, as each person reads it', () => {
  it('Amina reads every person who has answered, session by session, in counts and plain sentences', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(byName(b, 'p-rukia')).toEqual({
      participantId: 'p-rukia',
      who: 'Rukia Mwangi',
      says: 'Rukia Mwangi has answered 2 sessions and made 3 commitments.',
      sessions: [
        { n: 1, on: '2026-09-02', says: 'In session 1, Rukia Mwangi made 1 commitment and named 1 thing the work was waiting on.' },
        { n: 2, on: '2026-09-16', says: 'In session 2, Rukia Mwangi made 2 commitments.' },
      ],
    });
    expect(byName(b, 'p-baraka').says).toBe('Baraka Otieno has answered 1 session and made 1 commitment.');
  });

  it('Rukia reads only her own, as "You"', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...RUKIA);
    expect(b.personHistory).toHaveLength(1);
    expect(b.personHistory[0].says).toBe('You have answered 2 sessions and made 3 commitments. 1 is done, 1 is not done or dropped, and 1 is still open.');
    expect(b.personHistory[0].sessions[0].says).toBe('In session 1, you made 1 commitment and named 1 thing the work was waiting on.');
  });

  it('Baraka reads nothing about Rukia, even where people do see each other', async () => {
    const b = await boardAs(RECORD, ...BARAKA);
    expect(b.personHistory.map((p: any) => p.participantId)).toEqual(['p-baraka']);
    expect(JSON.stringify(b.personHistory)).not.toMatch(/Rukia|Westgate/);
  });

  it('an admin who only reads an ordinary check-in reads everybody\'s', async () => {
    expect((await boardAs(RECORD, ...JUMA)).personHistory).toHaveLength(2);
  });

  it('on an evaluation check-in the person reads their own, the admin who set it up reads all, and another admin reads no board', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect((await boardAs(evaluation, ...RUKIA)).personHistory.map((p: any) => p.participantId)).toEqual(['p-rukia']);
    expect((await boardAs(evaluation, ...SETUP_ADMIN)).personHistory).toHaveLength(2);
    expect((await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e)).personHistory).toBeUndefined();
  });

  it('how many were kept is the person\'s own: the lead, the admin who set it up and an admin never read a kept count for another person, and the person reads their own', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    const readers = [await boardAs(RECORD, ...AMINA), await boardAs(RECORD, ...JUMA), await boardAs(evaluation, ...SETUP_ADMIN)];
    for (const b of readers) {
      const all = JSON.stringify(b.personHistory);
      expect(all).not.toMatch(/ is done| are done|not done|dropped|still open/);
      expect(byName(b, 'p-rukia').says).toBe('Rukia Mwangi has answered 2 sessions and made 3 commitments.');
    }
    /* A colleague reads only their own tally, and none of Rukia's. */
    const asBaraka = (await boardAs(RECORD, ...BARAKA)).personHistory;
    expect(asBaraka.map((p: any) => p.participantId)).toEqual(['p-baraka']);
    expect((await boardAs(RECORD, ...RUKIA)).personHistory[0].says).toContain('1 is done');
  });

  it('is never a score, a label or a verdict', async () => {
    const all = JSON.stringify((await boardAs(RECORD, ...AMINA)).personHistory);
    expect(all).not.toMatch(/score|rating|rated|at risk|unreliable|poor|weak|good|bad|verdict|improv/i);
  });

  it('serves nothing for a person who has not answered yet', async () => {
    expect((await boardAs({ checkIns: [], commitments: RECORD.commitments }, ...AMINA)).personHistory).toBeUndefined();
  });
});
