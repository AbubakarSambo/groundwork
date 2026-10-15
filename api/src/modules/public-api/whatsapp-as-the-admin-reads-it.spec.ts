import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WhatsAppForAnOrganisationController } from './whatsapp-for-an-organisation.controller';
import { TEMPLATES, THE_NAMES_TO_SUBMIT } from '../whatsapp/a-message-outside-the-window';

/**
 * WHATSAPP ON THE CONNECTIONS PAGE, AS EACH READER IS SERVED IT (F1).
 *
 * Baridi Appliances. Grace is the admin. Miriam is a member. What Grace reads is checked as the
 * server hands it to her, for each state the card can be in: connected on Baridi's own number, on
 * Groundwork's number, set up but switched off, and not connected. Miriam is refused by the server.
 *
 * And in every state: no field, at any depth, holds a secret or anything that looks like one. Every
 * secret below is fake and says so; the database mock hands them back as a careless select would, so
 * the test proves they are left out of what is served, not merely never fetched.
 */

const FAKE = {
  accessToken: 'FAKE-ACCESS-TOKEN-not-a-real-one-000000',
  appSecret: 'FAKE-APP-SECRET-not-a-real-one-111111',
  verifyToken: 'gwv_FAKEVERIFYTOKENnotreal2222',
  platformAccessToken: 'FAKE-PLATFORM-TOKEN-not-a-real-one-3333',
  platformAppSecret: 'FAKE-PLATFORM-SECRET-not-a-real-one-4444',
  platformVerifyToken: 'FAKE-PLATFORM-VERIFY-not-a-real-one-5555',
};

const BARIDI_ROW = {
  id: 'wa-1', organizationId: 'org-baridi', phoneNumberId: '109822345561', businessAccountId: null,
  displayNumber: '+254 709 000 111', accessToken: FAKE.accessToken, appSecret: FAKE.appSecret,
  verifyToken: FAKE.verifyToken, approvedTemplates: [] as string[], enabled: true,
  connectedAt: new Date('2026-09-01T09:00:00Z'), lastInboundAt: null, lastOutboundAt: null,
  webhookVerifiedAt: new Date('2026-09-01T09:10:00Z'),
};

function setup(opts: {
  own?: Partial<typeof BARIDI_ROW> | null;
  credentials?: boolean;
  switchedOn?: boolean;
  platformNumber?: string;
  publicApiUrl?: string;
  people?: number;
  failed?: number;
  platformTemplates?: string[];
}) {
  const own = opts.own === null ? null : { ...BARIDI_ROW, ...(opts.own ?? {}) };
  const prisma: any = {
    whatsAppConnection: { findUnique: jest.fn(async () => own) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Baridi Appliances' })) },
    groundParticipant: { findMany: jest.fn(async () => [{ email: 'miriam@baridi.co.ke', userId: 'u-miriam' }]) },
    person: { count: jest.fn(async () => opts.people ?? 6) },
    whatsAppSend: { count: jest.fn(async () => opts.failed ?? 0) },
  };
  const whatsapp: any = {
    getToggleState: jest.fn(async () => ({
      credentialsConfigured: opts.credentials ?? true,
      adminEnabled: opts.switchedOn ?? true,
      live: (opts.credentials ?? true) && (opts.switchedOn ?? true),
    })),
    /* Builds the connection with the verify token in it. The page must not be served from this. */
    connectionFor: jest.fn(async () => (own ? { ...own, tokenEndsWith: own.accessToken.slice(-4) } : null)),
  };
  const settings: Record<string, unknown> = {
    'whatsapp.approvedTemplates': opts.platformTemplates ?? [],
    'whatsapp.displayNumber': opts.platformNumber,
    'whatsapp.accessToken': FAKE.platformAccessToken,
    'whatsapp.appSecret': FAKE.platformAppSecret,
    'whatsapp.verifyToken': FAKE.platformVerifyToken,
    'app.publicApiUrl': opts.publicApiUrl,
  };
  const config: any = { get: (k: string) => settings[k] };
  const c = new WhatsAppForAnOrganisationController(prisma, whatsapp, {} as any, config);
  return { c, prisma, whatsapp };
}

/** Every string anywhere in what is served, with the key it sits under. */
function everyString(v: any, key = '', out: [string, string][] = []): [string, string][] {
  if (typeof v === 'string') out.push([key, v]);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, key, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) everyString(x, k, out);
  return out;
}
function everyKey(v: any, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => everyKey(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.push(k); everyKey(x, out); }
  return out;
}

