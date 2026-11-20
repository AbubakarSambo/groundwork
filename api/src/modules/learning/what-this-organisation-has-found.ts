import { plainLearningRows } from './what-the-admin-reads';

/**
 * WHAT AN ORGANISATION HAS FOUND OUT, FROM ITS OWN RECORD ALONE (learning, stage 1: docs/learning-spec.md).
 *
 * The counts are already made per organisation (learning.service.ts writes a row for each organisation and a total built from those rows).
 * This reads back ONLY the organisation's own rows, never the total and never another organisation's, and says each as plain sentences. It
 * is the one door by which anything outside this folder may learn what an organisation's counts say, so the memory files never touch the
 * counts table themselves.
 *
 * Nothing here changes how Groundwork behaves. The suggested weights stay stored and unused (a-suggested-weight.ts, decision 55); what an
 * organisation has found is remembered and shown to the people who may read it, which is the organisation's learning loop in the memory
 * system (section 13). Too few signals and a row is not remembered at all: one lead's odd week is not something to learn.
 */
export const MOST_FINDINGS_REMEMBERED = 6;
/** Fewer signals than this and a finding is not worth saying, in a file or anywhere else. */
export const MIN_SIGNALS_BEFORE_A_FINDING = 5;

export interface AFinding { id: string; text: string }

export async function theOrganisationsOwnFindings(prisma: any, organizationId: string): Promise<AFinding[]> {
  if (!organizationId) return [];
  const rows: any[] = (await prisma.learningSignalCount?.findMany?.({ where: { scope: organizationId, judged: { gte: MIN_SIGNALS_BEFORE_A_FINDING } }, orderBy: { judged: 'desc' }, take: MOST_FINDINGS_REMEMBERED }).catch?.(() => [])) ?? [];
  return rows
    /* A row can only be this organisation's: the scope is its id, and the total's scope is never an organisation's id. */
    .filter((r) => r.scope === organizationId)
    .map((r) => {
      const [row] = plainLearningRows([r]);
      return { id: r.id as string, text: `${row.what.replace(/[.!?]+$/, '')}. ${row.counts.join(' ')}` };
    });
}
