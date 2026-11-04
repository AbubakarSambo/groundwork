import { RecordEntryType } from '@prisma/client';

/**
 * A PERSON'S OWN WORDS ABOUT THEIR TARGET FOLLOW THE CHECK-IN'S TARGET SETTING (Hafsah, 4 November 2026).
 *
 * "If each person sees only their own target, what they say about it is seen only by them and the lead, even in a shared
 * check-in." A person's words about what they are aiming at are the record's SUCCESS_DEFINITION lines. Where each person sees
 * only their own target (`whoSeesTargets: THEIR_OWN`), a colleague's are left out of what a person taking part reads. The lead,
 * and whoever else reads every target on this check-in (an admin, by decision 86), read them all, as the board's aims do.
 *
 * A Prisma `where` fragment, so it is applied where colleagues' record lines are read and nothing downstream has to remember it.
 */
export function theLinesAboutAColleaguesTargetLeftOut(
  whoSeesTargets: string | null | undefined,
  me: { id: string } | null | undefined,
  readsEveryTarget: boolean,
): Record<string, unknown> {
  if (readsEveryTarget || whoSeesTargets === 'EVERYBODY') return {};
  return { NOT: { type: RecordEntryType.SUCCESS_DEFINITION, ...(me?.id ? { participantId: { not: me.id } } : {}) } };
}
