import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * `PlanInfoDto` USED TO SIT HERE, AND IT DOCUMENTED A PRODUCT WE DO NOT HAVE. W-UX-C.
 *
 * Four fields - `planTier`, `subscriptionStatus`, `trialEndDate`, `isGrandfathered` - hung off
 * `UserResponseDto.plan`. Nothing in the codebase ever assigned any of them and nothing read them, so
 * `plan` was never present on a single auth response in the product's life.
 *
 * It was not harmless. This DTO is the declared return type of login, verify-email, set-password and
 * reset-password, so it is what SWAGGER PUBLISHES - meaning the API's own documentation advertised a
 * free trial and a grandfathering scheme to anybody reading it, and `planTier` offered a second
 * source of truth for a plan that actually lives on the organisation as `subscriptionPlan`.
 *
 * A trial and grandfathering may well be real decisions later. When they are, they get built; they do
 * not get discovered in a type nobody wrote.
 */
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
  /** Whether this person may open a check-in. Computed by the rule, never a permission itself. */
  mayOpenCheckIns?: boolean;

  /** The same organisation object `/auth/me` returns. See buildAuthResponse for why. */
  @ApiProperty()
  organization: {
    id: string;
    name: string;
    slug: string;
    careFeeStatus: unknown;
    email: string | null;
    companyStage: unknown;
    subscriptionPlan: unknown;
    /* The two settings the open-a-check-in rule reads. See `who-may-open-a-check-in.ts`. */
    whoMayOpenCheckIns?: string;
    checkInsNeedApproval?: boolean;
  };
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

  /**
   * TRUE ONLY WHEN OPENING THIS LINK HAS JUST CREATED THE ACCOUNT. U.2.
   *
   * `verifyEmail` turns a waiting sign-up into an account, and nothing before that moment exists
   * (GW-001). When this link was that moment, the client shows "Your email is confirmed" before
   * going on. It is absent for everybody else: an account that already existed, a sign-in link, any
   * other door. The address shown is `user.email`, which this response already carries.
   */
  @ApiProperty({ required: false, description: 'True only when this verification link has just created the account from a waiting sign-up.' })
  justCreated?: true;

  /**
   * WHERE THEY WERE GOING WHEN THEY ASKED FOR THIS LINK (U.3 review), such as an organisation's
   * invite link. Only ever a path inside this app. Absent when there was none.
   */
  @ApiProperty({ required: false, description: 'A path inside this app to carry on to, kept from when the link was asked for.' })
  next?: string;
}
