import { WhatHappenedWithACustomerService } from './what-happened-with-a-customer.service';
import { BadRequestException } from '@nestjs/common';

/**
 * TAKING IN WHAT HAPPENED WITH A CUSTOMER.
 *
 * A check-in could hold what somebody SAID they did and nothing could hold what a system recorded,
 * so "did he visit the shop" was unanswerable and the honest product could only narrate
 * self-reports back at a CEO.
 *
 * What this must not become is a CRM. Six shapes of thing, four strengths, a short note, and where
 * it came from. No stages, no values, no pipeline.
 */
const svc = () => {
  const stored: any[] = [];
  const s = Object.create(WhatHappenedWithACustomerService.prototype) as any;
  s.logger = { log: () => {} };
  s.prisma = {
    interaction: {
      create: async (a: any) => { stored.push(a.data); return {}; },
      upsert: async (a: any) => { stored.push(a.create); return {}; },
    },
  };
  return { s, stored };
};

const one = (over: any = {}) => ({
  personExternalId: 'p-sam',
  counterpartyExternalId: 'shop-a',
  kind: 'VISIT',
  strength: 'RECORDED',
  happenedAt: '2026-11-03T10:00:00Z',
  note: 'Owner not in, spoke to the manager',
  externalId: 'v-1',
  ...over,
});

describe('what it takes', () => {
  it('a visit, with who, which shop, when, and where it came from', async () => {
    const { s, stored } = svc();
    await s.push('org1', 'salesapp', [one()]);
    expect(stored[0]).toMatchObject({
      personExternalId: 'p-sam', counterpartyExternalId: 'shop-a',
      kind: 'VISIT', strength: 'RECORDED', sourceSystem: 'salesapp',
    });
  });

  it('their observation time, never our clock', async () => {
    /* Our clock dates a week of somebody's work to the night their integration ran. */
    const { s, stored } = svc();
    await s.push('org1', 'salesapp', [one()]);
    expect(stored[0].happenedAt.toISOString()).toBe('2026-11-03T10:00:00.000Z');
  });

  it('and the same record twice updates rather than doubling the activity', async () => {
    const { s } = svc();
    const out = await s.push('org1', 'salesapp', [one(), one()]);
    expect(out.received.every((r: any) => r.stored)).toBe(true);
  });
});

describe('what it refuses, and says why', () => {
  it('a push with no system named', async () => {
    /* A record with no provenance is a rumour with a timestamp. */
    await expect(svc().s.push('org1', '', [one()])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a strength it does not have, rather than defaulting to one', async () => {
    /*
     * Any default would be wrong for something: too strong and a calendar entry becomes a visit,
     * too weak and a completed sale reads as somebody's opinion.
     */
    const { s, stored } = svc();
    const out = await s.push('org1', 'salesapp', [one({ strength: undefined })]);
    expect(stored).toHaveLength(0);
    expect(out.received[0].because).toContain('not a strength we have');
  });

  it('a kind it does not have, and lists the ones it does', async () => {
    const { s } = svc();
    const out = await s.push('org1', 'salesapp', [one({ kind: 'DEMO' })]);
    expect(out.received[0].because).toContain('VISIT');
  });

  it('a record about nobody', async () => {
    const { s } = svc();
    const out = await s.push('org1', 'salesapp', [one({ personExternalId: '' })]);
    expect(out.received[0].because).toContain('nobody this is about');
  });

  it('a record with no time on it', async () => {
    const { s } = svc();
    const out = await s.push('org1', 'salesapp', [one({ happenedAt: undefined })]);
    expect(out.received[0].because).toContain('will not use our own clock');
  });

  it('and a note long enough to be the conversation', async () => {
    /* A note is the line written at the time. What was actually said has different consent behind
       it and does not arrive on this path. */
    const { s } = svc();
    const out = await s.push('org1', 'salesapp', [one({ note: 'x'.repeat(900) })]);
    expect(out.received[0].because).toContain('not the conversation');
  });
});

describe('one bad record does not fail the batch', () => {
  it('the good ones land and the bad one says why', async () => {
    const { s, stored } = svc();
    const out = await s.push('org1', 'salesapp', [one(), one({ externalId: 'v-2', kind: 'DEMO' }), one({ externalId: 'v-3' })]);
    expect(stored).toHaveLength(2);
    expect(out.received.filter((r: any) => !r.stored)).toHaveLength(1);
  });
});
