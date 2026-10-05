import { Injectable, Logger, Optional, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readsAsAnAdmin, WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS } from '../grounds/who-may-read-this-check-in';
import { PrismaService } from '../prisma/prisma.service';
import { IntelligenceService } from '../intelligence';
import { ReportsService } from '../reports';
import { EmailService } from '../email/email.service';
import { endStatesFor, isValidEndState, closingNeedsEveryone } from './end-states';
import { GroundStatus, PartyType } from '@prisma/client';
import { SuggestionsService } from '../suggestions/suggestions.service';
import { ReviewsProposedService } from '../suites/the-reviews-proposed.service';
import { theEndingPageFor } from './what-the-ending-page-reads';
import { whoTheEndingIsAbout } from './who-the-ending-is-about';
import { labelsForParties, namesVisibleTo, displayName, plainWordsByPerson, atTheStart } from '../reports/party-labels';

/**
 * Resolution. A ground closes only when every ACTIVE party confirms the SAME
 * end state - no party has unilateral authority (Part 8 / cofounder framework).
 * "Active" = a party who accepted their invite (userId set); invited-but-never-
 * accepted no-shows never gate closure. Per-party choices are tracked in
 * ResolutionConfirmation, so this works identically for two-party grounds and
 * for multi-party (project / team) grounds.
 *
 * On close: billing stops automatically (status leaves ACTIVE), the outcome is
 * recorded for the learning loop, and the record is permanent (nothing is
 * deleted; all parties keep access).
 */
@Injectable()
export class ResolutionService {
  private readonly logger = new Logger(ResolutionService.name);

  constructor(
    private prisma: PrismaService,
    private intelligence: IntelligenceService,
    private reports: ReportsService,
    private email: EmailService,
    private config: ConfigService,
    @Optional() private suggestions?: SuggestionsService,
    @Optional() private reviewsProposed?: ReviewsProposedService,
  ) {}

