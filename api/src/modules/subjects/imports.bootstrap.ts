import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BulkImportService } from './bulk-import.service';

/**
 * THE CALL THAT MAKES PERSISTENCE WORTH ANYTHING.
 *
 * Storing the rows with the job is only half of it - without something that picks them up, a
 * restart leaves a resumable job that nothing ever resumes, which looks exactly like the bug it
 * replaced. This is the other half, and it is separate from the service so the service stays
 * testable without a Nest lifecycle.
 *
 * Failures here are logged and swallowed: an import that cannot resume must not stop the API
 * booting. The work is still in the database and the next boot will try again.
 */
@Injectable()
export class ImportsBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(ImportsBootstrap.name);

  constructor(private readonly bulk: BulkImportService) {}

  async onApplicationBootstrap() {
    try {
      const { resumed } = await this.bulk.resumeAbandoned();
      if (resumed) this.logger.log(`Resumed ${resumed} interrupted import(s).`);
    } catch (err: any) {
      this.logger.error(`Could not resume interrupted imports: ${err.message}`);
    }
  }
}
