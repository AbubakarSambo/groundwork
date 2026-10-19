import { boardAs, SALES_RUN, BISI, FEMI, commitment, type Setup } from './the-switchboards-sections-harness';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 5. Grace's board gave Kilele Hotel, Greenfield Supermarket and Mama Pima
 * Stores the next step "Be following up more closely with each rep on the details of their active deals, especially Kilele
 * Hotel, Greenfield Supermarket, and Mama Pima Stores", her own promise of 12 October, because it names them. Her promise is
 * hers; a deal's next step is what is said about that deal. Here Bisi runs it and makes the same promise, word for word.
 */
const NOW = new Date('2026-09-23T15:00:00Z');
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-22T09:00:00Z'), updatedAt: new Date('2026-09-22T09:00:00Z'), ...more,
});
const GRACES_PROMISE = "I'm going to be following up more closely with each rep on the details of their active deals, especially Kilele Hotel, Greenfield Supermarket, and Mama Pima Stores.";
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  releaseOneSalesBoard: true,
  clock: { now: NOW, endsAt: new Date('2026-09-30T17:00:00Z') },
  items: [
    item('w-kilele', 'Kilele Hotel', { stage: 'Won', ownerParticipantId: 'p-femi', fields: { Units: '40', Value: 'KES 200,000' } }),
    item('w-green', 'Greenfield Supermarket', { stage: 'Won', ownerParticipantId: 'p-ngozi', fields: { Units: '25', 'Next step': "Delivery is set for Friday, and they'll pay then." } }),
  ],
  commitments: [
    commitment('k-grace', 'p-bisi', GRACES_PROMISE, { statedInSession: 1, saidWordForWord: true, createdAt: new Date('2026-09-22T08:00:00Z') }),
    commitment('k-femi', 'p-femi', 'I will arrange the Kilele Hotel delivery with them.', { statedInSession: 2, saidWordForWord: true, createdAt: new Date('2026-09-22T10:00:00Z') }),
  ],
};
const rows = (b: any) => (b.workRecords ?? []).flatMap((g: any) => g.rows ?? []);
const row = (b: any, name: string) => rows(b).find((r: any) => r.name === name);

describe('the lead\'s own promise is never a deal\'s next step', () => {
  it('Bisi reads each deal\'s own next step, never her promise', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(JSON.stringify(rows(b).map((r: any) => [r.next, r.nextStep, r.nextSays]))).not.toMatch(/following up more closely/);
    expect(row(b, 'Kilele Hotel').nextSays).toBe('Femi Okonkwo committed to arrange the Kilele Hotel delivery with them.');
    expect(row(b, 'Greenfield Supermarket').nextSays).not.toMatch(/You committed/);
  });

  it('Femi reads his deal\'s next step as his', async () => {
    const f = await boardAs(RUN, ...FEMI);
    expect(row(f, 'Kilele Hotel').nextSays).toBe('You committed to arrange the Kilele Hotel delivery with them.');
  });

  it('with the switch off, the board reads as before', async () => {
    const b = await boardAs({ ...RUN, releaseOneSalesBoard: false }, ...BISI);
    expect(JSON.stringify(rows(b).map((r: any) => r.nextSays))).toMatch(/following up more closely/);
  });
});
