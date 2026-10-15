import { Injectable, Logger } from '@nestjs/common';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ReportsForMyPeopleService } from './reports-for-my-people.service';
import { theEmailForOneManager, whichAreDueSoon } from './one-email-however-many-people';

/** How far ahead a review is worth telling somebody about. */
export const WORTH_TELLING_DAYS = 14;

/**
 * WHEN A REVIEW FALLS DUE, THE MANAGER GETS THE REPORT.
 *
 * The record this product already produces, arriving before the conversation
 * rather than after it. Nothing about the report changes — only when it lands
 * and how it is bundled.
 *
 * ONCE A DAY, AND ONCE PER REVIEW. The row is marked when the manager is told,
 * so nobody is told twice; a second reminder would be a second row, deliberately
 * created, rather than something this decides on its own.
 *
 * In a cron file rather than a service, which is the convention here for a
 * reason: a method whose only caller is a scheduler looks dead to the guard that
 * hunts methods nothing calls, and the answer to that is where it lives rather
 * than an exemption.
 */
@Injectable()
export class ReviewsComingUpCron {
  private readonly logger = new Logger(ReviewsComingUpCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly myPeople: ReportsForMyPeopleService,
    private readonly config: ConfigService,
  ) {}

  /* Early, before a working day starts, so it is read as part of the morning
     rather than arriving in the middle of something. */
  @Cron('0 7 * * *', { timeZone: 'UTC' })
  async tellManagersWhatIsComingUp() {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'tell-managers-what-is-coming-up', theDay(), () => this.tellManagersWhatIsComingUpHere());
  }

  private async tellManagersWhatIsComingUpHere() {
    const rows = await this.prisma.evaluationDue.findMany({
      where: { notifiedAt: null },
      select: {
        id: true,
        organizationId: true,
        personExternalId: true,
        dueOn: true,
        kind: true,
        notifiedAt: true,
      },
    });
    if (rows.length === 0) return { sent: 0 };

    const today = new Date();
    let sent = 0;

    /* Grouped by organisation first, because everything below is
       organisation-scoped and a manager's identifier means nothing without one. */
    const byOrg = new Map<string, typeof rows>();
    for (const row of rows) byOrg.set(row.organizationId, [...(byOrg.get(row.organizationId) ?? []), row]);

    for (const [organizationId, orgRows] of byOrg) {
      const people = await this.prisma.person.findMany({
        where: { organizationId, active: true },
        select: { externalId: true, displayName: true, email: true, managerExternalId: true },
      });
      const byExternalId = new Map(people.map((p) => [p.externalId, p]));

      /* One email per manager, so somebody managing nine people receives one
         message with nine links rather than nine messages. */
      const byManager = new Map<string, typeof orgRows>();
      for (const row of orgRows) {
        const manager = byExternalId.get(row.personExternalId)?.managerExternalId;
        if (!manager) continue;
        byManager.set(manager, [...(byManager.get(manager) ?? []), row]);
      }

      for (const [managerExternalId, theirs] of byManager) {
        const manager = byExternalId.get(managerExternalId);
        if (!manager?.email) continue;

        const due = whichAreDueSoon(
          theirs.map((r) => ({
            personExternalId: r.personExternalId,
            displayName: byExternalId.get(r.personExternalId)?.displayName ?? r.personExternalId,
            dueOn: r.dueOn,
            kind: r.kind,
            notifiedAt: r.notifiedAt,
          })),
          today,
          WORTH_TELLING_DAYS,
        );
        if (due.length === 0) continue;

        /* The same access rule the manager would hit reading it themselves. A
           second decision about what a manager may see is a second decision that
           can disagree with the first. */
        const readable = await this.myPeople.forTheirPeople(organizationId, managerExternalId);

        const frontend = this.config.get<string>('resend.frontendUrl');
        const built = theEmailForOneManager({
          managerName: (manager.displayName ?? '').split(' ')[0] || 'Hello',
          due,
          readable: readable.readable.map((r) => ({ groundId: r.groundId, label: r.label, about: r.about })),
          linkTo: (groundId) => `${frontend}/grounds/${groundId}/report`,
        });
        if (!built) continue;

        try {
          await this.email.sendRoundDigest(manager.email, built.subject, built.text);
        } catch (error) {
          /* Not marked told, so it is tried again tomorrow. A review nobody was
             told about is worse than one they hear about a day late. */
          this.logger.warn(`Could not tell ${managerExternalId}: ${(error as Error).message}`);
          continue;
        }

        await this.prisma.evaluationDue.updateMany({
          where: {
            organizationId,
            personExternalId: { in: built.covers },
            notifiedAt: null,
          },
          data: { notifiedAt: new Date() },
        });
        sent += 1;
      }
    }

    if (sent) this.logger.log(`Told ${sent} ${sent === 1 ? 'manager' : 'managers'} about reviews coming up.`);
    return { sent };
  }

}
