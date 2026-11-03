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

/* Both sessions' pictures released, as on the run this fixture comes from. What moved in a session is
   that session's picture, and a participant reads it only once it is released (decision 76, item 4). */
const BOTH_RELEASED = { releasedAt: new Date('2026-09-15T18:00:00Z'), releasedSessions: [1, 2] };

function reportFor(requestingUserId: string, viewerRole = 'MEMBER', report: any = BOTH_RELEASED) {
  const { prisma, writes } = prismaFor(viewerRole);
  const theGround = prisma.ground.findUnique;
  prisma.ground.findUnique = jest.fn(async (args: any) => {
    const g = await theGround(args);
    return g ? { ...g, report } : g;
  });
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
      says: "The team's freezers sold went from 18 to 21, against the aim of 25. Miriam's quotes sent went from 4 to 6, against the aim of 10.",
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
    expect(r.sinceLast).toEqual({ says: "The team's freezers sold went from 18 to 21. You are now waiting on Wairimu for a decision on whether a price range counts as a budget." });
    expect(r).not.toHaveProperty('forTheLead');
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/Miriam|Quotes sent|quotes sent|price list|Kito Foods|aim of/);

    const m = await reportFor('u-miriam').report;
    expect(m.sinceLast).toEqual({
      says: "The team's freezers sold went from 18 to 21. Your quotes sent went from 4 to 6.",
      also: 'You are no longer waiting on Finance for the price list. You are now waiting on Wairimu for a decision on whether a price range counts as a budget.',
    });
    expect(m).not.toHaveProperty('forTheLead');
  });

  it('a participant is told nothing of what moved in a session whose picture is not released yet (decision 76, item 4)', async () => {
    const r = await reportFor('u-brian', 'MEMBER', { releasedAt: new Date('2026-09-15T18:00:00Z'), releasedSessions: [1] }).report;
    expect(r).not.toHaveProperty('sinceLast');
    expect(JSON.stringify(r)).not.toMatch(/went from 18 to 21|waiting on Wairimu/);
    /* The lead still reads it, released or not. */
    const lead = await reportFor('u-wairimu', 'MEMBER', { releasedAt: new Date('2026-09-15T18:00:00Z'), releasedSessions: [1] }).report;
    expect(lead.sinceLast.says).toMatch(/went from 18 to 21/);
  });

  it('an admin who only reads reads what moved, with the team’s count and no one person’s, no number aimed for, and nothing for the lead', async () => {
    const r = await reportFor('u-grace', 'ADMIN').report;
    expect(r.sinceLast).toEqual({
      says: "The team's freezers sold went from 18 to 21. Miriam is no longer waiting on Finance for the price list.",
      also: 'Brian and Miriam are now waiting on Wairimu for a decision on whether a price range counts as a budget.',
    });
    expect(r).not.toHaveProperty('forTheLead');
    expect(JSON.stringify(r)).not.toMatch(/Quotes sent|quotes sent|Kito Foods|still to decide|aim of/);
    expect(JSON.stringify(r.sinceLast)).not.toMatch(NO_LABELS);
  });
});

/**
 * AND WHERE PEOPLE SAID DIFFERENT THINGS (29 Sep 2026). Each open difference on the stored report is
 * one item for the lead, built from the stored `divergences` with names put in at the read. A
 * participant and an admin who only reads get no `forTheLead` at all.
 */
