import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, JUMA, RUKIA, SETUP_ADMIN, boardAs, commitment, handoff, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * BUSY OR MOVING, AS EACH READER READS IT (request 70, the switchboard's "Busy or moving").
 *
 * How much of what a person said turned into something that happened, as counts from the record, for
 * whoever runs the check-in only. It never says a person is busy, slow or moving, and it says what the
 * counts cannot tell anybody.
 */
const RECORD: Setup = {
  checkIns: [answered('p-rukia', 1), answered('p-rukia', 2, '2026-09-16T16:00:00Z'), answered('p-baraka', 1)],
  commitments: [
    commitment('k-1', 'p-rukia', 'I will send the Westgate quote.', { status: 'DONE' }),
    commitment('k-2', 'p-rukia', 'I will finish the stock count.'),
    commitment('k-3', 'p-rukia', 'I will call Finance.'),
    commitment('k-4', 'p-baraka', 'I will call the Kisumu depot.'),
  ],
  dependencies: [
    handoff('d-1', 'p-rukia', 'the credit terms', { onLabel: 'Finance', status: 'CLEARED', clearedAt: new Date('2026-09-09T09:00:00Z') }),
    handoff('d-2', 'p-rukia', 'the depot keys'),
  ],
};

describe('Busy or moving, as each person reads it', () => {
  it('Amina reads each person\'s counts, in plain sentences, and what the counts cannot tell her', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(b.busyOrMoving.eachPerson).toEqual([
      { participantId: 'p-rukia', who: 'Rukia Mwangi', says: 'Rukia Mwangi has made 3 commitments across 2 answered sessions. Rukia Mwangi also named 2 things the work was waiting on.' },
      { participantId: 'p-baraka', who: 'Baraka Otieno', says: 'Baraka Otieno has made 1 commitment across 1 answered session.' },
    ]);
    expect(b.busyOrMoving.cannotTellYou).toBe('These are counts of what people said and what came of it. The record does not show how hard anybody worked, or whether the work itself moved, so nothing here says that.');
  });

  it('nobody who does not run the check-in reads it, not even about themselves', async () => {
    for (const who of [RUKIA, BARAKA] as const) {
      expect((await boardAs(RECORD, who[0], who[1])).busyOrMoving).toBeUndefined();
      expect((await boardAs({ ...RECORD, peersVisibleToEachOther: false }, who[0], who[1])).busyOrMoving).toBeUndefined();
    }
  });

  it('an admin who only reads an ordinary check-in reads it, as they read every other row', async () => {
    expect((await boardAs(RECORD, ...JUMA)).busyOrMoving.eachPerson).toHaveLength(2);
  });

  it('on an evaluation check-in the admin who set it up reads it, and another admin reads no board', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect((await boardAs(evaluation, ...SETUP_ADMIN)).busyOrMoving.eachPerson).toHaveLength(2);
    expect((await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e)).busyOrMoving).toBeUndefined();
  });

  it('carries no count of how many were kept or cleared, for the lead or anybody else', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    for (const b of [await boardAs(RECORD, ...AMINA), await boardAs(RECORD, ...JUMA), await boardAs(evaluation, ...SETUP_ADMIN)]) {
      expect(JSON.stringify(b.busyOrMoving)).not.toMatch(/\bdone\b|kept|cleared|dropped/);
    }
  });

  it('says no label, and does not call anybody busy or slow', async () => {
    const all = JSON.stringify((await boardAs(RECORD, ...AMINA)).busyOrMoving);
    expect(all).not.toMatch(/\bbusy\b|slow|lazy|productive|score|rating|at risk|underperform|behind/i);
  });

  it('serves nothing where nobody has answered, or there is nothing to count', async () => {
    expect((await boardAs({ checkIns: [], commitments: RECORD.commitments }, ...AMINA)).busyOrMoving).toBeUndefined();
    expect((await boardAs({}, ...AMINA)).busyOrMoving).toBeUndefined();
  });
});
