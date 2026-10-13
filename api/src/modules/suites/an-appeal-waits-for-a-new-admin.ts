import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, theHour } from '../prisma/once-across-copies';
import { GroundworkEvents, type AdminMadeEvent } from '../../common/events';
import { ReviewsService } from './the-reviews.service';

/**
 * AN APPEAL THAT WAITS FOR AN ADMIN IS TOLD TO AN ADMIN ADDED LATER (decision 113).
 *
 * When the person appeals and the only admin is the reviewer, the reviewer is asked to add a second admin. The admin who is then
 * added is told once that an appeal waits for them, the same message an admin there at the time had (email, and WhatsApp where it
 * is on), with no word of the review or the reasons: at once when somebody is made an admin on the people page, and every hour for
 * every other way an admin appears (an invitation as an admin, a sign-up). ReviewsService.tellNewAdminsOfOpenAppeals keeps who
 * was told, so nobody is told twice.
 */
@Injectable()
export class AnAppealWaitsForANewAdmin {
  private readonly logger = new Logger(AnAppealWaitsForANewAdmin.name);

  constructor(private readonly prisma: PrismaService, private readonly reviews: ReviewsService) {}

  @OnEvent(GroundworkEvents.ADMIN_MADE, { async: true })
  async anAdminWasMade(e: AdminMadeEvent): Promise<void> {
    try {
      await this.reviews.tellNewAdminsOfOpenAppeals(e.organizationId);
    } catch (err: any) {
      this.logger.warn(`Could not tell a new admin about an appeal that waits: ${err?.message}`);
    }
  }

  @Cron('17 * * * *', { timeZone: 'UTC' })
  async everyHour(): Promise<void> {
    await onceAcrossCopies(this.prisma, 'appeal-waits-for-a-new-admin', theHour(), () => this.sweepNow());
  }

  /** The work itself, without the once-an-hour claim, for the spec. */
  async sweepNow(): Promise<{ told: number }> {
    let told = 0;
    for (const organizationId of await this.reviews.organisationsWithAnOpenAppeal()) {
      try {
        told += (await this.reviews.tellNewAdminsOfOpenAppeals(organizationId)).told;
      } catch (err: any) {
        this.logger.warn(`Could not tell the admins of one organisation about an appeal that waits: ${err?.message}`);
      }
    }
    if (told) this.logger.log(`Told ${told} ${told === 1 ? 'admin' : 'admins'} that an appeal waits for them.`);
    return { told };
  }
}
