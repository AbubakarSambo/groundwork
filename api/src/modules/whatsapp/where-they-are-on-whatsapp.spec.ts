import { whereTheyAreOnWhatsApp, WHERE_ON_WHATSAPP_SAYS } from './where-they-are-on-whatsapp';
import { whereEachPersonIsOnWhatsApp } from '../grounds/the-lead-adds-a-whatsapp-number';

/**
 * PILOTS ON WHATSAPP, 14 OCTOBER: People showed nowhere whether somebody could check in on WhatsApp. Where they are is read
 * from the record: no number, not connected (saved, nothing sent or received), waiting for their first message (something
 * went, nothing came back), connected (they have written from it).
 */
function records(o: { sent?: boolean; received?: boolean }) {
  return {
    whatsAppInboundMessage: { findFirst: jest.fn(async () => (o.received ? { messageId: 'in:theirs:254722000202:1' } : null)) },
    whatsAppSend: { findFirst: jest.fn(async () => (o.sent ? { id: 's1' } : null)) },
  };
}

describe('where somebody is on WhatsApp', () => {
  it('reads each state from what happened', async () => {
    expect(await whereTheyAreOnWhatsApp(records({}), null)).toBe('no-number');
    expect(await whereTheyAreOnWhatsApp(records({}), '+254722000202')).toBe('not-connected');
    expect(await whereTheyAreOnWhatsApp(records({ sent: true }), '+254722000202')).toBe('waiting');
    expect(await whereTheyAreOnWhatsApp(records({ sent: true, received: true }), '+254722000202')).toBe('connected');
  });
  it('says each in a full sentence', () => {
    expect(WHERE_ON_WHATSAPP_SAYS.waiting).toBe('Waiting for their first message on WhatsApp.');
    expect(WHERE_ON_WHATSAPP_SAYS.connected).toBe('Connected. They can check in on WhatsApp.');
  });
});

describe('the WhatsApp roster of a check-in is for whoever runs it and an admin only', () => {
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ({ id: 'g1', initiatorId: 'u-grace', createdByUserId: 'u-grace' })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-kevin', email: 'kevin@kilima.test', user: { phoneNumber: '+254722000202' } }]) },
    person: { findFirst: jest.fn(async () => null) },
    ...records({ sent: true }),
  };
  it('Grace, who runs it, and an admin read each person\'s number and where they are', async () => {
    expect(await whereEachPersonIsOnWhatsApp(prisma, { groundId: 'g1', organizationId: 'o1', userId: 'u-grace', role: 'LEAD' }))
      .toEqual([{ participantId: 'p-kevin', phone: '+254722000202', whatsapp: 'waiting', says: 'Waiting for their first message on WhatsApp.' }]);
    expect(await whereEachPersonIsOnWhatsApp(prisma, { groundId: 'g1', organizationId: 'o1', userId: 'u-admin', role: 'ADMIN' })).toHaveLength(1);
  });
  it('a member, and a lead who does not run it, are refused', async () => {
    await expect(whereEachPersonIsOnWhatsApp(prisma, { groundId: 'g1', organizationId: 'o1', userId: 'u-mercy', role: 'MEMBER' })).rejects.toMatchObject({ status: 403 });
    await expect(whereEachPersonIsOnWhatsApp(prisma, { groundId: 'g1', organizationId: 'o1', userId: 'u-njeri', role: 'LEAD' })).rejects.toMatchObject({ status: 403 });
  });
});

import { theOpeningGoesToTheNumberJustAdded } from '../grounds/the-lead-adds-a-whatsapp-number';

/* PILOTS ON WHATSAPP, 14 OCTOBER: an admin adds Kevin's number, and his open session's opening goes there at once (D2). */
describe('the opening goes to a number just added', () => {
  const world = (o: { sent?: boolean; received?: boolean; openedBefore?: boolean; keptInApp?: boolean } = {}) => {
    const send = { sendFor: jest.fn(async () => ({ sent: true })) };
    const prisma: any = {
      ...records(o),
      checkIn: { findFirst: jest.fn(async () => ({ id: 'ci-kevin', participant: { user: { firstName: 'Kevin' }, nameGiven: null, ground: { label: 'Sales daily', overWhatsApp: o.keptInApp ? false : null, simplerWords: false } } })) },
    };
    if (o.openedBefore) prisma.whatsAppSend = { findFirst: jest.fn(async (q: any) => (q.where.checkInId ? { id: 'before' } : null)) };
    return { send, prisma };
  };
  const input = { groundId: 'g1', participantId: 'p-kevin', organizationId: 'o1', phone: '+254722000202' };
  it('goes once, as the approved opening, to the number just added', async () => {
    const w = world();
    expect(await theOpeningGoesToTheNumberJustAdded(w.prisma, w.send, input, true)).toBe(true);
    expect(w.send.sendFor).toHaveBeenCalledWith('o1', '+254722000202', expect.stringContaining('your check-in for Sales daily is open'), { checkInId: 'ci-kevin', kind: 'checkin-open', params: ['Kevin', 'Sales daily'] });
  });
  it('not when WhatsApp is off, the check-in is kept in the app, the number was used before, or the opening already went', async () => {
    for (const [o, on] of [[{}, false], [{ keptInApp: true }, true], [{ received: true }, true], [{ sent: true }, true], [{ openedBefore: true }, true]] as const) {
      const w = world(o as any);
      expect(await theOpeningGoesToTheNumberJustAdded(w.prisma, w.send, input, on as boolean)).toBe(false);
      expect(w.send.sendFor).not.toHaveBeenCalled();
    }
  });
});
