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
  LeadershipDimension,
  ManagerAlignmentRead,
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
      // Which participant row is the caller, so the client knows whose poll chip
      // is theirs to toggle. Null for an org admin reading without being a party.
      myParticipantId: me?.id ?? null,
      // Whether the caller may set the frame (targets, the poll question). The
      // board is otherwise read-only, so the client should not offer controls it
      // would only be rejected for using.
      canEditFrame: isInitiator,
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

    if (has('contribution')) {
      // Only meaningful where someone actually manages someone: needs a manager
      // and at least one report, both with accounts on record.
      const alignment = await this.buildManagerAlignment(ground, checkIns, nameOf);
      if (alignment.length) out.managerAlignment = alignment;
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

  /**
   * Where a manager's account of how they led differs from their reports'
   * accounts of how they were led.
   *
   * This is the ordinary divergence mechanic pointed at management, and it runs
   * on the same rules: each account is read on its own, the output is the GAP,
   * and nobody is quoted to anybody. "What you thought was clear did not land"
   * is the single hardest thing for a manager to learn and the thing they are
   * almost never told, which is why it is worth surfacing at all.
   *
   * Deliberately conservative:
   *  - Needs a manager (someone read as MANAGEMENT, or the initiator) AND at
   *    least one report with an account. No manager, no read.
   *  - Reads only entries the two sides BOTH spoke to, so a gap is a genuine
   *    disagreement rather than one side simply not mentioning something.
   *  - Never names which report a signal came from, and never says who is right.
   */
  private async buildManagerAlignment(
    ground: { id: string; initiatorId: string; participants: any[] },
    checkIns: { participantId: string; status: CheckInStatus }[],
    nameOf: (id: string) => string | null,
  ): Promise<ManagerAlignmentRead[]> {
    const manager = ground.participants.find(
      (p) => !p.managingOnly && (p.detectedFunction === 'MANAGEMENT' || p.detectedFunction === 'CEO'),
    ) ?? ground.participants.find((p) => p.partyType === PartyType.INITIATOR && !p.managingOnly);
    if (!manager) return [];

    const reports = ground.participants.filter(
      (p) => p.id !== manager.id && !p.managingOnly &&
        checkIns.some((c) => c.participantId === p.id && c.status === CheckInStatus.COMPLETED),
    );
    if (reports.length === 0) return [];

    const [managerEntries, reportEntries] = await Promise.all([
      this.prisma.recordEntry.findMany({ where: { participantId: manager.id }, select: { type: true, text: true } }),
      this.prisma.recordEntry.findMany({
        where: { participantId: { in: reports.map((r) => r.id) } },
        select: { participantId: true, type: true, text: true },
      }),
    ]);
    if (managerEntries.length === 0 || reportEntries.length === 0) return [];

    const mgrText = managerEntries.map((e) => e.text.toLowerCase()).join(' \n ');
    const byReport = new Map<string, string>();
    for (const e of reportEntries) {
      byReport.set(e.participantId, (byReport.get(e.participantId) ?? '') + ' \n ' + e.text.toLowerCase());
    }

    const reads: ManagerAlignmentRead[] = [];
    const push = (dimension: LeadershipDimension, gap: string, note: string, n: number) => {
      if (n > 0) {
        reads.push({
          managerParticipantId: manager.id,
          managerName: nameOf(manager.id),
          dimension, gap, note,
          reportsPointingThisWay: n,
        });
      }
    };

    // Ownership clarity: the manager describes having set direction; a report
    // describes not being sure what is theirs.
    const mgrClaimsClarity = /\b(clear|clearly|set out|laid out|agreed|assigned|delegat|briefed)\b/.test(mgrText);
    const unclearReports = [...byReport.values()].filter((t) =>
      /\b(not sure|unclear|unsure|do not know|don't know|no one said|nobody said|assumed|thought i|ambiguous)\b/.test(t),
    ).length;
    if (mgrClaimsClarity) {
      push(
        LeadershipDimension.CLARITY_OF_OWNERSHIP,
        'This account describes ownership being set clearly. At least one other account describes still being unsure what they own.',
        'Both can be true at once - something can be said clearly and still not land. Worth checking what each person believes is theirs.',
        unclearReports,
      );
    }

    // Accountability: the manager describes holding people; a report describes
    // nothing coming back.
    const mgrClaimsFollowUp = /\b(followed up|held them|checked in with|chased|reminded|asked them about)\b/.test(mgrText);
    const noFollowUpReports = [...byReport.values()].filter((t) =>
      /\b(no follow.?up|never heard back|nobody asked|no one checked|went nowhere|never came back)\b/.test(t),
    ).length;
    if (mgrClaimsFollowUp) {
      push(
        LeadershipDimension.ACCOUNTABILITY,
        'This account describes following things up. At least one other account describes commitments that went without follow-up.',
        'Often a difference in what counts as following up rather than whether it happened. Worth agreeing what closing a loop looks like here.',
        noFollowUpReports,
      );
    }

    // Unaddressed tension: the manager reads the team as fine while a report's
    // own account carries tension. This is the ops "no drama" failure, checked
    // across two accounts rather than one.
    const mgrReadsCalm = /\b(fine|going well|no issues|no problems|all good|healthy|no concerns)\b/.test(mgrText);
    const tensionReports = [...byReport.entries()].filter(([, t]) =>
      /\b(tension|frustrat|friction|awkward|unsaid|not raised|resent|uncomfortable|avoided)\b/.test(t),
    ).length;
    if (mgrReadsCalm) {
      push(
        LeadershipDimension.UNADDRESSED_TENSION,
        'This account reads the team as settled. At least one other account carries something unresolved.',
        'Quiet is not the same as settled. Worth asking directly rather than reading the absence of complaints as agreement.',
        tensionReports,
      );
    }

    return reads;
  }

  /**
   * Objectives and the poll are the only things anyone WRITES here, and they are
   * different kinds of write:
   *  - Objectives are the lead's frame. Only the initiator sets them, and they
   *    are a target, never an assessment of a person.
   *  - The poll is availability, which is logistics and never touches an account,
   *    so any party can mark themselves.
   *
   * Nothing else on the board is writable: everything else is generated from
   * check-ins, and letting someone edit it directly would make the board a place
   * to argue the record rather than read it.
   */
  private async assertInitiatorOfBoardGround(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { id: true, scenario: true, mode: true, initiatorId: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    if (!boardRendersFor(ground.scenario, ground.mode)) {
      throw new ForbiddenException('This ground does not have a board');
    }
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Only the person who set this ground up can change what it is aiming for');
    }
    return ground;
  }

  async createObjective(
    groundId: string,
    requestingUserId: string,
    dto: { name: string; target?: number | null },
  ) {
    await this.assertInitiatorOfBoardGround(groundId, requestingUserId);
    const [count, maxSession] = await Promise.all([
      this.prisma.groundObjective.count({ where: { groundId } }),
      this.prisma.checkIn.aggregate({ where: { groundId }, _max: { sessionNumber: true } }),
    ]);
    // Stamp the session it was added in, so the board can flag it as new and show
    // who has been asked about it. A target means nothing until people have
    // checked in against it.
    const addedAtSession = count === 0 ? null : (maxSession._max.sessionNumber ?? 1);
    return this.prisma.groundObjective.create({
      data: {
        groundId,
        name: dto.name.trim(),
        target: dto.target ?? null,
        sortOrder: count,
        addedAtSession,
      },
    });
  }

  /**
   * Update the count or target. prevCount is snapshotted from the current count
   * so the board's "+N this session" delta stays truthful across an edit.
   */
  async updateObjective(
    groundId: string,
    objectiveId: string,
    requestingUserId: string,
    dto: { name?: string; target?: number | null; count?: number },
  ) {
    await this.assertInitiatorOfBoardGround(groundId, requestingUserId);
    const existing = await this.prisma.groundObjective.findUnique({ where: { id: objectiveId } });
    if (!existing || existing.groundId !== groundId) throw new NotFoundException('Objective not found');
    return this.prisma.groundObjective.update({
      where: { id: objectiveId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.target !== undefined ? { target: dto.target } : {}),
        ...(dto.count !== undefined ? { count: dto.count, prevCount: existing.count } : {}),
      },
    });
  }

  async deleteObjective(groundId: string, objectiveId: string, requestingUserId: string) {
    await this.assertInitiatorOfBoardGround(groundId, requestingUserId);
    const existing = await this.prisma.groundObjective.findUnique({ where: { id: objectiveId } });
    if (!existing || existing.groundId !== groundId) throw new NotFoundException('Objective not found');
    await this.prisma.groundObjective.delete({ where: { id: objectiveId } });
    return { deleted: true };
  }

  /** One poll per ground. Creating again replaces the question and options. */
  async upsertPoll(
    groundId: string,
    requestingUserId: string,
    dto: { question: string; options: string[] },
  ) {
    await this.assertInitiatorOfBoardGround(groundId, requestingUserId);
    const labels = dto.options.map((o) => o.trim()).filter(Boolean);
    if (labels.length === 0) throw new ForbiddenException('A poll needs at least one time to choose between');

    const existing = await this.prisma.groundPoll.findUnique({ where: { groundId } });
    if (existing) {
      // Replacing the options clears availability, because an answer to a
      // question that changed is not an answer.
      await this.prisma.groundPollOption.deleteMany({ where: { pollId: existing.id } });
      await this.prisma.groundPoll.update({ where: { id: existing.id }, data: { question: dto.question.trim() } });
      await this.prisma.groundPollOption.createMany({
        data: labels.map((label, i) => ({ pollId: existing.id, label, sortOrder: i })),
      });
      return this.prisma.groundPoll.findUnique({ where: { id: existing.id }, include: { options: true } });
    }
    return this.prisma.groundPoll.create({
      data: {
        groundId,
        question: dto.question.trim(),
        options: { create: labels.map((label, i) => ({ label, sortOrder: i })) },
      },
      include: { options: true },
    });
  }

  /** The poll is the ONE thing every party can edit. */
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
