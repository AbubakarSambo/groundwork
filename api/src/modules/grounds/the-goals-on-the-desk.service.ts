import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { CompanyPictureService } from './the-company-picture.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubjectsService } from '../subjects/subjects.service';
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import { theCheckInsThatFeedAPriority } from './what-a-check-in-feeds';
import { refuseAnOutsider } from './company.service';
import { thePeopleHere, type APersonHere } from '../suites/the-people-and-their-lines';
import { withTheirSignIns } from '../suites/a-roster-entry-and-its-sign-in';
import { theirOwnRosterEntry } from '../ask/their-own-roster-entry';
import {
  ADDED_ON_THE_DESK, mayChangeGoals, mayChangeThisGoal, mayTieThisCheckIn, itsWordsAreChangedHere, whatFeedsIt,
  NOT_YOURS_TO_ADD, NOT_YOURS_TO_CHANGE, NOT_YOURS_TO_TIE, ITS_WORDS_ARE_ELSEWHERE, NO_DIRECTORY_RECORD, GIVE_IT_A_TITLE,
  type AGoalReader,
} from './a-goal-on-the-desk';

type Reader = { userId: string; email: string; organizationId: string; role: string };

/** Somebody on People with no entry in the directory yet, offered as an owner by their sign-in. */
const A_MEMBER = 'member:';
const NOT_SOMEBODY_HERE = 'That person is not in this organisation.';

export interface AGoalYouMayChange {
  id: string;
  title: string;
  /** Who owns it, by name, or null when nobody does. */
  owner: string | null;
  ownerId: string | null;
  /** Admins only, as on the Desk (decision 86, item 3). */
  measure?: string | null;
  target?: string | null;
  /** False for a goal that came from the organisation's own system: its words are changed there. */
  wordsChangedHere: boolean;
  /** The check-ins that feed it, by the one rule the Desk reads (what-a-check-in-feeds.ts). Only those this reader may tie. */
  checkIns: { id: string; label: string }[];
  /** "Fed by Sales team, Q4." or "No check-in feeds this goal yet." */
  fedBy: string;
}

export interface TheGoalsYouMayChange {
  mayChange: boolean;
  /** An admin chooses who owns a goal; a lead's goal is theirs. */
  mayChooseOwner?: boolean;
  goals?: AGoalYouMayChange[];
  /** The check-ins this reader may tie to a goal, with the goal each one feeds now, by name. */
  checkIns?: { id: string; label: string; feeds: string | null }[];
  /** Admins only: who a goal may be put in the name of. */
  people?: { id: string; name: string }[];
}

export interface AGoalAsGiven {
  title?: string;
  measure?: string | null;
  target?: string | null;
  ownerId?: string | null;
  checkInIds?: string[];
}

/**
 * THE GOALS ON THE DESK, ADDED, CHANGED AND TIED TO CHECK-INS (a-goal-on-the-desk.ts says who may). Every write goes through the one
 * owner of each fact: the goal through SubjectsService.push (which also keeps the strategy's next version), the tie through
 * `ground.subjectExternalId`. The Desk itself (GET /company) is unchanged and reads both as before.
 */
@Injectable()
export class TheGoalsOnTheDeskService {
  constructor(
    private prisma: PrismaService,
    private subjects: SubjectsService,
    /** The company picture's sentences ("No check-in feeds this priority yet") are written from the same rule, so a change here writes them again. */
    @Optional() private picture?: CompanyPictureService,
  ) {}

  /**
   * A GOAL OR A TIE CHANGED IS THE RECORD CHANGING, SO THE PICTURE IS WRITTEN AGAIN (coordinator's browser test, 21 November: Priority 1
   * read "No check-in feeds this priority yet" beside "Fed by Sales team, Q4"). Both come from whatEachCheckInFeeds; the first was a
   * sentence kept from before. It is written after the answer, as a check-in finishing writes it, and a failure never fails the save.
   */
  private writeThePictureAgain(organizationId: string): void {
    if (this.picture) void this.picture.rebuild(organizationId).catch(() => undefined);
  }

