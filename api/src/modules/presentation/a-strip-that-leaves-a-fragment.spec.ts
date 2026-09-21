import { withoutRecordNarration, aFragmentNotASentence, forHumans } from './outbound';

/**
 * TWO FAULTS READ IN ONE LIVE CHECK-IN, 18 SEPTEMBER 2026.
 *
 * A salesperson was asked "who are what people said, and what is the revenue and product mix for
 * each?", and a reply opened "Is a real answer, and it." Neither is the model's fault: both are
 * strips of ours doing their job and leaving something nobody could have written.
 */
describe('a strip that leaves a fragment', () => {
  it('drops the sentence rather than hand back the wreckage', () => {
    expect(aFragmentNotASentence('Is a real answer, and it.')).toBe(true);
    expect(aFragmentNotASentence('And it.')).toBe(true);
    expect(aFragmentNotASentence('That is a real answer, and it is honest.')).toBe(false);
  });

  it('and the rest of the reply survives it', () => {
    const out = withoutRecordNarration(
      'That is now on the record, and it is a real answer, and it. So Tunde did not send leads after August.',
    );
    expect(out).not.toMatch(/^Is a real answer/);
    expect(out).toContain('So Tunde did not send leads after August.');
  });
});

describe('the other meaning of accounts', () => {
  /* A salesperson's accounts are their customers, and the rule about our word must not touch them. */
  it('leaves a salesperson their customers', () => {
    const asked = 'To get a clear picture: who are the accounts, and what is the revenue for each?';
    expect(forHumans(asked)).toBe(asked);
  });

  it('and still says what people said where two versions differ', () => {
    expect(forHumans('This is where the two accounts differ.')).toContain('what people said');
    expect(forHumans('Say where the accounts disagree.')).toContain('what people said');
  });

  it('and the possessive forms are untouched, because those are only ever ours', () => {
    expect(forHumans('Your account says the launch slipped.')).toContain('What you said');
    expect(forHumans('Their account of the meeting is different.')).toContain('hat they said');
  });
});

/**
 * AND THE REPLY THAT ARRIVED OPENING MID-SENTENCE, with nothing of ours having cut it. Read live in
 * a discovery session: "expand into Jigawa and Kebbi if the paddy supply bottleneck is resolved
 * makes sense given your goal. What will you do to address the dry season paddy supply, and by
 * when?" The question was what the person needed; the first six words were debris.
 */
describe('a reply that opens mid-sentence', () => {
  it('drops the fragment and keeps the rest', () => {
    const out = forHumans('expand into Jigawa and Kebbi if the bottleneck is resolved makes sense. What will you do about the supply?');
    expect(out).toBe('What will you do about the supply?');
  });

  it('and keeps a reply that is only a fragment, because a turn with nothing in it is worse', () => {
    expect(forHumans('is a real answer.')).toBe('is a real answer.');
  });

  it('and leaves an ordinary opening alone', () => {
    const fine = 'That is a real block. What has to happen for it to move?';
    expect(forHumans(fine)).toBe(fine);
  });
});
