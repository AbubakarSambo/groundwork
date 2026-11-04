import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WhatNeedsYouService } from './what-needs-you.service';

/**
 * WHAT IS WAITING FOR YOU TO APPROVE, AS EACH READER READS IT ON TODAY (week 21).
 *
 * The boards say, row by row, whether the reader is the one who approves it (`mayApproveFor`), and
 * refuse the people who may not open them. These stand-ins serve exactly what the real boards serve to
 * each reader: Wairimu leads Sales and approves for her team; Grace is an admin who does not approve
 * for Sales (so her rows say "no"); Aisha is a member and a colleague, who are refused the boards.
 * What is checked is the text Today hands each of them.
 */

const WAITING_LEAVE = [
  { name: 'Amani Otieno', startsOn: '2026-10-08', endsOn: '2026-10-09' },
  { name: 'Baraka Mwangi', startsOn: '2026-10-12', endsOn: '2026-10-12' },
  { name: 'Chao Li', startsOn: '2026-10-14', endsOn: '2026-10-15' },
];
const hoursRow = (name: string, approver: boolean) => ({
  personId: name, name, minutes: { Atlas: 360, Zeta: 0 }, total: 360, approved: false, mayApprove: approver, days: ['2026-10-01'],
});

type Opts = { off?: boolean; leave?: number; hours?: number; spend?: number };
function setup(opts: Opts = {}) {
  const asked = { leave: 0, time: 0, spend: 0 };
  const serve = (userId: string, approves: boolean) => {
    const roleOk = userId === 'u-wairimu' || userId === 'u-grace';
    const check = () => { if (opts.off) throw new NotFoundException('The suite is not switched on.'); if (!roleOk) throw new ForbiddenException('Only an admin or a lead can open this board.'); };
    return { check, approves };
  };
  const approvesFor = (userId: string) => userId === 'u-wairimu';
  const leave: any = { board: jest.fn(async (r: any) => { asked.leave++; serve(r.userId, true).check(); return { off: [], waiting: WAITING_LEAVE.slice(0, opts.leave ?? 1).map((w, i) => ({ id: `l${i}`, ...w, mayDecide: approvesFor(r.userId) })) }; }) };
  const time: any = { board: jest.fn(async (r: any) => { asked.time++; serve(r.userId, true).check(); return { thisWeek: '2026-09-28', agreements: null, weeks: [{ weekOf: '2026-09-28', clients: ['Atlas', 'Zeta'], people: ['Baraka Mwangi', 'Chao Li', 'Dina Said'].slice(0, opts.hours ?? 1).map((n) => hoursRow(n, approvesFor(r.userId))) }] }; }) };
  const spend: any = { board: jest.fn(async (r: any) => { asked.spend++; serve(r.userId, true).check(); return { currency: 'KES', limit: null, budgets: [], teams: [], waiting: Array.from({ length: opts.spend ?? 1 }, (_, i) => ({ id: `s${i}`, name: 'Baraka Mwangi', firstName: 'Baraka', amount: 12000, what: 'fuel for the Kisumu trip', mayDecide: approvesFor(r.userId) })) }; }) };
  const grounds: any = { list: jest.fn(async () => []), listAwaitingApproval: jest.fn(async () => []) };
  const prisma: any = { user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: false })) } };
  return { svc: new WhatNeedsYouService(prisma, grounds, leave, time, spend), asked };
}
const said = async (svc: WhatNeedsYouService, userId: string, role: string) => {
  const r = await svc.forReader(userId, `${userId}@x.test`, 'org-a', role);
  return r.needs.map((n) => [n.title, n.detail].filter(Boolean).join(' ')).join('\n');
};

describe('what is waiting for you to approve, on Today', () => {
  it('the approver is told each kind, in plain sentences, with the link to the right board', async () => {
    const { svc } = setup();
    const r = await svc.forReader('u-wairimu', 'w@x.test', 'org-a', 'LEAD');
    const text = r.needs.map((n) => [n.title, n.detail].filter(Boolean).join(' '));
    expect(text).toEqual([
      'Amani asked for leave from Thursday 8 October to Friday 9 October. It is waiting for you to approve.',
      'Baraka sent 6 hours on Atlas for Thursday 1 October. They are waiting for you to approve.',
      'Baraka asked to spend KES 12,000 on fuel for the Kisumu trip. It is waiting for you to approve.',
    ]);
    /* The server owns each link: an approval opens the approver's own queue, filtered to its suite (the page used to rewrite these). */
    expect(r.needs.map((n) => n.action.to)).toEqual(['/suite/queue?suite=leave', '/suite/time', '/suite/queue?suite=spend']);
    expect(r.count).toBe(3);
  });

  it('says one day as one day, and several clients together', async () => {
    const { svc } = setup({ leave: 2 });
    expect(await said(svc, 'u-wairimu', 'LEAD')).toContain('Baraka asked for leave on Monday 12 October. It is waiting for you to approve.');
  });

  it('three of a kind are said once, with the count', async () => {
    const { svc } = setup({ leave: 3, hours: 3, spend: 3 });
    const r = await svc.forReader('u-wairimu', 'w@x.test', 'org-a', 'LEAD');
    expect(r.needs.map((n) => n.title)).toEqual([
      '3 leave requests are waiting for you to approve.',
      'Hours from 3 people are waiting for you to approve.',
      '3 requests to spend are waiting for you to approve.',
    ]);
  });

  it('an admin who is not the approver for these people is told nothing', async () => {
    const { svc } = setup({ leave: 3, hours: 3, spend: 3 });
    expect(await said(svc, 'u-grace', 'ADMIN')).toBe('');
  });

  /* The boards are now asked for every reader, because the rules can name a member to decide
     (decisions 85 and 86). Each board refuses a member nobody names, and Today reads that as nothing. */
  it('a person and a colleague nobody names are refused by each board and told nothing', async () => {
    const { svc, asked } = setup();
    expect(await said(svc, 'u-aisha', 'MEMBER')).toBe('');
    expect(await said(svc, 'u-aisha', 'GUEST')).toBe('');
    expect(asked).toEqual({ leave: 2, time: 2, spend: 2 });
  });

  it('nothing appears when the suites are off, and Today does not fail', async () => {
    const { svc } = setup({ off: true });
    expect(await said(svc, 'u-wairimu', 'LEAD')).toBe('');
  });

  it('leave says dates only, and hours say what was sent and nothing about how much anybody works', async () => {
    const { svc } = setup();
    const text = await said(svc, 'u-wairimu', 'LEAD');
    expect(text).not.toMatch(/annual|sick|reason|kind|days left|busy|overtime|too many|more than|less than/i);
    expect(text).not.toMatch(/Zeta/);
  });
});
