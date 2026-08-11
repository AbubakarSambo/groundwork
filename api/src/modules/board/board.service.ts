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
import { ReadInput, buildContribution, buildCoverage, dedupeDependencies } from './reads';
import { PATTERN_NAME_BY_CODE } from '../patterns/pattern-library';
import { forbiddenNames, namesAnyone, ForbiddenName } from '../reports/guide-sanitiser';

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
/**
 * Collapse handoffs that are really the same one.
 *
 * Extraction now dedupes on write, but every ground created before that fix has
 * the duplicates already - 27 rows for about 4 real handoffs in the live run,
 * which made the summary read "13 blocked" when 2 people were. Deduping on READ
 * too means existing grounds are fixed as well as new ones.
 *
 * The newest row wins, because a handoff someone has stopped describing as
 * blocking is no longer blocking.
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

    // Authorisation: parties to this ground, its initiator, or the admin who
    // set it up.
    //
    // The setting-up admin is often neither lead nor participant - she creates
    // the ground and hands it to a lead. An eighteen-ground run found her
    // locked out of every board she had created, from a "Team board" link her
    // own admin page renders. READ only: createdByUserId does not confer the
    // initiator's write powers (objectives, poll), which stay gated below.
    const isInitiator = ground.initiatorId === requestingUserId;
    const isSetupAdmin = !!ground.createdByUserId && ground.createdByUserId === requestingUserId;
    const me = ground.participants.find((p) => p.userId === requestingUserId);
    if (!me && !isInitiator && !isSetupAdmin) {
      throw new ForbiddenException('You are not a party to this ground');
    }

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

    // Collapse duplicate handoffs before anything reads them, so existing
    // grounds get the same answer as new ones.
    (ground as any).dependencies = dedupeDependencies(ground.dependencies as any);

    const sections = sectionsFor(ground.scenario, ground.mode);
    const has = (s: BoardSection) => sections.includes(s);
    const family = familyFor(ground.scenario);

    // WHOSE ANSWER THIS IS.
    //
    // The scenario is only a guess: a cohort usually means people who never see
    // each other, and most other shapes usually mean they do. "Usually" is not
    // good enough here, because this single fact decides whether the board's
    // fairness reads have anything to stand on, and getting it wrong reads a
    // competent quiet person as absent. So the lead or an admin can say, and when
    // they have, their answer wins over the guess.
    const peopleWorkTogether =
      (ground as any).peopleWorkTogether ?? familyFor(ground.scenario) !== BoardFamily.COHORT;

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
      // So the page can name the situation the way the lead described it,
      // rather than in our internal grouping words.
      peopleWorkTogether,
      sections,
      title: ground.label,
      scenario: ground.scenario,
      coverageVariant: variant,
      /**
       * What everyone agreed this ground was FOR, set at creation, before a
       * single check-in existed.
       *
       * `startingState` has been in the DELIVERY family's section list since the
       * board was built, with no data behind it and no renderer - so the board
       * showed where the work had got to with nothing to compare it against. The
       * agreed intent is the comparison, and it is the one thing on the board
       * that no check-in can revise: everything else here is what people said
       * later, this is what they said at the start.
       *
       * Null when the ground was created without one, and the section is then
       * not rendered at all rather than shown empty.
       */
      startingState: (ground as any).resolutionState ?? null,
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
      // #19, the best version. The number stays the LEAD'S - deriving "how many
      // paying companies" from free text automatically is exactly the
      // unreliable guessing this product exists to avoid. But making them
      // maintain it blind means it goes stale, which is what happened in a live
      // run: twelve productive weeks and the board still read "no change".
      //
      // So the record SUGGESTS and the human DECIDES: count how many distinct
      // things in the record look like they belong to this target, show it only
      // when it disagrees with the lead's number, and let them accept it in one
      // click. The board never silently overwrites what a person set.
      const objectiveEvidence = await this.prisma.recordEntry.findMany({
        where: { participant: { groundId }, type: { in: ['COMMITMENT', 'SUCCESS_DEFINITION'] as any } },
        select: { text: true },
      });
      const suggestFor = (name: string): number | null => {
        const words = name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        if (words.length === 0) return null;
        const hits = objectiveEvidence.filter((e) => {
          const t = e.text.toLowerCase();
          // Every meaningful word of the target appears, and the entry says
          // something happened rather than something is planned.
          return words.every((w) => t.includes(w.replace(/s$/, ''))) &&
            /\b(signed|closed|paying|live|onboarded|delivered|shipped|joined|confirmed)\b/.test(t);
        }).length;
        return hits > 0 ? hits : null;
      };

      out.objectives = ground.objectives.map((o) => ({
        id: o.id, name: o.name, count: o.count, prevCount: o.prevCount, target: o.target,
        delta: o.count - o.prevCount,
        isNew: o.addedAtSession != null && o.addedAtSession >= maxSession,
        // Only present when the record disagrees with the lead's number. Never
        // applied automatically - it is a prompt, not a correction.
        suggestedCount: (() => {
          const sug = suggestFor(o.name);
          return sug != null && sug !== o.count ? sug : null;
        })(),
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
      out.dependencies = ground.dependencies
        // Nobody is waiting on themselves. The read path drops self-blocks in
        // blockerHasSubstance(); this panel did not, so a dependency whose
        // resolved owner is the person who raised it rendered as
        // "X needs the budget line from X - Blocking". Extraction can land
        // there whenever someone says "waiting on the budget line" and the
        // only name in scope is their own.
        .filter((d) => !(d.onParticipantId && d.onParticipantId === d.fromParticipantId))
        .map((d) => ({
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

    // #12: nothing ever asked the lead to set targets, so "what we are aiming
    // for" sat empty for a whole quarter and the summary read "no change" after
    // twelve productive weeks. The board now says so plainly, to the one person
    // who can fix it.
    if (has('objectives') && (out.objectives ?? []).length === 0 && isInitiator) {
      out.objectivesPrompt =
        'No targets set yet, so there is nothing for this board to measure progress against. Add two or three things this ground is aiming for.';
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

    // Loaded once and shared. It was fetched twice, running every one of these
    // queries a second time to produce the same answer.
    if (has('contribution') || has('coverage')) {
      const readInput = await this.loadReadInput(ground);
      if (has('contribution')) out.contribution = buildContribution(readInput, nameOf);
      if (has('coverage')) out.coverage = buildCoverage(readInput, nameOf);
    }

    if (has('contribution')) {
      // Only meaningful where someone actually manages someone: needs a manager
      // and at least one report, both with accounts on record.
      // The forbidden-name list is built from THIS ground's participants. See
      // buildManagerAlignment for why the board needs one at all.
      const alignment = this.buildManagerAlignment(
        reportSafe,
        forbiddenNames(
          ground.participants.map((p: any) => ({
            firstName: p.user?.firstName,
            lastName: p.user?.lastName,
            email: p.email,
          })),
        ),
      );
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
  /**
   * Load what the reads need, then hand off. The deciding lives in reads.ts as
   * pure functions so it can be replayed against a captured real run and checked
   * (see reads.spec.ts). Nothing here decides anything about a person.
   */
  private async loadReadInput(ground: { id: string; participants: any[]; scenario?: any }): Promise<ReadInput> {
    const [dependencies, entries, mentions, checkIns] = await Promise.all([
      this.prisma.groundDependency.findMany({
        where: { groundId: ground.id },
        select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, status: true, createdAt: true },
      }),
      this.prisma.recordEntry.findMany({
        where: { participant: { groundId: ground.id } },
        select: { participantId: true, text: true, checkIn: { select: { sessionNumber: true } } },
      }),
      this.prisma.workMention.findMany({
        where: { groundId: ground.id },
        select: { aboutParticipantId: true, sourceParticipantId: true, kind: true, sessionNumber: true },
      }),
      this.prisma.checkIn.findMany({
        where: { groundId: ground.id },
        select: { participantId: true, sessionNumber: true, status: true },
      }),
    ]);
    // WHETHER THESE PEOPLE SEE EACH OTHER'S WORK. The lead's answer if they gave
    // one, otherwise the kind of ground as a fallback. Where nobody can
    // corroborate anybody, the reads built on colleagues describing each other
    // cannot be made honestly. See reads.ts.
    return {
      peopleWorkTogether:
        (ground as any).peopleWorkTogether ?? familyFor((ground as any).scenario) !== BoardFamily.COHORT,
      participants: ground.participants.map((p) => ({
        id: p.id,
        roleAsDescribed: p.roleAsDescribed ?? null,
        managingOnly: !!p.managingOnly,
        detectedFunction: p.detectedFunction ?? null,
        detectedFunctionConfidence: p.detectedFunctionConfidence ?? null,
      })),
      checkIns,
      entries: entries.map((e) => ({
        participantId: e.participantId,
        sessionNumber: e.checkIn?.sessionNumber ?? null,
        text: e.text,
      })),
      mentions,
      dependencies,
    };
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
  private buildManagerAlignment(
    reportSafe: Record<string, any> | null,
    names: ForbiddenName[],
  ): ManagerAlignmentRead[] {
    const raw = reportSafe?.leadershipGaps;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((g: any) => {
        const spec = LEADERSHIP_PATTERN_BY_KEY[g?.pattern];
        // An unrecognised pattern is dropped rather than rendered as a bare
        // string: without its pole and its label it is not actionable, and a
        // half-rendered read about someone's management is worse than none.
        if (!spec || !g?.gap) return null;

        // ENFORCED, not merely requested. The prompt forbids quoting and
        // labelling, but a prompt is a request and this is the one property
        // that must not drift: a two-word quote still tells the other person
        // exactly what was said. Anything carrying a quote or a party label is
        // dropped rather than shown.
        // BOTH FIELDS, and names as well as labels. Two defects were found here.
        //
        // Only `gap` was ever checked, and `note` renders directly beneath it on
        // the same shared card. A real record from a live run reads "The pattern
        // of deferral is visible in the lead's record over time" - in the note,
        // so it went straight through the rule written to stop exactly that.
        //
        // And neither field was checked against actual participant NAMES. The
        // rule caught "Party A" and "the lead" but not "Eric", which is the form
        // a leak actually takes: across four real leadership gaps the model did
        // say "One account", so nothing had gone wrong yet - but that was the
        // prompt behaving, not a guarantee. The same feature elsewhere in this
        // codebase produced "I want to acknowledge Eric's consistent focus"
        // under an equivalent instruction.
        //
        // Names come from `forbiddenNames`, which matches most case-insensitively
        // but collision-prone ones ("Success", "Grace", "Will" - common given
        // names in this product's markets) case-sensitively. Without that, a
        // participant called Success would silently empty this section of every
        // board about a quarter's success.
        const gapText = String(g.gap);

        /**
         * MODEL OUTPUT IS FILTERED. OUR OWN COPY IS NOT.
         *
         * `spec.why` is the hand-written fallback from the pattern map, used when
         * the model returns no note. It is vetted static copy in which "the
         * manager" is a generic role inside an explanation - "the team cannot own
         * what is still being done for them, and the manager stays the bottleneck"
         * - not an identification of anyone on this ground.
         *
         * Running it through a filter built for model output made the board drop
         * every gap that fell back to it, which is a filter rejecting the product's
         * own words. So only `g.note` is checked, and only when the model actually
         * supplied one.
         */
        const modelNote = g.note == null ? null : String(g.note);
        const noteText = modelNote ?? String(spec.why);

        const toCheck: [string, string][] = [['gap', gapText]];
        if (modelNote !== null) toCheck.push(['note', modelNote]);

        for (const [field, text] of toCheck) {
          // Word-internal apostrophes are contractions and possessives, not
          // quotation marks: "we're" and "another party's remit" are both fine.
          const withoutWordInternal = text.replace(/(\w)['\u2019](\w)/g, '$1$2');
          if (/["\u201c\u201d]|['\u2018][^'\u2019]{2,}['\u2019]/.test(withoutWordInternal)) {
            this.logger.warn(`Dropping a leadership gap: ${field} contains a quotation - the no-quote rule is absolute.`);
            return null;
          }
          if (/\b(party [A-Z]|the lead|the manager|the initiator)\b/i.test(text)) {
            this.logger.warn(`Dropping a leadership gap: ${field} identifies a party by role.`);
            return null;
          }
          if (namesAnyone(text, names)) {
            this.logger.warn(`Dropping a leadership gap: ${field} names a participant.`);
            return null;
          }
        }
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
          note: noteText,
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
