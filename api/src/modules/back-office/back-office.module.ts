import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { BackOfficeDoorService } from './back-office-door.service';
import { BackOfficeDoorController } from './back-office-door.controller';
import { TheTeamIsToldService } from './the-team-is-told.service';
import { TheDailyUsageSummaryCron } from './the-daily-usage-summary.cron';

/**
 * THE DOOR IN FRONT OF BOTH BACK OFFICES. Its own module, and not part of ops, because the ops
 * system may not import the product (the-boundary-that-must-not-move.spec) and sending an email is
 * the product's. The guard itself is registered globally in app.module.
 */
@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [BackOfficeDoorController],
  providers: [BackOfficeDoorService, TheTeamIsToldService, TheDailyUsageSummaryCron],
})
export class BackOfficeModule {}
