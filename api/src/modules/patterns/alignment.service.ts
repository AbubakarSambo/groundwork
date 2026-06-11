import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatternsService } from './patterns.service';
import { CheckInStatus, GroundStatus } from '@prisma/client';

/**
 * The alignment feed — the admin-only dashboard. It shows the STATE of every
 * ground: who has checked in, which grounds are open or closed, whether any
 * patterns have surfaced — and NEVER what anyone said. Completeness and status,
 * not content (Part 5).
 */
@Injectable()
export class AlignmentService {
  constructor(
    private prisma: PrismaService,
    private patterns: PatternsService,
  ) {}

  async feed(organizationId: string) {
    const grounds = await this.prisma.ground.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        participants: {
          select: {
            id: true,
            email: true,
            checkIns: { select: { sessionNumber: true, status: true }, orderBy: { sessionNumber: 'desc' } },
          },
        },
      },
    });

    return Promise.all(
      grounds.map(async (ground) => {
        // Completeness for the current period: who has checked in, who has not.
        // Names of people are allowed; the content of their sessions is not.
        const currentPeriod = Math.max(1, ...ground.participants.flatMap((p) => p.checkIns.map((c) => c.sessionNumber)));
        const checkedIn: string[] = [];
        const awaiting: string[] = [];
        for (const p of ground.participants) {
          const periodCheckIn = p.checkIns.find((c) => c.sessionNumber === currentPeriod);
          if (periodCheckIn?.status === CheckInStatus.COMPLETED) checkedIn.push(p.email);
          else awaiting.push(p.email);
        }

        // Surfaced patterns — plain observations only, never who said what.
        const patternSignals = await this.patterns.surfacedForGround(ground.id);

        return {
          groundId: ground.id,
          label: ground.label,
          status: ground.status,
          currentPeriod,
          completeness: {
            checkedInCount: checkedIn.length,
            totalCount: ground.participants.length,
            checkedIn, // who has
            awaiting, // who has not
          },
          stalled: this.isStalled(ground),
          patternSignals, // [{ observation, lastSeenAt }] — never content, never names
        };
      }),
    );
  }

  async narrative(organizationId: string): Promise<{ summary: string; activeGrounds: number; surfacedPatterns: number }> {
    const activeGrounds = await this.prisma.ground.count({
      where: { organizationId, status: GroundStatus.ACTIVE },
    });
    const surfacedPatterns = await this.prisma.patternDetection.count({
      where: { ground: { organizationId }, status: 'SURFACED' },
    });
    const stalledGrounds = await this.prisma.ground.count({
      where: { organizationId, status: GroundStatus.STALLED },
    });

    let summary = activeGrounds > 0
      ? `${activeGrounds} alignment ground${activeGrounds !== 1 ? 's are' : ' is'} active.`
      : 'No active alignment grounds.';
    if (surfacedPatterns > 0)
      summary += ` ${surfacedPatterns} pattern${surfacedPatterns !== 1 ? 's have' : ' has'} surfaced that may be worth naming in your next conversation.`;
    if (stalledGrounds > 0)
      summary += ` ${stalledGrounds} ground${stalledGrounds !== 1 ? 's have' : ' has'} stalled — timeline elapsed without resolution.`;

    return { summary, activeGrounds, surfacedPatterns };
  }

  /** A ground open its full period with no resolution. */
  private isStalled(ground: { status: GroundStatus; createdAt: Date; timelineDays: number; resolvedAt: Date | null }): boolean {
    const openStatuses: GroundStatus[] = [GroundStatus.AWAITING_PARTIES, GroundStatus.REPORT_READY, GroundStatus.ACTIVE];
    if (!openStatuses.includes(ground.status) || ground.resolvedAt) return false;
    const ageMs = Date.now() - ground.createdAt.getTime();
    return ageMs > ground.timelineDays * 24 * 60 * 60 * 1000;
  }
}
