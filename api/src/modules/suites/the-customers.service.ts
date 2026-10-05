import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';
import { inTheLeadsTeam } from './a-leads-team';

/** The words the server says when it refuses, in plain full sentences. */
export const CUSTOMERS_REFUSED = {
  notOn: thisSuiteIsOff('The customers and deals suite'),
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
};

export interface Reader { userId: string; organizationId: string }

export interface CustomerList {
  customers: {
    id: string;
    name: string;
    /** Where it stands: the engine's few words once written, else the word the organisation's own system gives. */
    standing: string | null;
    owner: string | null;
    /** The day of the last contact anybody recorded with them, from their systems or a check-in. */
    lastContact: string | null;
  }[];
}

type Dir = { externalId: string; linkedUserId: string | null; displayName: string | null; givenName: string | null; familyName: string | null; department: string | null; managerExternalId: string | null };

/**
 * CUSTOMERS AND DEALS (E9, #/suite/customers, U.17). Who reads what is decided here, never on the screen:
 *   - nobody, while the suite is off; a member and a guest are refused;
 *   - an admin reads every customer;
 *   - a lead reads the customers owned by the people in their own team, and their own.
 *
 * IT IS BUILT FROM WHAT THE PRODUCT ALREADY KNOWS AND CHANGES NONE OF IT:
 *   - each customer is a `Subject` of type COUNTERPARTY, a name and an id from the organisation's own
 *     system, with its owner and its own word for where it stands; the product's rule is that it is
 *     not a CRM record, so nothing about it is edited or added here;
 *   - "Last contact" is the latest `Interaction` with it that nobody has disputed: from the
 *     organisation's own systems, or a visit or call somebody told a check-in about. Only the day is
 *     read, never the note, so nothing anybody said travels through this board.
 * Groundwork's own back office has a sales pipeline (`OpsCommercialOpportunity`), but it is Groundwork's
 * own sales, with no organisation on a row, so it is not reused.
 *
 * "Kept up to date by the sales check-ins" is the engine's (request 28): it writes where a customer
 * stands in `CustomerStanding`, and the latest is shown. Nothing about how anybody works, no rating and
 * no label is read or served, and nothing here reaches a check-in or its report.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async board(reader: Reader): Promise<CustomerList> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'customers' } },
      select: { isOn: true },
    });
    if (!suite?.isOn) throw new NotFoundException(CUSTOMERS_REFUSED.notOn);
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    const role = m?.role ?? null;
    if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException(CUSTOMERS_REFUSED.onlyAdminsAndLeads);
    const org = reader.organizationId;

    const people = await this.prisma.person.findMany({
      where: { organizationId: org, active: true },
      select: { externalId: true, linkedUserId: true, displayName: true, givenName: true, familyName: true, department: true, managerExternalId: true },
    }) as Dir[];
    const byExt = new Map(people.map((p) => [p.externalId, p]));
    const me = people.find((p) => p.linkedUserId === reader.userId) ?? null;
    const inScope = (ownerExt: string | null) => {
      if (role === 'ADMIN') return true;
      if (!ownerExt || !me) return false;
      const owner = byExt.get(ownerExt);
      return !!owner && (owner.externalId === me.externalId || inTheLeadsTeam(me, owner));
    };

    const subjects = await this.prisma.subject.findMany({
      where: { organizationId: org, type: 'COUNTERPARTY' as any, sourceDeletedAt: null },
      select: { id: true, externalId: true, title: true, status: true, ownerExternalId: true },
      orderBy: { title: 'asc' },
    });
    const mine = subjects.filter((s) => s.title?.trim() && inScope(s.ownerExternalId));
    if (!mine.length) return { customers: [] };
    const ids = [...new Set(mine.map((s) => s.externalId))];

    const [standings, contacts] = await Promise.all([
      this.prisma.customerStanding.findMany({
        where: { organizationId: org, counterpartyExternalId: { in: ids } },
        select: { counterpartyExternalId: true, says: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.interaction.findMany({
        where: { organizationId: org, counterpartyExternalId: { in: ids }, disputedAt: null },
        select: { counterpartyExternalId: true, happenedAt: true },
        orderBy: { happenedAt: 'desc' },
      }),
    ]);
    /* The latest for each customer, whatever order the rows came in. */
    const standingOf = new Map<string, string>();
    const standingAt = new Map<string, number>();
    for (const s of standings) {
      if (!s.says.trim()) continue;
      const t = new Date(s.createdAt).getTime();
      if (!standingAt.has(s.counterpartyExternalId) || t > standingAt.get(s.counterpartyExternalId)!) {
        standingAt.set(s.counterpartyExternalId, t);
        standingOf.set(s.counterpartyExternalId, s.says.trim());
      }
    }
    const lastOf = new Map<string, Date>();
    for (const c of contacts) {
      const k = c.counterpartyExternalId as string;
      if (!lastOf.has(k) || lastOf.get(k)! < c.happenedAt) lastOf.set(k, c.happenedAt);
    }

    return {
      customers: mine.map((s) => ({
        id: s.id,
        name: s.title.trim(),
        standing: standingOf.get(s.externalId) ?? (s.status?.trim() || null),
        owner: s.ownerExternalId && byExt.has(s.ownerExternalId) ? this.nameOf(byExt.get(s.ownerExternalId)!) || null : null,
        lastContact: lastOf.has(s.externalId) ? lastOf.get(s.externalId)!.toISOString().slice(0, 10) : null,
      })),
    };
  }

  private nameOf(p: Dir): string {
    return p.displayName?.trim() || [p.givenName, p.familyName].filter(Boolean).join(' ').trim();
  }
}
