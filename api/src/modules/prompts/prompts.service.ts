import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SEED_PROMPTS } from '../conversation/prompt-library';
import { AnthropicService, ChatTurn } from '../conversation/anthropic.service';

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

  constructor(private prisma: PrismaService, private anthropic: AnthropicService) {}

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
      select: { id: true, key: true, version: true, summary: true, isActive: true, isDraft: true, activatedAt: true, activatedBy: true, createdAt: true, content: true },
    });
  }

  /** Get the current draft for a key, if one exists. */
  async getDraft(key: string) {
    return this.prisma.promptVersion.findFirst({
      where: { key, isDraft: true },
      select: { id: true, key: true, version: true, summary: true, isActive: true, isDraft: true, activatedAt: true, activatedBy: true, createdAt: true, content: true },
    });
  }

  /** Create or update the draft for a key. Only one draft per key at a time. */
  async upsertDraft(key: string, content: string, summary?: string) {
    const existing = await this.prisma.promptVersion.findFirst({ where: { key, isDraft: true } });
    if (existing) {
      return this.prisma.promptVersion.update({
        where: { id: existing.id },
        data: { content, summary: summary ?? existing.summary },
        select: { id: true, key: true, version: true, summary: true, isActive: true, isDraft: true, activatedAt: true, activatedBy: true, createdAt: true, content: true },
      });
    }
    const latest = await this.prisma.promptVersion.findFirst({ where: { key }, orderBy: { version: 'desc' } });
    const version = (latest?.version ?? 0) + 1;
    return this.prisma.promptVersion.create({
      data: { key, version, content, summary, isActive: false, isDraft: true },
      select: { id: true, key: true, version: true, summary: true, isActive: true, isDraft: true, activatedAt: true, activatedBy: true, createdAt: true, content: true },
    });
  }

  /** Discard (delete) the current draft for a key. */
  async discardDraft(key: string) {
    const draft = await this.prisma.promptVersion.findFirst({ where: { key, isDraft: true } });
    if (!draft) throw new NotFoundException(`No draft for key "${key}"`);
    await this.prisma.promptVersion.delete({ where: { id: draft.id } });
    return { discarded: true };
  }

  /** Run a test message against a specific prompt version. No DB writes. */
  async testChat(versionId: string, messages: ChatTurn[]): Promise<{ reply: string }> {
    const version = await this.prisma.promptVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Prompt version not found');
    const testPrefix = '[TEST MODE — this is a simulated conversation using a draft prompt. No real data.]\n\n';
    const reply = await this.anthropic.respond(testPrefix + version.content, messages);
    return { reply };
  }

  /** Create a new version. Does not activate it — activation is deliberate. */
  async createVersion(key: string, content: string, summary?: string) {
    if (key === 'system') {
      const INVARIANTS = [
        'THE WILLINGNESS GATE',
        'CONSENT ARCHITECTURE',
        'FAILING RELATIONSHIP PROTOCOL',
        'SIMULTANEOUS REPORT REVEAL',
        'BANNED WORDS AND PHRASES:',
      ];
      const missing = INVARIANTS.filter((inv) => !content.includes(inv));
      if (missing.length > 0) {
        throw new BadRequestException({ error: 'invariant_violation', missing });
      }
    }

    const latest = await this.prisma.promptVersion.findFirst({ where: { key }, orderBy: { version: 'desc' } });
    const version = (latest?.version ?? 0) + 1;
    return this.prisma.promptVersion.create({ data: { key, version, content, summary, isActive: false } });
  }

  /** All versions for a single prompt key, newest first with full content. */
  async getByKey(key: string) {
    return this.prisma.promptVersion.findMany({
      where: { key },
      orderBy: { version: 'desc' },
      select: { id: true, key: true, version: true, summary: true, isActive: true, isDraft: true, activatedAt: true, activatedBy: true, createdAt: true, content: true },
    });
  }

  /** Usage funnel — session drop-off, scenario/moment/status breakdowns, engagement stats. */
  async usageFunnel() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      sessionCounts,
      avgSessionMinutesRaw,
      scenarioBreakdown,
      momentBreakdown,
      statusBreakdown,
      bothEngaged,
      anyCompletedGrounds,
      stalledCheckIns,
      session5Count,
      avgDaysRaw,
    ] = await Promise.all([
      // 1. Completed check-ins per session (sessions 1-7)
      Promise.all(
        [1, 2, 3, 4, 5, 6, 7].map((n) =>
          this.prisma.checkIn.count({ where: { status: 'COMPLETED', sessionNumber: n } }).then((count) => ({ session: n, completed: count })),
        ),
      ),

      // 2. Avg session duration in minutes (raw SQL)
      this.prisma.$queryRaw<{ session_number: number; avg_minutes: number }[]>`
        SELECT session_number, ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60))::int as avg_minutes
        FROM check_ins
        WHERE status = 'COMPLETED' AND started_at IS NOT NULL AND completed_at IS NOT NULL
        GROUP BY session_number
        ORDER BY session_number
      `,

      // 3. Scenario breakdown
      this.prisma.ground.groupBy({ by: ['scenario'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),

      // 4. Moment breakdown
      this.prisma.ground.groupBy({ by: ['moment'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),

      // 5. Status breakdown
      this.prisma.ground.groupBy({ by: ['status'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),

      // 6. Grounds where both initiator AND at least one participant have a COMPLETED check-in
      this.prisma.ground.count({
        where: {
          checkIns: {
            some: { status: 'COMPLETED', participant: { partyType: 'INITIATOR' } },
          },
          AND: [
            {
              checkIns: {
                some: { status: 'COMPLETED', participant: { partyType: 'PARTICIPANT' } },
              },
            },
          ],
        },
      }),

      // 7. Grounds with any COMPLETED check-in (to compute one-sided)
      this.prisma.ground.count({
        where: { checkIns: { some: { status: 'COMPLETED' } } },
      }),

      // 8. Stalled check-ins: IN_PROGRESS and startedAt > 7 days ago
      this.prisma.checkIn.count({
        where: { status: 'IN_PROGRESS', startedAt: { lt: sevenDaysAgo } },
      }),

      // 9. Session 5 completed count
      this.prisma.checkIn.count({ where: { status: 'COMPLETED', sessionNumber: 5 } }),

      // 10. Avg days from ground creation to first check-in (raw SQL)
      this.prisma.$queryRaw<{ avg_days: number | null }[]>`
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (ci.started_at - g.created_at)) / 86400))::int as avg_days
        FROM grounds g
        JOIN check_ins ci ON ci.ground_id = g.id
        WHERE ci.session_number = 1 AND ci.started_at IS NOT NULL
      `,
    ]);

    // Build funnel with drop-off rates
    const funnelBySession = sessionCounts.map((row, idx) => ({
      session: row.session,
      completed: row.completed,
      dropOffRate: idx === 0 ? null : sessionCounts[idx - 1].completed > 0
        ? Math.round((1 - row.completed / sessionCounts[idx - 1].completed) * 100) / 100
        : null,
    }));

    // Scenario breakdown with pct
    const totalScenario = scenarioBreakdown.reduce((sum, r) => sum + r._count.id, 0);
    const byScenario = scenarioBreakdown.map((r) => ({
      scenario: r.scenario,
      count: r._count.id,
      pct: totalScenario > 0 ? Math.round((r._count.id / totalScenario) * 1000) / 10 : 0,
    }));

    const byMoment = momentBreakdown.map((r) => ({ moment: r.moment, count: r._count.id }));
    const byStatus = statusBreakdown.map((r) => ({ status: r.status, count: r._count.id }));

    const oneEngaged = anyCompletedGrounds - bothEngaged;

    const avgDaysRow = avgDaysRaw[0];
    const avgDaysToFirstCheckin = avgDaysRow?.avg_days != null ? Number(avgDaysRow.avg_days) : null;

    const avgSessionMinutes = avgSessionMinutesRaw.map((r) => ({
      session: Number(r.session_number),
      avgMinutes: Number(r.avg_minutes),
    }));

    return {
      funnelBySession,
      avgSessionMinutes,
      byScenario,
      byMoment,
      byStatus,
      bothEngaged,
      oneEngaged,
      stalledCheckIns,
      session5Count,
      avgDaysToFirstCheckin,
    };
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

  async orgCohorts() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        createdAt: true,
        careFeeStatus: true,
        _count: { select: { users: true } },
        users: {
          select: { firstName: true, lastName: true, email: true },
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
        grounds: {
          select: {
            status: true,
            checkIns: {
              where: { status: 'COMPLETED' },
              select: { sessionNumber: true, completedAt: true },
            },
          },
        },
      },
    });

    return orgs.map((org) => {
      const allCheckIns = org.grounds.flatMap((g) => g.checkIns);
      const completedDates = allCheckIns
        .map((c) => c.completedAt)
        .filter((d): d is Date => d != null);
      const maxSession =
        allCheckIns.length > 0
          ? Math.max(...allCheckIns.map((c) => c.sessionNumber))
          : 0;
      const lastActivity =
        completedDates.length > 0
          ? completedDates.reduce((max, d) => (d > max ? d : max))
          : null;
      const primary = org.users[0] ?? null;

      let stage: string;
      if (org.careFeeStatus === 'ACTIVE') {
        stage = 'paid';
      } else if (maxSession >= 4) {
        stage = 's4_plus';
      } else if (maxSession === 3) {
        stage = 's3';
      } else if (maxSession === 2) {
        stage = 's2';
      } else if (maxSession === 1) {
        stage = 's1_only';
      } else {
        stage = 'no_activity';
      }

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        adminName: primary ? `${primary.firstName} ${primary.lastName}` : null,
        adminEmail: primary?.email ?? null,
        createdAt: org.createdAt,
        careFeeStatus: org.careFeeStatus,
        userCount: org._count.users,
        groundCount: org.grounds.length,
        maxSession,
        lastActivity,
        stage,
      };
    });
  }

  /** Activate a version (deactivates other versions of the same key). Logs who activated. */
  async activate(id: string, activatedByName?: string) {
    const target = await this.prisma.promptVersion.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Prompt version not found');

    await this.prisma.$transaction([
      this.prisma.promptVersion.updateMany({ where: { key: target.key }, data: { isActive: false } }),
      this.prisma.promptVersion.update({
        where: { id },
        data: { isActive: true, isDraft: false, activatedAt: new Date(), activatedBy: activatedByName ?? null },
      }),
    ]);
    return this.prisma.promptVersion.findUnique({ where: { id } });
  }
}
