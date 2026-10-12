import { aHandoffThatCleared, theirSideOfIt } from './the-weekly-report';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 2 (decision 137, change 4). Esther's weekly letter said "Hassan Mwenda is no longer
 * waiting on Amina Otieno for the stock from Kisumu." and "... for the right kit mix.": his word, as a fact about Amina,
 * with no "Tried:" or "Not backed:" note, while Amina's own record said she sent what he ordered. The board and the daily
 * nudge already said a wait as the speaker's account; the letter's "cleared" line went round that. These are the run's
 * own lines.
 */
describe('a cleared wait on a colleague, in the weekly letter', () => {
  const AMINAS_LINES = [
    { type: 'PROGRESS', text: 'sent 20 kits to Kisii on Tuesday on delivery note DN-1182', createdAt: '2026-10-13T08:00:00Z' },
    { type: 'PROGRESS', text: 'The Kisumu store count on Friday was 64 kits.', createdAt: '2026-10-16T08:00:00Z' },
    { type: 'PROGRESS', text: 'I sent Hassan exactly what he ordered on Monday, 10 Plus and 10 Home kits, on DN-1203 on Tuesday, and 6 kits to Homa Bay on DN-1204.', createdAt: '2026-10-26T08:00:00Z' },
    { type: 'WORRY', text: 'Hassan still owes me his order for next week.', createdAt: '2026-10-27T08:00:00Z' },
  ];

  it('the lead reads Hassan\'s wait as his account, with the note and Amina\'s own words beside it', () => {
    const theirSide = theirSideOfIt(['Hassan', 'Hassan Mwenda'], AMINAS_LINES);
    const says = aHandoffThatCleared(
      { fromParticipantId: 'p-hassan', onParticipantId: 'p-amina', onLabel: null, what: 'the stock from Kisumu', confirmed: false, note: 'Not backed: no attempt to unblock mentioned.', theirSide },
      'Hassan Mwenda', 'Amina Otieno',
    );
    expect(says).toBe('Hassan Mwenda said the work was waiting on Amina Otieno for the stock from Kisumu, and it is no longer waiting. Not backed: no attempt to unblock mentioned. Amina Otieno said, "I sent Hassan exactly what he ordered on Monday, 10 Plus and 10 Home kits, on DN-1203 on Tuesday, and 6 kits to Homa Bay on DN-1204."');
    expect(says).not.toMatch(/is no longer waiting on Amina/);
  });

  it('Hassan reads it as his own account, with what he said he tried', () => {
    const says = aHandoffThatCleared(
      { fromParticipantId: 'p-hassan', onParticipantId: 'p-amina', onLabel: null, what: 'the right kit mix', confirmed: false, note: 'Tried: asked her three times, I messaged Amina on Thursday about it.' },
      'You', 'Amina Otieno',
    );
    expect(says).toBe('You said the work was waiting on Amina Otieno for the right kit mix, and it is no longer waiting. Tried: asked her three times, I messaged Amina on Thursday about it.');
  });

  it('a week kept before the field existed reads as the speaker\'s account too, never as a fact about the colleague', () => {
    const says = aHandoffThatCleared({ fromParticipantId: 'p-hassan', onParticipantId: 'p-amina', onLabel: null, what: 'the stock from Kisumu' }, 'Hassan Mwenda', 'Amina Otieno');
    expect(says).toBe('Hassan Mwenda said the work was waiting on Amina Otieno for the stock from Kisumu, and it is no longer waiting. Not backed: no attempt to unblock mentioned.');
  });

  it('a wait the colleague confirmed, and a wait on something outside the check-in, read as before', () => {
    expect(aHandoffThatCleared({ fromParticipantId: 'p-hassan', onParticipantId: 'p-amina', onLabel: null, what: 'the stock from Kisumu', confirmed: true }, 'Hassan Mwenda', 'Amina Otieno'))
      .toBe('Hassan Mwenda is no longer waiting on Amina Otieno for the stock from Kisumu.');
    expect(aHandoffThatCleared({ fromParticipantId: 'p-amina', onParticipantId: null, onLabel: 'Naomi', what: 'a clear photo of the signed DN-1182' }, 'Amina Otieno', 'Naomi'))
      .toBe('Amina Otieno is no longer waiting on Naomi for a clear photo of the signed DN-1182.');
  });

  it('only a line of the colleague\'s own that names the speaker is set beside the claim', () => {
    expect(theirSideOfIt(['Hassan'], AMINAS_LINES.slice(0, 2))).toBeNull();
    expect(theirSideOfIt(['Hassan'], [{ type: 'PROGRESS', text: 'Hassan collected on Friday. [INFERRED: the kits]' }])).toBe('Hassan collected on Friday.');
  });
});
