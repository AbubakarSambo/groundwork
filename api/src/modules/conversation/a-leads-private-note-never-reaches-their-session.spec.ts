import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';

/**
 * A LEAD'S PRIVATE NOTE ABOUT A PERSON NEVER REACHES THE MODEL IN THAT PERSON'S OWN SESSION.
 *
 * Decision 32, 27 September 2026: "They are left out of what that session is given, not kept back by
 * an instruction to the model." The capability check that morning: Tunde told the context chat that
 * Ngozi may leave after Q4 because of the commute, "please do not raise it with anyone", it was kept
 * as a line only he reads, and it was then put into Ngozi's own check-in as "a place to look", kept
 * from her by an instruction that it was never quoted.
 *
 * This runs a real turn of Ngozi's own check-in through `sendMessage`, with every place the lead's
 * words about her are kept holding the sentence - the context line about her, what sits between her
 * and a colleague, and the lead's notes about her - and an engine that records every prompt it is
 * handed. No prompt may hold the sentence, or any four words of it in a row. Then the same for the
 * coach that reads her finished session. And the lead's own check-in, which is checked for what it
 * is given today.
 */

const THE_REMARK = 'Ngozi may leave after Q4';
const THE_LINE = 'Ngozi may leave after Q4 because of the commute.';
const BETWEEN = 'Between Ngozi and Femi: Ngozi may leave after Q4, and Femi does not know yet.';
const THE_NOTE = 'Ngozi may leave after Q4. Please do not raise it with anyone.';

/** Every run of four words of the remark, each of which must be absent. */
const FOUR_WORD_RUNS = (() => {
  const w = THE_REMARK.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i + 4 <= w.length; i++) out.push(w.slice(i, i + 4).join(' '));
  return out;
})();
const whatOfItIsIn = (text: string) => [THE_REMARK, ...FOUR_WORD_RUNS].filter((r) => text.toLowerCase().includes(r.toLowerCase()));

const TUNDE = {
  id: 'p-tunde', groundId: 'g-atlas', partyType: PartyType.INITIATOR, managingOnly: false, userId: 'u-tunde',
  roleAsDescribed: 'I run Atlas', createdAt: new Date('2026-09-01'),
  nameGiven: null, email: 't@meridian.test', user: { firstName: 'Tunde', lastName: 'Bakare' },
};
const NGOZI = {
  id: 'p-ngozi', groundId: 'g-atlas', partyType: PartyType.PARTICIPANT, managingOnly: false, userId: 'u-ngozi',
  roleAsDescribed: 'finance', createdAt: new Date('2026-09-02'),
  nameGiven: null, email: 'n@meridian.test', user: { firstName: 'Ngozi', lastName: 'Eke' },
};
const FEMI = {
  id: 'p-femi', groundId: 'g-atlas', partyType: PartyType.PARTICIPANT, managingOnly: false, userId: 'u-femi',
  roleAsDescribed: 'sales', createdAt: new Date('2026-09-03'),
  nameGiven: null, email: 'f@meridian.test', user: { firstName: 'Femi', lastName: 'Okonkwo' },
};

/* The context lines as the database holds them. The mock applies the query's own filter, as the database would. */
const CONTEXT_LINES = [
  { kind: 'ABOUT_A_PERSON', text: THE_LINE, aboutParticipantId: 'p-ngozi', audience: 'LEAD_ONLY', closedAt: null },
  { kind: 'BETWEEN_PEOPLE', text: BETWEEN, aboutParticipantId: null, audience: 'LEAD_ONLY', closedAt: null },
  { kind: 'WAY_OF_WORKING', text: 'Samuel checks data before market reports go to the client.', aboutParticipantId: null, audience: 'EVERYONE', closedAt: null },
];
const matches = (row: any, where: any) => {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v && typeof v === 'object' && 'notIn' in (v as any)) { if ((v as any).notIn.includes(row[k])) return false; continue; }
    if (v && typeof v === 'object' && 'in' in (v as any)) { if (!(v as any).in.includes(row[k])) return false; continue; }
    if (v !== undefined && row[k] !== undefined && row[k] !== v) return false;
  }
  return true;
};
/* The lead's notes: one about Ngozi, the lead's only. `participantId` set means about one person. */
const LEAD_NOTES = [{ text: THE_NOTE, participantId: 'p-ngozi', audience: 'LEAD_ONLY' }];

