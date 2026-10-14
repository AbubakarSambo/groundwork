import { readFileSync } from 'fs';
import { join } from 'path';
import { theFloorFor, A_CHECK_IN_IS_NOT_DONE_IN, A_CORRECTION_IS_NOT_DONE_IN, AN_UPDATE_IS_NOT_DONE_IN } from './how-short-a-check-in-may-be';

/**
 * THE ENGINE AND THE SERVER READ THE SAME FLOOR.
 *
 * When they disagree it is a deadlock, not friction: the engine offers the close, the client
 * disables the composer because the session is over, the person presses finish, and the server
 * refuses for being one turn short with no way left to add one. That has happened on live runs.
 *
 * The number was written out twice. It is a constant now, and this fails if anybody inlines it
 * again.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('one floor, read in both places', () => {
  it('the service never inlines the turn floor again', () => {
    /* Narrow to the variable this file owns. `MIN_CHARS` and `MIN_REAL_TURNS` next to it are
       different rules - how much somebody has to have written, and how many turns count as real -
       and both still apply on top of this one. */
    expect(SRC).not.toMatch(/minTurns\s*=\s*[^;]*\?\s*\d+\s*:\s*\d+/);
  });

  /*
   * PILOTS, 13 OCTOBER 2026, PROBLEM 4: TWO FLOORS NOW, EACH IN ONE PLACE. Groundwork closing on its own reads
   * theFloorFor (five); a person's own finish, and the screen's offer of it, read theFloorForAPersonsFinish (three),
   * because "finish" after four answers was refused three times in a row. Changed from one count of five.
   */
  it('every place reads it from the one module: the engine, the server, and the three replies that tell the screen', () => {
    expect([...SRC.matchAll(/theFloorFor\(/g)]).toHaveLength(1);
    /* Five since the reviewer's 14 October pass: "finish" too soon says how many more answers, read from the same floor. */
    expect([...SRC.matchAll(/theFloorForAPersonsFinish\(/g)]).toHaveLength(5);
  });

  it('a check-in does not close on three answers any more', () => {
    /* Read live: a session offered to finish after three, on a product that says ten minutes. */
    expect(A_CHECK_IN_IS_NOT_DONE_IN).toBeGreaterThan(3);
    expect(theFloorFor(false)).toBe(A_CHECK_IN_IS_NOT_DONE_IN);
  });

  it('and a correction still takes one, because it is one thing', () => {
    expect(theFloorFor(true)).toBe(A_CORRECTION_IS_NOT_DONE_IN);
    expect(A_CORRECTION_IS_NOT_DONE_IN).toBe(1);
  });

  /*
   * Hafsah, 22 Sep 2026, after giving an update: "I just got 'a few more exchanges are needed' as a
   * pop, so I couldn't end the session." An update is one question answered; three is its floor.
   */
  it('a team update closes on three, whoever is answering it', () => {
    expect(AN_UPDATE_IS_NOT_DONE_IN).toBe(3);
    expect(theFloorFor(false, 'TEAM_UPDATES')).toBe(AN_UPDATE_IS_NOT_DONE_IN);
    expect(theFloorFor(false, 'NEW_HIRE')).toBe(A_CHECK_IN_IS_NOT_DONE_IN);
    expect(theFloorFor(true, 'TEAM_UPDATES')).toBe(A_CORRECTION_IS_NOT_DONE_IN);
  });

  it('the server reads the scenario into the floor at both ends', () => {
    /* Both calls pass a scenario; a call with one argument would be the full floor on an update. */
    /* The call's argument list, read to its closing paren with the nested parens of `!!(checkIn as any)` inside it. */
    for (const m of SRC.matchAll(/theFloorFor(?:ForAPersonsFinish)?\(((?:[^()]|\([^()]*\))*)\)/g)) expect(m[1]).toMatch(/,\s*(scenarioOfThis|\(row as any\)|\(ground as any\))/);
  });

  /*
   * THE SCREEN READS THE FLOOR FROM THE SERVER. It kept its own copy at three; the server's went to
   * five on 11 September, and for ten days the page offered "Complete session" two answers before the
   * server would honour it. Now the server sends `mayCompleteAfter` with the session and the page
   * offers at that count. This fails if either half stops.
   */
  it('and tells the screen, which never inlines a number of its own', () => {
    expect(SRC.match(/mayCompleteAfter: theFloorForAPersonsFinish\(/g)).toHaveLength(3);
    const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'chat', 'ChatPage.tsx'), 'utf8'));
    /* The count is the answers the server kept (60835ba84, release check): still the server's own floor, never a number of the screen's. */
    expect(page).toMatch(/answersTheServerKept\(msgs\) >= mayCompleteAfter && \(/);
    expect(page).not.toMatch(/\.length >= \d+ && \(/);
    expect(page).toContain('setMayCompleteAfter(res.mayCompleteAfter)');
    expect(page).toContain('setMayCompleteAfter(t.mayCompleteAfter)');
  });

  /*
   * THEIR SESSION, THEIR CALL, BEFORE ANY COUNT OR HOLD. "That's it from me this week" was answered
   * with "One more before this closes". Somebody who asked to finish is let out before the floor and
   * before either hold is considered.
   */
  it('somebody who asked to finish is let out before the floor and the holds', () => {
    const mayClose = SRC.slice(SRC.indexOf('private async mayClose('), SRC.indexOf('private closesInOtherWords('));
    const out = mayClose.indexOf('if (askedToFinish(personSaid)) return { ready: true };');
    expect(out).toBeGreaterThan(-1);
    expect(out).toBeLessThan(mayClose.indexOf('theFloorFor('));
    /* The one hold there is - see the budget note in mayClose - comes after the way out. */
    expect(out).toBeLessThan(mayClose.indexOf('Holding the close once'));
  });

  /*
   * A TEAM UPDATE OWES NOTHING BUT THE LEAD'S LINE. Its opener was the spine's first slot - "What did
   * you understand these updates are for?" - the setup question the pack forbids.
   */
  it('a team update has no owed spine to open with or hold for', () => {
    const which = SRC.slice(SRC.indexOf('private whichOwedListFor('), SRC.indexOf('private roleOfTheReaderFor('));
    expect(which).toContain("if (scenario === 'TEAM_UPDATES') return null;");
  });
});

/*
 * THE BUTTON IS THE SENTENCE. The open link's "I am done" reached complete() as nothing, so three
 * answers and a press met "a few more exchanges are needed" (22 Sep 2026). Pressing it is asking.
 */
describe('a press of "I am done" is asking to finish', () => {
  it('the floor lets the button out the way it lets the sentence out', () => {
    expect(SRC).toMatch(/personTurnRows\.length < minTurns && !how\.theyAskedToFinish && !askedToFinish\(/);
    const openLink = strip(readFileSync(join(__dirname, '..', 'entry', 'the-open-link.service.ts'), 'utf8'));
    expect(openLink).toContain('{ theyAskedToFinish: true }');
  });
});
