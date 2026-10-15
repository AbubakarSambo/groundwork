import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';

/**
 * DECISION 139, ITEM 1: "PARTICIPANT A" NEVER REACHES THE PERSON IN A CONVERSATION.
 *
 * Read in the final evaluation (11 October 2026, profile 4, week 4). Baraka, the lead, was told in his own
 * session: "Samuel's own account reads: Participant A's own account of calls has risen from 6 a day to 10,
 * but Participant A says Participant A still does not understand the role. You set Take 10 calls a day (10)
 * for them." The sentence was written from the stored report's finding about Samuel, which is kept in labels,
 * and handed to the model as the sentence to say word for word.
 *
 * Run here as a real turn of Baraka's check-in, through `sendMessage`, reading every prompt the engine is
 * handed and the reply Baraka is served.
 */
const BARAKA = { id: 'pL', groundId: 'g1', userId: 'user-baraka', partyType: PartyType.INITIATOR, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-10-01T09:00:00Z'), nameGiven: null, email: 'baraka@example.test', user: { firstName: 'Baraka', lastName: 'Mutua' } };
const SAMUEL = { id: 'pA', groundId: 'g1', userId: 'user-samuel', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-10-01T10:00:00Z'), nameGiven: null, email: 'samuel@example.test', user: { firstName: 'Samuel', lastName: 'Owino' } };
const SADE = { id: 'pB', groundId: 'g1', userId: 'user-sade', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-10-01T11:00:00Z'), nameGiven: null, email: 'sade@example.test', user: { firstName: 'Sade', lastName: 'Balogun' } };

/* As stored: in labels. */
const THE_FINDING = "Participant A: Participant A's own account of calls has risen from 6 a day to 10, but Participant A says Participant A still does not understand the role";

function aLeadsCheckIn(engineSays: (system: string) => string) {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: GroundScenario.NEW_HIRE, moment: null, label: 'Samuel onboarding',
    mode: 'SHARED', timelineDays: 90, brief: null, startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null,
    cadence: 'WEEKLY', resolutionState: null, initiatorId: 'user-baraka', peersVisibleToEachOther: true, expectThemToUnblock: true,
    objectives: [], leadContextNotes: [],
    report: { sharedAs: null, findings: [{ participantId: 'pA', hasGap: true, headline: THE_FINDING }] },
    participants: [BARAKA, SAMUEL, SADE],
  };
  const prompts: string[] = [];
  const anthropic: any = { respond: jest.fn(async (system: string) => { prompts.push(system); return engineSays(system); }) };
  const seed: Record<string, any> = {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci1', groundId: 'g1', participantId: 'pL', sessionNumber: 4, status: CheckInStatus.IN_PROGRESS,
        isClarification: false, clarificationTarget: null, isSelfCorrection: false, selfCorrectionTargetSession: null, isFinal: false,
        participant: { id: 'pL', userId: 'user-baraka', groundId: 'g1', partyType: PartyType.INITIATOR, roleAsDescribed: null, user: { firstName: 'Baraka', lastName: 'Mutua' } },
      })),
      count: jest.fn(async () => 0), findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), update: jest.fn(async () => ({})),
    },
    /* What Baraka set for Samuel: the gap the report will show. */
    groundObjective: { findMany: jest.fn(async () => [{ name: 'Take 10 calls a day', target: 10, count: null, ownerParticipantId: 'pA', setByParticipantId: 'pL', direction: 'AIM' }]) },
    groundParticipant: {
      count: jest.fn(async () => 3), findUnique: jest.fn(async () => ({ specificityHistory: [] })), findFirst: jest.fn(async () => BARAKA),
      findMany: jest.fn(async () => [BARAKA, SAMUEL, SADE].map((p) => ({ ...p, checkIns: [] }))), update: jest.fn(async () => ({})),
    },
    conversationTurn: {
      count: jest.fn(async () => 1),
      create: jest.fn(async (args: any) => ({ id: 't1', content: args.data.content })),
      findMany: jest.fn(async () => [{ id: 't0', role: 'PERSON', content: 'Samuel is settling in.', createdAt: new Date() }]),
      delete: jest.fn(async () => ({})), update: jest.fn(async () => ({})),
    },
  };
  const nothingBack = (method: string) => async () => (String(method).endsWith('Many') || String(method) === 'groupBy' ? [] : null);
  const prisma: any = new Proxy(seed, {
    get: (target: any, model: string) => new Proxy(target[model] ?? {}, { get: (m: any, method: string) => m[method] ?? nothingBack(method) }),
  });
  const context = new ConversationContextService(prisma);
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) };
  const nothing: any = { get: () => undefined };
  const service = new ConversationService(prisma, promptStore, anthropic, context, nothing, nothing, nothing, nothing, nothing, nothing);
  return { service, prompts };
}

const A_LABEL = /Participant [A-Z]\b|the initiator/i;

describe("Baraka's own session, with the report's finding about Samuel stored in labels", () => {
  it('the sentence the model is handed to say names Samuel, and holds no stand-in label', async () => {
    /* A worst-case engine: it says the product's sentence word for word, as it was told to. */
    const { service, prompts } = aLeadsCheckIn((system) => {
      const m = /THE DISAGREEMENT TO SAY OUT LOUD[^\n]*\n\s*"([^\n]*)"/.exec(system);
      return m ? m[1] : 'What happened with Samuel this week?';
    });
    const out = await service.sendMessage('ci1', 'user-baraka', 'Samuel is settling in, I think.');
    const all = prompts.join('\n');
    /* The read already opens with his name, so it is said once, as it is: never "Samuel's own account reads: Samuel Owino's own account". */
    expect(all).toContain("Samuel Owino's own account of calls has risen");
    expect(all).not.toContain("Samuel's own account reads: Samuel Owino");
    const block = all.slice(all.indexOf('THE DISAGREEMENT TO SAY OUT LOUD'), all.indexOf('THE DISAGREEMENT TO SAY OUT LOUD') + 600);
    expect(block).not.toMatch(A_LABEL);
    expect(block).toContain('Samuel Owino');
    expect(String(out.reply)).not.toMatch(A_LABEL);
    expect(String(out.reply)).toContain('calls has risen from 6 a day to 10');
  });

  it('a stand-in label the model writes anyway is said the way Baraka may call that person', async () => {
    const { service } = aLeadsCheckIn(() => 'Participant B has not sent the call log. What will you ask about it?');
    const out = await service.sendMessage('ci1', 'user-baraka', 'Samuel is settling in, I think.');
    expect(String(out.reply)).not.toMatch(A_LABEL);
    expect(String(out.reply)).toContain('Sade Balogun has not sent the call log.');
  });
});
