import * as fs from 'fs';
import * as path from 'path';
import { almostNothingHereYet } from './how-short-a-check-in-may-be';

/**
 * A REFUSAL THAT ASKS FOR SOMETHING MUST LEAVE A WAY TO GIVE IT.
 *
 * The dead end, in order: the engine decides a session is over and returns sessionComplete; the
 * chat sets `done`; `done` disables the composer; the person presses Complete; the server refuses
 * because the record is too thin and tells them to answer a couple more questions - into a box that
 * is already switched off. Nothing left to press. That is "I could not complete my check-in".
 *
 * The record protection is NOT relaxed here and must not be: leaving early is fine, leaving nothing
 * behind is not. What changed is that these two refusals declare themselves answerable, so the
 * client can re-open the composer.
 *
 * WHY A FLAG AND NOT THE WORDING. Matching the client on the sentence would make the copy
 * load-bearing - somebody rewording it would silently reinstate the trap, and nothing would go red.
 *
 * Comments stripped: this file quotes the code it guards, and the guarded code explains itself at
 * length in prose. An unstripped match has gone green on a comment in this repository before.
 */
const strip = (f: string) =>
  fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');

const SERVICE = strip(path.join(__dirname, 'conversation.service.ts'));
const CHAT = strip(path.join(__dirname, '../../../../client/src/pages/chat/ChatPage.tsx'));

/** Just the completion method, so a match cannot come from somewhere else in a 4000-line file. */
const COMPLETE = (() => {
  const start = SERVICE.indexOf('async complete(checkInId: string, requestingUserId: WhoIsAsking, how');
  expect(start).toBeGreaterThan(-1);
  const end = SERVICE.indexOf('scoreSessionSpecificity(checkIn.id)', start);
  expect(end).toBeGreaterThan(start);
  return SERVICE.slice(start, end);
})();

describe('a refusal that asks must be answerable', () => {
  it('found the completion method, so an empty slice cannot pass', () => {
    expect(COMPLETE.length).toBeGreaterThan(500);
  });

  it('both thin-record refusals say they can be answered', () => {
    const flagged = COMPLETE.match(/canContinue: true/g) ?? [];
    // Changed 26 October 2026 (Hafsah: item 2): a third refusal, an end with nothing said yet, keeps the check-in open, so it is answerable too.
    expect(flagged).toHaveLength(3);
    expect(COMPLETE.slice(COMPLETE.indexOf('Nothing has been said yet'), COMPLETE.indexOf('Nothing has been said yet') + 300)).toContain('canContinue: true');
  });

  it('the thin-turn refusal is one of them', () => {
    const i = COMPLETE.indexOf('I need a little more from you before this check-in can close');
    expect(i).toBeGreaterThan(-1);
    expect(COMPLETE.slice(i, i + 400)).toContain('canContinue: true');
  });

  it('the no-substance refusal is the other', () => {
    const i = COMPLETE.indexOf('There is almost nothing here yet');
    expect(i).toBeGreaterThan(-1);
    expect(COMPLETE.slice(i, i + 400)).toContain('canContinue: true');
  });

  it('and closure or a hold is NOT answerable - answering will not reopen a closed ground', () => {
    const guard = SERVICE.slice(
      SERVICE.indexOf('private async assertGroundAcceptsInput'),
      SERVICE.indexOf('async sendMessage('),
    );
    expect(guard).toContain('This check-in is closed');
    expect(guard).not.toContain('canContinue');
  });

  it('the substance gate itself is NOT relaxed - leaving nothing behind is still refused', () => {
    /* The whole point: this fixes the dead end, not the standard. */
    /* The gate moved into one function the engine's close reads too (request 47); its numbers are unchanged. */
    expect(COMPLETE).toContain('almostNothingHereYet(');
    expect(almostNothingHereYet(['yes', 'ok', 'fine'], false)).toBe(true);
    expect(almostNothingHereYet(['We signed two shops this week.', 'Kano is waiting on the price list.'], false)).toBe(false);
    expect(almostNothingHereYet(['a'.repeat(49)], false)).toBe(true);
    expect(almostNothingHereYet(['The deadline was March, not May.'], true)).toBe(false);
  });

  it('the chat re-opens the composer on that flag, and does not read the sentence', () => {
    const handler = CHAT.slice(CHAT.indexOf('const complete = useMutation'), CHAT.indexOf('const uploadDoc'));
    expect(handler).toContain('canContinue');
    expect(handler).toContain('setDone(false)');
    /* If it matched on the wording, rewording the copy would bring the trap back in silence. */
    expect(handler).not.toContain('almost nothing here yet');
  });
});
