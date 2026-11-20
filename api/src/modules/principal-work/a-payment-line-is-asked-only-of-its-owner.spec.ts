import { whoCanAnswer, type ThePerson } from './the-payments-work';
import type { ADiscrepancy } from './the-payments-reconcile';

/** H4, taken conservatively (13 November): a payment line is shown only to the person who owns that payment. Somebody who only forwarded the sheet is not asked about it. */
const person = (name: string, isPrincipal = false): ThePerson => ({ name, email: `${name.split(' ')[0].toLowerCase()}@fatima.test`, isPrincipal });
const aDiscrepancy = (owner: string | null, kind: ADiscrepancy['kind'] = 'two amounts'): ADiscrepancy => ({ id: 'x', kind, paymentKey: 'k', latest: { owner } as any, lines: [], links: {} as any, versions: [] });

describe('who is asked about a payment line', () => {
  const principal = person('Amara Lawal', true); const hauwa = person('Hauwa Lawal'); const tunde = person('Tunde Bakare');
  it('its owner, when she has named and introduced them', () => {
    expect(whoCanAnswer(aDiscrepancy('Hauwa Lawal'), { principal, sender: tunde, team: [hauwa, tunde], delegates: [] })).toBe(hauwa);
  });
  it('not the colleague who only forwarded the sheet, when the owner is somebody else or nobody she named', () => {
    expect(whoCanAnswer(aDiscrepancy('Halima Sani'), { principal, sender: tunde, team: [hauwa, tunde], delegates: [] })).toBe(principal);
    expect(whoCanAnswer(aDiscrepancy(null), { principal, sender: tunde, team: [hauwa, tunde], delegates: [] })).toBe(principal);
  });
  it('an approval is hers alone', () => {
    expect(whoCanAnswer(aDiscrepancy('Hauwa Lawal', 'approval missing'), { principal, sender: hauwa, team: [hauwa], delegates: [] })).toBe(principal);
  });
});
