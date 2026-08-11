import { GroundScenario, PartyType, CheckInStatus, TurnRole } from '@prisma/client';
import { ConversationService } from '../conversation/conversation.service';

/**
 * OFF IS THE CHECK-IN EXACTLY AS IT IS TODAY. (G42)
 *
 * The coaching tables have existed since the migration that added them and nothing
 * has ever written a row, so this is the first code in the product that reads or
 * writes them - and the first thing to prove is that with the flag off it does
 * neither. Not an empty heading in the prompt, not a row in the table, not a
 * query.
 *
 * Then the other half, which the module tests cannot show: that the block reaches
 * the assembled prompt. Two changes in this codebase were proved against their
 * builder and never reached production, and one of them was proved against its
 * builder earlier today while the live path had the call removed.
 */

function makeService(
  { enabled, coachingRow }: { enabled: boolean; coachingRow?: any },
) {
  const captured: string[] = [];
  const upserts: any[] = [];
  const coachingState = {
    findUnique: jest.fn(async () => coachingRow ?? null),
    upsert: jest.fn(async (a: any) => { upserts.push(a); return a.create ?? {}; }),
  };
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', scenario: GroundScenario.NEW_PROJECT, label: 'Test Ground',
        initiatorId: 'init-1', resolutionState: null, brief: null, cadence: 'WEEKLY',
        moment: 'STARTING', organizationId: 'org1', timelineDays: 90,
      })),
    },
    personStyleProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    checkIn: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []), update: jest.fn(async () => ({})) },
    conversationTurn: {
      count: jest.fn(async () => 0),
      create: jest.fn(async (a: any) => ({ id: 't1', content: a.data.content })),
      findMany: jest.fn(async () => []),
      delete: jest.fn(async () => ({})),
    },
    recordEntry: { findMany: jest.fn(async () => []) },
    groundParticipant: { count: jest.fn(async () => 2) },
    adminProfile: { findUnique: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []) },
    coachingState,
  };
  const prompts: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'BASE' : Promise.reject(new Error('none')))) };
  const anthropic: any = { respond: jest.fn(async (full: string) => { captured.push(full); return 'AI_REPLY'; }) };
  const context: any = { build: jest.fn(async () => ({ block: '' })) };
  const config: any = { get: jest.fn(() => enabled) };
  // config is the TENTH constructor argument, after events, documents, billing,
  // email and usage. My first version put it fifth, where events lives, and the
  // flag silently read as off - so the three "with the flag on" tests failed and
  // the three "with it off" tests passed for the wrong reason. Worth the comment:
  // a positional mock that is wrong in the safe direction is the kind of green
  // that means nothing.
  const service = new ConversationService(
    prisma, prompts, anthropic, context,
    { emit: () => Promise.resolve() } as any, {} as any, {} as any, {} as any, {} as any,
    config,
  );
  prisma.checkIn.findUnique = jest.fn(async () => ({
    id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 4,
    status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
    isSelfCorrection: false, selfCorrectionTargetSession: null,
    participant: { id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.PARTICIPANT, roleAsDescribed: null },
  }));
  return { service, captured, coachingState, upserts };
}

const OUTSTANDING = {
  participantId: 'p1',
  currentStep: 'Gets to the person with budget and authority, even when it is awkward',
  stepGivenAt: 3,
  staircase: null,
  staircasePosition: 0,
  history: [{ step: 'Gets to the person with budget and authority, even when it is awkward', givenAtSession: 3, outcome: null }],
};

describe('with the flag off', () => {
  it('never touches the table', async () => {
    // THE FIRST THING TO PROVE. A feature nobody has turned on must not be
    // querying for state on every single turn of every check-in.
    const { service, coachingState } = makeService({ enabled: false, coachingRow: OUTSTANDING });
    await service.sendMessage('ci1', 'user-1', 'hello');
    expect(coachingState.findUnique).not.toHaveBeenCalled();
  });

  it('puts nothing in the prompt, not even a heading', async () => {
    const { service, captured } = makeService({ enabled: false, coachingRow: OUTSTANDING });
    await service.sendMessage('ci1', 'user-1', 'hello');
    expect(captured[0]).not.toMatch(/step/i);
  });

  it('and writes nothing when a session ends', async () => {
    const { service, upserts } = makeService({ enabled: false });
    const out = await service.recordCoachingStep('p1', 4, {
      noticed: 'x', lookingLike: 'Gets to the buyer', reason: 'a real reason', hadSubstance: true,
    });
    expect(out.offered).toBeNull();
    expect(upserts).toHaveLength(0);
  });
});

