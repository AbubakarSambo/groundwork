import { AsyncLocalStorage } from 'async_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../modules/prisma/prisma.service';
import { thePhonesOwnZone } from '../modules/whatsapp/the-persons-own-time-zone';

/**
 * THE DAY A SENTENCE SAYS IS THE ORGANISATION'S OWN DAY (B-094, 9 October 2026).
 *
 * Halima checked in at 1:53 on Friday 9 October in Nairobi, and the board said "raised on 8 October" and her header "Session 2 opens on 15 October",
 * because every sentence the engine writes about a day was worked out in one fixed zone (West Africa) while the screens beside them wrote
 * "Session 1, 9 Oct" in hers. The day is now the organisation's own: its time zone where an admin has named one, else the zone most of its people's
 * WhatsApp numbers belong to, else the zone the product has always used.
 *
 * It is set once around each signed-in request (`TheOrganisationsOwnDay`), so the many places that write a day in a sentence need no new argument.
 * Outside a request (a timer, a test) it is the product's own zone, as before.
 */
export const THE_PRODUCTS_OWN_ZONE = 'Africa/Lagos';

const zoneOfTheRequest = new AsyncLocalStorage<string>();

export function isAZone(z: unknown): z is string {
  if (typeof z !== 'string' || !z.trim()) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: z }); return true; } catch { return false; }
}

/** The zone every day in a sentence is counted in, right now. */
export function theDayZone(): string {
  return zoneOfTheRequest.getStore() ?? THE_PRODUCTS_OWN_ZONE;
}

/** Runs `work` with the organisation's day in force. */
export function inTheOrganisationsDay<T>(zone: string | null | undefined, work: () => T): T {
  return isAZone(zone) ? zoneOfTheRequest.run(zone, work) : work();
}

type Reader = {
  organization: { findUnique: (a: any) => Promise<any> };
  user?: { findMany: (a: any) => Promise<any[]> };
  person?: { findMany: (a: any) => Promise<any[]> };
};

const remembered = new Map<string, { zone: string; until: number }>();
const FOR_TEN_MINUTES = 10 * 60 * 1000;

/** Its named zone; else the zone most of its people's numbers belong to; else null (the product's own). */
export async function theOrganisationsZone(prisma: Reader, organizationId: string, now = Date.now()): Promise<string | null> {
  const kept = remembered.get(organizationId);
  if (kept && kept.until > now) return kept.zone;
  let zone: string | null = null;
  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timeZone: true } });
    if (isAZone(org?.timeZone)) zone = org.timeZone;
    else if (prisma.user) {
      const people = await prisma.user.findMany({ where: { organizationId, phoneNumber: { not: null } }, select: { phoneNumber: true }, take: 200 });
      /* And the numbers on the organisation's roster (reviewer, 14 October): a company that added its people's numbers on
         People, with none yet on a sign-in, is still where those numbers are. */
      const roster: any[] = prisma.person?.findMany
        ? await prisma.person.findMany({ where: { organizationId, phone: { not: null } }, select: { phone: true }, take: 200 }).catch(() => [])
        : [];
      const tally = new Map<string, number>();
      for (const n of [...people.map((p: any) => p.phoneNumber), ...roster.map((p: any) => p.phone)]) {
        /* A number from nowhere we know is not a vote for anything. */
        const z = thePhonesOwnZone(n);
        if (z) tally.set(z, (tally.get(z) ?? 0) + 1);
      }
      zone = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    }
  } catch {
    zone = null;
  }
  const out = zone ?? THE_PRODUCTS_OWN_ZONE;
  /*
   * ONLY A ZONE THAT WAS FOUND IS REMEMBERED (reviewer, 14 October; D4). The product's own zone, used because nothing was
   * known yet, was kept for ten minutes: a team whose numbers went in a minute later had David's and Kevin's second
   * sessions open at 8 in Lagos (10am in Nairobi) and Mercy's, a minute after it lapsed, at 8 in Nairobi.
   */
  if (zone) remembered.set(organizationId, { zone: out, until: now + FOR_TEN_MINUTES });
  return out;
}

/** Forget what was kept for an organisation, when an admin changes its zone. */
export function forgetTheOrganisationsZone(organizationId: string): void {
  remembered.delete(organizationId);
}

@Injectable()
export class TheOrganisationsOwnDay implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest?.();
    const organizationId: string | undefined = req?.user?.organizationId;
    if (!organizationId) return next.handle();
    return new Observable((subscriber) => {
      theOrganisationsZone(this.prisma as any, organizationId)
        .then((zone) => inTheOrganisationsDay(zone, () => next.handle().subscribe(subscriber)))
        .catch(() => next.handle().subscribe(subscriber));
    });
  }
}
