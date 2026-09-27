import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_OPENER_IS_ONE_MESSAGE, theRosterAlreadySaysWhoTheyAre } from './the-first-thing-it-says-is-its-own-job';

/**
 * THE FIRST THING IT SAYS IS ITS OWN JOB.
 *
 * Measured across all 22 situations from both sides on 18 September 2026: 15 of 22 lead openers and
 * 20 of 22 participant openers explained what the check-in was for before asking anything. The
 * engine prompt bans that, in the middle of 113,769 characters written for a conversation in
 * progress rather than for its first line.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SRC = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('the opener instruction', () => {
  it('bans explaining what the check-in is for, in the words it actually used', () => {
    for (const said of ['this check-in is for', 'this record is about', 'this is where you', 'it helps build a picture of']) {
      expect(THE_OPENER_IS_ONE_MESSAGE.toLowerCase()).toContain(said);
    }
  });

  it('and bans telling somebody what their answer means before they give it', () => {
    expect(THE_OPENER_IS_ONE_MESSAGE).toContain('Fine is often code for something not being fine');
  });

  it('asks for one question and something only this situation has', () => {
    expect(THE_OPENER_IS_ONE_MESSAGE).toMatch(/THEN ONE QUESTION/);
    expect(THE_OPENER_IS_ONE_MESSAGE).toMatch(/OPEN ON SOMETHING ONLY THIS SITUATION HAS/);
  });

  /* Short is the whole mechanism: it works because it is read, and it is read because it is last
     and small. The three-lines-last block is held to the same discipline for the same reason. */
  it('stays short enough to be read as an instruction', () => {
    expect(THE_OPENER_IS_ONE_MESSAGE.length).toBeLessThan(1800);
  });

  /*
   * AND THE OPENER IS BUILT FROM ITS OWN, SHORTER PROMPT. With the whole engine behind it the
   * instruction below was read and outweighed - 13 of 22 lead openers still explained what the
   * check-in was for. Most of the engine is about a conversation already underway.
   */
  it('is the last thing the opener call is given, after a prompt built for an opener', () => {
    expect(SRC).toContain('composeSystemPrompt(checkIn, undefined, { forTheOpener: true })');
    expect(SRC).toContain('THE_OPENER_IS_ONE_MESSAGE');
    /* And the retry is held to the same instruction, or a corrected opener loses it. */
    expect(SRC).toContain('theOpenerIsHeldToTheSameBar(checkIn.id, openerSystem, beginMessage');
  });
});

/**
 * AND THE QUESTION THAT LOOKED LIKE A FAULT AND IS NOT. WHO_ARE_YOU_IN_THIS is the product's own
 * first question to a non-lead in the seven starting situations, and on a new hire's ground with
 * two people the roster genuinely does not say which of them is the new hire. Asking is right.
 * What is not right is asking when the row already answers it.
 */
describe('whether the roster already says who they are', () => {
  it('is true when somebody was added with a role described', () => {
    expect(theRosterAlreadySaysWhoTheyAre('the new hire')).toBe(true);
    expect(theRosterAlreadySaysWhoTheyAre('her manager')).toBe(true);
  });

  it('and false when it says nothing, which is when the question earns its place', () => {
    expect(theRosterAlreadySaysWhoTheyAre(null)).toBe(false);
    expect(theRosterAlreadySaysWhoTheyAre('')).toBe(false);
    expect(theRosterAlreadySaysWhoTheyAre('  ')).toBe(false);
  });

  it('and the opener only asks when the roster is silent', () => {
    /* Request 36: only the person's own words count, never the lead's description of them. */
    expect(SRC).toContain('const theRosterIsSilent = !theRosterAlreadySaysWhoTheyAre(aRoleInTheirOwnWords(checkIn.participant as any))');
    expect(SRC).toMatch(/startsSomething && notTheLead && firstSession && theRosterIsSilent/);
  });
});
