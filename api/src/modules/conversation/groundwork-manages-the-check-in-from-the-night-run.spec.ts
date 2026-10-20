import { R2, theRunRebuiltEachEvening, theRunAsADatabase, thePersonOf } from '../board/the-persons-record-bed';
import { rebuildThePersonsRecords } from '../board/the-persons-record-store';
import { theManagingBlockFor, theTurnManaged, withProofAskedOnce, withNoLabelOnThem } from './groundwork-manages-the-check-in';

/**
 * INSIDE THE CHECK-IN, GROUNDWORK MANAGES (Groundwork does the managing, part 1), from the second night run.
 *
 * What the model is told for each person's next check-in, from their record as it was last built: what is late, with the day; what they
 * said and nothing shows, and whether it was asked for already; a figure that changed; and one line of coaching. And what is sent is
 * checked: what would show a claim is asked for once, and no label is put on the person. With the direct morning off, nothing is added
 * and nothing is cut.
 */
async function theBlockFor(g: 'drop' | 'fees', who: string, opts: { directMorning?: boolean; coach?: boolean } = {}) {
  const table = await theRunRebuiltEachEvening(g, rebuildThePersonsRecords);
  const prisma = theRunAsADatabase(g, { directMorning: opts.directMorning ?? true, personRecord: table });
  return { prisma, block: await theManagingBlockFor(prisma, { groundId: R2[g].ground.id, participantId: thePersonOf(g, who).participantId }, opts.coach ?? true) };
}

describe('what the model is told', () => {
  it('Aisha: her promise to Mr. Baraka is late with its day, FN-006 is only said and was asked about already, and her one line of coaching', async () => {
    const { block } = await theBlockFor('fees', 'Aisha');
    expect(block).toContain('  - "I\'ll follow up with Mr. Baraka." was due on Monday 19 October, and nothing they have said since shows it done.');
    expect(block).toContain('  - On Monday 19 October they said "FN-006 for Baraka Hardware has been paid." Nothing on file shows it. It was asked for already: do not ask for it again.');
    expect(block).toContain('  - On Monday 12 October they said "the bursar at Upendo Schools confirmed it\'s sorted." Nothing on file shows it. It has not been asked for yet.');
    expect(block).toContain('The line is "Add the photo, slip or link when you say something is done. For FN-009, that would be the payment slip, the bank statement or the M-Pesa message." It was first given after their check-in on Monday 12 October, and since then it has stayed the same.');
  });

  it('Joseph: his two figures for Mama Pima, to be put side by side once, plainly', async () => {
    const { block } = await theBlockFor('drop', 'Joseph');
    expect(block).toContain('  - Mama Pima Stores: 10 units on Monday 12 October, then 15 units on Tuesday 13 October. It has not been asked about yet.');
    expect(block).toContain('"On Monday you said 10 units for Mama Pima Stores, and on Tuesday 15. Which is it now, and what shows it?"');
  });

  it('Kevin: only the Roysambu order, which was asked for already, and no coaching', async () => {
    const { block } = await theBlockFor('drop', 'Kevin');
    expect(block).toContain('  - On Monday 19 October they said "Roysambu Gym signed the order for 3 units today." Nothing on file shows it. It was asked for already: do not ask for it again.');
    expect(block).not.toMatch(/Kilele|Savannah|RCD8M1LS4W/);
    expect(block).not.toContain('ONE LINE OF COACHING');
  });

  it('Mercy and Njeri: nothing to manage', async () => {
    expect((await theBlockFor('drop', 'Mercy')).block).toBe('');
    expect((await theBlockFor('fees', 'Njeri')).block).toBe('');
  });

  it('with judgements of a person off, the facts stay and the coaching line goes', async () => {
    const { block } = await theBlockFor('fees', 'Aisha', { coach: false });
    expect(block).toContain('FN-006 for Baraka Hardware has been paid.');
    expect(block).not.toContain('ONE LINE OF COACHING');
  });

  it('with the direct morning off, nothing is added for anybody', async () => {
    for (const [g, who] of [['fees', 'Aisha'], ['drop', 'Joseph'], ['drop', 'Kevin']] as const) {
      expect((await theBlockFor(g, who, { directMorning: false })).block).toBe('');
    }
  });
});

describe('what is sent', () => {
  const said = [{ text: 'FN-006 for Baraka Hardware has been paid', at: '2026-10-19T07:05:00Z' }];
  const askedOnce = [{ content: 'Could you send the bank slip for FN-006?', at: '2026-10-19T07:05:10Z' }];

  it('asks for what would show FN-006 once, and not a second time', () => {
    expect(withProofAskedOnce('Could you send the bank slip for FN-006?', ['FN-006'], said, []).cut).toEqual([]);
    expect(withProofAskedOnce('Thanks. Do you have the bank slip for FN-006 now?', ['FN-006'], said, askedOnce)).toEqual({ text: 'Thanks. What else should I know?', cut: ['Do you have the bank slip for FN-006 now?'] });
  });

  it('a new claim about it may be asked about once again', () => {
    const again = [...said, { text: 'FN-006 is paid now, Mr. Baraka sent it on Friday.', at: '2026-10-26T07:00:00Z' }];
    expect(withProofAskedOnce('Could you add the bank slip for FN-006?', ['FN-006'], again, askedOnce).cut).toEqual([]);
  });

  it('never a label on the person', () => {
    expect(withNoLabelOnThem('You are at risk of missing your target. What would help this week?').cut).toEqual(['You are at risk of missing your target.']);
    expect(withNoLabelOnThem('The Mama Pima deal is at risk. What would help this week?').cut).toEqual([]);
  });

  it('with the direct morning off, the turn is sent exactly as written', async () => {
    const { prisma } = await theBlockFor('fees', 'Aisha', { directMorning: false });
    const raw = 'You are at risk of missing your target. Could you send the bank slip for FN-006?';
    expect(await theTurnManaged(prisma, { groundId: R2.fees.ground.id, participantId: thePersonOf('fees', 'Aisha').participantId }, raw)).toEqual({ text: raw, cut: [] });
  });

  it('with it on, Aisha is not asked again for the FN-006 slip she was asked for on Monday 19 October', async () => {
    const { prisma } = await theBlockFor('fees', 'Aisha');
    const out = await theTurnManaged(prisma, { groundId: R2.fees.ground.id, participantId: thePersonOf('fees', 'Aisha').participantId }, 'Thanks for that. Could you send me the bank slip for FN-006?');
    expect(out.cut).toEqual(['Could you send me the bank slip for FN-006?']);
  });
});
