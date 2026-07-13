import { GroundScenario, PartyType } from '@prisma/client';
import { ENGINE_RULES, buildScenarioPackForParty } from './prompt-library';

/**
 * Behavior-preservation tripwires (GW-BEHAVIOR-*).
 *
 * This codebase has repeatedly LOST conversation behavior silently - rich scenario packs
 * disconnected by a refactor (701e2e1), BOARD/COHORT packs never wired, evidence-probing
 * thinned out of newer packs. These rules carry the product's actual voice and critical
 * thinking, and nothing tested that they stay.
 *
 * Each assertion below locks a behavior as it exists TODAY, on the real ENGINE_RULES (the
 * live 'system' prompt) or the real pack builder. If a rule is thinned, removed, or a pack
 * disconnected, the matching assertion goes RED. Source-of-truth map:
 * groundwork_local_test/BEHAVIOR_INVENTORY.md. Do NOT delete an assertion to make it pass -
 * that is the behavior vanishing.
 */

// Tranche 1: the behaviors that already proved they vanish + the core chat rules.
// name -> substrings that MUST all be present in ENGINE_RULES for the rule to be "there".
const REQUIRED_CHAT_RULES: Record<string, string[]> = {
  'DOCUMENT PROBE (is it written down)': ['DOCUMENT PROBE', 'written down'],
  'EVIDENCE DEFINITION standard':        ['EVIDENCE DEFINITION'],
  'PUSHBACK RULES':                       ['PUSHBACK RULES'],
  'WILLINGNESS GATE':                     ['WILLINGNESS GATE'],
  'HUMAN FIRST (overrides every probe)':  ['HUMAN FIRST RULE', 'overrides every probe'],
  'ACKNOWLEDGE BEFORE PROBE':             ['ACKNOWLEDGE BEFORE PROBE'],
  'GENERAL KNOWLEDGE (answer their questions)': ['GENERAL KNOWLEDGE RULE', 'answer it properly'],
  'ONE QUESTION RULE':                    ['ONE QUESTION RULE'],
  'HEALTHY SITUATION (do not manufacture tension)': ['HEALTHY SITUATION RULE'],
  'DEMONSTRATE YOU HEARD (never announce the save)': ['DEMONSTRATE YOU HEARD'],
  'EMOTIONAL DETECTION (mediator not therapist)': ['EMOTIONAL DETECTION'],
  'MULTI-CONTRIBUTOR INVITES PARALLEL':   ['PARALLEL, NEVER SEQUENTIAL'],
  'NO-EDITORIALISING':                    ['EDITORIALISING'],
  'FILLER PHRASE BAN':                    ['FILLER PHRASE BAN'],
  'NARRATION RULE (never state other side as fact first)': ['NARRATION RULE'],
  'READING RULE (offer as hypothesis, not verdict)': ['READING RULE'],
  'SURVIVABLE TRUTH PRINCIPLE':           ['survivable truth'],
  'THREE FAILURE ORIGINS diagnostic':     ['FAILURE ORIGIN'],
  'CONTRIBUTION TAXONOMY':                ['MOVEMENT', 'COORDINATION', 'ABSORPTION'],
  'RATIO RULE (acknowledge one, examine one)': ['RATIO RULE'],
  // Tone / therapy tiers (category B)
  'TONE STATES':                          ['WARM AND OPEN', 'ENCOURAGING', 'CURIOUS', 'REFRAME'],
  'TRUST CALIBRATION tiers':              ['HIGH TRUST', 'LOW TRUST', 'DECLINING ENGAGEMENT', 'DEFENSIVE'],
  'CROSS-REFERENCE framing (shared picture, not contest)': ['shared picture'],
};

describe('GW-BEHAVIOR-CHAT: check-in chat rules are present in the live system prompt', () => {
  it.each(Object.entries(REQUIRED_CHAT_RULES))(
    'ENGINE_RULES still contains: %s',
    (_name, needles) => {
      for (const needle of needles) {
        expect(ENGINE_RULES).toContain(needle);
      }
    },
  );
});

// Tranche 2: scenario-pack richness (category E). Every scenario must yield a non-empty
// pack (no silent fall to the empty default), and the rich-tier packs must keep their
// evidence/specificity orientation (the thing that got thinned out of the newer packs).
const ALL_SCENARIOS: GroundScenario[] = [
  GroundScenario.NEW_HIRE, GroundScenario.NEW_COFOUNDER, GroundScenario.NEW_ADVISOR,
  GroundScenario.NEW_PROJECT, GroundScenario.NEW_MANAGER, GroundScenario.CONTRACT_RENEWAL,
  GroundScenario.RECOGNITION, GroundScenario.DRIFT, GroundScenario.CRISIS_ALIGNMENT,
  GroundScenario.OKR_ALIGNMENT, GroundScenario.WORKPLAN_BUDGET, GroundScenario.PULSE_CHECK,
  GroundScenario.REALIGN_TEAM, GroundScenario.PIP, GroundScenario.BOARD_STRATEGY,
  GroundScenario.COHORT_CHECK,
];

describe('GW-BEHAVIOR-PACK: every scenario reaches a non-empty pack (no default-empty regression)', () => {
  it.each(ALL_SCENARIOS)('scenario %s yields a non-empty pack for both party types', (scenario) => {
    for (const party of [PartyType.INITIATOR, PartyType.PARTICIPANT]) {
      const pack = buildScenarioPackForParty(scenario, party);
      // non-empty = did not fall to the empty default (the disconnection regression)
      expect(pack.trim().length).toBeGreaterThan(40);
    }
  });
});

describe('GW-BEHAVIOR-PACK-RICH: rich-tier packs keep their evidence/specificity orientation', () => {
  it('DRIFT pushes toward evidence and specifics', () => {
    const p = buildScenarioPackForParty(GroundScenario.DRIFT, PartyType.INITIATOR);
    expect(p.toLowerCase()).toContain('specifically');
    expect(p.toLowerCase()).toContain('evidence');
  });
  it('CRISIS_ALIGNMENT names the actual situation (numbers, not vague pressure)', () => {
    const p = buildScenarioPackForParty(GroundScenario.CRISIS_ALIGNMENT, PartyType.INITIATOR);
    expect(p.toLowerCase()).toContain('situation');
  });
});
