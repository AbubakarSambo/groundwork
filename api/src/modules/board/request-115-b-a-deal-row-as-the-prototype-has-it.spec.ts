import { GroundScenario } from '@prisma/client';
import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, type Setup } from './the-switchboards-sections-harness';
import { NO_VALUE_SAID, WHAT_CONTACT_HISTORY_IS } from './a-deal-row-from-its-record';

/**
 * REQUEST 115 (b): WHAT A DEAL ROW NEEDS TO BE THE PROTOTYPE'S DEAL, ONLY FROM THE RECORD, AS EACH READER READS IT.
 * Its value where somebody said it, the days it was spoken about (with proof, or in their words), the rep's own
 * read word for word, and why it is in its group. Where the record holds nothing, it says so; nothing is made up.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  clock: { now: new Date('2026-09-23T15:00:00Z'), endsAt: new Date('2026-09-30T17:00:00Z') },
  recordLines: [
    { id: 'e-ngozi', participantId: 'p-ngozi', text: 'Six facilities are approved out of my total target of 14 for the quarter.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-ngozi', createdAt: new Date('2026-09-16T17:00:00Z') },
    { id: 'e-kwame', participantId: 'p-kwame', text: 'That N8 million disbursed represents three approved facilities.', recallBased: true, createdAt: new Date('2026-09-22T18:00:00Z') },
    { id: 'e-femi', participantId: 'p-femi', text: 'I have 31 applications that I\'ve taken from businesses.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-bisi', createdAt: new Date('2026-09-16T16:00:00Z') },
    { id: 'e-femi-2', participantId: 'p-femi', text: 'I filled out all the forms completely.', confirmedAt: new Date('2026-09-17T09:00:00Z'), createdAt: new Date('2026-09-22T16:00:00Z') },
    { id: 'e-ngozi-2', participantId: 'p-ngozi', text: 'I have already sent him a written escalation.', createdAt: new Date('2026-09-22T17:00:00Z') },
  ],
  documents: [
    { id: 'doc-ngozi', participantId: 'p-ngozi', fileName: 'approval-letters.pdf', visibility: 'EVERYONE' },
    { id: 'doc-bisi', participantId: 'p-bisi', fileName: 'pipeline.xlsx', visibility: 'EVERYONE' },
  ],
  items: [
    item('w-ngozi', 'Ikeja Bakery', { stage: 'Won', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi' }),
    item('w-kwame', 'Jos Grain Traders', { stage: 'Quoted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-kwame', dueAt: new Date('2026-10-15T00:00:00Z') }),
    item('w-femi', 'Mama Ngozi Kitchens', { stage: 'Pitched', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi' }),
    item('w-femi-2', 'Lekki Cold Rooms', { stage: 'Qualified', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi-2', dueAt: new Date('2026-09-28T00:00:00Z') }),
    item('w-ngozi-2', 'Head of Credit escalation', { stage: 'Need established', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi-2' }),
    item('w-lead', 'Plateau Foods', { stage: 'Contacted', addedByUserId: 'u-bisi' }),
  ],
};
const SETUP = ['u-setup', 'ADMIN'] as const;
const DEALS: Setup = {
  ...RUN,
  createdByUserId: 'u-setup',
  documents: [...(RUN.documents ?? []), { id: 'doc-femi', participantId: 'p-femi', fileName: 'lekki-form.pdf', visibility: 'EVERYONE' }],
  items: RUN.items!.map((i: any) => (i.id === 'w-femi-2' ? { ...i, fields: { Value: 'NGN 4,500,000' } } : i)),
  /* Every line that names a deal, as the record holds it, with its day and its mark. */
  lines: [
    { id: 'l-1', participantId: 'p-femi', text: 'Lekki Cold Rooms asked for a quote for two cold rooms.', createdAt: new Date('2026-09-10T16:00:00Z'), checkIn: { sessionNumber: 1 }, disputedAt: null },
    { id: 'l-2', participantId: 'p-femi', text: 'Lekki Cold Rooms signed the application form.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-femi', createdAt: new Date('2026-09-22T16:00:00Z'), checkIn: { sessionNumber: 2 }, disputedAt: null },
    { id: 'l-3', participantId: 'p-ngozi', text: 'Ikeja Bakery paid.', createdAt: new Date('2026-09-16T17:00:00Z'), checkIn: { sessionNumber: 2 }, disputedAt: null },
  ],
  turns: [
    { checkInId: 'c2-p-femi', content: 'Things moved this week. Lekki Cold Rooms will buy before the end of the month, the owner told me twice. I am still chasing the bank statements.' },
  ],
};
const grid = (b: any) => ((b.workRecords ?? []) as any[]).find((s) => s.section === 'Deal grid');
const deal = (b: any, name: string) => grid(b)?.rows.find((r: any) => r.name === name);
const FEMIS_WORDS = 'Lekki Cold Rooms will buy before the end of the month, the owner told me twice.';

