import { Injectable } from '@nestjs/common';
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
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName || '',
      lastName: name.familyName || '',
    };
    done(null, user);
  }
}
