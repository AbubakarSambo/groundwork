import { ReportsController } from './reports.controller';
import { R2, theRunRebuiltEachEvening, theRunAsADatabase, thePersonOf, theLeadOfTheRun } from '../board/the-persons-record-bed';
import { rebuildThePersonsRecords } from '../board/the-persons-record-store';

/**
 * YOUR OWN REPORT CARRIES WHAT GROUNDWORK FOLLOWED UP FOR YOU (Groundwork does the managing, part 1), from the second night run, as each
 * reader is served one session's report through the controller.
 *
 * What they said in that session was sold, paid or signed and what shows it, their promises that are late now, and the coaching
 * Groundwork gave them and whether it worked. The reader's own alone: their place in the check-in is found from their sign-in. With the
 * direct morning off, the report is served exactly as before.
 */
const THE_REPORT = { sessionNumber: 0, whereThingsStand: { settled: ['a'] } };

async function served(g: 'drop' | 'fees', userId: string, sessionNumber: number, directMorning = true) {
  const table = await theRunRebuiltEachEvening(g, rebuildThePersonsRecords);
  const prisma = theRunAsADatabase(g, { directMorning, personRecord: table });
  const reports = { sessionReport: async () => structuredClone({ ...THE_REPORT, sessionNumber }), noteTheLeadRead: async () => undefined, theSwitchboardsPickFor: async () => ({}) };
  const controller = new (ReportsController as any)(reports, prisma);
  return controller.sessionReport(R2[g].ground.id, sessionNumber, userId, R2[g].ground.organizationId);
}

describe('with the direct morning on', () => {
  it('Aisha’s report for Monday 19 October says FN-006 is only said, her promise to Mr. Baraka is late, and what she was coached on', async () => {
    const r = await served('fees', thePersonOf('fees', 'Aisha').userId, 2);
    expect(r.yourRecord.heading).toBe('What Groundwork followed up for you');
    const said = r.yourRecord.parts.find((p: any) => p.heading === 'What you said and what shows it');
    expect(said.says).toBe('You said once that something was sold, paid or signed, and nothing on file shows it yet.');
    expect(said.evidence).toEqual(['On Monday 19 October you said “FN-006 for Baraka Hardware has been paid.” Nothing on file shows it yet.']);
    const promises = r.yourRecord.parts.find((p: any) => p.heading === 'Promises');
    expect(promises.evidence).toContain('You promised “I\'ll follow up with Mr. Baraka.” for Monday 19 October, and nothing you have said since shows it done.');
    expect(r.yourRecord.coaching[0]).toEqual({
      said: 'After your check-in on Monday 12 October, Groundwork told you “Add the photo, slip or link when you say something is done. For FN-009, that would be the payment slip, the bank statement or the M-Pesa message.”',
      since: 'Backing what you say with proof has stayed the same since then.',
    });
  });

  it('Joseph’s report for Wednesday 14 October says the deposit he said came, and that he took it back on Friday', async () => {
    const r = await served('drop', thePersonOf('drop', 'Joseph').userId, 3);
    const said = r.yourRecord.parts.find((p: any) => p.heading === 'What you said and what shows it');
    expect(said.evidence).toEqual(['On Wednesday 14 October you said “Mama Pima paid a deposit.” On Friday 16 October you said “The Mama Pima deposit hasn\'t actually come through yet, she\'s still choosing.”']);
  });

  it('Kevin’s report for Monday 19 October shows the M-Pesa code as proof, and the Roysambu order as only said, with no coaching', async () => {
    const r = await served('drop', thePersonOf('drop', 'Kevin').userId, 6);
    const said = r.yourRecord.parts.find((p: any) => p.heading === 'What you said and what shows it');
    expect(said.says).toBe('You said twice that something was sold, paid or signed. One of them has proof on file.');
    expect(said.toChange).toBeNull();
    expect(said.evidence).toEqual([
      'On Monday 19 October you said “Roysambu Gym signed the order for 3 units today.” Nothing on file shows it yet.',
      'On Monday 19 October you said “Jane paid the remaining KES 15,000 balance for the 6 Savannah Cafe units. The M-Pesa confirmation code is RCD8M1LS4W.” The M-Pesa code RCD8M1LS4W shows it.',
    ]);
    expect(r.yourRecord.coaching).toEqual([]);
  });

  it('Wanjiru, reading the same session, is served her own and nothing of Aisha’s', async () => {
    const r = await served('fees', theLeadOfTheRun('fees'), 2);
    expect(JSON.stringify(r.yourRecord ?? null)).not.toMatch(/Baraka|Jamii|Upendo|Aisha/);
  });
});

describe('with the direct morning off', () => {
  it('every reader’s report is served exactly as before, with nothing of their record', async () => {
    for (const [g, userId, n] of [['fees', thePersonOf('fees', 'Aisha').userId, 2], ['drop', thePersonOf('drop', 'Joseph').userId, 3], ['fees', theLeadOfTheRun('fees'), 2]] as const) {
      const r = await served(g, userId, n, false);
      expect(r).toEqual({ ...THE_REPORT, sessionNumber: n });
    }
  });
});
