import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SpendingForFinanceService } from './the-spending-for-finance.service';
import { ORG, TEAMS, TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';

/**
 * THE MONTH'S SPENDING, ADDED UP FOR FINANCE, AS EACH READER READS IT (suites at scale, Baobab Distribution,
 * Wednesday 7 October 2026, KES).
 *
 * Per team and per category, from the requests asked for in the month: what was asked, what was approved, what was paid and what
 * still waits. Added up here, in the spec, straight from the rows, so the service has nothing to agree with but the requests.
 * Served to whoever looks after finance and to an admin, and to nobody else.
 */

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); });
afterEach(() => { jest.useRealTimers(); });

const finance = (w: ReturnType<typeof aHundredPeople>) => new SpendingForFinanceService(w.prisma);
const inOctober = (w: ReturnType<typeof aHundredPeople>) => w.spend.filter((r) => r.createdAt >= new Date('2026-10-01T00:00:00Z') && r.createdAt < new Date('2026-11-01T00:00:00Z'));
const sum = (rows: any[]) => rows.reduce((t, r) => t + Number(r.amount), 0);

describe('the totals match the requests', () => {
  it('each team’s asked, approved, paid, waiting and declined are the sums of its own October requests, and the teams add up to the whole', async () => {
    const w = aHundredPeople();
    const t = await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY);
    const rows = inOctober(w);
    expect(rows.length).toBeGreaterThan(50);
    for (const team of TEAMS) {
      const mine = rows.filter((r) => r.team === team.name);
      const line = t.byTeam.find((x) => x.name === team.name)!;
      expect(line.asked).toEqual({ count: mine.length, amount: sum(mine) });
      expect(line.approved).toEqual({ count: mine.filter((r) => r.status === 'approved').length, amount: sum(mine.filter((r) => r.status === 'approved')) });
      expect(line.paid).toEqual({ count: mine.filter((r) => r.status === 'approved' && r.paidOn).length, amount: sum(mine.filter((r) => r.status === 'approved' && r.paidOn)) });
      expect(line.waiting).toEqual({ count: mine.filter((r) => r.status === 'waiting').length, amount: sum(mine.filter((r) => r.status === 'waiting')) });
      expect(line.declined.count).toBe(mine.filter((r) => r.status === 'declined').length);
    }
    expect(t.all.asked).toEqual({ count: rows.length, amount: sum(rows) });
    expect(sum(t.byTeam.map((x) => ({ amount: x.asked.amount })))).toBe(sum(rows));
    expect(t.byTeam.reduce((n, x) => n + x.asked.count, 0)).toBe(rows.length);
  });

  it('each category is the same sum over its own requests, and the categories add up to the same whole', async () => {
    const w = aHundredPeople();
    const t = await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY);
    const rows = inOctober(w);
    for (const c of ['Fuel', 'Travel', 'Equipment']) {
      const mine = rows.filter((r) => r.category === c);
      expect(t.byCategory.find((x) => x.name === c)!.approved).toEqual({ count: mine.filter((r) => r.status === 'approved').length, amount: sum(mine.filter((r) => r.status === 'approved')) });
    }
    expect(t.byCategory.reduce((n, x) => n + x.asked.amount, 0)).toBe(sum(rows));
    expect(t.byCategory.reduce((n, x) => n + x.asked.count, 0)).toBe(rows.length);
  });

  it('is only the month: last month’s requests are not in October’s, and are in September’s', async () => {
    const w = aHundredPeople();
    const oct = await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY);
    const sep = await finance(w).totals(w.as('finance.m1'), '2026-09', TODAY);
    const september = w.spend.filter((r) => r.createdAt >= new Date('2026-09-01T00:00:00Z') && r.createdAt < new Date('2026-10-01T00:00:00Z'));
    expect(sep.all.asked).toEqual({ count: september.length, amount: sum(september) });
    expect(oct.all.asked.count + sep.all.asked.count).toBe(w.spend.length);
    expect((await finance(w).totals(w.as('finance.m1'), undefined, TODAY)).month).toBe('2026-10');
    expect((await finance(w).totals(w.as('finance.m1'), '2025-01', TODAY)).says).toBe('Nobody asked to spend anything in January 2025.');
  });

  it('a request with no team on it takes the person’s department, and one with neither is without a team', async () => {
    const w = aHundredPeople();
    const r = inOctober(w).find((x) => x.team === 'Sales' && x.status === 'waiting')!;
    r.team = null;
    const t = await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY);
    expect(t.byTeam.find((x) => x.name === 'Sales')!.asked.count).toBe(inOctober(w).filter((x) => x.userId.startsWith('u-sales.') ).length);
    w.directory.find((p) => p.externalId === 'sales.m1')!.department = null;
    r.userId = idOf('sales.m1');
    expect((await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY)).byTeam.find((x) => x.name === 'Without a team')!.asked.count).toBe(1);
  });
});

