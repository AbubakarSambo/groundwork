import { whatToProbe } from './what-to-probe';

/**
 * ITEM 21, THE FOUNDER'S BOARD: A WAIT ON THE READER IS THEIRS TO ANSWER, NOT THE OTHER PERSON'S TO RAISE HIGHER.
 *
 * "A second founder joining" (local test database, 9a904212): Ada, who runs it, read in
 * coaching.eachPerson[].probe "Tunde Bakare has been waiting on you for the formalized agreement, the
 * co-founder agreement and an explicit handoff of decisions and processes since 30 September, and
 * nothing on record says it was raised higher. Ask what has stopped Tunde Bakare raising it." Nobody
 * sits above the founder, and the person who can move it is the one reading. The probe list is served
 * to whoever runs the check-in only; request-102-a-closed-session-keeps-its-own-coaching.spec serves it
 * as each reader.
 */
const probeFor = (waitingOn: any[], sessionNumber = 6) => whatToProbe({
  who: 'Tunde Bakare', participantId: 'p-tunde', role: 'Incoming co-founder and CTO', answeredThisSession: true,
  waitingOn, holdingUp: [], concrete: [], documentsAttached: 0, sessionNumber, totalSessions: 6, scenario: 'NEW_COFOUNDER',
});
const ON_ADA = ['the formalized agreement', 'the co-founder agreement', 'an explicit handoff of decisions and processes']
  .map((what) => ({ what, who: 'you', daysOld: 3, escalated: false, since: '30 September' }));

describe('a wait on the person reading the probe', () => {
  it('Ada reads that the three things are hers to answer', () => {
    expect(probeFor(ON_ADA).probe).toEqual([
      'Tunde Bakare has been waiting on you for the formalized agreement, the co-founder agreement and an explicit handoff of decisions and processes since 30 September. Give Tunde Bakare an answer, or say when you will.',
    ]);
  });
  it('and early on too, never "worth showing Tunde rather than asking about"', () => {
    expect(probeFor(ON_ADA, 1).probe.join(' ')).not.toMatch(/raised higher|rather than asking/);
  });
  /* F2 (Hafsah, 2 November 2026; false-flags.md cause 1): the wait is the fact and the lead is given a question, never a finding from silence. */
  it('a wait on somebody else is said as the fact, with a question to ask', () => {
    expect(probeFor([{ what: 'the lawyer\'s draft', who: 'the lawyer', daysOld: 3, escalated: false, since: '30 September' }]).probe)
      .toEqual(['Tunde Bakare has been waiting on the lawyer for the lawyer\'s draft since 30 September.']);
  });
  it('one on the reader and one on somebody else are each said their own way', () => {
    const p = probeFor([ON_ADA[0], { what: 'the lawyer\'s draft', who: 'the lawyer', daysOld: 3, escalated: false, since: '30 September' }]).probe;
    expect(p[0]).toBe('Tunde Bakare has been waiting on you for the formalized agreement since 30 September. Give Tunde Bakare an answer, or say when you will.');
    expect(p[1]).toMatch(/^Tunde Bakare has been waiting on the lawyer for the lawyer's draft since 30 September\.$/);
  });
});
