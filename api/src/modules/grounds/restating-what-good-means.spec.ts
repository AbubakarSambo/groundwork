import { restatesSuccess, saidBackForRestatedSuccess, askToRestateSuccess } from './restating-what-good-means';
import { readFileSync } from 'fs';
import { join } from 'path';

/*
 * FIX 6, 30 September 2026 (inventory item 16). Driven live: "Change what good means: every stage
 * has an owner and a next date, because the board kept going stale." answered, on both doors, "I
 * cannot find 'what good means' on this check-in." - the generic change reader only ever matches a
 * line, a target or an action already on the record, and what doing well looks like lives in its own
 * table, GroundBaseline, not among those.
 */
describe('restatesSuccess: a restatement of what doing well looks like, read without a model', () => {
  it('the exact exchange the fix names', () => {
    const r = restatesSuccess(
      'Change what good means: every stage has an owner and a next date, because the board kept going stale.',
    );
    expect(r).toEqual({ newSuccess: 'every stage has an owner and a next date', reason: 'the board kept going stale' });
  });

  it('with no reason, the reason comes back null - the caller asks for one', () => {
    const r = restatesSuccess('Change what good means: every stage has an owner and a next date.');
    expect(r).toEqual({ newSuccess: 'every stage has an owner and a next date', reason: null });
  });

  it('a few other ways of saying the same thing', () => {
    expect(restatesSuccess('Redefine success: we ship weekly, because monthly was too slow')).toEqual({
      newSuccess: 'we ship weekly', reason: 'monthly was too slow',
    });
    expect(restatesSuccess('What doing well looks like is now every client gets a same-day reply')).toEqual({
      newSuccess: 'every client gets a same-day reply', reason: null,
    });
  });

  it('an ordinary message is not a restatement', () => {
    expect(restatesSuccess('What does doing well look like here?')).toBeNull();
    expect(restatesSuccess('Ben is struggling this month.')).toBeNull();
    expect(restatesSuccess('')).toBeNull();
    expect(restatesSuccess(undefined)).toBeNull();
  });

  it('the trigger with nothing after it is not a statement to record', () => {
    expect(restatesSuccess('Change what good means')).toBeNull();
  });
});

/*
 * FOUND LIVE, 30 September 2026, on the four live checks: the confirmation of a restated success was
 * a fragment, pieces glued together with a colon and a trailing parenthesis rather than a sentence a
 * person reads -
 *   Recorded. What doing well looks like now: "every stage has an owner and a next date" (the board
 *   kept going stale)
 */
describe('saidBackForRestatedSuccess: the confirmation reads as a full sentence, not a fragment', () => {
  it('the exact exchange the fix names, said as full sentences', () => {
    const said = saidBackForRestatedSuccess({
      version: 2,
      successLooksLike: 'every stage has an owner and a next date',
      changeReason: 'the board kept going stale',
    });
    expect(said).toBe(
      'What doing well looks like is now "every stage has an owner and a next date", because the board kept going stale. The earlier version is kept.',
    );
    /* No colon-joined fragment, no bracketed reason. */
    expect(said).not.toContain(':');
    expect(said).not.toContain('(');
    expect(said).not.toMatch(/^Recorded\./);
  });

  it('the very first version has nothing earlier to speak of, and no reason is required for it', () => {
    const said = saidBackForRestatedSuccess({ version: 1, successLooksLike: 'every client gets a same-day reply', changeReason: null });
    expect(said).toBe('What doing well looks like is now "every client gets a same-day reply".');
    expect(said).not.toContain('earlier version');
  });
});

/*
 * FOUND LIVE, 30 September 2026, on the four live checks: the PROPOSE-stage say-back for a
 * restatement had the same fault `saidBackForRestatedSuccess` above was fixed for, one turn earlier -
 * "I will record that as what doing well looks like now: '...'" - a colon-joined fragment shown with
 * a Yes underneath it, before the lead had said anything. `askToRestateSuccess` is that sentence,
 * said as a question instead.
 */
describe('askToRestateSuccess: the say-back, before the lead has said yes, asks rather than states', () => {
  it('the exact exchange the fix names, said as a question with no colon', () => {
    const said = askToRestateSuccess(
      { newSuccess: 'every stage has an owner and a next date', reason: 'the board kept going stale' },
      true,
    );
    expect(said).toBe(
      'Shall I change what doing well looks like to "every stage has an owner and a next date", '
      + 'because the board kept going stale? The earlier version is kept.',
    );
    expect(said).not.toContain(':');
    expect(said).not.toMatch(/^I will/);
  });

  it('with no earlier version, there is nothing to say was kept', () => {
    const said = askToRestateSuccess({ newSuccess: 'every client gets a same-day reply', reason: null }, false);
    expect(said).toBe('Shall I change what doing well looks like to "every client gets a same-day reply"?');
    expect(said).not.toContain('earlier version');
  });
});

describe('the restatement is checked before the "is there an open question" guard, and writes through stateBaseline itself', () => {
  const CODE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, '');
  const apply = CODE.slice(CODE.indexOf('async applyContextProposal('), CODE.indexOf('private async writeWhatThePasteGave('));

  it('restatesSuccess is read from dto.said before the open-gap throw, so a fully set-up check-in can still hear it', () => {
    const restatedAt = apply.indexOf('const restated = restatesSuccess(dto.said);');
    const throwAt = apply.indexOf('if (!openGap) throw');
    expect(restatedAt).toBeGreaterThan(-1);
    expect(throwAt).toBeGreaterThan(-1);
    expect(restatedAt).toBeLessThan(throwAt);
  });

  it('writes through stateBaseline itself, not a second copy of the versioning rule', () => {
    const block = apply.slice(apply.indexOf('const restated = restatesSuccess(dto.said);'), apply.indexOf('if (!openGap) throw'));
    expect(block).toContain('this.stateBaseline(groundId, requestingUserId,');
    expect(block).toContain('changeReason: restated.reason ?? undefined');
  });
});
