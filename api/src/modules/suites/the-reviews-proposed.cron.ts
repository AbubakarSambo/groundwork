import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly proposed: ReviewsProposedService) {}

  @Cron('30 6 * * *', { timeZone: 'UTC' })
  async proposeTheReviewsThatFallDue() {
    const { proposed } = await this.proposed.whenTheOrganisationsDateComesRound();
    if (proposed) this.logger.log(`Proposed ${proposed} ${proposed === 1 ? 'review' : 'reviews'} for the people who run them to say yes or not.`);
    return { proposed };
  }
}
