import { DocumentsService } from './documents.service';

/**
 * A DOCUMENT IS READ AGAINST THE LINES ONCE (2 November 2026). An upload while the person's check-in is open was read against
 * their lines at once and again at that check-in's close, which reads every line against every document once its own lines
 * exist. Now only the close reads it; an upload with no check-in open (the Context tab) is still read straight away.
 */
function aService(open: boolean) {
  const anchored: string[] = [];
  const s = Object.create(DocumentsService.prototype) as any;
  s.prisma = { checkIn: { findFirst: jest.fn(async () => (open ? { id: 'ci-open' } : null)) } };
  s.conversation = { anchorRecordToDocuments: jest.fn(async (p: string) => { anchored.push(p); }) };
  s.logger = { warn: () => {} };
  return { s, anchored };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('an upload', () => {
  it('while their check-in is open is left for its close to read', async () => {
    const { s, anchored } = aService(true);
    s.anchorAfterUpload('p-amani', 'g-1');
    await settle();
    expect(anchored).toEqual([]);
  });

  it('with no check-in open is read against their lines now', async () => {
    const { s, anchored } = aService(false);
    s.anchorAfterUpload('p-amani', 'g-1');
    await settle();
    expect(anchored).toEqual(['p-amani']);
  });
});
