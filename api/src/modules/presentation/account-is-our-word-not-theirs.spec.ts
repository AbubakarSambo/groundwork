import { saysWhatTheySaid, forHumans } from './outbound';

/**
 * "Never write account in Groundwork copy a person reads." Said on 8 September, written into the
 * prompt, and broken this week in the first sentence of a live report: "Your account describes a
 * goal of hitting 270 units." A rule that lives only in a prompt is a rule the model may keep.
 */
describe('the possessive forms, which are unambiguously ours', () => {
  it('turns the sentence a live report actually opened with', () => {
    expect(saysWhatTheySaid('Your account describes a goal of hitting 270 units this year.'))
      .toBe('What you said describes a goal of hitting 270 units this year.');
  });

  it('handles the others', () => {
    expect(saysWhatTheySaid('their account of the week')).toBe('what they said of the week');
    expect(saysWhatTheySaid('Compare the accounts.')).toBe('Compare what people said.');
    expect(saysWhatTheySaid('all three accounts agree')).toBe('what people said agree');
  });

  it('keeps the capital where the phrase started the sentence', () => {
    expect(saysWhatTheySaid('Their account is on the record.')).toMatch(/^What they said/);
  });
});

describe('and leaves ordinary English alone', () => {
  /*
   * THE REASON THIS IS NARROW. This text quotes people. A wrong replacement does not read oddly,
   * it puts words in somebody's mouth inside their own record - the same rule that keeps
   * `oneWordForTheThing` to determiner-governed "ground".
   */
  it('does not touch a bare account', () => {
    for (const said of [
      'That does not account for the delay.',
      'The account was settled in March.',
      'She opened an account with the supplier.',
      'On no account should this go out.',
    ]) expect(saysWhatTheySaid(said)).toBe(said);
  });

  it('and accounting is a different word entirely', () => {
    expect(saysWhatTheySaid('accounting for the shortfall')).toBe('accounting for the shortfall');
  });
});

describe('it runs on everything a person reads', () => {
  it('is part of forHumans, beside the other word that is ours', () => {
    expect(forHumans('Your account describes the quarter.')).toBe('What you said describes the quarter.');
  });
});
