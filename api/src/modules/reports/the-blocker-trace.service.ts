import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds/grounds.service';
import { ReportsService } from './reports.service';
import { theTraceForThisReader, type ACheckInTheReaderMayOpen, type AStoredTrace } from './the-blocker-trace';
import { labelsForParties } from './party-labels';
import { peersAreNamedOn } from './peers-are-named';
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
  ): Promise<{ traces: TheBlockerTraceAsRead[] }> {
    const list = ((await this.grounds.list(reader.organizationId, reader.userId, reader.email, reader.role)) ?? []) as any[];
    const openable = new Set(list.filter((g) => g.organizationId === reader.organizationId).map((g) => g.id));
    if (!openable.has(groundId)) throw new NotFoundException('Check-in not found');

    const stored = (await this.prisma.blockerTrace.findMany({
      where: { organizationId: reader.organizationId, endGroundId: groundId },
      orderBy: { createdAt: 'asc' },
    })) as unknown as AStoredTrace[];
    if (stored.length === 0) return { traces: [] };

    const wanted = [...new Set(stored.flatMap((t) => (t.steps ?? []).map((s) => s.groundId)))].filter((id) => openable.has(id));
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
        decidedBy: decider ? youTakesItsVerb(`${decider} ${decider.toLowerCase() === 'you' ? 'decide' : 'decides'}.`).replace(/^./, (c) => c.toUpperCase()) : null,
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
    const viewerIsLead = (!!g.initiatorId && g.initiatorId === reader.userId) || reader.role === 'ADMIN';
    const shared = this.reports.theReportAsItWasShared(
      { scenario: g.scenario, peersVisibleToEachOther: g.peersVisibleToEachOther, participants: g.participants, report: { ...text, sharedAs: g.report?.sharedAs ?? null } },
      me?.id ?? null,
      viewerIsLead,
    ) as Record<string, any>;
    const called = whatEachLabelIsCalled(g.participants as any, { viewerParticipantId: me?.id ?? null, viewerIsLead, peersAreNamed: peersAreNamedOn(g as any, { participantId: me?.id ?? null }) });
    const out: Record<string, string> = {};
    for (const k of Object.keys(text)) out[k] = String(withoutInternalLabelsIn(shared?.[k] ?? '', called));
    return out as T;
  }
}