  async read(reader: Reader): Promise<TheGoalsYouMayChange> {
    await refuseAnOutsider(this.prisma, reader);
    if (!mayChangeGoals(reader.role)) return { mayChange: false };
    const r = await this.asAGoalReader(reader);
    const db = this.prisma as any;
    const now = new Date();
    const [subjects, grounds] = await Promise.all([this.theGoals(reader.organizationId), this.theCheckIns(reader.organizationId)]);
    const feeding: { id: string; subjectExternalId: string }[] = await theCheckInsThatFeedAPriority(db, reader.organizationId, subjects as any).catch(() => []);
    const feedsOf = new Map(feeding.map((f) => [f.id, f.subjectExternalId]));
    const tieable = grounds.filter((g) => mayTieThisCheckIn(r, g));
    const people = reader.role === 'ADMIN' ? await this.whoAGoalMayBeFor(reader.organizationId) : [];
    const owners = new Map((reader.role === 'ADMIN' ? people : await this.theDirectory(reader.organizationId)).map((p) => [p.id, p.name]));
    const titleOf = new Map(subjects.map((s) => [s.externalId, s.title]));
    const isAdmin = reader.role === 'ADMIN';

    const goals = subjects
      .filter((s) => freshnessOf(s as any, now) !== 'disconnected' && mayChangeThisGoal(r, s))
      .map((s): AGoalYouMayChange => {
        const fed = tieable.filter((g) => feedsOf.get(g.id) === s.externalId).map((g) => ({ id: g.id, label: g.label }));
        return {
          id: s.id,
          title: s.title,
          owner: s.ownerExternalId ? owners.get(s.ownerExternalId) || null : null,
          ownerId: s.ownerExternalId,
          ...(isAdmin ? { measure: s.measure, target: s.target } : {}),
          wordsChangedHere: itsWordsAreChangedHere(s),
          checkIns: fed,
          fedBy: whatFeedsIt(fed.map((g) => g.label)),
        };
      });
    return {
      mayChange: true,
      mayChooseOwner: isAdmin,
      goals,
      checkIns: tieable.map((g) => ({ id: g.id, label: g.label, feeds: titleOf.get(feedsOf.get(g.id) ?? '') ?? null })),
      ...(isAdmin ? { people } : {}),
    };
  }

  async add(reader: Reader, given: AGoalAsGiven): Promise<TheGoalsYouMayChange> {
    await refuseAnOutsider(this.prisma, reader);
    if (!mayChangeGoals(reader.role)) throw new ForbiddenException(NOT_YOURS_TO_ADD);
    const r = await this.asAGoalReader(reader);
    const title = (given.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!title) throw new BadRequestException(GIVE_IT_A_TITLE);
    const owner = await this.theOwner(reader, r, given.ownerId);
    await this.refuseCheckInsNotYours(reader, r, given.checkInIds ?? []);
    const externalId = `desk-${randomUUID()}`;
    await this.subjects.push(reader.organizationId, {
      externalId, sourceSystem: ADDED_ON_THE_DESK, type: 'objective', title,
      ...(reader.role === 'ADMIN' ? { measure: given.measure ?? null, target: given.target ?? null } : {}),
      ownerExternalId: owner,
    });
    await this.tie(reader, r, externalId, given.checkInIds ?? []);
    this.writeThePictureAgain(reader.organizationId);
    return this.read(reader);
  }

