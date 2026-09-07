/**
 * TWO FAULTS IN ONE SHORT METHOD.
 *
 * The dedupe key for an event that arrived without an id was `unsigned-${Date.now()}` — a new
 * value every millisecond, so the upsert whose comment says "the same delivery twice is one row"
 * could never match, and every retry became a second fact on a board that reads the table as a
 * count of what happened. And the secret it was checked against came from `findFirst` with no
 * `where`, which is whichever integration row the database returned.
 */
import * as fs from 'fs';
import * as path from 'path';
import { OpsGroundworkEventsService, THE_ONE_ROW } from './ops-groundwork-events.service';

function makeService() {
  const upserts: any[] = [];
  const prisma: any = {
    opsIntegration: { findUnique: jest.fn(async () => ({ webhookSecret: null })) },
    opsGroundworkEvent: { upsert: jest.fn(async (args: any) => { upserts.push(args); return {}; }) },
  };
  return { service: new OpsGroundworkEventsService(prisma), prisma, upserts };
}

describe('an event that arrives twice is one fact', () => {
  it('gives the same body the same id on every retry', async () => {
    const { service, upserts } = makeService();
    const body = JSON.stringify({ event: 'report.ready', ground: 'g1' });
    await service.received(body, undefined, undefined);
    await service.received(body, undefined, undefined);
    expect(upserts).toHaveLength(2);
    expect(upserts[0].where.eventId).toBe(upserts[1].where.eventId);
  });

  it('gives a different delivery a different id', async () => {
    const { service, upserts } = makeService();
    await service.received(JSON.stringify({ event: 'report.ready', ground: 'g1' }), undefined, undefined);
    await service.received(JSON.stringify({ event: 'report.ready', ground: 'g2' }), undefined, undefined);
    expect(upserts[0].where.eventId).not.toBe(upserts[1].where.eventId);
  });

  it('never mints an id from the clock', async () => {
    const { service, upserts } = makeService();
    await service.received('{"event":"x"}', undefined, undefined);
    expect(upserts[0].where.eventId).not.toMatch(/^unsigned-\d+$/);
  });

  it('prefers the id the sender gave, and the one in the payload after that', async () => {
    const { service, upserts } = makeService();
    await service.received('{"event":"x","id":"in-payload"}', undefined, 'from-header');
    await service.received('{"event":"x","id":"in-payload"}', undefined, undefined);
    expect(upserts[0].where.eventId).toBe('from-header');
    expect(upserts[1].where.eventId).toBe('in-payload');
  });

  it('still records something unreadable rather than dropping it', async () => {
    const { service, upserts } = makeService();
    await service.received('not json at all', undefined, undefined);
    expect(upserts[0].create.payload).toHaveProperty('unreadable');
  });

  it('asks for the named integration row rather than an arbitrary one', async () => {
    const { service, prisma } = makeService();
    await service.received('{"event":"x"}', undefined, 'e1');
    expect(prisma.opsIntegration.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: THE_ONE_ROW } }),
    );
  });
});

describe('and no read of that table is left unscoped', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'ops-groundwork-events.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('does not call findFirst on the integration row', () => {
    expect(src).not.toMatch(/opsIntegration\.findFirst/);
  });
});

/**
 * AND ONCE THERE IS A SECRET, AN UNSIGNED EVENT IS NOT FILED.
 *
 * The route is public by necessity and recorded everything, verified or not, answering 200 either
 * way — so anybody who found the URL could write rows into the table the ops board reads as a count
 * of what happened, marked unverified in a column nobody reads.
 */
describe('what happens when a secret exists', () => {
  function withSecret(secret: string | null) {
    const upserts: any[] = [];
    const prisma: any = {
      opsIntegration: { findUnique: jest.fn(async () => ({ webhookSecret: secret })) },
      opsGroundworkEvent: { upsert: jest.fn(async (a: any) => { upserts.push(a); return {}; }) },
    };
    return { service: new OpsGroundworkEventsService(prisma), upserts };
  }

  it('refuses a delivery that cannot prove it is us, and records nothing', async () => {
    const { service, upserts } = withSecret('a-real-secret');
    await expect(service.received('{"event":"report.ready"}', 'sha256=nonsense', 'e1')).rejects.toThrow();
    expect(upserts).toEqual([]);
  });

  it('refuses one with no signature header at all', async () => {
    const { service, upserts } = withSecret('a-real-secret');
    await expect(service.received('{"event":"report.ready"}', undefined, 'e1')).rejects.toThrow();
    expect(upserts).toEqual([]);
  });

  it('but still records an unverifiable one while NOTHING is configured', async () => {
    /* This is how somebody discovers the secret is missing. Refusing here would make a
       half-finished setup look like a working one with no traffic. */
    const { service, upserts } = withSecret(null);
    await service.received('{"event":"report.ready"}', undefined, 'e1');
    expect(upserts).toHaveLength(1);
    expect(upserts[0].create.verified).toBe(false);
  });
});
