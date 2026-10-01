import { linesBuiltAtTheRead } from './a-line-built-at-the-read-is-read-too';
import { whatToProbe } from './what-to-probe';
import { theVerbAgreesWithYou } from './party-labels';

/**
 * Seniorhire, check-3, the lead's report, probes[].probe, served word for word as:
 *   "you is waiting on them for the initiation of commercial discussions. Ask what that is waiting on."
 * The probe is built at the read with the reader's "you" already in it, so no serve-time rule reached it.
 */
const EXACT = 'you is waiting on them for the initiation of commercial discussions. Ask what that is waiting on.';

describe('a line built at the read is held to the same tests', () => {
  it('the exact line reads right', () => {
    expect(linesBuiltAtTheRead({ probe: [EXACT] })).toEqual({
      probe: ['You are waiting on them for the initiation of commercial discussions. Ask what that is waiting on.'],
    });
  });

  it('and the builder that wrote it, with the lead reading, now serves it right', () => {
    const built = whatToProbe({
      who: 'Tobi Adewale', participantId: 'p-tobi', role: null, answeredThisSession: true, patterns: [],
      waitingOn: [], holdingUp: [{ what: 'the initiation of commercial discussions', who: 'you', daysOld: 0 }],
      concrete: [], documentsAttached: 0, sessionNumber: 2, totalSessions: 3, scenario: 'NEW_HIRE',
    });
    const served = linesBuiltAtTheRead(built);
    expect(served.probe[0]).toMatch(/^You are waiting on Tobi Adewale/);
    expect(JSON.stringify(served)).not.toMatch(/\byou is\b/i);
  });

  it('was, has and does agree as well, and an adverb between does not stop it', () => {
    expect(theVerbAgreesWithYou('you was told on Friday.')).toBe('You were told on Friday.');
    expect(theVerbAgreesWithYou('Since then you has sent it, and you does not know when.')).toBe('Since then you have sent it, and you do not know when.');
    expect(theVerbAgreesWithYou('you also is waiting on Tobi.')).toBe('You also are waiting on Tobi.');
  });

  it('never where "you" is the object of a preposition, and never inside somebody\'s words', () => {
    expect(theVerbAgreesWithYou('A key worry for you is that the date moved.')).toBe('A key worry for you is that the date moved.');
    expect(theVerbAgreesWithYou('Tobi wrote "you is late" in the notes.')).toBe('Tobi wrote "you is late" in the notes.');
  });

  it('a line of a list that still fails a test that may drop is not shown; a field on its own stays', () => {
    const dropped: string[] = [];
    const out = linesBuiltAtTheRead({ probe: ['The initiator is waiting on Tobi.', 'Ask Tobi what is next.'], triedToUnblock: 'The initiator is waiting.' }, dropped);
    expect(out).toEqual({ probe: ['Ask Tobi what is next.'], triedToUnblock: 'The initiator is waiting.' });
    expect(dropped).toEqual(['The initiator is waiting on Tobi.']);
  });

  it('leaves identifiers and names alone', () => {
    expect(linesBuiltAtTheRead({ who: 'you is', participantId: 'p-1' })).toEqual({ who: 'you is', participantId: 'p-1' });
  });
});
