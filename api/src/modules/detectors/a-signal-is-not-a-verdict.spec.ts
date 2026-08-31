import { findUndeclaredDependencies, sayIt, MENTIONS_BEFORE_ITS_A_PATTERN } from './nobody-wrote-the-dependency-down';
import { ALIASES, GENUINELY_NEW, SPEC_KEYS, IMPLEMENTED, NEEDS_ROLES, isImplemented } from './one-vocabulary-two-scopes';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * NO OKR TOOL CAN PRODUCE THIS, because seeing it needs both the graph and the conversations.
 *
 * Their tool knows what is written down. Groundwork hears somebody who owns one objective talking
 * about another they do not own, repeatedly, with no link recorded between the two.
 */
const at = (d: number) => new Date(Date.UTC(2026, 8, d));
const subject = (over: Partial<Parameters<typeof findUndeclaredDependencies>[0][0]>) => ({
  externalId: 'S', title: 'S', ownerExternalId: null, contributorExternalIds: [], parentExternalId: null, ...over,
});
const mine = subject({ externalId: 'OKR-A', title: 'Reduce onboarding time', ownerExternalId: 'u-naomi' });
const theirs = subject({ externalId: 'OKR-B', title: 'Rebuild the billing service', ownerExternalId: 'u-tom' });
const mention = (n: number, subj = 'OKR-B', who = 'u-naomi') =>
  Array.from({ length: n }, (_, i) => ({ personExternalId: who, subjectExternalId: subj, at: at(i + 1) }));

describe('a dependency nobody wrote down', () => {
  it('is found when somebody keeps raising work they do not own', () => {
    const [d] = findUndeclaredDependencies([mine, theirs], mention(4));
    expect(d).toMatchObject({
      personExternalId: 'u-naomi', fromSubjectExternalId: 'OKR-A', toSubjectExternalId: 'OKR-B', mentions: 4,
    });
  });

  it('SAID ONCE IS A CONVERSATION, not a pattern', () => {
    /* The difference between the two is repetition, and it is a checkable fact rather than an
       inference about what somebody meant. */
    expect(findUndeclaredDependencies([mine, theirs], mention(MENTIONS_BEFORE_ITS_A_PATTERN - 1))).toEqual([]);
    expect(findUndeclaredDependencies([mine, theirs], mention(MENTIONS_BEFORE_ITS_A_PATTERN))).toHaveLength(1);
  });

  it('says nothing when the link is already recorded', () => {
    /*
     * Telling a customer something their own tool already says is how a findings list becomes noise
     * nobody reads. A link in either direction counts.
     */
    const child = { ...mine, parentExternalId: 'OKR-B' };
    expect(findUndeclaredDependencies([child, theirs], mention(5))).toEqual([]);
    const parent = { ...theirs, parentExternalId: 'OKR-A' };
    expect(findUndeclaredDependencies([mine, parent], mention(5))).toEqual([]);
  });

  it('says nothing when they are on it anyway', () => {
    /* Somebody listed as a contributor is MEANT to be talking about it - that is the arrangement
       working, and flagging it would train people to ignore the findings. */
    const withHer = { ...theirs, contributorExternalIds: ['u-naomi'] };
    expect(findUndeclaredDependencies([mine, withHer], mention(9))).toEqual([]);
    const hers = { ...theirs, ownerExternalId: 'u-naomi' };
    expect(findUndeclaredDependencies([mine, hers], mention(9))).toEqual([]);
  });

  it('says nothing about somebody who owns nothing', () => {
    /* There is no dependency without two ends, and "she talks about it a lot" on its own is not a
       finding about the work. */
    expect(findUndeclaredDependencies([theirs], mention(9))).toEqual([]);
  });

  it('counts per pair rather than per person', () => {
    /* Three mentions of one thing and three of another is two patterns; six mentions spread across
       six objectives is somebody doing their job. */
    const c = subject({ externalId: 'OKR-C', ownerExternalId: 'u-tom', title: 'C' });
    const spread = [...mention(2, 'OKR-B'), ...mention(2, 'OKR-C')];
    expect(findUndeclaredDependencies([mine, theirs, c], spread)).toEqual([]);
  });

  it('puts the strongest signal first', () => {
    const c = subject({ externalId: 'OKR-C', ownerExternalId: 'u-tom', title: 'C' });
    const found = findUndeclaredDependencies([mine, theirs, c], [...mention(3, 'OKR-B'), ...mention(7, 'OKR-C')]);
    expect(found.map((d) => d.toSubjectExternalId)).toEqual(['OKR-C', 'OKR-B']);
  });

  it('asks rather than concluding, and names both ends', () => {
    /*
     * A SIGNAL, NOT A VERDICT. It is a reason to ask "is this blocking you", and the answer is
     * frequently no - so the wording has to leave room for that.
     */
    const [d] = findUndeclaredDependencies([mine, theirs], mention(4));
    const line = sayIt(d, (id) => (id === 'OKR-A' ? 'Reduce onboarding time' : 'Rebuild the billing service'));
    expect(line).toContain('Reduce onboarding time');
    expect(line).toContain('Rebuild the billing service');
    expect(line).toMatch(/may depend|worth saying/i);
    for (const verdict of ['failing', 'blocked by', 'at fault', 'should have']) {
      expect(line.toLowerCase()).not.toContain(verdict);
    }
  });
});

