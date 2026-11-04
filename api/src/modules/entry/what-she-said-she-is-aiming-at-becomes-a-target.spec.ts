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
/*
     * SETUP IS NOT THE LEAD'S CHECK-IN ANY MORE. Decided by Hafsah, 15 September 2026: "the setup
     * does not count as a leads first checkin. lead has to always do a first checkin."
     *
     * So commit no longer copies the setup transcript onto session 1, no longer marks it complete,
     * and no longer extracts record entries from it - those answers are about the SHAPE of the
     * check-in and were being filed as an account of the work.
     *
     * The targets still come from setup, because they are what she said the check-in is FOR rather
     * than her account of it. They are read from the transcript passed in, not from the session.
     */
    expect(src).not.toMatch(/extractRecordEntries\(checkIn\.id, participant\.id\)/);
    expect(src).toMatch(/extractExpectations\(checkIn\.id, participant\.id, ground\.id, dto\.history\)/);
  });

  /* Changed 3 November 2026: the save answers before the reading (Hafsah's speed brief); the board is built again when it lands. */
  it('and runs it after the save has answered, telling the board when the targets have landed', () => {
    const at = src.indexOf('.extractExpectations(checkIn.id, participant.id, ground.id, dto.history)');
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(Math.max(0, at - 400), at)).toMatch(/void readUntilItLands\(/);
    expect(src.slice(at, at + 600)).toMatch(/GroundworkEvents\.AIMS_READ/);
  });

  /* Changed 3 November 2026: a failure is tried again rather than caught and dropped; readUntilItLands never throws. */
  it('and a failure there never loses the session, and is tried again', () => {
    const at = src.indexOf('extractExpectations(checkIn.id');
    expect(src.slice(Math.max(0, at - 400), at)).toMatch(/readUntilItLands\(/);
  });
});
