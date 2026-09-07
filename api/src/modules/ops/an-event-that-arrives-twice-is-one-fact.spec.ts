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