function theDatabaseFor(whose: typeof NGOZI | typeof TUNDE) {
  const ground = {
    id: 'g-atlas', organizationId: 'org1', scenario: GroundScenario.OKR_ALIGNMENT, moment: null, label: 'Atlas delivery',
    mode: 'SHARED', timelineDays: 90, brief: null, startsAt: null, endsAt: null,
    status: 'ACTIVE', leadRemit: null, cadence: null, resolutionState: null,
    initiatorId: 'u-tunde', peersVisibleToEachOther: true, expectThemToUnblock: true,
    objectives: [], report: null,
    /* The session's own read of the lead's notes asks for EVERYONE and no person; the private note
       is neither, so the database hands back none of it. */
    leadContextNotes: LEAD_NOTES.filter((n) => n.audience === 'EVERYONE' && !n.participantId),
    participants: [TUNDE, NGOZI, FEMI],
  };
  return {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci1', groundId: 'g-atlas', participantId: whose.id, sessionNumber: 2,
        status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
        isSelfCorrection: false, selfCorrectionTargetSession: null, isFinal: false,
        participant: { ...whose },
      })),
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
    },
    groundParticipant: {
      count: jest.fn(async () => 3),
      findUnique: jest.fn(async () => ({ specificityHistory: [], detectedFunction: null, detectedFunctionConfidence: null, joinedAt: null, leftAt: null, leavePeriods: [] })),
      findFirst: jest.fn(async () => whose),
      findMany: jest.fn(async () => [TUNDE, NGOZI, FEMI].map((p) => ({ ...p, checkIns: [] }))),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: {
      count: jest.fn(async () => 1),
      create: jest.fn(async (args: any) => ({ id: 't1', content: args.data.content })),
      findMany: jest.fn(async () => [
        { id: 't0', role: 'PERSON', content: 'The Harbor Foods invoice is still waiting for approval.', createdAt: new Date() },
      ]),
      delete: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
    },
    groundContextItem: {
      findMany: jest.fn(async (args: any) => CONTEXT_LINES.filter((l) => matches(l, args?.where))),
    },
    leadContextNote: {
      findMany: jest.fn(async (args: any) => LEAD_NOTES.filter((n) => matches(n, args?.where))),
    },
    participantNote: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    delivery: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    recordEntry: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    workMention: { findMany: jest.fn(async () => []) },
    adminProfile: { findUnique: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
  };
}

const nothingBack = (method: string) => async () =>
  (String(method).endsWith('Many') || String(method) === 'groupBy' ? [] : null);
function everythingElseAnswersEmpty(seed: Record<string, any>) {
  return new Proxy(seed, {
    get: (target: any, model: string) => new Proxy(target[model] ?? {}, {
      get: (m: any, method: string) => m[method] ?? nothingBack(method),
    }),
  });
}

/** An engine that keeps every prompt it is handed, and every message with it. */
const anEngineThatKeepsEverything = () => {
  const handed: string[] = [];
  const keep = (...args: unknown[]) => { handed.push(JSON.stringify(args)); };
  return {
    handed,
    anthropic: {
      respond: jest.fn(async (...args: unknown[]) => { keep(...args); return 'What happened with the Harbor Foods invoice since last time?'; }),
      extract: jest.fn(async (...args: unknown[]) => { keep(...args); return null; }),
      respondWithMedia: jest.fn(async (...args: unknown[]) => { keep(...args); return ''; }),
    } as any,
  };
};

function aServiceFor(whose: typeof NGOZI | typeof TUNDE) {
  const prisma: any = everythingElseAnswersEmpty(theDatabaseFor(whose));
  const { anthropic, handed } = anEngineThatKeepsEverything();
  const context = new ConversationContextService(prisma);
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)) };
  const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
  const service = new ConversationService(prisma, promptStore, anthropic, context, nothing, nothing, nothing, nothing, nothing, nothing);
  return { service, handed, prisma };
}

describe("a lead's private note never reaches the model in that person's own session", () => {
  it('a real turn of Ngozi’s check-in: no prompt holds the remark or any four words of it', async () => {
    const { service, handed, prisma } = aServiceFor(NGOZI);
    const out = await service.sendMessage('ci1', 'u-ngozi', 'The invoice is still waiting for Abena to approve it.');
    expect(handed.length).toBeGreaterThan(0);
    for (const prompt of handed) expect(whatOfItIsIn(prompt)).toEqual([]);
    expect(whatOfItIsIn(String(out.reply))).toEqual([]);
    /* And it is left out at the read, not filtered after: her session asked for neither kind. */
    const asked = (prisma.groundContextItem.findMany as jest.Mock).mock.calls.map((c: any[]) => c[0]?.where?.kind);
    expect(asked).toContainEqual({ notIn: ['ABOUT_A_PERSON', 'BETWEEN_PEOPLE'] });
    /* The instruction that used to keep it back is not in any prompt either, because there is nothing to keep back. */
    for (const prompt of handed) expect(prompt).not.toContain('A PLACE TO LOOK, FROM THE PERSON RUNNING THIS CHECK-IN');
    /* What everybody may read still arrives. */
    expect(handed.join('\n')).toContain('Samuel checks data before market reports go to the client.');
  });

  it('the coach that reads her finished session is not handed the lead’s notes about her either', async () => {
    const { service, handed } = aServiceFor(NGOZI);
    jest.spyOn(service as any, 'coachingEnabled').mockReturnValue(true);
    await (service as any).observeForCoaching('ci1', 'p-ngozi', 2);
    for (const prompt of handed) expect(whatOfItIsIn(prompt)).toEqual([]);
    for (const prompt of handed) expect(prompt).not.toContain('HAS SAID MATTERS');
  });

  /*
   * AND THE LEAD'S OWN CHECK-IN, AS IT STANDS TODAY. It was never given the lead's read of anybody
   * (ABOUT_A_PERSON reached only the person it was about, and the lead's context chat), and it still
   * is not: that read lives on the Context page and in the lead's context chat. What sits between two
   * people is still the lead's own to be asked about, in the lead's own check-in.
   */
  it('Tunde’s own check-in is given what sits between Ngozi and Femi, and no line about one person', async () => {
    const { service, handed } = aServiceFor(TUNDE);
    await service.sendMessage('ci1', 'u-tunde', 'The Harbor Foods report goes out next Wednesday.');
    const all = handed.join('\n');
    expect(all).toContain('Femi does not know yet');
    expect(all).not.toContain(THE_LINE);
  });
});
