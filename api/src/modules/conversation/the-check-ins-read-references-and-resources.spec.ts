import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { theReferencesBlock, REFERENCES_HEADING } from './what-references-and-resources-hold';

/**
 * THE CHECK-INS READ REFERENCES AND RESOURCES (Release 1B, pull request 2 of 3; Hafsah, 18 October 2026: "The check-ins read
 * References and resources (confirmed rules, what each stage needs, coaching, risks, and the lead's People note) to decide what
 * to ask. The conversation itself stays as it is.").
 *
 * Proved on a real turn through `sendMessage`, with an engine that keeps every prompt it is handed:
 *  - with Release 1B's switch off, every prompt is exactly what it is with none of the new lines on record at all: the
 *    check-ins ask as today;
 *  - with it on, Ngozi's own check-in is given what each stage needs, the coaching, the risks, the lead's note on her and
 *    what to help her with, and the proof she added today; never the note on Femi;
 *  - the lead's own check-in is never given a People note on anybody.
 */
const STAGE = 'Approved: the client has signed the scope, with the email.';
const COACH = 'Name the next step and its day on every open invoice.';
const RISK = 'An invoice called paid without the remittance.';
const NOTE_ON_NGOZI = 'Careful with numbers. Rushes the write-up at month end.';
const HELP_NGOZI = 'Starting the write-up two days earlier.';
const NOTE_ON_FEMI = 'Strong with clients, slow to log calls.';

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

/* The lines as the database holds them. The mock applies the query's own filter, as the database would, OR included. */
const CONTEXT_LINES = [
  { kind: 'WAY_OF_WORKING', text: 'Samuel checks data before market reports go to the client.', aboutParticipantId: null, audience: 'EVERYONE', closedAt: null },
  { kind: 'STAGE_NEEDS', text: STAGE, aboutParticipantId: null, audience: 'EVERYONE', closedAt: null },
  { kind: 'COACHING', text: COACH, aboutParticipantId: null, audience: 'EVERYONE', closedAt: null },
  { kind: 'RISK', text: RISK, aboutParticipantId: null, audience: 'EVERYONE', closedAt: null },
  { kind: 'PERSON_NOTE', text: NOTE_ON_NGOZI, aboutParticipantId: 'p-ngozi', audience: 'LEAD_ONLY', closedAt: null },
  { kind: 'HELP_WITH', text: HELP_NGOZI, aboutParticipantId: 'p-ngozi', audience: 'LEAD_ONLY', closedAt: null },
  { kind: 'PERSON_NOTE', text: NOTE_ON_FEMI, aboutParticipantId: 'p-femi', audience: 'LEAD_ONLY', closedAt: null },
];
const NEW_KINDS = ['STAGE_NEEDS', 'COACHING', 'RISK', 'PERSON_NOTE', 'HELP_WITH'];
let LINES_HELD = CONTEXT_LINES;
let SWITCH_ON = true;
const matches = (row: any, where: any): boolean => {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (k === 'OR') { if (!(v as any[]).some((w) => matches(row, w))) return false; continue; }
    if (k === 'NOT') { if ((v as any[]).some((w) => matches(row, w))) return false; continue; }
    if (v && typeof v === 'object' && 'notIn' in (v as any)) { if ((v as any).notIn.includes(row[k])) return false; continue; }
    if (v && typeof v === 'object' && 'in' in (v as any)) { if (!(v as any).in.includes(row[k])) return false; continue; }
    if (v && typeof v === 'object') continue;
    if (v !== undefined && row[k] !== undefined && row[k] !== v) return false;
  }
  return true;
};
/* The lead's notes: one about Ngozi, the lead's only. `participantId` set means about one person. */
const LEAD_NOTES = [{ text: 'Ngozi may leave after Q4. Please do not raise it with anyone.', participantId: 'p-ngozi', audience: 'LEAD_ONLY' }];

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
      findMany: jest.fn(async (args: any) => LINES_HELD.filter((l) => matches(l, args?.where))),
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
    organization: { findUnique: jest.fn(async () => ({ release1bTabsOn: SWITCH_ON, release1SalesBoardOn: false })) },
    itemEvidence: { findMany: jest.fn(async (args: any) => (args?.where?.participantId === whose.id ? [{ readAs: 'A signed order', itemName: 'Harbor Foods', countsAsProof: true, shows: 'An order for 25 units, signed 13 October.', document: { fileName: 'IMG_2231.jpg' } }] : [])) },
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


