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
    /* Isolation: session 1 references no earlier session and nothing anybody else said. The
       wording moved off "the other party" - see this-is-not-a-court.spec.ts - but the rule it
       carries is the same one, and it is the rule this line is here to hold. */
    expect(entryPrompt).toContain('Do not reference prior sessions or what anybody else said');
  });

  it('keeps the exact entry completion phrase authored in the addendum', () => {
    // this is the phrase the AI must say to end an entry session (ties to D below)
    expect(entryPrompt).toContain('Here is what you shared.');
  });

  it('FAQ mode answers plainly and states the free-first-session fact', () => {
    expect(FAQ_PROMPT).toContain('FAQ MODE');
    expect(FAQ_PROMPT).toContain('one or two plain sentences');
    // The intent is that the FAQ states plainly what costs what, so the chatbot
    // never has to improvise about money. The FACT changed: it used to tell
    // people "additional sessions are $5 each", which is a price that does not
    // exist - and the chatbot was saying it out loud to new users.
    // Updated 23 November 2026: there is no number of free check-ins; the free plan is the trial (Hafsah, 22 November).
    expect(FAQ_PROMPT).toContain('A small team gets a free trial with unlimited check-ins and reports');
    expect(FAQ_PROMPT).not.toMatch(/check-ins are free|lifts that cap/);
    expect(FAQ_PROMPT).toContain('participants are never charged at all');
    expect(FAQ_PROMPT).not.toMatch(/\$5/);
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
  const authDetects = (reply: string, lastPersonTurn = 'ok'): boolean => (svc as any).closesInOtherWords(reply, lastPersonTurn);

  /* The nine phrases are gone. Without the marker, the only other close is: the person asked to
     finish and the reply asks nothing. */
  it('the AUTH detector closes when they asked to finish and the reply asks nothing', () => {
    expect(authDetects('Speak soon.', "that's it from me")).toBe(true);
    expect(authDetects('Your report is ready now. Speak soon.', 'I need to go')).toBe(true);
  });

  it('the AUTH detector does NOT fire on a phrase, on a question, or when they did not ask to finish', () => {
    expect(authDetects('Here is what is now in your record, and the next steps.', 'the rota went out')).toBe(false);
    expect(authDetects('Your account is now on record. What will you do by Friday?', "that's it")).toBe(false);
    expect(authDetects('Thanks, that is helpful. What else should I think about?')).toBe(false);
  });

  // THE LATENT BUG (surfaced, not hidden): the ENTRY flow and the AUTH flow use different
  // phrase sets for the SAME signal. The AI's authored entry closing "Here is what you shared."
  // ends an ENTRY session but is INVISIBLE to the auth detector. If these are ever unified
  // to one source (task_35534866), this test flips red and must be updated to the unified set.
  it('SURFACES the divergence: entry completion phrases the AUTH detector fails to recognise', () => {
    const notRecognisedByAuth = ENTRY_COMPLETION_PHRASES.filter((p) => !authDetects(`AI says: ${p}`, 'the rota went out'));
    // The AUTH path no longer has a phrase list at all: every entry phrase is invisible to it unless
    // the person asked to finish. The divergence is total, and it is surfaced here on purpose.
    expect(notRecognisedByAuth).toEqual(ENTRY_COMPLETION_PHRASES);
    // and the same statement closes the moment the person has asked to finish (proves the test discriminates)
    expect(authDetects('Your account is now on record.', "that's all from me")).toBe(true);
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
    // Reworded in the plain-language pass, same rule: do not describe what
    // somebody thinks when they have not spoken yet.
    expect(SYNTHESIS_RULES).toContain('DO NOT PUT WORDS IN THE MOUTH OF SOMEONE WHO HAS NOT CHECKED IN');
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
  it('opens by saying plainly that nobody else has weighed in yet', () => {
    // Was "has not been cross-referenced with any other account yet", which is
    // how a database describes itself. The promise it pins is unchanged: a
    // one-sided report must say it is one-sided, in the first breath.
    /* The framing line lost its courtroom staging with the rest of the entry voice; what it has
       to keep saying is that this is one person's report and nobody else has answered. */
    expect(ENTRY_REPORT_PROMPT).toContain('Nobody else has checked in yet');
  });

  it('forbids claiming alignment when only one person has checked in (no false consensus, solo path)', () => {
    /* "party" went with the courtroom vocabulary; the rule is unchanged and is what matters. */
    expect(ENTRY_REPORT_PROMPT).toContain('only this person has checked in');
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
