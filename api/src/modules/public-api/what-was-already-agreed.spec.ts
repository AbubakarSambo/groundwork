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
    /*
     * WRITES ONLY, and it took an unrelated change to show why. This scanned the whole file, so the
     * first piece of code to READ the column - `select: { seenBySubject: true }`, which is Prisma
     * for "give me this field" and asserts nothing about anybody - turned it red. A guard that
     * cannot tell a read from a write is one a person eventually satisfies by not reading the
     * column, and refusing to press somebody about a thing they have not seen REQUIRES reading it.
     */
    const writes = [...SVC.matchAll(/\b(create|createMany|update|updateMany|upsert)\s*\(\s*\{[\s\S]{0,1200}?\n {4}\}\)/g)]
      .map((m) => m[0]).join('\n');
    expect(writes).not.toMatch(/seenBySubject: true[,\s]/);
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

describe('a planning system holds several targets for one person', () => {
  const SCHEMA = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8');
  const MODEL = SCHEMA.slice(SCHEMA.indexOf('model PersonObjective'), SCHEMA.indexOf('\n}', SCHEMA.indexOf('model PersonObjective')));

  it('so the key includes externalId, and externalId cannot be null', () => {
    /*
     * A NULLABLE externalId in the key would remove the guarantee silently: Postgres treats NULLs as
     * distinct, every conversation-authored row has a null one, so two of them would both insert and
     * the engine could hold two contradictory expectations with nothing to say which applied.
     */
    expect(MODEL).toMatch(/@@unique\(\[groundId, participantId, kind, externalId\]\)/);
    expect(MODEL).toMatch(/externalId\s+String\s+@default\(""\)/);
    expect(MODEL).not.toMatch(/externalId\s+String\?/);
  });

  it('and no partial index, which this repository already removed once', () => {
    /*
     * `WHERE source_system IS NULL` keeps both guarantees and cannot be expressed in Prisma, so
     * schema and database could never agree - and 20260826180000 removed exactly such an index for
     * exactly that reason. Reintroducing it turns the CI check that catches real drift permanently
     * red, which costs more than it buys.
     */
    const MIGRATION = readFileSync(
      join(__dirname, '../../../prisma/migrations/20260829390000_several_seeded_objectives/migration.sql'), 'utf8',
    );
    expect(MIGRATION).not.toMatch(/CREATE UNIQUE INDEX[\s\S]*?WHERE/);
    expect(MIGRATION).toMatch(/SET NOT NULL/);
  });
});
