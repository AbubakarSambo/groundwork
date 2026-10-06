import { ForbiddenException } from '@nestjs/common';
import { ORG, TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';

/**
 * A LEAVE CLASH, AS EACH READER READS IT (suites at scale, Baobab Distribution, Wednesday 7 October 2026).
 *
 * Four people in Operations are off on some of 14, 15 and 16 October (approved), and two more, ops.m5 and ops.m6, ask for all three
 * days. The one who decides is told plainly how many are off and who, in the sentence the leave board already says, and only
 * they, and the people the board already shows it to, read the names.
 */

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); });
afterEach(() => { jest.useRealTimers(); });

const askedOct14 = (w: ReturnType<typeof aHundredPeople>, key: string) => w.leave.find((r) => r.userId === idOf(key) && r.status === 'waiting' && r.startsOn.toISOString().startsWith('2026-10-14'))!;

describe('who reads that four are already off', () => {
  it('Operations’ manager, who decides it, reads how many and who on her board and in her queue, in the same sentence', async () => {
    const w = aHundredPeople();
    const off = ['ops.m1', 'ops.m2', 'ops.m3', 'ops.m4'].map((k) => w.people.find((p) => p.key === k)!.first);
    const id = askedOct14(w, 'ops.m5').id;
    const board = (await w.leaveBoard.board(w.as('ops.manager'), TODAY)).waiting.find((x) => x.id === id)!;
    const queue = (await w.queue.queue(w.as('ops.manager'), { suite: 'leave', pageSize: 100 }, TODAY)).items.find((x) => x.id === id)!;
    expect(board.clash).toEqual({ count: 3, names: expect.arrayContaining(off), says: expect.stringMatching(/ are also off on some of those days\. On the busiest of them, Operations would be four short\.$/) });
    expect(queue.clash).toEqual(board.clash);
    expect(board.said).toContain(board.clash!.says);
  });

  it('the head of Operations, an admin, reads it on the board; a lead of another team reads nothing of Operations at all', async () => {
    const w = aHundredPeople();
    const id = askedOct14(w, 'ops.m5').id;
    expect((await w.leaveBoard.board(w.as('ops.head'), TODAY)).waiting.find((x) => x.id === id)!.clash!.names).toHaveLength(4);
    const other = await w.leaveBoard.board(w.as('eng.manager'), TODAY);
    expect(other.waiting.map((x) => x.team)).not.toContain('Operations');
    expect(JSON.stringify(other)).not.toMatch(new RegExp(w.people.find((p) => p.key === 'ops.m1')!.first + ' [A-Z]'));
  });

  it('the person asking, another member of the team and a member who decides nothing read none of it', async () => {
    const w = aHundredPeople();
    const asked = await w.leaveBoard.mine(w.as('ops.m5'), TODAY);
    expect(JSON.stringify(asked)).not.toMatch(/also off|clash|short/);
    await expect(w.leaveBoard.board(w.as('ops.m7'), TODAY)).rejects.toThrow(ForbiddenException);
    expect(JSON.stringify(await w.queue.queue(w.as('ops.m7'), {}, TODAY))).not.toMatch(/also off/);
  });
});