  /**
   * READING IT IS NOT DECIDING IT. Proposing and confirming stay with the parties; reading what was
   * decided is open to whoever runs the check-in, which includes an organisation's admin. It was
   * party-only, so the one page that shows the outcome answered 403 to the admin who is told on the
   * same screen that they can see everything here - and the report drew "Resolution · not set yet"
   * over a check-in that had ended.
   */
  async get(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { id: true, organizationId: true, initiatorId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const isParty = !!(await this.prisma.groundParticipant.findFirst({ where: { groundId, userId }, select: { id: true } }));
    if (!isParty) {
      const admin = await this.prisma.user.findFirst({
        where: { id: userId, organizationId: ground.organizationId, role: 'ADMIN' },
        select: { role: true, organizationId: true },
      });
      /* An admin reads the outcome of a performance plan, a promotion or a renewal only when given access
         (decision 5, request 78), or when asked to approve it (decision 75, item 2); otherwise it is as if
         there were no such check-in. Reading only: proposing and confirming below are unchanged. */
      if (!admin || !readsAsAnAdmin({ ...admin, userId }, ground)) throw new ForbiddenException('You are not part of this check-in.');
    }
    return { ...(await this.buildState(groundId, userId)), theEndingPage: await theEndingPageFor({ prisma: this.prisma, suggestions: this.suggestions }, groundId, userId) };
  }

  /**
   * Propose or confirm an end state. Each party's choice is recorded as their
   * confirmation. The ground closes when every active party has confirmed and
   * they all chose the same end state. If they diverge, the divergence is
   * surfaced (in the returned state) and the ground stays open.
   */
  async propose(groundId: string, userId: string, endState: string, reason?: string) {
    const { ground, participant } = await this.assertParty(groundId, userId);

    if (ground.status === GroundStatus.CLOSED || ground.status === GroundStatus.RESOLVED) {
      throw new BadRequestException('This check-in is already resolved');
    }
    if (!isValidEndState(ground.scenario, endState)) {
      throw new BadRequestException(`"${endState}" is not a valid end state for this scenario`);
    }

    /**
     * ON A GROUND WITH A SUBJECT, THE DECISION IS THE LEAD'S.
     *
     * A new hire was being shown "Let them go" and asked to pick it, and the
     * ground could not close until he picked the same option as his manager.
     * He was handed a choice about his own dismissal and a veto over an
     * employment decision that was never his.
     *
     * He still sees the options and what is coming, and keeps every other voice
     * he had - his own account, his own corrections, the record standing beside
     * his manager's. What he does not get is a button asking him to agree to his
     * own exit.
     *
     * Cofounders and other peers are untouched: they still both have to agree.
     */
    if (!closingNeedsEveryone(ground.scenario) && participant.partyType !== PartyType.INITIATOR) {
      throw new ForbiddenException(
        'In this check-in, the lead decides how it ends. Your account and your corrections stand on the record beside theirs.',
      );
    }

    /**
     * A PERSON DECIDES, GIVING A REASON (decisions rule 6, U.11).
     *
     * The lead's answer closes the check-in, so it is the decision, and a decision is never recorded
     * without why. The people in the check-in read the reason with the outcome ("Kwame reads this
     * with the outcome."). Checked here, not only on the screen, so no other way in can close a
     * check-in on a bare outcome.
     */
    const why = (reason ?? '').trim();
    if (!why) {
      throw new BadRequestException(
        'Say why, in a sentence or two. The people in this check-in read it with the outcome.',
      );
    }

    // GW-16: detect a proposal change BEFORE upserting so we can clear stale
    // confirmations. Silent stale confirmations on a superseded end state would
    // produce a false consensus - any party that already confirmed must re-confirm
    // the new proposal explicitly.
    const existingResolution = await this.prisma.resolution.findUnique({
      where: { groundId },
      select: { id: true, endState: true },
    });
    const endStateIsChanging = existingResolution !== null && existingResolution.endState !== endState;

    // The Resolution row holds the latest leading proposal; per-party choices
    // live in ResolutionConfirmation.
    const resolution = await this.prisma.resolution.upsert({
      where: { groundId },
      create: { groundId, endState, reason: why },
      update: { endState, reason: why },
    });

    if (endStateIsChanging) {
      await this.prisma.resolutionConfirmation.deleteMany({
        where: { resolutionId: resolution.id, participantId: { not: participant.id } },
      });
    }

    await this.prisma.resolutionConfirmation.upsert({
      where: { resolutionId_participantId: { resolutionId: resolution.id, participantId: participant.id } },
      create: { resolutionId: resolution.id, participantId: participant.id, endState },
      update: { endState, confirmedAt: new Date() },
    });

    // Recompute against ACTIVE parties only (accepted the invite).
    const active = await this.prisma.groundParticipant.findMany({
      where: { groundId, userId: { not: null } },
      select: { id: true, email: true, roleAsDescribed: true },
    });
    const confirmations = await this.prisma.resolutionConfirmation.findMany({ where: { resolutionId: resolution.id } });
    const choiceByParticipant = new Map(confirmations.map((c) => [c.participantId, c.endState]));

    /**
     * Who has to have confirmed before this closes.
     *
     * Where the lead decides, their own confirmation is the whole of it - nobody
     * else can confirm, so waiting for everyone would leave the ground open for
     * ever. Where the parties are peers, every active party still has to agree.
     */
    const needsEveryone = closingNeedsEveryone(ground.scenario);
    const allConfirmed = needsEveryone
      ? active.length >= 2 && active.every((p) => choiceByParticipant.has(p.id))
      : choiceByParticipant.has(participant.id);
    const chosenStates = needsEveryone
      ? new Set(active.map((p) => choiceByParticipant.get(p.id)).filter((s): s is string => !!s))
      : new Set([endState]);

    /*
     * THE LEAD'S ANSWER CLOSES IT, AND THERE IS NO OTHER PATH OUT OF HERE.
     *
     * `closingNeedsEveryone` is false for every scenario now - "the lead is meant to close it,
     * nothing like agreement" - and the confirmation is written above before the count is taken, so
     * the person who just answered is always among the confirmed and the chosen set is always their
     * one answer. This branch is the whole of it.
     *
     * WHAT WENT WITH THE OTHER BRANCH. It emailed every party who had not yet picked the same end
     * state, asking them to agree or say where they saw it differently. Nobody is being asked to
     * agree any more, so that invitation would be a question with no answer. Everybody is still
     * told, by `finalize`, that it closed and what it closed as - which is the thing they actually
     * need and the thing the old flow only got round to at the very end.
     */
    if (allConfirmed && chosenStates.size === 1) {
      await this.finalize(groundId, [...chosenStates][0]);
    } else {
      /* Defensive only: an end state that failed validation above cannot reach this. */
      this.logger.warn(`Resolution on ${groundId} did not close: ${chosenStates.size} state(s) from ${confirmations.length} answer(s).`);
    }

    return this.buildState(groundId, userId);
  }

  /**
   * Counter-propose an end state. The caller must be a participant. A new
   * Resolution record is created (replacing the current leading proposal) with
   * the counter-proposed end state, and the other party is notified. Any
   * stale confirmations for the previous proposal are cleared so every party
   * must re-confirm the new proposal explicitly.
   */
  async counterPropose(groundId: string, userId: string, proposedEndState: string, message?: string) {
    const { ground, participant } = await this.assertParty(groundId, userId);

    if (ground.status === GroundStatus.CLOSED || ground.status === GroundStatus.RESOLVED) {
      throw new BadRequestException('This check-in is already resolved');
    }
    /** Authorisation first: a party with no say here should not be told which end states are valid. */
    /**
     * THE SAME GUARD `propose` HAS, WHICH THIS PATH NEVER HAD. W-UX-R.
     *
     * Found while checking whether `counter` was simply dead code. It is unreached by any client, but
     * it is reachable by any authenticated PARTY, and what it does is replace the leading end state,
     * DELETE every existing confirmation, and record the caller's own.
     *
     * With no lead-decides check, that is the whole of `LEAD_DECIDES` undone by one request. On a PIP
     * or a new-hire ground the employee could overwrite their manager's decision with their own
     * choice and clear the manager's confirmation - which is exactly the veto the UI was changed to
     * take away, and the reason the comment above `propose` exists.
     *
     * `propose` has guarded this since LEAD_DECIDES was introduced. This path was written earlier and
     * never revisited, and nothing pointed at it, so nobody walked into it. That is luck, not design.
     */
    if (!closingNeedsEveryone(ground.scenario) && participant.partyType !== PartyType.INITIATOR) {
      throw new ForbiddenException(
        'In this check-in, the lead decides how it ends. Your account and your corrections stand on the record beside theirs.',
      );
    }

    if (!isValidEndState(ground.scenario, proposedEndState)) {
      throw new BadRequestException(`"${proposedEndState}" is not a valid end state for this scenario`);
    }

    // Replace the current leading proposal and clear all existing confirmations
    // so every party must explicitly re-confirm the counter-proposal.
    const resolution = await this.prisma.resolution.upsert({
      where: { groundId },
      create: { groundId, endState: proposedEndState },
      update: { endState: proposedEndState },
    });

    await this.prisma.resolutionConfirmation.deleteMany({
      where: { resolutionId: resolution.id },
    });

    // Record the counter-proposer's own confirmation immediately.
    await this.prisma.resolutionConfirmation.upsert({
      where: { resolutionId_participantId: { resolutionId: resolution.id, participantId: participant.id } },
      create: { resolutionId: resolution.id, participantId: participant.id, endState: proposedEndState },
      update: { endState: proposedEndState, confirmedAt: new Date() },
    });

    // Notify the other active parties.
    const active = await this.prisma.groundParticipant.findMany({
      where: { groundId, userId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, partyType: true, createdAt: true, nameGiven: true, user: { select: { firstName: true, lastName: true, email: true } } },
    });
    /**
     * The eighth hand-written name chain. Same shape as the others: the role, else a raw address,
     * with the person's actual NAME never consulted - and this one goes out in an email.
     *
     * AND WITH NO NAME, NEITHER THE ROLE NOR THE ADDRESS. Request 36, 27 September 2026. The role on
     * the row is the lead's own description of the person, which can hold the lead's private words,
     * and this email goes to everybody else in the check-in. The address is not theirs to be shown to
     * a peer either (see `displayName`). With no name, they are what every surface calls them
     * (plainWordsByPerson): the one who proposes is the lead, so "The lead suggested how to wrap this up".
     */
    const proposerLabel = displayName(participant as any)
      ?? atTheStart(plainWordsByPerson([participant as any]).get(participant.id) ?? 'a colleague');
    const frontend = this.config.get<string>('resend.frontendUrl') || '';
    /* The ground page: `/grounds/:id/resolution` has never been a client route, so both of
       these invitations to settle an end state landed on the not-found page. The panel that
       accepts a proposal is rendered on the ground page itself. */
    const groundUrl = `${frontend}/grounds/${groundId}`;

    const others = active.filter((p) => p.id !== participant.id);
    for (const p of others) {
      await this.email
        .sendResolutionProposal(p.email, proposerLabel, proposedEndState, groundUrl, ground.scenario,
          whoTheEndingIsAbout(active as any, namesVisibleTo(p.id, active as any), p.id))
        .catch((err: any) =>
          this.logger.error(`Counter-proposal email failed for participant ${p.id}: ${err.message}`),
        );
    }

    return this.buildState(groundId);
  }

  /** Every active party confirmed the same end state - close the ground. */
  private async finalize(groundId: string, endState: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.resolution.update({ where: { groundId }, data: { endState, closedAt: now } }),
      this.prisma.ground.update({
        where: { id: groundId },
        data: { status: GroundStatus.CLOSED, resolvedAt: now, closedAt: now, endState },
      }),
    ]);

