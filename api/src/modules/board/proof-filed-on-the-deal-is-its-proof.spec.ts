import { theDealsOnRecord, theSalesStages } from './a-sales-aim-is-counted-from-the-deals';
import { theSalesWeek } from '../reports/the-sales-week-in-numbers';
import { whatChangedInTheSalesWeek } from '../reports/what-a-sales-week-shows';

/**
 * PROOF FILED ON THE DEAL IS ITS PROOF (engine test, second run, Drop Access, Friday 16 October).
 *
 * Kevin answered on WhatsApp at 11:00: "Good news! Savannah Cafe paid their KES 15,000 deposit today! I've got the M-Pesa code here."
 * At 11:01 he sent mpesa-savannah-deposit.pdf, which reads "RBT7Y3KQ2P Confirmed. Ksh15,000.00 received from JANE MWENDE on 16/10/26 at
 * 11:02 AM. Account: DROP ACCESS LTD. Ref: deposit 6 dispensers." It was read as "A payment" and filed on Savannah Cafe. No line of his was
 * anchored to it (the message names Jane, not the cafe), and the weekly report built at 11:15 told Grace and Kevin "Savannah Cafe bought.
 * Nothing written shows it yet, only what Kevin Omondi said." These are the rows from that run's database, as they stood at 11:15.
 */
const KEVIN = '9f2e58a4-06d8-4a0a-bddc-03cd96df027c';
const GROUND = 'a0cdc357-32d0-4df4-bece-692b27e5511f';
const SAVANNAH = 'c685918b-5034-46bc-b918-df1a1294177d';

const savannah = {
  id: SAVANNAH, groundId: GROUND, kind: 'deal', name: 'Savannah Cafe', stage: 'Won', ownerParticipantId: KEVIN, sourceEntryId: null,
  createdAt: new Date('2026-10-12T11:05:14.261Z'),
  fields: {
    Need: '6 units', Units: '6', Value: 'KES 15,000 deposit', Quoted: 'KES 30,000', Contact: 'Jane',
    _stages: [
      { by: 'check-in', on: '2026-10-12T11:05:14.260Z', stage: 'Pitched' },
      { by: 'check-in', on: '2026-10-13T11:04:56.447Z', stage: 'Quoted' },
      { by: 'check-in', on: '2026-10-16T11:04:01.117Z', stage: 'Won' },
    ],
    'Decision maker': 'Jane Mwende, the owner',
  },
};
const lines = [
  { id: 'l1', participantId: KEVIN, type: 'PROGRESS', text: 'Jane paid the KES 15,000 deposit for Savannah Cafe today.', createdAt: new Date('2026-10-16T11:03:03.700Z'), checkInId: 'c5', anchoredDocumentId: null },
  { id: 'l2', participantId: KEVIN, type: 'PROGRESS', text: 'Savannah Cafe is a go! Jane said yes to 6 units.', createdAt: new Date('2026-10-14T11:03:56.408Z'), checkInId: 'c3', anchoredDocumentId: null },
];
const evidence = [
  { id: 'd111faf2', groundId: GROUND, documentId: 'e497a2f1', participantId: KEVIN, workItemId: SAVANNAH, itemName: 'Savannah Cafe', readAs: 'A payment', countsAsProof: true, shows: 'RBT7Y3KQ2P Confirmed.', createdAt: new Date('2026-10-16T11:01:16.452Z') },
];

const prismaWith = (filed: any[]) => ({
  workItem: { findMany: async () => [savannah] },
  recordEntry: { findMany: async () => lines },
  itemEvidence: { findMany: async ({ where }: any) => filed.filter((e) => e.groundId === where.groundId && where.workItemId.in.includes(e.workItemId) && e.countsAsProof === where.countsAsProof) },
});

async function whatGraceReads(filed: any[]): Promise<string[]> {
  const deals = await theDealsOnRecord(prismaWith(filed), GROUND, { paymentRecord: true, ourSide: [] });
  const week = theSalesWeek(deals, theSalesStages(null), lines, new Date('2026-10-11T21:00:00Z'), new Date('2026-10-16T11:15:00Z'), [], [{ participantId: KEVIN, checkedIn: true }]);
  return whatChangedInTheSalesWeek(week, { whole: true, me: null }, (id) => (id === KEVIN ? 'Kevin Omondi' : 'somebody'))!.moved;
}

describe("Kevin's Savannah Cafe deposit, filed on the deal, in Grace's weekly report", () => {
  it('is the payment record, so the week says so', async () => {
    const moved = await whatGraceReads(evidence);
    expect(moved).toContain('Savannah Cafe bought. There is a payment record.');
    expect(moved.join(' ')).not.toContain('Nothing written shows it yet');
  });

  it('and Kevin reads the same about his own deal', async () => {
    const deals = await theDealsOnRecord(prismaWith(evidence), GROUND, { paymentRecord: true, ourSide: [] });
    const week = theSalesWeek(deals, theSalesStages(null), lines, new Date('2026-10-11T21:00:00Z'), new Date('2026-10-16T11:15:00Z'), [], [{ participantId: KEVIN, checkedIn: true }]);
    expect(whatChangedInTheSalesWeek(week, { whole: false, me: KEVIN }, (id) => (id === KEVIN ? 'you' : 'somebody'))!.moved).toContain('Savannah Cafe bought. There is a payment record.');
  });

  it('with nothing filed on it, still says nothing written shows it, as before', async () => {
    expect(await whatGraceReads([])).toContain('Savannah Cafe bought. Nothing written shows it yet, only what Kevin Omondi said.');
  });

  it('a photo filed on the deal that is no proof does not make it paid', async () => {
    const moved = await whatGraceReads([{ ...evidence[0], readAs: 'A photo', countsAsProof: false }]);
    expect(moved).toContain('Savannah Cafe bought. Nothing written shows it yet, only what Kevin Omondi said.');
  });
});
