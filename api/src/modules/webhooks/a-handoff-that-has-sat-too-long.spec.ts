import { readFileSync } from 'fs';
import { join } from 'path';
import { DependencyStatus } from '@prisma/client';
import { WebhooksCron } from './webhooks.cron';
import { ESCALATE_AFTER_DAYS, shouldEscalate } from './a-handoff-that-has-sat-too-long';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

describe('an escalation fires once, not every night', () => {
  it('does not fire again once it has been stamped', () => {
    /*
     * A sweep that re-sent every night for as long as the handoff stayed open would teach the
     * receiving team to filter the channel within a week, and the alert they filtered would be the
     * one that mattered.
     */
    expect(shouldEscalate(90, new Date())).toBe(false);
  });

  it('and does not fire before the threshold', () => {
    expect(shouldEscalate(ESCALATE_AFTER_DAYS - 1, null)).toBe(false);
    expect(shouldEscalate(ESCALATE_AFTER_DAYS, null)).toBe(true);
  });
});

describe('the escalation sweep', () => {
  const handoff = (o: any = {}) => ({
    id: 'd1', groundId: 'g1', createdAt: daysAgo(30), escalatedAt: null,
    fromParticipantId: 'p1', onParticipantId: 'p2', onLabel: null,
    what: 'the paying-user pricing decision', status: DependencyStatus.WAITING, ...o,
  });

  const run = async (rows: any[]) => {
    const order: string[] = [];
    const prisma: any = {
      groundDependency: {
        findMany: async () => rows,
        update: async () => { order.push('stamp'); return {}; },
      },
    };
    const events: any = { emit: (name: string) => { order.push(`emit:${name}`); } };
    const cron = new WebhooksCron({} as any, prisma, events);
    await cron.escalateStaleHandoffs();
    return order;
  };

  it('stamps before it emits', async () => {
    /*
     * If the process dies between the two, this order costs one alert never sent - somebody misses
     * a notification. The other order costs an alert re-sent every night forever, which is how a
     * channel gets muted, and the muted channel is the real damage.
     */
    expect(await run([handoff()])).toEqual(['stamp', 'emit:blocker.escalated']);
  });

  it('leaves alone a handoff nobody described properly', async () => {
    /* The same bar as the raise. Sitting still for a fortnight does not make a throwaway mention
       substantial. */
    expect(await run([handoff({ what: 'stuff' })])).toEqual([]);
  });

  it('leaves alone one somebody recorded against themselves', async () => {
    expect(await run([handoff({ onParticipantId: 'p1' })])).toEqual([]);
  });

  it('leaves alone one that has not waited long enough', async () => {
    expect(await run([handoff({ createdAt: daysAgo(ESCALATE_AFTER_DAYS - 1) })])).toEqual([]);
  });
});

describe('the query itself excludes what has already been sent', () => {
  it('rather than relying on the check in the loop', () => {
    /*
     * `shouldEscalate` refusing a stamped row is the correctness guarantee; the where-clause is what
     * stops the sweep loading every handoff ever escalated on every pass. Both, because the second
     * one degrades quietly and only in production.
     */
    const src = readFileSync(join(__dirname, 'webhooks.cron.ts'), 'utf8');
    expect(src).toMatch(/escalatedAt: null/);
  });
});
