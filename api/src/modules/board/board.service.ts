import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInStatus, DependencyStatus, GroundMode, PartyType } from '@prisma/client';
import {
  BoardFamily,
  BoardSection,
  boardRendersFor,
  familyFor,
  pickBoardSafeReportFields,
  sectionsFor,
} from './board-families';
import {
  CoverageKind,
  CoverageRead,
  CoverageScope,
  classifyCoverageReason,
  DEFAULT_COVERAGE_VARIANT,
  CoverageVariant,
} from './coverage';
import { MIN_COACHING_CONFIDENCE, roleMapFor } from './role-maps';

/**
 * The board: a delivery-shaped rendering of the delivery-relevant parts of the
 * report, for a team doing shared work.
 *
 * It is NOT a replacement for the report. On a shared-mode ground BOTH exist:
 * the board (team-facing, operational) and each person's own report (private
 * substance). The board's divergence section is a POINTER; the report holds the
 * detail.
 *
 * Everything here is read-only and generated. The only thing anyone adds on the
 * board is the availability poll, because availability is logistics and never
 * touches an account.
 *
 * Two gates, both enforced here and not left to the client:
 *  1. MODE + FAMILY. A private ground never renders a board. A sensing-family
 *     scenario never renders one even in shared mode.
 *  2. WHITELIST. Only report fields in BOARD_WHITELIST can cross onto the board.
 *     The trust analysis, arc signals and anything lead-only never do.
 */
