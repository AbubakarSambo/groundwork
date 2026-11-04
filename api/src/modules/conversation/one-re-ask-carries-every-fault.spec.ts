import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ASK_ONE_THING } from './a-turn-asks-one-thing';

/**
 * ONE RE-ASK CARRIES EVERY FAULT (2 November 2026).
 *
 * Each check after a reply used to ask the model again on its own, so a reply with two faults cost
 * two more calls, and 143 of 239 replies on the round-23 run were asked again at least once. Now the
 * checks collect what they would have asked for, the model is asked once with all of it, and the
 * second reply ships only if it passes every check. Otherwise the first reply stands, with what each
 * check does when its retry fails. What a person reads is checked here, not only the calls.
 */
function makeService(replies: string[]) {
  const systems: string[] = [];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', scenario: GroundScenario.OKR_ALIGNMENT, label: 'Test Ground', initiatorId: 'init-1', resolutionState: null, brief: null,
        cadence: 'WEEKLY', moment: 'STARTING', organizationId: 'org1', timelineDays: 90,
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
  let n = 0;
  const anthropic: any = { respond: jest.fn(async (full: string) => { systems.push(full); return replies[Math.min(n++, replies.length - 1)]; }) };
  const context: any = { build: jest.fn(async () => ({ block: '' })) };
  const none = { get: () => undefined } as any;
  const service = new ConversationService(prisma, prompts, anthropic, context, none, none, none, none, none, none);
  prisma.checkIn.findUnique = jest.fn(async () => ({
    id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 2,
    status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
    isSelfCorrection: false, selfCorrectionTargetSession: null,
    participant: { id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.PARTICIPANT, roleAsDescribed: null },
  }));
  return { service, systems };
}

const TWO_FAULTS = 'What is the deliverable you are working on this week? And who else is involved in it?';
const reAsks = (systems: string[]) => systems.filter((s) => s.includes('YOUR LAST REPLY ASKED MORE THAN ONE QUESTION') || s.includes('work jargon'));

describe('a reply that fails two checks', () => {
  it('is asked again once, with both instructions, and the second reply is what they read', async () => {
    const { service, systems } = makeService([TWO_FAULTS, 'What did you finish this week?']);
    const out = await service.sendMessage('ci1', 'user-1', 'I sent the three invoices to Kilele on Monday.');
    const again = reAsks(systems);
    expect(again).toHaveLength(1);
    expect(again[0]).toContain(ASK_ONE_THING);
    expect(again[0]).toContain('"deliverable"');
    expect(JSON.stringify(out)).toContain('What did you finish this week?');
  });

  it('keeps the first reply when the second fails a check too, and asks no third time', async () => {
    const { service, systems } = makeService([TWO_FAULTS, 'Which deliverable is next? And when is it due?']);
    const out = await service.sendMessage('ci1', 'user-1', 'I sent the three invoices to Kilele on Monday.');
    expect(reAsks(systems)).toHaveLength(1);
    expect(JSON.stringify(out)).not.toContain('Which deliverable is next?');
  });
});
