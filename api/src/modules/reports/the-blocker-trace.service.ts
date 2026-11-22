import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from './reports.service';
import { theTraceForThisReader, whichTeamItIsWaitingOn, mayReadAStep, whereAWaitStandsWithNoChain, type ACheckInTheReaderMayOpen, type AStoredTrace } from './the-blocker-trace';
import { blockerHasSubstance, dedupeDependencies } from '../board/reads';
import { DependencyStatus } from '@prisma/client';
import { theDayInWords } from '../board/the-headline-and-where-each-target-stands';
import { labelsForParties } from './party-labels';
import { peersAreNamedOn } from './peers-are-named';
import { askTheReportsDoor } from './one-persons-circumstances-stay-their-own';
import { whatEachLabelIsCalled, withoutInternalLabelsIn, youTakesItsVerb } from './no-internal-label-reaches-anyone';

export interface AStepAsRead {
  /** need, request, question, approval, priority, delay or effect. */
  kind: string;
  /** The check-in it came from, and the id to open it with. */
  checkIn: string;
  checkInId: string;
  /** Who owns it, by the name this reader may read; "a colleague" where they may not; "you" for the reader. Null where nobody is named. */
  owner: string | null;
  text: string;
}

export interface TheBlockerTraceAsRead {
  id: string;
  steps: AStepAsRead[];
  /** "Where it started: the request went to ..." Null when any step is not yours to read. */
  whereItStarted: string | null;
  /** "Decision needed: sign off ...?" Null when there is none, or when any step is not yours to read. */
  decisionNeeded: string | null;
  /** "Amani decides." Null when the record does not say, or when any step is not yours to read. */
  decidedBy: string | null;
  /**
   * "This is waiting on Finance since 14 September." Where steps of another team's check-in are not
   * yours to read, which team it waits on and since when, from your own check-in (decision 75, item 5).
   * Null where you read every step, or where it waits on no check-in you cannot open.
   */
  waitingOn: string | null;
}

/**
 * THE ONE READ OF WHERE A BLOCKER STARTED. Read from what is stored; nothing is built, rebuilt or
 * asked of a model here. Which check-ins you may open comes from `GroundsService.list()`, the same
 * rule the links between check-ins use; a check-in not on it answers NotFound. See the-blocker-trace.ts
 * for which steps a reader may read, and how each step is named (through ReportsService's wrapper).
 */
@Injectable()
export class TheBlockerTraceService {
  constructor(private prisma: PrismaService, private grounds: GroundsService, private reports: ReportsService) {}

