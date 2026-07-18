import * as crypto from 'crypto';
import { DeliveryService } from './delivery.service';

/**
 * GW-DELIVERY tripwires.
 *
 * The Resend webhook is the only writer of delivery state, so it must:
 *  - FAIL CLOSED on signature problems: no secret, missing headers, stale
 *    timestamp, wrong signature -> 401, nothing processed (both directions
 *    tested: a validly-signed request passes),
 *  - apply events IDEMPOTENTLY: the same event twice ends in the same state
 *    with no duplicate rows (upsert-by-resendId semantics),
 *  - mirror onto the participant ONLY for the LATEST invite-kind send (an
 *    old invite's late bounce must not override a newer resend),
 *  - reset the mirror to SENT when a fresh invite goes out (fix-and-resend).
 */

const SECRET_BYTES = crypto.randomBytes(24);
const SECRET = 'whsec_' + SECRET_BYTES.toString('base64');

function sign(body: string, opts: { id?: string; ts?: number; secretBytes?: Buffer } = {}) {
  const id = opts.id ?? 'msg_test_1';
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const sig = crypto
    .createHmac('sha256', opts.secretBytes ?? SECRET_BYTES)
    .update(`${id}.${ts}.${body}`)
    .digest('base64');
  return { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}` };
}

function makeService(opts: { secret?: string | null; deliveries?: Record<string, any> } = {}) {
  const rows: Record<string, any> = { ...(opts.deliveries ?? {}) };
  const created: any[] = [];
  const participantUpdates: any[] = [];
  const prisma: any = {
    emailDelivery: {
      create: jest.fn(async ({ data }: any) => {
        created.push(data);
        rows[data.resendId] = { id: `row-${data.resendId}`, ...data };
        return rows[data.resendId];
      }),
      findUnique: jest.fn(async ({ where }: any) => rows[where.resendId] ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        rows[where.resendId] = { ...rows[where.resendId], ...data };
        return rows[where.resendId];
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        const candidates = Object.values(rows)
          .filter((r: any) => r.participantId === where.participantId)
          .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));
        return candidates[0] ?? null;
      }),
    },
    groundParticipant: {
      update: jest.fn(async (args: any) => {
        participantUpdates.push(args);
        return {};
      }),
    },
  };
  const config: any = { get: (k: string) => (k === 'RESEND_WEBHOOK_SECRET' ? (opts.secret === undefined ? SECRET : opts.secret) : undefined) };
  const service = new DeliveryService(prisma, config);
  return { service, prisma, created, participantUpdates, rows };
}

const BODY = JSON.stringify({ type: 'email.bounced', data: { email_id: 're_abc', to: 'x@y.test' } });

describe('signature verification fails closed (and passes valid requests)', () => {
  it('accepts a validly-signed request', () => {
    const { service } = makeService();
    expect(() => service.verifySignature(sign(BODY), BODY)).not.toThrow();
  });

  it('rejects when no secret is configured (fail closed)', () => {
    const { service } = makeService({ secret: null });
    expect(() => service.verifySignature(sign(BODY), BODY)).toThrow('webhook secret not configured');
  });

  it('rejects missing svix headers', () => {
    const { service } = makeService();
    expect(() => service.verifySignature({}, BODY)).toThrow('missing svix headers');
  });

  it('rejects a stale timestamp', () => {
    const { service } = makeService();
    const stale = sign(BODY, { ts: Math.floor(Date.now() / 1000) - 3600 });
    expect(() => service.verifySignature(stale, BODY)).toThrow('timestamp outside tolerance');
  });

  it('rejects a wrong signature (different secret)', () => {
    const { service } = makeService();
    const forged = sign(BODY, { secretBytes: crypto.randomBytes(24) });
    expect(() => service.verifySignature(forged, BODY)).toThrow('signature mismatch');
  });

  it('rejects a tampered body', () => {
    const { service } = makeService();
    const headers = sign(BODY);
    expect(() => service.verifySignature(headers, BODY + 'x')).toThrow('signature mismatch');
  });
});

describe('event application', () => {
  const draftRow = (over: Record<string, any> = {}) => ({
    id: 'row-1', resendId: 're_abc', email: 'nia@x.test', kind: 'PARTICIPANT_INVITE',
    participantId: 'p1', groundId: 'g1', status: 'SENT', createdAt: new Date('2026-07-18T10:00:00Z'), ...over,
  });

  it('a bounce updates the row and mirrors onto the participant', async () => {
    const { service, prisma, participantUpdates } = makeService({ deliveries: { re_abc: draftRow() } });
    await service.applyEvent({ type: 'email.bounced', data: { email_id: 're_abc', bounce: { message: 'mailbox full' } } });
    expect(prisma.emailDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { resendId: 're_abc' },
      data: expect.objectContaining({ status: 'BOUNCED', detail: 'mailbox full' }),
    }));
    expect(participantUpdates).toEqual([
      expect.objectContaining({ where: { id: 'p1' }, data: { inviteDeliveryStatus: 'BOUNCED' } }),
    ]);
  });

  it('IDEMPOTENT replay: the same event twice ends in the same state, no new rows', async () => {
    const { service, prisma, created, rows } = makeService({ deliveries: { re_abc: draftRow() } });
    await service.applyEvent({ type: 'email.bounced', data: { email_id: 're_abc' } });
    await service.applyEvent({ type: 'email.bounced', data: { email_id: 're_abc' } });
    expect(created).toHaveLength(0); // never creates on events
    expect(Object.keys(rows)).toHaveLength(1);
    expect(rows['re_abc'].status).toBe('BOUNCED');
    expect(prisma.emailDelivery.update).toHaveBeenCalledTimes(2); // second update is a no-op state-wise
  });

  it("an OLD invite's late bounce does not override a newer resend's state", async () => {
    const { service, participantUpdates } = makeService({
      deliveries: {
        re_old: draftRow({ id: 'row-old', resendId: 're_old', createdAt: new Date('2026-07-18T09:00:00Z') }),
        re_new: draftRow({ id: 'row-new', resendId: 're_new', createdAt: new Date('2026-07-18T11:00:00Z') }),
      },
    });
    await service.applyEvent({ type: 'email.bounced', data: { email_id: 're_old' } });
    expect(participantUpdates).toHaveLength(0); // re_old is not the latest -> no mirror write
  });

  it('unknown event types and unknown ids are acknowledged and ignored', async () => {
    const { service, prisma } = makeService();
    await expect(service.applyEvent({ type: 'email.opened', data: { email_id: 're_abc' } })).resolves.toEqual({ ok: true });
    await expect(service.applyEvent({ type: 'email.bounced', data: { email_id: 're_missing' } })).resolves.toEqual({ ok: true });
    expect(prisma.emailDelivery.update).not.toHaveBeenCalled();
  });

  it('recordSend resets the participant mirror to SENT (the fix-and-resend contract)', async () => {
    const { service, participantUpdates } = makeService();
    await service.recordSend('re_fresh', 'fixed@x.test', { kind: 'PARTICIPANT_INVITE', participantId: 'p1', groundId: 'g1' });
    expect(participantUpdates).toEqual([
      expect.objectContaining({ where: { id: 'p1' }, data: { inviteDeliveryStatus: 'SENT' } }),
    ]);
  });
});
