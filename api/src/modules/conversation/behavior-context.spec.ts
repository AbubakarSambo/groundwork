import { GroundScenario, PartyType, CheckInStatus, TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { ENGINE_RULES } from './prompt-library';

/**
 * Cross-cutting CONTEXT property tripwires (GW-CONTEXT-*), asserted on the ASSEMBLED prompt
 * (what actually reaches the model), not source strings. See BEHAVIOR_INVENTORY.md category H.
 *
 * H1 ACROSS TURNS  - full history reaches the model (green) AND a "do not re-ask answered"
 *                    instruction is present (RED today - documents the live re-ask bug).
 * H2 ACROSS SESSIONS - session-2 assembled prompt carries session-1 record content.
 * H3 ACROSS PEOPLE - a conflicting other-party record surfaces a cross-party probe, and it is
 *                    NON-REVEALING (never attributes a position to the other party).
 */

type Rec = { type: string; text: string };
interface AssembleOpts {
  scenario?: GroundScenario;
  sessionNumber?: number;
  history?: { role: 'AI' | 'PERSON'; content: string }[];
  otherPartyRecords?: Rec[];
  priorSessionRecords?: Rec[];
  message?: string;
  isSelfCorrection?: boolean;
  selfCorrectionTargetSession?: number;
  selfCorrectionRecords?: Rec[];
}

// Assembles the REAL system prompt + history the model is called with, via the live path.
async function assemble(opts: AssembleOpts): Promise<{ system: string; history: { role: string; content: string }[] }> {
  const scenario = opts.scenario ?? GroundScenario.REALIGN_TEAM;
  const sessionNumber = opts.sessionNumber ?? 1;
  const history = opts.history ?? [];
  const other = opts.otherPartyRecords ?? [];
  const prior = opts.priorSessionRecords ?? [];
  const selfCorr = opts.selfCorrectionRecords ?? [];

  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', scenario, label: 'Test', initiatorId: 'init-1', resolutionState: null, brief: null })) },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber,
        status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
        isSelfCorrection: opts.isSelfCorrection ?? false,
        selfCorrectionTargetSession: opts.selfCorrectionTargetSession ?? null,
        participant: { id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.INITIATOR, roleAsDescribed: null },
      })),
      count: jest.fn(async () => 0),
      // prior completed check-ins for across-session summaries
      findMany: jest.fn(async () => prior.length ? [{ id: 'ci-prev', sessionNumber: sessionNumber - 1, specificityDimensions: null }] : []),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: {
      count: jest.fn(async () => history.filter(h => h.role === 'PERSON').length),
      create: jest.fn(async (args: any) => ({ id: 'tn', content: args.data.content })),
      findMany: jest.fn(async () => history.map((h, i) => ({ id: `t${i}`, role: h.role === 'AI' ? TurnRole.AI : TurnRole.PERSON, content: h.content }))),
      delete: jest.fn(async () => ({})),
    },
    recordEntry: {
      // Precise routing so each real query gets only what it would really return:
      //  - priorSession (H2):        where.checkInId === 'ci-prev', participantId 'p1'
      //  - crossReference (H3):      where.participantId === other party id ('p2'), no checkInId
      //  - degree-1 self commitments: where.type COMMITMENT, participantId 'p1' (none here)
      findMany: jest.fn(async (args: any) => {
        const w = args?.where ?? {};
        if (w.checkInId === 'ci-prev') return prior;
        if (w.checkIn) return selfCorr; // self-correction target session (where.checkIn.sessionNumber)
        if (w.participantId && w.participantId !== 'p1') return other;
        return [];
      }),
      count: jest.fn(async () => 0),
    },
    groundParticipant: {
      count: jest.fn(async () => 2),
      findUnique: jest.fn(async () => ({ specificityHistory: [] })),
      update: jest.fn(async () => ({})),
      findMany: jest.fn(async () => other.length ? [{ id: 'p2', partyType: PartyType.PARTICIPANT, checkIns: [{ id: 'ci2' }] }] : []),
    },
    adminProfile: { findUnique: jest.fn(async () => null) },
    leadContextNote: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    report: { findUnique: jest.fn(async () => null) },
  };

  let capturedSystem = '';
  let capturedHistory: { role: string; content: string }[] = [];
  const anthropic: any = {
    respond: jest.fn(async (sys: string, hist: { role: string; content: string }[]) => {
      capturedSystem = sys; capturedHistory = hist ?? []; return 'ok.';
    }),
  };
  const prompts: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? ENGINE_RULES : null)) };
  const context = new ConversationContextService(prisma);
  const service = new ConversationService(prisma, prompts, anthropic, context, { emit: () => undefined } as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  await service.sendMessage('ci1', 'user-1', opts.message ?? 'We are missing our targets and I do not think we agree on what they are.');
  return { system: capturedSystem, history: capturedHistory };
}

