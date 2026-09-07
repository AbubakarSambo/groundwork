/**
 * Seven attempts over about twenty-one hours, then DEAD, and a warning in OUR logs. The customer's
 * integration silently stopped receiving and the first they knew was a gap in their own data.
 */
import { WebhooksService } from './webhooks.service';

function makeService(over: { deadNoticeAt?: Date | null; admins?: any[] } = {}) {
  const told: any[] = [];
  const posted: any[] = [];
  const endpoint = { id: 'e1', organizationId: 'org1', url: 'https://them.test/hook', deadNoticeAt: over.deadNoticeAt ?? null };
  const prisma: any = {
    webhookEndpoint: {
      updateMany: jest.fn(async (a: any) => {
        const fresh = a.where.OR.some((c: any) =>
          (c.deadNoticeAt === null && endpoint.deadNoticeAt === null) ||
          (c.deadNoticeAt?.lt && endpoint.deadNoticeAt && endpoint.deadNoticeAt < c.deadNoticeAt.lt));
        if (fresh) endpoint.deadNoticeAt = a.data.deadNoticeAt;
        return { count: fresh ? 1 : 0 };
      }),
      findUnique: jest.fn(async () => endpoint),
    },
    user: { findMany: jest.fn(async () => over.admins ?? [{ email: 'admin@them.test', firstName: 'Ada' }]) },
  };
  const workspace: any = { tell: jest.fn(async (org: string, notice: any) => { posted.push({ org, notice }); return []; }) };
  const email: any = {
    sendWebhookEndpointDying: jest.fn(async (...args: any[]) => { told.push(args); }),
    frontendUrlForLinks: () => 'https://app.test',
  };
  return { service: new WebhooksService(prisma, workspace, email), told, posted, endpoint };
}

const dead = { id: 'd1', endpointId: 'e1', organizationId: 'org1', eventType: 'round.completed', attempts: 7 };

describe('a dead delivery reaches a person', () => {
  it('emails the organisation\'s admins, naming the endpoint and the event', async () => {
    const { service, told } = makeService();
    await (service as any).tellThemItIsDying(dead);
    expect(told).toHaveLength(1);
    expect(told[0]).toEqual(expect.arrayContaining(['admin@them.test', 'https://them.test/hook', 'round.completed']));
  });

  it('and posts to the workspace channel if one is connected', async () => {
    const { service, posted } = makeService();
    await (service as any).tellThemItIsDying(dead);
    expect(posted[0].org).toBe('org1');
    expect(posted[0].notice.about).toMatch(/cannot deliver events/);
  });

  it('says it once a day, not once per dead delivery', async () => {
    /* A broken endpoint produces a dead delivery for every event, so a notice per delivery would
       be its own outage. */
    const { service, told } = makeService();
    await (service as any).tellThemItIsDying(dead);
    await (service as any).tellThemItIsDying({ ...dead, id: 'd2' });
    await (service as any).tellThemItIsDying({ ...dead, id: 'd3' });
    expect(told).toHaveLength(1);
  });

  it('says it again the next day, because it is still broken', async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60_000);
    const { service, told } = makeService({ deadNoticeAt: twoDaysAgo });
    await (service as any).tellThemItIsDying(dead);
    expect(told).toHaveLength(1);
  });

  it('tells every admin, because one may have left', async () => {
    const { service, told } = makeService({ admins: [
      { email: 'a@them.test', firstName: 'A' },
      { email: 'b@them.test', firstName: 'B' },
    ] });
    await (service as any).tellThemItIsDying(dead);
    expect(told.map((t) => t[0])).toEqual(['a@them.test', 'b@them.test']);
  });

  it('and the delivery path never fails because the notice failed', async () => {
    const { service } = makeService();
    (service as any).email.sendWebhookEndpointDying = async () => { throw new Error('mail is down'); };
    await expect((service as any).tellThemItIsDying(dead)).resolves.toBeUndefined();
  });
});

describe('and the sweep calls it', () => {
  const src = require('fs')
    .readFileSync(require('path').join(__dirname, 'webhooks.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('on the branch that marks a delivery dead, and cannot throw into it', () => {
    const from = src.indexOf('WebhookDeliveryStatus.DEAD');
    const after = src.slice(from, from + 900);
    expect(after).toContain('tellThemItIsDying');
    expect(after).toMatch(/tellThemItIsDying\(d\)\.catch\(/);
  });
});
