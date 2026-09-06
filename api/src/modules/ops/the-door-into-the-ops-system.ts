import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { seedTheFoundations } from './seed-the-foundations';

/**
 * THE OPS SYSTEM HAD NO DOOR.
 *
 * Every route under `/ops` needs an OpsPerson behind the signed-in account, and
 * `/ops/people` — the only place a person can be created or linked — needs
 * `people:admin`, which needs an OpsPerson. So the first person could never get
 * in, and the whole back office answered "This is not your system" to the person
 * who owns it. `linkAccount` existed on the service and had no route at all.
 *
 * Reported plainly: "I clicked platform ops but I can't get to my own view. I
 * can't see targets, crm, requests, moat."
 *
 * The door cannot be inside the room. It is here, on the platform-admin surface,
 * which is guarded by `PlatformAdminGuard` — a list only the existing platform
 * admins can add to, and only with an emailed one-time code. That is a stronger
 * gate than the one it opens, which is the right way round.
 *
 * It does two things and no more: put the standing furniture in place if it is
 * missing, and connect a Groundwork account to a person on the team. Everything
 * after that happens inside the ops system under its own capabilities.
 */
@Injectable()
export class OpsDoorService {
  private readonly logger = new Logger(OpsDoorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Whether the ops system exists yet, and who can currently open it. */
  async howThingsStand() {
    const people = await this.prisma.opsPerson.findMany({
      orderBy: { displayName: 'asc' },
      select: { key: true, displayName: true, functionalRole: true, active: true, userId: true },
    });

    const linkedUserIds = people.map((p) => p.userId).filter((id): id is string => id !== null);
    const accounts = linkedUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: linkedUserIds } },
          select: { id: true, email: true },
        })
      : [];
    const emailById = new Map(accounts.map((a) => [a.id, a.email]));

    return {
      /* The seed writes the periods, the workstreams and the six people. With no
         people there is nothing to link an account to, so this is the question
         the page has to answer first. */
      isSetUp: people.length > 0,
      people: people.map((p) => ({
        key: p.key,
        displayName: p.displayName,
        functionalRole: p.functionalRole,
        active: p.active,
        /* The address, not the id. A page that lists user ids is a page nobody
           can check their own work against. */
        linkedAccount: p.userId ? (emailById.get(p.userId) ?? 'an account that no longer exists') : null,
      })),
      /** Nobody can reach the ops system at all — the state this door exists for. */
      nobodyCanOpenIt: people.filter((p) => p.active && p.userId !== null).length === 0,
    };
  }

  /**
   * Put the standing furniture in place: the periods, the workstreams, the team.
   *
   * Safe to run twice. Every write in the seed is an upsert or skips duplicates,
   * and since a target list is something a person sets, the seed no longer re-dates
   * one that already exists.
   */
  async setUp() {
    await seedTheFoundations(this.prisma as never);
    this.logger.warn('Ops foundations seeded from the platform-admin console.');
    return this.howThingsStand();
  }

  /**
   * Connect a Groundwork account to somebody on the team.
   *
   * Matched on the address, lowercased, because that is how addresses are stored
   * and how a person types their own.
   */
  async link(personKey: string, email: string) {
    const address = email?.trim().toLowerCase();
    if (!address) throw new BadRequestException('An email address is needed to link an account.');

    const user = await this.prisma.user.findUnique({ where: { email: address } });
    if (!user) {
      throw new NotFoundException(
        `No Groundwork account uses ${address}. They have to sign up and verify the address first — this connects an account, it does not create one.`,
      );
    }

    const person = await this.prisma.opsPerson.findUnique({ where: { key: personKey } });
    if (!person) throw new NotFoundException(`No one on the team has the key ${personKey}`);

    /*
     * One account, one person. The link is unique on userId, so connecting an
     * address already used by somebody else would fail on the index with a
     * message about a constraint. Said properly instead.
     */
    const alreadyUsed = await this.prisma.opsPerson.findUnique({ where: { userId: user.id } });
    if (alreadyUsed && alreadyUsed.key !== personKey) {
      throw new BadRequestException(
        `${address} is already ${alreadyUsed.displayName}'s account. Unlink it from them first.`,
      );
    }

    await this.prisma.opsPerson.update({ where: { id: person.id }, data: { userId: user.id } });
    this.logger.warn(`Ops: ${address} now opens the back office as ${person.displayName}.`);
    return this.howThingsStand();
  }

  /** Disconnect an account. The person stays; only the way in is removed. */
  async unlink(personKey: string) {
    const person = await this.prisma.opsPerson.findUnique({ where: { key: personKey } });
    if (!person) throw new NotFoundException(`No one on the team has the key ${personKey}`);
    await this.prisma.opsPerson.update({ where: { id: person.id }, data: { userId: null } });
    return this.howThingsStand();
  }
}
