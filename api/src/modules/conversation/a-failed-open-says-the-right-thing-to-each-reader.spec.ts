import { PartyType } from '@prisma/client';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { engineUnavailable } from './anthropic.service';

/** Request 225 (b): the lead was told to tell the person who set the check-in up, who is herself. */
describe('a failed open, read by each person', () => {
  const service = (partyType: PartyType, userId: string) => {
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ participant: { partyType, userId }, ground: { initiatorId: 'u-wairimu', initiator: { firstName: 'Wairimu' } } })) },
    };
    const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
    s.openOnce = jest.fn(async () => { throw engineUnavailable(new Error('503')); });
    return s;
  };
  const whatTheyRead = async (s: any, who: string) => {
    try { await s.open('ci-1', who); } catch (e: any) { expect(e).toBeInstanceOf(ServiceUnavailableException); return e.message as string; }
    throw new Error('it opened');
  };

  it('the lead is never told to tell the person who set the check-in up', async () => {
    expect(await whatTheyRead(service(PartyType.INITIATOR, 'u-wairimu'), 'u-wairimu')).toBe(
      'The conversation could not be reached just now, so this session cannot continue this minute. Nothing you have already said has been lost. Please try again in a few minutes. If it keeps happening, it is a problem on our side and not anything you did, and we are looking into it.',
    );
  });

  it('a participant is told the lead by name', async () => {
    expect(await whatTheyRead(service(PartyType.PARTICIPANT, 'u-amani'), 'u-amani')).toBe(
      'The conversation could not be reached just now, so this session cannot continue this minute. Nothing you have already said has been lost. Please try again shortly, and if it keeps happening tell Wairimu, because it is a problem on our side and not anything you did.',
    );
  });

  it('any other error passes through as it was', async () => {
    const s = service(PartyType.PARTICIPANT, 'u-amani');
    s.openOnce = jest.fn(async () => { throw new Error('something else'); });
    await expect(s.open('ci-1', 'u-amani')).rejects.toThrow('something else');
  });
});
