import { eachDealInItsGroup } from './each-deal-in-its-group';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 3 (decision 12; decision 138 point 1; change 3). Collins Odhiambo said "I did eleven, all the
 * deliveries are done." with no M-Pesa code, and a week later "Honestly eleven was rounding up, it is lower, maybe four or
 * five." Esther's deal grid put "eleven" under Won. A deal at the last stage on somebody's word alone is their claim, shown
 * in their words in its own group; only proof, a colleague's confirmation or the lead's own entry puts a deal under Won.
 */
const NOW = new Date('2026-11-06T10:00:00Z');
const deal = (id: string, mark: string, extra: Record<string, unknown> = {}) => ({
  id, kind: 'deal', name: 'eleven', stage: 'Won', owner: 'Collins Odhiambo', ownerParticipantId: 'p-collins', due: null, fields: {},
  from: 'said', said: 'I did eleven, all the deliveries are done.', saidBy: 'Collins', saidByLine: "In Collins's words,", mark, next: null, lastSaidOn: '2026-11-02',
  ...extra,
});
const grid = (rows: any[]) => eachDealInItsGroup('sales org', [{ key: 'deals', state: 'filled', stages: ['Contacted', 'Quoted', 'Won'], rows } as any], null, NOW) as any[];

describe('a sale somebody said they made is their claim, not a sale won', () => {
  it('Collins\'s "I did eleven" is in its own group, in his words, and nothing is under Won', () => {
    const [sec] = grid([deal('d-collins', 'memory')]);
    expect(sec.groups).toEqual([
      { group: 'said-won', heading: 'Said to be won, not shown yet', reason: 'Somebody said each of these was won, in their own words. Nothing has been shown to back them yet, so they count in what is sold as their word, not as sales with proof of payment.', rowIds: ['d-collins'] },
    ]);
    expect(sec.rows[0].said).toBe('I did eleven, all the deliveries are done.');
    expect(sec.rows[0].groupSays).toMatch(/^It rests on what somebody said, with no proof yet\./);
  });

  it('a sale with proof, one a colleague confirmed, and one the lead put there on the board stay under Won', () => {
    const [sec] = grid([deal('d-proven', 'proven'), deal('d-confirmed', 'confirmed'), deal('d-lead', 'none', { from: 'lead' }), deal('d-said', 'said')]);
    expect(sec.groups.map((g: any) => [g.group, g.rowIds])).toEqual([['said-won', ['d-said']], ['won', ['d-proven', 'd-confirmed', 'd-lead']]]);
  });
});
