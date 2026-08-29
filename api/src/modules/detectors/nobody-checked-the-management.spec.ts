import { readFileSync } from 'fs';
import { join } from 'path';
import { ObjectiveKind, ObjectiveScope, ObjectiveCheck, ObjectiveDue } from '@prisma/client';
import {
  senseCheck, arithmetic, unseen, unowned, unmeasurable, noDate, duplicateResponsibility, Objective,
} from './nobody-checked-the-management';

const o = (x: Partial<Objective> = {}): Objective => ({
  externalId: 'okr:1', personExternalId: 'lv-sahar', text: 'Bring in six paying clients',
  kind: ObjectiveKind.TARGET, scope: ObjectiveScope.ONE_PERSON, check: ObjectiveCheck.A_NUMBER,
  dueKind: ObjectiveDue.A_CYCLE, owedToPersonExternalId: null, seenBySubject: true, ...x,
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
    expect(q.personExternalId).toBeNull();
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

  it('and management is checked on the same terms as everybody else', () => {
    /*
     * §14. A product that checks contributors' claims and takes the chief executive's on trust is
     * not a fair one, and everybody in it works that out quickly. Nothing here looks at who set an
     * objective before deciding whether to ask about it.
     */
    const SRC = readFileSync(join(__dirname, 'nobody-checked-the-management.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(SRC).not.toMatch(/authoredBy|isLead|isManager|role ===/);
  });
});
