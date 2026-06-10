import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SEED_PROMPTS } from '../conversation/prompt-library';

/**
 * The moat. Every prompt is versioned; every change is versioned against
 * outcome data. The active version of a key is what the engine loads.
 *
 * Keys:
 *   - "system"             the alignment-ground conversation engine prompt
 *   - "report_synthesis"   reads both records, produces the shared picture
 *   - "scenario.<name>"    scenario-specific exact wording (Part 3)
 */
@Injectable()
export class PromptsService implements OnModuleInit {
  private readonly logger = new Logger(PromptsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Seed-on-deploy (B7): ensure every seeded prompt key has an active version.
   * Idempotent — skips when the active content already matches; otherwise
   * activates the matching version or creates and activates a new one (history
   * preserved). Runs on every boot, so a deploy that changes a seed prompt
   * (e.g. report_synthesis) takes effect without manual SQL.
   */
  async onModuleInit() {
    for (const seed of SEED_PROMPTS) {
      const active = await this.prisma.promptVersion.findFirst({ where: { key: seed.key, isActive: true } });
      if (active && active.content === seed.content) continue;

      const sameContent = await this.prisma.promptVersion.findFirst({
        where: { key: seed.key, content: seed.content },
        orderBy: { version: 'desc' },
      });
      if (sameContent) {
        await this.activate(sameContent.id);
        continue;
      }

      const created = await this.createVersion(seed.key, seed.content, 'Seeded on deploy');
      await this.activate(created.id);
    }
    this.logger.log(`Prompt seed ensured for ${SEED_PROMPTS.length} key(s).`);
  }

  async getActive(key: string) {
    const prompt = await this.prisma.promptVersion.findFirst({
      where: { key, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (!prompt) throw new NotFoundException(`No active prompt for key "${key}"`);
    return prompt;
  }

  async getActiveContent(key: string): Promise<string> {
    return (await this.getActive(key)).content;
  }

  /** All versions, newest first per key — for the prompt-management screen. */
  async list() {
    return this.prisma.promptVersion.findMany({
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
      select: { id: true, key: true, version: true, summary: true, isActive: true, activatedAt: true, createdAt: true, content: true },
    });
  }

  /** Create a new version. Does not activate it — activation is deliberate. */
  async createVersion(key: string, content: string, summary?: string) {
    const latest = await this.prisma.promptVersion.findFirst({ where: { key }, orderBy: { version: 'desc' } });
    const version = (latest?.version ?? 0) + 1;
    return this.prisma.promptVersion.create({ data: { key, version, content, summary, isActive: false } });
  }

  /** Cross-org usage dashboard — platform admin only. */
  async platformDashboard() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalOrgs,
      activeOrgs,
      orgsLast30Days,
      groundsByStatus,
      totalGrounds,
      groundsLast7Days,
      resolvedLast30Days,
      totalCheckIns,
      checkInsLast7Days,
      checkInsLast30Days,
      session1Count,
      session2Count,
      promptVersions,
      recentCheckIns,
      recentGrounds,
      recentResolutions,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { careFeeStatus: 'ACTIVE' } }),
      this.prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.ground.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.ground.count(),
      this.prisma.ground.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.ground.count({ where: { resolvedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.checkIn.count({ where: { status: 'COMPLETED' } }),
      this.prisma.checkIn.count({ where: { status: 'COMPLETED', completedAt: { gte: sevenDaysAgo } } }),
      this.prisma.checkIn.count({ where: { status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.checkIn.count({ where: { status: 'COMPLETED', sessionNumber: 1 } }),
      this.prisma.checkIn.count({ where: { status: 'COMPLETED', sessionNumber: 2 } }),
      this.prisma.promptVersion.findMany({
        orderBy: [{ key: 'asc' }, { version: 'desc' }],
        select: { id: true, key: true, version: true, isActive: true, activatedAt: true, createdAt: true },
      }),
      this.prisma.checkIn.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 15,
        select: {
          completedAt: true,
          sessionNumber: true,
          ground: { select: { label: true, organization: { select: { slug: true } } } },
        },
      }),
      this.prisma.ground.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          createdAt: true,
          label: true,
          scenario: true,
          organization: { select: { slug: true } },
        },
      }),
      this.prisma.ground.findMany({
        where: { resolvedAt: { not: null } },
        orderBy: { resolvedAt: 'desc' },
        take: 10,
        select: {
          resolvedAt: true,
          label: true,
          organization: { select: { slug: true } },
        },
      }),
    ]);

    // Prompt version performance: resolved outcomes + fairness per version
    const outcomes = await this.prisma.outcome.findMany({
      select: { promptVersionId: true, resolvedState: true },
    });
    const feedback = await this.prisma.outcomeFeedback.findMany({
      select: {
        feltFair: true,
        ground: { select: { promptVersionId: true } },
      },
    });

    const promptPerformance = promptVersions.map((pv) => {
      const pvOutcomes = outcomes.filter((o) => o.promptVersionId === pv.id);
      const pvFeedback = feedback.filter((f) => f.ground.promptVersionId === pv.id);
      const fairCount = pvFeedback.filter((f) => f.feltFair).length;
      return {
        ...pv,
        groundsUsingIt: pvOutcomes.length,
        outcomesResolved: pvOutcomes.filter((o) => o.resolvedState !== 'STALLED').length,
        fairnessRate: pvFeedback.length > 0 ? Math.round((fairCount / pvFeedback.length) * 100) : null,
        feedbackResponses: pvFeedback.length,
      };
    });

    // Merge and sort recent activity
    const activity: { type: string; at: Date; orgSlug: string; groundLabel: string; detail?: string }[] = [
      ...recentCheckIns.map((c) => ({
        type: 'checkin_completed' as const,
        at: c.completedAt!,
        orgSlug: c.ground.organization.slug,
        groundLabel: c.ground.label,
        detail: `Session ${c.sessionNumber}`,
      })),
      ...recentGrounds.map((g) => ({
        type: 'ground_created' as const,
        at: g.createdAt,
        orgSlug: g.organization.slug,
        groundLabel: g.label,
        detail: g.scenario,
      })),
      ...recentResolutions.map((g) => ({
        type: 'ground_resolved' as const,
        at: g.resolvedAt!,
        orgSlug: g.organization.slug,
        groundLabel: g.label,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 20);

    const byStatus = Object.fromEntries(groundsByStatus.map((r) => [r.status, r._count.id]));

    return {
      orgs: { total: totalOrgs, withActiveCareFee: activeOrgs, createdLast30Days: orgsLast30Days },
      grounds: { total: totalGrounds, byStatus, openedLast7Days: groundsLast7Days, resolvedLast30Days },
      checkIns: {
        totalCompleted: totalCheckIns,
        completedLast7Days: checkInsLast7Days,
        completedLast30Days: checkInsLast30Days,
        session2Rate: session1Count > 0 ? Math.round((session2Count / session1Count) * 100) : null,
      },
      promptPerformance,
      recentActivity: activity,
    };
  }

  /** Activate a version (deactivates other versions of the same key). */
  async activate(id: string) {
    const target = await this.prisma.promptVersion.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Prompt version not found');

    await this.prisma.$transaction([
      this.prisma.promptVersion.updateMany({ where: { key: target.key }, data: { isActive: false } }),
      this.prisma.promptVersion.update({ where: { id }, data: { isActive: true, activatedAt: new Date() } }),
    ]);
    return this.prisma.promptVersion.findUnique({ where: { id } });
  }
}
