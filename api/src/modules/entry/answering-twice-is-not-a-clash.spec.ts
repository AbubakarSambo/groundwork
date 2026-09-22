import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ANSWERING TWICE IS NOT A CLASH.
 *
 * Found on the hundred-person open-link run, 23 September 2026: a respondent who had already
 * answered with the same address, started over, and finished again got
 *
 *   409 "Something with that name or key already exists."
 *
 * and the entire second conversation was lost. The cause is one line and it is invisible in
 * review: `CheckIn` is unique on (participantId, sessionNumber), the merge moved the new check-in
 * onto the existing row without touching its session number, and it was still session one.
 *
 * At an event this is not an edge case. A phone dies, somebody is interrupted, somebody scans the
 * QR twice because nothing happened the first time. The merge's own comment already promised
 * "Nothing they said is lost"; this is the promise being kept.
 */
const SRC = readFileSync(join(__dirname, 'the-open-link.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('somebody who answers the open link twice', () => {
  const MERGE = SRC.slice(SRC.indexOf('if (already) {'), SRC.indexOf('willGetTheReport: true'));

  it('has their moving answers renumbered rather than collided', () => {
    /* The numbers that are already taken on the row being joined, read before anything moves. */
    expect(MERGE).toMatch(/checkIn\.findMany\(\{\s*where: \{ participantId: already\.id \}/);
    expect(MERGE).toMatch(/let next = Math\.max\(0, \.\.\.takenThere\.map/);
    expect(MERGE).toMatch(/sessionNumber: next/);
  });

  it('and never moves them with an updateMany, which cannot give each one its own number', () => {
    /* An updateMany sets one value for every row, so it can only ever reintroduce the collision. */
    expect(MERGE).not.toMatch(/checkIn\.updateMany/);
  });

  it('and the rest of the merge still moves everything else they said', () => {
    expect(MERGE).toMatch(/recordEntry\.updateMany/);
    expect(MERGE).toMatch(/groundDocument\.updateMany/);
    expect(MERGE).toMatch(/groundParticipant\.delete/);
  });

  it('and it all still happens in one transaction', () => {
    expect(MERGE).toMatch(/\$transaction\(\[/);
  });
});
