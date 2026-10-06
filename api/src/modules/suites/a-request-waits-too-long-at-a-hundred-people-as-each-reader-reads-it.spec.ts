import { ARequestWaitsTooLongCron } from './a-request-waits-too-long.cron';
import { aRequestsHistory } from './a-request-is-recorded';
import { ORG, TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';

/**
 * A REQUEST THAT WAITS TOO LONG, AT A HUNDRED PEOPLE, AS EACH READER READS IT (suites at scale).
 *
 * Baobab Distribution, Wednesday 7 October 2026. The organisation passes leave and spending on after two working days:
 * leave goes manager, then the head, then an admin; spending goes manager (or finance) and then an admin. A request is
 * passed on once for each time it waits that long, to the next person on the list who is somebody else, and that person
 * is told once.
 */

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); });
afterEach(() => { jest.useRealTimers(); });

const world = () => {
  const w = aHundredPeople();
  const cron = new ARequestWaitsTooLongCron(w.prisma, w.leaveBoard, w.spending, { passOnWhatWaitsTooLong: async () => [] } as any);
  const on = (s: string) => { const d = new Date(`${s}T09:00:00Z`); jest.setSystemTime(d); return d; };
  const first = (key: string) => w.people.find((p) => p.key === key)!.first;
  const said = (id: string, reader: string, suite: 'leave' | 'spend' = 'leave') => aRequestsHistory(w.prisma, ORG, suite, id, idOf(reader)).then((h) => h.said);
  return { w, cron, on, first, said };
};

describe('it is passed on after the two working days, to the right person', () => {
  it('Sales’ request that has waited seven working days with the head standing in goes to an admin, because the head is already who it waits for', async () => {
    const { w, cron, first, said } = world();
    const request = w.leave.find((r) => r.userId === idOf('sales.m3') && r.status === 'waiting')!;
    await cron.passOnNow(TODAY);
    expect(request).toMatchObject({ escalatedTo: 2, stepSince: TODAY });
    expect(await said(request.id, 'sales.m3')).toEqual([`Groundwork passed it to an admin on 7 October, because ${first('sales.head')} had not answered for 7 working days.`]);
    expect(await said(request.id, 'sales.head')).toEqual(['Groundwork passed it to an admin on 7 October, because you had not answered for 7 working days.']);
    /* The admins read it in their queue, and the head no longer does. */
    expect((await w.queue.queue(w.as('ceo'), { suite: 'leave', pageSize: 100 }, TODAY)).items.map((i) => i.id)).toContain(request.id);
    expect((await w.queue.queue(w.as('sales.head'), { suite: 'leave', pageSize: 100 }, TODAY)).items.map((i) => i.id)).not.toContain(request.id);
  });

  it('a request whose approver is on leave with nobody standing in goes to the head the same day, and says why', async () => {
    const { w, cron, first, said } = world();
    const request = w.leave.find((r) => r.userId === idOf('support.m1') && r.status === 'waiting')!;
    await cron.passOnNow(TODAY);
    expect(await said(request.id, 'support.m1')).toEqual([`Groundwork passed it to ${first('support.head')} on 7 October, because ${first('support.manager')} was on leave.`]);
    expect(await said(request.id, 'support.head')).toEqual([`Groundwork passed it to you on 7 October, because ${first('support.manager')} was on leave.`]);
    expect(await said(request.id, 'support.manager')).toEqual([`Groundwork passed it to ${first('support.head')} on 7 October, because you were on leave.`]);
    const mine = await w.leaveBoard.mine(w.as('support.m1'), TODAY);
    expect(mine.requests.find((r) => r.id === request.id)!.where).toBe(`Your leave from Wednesday 21 October to Friday 23 October is waiting for ${first('support.head')}, who heads Customer Support.`);
  });

  it('a request that has not waited long, and whose approver is here, is left alone, for every reader', async () => {
    const { w, cron, said } = world();
    const request = w.leave.find((r) => r.userId === idOf('eng.m2') && r.status === 'waiting')!;
    await cron.passOnNow(TODAY);
    expect(request).toMatchObject({ escalatedTo: 0 });
    expect(await said(request.id, 'eng.m2')).toEqual([]);
  });
});

