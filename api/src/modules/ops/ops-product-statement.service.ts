import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WHAT_WE_SAY_WE_ARE, whyThisStatementIsNotUsable } from './what-the-product-is';

/**
 * The statement, and every version of it there has ever been.
 *
 * Append-only, because a sign-off records which version a resource was checked
 * against. Editing in place would make every past sign-off a claim about a
 * document nobody can read any more.
 */
@Injectable()
export class OpsProductStatementService {
  private readonly logger = new Logger(OpsProductStatementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * What we currently say we are.
   *
   * Falls back to the words from the deck rather than to nothing: an empty
   * statement would make every marketing check pass, which is the worst
   * possible default for a gate.
   */
  async current() {
    const latest = await this.prisma.opsProductStatement.findFirst({ orderBy: { version: 'desc' } });
    if (latest) return { ...latest, seeded: false };

    return {
      id: null,
      version: 0,
      ...WHAT_WE_SAY_WE_ARE,
      writtenAt: null,
      writtenBy: null,
      because: null,
      /* Said, so nobody mistakes the deck's words for a decision somebody made
         in here. */
      seeded: true,
    };
  }

  /** Every version, newest first. What we used to say is evidence about what changed. */
  history() {
    return this.prisma.opsProductStatement.findMany({ orderBy: { version: 'desc' } });
  }

  /**
   * A new version. Never an edit.
   *
   * `because` is required for anything after the first: a statement that changed
   * for no recorded reason is one nobody can argue with later, and this is the
   * document every piece of marketing is measured against.
   */
  async say(
    input: { headline: string; saidOutLoud: string; isIt: string[]; isNotIt: string[]; because?: string },
    writtenBy: string,
  ) {
    const unusable = whyThisStatementIsNotUsable(input);
    if (unusable) throw new BadRequestException(unusable);

    const latest = await this.prisma.opsProductStatement.findFirst({ orderBy: { version: 'desc' } });
    if (latest && !input.because?.trim()) {
      throw new BadRequestException(
        'Say why it changed. This is the document every deck and every campaign is measured against, and a version nobody can account for makes the measurement worthless.',
      );
    }

    const written = await this.prisma.opsProductStatement.create({
      data: {
        version: (latest?.version ?? 0) + 1,
        headline: input.headline.trim(),
        saidOutLoud: input.saidOutLoud?.trim() || '',
        isIt: input.isIt.map((s) => s.trim()).filter(Boolean),
        isNotIt: input.isNotIt.map((s) => s.trim()).filter(Boolean),
        because: input.because?.trim() || null,
        writtenBy,
      },
    });

    this.logger.warn(
      `What we say we are is now version ${written.version}, written by ${writtenBy}. Everything signed against version ${latest?.version ?? 0} is now signed against something older than the truth.`,
    );

    return written;
  }
}
