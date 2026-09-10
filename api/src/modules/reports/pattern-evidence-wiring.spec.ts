import { ReportsService } from './reports.service';

/**
 * Pattern-evidence-into-report wiring tripwire (GW-PATTERN-WIRE-B).
 *
 * Option B: a ground's SURFACED, code-detected behavioural patterns
 * (pattern-library.ts's real threshold detectors) are handed to report
 * synthesis as evidence, routed toward concernFlags per SYNTHESIS RULE 10 for
 * bad-faith codes, and explicitly kept OUT of concernFlags for the one
 * positive code (R3) since that field's schema is scoped to reduced
 * follow-through only. ALIGNMENT_FEED_ONLY_CODES (F5, E4 - both documented as
 * "never name to either person directly") must never reach the corpus at all,
 * since the report is read by the parties themselves.
 *
 * These tests assert against the literal corpus string handed to
 * anthropic.extract() - the same bar the scenario-prompt tripwires used - so
 * this can never silently disconnect the way surfacedPatterns did in the live
 * conversation path.
 */

function makeService(overrides: {
  ground: Record<string, any>;
  parties: { id: string; partyType: string; roleAsDescribed: string | null }[];
  records: { participant: { id: string }; checkIn: { sessionNumber: number } | null; text: string; type: string }[];
  patternRows: { participantId: string; code: string; observationText: string | null }[];
  extractResult: Record<string, any>;
}) {
  let capturedCorpus = '';
  let capturedSystemPrompt = '';
  let upsertedCreate: any;

  const prisma: any = {
    ground: { findUnique: jest.fn(async () => overrides.ground) },
    adminProfile: { findUnique: jest.fn(async () => null) },
    leadContextNote: { findMany: jest.fn(async () => []) },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => {
        if (args.select?.checkIns) {
          // participantsWithTurns (thin-record notice) - no turns needed for this proof.
          return overrides.parties.map((p) => ({ id: p.id, partyType: p.partyType, checkIns: [] }));
        }
        return overrides.parties;
      }),
      findFirst: jest.fn(async () => null), // short-circuits extractAndStoreLeadSignals harmlessly
    },
    workMention: { findMany: jest.fn(async () => []) },
    recordEntry: {
      findMany: jest.fn(async (args: any) => {
        if (args.include?.participant) return overrides.records; // main corpus records (uses `include`, not `select`)
        if (args.select?.anchoredDocumentId) return overrides.records.map((r) => ({ text: r.text, anchoredDocumentId: null, anchoredOrigin: null, recallBased: false })); // allGroundTexts
        if (args.where?.participantId) return overrides.records.filter((r) => r.participant.id === args.where.participantId).map((r) => ({ text: r.text })); // per-party engagementParties
        if (args.where?.type?.in) return []; // tensionEntries
        return []; // annotatedEntries
      }),
    },
    checkIn: {
      findMany: jest.fn(async (args: any) => {
        if (args.select?.participantId) return []; // completedCheckInParticipantIds
        return []; // sessionTextsPerParty
      }),
      findFirst: jest.fn(async () => null), // specificityNotes/recallNotes/openQuestions - none needed for this proof
      count: jest.fn(async () => 2),
    },
    groundDocument: {
      groupBy: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
    },
    patternDetection: {
      findMany: jest.fn(async (args: any) => {
        expect(args.where.status).toBe('SURFACED');
        return overrides.patternRows;
      }),
    },
    report: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async (args: any) => {
        upsertedCreate = args.create;
        return { id: 'r1', ...args.create };
      }),
    },
  };

  const prompts: any = { getActive: jest.fn(async () => ({ id: 'pv-1', content: 'base synthesis prompt.' })) };
  const anthropic: any = {
    extract: jest.fn(async (systemPrompt: string, messages: { role: string; content: string }[]) => {
      capturedSystemPrompt = systemPrompt;
      capturedCorpus = messages[0].content;
      return overrides.extractResult;
    }),
  };

  const service = new ReportsService(prisma, prompts, anthropic, {} as any, {} as any, {} as any, {} as any, { tell: async () => [] } as any);
  return {
    service,
    getCorpus: () => capturedCorpus,
    getSystemPrompt: () => capturedSystemPrompt,
    getUpsertedCreate: () => upsertedCreate,
  };
}

const GROUND = { id: 'g1', scenario: 'NEW_PROJECT', initiatorId: 'user-init', resolutionState: null, brief: null, participants: [] };
const PARTIES = [
  { id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' },
  { id: 'p2', partyType: 'PARTICIPANT', roleAsDescribed: 'engineer' },
];
/* The synthesis result the mocked model hands back. Shape only; nothing in it is under test. */
const EXTRACT = {
  sharedPicture: 'Both records describe the integration.',
  agreements: ['It shipped on schedule.'],
  divergences: [],
  centralQuestion: 'What is next?',
  engagement: { concernFlags: [] },
};
const RECORDS = [
  { participant: { id: 'p1' }, checkIn: { sessionNumber: 1 }, text: 'We shipped the integration on schedule.', type: 'CHECK_IN' },
  { participant: { id: 'p2' }, checkIn: { sessionNumber: 1 }, text: 'p1 credited my work on the migration explicitly.', type: 'CHECK_IN' },
];

/**
 * GW-PATTERN-WIRE-B, INVERTED. PATTERNS ARE A SECTION, NOT A SUGGESTION TO THE MODEL.
 *
 * This block used to prove that every surfaced detection reached the synthesis corpus as a paragraph
 * telling the model to "note it in concernFlags ... if the record itself corroborates this". That was
 * the engine's finding handed to a model as a suggestion it could decline - and when it complied, the
 * same fact could reach the page in the model's words AND in the engine's, and disagree.
 *
 * There is one route now: `sessionReport` renders surfaced detections as their own read, in the
 * library's words (see a-pattern-is-a-section-not-a-suggestion.spec.ts). So the corpus carries NO
 * pattern notice, whatever is detected. What this file still proves is the half that never changed:
 * the alignment-feed-only codes reach nobody, on any route.
 */
describe('GW-PATTERN-WIRE-B: patterns do not reach the synthesis prompt at all', () => {
  const rows = [
    { participantId: 'p1', code: 'D1', observationText: 'The record describes completion without downstream confirmation.' },
    { participantId: 'p2', code: 'R3', observationText: 'p2 was credited by name for specific work on the migration.' },
    { participantId: 'p1', code: 'E4', observationText: 'absorbs operational load relative to the other founder' },
    { participantId: 'p1', code: 'F5', observationText: 'operational absorption' },
  ];

  it('a ground with surfaced patterns of every kind produces a corpus with none of them in it', async () => {
    const { service, getCorpus } = makeService({
      ground: GROUND,
      parties: PARTIES,
      records: RECORDS,
      patternRows: rows,
      extractResult: EXTRACT,
    });
    await service.synthesize('g1');
    const corpus = getCorpus();
    expect(corpus).not.toContain('longitudinal pattern evidence');
    expect(corpus).not.toContain('concernFlags as a plain factual observation');
    for (const r of rows) expect(corpus).not.toContain(r.observationText!);
  });

  it('and the excluded codes reach nobody on the route that does exist', async () => {
    /* The section filters ALIGNMENT_FEED_ONLY_CODES before anything is named. Pinned on the source,
       because the mock above cannot reach sessionReport's own read. */
    const src = require('fs').readFileSync(__dirname + '/reports.service.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const at = src.indexOf('const patternsForPage = (await this.prisma.patternDetection.findMany(');
    expect(src.slice(at, at + 1200)).toContain('ALIGNMENT_FEED_ONLY_CODES.has(r.code)');
  });
});
