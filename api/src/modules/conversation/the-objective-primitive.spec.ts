import * as fs from 'fs';
import * as path from 'path';
import { buildIntakeBlock, EXPECTATION_SCHEMA, EXPECTATION_PROMPT } from './prompt-library';

/**
 * WHAT KIND OF THING SOMEBODY IS BEING HELD TO, AND HOW ANYBODY WOULD KNOW.
 *
 * An expectation used to be one untyped sentence. Teams do not have one shape - a to-do, a
 * commitment somebody is waiting on, a number crossing a line, a standing role expectation and a
 * ticket settled in Jira are all real things people are held to, and they are checked in completely
 * different ways. Held as one sentence, a session cannot press on any of them properly.
 *
 * ONE PRIMITIVE, NOT SEVEN FEATURES. Every one of them answers the same four questions - whose is
 * it, what is wanted, how would we know, by when - and a KIND is a familiar name for a common
 * pairing of the last two.
 *
 * OKR IS DELIBERATELY NOT A KIND. It is a goal with several targets hanging under it: a parent and
 * children, not a ninth thing. Building it as its own object would give a target a second place to
 * live, which is the failure this product exists to end.
 */
const SERVICE = fs
  .readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const EXTRACT = (() => {
  const from = SERVICE.indexOf('private async readTheAimsAndExpectations(');
  expect(from).toBeGreaterThan(-1);
  const to = SERVICE.indexOf('\n  async ', from + 10);
  expect(to).toBeGreaterThan(from);
  return SERVICE.slice(from, to);
})();

describe('the objective primitive', () => {
  it('the extractor is asked for all four parts of it', () => {
    const props = (EXPECTATION_SCHEMA as any).input_schema.properties.expectations.items;
    for (const field of ['kind', 'check', 'dueKind', 'dueSaid', 'owedTo']) {
      expect(Object.keys(props.properties)).toContain(field);
    }
    /** Required, so a model cannot quietly decline to type one. */
    for (const field of ['kind', 'check', 'dueKind']) {
      expect(props.required).toContain(field);
    }
  });

  it('and OKR is not one of the kinds', () => {
    const kinds = (EXPECTATION_SCHEMA as any).input_schema.properties.expectations.items.properties.kind.enum;
    expect(kinds).not.toContain('OKR');
    expect(kinds).toEqual(
      expect.arrayContaining(['TODO', 'COMMITMENT', 'TARGET', 'GOAL', 'SUCCESS_DEFINITION', 'ROLE_EXPECTATION', 'REFERENCE']),
    );
  });

  /**
   * THE VALUE THE WHOLE REDESIGN TURNS ON. A model that avoids NOT_CHECKABLE out of helpfulness
   * puts an unmeasurable sentence on somebody's record looking like a target they failed, and the
   * interview never learns it needs to ask how anybody would know.
   */
  it('the prompt says outright that "not checkable" is not a failure', () => {
    expect(EXPECTATION_PROMPT).toMatch(/NOT_CHECKABLE IS NOT A FAILURE AND MUST NOT BE AVOIDED/);
    expect(EXPECTATION_PROMPT).toMatch(/how anybody would know/i);
  });

  /** Two rules that came out of typing real sentences into the prototype. */
  it('and the two shape rules the prototype found', () => {
    expect(EXPECTATION_PROMPT).toMatch(/A DEADLINE MEANS IT IS NOT A GOAL/);
    expect(EXPECTATION_PROMPT).toMatch(/TWO PEOPLE AND A DATE IS A COMMITMENT/);
  });

  describe('what is written down', () => {
    /**
     * WRITTEN ONCE, USED BY BOTH PATHS. This used to count each field twice - once in the `create`
     * half of an upsert and once in the `update` half - which is two copies of one list that have to
     * agree. They are now one `shared` object spread into both, so the fields cannot drift apart, and
     * counting occurrences would have failed on the better version.
     */
    it('every part of the primitive is persisted, and from one list', () => {
      const shared = EXTRACT.slice(EXTRACT.indexOf('const shared = {'), EXTRACT.indexOf('if (prior)'));
      for (const field of ['kind', 'check', 'dueKind', 'dueSaid', 'owedToParticipantId']) {
        expect(shared).toContain(field);
      }
      expect(EXTRACT).toMatch(/update\(\{[\s\S]{0,120}\.\.\.shared/);
      expect(EXTRACT).toMatch(/create\(\{[\s\S]{0,120}\.\.\.shared/);
    });

    /**
     * A PERSON CAN BE HELD TO MORE THAN ONE THING. The row was unique per person, so a lead stating a
     * commitment and a standing role expectation about the same person stored one and dropped the
     * other silently. Same person, same kind is a revision; a different kind is its own row.
     */
    it('and a second kind for the same person is a new row, not an overwrite', () => {
      expect(EXTRACT).toMatch(/findFirst\(\{\s*where: \{ groundId, participantId: target, kind \}/);
    });

    /**
     * A VALUE OUTSIDE THE SET FALLS TO THE ONE THAT ADMITS IGNORANCE. An unknown kind is not a
     * to-do, and an unknown check is NOT_CHECKABLE - defaulting the other way would let a junk
     * value become a target somebody is then read against.
     */
    it('and a junk value falls to the honest answer, not a convenient one', () => {
      expect(EXTRACT).toContain("KINDS.includes(e.kind ?? '') ? (e.kind as any) : null");
      expect(EXTRACT).toContain("CHECKS.includes(e.check ?? '') ? (e.check as any) : 'NOT_CHECKABLE'");
      expect(EXTRACT).toContain("DUES.includes(e.dueKind ?? '') ? (e.dueKind as any) : 'NOT_SAID'");
    });

    /**
     * A commitment pointing at somebody who is not in this check-in would put a handoff on a page
     * belonging to nobody. Resolved against the roster like any other name, and dropped if it does
     * not resolve - the same rule the person's own name follows.
     */
    it('and who it is owed to is resolved, never guessed', () => {
      expect(EXTRACT).toMatch(/owedTo = kind === 'COMMITMENT' && e\.owedTo \? resolve\(e\.owedTo\) : null/);
    });
  });
});
