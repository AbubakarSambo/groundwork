import { theUnitsOf, type ADealOnRecord, type ACountFromTheDeals } from './a-sales-aim-is-counted-from-the-deals';

/**
 * WHERE A TARGET COUNTED FROM THE DEALS STARTED (final real-model check, item 12). Grace's "Units sold by 30 October" was set before
 * Monday's check-ins, and its first snapshot was taken when Monday's round closed, after Kevin sold 40 units at Kilele Hotel, so the
 * board said "It was 40 at the start and is 40 now, and the aim is 120." Where a units target was on record before the first answer of the
 * session it was first counted at, its start is what the deals held then: the units of deals won before that answer (0 here). Otherwise its
 * first snapshot, as before.
 */
export function theStartOfATargetFromTheDeals(
  o: { createdAt?: Date | string | null; ownerParticipantId?: string | null },
  counted: Pick<ACountFromTheDeals, 'counts'> | null,
  firstAnswerAt: number | null,
  deals: readonly Pick<ADealOnRecord, 'stagesKept' | 'ownerParticipantId' | 'fields'>[],
  firstSnapshot: number | null,
): number | null {
  if (!counted || counted.counts !== 'units' || firstAnswerAt === null || !o.createdAt || new Date(o.createdAt).getTime() > firstAnswerAt) return firstSnapshot;
  const before = deals.filter((d) => (d.stagesKept ?? []).some((k: any) => /^won$/i.test(String(k.stage ?? '')) && new Date(k.on).getTime() < firstAnswerAt)
    && (!o.ownerParticipantId || d.ownerParticipantId === o.ownerParticipantId));
  return before.reduce((n, d) => n + (theUnitsOf(d.fields) ?? 0), 0);
}
