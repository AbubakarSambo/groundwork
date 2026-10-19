import { WebhooksListener } from '../webhooks/webhooks.listener';

/**
 * ONE CHANNEL PER OPENING, FOR SOMEBODY LET IN AFTER JOINING BY THE LINK (messages test, 19 October, the rule check).
 *
 * Drop Access (test), Monday 12 October. Amos asked to join Sales team, Q4 through its join link; Grace let him in at 09:15 and he was
 * emailed "You can start your check-in now". He then added his WhatsApp number, and at 09:30 the WhatsApp opening for the same first
 * session went too ("Hi Amos, your check-in for Sales team, Q4 is open."). The same for David at Muchemi & Co. (test). The approval email
 * is that session's opening, on email, so the WhatsApp opening is not sent for it. Later sessions open on WhatsApp as before.
 */
function theWorld(o: { approvalEmail: 'sent' | 'none' | 'before-the-check-in'; sessionNumber?: number }) {
  const checkInMade = new Date('2026-10-12T06:13:00Z');
  const approvedAt = o.approvalEmail === 'before-the-check-in' ? new Date('2026-09-01T06:15:00Z') : new Date('2026-10-12T06:15:00Z');
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-drop', label: 'Sales team, Q4', overWhatsApp: null, simplerWords: false })) },
    groundParticipant: {
      findUnique: jest.fn(async () => ({ id: 'gp-amos', email: 'amos@dropaccess.test', userId: 'u-amos', user: { firstName: 'Amos', email: 'amos@dropaccess.test', phoneNumber: '+254700300007' } })),
      findMany: jest.fn(async () => []),
    },
    leaveRequest: { findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => null) },
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: true, whatsappFreeUntil: null })) },
    whatsAppSend: { findFirst: jest.fn(async () => null) },
    checkIn: { findUnique: jest.fn(async () => ({ id: 'ci-amos-1', createdAt: checkInMade, status: 'NOT_STARTED' })) },
    notification: {
      findFirst: jest.fn(async ({ where }: any) => (o.approvalEmail !== 'none' && where.sender === 'sendYouAreInNow' && (!where.createdAt?.gte || approvedAt >= where.createdAt.gte)
        ? { id: 'n-approved', createdAt: approvedAt } : null)),
    },
  };
  const sendFor = jest.fn(async () => ({ sent: true }));
  const listener = new WebhooksListener(prisma, { emit: jest.fn(async () => undefined) } as any, { get: () => undefined } as any, {} as any, { sendFor } as any);
  const open = () => listener.onCheckInOpened({ checkInId: 'ci-amos-1', groundId: 'g-sales', participantId: 'gp-amos', sessionNumber: o.sessionNumber ?? 1, personExternalId: null } as any);
  return { open, sendFor };
}

describe('the first session, told open by the approval email, is not told open again on WhatsApp', () => {
  it('Amos, emailed "You can start your check-in now" at 09:15, is not sent the WhatsApp opening at 09:30', async () => {
    const w = theWorld({ approvalEmail: 'sent' });
    await w.open();
    expect(w.sendFor).not.toHaveBeenCalled();
  });

  it('somebody with no approval email for it is told on WhatsApp as before', async () => {
    const w = theWorld({ approvalEmail: 'none' });
    await w.open();
    expect(w.sendFor).toHaveBeenCalledTimes(1);
  });

  it('an approval long before this check-in was made does not count as its opening', async () => {
    const w = theWorld({ approvalEmail: 'before-the-check-in' });
    await w.open();
    expect(w.sendFor).toHaveBeenCalledTimes(1);
  });

  it('his second session opens on WhatsApp as usual', async () => {
    const w = theWorld({ approvalEmail: 'sent', sessionNumber: 2 });
    await w.open();
    expect(w.sendFor).toHaveBeenCalledTimes(1);
  });
});
