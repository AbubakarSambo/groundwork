import { THE_ORGANISATION_SWITCHES, isAnOrganisationSwitch } from './the-organisation-switches';
import { DAILY_USAGE_KEY, DailyUsageSetting, isAnHour, theDailyUsageSetting, theHourSaid } from '../back-office/the-daily-usage-summary';
import { recipients, theBackOfficeRoster } from '../back-office/the-team-is-told';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SEAT_RELATION_COUNT } from '../../common/seats';
import { isCovered, ACTIVE } from '../../common/subscription';
import { A_CUSTOMER, A_REAL_CHECK_IN } from '../prompts/what-the-platform-has-actually-done';
import {
  CORRECTION_WINDOW_KEY, DEFAULT_CORRECTION_WINDOW_DAYS, MAX_CORRECTION_WINDOW_DAYS, isAWindow,
} from '../conversation/the-window-for-correcting-a-record';
import {
  SUGGESTION_THRESHOLDS_KEY, SUGGESTION_THRESHOLD_LABELS, isValidSuggestionThresholds,
  thresholdsInForce, type SuggestionThresholds,
} from '../suggestions/thresholds';
import { fullNameToCall } from '../engagement/a-name-to-call-them';
import { DELIVERY_ALERT_KEY, anEmailAddress, theDeliveryAlertAddress } from '../engagement/the-daily-delivery-alert';

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  /**
   * One-time platform-admin bootstrap. Runs on every startup, but is a no-op
   * unless BOTH: (a) PLATFORM_ADMIN_BOOTSTRAP_EMAIL is set, and (b) no
   * platform admin exists anywhere yet. Once any platform admin exists, this
   * never fires again - it cannot be used to add a second admin, or to
   * re-promote someone after they're demoted. Promoting anyone beyond the
   * first admin goes through POST /admin/add-admin (platform-admin + OTP),
   * same as always.
   */
  async onApplicationBootstrap() {
    const bootstrapEmail = this.config.get<string>('app.platformAdminBootstrapEmail');
    if (!bootstrapEmail) return;

    const anyPlatformAdminExists = await this.prisma.user.findFirst({ where: { isPlatformAdmin: true } });
    if (anyPlatformAdminExists) return;

    const user = await this.prisma.user.findUnique({ where: { email: bootstrapEmail.toLowerCase() } });
    if (!user) {
      /**
       * LOUD, not a shrug.
       *
       * This used to log "no user found - skipping" at WARN and carry on, so an
       * operator who set the variable on a fresh install got no platform admin,
       * no account, and no error - just one line in a busy boot log. The
       * back-office review surfaces were unreachable for an entire eighteen-ground
       * test run for exactly this reason, and the conclusion drawn at the time was
       * that the feature did not exist. GW-002.
       *
       * It still does not CREATE the account: this promotes a real person who has
       * signed up, and inventing a user with no password or verified address would
       * be a worse answer than saying so. But it now says so unmistakably, and
       * tells the operator the one thing they need to do next.
       */
      this.logger.error(
        `Platform admin bootstrap FAILED: PLATFORM_ADMIN_BOOTSTRAP_EMAIL is set to "${bootstrapEmail}" ` +
          'but no user has that address, so NO platform admin exists and the back-office is unreachable. ' +
          'Sign that address up through the normal flow, then restart the API - this runs once, ' +
          'and only while no platform admin exists.',
      );
      return;
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
    this.logger.warn(`Platform admin bootstrap: promoted ${bootstrapEmail} to platform admin (first admin, one-time only)`);
  }

  // ---------------------------------------------------------------------------
  // Platform stats
  // ---------------------------------------------------------------------------

  /**
   * RELEASE 1'S SALES BOARD FOR ONE ORGANISATION (board/release-one-sales-board). Writes the one column and nothing else. Said
   * back in a full sentence, for the Orgs tab to show as it is given.
   */
  /** Every switch of one organisation, as the ops team reads them (the-organisation-switches). Staff only, by the admin controller's guard. */
  async theSwitchesOf(organizationId: string): Promise<{ id: string; name: string; switches: { key: string; name: string; on: boolean }[] }> {
    const select = Object.fromEntries([['id', true], ['name', true], ...THE_ORGANISATION_SWITCHES.map((s) => [s.key, true])]);
    const org: any = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: select as any });
    if (!org) throw new NotFoundException('That organisation could not be found, so refresh the list and try again.');
    return { id: org.id, name: org.name, switches: THE_ORGANISATION_SWITCHES.map((s) => ({ key: s.key, name: s.name, on: !!org[s.key] })) };
  }

  /** One switch of one organisation, on or off. Only the switches in the list; nothing else on the organisation is written. */
  async setASwitch(organizationId: string, key: string, on: boolean) {
    if (!isAnOrganisationSwitch(key)) throw new BadRequestException('That is not a switch an organisation has.');
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!org) throw new NotFoundException('That organisation could not be found, so refresh the list and try again.');
    await this.prisma.organization.update({ where: { id: organizationId }, data: { [key]: on } as any });
    return this.theSwitchesOf(organizationId);
  }

  async setReleaseOneSalesBoard(organizationId: string, on: boolean): Promise<{ id: string; name: string; release1SalesBoardOn: boolean; says: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!org) throw new NotFoundException('That organisation could not be found, so refresh the list and try again.');
    const row = await this.prisma.organization.update({ where: { id: organizationId }, data: { release1SalesBoardOn: on }, select: { id: true, name: true, release1SalesBoardOn: true } });
    return {
      ...row,
      says: on
        ? `${row.name} now has the new sales board. Its board, team report and weekly report show it from the next time they are opened.`
        : `${row.name} is back on its previous board. Nothing it has said or added is lost.`,
    };
  }

  /**
   * RELEASE 2 FOR ONE ORGANISATION (grounds/release-2-collections): "Collect what's owed" in the picker, the switchboard's
   * Release 2 rows and the type in "What it is". Writes the one column and nothing else. Said back in a full sentence, for the
   * Orgs tab to show as it is given.
   */
  async setRelease2Collections(organizationId: string, on: boolean): Promise<{ id: string; name: string; release2CollectionsOn: boolean; says: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!org) throw new NotFoundException('That organisation could not be found, so refresh the list and try again.');
    const row = await this.prisma.organization.update({ where: { id: organizationId }, data: { release2CollectionsOn: on }, select: { id: true, name: true, release2CollectionsOn: true } });
    return {
      ...row,
      says: on
        ? `${row.name} can now start a check-in to collect what is owed, and its leads confirm each check-in's type in People and setup. No existing check-in changes.`
        : `${row.name} is back to what it had before. No new check-in can be started to collect what is owed, and nothing is lost.`,
    };
  }

  /** THE COACHING OUTPUTS, WITH THEIR INPUT. Coaching is always on (22 November 2026); this is where somebody reads what it did. */
  async getCoaching() {
    const rows = await this.prisma.coachingState.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 200,
        include: {
          participant: {
            select: {
              id: true, roleAsDescribed: true, detectedFunction: true, detectedFunctionConfidence: true, nameGiven: true,
              user: { select: { firstName: true, lastName: true, email: true } },
              ground: { select: { id: true, label: true, scenario: true, organization: { select: { name: true } } } },
            },
          },
        },
      });
    return {
      count: rows.length,
      rows: rows.map((r) => ({
        participantId: r.participantId,
        /* The name they were given when invited, before "Someone" (review of 1678157c). */
        who: fullNameToCall({ user: r.participant.user, nameGiven: (r.participant as any).nameGiven }),
        organisation: r.participant.ground?.organization?.name ?? null,
        ground: r.participant.ground?.label ?? null,
        scenario: r.participant.ground?.scenario ?? null,
        roleAsDescribed: r.participant.roleAsDescribed,
        detectedFunction: r.participant.detectedFunction,
        detectedFunctionConfidence: r.participant.detectedFunctionConfidence,
        currentStep: r.currentStep,
        stepGivenAt: r.stepGivenAt,
        staircase: r.staircase,
        staircasePosition: r.staircasePosition,
        history: r.history,
        lastInput: r.lastInput,
        observations: (r as any).observations ?? [],
        updatedAt: r.updatedAt,
      })),
    };
  }

  /**
   * WHERE THE DAILY DELIVERY ALERT GOES (engagement/the-daily-delivery-alert.ts): one address, saved here, else the server setting
   * DELIVERY_ALERT_EMAIL. Empty by default, and nothing is sent while it is empty.
   */
  async getDeliveryAlert(): Promise<{ email: string | null; from: 'here' | 'server' | null }> {
    return theDeliveryAlertAddress(this.prisma);
  }

  /** An empty value clears the saved address, and the server setting is used again if there is one. */
  async setDeliveryAlert(raw: unknown, adminUserId: string): Promise<{ email: string | null; from: 'here' | 'server' | null }> {
    const given = typeof raw === 'string' ? raw.trim() : '';
    const email = given ? anEmailAddress(given) : '';
    if (email === null) throw new BadRequestException('That needs to be one email address, for example ops@myground.work.');
    await this.prisma.platformSetting.upsert({
      where: { key: DELIVERY_ALERT_KEY },
      create: { key: DELIVERY_ALERT_KEY, value: email, updatedBy: adminUserId },
      update: { value: email, updatedBy: adminUserId },
    });
    return theDeliveryAlertAddress(this.prisma);
  }

  /**
   * THE DAILY USAGE SUMMARY (back-office/the-daily-usage-summary.ts): whether it goes and at which hour in Lagos. It goes to the
   * back-office roster, the same people told about each new sign-up, so the page says who that is today rather than asking for an address.
   */
  async getDailyUsage(): Promise<DailyUsageSetting & { to: string[]; hours: string[] }> {
    const [setting, roster] = await Promise.all([theDailyUsageSetting(this.prisma), theBackOfficeRoster(this.prisma)]);
    return { ...setting, to: recipients(roster), hours: Array.from({ length: 24 }, (_, h) => theHourSaid(h)) };
  }

  async setDailyUsage(body: { on?: unknown; hour?: unknown }, adminUserId: string): Promise<DailyUsageSetting & { to: string[]; hours: string[] }> {
    const now = await theDailyUsageSetting(this.prisma);
    if (body?.on !== undefined && typeof body.on !== 'boolean') throw new BadRequestException('Say whether the daily usage summary is on or off.');
    if (body?.hour !== undefined && !isAnHour(body.hour)) throw new BadRequestException('The hour is a whole number from 0 to 23, in Lagos time.');
    const value = { on: (body?.on as boolean | undefined) ?? now.on, hour: (body?.hour as number | undefined) ?? now.hour };
    await this.prisma.platformSetting.upsert({
      where: { key: DAILY_USAGE_KEY },
      create: { key: DAILY_USAGE_KEY, value, updatedBy: adminUserId },
      update: { value, updatedBy: adminUserId },
    });
    return this.getDailyUsage();
  }

  async getCorrectionWindow(): Promise<{ days: number; default: number; max: number }> {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: CORRECTION_WINDOW_KEY } }).catch(() => null);
    return { days: isAWindow(row?.value) ? (row!.value as number) : DEFAULT_CORRECTION_WINDOW_DAYS, default: DEFAULT_CORRECTION_WINDOW_DAYS, max: MAX_CORRECTION_WINDOW_DAYS };
  }

  /** Zero is allowed, on purpose - see the-window-for-correcting-a-record.ts. Above the ceiling is not. */
  async setCorrectionWindow(days: unknown, adminUserId: string): Promise<{ days: number; default: number; max: number }> {
    if (!isAWindow(days)) {
      throw new BadRequestException(`The correction window is a whole number of days from 0 to ${MAX_CORRECTION_WINDOW_DAYS}.`);
    }
    await this.prisma.platformSetting.upsert({
      where: { key: CORRECTION_WINDOW_KEY },
      create: { key: CORRECTION_WINDOW_KEY, value: days, updatedBy: adminUserId },
      update: { value: days, updatedBy: adminUserId },
    });
    return { days, default: DEFAULT_CORRECTION_WINDOW_DAYS, max: MAX_CORRECTION_WINDOW_DAYS };
  }

  /**
   * THE THRESHOLDS FOR A SUGGESTION (week 10, decision 33; decision 61). Read the same defensive
   * way suggestions itself reads them - a bad row means nothing set, never a guess.
   *
   * `readSuggestionThresholds` never returns anything but an object, so `?? DEFAULT_...` never
   * fired: a database with no row at all read back as `{}`, not the support default decision 61
   * sets from day one. The migration `20260930110000_the_first_threshold_for_extra_support` writes
   * the row so this should not happen in practice, but the read falls back properly too, only when
   * the row itself is missing - a row that exists, even empty, is something an admin set and is
   * read exactly as stored, never overwritten by a default here. The rule is `thresholdsInForce`,
   * the same one the engine reads with, so this page never shows a threshold the engine is not using.
   */
  async getSuggestionThresholds(): Promise<{ thresholds: SuggestionThresholds; labels: typeof SUGGESTION_THRESHOLD_LABELS }> {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: SUGGESTION_THRESHOLDS_KEY } }).catch(() => null);
    const thresholds = thresholdsInForce(row);
    return { thresholds, labels: SUGGESTION_THRESHOLD_LABELS };
  }

  /**
   * Written the same way the WhatsApp switch, the correction window and the two free limits are
   * written, from the same page. Anything that is not the documented shape is refused with a plain
   * sentence rather than silently dropped or guessed at - see thresholds.ts for what is checked.
   */
  async setSuggestionThresholds(thresholds: unknown, adminUserId: string): Promise<{ thresholds: SuggestionThresholds }> {
    if (!isValidSuggestionThresholds(thresholds)) {
      throw new BadRequestException(
        'Each verdict (keep, reward, support, plan, exit) needs a keptBelow fraction greater than 0 and no more than 1, ' +
          'and a whole number of settled commitments (overPeriods) greater than 0, and nothing else should be sent.',
      );
    }
    await this.prisma.platformSetting.upsert({
      where: { key: SUGGESTION_THRESHOLDS_KEY },
      create: { key: SUGGESTION_THRESHOLDS_KEY, value: thresholds as any, updatedBy: adminUserId },
      update: { value: thresholds as any, updatedBy: adminUserId },
    });
    return { thresholds };
  }

  /**
   * ZERO-ROW DETECTION.
   *
   * Three subsystems were wired and never fired for the life of the codebase, and all three were
   * found by reading. This is the check that finds the next one by looking: every table a writer
   * should fill in normal operation, its row count, its last write, and the date its table shipped
   * (from the migration that created it). Zero rows since it shipped is flagged. It lives on the
   * admin dashboard, not in a log.
   */
  async getWriters() {
    /*
     * "NEVER FIRED" AND "NOTHING HAS ASKED IT TO" ARE DIFFERENT FACTS. Twelve tables sat at zero and
     * the panel called all twelve a writer that has never fired, which reads as twelve broken
     * subsystems. Walked through on 10 September 2026: none of them were broken. Some wait on a
     * customer's own system to send something, some wait on a check-in to end, and until this month
     * no check-in ever had. `needs` says what makes each one write, so a zero can be read.
     */
    const WRITERS: { table: string; writer: string; needs?: string }[] = [
      { table: 'record_entries', writer: 'record extraction at complete()' },
      { table: 'pattern_detections', writer: 'pattern engine on CHECK_IN_COMPLETED' },
      { table: 'coaching_states', writer: 'coaching observation at complete()' },
      { table: 'work_mentions', writer: 'work-mention extractor' },
      { table: 'ground_dependencies', writer: 'dependency extractor' },
      { table: 'deliveries', writer: 'progress extractor, and the person\'s own board' },
      { table: 'proposed_changes', writer: 'a change asked for against an objective', needs: 'a customer system asking for a change against an objective, through the API' },
      { table: 'interactions', writer: 'what-they-say-happened extractor, and the API', needs: 'the what-they-say-happened extractor, or the API' },
      { table: 'person_objectives', writer: "a person's own aims from their assessment, and objective setup" },
      { table: 'ground_documents', writer: 'uploads' },
      { table: 'participant_notes', writer: 'between-session notes' },
      { table: 'lead_context_notes', writer: 'the lead\'s context chat' },
      { table: 'person_style_profiles', writer: 'style read at complete()' },
      { table: 'reports', writer: 'report synthesis' },
      { table: 'report_rounds', writer: 'report rounds' },
      { table: 'knowledge_cards', writer: 'how-we-do-it cards' },
      { table: 'knowledge_retrievals', writer: 'howWeDoIt prompt block', needs: 'a question that a how-we-do-it card answers' },
      { table: 'assistant_proposals', writer: 'the assistant' },
      { table: 'objective_drafts', writer: 'objective drafting' },
      { table: 'draft_contributions', writer: 'objective drafting' },
      { table: 'ground_baselines', writer: 'baseline at setup' },
      { table: 'resolutions', writer: 'resolution flow', needs: 'a check-in reaching an agreed end' },
      { table: 'outcomes', writer: 'outcome capture', needs: 'a check-in reaching an agreed end' },
      { table: 'outcome_feedback', writer: 'outcome feedback', needs: 'somebody answering whether the outcome felt fair, after a check-in has ended' },
      { table: 'evaluations_due', writer: 'review-due detector', needs: 'a customer system telling us a review is coming up, through the API' },
      { table: 'assertions', writer: 'assertion engine', needs: 'the alignment routes, which a customer drives' },
      { table: 'reported_figures', writer: 'figures extractor', needs: 'the alignment routes, which a customer drives' },
      { table: 'obligations', writer: 'obligations and signing', needs: 'the alignment routes, which a customer drives' },
      { table: 'agreements', writer: 'agreements', needs: 'the alignment routes, which a customer drives' },
      { table: 'documents_elsewhere', writer: 'documents that live elsewhere', needs: 'somebody pasting a link to a document into the assistant' },
      { table: 'product_metrics', writer: 'product metrics', needs: 'a customer system sending a figure against an objective, through the API' },
      { table: 'ground_polls', writer: 'polls', needs: 'a lead setting a meeting poll on the board' },
      { table: 'people', writer: 'the API roster' },
      { table: 'subjects', writer: 'the API' },
      { table: 'webhook_deliveries', writer: 'webhooks' },
    ];
    const shipped = this.whenTablesShipped();
    const rows = await Promise.all(WRITERS.map(async (w) => {
      try {
        const [r] = await this.prisma.$queryRawUnsafe<{ n: bigint; last: Date | null }[]>(
          `SELECT count(*)::bigint AS n, max(created_at) AS last FROM "${w.table}"`,
        );
        const count = Number(r?.n ?? 0);
        return { ...w, count, lastWrite: r?.last ?? null, shippedAt: shipped.get(w.table) ?? null, flagged: count === 0 };
      } catch (err: any) {
        return { ...w, count: null, lastWrite: null, shippedAt: shipped.get(w.table) ?? null, flagged: true, error: String(err?.message ?? err).slice(0, 120) };
      }
    }));
    return { checkedAt: new Date(), flaggedCount: rows.filter((r) => r.flagged).length, rows };
  }

  /** Table -> the date of the migration that created it, read from prisma/migrations. */
  private whenTablesShipped(): Map<string, string> {
    const out = new Map<string, string>();
    try {
      const fs = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const dir = path.resolve(process.cwd(), 'prisma', 'migrations');
      for (const folder of fs.readdirSync(dir).sort()) {
        const file = path.join(dir, folder, 'migration.sql');
        if (!fs.existsSync(file)) continue;
        const sql = fs.readFileSync(file, 'utf8');
        const m = /^(\d{4})(\d{2})(\d{2})/.exec(folder);
        const date = m ? `${m[1]}-${m[2]}-${m[3]}` : folder;
        for (const t of sql.matchAll(/CREATE TABLE "([a-z_]+)"/g)) if (!out.has(t[1])) out.set(t[1], date);
      }
    } catch { /* no migrations dir in this environment: shipped dates are simply unknown */ }
    return out;
  }

  /*
   * THE SAME NUMBERS AS THE PLATFORM PANEL. This was a second console: it counted every organisation
   * and every ground with no filter, so its "total check-ins" and the panel's disagreed whenever
   * one of our own organisations made one. Both read through what-the-platform-has-actually-done.ts
   * now, and this is a private feed of getDashboard rather than a route of its own - the three
   * routes that exposed these halves (stats, usage, feedback) had no caller.
   */
  private async getPlatformStats() {
    const [orgsCount, groundsCount, codesCount, redemptionsCount, freeReasonBreakdown] =
      await Promise.all([
        this.prisma.organization.count({ where: A_CUSTOMER }),
        this.prisma.ground.count({ where: A_REAL_CHECK_IN }),
        this.prisma.contributorCode.count(),
        this.prisma.contributorCodeRedemption.count(),
        this.prisma.ground.groupBy({
          by: ['freeReason', 'isFreeGround'],
          where: A_REAL_CHECK_IN,
          _count: { id: true },
        }),
      ]);

    return {
      orgsCount,
      groundsCount,
      codesCount,
      redemptionsCount,
      freeReasonBreakdown: freeReasonBreakdown.map((r) => ({
        freeReason: r.freeReason,
        isFreeGround: r.isFreeGround,
        count: r._count.id,
      })),
    };
  }

  /**
   * THE PAGE THAT ASKED FOR A ROUTE THAT WAS NEVER BUILT.
   *
   * `/admin/dashboard` renders codes, billing, users and feedback, and it asked
   * for all of it from `GET /admin/dashboard` - which did not exist. It also
   * asked through a hand-rolled `fetch('/api' + path)`, one segment short of the
   * `/api/v1` every other call in the client uses, so on staging the request
   * reached the site rather than the API and came back as the page's own HTML:
   * "Unexpected token '<', "<!doctype "... is not valid JSON". Two faults, and
   * the second hid the first.
   *
   * This is the aggregate the page has always declared, composed from the reads
   * that already existed - one round trip for a page that needs four answers at
   * once.
   */
  async getDashboard() {
    const [stats, codes, feedback, usage, subscribedOrgs, sessionsBalance] = await Promise.all([
      this.getPlatformStats(),
      this.getAllCodes(),
      this.getFeedback(),
      this.getUsagePatterns(),
      /* PAYING NOW, as isSubscribed reads it (item 19). A paused or past-due subscription keeps its
         plan, and was counted as subscribed. */
      this.prisma.organization.count({ where: { ...A_CUSTOMER, subscriptionPlan: { not: null }, subscriptionStatus: ACTIVE } }),
      this.prisma.ground.aggregate({ where: A_REAL_CHECK_IN, _sum: { sessionsBalance: true } }),
    ]);

    /* The four buckets the page draws as a bar, and a fifth it does not draw yet.
       PAID IS A CHECK-IN THAT TOOK A PAID SLOT (item 19): `isFreeGround: false`, the billing record
       stamped at creation. "Paid" was read as "no free reason", and a check-in made free by a path
       that names no reason (the API, an enterprise organisation's own setup) has none, so on the
       test database 27 free check-ins were counted as paid. They are `freeNoReasonGiven` now. */
    const breakdown = { FIRST_GROUND: 0, FREE_TIER: 0, ACCESS_CODE: 0, paid: 0, freeNoReasonGiven: 0 };
    for (const row of stats.freeReasonBreakdown) {
      if (!row.isFreeGround) breakdown.paid += row.count;
      else if (row.freeReason === 'FIRST_GROUND' || row.freeReason === 'FREE_TIER' || row.freeReason === 'ACCESS_CODE') breakdown[row.freeReason] += row.count;
      else breakdown.freeNoReasonGiven += row.count;
    }

    return {
      overview: {
        totalOrgs: stats.orgsCount,
        totalGrounds: stats.groundsCount,
        totalCodes: stats.codesCount,
        totalRedemptions: stats.redemptionsCount,
        totalSubscribedOrgs: subscribedOrgs,
        totalSessionsBalance: sessionsBalance._sum.sessionsBalance ?? 0,
      },
      codes: codes.map((c) => ({
        id: c.id,
        code: c.code,
        creatorEmail: c.createdBy?.email ?? 'no longer here',
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        active: c.isActive,
        allowCodeCreation: c.allowCodeCreation,
        redemptionCount: c._count.redemptions,
      })),
      freeReasonBreakdown: breakdown,
      feedback: feedback.map((f) => ({
        id: f.id,
        note: f.note,
        feltFair: f.feltFair,
        createdAt: f.createdAt,
        groundLabel: f.ground?.label ?? 'a deleted check-in',
        orgSlug: f.ground?.organization?.slug ?? '-',
      })),
      userUsage: usage.perUser.map((u) => ({
        userId: u.id,
        email: u.email,
        groundCount: u._count.groundsInitiated,
        codeCount: u._count.contributorCodes,
        redemptionCount: u._count.codeRedemptions,
        /* Null, honestly. Nothing records a last-seen time, and picking the
           nearest thing we do store - the row's updatedAt - would put a
           confident date under a heading it does not answer. */
        lastActive: null,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Per-user + per-org usage patterns
  // ---------------------------------------------------------------------------

  private async getUsagePatterns() {
    const [perOrg, perUser] = await Promise.all([
      this.prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          freeSessionsUsed: true,
          firstGroundUsed: true,
          careFeeStatus: true,
          _count: { select: { grounds: true, ...SEAT_RELATION_COUNT } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isPlatformAdmin: true,
          role: true,
          organization: { select: { id: true, name: true, slug: true } },
          /* `contributorCodes` is the codes they made; `codeRedemptions` is the
             codes they used. Two different facts about one person, and the
             dashboard shows both. */
          _count: { select: { groundsInitiated: true, codeRedemptions: true, contributorCodes: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    return { perOrg, perUser };
  }

  // ---------------------------------------------------------------------------
  // Codes
  // ---------------------------------------------------------------------------

  async getAllCodes() {
    return this.prisma.contributorCode.findMany({
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        redeemedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        redemptions: {
          include: {
            ground: { select: { id: true, label: true, status: true, freeReason: true } },
            redeemedBy: { select: { id: true, email: true } },
          },
        },
        _count: { select: { redemptions: true, groundsCreated: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCodeUsage(codeId: string) {
    const code = await this.prisma.contributorCode.findUnique({
      where: { id: codeId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        redeemedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        redemptions: {
          include: {
            ground: {
              select: {
                id: true,
                label: true,
                status: true,
                freeReason: true,
                createdAt: true,
                organization: { select: { id: true, name: true } },
              },
            },
            redeemedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { redeemedAt: 'desc' },
        },
        childCodes: {
          select: { id: true, code: true, isActive: true, sessionsGranted: true, sessionsUsed: true },
        },
      },
    });

    if (!code) throw new NotFoundException('That contributor code could not be found, so refresh the page.');
    return code;
  }

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------

  /**
   * #6: internal support view for a single ground. Platform admins had
   * aggregate stats/codes/feedback but NO way to look at an individual
   * ground when a customer reports a problem. State/billing/roster/
   * check-in-status/report-state only - NEVER conversation content.
   *
   * Hard privacy boundary (deliberately excluded, do not add back):
   * - ConversationTurn content (raw check-in text)
   * - RecordEntry content (only counts are safe, never the extracted text)
   * - Any Report content field (sharedPicture, agreements, divergences,
   *   centralQuestion, soloArtifact, hiddenContributors, arcSignals,
   *   finalSynthesis) - existence/releasedAt only, never content, not even
   *   the "anonymized" synthesized version
   * - LeadContextNote text
   * - GroundDocument content/annotations
   * - getMediatorBrief's gapSummary (derived from Report.centralQuestion)
   * - ParticipantRequest.reason text (user-authored free text that can
   *   contain exactly the kind of content this boundary excludes) - count
   *   of pending requests only
   */
  async getGroundSupportView(groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true,
        label: true,
        scenario: true,
        moment: true,
        status: true,
        cadence: true, cadenceDays: true,
        timelineDays: true,
        runsUntilEnded: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        isFreeGround: true,
        freeReason: true,
        sessionsBalance: true,
        billingActivatedAt: true,
        billingEnabled: true,
        paymentConfirmed: true,
        organization: {
          select: {
            id: true,
            name: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            careFeeStatus: true,
          },
        },
        participants: {
          select: {
            id: true,
            email: true,
            partyType: true,
            userId: true,
            managingOnly: true,
            invitedAt: true,
            notifiedAt: true,
            inviteDeliveryStatus: true,
            _count: { select: { recordEntries: true } },
            checkIns: {
              select: {
                id: true,
                sessionNumber: true,
                status: true,
                availableFrom: true,
                completedAt: true,
              },
              orderBy: { sessionNumber: 'asc' },
            },
            reportActivations: { select: { status: true } },
          },
        },
        report: { select: { id: true, releasedAt: true, createdAt: true } },
      },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const pendingParticipantRequests = await this.prisma.participantRequest.count({
      where: { groundId, status: 'PENDING' },
    });

    return {
      id: ground.id,
      label: ground.label,
      scenario: ground.scenario,
      moment: ground.moment,
      status: ground.status,
      cadence: ground.cadence,
      timelineDays: ground.runsUntilEnded ? null : ground.timelineDays,
      runsUntilEnded: ground.runsUntilEnded,
      startsAt: ground.startsAt,
      endsAt: ground.endsAt,
      createdAt: ground.createdAt,
      isFreeGround: ground.isFreeGround,
      freeReason: ground.freeReason,
      sessionsBalance: ground.sessionsBalance,
      billing: {
        billingActivatedAt: ground.billingActivatedAt,
        billingEnabled: ground.billingEnabled,
        paymentConfirmed: ground.paymentConfirmed,
        organizationId: ground.organization.id,
        organizationName: ground.organization.name,
        subscriptionPlan: ground.organization.subscriptionPlan,
        subscriptionStatus: ground.organization.subscriptionStatus,
        careFeeStatus: ground.organization.careFeeStatus,
      },
      roster: ground.participants.map((p) => ({
        id: p.id,
        email: p.email,
        partyType: p.partyType,
        accepted: p.userId !== null,
        managingOnly: p.managingOnly,
        invitedAt: p.invitedAt,
        notifiedAt: p.notifiedAt,
        inviteDeliveryStatus: p.inviteDeliveryStatus,
        recordEntryCount: p._count.recordEntries,
        checkIns: p.checkIns.map((c) => ({
          sessionNumber: c.sessionNumber,
          status: c.status,
          availableFrom: c.availableFrom,
          completedAt: c.completedAt,
        })),
        activationStatus: p.reportActivations[0]?.status ?? null,
      })),
      report: ground.report
        ? { exists: true, releasedAt: ground.report.releasedAt, createdAt: ground.report.createdAt }
        : { exists: false, releasedAt: null, createdAt: null },
      pendingParticipantRequests,
    };
  }

  /**
   * EVERY CALL SOMEBODY HAS ASKED FOR, IN ONE LIST.
   *
   * Coaching, setup help and integration support are all the same request with a different subject:
   * somebody asks, our team rings back, and what they agree is invoiced by hand. There is no second
   * queue for them and there must not be - a request sitting in a list nobody opens is the same as
   * a request nobody made, which is what happened to the mail at hello@ for months.
   *
   * WITH WHO TO RING AND WHETHER THEY PAY US. Not to gate anything - the request is never gated -
   * but because a call to somebody on the free plan is a different conversation from a call to a
   * customer, and whoever picks it up should not have to go and look it up.
   */
  async getCallRequests() {
    const rows = await this.prisma.callRequest.findMany({
      where: { status: 'new' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, kind: true, note: true, createdAt: true, status: true,
        requestedById: true,
        organization: { select: { name: true, subscriptionPlan: true, subscriptionStatus: true } },
      },
    }).catch(() => [] as any[]);

    /*
     * WHO ASKED, LOOKED UP SEPARATELY. `CallRequest` keeps the id and has no relation to `User` -
     * adding one would be a migration for a queue read, and a queue read is the last thing that
     * should be shaping the schema. Two hundred rows, one extra query.
     */
    const people = rows.length
      ? await this.prisma.user.findMany({
        where: { id: { in: [...new Set(rows.map((r: any) => r.requestedById))] } },
        select: { id: true, email: true, firstName: true, lastName: true },
      }).catch(() => [] as any[])
      : [];
    const byId = new Map(people.map((p: any) => [p.id, p]));

    return {
      requests: rows.map((r: any) => ({
        id: r.id,
        about: r.kind,
        note: r.note,
        askedAt: r.createdAt,
        orgName: r.organization?.name ?? 'an organisation',
        paying: isCovered(r.organization ?? { subscriptionPlan: null, subscriptionStatus: null }),
        who: [byId.get(r.requestedById)?.firstName, byId.get(r.requestedById)?.lastName]
          .filter(Boolean).join(' ').trim()
          || byId.get(r.requestedById)?.email || 'somebody',
        email: byId.get(r.requestedById)?.email ?? null,
      })),
    };
  }

  /** Answered is the only thing anybody does to one here. The call happens on a phone. */
  async markCallAnswered(id: string) {
    await this.prisma.callRequest.update({ where: { id }, data: { status: 'answered' } });
    return this.getCallRequests();
  }

  /**
   * MAIL SENT TO US, NEWEST FIRST.
   *
   * The address is on the marketing site and went to one person's inbox, where nobody else could
   * see it and nothing could be picked up if she were away. Unread first is deliberately NOT the
   * order: a message somebody has read is still the one that might need answering, and hiding it
   * below fifty older ones is how an inbox becomes a place things go missing.
   */
  async getInbox() {
    const messages = await this.prisma.inboundMessage.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 200,
      select: {
        id: true, fromAddress: true, fromName: true, toAddress: true,
        subject: true, body: true, receivedAt: true, readAt: true,
      },
    });
    return { messages, unread: messages.filter((m) => !m.readAt).length };
  }

  /** Marking one read is the only thing anybody can do to it here. Replying happens in real mail. */
  async markInboundRead(id: string, userId: string) {
    await this.prisma.inboundMessage.update({
      where: { id },
      data: { readAt: new Date(), readById: userId },
    });
    return this.getInbox();
  }

  private async getFeedback() {
    return this.prisma.outcomeFeedback.findMany({
      where: { ground: A_REAL_CHECK_IN },
      include: {
        ground: {
          select: {
            id: true,
            label: true,
            status: true,
            scenario: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        },
        participant: {
          select: {
            id: true,
            email: true,
            partyType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Disable code (destructive - OTP required)
  // ---------------------------------------------------------------------------

  async disableCode(codeId: string) {
    const code = await this.prisma.contributorCode.findUnique({ where: { id: codeId } });
    if (!code) throw new NotFoundException('That contributor code could not be found, so refresh the page.');

    return this.prisma.contributorCode.update({
      where: { id: codeId },
      data: { isActive: false },
    });
  }

  // ---------------------------------------------------------------------------
  // Add platform admin (destructive - OTP required)
  // ---------------------------------------------------------------------------

  async addPlatformAdmin(targetEmail: string) {
    /*
     * LOWERCASED, BECAUSE THAT IS HOW ADDRESSES ARE STORED.
     *
     * Every signup path writes `email.toLowerCase()`. This looked the address up
     * exactly as typed, so adding "Hafsah.Jumare@coamana.com" answered "No user
     * found with that email" about an account that plainly exists - and the
     * person reading it has no way to tell a capital letter from a missing account.
     */
    const address = targetEmail?.trim().toLowerCase();
    if (!address) throw new BadRequestException('Add an email address and try again.');

    const user = await this.prisma.user.findUnique({ where: { email: address } });
    if (!user) {
      throw new NotFoundException(
        `Nobody has signed up with ${address} yet. They have to sign up and confirm that address first, because this makes an existing person an admin and does not create one.`,
      );
    }

    this.logger.warn(`Platform admin added: ${address}`);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { isPlatformAdmin: true },
      select: { id: true, email: true, firstName: true, lastName: true, isPlatformAdmin: true },
    });
  }

  /**
   * WHO CAN REACH THE PLATFORM CONSOLE.
   *
   * There was a way to add one and no way to see the list, so "platform ops is
   * only the people I added" was a belief rather than something anybody could
   * check. Two ways in exist and no more: the one-time bootstrap, which only
   * fires while no admin exists at all, and `addPlatformAdmin` above - platform
   * admin plus an emailed code. Nothing else writes the flag.
   */
  listPlatformAdmins() {
    return this.prisma.user.findMany({
      where: { isPlatformAdmin: true, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { email: 'asc' },
    });
  }

  /**
   * Take somebody off the list.
   *
   * Refuses the last one, for the same reason the ops system refuses to revoke
   * the last approver: an empty list cannot be added to, because adding needs a
   * platform admin. It would lock the console permanently and the only way back
   * would be the database.
   */
  async removePlatformAdmin(userId: string, callerUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isPlatformAdmin: true },
    });
    if (!user || !user.isPlatformAdmin) throw new NotFoundException('That account is not a platform admin.');

    const others = await this.prisma.user.count({
      where: { isPlatformAdmin: true, deletedAt: null, id: { not: userId } },
    });
    if (others === 0) {
      throw new ConflictException(
        `${user.email} is the only platform admin, so add somebody else first, because with none left nobody could ever add one.`,
      );
    }

    /* Removing yourself is allowed and worth saying out loud: it is a normal
       thing to do when handing over, and refusing it would be the software
       deciding who runs the company. */
    if (userId === callerUserId) {
      this.logger.warn(`Platform admin removed THEMSELVES: ${user.email}`);
    } else {
      this.logger.warn(`Platform admin removed: ${user.email}`);
    }

    await this.prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: false } });
    return { removed: user.email };
  }

  // ---------------------------------------------------------------------------
  // OTP - stored as JSON in AdminProfile.signals to avoid schema migrations.
  // The field is typed as Json (any[]) in the model; we repurpose it here to
  // hold a single-element object: { adminOtp: { hash, expiresAt, used } }.
  // ---------------------------------------------------------------------------

  async generateOtpForAdmin(userId: string): Promise<{ otp?: string; sent: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('That person could not be found, so refresh the page.');

    /* The platform's CSPRNG, not Math.random - this is the whole of the second factor in front of
       a platform-admin action. See GUESSES_ALLOWED for the other half. */
    const plainOtp = String(crypto.randomInt(100000, 1000000));
    const hash = await bcrypt.hash(plainOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const otpPayload = { hash, expiresAt, used: false };

    // Upsert AdminProfile - store OTP in a dedicated key alongside existing signals.
    await this.prisma.adminProfile.upsert({
      where: { userId },
      create: { userId, signals: [], adminOtp: otpPayload },
      update: { adminOtp: otpPayload },
    });

    /*
     * THE CODE GOES BY EMAIL, OR THE CALLER IS TOLD IT DID NOT.
     *
     * Three things were wrong here and they compounded:
     *
     *   1. `NODE_ENV !== 'production'` returned the plain code IN THE RESPONSE BODY. That is right
     *      for a laptop and wrong for staging, which is not production either - so on staging the
     *      second factor guarding operations that cannot be undone was handed to whoever asked for
     *      it. The gate is now whether the mail actually went, not what the environment is called.
     *
     *   2. It reached past this class's type with `(this.email as any).sendEmail(...)`, skipping
     *      the opt-out check and the sender classification. Suppressing the opt-out for an OTP is
     *      correct; doing it by cast means the next person to copy the line suppresses something
     *      that should not be. `sendAdminOtp` is a real sender, classified as the way back in.
     *
     *   3. A send failure was caught, logged and answered `{ sent: true }` - so an admin waited for
     *      a code that was never coming, and the operation they were part-way through simply could
     *      not be completed.
     *
     * The code is returned only where there was no way to send it at all, which is a laptop with no
     * mail key configured. Then it is the difference between a working local setup and none.
     */
    const posted = await this.email.sendAdminOtp(user.email, plainOtp);
    if (posted.sent) {
      this.logger.log(`Admin code emailed to ${user.email} for an operation that cannot be undone.`);
      return { sent: true };
    }

    this.logger.warn(
      `Admin code for ${user.email} could not be emailed (${posted.because}). ` +
        `Returning it to the caller, which is only acceptable because nothing can deliver it.`,
    );
    return { otp: plainOtp, sent: false };
  }

  async verifyOtpForAdmin(userId: string, plainOtp: string): Promise<boolean> {
    const profile = await this.prisma.adminProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('No code has been sent to you yet, so ask for a new code.');

    const stored = profile.adminOtp as unknown as {
      hash: string;
      expiresAt: string;
      used: boolean;
    } | null;

    if (!stored) throw new BadRequestException('No code has been sent to you yet, so ask for a new code.');
    if (stored.used) throw new BadRequestException('That code has already been used, so ask for a new one.');
    if (new Date(stored.expiresAt) < new Date()) throw new BadRequestException('That code has expired, so ask for a new one.');

    const valid = await bcrypt.compare(plainOtp, stored.hash);
    if (!valid) throw new BadRequestException('That code is not right, so check it and try again.');

    // Mark as used
    await this.prisma.adminProfile.update({
      where: { userId },
      data: { adminOtp: { ...stored, used: true } },
    });

    return true;
  }
}
