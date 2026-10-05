import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { aLeaveOrganisation } from './a-leave-organisation-for-specs';
import { aSpendingOrganisation } from './a-spending-organisation-for-specs';
import { ARequestFiledFromItsForm } from './a-request-filed-from-its-form';
import { LEAVE_REFUSED } from './the-leave-board.service';
import { SPEND_REFUSED } from './the-spending.service';

/**
 * REQUEST 165: A PERSON FILES THEIR OWN REQUEST FROM THE SUITE'S FORM, READ AS EACH PERSON READS IT.
 *
 * The form goes through the same writers the chat does, so the same checks, approver, refusals and sentence apply. And
 * the form's choices are readable by the person asking, and by nobody for anybody else, and hold nothing private.
 */
const leaveWorld = (opts: Parameters<typeof aLeaveOrganisation>[0] = {}) => {
  const w = aLeaveOrganisation(opts);
  return { ...w, filed: new ARequestFiledFromItsForm(w.prisma, w.leave, {} as any) };
};
const spendWorld = (opts: Parameters<typeof aSpendingOrganisation>[0] = {}) => {
  const w = aSpendingOrganisation(opts);
  return { ...w, filed: new ARequestFiledFromItsForm(w.prisma, {} as any, w.svc) };
};

const KINDS = { kinds: [{ key: 'annual', name: 'Annual leave', days: 21 }, { key: 'sick', name: 'Sick leave', days: null, document: 'a sick note', documentAfterDays: 2 }], noticeDays: 14, tellHr: 'every' };

describe('Aisha files leave from the form', () => {
  it('is sent to Wairimu, who reads it waiting on her board, and Aisha is told in the same sentence the chat uses', async () => {
    const w = leaveWorld();
    const sent = await w.filed.leaveRequest(w.as('u-aisha'), { startsOn: '2026-10-12', endsOn: '2026-10-14' });
    expect(sent.says).toBe('I have sent your leave request from Monday 12 October to Wednesday 14 October to Wairimu. It is not approved until they decide, and you will see it under your leave.');
    expect(w.rows).toHaveLength(1);
    expect(w.rows[0]).toMatchObject({ userId: 'u-aisha', status: 'waiting' });
    expect(await w.onTheBoard('u-wairimu', sent.id)).toMatchObject({ where: 'It is waiting for you.', mayDecide: true });
    /* Somebody who is not her manager, a member of another team, reads nothing of it. */
    expect(await w.onTheBoard('u-kamau', sent.id)).toBeNull();
  });

  it('reads the same as asking in a chat, word for word', async () => {
    const a = leaveWorld();
    const b = leaveWorld();
    const formSaid = (await a.filed.leaveRequest(a.as('u-aisha'), { startsOn: '2026-10-12', endsOn: '2026-10-14' })).says;
    const chatSaid = (await b.send('u-aisha', '2026-10-12', '2026-10-14')).told;
    expect(formSaid).toBe(chatSaid);
    expect({ ...a.rows[0], id: '', askedAt: null }).toEqual({ ...b.rows[0], id: '', askedAt: null });
  });

  it('is always her own: there is no way to ask in anybody else\'s name, and a person not in the organisation is refused', async () => {
    const w = leaveWorld();
    await expect(w.filed.leaveRequest(w.as('u-nobody'), { startsOn: '2026-10-12', endsOn: '2026-10-14' })).rejects.toThrow(LEAVE_REFUSED.notInIt);
    const extra: any = { userId: 'u-miriam', startsOn: '2026-10-12', endsOn: '2026-10-14' };
    await w.filed.leaveRequest(w.as('u-aisha'), extra);
    expect(w.rows[0].userId).toBe('u-aisha');
  });

  it('keeps a kind and a stand-in she chose, and names the kind in what she is told', async () => {
    const w = leaveWorld({ rules: KINDS });
    const sent = await w.filed.leaveRequest(w.as('u-aisha'), { startsOn: '2026-10-12', endsOn: '2026-10-12', kind: 'sick', standInUserId: 'u-miriam' });
    expect(w.rows[0]).toMatchObject({ kind: 'sick', standInUserId: 'u-miriam' });
    expect(sent.says).toContain('I have sent your request for sick leave on Monday 12 October to Wairimu.');
  });

  it('refuses in the chat\'s own words: bad days, herself as stand-in, a kind nobody set', async () => {
    const w = leaveWorld({ rules: KINDS });
    await expect(w.filed.leaveRequest(w.as('u-aisha'), { startsOn: '2026-10-14', endsOn: '2026-10-12' })).rejects.toThrow(new BadRequestException(LEAVE_REFUSED.badDates));
    await expect(w.filed.leaveRequest(w.as('u-aisha'), { startsOn: '2026-10-12', endsOn: '2026-10-12', standInUserId: 'u-aisha' })).rejects.toThrow(LEAVE_REFUSED.badStandIn);
    await expect(w.filed.leaveRequest(w.as('u-aisha'), { startsOn: '2026-10-12', endsOn: '2026-10-12', kind: 'sabbatical' })).rejects.toThrow(LEAVE_REFUSED.badKind);
    expect(w.rows).toHaveLength(0);
  });
});

