import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DecisionsInABatchService } from './the-decisions-in-a-batch.service';
import { TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';
import { aTimeSheetsOrganisation, TODAY as TIME_TODAY } from './a-time-sheets-organisation-for-specs';

/**
 * MANY ANSWERS IN ONE CALL, AS EACH READER READS IT (suites at scale, Baobab Distribution, Wednesday 7 October 2026).
 *
 * `POST /suites/decisions` answers each request by the route that answers it alone, so each is checked exactly as it is there: who
 * decides it now (the manager, a stand-in who is a lead or an admin under decision 108, finance, an admin), the state it is in, and the
 * write that is the check when two approvers answer at once. Each gets its own result in a full sentence, and one that fails never
 * stops the others.
 */

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); });
afterEach(() => { jest.useRealTimers(); });

function aBatchWorld() {
  const w = aHundredPeople();
  const told: any = { approversOf: async (_o: string, who: any) => (who.kind === 'admin' ? [idOf('ceo'), idOf('ops.head')] : [who.userId]), firstNameOf: async () => '', waiting: jest.fn(async () => undefined), waitingMany: jest.fn(async () => undefined), decided: jest.fn(async () => true), asked: async () => true, answered: async () => true };
  (w.leaveBoard as any).told = told;
  (w.spending as any).told = told;
  const batch = new DecisionsInABatchService(w.prisma, w.leaveBoard, w.spending, {} as any, told);
  const waitingFor = (key: string, suite: 'leave' | 'spend') => (suite === 'leave' ? w.leave : w.spend).filter((r) => r.userId.startsWith(`u-${key}.`) && r.status === 'waiting');
  return { w, told, batch, waitingFor };
}
const answer = (suite: 'leave' | 'spend' | 'hours', id: string, a: 'approve' | 'decline' = 'approve', reason?: string) => ({ suite, id, answer: a, ...(reason ? { reason } : {}) });

