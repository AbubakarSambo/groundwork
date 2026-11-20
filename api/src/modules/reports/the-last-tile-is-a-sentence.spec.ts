import { atAGlanceTiles } from './what-this-session-holds';
import { ReportsService } from './reports.service';

/**
 * REQUEST 67: "HOW MUCH WAS SAID" SAYS ITS FIGURE IN A WHOLE SENTENCE.
 *
 * The tile read "How much was said, 15% documented, of what was said is anchored to a document": a
 * label, a figure and a fragment that only reads once joined by eye. The sub is now a sentence of
 * its own. The value stays the short figure the screens compose from. The board serves these same
 * tiles, from this same function, as its quick read.
 */
const base = { agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, numberWasSaid: false };
const lastTile = (backedPct: number | null) => atAGlanceTiles({ ...base, backedPct }).find((t) => t.label === 'How much was said')!;

describe('the last tile is a sentence', () => {
  it('a share of what was said', () => {
    expect(lastTile(15)).toMatchObject({ value: '15% documented', sub: '15 of every 100 things people said have a document behind them.' });
  });

  it('one in a hundred', () => {
    expect(lastTile(1).sub).toBe('1 of every 100 things people said has a document behind it.');
  });

  it('nothing with a document behind it', () => {
    expect(lastTile(0)).toMatchObject({ value: 'All from memory', sub: 'Nothing said this check-in has a document behind it.' });
  });

  it('nothing said yet', () => {
    expect(lastTile(null)).toMatchObject({ value: 'Nothing on record yet', sub: 'There are no answers to read yet.' });
  });

  it('served on the session report the same way', async () => {
    const ground = {
      id: 'g-1', organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', brief: null, objectives: [],
      participants: [
        { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
        { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
      ],
      report: { releasedAt: new Date('2026-09-23'), agreements: [], divergences: [], centralQuestion: null, findings: [], direction: null },
    };
    const svc = Object.create(ReportsService.prototype) as any;
    const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 1, aggregate: async () => ({ _max: {} }) };
    svc.prisma = new Proxy({ ground: { ...reads, findUnique: async () => ground } } as any, { get: (t: any, k: string) => t[k] ?? reads });
    svc.isAnAdminOf = async () => false;
    for (const reader of ['u-lead', 'u-miriam']) {
      const served: any = await svc.sessionReport('g-1', 2, reader, 'org-1');
      const tile = served.atAGlance.find((t: any) => t.label === 'How much was said');
      expect(tile.sub).toBe('There are no answers to read yet.');
    }
  });
});
