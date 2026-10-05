import 'reflect-metadata';
import * as crypto from 'crypto';
import { AddressInfo } from 'net';
import { Logger, LoggerService, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AdminController, OtpGuard } from './admin.controller';
import { AdminService } from './admin.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppController } from '../whatsapp/whatsapp.controller';
import { PricingService } from '../billing/pricing.service';
import { StripeService } from '../billing/stripe.service';
import { ApiAccessService } from '../public-api/api-access.service';
import { ThreeMonthsOnTheHouseService } from '../billing/three-months-on-the-house.service';
import { OUR_NUMBER_KEY } from '../whatsapp/groundworks-own-number';

/**
 * GROUNDWORK'S OWN WHATSAPP NUMBER IS SET BY GROUNDWORK STAFF, IN THE BACK OFFICE (5 Oct 2026).
 *
 * Hafsah asked whether staff could set Groundwork's own WhatsApp number and its webhook for all
 * users. They could not: the number and its keys were server settings only. These specs read what a
 * member of staff reads on /admin/whatsapp, what anybody else gets, and what the sender and the
 * webhook check actually use.
 */

const REAL_FETCH = global.fetch;
const KEY = 'a-test-settings-key-not-a-real-one';

/* Fake values, made up for this test; none is a real key. */
const SAVED = {
  accessToken: 'EAAG-saved-token-' + crypto.randomBytes(8).toString('hex'),
  appSecret: 'saved-app-secret-' + crypto.randomBytes(8).toString('hex'),
  verifyToken: 'saved-verify-' + crypto.randomBytes(8).toString('hex'),
};
const SERVER = {
  'whatsapp.accessToken': 'EAAG-server-token-' + crypto.randomBytes(8).toString('hex'),
  'whatsapp.phoneNumberId': '111111111',
  'whatsapp.appSecret': 'server-app-secret-' + crypto.randomBytes(8).toString('hex'),
  'whatsapp.verifyToken': 'server-verify-' + crypto.randomBytes(8).toString('hex'),
  'whatsapp.enabled': true,
  'whatsapp.displayNumber': '+234 800 000 0000',
  'whatsapp.graphBaseUrl': 'http://127.0.0.1:9/graph',
  'app.publicApiUrl': 'https://api.groundwork.test',
} as Record<string, unknown>;
const ALL_SECRETS = [...Object.values(SAVED), SERVER['whatsapp.accessToken'], SERVER['whatsapp.appSecret'], SERVER['whatsapp.verifyToken']] as string[];

function aDatabase() {
  const rows = new Map<string, any>();
  const sends: any[] = [];
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (rows.has(where.key) ? { key: where.key, value: rows.get(where.key) } : null)),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        rows.set(where.key, rows.has(where.key) ? update.value : create.value);
        return {};
      }),
    },
    whatsAppSend: { create: jest.fn(async ({ data }: any) => { sends.push(data); return data; }), findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    notification: { create: jest.fn(async () => ({})) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    organization: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    person: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
  };
  return { prisma, rows, sends };
}

function aService(settings: Record<string, unknown> = SERVER) {
  const db = aDatabase();
  const config: any = { get: (k: string) => settings[k] };
  const whatsapp = new WhatsAppService(config, db.prisma);
  return { whatsapp, config, ...db };
}

/** Everything any logger or the console says, so a secret in a log line is caught. */
const said: string[] = [];
const captor: LoggerService = {
  log: (m: any, ...r: any[]) => { said.push(String(m), ...r.map(String)); },
  error: (m: any, ...r: any[]) => { said.push(String(m), ...r.map(String)); },
  warn: (m: any, ...r: any[]) => { said.push(String(m), ...r.map(String)); },
  debug: (m: any, ...r: any[]) => { said.push(String(m), ...r.map(String)); },
  verbose: (m: any, ...r: any[]) => { said.push(String(m), ...r.map(String)); },
};

