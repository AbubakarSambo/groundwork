import { GroundScenario, PartyType } from '@prisma/client';
import { PLAIN_WORDS, SPOKEN_TO_THE_READER } from './plain-words';
import {
  buildIntakeBlock, ENGINE_RULES, FAILING_RELATIONSHIP_PROTOCOL, RECALL_SESSION_PROTOCOL,
} from './prompt-library';

/*
 * Both protocols sat inside ENGINE_RULES, so every person in every check-in carried all 1,212
 * words of them on every turn - and both name their own condition in prose. "Run this when the
 * relationship is drifted" and "a recall session fires when GROUND_SESSION_MODE: recall appears"
 * are not judgements: they are `relationshipHistory` and `sessionMode`, two fields the product has
 * read for its whole life. The intake block was already pushing the LABEL for each.
 *
 * Nothing is cut. The words are the same. What changed is who gets them.
 */
const block = (over: Record<string, unknown> = {}) =>
  buildIntakeBlock({
    scenario: GroundScenario.OKR_ALIGNMENT,
    partyType: PartyType.INITIATOR,
    sessionNumber: 1,
    totalSessions: 4,
    ...over,
  } as never);

describe('a protocol reaches the conversation it was written for, and no others', () => {
  it('an ordinary check-in carries neither', () => {
    const ordinary = block();
    expect(ordinary).not.toContain(FAILING_RELATIONSHIP_PROTOCOL);
    expect(ordinary).not.toContain(RECALL_SESSION_PROTOCOL);
  });

  it('a drifted relationship gets the failing-relationship protocol, in full', () => {
    expect(block({ relationshipHistory: 'drifted' })).toContain(FAILING_RELATIONSHIP_PROTOCOL);
  });

  it('a recall session gets the recall protocol, in full', () => {
    expect(block({ sessionMode: 'recall' })).toContain(RECALL_SESSION_PROTOCOL);
  });

  it('and neither leaks into the other', () => {
    expect(block({ relationshipHistory: 'drifted' })).not.toContain(RECALL_SESSION_PROTOCOL);
    expect(block({ sessionMode: 'recall' })).not.toContain(FAILING_RELATIONSHIP_PROTOCOL);
  });

  it('their bodies are out of the block everybody carries', () => {
    expect(ENGINE_RULES).not.toContain(FAILING_RELATIONSHIP_PROTOCOL);
    expect(ENGINE_RULES).not.toContain(RECALL_SESSION_PROTOCOL);
    expect(ENGINE_RULES).not.toMatch(/I have no interest in a verdict/);
    expect(ENGINE_RULES).not.toMatch(/Never treat a confident recall as stronger/);
  });

  it('but the field documentation still points at them, which is not the same thing', () => {
    /*
     * "RELATIONSHIP_HISTORY = drifted -> run FAILING RELATIONSHIP PROTOCOL" stays. It is one line
     * telling the model what a field means, and the protocol itself now arrives with that field.
     * A first version of this spec banned the NAME and failed on the documentation, which would
     * have been the wrong thing to delete.
     */
    expect(ENGINE_RULES).toMatch(/RELATIONSHIP_HISTORY = drifted . run FAILING RELATIONSHIP PROTOCOL/);
    expect(ENGINE_RULES).toMatch(/SESSION_MODE = recall . run RECALL SESSION PROTOCOL/);
  });

  it('the words themselves are unchanged, which is the point', () => {
    expect(FAILING_RELATIONSHIP_PROTOCOL).toMatch(/I have no interest in a verdict/);
    expect(FAILING_RELATIONSHIP_PROTOCOL).toMatch(/Never like you are building a case against someone/);
    expect(RECALL_SESSION_PROTOCOL).toMatch(/Never treat a confident recall as stronger than a less confident one/);
    expect(RECALL_SESSION_PROTOCOL).toMatch(/their account is their account/);
  });

  it('and the label still goes with them, so nothing downstream that reads it breaks', () => {
    expect(block({ relationshipHistory: 'drifted' })).toContain('PROTOCOL: FAILING_RELATIONSHIP');
    expect(block({ sessionMode: 'recall' })).toContain('PROTOCOL: RECALL_SESSION');
  });

  /*
   * THE CEILING MOVED ONCE, ON 26 SEPTEMBER 2026, AND HERE IS WHY.
   *
   * What this test is for is that the two protocols were lifted OUT of the everybody-prompt and are
   * now fed only to the conversation each was written for. The ceiling is how that is held: pasting
   * either one back in would push the prompt over it.
   *
   * The one wording rulebook then went in - `PLAIN_WORDS` and `SPOKEN_TO_THE_READER`, imported from
   * plain-words.ts, about 2,500 characters - and the prompt went to 117,169. That is the rulebook
   * arriving, not a protocol coming back, so the ceiling moves by the rulebook and no further. The
   * two protocols are over 7,000 characters between them, so the headroom here is still less than
   * either of them.
   */
  it('the everybody-prompt is smaller by the two of them', () => {
    expect(FAILING_RELATIONSHIP_PROTOCOL.length + RECALL_SESSION_PROTOCOL.length).toBeGreaterThan(7000);
    expect(ENGINE_RULES.length).toBeLessThan(118000);
  });

  /* And the rulebook is in it, imported rather than retyped, which is the reason it grew. */
  it('carries the one wording rulebook, both halves of it', () => {
    expect(ENGINE_RULES).toContain(PLAIN_WORDS);
    expect(ENGINE_RULES).toContain(SPOKEN_TO_THE_READER);
    expect(ENGINE_RULES).toContain('Never write "vs." or "vs"');
  });
});
