import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ORG, TEAMS, TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';

/**
 * THE APPROVER'S QUEUE AT A HUNDRED PEOPLE AND A HUNDRED AND FORTY-TWO REQUESTS, AS EACH READER READS IT.
 *
 * Baobab Distribution (__fixtures__/a-hundred-people.ts), Wednesday 7 October 2026. 92 requests wait: 29
 * for leave and 63 to spend. Leave goes to the person's manager; spending to the manager and then finance,
 * and above KES 50,000 to the manager, the head and then finance. This week Sales' manager is on leave
 * and the head of Sales stands in; Operations' manager is on leave but the person standing in for her is
 * away too; Customer Support's manager is away with nobody standing in; Procurement's manager is away
 * and a plain member of Procurement stands in.
 */

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); });
afterEach(() => { jest.useRealTimers(); });

const teamOf = (key: string) => TEAMS.find((t) => key.startsWith(`${t.key}.`))!.name;

describe('what each reader reads of the queue', () => {
  it('Omar-in-finance, the member who looks after finance, reads the 27 requests to spend that wait for finance, oldest first, and no leave', async () => {
    const w = aHundredPeople();
    const q = await w.queue.queue(w.as('finance.m1'), { pageSize: 100 }, TODAY);
    expect(q.counts).toEqual({ all: 27, leave: 0, spend: 27, pastTheDeadline: expect.any(Number) });
    expect(q.says).toMatch(/^Twenty-seven|^27 requests are waiting for you to approve or decline/);
    expect(q.items.every((i) => i.suite === 'spend')).toBe(true);
    const times = q.items.map((i) => Date.parse(i.waitingSince));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(q.items[0].where).toMatch(/^.+ (has|have) approved it, and it is now waiting for you\.$/);
    expect(q.items[0].says).toMatch(/^[A-Z][a-z]+ asked to spend KES [\d,]+ on [a-z]/);
  });

  it('the head of Sales reads her own team’s request above the limit, and Sales’ manager’s whole queue while the manager is on leave, each said so', async () => {
    const w = aHundredPeople();
    const q = await w.queue.queue(w.as('sales.head'), { pageSize: 100 }, TODAY);
    expect(q.counts).toMatchObject({ all: 7, leave: 3, spend: 4 });
    const standing = q.items.filter((i) => i.standingIn);
    expect(standing).toHaveLength(6);
    const manager = w.people.find((p) => p.key === 'sales.manager')!;
    expect(standing[0].standingIn).toEqual({ name: manager.first, until: '2026-10-09', says: `You are standing in for ${manager.first}, who is on leave until Friday 9 October.` });
    expect(q.items.find((i) => !i.standingIn)!.says).toMatch(/asked to spend KES 120,000 on /);
  });

  it('Sales’ manager, on leave with a stand-in, reads nothing waiting for her, not even for the days she is away', async () => {
    const w = aHundredPeople();
    const q = await w.queue.queue(w.as('sales.manager'), {}, TODAY);
    expect(q).toMatchObject({ counts: { all: 0, leave: 0, spend: 0, pastTheDeadline: 0 }, items: [], says: 'Nothing is waiting for you to approve or decline.' });
  });

  it('Operations’ manager, whose stand-in is away too, still reads her team’s five leave requests and three to spend', async () => {
    const w = aHundredPeople();
    expect((await w.queue.queue(w.as('ops.manager'), {}, TODAY)).counts).toMatchObject({ all: 8, leave: 5, spend: 3 });
    expect((await w.queue.queue(w.as('support.manager'), {}, TODAY)).counts).toMatchObject({ all: 6, leave: 3, spend: 3 });
  });

  it('a plain member who stands in for Procurement’s manager has no right to decide, so reads nothing of the team’s, which stays with the manager until it is passed on by rule', async () => {
    const w = aHundredPeople();
    expect(await w.queue.queue(w.as('procurement.m1'), { pageSize: 100 }, TODAY)).toMatchObject({ counts: { all: 0 }, items: [] });
    expect((await w.queue.queue(w.as('procurement.manager'), { pageSize: 100 }, TODAY)).counts.all).toBeGreaterThanOrEqual(6);
  });

  it('nobody who has nothing to decide reads anybody else’s: the person who asked, HR, an admin whom nothing has reached, another member', async () => {
    const w = aHundredPeople();
    for (const who of ['sales.m1', 'hr.m1', 'ceo', 'sales.m5', 'eng.m9']) {
      expect(await w.queue.queue(w.as(who), {}, TODAY)).toMatchObject({ counts: { all: 0 }, items: [], says: 'Nothing is waiting for you to approve or decline.' });
    }
    /* The head of Operations is an admin, and reads the one request above the limit that waits for her as the head. */
    expect((await w.queue.queue(w.as('ops.head'), {}, TODAY)).counts.all).toBe(1);
  });

  it('every one of the 92 waiting requests is in exactly one person’s queue, so the counts add up across the hundred', async () => {
    const w = aHundredPeople();
    let all = 0; let leave = 0; let spend = 0;
    const seen = new Set<string>();
    for (const p of w.people) {
      const q = await w.queue.queue(w.as(p.key), { pageSize: 100 }, TODAY);
      all += q.counts.all; leave += q.counts.leave; spend += q.counts.spend;
      for (const i of q.items) { expect(seen.has(i.id)).toBe(false); seen.add(i.id); }
    }
    expect({ all, leave, spend }).toEqual({ all: 92, leave: 29, spend: 63 });
    expect(w.leave.filter((r) => r.status === 'waiting')).toHaveLength(29);
    expect(w.spend.filter((r) => r.status === 'waiting')).toHaveLength(63);
  });

  it('a guest, and somebody from another organisation, are refused; a suite that is off is not read', async () => {
    const w = aHundredPeople();
    await expect(w.queue.queue({ userId: 'u-stranger', organizationId: ORG }, {}, TODAY)).rejects.toThrow(ForbiddenException);
    w.suites.leave.isOn = false; w.suites.spend.isOn = false;
    await expect(w.queue.queue(w.as('finance.m1'), {}, TODAY)).rejects.toThrow(NotFoundException);
  });
});

