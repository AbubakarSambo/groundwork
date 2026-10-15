import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { ReportsService } from '../reports/reports.service';

/**
 * Live-conversation trust boundary tripwire (GW-PATTERN-PROBE-NOT-STATEMENT).
 *
 * The rule is STATEMENT vs PROBE, not live vs report:
 * - A detected pattern is NEVER stated to the person in the live conversation
 *   as an observation or verdict (raw observationText must never appear).
 * - A detected pattern MAY sharpen a follow-up QUESTION - the same shape the
 *   INVISIBLE_LABOUR cross-reference already uses. The person hears a better
 *   question, never the detected pattern or its verdict-style phrasing.
 * - The raw, named observation still goes to the report (Option B,
 *   reports.service.ts), where naming a concern is appropriate and
 *   tone-controlled by SYNTHESIS RULE 9.
 *
 * These tests assert against the literal assembled strings on both sides -
 * live prompt and report corpus - for the same underlying detection, so this
 * boundary can never silently blur back into "state the pattern live" again.
 */

const D1_OBSERVATION = 'The record describes completion without downstream confirmation.';
const D1_PROBE = 'Has the team depending on this confirmed it works for them?';
/*
 * A CODE THAT GENUINELY HAS NO SAFE QUESTION FORM.
 *
 * This used K1 - Sales Documentation Avoidance - as its probe-less example. K1 has a probe now:
 * thirteen of the thirty-eight patterns had none, including the two that actually fired on a real
 * twelve-session cohort, so a lead read an observation on the board with nothing to do about it.
 *
 * The RULE this file protects is unchanged and still needs an example: a code with no authored
 * probe must produce no live output at all rather than being forced into one. F5 is the permanent
 * case - its `probe` string is a routing instruction ("Surface to alignment feed only. Never name
 * to either person directly."), which is exactly why the map is an allowlist.
 */
const F5_OBSERVATION = 'One cofounder absorbs the operational load while the other narrates strategy.';

function makeConversationPrisma(patternRows: { code: string }[]) {
  /* Decision 57, item 8 (30 September 2026): status alone is not three periods, so these fixtures
     - which stand in for already-SURFACED rows - now carry an honest periodsObserved of 3, the
     floor `hasBeenSeenInThreePeriods` checks. The test's own subject (statement vs probe routing)
     is unchanged. */
  const withPeriods = patternRows.map((r) => ({ periodsObserved: 3, ...r }));
  return {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', scenario: GroundScenario.NEW_PROJECT, label: 'Test', initiatorId: 'init-1', resolutionState: null, brief: null })) },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 1,
        status: CheckInStatus.IN_PROGRESS, isClarification: false, clarificationTarget: null,
        isSelfCorrection: false, selfCorrectionTargetSession: null,
        participant: { id: 'p1', userId: 'user-1', groundId: 'g1', partyType: PartyType.INITIATOR, roleAsDescribed: null },
      })),
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      update: jest.fn(async () => ({})),
    },
    // Nobody in these specs has written a between-session note; the session build
    // reads the table regardless, so it has to answer.
    participantNote: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    // Same reason: the session build reads what somebody says they delivered whether or not
    // this spec is about that, so the table has to answer.
    delivery: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    conversationTurn: {
      count: jest.fn(async () => 0),
      create: jest.fn(async (args: any) => ({ id: 't1', content: args.data.content })),
      findMany: jest.fn(async () => []),
      delete: jest.fn(async () => ({})),
    },
    workMention: { findMany: jest.fn(async () => []) },
    recordEntry: {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
    },
    groundParticipant: {
      count: jest.fn(async () => 2),
      findUnique: jest.fn(async () => ({ specificityHistory: [] })),
      update: jest.fn(async () => ({})),
      findMany: jest.fn(async () => []),
    },
    adminProfile: { findUnique: jest.fn(async () => null) },
    leadContextNote: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
    patternDetection: {
      findMany: jest.fn(async () => withPeriods),
      count: jest.fn(async () => 0),
    },
  };
}

async function captureLivePrompt(patternRows: { code: string }[]): Promise<string> {
  const prisma: any = makeConversationPrisma(patternRows);
  const captured: string[] = [];
  const anthropic: any = { respond: jest.fn(async (sys: string) => { captured.push(sys); return 'ok'; }) };
  const context = new ConversationContextService(prisma);
  const prompts: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : Promise.reject())) };
  const service = new ConversationService(prisma, prompts, anthropic, context, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any);
  await service.sendMessage('ci1', 'user-1', 'We shipped the migration.');
  return captured[0];
}

