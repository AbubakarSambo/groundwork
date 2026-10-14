import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { GroundworkEvents, RoundCompletedEvent } from '../../common';
import { mayNotSend, digestSubject, digestBody, DigestFacts } from './nothing-lands-at-3am';

/** Said to an unknown unsubscribe token, in place of an error. */
export const NOT_A_LINK_WE_KNOW = 'That link is not one we recognise, which usually means these emails have already stopped. If any still arrive, reply to one and we will stop them by hand.';

/**
 * ONE MAIL PER ROUND, TO THE PEOPLE WHO WANT IT, IN THEIR OWN HOURS.
 *
 * §13D.3: digest, not per-event. The event this listens to is `round.completed`, which is already
 * the "everybody is in" fact - so there is no place here to accidentally send per finding, because
 * findings are never iterated.
 *
 * WHY IT IS HELD UNTIL THE ROUND COMPLETES is not a delivery preference. §13 holds reports until
 * every party has checked in, so that nobody can read the others' accounts before giving their own -
 * and mail sent earlier would be a way around a rule the product otherwise keeps.
 */
@Injectable()
export class RoundDigestService {
  private readonly logger = new Logger(RoundDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private appUrl(): string {
    return this.config.get<string>('resend.frontendUrl') ?? 'http://localhost:5173';
  }

  /**
   * The row, created on first use with a token.
   *
   * Lazily, so somebody who never receives a mail never has a preference row - and the default is
   * opted IN for a round digest they are a party to, which is the thing they signed up for, while
   * the unsubscribe link makes leaving one click and no login.
   */
  async prefsFor(organizationId: string, personExternalId: string) {
    const existing = await this.prisma.emailPreference.findUnique({
      where: { organizationId_personExternalId: { organizationId, personExternalId } },
    });
    if (existing) return existing;
    return this.prisma.emailPreference.create({
      data: {
        organizationId, personExternalId,
        /* Long and random: it is the whole of the authentication on a link that works without
           signing in, so guessing one must not be worth attempting. */
        unsubscribeToken: randomBytes(32).toString('base64url'),
      },
    });
  }

  @OnEvent(GroundworkEvents.ROUND_COMPLETED)
  async onRoundCompleted(e: RoundCompletedEvent) {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: e.groundId },
        select: {
          organizationId: true, label: true,
          participants: { select: { email: true } },
        },
      });
      if (!ground) return;

      const needsAttention = await this.prisma.groundDependency.count({
        where: { groundId: e.groundId, status: { in: ['BLOCKING', 'WAITING'] } },
      });

      const facts: DigestFacts = {
        groundLabel: ground.label,
        sessionNumber: e.sessionNumber,
        participantCount: e.waitedOn ?? e.participantCount,
        accountsGiven: e.accountsGiven,
        needsAttention,
        permalink: `${this.appUrl().replace(/\/$/, '')}/grounds/${e.groundId}`,
      };

      for (const p of ground.participants) {
        if (!p.email) continue;
        /*
         * Matched to a Person so preferences and timezone can be found. Somebody unmatchable gets no
         * mail rather than a mail with defaults: sending to an address we cannot tie to a preference
         * is sending to somebody whose opt-out we would not have seen.
         */
        const person = await this.prisma.person.findFirst({
          where: { organizationId: ground.organizationId, email: p.email },
          select: { externalId: true, timezone: true },
        });
        if (!person) continue;

        const prefs = await this.prefsFor(ground.organizationId, person.externalId);
        const refuse = mayNotSend({
          kind: 'round_digest', prefs, timezone: person.timezone, now: new Date(),
        });
        /* Quiet hours are no longer a reason to drop it: sendEmail holds the mail for the morning
           and held-mail.cron.ts sends it. The other reasons still refuse here. */
        if (refuse && refuse !== 'quiet_hours') {
          this.logger.log(`No digest to ${person.externalId} for ${e.groundId}: ${refuse}.`);
          continue;
        }

        await this.email.sendRoundDigest(
          p.email,
          digestSubject(facts),
          digestBody(facts, `${this.appUrl().replace(/\/$/, '')}/unsubscribe/${prefs.unsubscribeToken}`),
        );
      }
    } catch (err: any) {
      /* Best effort, like every other listener here: a mail failing must never roll back the round
         that closed. */
      this.logger.warn(`Could not send round digest for ${e.groundId}: ${err.message}`);
    }
  }

  /**
   * WHAT AN ADMIN MAY SET, AND THE ONE THING THEY MAY NOT.
   *
   * §13D.3 says an opt-out is honoured without an admin override. So an integration can set the
   * individual preferences and the quiet hours - useful, because most organisations will want to
   * push their own working hours in - and it CANNOT clear `unsubscribedAt`. Somebody who has said
   * stop has said stop, and only they can undo it from the link they were sent.
   */
  async setPreferences(
    organizationId: string,
    personExternalId: string,
    dto: { roundDigest?: boolean; nudges?: boolean; quietBeforeHour?: number; quietAfterHour?: number },
  ) {
    const p = await this.prefsFor(organizationId, personExternalId);
    for (const [k, v] of [['quietBeforeHour', dto.quietBeforeHour], ['quietAfterHour', dto.quietAfterHour]] as const) {
      if (v !== undefined && (!Number.isInteger(v) || v < 0 || v > 23)) {
        throw new NotFoundException(`${k} must be an hour from 0 to 23.`);
      }
    }
    const updated = await this.prisma.emailPreference.update({
      where: { id: p.id },
      data: {
        ...(dto.roundDigest === undefined ? {} : { roundDigest: dto.roundDigest }),
        ...(dto.nudges === undefined ? {} : { nudges: dto.nudges }),
        ...(dto.quietBeforeHour === undefined ? {} : { quietBeforeHour: dto.quietBeforeHour }),
        ...(dto.quietAfterHour === undefined ? {} : { quietAfterHour: dto.quietAfterHour }),
      },
    });
    const { unsubscribeToken, ...safe } = updated;
    return safe;
  }

  /**
   * The link on every mail, and it works.
   *
   * By token alone and with no session, because somebody who wants to stop hearing from us must not
   * have to remember a password to do it - and a link that fails at that moment is the one that
   * turns into a spam complaint.
   */
  async unsubscribe(token: string) {
    const pref = await this.prisma.emailPreference.findUnique({ where: { unsubscribeToken: token } });
    /* An unknown token is not an error to the person holding it. Somebody trying to make the mail
       stop must never be told their link is broken: the next click is the spam button, and that costs
       every tenant on the domain. Same posture as stop-reminders.controller.ts. */
    if (!pref) return { ok: true, already: true, says: NOT_A_LINK_WE_KNOW };
    if (pref.unsubscribedAt) return { ok: true, already: true };
    await this.prisma.emailPreference.update({
      where: { id: pref.id },
      data: { unsubscribedAt: new Date() },
    });
    return { ok: true, already: false };
  }
}
