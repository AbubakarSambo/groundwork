import { CheckInStatus } from '@prisma/client';
import { ConversationService, DECLINED_TO_TAKE_PART } from './conversation.service';

/**
 * A DECLINE MID-SESSION KEEPS WHAT WAS SAID.
 *
 * decline() permits IN_PROGRESS - somebody can say no partway through - and it wrote DECLINED and
 * nothing else, so every turn they had already given never reached their private record. What they
 * said is theirs. The extraction complete() runs is run first, and the reason is written with the
 * literal the schema documents, so a reader can tell a decline from a close.
 */
const service = (status: CheckInStatus) => {
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({ id: 'ci', groundId: 'g', participantId: 'p', status, participant: { userId: 'me', user: { awaitingOrgApproval: false } } })),
      update: jest.fn(async (a: any) => a),
    },
  };
  const svc: any = new ConversationService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, { get: () => undefined } as any);
  svc.extractRecordEntries = jest.fn(async () => undefined);
  return { svc, prisma };
};

describe('declining', () => {
  it('partway through extracts what was said before the session is marked declined', async () => {
    const { svc, prisma } = service(CheckInStatus.IN_PROGRESS);
    await svc.decline('ci', 'me');
    expect(svc.extractRecordEntries).toHaveBeenCalledWith('ci', 'p');
    const extractedAt = svc.extractRecordEntries.mock.invocationCallOrder[0];
    const declinedAt = prisma.checkIn.update.mock.invocationCallOrder[0];
    expect(extractedAt).toBeLessThan(declinedAt);
  });

  it('before starting extracts nothing, because nothing was said', async () => {
    const { svc } = service(CheckInStatus.NOT_STARTED);
    await svc.decline('ci', 'me');
    expect(svc.extractRecordEntries).not.toHaveBeenCalled();
  });

  it('writes the reason with the literal the schema documents', async () => {
    const { svc, prisma } = service(CheckInStatus.NOT_STARTED);
    await svc.decline('ci', 'me');
    expect(prisma.checkIn.update).toHaveBeenCalledWith({ where: { id: 'ci' }, data: { status: CheckInStatus.DECLINED, closedReason: DECLINED_TO_TAKE_PART } });
    expect(DECLINED_TO_TAKE_PART).toBe('willingness_declined');
  });

  it('a failed extraction does not stop the decline - saying no must always work', async () => {
    const { svc, prisma } = service(CheckInStatus.IN_PROGRESS);
    svc.extractRecordEntries = jest.fn(async () => { throw new Error('model down'); });
    svc.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    await expect(svc.decline('ci', 'me')).resolves.toEqual({ status: 'declined' });
    expect(prisma.checkIn.update).toHaveBeenCalled();
  });
});
