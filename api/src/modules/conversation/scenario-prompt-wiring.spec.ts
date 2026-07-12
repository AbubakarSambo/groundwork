import { GroundScenario, PartyType, CheckInStatus, TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * Scenario prompt wiring tripwires (GW-PROMPT-WIRE).
 *
 * System A (the rich per-scenario prompt packs in prompt-library.ts) was
 * written, fully wired at one point, then silently disconnected for weeks
 * when the intake mechanism was redesigned - nothing broke, no test went
 * red, the AI just quietly ran on a generic pathway question instead of the
 * scenario-specific pack. These tests assert against the literal ASSEMBLED
 * PROMPT STRING that conversation.service.ts hands to the model (captured at
 * the anthropic.respond call site via sendMessage()), not against the
 * existence of functions or exported constants. If a future refactor stops
 * threading a pack, a field, or a party distinction into that string, these
 * go red before merge - that is the whole point.
 */

// ---------------------------------------------------------------------------
// Minimal ConversationService constructor shim, covering every prisma/service
// call composeSystemPrompt (and its private helpers) makes.
// ---------------------------------------------------------------------------

function makeService(opts: {
  ground: Record<string, any>;
  priorCheckIns?: any[]; // for the PRIOR_SESSION block (session >= 2)
  priorEntries?: any[]; // recordEntry rows keyed off priorCheckIns
  returningCheckIns?: any[]; // for buildReturningUserContext (session >= 2)
  returningEntries?: any[];
}) {
  const capturedSystemPrompts: string[] = [];

  const prisma: any = {
    ground: { findUnique: jest.fn(async () => opts.ground) },
    checkIn: {
      count: jest.fn(async () => 0), // personTurnCount / hasOtherPartyCheckedIn / buildGroundState submittedCount
      findMany: jest.fn(async (args: any) => {
        // Distinguish the two distinct checkIn.findMany call sites by their select shape.
        if (args?.select?.specificityLevel !== undefined) {
          return opts.returningCheckIns ?? [];
        }
        return opts.priorCheckIns ?? [];
      }),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: {
      count: jest.fn(async () => 0),
      create: jest.fn(async (args: any) => ({ id: 'turn-1', content: args.data.content })),
      findMany: jest.fn(async () => []),
      delete: jest.fn(async () => ({})),
    },
    recordEntry: {
      findMany: jest.fn(async (args: any) => {
        if (args?.where?.checkInId?.in) {
          return opts.returningEntries ?? [];
        }
        return opts.priorEntries ?? [];
      }),
    },
    groundParticipant: {
      count: jest.fn(async () => 2),
    },
    adminProfile: {
      findUnique: jest.fn(async () => null),
    },
    groundDocument: {
      findMany: jest.fn(async () => []),
    },
  };

  const prompts: any = {
    // 'system' must resolve; scenario.* DB overrides must reject so the
    // in-code buildScenarioPackForParty is what actually supplies session-1
    // content - the exact live-path branch these tests are guarding.
    getActiveContent: jest.fn(async (key: string) => {
      if (key === 'system') return 'SYSTEM_PROMPT_BASE';
      return Promise.reject(new Error('no active version'));
    }),
  };

  const anthropic: any = {
    respond: jest.fn(async (fullSystem: string) => {
      capturedSystemPrompts.push(fullSystem);
      return 'AI_REPLY';
    }),
  };

  const context: any = {
    build: jest.fn(async () => ({ block: '' })),
  };

  const service = new ConversationService(
    prisma,
    prompts,
    anthropic,
    context,
    {} as any, // EventEmitter2
    {} as any, // DocumentsService
    {} as any, // BillingService
    {} as any, // EmailService
    {} as any, // UsageService
    {} as any, // ConfigService
  );

  return { service, capturedSystemPrompts, prisma };
}

function makeCheckIn(overrides: Partial<{
  sessionNumber: number;
  partyType: PartyType;
  groundId: string;
  participantId: string;
}>) {
  return {
    id: 'ci1',
    groundId: overrides.groundId ?? 'g1',
    participantId: overrides.participantId ?? 'p1',
    sessionNumber: overrides.sessionNumber ?? 1,
    status: CheckInStatus.IN_PROGRESS,
    isClarification: false,
    clarificationTarget: null,
    isSelfCorrection: false,
    selfCorrectionTargetSession: null,
    participant: {
      id: overrides.participantId ?? 'p1',
      userId: 'user-1',
      groundId: overrides.groundId ?? 'g1',
      partyType: overrides.partyType ?? PartyType.INITIATOR,
      roleAsDescribed: null,
    },
  };
}

/** Exercises the real, private composeSystemPrompt via the public sendMessage() entry point. */
async function assembledPrompt(
  scenario: GroundScenario,
  partyType: PartyType,
  serviceOpts: Parameters<typeof makeService>[0]['ground'] extends never ? never : any,
  checkInOverrides: Partial<{ sessionNumber: number }> = {},
): Promise<string> {
  const ground = {
    id: 'g1',
    scenario,
    label: 'Test Ground',
    initiatorId: 'init-1',
    resolutionState: serviceOpts?.resolutionState ?? null,
    brief: null,
  };
  const { service, capturedSystemPrompts } = makeService({
    ground,
    priorCheckIns: serviceOpts?.priorCheckIns,
    priorEntries: serviceOpts?.priorEntries,
    returningCheckIns: serviceOpts?.returningCheckIns,
    returningEntries: serviceOpts?.returningEntries,
  });
  const checkIn = makeCheckIn({ sessionNumber: checkInOverrides.sessionNumber ?? 1, partyType });
  (service as any).prisma.checkIn.findUnique = jest.fn(async () => checkIn);

  await service.sendMessage('ci1', 'user-1', 'hello');
  expect(capturedSystemPrompts).toHaveLength(1);
  return capturedSystemPrompts[0];
}

// ---------------------------------------------------------------------------
// Session-1: each scenario's pack content must appear in the assembled prompt
// ---------------------------------------------------------------------------

describe('GW-PROMPT-WIRE-01: session-1 scenario packs reach the assembled prompt', () => {
  it('CRISIS_ALIGNMENT includes its scope-boundary text (initiator)', async () => {
    const prompt = await assembledPrompt(GroundScenario.CRISIS_ALIGNMENT, PartyType.INITIATOR, {});
    expect(prompt).toContain('SCOPE BOUNDARY:');
    expect(prompt).toContain('This is a decision session, not a relationship assessment.');
  });

  it('CRISIS_ALIGNMENT includes its scope-boundary text (participant)', async () => {
    const prompt = await assembledPrompt(GroundScenario.CRISIS_ALIGNMENT, PartyType.PARTICIPANT, {});
    expect(prompt).toContain('SCOPE BOUNDARY:');
  });

  it('BOARD_STRATEGY includes the trade-off question', async () => {
    const prompt = await assembledPrompt(GroundScenario.BOARD_STRATEGY, PartyType.INITIATOR, {});
    expect(prompt).toContain('TRADE-OFF QUESTION:');
    expect(prompt).toContain('what they would be willing to stop or sacrifice');
  });

  it('PIP includes both the support question and the success definition', async () => {
    const prompt = await assembledPrompt(GroundScenario.PIP, PartyType.PARTICIPANT, {});
    expect(prompt).toContain('SUPPORT QUESTION:');
    expect(prompt).toContain('SUCCESS DEFINITION:');
  });

  it('COHORT_CHECK pack content reaches the prompt (previously silently dropped to the empty default)', async () => {
    const prompt = await assembledPrompt(GroundScenario.COHORT_CHECK, PartyType.INITIATOR, {});
    expect(prompt).toContain('MOMENT: Cohort check-in');
    expect(prompt).toContain('BLOCKER QUESTION:');
  });

  it('OKR_ALIGNMENT, WORKPLAN_BUDGET, PULSE_CHECK, REALIGN_TEAM packs each reach the prompt', async () => {
    const okr = await assembledPrompt(GroundScenario.OKR_ALIGNMENT, PartyType.INITIATOR, {});
    expect(okr).toContain('OKR');

    const workplan = await assembledPrompt(GroundScenario.WORKPLAN_BUDGET, PartyType.INITIATOR, {});
    expect(workplan.toLowerCase()).toContain('budget');

    const pulse = await assembledPrompt(GroundScenario.PULSE_CHECK, PartyType.INITIATOR, {});
    expect(pulse.toLowerCase()).toContain('pulse');

    const realign = await assembledPrompt(GroundScenario.REALIGN_TEAM, PartyType.INITIATOR, {});
    expect(realign).toContain('TENSION QUESTION:');
  });

  it('NEW_HIRE (a "starting" scenario) carries its role-specific questions', async () => {
    const initiator = await assembledPrompt(GroundScenario.NEW_HIRE, PartyType.INITIATOR, {});
    expect(initiator).toContain('ROLE-SPECIFIC QUESTIONS - initiator');

    const participant = await assembledPrompt(GroundScenario.NEW_HIRE, PartyType.PARTICIPANT, {});
    expect(participant).toContain('ROLE-SPECIFIC QUESTIONS - participant');
  });
});

// ---------------------------------------------------------------------------
// PIP situation type mapping - the clearest mapping gap found: PIP must not
// fall to the generic 'Starting' default that a brand-new hire also gets.
// ---------------------------------------------------------------------------

describe('GW-PROMPT-WIRE-02: PIP resolves to SITUATION_TYPE Accountability', () => {
  it('PIP produces SITUATION_TYPE: Accountability, never the Starting default', async () => {
    const prompt = await assembledPrompt(GroundScenario.PIP, PartyType.PARTICIPANT, {});
    expect(prompt).toContain('SITUATION_TYPE: Accountability');
    expect(prompt).not.toContain('SITUATION_TYPE: Starting');
  });

  it('a genuine "Starting" scenario (NEW_HIRE) still gets SITUATION_TYPE: Starting, for contrast', async () => {
    const prompt = await assembledPrompt(GroundScenario.NEW_HIRE, PartyType.INITIATOR, {});
    expect(prompt).toContain('SITUATION_TYPE: Starting');
  });
});

// ---------------------------------------------------------------------------
// RECOGNITION - initiator and participant must get different framings. If a
// future change ever collapses these to one shared pack, this goes red.
// ---------------------------------------------------------------------------

describe('GW-PROMPT-WIRE-03: RECOGNITION initiator vs participant framing', () => {
  it('initiator gets the "making the ask" framing', async () => {
    const prompt = await assembledPrompt(GroundScenario.RECOGNITION, PartyType.INITIATOR, {});
    expect(prompt).toContain('Name the specific ask.');
    expect(prompt).not.toContain('Someone is about to make a case to you.');
  });

  it('participant gets the "receiving the ask" framing, not the initiator framing', async () => {
    const prompt = await assembledPrompt(GroundScenario.RECOGNITION, PartyType.PARTICIPANT, {});
    expect(prompt).toContain('Someone is about to make a case to you.');
    expect(prompt).not.toContain('Name the specific ask.');
  });

  it('the two framings are genuinely different strings', async () => {
    const initiatorPrompt = await assembledPrompt(GroundScenario.RECOGNITION, PartyType.INITIATOR, {});
    const participantPrompt = await assembledPrompt(GroundScenario.RECOGNITION, PartyType.PARTICIPANT, {});
    expect(initiatorPrompt).not.toEqual(participantPrompt);
  });
});

// ---------------------------------------------------------------------------
// Session-2: PRIOR_SESSION and RESOLUTION_STATE must survive into the prompt.
// RESOLUTION_STATE regressed once already (ground.resolutionState was never
// threaded into buildIntakeBlock's ctx at all) - this is the guard against
// that happening silently again.
// ---------------------------------------------------------------------------

describe('GW-PROMPT-WIRE-04: session-2 carries PRIOR_SESSION and real RESOLUTION_STATE', () => {
  it('a session-2 prompt contains the real RESOLUTION_STATE set on the ground, not the "not yet defined" fallback', async () => {
    const prompt = await assembledPrompt(
      GroundScenario.CRISIS_ALIGNMENT,
      PartyType.INITIATOR,
      { resolutionState: 'Escalation required' },
      { sessionNumber: 2 },
    );
    expect(prompt).toContain('RESOLUTION_STATE: Escalation required');
    expect(prompt).not.toContain('RESOLUTION_STATE: not yet defined');
  });

  it('a session-2 prompt contains PRIOR_SESSION populated from the completed session-1 record, not "first session"', async () => {
    const prompt = await assembledPrompt(
      GroundScenario.CRISIS_ALIGNMENT,
      PartyType.INITIATOR,
      {
        resolutionState: 'Escalation required',
        priorCheckIns: [{ id: 'ci-s1', sessionNumber: 1, specificityDimensions: null }],
        priorEntries: [{ type: 'WORRY', text: 'Runway is tighter than the board believes' }],
      },
      { sessionNumber: 2 },
    );
    expect(prompt).toContain('PRIOR_SESSION:');
    expect(prompt).not.toContain('PRIOR_SESSION: first session');
    expect(prompt).toContain('Runway is tighter than the board believes');
  });

  it('a session-1 prompt (no prior sessions) correctly shows the "first session" fallback and "not yet defined" when the ground truly has none set', async () => {
    const prompt = await assembledPrompt(GroundScenario.CRISIS_ALIGNMENT, PartyType.INITIATOR, { resolutionState: null });
    expect(prompt).toContain('PRIOR_SESSION: first session');
    expect(prompt).toContain('RESOLUTION_STATE: not yet defined');
  });
});
