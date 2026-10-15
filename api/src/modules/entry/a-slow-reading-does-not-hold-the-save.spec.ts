import { readFileSync } from 'fs';
import { join } from 'path';
import { waitNoLongerThan, HOW_LONG_THE_SAVE_WAITS_FOR_THE_READING_MS } from './a-slow-reading-does-not-hold-the-save';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy this. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * A SLOW READING OF THE SETUP DOES NOT HOLD THE SAVE (B4). Read as the lead: the save answers within the time it allows, whatever the
 * model does, and the reading she is waiting on still ends up written.
 */
describe('waiting for the reading, for a while only', () => {
  it('answers at once when the reading is quick, and says it finished', async () => {
    expect(await waitNoLongerThan(Promise.resolve('read'), 1000)).toEqual({ finished: true });
  });

  it('answers when the time is up if the reading is slow, and the reading still finishes on its own', async () => {
    let written = false;
    const slow = new Promise<void>((resolve) => setTimeout(() => { written = true; resolve(); }, 120));
    const t0 = Date.now();
    expect(await waitNoLongerThan(slow, 20)).toEqual({ finished: false });
    expect(Date.now() - t0).toBeLessThan(100);
    expect(written).toBe(false);
    await slow;
    expect(written).toBe(true);
  });

  it('a reading that fails does not fail the save', async () => {
    expect(await waitNoLongerThan(Promise.reject(new Error('the model was away')), 1000)).toEqual({ finished: true });
  });

  it('is short enough that the save answers well inside what the screen waits', () => {
    expect(HOW_LONG_THE_SAVE_WAITS_FOR_THE_READING_MS).toBeLessThanOrEqual(20_000);
  });
});

describe('the save', () => {
  it('starts the reading of the aims after the people are on it, and waits for it no longer than that', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'));
    const commit = src.slice(src.indexOf('private async commitInner('), src.indexOf('async patchDraft('));
    expect(commit).toMatch(/waitNoLongerThan\(reading, HOW_LONG_THE_SAVE_WAITS_FOR_THE_READING_MS\)/);
    /* Still waited for, inside the cap, as the older specs pin: the same call, behind the same await. */
    expect(commit).toMatch(/await this\.conversation[\s\S]{0,400}\.extractExpectations\(checkIn\.id, participant\.id, ground\.id, dto\.history\)/);
    /* After the invitations, as before, so the people it needs are on the check-in. */
    expect(commit.indexOf('this.grounds.addParticipant')).toBeLessThan(commit.indexOf('waitNoLongerThan(reading'));
  });
});
