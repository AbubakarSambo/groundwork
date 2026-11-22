import { theDealsOnRecord, theAimsTheDealsCount, theSalesStages, whatASalesAimCounts, type ACountFromTheDeals, type ADealOnRecord } from './a-sales-aim-is-counted-from-the-deals';
import { isASalesKind } from './the-kind-of-work';
import { theThingItsNumberCounts } from './an-aim-is-a-sentence-about-somebody';
import { theReleaseOneSalesBoardIsOn } from './release-one-sales-board';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theMonthItCounts, theMonthsDays } from './a-sales-aim-is-counted-from-the-deals';
import { theCollectionsTypeFor, F } from './the-collections-record';
import { theBillsOnRecord } from './the-collections-board.service';
import { anAmount, thePaidDay, type ABillOnTheBoard } from './the-collections-board';

/**
 * AN AIM'S NUMBER IS COUNTED WHEN IT IS READ, THE SAME WAY ON EVERY PAGE (fix plan, pattern 1; quarter test, 28 October 2026).
 *
 * Kevin's You page read "You have 51 so far, 21 more than the 30" on 20 November and his My work "21 of 30 your target" on 4 December;
 * Joseph's My work read "4 over your target of 10" beside "Grace is waiting on you for proof of payment for 15 units"; Faith read
 * "0 sold" on one page and "You have 2 of 7" on another. The board counted the aims from the deals when it was read, and the You page
 * and My work read the number stored on the aim, written when a round closed, or by a model reading what was said. Every reader now
 * asks here: an aim the deals count is counted from the deals, now, under the lead's rule for proof and in the aim's own month; any
 * other aim keeps its stored number.
 */
export interface AnAimToCount { id: string; name: string | null | undefined; ownerParticipantId?: string | null; count?: number | null; target?: number | null }

export async function theAimsCountedNow(
  prisma: any,
  ground: { id: string; organizationId?: string | null; kindOfWork?: string | null; workStages?: unknown },
  aims: readonly AnAimToCount[],
  now: Date = new Date(),
  opts: { deals?: ADealOnRecord[]; zone?: string } = {},
): Promise<Map<string, ACountFromTheDeals>> {
  if (!aims.length) return new Map();
  if (!isASalesKind(ground.kindOfWork as any)) return theAimsTheBillsCount(prisma, ground, aims, now, opts.zone);
  if (!(await theReleaseOneSalesBoardIsOn(prisma, ground.organizationId ?? null).catch(() => false))) return new Map();
  const deals = opts.deals ?? (await theDealsOnRecord(prisma, ground.id, { paymentRecord: true }).catch(() => [] as ADealOnRecord[]));
  const zone = opts.zone ?? ((ground.organizationId ? await theOrganisationsZone(prisma, ground.organizationId).catch(() => null) : null) ?? THE_PRODUCTS_OWN_ZONE);
  const stages = theSalesStages(ground.workStages);
  const counted = theAimsTheDealsCount(aims.map((a) => ({ id: a.id, name: a.name, ownerParticipantId: a.ownerParticipantId ?? null })), deals, stages, now, zone);
  /*
   * A PERSON'S OWN TARGET THAT NAMES NO MEASURE IS COUNTED IN THE TEAM'S (the two-week check, Joseph). "You are on track for 30" says no
   * unit, so nothing counted it, and Joseph's You page read "0 of 30" while his My work counted 17 sold for his other target. On a sales
   * check-in whose own aims count units, value or sales, a person's numbered target with no measure of its own is counted in that one.
   */
  const allAims = ((await Promise.resolve(prisma.groundObjective?.findMany?.({ where: { groundId: ground.id }, select: { name: true } })).catch(() => null)) ?? aims) as { name: string | null | undefined }[];
  const theTeams = [...aims, ...allAims].map((a) => whatASalesAimCounts(a.name)).find((w) => w && w.counts !== 'new leads') ?? null;
  if (theTeams) {
    for (const a of aims) {
      /* An aim that names its own thing ("Activate 4 Drop Access points per week") is not the team's freezers: counted from the freezer
         deals, it read "3 won deals have no record of how many units" (Drop Access re-read, 22 November). A deal counts only toward an aim
         whose thing it is. */
      if (counted.has(a.id) || !a.ownerParticipantId || whatASalesAimCounts(a.name) || theThingItsNumberCounts(a.name ?? '')) continue;
      const target = (a as any).target;
      if (typeof target !== 'number' || target <= 0) continue;
      const asTheTeams = theTeams.counts === 'value' ? `KES ${target} in sales` : theTeams.counts === 'sales' ? `${target} sales` : `${target} units`;
      const c = theAimsTheDealsCount([{ id: a.id, name: asTheTeams, ownerParticipantId: a.ownerParticipantId }], deals, stages, now, zone).get(a.id);
      if (c) counted.set(a.id, c);
    }
  }
  return counted;
}

