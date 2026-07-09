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

  constructor(private readonly adminService: AdminService) {}

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