    // Seed the learning loop. Best-effort - never block the close.
    await this.intelligence.recordOutcome(groundId, endState).catch((err) =>
      this.logger.error(`recordOutcome failed for ground ${groundId}: ${err.message}`),
    );

    /**
     * AND THE HALF OF THE LOOP THAT WAS NEVER CONNECTED.
     *
     * recordOutcome writes the Outcome row. recordOutcomeLearning enriches it with
     * the session count and the fairness rate from the outcome feedback - and it had
     * no caller anywhere, while the weekly learning cron selects precisely those
     * columns. So the report that exists to tell us which prompt version produces
     * fairer, shorter grounds has been reading fields nobody filled, every Monday,
     * and reporting whatever that averages to.
     *
     * Found by the dead-method rule. Best-effort, after the close, like its sibling.
     */
    await this.reports.recordOutcomeLearning(groundId).catch((err) =>
      this.logger.error(`recordOutcomeLearning failed for ground ${groundId}: ${err.message}`),
    );

    // GW-50: close-confirmation email to all parties simultaneously.
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        label: true, scenario: true,
        participants: { orderBy: { createdAt: 'asc' }, select: { id: true, email: true, partyType: true, createdAt: true, nameGiven: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });
    if (ground) {
      const frontend = this.config.get<string>('resend.frontendUrl') || '';
      const groundUrl = `${frontend}/grounds/${groundId}`;
      await Promise.all(
        ground.participants.map((p) =>
          this.email
            /* Each person reads the ending as it is said to them: the person leaving reads "Your role", the
               lead reads their name, and nobody reads a name the check-in does not show them (request 123 item 8). */
            .sendGroundClosed(p.email, ground.label, endState, groundUrl, ground.scenario,
              whoTheEndingIsAbout(ground.participants as any, namesVisibleTo(p.id, ground.participants as any), p.id))
            .catch((err: any) => this.logger.error(`Close email failed for ground ${groundId}: ${err.message}`)),
        ),
      );
    }

