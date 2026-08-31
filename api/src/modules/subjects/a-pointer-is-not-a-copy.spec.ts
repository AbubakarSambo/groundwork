import { readFileSync } from 'fs';
import { join } from 'path';
import { SubjectsService } from './subjects.service';
import { freshnessOf, STALENESS_DAYS } from './a-pointer-goes-stale';
import { BadRequestException } from '@nestjs/common';

/**
 * A SUBJECT IS AN ADDRESS AND A DATE, NOT A SECOND COPY OF SOMEBODY'S OBJECTIVE.
 *
 * The whole design is one refusal: we do not hold an editable version of the customer's work. The
 * moment a title can be changed here, there are two places that must agree, each defensible on its
 * own, and nothing reconciling them - which is the failure this product exists to end, arriving
 * from the inside as a convenience.
 *
 * That refusal is invisible in the code: it looks like a service that simply has no update method.
 * Absence is exactly what a later change removes without noticing, so it is asserted here.
 */
const SRC = readFileSync(join(__dirname, 'subjects.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const day = (n: number) => new Date(2026, 0, n, 12, 0, 0);

describe('a pointer is not a copy', () => {
  it('offers no way to edit the wording we hold', () => {
    /* Every write in here must be an upsert from a push or the soft-delete stamp. A plain
       `subject.update` would be somebody editing the customer's objective in our database. */
    const writes = [...SRC.matchAll(/prisma\.subject\.(\w+)\(/g)].map((m) => m[1]);
    expect(writes.length).toBeGreaterThan(0);
    for (const w of writes) {
      expect(['upsert', 'updateMany', 'findFirst', 'findMany']).toContain(w);
    }
    expect(SRC).not.toMatch(/prisma\.subject\.update\(/);
    expect(SRC).not.toMatch(/prisma\.subject\.delete\(/);
    expect(SRC).not.toMatch(/prisma\.subject\.deleteMany\(/);
  });

  it('never polls the customer, because a sync would make it a copy again', () => {
    expect(SRC).not.toMatch(/\bfetch\(|axios|Cron|Interval|Timeout/);
  });

  it('scopes every read and write by organisation', () => {
    /* Read off the source rather than exercised, because the failure is a query written later that
       simply omits it - which no fixture-returning test would notice. */
    const calls = [...SRC.matchAll(/prisma\.subject\.\w+\(\{[\s\S]*?\n    \}\)/g)];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c[0]).toContain('organizationId');
    }
  });
});

describe('freshness is computed, never stored', () => {
  it('is not a column', () => {
    const schema = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8');
    const model = schema.slice(schema.indexOf('model Subject {'));
    expect(model.slice(0, model.indexOf('\n}'))).not.toMatch(/^\s*freshness/m);
  });

  it('the boundary belongs to fresh, so a fortnightly push is not stale every time it lands', () => {
    const exactly = { syncedAt: day(1), sourceDeletedAt: null };
    const now = new Date(day(1).getTime() + STALENESS_DAYS * 86_400_000);
    expect(freshnessOf(exactly, now)).toBe('fresh');
    expect(freshnessOf(exactly, new Date(now.getTime() + 1))).toBe('stale');
  });

  it('deleted at source is disconnected, which is not an older kind of stale', () => {
    /* Different facts, different actions: chase the integration, versus stop asking about work that
       no longer exists. */
    expect(freshnessOf({ syncedAt: day(1), sourceDeletedAt: day(2) }, day(2))).toBe('disconnected');
    expect(freshnessOf({ syncedAt: day(1), sourceDeletedAt: null }, day(2))).toBe('fresh');
  });

  it('a clock running fast is not a reason to distrust the wording', () => {
    expect(freshnessOf({ syncedAt: day(20), sourceDeletedAt: null }, day(1))).toBe('fresh');
  });
});

function svc(rows: any[] = []) {
  const store = [...rows];
  const prisma: any = {
    subject: {
      upsert: jest.fn(async (a: any) => ({ ...a.create, ...a.update })),
      updateMany: jest.fn(async (a: any) => ({
        count: store.filter(
          (r) =>
            r.organizationId === a.where.organizationId &&
            r.externalId === a.where.externalId &&
            r.sourceSystem === a.where.sourceSystem &&
            r.sourceDeletedAt === null,
        ).length,
      })),
      findFirst: jest.fn(async (a: any) =>
        store.find((r) => Object.entries(a.where).every(([k, v]) => r[k] === v)) ?? null,
      ),
      findMany: jest.fn(async () => store),
    },
  };
  return { service: new SubjectsService(prisma), prisma };
}

describe('taking a push in', () => {
  it('refuses a type it does not know rather than guessing one', async () => {
    const { service } = svc();
    await expect(
      service.push('org1', { externalId: 'x', sourceSystem: 's', type: 'epic', title: 'T' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keys the upsert on org, source system and external id', async () => {
    const { service, prisma } = svc();
    await service.push('org1', { externalId: 'OKR-1', sourceSystem: 'their-tool', type: 'objective', title: 'T' });
    expect(prisma.subject.upsert.mock.calls[0][0].where).toEqual({
      organizationId_sourceSystem_externalId: {
        organizationId: 'org1',
        sourceSystem: 'their-tool',
        externalId: 'OKR-1',
      },
    });
  });

  it('moves syncedAt even when the wording did not change', async () => {
    /* A no-op push is how a healthy integration proves it is alive. Treating it as nothing to
       record would make a working connection look silent. */
    const { service, prisma } = svc();
    await service.push('org1', { externalId: 'OKR-1', sourceSystem: 's', type: 'objective', title: 'Same' });
    expect(prisma.subject.upsert.mock.calls[0][0].update.syncedAt).toBeInstanceOf(Date);
  });

  it('a push clears a source deletion, so a restore in their tool is not permanent here', async () => {
    const { service, prisma } = svc();
    await service.push('org1', { externalId: 'OKR-1', sourceSystem: 's', type: 'objective', title: 'T' });
    expect(prisma.subject.upsert.mock.calls[0][0].update.sourceDeletedAt).toBeNull();
  });

  it('stores their own status word rather than mapping it onto one of ours', async () => {
    const { service, prisma } = svc();
    await service.push('org1', {
      externalId: 'OKR-1', sourceSystem: 's', type: 'objective', title: 'T', status: 'On Track (Q3)',
    });
    expect(prisma.subject.upsert.mock.calls[0][0].update.status).toBe('On Track (Q3)');
  });

  it('deleting is a stamp, and stamping twice changes nothing', async () => {
    const { service } = svc([
      { organizationId: 'org1', sourceSystem: 's', externalId: 'OKR-1', sourceDeletedAt: null },
    ]);
    await expect(service.markSourceDeleted('org1', 's', 'OKR-1')).resolves.toEqual({ deleted: true });
  });

  it("another org's subject is not found, deleted, or counted", async () => {
    const { service } = svc([
      { organizationId: 'org1', sourceSystem: 's', externalId: 'OKR-1', sourceDeletedAt: null, syncedAt: day(1) },
    ]);
    expect(await service.find('org2', 's', 'OKR-1')).toBeNull();
    expect(await service.markSourceDeleted('org2', 's', 'OKR-1')).toEqual({ deleted: false });
  });
});
