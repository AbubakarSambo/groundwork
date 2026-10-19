import { WebhooksListener } from '../webhooks/webhooks.listener';
import { GroundsCron } from '../grounds/grounds.cron';

/**
 * EVERYBODY WITH A NUMBER IS TOLD ON WHATSAPP (Hafsah's D2, put back after production, 15 October 2026).
 *
 * "First contact can be on WhatsApp if your company adds your number; it can be on both at the same time." After
 * production went out, nobody whose company had added their number was told on WhatsApp that their check-in was open:
 * the opening went on WhatsApp only to people who had already written from their number. Three people at Kilima:
 *   - Mercy, connected (she has written from her number): told on WhatsApp only;
 *   - Juma, whose number the company added and who has never written: told on WhatsApp AND by email;
 *   - Wanjiku, with no number: told by email only.
 */
type Who = 'mercy' | 'juma' | 'wanjiku';
const PEOPLE: Record<Who, { phone: string | null; wrote: boolean }> = {
  mercy: { phone: '+254722000201', wrote: true },
  juma: { phone: '+254722000202', wrote: false },
  wanjiku: { phone: null, wrote: false },
};

function prismaFor(who: Who) {
  const p = PEOPLE[who];
  return {
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-kilima', label: 'Kilima sales', overWhatsApp: null, simplerWords: false })) },
    groundParticipant: {
      findUnique: jest.fn(async () => ({ id: `gp-${who}`, email: `${who}@kilima.test`, userId: `u-${who}`, user: { firstName: who[0].toUpperCase() + who.slice(1), email: `${who}@kilima.test`, phoneNumber: null } })),
      findMany: jest.fn(async () => []),
    },
    leaveRequest: { findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ phone: p.phone, whatsappLastInboundAt: p.wrote ? new Date('2026-10-10T09:00:00Z') : null })) },
    user: { findUnique: jest.fn(async () => ({ phoneNumber: null })) },
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: true, whatsappFreeUntil: null })) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: { findFirst: jest.fn(async () => null) },
  };
}

async function toldOnWhatsApp(who: Who): Promise<boolean> {
  const sendFor = jest.fn(async () => ({ sent: true }));
  const listener = new WebhooksListener(prismaFor(who) as any, { emit: jest.fn(async () => undefined) } as any, { get: () => undefined } as any, {} as any, { sendFor } as any);
  await listener.onCheckInOpened({ checkInId: `ci-${who}`, groundId: 'g-kilima', participantId: `gp-${who}`, sessionNumber: 2, personExternalId: `ext-${who}` } as any);
  return sendFor.mock.calls.length === 1;
}

/* What became of the WhatsApp opening for this check-in: it went, it was refused, or nothing is written yet. */
type TheOpening = 'went' | 'refused' | 'none';
const NOW = new Date('2026-10-19T08:20:00Z');

async function toldByEmail(who: Who, o: { opening?: TheOpening; openedMinutesAgo?: number } = {}): Promise<{ email: boolean; stamped: boolean }> {
  const opening = o.opening ?? (PEOPLE[who].phone ? 'went' : 'none');
  const rows = opening === 'none' ? [] : [{ id: 'ws-1', checkInId: `ci-${who}`, kind: 'checkin-open:template', sentAt: opening === 'went' ? NOW : null, failedAt: opening === 'went' ? null : NOW }];
  const update = jest.fn(async () => ({}));
  const prisma: any = {
    ...prismaFor(who),
    whatsAppSend: {
      findFirst: jest.fn(async (q: any) => rows.find((r) => r.checkInId === q?.where?.checkInId && r.kind.startsWith(q?.where?.kind?.startsWith ?? '') && (q?.where?.sentAt?.not === null ? r.sentAt !== null : true)) ?? null),
    },
    checkIn: {
      findMany: jest.fn(async () => [{ id: `ci-${who}`, groundId: 'g-kilima', availableFrom: new Date(NOW.getTime() - (o.openedMinutesAgo ?? 45) * 60_000), participant: { id: `gp-${who}`, email: `${who}@kilima.test`, userId: `u-${who}`, ground: { label: 'Kilima sales', simplerWords: false, organizationId: 'org-kilima' }, user: { phoneNumber: null } } }]),
      update,
    },
    ground: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async () => null) },
  };
  const sendSessionReady = jest.fn(async () => 'sent');
  const cron: any = new GroundsCron(prisma, { sendSessionReady, buildCheckInUrl: (id: string) => `https://myground.work/checkin/${id}` } as any, { get: () => '' } as any, {} as any, {} as any, {} as any, {} as any);
  cron.announceOpenedSessions = jest.fn(async () => undefined);
  cron.openTheCheckInOnWhatsAppForTheInvited = jest.fn(async () => ({ sent: 0 }));
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] });
  try {
    await cron.sendSessionReadyNotificationsInner();
  } finally {
    jest.useRealTimers();
  }
  return { email: sendSessionReady.mock.calls.length === 1, stamped: update.mock.calls.length === 1 };
}

describe('a check-in opens, at an organisation with WhatsApp on', () => {
  it('Juma, whose number the company added and who has never written, is told on WhatsApp and by email', async () => {
    expect(await toldOnWhatsApp('juma')).toBe(true);
    expect((await toldByEmail('juma')).email).toBe(true);
  });
  it('Mercy, who writes from her number, is told on WhatsApp only', async () => {
    expect(await toldOnWhatsApp('mercy')).toBe(true);
    expect((await toldByEmail('mercy')).email).toBe(false);
  });
  it('Wanjiku, with no number, is told by email only', async () => {
    expect(await toldOnWhatsApp('wanjiku')).toBe(false);
    expect((await toldByEmail('wanjiku')).email).toBe(true);
  });
});

/*
 * WHEN THE WHATSAPP OPENING DID NOT GO (Drop Access, October). Mercy counts as connected, so the email was skipped even
 * when her WhatsApp opening was refused, and she was told nowhere. Now the email waits half an hour for the WhatsApp
 * opening, then goes. One channel for an opening that went.
 */
describe('Mercy, connected on WhatsApp, when her WhatsApp opening did not go', () => {
  it('refused, and the session opened 45 minutes ago: she is told by email', async () => {
    expect(await toldByEmail('mercy', { opening: 'refused', openedMinutesAgo: 45 })).toEqual({ email: true, stamped: true });
  });
  it('nothing written yet, and the session opened 45 minutes ago: she is told by email', async () => {
    expect(await toldByEmail('mercy', { opening: 'none', openedMinutesAgo: 45 })).toEqual({ email: true, stamped: true });
  });
  it('refused, and the session opened 10 minutes ago: nothing yet, and it is left for the next sweep to look again', async () => {
    expect(await toldByEmail('mercy', { opening: 'refused', openedMinutesAgo: 10 })).toEqual({ email: false, stamped: false });
  });
  it('it went, even only 10 minutes after the session opened: WhatsApp only, never the email too', async () => {
    expect(await toldByEmail('mercy', { opening: 'went', openedMinutesAgo: 10 })).toEqual({ email: false, stamped: true });
  });
});
