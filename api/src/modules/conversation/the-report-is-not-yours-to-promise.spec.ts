import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { theReportIsNotTheirsYet, withoutPromisingTheReport, WHAT_ACTUALLY_HAPPENS_NEXT } from './the-report-is-not-yours-to-promise';

/**
 * "IT ALSO TOLE MY COLLEGUE THE REPORT IS READY." Hafsah, 23 September 2026.
 *
 * It was not. On a check-in run across a network there is no report at the end of any single
 * conversation: it is synthesised once enough accounts are in and it reaches people when the
 * ORGANISER sends it, which may be days later.
 */
describe('whose report it is', () => {
  it('the organiser\'s, on the check-ins people reach by a link', () => {
    expect(theReportIsNotTheirsYet('TEAM_UPDATES')).toBe(true);
    expect(theReportIsNotTheirsYet('OPEN_READ')).toBe(true);
  });

  /* On a two-person alignment check-in the sentence is true: the report exists the moment the last
     person finishes, and it is theirs. Nothing about those changes. */
  it('and theirs on a check-in between a few people', () => {
    expect(theReportIsNotTheirsYet('NEW_HIRE')).toBe(false);
    expect(theReportIsNotTheirsYet('DRIFT')).toBe(false);
    expect(theReportIsNotTheirsYet(null)).toBe(false);
  });
});

describe('what comes out of the closing turn', () => {
  it('the claim goes, and what is true goes in its place', () => {
    const said = 'Thank you for that. Your report is ready now. Speak soon.';
    const out = withoutPromisingTheReport(said);
    expect(out).not.toMatch(/report is ready/i);
    expect(out).toContain('Thank you for that.');
    expect(out).toContain(WHAT_ACTUALLY_HAPPENS_NEXT);
  });

  /* A turn that says the report is ready AND that it comes later is worse than either alone. */
  it('and it is said once, not appended', () => {
    const out = withoutPromisingTheReport('Your report is ready now.');
    expect(out).toBe(WHAT_ACTUALLY_HAPPENS_NEXT);
  });

  it('and "nothing in it needs acting on" goes too, because there is no it yet', () => {
    expect(withoutPromisingTheReport('Your report is ready now, and nothing in it needs acting on today.'))
      .toBe(WHAT_ACTUALLY_HAPPENS_NEXT);
  });

  /* Only the claim. A turn that never made one comes back untouched, word for word. */
  it('and a turn that promised nothing is unchanged', () => {
    const said = 'Thirty thousand women farmers. Which states?';
    expect(withoutPromisingTheReport(said)).toBe(said);
  });
});

describe('and it is read rather than asked for', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  /*
   * The prompt already said "Until the session is actually closing, never say the report is ready"
   * before today, and the sentence arrived anyway in two separate runs. That is what a prompt rule
   * is worth against a phrase the model has good reason to reach for.
   */
  it('on the reply, against the ground\'s own scenario', () => {
    expect(SRC).toMatch(/if \(theReportIsNotTheirsYet\(thisGroundsScenario\)\)/);
    expect(SRC).toMatch(/withoutPromisingTheReport\(aiTurn\.content \?\? ''\)/);
  });

  /*
   * AND AFTER THE CLOSE IS ASSEMBLED, WHICH IS WHERE IT HAD TO MOVE TO.
   *
   * The first version sat with the other reply guards and it worked on the run where the model wrote
   * the promise into its own reply. The very next run read "Your report is ready now. Speak soon."
   * because the goodbye is not written by the model at all - the close is built after every guard has
   * finished, so a guard that ran before the sentence existed did not run.
   */
  it('and after the goodbye exists, not before', () => {
    const closeBuilt = SRC.indexOf('const sessionComplete = close.ready');
    expect(closeBuilt).toBeGreaterThan(-1);
    expect(SRC.indexOf('if (theReportIsNotTheirsYet(thisGroundsScenario))')).toBeGreaterThan(closeBuilt);
  });

  /* And the streamed path too, where the correction rides on the final reply the page keeps. */
  it('and on the streaming path, against the same scenario', () => {
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect(SRC).toMatch(/if \(theReportIsNotTheirsYet\(thisGroundsScenario\)\)/);
    expect(theStreamedRouteRunsThePlainRoute(SRC)).toBe(true);
  });

  it('and it says so in the log, so nobody has to read a transcript to find out', () => {
    expect(SRC).toMatch(/promised a report that is the organiser's to release/);
  });
});
