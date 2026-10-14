import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { theLeadAddsAWhatsAppNumber, A_NUMBER_IS_THEIRS, THE_NUMBER_IS_KEPT } from '../grounds/the-lead-adds-a-whatsapp-number';
import { GroundsCron } from '../grounds/grounds.cron';

/**
 * HAFSAH'S DECISION D2, 13 OCTOBER 2026, EVENING: "First contact can be on WhatsApp if your company adds your number; it
 * can be on both at the same time." And D1: "add your phone number, or your lead can."
 *
 * Read as Njeri, who runs the litigation check-in and adds Brian's number; as Brian, invited and not joined, who gets
 * the opening on WhatsApp beside the email and writes "Hi" before opening the email; and as Brian again, who is never
 * sent the opening twice.
 */
describe('the lead adds a WhatsApp number', () => {
  function world(entry: any = null, userPhone: string | null = null) {
    const made: any[] = [];
    const updated: any[] = [];
    const prisma: any = {
      ground: { findFirst: jest.fn(async () => ({ id: 'g-lit', initiatorId: 'u-njeri', createdByUserId: 'u-njeri' })) },
      groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p-brian', email: 'brian@muchemi.test', userId: null, nameGiven: 'Brian Kiptoo', user: userPhone ? { firstName: 'Brian', lastName: 'Kiptoo', phoneNumber: userPhone } : null })) },
      person: {
        findFirst: jest.fn(async () => entry),
        create: jest.fn(async (a: any) => { made.push(a.data); return { id: 'person-brian' }; }),
        update: jest.fn(async (a: any) => { updated.push(a); return {}; }),
      },
      user: { update: jest.fn() },
    };
    return { prisma, made, updated };
  }

  it('Njeri adds Brian’s number, and it is kept on the roster against his address', async () => {
    const { prisma, made } = world();
    const r = await theLeadAddsAWhatsAppNumber(prisma, { groundId: 'g-lit', participantId: 'p-brian', organizationId: 'org-1', userId: 'u-njeri', role: 'LEAD', phone: '+254 712 345 678' });
    expect(r.said).toBe(THE_NUMBER_IS_KEPT('Brian Kiptoo'));
    expect(made[0]).toMatchObject({ organizationId: 'org-1', email: 'brian@muchemi.test', phone: '+254712345678', active: true });
  });

  it('a number somebody already has is never replaced from here', async () => {
    const { prisma } = world({ id: 'person-brian', phone: '+254700000000' });
    await expect(theLeadAddsAWhatsAppNumber(prisma, { groundId: 'g-lit', participantId: 'p-brian', organizationId: 'org-1', userId: 'u-njeri', role: 'LEAD', phone: '+254712345678' }))
      .rejects.toMatchObject({ message: A_NUMBER_IS_THEIRS('Brian Kiptoo') });
  });

  it('somebody who does not run the check-in, and is not an admin, cannot add one', async () => {
    const { prisma } = world();
    await expect(theLeadAddsAWhatsAppNumber(prisma, { groundId: 'g-lit', participantId: 'p-brian', organizationId: 'org-1', userId: 'u-aisha', role: 'MEMBER', phone: '+254712345678' }))
      .rejects.toMatchObject({ status: 403 });
  });
});

describe('Brian, invited and not joined, writes "Hi" from the number the company added', () => {
  it('his invitation is accepted from his phone, and his check-in opens', async () => {
    const h = anInboundHarness({ open: [], who: { personId: 'person-brian', userId: null, externalId: 'participant:p-brian' } });
    let joined = false;
    const participants: any = { accept: jest.fn(async () => { joined = true; return { accessToken: 'x' }; }) };
    (h.service as any).participants = participants;
    (h.service as any).checkIns = { actingAs: jest.fn(async () => { throw new Error('not linked'); }) };
    h.prisma.person.findFirst = jest.fn(async () => ({ id: 'person-brian', email: 'brian@muchemi.test', phone: '+254712345678' }));
    h.prisma.person.updateMany = jest.fn(async () => ({ count: 1 }));
    h.prisma.groundParticipant.findFirst = jest.fn(async (q: any) => (q?.where?.inviteToken ? { inviteToken: 'tok-brian' } : null));
    h.prisma.user = { findFirst: jest.fn(async () => (joined ? { id: 'u-brian' } : null)), findUnique: jest.fn(async () => null) };
    h.prisma.checkIn.findMany = jest.fn(async () => (joined ? [{ id: 'ci-brian-1', status: 'NOT_STARTED', sessionNumber: 1, availableFrom: null, createdAt: new Date(), ground: { label: 'Litigation team daily', scenario: 'PULSE_CHECK', overWhatsApp: null, cadence: 'DAILY' } }] : []));
    await h.service.handle('org-1', h.message('Hi'), 'ours');
    expect(participants.accept).toHaveBeenCalledWith('tok-brian');
    expect(h.conversation.open).toHaveBeenCalledWith('ci-brian-1', 'u-brian');
    expect(h.said.join(' ')).not.toMatch(/You have no check-in open right now|not connected to a Groundwork sign-in/);
  });
});

