import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: string;
  /** How the session was made: password, link or google. Absent on tokens from before 10 Sep 2026. */
  via?: string;
  /** See User.tokenEpoch. Absent on tokens minted before the column; read as 0. */
  epoch?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User not found or inactive');
    }
    /*
     * A TOKEN ASSERTS A FACT THAT WAS TRUE WHEN IT WAS MINTED. A password reset bumps the epoch;
     * every token minted before it stops here, which is the point of resetting (A10 / B16).
     */
    if ((payload.epoch ?? 0) !== user.tokenEpoch) {
      throw new UnauthorizedException('You were signed out when the password changed. Sign in again.');
    }

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isPlatformAdmin: user.isPlatformAdmin,
      signedInVia: payload.via ?? null,
    };
  }
}
