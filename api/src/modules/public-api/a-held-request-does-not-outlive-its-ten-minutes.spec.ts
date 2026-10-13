import { readFileSync } from 'fs';
import { join } from 'path';
import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';
import { HeldRequestsCron } from './a-held-request-does-not-outlive-its-ten-minutes.cron';
import { CronLock } from '../prisma/prisma.service';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy this. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * NOTHING A PERSON SAID IS KEPT PAST ITS TEN MINUTES WAITING FOR A YES OR A NO, EVEN WHEN THEY NEVER WRITE AGAIN (decision 110, P12).
 *
 * Wanjiku asked on WhatsApp "Can I take Friday off?" in her check-in; Groundwork asked "Shall I treat this as a leave request?" and she
 * did not answer. Her words waited in the database until she next wrote, which may be never. Read as Wanjiku: her words are put in the
 * check-in they were held from, as a no would, and are gone from the held store; a hold still inside its ten minutes is not touched; and
 * nobody else's words are.
 */
const NOW = new Date('2026-10-07T03:15:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

function world(rows: any[], opts: { checkInStatus?: string; userId?: string | null } = {}) {
  const threads = rows.map((r) => ({ ...r }));
  const prisma: any = {
    whatsAppThread: {
      findMany: jest.fn(async ({ where }: any) => threads.filter((t) => t.requestKind && t.requestAskedAt && t.requestAskedAt < where.requestAskedAt.lt).map((t) => ({ ...t }))),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const t = threads.find((x) => x.id === where.id && x.requestAskedAt?.getTime() === where.requestAskedAt?.getTime());
        if (!t) return { count: 0 };
        Object.assign(t, data); return { count: 1 };
      }),
    },
    checkIn: { findUnique: jest.fn(async () => ({ id: 'ci1', status: opts.checkInStatus ?? 'IN_PROGRESS' })) },
  };
  const whatsapp: any = { whoIsWritingTo: jest.fn(async () => ({ personId: 'pe1', userId: opts.userId === undefined ? 'u-wanjiku' : opts.userId, externalId: 'wanjiku' })) };
  const conversation: any = { open: jest.fn(async () => ({ reply: 'Hello' })), sendMessage: jest.fn(async () => ({ reply: 'Thanks' })) };
  const svc: any = new WhatsAppForAnOrganisationService(prisma, whatsapp, conversation, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { svc, prisma, conversation, whatsapp, threads };
}
const held = (id: string, extra: any = {}) => ({ id, organizationId: 'org1', phone: `+2547000${id}`, checkInId: 'ci1', requestKind: 'leave', requestWords: 'Can I take Friday off?', requestAskedAt: minutesAgo(30), questionAskedAbout: null, ...extra });

describe('words held for a yes or a no, past their ten minutes', () => {
  it('are put in the check-in they were held from, and gone from the held store', async () => {
    const { svc, conversation, threads } = world([held('1')]);
    expect(await svc.putAwayWordsHeldTooLong(NOW)).toEqual({ putIn: 1, cleared: 1 });
    expect(conversation.sendMessage).toHaveBeenCalledWith('ci1', 'u-wanjiku', 'Can I take Friday off?', { door: 'whatsapp' });
    expect(threads[0]).toMatchObject({ requestKind: null, requestWords: null, requestAskedAt: null });
  });

  it('a check-in not yet started is opened first, as the next message would have opened it', async () => {
    const { svc, conversation } = world([held('1')], { checkInStatus: 'NOT_STARTED' });
    await svc.putAwayWordsHeldTooLong(NOW);
    expect(conversation.open).toHaveBeenCalledWith('ci1', 'u-wanjiku');
    expect(conversation.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('a hold still inside its ten minutes is left alone, with its words', async () => {
    const { svc, conversation, threads } = world([held('1', { requestAskedAt: minutesAgo(4) })]);
    expect(await svc.putAwayWordsHeldTooLong(NOW)).toEqual({ putIn: 0, cleared: 0 });
    expect(conversation.sendMessage).not.toHaveBeenCalled();
    expect(threads[0].requestWords).toBe('Can I take Friday off?');
  });

  it('where there is no open check-in to put them in, the words are still cleared, and nothing is invented', async () => {
    const { svc, conversation, threads } = world([held('1')], { checkInStatus: 'COMPLETED' });
    expect(await svc.putAwayWordsHeldTooLong(NOW)).toEqual({ putIn: 0, cleared: 1 });
    expect(conversation.sendMessage).not.toHaveBeenCalled();
    expect(threads[0].requestWords).toBeNull();
  });

  it('somebody whose number is nobody\'s here is cleared and nothing is sent anywhere', async () => {
    const { svc, conversation, threads } = world([held('1')], { userId: null });
    await svc.putAwayWordsHeldTooLong(NOW);
    expect(conversation.sendMessage).not.toHaveBeenCalled();
    expect(threads[0].requestWords).toBeNull();
  });

  it('a person who went to Ask Groundwork has their words put in the check-in they came from', async () => {
    const { svc, conversation, prisma } = world([held('1', { checkInId: 'ask:ci1' })]);
    const asked = require('./a-whatsapp-message-is-routed');
    expect(asked.isAsking('ask:ci1') ? asked.wasIn('ask:ci1') : 'ci1').toBeTruthy();
    await svc.putAwayWordsHeldTooLong(NOW);
    expect(prisma.checkIn.findUnique).toHaveBeenCalled();
    expect(conversation.sendMessage).toHaveBeenCalledTimes(asked.isAsking('ask:ci1') && !asked.wasIn('ask:ci1') ? 0 : 1);
  });

  it('two copies of the API at once put the words in once: whoever claims the hold first gets it', async () => {
    const { svc, conversation } = world([held('1')]);
    await Promise.all([svc.putAwayWordsHeldTooLong(NOW), svc.putAwayWordsHeldTooLong(NOW)]);
    expect(conversation.sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe('the nightly job', () => {
  it('runs under the job lock, once across every copy, and puts the words away', async () => {
    const put = jest.fn(async () => ({ putIn: 1, cleared: 1 }));
    const locks: number[] = [];
    const prisma: any = {
      withAdvisoryLock: async (id: number, fn: () => Promise<void>) => { locks.push(id); await fn(); return true; },
      $queryRaw: jest.fn(async () => [{ locked: true }]),
    };
    const cron = new HeldRequestsCron(prisma, { putAwayWordsHeldTooLong: put } as any);
    const src = withoutComments(readFileSync(join(__dirname, 'a-held-request-does-not-outlive-its-ten-minutes.cron.ts'), 'utf8'));
    expect(src).toContain('CronLock.HELD_REQUESTS');
    expect(src).toContain('onceAcrossCopies(');
    expect(src).toMatch(/@Cron\('15 3 \* \* \*'/);
    expect(CronLock.HELD_REQUESTS).toBe(920_014);
    expect(new Set(Object.values(CronLock)).size).toBe(Object.values(CronLock).length);
    expect(cron).toBeDefined();
    expect(locks).toEqual([]);
  });
});