let fetched: { url: string; init: any }[] = [];
beforeEach(() => {
  process.env.SETTINGS_ENCRYPTION_KEY = KEY;
  said.length = 0;
  fetched = [];
  Logger.overrideLogger(captor);
  for (const k of ['log', 'warn', 'error', 'info', 'debug'] as const) {
    jest.spyOn(console, k).mockImplementation((...a: any[]) => { said.push(a.map(String).join(' ')); });
  }
  global.fetch = jest.fn(async (url: any, init: any) => {
    fetched.push({ url: String(url), init });
    if (String(url).includes('/messages')) return { ok: true, status: 200, text: async () => '{}', json: async () => ({}) } as any;
    return { ok: true, status: 200, text: async () => '{}', json: async () => ({ display_phone_number: '+44 7700 900123', verified_name: 'Groundwork' }) } as any;
  }) as any;
});
afterEach(() => {
  delete process.env.SETTINGS_ENCRYPTION_KEY;
  global.fetch = REAL_FETCH;
  jest.restoreAllMocks();
  Logger.overrideLogger(false as any);
});

describe('what a member of staff reads on the page', () => {
  it('with nothing saved, the page says where each value comes from and shows no secret', async () => {
    const { whatsapp } = aService();
    const page = await whatsapp.ourNumberAsStaffReadIt();
    expect(page.fields.phoneNumberId).toEqual({ value: '111111111', from: 'server', saying: "The phone number ID comes from the server's settings. Anything you save here replaces it." });
    expect(page.fields.businessAccountId.saying).toBe('The business account ID is not set.');
    expect(page.secrets.accessToken).toEqual({ state: 'set', saying: "The access token is set in the server's settings. Anything you save here replaces it." });
    expect(page.webhook.saying).toBe('The webhook address to give Meta is https://api.groundwork.test/api/v1/webhooks/whatsapp.');
    expect(page.canSaveSecretsSaying).toBe('Secrets you type here are kept encrypted. Once saved, they are never shown again.');
    expect(page.switch.saying).toBe('WhatsApp is switched off. Nothing goes from this number until you switch it on in the System tab.');
    for (const s of ALL_SECRETS) expect(JSON.stringify(page)).not.toContain(s);
  });

  it('after saving, each secret reads "set" and nothing else; the stored row holds no secret in the clear', async () => {
    const { whatsapp, rows } = aService({});
    await whatsapp.ownNumber.save({ displayNumber: '+44 7700 900123', phoneNumberId: '222222222', businessAccountId: '333333333', ...SAVED }, 'staff-1');
    const page = await whatsapp.ourNumberAsStaffReadIt();
    expect(page.secrets.accessToken).toEqual({ state: 'set', saying: 'The access token is set. It was saved here and is kept encrypted.' });
    expect(page.secrets.appSecret.state).toBe('set');
    expect(page.secrets.verifyToken.state).toBe('set');
    expect(page.fields.displayNumber).toEqual({ value: '+44 7700 900123', from: 'here', saying: 'The WhatsApp number was saved here.' });
    expect(page.webhook.saying).toBe('The server setting PUBLIC_API_URL is not set, so the full webhook address cannot be shown. It ends in /api/v1/webhooks/whatsapp.');
    const stored = JSON.stringify(rows.get(OUR_NUMBER_KEY));
    for (const s of Object.values(SAVED)) {
      expect(stored).not.toContain(s);
      expect(JSON.stringify(page)).not.toContain(s);
    }
    expect(rows.get(OUR_NUMBER_KEY).accessToken).toMatch(/^v1:/);
  });

  it('a server with no encryption key refuses a secret, and says why without repeating it', async () => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    const { whatsapp, rows } = aService({});
    const page = await whatsapp.ourNumberAsStaffReadIt();
    expect(page.canSaveSecrets).toBe(false);
    expect(page.canSaveSecretsSaying).toBe('This server has no SETTINGS_ENCRYPTION_KEY, so secrets cannot be saved here yet. Ask whoever runs the hosting to add it, then come back.');
    const err: any = await whatsapp.ownNumber.save({ accessToken: SAVED.accessToken }, 'staff-1').catch((e) => e);
    expect(err.message).toBe('This server has no SETTINGS_ENCRYPTION_KEY, so the access token cannot be saved. Ask whoever runs the hosting to add it, then try again.');
    expect(rows.has(OUR_NUMBER_KEY)).toBe(false);
  });

  it('a secret pasted with a space is refused, and the refusal does not repeat it', async () => {
    const { whatsapp } = aService({});
    const err: any = await whatsapp.ownNumber.save({ appSecret: `${SAVED.appSecret} extra` }, 'staff-1').catch((e) => e);
    expect(err.message).toBe('The app secret has a space in it. Copy it again from Meta, all in one piece.');
  });

  it('when the encryption key changes, the page says so and asks for the secret again', async () => {
    const { whatsapp } = aService({});
    await whatsapp.ownNumber.save({ phoneNumberId: '222222222', accessToken: SAVED.accessToken }, 'staff-1');
    process.env.SETTINGS_ENCRYPTION_KEY = 'a-different-key';
    whatsapp.ownNumber.forget();
    const page = await whatsapp.ourNumberAsStaffReadIt();
    expect(page.secrets.accessToken).toEqual({ state: 'not set', saying: 'The access token was saved here, but this server cannot read it, because its encryption key has changed. Type the access token in again.' });
    expect((await whatsapp.ours()).enabled).toBe(false);
  });
});

