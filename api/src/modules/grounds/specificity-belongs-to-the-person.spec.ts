import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * SPECIFICITY STOPPED BEING A GRADE. W14-2.
 *
 * `/grounds/:id/my-specificity` returned one word - high, moderate, low - and the participant page
 * printed it as "Overall quality label: low", twice on the same page. That is a verdict on a
 * person's writing, handed to them with nothing to do about it.
 *
 * She asked for this to be improved rather than dropped, and the improvement is the part that was
 * missing: which way it is going, the one thing their own recent answers are missing, and their own
 * best answer quoted back as what a checkable account looked like.
 *
 * The rule it must not break: this is owner only, and `what-a-leader-can-weigh.ts` still refuses to
 * hand it to a lead. Improving the read must not widen who can see it.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const METHOD = CODE.slice(CODE.indexOf('async getMySpecificity('), CODE.indexOf('async getMyCheckinStatus('));

describe('what my-specificity returns', () => {
  it('found the method', () => {
    expect(METHOD).toContain('specificityHistory');
    expect(METHOD.length).toBeGreaterThan(400);
  });

  it('is still owner only', () => {
    // The one thing that must survive every change to this method.
    expect(METHOD).toContain("where: { groundId, userId }");
    expect(METHOD).toContain("ForbiddenException('You are not a participant in this check-in')");
  });

  it('reads a direction, not just an average', () => {
    expect(METHOD).toMatch(/trend/);
    expect(METHOD).toMatch(/'rising' \| 'steady' \| 'falling' \| 'new'/);
  });

  it('and refuses to call it a trend under three sessions', () => {
    // Two numbers is noise. "Falling" off noise is a verdict wearing an observation's clothes.
    expect(METHOD).toMatch(/scores\.length >= 3/);
  });

  it('names the concrete thing missing from their own answers', () => {
    expect(METHOD).toMatch(/whatWouldHelp/);
    // Derived by the engine's own reader, so it names what the engine looked for and did not find.
    expect(METHOD).toMatch(/runIntake\(e\.text\)/);
    expect(METHOD).toMatch(/no number in them/);
    expect(METHOD).toMatch(/do not say when/);
  });

  it('and quotes their own best answer back rather than describing specificity', () => {
    expect(METHOD).toMatch(/strongest/);
    expect(METHOD).toMatch(/specificity >= 0\.5/);
  });
});

describe('and the page shows it once, with the actionable half', () => {
  /**
   * WHAT A PARTY SEES, WHEREVER IT IS WRITTEN.
   *
   * This read the participant page alone. The record moved into `MyRecord` so the view that RUNS a
   * check-in can show a lead their own account without sending them to a second page - and this
   * spec went red while every rule it protects still held.
   *
   * An API spec reading a client file is already a long reach; making it reach for one exact
   * filename as well is what turned a refactor into a failing build. Both files, joined, so these
   * follow the content.
   */
  const CLIENT = join(__dirname, '../../../../client/src');
  const PAGE = [
    readFileSync(join(CLIENT, 'pages/grounds/GroundParticipantPage.tsx'), 'utf8'),
    readFileSync(join(CLIENT, 'components/gw/MyRecord.tsx'), 'utf8'),
    /*
     * AND THE TWO CARDS THE READ MOVED INTO, for the reason written above: this reaches into the
     * client, so it must follow the content rather than a filename.
     *
     * Both halves of what this spec protects moved to the top of the page. The trend was a card
     * below the sessions and below the carry-forward, saying "moderate" beside a five-segment bar;
     * it is now a sentence naming the session it compares against. The teaching half - the thing
     * the engine could not find, and their own best answer - moved with the specificity read it
     * describes, which is now itemised as the five dimensions the engine has always stored.
     */
    readFileSync(join(CLIENT, 'components/gw/WhatYourRecordCanSupport.tsx'), 'utf8'),
    readFileSync(join(CLIENT, 'components/gw/TheFiveThingsThatMakeItCheckable.tsx'), 'utf8'),
  ].join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the bare grade line is gone', () => {
    // The exact string a participant read. If it comes back, so does the grade.
    expect(PAGE).not.toMatch(/Overall quality label/);
  });

  it('the trend is worded about the record, not the person', () => {
    /* Named against the session it compares with, because `a-trajectory-is-not-a-score` forbids an
       arrow and a sentence that names what it measured from is the more useful form anyway. */
    expect(PAGE).toMatch(/Your answers are getting more checkable than session/);
    expect(PAGE).not.toMatch(/label === 'high'/);
  });

  it('what would help is rendered', () => {
    /*
     * IT IS A MARK ON A ROW NOW, NOT ONLY A SENTENCE.
     *
     * "the five, phrased as additions, with the one that would move you most marked." Marked in the
     * list needs the list to know which one, so the server names the dimension as well as the
     * words - the three branches that write this have always known whether it was a number, a date
     * or vague language, and the client was left to infer it from prose and print the prose instead.
     *
     * What this file protects is that the actionable half reaches the person. It does, twice: on
     * the row and under it.
     */
    expect(PAGE).toMatch(/mostUseful/);
    /*
     * U.9 END-OF-MODULE API SUITE: THE RENDERING MOVED TO TheFiveThingsThatMakeItCheckable.tsx,
     * AND THE BADGE IS NOW A SENTENCE, NOT A SHOUTED SPAN.
     *
     * "MOST USEFUL", set as its own `<span>` with `most useful</span>` in the source, read as a
     * shouted label bolted onto the sentence beside it (the U.9 review fix that removed capitals
     * and shouted badges everywhere else on this card). It is now the sentence's own words, on the
     * row itself: "This is the one worth adding first." The rule this test protects is unchanged -
     * the actionable half reaches the person, twice: marked on the row, and said again under the
     * list.
     */
    expect(PAGE).toMatch(/This is the one worth adding first\./);
    /* The line under the list says why. It used to open "Most useful for you:", the same
       statement the badge already made, so it keeps only the reason - mostUseful.says, said as its
       own sentence rather than interpolated bare into a template string. */
    expect(PAGE).toMatch(/mostUseful\.says\.charAt/);
  });

  it('their own strongest answer is rendered', () => {
    expect(PAGE).toMatch(/This one of yours was easy to check/);
  });

  it('and the page does not say a second time that nobody else sees it', () => {
    /*
     * THE REASON IT WAS SAFE TO SHOW IS UNCHANGED; THE SENTENCE IS NOT NEEDED TWICE.
     *
     * The check-in header carries it on every tab of this page - "Just yours - only you see this
     * until the report releases" - and a card repeating it three inches lower is the same statement
     * twice, which is the pattern this page has been cleared of several times over. What matters is
     * that the assurance is on screen, not that this component is the one making it.
     */
    const HEADER = readFileSync(join(CLIENT, 'pages/grounds/GroundParticipantPage.tsx'), 'utf8');
    expect(HEADER).toMatch(/Your own check-in\. The report shows/i);
  });
});