describe('the opening goes on WhatsApp to somebody invited by their number, once', () => {
  it('Brian is sent the submitted checkin_open message beside the email, and not again', async () => {
    const sends: any[] = [];
    const prisma: any = {
      checkIn: { findMany: jest.fn(async () => [{ id: 'ci-brian-1', groundId: 'g-lit', participant: { email: 'brian@muchemi.test', ground: { label: 'Litigation team daily', organizationId: 'org-1', overWhatsApp: null, simplerWords: false } } }]) },
      organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
      whatsAppSend: { findFirst: jest.fn(async () => (sends.length ? { id: 's1' } : null)) },
      person: { findFirst: jest.fn(async () => ({ phone: '+254712345678', givenName: 'Brian' })) },
    };
    const whatsapp: any = { isEnabled: jest.fn(async () => true), sendFor: jest.fn(async (...a: any[]) => { sends.push(a); return { sent: true }; }) };
    const cron = Object.create(GroundsCron.prototype) as any;
    cron.prisma = prisma;
    cron.whatsapp = whatsapp;
    cron.logger = { warn: jest.fn(), log: jest.fn() };
    expect(await cron.openTheCheckInOnWhatsAppForTheInvited(new Date('2026-10-19T05:00:00Z'))).toEqual({ sent: 1 });
    expect(sends[0][1]).toBe('+254712345678');
    expect(sends[0][2]).toBe('Hi Brian, your check-in for Litigation team daily is open. It takes about five minutes, and you can answer right here. Reply START to begin.');
    expect(sends[0][3]).toMatchObject({ checkInId: 'ci-brian-1', kind: 'checkin-open' });
    expect(await cron.openTheCheckInOnWhatsAppForTheInvited(new Date('2026-10-19T05:15:00Z'))).toEqual({ sent: 0 });
  });
});

describe('one number for a person (reviewer, 14 October)', () => {
  it('Kevin, added on People with his number on his sign-in, is sent the opening though the roster has no number', async () => {
    const sends: any[] = [];
    const prisma: any = {
      checkIn: { findMany: jest.fn(async () => [{ id: 'ci-kevin-1', groundId: 'g', participant: { email: 'kevin@kilima.test', ground: { label: 'Sales daily', organizationId: 'org-1', overWhatsApp: null, simplerWords: false } } }]) },
      organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
      whatsAppSend: { findFirst: jest.fn(async () => null) },
      person: { findFirst: jest.fn(async () => ({ phone: null, givenName: 'Kevin' })) },
      user: { findFirst: jest.fn(async () => ({ phoneNumber: '+254722000202', firstName: 'Kevin' })) },
    };
    const cron = Object.create(GroundsCron.prototype) as any;
    cron.prisma = prisma;
    cron.whatsapp = { isEnabled: jest.fn(async () => true), sendFor: jest.fn(async (...a: any[]) => { sends.push(a); return { sent: true }; }) };
    cron.logger = { warn: jest.fn(), log: jest.fn() };
    expect(await cron.openTheCheckInOnWhatsAppForTheInvited(new Date('2026-10-19T05:00:00Z'))).toEqual({ sent: 1 });
    expect(sends[0][1]).toBe('+254722000202');
  });

  it('his "Hi" from that number joins him, instead of "Open the email, accept it"', async () => {
    const h = anInboundHarness({ open: [], who: { personId: 'person-kevin', userId: 'u-kevin', externalId: 'u-kevin' } });
    let joined = false;
    (h.service as any).participants = { accept: jest.fn(async () => { joined = true; return {}; }) };
    h.prisma.person.findFirst = jest.fn(async () => ({ id: 'person-kevin', email: 'kevin@kilima.test' }));
    h.prisma.person.updateMany = jest.fn(async () => ({ count: 0 }));
    h.prisma.groundParticipant.findFirst = jest.fn(async (q: any) => (q?.where?.inviteToken ? { inviteToken: 'tok-kevin' } : (q?.where?.userId === null ? { ground: { label: 'Sales daily' } } : null)));
    h.prisma.user = { findFirst: jest.fn(async () => ({ id: 'u-kevin' })), findUnique: jest.fn(async () => null) };
    h.prisma.checkIn.findMany = jest.fn(async () => (joined ? [{ id: 'ci-kevin-1', status: 'NOT_STARTED', sessionNumber: 1, availableFrom: null, createdAt: new Date(), ground: { label: 'Sales daily', scenario: 'PULSE_CHECK', overWhatsApp: null, cadence: 'DAILY' } }] : []));
    await h.service.handle('org-1', h.message('Hi'), 'ours');
    expect(h.said.join(' ')).not.toMatch(/Open the email, accept it/);
    expect(h.conversation.open).toHaveBeenCalledWith('ci-kevin-1', 'u-kevin');
  });
});
