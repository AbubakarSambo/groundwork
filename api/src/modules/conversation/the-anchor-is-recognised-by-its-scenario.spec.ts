import { aGroundIsTheAnchors } from './the-anchor-weekly-check-in';
import { theAnchorNudgeFor } from './the-anchor-nudge';
import { sendTheLeadsWeeklyLetters } from '../email/the-leads-weekly-letter';
import { sendTheAnchorWeeklyInsights } from '../whatsapp/the-anchor-weekly-insight';
import { isATestCheckIn } from '../engagement/a-test-check-in-moves-on';

/**
 * DECISION 114: THE ANCHOR IS A SCENARIO LIKE THE OTHERS, so a check-in made through the ordinary set-up with the anchor's scenario is the
 * anchor's even though it did not come in by the anchor link (`startedFrom` empty). The lead's weekly letter, the Friday insight, the nudge
 * and the test-check-in clock recognise it by either. A check-in that is neither stays what it was.
 */
const BY_LINK = { id: 'g-link', label: 'From the link', startedFrom: 'anchor', scenario: 'NEW_PROJECT', initiatorId: 'u-wairimu', organizationId: 'o1', overWhatsApp: true, status: 'ACTIVE' };
const BY_SCENARIO = { id: 'g-scenario', label: 'Help my team understand', startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND', initiatorId: 'u-wairimu', organizationId: 'o1', overWhatsApp: true, status: 'ACTIVE' };
const NEITHER = { id: 'g-plain', label: 'Sales, Q4', startedFrom: null, scenario: 'OKR_ALIGNMENT', initiatorId: 'u-wairimu', organizationId: 'o1', overWhatsApp: true, status: 'ACTIVE' };
const ALL = [BY_LINK, BY_SCENARIO, NEITHER];

/** A ground table that answers the one question these callers ask: startedFrom is the anchor, or the scenario is. */
const groundTable = () => ({
  findMany: jest.fn(async ({ where }: any) => ALL.filter((g) => !where.OR || where.OR.some((c: any) => Object.entries(c).every(([k, v]) => (g as any)[k] === v))).filter((g) => !where.startedFrom || g.startedFrom === where.startedFrom)),
  findUnique: jest.fn(async () => null),
});

describe('which check-ins are the anchor\'s', () => {
  it('those started from its link, and those with its scenario, and no other', () => {
    expect(ALL.map(aGroundIsTheAnchors)).toEqual([true, true, false]);
    expect(aGroundIsTheAnchors(null)).toBe(false);
  });
});

describe('the lead\'s weekly letter', () => {
  it('is written for the check-in made by scenario as well as the one made by link, and not for another', async () => {
    const sent: any[] = [];
    const seen: string[] = [];
    const prisma: any = {
      ground: groundTable(),
      user: { findUnique: jest.fn(async () => ({ email: 'wairimu@baridi.test', deletedAt: null })) },
      groundParticipant: { findMany: jest.fn(async (a: any) => { seen.push(a?.where?.groundId); return []; }) },
      checkIn: { findMany: jest.fn(async () => []) }, groundCommitment: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) }, groundDependency: { count: jest.fn(async () => 0) },
    };
    await sendTheLeadsWeeklyLetters({ prisma, email: { sendTheLeadsWeeklyLetter: jest.fn(async (...a: any[]) => { sent.push(a); }) }, frontendUrl: 'https://app.test' }, new Date('2026-10-09T14:00:00Z'));
    const asked = (prisma.ground.findMany as jest.Mock).mock.calls[0][0].where;
    const picked = ALL.filter((g) => asked.OR.some((c: any) => Object.entries(c).every(([k, v]) => (g as any)[k] === v))).map((g) => g.id);
    expect(picked).toEqual(['g-link', 'g-scenario']);
  });
});

describe('the Friday insight on WhatsApp', () => {
  it('goes through the check-in made by scenario too, and asks for neither of the others', async () => {
    const asked: any[] = [];
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => ({ value: { on: true } })) },
      ground: { findMany: jest.fn(async (a: any) => { asked.push(a); return a.where.OR ? [BY_LINK, BY_SCENARIO] : []; }) },
      whatsAppConnection: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
      organization: { findMany: jest.fn(async () => []) },
    };
    await sendTheAnchorWeeklyInsights({ prisma, whatsapp: { sendFor: jest.fn() } as any, frontendUrl: 'https://app.test' }, new Date('2026-10-09T04:00:00Z')).catch(() => ({ tried: 0 }));
    expect(asked).toHaveLength(1);
    expect(asked[0].where.OR).toEqual([{ startedFrom: 'anchor' }, { scenario: 'HELP_TEAM_UNDERSTAND' }]);
    expect(asked[0].select.scenario).toBe(true);
  });
});

describe('the nudge', () => {
  const prisma = (on: boolean) => ({
    platformSetting: { findUnique: jest.fn(async () => ({ value: { on } })) },
    groundCommitment: { findMany: jest.fn(async () => [{ clause: 'I will send the deck to the client.', text: 'I will send the deck to the client.', participantId: 'p1', status: 'OPEN', createdAt: new Date() }]) },
  }) as any;
  it('is the person\'s own promise on a check-in made by scenario, as on one made by link', async () => {
    const a = await theAnchorNudgeFor(prisma(true), BY_LINK, 'p1');
    const b = await theAnchorNudgeFor(prisma(true), BY_SCENARIO, 'p1');
    expect(b).toBe(a);
  });
  it('is nothing on any other check-in, and nothing with the switch off', async () => {
    expect(await theAnchorNudgeFor(prisma(true), NEITHER, 'p1')).toBeNull();
    expect(await theAnchorNudgeFor(prisma(false), BY_SCENARIO, 'p1')).toBeNull();
  });
});

describe('a test check-in', () => {
  it('is waited for the anchor\'s shorter time on a check-in made by scenario, as on one made by link, and for the usual week on another', () => {
    const lead = 'u-wairimu';
    const took = [{ participantId: 'p', userId: lead }];
    const now = new Date('2026-10-15T10:00:00Z');
    const created = new Date('2026-10-10T10:00:00Z');
    expect(isATestCheckIn({ startedFrom: 'anchor', createdAt: created }, took, lead, now, true)).toBe(true);
    expect(isATestCheckIn({ startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND', createdAt: created }, took, lead, now, true)).toBe(true);
    expect(isATestCheckIn({ startedFrom: null, scenario: 'OKR_ALIGNMENT', createdAt: created }, took, lead, now, true)).toBe(false);
  });

  it('with the switch off, a check-in that is the anchor\'s only by its scenario keeps the usual week; one from the link keeps the anchor\'s', () => {
    const lead = 'u-wairimu';
    const took = [{ participantId: 'p', userId: lead }];
    const now = new Date('2026-10-15T10:00:00Z');
    const created = new Date('2026-10-10T10:00:00Z');
    expect(isATestCheckIn({ startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND', createdAt: created }, took, lead, now, false)).toBe(false);
    expect(isATestCheckIn({ startedFrom: 'anchor', createdAt: created }, took, lead, now, false)).toBe(true);
  });
});
