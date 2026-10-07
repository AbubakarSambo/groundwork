import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { thisSuiteIsOff } from './a-suite-that-is-off-says-what-to-do';
import { PrismaService } from '../prisma/prisma.service';
import { askNameOf } from '../assistant/ask-name';
import { theirRosterEntries, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { inTheLeadsTeam } from './a-leads-team';
import { loadLookups, type Lookups } from './the-lookups';
import { oneAtATime } from './the-same-request-at-once';
import { NOBODY_ELSE_CAN_DECIDE, nobodyElseCanDecide, couldBeNamed, decidesIt, everyRuleIn, passWhatTheyAlreadyApproved, theStepsFor, whoComesNext, whoDecidesNow, type APassedStep, type DecidesNow, type WhoDecides } from './who-may-decide';
import { whyPassOn, type WhyPassedOn } from './a-request-waits-too-long';
import { aRequestsHistory, recordIt } from './a-request-is-recorded';
import { claimIt, theyGotThereFirst, whereItIsNow } from './a-request-is-answered-once';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { aLeaveRequest, leaveInWords, type AWaitingRequest, whereItIsOnTheBoard, whereYourRequestIs, type WhereItStands } from './a-request-in-words';
import { firstNamesOf, readWorkflow, whoInWords, type AWorkflow } from './the-approval-steps';
import { ownedInWords, whatTheyOwnWhileAway } from './what-they-own-while-away';
import { aLeaveRequestAsTheApproverReadsIt, theClashSaid, whoIsOffNamed } from './a-leave-request-as-the-approver-reads-it';
import { LEAVE_QUESTION_KIND, QUESTION_REFUSED, aQuestionSaid, aReasonSaid, wordsGiven, type AQuestion } from './a-question-about-a-request';
import { hereSince, inASentence, readLeaveRules, theKindOf, theRulesThatApply, type ALeaveKind, type LeaveRules } from './the-leave-rules';
import { readDuties } from './who-holds-each-duty';
import { daysOfLeaveLeftSaid } from '../assistant/your-own-requests-asked-about';

/** The words the server says when it refuses, in plain full sentences. */
export const LEAVE_REFUSED = {
  notOn: thisSuiteIsOff('The leave suite'),
  onlyAdminsAndLeads: 'Only an admin or a lead can open this board.',
  notInIt: 'Only people in this organisation can ask for leave here.',
  notFound: 'That request was not found.',
  notYours: 'Only the person who approves this request can decide it.',
  alreadyDecided: 'This request has already been decided.',
  badDates: 'Give a first and a last day, with the last day on or after the first.',
  badStandIn: 'The stand-in has to be somebody else in this organisation.',
  badKind: 'That kind of leave is not one your organisation has set.',
};

export interface Reader { userId: string; organizationId: string }

/**
 * HOW A DECISION IS ANSWERED, FOR MANY IN A ROW (the-decisions-in-a-batch.service.ts). `lean`: give nothing back, because the caller
 * says what happened for each; `collect`: whoever decides the next step is not told now but gathered, and told once for all that
 * arrive together.
 */
export interface ADecisionHow { lean?: boolean; collect?: { approverUserIds: string[]; request: AWaitingRequest }[] }

/** One request passed on because it waited too long, or its approver was away. */
export interface PassedOn { ref: string; step: number; from: WhoDecides; to: WhoDecides; why: WhyPassedOn }

/** A day as a person reads it, with no time of day: "2026-10-01". */
export type Day = string;

export interface Waiting {
  id: string;
  name: string;
  startsOn: Day;
  endsOn: Day;
  /** Working days this request takes. */
  days: number;
  /**
   * Days left this year before this request, when the organisation has said how many each person has:
   * of this kind of leave, when the admin has set kinds (the-leave-rules.ts).
   */
  daysLeft: number | null;
  /** The kind of leave, as people say it ("Annual leave"), or null when the organisation has set no kinds. */
  leaveKind: string | null;
  /** Each leave rule that applies to this request, in full sentences with the person's name (build step 8). Empty when none does. */
  rules: string[];
  /** The department the overlap is counted in, or null when the directory gives none. */
  team: string | null;
  /** The first names of others in the same team already off on any of those days (full names where two share a first name). */
  alsoOff: string[];
  /** The most off on any one day, who, and the sentence, the same as the approver's queue says it; null when the person has no team or nobody is off. */
  clash: { count: number; names: string[]; says: string } | null;
  standIn: string | null;
  /** Whether this reader is the one who approves it. */
  mayDecide: boolean;
  /** Where it is, in a full sentence for this reader: "Wairimu has approved it, and it is now waiting for you." */
  where: string;
  /**
   * What the person owns that falls in those days (decision 85, build step 7), each a full sentence:
   * "Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 1 October." Only what this reader
   * may already read (what-they-own-while-away.ts).
   */
  owns: string[];
  /**
   * Each question the person who decides it asked, and the answer, in full sentences for this reader
   * (decision 85, build step 7): "You asked Aisha on 5 October, “Who will cover the milestone?”" and
   * "Aisha answered on 6 October, “Brian will.”"
   */
  questions: string[];
  /**
   * The whole request as the person who decides it reads it, in full sentences: who asked for which
   * days, the days left, who else in the team is off, the stand-in, what the person owns then, and any
   * question asked about it with its answer.
   */
  said: string[];
}

/**
 * Who the board is served to: an admin, a lead, or a member who reads it only because a request waits
 * for them to decide ("approver"). An approver is served only the requests they decide, and in "off"
 * only their own leave.
 */
export type BoardReader = 'admin' | 'lead' | 'approver' | 'hr';

/** `kind` is "annual" unless the admin set kinds of leave; `kindName` says it ("Annual leave"), or null with no kinds set. */
export interface Off { id: string; name: string; startsOn: Day; endsOn: Day; kind: string; kindName?: string | null }

/**
 * A request whoever holds the HR duty is told of (decision 85, build step 8), when the admin chose to
 * tell HR: each approved request, or each request. Served only to that person.
 */
export interface ToldToHr {
  id: string;
  name: string;
  startsOn: Day;
  endsOn: Day;
  status: 'waiting' | 'approved';
  kindName: string | null;
  /** "Aisha Otieno asked for annual leave from ... to ..., which is 5 working days." "Wairimu approved it." */
  said: string[];
}

export interface MyLeave {
  perYear: number | null;
  daysLeft: number | null;
  /** Each kind of leave the admin set, with this person's days a year and days left; empty when none are set. */
  kinds: { key: string; name: string; perYear: number | null; daysLeft: number | null }[];
  /** The days left, in a full sentence for this reader ("You have 17 days of leave left this year, out of 20."), the same one Ask Groundwork says. */
  daysLeftSaid: string;
  requests: {
    id: string; startsOn: Day; endsOn: Day; days: number; status: 'waiting' | 'approved' | 'declined'; standIn: string | null;
    /** The kind of leave ("Annual leave"), or null when the organisation has set no kinds. */
    leaveKind: string | null;
    /** Where it is, in a full sentence: "Your leave from ... is approved by Wairimu and is now waiting for Omar in finance." */
    where: string;
    /** Each question asked about it, and the answer, in full sentences with "you" for the person (decision 85, build step 7). */
    questions: string[];
    /** The question still waiting for this person's answer, so the screen can offer a place to answer it; null when none waits. */
    questionWaiting: { id: string; question: string; askedBy: string } | null;
    /**
     * What the person who declined it said when they declined, in a full sentence: "Wairimu said, “Sales
     * is two short that day.”" Null when they said nothing. It is the approver's words about the
     * decision, never a reason for the leave, which is still never asked for or kept (decision 31).
     */
    declinedBecause: string | null;
  }[];
}

type Row = {
  id: string; organizationId: string; userId: string; startsOn: Date; endsOn: Date; kind: string;
  standInUserId: string | null; status: string; decidedById: string | null; decidedAt: Date | null;
  /* Where it is among the approval steps (decision 85, build step 4). Rows read before steps existed have none: step one. */
  step?: number | null; escalatedTo?: number | null; stepSince?: Date | null; approvedByIds?: string[] | null;
  /* The reason a decline was given with (build step 7). */
  declineReason?: string | null;
  askedAt?: Date | null;
};

/** Who approved the steps so far. A request decided before steps were kept names only who decided it. */
const approversOf = (r: Pick<Row, 'status' | 'decidedById' | 'approvedByIds'>): string[] =>
  r.approvedByIds?.length ? r.approvedByIds : r.status === 'approved' && r.decidedById ? [r.decidedById] : [];

const DAY = 86_400_000;
const dayOf = (d: Date): Day => d.toISOString().slice(0, 10);
const atMidnight = (d: Day): Date => new Date(`${d}T00:00:00.000Z`);

/** Monday to Friday between two days, both counted. Public holidays are not known here. */
export function workingDays(from: Date, to: Date): number {
  let n = 0;
  for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
    const w = new Date(t).getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Working days of a request that fall in one calendar year. */
function workingDaysIn(year: number, from: Date, to: Date): number {
  const start = new Date(Math.max(from.getTime(), Date.UTC(year, 0, 1)));
  const end = new Date(Math.min(to.getTime(), Date.UTC(year, 11, 31)));
  return end < start ? 0 : workingDays(start, end);
}

const overlaps = (a: { startsOn: Date; endsOn: Date }, b: { startsOn: Date; endsOn: Date }) =>
  a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;

/**
 * THE LEAVE BOARD (E2, #/suite/leave, U.17). Who reads what is decided here, never on the screen:
 *   - nobody, while the leave suite is off;
 *   - an admin reads every request waiting and everybody off in the next two weeks;
 *   - a lead reads only their own team's (a-leads-team.ts): what is waiting, with the days left and
 *     who else in the team is off those days, which is only what is needed to decide, and who in the
 *     team is off in the next two weeks;
 *   - whoever the rules name to decide a request (who-may-decide.ts) also reads that request, with
 *     the days left and who else in the team is off those days: a lead from another team, or a member,
 *     who opens the board as an "approver" and reads nothing else of anybody's leave;
 *   - each person reads only their own requests and their own days left (`mine`);
 *   - a colleague reads nothing of anybody else's leave, and nobody reads a reason, because none is
 *     kept.
 * WHO DECIDES is the one approval resolver (who-may-decide.ts): the person's manager in the directory,
 * when that manager is a lead or an admin here, or else any admin. Nobody decides their own. Nothing here reaches a check-in or its report.
 */
@Injectable()
export class LeaveBoardService {
  constructor(
    private readonly prisma: PrismaService,
    /* Tells the approver, and then the person, on WhatsApp (decision 82, item 1). Optional so a test built by hand still runs. */
    @Optional() private readonly told?: ARequestToldOnWhatsApp,
  ) {}

  async board(reader: Reader, today = new Date()): Promise<{ reader: BoardReader; waiting: Waiting[]; off: Off[]; toldToHr: ToldToHr[] }> {
    const ask = await askNameOf(this.prisma, reader.organizationId);
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    /* Whoever holds the HR duty, when the admin chose to tell HR (build step 8). */
    const holdsHr = !!answers.rules.tellHr && !!role && role !== 'GUEST' && (await readDuties(this.prisma, reader.organizationId)).hr === reader.userId;
    /*
     * Whoever the rules name decides, whatever their role or team (who-may-decide.ts). A member the
     * rules could name opens the board as an approver and is served only what waits for them; any
     * other member, and a guest, are refused, as before.
     */
    const asApprover = role !== 'ADMIN' && role !== 'LEAD';
    const mayBeNamed = asApprover && role === 'MEMBER' && (await couldBeNamed(this.prisma, [...everyRuleIn(theStepsFor('leave', answers)), ...(answers.rules.thresholds ?? []).flatMap((t) => everyRuleIn(t.steps))], reader.organizationId, { userId: reader.userId, role }));
    if (asApprover && !mayBeNamed && !holdsHr) {
      throw new ForbiddenException(LEAVE_REFUSED.onlyAdminsAndLeads);
    }

    const rows = (await this.prisma.leaveRequest.findMany({
      where: { organizationId: reader.organizationId, status: { in: ['waiting', 'approved'] } },
      orderBy: { startsOn: 'asc' },
    })) as Row[];
    const people = await this.directory(reader.organizationId, rows);
    /* Who decides each request is worked out in memory from what is read once here, not asked of the database for every row. */
    const shared = { lookups: (await loadLookups(this.prisma, reader.organizationId, today).catch(() => undefined)) as Lookups | undefined, on: today };
    const names = await this.names(rows);
    const questions = await this.questionsOn(reader.organizationId, rows.filter((r) => r.status === 'waiting').map((r) => r.id));
    const askers = await this.firstNames(questions.flatMap((q) => [q.askedById, q.toUserId]));

    const inScope = role === 'ADMIN'
      ? (_userId: string) => true
      : role === 'LEAD' ? await this.theLeadsTeam(reader, people) : (_userId: string) => false;

    const approved = rows.filter((r) => r.status === 'approved');
    const waiting: Waiting[] = [];
    for (const r of rows.filter((x) => x.status === 'waiting' && x.userId !== reader.userId)) {
      /* A lead reads their own team's requests; anybody also reads each request that waits for them to decide. */
      const now = await this.now(r, people, answers, shared);
      const decides = decidesIt(now.who, { userId: reader.userId, role }, r.userId);
      if (!inScope(r.userId) && !decides) continue;
      const team = people.get(r.userId)?.department?.trim() || null;
      /* Each person once, by first name, and by full name where two share a first name; the approver reads how many and who. */
      const off = team
        ? whoIsOffNamed(
          approved.filter((a) => a.userId !== r.userId && people.get(a.userId)?.department?.trim() === team && overlaps(a, r))
            .map((a) => ({ id: a.userId, first: names.get(a.userId)?.first ?? '', full: names.get(a.userId)?.full ?? '', startsOn: a.startsOn, endsOn: a.endsOn })),
          r)
        : { count: 0, names: [] as string[], busiest: 0 };
      const alsoOff = off.names;
      const first = names.get(r.userId)?.first ?? '';
      const days = workingDays(r.startsOn, r.endsOn);
      const kind = theKindOf(r.kind, answers.rules);
      const daysLeft = this.daysLeftOf(answers, kind, approved.filter((a) => a.userId === r.userId), r.startsOn.getUTCFullYear());
      /* Each leave rule that applies (build step 8), with the person's name. None set: none said. */
      const rules = await this.theRulesFor(answers.rules, r, kind, { name: first || 'This person' }, today);
      const standIn = r.standInUserId ? names.get(r.standInUserId)?.full ?? null : null;
      /* What the person owns in those days, read for this reader (decision 85, build step 7). */
      const owns = ownedInWords(first, await whatTheyOwnWhileAway(this.prisma, { ...reader, role }, r.userId, r.startsOn, r.endsOn).catch(() => ({ owned: [], hidden: 1 })));
      const asked = questions.filter((q) => q.ref === r.id).flatMap((q) => aQuestionSaid(q, askers, reader.userId, ask));
      waiting.push({
        id: r.id,
        name: names.get(r.userId)?.full ?? '',
        startsOn: dayOf(r.startsOn),
        endsOn: dayOf(r.endsOn),
        days,
        daysLeft,
        leaveKind: kind?.name ?? null,
        rules,
        team,
        alsoOff,
        /* The same sentence and the same count the approver's queue reads (the-approvals-queue.service.ts). Null with no team, or nobody off. */
        clash: team && off.count ? { count: off.busiest, names: alsoOff, says: theClashSaid(team, alsoOff, r.startsOn.getTime() === r.endsOn.getTime(), off.busiest) } : null,
        standIn,
        mayDecide: decides,
        where: whereItIsOnTheBoard(await this.whereItStands(r, now, decides ? reader.userId : undefined, reader.userId, shared.lookups?.names)),
        owns,
        questions: asked,
        said: aLeaveRequestAsTheApproverReadsIt({
          firstName: first, startsOn: dayOf(r.startsOn), endsOn: dayOf(r.endsOn), days, daysLeft, team,
          kindName: kind ? inASentence(kind) : null,
          alsoOff, busiest: off.busiest, standIn, owns, more: [...rules, ...asked],
        }),
      });
    }

    const from = atMidnight(dayOf(today));
    const to = new Date(from.getTime() + 13 * DAY);
    const off: Off[] = approved
      .filter((r) => inScope(r.userId) || r.userId === reader.userId)
      .filter((r) => overlaps(r, { startsOn: from, endsOn: to }))
      .map((r) => {
        const kind = theKindOf(r.kind, answers.rules);
        return { id: r.id, name: names.get(r.userId)?.full ?? '', startsOn: dayOf(r.startsOn), endsOn: dayOf(r.endsOn), kind: kind?.key ?? (r.kind || 'annual'), ...(kind ? { kindName: kind.name } : {}) };
      });

    /*
     * HR TOLD (build step 8): whoever holds the HR duty reads each approved request, or each request,
     * as the admin chose, from two weeks back onwards. Nobody else is served this list.
     */
    const toldToHr: ToldToHr[] = [];
    if (holdsHr) {
      const since = dayOf(new Date(atMidnight(dayOf(today)).getTime() - 14 * DAY));
      for (const r of rows.filter((x) => (x.status === 'approved' || answers.rules.tellHr === 'every') && x.userId !== reader.userId && dayOf(x.endsOn) >= since)) {
        const kind = theKindOf(r.kind, answers.rules);
        const first = names.get(r.userId)?.first ?? '';
        const full = names.get(r.userId)?.full ?? '';
        if (!full) continue;
        const what = leaveInWords(dayOf(r.startsOn), dayOf(r.endsOn));
        const days = workingDays(r.startsOn, r.endsOn);
        const now = r.status === 'waiting' ? await this.now(r, people, answers, shared) : null;
        toldToHr.push({
          id: r.id, name: full, startsOn: dayOf(r.startsOn), endsOn: dayOf(r.endsOn), status: r.status as 'waiting' | 'approved', kindName: kind?.name ?? null,
          said: [
            `${full} asked for ${kind ? `${inASentence(kind)}${what.slice('leave'.length)}` : what}, which is ${days} working ${days === 1 ? 'day' : 'days'}.`,
            whereItIsOnTheBoard(await this.whereItStands(r, now, undefined, reader.userId, shared.lookups?.names)),
            ...(kind?.document ? await this.theRulesFor({ kinds: [kind] }, r, kind, { name: first || 'this person' }, today) : []),
          ],
        });
      }
    }

    return {
      reader: role === 'ADMIN' ? 'admin' : role === 'LEAD' ? 'lead' : mayBeNamed ? 'approver' : 'hr',
      waiting: waiting.filter((w) => w.name), off: off.filter((o) => o.name), toldToHr,
    };
  }

  /**
   * THE DAYS TEAMMATES ARE OFF, FOR ASK GROUNDWORK'S "WHO IS OFF" (decision 93, row 25). A member reads the approved leave of
   * the people in their own team, which is the staff directory's department (a blank department is nobody's team), by first name
   * and dates only: never the kind of leave and never a reason, and never leave still waiting or declined. A guest, and anybody
   * outside the organisation, read nothing of it. The leave board itself is not changed by this; it still refuses a member.
   * Returns null where the reader has no team to read from, so the caller says what it said before.
   */
  async teammatesOff(reader: Reader): Promise<{ name: string; startsOn: Day; endsOn: Day }[] | null> {
    await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!role || role === 'GUEST') return null;
    const me = await theirRosterEntry(this.prisma, reader.organizationId, reader.userId, { externalId: true, department: true });
    const mine = (me?.department as string | null | undefined)?.trim();
    if (!mine) return null;
    const rows = (await this.prisma.leaveRequest.findMany({
      where: { organizationId: reader.organizationId, status: { in: ['approved'] } },
      orderBy: { startsOn: 'asc' },
    })) as Row[];
    const others = rows.filter((r) => r.userId !== reader.userId);
    const people = await this.directory(reader.organizationId, others);
    const names = await this.names(others);
    return others
      .filter((r) => people.get(r.userId)?.department?.trim() === mine)
      .map((r) => ({ name: names.get(r.userId)?.first ?? '', startsOn: dayOf(r.startsOn), endsOn: dayOf(r.endsOn) }))
      .filter((r) => r.name);
  }

  /** Each person's own requests and days left. Nobody else's. */
  async mine(reader: Reader, today = new Date()): Promise<MyLeave> {
    const ask = await askNameOf(this.prisma, reader.organizationId);
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    if (!role || role === 'GUEST') throw new ForbiddenException(LEAVE_REFUSED.notInIt);
    const rows = (await this.prisma.leaveRequest.findMany({
      where: { organizationId: reader.organizationId, userId: reader.userId },
      orderBy: { startsOn: 'desc' },
    })) as Row[];
    const names = await this.names(rows);
    const people = await this.directory(reader.organizationId, rows);
    const questions = await this.questionsOn(reader.organizationId, rows.map((r) => r.id));
    const firsts = await this.firstNames([...questions.flatMap((q) => [q.askedById, q.toUserId]), ...rows.map((r) => r.decidedById ?? '')]);
    const where = new Map<string, string>();
    for (const r of rows) {
      const now = r.status === 'waiting' ? await this.now(r, people, answers) : null;
      where.set(r.id, whereYourRequestIs(`Your ${leaveInWords(dayOf(r.startsOn), dayOf(r.endsOn))}`, await this.whereItStands(r, now, undefined, reader.userId)));
    }
    const kinds = (answers.rules.kinds ?? []).map((k) => ({
      key: k.key, name: k.name, perYear: k.days,
      daysLeft: this.daysLeftOf(answers, k, rows.filter((r) => r.status === 'approved'), today.getUTCFullYear()),
    }));
    const perYear = kinds.length ? kinds[0].perYear : answers.perYear;
    const daysLeft = kinds.length ? kinds[0].daysLeft : this.daysLeft(answers.perYear, rows.filter((r) => r.status === 'approved'), today.getUTCFullYear());
    return {
      daysLeftSaid: daysOfLeaveLeftSaid({ perYear, daysLeft, kinds }, 'Groundwork'),
      /* With kinds set, the first kind's (the one taken when somebody does not say); otherwise as before. */
      perYear: kinds.length ? kinds[0].perYear : answers.perYear,
      daysLeft: kinds.length ? kinds[0].daysLeft : this.daysLeft(answers.perYear, rows.filter((r) => r.status === 'approved'), today.getUTCFullYear()),
      kinds,
      requests: rows.map((r) => ({
        id: r.id,
        startsOn: dayOf(r.startsOn),
        endsOn: dayOf(r.endsOn),
        days: workingDays(r.startsOn, r.endsOn),
        status: (r.status as 'waiting' | 'approved' | 'declined'),
        standIn: r.standInUserId ? names.get(r.standInUserId)?.full ?? null : null,
        leaveKind: theKindOf(r.kind, answers.rules)?.name ?? null,
        where: where.get(r.id) ?? '',
        questions: questions.filter((q) => q.ref === r.id).flatMap((q) => aQuestionSaid(q, firsts, reader.userId, ask)),
        questionWaiting: (() => {
          const q = r.status === 'waiting' ? questions.filter((x) => x.ref === r.id && x.answer == null && x.toUserId === reader.userId).pop() : undefined;
          return q ? { id: q.id, question: q.question, askedBy: firsts.get(q.askedById) || 'The person who decides it' } : null;
        })(),
        declinedBecause: r.status === 'declined' && r.declineReason?.trim()
          ? aReasonSaid(r.decidedById ? (firsts.get(r.decidedById) || 'The person who decided it') : 'The person who decided it', r.declineReason)
          : null,
      })),
    };
  }

  /**
   * The approver of the step it is on decides. Only while it is waiting. An approval at a step that is
   * not the last moves it to the next step, and whoever decides that one is told; only the last step's
   * approval, or a decline at any step, ends it, and then the person who asked is told.
   */
  async decide(reader: Reader, id: string, outcome: 'approved' | 'declined', reasonGiven?: unknown, how: ADecisionHow = {}) {
    /* A reason may go with a decline (decision 85, build step 7), and is told to the person. */
    const reason = outcome === 'declined' ? wordsGiven(reasonGiven) : null;
    if (reason === 'too long') throw new BadRequestException(QUESTION_REFUSED.tooLong);
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } })) as Row | null;
    if (!row || row.organizationId !== reader.organizationId) throw new NotFoundException(LEAVE_REFUSED.notFound);
    const people = await this.directory(reader.organizationId, [row]);
    const now = await this.now(row, people, answers);
    if (row.userId === reader.userId || !decidesIt(now.who, { userId: reader.userId, role }, row.userId)) throw new ForbiddenException(LEAVE_REFUSED.notYours);
    if (row.status !== 'waiting') throw new BadRequestException(LEAVE_REFUSED.alreadyDecided);
    const approvedByIds = [...(row.approvedByIds ?? []), ...(outcome === 'approved' ? [reader.userId] : [])];
    /*
     * ONE ANSWER WINS (a-request-is-answered-once.ts). What this answer would do is worked out first and nothing is written
     * or recorded until the write that keeps it has found the request still waiting where it was read.
     */
    const here = whereItIsNow(row);
    const decided = () => recordIt(this.prisma, { organizationId: row.organizationId, suite: 'leave', ref: id, kind: outcome, byUserId: reader.userId, step: now.step, basis: { row: 'leave_requests', id, ...(reason ? { withAReason: true } : {}), ...(now.who.kind === 'person' && now.who.standingInFor ? { standingInFor: now.who.standingInFor } : {}) } });
    let passed: APassedStep[] = [];
    if (outcome === 'approved' && !now.last) {
      /* The next step, unless whoever decides it has already approved it: then that step is passed too (who-may-decide.ts). */
      const moved = await this.passOnFrom(row, people, answers, { step: now.step + 1, escalatedTo: 0 }, approvedByIds, false);
      if (!moved.done) {
        const next = { ...row, step: moved.where.step, escalatedTo: moved.where.escalatedTo, stepSince: new Date(), approvedByIds };
        if (!(await claimIt(this.prisma.leaveRequest, here, { step: next.step, escalatedTo: next.escalatedTo, stepSince: next.stepSince, approvedByIds }))) {
          throw await theyGotThereFirst(this.prisma, this.prisma.leaveRequest, id, reader.userId);
        }
        await decided();
        await this.recordPassed(row, moved.passed);
        await this.tellWhoDecides(next, people, answers, {}, how.collect);
        return (how.lean ? undefined : await this.board(reader)) as Awaited<ReturnType<LeaveBoardService['board']>>;
      }
      passed = moved.passed;
    }
    if (!(await this.claimTheEnd(row, here, outcome, reader.userId, approvedByIds, reason))) throw await theyGotThereFirst(this.prisma, this.prisma.leaveRequest, id, reader.userId);
    await decided();
    await this.recordPassed(row, passed);
    await this.afterTheEnd(row, outcome, reader.userId, answers, reason);
    return (how.lean ? undefined : await this.board(reader)) as Awaited<ReturnType<LeaveBoardService['board']>>;
  }

  /** It ends: approved at the last step, or declined at any. False when somebody answered it first. */
  private claimTheEnd(row: Row, here: ReturnType<typeof whereItIsNow>, outcome: 'approved' | 'declined', byUserId: string, approvedByIds: string[], reason?: string | null): Promise<boolean> {
    return claimIt(this.prisma.leaveRequest, here, { status: outcome, decidedById: byUserId, decidedAt: new Date(), approvedByIds, ...(reason ? { declineReason: reason } : {}) });
  }

  /** After it ended: the person is told, and HR when the admin chose that. */
  private async afterTheEnd(row: Row, outcome: 'approved' | 'declined', byUserId: string, answers: { rules: LeaveRules }, reason?: string | null): Promise<void> {
    await this.tellThePerson(row, outcome, byUserId, reason);
    if (outcome === 'approved' && answers.rules.tellHr) await this.recordHrTold(row);
    /* A question still waiting for the person's answer in Ask Groundwork is no longer asked. */
    await this.forgetTheQuestionsInAskGroundwork(row);
  }

  /** It ends, from the clock: true when this was the answer kept. */
  private async finish(row: Row, outcome: 'approved' | 'declined', byUserId: string, approvedByIds: string[], answers: { rules: LeaveRules }): Promise<boolean> {
    if (!(await this.claimTheEnd(row, whereItIsNow(row), outcome, byUserId, approvedByIds))) return false;
    await this.afterTheEnd(row, outcome, byUserId, answers);
    return true;
  }

  /**
   * Where a request goes from here: the step and rule given, passing each step whose approver has
   * already approved it at an earlier step, with "Omar had already approved it, so this step was
   * passed." kept in the record for each.
   */
  private async passOnFrom(row: Row, people: Map<string, any>, answers: { approver: string | null; workflow?: AWorkflow; rules?: LeaveRules }, from: { step: number; escalatedTo: number }, approvedByIds: string[], record = true, shared: { lookups?: Lookups; on?: Date } = {}) {
    const moved = await passWhatTheyAlreadyApproved(this.prisma, theStepsFor('leave', answers, workingDays(row.startsOn, row.endsOn)), {
      organizationId: row.organizationId, requesterUserId: row.userId,
      managerExternalId: people.get(row.userId)?.managerExternalId ?? null, team: people.get(row.userId)?.department ?? null,
    }, from, approvedByIds, shared);
    if (record) await this.recordPassed(row, moved.passed);
    return moved;
  }

  private async recordPassed(row: { id: string; organizationId: string }, passed: APassedStep[]): Promise<void> {
    for (const p of passed) {
      await recordIt(this.prisma, { organizationId: row.organizationId, suite: 'leave', ref: row.id, kind: 'passed', toUserId: p.userId, step: p.step, basis: { row: 'leave_requests', id: row.id, alreadyApproved: true } });
    }
  }

  /**
   * ASK A QUESTION (decision 85, item 1; build step 7). Whoever decides the request now asks the person
   * who made it, and the request keeps waiting. The person is told under their own leave, on Today, in
   * Ask Groundwork the next time they write there, and on WhatsApp.
   */
  async askAQuestion(reader: Reader, id: string, questionGiven: unknown) {
    const question = wordsGiven(questionGiven);
    if (!question) throw new BadRequestException(QUESTION_REFUSED.emptyQuestion);
    if (question === 'too long') throw new BadRequestException(QUESTION_REFUSED.tooLong);
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } })) as Row | null;
    if (!row || row.organizationId !== reader.organizationId) throw new NotFoundException(LEAVE_REFUSED.notFound);
    const people = await this.directory(reader.organizationId, [row]);
    const now = await this.now(row, people, answers);
    if (row.userId === reader.userId || !decidesIt(now.who, { userId: reader.userId, role }, row.userId)) throw new ForbiddenException(QUESTION_REFUSED.notYours);
    if (row.status !== 'waiting') throw new BadRequestException(QUESTION_REFUSED.notWaiting);
    const table = (this.prisma as any).suiteQuestion;
    const q = await table.create({
      data: { organizationId: row.organizationId, suite: 'leave', ref: id, askedById: reader.userId, toUserId: row.userId, question },
      select: { id: true },
    });
    await recordIt(this.prisma, { organizationId: row.organizationId, suite: 'leave', ref: id, kind: 'questioned', byUserId: reader.userId, toUserId: row.userId, step: now.step, basis: { row: 'suite_questions', id: q.id } });
    /* Ask Groundwork holds it for the person's answer: the next thing they write there is said back as their answer. */
    const entry = await theirRosterEntry(this.prisma, row.organizationId, row.userId, { externalId: true }).catch(() => null);
    if (entry?.externalId && (this.prisma as any).assistantProposal?.create) {
      const asker = (await this.firstNames([reader.userId])).get(reader.userId) || 'The person who decides it';
      await (this.prisma as any).assistantProposal.create({
        data: {
          organizationId: row.organizationId, personExternalId: entry.externalId, kind: LEAVE_QUESTION_KIND,
          summary: `${asker} asked you a question about your ${leaveInWords(dayOf(row.startsOn), dayOf(row.endsOn))}.`,
          payload: { requestId: id, questionId: q.id } as never,
        },
      }).catch(() => undefined);
    }
    if (this.told) {
      const first = await this.told.firstNameOf(row.userId);
      await this.told.asked(row.organizationId, aLeaveRequest(row.id, row.userId, first, dayOf(row.startsOn), dayOf(row.endsOn)), reader.userId, question).catch(() => false);
    }
    return this.board(reader);
  }

  /**
   * THE PERSON ANSWERS (decision 85, build step 7): the latest question still waiting for them on their
   * own request. Only the person who asked for the leave answers; the request keeps waiting, and
   * whoever asked is told on WhatsApp.
   */
  async answerAQuestion(reader: Reader, id: string, answerGiven: unknown): Promise<MyLeave> {
    const answer = wordsGiven(answerGiven);
    if (!answer) throw new BadRequestException(QUESTION_REFUSED.emptyAnswer);
    if (answer === 'too long') throw new BadRequestException(QUESTION_REFUSED.tooLong);
    await this.suiteAnswers(reader.organizationId);
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } })) as Row | null;
    if (!row || row.organizationId !== reader.organizationId) throw new NotFoundException(LEAVE_REFUSED.notFound);
    if (row.userId !== reader.userId) throw new ForbiddenException(QUESTION_REFUSED.onlyThePerson);
    if (row.status !== 'waiting') throw new BadRequestException(QUESTION_REFUSED.notWaiting);
    const waiting = (await this.questionsOn(reader.organizationId, [id])).filter((q) => q.answer == null && q.toUserId === reader.userId).pop();
    if (!waiting) throw new BadRequestException(QUESTION_REFUSED.nothingToAnswer);
    await (this.prisma as any).suiteQuestion.update({ where: { id: waiting.id }, data: { answer, answeredAt: new Date() } });
    await recordIt(this.prisma, { organizationId: row.organizationId, suite: 'leave', ref: id, kind: 'answered', byUserId: reader.userId, toUserId: waiting.askedById, basis: { row: 'suite_questions', id: waiting.id } });
    await this.forgetTheQuestionsInAskGroundwork(row);
    if (this.told) {
      const first = await this.told.firstNameOf(row.userId);
      await this.told.answered(row.organizationId, waiting.askedById, aLeaveRequest(row.id, row.userId, first, dayOf(row.startsOn), dayOf(row.endsOn)), answer).catch(() => false);
    }
    return this.mine(reader);
  }

  /** The question waiting for this person's answer on one request, for Ask Groundwork. Null when none waits. */
  async questionWaitingFor(reader: Reader, id: string): Promise<{ askedBy: string; leave: string; question: string } | null> {
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } }).catch(() => null)) as Row | null;
    if (!row || row.organizationId !== reader.organizationId || row.userId !== reader.userId || row.status !== 'waiting') return null;
    const q = (await this.questionsOn(reader.organizationId, [id])).filter((x) => x.answer == null && x.toUserId === reader.userId).pop();
    if (!q) return null;
    const askedBy = (await this.firstNames([q.askedById])).get(q.askedById) || 'The person who decides it';
    return { askedBy, leave: leaveInWords(dayOf(row.startsOn), dayOf(row.endsOn)), question: q.question };
  }

  /**
   * Who a request waits for now, in words, for the approver who has just approved a step ("Omar in
   * finance"), or null when it no longer waits.
   */
  async nowWaitingFor(organizationId: string, id: string): Promise<string | null> {
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } }).catch(() => null)) as Row | null;
    if (!row || row.organizationId !== organizationId || row.status !== 'waiting') return null;
    const answers = await this.suiteAnswers(organizationId);
    const now = await this.now(row, await this.directory(organizationId, [row]), answers);
    return whoInWords(this.prisma, now.who, now.team);
  }

  /**
   * Once a day (a-request-waits-too-long.cron.ts): each request that has waited the set number of
   * working days for one person, or whose approver is on approved leave today, moves to the next rule
   * on its step's list, and whoever that names is told. Nothing moves while the admin has set no days.
   */
  async passOnWhatWaitsTooLong(organizationId: string, today = new Date(), collect?: { approverUserIds: string[]; request: AWaitingRequest }[]): Promise<PassedOn[]> {
    const answers = await this.suiteAnswers(organizationId).catch(() => null);
    if (!answers?.workflow?.escalateAfter) return [];
    const rows = (await this.prisma.leaveRequest.findMany({ where: { organizationId, status: 'waiting' } })) as (Row & { askedAt?: Date })[];
    if (!rows.length) return [];
    const people = await this.directory(organizationId, rows);
    /* Who decides each request is worked out in memory from what is read once, for the day the clock is run for. */
    const shared = { lookups: (await loadLookups(this.prisma, organizationId, today).catch(() => undefined)) as Lookups | undefined, on: today };
    const out: PassedOn[] = [];
    const toTell: { approverUserIds: string[]; request: AWaitingRequest }[] = [];
    for (const r of rows) {
      const n = await whoComesNext(this.prisma, theStepsFor('leave', answers, workingDays(r.startsOn, r.endsOn)), {
        organizationId, requesterUserId: r.userId,
        managerExternalId: people.get(r.userId)?.managerExternalId ?? null, team: people.get(r.userId)?.department ?? null,
      }, r, shared);
      if (!n) continue;
      const why = await whyPassOn(this.prisma, organizationId, n.now, r.stepSince ?? r.askedAt ?? today, today, answers.workflow.escalateAfter, shared.lookups);
      if (!why) continue;
      /* Passed to somebody who already approved it at an earlier step: that step is passed for them. */
      const after = await this.passOnFrom(r, people, answers, { step: n.now.step, escalatedTo: n.next.at }, r.approvedByIds ?? [], false, shared);
      const escalated = () => recordIt(this.prisma, {
        organizationId, suite: 'leave', ref: r.id, kind: 'escalated', step: n.now.step, toUserId: n.next.who.kind === 'admin' ? null : n.next.who.userId,
        basis: { row: 'leave_requests', id: r.id, fromUserId: n.now.who.kind === 'admin' ? null : n.now.who.userId, ...why },
      });
      if (after.done) {
        /* Written only if the request is still waiting where it was read: an answer given a moment ago wins, and the clock passes nothing on. */
        if (!(await this.finish(r, 'approved', after.passed[after.passed.length - 1].userId, r.approvedByIds ?? [], answers))) continue;
        await escalated();
        await this.recordPassed(r, after.passed);
        out.push({ ref: r.id, step: n.now.step, from: n.now.who, to: n.next.who, why });
        continue;
      }
      const moved = { ...r, step: after.where.step, escalatedTo: after.where.escalatedTo, stepSince: today };
      if (!(await claimIt(this.prisma.leaveRequest, whereItIsNow(r), { ...(after.passed.length ? { step: moved.step } : {}), escalatedTo: moved.escalatedTo, stepSince: today }))) continue;
      await escalated();
      await this.recordPassed(r, after.passed);
      await this.tellWhoDecides(moved, people, answers, shared, toTell);
      out.push({ ref: r.id, step: n.now.step, from: n.now.who, to: n.next.who, why });
    }
    /* Whoever many were passed on to is written to once; whoever one was passed on to, as before. */
    /* Told together with what the other suites passed on at the same time, when the clock is collecting (a-request-waits-too-long.cron.ts). */
    if (collect) collect.push(...toTell); else await this.tellThemTogether(organizationId, toTell, today);
    return out;
  }

  /**
   * One request's record of who did what, in plain sentences (decision 85, build step 5), for the
   * people who may already read it: the person who asked, an admin, a lead of their team, and whoever
   * decides it now. Anybody else is told it was not found.
   */
  async history(reader: Reader, id: string): Promise<{ said: string[] }> {
    const answers = await this.suiteAnswers(reader.organizationId);
    const role = await this.roleOf(reader);
    const row = (await this.prisma.leaveRequest.findUnique({ where: { id } })) as Row | null;
    if (!row || row.organizationId !== reader.organizationId || !role) throw new NotFoundException(LEAVE_REFUSED.notFound);
    const people = await this.directory(reader.organizationId, [row]);
    const mayRead = row.userId === reader.userId || role === 'ADMIN'
      || (role === 'LEAD' && (await this.theLeadsTeam(reader, people))(row.userId))
      || (row.status === 'waiting' && decidesIt((await this.now(row, people, answers)).who, { userId: reader.userId, role }, row.userId));
    if (!mayRead) throw new NotFoundException(LEAVE_REFUSED.notFound);
    return aRequestsHistory(this.prisma, reader.organizationId, 'leave', id, reader.userId);
  }

  /**
   * What the clock passed on is told together: an approver whom one request was passed on to is told of it, as before, and one whom
   * several were passed on to is written to once for all of them (a-request-told-on-whatsapp.service.ts). A sender that cannot say it
   * together tells each, as it always did.
   */
  private async tellThemTogether(organizationId: string, batch: { approverUserIds: string[]; request: AWaitingRequest }[], today: Date): Promise<void> {
    if (!this.told || !batch.length) return;
    try {
      if (typeof this.told.waitingMany === 'function') await this.told.waitingMany(organizationId, batch, today);
      else for (const b of batch) await this.told.waiting(organizationId, b.approverUserIds, b.request);
    } catch { /* the requests stand */ }
  }

  /** Whoever decides the step a request is on is told on WhatsApp (decision 82, item 1). */
  async tellWhoDecides(row: Row, people?: Map<string, any>, answers?: { perYear: number | null; approver: string | null; workflow?: AWorkflow; rules?: LeaveRules }, shared: { lookups?: Lookups; on?: Date } = {}, batch?: { approverUserIds: string[]; request: AWaitingRequest }[]): Promise<void> {
    if (!this.told) return;
    try {
      const a = answers ?? (await this.suiteAnswers(row.organizationId));
      const now = await this.now(row, people ?? (await this.directory(row.organizationId, [row])), a, shared);
      const first = await this.told.firstNameOf(row.userId);
      const approverUserIds = await this.told.approversOf(row.organizationId, now.who, row.userId);
      const request = aLeaveRequest(row.id, row.userId, first, dayOf(row.startsOn), dayOf(row.endsOn));
      /* Passed on by the clock with others: collected, and told together at the end, so an approver is not told once for each. */
      if (batch) { batch.push({ approverUserIds, request }); return; }
      await this.told.waiting(row.organizationId, approverUserIds, request);
    } catch { /* the request stands */ }
  }

  /** The person who asked is told what was decided, on WhatsApp (decision 82, item 1). True when it went. */
  async tellThePerson(row: { id: string; organizationId: string; userId: string; startsOn: Date; endsOn: Date }, outcome: 'approved' | 'declined', deciderUserId: string, reason?: string | null): Promise<boolean> {
    if (!this.told) return false;
    const first = await this.told.firstNameOf(row.userId);
    const request = aLeaveRequest(row.id, row.userId, first, dayOf(row.startsOn), dayOf(row.endsOn));
    return (reason ? this.told.decided(row.organizationId, request, outcome, deciderUserId, reason) : this.told.decided(row.organizationId, request, outcome, deciderUserId)).catch(() => false);
  }

  /**
   * A request for time off, as the engine will record it once the person has confirmed it
   * (docs/requests-to-engine.md, request 21). There is no route for it: nobody fills in a form.
   */
  async ask(organizationId: string, userId: string, input: { startsOn: Day; endsOn: Day; standInUserId?: string | null; proposalId?: string | null; kind?: string | null }) {
    return oneAtATime(`leave|${organizationId}|${userId}|${input.startsOn}|${input.endsOn}`, () => this.askOnce(organizationId, userId, input));
  }

  private async askOnce(organizationId: string, userId: string, input: { startsOn: Day; endsOn: Day; standInUserId?: string | null; proposalId?: string | null; kind?: string | null }) {
    const answers = await this.suiteAnswers(organizationId);
    /* The kind of leave (build step 8): one the admin set, or the first when none is said. No kinds set: as before. */
    const kinds = answers.rules.kinds ?? [];
    if (input.kind && kinds.length && !kinds.some((k) => k.key === input.kind)) throw new BadRequestException(LEAVE_REFUSED.badKind);
    const kind = kinds.length ? (input.kind || kinds[0].key) : null;
    const role = await this.roleOf({ userId, organizationId });
    if (!role || role === 'GUEST') throw new ForbiddenException(LEAVE_REFUSED.notInIt);
    const ok = /^\d{4}-\d{2}-\d{2}$/;
    if (!ok.test(input.startsOn ?? '') || !ok.test(input.endsOn ?? '')) throw new BadRequestException(LEAVE_REFUSED.badDates);
    const startsOn = atMidnight(input.startsOn);
    const endsOn = atMidnight(input.endsOn);
    if (Number.isNaN(startsOn.getTime()) || Number.isNaN(endsOn.getTime()) || endsOn < startsOn) throw new BadRequestException(LEAVE_REFUSED.badDates);
    const standIn = input.standInUserId ?? null;
    if (standIn) {
      const theirs = await this.roleOf({ userId: standIn, organizationId });
      if (standIn === userId || !theirs || theirs === 'GUEST') throw new BadRequestException(LEAVE_REFUSED.badStandIn);
    }
    /* The only admin cannot decide their own leave, and nobody else could: said now, not after it has waited for ever. */
    const me = await theirRosterEntry(this.prisma, organizationId, userId, { managerExternalId: true, department: true }).catch(() => null);
    if (await nobodyElseCanDecide(this.prisma, theStepsFor('leave', answers, workingDays(startsOn, endsOn)), { organizationId, requesterUserId: userId, managerExternalId: (me as any)?.managerExternalId ?? null, team: (me as any)?.department ?? null }, role)) {
      throw new BadRequestException(NOBODY_ELSE_CAN_DECIDE);
    }
    /* The same request while the first still waits is that request (B-147): nothing new is made and the approver hears once. */
    const already = await (this.prisma.leaveRequest as any).findFirst?.({ where: { organizationId, userId, startsOn, endsOn, status: 'waiting' }, select: { id: true } }).catch(() => null);
    if (already?.id) return { id: already.id };
    const created = await this.prisma.leaveRequest.create({
      data: { organizationId, userId, startsOn, endsOn, standInUserId: standIn, ...(kind ? { kind } : {}) },
      select: { id: true },
    });
    /* HR is told of each request when the admin chose that (build step 8). */
    if (created?.id && answers.rules.tellHr === 'every') await this.recordHrTold({ id: created.id, organizationId, userId });
    /* One record of who did what (decision 85, build step 5): asked, after the say-back and the yes when there was one. */
    if (created?.id) await recordIt(this.prisma, { organizationId, suite: 'leave', ref: created.id, kind: 'asked', byUserId: userId, basis: { row: 'leave_requests', id: created.id, ...(input.proposalId ? { proposalId: input.proposalId } : {}) } });
    /* Whoever decides the first step is told on WhatsApp too (decision 82, item 1). */
    if (this.told && created?.id) {
      await this.tellWhoDecides({ id: created.id, organizationId, userId, startsOn, endsOn, kind: kind ?? 'annual', standInUserId: standIn, status: 'waiting', decidedById: null, decidedAt: null });
    }
    return created;
  }

  // ---------------------------------------------------------------------------------------------

  /** The questions asked on these requests, oldest first. A test built by hand may have no table. */
  private async questionsOn(organizationId: string, ids: string[]): Promise<(AQuestion & { ref: string })[]> {
    const table = (this.prisma as any).suiteQuestion;
    if (!ids.length || !table?.findMany) return [];
    return ((await table.findMany({ where: { organizationId, suite: 'leave', ref: { in: ids } }, orderBy: { askedAt: 'asc' } }).catch(() => [])) ?? []) as (AQuestion & { ref: string })[];
  }

  /** First names of sign-ins, by id. Never an address. */
  private async firstNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map();
    const us = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, firstName: true } }).catch(() => []);
    return new Map((us ?? []).map((u: any) => [u.id, u.firstName?.trim() || '']));
  }

  /** The person's question in Ask Groundwork is no longer waiting: answered, or the request decided. */
  private async forgetTheQuestionsInAskGroundwork(row: { id: string; organizationId: string; userId: string }) {
    const table = (this.prisma as any).assistantProposal;
    if (!table?.updateMany) return;
    const entry = await theirRosterEntry(this.prisma, row.organizationId, row.userId, { externalId: true }).catch(() => null);
    if (!entry?.externalId) return;
    await table.updateMany({
      where: { organizationId: row.organizationId, personExternalId: entry.externalId, kind: LEAVE_QUESTION_KIND, state: 'PARKED', payload: { path: ['requestId'], equals: row.id } },
      data: { state: 'DROPPED', resolvedAt: new Date() },
    }).catch(() => undefined);
  }

  /**
   * Days left of one kind of leave, counting only approved requests of that kind; with no kinds set,
   * the suite's one number of days and every approved request, as before.
   */
  private daysLeftOf(answers: { perYear: number | null; rules: LeaveRules }, kind: ALeaveKind | null, approved: Row[], year: number): number | null {
    if (!kind) return this.daysLeft(answers.perYear, approved, year);
    return this.daysLeft(kind.days, approved.filter((a) => theKindOf(a.kind, answers.rules)?.key === kind.key), year);
  }

  /** The leave rules that apply to one request already sent, for whoever reads it on the board. */
  private async theRulesFor(rules: LeaveRules, r: Row, kind: ALeaveKind | null, reader: { name: string }, today: Date): Promise<string[]> {
    if (!rules.noticeDays && !rules.blackouts?.length && !rules.eligibleAfterDays && !kind?.noticeDays && !kind?.document) return [];
    const since = rules.eligibleAfterDays ? await hereSince(this.prisma, r.organizationId, r.userId).catch(() => null) : null;
    return theRulesThatApply(rules, {
      kind, startsOn: dayOf(r.startsOn), endsOn: dayOf(r.endsOn), days: workingDays(r.startsOn, r.endsOn),
      askedOn: dayOf(r.askedAt ?? today), hereSince: since,
    }, reader);
  }

  /**
   * HR is told (build step 8): the request is on the leave board of whoever holds the HR duty, and the
   * record says so. Nothing goes to their phone until a template for it is approved
   * (docs/whatsapp-templates.md). Nobody named for HR: nothing.
   */
  private async recordHrTold(row: { id: string; organizationId: string; userId: string }): Promise<void> {
    const hr = (await readDuties(this.prisma, row.organizationId).catch(() => ({} as { hr?: string }))).hr;
    if (!hr || hr === row.userId) return;
    await recordIt(this.prisma, { organizationId: row.organizationId, suite: 'leave', ref: row.id, kind: 'told', toUserId: hr, basis: { row: 'leave_requests', id: row.id, onTheBoard: 'hr' } });
  }

  private daysLeft(perYear: number | null, approved: Row[], year: number): number | null {
    if (perYear == null) return null;
    const used = approved.reduce((n, r) => n + workingDaysIn(year, r.startsOn, r.endsOn), 0);
    return Math.max(0, perYear - used);
  }

  /** Who decides this request now, from the step it is on, by the one approval resolver (who-may-decide.ts). */
  private now(r: Row, people: Map<string, any>, answers: { approver: string | null; workflow?: AWorkflow; rules?: LeaveRules }, shared: { lookups?: Lookups; on?: Date } = {}): Promise<DecidesNow> {
    /* Leave by length (the-leave-rules.ts): the request's working days choose the steps. No thresholds: as before. */
    return whoDecidesNow(this.prisma, theStepsFor('leave', answers, workingDays(r.startsOn, r.endsOn)), {
      organizationId: r.organizationId, requesterUserId: r.userId,
      managerExternalId: people.get(r.userId)?.managerExternalId ?? null, team: people.get(r.userId)?.department ?? null,
    }, r, shared);
  }

  /** Who approved it so far, who it waits for now and who declined it, as names; "you" for the reader. */
  private async whereItStands(r: Row, now: DecidesNow | null, readerDecides: string | undefined, readerUserId: string, cache?: Map<string, string>): Promise<WhereItStands> {
    const approvedBy = await firstNamesOf(this.prisma, approversOf(r), readerUserId, cache);
    const status = r.status as WhereItStands['status'];
    return {
      status, approvedBy,
      waitingFor: status === 'waiting' && now ? (readerDecides ? 'you' : await whoInWords(this.prisma, now.who, now.team, readerUserId, cache)) : null,
      declinedBy: status === 'declined' && r.decidedById ? (await firstNamesOf(this.prisma, [r.decidedById], readerUserId, cache))[0] ?? null : null,
    };
  }

  private async theLeadsTeam(reader: Reader, people: Map<string, { externalId: string; department: string | null; managerExternalId: string | null }>) {
    const me = await theirRosterEntry(this.prisma, reader.organizationId, reader.userId, { externalId: true, department: true });
    return (userId: string) => {
      const p = people.get(userId);
      return !!me && !!p && inTheLeadsTeam(me, p);
    };
  }

  private async suiteAnswers(organizationId: string): Promise<{ perYear: number | null; approver: string | null; workflow?: AWorkflow; rules: LeaveRules }> {
    const suite = await this.prisma.organizationSuite.findUnique({
      where: { organizationId_suite: { organizationId, suite: 'leave' } },
      select: { isOn: true, answers: true },
    });
    if (!suite?.isOn) throw new NotFoundException(LEAVE_REFUSED.notOn);
    const a = (suite.answers ?? {}) as Record<string, unknown>;
    return {
      perYear: typeof a.days === 'number' ? a.days : null,
      approver: typeof a.approver === 'string' ? a.approver : null,
      /* The steps an admin set (the-approval-steps.ts). None: one step, as before. */
      workflow: await readWorkflow(this.prisma, organizationId, 'leave'),
      /* The leave rules an admin set (the-leave-rules.ts). None: exactly as before. */
      rules: await readLeaveRules(this.prisma, organizationId),
    };
  }

  private async roleOf(reader: Reader): Promise<string | null> {
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: reader.userId, organizationId: reader.organizationId } },
      select: { role: true },
    });
    return m?.role ?? null;
  }

  /** The directory entry of each person a request is about, by user id. */
  private async directory(organizationId: string, rows: Row[]) {
    /* Linked entries, and entries matched to their sign-in by address (a-roster-entry-and-its-sign-in.ts). */
    const ps = await theirRosterEntries(this.prisma, organizationId, rows.map((r) => r.userId), { externalId: true, department: true, managerExternalId: true });
    return new Map([...ps].map(([userId, p]) => [userId, { externalId: p.externalId as string, department: p.department as string | null, managerExternalId: p.managerExternalId as string | null }]));
  }

  /** First and full names, for the people and the stand-ins on these requests. Never an address. */
  private async names(rows: Row[]) {
    const ids = [...new Set(rows.flatMap((r) => [r.userId, r.standInUserId]).filter((x): x is string => !!x))];
    const us = ids.length
      ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    return new Map(us.map((u) => [u.id, {
      first: u.firstName?.trim() || '',
      full: [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
    }]));
  }
}
