import { readFileSync } from 'fs';
import { join } from 'path';
import { DeliveryService } from './delivery.service';
import { InviteBouncedListener } from './invite-bounced.listener';
import { GroundworkEvents } from '../../common/events';

/**
 * A BOUNCED INVITE REACHES THE PERSON WHO SENT IT. The bounce was recorded and mirrored onto the
 * participant, and then nothing happened. The lead who typed the address can fix it; now they hear.
 */
describe('a hard bounce on the latest invite', () => {
  it('emits an event naming the participant and the address', async () => {
    const prisma: any = {
      emailDelivery: {
        findUnique: jest.fn(async () => ({ id: 'd1', participantId: 'p1', kind: 'PARTICIPANT_INVITE', email: 'x@dead.test' })),
        update: jest.fn(async () => ({})),
        findFirst: jest.fn(async () => ({ id: 'd1' })),
      },
      groundParticipant: { update: jest.fn(async () => ({})) },
    };
    const events = { emit: jest.fn() };
    const svc = new DeliveryService(prisma, { get: () => 'secret' } as any, events as any);
    await (svc as any).applyDeliveryEvent({ type: 'email.bounced', data: { email_id: 'r1', bounce: { message: 'no such user' } } });
    expect(events.emit).toHaveBeenCalledWith(GroundworkEvents.INVITE_BOUNCED, { participantId: 'p1', email: 'x@dead.test', detail: 'no such user' });
  });

  it('and the listener mails the lead who invited them, with the check-in to fix it on', async () => {
    const prisma: any = {
      groundParticipant: { findUnique: jest.fn(async () => ({ ground: { id: 'g1', label: 'Q3 launch', initiator: { email: 'lead@x.test', firstName: 'Ada' } } })) },
    };
    const email: any = { sendInviteBounced: jest.fn(async () => undefined), frontendUrlForLinks: () => 'https://app.test/' };
    const l = new InviteBouncedListener(prisma, email);
    await l.onInviteBounced({ participantId: 'p1', email: 'x@dead.test', detail: null });
    expect(email.sendInviteBounced).toHaveBeenCalledWith('lead@x.test', 'Ada', 'x@dead.test', 'Q3 launch', 'https://app.test/grounds/g1');
  });

  it('is classified as something they asked for, so a lead who turned reminders off still hears', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(strip(readFileSync(join(__dirname, 'nothing-goes-out-that-was-turned-off.ts'), 'utf8'))).toMatch(/sendInviteBounced: 'asked for'/);
  });
});
