import { theEndingSaid, theOutcomeIsThat, TheEndingIsAbout } from '../resolution/end-states';
import { connectWhatsAppFor, youCanAlsoAnswerOnWhatsApp } from '../whatsapp/connect-whatsapp';
import { askName } from '../assistant/ask-name';
import { peersAreNamedByDefaultOn } from '../reports/peers-are-named';

/** The sentence about who sees what you say, for a check-in (whoSeesWhatYouSay). */
export function whoSeesWhatYouSayIn(g: { scenario?: any; peersVisibleToEachOther?: boolean | null; organization?: { name?: string | null } | null } | null | undefined): string {
  const ask = askName(g?.organization?.name ?? null);
  const together = g ? (g.peersVisibleToEachOther ?? peersAreNamedByDefaultOn(g)) : true;
  return together
    ? `The people in this check-in, including your manager, can see what you say in it. Your questions to ${ask} stay private.`
    : `Whoever runs this check-in can see what you say in it. The other people taking part do not see what you say. Your questions to ${ask} stay private.`;
}
import { keptOffThePhone } from '../whatsapp/a-check-in-kept-off-the-phone';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DeliveryService, DeliveryContext } from './delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { theCheckInForAnEmail } from './the-check-in-for-an-email';
import { STOP_LINE } from '../conversation/ignoring-it-should-be-enough';
import { NOT_SENT_WHILE_AWAY, whatThisMailIs, whetherToSend } from './nothing-goes-out-that-was-turned-off';
import { whoIsAwayOn } from '../suites/who-is-away';
import { inQuietHours, nextAllowedMoment } from './nothing-lands-at-3am';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import { greeting } from './a-greeting-with-no-name';
import { howLongInWords } from '../auth/how-long-a-link-lasts';
import { withWhatGroundworkIs } from './what-groundwork-is';
import { whatTheTeamGets, whatTheLeadGets, THE_TEAM_BUTTON, THE_LEAD_BUTTON } from './one-line-one-link-one-report';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * Groundwork email library. Per the product rules, every message names
 * something specific and ends with a reason the record matters to THEM,
 * not to the org, not to the founder. Keep that voice when filling these in.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  /** Made on the first real send, never at start-up. See `theResendClient` below. */
  private resend: Resend | null = null;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(
    private configService: ConfigService,
    private delivery: DeliveryService,
    private prisma: PrismaService,
  ) {
    this.fromEmail = this.configService.get<string>('resend.fromEmail') || 'Groundwork <noreply@myground.work>';
    this.frontendUrl = this.configService.get<string>('resend.frontendUrl') || 'http://localhost:5173';
  }

  /**
   * "You can also answer on WhatsApp: send Hi to <number>", with a "Connect WhatsApp" link that opens
   * WhatsApp with Hi typed (decision 106 item 4). Only while WhatsApp is on for this check-in's organisation,
   * the check-in is not kept in the app, and Groundwork's number has a display number saved. Otherwise nothing.
   */
  async theWhatsAppLine(email: string, context?: DeliveryContext): Promise<string> {
    try {
      if (!context?.groundId) return '';
      const checkIn = await theCheckInForAnEmail(this.prisma, context.groundId, { organizationId: true, overWhatsApp: true });
      if (!checkIn) return '';
      const connect = await connectWhatsAppFor(this.prisma, this.configService, { organizationId: checkIn.organizationId, email, keptInTheApp: keptOffThePhone(checkIn), forTheInvitation: true });
      if (!connect) return '';
      return `<p>${escapeHtml(youCanAlsoAnswerOnWhatsApp(connect.number))}</p>
         <p><a href="${connect.link}" style="display:inline-block;background:#25D366;color:#0A1628;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">${connect.says}</a></p>`;
    } catch {
      return '';
    }
  }

  /**
   * WHO SEES WHAT YOU SAY, AS AN INVITATION SAYS IT (5 October, a release blocker). The invitation said
   * "Nobody on your team sees what you write", which is not true: what people say in a check-in can be
   * shown word for word to the people in it (the privacy rule). The prototype's sentence (join-invite)
   * where people see each other; where they do not (a cohort, a review), what is true there.
   */
  async whoSeesWhatYouSay(context?: DeliveryContext): Promise<string> {
    const g = context?.groundId
      ? await Promise.resolve(theCheckInForAnEmail(this.prisma, context.groundId, { scenario: true, peersVisibleToEachOther: true, organization: { select: { name: true } } }))?.catch?.(() => null)
      : null;
    return whoSeesWhatYouSayIn(g);
  }

  buildInviteUrl(inviteToken: string): string {
    return `${this.frontendUrl}/invite?token=${inviteToken}`;
  }

  /**
   * The address of an open check-in. This was built by string concatenation inside the reminder
   * cron and nowhere else, which is why nothing but a scheduled email could ever produce one.
   */
  buildCheckInUrl(checkInId: string): string {
    return `${this.frontendUrl}/checkin/${checkInId}`;
  }

  /** Where somebody opens a new one. Here rather than inline, for the same two reasons as
      above: one place knows the path, and the copy guard reads literals in this file. */
  buildNewCheckInUrl(): string {
    return `${this.frontendUrl}/grounds/new`;
  }

  /**
   * DECIDED ON THE CREDENTIAL AND AN EXPLICIT FLAG, NOT ON NODE_ENV (fix plan D20). This returned
   * true whenever NODE_ENV was anything but production, so a staging deployment with real
   * credentials and NODE_ENV unset silently sent nothing, and the log line was the only evidence.
   * Now: mail goes to Resend only when EMAIL_SENDS_FOR_REAL=true AND the key is real. A misjudged
   * condition here starts sending real mail from a staging box, so the flag is explicit.
   */
  private isDev(): boolean {
    return !this.canSendForReal();
  }

  private keyIsAPlaceholder(): boolean {
    const apiKey = this.configService.get<string>('resend.apiKey') ?? '';
    return !apiKey || apiKey.startsWith('re_...') || apiKey === 're_test';
  }

  /**
   * THE CLIENT IS MADE ON THE FIRST REAL SEND, NOT WHEN THE API STARTS.
   *
   * Found by the screens workspace on 26 September 2026, setting up a second computer.
   * `api/.env.example` says to leave `RESEND_API_KEY` empty, and with it empty the API would not
   * start at all: the constructor built a Resend client, Resend refuses an empty key, and the whole
   * process died with "Missing API key" before anything else ran.
   *
   * The service already knew better everywhere else. `keyIsAPlaceholder` treats an empty key,
   * `re_...` and `re_test` as the same thing - nothing leaves this computer and every send is
   * written to the log instead - and the send path below only reaches the client when
   * `canSendForReal()` is true. The one line that made the client was never told.
   *
   * So it is made here, on demand, and an empty key now behaves exactly like a fake one, which is
   * what the example file has always promised. Their workaround of setting `re_test` is no longer
   * needed, though it still works.
   */
  private theResendClient(): Resend {
    if (!this.resend) this.resend = new Resend(this.configService.get<string>('resend.apiKey'));
    return this.resend;
  }

  private canSendForReal(): boolean {
    return this.configService.get<boolean>('resend.sendsForReal') === true && !this.keyIsAPlaceholder();
  }

  /** A deployment that cannot send says so at boot, once, where the deploy log is read. */
  onModuleInit(): void {
    const deployed = (process.env.NODE_ENV ?? 'development') === 'production';
    if (this.canSendForReal()) { this.logger.log('Mail is sent for real through Resend.'); return; }
    const because = this.keyIsAPlaceholder() ? 'RESEND_API_KEY is missing or a placeholder' : 'EMAIL_SENDS_FOR_REAL is not "true"';
    const line = `No mail leaves this deployment: ${because}. Every send is logged here instead.`;
    if (deployed) this.logger.error(line); else this.logger.warn(line);
  }

  /**
   * WHETHER THIS PERSON WANTS THIS KIND OF MAIL.
   *
   * Looked up here, once, rather than at each sender — the opt-out was honoured in three of nine
   * senders and every one of those files looked right on its own. See
   * `nothing-goes-out-that-was-turned-off.ts` for the two kinds and the line between them.
   */
  private async wouldTheyRatherNot(to: string, sender: string, context?: DeliveryContext): Promise<string | null> {
    const kind = whatThisMailIs(sender);
    if (kind === 'the way back in' || kind === 'operational') return null;

    const address = to.trim().toLowerCase();
    /*
     * WE STOP WRITING TO A DEAD ADDRESS. A hard bounce was recorded and mirrored, and then the daily
     * sweeps kept mailing it, damaging the sending domain for every tenant. The latest delivery to
     * this address decides: bounced, and nothing delivered since, is dead. The way back in is exempt
     * (it returned above) - refusing a sign-in link to a mailbox that was once full would be a lockout
     * with no way out, and a successful delivery of it is exactly what revives the address.
     */
    const latest = await this.prisma.emailDelivery
      .findFirst({ where: { email: { equals: address, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' }, select: { status: true } })
      .catch(() => null);
    if (latest?.status === 'BOUNCED') return 'the last mail to this address bounced hard, and nothing since has been delivered';
    /* THE STOP LINK STOPS EVERY ENGINE. `remindersStoppedAt` was read by one nudge engine of three;
       it is read here, once, whenever the mail is about a participant. */
    const stopped = context?.participantId
      ? await this.prisma.groundParticipant.findUnique({ where: { id: context.participantId }, select: { remindersStoppedAt: true } }).catch(() => null)
      : null;
    const [user, preference] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: address }, select: { emailNotifications: true, isActive: true, deletedAt: true } }),
      /* Preferences are keyed by (organisation, externalId) and hold no address, so the roster is
         the way in. ANY unsubscribed row for this address stops the mail: somebody who used the
         link said "stop hearing from us", not "stop hearing from one of your tenants" — and
         answering per-organisation would also tell them which ones they are in. */
      this.prisma.person
        .findMany({
          where: { email: { equals: address, mode: 'insensitive' } },
          select: { organizationId: true, externalId: true },
        })
        .then(async (people) => {
          if (people.length === 0) return null;
          const rows = await this.prisma.emailPreference.findMany({
            where: { OR: people.map((p) => ({ organizationId: p.organizationId, personExternalId: p.externalId })) },
            select: { unsubscribedAt: true, roundDigest: true, nudges: true },
          });
          if (!rows.length) return null;
          /* Any unsubscribed row stops; a per-kind switch turned off on any row is off. */
          return {
            unsubscribedAt: rows.find((r) => r.unsubscribedAt)?.unsubscribedAt ?? null,
            roundDigest: rows.every((r) => r.roundDigest),
            nudges: rows.every((r) => r.nudges),
          };
        })
        .catch(() => null),
    ]);

    /* Nobody to ask: a participant invited by address has no account and no preference, and
       refusing to write to them would mean nobody could ever be invited. */
    if (!user && !preference && !stopped) return null;

    /* APPROVED LEAVE, BY DATES ONLY (week 23). A reminder or a "you have missed" mail does not go to
       somebody who is away today. Only asked for the senders that chase a person to answer. */
    const theirId = user && NOT_SENT_WHILE_AWAY.has(sender)
      ? (await this.prisma.user.findUnique({ where: { email: address }, select: { id: true } }).catch(() => null))?.id ?? null
      : null;
    const awayUntil = theirId
      ? (await whoIsAwayOn(this.prisma as any, [theirId], null).catch(() => new Map<string, string>())).get(theirId) ?? null
      : null;

    const answer = whetherToSend(kind, {
      emailNotifications: user?.emailNotifications,
      unsubscribedAt: preference?.unsubscribedAt ?? null,
      remindersStoppedAt: stopped?.remindersStoppedAt ?? null,
      wantsDigest: preference?.roundDigest,
      wantsNudges: preference?.nudges,
      stillHere: user ? user.isActive && !user.deletedAt : undefined,
      awayUntil,
    }, sender);
    return answer.send ? null : answer.because;
  }

  /**
   * THE LINK THAT MAKES "SIMPLY IGNORE THIS" TRUE.
   *
   * Minted here rather than by six callers, and kept once minted - the invite token is cleared on
   * accept and the reminders outlive it, so a stop link tied to that one would die exactly when it
   * starts being needed. Returns null when there is no participant to tie it to (a mail to a lead
   * about their own check-in has a different way out), and never throws: a failure to build the
   * footer must not be the reason somebody's invitation does not arrive.
   */
  /**
   * SOMEBODY IS WAITING TO BE LET INTO YOUR ORGANISATION.
   *
   * To the admins, because they are the only people who can answer it, and adding a person to the
   * organisation is now their decision rather than a side effect of somebody else's invitation.
   */
  async sendSomebodyIsWaiting(
    to: string, adminFirstName: string, who: string, addedBy: string, checkInLabel: string | null,
    /* U.4 review: the subject names the person and the organisation when both are known, rather than
       an address and "your organisation". A name is only ever one the person gave, never guessed. */
    known: { name?: string | null; organisationName?: string | null } = {},
  ): Promise<void> {
    const name = (known.name ?? '').trim();
    const org = (known.organisationName ?? '').trim();
    await this.sendEmail({
      to,
      subject: name
        ? `${name} is waiting to be let into ${org || 'your organisation'}.`
        : `${who} is waiting to be let into ${org || 'your organisation'}.`,
      html: this.layout(
        `<p>${greeting(adminFirstName)}</p>
         <p><strong>${escapeHtml(who)}</strong> was invited to check in${checkInLabel ? ` on <strong>${escapeHtml(checkInLabel)}</strong>` : ''} by ${escapeHtml(addedBy)}, and they are not in your organisation yet.</p>
         <p>They can sign in, and they cannot start until you approve them joining. Nobody outside your organisation is added to it, or counted on your plan, without this.</p>
         <p><a href="${this.frontendUrl.replace(/\/$/, '')}/org/members" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">See who is waiting →</a></p>`,
      ),
    }, undefined, 'sendSomebodyIsWaiting');
  }

  /**
   * "ASK WAIRIMU FOR MORE TIME" (U.3, #/join/outoftime). The lead gets the request with one button,
   * which opens the check-in where giving it more time is one press and reopens it.
   */
  async sendMoreTimeAsked(to: string, leadFirstName: string | null, who: string, checkInLabel: string, groundId: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `${who} asked for more time on ${checkInLabel}`,
      html: this.layout(
        `<p>${greeting(leadFirstName)}</p>
         <p><strong>${escapeHtml(who)}</strong> asked you to give <strong>${escapeHtml(checkInLabel)}</strong> more time. It reached its end date, so nobody can add to it until you do. Everything already in it is kept.</p>
         <p><a href="${this.frontendUrl.replace(/\/$/, '')}/grounds/${encodeURIComponent(groundId)}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Give it more time →</a></p>`,
      ),
    }, undefined, 'sendMoreTimeAsked');
  }

  /** And the answer, to the person who was waiting. */
  async sendYouAreInNow(to: string, organizationName: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `You can start your check-in now`,
      html: this.layout(
        `<p>${greeting(null)}</p>
         <p>An admin at <strong>${organizationName}</strong> has approved you joining, so the check-in you were invited to is open.</p>
         <p><a href="${this.frontendUrl.replace(/\/$/, '')}/grounds" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open my check-in →</a></p>`,
      ),
    }, undefined, 'sendYouAreInNow');
  }

  /**
   * AND WHOEVER INVITED THEM IS TOLD TOO (U.4). The People page says "Letting someone in tells them
   * straight away, and tells whoever invited them." Only the person was told, so the second half was
   * not true: the lead found out when an answer arrived, or did not.
   */
  async sendTheyAreInNow(to: string, firstName: string, who: string, checkIn: string | null): Promise<void> {
    await this.sendEmail({
      to,
      subject: `${who} can check in now`,
      html: this.layout(
        `<p>${greeting(firstName)}</p>
         <p>An admin has let <strong>${escapeHtml(who)}</strong> in, so they can start ${checkIn ? `<strong>${escapeHtml(checkIn)}</strong>` : 'the check-in you invited them to'}. They have been told.</p>`,
      ),
    }, undefined, 'sendTheyAreInNow');
  }

  /**
   * A decline goes to whoever did the inviting, NOT to the person declined.
   *
   * "A company you were invited to has refused you" is a message with nothing in it a person can
   * act on, from an organisation they have no relationship with. The lead who invited them is the
   * one who can say something useful, and the one who needs to know their check-in is short a
   * person.
   */
  async sendTheyWereNotLetIn(to: string, firstName: string, who: string, reason: string | null): Promise<void> {
    await this.sendEmail({
      to,
      subject: `${who} was not added to your organisation`,
      html: this.layout(
        `<p>${greeting(firstName)}</p>
         <p>An admin has decided not to add <strong>${escapeHtml(who)}</strong> to your organisation, so they cannot check in on it.</p>
         ${reason ? `<p style="border-left:3px solid #E2E0DB;padding:8px 14px;margin:18px 0;color:#4A4540;">${escapeHtml(reason)}</p>` : ''}
         <p>They have not been told. If they should hear anything about it, that is yours to say.</p>`,
      ),
    }, undefined, 'sendTheyWereNotLetIn');
  }

  /**
   * The unsubscribe link for this address, minted if it does not exist yet. Preferences are keyed by
   * (organisation, person on the roster), so an address with no Person row anywhere has nothing to
   * hang a token on and gets no footer - that is a participant invited by address before they exist
   * here, and the invite itself already says ignoring it is enough.
   */
  private async theWayToStopHearingFromUs(to: string): Promise<string | null> {
    try {
      const person = await this.prisma.person.findFirst({
        where: { email: { equals: to.trim().toLowerCase(), mode: 'insensitive' } },
        select: { organizationId: true, externalId: true },
      });
      if (!person) return null;
      const pref = await this.prisma.emailPreference.upsert({
        where: { organizationId_personExternalId: { organizationId: person.organizationId, personExternalId: person.externalId } },
        create: { organizationId: person.organizationId, personExternalId: person.externalId, unsubscribeToken: crypto.randomBytes(32).toString('base64url') },
        update: {},
        select: { unsubscribeToken: true },
      });
      return `${this.frontendUrl.replace(/\/$/, '')}/unsubscribe/${pref.unsubscribeToken}`;
    } catch (err: any) {
      this.logger.warn(`Could not build an unsubscribe link for ${to}: ${err?.message}`);
      return null;
    }
  }

  private async theWayToStopBeingChased(participantId?: string): Promise<string | null> {
    if (!participantId) return null;
    try {
      const row = await this.prisma.groundParticipant.findUnique({
        where: { id: participantId },
        select: { stopRemindersToken: true },
      });
      if (!row) return null;
      let token = row.stopRemindersToken;
      if (!token) {
        token = crypto.randomBytes(32).toString('base64url');
        await this.prisma.groundParticipant.update({
          where: { id: participantId },
          data: { stopRemindersToken: token },
        });
      }
      return STOP_LINE(`${this.frontendUrl.replace(/\/$/, '')}/stop-reminders/${token}`);
    } catch (err: any) {
      this.logger.warn(`Could not build a stop-reminders link for participant ${participantId}: ${err.message}`);
      return null;
    }
  }

  private async sendEmail(
    options: { to: string; subject: string; html: string },
    context?: DeliveryContext,
    /** Which sender this is. Defaulted so nothing breaks, and every sender passes it. */
    sender?: string,
  ): Promise<string | undefined> {
    /*
     * AN ADDRESS NOBODY GAVE US IS NEVER WRITTEN TO.
     *
     * Somebody answering through the open link has a participant row before they have given an
     * address, and that row carries a placeholder on a domain that cannot receive mail. Nothing
     * should ever send to it, and "nothing should" is not a guarantee - a nudge, a report-ready
     * mail or a reminder would each reach for it in the ordinary course of things. So the mailer
     * refuses it by name, first, before any other rule gets a say. See the-open-link.
     */
    if (/@unclaimed\.invalid$/i.test(options.to ?? '')) {
      this.logger.log(`Not sending "${options.subject}": that check-in has no address on it yet.`);
      return undefined;
    }
    const rather = sender ? await this.wouldTheyRatherNot(options.to, sender, context) : null;
    if (rather) {
      /* Logged rather than silent: an email that did not go out for a good reason is still a thing
         somebody may be waiting for, and "nothing happened" is the hardest kind of bug to chase. */
      this.logger.log(`Not sending "${options.subject}" to ${options.to}: ${rather}`);
      this.writeItDown(options, sender, 'suppressed', rather);
      return undefined;
    }

    /*
     * NOTHING LANDS AT 3AM, AND NOTHING IS LOST EITHER. Quiet hours were honoured by one sender, the
     * digest - and it DROPPED the mail, so a round that completed at 21:00 local was never announced.
     * Every other cron sent on a fixed UTC clock. Now every mail we decided to send asks the one rule
     * here, and one refused for the hour is written down with the moment it may go, and sent then by
     * held-mail.cron.ts. The way-back-in and asked-for mails go at once: somebody who just asked for
     * a sign-in link is awake.
     */
    if (sender && whatThisMailIs(sender) === 'we decided to send it') {
      const held = await this.holdForTheMorning(options, context, sender);
      if (held) return undefined;
    }
    return this.deliverNow(options, context, sender);
  }

  /** The recipient's zone and quiet hours, from their roster row. Nobody on the roster: no hold. */
  private async holdForTheMorning(options: { to: string; subject: string; html: string }, context: DeliveryContext | undefined, sender: string): Promise<boolean> {
    try {
      const person = await this.prisma.person.findFirst({
        where: { email: { equals: options.to.trim().toLowerCase(), mode: 'insensitive' } },
        select: { organizationId: true, externalId: true, timezone: true },
      });
      if (!person) return false;
      const prefs = await this.prisma.emailPreference.findUnique({
        where: { organizationId_personExternalId: { organizationId: person.organizationId, personExternalId: person.externalId } },
        select: { quietBeforeHour: true, quietAfterHour: true },
      });
      const now = new Date();
      if (!inQuietHours(now, person.timezone, prefs)) return false;
      const notBefore = nextAllowedMoment(now, person.timezone, prefs);
      await this.prisma.scheduledEmail.create({
        data: { toAddress: options.to, subject: options.subject, html: options.html, sender, context: (context ?? null) as any, notBefore },
      });
      this.logger.log(`Holding "${options.subject}" for ${options.to} until ${notBefore.toISOString()} (quiet hours).`);
      this.writeItDown(options, sender, 'held', `quiet hours; goes at ${notBefore.toISOString()}`);
      return true;
    } catch (err: any) {
      /* A hold that cannot be written must not lose the mail: it goes now, and the log says why. */
      this.logger.warn(`Could not hold "${options.subject}" for ${options.to}: ${err?.message}; sending now.`);
      return false;
    }
  }

  /** A held mail, when its moment has come. Skips the hold and the preference gate, both already asked. */
  async deliverHeld(row: { toAddress: string; subject: string; html: string; sender: string | null; context: unknown }): Promise<void> {
    await this.deliverNow({ to: row.toAddress, subject: row.subject, html: row.html }, (row.context ?? undefined) as DeliveryContext | undefined, row.sender ?? undefined);
  }

  private async deliverNow(
    options: { to: string; subject: string; html: string },
    context?: DeliveryContext,
    sender?: string,
  ): Promise<string | undefined> {

    /*
     * WHAT GROUNDWORK IS, on the mails where somebody might not know. Appended here rather than
     * written into forty-two templates, which is forty-two chances to forget — and the ones that
     * forgot were the ones nobody had read recently. See what-groundwork-is.ts for why the way-back-in
     * mails are excluded.
     */
    options = { ...options, html: withWhatGroundworkIs(options.html, sender) };

    /*
     * EVERY MESSAGE CARRIES A WAY OUT, A TEXT PART, AND ITS OWN HEADERS - HERE, ONCE, FOR ALL
     * FORTY-EIGHT SENDERS. The unsubscribe link was composed in one template (the digest) and nowhere
     * else, and no mail carried a text part or a List-Unsubscribe header, which is what a mail client
     * shows its own "unsubscribe" button from. The way-back-in mails (a sign-in link, a password
     * reset) are transactional and carry no footer: stopping those is not something anybody means.
     */
    const wayOut = sender && whatThisMailIs(sender) !== 'the way back in' ? await this.theWayToStopHearingFromUs(options.to) : null;
    if (wayOut) options = { ...options, html: `${options.html}${UNSUBSCRIBE_FOOTER(wayOut)}` };
    const text = plainTextOf(options.html);
    const headers = wayOut ? { 'List-Unsubscribe': `<${wayOut}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;

    if (this.isDev()) {
      this.logger.warn(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      /* The body no longer goes to the log (G4): it is somebody's words and it carries their links.
         The links below are what a local run needs to follow the journey; the prose is not. */
      /* THE LINK, WHICH THE BODY ABOVE HAS JUST THROWN AWAY.
         Stripping the tags leaves the anchor TEXT and drops the href, so the one thing anybody
         testing locally needs — the address the person would click — was the one thing not in the
         log. Every link in the mail, in order, so a journey can be followed rather than inferred. */
      const links = [...options.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      if (links.length) this.logger.warn(`[DEV EMAIL] Links: ${links.join(' ')}`);
      // Also relay to local mailcatcher (127.0.0.1:1025) so persona tests can read links
      try {
        const transport = nodemailer.createTransport({ host: '127.0.0.1', port: 1025, secure: false, ignoreTLS: true });
        await transport.sendMail({ from: this.fromEmail, to: options.to, subject: options.subject, html: options.html });
      } catch (_) { /* mailcatcher not running - console log is still available */ }
      const devId = `dev-${crypto.randomUUID()}`;
      await this.delivery.recordSend(devId, options.to, context);
      // DEV BOUNCE CONVENTION: a recipient containing '+bounce' emits a
      // synthetic email.bounced event through the SAME webhook handler, so
      // the full bounced-state UI is provable at the real local UI. The
      // Resend->endpoint hop itself is prod-verified once at registration.
      if (options.to.includes('+bounce')) {
        await this.delivery.applyEvent({
          type: 'email.bounced',
          data: { email_id: devId, to: options.to, bounce: { message: 'dev-simulated bounce (+bounce convention)' } },
        });
        this.logger.warn(`[DEV EMAIL] simulated bounce for ${options.to}`);
      }
      // Extract first href for easy local testing
      const match = options.html.match(/href="([^"]+)"/);
      return match?.[1];
    }
    const { data, error } = await this.theResendClient().emails.send({ from: this.fromEmail, ...options, text, ...(headers ? { headers } : {}) });
    if (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.name} - ${error.message}`);
      this.writeItDown(options, sender, 'failed', `${error.name}: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
    this.logger.log(`Email sent to ${options.to} (id: ${data?.id})`);
    this.writeItDown(options, sender, 'sent', null);
    if (data?.id) await this.delivery.recordSend(data.id, options.to, context);
    return undefined;
  }

  /**
   * THE LEDGER. A failure the product knows about, written where a person can find it. Fire-and-forget:
   * a ledger that cannot be written must not stop a mail that can be sent.
   */
  private writeItDown(options: { to: string; subject: string }, sender: string | undefined, outcome: 'sent' | 'held' | 'suppressed' | 'failed', because: string | null): void {
    this.prisma.notification
      .create({ data: { channel: 'email', toAddress: options.to, sender: sender ?? null, subject: options.subject, outcome, because } })
      .catch((err: any) => this.logger.warn(`Could not record a notification for ${options.to}: ${err?.message}`));
  }

  private layout(body: string): string {
    return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">${body}</div>`;
  }

  // --- Auth ---

  /**
   * SOMEBODY ASKED TO SPEAK TO A COACH. THE ONLY THING THEY WERE PROMISED IS THIS.
   *
   * So it says three things and stops: that it arrived, roughly when somebody will come back, and what
   * it costs. The cost is repeated here even though the form showed it, because a person who learns
   * the price only after chasing a reply has been wasted, and because the paid option must never read
   * as the thing the product was really for.
   */
  async sendCoachRequestReceived(email: string, firstName: string): Promise<void> {
    const name = firstName?.trim() ? firstName.trim().split(' ')[0] : 'there';
    await this.sendEmail({
      to: email,
      subject: 'We have your request to speak to a coach',
      html: `
        <p>${greeting(name)}</p>
        <p>Thanks for asking. Somebody reads these and will come back to you within two working days.</p>
        <p>So there are no surprises, coaching is $700 per month with no retainer, or $7,500 a year for twelve sessions. We usually suggest two sessions per issue, back to back: one to understand it, the next to work through it.</p>
        <p>We identify a coach suited to the situation: the scenario, the seniority, the language, the industry. You meet them before you commit to anything.</p>
        <p>Nothing has been created in Groundwork and nobody on your team has been contacted. If you would rather just get going, the software works on its own and most teams run it themselves.</p>
        <p>Groundwork</p>
      `,
    }, undefined, 'sendCoachRequestReceived');
  }

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Verify your email to get started on Groundwork',
      html: this.layout(`<p>${greeting(firstName)}</p><p>Confirm your email to get started.</p><p><a href="${url}">Verify email</a></p>`),
    }, undefined, 'sendVerificationEmail');
  }

  /**
   * @param next Where to land after signing in. The link carries no destination without it, and the
   * client falls back to the check-in list - so somebody who clicked an invite to one check-in,
   * was emailed a sign-in link because they were in a different browser, and signed in, arrived on
   * a list of everything and had to find their way back. Reported exactly that way: "when i sign-in,
   * it just takes me to the general checkins page."
   *
   * The flow that sends it already knows the check-in id at that moment. Optional, because five of
   * the six callers are an ordinary sign-in with nowhere particular to be.
   */
  async sendMagicLinkEmail(email: string, firstName: string, token: string, next?: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}${next ? `&next=${encodeURIComponent(next)}` : ''}`;
    await this.sendEmail({
      to: email,
      subject: 'Activate your Groundwork sign-in',
      html: this.layout(`<p>${greeting(firstName)}</p><p>You or someone on your team just signed up for Groundwork using this email. Click the link below to activate your sign-in and get started.</p><p><a href="${url}">Activate sign-in</a></p><p>This link lasts ${howLongInWords('verify an address')}.</p><p style="color:#888;font-size:12px;">If you did not request this, you can ignore this email. Nothing is created without clicking the link.</p>`),
    }, { kind: 'MAGIC_LINK' }, 'sendMagicLinkEmail');
  }

  async sendSignInLinkEmail(email: string, firstName: string, token: string): Promise<{ devUrl?: string }> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    const devUrl = await this.sendEmail({
      to: email,
      subject: 'Your Groundwork sign-in link',
      html: this.layout(`<p>${greeting(firstName)}</p><p>Click the link below to sign in to Groundwork. No password needed.</p><p><a href="${url}">Sign in</a></p><p>This link lasts ${howLongInWords('verify an address')} and can only be used once.</p>`),
    }, undefined, 'sendSignInLinkEmail');
    return { devUrl };
  }

  async sendAddPasswordEmail(email: string, firstName: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/set-password?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Set a password for Groundwork',
      /*
       * TWO SENTENCES AND NO IDEA WHAT GROUNDWORK IS. The audit found this one both nameless and
       * silent about its own window: somebody holding a dead link could not tell whether they were
       * an hour or a week late. The window comes from how-long-a-link-lasts.ts rather than being
       * typed here, so it cannot drift from the row the token was written with.
       */
      html: this.layout(
        `<p>${greeting(firstName)}</p>` +
        `<p>Groundwork is where you and the people you work with each say how a piece of work is actually going, separately, and get one shared picture back. Setting a password means you can sign in without Google.</p>` +
        `<p><a href="${url}">Set password</a></p>` +
        `<p style="color:#888;font-size:12px;">This link lasts ${howLongInWords('set a password from an email')} and can only be used once. If it has expired, ask for a new one from the sign-in page.</p>`,
      ),
    }, undefined, 'sendAddPasswordEmail');
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<{ devUrl?: string }> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    const devUrl = await this.sendEmail({
      to: email,
      subject: 'Reset your Groundwork password',
      html: this.layout(`<p>${greeting(firstName)}</p><p>Reset your password. The link lasts ${howLongInWords('reset a password')}.</p><p><a href="${url}">Reset password</a></p>`),
    }, undefined, 'sendPasswordResetEmail');
    return { devUrl };
  }

  async sendContributorCode(to: string, code: string, sessionsGranted: number): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Groundwork access code',
      html: this.layout(
        `<p>Here is your Groundwork access code. It gives you ${sessionsGranted} session${sessionsGranted !== 1 ? 's' : ''} free of charge.</p>
         <p style="font-size:22px;font-weight:bold;letter-spacing:0.1em;background:#F5F3EF;border-radius:6px;padding:14px 20px;display:inline-block;">${code}</p>
         <p>To use it: go to <a href="https://app.myground.work">app.myground.work</a>, sign up, set up a check-in, and enter this code when prompted. Your check-in stays private until the report is released.</p>
         <p>Any questions, reply to this email.</p>
         <p style="color:#9B9590;font-size:12px;">The Groundwork team</p>`,
      ),
    }, undefined, 'sendContributorCode');
  }

  // --- Team invites ---

  async sendUserInvite(email: string, firstName: string, token: string, orgName: string): Promise<void> {
    const url = `${this.frontendUrl}/set-password?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: `You've been added to ${orgName} on Groundwork`,
      html: this.layout(`<p>${greeting(firstName)}</p><p>${escapeHtml(orgName)} added you to their Groundwork workspace. Groundwork runs structured check-ins across a team and surfaces alignment and gaps in a shared report. The people in each check-in you join can see what you say in it. Your questions to ${escapeHtml(askName(orgName))} stay private.</p><p><a href="${url}">Accept invite</a></p><p style="color:#888;font-size:12px;">If you were not expecting this, you can ignore this email. Nothing is active until you click the link.</p>`),
    }, undefined, 'sendUserInvite');
  }

  // --- Ground / conversation lifecycle (see comms library, Part 3) ---

  /** Participant added to a check-in. They are NEVER added silently. */
  async sendParticipantInvite(email: string, founderName: string, groundLabel: string, token: string, note?: string, context?: DeliveryContext): Promise<{ devUrl?: string }> {
    const url = `${this.frontendUrl}/invite?token=${token}`;
    /*
     * THE FIRST THING MOST PEOPLE EVER SEE OF THIS PRODUCT, AND IT READ LIKE A SUMMONS.
     *
     * "Share your account of", "what you put on record belongs to you", "Add my account" - three
     * filing-cabinet phrases in one mail, sent to somebody who has never heard of us and is being
     * asked to be honest about their own work.
     *
     * AND IT OVERPROMISED, which has been flagged before. "Nobody reads what you write" is not
     * true: the model reads it, the shared picture is built from it, and the lead reads that
     * picture. The narrower claim is the one the product actually enforces - nobody on your team
     * sees the words - and it is worth more than the broad one precisely because it holds.
     *
     * The last paragraph promises that ignoring this is enough. theWayToStopBeingChased is what
     * makes that true.
     */
    const stopLine = await this.theWayToStopBeingChased(context?.participantId);
    /* Free text from the inviter, inside a styled block, in a mail from noreply@: escaped, so a note
       with an ampersand or an angle bracket renders as written rather than as half a sentence. */
    const noteHtml = note ? `<p style="border-left:3px solid #5DCAA5;padding:8px 14px;margin:20px 0;color:#4A4540;font-style:italic;">${escapeHtml(note)}</p>` : '';
    const devUrl = await this.sendEmail({
      to: email,
      subject: `${founderName} would like your take on ${groundLabel}`,
      html: this.layout(
        `<p>Hi,</p>
         <p><strong>${escapeHtml(founderName)}</strong> would like to know what you are seeing in <strong>${escapeHtml(groundLabel)}</strong>.</p>
         <p>It is a short check-in, about ten minutes, where you say what is actually going on from where you sit.</p>
         <p>${escapeHtml(await this.whoSeesWhatYouSay(context))}</p>
         <p>You are not being asked to be fair or balanced. You are being asked to be honest. What you share here is yours.</p>
         ${noteHtml}
         <!--
           THE BUTTON SAYS WHAT HAPPENS WHEN YOU PRESS IT.

           It said "Say what I am seeing", which reads as a strange thing to be asked and does not
           name the thing on the other side of it. Reported off a real invitation: "say what I am
           seeing instead of check-in is strange."

           The words above it already explain what a check-in is and that nobody on the team reads
           it. The button only has to say what pressing it starts.
         -->
         <p><a href="${url}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Start my check-in →</a></p>
         ${await this.theWhatsAppLine(email, context)}
         <p style="font-size:12px;color:#9B9590;">You are never obligated to take part. If you would rather not, you can simply ignore this - declining is never shown as a negative.</p>
         ${stopLine ?? ''}`,
      ),
    }, context ?? { kind: 'PARTICIPANT_INVITE' }, 'sendParticipantInvite');
    return { devUrl };
  }

  /** Admin set up a check-in and named someone to lead it. The lead decides when
   * to confirm and begin - this is not a synchronized moment with the admin.
   * `url` is pre-resolved by the caller: a password-setup link for a brand new
   * user, or a direct link to the ground's confirm-lead screen for someone who
   * already has an account. */
  /**
   * An admin accepted the ground somebody set up.
   *
   * Without this the creator watches a page that says "waiting" and has no idea
   * whether anything happened - and the whole point of holding the invites is that
   * they cannot just carry on regardless.
   */
  /**
   * A LEAVE, HOURS OR SPENDING DECISION, BY EMAIL (decision 106 item 7). Sent when the WhatsApp message
   * about it could not go: the person said STOP, has no number, or WhatsApp is off for them. The
   * sentence is the same one WhatsApp would have carried.
   */
  async sendRequestDecided(email: string, sentence: string, what: string, outcome: 'approved' | 'declined'): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your request for ${what} was ${outcome}`,
      html: this.layout(`<p>${escapeHtml(sentence)}</p>`),
    }, undefined, 'sendRequestDecided');
  }

  async sendGroundApproved(email: string, firstName: string, groundLabel: string, url: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your check-in is approved: ${groundLabel}`,
      html: this.layout(
        `<p>${greeting(firstName)}</p>
         <p>An admin in your organisation has approved <strong>${escapeHtml(groundLabel)}</strong>. You can invite the people involved now, and their check-ins can begin.</p>
         <p><a href="${url}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open the check-in →</a></p>`,
      ),
    }, undefined, 'sendGroundApproved');
  }

  /**
   * Declined. The reason is included when there is one, because "no" without a reason
   * is the thing that makes people stop asking.
   */
  async sendGroundDeclined(email: string, firstName: string, groundLabel: string, reason: string | null): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your check-in was not approved: ${groundLabel}`,
      html: this.layout(
        `<p>${greeting(firstName)}</p>
         <p>An admin in your organisation has not approved <strong>${escapeHtml(groundLabel)}</strong>, so it will not run and nobody has been invited to it.</p>
         ${reason ? `<p style="border-left:3px solid #E2E0DB;padding:8px 14px;color:#4A4540;">${escapeHtml(reason)}</p>` : ''}
         <p>Nothing you wrote has been shared with anybody. If this was a misunderstanding, the fastest way through it is a conversation with whoever administers Groundwork for your organisation.</p>`,
      ),
    }, undefined, 'sendGroundDeclined');
  }

  async sendLeadInvite(email: string, adminName: string, groundLabel: string, url: string, context?: DeliveryContext): Promise<{ devUrl?: string }> {
    const devUrl = await this.sendEmail({
      to: email,
      subject: `${adminName} asked you to lead a check-in: ${groundLabel}`,
      html: this.layout(
        `<p>Hi,</p>
         <p><strong>${escapeHtml(adminName)}</strong> set up <strong>${escapeHtml(groundLabel)}</strong> on Groundwork and named you to lead it.</p>
         <p>You decide when to begin. Review the context they left, add or edit it, and confirm when you are ready. You will do your own check-in as part of this, and any people already invited will be waiting on you.</p>
         <!--
           W8-6. The Context tab has document upload and context notes, and
           nothing anywhere told anybody it was there, so it went unused. One
           sentence, in the email that gets opened before the check-in does.
         -->
         <p>The Context and resources tab on the check-in is where background goes - notes, and documents like a plan, a brief or a spreadsheet. What you upload is yours by default; mark it open to the check-in and everybody works from it, and their check-ins will have read it too.</p>
         <p><a href="${url}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Review and begin →</a></p>`,
      ),
    }, context ?? { kind: 'LEAD_INVITE' }, 'sendLeadInvite');
    return { devUrl };
  }

  /** Report released. Sent to BOTH parties at the same time. */
  /**
   * NOBODY WAS TOLD THEIR INTEGRATION HAD STOPPED RECEIVING.
   *
   * Seven attempts over about twenty-one hours and then the delivery is DEAD, with a warning in our
   * own logs. The customer's first sign was a gap in their own data, found later, by them.
   *
   * Deliberately not alarming and deliberately specific: what we could not reach, what we were
   * trying to send, and that we have stopped trying for that one. Classified in
   * `nothing-goes-out-that-was-turned-off.ts` as something we decided to send.
   */
  async sendWebhookEndpointDying(
    email: string,
    firstName: string | null,
    /* NOT named `...Url`, deliberately. `a-link-in-an-email-has-to-resolve.spec.ts` requires that a
       URL handed to an email be offered as a link, which is the right rule — and this is the
       customer's OWN endpoint address, quoted back so they know which one we cannot reach. It is an
       identifier, not somewhere for them to go, and making it clickable would send an admin's
       browser at their own webhook receiver. */
    endpointAddress: string,
    eventType: string,
    attempts: number,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Groundwork could not reach your webhook endpoint',
      html: this.layout(
        `<p>${greeting(firstName)}</p>` +
        `<p>We have not been able to deliver events to <b>${endpointAddress}</b>. The last one - a <code>${eventType}</code> - was tried ${attempts} times over about a day and we have now stopped trying for that event.</p>` +
        `<p>We have switched this endpoint off, so nothing more queues against a receiver we know we cannot reach. Nothing has been lost on our side: every attempt and its response is in your delivery log. Once it is reachable again, switch it back on from your integrations page and new events flow to it.</p>` +
        `<p><a href="${this.frontendUrl}/org/integrations">Open your integrations</a></p>` +
        `<p style="color:#888;font-size:12px;">You are getting this because you are an admin on this organisation. One notice a day per endpoint, however many events are affected.</p>`,
      ),
    }, undefined, 'sendWebhookEndpointDying');
  }

  /** Two days before their invitation lapses, the invitee is told, with the link that still works. */
  async sendInviteAboutToLapse(email: string, groundLabel: string, inviteUrl: string, participantId: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your invitation to ${groundLabel} lapses in two days`,
      html: this.layout(
        `<p>You were invited to give your account of <strong>${escapeHtml(groundLabel)}</strong>, and the invitation has not been opened. It lapses in two days.</p>` +
        `<p><a href="${inviteUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Add my account →</a></p>` +
        `<p style="font-size:12px;color:#9B9590;">You are never obligated to take part. If you would rather not, ignore this and nothing more comes about it.</p>${(await this.theWayToStopBeingChased(participantId)) ?? ''}`,
      ),
    }, { kind: 'REMINDER', participantId }, 'sendInviteAboutToLapse');
  }

  /** An invitation lapsed unopened; the lead who sent it can resend or take them off. */
  async sendInviteLapsed(email: string, firstName: string | null, invitee: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `An invitation to ${groundLabel} has lapsed`,
      html: this.layout(
        `<p>${greeting(firstName)}</p>` +
        `<p>The invitation you sent to <strong>${escapeHtml(invitee)}</strong> for <strong>${escapeHtml(groundLabel)}</strong> was never opened and has now lapsed. They are still on the check-in; nothing has been sent to them since the reminder two days ago.</p>` +
        `<p>Resend it from the check-in, correct the address, or take them off - whichever is true.</p>` +
        `<p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open the check-in →</a></p>`,
      ),
    }, undefined, 'sendInviteLapsed');
  }

  /** The invitation bounced hard; the lead who sent it is the one who can fix the address. */
  async sendInviteBounced(email: string, firstName: string | null, invitee: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `An invitation to ${groundLabel} could not be delivered`,
      html: this.layout(
        `<p>${greeting(firstName)}</p>` +
        `<p>The invitation you sent to <strong>${escapeHtml(invitee)}</strong> for <strong>${escapeHtml(groundLabel)}</strong> bounced: that address did not accept it. Nothing more will be sent to it.</p>` +
        `<p>If the address is wrong, correct it on the check-in and the invitation goes again to the new one. If it is right, they may need to ask their mail administrator why it was refused.</p>` +
        `<p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open the check-in →</a></p>`,
      ),
    }, undefined, 'sendInviteBounced');
  }

  /* --- The answer to a request for API access. Somebody asked; these are the three things that can become of it. --- */

  async sendApiAccessApproved(email: string, firstName: string | null, link: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your Groundwork API access is approved',
      html: this.layout(
        `<p>${greeting(firstName)}</p>` +
        `<p>Your organisation's request for API access has been approved. The Connect page now shows your keys, the calls, and the reference.</p>` +
        `<p>Next step: issue a key for the system you are connecting, swap it for a token, and send something - the page ticks off each step as it sees it happen.</p>` +
        `<p><a href="${link}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Connect →</a></p>`,
      ),
    }, undefined, 'sendApiAccessApproved');
  }

  async sendApiAccessDeclined(email: string, firstName: string | null, note: string, link: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your Groundwork API access request was not approved',
      html: this.layout(
        `<p>${greeting(firstName)}</p>` +
        `<p>Your organisation's request for API access was not approved. The reason given:</p>` +
        `<p style="border-left:3px solid #E2E0DB;padding:8px 14px;margin:18px 0;color:#4A4540;">${escapeHtml(note)}</p>` +
        `<p>If that changes what you intend to build, you can ask again from the Connect page, and it is read by a person.</p>` +
        `<p><a href="${link}">Open Connect</a></p>`,
      ),
    }, undefined, 'sendApiAccessDeclined');
  }

  async sendApiAccessWithdrawn(email: string, firstName: string | null, note: string, link: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your Groundwork API access has been withdrawn',
      html: this.layout(
        `<p>${greeting(firstName)}</p>` +
        `<p>Your organisation's API access has been withdrawn, effective now: calls made with your keys will be refused from this point. The reason given:</p>` +
        `<p style="border-left:3px solid #E2E0DB;padding:8px 14px;margin:18px 0;color:#4A4540;">${escapeHtml(note)}</p>` +
        `<p>Nothing you have built is deleted, and the records and reports are unaffected. If you believe this is wrong, reply to this email.</p>` +
        `<p><a href="${link}">Open Connect</a></p>`,
      ),
    }, undefined, 'sendApiAccessWithdrawn');
  }

  /** The base the product's own links are built from, for callers that need to make one. */
  frontendUrlForLinks(): string {
    return this.frontendUrl;
  }

  /**
   * THE ONE-TIME CODE FOR A DESTRUCTIVE ADMIN OPERATION.
   *
   * A real sender rather than a cast past this class's private `sendEmail`. The admin service
   * called `(this.email as any).sendEmail(...)`, which reaches around the type to skip the opt-out
   * check, the sender classification and everything else this class does on the way out. For an OTP
   * that suppression is CORRECT - it is the way back in and nothing may stop it - but doing it by
   * casting means the rule is bypassed by construction rather than by decision, and the next
   * caller to copy the line will be suppressing something that should not be.
   *
   * Classified as "the way back in" in `WHAT_EACH_MAIL_IS`, which is how that suppression is now
   * stated rather than smuggled.
   *
   * RETURNS WHETHER IT WENT. The old path caught a send failure, logged it, and returned
   * `{ sent: true }` regardless - so an admin sat waiting for a code that was never coming.
   */
  async sendAdminOtp(email: string, code: string): Promise<{ sent: boolean; because?: string }> {
    try {
      await this.sendEmail({
        to: email,
        subject: 'Your Groundwork admin code',
        html: this.layout(
          `<p>Your one-time code is <strong>${code}</strong>. It expires in ten minutes.</p>` +
          `<p style="color:#888;font-size:12px;">If you did not ask for this, somebody signed in as you is trying to perform an admin operation that cannot be undone. Tell the team.</p>`,
        ),
      }, undefined, 'sendAdminOtp');
      return { sent: true };
    } catch (err: any) {
      this.logger.error(`Admin OTP to ${email} did not send: ${err?.message}`);
      return { sent: false, because: 'the code could not be emailed' };
    }
  }

  /**
   * THE TEAM IS TOLD. One short mail to everybody on the back-office roster when something outside
   * needs a person here: a new organisation, a request for the API, a request for a call or coaching.
   * Plain lines and one link to where they act. See back-office/the-team-is-told.service.ts.
   */
  async sendTeamAlert(email: string, subject: string, lines: string[], linkLabel: string, linkUrl: string): Promise<{ sent: boolean }> {
    try {
      await this.sendEmail({
        to: email,
        subject,
        html: this.layout(lines.map((l) => `<p>${l}</p>`).join('') + `<p><a href="${linkUrl}">${linkLabel}</a></p>`),
      }, undefined, 'sendTeamAlert');
      return { sent: true };
    } catch (err: any) {
      this.logger.error(`Team alert to ${email} did not send: ${err?.message}`);
      return { sent: false };
    }
  }

  /**
   * THE LEAD'S WEEKLY LETTER (anchor piece 29). The words are built in the-leads-weekly-letter.ts from
   * counts and first names only; here they are escaped, wrapped and posted. The way to stop it is the
   * footer every mail we decide to send carries, and a lead who used it is not written to.
   */
  async sendTheLeadsWeeklyLetter(email: string, subject: string, lines: string[], linkLabel: string, linkUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject,
      html: this.layout(lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('') + `<p><a href="${linkUrl}">${escapeHtml(linkLabel)}</a></p>`),
    }, undefined, 'sendTheLeadsWeeklyLetter');
  }

  /**
   * "GET UPDATES FROM YOUR TEAM" HAS TWO EMAILS AND THEY ARE THE WHOLE PRODUCT FOR THAT CARD.
   *
   * A two-minute setup is only worth anybody's time because of what arrives in the same week, so
   * neither of these is the ordinary invite or the ordinary report mail. The words are Hafsah's and
   * the reasoning is in one-line-one-link-one-report.
   */
  async sendTeamUpdateAsk(
    email: string,
    leadName: string,
    theOneLine: string,
    url: string,
    by: string | null,
    aTrial = false,
    context?: DeliveryContext,
  ): Promise<{ devUrl?: string }> {
    const { subject, lines } = whatTheTeamGets({ leadName, theOneLine, by, aTrial });
    const [who, question, ...rest] = lines;
    const devUrl = await this.sendEmail({
      to: email,
      subject,
      html: this.layout(
        `<p>${escapeHtml(who)}</p>` +
        `<p style="border-left:3px solid #5DCAA5;padding:10px 16px;margin:20px 0;font-size:17px;">${escapeHtml(question)}</p>` +
        rest.map((l) => `<p>${escapeHtml(l)}</p>`).join('') +
        `<p><a href="${url}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">${THE_TEAM_BUTTON} &rarr;</a></p>` +
        (await this.theWhatsAppLine(email, context)) +
        /*
         * IT DID NOT GO INTO ONE SUMMARY UNREAD.
         *
         * "Nobody on your team sees what you write" was never true here, and since 5 October it is not
         * said in any invitation (see whoSeesWhatYouSay). It is NOT true of a team update: the person who asked reads every
         * answer, and the report built from them goes back out to everybody who asked for it.
         *
         * Hafsah had the same sentence removed from the answering screen on 23 September 2026. It
         * was still here, in the mail that gets people to that screen.
         */
        `<p style="font-size:12px;color:#9B9590;">${escapeHtml(who.split(' ')[0] || 'Whoever asked')} reads the answers, and they go into one report that everybody who took part receives.</p>`,
      ),
    }, context ?? { kind: 'PARTICIPANT_INVITE' }, 'sendTeamUpdateAsk');
    return { devUrl };
  }

  /**
   * WHICH INVITE THIS GROUND SENDS, DECIDED IN ONE PLACE.
   *
   * "Get updates from your team" has its own ask - one line, one link, two minutes - and it was
   * written and then never reached, because every invite in the product goes through
   * sendParticipantInvite and that is the ordinary one: it explains what a check-in is, that nobody
   * sees the words, and that it takes about ten minutes. All true, none of it what somebody being
   * asked one question by their own manager should read.
   *
   * So the choice lives here rather than at each of the five call sites, and a site added later
   * inherits it. Everything that is not a team update is untouched.
   */
  async sendTheInviteThisGroundSends(
    theCheckIn: { scenario: string; brief: string | null; label: string },
    email: string,
    leadName: string,
    token: string,
    note?: string,
    context?: DeliveryContext,
    by: string | null = null,
  ): Promise<{ devUrl?: string }> {
    const theOneLine = theCheckIn.scenario === 'TEAM_UPDATES' ? theCheckIn.brief?.trim() : '';
    if (!theOneLine) return this.sendParticipantInvite(email, leadName, theCheckIn.label, token, note, context);
    /* The trial line is carried on the note, which is where the setup form puts her sentence. */
    return this.sendTeamUpdateAsk(
      email, leadName, theOneLine, this.buildInviteUrl(token), by,
      !!note && /trying this out/i.test(note), context,
    );
  }

  /** The moment of value: everybody answered, and here is the one report. */
  async sendTeamUpdateAllIn(email: string, theOneLine: string, howMany: number, reportUrl: string, sharedByAnAdminSentence?: string): Promise<void> {
    const { subject, lines } = whatTheLeadGets({ theOneLine, howMany });
    const [allIn, question, ...rest] = lines;
    await this.sendEmail({
      to: email,
      subject,
      html: this.layout(
        `<p>${escapeHtml(allIn)}</p>` +
        `<p style="border-left:3px solid #5DCAA5;padding:10px 16px;margin:20px 0;font-size:17px;">${escapeHtml(question)}</p>` +
        rest.map((l) => `<p>${escapeHtml(l)}</p>`).join('') +
        (sharedByAnAdminSentence ? `<p>${escapeHtml(sharedByAnAdminSentence)}</p>` : '') +
        `<p><a href="${reportUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">${THE_LEAD_BUTTON} &rarr;</a></p>`,
      ),
    }, undefined, 'sendTeamUpdateAllIn');
  }

  /**
   * `sharedByAnAdminSentence`: decision 53, 29 September 2026. Set only when another admin
   * released this in the lead's place because the lead has left the organisation - see
   * reports/who-shared-it-because-the-lead-left.ts, which builds the sentence. Null in the
   * ordinary case, where the lead released it themselves and nothing extra is said.
   */
  async sendReportReady(email: string, groundLabel: string, reportUrl: string, sharedByAnAdminSentence?: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `The shared picture for ${groundLabel} is ready`,
      /*
       * WHAT GROUNDWORK IS, AND WHO CAN SEE THIS.
       *
       * The audit read all 110 emails a hundred journeys produced: not one named the organisation
       * the check-in belongs to, and 54 never said who can see what the reader writes. This is the
       * mail whose whole job is to bring somebody back to read a shared record — sent, in the
       * ordinary case, to a participant who has met the product exactly once, ten minutes ago.
       */
      html: this.layout(
        `<p>Everybody on <strong>${escapeHtml(groundLabel)}</strong> has now checked in, so the shared picture is open to all of you at the same moment.</p>` +
        `<p>It shows where what you each said lines up, where it does not, and the one question worth answering together. It does not quote anybody: the words you wrote stay yours, and the record draws on them without showing them.</p>` +
        (sharedByAnAdminSentence ? `<p>${escapeHtml(sharedByAnAdminSentence)}</p>` : '') +
        `<p><a href="${reportUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Read the shared picture →</a></p>` +
        `<p style="font-size:12px;color:#9B9590;">Groundwork is where the people involved in a piece of work each say how it is going, privately, and get one shared picture back.</p>`,
      ),
    }, undefined, 'sendReportReady');
  }



  /** Nudge. Scenario-aware subject, names the specific ground that is still open. */
  /**
   * `participantId` is REQUIRED. Two of three callers left it out, so whether a person could stop being
   * chased depended on which engine chased them; and the stop itself is honoured in sendEmail through
   * the context, so it has to be there.
   */
  async sendNudge(email: string, groundLabel: string, checkInUrl: string, scenario: string | undefined, otherPartyCompleted: boolean | undefined, theAnchorLine: string | null | undefined, participantId: string): Promise<void> {
    const subjectMap: Record<string, string> = {
      NEW_HIRE: 'Your 90-day check-in is waiting',
      NEW_COFOUNDER: 'Your cofounder check-in is open',
      RECOGNITION: 'Your recognition check-in is ready',
      DRIFT: 'Your check-in is here when you are',
      CRISIS_ALIGNMENT: 'Your check-in is here when you are',
      CONTRACT_RENEWAL: 'Your renewal check-in is open',
      OKR_ALIGNMENT: 'Your OKR alignment check-in is open',
      WORKPLAN_BUDGET: 'Your workplan and budget check-in is waiting',
      PULSE_CHECK: 'Your alignment pulse check is ready',
      REALIGN_TEAM: 'Your team realignment check-in is open',
      PIP: 'Your performance plan check-in is waiting',
    };
    const subject = (scenario && subjectMap[scenario]) || 'Your check-in is waiting';
    const otherPartyNote = otherPartyCompleted
      ? `<p><strong>They have already shared their side. Yours is the last one we are waiting for.</strong></p>`
      : '';
    await this.sendEmail({
      to: email,
      subject,
      /* A reminder with no way to stop it is the whole defect. This is the second mail it goes on. */
      /* On an anchor check-in, the anchor's own line (piece 30): their own open promise said back to them, or what has changed. */
      html: this.layout(`<p>Your check-in for <strong>${escapeHtml(groundLabel)}</strong> is still open.</p>${theAnchorLine ? `<p>${escapeHtml(theAnchorLine)}</p>` : ''}${otherPartyNote}<p><a href="${checkInUrl}">Check in</a></p>${(await this.theWayToStopBeingChased(participantId)) ?? ''}`),
    }, { kind: 'REMINDER', participantId }, 'sendNudge');
  }

  /**
   * Your next check-in just opened. Distinct from sendNudge (which reminds
   * someone sitting on an ALREADY-open check-in) - this fires once, the
   * moment a new session becomes available, carrying context from the last
   * check-in so the person doesn't have to remember where they left off.
   */
  async sendSessionReady(email: string, groundLabel: string, checkInUrl: string): Promise<void> {
    /* No "Last time: ..." line (NL-007). It quoted the person's own last record entry into a mailbox
       their administrators can read, forward and export - the one thing the product promises not to do. */
    await this.sendEmail({
      to: email,
      subject: `Your next check-in is open: ${groundLabel}`,
      html: this.layout(`<p>A new check-in is ready for <strong>${escapeHtml(groundLabel)}</strong>.</p><p><a href="${checkInUrl}">Check in</a></p>`),
    }, undefined, 'sendSessionReady');
  }

  /**
   * Sent to the OTHER party when someone corrects a session after they had
   * already signed off AND the recipient has already activated the shared
   * report - i.e. the correction lands after the recipient may have already
   * made decisions based on what was shared. Never includes the correction
   * text itself, only that an update happened - see reports.service.ts's
   * `updates` field for what the recipient can then go see on the report.
   */
  async sendLateCorrectionNotice(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Somebody added to what they said on "${groundLabel}"`,
      html: this.layout(
        `<p>One of the parties on <strong>${escapeHtml(groundLabel)}</strong> corrected their account after you had already seen the shared report.</p>
         <p>The report now shows this as an update, flagged with when it happened - it does not show what was changed in their own words.</p>
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open the report →</a></p>`,
      ),
    }, undefined, 'sendLateCorrectionNotice');
  }

  /** Reminder to the admin that a generated report is waiting to be activated. */
  async sendActivationReminder(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `The shared picture for "${groundLabel}" is waiting for you`,
      html: this.layout(
        `<p>All accounts are in for <strong>${escapeHtml(groundLabel)}</strong> and the shared report has been generated.</p>
         <p>The report shows where accounts agree, where they differ, and what is still unresolved. The people in the check-in can read what each person said.</p>
         <p>Open the check-in to read and release the report to all parties.</p>
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Read and release the report →</a></p>`,
      ),
    }, undefined, 'sendActivationReminder');
  }

  /**
   * Reveal reminder: a party's report has been released, but they have not
   * activated their own ReportActivation yet - their report is ready and
   * they don't know. Distinct from sendActivationReminder above, which nudges
   * the INITIATOR to release/activate billing on a ground - a different
   * concept from a participant's own individual reveal.
   */
  async sendActivationRevealReminder(email: string, groundLabel: string, reportUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your report for "${groundLabel}" is ready to view`,
      html: this.layout(
        `<p>The shared picture for <strong>${escapeHtml(groundLabel)}</strong> has been ready for a few days now.</p>
         <p>It shows where accounts agree, where they differ, and what is still unresolved. You just need to confirm you are ready to see it.</p>
         <p><a href="${reportUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">View your report →</a></p>`,
      ),
    }, undefined, 'sendActivationRevealReminder');
  }

  /** Participant checked in. The lead is told by the person's name, with how many are still to come. */
  async sendParticipantCheckedIn(adminEmail: string, participantName: string, groundLabel: string, groundUrl: string, stillPending?: number): Promise<void> {
    const pendingNote = stillPending && stillPending > 0
      ? `<p>${stillPending} ${stillPending === 1 ? 'party has' : 'parties have'} not yet checked in. The report generates once everyone is in.</p>`
      : `<p>Everyone has now checked in. The shared report is ready to go out.</p>`;
    await this.sendEmail({
      to: adminEmail,
      subject: `${participantName} has checked in on ${groundLabel}`,
      html: this.layout(
        `<p><strong>${escapeHtml(participantName)}</strong> has checked in on <strong>${escapeHtml(groundLabel)}</strong>. That is theirs done.</p>
         ${pendingNote}
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">View check-in →</a></p>
         <p style="font-size:12px;color:#9B9590;">You can see who has checked in and read what they said in the check-in, and the shared picture once it is ready. Everybody in it is told the moment the picture is ready.</p>`,
      ),
    }, undefined, 'sendParticipantCheckedIn');
  }

  /** Ground stalled. Timeline elapsed without resolution. Both parties notified. (GW-06) */
  /**
   * WHO HAS NOT STARTED, BY NAME, TO THE LEAD.
   *
   * The body is composed in `chasing-belongs-to-the-lead.ts` — the names, and the
   * rule that it is never a count, belong with the decision to send it rather than
   * with the mail. Here it is only wrapped and posted.
   */
  async sendWhoHasNotStarted(email: string, subject: string, text: string): Promise<void> {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    await this.sendEmail({
      to: email,
      subject,
      html: this.layout(escaped.split('\n').map((l) => `<p>${l || '&nbsp;'}</p>`).join('')),
    }, undefined, 'sendWhoHasNotStarted');
  }

  /**
   * THE LINK THAT TURNS ASKING TO JOIN INTO JOINING.
   *
   * Deliberately says nothing about whether that address already has an account
   * here — the asking page says the same sentence either way, and an email that
   * said "welcome back" would put the difference back.
   */
  async sendJoinConfirmation(email: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/join/confirm?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Your Groundwork check-in',
      html: this.layout(
        `<p>Somebody shared a Groundwork check-in with you and this address was entered to join it.</p>
         <p>Opening the link below starts your check-in. It lasts 24 hours and works once.</p>
         <p><a href="${url}">Start my check-in</a></p>
         <p style="color:#6B6560;font-size:13px;">If you did not ask for this, nothing has been created and you can ignore it.</p>`,
      ),
    }, undefined, 'sendJoinConfirmation');
  }

  /**
   * THE TIME RAN OUT. AND THIS EMAIL USED TO SAY SOMETHING THAT WAS NOT TRUE.
   *
   * "If you want to continue, either party can reopen the conversation from the check-in page."
   * There was no reopen on the check-in page or anywhere else - STALLED sat with RESOLVED and
   * CLOSED and had no exit at all - so the one email anybody got about it pointed them at a button
   * that did not exist. Reported by a customer who went looking for it: "no clear way to open them
   * back up. i can't easily see where to reopen them or to extend the timeline."
   *
   * There is one now, it belongs to whoever runs the check-in, and this says so.
   */
  async sendStalledNotification(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" ran out of time`,
      html: this.layout(
        `<p>The check-in <strong>${escapeHtml(groundLabel)}</strong> has passed the time it was given, so nothing can be added to it right now.</p>
         <p>Everything already answered is kept, exactly as it is. Whoever runs this check-in can give it more time, and it opens again from where it left off.</p>
         <p><a href="${groundUrl}">View check-in</a></p>`,
      ),
    }, undefined, 'sendStalledNotification');
  }

  /**
   * IT IS OPEN AGAIN, and everybody who was told it stalled is told this too.
   *
   * Leaving them with "it stalled" as the last word while the lead looks at a live check-in is how
   * somebody decides it is not worth answering - which is the thing the customer was actually
   * worried about: "the whole thing would be of little to no use even if many of the users checked
   * in."
   */
  async sendReopenedNotification(email: string, groundLabel: string, groundUrl: string, endsAt: Date | null): Promise<void> {
    const until = endsAt ? ` It now runs until ${whenItWas(endsAt, 'day')}.` : '';
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" is open again`,
      html: this.layout(
        `<p><strong>${escapeHtml(groundLabel)}</strong> has been given more time and is open again.${escapeHtml(until)}</p>
         <p>Everything already in it is still there. If it was your turn before, it is your turn now.</p>
         <p><a href="${groundUrl}">Check in</a></p>`,
      ),
    }, undefined, 'sendReopenedNotification');
  }

  /**
   * AND THE WARNING THAT NEVER EXISTED.
   *
   * Every check-in that ever stalled did so with no notice: the sweep ran at 3am and the first
   * anybody heard was an email saying it was over. The customer's own account of it - "i let a few
   * check-ins wait" - is the ordinary thing that happens to a busy person, and the product's answer
   * was to write the whole check-in off. This goes to whoever runs it, once, while there is still
   * time to do something.
   */
  async sendTimeRunningOut(email: string, groundLabel: string, groundUrl: string, endsAt: Date, daysLeft: number): Promise<void> {
    const when = whenItWas(endsAt, 'day');
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" runs out in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      html: this.layout(
        `<p><strong>${escapeHtml(groundLabel)}</strong> is set to finish on ${escapeHtml(when)}. After that nothing can be added to it until somebody gives it more time.</p>
         <p>If people are still checking in, give it more time now and nothing is interrupted.</p>
         <p><a href="${groundUrl}">Give it more time</a></p>`,
      ),
    }, undefined, 'sendTimeRunningOut');
  }

  /** Someone proposed an end state and the recipient has not yet confirmed. (GW-22) */
  async sendResolutionProposal(email: string, proposerLabel: string, endState: string, groundUrl: string, scenario?: string | null, who?: TheEndingIsAbout | null): Promise<void> {
    const endStateLabel = this.endStateLabel(endState, scenario, who);
    await this.sendEmail({
      to: email,
      subject: `${proposerLabel} suggested how to wrap this up`,
      html: this.layout(
        `<p><strong>${escapeHtml(proposerLabel)}</strong> suggested how this ends.${endStateLabel ? ` <em>${escapeHtml(endStateLabel)}</em>` : ''}</p>
         <p>Whoever runs the check-in decides how it ends. Have a look, and if you see it differently, say so in your own check-in - what you said stays on the record beside what they decided.</p>
         <p><a href="${groundUrl}">Have a look</a></p>`,
      ),
    }, undefined, 'sendResolutionProposal');
  }

  /** Ground closed. All parties confirmed the same end state. (GW-50) */
  async sendGroundClosed(email: string, groundLabel: string, endState: string, groundUrl: string, scenario?: string | null, who?: TheEndingIsAbout | null): Promise<void> {
    const endStateLabel = this.endStateLabel(endState, scenario, who);
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" is now closed`,
      html: this.layout(
        `<p><strong>${escapeHtml(groundLabel)}</strong> has been closed.${endStateLabel ? ` ${escapeHtml(theOutcomeIsThat(endStateLabel))}` : ''}</p>
         <p>Your record is permanent and both parties retain access to everything that was on the check-in.</p>
         <p><a href="${groundUrl}">View the check-in</a></p>`,
      ),
    }, undefined, 'sendGroundClosed');
  }

  /** Post-resolution feedback request. Sent ~24h after close. (GW-50) */
  async sendFeedbackRequest(email: string, groundLabel: string, feedbackUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `One question about "${groundLabel}"`,
      html: this.layout(
        `<p>Now that <strong>${escapeHtml(groundLabel)}</strong> has closed: did the process help you reach an outcome that felt fair and grounded in what was actually said?</p>
         <p>Your answer takes 20 seconds and helps us make every future check-in better.</p>
         <p><a href="${feedbackUrl}">Share your view</a></p>`,
      ),
    }, undefined, 'sendFeedbackRequest');
  }

  // --- Billing ---

  /**
   * Payment request. Sent to the org admin when a ground's first (free) session
   * is complete and the next session requires payment.
   */
  async sendPaymentRequestEmail(adminEmail: string, orgName: string, groundId: string): Promise<void> {
    const billingUrl = `${this.frontendUrl}/billing?groundId=${groundId}`;
    await this.sendEmail({
      to: adminEmail,
      subject: 'Add a card to open more check-ins on Groundwork',
      /* This used to say a check-in "has used its free session" and, in the next line, that every free
         check-in runs unlimited sessions - two sentences that cannot both be true. What happened: the
         free check-ins are used up. What a card buys: more of them, and more people. */
      html: this.layout(
        `<p>Your workspace (<strong>${escapeHtml(orgName)}</strong>) has used all of its free check-ins.</p>
         <p>Every check-in you already have keeps running, with unlimited sessions and reports, and every record stays yours. Adding a card lets your team open more check-ins and add more people.</p>
         <p><a href="${billingUrl}">Add a card</a></p>`,
      ),
    }, undefined, 'sendPaymentRequestEmail');
  }

  /** Nudge to the check-in lead when a participant is blocked by billing. */
  async sendParticipantBlockedNudge(adminEmail: string, groundLabel: string, participantEmail: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: adminEmail,
      subject: `${participantEmail} tried to check in - add a session to unblock them`,
      html: this.layout(
        `<p><strong>${escapeHtml(participantEmail)}</strong> tried to check in on <strong>${escapeHtml(groundLabel)}</strong> but there are no sessions remaining.</p>
         <p>Resubscribe or apply an access code to unblock them. Their record and the report are safe in the meantime.</p>
         <p><a href="${groundUrl}">Go to the check-in</a></p>`,
      ),
    }, undefined, 'sendParticipantBlockedNudge');
  }

  /** Payment failed notice sent to the org admin. */
  async sendPaymentFailed(adminEmail: string, orgName: string): Promise<void> {
    await this.sendEmail({
      to: adminEmail,
      subject: `Action required: payment could not be processed for ${orgName}`,
      html: this.layout(
        `<p>We were unable to charge the card on file. Please update your payment method within 7 days to keep your team's access active. Your records are safe regardless of payment status.</p>
         <p><a href="${this.frontendUrl}/billing">Update payment method</a></p>`,
      ),
    }, undefined, 'sendPaymentFailed');
  }

  /** Billing change notification. Sent when the plan changes. */
  async sendBillingChangeNotification(to: string, name: string, changeDescription: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Groundwork plan has changed',
      html: this.layout(
        `<p>${greeting(name)}</p>
         <p>${changeDescription}</p>
         <p>Your records are unaffected by billing changes. If you have questions about your plan, visit the billing page in your workspace settings.</p>
         <p><a href="${this.frontendUrl}/billing">View billing</a></p>`,
      ),
    }, undefined, 'sendBillingChangeNotification');
  }

  /** Record-portability notice sent when an org account is cancelled. Sent to the individual user. */
  async sendRecordPortabilityNotice(userEmail: string, firstName: string, downloadUrl: string): Promise<void> {
    await this.sendEmail({
      to: userEmail,
      subject: 'What you shared on Groundwork is yours to keep',
      html: this.layout(
        `<p>${greeting(firstName)} Your organisation's Groundwork subscription has been cancelled.</p>
         <p>Your record does not disappear. It belongs to you. Sign in and download it from your settings: <a href="${downloadUrl}">what Groundwork holds about you</a>.</p>`,
      ),
    }, undefined, 'sendRecordPortabilityNotice');
  }

  /** Sent when an org successfully subscribes to a plan. */
  async sendSubscriptionConfirmed(email: string, plan: string, renewalDate: Date): Promise<void> {
    const planLabel = plan.replace('_', ' ').toLowerCase();
    /* ISO order, because the recipient's zone is not known on a billing mail and "March 5" is a different day on two continents. */
    const renewal = onTheDay(renewalDate);
    await this.sendEmail({
      to: email,
      subject: 'Your Groundwork organization subscription is active',
      html: this.layout(
        `<p>Thank you for supporting Groundwork.</p>
         <p>Your organization is now on the <strong>${planLabel}</strong> plan. Unlimited check-ins and unlimited sessions are active for your team.</p>
         <p>Your next billing date is ${renewal}. You can pause or cancel your subscription at any time from your billing page.</p>
         <p>Your payment helps us continue building a product that helps teams align, make better decisions, and solve problems together.</p>
         <p><a href="${this.frontendUrl}/billing">View your subscription</a></p>`,
      ),
    }, undefined, 'sendSubscriptionConfirmed');
  }

  /** Sent when an org cancels their subscription. */
  async sendSubscriptionCancelled(email: string, plan: string): Promise<void> {
    const planLabel = plan.replace('_', ' ').toLowerCase();
    await this.sendEmail({
      to: email,
      subject: 'Your Groundwork subscription has been cancelled',
      html: this.layout(
        `<p>Your <strong>${planLabel}</strong> subscription has been cancelled.</p>
         <p>Your team keeps ten free check-ins, each with unlimited sessions and reports. Every record and report you already have stays accessible.</p>
         <p>If you want to continue as a team, you can resubscribe or buy sessions at any time.</p>
         <p><a href="${this.frontendUrl}/billing">Go to billing</a></p>`,
      ),
    }, undefined, 'sendSubscriptionCancelled');
  }

  /** Sent when a subscription payment fails. */
  async sendSubscriptionPaymentFailed(email: string, plan: string, portalUrl: string): Promise<void> {
    const planLabel = plan.replace('_', ' ').toLowerCase();
    await this.sendEmail({
      to: email,
      subject: 'Action required: payment failed for your Groundwork subscription',
      html: this.layout(
        `<p>We were unable to charge the card on file for your <strong>${planLabel}</strong> subscription.</p>
         <p>Your subscription will be paused if payment is not resolved. Please update your payment method to keep your organization's access active.</p>
         <p>Your records are safe regardless of payment status.</p>
         <p><a href="${portalUrl}">Update payment method</a></p>`,
      ),
    }, undefined, 'sendSubscriptionPaymentFailed');
  }

  /** Sent when a subscription renews successfully. */
  async sendSubscriptionRenewal(email: string, plan: string, amountCents: number, nextRenewal: Date | null): Promise<void> {
    const planLabel = plan.replace('_', ' ').toLowerCase();
    const amount = inDollars(amountCents);
    const next = nextRenewal ? onTheDay(nextRenewal) : 'your next billing date';
    await this.sendEmail({
      to: email,
      subject: `Groundwork subscription renewed: ${amount}`,
      html: this.layout(
        `<p>Your <strong>${planLabel}</strong> subscription has renewed. ${amount} has been charged to the card on file.</p>
         <p>Your next renewal is ${next}. You can pause or cancel at any time from your billing page.</p>
         <p><a href="${this.frontendUrl}/billing">View billing</a></p>`,
      ),
    }, undefined, 'sendSubscriptionRenewal');
  }

  /** Sent when the free session extension is claimed. */
  async sendFreeExtensionClaimed(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Free session added to ${groundLabel}`,
      html: this.layout(
        `<p>Your free session extension has been added to <strong>${escapeHtml(groundLabel)}</strong>.</p>
         <p>Check-ins on the free tier run unlimited sessions. Subscribe when your team needs more check-ins, or more people.</p>
         <p><a href="${groundUrl}">Go to your check-in</a></p>`,
      ),
    }, undefined, 'sendFreeExtensionClaimed');
  }

  /** Sent when a check-in's session balance reaches 1. */
  async sendApproachingSessionLimit(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `One session remaining on ${groundLabel}`,
      html: this.layout(
        `<p>Your check-in <strong>${escapeHtml(groundLabel)}</strong> has one session remaining.</p>
         <p>Subscribe before your team's next check-in to keep this check-in running.</p>
         <p><a href="${groundUrl}">Go to your check-in</a></p>`,
      ),
    }, undefined, 'sendApproachingSessionLimit');
  }

  /** Sent when an org hits its plan member cap on invite. */
  async sendMemberCapWarning(email: string, plan: string, currentCount: number, capCount: number): Promise<void> {
    const planLabel = plan.replace('_', ' ').toLowerCase();
    await this.sendEmail({
      to: email,
      subject: 'Your Groundwork plan has reached its member limit',
      html: this.layout(
        `<p>Your <strong>${planLabel}</strong> plan supports up to ${capCount} members. You currently have ${currentCount} members.</p>
         <p>To add more members, upgrade your organization plan.</p>
         <p><a href="${this.frontendUrl}/billing">Upgrade your organization</a></p>`,
      ),
    }, undefined, 'sendMemberCapWarning');
  }

  /** Absence reminder. Sent when a participant has consecutively missed multiple check-ins. */
  async sendAbsenceReminder(
    to: string,
    name: string,
    groundName: string,
    /* Still taken, still true, and deliberately not said to them any more - see the note on the
       body below. Kept in the signature because the caller counts it and the log line wants it. */
    missedCount: number,
    /**
     * A WAY BACK IN, WHICH THIS EMAIL DID NOT HAVE.
     *
     * It said "sign in to Groundwork to add your version" and carried no link at all — sent
     * to the one person in the product least likely to find their own way back, after three
     * missed rounds. Every other reminder carries the check-in; this one asked them to go
     * and look for it.
     */
    checkInUrl: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Still time to say how ${groundName} is going`,
      html: this.layout(
        /*
        * THIS ONE GOES TO THE PERSON LEAST LIKELY TO WANT IT.
        *
        * It counted their misses to them - "you have missed 2 check-ins in a row", "your record is
        * incomplete" - which is an attendance register, and the one mail where being told off
        * guarantees no reply. The count is still true and still useful to us; it is not what this
        * person needs to read. What they need is that it is not too late and nobody has seen
        * anything yet.
        */
       `<p>${greeting(name)}</p>
         <p>We have not heard from you on <strong>${groundName}</strong> in a while.</p>
         <p>There is still time. The shared picture cannot show what you are seeing until you say it. The people in this check-in can see what you say in it.</p>
         <p><a href="${checkInUrl}">Say how it is going</a></p>`,
      ),
    }, undefined, 'sendAbsenceReminder');
  }

  /**
   * The ending's own sentence, from the one list every screen reads (resolution/end-states.ts, decision
   * 75 item 48). This file used to keep its own copy of the labels by value alone, which had drifted
   * ("Part ways" where the panel said "Let them go"). Null where the value is not one of this kind's.
   */
  private endStateLabel(value: string, scenario?: string | null, who?: TheEndingIsAbout | null): string | null {
    return theEndingSaid(scenario ?? null, value, who);
  }

  async sendCodeExpiryReminder(
    email: string,
    firstName: string,
    code: string,
    daysRemaining: number,
    groundsCreated: number,
  ): Promise<void> {
    const isCreateNudge = groundsCreated === 1 && daysRemaining === 14;
    const subject = isCreateNudge
      ? `Your access code expires in ${daysRemaining} days - create another check-in`
      : `Your access code expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;

    const urgencyNote =
      daysRemaining <= 3
        ? `<p style="color:#c0392b;font-weight:bold;">Your code expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Act now to avoid losing access.</p>`
        : `<p>Your code expires in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>.</p>`;

    const bodyHtml = isCreateNudge
      ? `<p>${greeting(firstName)}</p>
         ${urgencyNote}
         <p>You have used your contributor code (<strong>${code}</strong>) to create one check-in so far. You still have time to create another check-in with it before it expires.</p>
         <p>Every check-in you create is a record that belongs to the people involved - start another before the code runs out.</p>
         <p><a href="${this.buildNewCheckInUrl()}">Create another check-in</a></p>`
      : `<p>${greeting(firstName)}</p>
         ${urgencyNote}
         <p>Your contributor code <strong>${code}</strong> has been used on ${groundsCreated} check-in${groundsCreated !== 1 ? 's' : ''} so far.</p>
         <p>Once it expires, the code can no longer be redeemed. Any check-ins already created with it are unaffected - their records remain intact.</p>
         <p><a href="${this.frontendUrl}/billing">View your codes</a></p>`;

    await this.sendEmail({ to: email, subject, html: this.layout(bodyHtml) }, undefined, 'sendCodeExpiryReminder');
  }

  /** Care fee confirmation. Sent when an org activates a Groundwork subscription. */
  async sendCareFeeConfirmation(to: string, name: string, orgName: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Groundwork subscription is active',
      html: this.layout(
        `<p>${greeting(name)}</p>
         <p>Your Groundwork subscription for <strong>${escapeHtml(orgName)}</strong> is now active.</p>
         <p>Ten check-ins are free, each with unlimited sessions and reports. Your subscription lifts that cap - nobody is ever charged per session, and participants are never charged at all.</p>
         <p>Your records are always yours, regardless of plan status.</p>`,
      ),
    }, undefined, 'sendCareFeeConfirmation');
  }

  /**
   * A ROUND DIGEST, WHOSE BODY IS BUILT SOMEWHERE ELSE ON PURPOSE.
   *
   * Every other mail here composes its own HTML. This one takes the text already built by
   * `digestBody`, because that function is what §13D.2 is enforced in - a headline, counts and a
   * link, with nowhere to put a quote or a finding. Composing it here would put the shape back in a
   * template, and a template is edited by whoever needs one more field in it.
   */
  async sendRoundDigest(email: string, subject: string, text: string): Promise<void> {
    const html = text
      .split('\n')
      .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : ''))
      .join('');
    await this.sendEmail({ to: email, subject, html }, undefined, 'sendRoundDigest');
  }

}

/**
 * The digest carries a ground label somebody typed, and it is going into HTML. Escaping it is not
 * about an attacker - it is about a team whose project is called "Q3 <finance & ops>" getting a mail
 * that renders as half a sentence.
 */
/** The date alone, in ISO order, so nobody reads it in the wrong month or the wrong zone. */
function onTheDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Money says its currency. Every amount here is USD cents. */
function inDollars(cents: number): string {
  return `${(cents / 100).toFixed(2)} USD`;
}

/** The plain-text part, from the HTML every sender already composes: links kept as their address. */
export function plainTextOf(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => `${label.replace(/<[^>]+>/g, '').trim()} (${href})`)
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Appended to every mail we decided to send. The link works with no sign-in (round-digest.service.ts#unsubscribe). */
export const UNSUBSCRIBE_FOOTER = (url: string) =>
  `<p style="font-size:12px;color:#9B9590;margin-top:28px;">To stop these emails: <a href="${url}" style="color:#9B9590;">unsubscribe</a>. A link to sign in will still reach you if you ask for one.</p>`;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
