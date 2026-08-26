import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * FREE-MAIL DOMAINS ARE MARKED, NOT REFUSED.
 *
 * A founder using a gmail address is a real prospect; a request from one is just worth seeing for what
 * it is. Refusing them would filter out exactly the small teams the free tier exists for.
 */
const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me', 'yandex.com', 'mail.com',
]);

/** Two written lines. Somebody who will not write them will not turn up to a session. */
export const MIN_INTENTION_LENGTH = 40;

/**
 * ONE REQUEST PER ADDRESS PER WEEK, FOLDED RATHER THAN DUPLICATED.
 *
 * A second ask inside the window updates the existing row instead of creating one, so the back office
 * shows one person asking twice - which is information - rather than two people asking once, which is
 * noise that looks like demand.
 */
const REPEAT_WINDOW_DAYS = 7;

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async request(input: {
    name: string;
    orgName: string;
    email: string;
    teamSize: string;
    intention: string;
    triedAlready?: boolean;
  }) {
    const email = input.email.trim().toLowerCase();
    const intention = input.intention.trim();

    /**
     * Validated here as well as at the DTO, because the length is the whole anti-volume mechanism and
     * this service is callable from more than one place.
     */
    if (intention.length < MIN_INTENTION_LENGTH) {
      throw new BadRequestException(
        'Tell us a little more about what you want help with - a line or two is enough. It is what the first reply is written from.',
      );
    }

    const domain = email.split('@')[1] ?? '';
    const isFreeMail = FREE_MAIL.has(domain);

    const since = new Date(Date.now() - REPEAT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const existing = await this.prisma.coachRequest.findFirst({
      where: { email, createdAt: { gte: since }, status: { in: ['new', 'contacted'] } },
      orderBy: { createdAt: 'desc' },
    });

    const record = existing
      ? await this.prisma.coachRequest.update({
          where: { id: existing.id },
          data: {
            askedAgainAt: new Date(),
            // The newer words are the ones worth replying to.
            intention,
            name: input.name.trim(),
            orgName: input.orgName.trim(),
            teamSize: input.teamSize.trim(),
            ...(input.triedAlready !== undefined && { triedAlready: input.triedAlready }),
          },
        })
      : await this.prisma.coachRequest.create({
          data: {
            name: input.name.trim(),
            orgName: input.orgName.trim(),
            email,
            teamSize: input.teamSize.trim(),
            intention,
            isFreeMail,
            ...(input.triedAlready !== undefined && { triedAlready: input.triedAlready }),
          },
        });

    /**
     * THE ONLY THING THIS PERSON WAS PROMISED IS AN EMAIL, so a failure to send it must not be
     * swallowed - but it must also not lose the request. The row is already written; a send failure is
     * logged and left visible as a null confirmation timestamp for the back office to act on.
     */
    try {
      await this.email.sendCoachRequestReceived(email, input.name.trim());
      await this.prisma.coachRequest.update({
        where: { id: record.id },
        data: { confirmationSentAt: new Date() },
      });
    } catch (err) {
      this.logger.error(
        `Coach request ${record.id} was saved but its confirmation email did not send. It shows in the back office with no confirmation timestamp. ${(err as Error).message}`,
      );
    }

    /**
     * Deliberately the same answer whether this was a first ask or a repeat. Telling somebody "you
     * already asked" is a worse experience than replying to them, and the back office can see it.
     */
    return { received: true };
  }

  /** Newest first, for the back office. The intention is returned in full: it is the whole point. */
  async list(status?: string) {
    return this.prisma.coachRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async setStatus(id: string, status: string) {
    const allowed = ['new', 'contacted', 'booked', 'done', 'declined'];
    if (!allowed.includes(status)) throw new BadRequestException(`Status must be one of: ${allowed.join(', ')}`);
    return this.prisma.coachRequest.update({ where: { id }, data: { status } });
  }
}
