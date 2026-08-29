import { readFileSync } from 'fs';
import { join } from 'path';
import { ObjectiveKind, ObjectiveScope } from '@prisma/client';
import { normalise, missingOwedTo, NOT_A_KIND, SeedInput } from './what-was-already-agreed';

const seed = (o: Partial<SeedInput> = {}): SeedInput => ({
  personExternalId: 'lv-sahar', externalId: 'okr:sahar-q4',
  text: 'Bring in six paying clients during Q4', kind: 'TARGET', ...o,
});

describe('the taxonomy was already right', () => {
  it('so a target, a commitment and a role expectation stay different things', () => {
    /*
     * §5: do not flatten objective, key result, responsibility, commitment, shared commitment, task,
     * to-do, milestone, target and decision into one kind of thing. ObjectiveKind and ObjectiveScope
     * already distinguish them. Nothing new was built here.
     */
    expect(normalise(seed({ kind: 'TARGET' })).kind).toBe(ObjectiveKind.TARGET);
    expect(normalise(seed({ kind: 'COMMITMENT' })).kind).toBe(ObjectiveKind.COMMITMENT);
    expect(normalise(seed({ kind: 'ROLE_EXPECTATION' })).kind).toBe(ObjectiveKind.ROLE_EXPECTATION);
  });

  it('and a collective commitment is a scope, not a different table', () => {
    /* "Collectively bring in ten clients" versus "each of you brings six" is the same kind at two
       scopes, which is why the two can be compared at all. */
    expect(normalise(seed({ scope: 'WHOLE_CHECK_IN' })).scope).toBe(ObjectiveScope.WHOLE_CHECK_IN);
    expect(normalise(seed({ scope: 'EVERYONE_IN_ROLE' })).scope).toBe(ObjectiveScope.EVERYONE_IN_ROLE);
    expect(normalise(seed({})).scope).toBe(ObjectiveScope.ONE_PERSON);
  });

  it('and an unrecognised kind is refused with the reason, not silently defaulted', () => {
    expect(NOT_A_KIND).toMatch(/TARGET/);
    expect(NOT_A_KIND).toMatch(/not interchangeable/);
  });
});

describe('a commitment is owed to somebody', () => {
  it('and one without a name is refused', () => {
    /*
     * "Sahar onboards the clients the team brings in" is a commitment because somebody is waiting on
     * it. Recorded without who, it is indistinguishable from a private to-do and the handoff
     * reasoning never sees it.
     */
    expect(missingOwedTo(seed({ kind: 'COMMITMENT' }))).toBe(true);
    expect(missingOwedTo(seed({ kind: 'COMMITMENT', owedToPersonExternalId: 'lv-hafsah' }))).toBe(false);
  });

  it('while a target owes nobody and needs no name', () => {
    expect(missingOwedTo(seed({ kind: 'TARGET' }))).toBe(false);
  });
});

describe('seeding informs, it never forecloses', () => {
  const SVC = readFileSync(join(__dirname, 'grounds-by-api.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('an integration cannot assert that somebody has seen their target', () => {
    /*
     * `seenBySubject` is the hinge the fairness rule turns on - the engine refuses to press anybody
     * on an objective they have not seen. An integration asserting it on somebody's behalf would
     * quietly disarm that, so it is recorded only as the customer's own claim: `=== true`, never
     * defaulted true and never inferred.
     */
    expect(SVC).toMatch(/seenBySubject: item\.seenBySubject === true/);
    expect(SVC).not.toMatch(/seenBySubject: true[,\s]/);
  });

  it('and a seeded objective is authored by their system, not by the acting user', () => {
    /* `authoredBy` answers "who set this". For a seeded agreement the honest answer is the
       customer's system, which is what lets the interview say "your organisation records this"
       rather than "the lead said this". */
    expect(SVC).toMatch(/authoredBy: 'lovedida'/);
    expect(SVC).not.toMatch(/authoredBy: acting\.id|authoredBy: user\.id/);
  });

  it('and both sides of a commitment must actually be on the check-in', () => {
    expect(SVC).toMatch(/is not on this check-in/);
  });
});