describe('the sender and the webhook check use what was saved', () => {
  it('a message goes from the saved number ID with the saved token, not the server settings', async () => {
    const { whatsapp, rows } = aService();
    rows.set('whatsapp_enabled', true);
    await whatsapp.ownNumber.save({ phoneNumberId: '222222222', accessToken: SAVED.accessToken }, 'staff-1');
    const result = await whatsapp.sendMessage('+2348012345678', 'Hello', { kind: 'reply' });
    expect(result.sent).toBe(true);
    const post = fetched.find((f) => f.url.endsWith('/messages'))!;
    expect(post.url).toBe('http://127.0.0.1:9/graph/222222222/messages');
    expect(post.init.headers.Authorization).toBe(`Bearer ${SAVED.accessToken}`);
  });

  it('the webhook signature is checked against the saved app secret', async () => {
    const { whatsapp } = aService();
    await whatsapp.ownNumber.save({ appSecret: SAVED.appSecret }, 'staff-1');
    const raw = Buffer.from('{"entry":[]}');
    const sign = (secret: string) => 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
    await expect(whatsapp.verifySignature({ 'x-hub-signature-256': sign(SAVED.appSecret) }, raw)).resolves.toBeUndefined();
    await expect(whatsapp.verifySignature({ 'x-hub-signature-256': sign(SERVER['whatsapp.appSecret'] as string) }, raw)).rejects.toThrow();
  });

  it("Meta's subscribe handshake is answered with the saved verify token, and refused with the old one", async () => {
    const { whatsapp, config, prisma } = aService();
    await whatsapp.ownNumber.save({ verifyToken: SAVED.verifyToken }, 'staff-1');
    const c = new WhatsAppController(config, prisma, whatsapp, {} as any);
    const sent: any[] = [];
    const res: any = { status: () => res, type: () => res, send: (b: any) => { sent.push(b); return res; } };
    await c.verify('subscribe', SAVED.verifyToken, 'challenge-123', res);
    expect(sent).toEqual(['challenge-123']);
    await expect(c.verify('subscribe', SERVER['whatsapp.verifyToken'] as string, 'x', res)).rejects.toThrow('Webhook verification failed');
  });
});

describe('nothing saved means today\'s behaviour', () => {
  it('the server settings are used for the send, the signature and the switch', async () => {
    const { whatsapp, rows } = aService();
    rows.set('whatsapp_enabled', true);
    const ours = await whatsapp.ours();
    expect(ours).toEqual({
      accessToken: SERVER['whatsapp.accessToken'], phoneNumberId: '111111111', appSecret: SERVER['whatsapp.appSecret'],
      verifyToken: SERVER['whatsapp.verifyToken'], displayNumber: '+234 800 000 0000', enabled: true,
    });
    await whatsapp.sendMessage('+2348012345678', 'Hello', { kind: 'reply' });
    const post = fetched.find((f) => f.url.endsWith('/messages'))!;
    expect(post.url).toBe('http://127.0.0.1:9/graph/111111111/messages');
    expect(post.init.headers.Authorization).toBe(`Bearer ${SERVER['whatsapp.accessToken']}`);
  });

  it('with no server settings and nothing saved, WhatsApp stays off and nothing is posted', async () => {
    const { whatsapp, rows } = aService({});
    rows.set('whatsapp_enabled', true);
    expect(await whatsapp.isEnabled()).toBe(false);
    const result = await whatsapp.sendMessage('+2348012345678', 'Hello', { kind: 'reply' });
    expect(result).toEqual({ sent: false, error: 'WhatsApp is not configured on this deployment' });
    expect(fetched).toEqual([]);
    await expect(whatsapp.verifySignature({ 'x-hub-signature-256': 'sha256=00' }, Buffer.from('{}'))).rejects.toThrow('WhatsApp webhook signature cannot be verified');
  });
});