function holdsNoSecret(served: any) {
  const asServed = JSON.parse(JSON.stringify(served));
  const text = JSON.stringify(asServed);
  for (const secret of Object.values(FAKE)) {
    expect(text).not.toContain(secret);
    /* Nor any piece of one, such as the last four characters. */
    expect(text).not.toContain(secret.slice(-4));
  }
  for (const k of everyKey(asServed)) expect(k).not.toMatch(/^(accessToken|appSecret|verifyToken|tokenEndsWith|secret|token)$/i);
  for (const [key, s] of everyString(asServed)) {
    expect(s).not.toMatch(/gwv_|EAA[A-Za-z0-9]{6,}|sk_(live|test)_/);
    /* A long run of characters with no space that is not an address, a path, a date or an id we
       chose to show reads as a key. */
    const looksLikeAKey = /^[A-Za-z0-9_\-+/=.]{24,}$/.test(s)
      && !/^https?:\/\//.test(s) && !s.startsWith('/') && !/^\d{4}-\d{2}-\d{2}T/.test(s)
      /* The template names Meta matches are ours and public: they are what the admin submits. */
      && !Object.values(TEMPLATES).some((t) => t.name === s);
    expect([key, looksLikeAKey]).toEqual([key, false]);
  }
}

const NOW_FIELDS = ['state', 'stateLabel', 'saying', 'whatIsOff', 'numberInUse', 'callback', 'counts', 'reminders'];

