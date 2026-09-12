import { readFileSync } from 'fs';
import { join } from 'path';

/*
 * Comments stripped first: this file quotes the things it is protecting inside its own
 * explanation, and a rule a comment satisfies is not a rule.
 */
const CODE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

/**
 * THE NEW THING MUST NOT COST THE OLD ONES.
 *
 * Three blocks now shape a turn and they were built at different times for different reasons:
 *
 *   - the recap, which opens by naming what this person actually said last time and asks what has
 *     changed since, rather than "what have you been working on";
 *   - what the record already holds - their number, what they said is in their way, how long it has
 *     sat, what they said they tried;
 *   - and what is still to cover, which is new.
 *
 * The third was added to serve two scenarios properly, and the next step after it is deleting the
 * prose it duplicates. That is exactly the change most likely to take one of the first two with it
 * by accident - they are older, they are further down the file, and none of them announces itself.
 *
 * So this pins all three as reaching the assembled prompt. It is deliberately about the wiring and
 * not the wording: copy improves, and a spec that pinned sentences would fail on every improvement
 * and be deleted for being noisy.
 */
describe('the improvement does not cost the continuity', () => {
  const assembled = CODE.slice(CODE.lastIndexOf('return [systemPrompt'));

  it('the turn still carries the recap of what they said last time', () => {
    expect(assembled).toContain('returningUserContext');
    expect(CODE).toContain('buildReturningUserContext(checkIn.participantId, checkIn.sessionNumber)');
  });

  it('and still carries their number, their blockers and what they tried', () => {
    expect(assembled).toContain('recordAlreadyHolds');
    expect(CODE).toContain('whatTheRecordAlreadyHolds({');
  });

  it('and now also carries what is still to cover', () => {
    expect(assembled).toContain('owedBlock');
  });

  it('with the recap before the new block, so continuity opens the turn', () => {
    /* The recap is what stops a returning person being asked "what have you been working on" as
       though they had never been here. Whatever else a turn does, it does that first. */
    expect(assembled.indexOf('recordAlreadyHolds')).toBeLessThan(assembled.indexOf('intakeBlock'));
    expect(assembled.indexOf('owedBlock')).toBeLessThan(assembled.indexOf('intakeBlock'));
  });

  it('and the guard against a generic opener is still in the recap', () => {
    expect(CODE).toContain('Do NOT ask "what have you been working on?"');
  });
});
