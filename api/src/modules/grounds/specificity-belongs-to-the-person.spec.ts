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
    /* The label went with the card. What matters is that the line reaches the person, and it now
       sits directly under the five things it is telling them how to fix. */
    expect(PAGE).toMatch(/whatWouldHelp/);
    expect(PAGE).toMatch(/\{whatWouldHelp\}/);
  });

  it('their own strongest answer is rendered', () => {
    expect(PAGE).toMatch(/This one of yours was easy to check/);
  });

  it('and the page says out loud that nobody else sees it', () => {
    /**
     * The reason this is safe to show at all is that it goes nowhere else. A person reading
     * feedback on their own writing will assume their lead is reading it too unless told.
     */
    expect(PAGE).toMatch(/never shown to the lead/);
  });
});
