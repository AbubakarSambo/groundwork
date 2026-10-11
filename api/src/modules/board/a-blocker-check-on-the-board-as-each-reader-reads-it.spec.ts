import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, JUMA, RUKIA, SETUP_ADMIN, boardAs, handoff, type Setup } from './the-switchboards-sections-harness';

/**
 * THE BLOCKER CHECK, AS EACH READER READS IT (request 70, the switchboard's "Blocker check").
 *
 * For every wait still open: whether somebody is named as holding it, whether the person said they went
 * back about it, and whether a time was given. Each is a fact in the record, said in a full sentence, and
 * a missing one is said as missing, not as a judgement on anybody.
 */
const RECORD: Setup = {
  turns: [{ checkInId: 'c1-p-rukia', content: 'I emailed twice.' }, { checkInId: 'c1-p-rukia', content: 'by Friday' }],
  dependencies: [
    handoff('d-1', 'p-rukia', 'the credit terms', { onLabel: 'Finance', dueSaid: 'by Friday', triedSaid: 'I emailed twice.', sourceCheckInId: 'c1-p-rukia' }),
    handoff('d-2', 'p-baraka', 'the depot keys', { onParticipantId: 'p-rukia', status: 'WAITING' }),
    handoff('d-3', 'p-baraka', 'the new price list'),
    handoff('d-4', 'p-rukia', 'the old invoice', { status: 'CLEARED', clearedAt: new Date('2026-09-05T09:00:00Z') }),
  ],
};
const check = (b: any, id: string) => (b.blockerCheck ?? []).find((x: any) => x.id === id);

describe('The blocker check, as each person reads it', () => {
  it('Amina reads every open wait with the three facts, and a cleared wait is not there', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(b.blockerCheck.map((x: any) => x.id).sort()).toEqual(['d-1', 'd-2', 'd-3']);
    expect(check(b, 'd-1')).toEqual({
      id: 'd-1', who: 'Rukia Mwangi', says: 'Rukia Mwangi is waiting on Finance for the credit terms.',
      namesWhoHoldsIt: true, saidWhatWasTried: true, timeGiven: true,
      checks: [
        'Finance holds it.',
        'About what has been tried, Rukia Mwangi said, "I emailed twice."',
        'The time given for it was "by Friday".',
      ],
    });
    expect(check(b, 'd-3')).toMatchObject({
      says: 'Baraka Otieno is waiting for the new price list.',
      namesWhoHoldsIt: false, saidWhatWasTried: false, timeGiven: false,
      checks: ['Nobody has been named as holding it.', 'Nobody has said what has been tried.', 'No time has been given for it.'],
    });
  });

  it('Baraka, where people do not see each other, reads only the waits he is in, and a colleague is "a colleague"', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...BARAKA);
    expect(b.blockerCheck.map((x: any) => x.id).sort()).toEqual(['d-2', 'd-3']);
    expect(check(b, 'd-2').says).toBe('You say the work is waiting on a colleague for the depot keys. Not backed: no attempt to unblock mentioned.');
    expect(check(b, 'd-2').checks[0]).toBe('A colleague holds it.');
    expect(JSON.stringify(b.blockerCheck)).not.toContain('Rukia');
  });

  it('Rukia reads the wait on her, as "you"', async () => {
    const b = await boardAs({ ...RECORD, peersVisibleToEachOther: false }, ...RUKIA);
    expect(check(b, 'd-2').says).toBe('A colleague says the work is waiting on you for the depot keys. Not backed: no attempt to unblock mentioned.');
    expect(check(b, 'd-1').checks[1]).toBe('About what has been tried, you said, "I emailed twice."');
  });

  it('an admin who only reads an ordinary check-in reads all three', async () => {
    expect((await boardAs(RECORD, ...JUMA)).blockerCheck).toHaveLength(3);
  });

  it('on an evaluation check-in the admin who set it up reads them and another admin reads no board', async () => {
    const evaluation: Setup = { ...RECORD, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    expect((await boardAs(evaluation, ...SETUP_ADMIN)).blockerCheck).toHaveLength(3);
    expect((await boardAs(evaluation, ...JUMA).then((b) => b, (e) => e)).blockerCheck).toBeUndefined();
  });

  it('serves nothing when no wait is open', async () => {
    expect((await boardAs({ dependencies: [RECORD.dependencies![3]] }, ...AMINA)).blockerCheck).toBeUndefined();
  });
});
