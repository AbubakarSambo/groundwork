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
    expect(METHOD).toContain("ForbiddenException('You are not a party to this ground')");
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
  const PAGE = readFileSync(
    join(__dirname, '../../../../client/src/pages/grounds/GroundParticipantPage.tsx'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the bare grade line is gone', () => {
    // The exact string a participant read. If it comes back, so does the grade.
    expect(PAGE).not.toMatch(/Overall quality label/);
  });

  it('the trend is worded about the record, not the person', () => {
    expect(PAGE).toMatch(/Your answers are getting more specific/);
    expect(PAGE).not.toMatch(/label === 'high'/);
  });

  it('what would help is rendered', () => {
    expect(PAGE).toMatch(/specificity\?\.whatWouldHelp &&/);
    expect(PAGE).toMatch(/What would make the next one land harder/);
  });

  it('their own strongest answer is rendered', () => {
    expect(PAGE).toMatch(/specificity\?\.strongest &&/);
  });

  it('and the page says out loud that nobody else sees it', () => {
    /**
     * The reason this is safe to show at all is that it goes nowhere else. A person reading
     * feedback on their own writing will assume their lead is reading it too unless told.
     */
    expect(PAGE).toMatch(/never shown to the lead/);
  });
});