  async forReader(
    groundId: string,
    reader: { userId: string; email: string; organizationId: string; role: string },
    now: Date = new Date(),
  ): Promise<{ traces: TheBlockerTraceAsRead[] }> {
    const list = ((await this.grounds.list(reader.organizationId, reader.userId, reader.email, reader.role)) ?? []) as any[];
    const openable = new Set(list.filter((g) => g.organizationId === reader.organizationId).map((g) => g.id));
    if (!openable.has(groundId)) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const stored = (await this.prisma.blockerTrace.findMany({
      where: { organizationId: reader.organizationId, endGroundId: groundId },
      orderBy: { createdAt: 'asc' },
    })) as unknown as AStoredTrace[];
    /* The waits said here on somebody who is not in this check-in: where every blocker here that leaves it starts, chain or no chain. */
    const waits = dedupeDependencies((await this.prisma.groundDependency.findMany({
      where: { groundId, onParticipantId: null, status: { in: [DependencyStatus.WAITING, DependencyStatus.BLOCKING] }, clearedAt: null },
      select: { id: true, groundId: true, fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, status: true, namedTheThing: true, escalatedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => [])) as any[]).filter((w) => blockerHasSubstance(w) && !!(w.onLabel ?? '').trim());
    if (stored.length === 0 && waits.length === 0) return { traces: [] };

    const wanted = [...new Set([groundId, ...stored.flatMap((t) => (t.steps ?? []).map((s) => s.groundId))])].filter((id) => openable.has(id));
    const rows = await this.prisma.ground.findMany({
      where: { id: { in: wanted }, organizationId: reader.organizationId },
      select: {
        id: true, label: true, initiatorId: true, scenario: true, peersVisibleToEachOther: true,
        report: { select: { sharedAs: true } },
        participants: {
          select: { id: true, userId: true, partyType: true, managingOnly: true, roleAsDescribed: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    const byId = new Map(rows.map((g) => [g.id, g]));
    const mayOpen = new Map<string, ACheckInTheReaderMayOpen>(rows.map((g) => [g.id, {
      id: g.id, label: g.label, initiatorId: g.initiatorId, scenario: g.scenario, peersVisibleToEachOther: g.peersVisibleToEachOther,
      readersParticipantId: g.participants.find((p) => p.userId === reader.userId)?.id ?? null,
      participants: g.participants as any,
    }]));

    /* One name, for one person, in one check-in, through the wrapper every report goes through. */
    const nameIn = (gid: string, participantId: string | null): string | null => {
      const g = byId.get(gid);
      if (!g || !participantId) return null;
      const label = labelsForParties(g.participants as any).get(participantId);
      if (!label) return null;
      return this.say(g, reader, { said: label }).said;
    };
    const say = <T extends Record<string, string>>(gid: string, text: T): T => this.say(byId.get(gid)!, reader, text);

    const traces: TheBlockerTraceAsRead[] = [];
    for (const trace of stored) {
      const mine = theTraceForThisReader(trace, mayOpen, { userId: reader.userId, role: reader.role });
      if (!mine) continue;
      /* Which team it waits on, and since when, from the handoff in this reader's own check-in (decision 75, item 5). */
      let waitingOn: string | null = null;
      let theTeamWasNamed = false;
      if (!mine.whole && trace.anchorDependencyId) {
        const anchor = await (this.prisma.groundDependency.findUnique({
          where: { id: trace.anchorDependencyId },
          select: { groundId: true, fromParticipantId: true, onParticipantId: true, onLabel: true, waitingOnGroundId: true, createdAt: true },
        }) as Promise<any>).catch(() => null);
        if (anchor && anchor.groundId === trace.endGroundId && mine.mayReadAStepBy(anchor.groundId, anchor.fromParticipantId)) {
          waitingOn = whichTeamItIsWaitingOn(anchor, mine.hiddenGroundIds, (d) => theDayInWords(d, now));
          theTeamWasNamed = !!waitingOn && !anchor.onParticipantId && !!(anchor.onLabel ?? '').trim();
        }
      }
      /*
       * With its first step hidden, a chain is served only where the person here named the team it waits
       * on. "Another team" with no start says nothing true, and could point at a check-in about one person.
       */
      if (mine.firstIsHidden && !theTeamWasNamed) continue;
      const steps: AStepAsRead[] = mine.steps.map((s) => {
        const g = byId.get(s.groundId)!;
        return {
          kind: s.kind,
          checkIn: (g.label ?? '').trim(),
          checkInId: g.id,
          owner: nameIn(s.groundId, s.personId),
          text: say(s.groundId, { text: s.text }).text,
        };
      });
      const endGround = trace.endGroundId;
      /* The one who decides is found in whichever check-in they are a part of. */
      const deciderGround = trace.decisionOwnerParticipantId
        ? [...byId.values()].find((g) => g.participants.some((p) => p.id === trace.decisionOwnerParticipantId))?.id ?? null
        : null;
      const decider = mine.whole && trace.decisionNeeded && deciderGround ? nameIn(deciderGround, trace.decisionOwnerParticipantId) : null;
      traces.push({
        id: mine.id,
        steps,
        whereItStarted: mine.whole ? say(endGround, { text: trace.whereItStarted }).text : null,
        decisionNeeded: mine.whole && trace.decisionNeeded ? say(endGround, { text: trace.decisionNeeded }).text : null,
        waitingOn,
        decidedBy: decider ? youTakesItsVerb(`${decider} ${decider.toLowerCase() === 'you' ? 'decide' : 'decides'}.`).replace(/^./, (c) => c.toUpperCase()) : null,
      });
    }
    /* Every other wait here that leaves this check-in, as far as the record follows it: its one step, and who it waits on since when. */
    /* A wait a chain was followed from is that chain, served or not: one this reader may not read is not offered again as having none. */
    const followed = new Set(stored.map((t) => t.anchorDependencyId).filter(Boolean));
    for (const w of waits) {
      if (followed.has(w.id) || !byId.has(groundId) || !mayReadAStep({ groundId, personId: w.fromParticipantId }, mayOpen, reader)) continue;
      const what = say(groundId, { text: String(w.what ?? '').trim() }).text;
      traces.push({
        id: w.id,
        steps: [{ kind: 'need', checkIn: (byId.get(groundId)!.label ?? '').trim(), checkInId: groundId, owner: nameIn(groundId, w.fromParticipantId), text: what.charAt(0).toUpperCase() + what.slice(1) }],
        whereItStarted: null,
        decisionNeeded: null,
        decidedBy: null,
        waitingOn: say(groundId, { text: whereAWaitStandsWithNoChain(w, (d) => theDayInWords(d, now)) }).text,
      });
    }
    return { traces };
  }

  /** Strings of one check-in, named for this reader by the wrapper, with no label left over. */
  private say<T extends Record<string, string>>(
    g: { scenario?: any; peersVisibleToEachOther?: boolean | null; report?: { sharedAs?: any } | null; participants: any[]; initiatorId: string | null },
    reader: { userId: string; role: string },
    text: T,
  ): T {
    const me = g.participants.find((p) => p.userId === reader.userId) ?? null;
    const viewerIsLead = (!!g.initiatorId && g.initiatorId === reader.userId) || (reader.role === 'ADMIN' && !me);
    const shared = askTheReportsDoor(
      this.reports,
      { scenario: g.scenario, peersVisibleToEachOther: g.peersVisibleToEachOther, initiatorId: g.initiatorId, participants: g.participants, report: { ...text, sharedAs: g.report?.sharedAs ?? null } },
      me?.id ?? null,
      viewerIsLead,
    ) as Record<string, any>;
    const called = whatEachLabelIsCalled(g.participants as any, { viewerParticipantId: me?.id ?? null, viewerIsLead, peersAreNamed: peersAreNamedOn(g as any, { participantId: me?.id ?? null }) });
    const out: Record<string, string> = {};
    for (const k of Object.keys(text)) out[k] = String(withoutInternalLabelsIn(shared?.[k] ?? '', called));
    return out as T;
  }
}
