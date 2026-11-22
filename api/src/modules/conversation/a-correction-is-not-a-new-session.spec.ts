import * as fs from 'fs';
import * as path from 'path';

/**
 * A CORRECTION OPENED LIKE A NEW SESSION, BECAUSE TWO OPENERS WERE IN ONE PROMPT.
 *
 * "The chat about Zainab is one that is meant to clarify things about session 1, but it is acting
 * like a new session." It was. She pressed Correct it on session 1 and got:
 *
 *   "In your first session, you set two standards for Zainab's first quarter... We're now in week
 *    five. How does her record look against those two things?"
 *
 * That is the RETURNING-SESSION opener, and it is a good one - for a returning session.
 *
 * WHY BOTH WERE THERE. A correction is created at the next free session number, so it is always
 * >= 2. `returningUserContext` is built for every session >= 2 and says "open with the most
 * important unresolved item from last time". `selfCorrectionContext` is built for a correction and
 * says "open by naming that you are returning to session N and ask what they want to change".
 * Both were in the prompt, and the returning one is concatenated LAST - so it is the instruction
 * the model acted on. The record was correct the whole time: the check-in row said
 * `isSelfCorrection` and named its target.
 *
 * The same guard already existed thirty lines above, where the prior-entries replay is skipped for
 * a correction. This is that rule applied to the half that was missing it.
 */
const service = fs
  .readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

describe('a self-correction session', () => {
  it('does not also get the returning-session opener', () => {
    expect(service).toContain('if (theirOwn >= 2 && !checkIn.isSelfCorrection) {\n      returningUserContext =');
  });

  it('and still gets its own', () => {
    expect(service).toContain('SELF-CORRECTION SESSION - the participant is returning to correct or add');
    expect(service).toContain('Do NOT ask the standard opener');
  });

  it('and the two are never both in one prompt', () => {
    /*
     * The assembled prompt is a list of blocks joined in order. What matters is not which comes
     * first but that only one of them can be non-empty at a time - the order made this defect
     * invisible for as long as both could be built.
     */
    /* Found by the two things the line always has, rather than by its first two entries: a block
       inserted at the front (theirLanguage) once made this slice(-1) and the assertions vacuous. */
    const at = service.indexOf('return [systemPrompt,');
    expect(at).toBeGreaterThan(-1);
    const assembled = service.slice(at, service.indexOf('\n', at));
    expect(assembled).toContain('VOCABULARY_RULE');
    expect(assembled).toContain('selfCorrectionContext');
    expect(assembled).toContain('returningUserContext');
    /* Each is built only under its own guard. Matched on the guard, not on the line after it,
       which drifted the first time the body below it was edited. */
    const selfBuilt = service.indexOf('if (checkIn.isSelfCorrection && checkIn.selfCorrectionTargetSession != null) {');
    const returningBuilt = service.indexOf('if (theirOwn >= 2 && !checkIn.isSelfCorrection) {');
    expect(selfBuilt).toBeGreaterThan(-1);
    expect(returningBuilt).toBeGreaterThan(-1);
  });
});
