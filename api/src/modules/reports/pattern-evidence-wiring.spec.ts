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
    recordEntry: {
      findMany: jest.fn(async (args: any) => {
        if (args.include?.participant) return overrides.records; // main corpus records (uses `include`, not `select`)
        if (args.select?.evidenceType) return overrides.records.map((r) => ({ text: r.text, evidenceType: 'CHECK_IN' })); // allGroundTexts
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

  const service = new ReportsService(prisma, prompts, anthropic, {} as any, {} as any, {} as any, {} as any);
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
const RECORDS = [
  { participant: { id: 'p1' }, checkIn: { sessionNumber: 1 }, text: 'We shipped the integration on schedule.', type: 'CHECK_IN' },
  { participant: { id: 'p2' }, checkIn: { sessionNumber: 1 }, text: 'p1 credited my work on the migration explicitly.', type: 'CHECK_IN' },
];

describe('GW-PATTERN-WIRE-B: surfaced patterns reach report synthesis as evidence', () => {
  it('proof: a bad-faith code (D1), a positive code (R3), and an excluded code (E4) are all detected on this ground', async () => {
    const { service, getCorpus, getUpsertedCreate } = makeService({
      ground: GROUND,
      parties: PARTIES,
      records: RECORDS,
      patternRows: [
        { participantId: 'p1', code: 'D1', observationText: 'The record describes completion without downstream confirmation.' },
        { participantId: 'p2', code: 'R3', observationText: 'p2 was credited by name for specific work on the migration.' },
        { participantId: 'p1', code: 'E4', observationText: 'p1 consistently absorbs operational load relative to the other founder.' },
      ],
      extractResult: {
        sharedPicture: 'Both parties describe the integration as shipped.',
        agreements: ['The integration shipped on schedule.'],
        divergences: [],
        centralQuestion: 'Has the downstream team confirmed the integration works for them?',
        concernFlags: [
          { label: 'founder', observation: 'The record shows completion claimed without downstream confirmation from the team depending on it.' },
        ],
        hiddenContributors: [],
      },
    });

    const report = await service.synthesize('g1');
    const corpus = getCorpus();

    // eslint-disable-next-line no-console
    console.log('\n===== ASSEMBLED SYNTHESIS CORPUS (proof) =====\n' + corpus + '\n===== END CORPUS =====\n');
    // eslint-disable-next-line no-console
    console.log('===== RESULTING REPORT (proof) =====\n' + JSON.stringify(getUpsertedCreate(), null, 2) + '\n===== END REPORT =====\n');

    // D1 (bad-faith): notice present, routed toward concernFlags per rule 10, phrased factually.
    expect(corpus).toContain('NOTE [longitudinal pattern evidence - code D1 False Completion Reporting]');
    expect(corpus).toContain('The record describes completion without downstream confirmation.');
    expect(corpus).toContain('note it in concernFlags as a plain factual observation about the record per synthesis rule 10');
    expect(corpus).toContain('never an accusation, never a judgement of the person, never speculation about motive');

    // R3 (positive): notice present, explicitly kept OUT of concernFlags.
    expect(corpus).toContain('NOTE [longitudinal pattern evidence - positive, code R3 Named Collaborator]');
    expect(corpus).toContain('p2 was credited by name for specific work on the migration.');
    expect(corpus).toContain('This is a positive signal, not a concern');
    expect(corpus).toContain('Do NOT place this in concernFlags');

    // E4 (alignment-feed-only): must not appear anywhere in the corpus - the
    // report is read by the parties themselves, same rule as the live conversation.
    expect(corpus).not.toContain('E4');
    expect(corpus).not.toContain('Founder Burden Imbalance');
    expect(corpus).not.toContain('absorbs operational load relative to the other founder');

    // The final report actually carries the concern through to engagement.concernFlags.
    expect((report as any).engagement.concernFlags).toEqual([
      { label: 'founder', observation: 'The record shows completion claimed without downstream confirmation from the team depending on it.' },
    ]);
  });

  it('guard: patternDetection.findMany is queried with status SURFACED, scoped to this ground', async () => {
    const { service, service: _s } = makeService({
      ground: GROUND,
      parties: PARTIES,
      records: RECORDS,
      patternRows: [],
      extractResult: { sharedPicture: '', agreements: [], divergences: [], centralQuestion: '' },
    });
    await service.synthesize('g1');
    const prisma: any = (service as any).prisma;
    expect(prisma.patternDetection.findMany).toHaveBeenCalledWith({
      where: { groundId: 'g1', status: 'SURFACED' },
      select: { participantId: true, code: true, observationText: true },
    });
  });

  it('guard: a ground with no surfaced patterns produces no pattern-evidence notice at all', async () => {
    const { service, getCorpus } = makeService({
      ground: GROUND,
      parties: PARTIES,
      records: RECORDS,
      patternRows: [],
      extractResult: { sharedPicture: '', agreements: [], divergences: [], centralQuestion: '' },
    });
    await service.synthesize('g1');
    expect(getCorpus()).not.toContain('longitudinal pattern evidence');
  });

  it('guard: every ALIGNMENT_FEED_ONLY_CODES member is excluded from the corpus, not just E4', async () => {
    const { service, getCorpus } = makeService({
      ground: GROUND,
      parties: PARTIES,
      records: RECORDS,
      patternRows: [
        { participantId: 'p1', code: 'F5', observationText: 'One cofounder shows more operational absorption than the other.' },
      ],
      extractResult: { sharedPicture: '', agreements: [], divergences: [], centralQuestion: '' },
    });
    await service.synthesize('g1');
    const corpus = getCorpus();
    expect(corpus).not.toContain('F5');
    expect(corpus).not.toContain('Cofounder Burden Asymmetry');
    expect(corpus).not.toContain('operational absorption');
  });
});
