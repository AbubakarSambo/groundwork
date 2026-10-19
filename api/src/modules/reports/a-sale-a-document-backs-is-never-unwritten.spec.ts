import { theSalesWeekInWords } from './the-sales-week-in-words';

/**
 * A SALE A DOCUMENT BACKS IS NEVER "NOTHING WRITTEN SHOWS IT" (engine test, Drop Access, Mercy's week).
 *
 * Friday 16 October, Mercy: "Mama Rose's kiosk bought one unit! Cash sale, KES 5,000. I have the receipt here." and she added
 * mama-rose-receipt.txt. The weekly report's "what changed" said "Mama Rose's kiosk bought. A document backs it, but it does not show a
 * payment." and, in the same report, "Mercy Wairimu counts 1 unit sold to Mama Rose's kiosk, and nothing written shows it yet."
 */
const at = (s: string) => new Date(s);
const deal = (o: Partial<any>) => ({ id: 'w-rose', name: "Mama Rose's kiosk", stage: 'Won', ownerParticipantId: 'p-mercy', fields: { Units: '1' }, firstOnRecordAt: at('2026-10-12T11:00:00Z'), proven: true, paid: false, signed: false, ...o });
const week = (d: any) => theSalesWeekInWords({
  people: [{ id: 'p-grace', label: 'Grace Achieng', isTheLead: true }, { id: 'p-mercy', label: 'Mercy Wairimu', isTheLead: false }],
  deals: [d], lastStage: 'Won', waits: [], lines: [], turns: [], checkIns: [], documents: [], targets: [], aSaleNeedsProof: true, stallDays: null,
  buyingDateOf: () => null, start: at('2026-10-12T00:00:00Z'), at: at('2026-10-16T14:00:00Z'), zone: 'Africa/Nairobi',
} as any);

describe("Mercy's sale to Mama Rose's kiosk, in Grace's weekly report", () => {
  it('says the receipt backs it', () => {
    const says = JSON.stringify(week(deal({})));
    expect(says).toContain("Mercy Wairimu counts 1 unit sold to Mama Rose's kiosk. A document backs it, but it does not show a payment.");
    expect(says).not.toContain('nothing written shows it yet');
  });
  it('and with no document, says nothing written shows it, as before', () => {
    expect(JSON.stringify(week(deal({ proven: false })))).toContain("Mercy Wairimu counts 1 unit sold to Mama Rose's kiosk, and nothing written shows it yet.");
  });
});