const allOf = (handed: string[]) => handed.join('\n');

describe("with Release 1B's switch off, the check-ins ask exactly as today", () => {
  afterEach(() => { SWITCH_ON = true; LINES_HELD = CONTEXT_LINES; });

  it('every prompt Ngozi\u2019s turn hands the model is the same as with none of the new lines on record', async () => {
    SWITCH_ON = false;
    const withThem = aServiceFor(NGOZI);
    await withThem.service.sendMessage('ci1', 'u-ngozi', 'The invoice is still waiting for Abena to approve it.');
    LINES_HELD = CONTEXT_LINES.filter((l) => !NEW_KINDS.includes(l.kind));
    const without = aServiceFor(NGOZI);
    await without.service.sendMessage('ci1', 'u-ngozi', 'The invoice is still waiting for Abena to approve it.');
    /* The turn's own prompts, the ones the reply is written from. (A background note-taking call can land in either run's list
       a moment later; it is read from what the person said, never from References and resources.) */
    const turnPrompts = (s: { service: any }) => ((s.service as any).anthropic.respond as jest.Mock).mock.calls.map((c) => JSON.stringify(c));
    expect(turnPrompts(withThem).length).toBeGreaterThan(0);
    expect(turnPrompts(withThem)).toEqual(turnPrompts(without));
    for (const t of [STAGE, COACH, RISK, NOTE_ON_NGOZI, HELP_NGOZI, NOTE_ON_FEMI, 'IMG_2231.jpg', REFERENCES_HEADING]) expect(allOf(withThem.handed)).not.toContain(t);
  });
});

describe('with it on, the check-ins read References and resources', () => {
  afterEach(() => { SWITCH_ON = true; LINES_HELD = CONTEXT_LINES; });

  it('Ngozi\u2019s own check-in is given the stage needs, coaching, risks, the lead\u2019s note on her, and her proof; never Femi\u2019s note', async () => {
    const { service, handed } = aServiceFor(NGOZI);
    await service.sendMessage('ci1', 'u-ngozi', 'The invoice is still waiting for Abena to approve it.');
    const all = allOf(handed);
    for (const t of [REFERENCES_HEADING, STAGE, COACH, RISK, NOTE_ON_NGOZI, HELP_NGOZI, 'IMG_2231.jpg was read as a signed order, filed as evidence on Harbor Foods. It counts as proof.']) expect(all).toContain(t);
    expect(all).not.toContain(NOTE_ON_FEMI);
    /* The rules still arrive once, as how this team works, as they did before. */
    expect(all.split('Samuel checks data before market reports go to the client.').length - 1).toBeGreaterThan(0);
  });

  it('the lead\u2019s own check-in is never given a People note on anybody', async () => {
    const { service, handed } = aServiceFor(TUNDE);
    await service.sendMessage('ci1', 'u-tunde', 'Atlas is on track for the client review.');
    const all = allOf(handed);
    expect(all).toContain(COACH);
    for (const t of [NOTE_ON_NGOZI, HELP_NGOZI, NOTE_ON_FEMI]) expect(all).not.toContain(t);
  });
});

describe('the block, as the model reads it', () => {
  it('knowledge in plain sentences, never a script, and empty when there is nothing on record', () => {
    expect(theReferencesBlock({ stageNeeds: [], coaching: [], risks: [], theirNote: [], proofAddedToday: [], firstName: 'Ngozi' })).toBe('');
    const block = theReferencesBlock({ stageNeeds: [], coaching: [COACH], risks: [], theirNote: [HELP_NGOZI], proofAddedToday: [{ fileName: 'IMG_2228.jpg', readAs: 'A photo', itemName: 'Mama Mboga Mart', countsAsProof: false, shows: null }], firstName: 'Mercy' });
    expect(block).toContain('Never read them out as a list.');
    expect(block).toContain('WHAT THE LEAD WANTS YOU TO HELP MERCY WITH');
    expect(block).toContain('Never say it, never quote it, and never say or hint that anything was written about them.');
    expect(block).toContain('- IMG_2228.jpg was read as a photo, filed as evidence on Mama Mboga Mart. It does not count as proof.');
  });
});