describe('in the organisation’s currency, in full sentences', () => {
  it('says each line with the currency, and says nothing of anybody', async () => {
    const w = aHundredPeople();
    const t = await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY);
    expect(t.currency).toBe('KES');
    expect(t.monthSays).toBe('October 2026');
    const ops = t.byTeam.find((x) => x.name === 'Operations')!;
    expect(ops.says).toMatch(/^Operations has KES [\d,]+ approved in October 2026, and KES [\d,]+ still waiting for an answer\.$/);
    /* Paid money is said where there is some: the 31,000 each team was paid was asked for in September. */
    expect((await finance(w).totals(w.as('finance.m1'), '2026-09', TODAY)).byTeam.find((x) => x.name === 'Operations')!.says).toBe('Operations has KES 31,000 approved in September 2026, KES 31,000 of it paid, and KES 22,300 still waiting for an answer.');
    expect(t.says).toMatch(/^In October 2026, \d+ requests were asked for, adding up to KES [\d,]+\. All teams have KES [\d,]+ approved in October 2026/);
    const text = JSON.stringify(t);
    for (const p of w.people.slice(0, 30)) expect(text).not.toContain(`${p.first} ${p.last}`);
    expect(text).not.toMatch(/userId|what"|"id"/);
  });

  it('says it without a currency when the organisation has not set one, and does not make one up', async () => {
    const w = aHundredPeople();
    w.suites.spend.answers = { ...w.suites.spend.answers, currency: undefined };
    const t = await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY);
    expect(t.currency).toBeNull();
    expect(t.says).not.toMatch(/KES/);
    expect(t.byTeam[0].says).toMatch(/^[A-Z][A-Za-z ]+ has [\d,]+ approved/);
  });
});

describe('who reads it', () => {
  it('whoever looks after finance, and the admins, read it; each reads their own kind', async () => {
    const w = aHundredPeople();
    expect((await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY)).reader).toBe('finance');
    expect((await finance(w).totals(w.as('ceo'), '2026-10', TODAY)).reader).toBe('admin');
    expect((await finance(w).totals(w.as('ops.head'), '2026-10', TODAY)).reader).toBe('admin');
  });

  it('nobody else does: the head of a team, a manager, HR, the person who asked, another member and somebody outside', async () => {
    const w = aHundredPeople();
    for (const who of ['sales.head', 'sales.manager', 'hr.m1', 'sales.m1', 'finance.m2', 'eng.m9']) {
      await expect(finance(w).totals(w.as(who), '2026-10', TODAY)).rejects.toThrow(ForbiddenException);
    }
    await expect(finance(w).totals({ userId: 'u-stranger', organizationId: ORG }, '2026-10', TODAY)).rejects.toThrow(ForbiddenException);
  });

  it('asks for the month the way it is written, and says so when it is not', async () => {
    const w = aHundredPeople();
    for (const bad of ['October', '2026-13', '2026-1', '10-2026']) await expect(finance(w).totals(w.as('finance.m1'), bad, TODAY)).rejects.toThrow(BadRequestException);
  });

  it('reads the month in the same few questions however many requests there are', async () => {
    const w = aHundredPeople();
    w.calls.length = 0;
    await finance(w).totals(w.as('finance.m1'), '2026-10', TODAY);
    expect(w.calls.length).toBeLessThanOrEqual(7);
    expect(w.calls.filter((c) => /\.(update|create|updateMany)$/.test(c))).toEqual([]);
  });
});
