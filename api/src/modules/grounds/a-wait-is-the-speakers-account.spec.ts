import { whatTheyTriedInFull, theWaitIsConfirmed } from './a-wait-is-the-speakers-account';

/*
 * The note beside a claim about a colleague says what the speaker said they tried, in full with its day, or nothing (Hafsah, 2 November
 * 2026: silence is never a finding). "Not backed: no attempt to unblock mentioned. X could have messaged ..." and its word list are gone;
 * what was tried is the record's `triedSaid`, the model's reading of what the speaker said they did.
 */
describe('the note beside a claim about a colleague', () => {
  it('says what they tried, in their own words, with the day', () => {
    expect(whatTheyTriedInFull({ triedSaid: 'I nudged Samuel on Tuesday.', createdAt: '2026-10-23T09:00:00Z' }, 'Kevin Odhiambo'))
      .toBe('Kevin Odhiambo said on Friday 23 October, “I nudged Samuel on Tuesday.”');
    expect(whatTheyTriedInFull({ triedSaid: 'raised it with Wairimu at the stand-up' }, 'you')).toBe('You said, “Raised it with Wairimu at the stand-up.”');
  });

  it('says nothing where they said nothing about trying: silence is never a finding', () => {
    expect(whatTheyTriedInFull({ triedSaid: null }, 'Hassan Mwenda')).toBe('');
    expect(whatTheyTriedInFull({ triedSaid: "I haven't done anything about that yet." }, 'Peter')).toBe('');
    expect(whatTheyTriedInFull({ triedSaid: 'Not yet.' }, 'Peter')).not.toMatch(/Not backed|could have messaged/);
  });

  it('a wait is confirmed only by the colleague\'s own promise in the same check-in', () => {
    const w = { onParticipantId: 'f', what: 'the final prices', groundId: 'g' };
    expect(theWaitIsConfirmed(w, [])).toBe(false);
    expect(theWaitIsConfirmed(w, [{ groundId: 'g', participantId: 'f', text: 'I will send the updated prices Friday.' }])).toBe(true);
  });

  it('a wait is confirmed when the speaker\'s attempt to unblock it is in the record, and only then without the colleague', () => {
    /* Hafsah, 12 October: it becomes a confirmed block when they tried and that is in the record. */
    expect(theWaitIsConfirmed({ onParticipantId: 'f', what: 'the final prices', triedSaid: 'I messaged Fatuma twice on Tuesday.', groundId: 'g' }, [])).toBe(true);
    /* What was tried is the record's reading of what they did, not a word found in the wait's own text. */
    expect(theWaitIsConfirmed({ onParticipantId: 'f', what: 'the final prices, I called her on Monday', triedSaid: null, groundId: 'g' }, [])).toBe(false);
    expect(theWaitIsConfirmed({ onParticipantId: 'f', what: 'the final prices', triedSaid: 'Nothing yet.', groundId: 'g' }, [])).toBe(false);
  });
});
