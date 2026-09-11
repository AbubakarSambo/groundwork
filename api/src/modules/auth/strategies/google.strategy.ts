import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId') || 'google-oauth-disabled',
      clientSecret: configService.get<string>('google.clientSecret') || 'google-oauth-disabled',
      callbackURL: configService.get<string>('google.callbackUrl') || 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, name, emails } = profile;
    /*
     * AN UNVERIFIED GOOGLE ADDRESS IS NOT PROOF OF AN ADDRESS. The profile carries `verified` on
     * each email; this took emails[0].value on trust, and the link path then set isEmailVerified
     * true on an existing account, minting a session that walks past the back-office door (B16,
     * P2-009). Refused here, before any account is touched.
     */
    if (emails?.[0]?.verified === false) {
      return done(new UnauthorizedException('Google has not verified that email address. Verify it with Google, or sign in another way.'), false);
    }
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName || '',
      lastName: name.familyName || '',
    };
    done(null, user);
  }
}
