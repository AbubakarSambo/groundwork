import { whatThisSalesCheckInGathers, theProofEachDealStillNeeds, SALES_CHECK_IN_GATHERS_PROMPT, THE_SALES_REMINDER } from './what-a-sales-check-in-gathers';

/**
 * DROP ACCESS RUN 1, ITEM 32: proof was never asked for. Kevin's deals and documents as gw_sweep_drop10 holds them on day 6, and
 * what the model of his next check-in is handed.
 */
const KEVIN = '49e0307a-d6ed-43dc-bb0a-0f63b50008bc';
const deals = [
  { name: 'Kilele Hotel', stage: 'Won', fields: { Units: '40', Value: 'KES 200,000' }, ownerParticipantId: KEVIN, updatedAt: new Date('2026-10-12T11:03:16Z') },
  { name: 'Savannah Cafe', stage: 'Won', fields: { Units: '6', Contact: 'Jane Mwende' }, ownerParticipantId: KEVIN, updatedAt: new Date('2026-10-16T11:01:00Z') },
  { name: 'Kasarani Gym', stage: 'Won', fields: { Units: '3' }, ownerParticipantId: KEVIN, updatedAt: new Date('2026-10-15T11:02:55Z') },
  { name: 'Ngong Road Minimart', stage: 'Quoted', fields: { Units: '4', Value: 'KES 20,000', Contact: 'Ali' }, ownerParticipantId: KEVIN, updatedAt: new Date('2026-10-13T11:04:09Z') },
];
const documents = [
  { fileName: 'mpesa-kilele-hotel.txt', uploaderNote: 'That confirms Kilele Hotel bought 40 units for KES 200,000, paid by M-Pesa. The confirmation code is QJK4TL2MX9.', content: 'QJK4TL2MX9 Confirmed. Ksh200,000.00 received from KILELE HOTEL LTD on 12/10/26 at 3:41 PM.' },
  { fileName: 'mpesa-savannah-cafe-deposit.txt', uploaderNote: 'The M-Pesa document confirms that Savannah Cafe paid the KES 15,000 deposit for the 6 units.', content: 'RJT7KQ3WZ1 Confirmed. Ksh15,000.00 received from JANE MWENDE on 16/10/26 at 10:12 AM.' },
];
const asked = [
  { content: 'You said last time that Ngong Road Minimart wants a quote for 4 units. Have you sent them a quote for 4 units?', createdAt: new Date('2026-10-14T11:01:00Z') },
  { content: 'Understood. For Ngong Road Minimart, what budget did the customer state?', createdAt: new Date('2026-10-14T11:02:00Z') },
];

describe('the proof of a deal called won or quoted is asked for once (item 32)', () => {
  it('Kevin\'s next check-in is told which deals have their proof and which to ask for, by name', () => {
    const block = theProofEachDealStillNeeds(deals, asked, documents);
    expect(block).toContain('- Kilele Hotel (called won). Its proof is on record: "mpesa-kilele-hotel.txt". Do not ask for it.');
    expect(block).toContain('- Savannah Cafe (called won). Its proof is on record: "mpesa-savannah-cafe-deposit.txt". Do not ask for it.');
    expect(block).toContain('- Kasarani Gym (called won). No proof on record, and not asked for yet, so ask once, by name: the signed order or the payment record.');
    expect(block).toContain('- Ngong Road Minimart (called quoted). No proof on record, and not asked for yet, so ask once, by name: a photo of the quote or the email it was sent in.');
  });
  it('once asked, it is not asked again, in this check-in or a later one', () => {
    const later = [...asked, { content: 'Do you have a photo of the quote you sent Ngong Road Minimart, or the email it went in?', createdAt: new Date('2026-10-15T11:03:00Z') }];
    expect(theProofEachDealStillNeeds(deals, later, documents)).toContain('- Ngong Road Minimart (called quoted). No proof on record. It was asked for on Thursday 15 October, so do not ask again.');
  });
  it('a payment reference typed in full counts as its proof', () => {
    const block = theProofEachDealStillNeeds([deals[2]], [], [], ['Kasarani Gym paid by M-Pesa, the code is SKL3PQ7RT2.']);
    expect(block).toContain('- Kasarani Gym (called won). Its proof is on record: a payment reference they typed. Do not ask for it.');
  });
  it('the words that run say it, and the reminder read last asks for it where it is missing', () => {
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('ask once, plainly, by the deal\'s name, for the proof: for a won deal, the signed order or the payment record; for a quote, a photo of it or the email it was sent in.');
    expect(SALES_CHECK_IN_GATHERS_PROMPT).toContain('Won (a signed order or a payment, with the document that shows it)');
    expect(THE_SALES_REMINDER).toContain('its proof where the list says it is missing and not asked yet');
  });
  it('and it reaches the block the check-in is handed, from the record', async () => {
    const prisma = {
      /* Release 1's sales board on for the organisation: the gathering is read only there (release-one-sales-board). */
      ground: { findUnique: async () => ({ kindOfWork: 'sales team', organizationId: 'org-1' }) },
      organization: { findUnique: async () => ({ release1SalesBoardOn: true }) },
      groundParticipant: { findUnique: async () => ({ partyType: 'PARTICIPANT' }) },
      workItem: { findMany: async () => deals },
      checkIn: { findMany: async () => [{ id: 'ci-kevin-5' }] },
      conversationTurn: { findMany: async (q: any) => (q.where.role === 'AI' ? asked : []) },
      groundDocument: { findMany: async () => documents },
    };
    const r = await whatThisSalesCheckInGathers({ prisma, prompts: { getActive: async () => ({ id: 'pv-new', content: SALES_CHECK_IN_GATHERS_PROMPT }) } }, { groundId: 'g', participantId: KEVIN });
    expect(r.promptVersionId).toBe('pv-new');
    expect(r.block).toContain('THE PROOF OF THEIR DEALS CALLED WON OR QUOTED');
    expect(r.block).toContain('- Kasarani Gym (called won). No proof on record, and not asked for yet');
  });
});
