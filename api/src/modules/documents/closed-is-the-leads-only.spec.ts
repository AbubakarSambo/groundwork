import { DocumentsService } from './documents.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

/**
 * THE ONE VALUE WHOSE MEANING IS "SOMEBODY ELSE MAY READ THIS".
 *
 * OPEN and OWN are both statements the uploader makes about their own file, so for as long as those
 * were the only two choices the endpoint needed no opinion about who was asking. CLOSED is not like
 * them: it hands a document to whoever is running the check-in. Offered to a participant it is a
 * trap - it sits below OWN in a list and reads as "even more private", and choosing it gives the
 * file away. That is why it was unsettable for so long.
 *
 * So the rule is about the asker, not the value, and this file states it as one sentence: a
 * participant is refused, the lead is allowed, and the refusal does not depend on the document.
 */
function makeService(opts: { initiatorId: string; participantId?: string; doc?: any }) {
  const { initiatorId, participantId = 'p-1', doc = { id: 'doc-1', participantId: 'p-1' } } = opts;
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', initiatorId })) },
    groundParticipant: { findFirst: jest.fn(async () => ({ id: participantId })) },
    groundDocument: {
      findFirst: jest.fn(async () => doc),
      update: jest.fn(async (args: any) => ({ id: 'doc-1', visibility: args.data.visibility })),
    },
  };
  /* Context on, because with it off every one of these refuses for a different reason. */
  const config: any = { get: jest.fn((k: string) => (k === 'app.contextEnabled' ? true : 'test-key')) };
  const anthropic: any = { extract: jest.fn() };
  return { service: new DocumentsService(prisma, anthropic, config, { anchorRecordToDocuments: async () => ({ backed: 0, of: 0 }) } as any), prisma };
}

describe('CLOSED is the lead\'s only', () => {
  it('refuses a participant who asks for it', async () => {
    const { service } = makeService({ initiatorId: 'the-lead' });
    await expect(service.setVisibility('g1', 'doc-1', 'a-party', 'CLOSED'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('and refuses before it looks the document up, so the refusal leaks nothing', async () => {
    /* If the lookup came first, a party could learn which ids are real by which error came back. */
    const { service, prisma } = makeService({ initiatorId: 'the-lead' });
    await expect(service.setVisibility('g1', 'doc-1', 'a-party', 'CLOSED')).rejects.toThrow();
    expect(prisma.groundDocument.findFirst).not.toHaveBeenCalled();
  });

  it('allows the lead, on their own document', async () => {
    const { service } = makeService({ initiatorId: 'the-lead' });
    await expect(service.setVisibility('g1', 'doc-1', 'the-lead', 'CLOSED'))
      .resolves.toMatchObject({ visibility: 'CLOSED' });
  });

  it('leaves the other two open to whoever uploaded the file', async () => {
    const { service } = makeService({ initiatorId: 'the-lead' });
    for (const v of ['OPEN', 'OWN'] as const) {
      await expect(service.setVisibility('g1', 'doc-1', 'a-party', v))
        .resolves.toMatchObject({ visibility: v });
    }
  });

  it('refuses a value it does not recognise instead of handing it to the database', async () => {
    const { service, prisma } = makeService({ initiatorId: 'the-lead' });
    await expect(service.setVisibility('g1', 'doc-1', 'the-lead', 'PUBLIC' as any))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.groundDocument.update).not.toHaveBeenCalled();
  });
});
