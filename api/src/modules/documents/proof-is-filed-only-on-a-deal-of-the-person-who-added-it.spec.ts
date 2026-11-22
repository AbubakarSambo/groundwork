import { DocumentsService } from './documents.service';
import { fileTheProofOnItsItem, fileProofThatWasFiledOnNothing, WHICH_ITEM_PROOF_IS_ABOUT_PROMPT } from './proof-filed-on-its-item';

/**
 * RELEASE TEST, 22 NOVEMBER 2026, EVENING (bug 16). Amani and Sade are reps on Wairimu's "Sales team, Q4". Sade's deal "Duka Bora" is on record. Amani adds the
 * signed order form for "Shop: Mama Njeri Duka" in her check-in before any deal of hers is on record. It was filed as a signed order on Sade's Duka Bora, which
 * shares the word "Duka", so Wairimu's board said "The 1 sold came from one order, Duka Bora", Mama Njeri Duka read "Nothing has been shown to back them yet",
 * and once Amani's deal was on record the form was never filed again. The card in her check-in read "It looks like you run a shop called Mama Njeri Duka".
 * The model is a stand-in here: what is proved is what it is given, what it is told, and where the proof lands.
 */
const ORDER_FORM = 'MSINGI FOODS ORDER FORM\nShop: Mama Njeri Duka, Kilimani\nItem: Unga 2kg cartons x 20\nDate: 19 Nov 2026\nSigned: N. Wanjiru';
const THE_FORM = { id: 'doc-order', groundId: 'g-sales', participantId: 'p-amani', fileName: 'order.png', mimeType: 'image/png', uploaderNote: null, content: ORDER_FORM };
const SADES = { id: 'w-duka-bora', kind: 'deal', name: 'Duka Bora', ownerParticipantId: 'p-sade', fields: { Stage: 'Waitlist' } };
const AMANIS = { id: 'w-njeri', kind: 'deal', name: 'Mama Njeri Duka', ownerParticipantId: 'p-amani', fields: { Units: '20 cartons' } };

function theRecord(items: any[]) {
  const evidence: any[] = [];
  const prisma: any = {
    ground: { findUnique: async () => ({ organizationId: 'o-msingi' }) },
    workItem: { findMany: async () => items },
    conversationTurn: { findFirst: async () => ({ content: 'Mama Njeri Duka in Kilimani signed the order for 20 cartons of unga on 19 November, here is the signed order form' }) },
    groundDocument: { findUnique: async () => THE_FORM },
    itemEvidence: {
      create: async ({ data }: any) => { const e = { id: `ev-${evidence.length + 1}`, ...data }; evidence.push(e); return { id: e.id, itemName: e.itemName }; },
      findMany: async ({ where }: any) => evidence.filter((e) => e.groundId === where.groundId && e.countsAsProof),
      update: async ({ where, data }: any) => Object.assign(evidence.find((e) => e.id === where.id), data),
    },
  };
  return { prisma, evidence, items };
}

/* A stand-in for the model that reads it right: the form is about Mama Njeri Duka, where that is one of the items it is given. */
function aModelThatReads() {
  const asked: { system: string; user: string }[] = [];
  const extract = jest.fn(async (system: string, h: any[]) => {
    asked.push({ system, user: h[0].content });
    return { itemId: /id w-njeri: Mama Njeri Duka/.test(h[0].content) ? 'w-njeri' : '' };
  });
  return { reader: { extract }, asked, extract };
}

