/**
 * A PERSON'S OWN WORDS ABOUT THEIR TARGET FOLLOW THE CHECK-IN'S TARGET SETTING (Hafsah, 4 November 2026: "if each person sees only
 * their own target, what they say about it is seen only by them and the lead, even in a shared check-in").
 *
 * Their words about an aim are the record's SUCCESS_DEFINITION lines, written from their assessment's targets (the one writer,
 * the-record-from-the-assessment.ts). Where each person sees only their own target, a colleague's are left out of what a team member
 * reads; the lead, and the admin who runs the check-in, read them all. The facts read from the assessments follow the same rule in
 * mayRead (the-facts-on-record.ts).
 *
 * A Prisma `where` fragment, so it is applied where colleagues' record lines are read and nothing downstream has to remember it.
 */
import { RecordEntryType } from '@prisma/client';

export function theLinesAboutAColleaguesTargetLeftOut(
  whoSeesTargets: string | null | undefined,
  me: { id: string } | null | undefined,
  viewerRunsIt: boolean,
): Record<string, unknown> {
  if (viewerRunsIt || whoSeesTargets === 'EVERYBODY') return {};
  return { NOT: { type: RecordEntryType.SUCCESS_DEFINITION, ...(me?.id ? { participantId: { not: me.id } } : {}) } };
}
