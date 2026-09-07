import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DeliveryService, DeliveryContext } from './delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { whatThisMailIs, whetherToSend } from './nothing-goes-out-that-was-turned-off';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import { greeting } from './a-greeting-with-no-name';
import { howLongInWords } from '../auth/how-long-a-link-lasts';

/**
 * Groundwork email library. Per the product rules, every message names
 * something specific and ends with a reason the record matters to THEM,
 * not to the org, not to the founder. Keep that voice when filling these in.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(
    private configService: ConfigService,
    private delivery: DeliveryService,
    private prisma: PrismaService,
  ) {
    this.resend = new Resend(this.configService.get<string>('resend.apiKey'));
    this.fromEmail = this.configService.get<string>('resend.fromEmail') || 'Groundwork <noreply@myground.work>';
    this.frontendUrl = this.configService.get<string>('resend.frontendUrl') || 'http://localhost:5173';
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

  private isDev(): boolean {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    if (nodeEnv === 'production') return false;
    // Secondary guard: also treat placeholder/test keys as dev mode.
    const apiKey = this.configService.get<string>('resend.apiKey') ?? '';
    return !apiKey || apiKey.startsWith('re_...') || apiKey === 're_test';
  }

  /**
   * WHETHER THIS PERSON WANTS THIS KIND OF MAIL.
   *
   * Looked up here, once, rather than at each sender — the opt-out was honoured in three of nine
   * senders and every one of those files looked right on its own. See
   * `nothing-goes-out-that-was-turned-off.ts` for the two kinds and the line between them.
   */
  private async wouldTheyRatherNot(to: string, sender: string): Promise<string | null> {
    const kind = whatThisMailIs(sender);
    if (kind === 'the way back in') return null;

    const address = to.trim().toLowerCase();
    const [user, preference] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: address }, select: { emailNotifications: true } }),
      /* Preferences are keyed by (organisation, externalId) and hold no address, so the roster is
         the way in. ANY unsubscribed row for this address stops the mail: somebody who used the
         link said "stop hearing from us", not "stop hearing from one of your tenants" — and
         answering per-organisation would also tell them which ones they are in. */
      this.prisma.person
        .findMany({
          where: { email: { equals: address, mode: 'insensitive' } },
          select: { organizationId: true, externalId: true },
        })
        .then((people) =>
          people.length === 0
            ? null
            : this.prisma.emailPreference.findFirst({
                where: {
                  OR: people.map((p) => ({ organizationId: p.organizationId, personExternalId: p.externalId })),
                  unsubscribedAt: { not: null },
                },
                select: { unsubscribedAt: true },
              }),
        )
        .catch(() => null),
    ]);

    /* Nobody to ask: a participant invited by address has no account and no preference, and
       refusing to write to them would mean nobody could ever be invited. */
    if (!user && !preference) return null;

    const answer = whetherToSend(kind, {
      emailNotifications: user?.emailNotifications,
      unsubscribedAt: preference?.unsubscribedAt ?? null,
    });
    return answer.send ? null : answer.because;
  }

  private async sendEmail(
    options: { to: string; subject: string; html: string },
    context?: DeliveryContext,
    /** Which sender this is. Defaulted so nothing breaks, and every sender passes it. */
    sender?: string,
  ): Promise<string | undefined> {
    const rather = sender ? await this.wouldTheyRatherNot(options.to, sender) : null;
    if (rather) {
      /* Logged rather than silent: an email that did not go out for a good reason is still a thing
         somebody may be waiting for, and "nothing happened" is the hardest kind of bug to chase. */
      this.logger.log(`Not sending "${options.subject}" to ${options.to}: ${rather}`);
      return undefined;
    }

    if (this.isDev()) {
      this.logger.warn(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      const text = options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.logger.warn(`[DEV EMAIL] Body: ${text}`);
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
    const { data, error } = await this.resend.emails.send({ from: this.fromEmail, ...options });
    if (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.name} - ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
    this.logger.log(`Email sent to ${options.to} (id: ${data?.id})`);
    if (data?.id) await this.delivery.recordSend(data.id, options.to, context);
    return undefined;
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
        <p>Thanks for asking. Sahar reads these herself and will come back to you within two working days.</p>
        <p>So there are no surprises, coaching is $5,000 a year for twelve sessions, or $500 an hour with no retainer. We usually suggest two sessions per issue, back to back: one to understand it, the next to work through it.</p>
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

  async sendMagicLinkEmail(email: string, firstName: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Activate your Groundwork account',
      html: this.layout(`<p>${greeting(firstName)}</p><p>You or someone on your team just signed up for Groundwork using this email. Click the link below to activate your account and get started.</p><p><a href="${url}">Activate account</a></p><p>This link lasts ${howLongInWords('verify an address')}.</p><p style="color:#888;font-size:12px;">If you did not request this, you can ignore this email. No account will be created without clicking the link.</p>`),
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
        `<p>Groundwork is where you and the people you work with each give your own account of a piece of work, and get one shared record of it. Setting a password means you can sign in without Google.</p>` +
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
         <p>To use it: go to <a href="https://app.myground.work">app.myground.work</a>, create an account, set up a check-in, and enter this code when prompted. Your check-in stays private until the report is released.</p>
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
      html: this.layout(`<p>${greeting(firstName)}</p><p>${orgName} added you to their Groundwork workspace. Groundwork runs structured check-ins across a team and surfaces alignment and gaps in a shared report. Your contributions stay private until the report is ready.</p><p><a href="${url}">Accept invite</a></p><p style="color:#888;font-size:12px;">If you were not expecting this, you can ignore this email. No account is active until you click the link.</p>`),
    }, undefined, 'sendUserInvite');
  }

  // --- Ground / conversation lifecycle (see comms library, Part 3) ---

  /** Participant added to a check-in. They are NEVER added silently. */
  async sendParticipantInvite(email: string, founderName: string, groundLabel: string, token: string, note?: string, context?: DeliveryContext): Promise<{ devUrl?: string }> {
    const url = `${this.frontendUrl}/invite?token=${token}`;
    const noteHtml = note ? `<p style="border-left:3px solid #5DCAA5;padding:8px 14px;margin:20px 0;color:#4A4540;font-style:italic;">${note}</p>` : '';
    const devUrl = await this.sendEmail({
      to: email,
      subject: `${founderName} invited you to check in on: ${groundLabel}`,
      html: this.layout(
        `<p>Hi,</p>
         <p><strong>${founderName}</strong> has invited you to share your account of <strong>${groundLabel}</strong> using Groundwork.</p>
         <p>What this means: a short private check-in, about 10 minutes, where you give your own version of what is going on. Nobody reads what you write. The shared report shows where your account and theirs agree or differ. It does not quote you.</p>
         <p>You are not being asked to be fair or balanced. You are being asked to be honest. What you put on record belongs to you.</p>
         ${noteHtml}
         <p><a href="${url}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Add my account →</a></p>
         <p style="font-size:12px;color:#9B9590;">You are never obligated to take part. If you would rather not, you can simply ignore this - declining is never shown as a negative.</p>`,
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
  async sendGroundApproved(email: string, firstName: string, groundLabel: string, url: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your check-in is approved: ${groundLabel}`,
      html: this.layout(
        `<p>${greeting(firstName)}</p>
         <p>An admin in your organisation has approved <strong>${groundLabel}</strong>. You can invite the people involved now, and their check-ins can begin.</p>
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
         <p>An admin in your organisation has not approved <strong>${groundLabel}</strong>, so it will not run and nobody has been invited to it.</p>
         ${reason ? `<p style="border-left:3px solid #E2E0DB;padding:8px 14px;color:#4A4540;">${reason}</p>` : ''}
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
         <p><strong>${adminName}</strong> set up <strong>${groundLabel}</strong> on Groundwork and named you to lead it.</p>
         <p>You decide when to begin. Review the context they left, add or edit it, and confirm when you are ready. You will do your own check-in as part of this, and any people already invited will be waiting on you.</p>
         <!--
           W8-6. The Context tab has document upload and context notes, and
           nothing anywhere told anybody it was there, so it went unused. One
           sentence, in the email that gets opened before the check-in does.
         -->
         <p>The Context tab on the check-in is where background goes - notes, and documents like a plan, a brief or a spreadsheet. What you upload is yours by default; mark it open to the check-in and everybody works from it, and their check-ins will have read it too.</p>
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
        `<p>We have not been able to deliver events to <b>${endpointAddress}</b>. The last one — a <code>${eventType}</code> — was tried ${attempts} times over about a day and we have now stopped trying for that event.</p>` +
        `<p>Anything sent while the endpoint is unreachable is queued and retried the same way, so this is worth looking at rather than waiting out. Nothing has been lost on our side: every attempt and its response is in your delivery log.</p>` +
        `<p><a href="${this.frontendUrl}/org/integrations">Open your integrations</a></p>` +
        `<p style="color:#888;font-size:12px;">You are getting this because you are an admin on this organisation. One notice a day per endpoint, however many events are affected.</p>`,
      ),
    }, undefined, 'sendWebhookEndpointDying');
  }

  /** The base the product's own links are built from, for callers that need to make one. */
  frontendUrlForLinks(): string {
    return this.frontendUrl;
  }

  async sendReportReady(email: string, groundLabel: string, reportUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your shared record is ready: ${groundLabel}`,
      /*
       * WHAT GROUNDWORK IS, AND WHO CAN SEE THIS.
       *
       * The audit read all 110 emails a hundred journeys produced: not one named the organisation
       * the check-in belongs to, and 54 never said who can see what the reader writes. This is the
       * mail whose whole job is to bring somebody back to read a shared record — sent, in the
       * ordinary case, to a participant who has met the product exactly once, ten minutes ago.
       */
      html: this.layout(
        `<p>Everybody on <strong>${groundLabel}</strong> has now checked in, so the shared record is open to all of you at the same moment.</p>` +
        `<p>It shows where your accounts agree, where they differ, and the one question worth answering together. It does not quote anybody: the words you wrote stay yours, and the record draws on them without showing them.</p>` +
        `<p><a href="${reportUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Read the shared record →</a></p>` +
        `<p style="font-size:12px;color:#9B9590;">Groundwork is where the people involved in a piece of work each give their own account of it, privately, and get one shared record back.</p>`,
      ),
    }, undefined, 'sendReportReady');
  }

  /** Ground activated. Sent to the participant so they know to return. */
  async sendGroundActivated(email: string, firstName: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `You have both checked in - your shared report is ready: ${groundLabel}`,
      html: this.layout(
        `<p>${greeting(firstName)}</p>
         <p>All parties have checked in on <strong>${groundLabel}</strong>. Your shared report is ready.</p>
         <p>The report shows where your accounts agree, where they differ, and what is still unresolved. It does not quote anyone - it draws on what everyone said without showing the raw words.</p>
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Read the shared report →</a></p>`,
      ),
    }, undefined, 'sendGroundActivated');
  }

  /** Nudge. Scenario-aware subject, names the specific ground that is still open. */
  async sendNudge(email: string, groundLabel: string, checkInUrl: string, scenario?: string, otherPartyCompleted?: boolean): Promise<void> {
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
      html: this.layout(`<p>Your check-in for <strong>${groundLabel}</strong> is still open.</p>${otherPartyNote}<p><a href="${checkInUrl}">Check in</a></p>`),
    }, undefined, 'sendNudge');
  }

  /**
   * Your next check-in just opened. Distinct from sendNudge (which reminds
   * someone sitting on an ALREADY-open check-in) - this fires once, the
   * moment a new session becomes available, carrying context from the last
   * check-in so the person doesn't have to remember where they left off.
   */
  async sendSessionReady(email: string, groundLabel: string, checkInUrl: string, lastCheckInContext?: string): Promise<void> {
    const contextNote = lastCheckInContext
      ? `<p style="color:#6B6560;">Last time: "${lastCheckInContext}"</p>`
      : '';
    await this.sendEmail({
      to: email,
      subject: `Your next check-in is open: ${groundLabel}`,
      html: this.layout(`<p>A new check-in is ready for <strong>${groundLabel}</strong>.</p>${contextNote}<p><a href="${checkInUrl}">Check in</a></p>`),
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
      subject: `Someone added to what they said on "${groundLabel}"`,
      html: this.layout(
        `<p>One of the parties on <strong>${groundLabel}</strong> corrected their account after you had already seen the shared report.</p>
         <p>The report now shows this as an update, flagged with when it happened - it does not show what was changed in their own words.</p>
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open the report →</a></p>`,
      ),
    }, undefined, 'sendLateCorrectionNotice');
  }

  /** Reminder to the admin that a generated report is waiting to be activated. */
  async sendActivationReminder(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your shared report for "${groundLabel}" is waiting`,
      html: this.layout(
        `<p>All accounts are in for <strong>${groundLabel}</strong> and the shared report has been generated.</p>
         <p>The report shows where accounts agree, where they differ, and what is still unresolved. Nobody's words are quoted - it draws on what was said without showing the raw text.</p>
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
        `<p>Your shared record for <strong>${groundLabel}</strong> has been ready for a few days now.</p>
         <p>It shows where accounts agree, where they differ, and what is still unresolved. You just need to confirm you are ready to see it.</p>
         <p><a href="${reportUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">View your report →</a></p>`,
      ),
    }, undefined, 'sendActivationRevealReminder');
  }

  /** Participant checked in. Admin notified so they know to come back. */
  async sendParticipantCheckedIn(adminEmail: string, participantEmail: string, groundLabel: string, groundUrl: string, stillPending?: number): Promise<void> {
    const pendingNote = stillPending && stillPending > 0
      ? `<p>${stillPending} ${stillPending === 1 ? 'party has' : 'parties have'} not yet checked in. The report generates once everyone is in.</p>`
      : `<p>Everyone has now checked in. The shared report is ready to go out.</p>`;
    await this.sendEmail({
      to: adminEmail,
      subject: `${participantEmail} has checked in on ${groundLabel}`,
      html: this.layout(
        `<p><strong>${participantEmail}</strong> has completed their check-in on <strong>${groundLabel}</strong>. Their account is on record.</p>
         ${pendingNote}
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">View check-in →</a></p>
         <p style="font-size:12px;color:#9B9590;">You can see who has checked in and the shared report once it is ready. You cannot see what anybody wrote — accounts stay private until the record is released to everybody at once.</p>`,
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

  async sendStalledNotification(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" has stalled`,
      html: this.layout(
        `<p>The check-in <strong>${groundLabel}</strong> has reached the end of its timeline without a confirmed outcome.</p>
         <p>Both records remain intact and accessible. If you want to continue, either party can reopen the conversation from the check-in page.</p>
         <p><a href="${groundUrl}">View check-in</a></p>`,
      ),
    }, undefined, 'sendStalledNotification');
  }

  /** Someone proposed an end state and the recipient has not yet confirmed. (GW-22) */
  async sendResolutionProposal(email: string, proposerLabel: string, endState: string, groundUrl: string): Promise<void> {
    const endStateLabel = this.endStateLabel(endState);
    await this.sendEmail({
      to: email,
      subject: 'A resolution has been proposed. Your confirmation is needed',
      html: this.layout(
        `<p><strong>${proposerLabel}</strong> has proposed the following outcome: <em>${endStateLabel}</em>.</p>
         <p>The check-in closes only when all active parties confirm the same outcome. Review the proposal and confirm, or counter-propose a different outcome.</p>
         <p><a href="${groundUrl}">View and confirm</a></p>`,
      ),
    }, undefined, 'sendResolutionProposal');
  }

  /** Ground closed. All parties confirmed the same end state. (GW-50) */
  async sendGroundClosed(email: string, groundLabel: string, endState: string, groundUrl: string): Promise<void> {
    const endStateLabel = this.endStateLabel(endState);
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" is now closed`,
      html: this.layout(
        `<p>All parties have confirmed. <strong>${groundLabel}</strong> has been closed with the agreed outcome: <em>${endStateLabel}</em>.</p>
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
        `<p>Now that <strong>${groundLabel}</strong> has closed: did the process help you reach an outcome that felt fair and grounded in what was actually said?</p>
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
      subject: 'Add a card to continue on Groundwork',
      html: this.layout(
        `<p>A check-in in your workspace (<strong>${orgName}</strong>) has used its free session.</p>
         <p>Every check-in on the free tier runs unlimited sessions and reports. Subscribe to open more check-ins, or to add more people - the record you have already built is safe and waiting either way.</p>
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
        `<p><strong>${participantEmail}</strong> tried to check in on <strong>${groundLabel}</strong> but there are no sessions remaining.</p>
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
        `<p>We were unable to charge the card on file. Please update your payment method within 7 days to keep your account active. Your records are safe regardless of payment status.</p>
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
      subject: 'Your Groundwork record is yours to keep',
      html: this.layout(
        `<p>${greeting(firstName)} Your organisation's Groundwork account has been cancelled.</p>
         <p>Your record does not disappear. It belongs to you. Download it here: <a href="${downloadUrl}">${downloadUrl}</a>. This link is valid for 30 days.</p>`,
      ),
    }, undefined, 'sendRecordPortabilityNotice');
  }

  /** Sent when an org successfully subscribes to a plan. */
  async sendSubscriptionConfirmed(email: string, plan: string, renewalDate: Date): Promise<void> {
    const planLabel = plan.replace('_', ' ').toLowerCase();
    const renewal = renewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
    const amount = (amountCents / 100).toFixed(2);
    const next = nextRenewal
      ? nextRenewal.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'your next billing date';
    await this.sendEmail({
      to: email,
      subject: `Groundwork subscription renewed: $${amount}`,
      html: this.layout(
        `<p>Your <strong>${planLabel}</strong> subscription has renewed. $${amount} has been charged to the card on file.</p>
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
        `<p>Your free session extension has been added to <strong>${groundLabel}</strong>.</p>
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
        `<p>Your check-in <strong>${groundLabel}</strong> has one session remaining.</p>
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
      subject: `Your version is still missing from ${groundName}`,
      html: this.layout(
        `<p>${greeting(name)}</p>
         <p>You have missed ${missedCount} check-in${missedCount !== 1 ? 's' : ''} in a row on <strong>${groundName}</strong>.</p>
         <p>Your record is incomplete. The shared picture for this check-in cannot reflect your side until you check in. Everything you write is private until both sides are in. It belongs to you, not to the org.</p>
         <p><a href="${checkInUrl}">Add your version</a></p>`,
      ),
    }, undefined, 'sendAbsenceReminder');
  }

  private endStateLabel(value: string): string {
    const labels: Record<string, string> = {
      KEEP: 'Keep the hire',
      EXTEND: 'Extend evaluation period',
      RESTRUCTURE: 'Restructure',
      EXIT: 'Part ways',
      NOT_YET: 'Not yet - revisit with a named gap',
      SEPARATE: 'Separate',
      CONTINUE: 'Continue',
      END: 'End the engagement',
      RENEW: 'Renew',
      RENEGOTIATE: 'Renew on revised terms',
      COMPLETE: 'Mark complete',
      DESCOPE: 'Descope',
      STOP: 'Stop',
      YES: 'Grant the ask',
      NO: 'Decline',
      ALIGNED: 'Shared picture established - aligned',
      ESCALATE: 'Requires escalation or external decision',
      GAPS_IDENTIFIED: 'Gaps identified - revision needed',
      APPROVED: 'Workplan and budget approved',
      REVISION_NEEDED: 'Revision needed before approval',
      ON_TRACK: 'On track',
      ATTENTION_NEEDED: 'Attention needed on named items',
      REALIGNED: 'Team realigned on shared direction',
      GAPS_REMAIN: 'Gaps remain - further conversation needed',
      RESOLVED: 'Performance concern resolved',
      EXTENDED: 'Plan extended with named conditions',
      SEPARATED: 'Separation agreed',
    };
    return labels[value] ?? value;
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
         <p>Your Groundwork subscription for <strong>${orgName}</strong> is now active.</p>
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
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
