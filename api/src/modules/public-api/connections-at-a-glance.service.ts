import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CONNECTIONS, AT A GLANCE (F1, U.18, #/settings/connections).
 *
 * The admin's Connections page shows three counts beside the organisation's own WhatsApp number,
 * and whether numbers from its own product have arrived. Everything else on that page is read from
 * the endpoints that already manage each connection.
 *
 * Counts only. No phone number, no name, nothing anybody said, and nothing about any one person:
 *   - people checking in on WhatsApp: each number that has been put through to a check-in on this
 *     organisation's WhatsApp;
 *   - check-ins this month: each check-in a message was sent for on this organisation's own number,
 *     since the first of the month;
 *   - failed messages this week: messages on this organisation's own number that did not go, in the
 *     last seven days.
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [people, sentFor, failedThisWeek, metric] = await Promise.all([
      own ? this.prisma.whatsAppThread.count({ where: { organizationId, checkInId: { not: null } } }) : Promise.resolve(0),
      own
        ? this.prisma.whatsAppSend.findMany({
            where: { organizationId, checkInId: { not: null }, createdAt: { gte: startOfMonth } },
            select: { checkInId: true },
            distinct: ['checkInId'],
          })
        : Promise.resolve([] as { checkInId: string | null }[]),
      own ? this.prisma.whatsAppSend.count({ where: { organizationId, failedAt: { gte: aWeekAgo } } }) : Promise.resolve(0),
      this.prisma.productMetric.findFirst({ where: { organizationId }, select: { id: true } }),
    ]);
    return {
      whatsapp: own ? { people, checkInsThisMonth: sentFor.length, failedThisWeek } : null,
      figures: { fromYourProduct: !!metric },
    };
  }
}