describe('week 16: the report’s open differences reach the lead’s list, and nobody else’s', () => {
  const DIVERGENCES = [{
    topic: 'Participant A counts a price range as a budget, and Participant B counts only a written figure.',
    positions: [
      { participantLabel: 'Participant A', view: 'A range is enough to count the deal.' },
      { participantLabel: 'Participant B', view: 'Only a written figure counts.' },
    ],
    settledBy: 'Agree what counts as a budget and tell both of them.',
    atStake: 'Four deals are counted differently until this is agreed.',
  }];
  function withDifferences(requestingUserId: string, viewerRole = 'MEMBER') {
    const { prisma, writes } = prismaFor(viewerRole);
    prisma.report = { findUnique: jest.fn(async () => ({ divergences: structuredClone(DIVERGENCES) })) };
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = prisma;
    svc.logger = new Logger('test');
    svc.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
    return { report: (svc as ReportsService).get('g-sales', requestingUserId, 'org-1') as Promise<any>, writes };
  }

  /* Hafsah, 30 October 2026, first-experience round 1: Today read "Settle the difference between what you and Kwame Nkosi said." beside
     the board's own sentence for the same difference. With nothing on record to settle it, Today now says the board's one sentence. */
  it('with nothing on record to settle it, the lead reads the board\'s own sentence, never "Settle the difference"', async () => {
    const saved = structuredClone(DIVERGENCES);
    DIVERGENCES[0] = { ...DIVERGENCES[0], topic: 'whether a price range counts as a budget', settledBy: undefined as any, atStake: undefined as any };
    try {
      const { report } = withDifferences('u-wairimu');
      const item = ((await report).forTheLead as any[]).find((x) => x.id === 'difference-1');
      expect(item).toEqual({
        id: 'difference-1',
        /* Changed 3 November (F5 part 3): named people "see it differently", the board's own sentence. */
        decide: 'Brian Otieno and Miriam Wanjiku see differently whether a price range counts as a budget.',
        why: 'What people said about this does not match, so nobody can assume it is agreed.',
      });
    } finally { DIVERGENCES.splice(0, 1, saved[0]); }
  });

  it('the lead reads one item per open difference, in plain sentences with names', async () => {
    const { report, writes } = withDifferences('u-wairimu');
    const r = await report;
    const item = (r.forTheLead as any[]).find((x) => x.id === 'difference-1');
    expect(item).toEqual({
      id: 'difference-1',
      decide: 'Agree what counts as a budget and tell both of them.',
      why: 'Brian Otieno counts a price range as a budget, and Miriam Wanjiku counts only a written figure. Brian Otieno and Miriam Wanjiku said different things about this, so nobody can assume it is agreed.',
      changes: 'Four deals are counted differently until this is agreed.',
    });
    const text = JSON.stringify(r.forTheLead);
    expect(text).not.toMatch(/Sales [AB]|Participant [A-Z]|\baccounts?\b/);
    expect(text).not.toMatch(NO_LABELS);
    expect(writes).toEqual([]);
  });

  it('B-098: while only one person who checks in has answered, there is no difference to settle, as the board says', async () => {
    const { prisma } = prismaFor('MEMBER');
    prisma.report = { findUnique: jest.fn(async () => ({ divergences: structuredClone(DIVERGENCES) })) };
    const all = prisma.checkIn.findMany;
    prisma.checkIn.findMany = jest.fn(async (args: any) => (args?.where?.status === 'COMPLETED' ? [{ participantId: 'p-brian' }] : all(args)));
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = prisma;
    svc.logger = new Logger('test');
    svc.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
    const r: any = await (svc as ReportsService).get('g-sales', 'u-wairimu', 'org-1');
    expect((r.forTheLead ?? []).filter((x: any) => /^difference-/.test(x.id))).toEqual([]);
    expect(JSON.stringify(r.forTheLead ?? [])).not.toMatch(/Settle the difference|said different things/);
  });

  it('a participant never reads it', async () => {
    const r = await withDifferences('u-brian').report;
    expect(r).not.toHaveProperty('forTheLead');
    expect(JSON.stringify(r)).not.toMatch(/Agree what counts as a budget|Four deals are counted/);
  });

  it('an admin who only reads never reads it', async () => {
    const r = await withDifferences('u-grace', 'ADMIN').report;
    expect(r).not.toHaveProperty('forTheLead');
    expect(JSON.stringify(r)).not.toMatch(/Agree what counts as a budget|Four deals are counted/);
  });
});

