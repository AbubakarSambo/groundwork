import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { yourBoard, type YourBoard } from './your-board';
import { targetsFor } from '../board/whose-number-is-whose-business';

/** Said to anybody who asks for a You board that is not their own. */
export const NOT_YOURS = 'Only the person whose page this is can read it.';

/**
 * THE ONE READ OF THE YOU BOARD (C2, U.12). See your-board.ts for what it holds and never holds.
 *
 * THE READER IS THE PERSON. There is no argument naming somebody else: `forReader` reads the
 * signed-in person's own board, and `askedFor`, when a caller names anybody, must be that same
 * person or the read is refused before anything is fetched. Being a lead, an admin, or somebody's
 * colleague on a check-in changes nothing.
 */
@Injectable()
export class YourBoardService {
  constructor(private prisma: PrismaService, private grounds: GroundsService) {}

  async forReader(
    reader: { userId: string; email: string; organizationId: string; role: string },
    askedFor?: string | null,
  ): Promise<YourBoard> {
    if (askedFor && askedFor !== reader.userId) throw new ForbiddenException(NOT_YOURS);

    const list = ((await this.grounds.list(reader.organizationId, reader.userId, reader.email, reader.role)) ?? []) as any[];
    /* Only the check-ins in this organisation that you run or take part in, and only your own place in each. */
    const mine = list.filter(
      (g) => g.organizationId === reader.organizationId
        && (g.initiatorId === reader.userId || (g.participants ?? []).some((p: any) => p.userId === reader.userId)),
    );
    const groundIds = mine.map((g) => g.id);
    const participantIds = mine.flatMap((g) => (g.participants ?? []).filter((p: any) => p.userId === reader.userId).map((p: any) => p.id));

    const none = Promise.resolve([] as any[]);
    const [objectives, ownedTargets, commitments, coaching, todos] = await Promise.all([
      participantIds.length
        ? this.prisma.personObjective.findMany({
            where: { groundId: { in: groundIds }, participantId: { in: participantIds } },
            select: { id: true, groundId: true, participantId: true, text: true, kind: true, status: true, authoredBy: true, dueSaid: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          })
        : none,
      participantIds.length
        ? this.prisma.groundObjective.findMany({
            where: { groundId: { in: groundIds }, ownerParticipantId: { in: participantIds } },
            select: { id: true, groundId: true, name: true, target: true, count: true, ownerParticipantId: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          })
        : none,
      participantIds.length
        ? this.prisma.groundCommitment.findMany({
            where: { groundId: { in: groundIds }, participantId: { in: participantIds } },
            select: { id: true, groundId: true, participantId: true, text: true, whenSaid: true, status: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          })
        : none,
      participantIds.length
        ? this.prisma.coachingState.findMany({
            where: { participantId: { in: participantIds } },
            select: { participantId: true, currentStep: true, updatedAt: true },
          })
        : none,
      this.myTodos(reader.organizationId, reader.email),
    ]);

    return yourBoard(mine, { userId: reader.userId, organizationId: reader.organizationId }, {
      objectives: objectives as any,
      ownedTargets: this.onlyYours(ownedTargets as any[], participantIds),
      commitments: commitments as any,
      coaching: coaching as any,
      todos: todos as any,
    });
  }

  /**
   * A NUMBER WITH A NAME ON IT GOES THROUGH THE ONE RULE (board/whose-number-is-whose-business.ts),
   * read the narrowest way, as the reader's own place in each check-in. Of what it lets through,
   * only the targets with your name on them are kept: a target for the whole team is not yours.
   */
  private onlyYours<T extends { ownerParticipantId: string | null }>(targets: T[], participantIds: string[]): T[] {
    return targets.filter((t) => {
      const me = participantIds.find((id) => id === t.ownerParticipantId) ?? null;
      return !!me && targetsFor([t as any], me, 'their own').shown.length === 1;
    });
  }

  /**
   * Your own to-do list: a note to yourself, kept against your directory record in this
   * organisation, matched by your email the same way your own data export matches it. Somebody with
   * no directory record has no list, which is a real answer.
   */
  private async myTodos(organizationId: string, email: string) {
    if (!email) return [];
    const person = await this.prisma.person.findFirst({
      where: { organizationId, email: { equals: email, mode: 'insensitive' } },
      select: { externalId: true },
    });
    if (!person?.externalId) return [];
    return this.prisma.todo.findMany({
      where: { organizationId, personExternalId: person.externalId, state: 'OPEN' },
      select: { id: true, text: true, dueSaid: true },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      take: 50,
    });
  }
}
