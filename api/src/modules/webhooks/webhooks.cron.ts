import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhooksService } from './webhooks.service';

/**
 * THE RETRY LOOP, which is what makes the queue a queue rather than a log of attempts.
 *
 * Every minute, take whatever is due. The backoff decides what "due" means, so this does not need
 * to be clever - it needs to run often enough that a thirty second first retry is roughly thirty
 * seconds rather than five minutes.
 */
@Injectable()
export class WebhooksCron {
  private readonly logger = new Logger(WebhooksCron.name);
  private running = false;

  constructor(private readonly webhooks: WebhooksService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async deliverDue() {
    /*
     * One pass at a time. A batch of slow endpoints can take longer than a minute, and a second
     * pass starting on top of it would attempt the same rows twice - which for a receiver that
     * dedupes is noise and for one that does not is a duplicate.
     */
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.webhooks.deliverDue();
      if (result.attempted) {
        this.logger.log(`Webhook sweep: ${result.delivered}/${result.attempted} delivered.`);
      }
    } catch (err: any) {
      this.logger.error(`Webhook sweep failed: ${err.message}`);
    } finally {
      this.running = false;
    }
  }
}
