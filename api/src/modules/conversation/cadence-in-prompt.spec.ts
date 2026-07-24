import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * CADENCE-IN-PROMPT tripwire. ground.cadence/cadenceAnchorDay were only ever
 * used for scheduling math (availableFrom gates) - PromptContext had no
 * cadence field at all, so the model was never told whether a ground is
 * daily/weekly/fortnightly/monthly/sequential, even though the willingness
 * gate asks the person to commit to "consistent check-ins over the agreed
 * period" without ever naming that period to the model. Asserted against the
 * literal ASSEMBLED PROMPT STRING (not the existence of a field), mirroring
 * scenario-prompt-wiring.spec.ts's harness.
 */
function makeService(ground: Record<string, any>) {
  const capturedSystemPrompts: string[] = [];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    checkIn: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: {
      count: jest.fn(async () => 0),
      create: jest.fn(async (args: any) => ({ id: 'turn-1', content: args.data.content })),
      findMany: jest.fn(async () => []),
      delete: jest.fn(async () => ({})),
    },
    recordEntry: { findMany: jest.fn(async () => []) },
    groundParticipant: { count: jest.fn(async () => 2) },
    adminProfile: { findUnique: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []) },
  };
  const prompts: any = {
    getActiveContent: jest.fn(async (key: string) => {
      if (key === 'system') return 'SYSTEM_PROMPT_BASE';
      return Promise.reject(new Error('no active version'));
    }),
  };
  const anthropic: any = {
    respond: jest.fn(async (fullSystem: string) => { capturedSystemPrompts.push(fullSystem); return 'AI_REPLY'; }),
  };
  const context: any = { build: jest.fn(async () => ({ block: '' })) };
  const service = new ConversationService(
    prisma, prompts, anthropic, context,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  const checkIn = {
    id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 1,
    status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
    isSelfCorrection: false, selfCorrectionTargetSession: null,
    participant: { id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.INITIATOR, roleAsDescribed: null },
  };
  prisma.checkIn.findUnique = jest.fn(async () => checkIn);
  return { service, capturedSystemPrompts };
}

async function assembledPrompt(cadence: string | null) {
  const { service, capturedSystemPrompts } = makeService({
    id: 'g1', scenario: GroundScenario.NEW_PROJECT, label: 'Test Ground',
    initiatorId: 'init-1', resolutionState: null, brief: null, cadence,
  });
  await service.sendMessage('ci1', 'user-1', 'hello');
  return capturedSystemPrompts[0];
}

describe('CADENCE-IN-PROMPT: the ground\'s actual cadence reaches the model', () => {
  it('WEEKLY renders as a plain-English cadence line', async () => {
    expect(await assembledPrompt('WEEKLY')).toMatch(/CADENCE: weekly/);
  });

  it('FORTNIGHTLY renders as "every two weeks"', async () => {
    expect(await assembledPrompt('FORTNIGHTLY')).toMatch(/CADENCE: every two weeks/);
  });

  it('SEQUENTIAL is described as no fixed schedule, not a raw enum value', async () => {
    const prompt = await assembledPrompt('SEQUENTIAL');
    expect(prompt).toMatch(/CADENCE: no fixed schedule/);
    expect(prompt).not.toMatch(/CADENCE: SEQUENTIAL/);
  });

  it('missing cadence says "not set" rather than silently omitting the line', async () => {
    expect(await assembledPrompt(null)).toMatch(/CADENCE: not set/);
  });
});
