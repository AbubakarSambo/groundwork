import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService, ChatTurn } from '../conversation/anthropic.service';
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

  constructor(
    private prisma: PrismaService,
    private anthropic: AnthropicService,
  ) {}

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
    if (key === 'system') {
      const INVARIANTS = [
        'Record sharing requires explicit consent from both parties separately.',
        "This is held separately from the other party's version.",
        'BANNED WORDS — HARD RULE:',
        'SEVEN-STAGE SEQUENCE — MANDATORY ORDER:',
        'THE WILLINGNESS GATE',
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
      select: { id: true, key: true, version: true, summary: true, isActive: true, activatedAt: true, createdAt: true, content: true },
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

  async orgList() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        careFeeStatus: true,
        createdAt: true,
        _count: { select: { grounds: true, users: true } },
      },
    });

    const groundCounts = await this.prisma.ground.groupBy({
      by: ['organizationId'],
      _count: { id: true },
    });
    const participantCounts = await this.prisma.groundParticipant.groupBy({
      by: ['groundId'],
      _count: { id: true },
    });

    const groundCountMap = Object.fromEntries(groundCounts.map(r => [r.organizationId, r._count.id]));

    const checkInsByOrg = await this.prisma.checkIn.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true, ground: { select: { organizationId: true } } },
    });

    const lastActivityMap: Record<string, Date> = {};
    for (const ci of checkInsByOrg) {
      const orgId = ci.ground.organizationId;
      if (!lastActivityMap[orgId] && ci.completedAt) lastActivityMap[orgId] = ci.completedAt;
    }

    return orgs.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      email: org.email,
      billingActive: org.careFeeStatus === 'ACTIVE',
      careFeeStatus: org.careFeeStatus,
      groundCount: groundCountMap[org.id] ?? 0,
      userCount: org._count.users,
      lastActivity: lastActivityMap[org.id] ?? null,
      createdAt: org.createdAt,
    }));
  }

  async usageStats() {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [checkInsByDay, usageEvents, totalCheckIns, reportsGenerated, groundsCreated] = await Promise.all([
      this.prisma.checkIn.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: fourteenDaysAgo } },
        select: { completedAt: true, sessionNumber: true },
      }),
      this.prisma.usageEvent.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      this.prisma.checkIn.count({ where: { status: 'COMPLETED' } }),
      this.prisma.ground.count({ where: { report: { releasedAt: { not: null } } } }),
      this.prisma.ground.count(),
    ]);

    // Bucket check-ins by day label
    const dayBuckets: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      dayBuckets[key] = 0;
    }
    for (const ci of checkInsByDay) {
      if (!ci.completedAt) continue;
      const key = new Date(ci.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (key in dayBuckets) dayBuckets[key]++;
    }

    const usageMap = Object.fromEntries(usageEvents.map(e => [e.type, e._count.id]));

    return {
      checkInsLast14Days: Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
      totalCheckIns,
      groundsCreated,
      reportsGenerated,
      eventTotals: usageMap,
    };
  }

  /** Sandbox: send one message turn using a custom system prompt. Never persisted. */
  async testChat(systemPrompt: string, messages: ChatTurn[]): Promise<{ reply: string }> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');
    const reply = await this.anthropic.respond(systemPrompt, messages);
    return { reply };
  }

  /** Sandbox: generate cross-reference + per-lane reports from test conversations. Never persisted. */
  async testReport(
    systemPrompt: string,
    adminMessages: ChatTurn[],
    p1Messages: ChatTurn[],
    p2Messages: ChatTurn[],
  ): Promise<{ crossReference: string; p1Report: string; p2Report: string }> {
    const REPORT_PROMPT = `You are Groundwork. You have been given conversation transcripts from three parties (admin, participant 1, participant 2). Generate:
1. A cross-reference report for the admin showing where accounts agree, where they differ, and the most important gap to address.
2. A participant 1 report — speaks only to participant 1's own account, in second person.
3. A participant 2 report — speaks only to participant 2's own account, in second person.

Format your response as three labelled sections:
--- CROSS REFERENCE ---
[cross reference text]
--- PARTICIPANT 1 ---
[participant 1 report]
--- PARTICIPANT 2 ---
[participant 2 report]

Rules: No verdicts. No judgements of any person. No em dashes. Straight quotes. Sentence case headings.`;

    const combinedTranscript = [
      `ADMIN ACCOUNT:\n${adminMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`,
      `PARTICIPANT 1 ACCOUNT:\n${p1Messages.map(m => `${m.role}: ${m.content}`).join('\n')}`,
      `PARTICIPANT 2 ACCOUNT:\n${p2Messages.map(m => `${m.role}: ${m.content}`).join('\n')}`,
    ].join('\n\n---\n\n');

    const reply = await this.anthropic.respond(
      REPORT_PROMPT + '\n\n' + systemPrompt,
      [{ role: 'user', content: combinedTranscript }],
    );

    const crossRef = reply.match(/--- CROSS REFERENCE ---([\s\S]*?)(?=--- PARTICIPANT 1 ---|$)/)?.[1]?.trim() ?? reply;
    const p1 = reply.match(/--- PARTICIPANT 1 ---([\s\S]*?)(?=--- PARTICIPANT 2 ---|$)/)?.[1]?.trim() ?? '';
    const p2 = reply.match(/--- PARTICIPANT 2 ---([\s\S]*?)$/)?.[1]?.trim() ?? '';

    return { crossReference: crossRef, p1Report: p1, p2Report: p2 };
  }

  async feedbackSummary() {
    const feedback = await this.prisma.outcomeFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        feltFair: true,
        note: true,
        createdAt: true,
        ground: { select: { label: true, organization: { select: { slug: true } } } },
      },
    });

    const total = feedback.length;
    const fairCount = feedback.filter(f => f.feltFair).length;

    return {
      total,
      fairRate: total > 0 ? Math.round((fairCount / total) * 100) : null,
      recent: feedback.map(f => ({
        id: f.id,
        feltFair: f.feltFair,
        note: f.note,
        groundLabel: f.ground.label,
        orgSlug: f.ground.organization.slug,
        createdAt: f.createdAt,
      })),
    };
  }
}
