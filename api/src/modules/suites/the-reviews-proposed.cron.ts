import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { Cron } from '@nestjs/schedule';
import { ReviewsProposedService } from './the-reviews-proposed.service';

/**
 * ONCE A DAY, THE DATE THE ORGANISATION SET FOR REVIEWS IS CHECKED (week 11). In a cron file, beside
 * every other scheduled thing here, because a method whose only caller is a scheduler looks dead to
 * the guard that hunts methods nothing calls. It only proposes: see a-review-falls-due.ts.
 */
@Injectable()
export class ReviewsProposedCron {
  private readonly logger = new Logger(ReviewsProposedCron.name);

  constructor(
    private readonly proposed: ReviewsProposedService,
    /* Last and optional, so the specs that build this with one argument keep working. */
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  @Cron('30 6 * * *', { timeZone: 'UTC' })
  async proposeTheReviewsThatFallDue() {
    /* Once a day across every copy of the API (decision 74, item 7). */
    let proposed = 0;
    await onceAcrossCopies(this.prisma, 'propose-the-reviews-that-fall-due', theDay(), async () => {
      ({ proposed } = await this.proposed.whenTheOrganisationsDateComesRound());
    });
    if (proposed) this.logger.log(`Proposed ${proposed} ${proposed === 1 ? 'review' : 'reviews'} for the people who run them to say yes or not.`);
    return { proposed };
  }
}
