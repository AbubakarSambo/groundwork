import { readFileSync } from 'fs';
import { join } from 'path';
import { whatIsMissing, unownedGaps, SubjectFacts } from './what-this-objective-is-missing';

/**
 * THE TURN FROM OBSERVING WORK TO GENERATING IT, AND THE LINE IT MUST NOT CROSS.
 *
 * A system that quietly adds to people's plates is one they stop trusting and then stop reading. So
 * it proposes, a person accepts, and the acceptance is recorded - the same discipline as capturing
 * a commitment, for the same reason.
 */
const SERVICE = readFileSync(join(__dirname, 'detectors.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CTRL = readFileSync(join(__dirname, 'detectors.controller.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const facts = (o: Partial<SubjectFacts> = {}): SubjectFacts => ({
  externalId: 'S1', title: 'Reduce onboarding time', ownerExternalId: 'u-naomi',
  contributorExternalIds: [], committedBy: [], findingKeys: [], findingIds: [], ...o,
});

describe('it proposes and never creates', () => {
  it('writes a recommendation and nothing else', () => {
    /* No todo, no commitment, no assignment. The only row this makes is the suggestion itself. */
    const block = SERVICE.slice(SERVICE.indexOf('private async recommend('), SERVICE.indexOf('private async record('));
    expect(block).toMatch(/recommendation\.create/);
    expect(block).not.toMatch(/commitment\.create|personObjective\.create|todo/i);
  });

  it('records who accepted or declined', () => {
    /*
     * Not for blame - for the opposite. Six months later the question is who decided this objective
     * did not need an owner, and "the system did" is the answer that makes people distrust every
     * suggestion it has made since.
     */
    expect(CTRL).toMatch(/resolvedByExternalId: by \?\? null/);
  });

  it('never proposes the same gap twice, however many times it runs', () => {
    /* Re-proposing something somebody declined is the product asking again until it gets the
       answer it wants, which is how a suggestion becomes nagging. */
    expect(SERVICE).toMatch(/state: \{ in: \['PROPOSED', 'ACCEPTED', 'DECLINED'\] \}/);
  });
});

describe('what an objective is missing', () => {
  it('an objective with no owner gets that and nothing else', () => {
    /* Nothing else can be true until it is closed - there is nobody to ask about anything else. */
    const out = whatIsMissing(facts({ ownerExternalId: null, findingKeys: ['goal_divergence'] }));
    expect(out.map((r) => r.kind)).toEqual(['owner_needed']);
  });

  it('a divergence asks for a conversation, not for better writing', () => {
    /*
     * "Write it down properly" presumes one of them is right. Ten minutes agreeing which it is,
     * before more work goes into either version, is the actual remedy.
     */
    const [r] = whatIsMissing(facts({ findingKeys: ['goal_divergence'], findingIds: ['f1'] }));
    expect(r.kind).toBe('conversation_needed');
    expect(r.body).toMatch(/agreeing what it is/i);
    expect(r.sourceDetectorIds).toEqual(['f1']);
  });

  it('suggests a next step only when NOBODY on it has said anything', () => {
    /* One person out of three being quiet is a person, not a gap in the objective. */
    expect(whatIsMissing(facts({ contributorExternalIds: ['u-tom'], committedBy: ['u-tom'] }))
      .some((r) => r.kind === 'todo')).toBe(false);
    expect(whatIsMissing(facts({ contributorExternalIds: ['u-tom'], committedBy: [] }))
      .some((r) => r.kind === 'todo')).toBe(true);
  });

  it('never suggests adding somebody to the work', () => {
    /* That would be the product reorganising a team. Anybody it names is already on it. */
    const out = whatIsMissing(facts({ contributorExternalIds: ['u-tom'] }));
    for (const r of out) {
      expect(r.personExternalId === null || ['u-naomi', 'u-tom'].includes(r.personExternalId)).toBe(true);
    }
    expect(SERVICE).not.toMatch(/assignTo|addContributor/);
  });

  it('every proposal carries the gap it closes', () => {
    /* One a person cannot interrogate is one they either take on faith or ignore, and both are
       worse than not making it. */
    for (const r of whatIsMissing(facts({ findingKeys: ['undeclared_dependency'], findingIds: ['f9'] }))) {
      expect(Object.keys(r.rationale).length).toBeGreaterThan(0);
    }
  });

  it('says nothing about a healthy objective', () => {
    expect(whatIsMissing(facts({ committedBy: ['u-naomi'] }))).toEqual([]);
  });

  it('and an unowned objective is its own finding as well as a suggestion', () => {
    /* The two answer different questions: "this is true of your objectives" and "here is what to
       do about this one". */
    expect(unownedGaps([facts(), facts({ externalId: 'S2', ownerExternalId: null })]).map((s) => s.externalId))
      .toEqual(['S2']);
  });
});

describe('the wording suggests rather than instructs', () => {
  it('never tells anybody they failed to do something', () => {
    const all = [
      ...whatIsMissing(facts({ ownerExternalId: null })),
      ...whatIsMissing(facts({ findingKeys: ['goal_divergence', 'undeclared_dependency'] })),
      ...whatIsMissing(facts({ contributorExternalIds: ['u-tom'] })),
    ];
    expect(all.length).toBeGreaterThan(2);
    for (const r of all) {
      for (const bad of ['failed', 'should have', 'must ', 'you need to', 'overdue', 'behind']) {
        expect(r.body.toLowerCase()).not.toContain(bad);
      }
    }
  });
});
