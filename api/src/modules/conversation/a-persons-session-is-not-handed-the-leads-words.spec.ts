import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { aRoleInTheirOwnWords } from '../grounds/the-leads-words-about-someone';
import { WHO_ARE_YOU_IN_THIS } from './prompt-library';

/**
 * A PERSON'S OWN SESSION IS NOT HANDED THE LEAD'S WORDS ABOUT THEM. Request 36, route 3.
 *
 * `roleAsDescribed` is the sentence the lead typed about somebody when inviting them, and it reached
 * that person's own session prompt three times: "The person who set this up described this person's
 * part in it as: …", `PRIOR_CONTEXT`, and "who described their role as" in the plan for the session.
 * A model that holds the lead's words can say them back to the person they are about.
 *
 * This runs a real turn of the person's own check-in, through `sendMessage`, with an engine that
 * records every prompt it is handed, and reads those prompts.
 */

const THE_LEADS_WORDS = 'Tunde - Your relationship officer, who you said is not meeting his agreed targets';
const PIECES = [/not meeting/i, /agreed targets/i, /your relationship officer/i, /who you said/i];

/** A worst-case engine: it says out loud every name-shaped word it was handed. */
const anEngineThatSaysEverythingItWasTold = () => {
  const prompts: string[] = [];
  const respond = jest.fn(async (system: string) => {
    prompts.push(system);
    const nameShaped = [...new Set(system.match(/\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})*\b/g) ?? [])];
    return `Here is everyone this check-in told me about. ${nameShaped.join('. ')}.`;
  });
  return { anthropic: { respond } as any, prompts };
};

const THE_LEAD = {
  id: 'p0', groundId: 'g1', partyType: PartyType.INITIATOR, managingOnly: false,
  roleAsDescribed: 'Head of lending', createdAt: new Date('2026-01-01'),
  nameGiven: null, email: 'amina@example.com', user: { firstName: 'Amina', lastName: 'Yusuf' },
};
const THE_PERSON_BEING_REVIEWED = {
  id: 'p1', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false,
  roleAsDescribed: THE_LEADS_WORDS, createdAt: new Date('2026-01-02'),
  nameGiven: null, email: 'tunde@example.com', user: { firstName: 'Tunde', lastName: 'Okafor' },
};
const THE_COLLEAGUE = {
  id: 'p2', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false,
  roleAsDescribed: 'Credit analyst', createdAt: new Date('2026-01-03'),
  nameGiven: null, email: 'ngozi@example.com', user: { firstName: 'Ngozi', lastName: 'Balogun' },
};

function aCheckInWhere(
  { scenario, theyCalledThem, sessionNumber = 2, status = CheckInStatus.IN_PROGRESS }: { scenario: GroundScenario; theyCalledThem: string | null; sessionNumber?: number; status?: CheckInStatus },
) {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario, moment: null, label: 'The lending round',
    mode: 'SHARED', timelineDays: 90, brief: null, startsAt: null, endsAt: null,
    status: 'ACTIVE', leadRemit: null, cadence: null, resolutionState: null,
    initiatorId: 'p0', peersVisibleToEachOther: null, expectThemToUnblock: true,
    objectives: [], report: null, leadContextNotes: [],
    participants: [THE_LEAD, THE_PERSON_BEING_REVIEWED, THE_COLLEAGUE],
  };
  return {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber,
        status, isClarification: false, clarificationTarget: null,
        isSelfCorrection: false, selfCorrectionTargetSession: null, isFinal: false,
        participant: {
          id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.PARTICIPANT,
          roleAsDescribed: THE_LEADS_WORDS,
          user: { firstName: 'Tunde', lastName: 'Okafor' },
        },
      })),
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
    },
    /* The thing this person raised themselves, and who it is on. */
    groundDependency: {
      findMany: jest.fn(async () => [{
        id: 'd1', what: 'Sign-off on the six credit files', onParticipantId: 'p2',
        onLabel: theyCalledThem, fromParticipantId: 'p1', status: 'WAITING',
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), escalatedAt: null, then: null,
        fromParticipant: { roleAsDescribed: THE_LEADS_WORDS, user: { firstName: 'Tunde', lastName: 'Okafor' } },
      }]),
      count: jest.fn(async () => 1),
    },
    groundParticipant: {
      count: jest.fn(async () => 3),
      findUnique: jest.fn(async () => ({ specificityHistory: [] })),
      findFirst: jest.fn(async () => THE_PERSON_BEING_REVIEWED),
      findMany: jest.fn(async () => [THE_LEAD, THE_PERSON_BEING_REVIEWED, THE_COLLEAGUE]
        .map((p) => ({ ...p, checkIns: [] }))),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: {
      count: jest.fn(async () => 1),
      create: jest.fn(async (args: any) => ({ id: 't1', content: args.data.content })),
      findMany: jest.fn(async () => [
        { id: 't0', role: 'PERSON', content: 'I am still waiting on the credit files.', createdAt: new Date() },
      ]),
      delete: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
    },
    participantNote: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    delivery: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    recordEntry: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    workMention: { findMany: jest.fn(async () => []) },
    adminProfile: { findUnique: jest.fn(async () => null) },
    leadContextNote: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
  };
}

/*
 * Anything the conversation reads and this test does not care about answers empty rather than
 * throwing - the same shape the other prompt specs use. The point is one turn surviving to a
 * person, not the twenty other reads on the way.
 */