describe('the test message and the connection check', () => {
  it('the test message goes to the typed number and nobody else', async () => {
    const { whatsapp, sends } = aService();
    const r = await whatsapp.sendOurTest('+44 7700 900123');
    expect(r).toEqual({ sent: true, to: '+447700900123', saying: 'The test message went to +447700900123. Check that phone to see that it arrived.' });
    const posts = fetched.filter((f) => f.url.endsWith('/messages'));
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0].init.body)).toEqual({
      messaging_product: 'whatsapp', to: '447700900123', type: 'text',
      text: { body: "This is a test message from Groundwork. If you can read it, Groundwork's WhatsApp number is working." },
    });
    expect(sends.map((s) => [s.phone, s.kind])).toEqual([['+447700900123', 'admin-test']]);
  });

  it('a number without its country code is refused before anything goes', async () => {
    const { whatsapp } = aService();
    const err: any = await whatsapp.sendOurTest('0801 234 5678').catch((e) => e);
    expect(err.message).toBe('Type the whole number with its country code, for example +44 7700 900123.');
    expect(fetched).toEqual([]);
  });

  it('with no token and no number ID, nothing is sent and the page says what is missing', async () => {
    const { whatsapp } = aService({});
    expect(await whatsapp.sendOurTest('+447700900123')).toEqual({ sent: false, to: '+447700900123', saying: 'Nothing was sent to +447700900123. Save the phone number ID and the access token first.' });
    expect(await whatsapp.isOurNumberConnected()).toEqual({ connected: false, saying: 'Not connected. Groundwork needs both the phone number ID and the access token before it can reach Meta.' });
    expect(fetched).toEqual([]);
  });

  it('connected reads the number Meta has, with the token only in the header', async () => {
    const { whatsapp } = aService();
    expect(await whatsapp.isOurNumberConnected()).toEqual({ connected: true, saying: 'Connected. Meta has this number as +44 7700 900123, under the name Groundwork.' });
    expect(fetched[0].url).toBe('http://127.0.0.1:9/graph/111111111?fields=display_phone_number,verified_name');
    expect(fetched[0].url).not.toContain(SERVER['whatsapp.accessToken'] as string);
  });

  it('a token Meta refuses reads as not connected, in a sentence', async () => {
    const { whatsapp } = aService();
    global.fetch = jest.fn(async () => ({ ok: false, status: 401, text: async () => '{"error":{"type":"OAuthException","code":190}}' })) as any;
    expect(await whatsapp.isOurNumberConnected()).toEqual({ connected: false, saying: 'Not connected. Meta did not accept the saved access token and phone number ID together. Meta answered with error 401.' });
  });
});

