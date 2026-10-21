import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { GroundworkEvents, CheckInCompletedEvent, CommitmentsSettledEvent } from '../../common';
import { rebuildThePersonsRecords } from './the-persons-record-store';

/**
 * REBUILDS EACH PERSON'S RECORD WHEN SOMETHING NEW COMES IN (Groundwork does the managing, part 1): a check-in finishing, and promises
 * settled after it. Never on opening a page. Where the record is kept and how it is built: the-persons-record-store.ts.
 */
@Injectable()
export class ThePersonsRecordService {
  private readonly logger = new Logger(ThePersonsRecordService.name);
  constructor(private prisma: PrismaService) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(event: CheckInCompletedEvent) {
    await this.rebuild(event.groundId);
  }

  @OnEvent(GroundworkEvents.COMMITMENTS_SETTLED)
  async onCommitmentsSettled(event: CommitmentsSettledEvent) {
    await this.rebuild(event.groundId);
  }

  async rebuild(groundId: string) {
    await rebuildThePersonsRecords(this.prisma as any, groundId).catch((err: any) =>
      this.logger.warn(`The people's records for ${groundId} could not be rebuilt: ${err?.message}`),
    );
  }
}

