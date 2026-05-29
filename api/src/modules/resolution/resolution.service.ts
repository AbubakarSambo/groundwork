import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntelligenceService } from '../intelligence';
import { endStatesFor, isValidEndState } from './end-states';
import { GroundStatus, PartyType } from '@prisma/client';

/**
 * Resolution. A ground closes only when BOTH parties confirm the SAME end
 * state — no party has unilateral authority (Part 8 / cofounder framework).
 * On close: billing stops automatically (status leaves ACTIVE), the outcome is
 * recorded for the learning loop, and the record is permanent (nothing is
 * deleted; both parties keep access).
 *
 * NOTE: confirmation is modelled two-sided (initiator + participant), which is
 * exact for cofounder / hire / advisor / recognition grounds. Multi-member
 * project grounds would need per-participant confirmation tracking (future).
 */
@Injectable()
export class ResolutionService {
  private readonly logger = new Logger(ResolutionService.name);

  constructor(
    private prisma: PrismaService,
    private intelligence: IntelligenceService,
  ) {}

  async get(groundId: string, userId: string) {
    const { ground } = await this.assertParty(groundId, userId);
    const resolution = await this.prisma.resolution.findUnique({ where: { groundId } });
    return { resolution, options: endStatesFor(ground.scenario), groundStatus: ground.status };
  }

  /**
   * Propose or confirm an end state. Proposing a new end state supersedes any
   * prior one and resets confirmations. Confirming the current end state marks
   * the requesting party. When both parties have confirmed the same end state,
   * the ground closes.
   */
  async propose(groundId: string, userId: string, endState: string) {
    const { ground, participant } = await this.assertParty(groundId, userId);

    if (ground.status === GroundStatus.CLOSED || ground.status === GroundStatus.RESOLVED) {
      throw new BadRequestException('This ground is already resolved');
    }
    if (!isValidEndState(ground.scenario, endState)) {
      throw new BadRequestException(`"${endState}" is not a valid end state for this scenario`);
    }

    const isInitiator = participant.partyType === PartyType.INITIATOR;
    const now = new Date();
    const existing = await this.prisma.resolution.findUnique({ where: { groundId } });

    let resolution;
    if (!existing) {
      resolution = await this.prisma.resolution.create({
        data: {
          groundId,
          endState,
          confirmedByInitiator: isInitiator,
          confirmedByParticipant: !isInitiator,
          confirmedInitiatorAt: isInitiator ? now : null,
          confirmedParticipantAt: isInitiator ? null : now,
        },
      });
    } else if (existing.endState === endState) {
      // Confirm this party's side of the current proposal.
      resolution = await this.prisma.resolution.update({
        where: { groundId },
        data: isInitiator
          ? { confirmedByInitiator: true, confirmedInitiatorAt: existing.confirmedInitiatorAt ?? now }
          : { confirmedByParticipant: true, confirmedParticipantAt: existing.confirmedParticipantAt ?? now },
      });
    } else {
      // A different proposal supersedes — reset both confirmations.
      resolution = await this.prisma.resolution.update({
        where: { groundId },
        data: {
          endState,
          confirmedByInitiator: isInitiator,
          confirmedByParticipant: !isInitiator,
          confirmedInitiatorAt: isInitiator ? now : null,
          confirmedParticipantAt: isInitiator ? null : now,
          closedAt: null,
        },
      });
    }

    if (resolution.confirmedByInitiator && resolution.confirmedByParticipant) {
      return this.finalize(groundId, resolution.endState);
    }
    return resolution;
  }

  /** Both parties confirmed — close the ground. Billing stops; record is permanent. */
  private async finalize(groundId: string, endState: string) {
    const now = new Date();
    const [resolution] = await this.prisma.$transaction([
      this.prisma.resolution.update({ where: { groundId }, data: { closedAt: now } }),
      this.prisma.ground.update({
        where: { id: groundId },
        data: { status: GroundStatus.CLOSED, resolvedAt: now, closedAt: now, endState },
      }),
    ]);

    // Seed the learning loop. Best-effort — never block the close.
    await this.intelligence.recordOutcome(groundId, endState).catch((err) =>
      this.logger.error(`recordOutcome failed for ground ${groundId}: ${err.message}`),
    );

    this.logger.log(`Ground ${groundId} closed with end state ${endState}. Billing stopped.`);
    return resolution;
  }

  private async assertParty(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Ground not found');
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not a party to this ground');
    return { ground, participant };
  }
}
