import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { failedThisWeekIn } from './whatsapp-as-the-admin-reads-it';
import { ASKING } from './a-whatsapp-message-is-routed';
import { theNextMonthStarts } from '../billing/whatsapp-add-on.service';

/**
 * CONNECTIONS, AT A GLANCE (F1, U.18, #/settings/connections).
 *
 * The admin's Connections page shows three counts beside the organisation's own WhatsApp number,
 * and whether numbers from its own product have arrived. Everything else on that page is read from
 * the endpoints that already manage each connection.
 *
 * Counts only. No phone number, no name, nothing anybody said, and nothing about any one person:
 *   - people checking in on WhatsApp: each number whose WhatsApp conversation with this organisation
 *     is in a check-in now. A conversation in Ask Groundwork mode keeps "ask:" where the check-in
 *     would be (a-whatsapp-message-is-routed.ts), so it is not a check-in and is not counted;
 *   - check-ins this month: each check-in a message really went for by WhatsApp, in this calendar
 *     month in UTC, the same month the plan's monthly limit counts (`monthOf`, whatsapp_monthly_use).
 *     A message held because WhatsApp is off or the month's messages are used was never sent, and
 *     the free message telling a person it was held is not counted towards the month either;
 *   - failed messages this week: the same count the WhatsApp section serves (`failedThisWeekIn`),
 *     so a message held by the add-on or the limit is not a failure here either.
 *
 * Admins only, like every other part of Connections (the RolesGuard reads @Roles on the class).
 */
export interface ConnectionsAtAGlance {
  whatsapp: { people: number; checkInsThisMonth: number; failedThisWeek: number } | null;
  figures: { fromYourProduct: boolean };
}

@Injectable()
export class ConnectionsAtAGlanceService {
  constructor(private readonly prisma: PrismaService) {}

  async read(organizationId: string, now: Date = new Date()): Promise<ConnectionsAtAGlance> {
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId }, select: { id: true } });
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [threads, sentFor, failedThisWeek, metric] = await Promise.all([
      own
        ? this.prisma.whatsAppThread.findMany({
            where: { organizationId, checkInId: { not: null }, NOT: { checkInId: { startsWith: ASKING } } },
            select: { phone: true },
          })
        : Promise.resolve([] as { phone: string }[]),
      own
        ? this.prisma.whatsAppSend.findMany({
            where: {
              organizationId,
              checkInId: { not: null },
              sentAt: { gte: startOfMonth, lt: theNextMonthStarts(now) },
              AND: [{ NOT: { checkInId: { startsWith: ASKING } } }, { OR: [{ kind: null }, { NOT: { kind: 'held-told' } }] }],
            },
            select: { checkInId: true },
            distinct: ['checkInId'],
          })
        : Promise.resolve([] as { checkInId: string | null }[]),
      own ? failedThisWeekIn(this.prisma, organizationId, now) : Promise.resolve(0),
      this.prisma.productMetric.findFirst({ where: { organizationId }, select: { id: true } }),
    ]);
    /* One person, however their number was written down. */
    const people = new Set(threads.map((t) => t.phone.replace(/\D/g, ''))).size;
    return {
      whatsapp: own ? { people, checkInsThisMonth: sentFor.length, failedThisWeek } : null,
      figures: { fromYourProduct: !!metric },
    };
  }
}
