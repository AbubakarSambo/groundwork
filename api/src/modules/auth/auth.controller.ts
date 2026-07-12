import { Controller, Post, Get, Patch, Body, Query, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto, VerifyEmailDto, SetPasswordDto, ResendVerificationDto, ForgotPasswordDto, ResetPasswordDto, MagicLinkRegisterDto, MemberSigninDto, UpdateProfileDto } from './dto';
import { Public, CurrentUser, CurrentUserData, Roles, Role } from '../../common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new organization and super admin' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email or organization already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

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
  @Throttle({ global: { limit: 10, ttl: 60000 } })
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
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent if account exists' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
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
      const { token, isNewUser } = await this.authService.findOrCreateGoogleUser(req.user);
      // Issue a short-lived (60s) exchange code so the full JWT is never in the URL.
      const code = await this.authService.createOAuthExchangeCode(token);
      return res.redirect(`${frontendUrl}/auth/google/callback?code=${code}&new=${isNewUser}`);
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
  async entrySave(@Body() body: { email: string }) {
    return this.authService.entrySave(body.email);
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
