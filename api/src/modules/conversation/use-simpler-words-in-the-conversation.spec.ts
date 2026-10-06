import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { simplerWordsGuidance } from './person-style';

/**
 * "USE SIMPLER WORDS" REACHES THE LITERAL PROMPT, FOR EVERYBODY IN THE CHECK-IN, AND ONLY WHEN IT IS ON.
 * Off, the prompt is the one every check-in had before the setting existed, byte for byte: it is the
 * same whether the column says false or has nothing to say. On, the only difference is the one block.
 */
function makeService(scenario: any, sessionNumber: number, partyType: any, on: boolean | undefined) {
  const captured: string[] = [];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', scenario, label: 'Test Ground', initiatorId: 'init-1', resolutionState: null, brief: null,
        cadence: 'WEEKLY', moment: 'STARTING', organizationId: 'org1', timelineDays: 90, simplerWords: on,
      })),
    },
    personStyleProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    checkIn: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []), update: jest.fn(async () => ({})) },
    participantNote: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    delivery: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
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
  const prompts: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYSTEM_PROMPT_BASE' : Promise.reject(new Error('none')))) };
  const anthropic: any = { respond: jest.fn(async (full: string) => { captured.push(full); return 'AI_REPLY'; }) };
  const context: any = { build: jest.fn(async () => ({ block: '' })) };
  const service = new ConversationService(prisma, prompts, anthropic, context, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any);
  prisma.checkIn.findUnique = jest.fn(async () => ({
    id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber,
    status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
    isSelfCorrection: false, selfCorrectionTargetSession: null,
    participant: { id: 'p1', userId: 'user-1', groundId: 'g1', partyType, roleAsDescribed: null },
  }));
  return { service, captured };
}


const prompt = async (scenario: any, partyType: any, sessionNumber: number, on: boolean | undefined) => {
  const { service, captured } = makeService(scenario, sessionNumber, partyType, on);
  await service.sendMessage('ci1', 'user-1', 'hello');
  return captured[0];
};

const READERS: [string, any][] = [['the lead', PartyType.INITIATOR], ['a participant', PartyType.PARTICIPANT]];

describe.each(READERS)('the conversation, as %s', (_n, party) => {
  it.each([[GroundScenario.OKR_ALIGNMENT, 1], [GroundScenario.NEW_HIRE, 2], [GroundScenario.PIP, 5]])('is unchanged with the switch off (%s, session %i)', async (sc, n) => {
    const never = await prompt(sc, party, n, undefined);
    const off = await prompt(sc, party, n, false);
    expect(off).toBe(never);
    expect(off).not.toMatch(/SIMPLER WORDS/);
  });

  it.each([[GroundScenario.OKR_ALIGNMENT, 1], [GroundScenario.NEW_HIRE, 2], [GroundScenario.PIP, 5]])('gets the plain-words rule and nothing else with it on (%s, session %i)', async (sc, n) => {
    const off = await prompt(sc, party, n, false);
    const on = await prompt(sc, party, n, true);
    expect(on).toMatch(/THIS CHECK-IN USES SIMPLER WORDS, FOR EVERYBODY IN IT/);
    expect(on).toMatch(/Write short sentences/);
    expect(on).toMatch(/Use plain words: "this conversation" rather than "this ground"/);
    expect(on.replace(simplerWordsGuidance(true) + '\n\n', '')).toBe(off);
  });
});
