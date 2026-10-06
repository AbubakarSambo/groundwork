import { recordTheStrategy } from '../subjects/the-strategy-over-time';
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DraftParticipantState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  whatToAskForNext,
  whyThisIsNotReadyToSeed,
  whyThatIsNotAnAnswer,
  type MissingPiece,
} from './a-number-nobody-argued-for';
import {
  isContested, canFinish, sayContention, CONTESTABLE_FIELDS, ContestableField, Position,
} from './it-does-not-average-and-it-does-not-defer';

/**
 * WRITING AN OBJECTIVE WITH OTHER PEOPLE, WITHOUT A MEETING.
 *
 * Somebody starts thinking about next quarter. The draft is grounded from the first turn in what
 * the last cycle actually produced - what slipped, what blocked delivery, what nobody picked up -
 * rather than in whoever remembers most loudly. They pull colleagues in; each answers in their own
 * conversation; what they say feeds the same emerging objective.
 *
 * EACH CONTRIBUTOR'S CONVERSATION IS THEIR OWN. They see the draft as it stands and never each
 * other's turns. What crosses between them is the draft and the disagreements, which is the part
 * they are trying to settle - not a transcript of each other.
 */
@Injectable()
export class DraftsService {
  private readonly logger = new Logger(DraftsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * START ONE, GROUNDED IN WHAT ACTUALLY HAPPENED.
   *
   * The findings are attached at creation rather than looked up later, because "why is the target
   * fourteen days" needs an answer six months from now and the findings by then may be resolved,
   * superseded or closed. A draft carries its own reasons.
   */
  async start(organizationId: string, initiatorExternalId: string, dto: {
    workingTitle: string;
    parentSubjectExternalId?: string | null;
    proposedMeasure?: string | null;
    proposedTarget?: string | null;
  }) {
    if (!dto?.workingTitle?.trim()) throw new BadRequestException('A working title is needed to start - it can change.');

    /* Whatever the last cycle left behind about this area, so the draft opens informed. */
    const grounded = await this.prisma.detectorResult.findMany({
      where: {
        organizationId, resolvedAt: null,
        ...(dto.parentSubjectExternalId ? { subjectExternalId: dto.parentSubjectExternalId } : {}),
      },
      select: { id: true },
      take: 20,
    });

    return this.prisma.objectiveDraft.create({
      data: {
        organizationId, initiatorExternalId,
        workingTitle: dto.workingTitle.trim(),
        parentSubjectExternalId: dto.parentSubjectExternalId ?? null,
        proposedMeasure: dto.proposedMeasure ?? null,
        proposedTarget: dto.proposedTarget ?? null,
        groundedOnFindingIds: grounded.map((g) => g.id),
      },
    });
  }

  /** Pulling somebody in. Their own conversation, not a copy of anybody else's. */
  async invite(organizationId: string, draftId: string, byExternalId: string, personExternalId: string) {
    const draft = await this.mine(organizationId, draftId, byExternalId);
    if (draft.state === 'SEEDED' || draft.state === 'ABANDONED') {
      throw new BadRequestException('That draft is finished.');
    }
    await this.prisma.draftParticipant.upsert({
      where: { draftId_personExternalId: { draftId, personExternalId } },
      create: { draftId, personExternalId, invitedByExternalId: byExternalId },
      update: {},
    });
    if (draft.state === 'DRAFTING') {
      await this.prisma.objectiveDraft.update({ where: { id: draftId }, data: { state: 'GATHERING' } });
    }
    return { invited: personExternalId };
  }

  /**
   * WHAT SOMEBODY SAID ABOUT ONE FIELD, AND WHETHER IT DISAGREES WITH ANYBODY.
   *
   * The contention check runs here rather than at finish time, because a disagreement discovered at
   * the moment somebody is trying to seed is a disagreement discovered too late to feel like
   * anything but an obstacle.
   */
  async contribute(organizationId: string, draftId: string, personExternalId: string, field: string, body: string) {
    const draft = await this.mine(organizationId, draftId, personExternalId);
    if (!body?.trim()) throw new BadRequestException('Say what you think it should be.');
    const f = (CONTESTABLE_FIELDS as readonly string[]).includes(field) ? (field as ContestableField) : 'general';

    await this.prisma.draftContribution.create({
      data: { draftId, personExternalId, field: f, body: body.trim() },
    });
    await this.prisma.draftParticipant.updateMany({
      where: { draftId, personExternalId },
      data: { state: 'RESPONDED', respondedAt: new Date() },
    });

    if (f === 'general') return { recorded: true, contention: null };

    /*
     * The initiator's own proposal is a position like any other. Leaving it out would be exactly
     * the deference this design exists to refuse - their version would never be the one contested.
     */
    const positions: Position[] = [];
    const proposed = f === 'measure' ? draft.proposedMeasure
      : f === 'target' ? draft.proposedTarget
      : f === 'title' ? draft.workingTitle
      : draft.proposedDueDate?.toDateString() ?? null;
    if (proposed) positions.push({ personExternalId: draft.initiatorExternalId, body: proposed });

    const others = await this.prisma.draftContribution.findMany({
      where: { draftId, field: f },
      orderBy: { createdAt: 'desc' },
    });
    for (const o of others) positions.push({ personExternalId: o.personExternalId, body: o.body });

    if (!isContested(positions)) return { recorded: true, contention: null };

    const existing = await this.prisma.draftContention.findFirst({
      where: { draftId, field: f, resolvedAt: null },
    });
    const saysIt = sayContention(f, positions);
    if (existing) {
      await this.prisma.draftContention.update({ where: { id: existing.id }, data: { positions: positions as any } });
      return { recorded: true, contention: { id: existing.id, field: f, says: saysIt } };
    }

    const opened = await this.prisma.draftContention.create({
      data: { draftId, field: f, positions: positions as any },
    });
    await this.prisma.objectiveDraft.update({ where: { id: draftId }, data: { state: 'CONTESTED' } });
    this.logger.log(`Draft ${draftId} contested on ${f}.`);
    return { recorded: true, contention: { id: opened.id, field: f, says: saysIt } };
  }

  /**
   * ANSWERING THE NEXT QUESTION THE DRAFT IS ASKING.
   *
   * Separate from `contribute`, which is how a SECOND person disagrees with a
   * proposal and opens a contention. This is the draft being filled in — the
   * first four answers, in order, each refused if it is a way of getting past
   * the question rather than answering it.
   *
   * The two are different acts and collapsing them would break the good half:
   * a contention exists because two people said different things, and an empty
   * field is not a disagreement.
   */
  async answer(
    organizationId: string,
    draftId: string,
    personExternalId: string,
    piece: MissingPiece,
    body: string,
  ) {
    const draft = await this.mine(organizationId, draftId, personExternalId);

    const notAnAnswer = whyThatIsNotAnAnswer(piece, body ?? '', {
      measure: draft.proposedMeasure,
      target: draft.proposedTarget,
    });
    if (notAnAnswer) throw new BadRequestException(notAnAnswer);

    const field = {
      measure: 'proposedMeasure',
      target: 'proposedTarget',
      justification: 'proposedJustification',
      approach: 'proposedApproach',
    }[piece];

    const updated = await this.prisma.objectiveDraft.update({
      where: { id: draftId },
      data: { [field]: body.trim() },
    });

    /* Recorded as a contribution too, so who said what survives the draft. The
       objective that lands says why; this says who said why. */
    await this.prisma.draftContribution.create({
      data: {
        draftId,
        personExternalId,
        field: piece === 'measure' || piece === 'target' ? piece : 'general',
        body: `${piece}: ${body.trim()}`,
      },
    });

    return { recorded: true, askNext: whatToAskForNext(updated) };
  }

  /**
   * SETTLING ONE, WHICH IS A DECISION SOMEBODY MAKES RATHER THAN A STATE THAT DECAYS.
   *
   * The resolution is written onto the field it settles, so agreeing and then not applying it
   * cannot happen - which is the ordinary way a decision made in a conversation evaporates.
   */
  async resolveContention(organizationId: string, draftId: string, contentionId: string, resolution: string, byExternalId?: string) {
    const draft = await this.mine(organizationId, draftId, byExternalId);
    if (!resolution?.trim()) throw new BadRequestException('Say what it is, rather than only that it is settled.');

    const c = await this.prisma.draftContention.findFirst({ where: { id: contentionId, draftId, resolvedAt: null } });
    if (!c) throw new NotFoundException('No open disagreement under that id.');

    await this.prisma.draftContention.update({
      where: { id: c.id },
      data: { resolvedAt: new Date(), resolution: resolution.trim() },
    });

    const field = c.field as ContestableField;
    const patch = field === 'measure' ? { proposedMeasure: resolution.trim() }
      : field === 'target' ? { proposedTarget: resolution.trim() }
      : field === 'title' ? { workingTitle: resolution.trim() }
      : {};

    const stillOpen = await this.prisma.draftContention.count({ where: { draftId, resolvedAt: null } });
    await this.prisma.objectiveDraft.update({
      where: { id: draftId },
      data: { ...patch, state: stillOpen ? 'CONTESTED' : 'GATHERING' },
    });
    return { resolved: true, stillOpen };
  }

  /** The draft as it stands, with why it cannot be finished when it cannot. */
  async status(organizationId: string, draftId: string, byExternalId?: string) {
    const draft = await this.mine(organizationId, draftId, byExternalId);
    const contentions = await this.prisma.draftContention.findMany({ where: { draftId } });
    const open = contentions.filter((c) => !c.resolvedAt);
    const verdict = canFinish({
      state: draft.state,
      proposedMeasure: draft.proposedMeasure,
      proposedTarget: draft.proposedTarget,
      openContentionFields: open.map((c) => c.field),
    });
    /*
     * READY HAS TO MEAN WHAT SEED MEANS.
     *
     * `canFinish` answers whether anybody still disagrees. Seeding also refuses
     * a draft nobody has justified — so a status saying `ready: true` while the
     * seed refuses would be the screen and the act disagreeing about the same
     * draft, which is worse than either refusal on its own.
     */
    const unjustified = whyThisIsNotReadyToSeed(draft);

    return {
      draft: {
        id: draft.id, workingTitle: draft.workingTitle, state: draft.state,
        proposedMeasure: draft.proposedMeasure, proposedTarget: draft.proposedTarget,
        proposedJustification: draft.proposedJustification,
        proposedApproach: draft.proposedApproach,
        groundedOnFindingIds: draft.groundedOnFindingIds,
      },
      openContentions: open.map((c) => ({ id: c.id, field: c.field, positions: c.positions })),
      ...verdict,
      ...(verdict.ready && unjustified ? { ready: false as const, because: unjustified } : {}),
      /* What it is asking for next, and the question in the words it asks it.
         The screen and the assistant read this same field, so they cannot ask
         the same thing differently — or forget a fifth question added later. */
      askNext: whatToAskForNext(draft),
    };
  }

  /**
   * SEEDING OUT, and the gate is the whole of it.
   *
   * A draft with an unsettled disagreement about its measure cannot become an objective, and there
   * is no flag to skip it. Somebody wanting past this has to go and agree with a colleague, which
   * is the mechanism working rather than the mechanism obstructing.
   */
  async seed(organizationId: string, draftId: string, externalId: string, sourceSystem: string, byExternalId?: string) {
    const s = await this.status(organizationId, draftId, byExternalId);
    if (!s.ready) throw new BadRequestException(s.because);

    const draft = await this.mine(organizationId, draftId, byExternalId);

    /*
     * AGREEMENT IS NOT THE SAME AS THE OBJECTIVE BEING ANY GOOD.
     *
     * `status` folds this in too, so the screen and this act agree. Checked
     * again here because this is the line that writes the objective, and a
     * caller reaching it another way must not get past it.
     */
    const unjustified = whyThisIsNotReadyToSeed(draft);
    if (unjustified) throw new BadRequestException(unjustified);

    /*
     * THE PEOPLE WHO AGREED IT ARE THE CONTRIBUTORS, AND THE SEED WAS DROPPING THEM.
     *
     * A draft exists because several people worked out an objective together. It seeded an owner and
     * nobody else, so the objective arrived looking like one person's — losing the one fact that
     * makes a drafted objective different from an assigned one.
     *
     * It also broke the step after this without either being obviously connected: the suggestion
     * that proposes a check-in about new work requires TWO OR MORE contributors, so an objective
     * six people agreed could never produce one. "Once we have objectives, check in on them" was
     * failing on an empty array.
     *
     * RESPONDED ONLY, and the enum is why this is written positively rather than as "not invited".
     * DECLINED is a first-class state here — saying no is an answer — and it is also not INVITED, so
     * excluding silence by exclusion would have recorded everybody who refused this objective as a
     * contributor to it. Naming the one state that means agreement is the only version of this that
     * cannot go wrong when a fourth state is added.
     */
    const contributors = await this.prisma.draftParticipant.findMany({
      where: { draftId, state: DraftParticipantState.RESPONDED },
      select: { personExternalId: true },
    });
    const contributorExternalIds = [
      ...new Set([
        draft.initiatorExternalId,
        ...contributors.map((c) => c.personExternalId),
      ]),
    ].filter((id) => id !== (draft.proposedOwnerExternalId ?? draft.initiatorExternalId));

    const subject = await this.prisma.subject.upsert({
      where: { organizationId_sourceSystem_externalId: { organizationId, sourceSystem, externalId } },
      create: {
        organizationId, sourceSystem, externalId, type: 'OBJECTIVE',
        title: draft.workingTitle,
        measure: draft.proposedMeasure,
        target: draft.proposedTarget,
        /* Carried onto the objective rather than left behind in the draft. The
           reason a target exists is the first thing to go missing, and it is
           needed most in the check-in where the target is being missed. */
        justification: draft.proposedJustification,
        approach: draft.proposedApproach,
        ownerExternalId: draft.proposedOwnerExternalId ?? draft.initiatorExternalId,
        contributorExternalIds,
        parentExternalId: draft.parentSubjectExternalId,
        /*
         * `self` rather than `imported`. Everybody on this draft was demonstrably in the
         * conversation, which is the one case where work arriving in the system is known to have
         * been agreed rather than assigned - and an objective people agreed to must never render
         * the same as one that appeared on their list.
         */
        authoredBy: 'self',
      },
      update: {
        title: draft.workingTitle, measure: draft.proposedMeasure, target: draft.proposedTarget,
        justification: draft.proposedJustification, approach: draft.proposedApproach,
        contributorExternalIds,
        authoredBy: 'self',
      },
    });

    await this.prisma.objectiveDraft.update({
      where: { id: draftId },
      data: { state: 'SEEDED', seededSubjectExternalId: subject.externalId },
    });
    /* An agreed objective may be a new priority: keep a new version of the strategy if so (the-strategy-over-time.ts). */
    await recordTheStrategy(this.prisma, organizationId);
    return { seeded: true, subjectExternalId: subject.externalId };
  }

  /**
   * MINE MEANS MINE. This resolved a draft on `{ id, organizationId }` and nothing else, so anybody in
   * the organisation with a draft's id could read its status, settle its disagreements and seed it
   * into an objective. The three panel routes that did not pass the caller now do; a draft is the
   * business of the person who started it and the people pulled into it.
   *
   * A machine credential passes nobody, and reads by the organisation's scope alone: it is the
   * customer's own system, not a person on the panel, and the scope it carries is the decision.
   */
  private async mine(organizationId: string, draftId: string, byExternalId?: string) {
    const d = await this.prisma.objectiveDraft.findFirst({
      where: {
        id: draftId,
        organizationId,
        ...(byExternalId
          ? { OR: [{ initiatorExternalId: byExternalId }, { participants: { some: { personExternalId: byExternalId } } }] }
          : {}),
      },
    });
    if (!d) throw new NotFoundException('No such draft.');
    return d;
  }
}
