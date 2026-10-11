import { theNoteBesideTheClaim, theWaitIsConfirmed, NOT_BACKED } from './a-wait-is-the-speakers-account';

describe('the note beside a claim about a colleague', () => {
  it('says what they tried, in their own words', () => {
    expect(theNoteBesideTheClaim({ what: 'the final prices', triedSaid: 'I nudged Samuel on Tuesday.' })).toBe('Tried: nudged Samuel on Tuesday.');
    expect(theNoteBesideTheClaim({ what: 'the shop list', triedSaid: 'Raised it with Wairimu at the stand-up' })).toBe('Tried: raised it with Wairimu at the stand-up.');
  });

  it('says it is not backed where they said nothing about trying', () => {
    expect(theNoteBesideTheClaim({ what: 'the final prices', triedSaid: null })).toBe('Not backed: no attempt to unblock mentioned.');
    expect(theNoteBesideTheClaim({ what: 'the final prices', triedSaid: 'It is still not here.' })).toBe(NOT_BACKED);
  });

  it('a wait is confirmed only by the colleague\'s own promise in the same check-in', () => {
    const w = { onParticipantId: 'f', what: 'the final prices', groundId: 'g' };
    expect(theWaitIsConfirmed(w, [])).toBe(false);
    expect(theWaitIsConfirmed(w, [{ groundId: 'g', participantId: 'f', text: 'I will send the updated prices Friday.' }])).toBe(true);
  });
});
