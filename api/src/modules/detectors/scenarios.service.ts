import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScenarioCandidateState, GroundScenario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import {
  Candidate, CANDIDATE_LIFE_DAYS, COOLING_DAYS,
  newHire, roleHandover, newProject, drifting, sustainedConcern, cycleBoundary,
} from './a-conversation-the-record-suggests';
import { GroundworkEvents, ScenarioProposedEvent } from '../../common';

/**
 * PROPOSING A CONVERSATION, AND EVERY REASON NOT TO.
 *
 * The detection is next door and is pure. This is the part that writes, and almost all of it is
 * refusals: the post-import quiet period, the cooling window after a decline, and the rule that one
 * live suggestion about one thing is enough.
 *
 * The refusals matter more than the detection does. An assistant that suggests a conversation once
 * is useful; one that suggests the same conversation every night is the reason people turn features
 * off, and they do not turn just that one off.
 */
@Injectable()
export class ScenariosService {
  private readonly logger = new Logger(ScenariosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async propose(organizationId: string, now = new Date()) {
    const quiet = quietUntil(
      await this.prisma.detectionQuietPeriod.findMany({ where: { organizationId }, select: { endsAt: true } }),
      now,
    );
    if (quiet) {
      /* §13C.5 names scenario candidates specifically. An organisation that imported yesterday has
         no conversational data to ground a suggestion in, so every one would be about the import. */
      this.logger.log(`Scenario proposal quiet until ${quiet.toISOString()} for org ${organizationId}.`);
      return { ran: false, proposed: 0 };
    }

    await this.expireStale(organizationId, now);

    const [people, assignments, subjects, findings] = await Promise.all([
      this.prisma.person.findMany({
        where: { organizationId, active: true },
        select: { externalId: true, managerExternalId: true, active: true },
      }),
      this.prisma.roleAssignment.findMany({
        where: { organizationId },
        select: { id: true, personExternalId: true, roleName: true, startedAt: true, endedAt: true,
          predecessorAssignmentId: true, successor: { select: { personExternalId: true } } },
      }),
      this.prisma.subject.findMany({
        where: { organizationId, sourceDeletedAt: null },
        select: { externalId: true, title: true, ownerExternalId: true, contributorExternalIds: true,
          dueDate: true, createdAt: true },
      }),
      this.prisma.detectorResult.findMany({
        where: { organizationId, resolvedAt: null },
        select: { key: true, severity: true, personExternalId: true, subjectExternalId: true,
          firstSeenAt: true, lastSeenAt: true },
      }),
    ]);

    const assignmentRows = assignments.map((a) => ({
      personExternalId: a.personExternalId, roleName: a.roleName, startedAt: a.startedAt,
      endedAt: a.endedAt, predecessorAssignmentId: a.predecessorAssignmentId,
      successorPersonExternalId: a.successor?.personExternalId ?? null,
    }));
    const subjectRows = subjects.map((s) => ({
      externalId: s.externalId, title: s.title, ownerExternalId: s.ownerExternalId,
      contributorExternalIds: Array.isArray(s.contributorExternalIds) ? (s.contributorExternalIds as string[]) : [],
      dueDate: s.dueDate, createdAt: s.createdAt,
    }));

    /* Subjects anybody has already talked about, so NEW_PROJECT does not suggest a conversation
       about something the team has been discussing for a month. */
    const withHistory = new Set(
      (await this.prisma.contribution.findMany({
        where: { organizationId }, select: { subjectExternalId: true }, distinct: ['subjectExternalId'],
      })).map((c) => c.subjectExternalId),
    );

    const candidates: Candidate[] = [
      ...newHire(assignmentRows, people, now),
      ...roleHandover(assignmentRows, now),
      ...newProject(subjectRows, now, withHistory),
      ...drifting(findings, subjectRows),
      ...sustainedConcern(findings, people, now),
      ...cycleBoundary(subjectRows, now),
    ];

    let proposed = 0;
    for (const c of candidates) {
      if (await this.suppressed(organizationId, c, now)) continue;
      const row = await this.prisma.scenarioCandidate.create({
        data: {
          organizationId,
          scenario: c.scenario,
          subjectExternalId: c.subjectExternalId,
          personExternalId: c.personExternalId,
          evidence: { says: c.says, ...c.evidence } as any,
          confidence: c.confidence,
          proposedToPersonExternalId: c.proposeTo,
          expiresAt: new Date(now.getTime() + CANDIDATE_LIFE_DAYS * 86_400_000),
        },
      });
      this.events.emit(GroundworkEvents.SCENARIO_PROPOSED, {
        candidateId: row.id, organizationId, scenario: c.scenario,
      } as ScenarioProposedEvent);
      proposed += 1;
    }

    this.logger.log(`Org ${organizationId}: ${proposed} scenario(s) proposed from ${candidates.length} detected.`);
    return { ran: true, proposed, detected: candidates.length };
  }

  /**
   * THE THREE REASONS NOT TO ASK, AND THE ORDER THEY ARE CHECKED IN.
   *
   * A live proposal about the same thing beats everything: asking twice while somebody is still
   * deciding is the most obviously broken behaviour available. Then a recent decline, which is
   * somebody having already said no. Then an accepted one, because the conversation is happening.
   */
  private async suppressed(organizationId: string, c: Candidate, now: Date): Promise<boolean> {
    const about = {
      organizationId,
      scenario: c.scenario,
      subjectExternalId: c.subjectExternalId,
      personExternalId: c.personExternalId,
    };

    const live = await this.prisma.scenarioCandidate.findFirst({
      where: { ...about, state: ScenarioCandidateState.PROPOSED, expiresAt: { gt: now } },
    });
    if (live) return true;

    const declined = await this.prisma.scenarioCandidate.findFirst({
      where: {
        ...about,
        state: ScenarioCandidateState.DECLINED,
        resolvedAt: { gt: new Date(now.getTime() - COOLING_DAYS * 86_400_000) },
      },
    });
    if (declined) return true;

    const accepted = await this.prisma.scenarioCandidate.findFirst({
      where: { ...about, state: ScenarioCandidateState.ACCEPTED },
    });
    return !!accepted;
  }

  /**
   * Nobody answered. Expired, not declined - and the difference is load-bearing.
   *
   * A decline is somebody deciding, and it earns a long cooling window. Silence is somebody being
   * busy, and treating it as a refusal would let one unread notification bury a conversation the
   * record still thinks is needed. So an expired candidate is simply asked again if the situation
   * is still there next time.
   */
  private async expireStale(organizationId: string, now: Date) {
    const { count } = await this.prisma.scenarioCandidate.updateMany({
      where: { organizationId, state: ScenarioCandidateState.PROPOSED, expiresAt: { lte: now } },
      data: { state: ScenarioCandidateState.EXPIRED, resolvedAt: now },
    });
    if (count) this.logger.log(`Expired ${count} unanswered scenario proposal(s) for org ${organizationId}.`);
  }

  /** What is waiting on one person to decide. */
  async pendingFor(organizationId: string, personExternalId: string) {
    return this.prisma.scenarioCandidate.findMany({
      where: {
        organizationId, proposedToPersonExternalId: personExternalId,
        state: ScenarioCandidateState.PROPOSED, expiresAt: { gt: new Date() },
      },
      orderBy: [{ confidence: 'desc' }, { proposedAt: 'asc' }],
    });
  }

  /**
   * A HUMAN SAYING YES. This is the only thing in the product that turns a suggestion into a ground.
   *
   * The ground itself is created by whoever calls this with the answer, not here - this records the
   * decision and hands back what was suggested. Keeping the creation outside means the acceptance
   * record is written even if ground creation later fails, and an accepted-but-unbuilt suggestion is
   * visible rather than lost.
   */
  async decide(
    organizationId: string,
    candidateId: string,
    personExternalId: string,
    accept: boolean,
    groundId?: string,
  ) {
    const c = await this.prisma.scenarioCandidate.findFirst({ where: { id: candidateId, organizationId } });
    if (!c) throw new NotFoundException('No such suggestion.');
    if (c.proposedToPersonExternalId !== personExternalId) {
      /*
       * Only the person it was put to may answer it. A suggestion about somebody's performance
       * accepted by anybody who happened to have the id would be the whole "a human opens it"
       * guarantee undone by a missing where-clause.
       */
      throw new NotFoundException('No such suggestion.');
    }
    if (c.state !== ScenarioCandidateState.PROPOSED) {
      throw new BadRequestException(`That suggestion is already ${c.state.toLowerCase()}.`);
    }

    return this.prisma.scenarioCandidate.update({
      where: { id: c.id },
      data: {
        state: accept ? ScenarioCandidateState.ACCEPTED : ScenarioCandidateState.DECLINED,
        resolvedAt: new Date(),
        ...(accept && groundId ? { groundId } : {}),
      },
    });
  }
}
