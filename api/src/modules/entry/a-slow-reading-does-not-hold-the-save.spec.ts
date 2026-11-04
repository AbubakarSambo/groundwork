import { readFileSync } from 'fs';
import { join } from 'path';
import { readUntilItLands, THE_READING_IS_TRIED_AGAIN_AFTER_MS } from './a-slow-reading-does-not-hold-the-save';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy this. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * THE SAVE DOES NOT WAIT FOR THE READING OF THE AIMS (B4, 6 October; changed 3 November 2026). B4 capped the wait at twenty seconds,
 * and the reading took about twenty, so every save waited about that long. The save answers first now; the reading runs after it, the
 * same call, and is tried again when it fails rather than dropped.
 */
describe('reading until it lands', () => {
  it('reads once when the reading works, and says it landed', async () => {
    let reads = 0;
    expect(await readUntilItLands(async () => { reads++; }, () => undefined, [1, 1])).toBe(true);
    expect(reads).toBe(1);
  });

  it('tries again after a failure, and lands on a later try', async () => {
    let reads = 0;
    const failures: [number, boolean][] = [];
    const landed = await readUntilItLands(async () => { reads++; if (reads < 3) throw new Error('the model was away'); }, (_e, tried, again) => failures.push([tried, again]), [1, 1, 1]);
    expect(landed).toBe(true);
    expect(reads).toBe(3);
    expect(failures).toEqual([[1, true], [2, true]]);
  });

  it('gives up after the last try, says so, and never throws', async () => {
    let reads = 0;
    const failures: [number, boolean][] = [];
    expect(await readUntilItLands(async () => { reads++; throw new Error('down'); }, (_e, tried, again) => failures.push([tried, again]), [1, 1])).toBe(false);
    expect(reads).toBe(3);
    expect(failures[failures.length - 1]).toEqual([3, false]);
  });

  it('waits long enough between tries to outlast the model being busy for a while', () => {
    expect(THE_READING_IS_TRIED_AGAIN_AFTER_MS.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(10 * 60_000);
  });
});

describe('the save', () => {
  const src = withoutComments(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'));
  const commit = src.slice(src.indexOf('private async commitInner('), src.indexOf('async patchDraft('));

  it('starts the reading of the aims after the people are on it, and does not wait for it', () => {
    expect(commit).toMatch(/void readUntilItLands\(\s*\(\) => this\.conversation\.extractExpectations\(checkIn\.id, participant\.id, ground\.id, dto\.history\)/);
    expect(commit).not.toMatch(/await[^;]*extractExpectations/);
    expect(commit.indexOf('this.grounds.addParticipant')).toBeLessThan(commit.indexOf('readUntilItLands('));
  });

  it('tells the board when the reading has landed, so it is built again with the targets', () => {
    expect(commit).toMatch(/if \(landed\) this\.events\?\.emit\?\.\(GroundworkEvents\.AIMS_READ, \{ groundId: ground\.id \}/);
    const board = withoutComments(readFileSync(join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
    expect(board).toMatch(/@OnEvent\(GroundworkEvents\.CHECK_IN_COMPLETED\)\s*@OnEvent\(GroundworkEvents\.AIMS_READ\)\s*async warmOnCheckInCompleted\(/);
  });
});
