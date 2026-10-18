import { Controller, Get, Patch, Post, Put, Param, Body, Headers, UseGuards, Logger, ForbiddenException, BadRequestException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';
import { AdminService } from './admin.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CurrentUser } from '../../common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PricingService } from '../billing/pricing.service';
import { StripeService } from '../billing/stripe.service';
import { ThreeMonthsOnTheHouseService } from '../billing/three-months-on-the-house.service';
import { ApiAccessService } from '../public-api/api-access.service';
/**
 * Stripe's own USD floor is 50 cents; the ceiling is a typo guard rather than a policy, set well
 * above any plan we would plausibly sell.
 */
const MIN_PLAN_AMOUNT_CENTS = 50;
const MAX_PLAN_AMOUNT_CENTS = 500000;
/** A seat cap larger than this is a typo, not a plan. Enterprise expresses unlimited with null. */
const MAX_PLAN_MEMBER_CAP = 100000;
/** The most WhatsApp messages a plan may allow in a month, against a typed extra zero. */
const MAX_WHATSAPP_MONTHLY_LIMIT = 10_000_000;
import { SubscriptionPlan, ApiAccessStatus } from '@prisma/client';
import { whatTheStripeKeyIs } from '../billing/what-kind-of-stripe-key';
// ---------------------------------------------------------------------------
// OTP guard - reads X-Admin-OTP header and verifies it against the requesting
// user's stored OTP before allowing destructive operations.
// ---------------------------------------------------------------------------
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';

@Injectable()
export class OtpGuard implements CanActivate {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const otp: string | undefined = req.headers['x-admin-otp'];
    if (!otp) {
      throw new ForbiddenException('Enter the code that was sent to you, then try again.');
    }

    const userId: string | undefined = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Your sign-in has run out, so sign in again.');
    }

    // verifyOtpForAdmin throws if invalid - let it bubble as 400/403
    await this.adminService.verifyOtpForAdmin(userId, otp);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

class GrantFreeRunDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard)
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly whatsapp: WhatsAppService,
    private readonly pricing: PricingService,
    private readonly stripe: StripeService,
    private readonly apiAccess: ApiAccessService,
    private readonly onTheHouse: ThreeMonthsOnTheHouseService,
  ) {}

  // ── Pricing (System -> Pricing) ──────────────────────────────────────────
  // Subscription prices for checkout AND for plan changes come from here, not
  // from code or env vars - see PricingService for how a DB amount becomes a
  // real Stripe Price.

  @Get('pricing')
  @ApiOperation({ summary: 'Current subscription pricing per plan' })
  getPricing() {
    return this.pricing.listPlans();
  }

  @Get('pricing/free-ground-limit')
  @ApiOperation({ summary: 'How many grounds an organisation gets before it needs a subscription' })
  async getFreeGroundLimit() {
    return { freeGroundLimit: await this.pricing.getFreeGroundLimit() };
  }

  @Get('pricing/free-member-limit')
  @ApiOperation({ summary: 'How many people a free organisation may have, the creator included' })
  async getFreeMemberLimit() {
    return { freeMemberLimit: await this.pricing.getFreeMemberLimit() };
  }

  @Get('pricing/free-trial')
  @ApiOperation({ summary: 'The free trial: whether it is on, the team size it is for, and how many months' })
  async getFreeTrial() {
    return this.pricing.getFreeTrial();
  }

  /** Switch it on only once billing really grants it (U.19); until then the screens stay quiet about it. */
  @Patch('pricing/free-trial')
  @ApiOperation({ summary: 'Change the free trial' })
  async setFreeTrial(@CurrentUser('id') userId: string, @Body() body: { on?: boolean; teamsUnder?: number; months?: number }) {
    return this.pricing.setFreeTrial(body ?? {}, userId);
  }

  @Get('pricing/anchor-trial')
  @ApiOperation({ summary: 'The anchor trial: whether it is on. One month, up to 20 people besides the lead.' })
  async getAnchorTrial() {
    return this.pricing.getAnchorTrial();
  }

  /** Off until Hafsah turns it on. Only on or off: its length and size are fixed (anchor piece 34). */
  @Patch('pricing/anchor-trial')
  @ApiOperation({ summary: 'Switch the anchor trial on or off' })
  async setAnchorTrial(@CurrentUser('id') userId: string, @Body() body: { on?: boolean }) {
    return this.pricing.setAnchorTrial(body ?? {}, userId);
  }

  @Patch('pricing/free-member-limit')
  @ApiOperation({ summary: 'Change the free member limit' })
  async setFreeMemberLimit(@CurrentUser('id') userId: string, @Body() body: { freeMemberLimit: number }) {
    return { freeMemberLimit: await this.pricing.setFreeMemberLimit(Number(body?.freeMemberLimit), userId) };
  }

  @Patch('pricing/free-ground-limit')
  @ApiOperation({ summary: 'Change the free ground limit' })
  async setFreeGroundLimit(@CurrentUser('id') userId: string, @Body() body: { freeGroundLimit: number }) {
    return { freeGroundLimit: await this.pricing.setFreeGroundLimit(body?.freeGroundLimit, userId) };
  }

  @Patch('pricing/:plan')
  @ApiOperation({ summary: 'Update the monthly price (in cents) for a subscription plan' })
  async setPricing(
    @Param('plan') plan: string,
    @Body() body: { amountCents?: number; memberCap?: number | null; whatsappAddOnCents?: number | null; whatsappMonthlyLimit?: number | null; extraSeatCents?: number | null; whatsappPersonCents?: number | null },
  ) {
    if (!Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan)) {
      throw new BadRequestException('That plan does not exist, so choose one from the list.');
    }

    /**
     * THE SEAT CAP IS EDITABLE HERE TOO, OR IT IS ONLY EDITABLE BY SQL.
     *
     * Moving the caps into `pricing_plans` beside the prices only helps if the same admin screen
     * can change them. Left read-only, the caps would still be the half of pricing that drifts -
     * just in a table instead of in three source files.
     *
     * `null` means unlimited, which is what Enterprise is, so it is a valid value rather than a
     * missing one. `undefined` means "not changing the cap".
     */
    if (body?.memberCap !== undefined) {
      const cap = body.memberCap;
      if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > MAX_PLAN_MEMBER_CAP)) {
        throw new BadRequestException(`The most people a plan allows must be left empty for no limit, or be a whole number between 1 and ${MAX_PLAN_MEMBER_CAP}.`);
      }
      await this.pricing.setMemberCap(plan as SubscriptionPlan, cap);
    }

    /**
     * WHATSAPP, THE PAID ADD-ON, AND ITS MONTHLY LIMIT (decision 78). Edited here the way the plan
     * price is, so neither lives in code. The add-on price is bounded like a plan price, because it
     * bills the same cards; null takes it off sale on this plan. The limit is a count of messages a
     * month; null means no limit.
     */
    if (body?.whatsappAddOnCents !== undefined) {
      const c = body.whatsappAddOnCents;
      if (c !== null && (!Number.isInteger(c) || c < MIN_PLAN_AMOUNT_CENTS || c > MAX_PLAN_AMOUNT_CENTS)) {
        throw new BadRequestException(`The WhatsApp price must be empty, or a whole number of cents between ${MIN_PLAN_AMOUNT_CENTS} and ${MAX_PLAN_AMOUNT_CENTS}.`);
      }
      await this.pricing.setWhatsAppAddOnCents(plan as SubscriptionPlan, c);
    }
    /*
     * THE EXTRA SEAT AND WHATSAPP PER PERSON (fix list item 6): edited here like the plan price, so neither lives in code.
     * A whole number of cents from 50 (Stripe refuses less) to $1,000; empty takes it off sale on this plan.
     */
    for (const [field, what, set] of [
      ['extraSeatCents', 'An extra seat', (c: number | null) => this.pricing.setExtraSeatCents(plan as SubscriptionPlan, c)],
      ['whatsappPersonCents', 'WhatsApp for each person', (c: number | null) => this.pricing.setWhatsAppPersonCents(plan as SubscriptionPlan, c)],
    ] as const) {
      const c = (body as any)?.[field];
      if (c === undefined) continue;
      if (c !== null && (!Number.isInteger(c) || c < MIN_PLAN_AMOUNT_CENTS || c > 100_000)) {
        throw new BadRequestException(`${what} must be empty, or a whole number of cents between ${MIN_PLAN_AMOUNT_CENTS} and 100000.`);
      }
      await set(c);
    }
    if (body?.whatsappMonthlyLimit !== undefined) {
      const l = body.whatsappMonthlyLimit;
      if (l !== null && (!Number.isInteger(l) || l < 0 || l > MAX_WHATSAPP_MONTHLY_LIMIT)) {
        throw new BadRequestException(`The WhatsApp limit must be empty for no limit, or a whole number of messages between 0 and ${MAX_WHATSAPP_MONTHLY_LIMIT}.`);
      }
      await this.pricing.setWhatsAppMonthlyLimit(plan as SubscriptionPlan, l);
    }

    /** Enterprise has no self-serve price, but it does have a cap, so it reaches this method. */
    if (body?.amountCents === undefined) {
      if (body?.memberCap === undefined && body?.whatsappAddOnCents === undefined && body?.whatsappMonthlyLimit === undefined && body?.extraSeatCents === undefined && body?.whatsappPersonCents === undefined) {
        throw new BadRequestException('Nothing to change. Send amountCents, memberCap, extraSeatCents, whatsappPersonCents, whatsappAddOnCents or whatsappMonthlyLimit.');
      }
      return this.pricing.listPlans();
    }
    if (plan === SubscriptionPlan.ENTERPRISE) {
      throw new BadRequestException('Enterprise is contact-sales only and has no self-serve price.');
    }
    if (!Number.isInteger(body?.amountCents) || body.amountCents <= 0) {
      throw new BadRequestException('The price must be a whole number of cents and more than nothing.');
    }
    /**
     * AND BOUNDED, BECAUSE THIS FIELD BILLS REAL CARDS.
     *
     * "Positive integer" lets through both ends of the range that actually hurt. Stripe refuses a
     * USD charge under 50 cents, so an admin who sets 25 has not made a cheap plan - they have
     * made a checkout that dies inside Stripe rather than failing here with a sentence. And at the
     * other end, a fat-fingered extra zero turns a $40 plan into a $400 one that somebody's card
     * actually pays. Neither is something a price field should permit.
     */
    if (body.amountCents < MIN_PLAN_AMOUNT_CENTS || body.amountCents > MAX_PLAN_AMOUNT_CENTS) {
      throw new BadRequestException(
        `The price must be between ${MIN_PLAN_AMOUNT_CENTS} and ${MAX_PLAN_AMOUNT_CENTS} cents, because Stripe refuses anything smaller and anything larger is almost certainly a typo.`,
      );
    }
    await this.pricing.setAmountCents(plan as SubscriptionPlan, body.amountCents);
    return this.pricing.listPlans();
  }

  // ── WhatsApp toggle ───────────────────────────────────────────────────────
  // Single Groundwork-owned number, no per-org setting - this is the one
  // global on/off switch, for once Abubakar's WhatsApp Business API
  // credentials are in place and verified.

  /**
   * Whether this deployment can take money.
   *
   * The Pricing section below lets somebody set what we charge, which reads as a
   * promise that charging works. With no key it does not, and the only way to
   * find out was for a customer to press Pay. Never the key itself — only
   * whether one is set.
   */
  @Get('stripe')
  @ApiOperation({ summary: 'Whether a Stripe key is configured on this deployment. Never the key.' })
  stripeStatus() {
    const kind = this.stripe.keyKind ?? (this.stripe.isConfigured ? 'unknown' : 'none');
    /* A placeholder is not a key that works, so it is not "configured" for anything that needs to charge. */
    return { isConfigured: this.stripe.isConfigured && kind !== 'placeholder', keyKind: kind, ...whatTheStripeKeyIs(kind) };
  }

  @Get('whatsapp')
  @ApiOperation({ summary: 'WhatsApp integration status: credentials configured, admin toggle, and whether it is actually live' })
  getWhatsAppStatus() {
    return this.whatsapp.getToggleState();
  }

  @Patch('whatsapp')
  @ApiOperation({ summary: 'Turn the WhatsApp integration on or off platform-wide' })
  async setWhatsAppEnabled(@Body() body: { enabled: boolean }, @CurrentUser('id') userId: string) {
    await this.whatsapp.setEnabled(!!body.enabled, userId);
    return this.whatsapp.getToggleState();
  }

  // ── Groundwork's own WhatsApp number and its keys (5 Oct 2026) ─────────────
  // Set here by Groundwork staff instead of only in the server's settings. The
  // secrets go in and never come back out: every answer below says "set" or
  // "not set". See whatsapp/groundworks-own-number.ts.

  @Get('whatsapp/settings')
  @ApiOperation({ summary: "Groundwork's own WhatsApp number, its IDs, whether each secret is set, and the webhook address. Never a secret." })
  getOurWhatsAppSettings() {
    return this.whatsapp.ourNumberAsStaffReadIt();
  }

  @Put('whatsapp/settings')
  @ApiOperation({ summary: "Save Groundwork's own WhatsApp number, its IDs and its secrets. Secrets are stored encrypted and never returned." })
  async saveOurWhatsAppSettings(
    @Body() body: { displayNumber?: string | null; phoneNumberId?: string | null; businessAccountId?: string | null; accessToken?: string; appSecret?: string; verifyToken?: string; remove?: string[] },
    @CurrentUser('id') userId: string,
  ) {
    const changed = await this.whatsapp.ownNumber.save(body ?? {}, userId);
    const page = await this.whatsapp.ourNumberAsStaffReadIt();
    return { ...page, saved: changed.length ? 'Your changes are saved.' : 'Nothing was changed.' };
  }

  @Get('whatsapp/settings/connection')
  @ApiOperation({ summary: "Whether Meta accepts the access token and phone number ID in use. One read of the number; never the token." })
  ourWhatsAppConnection() {
    return this.whatsapp.isOurNumberConnected();
  }

  @Post('whatsapp/settings/test')
  @HttpCode(200)
  /* Five a minute: a test is one message to one phone, not a way to message many. */
  @Throttle({ global: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Send one test message from Groundwork's number to the number typed, and to nobody else." })
  sendOurWhatsAppTest(@Body() body: { to?: string }, @CurrentUser('id') userId: string) {
    return this.whatsapp.sendOurTest(body?.to ?? '', userId);
  }

  // ── Read-only ─────────────────────────────────────────────────────────────

  /**
   * WHO HAS ASKED FOR THE API, AND WHAT WE DECIDED.
   *
   * Access stopped being something an organisation buys and became something
   * somebody here reads and grants. This is where it is read and granted, and
   * it is also the list our own organisation appears on — a rule we are exempt
   * from is a rule we would stop noticing was broken.
   */
  @Get('api-access')
  @ApiOperation({ summary: 'Every organisation that has asked for API access' })
  apiAccessRequests() {
    return this.apiAccess.everyRequest();
  }

  @Patch('api-access/:id')
  @ApiOperation({ summary: 'Approve, decline or withdraw one organisation\'s API access' })
  decideApiAccess(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { status: ApiAccessStatus; note?: string },
  ) {
    return this.apiAccess.decide(id, dto.status, userId, dto.note);
  }

  @Patch('api-access/flags/:flagId/clear')
  @ApiOperation({ summary: 'Mark one API usage flag as looked at' })
  clearApiFlag(@Param('flagId') flagId: string) {
    return this.apiAccess.clearFlag(flagId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Everything /admin/dashboard draws: overview, codes, free-reason split, feedback, per-user usage' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('coaching')
  @ApiOperation({ summary: 'Every coaching state row with the read that produced it, and whether the block is live. Read these before setting coaching_live.' })
  getCoaching() {
    return this.adminService.getCoaching();
  }

  @Patch('coaching')
  @ApiOperation({ summary: 'Let the coaching block reach a live prompt, or stop it. Read GET /admin/coaching first.' })
  setCoachingLive(@CurrentUser('id') userId: string, @Body() body: { live: boolean }) {
    return this.adminService.setCoachingLive(!!body?.live, userId);
  }

  @Get('correction-window')
  @ApiOperation({ summary: 'How many days somebody has to correct their own record after a report is released' })
  getCorrectionWindow() {
    return this.adminService.getCorrectionWindow();
  }

  @Patch('correction-window')
  @ApiOperation({ summary: 'Change the correction window. Whole days, 0 to 90.' })
  setCorrectionWindow(@CurrentUser('id') userId: string, @Body() body: { days: number }) {
    return this.adminService.setCorrectionWindow(Number(body?.days), userId);
  }

  @Get('suggestion-thresholds')
  @ApiOperation({ summary: 'The thresholds that let a suggestion be reached, one per verdict. Support is set from the start (decision 61); keep, reward, plan and exit are empty until set (decision 33). A labels object comes alongside the values with the plain words for each field.' })
  getSuggestionThresholds() {
    return this.adminService.getSuggestionThresholds();
  }

  @Patch('suggestion-thresholds')
  @ApiOperation({ summary: 'Set the thresholds that let a suggestion be reached. Replaces the whole set.' })
  setSuggestionThresholds(@CurrentUser('id') userId: string, @Body() body: unknown) {
    return this.adminService.setSuggestionThresholds(body, userId);
  }

  @Get('writers')
  @ApiOperation({ summary: 'Zero-row detection: every writer that should fill a table, its row count, last write and ship date. Zero since shipped is flagged.' })
  getWriters() {
    return this.adminService.getWriters();
  }

  @Get('codes')
  @ApiOperation({ summary: 'All ContributorCodes across all orgs with full redemption data' })
  getAllCodes() {
    return this.adminService.getAllCodes();
  }

  @Get('codes/:codeId')
  @ApiOperation({ summary: 'Detailed usage for a single ContributorCode' })
  getCodeUsage(@Param('codeId') codeId: string) {
    return this.adminService.getCodeUsage(codeId);
  }

  @Get('call-requests')
  @ApiOperation({ summary: 'Every call somebody has asked for, with what it is about' })
  getCallRequests() {
    return this.adminService.getCallRequests();
  }

  @Post('call-requests/:id/answered')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one call request answered' })
  markCallAnswered(@Param('id') id: string) {
    return this.adminService.markCallAnswered(id);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Mail sent to our own addresses, newest first' })
  getInbox() {
    return this.adminService.getInbox();
  }

  @Post('inbox/:id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one inbound message read' })
  markInboundRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.adminService.markInboundRead(id, userId);
  }

  @Get('grounds/:groundId')
  @ApiOperation({ summary: 'Support view for a single ground: state, billing, roster, check-in status, report state. Never conversation content, record-entry text, report content, lead notes, documents, or participant-request reason text.' })
  getGroundSupportView(@Param('groundId') groundId: string) {
    return this.adminService.getGroundSupportView(groundId);
  }

  // ── OTP flow ──────────────────────────────────────────────────────────────

  @Post('otp/request')
  @ApiOperation({ summary: 'Generate a 6-digit admin OTP (10 min TTL). Returns plaintext in dev, sends email in prod.' })
  requestOtp(@CurrentUser('id') userId: string) {
    return this.adminService.generateOtpForAdmin(userId);
  }

  // ── Destructive (require OTP) ──────────────────────────────────────────────

  @Patch('codes/:codeId/disable')
  @UseGuards(OtpGuard)
  @ApiOperation({ summary: 'Set a ContributorCode isActive=false' })
  @ApiHeader({ name: 'X-Admin-OTP', description: 'Valid 6-digit OTP obtained from POST /admin/otp/request', required: true })
  disableCode(@Param('codeId') codeId: string) {
    return this.adminService.disableCode(codeId);
  }

  @Post('add-admin')
  @UseGuards(OtpGuard)
  @ApiOperation({ summary: 'Set isPlatformAdmin=true for a user by email' })
  @ApiHeader({ name: 'X-Admin-OTP', description: 'Valid 6-digit OTP obtained from POST /admin/otp/request', required: true })
  addPlatformAdmin(@Body() body: { email: string }) {
    if (!body?.email) throw new BadRequestException('Add an email address and try again.');
    return this.adminService.addPlatformAdmin(body.email);
  }

  /**
   * Who can reach this console.
   *
   * Readable without an OTP on purpose: seeing the list is how somebody checks
   * that it holds only the people they added, and putting a code in front of
   * that would make the check rare enough not to happen.
   */
  @Get('admins')
  @ApiOperation({ summary: 'Every platform admin. Two ways onto this list and no more.' })
  listPlatformAdmins() {
    return this.adminService.listPlatformAdmins();
  }

  @Post('admins/:userId/remove')
  @UseGuards(OtpGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Take somebody off the platform-admin list. Never the last one.' })
  @ApiHeader({ name: 'X-Admin-OTP', description: 'Valid 6-digit OTP obtained from POST /admin/otp/request', required: true })
  removePlatformAdmin(@Param('userId') userId: string, @CurrentUser('id') callerId: string) {
    return this.adminService.removePlatformAdmin(userId, callerId);
  }


  /**
   * RELEASE 1'S SALES BOARD, ONE ORGANISATION AT A TIME (release plan, Part 0: "switch it on for the test organisations; then
   * on staging; then for real clients, one at a time"). Staff only, by the guard on this controller. Off returns the
   * organisation to the board it had, with nothing lost.
   */
  @Patch('organisations/:organizationId/release-one-sales-board')
  @ApiOperation({ summary: "Switch Release 1's sales board on or off for one organisation" })
  setReleaseOneSalesBoard(@Param('organizationId') organizationId: string, @Body() dto: { on?: unknown }) {
    if (typeof dto?.on !== 'boolean') throw new BadRequestException('Say whether the new sales board should be on or off for this organisation.');
    return this.adminService.setReleaseOneSalesBoard(organizationId, dto.on);
  }

  /**
   * A FREE RUN ON THE HOUSE, GIVEN TO AN ADDRESS BEFORE THERE IS AN ORGANISATION. One month unless staff
   * type another length: every free run is one month (Hafsah, 5 October 2026), where it used to be three.
   *
   * Her earlier words: "we put in someone's email and their org gets free use for three months, when they
   * sign-up, they see it." The promise waits on the address; the clock starts when they take it up.
   */
  @Get('free-runs')
  @ApiOperation({ summary: 'Every free run promised, waiting, running or finished' })
  listFreeRuns() {
    return this.onTheHouse.list();
  }

  @Post('free-runs')
  @ApiOperation({ summary: 'Promise an address a free run. Re-granting a waiting one refreshes it.' })
  grantFreeRun(@Body() dto: GrantFreeRunDto, @CurrentUser('id') callerId: string) {
    return this.onTheHouse.grant({ email: dto.email, months: dto.months, plan: dto.plan as any, note: dto.note, byUserId: callerId });
  }

  @Post('free-runs/:id/withdraw')
  @HttpCode(200)
  @ApiOperation({ summary: 'Withdraw a promise nobody has taken up yet' })
  withdrawFreeRun(@Param('id') id: string) {
    return this.onTheHouse.revoke(id);
  }

}