const nothingBack = (method: string) => async () =>
  (String(method).endsWith('Many') || String(method) === 'groupBy' ? [] : null);

function everythingElseAnswersEmpty(seed: Record<string, any>) {
  return new Proxy(seed, {
    get: (target: any, model: string) => new Proxy(target[model] ?? {}, {
      get: (m: any, method: string) => m[method] ?? nothingBack(method),
    }),
  });
}

async function whatTheyRead(
  { scenario, theyCalledThem }: { scenario: GroundScenario; theyCalledThem: string | null },
) {
  const prisma: any = everythingElseAnswersEmpty(aCheckInWhere({ scenario, theyCalledThem }));
  const { anthropic, prompts } = anEngineThatSaysEverythingItWasTold();
  const context = new ConversationContextService(prisma);
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) };
  const nothing: any = { get: () => undefined };
  const service = new ConversationService(
    prisma, promptStore, anthropic, context, nothing, nothing, nothing, nothing, nothing, nothing,
  );
  const out = await service.sendMessage('ci1', 'user-1', 'The credit files are still not signed off.');
  return { reply: out.reply as string, prompt: prompts[0] ?? '' };
}

describe('the person\'s own session is not handed the lead\'s description of them', () => {
  for (const scenario of [GroundScenario.PIP, GroundScenario.NEW_HIRE, GroundScenario.OKR_ALIGNMENT]) {
    it(`on ${scenario}, no prompt in their session holds any part of it`, async () => {
      const prisma: any = everythingElseAnswersEmpty(aCheckInWhere({ scenario, theyCalledThem: null }));
      const { anthropic, prompts } = anEngineThatSaysEverythingItWasTold();
      const context = new ConversationContextService(prisma);
      const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) };
      const nothing: any = { get: () => undefined };
      const service = new ConversationService(
        prisma, promptStore, anthropic, context, nothing, nothing, nothing, nothing, nothing, nothing,
      );
      const out = await service.sendMessage('ci1', 'user-1', 'The credit files are still not signed off.');
      expect(prompts.length).toBeGreaterThan(0);
      for (const p of prompts) expect(PIECES.filter((x) => x.test(p)).map(String)).toEqual([]);
      expect(PIECES.filter((x) => x.test(String(out.reply))).map(String)).toEqual([]);
      /* And the prompt no longer says what the lead wrote about them at all. */
      expect(prompts.join('\n')).not.toContain('described this person\'s part in it as');
    });
  }
});

describe('a role in their own words', () => {
  it('is the lead\'s own row, written from their own setup', () => {
    expect(aRoleInTheirOwnWords({ partyType: PartyType.INITIATOR, roleAsDescribed: 'I run the lending team' })).toBe('I run the lending team');
  });
  it('is nothing for anybody the lead invited, whose row holds the lead\'s words', () => {
    expect(aRoleInTheirOwnWords({ partyType: PartyType.PARTICIPANT, roleAsDescribed: THE_LEADS_WORDS })).toBeNull();
    expect(aRoleInTheirOwnWords(null)).toBeNull();
  });
});

/*
 * AND BECAUSE THE MODEL NO LONGER HAS THE LEAD'S SENTENCE, THE PERSON IS ASKED WHO THEY ARE.
 *
 * The first session's opener in a starting situation asks a non-lead "who are you in this" unless
 * their row already says. It used to count the lead's sentence as the row saying, so an invited
 * person with a lead-written role was never asked - and the model could no longer read the role
 * either. Only their own words count now.
 */
describe('an invited person whose only role is the lead\'s description is asked who they are', () => {
  async function theOpener(scenario: GroundScenario) {
    const prisma: any = everythingElseAnswersEmpty(aCheckInWhere({ scenario, theyCalledThem: null, sessionNumber: 1, status: CheckInStatus.NOT_STARTED }));
    prisma.conversationTurn.findFirst = jest.fn(async () => null);
    const { anthropic, prompts } = anEngineThatSaysEverythingItWasTold();
    const context = new ConversationContextService(prisma);
    const promptStore: any = {
      getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)),
      getActive: jest.fn(async () => ({ id: 'pv-1' })),
    };
    const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
    const billing: any = { canStartSession: jest.fn(async () => ({ allowed: true, sessionsBalance: 5 })) };
    const service = new ConversationService(
      prisma, promptStore, anthropic, context, nothing, nothing, billing, nothing, nothing, nothing,
    );
    const composed: string[] = [];
    const compose = (service as any).composeSystemPrompt.bind(service);
    jest.spyOn(service as any, 'composeSystemPrompt').mockImplementation(async (...a: any[]) => {
      const out = await compose(...a);
      composed.push(out);
      return out;
    });
    const out = await service.open('ci1', 'user-1');
    return { reply: String(out.reply), prompts: [...prompts, ...composed] };
  }

  it('in session 1 of a new hire\'s check-in, the first line is the product\'s own question', async () => {
    const { reply, prompts } = await theOpener(GroundScenario.NEW_HIRE);
    expect(reply).toContain(WHO_ARE_YOU_IN_THIS);
    expect(prompts.length).toBeGreaterThan(0);
    for (const p of prompts) expect(PIECES.filter((x) => x.test(p)).map(String)).toEqual([]);
    expect(PIECES.filter((x) => x.test(reply)).map(String)).toEqual([]);
  });
});