/** The aims with their number as it is counted now: the deals' count where the deals count it, the stored one otherwise. */
export async function withTheirCountNow<A extends AnAimToCount>(
  prisma: any,
  ground: { id: string; organizationId?: string | null; kindOfWork?: string | null; workStages?: unknown },
  aims: readonly A[],
  now: Date = new Date(),
): Promise<(A & { fromTheDeals?: ACountFromTheDeals })[]> {
  const counted = await theAimsCountedNow(prisma, ground, aims, now);
  return aims.map((a) => (counted.has(a.id) ? { ...a, count: counted.get(a.id)!.count, fromTheDeals: counted.get(a.id)! } : a));
}

/* "Collect KES 720,000 in November", "Fee notes collected": an aim about money collected. */
const COLLECTED = /\b(?:collect(?:ed|ions?)?|paid|received|recovered)\b/i;

/**
 * A COLLECTIONS AIM IS COUNTED FROM THE BILLS ON RECORD (fix plan, pattern 1). On a collections check-in, an aim about money collected
 * is the amounts of the bills that moved to Paid, the person's own where it is theirs, in the aim's own month where it names one. Nothing
 * else counted it, so it stayed at whatever a model had read from what was said, beside a report that counted the bills.
 */
async function theAimsTheBillsCount(
  prisma: any,
  ground: { id: string; organizationId?: string | null },
  aims: readonly AnAimToCount[],
  now: Date,
  zoneGiven?: string,
): Promise<Map<string, ACountFromTheDeals>> {
  const out = new Map<string, ACountFromTheDeals>();
  const theirs = aims.filter((a) => COLLECTED.test(String(a.name ?? '')));
  if (!theirs.length || !(await theCollectionsTypeFor(prisma, ground.id).catch(() => null))) return out;
  const zone = zoneGiven ?? ((ground.organizationId ? await theOrganisationsZone(prisma, ground.organizationId).catch(() => null) : null) ?? THE_PRODUCTS_OWN_ZONE);
  const bills: ABillOnTheBoard[] = await theBillsOnRecord(prisma, ground.id).catch(() => []);
  for (const a of theirs) {
    const m = theMonthItCounts(String(a.name ?? ''));
    const days = m.window === 'month' ? theMonthsDays(m.month, now, zone) : null;
    let count = 0;
    let proven = 0;
    let currency: string | null = null;
    for (const b of bills) {
      if (a.ownerParticipantId && b.ownerParticipantId !== a.ownerParticipantId) continue;
      const paid = thePaidDay(b, zone);
      if (!paid || (days && (paid < days.from || paid > days.to))) continue;
      const amt = anAmount((b.fields ?? {})[F.amount]);
      if (!amt) continue;
      currency = currency ?? amt.currency;
      count += amt.value;
      if (b.proof.length) proven += amt.value;
    }
    out.set(a.id, { counts: 'value', count, proven, leftOut: 0, thing: 'collected', currency, window: m.window, says: '' } as ACountFromTheDeals);
  }
  return out;
}
