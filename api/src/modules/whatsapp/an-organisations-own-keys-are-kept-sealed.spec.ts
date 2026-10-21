import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { isSealed, sealTheirKey, theirKey, THE_SERVER_HAS_NO_KEY, THEIR_KEYS_CANNOT_BE_OPENED, KEYS_NEED_TYPING_AGAIN } from './an-organisations-own-keys';

/**
 * THE KEYS OF AN ORGANISATION'S OWN WHATSAPP NUMBER ARE KEPT SEALED, AS EACH READER MEETS THEM (piece 5, A).
 *
 * Baridi Appliances' admin saves the number's access token and app secret on the Connections page. Read straight out of the database
 * they must not be readable; they come back only as the last four letters of the token; they open only for Baridi, in their own
 * place; and a message goes out with the token as typed and is checked with the secret as typed.
 */

const KEY = crypto.randomBytes(32).toString('base64');
const TOKEN = 'EAAG-baridi-access-token-0001a2b3';
const SECRET = 'baridi-app-secret-9f8e7d6c';

function setup(rows: any[] = []) {
  const prisma: any = {
    whatsAppConnection: {
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.organizationId === where.organizationId) ?? null),
      findMany: jest.fn(async () => rows),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const { id, ...mustStillBe } = where;
        const r = rows.find((x) => x.id === id);
        if (!r || Object.entries(mustStillBe).some(([k, v]) => r[k] !== v)) return { count: 0 };
        Object.assign(r, data);
        return { count: 1 };
      }),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const r = rows.find((x) => x.organizationId === where.organizationId);
        if (r) return Object.assign(r, update);
        const made = { id: `c-${rows.length + 1}`, approvedTemplates: [], enabled: true, connectedAt: new Date(), lastInboundAt: null, lastOutboundAt: null, webhookVerifiedAt: null, ...create };
        rows.push(made);
        return made;
      }),
    },
  };
  const config: any = { get: () => undefined };
  return { svc: new WhatsAppService(config, prisma), rows, prisma };
}