describe('what counts as being off', () => {
  it('only approved leave of people in the same team on days that overlap, and each person once', async () => {
    const w = aHundredPeople();
    const id = askedOct14(w, 'ops.m5').id;
    /* Waiting and declined leave in the team, leave in another team, and leave on other days, do not count. */
    for (const [key, from, to, status] of [['ops.m8', '2026-10-14', '2026-10-16', 'waiting'], ['ops.m9', '2026-10-14', '2026-10-16', 'declined'], ['sales.m4', '2026-10-14', '2026-10-16', 'approved'], ['ops.m7', '2026-10-19', '2026-10-21', 'approved']] as const) {
      w.leave.push({ ...w.leave[0], id: `x-${key}-${status}`, userId: idOf(key), startsOn: new Date(`${from}T00:00:00Z`), endsOn: new Date(`${to}T00:00:00Z`), status, standInUserId: null });
    }
    /* A second stretch of leave for one of the four, on the same days. */
    w.leave.push({ ...w.leave[0], id: 'x-twice', userId: idOf('ops.m1'), startsOn: new Date('2026-10-15T00:00:00Z'), endsOn: new Date('2026-10-15T00:00:00Z'), status: 'approved', standInUserId: null });
    const clash = (await w.queue.queue(w.as('ops.manager'), { suite: 'leave', pageSize: 100 }, TODAY)).items.find((x) => x.id === id)!.clash!;
    expect(clash.names).toHaveLength(4);
    expect(clash.count).toBe(3);
  });

  it('two people who share a first name are told apart by their full names, and counted as two', async () => {
    const w = aHundredPeople();
    const one = w.users.find((u) => u.id === idOf('ops.m1'))!;
    const two = w.users.find((u) => u.id === idOf('ops.m2'))!;
    two.firstName = one.firstName;
    const id = askedOct14(w, 'ops.m5').id;
    const clash = (await w.queue.queue(w.as('ops.manager'), { suite: 'leave', pageSize: 100 }, TODAY)).items.find((x) => x.id === id)!.clash!;
    expect(clash.names).toHaveLength(4);
    expect(clash.names).toEqual(expect.arrayContaining([`${one.firstName} ${one.lastName}`, `${two.firstName} ${two.lastName}`]));
    expect((await w.leaveBoard.board(w.as('ops.manager'), TODAY)).waiting.find((x) => x.id === id)!.clash!.names).toHaveLength(4);
  });

  it('when many are off it names five and counts the rest, and still says how short the team would be', async () => {
    const w = aHundredPeople();
    const id = askedOct14(w, 'ops.m5').id;
    for (const k of ['ops.m7', 'ops.m8', 'ops.m9', 'ops.manager', 'ops.head', 'ops.m1']) {
      w.leave.push({ ...w.leave[0], id: `many-${k}`, userId: idOf(k), startsOn: new Date('2026-10-14T00:00:00Z'), endsOn: new Date('2026-10-14T00:00:00Z'), status: 'approved', standInUserId: null });
    }
    const clash = (await w.queue.queue(w.as('ops.manager'), { suite: 'leave', pageSize: 100 }, TODAY)).items.find((x) => x.id === id)!.clash!;
    expect(clash.names).toHaveLength(9);
    expect(clash.count).toBe(8);
    expect(clash.says).toMatch(/^([A-Z][a-z]+, ){5}and 4 others are also off|^([A-Z][a-z]+, ){4}[A-Z][a-z]+ and 4 others are also off/);
    expect(clash.says).toMatch(/On the busiest of them, Operations would be nine short\.$/);
  });

  it('a request in a team where nobody is off says so on the board and leaves the queue’s clash empty', async () => {
    const w = aHundredPeople();
    const id = w.leave.find((r) => r.userId === idOf('eng.m1') && r.status === 'waiting')!.id;
    const board = (await w.leaveBoard.board(w.as('eng.manager'), TODAY)).waiting.find((x) => x.id === id)!;
    expect(board.clash).toBeNull();
    expect(board.said).toContain('Nobody else in Engineering is off those days.');
    expect((await w.queue.queue(w.as('eng.manager'), { suite: 'leave', pageSize: 100 }, TODAY)).items.find((x) => x.id === id)!.clash).toBeNull();
  });

  it('four people off on four different days are four names and a team two short, never five short; one day keeps its own form', async () => {
    const w = aHundredPeople();
    const day = (k: string, d: string) => w.leave.push({ ...w.leave[0], id: `d-${k}`, userId: idOf(k), startsOn: new Date(`${d}T00:00:00Z`), endsOn: new Date(`${d}T00:00:00Z`), status: 'approved', standInUserId: null });
    day('eng.m2', '2026-10-21'); day('eng.m3', '2026-10-22'); day('eng.m4', '2026-10-23'); day('eng.m5', '2026-10-26');
    const items = (await w.queue.queue(w.as('eng.manager'), { suite: 'leave', pageSize: 100 }, TODAY)).items;
    const week = items.find((x) => x.startsOn === '2026-10-21')!.clash!;
    expect(week.names).toHaveLength(3);
    expect(week.count).toBe(1);
    expect(week.says).toMatch(/ are also off on some of those days\. On the busiest of them, Engineering would be two short\.$/);
    const one = items.find((x) => x.startsOn === '2026-10-26')!.clash!;
    expect(one.says).toMatch(/^\w+ is also off that day, so Engineering would be two short\.$/);
  });

  it('keeps ORG in use', () => { expect(ORG).toBe('org-baobab'); });
});