describe('the approver, answering what waits for them', () => {
  it('Operations’ manager approves three requests to spend and declines a leave request, each with its own sentence, and the person asked is told of each', async () => {
    const x = aBatchWorld();
    const spends = x.waitingFor('ops', 'spend').filter((r) => r.step === 0).slice(0, 3);
    const leave = x.waitingFor('ops', 'leave')[0];
    const out = await x.batch.decide(x.w.as('ops.manager'), { decisions: [...spends.map((r) => answer('spend', r.id)), answer('leave', leave.id, 'decline', 'Two people are already away.')] }, TODAY);
    expect(out.answered).toBe(4);
    expect(out.says).toBe('All four answers were kept.');
    expect(out.results.map((r) => r.ok)).toEqual([true, true, true, true]);
    expect(out.results[0].says).toMatch(/^You approved \w+'s? request to spend KES [\d,]+ for .+\. It now waits for \w+ in finance\.$/);
    expect(out.results[3].says).toMatch(/^You declined \w+'s? leave from .+ to .+\.$/);
    expect(leave).toMatchObject({ status: 'declined', declineReason: 'Two people are already away.' });
    expect(x.told.decided).toHaveBeenCalledTimes(1);
  });

  it('whoever decides the next step is told once for all of them, not once for each', async () => {
    const x = aBatchWorld();
    const spends = x.waitingFor('ops', 'spend').filter((r) => r.step === 0);
    expect(spends.length).toBe(3);
    await x.batch.decide(x.w.as('ops.manager'), { decisions: spends.map((r) => answer('spend', r.id)) }, TODAY);
    expect(x.told.waiting).not.toHaveBeenCalled();
    expect(x.told.waitingMany).toHaveBeenCalledTimes(1);
    const batch = x.told.waitingMany.mock.calls[0][1];
    expect(batch).toHaveLength(3);
    expect(batch.every((b: any) => b.approverUserIds.length === 1 && b.approverUserIds[0] === idOf('finance.m1'))).toBe(true);
  });

  it('finance answers all 27 that wait for her in one call: 27 results, and her queue is empty', async () => {
    const x = aBatchWorld();
    const q = await x.w.queue.queue(x.w.as('finance.m1'), { pageSize: 100 }, TODAY);
    const out = await x.batch.decide(x.w.as('finance.m1'), { decisions: q.items.slice(0, 27).map((i) => answer('spend', i.id)) }, TODAY);
    expect(out.answered).toBe(27);
    expect(out.results.every((r) => r.ok && /^You approved .+ request to spend KES [\d,]+ for .+\.$/.test(r.says))).toBe(true);
    expect((await x.w.queue.queue(x.w.as('finance.m1'), {}, TODAY)).counts.all).toBe(0);
  });
});

describe('the stand-in, another member, and somebody refused', () => {
  it('the head of Sales, standing in for the manager on leave, answers the manager’s requests; the manager on leave is refused for each', async () => {
    const x = aBatchWorld();
    const mine = x.waitingFor('sales', 'leave').slice(0, 2);
    const decisions = { decisions: mine.map((r) => answer('leave', r.id)) };
    const manager = await x.batch.decide(x.w.as('sales.manager'), decisions, TODAY);
    expect(manager.results.map((r) => [r.ok, r.says])).toEqual(mine.map(() => [false, 'Only the person who approves this request can decide it.']));
    const head = await x.batch.decide(x.w.as('sales.head'), decisions, TODAY);
    expect(head.results.every((r) => r.ok && /^You approved .+ leave (from|on) .+\.$/.test(r.says))).toBe(true);
  });

  it('a plain member who stands in, and another member, are refused every one, and nothing is changed', async () => {
    const x = aBatchWorld();
    const procurement = x.waitingFor('procurement', 'leave')[1];
    const sales = x.waitingFor('sales', 'spend')[0];
    for (const who of ['procurement.m1', 'sales.m5', 'hr.m1']) {
      const out = await x.batch.decide(x.w.as(who), { decisions: [answer('leave', procurement.id), answer('spend', sales.id, 'decline')] }, TODAY);
      expect(out).toMatchObject({ answered: 0, says: 'None of the two answers could be kept, and each says why.' });
      expect(out.results.map((r) => r.says)).toEqual(['Only the person who approves this request can decide it.', 'Only the person who approves this request can decide it.']);
    }
    expect(procurement.status).toBe('waiting');
    expect(sales.status).toBe('waiting');
  });

  it('a person who asked cannot answer their own', async () => {
    const x = aBatchWorld();
    const own = x.w.leave.find((r) => r.userId === idOf('ops.manager') && r.status === 'approved')!;
    const mine = x.waitingFor('ops', 'leave')[0];
    const out = await x.batch.decide(x.w.as('ops.m5'), { decisions: [answer('leave', mine.id)] }, TODAY);
    expect(out.results[0].ok).toBe(false);
    expect(own.status).toBe('approved');
  });
});

describe('a mixed batch: one answer kept, a race, a refusal, a mistake, and the rest', () => {
  it('each gets its own sentence, in order, and the ones that fail do not stop the others', async () => {
    const x = aBatchWorld();
    const w = x.w;
    const p = w.directory.find((d) => d.externalId === 'eng.m1')!; p.managerExternalId = null; p.department = null;
    const raced = w.leave.find((r) => r.userId === idOf('eng.m1') && r.status === 'waiting')!;
    const fine = x.waitingFor('ops', 'spend').filter((r) => r.step === 0)[0];
    const refused = w.leave.find((r) => r.userId === idOf('sales.m2') && r.status === 'waiting')!;
    /* Two approvers answer the raced one in the same moment; the chief executive's call also holds a request nobody here may answer. */
    const [first, second] = await Promise.all([
      x.batch.decide(w.as('ceo'), { decisions: [answer('leave', raced.id), answer('leave', refused.id), answer('spend', 'no-such-request'), { suite: 'nonsense', id: 'x', answer: 'approve' }, answer('hours', 'u-1|2026-10-05', 'decline'), answer('leave', raced.id)] }, TODAY),
      x.batch.decide(w.as('ops.head'), { decisions: [answer('leave', raced.id, 'decline'), answer('spend', fine.id)] }, TODAY),
    ]);
    const says = first.results.map((r) => r.says);
    expect(says[0]).toMatch(/^You approved .+ leave (from|on) .+\.$/);
    expect(says[1]).toBe('Only the person who approves this request can decide it.');
    expect(says[2]).toBe('That request was not found.');
    expect(says[3]).toBe('The suite was not understood. Give leave, spend or hours.');
    expect(first.results[3].suite).toBeNull();
    expect(says[4]).toBe('Hours cannot be declined here, only approved. Say what is wrong with them to the person who sent them.');
    expect(says[5]).toBe('This request was already answered in this call, so the second answer was left out.');
    expect(first.says).toBe('One of the six answers was kept. Five could not be kept, and each says why.');
    /* The race: the other call's answer to the same request was not kept, and the sentence says who got there first. */
    expect(second.results[0]).toEqual({ id: raced.id, suite: 'leave', ok: false, says: `${w.people.find((q) => q.key === 'ceo')!.first} approved this request a moment ago, so your answer was not kept.` });
    /* ... and the rest of that call still went. */
    expect(second.results[1].ok).toBe(false);
    expect(raced.status).toBe('approved');
    expect(w.events.filter((e) => e.ref === raced.id && ['approved', 'declined'].includes(e.kind))).toHaveLength(1);
  });
});

describe('an answer that is kept but cannot be read back', () => {
  it('says it was kept and could not be read back, never that nothing was changed', async () => {
    const x = aBatchWorld();
    const r = x.waitingFor('ops', 'leave')[0];
    /* The answer's own reads ask for the whole row; the batch's read-back asks for a few fields, and that one fails. */
    x.w.prisma.leaveRequest.findUnique = async (a: any) => { if (a.select) throw new Error('gone'); return x.w.leave.find((l) => l.id === a.where.id) ?? null; };
    const out = await x.batch.decide(x.w.as('ops.manager'), { decisions: [answer('leave', r.id)] }, TODAY);
    expect(out.results[0]).toEqual({ id: r.id, suite: 'leave', ok: true, says: 'Your answer was kept, but the request could not be read back to say more. Check it on the board.' });
    expect(r.status).toBe('approved');
  });
  it('a mix of words up to ten and digits above', async () => {
    const x = aBatchWorld();
    const q = await x.w.queue.queue(x.w.as('finance.m1'), { pageSize: 100 }, TODAY);
    const out = await x.batch.decide(x.w.as('finance.m1'), { decisions: q.items.slice(0, 12).map((i) => answer('spend', i.id)).concat([answer('leave', 'nope')]) }, TODAY);
    expect(out.says).toBe('12 of the 13 answers were kept. One could not be kept, and it says why.');
  });
});

describe('what is refused as a whole', () => {
  it('nothing, too many, and a shape that is not a list', async () => {
    const x = aBatchWorld();
    await expect(x.batch.decide(x.w.as('finance.m1'), { decisions: [] }, TODAY)).rejects.toThrow(BadRequestException);
    await expect(x.batch.decide(x.w.as('finance.m1'), {}, TODAY)).rejects.toThrow('Send between 1 and 50 answers at once, each with a suite, an id and approve or decline.');
    await expect(x.batch.decide(x.w.as('finance.m1'), { decisions: Array.from({ length: 51 }, () => answer('spend', 'x')) }, TODAY)).rejects.toThrow('Send up to 50 answers at once.');
  });

  it('somebody from outside the organisation is refused, and an organisation with every suite off gets nothing', async () => {
    const x = aBatchWorld();
    await expect(x.batch.decide({ userId: 'u-stranger', organizationId: 'org-baobab' }, { decisions: [answer('spend', 'x')] }, TODAY)).rejects.toThrow(ForbiddenException);
    x.w.suites.leave.isOn = false; x.w.suites.spend.isOn = false;
    await expect(x.batch.decide(x.w.as('finance.m1'), { decisions: [answer('spend', 'x')] }, TODAY)).rejects.toThrow(NotFoundException);
    await expect(x.batch.decide(x.w.as('finance.m1'), { decisions: [answer('spend', 'x')] }, TODAY)).rejects.toThrow('Neither leave, spending nor hours is switched on. An admin switches it on under Suites.');
  });

  it('a suite that is off says so for its own answers and the others still go', async () => {
    const x = aBatchWorld();
    x.w.suites.leave.isOn = false;
    const leave = x.waitingFor('ops', 'leave')[0];
    const spend = x.waitingFor('ops', 'spend').filter((r) => r.step === 0)[0];
    const out = await x.batch.decide(x.w.as('ops.manager'), { decisions: [answer('leave', leave.id), answer('spend', spend.id)] }, TODAY);
    expect(out.results.map((r) => r.ok)).toEqual([false, true]);
    expect(out.results[0].says).toMatch(/not switched on/);
  });
});

describe('hours, in the same call', () => {
  it('are approved by whoever approves them, with a sentence, and refused to anybody else', async () => {
    const o = aTimeSheetsOrganisation();
    const leave: any = { decide: async () => { throw new Error('not here'); } };
    const batch = new DecisionsInABatchService(o.prisma, leave, leave, o.svc);
    const out = await batch.decide(o.as('u-wairimu'), { decisions: [{ suite: 'hours', id: 'u-aisha|2026-10-05', answer: 'approve' }] }, TIME_TODAY);
    expect(out.results).toEqual([{ id: 'u-aisha|2026-10-05', suite: 'hours', ok: true, says: "You approved Aisha's hours for the week of Monday 5 October." }]);
    const other = await batch.decide(o.as('u-omar'), { decisions: [{ suite: 'hours', id: 'u-brian|2026-09-28', answer: 'approve' }] }, TIME_TODAY);
    expect(other.results[0]).toEqual({ id: 'u-brian|2026-09-28', suite: 'hours', ok: false, says: 'Only the person who approves these hours can approve them.' });
  });
});
