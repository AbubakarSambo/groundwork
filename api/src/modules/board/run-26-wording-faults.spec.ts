import { anArticleSaidMidSentence, aThingWithoutItsHolder, theReaderSaidAsYou } from './a-holder-in-their-own-words';
import { whatItIsHoldingUp } from './the-blockers';
import { sheIsTheReaderToo } from './the-room-as-each-reader-reads-it';
import { theThingsTheyDisagreeOnAreSentences } from '../reports/the-things-people-disagree-on-are-sentences';
import { withoutLinesWithNoWords } from '../reports/a-line-with-no-words-is-not-a-line';
import { whatToWorkOnNext } from '../reports/what-to-work-on-next';
import { whatToProbe } from '../reports/what-to-probe';

/**
 * The smaller faults of run 26, read as a person reads them. Each case below failed on the code before this change.
 */
describe('run 26: the wording faults', () => {
  it('"Everyone involved in the project" is said in lower case in the middle of a sentence', () => {
    expect(`You are waiting on ${anArticleSaidMidSentence('Everyone involved in the project')} for the sign-off.`)
      .toBe('You are waiting on everyone involved in the project for the sign-off.');
    expect(anArticleSaidMidSentence('Everyone')).toBe('Everyone');
  });

  it('a thing that can go ahead is not given "will", and a clause with its own verb keeps it', () => {
    expect(whatItIsHoldingUp('testing and deployment', null, 'Samuel Otieno')).toBe('Once it is cleared, testing and deployment can go ahead.');
    expect(whatItIsHoldingUp('people can write code', null, 'You')).toBe('Once it is cleared, people can write code.');
  });

  it('the provider is not said twice', () => {
    const what = aThingWithoutItsHolder('the sandbox credentials from the provider', 'the provider');
    expect(`Samuel Otieno is waiting on the provider for ${what}.`).toBe('Samuel Otieno is waiting on the provider for the sandbox credentials.');
    expect(aThingWithoutItsHolder('the signed order from Lakeside', 'Marketing')).toBe('the signed order from Lakeside');
  });

  it('the reader\'s own name inside words about what somebody else will do is "you"', () => {
    expect(theReaderSaidAsYou('Tunde Bakare committed to clarify this with Ada directly.', ['Ada Okafor', 'Ada'])).toBe('Tunde Bakare committed to clarify this with you directly.');
    expect(theReaderSaidAsYou('the work on Ada\'s desk', ['Ada'])).toBe('the work on your desk');
    expect(theReaderSaidAsYou('a note for Adaeze', ['Ada'])).toBe('a note for Adaeze');
  });

  it('"to her" and "to him" at the end of a clause are the reader too', () => {
    expect(sheIsTheReaderToo('It falls to her.')).toBe('It falls to you.');
    expect(sheIsTheReaderToo('That would go to him, and he would decide.')).toBe('That would go to you, and you would decide.');
  });

  it('what people disagree on is sentences, never ".;" and never a colon after the count', () => {
    const joined = 'All nine people have answered. They disagree on three things: The schedule is wrong.; The scope is not agreed.; There is no process.';
    expect(theThingsTheyDisagreeOnAreSentences(joined))
      .toBe('All nine people have answered. They disagree on three things. The schedule is wrong. The scope is not agreed. There is no process.');
  });

  it('a line of the shared picture with no words in it is not served', () => {
    const served = withoutLinesWithNoWords({ sharedPictureLines: [{ text: 'Femi will visit on Friday.' }, { text: '  ', mark: 'said' }] });
    expect(served.sharedPictureLines).toEqual([{ text: 'Femi will visit on Friday.' }]);
  });

  const coaching = (over: Record<string, any>) => whatToWorkOnNext({
    patterns: [], role: null, detectedFunction: 'CEO', functionConfidence: 0.9, noticedBehaviour: null,
    sessionNumber: 1, totalSessions: 1, scenario: null, waitingOn: [], holdingUp: [],
    saidSomethingSpecific: true, anythingDocumented: true, ...over,
  } as any);

  it('a borrower who gave no role is not coached as a "Founder or CEO"', () => {
    const note = coaching({});
    expect(JSON.stringify(note)).not.toMatch(/founder or ceo/i);
    expect(note.whyNoRoleMap).toBe('No role was given, so this is about where you are in the check-in rather than about a kind of work.');
  });

  it('what somebody waits for keeps "my" out of the coach\'s own sentences, and quotation marks are left alone', () => {
    const note = coaching({ role: 'Field officer', waitingOn: [{ what: 'my loan cleared', who: 'the bank', daysOld: 3, escalated: true }] });
    expect(note.beforeNextTime.join(' ')).toContain('You have already taken your loan cleared to somebody above them.');
    const probe = whatToProbe({
      who: 'Musa Danjuma', participantId: 'p1', role: null, answeredThisSession: true, patterns: [], concrete: [], documentsAttached: 0,
      sessionNumber: 1, totalSessions: 3, scenario: null, holdingUp: [],
      waitingOn: [{ what: 'my loan cleared', who: 'the bank', daysOld: 3, escalated: true }],
    } as any);
    expect(probe.probe.join(' ')).not.toMatch(/\bmy\b/);
  });
});