describe('one vocabulary, two scopes', () => {
  /* Comments stripped: this file quotes code inside its explanations, and a scanner that counts
     prose is a guard a comment can satisfy. */
  /* Comments stripped: this repository quotes code inside its explanations, and a scanner that
     counts prose is a guard a comment can satisfy. */
  const LIB = readFileSync(join(__dirname, '../patterns/pattern-library.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const existingCodes = new Set([...LIB.matchAll(/code: '([A-Z0-9_]+)'/g)].map((m) => m[1]));

  it('every alias points at a code that actually exists', () => {
    /* An alias onto a code nobody wrote would be a rename dressed as a reconciliation. */
    for (const [key, code] of Object.entries(ALIASES)) {
      expect(existingCodes.has(code)).toBe(true);
    }
  });

  it('every spec key is either aliased, genuinely new, or explicitly parked', () => {
    /*
     * The point of the reconciliation: no key may be quietly unaccounted for. Building the spec's
     * list beside the existing thirty-eight is the failure its own §2.0 warns about - two sets of
     * detectors disagreeing about the same person inside a month.
     */
    for (const key of SPEC_KEYS) {
      const accounted = key in ALIASES
        || (GENUINELY_NEW as readonly string[]).includes(key)
        || (NEEDS_ROLES as readonly string[]).includes(key);
      expect(accounted).toBe(true);
    }
  });

  it('no key is both aliased and new', () => {
    for (const key of GENUINELY_NEW) expect(ALIASES[key]).toBeUndefined();
  });

  it('never claims a detector that is not in the vocabulary', () => {
    /*
     * Same reasoning as only offering webhook events that can fire: a customer asking why they have
     * seen no goal_divergence deserves "it is not built yet" rather than silence.
     *
     * This used to assert IMPLEMENTED was SHORTER than GENUINELY_NEW, which was true when written
     * and stopped being true the moment the last three landed. The direction that always holds is
     * that it is a SUBSET - nothing may be claimed as built that the vocabulary does not name, and
     * a list that is briefly complete is not a failure.
     */
    for (const key of IMPLEMENTED) {
      expect(GENUINELY_NEW).toContain(key);
    }
    expect(isImplemented('undeclared_dependency')).toBe(true);
    expect(isImplemented('goal_divergence')).toBe(true);
    expect(isImplemented('unrecognised_contributor')).toBe(true);
    expect(isImplemented('unowned_gap')).toBe(true);

    /*
     * These three used to be asserted as unbuilt, on a comment saying they needed a role model or an
     * onboarding window. `no_lead` needed neither - it reads `managerExternalId`, which SCIM has
     * written since the day it landed - and the other two needed less than claimed. The comment
     * outlived its own reason, exactly as "there are no blockers in this product" did.
     */
    expect(isImplemented('unattached_work')).toBe(true);
    expect(isImplemented('no_lead')).toBe(true);
    expect(isImplemented('no_checkin')).toBe(true);
  });

  it('and the one that was blocked on machinery says so no longer, because the machinery exists', () => {
    /*
     * This asserted the opposite until roles became records. `neglected_primary` needed a primary
     * action and a cadence on a role, and a role was only ever a name on an assignment - so it sat
     * in neither list, which was the honest state at the time and is not any more.
     *
     * What the test is really for survives the flip: a key claims to be implemented only when
     * something actually detects it. NEEDS_ROLES is empty rather than deleted, so the next detector
     * blocked on machinery has an honest place to sit.
     */
    expect(isImplemented('neglected_primary')).toBe(true);
    expect(IMPLEMENTED).toContain('neglected_primary');
    expect(NEEDS_ROLES).toHaveLength(0);
  });
});
