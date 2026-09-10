import { Controller, Get, Patch, Post, Param, Body, Headers, UseGuards, Logger, ForbiddenException, BadRequestException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CurrentUser } from '../../common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PricingService } from '../billing/pricing.service';
import { StripeService } from '../billing/stripe.service';
import { ApiAccessService } from '../public-api/api-access.service';
/**
 * Stripe's own USD floor is 50 cents; the ceiling is a typo guard rather than a policy, set well
 * above any plan we would plausibly sell.
 */
const MIN_PLAN_AMOUNT_CENTS = 50;
const MAX_PLAN_AMOUNT_CENTS = 500000;
/** A seat cap larger than this is a typo, not a plan. Enterprise expresses unlimited with null. */
const MAX_PLAN_MEMBER_CAP = 100000;
import { SubscriptionPlan, ApiAccessStatus } from '@prisma/client';

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
      throw new ForbiddenException('X-Admin-OTP header is required for this operation');
    }

    const userId: string | undefined = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Authenticated user not found');
    }

    // verifyOtpForAdmin throws if invalid - let it bubble as 400/403
    await this.adminService.verifyOtpForAdmin(userId, otp);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

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
  async setPricing(@Param('plan') plan: string, @Body() body: { amountCents?: number; memberCap?: number | null }) {
    if (!Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan)) {
      throw new BadRequestException(`Unknown plan: ${plan}`);
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
        throw new BadRequestException(`memberCap must be null for unlimited, or a whole number between 1 and ${MAX_PLAN_MEMBER_CAP}.`);
      }
      await this.pricing.setMemberCap(plan as SubscriptionPlan, cap);
    }

    /** Enterprise has no self-serve price, but it does have a cap, so it reaches this method. */
    if (body?.amountCents === undefined) {
      if (body?.memberCap === undefined) {
        throw new BadRequestException('Nothing to change. Send amountCents, memberCap, or both.');
      }
      return this.pricing.listPlans();
    }
    if (plan === SubscriptionPlan.ENTERPRISE) {
      throw new BadRequestException('Enterprise is contact-sales only and has no self-serve price.');
    }
    if (!Number.isInteger(body?.amountCents) || body.amountCents <= 0) {
      throw new BadRequestException('amountCents must be a positive integer');
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
        `amountCents must be between ${MIN_PLAN_AMOUNT_CENTS} and ${MAX_PLAN_AMOUNT_CENTS} - Stripe refuses anything smaller, and anything larger is almost certainly a typo.`,
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
    return {
      isConfigured: this.stripe.isConfigured,
      says: this.stripe.isConfigured
        ? 'A Stripe key is set. Checkout and subscriptions will reach Stripe.'
        : 'No Stripe key is set here, so nothing can be charged. Prices below can still be edited; they will apply when a key is set.',
    };
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
    if (!body?.email) throw new BadRequestException('email is required');
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

}
