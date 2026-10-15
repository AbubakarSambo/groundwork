import { ConflictException } from '@nestjs/common';
import { TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';

/**
 * SEVERAL AT ONCE, AS EACH READER READS IT (suites at scale, Baobab Distribution, Wednesday 7 October 2026).
 *
 *   - An approver deciding many requests in a row: each answer is kept once, each person is told once, and the
 *     thirtieth answer costs what the first did.
 *   - Two approvers answering the same request at the same moment: one answer is kept, and the other approver
 *     is told plainly, and nothing of theirs is written, recorded or sent.
 */

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); });
afterEach(() => { jest.useRealTimers(); });

describe('an approver deciding many in a row', () => {
  it('finance approves all 27 that wait for her: each is kept once, each person asked is told once, and her queue empties one at a time', async () => {
    const w = aHundredPeople();
    const me = w.as('finance.m1');
    const first = await w.queue.queue(me, { pageSize: 100 }, TODAY);
    expect(first.counts.all).toBe(27);
    const costs: number[] = [];
    let left = 27;
    for (const item of first.items) {
      w.calls.length = 0;
      await w.spending.decide(me, item.id, 'approved', TODAY);
      costs.push(w.calls.length);
      left -= 1;
      expect((await w.queue.queue(me, {}, TODAY)).counts.all).toBe(left);
    }
    expect(w.spend.filter((r) => first.items.some((i) => i.id === r.id)).every((r) => r.status === 'approved' && r.decidedById === idOf('finance.m1'))).toBe(true);
    /* One "approved" for each, and nothing twice. */
    const approvals = w.events.filter((e) => e.kind === 'approved');
    expect(approvals).toHaveLength(27);
    expect(new Set(approvals.map((e) => e.ref)).size).toBe(27);
    expect(w.decided).toHaveLength(27);
    expect(new Set(w.decided.map((d) => d.request.ref)).size).toBe(27);
    /*
     * Each answer gives back the board as the approver now reads it, so what it costs follows what is left to read and never what
     * has been answered: the last costs no more than the first, and the first, with 27 waiting, is under sixty questions.
     */
    expect(costs[costs.length - 1]).toBeLessThanOrEqual(costs[0]);
    expect(costs[0]).toBeLessThan(60);
  });

  it('each request an approver declines carries her reason, once, to the person who asked', async () => {
    const w = aHundredPeople();
    const me = w.as('ops.manager');
    const q = await w.queue.queue(me, { suite: 'leave', pageSize: 100 }, TODAY);
    for (const i of q.items.slice(0, 3)) await w.leaveBoard.decide(me, i.id, 'declined', 'Two people are already away.');
    const declined = w.leave.filter((r) => r.status === 'declined' && r.declineReason === 'Two people are already away.' && r.decidedAt?.getTime() > 0);
    expect(declined.filter((r) => q.items.some((i) => i.id === r.id))).toHaveLength(3);
    expect((await w.queue.queue(me, {}, TODAY)).counts.leave).toBe(q.counts.leave - 3);
  });
});

describe('two approvers answering the same request at once', () => {
  /* Two admins: a member with no manager goes to any admin, and the chief executive and the head of Operations are both admins. */
  const asAnyAdmin = (w: ReturnType<typeof aHundredPeople>, key: string) => { const p = w.directory.find((x) => x.externalId === key)!; p.managerExternalId = null; p.department = null; };

  it('leave: one answer is kept, the other approver reads who got there first and why nothing changed', async () => {
    const w = aHundredPeople();
    asAnyAdmin(w, 'eng.m1');
    const request = w.leave.find((r) => r.userId === idOf('eng.m1') && r.status === 'waiting')!;
    const results = await Promise.allSettled([
      w.leaveBoard.decide(w.as('ceo'), request.id, 'approved'),
      w.leaveBoard.decide(w.as('ops.head'), request.id, 'declined', 'Not that week.'),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    const lost = (results[1] as PromiseRejectedResult).reason;
    expect(lost).toBeInstanceOf(ConflictException);
    const winner = w.people.find((p) => p.key === 'ceo')!.first;
    expect(lost.message).toBe(`${winner} approved this request a moment ago, so your answer was not kept.`);
    /* The row, the record and the person's message are the winner's, once. */
    expect(request).toMatchObject({ status: 'approved', decidedById: idOf('ceo'), declineReason: null });
    expect(w.events.filter((e) => e.ref === request.id && ['approved', 'declined'].includes(e.kind)).map((e) => [e.kind, e.byUserId])).toEqual([['approved', idOf('ceo')]]);
    expect(w.decided.filter((d) => d.request.ref === request.id)).toHaveLength(1);
  });

  it('leave: the same either way round, and the second answer cannot be the same one twice', async () => {
    const w = aHundredPeople();
    asAnyAdmin(w, 'eng.m1');
    const request = w.leave.find((r) => r.userId === idOf('eng.m1') && r.status === 'waiting')!;
    const results = await Promise.allSettled([
      w.leaveBoard.decide(w.as('ops.head'), request.id, 'declined'),
      w.leaveBoard.decide(w.as('ceo'), request.id, 'declined'),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect(request.status).toBe('declined');
    expect(w.events.filter((e) => e.ref === request.id && e.kind === 'declined')).toHaveLength(1);
    expect((results[1] as PromiseRejectedResult).reason.message).toMatch(/declined this request a moment ago, so your answer was not kept\.$/);
  });

  it('spending at a step that is not the last: the one who moves it on wins, and the other is told the step was answered', async () => {
    const w = aHundredPeople();
    asAnyAdmin(w, 'eng.m1');
    const request = w.spend.find((r) => r.userId === idOf('eng.m1') && r.status === 'waiting' && r.step === 0)!;
    const results = await Promise.allSettled([
      w.spending.decide(w.as('ceo'), request.id, 'approved', TODAY),
      w.spending.decide(w.as('ops.head'), request.id, 'approved', TODAY),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    const lost = (results[1] as PromiseRejectedResult).reason;
    expect(lost.message).toBe(`${w.people.find((p) => p.key === 'ceo')!.first} answered this step a moment ago, so your answer was not kept. The request now waits for the next person.`);
    expect(request).toMatchObject({ status: 'waiting', step: 1, approvedByIds: [idOf('ceo')] });
    expect(w.events.filter((e) => e.ref === request.id && e.kind === 'approved')).toHaveLength(1);
  });

  it('a request already decided when somebody opens it reads the plain refusal it always did', async () => {
    const w = aHundredPeople();
    asAnyAdmin(w, 'eng.m1');
    const request = w.leave.find((r) => r.userId === idOf('eng.m1') && r.status === 'waiting')!;
    await w.leaveBoard.decide(w.as('ceo'), request.id, 'approved');
    await expect(w.leaveBoard.decide(w.as('ops.head'), request.id, 'declined')).rejects.toThrow('This request has already been decided.');
  });
});
