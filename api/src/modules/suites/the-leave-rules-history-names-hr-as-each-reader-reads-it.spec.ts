import { aLeaveOrganisation } from './a-leave-organisation-for-specs';

/**
 * THE LEAVE RULES HISTORY NAMES WHOEVER LOOKS AFTER HR, AS GRACE, AN ADMIN, READS IT.
 *
 * Before this, every change that told HR read "HR is to be told of each approved request, but nobody is
 * named for HR yet." even when Joy looked after HR, because the history passed no name. It now names
 * whoever looked after HR when the rules changed.
 */

const TELL_HR = 'This was added. Joy Mutua, who looks after HR, is told of each approved request, on the leave board.';

describe('Grace reads the leave rules history', () => {
  it('names Joy, who looks after HR, when HR is told', async () => {
    const o = aLeaveOrganisation();
    await o.suites.setLeaveRules(o.as('u-grace'), { tellHr: 'approved' });
    const { changes } = await o.suites.rulesHistory(o.as('u-grace'));
    expect(changes[0].details).toEqual([TELL_HR]);
  });

  it('names whoever looked after HR at the time, even when somebody else does now', async () => {
    const o = aLeaveOrganisation();
    await o.suites.setLeaveRules(o.as('u-grace'), { tellHr: 'approved' });
    o.changes[0].changedAt = new Date('2026-10-05T09:00:00Z');
    await o.suites.setDuties(o.as('u-grace'), { hr: 'u-aisha' });
    o.changes[1].changedAt = new Date('2026-10-06T09:00:00Z');
    await o.suites.setLeaveRules(o.as('u-grace'), { tellHr: 'every' });
    o.changes[2].changedAt = new Date('2026-10-07T09:00:00Z');
    const { changes } = await o.suites.rulesHistory(o.as('u-grace'));
    expect(changes.map((c) => c.details)).toEqual([
      [
        'This was added. Aisha Otieno, who looks after HR, is told of each request, when it is asked for and when it is decided, on the leave board.',
        'This was taken away. Aisha Otieno, who looks after HR, is told of each approved request, on the leave board.',
      ],
      ['The answer to “Who looks after HR?” changed from Joy Mutua to Aisha Otieno.'],
      [TELL_HR],
    ]);
  });

  it('with nobody named for HR, says so, as before', async () => {
    const o = aLeaveOrganisation({ duties: {} });
    await o.suites.setLeaveRules(o.as('u-grace'), { tellHr: 'approved' });
    const { changes } = await o.suites.rulesHistory(o.as('u-grace'));
    expect(changes[0].details).toEqual(['This was added. HR is to be told of each approved request, but nobody is named for HR yet. Name somebody under who holds each duty.']);
  });
});