@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);

  constructor(private prisma: PrismaService) {}

  async get(groundId: string, requestingUserId: string, variant: CoverageVariant = DEFAULT_COVERAGE_VARIANT) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: {
        participants: {
          select: {
            id: true, email: true, userId: true, partyType: true, roleAsDescribed: true,
            managingOnly: true, signedOffAt: true,
            detectedFunction: true, detectedFunctionConfidence: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        report: true,
        objectives: { orderBy: { sortOrder: 'asc' } },
        dependencies: { orderBy: { createdAt: 'asc' } },
        meetings: { orderBy: { happenedAt: 'desc' } },
        poll: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!ground) throw new NotFoundException('Ground not found');

    // Authorisation: only parties to this ground (or its initiator) read the board.
    const isInitiator = ground.initiatorId === requestingUserId;
    const me = ground.participants.find((p) => p.userId === requestingUserId);
    if (!me && !isInitiator) throw new ForbiddenException('You are not a party to this ground');

    // GATE 1: mode + family. A private ground, or a sensing-family scenario,
    // has no board at all - and says so, rather than returning an empty shell
    // that reads like a broken page.
    if (!boardRendersFor(ground.scenario, ground.mode)) {
      return {
        groundId,
        renders: false,
        mode: ground.mode,
        family: familyFor(ground.scenario),
        reason:
          ground.mode !== GroundMode.SHARED
            ? 'This is a private alignment ground. Accounts are never shown to other parties, so there is no shared board. Read your report instead.'
            : 'This kind of ground does not use a shared board. Laying these accounts out for everyone to read would undo the candour that makes them worth having. Read the report instead.',
      };
    }

    const sections = sectionsFor(ground.scenario, ground.mode);
    const has = (s: BoardSection) => sections.includes(s);
    const family = familyFor(ground.scenario);

    const participantIds = ground.participants.map((p) => p.id);
    const checkIns = await this.prisma.checkIn.findMany({
      where: { groundId },
      select: {
        id: true, participantId: true, sessionNumber: true, status: true,
        completedAt: true, specificityLevel: true,
      },
      orderBy: { sessionNumber: 'asc' },
    });
    const maxSession = checkIns.reduce((m, c) => Math.max(m, c.sessionNumber), 1);

    const nameOf = (pid: string) => {
      const p = ground.participants.find((x) => x.id === pid);
      if (!p) return null;
      const n = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim();
      return n || p.email || null;
    };

    // GATE 2: whitelist. Only these report fields may cross to the board.
    const reportSafe = ground.report ? pickBoardSafeReportFields(ground.report as any) : null;

    const out: Record<string, any> = {
      groundId,
      renders: true,
      mode: ground.mode,
      family,
      sections,
      title: ground.label,
      scenario: ground.scenario,
      coverageVariant: variant,
      readOnlyNote: 'Generated from the ground. Only the meeting poll is editable.',
      participants: ground.participants.map((p) => ({
        id: p.id,
        name: nameOf(p.id),
        role: p.roleAsDescribed ?? (p.managingOnly ? 'Managing only' : null),
        managingOnly: p.managingOnly,
        signedOffAt: p.signedOffAt,
      })),
    };

    if (has('phaseSpine')) {
      out.phaseSpine = {
        startsAt: ground.startsAt,
        endsAt: ground.endsAt,
        currentSession: maxSession,
        sessions: Array.from(new Set(checkIns.map((c) => c.sessionNumber))).sort((a, b) => a - b).map((n) => {
          const forSession = checkIns.filter((c) => c.sessionNumber === n);
          const allDone = forSession.length > 0 && forSession.every((c) => c.status === CheckInStatus.COMPLETED);
          return {
            n,
            state: n < maxSession || allDone ? 'done' : n === maxSession ? 'current' : 'upcoming',
            date: forSession.find((c) => c.completedAt)?.completedAt ?? null,
          };
        }),
      };
    }

    if (has('objectives')) {
      out.objectives = ground.objectives.map((o) => ({
        id: o.id, name: o.name, count: o.count, prevCount: o.prevCount, target: o.target,
        delta: o.count - o.prevCount,
        isNew: o.addedAtSession != null && o.addedAtSession >= maxSession,
        // A new dimension means nothing until people have checked in against it,
        // so the board shows who has been asked and who has not.
        askedOf: o.addedAtSession == null ? null : ground.participants
          .filter((p) => !p.managingOnly)
          .map((p) => ({
            participantId: p.id,
            name: nameOf(p.id),
            asked: checkIns.some(
              (c) => c.participantId === p.id && c.sessionNumber >= (o.addedAtSession as number) && c.status === CheckInStatus.COMPLETED,
            ),
          })),
      }));
    }

    if (has('divergence') && reportSafe) {
      // The board shows the SUMMARY. The report holds the substance - so this
      // deliberately carries a pointer back rather than the full detail.
      out.divergence = {
        items: Array.isArray(reportSafe.divergences) ? reportSafe.divergences : [],
        agreements: Array.isArray(reportSafe.agreements) ? reportSafe.agreements : [],
        centralQuestion: reportSafe.centralQuestion ?? null,
        pointer: 'This is the summary. Your own report holds the detail of what each account said.',
      };
    }

    if (has('checkInGrid')) {
      out.checkInGrid = {
        sessions: Array.from(new Set(checkIns.map((c) => c.sessionNumber))).sort((a, b) => a - b),
        rows: ground.participants.map((p) => ({
          participantId: p.id,
          name: nameOf(p.id),
          role: p.roleAsDescribed ?? (p.managingOnly ? 'Managing only' : null),
          // A managing-only lead has no account of their own and is not counted
          // in readiness, so their row is dashes, not "overdue".
          managingOnly: p.managingOnly,
          cells: Object.fromEntries(
            Array.from(new Set(checkIns.map((c) => c.sessionNumber))).map((n) => {
              if (p.managingOnly) return [n, 'na'];
              const ci = checkIns.find((c) => c.participantId === p.id && c.sessionNumber === n);
              if (!ci) return [n, 'na'];
              return [n, ci.status === CheckInStatus.COMPLETED ? 'done'
                : ci.status === CheckInStatus.IN_PROGRESS ? 'in-progress'
                : ci.status === CheckInStatus.DECLINED ? 'declined'
                : 'not-started'];
            }),
          ),
        })),
      };
    }

    if (has('whoOwnsWhat')) {
      const entries = await this.prisma.recordEntry.findMany({
        where: { participant: { groundId }, type: { in: ['COMMITMENT', 'SUCCESS_DEFINITION', 'INTENT'] } },
        select: { id: true, participantId: true, type: true, text: true, checkInId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      out.whoOwnsWhat = ground.participants
        .filter((p) => !p.managingOnly)
        .map((p) => ({
          participantId: p.id,
          name: nameOf(p.id),
          role: p.roleAsDescribed ?? null,
          items: entries.filter((e) => e.participantId === p.id).map((e) => ({
            id: e.id, type: e.type, text: e.text,
            sessionNumber: checkIns.find((c) => c.id === e.checkInId)?.sessionNumber ?? null,
          })),
        }));
    }

    if (has('dependencies')) {
      out.dependencies = ground.dependencies.map((d) => ({
        id: d.id,
        from: nameOf(d.fromParticipantId),
        fromParticipantId: d.fromParticipantId,
        what: d.what,
        on: d.onParticipantId ? nameOf(d.onParticipantId) : d.onLabel,
        onParticipantId: d.onParticipantId,
        status: d.status,
        then: d.then,
      }));
    }

    if (has('decisions')) {
      out.decisions = this.deriveDecisions(
        Array.isArray(reportSafe?.divergences) ? (reportSafe!.divergences as any[]) : [],
        ground.dependencies,
        nameOf,
      );
    }

    if (has('quickRead')) {
      const blockers = ground.dependencies.filter((d) => d.status === DependencyStatus.BLOCKING).length;
      const divCount = Array.isArray(reportSafe?.divergences) ? (reportSafe!.divergences as any[]).length : 0;
      const movedTotal = ground.objectives.reduce((s, o) => s + (o.count - o.prevCount), 0);
      const eng = (reportSafe?.engagement ?? {}) as Record<string, any>;
      out.quickRead = [
        { label: 'Aligned?', value: divCount ? `${divCount} open` : 'no gaps open', sub: 'differences between accounts', tone: divCount ? 'warn' : 'good' },
        { label: 'Moving?', value: movedTotal > 0 ? `+${movedTotal}` : 'no change', sub: 'across targets this session', tone: movedTotal > 0 ? 'good' : 'flat' },
        { label: 'Stuck?', value: blockers ? `${blockers} blocked` : 'clear', sub: blockers ? 'hard blockers' : 'nothing hard-blocked', tone: blockers ? 'bad' : 'good' },
        { label: 'Solid?', value: eng.coverage ?? 'unknown', sub: eng.documentBackedPct != null ? `${eng.documentBackedPct}% document-backed` : 'how much is backed by evidence', tone: eng.coverage === 'thin' ? 'warn' : 'good' },
      ];
    }

    if (has('contribution')) {
      out.contribution = await this.buildContributionReads(ground, checkIns, nameOf);
    }

    if (has('coverage')) {
      out.coverage = await this.buildCoverageReads(ground, nameOf);
    }

    if (has('patterns')) {
      // WORK patterns only. Patterns that judge a PERSON - arc concentration
      // and collusion risk - are computed but stay in the private report for the
      // lead. Putting a collusion flag on a surface everyone reads would be
      // public accusation. Non-negotiable.
      const detections = await this.prisma.patternDetection.findMany({
        where: { groundId, status: 'SURFACED' },
        select: { code: true, observationText: true, periodsObserved: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
      });
      out.patterns = detections
        .filter((d) => !PERSON_JUDGING_CODES.has(d.code))
        .map((d) => ({ code: d.code, text: d.observationText, periods: d.periodsObserved }));
    }

    if (has('meetings')) {
      out.meetings = ground.meetings.map((m) => ({
        id: m.id,
        happenedAt: m.happenedAt,
        present: m.presentIds.map((id) => nameOf(id)).filter(Boolean),
        missed: ground.participants.filter((p) => !m.presentIds.includes(p.id)).map((p) => nameOf(p.id)).filter(Boolean),
        notes: m.notes,
      }));
    }

    if (has('poll')) {
      out.poll = ground.poll
        ? {
            id: ground.poll.id,
            question: ground.poll.question,
            options: ground.poll.options.map((o) => ({
              id: o.id, label: o.label,
              who: o.whoIds.map((id) => nameOf(id)).filter(Boolean),
              whoIds: o.whoIds,
              count: o.whoIds.length,
            })),
          }
        : null;
    }

    return out;
  }

  /**
   * Decisions needed: derived from the divergences and the hard blockers, which
   * is what turns the board from a status read into a meeting agenda. Nothing
   * new is detected here - it is a view over things already established.
   */
  private deriveDecisions(
    divergences: any[],
    dependencies: { what: string; status: DependencyStatus; onParticipantId: string | null; onLabel: string | null }[],
    nameOf: (id: string) => string | null,
  ) {
    const fromDivergence = divergences.map((d) => ({
      question: d.topic ? `Settle: ${d.topic}` : 'Settle this difference between accounts',
      why: 'The accounts do not match on this, so it cannot be assumed agreed.',
      owner: 'Lead and team',
      source: 'divergence' as const,
    }));
    const fromBlockers = dependencies
      .filter((d) => d.status === DependencyStatus.BLOCKING)
      .map((d) => ({
        question: `Unblock: ${d.what}`,
        why: 'A hard blocker. Someone cannot move until this is decided.',
        owner: d.onParticipantId ? (nameOf(d.onParticipantId) ?? 'Unassigned') : (d.onLabel ?? 'Unassigned'),
        source: 'blocker' as const,
      }));
    return [...fromBlockers, ...fromDivergence];
  }

  /**
   * Contribution against role: each person read in THEIR function's own terms,
   * never on one shared scale, because tech and sales do not share a unit.
   *
   * Two hard rules enforced here:
   *  - An UNDEFINED remit shows NO position at all. You cannot measure someone
   *    against a bar that was never set, and an undefined role is often the real
   *    problem rather than the person.
   *  - A position is never returned without its reason attached.
   */
  private async buildContributionReads(
    ground: { id: string; participants: any[] },
    checkIns: { participantId: string; sessionNumber: number; status: CheckInStatus; specificityLevel: string | null }[],
    nameOf: (id: string) => string | null,
  ) {
    const deps = await this.prisma.groundDependency.findMany({
      where: { groundId: ground.id, status: { in: [DependencyStatus.BLOCKING, DependencyStatus.WAITING] } },
      select: { fromParticipantId: true },
    });
    const blockedIds = new Set(deps.map((d) => d.fromParticipantId));

    const entryCounts = await this.prisma.recordEntry.groupBy({
      by: ['participantId'],
      where: { participant: { groundId: ground.id } },
      _count: { _all: true },
    });
    const countOf = (pid: string) => entryCounts.find((e) => e.participantId === pid)?._count._all ?? 0;

    return ground.participants
      .filter((p) => !p.managingOnly)
      .map((p) => {
        const remitDefined = !!p.roleAsDescribed?.trim();
        if (!remitDefined) {
          return {
            participantId: p.id,
            name: nameOf(p.id),
            remit: p.roleAsDescribed ?? null,
            remitDefined: false,
            position: null,
            reason: null,
            note:
              'No position shown, because the role was never clearly defined. Define what it is responsible for before assessing anyone against it. An undefined role is often the real problem, not the person.',
          };
        }

        const map = roleMapFor(p.detectedFunction);
        const confident = (p.detectedFunctionConfidence ?? 0) >= MIN_COACHING_CONFIDENCE;
        const mine = checkIns.filter((c) => c.participantId === p.id);
        const completed = mine.filter((c) => c.status === CheckInStatus.COMPLETED).length;
        const entries = countOf(p.id);
        const isBlocked = blockedIds.has(p.id);

        // Deliberately coarse. This is a read on the role and the plan, not a
        // score on the person, and the reason carries the weight, not the label.
        let position: 'beyond' | 'at' | 'below';
        if (entries >= 6 && completed >= 2) position = 'beyond';
        else if (entries >= 2) position = 'at';
        else position = 'below';

        const reasonParts: string[] = [];
        reasonParts.push(`${completed} check-in${completed === 1 ? '' : 's'} on record, ${entries} thing${entries === 1 ? '' : 's'} named.`);
        if (isBlocked) {
          // Blocked must NEVER read as behind. This is the protection the
          // engineering and PM maps both call for, applied generally.
          reasonParts.push('Part of this is blocked on someone else (see what people are waiting on), which is different from being behind. Separate the two before reading anything into it.');
        }
        if (map) {
          reasonParts.push(`Read against ${map.label}: on track here means ${map.onTrackMeans.toLowerCase()}`);
          if (!confident) reasonParts.push('This read of their function is still provisional.');
        }

        return {
          participantId: p.id,
          name: nameOf(p.id),
          remit: p.roleAsDescribed,
          remitDefined: true,
          position,
          positionLabel: position === 'beyond' ? 'Above and beyond' : position === 'at' ? 'On track' : 'Below track',
          reason: reasonParts.join(' '),
          fn: p.detectedFunction ?? null,
          fnLabel: map?.label ?? null,
          fnConfident: confident,
          isBlocked,
          ownVoice: null,
          guard:
            'Each person against their own role, in its own terms, never on one scale. A position is never shown without its reason, and never at all if the role was not defined. Below track is a read on the role and the plan, not the person.',
        };
      });
  }

  /**
   * Where work is landing. Two-sided, coupled to the reason it cannot
   * self-determine, own-voice enabled, and only where the remit is defined.
   *
   * Currently computed at ROLE scope only - the sharpest individual read. The
   * other three scopes (project, department, company) are in the type but are
   * not derivable until a department/company structure exists to read them at,
   * so they are deliberately absent rather than faked.
   */
  private async buildCoverageReads(
    ground: { id: string; participants: any[] },
    nameOf: (id: string) => string | null,
  ): Promise<{ scope: CoverageScope; reads: CoverageRead[] }> {
    const deps = await this.prisma.groundDependency.findMany({
      where: { groundId: ground.id, status: { in: [DependencyStatus.BLOCKING, DependencyStatus.WAITING] } },
      select: { fromParticipantId: true },
    });
    const blockedIds = new Set(deps.map((d) => d.fromParticipantId));

    const reads: CoverageRead[] = [];
    for (const p of ground.participants) {
      if (p.managingOnly) continue;
      const remitDefined = !!p.roleAsDescribed?.trim();

      // Signal: how much of this person's own named work is appearing in OTHER
      // people's accounts. Uses the same cross-reference the report already
      // relies on - not a new capture path.
      const mine = await this.prisma.recordEntry.count({
        where: { participantId: p.id },
      });
      const othersMentioning = await this.prisma.recordEntry.count({
        where: {
          participant: { groundId: ground.id, id: { not: p.id } },
          text: { contains: (nameOf(p.id) ?? '').split(' ')[0] || ' ', mode: 'insensitive' },
        },
      });
      const total = mine + othersMentioning;
      const pct = total === 0 ? 0 : Math.round((othersMentioning / total) * 100);

      const kind: CoverageKind =
        pct >= 45 ? CoverageKind.LEAKING : pct >= 20 ? CoverageKind.ABSORBING : CoverageKind.STABLE;

      const { reason, reasonText } = classifyCoverageReason({
        kind,
        isBlocked: blockedIds.has(p.id),
        remitDefined,
        ownVoiceClaimsDelegation: false,
        // Rising-over-periods needs history this does not have yet, so it is
        // reported as 0 and the classifier will land on CANNOT_DETERMINE rather
        // than asserting an ownership drop from a single snapshot.
        risingPeriods: 0,
      });

      reads.push({
        participantId: p.id,
        name: nameOf(p.id),
        scope: 'role',
        pct,
        kind,
        trend: 'stable',
        what: remitDefined
          ? `${othersMentioning} mention${othersMentioning === 1 ? '' : 's'} of this person's work in other people's accounts, against ${mine} they named themselves.`
          : 'The role was never defined, so there is no boundary to measure against.',
        reason,
        reasonText,
        ownVoice: null,
        coupledToBlocker: blockedIds.has(p.id),
        remitDefined,
      });
    }
    return { scope: 'role', reads };
  }

  /** The poll is the ONE editable thing on the board. */
  async togglePollAvailability(groundId: string, optionId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { id: true, scenario: true, mode: true, initiatorId: true, participants: { select: { id: true, userId: true } } },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    if (!boardRendersFor(ground.scenario, ground.mode)) {
      throw new ForbiddenException('This ground does not have a board');
    }
    const me = ground.participants.find((p) => p.userId === requestingUserId);
    if (!me) throw new ForbiddenException('You are not a party to this ground');

    const option = await this.prisma.groundPollOption.findUnique({
      where: { id: optionId },
      include: { poll: { select: { groundId: true } } },
    });
    if (!option || option.poll.groundId !== groundId) throw new NotFoundException('Poll option not found');

    const has = option.whoIds.includes(me.id);
    const whoIds = has ? option.whoIds.filter((x) => x !== me.id) : [...option.whoIds, me.id];
    await this.prisma.groundPollOption.update({ where: { id: optionId }, data: { whoIds } });
    return { optionId, available: !has, count: whoIds.length };
  }
}

/**
 * Codes that judge a PERSON rather than the work. Computed, kept in the private
 * report for the lead, NEVER rendered on the shared board. Same principle as the
 * existing arc-signals lead-only gate.
 */
const PERSON_JUDGING_CODES = new Set([
  'COLLUSION_RISK',
  'F5', 'E4', 'LOW_SPEC_MULTI_DIM',
  'ARC_CONCENTRATED_FINISH',
]);
