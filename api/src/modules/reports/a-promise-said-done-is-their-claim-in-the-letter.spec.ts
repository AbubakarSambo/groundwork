import { aCommitmentThatSettled } from './the-weekly-report';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 3 (decision 12; decision 138 point 1; change 3). The weekly letter of Friday 6 November said
 * "Collins Odhiambo committed to do ten kits, and it is now done." The row was settled DONE by his own "I did eleven", with
 * no M-Pesa code, and he later said "maybe four or five". A promise settled on the person's word is their claim; only
 * proof or the colleague who received it makes it done in Groundwork's voice.
 */
describe('a promise settled on the person\'s word, in the weekly letter', () => {
  const tenKits = { participantId: 'p-collins', clause: 'do ten kits', status: 'DONE' as const, whenSaid: null };

  it('the lead reads Collins\'s ten kits as his claim, never as done', () => {
    const says = aCommitmentThatSettled({ ...tenKits, settledBy: 'SAID' }, 'Collins Odhiambo');
    expect(says).toBe('Collins Odhiambo committed to do ten kits, and says it is done. Nothing has been shown to back it yet.');
    expect(says).not.toMatch(/it is now done/);
  });

  it('Collins reads it as his own claim', () => {
    expect(aCommitmentThatSettled({ ...tenKits, settledBy: 'SAID' }, 'You')).toBe('You committed to do ten kits, and you say it is done. Nothing has been shown to back it yet.');
  });

  it('a week kept before the field existed reads as their claim too', () => {
    expect(aCommitmentThatSettled(tenKits, 'Collins Odhiambo')).toMatch(/says it is done\. Nothing has been shown to back it yet\.$/);
  });

  it('proof, or the colleague who received it, makes it done', () => {
    expect(aCommitmentThatSettled({ ...tenKits, settledBy: 'PROVEN' }, 'Collins Odhiambo')).toBe('Collins Odhiambo committed to do ten kits, and it is now done.');
    expect(aCommitmentThatSettled({ ...tenKits, settledBy: 'CONFIRMED' }, 'You')).toBe('You committed to do ten kits, and it is now done.');
  });
});
