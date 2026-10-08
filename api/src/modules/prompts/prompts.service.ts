import { theActivationFunnel } from '../engagement/the-activation-funnel';
import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService, ChatTurn } from '../conversation/anthropic.service';
import { SEED_PROMPTS } from '../conversation/prompt-library';
import { seatsByOrganisation } from '../../common/seats';
import { Prisma } from '@prisma/client';
import { A_CUSTOMER, A_REAL_CHECK_IN, A_REAL_SESSION, CLOSED_BY_THE_CLOCK, usageEventsByCustomers, aMean, inRange, session2RateOfThoseDue, sinceFor } from './what-the-platform-has-actually-done';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/** What the start writes in `activated_by` when it activates a version itself (decision 74, item 6). */
export const SEEDED_ON_START = 'seeded on start';
/** What `activated_by` says when a version was activated by hand and nobody's id was given. */
export const ACTIVATED_BY_HAND = 'by hand';

/**
 * WHETHER THE ACTIVE VERSION IS THE SEEDING'S OWN, SO A START MAY REPLACE IT (decision 74, item 6).
 *
 *   - `activated_by` is SEEDED_ON_START: the start activated it.
 *   - `activated_by` is anything else: somebody activated it by hand. Never replaced.
 *   - `activated_by` is empty: activated before this rule, when nothing wrote the column. It counts as
 *     the seeding's own only when the seeding made it: its summary is "Seeded on deploy", or it is
 *     version 1 with no summary, which is how prisma/seed.ts writes a key's first version. Anything
 *     else, such as a version made through /prompts with a summary of its own, is kept.
 */
