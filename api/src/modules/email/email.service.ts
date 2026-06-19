import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

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

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('resend.apiKey'));
    this.fromEmail = this.configService.get<string>('resend.fromEmail') || 'Groundwork <noreply@myground.work>';
    this.frontendUrl = this.configService.get<string>('resend.frontendUrl') || 'http://localhost:5173';
  }

  buildInviteUrl(inviteToken: string): string {
    return `${this.frontendUrl}/invite?token=${inviteToken}`;
  }

  private async sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
    const apiKey = this.configService.get<string>('resend.apiKey') ?? '';
    if (!apiKey || apiKey.startsWith('re_...') || apiKey === 're_test') {
      this.logger.warn(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      const text = options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.logger.warn(`[DEV EMAIL] Body: ${text}`);
      return;
    }
    const { data, error } = await this.resend.emails.send({ from: this.fromEmail, ...options });
    if (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.name} - ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
    this.logger.log(`Email sent to ${options.to} (id: ${data?.id})`);
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
      html: this.layout(`<p>Hi ${firstName},</p><p>Activate your account and set a password.</p><p><a href="${url}">Activate</a></p>`),
    });
  }

  async sendAddPasswordEmail(email: string, firstName: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/set-password?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Set a password for Groundwork',
      html: this.layout(`<p>Hi ${firstName},</p><p>Set a password to sign in without Google.</p><p><a href="${url}">Set password</a></p>`),
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Reset your Groundwork password',
      html: this.layout(`<p>Hi ${firstName},</p><p>Reset your password (link expires in 1 hour).</p><p><a href="${url}">Reset password</a></p>`),
    });
  }

  // --- Team invites ---

  async sendUserInvite(email: string, firstName: string, token: string, orgName: string): Promise<void> {
    const url = `${this.frontendUrl}/set-password?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: `You've been added to ${orgName} on Groundwork`,
      html: this.layout(`<p>Hi ${firstName},</p><p>${orgName} added you to their Groundwork workspace. Set your password to continue.</p><p><a href="${url}">Accept invite</a></p>`),
    });
  }

  // --- Ground / conversation lifecycle (see comms library, Part 3) ---

  /** Participant added to a ground. They are NEVER added silently. */
  async sendParticipantInvite(email: string, founderName: string, groundLabel: string, token: string, note?: string): Promise<void> {
    const url = `${this.frontendUrl}/invite?token=${token}`;
    const noteHtml = note ? `<p style="border-left:3px solid #E2E0DB;padding:8px 14px;margin:20px 0;color:#4A4540;font-style:italic;">${note}</p>` : '';
    await this.sendEmail({
      to: email,
      subject: `${founderName} wants to build this with you`,
      html: this.layout(
        `<p>Strong working relationships are built on alignment that both people helped shape. Not assumed. Not hoped for. Actually built.</p>
         <p>${founderName} has opened a shared record with you on Groundwork. They have shared their account of <strong>${groundLabel}</strong>. Now they need yours.</p>
         <p>Here is how it works: you each give your honest view of the situation, separately. Neither of you sees what the other wrote until both accounts are in. Groundwork then cross-references them, showing where you are already aligned, where your pictures differ, and what to address before it becomes drift.</p>
         <p>It takes about ten minutes.</p>
         ${noteHtml}
         <p><a href="${url}">Add your account</a></p>`,
      ),
    });
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
      subject: `Your ground "${groundLabel}" is now active`,
      html: this.layout(
        `<p>Hi ${firstName},</p>
         <p>The ground <strong>${groundLabel}</strong> has been activated. Both records are in. The process continues from here.</p>
         <p>Sign in to view the shared picture and decide your next steps together.</p>
         <p><a href="${groundUrl}">Open ground</a></p>`,
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

  /** Reminder to the admin that a generated report is waiting to be activated. */
  async sendActivationReminder(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your report for "${groundLabel}" is ready to unlock`,
      html: this.layout(
        `<p>Both versions are in and the report for <strong>${groundLabel}</strong> is ready.</p>
         <p>Activate the ground to read the shared picture: where you agree, where you differ, and the one question worth answering.</p>
         <p><a href="${groundUrl}">Activate and read</a></p>`,
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
    const endStateLabels: Record<string, string> = {
      KEEP: 'Keep the hire',
      RESTRUCTURE: 'Restructure the role',
      EXIT: 'Part ways',
      NOT_YET: 'Not yet. Extend evaluation',
      EXTEND: 'Extend evaluation period',
      SEPARATE: 'Separate amicably',
    };
    const endStateLabel = endStateLabels[endState] ?? endState;
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
    await this.sendEmail({
      to: email,
      subject: `"${groundLabel}" is now closed`,
      html: this.layout(
        `<p>All parties have confirmed. <strong>${groundLabel}</strong> has been closed with the agreed outcome: <em>${endState}</em>.</p>
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
   * Payment request. Sent to the org admin when a participant completes
   * session 2. Primes the admin to activate billing so session 3 is not blocked.
   */
  async sendPaymentRequestEmail(adminEmail: string, orgName: string, groundId: string): Promise<void> {
    const billingUrl = `${this.frontendUrl}/billing?groundId=${groundId}`;
    await this.sendEmail({
      to: adminEmail,
      subject: 'Add a card to unlock session 3 on Groundwork',
      html: this.layout(
        `<p>A participant in your workspace (<strong>${orgName}</strong>) has completed their second Groundwork session.</p>
         <p>Sessions 1 and 2 are free. Session 3 requires an active subscription. Add a card now to keep the process running. The record you have already built is safe and waiting.</p>
         <p><a href="${billingUrl}">Add a card</a></p>`,
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

  /** Care fee confirmation. Sent when an org activates a Groundwork subscription. */
  async sendCareFeeConfirmation(to: string, name: string, orgName: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Groundwork subscription is active',
      html: this.layout(
        `<p>Hi ${name},</p>
         <p>Your Groundwork subscription for <strong>${orgName}</strong> is now active.</p>
         <p>You pay $25/month for your account, plus $25/month per active participant (each person checking in on a live ground). Someone not in any active ground is not billed. The first two sessions per person are always free.</p>
         <p>Your records are always yours, regardless of plan status.</p>`,
      ),
    });
  }
}
