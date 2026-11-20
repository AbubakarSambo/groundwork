import { ForbiddenException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * REQUEST 178: RESENDING AN INVITATION IS THE LEAD'S, AND AN ADMIN'S (security), AS EACH PERSON IS TOLD.
 *
 * The check-in "Kenya launch" is led by Wairimu; Daniel is an organisation admin; Lola is an admin who set it up for her; Miriam is another member; Omar is
 * a participant in it; Gus is a guest. Only Wairimu, Lola and Daniel may make Groundwork send Femi's invitation again. Everybody else is told, plainly, they
 * may not, and nothing is sent.
 */
function service() {
  const ground = { id: 'g1', organizationId: 'org1', label: 'Kenya launch', initiatorId: 'u-wairimu', createdByUserId: 'u-lola' };
  const participant = { id: 'p-femi', groundId: 'g1', email: 'femi@x.test', userId: null, inviteToken: 't' };
  const sent: any[] = [];
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ground) },
    groundParticipant: { findFirst: jest.fn(async () => participant), update: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(async () => ({ id: 'u-wairimu', firstName: 'Wairimu' })) },
    checkIn: { findFirst: jest.fn(async () => null) },
  };
  const email: any = { sendTheInviteThisGroundSends: jest.fn(async (...a: any[]) => { sent.push(a); }) };
  const s = new GroundsService(prisma, email, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { respond: async () => '' } as any);
  return { s, sent, prisma };
}
const SENTENCE = 'Only the person who runs this check-in, or an administrator of the organisation, can send an invitation again.';

describe('who may send an invitation again', () => {
  it.each([['Wairimu, who leads it', 'u-wairimu', 'MEMBER'], ['Lola, the admin who set it up', 'u-lola', 'MEMBER'], ['Daniel, an organisation admin', 'u-daniel', 'ADMIN']])('%s', async (_n, userId, role) => {
    const w = service();
    expect(await w.s.resendParticipantInvite('g1', 'p-femi', 'org1', userId, role)).toEqual({ message: 'Invite resent', sent: true });
    expect(w.sent).toHaveLength(1);
  });

  it.each([['Miriam, another member', 'u-miriam', 'MEMBER'], ['Omar, a participant in it', 'u-omar', 'MEMBER'], ['Gus, a guest', 'u-gus', 'GUEST']])('%s is told no, in a plain sentence, and nothing is sent', async (_n, userId, role) => {
    const w = service();
    const err: any = await w.s.resendParticipantInvite('g1', 'p-femi', 'org1', userId, role).catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.message).toBe(SENTENCE);
    expect(w.sent).toEqual([]);
    expect(w.prisma.groundParticipant.update).not.toHaveBeenCalled();
  });
});

/**
 * REQUEST 180 ITEMS 5 AND 6, AS THE LEAD READS THEM. Somebody waiting for a seat is sent nothing, and told why; somebody who has joined is
 * told so by name, in a full sentence.
 */
describe('what the lead is told when there is nothing to send', () => {
  function withParticipant(row: any) {
    const w = service();
    w.prisma.groundParticipant.findFirst = jest.fn(async () => ({ id: 'p-femi', groundId: 'g1', email: 'femi@x.test', userId: null, inviteToken: 't', ...row }));
    return w;
  }

  it('Kwesi, waiting for a seat, is sent nothing and the lead reads why', async () => {
    const w = withParticipant({ awaitingSeat: true, nameGiven: 'Kwesi' });
    const err: any = await w.s.resendParticipantInvite('g1', 'p-femi', 'org1', 'u-wairimu', 'MEMBER').catch((e) => e);
    expect(err.message).toBe('Kwesi is waiting for a seat on the plan, so an invitation would not let them in yet. They will get their invitation as soon as there is a seat for them.');
    expect(w.sent).toEqual([]);
    expect(w.prisma.groundParticipant.update).not.toHaveBeenCalled();
  });

  it('Kwesi, who has joined, is named in the refusal', async () => {
    const w = withParticipant({ userId: 'u-kwesi', user: { firstName: 'Kwesi' } });
    const err: any = await w.s.resendParticipantInvite('g1', 'p-femi', 'org1', 'u-wairimu', 'MEMBER').catch((e) => e);
    expect(err.message).toBe('Kwesi has already joined this check-in, so there is no invitation to send again.');
    expect(w.sent).toEqual([]);
  });
});

/** End-to-end check of 16 November, M-8: the lead pressed Resend twice and read nothing. The second press did not send (the same mail goes once a day), and she is told so. */
describe('what Resend invite answers when the same invitation already went today', () => {
  it('says it was not sent again', async () => {
    const w = service();
    (w.s as any).email.sendTheInviteThisGroundSends = jest.fn(async (...a: any[]) => { a[5].outcome = 'suppressed'; });
    expect(await w.s.resendParticipantInvite('g1', 'p-femi', 'org1', 'u-wairimu', 'MEMBER')).toEqual({ message: 'The same invite already went today', sent: false });
  });
});
