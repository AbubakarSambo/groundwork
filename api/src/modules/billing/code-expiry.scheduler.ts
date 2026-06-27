import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class CodeExpiryScheduler {
  private readonly logger = new Logger(CodeExpiryScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCodeExpiryReminders(): Promise<void> {
    this.logger.log('Running contributor code expiry reminder job');

    const REMINDER_DAYS = [30, 14, 7, 3, 1];

    for (const daysRemaining of REMINDER_DAYS) {
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() + daysRemaining);
      windowStart.setHours(0, 0, 0, 0);

      const windowEnd = new Date(windowStart);
      windowEnd.setHours(23, 59, 59, 999);

      const expiringCodes = await this.prisma.contributorCode.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        include: {
          createdBy: {
            select: { email: true, firstName: true },
          },
          redemptions: {
            select: { groundId: true },
          },
        },
      });

      for (const code of expiringCodes) {
        const groundsCreated = code.redemptions.length;

        try {
          await this.email.sendCodeExpiryReminder(
            code.createdBy.email,
            code.createdBy.firstName,
            code.code,
            daysRemaining,
            groundsCreated,
          );
          this.logger.log(
            `Sent ${daysRemaining}-day expiry reminder for code ${code.code} to ${code.createdBy.email}`,
          );
        } catch (err: any) {
          this.logger.warn(
            `Failed to send expiry reminder for code ${code.code} to ${code.createdBy.email}: ${err.message}`,
          );
        }

        if (daysRemaining === 14 && groundsCreated === 1 && code.redeemedByUserId) {
          try {
            const redeemer = await this.prisma.user.findUnique({
              where: { id: code.redeemedByUserId },
              select: { email: true, firstName: true },
            });

            if (redeemer) {
              await this.email.sendCodeExpiryReminder(
                redeemer.email,
                redeemer.firstName,
                code.code,
                daysRemaining,
                groundsCreated,
              );
            }
          } catch (err: any) {
            this.logger.warn(
              `Failed to send "create another ground" reminder for code ${code.code}: ${err.message}`,
            );
          }
        }
      }

      this.logger.log(
        `Processed ${expiringCodes.length} code(s) expiring in ${daysRemaining} day(s)`,
      );
    }
  }
}
