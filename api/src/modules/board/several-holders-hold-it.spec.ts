import { AMINA, BARAKA, JUMA, RUKIA, boardAs, handoff, type Setup } from './the-switchboards-sections-harness';
import { aHolderIsMany, holdsItSaid } from './a-holder-in-their-own-words';

/**
 * SEVERAL HOLDERS "HOLD" IT, ONE HOLDER "HOLDS" IT (the blocker check, 2 October 2026).
 *
 * Rukia said she was waiting on "my direct reports" for three dates and times for the meeting. The blocker check said
 * "Their own direct reports holds it." to Amina, and "Your direct reports holds it." to Rukia. The verb now follows
 * whoever holds it, for every reader, and one holder still "holds" it.
 */
const RECORD: Setup = {
  dependencies: [
    handoff('d-reports', 'p-rukia', 'three dates and times for the meeting', { onLabel: 'my direct reports' }),
    handoff('d-finance', 'p-rukia', 'the credit terms', { onLabel: 'Finance' }),
    handoff('d-pair', 'p-baraka', 'the depot keys', { onLabel: 'Ade and Bola' }),
  ],
};
const check = (b: any, id: string) => (b.blockerCheck ?? []).find((x: any) => x.id === id)?.checks?.[0];

describe('the blocker check says "hold" for several holders and "holds" for one, to every reader', () => {
  it('Rukia, who is waiting, reads "Your direct reports hold it."', async () => {
    const b = await boardAs(RECORD, ...RUKIA);
    expect(check(b, 'd-reports')).toBe('Your direct reports hold it.');
    expect(check(b, 'd-finance')).toBe('Finance holds it.');
  });

  it.each([['Amina, who runs it', AMINA], ['Juma, an admin who only reads', JUMA]])('%s reads "Their own direct reports hold it."', async (_who, [user, role]) => {
    const b = await boardAs(RECORD, user, role);
    expect(check(b, 'd-reports')).toBe('Their own direct reports hold it.');
    expect(check(b, 'd-finance')).toBe('Finance holds it.');
    expect(check(b, 'd-pair')).toBe('Ade and Bola hold it.');
  });

  it('Baraka reads "Ade and Bola hold it." on his own wait', async () => {
    const b = await boardAs(RECORD, ...BARAKA);
    expect(check(b, 'd-pair')).toBe('Ade and Bola hold it.');
  });

  it('nobody reads "holds it" after several holders', async () => {
    for (const [user, role] of [AMINA, RUKIA, BARAKA, JUMA]) {
      const served = JSON.stringify(await boardAs(RECORD, user, role));
      expect(served).not.toMatch(/(direct reports|Ade and Bola) holds it/i);
    }
  });

  it.each([
    ['you', true], ['their own direct reports', true], ['your direct reports', true], ['the suppliers', true],
    ['Ade and Bola', true], ['Ade, Bola and Chi', true], ['the people in the warehouse', true], ['two drivers', true],
    ['the people', true],
    ['Wairimu', false], ['James', false], ['Chris', false], ['Finance', false], ['a colleague', false],
    ['the sales and marketing team', false], ['the boss', false], ['logistics', false], ['the Ministry of Lands', false],
    ['Wairimu Kamau, the head of sales', false], ['the head of sales', false], ['somebody outside this check-in', false],
  ])('"%s" is several: %s', (holder, many) => {
    expect(aHolderIsMany(holder)).toBe(many);
    expect(holdsItSaid(holder)).toMatch(many ? / hold it\.$/ : / holds it\.$/);
  });
});
