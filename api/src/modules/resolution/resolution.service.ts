import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IntelligenceService } from '../intelligence';
import { EmailService } from '../email/email.service';
import { endStatesFor, isValidEndState } from './end-states';
import { GroundStatus } from '@prisma/client';

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
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async get(groundId: string, userId: string) {
    await this.assertParty(groundId, userId);
    return this.buildState(groundId);
  }

  /**
   * Propose or confirm an end state. Each party's choice is recorded as their
   * confirmation. The ground closes when every active party has confirmed and
   * they all chose the same end state. If they diverge, the divergence is
   * surfaced (in the returned state) and the ground stays open.
   */
  async propose(groundId: string, userId: string, endState: string) {
    const { ground, participant } = await this.assertParty(groundId, userId);

    if (ground.status === GroundStatus.CLOSED || ground.status === GroundStatus.RESOLVED) {
      throw new BadRequestException('This ground is already resolved');
    }
    if (!isValidEndState(ground.scenario, endState)) {
      throw new BadRequestException(`"${endState}" is not a valid end state for this scenario`);
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
      create: { groundId, endState },
      update: { endState },
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

    const allConfirmed = active.length >= 2 && active.every((p) => choiceByParticipant.has(p.id));
    const chosenStates = new Set(active.map((p) => choiceByParticipant.get(p.id)).filter((s): s is string => !!s));

    if (allConfirmed && chosenStates.size === 1) {
      await this.finalize(groundId, [...chosenStates][0]);
    } else {
      // GW-22: notify parties who have not yet confirmed this endState so they
      // know a proposal is waiting. Skip the proposer (they just made it).
      const proposerLabel = participant.roleAsDescribed?.trim() || participant.email;
      const frontend = this.config.get<string>('resend.frontendUrl') || '';
      const groundUrl = `${frontend}/grounds/${groundId}/resolution`;
      const needConfirmation = active.filter(
        (p) => p.id !== participant.id && choiceByParticipant.get(p.id) !== endState,
      );
      for (const p of needConfirmation) {
        await this.email
          .sendResolutionProposal(p.email, proposerLabel, endState, groundUrl)
          .catch((err: any) =>
            this.logger.error(`Resolution proposal email failed for participant ${p.id}: ${err.message}`),
          );
      }
    }

    return this.buildState(groundId);
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
      throw new BadRequestException('This ground is already resolved');
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
      select: { id: true, email: true, roleAsDescribed: true },
    });
    const proposerLabel = participant.roleAsDescribed?.trim() || participant.email;
    const frontend = this.config.get<string>('resend.frontendUrl') || '';
    const groundUrl = `${frontend}/grounds/${groundId}/resolution`;

    const others = active.filter((p) => p.id !== participant.id);
    for (const p of others) {
      await this.email
        .sendResolutionProposal(p.email, proposerLabel, proposedEndState, groundUrl)
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

    // GW-50: close-confirmation email to all parties simultaneously.
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { label: true, participants: { select: { email: true } } },
    });
    if (ground) {
      const frontend = this.config.get<string>('resend.frontendUrl') || '';
      const groundUrl = `${frontend}/grounds/${groundId}`;
      await Promise.all(
        ground.participants.map((p) =>
          this.email
            .sendGroundClosed(p.email, ground.label, endState, groundUrl)
            .catch((err: any) => this.logger.error(`Close email failed for ground ${groundId}: ${err.message}`)),
        ),
      );
    }

    this.logger.log(`Ground ${groundId} closed with end state ${endState}. Billing stopped.`);
  }

  /**
   * The resolution state every party sees: the leading proposal, per-party
   * confirmations (with each party's chosen end state), how many of the active
   * parties have confirmed, and the valid end-state options for this scenario.
   */
  private async buildState(groundId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Ground not found');

    const resolution = await this.prisma.resolution.findUnique({
      where: { groundId },
      include: { confirmations: true },
    });
    const active = await this.prisma.groundParticipant.findMany({
      where: { groundId, userId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, partyType: true, roleAsDescribed: true },
    });

    const choiceByParticipant = new Map((resolution?.confirmations ?? []).map((c) => [c.participantId, c.endState]));
    const confirmations = active.map((p) => ({
      participantId: p.id,
      label: p.roleAsDescribed?.trim() || p.email,
      partyType: p.partyType,
      endState: choiceByParticipant.get(p.id) ?? null,
      confirmed: choiceByParticipant.has(p.id),
    }));

    return {
      resolution: resolution
        ? { id: resolution.id, groundId, endState: resolution.endState, closedAt: resolution.closedAt }
        : null,
      confirmations,
      confirmedCount: confirmations.filter((c) => c.confirmed).length,
      totalActive: active.length,
      options: endStatesFor(ground.scenario),
      groundStatus: ground.status,
    };
  }

  private async assertParty(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Ground not found');
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    return { ground, participant };
  }
}
