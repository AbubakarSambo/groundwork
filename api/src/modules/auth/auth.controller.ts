import { Controller, Post, Get, Patch, Body, Query, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto, VerifyEmailDto, SetPasswordDto, ResendVerificationDto, ForgotPasswordDto, ResetPasswordDto, MagicLinkRegisterDto, MemberSigninDto, UpdateProfileDto } from './dto';
import { Public, CurrentUser, CurrentUserData, Roles, Role } from '../../common';

/**
 * HOW MANY SIGN-INS A MINUTE, AND WHY IT IS A KNOB.
 *
 * Ten per minute per address is right for people and wrong for a twelve-session
 * journey, which signs two people in and out roughly twenty-four times inside an
 * hour and trips it around session eleven. That cost a two-hour run a minute per
 * trip while it waited the limit out.
 *
 * THE DEFAULT IS UNCHANGED, deliberately. This is not a security decision dressed
 * up as a convenience: production keeps ten, and a journey environment can raise
 * it by setting LOGIN_RATE_LIMIT. Turning the limiter down for everybody so a test
 * runs faster would mean the journey no longer runs against the product that
 * ships - and the ThrottlerException screen it produced was a real bug, only
 * visible because a run hit it.
 *
 * The right long-term fix is to throttle FAILED attempts rather than all of them,
 * since brute force is a failure-path problem and a correct password is not an
 * attack. That is a build, not a constant, so it is written down here rather than
 * half-done.
 */
const SIGN_IN_LIMIT = Number(process.env.LOGIN_RATE_LIMIT) || 10;

class SwitchOrganizationDto {
  /**
   * Never trusted. `switchOrganization` looks up a membership for this id and the
   * caller's own user id, so an id belonging to somebody else's organisation is
   * refused rather than granted.
   */
  @IsString()
  organizationId!: string;
}

@ApiTags('Auth')
@Controller('auth')

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * TWO DEAD ROUTES REMOVED HERE: POST /auth/register and
   * POST /auth/resend-verification.
   *
   * Sign-up is magic-link only. `register` took an email and a password, created
   * an org and a super admin, and had no caller in the client, the marketing
   * site, the seeds or the journey harnesses - `authService.register` was reached
   * from that one route and nowhere else. `resend-verification` served the same
   * superseded flow, and the live equivalent is already wired: MagicSentPage
   * resends through `register-magic-link`, minting the same EMAIL_VERIFICATION
   * token type.
   *
   * A public, unauthenticated, org-creating endpoint nobody uses is attack
   * surface with no upside, which is why these went rather than being left.
   *
   * POST /auth/login STAYS, and is not dead: journey/run.ts and
   * journey/org-sim/run-all.ts sign in with a password to drive the app as a real
   * user. Deleting it would take the end-to-end harnesses with it.
   */
  @Public()
  @Post('register-magic-link')
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register without a password - sends a magic activation link' })
  @ApiResponse({ status: 201, description: 'Magic link sent' })
  @ApiResponse({ status: 409, description: 'Email or organization already exists' })
  async registerMagicLink(@Body() dto: MagicLinkRegisterDto) {
    return this.authService.registerMagicLink(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: SIGN_IN_LIMIT, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthResponseDto> {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Set password for invited user' })
  @ApiResponse({ status: 200, description: 'Password set successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async setPassword(@Body() dto: SetPasswordDto): Promise<AuthResponseDto> {
    return this.authService.setPassword(dto);
  }

  @Public()
  @Post('member-signin')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a magic sign-in link to an existing member' })
  @ApiResponse({ status: 200, description: 'Sign-in link sent if account exists' })
  async memberSignin(@Body() dto: MemberSigninDto) {
    return this.authService.memberSignin(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successful', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<AuthResponseDto> {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('validate-token')
  @ApiOperation({ summary: 'Validate a verification/setup token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateToken(
    @Query('token') token: string,
    @Query('type') type: string,
  ) {
    return this.authService.validateToken(token, type);
  }

  /**
   * Which sign-in methods this deployment can actually complete.
   *
   * Google sign-in has been fully built on both sides for a long time and no
   * client ever offered it, because GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   * are unset - and GoogleStrategy falls back to the literal placeholder
   * 'google-oauth-disabled' when they are. A button wired unconditionally would
   * not fail quietly: it would send a person to Google and land them on
   * Google's own error page, which reads as "this company is broken".
   *
   * So the client asks. The server is the only side that knows whether the
   * credentials exist, and the moment they are provisioned the button appears
   * with no code change and no deploy of the client.
   *
   * Public by necessity - it is read on the sign-in page, before anyone has a
   * token. It exposes only whether a method is available, never any credential.
   */
  @Public()
  @Get('methods')
  @ApiOperation({ summary: 'Which sign-in methods this deployment can complete' })
  async methods(): Promise<{ magicLink: boolean; google: boolean }> {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    return {
      // Always available: it needs only outbound email.
      magicLink: true,
      google: !!clientId?.trim() && !!clientSecret?.trim(),
    };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // Passport redirects to Google - no body needed
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: any, @Res() res: any) {
    const frontendUrl = this.configService.get<string>('google.frontendUrl');
    try {
      const { token, isNewUser, needsOrgName } = await this.authService.findOrCreateGoogleUser(req.user);
      // Issue a short-lived (60s) exchange code so the full JWT is never in the URL.
      const code = await this.authService.createOAuthExchangeCode(token);
      // needsOrgName is false for anyone joining an org that already exists -
      // an invited participant must never be asked to name someone else's
      // organisation.
      return res.redirect(
        `${frontendUrl}/auth/google/callback?code=${code}&new=${isNewUser}&nameOrg=${needsOrgName}`,
      );
    } catch {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  @Public()
  @Get('google/exchange')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Exchange a one-time OAuth code for a JWT' })
  async googleExchange(@Query('code') code: string) {
    return this.authService.redeemOAuthExchangeCode(code);
  }

  @Get('my-organizations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The organisations this person belongs to, with the active one marked' })
  async myOrganizations(@CurrentUser() user: CurrentUserData) {
    return this.authService.myOrganizations(user.id);
  }

  @Post('switch-organization')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch the active organisation. Returns a new token scoped to it.' })
  async switchOrganization(@CurrentUser() user: CurrentUserData, @Body() dto: SwitchOrganizationDto) {
    return this.authService.switchOrganization(user.id, dto.organizationId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile and org details' })
  async updateProfile(@CurrentUser() user: CurrentUserData, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Public()
  @Post('entry-save')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Save an entry session and send a magic link' })
  async entrySave(@Body() body: { email: string; draft?: { payload?: Record<string, any>; history?: unknown[] } }) {
    return this.authService.entrySave(body.email, body.draft);
  }

  @Post('request-password-setup')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a password-setup token for the current user' })
  async requestPasswordSetup(@CurrentUser() user: CurrentUserData) {
    return this.authService.requestPasswordSetupForUser(user.id);
  }

  @Post('team-invite')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Invite a colleague to Groundwork as a member of the same org' })
  async teamInvite(@CurrentUser() user: CurrentUserData, @Body() body: { email: string }) {
    const orgName = (user as any).organizationName ?? 'Groundwork';
    return this.authService.teamInvite(orgName, body.email, user.organizationId);
  }
}
