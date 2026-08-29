import { readFileSync } from 'fs';
import { join } from 'path';
import { ObjectiveKind, ObjectiveScope, ObjectiveCheck, ObjectiveDue } from '@prisma/client';
import {
  senseCheck, arithmetic, unseen, unowned, unmeasurable, noDate, duplicateResponsibility, addressee, Objective,
} from './nobody-checked-the-management';

const o = (x: Partial<Objective> = {}): Objective => ({
  externalId: 'okr:1', personExternalId: 'lv-sahar', text: 'Bring in six paying clients',
  kind: ObjectiveKind.TARGET, scope: ObjectiveScope.ONE_PERSON, check: ObjectiveCheck.A_NUMBER,
  dueKind: ObjectiveDue.A_CYCLE, owedToPersonExternalId: null, seenBySubject: true,
  authoredBy: 'lead', approvedByExternalId: null, managerExternalId: null, ...x,
});

describe('the six-each versus ten-collective problem', () => {
  it('asks whether the two numbers measure different things', () => {
    /*
     * Straight from the brief. Nobody notices it in a planning meeting because the two numbers are
     * said an hour apart, and both may be deliberate - one a stretch, one the commitment - which is
     * exactly what makes it worth asking rather than assuming.
     */
    const [q] = arithmetic([
      o({ externalId: 'a', personExternalId: 'lv-sahar', text: 'bring in 6 clients' }),
      o({ externalId: 'b', personExternalId: 'lv-adam', text: 'bring in 6 clients' }),
      o({ externalId: 'c', scope: ObjectiveScope.WHOLE_CHECK_IN, text: 'collectively bring in 10 clients' }),
    ]);
    expect(q.asks).toMatch(/add up to 12, and the shared one is 10/);
    expect(q.asks).toMatch(/measuring different things, or is one of them the wrong number/);
  });

  it('and stays quiet when they agree', () => {
    expect(arithmetic([
      o({ externalId: 'a', personExternalId: 'a', text: 'bring in 5 clients' }),
      o({ externalId: 'b', personExternalId: 'b', text: 'bring in 5 clients' }),
      o({ externalId: 'c', scope: ObjectiveScope.WHOLE_CHECK_IN, text: 'collectively 10 clients' }),
    ])).toEqual([]);
  });

  it('and attaches to nobody, because it is about the plan and not a person', () => {
    const [q] = arithmetic([
      o({ externalId: 'a', personExternalId: 'a', text: '6 clients' }),
      o({ externalId: 'b', personExternalId: 'b', text: '6 clients' }),
      o({ externalId: 'c', scope: ObjectiveScope.WHOLE_CHECK_IN, text: '10 clients' }),
    ]);
    expect(q.aboutPersonExternalId).toBeNull();
  });
});

describe('fairness comes first', () => {
  it('somebody held to something they have not seen is the first question asked', () => {
    /* The plainest fairness failure available, and the easiest to create by accident: an objective
       pushed from a planning system that nobody showed the person it is about. */
    const qs = senseCheck([o({ seenBySubject: false, dueKind: null, check: null })]);
    expect(qs[0].kind).toBe('unseen');
    expect(qs[0].asks).toMatch(/Nothing here will read them against it until it has/);
  });

  it('and a commitment nobody is waiting on is asked about', () => {
    const [q] = unowned([o({ kind: ObjectiveKind.COMMITMENT })]);
    expect(q.asks).toMatch(/somebody is waiting on it\. Who, and do they know\?/);
  });
});

describe('the things that make a quarter unresolvable at its end', () => {
  it('a target with no number', () => {
    const [q] = unmeasurable([o({ check: ObjectiveCheck.A_JUDGEMENT, text: 'grow the pipeline meaningfully' })]);
    expect(q.asks).toMatch(/What number, and who reads it\?/);
  });

  it('but not one whose text already carries the number', () => {
    expect(unmeasurable([o({ check: ObjectiveCheck.A_JUDGEMENT, text: 'get to 6 clients' })])).toEqual([]);
  });

  it('a deadline that exists in somebody\'s head', () => {
    const [q] = noDate([o({ dueKind: ObjectiveDue.NOT_SAID })]);
    expect(q.asks).toMatch(/By when, and does everybody waiting on it know that date\?/);
  });

  it('and two people holding the same responsibility', () => {
    const [q] = duplicateResponsibility([
      o({ externalId: 'a', personExternalId: 'lv-sahar', kind: ObjectiveKind.ROLE_EXPECTATION, text: 'own client onboarding end to end' }),
      o({ externalId: 'b', personExternalId: 'lv-adam', kind: ObjectiveKind.ROLE_EXPECTATION, text: 'own client onboarding end to end' }),
    ]);
    expect(q.asks).toMatch(/shared on purpose, or does one of them own it/);
  });

  it('and one person holding it twice is not a duplicate', () => {
    expect(duplicateResponsibility([
      o({ externalId: 'a', kind: ObjectiveKind.ROLE_EXPECTATION, text: 'own onboarding' }),
      o({ externalId: 'b', kind: ObjectiveKind.ROLE_EXPECTATION, text: 'own onboarding' }),
    ])).toEqual([]);
  });
});