describe('saving the keys', () => {
  const was = process.env.SETTINGS_ENCRYPTION_KEY;
  beforeEach(() => { process.env.SETTINGS_ENCRYPTION_KEY = KEY; });
  afterEach(() => { if (was === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY; else process.env.SETTINGS_ENCRYPTION_KEY = was; });

  it('what is kept in the database is sealed, and what the admin reads back is only the last four letters', async () => {
    const { svc, rows } = setup();
    const read = await svc.connect('org-baridi', { businessAccountId: '204455667788', phoneNumberId: '109822345561', displayNumber: '+254 709 000 111', accessToken: TOKEN, appSecret: SECRET });
    expect(isSealed(rows[0].accessToken) && isSealed(rows[0].appSecret)).toBe(true);
    expect(JSON.stringify(rows[0])).not.toContain(TOKEN);
    expect(JSON.stringify(rows[0])).not.toContain(SECRET);
    expect(read).toMatchObject({ tokenEndsWith: TOKEN.slice(-4), phoneNumberId: '109822345561' });
    expect(JSON.stringify(read)).not.toContain(TOKEN);
    expect(JSON.stringify(read)).not.toContain(SECRET);
    expect(Object.keys(read!)).not.toContain('accessToken');
    expect(Object.keys(read!)).not.toContain('appSecret');
  });

  it('they open for Baridi, in their own place, and for nobody else', async () => {
    const { svc, rows } = setup();
    await svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: TOKEN, appSecret: SECRET });
    expect(theirKey(rows[0], 'accessToken')).toBe(TOKEN);
    expect(theirKey(rows[0], 'appSecret')).toBe(SECRET);
    /* Copied into another organisation's row, or into the other key's place: nothing opens. */
    expect(theirKey({ ...rows[0], organizationId: 'org-somebody-else' }, 'accessToken')).toBe('');
    expect(theirKey({ ...rows[0], accessToken: rows[0].appSecret }, 'accessToken')).toBe('');
    /* A key that changed: unreadable, which sends nothing with it rather than something wrong. */
    process.env.SETTINGS_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    expect(theirKey(rows[0], 'accessToken')).toBe('');
  });

  it('saving again without a new token keeps the sealed ones, and a new one is sealed again', async () => {
    const { svc, rows } = setup();
    await svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: TOKEN, appSecret: SECRET });
    const first = rows[0].accessToken;
    await svc.connect('org-baridi', { businessAccountId: '204455667788', phoneNumberId: '109822345562', displayNumber: '+254 709 000 222' });
    expect(rows[0].accessToken).toBe(first);
    await svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345562', accessToken: 'EAAG-a-new-token-77777777' });
    expect(theirKey(rows[0], 'accessToken')).toBe('EAAG-a-new-token-77777777');
    expect(theirKey(rows[0], 'appSecret')).toBe(SECRET);
  });

  it('on a server with no key nothing is saved, and the admin is told why in a sentence', async () => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    const { svc, rows, prisma } = setup();
    await expect(svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: TOKEN, appSecret: SECRET })).rejects.toThrow(new BadRequestException(THE_SERVER_HAS_NO_KEY));
    expect(rows).toEqual([]);
    expect(prisma.whatsAppConnection.upsert).not.toHaveBeenCalled();
    /* What the customer's admin reads is about us, and never names a setting. */
    expect(THE_SERVER_HAS_NO_KEY).toBe("We cannot save your number's keys safely yet. This is on our side, not yours. Contact Groundwork and we will put it right.");
    expect(THE_SERVER_HAS_NO_KEY).not.toMatch(/SETTINGS|ENCRYPTION/);
  });

  it('an organisation already connected can still save its display number with no key on the server, and its keys stay as they were; only a NEW secret needs the key', async () => {
    const { svc, rows } = setup();
    await svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: TOKEN, appSecret: SECRET });
    const sealedBefore = { a: rows[0].accessToken, b: rows[0].appSecret };
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    const read: any = await svc.connect('org-baridi', { businessAccountId: '204455667788', phoneNumberId: '109822345561', displayNumber: '+254 709 000 111' });
    expect(read.displayNumber).toBe('+254 709 000 111');
    expect({ a: rows[0].accessToken, b: rows[0].appSecret }).toEqual(sealedBefore);
    await expect(svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: 'a-new-token-1234' })).rejects.toThrow(new BadRequestException(THE_SERVER_HAS_NO_KEY));
    expect(rows[0].accessToken).toBe(sealedBefore.a);
  });
});

describe('using the keys', () => {
  const was = process.env.SETTINGS_ENCRYPTION_KEY;
  const realFetch = (global as any).fetch;
  beforeEach(() => { process.env.SETTINGS_ENCRYPTION_KEY = KEY; });
  afterEach(() => { (global as any).fetch = realFetch; if (was === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY; else process.env.SETTINGS_ENCRYPTION_KEY = was; });

  it('a test message goes out with the token as typed, from the organisation’s own number id', async () => {
    const { svc } = setup();
    await svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: TOKEN, appSecret: SECRET });
    const fetchSpy = jest.fn(async () => ({ ok: true, status: 200 }));
    (global as any).fetch = fetchSpy;
    (svc as any).tidyFor = async (_o: string, n: string) => n;
    await svc.sendTest('org-baridi', '+254711000111');
    const [url, init] = fetchSpy.mock.calls[0] as any;
    expect(url).toContain('/109822345561/messages');
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('a message from Meta is checked with the secret as typed: signed with it passes, signed with anything else is refused', async () => {
    const { svc, rows } = setup();
    await svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: TOKEN, appSecret: SECRET });
    const raw = Buffer.from('{"entry":[]}');
    const signed = (secret: string) => ({ 'x-hub-signature-256': `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}` });
    expect(() => svc.verifySignatureWith(theirKey(rows[0], 'appSecret'), signed(SECRET), raw)).not.toThrow();
    expect(() => svc.verifySignatureWith(theirKey(rows[0], 'appSecret'), signed('groundworks-own-secret'), raw)).toThrow('That message could not be checked as coming from WhatsApp, so it was not accepted.');
    /* The sealed text is not itself the secret: signing with it does not pass. */
    expect(() => svc.verifySignatureWith(theirKey(rows[0], 'appSecret'), signed(rows[0].appSecret), raw)).toThrow();
  });

  it('keys saved as typed before this still work, and are sealed when the server starts with a key', async () => {
    const rows = [{ id: 'c-1', organizationId: 'org-old', phoneNumberId: '100000000000009', accessToken: 'plain-token-1234', appSecret: 'plain-secret-5678', verifyToken: 'v', approvedTemplates: [], enabled: true }];
    const { svc } = setup(rows);
    expect(theirKey(rows[0], 'accessToken')).toBe('plain-token-1234');
    expect(await svc.sealWhatWasKeptPlain()).toBe(1);
    expect(isSealed(rows[0].accessToken) && isSealed(rows[0].appSecret)).toBe(true);
    expect(theirKey(rows[0], 'accessToken')).toBe('plain-token-1234');
    expect(theirKey(rows[0], 'appSecret')).toBe('plain-secret-5678');
    expect(await svc.sealWhatWasKeptPlain()).toBe(0);
    expect(sealTheirKey).toBeDefined();
  });
});

