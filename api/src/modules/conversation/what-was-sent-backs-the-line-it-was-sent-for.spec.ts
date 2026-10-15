import { theLineADocumentWasSentFor, proofAlreadyGiven } from './a-typed-reference-backs-its-line';
import { ConversationService } from './conversation.service';
import { howALineIsKnown } from '../reports/how-a-line-is-known';

/* Proof sent in answer to a question backs the line the question was about (Hafsah, 12 October). */
const T = (m: number) => new Date(Date.UTC(2026, 9, 13, 7, m));
const TURNS = [
  { role: 'PERSON', content: 'I visited two shops in Keroka and delivered 6 kits to the Rangwe stockist.', createdAt: T(0) },
  { role: 'AI', content: 'What would show the delivery of the 6 kits to the Rangwe stockist?', createdAt: T(1) },
  { role: 'PERSON', content: 'Here is the photo.', createdAt: T(3) },
];
const ROWS = [
  { id: 'r-visit', text: 'Visited two shops in Keroka.', recallBased: true, anchoredDocumentId: null },
  { id: 'r-rangwe', text: 'Delivered 6 kits to the Rangwe stockist.', recallBased: true, anchoredDocumentId: null },
];
const PHOTO = { id: 'doc-photo', fileName: 'IMG_3001.jpg', origin: 'photo', content: 'A signed slip.', createdAt: T(2) };
const PIN = {
  id: 'doc-pin', fileName: 'Location pin shared at 10:42 on Tuesday 13 October', origin: null,
  content: 'Hassan shared a location pin at 10:42 on Tuesday 13 October. The pin is named Keroka Agrovet. The pin is at latitude -0.77, longitude 34.94.',
  createdAt: T(2),
};

describe('what was sent backs the line it was sent for', () => {
  it('a photo sent in answer to "What would show the delivery ... to the Rangwe stockist?" backs the Rangwe line', () => {
    const hit = theLineADocumentWasSentFor(ROWS, PHOTO, TURNS);
    expect(hit?.row.id).toBe('r-rangwe');
    expect(hit?.passage).toBe('the photo "IMG_3001.jpg"');
  });

  it('a pin backs the line naming its place, and reads as "a location pin shared at <time>"', () => {
    const hit = theLineADocumentWasSentFor(ROWS, PIN, TURNS);
    expect(hit?.row.id).toBe('r-visit');
    expect(hit?.passage).toBe('a location pin shared at 10:42 on Tuesday 13 October');
  });

  it('a photo sent before any question, naming nothing, backs nothing', () => {
    expect(theLineADocumentWasSentFor(ROWS, { ...PHOTO, createdAt: new Date(Date.UTC(2026, 9, 13, 6, 0)) }, TURNS)).toBeNull();
  });

  it('the stored lines are backed, and read as proven', async () => {
    const updates: any[] = [];
    const service = Object.create(ConversationService.prototype) as any;
    service.prisma = {
      conversationTurn: { findMany: jest.fn(async () => TURNS) },
      groundDocument: { findMany: jest.fn(async () => [PHOTO, PIN]) },
      recordEntry: { findMany: jest.fn(async () => ROWS), update: jest.fn(async (a: any) => { updates.push(a); return a; }) },
    };
    service.logger = { warn: () => undefined };
    expect(await service.backTheLinesTheirSessionDocumentsWereSentFor('c-1', 'p-hassan')).toBe(2);
    expect(updates.map((u) => [u.where.id, u.data.anchoredDocumentId, u.data.anchoredPassage])).toEqual([
      ['r-rangwe', 'doc-photo', 'the photo "IMG_3001.jpg"'],
      ['r-visit', 'doc-pin', 'a location pin shared at 10:42 on Tuesday 13 October'],
    ]);
    for (const u of updates) expect(howALineIsKnown({ type: 'PROGRESS', text: 'x', ...u.data })).toBe('proven');
  });

  it('the session is handed the pin as already given', () => {
    expect(proofAlreadyGiven([], [PIN as any])).toContain('- already given: a location pin shared at 10:42 on Tuesday 13 October');
  });
});
