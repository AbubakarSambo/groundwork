import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { whoNeedsYou, Need } from '../detectors/who-needs-you-this-week';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInStatus, DependencyStatus, GroundMode, PartyType } from '@prisma/client';
import { onlyWhatThisReaderMaySee, onlyHandoffsTheyAreIn, WHY_YOU_ONLY_SEE_YOURSELF } from './the-board-keeps-the-same-wall';
import {
  BoardFamily,
  BoardSection,
  boardRendersFor,
  boardHasSection,
  familyFor,
  pickBoardSafeReportFields,
  sectionsFor,
} from './board-families';
import { labelsForParties, namesVisibleTo, readsWithNamesOf, withNames } from '../reports/party-labels';
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
import { AnthropicService } from '../conversation/anthropic.service';
import { theSessionReport } from '../reports/the-session-report';
import { aNameOrNothing } from './a-name-is-short';
import { isThisACascade } from './is-this-a-cascade';
import { theJourneySoFar } from './a-measure-that-goes-down-is-still-going-well';
import { onlyWhoIsActuallyOutside, WHY_THIS_IS_HERE } from './somebody-carrying-work-with-no-account';
import { draftTheQuestion } from '../reports/the-picture-is-drafted-from-the-reads';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { originLabel } from '../documents/what-kind-of-thing-a-document-is';
import { wordedByTheModel, type Drafted } from '../reports/the-engine-drafts-it-the-model-words-it';
import { rememberedCompose } from '../reports/a-line-worded-once-is-kept';
import { ReadInput, buildContribution, buildCoverage, dedupeDependencies } from './reads';
import {
  OrgDependency,
  whatThePlaceIsWaitingOn,
  whoIsBeingWaitedOn,
} from './what-the-whole-place-is-waiting-on';
import { PATTERN_NAME_BY_CODE, whatToAskAbout } from '../patterns/pattern-library';
import { forbiddenNames, namesAnyone, ForbiddenName } from '../reports/guide-sanitiser';
import { whatThisSessionHolds, atAGlanceTiles } from '../reports/what-this-session-holds';
import { howManyHaveAnswered } from '../reports/how-many-have-answered';
import { adminsThisOrg } from '../grounds/who-may-read-this-check-in';
import { whereEachPersonIs } from './where-each-person-is-against-their-number';
import { whatTheLeadShouldKnow } from './whose-number-is-whose-business';
import { whichRoundIsOpen } from './which-round-is-open';
import { splitTheTotal, sayingWhatTheSplitDoes } from '../alignment/a-total-splits-by-what-people-did';
import { peopleFrom } from '../alignment/a-file-of-people-becomes-people';
import { whatTheyTried } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';

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

  /*
   * `AnthropicService` for one job: rewording the reads' reason lines. The board decides nothing
   * with it. See the-engine-drafts-it-the-model-words-it.ts for the guard.
   */
  constructor(
    private prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /*
   * THE BOARD IS BUILT WHEN THE SESSION ENDS, NOT WHEN THE LEAD OPENS IT. Every worded line the
   * board shows is kept by its hash (see a-line-worded-once-is-kept), so reading it once here, a
   * few seconds after the check-in that changed it, means the lead's first open pays nothing.
   * Best-effort: a failure here is logged and the open still works, it is just slower.
   */
  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async warmOnCheckInCompleted(event: CheckInCompletedEvent) {
    try {
      const ground = await this.prisma.ground.findUnique({ where: { id: event.groundId }, select: { initiatorId: true } });
      if (!ground?.initiatorId) return;
      await this.get(event.groundId, ground.initiatorId);
      this.logger.log(`Board warmed for ${event.groundId} after session ${event.sessionNumber}.`);
    } catch (err: any) {
      this.logger.warn(`Board warm-up failed for ${event.groundId}: ${err?.message}`);
    }
  }

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
    if (!ground) throw new NotFoundException('Check-in not found');

    /**
     * "THERE IS NO BOARD" IS ANSWERED BEFORE "WHO ARE YOU", AND THAT ORDER IS THE FIX.
     *
     * The authorisation throw used to sit here, above the mode gate. On a private ground - which has
     * no board at all, by design - an org admin who was not a party got "You are not a party to this
     * ground" and a red Access denied toast, while a PARTICIPANT on the same URL got the truth:
     * "This is a private check-in... there is no shared board. Read your report instead."
     *
     * So the person with the least authority was the one being told what was going on, and the
     * admin was shown a permission problem that did not exist - one tab after a banner reading "You
     * can see everything here, which is the point of being an admin". The two screens read as the
     * product not knowing its own rules.
     *
     * Safe to answer first because the mode gate does not depend on identity: whether this KIND of
     * ground has a board is a fact about the ground, discloses nothing about the accounts on it, and
     * is already visible to every party. Where a ground DOES have a board, the authorisation check
     * below still runs and still refuses.
     *
     * Found by walking the same URL as three different roles, not by reading the code.
     */
    // GATE 1: mode + family. A private ground, or a sensing-family scenario,
    // has no board at all - and says so, rather than returning an empty shell
    // that reads like a broken page.
    if (!boardRendersFor(ground.scenario)) {
      return {
        groundId,
        renders: false,
        mode: ground.mode,
        family: familyFor(ground.scenario),
        /**
         * BOTH OLD REASONS WERE ABOUT MODE, AND MODE NO LONGER DECIDES THIS.
         *
         * One said "this is a private check-in, so there is no shared board", the other said this kind
         * of check-in does not use one. Every check-in has a board now, so neither can be true - and a
         * refusal that gives a reason which cannot be true is worse than a plain one.
         *
         * What remains reachable is a family with no sections, which would be a check-in the product
         * does not know how to lay out. That is a gap in the product, not a decision about the reader,
         * so it says so.
         */
        reason:
          'There is no board for this check-in yet. Read the report instead - it has everything the accounts produced.',
      };
    }

    /**
     * NOW who is asking, because from here on the answer contains the accounts.
     *
     * Parties to this ground, its initiator, or the admin who set it up. The setting-up admin is
     * often neither lead nor participant - she creates the ground and hands it to a lead. An
     * eighteen-ground run found her locked out of every board she had created, from a "Team board"
     * link her own admin page renders. READ only: createdByUserId does not confer the initiator's
     * write powers (objectives, poll), which stay gated below.
     */
    const isInitiator = ground.initiatorId === requestingUserId;
    const isSetupAdmin = !!ground.createdByUserId && ground.createdByUserId === requestingUserId;
    const me = ground.participants.find((p) => p.userId === requestingUserId);
    /**
     * AND AN ADMIN OF THIS ORGANISATION, WHO WAS BEING TURNED AWAY FROM HER OWN COMPANY'S BOARD.
     *
     * Read as a second admin on a real org: she can open the check-in, its report, its setup and
     * its context - and the board answered "You are not a participant in this check-in". The board
     * is the one surface that puts the whole run in one place, so the reader most likely to want it
     * was the only one refused it. Same rule as the peer filter below and as `grounds.service`: an
     * admin of THIS organisation runs the check-in; an admin of a different one is a stranger.
     */
    const viewer = requestingUserId
      ? await this.prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { role: true, organizationId: true },
      })
      : null;
    const adminHere = adminsThisOrg(viewer, ground as any);
    if (!me && !isInitiator && !isSetupAdmin && !adminHere) {
      throw new ForbiddenException('You are not a participant in this check-in');
    }

    // Collapse duplicate handoffs before anything reads them, so existing
    // grounds get the same answer as new ones.
    (ground as any).dependencies = dedupeDependencies(ground.dependencies as any);

    const sections = sectionsFor(ground.scenario);
    const has = (s: BoardSection) => sections.includes(s);
    const family = familyFor(ground.scenario);

    /**
     * THE WALL THE CHECK-IN KEEPS, KEPT HERE TOO.
     *
     * Worked out exactly as `grounds.service` works it out, and for the same reason: on an
     * evaluation-family ground people give their accounts without seeing each other. That service
     * filters the other parties out of the ground payload; this one had never heard of the rule, so
     * one hire on a real twelve-session cohort got a check-in page listing only herself and a board
     * listing every colleague by name with the read on their quarter attached.
     *
     * Never hidden from whoever RUNS the check-in - its lead, the admin who set it up, or an admin
     * of the organisation. The rule is between the parties.
     */
    const evaluative = [BoardFamily.EVALUATION, BoardFamily.COHORT].includes(family);
    const peersVisible = (ground as any).peersVisibleToEachOther ?? !evaluative;
    /* `viewer` and `adminHere` are read once at the door above - see the note there. */
    const runsThisGround = isInitiator || isSetupAdmin || adminHere;
    const whoMaySee = { peersHidden: !peersVisible && !runsThisGround, meParticipantId: me?.id ?? null };

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
    /* ONE CLOCK. The open round is the lowest session anybody who gives a check-in has not finished.
       When a third person is added, the round goes back to session 1 while the lead's session 2 may
       already be in progress; the board said "session 2" and the header said "back to session 1".
       The round is the clock everywhere; a session ahead of it is upcoming, not current. */
    const givers = new Set(ground.participants.filter((p: any) => !p.managingOnly).map((p: any) => p.id));
    const unfinished = checkIns.filter((c) => givers.has(c.participantId) && c.status !== CheckInStatus.COMPLETED).map((c) => c.sessionNumber);
    const openRound = unfinished.length ? Math.min(...unfinished) : maxSession;
    /* THE BOARD IS EVERY SESSION. The session report runs its engines over one session's rows; the
       board runs the same engines over all of them, so the two share a vocabulary and differ only in
       scope. Same tiles, same settled-and-open, same question engine. */
    const sessionShape: any = await this.everySessionThroughTheReportEngines(groundId, ground as any, checkIns as any[], openRound).catch((err: any) => {
      this.logger.warn(`Board could not run the report engines over ${groundId}: ${err?.message}`);
      return null;
    });

    /**
     * NAMES AND RAW EMAIL ADDRESSES IN THE SAME COLUMN. W-UX-4.
     *
     * Seen on the running board: "Sahar Okonkwo" beside "ejiro@meridianhealth.test",
     * "hafeezah@meridianhealth.test" and four more, in one grid, so it read as two different kinds
     * of person. Her audit note said exactly that about two screens; this was the third.
     *
     * The board falls back to the ROLE, not the address, and there are two reasons rather than one:
     *
     *  1. The board is read by every party, and a party's address can be hidden from the others. The
     *     client's `participantLabel` refuses the email for this reason and this did not.
     *  2. It is what this board is for. Its own framing panel says each person is shown "against
     *     their own role in its own terms" - so when there is no name, the role IS the identity.
     *
     * `role` is already sent alongside `name` in the response, so the client suppresses the subtitle
     * when the two would say the same word twice.
     */
    const nameOf = (pid: string) => {
      const p = ground.participants.find((x) => x.id === pid);
      if (!p) return null;
      const n = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim();
      /* A sentence is not a name. See a-name-is-short.ts for the one that reached a live report. */
      return n || aNameOrNothing(p.roleAsDescribed) || null;
    };

    // GATE 2: whitelist. Only these report fields may cross to the board.
    const reportSafeRaw = ground.report ? pickBoardSafeReportFields(ground.report as any) : null;

    /**
     * GATE 3: THE NAMES. W8-73.
     *
     * The board reads the report's own sentences, and those sentences are written by the
     * model in LABELS - "the initiator", "the participant", "participant A" - which
     * `reports.service.ts` swaps for real names on the way out, per reader, according to
     * what that reader is allowed to see.
     *
     * The board never did that. So a LEAD, who is entitled to every name in their own
     * ground, read their board as "By the end of the evaluation period, the participant was
     * successfully owning two client accounts" and "the initiator's clarification in week
     * seven" - about themselves. Twelve sessions of work, described in placeholders.
     *
     * Same helpers, same rule, same reason it lives in code: this is access control, not
     * wording. A lead reads with every name; anybody else gets their own, the lead's, and
     * labels for the rest.
     */
    const visibleNames = namesVisibleTo(
      readsWithNamesOf({
        /*
         * AN ORGANISATION'S ADMIN READS WITH NAMES, because this page already tells them they can
         * see everything here and being an admin is the point. Left out, the board named one person
         * and left the other as "Partnerships Associate, started 1 September" three inches apart,
         * which reads as two people disagreeing with a third. Their exact words stay walled off, as
         * they are for everybody; a name is not the wall. Same test `runsThisGround` already uses.
         */
        viewerIsLead: runsThisGround,
        viewerParticipantId: me?.id ?? null,
        parties: ground.participants as any[],
      }),
      ground.participants as any[],
    );
    const allLabels = [...labelsForParties(ground.participants as any[]).values()];
    const named = (v: any): any => {
      if (typeof v === 'string') return withNames(v, visibleNames, allLabels);
      if (Array.isArray(v)) return v.map(named);
      if (v && typeof v === 'object') {
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) out[k] = named(val);
        return out;
      }
      return v;
    };
    const reportSafe = reportSafeRaw ? (named(reportSafeRaw) as typeof reportSafeRaw) : null;

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
      /* Whether this is over, and what ended it. The board drew a live clock on a resolved ground. */
      groundStatus: ground.status,
      endState: (ground as any).endState ?? null,
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
      readOnlyNote: 'Generated from the check-in. Only the meeting poll is editable.',
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
        currentSession: openRound,
        sessions: Array.from(new Set(checkIns.map((c) => c.sessionNumber))).sort((a, b) => a - b).map((n) => {
          const forSession = checkIns.filter((c) => c.sessionNumber === n);
          const allDone = forSession.length > 0 && forSession.every((c) => c.status === CheckInStatus.COMPLETED);
          return {
            n,
            state: n < openRound || allDone ? 'done' : n === openRound ? 'current' : 'upcoming',
            date: forSession.find((c) => c.completedAt)?.completedAt ?? null,
          };
        }),
      };
    }

    /* Where the privacy setting is on and doing nothing, the person who can fix it is told. */
    if (has('objectives') && runsThisGround) {
      out.targetsNobodyOwns = whatTheLeadShouldKnow(
        (ground.objectives ?? []) as any,
        (ground as any).whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own',
      );
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
        where: { disputedAt: null, participant: { groundId }, type: { in: ['COMMITMENT', 'SUCCESS_DEFINITION'] as any } },
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

      /*
       * WHERE EACH ONE STARTED, WHICH IS WHAT TELLS US WHICH WAY IS GOOD.
       *
       * The lowest session we have a snapshot for, per objective. A target added at session six
       * starts at session six - nobody gets credit for distance covered before anybody was
       * counting. See a-measure-that-goes-down-is-still-going-well.ts for why this is derived
       * rather than asked: a direction column can be set wrong, and three numbers cannot.
       */
      const firstSnapshots = await this.prisma.groundObjectiveSnapshot.findMany({
        where: { groundId },
        orderBy: { sessionNumber: 'asc' },
        select: { objectiveId: true, count: true },
      });
      const startOf = new Map<string, number>();
      for (const s of firstSnapshots) if (!startOf.has(s.objectiveId)) startOf.set(s.objectiveId, s.count);

      out.objectives = ground.objectives.map((o) => ({
        journey: theJourneySoFar({ start: startOf.get(o.id) ?? null, now: o.count, target: o.target }),
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
      /*
       * THE BOARD HOLDS THE SUBSTANCE NOW.
       *
       * It used to send a `pointer` - "This is the summary. Your own report holds the detail of
       * what each account said." - and the client printed it under the list. That sentence was the
       * only reason a separate shared-report surface had to exist: the board named a disagreement
       * and then sent the reader elsewhere to learn what it was.
       *
       * Nothing about the payload changes. `divergences` was always the report's own objects, sent
       * whole, with `positions` and `atStake` on them, and every string in them goes through
       * `named()` below so a reader who may not see who somebody is still does not. The client was
       * simply not rendering the fields it already had.
       */
      out.divergence = {
        /*
         * ONE NAME PER PERSON ON ONE BOARD. A `participantLabel` is a role - "Partnerships
         * Associate, started 1 September" - and every other section of this page says "Ada Obi".
         * Read live: the same person appeared under two names three inches apart, which reads as
         * two people disagreeing with a third. Where the reader may see the name, the name wins.
         */
        items: Array.isArray(reportSafe.divergences)
          ? (reportSafe.divergences as any[]).map((d) => {
              const named = (side: any) => ({
                ...side,
                participantLabel: visibleNames.get(String(side?.participantLabel ?? '')) ?? side?.participantLabel,
              });
              return {
                ...d,
                ...(Array.isArray(d?.positions) ? { positions: d.positions.map(named) } : {}),
                ...(Array.isArray(d?.perspectives) ? { perspectives: d.perspectives.map(named) } : {}),
              };
            })
          : [],
        agreements: Array.isArray(reportSafe.agreements) ? reportSafe.agreements : [],
        centralQuestion: sessionShape?.theConversationWorthHaving ?? reportSafe.centralQuestion ?? null,
        settled: sessionShape?.whereThingsStand?.settled ?? [],
        stillOpen: sessionShape?.whereThingsStand?.open ?? [],
      };
    }

    /*
     * TEN ROWS, ONE PER PERSON, ORDERED BY WHAT NEEDS ATTENTION.
     *
     * The board answers "how is the team doing". A manager running ten people each against their
     * own number is asking something else - "where is each person and what do I do with them" - and
     * nothing here could answer it. See the module for why it ranks situations and never people.
     *
     * Lead-only: it names what to ask somebody to do, which is a manager's read of their own team,
     * not something a colleague may have about a colleague. `own-reads-only` strips it for anybody
     * else; this is the narrower gate at the point it is built.
     */
    /*
     * WHAT PEOPLE WERE ASKED AND DID NOT ANSWER, which is where a let-go gap lands.
     *
     * The conversation asks twice and then stops, because a person who feels cornered gives
     * compliant answers and those are worse than missing ones. The cost of that decision is that
     * somebody has to see the gap, and this is where.
     *
     * NEVER A MARK AGAINST ANYBODY. Half the time the honest reason is that nobody could have
     * answered it - a target that was never set, a dependency nobody owns. So it says what is
     * missing and how long it has been, and says nothing at all about the person.
     */
    if (has('checkInGrid') && runsThisGround) {
      const gapRows = await this.prisma.checkInGap?.findMany?.({
        where: { groundId, answeredAt: null },
        orderBy: [{ firstRound: 'asc' }],
        select: { participantId: true, what: true, firstRound: true, asked: true, certain: true },
      })?.catch(() => [] as any[]) ?? [];
      out.stillUnanswered = (gapRows as any[])
        .filter((g) => g.asked >= 2)
        .map((g) => ({ who: nameOf(g.participantId) ?? 'A teammate', what: g.what, sinceRound: g.firstRound, certain: g.certain !== false }));
    }

    if (has('checkInGrid') && runsThisGround) {
      /*
       * THE ROUND THAT IS OPEN IS THE ONE SOMEBODY HAS STARTED, not the newest row that exists.
       *
       * Rows for the next round are written ahead of time, so taking the highest number meant the
       * board opened a fresh week by telling a manager that all ten people had not answered - a
       * page of red on the morning the round begins, about a round nobody was late for. A round
       * nobody has touched is next week's.
       */
      const openRound = whichRoundIsOpen(checkIns as any);
      out.eachPerson = whereEachPersonIs(
        /*
         * AND THE MANAGER IS NOT IN THEIR OWN LIST.
         *
         * The initiator checked in once to set the context and does not carry a number; ranked
         * among the people she manages she came out top, "has not answered", about a round she is
         * not running. This read is what to do about other people.
         */
        ground.participants.filter((p) => !p.managingOnly && p.id !== me?.id).map((p) => {
          const theirs = (ground.objectives ?? []).find((o: any) => o.ownerParticipantId === p.id);
          const mine = checkIns.filter((c) => c.participantId === p.id);
          const thisRound = mine.find((c) => c.sessionNumber === openRound);
          return {
            participantId: p.id,
            /* A person whose name this reader may not resolve still has a row: the read is about
               what to do, and "a teammate" with a three-week blocker is still worth acting on. */
            who: nameOf(p.id) ?? 'A teammate',
            /* Whether that label is a name or their role standing in for one. Asked of the name
               itself: somebody can have an account and never have given a first name. */
            nameIsTheirRole: ![p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim(),
            target: theirs?.target ?? null,
            count: theirs?.count ?? 0,
            answeredThisRound: thisRound?.status === CheckInStatus.COMPLETED,
            roundsSoFar: new Set(mine.map((c) => c.sessionNumber)).size,
            inTheWay: (ground.dependencies ?? [])
              .filter((d: any) => d.fromParticipantId === p.id && d.status !== 'CLEARED')
              .map((d: any) => ({
                what: d.what,
                owner: d.onParticipantId ? nameOf(d.onParticipantId) : (d.onLabel ?? null),
                days: Math.max(0, Math.floor((Date.now() - new Date(d.createdAt).getTime()) / 86_400_000)),
                /* Read off their own words. Nobody has said is 'nothing', which is the truth. */
                tried: d.escalatedAt ? 'escalated' : whatTheyTried(d.triedSaid ?? ''),
              })),
            /* A round with a date, a number or a document in it is one somebody else can check. */
            saidAnythingCheckable: (thisRound as any)?.specificityLevel
              ? !['vague', 'managed'].includes(String((thisRound as any).specificityLevel).toLowerCase())
              : false,
          };
        }),
        /* The planned length, for the only honest read of pace. Without one it says nothing
           rather than guessing the bar - see behindThePace. */
        (ground as any).totalSessions ?? null,
      );
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
        where: { disputedAt: null, participant: { groundId }, type: { in: ['COMMITMENT', 'SUCCESS_DEFINITION', 'INTENT'] } },
        select: { id: true, participantId: true, type: true, text: true, checkInId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      out.whoOwnsWhat = ground.participants
        .filter((p) => !p.managingOnly)
        .map((p) => ({
          participantId: p.id,
          name: nameOf(p.id),
          role: p.roleAsDescribed ?? null,
          /*
           * `cleanText`, NOT `e.text`. This panel is read by a person, and the stored text still
           * carries the engine's own markers - a live board showed
           * "[VERIFIABILITY:HIGH] We need to hit 270 units this year." under somebody's name.
           * Everywhere else that renders an entry already strips them; this was the one that did
           * not. `loadReadInput` below deliberately keeps the raw text, because the tiering in
           * reads.ts is the thing that READS the marker - that one is not a surface.
           */
          items: entries.filter((e) => e.participantId === p.id).map((e) => ({
            id: e.id, type: e.type, text: cleanText(e.text),
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
      /*
       * THE SAME FOUR TILES AS THE REPORT, FROM THE SAME BUILDER. This recomputed them a second way
       * when the engine returned nothing, and three of the four differed from the report's - the
       * engine's own header says the two surfaces must agree. The counts come from the one owner
       * (what-this-session-holds.ts) and the tiles from the one builder; there is no second copy to
       * drift. The comment that used to sit here about question-mark labels moved with the builder.
       */
      if (sessionShape?.atAGlance?.length) {
        out.quickRead = sessionShape.atAGlance;
      } else {
        const held = await whatThisSessionHolds(this.prisma, groundId, openRound);
        const divCount = Array.isArray(reportSafe?.divergences) ? (reportSafe!.divergences as any[]).length : 0;
        const agreedCount = Array.isArray(reportSafe?.agreements) ? (reportSafe!.agreements as any[]).length : 0;
        const eng = (reportSafe?.engagement ?? {}) as Record<string, any>;
        out.quickRead = atAGlanceTiles({
          agreed: agreedCount, stillOpen: divCount, movedOnTargets: held.movedOnTargets, blocked: held.blocked, waiting: held.waiting,
          backedPct: eng.documentBackedPct ?? null, numberWasSaid: false,
        });
      }
    }

    // Loaded once and shared. It was fetched twice, running every one of these
    // queries a second time to produce the same answer.
    if (has('contribution') || has('coverage')) {
      const readInput = await this.loadReadInput(ground);
      if (has('contribution')) out.contribution = buildContribution(readInput, nameOf);
      if (has('coverage')) out.coverage = buildCoverage(readInput, nameOf);
      /*
       * THE REASON LINES, WORDED. Seventeen interpolated sentences in reads.ts read identically on
       * every board in the product. The engine's claims are unchanged: `safeToUse` holds every number
       * and every capitalised word, the line count is held, and the draft ships on refusal.
       */
      try {
        const drafts: Drafted[] = [];
        (out.contribution ?? []).forEach((r: any, i: number) => { if (r.reason) drafts.push({ key: `c${i}`, text: r.reason }); });
        (out.coverage?.reads ?? []).forEach((r: any, i: number) => { if (r.reasonText) drafts.push({ key: `v${i}`, text: r.reasonText }); });
        if (drafts.length) {
          const said = Object.fromEntries((await wordedByTheModel(
            drafts,
            rememberedCompose(this.prisma, (system, draft) => this.anthropic.respond(system, [{ role: 'user', content: draft }])),
          )).map((d) => [d.key, d.text]));
          out.contribution = (out.contribution ?? []).map((r: any, i: number) => ({ ...r, reason: said[`c${i}`] ?? r.reason }));
          if (out.coverage) out.coverage = { ...out.coverage, reads: out.coverage.reads.map((r: any, i: number) => ({ ...r, reasonText: said[`v${i}`] ?? r.reasonText })) };
        }
      } catch (err: any) {
        this.logger?.warn?.(`Wording the board reads failed, shipping the engine's words: ${err?.message}`);
      }
    }

    /*
     * IS THERE SOMETHING ABOVE THIS? Asked of every board that opted in, answered from the record
     * rather than from the dropdown. The section is emitted even when the answer is no, but only
     * where the situation said it should be - a team that opened an alignment check-in and never
     * named what it aligns to is the case this is most useful for, and dropping the section there
     * would hide exactly that. Anywhere else, no evidence means no section at all.
     */
    if (has('cascade')) {
      const [cascadeEntries, importedWithParents] = await Promise.all([
        this.prisma.recordEntry.findMany({
          where: { disputedAt: null, participant: { groundId } },
          select: { participantId: true, text: true },
        }),
        this.cascadeParents(ground.organizationId, ground.objectives.map((o) => o.name)),
      ]);
      const read = isThisACascade({
        scenario: ground.scenario,
        objectiveNames: ground.objectives.map((o) => o.name),
        importedWithParents,
        entries: cascadeEntries.map((e) => ({ participantId: e.participantId, text: cleanText(e.text) })),
      });
      if (read.isCascade || read.basis.includes('DECLARED')) out.cascade = read;
    }

    /*
     * SOMEBODY CARRYING WORK WITH NO ACCOUNT HERE.
     *
     * The read has existed for a long time and reached one component that nothing imports. On a
     * board it says the thing nobody had to notice on their own: the team is depending on somebody
     * who has no voice in this.
     *
     * Every row goes through its own guard first - see the module for the three things that go
     * wrong in the real data and why each is dropped rather than trimmed. What is dropped is
     * logged by its reason and not by its content, like every other decision on this page.
     */
    if (has('hiddenContributors') && reportSafe) {
      const rows = ((reportSafe as any)?.engagement?.hiddenContributors ?? []) as { label: string; evidence: string }[];
      const { keep, dropped } = onlyWhoIsActuallyOutside(
        Array.isArray(rows) ? rows : [],
        ground.participants.map((p) => nameOf(p.id)).filter(Boolean) as string[],
      );
      for (const d of dropped) this.logger.warn(`Dropping a hidden contributor: it ${d.why}.`);
      if (keep.length) out.hiddenContributors = { rows: keep, why: WHY_THIS_IS_HERE };
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
          /*
           * AND WHAT TO DO ABOUT IT, which the board was leaving in the library.
           *
           * "i would expect a coaching line or an assessment after, what do i do with this" - about
           * "Direct questions about deliverables were met with unrelated statements about needs and
           * blockers." Every pattern has carried a `probe` since the library was written: the
           * question to put to somebody once the pattern has been seen, which is the entire reason
           * a pattern is worth naming. It just never left the file.
           *
           * A question, not a verdict. A pattern is something the record has noticed more than
           * once; the next move is asking the person about it.
           */
          askThem: whatToAskAbout(d.code),
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

    /*
     * APPLIED IN ONE PLACE, AT THE END, ON PURPOSE. Threading the rule through eight builders is
     * eight chances to forget it and no single place to read what the board gives away. Here the
     * whole answer is one paragraph, and a section added later is walled by being added to it
     * rather than by whoever wrote it remembering.
     */
    if (whoMaySee.peersHidden) {
      out.contribution = onlyWhatThisReaderMaySee(out.contribution as any, whoMaySee);
      out.coverage = onlyWhatThisReaderMaySee(out.coverage as any, whoMaySee);
      out.whoOwnsWhat = onlyWhatThisReaderMaySee(out.whoOwnsWhat as any, whoMaySee);
      out.managerAlignment = onlyWhatThisReaderMaySee(out.managerAlignment as any, whoMaySee);
      out.patterns = onlyWhatThisReaderMaySee(out.patterns as any, whoMaySee);
      out.dependencies = onlyHandoffsTheyAreIn(out.dependencies as any, whoMaySee);
      if (out.checkInGrid) {
        out.checkInGrid = {
          ...(out.checkInGrid as any),
          rows: onlyWhatThisReaderMaySee((out.checkInGrid as any).rows, whoMaySee),
        };
      }
      /* Said, rather than left as a board that has quietly lost most of itself. */
      out.whyYouOnlySeeYourself = WHY_YOU_ONLY_SEE_YOURSELF;
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
        where: { disputedAt: null, participant: { groundId: ground.id } },
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
        // A read with nothing in it is nothing to show. But a read we have the
        // words for and no NAME for is still a read, and dropping it meant the
        // board quietly lost whatever the model had found outside the library.
        // It is shown under a generic heading instead.
        if (!g?.gap) return null;
        const named = spec ?? {
          pattern: 'unrecognised',
          pole: null,
          label: 'Also worth your attention',
          why: 'This came back outside the patterns we name, so it is shown as it was read.',
        };

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
        const noteText = modelNote ?? String(named.why);

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
          pattern: named.pattern as any,
          pole: named.pole as any,
          label: named.label,
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
    if (!ground) throw new NotFoundException('Check-in not found');
    /**
     * GATED ON THE SECTION, NOT ON THE BOARD EXISTING.
     *
     * This asked "does this ground have a board", which was the same question while the only
     * boardless families were the ones with no sections at all. Sensing boards now exist and
     * deliberately have NO objectives section - a pulse or a drift has no target anybody stated,
     * which is the whole reason its board is reduced. Asking the weaker question let an initiator
     * write a target onto a board that will never show it.
     */
    if (!boardHasSection(ground.scenario, 'objectives')) {
      throw new ForbiddenException('This check-in does not track targets');
    }
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Only the person who set this check-in up can change what it is aiming for');
    }
    return ground;
  }

  async createObjective(
    groundId: string,
    requestingUserId: string,
    dto: { name: string; target?: number | null; ownerParticipantId?: string | null },
  ) {
    await this.assertInitiatorOfBoardGround(groundId, requestingUserId);
    const owner = await this.whoOnThisGround(groundId, dto.ownerParticipantId);
    const [count, rounds] = await Promise.all([
      this.prisma.groundObjective.count({ where: { groundId } }),
      /* Optional-chained like the reads next door: a caller whose prisma double stubs only what it
         needs must get an empty list, not a crash on a write that does not depend on it. */
      this.prisma.checkIn?.findMany?.({ where: { groundId }, select: { sessionNumber: true, status: true } })?.catch(() => [] as any[]) ?? [],
    ]);
    // Stamp the session it was added in, so the board can flag it as new and show
    // who has been asked about it. A target means nothing until people have
    // checked in against it.
    /*
     * STAMPED AGAINST THE ROUND THAT IS RUNNING, not the row written ahead for next week.
     *
     * Taking the highest session number meant a target set this morning was stamped against next
     * week, so the board reported "still to be asked" about people who could have been asked in the
     * round that was actually open - and would keep reporting it for a week. See whichRoundIsOpen.
     */
    const addedAtSession = count === 0 ? null : (whichRoundIsOpen(rounds as any) || 1);
    return this.prisma.groundObjective.create({
      data: {
        groundId,
        name: dto.name.trim(),
        target: dto.target ?? null,
        ownerParticipantId: owner,
        sortOrder: count,
        addedAtSession,
      },
    });
  }

  /**
   * SPLIT A TOTAL ACROSS PEOPLE, AND WRITE NOTHING.
   *
   * The arithmetic is deterministic and lives in its own module; this only checks who is asking and
   * hands the proposal back. Nothing is saved on purpose: a chief of staff argues with these in
   * front of the people they belong to, so she changes them first and then sets each one through
   * the ordinary route, which is also what keeps every target something a person chose.
   */
  async proposeObjectives(
    groundId: string,
    requestingUserId: string,
    dto: { total: number; people?: { key: string; lastPeriod: number; months?: number }[]; rows?: (string | number | null)[][] },
  ) {
    await this.assertInitiatorOfBoardGround(groundId, requestingUserId);
    /* A file if they dropped one, otherwise people they typed. The file wins where both arrive:
       it is the thing they can see, and the one they will believe. */
    const read = dto.rows?.length ? peopleFrom(dto.rows) : null;
    const people = read ? read.people : (dto.people ?? []).map((p) => ({
      key: p.key,
      lastPeriod: p.lastPeriod,
      /* No tenure given is read as a full year - the neutral reading, no part-year adjustment -
         and `monthsKnown` tells the caller it was not theirs so nothing pretends otherwise. */
      months: p.months ?? 12,
      monthsKnown: p.months != null,
    }));
    const shares = splitTheTotal(people, dto.total);
    return {
      shares: shares.map((s) => ({ ...s, monthsKnown: people.find((p) => p.key === s.key)?.monthsKnown ?? false })),
      saying: sayingWhatTheSplitDoes(shares, dto.total),
      /* What the file turned out to hold, so a wrong column is visible beside the numbers it
         produced rather than only in the numbers. */
      readFromTheFile: read ? { missing: read.missing, skipped: read.skipped, people: read.people.length } : null,
    };
  }

  /**
   * A PARTICIPANT ID FROM SOMEWHERE ELSE IS NOT AN OWNER.
   *
   * Ids arrive from a form, and an id belonging to another check-in would hang one person's number
   * off a check-in they are not on - visible to everybody on it, and invisible to them. Checked
   * rather than trusted; anything that does not belong here becomes nobody's, which is the state
   * every target was in before this existed.
   */
  private async whoOnThisGround(groundId: string, participantId?: string | null): Promise<string | null> {
    if (!participantId?.trim()) return null;
    const found = await this.prisma.groundParticipant.findFirst({
      where: { id: participantId.trim(), groundId },
      select: { id: true },
    });
    return found?.id ?? null;
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
    if (!ground) throw new NotFoundException('Check-in not found');
    if (!boardRendersFor(ground.scenario)) {
      throw new ForbiddenException('This check-in does not have a board');
    }
    /**
     * AND THE POLL SECTION SPECIFICALLY, which the board check above no longer implies.
     *
     * While a private check-in had no board at all, "has a board" happened to exclude everything without
     * a poll. Every check-in has a board now, so a one-round read would have accepted a schedule it has
     * no section to show and nothing to schedule - there is no second session to pick a time for.
     *
     * Same shape as the objectives gate above: write to the SECTION, not to the board.
     */
    if (!boardHasSection(ground.scenario, 'poll')) {
      throw new ForbiddenException('This check-in does not schedule its own sessions');
    }
    const me = ground.participants.find((p) => p.userId === requestingUserId);
    if (!me) throw new ForbiddenException('You are not a participant in this check-in');

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

  /**
   * WHAT THE WHOLE ORGANISATION IS WAITING ON.
   *
   * The per-ground board has read handoffs well for a long time; what it cannot see is that the same
   * person has been waiting on the same thing for a month across three grounds. This gathers them,
   * resolves each side to a person so the same human is one person everywhere, and hands them to the
   * pure read. No rule about what counts lives here - that stays in the read where it can be checked.
   *
   * Participants are matched by email, which is the only identifier a participant row and a person
   * reliably share. A participant with no email cannot be resolved and is left out rather than
   * guessed at: attributing somebody's wait to the wrong person is worse than not showing it.
   */
  /**
   * THE IMPORTED HALF OF THE CASCADE READ.
   *
   * A customer's own system already knows which objective hangs under which; we store the parent id
   * on the row and, until now, nothing but one detector ever read it. This resolves it to a title so
   * the board can say what this sits under in the customer's own words.
   *
   * MATCHED BY TITLE, DELIBERATELY LOOSELY, AND ONLY TO NARROW. A ground has no foreign key to an
   * imported objective - the link is that a lead typed roughly the same thing. So this returns rows
   * whose title shares a meaningful word with a target on this board, and returns nothing at all
   * when no target was set. A wrong match here would put somebody else's objective at the top of
   * this board, which is worse than showing nothing.
   */
  private async cascadeParents(organizationId: string, objectiveNames: string[]) {
    const words = new Set(
      objectiveNames.flatMap((n) => n.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)),
    );
    if (words.size === 0) return [];
    const rows = await this.prisma.subject.findMany({
      where: { organizationId, sourceDeletedAt: null, parentExternalId: { not: null } },
      select: { title: true, parentExternalId: true, sourceSystem: true },
      take: 200,
    });
    const near = rows.filter((r) =>
      r.title.toLowerCase().split(/[^a-z0-9]+/).some((w) => w.length > 3 && words.has(w)));
    if (near.length === 0) return [];
    const parents = await this.prisma.subject.findMany({
      where: { organizationId, externalId: { in: near.map((r) => r.parentExternalId!) } },
      select: { externalId: true, title: true },
    });
    const titleOf = new Map(parents.map((p) => [p.externalId, p.title]));
    return near.map((r) => ({ title: r.title, parentTitle: titleOf.get(r.parentExternalId!) ?? null }));
  }

  async waitingAcrossTheOrg(organizationId: string, now = new Date()) {
    const rows = await this.prisma.groundDependency.findMany({
      where: {
        ground: { organizationId },
        status: { in: [DependencyStatus.BLOCKING, DependencyStatus.WAITING] },
      },
      select: {
        fromParticipantId: true, onParticipantId: true, onLabel: true, what: true,
        status: true, createdAt: true, groundId: true,
        ground: { select: { label: true } },
        fromParticipant: { select: { email: true } },
        onParticipant: { select: { email: true } },
      },
    });

    const deps: OrgDependency[] = [];
    for (const r of rows) {
      const from = r.fromParticipant?.email?.toLowerCase();
      if (!from) continue;
      deps.push({
        fromParticipantId: r.fromParticipantId,
        onParticipantId: r.onParticipantId,
        onLabel: r.onLabel,
        what: r.what,
        status: r.status,
        createdAt: r.createdAt,
        groundId: r.groundId,
        groundLabel: r.ground?.label ?? '',
        fromPersonKey: from,
        onPersonKey: r.onParticipant?.email?.toLowerCase() ?? null,
      });
    }

    const waiting = whatThePlaceIsWaitingOn(deps, now);
    return { waiting, waitedOn: whoIsBeingWaitedOn(waiting) };
  }

  /**
   * WHERE A MANAGER IS NEEDED THIS WEEK.
   *
   * Every input already existed and nothing asked the question, which is the same gap escalation
   * filled one level down: a careful per-person read is worth nothing to somebody with twelve people
   * if they have to open twelve of them to find the one that matters.
   *
   * ASSEMBLY ONLY. Every judgement here was made somewhere else and is only being grouped - the
   * handoffs come from the board, the ran-out cycle from the escalation rules, and asking to be
   * shown from what the person said in their own check-in. Nothing new is decided about anybody,
   * which is what keeps this a router rather than a second opinion.
   *
   * The shaping - four buckets, no score, what it refuses to mean - is in who-needs-you-this-week.ts.
   */
  async whoNeedsYouThisWeek(organizationId: string, managerKey: string) {
    const key = managerKey.toLowerCase();
    const now = new Date();
    const { waiting } = await this.waitingAcrossTheOrg(organizationId);

    const needs: Need[] = [];

    for (const w of waiting as any[]) {
      /*
       * THE MANAGER'S OWN QUEUE FIRST. A manager reading a list of people who need attention while
       * being the thing several of them are waiting for is the version of this that does harm.
       */
      if (w.onPersonKey === key) {
        needs.push({
          kind: 'WAITING_ON_YOU',
          who: w.fromLabel ?? w.fromPersonKey ?? 'somebody',
          says: `waiting on you for ${w.what}`,
          waitingDays: w.waitingDays,
        });
        continue;
      }
      /* Raised, still open, and not theirs to clear. Long waits sort themselves to the top. */
      if (w.escalatedAt) {
        needs.push({
          kind: 'STUCK_AND_RAISED',
          who: w.fromLabel ?? w.fromPersonKey ?? 'somebody',
          says: `raised that they are stuck on ${w.what}${w.onLabel ? ` with ${w.onLabel}` : ''}`,
          waitingDays: w.waitingDays,
        });
      }
    }

    /*
     * ASKED TO BE SHOWN. The cheapest thing on the whole list to fix and the one most likely to be
     * read as a performance problem, which is why it carries its own sentence about what it asks
     * for. Only ever from what the person said about themselves - see they-said-why-themselves.ts.
     */
    const said = await this.prisma.checkIn.findMany({
      where: { saidWhy: 'SKILL', ground: { organizationId } },
      /*
       * The check-in's own completion, not a timestamp on the person. `completedAt` is when they
       * said it; falling back to when the check-in was made keeps an in-progress one from reading
       * as nought days old.
       */
      select: { completedAt: true, createdAt: true, participant: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }).catch(() => [] as any[]);

    for (const c of said as any[]) {
      const who = c.participant?.email ?? 'somebody';
      needs.push({
        kind: 'ASKED_TO_BE_SHOWN',
        who,
        says: 'said themselves that they do not know how to do something they have taken on',
        waitingDays: Math.max(0, Math.floor((now.getTime() - new Date(c.completedAt ?? c.createdAt).getTime()) / 86400000)),
      });
    }

    return whoNeedsYou(needs);
  }


  /**
   * THE REPORT'S ENGINES, OVER EVERY SESSION. Every record line from every completed check-in on the
   * ground, the written report's agreements and differences, every target's movement, every open
   * dependency, every OPEN document: the same pure functions the session report runs, with the
   * ground's rows instead of one session's. Names go through the same labels the board already uses.
   */
  private async everySessionThroughTheReportEngines(groundId: string, ground: any, checkIns: any[], openRound: number) {
    const completed = checkIns.filter((c) => c.status === CheckInStatus.COMPLETED);
    const [entries, docs, baseline, deps] = await Promise.all([
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, checkInId: { in: completed.map((c) => c.id) } },
        select: { type: true, text: true, participantId: true, recallBased: true, anchoredOrigin: true, dimensionThreadKey: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.groundDocument.findMany({ where: { groundId, visibility: 'OPEN' as any }, select: { fileName: true, participantId: true, origin: true } }),
      (this.prisma as any).groundBaseline?.findFirst?.({ where: { groundId }, select: { successLooksLike: true } }) ?? Promise.resolve(null),
      this.prisma.groundDependency.findMany({ where: { groundId, status: { in: ['WAITING', 'BLOCKING'] as any } }, select: { what: true, status: true, blockerKind: true } }),
    ]);
    const labels = labelsForParties(ground.participants as any);
    const nameOf = (pid: string | null) => (pid ? (labels.get(pid) ?? 'A teammate') : null);
    const report = ground.report ?? {};
    /* Who answered THIS round, against the one definition of who is expected (how-many-have-answered.ts). */
    const whoAnswered = await howManyHaveAnswered(this.prisma, groundId, openRound);
    const waiting = new Set(whoAnswered.waitingOn);
    const answered = ground.participants.filter((p: any) => !waiting.has(p.id) && completed.some((c) => c.participantId === p.id && c.sessionNumber === openRound));
    const held = await whatThisSessionHolds(this.prisma, groundId, openRound);
    const shape = theSessionReport({
      sessionNumber: openRound,
      closed: !!report.releasedAt,
      agreements: (report.agreements ?? []) as unknown[],
      divergences: (report.divergences ?? []) as unknown[],
      entries: entries.map((e) => ({ type: e.type, text: cleanText(e.text), who: nameOf(e.participantId), recallBased: e.recallBased, backedBy: (e as any).anchoredOrigin ?? null, threadKey: e.dimensionThreadKey ?? null })),
      previousEntries: [],
      baselineSuccess: baseline?.successLooksLike ?? null,
      startingPoint: null,
      previousSharedPicture: null,
      evidence: docs.map((d: any) => ({ text: originLabel(d.origin) ? `${d.fileName} · ${originLabel(d.origin)}` : d.fileName, who: nameOf(d.participantId) })),
      specificityLevel: null,
      centralQuestion: report.centralQuestion ?? null,
      /* From the one owner, over the round in play - not a lifetime delta and not every dependency ever raised. */
      movedOnTargets: held.movedOnTargets,
      blocked: held.blocked,
      waiting: held.waiting,
      answeredThisSession: answered.map((p: any) => ({ who: nameOf(p.id) ?? 'A teammate', isYou: false })),
      peopleInAll: whoAnswered.expected,
    });
    const question = draftTheQuestion({
      functions: ground.participants.map((p: any) => ({ fn: p.detectedFunction ?? null, confidence: p.detectedFunctionConfidence ?? null })),
      blockers: deps.map((d) => ({ what: d.what, kind: (d.blockerKind as any) ?? null })),
    });
    /* The tiles are counted over the round in play, so "this session" is now true on the board too;
       the rewrite to "across every session" that used to sit here was papering over lifetime counts. */
    return { ...shape, theConversationWorthHaving: question?.text ?? null };
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