/*
 * WHEN THE KEYS CANNOT BE OPENED (the key on the server was changed or removed), NOTHING IS TRUSTED AND NOTHING IS SENT.
 * An HMAC made with an empty key is something anybody can make, so a secret that cannot be opened must never be used to check one.
 */
describe('keys that cannot be opened', () => {
  const was = process.env.SETTINGS_ENCRYPTION_KEY;
  const realFetch = (global as any).fetch;
  const OTHER_KEY = crypto.randomBytes(32).toString('base64');
  afterEach(() => { (global as any).fetch = realFetch; if (was === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY; else process.env.SETTINGS_ENCRYPTION_KEY = was; });

  async function sealedUnderKeyA() {
    process.env.SETTINGS_ENCRYPTION_KEY = KEY;
    const made = setup();
    await made.svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: TOKEN, appSecret: SECRET });
    /* Meta checked its webhook address, so this is the number in use (a-connection-that-works.ts): only then do its own keys decide. */
    made.rows[0].webhookVerifiedAt = new Date();
    return made;
  }
  const raw = Buffer.from('{"entry":[]}');
  const forged = { 'x-hub-signature-256': `sha256=${crypto.createHmac('sha256', '').update(raw).digest('hex')}` };

  for (const [name, change] of [
    ['opened under a different key', () => { process.env.SETTINGS_ENCRYPTION_KEY = OTHER_KEY; }],
    ['opened with no key at all', () => { delete process.env.SETTINGS_ENCRYPTION_KEY; }],
  ] as const) {
    it(`a message signed with an empty key is refused at the organisation's address when its secret was sealed and is ${name}`, async () => {
      const { svc, rows, prisma } = await sealedUnderKeyA();
      change();
      expect(theirKey(rows[0], 'appSecret')).toBe('');
      const { WhatsAppForAnOrganisationController } = await import('../public-api/whatsapp-for-an-organisation.controller');
      const c = new (WhatsAppForAnOrganisationController as any)(prisma, svc, { handle: jest.fn() }, { get: () => undefined });
      await expect(c.receive('org-baridi', { headers: forged, rawBody: raw, body: {} })).rejects.toThrow('That message could not be checked as coming from WhatsApp, so it was not accepted.');
      expect(() => svc.verifySignatureWith('', forged, raw)).toThrow('That message could not be checked as coming from WhatsApp, so it was not accepted.');
    });

    it(`nothing is sent with a token that is ${name}, and why is kept`, async () => {
      const { svc, rows } = await sealedUnderKeyA();
      change();
      const fetchSpy = jest.fn(async () => ({ ok: true, status: 200 }));
      (global as any).fetch = fetchSpy;
      (svc as any).tidyFor = async (_o: string, n: string) => n;
      const kept: any[] = [];
      (svc as any).writeItDown = async (_o: string, _to: string, result: any) => { kept.push(result); };
      (svc as any).heldFor = async () => null;
      const result = await svc.sendFor('org-baridi', '+254711000111', 'Hello', { kind: 'reply' } as any);
      expect(result.sent).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(kept[0].error).toBe(THEIR_KEYS_CANNOT_BE_OPENED);
      await expect(svc.sendTest('org-baridi', '+254711000111')).rejects.toThrow(KEYS_NEED_TYPING_AGAIN);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(rows[0].accessToken).toMatch(/^v1:/);
    });
  }
});

