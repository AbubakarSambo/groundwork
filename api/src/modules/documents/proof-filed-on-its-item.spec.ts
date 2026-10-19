import { DocumentsService } from './documents.service';
import { fileTheProofOnItsItem, whatTheProofIs, theItemItNames, whatItShows } from './proof-filed-on-its-item';

/**
 * PROOF ADDED IN A CHECK-IN IS FILED ON ITS ITEM (Release 1B, pull request 2 of 3; references-upload-in-check-in.txt). Mercy
 * adds the signed Greenfield Hardware order in her check-in: it is read as a signed order, counts as proof, and is filed on
 * Greenfield Hardware. The Mama Mboga visit photo is kept as a photo, which is not proof of a sale. With the switch off,
 * nothing is filed at all. No model call anywhere: the words are the ones the existing reading already took out.
 */
const NOW = new Date('2026-10-16T09:00:00Z');
const DEALS = [
  { id: 'w-greenfield', kind: 'deal', name: 'Greenfield Hardware', ownerParticipantId: 'p-mercy', fields: { Contact: 'J. Mwangi' } },
  { id: 'w-mama', kind: 'deal', name: 'Mama Mboga Mart', ownerParticipantId: 'p-mercy', fields: { Contact: 'Rose' } },
  { id: 'w-kilele', kind: 'deal', name: 'Kilele Supplies', ownerParticipantId: 'p-kevin', fields: null },
  { id: 'w-idea', kind: 'idea', name: 'Greenfield Hardware loyalty card', ownerParticipantId: 'p-mercy', fields: null },
];

function theDatabase(over: { switchOn?: boolean; lastSaid?: string | null } = {}) {
  const made: any[] = [];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-drop' })) },
    organization: { findUnique: jest.fn(async () => ({ release1bTabsOn: over.switchOn ?? true })) },
    workItem: { findMany: jest.fn(async () => DEALS) },
    conversationTurn: { findFirst: jest.fn(async () => (over.lastSaid ? { content: over.lastSaid } : null)) },
    itemEvidence: { create: jest.fn(async ({ data }: any) => { made.push(data); return { id: `e-${made.length}`, itemName: data.itemName }; }) },
  };
  return { prisma, made };
}

const ORDER = {
  id: 'd-order', groundId: 'g-sales', participantId: 'p-mercy', fileName: 'IMG_2231.jpg', mimeType: 'image/jpeg', uploaderNote: null,
  content: 'A purchase order from Greenfield Hardware for 25 x 20 L dispensers at KES 4,500 (KES 112,500). Signed by J. Mwangi. Dated 13 October 2026.',
};
const VISIT = {
  id: 'd-visit', groundId: 'g-sales', participantId: 'p-mercy', fileName: 'IMG_2228.jpg', mimeType: 'image/jpeg', uploaderNote: null,
  content: 'A water dispenser on display at a shop counter. There is no order, price or signature in it.',
};

describe('a document added in a check-in is filed on its item', () => {
  it('the signed order is read as a signed order, counts as proof, and is filed on Greenfield Hardware', async () => {
    const { prisma, made } = theDatabase();
    const out = await fileTheProofOnItsItem(prisma, ORDER, NOW);
    expect(out).toEqual({ id: 'e-1', itemName: 'Greenfield Hardware' });
    expect(made[0]).toEqual({
      groundId: 'g-sales', documentId: 'd-order', participantId: 'p-mercy', workItemId: 'w-greenfield', itemName: 'Greenfield Hardware',
      readAs: 'A signed order', countsAsProof: true,
      shows: 'A purchase order from Greenfield Hardware for 25 x 20 L dispensers at KES 4,500 (KES 112,500).',
    });
  });

  it('a visit photo is a photo, not proof of a sale, and is filed on the deal her words in the check-in name', async () => {
    const { prisma, made } = theDatabase({ lastSaid: 'On delivery, next Friday. Also, this is from Mama Mboga yesterday.' });
    await fileTheProofOnItsItem(prisma, VISIT, NOW);
    expect(made[0]).toMatchObject({ workItemId: 'w-mama', itemName: 'Mama Mboga Mart', readAs: 'A photo', countsAsProof: false });
  });

  it('a document that names no item, or two, is kept as evidence on no item: never a guess', async () => {
    const { prisma, made } = theDatabase();
    await fileTheProofOnItsItem(prisma, { ...VISIT, id: 'd-none' }, NOW);
    expect(made[0]).toMatchObject({ workItemId: null, itemName: null });
    expect(theItemItNames('Greenfield Hardware and Kilele Supplies both ordered', DEALS, 'p-joseph')).toBeNull();
  });

  it('with the switch off, nothing is filed and nothing is written', async () => {
    const { prisma, made } = theDatabase({ switchOn: false });
    expect(await fileTheProofOnItsItem(prisma, ORDER, NOW)).toBeNull();
    expect(made).toEqual([]);
    expect(prisma.workItem.findMany).not.toHaveBeenCalled();
  });
});

