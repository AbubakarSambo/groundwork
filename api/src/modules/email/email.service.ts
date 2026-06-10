import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Groundwork email library. Per the product rules, every message names
 * something specific and ends with a reason the record matters to THEM —
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

  private async sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
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
      subject: 'Verify your email — Groundwork',
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

  /** Participant added to a ground — they are NEVER added silently. */
  async sendParticipantInvite(email: string, founderName: string, groundLabel: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/invite?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: `${founderName} wants to hear your version`,
      html: this.layout(
        `<p>${founderName} has started a Groundwork session about a situation you are both navigating: <strong>${groundLabel}</strong>.</p>
         <p>Before any conversation happens, Groundwork asks for both sides. Your version. Their version. Separately. Privately. Your answers are yours.</p>
         <p><a href="${url}">Add your version</a></p>`,
      ),
    });
  }

  /** Report released — sent to BOTH parties at the same time. */
  async sendReportReady(email: string, groundLabel: string, reportUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your shared picture for "${groundLabel}" is ready`,
      html: this.layout(`<p>Both versions now exist. The report shows where you agree, where you differ, and the one question worth answering.</p><p><a href="${reportUrl}">View the report</a></p>`),
    });
  }

  /** Ground activated — sent to the participant so they know to return. */
  async sendGroundActivated(email: string, firstName: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your ground "${groundLabel}" is now active`,
      html: this.layout(
        `<p>Hi ${firstName},</p>
         <p>The ground <strong>${groundLabel}</strong> has been activated. Both records are in — the process continues from here.</p>
         <p>Sign in to view the shared picture and decide your next steps together.</p>
         <p><a href="${groundUrl}">Open ground</a></p>`,
      ),
    });
  }

  /** Nudge — names the specific commitment that is still open. */
  async sendNudge(email: string, specificThing: string, checkInUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'One question before your next check-in',
      html: this.layout(`<p>Last time you described <strong>${specificThing}</strong>.</p><p>Has anything changed?</p><p><a href="${checkInUrl}">Check in</a></p>`),
    });
  }

  /** Reminder to the admin that a generated report is waiting to be activated. */
  async sendActivationReminder(email: string, groundLabel: string, groundUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your report for "${groundLabel}" is ready to unlock`,
      html: this.layout(
        `<p>Both versions are in and the report for <strong>${groundLabel}</strong> is ready.</p>
         <p>Activate the ground to read the shared picture — where you agree, where you differ, and the one question worth answering.</p>
         <p><a href="${groundUrl}">Activate &amp; read</a></p>`,
      ),
    });
  }

  /** Ground stalled — timeline elapsed without resolution. Both parties notified. (GW-06) */
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
    await this.sendEmail({
      to: email,
      subject: 'A resolution has been proposed — your confirmation is needed',
      html: this.layout(
        `<p><strong>${proposerLabel}</strong> has proposed the following outcome: <em>${endState}</em>.</p>
         <p>The ground closes only when all active parties confirm the same outcome. Review the proposal and confirm — or counter-propose a different outcome.</p>
         <p><a href="${groundUrl}">View and confirm</a></p>`,
      ),
    });
  }

  /** Ground closed — all parties confirmed the same end state. (GW-50) */
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

  /** Post-resolution feedback request — sent ~24h after close. (GW-50) */
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
}