describe('telling somebody when keys cannot be opened', () => {
  const was = process.env.SETTINGS_ENCRYPTION_KEY;
  afterEach(() => { if (was === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY; else process.env.SETTINGS_ENCRYPTION_KEY = was; });

  it('the start-up count names the organisations, never a key; their admin reads a plain sentence; an organisation whose keys open reads nothing of it', async () => {
    process.env.SETTINGS_ENCRYPTION_KEY = KEY;
    const { svc, rows } = setup();
    await svc.connect('org-baridi', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345561', accessToken: TOKEN, appSecret: SECRET });
    await svc.connect('org-fine', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345562', accessToken: TOKEN, appSecret: SECRET });
    process.env.SETTINGS_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    /* Fine's keys were re-typed under the new key. */
    await svc.connect('org-fine', { businessAccountId: '204455667788', displayNumber: '+254 709 000 111', phoneNumberId: '109822345562', accessToken: TOKEN, appSecret: SECRET });
    const logged: string[] = [];
    (svc as any).logger = { log: () => undefined, warn: () => undefined, error: (m: string) => logged.push(m) };
    await svc.sealWhatWasKeptPlain();
    expect(logged).toHaveLength(1);
    expect(logged[0]).toContain('org-baridi');
    expect(logged[0]).not.toContain('org-fine');
    expect(logged[0]).not.toMatch(/v1:|EAAG|baridi-app-secret|SETTINGS_ENCRYPTION_KEY/);
    const baridi: any = await svc.connectionFor('org-baridi');
    expect(baridi.keysNeedTypingAgain).toBe(true);
    expect(baridi.keysNeedTypingAgainSays).toBe("Your number's keys need to be typed in again. Nothing is sent from your number until they are.");
    const fine: any = await svc.connectionFor('org-fine');
    expect(fine.keysNeedTypingAgain).toBe(false);
    expect(fine.keysNeedTypingAgainSays).toBeUndefined();
    expect(JSON.stringify([baridi, fine])).not.toMatch(/v1:|EAAG|baridi-app-secret/);
    expect(rows.length).toBe(2);
  });

  it('sealing what was kept plain leaves alone a key typed in since it was read', async () => {
    process.env.SETTINGS_ENCRYPTION_KEY = KEY;
    const rows = [{ id: 'c-1', organizationId: 'org-old', phoneNumberId: '100000000000009', accessToken: 'plain-token-1234', appSecret: 'plain-secret-5678', verifyToken: 'v', approvedTemplates: [], enabled: true }];
    const { svc, prisma } = setup(rows);
    /* Between the read and the write, the admin types a new token, sealed. */
    const read = prisma.whatsAppConnection.findMany;
    prisma.whatsAppConnection.findMany = jest.fn(async (a: any) => {
      const copy = rows.map((r) => ({ ...r }));
      rows[0].accessToken = sealTheirKey('org-old', 'accessToken', 'typed-after-the-read');
      return copy;
    });
    await svc.sealWhatWasKeptPlain();
    expect(theirKey(rows[0], 'accessToken')).toBe('typed-after-the-read');
    expect(theirKey(rows[0], 'appSecret')).toBe('plain-secret-5678');
    expect(isSealed(rows[0].appSecret)).toBe(true);
    expect(read).toBeDefined();
  });
});
