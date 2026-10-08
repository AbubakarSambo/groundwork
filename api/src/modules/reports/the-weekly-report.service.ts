import { aGroundIsTheAnchors } from '../conversation/the-anchor-weekly-check-in';
import { anAimTheHolderSet } from '../board/an-aim-is-a-sentence-about-somebody';
import { refuseSomeoneHeldForASeat, refuseSomeoneAwaitingTheOrganisation } from '../participants/held-for-a-seat';
import { CANNOT_READ_THE_REPORT_YET } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';
import { whoIsNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { asADirection } from '../board/an-aim-or-a-limit';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CheckInStatus, PartyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { whatTheyMayRead, type Viewer } from '../grounds/who-may-read-this-check-in';
import { labelsForParties, namesVisibleTo, viewerLabelOf, withNames } from './party-labels';
import { peersAreNamedOn } from './peers-are-named';
import { whatEachLabelIsCalled, withoutInternalLabelsIn } from './no-internal-label-reaches-anyone';
import { theSentenceAbout, theSentenceIsSafe, theWeekOf, type AWeeksLine } from './the-weekly-sentence-about-each-person';
import { awayUntilOn, fallsInLeave, leaveOfThePeopleOn, type Stretch } from '../suites/who-is-away';
import { howSolid } from './a-figure-nobody-can-check-says-so';
import { whatMoreThanOnePersonNamed } from './what-more-than-one-person-named';
import { whatTodayReads } from './what-today-reads-from-the-record';
import { inOurVoice } from './what-the-record-shows-over-time';
import { targetsFor } from '../board/whose-number-is-whose-business';
import { withoutWhatTheLeadHasNotToldThemAbout, theWordsOfWhatTheLeadHasNotToldThemAbout, theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { withoutGoalsNotToldIn } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { periodOf } from '../patterns/period-of';
import { PATTERN_ROW_SELECT, servedPatterns, runsItForAPattern } from '../patterns/who-reads-a-pattern';
import {
  theFactsIn, theSentencesIn, theWeeksHeading, whatThisReportIs, theCheckInsMade, theThingsWithProof, aTargetThisWeek,
  movedThisWeek, whatCameUpAcrossTheTeam, whatWasSaidAndWhatTheProofShows, aCommitmentThatSettled, aHandoffThatCleared,
  forTheLeadToDo, yourOwnToDo, whereItComesFrom, NOTHING_MOVED, NOTHING_DROPPED, NO_RESULT,
  type TheWeeksFacts, type AWeeksCount, type AWeeksCommitment, type AFigure, type AThingToDo, type WhatChanged,
} from './the-weekly-report';

export const NOTHING_YET_THIS_WEEK = 'No check-in has come in this week yet, so there is nothing to say yet about what people named.';

export interface TheWeeklySentences {
  weekStart: string | null;
  builtAt: Date | null;
  /** Said when there is nothing to show, so the page never has to guess why. */
  saying?: string;
  /** "This week, 21 to 23 Sep, so far", as the prototype heads the page. */
  heading?: string;
  /** The sentence under the heading. */
  whatThisIs?: string;
  /** The week in numbers: a figure, what it is of, and the same as a full sentence. */
  inNumbers?: AFigure[];
  /** Each person's sentence, as this reader may read it. A participant reads only their own. */
  eachPerson: { who: string; isYou: boolean; says: string }[];
  /** What came up in more than one person's check-in this week. Only for readers of the whole check-in. */
  acrossTheTeam?: string[];
  /** Things that happened in three check-ins in a row, under the rules every pattern is served by. */
  threeInARow?: { who: string; isYou: boolean; says: string }[];
  /** What people said, and what the proof shows. */
  saidAndProof?: string | null;
  /** What changed. Each list holds full sentences, or one sentence saying nothing did. */
  whatChanged?: WhatChanged;
  /** For you to do next week: for the person who runs the check-in, and for a person, their own. */
  forNextWeek?: AThingToDo[];
}

const fullNameOf = (p: any) => [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * THE NAMES COME OFF BEFORE ANYTHING IS KEPT. Some of what is kept was worded with names (what only
 * the lead can settle, from Today; what somebody is waiting for). Every name of a person in the
 * check-in is put back to that person's report label, so the row holds no name, and `withNames`
 * puts the names this reader may read back in when it is served.
 */
export function namesOffFor(parties: any[], labels: Map<string, string>): (text: string) => string {
  const firsts = parties.map((p) => (p.user?.firstName ?? '').trim()).filter(Boolean);
  const pairs: [string, string][] = [];
  for (const p of parties) {
    const label = labels.get(p.id);
    if (!label) continue;
    const first = (p.user?.firstName ?? '').trim();
    for (const n of [fullNameOf(p), (p.nameGiven ?? '').trim(), firsts.filter((f) => f === first).length === 1 ? first : '', (p.user?.lastName ?? '').trim()]) {
      if (n && n.length > 1) pairs.push([n, label]);
    }
  }
  pairs.sort((a, b) => b[0].length - a[0].length);
  return (text: string) => {
    let t = String(text ?? '');
    for (const [n, label] of pairs) t = t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escape(n)}(?![\\p{L}\\p{N}])`, 'gu'), label);
    return t;
  };
}

/**
 * THE WEEKLY REPORT, BUILT WHEN A CHECK-IN COMES IN AND SERVED AS STORED.
 * See the-weekly-report.ts for what each part says, and the-weekly-sentence-about-each-person.ts for
 * the sentence about each person.
 *
 * Built on the check-in event, after the session's report is written (ReportsListener), never on
 * opening (decision 7). Stored by label, without names. Who reads what goes through the one rule for
 * who may read a check-in: whoever runs it, and an admin of the organisation on an ordinary check-in,
 * read the whole check-in; a person in it reads only what is about them and the team's own counts; an
 * admin who was not given access to an evaluation check-in reads nothing at all (the check-in is
 * reported as not found, as everywhere else). What only the lead can settle is the lead's alone, and
 * patterns follow the pattern rule (three periods, the person first).
 */
@Injectable()
export class TheWeeklyReportService {
  private readonly logger = new Logger(TheWeeklyReportService.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(event: CheckInCompletedEvent) {
    /* Built at once, so a week is never empty while the session's report is still being written; the
       reports listener builds it again once that report is in, so what is kept reads the newest one. */
    await this.build(event.groundId).catch((err: any) =>
      this.logger.warn(`The weekly report for ${event.groundId} could not be built: ${err?.message}`),
    );
  }

  /** Works out this week's facts from the record and stores them. Safe to run again: it replaces this week's row. */
  async build(groundId: string, at: Date = new Date()) {
    const { start, key } = theWeekOf(at);
    const ground: any = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        initiatorId: true, cadence: true,
        participants: { select: { id: true, userId: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, roleAsDescribed: true, user: { select: { firstName: true, lastName: true, email: true } } } },
        objectives: { select: { id: true, name: true, target: true, count: true, direction: true, ownerParticipantId: true, setByParticipantId: true, isADecisionAboutAPerson: true } },
      } as any,
    });
    if (!ground) return null;
    const parties: any[] = ground.participants ?? [];
    const labels = labelsForParties(parties as any);
    const namesOff = namesOffFor(parties, labels);
    const done: any[] = await this.prisma.checkIn.findMany({
      where: { groundId, status: CheckInStatus.COMPLETED, completedAt: { gte: start } },
      select: { participantId: true, sessionNumber: true, completedAt: true, isSetup: true },
    } as any);
    const checkedIn = new Set(done.map((c) => c.participantId));
    const rows: any[] = await this.prisma.recordEntry.findMany({
      where: { participant: { groundId }, createdAt: { gte: start }, disputedAt: null },
      select: { participantId: true, type: true, text: true, anchoredDocumentId: true, recallBased: true },
    } as any);
    if (!checkedIn.size && !rows.length) return null;

    /*
     * WHO WAS ON LEAVE THIS WEEK (week 23): approved leave, by its dates only. Somebody away is not
     * written up as not having checked in, and a check-in that opened while they were away, or that
     * waits for them while they are away now, is not one of the check-ins due (found live, 1 October
     * 2026, item 6: the lead read "1 of the 5 check-ins due this week was made" with one of the five
     * belonging to somebody on leave all week).
     */
    const leave = await leaveOfThePeopleOn(this.prisma as any, [groundId]).catch(() => new Map<string, Stretch[]>());
    const awayThisWeek = (pid: string) => (leave.get(pid) ?? []).some((l) => l.from.getTime() <= at.getTime() && l.to.getTime() >= start.getTime());

    /* Somebody an admin has not let in yet cannot check in, so is neither due nor written up as absent (decision 77). */
    const notLetIn = await whoIsNotLetInYet(this.prisma, parties);

    /* THE SENTENCE ABOUT EACH PERSON. */
    const eachPerson: { participantId: string; says: string }[] = [];
    for (const p of parties) {
      const label = labels.get(p.id);
      if (!label) continue;
      const lines: AWeeksLine[] = rows
        .filter((r) => r.participantId === p.id)
        .map((r) => ({ text: String(r.text ?? ''), type: String(r.type), documented: !!r.anchoredDocumentId }));
      const here = checkedIn.has(p.id);
      /* The lead who ran it and did not check in this week is not someone the week is about. */
      if (p.partyType === PartyType.INITIATOR && !here && !lines.length) continue;
      if (notLetIn.has(p.id) && !here && !lines.length) continue;
      const says = theSentenceAbout({ label, checkedIn: here, lines, onLeave: awayThisWeek(p.id) });
      if (says && theSentenceIsSafe(says, { label, lines })) eachPerson.push({ participantId: p.id, says });
    }

    /* THE CHECK-INS DUE AND MADE: every check-in opened this week, and every one made this week. */
    const all: any[] = ((await (this.prisma.checkIn.findMany({
      where: { groundId },
      select: { participantId: true, sessionNumber: true, status: true, completedAt: true, availableFrom: true, createdAt: true, isSetup: true, isClarification: true, isSelfCorrection: true },
    } as any) as Promise<any[]>).catch(() => [])) ?? []) as any[];
    const inTheWeek = (d: any) => !!d && new Date(d).getTime() >= start.getTime() && new Date(d).getTime() <= at.getTime();
    const due = all.filter((c) => c && !c.isSetup && !c.isClarification && !c.isSelfCorrection && c.status !== undefined)
      .filter((c) => (c.status === CheckInStatus.COMPLETED && inTheWeek(c.completedAt)) || (c.status !== CheckInStatus.COMPLETED && inTheWeek(c.availableFrom ?? c.createdAt)))
      /* Not one that opened while its person was away, nor one that waits for somebody away now. */
      .filter((c) => c.status === CheckInStatus.COMPLETED
        || !(fallsInLeave(new Date(c.availableFrom ?? c.createdAt), leave.get(c.participantId) ?? []) || awayUntilOn(leave.get(c.participantId), at)))
      /* Nor one that waits for somebody an admin has not let in yet, who cannot make it (decision 77). */
      .filter((c) => c.status === CheckInStatus.COMPLETED || !notLetIn.has(c.participantId));
    const made = due.filter((c) => c.status === CheckInStatus.COMPLETED).length;

    /* WHAT WAS SAID, AND HOW MUCH OF IT HAS SOMETHING BEHIND IT. Never the rating of an answer. */
    const said = rows.filter((r) => String(r.type) !== 'SUCCESS_DEFINITION');
    const counts: AWeeksCount[] = parties.filter((p) => labels.get(p.id)).map((p) => {
      const mine = said.filter((r) => r.participantId === p.id);
      const how = mine.map((r) => howSolid({ text: String(r.text ?? ''), recallBased: r.recallBased !== false && !r.anchoredDocumentId }));
      return {
        participantId: p.id,
        said: mine.length,
        documented: mine.filter((r) => !!r.anchoredDocumentId).length,
        estimated: how.filter((h) => h === 'estimated').length,
        fromMemory: how.filter((h) => h === 'from-memory').length,
      };
    }).filter((c) => c.said > 0);

    /* THE TARGETS, AND WHERE EACH STOOD BEFORE THE WEEK. */
    const snaps: any[] = ((await ((this.prisma as any).groundObjectiveSnapshot?.findMany?.({
      where: { groundId }, select: { objectiveId: true, sessionNumber: true, count: true, takenAt: true },
    }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
    const targets = ((ground.objectives ?? []) as any[]).filter((o) => typeof o.count === 'number').map((o) => {
      const before = snaps.filter((s) => s.objectiveId === o.id && new Date(s.takenAt).getTime() < start.getTime())
        .sort((a, b) => b.sessionNumber - a.sessionNumber)[0];
      return {
        id: o.id, name: String(o.name ?? ''), target: typeof o.target === 'number' ? o.target : null,
        direction: asADirection(o.direction),
        ownerParticipantId: o.ownerParticipantId ?? null, isADecisionAboutAPerson: !!o.isADecisionAboutAPerson,
        /* A person's own aim, kept as theirs (decision 75, item 37). An earlier week without it reads as before. */
        setByTheHolder: anAimTheHolderSet(o, parties.find((p) => p.partyType === PartyType.INITIATOR)?.id ?? null),
        count: o.count, from: before ? before.count : null,
      };
    });

    /* WHAT MORE THAN ONE PERSON NAMED, by label. Names of people in the check-in are never a "thing". */
    const people = parties.filter((p) => labels.get(p.id)).map((p) => ({ who: labels.get(p.id)!, texts: said.filter((r) => r.participantId === p.id).map((r) => String(r.text ?? '')) }));
    const theirNames = parties.flatMap((p) => [fullNameOf(p), p.user?.firstName, p.user?.lastName, p.nameGiven].filter(Boolean) as string[]);
    const namedByMoreThanOne = whatMoreThanOnePersonNamed(people, theirNames).map((s) => ({ name: namesOff(s.name), who: s.who }));

    /* COMMITMENTS SETTLED THIS WEEK, AND THE ONES SAID THIS WEEK THAT ARE STILL OPEN. */
    const commitments: any[] = ((await ((this.prisma as any).groundCommitment?.findMany?.({
      where: { groundId }, select: { participantId: true, text: true, status: true, whenSaid: true, settledAt: true, createdAt: true },
    }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
    const asKept = (c: any): AWeeksCommitment => {
      const clause = inOurVoice(c.text);
      return { participantId: c.participantId ?? null, clause: clause ? namesOff(clause) : null, status: String(c.status ?? 'UNKNOWN').toUpperCase() as any, whenSaid: c.whenSaid ? namesOff(c.whenSaid) : null };
    };
    const settled = commitments.filter((c) => ['DONE', 'NOT_DONE', 'DROPPED'].includes(String(c.status).toUpperCase()) && inTheWeek(c.settledAt)).map(asKept);
    const open = commitments.filter((c) => String(c.status ?? 'UNKNOWN').toUpperCase() === 'UNKNOWN' && c.participantId && inTheWeek(c.createdAt)).map(asKept);

    /* WHAT STOPPED BEING IN SOMEBODY'S WAY THIS WEEK. */
    const deps: any[] = ((await ((this.prisma as any).groundDependency?.findMany?.({
      where: { groundId, status: 'CLEARED' }, select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, clearedAt: true },
    }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
    const cleared = deps.filter((d) => inTheWeek(d.clearedAt) && (d.what ?? '').trim())
      .map((d) => ({ fromParticipantId: d.fromParticipantId, onParticipantId: d.onParticipantId ?? null, onLabel: d.onLabel ? namesOff(d.onLabel) : null, what: namesOff(d.what) }));

    /* WHAT ONLY THE LEAD CAN SETTLE, as Today reads it for the lead, kept by label. */
    const forTheLead = ground.initiatorId
      ? (((await whatTodayReads(this.prisma, groundId, { userId: ground.initiatorId, isAdmin: false }).catch(() => ({} as any)))?.forTheLead ?? []) as any[])
        .map((x) => ({ do: namesOff(x.decide), why: namesOff(x.why), ...(x.changes ? { changes: namesOff(x.changes) } : {}), from: whereItComesFrom(String(x.id ?? '')) }))
      : [];

    const lastAt = done.map((c) => c.completedAt).filter(Boolean).map((d) => new Date(d)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const periods = [...new Set(done.filter((c) => !c.isSetup && typeof c.sessionNumber === 'number').map((c) => periodOf({ sessionNumber: c.sessionNumber, when: c.completedAt }, ground)))];

    const facts: TheWeeksFacts = {
      version: 2,
      cadence: ground.cadence ?? null,
      lastAt: lastAt ? lastAt.toISOString() : null,
      periods,
      eachPerson,
      checkIns: { due: due.length, made },
      counts,
      targets,
      namedByMoreThanOne,
      settled,
      open,
      cleared,
      forTheLead,
    };
    return this.prisma.weeklyReport.upsert({
      where: { groundId_weekStart: { groundId, weekStart: key } },
      create: { groundId, weekStart: key, eachPerson: facts as any },
      update: { eachPerson: facts as any, builtAt: new Date() },
    });
  }

  /** Reads what was stored, for this reader. Builds nothing. */
  /**
   * `week` (decision 73): the Monday of an earlier week ("2026-09-21"), to read that week's report as it
   * was kept. Each week is its own row; a later week never overwrites an earlier one. Omitted, the
   * latest week is read.
   */
  async read(groundId: string, who: { userId: string; role?: string | null; organizationId?: string | null }, now: Date = new Date(), week?: string | null): Promise<TheWeeklySentences> {
    if (week != null && !/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new BadRequestException('Pick a week by the date of its Monday, for example 2026-09-21.');
    /* Nobody held for a seat reads the weekly report either (privacy sweep finding 3). */
    await refuseSomeoneHeldForASeat(this.prisma as any, groundId, who.userId);
    /* Nor anyone waiting for the organisation's approval (row 5). */
    await refuseSomeoneAwaitingTheOrganisation(this.prisma as any, who.userId, CANNOT_READ_THE_REPORT_YET);
    const ground: any = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        organizationId: true, initiatorId: true, createdByUserId: true, scenario: true, startedFrom: true, peersVisibleToEachOther: true, whoSeesTargets: true, cadence: true,
        /* Decision 75, item 2: the admin asked to approve an evaluation check-in reads it. */
        status: true, approvedById: true,
        participants: { select: { id: true, userId: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, roleAsDescribed: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      } as any,
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const viewer: Viewer = { userId: who.userId, role: who.role, organizationId: who.organizationId };
    const level = whatTheyMayRead(who.userId, viewer, ground);
    /* Somebody with no reach, and an admin who was not given access to an evaluation check-in, read nothing. */
    if (!level) throw new NotFoundException('Check-in not found');

    const latest: any = week
      ? await this.prisma.weeklyReport.findUnique({ where: { groundId_weekStart: { groundId, weekStart: week } } })
      : await this.prisma.weeklyReport.findFirst({ where: { groundId }, orderBy: { weekStart: 'desc' } });
    if (!latest) return { weekStart: week ?? null, builtAt: null, saying: week ? 'There is no weekly report for that week.' : NOTHING_YET_THIS_WEEK, eachPerson: [] };

    const parties: any[] = ground.participants ?? [];
    const me = parties.find((p) => p.userId === who.userId) ?? null;
    const viewerIsLead = level === 'lead';
    const runsIt = ground.initiatorId === who.userId;
    const facts = theFactsIn(latest.eachPerson);

    const peersAreNamed = peersAreNamedOn(ground as any, { participantId: me?.id ?? null });
    const asWhom = viewerIsLead ? (parties.find((p) => p.partyType === PartyType.INITIATOR)?.id ?? me?.id ?? null) : me?.id ?? null;
    const visible = namesVisibleTo(asWhom, parties as any, viewerIsLead ? true : peersAreNamed);
    const called = whatEachLabelIsCalled(parties as any, { viewerIsLead, viewerParticipantId: me?.id ?? null, peersAreNamed });
    const labels = labelsForParties(parties as any);
    const allLabels = [...labels.values()];
    const myLabel = viewerLabelOf(me?.id ?? null, parties as any);
    /* THE ONE WRAPPER every sentence on this page goes through: names this reader may read, "you" for them. */
    const served = (text: string, asYou: boolean = true): string =>
      withoutInternalLabelsIn(withNames(text, visible, allLabels, { viewerLabel: asYou ? myLabel : null }), called) as string;
    const whoIs = (pid: string) => {
      const label = labels.get(pid) ?? '';
      return visible.get(label) ?? called.get(label.toLowerCase()) ?? 'A colleague';
    };

    /* THE SENTENCE ABOUT EACH PERSON. The lead reads every one; anybody else, only the one about themselves. */
    const stored = theSentencesIn(latest.eachPerson);
    const mine = viewerIsLead ? stored : stored.filter((s) => !!me && s.participantId === me.id);
    const eachPerson = mine.map((s) => {
      const isYou = !!me && s.participantId === me.id;
      return { who: isYou ? 'You' : whoIs(s.participantId), isYou, says: served(s.says, isYou) };
    });

    /* A goal the lead has not told its person about is in no number and no sentence anybody but whoever runs the check-in reads
       (decisions 48, 56 and 86). Facts are kept whole; this is what is served. */
    const runsTheCheckIn = theyRunThisCheckIn({ userId: who.userId, role: who.role, organizationId: who.organizationId }, ground);
    const notTold: any[] = runsTheCheckIn ? [] : (((await ((this.prisma as any).personObjective?.findMany?.({
      where: { groundId, awareness: 'NOT_TOLD' },
      select: { id: true, participantId: true, text: true, awareness: true, authoredBy: true, createdAt: true },
    }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[]);
    const asObjectives = (facts?.targets ?? []).map((t: any) => ({ ...t, setByParticipantId: t.setByTheHolder ? t.ownerParticipantId ?? null : null }));
    const finish = <T,>(served: T): T => (notTold.length
      ? withoutGoalsNotToldIn(served, theWordsOfWhatTheLeadHasNotToldThemAbout(asObjectives, notTold, parties, false))
      : served);

    const out: TheWeeklySentences = { weekStart: latest.weekStart, builtAt: latest.builtAt, eachPerson };
    if (!eachPerson.length) out.saying = viewerIsLead ? NOTHING_YET_THIS_WEEK : 'Nothing has been written about you this week yet.';
    if (!facts) return finish(out);
    /* Somebody who leads the same department, and is not in this check-in, reads the sentence rule above and nothing more. */
    if (!viewerIsLead && !me) return finish(out);

    out.heading = theWeeksHeading(latest.weekStart, facts.lastAt, now);
    out.whatThisIs = whatThisReportIs(facts.cadence ?? ground.cadence ?? null);

    /* THE WEEK IN NUMBERS. The team's check-ins, the things said with proof, and every target this reader may read. */
    const sum = (xs: AWeeksCount[]) => xs.reduce((a, c) => ({ said: a.said + c.said, documented: a.documented + c.documented, estimated: a.estimated + c.estimated, fromMemory: a.fromMemory + c.fromMemory }), { said: 0, documented: 0, estimated: 0, fromMemory: 0 });
    const theirCounts = viewerIsLead ? sum(facts.counts) : sum(facts.counts.filter((c) => c.participantId === me?.id));
    const shownTargets = targetsFor(
      facts.targets.map((t) => ({ ...t })) as any[],
      me?.id ?? null,
      ground.whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own',
      /* Every share, to whoever reads the whole check-in, admins included (decision 86). */
      { isLead: runsIt, seesEveryShare: viewerIsLead },
    ).shown as any[];
    /* IN AN ANCHOR CHECK-IN THE LEAD'S AIMS ARE THE LEAD'S ALONE (decision 96, item 8): what she said she is carrying and wants the team to understand
       reaches a person in it only once she says so. The check-in page and the board are walled that way; the week in numbers read her aims aloud to
       every person in the team ("wairimu is aiming for the team to understand that..."), found in the anchor walk. Whoever runs the check-in reads them. */
    const theLeadsAimsAreHers = !runsTheCheckIn && aGroundIsTheAnchors(ground as any);
    const shownUntold = withoutWhatTheLeadHasNotToldThemAbout(
      (theLeadsAimsAreHers ? [] : shownTargets).map((t: any) => ({ ...t, setByParticipantId: t.setByTheHolder ? t.ownerParticipantId ?? null : null })), notTold, parties, runsTheCheckIn,
    ).kept as any[];
    const whoseIs = (t: any) => (!t.ownerParticipantId ? 'team' as const : t.ownerParticipantId === me?.id ? 'you' as const : { label: labels.get(t.ownerParticipantId) ?? 'A colleague' });
    /* Aims and limits (Hafsah, 1 October, decision 73): whoever runs the check-in reads them; a person
       in it reads them only where the check-in's "who sees targets" is EVERYBODY, as on the board.
       With THEIR_OWN they read the counts alone. An admin who only reads, the chief executive included,
       reads them too (decision 86, which reverses that part of decision 73). */
    const readsTheAims = viewerIsLead || (!!me && ground.whoSeesTargets === 'EVERYBODY');
    const targetFigures = shownUntold.map((t) => ({ t, f: aTargetThisWeek(t, whoseIs(t), readsTheAims) })).filter((x) => !!x.f) as { t: any; f: AFigure }[];
    out.inNumbers = [
      theCheckInsMade(facts.checkIns.due, facts.checkIns.made),
      theThingsWithProof(theirCounts.said, theirCounts.documented, !viewerIsLead),
      ...targetFigures.map((x) => x.f),
    ].filter((f): f is AFigure => !!f).map((f) => ({ figure: f.figure, of: served(f.of), says: served(f.says) }));

    /* WHAT CAME UP ACROSS THE TEAM: who named what is about other people, so only for readers of the whole check-in. */
    out.acrossTheTeam = viewerIsLead ? whatCameUpAcrossTheTeam(facts.namedByMoreThanOne).map((s) => served(s, false)) : [];

    /* THINGS THAT HAPPENED IN THREE CHECK-INS IN A ROW: only patterns seen this week, under the pattern rule. */
    out.threeInARow = await this.threeInARow(groundId, ground, facts, me, who.userId, labels, whoIs, now);

    /* WHAT PEOPLE SAID, AND WHAT THE PROOF SHOWS: totals for the whole check-in, or the reader's own. */
    out.saidAndProof = whatWasSaidAndWhatTheProofShows(theirCounts, !viewerIsLead);

    /* WHAT CHANGED. A person reads their own; readers of the whole check-in read everybody's. */
    const mayRead = (pid: string | null) => viewerIsLead || (!!me && pid === me.id);
    const whoDid = (pid: string | null) => (pid && me && pid === me.id ? 'You' : pid ? labels.get(pid) ?? 'Somebody' : 'Somebody');
    const settled = facts.settled.filter((c) => mayRead(c.participantId));
    const moved = [
      ...settled.filter((c) => c.status === 'DONE').map((c) => aCommitmentThatSettled(c, whoDid(c.participantId))),
      ...facts.cleared.filter((d) => mayRead(d.fromParticipantId)).map((d) => aHandoffThatCleared(
        d,
        whoDid(d.fromParticipantId),
        d.onParticipantId ? (d.onParticipantId === me?.id ? 'you' : labels.get(d.onParticipantId) ?? 'a colleague') : d.onLabel,
      )),
    ].filter((s): s is string => !!s).map((s) => served(s));
    const dropped = settled.filter((c) => c.status !== 'DONE').map((c) => aCommitmentThatSettled(c, whoDid(c.participantId))).filter((s): s is string => !!s).map((s) => served(s));
    const result = targetFigures.filter((x) => movedThisWeek(x.t)).map((x) => served(x.f.says));
    out.whatChanged = {
      moved: moved.length ? moved : [NOTHING_MOVED],
      dropped: dropped.length ? dropped : [NOTHING_DROPPED],
      result: result.length ? result : [NO_RESULT],
    };

    /* FOR YOU TO DO NEXT WEEK. What only the lead can settle is the lead's alone; a person reads what
       they said they would do; an admin who only reads the check-in has nothing here to do. */
    if (runsIt) out.forNextWeek = facts.forTheLead.map(forTheLeadToDo).map((t) => ({ do: served(t.do), why: served(t.why), comesFrom: t.comesFrom }));
    else if (me) out.forNextWeek = facts.open.filter((c) => c.participantId === me.id).map(yourOwnToDo).filter((t): t is AThingToDo => !!t).slice(0, 5).map((t) => ({ do: served(t.do), why: t.why, comesFrom: t.comesFrom }));
    return finish(out);
  }

  /** The patterns this reader may read, as they read them everywhere else, that came up in a period of this week. */
  private async threeInARow(groundId: string, ground: any, facts: TheWeeksFacts, me: any, readerUserId: string, labels: Map<string, string>, whoIs: (pid: string) => string, now: Date) {
    if (!facts.periods.length) return [];
    const rows: any[] = ((await ((this.prisma as any).patternDetection?.findMany?.({ where: { groundId }, select: PATTERN_ROW_SELECT }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
    const lead = (ground.participants ?? []).find((p: any) => p.partyType === PartyType.INITIATOR) ?? null;
    const served = servedPatterns(rows, { participantId: me?.id ?? null, runsIt: runsItForAPattern(ground, readerUserId) }, {
      leadParticipantId: lead?.id ?? null,
      isDaily: ground.cadence === 'DAILY',
      now,
    });
    const thisWeek = new Set(facts.periods);
    return served
      .filter((p) => (rows.find((r) => r.id === p.id)?.seenInSessions ?? []).some((n: number) => thisWeek.has(n)))
      .filter((p) => p.yours || labels.has(p.participantId))
      .map((p) => {
        const heading = /[.!?]$/.test(p.heading) ? p.heading : `${p.heading}.`;
        return { who: p.yours ? 'You' : whoIs(p.participantId), isYou: p.yours, says: `${heading} ${p.howOften}` };
      });
  }
}
