import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../email/email.service';
import { anAppealNeedsASecondAdmin, anAppealWaitsForAnAdmin, anAppealWasDecidedSaid } from '../whatsapp/what-goes-to-a-phone';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import {
  anAppealWaitsForYou, pleaseAddASecondAdmin, theAppealWasDecided, type TheMessage,
} from './a-review-appeal';

const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * AN APPEAL OF A REVIEW, TOLD (decision 113). By email always, and on WhatsApp where it is on and the
 * person has a number; the WhatsApp sender keeps its own rules (STOP, "not now", the add-on, the 24 hours
 * and the approved template). Never a word of the review or of the person's reasons, in either: they are
 * read in the app. Never throws into the appeal it follows: a message that could not go is logged, and the
 * appeal stands.
 */
@Injectable()
export class AReviewAppealToldService {
  private readonly logger = new Logger(AReviewAppealToldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reach: ARequestToldOnWhatsApp,
    @Optional() private readonly whatsapp?: WhatsAppService,
    @Optional() private readonly mailer?: EmailService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  /** An admin who may decide it: it waits for them. */
  async toAnAdmin(organizationId: string, reviewId: string, adminUserId: string, personFirstName: string, reviewerFirstName: string | null): Promise<void> {
    const to = await this.reach.reach(organizationId, adminUserId);
    const m = anAppealWaitsForYou(to.firstName, personFirstName, reviewerFirstName);
    await this.send(organizationId, reviewId, adminUserId, m, to, anAppealWaitsForAnAdmin(to.firstName, personFirstName));
  }

  /** The reviewer: nobody else can decide it, so they are asked to add a second admin. */
  async toTheReviewerToAddAnAdmin(organizationId: string, reviewId: string, reviewerUserId: string, personFirstName: string, reviewerIsAnAdmin: boolean): Promise<void> {
    const to = await this.reach.reach(organizationId, reviewerUserId);
    const m = pleaseAddASecondAdmin(to.firstName, personFirstName, reviewerIsAnAdmin);
    await this.send(organizationId, reviewId, reviewerUserId, m, to, anAppealNeedsASecondAdmin(to.firstName, personFirstName));
  }

  /** The appeal was decided: the person and the reviewer are told, and only that it is decided. */
  async decided(organizationId: string, reviewId: string, adminUserId: string, personUserId: string | null, personFirstName: string, reviewerUserId: string | null): Promise<void> {
    const admin = await this.reach.firstNameOf(adminUserId);
    for (const [userId, forThePerson] of [[personUserId, true], [reviewerUserId, false]] as const) {
      if (!userId || userId === adminUserId) continue;
      const to = await this.reach.reach(organizationId, userId);
      await this.send(organizationId, reviewId, userId, theAppealWasDecided(to.firstName, admin, forThePerson, personFirstName), to, anAppealWasDecidedSaid(to.firstName, admin));
    }
  }

  private async send(
    organizationId: string, reviewId: string, userId: string, m: TheMessage,
    to: { phone: string | null; firstName: string | null }, onWhatsApp: { text: string; kind: string; params: string[] },
  ): Promise<void> {
    let how: string | null = null;
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, deletedAt: true } });
      if (!user || user.deletedAt) return;
      if (this.mailer && user.email) {
        const base = (this.config?.get<string>('resend.frontendUrl') || '').replace(/\/$/, '');
        const r = await this.mailer.sendTeamAlert(user.email, m.subject, m.lines.map(escape), m.linkLabel, `${base}/suite/reviews`);
        if (r?.sent) how = 'email';
      }
    } catch (err: any) {
      this.logger.warn(`Could not email somebody about a review appeal: ${err?.message}`);
    }
    try {
      if (this.whatsapp && to.phone) {
        const r = await this.whatsapp.sendFor(organizationId, to.phone, onWhatsApp.text, { kind: onWhatsApp.kind, params: onWhatsApp.params });
        if (r?.sent) how = how ? `${how} and whatsapp` : 'whatsapp';
      }
    } catch (err: any) {
      this.logger.warn(`Could not tell somebody on WhatsApp about a review appeal: ${err?.message}`);
    }
    /* Not recorded as "told": a review's history is read by everyone who reads the review, and only three people may read that there was an appeal. */
    if (!how) this.logger.warn(`Nobody could be told about the appeal of review ${reviewId}; it stands, and waits in the app.`);
  }
}
