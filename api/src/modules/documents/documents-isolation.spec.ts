import { DocumentsService } from './documents.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * GW-PRI-DOC — Documents isolation invariants.
 *
 * Documents are scoped to the participant who uploaded them. No other party,
 * no other ground, and no cross-org user may read or delete them.
 */

function makeFile(): Express.Multer.File {
  return {
    buffer: Buffer.from('hello'),
    originalname: 'test.txt',
    mimetype: 'text/plain',
    size: 5,
    fieldname: 'file',
    encoding: '7bit',
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };
}

function makeService(opts: {
  ground?: any;
  participant?: any;
  doc?: any;
}) {
  const { ground = null, participant = null, doc = null } = opts;
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    groundParticipant: { findFirst: jest.fn(async () => participant) },
    groundDocument: {
      create: jest.fn(async (args: any) => ({ id: 'doc-1', ...args.data })),
      findMany: jest.fn(async () => (doc ? [doc] : [])),
      findFirst: jest.fn(async () => doc),
      delete: jest.fn(async () => ({})),
    },
  };
  const anthropic: any = { extract: jest.fn(async () => ({ claims: [] })) };
  const config: any = { get: jest.fn(() => 'test-key') };
  return { service: new DocumentsService(prisma, anthropic, config), prisma };
}

// GW-PRI-DOC-01: non-participant cannot upload
describe('GW-PRI-DOC-01 — upload denied for non-participant', () => {
  it('throws ForbiddenException when user is not a participant on the ground', async () => {
    const { service } = makeService({
      ground: { id: 'g1' },
      participant: null,
    });
    await expect(service.upload('g1', 'stranger', makeFile())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when ground does not exist', async () => {
    const { service } = makeService({ ground: null });
    await expect(service.upload('missing', 'u1', makeFile())).rejects.toBeInstanceOf(NotFoundException);
  });
});

// GW-PRI-DOC-02: list is scoped to caller's own participant row
describe('GW-PRI-DOC-02 — list scoped to participant', () => {
  it('queries documents by groundId + participantId (not all ground docs)', async () => {
    const participant = { id: 'p1', groundId: 'g1', userId: 'u1' };
    const { service, prisma } = makeService({
      ground: { id: 'g1' },
      participant,
    });
    await service.list('g1', 'u1');
    const where = prisma.groundDocument.findMany.mock.calls[0][0].where;
    expect(where.groundId).toBe('g1');
    expect(where.participantId).toBe('p1');
    // Must NOT be a bare ground-wide query (no participantId filter = data leak)
    expect(Object.keys(where)).toContain('participantId');
  });

  it('returns empty array for non-participant (throws Forbidden before reaching DB)', async () => {
    const { service } = makeService({ ground: { id: 'g1' }, participant: null });
    await expect(service.list('g1', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// GW-PRI-DOC-03: remove scoped — cannot delete another party's document
describe('GW-PRI-DOC-03 — remove scoped to owner', () => {
  it('deletes when participant owns the document', async () => {
    const participant = { id: 'p1', groundId: 'g1', userId: 'u1' };
    const doc = { id: 'doc-1', groundId: 'g1', participantId: 'p1' };
    const { service, prisma } = makeService({ ground: { id: 'g1' }, participant, doc });
    await service.remove('g1', 'doc-1', 'u1');
    expect(prisma.groundDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
  });

  it('throws NotFoundException when document not found for this participant', async () => {
    const participant = { id: 'p1', groundId: 'g1', userId: 'u1' };
    const { service } = makeService({ ground: { id: 'g1' }, participant, doc: null });
    await expect(service.remove('g1', 'doc-other', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException when caller is not a participant', async () => {
    const { service } = makeService({ ground: { id: 'g1' }, participant: null });
    await expect(service.remove('g1', 'doc-1', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
