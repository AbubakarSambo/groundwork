import { withoutAThingTheLeadListedAsTheirs, WHAT_IS_ASKED_INSTEAD } from './a-thing-the-lead-listed-is-not-theirs';
import { withoutARecordClaimNobodyHolds, WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT } from './a-record-claim-nobody-holds';
import { withAQuestion, WHAT_ELSE, aQuestionNotYetAsked, PLAIN_QUESTIONS } from './nobody-is-left-looking-at-a-paragraph';
import { insteadOfAFiller } from './the-same-sentence-five-times';

/**
 * A PLAIN QUESTION IS ASKED ONCE IN A CHECK-IN. Hauwa (re-d, loans, 1 October 2026) read "What has
 * happened for you since this began?" as her opener and twice more; Amina (re-c, seniorhire, session 3)
 * read "What else should I know?" twice. Each came from a fallback that put its one sentence on any turn.
 */

const BRIEF =
  'Eight people took an asset loan from us six months ago - a grinding machine, a freezer, a tricycle, a borehole pump. '
  + 'Repayment is behind across the cohort.';

/* Hauwa's check-in as she read it, up to the turn that repeated the question the first time. Live, re-d. */
const HAUWA_AI_SO_FAR = [
  'What has happened for you since this began?',
  'What income has the freezer business generated so far?',
  'And what has been the main thing that has prevented you from making repayments?',
  'That two-month delay meant no income in the period you would have started repayments. Was that delay something you could have influenced?',
  'Income is price times volume. With nothing said about how much you sell, a rise here could be the price you get moving on its own. Which of the two are you aiming at?',
  'You would read this off sales records. Whose records are those?',
  'What would it take to get those records into a form Amaka could read? Not to send them to Amaka, but so you could both read them together and confirm the numbers.',
];
const HAUWA_SAID = [
  "I got the freezer. I'm selling frozen fish now.",
  'I earn about N30,000 a week now.',
  'It took me about two months to get the fish supply sorted. So I had no income then.',
  'No, it was just how long it took to get the supply chain working.',
  "I'm not sure what you mean. I sell the fish at market price.",
  'They are my records. I keep them.',
  'I can show them to her. They are written down.',
];
/* The kind of reply the net cuts: a listed asset said to her as hers. The live text before the cut was not kept. */
const NAMES_ANOTHER_ASSET = 'Understood. When did your grinding machine start working?';

describe('the fallback after a listed thing is cut is never a question this check-in already asked', () => {
  it('before: Hauwa was asked the opener again; now she is asked a plain question she has not been asked', () => {
    const r = withoutAThingTheLeadListedAsTheirs(NAMES_ANOTHER_ASSET, BRIEF, HAUWA_SAID, HAUWA_AI_SO_FAR);
    expect(r.cut).toEqual(['When did your grinding machine start working?']);
    expect(r.text).toBe('Understood. What else should I know?');
    expect(r.text).not.toContain(WHAT_IS_ASKED_INSTEAD);
  });

  it('the next time it is cut in the same check-in, the question moves on again', () => {
    const later = [...HAUWA_AI_SO_FAR, 'Understood. What else should I know?', 'What did you understand your loan repayment schedule to be?'];
    const r = withoutAThingTheLeadListedAsTheirs(NAMES_ANOTHER_ASSET, BRIEF, HAUWA_SAID, later);
    expect(r.text).toBe('Understood. What would you like to add about that?');
  });

  it('in a check-in that has not asked it, the open question is still the one used', () => {
    const r = withoutAThingTheLeadListedAsTheirs(NAMES_ANOTHER_ASSET, BRIEF, [], []);
    expect(r.text).toBe(`Understood. ${WHAT_IS_ASKED_INSTEAD}`);
  });

  it('a question left in the turn stands as it is', () => {
    const r = withoutAThingTheLeadListedAsTheirs('Your grinding machine is working. How much do you sell in a week?', BRIEF, HAUWA_SAID, HAUWA_AI_SO_FAR);
    expect(r.text).toBe('How much do you sell in a week?');
  });

  it('with every plain question already asked, the turn is never left empty', () => {
    const all = [WHAT_IS_ASKED_INSTEAD, ...PLAIN_QUESTIONS];
    expect(withoutAThingTheLeadListedAsTheirs('When did your grinding machine start working?', BRIEF, [], all).text).toBe(WHAT_IS_ASKED_INSTEAD);
    expect(withoutAThingTheLeadListedAsTheirs(NAMES_ANOTHER_ASSET, BRIEF, [], all).text).toBe('Understood.');
  });
});

describe('the record-claim fallback and the dead-end question are never repeated either', () => {
  it('a reply that was only a record claim asks a question not yet asked', () => {
    const claim = 'The record from our side shows that weekly repayments have not been made.';
    expect(withoutARecordClaimNobodyHolds(claim, []).text).toBe(WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT);
    expect(withoutARecordClaimNobodyHolds(claim, ['What would you like to add about that?']).text).toBe(WHAT_ELSE);
  });

  it('Amina, re-c: "What else should I know?" once, then a different plain question', () => {
    const earlier = ['Understood.\n\nWhat else should I know?'];
    expect(withAQuestion('Understood.', { asked: [] })).toBe(`Understood.\n\n${WHAT_ELSE}`);
    expect(withAQuestion('Understood.', { asked: earlier })).toBe('Understood.\n\nWhat would you like to add about that?');
  });

  it('a cut reply that leaves nothing reads a plain acknowledgement and a question not yet asked', () => {
    expect(insteadOfAFiller(3, ['Noted. What else should I know?'])).toBe('Understood. What would you like to add about that?');
  });

  it('the same question in other letter case or punctuation counts as asked', () => {
    expect(aQuestionNotYetAsked(WHAT_ELSE, ['what else should I know'])).toBe('What would you like to add about that?');
  });
});
