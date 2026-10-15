import { ReportsService } from './reports.service';
import { whatThisDocumentIs } from '../documents/what-kind-of-thing-a-document-is';

/**
 * REQUEST 61: "WHAT THIS RESTS ON" SAYS EACH DOCUMENT AS A SENTENCE.
 *
 * It sent "chandarana-quote.png · a photo", the file name and its kind joined with a middle dot. It
 * now sends "chandarana-quote.png is a photo." Read through the session report route itself.
 */
describe('a document is said as a sentence', () => {
  const ground = {
    id: 'g-1', organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', brief: null,
    participants: [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
    ],
    objectives: [],
    report: { releasedAt: new Date('2026-09-23'), agreements: [], divergences: [], centralQuestion: null, findings: [], direction: null },
  };
  const docs = [
    { fileName: 'chandarana-quote.png', participantId: 'p-miriam', origin: 'photo', visibility: 'OPEN' },
    { fileName: 'Note from Tuskys Kilimani.txt', participantId: 'p-miriam', origin: 'typed', visibility: 'OPEN' },
    { fileName: 'plan-summary.md', participantId: 'p-miriam', origin: 'generated', visibility: 'OPEN' },
    { fileName: 'rota.xlsx', participantId: 'p-miriam', origin: null, visibility: 'OPEN' },
  ];
  const service = () => {
    const svc = Object.create(ReportsService.prototype) as any;
    const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 1, aggregate: async () => ({ _max: {} }) };
    svc.prisma = new Proxy({
      ground: { ...reads, findUnique: async () => ground },
      groundDocument: { ...reads, findMany: async () => docs },
    } as any, { get: (t: any, k: string) => t[k] ?? reads });
    svc.isAnAdminOf = async () => false;
    return svc;
  };

  it.each(['u-lead', 'u-miriam'])('the session report, read by %s, lists each document as a sentence', async (userId) => {
    const served: any = await service().sessionReport('g-1', 2, userId, 'org-1');
    const text = JSON.stringify(served);
    expect(text).toContain('chandarana-quote.png is a photo.');
    expect(text).toContain('Note from Tuskys Kilimani.txt is a typed document.');
    expect(text).toContain('plan-summary.md holds notes written with a model.');
    expect(text).not.toContain(' · ');
  });

  it('a file the reader may not open is not named, and the sentence still starts with a capital', () => {
    const { withoutPrivateFileNames } = require('../documents/a-private-file-is-not-named');
    expect(withoutPrivateFileNames(whatThisDocumentIs('chandarana-quote.png', 'photo'), ['chandarana-quote.png'])).toBe('A document is a photo.');
  });

  it('a document of no known kind is its file name, as before', () => {
    expect(whatThisDocumentIs('rota.xlsx', null)).toBe('rota.xlsx');
  });
});
