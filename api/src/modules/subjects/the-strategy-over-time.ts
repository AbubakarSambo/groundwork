import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * THE STRATEGY KEEPS ITS VERSIONS (decision 80, item 68).
 *
 * The organisation's priorities are its top-level objectives, brought in from its own systems or agreed in a draft. Each time that set
 * changes, one new version begins: its number, the day it began, and the priorities it held. So the Company page can say "Strategy v2,
 * since 1 September." and show how the strategy changed.
 *
 * WRITTEN WHEN A PRIORITY CHANGES, NEVER WHEN THE PAGE OPENS. `recordTheStrategy` is called by the three places that write an objective
 * (a push from their system, their system deleting one, and a draft agreed). It writes nothing when the set of priorities is the same, so
 * calling it again, or twice at once on the same set, makes no second version. The read below only reads.
 *
 * WHAT A VERSION IS BUILT FROM: the titles of the top-level objectives their system has not dropped, and their own ids. It never holds a
 * person, a target, a measure, or anything a participant said, so everybody who reads the priorities may read the history.
 *
 * WHICH VERSION A CHECK-IN RAN UNDER is found from the dates (the version that was newest on the day it started), so no check-in row is
 * changed and nothing already stored is rewritten. `versionOn` answers it.
 *
 * AN ORGANISATION THAT HAD PRIORITIES BEFORE THIS has no version until its priorities next change. The priorities already there then become
 * version 1, from the day the earliest was set (the earliest day we can honestly say anything about), and the change begins version 2.
 */
const logger = new Logger('StrategyVersions');

export interface AStrategyVersion {
  number: number;
  startedAt: Date;
  priorities: { sourceSystem: string; externalId: string; title: string }[];
}

const keyOf = (ps: { sourceSystem: string; externalId: string; title: string }[]) =>
  crypto.createHash('sha256').update(JSON.stringify([...ps].map((p) => [p.sourceSystem, p.externalId, p.title]).sort())).digest('hex');

/** Starts a new version when the organisation's priorities are not what the newest version held. Never throws: a failure here must not stop an objective being saved. */
export async function recordTheStrategy(prisma: any, organizationId: string, now: Date = new Date()): Promise<AStrategyVersion | null> {
  try {
    const rows: any[] = await prisma.subject.findMany({
      where: { organizationId, type: 'OBJECTIVE', parentExternalId: null, sourceDeletedAt: null },
      select: { sourceSystem: true, externalId: true, title: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const priorities = rows.map((r) => ({ sourceSystem: r.sourceSystem, externalId: r.externalId, title: r.title }));
    const newest: any = await prisma.strategyVersion.findFirst({ where: { organizationId }, orderBy: { number: 'desc' } });
    if (!priorities.length && !newest) return null;
    const key = keyOf(priorities);
    if (newest && newest.prioritiesKey === key) return null;
    let number = (newest?.number ?? 0) + 1;
    /* An organisation with priorities from before this: what it held before this very change was not kept. The priorities that were
       already there are its first version, from the day the earliest was set, and this change begins the next one. */
    if (!newest) {
      const already = rows.filter((r) => now.getTime() - new Date(r.createdAt).getTime() > 5000);
      const before = already.map((r) => ({ sourceSystem: r.sourceSystem, externalId: r.externalId, title: r.title }));
      if (already.length && keyOf(before) !== key) {
        await prisma.strategyVersion.create({ data: { organizationId, number: 1, startedAt: new Date(already[0].createdAt), priorities: before, prioritiesKey: keyOf(before) } });
        number = 2;
      }
    }
    const startedAt = !newest && number === 1 && rows.length ? new Date(rows[0].createdAt) : now;
    const made = await prisma.strategyVersion.create({ data: { organizationId, number, startedAt, priorities, prioritiesKey: key } });
    return { number: made.number, startedAt: made.startedAt, priorities };
  } catch (err: any) {
    /* Two writers at once make the same number: the second is refused by the unique key and the first stands. */
    if (err?.code !== 'P2002') logger.warn(`Could not record the strategy for ${organizationId}: ${err?.message}`);
    return null;
  }
}

/** The version that was newest on that day, or null if there was none yet. */
export function versionOn(versions: AStrategyVersion[], day: Date): AStrategyVersion | null {
  const by = [...versions].sort((a, b) => a.number - b.number).filter((v) => v.startedAt.getTime() <= day.getTime());
  return by.length ? by[by.length - 1] : null;
}

export interface TheStrategyAsRead {
  /** "Strategy v2, since 1 September." */
  says: string;
  number: number;
  history: { number: number; says: string; priorities: string[]; whatChanged: string | null }[];
}

const quoted = (titles: string[]) => {
  const q = titles.map((t) => `“${t}”`);
  return q.length <= 1 ? q.join('') : `${q.slice(0, -1).join(', ')} and ${q[q.length - 1]}`;
};

export const sinceSays = (v: { number: number; startedAt: Date }, now: Date = new Date()) =>
  `Strategy v${v.number}, since ${whenItWas(v.startedAt, v.startedAt.getUTCFullYear() === now.getUTCFullYear() ? 'dayAndMonthLong' : 'full')}.`;

/** Only reads. Null when no version has been kept yet, so a page for an organisation that has never changed its priorities reads as it always did. */
export async function theStrategyAsRead(prisma: any, organizationId: string, now: Date = new Date()): Promise<TheStrategyAsRead | null> {
  const rows: any[] = await prisma.strategyVersion.findMany({ where: { organizationId }, orderBy: { number: 'asc' } });
  if (!rows.length) return null;
  const history = rows.map((v, i) => {
    const titles = (v.priorities as any[]).map((p) => p.title as string);
    const before = i ? (rows[i - 1].priorities as any[]).map((p) => p.title as string) : null;
    const added = before ? titles.filter((t) => !before.includes(t)) : [];
    const removed = before ? before.filter((t) => !titles.includes(t)) : [];
    const parts = [added.length ? `added ${quoted(added)}` : null, removed.length ? `removed ${quoted(removed)}` : null].filter(Boolean) as string[];
    return {
      number: v.number as number,
      says: sinceSays({ number: v.number, startedAt: new Date(v.startedAt) }, now),
      priorities: titles,
      whatChanged: before ? (parts.length ? `This version ${parts.join(' and ')}.` : 'This version changed the wording of a priority.') : null,
    };
  });
  const latest = history[history.length - 1];
  return { says: latest.says, number: latest.number, history: history.slice().reverse() };
}
