import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, JUMA, RUKIA, SETUP_ADMIN, boardAs, commitment, type Setup } from './the-switchboards-sections-harness';

/**
 * THE WORK PLAN, AS EACH READER READS IT (request 70, the switchboard's "Work plan").
 *
 * Who is doing what, by when, and what happened to it. Each line is the same sentence the report writes
 * for a commitment, so the two never read differently.
 */
const RECORD: Setup = {
  commitments: [
    commitment('k-1', 'p-rukia', 'I will send the Westgate quote.', { whenSaid: 'by Friday', statedInSession: 1 }),
    commitment('k-2', 'p-baraka', 'I will call the Kisumu depot.', { status: 'DONE', settledBy: 'SAID', statedInSession: 1, settledAt: new Date('2026-09-09T10:00:00Z') }),
    commitment('k-3', 'p-amina', 'I will review the pricing.', { status: 'UNKNOWN', statedInSession: 1 }),
  ],
};
const lines = (b: any) => (b.workPlan ?? []).map((r: any) => r.says);

describe('The work plan, as each person reads it', () => {
  it('Amina reads every commitment, what is open first, with the time given and how it ended', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(lines(b)).toEqual([
      'In session 1, Rukia Mwangi committed to send the Westgate quote. The time Rukia Mwangi gave for it was by Friday. Nobody has said yet whether it happened.',
      'In session 1, you committed to review the pricing. Nobody has said yet whether it happened.',
      'In session 1, Baraka Otieno committed to call the Kisumu depot. Baraka Otieno said later that it was done.',
    ]);
    const first = b.workPlan[0];
    expect(first).toMatchObject({ participantId: 'p-rukia', who: 'Rukia Mwangi', when: 'by Friday', state: 'open', statedInSession: 1 });
  });

  /* Request 105 (the prototype's B5, "Only yours"): a person who checks in reads only their own line. Before,
     Rukia also read the lead's. */
  it('Rukia, where people do not see each other, reads only her own line', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...RUKIA);
    expect(lines(b)).toEqual([
      'In session 1, you committed to send the Westgate quote. The time you gave for it was by Friday. Nobody has said yet whether it happened.',
    ]);
    expect(JSON.stringify(b.workPlan)).not.toContain('pricing');
    expect(JSON.stringify(b.workPlan)).not.toContain('Kisumu');
    expect(JSON.stringify(b.workPlan)).not.toContain('Baraka');
  });

  it('Baraka reads his own, with the mark of how it ended in plain words', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...BARAKA);
    expect(lines(b)).toContain('In session 1, you committed to call the Kisumu depot. You said later that it was done.');
    expect(b.workPlan.every((r: any) => r.participantId !== 'p-rukia')).toBe(true);
  });

  it('an admin who only reads an ordinary check-in reads all three', async () => {
    expect(lines(await boardAs(RECORD, ...JUMA))).toHaveLength(3);
  });

  it('on an evaluation check-in the admin who set it up reads the plan, and another admin reads no board', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect(lines(await boardAs(evaluation, ...SETUP_ADMIN))).toHaveLength(3);
    const other = await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e);
    expect(other.workPlan).toBeUndefined();
  });

  /* CHANGED (1 October review, part 1): this used to expect the lead's commitment on the person's own work plan.
     On an evaluation check-in the lead's commitments are the lead's intentions about the person (one read
     "I will put a formal performance improvement plan in front of Nathan." before he was told), so the person
     reads only their own. See a-goal-the-lead-has-not-told-and-the-leads-own-words-on-an-evaluation-board. */
  it('on an evaluation check-in the person reads their own and no colleague\'s and not the lead\'s, even where people see each other', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, peersVisibleToEachOther: true };
    const b = await boardAs(evaluation, ...RUKIA);
    expect(b.workPlan.map((r: any) => r.participantId)).toEqual(['p-rukia']);
  });

  it('serves nothing where nobody has committed to anything', async () => {
    expect((await boardAs({}, ...AMINA)).workPlan).toBeUndefined();
  });
});
