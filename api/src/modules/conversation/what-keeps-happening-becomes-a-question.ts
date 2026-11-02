import { theAssessmentIn } from './the-assessment';
import { theRecordAcrossTimeIn } from '../patterns/patterns-across-the-assessments';

/**
 * WHAT THE NEXT CHECK-IN CARRIES FROM THE RECORD (F2, Hafsah's decisions of 2 November 2026; her corrections, change 2c).
 *
 * One owner: layer 2's `toAskNextTime` for this person, kept on their newest assessment (patterns-across-the-assessments.ts).
 * It holds what the record cannot settle (a promise they did not say anything about, a claim nobody has seen proof of yet, what
 * the last check-in left open) and what they said last time that matters (each wait still open, each promise of their own), to
 * confirm with them. Silence is never a finding: "not on record" becomes a natural question here, and never a line for the lead.
 *
 * This replaced the stored-pattern probe (one question from a PatternDetection code seen in three periods) and the context
 * block's "sharpen these questions" from the same rows: a stored pattern no longer shapes what a person is asked.
 */

/** Layer 2's questions for this person, from their newest assessment before this check-in. */
export async function whatToAskThemThisTime(prisma: any, participantId: string, sessionNumber: number): Promise<string[]> {
  const rows = ((await prisma.checkIn?.findMany?.({
    where: { participantId, sessionNumber: { lt: sessionNumber } },
    orderBy: { sessionNumber: 'desc' },
    select: { sessionReport: true },
    take: 3,
  })?.catch?.(() => [])) ?? []) as { sessionReport: unknown }[];
  for (const r of rows) {
    const record = theRecordAcrossTimeIn(theAssessmentIn(r.sessionReport));
    if (record) return (record.toAskNextTime ?? []).filter((q) => typeof q === 'string' && q.trim());
  }
  return [];
}

/** What goes into the prompt, or nothing. */
export function whatToAskThisTimeBlockFor(questions: string[]): string {
  if (!questions.length) return '';
  return `WHAT TO ASK THIS TIME, FROM THE RECORD

These come from what this person told you before. Some are things the record cannot settle yet. Some are what they said
last time, to confirm with them. Ask each one in your own words, as an ordinary question about the work, one at a time,
where it fits, and before you offer to wrap up. Leave out any they have already answered in this check-in.

${questions.map((q) => `- ${q}`).join('\n')}

If they say something was recorded wrong, take their correction and ask what shows it, the same way as any claim. Never say
the record is missing something, never say they forgot or did not mention it, and never tell them they have a habit or a
pattern.`;
}