describe('Grace, the admin of Baridi Appliances, reads WhatsApp on the Connections page', () => {
  it('connected on Baridi’s own number: the prototype’s sentence, the number, the callback address and the counts', async () => {
    const { c } = setup({ publicApiUrl: 'https://api.myground.work/', people: 6, failed: 0 });
    const got: any = await c.connection('org-baridi');
    for (const f of NOW_FIELDS) expect(got).toHaveProperty(f);
    expect(got.state).toBe('connected');
    expect(got.stateLabel).toBe('Connected');
    expect(got.saying).toBe("Your people check in by replying to +254 709 000 111, Baridi Appliances' WhatsApp Business number. A reply is their check-in, exactly as if typed here.");
    expect(got.whatIsOff).toEqual([]);
    expect(got.numberInUse).toEqual({ whose: 'yours', number: '+254 709 000 111', saying: 'The number in use is +254 709 000 111, your WhatsApp Business number.' });
    expect(got.callback).toEqual({
      address: 'https://api.myground.work/api/v1/webhooks/whatsapp/org-baridi',
      path: '/api/v1/webhooks/whatsapp/org-baridi',
      saying: 'The callback address to paste into Meta is https://api.myground.work/api/v1/webhooks/whatsapp/org-baridi.',
      verifyTokenSet: true,
      verifyTokenSaying: 'The verify token is set.',
    });
    expect(got.counts.peopleOnWhatsApp).toEqual({ label: 'people checking in on WhatsApp', count: 6, saying: '6 people in your check-ins have a WhatsApp number and can check in by replying.' });
    expect(got.counts.checkInsThisMonth).toEqual({ label: 'check-ins this month', count: null, saying: 'Groundwork does not yet record which check-ins came in by WhatsApp, so this number cannot be shown.' });
    expect(got.counts.failedThisWeek).toEqual({ label: 'failed messages this week', count: 0, saying: 'No messages failed to send in the last seven days.' });
    expect(got.reminders).toEqual({ approved: false, saying: 'Meta has not approved the reminder messages yet. Until it does, Groundwork can only answer people who write first. It cannot send the first message, so no reminders go by WhatsApp.' });
    /* What the page already read is still there, without the secrets. */
    expect(got.connection).toMatchObject({ phoneNumberId: '109822345561', displayNumber: '+254 709 000 111', enabled: true, webhookProvenAt: BARIDI_ROW.webhookVerifiedAt });
    expect(got.connection).not.toHaveProperty('verifyToken');
    expect(got.connection).not.toHaveProperty('tokenEndsWith');
    expect(got.webhookPath).toBe('/api/v1/webhooks/whatsapp/org-baridi');
    holdsNoSecret(got);
  });

  /* Changed 2 October (survey item 7): the product starts more than three messages now (the first
     session, reminders and nudges), so "approved" means every name the product starts. */
  it('says the reminders can go once Meta has approved every one of them on Baridi’s own app', async () => {
    const { c } = setup({ own: { approvedTemplates: [...THE_NAMES_TO_SUBMIT] } });
    const got: any = await c.connection('org-baridi');
    expect(got.canStartAConversation).toBe(true);
    expect(got.reminders).toEqual({ approved: true, saying: 'Meta has approved the reminder messages, so Groundwork can send the first message, such as a reminder that a check-in is open.' });
  });

  it('with no public address set, says the address is known once Groundwork is hosted, and gives the path', async () => {
    const { c } = setup({});
    const got: any = await c.connection('org-baridi');
    expect(got.callback.address).toBeNull();
    expect(got.callback.saying).toBe('The full callback address will be known once Groundwork is hosted. It ends in /api/v1/webhooks/whatsapp/org-baridi.');
  });

  it('on Groundwork’s number, with the number set', async () => {
    const { c } = setup({ own: null, platformNumber: '+44 7700 900123', people: 1, failed: 2 });
    const got: any = await c.connection('org-baridi');
    expect(got.state).toBe('groundworks_number');
    expect(got.stateLabel).toBe("On Groundwork's number");
    expect(got.saying).toBe("Your people check in by replying to +44 7700 900123, Groundwork's WhatsApp number. A reply is their check-in, exactly as if typed here. You can connect your own WhatsApp Business number instead.");
    expect(got.numberInUse).toEqual({ whose: 'groundworks', number: '+44 7700 900123', saying: "The number in use is +44 7700 900123, Groundwork's WhatsApp number." });
    expect(got.callback.verifyTokenSet).toBe(false);
    expect(got.callback.verifyTokenSaying).toBe('There is no verify token yet. One is made when you connect your number.');
    expect(got.counts.peopleOnWhatsApp.saying).toBe('1 person in your check-ins has a WhatsApp number and can check in by replying.');
    expect(got.counts.failedThisWeek.saying).toBe('2 messages failed to send in the last seven days.');
    expect(got.connection).toBeNull();
    holdsNoSecret(got);
  });

  it('on Groundwork’s number, with no number set, names no number', async () => {
    const { c } = setup({ own: null });
    const got: any = await c.connection('org-baridi');
    expect(got.saying).toBe("Your people check in by replying to Groundwork's WhatsApp number. A reply is their check-in, exactly as if typed here. You can connect your own WhatsApp Business number instead.");
    expect(got.numberInUse).toEqual({ whose: 'groundworks', number: null, saying: "The number in use is Groundwork's WhatsApp number." });
    holdsNoSecret(got);
  });

  it('set up, but Baridi switched it off: says so, and that Groundwork’s number carries messages meanwhile', async () => {
    const { c } = setup({ own: { enabled: false } });
    const got: any = await c.connection('org-baridi');
    expect(got.state).toBe('switched_off');
    expect(got.stateLabel).toBe('Switched off');
    expect(got.whatIsOff).toEqual(['your_switch']);
    expect(got.saying).toBe("Your WhatsApp Business number, +254 709 000 111, is set up, but you have switched it off, so nobody can check in by replying to it. Turn it on to use it again. Until then, messages from Groundwork go from Groundwork's WhatsApp number.");
    expect(got.numberInUse.saying).toBe('Your WhatsApp Business number is +254 709 000 111. It is switched off at the moment.');
    holdsNoSecret(got);
  });

  it('set up, but Groundwork has WhatsApp switched off for everyone: says so, without naming any setting', async () => {
    const { c } = setup({ switchedOn: false });
    const got: any = await c.connection('org-baridi');
    expect(got.state).toBe('switched_off');
    expect(got.whatIsOff).toEqual(['groundworks_switch']);
    expect(got.saying).toBe('Your WhatsApp Business number, +254 709 000 111, is set up and switched on, but Groundwork has switched WhatsApp off for everyone for now. You do not need to do anything.');
    expect(JSON.stringify(got)).not.toMatch(/whatsapp_enabled|WHATSAPP_/);
    holdsNoSecret(got);
  });

  it('both switched off: says both', async () => {
    const { c } = setup({ own: { enabled: false }, switchedOn: false });
    const got: any = await c.connection('org-baridi');
    expect(got.whatIsOff).toEqual(['your_switch', 'groundworks_switch']);
    expect(got.saying).toBe('Your WhatsApp Business number, +254 709 000 111, is set up, but you have switched it off, so nobody can check in by replying to it. Turn it on to use it again. Groundwork has also switched WhatsApp off for everyone for now.');
  });

  it('not connected: no number of Baridi’s own, and Groundwork’s number is not on', async () => {
    for (const [credentials, switchedOn] of [[false, false], [true, false], [false, true]]) {
      const { c } = setup({ own: null, credentials, switchedOn, people: 0 });
      const got: any = await c.connection('org-baridi');
      expect(got.state).toBe('not_connected');
      expect(got.stateLabel).toBe('Not connected');
      expect(got.saying).toBe("WhatsApp is not connected. Connect your organisation's WhatsApp Business number, and your people can check in by replying to it.");
      expect(got.numberInUse).toEqual({ whose: null, number: null, saying: 'No WhatsApp number is in use.' });
      expect(got.counts.peopleOnWhatsApp.saying).toBe('Nobody in your check-ins has a WhatsApp number yet. You can add numbers under People.');
      holdsNoSecret(got);
    }
  });

  it('is not served from the builder that carries the verify token', async () => {
    const { c, whatsapp } = setup({});
    await c.connection('org-baridi');
    expect(whatsapp.connectionFor).not.toHaveBeenCalled();
  });

  it('counts only this organisation’s people and messages, and leaves out a message held for the add-on', async () => {
    const { c, prisma } = setup({});
    await c.connection('org-baridi');
    const parties = prisma.groundParticipant.findMany.mock.calls[0][0];
    expect(parties.where.ground.organizationId).toBe('org-baridi');
    expect(parties.where.ground.NOT).toEqual({ overWhatsApp: false });
    const people = prisma.person.count.mock.calls[0][0];
    expect(people.where).toMatchObject({ organizationId: 'org-baridi', active: true, phone: { not: null }, whatsappStoppedAt: null });
    const failed = prisma.whatsAppSend.count.mock.calls[0][0];
    expect(failed.where.organizationId).toBe('org-baridi');
    expect(JSON.stringify(failed.where.OR)).toContain(':held');
  });
});

describe('Miriam, a member of Baridi Appliances, asks for the same', () => {
  it('is refused by the server, as before', () => {
    const guard = new RolesGuard(new Reflector());
    const ctx = (role: string) => ({
      getHandler: () => WhatsAppForAnOrganisationController.prototype.connection,
      getClass: () => WhatsAppForAnOrganisationController,
      switchToHttp: () => ({ getRequest: () => ({ user: { id: `u-${role}`, organizationId: 'org-baridi', role } }) }),
    }) as any;
    expect(() => guard.canActivate(ctx('MEMBER'))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx('ADMIN'))).toBe(true);
  });
});
