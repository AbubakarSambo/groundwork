import { DocumentsService } from './documents.service';
import { withoutBankDetails } from './bank-details-are-never-kept';
import { canSeeDocument } from './who-can-see-a-document';
import { aDocumentReadItemByItem, PAGES_NOT_KNOWN } from './a-document-read-item-by-item';

/**
 * A DOCUMENT READ ITEM BY ITEM, WITH PAGES (week 14, screens request 6c).
 *
 * Read the way a person reads it: the file is read as at upload (the model's answer is fixed, the
 * pages are found by the product), kept on the row, and then served through `list`, the read the
 * "Add a document" and Context pages use, to the lead, to the person who added it, and to a
 * colleague. The list's query is stood in for by the rule it is proved against (canSeeDocument).
 */

const people = {
  lead: { id: 'p-lead', userId: 'u-lead', email: 'wairimu@x.test', managingOnly: false, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
  otieno: { id: 'p-ot', userId: 'u-ot', email: 'otieno@x.test', managingOnly: false, user: { firstName: 'Otieno', lastName: 'Ouma' } },
  amina: { id: 'p-am', userId: 'u-am', email: 'amina@x.test', managingOnly: false, user: { firstName: 'Amina', lastName: 'Yusuf' } },
};

/* pdf-parse ends every page with its own marker, and the stored text keeps it. */
const PRICE_LIST_PDF = [
  'Q3 price list\nFreezer models 200L to 600L\nLowest price for the 600L: KES 76,000',
  '-- 1 of 4 --',
  'Delivery by 9 October\nOtieno Q3 sales 45,000,000',
  '-- 2 of 4 --',
  'Sample quotes',
  '-- 3 of 4 --',
  'Pay to account number 0123456789 at Equity Bank.',
  '-- 4 of 4 --',
].join('\n');

const THE_MODEL_READS = {
  whatItIs: 'A price list for the Q3 freezers.',
  forOnePerson: [{ personName: 'Otieno', what: 'Q3 sales', target: 45_000_000, by: null }],
  forEverybody: [{ what: 'lowest price for the 600L', target: 76_000, kind: 'not to exceed', by: null }],
  dates: [{ what: 'delivery', when: 'by 9 October' }],
};

function aService(rows: any[]) {
  const s = Object.create(DocumentsService.prototype) as any;
  s.prisma = {
    ground: { findUnique: jest.fn(async () => ({ initiatorId: 'u-lead', participants: Object.values(people), objectives: [] })) },
    groundParticipant: { findFirst: jest.fn(async ({ where }: any) => Object.values(people).find((p) => p.userId === where.userId) ?? null) },
    groundDocument: {
      update: jest.fn(async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id); if (r) Object.assign(r, data); return r; }),
      findMany: jest.fn(async () => rows),
    },
  };
  s.anthropic = { extract: jest.fn(async () => THE_MODEL_READS) };
  s.config = { get: jest.fn((k: string) => (k === 'app.contextEnabled' ? true : undefined)) };
  s.logger = { log: jest.fn(), warn: jest.fn() };
  return s;
}

/** What `list` serves this person: the rows the visibility rule lets them see, in the served shape. */
async function servedTo(s: any, rows: any[], who: keyof typeof people) {
  const me = people[who];
  s.prisma.groundDocument.findMany = jest.fn(async () =>
    rows.filter((r) => canSeeDocument(r, { participantId: me.id, isLead: me.userId === 'u-lead' }, true)));
  return s.list('g-1', me.userId);
}

async function aRowReadAs(uploader: keyof typeof people, visibility: 'OPEN' | 'OWN', content = PRICE_LIST_PDF, fileName = 'Q3 price list.pdf') {
  const row: any = { id: `d-${uploader}`, fileName, mimeType: 'application/pdf', createdAt: new Date(), assessment: null, visibility, participantId: people[uploader].id, holds: null, uploaderNote: null };
  const s = aService([row]);
  await s.whatItHolds(row.id, 'g-1', people[uploader].id, withoutBankDetails(content), fileName);
  return { s, row };
}

