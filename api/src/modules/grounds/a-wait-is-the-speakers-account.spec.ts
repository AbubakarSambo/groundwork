import { theNoteBesideTheClaim, theWaitIsConfirmed, NOT_BACKED } from './a-wait-is-the-speakers-account';

describe('the note beside a claim about a colleague', () => {
  it('says what they tried, in their own words', () => {
    expect(theNoteBesideTheClaim({ what: 'the final prices', triedSaid: 'I nudged Samuel on Tuesday.' })).toBe('Tried: nudged Samuel on Tuesday.');
    expect(theNoteBesideTheClaim({ what: 'the shop list', triedSaid: 'Raised it with Wairimu at the stand-up' })).toBe('Tried: raised it with Wairimu at the stand-up.');
  });

  it('says it is not backed where they said nothing about trying, and what they could have done (Hafsah, 12 October)', () => {
    const plain = `${NOT_BACKED} They could have messaged the colleague, asked again, or raised it with the lead.`;
    expect(theNoteBesideTheClaim({ what: 'the final prices', triedSaid: null })).toBe(plain);
    expect(theNoteBesideTheClaim({ what: 'the final prices', triedSaid: 'It is still not here.' })).toBe(plain);
  });

  it('names the people where the reader may read them, and never raises it with the lead when the lead is in the wait', () => {
    expect(theNoteBesideTheClaim({ what: 'the stock' }, { by: 'Hassan Mwenda', on: 'Amina Otieno', lead: 'Esther Awuor' }))
      .toBe('Not backed: no attempt to unblock mentioned. Hassan Mwenda could have messaged Amina Otieno, asked again, or raised it with Esther Awuor.');
    expect(theNoteBesideTheClaim({ what: 'the stock' }, { by: 'You', on: 'Amina Otieno', lead: 'you' }))
      .toBe('Not backed: no attempt to unblock mentioned. You could have messaged Amina Otieno or asked again.');
    expect(theNoteBesideTheClaim({ what: 'the stock' }, { by: 'A colleague', on: 'you', lead: 'Esther Awuor' }))
      .toBe('Not backed: no attempt to unblock mentioned. A colleague could have messaged you, asked again, or raised it with Esther Awuor.');
  });

  it('a wait is confirmed only by the colleague\'s own promise in the same check-in', () => {
    const w = { onParticipantId: 'f', what: 'the final prices', groundId: 'g' };
    expect(theWaitIsConfirmed(w, [])).toBe(false);
    expect(theWaitIsConfirmed(w, [{ groundId: 'g', participantId: 'f', text: 'I will send the updated prices Friday.' }])).toBe(true);
  });

  it('a wait is confirmed when the speaker\'s attempt to unblock it is in the record, and only then without the colleague', () => {
    /* Hafsah, 12 October: it becomes a confirmed block when they tried and that is in the record. */
    expect(theWaitIsConfirmed({ onParticipantId: 'f', what: 'the final prices', triedSaid: 'I messaged Fatuma twice on Tuesday.', groundId: 'g' }, [])).toBe(true);
    expect(theWaitIsConfirmed({ onParticipantId: 'f', what: 'the final prices, I called her on Monday', triedSaid: null, groundId: 'g' }, [])).toBe(true);
    /* Saying it again, louder, is not an attempt. */
    expect(theWaitIsConfirmed({ onParticipantId: 'f', what: 'the final prices', triedSaid: 'It is still not here, three weeks now.', groundId: 'g' }, [])).toBe(false);
  });
});
