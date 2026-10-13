import { theLinesADocumentBacks, proofAlreadyGiven } from './a-typed-reference-backs-its-line';
import { ConversationService } from './conversation.service';
import { howALineIsKnown } from '../reports/how-a-line-is-known';

/*
 * Night quality run 2: Amina's photo of the signed DN-1182 was "Used to check DN-1182", and her record still
 * read "Backed up: Nothing attached yet". Her line was said in week 1, the photo came in week 2.
 */
const AMINAS_LINE = { id: 'r-1182', text: 'This week I sent 20 kits to Kisii on Tuesday on delivery note DN-1182, and 12 to Homa Bay on Wednesday on DN-1183.', recallBased: true, anchoredDocumentId: null };
const OTHER_LINE = { id: 'r-count', text: 'The Kisumu store count on Friday was 64 kits.', recallBased: true, anchoredDocumentId: null };
const THE_PHOTO = { id: 'doc-photo', fileName: 'IMG_2041.jpg', origin: 'photo', uploaderNote: 'The signed delivery note DN-1182 from Kisii.', content: 'Delivery note DN-1182. Received 20 kits. Signed, H. Mwenda.' };

describe('a photo, document or pin backs the line it names', () => {
  it("Amina's photo backs her DN-1182 delivery line, and nothing else", () => {
    const backed = theLinesADocumentBacks([AMINAS_LINE, OTHER_LINE] as any[], [THE_PHOTO]);
    expect(backed.map((b) => [b.row.id, b.doc.id, b.reference])).toEqual([['r-1182', 'doc-photo', 'DN-1182']]);
  });

  it('the stored line is then backed by the photo, and reads as proven', async () => {
    const updates: any[] = [];
    const prisma: any = {
      recordEntry: { findMany: jest.fn(async () => [AMINAS_LINE, OTHER_LINE]), update: jest.fn(async (a: any) => { updates.push(a); return a; }) },
      groundDocument: { findMany: jest.fn(async () => [THE_PHOTO]) },
    };
    const service = Object.create(ConversationService.prototype) as any;
    service.prisma = prisma;
    service.logger = { warn: () => undefined, log: () => undefined };
    expect(await service.backTheLinesTheirDocumentsName('p-amina')).toBe(1);
    expect(updates).toEqual([{ where: { id: 'r-1182' }, data: { recallBased: false, anchoredDocumentId: 'doc-photo', anchoredOrigin: 'photo', anchoredPassage: 'DN-1182' } }]);
    expect(howALineIsKnown({ type: 'PROGRESS', text: AMINAS_LINE.text, ...updates[0].data })).toBe('proven');
  });

  it('a document that does not read as described backs nothing', async () => {
    const updates: any[] = [];
    const service = Object.create(ConversationService.prototype) as any;
    service.prisma = {
      recordEntry: { findMany: jest.fn(async () => [AMINAS_LINE]), update: jest.fn(async (a: any) => updates.push(a)) },
      groundDocument: { findMany: jest.fn(async () => [{ ...THE_PHOTO, descriptionCheck: { matches: false } }]) },
    };
    service.logger = { warn: () => undefined };
    expect(await service.backTheLinesTheirDocumentsName('p-amina')).toBe(0);
    expect(updates).toEqual([]);
  });

  it('the session is handed the photo as already given', () => {
    const block = proofAlreadyGiven(['Naomi sent a clear photo of the signed DN-1182 on Tuesday.'], [{ ...THE_PHOTO, mimeType: 'image/jpeg' } as any]);
    expect(block).toContain('- already given: the photo "IMG_2041.jpg", for DN-1182');
    expect(block).toMatch(/never ask for these references, or for proof of the lines they back, again/);
  });
});