describe('GW-CONTEXT-H1: across turns - history reaches the model; "do not re-ask" instruction (RED, documents bug)', () => {
  it('the full prior history is carried into the model call (mechanism present)', async () => {
    const { history } = await assemble({
      history: [
        { role: 'AI', content: 'What do you hope to get out of this?' },
        { role: 'PERSON', content: 'I want the team aligned on the Q3 targets.' },
      ],
    });
    expect(history.some(h => h.content.includes('aligned on the Q3 targets'))).toBe(true);
  });

  // INTENTIONAL RED until Phase 2: no "do not re-ask what's answered" instruction exists yet.
  it('the assembled prompt instructs NOT to re-ask what the user already answered', async () => {
    const { system } = await assemble({});
    expect(system.toLowerCase()).toMatch(/do not re-?ask|already answered|do not repeat.*question|build on.*rather than repeat/);
  });
});

describe('GW-CONTEXT-H2: across sessions - session-1 record content is present in the session-2 prompt', () => {
  it('session 2 carries prior-session record content', async () => {
    const { system } = await assemble({
      sessionNumber: 2,
      priorSessionRecords: [{ type: 'COMMITMENT', text: 'I committed to publishing the Q3 target sheet.' }],
    });
    expect(system).toContain('Q3 target sheet');
  });
  it('session 1 has no prior-session carry-forward', async () => {
    const { system } = await assemble({ sessionNumber: 1 });
    expect(system).not.toContain('Q3 target sheet');
  });
});

describe('GW-CONTEXT-H3 / F#9: across people - conflicting other-party record surfaces a NON-REVEALING cross-party probe', () => {
  it('a cross-party probe is surfaced and it never leaks the other party\'s words', async () => {
    const { system } = await assemble({
      sessionNumber: 2,
      // completion claim (movement + "shipped"/"complete") on shared FALLBACK terms
      message: 'We shipped the payment integration and the API deploy is complete.',
      otherPartyRecords: [
        // same shared terms + PROBLEM words ("broken", "not working") -> CONTRADICTION trigger
        { type: 'WORRY', text: 'The payment integration is broken and the API deploy is not working for our team.' },
        { type: 'TENSION', text: 'The onboarding handoff never happened properly.' },
      ],
    });
    // (a) a cross-party injection FIRED - "Recommended probe:" is emitted ONLY by an injection
    //     (0 occurrences in ENGINE_RULES; pattern probes are empty in this harness), and the
    //     CONTRADICTION probe body is uniquely templated.
    expect(system).toContain('Recommended probe:');
    expect(system.toLowerCase()).toMatch(/before we log .* as complete|who specifically owned|resolved elsewhere/);
    // (b) NON-REVEALING (GW-37): probe is templated off the shared topic noun only - the other
    //     party's verbatim record text must NEVER appear in the assembled prompt.
    const theirWords = ['not working for our team', 'handoff never happened', 'is broken'];
    for (const phrase of theirWords) {
      expect(system.toLowerCase()).not.toContain(phrase);
    }
    // (c) the intelligence layer explicitly forbids quoting the other party
    expect(system.toLowerCase()).toContain('never quote the other party');
  });
});

describe('GW-CONTEXT-F-NAV: session-type openers reach the assembled prompt', () => {
  it('self-correction session opens on the correction, NOT the standard opener', async () => {
    const { system } = await assemble({
      sessionNumber: 2,
      isSelfCorrection: true,
      selfCorrectionTargetSession: 1,
      selfCorrectionRecords: [{ type: 'COMMITMENT', text: 'I said I would publish the target sheet by Friday.' }],
    });
    expect(system).toContain('SELF-CORRECTION SESSION');
    expect(system).toContain('Do NOT ask the standard opener');
    expect(system).toContain('returning to correct'); // names the correction intent
  });

  it('returning-user (session 2) opener is the continuity block, never a cold "welcome back"/"what have you been working on"', async () => {
    const { system } = await assemble({ sessionNumber: 2 });
    const lower = system.toLowerCase();
    expect(lower).toContain('last time you told us');   // continuity opener present
    expect(lower).toContain('never open with a question'); // opener discipline preserved
    // it explicitly BANS the cold openers
    expect(lower).toContain('welcome back');            // named as a thing NOT to say
    expect(lower).toContain('what have you been working on');
  });

  it('session 1 has NO returning-user continuity opener (cold-start is correct there)', async () => {
    const { system } = await assemble({ sessionNumber: 1 });
    expect(system.toLowerCase()).not.toContain('last time you told us');
  });
});
