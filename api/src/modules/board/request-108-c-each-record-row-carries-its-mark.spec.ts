import { GroundScenario } from '@prisma/client';
import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, SETUP_ADMIN, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 108 (c): EACH KIND-OF-WORK RECORD ROW CARRIES ITS PROOF MARK.
 *
 * The prototype's record table keys its rows "Ringed is someone's word; filled is proven", with the dot
 * the screens already draw as ProofMark (`proven`, `confirmed`, `said`, `memory`, `none`). Each row in
 * `workRecords[].rows` now has `mark`, the mark of the line the record came from, the same mark every line
 * on the board carries; `none` for a record added on the board. Never upgraded: a line backed by somebody
 * else's document is that person's word, not proof.
 *
 * Read on the sales run (api/journey/all-24/re-f/sales.json), with the lines word for word as each person
 * said them, as every reader.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  recordLines: [
    /* Ngozi's own count, with the approval letters she attached. */
    { id: 'e-ngozi', participantId: 'p-ngozi', text: 'Six facilities are approved out of my total target of 14 for the quarter.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-ngozi' },
    /* Kwame's figure, with nothing attached. */
    { id: 'e-kwame', participantId: 'p-kwame', text: 'That N8 million disbursed represents three approved facilities.', recallBased: true },
    /* Femi's figure, with the lead's pipeline sheet behind it: not his proof. */
    { id: 'e-femi', participantId: 'p-femi', text: 'I have 31 applications that I\'ve taken from businesses.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-bisi' },
    /* Femi's, confirmed by the colleague who received the forms. */
    { id: 'e-femi-2', participantId: 'p-femi', text: 'I filled out all the forms completely.', confirmedAt: new Date('2026-09-17T09:00:00Z') },
    { id: 'e-ngozi-2', participantId: 'p-ngozi', text: 'I have already sent him a written escalation.' },
  ],
  documents: [
    { id: 'doc-ngozi', participantId: 'p-ngozi', fileName: 'approval-letters.pdf', visibility: 'EVERYONE' },
    { id: 'doc-bisi', participantId: 'p-bisi', fileName: 'pipeline.xlsx', visibility: 'EVERYONE' },
  ],
  items: [
    item('w-ngozi', 'Ikeja Bakery', { stage: 'Won', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi' }),
    item('w-kwame', 'Jos Grain Traders', { stage: 'Won', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-kwame' }),
    item('w-femi', 'Mama Ngozi Kitchens', { stage: 'Applied', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi' }),
    item('w-femi-2', 'Lekki Cold Rooms', { stage: 'Applied', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi-2' }),
    item('w-ngozi-2', 'Head of Credit escalation', { stage: 'Submitted', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi-2' }),
    item('w-lead', 'Plateau Foods', { stage: 'Contacted', addedByUserId: 'u-bisi' }),
  ],
};
const marks = (b: any) => Object.fromEntries(((b.workRecords ?? []) as any[]).flatMap((s) => s.rows ?? []).map((r: any) => [r.name, r.mark]));
const EVERY_MARK = {
  'Ikeja Bakery': 'proven',
  'Jos Grain Traders': 'memory',
  'Mama Ngozi Kitchens': 'memory',
  'Lekki Cold Rooms': 'confirmed',
  'Head of Credit escalation': 'said',
  'Plateau Foods': 'none',
};

describe('request 108 (c): each record row carries its mark', () => {
  it.each([
    ['Bisi, who runs it', BISI, RUN],
    ['Juma, an admin who only reads', JUMA, RUN],
    ['the admin who set it up', SETUP_ADMIN, { ...RUN, createdByUserId: 'u-setup' }],
  ] as const)('%s reads every row with its own mark, the lead\'s own as none', async (_who, reader, setup) => {
    const b = await boardAs(setup as Setup, reader[0], reader[1]);
    expect(marks(b)).toEqual(EVERY_MARK);
  });

  it('a line backed by somebody else\'s document is never marked proven', async () => {
    const b = await boardAs(RUN, ...BISI);
    /* A figure about what happened with nothing of his own attached: from memory, as the line itself is marked. */
    expect(marks(b)['Mama Ngozi Kitchens']).toBe('memory');
    const row = (b.workRecords as any[]).flatMap((s) => s.rows).find((r: any) => r.name === 'Mama Ngozi Kitchens');
    expect(row).toMatchObject({ known: 'said', knownSays: 'Someone said it.' });
  });

  it('Femi reads only his own rows, each with its mark', async () => {
    const b = await boardAs(RUN, ...FEMI);
    expect(marks(b)).toEqual({ 'Mama Ngozi Kitchens': 'memory', 'Lekki Cold Rooms': 'confirmed' });
  });

  it('Ngozi, where people see only themselves, reads only her own', async () => {
    const b = await boardAs({ ...RUN, peersVisibleToEachOther: false }, ...NGOZI);
    expect(marks(b)).toEqual({ 'Ikeja Bakery': 'proven', 'Head of Credit escalation': 'said' });
  });

  it('every mark is one ProofMark reads', async () => {
    const b = await boardAs(RUN, ...BISI);
    for (const m of Object.values(marks(b))) expect(['proven', 'confirmed', 'said', 'memory', 'none']).toContain(m);
  });

  it('on a performance plan, Femi as the person reviewed and Kwame giving a view read no colleague\'s row', async () => {
    const pip: Setup = { ...RUN, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' };
    const femi = await boardAs(pip, ...FEMI);
    /* The person reviewed keeps the board his own rules narrowed (request 105): his rows, and a record nobody's name is on. */
    expect(marks(femi)).toEqual({ 'Mama Ngozi Kitchens': 'memory', 'Lekki Cold Rooms': 'confirmed', 'Plateau Foods': 'none' });
    expect(marks(await boardAs(pip, ...KWAME))).toEqual({ 'Jos Grain Traders': 'memory' });
  });
});
