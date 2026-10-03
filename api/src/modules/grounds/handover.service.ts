import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommitmentState, DependencyStatus } from '@prisma/client';
import { withoutCommitmentsFromGoalsNotToldYet } from './a-commitment-from-a-goal-not-told-is-not-read-by-its-person';
import { PrismaService } from '../prisma/prisma.service';
import { BoardService } from '../board/board.service';
import { DepartureService } from '../people/departure.service';
import { buildHandoverBrief, BriefInput, isEmpty } from './what-the-leaver-knew';
import { GroundworkEvents, HandoverReadyEvent } from '../../common';

/**
 * A ROLE CHANGING HANDS, AND THE ONE ORDERING CONSTRAINT THAT MATTERS.
 *
 * §13's ageing rule removes turn content after its window. The brief has to be built BEFORE that
 * runs against the leaver's data, or it is built from what is already gone - so the brief is
 * generated at the moment the assignment ends, stamped, and never regenerated. It describes a
 * moment, and regenerating it later would quietly produce a different and emptier one.
 */
@Injectable()
export class HandoverService {
  private readonly logger = new Logger(HandoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly board: BoardService,
    private readonly events: EventEmitter2,
    private readonly departures: DepartureService,
  ) {}

  /**
   * End an assignment, and hand the successor what is outstanding.
   *
   * The brief is attached to the SUCCESSOR's assignment, not the leaver's, because a handover is
   * something the incoming holder has rather than something the departing one is owed. The leaver
   * has gone; nobody is going to read a record filed against them.
   */
  async endAssignment(
    organizationId: string,
    assignmentId: string,
    opts: { successorPersonExternalId?: string; endedAt?: Date } = {},
  ) {
    const leaving = await this.prisma.roleAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });
    if (!leaving) throw new NotFoundException('No such role assignment.');
    if (leaving.endedAt) throw new BadRequestException('That assignment has already ended.');

    const endedAt = opts.endedAt ?? new Date();
    await this.prisma.roleAssignment.update({ where: { id: leaving.id }, data: { endedAt } });

    if (!opts.successorPersonExternalId) {
      /*
       * No successor is a real and common case - a role being retired, or nobody found yet. Building
       * a brief for nobody would be work that ages out unread, and a brief built now and read in
       * three months describes an organisation that has moved on.
       */
      this.logger.log(`Assignment ${leaving.id} ended with no successor; no brief built.`);
      /* Departure staging still runs. Nobody taking over does not make their open commitments any
         less misleading to whoever finds them. */
      await this.departures.onDeparture(organizationId, leaving.personExternalId, endedAt, leaving.roleName);
      return { ended: true, brief: null };
    }

    const brief = buildHandoverBrief(
      await this.gather(organizationId, leaving.personExternalId, leaving.roleName),
      endedAt,
    );

    const successor = await this.prisma.roleAssignment.create({
      data: {
        organizationId,
        personExternalId: opts.successorPersonExternalId,
        roleName: leaving.roleName,
        startedAt: endedAt,
        predecessorAssignmentId: leaving.id,
        handoverReadyAt: new Date(),
        handoverBrief: brief as any,
      },
    });

    this.events.emit(GroundworkEvents.HANDOVER_READY, {
      roleAssignmentId: successor.id,
      organizationId,
      empty: isEmpty(brief),
    } as HandoverReadyEvent);

    /*
     * AFTER THE BRIEF, NEVER BEFORE. §13C.1 is explicit: if a successor is named, the handover brief
     * generates before the turn ageing begins - otherwise the handover is built from data already
     * gone. Stage one closes commitments and collapses attributions and deletes nothing, so it is
     * safe here; stage two is on a clock and cannot run before the window closes anyway.
     */
    await this.departures.onDeparture(organizationId, leaving.personExternalId, endedAt, leaving.roleName);

    return { ended: true, brief, roleAssignmentId: successor.id };
  }

  /**
   * WHAT IS OUTSTANDING, GATHERED WITHOUT READING A SINGLE THING ANYBODY SAID.
   *
   * Every query here returns a promise made outward, a handoff, or a subject title. None of them
   * touches a turn, a record entry or an observation. That is the rule the brief exists under, and
   * keeping it true is a property of these queries rather than of anybody remembering it later.
   */
  private async gather(organizationId: string, personExternalId: string, roleName: string): Promise<BriefInput> {
    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: personExternalId },
      select: { email: true },
    });
    const key = person?.email?.toLowerCase() ?? null;

    /* A copy of a goal the lead never told the leaver about is not handed to the successor either (decisions 48 and 56). */
    const commitments = (await withoutCommitmentsFromGoalsNotToldYet(this.prisma, await this.prisma.commitment.findMany({
      where: { organizationId, personExternalId, state: { in: [CommitmentState.OPEN, CommitmentState.SLIPPED] } },
      select: { text: true, state: true, dueAt: true, statedAt: true, sourcePersonObjectiveId: true },
    }))).map(({ sourcePersonObjectiveId: _source, ...shown }) => shown);

    const { waiting } = await this.board.waitingAcrossTheOrg(organizationId);
    const mine = (side: 'from' | 'on') => waiting
      .filter((w) => (side === 'from' ? w.fromPersonKey : w.onPersonKey) === key)
      .map((w) => ({ what: w.what, status: w.status, waitingDays: w.waitingDays }));

    /*
     * Subjects the leaver was working on, by title. The link is `Contribution`, which already holds
     * who is carrying what - so this reads a derived count rather than going near the conversations
     * the count was derived from.
     */
    const contributions = await this.prisma.contribution.findMany({
      where: { organizationId, personExternalId },
      select: { subjectExternalId: true, lastSeenAt: true },
    });
    const subjects = contributions.length
      ? await this.prisma.subject.findMany({
        where: { organizationId, externalId: { in: contributions.map((c) => c.subjectExternalId) } },
        select: { externalId: true, title: true },
      })
      : [];
    const lastBySubject = new Map<string, Date>();
    for (const c of contributions) {
      const at = lastBySubject.get(c.subjectExternalId);
      if (!at || c.lastSeenAt > at) lastBySubject.set(c.subjectExternalId, c.lastSeenAt);
    }

    return {
      roleName,
      commitments,
      waitingOnOthers: key ? mine('from') : [],
      owedToOthers: key ? mine('on') : [],
      liveSubjects: subjects.map((s) => ({
        title: s.title,
        lastMentionedAt: lastBySubject.get(s.externalId) ?? new Date(0),
      })),
    };
  }

  /** Record somebody taking a role. The first holder has no predecessor and so no brief. */
  async startAssignment(organizationId: string, personExternalId: string, roleName: string, startedAt?: Date) {
    return this.prisma.roleAssignment.create({
      data: { organizationId, personExternalId, roleName, ...(startedAt ? { startedAt } : {}) },
    });
  }

  /** The brief as stored. Never rebuilt - see the note at the top of this class. */
  async get(organizationId: string, roleAssignmentId: string) {
    const a = await this.prisma.roleAssignment.findFirst({
      where: { id: roleAssignmentId, organizationId },
      select: { handoverBrief: true, handoverReadyAt: true, roleName: true, predecessorAssignmentId: true },
    });
    if (!a) throw new NotFoundException('No such role assignment.');
    if (!a.handoverBrief) {
      /*
       * Said as a fact about this assignment rather than as an error. Somebody who started a role
       * without taking it over from anyone has no handover, and that is not a failure to report.
       */
      return {
        roleName: a.roleName,
        brief: null,
        why: a.predecessorAssignmentId
          ? 'This assignment has a predecessor but no brief was built.'
          : 'Nobody held this role before, so there is nothing to hand over.',
      };
    }
    return { roleName: a.roleName, brief: a.handoverBrief, generatedAt: a.handoverReadyAt };
  }
}
