import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { aLeaveRequest } from './a-request-in-words';
import { STOPPED_SAYING } from '../whatsapp/a-message-outside-the-window';

/**
 * "LEAVE AND SPENDING DECISIONS STILL REACH YOU BY EMAIL" (decision 106 item 7).
 *
 * Amani said STOP on WhatsApp, so she reads that sentence. It is only true if a decision on her leave,
 * which cannot go to her phone, goes to her email. These read what each channel carries.
 */
function world(whatsAppSent: boolean) {
  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => where.id === 'u-amani'
        ? { email: 'amani@kito.test', firstName: 'Amani', phoneNumber: '+254700000001', deletedAt: null }
        : { firstName: 'Wairimu' }),
    },
    person: { findFirst: jest.fn(async () => ({ phone: '+254700000001', givenName: 'Amani' })) },
    organizationMembership: { findMany: jest.fn(async () => []) },
    suiteEvent: { create: jest.fn(async () => ({})) },
  };
  const whatsapp: any = { sendFor: jest.fn(async () => (whatsAppSent ? { sent: true } : { sent: false, error: 'They said STOP, so nothing is sent.' })) };
  const email: any = { sendRequestDecided: jest.fn(async () => undefined) };
  return { told: new ARequestToldOnWhatsApp(prisma, whatsapp, email), whatsapp, email };
}
const LEAVE = aLeaveRequest('l1', 'u-amani', 'Amani', '2026-10-20', '2026-10-22');

describe('a decision on a request reaches the person', () => {
  it('the STOP sentence promises email for decisions', () => {
    expect(STOPPED_SAYING).toBe('Stopped. Nothing more comes to this number from Groundwork unless you reply START. Your check-ins are still in Groundwork. Leave and spending decisions still reach you by email.');
  });

  it('by email, in the same sentence, when the WhatsApp message could not go (she said STOP)', async () => {
    const { told, email } = world(false);
    expect(await told.decided('org-1', LEAVE, 'approved', 'u-wairimu')).toBe(false);
    expect(email.sendRequestDecided).toHaveBeenCalledWith('amani@kito.test', 'Hi Amani, your request for leave from Tuesday 20 October to Thursday 22 October was approved by Wairimu. Open Groundwork to read it.', 'leave from Tuesday 20 October to Thursday 22 October', 'approved');
  });

  it('a decline carries the reason by email too', async () => {
    const { told, email } = world(false);
    await told.decided('org-1', LEAVE, 'declined', 'u-wairimu', 'Two people are already off that week');
    expect(email.sendRequestDecided.mock.calls[0][1]).toMatch(/^Hi Amani, your request for leave from Tuesday 20 October to Thursday 22 October was declined by Wairimu\. .*Two people are already off that week.* Open Groundwork to read it\.$/);
  });

  it('not by email as well when it went on WhatsApp', async () => {
    const { told, email } = world(true);
    expect(await told.decided('org-1', LEAVE, 'approved', 'u-wairimu')).toBe(true);
    expect(email.sendRequestDecided).not.toHaveBeenCalled();
  });
});