    /* When the check-in was about one person and they carry on, a review is PROPOSED to whoever runs
       reviews. Only their yes starts it, and nothing goes to the person. Best-effort, like the rest. */
    await this.reviewsProposed?.whenACheckInEnds(groundId).catch((err: any) =>
      this.logger.error(`Proposing a review after ground ${groundId} closed failed: ${err?.message}`),
    );

    this.logger.log(`Ground ${groundId} closed with end state ${endState}. Billing stopped.`);
  }

  /**
   * The resolution state every party sees: the leading proposal, per-party
   * confirmations (with each party's chosen end state), how many of the active
   * parties have confirmed, and the valid end-state options for this scenario.
   */
  private async buildState(groundId: string, viewerUserId?: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Check-in not found');

    const resolution = await this.prisma.resolution.findUnique({
      where: { groundId },
      include: { confirmations: true },
    });
    const active = await this.prisma.groundParticipant.findMany({
      where: { groundId, userId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        userId: true,
        partyType: true,
        createdAt: true,
        /** For `labelsForParties`, which reads the name before anything else. */
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    /**
     * THE SEVENTH HAND-WRITTEN NAME CHAIN, AND THE WORST OF THEM. W-UX-4.
     *
     * The label was `roleAsDescribed?.trim() || p.email`, which never consults the NAME at all - so a
     * person with a perfectly good name showed as their role, and a person without one showed as a raw
     * email address. Seen on a released report directly under the decline notice: one row read
     * "sahar@meridianhealth.test" and the two beside it read roles.
     *
     * `labelsForParties` is what the report is written in, and this block renders INSIDE the shared
     * report, so it must use the same map - which also gets the privacy rule right for free: a viewer
     * not entitled to somebody's real name sees their role, and the address never appears.
     */
    const labels = labelsForParties(active as any);
    /**
     * AND THEN THE NAMES GO BACK IN, WHICH IS THE SECOND HALF.
     *
     * `labelsForParties` deliberately holds no real names - reports are written and stored without
     * them, and a later per-viewer step swaps them in for the people this reader is entitled to see.
     * Using the map alone fixed the raw address and replaced it with "the initiator", which is the
     * report's internal shorthand and not a thing to show somebody about themselves.
     *
     * `namesVisibleTo` is that second step, and it already encodes the entitlement: a lead sees every
     * name, anybody else sees their own and the lead's. So a party who may not know another party's
     * name still gets their role here, and nobody ever gets an email address.
     */
    const viewer = viewerUserId ? active.find((p) => p.userId === viewerUserId) : undefined;
    const names = namesVisibleTo(viewer?.id ?? null, active as any);
    const choiceByParticipant = new Map((resolution?.confirmations ?? []).map((c) => [c.participantId, c.endState]));
    const confirmations = active.map((p) => {
      const label = labels.get(p.id) ?? 'A party';
      return {
      participantId: p.id,
      label: names.get(label) ?? label,
      partyType: p.partyType,
      endState: choiceByParticipant.get(p.id) ?? null,
      confirmed: choiceByParticipant.has(p.id),
      };
    });

    return {
      /**
       * The outcome, and why, once it is decided (U.11). `reason` is the lead's own words, written
       * for the people in the check-in to read with the outcome (decisions rule 6). This read is
       * served only to a party or an admin of the organisation - see `get` - so nobody else reads it.
       * The label and the name are the screen's: this carries the stored value and the reason only.
       */
      resolution: resolution
        ? {
            id: resolution.id,
            groundId,
            endState: resolution.endState,
            closedAt: resolution.closedAt,
            reason: resolution.closedAt ? (resolution.reason ?? null) : null,
          }
        : null,
      confirmations,
      confirmedCount: confirmations.filter((c) => c.confirmed).length,
      totalActive: active.length,
      /* The ending about a person leaving names them, through the same names this panel reads (request 123 item 8). */
      options: endStatesFor(ground.scenario, whoTheEndingIsAbout(active as any, names, viewer?.id ?? null)),
      groundStatus: ground.status,
      /**
       * Who closes this ground, so the screen can stop asking the wrong person.
       *
       * On a ground about one person's position the lead decides, and the other
       * party sees the options without being handed a button that asks them to
       * agree to their own exit. Both flags are sent because the panel needs to
       * tell three states apart: "you decide", "your lead decides", and "we all
       * decide together".
       */
      leadDecides: !closingNeedsEveryone(ground.scenario),
      viewerIsLead: viewerUserId ? ground.initiatorId === viewerUserId : false,
      /**
       * Whether the reader is in the check-in at all. An admin who only reads it has no account of
       * their own on it, so the screen must not tell them "your account is kept".
       */
      viewerIsParty: !!viewer,
    };
  }

  private async assertParty(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Check-in not found');
    /**
     * `user` is included so callers can NAME this person. `displayName` reads `user.firstName`, and
     * without the relation it silently returns null - so a label built from it would have fallen
     * straight through to the address it was meant to replace, and looked like a fix.
     */
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');
    return { ground, participant };
  }
}
