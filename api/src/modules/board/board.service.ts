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
  LeadershipPattern,
  LEADERSHIP_PATTERN_BY_KEY,
  ManagerAlignmentRead,
} from './coverage';
import { MIN_COACHING_CONFIDENCE, roleMapFor } from './role-maps';
import { PATTERN_NAME_BY_CODE } from '../patterns/pattern-library';

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
        // Only people who can actually be asked: a managing-only lead gives no
        // account, and someone who never accepted their invite would otherwise
        // sit in "still to be asked" forever, making a new target look
        // permanently unanswered.
        askedOf: o.addedAtSession == null ? null : ground.participants
          .filter((p) => !p.managingOnly && !!p.userId)
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
      const alignment = this.buildManagerAlignment(reportSafe);
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
        .map((d) => ({
          code: d.code,
          // Only label a code this library actually knows. The model sometimes
          // invents codes ("k5"), and a raw key on a shared board reads like a
          // system leak - the observation text carries the meaning anyway.
          label: PATTERN_NAME_BY_CODE.get(d.code) ?? null,
          text: d.observationText,
          periods: d.periodsObserved,
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
      // Only STILL-OPEN blockers. A cleared handoff is not a decision anyone
      // needs to make, and leaving them on grew this list to 15 items.
      .filter((d) => d.status === DependencyStatus.BLOCKING)
      .map((d) => ({
        question: `Unblock: ${d.what}`,
        why: 'A hard blocker. Someone cannot move until this is decided.',
        owner: d.onParticipantId ? (nameOf(d.onParticipantId) ?? 'Unassigned') : (d.onLabel ?? 'Unassigned'),
        source: 'blocker' as const,
      }));

    // Same decision phrased slightly differently is one decision.
    const seen = new Set<string>();
    const deduped = [...fromBlockers, ...fromDivergence].filter((d) => {
      const k = d.question.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // A list of fifteen is not a list of decisions, it is a backlog nobody
    // reads. Blockers first, because someone is stuck behind them.
    return deduped.slice(0, 5);
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

    const lastSession = checkIns.reduce((m, c) => Math.max(m, c.sessionNumber), 0);

    // HOW VERIFIABLE the record is, not how much of it there is.
    //
    // Counting entries could not tell a deliverer from a staller: in a live run
    // the person who stopped working scored 43 and the person who delivered all
    // quarter scored 45. Every entry is ALREADY tagged HIGH/MEDIUM/LOW at
    // extraction time - the card was simply ignoring it.
    const allEntries = await this.prisma.recordEntry.findMany({
      where: { participant: { groundId: ground.id } },
      select: { participantId: true, text: true, checkIn: { select: { sessionNumber: true } } },
    });
    const tierOf = (text: string): 'HIGH' | 'MEDIUM' | 'LOW' => {
      const m = /^\[VERIFIABILITY:(HIGH|MEDIUM|LOW)\]/.exec(text ?? '');
      return (m?.[1] as any) ?? 'LOW';
    };
    const profileOf = (pid: string) => {
      const mine = allEntries.filter((e) => e.participantId === pid);
      const high = mine.filter((e) => tierOf(e.text) === 'HIGH').length;
      const medium = mine.filter((e) => tierOf(e.text) === 'MEDIUM').length;

      // TRAJECTORY, not just totals.
      //
      // A quarter-long total hides a collapse inside it. In a live run the person
      // who was strong in session 1, produced nothing for six sessions, then
      // recovered, came out looking BETTER on totals than the person who
      // delivered steadily throughout. Totals answer "how much"; a lead needs
      // "when", because a dip in the middle is the thing worth asking about.
      const bySession = new Map<number, number>();
      for (const e of mine) {
        const n = e.checkIn?.sessionNumber;
        if (n == null) continue;
        bySession.set(n, (bySession.get(n) ?? 0) + (tierOf(e.text) === 'LOW' ? 0 : 1));
      }
      return {
        total: mine.length,
        high,
        medium,
        low: mine.length - high - medium,
        checkable: high + medium,
        bySession,
      };
    };

    /** Plain-language shape of someone's record over the sessions that have run. */
    const shapeOf = (bySession: Map<number, number>, lastSession: number): string | null => {
      if (lastSession < 3) return null;
      const at = (n: number) => bySession.get(n) ?? 0;
      const third = Math.max(1, Math.floor(lastSession / 3));
      const sum = (from: number, to: number) => {
        let t = 0;
        for (let i = from; i <= to; i++) t += at(i);
        return t;
      };
      const early = sum(1, third);
      const middle = sum(third + 1, third * 2);
      const late = sum(third * 2 + 1, lastSession);

      // Longest run of consecutive sessions with nothing checkable.
      let longestGap = 0, run = 0, gapEnd = 0;
      for (let i = 1; i <= lastSession; i++) {
        if (at(i) === 0) { run++; if (run > longestGap) { longestGap = run; gapEnd = i; } }
        else run = 0;
      }

      if (longestGap >= 3) {
        const gapStart = gapEnd - longestGap + 1;
        const recovered = late > 0 && gapEnd < lastSession;
        return recovered
          ? `Nothing checkable from session ${gapStart} to ${gapEnd}, then picked up again. The middle of this period is the part worth asking about, not the total.`
          : `Nothing checkable since session ${gapStart}.`;
      }
      if (early > 0 && late === 0) return 'Contributed early, nothing checkable in the most recent sessions.';
      if (early === 0 && late > 0) return 'Slow start, contributing now.';
      if (middle >= 0 && early > 0 && late > 0) return 'Steady across the period.';
      return null;
    };

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
        const profile = profileOf(p.id);
        const isBlocked = blockedIds.has(p.id);

        // NO on-track / below-track label. Any threshold that produced one would
        // be invented, and a label reads as a score on the person no matter how
        // it is worded. What the record actually shows is the read; that is all
        // this returns.
        const reasonParts: string[] = [];
        // Lead with what could be CHECKED, because that is the difference
        // between working and describing work.
        if (profile.total === 0) {
          reasonParts.push(`${completed} check-in${completed === 1 ? '' : 's'} on record, nothing specific named yet.`);
        } else if (profile.checkable === 0) {
          reasonParts.push(
            `${completed} check-in${completed === 1 ? '' : 's'} on record. Nothing named so far could be checked by anyone else - no named people, organisations, numbers or dates.`,
          );
        } else {
          reasonParts.push(
            `${completed} check-in${completed === 1 ? '' : 's'} on record. ${profile.checkable} of ${profile.total} things named are specific enough to check later${profile.high ? `, ${profile.high} backed by something concrete` : ''}.`,
          );
          const shape = shapeOf(profile.bySession, lastSession);
          if (shape) reasonParts.push(shape);
        }
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
          position: null,
          positionLabel: null,
          reason: reasonParts.join(' '),
          fn: p.detectedFunction ?? null,
          fnLabel: map?.label ?? null,
          fnConfident: confident,
          isBlocked,
          ownVoice: null,
          guard:
            'Each person against their own role, in its own terms, never on one scale. A position is never shown without its reason, and never at all if the role was not defined. This shows what the record holds, not a rating of anyone.',
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

    // ID-resolved at extraction time (see ConversationService.extractWorkMentions),
    // so this counts actual attributed references rather than guessing from names.
    const mentions = await this.prisma.workMention.findMany({
      where: { groundId: ground.id },
      select: { aboutParticipantId: true, sourceParticipantId: true, kind: true, sessionNumber: true },
    });

    const reads: CoverageRead[] = [];
    for (const p of ground.participants) {
      if (p.managingOnly) continue;
      const remitDefined = !!p.roleAsDescribed?.trim();

      // Leaking out: others describing doing work that sits in THIS person's remit.
      const leakingOut = mentions.filter((m) => m.aboutParticipantId === p.id && m.kind === 'COVERAGE');
      // Absorbing in: THIS person describing picking up work that is someone else's.
      const absorbingIn = mentions.filter((m) => m.sourceParticipantId === p.id && m.kind === 'COVERAGE');

      const own = await this.prisma.recordEntry.count({ where: { participantId: p.id } });
      const denom = own + leakingOut.length;
      const pct = denom === 0 ? 0 : Math.round((leakingOut.length / denom) * 100);

      // SECOND SIGNAL: their own record thinning out.
      //
      // Waiting for a colleague to narrate "I did Kavon's work" misses the
      // commonest way ownership drops, because nobody says that - they just
      // quietly do more of their own. In a live run the one person who genuinely
      // stopped delivering read as "nothing here to read into", because no one
      // had spelt it out. Their OWN record going quiet is the tell.
      const perSession = await this.prisma.recordEntry.groupBy({
        by: ['checkInId'],
        where: { participantId: p.id, checkInId: { not: null } },
        _count: { _all: true },
      });
      const myCheckInRows = await this.prisma.checkIn.findMany({
        where: { participantId: p.id },
        select: { id: true, sessionNumber: true },
      });
      const mySessionByCheckIn = new Map(myCheckInRows.map((c) => [c.id, c.sessionNumber]));
      const lastSessionNumber = myCheckInRows.reduce((m, c) => Math.max(m, c.sessionNumber), 0);
      // Credit is the opposite signal and must never be counted as coverage - it is
      // the hidden-contribution read, and confusing the two would turn "people say
      // you unblocked them" into "your work is slipping".
      const credited = mentions.filter((m) => m.aboutParticipantId === p.id && m.kind === 'CREDIT');

      const myCheckIns = await this.prisma.checkIn.count({
        where: { participantId: p.id, status: CheckInStatus.COMPLETED },
      });

      // CONSECUTIVE quiet periods, not total. Counting total quiet sessions
      // flagged the steady engineer who describes his work modestly - exactly
      // the "invisible work" person the engineering map says to protect - just
      // as hard as the person who genuinely went dark for a month. A run of
      // silence is a signal; scattered quiet weeks are just how some people
      // write.
      const sessionsWithEntries = new Set<number>();
      for (const row of perSession) {
        const ci = mySessionByCheckIn.get(row.checkInId as string);
        if (ci != null) sessionsWithEntries.add(ci);
      }
      let longestQuietRun = 0, run = 0;
      for (let n = 1; n <= lastSessionNumber; n++) {
        if (!sessionsWithEntries.has(n)) { run++; longestQuietRun = Math.max(longestQuietRun, run); }
        else run = 0;
      }
      const quietPeriods = longestQuietRun;

      // THE HIDDEN CONTRIBUTOR GUARD.
      //
      // Someone can go quiet in their OWN account and still be doing the work -
      // the engineer whose sessions read "stable, consolidating and documenting
      // so it is not all in my head". That is real work described unverifiably,
      // and it is exactly the person the engineering map says to protect from
      // being read as low contribution.
      //
      // What separates them from a genuine drop is whether OTHER people are
      // crediting them DURING the quiet stretch. If colleagues keep naming you
      // as the reason something moved while your own account is modest, that is
      // underclaim, not a drop - and it is the hidden-contribution read, not a
      // negative one.
      const quietRunEnd = (() => {
        let r = 0, end = 0;
        for (let n = 1; n <= lastSessionNumber; n++) {
          if (!sessionsWithEntries.has(n)) { r++; if (r >= longestQuietRun) end = n; } else r = 0;
        }
        return end;
      })();
      const quietRunStart = quietRunEnd - longestQuietRun + 1;
      const creditedDuringQuietRun = credited.some(
        (m) => m.sessionNumber >= quietRunStart && m.sessionNumber <= quietRunEnd,
      );

      // Three consecutive periods is the same bar every other negative read has
      // to clear.
      const ownRecordThinning =
        myCheckIns >= 3 && longestQuietRun >= 3 && !blockedIds.has(p.id) && !creditedDuringQuietRun;

      const kind: CoverageKind =
        (leakingOut.length >= 2 && pct >= 40) || ownRecordThinning ? CoverageKind.LEAKING
        : absorbingIn.length >= 2 ? CoverageKind.ABSORBING
        : CoverageKind.STABLE;

      // Rising over periods, from the sessions the coverage mentions land in. A
      // single period of someone covering is not a pattern - the three-period
      // discipline applies here as it does everywhere else.
      const leakSessions = new Set(leakingOut.map((m) => m.sessionNumber));
      const risingPeriods = Math.max(leakSessions.size, ownRecordThinning ? quietPeriods : 0);

      const { reason, reasonText } = classifyCoverageReason({
        kind,
        isBlocked: blockedIds.has(p.id),
        remitDefined,
        ownVoiceClaimsDelegation: false,
        risingPeriods,
      });

      const base = !remitDefined
        ? 'The role was never defined, so there is no boundary to measure against.'
        : kind === CoverageKind.LEAKING && leakingOut.length >= 2
        ? `${leakingOut.length} time${leakingOut.length === 1 ? '' : 's'} across ${risingPeriods} session${risingPeriods === 1 ? '' : 's'}, someone else described doing work that sits in this remit, against ${own} thing${own === 1 ? '' : 's'} named here directly.`
        : kind === CoverageKind.LEAKING
        ? `${quietPeriods} check-ins in a row added nothing specific to the record, and nothing is blocking them. The work has not stopped existing, so it is worth asking where it is going.`
        : kind === CoverageKind.ABSORBING
        ? `This account describes picking up work outside this remit ${absorbingIn.length} time${absorbingIn.length === 1 ? '' : 's'}.`
        : "Nothing in anyone's account describes this person's work moving elsewhere.";

      // Credit is surfaced WHATEVER the coverage reading is. The person who is
      // absorbing other people's work is very often the same quiet load-bearer
      // others keep crediting, and dropping their credit because they also
      // picked something up would lose exactly the contribution this is meant to
      // catch. Credit never counts as coverage; it also never gets hidden by it.
      const creditNote = credited.length
        ? ` Others credit them ${credited.length} time${credited.length === 1 ? '' : 's'} for moving something forward.`
        : '';
      const what = remitDefined ? base + creditNote : base;

      reads.push({
        participantId: p.id,
        name: nameOf(p.id),
        scope: 'role',
        pct,
        kind,
        trend: risingPeriods >= 3 ? 'rising' : 'stable',
        what,
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
   * Where one account of how this team is being led differs from another.
   *
   * Produced by the report synthesis (rule 14), not here: the model already sees
   * every party's labeled evidence and already produces divergences without
   * quoting anyone, so leadership gaps come from that same call. Matching
   * phrases like "clearly" against "not sure" would fire on the wrong thing and
   * miss the politely-worded version, which is the common one.
   *
   * This method only shapes what synthesis produced for display. It adds no
   * detection of its own.
   */
  private buildManagerAlignment(reportSafe: Record<string, any> | null): ManagerAlignmentRead[] {
    const raw = reportSafe?.leadershipGaps;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((g: any) => {
        const spec = LEADERSHIP_PATTERN_BY_KEY[g?.pattern];
        // An unrecognised pattern is dropped rather than rendered as a bare
        // string: without its pole and its label it is not actionable, and a
        // half-rendered read about someone's management is worse than none.
        if (!spec || !g?.gap) return null;
        // One period is not a pattern. The same three-period discipline that
        // governs every other negative read governs this one, and this is the
        // most consequential read on the board.
        const periods = Number(g.periods ?? 0);
        if (periods < 2) return null;
        return {
          // Deliberately not attributed. The gap is BETWEEN two accounts;
          // naming whose it is would undo the point.
          managerParticipantId: '',
          managerName: null,
          pattern: spec.pattern,
          pole: spec.pole,
          label: spec.label,
          gap: String(g.gap),
          note: String(g.note ?? spec.why),
          periods,
        };
      })
      .filter(Boolean) as ManagerAlignmentRead[];
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
