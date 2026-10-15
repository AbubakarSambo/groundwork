import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, JUMA, RUKIA, SETUP_ADMIN, boardAs, commitment, handoff, type Setup } from './the-switchboards-sections-harness';

/**
 * RISKS, AS EACH READER READS THEM (request 70, the switchboard's "Risks").
 *
 * What could go wrong, from the record only: a handoff nobody can move on, a commitment with no time, a
 * commitment said again and again and still open, and a target nobody owns. Each comes with the facts it
 * rests on, and none of it rates or labels anybody.
 */
const RECORD: Setup = {
  turns: [{ checkInId: 'c1-p-rukia', content: 'I emailed twice.' }, { checkInId: 'c1-p-rukia', content: 'by Friday' }],
  commitments: [
    commitment('k-1', 'p-rukia', 'I will send the Westgate quote.'),
    commitment('k-2', 'p-baraka', 'I will call the Kisumu depot.', { whenSaid: 'by Friday', saidAgainIn: [] }),
    commitment('k-3', 'p-rukia', 'I will finish the stock count.', { whenSaid: 'this week', saidAgainIn: [2, 3] }),
  ],
  dependencies: [
    handoff('d-1', 'p-rukia', 'the credit terms', { onLabel: 'Finance', dueSaid: 'by Friday', triedSaid: 'I emailed twice.', sourceCheckInId: 'c1-p-rukia' }),
    handoff('d-2', 'p-baraka', 'the depot keys', { onParticipantId: 'p-rukia', status: 'WAITING' }),
  ],
};
const says = (b: any) => (b.risks ?? []).map((r: any) => r.says);

describe('Risks, as each person reads them', () => {
  it('Amina, who runs it, reads all of them, in full sentences, each with the facts behind it', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(says(b)).toEqual([
      'Rukia Mwangi cannot move on the credit terms until it comes from Finance.',
      'Baraka Otieno says the work is waiting on Rukia Mwangi for the depot keys. Not backed: no attempt to unblock mentioned. Baraka Otieno could have messaged Rukia Mwangi, asked again, or raised it with you.',
      'Rukia Mwangi committed to send the Westgate quote, and no time was given for it, so nobody can tell when it would be late.',
      'Rukia Mwangi committed to finish the stock count, and it has come up 3 times now without anybody saying it happened.',
    ]);
    expect(b.risks[0].because).toBe('It was first said on 3 September. About what has been tried, Rukia Mwangi said, "I emailed twice." The time given for it was "by Friday".');
    expect(b.risks[1].because).toBe('It was first said on 3 September. Nobody has said what has been tried. No time has been given for it.');
    expect(b.risks[3].because).toBe('It was first said in session 1 and said again in sessions 2 and 3.');
  });

  it('Rukia reads her own commitments and the waits she is in, with "You", and a colleague who may not be named to her is "a colleague"', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...RUKIA);
    expect(says(b)).toEqual([
      'You cannot move on the credit terms until it comes from Finance.',
      'A colleague says the work is waiting on you for the depot keys. Not backed: no attempt to unblock mentioned. A colleague could have messaged you, asked again, or raised it with Amina Wanjiru.',
      'You committed to send the Westgate quote, and no time was given for it, so nobody can tell when it would be late.',
      'You committed to finish the stock count, and it has come up 3 times now without anybody saying it happened.',
    ]);
  });

  it('Baraka, where people do not see each other, reads only the wait he is in, and never a colleague\'s commitments or name', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...BARAKA);
    expect(says(b)).toEqual(['You say the work is waiting on a colleague for the depot keys. Not backed: no attempt to unblock mentioned. You could have messaged a colleague, asked again, or raised it with Amina Wanjiru.']);
    expect(JSON.stringify(b.risks)).not.toContain('Rukia');
    expect(JSON.stringify(b.risks)).not.toContain('Westgate');
  });

  it('an admin who only reads an ordinary check-in reads what the lead reads', async () => {
    const b = await boardAs(RECORD, ...JUMA);
    expect(says(b)).toHaveLength(4);
  });

  it('an admin with no access to an evaluation check-in reads no board at all, and the admin who set it up reads the risks', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    const asJuma = await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e);
    expect(asJuma.risks).toBeUndefined();
    expect(says(await boardAs(evaluation, ...SETUP_ADMIN))).toHaveLength(4);
  });

  it('is left out, rather than served empty, when the record holds nothing that could go wrong', async () => {
    expect((await boardAs({}, ...AMINA)).risks).toBeUndefined();
  });

  it('no sentence rates or labels a person', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    const all = JSON.stringify(b.risks);
    expect(all).not.toMatch(/at risk|unreliable|poor|weak|score|rating|verdict|slow/i);
  });
});
