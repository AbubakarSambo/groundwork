import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * PART 3, HAFSAH'S RULING, 30 SEPTEMBER 2026, WIRED INTO THE BOARD.
 *
 * `whatEachPersonSaidForTheSubject` and its two source functions are proved directly, as pure
 * functions, in reports/colleagues-exact-words-stay-with-the-manager.spec.ts - including
 * `whoOwnsWhatForTheSubject` and `divergenceForTheSubject`, the two the board calls. This proves
 * the board actually calls them, for the one reader they are for, at the one place `walled` is
 * returned - the same source-grep proof `a-leads-description-does-not-reach-a-reader.spec.ts` uses
 * for `theShareableTextFor`'s wiring, for the same reason: a full `BoardService.get()` walk needs a
 * prisma double for dozens of queries most of this file makes and none of this change touches.
 *
 * `whoOwnsWhat` IS NOT ACTUALLY REACHABLE ON AN EVALUATION BOARD TODAY. `FAMILY_SECTIONS[EVALUATION]`
 * is `['objectives', 'checkInGrid', 'divergence']` - no `whoOwnsWhat` - so `out.whoOwnsWhat` is never
 * populated for a PIP, a renewal or a recognition round, and the wiring below is a defensive no-op
 * until that changes. `divergence` IS in that list and is the one this ruling actually protects on
 * the board today.
 */
function withoutComments(t: string): string {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('the board calls the one helper, for the one reader, right where it returns what a reader may see', () => {
  const board = withoutComments(readFileSync(join(__dirname, 'board.service.ts'), 'utf8'));

  it('imports the redaction functions from the one file that defines them', () => {
    expect(board).toContain("from '../reports/is-this-an-evaluation-check-in'");
    expect(board).toContain("from '../reports/colleagues-exact-words-stay-with-the-manager'");
  });

  /**
   * DECISION 60 POINT 4, 30 September 2026, NARROWS THIS: the manager and an admin WITH access to
   * this check-in count as the lead here (`evaluationWordsRunsIt`, `runsItForAPattern`'s own
   * result) - never `runsThisGround`, which also counts every admin of the organisation
   * (`adminHere`). An admin without access is instead caught by the added
   * `adminWithoutCheckInAccess` branch, tested below.
   */
  it('gates the call on viewerIsTheSubjectOfAnEvaluationCheckIn, with the manager and an admin WITH access to this check-in counted as the lead', () => {
    expect(board).toMatch(/viewerIsTheSubjectOfAnEvaluationCheckIn\(\{[\s\S]{0,200}isLead:\s*isInitiator \|\| evaluationWordsRunsIt/);
    expect(board).not.toMatch(/viewerIsTheSubjectOfAnEvaluationCheckIn\(\{[\s\S]{0,200}isLead:\s*runsThisGround/);
  });

  it('an admin WITHOUT access to this check-in is redacted too, the same access rule decision 58 gave patterns', () => {
    expect(board).toContain('const evaluationWordsRunsIt = runsItForAPattern(ground as any, requestingUserId)');
    expect(board).toContain('const adminWithoutCheckInAccess = adminHere && !evaluationWordsRunsIt && isEvaluationCheckIn(ground.scenario)');
    expect(board).toMatch(/\}\)\s*\|\|\s*adminWithoutCheckInAccess\)\s*\{/);
  });

  it('redacts divergence positions/perspectives, and passes the viewer\'s own resolved name so their own side is left alone', () => {
    /* CHANGED (1 October review): the call also hands in the subject's own record and the lead's names, so the
       evidence loses a colleague's quoted words and the lead's side is not called "a colleague". */
    expect(board).toMatch(/divergenceForTheSubject\(walled\.divergence\.items,\s*\[me\?\.id \? nameOf\(me\.id\) : null\],/);
  });

  it('redacts whoOwnsWhat items, keyed to the subject\'s own participant id', () => {
    /* CHANGED 3 October (requests 124): the call also says whether a decision is below and, for the new hire, whose row is the lead's. */
    expect(board).toMatch(/whoOwnsWhatForTheSubject\(walled\.whoOwnsWhat,\s*me\?\.id \?\? null,\s*\{/);
  });

  it('is applied to `walled` after the private-file and hidden-target passes, so it cannot be bypassed by either', () => {
    const afterHiddenTargets = board.split('withoutLinesWithNoWords(walled')[1] ?? '';
    expect(afterHiddenTargets).toContain('viewerIsTheSubjectOfAnEvaluationCheckIn');
  });
});
