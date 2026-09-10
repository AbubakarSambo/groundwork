import { readFileSync } from 'fs';
import { join } from 'path';
import { A_CUSTOMER, A_REAL_CHECK_IN, A_REAL_SESSION, aRate, aMean, sinceFor, session2RateOfThoseDue, NO_SCHEDULE_TO_BE_DUE_AGAINST } from './what-the-platform-has-actually-done';

/**
 * A NUMBER ON THE PLATFORM PANEL COUNTS ONE KIND OF THING. The console counted setup conversations
 * as sessions and our own organisations as customers, and called three different objects
 * "check-ins". One module holds the predicates; the two services read through it and nothing else.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (rel: string) => strip(readFileSync(join(__dirname, rel), 'utf8'));

describe('the predicates', () => {
  it('a session is not a setup conversation and belongs to a customer', () => {
    expect(A_REAL_SESSION).toEqual({ isSetup: false, ground: { organization: { isInternal: false } } });
    expect(A_REAL_CHECK_IN).toEqual({ organization: { isInternal: false } });
    expect(A_CUSTOMER).toEqual({ isInternal: false });
  });

  it('a rate carries its denominator and is null over nothing', () => {
    expect(aRate(21, 34)).toEqual({ pct: 62, of: 34, n: 21 });
    expect(aRate(0, 0)).toEqual({ pct: null, of: 0, n: 0 });
    expect(aRate(5, 4).pct).toBe(100);
  });

  it('a mean over fewer than thirty is a whole number', () => {
    expect(aMean(3.76, 11)).toEqual({ value: 4, n: 11 });
    expect(aMean(3.76, 31)).toEqual({ value: 3.8, n: 31 });
    expect(aMean(null, 0)).toEqual({ value: null, n: 0 });
  });

  it('the range is one of four and "all" is null, said', () => {
    const now = new Date('2026-09-11T00:00:00Z');
    expect(sinceFor('7d', now)?.toISOString()).toBe('2026-09-04T00:00:00.000Z');
    expect(sinceFor('all', now)).toBeNull();
    expect(sinceFor(undefined, now)).toBeNull();
  });
});

describe('the session-two rate', () => {
  it('is over those whose session two was due, excludes cadences with no schedule, and a decline is not a return', async () => {
    const prisma = {
      checkIn: {
        findMany: jest.fn(async ({ where }: any) => {
          expect(where.isSetup).toBe(false);
          expect(where.ground.cadence.notIn).toEqual([...NO_SCHEDULE_TO_BE_DUE_AGAINST]);
          expect(where.participant.checkIns.some.availableFrom.lte).toBeInstanceOf(Date);
          return [
            { participant: { checkIns: [{ id: 's2' }] } },
            { participant: { checkIns: [] } },
            { participant: { checkIns: [] } },
          ];
        }),
      },
    } as any;
    expect(await session2RateOfThoseDue(prisma, null)).toEqual({ pct: 33, of: 3, n: 1 });
  });
});

describe('the two services', () => {
  const prompts = read('./prompts.service.ts');
  const admin = read('../admin/admin.service.ts');

  it('count nothing without a predicate', () => {
    for (const bare of ['organization.count()', 'ground.count()', "checkIn.count({ where: { status: 'COMPLETED' } })", "checkIn.count({ where: { status: 'COMPLETED', sessionNumber"]) {
      expect(prompts).not.toContain(bare);
      expect(admin).not.toContain(bare);
    }
    expect(prompts).not.toMatch(/session1Count/);
  });

  it('the second console is a private feed of the dashboard, not three routes of its own', () => {
    const controller = read('../admin/admin.controller.ts');
    for (const gone of ["@Get('stats')", "@Get('usage')", "@Get('feedback')"]) expect(controller).not.toContain(gone);
    expect(admin).toMatch(/private async getPlatformStats/);
    expect(admin).toMatch(/private async getUsagePatterns/);
    expect(admin).toMatch(/private async getFeedback/);
  });

  it('the panel says sessions, check-ins and reports, one word each', () => {
    const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'admin', 'AdminPage.tsx'), 'utf8'));
    expect(page).toContain('label="Sessions completed"');
    expect(page).toContain('label="Check-ins created"');
    expect(page).toContain('label="Reports released"');
    expect(page).not.toContain('label="Check-ins completed"');
    expect(page).not.toContain('label="Reports generated"');
    expect(page).not.toContain('label="Check-ins done"');
  });
});