  async change(reader: Reader, id: string, given: AGoalAsGiven): Promise<TheGoalsYouMayChange> {
    await refuseAnOutsider(this.prisma, reader);
    if (!mayChangeGoals(reader.role)) throw new ForbiddenException(NOT_YOURS_TO_CHANGE);
    const r = await this.asAGoalReader(reader);
    const goal = (await this.theGoals(reader.organizationId)).find((s) => s.id === id);
    if (!goal) throw new NotFoundException('That goal is not on the Desk.');
    if (!mayChangeThisGoal(r, goal)) throw new ForbiddenException(NOT_YOURS_TO_CHANGE);
    const wordsGiven = given.title !== undefined || given.measure !== undefined || given.target !== undefined || given.ownerId !== undefined;
    if (wordsGiven && !itsWordsAreChangedHere(goal)) throw new BadRequestException(ITS_WORDS_ARE_ELSEWHERE);
    if (given.checkInIds) await this.refuseCheckInsNotYours(reader, r, given.checkInIds);
    if (wordsGiven) {
      const title = given.title === undefined ? goal.title : given.title.replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!title) throw new BadRequestException(GIVE_IT_A_TITLE);
      const isAdmin = reader.role === 'ADMIN';
      await this.subjects.push(reader.organizationId, {
        externalId: goal.externalId, sourceSystem: goal.sourceSystem, type: 'objective', title,
        measure: isAdmin && given.measure !== undefined ? given.measure : goal.measure,
        target: isAdmin && given.target !== undefined ? given.target : goal.target,
        ownerExternalId: isAdmin && given.ownerId !== undefined ? await this.theOwner(reader, r, given.ownerId) : goal.ownerExternalId,
      });
    }
    if (given.checkInIds) await this.tie(reader, r, goal.externalId, given.checkInIds);
    this.writeThePictureAgain(reader.organizationId);
    return this.read(reader);
  }

  /** The organisation's goals: its own objectives with no parent, still in its system. The same rows the Desk lists as priorities. */
  private async theGoals(organizationId: string): Promise<{ id: string; externalId: string; sourceSystem: string; title: string; measure: string | null; target: string | null; ownerExternalId: string | null; syncedAt: Date; sourceDeletedAt: Date | null; type: string; parentExternalId: string | null }[]> {
    return this.prisma.subject.findMany({
      where: { organizationId, type: 'OBJECTIVE', parentExternalId: null, sourceDeletedAt: null },
      select: { id: true, externalId: true, sourceSystem: true, title: true, measure: true, target: true, ownerExternalId: true, syncedAt: true, sourceDeletedAt: true, type: true, parentExternalId: true },
      orderBy: { createdAt: 'asc' },
    }) as any;
  }

  /** The organisation's check-ins that could feed a goal: every one but those still waiting for an admin to accept them. */
  private async theCheckIns(organizationId: string): Promise<{ id: string; label: string; initiatorId: string | null; subjectExternalId: string | null }[]> {
    return this.prisma.ground.findMany({
      where: { organizationId, status: { not: 'AWAITING_APPROVAL' as any } },
      select: { id: true, label: true, initiatorId: true, subjectExternalId: true },
      orderBy: { createdAt: 'asc' },
    }) as any;
  }

  private async asAGoalReader(reader: Reader): Promise<AGoalReader> {
    const person = await this.prisma.person.findFirst({
      where: { organizationId: reader.organizationId, active: true, OR: [{ linkedUserId: reader.userId }, ...(reader.email ? [{ email: { equals: reader.email, mode: 'insensitive' as const } }] : [])] },
      select: { externalId: true },
    });
    return { userId: reader.userId, role: reader.role, personExternalId: person?.externalId ?? null };
  }

  /** The organisation's directory, by entry: each entry's key and name. */
  private async theDirectory(organizationId: string): Promise<{ id: string; name: string; userId: string | null }[]> {
    const entries: any[] = await (this.prisma as any).person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, linkedUserId: true, email: true, displayName: true, givenName: true, familyName: true },
    });
    const signed: any[] = await withTheirSignIns(this.prisma, organizationId, entries).catch(() => entries.map((e) => ({ ...e, userId: e.linkedUserId ?? null })));
    return signed.map((p) => ({ id: p.externalId, name: (p.displayName || [p.givenName, p.familyName].filter(Boolean).join(' ')).trim(), userId: p.userId ?? null }));
  }

  /**
   * WHO A GOAL MAY BE PUT IN THE NAME OF: everybody in the directory, and everybody here on People who has no entry in it yet
   * (release test, 21 November 2026, bug 53: Halima Noor joined that day and was missing). Somebody with no entry is offered by
   * their sign-in, as `member:<id>`, and their entry is made when a goal is put in their name (theOwner).
   */
  private async whoAGoalMayBeFor(organizationId: string): Promise<{ id: string; name: string }[]> {
    const directory = await this.theDirectory(organizationId);
    const inIt = new Set(directory.map((p) => p.userId).filter(Boolean));
    const here = (await thePeopleHere(this.prisma, organizationId).catch(() => [] as APersonHere[])).filter((p) => !inIt.has(p.userId));
    return [...directory.map(({ id, name }) => ({ id, name })), ...here.map((p) => ({ id: `${A_MEMBER}${p.userId}`, name: p.name }))]
      .filter((p) => p.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * The entry a goal is put in the name of. A lead's goal is always their own, and an admin names somebody, or nobody. Somebody
   * here with no entry in the directory yet gets their own (their-own-roster-entry.ts, the one claim-or-make), so a person added
   * on People can own a goal the day they join.
   */
  private async theOwner(reader: Reader, r: AGoalReader, ownerId: string | null | undefined): Promise<string | null> {
    const theirEntry = async (userId: string) => (await theirOwnRosterEntry(this.prisma, reader.organizationId, userId).catch(() => null))?.externalId ?? null;
    if (reader.role !== 'ADMIN') {
      const own = r.personExternalId ?? (await theirEntry(reader.userId));
      if (!own) throw new BadRequestException(NO_DIRECTORY_RECORD);
      return own;
    }
    if (!ownerId) return null;
    if (ownerId.startsWith(A_MEMBER)) {
      const userId = ownerId.slice(A_MEMBER.length);
      const isHere = (await thePeopleHere(this.prisma, reader.organizationId).catch(() => [] as APersonHere[])).some((p) => p.userId === userId);
      const entry = isHere ? await theirEntry(userId) : null;
      if (!entry) throw new BadRequestException(NOT_SOMEBODY_HERE);
      return entry;
    }
    const p = await this.prisma.person.findFirst({ where: { organizationId: reader.organizationId, externalId: ownerId, active: true }, select: { externalId: true } });
    if (!p) throw new BadRequestException(NOT_SOMEBODY_HERE);
    return p.externalId;
  }

  private async refuseCheckInsNotYours(reader: Reader, r: AGoalReader, ids: string[]): Promise<void> {
    if (!ids.length) return;
    const theirs = new Map((await this.theCheckIns(reader.organizationId)).map((g) => [g.id, g]));
    if (ids.some((id) => !theirs.has(id) || !mayTieThisCheckIn(r, theirs.get(id)!))) throw new ForbiddenException(NOT_YOURS_TO_TIE);
  }

  /** The check-ins this reader may tie: the ones chosen now feed this goal, and the ones not chosen that fed it feed nothing. */
  private async tie(reader: Reader, r: AGoalReader, externalId: string, chosen: string[]): Promise<void> {
    const want = new Set(chosen);
    for (const g of (await this.theCheckIns(reader.organizationId)).filter((x) => mayTieThisCheckIn(r, x))) {
      if (want.has(g.id) && g.subjectExternalId !== externalId) {
        await this.prisma.ground.update({ where: { id: g.id }, data: { subjectExternalId: externalId } });
      } else if (!want.has(g.id) && g.subjectExternalId === externalId) {
        await this.prisma.ground.update({ where: { id: g.id }, data: { subjectExternalId: null } });
      }
    }
  }
}
