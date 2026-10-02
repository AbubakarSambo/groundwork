import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';

/**
 * WHAT THE PERSON BEING REVIEWED ACTUALLY READS, WHEN THE ENGINE SAYS EVERYTHING IT WAS TOLD.
 *
 * Two rules meet here and both have been broken in the last week.
 *
 * THE FIRST is that "Participant B" must never reach the interview. A report is stored with no
 * names in it and the names are swapped back in per reader; that is right for a report and wrong
 * for a conversation with one person, because a letter is not something a question can be built
 * out of. The engine was told somebody was waiting on "Participant B" and it stopped asking who,
 * when and how many.
 *
 * THE SECOND is that in an evaluation check-in - a PIP, a recognition round, a contract renewal -
 * a colleague stays unnamed to the person being reviewed. Fixing the first rule by handing the
 * engine everybody's real name would break this one, because a name in the prompt is a name the
 * engine may say out loud.
 *
 * SO THIS TEST DOES NOT READ THE CODE AND IT DOES NOT READ THE PROMPT. It stands a worst-case
 * engine in front of the real conversation: one that repeats back every name-shaped word it was
 * given. Then it reads the turn that comes out, which is the thing a person actually sees. If a
 * colleague's name can reach the engine at all, this test says so.
 */

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
  roleAsDescribed: 'Relationship officer, Ikeja', createdAt: new Date('2026-01-02'),
  nameGiven: null, email: 'tunde@example.com', user: { firstName: 'Tunde', lastName: 'Okafor' },
};
const THE_COLLEAGUE = {
  id: 'p2', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false,
  roleAsDescribed: 'Credit analyst', createdAt: new Date('2026-01-03'),
  nameGiven: null, email: 'ngozi@example.com', user: { firstName: 'Ngozi', lastName: 'Balogun' },
};

function aCheckInWhere(
  { scenario, theyCalledThem }: { scenario: GroundScenario; theyCalledThem: string | null },
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
        id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 2,
        status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
        isSelfCorrection: false, selfCorrectionTargetSession: null, isFinal: false,
        participant: {
          id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.PARTICIPANT,
          roleAsDescribed: 'Relationship officer, Ikeja',
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
        fromParticipant: { roleAsDescribed: 'Relationship officer, Ikeja', user: { firstName: 'Tunde', lastName: 'Okafor' } },
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

describe('a colleague stays unnamed to the person being reviewed', () => {
  it('on a PIP, the person never reads a colleague name they did not use themselves', async () => {
    const { reply, prompt } = await whatTheyRead({ scenario: GroundScenario.PIP, theyCalledThem: null });

    // eslint-disable-next-line no-console
    console.log('\n===== WHAT TUNDE READS ON A PIP =====\n' + reply + '\n===== END =====\n');

    expect(reply).not.toContain('Ngozi');
    expect(reply).not.toContain('Balogun');
    /* The name cannot be said because it was never handed over in the first place. */
    expect(prompt).not.toContain('Ngozi');
    expect(prompt).not.toContain('Balogun');
  });

  it('and reads plain words instead, never "Participant B" and never a job title', async () => {
    const { prompt } = await whatTheyRead({ scenario: GroundScenario.PIP, theyCalledThem: null });
    /* The line the engine is given about what is in this person's way, printed in full. */
    // eslint-disable-next-line no-console
    console.log('\n===== WHAT THE ENGINE IS TOLD, PIP =====\n'
      + (prompt.split('\n').find((l) => l.includes('Sign-off on the six credit files')) ?? '(missing)')
      + '\n===== END =====\n');
    expect(prompt).toContain('Sign-off on the six credit files');
    expect(prompt).toMatch(/on (?:a|one|another) colleague/);
    expect(prompt).not.toMatch(/Participant [A-Z]/);
    expect(prompt).not.toContain('Credit analyst');
  });

  it('but their own word for somebody is said back to them, because they said it first', async () => {
    const { prompt } = await whatTheyRead({ scenario: GroundScenario.PIP, theyCalledThem: 'Ngozi' });
    expect(prompt).toContain('on Ngozi');
  });

  it('a positional label that somehow reached the record is not treated as their word', async () => {
    const { prompt } = await whatTheyRead({ scenario: GroundScenario.PIP, theyCalledThem: 'Participant B' });
    expect(prompt).not.toMatch(/Participant [A-Z]/);
    expect(prompt).toMatch(/on (?:a|one|another) colleague/);
  });

  /* Was NEW_HIRE until decision 75, item 25 made a new hire's first 90 days an evaluation check-in, where the
     colleague stays unnamed (the test below proves that). An ordinary delivery check-in is the control now. */
  it('on an ordinary check-in the colleague is named, which is what the interview lost', async () => {
    const { prompt } = await whatTheyRead({ scenario: GroundScenario.NEW_PROJECT, theyCalledThem: null });
    // eslint-disable-next-line no-console
    console.log('\n===== WHAT THE ENGINE IS TOLD, NEW_PROJECT =====\n'
      + (prompt.split('\n').find((l) => l.includes('Sign-off on the six credit files')) ?? '(missing)')
      + '\n===== END =====\n');
    expect(prompt).toContain('on Ngozi Balogun');
    expect(prompt).not.toMatch(/Participant [A-Z]/);
  });

  it('on a probation or first 90 days the colleague stays unnamed too (decision 75, item 25)', async () => {
    const { prompt } = await whatTheyRead({ scenario: GroundScenario.NEW_HIRE, theyCalledThem: null });
    expect(prompt).not.toContain('Ngozi');
    expect(prompt).toMatch(/on (?:a|one|another) colleague/);
  });
});
