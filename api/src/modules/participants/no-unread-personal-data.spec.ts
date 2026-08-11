import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE COFOUNDER INTAKE IS GONE, AND MUST NOT COME BACK BY HABIT.
 *
 * Twelve free-text columns lived on GroundParticipant, 4000 characters each:
 * founding, role, personal and exit intent; compensation, autonomy, recognition,
 * growth and relationship asks; financial floor, stress tolerance, relational
 * tolerance.
 *
 * Every one was write-only. A PATCH route wrote them, from a client function no
 * page ever called, and nothing read them - not a report, not a board, not a
 * prompt. The single apparent reader was `hasIntake = !!foundingIntent`, which
 * was returned to the client and consumed by nothing either.
 *
 * So the schema stood ready to hold a person's salary floor and how much stress
 * they can absorb, in a column no feature would ever open. That is not a
 * harmless unused table. It is a liability that accrues silently, in a product
 * whose landing page makes explicit promises about what happens to what people
 * tell it - and the engine already gathers this in conversation, where it is
 * probed, evidenced, and visible to the person in their own record.
 *
 * This test is the thing that stops it being reintroduced one convenient field
 * at a time. If you are here because it failed: the question is not "how do I
 * store this", it is "what reads it, and can the person see it".
 */

const api = (p: string) => readFileSync(join(__dirname, '..', '..', '..', p), 'utf8');
const SCHEMA = api('prisma/schema.prisma');

/** The intake fields, by their prisma names and their column names. */
const INTAKE_FIELDS = [
  ['foundingIntent', 'founding_intent'],
  ['roleIntent', 'role_intent'],
  ['personalIntent', 'personal_intent'],
  ['exitIntent', 'exit_intent'],
  ['compensationAsk', 'compensation_ask'],
  ['autonomyAsk', 'autonomy_ask'],
  ['recognitionAsk', 'recognition_ask'],
  ['growthAsk', 'growth_ask'],
  ['relationshipAsk', 'relationship_ask'],
  ['financialFloor', 'financial_floor'],
  ['stressTolerance', 'stress_tolerance'],
  ['relationalTolerance', 'relational_tolerance'],
] as const;

/** GroundParticipant's body, so a match elsewhere cannot pass for this. */
const PARTICIPANT_MODEL = (() => {
  const i = SCHEMA.indexOf('model GroundParticipant {');
  expect(i).toBeGreaterThan(-1);
  return SCHEMA.slice(i, SCHEMA.indexOf('\n}', i));
})();

describe('the columns are gone from the schema', () => {
  it.each(INTAKE_FIELDS)('has no %s field', (field, column) => {
    // The explanatory comment in the model mentions some names in prose, so
    // match the FIELD DECLARATION shape rather than the bare word.
    expect(PARTICIPANT_MODEL).not.toMatch(new RegExp(`^\\s*${field}\\s+String`, 'm'));
    expect(PARTICIPANT_MODEL).not.toMatch(new RegExp(`@map\\("${column}"\\)`));
  });
});

describe('nothing writes them any more', () => {
  it('the intake route is gone', () => {
    const controller = api('src/modules/participants/participants.controller.ts');
    expect(controller).not.toMatch(/:checkInId\/intake/);
    expect(controller).not.toMatch(/SaveIntakeDto/);
  });

  it('the service method is gone', () => {
    expect(api('src/modules/participants/participants.service.ts')).not.toMatch(/saveIntake/);
  });

  it('the dead hasIntake flag is gone from the check-in payload', () => {
    // It was the only thing that looked like a reader, and it was returned to a
    // client that ignored it.
    expect(api('src/modules/conversation/conversation.service.ts')).not.toMatch(/hasIntake/);
  });
});

describe('the migration actually drops them', () => {
  const migration = api('prisma/migrations/20260808120000_drop_cofounder_intake/migration.sql');

  it.each(INTAKE_FIELDS)('drops the %s column', (_field, column) => {
    expect(migration).toMatch(new RegExp(`DROP COLUMN IF EXISTS "${column}"`));
  });

  it('says out loud that it is destructive and meant to be', () => {
    // A future reader finding a data-dropping migration deserves the reason in
    // the file, not in a commit message they will not go looking for.
    expect(migration).toMatch(/DESTRUCTIVE AND INTENDED TO BE/);
  });
});
