import { ForbiddenException } from '@nestjs/common';
import { aRequestsHistory } from './a-request-is-recorded';
import { theOneWhoDecides } from './who-may-decide';
import { ORG, TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';

/**
 * A STAND-IN WHEN THE APPROVER IS AWAY, AS EACH READER READS IT (suites at scale, Baobab Distribution).
 *
 * Sales' manager is on approved leave from Tuesday 6 to Friday 9 October 2026, and her leave names the head of
 * Sales to stand in. For exactly those days a request that waits for her waits for the head, who reads it in
 * their queue and may answer it; the day her leave ends it waits for her again. Nothing is written when it
 * starts or ends: it is worked out from the dates. Leave that is only waiting, or was declined, hands over nothing.
 */

const at = (s: string) => { jest.setSystemTime(new Date(`${s}T09:00:00Z`)); };
beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); });
afterEach(() => { jest.useRealTimers(); });

const salesRequest = (w: ReturnType<typeof aHundredPeople>) => w.leave.find((r) => r.userId === idOf('sales.m1') && r.status === 'waiting')!;

describe('the head of Sales, standing in for the days of the manager’s leave', () => {
  it('the day before it starts the request is the manager’s, and the head reads nothing of it', async () => {
    const w = aHundredPeople();
    at('2026-10-05');
    const manager = await w.queue.queue(w.as('sales.manager'), { suite: 'leave' }, new Date('2026-10-05T09:00:00Z'));
    expect(manager.items.map((i) => i.id)).toContain(salesRequest(w).id);
    const head = await w.queue.queue(w.as('sales.head'), { suite: 'leave' }, new Date('2026-10-05T09:00:00Z'));
    expect(head.items.map((i) => i.id)).not.toContain(salesRequest(w).id);
    await expect(w.leaveBoard.decide(w.as('sales.head'), salesRequest(w).id, 'approved')).rejects.toThrow(ForbiddenException);
  });

  it('on the first day and the last, it is the head’s: they read it, say they are standing in, and may answer it; the manager may not', async () => {
    for (const day of ['2026-10-06', '2026-10-09']) {
      const w = aHundredPeople();
      at(day);
      const on = new Date(`${day}T09:00:00Z`);
      const id = salesRequest(w).id;
      const head = await w.queue.queue(w.as('sales.head'), { suite: 'leave' }, on);
      const item = head.items.find((i) => i.id === id)!;
      expect(item.standingIn?.says).toMatch(/^You are standing in for [A-Z][a-z]+, who is on leave until Friday 9 October\.$/);
      expect((await w.queue.queue(w.as('sales.manager'), { suite: 'leave' }, on)).items.map((i) => i.id)).not.toContain(id);
      await expect(w.leaveBoard.decide(w.as('sales.manager'), id, 'approved')).rejects.toThrow('Only the person who approves this request can decide it.');
      await w.leaveBoard.decide(w.as('sales.head'), id, 'approved');
      expect(salesRequest(w) ?? null).toBeNull();
    }
  });

  it('the day after it ends, the request is the manager’s again, and the head reads nothing of it', async () => {
    const w = aHundredPeople();
    at('2026-10-12');
    const on = new Date('2026-10-12T09:00:00Z');
    const id = salesRequest(w).id;
    expect((await w.queue.queue(w.as('sales.manager'), { suite: 'leave' }, on)).items.map((i) => i.id)).toContain(id);
    expect((await w.queue.queue(w.as('sales.head'), { suite: 'leave' }, on)).items.map((i) => i.id)).not.toContain(id);
    await expect(w.leaveBoard.decide(w.as('sales.head'), id, 'approved')).rejects.toThrow(ForbiddenException);
    await w.leaveBoard.decide(w.as('sales.manager'), id, 'approved');
  });

  it('the person who asked, the stand-in and the manager each read who approved it, and that it was in her place', async () => {
    const w = aHundredPeople();
    const id = salesRequest(w).id;
    await w.leaveBoard.decide(w.as('sales.head'), id, 'approved');
    const head = w.people.find((p) => p.key === 'sales.head')!.first;
    const manager = w.people.find((p) => p.key === 'sales.manager')!.first;
    const said = (reader: string) => aRequestsHistory(w.prisma, ORG, 'leave', id, idOf(reader)).then((h) => h.said);
    expect((await said('sales.m1'))[0]).toBe(`${head} approved it on 7 October, standing in for ${manager}.`);
    expect((await said('sales.head'))[0]).toBe(`You approved it on 7 October, standing in for ${manager}.`);
    expect((await said('sales.manager'))[0]).toBe(`${head} approved it on 7 October, standing in for you.`);
  });

  it('the person asking reads who it waits for, in words, while she is away', async () => {
    const w = aHundredPeople();
    const mine = await w.leaveBoard.mine(w.as('sales.m1'), TODAY);
    const head = w.people.find((p) => p.key === 'sales.head')!.first;
    const manager = w.people.find((p) => p.key === 'sales.manager')!.first;
    expect(mine.requests.find((r) => r.id === salesRequest(w).id)!.where).toBe(`Your leave from Wednesday 21 October to Friday 23 October is waiting for ${head}, who is standing in for ${manager}.`);
  });
});

