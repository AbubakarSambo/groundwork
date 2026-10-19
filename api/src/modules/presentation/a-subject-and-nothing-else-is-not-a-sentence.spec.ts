import { forHumans } from './outbound';

/**
 * DROP ACCESS RUN 1, ITEM 29. Mercy, day 7, read this turn as it was saved (gw_sweep_drop10).
 */
const MERCY_DAY_7 = 'Okay. You said that for Greenfield Supermarket, you expect to sell 25 units. That is delivered and confirmed. It clearly. What is the day Mama Mboga Mart will buy?';

describe('"It clearly." never reaches a person', () => {
  it('the turn Mercy read keeps every whole sentence and loses the broken one', () => {
    expect(forHumans(MERCY_DAY_7)).toBe('Okay. You said that for Greenfield Supermarket, you expect to sell 25 units. That is delivered and confirmed. What is the day Mama Mboga Mart will buy?');
  });
  it('and the strip that leaves it behind does not leave it any more', () => {
    expect(forHumans('That is delivered and confirmed. It clearly, your record shows that. What is the day Mama Mboga Mart will buy?'))
      .toBe('That is delivered and confirmed. What is the day Mama Mboga Mart will buy?');
  });
  it('a short whole sentence stays', () => {
    expect(forHumans('That is it. What happens next with Tuskys Westgate?')).toBe('That is it. What happens next with Tuskys Westgate?');
    expect(forHumans('It is paid. What happens next?')).toBe('It is paid. What happens next?');
  });
});