export function theSeedingActivatedIt(v: { activatedBy?: string | null; summary?: string | null; version?: number | null }): boolean {
  if (v.activatedBy) return v.activatedBy === SEEDED_ON_START;
  if (v.summary === 'Seeded on deploy') return true;
  return v.version === 1 && !v.summary;
}

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
   * Seed-on-deploy (B7): ensure every seeded prompt key has an active version, so a deploy that
   * changes a seed prompt (e.g. report_synthesis) takes effect without manual SQL. History is kept.
   *
   * A START NEVER OVERWRITES A PROMPT SOMEBODY ACTIVATED BY HAND (decision 74, item 6). For each key:
   *   - When the file's words are new, a new version is added ("Seeded on deploy"), always.
   *   - It is made active only when the active version is the seeding's own (see
   *     `theSeedingActivatedIt`), or when the key has no active version at all.
   *   - When somebody activated the active version by hand, it stays active. The new words wait as
   *     an inactive version, and the start says so in its log.
   * Which is which is `activated_by`: the seeding writes SEEDED_ON_START there, and activating by
   * hand through /prompts writes the admin's user id.
   */
  async onModuleInit() {
    let kept = 0;
    for (const seed of SEED_PROMPTS) {
      const active = await this.prisma.promptVersion.findFirst({ where: { key: seed.key, isActive: true } });
      if (active && active.content === seed.content) continue;

      const sameContent = await this.prisma.promptVersion.findFirst({
        where: { key: seed.key, content: seed.content },
        orderBy: { version: 'desc' },
      });
      const theWords = sameContent ?? (await this.createVersion(seed.key, seed.content, 'Seeded on deploy'));

      if (active && !theSeedingActivatedIt(active)) {
        kept += 1;
        this.logger.warn(
          `The prompt "${seed.key}" was activated by hand (version ${active.version}), so it stays active. The words in the code are kept as version ${theWords.version}, not active.`,
        );
        continue;
      }
      await this.activate(theWords.id, SEEDED_ON_START);
    }
    this.logger.log(`Prompt seed ensured for ${SEED_PROMPTS.length} key(s). ${kept} activated by hand stayed as they were.`);
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

  /** All versions, newest first per key - for the prompt-management screen. */
  async list() {
    return this.prisma.promptVersion.findMany({
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
      select: { id: true, key: true, version: true, summary: true, isActive: true, activatedAt: true, createdAt: true, content: true },
    });
  }

  /** Create a new version. Does not activate it - activation is deliberate. */
  async createVersion(key: string, content: string, summary?: string) {
    if (key === 'system') {
      const INVARIANTS = [
        'BANNED WORDS AND PHRASES:',
        'CONSENT ARCHITECTURE',
        'BANNED WORDS: never use these in any user-facing response:',
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

  /**
   * Usage funnel - session drop-off, scenario/moment/status breakdowns, engagement stats. Every count
   * is over customers' check-ins and real sessions, within the one range the panel asked for; see
   * what-the-platform-has-actually-done.ts.
   */
  async usageFunnel(range?: string) {
    const now = new Date();
    const since = sinceFor(range, now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const aGround = { ...A_REAL_CHECK_IN, ...inRange('createdAt', since) };
    const aSession = { ...A_REAL_SESSION, status: 'COMPLETED' as const, ...inRange('completedAt', since) };
    const sinceSql = since ? Prisma.sql`AND ci.completed_at >= ${since}` : Prisma.empty;

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
      activation,
    ] = await Promise.all([
      // 1. Completed sessions per session number (1-7)
      Promise.all(
        [1, 2, 3, 4, 5, 6, 7].map((n) =>
          this.prisma.checkIn.count({ where: { ...aSession, sessionNumber: n } }).then((count) => ({ session: n, completed: count })),
        ),
      ),

      // 2. Avg session duration in minutes, with the sample size (raw SQL). Only sessions a person
      //    finished: the clock closes the rest a day later (see CLOSED_BY_THE_CLOCK).
      this.prisma.$queryRaw<{ session_number: number; avg_minutes: number; n: number }[]>`
        SELECT ci.session_number, ROUND(AVG(EXTRACT(EPOCH FROM (ci.completed_at - ci.started_at)) / 60)::numeric, 1)::float as avg_minutes, COUNT(*)::int as n
        FROM check_ins ci
        JOIN grounds g ON g.id = ci.ground_id
        JOIN organizations o ON o.id = g.organization_id
        WHERE ci.status = 'COMPLETED' AND ci.started_at IS NOT NULL AND ci.completed_at IS NOT NULL
          AND ci.is_setup = false AND o.is_internal = false ${sinceSql}
          AND ci.closed_reason IS DISTINCT FROM ${CLOSED_BY_THE_CLOCK}
        GROUP BY ci.session_number
        ORDER BY ci.session_number
      `,

      // 3. Scenario breakdown
      this.prisma.ground.groupBy({ by: ['scenario'], where: aGround, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),

      // 4. Moment breakdown
      this.prisma.ground.groupBy({ by: ['moment'], where: aGround, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),

      // 5. Status breakdown
      this.prisma.ground.groupBy({ by: ['status'], where: aGround, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),

      // 6. Check-ins where both the lead AND at least one participant have given a session
      this.prisma.ground.count({
        where: {
          ...aGround,
          checkIns: { some: { ...aSession, participant: { partyType: 'INITIATOR' } } },
          AND: [{ checkIns: { some: { ...aSession, participant: { partyType: 'PARTICIPANT' } } } }],
        },
      }),

      // 7. Check-ins with any given session (to compute one-sided)
      this.prisma.ground.count({ where: { ...aGround, checkIns: { some: aSession } } }),

      // 8. Stalled sessions: IN_PROGRESS and startedAt > 7 days ago
      this.prisma.checkIn.count({ where: { ...A_REAL_SESSION, status: 'IN_PROGRESS', startedAt: { lt: sevenDaysAgo } } }),

      // 9. Session 5 completed count
      this.prisma.checkIn.count({ where: { ...aSession, sessionNumber: 5 } }),

      // 10. Avg days from check-in creation to first session, with the sample size (raw SQL)
      this.prisma.$queryRaw<{ avg_days: number | null; n: number }[]>`
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (ci.started_at - g.created_at)) / 86400)::numeric, 1)::float as avg_days, COUNT(*)::int as n
        FROM grounds g
        JOIN organizations o ON o.id = g.organization_id
        JOIN check_ins ci ON ci.ground_id = g.id
        WHERE ci.session_number = 1 AND ci.started_at IS NOT NULL AND ci.is_setup = false AND o.is_internal = false ${sinceSql}
      `,

      // 11. How far each check-in got towards being useful, and what became of the mail sent to bring people back (engagement spec sections 2, 34 and 35)
      /* An extra read: if it cannot be made, the rest of the tab still is. */
      theActivationFunnel(this.prisma, since, now).catch(() => null),
    ]);

    // Build funnel with drop-off rates, each carrying the count it is a rate of
    const funnelBySession = sessionCounts.map((row, idx) => ({
      session: row.session,
      completed: row.completed,
      dropOffRate: idx === 0 ? null : sessionCounts[idx - 1].completed > 0
        ? Math.round((1 - row.completed / sessionCounts[idx - 1].completed) * 100) / 100
        : null,
      of: idx === 0 ? null : sessionCounts[idx - 1].completed,
    }));

    /* Percentages are computed here, beside their totals, for every breakdown alike. byScenario's
       was here and byStatus's was on the client, which is how two panels drift. */
    const withPct = <T extends { _count: { id: number } }>(rows: T[]) => {
      const total = rows.reduce((sum, r) => sum + r._count.id, 0);
      return { total, pctOf: (r: T) => (total > 0 ? Math.round((r._count.id / total) * 1000) / 10 : 0) };
    };
    const scenarios = withPct(scenarioBreakdown);
    const byScenario = scenarioBreakdown.map((r) => ({ scenario: r.scenario, count: r._count.id, pct: scenarios.pctOf(r), of: scenarios.total }));
    const statuses = withPct(statusBreakdown);
    const byStatus = statusBreakdown.map((r) => ({ status: r.status, count: r._count.id, pct: statuses.pctOf(r), of: statuses.total }));
    const byMoment = momentBreakdown.map((r) => ({ moment: r.moment, count: r._count.id }));

    const oneEngaged = anyCompletedGrounds - bothEngaged;

    const avgDaysRow = avgDaysRaw[0];
    const avgDaysToFirstCheckin = aMean(avgDaysRow?.avg_days != null ? Number(avgDaysRow.avg_days) : null, Number(avgDaysRow?.n ?? 0));

    const avgSessionMinutes = avgSessionMinutesRaw.map((r) => ({
      session: Number(r.session_number),
      avgMinutes: aMean(Number(r.avg_minutes), Number(r.n)).value,
      n: Number(r.n),
    }));

    return {
      range: range ?? 'all',
      since,
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
      activation,
    };
  }

  /**
   * Cross-org usage dashboard - platform admin only. Customers' organisations and check-ins, real
   * sessions, within the one range; the session-two rate is over those whose session two was due.
   */
  async platformDashboard(range?: string) {
    const now = new Date();
    const since = sinceFor(range, now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const aGround = { ...A_REAL_CHECK_IN, ...inRange('createdAt', since) };
    const aSession = { ...A_REAL_SESSION, status: 'COMPLETED' as const };

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
      session2,
      promptVersions,
      recentCheckIns,
      recentGrounds,
      recentResolutions,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { ...A_CUSTOMER, ...inRange('createdAt', since) } }),
      this.prisma.organization.count({ where: { ...A_CUSTOMER, careFeeStatus: 'ACTIVE' } }),
      this.prisma.organization.count({ where: { ...A_CUSTOMER, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.ground.groupBy({ by: ['status'], where: aGround, _count: { id: true } }),
      this.prisma.ground.count({ where: aGround }),
      this.prisma.ground.count({ where: { ...A_REAL_CHECK_IN, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.ground.count({ where: { ...A_REAL_CHECK_IN, resolvedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.checkIn.count({ where: { ...aSession, ...inRange('completedAt', since) } }),
      this.prisma.checkIn.count({ where: { ...aSession, completedAt: { gte: sevenDaysAgo } } }),
      this.prisma.checkIn.count({ where: { ...aSession, completedAt: { gte: thirtyDaysAgo } } }),
      session2RateOfThoseDue(this.prisma, since, now),
      this.prisma.promptVersion.findMany({
        orderBy: [{ key: 'asc' }, { version: 'desc' }],
        select: { id: true, key: true, version: true, isActive: true, activatedAt: true, createdAt: true },
      }),
      /* WITH A TIME, OR NOT IN THE FEED (item 19). Postgres puts a null first in a descending
         order, so one session marked complete with no completion time came first here, and the
         sort below read its null date and threw: the whole System tab came back as an error. A
         session with no time has no place in a list ordered by time; it is still counted above. */
      this.prisma.checkIn.findMany({
        where: { ...aSession, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 15,
        select: {
          completedAt: true,
          sessionNumber: true,
          ground: { select: { label: true, organization: { select: { slug: true } } } },
        },
      }),
      this.prisma.ground.findMany({
        where: A_REAL_CHECK_IN,
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
        where: { ...A_REAL_CHECK_IN, resolvedAt: { not: null } },
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
      where: { ground: A_REAL_CHECK_IN },
      select: { promptVersionId: true, resolvedState: true },
    });
    const feedback = await this.prisma.outcomeFeedback.findMany({
      where: { ground: A_REAL_CHECK_IN },
      select: {
        feltFair: true,
        ground: { select: { promptVersionId: true } },
      },
    });

    /* CHECK-INS USING A VERSION ARE CHECK-INS (item 19). `groundsUsingIt` counted outcomes, which only
       a check-in that reached an agreed end has: on the test database 24 against 1,393 customers'
       check-ins that record a version, and the active version read 0. */
    const groundsByVersion = await this.prisma.ground.groupBy({
      by: ['promptVersionId'],
      where: { ...A_REAL_CHECK_IN, promptVersionId: { not: null } },
      _count: { id: true },
    });
    const groundsOn = new Map(groundsByVersion.map((r) => [r.promptVersionId, r._count.id]));

    const promptPerformance = promptVersions.map((pv) => {
      const pvOutcomes = outcomes.filter((o) => o.promptVersionId === pv.id);
      const pvFeedback = feedback.filter((f) => f.ground.promptVersionId === pv.id);
      const fairCount = pvFeedback.filter((f) => f.feltFair).length;
      return {
        ...pv,
        groundsUsingIt: groundsOn.get(pv.id) ?? 0,
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
      .filter((a) => a.at instanceof Date)
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 20);

    const statusTotal = groundsByStatus.reduce((sum, r) => sum + r._count.id, 0);
    const byStatus = Object.fromEntries(groundsByStatus.map((r) => [r.status, r._count.id]));

    return {
      range: range ?? 'all',
      since,
      orgs: { total: totalOrgs, withActiveCareFee: activeOrgs, createdLast30Days: orgsLast30Days },
      grounds: { total: totalGrounds, byStatus, byStatusOf: statusTotal, openedLast7Days: groundsLast7Days, resolvedLast30Days },
      checkIns: {
        totalCompleted: totalCheckIns,
        completedLast7Days: checkInsLast7Days,
        completedLast30Days: checkInsLast30Days,
        session2RateOfThoseDue: session2,
      },
      promptPerformance,
      recentActivity: activity,
    };
  }

  /**
   * Activate a version (deactivates other versions of the same key). `activatedBy` is who did it: the
   * admin's user id when it is done by hand through /prompts, or SEEDED_ON_START when the start did
   * it. A start never replaces a version activated by hand (see onModuleInit).
   */
  async activate(id: string, activatedBy: string = ACTIVATED_BY_HAND) {
    const target = await this.prisma.promptVersion.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Prompt version not found');

    await this.prisma.$transaction([
      this.prisma.promptVersion.updateMany({ where: { key: target.key }, data: { isActive: false } }),
      this.prisma.promptVersion.update({ where: { id }, data: { isActive: true, activatedAt: new Date(), activatedBy } }),
    ]);
    return this.prisma.promptVersion.findUnique({ where: { id } });
  }

  /**
   * WHO IS REGISTERED IN ONE ORGANISATION.
   *
   * The console could say an organisation had eleven people and could not say who any of them
   * were. Support ran blind: "did the invitation reach Musa" needs an address, and the only one on
   * the list was whoever signed up.
   *
   * WHAT THIS IS AND IS NOT. It is the account list - who has a login with us, how to reach them,
   * and whether their email is verified. It is not their work: no check-in, no record entry, no
   * report, not one word anybody wrote. That wall is held by its own guard
   * (no-staff-surface-shows-a-persons-words.spec.ts) and nothing here goes near it.
   *
   * The phone number comes too, because it is the only way to reach somebody who joined by WhatsApp
   * and never gave an address - and an operator who cannot reach them is the reason this exists.
   */
  async peopleIn(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });
    if (!org) throw new NotFoundException('Organisation not found');

    const users = await this.prisma.user.findMany({
      where: { organizationId },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        role: true,
        isPlatformAdmin: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    return {
      org,
      people: users.map((u) => ({
        id: u.id,
        /* The name they gave, and nothing invented from the address when they gave none: an email
           split at the @ is not what somebody is called, and this console has done that before. */
        name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null,
        email: u.email,
        phoneNumber: u.phoneNumber,
        role: u.role,
        isPlatformAdmin: u.isPlatformAdmin,
        isEmailVerified: u.isEmailVerified,
        joinedAt: u.createdAt,
      })),
    };
  }

  async orgList() {
    /* Every organisation, ours included - the list is for finding one, not for counting them - with
       ours marked so the eye can skip them. The two dead queries that used to sit here (a ground
       count fetched twice, a participant count never read) are gone. */
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        careFeeStatus: true,
        createdAt: true,
        isInternal: true,
        _count: { select: { grounds: true } },
      },
    });
    /* People by the seat rule the organisation's own People page and its plan read (item 19). */
    const seats = await seatsByOrganisation(this.prisma);

    const lastSession = await this.prisma.checkIn.groupBy({
      by: ['groundId'],
      where: { status: 'COMPLETED', isSetup: false },
      _max: { completedAt: true },
    });
    const groundOrg = await this.prisma.ground.findMany({
      where: { id: { in: lastSession.map((r) => r.groundId) } },
      select: { id: true, organizationId: true },
    });
    const orgOf = Object.fromEntries(groundOrg.map((g) => [g.id, g.organizationId]));
    const lastActivityMap: Record<string, Date> = {};
    for (const row of lastSession) {
      const orgId = orgOf[row.groundId];
      const at = row._max.completedAt;
      if (!orgId || !at) continue;
      if (!lastActivityMap[orgId] || lastActivityMap[orgId] < at) lastActivityMap[orgId] = at;
    }

    return orgs.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      email: org.email,
      billingActive: org.careFeeStatus === 'ACTIVE',
      careFeeStatus: org.careFeeStatus,
      isInternal: org.isInternal,
      groundCount: org._count.grounds,
      userCount: seats.get(org.id) ?? 0,
      lastActivity: lastActivityMap[org.id] ?? null,
      createdAt: org.createdAt,
    }));
  }

  /**
   * Three totals for three different objects, each labelled with its own word on the panel:
   * sessions completed (CheckIn), check-ins created (Ground), reports released. The middle tile
   * was labelled "Check-ins created" over a Ground count and the first "Check-ins completed" over a
   * CheckIn count; 243 x 2 ~ 484 read as a funnel and was a grain mismatch.
   */
  async usageStats(range?: string) {
    const now = new Date();
    const since = sinceFor(range, now);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const aSession = { ...A_REAL_SESSION, status: 'COMPLETED' as const };

    const [checkInsByDay, usageEvents, sessionsCompleted, reportsReleased, checkInsCreated] = await Promise.all([
      this.prisma.checkIn.findMany({
        where: { ...aSession, completedAt: { gte: fourteenDaysAgo } },
        select: { completedAt: true, sessionNumber: true },
      }),
      usageEventsByCustomers(this.prisma, since),
      this.prisma.checkIn.count({ where: { ...aSession, ...inRange('completedAt', since) } }),
      this.prisma.ground.count({ where: { ...A_REAL_CHECK_IN, report: { releasedAt: since ? { gte: since } : { not: null } } } }),
      this.prisma.ground.count({ where: { ...A_REAL_CHECK_IN, ...inRange('createdAt', since) } }),
    ]);

    // Bucket sessions by day label
    const dayBuckets: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = whenItWas(d, 'dayAndMonth');
      dayBuckets[key] = 0;
    }
    for (const ci of checkInsByDay) {
      if (!ci.completedAt) continue;
      const key = whenItWas(ci.completedAt, 'dayAndMonth');
      if (key in dayBuckets) dayBuckets[key]++;
    }

    const usageMap = usageEvents;

    return {
      range: range ?? 'all',
      since,
      sessionsLast14Days: Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
      sessionsCompleted,
      checkInsCreated,
      reportsReleased,
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
2. A participant 1 report - speaks only to participant 1's own account, in second person.
3. A participant 2 report - speaks only to participant 2's own account, in second person.

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
    /* EVERY ANSWER, AND ONLY CUSTOMERS' (item 19). `total` and `fairRate` were read off the fifty most
       recent answers, so past fifty the total stopped at 50 and the rate covered only the latest; and
       our own organisations' answers were counted. Both are counted over all customers' answers now;
       the list still shows the latest fifty. */
    const ofACustomer = { ground: A_REAL_CHECK_IN };
    const [total, fairCount] = await Promise.all([
      this.prisma.outcomeFeedback.count({ where: ofACustomer }),
      this.prisma.outcomeFeedback.count({ where: { ...ofACustomer, feltFair: true } }),
    ]);
    const feedback = await this.prisma.outcomeFeedback.findMany({
      where: ofACustomer,
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
