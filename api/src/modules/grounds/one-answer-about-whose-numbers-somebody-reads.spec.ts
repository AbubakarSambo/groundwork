import { readFileSync } from 'fs';
import { join } from 'path';

/*
 * TWO SURFACES, ONE SETTING, OPPOSITE ANSWERS.
 *
 * Read live on 15 September 2026 on the same check-in, one tap apart. In the check-in itself Rita
 * was shown the team's 500 and her own 150, with "Other people on this check-in have numbers of
 * their own, and those are theirs". On the Context tab she was shown Kunle's 150, Amir's 150 and
 * the lead's 50 - under a heading that reads "What is expected of YOU".
 *
 * The cause was not a bug in either surface. `whoSeesTargets` had two readers, the board and the
 * conversation, and the note on the column names exactly those two. Context was the third and
 * nobody had told it.
 */
describe('one answer about whose numbers somebody reads', () => {
  const src = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('the ground read knows about the setting at all', () => {
    expect(src).toMatch(/const peersKeepTheirNumbers =\s*\n?\s*!viewerRunsIt && \(\(ground as any\)\.whoSeesTargets \?\? 'THEIR_OWN'\) !== 'EVERYBODY'/);
  });

  it('and withholds somebody else’s expectations, both shapes of them', () => {
    expect(src).toMatch(/const withholdTheirNumbers = peersKeepTheirNumbers && !isSelf/);
    /* The list the Context page renders. */
    expect(src).toMatch(/all: \(withholdTheirNumbers \? \[\] : \(objectivesByParticipant\.get\(p\.id\) \?\? \[\]\)\)/);
    /* And the single-objective shape beside it, or the same number arrives by the other door. */
    expect(src).toMatch(/const row = withholdTheirNumbers \? undefined : objectiveByParticipant\.get\(p\.id\)/);
  });

  it('never withholds anything from the person it is about', () => {
    /* isSelf is the whole exemption: your own expectation is yours to read. */
    const at = src.indexOf('const withholdTheirNumbers');
    expect(src.slice(at - 400, at)).toMatch(/const isSelf = !!requestingUserId && p\.userId === requestingUserId/);
  });

  it('and never from the lead, whose page says "person by person"', () => {
    /* Whoever runs it reads every person's goals, the lead first (the same rule as everywhere else: theyRunThisCheckIn). */
    expect(src).toMatch(/!viewerRunsIt &&/);
    expect(src).toMatch(/const viewerRunsIt = theyRunThisCheckIn\(/);
  });

  it('a check-in set so everybody sees every number is unchanged', () => {
    expect(src).toMatch(/!== 'EVERYBODY'/);
  });
});
