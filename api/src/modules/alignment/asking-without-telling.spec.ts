/**
 * THE FAILURE HERE DOES NOT LOOK LIKE A FAILURE.
 *
 * "B mentioned Delta — was that approved?" reads helpful, gets a yes far more
 * often than the open question does, and the yes is worth nothing to either side.
 * The record is contaminated and no later care can uncontaminate it.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  Assertion,
  theQuestionLeaks,
  whatTheOtherSideIsAsked,
  whereItStandsNow,
  howItReads,
  AN_ASSERTION_IS_NOT_A_FACT,
} from './an-assertion-waits-for-the-other-side';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const CLAIM = 'Delta Foods was approved as a client under the agreement in March.';
const ABOUT = 'which clients have been approved under the agreement, and when';

const assertion = (over: Partial<Assertion> = {}): Assertion => ({
  claim: CLAIM,
  about: ABOUT,
  by: 'B',
  theOtherSide: 'A',
  state: 'said by one side',
  theirAccount: null,
  ...over,
});

describe('what gives a claim away', () => {
  it('catches the name at the centre of it', () => {
    expect(theQuestionLeaks(CLAIM, 'B mentioned Delta — was that approved?')).toContain('delta');
  });

  it('catches a paraphrase that keeps the distinctive words', () => {
    const leaks = theQuestionLeaks(CLAIM, 'Was Delta Foods approved in March?');
    expect(leaks).toEqual(expect.arrayContaining(['delta', 'foods', 'march']));
  });

  it('lets an open question about the subject through', () => {
    expect(theQuestionLeaks(CLAIM, 'Which clients have been approved, and when?', ABOUT)).toEqual([]);
  });

  it('the subject’s own words are not a leak, but the particulars still are', () => {
    /* A claim about an approval and a subject about approvals share "approved"
       necessarily. The client's name is what must not cross. */
    expect(theQuestionLeaks(CLAIM, 'Which clients have been approved?', ABOUT)).toEqual([]);
    expect(theQuestionLeaks(CLAIM, 'Was Delta approved?', ABOUT)).toEqual(['delta']);
  });

  it('does not trip on ordinary words two sentences share', () => {
    expect(theQuestionLeaks(CLAIM, 'What was agreed about the contract period?')).toEqual([]);
  });

  it('says WHICH words leak, so the fix is obvious', () => {
    /* A refusal that says "that leaks" and not what leaks is one somebody works
       around by rephrasing until it passes. */
    expect(theQuestionLeaks(CLAIM, 'Did you approve Delta?').length).toBeGreaterThan(0);
  });
});

describe('the question the other side gets', () => {
  it('is built from the subject alone', () => {
    const asked = whatTheOtherSideIsAsked(ABOUT);
    expect(theQuestionLeaks(CLAIM, asked, ABOUT)).toEqual([]);
    expect(asked).toContain('your own account');
  });

  it('and the function that builds it cannot see the claim', () => {
    /* Not a convention — there is no parameter for it. A function that cannot see
       the claim cannot leak it. */
    expect(whatTheOtherSideIsAsked.length).toBe(1);
  });
});

describe('where a claim stands', () => {
  it('starts as one side having said it', () => {
    expect(howItReads(assertion())).toContain('has not been asked about it yet');
  });

  it('two accounts that say the same are said as that', () => {
    const after = whereItStandsNow(assertion(), { theyAgree: true, theirAccount: 'Yes, Delta came on in March.' });
    expect(after.state).toBe('both sides say the same');
  });

  it('two accounts that differ are BOTH said, and neither is called wrong', () => {
    const after = whereItStandsNow(assertion(), { theyAgree: false, theirAccount: 'We never approved Delta.' });
    const said = howItReads(after);
    expect(said).toContain(CLAIM);
    expect(said).toContain('We never approved Delta.');
    expect(said).toContain('ordinary');
    for (const word of ['lying', 'false', 'incorrect', 'mistaken', 'wrong', 'denies']) {
      expect(said.toLowerCase()).not.toContain(word);
    }
  });

  it('and agreeing is a person’s judgement, never inferred', () => {
    /* whereItStandsNow takes what a person decided. Deciding whether two accounts
       of an approval agree is a judgement about meaning. */
    const source = withoutComments('an-assertion-waits-for-the-other-side.ts');
    const fn = source.slice(source.indexOf('export function whereItStandsNow'));
    expect(fn.slice(0, fn.indexOf('\n}'))).toContain('personSaid.theyAgree');
    expect(fn.slice(0, fn.indexOf('\n}'))).not.toMatch(/includes\(|match\(|similar|score/);
  });

  it('the rule given to a synthesis forbids picking a side', () => {
    expect(AN_ASSERTION_IS_NOT_A_FACT.toLowerCase()).toContain('never say which is correct');
    expect(AN_ASSERTION_IS_NOT_A_FACT.toLowerCase()).toContain('not what happened');
  });
});

describe('the claim never leaves the side that made it', () => {
  const service = withoutComments('assertions.service.ts');

  it('the read a session asks from cannot return a claim at all', () => {
    const fn = service.slice(service.indexOf('async whatIsWaitingOn('), service.indexOf('async asked('));
    expect(fn).toContain('select:');
    expect(fn).not.toMatch(/\bclaim:\s*true/);
    expect(fn).toContain('about: true');
  });

  it('a question that leaks is refused rather than logged', () => {
    const fn = service.slice(service.indexOf('async asked('), service.indexOf('async answered('));
    expect(fn).toContain('theQuestionLeaks');
    expect(fn).toContain('BadRequestException');
  });

  it('and a subject that is the claim in disguise is refused when it is written', () => {
    const fn = service.slice(service.indexOf('async said('), service.indexOf('async whatIsWaitingOn('));
    expect(fn).toContain('theQuestionLeaks(a.claim, a.about)');
    expect(fn).toContain('BadRequestException');
  });
});
