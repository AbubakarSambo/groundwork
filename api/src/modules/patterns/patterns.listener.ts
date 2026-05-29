import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PatternsService } from './patterns.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';

/**
 * Analyse patterns as soon as a check-in completes — more responsive than the
 * daily cron, which remains as a backstop. No import of conversation/grounds.
 */
@Injectable()
export class PatternsListener {
  private readonly logger = new Logger(PatternsListener.name);

  constructor(private patterns: PatternsService) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(event: CheckInCompletedEvent) {
    await this.patterns.analyzeCheckIn(event.checkInId).catch((err) =>
      this.logger.error(`Pattern analysis on checkin.completed failed: ${err.message}`),
    );
  }
}