describe('proof is filed only on a deal of the person who added it, the one it is about', () => {
  it('added before any deal of hers is on record, the form waits on no deal, and Sade\'s Duka Bora, which shares a word with it, is never given it', async () => {
    const { prisma, evidence } = theRecord([SADES]);
    const { reader, extract } = aModelThatReads();
    await fileTheProofOnItsItem(prisma, reader, THE_FORM);
    expect(evidence[0]).toMatchObject({ participantId: 'p-amani', readAs: 'A signed order', countsAsProof: true, workItemId: null, itemName: null });
    /* With no item of hers, there is nothing to read it against. */
    expect(extract).not.toHaveBeenCalled();
  });

  it('once her own deal is on record, the form is filed on Mama Njeri Duka, and the model was given only her deals', async () => {
    const r = theRecord([SADES]);
    const { reader, asked } = aModelThatReads();
    await fileTheProofOnItsItem(r.prisma, reader, THE_FORM);
    r.items.push(AMANIS);
    expect(await fileProofThatWasFiledOnNothing(r.prisma, reader, 'g-sales')).toBe(1);
    expect(r.evidence[0]).toMatchObject({ workItemId: 'w-njeri', itemName: 'Mama Njeri Duka' });
    expect(asked).toHaveLength(1);
    expect(asked[0].system).toBe(WHICH_ITEM_PROOF_IS_ABOUT_PROMPT);
    expect(asked[0].user).toContain('- id w-njeri: Mama Njeri Duka (Units 20 cartons)');
    expect(asked[0].user).not.toContain('Duka Bora');
    expect(asked[0].user).toContain('Shop: Mama Njeri Duka, Kilimani');
  });

  it('the form already filed on Sade\'s Duka Bora moves to Amani\'s own deal, and off Sade\'s while hers is not on record', async () => {
    const r = theRecord([SADES]);
    const { reader } = aModelThatReads();
    r.evidence.push({ id: 'ev-old', groundId: 'g-sales', documentId: 'doc-order', participantId: 'p-amani', workItemId: 'w-duka-bora', itemName: 'Duka Bora', readAs: 'A signed order', countsAsProof: true });
    await fileProofThatWasFiledOnNothing(r.prisma, reader, 'g-sales');
    expect(r.evidence[0]).toMatchObject({ workItemId: null, itemName: null });
    r.items.push(AMANIS);
    await fileProofThatWasFiledOnNothing(r.prisma, reader, 'g-sales');
    expect(r.evidence[0]).toMatchObject({ workItemId: 'w-njeri', itemName: 'Mama Njeri Duka' });
  });

  it('the rule the model runs reads the document for her own items, by the whole name, and never guesses', () => {
    expect(WHICH_ITEM_PROOF_IS_ABOUT_PROMPT).toContain('Say which one of their own items it is about, by its id.');
    expect(WHICH_ITEM_PROOF_IS_ABOUT_PROMPT).toContain('A different name that only shares a word with an item is a different customer, not that item.');
    expect(WHICH_ITEM_PROOF_IS_ABOUT_PROMPT).toContain('Where the document is about none of these items, or about more than one, leave itemId empty. Never guess.');
  });

  it('an answer that names an item that is not hers is never used', async () => {
    const r = theRecord([SADES, AMANIS]);
    await fileTheProofOnItsItem(r.prisma, { extract: async () => ({ itemId: 'w-duka-bora' }) }, THE_FORM);
    expect(r.evidence[0]).toMatchObject({ workItemId: null });
  });
});

describe('the card in her check-in says what the form is, never that she runs the shop on it', () => {
  it('the model is told the document is often about a customer, and what Groundwork does with it', async () => {
    const s = Object.create(DocumentsService.prototype) as any;
    s.logger = { log: jest.fn(), warn: jest.fn() };
    const extract = jest.fn(async () => ({
      suggests: ['This is a signed order from Mama Njeri Duka in Kilimani for 20 cartons of Unga 2kg.', 'N. Wanjiru signed it on 19 November 2026.'],
      willDo: ['I will keep it as proof for the Mama Njeri Duka sale.'],
    }));
    s.anthropic = { extract };
    const card = await s.assessDocument(ORDER_FORM, 'order.png');
    const told = (extract.mock.calls as any[])[0][0] as string;
    expect(told).toContain('A document is often about somebody else: a customer, a client, a supplier or another business. Never take the person who added it to be the business, shop or person the document names, and never say "you run" or "your business" about what it names.');
    expect(told).toContain('Never say it will do anything else, such as verify an address or a relationship.');
    expect(told).not.toContain('a party just uploaded');
    console.log(`THE CARD AMANI READS\nWhat this suggests\n${card.suggests.join('\n')}\nWhat I will do with it\n${card.willDo.join('\n')}`);
    expect(card.suggests[0]).toBe('This is a signed order from Mama Njeri Duka in Kilimani for 20 cartons of Unga 2kg.');
  });
});
