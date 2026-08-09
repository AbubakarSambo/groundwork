import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * FELT-FAIR COMES FROM A FAIRNESS QUESTION. NOTHING ELSE.
 *
 * `OutcomeFeedback.feltFair` is a single boolean column, and it is the only
 * input to `avgFairnessRate` in the outcome-learning summary - the one number
 * that says whether this process is safe for the people put through it.
 *
 * The longer survey route used to write `feltFair: dto.wouldUseAgain`. Those are
 * different questions with different answers: a person can find a process fair
 * and not want to repeat it, or find it unfair and use it again because their
 * manager asked them to. Filling the fairness column from an enthusiasm answer
 * would have reported the wrong thing on the measure that matters most, and it
 * would have looked healthy while doing it.
 *
 * Nothing called the route, so no real answer was ever miscounted. It was fixed
 * rather than left because a future caller would have inherited it silently.
 *
 * These tests assert on source, because the failure is a future edit that
 * substitutes some other boolean back into that column - and any such edit will
 * look reasonable in isolation.
 */

const SERVICE = readFileSync(join(__dirname, 'intelligence.service.ts'), 'utf8');
const CONTROLLER = readFileSync(join(__dirname, 'intelligence.controller.ts'), 'utf8');

/** The structured-survey write, so assertions cannot drift to the short route. */
const STRUCTURED_WRITE = (() => {
  const i = SERVICE.indexOf('async submitOutcomeFeedback');
  expect(i).toBeGreaterThan(-1);
  const j = SERVICE.indexOf('async myFeedback', i);
  return SERVICE.slice(i, j > -1 ? j : undefined);
})();

describe('the fairness column is fed by the fairness answer', () => {
  it('the survey asks its own fairness question', () => {
    expect(CONTROLLER).toMatch(/class GroundFeedbackDto \{[\s\S]*?feltFair: boolean;/);
  });

  it('it is required, so it cannot be quietly omitted and defaulted', () => {
    // @IsOptional() here would let a caller skip it, and the column would then
    // be filled by whatever the code fell back to - which is how this broke the
    // first time.
    const dto = CONTROLLER.slice(CONTROLLER.indexOf('class GroundFeedbackDto'));
    const block = dto.slice(0, dto.indexOf('}'));
    expect(block).toMatch(/@IsBoolean\(\)\s*\n\s*(\/\*\*[\s\S]*?\*\/\s*\n\s*)?feltFair: boolean;/);
    expect(block).not.toMatch(/@IsOptional\(\)\s*\n\s*@IsBoolean\(\)\s*\n\s*feltFair/);
  });

  it('writes feltFair from feltFair', () => {
    expect(STRUCTURED_WRITE).toMatch(/feltFair: dto\.feltFair,/);
  });

  it('never writes wouldUseAgain into the feltFair column again', () => {
    // THE REGRESSION THIS FILE EXISTS FOR.
    expect(STRUCTURED_WRITE).not.toMatch(/feltFair: dto\.wouldUseAgain/);
    expect(SERVICE).not.toMatch(/feltFair: dto\.wouldUseAgain/);
  });

  it('never writes any other survey answer into it', () => {
    // rating >= 4 as a proxy for "fair" would be the same mistake in a new coat.
    //
    // Scoped to the prisma create payload, not the whole method: the method's
    // own parameter type legitimately contains `feltFair: boolean`, and a looser
    // pattern matched that instead of the assignment.
    const create = STRUCTURED_WRITE.slice(STRUCTURED_WRITE.indexOf('outcomeFeedback.create'));
    const assignment = /feltFair:\s*([^,\n]+)/.exec(create)?.[1]?.trim();
    expect(assignment).toBe('dto.feltFair');
  });
});

describe('would-use-again is still recorded, just not as fairness', () => {
  it('is kept in the structured note with the rest of the survey', () => {
    // Deleting the answer would have been the lazy fix. It is a real signal -
    // it just is not this one.
    expect(STRUCTURED_WRITE).toMatch(/wouldUseAgain: dto\.wouldUseAgain,/);
  });

  it('the short route still writes the fairness answer directly', () => {
    // The two routes share one row. The short one was always correct and must
    // stay that way.
    const short = SERVICE.slice(SERVICE.indexOf('async submitFeedback'), SERVICE.indexOf('// --- Dashboard'));
    expect(short).toMatch(/create: \{ groundId, participantId: participant\.id, feltFair, note \}/);
  });
});
