import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

/*
 * WHAT A DOCUMENT IS FOR (U.7, B2 Context).
 *
 * "What should it be used for? One line is enough; you can skip it." The lead's Documents band shows
 * that line under each of their own files ("Checks price objections"). It was written as an
 * instruction to the check-in, so it goes back to the person who wrote it and to nobody else, even
 * when the document itself is shared with everyone.
 */

function makeService(docs: any[], viewer: { userId: string; participantId: string }) {
  const update = jest.fn(async (a: any) => ({ ...docs[0], ...a.data }));
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', initiatorId: 'lead' })) },
    groundParticipant: { findFirst: jest.fn(async () => ({ id: viewer.participantId, userId: viewer.userId })) },
    groundDocument: {
      findMany: jest.fn(async () => docs),
      findFirst: jest.fn(async (a: any) => docs.find((d) => d.id === a.where.id && d.participantId === a.where.participantId) ?? null),
      update,
    },
  };
  const config: any = { get: jest.fn((k: string) => (k === 'app.contextEnabled' ? true : undefined)) };
  const service = new DocumentsService(prisma, { extract: jest.fn() } as any, config,
    { anchorRecordToDocuments: async () => ({ backed: 0, of: 0 }) } as any, { fromDocument: async () => null } as any);
  (service as any).checkDescription = jest.fn(async () => null);
  return { service, update };
}

const leadsPriceList = {
  id: 'd1', fileName: 'Q3 price list.pdf', mimeType: 'application/pdf', createdAt: new Date(),
  assessment: null, visibility: 'OPEN', participantId: 'p-lead', holds: null, uploaderNote: 'To check price objections instead of taking them on trust',
};

describe('what a document is for goes back to its uploader only', () => {
  it('the lead reads the line under her own document', async () => {
    const { service } = makeService([leadsPriceList], { userId: 'lead', participantId: 'p-lead' });
    const [doc] = await service.list('g1', 'lead');
    expect((doc as any).usedFor).toBe('To check price objections instead of taking them on trust');
  });

  it('Aisha can open the shared document, and is not sent the line', async () => {
    const { service } = makeService([leadsPriceList], { userId: 'aisha', participantId: 'p-aisha' });
    const [doc] = await service.list('g1', 'aisha');
    expect(doc.name).toBe('Q3 price list.pdf');
    expect('usedFor' in doc).toBe(false);
    expect(JSON.stringify(doc)).not.toContain('price objections');
  });

  it('the uploader can say it after the file is read, and blank clears it', async () => {
    const { service, update } = makeService([leadsPriceList], { userId: 'lead', participantId: 'p-lead' });
    const saved = await service.setNote('g1', 'd1', 'lead', '  Checks price objections  ');
    expect(update.mock.calls[0][0].data.uploaderNote).toBe('Checks price objections');
    expect((saved as any).usedFor).toBe('Checks price objections');
    await service.setNote('g1', 'd1', 'lead', '   ');
    expect(update.mock.calls[1][0].data.uploaderNote).toBeNull();
  });

  it('nobody else can write it, and is told the same as for a document that does not exist', async () => {
    const { service, update } = makeService([leadsPriceList], { userId: 'aisha', participantId: 'p-aisha' });
    await expect(service.setNote('g1', 'd1', 'aisha', 'Mine now')).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});