describe('request 115 (b): a deal row as the prototype has it', () => {
  it.each([['Bisi, who runs it', BISI], ['the admin who set it up', SETUP], ['Juma, an admin who only reads', JUMA]])(
    '%s reads the value, the contact history and Femi\'s own read, from the record', async (_who, reader) => {
      const b = await boardAs(DEALS, ...(reader as readonly [string, string]));
      const lekki = deal(b, 'Lekki Cold Rooms');
      expect(lekki.value).toBe('NGN 4,500,000');
      expect(lekki.valueSays).toBeNull();
      expect(lekki.contactHistory).toEqual([
        { on: '2026-09-22', how: 'with proof', says: 'On 22 September, somebody spoke about it, and proof backs what they said.' },
        { on: '2026-09-10', how: 'in their words', says: 'On 10 September, somebody spoke about it, in their own words.' },
      ]);
      expect(lekki.contactHistorySays).toBe(WHAT_CONTACT_HISTORY_IS);
      expect(lekki.theirRead).toEqual({ who: 'Femi Okonkwo', words: FEMIS_WORDS, says: "Femi Okonkwo's read, in their own words." });
      expect(lekki.groupSays).toMatch(/^A colleague confirmed it\./);
      /* Where nobody said what it is worth, it says so. */
      expect(deal(b, 'Ikeja Bakery').value).toBeNull();
      expect(deal(b, 'Ikeja Bakery').valueSays).toBe(NO_VALUE_SAID);
      expect(deal(b, 'Ikeja Bakery').theirRead).toBeNull();
      /* No row claims a criterion; the grid says why once. */
      expect(grid(b).groupsNote[0]).toBe('Nothing on record says what a deal must show at each stage, so no group here says whether a criterion is met.');
    },
  );

  it('Femi reads his own deal with his own read, as his', async () => {
    const b = await boardAs(DEALS, ...FEMI);
    expect(deal(b, 'Lekki Cold Rooms').theirRead).toEqual({ who: 'You', words: FEMIS_WORDS, says: 'Your read, in your own words.' });
    expect(deal(b, 'Ikeja Bakery')).toBeUndefined();
  });

  it('Ngozi reads only her own deals, and none of Femi\'s words, where people see each other and where they do not', async () => {
    for (const s of [DEALS, { ...DEALS, peersVisibleToEachOther: false }]) {
      const b = await boardAs(s, ...NGOZI);
      expect(deal(b, 'Lekki Cold Rooms')).toBeUndefined();
      expect(JSON.stringify(b)).not.toContain('the owner told me twice');
      expect(deal(b, 'Ikeja Bakery').contactHistory.map((c: any) => c.on)).toEqual(['2026-09-16']);
    }
  });

  it('on a performance plan, Kwame, a colleague giving a view, reads none of Femi\'s words or his deal', async () => {
    const b = await boardAs({ ...DEALS, scenario: GroundScenario.PIP }, ...KWAME);
    expect(JSON.stringify(b)).not.toContain('the owner told me twice');
    expect(deal(b, 'Lekki Cold Rooms')).toBeUndefined();
  });
});
