import { GroundMoment, GroundScenario, PartyType } from '@prisma/client';
import { positionInRun, whereInTheRun } from './where-in-the-run';
import { buildIntakeBlock } from './prompt-library';
import { whenThisIsOver } from './when-this-is-over';
import { ConversationService } from './conversation.service';
import { GroundsCron } from '../grounds/grounds.cron';
import { GroundsService } from '../grounds/grounds.service';
import { deadlineOf, daysRemaining } from '../grounds/when-the-clock-starts';
import { contextGaps, openingLine } from '../grounds/the-context-chat';
import { proposalFrom, confirmedSay } from '../grounds/what-the-context-chat-heard';
import { saidUntilIEndIt } from '../grounds/nothing-proposed-that-nobody-said';
import { whatSituationThisIsAbout } from '../reports/what-situation-this-report-is-about';

/**
 * REQUEST 37: A CHECK-IN THAT RUNS UNTIL THE LEAD ENDS IT ("When I end it").
 *
 * Stored as `runsUntilEnded = true` with `timelineDays = 0`. Every test below reads what a person or
 * the model would read, not the stored shape.
 */
describe('a check-in that runs until the lead ends it', () => {
  describe('the conversation', () => {
    it('treats every session after the first as a middle one, however many there have been', () => {
      expect(positionInRun(1, undefined, true)).toBe('first');
      for (const n of [2, 3, 12, 40]) expect(positionInRun(n, undefined, true)).toBe('middle');
    });

    it('used to call every session after the first the last one when no total was known', () => {
      // The defect request 37 names: a missing total counted as one.
      expect(positionInRun(3, undefined)).toBe('last');
    });

    const build = (over: Record<string, unknown> = {}) =>
      buildIntakeBlock({
        scenario: GroundScenario.NEW_HIRE,
        partyType: PartyType.INITIATOR,
        sessionNumber: 3,
        runsUntilEnded: true,
        otherPartyCheckedIn: false,
        groundLabel: 'A new hire starting',
        moment: GroundMoment.STARTING,
        ...over,
      } as any);

    it('tells the model the session number and that it runs until the lead ends it, with no "of N"', () => {
      const prompt = build();
      expect(prompt).toContain('SESSION: 3. It runs until the lead ends it.');
      expect(prompt).not.toMatch(/SESSION: 3 of/);
      expect(prompt).toContain('WHERE_IN_THE_RUN: middle');
    });

    it('never tells the model it is the last, that none follow, or how long the run is', () => {
      for (const n of [1, 2, 4, 9]) {
        const prompt = build({ sessionNumber: n });
        expect(prompt).not.toContain('WHERE_IN_THE_RUN: last');
        expect(prompt).not.toMatch(/further check-in/);
        expect(prompt).not.toMatch(/LAST planned/);
        expect(prompt).not.toContain('RUN_LENGTH');
        expect(prompt).not.toMatch(/of 4\b/);
      }
    });

    it('tells the model never to say how far through it is', () => {
      const text = whereInTheRun({ sessionNumber: 5, runsUntilEnded: true }).join('\n');
      expect(text).toMatch(/never say how far through it is/);
    });

    it('answers "when does this end" with a session count and no end date', () => {
      const text = whenThisIsOver({ sessionNumber: 3, roundsPlanned: null, endsOn: null, runsUntilEnded: true });
      expect(text).toContain('This is session 3. It runs until the lead ends it, so there is no set number of sessions and no end date.');
      expect(text).not.toMatch(/of \d+/);
      expect(text).not.toMatch(/last one|more sessions? follow/);
    });

    it('makes no session final when the next one is made', async () => {
      const made: any[] = [];
      const svc: any = {
        prisma: { ground: { findUnique: async () => ({ timelineDays: 0, cadence: 'WEEKLY', runsUntilEnded: true }) } },
        createSessionOnce: async (x: any) => { made.push(x); },
      };
      svc.prisma.checkIn = { findUnique: async () => null };
      for (const n of [1, 2, 3, 13]) {
        await (ConversationService.prototype as any).createNextIfAbsent.call(svc, 'g1', 'p1', n + 1, null);
      }
      expect(made).toHaveLength(4);
      expect(made.every((m) => m.isFinal === false)).toBe(true);
    });

    it('still makes the planned last session final on a check-in with a length', async () => {
      const made: any[] = [];
      const svc: any = {
        prisma: { ground: { findUnique: async () => ({ timelineDays: 28, cadence: 'WEEKLY', runsUntilEnded: false }) }, checkIn: { findUnique: async () => null } },
        createSessionOnce: async (x: any) => { made.push(x); },
      };
      await (ConversationService.prototype as any).createNextIfAbsent.call(svc, 'g1', 'p1', 4, null);
      expect(made[0].isFinal).toBe(true);
    });
  });

  describe('the out-of-time sweep and the warning before it', () => {
    const now = Date.now();
    const old = new Date(now - 400 * 86_400_000);

    it('gives it no deadline and no days left', () => {
      const g = { createdAt: old, startsAt: null, timelineDays: 0, runsUntilEnded: true };
      expect(deadlineOf(g)).toBeNull();
      expect(daysRemaining(g, new Date())).toBeNull();
      // Even if an end date were left behind by mistake, an ongoing check-in has none.
      expect(deadlineOf({ ...g, endsAt: new Date(now - 86_400_000) })).toBeNull();
    });

    function cron(rows: any[]) {
      const updates: any[] = [];
      const emails: any[] = [];
      const prisma: any = {
        withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
        ground: {
          findMany: jest.fn(async (args: any) => (args.where?.id ? [] : rows)),
          update: jest.fn(async (a: any) => { updates.push(a); }),
          updateMany: jest.fn(async (a: any) => { updates.push(a); }),
        },
      };
      const email: any = { sendTimeRunningOut: jest.fn(async (...a: any[]) => { emails.push(a); }) };
      const config: any = { get: () => 'https://x' };
      const service = new GroundsCron(prisma, email, config, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
      return { service, updates, emails };
    }

    it('is never warned about and never stalled, however long ago it began', async () => {
      const row = { id: 'g1', label: 'Open', createdAt: old, startsAt: null, timelineDays: 0, runsUntilEnded: true, status: 'ACTIVE', initiator: { email: 'a@b.c' } };
      const { service, updates, emails } = cron([row]);
      await service.warnBeforeTimeRunsOut();
      await service.stallOverdueGrounds();
      expect(emails).toHaveLength(0);
      expect(updates).toHaveLength(0);
    });

    it('still stalls a check-in with a length that has run out', async () => {
      const row = { id: 'g2', label: 'Finite', createdAt: old, startsAt: null, timelineDays: 30, runsUntilEnded: false, status: 'ACTIVE', initiator: { email: 'a@b.c' } };
      const { service, updates } = cron([row]);
      await service.stallOverdueGrounds();
      expect(updates.length).toBeGreaterThan(0);
    });
  });

  describe('the reports', () => {
    it('does not tell the synthesis it is a last round when no total is known', () => {
      const text = whatSituationThisIsAbout('NEW_HIRE', 7, null);
      expect(text).toContain('This is round 7, so there is a previous round');
      expect(text).not.toMatch(/last of these|of \d+/);
    });

    it('does tell it so after the lead ended it', () => {
      expect(whatSituationThisIsAbout('NEW_HIRE', 7, null, true)).toMatch(/last of these/);
    });
  });

  describe('the lead ends it', () => {
    it('flags the closing session on session 13 of an ongoing check-in, with no planned last to compare with', async () => {
      const ground = {
        id: 'g1', status: 'ACTIVE', initiatorId: 'u-init', organizationId: 'org1', timelineDays: 0, runsUntilEnded: true,
        participants: [{ id: 'p1', userId: 'u-init', partyType: 'INITIATOR' }, { id: 'p2', userId: 'u-2', partyType: 'PARTICIPANT' }],
      };
      const prisma: any = {
        ground: { findFirst: async () => ground },
        checkIn: {
          findFirst: jest.fn(async ({ where }: any) => {
            if (where.isFinal) return null;
            if (where.status) return where.participantId === 'p1' ? { id: 'open-p1', sessionNumber: 13 } : null;
            return { sessionNumber: 12 };
          }),
          update: jest.fn(async () => ({})),
          create: jest.fn(async () => ({})),
        },
      };
      prisma.$transaction = async (fn: any) => fn(prisma);
      const service = Object.create(GroundsService.prototype) as GroundsService;
      (service as any).prisma = prisma;
      const res = await service.beginClosingSession('g1', 'org1', 'u-init');
      expect(res.participantsFlagged).toBe(2);
      expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'open-p1' }, data: { isFinal: true } });
      expect(prisma.checkIn.create.mock.calls[0][0].data).toMatchObject({ sessionNumber: 13, isFinal: true });
    });

    it('makes no next session after the closing one', async () => {
      const svc: any = {
        logger: { log: jest.fn() },
        prisma: {
          groundParticipant: { findUnique: async () => ({ managingOnly: false }) },
          ground: { findUnique: async () => ({ cadence: 'WEEKLY', status: 'ACTIVE', timelineDays: 0, runsUntilEnded: true }) },
          checkIn: { findUnique: async () => ({ isFinal: true }) },
        },
        createNextIfAbsent: jest.fn(),
      };
      await (ConversationService.prototype as any).ensureNextSession.call(svc, 'g1', 'p1', 13);
      expect(svc.createNextIfAbsent).not.toHaveBeenCalled();
    });

    it('keeps making the next session while it is not ended', async () => {
      const svc: any = {
        logger: { log: jest.fn() },
        cadenceToDate: () => new Date(),
        prisma: {
          groundParticipant: { findUnique: async () => ({ managingOnly: false }) },
          ground: { findUnique: async () => ({ cadence: 'WEEKLY', status: 'ACTIVE', timelineDays: 0, runsUntilEnded: true, endsAt: null }) },
          checkIn: { findUnique: async () => ({ isFinal: false }) },
        },
        createNextIfAbsent: jest.fn(),
      };
      await (ConversationService.prototype as any).ensureNextSession.call(svc, 'g1', 'p1', 13);
      expect(svc.createNextIfAbsent).toHaveBeenCalledWith('g1', 'p1', 14, expect.anything());
    });
  });

  describe('setup accepts it as the answer to how long it runs', () => {
    it('says it back like every other setup answer, and again once done', () => {
      const p: any = proposalFrom('timeline', { runsUntilEnded: true });
      expect(p.kind).toBe('timeline');
      expect(p.say).toBe('I will set this to run until you end it.');
      expect(confirmedSay(p)).toBe('I have set this to run until you end it.');
    });

    it('reads the plain words from the lead even when the model found no length', () => {
      for (const said of ['When I end it.', 'Until I end it, really', 'it should keep going until I stop it', 'No end date.', 'Ongoing']) {
        const p: any = proposalFrom('timeline', {}, [], said);
        expect(p.kind).toBe('timeline');
        expect(p.untilEnded).toBe(true);
        expect(p.say).toBe('I will set this to run until you end it.');
      }
    });

    it('does not take "ongoing support" in another answer as a length', () => {
      expect(saidUntilIEndIt('We want ongoing support for each shop')).toBe(false);
      expect(saidUntilIEndIt('Every shop pays on time until I say otherwise', false)).toBe(false);
    });

    it('keeps a real length as a length', () => {
      const p: any = proposalFrom('timeline', { timelineDays: 90 }, [], 'three months');
      expect(p.untilEnded).toBeUndefined();
      expect(p.say).toBe('I will set this to run for 90 days.');
    });

    it('does not ask how long it runs again once it is set to run until the lead ends it', () => {
      const base = { targetCount: 1, scenario: 'NEW_HIRE', cadence: 'WEEKLY', successLooksLike: 'x', partyCount: 2 } as any;
      const keys = (g: any) => contextGaps({ ...base, ...g }).map((x) => x.key);
      expect(keys({ timelineDays: 0 })).toContain('timeline');
      expect(keys({ timelineDays: 0, runsUntilEnded: true })).not.toContain('timeline');
    });

    it('opens the context chat by saying it runs until the lead ends it', () => {
      expect(openingLine(0, 'WEEKLY', true)).toBe('This check-in runs until you end it and people check in once a week.');
    });
  });

  describe('changing an existing check-in to run until the lead ends it', () => {
    function timelineService(ground: any) {
      const updates: any[] = [];
      const prisma: any = {
        ground: { findUnique: async () => ground, update: jest.fn(async (a: any) => { updates.push(a); return { ...ground, ...a.data }; }) },
        groundParticipant: { findFirst: async () => ({ id: 'p1' }) },
        user: { findUnique: async () => ({ role: 'MEMBER', organizationId: 'org1' }) },
        checkIn: { count: async () => 0, updateMany: async () => ({}), findMany: async () => [] },
      };
      const service = Object.create(GroundsService.prototype) as any;
      service.prisma = prisma;
      service.logger = { log: jest.fn(), warn: jest.fn() };
      service.tellThemItIsOpenAgain = async () => undefined;
      return { service, updates };
    }
    const row = (over: any = {}) => ({
      id: 'g1', initiatorId: 'u-lead', organizationId: 'org1', status: 'ACTIVE', timelineDays: 84, runsUntilEnded: false,
      cadence: 'WEEKLY', groundAuditLog: null, createdAt: new Date('2026-01-01'), startsAt: null, endsAt: new Date('2026-03-26'), ...over,
    });

    it('stores no length, turns the flag on, and clears the end date', async () => {
      const { service, updates } = timelineService(row());
      await service.updateTimeline('g1', 'u-lead', { runsUntilEnded: true });
      expect(updates[0].data).toMatchObject({ timelineDays: 0, timelineWeeks: null, runsUntilEnded: true, timelineStated: true, endsAt: null });
      const change = updates[0].data.groundAuditLog.timeline[0].changes;
      expect(change.timelineDays).toEqual({ from: 84, to: null });
      expect(change.runsUntilEnded).toEqual({ from: false, to: true });
    });

    it('turns the flag off again when a length is given', async () => {
      const { service, updates } = timelineService(row({ timelineDays: 0, runsUntilEnded: true, endsAt: null }));
      await service.updateTimeline('g1', 'u-lead', { timelineDays: 56 });
      expect(updates[0].data).toMatchObject({ timelineDays: 56, runsUntilEnded: false });
    });

    it('reopens one that ran out of time, since it has no end to be past', async () => {
      const { service, updates } = timelineService(row({ status: 'STALLED', stalledFromStatus: 'ACTIVE' }));
      await service.updateTimeline('g1', 'u-lead', { runsUntilEnded: true });
      expect(updates[0].data).toMatchObject({ status: 'ACTIVE', runsUntilEnded: true });
    });

    it('does not give a moved start date an end date', async () => {
      const { service, updates } = timelineService(row({ timelineDays: 0, runsUntilEnded: true, endsAt: null }));
      await service.updateTimeline('g1', 'u-lead', { startsAt: '2026-10-05' });
      expect(updates[0].data.endsAt).toBeNull();
    });
  });

  describe('creating one', () => {
    const SERVICE = require('fs').readFileSync(require('path').join(__dirname, '../grounds/grounds.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '') as string;
    it('both ways of creating a check-in store the flag and no length when asked', () => {
      expect(SERVICE.match(/runsUntilEnded: dto\.runsUntilEnded === true,/g)).toHaveLength(2);
      expect(SERVICE).toMatch(/if \(dto\.runsUntilEnded === true\) return 0;/);
    });
  });
});
