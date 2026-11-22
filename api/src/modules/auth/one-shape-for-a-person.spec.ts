import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A FIELD THAT DECIDES WHAT SOMEBODY SEES MUST NOT BE ABLE TO GO MISSING.
 *
 * `mayOpenCheckIns` has been lost twice. Both times the cause was the same: a second place built a
 * user object beside the first, the two drifted, and the newer one lost the field. Both times the
 * client - which asks `!== false`, so a missing field reads as permission - put "Start a check-in"
 * back in front of everybody in the organisation, who clicked it and were refused by the server.
 *
 * The client keeps `!== false` deliberately: `=== true` would hide the product's main action for the
 * moment between hydration and the /auth/me refetch, which is a certain cost paid on every load
 * against an uncertain one paid rarely. See nobody-sees-a-button-that-refuses-them.spec.ts.
 *
 * So the defence belongs here instead. There is one shape, `theUserShape`, and every path that
 * hands a user back must go through it. This asserts that, rather than asserting the field appears
 * in each place - because the failure was never a typo in one branch, it was somebody writing a
 * second object by hand.
 *
 * Comments stripped: this file quotes the code it guards.
 */
const SRC = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

describe('one shape for a person', () => {
  it('the shape exists and computes the field rather than copying it', () => {
    expect(SRC).toMatch(/private theUserShape\(/);
    const start = SRC.indexOf('private theUserShape(');
    const body = SRC.slice(start, start + 900);
    /* The rule is asked once, and both the yes or no and its reason are read from that one answer. */
    expect(body).toContain('const mayOpenACheckIn = mayOpen(');
    expect(body).toContain('mayOpenCheckIns: mayOpenACheckIn.may');
    expect(body).toContain('whyYouCannotOpenCheckIns: mayOpenACheckIn.because');
    /* Computed from the rule, so it cannot disagree with what the server enforces. */
    expect(body).not.toMatch(/mayOpenCheckIns:\s*(true|false|user\.)/);
  });

  it('nothing builds a user object beside it', () => {
    /*
     * The shape of the bug, twice: an object literal with the identifying fields, assembled by hand.
     * Anything returning a user must call theUserShape instead.
     *
     * The shape's OWN body is that literal, by definition, so it is cut out before looking - a check
     * that fires on the thing it protects teaches people to delete it.
     */
    const start = SRC.indexOf('private theUserShape(');
    const outside = SRC.slice(0, start) + SRC.slice(SRC.indexOf('\n  }', start));
    const handBuilt = [...outside.matchAll(/\{\s*id:\s*user\.id,\s*email:\s*user\.email/g)];
    expect(handBuilt).toHaveLength(0);
  });

  it('every place that returns a user goes through the one shape', () => {
    const calls = [...SRC.matchAll(/theUserShape\(/g)];
    /* One definition plus a call from each path that hands a user back. */
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it('and getProfile - the one that lost it last time - is one of them', () => {
    const start = SRC.indexOf('async getProfile(');
    expect(start).toBeGreaterThan(-1);
    expect(SRC.slice(start, start + 700)).toContain('theUserShape(');
  });
});
