import { eachDealInItsGroup, isADispatchNotADeal, A_DISPATCH_SAYS } from './each-deal-in-its-group';
import { reportedAgainstTheRules } from './the-work-by-area-and-by-stage';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 7. Amina runs the stock; her dispatches on delivery notes were listed under
 * Won on the lead's deal grid ("Kisii, DN-1231", "Homa Bay"), and the board said 8 deals were reported at Won.
 */
const row = (id: string, name: string, said: string, stage = 'Won') => ({
  id, kind: 'deal', name, stage, owner: 'Amina', ownerParticipantId: 'p-amina', due: null, fields: {}, from: 'said', said, mark: 'said', lastSaidOn: '2026-11-02',
});
const grid = () => [{
  section: 'Deal grid', holds: 'deals', stages: ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'],
  rows: [
    row('d1', 'Kisii, DN-1231', 'I dispatched eight kits to Kisii on DN-1231 on Tuesday.'),
    row('d2', 'Homa Bay', 'Six kits went to Homa Bay on delivery note DN-1240.'),
    row('d3', 'Mzee Ogola', 'Mzee Ogola paid for two Plus kits.'),
  ],
}] as any;

describe('a delivery of stock is never a won deal', () => {
  it("reads Amina's dispatches as deliveries", () => {
    expect(isADispatchNotADeal({ name: 'Kisii, DN-1231', said: '' } as any)).toBe(true);
    expect(isADispatchNotADeal({ name: 'Homa Bay', said: 'Six kits went to Homa Bay on delivery note DN-1240.' } as any)).toBe(true);
    expect(isADispatchNotADeal({ name: 'Mzee Ogola', said: 'Mzee Ogola paid for two Plus kits.' } as any)).toBe(false);
  });

  it('keeps them on the grid, out of every deal group, with a sentence saying why', () => {
    const [sec] = eachDealInItsGroup('sales org', grid(), null, new Date('2026-11-03')) as any[];
    const byId = Object.fromEntries(sec.rows.map((r: any) => [r.id, r]));
    expect(byId.d1.kind).toBe('delivery');
    expect(byId.d1.groupSays).toBe(A_DISPATCH_SAYS);
    expect(byId.d2.kind).toBe('delivery');
    expect(byId.d3.kind).toBe('deal');
    const counted = sec.groups.flatMap((g: any) => g.rowIds);
    expect(counted).toEqual(['d3']);
  });

  it('and the count of deals reported at Won reads one, not three', () => {
    const grouped = eachDealInItsGroup('sales org', grid(), null, new Date('2026-11-03')) as any[];
    const said = JSON.stringify(reportedAgainstTheRules('sales org', grouped));
    expect(said).not.toMatch(/3 deals were reported at Won/);
  });
});
