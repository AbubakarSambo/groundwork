import { readFileSync } from 'fs';
import { join } from 'path';
import * as howShort from './how-short-a-check-in-may-be';

/**
 * THE ENGINE AND THE SERVER READ THE SAME GATE, AND THERE IS NO FLOOR OF ANSWERS.
 *
 * When the engine and the server disagree it is a deadlock: the engine offers the close, the composer goes off, and the server refuses
 * with no way left to answer. This file used to pin one floor of answers read in both places (five for Groundwork's own close, three
 * for a person's finish and a team update, one for a correction). Since 3 November 2026 (Hafsah: no question limits and no forced
 * close) there is no floor at all. The only bar is the empty record, almostNothingHereYet, read by the engine's close and by complete().
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('no floor of answers, anywhere', () => {
  it('the floors are gone from the module that held them; the empty-record gate is all that is left', () => {
    expect(Object.keys(howShort)).toEqual(['almostNothingHereYet']);
  });

  it('the service counts no answers before a close', () => {
    expect(SRC).not.toMatch(/theFloorFor|A_CHECK_IN_IS_NOT_DONE_IN|AN_UPDATE_IS_NOT_DONE_IN|A_CORRECTION_IS_NOT_DONE_IN|minTurns|tooFewAnswersToFinish/);
    expect(SRC).not.toMatch(/mayCompleteAfter/);
  });

  it('the engine and the server read the one gate', () => {
    expect([...SRC.matchAll(/almostNothingHereYet\(/g)].length).toBeGreaterThanOrEqual(2);
    const mayClose = SRC.slice(SRC.indexOf('private async mayClose('), SRC.indexOf('private closesInOtherWords('));
    expect(mayClose).toContain('almostNothingHereYet(');
    const complete = SRC.slice(SRC.indexOf('async complete('), SRC.indexOf("return this.finishTheSession(checkIn, 'the person'"));
    expect(complete).toContain('almostNothingHereYet(');
  });

  it('and the screen waits on no count: End session is on from the first message', () => {
    const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'chat', 'ChatPage.tsx'), 'utf8'));
    /* Changed 3 November evening: End session is in the header now (Hafsah: small and quiet, always visible), on from the first message. */
    expect(page).toMatch(/onEnd=\{opened && !done && !completed && !declined \?/);
    expect(page).not.toMatch(/\.length >= \d+ && \(/);
    expect(page).not.toMatch(/mayCompleteAfter/);
  });

  /*
   * THEIR SESSION, THEIR CALL. "That's it from me this week" was answered with "One more before this closes". Somebody who asked to
   * finish is let out before anything else is considered.
   */
  it('somebody who asked to finish is let out first', () => {
    const mayClose = SRC.slice(SRC.indexOf('private async mayClose('), SRC.indexOf('private closesInOtherWords('));
    const out = mayClose.indexOf('askedToFinish(personSaid)) return { ready: !nothingRealWasSaid(personSaid) };');
    expect(out).toBeGreaterThan(-1);
    expect(out).toBeLessThan(mayClose.indexOf('almostNothingHereYet('));
  });

  /*
   * A TEAM UPDATE OWES NOTHING BUT THE LEAD'S LINE. Its opener was the spine's first slot - "What did
   * you understand these updates are for?" - the setup question the pack forbids.
   */
  it('a team update has no owed spine to open with', () => {
    const which = SRC.slice(SRC.indexOf('private whichOwedListFor('), SRC.indexOf('private roleOfTheReaderFor('));
    expect(which).toContain("if (scenario === 'TEAM_UPDATES') return null;");
  });
});

/*
 * THE BUTTON IS THE SENTENCE. The open link's "I am done" reached complete() as nothing, so three
 * answers and a press met "a few more exchanges are needed" (22 Sep 2026). Pressing it is asking.
 */
describe('a press of "I am done" is asking to finish', () => {
  it('the button lets them out the way the sentence does', () => {
    expect(SRC).toMatch(/const theyEndedIt = !!how\.theyAskedToFinish \|\| askedToFinish\(/);
    expect(SRC).toMatch(/if \(!theyEndedIt && almostNothingHereYet\(/);
    const openLink = strip(readFileSync(join(__dirname, '..', 'entry', 'the-open-link.service.ts'), 'utf8'));
    expect(openLink).toContain('{ theyAskedToFinish: true }');
  });
});
