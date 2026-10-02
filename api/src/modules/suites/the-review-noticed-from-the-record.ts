import type { PrismaService } from '../prisma/prisma.service';
import { theEndingSaid, theOutcomeIsThat } from '../resolution/end-states';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';

/**
 * "WHAT GROUNDWORK NOTICED" FOR A REVIEW, WRITTEN FROM THE RECORD (week 11; the prototype's
 * #/suite/reviews). Plain facts, marked as the prototype marks them, and never a rating, a label or a
 * verdict. Written once, when the person who writes the review says yes and starts it.
 *
 * What goes in is only what the person may read about themselves, because the same lines are served
 * to them: how each check-in about them that has ended was decided, who decided it, and the reason
 * they gave. Those are the record, so they are marked "proven". Nothing here counts what a person
 * kept or missed (that count is the person's alone, decision 24), reads what anybody said in a
 * check-in, reads a pattern, or reads hours or leave (decisions rule 10).
 *
 * A line that comes from an evaluation check-in (a plan, a promotion, a renewal) is marked `private`,
 * and the review serves it only to the person it is about and the person who writes it, so an admin
 * who was not given access to that check-in (decision 5) does not read it through the review.
 */
export interface ANoticedLine { says: string; mark: 'proven'; private?: true }

const DAYS_IN_WORDS = (d: Date) => whenItWas(d, 'full', 'UTC');

export async function whatGroundworkNoticed(
  prisma: PrismaService,
  organizationId: string,
  linkedUserId: string | null | undefined,
): Promise<ANoticedLine[]> {
  if (!linkedUserId) return [];
  const closed: any[] = await prisma.resolution.findMany({
    where: { closedAt: { not: null }, ground: { organizationId, participants: { some: { userId: linkedUserId } } } },
    orderBy: { closedAt: 'desc' },
    take: 6,
    select: {
      endState: true, reason: true, closedAt: true,
      ground: { select: { label: true, scenario: true, initiatorId: true, participants: { select: { userId: true, user: { select: { firstName: true } } } } } },
    },
  });
  const lines: ANoticedLine[] = [];
  for (const r of closed) {
    const g = r.ground;
    if (!g || !r.closedAt) continue;
    const lead = (g.participants ?? []).find((p: any) => p.userId === g.initiatorId)?.user?.firstName?.trim() || 'The person who ran it';
    const outcome = theEndingSaid(g.scenario, r.endState);
    if (!outcome) continue;
    const why = (r.reason ?? '').trim().replace(/[.!?\s]+$/, '');
    /* The ending is its own plain sentence (decision 75, item 48), so it is said as one, not quoted as a label. */
    const says = `${lead} made the decision at the end of “${g.label}” on ${DAYS_IN_WORDS(new Date(r.closedAt))}${why ? `, and said why, “${why}”` : ''}. ${theOutcomeIsThat(outcome)}`;
    lines.push({ says, mark: 'proven', ...(isEvaluationCheckIn(g.scenario) ? { private: true as const } : {}) });
  }
  return lines;
}
