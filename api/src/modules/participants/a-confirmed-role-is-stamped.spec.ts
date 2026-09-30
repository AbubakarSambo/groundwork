/**
 * A ROLE GUESSED WITH LOW CONFIDENCE IS CONFIRMED BEFORE IT IS USED (decision 57, item 5), AND
 * NEVER THE PERSON'S OWN WORDS INTO roleAsDescribed (decision 30, tightened 30 September 2026).
 *
 * Two routes stamp the confirmation, both scoped to the participant themselves or the ground
 * initiator (the lead): updateRole (an answer that corrects it) and confirmDetectedFunction (an
 * answer that leaves it as it stood - "yes, that's right"). updateRole must never write the
 * PARTICIPANT's own words to GroundParticipant.roleAsDescribed - that column is the lead's private
 * description of somebody (theLeadsWordsAbout). A participant correcting their own role gets it
 * written to their own account's jobTitle instead. The one exception is the lead's own INITIATOR
 * row, which `aRoleInTheirOwnWords` already treats as the lead's own words about themselves.
 */
import { ParticipantsService } from './participants.service';

function serviceWith(prisma: any) {
  const svc: any = Object.create(ParticipantsService.prototype);
  svc.prisma = prisma;
  return svc;
}

function prismaWith(participant: any) {
  const gpUpdate = jest.fn(async (args: any) => ({ ...participant, ...args.data }));
  const userUpdate = jest.fn(async (args: any) => ({ id: args.where.id, ...args.data }));
  const prisma: any = {
    groundParticipant: {
      findUnique: jest.fn(async () => participant),
      update: gpUpdate,
    },
    user: { update: userUpdate },
  };
  return { prisma, gpUpdate, userUpdate };
}

/* A plain participant, not the lead - the ordinary case a person correcting their own role is in. */
const OWNED_PARTICIPANT = { id: 'part1', userId: 'u-femi', partyType: 'PARTICIPANT', ground: { participants: [{ userId: 'u-lead' }] } };
/* The lead's OWN row on their own ground - roleAsDescribed here is already their own words (leadRemit). */
const OWNED_INITIATOR = { id: 'part-lead', userId: 'u-lead', partyType: 'INITIATOR', ground: { participants: [{ userId: 'u-lead' }] } };

describe('updateRole: a participant correcting their own role never writes the lead\'s private field', () => {
  it('writes their own account\'s job title, and stamps the confirmation - never roleAsDescribed', async () => {
    const { prisma, gpUpdate, userUpdate } = prismaWith(OWNED_PARTICIPANT);
    const svc: any = serviceWith(prisma);
    const result = await svc.updateRole('part1', 'u-femi', 'Mostly sales, closing deals.');

    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'u-femi' }, data: { jobTitle: 'Mostly sales, closing deals.' } });
    expect(gpUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ detectedFunctionConfirmedBy: 'u-femi' }),
    }));
    // Never their own words landing in the lead's private description.
    const gpCall: any = (gpUpdate.mock.calls as any[])[0]?.[0];
    expect(gpCall?.data?.roleAsDescribed).toBeUndefined();
    expect(result).toEqual({ id: 'part1', ownRoleAsGiven: 'Mostly sales, closing deals.' });
  });

  it('the confirmation stamp is a real timestamp', async () => {
    const { prisma, gpUpdate } = prismaWith(OWNED_PARTICIPANT);
    const svc: any = serviceWith(prisma);
    await svc.updateRole('part1', 'u-femi', 'Project management, mostly.');
    const gpCall: any = (gpUpdate.mock.calls as any[])[0]?.[0];
    expect(gpCall.data.detectedFunctionConfirmedAt).toBeInstanceOf(Date);
  });
});

describe('updateRole: the lead describing somebody else still writes roleAsDescribed, unchanged', () => {
  it('the ground initiator (the lead) can correct someone else\'s role, from the Context page', async () => {
    const { prisma, gpUpdate, userUpdate } = prismaWith(OWNED_PARTICIPANT);
    const svc: any = serviceWith(prisma);
    await svc.updateRole('part1', 'u-lead', 'Mostly project management.');
    expect(gpUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ roleAsDescribed: 'Mostly project management.', detectedFunctionConfirmedBy: 'u-lead' }),
    }));
    // The lead's words about someone else never touch that someone else's own account.
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('a stranger may not', async () => {
    const { prisma } = prismaWith(OWNED_PARTICIPANT);
    const svc: any = serviceWith(prisma);
    await expect(svc.updateRole('part1', 'u-stranger', 'Anything')).rejects.toThrow('Participant not found');
  });
});

describe('updateRole: the lead\'s own INITIATOR row is already their own words about themselves', () => {
  it('still writes roleAsDescribed on their own row (aRoleInTheirOwnWords already trusts it)', async () => {
    const { prisma, gpUpdate, userUpdate } = prismaWith(OWNED_INITIATOR);
    const svc: any = serviceWith(prisma);
    await svc.updateRole('part-lead', 'u-lead', 'I run the whole operation.');
    expect(gpUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ roleAsDescribed: 'I run the whole operation.', detectedFunctionConfirmedBy: 'u-lead' }),
    }));
    expect(userUpdate).not.toHaveBeenCalled();
  });
});

describe('confirmDetectedFunction: "yes, that\'s right" - stamps the confirmation with no change to roleAsDescribed', () => {
  it('the participant can confirm their own guessed function as it stands', async () => {
    const { prisma, gpUpdate } = prismaWith({ ...OWNED_PARTICIPANT, detectedFunction: 'SALES' });
    const svc: any = serviceWith(prisma);
    const result = await svc.confirmDetectedFunction('part1', 'u-femi');
    expect(gpUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ detectedFunctionConfirmedBy: 'u-femi' }),
    }));
    const gpCall: any = (gpUpdate.mock.calls as any[])[0]?.[0];
    expect(gpCall?.data?.roleAsDescribed).toBeUndefined();
    expect(result.detectedFunction).toBe('SALES');
  });

  it('the lead can confirm it for them, from the Context page', async () => {
    const { prisma, gpUpdate } = prismaWith({ ...OWNED_PARTICIPANT, detectedFunction: 'SALES' });
    const svc: any = serviceWith(prisma);
    await svc.confirmDetectedFunction('part1', 'u-lead');
    expect(gpUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ detectedFunctionConfirmedBy: 'u-lead' }),
    }));
  });

  it('a stranger may not', async () => {
    const { prisma } = prismaWith(OWNED_PARTICIPANT);
    const svc: any = serviceWith(prisma);
    await expect(svc.confirmDetectedFunction('part1', 'u-stranger')).rejects.toThrow('Participant not found');
  });
});
