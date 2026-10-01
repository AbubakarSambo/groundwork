import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { theDayIn } from './when-a-handoff-is-due';
import { checkInLinks, type CheckInLinks, type OpenableCheckIn } from './check-in-links';

/**
 * THE ONE READ OF LINKS BETWEEN CHECK-INS (D3, U.16). See check-in-links.ts for what each reader gets.
 *
 * WHICH CHECK-INS YOU MAY OPEN comes from `GroundsService.list()`, the one rule for who reads which
 * check-in as a query, asked for the signed-in reader. A check-in not on that list is answered with
 * NotFound, the same as everywhere else, so a stranger cannot tell a real id from a guess; and a link
 * to or from a check-in not on it gives the reader nothing of that check-in.
 */
@Injectable()
export class CheckInLinksService {
  constructor(private prisma: PrismaService, private grounds: GroundsService) {}

  async forReader(
    groundId: string,
    reader: { userId: string; email: string; organizationId: string; role: string },
  ): Promise<CheckInLinks> {
    const list = ((await this.grounds.list(reader.organizationId, reader.userId, reader.email, reader.role)) ?? []) as any[];
    const mayOpen = new Map<string, OpenableCheckIn>(
      list
        .filter((g) => g.organizationId === reader.organizationId)
        .map((g) => [g.id, { id: g.id, label: g.label ?? null, initiatorId: g.initiatorId ?? null, scenario: g.scenario, peersVisibleToEachOther: g.peersVisibleToEachOther ?? null, participants: g.participants ?? null }]),
    );
    const here = mayOpen.get(groundId);
    if (!here) throw new NotFoundException('Check-in not found');

    const rows = await this.prisma.groundDependency.findMany({
      where: {
        status: { in: ['WAITING', 'BLOCKING'] as any },
        clearedAt: null,
        OR: [
          { groundId, waitingOnGroundId: { not: null } },
          { waitingOnGroundId: groundId },
        ],
      },
      select: {
        id: true, groundId: true, waitingOnGroundId: true, fromParticipantId: true, onParticipantId: true,
        onLabel: true, what: true, status: true, namedTheThing: true, createdAt: true, dueSaid: true, dueOn: true, blockerKind: true,
        fromParticipant: { select: { userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
        onParticipant: { select: { userId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return checkInLinks(here, rows as any, mayOpen, { userId: reader.userId, role: reader.role }, theDayIn('Africa/Lagos', new Date()));
  }
}