/**
 * DECISION 57, ITEM 3: THE LEAD IS NUDGED ONCE TO TALK A PATTERN THROUGH, AND IT GOES AWAY ONCE
 * MARKED. Built from the same rows and the same reading rule as the pattern itself (servedPatterns),
 * so nothing here shows the lead a pattern they could not already read on the board or the ground
 * page.
 */
describe('week 16 / decision 57 item 3: the pattern nudge in Today', () => {
  const PATTERN_ROW = {
    id: 'pd-brian-b3', participantId: 'p-brian', code: 'B3',
    observationText: 'Brian described the Kito Foods deal as his own although Miriam prepared the pricing.',
    periodsObserved: 3, seenInSessions: [1, 2, 3],
    readyAt: new Date('2026-09-16T00:00:00Z'), shownToPersonAt: new Date('2026-09-16T00:00:00Z'),
    personAnswer: 'I ran the call, Miriam built the numbers.', personAnsweredAt: new Date('2026-09-16T01:00:00Z'),
    talkedAboutAt: null as Date | null,
  };
  function withPattern(row: any, requestingUserId = 'u-wairimu') {
    const { prisma, writes } = prismaFor('MEMBER');
    prisma.patternDetection = { findMany: jest.fn(async () => structuredClone([row])) };
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = prisma;
    svc.logger = new Logger('test');
    svc.getAsBuilt = jest.fn(async () => ({ groundId: 'g-sales', report: { findings: [] } }));
    return { report: (svc as ReportsService).get('g-sales', requestingUserId, 'org-1') as Promise<any>, writes };
  }

  it('never nudges the lead about Brian’s stored pattern, though he answered it', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const r = await withPattern(PATTERN_ROW).report;
    const items = (r.forTheLead as any[]) ?? [];
    expect(items.filter((x) => String(x.id).startsWith('pattern-talk-'))).toEqual([]);
    expect(JSON.stringify(items)).not.toContain('Talk with Brian about');
    expect(JSON.stringify(items)).not.toContain('I ran the call, Miriam built the numbers.');
  });

  it('goes away once the lead has marked they talked about it', async () => {
    const r = await withPattern({ ...PATTERN_ROW, talkedAboutAt: new Date('2026-09-23T00:00:00Z') }).report;
    const ids = ((r.forTheLead as any[]) ?? []).map((x) => x.id);
    expect(ids).not.toContain('pattern-talk-pd-brian-b3');
  });

  it('never reaches a participant, and never names the pattern’s code or internal name', async () => {
    const r = await withPattern(PATTERN_ROW, 'u-brian').report;
    expect(r).not.toHaveProperty('forTheLead');
  });

  it('is not nudged before three periods (decision 8): nothing to talk through yet', async () => {
    const early = { ...PATTERN_ROW, seenInSessions: [1, 2], periodsObserved: 2, readyAt: null, shownToPersonAt: null };
    const r = await withPattern(early).report;
    const ids = ((r.forTheLead as any[]) ?? []).map((x) => x.id);
    expect(ids).not.toContain('pattern-talk-pd-brian-b3');
  });

  /* Decision 86 reverses decision 74, item 2. This block was "with the person-only reach, the
     lead's Today has no nudge". There is no such reach now, and nothing is put in force in this file,
     so the nudge above is what the lead reads by default. This pins that Brian's own words are in it. */
  describe('with no setting at all (decision 86, then Hafsah, 2 November 2026)', () => {
    it('the lead’s Today has no nudge, no plain heading and none of Brian’s own words', async () => {
      /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
      const r = await withPattern(PATTERN_ROW).report;
      const ids = ((r.forTheLead as any[]) ?? []).map((x) => x.id);
      expect(ids).not.toContain('pattern-talk-pd-brian-b3');
      const all = JSON.stringify(r);
      expect(all).not.toContain('Others describe doing work they described as theirs');
      expect(all).not.toContain('I ran the call, Miriam built the numbers.');
      expect(all).not.toContain('Brian described the Kito Foods deal as his own');
    });
  });
});
