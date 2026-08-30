import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TAKING IN WHAT HAPPENED WITH A CUSTOMER.
 *
 * The missing edge in the whole sales picture: a check-in could hold what somebody SAID they did
 * and nothing could hold what a system recorded. So "did he visit the shop" was unanswerable, and
 * the honest version of the product could only narrate self-reports back at a CEO.
 *
 * IT IS NOT A CRM AND MUST NOT DRIFT INTO ONE. No stages, no deal values, no pipeline, no contacts.
 * Six shapes of thing that happened, four strengths of evidence for it, a short note somebody wrote
 * at the time, and where it came from. Anything more belongs in the system the customer already
 * pays for.
 *
 * NO CONVERSATION CONTENT ON THIS PATH. `note` is the line written at the time - "owner not in",
 * "asked for pricing". What was actually said is a different kind of thing with different consent
 * behind it, and it does not arrive here.
 */
@Injectable()
export class WhatHappenedWithACustomerService {
  private readonly logger = new Logger(WhatHappenedWithACustomerService.name);

  constructor(private prisma: PrismaService) {}

  private static readonly KINDS = ['VISIT', 'CALL', 'MESSAGE', 'MEETING', 'PROPOSAL', 'TRANSACTION'];
  private static readonly STRENGTHS = ['COMPLETED', 'RECORDED', 'ARRANGED', 'SELF_REPORTED'];

  /** A note is a line, not a transcript. Past this, somebody is sending the conversation. */
  private static readonly LONGEST_NOTE = 500;

  async push(
    organizationId: string,
    sourceSystem: string,
    items: {
      personExternalId?: string;
      counterpartyExternalId?: string;
      kind?: string;
      strength?: string;
      happenedAt?: string;
      note?: string;
      externalId?: string;
    }[],
  ) {
    if (!sourceSystem?.trim()) {
      throw new BadRequestException('Say which system this came from. A record with no provenance is a rumour with a timestamp.');
    }
    if (!items?.length) throw new BadRequestException('Send at least one thing that happened.');

    const received: { externalId: string | null; stored: boolean; because?: string }[] = [];

    for (const item of items) {
      const externalId = item.externalId?.trim() || null;

      const reject = (because: string) => received.push({ externalId, stored: false, because });

      if (!item.personExternalId?.trim()) { reject('No person, so there is nobody this is about.'); continue; }
      if (!WhatHappenedWithACustomerService.KINDS.includes(item.kind ?? '')) {
        reject(`"${item.kind}" is not a kind we have. Send one of: ${WhatHappenedWithACustomerService.KINDS.join(', ')}.`);
        continue;
      }
      if (!WhatHappenedWithACustomerService.STRENGTHS.includes(item.strength ?? '')) {
        /*
         * NO DEFAULT, DELIBERATELY. Defaulting would make every unmarked record the same strength,
         * and whichever one was picked would be wrong: too strong and a calendar entry becomes a
         * visit, too weak and a completed sale reads as somebody's opinion.
         */
        reject(`"${item.strength}" is not a strength we have. Send one of: ${WhatHappenedWithACustomerService.STRENGTHS.join(', ')}.`);
        continue;
      }

      const happenedAt = item.happenedAt ? new Date(item.happenedAt) : null;
      if (!happenedAt || Number.isNaN(happenedAt.getTime())) {
        /* Their observation time, never ours: a record with our clock on it dates a week of work to
           the night their integration ran. */
        reject('No happenedAt, and we will not use our own clock for when their work happened.');
        continue;
      }

      const note = item.note?.trim() || null;
      if (note && note.length > WhatHappenedWithACustomerService.LONGEST_NOTE) {
        reject(`That note is ${note.length} characters. A note is the line written at the time, not the conversation - keep it under ${WhatHappenedWithACustomerService.LONGEST_NOTE}.`);
        continue;
      }

      const data = {
        organizationId,
        personExternalId: item.personExternalId.trim(),
        counterpartyExternalId: item.counterpartyExternalId?.trim() || null,
        kind: item.kind as any,
        strength: item.strength as any,
        happenedAt,
        note,
        sourceSystem: sourceSystem.trim(),
        externalId,
      };

      /*
       * Same record twice updates rather than doubling somebody's activity. A nightly push that
       * re-sends the week is the normal case, not the exception.
       */
      if (externalId) {
        await this.prisma.interaction.upsert({
          where: { organizationId_sourceSystem_externalId: { organizationId, sourceSystem: data.sourceSystem, externalId } },
          create: data,
          update: data,
        });
      } else {
        await this.prisma.interaction.create({ data });
      }
      received.push({ externalId, stored: true });
    }

    this.logger.log(`${received.filter((r) => r.stored).length} interactions stored for org ${organizationId} from ${sourceSystem}.`);
    return { received };
  }
}
