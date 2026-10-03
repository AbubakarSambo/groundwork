import { ReportsService } from '../reports/reports.service';
import { BoardService } from './board.service';
import { prismaFor, THE_CLOCK } from './__fixtures__/a-page-that-contradicts-itself';
import { theDisagreementTheReportOpensWith } from './the-quick-read-agrees-with-the-report';

/**
 * A BOARD THAT DOES NOT CONTRADICT ITSELF, AS EACH PERSON READS IT (review of 1 October 2026,
 * section 3). Every line below was read on a real run's board, beside the line that says the
 * opposite: api/journey/all-24/re-a/sales.json (session 3) and run-21/contractreview.json.
 */
async function boardFor(which: 'sales' | 'contract', userId: string, role = 'MEMBER') {
  const { prisma } = prismaFor(which, role);
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
  return (await svc.get(which === 'sales' ? 'g-credit' : 'g-contract', userId, undefined, { now: THE_CLOCK })) as any;
}

const readers = {
  sales: [['the lead, Bisi', 'u-bisi', 'MEMBER'], ['Femi, a participant', 'u-femi', 'MEMBER'], ['Kwame, a participant', 'u-kwame', 'MEMBER'], ['an admin not in the check-in', 'u-admin', 'ADMIN']],
  contract: [['the lead, Adaeze', 'u-adaeze', 'MEMBER'], ['Frank, a participant', 'u-frank', 'MEMBER'], ['an admin not in the check-in', 'u-admin', 'ADMIN']],
} as const;

describe('the sales board: one count per thing, and nobody with something open is "nothing here needs you"', () => {
  it('the lead reads Femi and Ngozi as still having something in the way, and Kwame, whose count is the difference, not as needing nothing', async () => {
    const b = await boardFor('sales', 'u-bisi');
    const says = Object.fromEntries((b.eachPerson as any[]).map((r) => [r.who, r.says]));
    /* Read on the run: "Femi Okonkwo has checked in, and nothing here needs you this week." */
    /* Changed 2 Oct 2026 (request 115 d): the wait is said in full, on whom and for what, from the record. */
    expect(says['Femi Okonkwo']).toBe('Femi Okonkwo has checked in, and has been waiting on the customers for the customer\'s bank statements and other things we need since 29 September.');
    expect(says['Ngozi Eze']).toBe('Ngozi Eze has checked in, and has been waiting on the credit committee for review and approval for their eleven files since 29 September.');
    expect(says['Kwame Mensah']).toBe('Kwame Mensah has checked in.');
    for (const line of Object.values(says)) expect(line).not.toMatch(/nothing here needs you/);
  });

  for (const [who, userId, role] of readers.sales) {
    it(`${who} reads the team's 40 approved facilities once, with one count`, async () => {
      const b = await boardFor('sales', userId, role);
      const forty = (b.objectives as any[]).filter((o) => o.target === 40);
      /* Read on the run: "0 at the start, 0 now, said 40." beside "0 at the start, 11 now, said 40." */
      expect(forty).toHaveLength(1);
      /* The same count, as one full sentence since 1 October (the review rules out "0 at the start, 11 now, said 40.").
         An admin standing outside the check-in used to read no number on it at all; since decision 86 an admin
         sees the figures, so every reader here reads the same sentence. */
      expect(forty[0].journey.say).toBe('It was 0 at the start and is 11 now, and the aim is 40.');
      expect(JSON.stringify(b.objectives)).not.toContain('It was 0 at the start and is 0 now, and the aim is 40.');
    });

    it(`${who} is not told nothing was found beside the difference that was`, async () => {
      const b = await boardFor('sales', userId, role);
      expect(b.divergence.items.length).toBeGreaterThan(0);
      expect(b.divergence.whyNothingYet).toBeUndefined();
      expect(JSON.stringify(b)).not.toContain('nothing in the written report reads as a difference');
    });
  }

  it('two people with 14 each are still two targets, on the lead\'s board', async () => {
    const b = await boardFor('sales', 'u-bisi');
    const fourteens = (b.objectives as any[]).filter((o) => o.target === 14);
    expect(fourteens.map((o) => o.ownerParticipantId).sort()).toEqual(['p-kwame', 'p-ngozi']);
  });
});

describe('the contract review board: the quick read says what the report opens with', () => {
  for (const [who, userId, role] of readers.contract) {
    it(`${who} reads the difference on the tile, not "no disagreement"`, async () => {
      const b = await boardFor('contract', userId, role);
      /* Read on the run: "None" / "no disagreement, as the written report reads it", under a report
         that opens "They disagree on what the service agreement means." */
      expect(b.quickRead[0]).toEqual(expect.objectContaining({
        label: 'Differences',
        value: '1',
        sub: 'People said different things about what the service agreement means.',
      }));
      expect(JSON.stringify(b.quickRead)).not.toMatch(/no disagreement/i);
    });
  }

  it('and the lead does not read that Frank needs nothing, when the report opens with his difference', async () => {
    const b = await boardFor('contract', 'u-adaeze');
    const frank = (b.eachPerson as any[]).find((r) => r.who === 'Frank Mbeki');
    expect(frank.says).toBe('Frank Mbeki has checked in.');
  });
});

describe('the disagreement a report opens with', () => {
  it('is read from the report\'s own words, and counted where the report counts it', () => {
    expect(theDisagreementTheReportOpensWith('Both people have answered. They disagree on what the service agreement means. You say it is for resolving critical issues.'))
      .toEqual({ topic: 'what the service agreement means', count: 1 });
    expect(theDisagreementTheReportOpensWith('All four people have answered. They disagree on three things: the main obstacle to getting facilities approved, whether individual targets include an amount disbursed, and the final date for the quarter.'))
      .toEqual({ topic: 'the main obstacle to getting facilities approved', count: 3 });
  });

  it('and is nothing where the report says nobody disagrees', () => {
    expect(theDisagreementTheReportOpensWith('Both people have answered. Nobody disagrees on the date.')).toBeNull();
    expect(theDisagreementTheReportOpensWith('Both people have answered. They agree on the target.')).toBeNull();
  });
});
