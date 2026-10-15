import { withoutCommitmentsFromGoalsNotToldYet } from '../grounds/a-commitment-from-a-goal-not-told-is-not-read-by-its-person';
import { Injectable } from '@nestjs/common';
import { CheckInStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ASession,
  RawMaterial,
  WhatIsTrue,
  whatIsTrueFor,
} from './what-is-true-for-this-person';
import { keptInTheApp, notFromAKeptCheckIn } from './a-check-in-kept-in-the-app-is-not-read-on-whatsapp';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';

/**
 * THE ONE READ.
 *
 * Assembled once and handed to whatever is answering, rather than each lane
 * fetching what it happens to need. See `what-is-true-for-this-person.ts` for
 * why, and for the three rules this has to hold.
 *
 * EVERY QUERY HERE IS SCOPED TO ONE PERSON, and that is the wall rather than a
 * note about the wall. There is no query in this file that selects a row
 * belonging to somebody else, so there is nothing to filter out afterwards and
 * nothing a model could be talked into revealing.
 */
@Injectable()
export class WhatIsTrueService {
  constructor(private readonly prisma: PrismaService) {}

  async forPerson(organizationId: string, personId: string): Promise<WhatIsTrue | null> {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true, displayName: true, email: true, linkedUserId: true },
    });
    if (!person) return null;
    /* On WhatsApp, nothing said in a check-in kept in the app (decision 82, item 7). Empty in the app. */
    const kept = await keptInTheApp(this.prisma as any, organizationId);

    const [subjects, commitments, sessions, decisions] = await Promise.all([
      this.prisma.subject.findMany({
        where: { organizationId, sourceDeletedAt: null },
        select: {
          title: true, measure: true, target: true, dueDate: true,
          justification: true, approach: true,
          ownerExternalId: true, contributorExternalIds: true,
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.commitment.findMany({
        where: { organizationId, personExternalId: person.externalId, ...notFromAKeptCheckIn(kept, 'sourceGroundId') },
        select: { text: true, dueSaid: true, state: true, sourcePersonObjectiveId: true },
        orderBy: { statedAt: 'desc' },
      }).then((rows) => withoutCommitmentsFromGoalsNotToldYet(this.prisma, rows)),
      this.sessionsFor(organizationId, person),
      this.prisma.knowledgeCard.findMany({
        /* `effectiveTo: null` is the current version — exactly one per key has
           it. Reading superseded cards would answer today's question with a
           decision the company has already changed. */
        where: { organizationId, effectiveTo: null },
        select: { key: true, title: true },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);

    /* Theirs, or somebody else's that names them. Anything else is not about
       them and does not belong in an assembly of what is true FOR them. */
    const mine = subjects.filter(
      (s) =>
        s.ownerExternalId === person.externalId
        || (Array.isArray(s.contributorExternalIds)
          && (s.contributorExternalIds as unknown[]).includes(person.externalId)),
    );

    const raw: RawMaterial = {
      person: { externalId: person.externalId, displayName: person.displayName },
      objectives: mine.map((s) => ({
        title: s.title,
        measure: s.measure,
        target: s.target,
        dueDate: s.dueDate,
        justification: s.justification,
        approach: s.approach,
        theirs: s.ownerExternalId === person.externalId,
      })),
      commitments: commitments.map((c) => ({ text: c.text, dueSaid: c.dueSaid, state: c.state })),
      sessions,
      decisions: decisions.map((d) => ({ key: d.key, title: d.title })),
    };

    return whatIsTrueFor(raw);
  }

  /**
   * The three states a session can be in for one person, in one place.
   *
   * This existed three times by the end of one day — in the API, in a lane and
   * in the panel — and they had already drifted: the first matched only on the
   * account and returned an empty list to somebody with a session in front of
   * them, because a participant is linked to an account only when they ACCEPT.
   */
  private async sessionsFor(
    organizationId: string,
    person: { externalId: string; email: string | null; linkedUserId: string | null },
  ): Promise<ASession[]> {
    const [toStart, checkIns] = await Promise.all([
      person.linkedUserId
        ? this.prisma.ground.findMany({
            where: { organizationId, initiatorId: person.linkedUserId, status: 'AWAITING_LEAD' },
            select: { id: true, label: true, scenario: true },
          })
        : Promise.resolve([]),
      this.prisma.checkIn.findMany({
        where: {
          participant: {
            ground: { organizationId },
            OR: [
              ...(person.linkedUserId ? [{ userId: person.linkedUserId }] : []),
              ...(person.email ? [{ userId: null, email: person.email }] : []),
            ],
          },
          status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] },
        },
        include: { participant: { include: { ground: { select: { id: true, label: true, scenario: true } } } } },
        orderBy: { availableFrom: 'asc' },
      }),
    ]);

    const now = new Date();

    return [
      ...toStart.map((g): ASession => ({
        checkInId: null,
        groundId: g.id,
        label: g.label,
        standing: 'waiting on you to start',
        aboutOnePerson: isEvaluationCheckIn((g as any).scenario),
      })),
      ...checkIns
        /* Not yet open is not the same as nothing, and it is not something to
           offer either — so it is simply not a session that is true for them
           right now. The date is the product's, not a judgement. */
        .filter((c) => c.status === CheckInStatus.IN_PROGRESS || !c.availableFrom || c.availableFrom <= now)
        .map((c): ASession => ({
          checkInId: c.id,
          groundId: c.participant.ground.id,
          label: c.participant.ground.label,
          standing: c.participant.userId === null ? 'invitation not accepted' : 'open to you',
          aboutOnePerson: isEvaluationCheckIn((c.participant.ground as any).scenario),
        })),
    ];
  }
}
