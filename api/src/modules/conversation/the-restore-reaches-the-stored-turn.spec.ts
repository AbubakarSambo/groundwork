import { GroundScenario, PartyType, CheckInStatus, TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * THE RESTORE HAS TO REACH THE STORED TURN. (W2)
 *
 * The function that puts her word back is tested next door, and passing there
 * proves nothing about production. I removed the call from the live path as a
 * bite-check and all 321 conversation tests stayed green - which is exactly the
 * failure this codebase has already had twice: a change proved against its
 * builder, never reaching the thing it was built for.
 *
 * So this asserts on the row that goes in the database and on the string handed
 * back to the browser. Both, because they are two different reads of the same
 * fix and the report is built from the first while she reads the second.
 */
function makeService(aiReply: string, personTurns: string[]) {
  const stored: any[] = [];
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
      count: jest.fn(async () => personTurns.length),
      create: jest.fn(async (a: any) => {
        stored.push(a.data);
        return { id: `t${stored.length}`, content: a.data.content };
      }),
      findMany: jest.fn(async () =>
        personTurns.map((content, i) => ({ id: `p${i}`, role: TurnRole.PERSON, content })),
      ),
      delete: jest.fn(async () => ({})),
    },
    recordEntry: { findMany: jest.fn(async () => []) },
    groundParticipant: { count: jest.fn(async () => 2) },
    adminProfile: { findUnique: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []) },
  };
  const prompts: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'BASE' : Promise.reject(new Error('none')))) };
  const anthropic: any = { respond: jest.fn(async () => aiReply) };
  const context: any = { build: jest.fn(async () => ({ block: '' })) };
  const service = new ConversationService(prisma, prompts, anthropic, context, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  prisma.checkIn.findUnique = jest.fn(async () => ({
    id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 1,
    status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
    isSelfCorrection: false, selfCorrectionTargetSession: null,
    participant: { id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.PARTICIPANT, roleAsDescribed: null },
  }));
  return { service, stored };
}

describe('her word, on the row that goes in the database', () => {
  it('restores the name the engine tidied up', async () => {
    // THE LIVE CASE, from her own walkthrough. She typed "microchipshit". The
    // engine wrote "Microchip Solutions" and it went on her record.
    const { service, stored } = makeService(
      'I have the client name: Microchip Solutions. That is a specific rescue.',
      ['microchipshit and they were not happy so i had to step in'],
    );
    const out = await service.sendMessage('ci1', 'user-1', 'yes that is right');

    const ai = stored.find((s) => s.role === TurnRole.AI);
    expect(ai.content).toMatch(/microchipshit/);
    expect(ai.content).not.toMatch(/Microchip Solutions/);
    // And the same text is what she reads, not a cleaned-up copy of it.
    expect(out.reply).toBe(ai.content);
  });

  it('counts the message being sent right now, not only the stored ones', async () => {
    // The turn she is sending has not been read back from the database yet when
    // the reply is generated, so a version that only looked at stored turns
    // would treat every name in her newest message as invented.
    //
    // My first version of this asserted that "anvilcorp" coming back as
    // "Anvilcorp" was a fault. It is not, and the rule next door says so
    // deliberately: she typed "mass general" and "Mass General" is the same
    // name. Capitalising somebody's word is not inventing a company. So the
    // case has to be an actual invention off the newest turn.
    const { service, stored } = makeService('Got it: Anvil Corporation.', ['earlier turn']);
    await service.sendMessage('ci1', 'user-1', 'the client is anvilcorp');
    expect(stored.find((s) => s.role === TurnRole.AI).content).toBe('Got it: anvilcorp.');
  });

  it('leaves an ordinary reply completely alone', async () => {
    const reply = 'What was the outcome of that call?';
    const { service, stored } = makeService(reply, ['microchipshit and they were not happy']);
    await service.sendMessage('ci1', 'user-1', 'i stepped in');
    expect(stored.find((s) => s.role === TurnRole.AI).content).toBe(reply);
  });
});
