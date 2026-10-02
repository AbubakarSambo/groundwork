import { readFileSync } from 'fs';
import { join } from 'path';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { anInboundKey, whichNumberOf } from './one-number-per-conversation';
import { OUTSIDE_THE_WINDOW } from './a-message-outside-the-window';

/**
 * ONE NUMBER PER CONVERSATION (survey item 8).
 *
 * An organisation with its own WhatsApp number had replies sent from that number even when the
 * person had written to Groundwork's, so the answer came from a number they never wrote to. Its
 * people got two notices for sessions 2 onward, one from each number. And the 24-hour window was
 * measured per person, though WhatsApp measures it per business number.
 */
const OURS = '111111';
const THEIRS = '999999';
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function aService(opts: { ownNumber?: boolean; lastClaim?: { via: 'ours' | 'theirs'; at: Date } | null; personWroteAt?: Date | null } = {}) {
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: {
      findUnique: jest.fn(async () => (opts.ownNumber ? { id: 'conn-1', enabled: true, phoneNumberId: THEIRS, accessToken: 'their-test-token', approvedTemplates: [] } : null)),
      update: jest.fn(async () => ({})),
    },
    person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: opts.personWroteAt ?? null })), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    whatsAppInboundMessage: {
      findFirst: jest.fn(async (q: any) => {
        const c = opts.lastClaim;
        if (!c) return null;
        const wanted: string[] = q.where.messageId ? [q.where.messageId.startsWith] : q.where.OR.map((o: any) => o.messageId.startsWith);
        const key = anInboundKey(c.via, '+2348012345678', 'wamid.1');
        return wanted.some((w) => key.startsWith(w)) ? { messageId: key, handledAt: c.at } : null;
      }),
    },
    whatsAppSend: { create: jest.fn(async () => ({})) },
    notification: { create: jest.fn(async () => ({})) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'our-test-token', 'whatsapp.phoneNumberId': OURS, 'whatsapp.approvedTemplates': [] } as any)[k] };
  return { wa: new WhatsAppService(config, prisma), prisma };
}

const realFetch = (global as any).fetch;
let fetchSpy: jest.Mock;
beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200 })); (global as any).fetch = fetchSpy; });
afterEach(() => { (global as any).fetch = realFetch; });
const sentFrom = () => fetchSpy.mock.calls.map((c) => String(c[0]).split('/')[4]);

describe('a reply goes from the number the person wrote to', () => {
  it("a message to Groundwork's number is handed over as one to Groundwork's number", async () => {
    const whatsapp: any = { isEnabled: jest.fn(async () => true), verifySignature: jest.fn(), whichOrganisations: jest.fn(async () => [{ id: 'org-1', name: 'Baridi' }]), sendMessage: jest.fn() };
    const inbound: any = { handle: jest.fn(async () => undefined) };
    const c = new WhatsAppController({ get: () => undefined } as any, {} as any, whatsapp, inbound);
    await c.receive({ rawBody: Buffer.from('{}'), headers: {}, body: { entry: [{ changes: [{ value: { messages: [{ type: 'text', from: '2348012345678', text: { body: 'Hello' } }] } }] }] } } as any);
    expect(inbound.handle).toHaveBeenCalledWith('org-1', expect.anything(), 'ours');
  });

  it("the answer to it goes back on Groundwork's number, and the message is claimed with that number", async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'Sales team' }] });
    await h.service.handle('org-1', h.message('We closed Green Mart today.', '2348012345678', 'wamid.7'), 'ours');
    expect(h.sent.map((s) => s.via)).toEqual(['ours']);
    expect(h.prisma.whatsAppInboundMessage.create).toHaveBeenCalledWith({ data: { organizationId: 'org-1', messageId: 'ours:+2348012345678:wamid.7' } });
  });

  it("an organisation with its own number still answers on Groundwork's number when that is where the person wrote", async () => {
    const { wa } = aService({ ownNumber: true });
    await wa.sendOn('ours', 'org-1', '2348012345678', 'Thank you. What happens next?');
    expect(sentFrom()).toEqual([OURS]);
  });

  it('and on its own number when that is where the person wrote', async () => {
    const { wa } = aService({ ownNumber: true });
    await wa.sendOn('theirs', 'org-1', '2348012345678', 'Thank you. What happens next?');
    expect(sentFrom()).toEqual([THEIRS]);
  });

  it('the report after a session closes goes on the number the person last wrote to', async () => {
    const h = anInboundHarness({ completed: { overWhatsApp: null, scenario: 'PULSE_CHECK', label: 'Sales team' } });
    h.whatsapp.lastWroteTo.mockResolvedValue('ours');
    await h.service.onCheckInCompleted({ checkInId: 'ci-1', groundId: 'g-1', sessionNumber: 2 } as any);
    for (let i = 0; i < 5 && !h.sent.length; i++) await new Promise((r) => setImmediate(r));
    expect(h.sent[0]).toMatchObject({ via: 'ours', context: { kind: 'report' } });
  });
});

describe('the 24-hour window is per business number', () => {
  it("writing to Groundwork's number does not open the window on the organisation's own", async () => {
    const { wa, prisma } = aService({ ownNumber: true, lastClaim: { via: 'ours', at: new Date() }, personWroteAt: new Date() });
    const got = await wa.sendFor('org-1', '+2348012345678', 'Your check-in is open.', { checkInId: 'ci-1', kind: 'checkin-open' });
    expect(got).toEqual({ sent: false, error: OUTSIDE_THE_WINDOW });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(prisma.whatsAppSend.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: 'org-1', kind: 'checkin-open', error: OUTSIDE_THE_WINDOW }) });
  });

  it("writing to the organisation's own number opens it there", async () => {
    const { wa } = aService({ ownNumber: true, lastClaim: { via: 'theirs', at: new Date() } });
    const got = await wa.sendFor('org-1', '+2348012345678', 'Your check-in is open.', { checkInId: 'ci-1', kind: 'checkin-open' });
    expect(got.sent).toBe(true);
    expect(sentFrom()).toEqual([THEIRS]);
  });

  it('a claim says which number it was made on', () => {
    expect(whichNumberOf('ours:+2348012345678:wamid.1')).toBe('ours');
    expect(whichNumberOf('theirs:+2348012345678:wamid.1')).toBe('theirs');
    expect(whichNumberOf('wamid.1')).toBeNull();
  });
});

describe("an organisation with its own number gets its notices only from that number", () => {
  it("the session-ready sweep sends nothing on Groundwork's number for it: the one notice goes by sendFor, from their own number when they have one", () => {
    /* Changed with survey item 7: the sweep sends no WhatsApp at all now. */
    const cron = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.cron.ts'), 'utf8'));
    const at = cron.indexOf('const newlyOpen');
    expect(cron.slice(at, cron.indexOf('async sendWhatsAppReminders(', at))).not.toMatch(/this\.whatsapp\.send/);
    const listener = strip(readFileSync(join(__dirname, '..', 'webhooks', 'webhooks.listener.ts'), 'utf8'));
    expect(listener).not.toMatch(/this\.whatsapp\.sendMessage\(/);
  });
});
