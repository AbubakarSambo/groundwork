import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ConnectionsAtAGlanceController } from './connections-at-a-glance.controller';
import { ConnectionsAtAGlanceService } from './connections-at-a-glance.service';
import { WhatsAppForAnOrganisationController } from './whatsapp-for-an-organisation.controller';
import { CredentialsController } from './credentials.controller';
import { ImportsController } from './imports.controller';
import { EmbedSetupController } from '../embed/embed-setup.controller';
import { WebhooksController } from '../webhooks/webhooks.controller';
import { WorkspaceNotifierController } from '../workspace/workspace-notifier.controller';
import { RetentionController } from '../people/retention.controller';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

/**
 * CONNECTIONS, AS EACH PERSON IS SERVED THEM (F1, U.18).
 *
 * Baridi Appliances. Grace is an admin; Wairimu a lead; Miriam a member; Tomas a guest.
 *
 * The rules under test, read from what the server hands each reader:
 *   - only an admin reaches anything under Connections: the counts, WhatsApp, keys, imports, where
 *     we tell you, Slack or Teams, the panel inside your own tool, and how long words are kept. A
 *     lead, a member and a guest are refused by the server, whatever the screen shows;
 *   - the counts are counts: no phone number, no name, nothing anybody said, and only this
 *     organisation's rows are asked for;
 *   - step 3 of connecting WhatsApp is proven only by Meta's handshake with the right token, or by a
 *     message arriving through the address.
 */

const CONTROLLERS: [string, any][] = [
  ['the counts on the Connections page', ConnectionsAtAGlanceController],
  ['keys and API access', CredentialsController],
  ['what imports could not take', ImportsController],
  ['the panel inside your own tool', EmbedSetupController],
  ['where we tell you', WebhooksController],
  ['notices in Slack or Teams', WorkspaceNotifierController],
  ['how long a departed person’s words are kept', RetentionController],
];

/* The WhatsApp controller has a Meta half (public, checked by Meta's own signature) and an admin half. */
const WHATSAPP_ADMIN = ['connection', 'connect', 'templates', 'setEnabled', 'test', 'disconnect'];

function contextFor(klass: any, handler: string, role: string) {
  return {
    getHandler: () => klass.prototype[handler],
    getClass: () => klass,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: `u-${role}`, organizationId: 'org-baridi', role } }) }),
  } as any;
}

function handlersOf(klass: any): string[] {
  return Object.getOwnPropertyNames(klass.prototype).filter((n) => n !== 'constructor' && typeof klass.prototype[n] === 'function');
}

describe('only an admin reaches Connections', () => {
  const guard = new RolesGuard(new Reflector());

  for (const [what, klass] of CONTROLLERS) {
    const handlers = handlersOf(klass).filter((h) => Reflect.getMetadata('path', klass.prototype[h]) !== undefined);
    it(`Grace, an admin, reaches ${what}`, () => {
      expect(handlers.length).toBeGreaterThan(0);
      for (const h of handlers) expect(guard.canActivate(contextFor(klass, h, 'ADMIN'))).toBe(true);
    });
    for (const [who, role] of [['Wairimu, a lead', 'LEAD'], ['Miriam, a member', 'MEMBER'], ['Tomas, a guest', 'GUEST']]) {
      it(`${who} is refused ${what}, by the server`, () => {
        for (const h of handlers) expect(() => guard.canActivate(contextFor(klass, h, role))).toThrow(ForbiddenException);
      });
    }
  }

  it('Grace, an admin, reaches every admin part of WhatsApp', () => {
    for (const h of WHATSAPP_ADMIN) expect(guard.canActivate(contextFor(WhatsAppForAnOrganisationController, h, 'ADMIN'))).toBe(true);
  });
  for (const [who, role] of [['Wairimu, a lead', 'LEAD'], ['Miriam, a member', 'MEMBER'], ['Tomas, a guest', 'GUEST']]) {
    it(`${who} is refused every admin part of WhatsApp, by the server`, () => {
      for (const h of WHATSAPP_ADMIN) expect(() => guard.canActivate(contextFor(WhatsAppForAnOrganisationController, h, role))).toThrow(ForbiddenException);
    });
  }
});

