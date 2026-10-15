import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';
import { groundsAViewerMayList } from '../grounds/who-may-read-this-check-in';
import { peersAreNamedOn, theReaderBySignIn } from '../reports/peers-are-named';
import { inTheLeadsTeam } from './a-leads-team';
import { asAnAction } from '../grounds/a-promise-as-an-action';
import { sameRequest } from '../grounds/a-fuller-promise-wins';

/** The words the server says when it refuses, in plain full sentences. */
export const TODOS_REFUSED = {
  notOn: thisSuiteIsOff('The to-dos suite'),
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
};

export interface Reader { userId: string; organizationId: string }

/**
 * ONE LIST FOR EACH CHECK-IN, AND INSIDE IT EACH PERSON'S LINES (decision 110, P8; decision 4).
 *
 * This used to be one list for each PERSON across every check-in they are in, which is that person's load across check-ins, and that is
 * private unless they share it. It is served inside each check-in now, where the reader may already read it, and never joined across
 * check-ins: the same person in two check-ins is in two lists, and nothing on the board says they are the same person's load.
 */
export interface TodoList {
  checkIns: {
    id: string;
    label: string;
    people: {
      name: string;
      firstName: string;
      todos: { id: string; text: string; source: 'check-in'; on: string; checkIn: string }[];
    }[];
  }[];
}

type Dir = { externalId: string; linkedUserId: string | null; department: string | null; managerExternalId: string | null };

/**
 * TO-DOS (E8, #/suite/todos, U.17): what each person said they will do, from their check-ins, in one
 * list for each person. Nothing new is stored: it reads the commitments each check-in already keeps
 * (`GroundCommitment`) and the self-authored commitments and to-dos on `PersonObjective` - the same
 * two sources the You board's "What you said you'd do" reads (your-board.ts) - and only the ones
 * nobody has said are done or dropped yet. The same promise sometimes sits in both, a short copy and
 * a fuller, dated one; only the fuller is shown (`a-fuller-promise-wins.ts`'s `sameRequest`, request
 * 96), the rule this board and the You board now share.
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
 * One list for each person across check-ins is "each person's load across check-ins", private unless they share it (decision 4), so
 * it is not served: Hafsah's answer (decision 110, P8) is one list for each check-in.
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
      select: { id: true, label: true, initiatorId: true, createdByUserId: true, scenario: true, peersVisibleToEachOther: true, participants: { select: { id: true, userId: true, partyType: true, managingOnly: true, createdAt: true } } },
    });
    /* Where the reader only takes part, they read the others' words only if people there see each other.
       This is also where a performance plan, a promotion or a renewal an admin was not given access to
       already left the list: `groundsAViewerMayList` is the one rule for which check-ins a reader may
       open at all (grounds/who-may-read-this-check-in.ts), so a line from one never reaches `grounds`
       in the first place, and cannot reach `readable` either. */
    const readable = grounds.filter((g) => role === 'ADMIN' || g.initiatorId === reader.userId || g.createdByUserId === reader.userId || peersAreNamedOn(g, theReaderBySignIn(g, reader.userId)));
    if (!readable.length) return { checkIns: [] };
    const labelOf = new Map(readable.map((g) => [g.id, g.label]));

    const groundIds = readable.map((g) => g.id);
    const rows = await this.prisma.groundCommitment.findMany({
      where: { groundId: { in: groundIds }, participantId: { not: null }, status: 'UNKNOWN' },
      select: { id: true, groundId: true, text: true, source: true, createdAt: true, participant: { select: { userId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    /* THE SAME PROMISE CAN LIVE TWICE, IN TWO DIFFERENT TABLES - a GroundCommitment and a
       self-authored PersonObjective, exactly as on the You board's "What you said you'd do"
       (your-board.ts), which reads both for the same reason. Read through the identical
       `groundsAViewerMayList` filter (`groundIds`, already resolved above), so an objective from a
       check-in the reader may not open never reaches this board either. */
    const objectiveRows = await this.prisma.personObjective.findMany({
      where: { groundId: { in: groundIds }, kind: { in: ['COMMITMENT', 'TODO'] }, authoredBy: 'self', status: 'OPEN' },
      select: { id: true, groundId: true, text: true, createdAt: true, participant: { select: { userId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const inScope = (userId: string) => role === 'ADMIN' || userId === reader.userId || (!!me && !!byUser.get(userId) && inTheLeadsTeam(me, byUser.get(userId)!));
    const kept = [...rows, ...objectiveRows]
      .filter((r) => r.participant?.userId && inScope(r.participant.userId) && r.text?.trim())
      .map((r) => ({ id: r.id, groundId: r.groundId, createdAt: r.createdAt, participant: r.participant, text: r.text.trim() }));
    /* The same promise written twice, a short one and a fuller dated one (request 96): the fuller
       text is shown, never both - per person, per check-in, so two different people's or two
       different check-ins' words are never folded together, and never two different people's. */
    const deduped: typeof kept = [];
    for (const r of kept) {
      const at = deduped.findIndex((d) => d.participant!.userId === r.participant!.userId && d.groundId === r.groundId && sameRequest(d.text, r.text));
      if (at === -1) { deduped.push(r); continue; }
      if (r.text.length > deduped[at].text.length) deduped[at] = r;
    }
    const ids = [...new Set(deduped.map((r) => r.participant!.userId as string))];
    const users = ids.length
      ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ').trim()]));
    /* Signup stores whatever was typed for "Your name" whole, in `firstName` (AuthPage.tsx), so an
       account like Rukia's carries "Rukia Otieno" there - the first WORD of it is what the source
       line wants ("From Rukia's check-in..."), never the whole field. */
    const firstNameOf = new Map(users.map((u) => [u.id, (u.firstName ?? '').trim().split(/\s+/)[0] ?? '']));

    /* Grouped by check-in first, and a person only inside the check-in a line came from: never one list for a person across check-ins. */
    const byCheckIn = new Map<string, Map<string, TodoList['checkIns'][number]['people'][number]>>();
    for (const r of deduped) {
      const userId = r.participant!.userId as string;
      const name = nameOf.get(userId);
      const firstName = firstNameOf.get(userId);
      if (!name || !firstName) continue;
      if (!byCheckIn.has(r.groundId)) byCheckIn.set(r.groundId, new Map());
      const here = byCheckIn.get(r.groundId)!;
      if (!here.has(userId)) here.set(userId, { name, firstName, todos: [] });
      here.get(userId)!.todos.push({
        id: r.id, text: asAnAction(r.text), source: 'check-in', on: r.createdAt.toISOString().slice(0, 10),
        checkIn: labelOf.get(r.groundId) ?? '',
      });
    }
    return {
      checkIns: [...byCheckIn.entries()]
        .map(([id, people]) => ({ id, label: labelOf.get(id) ?? '', people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
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
