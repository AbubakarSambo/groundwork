import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  whatAManagerMayRead,
  sayWhatIsWithheld,
  type AGroundWithAReport,
} from './whose-reports-a-manager-may-read';

/**
 * WHAT A MANAGER CAN SEE ABOUT THEIR OWN PEOPLE.
 *
 * Reporting lines have been stored since the roster was built and used only by
 * the detectors. This is the first thing that reads them for the purpose they
 * exist for.
 *
 * IT RETURNS LINKS, NOT REPORTS. A manager opens each one the way its
 * participants do, through the route that already decides what a report shows.
 * Assembling the content here would be a second place a report is rendered, and
 * the second place is where the redaction is eventually forgotten.
 */
@Injectable()
export class ReportsForMyPeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async forTheirPeople(organizationId: string, managerExternalId: string) {
    const mine = await this.prisma.person.findMany({
      where: { organizationId, managerExternalId, active: true },
      select: { externalId: true, displayName: true, email: true },
    });
    if (mine.length === 0) {
      return { people: [], readable: [], withheld: [], says: 'Nobody reports to you on the roster.' };
    }

    /*
     * Grounds anybody of theirs took part in. Matched on the participant's
     * address, which is the identifier a GroundParticipant and a Person share —
     * the same bridge the check-in routes use, for the same reason.
     */
    const addresses = mine.map((p) => p.email).filter((e): e is string => !!e);
    const grounds = await this.prisma.ground.findMany({
      where: { organizationId, participants: { some: { email: { in: addresses } } } },
      select: {
        id: true,
        label: true,
        report: { select: { releasedAt: true } },
        participants: { select: { email: true, partyType: true } },
      },
    });

    /* Everybody on the roster, so a participant who reports elsewhere can be
       recognised as such rather than treated as unknown. */
    const roster = await this.prisma.person.findMany({
      where: { organizationId },
      select: { externalId: true, email: true, managerExternalId: true },
    });
    const byEmail = new Map(roster.filter((r) => r.email).map((r) => [r.email as string, r]));

    const shaped: AGroundWithAReport[] = grounds.map((g) => ({
      groundId: g.id,
      label: g.label,
      releasedAt: g.report?.releasedAt ?? null,
      participants: g.participants.map((p) => {
        const person = byEmail.get(p.email);
        return {
          personExternalId: person?.externalId ?? null,
          managerExternalId: person?.managerExternalId ?? null,
          isLead: p.partyType === 'INITIATOR',
        };
      }),
    }));

    const decided = whatAManagerMayRead(shaped, managerExternalId);
    const nameOf = new Map(mine.map((p) => [p.externalId, p.displayName ?? p.externalId]));

    return {
      people: mine.map((p) => ({ externalId: p.externalId, displayName: p.displayName })),
      readable: decided.readable.map((r) => ({
        groundId: r.groundId,
        label: r.label,
        releasedAt: r.releasedAt,
        about: r.about.map((id) => nameOf.get(id) ?? id),
      })),
      /* Said, not hidden: a manager shown a short list concludes their people are
         quiet, and that is the wrong conclusion to hand somebody. */
      withheld: sayWhatIsWithheld(decided.withheld),
      says:
        decided.readable.length === 0
          ? 'No released report is about your people yet.'
          : `${decided.readable.length} released ${decided.readable.length === 1 ? 'report is' : 'reports are'} about your people.`,
    };
  }

  /** The manager's own person row, for a caller that only has an account. */
  async whoTheyAre(organizationId: string, personId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true },
    });
    if (!person) throw new NotFoundException('I cannot see that person in your organisation.');
    return person.externalId;
  }
}
