import { aLeaveOrganisation, ORG, TODAY } from './a-leave-organisation-for-specs';
import { aSpendingOrganisation, TODAY as SPEND_TODAY } from './a-spending-organisation-for-specs';
import { aTimeSheetsOrganisation, TODAY as TIME_TODAY } from './a-time-sheets-organisation-for-specs';
import { aRequestsHistory } from './a-request-is-recorded';

/**
 * THE SAME APPROVER TWICE, AS EACH PERSON IS SERVED IT.
 *
 * When a request has already been approved by a person, and a later step, or a passing-on, names the
 * same person, that step is passed for them and the request moves on. The record keeps "Omar had already
 * approved it, so this step was passed.", and the history says it. Every suite does this through the
 * one resolver (`passWhatTheyAlreadyApproved` in who-may-decide.ts): leave, spending and time sheets.
 * Reviews have one step, so nothing is ever passed there.
 */

const LONGER = { thresholds: [{ above: 10, steps: [['manager', 'admin'], ['departmentHead', 'admin']] }] };
const TWELVE_DAYS = ['2026-10-12', '2026-10-27'] as const;

describe('leave: Wairimu manages Aisha and heads Sales, and leave of more than ten days goes to both', () => {
  const duties = { hr: 'u-joy', departmentHeads: { Sales: 'u-wairimu' } };

  it('her one approval ends it: the head’s step is passed, and each reader reads why', async () => {
    const o = aLeaveOrganisation({ rules: LONGER, duties });
    const { row } = await o.send('u-aisha', ...TWELVE_DAYS);
    await o.leave.decide(o.as('u-wairimu'), row.id, 'approved');
    expect(row).toMatchObject({ status: 'approved', decidedById: 'u-wairimu', approvedByIds: ['u-wairimu'] });
    expect(o.events.filter((e) => e.kind === 'passed')).toEqual([expect.objectContaining({ toUserId: 'u-wairimu', step: 1, byUserId: null })]);

    expect((await aRequestsHistory(o.prisma, ORG, 'leave', row.id, 'u-aisha')).said).toEqual([
      'You asked for it on 5 October.',
      'Wairimu approved it on 5 October.',
      'Wairimu had already approved it, so this step was passed.',
    ]);
    expect((await o.leave.history(o.as('u-wairimu'), row.id)).said).toEqual([
      'Aisha asked for it on 5 October.',
      'You approved it on 5 October.',
      'You had already approved it, so this step was passed.',
    ]);
    expect((await o.leave.mine(o.as('u-aisha'), TODAY)).requests[0].where).toBe('Your leave from Monday 12 October to Tuesday 27 October is approved by Wairimu.');
  });

  it('with a third step, only the repeated one is passed, and it waits for Joy in HR', async () => {
    const rules = { thresholds: [{ above: 10, steps: [['manager', 'admin'], ['departmentHead', 'admin'], ['hr', 'admin']] }] };
    const o = aLeaveOrganisation({ rules, duties });
    const { row } = await o.send('u-aisha', ...TWELVE_DAYS);
    await o.leave.decide(o.as('u-wairimu'), row.id, 'approved');
    expect(row).toMatchObject({ status: 'waiting', step: 2 });
    expect((await o.leave.mine(o.as('u-aisha'), TODAY)).requests[0].where).toBe(
      'Your leave from Monday 12 October to Tuesday 27 October is approved by Wairimu and is now waiting for Joy in HR.',
    );
    expect(await o.onTheBoard('u-joy', row.id)).toEqual({ where: 'Wairimu has approved it, and it is now waiting for you.', mayDecide: true });
    await o.leave.decide(o.as('u-joy'), row.id, 'approved');
    expect((await aRequestsHistory(o.prisma, ORG, 'leave', row.id, 'u-aisha')).said).toEqual([
      'You asked for it on 5 October.',
      'Wairimu approved it on 5 October.',
      'Wairimu had already approved it, so this step was passed.',
      'Joy approved it on 5 October.',
    ]);
  });

  it('a passing-on to somebody who already approved it passes that step too', async () => {
    /* The second step is the head of Sales, Joseph, or else HR, Wairimu here; passed on after one working day. */
    const workflows = { leave: { steps: [['manager', 'admin'], ['departmentHead', 'hr', 'admin']], escalateAfter: 1 } };
    const o = aLeaveOrganisation({ workflows, duties: { hr: 'u-wairimu', departmentHeads: { Sales: 'u-joseph' } } });
    const { row } = await o.send('u-aisha', ...TWELVE_DAYS);
    await o.leave.decide(o.as('u-wairimu'), row.id, 'approved');
    expect(row).toMatchObject({ status: 'waiting', step: 1 });
    expect(await o.onTheBoard('u-joseph', row.id)).toEqual({ where: 'Wairimu has approved it, and it is now waiting for you.', mayDecide: true });

    await o.leave.passOnWhatWaitsTooLong(ORG, new Date(Date.now() + 10 * 86_400_000));
    expect(row).toMatchObject({ status: 'approved', decidedById: 'u-wairimu' });
    const said = (await aRequestsHistory(o.prisma, ORG, 'leave', row.id, 'u-aisha')).said;
    expect(said[2]).toMatch(/^Groundwork passed it to Wairimu on .+, because Joseph had not answered for \d+ working days\.$/);
    expect(said[3]).toBe('Wairimu had already approved it, so this step was passed.');
  });

  it('when the head is somebody else, nothing is passed (as before)', async () => {
    const o = aLeaveOrganisation({ rules: LONGER });
    const { row } = await o.send('u-aisha', ...TWELVE_DAYS);
    await o.leave.decide(o.as('u-wairimu'), row.id, 'approved');
    expect(row).toMatchObject({ status: 'waiting', step: 1 });
    expect(o.events.filter((e) => e.kind === 'passed')).toEqual([]);
  });
});