describe('GW-PATTERN-PROBE-NOT-STATEMENT: patterns sharpen questions live, never state conclusions', () => {
  it('proof: D1 (has a probe) sharpens a question live; the report separately names the observation', async () => {
    const livePrompt = await captureLivePrompt([{ code: 'D1' }]);

    // eslint-disable-next-line no-console
    console.log('\n===== LIVE CONVERSATION PROMPT (proof) =====\n' + livePrompt + '\n===== END LIVE PROMPT =====\n');

    expect(livePrompt).toContain('# Sharpen these questions');
    expect(livePrompt).toContain(D1_PROBE);
    expect(livePrompt).not.toContain(D1_OBSERVATION);
    expect(livePrompt).not.toContain('Patterns established across prior periods');
    expect(livePrompt).not.toContain('D1');
    expect(livePrompt).not.toContain('False Completion Reporting');

    // Report side: the same underlying detection, reused via the Option B path.
    const reportPrisma: any = {
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', scenario: 'NEW_PROJECT', initiatorId: 'init-1', resolutionState: null, brief: null })) },
      adminProfile: { findUnique: jest.fn(async () => null) },
    leadContextNote: { findMany: jest.fn(async () => []) },
      groundParticipant: {
        findMany: jest.fn(async (args: any) => {
          if (args.select?.checkIns) return [{ id: 'p1', partyType: 'INITIATOR', checkIns: [] }];
          return [{ id: 'p1', partyType: 'INITIATOR', roleAsDescribed: 'founder' }];
        }),
        findFirst: jest.fn(async () => null),
      },
      workMention: { findMany: jest.fn(async () => []) },
      recordEntry: {
        findMany: jest.fn(async (args: any) => {
          if (args.include?.participant) return [{ participant: { id: 'p1' }, checkIn: { sessionNumber: 1 }, text: 'We shipped the migration.', type: 'CHECK_IN' }];
          return [];
        }),
      },
      checkIn: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), count: jest.fn(async () => 1) },
      groundDocument: { groupBy: jest.fn(async () => []), count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
      patternDetection: { findMany: jest.fn(async () => [{ participantId: 'p1', code: 'D1', observationText: D1_OBSERVATION }]) },
      // findUnique: synthesize reads prior engagement back so the private
      // post-report guides survive a re-synthesis. No prior report here.
      report: { findUnique: jest.fn(async () => null), upsert: jest.fn(async (args: any) => ({ id: 'r1', ...args.create })) },
    };
    const reportPrompts: any = { getActive: jest.fn(async () => ({ id: 'pv-1', content: 'base synthesis prompt.' })) };
    /*
     * THE SYNTHESIS CALL, PICKED OUT RATHER THAN ASSUMED. (26 September 2026.)
     *
     * This kept whichever `extract` ran last, which was fine while synthesis was the only one.
     * Once the room judgement stopped returning early on a ground with no frame, a second call
     * ran after it and this held the JUDGEMENT's material - so the assertion below, which is about
     * what reaches the report, was reading a different prompt entirely and went red over the
     * judgement being handed a pattern it is designed to be handed.
     *
     * What the assertion is about is unchanged: the report's corpus must not carry the observation.
     */
    let reportCorpus = '';
    const reportAnthropic: any = {
      extract: jest.fn(async (sys: string, messages: { content: string }[]) => {
        if (!String(sys ?? '').includes('You are writing the judgement over a check-in')) reportCorpus = messages[0].content;
        return { sharedPicture: '', agreements: [], divergences: [], centralQuestion: '', concernFlags: [{ label: 'founder', observation: 'Completion was claimed without downstream confirmation.' }] };
      }),
    };
    const reportsService = new ReportsService(reportPrisma, reportPrompts, reportAnthropic, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { get: () => undefined } as any, { tell: async () => [] } as any);
    const report = await reportsService.synthesize('g1');

    // eslint-disable-next-line no-console
    console.log('===== REPORT CORPUS (proof) =====\n' + reportCorpus + '\n===== END REPORT CORPUS =====\n');
    // eslint-disable-next-line no-console
    console.log('===== FINAL REPORT concernFlags (proof) =====\n' + JSON.stringify((report as any).engagement.concernFlags, null, 2) + '\n===== END =====\n');

    /*
     * THE REPORT ROUTE MOVED. This asserted the observation reached the synthesis corpus as a note
     * telling the model to put it in concernFlags "if the record corroborates". That route is gone:
     * a finding handed to a model as a suggestion is not a finding on the page, and when the model
     * complied the same fact could reach the reader twice and disagree. Surfaced detections render
     * as their own section in `sessionReport` now (a-pattern-is-a-section-not-a-suggestion.spec).
     * What still holds here is the half about the LIVE prompt, below: probes sharpen questions and
     * never state conclusions.
     */
    expect(reportCorpus).not.toContain(D1_OBSERVATION);
    expect(reportCorpus).not.toContain('note it in concernFlags');
    expect((report as any).engagement.concernFlags).toEqual([
      { label: 'founder', observation: 'Completion was claimed without downstream confirmation.' },
    ]);
  });

  it('guard: a surfaced code with no authored probe (F5) produces no live output at all - report-only, not forced', async () => {
    const livePrompt = await captureLivePrompt([{ code: 'F5' }]);
    expect(livePrompt).not.toContain('# Sharpen these questions');
    expect(livePrompt).not.toContain(F5_OBSERVATION);
    expect(livePrompt).not.toContain('F5');
  });

  it('guard: multiple surfaced codes together - only the ones with a probe appear, in probe form, never as observations', async () => {
    const livePrompt = await captureLivePrompt([{ code: 'D1' }, { code: 'K1' }, { code: 'B4' }]);
    expect(livePrompt).toContain(D1_PROBE);
    expect(livePrompt).toContain('What happened when you were not available to intervene?'); // B4's authored probe
    expect(livePrompt).not.toContain(F5_OBSERVATION);
    expect(livePrompt).not.toContain('F5');
    // No verdict-style code names anywhere in the live prompt.
    expect(livePrompt).not.toMatch(/\bB4\b/);
    expect(livePrompt).not.toMatch(/\bD1\b/);
  });

  it('guard: ALIGNMENT_FEED_ONLY_CODES never produce a live probe either, even though F5 has a probe-shaped string', async () => {
    const livePrompt = await captureLivePrompt([{ code: 'F5' }, { code: 'E4' }]);
    expect(livePrompt).not.toContain('Sharpen these questions');
    expect(livePrompt).not.toContain('Surface to alignment feed only');
    expect(livePrompt).not.toContain('F5');
    expect(livePrompt).not.toContain('E4');
  });
});