describe('when the hand-over does not happen', () => {
  it('leave that is only waiting, or was declined, hands over nothing', async () => {
    for (const status of ['waiting', 'declined']) {
      const w = aHundredPeople();
      w.leave.find((r) => r.userId === idOf('sales.manager'))!.status = status;
      const head = await w.queue.queue(w.as('sales.head'), { suite: 'leave' }, TODAY);
      expect(head.items.filter((i) => i.standingIn)).toEqual([]);
    }
  });

  it('a stand-in who is away too, who is a guest, or who is the person asking, does not stand in', async () => {
    const w = aHundredPeople();
    /* Operations: the stand-in, Customer Support’s manager, is away today too. */
    expect((await w.queue.queue(w.as('support.manager'), { suite: 'leave' }, TODAY)).items.filter((i) => i.standingIn)).toEqual([]);
    expect((await w.queue.queue(w.as('ops.manager'), { suite: 'leave' }, TODAY)).items.length).toBeGreaterThan(0);
    /* A guest. */
    (w.memberships.find((m) => m.userId === idOf('sales.head')) as { role: string }).role = 'GUEST';
    expect((await w.queue.queue(w.as('sales.manager'), { suite: 'leave' }, TODAY)).items.length).toBeGreaterThan(0);
    /* The person asking, who is Procurement’s stand-in, never decides their own. */
    const own = w.leave.find((r) => r.userId === idOf('procurement.m1') && r.status === 'waiting')!;
    expect((await w.queue.queue(w.as('procurement.m1'), { suite: 'leave' }, TODAY)).items.map((i) => i.id)).not.toContain(own.id);
    expect((await w.queue.queue(w.as('procurement.manager'), { suite: 'leave' }, TODAY)).items.map((i) => i.id)).toContain(own.id);
  });

  it('a review is written by whoever the rule names, whoever is on leave', async () => {
    const w = aHundredPeople();
    const request = { organizationId: ORG, requesterUserId: idOf('sales.m1'), managerExternalId: 'sales.manager', team: 'Sales' };
    expect(await theOneWhoDecides(w.prisma, ['manager', 'admin'], request)).toMatchObject({ kind: 'person', userId: idOf('sales.head'), standingInFor: idOf('sales.manager') });
    expect(await theOneWhoDecides(w.prisma, ['manager', 'admin'], request, { noCover: true })).toMatchObject({ kind: 'manager', userId: idOf('sales.manager') });
  });
});

describe('a plain member who stands in', () => {
  it('opens the leave and spending boards as an approver while she stands in, reads only the requests that wait for her there, and not before or after', async () => {
    const w = aHundredPeople();
    const board = await w.leaveBoard.board(w.as('procurement.m1'), TODAY);
    expect(board.reader).toBe('approver');
    expect(board.waiting.length).toBeGreaterThan(0);
    expect(board.waiting.every((x) => x.mayDecide)).toBe(true);
    expect(board.waiting.map((x) => x.id)).not.toContain(w.leave.find((r) => r.userId === idOf('procurement.m1') && r.status === 'waiting')!.id);
    expect((await w.spending.board(w.as('procurement.m1'), TODAY)).reader).toBe('approver');
    for (const day of ['2026-10-05', '2026-10-12']) {
      await expect(w.leaveBoard.board(w.as('procurement.m1'), new Date(`${day}T09:00:00Z`))).rejects.toThrow(ForbiddenException);
    }
  });

  it('another plain member, who stands in for nobody, is refused the board as before', async () => {
    const w = aHundredPeople();
    await expect(w.leaveBoard.board(w.as('procurement.m2'), TODAY)).rejects.toThrow('Only an admin or a lead can open this board.');
  });
});