describe('the counts on the Connections page', () => {
  const NOW = new Date('2026-09-27T10:00:00Z');

  function setup(opts: { own?: boolean; metric?: boolean } = {}) {
    const asked: any[] = [];
    const prisma: any = {
      whatsAppConnection: { findUnique: jest.fn(async (q: any) => { asked.push(q.where); return opts.own === false ? null : { id: 'wa-1' }; }) },
      whatsAppThread: { findMany: jest.fn(async (q: any) => { asked.push(q.where); return ['+254700000001', '+254700000002', '+254700000003', '+254700000004', '+254700000005', '+254700000006'].map((phone) => ({ phone })); }) },
      whatsAppSend: {
        findMany: jest.fn(async (q: any) => { asked.push(q.where); return [{ checkInId: 'c-1' }, { checkInId: 'c-2' }]; }),
        count: jest.fn(async (q: any) => { asked.push(q.where); return 0; }),
      },
      productMetric: { findFirst: jest.fn(async (q: any) => { asked.push(q.where); return opts.metric ? { id: 'm-1' } : null; }) },
    };
    return { svc: new ConnectionsAtAGlanceService(prisma), prisma, asked };
  }

  it('gives Grace three counts for her own WhatsApp number, and nothing else about anybody', async () => {
    const { svc } = setup({ metric: true });
    const got = await svc.read('org-baridi', NOW);
    expect(got).toEqual({ whatsapp: { people: 6, checkInsThisMonth: 2, failedThisWeek: 0 }, figures: { fromYourProduct: true } });
    const text = JSON.stringify(got);
    expect(text).not.toMatch(/\+?\d{7,}|phone|name|said|text/i);
  });

  it('asks only for this organisation’s rows', async () => {
    const { svc, asked } = setup();
    await svc.read('org-baridi', NOW);
    expect(asked.length).toBe(5);
    for (const where of asked) expect(where.organizationId).toBe('org-baridi');
  });

  it('counts check-ins from the first of the month, and failures from the last seven days', async () => {
    const { svc, prisma } = setup();
    await svc.read('org-baridi', NOW);
    const monthly = prisma.whatsAppSend.findMany.mock.calls[0][0];
    expect(monthly.where.sentAt.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(monthly.where.sentAt.lt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(monthly.distinct).toEqual(['checkInId']);
    const weekly = prisma.whatsAppSend.count.mock.calls[0][0];
    expect(NOW.getTime() - weekly.where.failedAt.gte.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('has no WhatsApp counts while the organisation has no number of its own', async () => {
    const { svc, prisma } = setup({ own: false });
    const got = await svc.read('org-baridi', NOW);
    expect(got.whatsapp).toBeNull();
    expect(got.figures.fromYourProduct).toBe(false);
    expect(prisma.whatsAppThread.findMany).not.toHaveBeenCalled();
    expect(prisma.whatsAppSend.count).not.toHaveBeenCalled();
  });
});

describe('step 3 of connecting WhatsApp: the address is proven', () => {
  function controller(own: any) {
    const prisma: any = {
      whatsAppConnection: {
        findUnique: jest.fn(async () => own),
        update: jest.fn(async () => own),
      },
    };
    const c = new WhatsAppForAnOrganisationController(prisma, {} as any, {} as any, { get: () => [] } as any);
    const res: any = { status: jest.fn(() => res), type: jest.fn(() => res), send: jest.fn(() => res) };
    return { c, prisma, res };
  }

  it('is remembered when Meta checks the address with the right token, and the challenge goes back', async () => {
    const { c, prisma, res } = controller({ verifyToken: 'gwv_right' });
    await c.verify('org-baridi', 'subscribe', 'gwv_right', 'abc123', res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('abc123');
    expect(prisma.whatsAppConnection.update).toHaveBeenCalledWith({ where: { organizationId: 'org-baridi' }, data: { webhookVerifiedAt: expect.any(Date) } });
  });

  it('is not remembered for a wrong token', async () => {
    const { c, prisma, res } = controller({ verifyToken: 'gwv_right' });
    await c.verify('org-baridi', 'subscribe', 'gwv_wrong', 'abc123', res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.whatsAppConnection.update).not.toHaveBeenCalled();
  });

  it('still answers Meta when remembering fails', async () => {
    const { c, prisma, res } = controller({ verifyToken: 'gwv_right' });
    prisma.whatsAppConnection.update.mockRejectedValueOnce(new Error('down'));
    await c.verify('org-baridi', 'subscribe', 'gwv_right', 'abc123', res);
    expect(res.send).toHaveBeenCalledWith('abc123');
  });

  it('is served to the admin as when it was proven: the handshake, or else the first message in', async () => {
    const row = (extra: any) => ({
      phoneNumberId: '109822345561', businessAccountId: null, displayNumber: '+254 709 000 111', verifyToken: 'gwv_x',
      approvedTemplates: [], enabled: true, connectedAt: new Date(), lastOutboundAt: null, accessToken: 'EAAtoken1234', ...extra,
    });
    const make = (r: any) => new WhatsAppService({ get: () => undefined } as any, { whatsAppConnection: { findUnique: async () => r } } as any);
    const shook = new Date('2026-09-20T09:00:00Z');
    const wrote = new Date('2026-09-21T09:00:00Z');
    expect((await make(row({ webhookVerifiedAt: shook, lastInboundAt: wrote })).connectionFor('org-baridi'))!.webhookProvenAt).toEqual(shook);
    expect((await make(row({ webhookVerifiedAt: null, lastInboundAt: wrote })).connectionFor('org-baridi'))!.webhookProvenAt).toEqual(wrote);
    expect((await make(row({ webhookVerifiedAt: null, lastInboundAt: null })).connectionFor('org-baridi'))!.webhookProvenAt).toBeNull();
    const served = JSON.stringify(await make(row({ webhookVerifiedAt: null, lastInboundAt: null })).connectionFor('org-baridi'));
    expect(served).not.toContain('EAAtoken1234');
  });
});
