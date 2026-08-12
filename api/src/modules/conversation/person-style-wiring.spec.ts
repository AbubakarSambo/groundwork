import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * THE STYLE BLOCK HAS TO REACH THE ASSEMBLED PROMPT.
 *
 * Twice in this codebase a change was proved against the function that builds a
 * block, and the block never reached production - once because a database row
 * answered first, once because the value was computed and never joined into the
 * prompt. Both passed every test that called the builder directly.
 *
 * So this asserts on the literal string sent to the model, and separately that
 * nothing about the person's actual account travels with it.
 */
function makeService(profile: Record<string, any> | null) {
  const captured: string[] = [];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', scenario: GroundScenario.NEW_PROJECT, label: 'Test Ground',
        initiatorId: 'init-1', resolutionState: null, brief: null, cadence: 'WEEKLY',
        moment: 'STARTING', organizationId: 'org1', timelineDays: 90,
      })),
    },
    personStyleProfile: { findUnique: jest.fn(async () => profile), upsert: jest.fn(async () => ({})) },
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
  };
  const prompts: any = {
    getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYSTEM_PROMPT_BASE' : Promise.reject(new Error('none')))),
  };
  const anthropic: any = { respond: jest.fn(async (full: string) => { captured.push(full); return 'AI_REPLY'; }) };
  const context: any = { build: jest.fn(async () => ({ block: '' })) };
  const service = new ConversationService(prisma, prompts, anthropic, context, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any);
  prisma.checkIn.findUnique = jest.fn(async () => ({
    id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 1,
    status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
    isSelfCorrection: false, selfCorrectionTargetSession: null,
    participant: { id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.PARTICIPANT, roleAsDescribed: null },
  }));
  return { service, captured };
}

const assembled = async (profile: Record<string, any> | null) => {
  const { service, captured } = makeService(profile);
  await service.sendMessage('ci1', 'user-1', 'hello');
  return captured[0];
};

describe('what a returning person changes about the prompt', () => {
  it('tells the engine not to start from scratch with someone who has been here', async () => {
    const p = await assembled({ needsPlainLanguage: false, answersBriefly: false, asksWhoReadsThis: false, groundsSeen: 3 });
    expect(p).toMatch(/used Groundwork before in this organisation \(3 grounds\)/i);
  });

  it('asks for plain words for the person who asked what our words mean', async () => {
    const p = await assembled({ needsPlainLanguage: true, answersBriefly: false, asksWhoReadsThis: false, groundsSeen: 2 });
    expect(p).toMatch(/Use plain words/i);
  });

  it('says who reads it, unprompted, for the person who asked before', async () => {
    const p = await assembled({ needsPlainLanguage: false, answersBriefly: false, asksWhoReadsThis: true, groundsSeen: 1 });
    expect(p).toMatch(/who sees this record and who does not/i);
  });

  it('adds nothing at all for someone with no profile', async () => {
    const p = await assembled(null);
    expect(p).not.toMatch(/HOW TO TALK TO THIS PERSON/i);
  });
});

describe('the boundary, asserted on the live prompt', () => {
  it('never claims to know what they said elsewhere', async () => {
    const p = await assembled({ needsPlainLanguage: true, answersBriefly: true, asksWhoReadsThis: true, groundsSeen: 5 });
    expect(p).toMatch(/You know nothing about what they discussed/i);
    expect(p).toMatch(/never refer to another ground/i);
  });

  it('carries no label for the person', async () => {
    // "Prefers plain language" is help. "This user is basic" is a verdict, and a
    // verdict in a prompt becomes a tone the person can hear.
    const p = (await assembled({ needsPlainLanguage: true, answersBriefly: true, asksWhoReadsThis: true, groundsSeen: 5 })).toLowerCase();
    for (const label of ['basic user', 'low ability', 'struggles with', 'poor communicator', 'unsophisticated']) {
      expect(p).not.toContain(label);
    }
  });
});