describe('it is passed on once', () => {
  it('the same day again passes nothing; the next day passes only what has newly waited long enough, never what was passed on the day before', async () => {
    const { w, cron, on } = world();
    const wednesday = await cron.passOnNow(TODAY);
    expect(wednesday.passedOn).toBe(57);
    const passedOnWednesday = new Set(w.events.filter((e) => e.kind === 'escalated').map((e) => `${e.suite}|${e.ref}`));
    expect((await cron.passOnNow(TODAY)).passedOn).toBe(0);
    const thursday = await cron.passOnNow(on('2026-10-08'));
    const nowPassed = w.events.filter((e) => e.kind === 'escalated').map((e) => `${e.suite}|${e.ref}`);
    expect(nowPassed.length).toBe(57 + thursday.passedOn);
    /* The requests asked for on Tuesday have now waited two working days; nobody is passed on twice in two days. */
    expect(new Set(nowPassed).size).toBe(nowPassed.length);
    expect(thursday.passedOn).toBeGreaterThan(0);
    for (const ref of passedOnWednesday) expect(nowPassed.filter((r) => r === ref)).toHaveLength(1);
  });

  it('a request at the end of its list is never passed again, however long it waits', async () => {
    const { w, cron, on } = world();
    await cron.passOnNow(TODAY);
    const atTheAdmin = w.spend.find((r) => r.userId === idOf('sales.m4') && r.status === 'waiting')!;
    expect(atTheAdmin).toMatchObject({ step: 0, escalatedTo: 1 });
    for (const day of ['2026-10-12', '2026-10-19', '2026-11-02']) await cron.passOnNow(on(day));
    expect(atTheAdmin.escalatedTo).toBe(1);
    expect(w.events.filter((e) => e.kind === 'escalated' && e.ref === atTheAdmin.id)).toHaveLength(1);
  });

  it('two runs of the clock at the same moment pass each request once, record it once and tell once', async () => {
    const { w, cron } = world();
    const [a, b] = await Promise.all([cron.passOnNow(TODAY), cron.passOnNow(TODAY)]);
    expect(a.passedOn + b.passedOn).toBe(57);
    const escalated = w.events.filter((e) => e.kind === 'escalated');
    expect(escalated).toHaveLength(57);
    expect(new Set(escalated.map((e) => `${e.suite}|${e.ref}`)).size).toBe(57);
    expect(w.told).toHaveLength(57);
  });

  it('an answer given as the clock reaches the request wins: it is approved or passed on, never both', async () => {
    const { w, cron } = world();
    const request = w.leave.find((r) => r.userId === idOf('sales.m3') && r.status === 'waiting')!;
    await Promise.allSettled([w.leaveBoard.decide(w.as('sales.head'), request.id, 'approved'), cron.passOnNow(TODAY)]);
    const approved = request.status === 'approved';
    const passed = request.escalatedTo > 0;
    expect(approved !== passed).toBe(true);
    expect(w.events.filter((e) => e.ref === request.id && e.kind === 'escalated')).toHaveLength(passed ? 1 : 0);
  });
});

describe('it is told once, and only to the one it now waits for', () => {
  it('each request passed on tells the new approver once, and nobody else: not the person who asked, not the one it was taken from', async () => {
    const { w, cron } = world();
    await cron.passOnNow(TODAY);
    const request = w.leave.find((r) => r.userId === idOf('support.m1') && r.status === 'waiting')!;
    const about = w.told.filter((t) => t.request.ref === request.id);
    expect(about).toHaveLength(1);
    expect(about[0].to).toEqual([idOf('support.head')]);
    expect(about[0].request.firstName).toBe(w.people.find((p) => p.key === 'support.m1')!.first);
    /* Passed to any admin, it is told to each admin once. */
    const toAdmins = w.told.filter((t) => t.request.ref === w.leave.find((r) => r.userId === idOf('sales.m3') && r.status === 'waiting')!.id);
    expect(toAdmins).toHaveLength(1);
    expect(toAdmins[0].to).toEqual([idOf('ceo'), idOf('ops.head')]);
  });
});
