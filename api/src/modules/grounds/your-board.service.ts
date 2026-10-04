import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';
import { theCheckInsHeldForASeat } from '../participants/held-for-a-seat';
import { aWaitOnOneself } from '../board/a-thing-is-not-somebody';
import { notToldYet, aWeekHasPassedSinceNotTold, whatThePersonReadsAfterAWeek } from './a-goal-not-told-stays-with-the-lead';
import { areaOfGoalOrFallback } from './the-area-of-a-goal-is-worded-once';
import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { PrismaService } from '../prisma/prisma.service';
import { theirApprovedLeave } from '../suites/who-is-away';
import { GroundsService } from './grounds.service';
import { yourBoard, type YourBoard, type YourPattern } from './your-board';
import { isShut } from './a-ground-that-has-ended';
import { targetsFor } from '../board/whose-number-is-whose-business';
import { withoutWhatTheLeadHasNotToldThemAbout, theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { SuggestionsService } from '../suggestions/suggestions.service';
import type { ForThePerson } from '../suggestions/a-suggestion-told-like-a-signal';
import { askedOfYou, type AskedOfYou } from './asked-of-you';
import { theDayIn } from './when-a-handoff-is-due';
import {
  PATTERN_ROW_SELECT, servedPatterns, whoIsWhoIn, theOnesTheyAreSeeingFirst, markShownToThePerson,
  type APatternRow,
} from '../patterns/who-reads-a-pattern';

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
  constructor(
    private prisma: PrismaService,
    private grounds: GroundsService,
    /** "Where you stand" from Groundwork's suggestions about you (C3, U.13), as you may read them. */
    @Optional() private suggestions?: SuggestionsService,
  ) {}

  async forReader(
    reader: { userId: string; email: string; organizationId: string; role: string },
    askedFor?: string | null,
  ): Promise<YourBoard & { suggestionsAboutYou?: ForThePerson[]; askedOfYou?: AskedOfYou }> {
    if (askedFor && askedFor !== reader.userId) throw new ForbiddenException(NOT_YOURS);

    const list = ((await this.grounds.list(reader.organizationId, reader.userId, reader.email, reader.role)) ?? []) as any[];
    /* Only the check-ins in this organisation that you run or take part in, and only your own place in each. */
    /* Nothing of a check-in the reader is held for a seat on: no goal, no report, no card (second review, new leak A; privacy row 5, kept by decision 93). */
    const heldForASeat = await theCheckInsHeldForASeat(this.prisma as any, list.map((g) => g.id), reader.userId);
    const mine = list.filter(
      (g) => !heldForASeat.has(g.id) && g.organizationId === reader.organizationId
        && (g.initiatorId === reader.userId || (g.participants ?? []).some((p: any) => p.userId === reader.userId)),
    );
    const groundIds = mine.map((g) => g.id);
    const participantIds = mine.flatMap((g) => (g.participants ?? []).filter((p: any) => p.userId === reader.userId).map((p: any) => p.id));

    const none = Promise.resolve([] as any[]);
    const [objectives, ownedTargets, commitments, coaching, todos, onYou, patternRows] = await Promise.all([
      participantIds.length
        ? this.prisma.personObjective.findMany({
            where: { groundId: { in: groundIds }, participantId: { in: participantIds } },
            select: { id: true, groundId: true, participantId: true, text: true, kind: true, status: true, authoredBy: true, dueSaid: true, awareness: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          /* A goal the lead has not told you about is not on your board until they have. The lead of
             that check-in still reads it. See a-goal-not-told-stays-with-the-lead.
             DECISION 56, ITEM 4: once a week has passed still not told, it is not left off any more -
             it is told plainly, with no number, and who set it. */
          }).then((rows: any[]) => Promise.all(rows
            .filter((o) => !notToldYet(o)
              || mine.some((g) => g.id === o.groundId && g.initiatorId === reader.userId)
              || aWeekHasPassedSinceNotTold(o))
            .map(async (o) => {
              if (!notToldYet(o) || mine.some((g) => g.id === o.groundId && g.initiatorId === reader.userId)) return o;
              const g = mine.find((x) => x.id === o.groundId);
              const lead = (g?.participants ?? []).find((p: any) => p.userId === g?.initiatorId);
              const leadName = theFirstNameOfAParticipant(lead) || 'Your lead';
              const area = await areaOfGoalOrFallback(this.prisma, o.text);
              return { ...o, text: whatThePersonReadsAfterAWeek(leadName, area) };
            })))
        : none,
      participantIds.length
        ? this.prisma.groundObjective.findMany({
            where: { groundId: { in: groundIds }, ownerParticipantId: { in: participantIds } },
            select: { id: true, groundId: true, name: true, target: true, count: true, ownerParticipantId: true, isADecisionAboutAPerson: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          })
        : none,
      participantIds.length
        ? this.prisma.groundCommitment.findMany({
            where: { groundId: { in: groundIds }, participantId: { in: participantIds } },
            select: { id: true, groundId: true, participantId: true, text: true, whenSaid: true, status: true, settledBy: true, settledAt: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          })
        : none,
      participantIds.length
        ? this.prisma.coachingState.findMany({
            where: { participantId: { in: participantIds } },
            select: { participantId: true, currentStep: true, updatedAt: true },
          })
        : none,
      this.myTodos(reader.organizationId, reader.email, reader.userId),
      /* Everything asked of you (D3, U.16): open handoffs on your own place in your own check-ins. */
      participantIds.length
        ? this.prisma.groundDependency.findMany({
            where: {
              groundId: { in: groundIds },
              onParticipantId: { in: participantIds },
              status: { in: ['WAITING', 'BLOCKING'] as any },
              clearedAt: null,
            },
            select: {
              id: true, groundId: true, fromParticipantId: true, onParticipantId: true, onLabel: true,
              what: true, status: true, namedTheThing: true, createdAt: true, dueSaid: true, dueOn: true, blockerKind: true,
              fromParticipant: { select: { userId: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
              ground: { select: { label: true, initiatorId: true, scenario: true, peersVisibleToEachOther: true, participants: { select: { id: true, userId: true, partyType: true, managingOnly: true, createdAt: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          /* Nobody waits on themselves (request 117, part 6). */
          }).then((rows: any[]) => rows.filter((d) => !aWaitOnOneself(d)))
        : none,
      /*
       * "SOMETHING THAT KEEPS COMING UP", ACROSS EVERY CHECK-IN YOU ARE IN. Your own participant
       * rows only (`participantIds` is already narrowed to this reader's own place in each of
       * their check-ins), so every row this selects is already this reader's own - `servedPatterns`
       * below still runs it through the one rule (patterns/who-reads-a-pattern.ts) rather than
       * trusting that, so three check-ins and a plain name are still required.
       */
      participantIds.length
        ? this.prisma.patternDetection.findMany({
            where: { participantId: { in: participantIds } },
            select: {
              ...PATTERN_ROW_SELECT,
              participant: {
                select: {
                  groundId: true,
                  ground: {
                    select: {
                      label: true,
                      initiatorId: true,
                      participants: { select: { id: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
                    },
                  },
                },
              },
            },
          })
        : none,
    ]);

    /* Groundwork's suggestions about you, in the shape the person it is about may read (facts and
       the decision with its reasons, never the verdict). Left off when there are none. */
    const aboutYou = this.suggestions ? await this.suggestions.aboutYou({ userId: reader.userId, organizationId: reader.organizationId }) : [];

    /* And no target of yours that is a goal the lead has not told you about (decisions 48 and 56): the same rule as the board, per check-in, and the lead of one reads their own. */
    const untoldRows: any[] = participantIds.length
      ? await this.prisma.personObjective.findMany({
          where: { groundId: { in: groundIds }, participantId: { in: participantIds }, awareness: 'NOT_TOLD' },
          select: { groundId: true, participantId: true, text: true, awareness: true, authoredBy: true, createdAt: true },
        })
      : [];
    const targetsYouMayRead = (ownedTargets as any[]).filter((t) => {
      const g = mine.find((x) => x.id === t.groundId);
      const runsIt = theyRunThisCheckIn(reader.userId, g as any);
      return withoutWhatTheLeadHasNotToldThemAbout([t], untoldRows.filter((r) => r.groundId === t.groundId), (g?.participants ?? []) as any[], runsIt).kept.length === 1;
    });

    const board = yourBoard(mine, { userId: reader.userId, organizationId: reader.organizationId }, {
      objectives: objectives as any,
      ownedTargets: this.onlyYours(targetsYouMayRead, participantIds),
      commitments: commitments as any,
      coaching: coaching as any,
      todos: todos as any,
      leave: await theirApprovedLeave(this.prisma as any, reader.userId, reader.organizationId),
    });
    /* Only the check-ins still running: a request in a check-in that has ended, or not begun, is not on you now. */
    const running = new Set(mine.filter((g) => !isShut(g.status) && !['AWAITING_APPROVAL', 'DECLINED'].includes(g.status) && !g.closedAt && !g.resolvedAt).map((g) => g.id));
    const asked = askedOfYou(onYou as any, reader, { groundIds: running, participantIds: new Set(participantIds) }, theDayIn('Africa/Lagos', new Date()));
    const patterns = await this.servedPatternsAcrossGrounds(patternRows as any[]);
    return {
      ...board,
      ...(aboutYou.length ? { suggestionsAboutYou: aboutYou } : {}),
      ...(asked ? { askedOfYou: asked } : {}),
      ...(patterns.length ? { patterns } : {}),
    };
  }

  /**
   * "SOMETHING THAT KEEPS COMING UP", BUILT PER CHECK-IN SO THE ONE RULE (who-reads-a-pattern.ts)
   * SEES ONE CHECK-IN'S OWN LEAD AND PARTICIPANTS AT A TIME - the sentence naming who else sees it
   * needs that check-in's own lead, and a person can be in several check-ins with different leads.
   * Every row here already belongs to this reader's own participant id (see the query above), so
   * `reader.participantId` for each group is simply that group's own rows' participantId.
   */
  private async servedPatternsAcrossGrounds(rows: (APatternRow & {
    participant: { groundId: string; ground: { label: string; initiatorId: string | null; participants: any[] } };
  })[]): Promise<YourPattern[]> {
    const byGround = new Map<string, { label: string; initiatorId: string | null; participants: any[]; rows: APatternRow[] }>();
    for (const row of rows ?? []) {
      const groundId = row.participant.groundId;
      if (!byGround.has(groundId)) {
        byGround.set(groundId, {
          label: row.participant.ground.label,
          initiatorId: row.participant.ground.initiatorId,
          participants: row.participant.ground.participants,
          rows: [],
        });
      }
      byGround.get(groundId)!.rows.push(row);
    }

    const list: YourPattern[] = [];
    const shownIds: string[] = [];
    for (const g of byGround.values()) {
      const participantId = g.rows[0]?.participantId;
      if (!participantId) continue;
      const served = servedPatterns(g.rows, { participantId, runsIt: false }, whoIsWhoIn(g.participants, g.initiatorId));
      shownIds.push(...theOnesTheyAreSeeingFirst(g.rows, served));
      for (const p of served) list.push({ ...p, checkIn: g.label });
    }
    /* The person reading their own for the first time starts the clock on when the lead may read it. */
    await markShownToThePerson(this.prisma as any, shownIds);
    return list;
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
  private async myTodos(organizationId: string, email: string, userId?: string) {
    if (!email) return [];
    /* A guest here has no record on this list, even when an entry shares their address. See a-guest-is-never-somebody-on-the-hosts-list. */
    if (await isAGuestIn(this.prisma, organizationId, { userId, email })) return [];
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