describe('with the flag on, the step reaches the assembled prompt', () => {
  it('asks about the outstanding one, in the prompt the model receives', async () => {
    // Asserted on the literal string sent to the model, because that is the only
    // place this is true or false.
    const { service, captured } = makeService({ enabled: true, coachingRow: OUTSTANDING });
    await service.sendMessage('ci1', 'user-1', 'hello');
    expect(captured[0]).toMatch(/Last session's step/);
    expect(captured[0]).toMatch(/budget and authority/);
    expect(captured[0]).toMatch(/both complete answers/);
  });

  it('says nothing when there is no step outstanding, which is most sessions', async () => {
    // A coaching block that always has something in it is a product that always
    // has something to say about you.
    const { service, captured } = makeService({ enabled: true, coachingRow: null });
    await service.sendMessage('ci1', 'user-1', 'hello');
    expect(captured[0]).not.toMatch(/Last session's step/);
  });

  it('and never asks about a step given in this same session', async () => {
    // Which would be the coach asking about a thing it has not said yet.
    const { service, captured } = makeService({
      enabled: true,
      coachingRow: { ...OUTSTANDING, stepGivenAt: 4 },
    });
    await service.sendMessage('ci1', 'user-1', 'hello');
    expect(captured[0]).not.toMatch(/Last session's step/);
  });

  it('carries the person into nothing: the block names no name', async () => {
    const { service, captured } = makeService({ enabled: true, coachingRow: OUTSTANDING });
    await service.sendMessage('ci1', 'user-1', 'hello');
    const block = captured[0].slice(captured[0].indexOf("Last session's step"));
    for (const p of [/\bthey are\b/i, /\bhas failed\b/i, /\bmust\b/, /\brequired\b/i]) {
      expect({ p: String(p), hit: p.test(block) }).toMatchObject({ hit: false });
    }
  });
});

describe('with the flag on, the write path writes', () => {
  it('offers a step and stores it as outstanding', async () => {
    const { service, upserts } = makeService({ enabled: true, coachingRow: null });
    const out = await service.recordCoachingStep('p1', 4, {
      noticed: 'Works the friendly contact rather than the person who can sign',
      lookingLike: 'Gets to the person with budget and authority, even when it is awkward',
      reason: 'two of the three named conversations were with the same contact',
      hadSubstance: true,
    });
    expect(out.offered).toMatch(/budget and authority/);
    expect(upserts[0].create.currentStep).toMatch(/budget and authority/);
    // Nobody has answered yet, and the row must not pretend otherwise.
    expect(upserts[0].create.history[0].outcome).toBeNull();
  });

  it('records what the person said became of the last one', async () => {
    const { service, upserts } = makeService({ enabled: true, coachingRow: OUTSTANDING });
    await service.recordCoachingStep('p1', 4, {
      noticed: null, lookingLike: null, reason: 'a reason', hadSubstance: true,
    }, 'done');
    expect(upserts[0].update.history[0].outcome).toBe('done');
    // Managed, so it closes. Leaving it open is how somebody gets asked about the
    // same thing in week nine.
    expect(upserts[0].update.currentStep).toBeNull();
    expect(upserts[0].update.staircasePosition).toBe(1);
  });

  it('writes nothing about somebody who had a quiet week', async () => {
    // Not an empty step, not a miss recorded, nothing.
    const { service, upserts } = makeService({ enabled: true, coachingRow: null });
    const out = await service.recordCoachingStep('p1', 4, {
      noticed: null, lookingLike: null, reason: null, hadSubstance: false,
    });
    expect(out.offered).toBeNull();
    expect(upserts[0].create.currentStep).toBeNull();
    expect(upserts[0].create.history).toEqual([]);
  });

  it('and a database failure never breaks the session', async () => {
    const { service } = makeService({ enabled: true, coachingRow: null });
    (service as any).prisma = undefined;
    await expect(service.recordCoachingStep('p1', 4, {
      noticed: null, lookingLike: null, reason: 'r', hadSubstance: true,
    })).resolves.toEqual({ offered: null });
  });
});
