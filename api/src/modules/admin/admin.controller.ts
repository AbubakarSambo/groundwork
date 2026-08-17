import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Headers,
  UseGuards,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CurrentUser } from '../../common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PricingService } from '../billing/pricing.service';
/**
 * Stripe's own USD floor is 50 cents; the ceiling is a typo guard rather than a policy, set well
 * above any plan we would plausibly sell.
 */
const MIN_PLAN_AMOUNT_CENTS = 50;
const MAX_PLAN_AMOUNT_CENTS = 500000;
import { SubscriptionPlan } from '@prisma/client';

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

  @Patch('pricing/free-ground-limit')
  @ApiOperation({ summary: 'Change the free ground limit' })
  async setFreeGroundLimit(@CurrentUser('id') userId: string, @Body() body: { freeGroundLimit: number }) {
    return { freeGroundLimit: await this.pricing.setFreeGroundLimit(body?.freeGroundLimit, userId) };
  }

  @Patch('pricing/:plan')
  @ApiOperation({ summary: 'Update the monthly price (in cents) for a subscription plan' })
  async setPricing(@Param('plan') plan: string, @Body() body: { amountCents: number }) {
    if (plan === SubscriptionPlan.ENTERPRISE) {
      throw new BadRequestException('Enterprise is contact-sales only and has no self-serve price.');
    }
    if (!Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan)) {
      throw new BadRequestException(`Unknown plan: ${plan}`);
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

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide stats: orgs, grounds, codes, redemptions, freeReason breakdown' })
  getPlatformStats() {
    return this.adminService.getPlatformStats();
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

  @Get('feedback')
  @ApiOperation({ summary: 'All OutcomeFeedback records with ground/org context' })
  getFeedback() {
    return this.adminService.getFeedback();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Per-user and per-org usage patterns' })
  getUsagePatterns() {
    return this.adminService.getUsagePatterns();
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
}
