/**
 * THE NUMBER-BASED RULES ARE A SECOND SOURCE OF EVIDENCE (decision 57, item 4).
 *
 * `buildDetectionInputForParticipant` is what every rule (`PATTERN_DETECTORS`) is now run against,
 * alongside the model's own reading, wherever a rule exists for the code the model found. It has to
 * be built from PERIODS, not sessions (decision 57, item 1): a daily ground's several sessions
 * inside one calendar week are one period, and their scores are averaged into it, not counted as
 * separate weeks of evidence.
 */
import { PatternsService } from './patterns.service';

function prismaWith(opts: {
  roleAsDescribed?: string | null;
  cadence?: string | null;
  checkIns: { sessionNumber: number; when: string; text: string }[];
  surfacedCodes?: string[];
}) {
  const groundParticipant = {
    findUnique: jest.fn(async () => ({
      roleAsDescribed: opts.roleAsDescribed ?? null,
      ground: { cadence: opts.cadence ?? 'WEEKLY' },
    })),
  };
  const checkIn = {
    findMany: jest.fn(async () =>
      opts.checkIns.map((c) => ({
        sessionNumber: c.sessionNumber,
        completedAt: new Date(c.when),
        startedAt: null,
        createdAt: new Date(c.when),
        recordEntries: [{ text: c.text }],
      })),
    ),
  };
  const patternDetection = {
    findMany: jest.fn(async () => (opts.surfacedCodes ?? []).map((code) => ({ code }))),
  };
  return { groundParticipant, checkIn, patternDetection };
}

function build(opts: Parameters<typeof prismaWith>[0]) {
  const prisma = prismaWith(opts);
  const svc: any = new PatternsService(prisma as any, {} as any);
  return svc.buildDetectionInputForParticipant('p-1') as Promise<any>;
}

describe('the DetectionInput a rule is run against is built from this person\'s own per-period record', () => {
  it('gives one entry per session on a weekly ground, in order', async () => {
    const input = await build({
      cadence: 'WEEKLY',
      checkIns: [
        { sessionNumber: 1, when: '2026-01-05', text: 'Shipped the report.' },
        { sessionNumber: 2, when: '2026-01-12', text: 'Shipped another one.' },
      ],
    });
    expect(input.submissions).toEqual(['Shipped the report.', 'Shipped another one.']);
    expect(input.thinkingScore).toHaveLength(2);
    expect(input.outputScore).toHaveLength(2);
    expect(input.meetingScore).toHaveLength(2);
    expect(input.specificityScores).toHaveLength(2);
  });

  it('folds several sessions in the same calendar week on a daily ground into one period, averaged', async () => {
    const input = await build({
      cadence: 'DAILY',
      checkIns: [
        // Monday and Wednesday of the same ISO week
        { sessionNumber: 1, when: '2026-03-02', text: 'Shipped the fix.' },
        { sessionNumber: 2, when: '2026-03-04', text: 'documented the change.' },
        // The following week, its own period
        { sessionNumber: 3, when: '2026-03-10', text: 'Shipped again.' },
      ],
    });
    // Two periods, not three sessions.
    expect(input.submissions).toHaveLength(2);
    expect(input.submissions[0]).toContain('Shipped the fix.');
    expect(input.submissions[0]).toContain('documented the change.');
  });

  it('carries the stated role through, for the codes that read it (e.g. K1)', async () => {
    const input = await build({ roleAsDescribed: 'Sales lead', checkIns: [] });
    expect(input.role).toBe('Sales lead');
  });

  it('carries codes already surfaced for F1\'s fourth condition', async () => {
    const input = await build({ checkIns: [], surfacedCodes: ['F1', 'B2'] });
    expect(input.priorSurfacedCodes).toEqual(['F1', 'B2']);
  });

  it('is empty and safe when the person has no completed check-ins yet', async () => {
    const input = await build({ checkIns: [] });
    expect(input.submissions).toEqual([]);
    expect(input.role).toBeUndefined();
    expect(input.priorSurfacedCodes).toEqual([]);
  });
});
