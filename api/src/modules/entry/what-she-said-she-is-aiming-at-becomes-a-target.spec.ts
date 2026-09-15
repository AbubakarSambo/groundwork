import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * SHE SET TARGETS AND NOTHING WAS SET.
 *
 * A lead came through the entry flow to set objectives for her sales team and track progress. She
 * said "500 contracts by the end of the year", "150 each", "I have a target of 50", and named the
 * finance team as the verifier. She finished, saved, opened her board, and read:
 *
 *   "No targets set yet, so there is nothing for this board to measure progress against"
 *   "Movement: Not tracked"
 *   "Progress 0 of 1 rounds"
 *
 * The code that turns what somebody says into targets has existed the whole time and the signed-in
 * check-in has called it since it was written. THIS path never did, and this is the path every lead
 * meets first. Nothing about the conversation could have fixed that.
 *
 * Pinned at the commit, because a fix to the extraction is worth nothing while nobody calls it.
 */
describe('what she said she is aiming at becomes a target', () => {
  const src = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the entry commit runs the aims and targets extraction, not only the record', () => {
    expect(src).toMatch(/extractRecordEntries\(checkIn\.id, participant\.id\)/);
    expect(src).toMatch(/extractExpectations\(checkIn\.id, participant\.id, ground\.id\)/);
  });

  it('and waits for it, so the report and the board are not built before the targets exist', () => {
    const commit = src.slice(src.indexOf('extractRecordEntries(checkIn.id'));
    const call = commit.slice(0, commit.indexOf('extractExpectations') + 40);
    expect(call).toMatch(/await this\.conversation\s*\.extractExpectations/s);
  });

  it('and a failure there never loses the session', () => {
    const at = src.indexOf('extractExpectations(checkIn.id');
    expect(src.slice(at, at + 260)).toMatch(/\.catch\(/);
  });
});