describe('what the leave form offers', () => {
  it('gives Aisha the kinds and her colleagues\' names, and nothing private', async () => {
    const w = leaveWorld({ rules: KINDS });
    const form = await w.suites.leaveForm(w.as('u-aisha'));
    expect(form.kinds).toEqual([{ key: 'annual', name: 'Annual leave' }, { key: 'sick', name: 'Sick leave' }]);
    expect(form.standIns.map((p) => p.name)).toContain('Wairimu Kamau');
    expect(form.standIns.map((p) => p.userId)).not.toContain('u-aisha');
    const read = JSON.stringify(form);
    expect(read).not.toMatch(/noticeDays|tellHr|sick note|documentAfterDays|"days"|daysLeft|email|@/);
  });

  it('gives a person who is not in the organisation nothing, and says so plainly', async () => {
    const w = leaveWorld();
    await expect(w.suites.leaveForm(w.as('u-nobody'))).rejects.toThrow(new ForbiddenException(LEAVE_REFUSED.notInIt));
  });
});

describe('a person files an ask to spend from the form', () => {
  const RULES = { categories: [{ name: 'Fuel' }, { name: 'Travel', evidence: 'receipt' }], categoryCalled: 'project', evidence: { what: 'receipt', above: 50000 } };

  it('is sent to whoever approves, and she reads the chat\'s own sentence, with the reason in lower case', async () => {
    const w = spendWorld({ rules: RULES });
    const sent = await w.filed.spendingRequest(w.as('u-miriam'), { amount: 15000, what: 'Fuel for the van this week', category: 'Fuel' });
    expect(sent.says).toBe('I have sent your request to spend KES 15,000 on fuel for the van this week to Wairimu. It is not approved until they decide, and nothing is spent until then.');
    expect(w.created[0]).toMatchObject({ userId: 'u-miriam', amount: 15000, what: 'Fuel for the van this week', category: 'Fuel' });
  });

  it('refuses in the chat\'s own words: a category nobody set, no reason, no amount, and somebody who is not in it', async () => {
    const w = spendWorld({ rules: RULES });
    await expect(w.filed.spendingRequest(w.as('u-miriam'), { amount: 15000, what: 'Fuel', category: 'Cinema' })).rejects.toThrow(SPEND_REFUSED.badCategory);
    await expect(w.filed.spendingRequest(w.as('u-miriam'), { amount: 15000, what: '   ' })).rejects.toThrow(SPEND_REFUSED.badWhat);
    await expect(w.filed.spendingRequest(w.as('u-miriam'), { amount: 0, what: 'Fuel' })).rejects.toThrow(SPEND_REFUSED.badAmount);
    await expect(w.filed.spendingRequest(w.as('u-tomas'), { amount: 100, what: 'Fuel' })).rejects.toThrow(SPEND_REFUSED.notInIt);
    expect(w.created).toHaveLength(0);
  });

  it('is refused with the suite off, with the same sentence as the board', async () => {
    const w = spendWorld({ on: false });
    await expect(w.filed.spendingRequest(w.as('u-miriam'), { amount: 100, what: 'Fuel' })).rejects.toThrow(new NotFoundException(SPEND_REFUSED.notOn));
  });
});

describe('what the payment request form offers', () => {
  it('gives Miriam the categories, what the organisation calls one, and the currency, and not the limits, thresholds, budgets or who approves', async () => {
    const w = spendWorld({ rules: { categories: [{ name: 'Fuel' }, { name: 'Travel' }], categoryCalled: 'project', thresholds: [{ above: 100000, steps: ['admin'] }] } });
    const form = await w.suites.spendForm(w.as('u-miriam'));
    expect(form).toEqual({ currency: 'KES', categoryCalled: 'project', categories: ['Fuel', 'Travel'] });
    expect(JSON.stringify(form)).not.toMatch(/limit|above|threshold|budget|20000|250000|u-grace|steps/);
  });

  it('says "category" when the organisation has not named one, and offers none when there are none', async () => {
    const w = spendWorld();
    expect(await w.suites.spendForm(w.as('u-miriam'))).toEqual({ currency: 'KES', categoryCalled: 'category', categories: [] });
  });

  it('refuses a guest, and refuses with the suite off', async () => {
    const w = spendWorld();
    await expect(w.suites.spendForm(w.as('u-tomas'))).rejects.toThrow(SPEND_REFUSED.notInIt);
    const off = spendWorld({ on: false });
    await expect(off.suites.spendForm(off.as('u-miriam'))).rejects.toThrow(SPEND_REFUSED.notOn);
  });
});
