/**
 * THE LEAD'S MARK AND "WE TALKED IT THROUGH", ON WHAT THE RECORD SHOWS ABOUT A PERSON (decision 57, items 2 and 3; F2, 2 November
 * 2026). The lead reads layer 2, so that is what she marks: right, wrong or not sure, and talked through. Each is kept on the
 * person's newest assessment by the pattern's id, and carried to the next assessment with the rest of layer 2.
 *
 *   - Talked through moves her own waiting step (layer 3) on: the next assessment follows it up, and it worked when the pattern is
 *     not seen again. Today's nudge goes away.
 *   - Wrong is a correction (the first principle: once fixed, it stays fixed): its next steps end, and no new step starts from it.
 *
 * Only the person who runs the check-in (the ground's own lead), only where judgements of a person are on, and only a pattern
 * that holds. Anybody else gets the same refusal, so nobody can learn from this route whether anything is there.
 */
import { ForbiddenException } from '@nestjs/common';
import { theAssessmentIn, theColumnWith, type TheAssessment } from '../conversation/the-assessment';
import { thePersonJudgementsAreOnFor } from '../organisation/person-judgements';
import { theIdReadBack, theLeadsMarksOn, theNewestRecordOfEachPerson, theRecordAsServedPatterns } from './what-the-record-shows-the-lead';
import type { AnIntervention } from './the-next-step-for-each-pattern';
import type { AServedPattern, ALeadPatternMark } from './who-reads-a-pattern';

export type AChangeTheLeadMakes = { mark: ALeadPatternMark } | { talkedAbout: true };

/** Her steps for this pattern, with what her mark does to them. */
export function theStepsAfterHerMark(steps: AnIntervention[], key: string, change: AChangeTheLeadMakes): AnIntervention[] {
  return steps.map((i) => {
    if (i.key !== key || (i.state !== 'open' && i.state !== 'waiting for the lead')) return i;
    if ('mark' in change && change.mark === 'WRONG') return { ...i, state: 'ended' as const };
    if ('talkedAbout' in change && i.forWhom === 'the lead' && i.state === 'waiting for the lead') return { ...i, state: 'open' as const };
    return i;
  });
}

export async function theLeadMarksAPatternAcrossTime(prisma: any, id: string, userId: string, change: AChangeTheLeadMakes, now: Date = new Date()): Promise<AServedPattern> {
  const forbidden = () => new ForbiddenException('Only the person who runs this check-in can do that.');
  const which = theIdReadBack(id);
  if (!which) throw forbidden();
  const person = await prisma.groundParticipant?.findUnique?.({ where: { id: which.participantId }, select: { groundId: true, ground: { select: { initiatorId: true } } } }).catch?.(() => null);
  if (!person?.ground || person.ground.initiatorId !== userId) throw forbidden();
  if (!(await thePersonJudgementsAreOnFor(prisma, person.groundId))) throw forbidden();
  const [newest] = await theNewestRecordOfEachPerson(prisma, { participantIds: [which.participantId] });
  if (!newest || !theRecordAsServedPatterns([newest]).some((p) => p.id === id)) throw forbidden();

  const row = await prisma.checkIn.findUnique({ where: { id: newest.checkInId }, select: { sessionReport: true } });
  const a = theAssessmentIn(row?.sessionReport);
  if (!a) throw forbidden();
  const marks = theLeadsMarksOn(a);
  const before = marks[id] ?? {};
  marks[id] = 'mark' in change
    ? { ...before, mark: change.mark, markedAt: now.toISOString(), by: userId }
    : { ...before, talkedAboutAt: before.talkedAboutAt ?? now.toISOString(), by: before.by ?? userId };
  const interventions = theStepsAfterHerMark((Array.isArray(a.interventions) ? a.interventions : []) as AnIntervention[], which.key, change);
  const next = { ...a, theLeadsMarks: marks, interventions } as TheAssessment;
  await prisma.checkIn.update({ where: { id: newest.checkInId }, data: { sessionReport: theColumnWith(next, row?.sessionReport) as any } });
  return theRecordAsServedPatterns([{ ...newest, marks, interventions }]).find((p) => p.id === id)!;
}
