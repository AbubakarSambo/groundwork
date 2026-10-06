import { GroundScenario, PartyType } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';

/**
 * THE ADVISOR, THROUGH THE REAL PROMPT. See asking-for-what-they-left-out.
 *
 * Grace named three banks in her own check-in; Peter, in his, has talked about Equity only. This
 * builds Peter's next turn's prompt the way the product does and reads what the model is given -
 * and checks the lead's words are only used where the check-in allows them.
 */

const GRACE = {
  id: 'p0', groundId: 'g1', partyType: PartyType.INITIATOR, managingOnly: false,
  roleAsDescribed: 'CEO', createdAt: new Date('2026-01-01'),
  nameGiven: null, email: 'grace@example.com', user: { firstName: 'Grace', lastName: 'Mutiso' },
};
const PETER = {
  id: 'p1', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false,
  roleAsDescribed: 'Advisor, financial services. 0.5% over two years.', createdAt: new Date('2026-01-02'),
  nameGiven: null, email: 'peter@example.com', user: { firstName: 'Peter', lastName: 'Kimani' },
};

/* Run 8, her words and his, exactly. */
const GRACE_SAID = [
  "Success is him getting us in front of the right decision-makers at Equity, KCB, and Co-op Bank. Beyond introductions, it's about helping us secure a distribution partnership with at least one of them.",
];
const PETER_SO_FAR = [
  { role: 'AI', content: 'Those are specific. What will you do first, and how will you go about it?' },
  { role: 'PERSON', content: 'My first step will be to conduct the introduction at Equity Bank. I will reach out to the head of SME lending there this month to facilitate this.' },
];

const nothingBack = (method: string) => async () => (String(method).endsWith('Many') || String(method) === 'groupBy' ? [] : null);
function everythingElseAnswersEmpty(seed: Record<string, any>) {
  return new Proxy(seed, {
    get: (target: any, model: string) => new Proxy(target[model] ?? {}, { get: (m: any, method: string) => m[method] ?? nothingBack(method) }),
  });
}

async function thePromptFor(who: 'peter' | 'grace', ground: Partial<Record<string, any>> = {}) {
  const theGround = {
    id: 'g1', organizationId: 'org1', scenario: GroundScenario.NEW_ADVISOR, moment: 'STARTING', label: 'What the advisor is actually for',
    mode: 'SHARED', timelineDays: 180, cadence: 'MONTHLY', startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, resolutionState: null,
    brief: 'We have given an advisor 0.5% for two years. I want it written down what we are asking of him and what he thinks he signed up for.',
    initiatorId: 'p0', peersVisibleToEachOther: null, expectThemToUnblock: true, participantsHearTheLeadsExpectation: true,
    objectives: [], report: null, leadContextNotes: [], participants: [GRACE, PETER],
    ...ground,
  };
  const me = who === 'peter' ? PETER : GRACE;
  const leadsTurnsAsked: any[] = [];
  const prisma: any = everythingElseAnswersEmpty({
    ground: { findUnique: jest.fn(async () => theGround), findFirst: jest.fn(async () => theGround) },
    conversationTurn: {
      findMany: jest.fn(async (args: any) => {
        if (args?.where?.checkIn?.participantId === 'p0' && args?.where?.role === 'PERSON') {
          leadsTurnsAsked.push(args);
          return GRACE_SAID.map((content) => ({ content }));
        }
        if (args?.where?.checkInId === 'ci1') return who === 'peter' ? PETER_SO_FAR.map((t) => ({ ...t, createdAt: new Date() })) : [];
        return [];
      }),
    },
  });
  const nothing: any = { get: () => undefined };
  const service = new ConversationService(
    prisma, { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) } as any,
    { respond: jest.fn(async () => ''), extract: jest.fn(async () => null) } as any,
    new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing,
  );
  const prompt: string = await (service as any).composeSystemPrompt(
    { id: 'ci1', groundId: 'g1', participantId: me.id, sessionNumber: 1, participant: { ...me, userId: `u-${me.id}` } },
    PETER_SO_FAR[1].content,
  );
  return { prompt, leadsTurnsAsked };
}

describe('the advisor: the next question is given the banks Peter has not spoken about', () => {
  it('in Peter\'s check-in, the model is told Grace named three and he has spoken about Equity only', async () => {
    const { prompt } = await thePromptFor('peter');
    expect(prompt).toContain('WHAT THEY HAVE NOT SAID YET.');
    expect(prompt).toContain('- Grace named three: Equity, KCB and Co-op Bank. Peter has spoken about Equity only. Ask directly about the other two, KCB and Co-op Bank, by name');
    /* Only the names in her list, never her sentence. */
    expect(prompt).not.toContain('Beyond introductions');
  });

  it('where the lead has said her expectation is not said out loud, her words are not read at all', async () => {
    const { prompt, leadsTurnsAsked } = await thePromptFor('peter', { participantsHearTheLeadsExpectation: false });
    expect(leadsTurnsAsked).toEqual([]);
    expect(prompt).not.toContain('Grace named');
  });

  it('on a check-in where people are not shared with each other, her words are not read', async () => {
    const { leadsTurnsAsked } = await thePromptFor('peter', { mode: 'SEPARATE' });
    expect(leadsTurnsAsked).toEqual([]);
  });

  it('on an evaluation, her words are not read', async () => {
    const { leadsTurnsAsked } = await thePromptFor('peter', { scenario: GroundScenario.PIP });
    expect(leadsTurnsAsked).toEqual([]);
  });
});