describe('what the proof is, by the board’s own rules', () => {
  it('an order, a payment and a quote count; a photo and a plain document do not', () => {
    expect(whatTheProofIs('Signed order for 25 units', 'image/jpeg')).toEqual({ readAs: 'A signed order', countsAsProof: true });
    expect(whatTheProofIs('M-PESA confirmed. Ksh180,000.00 received from KILELE SUPPLIES', 'image/png')).toEqual({ readAs: 'A payment', countsAsProof: true });
    expect(whatTheProofIs('Quotation for 20 units, KES 90,000', 'application/pdf')).toEqual({ readAs: 'A quote', countsAsProof: true });
    expect(whatTheProofIs('A dispenser on a shop counter', 'image/jpeg')).toEqual({ readAs: 'A photo', countsAsProof: false });
    expect(whatTheProofIs('Notes from the visit', 'application/pdf')).toEqual({ readAs: 'A document', countsAsProof: false });
  });

  it('what it shows is its first sentence, and nothing for a file that could not be read', () => {
    expect(whatItShows('Greenfield Hardware orders 25 dispensers. Signed by J. Mwangi.')).toBe('Greenfield Hardware orders 25 dispensers.');
    expect(whatItShows('')).toBeNull();
  });
});

describe('the upload files it only when it was added in a check-in', () => {
  const svc = (switchOn: boolean) => {
    const filed: any[] = [];
    const s = Object.create(DocumentsService.prototype) as any;
    s.conversation = { anchorRecordToDocuments: async () => ({ backed: 0, of: 0 }) };
    s.logger = { log: () => {}, warn: () => {} };
    s.assertParticipant = async () => ({ id: 'p-mercy' });
    s.extractContent = async () => ORDER.content;
    s.assessDocument = async () => null;
    s.readTheRestOfIt = async () => null;
    s.anchorAfterUpload = () => undefined;
    s.config = { get: () => true };
    s.prisma = {
      groundDocument: { create: async (a: any) => ({ id: 'd-order', ...a.data, createdAt: NOW }) },
      ground: { findUnique: async () => ({ organizationId: 'org-drop' }) },
      organization: { findUnique: async () => ({ release1bTabsOn: switchOn }) },
      workItem: { findMany: async () => DEALS },
      conversationTurn: { findFirst: async () => null },
      itemEvidence: { create: async ({ data }: any) => { filed.push(data); return { id: 'e-1', itemName: data.itemName }; } },
    };
    return { s, filed };
  };
  const photo = { originalname: 'IMG_2231.jpg', mimetype: 'image/jpeg', size: 100, buffer: Buffer.from('x') } as any;

  it('in her check-in, with the switch on: filed, and the answer says where', async () => {
    const { s, filed } = svc(true);
    const res = await s.upload('g-sales', 'u-mercy', photo, false, undefined, { fromTheCheckIn: true });
    expect(filed.map((f) => [f.itemName, f.readAs])).toEqual([['Greenfield Hardware', 'A signed order']]);
    expect(res.filedAsEvidence).toEqual({ on: 'Greenfield Hardware' });
  });

  it('sent on WhatsApp during a check-in: filed the same way', async () => {
    const { s, filed } = svc(true);
    await s.upload('g-sales', 'u-mercy', photo, false, undefined, { sharedWithTheCheckIn: true });
    expect(filed).toHaveLength(1);
  });

  it('added anywhere else (References and resources, a plan, Ask): a document, never evidence', async () => {
    const { s, filed } = svc(true);
    const res = await s.upload('g-sales', 'u-mercy', photo, false);
    expect(filed).toEqual([]);
    expect(res.filedAsEvidence).toBeUndefined();
  });

  it('in a check-in with the switch off: nothing filed, and the answer is as before', async () => {
    const { s, filed } = svc(false);
    const res = await s.upload('g-sales', 'u-mercy', photo, false, undefined, { fromTheCheckIn: true });
    expect(filed).toEqual([]);
    expect('filedAsEvidence' in res).toBe(false);
  });
});
