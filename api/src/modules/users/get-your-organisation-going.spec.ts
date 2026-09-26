import { UsersService } from './users.service';

/**
 * WHAT THE NEW ADMIN'S CHECKLIST READS (U.3, "Get <organisation> going"), FROM GET /users/rollout.
 *
 * Every tick is a fact: people exist, a second admin exists, a check-in exists, the organisation's
 * own WhatsApp number is on. Whether WhatsApp is switched on in Groundwork at all decides whether the
 * WhatsApp row is shown. "Got it" on the welcome card is kept per person, on the server.
 */
function make(o: { whatsappOn?: boolean; wa?: { enabled: boolean } | null; seen?: Date | null } = {}) {
  const updates: any[] = [];
  const prisma: any = {
    user: {
      count: jest.fn(async ({ where }: any) => (where.role === 'ADMIN' ? 1 : 1)),
      findUnique: jest.fn(async () => ({ welcomeCardSeenAt: o.seen ?? null })),
      update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
    },
    ground: { count: jest.fn(async () => 0) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null })) },
    apiCredential: { count: jest.fn(async () => 0) },
    whatsAppConnection: { findUnique: jest.fn(async () => (o.wa === undefined ? null : o.wa)) },
  };
  const whatsapp: any = { isEnabled: jest.fn(async () => !!o.whatsappOn) };
  const service = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any, whatsapp);
  return { service, updates };
}

describe('the checklist\'s facts', () => {
  it('a brand-new organisation: nothing done, WhatsApp off, welcome card not read', async () => {
    const { service } = make();
    expect(await service.rolloutFacts('o1', 'u1')).toMatchObject({
      people: 1, admins: 1, checkIns: 0, whatsappOn: false, whatsappConnected: false, welcomeCardSeen: false,
    });
  });

  it('WhatsApp switched on in Groundwork, and the organisation\'s own number connected', async () => {
    const { service } = make({ whatsappOn: true, wa: { enabled: true } })
    expect(await service.rolloutFacts('o1', 'u1')).toMatchObject({ whatsappOn: true, whatsappConnected: true });
  });

  it('a connected number switched off does not count as connected', async () => {
    const { service } = make({ whatsappOn: true, wa: { enabled: false } });
    expect((await service.rolloutFacts('o1', 'u1')).whatsappConnected).toBe(false);
  });

  it('with no WhatsApp service at all, WhatsApp is off', async () => {
    const prismaFree = make().service as any;
    prismaFree.whatsapp = undefined;
    expect((await prismaFree.rolloutFacts('o1', 'u1')).whatsappOn).toBe(false);
  });

  it('"Got it" is kept on the person\'s own row, and read back', async () => {
    const { service, updates } = make();
    await service.welcomeCardSeen('u1');
    expect(updates[0].where).toEqual({ id: 'u1' });
    expect(updates[0].data.welcomeCardSeenAt).toBeInstanceOf(Date);
    const { service: after } = make({ seen: new Date() });
    expect((await after.rolloutFacts('o1', 'u1')).welcomeCardSeen).toBe(true);
  });
});