describe('spending: Omar looks after finance and holds the Operations budget', () => {
  it('Kamau’s request: Omar approves for finance, and the budget step that names him again is passed', async () => {
    const o = aSpendingOrganisation({
      duties: { finance: 'u-omar', budgetOwners: { Operations: 'u-omar' } },
      workflows: { spend: { steps: [['finance', 'admin'], ['budgetOwner', 'admin']] } },
    });
    const r = o.req('u-kamau', 5000, 'fuel', 'Operations', 'waiting', SPEND_TODAY);
    await o.svc.decide(o.as('u-omar'), r.id, 'approved', SPEND_TODAY);
    expect(r).toMatchObject({ status: 'approved', decidedById: 'u-omar' });
    expect((await o.svc.history(o.as('u-kamau'), r.id)).said).toEqual([
      'Omar approved it on 5 October.',
      'Omar had already approved it, so this step was passed.',
      'Groundwork told you on WhatsApp on 5 October.',
    ]);
  });
});

describe('time sheets: Wairimu manages Aisha and looks after finance', () => {
  it('her approval of the week ends it, and the finance step is passed', async () => {
    const o = aTimeSheetsOrganisation({ workflows: { time: { steps: [['manager', 'admin'], ['finance', 'admin']] } } });
    o.suiteRows.duties.answers = { finance: 'u-wairimu' };
    await o.svc.approve(o.as('u-wairimu'), 'u-aisha', '2026-10-05', TIME_TODAY);
    const week = o.weeks.find((w: any) => w.userId === 'u-aisha' && w.weekOf.toISOString().startsWith('2026-10-05'));
    expect(week).toMatchObject({ approvedById: 'u-wairimu', approvedMinutes: 31 * 60 });
    const said = (await o.svc.history(o.as('u-aisha'), 'u-aisha', '2026-10-05')).said;
    expect(said.slice(-2)).toEqual([
      expect.stringMatching(/^Wairimu approved these hours on /),
      'Wairimu had already approved these hours, so this step was passed.',
    ]);
  });
});
