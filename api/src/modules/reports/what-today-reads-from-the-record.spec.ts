import { Logger } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { prismaFor } from './__fixtures__/today-sales-team';

/**
 * WEEK 16, SCREENS REQUEST 3a AND 3b: WHAT TODAY READS FROM THE LATEST REPORT, AS THE LEAD, A
 * PARTICIPANT AND AN ADMIN WHO ONLY READS EACH READ IT (GET /grounds/:id/report).
 *
 * Built from the stored rows at the read: no model asked, nothing written. `sinceLast` to every
 * reader, each about what they may see; `forTheLead` to the person who runs the check-in only.
 * Never a rating, never a label on a person, never an email address.
 */

function reportFor(requestingUserId: string, viewerRole = 'MEMBER') {
  const { prisma, writes } = prismaFor(viewerRole);
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = new Logger('test');
  svc.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
  return { report: (svc as ReportsService).get('g-sales', requestingUserId, 'org-1') as Promise<any>, writes };
}

const NO_LABELS = /@|baridi\.test|at risk|PIP|exit|score|rating|rated/i;

describe('week 16: what Today reads from the latest report', () => {
  it('the lead reads what moved since the last round, and what only they can settle', async () => {
    const { report, writes } = reportFor('u-wairimu');
    const r = await report;
    expect(r.sinceLast).toEqual({
      says: 'The count for Freezers sold went from 18 to 21, of the 25 aimed for. Miriam’s count for Quotes sent went from 4 to 6, of the 10 aimed for.',
      also: 'Miriam is no longer waiting on Finance for the price list. Brian and Miriam are now waiting on you for a decision on whether a price range counts as a budget.',
    });
    expect(r.forTheLead).toEqual([
      {
        id: 'handoff-d1',
        decide: 'Decide whether a price range counts as a budget.',
        why: 'Brian and Miriam are both waiting on you for it.',
        changes: 'Once it is settled, it changes how 4 deals are counted.',
      },
      { id: 'note-n1', decide: 'Decide whether Kito Foods stays on the list.', why: 'You wrote this down as still to decide.' },
    ]);
    expect(JSON.stringify([r.sinceLast, r.forTheLead])).not.toMatch(NO_LABELS);
    /* Opening the report rebuilds nothing. */
    expect(writes).toEqual([]);
  });

  it('a participant reads the shared count and their own work, never a colleague’s, and nothing for the lead', async () => {
    const r = await reportFor('u-brian').report;
    expect(r.sinceLast).toEqual({ says: 'The count for Freezers sold went from 18 to 21. You are now waiting on Wairimu for a decision on whether a price range counts as a budget.' });
    expect(r).not.toHaveProperty('forTheLead');
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/Miriam|Quotes sent|price list|Kito Foods|aimed for/);

    const m = await reportFor('u-miriam').report;
    expect(m.sinceLast).toEqual({
      says: 'The count for Freezers sold went from 18 to 21. Your count for Quotes sent went from 4 to 6.',
      also: 'You are no longer waiting on Finance for the price list. You are now waiting on Wairimu for a decision on whether a price range counts as a budget.',
    });
    expect(m).not.toHaveProperty('forTheLead');
  });

  it('an admin who only reads reads what moved, with the team’s count and no one person’s, no number aimed for, and nothing for the lead', async () => {
    const r = await reportFor('u-grace', 'ADMIN').report;
    expect(r.sinceLast).toEqual({
      says: 'The count for Freezers sold went from 18 to 21. Miriam is no longer waiting on Finance for the price list.',
      also: 'Brian and Miriam are now waiting on Wairimu for a decision on whether a price range counts as a budget.',
    });
    expect(r).not.toHaveProperty('forTheLead');
    expect(JSON.stringify(r)).not.toMatch(/Quotes sent|Kito Foods|still to decide|aimed for/);
    expect(JSON.stringify(r.sinceLast)).not.toMatch(NO_LABELS);
  });
});
