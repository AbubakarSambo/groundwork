import { boardAs, SALES_RUN, BISI, FEMI, type Setup } from './the-switchboards-sections-harness';
import { theMarkForTheDeal, theDocumentsWords } from './a-deals-proof-is-about-that-deal';
import { fileProofThatWasFiledOnNothing, fileTheProofOnItsItem, whatTheProofIs } from '../documents/proof-filed-on-its-item';
import { ConversationService } from '../conversation/conversation.service';

/**
 * A SIGNED ORDER FORM IS WHAT IT READS AS, AND EVERY PAGE READS THE SAME DEAL (release test, 22 November 2026, bugs 16, 17 and 18).
 *
 * Amani said "Mama Njeri Duka signed with an order of 20 cartons, and Kilimani Fresh gave a verbal yes", then added the signed order
 * form. Groundwork said what the form shows and asked "What does this confirm about what they have told you?". She answered with
 * Kilimani Fresh's wait on Baraka. That answer was kept as what the form is, the form was then read as not what she said it was, and a
 * document that does not read as described backs nothing: no line was backed by it, it was filed on no deal ("Not filed on a deal yet"),
 * and the board, My work and Ask all said the sale had no proof. Her answer is no longer kept as the form's description.
 *
 * Kilimani Fresh, spoken of in the check-in, read "Not contacted yet" beside its last contact today: a deal spoken of was put at
 * Contacted only behind Release 1's switch. And with that switch off, the deal grid served "Won" from words alone as the stage.
 * Here Femi is the rep and Bisi runs it; Release 1's switch is off, as for Amani's organisation.
 */
const ORDER_FORM = 'MSINGI FOODS ORDER FORM\nShop: Mama Njeri Duka, Kilimani\nItem: Unga 2kg cartons x 20\nDate: 19 Nov 2026\nSigned: N. Wanjiru';
const HER_ANSWER = 'kilimani is waiting on baraka in operations for the delivery schedule. he said wait 5 days. i need an answer by next friday or we lose kilimani fresh';
const THE_FORM = { id: 'doc-order', participantId: 'p-femi', fileName: 'order.png', uploaderNote: null, content: ORDER_FORM, createdAt: new Date('2026-11-22T04:59:14Z'), visibility: 'OWN' };

