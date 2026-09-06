import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hasOutlivedItsDate, whyThisNeedsAnException, type WhatIsBeingProposed } from './the-freeze';

/**
 * The freeze, and every decision anybody has made about it.
 *
 * Append-only: turning it off is a decision with a name against it, and a rule
 * that can be switched off silently lasts until the first person in a hurry.
 */
@Injectable()
export class OpsFreezeService {
  private readonly logger = new Logger(OpsFreezeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async current() {
    const latest = await this.prisma.opsFreeze.findFirst({ orderBy: { decidedAt: 'desc' } });
    if (!latest) {
      return {
        isOn: false,
        because: null,
        until: null,
        decidedAt: null,
        overdue: false,
        says: 'Nothing is frozen. Anything may be proposed.',
      };
    }

    const overdue = hasOutlivedItsDate(latest);
    return {
      isOn: latest.isOn,
      because: latest.because,
      until: latest.until,
      decidedAt: latest.decidedAt,
      /* Said rather than acted on. A freeze that lifts itself ends without
         anybody deciding it should, and the date exists to force the
         conversation rather than to replace it. */
      overdue,
      says: !latest.isOn
        ? 'Nothing is frozen. Anything may be proposed.'
        : overdue
          ? `Frozen, and past the date it was meant to lift. Somebody has to decide whether it stays.`
          : `Frozen. ${latest.because}`,
    };
  }

  history() {
    return this.prisma.opsFreeze.findMany({ orderBy: { decidedAt: 'desc' } });
  }

  /**
   * Turn it on, or turn it off. Both are decisions and both need a reason.
   *
   * Lifting one is the more consequential of the two — it is the moment the
   * company stops doing the thing it agreed to do — and it is the one somebody
   * does in a hurry, so it is the one that most needs a sentence attached.
   */
  async decide(input: { isOn: boolean; because: string; until?: Date }, decidedById: string) {
    const because = input.because?.trim();
    if (!because) {
      throw new BadRequestException(
        input.isOn
          ? 'Say what the freeze is for. Everybody proposing work will read it.'
          : 'Say why it is lifting. This is the moment the company stops doing what it agreed to do.',
      );
    }

    const written = await this.prisma.opsFreeze.create({
      data: { isOn: input.isOn, because, until: input.until ?? null, decidedById },
    });

    this.logger.warn(
      input.isOn
        ? `The freeze is ON, decided by ${decidedById}: ${because}`
        : `The freeze is OFF, decided by ${decidedById}: ${because}`,
    );

    return written;
  }

  /** Why a piece of work needs somebody to agree, or null. */
  async whyThisNeedsAnException(proposed: WhatIsBeingProposed) {
    const latest = await this.prisma.opsFreeze.findFirst({ orderBy: { decidedAt: 'desc' } });
    return whyThisNeedsAnException(latest, proposed);
  }
}
