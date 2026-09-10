import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { A_WEEK_MS, CODE_LIFETIME_MS } from './the-back-office-has-a-door';

/** Sends the code, checks the code, and keeps the week-long pass. See the-back-office-has-a-door.ts. */
@Injectable()
export class BackOfficeDoorService {
  private readonly logger = new Logger(BackOfficeDoorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * ONLY GROUNDWORK STAFF MEET THE DOOR. Somebody on the back-office roster with this account
   * connected, or a platform admin. Anybody else is told the place is not theirs and no code is
   * sent: a member of a customer organisation must not be able to make us email them codes to a
   * door they can never open.
   */
  async isStaff(userId: string): Promise<boolean> {
    const [user, person, account] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { isPlatformAdmin: true } }),
      this.prisma.opsPerson.findFirst({ where: { userId, active: true }, select: { id: true } }),
      this.prisma.opsPersonAccount.findFirst({ where: { userId, person: { active: true } }, select: { id: true } }),
    ]);
    return !!user?.isPlatformAdmin || !!person || !!account;
  }

  async status(userId: string, signedInVia?: string | null) {
    const staff = await this.isStaff(userId);
    if (!staff) return { staff: false, open: false, via: null, expiresAt: null, codeInFlight: false };
    const pass = await this.prisma.backOfficePass.findUnique({ where: { userId } });
    const open = signedInVia === 'google' || (!!pass && pass.expiresAt.getTime() > Date.now());
    return {
      staff: true,
      open,
      via: signedInVia === 'google' ? 'google' : open ? pass?.via ?? null : null,
      expiresAt: signedInVia === 'google' ? null : open ? pass?.expiresAt ?? null : null,
      codeInFlight: !!pass?.codeHash && !!pass.codeExpiresAt && pass.codeExpiresAt.getTime() > Date.now(),
    };
  }

  /** A six-digit code to the signed-in address. Ten minutes. Asking again replaces the last one. */
  async sendCode(userId: string) {
    if (!(await this.isStaff(userId))) throw new ForbiddenException('This part is for Groundwork staff.');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new BadRequestException('Nobody is signed in.');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const codeExpiresAt = new Date(Date.now() + CODE_LIFETIME_MS);
    await this.prisma.backOfficePass.upsert({
      where: { userId },
      /* An expired pass row is reused as the holder of the code in flight; `expiresAt` in the past keeps the door shut. */
      create: { userId, via: 'none', expiresAt: new Date(0), codeHash, codeExpiresAt },
      update: { codeHash, codeExpiresAt },
    });
    const posted = await this.email.sendAdminOtp(user.email, code);
    if (!posted.sent) {
      this.logger.warn(`Back-office code to ${user.email} did not send: ${posted.because}`);
      throw new BadRequestException('The code could not be emailed. Try again in a moment.');
    }
    this.logger.log(`Back-office code sent to ${user.email}.`);
    return { sent: true, to: user.email, expiresInMinutes: CODE_LIFETIME_MS / 60_000 };
  }

  async verify(userId: string, code: string) {
    const pass = await this.prisma.backOfficePass.findUnique({ where: { userId } });
    if (!pass?.codeHash || !pass.codeExpiresAt) throw new BadRequestException('Ask for a code first.');
    if (pass.codeExpiresAt.getTime() < Date.now()) throw new BadRequestException('That code has expired. Ask for a new one.');
    const ok = await bcrypt.compare(String(code ?? '').trim(), pass.codeHash);
    if (!ok) throw new BadRequestException('That is not the code we sent.');
    const expiresAt = new Date(Date.now() + A_WEEK_MS);
    await this.prisma.backOfficePass.update({
      where: { userId },
      data: { via: 'otp', verifiedAt: new Date(), expiresAt, codeHash: null, codeExpiresAt: null },
    });
    this.logger.log(`Back office opened by code for user ${userId}; holds until ${expiresAt.toISOString()}.`);
    return { open: true, via: 'otp', expiresAt };
  }
}