describe('it asks, it never rewrites', () => {
  it('every question is a question', () => {
    /*
     * §13's own words: flag ambiguity, do not silently rewrite management's objectives. Correcting
     * somebody's management would be both wrong and the fastest way to have this turned off.
     */
    const qs = senseCheck([
      o({ seenBySubject: false }),
      o({ externalId: 'b', kind: ObjectiveKind.COMMITMENT, dueKind: null }),
    ]);
    expect(qs.length).toBeGreaterThan(0);
    /* Contains a question, rather than ends with one: "Has this been shown to them? Nothing here
       will read them against it until it has." is a question followed by the reassurance that makes
       it safe to answer honestly, and that sentence earns its place. */
    for (const q of qs) expect(q.asks).toContain('?');
  });

  it('and nothing here writes anything', () => {
    const SRC = readFileSync(join(__dirname, 'nobody-checked-the-management.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    /* The type import is the vocabulary, not a capability - the same false positive that caught the
       scenario detector. What matters is that it cannot reach a database. */
    expect(SRC).not.toMatch(/PrismaService|prisma\./);
    expect(SRC).not.toMatch(/\.update\(|\.create\(|\.upsert\(/);
  });

  it('and authorship decides WHO is asked, never WHETHER', () => {
    /*
     * THE TEST THIS REPLACES WAS THE MISTAKE. It asserted this file never reads `authoredBy`,
     * reasoning from §14 - do not assume management is correct - to "do not look at who wrote it".
     * Those are opposite things. You can only check management's assumptions if you know which
     * assumptions are management's, and §14 gets sharper with authorship rather than weaker.
     *
     * What actually has to hold is that no check is SKIPPED because of who set the objective. The
     * same objective, authored three different ways, still produces the same finding - only the
     * addressee moves.
     */
    const shared = { text: 'grow the pipeline', check: ObjectiveCheck.A_JUDGEMENT };
    const bySelf = unmeasurable([o({ ...shared, authoredBy: 'self' })], 'lv-hafsah');
    const byLead = unmeasurable([o({ ...shared, authoredBy: 'lead' })], 'lv-hafsah');
    const bySystem = unmeasurable([o({ ...shared, authoredBy: 'lovedida', approvedByExternalId: 'lv-hafsah' })], null);

    for (const [q] of [bySelf, byLead, bySystem]) expect(q.kind).toBe('unmeasurable');
    expect(bySelf[0].addressedTo).toBe('lv-sahar');
    expect(byLead[0].addressedTo).toBe('lv-hafsah');
    expect(bySystem[0].addressedTo).toBe('lv-hafsah');
  });

  it('and falls back through approver, then manager, then the lead', () => {
    /* Four steps because each is a real situation, and a question must never be dropped for want of
       somebody to ask. */
    expect(addressee(o({ authoredBy: 'self' }), 'lead-1').personExternalId).toBe('lv-sahar');
    expect(addressee(o({ authoredBy: 'lovedida', approvedByExternalId: 'lv-hafsah' }), 'lead-1').personExternalId).toBe('lv-hafsah');
    expect(addressee(o({ authoredBy: 'lovedida', managerExternalId: 'lv-boss' }), 'lead-1').personExternalId).toBe('lv-boss');
    expect(addressee(o({ authoredBy: 'lovedida' }), 'lead-1').personExternalId).toBe('lead-1');
    expect(addressee(o({ authoredBy: 'lovedida' }), 'lead-1').because).toMatch(/nobody is recorded as having set it/);
  });
});

describe('it proposes as well as asks', () => {
  it('and every number in a proposal comes from somewhere real', () => {
    /*
     * "Coach them towards accuracy, not falsified ones." The one thing worse than a vague target is
     * a specific one somebody made up - so a proposal only appears when existing material supplies
     * the number, and the basis says where each part came from.
     */
    const [q] = unmeasurable([
      o({ externalId: 'a', text: 'grow the pipeline', check: ObjectiveCheck.A_JUDGEMENT }),
      o({ externalId: 'c', scope: ObjectiveScope.WHOLE_CHECK_IN, text: 'collectively bring in 10 clients' }),
    ], 'lv-hafsah');
    expect(q.proposes).toMatch(/measured against the shared target of 10/);
    expect(q.basis[0]).toMatch(/comes from the shared target/);
  });

  it('and stays a question when nothing supplies the number', () => {
    const [q] = unmeasurable([o({ text: 'grow the pipeline', check: ObjectiveCheck.A_JUDGEMENT })], 'lv-hafsah');
    expect(q.proposes).toBeNull();
    expect(q.basis).toEqual([]);
    expect(q.asks).toMatch(/What number, and who reads it\?/);
  });

  it('and never proposes who is owed a commitment', () => {
    /* Guessing that invents a relationship between two people, which is the worst thing here to be
       wrong about. */
    const [q] = unowned([o({ kind: ObjectiveKind.COMMITMENT })], 'lv-hafsah');
    expect(q.proposes).toBeNull();
  });

  it('and never proposes which of two people owns a duplicated responsibility', () => {
    /* That is the decision, not the wording. */
    const [q] = duplicateResponsibility([
      o({ externalId: 'a', personExternalId: 'lv-sahar', kind: ObjectiveKind.ROLE_EXPECTATION, text: 'own client onboarding' }),
      o({ externalId: 'b', personExternalId: 'lv-adam', kind: ObjectiveKind.ROLE_EXPECTATION, text: 'own client onboarding' }),
    ], 'lv-hafsah');
    expect(q.proposes).toBeNull();
  });

  it('and on the arithmetic, proposes saying which is which rather than changing either number', () => {
    const [q] = arithmetic([
      o({ externalId: 'a', personExternalId: 'a', text: 'bring in 6 clients' }),
      o({ externalId: 'b', personExternalId: 'b', text: 'bring in 6 clients' }),
      o({ externalId: 'c', scope: ObjectiveScope.WHOLE_CHECK_IN, text: 'collectively bring in 10 clients' }),
    ], 'lv-hafsah');
    expect(q.proposes).toMatch(/whether the individual targets of 12 are a stretch above it/);
    expect(q.basis).toContain('neither number is changed - what is proposed is saying which is which');
  });
});
