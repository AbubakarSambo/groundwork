/**
 * A ROLE GUESSED WITH LOW CONFIDENCE IS CONFIRMED BEFORE IT IS USED (decision 57, item 5).
 *
 * Two routes stamp the confirmation, both scoped to the participant themselves or the ground
 * initiator (the lead): updateRole (an answer that corrects it) and confirmDetectedFunction (an
 * answer that leaves it as it stood - "yes, that's right").
 */
import { ParticipantsService } from './participants.service';

function serviceWith(prisma: any) {
  const svc: any = Object.create(ParticipantsService.prototype);
  svc.prisma = prisma;
  return svc;
}

function prismaWith(participant: any) {
  const update = jest.fn(async (args: any) => ({ ...participant, ...args.data }));
  const prisma: any = {
    groundParticipant: {
      findUnique: jest.fn(async () => participant),
      update,
    },
  };
  return { prisma, update };
}

const OWNED = { id: 'part1', userId: 'u-femi', ground: { participants: [{ userId: 'u-lead' }] } };

describe('updateRole stamps the confirmation, since giving a role is itself confirming or correcting it', () => {
  it('the participant themselves can confirm/correct their own role', async () => {
    const { prisma, update } = prismaWith(OWNED);
    const svc: any = serviceWith(prisma);
    await svc.updateRole('part1', 'u-femi', 'Mostly sales, closing deals.');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ roleAsDescribed: 'Mostly sales, closing deals.', detectedFunctionConfirmedBy: 'u-femi' }),
    }));
    const stampedAt = update.mock.calls[0][0].data.detectedFunctionConfirmedAt;
    expect(stampedAt).toBeInstanceOf(Date);
  });

  it('the ground initiator (the lead) can also correct it, from the Context page', async () => {
    const { prisma, update } = prismaWith(OWNED);
    const svc: any = serviceWith(prisma);
    await svc.updateRole('part1', 'u-lead', 'Mostly project management.');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ roleAsDescribed: 'Mostly project management.', detectedFunctionConfirmedBy: 'u-lead' }),
    }));
  });

  it('a stranger may not', async () => {
    const { prisma } = prismaWith(OWNED);
    const svc: any = serviceWith(prisma);
    await expect(svc.updateRole('part1', 'u-stranger', 'Anything')).rejects.toThrow('Participant not found');
  });
});

describe('confirmDetectedFunction: "yes, that\'s right" - stamps the confirmation with no change to roleAsDescribed', () => {
  it('the participant can confirm their own guessed function as it stands', async () => {
    const { prisma, update } = prismaWith({ ...OWNED, detectedFunction: 'SALES' });
    const svc: any = serviceWith(prisma);
    const result = await svc.confirmDetectedFunction('part1', 'u-femi');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ detectedFunctionConfirmedBy: 'u-femi' }),
    }));
    expect(update.mock.calls[0][0].data.roleAsDescribed).toBeUndefined();
    expect(result.detectedFunction).toBe('SALES');
  });

  it('the lead can confirm it for them, from the Context page', async () => {
    const { prisma, update } = prismaWith({ ...OWNED, detectedFunction: 'SALES' });
    const svc: any = serviceWith(prisma);
    await svc.confirmDetectedFunction('part1', 'u-lead');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ detectedFunctionConfirmedBy: 'u-lead' }),
    }));
  });

  it('a stranger may not', async () => {
    const { prisma } = prismaWith(OWNED);
    const svc: any = serviceWith(prisma);
    await expect(svc.confirmDetectedFunction('part1', 'u-stranger')).rejects.toThrow('Participant not found');
  });
});
