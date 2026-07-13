import { GroundScenario } from '@prisma/client';
import { ConversationService } from './conversation.service';
import {
  buildEntrySystemPrompt,
  FAQ_PROMPT,
  ENTRY_COMPLETION_PHRASES,
  ENTRY_REPORT_PROMPT,
} from '../entry/entry.service';
import { SYNTHESIS_RULES } from '../reports/reports.service';

/**
 * Tripwires for three surfaces the check-in spec does not cover (BEHAVIOR_INVENTORY.md C/D/G):
 *   C  entry-chat rules (the anonymous flow)         - asserted on the ASSEMBLED entry prompt
 *   D  end-session detection                          - asserted on the REAL detectors
 *   G  report-synthesis voice                         - asserted on the REAL synthesis rules
 * Each is proven to bite (remove the rule -> red). Do NOT weaken an assertion to make it pass.
 */

// ---------------------------------------------------------------------------
// C. ENTRY-CHAT RULES - buildEntrySystemPrompt assembles the real anonymous-flow prompt
//    (ENGINE_RULES + scenario pack + runtime ctx + ENTRY_SESSION_ADDENDUM).
// ---------------------------------------------------------------------------
describe('GW-BEHAVIOR-ENTRY-C: the assembled entry prompt carries the entry rules', () => {
  const entryPrompt = buildEntrySystemPrompt(GroundScenario.NEW_PROJECT, 'Launch alignment');

  it('wires the core ENGINE_RULES into the entry flow (not a stripped-down prompt)', () => {
    expect(entryPrompt).toContain('HUMAN FIRST RULE');
    expect(entryPrompt).toContain('DOCUMENT PROBE');
  });

  it('carries the ENTRY_SESSION_ADDENDUM: record-builder, first session, no prior/other-party leak', () => {
    expect(entryPrompt).toContain('Entry session context');
    expect(entryPrompt).toContain('This is the person\'s first session.');
    // isolation: never reference prior sessions or the other party in session 1
    expect(entryPrompt).toContain('Do not reference prior sessions or the other party');
  });

  it('keeps the exact entry completion phrase authored in the addendum', () => {
    // this is the phrase the AI must say to end an entry session (ties to D below)
    expect(entryPrompt).toContain('Your record is here.');
  });

  it('FAQ mode answers plainly and states the free-first-session fact', () => {
    expect(FAQ_PROMPT).toContain('FAQ MODE');
    expect(FAQ_PROMPT).toContain('one or two plain sentences');
    expect(FAQ_PROMPT).toContain('The first session on each ground is free.');
  });
});

// ---------------------------------------------------------------------------
// D. END-SESSION DETECTION - the REAL detectors, and the tripwire SURFACES the
//    inconsistency between them (see BEHAVIOR_INVENTORY.md D / task_35534866).
// ---------------------------------------------------------------------------
describe('GW-BEHAVIOR-END-D: end-detection is locked AND its cross-path inconsistency is surfaced', () => {
  // The auth detector is a private method with no deps - call it directly.
  const svc = new ConversationService(
    undefined as any, undefined as any, undefined as any, undefined as any, undefined as any,
    undefined as any, undefined as any, undefined as any, undefined as any, undefined as any,
  );
  const authDetects = (reply: string): boolean => (svc as any).detectSessionComplete(reply);

  it('the AUTH detector recognises its own completion phrasings', () => {
    expect(authDetects('Here is what is now in your record, and the next steps.')).toBe(true);
    expect(authDetects('Your account is now on record.')).toBe(true);
  });

  it('the AUTH detector does NOT fire on ordinary conversation', () => {
    expect(authDetects('Thanks, that is helpful. What else should I think about?')).toBe(false);
    expect(authDetects('Okay, goodbye for now.')).toBe(false);
  });

  // THE LATENT BUG (surfaced, not hidden): the ENTRY flow and the AUTH flow use different
  // phrase sets for the SAME signal. The AI's authored entry closing "Your record is here."
  // ends an ENTRY session but is INVISIBLE to the auth detector. If these are ever unified
  // to one source (task_35534866), this test flips red and must be updated to the unified set.
  it('SURFACES the divergence: entry completion phrases the AUTH detector fails to recognise', () => {
    const notRecognisedByAuth = ENTRY_COMPLETION_PHRASES.filter((p) => !authDetects(`AI says: ${p}`));
    // Today the two lists overlap on only 'your account is now on record'; the rest diverge.
    expect(notRecognisedByAuth).toEqual(expect.arrayContaining([
      'your record is here',
      '[session complete]',
    ]));
    // and the one point of agreement is genuinely shared (proves the test discriminates)
    expect(authDetects('Your account is now on record.')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// G. REPORT-SYNTHESIS VOICE - the hard SYNTHESIS RULES that override the base prompt.
// ---------------------------------------------------------------------------
describe('GW-BEHAVIOR-REPORT-G: the synthesis rules carry the report voice', () => {
  it('the load-bearing anti-failure rules are all present', () => {
    // the four failure modes the rules exist to prevent + the longitudinal promise
    expect(SYNTHESIS_RULES).toContain('PRESERVE SPECIFICS VERBATIM');
    expect(SYNTHESIS_RULES).toContain('NO FALSE CONSENSUS');
    expect(SYNTHESIS_RULES).toContain('DO NOT ATTRIBUTE POSITIONS TO ABSENT PARTIES');
    expect(SYNTHESIS_RULES).toContain('CROSS-REFERENCE SESSIONS');
    expect(SYNTHESIS_RULES).toContain('SURFACE HIDDEN CONTRIBUTORS');
    expect(SYNTHESIS_RULES).toContain('NEVER INVENT PARTY COUNTS OR ROLES');
    expect(SYNTHESIS_RULES).toContain('LEAD-SUPPLIED CONTEXT IS DIRECTION');
  });

  it('all thirteen numbered rules are present (none silently dropped)', () => {
    for (let n = 1; n <= 13; n++) {
      expect(SYNTHESIS_RULES).toContain(`${n}. `);
    }
  });

  it('the rules assert their override precedence over the base prompt', () => {
    expect(SYNTHESIS_RULES).toContain('override all other instructions');
  });
});

// ---------------------------------------------------------------------------
// G (entry side). The session-1 (one-sided) report must reflect reality, not assertion:
// no alignment claimed when only one party has spoken; no invented specifics; no verdicts.
// This is the canonical "a report that reflects reality, not assertion" on the solo path.
// ---------------------------------------------------------------------------
describe('GW-BEHAVIOR-ENTRY-REPORT-G: the one-sided entry report reflects reality, not assertion', () => {
  it('opens by stating the record is NOT yet cross-referenced with any other account', () => {
    expect(ENTRY_REPORT_PROMPT).toContain('has not been cross-referenced with any other account yet');
  });

  it('forbids claiming alignment when only one party has checked in (no false consensus, solo path)', () => {
    expect(ENTRY_REPORT_PROMPT).toContain('only ONE party has checked in');
    expect(ENTRY_REPORT_PROMPT).toContain('Do NOT use the word "Aligned"');
  });

  it('forbids inventing specifics the person did not state (anti-hallucination)', () => {
    expect(ENTRY_REPORT_PROMPT).toContain('Do not invent');
    expect(ENTRY_REPORT_PROMPT).toContain('Never introduce a timeframe, date, number');
  });

  it('bans verdicts and judgements of people', () => {
    expect(ENTRY_REPORT_PROMPT).toContain('No verdicts');
  });
});
