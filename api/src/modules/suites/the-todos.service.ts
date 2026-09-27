import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { groundsAViewerMayList } from '../grounds/who-may-read-this-check-in';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { inTheLeadsTeam } from './a-leads-team';

/** The words the server says when it refuses, in plain full sentences. */
export const TODOS_REFUSED = {
  notOn: 'The to-dos suite is not switched on.',
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
};

export interface Reader { userId: string; organizationId: string }

export interface TodoList {
  people: {
    name: string;
    todos: { id: string; text: string; source: 'check-in'; on: string }[];
  }[];
}

type Dir = { externalId: string; linkedUserId: string | null; department: string | null; managerExternalId: string | null };

/**
 * TO-DOS (E8, #/suite/todos, U.17): what each person said they will do, from their check-ins, in one
 * list for each person. Nothing new is stored: it reads the commitments each check-in already keeps
 * (`GroundCommitment`), the same rows the check-in's own board and each person's You board show, and
 * only the ones nobody has said are done or dropped yet.
 *
 * WHO READS WHAT is decided here, never on the screen, and never wider than today:
 *   - nobody, while the suite is off; a member and a guest are refused;
 *   - A LINE IS SERVED ONLY TO SOMEBODY WHO MAY ALREADY READ IT IN THE CHECK-IN IT CAME FROM, by the
 *     product's one rule (grounds/who-may-read-this-check-in.ts): an admin reads every check-in in the
 *     organisation (decisions rule 5); a lead only the ones they run, set up or take part in. Not the
 *     ones a lead reads only because they are run from the same department: that reading is "shared",
 *     which never includes another person's exact words; and where they only take part, only if people
 *     in that check-in see each other;
 *   - a lead also reads only the people in their own team (a-leads-team.ts), and their own.
 * Whether one list for each person across check-ins is "each person's load across check-ins", which is
 * private unless they share it (decisions rule 4), is a question for Hafsah (item 28).
 *
 * WHAT IS NOT HERE, AND WHY:
 *   - A person's own to-dos from chat (`Todo`) are a note to themselves that nobody else reads, by the
 *     product's own rule, so they stay off this board (item 28).
 *   - Groundwork's own back office has to-dos (`OpsTodo`), but they are Groundwork's own, with no
 *     organisation on a row, so they are not reused.
 *   - Nobody marks somebody else's line done here: whether it was done is asked in their next check-in,
 *     and it counts in that check-in's record, so a board must not change it.
 * Nothing here is written, and nothing reaches a check-in or its report that was not already there.
 */
@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  async board(reader: Reader): Promise<TodoList> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'todos' } },
      select: { isOn: true },
    });
    if (!suite?.isOn) throw new NotFoundException(TODOS_REFUSED.notOn);
    const role = await this.roleOf(reader.userId, reader.organizationId);
    if (role !== 'ADMIN' && role !== 'LEAD') throw new ForbiddenException(TODOS_REFUSED.onlyAdminsAndLeads);
    const org = reader.organizationId;

    const people = await this.prisma.person.findMany({
      where: { organizationId: org, active: true },
      select: { externalId: true, linkedUserId: true, department: true, managerExternalId: true },
    }) as Dir[];
    const byUser = new Map(people.filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p]));
    const me = byUser.get(reader.userId) ?? null;

    const grounds = await this.prisma.ground.findMany({
      where: groundsAViewerMayList(reader.userId, { role, organizationId: org }, org, []) as any,
      select: { id: true, initiatorId: true, createdByUserId: true, scenario: true, peersVisibleToEachOther: true },
    });
    /* Where the reader only takes part, they read the others' words only if people there see each other. */
    const readable = grounds.filter((g) => role === 'ADMIN' || g.initiatorId === reader.userId || g.createdByUserId === reader.userId || peersAreNamedOn(g));
    if (!readable.length) return { people: [] };

    const rows = await this.prisma.groundCommitment.findMany({
      where: { groundId: { in: readable.map((g) => g.id) }, participantId: { not: null }, status: 'UNKNOWN' },
      select: { id: true, text: true, source: true, createdAt: true, participant: { select: { userId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const inScope = (userId: string) => role === 'ADMIN' || userId === reader.userId || (!!me && !!byUser.get(userId) && inTheLeadsTeam(me, byUser.get(userId)!));
    const kept = rows.filter((r) => r.participant?.userId && inScope(r.participant.userId) && r.text?.trim());
    const ids = [...new Set(kept.map((r) => r.participant!.userId as string))];
    const users = ids.length
      ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ').trim()]));

    const lists = new Map<string, TodoList['people'][number]>();
    for (const r of kept) {
      const userId = r.participant!.userId as string;
      const name = nameOf.get(userId);
      if (!name) continue;
      if (!lists.has(userId)) lists.set(userId, { name, todos: [] });
      lists.get(userId)!.todos.push({ id: r.id, text: r.text.trim(), source: 'check-in', on: r.createdAt.toISOString().slice(0, 10) });
    }
    return { people: [...lists.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  }

  // ---------------------------------------------------------------------------------------------

  private async roleOf(userId: string, organizationId: string): Promise<string | null> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }
}
