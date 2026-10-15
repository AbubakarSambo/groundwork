import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroundworkEvents, CallAskedEvent } from '../../common/events';

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
    private readonly events: EventEmitter2,
  ) {}

  async request(input: {
    name: string;
    orgName: string;
    email: string;
    /** Not asked on the public form; empty rather than null, because the column is non-null. */
    teamSize?: string;
    intention: string;
    triedAlready?: boolean;
    /** When they would like the first conversation. Optional - asking without a time is fine. */
    preferredAt?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const intention = input.intention.trim();

    /*
     * A TIME IN THE PAST IS REFUSED RATHER THAN STORED.
     *
     * The whole point of asking for one here is that the first conversation happens BEFORE the
     * check-in is set up. A request for last Tuesday is a typo or a timezone, and storing it hands
     * a coach a queue sorted by a date that means nothing.
     */
    const preferredAt = input.preferredAt ? new Date(input.preferredAt) : null;
    if (preferredAt && Number.isNaN(preferredAt.getTime())) {
      throw new BadRequestException('That does not look like a date. Leave it empty and we will come back to you to agree a time.');
    }
    if (preferredAt && preferredAt.getTime() < Date.now()) {
      throw new BadRequestException('That time has already passed. Pick one that has not, or leave it empty and we will agree a time with you.');
    }

    /**
     * Validated here as well as at the DTO, because the length is the whole anti-volume mechanism and
     * this service is callable from more than one place.
     */
    if (intention.length < MIN_INTENTION_LENGTH) {
      throw new BadRequestException(
        'Tell us a little more about what you want help with, because a line or two is enough for the first reply to be written from.',
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
            /* Only when they gave one. A second ask from the form that does not collect it must not
               wipe the number they gave the first time. */
            ...(input.teamSize?.trim() ? { teamSize: input.teamSize.trim() } : {}),
            /* The newer time, like the newer words - somebody asking again has moved on. */
            ...(preferredAt ? { preferredAt } : {}),
            ...(input.triedAlready !== undefined && { triedAlready: input.triedAlready }),
          },
        })
      : await this.prisma.coachRequest.create({
          data: {
            name: input.name.trim(),
            orgName: input.orgName.trim(),
            email,
            teamSize: input.teamSize?.trim() ?? '',
            intention,
            isFreeMail,
            ...(preferredAt ? { preferredAt } : {}),
            ...(input.triedAlready !== undefined && { triedAlready: input.triedAlready }),
          },
        });

    /**
     * THE TEAM IS TOLD, THE SAME WAY IT IS TOLD OF EVERY OTHER ASK. A call asked for from inside the
     * product emits CALL_ASKED and the whole back-office roster gets a mail; a coaching request from
     * the public page wrote its row and stopped, so the one request that arrives at $700 an hour
     * landed in a tab somebody had to remember to open. Same event, same listener, same mail.
     * (The two tables, CallRequest and CoachRequest, should be one; not in this change.)
     */
    this.events.emit(GroundworkEvents.CALL_ASKED, {
      organizationId: null,
      askedByUserId: null,
      requester: { name: input.name.trim(), email, orgName: input.orgName.trim() },
      subject: 'COACHING',
      note: intention,
    } satisfies CallAskedEvent);

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
    if (!allowed.includes(status)) throw new BadRequestException(`That is not a status that can be used, so choose one of ${allowed.join(', ')}.`);
    return this.prisma.coachRequest.update({ where: { id }, data: { status } });
  }
}