describe('only Groundwork staff can open it, and no secret is ever served or logged', () => {
  let app: INestApplication;
  let base: string;
  let db: ReturnType<typeof aDatabase>;

  jest.setTimeout(20000);
  beforeEach(async () => {
    db = aDatabase();
    const whatsapp = new WhatsAppService({ get: (k: string) => SERVER[k] } as any, db.prisma);
    /* Not a thenable, and no lifecycle hooks: Nest awaits and calls both. */
    const anything = () => new Proxy({}, { get: (_t, k) => (k === 'then' || String(k).startsWith('on') || typeof k === 'symbol' ? undefined : jest.fn(async () => ({}))) });
    const mod = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: anything() },
        { provide: WhatsAppService, useValue: whatsapp },
        { provide: PricingService, useValue: anything() },
        { provide: StripeService, useValue: anything() },
        { provide: ApiAccessService, useValue: anything() },
        { provide: ThreeMonthsOnTheHouseService, useValue: anything() },
        OtpGuard,
      ],
    }).setLogger(captor).compile();
    app = mod.createNestApplication({ logger: captor });
    /* Who is asking: staff, or an admin of a customer organisation. */
    app.use((req: any, _res: any, next: any) => {
      const who = req.headers['x-test-who'];
      req.user = who === 'staff' ? { id: 'staff-1', isPlatformAdmin: true } : { id: 'org-admin-1', role: 'ADMIN', isPlatformAdmin: false };
      next();
    });
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterEach(async () => { await app.close(); });

  const call = (who: 'staff' | 'org-admin', method: string, path: string, body?: unknown) =>
    REAL_FETCH(`${base}${path}`, { method, headers: { 'content-type': 'application/json', 'x-test-who': who }, body: body === undefined ? undefined : JSON.stringify(body) });

  it('an organisation admin gets 403 on every back-office route, the new ones included', async () => {
    const proto = AdminController.prototype as any;
    const routes: [string, string][] = [];
    for (const name of Object.getOwnPropertyNames(proto)) {
      const path = Reflect.getMetadata(PATH_METADATA, proto[name]);
      const method = Reflect.getMetadata(METHOD_METADATA, proto[name]);
      if (path === undefined || method === undefined) continue;
      routes.push([RequestMethod[method], `/admin/${String(path).replace(/:\w+/g, 'x')}`]);
    }
    for (const r of [['GET', '/admin/whatsapp/settings'], ['PUT', '/admin/whatsapp/settings'], ['GET', '/admin/whatsapp/settings/connection'], ['POST', '/admin/whatsapp/settings/test']]) {
      expect(routes).toContainEqual(r);
    }
    for (const [method, path] of routes) {
      const res = await call('org-admin', method, path, method === 'GET' ? undefined : { to: '+447700900123', accessToken: SAVED.accessToken });
      expect([method, path, res.status]).toEqual([method, path, 403]);
    }
    expect(db.rows.has(OUR_NUMBER_KEY)).toBe(false);
    expect(fetched).toEqual([]);
  });

  it('staff save the secrets, and not one response or log line carries any of them', async () => {
    const bodies: string[] = [];
    const saved = await call('staff', 'PUT', '/admin/whatsapp/settings', { displayNumber: '+44 7700 900123', phoneNumberId: '222222222', ...SAVED });
    expect(saved.status).toBe(200);
    const page = await saved.json();
    bodies.push(JSON.stringify(page));
    expect(page.saved).toBe('Your changes are saved.');
    expect(page.secrets).toEqual({
      accessToken: { state: 'set', saying: 'The access token is set. It was saved here and is kept encrypted.' },
      appSecret: { state: 'set', saying: 'The app secret is set. It was saved here and is kept encrypted.' },
      verifyToken: { state: 'set', saying: 'The verify token is set. It was saved here and is kept encrypted.' },
    });
    for (const [m, p, b] of [
      ['GET', '/admin/whatsapp/settings'], ['GET', '/admin/whatsapp/settings/connection'],
      ['POST', '/admin/whatsapp/settings/test', { to: '+447700900123' }], ['GET', '/admin/whatsapp'],
      ['PUT', '/admin/whatsapp/settings', { appSecret: 'has a space ' + SAVED.appSecret }],
    ] as [string, string, unknown?][]) {
      const res = await call('staff', m, p, b);
      bodies.push(await res.text());
    }
    expect(bodies.join('\n')).toContain('Connected. Meta has this number as +44 7700 900123');
    expect(bodies.join('\n')).toContain('The app secret has a space in it.');
    expect(said.join('\n')).toContain("Groundwork's WhatsApp settings were changed by staff-1: displayNumber, phoneNumberId, accessToken, appSecret, verifyToken.");
    for (const s of ALL_SECRETS) {
      expect(bodies.join('\n')).not.toContain(s);
      expect(said.join('\n')).not.toContain(s);
      expect(JSON.stringify(db.rows.get(OUR_NUMBER_KEY))).not.toContain(s);
      expect(JSON.stringify(db.sends)).not.toContain(s);
    }
  });
});