describe('a document read item by item, with the page each item came from', () => {
  it('the lead who added it reads each item as a sentence with its page, and bank details under what it left out, with their page', async () => {
    const { s, row } = await aRowReadAs('lead', 'OPEN');
    const [doc] = await servedTo(s, [row], 'lead');
    expect(doc.read.pages).toBe(4);
    expect(doc.read.took).toEqual([
      { kind: 'a number for everyone', /* Changed (B-014): the document wrote "KES 76,000", and a number keeps the currency it was written with. */
      sentence: 'Lowest price for the 600L must stay at or under KES 76,000 for everyone in this check-in.', what: 'lowest price for the 600L', detail: 'At most KES 76,000', page: 1 },
      { kind: 'a number for one person', sentence: "Otieno Ouma's target for Q3 sales is 45,000,000.", what: 'Q3 sales', detail: '45,000,000', who: 'Otieno Ouma', page: 2 },
      { kind: 'a date', sentence: 'The date it sets for delivery is by 9 October.', what: 'delivery', detail: 'by 9 October', page: 2 },
    ]);
    expect(doc.read.leftOut).toEqual([{ what: 'Bank account details', why: 'Never kept, in any document.', page: 4 }]);
    expect(JSON.stringify(doc)).not.toContain('0123456789');
  });

  it('a colleague reads the same items on a document shared with everyone, and nothing of a document that is not theirs to see', async () => {
    const open = await aRowReadAs('lead', 'OPEN');
    const own = await aRowReadAs('otieno', 'OWN');
    own.row.id = 'd-ot-own';
    const rows = [open.row, own.row];
    const s = aService(rows);

    const amina = await servedTo(s, rows, 'amina');
    expect(amina.map((d: any) => d.id)).toEqual(['d-lead']);
    expect(amina[0].read.took.map((t: any) => t.page)).toEqual([1, 2, 2]);
    expect(JSON.stringify(amina)).not.toContain('d-ot-own');

    const lead = await servedTo(s, rows, 'lead');
    expect(lead.map((d: any) => d.id)).toEqual(['d-lead']);

    const otieno = await servedTo(s, rows, 'otieno');
    expect(otieno.map((d: any) => d.id).sort()).toEqual(['d-lead', 'd-ot-own']);
    expect(otieno.find((d: any) => d.id === 'd-ot-own').read.took.length).toBeGreaterThan(0);
  });

  it("a colleague's number in a participant's own file is left out, and said to be the lead's to set, not missing from the check-in", async () => {
    const { s, row } = await aRowReadAs('amina', 'OWN');
    const [doc] = await servedTo(s, [row], 'amina');
    /* B-102: a participant's file offers no number for everyone either; it stays her own evidence. */
    expect(doc.read.took.map((t: any) => t.kind)).toEqual(['a date']);
    expect(doc.read.leftOut).toContainEqual({ what: 'The numbers for Otieno', why: 'Only the lead can set a number for someone else.' });
    expect(doc.read.leftOut).toContainEqual({ what: 'Targets for everyone in this check-in', why: 'Only the lead sets a target for everyone. The numbers stay in your file as your own evidence, in your words.' });
    expect(doc.theContextWeHave).not.toContain('is not on this check-in');
  });

  it('a scanned PDF, read from a picture of its pages, is served without pages and says why', async () => {
    const { s, row } = await aRowReadAs('lead', 'OPEN', 'Lowest price for the 600L KES 76,000. Otieno Q3 sales 45,000,000. Delivery by 9 October.');
    const [doc] = await servedTo(s, [row], 'lead');
    expect(doc.read.pagesNote).toBe(PAGES_NOT_KNOWN);
    expect(doc.read.pages).toBeUndefined();
    expect(doc.read.took.every((t: any) => t.page === undefined)).toBe(true);
  });

  it('a spreadsheet has no pages, and nothing is said about pages', async () => {
    const { s, row } = await aRowReadAs('lead', 'OPEN', 'Rep,Q3 sales\nOtieno,45000000', 'targets.xlsx');
    const [doc] = await servedTo(s, [row], 'lead');
    expect(doc.read.pagesNote).toBeUndefined();
    expect(doc.read.took.length).toBe(3);
  });

  it('a name that is not on the check-in is left out with the reason', () => {
    expect(aDocumentReadItemByItem({ fileName: 'a.pdf', forOnePerson: [], forEverybody: [], dates: [], unmatched: ['Musa Bello'] })!.leftOut)
      .toEqual([{ what: 'The numbers for Musa Bello', why: 'Musa Bello is not on this check-in. Add them, and their numbers will go on too.' }]);
  });
});
