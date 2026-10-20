import { readFileSync } from 'fs';
import { join } from 'path';
import { WhatsAppService, READ_RECEIPT_DEADLINE_MS } from './whatsapp.service';

/**
 * THE TICKS TURN BLUE WHILE THE ANSWER IS WRITTEN.
 *
 * An opener is composed by the model and can take ten seconds. Until this, the person who just
 * wrote saw nothing at all for that whole time - no ticks, nobody there - which reads as a dead
 * number and is answered by writing again. Meta marks the message read and raises "typing…" from
 * one request, and drops the indicator when the reply goes or after 25 seconds.
 *
 * What matters here is not that the call can be made. It is WHERE it is made from: after the
 * guards that drop a redelivery or a double tap, so nothing is acknowledged that is not answered,
 * and on the number the message actually arrived on.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const inbound = strip(readFileSync(join(__dirname, '../public-api/whatsapp-for-an-organisation.service.ts'), 'utf8'));

const ourNumber = { phoneNumberId: '1350992858108481', accessToken: 'ours-token', configured: true };

function aService(fetchImpl: jest.Mock, connection: any = null) {
  const config = { get: () => undefined } as any;
  const prisma = { whatsAppConnection: { findUnique: jest.fn().mockResolvedValue(connection) } } as any;
  const service = new WhatsAppService(config, prisma);
  (service as any).ownNumber = { inUse: async () => ourNumber };
  (global as any).fetch = fetchImpl;
  return service;
}

const ok = () => jest.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });

describe('the read receipt and the typing indicator', () => {
  afterEach(() => jest.restoreAllMocks());

  it('marks the message read and raises the indicator in ONE request, on our number', async () => {
    const fetchMock = ok();
    await aService(fetchMock).weAreReadingThis('wamid.ABC', null, 'ours');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v20.0/1350992858108481/messages');
    expect(init.headers.Authorization).toBe('Bearer ours-token');
    expect(JSON.parse(init.body)).toEqual({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: 'wamid.ABC',
      typing_indicator: { type: 'text' },
    });
    /* A courtesy on the way to the real answer: it never outlasts the answer it covers. */
    expect(init.signal).toBeDefined();
    expect(READ_RECEIPT_DEADLINE_MS).toBeLessThanOrEqual(25_000);
  });

  it("uses the organisation's own number when that is where the message arrived", async () => {
    const fetchMock = ok();
    const connection = { organizationId: 'org-1', enabled: true, phoneNumberId: '222222222', accessToken: 'their-token', appSecret: 's', verifyToken: 'v', webhookVerifiedAt: new Date('2026-10-01') };
    await aService(fetchMock, connection).weAreReadingThis('wamid.DEF', 'org-1', 'theirs');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/222222222/messages');
    expect(init.headers.Authorization).toBe('Bearer their-token');
  });

  it('sends nothing when that organisation has no number of its own turned on', async () => {
    const fetchMock = ok();
    await aService(fetchMock, { organizationId: 'org-1', enabled: false, phoneNumberId: 'x', accessToken: 'y', appSecret: 's' })
      .weAreReadingThis('wamid.GHI', 'org-1', 'theirs');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws, whatever Meta does - a receipt is not worth a check-in', async () => {
    const refused = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => '{"error":{"code":100}}' });
    await expect(aService(refused).weAreReadingThis('wamid.JKL', null, 'ours')).resolves.toBeUndefined();

    const broken = jest.fn().mockRejectedValue(new Error('socket hang up'));
    await expect(aService(broken).weAreReadingThis('wamid.MNO', null, 'ours')).resolves.toBeUndefined();
  });

  it('is not called at all without a message id', async () => {
    const fetchMock = ok();
    await aService(fetchMock).weAreReadingThis('', null, 'ours');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('where it is called from', () => {
  it('comes after the redelivery and double-tap guards, so nothing is acknowledged that is not answered', () => {
    const redelivery = inbound.indexOf('firstTimeWeSeeThis');
    const doubleTap = inbound.indexOf('notTheSameWordsJustNow');
    const receipt = inbound.indexOf('weAreReadingThis');
    const theWork = inbound.indexOf('await this.route(');

    expect(receipt).toBeGreaterThan(-1);
    expect(receipt).toBeGreaterThan(redelivery);
    expect(receipt).toBeGreaterThan(doubleTap);
    /* And before the model is asked, which is the wait it exists to cover. */
    expect(receipt).toBeLessThan(theWork);
  });

  it('passes the number the message arrived on, rather than assuming ours', () => {
    expect(inbound).toContain('weAreReadingThis(String(message.id), organizationId, via)');
  });
});
