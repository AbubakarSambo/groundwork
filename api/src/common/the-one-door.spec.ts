import * as fs from 'fs';
import * as path from 'path';
import { WhatsAppService } from '../modules/whatsapp/whatsapp.service';

/**
 * NOTHING CAN SEND AROUND THE OUTBOX (Hafsah, 29 October 2026; two-week check). On Monday 25 January Wanjiru's morning summary went
 * to her phone three times, with no claim in the one outbox: a path reached WhatsApp without asking it. Now there is one door to
 * WhatsApp (WhatsAppService.toMeta) and one to the mail service (EmailService.deliverNow), and each claims the message's key before
 * anything goes. These tests fail when any other code reaches either, and send Wanjiru's summary by three paths at once.
 */
const SRC = path.join(__dirname, '..');
const code = (f: string) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const everyFile = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__fixtures__') walk(f); }
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(f);
    }
  };
  walk(SRC);
  return out;
};
/** The body of one method, from its name to the next method at the same depth. */
const theMethod = (src: string, name: string): string => {
  const at = src.search(new RegExp(`\\n  (?:private |public )?(?:async )?${name}\\(`));
  if (at < 0) return '';
  const next = src.slice(at + 1).search(/\n  (?:private |public |static |async |get |set )?[a-zA-Z]+\(/);
  return src.slice(at, next < 0 ? undefined : at + 1 + next);
};

describe('one door to WhatsApp and one to the mail service', () => {
  const WA = path.join(SRC, 'modules/whatsapp/whatsapp.service.ts');
  const MAIL = path.join(SRC, 'modules/email/email.service.ts');
  /* Reads mail that ARRIVED (the body and attachments of a forward) from the provider's receiving API. It cannot send anything, so it is not a second door out. */
  const RECEIVING = path.join(SRC, 'modules/email/inbound-mail-client.ts');

  it('nothing but the WhatsApp service reaches Meta, and nothing but the mail service reaches a mail provider', () => {
    const offenders: string[] = [];
    for (const f of everyFile()) {
      const c = code(f);
      if (f !== WA && /graph\.facebook\.com|graphBase\(|\/messages`|whatsapp\.graphBaseUrl/.test(c) && !f.endsWith(path.join('config', 'configuration.ts'))) offenders.push(path.relative(SRC, f));
      if (f !== MAIL && f !== RECEIVING && /from ['"](?:resend|nodemailer)['"]|require\(['"](?:resend|nodemailer)['"]\)|api\.resend\.com|\.emails\.send\(|sendMail\(/.test(c)) offenders.push(path.relative(SRC, f));
    }
    expect(offenders).toEqual([]);
  });

  it('inside the WhatsApp service, a message reaches Meta only through toMeta, and toMeta claims the key before it posts', () => {
    const c = code(WA);
    expect(c.match(/\/messages`/g) ?? []).toHaveLength(1);
    const door = theMethod(c, 'toMeta');
    expect(door).toMatch(/\/messages`/);
    expect(door.indexOf('mayItGo(')).toBeGreaterThan(-1);
    expect(door.indexOf('mayItGo(')).toBeLessThan(door.indexOf('fetch('));
    /* Every other call to fetch is a read: the number's own details, or a file somebody sent. */
    const others = c.replace(door, '').match(/fetch\([^)]*\)/g) ?? [];
    for (const f of others) expect(f).not.toMatch(/\/messages/);
    expect(c.replace(door, '')).not.toMatch(/method:\s*'POST'/);
  });

  it('inside the mail service, a mail reaches the provider only through deliverNow, which claims the key first', () => {
    const c = code(MAIL);
    const door = theMethod(c, 'throughTheDoor');
    expect(door).toMatch(/\.emails\.send\(/);
    expect(door).toMatch(/sendMail\(/);
    expect(c.replace(door, '')).not.toMatch(/\.emails\.send\(|sendMail\(/);
    expect(c.match(/this\.throughTheDoor\(/g) ?? []).toHaveLength(1);
    const deliver = theMethod(c, 'deliverNow');
    expect(deliver).toMatch(/this\.throughTheDoor\(/);
    expect(deliver.indexOf('mayItGo(')).toBeGreaterThan(-1);
    expect(deliver.indexOf('mayItGo(')).toBeLessThan(deliver.indexOf('this.throughTheDoor('));
  });
});

describe("Wanjiru's morning summary goes once, whichever way it is sent", () => {
  const WANJIRU = '+254711000111';
  const SUMMARY = 'Good morning, Wanjiru. Target: KES 720,000 collected in January. Needs you today: Brian is waiting on you for guidance on Nyota Logistics.';

  function aWorld() {
    const claims = new Map<string, { key: string; createdAt: Date }>();
    const sends: any[] = [];
    const fetchSpy = jest.fn(async (_url: string, _init: any) => { await new Promise((r) => setTimeout(r, 5)); return { ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' }; });
    (global as any).fetch = fetchSpy;
    const table = (more: Record<string, any> = {}) => ({
      findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }: any) => data), update: jest.fn(async ({ data }: any) => data), updateMany: jest.fn(async () => ({ count: 0 })),
      deleteMany: jest.fn(async () => ({ count: 0 })), count: jest.fn(async () => 0), ...more,
    });
    const known: Record<string, any> = {
      platformSetting: table({ findUnique: jest.fn(async () => ({ value: true })) }),
      person: table({ findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date(Date.now() - 60_000) })) }),
      whatsAppInboundMessage: table({ findFirst: jest.fn(async () => ({ messageId: 'in-1', handledAt: new Date(Date.now() - 60_000) })) }),
      whatsAppSend: table({ create: jest.fn(async ({ data }: any) => { sends.push(data); return data; }) }),
      organization: table({ findUnique: jest.fn(async () => ({ whatsappAddOnOn: true, name: 'Muchemi & Co' })) }),
      outboxClaim: table({
        create: jest.fn(async ({ data }: any) => {
          if (claims.has(data.key)) { const e: any = new Error('Unique constraint failed'); e.code = 'P2002'; throw e; }
          claims.set(data.key, { key: data.key, createdAt: new Date() });
          return data;
        }),
        findUnique: jest.fn(async ({ where }: any) => claims.get(where.key) ?? null),
        deleteMany: jest.fn(async ({ where }: any) => { claims.delete(where.key); return { count: 1 }; }),
      }),
    };
    const prisma: any = new Proxy(known, { get: (t, k: string) => (k in t ? t[k] : (t[k] = table())) });
    const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': [] } as any)[k] };
    const wa = new WhatsAppService(config, prisma);
    const posted = () => fetchSpy.mock.calls.filter((c: any[]) => /\/messages$/.test(String(c[0]))).map((c: any[]) => JSON.parse(c[1].body));
    return { wa, posted, claims, sends };
  }

  it('sent as a reply, as a held message released in the morning, and on the number she wrote to, all at once: it goes once', async () => {
    const x = aWorld();
    const context = { kind: 'lead-summary' };
    await Promise.all([
      x.wa.sendMessage(WANJIRU, SUMMARY, context),
      x.wa.sendHeldForTheNight({ organizationId: null, phone: WANJIRU, text: SUMMARY, context }),
      x.wa.sendOn('ours', 'org-muchemi', WANJIRU, SUMMARY, context),
    ]);
    const summaries = x.posted().filter((b) => (b.text?.body ?? '').includes('Good morning, Wanjiru'));
    expect(summaries).toHaveLength(1);
    expect([...x.claims.keys()].filter((k) => k.includes('lead-summary'))).toHaveLength(1);
  });

  it('a summary Meta refused gives its key back, so it can be sent again', async () => {
    const x = aWorld();
    (global as any).fetch = jest.fn(async () => ({ ok: false, status: 500, text: async () => '{"error":{"code":131000}}' }));
    const first = await x.wa.sendMessage(WANJIRU, SUMMARY, { kind: 'lead-summary' });
    expect(first.sent).toBe(false);
    expect(x.claims.size).toBe(0);
    (global as any).fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{}' }));
    const second = await x.wa.sendMessage(WANJIRU, SUMMARY, { kind: 'lead-summary' });
    expect(second.sent).toBe(true);
  });
});
