import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DeliveryService, DeliveryContext } from './delivery.service';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

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
  ) {
    this.resend = new Resend(this.configService.get<string>('resend.apiKey'));
    this.fromEmail = this.configService.get<string>('resend.fromEmail') || 'Groundwork <noreply@myground.work>';
    this.frontendUrl = this.configService.get<string>('resend.frontendUrl') || 'http://localhost:5173';
  }

  buildInviteUrl(inviteToken: string): string {
    return `${this.frontendUrl}/invite?token=${inviteToken}`;
  }

  private isDev(): boolean {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    if (nodeEnv === 'production') return false;
    // Secondary guard: also treat placeholder/test keys as dev mode.
    const apiKey = this.configService.get<string>('resend.apiKey') ?? '';
    return !apiKey || apiKey.startsWith('re_...') || apiKey === 're_test';
  }

  private async sendEmail(options: { to: string; subject: string; html: string }, context?: DeliveryContext): Promise<string | undefined> {
    if (this.isDev()) {
      this.logger.warn(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      const text = options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.logger.warn(`[DEV EMAIL] Body: ${text}`);
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

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Verify your email to get started on Groundwork',
      html: this.layout(`<p>Hi ${firstName},</p><p>Confirm your email to get started.</p><p><a href="${url}">Verify email</a></p>`),
    });
  }

  async sendMagicLinkEmail(email: string, firstName: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Activate your Groundwork account',
      html: this.layout(`<p>Hi ${firstName},</p><p>You or someone on your team just signed up for Groundwork using this email. Click the link below to activate your account and get started.</p><p><a href="${url}">Activate account</a></p><p>This link expires in 24 hours.</p><p style="color:#888;font-size:12px;">If you did not request this, you can ignore this email. No account will be created without clicking the link.</p>`),
    }, { kind: 'MAGIC_LINK' });
  }

  async sendSignInLinkEmail(email: string, firstName: string, token: string): Promise<{ devUrl?: string }> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    const devUrl = await this.sendEmail({
      to: email,
      subject: 'Your Groundwork sign-in link',
      html: this.layout(`<p>Hi ${firstName},</p><p>Click the link below to sign in to Groundwork. No password needed.</p><p><a href="${url}">Sign in</a></p><p>This link expires in 24 hours and can only be used once.</p>`),
    });
    return { devUrl };
  }

  async sendAddPasswordEmail(email: string, firstName: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/set-password?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Set a password for Groundwork',
      html: this.layout(`<p>Hi ${firstName},</p><p>Set a password to sign in without Google.</p><p><a href="${url}">Set password</a></p>`),
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<{ devUrl?: string }> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    const devUrl = await this.sendEmail({
      to: email,
      subject: 'Reset your Groundwork password',
      html: this.layout(`<p>Hi ${firstName},</p><p>Reset your password (link expires in 1 hour).</p><p><a href="${url}">Reset password</a></p>`),
    });
    return { devUrl };
  }

  async sendContributorCode(to: string, code: string, sessionsGranted: number): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Groundwork access code',
      html: this.layout(
        `<p>Here is your Groundwork access code. It gives you ${sessionsGranted} session${sessionsGranted !== 1 ? 's' : ''} free of charge.</p>
         <p style="font-size:22px;font-weight:bold;letter-spacing:0.1em;background:#F5F3EF;border-radius:6px;padding:14px 20px;display:inline-block;">${code}</p>
         <p>To use it: go to <a href="https://app.myground.work">app.myground.work</a>, create an account, set up a Ground, and enter this code when prompted. Your check-in stays private until the report is released.</p>
         <p>Any questions, reply to this email.</p>
         <p style="color:#9B9590;font-size:12px;">The Groundwork team</p>`,
      ),
    });
  }

  // --- Team invites ---

  async sendUserInvite(email: string, firstName: string, token: string, orgName: string): Promise<void> {
    const url = `${this.frontendUrl}/set-password?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: `You've been added to ${orgName} on Groundwork`,
      html: this.layout(`<p>Hi ${firstName},</p><p>${orgName} added you to their Groundwork workspace. Groundwork runs structured check-ins across a team and surfaces alignment and gaps in a shared report. Your contributions stay private until the report is ready.</p><p><a href="${url}">Accept invite</a></p><p style="color:#888;font-size:12px;">If you were not expecting this, you can ignore this email. No account is active until you click the link.</p>`),
    });
  }

  // --- Ground / conversation lifecycle (see comms library, Part 3) ---

  /** Participant added to a ground. They are NEVER added silently. */
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
    }, context ?? { kind: 'PARTICIPANT_INVITE' });
    return { devUrl };
  }

  /** Admin set up a ground and named someone to lead it. The lead decides when
   * to confirm and begin - this is not a synchronized moment with the admin.
   * `url` is pre-resolved by the caller: a password-setup link for a brand new
   * user, or a direct link to the ground's confirm-lead screen for someone who
   * already has an account. */
  async sendLeadInvite(email: string, adminName: string, groundLabel: string, url: string, context?: DeliveryContext): Promise<{ devUrl?: string }> {
    const devUrl = await this.sendEmail({
      to: email,
      subject: `${adminName} asked you to lead a ground: ${groundLabel}`,
      html: this.layout(
        `<p>Hi,</p>
         <p><strong>${adminName}</strong> set up <strong>${groundLabel}</strong> on Groundwork and named you to lead it.</p>
         <p>You decide when to begin. Review the context they left, add or edit it, and confirm when you are ready. You will do your own check-in as part of this, and any people already invited will be waiting on you.</p>
         <p><a href="${url}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Review and begin →</a></p>`,
      ),
    }, context ?? { kind: 'LEAD_INVITE' });
    return { devUrl };
  }

  /** Report released. Sent to BOTH parties at the same time. */
  async sendReportReady(email: string, groundLabel: string, reportUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your shared record is ready: ${groundLabel}`,
      html: this.layout(`<p>Both sides have checked in. The shared record is now available to both of you at the same time. It shows where you agree, where you differ, and the one question worth answering together.</p><p><a href="${reportUrl}">View the report</a></p>`),
    });
  }

  /** Ground activated. Sent to the participant so they know to return. */
  async sendGroundActivated(email: string, firstName: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Both accounts are in - your shared report is ready: ${groundLabel}`,
      html: this.layout(
        `<p>Hi ${firstName},</p>
         <p>All parties have checked in on <strong>${groundLabel}</strong>. Your shared report is ready.</p>
         <p>The report shows where your accounts agree, where they differ, and what is still unresolved. It does not quote anyone - it draws on what everyone said without showing the raw words.</p>
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Read the shared report →</a></p>`,
      ),
    });
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
      ? `<p><strong>The other party has already submitted their version. Your record is the only thing missing.</strong></p>`
      : '';
    await this.sendEmail({
      to: email,
      subject,
      html: this.layout(`<p>Your check-in for <strong>${groundLabel}</strong> is still open.</p>${otherPartyNote}<p><a href="${checkInUrl}">Check in</a></p>`),
    });
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
    });
  }

  /** Reminder to the admin that a generated report is waiting to be activated. */
  async sendActivationReminder(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your shared report for "${groundLabel}" is waiting`,
      html: this.layout(
        `<p>All accounts are in for <strong>${groundLabel}</strong> and the shared report has been generated.</p>
         <p>The report shows where accounts agree, where they differ, and what is still unresolved. Nobody's words are quoted - it draws on what was said without showing the raw text.</p>
         <p>Open the ground to read and release the report to all parties.</p>
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Read and release the report →</a></p>`,
      ),
    });
  }

  /** Participant checked in. Admin notified so they know to come back. */
  async sendParticipantCheckedIn(adminEmail: string, participantEmail: string, groundLabel: string, groundUrl: string, stillPending?: number): Promise<void> {
    const pendingNote = stillPending && stillPending > 0
      ? `<p>${stillPending} ${stillPending === 1 ? 'party has' : 'parties have'} not yet checked in. The report generates once everyone is in.</p>`
      : `<p>All parties have now checked in. The shared report is ready to release.</p>`;
    await this.sendEmail({
      to: adminEmail,
      subject: `${participantEmail} has checked in on ${groundLabel}`,
      html: this.layout(
        `<p><strong>${participantEmail}</strong> has completed their check-in on <strong>${groundLabel}</strong>. Their account is on record.</p>
         ${pendingNote}
         <p><a href="${groundUrl}" style="display:inline-block;background:#0A1628;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">View ground →</a></p>`,
      ),
    });
  }

  /** Ground stalled. Timeline elapsed without resolution. Both parties notified. (GW-06) */
  async sendStalledNotification(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" has stalled`,
      html: this.layout(
        `<p>The ground <strong>${groundLabel}</strong> has reached the end of its timeline without a confirmed outcome.</p>
         <p>Both records remain intact and accessible. If you want to continue, either party can reopen the conversation from the ground page.</p>
         <p><a href="${groundUrl}">View ground</a></p>`,
      ),
    });
  }

  /** Someone proposed an end state and the recipient has not yet confirmed. (GW-22) */
  async sendResolutionProposal(email: string, proposerLabel: string, endState: string, groundUrl: string): Promise<void> {
    const endStateLabel = this.endStateLabel(endState);
    await this.sendEmail({
      to: email,
      subject: 'A resolution has been proposed. Your confirmation is needed',
      html: this.layout(
        `<p><strong>${proposerLabel}</strong> has proposed the following outcome: <em>${endStateLabel}</em>.</p>
         <p>The ground closes only when all active parties confirm the same outcome. Review the proposal and confirm, or counter-propose a different outcome.</p>
         <p><a href="${groundUrl}">View and confirm</a></p>`,
      ),
    });
  }

  /** Ground closed. All parties confirmed the same end state. (GW-50) */
  async sendGroundClosed(email: string, groundLabel: string, endState: string, groundUrl: string): Promise<void> {
    const endStateLabel = this.endStateLabel(endState);
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" is now closed`,
      html: this.layout(
        `<p>All parties have confirmed. <strong>${groundLabel}</strong> has been closed with the agreed outcome: <em>${endStateLabel}</em>.</p>
         <p>Your record is permanent and both parties retain access to everything that was on the ground.</p>
         <p><a href="${groundUrl}">View the ground</a></p>`,
      ),
    });
  }

  /** Post-resolution feedback request. Sent ~24h after close. (GW-50) */
  async sendFeedbackRequest(email: string, groundLabel: string, feedbackUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `One question about "${groundLabel}"`,
      html: this.layout(
        `<p>Now that <strong>${groundLabel}</strong> has closed: did the process help you reach an outcome that felt fair and grounded in what was actually said?</p>
         <p>Your answer takes 20 seconds and helps us make every future ground better.</p>
         <p><a href="${feedbackUrl}">Share your view</a></p>`,
      ),
    });
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
        `<p>A ground in your workspace (<strong>${orgName}</strong>) has used its free session.</p>
         <p>The first session on every ground is free. Each additional session is $5. Add a card now to keep the process running - the record you have already built is safe and waiting.</p>
         <p><a href="${billingUrl}">Add a card</a></p>`,
      ),
    });
  }

  /** Nudge to the ground lead when a participant is blocked by billing. */
  async sendParticipantBlockedNudge(adminEmail: string, groundLabel: string, participantEmail: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: adminEmail,
      subject: `${participantEmail} tried to check in - add a session to unblock them`,
      html: this.layout(
        `<p><strong>${participantEmail}</strong> tried to check in on <strong>${groundLabel}</strong> but there are no sessions remaining.</p>
         <p>Add a session ($5) or apply a contributor code to unblock them.</p>
         <p><a href="${groundUrl}">Go to the ground</a></p>`,
      ),
    });
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
    });
  }

  /** Billing change notification. Sent when the plan changes. */
  async sendBillingChangeNotification(to: string, name: string, changeDescription: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Groundwork plan has changed',
      html: this.layout(
        `<p>Hi ${name},</p>
         <p>${changeDescription}</p>
         <p>Your records are unaffected by billing changes. If you have questions about your plan, visit the billing page in your workspace settings.</p>
         <p><a href="${this.frontendUrl}/billing">View billing</a></p>`,
      ),
    });
  }

  /** Record-portability notice sent when an org account is cancelled. Sent to the individual user. */
  async sendRecordPortabilityNotice(userEmail: string, firstName: string, downloadUrl: string): Promise<void> {
    await this.sendEmail({
      to: userEmail,
      subject: 'Your Groundwork record is yours to keep',
      html: this.layout(
        `<p>Hi ${firstName}. Your organisation's Groundwork account has been cancelled.</p>
         <p>Your record does not disappear. It belongs to you. Download it here: <a href="${downloadUrl}">${downloadUrl}</a>. This link is valid for 30 days.</p>`,
      ),
    });
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
         <p>Your organization is now on the <strong>${planLabel}</strong> plan. Unlimited Grounds and unlimited sessions are active for your team.</p>
         <p>Your next billing date is ${renewal}. You can pause or cancel your subscription at any time from your billing page.</p>
         <p>Your payment helps us continue building a product that helps teams align, make better decisions, and solve problems together.</p>
         <p><a href="${this.frontendUrl}/billing">View your subscription</a></p>`,
      ),
    });
  }

  /** Sent when an org cancels their subscription. */
  async sendSubscriptionCancelled(email: string, plan: string): Promise<void> {
    const planLabel = plan.replace('_', ' ').toLowerCase();
    await this.sendEmail({
      to: email,
      subject: 'Your Groundwork subscription has been cancelled',
      html: this.layout(
        `<p>Your <strong>${planLabel}</strong> subscription has been cancelled.</p>
         <p>Your team can continue using Groundwork with per-session billing at $5 per session. Your records and all existing reports remain accessible.</p>
         <p>If you want to continue as a team, you can resubscribe or buy sessions at any time.</p>
         <p><a href="${this.frontendUrl}/billing">Go to billing</a></p>`,
      ),
    });
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
    });
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
    });
  }

  /** Sent when the free session extension is claimed. */
  async sendFreeExtensionClaimed(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Free session added to ${groundLabel}`,
      html: this.layout(
        `<p>Your free session extension has been added to <strong>${groundLabel}</strong>.</p>
         <p>When you're ready to continue after this session, you can buy more sessions at $5 each or upgrade your organization for unlimited access.</p>
         <p><a href="${groundUrl}">Go to your ground</a></p>`,
      ),
    });
  }

  /** Sent when a ground's session balance reaches 1. */
  async sendApproachingSessionLimit(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `One session remaining on ${groundLabel}`,
      html: this.layout(
        `<p>Your ground <strong>${groundLabel}</strong> has one session remaining.</p>
         <p>Add another session ($5) or upgrade your organization for unlimited sessions before your team's next check-in.</p>
         <p><a href="${groundUrl}">Go to your ground</a></p>`,
      ),
    });
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
    });
  }

  /** Absence reminder. Sent when a participant has consecutively missed multiple check-ins. */
  async sendAbsenceReminder(
    to: string,
    name: string,
    groundName: string,
    missedCount: number,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Your version is still missing from ${groundName}`,
      html: this.layout(
        `<p>Hi ${name},</p>
         <p>You have missed ${missedCount} check-in${missedCount !== 1 ? 's' : ''} in a row on <strong>${groundName}</strong>.</p>
         <p>Your record is incomplete. The shared picture for this ground cannot reflect your side until you check in. Everything you write is private until both sides are in. It belongs to you, not to the org.</p>
         <p>Sign in to Groundwork to add your version before the ground moves on without it.</p>`,
      ),
    });
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
      ? `Your contributor code expires in ${daysRemaining} days - create another ground`
      : `Your contributor code expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;

    const urgencyNote =
      daysRemaining <= 3
        ? `<p style="color:#c0392b;font-weight:bold;">Your code expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Act now to avoid losing access.</p>`
        : `<p>Your code expires in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>.</p>`;

    const bodyHtml = isCreateNudge
      ? `<p>Hi ${firstName},</p>
         ${urgencyNote}
         <p>You have used your contributor code (<strong>${code}</strong>) to create one ground so far. You still have time to create another ground with it before it expires.</p>
         <p>Every ground you create is a record that belongs to the people involved - start another before the code runs out.</p>
         <p><a href="${this.frontendUrl}/grounds/new">Create another ground</a></p>`
      : `<p>Hi ${firstName},</p>
         ${urgencyNote}
         <p>Your contributor code <strong>${code}</strong> has been used on ${groundsCreated} ground${groundsCreated !== 1 ? 's' : ''} so far.</p>
         <p>Once it expires, the code can no longer be redeemed. Any grounds already created with it are unaffected - their records remain intact.</p>
         <p><a href="${this.frontendUrl}/billing">View your codes</a></p>`;

    await this.sendEmail({ to: email, subject, html: this.layout(bodyHtml) });
  }

  /** Care fee confirmation. Sent when an org activates a Groundwork subscription. */
  async sendCareFeeConfirmation(to: string, name: string, orgName: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Groundwork subscription is active',
      html: this.layout(
        `<p>Hi ${name},</p>
         <p>Your Groundwork subscription for <strong>${orgName}</strong> is now active.</p>
         <p>The first session on every ground is free. Each additional session is $5, charged per ground - not per participant. You are only billed when a ground moves past its first session.</p>
         <p>Your records are always yours, regardless of plan status.</p>`,
      ),
    });
  }
}
