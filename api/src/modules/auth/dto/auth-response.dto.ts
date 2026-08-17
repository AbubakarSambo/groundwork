import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanInfoDto {
  @ApiProperty()
  planTier: string;

  @ApiProperty()
  subscriptionStatus: string;

  @ApiPropertyOptional()
  trialEndDate?: Date;

  @ApiProperty()
  isGrandfathered: boolean;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  isPlatformAdmin: boolean;

  @ApiPropertyOptional({ type: PlanInfoDto })
  plan?: PlanInfoDto;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  /**
   * THIS ACCOUNT HAS NO PASSWORD YET, AND THE CLIENT HAS TO KNOW.
   *
   * Signup tells people, twice, "you will be asked to set a password to secure your account". They
   * never were: `verifyEmail` built a full auth response and dropped them into the app with
   * `passwordHash` NULL. The consequence only shows up later and it is severe - the returning admin
   * and every invited participant can then ONLY get back in by requesting a fresh emailed link, every
   * time, forever. In an 18-ground simulation it was the single fault that stopped grounds reaching a
   * report at all, because the last person could never sign back in to finish their check-in.
   *
   * `setPassword` and its route already existed. Nothing was missing except a way for the client to
   * know it should send somebody there. This is that signal, returned from every door so they cannot
   * disagree.
   */
  @ApiProperty({ description: 'True when the account has no password set, so the client should route to set-password.' })
  needsPassword: boolean;

  /**
   * A PASSWORD_SETUP token, issued only when `needsPassword` is true.
   *
   * `/set-password` is token-based, and verification has just consumed the verification token, so
   * without this the client would arrive at a form it cannot submit. Reusing the existing
   * PASSWORD_SETUP type rather than inventing a mechanism: the invite flow already issues these and
   * `setPassword` already consumes them.
   */
  @ApiProperty({ required: false, description: 'Short-lived token for the set-password step, present only when needsPassword is true.' })
  passwordSetupToken?: string;
}
