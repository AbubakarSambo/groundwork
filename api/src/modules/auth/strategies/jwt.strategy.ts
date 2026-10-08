import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { theJwtSecret } from '../the-jwt-secret';

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
      secretOrKey: theJwtSecret(configService),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Your sign-in is no longer active, so sign in again.');
    }
    /*
     * A TOKEN ASSERTS A FACT THAT WAS TRUE WHEN IT WAS MINTED. A password reset bumps the epoch;
     * every token minted before it stops here, which is the point of resetting (A10 / B16).
     */
    if ((payload.epoch ?? 0) !== user.tokenEpoch) {
      throw new UnauthorizedException('You were signed out when the password changed. Sign in again.');
    }
    /*
     * MEMBERSHIP, NOT JUST THE COLUMN. switchOrganization checks the membership row on the way in;
     * this read the user's organizationId and nothing else, so deleting somebody's membership left
     * their access exactly as it was (B16, P2-025). The organisation the token names has to be one
     * they still belong to.
     */
    const member = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: user.organizationId } },
      select: { id: true },
    });
    if (!member) {
      throw new UnauthorizedException('You are no longer a member of that organisation. Sign in again.');
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