const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: 'p-femi', dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-11-22T05:02:33Z'), updatedAt: new Date('2026-11-22T05:02:33Z'), ...more,
});
const at = new Date('2026-11-22T05:01:44Z');
/* Her lines as the check-in wrote them, with the signed-order line backed by the form now that the form can back it. */
const LINES = [
  { id: 'e-signed', participantId: 'p-femi', type: 'PROGRESS', text: 'Mama Njeri Duka signed with an order of 20 cartons', recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: 'doc-order', createdAt: at },
  { id: 'e-form', participantId: 'p-femi', type: 'PROGRESS', text: 'yes I have the signed order form from Mama Njeri', recallBased: true, createdAt: at },
  { id: 'e-wait', participantId: 'p-femi', type: 'WORRY', text: HER_ANSWER, recallBased: true, createdAt: at },
  { id: 'e-lpo', participantId: 'p-ngozi', type: 'PROGRESS', text: 'quickmart ruaka ordered, KES 61,200, i have the LPO.', recallBased: true, createdAt: at },
];
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales team',
  releaseOneSalesBoard: false,
  clock: { now: new Date('2026-11-22T09:00:00Z'), endsAt: new Date('2027-01-29T17:00:00Z') },
  recordLines: LINES,
  lines: LINES,
  documents: [THE_FORM as any],
  items: [
    item('w-kilimani', 'Kilimani Fresh', { sourceEntryId: 'e-wait', fields: { 'Next step': 'need an answer by next friday' } }),
    item('w-njeri', 'Mama Njeri Duka', { stage: 'Won', sourceEntryId: 'e-form', fields: { Units: '20 cartons' } }),
    item('w-quickmart', 'quickmart ruaka', { stage: 'Won', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-lpo', fields: { Value: 'KES 61,200' } }),
  ],
};
/* Which of her deals the form is about is the model's reading now (bug 16, evening of 22 November); a stand-in answers as the model reads the form. */
const READS_MAMA_NJERI = { extract: async (_s: string, h: any[]) => ({ itemId: /id w-njeri: Mama Njeri Duka/.test(h[0].content) ? 'w-njeri' : '' }) };
const grid = (b: any) => ((b.workRecords ?? []) as any[]).find((s) => s.section === 'Deal grid');
const row = (b: any, name: string) => grid(b)?.rows.find((r: any) => r.name === name);
const heading = (b: any, id: string) => grid(b)?.groups.find((g: any) => g.rowIds.includes(id))?.heading;

describe('her answer to "what does it confirm" is not the form\'s description', () => {
  it('the turn that says what the form shows is not stamped as asking what the document is', async () => {
    const svc: any = Object.create(ConversationService.prototype);
    const created: any[] = [];
    svc.loadOwnedOpenCheckIn = async () => ({ id: 'c-1', groundId: 'g-1', participantId: 'p-femi' });
    svc.theContextNotYetSaid = async () => null;
    svc.logger = { warn: () => undefined, log: () => undefined };
    svc.anthropic = { respond: async () => 'This is an order form. It shows that Mama Njeri Duka in Kilimani ordered 20 Unga 2kg cartons. What does this confirm about what they have told you?' };
    svc.prisma = {
      groundDocument: { findFirst: async () => ({ ...THE_FORM, groundId: 'g-1', mimeType: 'image/png' }), update: jest.fn() },
      itemEvidence: { findFirst: async () => ({ id: 'e-1' }) },
      conversationTurn: { create: async ({ data }: any) => { created.push(data); return data; } },
    };
    await svc.documentReceived('c-1', 'u-femi');
    expect(created).toHaveLength(1);
    expect(String(created[0].askedFor ?? '')).not.toContain('doc-order');
    expect(String(created[0].askedFor ?? '')).not.toMatch(/^describes document:/);
    expect(svc.prisma.groundDocument.update).not.toHaveBeenCalled();
    expect(svc.keepTheDocumentDescription).toBeUndefined();
  });

  it('the form, as it reads, is filed on Mama Njeri Duka once her deals are on record, whatever note it was added with', async () => {
    const run = async (note: string | null) => {
      const evidence = [{ id: 'ev-1', groundId: 'g-1', documentId: 'doc-order', participantId: 'p-femi', workItemId: null as string | null, itemName: null as string | null, countsAsProof: true }];
      const prisma: any = {
        itemEvidence: {
          findMany: async () => evidence.filter((e) => e.workItemId === null),
          update: async ({ where, data }: any) => Object.assign(evidence.find((e) => e.id === where.id)!, data),
        },
        workItem: { findMany: async () => RUN.items },
        groundDocument: { findUnique: async () => ({ fileName: 'order.png', uploaderNote: note, content: ORDER_FORM }) },
      };
      await fileProofThatWasFiledOnNothing(prisma, READS_MAMA_NJERI, 'g-1');
      return evidence[0].itemName;
    };
    expect(await run(null)).toBe('Mama Njeri Duka');
    /* The form's own words name Mama Njeri Duka; a note that names Kilimani Fresh no longer files it on nothing (final run, 22 November). */
    expect(await run(HER_ANSWER)).toBe('Mama Njeri Duka');
  });

  it('an order form with the customer\'s signature on it reads as a signed order and counts as proof', () => {
    expect(whatTheProofIs(`order.png ${ORDER_FORM}`, 'image/png')).toEqual({ readAs: 'A signed order', countsAsProof: true });
    expect(whatTheProofIs('order.png MSINGI FOODS ORDER FORM Shop: Mama Njeri Duka Item: Unga 2kg cartons x 20', 'image/png').readAs).not.toBe('A signed order');
  });

  it('added two minutes before her deals were on record, the form is kept as a signed order on nothing, then filed on Mama Njeri Duka', async () => {
    const evidence: any[] = [];
    let items: any[] = [];
    const prisma: any = {
      ground: { findUnique: async () => ({ organizationId: 'o-1' }) },
      workItem: { findMany: async () => items },
      conversationTurn: { findFirst: async () => ({ content: HER_ANSWER }) },
      itemEvidence: {
        create: async ({ data }: any) => { const e = { id: 'ev-1', ...data }; evidence.push(e); return e; },
        findMany: async ({ where }: any) => evidence.filter((e) => e.workItemId === null && (!where.countsAsProof || e.countsAsProof)),
        update: async ({ where, data }: any) => Object.assign(evidence.find((e) => e.id === where.id), data),
      },
      groundDocument: { findUnique: async () => ({ fileName: 'order.png', uploaderNote: HER_ANSWER, content: ORDER_FORM }) },
    };
    await fileTheProofOnItsItem(prisma, READS_MAMA_NJERI, { id: 'doc-order', groundId: 'g-1', participantId: 'p-femi', fileName: 'order.png', mimeType: 'image/png', uploaderNote: HER_ANSWER, content: ORDER_FORM });
    expect(evidence[0]).toMatchObject({ readAs: 'A signed order', countsAsProof: true, workItemId: null });
    items = RUN.items ?? [];
    expect(await fileProofThatWasFiledOnNothing(prisma, READS_MAMA_NJERI, 'g-1')).toBe(1);
    expect(evidence[0]).toMatchObject({ workItemId: 'w-njeri', itemName: 'Mama Njeri Duka' });
  });

  it('the form proves Mama Njeri Duka and not Kilimani Fresh; with her answer as its note it named Kilimani Fresh too', () => {
    expect(theMarkForTheDeal('proven', theDocumentsWords(THE_FORM), { name: 'Mama Njeri Duka' })).toBe('proven');
    expect(theMarkForTheDeal('proven', theDocumentsWords(THE_FORM), { name: 'Kilimani Fresh' })).toBe('said');
    expect(theMarkForTheDeal('proven', theDocumentsWords({ ...THE_FORM, uploaderNote: HER_ANSWER }), { name: 'Kilimani Fresh' })).toBe('proven');
  });
});

describe('every reader reads the same three deals, with Release 1\'s switch off', () => {
  it.each([['Bisi, who runs it', BISI], ['Femi, the rep', FEMI]] as const)('%s', async (_who, reader) => {
    const b = await boardAs(RUN, reader[0], reader[1]);
    /* Bug 16: her signed order shows the sale. */
    expect(row(b, 'Mama Njeri Duka').mark).toBe('proven');
    expect(row(b, 'Mama Njeri Duka').knownSays).toBe('Proof shows it.');
    expect(row(b, 'Mama Njeri Duka').stageSays).toBeUndefined();
    expect(heading(b, 'w-njeri')).toBe('Won');
    /* Bug 17: spoken of in a check-in, so contacted. */
    expect(row(b, 'Kilimani Fresh').stage).toBe('Contacted');
    expect(row(b, 'Kilimani Fresh').mark).not.toBe('proven');
  });

  it('Bisi reads Quickmart Ruaka, said to be won on words alone, as said and not shown (bug 18)', async () => {
    const b = await boardAs(RUN, BISI[0], BISI[1]);
    expect(row(b, 'quickmart ruaka').stageSays).toBe('Said to be won, not shown yet');
    expect(heading(b, 'w-quickmart')).toBe('Said to be won, not shown yet');
  });
});