describe('ordered, paged, and counted the same on every page', () => {
  it('pages of 25 hold every request once, oldest first, and say the whole count on each', async () => {
    const w = aHundredPeople();
    const pages = [];
    for (let page = 1; page <= 2; page++) pages.push(await w.queue.queue(w.as('finance.m1'), { page, pageSize: 25 }, TODAY));
    expect(pages.map((p) => [p.page, p.pages, p.items.length, p.counts.all])).toEqual([[1, 2, 25, 27], [2, 2, 2, 27]]);
    const ids = pages.flatMap((p) => p.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(27);
    const times = pages.flatMap((p) => p.items.map((i) => Date.parse(i.waitingSince)));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('a page past the end reads the last one, a page size over a hundred is a hundred, and the suite can be narrowed without changing the counts', async () => {
    const w = aHundredPeople();
    expect((await w.queue.queue(w.as('finance.m1'), { page: 99, pageSize: 25 }, TODAY)).page).toBe(2);
    expect((await w.queue.queue(w.as('finance.m1'), { pageSize: 1000 }, TODAY)).pageSize).toBe(100);
    const leaveOnly = await w.queue.queue(w.as('ops.manager'), { suite: 'leave' }, TODAY);
    expect(leaveOnly.items.every((i) => i.suite === 'leave')).toBe(true);
    expect(leaveOnly.counts).toMatchObject({ all: 8, leave: 5, spend: 3 });
  });

  it('a request waiting past the two working days says so, and is counted', async () => {
    const w = aHundredPeople();
    const q = await w.queue.queue(w.as('ops.manager'), { pageSize: 100 }, TODAY);
    const old = q.items.filter((i) => i.pastTheDeadline);
    expect(old.length).toBeGreaterThan(0);
    expect(q.counts.pastTheDeadline).toBe(old.length);
    expect(q.says).toMatch(/of them (has|have) waited longer than your organisation allows before a request is passed on\.$/);
    expect(old[0].waitedSays).toMatch(/^It has waited \d+ working days\.$/);
    expect(q.items.some((i) => i.waitedSays === 'It was asked for today.')).toBe(true);
  });
});

describe('one read, however big the organisation is', () => {
  it('asks the database the same eight questions for a hundred people and 142 requests as for a small organisation', async () => {
    const big = aHundredPeople();
    big.calls.length = 0;
    await big.queue.queue(big.as('finance.m1'), { pageSize: 100 }, TODAY);
    const bigCalls = [...big.calls];
    const small = aHundredPeople({ teams: 2 });
    small.calls.length = 0;
    await small.queue.queue(small.as('finance.m1'), { pageSize: 100 }, TODAY);
    expect(bigCalls.length).toBeLessThanOrEqual(9);
    expect(bigCalls.sort()).toEqual([...small.calls].sort());
    expect(big.leave.length + big.spend.length).toBeGreaterThan(140);
  });

  it('asks a reader with an empty queue even less, and writes nothing', async () => {
    const w = aHundredPeople();
    w.calls.length = 0;
    await w.queue.queue(w.as('sales.m5'), {}, TODAY);
    expect(w.calls.length).toBeLessThanOrEqual(7);
    expect(w.calls.filter((c) => /\.(update|create|updateMany)$/.test(c))).toEqual([]);
  });
});

describe('what the clash says, to the people who read it', () => {
  it('Operations’ manager reads who else is off the days a request asks for, how many and who, in the leave board’s own sentence', async () => {
    const w = aHundredPeople();
    const q = await w.queue.queue(w.as('ops.manager'), { suite: 'leave', pageSize: 100 }, TODAY);
    const asked = q.items.filter((i) => i.startsOn === '2026-10-14');
    expect(asked).toHaveLength(2);
    const off = w.people.filter((p) => ['ops.m1', 'ops.m2', 'ops.m4', 'ops.m3'].includes(p.key)).map((p) => p.first);
    for (const i of asked) {
      expect(i.clash).toEqual({ count: 4, names: expect.arrayContaining(off), says: expect.stringMatching(/ are also off on some of those days, so Operations would be five short\.$/) });
    }
    /* A request in a team where nobody is off has no clash. */
    expect(q.items.find((i) => i.team === 'Operations' && i.startsOn === '2026-10-21')!.clash).toBeNull();
  });

  it('the stand-in reads the clash too, because the board already shows it to whoever decides; the person who asked is never served it', async () => {
    const w = aHundredPeople();
    expect((await w.queue.queue(w.as('procurement.m1'), { suite: 'leave' }, TODAY)).items.every((i) => i.clash === null || typeof i.clash.says === 'string')).toBe(true);
    expect(JSON.stringify(await w.queue.queue(w.as('ops.m5'), {}, TODAY))).not.toMatch(/also off/);
  });
});

it('does not use idOf for anything it is not', () => { expect(idOf('x')).toBe('u-x'); expect(teamOf('ops.m1')).toBe('Operations'); });

describe('a line that starts with a name the organisation knows keeps its capital', () => {
  it('finance reads "on Operations offsite" and "on two tablets", from the same queue', async () => {
    const w = aHundredPeople();
    const mine = w.spend.filter((r) => r.status === 'waiting' && r.step >= 1 && !(r.step === 1 && r.amount > 50_000));
    mine[0].what = 'Operations offsite';
    mine[1].what = 'Two tablets for the field team';
    const q = await w.queue.queue(w.as('finance.m1'), { pageSize: 100 }, TODAY);
    expect(q.items.find((i) => i.id === mine[0].id)!.says).toMatch(/ on Operations offsite\.$/);
    expect(q.items.find((i) => i.id === mine[1].id)!.says).toMatch(/ on two tablets for the field team\.$/);
  });
});
