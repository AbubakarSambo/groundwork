import { hashed } from '../auth/a-token-is-stored-as-its-hash';
import { ALIGNMENT_FEED_ONLY_CODES, BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES, isPositiveCode, isCarryingCode, WHAT_A_CARRYING_CODE_IS_CALLED } from '../patterns/pattern-library';
import { hasEnded, isHeld, mayChangeOnItsOwn, whyItRefuses, WHILE_IT_IS_HELD } from './a-ground-that-has-ended';
import { AN_ANSWER, AT_LEAST_ONE_ACCOUNT } from './an-answer-includes-a-refusal';
import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SEAT_WHERE } from '../../common/seats';
import { whetherThereIsRoomForOneMore, type SeatAnswer } from './added-but-waiting-for-a-seat';
import { whatTheDocumentsSay, stillNeedsSomethingInWriting } from './what-the-documents-say';
import { whatFitsInTheRoom, tellThemWhatIsMissing } from '../conversation/a-prompt-that-ran-out-of-room-says-so';
import { daysRemaining, deadlineOf, clockStartsAt } from './when-the-clock-starts';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { theNextDayTheyWork, workingDaysOf } from './which-days-this-team-works';
import { contextGaps, contextChatPrompt } from './the-context-chat';
import { forHumans } from '../presentation/outbound';
import { AnthropicService } from '../conversation/anthropic.service';
import { EmailService } from '../email/email.service';
import { BillingService } from '../billing';
import { UsageService } from '../usage/usage.service';
import { CreateGroundDto, AddParticipantDto, CreateGroundForLeadDto } from './dto';
import { GroundworkEvents, GroundActivatedEvent } from '../../common';
import { GroundScenario, GroundStatus, PartyType, CheckInStatus, Cadence, UsageEventType, TokenType, Prisma, GroundMoment, ContextNoteAudience, DocumentVisibility } from '@prisma/client';
import { endStatesFor } from '../resolution/end-states';
import { canSignIn } from './can-sign-in';
import { defaultModeFor, boardRendersFor } from '../board/board-families';
import { howACheckInIsGoing } from './how-a-check-in-is-going';
import { totalSessionsFor } from './session-count';
import { sentencesIn } from '../presentation/where-a-sentence-actually-ends';
import { BoardFamily, familyFor } from '../board/board-families';
import { runIntake } from '../conversation/intake';
import { objectiveState, describeObjective, mayBeReadAgainst, canShowMovement, BASELINE_IS_FROZEN } from './an-objective-belongs-to-a-person';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { AUTHORED_AT_SETUP, WHAT_RECORDING_IT_MEANS } from './what-setup-agreed';
import { proposalFrom, extractionToolFor, Heard, Proposal, WHO_AND_WHAT_THEY_EXPECT, asContextThenTheSentence } from './what-the-context-chat-heard';
import { freeSeatLimitMessage } from '../billing/billing.service';
import { isSubscribed } from '../../common/subscription';
import { DEFAULT_FREE_MEMBER_LIMIT } from '../billing/pricing.service';
import { truncationsOfTheirWords } from '../conversation/the-record-holds-what-was-said';
import { screen, ASK_AGAIN } from '../conversation/nothing-invented-reaches-them';
import { mayOpen, HOW_A_NEW_ORG_WORKS } from './who-may-open-a-check-in';
import { notTheWordParty } from '../reports/not-the-word-party';
import { isASecondOrganisation, GUEST_ROLE } from '../participants/joining-a-second-organisation';
import { aNameOutOfAnAddress } from '../users/a-name-out-of-an-address';
import { adminsThisOrg, maySee, groundsAViewerMayList } from './who-may-read-this-check-in';
import { inviteExpiryFrom } from '../participants/how-long-an-invite-lasts';

// Default timelines per scenario (Part 2 - timeline and cadence).
export const DEFAULT_TIMELINE_DAYS: Record<GroundScenario, number> = {
  /** Short on purpose: nobody has named the situation yet, so committing months to it is a guess. */
  OPEN_READ: 30,
  NEW_HIRE: 90,
  /** Short, and deliberately shorter than onboarding. A handover that is still running in three
      months is not a handover, it is the leaver still doing the job. */
  ROLE_HANDOVER: 30,
  NEW_COFOUNDER: 90,
  NEW_ADVISOR: 365,
  NEW_PROJECT: 90,
  NEW_MANAGER: 90,
  CONTRACT_RENEWAL: 60,
  /** Short, and it has an end: it finishes when the contract is signed. A review that runs for a
      quarter is two companies who have stopped meaning to sign anything. */
  CONTRACT_REVIEW: 60,
  /** A year, because that is the shape of a commercial arrangement, and because the value of this
      one is entirely in the months where nothing happens. */
  IMPLEMENTATION_TRACKING: 365,
  RECOGNITION: 30,
  DRIFT: 90,
  CRISIS_ALIGNMENT: 60,
  OKR_ALIGNMENT: 90,
  WORKPLAN_BUDGET: 90,
  /**
   * A YEAR, BECAUSE "REGULAR" IS THE WHOLE POINT OF THIS ONE.
   *
   * It was 30 days, which gave a regular read on live work four weekly sessions and then ended it.
   * A month of a weekly team check-in is not a regular read on live work; it is a month. Her words:
   * "regular read can run for 12 months."
   *
   * The distinction this rests on already exists and is already correct in the picker. PULSE_CHECK is
   * the recurring read; SNAPSHOT is the one-off - "a pulse check", one session, no target, no second
   * round. They were one card once, which is why neither could be found. What was left over is that
   * the recurring one kept the short clock.
   *
   * 12 months is already an option on the Setup tab, so nothing new is reachable - what changes is
   * what somebody gets without touching it. Weekly over a year is 52 sessions, which is what a
   * weekly team check-in for a year actually is; a lead who wants fewer sets a cadence.
   */
  PULSE_CHECK: 365,
  REALIGN_TEAM: 60,
  PIP: 90,
  BOARD_STRATEGY: 90,
  COHORT_CHECK: 30,
  // A shock is days-fresh by definition: the shared picture is built fast, and
  // the suggested optional follow-up ("what turned out different from your
  // first read?") sits about a week later - two weeks covers the whole arc.
  ACUTE_SHOCK: 14,
  /**
   * One day, because there is one session and it is today.
   *
   * Not zero: the timeline is what `sessionsFor` divides by, and it also sets when the ground
   * closes. One day with a ONE_TIME cadence gives exactly one session and a ground that resolves
   * the same day rather than sitting open for a month with nothing left to happen in it.
   */
  SNAPSHOT: 1,
};

/**
 * THE CADENCE THAT SUITS EACH SITUATION, WHICH NOTHING USED TO DECIDE.
 *
 * `DEFAULT_TIMELINE_DAYS` above has been tuned per scenario since it was written - 14 days for a
 * shock, a year for an advisor. The cadence beside it was a single hardcoded `?? Cadence.FORTNIGHTLY`
 * at both creation paths, so the number of check-ins a ground actually held was whatever fell out of
 * dividing one tuned number by one untuned one:
 *
 *   ACUTE_SHOCK    14 days at fortnightly  = ONE session, for a scenario whose own pack describes a
 *                                            first read and a follow-up a week later
 *   NEW_ADVISOR   365 days at fortnightly  = 26 sessions, for a relationship that warrants a monthly
 *                                            conversation, and more than a new hire gets in a quarter
 *
 * A RECOMMENDATION, NOT A SETTING. Every value here is pre-selected in the cadence dropdown at
 * creation and the lead can change it before anything is sent. That is the whole intent: they should
 * not have to work out from first principles how often to ask four people to account for themselves,
 * and they should not be stuck with our answer either.
 */
/**
 * THE MOMENT A SITUATION USUALLY STARTS FROM.
 *
 * A recommendation, exactly like the cadence beside it: the lead can change it, and on the signed-in
 * picker they always could. What they could not do is have it be right by default, and on the public
 * entry flow they could not set it at all - `entry.service.ts` hardcoded STARTING at both of its
 * creation paths, so "your biggest client left on Tuesday" and "the project is eight weeks late" both
 * arrived as grounds that believed they were beginning.
 *
 * The cards already answer this question. "You hired a sales lead, they start Monday" is at the start;
 * "the project is eight weeks late and everyone has a different reason" is not. Making somebody
 * re-classify a concrete situation into an abstract taxonomy is the problem the cards exist to solve.
 *
 * RECOGNITION IS THE MIDDLE, not the recognition scenario. The enum value predates this and rows hold
 * it, so it stays: the label a person reads is "Mid-way". One consequence to be careful of - the
 * moment-qualified prompt key is `scenario.<scenario>.<moment>.<party>`, so a genuinely valid key is
 * `scenario.recognition.recognition.initiator`. That is checked by a guard rather than renamed.
 */
export const RECOMMENDED_MOMENT: Record<GroundScenario, GroundMoment> = {
  // Nothing has happened yet. The expectations are what is being set.
  NEW_HIRE: GroundMoment.STARTING,
  ROLE_HANDOVER: GroundMoment.STARTING,
  NEW_PROJECT: GroundMoment.STARTING,
  NEW_COFOUNDER: GroundMoment.STARTING,
  NEW_MANAGER: GroundMoment.STARTING,
  NEW_ADVISOR: GroundMoment.STARTING,
  OKR_ALIGNMENT: GroundMoment.STARTING,
  WORKPLAN_BUDGET: GroundMoment.STARTING,
  BOARD_STRATEGY: GroundMoment.STARTING,
  /** One choice with a date on it. The decision is ahead, so this is a beginning. */
  CRISIS_ALIGNMENT: GroundMoment.STARTING,
  /** Nothing is signed yet, so everything is ahead. */
  CONTRACT_REVIEW: GroundMoment.STARTING,
  /** The first session establishes what each person owns, which nothing else has. */
  PULSE_CHECK: GroundMoment.STARTING,
  /** The standard is agreed and shown before anything is measured against it. */
  PIP: GroundMoment.STARTING,
  /** The picture first, then the recovery objective. Both are set here, not inherited. */
  ACUTE_SHOCK: GroundMoment.STARTING,

  // Work is already running and this is a read on it.
  /** The agreement is signed and running. This is a read on how it is actually going, month after
      month, and most months the answer should be that it is going fine. */
  IMPLEMENTATION_TRACKING: GroundMoment.RECOGNITION,
  COHORT_CHECK: GroundMoment.RECOGNITION,
  DRIFT: GroundMoment.RECOGNITION,
  REALIGN_TEAM: GroundMoment.RECOGNITION,
  /** The situation is not named yet, so it cannot be a beginning anybody designed. */
  OPEN_READ: GroundMoment.RECOGNITION,
  /** One honest read of right now. No objective to set and none to close. */
  SNAPSHOT: GroundMoment.RECOGNITION,
  /** The case is built from a period that has already happened. */
  RECOGNITION: GroundMoment.RECOGNITION,

  // Closing something out.
  /** What the term delivered, judged against what it was meant to. */
  CONTRACT_RENEWAL: GroundMoment.RESOLUTION,
};

export const RECOMMENDED_CADENCE: Record<GroundScenario, Cadence> = {
  NEW_HIRE: Cadence.FORTNIGHTLY,
  /** Weekly, because the window is 30 days and the leaver is walking out of it. */
  ROLE_HANDOVER: Cadence.WEEKLY,
  NEW_PROJECT: Cadence.FORTNIGHTLY,
  NEW_COFOUNDER: Cadence.FORTNIGHTLY,
  NEW_MANAGER: Cadence.FORTNIGHTLY,
  /** Monthly, not fortnightly: 26 check-ins a year is a job, not an advisory relationship. */
  NEW_ADVISOR: Cadence.MONTHLY,
  CONTRACT_RENEWAL: Cadence.FORTNIGHTLY,
  /** Fortnightly and short. Before signing there is a decision ahead of both sides, and a monthly
      rhythm would let a misunderstanding sit for four weeks while the drafting moves on. */
  CONTRACT_REVIEW: Cadence.FORTNIGHTLY,
  /** MONTHLY, AND THIS IS THE MOST LOAD-BEARING CADENCE IN THE FILE.
      A tracking ground that asks twelve questions a fortnight about a relationship that is fine is
      one people stop answering — and then it is worthless in the month it matters. */
  IMPLEMENTATION_TRACKING: Cadence.MONTHLY,
  RECOGNITION: Cadence.FORTNIGHTLY,
  /** Weekly. A standard somebody is being measured against deserves more than six readings. */
  PIP: Cadence.WEEKLY,
  OKR_ALIGNMENT: Cadence.FORTNIGHTLY,
  /** Monthly: a budget moves on a monthly rhythm, and asking fortnightly invents movement. */
  WORKPLAN_BUDGET: Cadence.MONTHLY,
  /** Weekly, because "what is your team actually doing" is a weekly question or it is not one. */
  /**
   * MONTHLY, BECAUSE THIS ONE NOW RUNS FOR A YEAR.
   *
   * Weekly was right against a 30-day clock. Against 365 it is 52 rounds, and
   * `every-situation-has-a-rhythm` already refuses more than twenty - "never so many that a
   * check-in becomes a chore". That cap is a decision somebody made and it is the right one; a
   * weekly check-in somebody has to do fifty-two times is not a read on live work, it is a rota.
   *
   * Monthly over a year is twelve, which is where NEW_ADVISOR already sits on the same clock. A lead
   * who wants it tighter sets a cadence on Setup, and 12 months at fortnightly is 26 - over the cap,
   * so that is a decision to take deliberately rather than by default.
   */
  PULSE_CHECK: Cadence.MONTHLY,
  /** Weekly: a gap that is being closed has to be read often enough to tell closing from holding. */
  DRIFT: Cadence.WEEKLY,
  CRISIS_ALIGNMENT: Cadence.FORTNIGHTLY,
  /** Monthly: strategy does not change fortnightly, and pretending it does produces noise. */
  BOARD_STRATEGY: Cadence.MONTHLY,
  COHORT_CHECK: Cadence.FORTNIGHTLY,
  /** Daily for a fortnight. This is the one that was silently reduced to a single session. */
  ACUTE_SHOCK: Cadence.DAILY,
  REALIGN_TEAM: Cadence.FORTNIGHTLY,
  OPEN_READ: Cadence.FORTNIGHTLY,
  /** The only ONE_TIME in the product: one round, and no follow-up is ever scheduled. */
  SNAPSHOT: Cadence.ONE_TIME,
};

// All scenarios support any number of participants - the initiator decides who
// needs to be in the ground. No hard-coded per-scenario cap.
export function isMultiPartyScenario(_scenario: GroundScenario): boolean {
  return true;
}

// Fields safe to expose on a participant to anyone who can view the ground.
// Trust-critical: NEVER serialize inviteToken (magic link → account takeover),
// soloArtifact (the AI summary of this party's PRIVATE record), specificityHistory
// (a behavioural signal about them). Those belong to the
// participant alone - record ownership is the mechanism, enforced here, not by
// policy. (GW-01.)
export const SAFE_PARTICIPANT_SELECT = {
  id: true,
  email: true,
  partyType: true,
  userId: true,
  roleAsDescribed: true,
  invitedAt: true,
  notifiedAt: true,
  /* On the check-in with nothing sent to them, waiting on a seat. Without this the roster reads
     "Invite pending" about a mail that was never sent, and the lead chases the person instead of
     the admin. See added-but-waiting-for-a-seat.ts. */
  awaitingSeat: true,
  inviteDeliveryStatus: true, // SENT | DELIVERED | BOUNCED | COMPLAINED (Resend webhook mirror)
  soloArtifactAt: true, // timestamp only - never the artifact content
  soloArtifactShared: true, // whether participant chose to share; content fetched separately via get()
  signedOffAt: true, // "my account is accurate" confirmation - safe to show all parties, same tier as soloArtifactAt
  createdAt: true,
  // ONLY the display name of the linked user - so a participant can see WHO is here
  // by name when their email is hidden. Deliberately firstName/lastName only: no email,
  // no other user PII is pulled through this nested select.
  /*
   * `awaitingOrgApproval` because a lead chasing somebody needs to know it is not them.
   *
   * "When you add a participant that is one on the org, the org has to approve, and you see
   * pending org approval and not pending check-in." The roster showed "Invite pending" for
   * somebody whose invitation had actually gone out and who is blocked by an admin in the
   * lead's OWN organisation - so the lead reads it as the person ignoring their email and
   * chases the wrong thing.
   *
   * A boolean about whether they can act yet, not a fact about them: this is the same tier as
   * `invitedAt` and `signedOffAt`, which every party already sees.
   */
  user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } },
} as const;

/**
 * What the parties actually agree on, and what is still open.
 *
 * The ground's old "confidence" was min(5, completedCheckIns) rendered as
 * "5/5 Aligned". It measured ACTIVITY, not agreement, and could not tell the
 * two apart: an advisor ground with five real agreements and zero divergences
 * scored identically to a performance-improvement plan whose report contained
 * nothing at all, which told both parties on a formal process that they were
 * fully aligned.
 *
 * This reads the only place agreement is actually recorded - the report's own
 * `agreements` and `divergences`. When neither holds anything there is nothing
 * to say, and it returns null so the surface shows no read rather than
 * rounding an empty record up to a score.
 */
export function alignmentRead(report: { agreements?: unknown; divergences?: unknown } | null | undefined):
  { agreed: number; open: number } | null {
  if (!report) return null;
  const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const agreed = count(report.agreements);
  const open = count(report.divergences);
  if (agreed + open === 0) return null;
  return { agreed, open };
}

@Injectable()
export class GroundsService {
  private readonly logger = new Logger(GroundsService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private billing: BillingService,
    private events: EventEmitter2,
    private usage: UsageService,
    private config: ConfigService,
    /**
     * The context chat needs a model. Injected here rather than routed through
     * ConversationService because that service is about check-ins - somebody's
     * account - and this conversation is deliberately not one.
     */
    private anthropic: AnthropicService,
  ) {}

  /**
   * @param creatorRole the caller's role in the organisation. A ground created by
   *   somebody who is not an ADMIN waits for one to accept it - her requirement, and
   *   the reason it is a parameter rather than a lookup is that the controller already
   *   has it on the token and a second read could disagree with the guard.
   */
  async create(organizationId: string, initiatorId: string, dto: CreateGroundDto, creatorRole?: string) {
    // --- Billing gate ---
    // Resolve whether this org may create a ground right now, and how.
    const canCreate = await this.billing.canCreateGround(organizationId, dto.accessCode);
    if (!canCreate.allowed) {
      throw new BadRequestException(canCreate.reason ?? 'You cannot open a check-in here.');
    }

    /*
     * WHETHER THIS PERSON MAY OPEN ONE AT ALL, AND WHETHER IT WAITS.
     *
     * Hafsah's call: named leads open check-ins and they go for approval; people who are not named
     * cannot open one, they take part in one. Both halves can be switched off by the organisation.
     *
     * BEFORE THE BILLING WRITE AND OUTSIDE THE TRANSACTION, because a refusal here should cost
     * nothing - no seat consumed, no free ground spent, nothing rolled back. The old rule lived in
     * one expression on the status line further down, which could only ever decide whether it
     * waited; there was no way to say no.
     *
     * `creatorRole` is passed by the controller from the token rather than read again here, which
     * is the existing arrangement and deliberate: a second read could disagree with the guard that
     * already let this request through.
     */
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whoMayOpenCheckIns: true, checkInsNeedApproval: true },
    });
    const answer = mayOpen(
      /*
       * The role from the token, not a second read of the row. That is the existing arrangement
       * for `creatorRole` and it is deliberate: a second read could disagree with the guard that
       * already let this request through.
       */
      { role: creatorRole ?? 'MEMBER' },
      {
        whoMayOpen: (org?.whoMayOpenCheckIns as 'NAMED_LEADS' | 'EVERYONE') ?? HOW_A_NEW_ORG_WORKS.whoMayOpen,
        needsApproval: org?.checkInsNeedApproval ?? HOW_A_NEW_ORG_WORKS.needsApproval,
      },
    );
    if (!answer.may) throw new ForbiddenException(answer.because);

    const ground = await this.prisma.$transaction(async (tx) => {
      const initiator = await tx.user.findUnique({ where: { id: initiatorId } });
      if (!initiator) throw new NotFoundException('The lead of this check-in could not be found');

      // Determine free-ground fields from the billing gate result.
      const isFreeGround = canCreate.freeReason !== undefined;
      const groundData: Record<string, unknown> = {
        organizationId,
        initiatorId,
        label: dto.label,
        scenario: dto.scenario,
        // Immutable after this point. Omitting it takes the family default so a
        // sensing-family ground is never accidentally created shared.
        mode: dto.mode ?? defaultModeFor(dto.scenario),
        moment: dto.moment,
        timelineDays: dto.timelineDays ?? DEFAULT_TIMELINE_DAYS[dto.scenario],
        /** Whether this was chosen or guessed for them, so the setup chat can offer to fix it. */
        timelineStated: dto.timelineDays != null,
        cadenceStated: dto.cadence != null,
        cadence: dto.cadence ?? RECOMMENDED_CADENCE[dto.scenario],
        cadenceAnchorDay: dto.cadenceAnchorDay ?? null,
        workingDays: workingDaysOf(dto.workingDays),
        startsAt: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, dto.workingDays),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        /**
         * AN ORG ADMIN ACCEPTS A GROUND BEFORE ANYBODY IS INVITED TO IT.
         *
         * A member's ground waits. An admin's does not - they are the approver, and
         * making them approve their own work is a step that teaches people to click
         * through steps.
         *
         * The status is the whole gate: `addParticipant` refuses while it holds, so
         * nobody can be invited, and an approval nobody could pre-empt is the only
         * kind worth having.
         *
         * WHETHER IT WAITS IS NOW THE ORGANISATION'S DECISION, decided above and by one function
         * rather than by this expression. An organisation that turns approval off gets an open
         * check-in here; the gate itself is untouched and comes straight back when they turn it on.
         */
        status: answer.waits ? GroundStatus.AWAITING_APPROVAL : GroundStatus.OPEN,
        resolutionState: dto.resolutionState ?? null,
        brief: dto.brief ?? null,
        joinToken: crypto.randomBytes(24).toString('hex'),
        freeParticipantCap: dto.freeParticipantCap ?? DEFAULT_FREE_MEMBER_LIMIT,
        isFreeGround,
        sessionsBalance: 1,
        ...(canCreate.freeReason === 'ACCESS_CODE' && canCreate.codeId
          ? { accessCodeId: canCreate.codeId, freeReason: 'ACCESS_CODE' }
          : canCreate.freeReason === 'FREE_TIER'
            ? { freeReason: 'FREE_TIER' }
            : {}),
      };

      const ground = await tx.ground.create({ data: groundData as any });

      // Record access-code redemption atomically.
      if (canCreate.freeReason === 'ACCESS_CODE' && canCreate.codeId) {
        await tx.contributorCodeRedemption.create({
          data: {
            codeId: canCreate.codeId,
            groundId: ground.id,
            redeemedByUserId: initiatorId,
            freeReason: 'ACCESS_CODE',
          },
        });
        // Increment sessionsUsed on the code.
        await tx.contributorCode.update({
          where: { id: canCreate.codeId },
          data: { sessionsUsed: { increment: 1 } },
        });
      }

      /**
       * "I AM SETTING IT UP FOR OTHERS" IS HONOURED HERE, WHICH IS THE ONLY PLACE IT CAN BE.
       *
       * The creation wizard has always offered this choice and the client has always sent it, as
       * `confirmLead({ managingOnly })` right after create. But `confirmLead` refuses unless the
       * ground is `AWAITING_LEAD`, and an ADMIN creating their own ground leaves it `OPEN` - so the
       * call threw "This ground has already been confirmed" every time, into a silent catch on the
       * client. In an 18-ground run the setting was ignored fourteen times out of fourteen.
       *
       * The cost was not cosmetic. An admin who said "this is not my ground" was made a full party
       * with her own check-in every session, and because `isSessionReadyForReport` waits on every
       * non-managingOnly party, the ground could then never produce a report until she personally
       * checked in - on a ground she was only administering, with no email ever sent to tell her.
       *
       * So the flag is applied at creation, and the initiator's session-1 check-in is simply not
       * created when it is set. `confirmLead` keeps its own path for the admin-sets-up-for-a-lead
       * flow, where AWAITING_LEAD genuinely applies.
       */
      const managingOnly = dto.managingOnly === true;

      // The initiator is the first party.
      const participant = await tx.groundParticipant.create({
        data: {
          groundId: ground.id,
          userId: initiatorId,
          email: initiator.email,
          partyType: PartyType.INITIATOR,
          managingOnly,
        },
      });

      // Session 1 is created up front and is free. If a start date is set, the
      // first check-in opens then (availableFrom); otherwise immediately.
      //
      // Not created at all for a managing-only lead: they give no account, so a check-in of theirs
      // would sit NOT_STARTED forever and hold the report open behind a person who was never
      // supposed to answer.
      /**
       * A MANAGING-ONLY LEAD STILL HAS TO SAY WHAT THEY EXPECT. GW-EXP-6.
       *
       * They give no account, so they got no check-in - and therefore nothing ever asked them what
       * this is aiming at or what they expect of each person. Every expectation feature was dead on
       * exactly the grounds most likely to need it: the ones somebody set up to run rather than to
       * take part in.
       *
       * So the check-in is created either way. What differs is what it IS: a setup conversation, not
       * a session, which is why it carries `isSetup` and is excluded from every session counter.
       * Setting up is not testifying, and requiring the first is not requiring the second.
       */
      await tx.checkIn.create({
        data: {
          groundId: ground.id,
          participantId: participant.id,
          sessionNumber: 1,
          status: CheckInStatus.NOT_STARTED,
          /* Everyone does a first check-in, managing-only or not. What managingOnly changes is that no later
             session is created for them (see createNextIfAbsent). */
          isSetup: false,
          availableFrom: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, dto.workingDays),
        },
      });

      return ground;
    });

    // GW-19: no-verdict expectation contract - set at creation so the initiator
    // sees this before they invite anyone or pay. "Evidence both of you can stand
    // on" is the feature; the product is symmetry, not a verdict for one side.
    const contract = {
      noVerdict: true,
      message: 'Groundwork does not produce a verdict. Both parties read the same report at the same moment. The product is evidence both of you can stand on - not a ruling for one side.',
    };

    /**
     * GW-69 CONTRAINDICATION SCREENING WAS REMOVED HERE, DELIBERATELY. Her decision:
     * "remove the entire thing, lets see how clients respond when we tell them verbally and then we
     * can revisit this."
     *
     * WHAT WAS HERE. Three yes/no questions on DRIFT, RECOGNITION and CRISIS_ALIGNMENT - active legal
     * proceedings, fear of retaliation, decision already made - each returning a paragraph advising
     * the initiator to use something other than Groundwork.
     *
     * WHY IT WENT RATHER THAN GAINING PIP. It never ran. The block was gated on
     * `dto.contraindicationAnswers` and no client ever sent it, and nothing ever read the
     * `contraindicationWarning` that came back. So it was a safety net in appearance only for its
     * whole life, and adding PIP to a list that never fired would have added nothing.
     *
     * Deleting it does not remove a protection - there was none - it removes the belief that there
     * was one, which is the more dangerous of the two. Screening happens in the conversation with the
     * client until we decide what the product should do about it.
     *
     * THE RISK WE ARE NOW CARRYING KNOWINGLY, so it is written down rather than rediscovered: a
     * Groundwork record can be pulled into formal proceedings, and nothing in the product says so.
     * That is the piece to bring back first if this is revisited.
     */

    // Best-effort - event log failure must never block ground creation.
    this.usage.emit(UsageEventType.GROUND_CREATED, { organizationId, groundId: ground.id, userId: initiatorId }).catch(() => undefined);

    return { ...ground, contract };
  }

  /**
   * Admin-initiated ground: the admin sets it up and names a Lead to run it.
   * The Lead becomes ground.initiatorId immediately (the FK requires an
   * existing user), but the ground stays AWAITING_LEAD - none of the normal
   * initiator actions (own check-in, adding more participants, releasing the
   * report) are meaningful until confirmLead() flips it to a real status.
   * Any pre-added participants are created now, alongside the lead, since the
   * admin is not ground.initiatorId and the normal addParticipant() path would
   * reject them.
   */
  async createForLead(organizationId: string, adminUserId: string, dto: CreateGroundForLeadDto) {
    const canCreate = await this.billing.canCreateGround(organizationId);
    if (!canCreate.allowed) {
      throw new BadRequestException(canCreate.reason ?? 'You cannot open a check-in here.');
    }

    const leadEmail = dto.leadEmail.toLowerCase();

    const pendingInvites: { email: string; token: string; participantId: string }[] = [];
    /**
     * THE LEAD'S USER ROW IS CREATED INSIDE THE TRANSACTION, WITH EVERYTHING ELSE.
     *
     * It used to be created just above this line, outside it. When anything
     * further down failed, the ground rolled back and the person did not: a real
     * account, in the organisation, verified, with no password and no ground - a
     * half-person left behind by an operation that reported failure.
     *
     * That is bad on its own and it also poisons the retry, because the next
     * attempt finds an existing row and treats them as an established user.
     * Either the whole ground exists or none of it does.
     */
    let leadUser!: { id: string; isNewUser: boolean; canSignIn: boolean };
    const ground = await this.prisma.$transaction(async (tx) => {
      leadUser = await this.findOrCreateUserForEmail(organizationId, leadEmail, dto.leadName, tx);
      const isFreeGround = canCreate.freeReason !== undefined;
      const ground = await tx.ground.create({
        data: {
          organizationId,
          initiatorId: leadUser.id,
          createdByUserId: adminUserId,
          label: dto.label,
          scenario: dto.scenario,
        // Immutable after this point. Omitting it takes the family default so a
        // sensing-family ground is never accidentally created shared.
        mode: dto.mode ?? defaultModeFor(dto.scenario),
          moment: dto.moment,
          timelineDays: dto.timelineDays ?? DEFAULT_TIMELINE_DAYS[dto.scenario],
          /** Whether this was chosen or guessed for them, so the setup chat can offer to fix it. */
          timelineStated: dto.timelineDays != null,
          cadenceStated: dto.cadence != null,
          cadence: dto.cadence ?? RECOMMENDED_CADENCE[dto.scenario],
          cadenceAnchorDay: dto.cadenceAnchorDay ?? null,
          workingDays: workingDaysOf(dto.workingDays),
          startsAt: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, dto.workingDays),
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          /* OPEN FROM THE START. There is no lead page any more (10 Sep 2026): nobody sets a check-in
             up for somebody else to confirm. A ground made through the API with people on it waits
             for them; one with nobody yet is simply open, and the lead's first check-in exists now. */
          status: (dto.participants ?? []).length ? GroundStatus.AWAITING_PARTIES : GroundStatus.OPEN,
          brief: dto.brief ?? null,
          joinToken: crypto.randomBytes(24).toString('hex'),
          freeParticipantCap: DEFAULT_FREE_MEMBER_LIMIT,
          isFreeGround,
          sessionsBalance: 1,
          ...(canCreate.freeReason === 'FREE_TIER' ? { freeReason: 'FREE_TIER' } : {}),
        } as any,
      });

      // The lead's own participant row and their first check-in, gated by the start date exactly
      // as create() gates the initiator's. Their part is asked inside the check-in if it was not sent.
      const leadRow = await tx.groundParticipant.create({
        data: {
          groundId: ground.id, userId: leadUser.id, email: leadEmail, partyType: PartyType.INITIATOR,
          roleAsDescribed: dto.leadRemit?.trim() || null,
        },
      });
      await tx.checkIn.create({
        data: { groundId: ground.id, participantId: leadRow.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED, availableFrom: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, dto.workingDays) },
      });

      // Pre-added participants (e.g. the whole cohort), created alongside the
      // lead since the admin isn't ground.initiatorId and addParticipant()
      // would otherwise reject this call.
      for (const p of dto.participants ?? []) {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const participant = await tx.groundParticipant.create({
          data: {
            groundId: ground.id,
            email: p.email.toLowerCase(),
            partyType: PartyType.PARTICIPANT,
            roleAsDescribed: p.roleAsDescribed,
            invitedAt: new Date(),
            inviteToken,
            inviteTokenExpiresAt: inviteExpiryFrom(),
          },
        });
        pendingInvites.push({ email: p.email.toLowerCase(), token: inviteToken, participantId: participant.id });
        // SEQUENTIAL: lock session 1 until the lead completes their own -
        // the lead has no completed session yet at ground-creation time, so
        // this is unconditional here (unlike addParticipant(), which checks).
        await tx.checkIn.create({
          data: {
            groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED,
            availableFrom: (dto.cadence ?? RECOMMENDED_CADENCE[dto.scenario]) === Cadence.SEQUENTIAL
              ? new Date('9999-12-31T00:00:00.000Z') // locked until the lead completes theirs - stricter than any startsAt
              : (dto.startsAt ? new Date(dto.startsAt) : null),
          },
        });
      }

      return ground;
    });

    // Send participant invite emails - never silently, matching addParticipant().
    // Best-effort: the ground/participant rows are already committed; a failed
    // email is logged, not rolled back, since some invites may have succeeded.
    for (const invite of pendingInvites) {
      await this.email.sendParticipantInvite(invite.email, dto.leadName ?? 'Your lead', dto.label, invite.token, undefined, { kind: 'PARTICIPANT_INVITE', participantId: invite.participantId, groundId: ground.id }).catch((err: any) =>
        this.logger.error(`Participant invite email failed for ${invite.email} on ground ${ground.id}: ${err.message}`),
      );
    }

    /**
     * Notify the lead, with a link they can actually use.
     *
     * THE TEST IS "CAN THIS PERSON SIGN IN", NOT "WAS THIS ROW CREATED JUST NOW",
     * and getting that wrong strands the lead completely.
     *
     * It sent a bare /grounds/:id link to anybody whose user row already existed.
     * That page is behind auth, so a lead with no password lands on the sign-in
     * form and is asked for a password they have never had. The invitation is the
     * only thing that was supposed to get them in, and it hands them a locked
     * door. Nothing on that screen leads anywhere useful: "Forgot your password?"
     * is wrong because they never had one, and the only escape - "New here? Get a
     * sign-in link instead" - is the one line they have no reason to read, being
     * neither new nor stuck in their own mind.
     *
     * A user row can exist without any way in for several ordinary reasons: they
     * were added to a ground and never accepted, they were invited to the org, or
     * a previous attempt at this very call left them behind. So the question to
     * ask is whether they have a password or a Google identity, and the answer
     * decides the link.
     *
     * Found on ground 2 of the eighteen: Kennedy was named lead, the first
     * attempt failed on an unrelated error, the second treated him as an existing
     * user, and he could not accept a ground that had been created for him.
     */
    const url = leadUser.canSignIn
      ? `${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${ground.id}`
      : await this.buildPasswordSetupUrl(leadUser.id, `/grounds/${ground.id}`);
    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId }, select: { firstName: true } });
    await this.email.sendLeadInvite(leadEmail, admin?.firstName ?? 'An admin', dto.label, url).catch((err: any) =>
      this.logger.error(`Lead invite email failed for ground ${ground.id}: ${err.message}`),
    );

    this.usage.emit(UsageEventType.GROUND_CREATED, { organizationId, groundId: ground.id, userId: leadUser.id }).catch(() => undefined);

    return ground;
  }

  /** The lead reviews the admin's setup, optionally edits it, and confirms -
   * only then does their own session 1 open and the ground become real. */
  /**
   * The named lead confirms and begins. They choose whether they are ALSO
   * checking in (the common case - they get a session-1 check-in like any
   * other party) or MANAGING ONLY (they oversee the ground - see submission
   * status and the released report - but never give their own account).
   *
   * managingOnly: false (default) -> unchanged behaviour, a session-1 check-in
   * is created and checkInId is returned so the client lands the lead in the
   * real engine, same as before this flag existed.
   *
   * managingOnly: true -> the lead's participant row is marked managingOnly
   * and NO check-in is created for them. checkInId is null in the response;
   * the client must not try to open a check-in for a managing-only lead.
   * Critically, isSessionReadyForReport excludes managingOnly participants
   * from its readiness count, so the ground does not wait forever on an
   * account that will never come - see that method's comment for why.
   */
  async confirmLead(groundId: string, requestingUserId: string, edits?: { brief?: string; managingOnly?: boolean; remit?: string }) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the named lead can confirm this check-in');
    if (ground.status !== GroundStatus.AWAITING_LEAD) throw new BadRequestException('This check-in has already been confirmed');

    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId, partyType: PartyType.INITIATOR },
    });
    if (!participant) throw new NotFoundException('Lead participant record not found');

    const managingOnly = edits?.managingOnly === true;

    // The lead's last chance to say what they own. A managing-only lead gives no
    // account so needs none; anyone else without a remit is unreadable by the
    // board - which in a live run meant the person who set the ground up was the
    // only one showing "role not clearly defined".
    if (!managingOnly && edits?.remit?.trim() && !participant.roleAsDescribed?.trim()) {
      await this.prisma.groundParticipant.update({
        where: { id: participant.id },
        data: { roleAsDescribed: edits.remit.trim() },
      });
    }
    const hasOtherParticipants = (await this.prisma.groundParticipant.count({ where: { groundId, partyType: PartyType.PARTICIPANT } })) > 0;

    const groundUpdate = this.prisma.ground.update({
      where: { id: groundId },
      data: {
        status: hasOtherParticipants ? GroundStatus.AWAITING_PARTIES : GroundStatus.OPEN,
        ...(edits?.brief !== undefined ? { brief: edits.brief } : {}),
      },
    });

    if (managingOnly) {
      /**
       * A SETUP CONVERSATION, NOT AN ACCOUNT. GW-EXP-6.
       *
       * `checkInId: null` used to be the answer here, and it is what made the expectation interview
       * unreachable for a lead who runs a check-in without taking part in it. Nothing ever asked them
       * what this is aiming at or what they expect of each person, so every expectation feature was
       * dead on precisely the grounds most likely to need one.
       *
       * They get the same engine and the same questions, on a row marked `isSetup` so it is excluded
       * from every session count. Setting up is not testifying, and requiring the first is not
       * requiring the second.
       *
       * The report is unaffected: `isSessionReadyForReport` filters at the PARTICIPANT level on
       * `managingOnly: false`, so it never sees this row.
       */
      const [, , setup] = await this.prisma.$transaction([
        groundUpdate,
        this.prisma.groundParticipant.update({ where: { id: participant.id }, data: { managingOnly: true } }),
        this.prisma.checkIn.create({
          data: {
            groundId,
            participantId: participant.id,
            sessionNumber: 1,
            status: CheckInStatus.NOT_STARTED,
            isSetup: false,
          },
        }),
      ]);
      return { groundId, checkInId: setup.id };
    }

    const [, checkIn] = await this.prisma.$transaction([
      groundUpdate,
      this.prisma.checkIn.create({
        // The admin's chosen start date (Ground.startsAt, set at
        // createForLead time) gates the lead's own first check-in exactly
        // like the self-serve create() path gates the initiator's - it was
        // previously collected on the client and silently dropped for this
        // path (CreateGroundForLeadDto had no startsAt/endsAt fields at all).
        data: { groundId, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED, availableFrom: ground.startsAt ?? null },
      }),
    ]);

    return { groundId, checkInId: checkIn.id };
  }

  /** Find an existing User for this email, or lazily create one - mirrors the
   * same pattern used when a participant accepts their invite (accept() in
   * ParticipantsService). Needed here because Ground.initiatorId is a required
   * FK to an existing User; it cannot point at an unaccepted invite. */
  /**
   * OFF WHEN WE CANNOT TELL, which is part of what "off by default" has to mean.
   *
   * Reading the flag directly threw where config was unavailable, and a feature
   * flag that can throw is worse than one that is wrong: the ground page would
   * return a 500 rather than quietly showing the old product, which is the exact
   * opposite of what a kill switch is for.
   *
   * Surfaced by unit tests whose config mock has no get(), and it would have been
   * a real outage the first time ConfigService was unavailable for any reason.
   */
  private contextEnabled(): boolean {
    try {
      return this.config?.get<boolean>('app.contextEnabled') === true;
    } catch {
      return false;
    }
  }

  private async findOrCreateUserForEmail(
    organizationId: string,
    email: string,
    name?: string,
    /** The enclosing transaction, when there is one, so a rollback takes the
        user with it rather than leaving a stranger in the organisation. */
    client?: Prisma.TransactionClient,
  ): Promise<{ id: string; isNewUser: boolean; canSignIn: boolean }> {
    const db = client ?? this.prisma;
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      /**
       * SOMEBODY FROM ANOTHER COMPANY, MADE THE LEAD OF A CHECK-IN HERE.
       *
       * This reused their account and wrote no membership, so the organisation they had just been
       * made lead of did not appear in their switcher and every organisation-scoped read returned
       * nothing — because their token still carries their home organisation. They were told they
       * were leading something they could not open.
       *
       * The participant path has done this correctly for a while; this one and the join flow were
       * the two that had not. GUEST, never their home role: being an admin of your own company says
       * nothing about what you should be able to do in somebody else's.
       */
      if (isASecondOrganisation(existing.organizationId, organizationId)) {
        await db.organizationMembership.upsert({
          where: { userId_organizationId: { userId: existing.id, organizationId } },
          create: { userId: existing.id, organizationId, role: GUEST_ROLE },
          /* Nothing on a second one: a role somebody was given here is theirs to keep. */
          update: {},
        });
      }

      return {
        id: existing.id,
        isNewUser: false,
        canSignIn: canSignIn(existing),
      };
    }

    /* `anna+chidi@gmail.com` was becoming "Anna+chidi" on the roster and in every sentence the
       check-in wrote about them. Sign-up already got this right; this door did not. */
    const firstName = name ?? aNameOutOfAnAddress(email);
    const created = await db.user.create({
      data: { organizationId, email, firstName, lastName: '', role: 'MEMBER', isEmailVerified: true, passwordHash: null },
    });
    return { id: created.id, isNewUser: true, canSignIn: false };
  }

  /**
   * WHERE THE PASSWORD PAGE SENDS THEM AFTERWARDS.
   *
   * The email says "review the ground I set up for you". Setting the password
   * then dropped them on `/grounds?welcome=1`, the whole list, because that is
   * `SetPasswordPage`'s default and nobody had ever passed it anything else. The
   * lead arrives having been told about one ground and has to go and find it.
   * `next` was already read by that page; it just had no sender.
   */
  private async buildPasswordSetupUrl(userId: string, next?: string): Promise<string> {
    const setupToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { userId, token: hashed(setupToken), type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
    });
    const base = `${this.config.get<string>('resend.frontendUrl') ?? ''}/set-password?token=${setupToken}`;
    return next ? `${base}&next=${encodeURIComponent(next)}` : base;
  }

  /** Public: resolve a ground-level join token → name + scenario for the join page. */
  async getJoinPreview(joinToken: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { joinToken },
      include: { initiator: { select: { firstName: true } } },
    });
    if (!ground) throw new NotFoundException('Join link not found');
    /**
     * A JOIN LINK INTO A FINISHED CHECK-IN IS A DOOR INTO AN EMPTY ROOM. The token has no expiry of
     * its own, so it outlived the check-in: a link shared in week one still signed people up in
     * month four, onto a ground that was CLOSED, and gave them a session on it. The reason it
     * refuses is the real one - ended, or held - not an expiry the link never had.
     */
    const refused = whyItRefuses(ground.status, ground.endState);
    if (refused) throw new BadRequestException(refused);
    return {
      groundId: ground.id,
      groundLabel: ground.label,
      scenario: ground.scenario,
      initiatorName: ground.initiator.firstName,
    };
  }

  /** Org-wide roster: every ground (team) in the org, its lead, members and
   * their roles, and enough of the report to derive an alignment label
   * client-side (reusing ReportPage's deriveStatus rather than duplicating
   * that logic in two languages). Admin/HR/Founder/Manager oversight view -
   * not scoped to "my grounds," unlike list(). */
  async getOrgRoster(organizationId: string) {
    const grounds = await this.prisma.ground.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, label: true, scenario: true, status: true, cadence: true, cadenceStated: true, timelineStated: true,
        createdByUserId: true, createdAt: true,
        initiator: { select: { id: true, firstName: true, lastName: true, email: true } },
        participants: {
          select: {
            id: true, email: true, partyType: true, roleAsDescribed: true, userId: true, managingOnly: true,
            inviteDeliveryStatus: true,
            // No take limit here: completing a session always spawns the next
            // session's row, so "most recent row" is never the same as "most
            // recently completed" - we need the whole history to tell them apart.
            checkIns: { select: { sessionNumber: true, status: true, completedAt: true, specificityLevel: true }, orderBy: { sessionNumber: 'asc' } },
          },
        },
        report: { select: { agreements: true, divergences: true, releasedAt: true } },
      },
    });

    return grounds.map((g) => {
      const contributedParties = g.participants.filter((p) => p.checkIns.some((c) => c.status === CheckInStatus.COMPLETED)).length;
      const lastActivity = g.participants
        .flatMap((p) => p.checkIns.map((c) => c.completedAt))
        .filter((d): d is Date => !!d)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      return {
        id: g.id,
        label: g.label,
        scenario: g.scenario,
        status: g.status,
        cadence: g.cadence,
      cadenceStated: g.cadenceStated,
      timelineStated: g.timelineStated,
        createdByAdmin: g.createdByUserId != null,
        lead: { id: g.initiator.id, firstName: g.initiator.firstName, lastName: g.initiator.lastName, email: g.initiator.email },
        /**
         * THE COUNT AND THE LIST HAVE TO BE THE SAME LIST. W8-24.
         *
         * This counted only PARTICIPANT rows while `members` below maps every
         * participant including the initiator, so the roster said "0 members"
         * directly above a row naming the person leading it. Two counts of one
         * list, in one object, disagreeing on screen.
         */
        memberCount: g.participants.length,
        members: g.participants.map((p) => {
          // Specificity from the most recently COMPLETED session, not the most
          // recent row (which is often the freshly-spawned NOT_STARTED next one).
          const completed = p.checkIns.filter((c) => c.status === CheckInStatus.COMPLETED).sort((a, b) => b.sessionNumber - a.sessionNumber);
          return {
            email: p.email,
            // Display name only, so the client never has to make one out of the address.
            firstName: (p as any).user?.firstName ?? null,
            partyType: p.partyType,
            roleAsDescribed: p.roleAsDescribed,
            accepted: p.userId != null,
            latestSpecificity: completed[0]?.specificityLevel ?? null,
          };
        }),
        contributedParties,
        report: g.report
          ? { agreements: g.report.agreements, divergences: g.report.divergences, releasedAt: g.report.releasedAt }
          : null,
        lastActivity,
      };
    });
  }

  async list(organizationId: string, userId?: string, userEmail?: string, userRole?: string) {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    /* Who sees which check-ins is the one rule's business (who-may-read-this-check-in.ts); this is
       that rule as a query. Admins see the organisation's; everybody else what they run, set up or
       take part in; a LEAD also what the leads of their department run. */
    const viewer = { role: userRole, organizationId };
    const leadsOfMine = userId && userRole === 'LEAD' ? await this.leadsOfTheDepartment(userId, organizationId) : [];
    const orgGroundWhere = groundsAViewerMayList(userId, viewer, organizationId, leadsOfMine) as any;

    const orgGrounds = await this.prisma.ground.findMany({
      where: orgGroundWhere,
      include: {
        /**
         * THE NAME, SO NOTHING HAS TO INVENT ONE FROM THE ADDRESS. W8-66.
         *
         * Three separate places were rendering a person by splitting their email at the
         * @ - "Led by hafsah" on the list, "hafsah runs this ground" in the admin banner,
         * and the check-in rows. That is the W10-2 mistake: an address is not what
         * somebody is called, and for a viewer who is not the lead the email is nulled
         * anyway, so the guess produced a blank.
         *
         * Same nested select as `SAFE_PARTICIPANT_SELECT`: display name only, no other
         * user field comes through.
         */
        participants: { select: { id: true, email: true, partyType: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
        checkIns: {
          /** `isSetup` so a setup conversation can be kept out of every session count. GW-EXP-6. */
          /**
           * `availableFrom` BECAUSE THE RAIL CANNOT DO ITS JOB WITHOUT IT.
           *
           * `railAttention` decides what a check-in wants from you, and its rule is explicit: a round
           * scheduled for next fortnight is not something anybody is late for. It reads `availableFrom`
           * to know that, and this select left it out - so on every surface fed by the list, a round
           * opening in two weeks read as "your turn", on all of them at once.
           *
           * The detail endpoint has always returned it. That is why one check-in could say "your turn"
           * in the rail and say nothing at all on its own page - two surfaces, one rule, different data.
           */
          select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, createdAt: true, isSetup: true, availableFrom: true },
        },
        // A released report that nobody is told about is a report nobody reads.
        // Ten grounds released theirs and not one person ever activated.
        report: { select: { releasedAt: true, agreements: true, divergences: true } },
        /*
         * THE LATEST ROUND'S FINDING, for the card. One row per ground, newest first: the list is
         * read often and a whole history here would be paid for on every load for a single line.
         */
        reportRounds: { select: { sessionNumber: true, finding: true, sharedPicture: true }, orderBy: { sessionNumber: 'desc' }, take: 1 },
        /* For the at-a-glance read. Counted the way the board counts it - see the module. */
        dependencies: { select: { what: true, status: true, createdAt: true, fromParticipantId: true, onParticipantId: true, onLabel: true } },
        reportActivations: { select: { participantId: true, status: true } },
      },
    });

    // Also include grounds from other orgs where this user is a participant.
    let participantGrounds: typeof orgGrounds = [];
    if (userId) {
      // Heal any unlinked participant records whose email matches this user.
      // This covers users who accepted an invite via setPassword before the
      // participant-link fix was deployed (groundParticipant.userId was null).
      if (userEmail) {
        await this.prisma.groundParticipant.updateMany({
          where: { email: userEmail.toLowerCase(), userId: null },
          data: { userId },
        });
      }

      const links = await this.prisma.groundParticipant.findMany({
        where: { userId, ground: { organizationId: { not: organizationId } } },
        select: { groundId: true },
      });
      if (links.length) {
        participantGrounds = await this.prisma.ground.findMany({
          where: { id: { in: links.map(l => l.groundId) } },
          include: {
            /**
             * WHOSE ORGANISATION THIS GROUND IS, because it is not the one you are in.
             *
             * These are grounds in OTHER organisations where the caller is a
             * participant - deliberate, and how somebody invited across a boundary
             * finds their check-in at all. It predates the organisation switcher and
             * was unambiguous when there was only ever one organisation to be in.
             *
             * With a switcher it is not: somebody who switches to a client's
             * organisation still sees their own company's ground in the list, and
             * nothing says why. So the name comes along and the card can say it.
             */
            organization: { select: { name: true } },
            /**
         * THE NAME, SO NOTHING HAS TO INVENT ONE FROM THE ADDRESS. W8-66.
         *
         * Three separate places were rendering a person by splitting their email at the
         * @ - "Led by hafsah" on the list, "hafsah runs this ground" in the admin banner,
         * and the check-in rows. That is the W10-2 mistake: an address is not what
         * somebody is called, and for a viewer who is not the lead the email is nulled
         * anyway, so the guess produced a blank.
         *
         * Same nested select as `SAFE_PARTICIPANT_SELECT`: display name only, no other
         * user field comes through.
         */
        participants: { select: { id: true, email: true, partyType: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
            checkIns: {
              /** Must match the sibling query above: both feed the same list. GW-EXP-6. */
              select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, createdAt: true, isSetup: true, availableFrom: true },
            },
            report: { select: { releasedAt: true, agreements: true, divergences: true } },
            /* Must match the sibling query above: both feed the same list, and a card fed by this
               one would fall back to the brief for ever while its twin showed the finding. */
            reportRounds: { select: { sessionNumber: true, finding: true, sharedPicture: true }, orderBy: { sessionNumber: 'desc' }, take: 1 },
            /* Same as the sibling query: both feed the same card. */
            dependencies: { select: { what: true, status: true, createdAt: true, fromParticipantId: true, onParticipantId: true, onLabel: true } },
            reportActivations: { select: { participantId: true, status: true } },
          },
        });
      }
    }

    return [...orgGrounds, ...participantGrounds]
      .map(g => {
        // Only set when the ground belongs to a different organisation than the one
        // the caller is currently in - the card uses its presence as the signal.
        const otherOrgName = g.organizationId !== organizationId
          ? ((g as any).organization?.name ?? null)
          : null;
        const checkIns = g.checkIns;
        const completedCount = checkIns.filter(ci => ci.status === CheckInStatus.COMPLETED).length;
        const alignment = alignmentRead((g as any).report);
        /**
         * A SETUP CONVERSATION IS NOT A SESSION, so it is out of every count on this card. GW-EXP-6.
         *
         * Left in, an unfinished setup would make a check-in permanently overdue and would stop round
         * one ever completing - because `roundsDone` requires EVERY row for a session to be complete,
         * and the setup row shares session number 1 with everybody's first account.
         */
        const sessions = checkIns.filter(ci => !(ci as any).isSetup);
        const overdue = sessions.filter(ci => ci.status === CheckInStatus.NOT_STARTED && ci.createdAt < threeDaysAgo).length;
        const checkInsToday = sessions.filter(ci => ci.status === CheckInStatus.COMPLETED && ci.completedAt != null && ci.completedAt >= todayStart).length;
        const lastCompletion = checkIns
          .map(ci => ci.completedAt)
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0];
        const lastActivity = lastCompletion ?? g.updatedAt;

        // Is a report sitting here that THIS viewer has not opened yet? Only
        // meaningful for a party - an admin who is not in the ground has no
        // report of her own to activate.
        const mine = userId ? (g.participants ?? []).find((p: any) => p.userId === userId) : null;
        // Same rule the report endpoint applies, or the badge contradicts the
        // page: the INITIATOR is exempt - they released it and can always read
        // it - and everyone else needs an ACTIVATED row, not merely a row.
        const isInitiator = !!userId && g.initiatorId === userId;
        const activated =
          isInitiator ||
          (!!mine &&
            ((g as any).reportActivations ?? []).some(
              (a: any) => a.participantId === mine.id && a.status === 'ACTIVATED',
            ));
        const reportWaitingForMe = !!mine && !!(g as any).report?.releasedAt && !activated;

        const { reportActivations: _drop, ...rest } = g as any;
        /**
         * ROUNDS EVERYBODY HAS FINISHED, for the card a person chooses from. W13-6.
         *
         * "12 of 12 sessions done" is the clearest line on the ground page, and the list had
         * no version of it - so somebody deciding which ground to open saw a status pill and
         * nothing about progress.
         *
         * A round is done when EVERY party's check-in for it is COMPLETED, which is the rule
         * the ground page uses. Counting check-in rows instead reads as double on a two-party
         * ground, which is the bug this file already carries a note about ("24 of 12").
         */
        /*
         * HOW IT IS GOING, FROM THE ONE PLACE THAT WORKS IT OUT. The board's header asks the same
         * two questions under the same summary, and computing them twice is how two screens come to
         * disagree about one week. See how-a-check-in-is-going.ts - the arithmetic there is this
         * code, moved, not rewritten.
         */
        const going = howACheckInIsGoing({
          checkIns: checkIns as any,
          participants: (rest as any).participants ?? [],
          dependencies: ((rest as any).dependencies ?? []) as any,
          timelineDays: (rest as any).timelineDays ?? null,
          cadence: (rest as any).cadence ?? null,
          sharedPicture: ((rest as any).reportRounds?.[0]?.sharedPicture as string | null) ?? null,
        });
        const roundsDone = going.glance.progress.roundsDone;
        /*
         * WHAT THE LAST ROUND FOUND, which is what the card leads with. The brief is the fallback
         * and is still on the payload: a check-in nobody has finished a round on has no finding and
         * still has to say what it is for.
         */
        const latestFinding = ((rest as any).reportRounds?.[0]?.finding as string | null) ?? null;
        /*
         * HOW THINGS ARE GOING, IN TWO OR THREE PLAIN SENTENCES.
         *
         * "This should be 2 sentences or 3 on how things are going, in clear laymans terms - it
         * carries a simple summary of the session."
         *
         * It already exists: the shared picture is exactly that, written for the round and kept
         * with it. The card was showing the BRIEF - the sentence somebody set the check-in up with -
         * so every goal check-in read the same, and then one ranked line, which is a headline rather
         * than a summary.
         *
         * Cut to three sentences here rather than on the card, because a card cannot tell where a
         * sentence ends without a second copy of the rule - and a decimal or a closing quote is how
         * splitting on a full stop goes wrong. `sentencesIn` is the one that knows.
         */
        const latestSummary = going.latestSummary;
        /*
         * WHETHER THIS ONE HAS A BOARD AT ALL, said by the side that decides it.
         *
         * Eight of the twenty-two situations have none - the sensing family and the one-off - and
         * "no sections means no board" is worked out from a map that lives here. A switcher that
         * let somebody pick a board and then told them there was not one would be offering a door
         * into a wall, and the only way for the client to filter them itself is a second copy of
         * that map. There are enough of those.
         */
        const hasBoard = boardRendersFor((rest as any).scenario);
        /*
         * WHAT A MANAGER WANTS OFF THE CARD: how far through, and what is in the way. See
         * what-a-manager-needs-at-a-glance for why the blockers are counted there rather than here.
         */
        const glance = going.glance;
        return { ...rest, alignment, overdue, checkInsToday, roundsDone, lastActivity, reportWaitingForMe, otherOrgName, latestFinding, latestSummary, hasBoard, glance };
      })
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  async get(id: string, organizationId: string, requestingUserId?: string) {
    /**
     * WHO MAY READ ONE. `list()` in this same file gives a non-admin their own grounds only - the
     * ones they lead or take part in - and an admin everything in the organisation. This read gave
     * any member of the organisation any ground in it, with the report's shared picture, the
     * agreements and divergences, the objectives and the participants included. Same rule as the
     * list, asked here too; and the same answer as assertMaySeeGround gives every other read.
     */
    if (requestingUserId) await this.assertMaySeeGround(id, requestingUserId);
    // Primary lookup by org - works for org members and the initiator.
    const CHECKIN_SELECT = { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, availableFrom: true, isFinal: true, specificityLevel: true, specificityDimensions: true } as const;

    let ground = await this.prisma.ground.findFirst({
      where: { id, organizationId },
      include: {
        participants: { select: SAFE_PARTICIPANT_SELECT },
        checkIns: { select: CHECKIN_SELECT },
        /* For `guestIn`: whose workspace this check-in belongs to. And whether it has a WhatsApp
           number, which is what the "where people answer this" setting needs - riding along on a
           read that already has the organisation in hand, rather than a second query. */
        organization: { select: { name: true, whatsappConnection: { select: { enabled: true } } } },
        /**
         * WHAT THE WHOLE CHECK-IN IS AIMING AT. Written by the lead's own check-in alongside the
         * per-person expectations, and never read back until now - so the Context page had a band
         * for "what this check-in is for" and nothing to put in it.
         */
        objectives: { select: { id: true, name: true, target: true }, orderBy: { sortOrder: 'asc' } },
        /**
         * `agreements` and `divergences` are selected because `alignmentRead` COUNTS them. Without
         * them this endpoint could only ever report null, so the ground page said "No read yet"
         * about a released report while the grounds list - whose query does fetch them - printed
         * "4 agreed, 2 still open" for that same ground on the screen before it.
         *
         * Found by reading BOTH payloads for one ground rather than trusting either page, and the
         * first attempt at the fix went into the fallback lookup below instead of this one: the
         * endpoint kept returning null, which is the only reason the mistake surfaced.
         */
        report: { select: { id: true, releasedAt: true, sharedPicture: true, createdAt: true, agreements: true, divergences: true } },
        /*
         * WHICH ROUNDS HAVE CLOSED, as recorded, so the page stops working it out.
         *
         * GroundAdminPage counted the non-managing participants and the COMPLETED check-ins at the
         * open session number and compared them, on every render. That is the round-closing rule,
         * living on a screen - which meant the server did not know a round had closed, and any
         * second screen wanting the same answer would have had to implement it again.
         */
        roundCompletions: { select: { sessionNumber: true, completedAt: true }, orderBy: { sessionNumber: 'asc' } },
        resolution: true,
        patternDetections: {
          select: { id: true, code: true, periodsObserved: true, status: true, observationText: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // External participant (different org): fall back to participant membership check.
    if (!ground && requestingUserId) {
      const link = await this.prisma.groundParticipant.findFirst({ where: { groundId: id, userId: requestingUserId } });
      if (link) {
        ground = await this.prisma.ground.findUnique({
          where: { id },
          include: {
            participants: { select: SAFE_PARTICIPANT_SELECT },
            checkIns: { select: CHECKIN_SELECT },
            /* Same as the primary read: this is the cross-org path, and it is the one where the
               name is actually needed. The WhatsApp connection rides along for the same reason it
               does above - and it has to be here too, or a cross-org lead is the one person who
               cannot see the setting. */
            organization: { select: { name: true, whatsappConnection: { select: { enabled: true } } } },
            /**
             * THE SAME LIST AS THE PRIMARY READ ABOVE, and it has to stay that way: this is the
             * cross-org participant's path, and anything missing here is a field that exists for
             * everybody except the person who joined from another organisation. TypeScript catches a
             * mismatch because both assign to one variable - which is the only reason this second
             * copy is survivable.
             */
            objectives: { select: { id: true, name: true, target: true }, orderBy: { sortOrder: 'asc' } },
            /**
             * `agreements` and `divergences` are here because `alignmentRead` COUNTS them, and
             * without them in the select it could only ever return null - so the ground page said
             * "No read yet" about a released report while the grounds list, whose query does fetch
             * them, printed "4 agreed, 2 still open" for the same ground on the previous screen.
             *
             * Found by reading both payloads for one ground rather than either page on its own.
             */
            report: { select: { id: true, releasedAt: true, sharedPicture: true, createdAt: true, agreements: true, divergences: true } },
            /* Same include as the primary query above. TypeScript refused the two shapes when this
               was added to only one of them, which is the check the comment above wishes it had. */
            roundCompletions: { select: { sessionNumber: true, completedAt: true }, orderBy: { sessionNumber: 'asc' } },
            resolution: true,
            patternDetections: {
              select: { id: true, code: true, periodsObserved: true, status: true, observationText: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
      }
    }

    if (!ground) throw new NotFoundException('Check-in not found');

    // Computed display fields - derived here so the client never needs to repeat the logic.
    const alignment = alignmentRead((ground as any).report);

    /* From the start date when there is one - see when-the-clock-starts.ts. This read createdAt, so
       a check-in set up three weeks before the person arrives spent three weeks counting down. */
    const daysLeft = daysRemaining(ground as any, new Date());

    /*
     * BRIEF: the ground's own opening brief, or the released report's summary when there is none.
     *
     * THE SECOND PATH TO REPORT TEXT, AND IT APPLIED NONE OF THE REPORT'S RULES. Seen in the running
     * product: the report tab said "Both agree that..." and this said "Both parties agree that...",
     * the same sentence twice on one page, because everything the reports service does on the way
     * out - the party rewrite, the names - happens in its own read and this reads the column
     * directly.
     *
     * `notTheWordParty` is applied here for that reason. Names are deliberately NOT resolved: who
     * may see whose name is decided by the reports service with the viewer in hand, and this has no
     * viewer. A role label is the safe thing to show, and showing one is not a defect.
     */
    /*
     * AND NO FALLBACK TO THE SHARED PICTURE EITHER.
     *
     * Once a report released, an empty brief was filled with the report's `sharedPicture`. Same
     * fault as the entry commit's: the brief is labelled "the lead's own words about the
     * situation", and the shared picture is what the product made of everybody's accounts. It has
     * its own home on the report, where it is named correctly.
     *
     * An empty brief is now empty, and the Context page says what a brief is and that nobody has
     * written one - which somebody can act on.
     */
    const rawBrief = (ground as any).brief ?? null;
    const brief = typeof rawBrief === 'string' ? notTheWordParty(rawBrief) : rawBrief;

    /* The board's alignment feed. Codes on ALIGNMENT_FEED_ONLY_CODES are the engine talking to
       itself ("Session 2 will use a different approach") and never reach a person; only SURFACED
       detections do, the same rule as the report. */
    /* NOT A TEXT. The feed used to print the model's own observation sentence, which is how "the
       individual" reached a shared board. It prints the pattern library's fixed sentence for the code,
       the same words every time the same pattern appears, plus how many sessions it was seen across,
       which is the fact that makes it a pattern. The model's sentence stays on the row for admin. */
    const catalogue = new Map([...BAD_FAITH_CODES, ...POSITIVE_CODES, ...CARRYING_CODES].map((c) => [c.code, c]));
    const signals = (ground.patternDetections ?? [])
      .filter((pd) => !ALIGNMENT_FEED_ONLY_CODES.has(pd.code) && (pd as any).status !== 'CANDIDATE' && catalogue.has(pd.code))
      .map((pd) => ({
        id: pd.id,
        groundId: id,
        code: pd.code,
        sessionNum: pd.periodsObserved,
        periodsObserved: pd.periodsObserved,
        /*
         * THREE ANSWERS, BECAUSE THERE ARE THREE KINDS. A code saying somebody is carrying what
         * nobody else picked up is not a good sign and is not a pattern in them; badged as either
         * it says something untrue. See WHAT_A_CARRYING_CODE_IS_CALLED.
         */
        type: (isPositiveCode(pd.code)
          ? 'Good sign'
          : isCarryingCode(pd.code)
            ? WHAT_A_CARRYING_CODE_IS_CALLED
            : 'Pattern') as 'Good sign' | 'Pattern' | 'Carrying',
        text: catalogue.get(pd.code)!.signal,
        confidenceDelta: null,
        createdAt: pd.createdAt.toISOString(),
      }));

    // Extract context notes from groundAuditLog (stored under key contextNotes).
    const rawLog = (ground as any).groundAuditLog;
    const contextNotes: string[] =
      rawLog && !Array.isArray(rawLog) && typeof rawLog === 'object' ? (rawLog as any).contextNotes ?? [] : [];

    /**
     * THE OTHER HALF OF THE AUDIT LOG, WHICH NOTHING HAS EVER READ. W14-3.
     *
     * `updateTimeline` has been appending every change to how long this runs and how often people
     * check in, with a note that this makes them "traceable without a separate audit table". Only
     * `contextNotes` was ever read back out. So a lead could shorten a ground from eight weeks to
     * four, or switch the cadence, and no party had any way to see it happened - in the product
     * whose whole claim is that the record is the record.
     *
     * WHO changed it is deliberately not resolved to a name. Peer visibility can be off on this
     * ground, and a name here would walk straight around it. The lead or a party is the whole of
     * what anybody needs to know, and it is true either way.
     */
    /**
     * THE BASELINE, SO THE CONTEXT READ CAN STOP GUESSING.
     *
     * `GroundAdminPage` passed `hasBaseline: false` and `conditionCount: 0` as literals into
     * `whatThisGroundCanTellYou`, which made two of its lines fire on every ground whatever the truth
     * - "it will not be able to tell you whether the conditions you set were met, because none have
     * been named" was shown to leads who had named some. They were literals because nothing wrote the
     * table. Now something does.
     */
    const baselineRow = await this.prisma.groundBaseline.findFirst({
      where: { groundId: id },
      orderBy: { version: 'desc' },
      select: { version: true, successLooksLike: true, conditions: true, changeReason: true, effectiveFrom: true },
    });
    const baseline = baselineRow
      ? {
          ...baselineRow,
          conditions: Array.isArray(baselineRow.conditions) ? (baselineRow.conditions as string[]) : [],
        }
      : null;

    const rawTimeline: any[] =
      rawLog && !Array.isArray(rawLog) && typeof rawLog === 'object' ? (rawLog as any).timeline ?? [] : Array.isArray(rawLog) ? rawLog : [];
    const settingsChanges = rawTimeline
      .filter(e => e && e.changedAt)
      .map(e => ({
        changedAt: e.changedAt,
        by: e.changedBy === ground.initiatorId ? ('lead' as const) : ('party' as const),
        weeks: e.changes?.timelineWeeks ?? null,
        cadence: e.changes?.cadence ?? null,
      }));

    // Nest checkIns under each participant so the client can show per-party status.
    const checkInsByParticipant = new Map<string, typeof ground.checkIns>();
    for (const ci of ground.checkIns ?? []) {
      const list = checkInsByParticipant.get(ci.participantId) ?? [];
      list.push(ci);
      checkInsByParticipant.set(ci.participantId, list);
    }
    // Solo artifact content is never part of SAFE_PARTICIPANT_SELECT - fetch it
    // in a separate, explicit query, and only for participants who opted to
    // share it. This keeps the "safe" select actually safe on its own, rather
    // than relying on every caller remembering to strip it after the fact.
    const sharedIds = (ground.participants ?? []).filter((p: any) => p.soloArtifactShared).map((p: any) => p.id);
    const sharedArtifacts = sharedIds.length
      ? await this.prisma.groundParticipant.findMany({
          where: { id: { in: sharedIds } },
          select: { id: true, soloArtifact: true },
        })
      : [];
    const sharedArtifactById = new Map(sharedArtifacts.map((a) => [a.id, a.soloArtifact]));

    // Contact-hiding (participant-to-participant). When the initiator turns this on, a
    // participant sees no OTHER participant's email address - only their own. Names,
    // roles, roster and presence stay fully visible: presence is a deliberate nudge, and
    // only the reach-them-outside contact detail is hidden. Applies to ALL other
    // participants, same-org or cross-org alike. Enforced in the read path so no caller
    // can forget to strip it.
    //
    // The INITIATOR is exempt: they are the admin/inviter (they typed these emails in),
    // and their admin roster must keep working. The toggle hides peers from each other,
    // not the ground's owner from the people they invited.
    const hideContact = !!(ground as any).restrictExternalVisibility;
    const viewerIsInitiator = !!requestingUserId && ground.initiatorId === requestingUserId;
    /**
     * AND AN ADMIN OF THIS ORGANISATION RUNS IT TOO, WHICH THE PEER RULE DID NOT KNOW.
     *
     * The comment on `hidePeers` below has always said "The lead or an admin decides ... The lead
     * always sees everyone - running the ground is the job." The code only ever exempted the
     * INITIATOR. So on an evaluation-family ground - a new hire, a probation, a cohort, where peers
     * are hidden by default - an org admin was treated as a peer, and the filter keeps only rows
     * whose `userId` is the viewer's. An admin who is not a party to the check-in matches none of
     * them, so `participants` came back as an EMPTY ARRAY while `checkIns` came back in full.
     *
     * What that produced, walked as a second admin of a real organisation: a Report tab reading
     * "Session 1 - 0 of 0 answered" on a check-in with two people in it, an empty "who is in this",
     * and session rows belonging to nobody - directly under a banner telling her "You can see
     * everything here, which is the point of being an admin".
     *
     * `mayShareJoinLink` further down already worked this out for the join token, with the same
     * reasoning written out ("An admin of THIS organisation. Same role in a different org is a
     * stranger here"). It read the user row two hundred lines below where the peer rule needed it,
     * so the peer rule went without. One read, up here, and both use it.
     */
    const viewer = requestingUserId
      ? await this.prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true, organizationId: true } })
      : null;
    /* An admin of a DIFFERENT organisation is a stranger, and this is not the rule to hand them. */
    const viewerAdminsThisOrg = adminsThisOrg(viewer, ground as any);
    const viewerRunsThisGround = viewerIsInitiator || !!viewerAdminsThisOrg;

    /* Whether this organisation has a number of its own, for the "where people answer this" setting. */
    const orgHasWhatsApp = !!(ground as any).organization?.whatsappConnection?.enabled;

    // CAN THE PARTIES SEE EACH OTHER AT ALL?
    //
    // Separate from hiding email addresses. This is whether one party sees that
    // the others exist, what each is answerable for, and how far along each is.
    // On a team delivering together that roster is how people coordinate. On an
    // onboarding period that doubles as a probation it tells four people exactly
    // who they are being measured against, and turns a record meant to help them
    // into a leaderboard.
    //
    // The lead or an admin decides. Until they do, the default is by kind of
    // ground: hidden where the period decides something about a person, shown
    // where it does not. The lead always sees everyone - running the ground is
    // the job.
    const evaluative = [BoardFamily.EVALUATION, BoardFamily.COHORT].includes(familyFor(ground.scenario));
    const peersVisible = (ground as any).peersVisibleToEachOther ?? !evaluative;
    const hidePeers = !peersVisible && !viewerRunsThisGround;

    /**
     * WHAT EACH PERSON IS WORKING TOWARDS, WITH ITS AUTHORSHIP ATTACHED.
     *
     * `describeObjective` and `mayBeReadAgainst` come from the module that had no data: the state travels
     * with the text, always, because "your objective is X" and "your manager has suggested X and you
     * have not replied" are different statements and the difference is the whole point.
     */
    const objectiveRows = await this.prisma.personObjective.findMany({
      where: { groundId: id },
      select: {
        id: true, participantId: true, text: true, authoredBy: true, seenBySubject: true, updatedAt: true,
        /** Where a REFERENCE expectation is settled, and when anybody last looked at it. */
        trackedUrl: true, lastSeenState: true, lastSeenAt: true,
        /** GW-EXP-2. Whether the lead has told them, on the lead's own account. */
        awareness: true, awarenessDetail: true,
        /** GW-EXP-7: the objection travels with the expectation it is about. */
        objection: true, objectionAt: true,
        /** GW-EXP-3. Whether this and their own idea of doing well connect. */
        alignment: true, alignmentNote: true,
        /**
         * THE PRIMITIVE. What kind of thing this is, how anybody would know it happened, and by when.
         * The page renders by kind, and `check: NOT_CHECKABLE` is what it shows plainly rather than
         * dressing an unmeasurable sentence up as a target.
         */
        kind: true, check: true, dueKind: true, dueSaid: true, owedToParticipantId: true,
        /*
         * THE DATE THOSE WORDS MEANT, AND WHETHER THIS HAS ENDED.
         *
         * Both are new and both are what turn this panel from a list of sentences into a record
         * somebody returns to: "by end of October" cannot be read as late, and an expectation that
         * was met, dropped or changed should not sit here looking outstanding forever.
         */
        dueDate: true, status: true,
      },
    });
    /**
     * ALL OF THEM, PER PERSON. A person can be held to a commitment and a standing role expectation
     * at once, and the map used to keep whichever row happened to come back last - so the page showed
     * one thing and the rest were invisible even though they were stored.
     */
    const objectivesByParticipant = new Map<string, typeof objectiveRows>();
    for (const o of objectiveRows) {
      const list = objectivesByParticipant.get(o.participantId) ?? [];
      list.push(o);
      objectivesByParticipant.set(o.participantId, list);
    }
    /** The first is what the single-objective shape below still reads, so nothing downstream broke. */
    const objectiveByParticipant = new Map(
      [...objectivesByParticipant].map(([pid, list]) => [pid, list[0]]),
    );

    /*
     * AND THE SETTING THAT DECIDES WHOSE NUMBERS SOMEBODY READS, WHICH THIS PAGE WAS NOT READING.
     *
     * `whoSeesTargets` had two readers - the board and the conversation - and the note on the
     * column above lists exactly those two. Context was the third and nobody noticed, so the two
     * surfaces answered the same question differently on the same check-in.
     *
     * Read live on 15 September 2026. In the check-in itself Rita was shown the team's 500 and her
     * own 150, with the line "Other people on this check-in have numbers of their own, and those
     * are theirs". On the Context tab of the same check-in, one tap away, she was shown Kunle's
     * 150, Amir's 150 and the lead's 50. The panel's own heading for a participant is "What is
     * expected of YOU", and it was listing everybody.
     *
     * Narrowed at the read rather than in the page, because a second reader forgetting the rule is
     * how this happened in the first place. The lead still sees everybody - that is their job and
     * the heading says "Person by person" for them. Where the check-in is set so everybody sees
     * every number, nothing here changes.
     */
    const peersKeepTheirNumbers =
      !viewerIsInitiator && ((ground as any).whoSeesTargets ?? 'THEIR_OWN') !== 'EVERYBODY';

    const participantsWithCheckIns = (ground.participants ?? [])
      .filter((p: any) => !hidePeers || (!!requestingUserId && p.userId === requestingUserId))
      .map((p: any) => {
      const raw = sharedArtifactById.get(p.id);
      const isSelf = !!requestingUserId && p.userId === requestingUserId;
      /* Somebody else's expectations, on a check-in that keeps numbers to their owner. */
      const withholdTheirNumbers = peersKeepTheirNumbers && !isSelf;
      return {
        ...p,
        email: hideContact && !isSelf && !viewerIsInitiator ? null : p.email,
        soloArtifactShared: p.soloArtifactShared ?? false,
        // Only expose the content when the participant explicitly shared it
        sharedSoloReport: raw
          ? (() => { try { return JSON.parse(raw); } catch { return null; } })()
          : null,
        checkIns: checkInsByParticipant.get(p.id) ?? [],
        objective: (() => {
          /* The single-expectation shape travels the same way as `all` above: not somebody else's,
             on a check-in that keeps numbers to their owner. */
          const row = withholdTheirNumbers ? undefined : objectiveByParticipant.get(p.id);
          const shaped = {
            participantId: p.id,
            text: row?.text ?? null,
            authoredBy: (row?.authoredBy as 'lead' | 'self' | null) ?? null,
            seenBySubject: row?.seenBySubject ?? false,
          };
          return {
            ...shaped,
            /** 'none' | 'proposed' | 'accepted' | 'their own'. */
            state: objectiveState(shaped),
            /** The one string anything showing this should print, so the caveat cannot be dropped. */
            described: describeObjective(shaped),
            /** False on a proposal and on an absence, and nothing downstream may read against it. */
            mayBeReadAgainst: mayBeReadAgainst(shaped),
            /**
             * WHETHER THE LEAD SAYS THEY TOLD THEM, AND IT IS SHOWN TO THE PERSON IT IS ABOUT.
             *
             * Concealing "you were never told" from the person who was not told would defeat the whole
             * mechanism. It is the lead's own statement about their own conduct, made in their own
             * session, and the gap being visible is the point rather than a side effect.
             */
            awareness: (row as any)?.awareness ?? null,
            awarenessDetail: (row as any)?.awarenessDetail ?? null,
            /**
             * GW-EXP-3. Null means they have not said what doing well looks like to them yet, which the
             * surface reports as "not yet said". An absent view is never a matching one.
             */
            alignment: (row as any)?.alignment ?? null,
            alignmentNote: (row as any)?.alignmentNote ?? null,
            /**
             * THE PRIMITIVE, PASSED THROUGH. Selected from the row is not the same as reaching the
             * page: this payload names every field explicitly, so a new column is invisible until it
             * is listed here too. Added to the select and forgotten here, the page rendered the text
             * and none of its shape.
             *
             * `check: NOT_CHECKABLE` is the one that must travel. It is what the page says out loud
             * so an unmeasurable sentence is not mistaken for a target.
             */
            /**
             * EVERY EXPECTATION THIS PERSON IS HELD TO, in the order they were stated. `objective`
             * above stays as it was so nothing that reads it had to change on the day this landed;
             * the page reads this.
             */
            all: (withholdTheirNumbers ? [] : (objectivesByParticipant.get(p.id) ?? [])).map(o => ({
              // The id is what lets somebody file what they delivered AGAINST a specific
              // expectation rather than into a general box. Nothing else needs it.
              id: o.id,
              text: o.text,
              kind: (o as any).kind ?? null,
              // The state is never sent without the time it was true. Splitting them is how a
              // nine-day-old status gets rendered as current.
              trackedUrl: (o as any).trackedUrl ?? null,
              lastSeenState: (o as any).lastSeenState ?? null,
              lastSeenAt: (o as any).lastSeenAt ?? null,
              check: (o as any).check ?? null,
              dueKind: (o as any).dueKind ?? null,
              dueSaid: (o as any).dueSaid ?? null,
              owedToParticipantId: (o as any).owedToParticipantId ?? null,
              awareness: (o as any).awareness ?? null,
              awarenessDetail: (o as any).awarenessDetail ?? null,
              alignment: (o as any).alignment ?? null,
              alignmentNote: (o as any).alignmentNote ?? null,
              objection: (o as any).objection ?? null,
              seenBySubject: o.seenBySubject,
            })),
            kind: (row as any)?.kind ?? null,
            check: (row as any)?.check ?? null,
            dueKind: (row as any)?.dueKind ?? null,
            dueSaid: (row as any)?.dueSaid ?? null,
            owedToParticipantId: (row as any)?.owedToParticipantId ?? null,
            /**
             * GW-EXP-7. Shown to everyone who can see the expectation, which is the whole point: an
             * objection only its author can see is the state this was built to end.
             */
            objection: (row as any)?.objection ?? null,
            objectionAt: (row as any)?.objectionAt ?? null,
            updatedAt: row?.updatedAt ?? null,
          };
        })(),
      };
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: ground.organizationId },
      select: { subscriptionPlan: true, subscriptionStatus: true, freeExtensionUsed: true },
    });

    // Only worth computing before the report exists (or before the current
    // round's report has released) - once released there's nothing pending.
    let sessionProgress: Awaited<ReturnType<typeof this.getSessionProgress>> = null;
    if (!ground.report?.releasedAt) {
      sessionProgress = await this.getSessionProgress(id);
    }
    const requestingParticipant = requestingUserId
      ? (ground.participants ?? []).find((p: any) => p.userId === requestingUserId)
      : null;
    const requestingUserIsMissing = !!(
      sessionProgress && requestingParticipant && sessionProgress.missingParticipantIds.includes(requestingParticipant.id)
    );

    // Read-back of private lead-context notes: ONLY the initiator who wrote them
    // sees them. They are never returned to any other party (that is the private
    // boundary - a participant must never see a note the lead wrote about them).
    const isInitiatorViewer = !!requestingUserId && ground.initiatorId === requestingUserId;
    /**
     * THE AUDIENCE IS IN THE QUERY, NOT IN WHAT THE PAGE CHOOSES TO DRAW.
     *
     * The lead reads everything they wrote. Everybody else reads only the notes addressed to
     * everybody - so a private note about somebody cannot reach them even if a later view forgets to
     * filter, because it never leaves the database. That is the same rule the rest of this file
     * follows: a boundary that a render is responsible for is a boundary that eventually leaks.
     *
     * `audience` decides WHO READS IT and nothing else. A shared note is still the lead's words about
     * a situation, so it stays unquotable wherever it goes.
     */
    const leadContextNotes = isInitiatorViewer
      ? await this.prisma.leadContextNote.findMany({
          where: { groundId: id },
          select: { id: true, participantId: true, text: true, createdAt: true, audience: true },
          orderBy: { createdAt: 'asc' },
        })
      : await this.prisma.leadContextNote.findMany({
          where: { groundId: id, audience: ContextNoteAudience.EVERYONE },
          select: { id: true, participantId: true, text: true, createdAt: true, audience: true },
          orderBy: { createdAt: 'asc' },
        });

    const { patternDetections: _pd, ...rest } = ground as any;
    // THE BROADCAST JOIN TOKEN IS THE INITIATOR'S TO GIVE OUT, NOBODY ELSE'S.
    //
    // It was returned to every party on the ground, and the ground page renders
    // it with a Copy button, so any participant could hand out a link that lets
    // an unauthenticated stranger check in as a party. On a probation or
    // evaluation ground that is somebody's employment record, and the person who
    // shared it need not even have realised what the link did.
    //
    // Org admins keep it because they created the ground and may be the ones
    // distributing it; everyone else gets null.
    /* `viewerAdminsThisOrg` is the same test this used to run its own query for, read once above
       because the peer rule needs it too - see the note on `viewerRunsThisGround`. */
    const mayShareJoinLink = isInitiatorViewer || viewerAdminsThisOrg;
    return {
      ...rest,
      /*
       * THE REPORT RIDES ALONG IN `rest`, AND IT IS REPORT TEXT WHEREVER IT IS READ.
       *
       * The query selects report.sharedPicture, so the whole object is spread into this response
       * straight from the column. Seen on one page in the running product: the report tab said
       * "Both agree that..." and the check-in page said "Both parties agree that...", the same
       * sentence twice, because the reports service does its work in its own read and this does
       * not go through it.
       *
       * Cleaning the brief was not enough - I fixed that first and the sentence was still on the
       * screen, because it arrives by this field as well. Names stay unresolved here for the same
       * reason as the brief: entitlement to a name is decided with a viewer in hand.
       */
      report: (rest as any).report
        ? {
            ...(rest as any).report,
            sharedPicture:
              typeof (rest as any).report.sharedPicture === 'string'
                ? notTheWordParty((rest as any).report.sharedPicture)
                : (rest as any).report.sharedPicture,
          }
        : (rest as any).report,
      joinToken: mayShareJoinLink ? (rest as any).joinToken ?? null : null,
      participants: participantsWithCheckIns,
      /**
       * WHAT THE PEER RULE IS ACTUALLY DOING, not what is stored. W14-4.
       *
       * `peersVisibleToEachOther` is null until somebody sets it, and the effective answer comes
       * from the scenario's family - hidden on evaluation and cohort grounds, shown elsewhere.
       * The client needs the effective value to show the lead the rule and its default, and my
       * first attempt at that copied the family list into the client, which is a second copy of
       * a rule that will drift from this one.
       *
       * So the server says what it applied. `peersVisibleToEachOther` still travels as-is, so the
       * control can tell "not set, using the default" from "set to this deliberately".
       */
      peersVisibleEffective: peersVisible,
      peersDefaultVisible: !evaluative,
      /*
       * AND THE TWO THAT HAD NO WAY IN. Both were read by the board and the conversation and
       * travelled to nobody, so a control for either would have read its own default forever and
       * silently shown "off" whatever was stored. Named rather than spread, like everything else
       * on this payload.
       */
      whoSeesTargets: (ground as any).whoSeesTargets ?? 'THEIR_OWN',
      expectThemToUnblock: (ground as any).expectThemToUnblock !== false,
      /*
       * WHO THE VIEWER IS TO THIS CHECK-IN, said by the side that enforces it. The client rebuilt
       * these two from initiatorId and role in three places and disagreed with the server on the
       * edges - an org admin offered a control only the initiator may use (fix plan A12). Two plain
       * booleans, in the spirit of the note above: not a capability list, the two facts the routes
       * actually test.
       */
      viewerIsInitiator,
      viewerRunsThisGround,
      /*
       * WHETHER THERE IS A WHATSAPP NUMBER TO ANSWER ON AT ALL.
       *
       * The setting on this ground is only answerable where the organisation has connected one, and
       * the setup page cannot know that on its own - the connection is an ADMIN read, and the lead
       * setting this up is often not an org admin. So the fact travels with the ground, and the
       * control appears only where it means something. A toggle over nothing is a door into a wall,
       * which is the pattern this codebase has caught three times.
       */
      orgHasWhatsApp,
      alignment,
      daysLeft,
      brief,
      signals,
      contextNotes,
      settingsChanges,
      baseline,
      leadContextNotes,
      org: org ?? null,
      sessionProgress: sessionProgress ? { ...sessionProgress, requestingUserIsMissing } : null,
      /**
       * The context flag, sent with the ground because that is where the tab
       * lives. The client cannot read an environment variable, and a screen that
       * guesses whether a feature is on is how you get half of it rendering.
       *
       * Sent as a plain boolean, not as a list of capabilities: with the flag off
       * the client renders exactly the Documents tab it rendered before, and
       * there is nothing else to negotiate.
       */
      contextEnabled: this.contextEnabled(),
      // Whether this ground has a delivery board, so the client can show or hide
      // the link without duplicating the scenario-family table. The server owns
      // that routing; the client just reads the answer.
      boardRenders: boardRendersFor(ground.scenario),
      /*
       * WHETHER A PERSON ACTUALLY CHOSE THE RHYTHM, WHICH ONLY THE GAPS READ KNEW.
       *
       * `cadence` cannot be empty - it defaults to FORTNIGHTLY - so the column alone cannot tell a
       * chosen fortnightly from a fortnightly nobody was asked about. `cadenceStated` has recorded
       * the difference all along and the gaps builder uses it, but the ground payload every screen
       * reads did not carry it, so no screen could ask.
       *
       * Reported by a lead after a first session: "it didn't tell me how I should set my sessions
       * cadence". The check-in was running fortnightly on a default.
       */
      cadenceChosen: (ground as any).cadenceStated ?? false,
      /**
       * AND THE SAME QUESTION ABOUT THE OTHER TWO. See WhatThisCheckInStillNeeds.
       *
       * "Meeting cadence at the end of the report does not show up and does not have start dates."
       * The block that asks about the rhythm was gated on the rhythm alone, and the rhythm is
       * always picked at the door - so it never appeared. Meanwhile the two answers nobody is ever
       * asked for were both sitting unset: `startsAt` null on every check-in born through the
       * door, and `timelineStated` false, which means the 90 days everything counts against is a
       * default nobody chose.
       *
       * Same shape as `cadenceChosen` and for the same reason: the column has always known, and
       * the payload every screen reads could not say.
       */
      startDateChosen: !!(ground as any).startsAt,
      timelineChosen: (ground as any).timelineStated ?? false,
      /**
       * WHOSE CHECK-IN THIS IS, WHEN IT IS NOT THE READER'S OWN COMPANY.
       *
       * Somebody added to a check-in in another organisation can open it - the cross-org read a
       * hundred lines above exists for exactly that - and nothing anywhere told them they had. They
       * are a guest in somebody else's workspace, seeing one check-in and nothing around it, and
       * the first they knew of it was that the rest of the product looked empty.
       *
       * The name, only when it differs. On a reader's own check-in this is null and no screen says
       * anything, because "at your own company" is not information.
       */
      guestIn: ground.organizationId !== organizationId
        ? ((ground as any).organization?.name ?? 'another organisation')
        : null,
    };
  }

  /**
   * Add a private lead-context note - the initiator feeds the AI real-world
   * context it would otherwise never have, about a specific participant
   * (participantId set) or about the ground (participantId null). Initiator-only.
   * It DIRECTS and WEIGHTS synthesis; it is never shown to the person it is about
   * and never becomes a stated claim in the report (see reports.service synthesis).
   */
  /**
   * THE CONTEXT CHAT. G37, G23 - the last of Wave 2's seven and the largest.
   *
   * It probes for what setup did not capture and recommends the material rather than
   * waiting for uploads. A real run produced a ninety-day ground from one sentence,
   * with no duration, no rhythm and no sense of who was involved; this is the thing
   * that stops that.
   *
   * The lead's only, because it is about the ground rather than about anybody's
   * account - and because the failure mode is a lead using it to say things about a
   * person. See the-context-chat.ts for the refusals that guard against that.
   */
  async contextChat(
    groundId: string,
    requestingUserId: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, label: true, scenario: true, initiatorId: true, timelineDays: true,
        cadence: true, brief: true, timelineStated: true, cadenceStated: true,
        organizationId: true,
        participants: { select: { id: true, managingOnly: true } },
        objectives: { select: { id: true } },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    /**
     * SAME RULE AS THE NOTES. An admin in this organisation could release the report and close the
     * check-in and could not steer it - so covering for an absent lead meant being able to end the
     * thing without being able to set it up. See `addLeadContext` for the whole reasoning.
     */
    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(viewer, ground);
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('Setting this check-in up is for the lead or an admin in your organisation. Your own check-ins are on your page.');
    }

    /*
     * THE DOCUMENTS THEMSELVES, NOT A COUNT OF THEM.
     *
     * This read only `count`, so the context chat knew how many files existed and nothing about
     * what was in them - it could not tell somebody what their own brief said, and the "anything in
     * writing?" gap closed the moment a file existed rather than when anybody had read it.
     *
     * Bounded by the same rule the check-in uses, and for the same reason: a forty page
     * architecture document read as its first N characters, saying so, beats one read silently in
     * part. See a-prompt-that-ran-out-of-room-says-so.ts.
     */
    /*
     * AND THE LEAD'S OWN FILES, NOT ONLY THE ONES ALREADY OPEN TO EVERYBODY.
     *
     * "Why can't a context chat pull our context from a doc that aligns with the scenario?"
     *
     * It could, and it does - but only for documents whose visibility is OPEN. A document starts
     * private to whoever uploaded it, on purpose (G24 rule 3: a performance plan dropped into
     * shared context in a hurried first week cannot be recalled). So somebody who uploaded the
     * brief from inside this very conversation was then told by it that no document had been
     * shared, and asked to go and find one.
     *
     * A person's own file is not behind a wall FROM THEM. The wall is other people reading it, and
     * this conversation has exactly one reader: the lead, who is also the uploader. Nobody else's
     * private document is included - `uploadedBy` is the requesting user, and OPEN is unchanged
     * for everybody else's.
     */
    const openDocuments = await this.prisma.groundDocument.findMany({
      where: {
        groundId,
        OR: [{ visibility: 'OPEN' }, { participant: { userId: requestingUserId } }],
      },
      select: { fileName: true, content: true, uploaderNote: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => [] as { fileName: string; content: string; uploaderNote: string | null }[]);

    const openDocumentCount = await this.prisma.groundDocument.count({
      where: { groundId, visibility: 'OPEN' },
    });
    const perPersonObjectives = (await this.prisma.personObjective.findMany({
      where: { groundId },
      select: { text: true, authoredBy: true, seenBySubject: true, participantId: true },
    })).filter(o => mayBeReadAgainst({
      participantId: o.participantId, text: o.text, authoredBy: o.authoredBy as any, seenBySubject: o.seenBySubject,
    })).length;
    const targetCount = await this.prisma.groundObjective.count({ where: { groundId } });

    const gaps = contextGaps({
      targetCount,
      scenario: ground.scenario,
      /**
       * `null` here means "nobody chose this", not "the column is empty" - the column cannot be
       * empty. Passing the raw value made the duration question unaskable, which is the one thing
       * this conversation was built to ask.
       */
      timelineDays: ground.timelineStated ? ground.timelineDays : null,
      cadence: ground.cadenceStated ? ground.cadence : null,
      /* The success gap reads the baseline, not the brief - they are two different things and
         sharing one column broke both. See `ContextGaps.successLooksLike`. */
      successLooksLike: await this.statedSuccessFor(ground.id),
      partyCount: ground.participants.filter((p) => !p.managingOnly).length,
      /**
       * THE WRONG TABLE. `ground.objectives` is `GroundObjective` - one objective for the whole ground,
       * with no author and no seen-state. The question this gap asks is "what is each person actually
       * trying to achieve", which is `PersonObjective`, one row per person.
       *
       * Counted only where it can be READ AGAINST: a proposal the person has never seen does not answer
       * the question, it just means somebody typed something. `mayBeReadAgainst` is the module's own
       * test and it refuses proposals for exactly that reason.
       */
      perPersonObjectiveCount: perPersonObjectives,
      openDocumentCount,
      /* Read means read: the block above carries their text, or it does not. */
      documentsWereRead: openDocuments.length > 0,
    });

    // Nothing to ask about. Saying so and stopping is the right answer - a setup
    // conversation that will not end teaches people to skip setup.
    if (gaps.length === 0 && history.length === 0) {
      return {
        reply:
          'This check-in has what it needs: how long it runs, how often people check in, what doing well looks like, who is in it, and something in writing for everybody to work from. Nothing here needs fixing before the first session.',
        gaps: [],
        done: true,
      };
    }

    /*
     * WHAT THEY ATTACHED, AND WHAT THE CHAT IS TO DO WITH IT. Appended rather than woven in, so the
     * refusals in `contextChatPrompt` stay the first thing the model reads.
     */
    const fitted = whatFitsInTheRoom(openDocuments as any);
    if (fitted.leftOut.length) {
      this.logger?.log?.(`Context chat on ground ${groundId}: documents that did not fit - ${fitted.leftOut.join(', ')}.`);
    }
    const documentBlock = whatTheDocumentsSay(openDocuments as any, fitted.block)
      + (fitted.leftOut.length ? `\n\n${tellThemWhatIsMissing(fitted.leftOut)}` : '');

    /*
     * WHAT RECORDING AN EXPECTATION MEANS, SAID WHERE IT IS ABOUT TO HAPPEN. Only when that gap is
     * open, because a rule about a thing nobody is doing is noise.
     */
    /*
     * WHAT RECORDING AN EXPECTATION MEANS, WHEREVER THE CONVERSATION IS.
     *
     * This was attached only while the objectives gap was open, so on a check-in whose people
     * already had objectives the rule was absent and the model filled the space by refusing: "this
     * setup conversation isn't the right place to set individual targets". Setting what you expect
     * of somebody is available for as long as there is somebody to expect it of.
     */
    const expectationRule = ground.participants.filter((p) => !p.managingOnly).length > 1
      ? `\n\n${WHAT_RECORDING_IT_MEANS}`
      : '';
    const systemPrompt = `${contextChatPrompt(ground.label, ground.scenario, gaps)}${expectationRule}\n\n${documentBlock}`;
    const raw = await this.anthropic.respond(
      systemPrompt,
      history.length
        ? history.map((h) => ({ role: h.role === 'user' ? ('user' as const) : ('assistant' as const), content: h.content }))
        : [{ role: 'user' as const, content: 'Start.' }],
    );

    /*
     * THE SAME GUARD AS EVERY OTHER PLACE A MODEL TALKS TO A PERSON.
     *
     * This is prose, to the lead, built out of what the lead typed - which is the exact shape that
     * turned "microchipshit" into "Microchip Solutions" on the entry path. The guard has now been
     * missed in five separate flows, each time because it was added where the bug was found rather
     * than everywhere the shape occurs.
     */
    const leadSaid = history.filter((h) => h.role === 'user').map((h) => h.content ?? '');
    const screened = screen(raw, leadSaid);
    if (screened.dropped.length) {
      this.logger.warn(
        `Context chat on ${ground.id} dropped ${screened.dropped.length} sentence(s): `
          + screened.hits.map((h) => `${h.check} (${h.offending.join(', ')}) in ${JSON.stringify(h.sentence)}`).join(' | '),
      );
    }
    const reply = screened.text || ASK_AGAIN;
    const shortened = truncationsOfTheirWords(reply, leadSaid);
    if (shortened.length) {
      /* The count, not the words: a log has wider access than the record and no retention policy (G4). */
      this.logger.warn(`Shortened ${shortened.length} of their own words in the context chat for ground ${ground.id}.`);
    }

    /**
     * WHAT IT HEARD, AND WHAT IT PROPOSES DOING WITH IT. Stage 3.
     *
     * This conversation could not close anything it opened. It asked how long the ground should run,
     * the lead answered, nothing was written, and because the gap was still open the next turn asked
     * again. Its own prompt file promised "what gets saved is what the lead confirms" and there was
     * no save path at all.
     *
     * A PROPOSAL, NEVER A WRITE. The reply carries `proposal.say` - "I will set this to run for
     * twelve weeks" - and the ground is untouched until the lead confirms it through
     * `applyContextProposal`. The failure mode of the other design is a stray sentence rewriting how
     * long somebody's onboarding runs.
     *
     * Only the field the open question was about is reachable, so a model that over-reads cannot
     * touch the cadence while answering about duration.
     */
    let proposal: Proposal = { kind: 'none', why: 'Nothing to record yet.' };
    const lastFromLead = [...history].reverse().find(h => h.role === 'user')?.content?.trim();
    const openGap = gaps[0]?.key ?? null;
    if (lastFromLead && openGap) {
      try {
        const heard = await this.anthropic.extract<Heard>(
          'Read ONLY what the person just said in answer to the question they were asked. Omit any field they did not answer. Never infer a sensible default.',
          [{ role: 'user' as const, content: lastFromLead }],
          extractionToolFor(openGap),
        );
        if (heard) proposal = proposalFrom(openGap, heard, await this.partiesForMatching(groundId));
      } catch {
        /* no proposal; the conversation carries on and the lead can use the form */
      }

      /*
       * AND A TARGET FOR A NAMED PERSON IS HEARD WHATEVER QUESTION WAS ON THE TABLE.
       *
       * Only `gaps[0]` was ever extracted, so everything the lead said that was not an answer to
       * the one open question fell on the floor. Live: "give her 3,000 units by December" was read
       * by the timeline extractor, came back as "I will set this to run for 90 days", and the
       * target for Amina was never heard by anything.
       *
       * It WINS over the open gap's own reading when both fire. A sentence naming a person and a
       * number is about that person - reading it as how long the check-in runs is the failure that
       * was observed, not a tie to be broken gently.
       */
      if (openGap !== 'objectives') {
        try {
          const alsoHeard = await this.anthropic.extract<Heard>(
            WHO_AND_WHAT_THEY_EXPECT,
            asContextThenTheSentence(history, lastFromLead),
            extractionToolFor('objectives'),
          );
          if (alsoHeard) {
            const forSomebody = proposalFrom('objectives', alsoHeard, await this.partiesForMatching(groundId));
            if (forSomebody.kind === 'expectation') proposal = forSomebody;
          }
        } catch {
          /* the open gap's proposal, or none, stands */
        }
      }
    }

    /**
     * THROUGH THE BOUNDARY, LIKE EVERY OTHER THING A MODEL SAYS TO SOMEBODY.
     *
     * This reply went to the screen raw. Seen live the moment Context was switched on, the setup
     * conversation opened with "To set up this ground, I need to know..." - the exact leak the
     * vocabulary work exists to stop, on a surface nobody had ever watched because the flag was off.
     *
     * `forHumans` is where markdown, control markers, em dashes, house style and the product's own
     * noun are all settled. Skipping it did not just cost the word: this surface had none of it.
     */
    return {
      reply: forHumans(reply),
      gaps: gaps.map((g: { key: string }) => g.key),
      done: gaps.length === 0,
      /** Present only when there is something concrete to confirm. Same boundary: it is said to a person. */
      proposal: proposal.kind === 'none' ? null : { gap: proposal.kind, say: forHumans(proposal.say) },
    };
  }

  /**
   * THE CONFIRMATION. Nothing the context chat heard reaches the ground until this runs.
   *
   * Re-derives the proposal from the same words rather than trusting a payload: an endpoint that
   * accepts "set timelineDays to 4000" from the client is not a confirmation step, it is an edit
   * endpoint with a confirmation-shaped name.
   */
  /** Who is on this ground, in the shape the name matcher needs. */
  private async partiesForMatching(groundId: string) {
    const rows = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      select: { id: true, email: true, user: { select: { firstName: true, lastName: true } } },
    }).catch(() => [] as any[]);
    return rows.map((p: any) => ({
      id: p.id,
      email: p.email,
      name: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || null,
    }));
  }

  async applyContextProposal(
    groundId: string,
    requestingUserId: string,
    /*
     * `history` is context for WHO, never for what. "Yes, give her 3,000 units by December" cannot
     * be resolved from one sentence: the extractor returned "her" and the matcher found nobody on
     * the check-in by that name, so a target the lead had just been asked for was silently lost.
     * The change is still re-derived from their own words here - the client sends sentences, never
     * a participantId or a value - so the guarantee that made this a confirmation is unchanged.
     */
    dto: { said: string; history?: { role: 'user' | 'assistant'; content: string }[] },
  ) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, initiatorId: true, timelineDays: true, cadence: true, brief: true, scenario: true,
        timelineStated: true, cadenceStated: true,
        participants: { select: { id: true, managingOnly: true } },
        objectives: { select: { id: true } },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Setting this check-in up is the lead\'s.');
    }

    const openDocumentCount = await this.prisma.groundDocument.count({ where: { groundId, visibility: 'OPEN' } });
    const perPersonObjectives = (await this.prisma.personObjective.findMany({
      where: { groundId },
      select: { text: true, authoredBy: true, seenBySubject: true, participantId: true },
    })).filter(o => mayBeReadAgainst({
      participantId: o.participantId, text: o.text, authoredBy: o.authoredBy as any, seenBySubject: o.seenBySubject,
    })).length;
    const targetCount = await this.prisma.groundObjective.count({ where: { groundId } });
    const gaps = contextGaps({
      targetCount,
      scenario: ground.scenario,
      /**
       * `null` here means "nobody chose this", not "the column is empty" - the column cannot be
       * empty. Passing the raw value made the duration question unaskable, which is the one thing
       * this conversation was built to ask.
       */
      timelineDays: ground.timelineStated ? ground.timelineDays : null,
      cadence: ground.cadenceStated ? ground.cadence : null,
      /* The success gap reads the baseline, not the brief - they are two different things and
         sharing one column broke both. See `ContextGaps.successLooksLike`. */
      successLooksLike: await this.statedSuccessFor(ground.id),
      partyCount: ground.participants.filter(p => !p.managingOnly).length,
      /**
       * THE WRONG TABLE. `ground.objectives` is `GroundObjective` - one objective for the whole ground,
       * with no author and no seen-state. The question this gap asks is "what is each person actually
       * trying to achieve", which is `PersonObjective`, one row per person.
       *
       * Counted only where it can be READ AGAINST: a proposal the person has never seen does not answer
       * the question, it just means somebody typed something. `mayBeReadAgainst` is the module's own
       * test and it refuses proposals for exactly that reason.
       */
      perPersonObjectiveCount: perPersonObjectives,
      openDocumentCount,
    });
    const openGap = gaps[0]?.key ?? null;
    if (!openGap) throw new BadRequestException('There is no open question for this to answer.');

    const heard = await this.anthropic.extract<Heard>(
      'Read ONLY what the person said in answer to the question they were asked. Omit any field they did not answer.',
      [{ role: 'user' as const, content: dto.said }],
      extractionToolFor(openGap),
    );
    const parties = await this.partiesForMatching(groundId);
    let proposal = proposalFrom(openGap, heard ?? {}, parties);

    /*
     * AND THE SAME SECOND READING THE CHAT DOES, BECAUSE THIS IS WHERE THE YES LANDS.
     *
     * The chat can now hear "give her 3,000 units by December" whatever question was open. If this
     * half still only read `gaps[0]`, the lead would be shown that proposal, say yes, and be told
     * there was nothing in what they said - or worse, have the length of the check-in changed
     * instead. The two halves have to read the same sentence the same way.
     */
    if (openGap !== 'objectives') {
      const alsoHeard = await this.anthropic
        .extract<Heard>(
          WHO_AND_WHAT_THEY_EXPECT,
          asContextThenTheSentence(dto.history, dto.said),
          extractionToolFor('objectives'),
        )
        .catch(() => null);
      if (alsoHeard) {
        const forSomebody = proposalFrom('objectives', alsoHeard, parties);
        if (forSomebody.kind === 'expectation') proposal = forSomebody;
      }
    }
    if (proposal.kind === 'none') throw new BadRequestException(proposal.why);

    /**
     * The timeline write goes through `updateTimeline`, which already owns the rules about changing
     * a running ground's length and already appends to the audit log every party can now read. A
     * second path to the same column would be a second set of rules.
     */
    if (proposal.kind === 'timeline') {
      // Days straight through. This used to round to whole weeks, so a proposal of 45 days
      // was applied as 42 - a silent change to a number somebody had agreed.
      await this.updateTimeline(groundId, requestingUserId, { timelineDays: proposal.days });
      return { changed: 'timeline', say: proposal.say };
    }
    if (proposal.kind === 'cadence') {
      await this.updateTimeline(groundId, requestingUserId, { cadence: proposal.cadence });
      return { changed: 'cadence', say: proposal.say };
    }
    if (proposal.kind === 'expectation') {
      /*
       * THE LEAD'S EXPECTATION, MARKED UNSEEN, AND NOT AGREEMENT.
       *
       * `seenBySubject: false` is true by construction here - the person it is about has not
       * arrived. That flag is what the six explanations read to refuse pressing anybody about
       * something nobody showed them, so recording it honestly is what makes writing this safe at
       * all. `authoredBy` says the lead wrote it at setup, which is neither the person it is about
       * nor an integration.
       */
      await this.prisma.personObjective.create({
        data: {
          groundId,
          participantId: proposal.participantId,
          text: proposal.text,
          authoredBy: AUTHORED_AT_SETUP,
          seenBySubject: false,
        },
      });
      return { changed: 'expectation', say: proposal.say };
    }

    /*
     * THE MEASURES, WRITTEN ONLY ON A YES.
     *
     * A document does not have to set the bar, and it does not set it here either: the lead reads
     * a proposal that names every measure it took and whether a number was found for each, and
     * says yes. A target written without that is a bar nobody set, appearing on a board people are
     * then read against - and unlike a wrong timeline it cannot be recognised as wrong by looking
     * at it, because a plausible number looks exactly like an agreed one.
     *
     * `sortOrder` keeps the order they were named in: that is usually the order they matter in,
     * and re-sorting reads as the product having an opinion about which comes first.
     */
    if (proposal.kind === 'targets') {
      const existing = await this.prisma.groundObjective.count({ where: { groundId } });
      await this.prisma.groundObjective.createMany({
        data: proposal.targets.map((t, i) => ({
          groundId, name: t.name, target: t.target, sortOrder: existing + i,
        })),
      });
      return { changed: 'targets', say: proposal.say };
    }

    /*
     * WHAT DOING WELL LOOKS LIKE GOES WHERE WHAT DOING WELL LOOKS LIKE LIVES.
     *
     * This wrote `ground.brief`. The chat says "I will record that as what doing well looks like"
     * and then overwrote the description of the work with it - so the brief every party reads at
     * the top of their check-in became a success statement, and `GroundBaseline.successLooksLike`,
     * which is the column the report and the board actually read, was never written from the chat
     * at all. Seen on a real check-in: a brief that read "You have two standards for Zainab's first
     * quarter. One you told her in week one; the other you have never written down and doubt she
     * knows about" - the lead's own private account, published to the team as the brief.
     *
     * A NEW VERSION RATHER THAN AN EDIT, which is the table's own rule and the reason it has
     * versions: a changed goal is a new chapter with a marked transition, never an erasure, so
     * effort toward the old one stays real and nobody is retroactively behind. Conditions carry
     * forward untouched - restating the goal is not a claim about them.
     */
    /* An explicit branch rather than the last thing the method falls through to. It was the only
       kind left when there were four; with five it has to say which one it is. */
    if (proposal.kind !== 'success') {
      throw new BadRequestException('That one is not something this conversation changes on its own.');
    }
    const latestBaseline = await this.prisma.groundBaseline.findFirst({
      where: { groundId },
      orderBy: { version: 'desc' },
      select: { version: true, conditions: true },
    });
    await this.prisma.groundBaseline.create({
      data: {
        groundId,
        version: (latestBaseline?.version ?? 0) + 1,
        successLooksLike: proposal.text,
        conditions: (latestBaseline?.conditions ?? undefined) as any,
        changeReason: latestBaseline ? 'Restated in the context conversation.' : null,
      },
    });
    return { changed: 'success', say: proposal.say };
  }

  /**
   * A NOTE THE TEAM CAN READ. The gap that made everything else on the Context page confusing.
   *
   * Every note was lead-only, so a lead who wanted to tell the team the situation in words had no way
   * to - only a file, which they then had to remember to open. So they wrote a private note and
   * reasonably expected it to be seen. The missing thing was never a permission, it was a destination.
   *
   * AUDIENCE IS VISIBILITY, AND ONLY VISIBILITY. It does not touch what the note may be used for. A
   * shared note is still the lead's words about a situation, so the report may use it to decide what
   * to weigh and may never quote it, attribute it, or state it as fact - the same rule as the private
   * note, with a different audience. Widening who reads something must never widen what it proves.
   */
  async addLeadContext(groundId: string, requestingUserId: string, dto: { participantId?: string | null; text: string; audience?: 'LEAD_ONLY' | 'EVERYONE' }) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    /**
     * AN ORG ADMIN CAN WRITE CONTEXT, BECAUSE THEY CAN ALREADY DO THE HEAVIER THINGS.
     *
     * The powers were split down a line nobody drew on purpose: an admin in this organisation could
     * RELEASE the report and CLOSE the check-in - the two least reversible acts in the product - and
     * could not write a note or use the context chat. So somebody covering for a lead who has left, or
     * is on leave, could end the thing and could not steer it.
     *
     * They read with the lead's eyes everywhere else in this file (`isOrgAdmin` above `get`,
     * `setExternalVisibility`, the timeline). This was the one place that forgot.
     *
     * WHAT DOES NOT CHANGE: a note is still never quoted, and a note about a person is still never
     * shown to that person. Who may WRITE one is a different question from what one may be used for.
     */
    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(viewer, ground);
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException(
        'Only the lead of this check-in, or an admin in your organisation, can add context to it.',
      );
    }
    const text = (dto.text ?? '').trim();
    if (!text) throw new BadRequestException('Context note text is required');
    if (dto.participantId) {
      const target = await this.prisma.groundParticipant.findFirst({ where: { id: dto.participantId, groundId } });
      if (!target) throw new BadRequestException('That participant is not on this check-in');
    }

    const audience = dto.audience === 'EVERYONE' ? ContextNoteAudience.EVERYONE : ContextNoteAudience.LEAD_ONLY;

    /**
     * A SHARED NOTE IS NEVER ABOUT ONE NAMED PERSON, and this refuses rather than quietly dropping the
     * participant. A note about somebody, published to everybody, is a public judgement of them - the
     * one thing this product exists not to produce. The lead has two other places for that: the
     * private steer, which is never quoted, and their own check-in, where an expectation of somebody
     * is stated in their own words and published as such.
     */
    if (audience === ContextNoteAudience.EVERYONE && dto.participantId) {
      throw new BadRequestException(
        'A note everyone reads is about the whole check-in, not about one person. To say what you expect of somebody, say it in your own check-in - it is published with your name on it. To note something only you should see, leave this note private.',
      );
    }

    return this.prisma.leadContextNote.create({
      data: { groundId, participantId: dto.participantId ?? null, authorUserId: requestingUserId, text, audience },
      select: { id: true, participantId: true, text: true, createdAt: true, audience: true },
    });
  }

  /**
   * Initiator-only: choose whether participants can see each other's contact details
   * (email). When restricted, a participant sees every other participant's name, role
   * and presence but not their email - only their own. Presence stays as a nudge; only
   * the harvestable contact detail is hidden. See the read-path enforcement in get().
   */
  async setExternalVisibility(groundId: string, requestingUserId: string, restrict: boolean) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Only the lead of this check-in can change this setting');
    }
    return this.prisma.ground.update({
      where: { id: groundId },
      data: { restrictExternalVisibility: restrict },
      select: { id: true, restrictExternalVisibility: true },
    });
  }

  /**
   * Can the parties see who else is on this ground and how each is doing?
   *
   * The same roster means opposite things depending on the situation. On a team
   * delivering together it is how people coordinate and how someone notices a
   * colleague is stuck. On an onboarding period that doubles as a probation it
   * tells four people exactly who they are being measured against, and turns a
   * record meant to help them into a leaderboard.
   *
   * The product cannot tell those apart from the scenario alone, and it should
   * not decide it silently either way, so the lead or an admin says. Until they
   * do, the default is by kind of ground: hidden where the period decides
   * something about a person, shown where it does not.
   */
  /**
   * TWO SETTINGS THAT EXISTED, WERE READ, AND COULD NOT BE SET BY ANYBODY.
   *
   * `whoSeesTargets` is read by the board and by the conversation. `expectThemToUnblock` is read by
   * the conversation and decides whether a check-in asks what somebody actually tried before
   * recording a blocker. Both had a default, both had a careful note on the column explaining when
   * the other value is right, and nothing in the product wrote either one - so the note described a
   * choice nobody could make.
   *
   * It is the same shape as `peersVisibleToEachOther`, which sat in exactly this state until it was
   * found, and the same shape as the target form that was hidden until a target existed. Three in
   * one codebase means the gap is systematic rather than unlucky: a column, a reader, and no writer
   * compiles clean and passes everything.
   *
   * Same permission as its neighbours: the lead of this check-in, or an admin in this organisation.
   */
  private async aSettingOnlyTheLeadMayChange(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    if (ground.initiatorId !== requestingUserId && !adminsThisOrg(viewer, ground)) {
      throw new ForbiddenException(
        'Only the lead of this check-in, or an admin in this organisation, can change this.',
      );
    }
  }

  /** Whether people on this check-in see each other's numbers, or only their own. */
  async setWhoSeesTargets(groundId: string, requestingUserId: string, everybody: boolean) {
    await this.aSettingOnlyTheLeadMayChange(groundId, requestingUserId);
    return this.prisma.ground.update({
      where: { id: groundId },
      data: { whoSeesTargets: everybody ? 'EVERYBODY' : 'THEIR_OWN' },
      select: { id: true, whoSeesTargets: true },
    });
  }

  /**
   * WHETHER THIS CHECK-IN IS ANSWERED ON WHATSAPP.
   *
   * Only answerable where the organisation has a number of its own, because otherwise there is
   * nothing to answer on - and a setting that can be turned on with nothing behind it is a door
   * into a wall. Null puts it back to following the organisation.
   */
  async setOverWhatsApp(groundId: string, requestingUserId: string, over: boolean | null) {
    await this.aSettingOnlyTheLeadMayChange(groundId, requestingUserId);
    if (over === true) {
      const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true } });
      const connected = ground
        ? await this.prisma.whatsAppConnection.findUnique({ where: { organizationId: ground.organizationId }, select: { enabled: true } })
        : null;
      if (!connected?.enabled) {
        throw new BadRequestException('This organisation has no WhatsApp number connected yet. Connect one on the Connect page first.');
      }
    }
    return this.prisma.ground.update({
      where: { id: groundId },
      data: { overWhatsApp: over },
      select: { id: true, overWhatsApp: true },
    });
  }

  /**
   * Whether being blocked is expected to come with having tried.
   *
   * On by default and right most of the time. Off for the cases the column names: a cohort of new
   * starters with no standing to chase anybody, an external party who cannot escalate inside
   * somebody else's company, a crisis check-in where the point is to hear what happened.
   */
  async setExpectThemToUnblock(groundId: string, requestingUserId: string, expect: boolean) {
    await this.aSettingOnlyTheLeadMayChange(groundId, requestingUserId);
    return this.prisma.ground.update({
      where: { id: groundId },
      data: { expectThemToUnblock: expect },
      select: { id: true, expectThemToUnblock: true },
    });
  }

  async setPeerVisibility(groundId: string, requestingUserId: string, visible: boolean) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(viewer, ground);
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException(
        'Only the lead of this check-in, or an admin in this organisation, can change this.',
      );
    }

    return this.prisma.ground.update({
      where: { id: groundId },
      data: { peersVisibleToEachOther: visible },
      select: { id: true, peersVisibleToEachOther: true },
    });
  }

  /**
   * Do the people on this ground actually see each other's work?
   *
   * The scenario can only guess. A cohort usually means people who never meet,
   * and a delivery team usually means people who do - but a cohort of trainers
   * sharing one site see each other every day, and a delivery team split across
   * four regions never does. Only the person who set the ground up knows.
   *
   * It matters more than it sounds. Every fairness read on the board is built on
   * colleagues describing each other, and the protection for a quiet, competent
   * person works by noticing that others still credit them while their own
   * account stays modest. Where nobody can corroborate anybody, that protection
   * has nothing to stand on and silence gets misread as work going missing. On a
   * probation, that is somebody's job.
   *
   * Either party to the ground may answer, not only the initiator: an admin sets
   * these grounds up for other people and often knows the answer when the lead is
   * still being onboarded.
   */
  async setPeopleWorkTogether(groundId: string, requestingUserId: string, together: boolean) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(viewer, ground);
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException(
        'Only the lead of this check-in, or an admin in this organisation, can change this.',
      );
    }

    return this.prisma.ground.update({
      where: { id: groundId },
      data: { peopleWorkTogether: together },
      select: { id: true, peopleWorkTogether: true },
    });
  }

  /**
   * Add the second party. They are NEVER added silently - we send an invite
   * (magic link) and stamp notifiedAt. (OPTION FOUR RULE, Part 1.)
   */
  /**
   * NOBODY IS INVITED INTO AN EMPTY CHECK-IN. GW-EXP-8. Her decision: "setup is key, or you go set up
   * the context in the context tab."
   *
   * WHAT IT PREVENTS. An invitation could go out before anything had been said about what the check-in
   * is for, so somebody could open their session and start answering into a vacuum - and the whole
   * point of the expectation work is that people should not have to guess what is wanted of them. The
   * first round is also the one you cannot redo: an account given in the dark is on the record.
   *
   * TWO WAYS TO SATISFY IT, because there are two honest ways to set a check-in up:
   *   1. The lead has finished their own first conversation, which is where aims and expectations
   *      come from. This is the better one.
   *   2. There is context: a document, or something the lead has written down.
   *
   * Route 2 leaves NO EXPECTATIONS, which is a real difference and not one to paper over - the Context
   * tab says so plainly rather than letting it pass quietly.
   *
   * MODELLED ON THE APPROVAL GATE DIRECTLY ABOVE, which already refuses an invite for a reason of the
   * same kind: an invitation that has gone out cannot be recalled, so the check belongs before it.
   */
  /**
   * Long enough to be a description of the work rather than a title somebody typed to get past a
   * field. A brief of four words tells the person answering nothing.
   */
  private static readonly MEANS_SOMETHING = 40;

  private async assertSomethingToBeInvitedInto(groundId: string) {
    const leadDone = await this.prisma.checkIn.count({
      where: {
        groundId,
        status: CheckInStatus.COMPLETED,
        participant: { partyType: PartyType.INITIATOR },
      },
    });
    if (leadDone > 0) return;

    /*
     * THE BRIEF COUNTS, AND ITS ABSENCE HERE MADE THE REFUSAL UNTRUE.
     *
     * Setup asks for a brief in as many words - "say who this is about and what they have been
     * brought in to do" - stores it on the ground, and then adds the participants. This gate counted
     * documents and notes and not the brief, so EVERY participant added from the setup flow was
     * refused with "nothing has been said about what this check-in is for" while the lead's own
     * description of it sat on the same row. Reproduced by creating a ground with a full brief and
     * watching the invite fail.
     *
     * An expectation counts too. It is the strongest form of the thing this gate is asking for -
     * somebody named, and what is wanted of them - and setup can now record one.
     *
     * WHAT STILL DOES NOT COUNT: adding a person. The gate exists so that nobody opens their first
     * session and answers into a vacuum, and the act of inviting somebody says nothing about what
     * the check-in is for. A gate cleared by the action it guards is not a gate.
     */
    const [documents, notes, ground, expectations] = await Promise.all([
      this.prisma.groundDocument.count({ where: { groundId } }),
      this.prisma.leadContextNote.count({ where: { groundId } }),
      this.prisma.ground.findUnique({
        where: { id: groundId },
        select: { brief: true, scenario: true },
      }),
      this.prisma.personObjective.count({ where: { groundId } }),
    ]);
    if (documents > 0 || notes > 0 || expectations > 0) return;
    if ((ground?.brief ?? '').trim().length >= GroundsService.MEANS_SOMETHING) return;

    /**
     * A SNAPSHOT IS THE ONE SITUATION WHERE THIS GATE IS BACKWARDS.
     *
     * Every other situation is set up because the lead already knows something: a person is
     * starting, a project is off track, a decision is coming. A snapshot is the opposite - one
     * honest read from everybody today, run precisely BECAUSE nobody can yet say what is going on.
     * Demanding that the lead state what it is for before anyone can be asked defeats the only
     * thing it is for.
     *
     * And the harm this gate exists to prevent does not arise here. It exists so that nobody opens
     * their first session and answers into a vacuum against expectations they have never been told
     * - but a snapshot sets no target and asks everybody the same open question, so there is
     * nothing they could be measured against unknowingly. The vacuum is the format.
     */
    if (ground?.scenario === GroundScenario.SNAPSHOT) return;

    /**
     * Says which ways clear it, because a refusal that does not tell you what to do next is the
     * failure this codebase keeps finding.
     *
     * AND IT MUST NOT NAME A ROUTE THIS PERSON CANNOT TAKE.
     *
     * "Do your own check-in first" is impossible for a lead who set the ground up as managingOnly:
     * they run the check-in and are not in it, so they have no session of their own and never will.
     * Telling them to do one is an instruction that cannot be followed, which is the same defect as
     * a refusal asking for more input into a box that is switched off - and it hid the real point,
     * which is that for them a brief, an expectation or a document is not one option of four but
     * the only way through.
     */
    const leadIsNotInIt = await this.prisma.groundParticipant.count({
      where: { groundId, partyType: PartyType.INITIATOR, managingOnly: true },
    });
    throw new BadRequestException(
      leadIsNotInIt > 0
        ? 'Nobody can be invited yet: nothing has been said about what this check-in is for. You are '
          + 'running this check-in rather than taking part in it, so it has to come from you in '
          + 'writing - write the brief, say what you expect of somebody, or add a document or a note '
          + 'on the Context tab.'
        : 'Nobody can be invited yet: nothing has been said about what this check-in is for. Write the '
          + 'brief, say what you expect of somebody, add a document or a note on the Context tab, or do '
          + 'your own check-in first.',
    );
  }

  async addParticipant(groundId: string, organizationId: string, initiatorId: string, dto: AddParticipantDto) {
    /**
     * A start date in the future means the work has not begun. Today or the past means it has, so the
     * invite goes now exactly as it always did.
     *
     * Declared here rather than inside the transaction because BOTH halves need it: the row that says
     * uninvited, and the email that does not go. Split across scopes they could disagree, and a row
     * marked uninvited while the email had already gone is the worst of both - the lead would think
     * they could still change their mind about somebody who has already read it.
     */
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const startsInFuture = !!startsAt && startsAt.getTime() > Date.now();

    /**
     * NOBODY IS INVITED TO A GROUND THAT HAS NOT BEEN ACCEPTED.
     *
     * This is where the approval either means something or does not. Blocking the
     * status change alone would leave the invite path open, and an invite that has
     * already gone out cannot be recalled by declining afterwards - the person has
     * read it.
     */
    const pending = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId, status: GroundStatus.AWAITING_APPROVAL },
      select: { id: true },
    });
    if (pending) {
      throw new BadRequestException(
        'This check-in is waiting for an admin in your organisation to accept it. Nobody can be invited until then.',
      );
    }

    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('Check-in not found');

    /**
     * NOBODY IS ADDED TO A GROUND THAT HAS ENDED, OR ONE THAT IS HELD.
     *
     * This sits before the participant row is written, not only before the status write further
     * down, because the row itself is the wrong thing on a finished ground: a person with a session
     * on a check-in that is over. And the status write below - AWAITING_PARTIES - used to run on
     * any ground past AWAITING_LEAD, which resurrected a CLOSED or STALLED ground and quietly lifted
     * a PAUSED one. See a-ground-that-has-ended.ts.
     */
    if (!mayChangeOnItsOwn(ground.status)) {
      throw new BadRequestException(
        hasEnded(ground.status) ? 'This check-in has ended. Nobody can be added to it.' : WHILE_IT_IS_HELD,
      );
    }

    await this.assertSomethingToBeInvitedInto(groundId);

    /**
     * THE SETTING-UP ADMIN CAN ADD PEOPLE TOO, NOT ONLY THE INITIATOR.
     *
     * This check used to be `ground.initiatorId !== initiatorId` alone, and it
     * made the ordinary first-run journey impossible.
     *
     * An admin who chooses "I'm setting this up for my team - someone else will
     * run it" hands the ground to a lead: the LEAD becomes `initiatorId`, and the
     * admin is recorded as `createdByUserId`. She is then the only person signed
     * in, the lead has not accepted yet, and she is the one holding the list of
     * people to invite - and the old check refused her, on a ground she created,
     * in an organisation she owns. An eighteen-ground run stopped dead here: the
     * participant could not be added by anyone, so no check-in, report or board
     * downstream was reachable.
     *
     * It was worse than a plain refusal, because the page simultaneously showed
     * her the add-participant control. She filled in a colleague's name and email
     * and was told "Access denied" afterwards.
     *
     * `board.service.ts` already made exactly this allowance for READING
     * (`isSetupAdmin`). This is the same allowance for the matching write. The
     * ground is still scoped to the caller's organisation by the query above, so
     * this cannot reach another org's ground.
     */
    const isInitiator = ground.initiatorId === initiatorId;
    const isSetupAdmin = !!ground.createdByUserId && ground.createdByUserId === initiatorId;
    if (!isInitiator && !isSetupAdmin) {
      throw new ForbiddenException('Only the lead or the admin who set this check-in up can add a participant');
    }

    const initiator = await this.prisma.user.findUnique({ where: { id: initiatorId } });

    // Magic-link invite token, persisted on the participant. They accept it to
    // create/link a user, set userId, and enter their private check-in.
    // If the entry flow pre-generated a token (so the share link could be shown
    // immediately before auth), honour it here - no separate lookup needed.
    const token = dto.inviteToken ?? crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = inviteExpiryFrom();

    // Prevent duplicate participant - surface a clean 400 instead of a Prisma constraint error.
    // Exception: if the existing record was never accepted (userId=null), refresh the token and
    // re-send the invite rather than permanently blocking the address.
    const existing = await this.prisma.groundParticipant.findFirst({
      where: { groundId, email: dto.email.toLowerCase() },
    });
    if (existing) {
      if (existing.userId !== null) throw new BadRequestException('This email is already a participant on this check-in');
      /**
       * KEEP THE TOKEN. Re-adding somebody who hasn't accepted yet used to mint a
       * new token and overwrite the old one, which silently killed the first
       * invite email the moment a second one went out - so whichever email the
       * person actually opens, the earlier one now dead, they land on "this link
       * has already been used" despite never having clicked anything. Reusing
       * the existing token (or minting one only if none exists) means every
       * email ever sent to this address keeps pointing at the same, still-live
       * link - only the expiry is refreshed.
       */
      const freshToken = existing.inviteToken ?? crypto.randomBytes(32).toString('hex');
      const freshExpiry = inviteExpiryFrom();
      await this.prisma.groundParticipant.update({
        where: { id: existing.id },
        data: { inviteToken: freshToken, inviteTokenExpiresAt: freshExpiry, notifiedAt: null },
      });
      const emailResult = await this.email.sendParticipantInvite(
        dto.email.toLowerCase(),
        `${initiator?.firstName ?? 'A founder'}`,
        ground.label,
        freshToken,
        dto.note,
        { kind: 'PARTICIPANT_INVITE', participantId: existing.id, groundId: ground.id },
      );
      await this.prisma.groundParticipant.update({ where: { id: existing.id }, data: { notifiedAt: new Date() } });
      /*
       * AND SAY SO. Re-sending is right (the comment above says why), but it was silent: the
       * organiser typed an address they had already invited, got a 201 identical to a first
       * invitation, and had no way to tell the two apart — so nothing stopped them doing it a
       * third time, and each one really did send another email.
       */
      return {
        ...existing,
        inviteToken: undefined,
        devUrl: emailResult?.devUrl,
        alreadyInvited: true,
        saying: `${dto.email.toLowerCase()} was already invited and has not opened it yet. We have sent the invitation again - it uses the same link.`,
      };
    }

    // freeParticipantCap was written on check-in creation (DEFAULT_FREE_MEMBER_LIMIT, 100 for
    // broadcast grounds - see create()/createForLead()/entry.service.ts) but
    // never actually checked anywhere - a write-only field. Only free grounds
    // are capped at all; a subscribed org's grounds are unlimited here (its
    // own plan-level member cap is a separate, already-enforced dimension via
    // canInviteMember). Counts existing participant rows only - the
    // initiator's own row is created at ground creation, not through this path.
    /**
     * PAYING NOW, NOT FREE WHEN CREATED.
     *
     * The comment above states the intended rule - "a subscribed org's grounds are unlimited here" -
     * and the code asked a different question. `isFreeGround` is stamped at creation and never
     * revisited, so it answers "was this ground free when it was made", which is a fact about the past.
     * Entitlement is not: it changes the moment somebody pays. An org that subscribed after opening a
     * ground kept the free cap on it forever, and hit a message telling them to subscribe.
     *
     * `isFreeGround` KEEPS ITS OTHER JOB and stays immutable. As a billing record - this ground did not
     * consume a paid slot - it is correct and must not be rewritten. It was doing two jobs and only one
     * of them was right.
     */
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPlan: true, subscriptionStatus: true },
    });
    const paying = !!org && isSubscribed(org);

    if (ground.isFreeGround && !paying) {
      const participantCount = await this.prisma.groundParticipant.count({ where: { groundId } });
      if (participantCount >= ground.freeParticipantCap) {
        /**
         * The same sentence the account gate uses. This cap was 4 while the free plan covered 5
         * people, so a free user's very first check-in refused the fifth person the pricing page
         * had just promised them - and told them something different while doing it.
         */
        throw new BadRequestException(freeSeatLimitMessage(ground.freeParticipantCap));
      }
    }

    /**
     * IS THERE A SEAT FOR THIS PERSON, AND WHAT HAPPENS IF NOT.
     *
     * Not a refusal. See added-but-waiting-for-a-seat.ts: over the cap, the person is still added
     * and simply not written to, because refusing stops the lead's work for a reason only somebody
     * else can fix, and because the org-level cap was not being checked on this path at all - which
     * is how a real organisation ended up with seven active people on a plan covering five.
     *
     * Only asked about somebody who would NEED a seat. An existing member of this organisation
     * already holds one, and adding them to a second check-in costs nothing.
     */
    const alreadyHereWithASeat = await this.prisma.user.count({
      where: { email: dto.email.toLowerCase(), organizationId, ...SEAT_WHERE },
    });
    let waitingForASeat: SeatAnswer = { room: true };
    if (!alreadyHereWithASeat) {
      const [seatsTaken, seatsIncluded] = await Promise.all([
        this.prisma.user.count({ where: { organizationId, ...SEAT_WHERE } }),
        this.billing.seatsIncludedFor(organizationId),
      ]);
      waitingForASeat = whetherThereIsRoomForOneMore({ seatsTaken, seatsIncluded });
    }

    // SEQUENTIAL cadence: the lead's own session 1 must complete before a newly
    // added participant's session 1 opens - otherwise the team could check in
    // ahead of the lead, defeating the "lead goes first" point of this cadence.
    // Locked far in the future rather than null so it reads as "not yet open,"
    // not "no schedule" - the SEQUENTIAL branch of ensureNextSession() opens it
    // for real (sets it to now) once the lead completes session 1.
    let session1AvailableFrom: Date | null = null;
    if (ground.cadence === Cadence.SEQUENTIAL) {
      const leadCompletedSession1 = await this.prisma.checkIn.findFirst({
        where: {
          groundId,
          participant: { partyType: PartyType.INITIATOR },
          sessionNumber: 1,
          status: CheckInStatus.COMPLETED,
        },
      });
      if (!leadCompletedSession1) {
        session1AvailableFrom = new Date('9999-12-31T00:00:00.000Z'); // max JS date - "locked" sentinel
      }
    }

    /*
     * WHAT THIS CALL CHANGED, so a failed invitation can put it back. See the rollback below: the
     * participant was deleted and the ground's status change was not, which left a check-in sitting
     * in AWAITING_PARTIES with no parties on it — a state nothing else in the product produces and
     * nothing knows how to get out of.
     */
    /* `statusBefore`/`movedTheGroundOn` used to exist to put the ground back when an invitation's
       email threw and the participant was deleted. Nothing is rolled back now - the person stays on
       the check-in - so there is nothing to put back and the ground is right to be waiting. */
    let movedTheGroundOn = false;

    const participant = await this.prisma.$transaction(async (tx) => {
      const participant = await tx.groundParticipant.create({
        data: {
          groundId,
          email: dto.email.toLowerCase(),
          partyType: PartyType.PARTICIPANT,
          roleAsDescribed: dto.roleAsDescribed,
          department: dto.department?.trim() || null,
          /* Over the cap: on the check-in, not written to, until an admin makes room. */
          awaitingSeat: !waitingForASeat.room,
          /**
           * NOT INVITED YET IF THEY HAVE NOT STARTED.
           *
           * An invitation that lands before somebody has accepted the job is not a small mistake, and
           * an email that has gone out cannot be recalled - the person has read it. So a future start
           * date leaves `invitedAt` null and the invite unsent; grounds.cron.ts sends it on the day.
           *
           * The token is still generated now, so the link in that later email is the same one the lead
           * can already see and copy if they need to hand it over another way.
           */
          /* Null while the mail is held, for either reason. A row that says invited while nothing
             was sent is the worst of the three outcomes: the lead believes they can still change
             their mind about somebody who has in fact never heard from us - and here, the reverse,
             believes somebody has been written to when they have not. */
          invitedAt: startsInFuture || !waitingForASeat.room ? null : new Date(),
          startsAt: startsAt ?? null,
          inviteToken: token,
          inviteTokenExpiresAt,
        },
      });

      await tx.checkIn.create({
        data: { groundId, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED, availableFrom: session1AvailableFrom },
      });

      /**
       * ADDING A PARTICIPANT MUST NOT SKIP THE LEAD'S CONFIRMATION.
       *
       * This used to set AWAITING_PARTIES unconditionally, which quietly broke
       * the hand-off whenever the admin added someone before the lead had opened
       * their invitation - now the common order, since the admin is the one
       * holding the list of people to invite.
       *
       * The damage was silent and total. `confirmLead` requires status
       * AWAITING_LEAD, so once this moved the ground past it the lead could never
       * confirm; and `confirmLead` is the ONLY place a non-managing lead's own
       * check-in is created. The lead ended up recorded as a party
       * (`managingOnly = false`) with no session to give an account in, and was
       * never asked the one question that is hers to answer: "I'm also checking
       * in" or "Managing only".
       *
       * On a two-party ground that means the report is built from one side. Seen
       * live on a "New hire starting" ground - whose whole promise is getting a
       * manager and a hire to mean the same thing by "doing well" - where the
       * manager had no way to say what she meant. GW-016.
       *
       * A ground still waiting on its lead stays waiting. The participant is
       * added and invited either way.
       */
      if (ground.status !== GroundStatus.AWAITING_LEAD) {
        await tx.ground.update({ where: { id: groundId }, data: { status: GroundStatus.AWAITING_PARTIES } });
        movedTheGroundOn = true; /* Kept for the log line below; nothing is reverted. */
      }

      return participant;
    });

    let emailResult: { devUrl?: string } | undefined;
    /** Set when the row was created but the mail did not go. Returned so the caller can say so. */
    let emailFailed: string | undefined;
    /**
     * THE INVITE WAITS FOR THE START DATE.
     *
     * Both halves of this have to hold together: the row says `invitedAt: null`, and no email goes. A
     * row marked uninvited while the email had already gone would be the worst of both, because the
     * lead would believe they could still change their mind about somebody who has already read it.
     *
     * `grounds.cron.ts` sends it on the day. Until then the ground shows the person as named and not
     * yet invited, which is exactly what is true.
     */
    /* `waitingForASeat` holds the mail for the same reason `startsInFuture` does, and the row says
       so the same way: `invitedAt` stays null, so nothing believes they have been written to. */
    if (!startsInFuture && waitingForASeat.room) {
    try {
      emailResult = await this.email.sendParticipantInvite(
        dto.email.toLowerCase(),
        `${initiator?.firstName ?? 'A founder'}`,
        ground.label,
        token,
        dto.note,
        { kind: 'PARTICIPANT_INVITE', participantId: participant.id, groundId: ground.id },
      );
    } catch (err: any) {
      /*
       * THE PERSON STAYS ON THE CHECK-IN. THE ROW USED TO BE DELETED, AND THAT MADE IT WORSE.
       *
       * This deleted the participant and their check-in and rethrew, on the reasoning that an
       * invitation whose email threw should leave nothing behind. Two things are wrong with it.
       *
       * FIRST, THE MAIL MAY ALREADY HAVE GONE. A send that throws is not a send that did not
       * happen - a provider can accept the message and then fail the response, and a timeout tells
       * you nothing either way. So the row is removed while the invitation is in somebody's inbox,
       * and when they click it the token finds nothing: "This link has already been used, or it is
       * not a link we recognise." Photographed, on a link that had never been used.
       *
       * SECOND, IT DESTROYS THE ONLY THING WORTH KEEPING. Adding somebody is the admin's decision
       * and the hard part; sending a mail is the recoverable part, and `resendInvite` already
       * exists for exactly this. Throwing away the decision to protect against a failed mail is the
       * wrong way round.
       *
       * So the row survives, uninvited and unnotified, and the caller is told the mail did not go.
       * `invitedAt: null` is the truthful state and it is the same one a future start date produces,
       * which both screens already explain. The ground's status change stands, because there IS now
       * somebody to wait for.
       */
      await this.prisma.groundParticipant
        .update({ where: { id: participant.id }, data: { invitedAt: null } })
        .catch(() => undefined);
      this.logger.error(
        `Added ${dto.email.toLowerCase()} to ground ${groundId} but the invitation did not send: ${err?.message}. ` +
          'They are on the check-in and uninvited; the invite can be resent from the check-in.',
      );
      emailFailed = err?.message ?? 'The invitation did not send.';
    }

    }

    // Stamp notifiedAt only after the email succeeds (Rule 3 - nobody added silently).
    await this.prisma.groundParticipant.update({
      where: { id: participant.id },
      /**
       * NOT NOTIFIED IF NOTHING WAS SENT. `notifiedAt` is the record that a person was told they had
       * been added - Rule 3, nobody added silently - so stamping it for a deferred invite would claim
       * something that has not happened, and the cron would have nothing to look for.
       */
      data: { notifiedAt: startsInFuture || !waitingForASeat.room ? null : new Date() },
    });

    this.usage.emit(UsageEventType.PARTICIPANT_INVITED, { organizationId, groundId, participantId: participant.id }).catch(() => undefined);

    // GW-01: strip private fields (inviteToken, inviteTokenExpiresAt, soloArtifact,
    // specificityHistory) before
    // returning to the caller. Only fields in SAFE_PARTICIPANT_SELECT are exposed.
    const { id, email, partyType, userId, roleAsDescribed, invitedAt, notifiedAt, soloArtifactAt, createdAt } = participant;

    /**
     * WHETHER THE PERSON JUST ADDED BELONGS TO SOMEBODY ELSE'S ORGANISATION.
     *
     * Reported from the other side: "she wasn't told that I was not part of her org when I was
     * added." The join itself is handled - `isASecondOrganisation` writes a GUEST membership, and
     * every org-scoped read still refuses them - so nothing leaks. What was missing is that the
     * person doing the adding had no idea, and typed an address believing it was a colleague's.
     *
     * It changes nothing about what happens. It is said because being a guest in another company's
     * check-in is a real fact about this person, and the lead is the one who has to know it - they
     * are the one who will wonder why this person cannot see the rest of the workspace.
     */
    const theirHome = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { organizationId: true, organization: { select: { name: true } } },
    });
    const fromAnotherOrg = !!theirHome && theirHome.organizationId !== organizationId;
    /*
     * "NOT INVITED YET" IS THREE DIFFERENT FACTS. The start date is ahead, there is no seat, or the
     * mail did not send - and the screen read them all as one null and told the lead "invited on the
     * start date", false in two of the three. The row carries the facts; this names them.
     */
    const notInvitedBecause: 'starts_later' | 'no_seat' | 'mail_failed' | null = emailFailed
      ? 'mail_failed'
      : !waitingForASeat.room
        ? 'no_seat'
        : invitedAt
          ? null
          : 'starts_later';
    return {
      id, email, partyType, userId, roleAsDescribed, invitedAt: emailFailed ? null : invitedAt, notifiedAt, soloArtifactAt, createdAt,
      notInvitedBecause,
      devUrl: emailResult?.devUrl,
      emailFailed,
      /* On the check-in, not written to, until an admin makes room. The lead is told exactly that -
         see added-but-waiting-for-a-seat.ts for why this is a sentence and not a refusal. */
      awaitingSeat: !waitingForASeat.room,
      ...(waitingForASeat.room ? {} : { saying: waitingForASeat.saying }),
      /* Named, because "somebody from another organisation" is not something a lead can act on and
         a company name is. Never the person's other colleagues, only where they belong. */
      ...(fromAnotherOrg
        ? { guestFrom: theirHome!.organization?.name ?? 'another organisation' }
        : {}),
    };
  }

  /**
   * GW-24: Resend an expired invite to a ground participant who has not yet
   * accepted. Reuses the existing token (only minting one if the row somehow
   * has none) and just refreshes the expiry, then re-sends the invite email.
   *
   * IT USED TO MINT A FRESH TOKEN AND OVERWRITE THE OLD ONE. That silently
   * killed every email sent before the resend: the person opens whichever
   * copy is in their inbox - the first one they find, a delayed sync, a
   * search result - and if it isn't the newest, the token it carries no
   * longer matches any row, so loadByToken() reports it as "already been
   * used, or not a link we recognise" even though they never clicked
   * anything. Reusing the token means every email ever sent to this address
   * points at the same, still-live link.
   */
  async resendParticipantInvite(groundId: string, participantId: string, organizationId: string): Promise<{ message: string }> {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('Check-in not found');

    const participant = await this.prisma.groundParticipant.findFirst({ where: { id: participantId, groundId } });
    if (!participant) throw new NotFoundException('Participant not found');
    if (participant.userId) throw new BadRequestException('This participant has already accepted their invite');

    // Block resend if the participant has already completed a check-in via the invite flow.
    const completedCheckIn = await this.prisma.checkIn.findFirst({
      where: { participantId, status: CheckInStatus.COMPLETED },
    });
    if (completedCheckIn) throw new BadRequestException('This participant has already completed their check-in');

    const token = participant.inviteToken ?? crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = inviteExpiryFrom();

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: { inviteToken: token, inviteTokenExpiresAt },
    });

    const initiator = await this.prisma.user.findUnique({ where: { id: ground.initiatorId } });
    await this.email.sendParticipantInvite(
      participant.email,
      `${initiator?.firstName ?? 'A founder'}`,
      ground.label,
      token,
      undefined,
      { kind: 'REMINDER', participantId: participant.id, groundId: ground.id },
    );

    // Stamp notifiedAt only after the email succeeds so the field reliably
    // reflects actual notification, not just intent to notify.
    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: { notifiedAt: new Date() },
    });

    return { message: 'Invite resent' };
  }

  /**
   * Return the current invite URL for a participant who has not yet accepted.
   * Only accessible to the initiator - they may need to share the link manually
   * if the invite email was missed.
   */
  async getParticipantInviteUrl(groundId: string, participantId: string, initiatorId: string): Promise<{ inviteUrl: string }> {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, initiatorId } });
    if (!ground) throw new ForbiddenException('You are not the lead of this check-in');

    const participant = await this.prisma.groundParticipant.findFirst({
      where: { id: participantId, groundId },
      select: { inviteToken: true, userId: true },
    });
    if (!participant) throw new NotFoundException('Participant not found');
    if (participant.userId) throw new BadRequestException('This participant has already accepted their invite');
    if (!participant.inviteToken) throw new BadRequestException('No active invite token');

    return { inviteUrl: this.email.buildInviteUrl(participant.inviteToken) };
  }

  /**
   * "THEY NEVER GOT THE EMAIL" DID NOT STOP AT THE INVITE.
   *
   * The invite link above refuses the moment somebody accepts - `participant.userId` is set and it
   * throws. From that point the lead had nothing to hand anybody. The address of an open check-in
   * was built by string concatenation inside the reminder cron and nowhere else, so the ONLY thing
   * in the product that could produce one was a scheduled email. If that email went to spam, was
   * deleted, or went to an address somebody no longer reads, the person could not reach their own
   * check-in and the lead could not send it to them. There was no recovery at all, only waiting for
   * the next nudge to fire and hoping.
   *
   * So this is the other half of the same button. It returns the link to the check-in that is open
   * NOW - not started or half-finished - and refuses clearly when there is not one, because a lead
   * copying a link to a completed check-in would be sending somebody to a page that asks them for
   * nothing.
   *
   * It mints nothing. The check-in already exists; this only says where it is. And like the invite
   * link, only the initiator can read it: a check-in address is enough to open somebody's session.
   */
  async getParticipantCheckInUrl(
    groundId: string,
    participantId: string,
    initiatorId: string,
  ): Promise<{ checkInUrl: string }> {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, initiatorId } });
    if (!ground) throw new ForbiddenException('You are not the lead of this check-in');

    const participant = await this.prisma.groundParticipant.findFirst({
      where: { id: participantId, groundId },
      select: { id: true, userId: true },
    });
    if (!participant) throw new NotFoundException('Participant not found');
    if (!participant.userId) {
      throw new BadRequestException(
        'They have not accepted their invite yet. Copy the invite link instead.',
      );
    }

    /* The open one, newest first: a ground runs several sessions and only the current one is
       somewhere to send a person. */
    const checkIn = await this.prisma.checkIn.findFirst({
      where: {
        groundId,
        participantId: participant.id,
        status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!checkIn) {
      throw new BadRequestException(
        'They have no check-in open right now. There will be a link to copy when their next one opens.',
      );
    }

    return { checkInUrl: this.email.buildCheckInUrl(checkIn.id) };
  }

  /**
   * Activate a ground. Moves status directly to ACTIVE with no payment gate.
   * Reports are generated and released automatically after each session completes.
   */
  /** Begin the closing session: flag every participant's NEXT session as final
   * (creating it if none is open). Initiator only. Same conversation format -
   * the flag changes the opener, the thoroughness framing, and makes the
   * final report read the whole arc. */
  async beginClosingSession(groundId: string, organizationId: string, userId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      include: { participants: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.initiatorId !== userId) throw new ForbiddenException('Only the lead of this check-in can begin the closing session');
    if (hasEnded(ground.status)) throw new BadRequestException('This check-in has already ended');

    /**
     * WHO GETS A CLOSING SESSION: THE PEOPLE WHO TOOK PART.
     *
     * This looped over every participant row. A managing-only lead - who by the rule above their
     * own flag gives no account after session 1 - was handed a closing session; so was somebody
     * invited who never joined. Neither would ever answer it, and the closing round waited on both
     * for ever: the report of the whole arc, permanently "forming".
     *
     * The three places that count who is expected each use a deliberately different population
     * (see the comments on isSessionReadyForReport and getSessionProgress). This one is its own,
     * stated here rather than borrowed: a closing session is the last word from somebody who has
     * been giving their account, so it goes to people who joined and are not managing-only. An
     * invitation still live at this point is not a person who took part.
     */
    const answering = ground.participants.filter((p) => !!p.userId && !p.managingOnly);

    /**
     * BEGINNING IT TWICE IS BEGINNING IT ONCE. Each pass computed `last + 1` and created, so a
     * retry - a double click, a timeout on the first call - gave every person a SECOND final
     * session at last + 2. The whole loop is one transaction now, and a person who already has a
     * final session, open or not, is left exactly as they are.
     */
    let flagged = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const p of answering) {
        const alreadyFinal = await tx.checkIn.findFirst({ where: { groundId, participantId: p.id, isFinal: true }, select: { id: true } });
        if (alreadyFinal) { flagged += 1; continue; }

        const open = await tx.checkIn.findFirst({
          where: { groundId, participantId: p.id, status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] } },
          orderBy: { sessionNumber: 'asc' },
        });
        if (open) {
          await tx.checkIn.update({ where: { id: open.id }, data: { isFinal: true } });
        } else {
          const last = await tx.checkIn.findFirst({
            where: { groundId, participantId: p.id },
            orderBy: { sessionNumber: 'desc' },
            select: { sessionNumber: true },
          });
          await tx.checkIn.create({
            data: { groundId, participantId: p.id, sessionNumber: (last?.sessionNumber ?? 0) + 1, status: CheckInStatus.NOT_STARTED, isFinal: true },
          });
        }
        flagged += 1;
      }
    });
    return { groundId, closingSession: true, participantsFlagged: flagged };
  }

  async activate(groundId: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, include: { report: true } });
    if (!ground) throw new NotFoundException('Check-in not found');
    /* Activating is not resuming, and it is not reopening. An ended ground stays ended; a held one is lifted by resumeGround, which knows what to go back to. */
    if (!mayChangeOnItsOwn(ground.status)) {
      throw new BadRequestException(
        hasEnded(ground.status) ? 'This check-in has ended and cannot be activated.' : WHILE_IT_IS_HELD,
      );
    }

    const activated = await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: GroundStatus.ACTIVE, billingActivatedAt: new Date() },
    });

    this.events.emit(GroundworkEvents.GROUND_ACTIVATED, { groundId } satisfies GroundActivatedEvent);

    return activated;
  }

  /**
   * GET /grounds/:id/mediator-brief
   * Returns structural, non-session information for use with a facilitator.
   * Accessible only to the initiator or a party (participant) on this
   * ground - checked below by requestingUserId, not by organization role.
   * There is no separate org-admin/platform-admin route for this brief; an
   * org admin who is not themselves the initiator or a participant cannot
   * currently read it at all.
   */
  async getMediatorBrief(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { report: { select: { centralQuestion: true } } },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    const requesterLink = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    const isInitiator = ground.initiatorId === requestingUserId;
    if (!isInitiator && !requesterLink) {
      throw new ForbiddenException('Only the lead, or somebody taking part in this check-in, can request a mediator brief');
    }

    const daysOpen = Math.floor((Date.now() - ground.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const endStateOptions = endStatesFor(ground.scenario).map((s) => s.label);
    const gapSummary = ground.report?.centralQuestion ?? 'Not yet synthesised';

    return {
      groundLabel: ground.label,
      scenario: ground.scenario,
      openedAt: ground.createdAt,
      daysOpen,
      endStateOptions,
      gapSummary,
      note: 'This brief is for use with a facilitator. It contains structural information only, not session content.',
    };
  }

  /**
   * PATCH /grounds/:id - update timeline and/or cadence.
   * Writes an audit entry to groundAuditLog (Json[] appended) so changes are
   * traceable without a separate audit table.
   */
  /**
   * WHAT DOING WELL LOOKS LIKE, AS STATED, AT THE VERSION IN FORCE. Its own read because the
   * context conversation and the report both need it and neither should have to know that the
   * table is versioned.
   */
  private async statedSuccessFor(groundId: string): Promise<string | null> {
    const b = await this.prisma.groundBaseline.findFirst({
      where: { groundId },
      orderBy: { version: 'desc' },
      select: { successLooksLike: true },
    });
    return b?.successLooksLike?.trim() || null;
  }

  /**
   * WHICH SETUP QUESTIONS THIS PERSON HAS SIGNED OFF.
   *
   * Whoever may read the check-in may read and make their own marks. It gates nothing and appears
   * in no report - it is one person's note that they have looked at a question - so the access rule
   * is simply "can you see this check-in at all", answered the same way everything else here
   * answers it: NotFound rather than Forbidden, so a stranger cannot tell a real id from a guess.
   */
  /** The one rule (who-may-read-this-check-in.ts), asked with the viewer's and the lead's departments resolved. */
  private async assertMaySeeGround(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { organizationId: true, initiatorId: true, createdByUserId: true, participants: { select: { userId: true } } },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { role: true, organizationId: true },
    });
    const viewer = { ...user, department: user?.role === 'LEAD' ? await this.departmentOf(userId, ground.organizationId) : null };
    const leadDepartment = user?.role === 'LEAD' && ground.initiatorId ? await this.departmentOf(ground.initiatorId, ground.organizationId) : null;
    if (!maySee(userId, viewer, { ...ground, leadDepartment })) throw new NotFoundException('Check-in not found');
    return ground;
  }

  /** A user's department is on the Person linked to them, when there is one. Null for most of a roster, and that is normal. */
  /**
   * THE FIRST CHECK-IN LANDS ON A DAY THEY WORK, LIKE EVERY ONE AFTER IT.
   *
   * `startsAt` is the one date a person types rather than the product computing it, and a date
   * picker will happily hand back a Sunday. Rolling it forward here means the rule holds for the
   * first session as well as the recurring ones - otherwise a weekdays-only ground still opens on
   * a weekend exactly once, on the day it matters most.
   */
  private theFirstDayTheyWork(startsAt: Date | null, workingDays: number[] | null | undefined): Date | null {
    return startsAt ? theNextDayTheyWork(startsAt, workingDays ?? []) : null;
  }

  private async departmentOf(userId: string, organizationId: string): Promise<string | null> {
    const person = await this.prisma.person.findFirst({ where: { linkedUserId: userId, organizationId }, select: { department: true } });
    return person?.department?.trim() || null;
  }

  /** The user ids of the leads whose linked Person shares this department. Empty for a blank department: blank is nobody's. */
  private async leadsOfTheDepartment(userId: string, organizationId: string): Promise<string[]> {
    const mine = await this.departmentOf(userId, organizationId);
    if (!mine) return [];
    const people = await this.prisma.person.findMany({
      where: { organizationId, department: mine, linkedUserId: { not: null } },
      select: { linkedUserId: true },
    });
    const linked = people.map((p) => p.linkedUserId!).filter((id) => id !== userId);
    if (!linked.length) return [];
    /* Person has no relation to User, so the role is read in a second step. */
    const leads = await this.prisma.user.findMany({ where: { id: { in: linked }, role: 'LEAD', organizationId }, select: { id: true } });
    return leads.map((u) => u.id);
  }

  async setupSignOffs(groundId: string, userId: string): Promise<number[]> {
    await this.assertMaySeeGround(groundId, userId);
    const rows = await this.prisma.groundSetupSignOff.findMany({
      where: { groundId, userId },
      orderBy: { step: 'asc' },
      select: { step: true },
    });
    return rows.map((r) => r.step);
  }

  async signOffSetupStep(groundId: string, userId: string, step: number): Promise<number[]> {
    await this.assertMaySeeGround(groundId, userId);
    /* Idempotent by the unique index: pressing twice is one sign-off, and two admins racing on the
       same question is not an error either. */
    await this.prisma.groundSetupSignOff.upsert({
      where: { groundId_userId_step: { groundId, userId, step } },
      create: { groundId, userId, step },
      update: {},
    });
    return this.setupSignOffs(groundId, userId);
  }

  async takeBackSetupSignOff(groundId: string, userId: string, step: number): Promise<number[]> {
    await this.assertMaySeeGround(groundId, userId);
    await this.prisma.groundSetupSignOff.deleteMany({ where: { groundId, userId, step } });
    return this.setupSignOffs(groundId, userId);
  }

  /**
   * DELETING A CHECK-IN THAT WAS ONLY EVER A TEST.
   *
   * "they can clear any test chats/checkins they run. I suspect this is likely to happen with new
   * users." It is: the first thing somebody does with this product is try it on something invented,
   * and until now the only way to get rid of that was to email us and ask. So new accounts
   * accumulate a rail full of "test", "asdf" and a real check-in among them.
   *
   * WHO. Its lead alone. Not an org admin - an admin restating somebody else's yardstick was the
   * complaint that came before this one, and deleting their check-in outright is the same act with
   * nothing left to argue about afterwards.
   *
   * AND ONLY WHILE IT IS STILL ONLY YOURS. The moment anybody else has given an account, this stops
   * being a test you are clearing and becomes somebody else's record that you are destroying - they
   * wrote it in confidence, they cannot get it back, and they are not asked. So it refuses, and
   * says who has answered. Closing the check-in is the thing to do with a real one, and the
   * distinction the refusal draws is exactly the distinction between the two.
   *
   * A declined invitation does not count as an account: somebody saying no is not a record to
   * protect, and a check-in everybody declined is precisely the sort somebody wants rid of.
   */
  /**
   * SENDING THE INVITATIONS THAT WERE WAITING FOR A SEAT.
   *
   * Called whenever an organisation gains room - a larger plan, somebody deactivated, somebody
   * removed. Oldest first, because a queue answered out of order is not a queue, and only as many
   * as there is actually room for: releasing six people into four seats would put the account
   * straight back over its cap and undo the point of holding them.
   *
   * Best-effort per person. One address that bounces must not strand the rest of the queue behind
   * it, and a row that stays `awaitingSeat` is simply picked up next time.
   */
  async releaseAnyoneWaitingForASeat(organizationId: string): Promise<{ sent: number; stillWaiting: number }> {
    const waiting = await this.prisma.groundParticipant.findMany({
      where: { awaitingSeat: true, ground: { organizationId } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, email: true, inviteToken: true, groundId: true,
        ground: { select: { label: true, initiator: { select: { firstName: true } } } },
      },
    });
    if (!waiting.length) return { sent: 0, stillWaiting: 0 };

    const room = await this.billing.seatsLeft(organizationId);
    /* Null is uncapped: everybody goes. */
    const canSend = room === null ? waiting.length : Math.max(0, room);
    let sent = 0;

    for (const w of waiting.slice(0, canSend)) {
      try {
        await this.email.sendParticipantInvite(
          w.email,
          w.ground?.initiator?.firstName ?? 'A founder',
          w.ground?.label ?? 'a check-in',
          w.inviteToken ?? '',
          undefined,
          /* So the "you can ignore this" line resolves to this person, as it does on a first send. */
          { kind: 'PARTICIPANT_INVITE', participantId: w.id, groundId: w.groundId },
        );
        await this.prisma.groundParticipant.update({
          where: { id: w.id },
          data: { awaitingSeat: false, invitedAt: new Date() },
        });
        sent += 1;
      } catch (e: any) {
        this.logger.warn(`Could not send the held invitation to ${w.email}: ${e?.message ?? e}`);
      }
    }
    return { sent, stillWaiting: waiting.length - sent };
  }

  async deleteWhileItIsStillATest(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, label: true, initiatorId: true,
        participants: {
          select: {
            id: true, userId: true, email: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    /* NotFound rather than Forbidden for a stranger, as everywhere else here. */
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.initiatorId !== requestingUserId) {
      const mine = ground.participants.some((p) => p.userId === requestingUserId);
      if (!mine) throw new NotFoundException('Check-in not found');
      throw new ForbiddenException(
        'Only the person running this check-in can delete it. Your own account of it is yours, and deleting the whole thing would take everybody else\'s with it.',
      );
    }

    const others = ground.participants.filter((p) => p.userId !== requestingUserId);
    const answered = others.length
      ? await this.prisma.checkIn.findMany({
        where: { participantId: { in: others.map((p) => p.id) }, status: CheckInStatus.COMPLETED },
        select: { participantId: true },
      })
      : [];
    if (answered.length) {
      const who = [...new Set(answered.map((a) => a.participantId))]
        .map((pid) => {
          const p = others.find((x) => x.id === pid);
          const named = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim();
          return named || p?.email || 'somebody';
        });
      throw new BadRequestException(
        `${who.join(' and ')} ${who.length === 1 ? 'has' : 'have'} already given an account here, so this is not a test any more - deleting it would destroy what they wrote, and they cannot get it back. Close the check-in instead: everybody keeps their record.`,
      );
    }

    /* Everything hanging off a ground cascades on the foreign key. */
    await this.prisma.ground.delete({ where: { id: groundId } });
    this.logger.log(`Check-in ${groundId} deleted by its lead ${requestingUserId}`);
    return { deleted: true, label: ground.label };
  }

  async updateTimeline(
    groundId: string,
    requestingUserId: string,
    dto: { label?: string; timelineDays?: number; timelineWeeks?: number; cadence?: string; contextNote?: string; startsAt?: string; brief?: string },
  ) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Check-in not found');

    const link = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    /**
     * AN ADMIN IN THIS ORGANISATION COUNTS, and did not. Same split as the context notes and the
     * context chat: they could release the report and close the check-in - the two least reversible
     * acts here - and could not change how long it runs. Covering for an absent lead meant being able
     * to end the thing and not to reschedule it.
     */
    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(viewer, ground);
    if (!link && ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('You are not a participant in this check-in');
    }

    // HOW LONG THE GROUND RUNS IS THE LEAD'S CALL, NOT EVERY PARTY'S.
    //
    // Any party could change the timeline and cadence. On an onboarding that
    // doubles as a probation, that means the person being assessed could shorten
    // or extend their own assessment period, and nobody would necessarily
    // notice. Adding context is still open to everyone - that is an account of
    // the work, which is what the product is for.
    /**
     * ONE AUTHORITATIVE TIMELINE, IN DAYS.
     *
     * A caller may still send weeks; it is converted here and never stored as the only truth. Before
     * this, only `timelineWeeks` was written, and `timelineDays` - the value the stall cron and the
     * session-planning maths both read - was left untouched. The change was audited and had no effect.
     */
    const requestedDays = dto.timelineDays ?? (dto.timelineWeeks !== undefined ? dto.timelineWeeks * 7 : undefined);
    const changesTheSchedule = requestedDays !== undefined || dto.cadence !== undefined;
    if (changesTheSchedule && ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException(
        'Only the lead of this check-in, or an admin in your organisation, can change how long it runs or how often people check in. Ask them if it needs to change.',
      );
    }

    /**
     * RENAMING WAS ADVERTISED AND NEVER WRITTEN.
     *
     * The DTO documents `label` as "Rename the ground", the rail sends it, and this method's `data`
     * block never included it - so renaming a check-in did nothing, and the refetch that follows put
     * the old name straight back on screen. It looked like the product forgetting what you typed.
     *
     * THE LEAD'S CALL, LIKE THE SCHEDULE. A name is what everybody else sees this check-in as; a
     * party renaming somebody else's is the same class of change as moving its dates, so it is
     * gated the same way rather than left open to every participant.
     */
    const requestedLabel = dto.label?.trim();
    if (dto.label !== undefined) {
      if (!requestedLabel) {
        /* Rejected rather than ignored: a blank name would leave the check-in unidentifiable in
           every list it appears in, and silently keeping the old one teaches nothing. */
        throw new BadRequestException('A check-in needs a name. Type one, or leave the name as it is.');
      }
      if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
        throw new ForbiddenException(
          'Only the lead of this check-in, or an admin in your organisation, can rename it',
        );
      }
    }

    // MODE IS IMMUTABLE. If a ground could flip from private to shared, someone
    // who checked in believing their account was private would have it exposed -
    // the worst possible failure for a trust product. Rejected loudly here rather
    // than silently ignored, so a caller attempting it finds out.
    if ((dto as any).mode !== undefined && (dto as any).mode !== ground.mode) {
      throw new BadRequestException(
        'A check-in\'s mode cannot be changed. It is fixed when the check-in is created, because people check in on the understanding of what will and will not be shared.',
      );
    }

    /*
     * THE BRIEF. Whoever runs the check-in writes it and can rewrite it; it is the words everybody
     * reads before they answer, so it carries the same permission as renaming and the same audit
     * entry. Blank clears it, deliberately: a lead who wants the wrong brief GONE - every entry-chat
     * check-in before today had one written by the report rather than by them - should not have to
     * replace it with something they do not mean.
     */
    if (dto.brief !== undefined) {
      if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
        throw new ForbiddenException(
          'Only the lead of this check-in, or an admin in your organisation, can change what it says it is for.',
        );
      }
    }

    /**
     * THE START DATE, WHICH COULD BE SET AT CREATION AND NEVER AFTERWARDS.
     *
     * It drives two real things: an invitation for somebody added before the start is held and
     * sent by the cron on that day, and session 1 carries it as `availableFrom`. So a new hire
     * whose start moves by a week left a check-in that opens on the wrong day and invitations that
     * go out on the wrong day, with nothing anywhere to change it.
     *
     * ONLY WHILE NOTHING HAS BEEN ANSWERED. Once somebody has completed a session, moving the day
     * the run began would rewrite the frame their account was given - the cadence maths, the
     * overdue reads and the session gates all measure from it. Refused with the reason rather than
     * silently ignored, and refused for everybody including the lead.
     *
     * The gate is the same one the schedule uses, because changing when it starts IS changing the
     * schedule.
     */
    if (dto.startsAt !== undefined) {
      if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
        throw new ForbiddenException(
          'Only the lead of this check-in, or an admin in your organisation, can change when it starts.',
        );
      }
      const answered = await this.prisma.checkIn.count({
        where: { groundId, status: CheckInStatus.COMPLETED },
      });
      if (answered > 0) {
        throw new BadRequestException(
          'Somebody has already checked in, so the start date is fixed. It is the point everything else is measured from. Change how long it runs instead.',
        );
      }
      const when = dto.startsAt ? new Date(dto.startsAt) : null;
      if (dto.startsAt && Number.isNaN(when!.getTime())) {
        throw new BadRequestException('That is not a date we can read. Pick one from the calendar.');
      }
    }

    // Normalize and validate cadence if provided.
    if (dto.cadence) {
      (dto as any).cadence = (dto.cadence as string).toUpperCase();
      if (!Object.values(Cadence).includes(dto.cadence as Cadence)) {
        throw new BadRequestException(`Invalid cadence. Must be one of: ${Object.values(Cadence).join(', ')}`);
      }

      // ONE_TIME's whole guarantee is "a single check-in, full stop" - decided
      // by the actual session-1 completion, not by whatever the cadence field
      // happens to say at that instant. Converting cadence to/from ONE_TIME
      // after session 1 has already completed for anyone on this ground would
      // be silently inconsistent either direction: switching IN wouldn't undo
      // a session 2 that already exists or was already scheduled; switching
      // OUT wouldn't retroactively create the session 2 that ONE_TIME's own
      // ensureNextSession() early-return already skipped for good. Block the
      // conversion outright once any session 1 has completed, rather than
      // leave that inconsistency live.
      const changingOneTime = dto.cadence === Cadence.ONE_TIME || ground.cadence === Cadence.ONE_TIME;
      if (changingOneTime && dto.cadence !== ground.cadence) {
        const anySessionOneComplete = await this.prisma.checkIn.findFirst({
          where: { groundId, sessionNumber: 1, status: CheckInStatus.COMPLETED },
        });
        if (anySessionOneComplete) {
          throw new BadRequestException(
            'Cadence cannot be changed to or from "One time" after the first check-in has completed.',
          );
        }
      }
    }

    // Parse existing audit log - migrate legacy array format to structured object.
    const rawLog = ground.groundAuditLog;
    const auditData: { timeline: object[]; contextNotes: string[] } =
      rawLog && !Array.isArray(rawLog) && typeof rawLog === 'object'
        ? { timeline: (rawLog as any).timeline ?? [], contextNotes: (rawLog as any).contextNotes ?? [] }
        : { timeline: Array.isArray(rawLog) ? (rawLog as object[]) : [], contextNotes: [] };

    if (requestedDays !== undefined || dto.cadence !== undefined) {
      auditData.timeline.push({
        changedAt: new Date().toISOString(),
        changedBy: requestingUserId,
        changes: {
          ...(requestedDays !== undefined && { timelineDays: { from: ground.timelineDays, to: requestedDays } }),
          ...(dto.cadence !== undefined && { cadence: { from: ground.cadence, to: dto.cadence } }),
        },
      });
    }

    if (requestedLabel && requestedLabel !== ground.label) {
      auditData.timeline.push({
        changedAt: new Date().toISOString(),
        changedBy: requestingUserId,
        changes: { label: { from: ground.label, to: requestedLabel } },
      });
    }

    if (dto.contextNote?.trim()) {
      auditData.contextNotes.push(dto.contextNote.trim());
    }

    /*
     * AND THE SESSION GATE MOVES WITH IT.
     *
     * Session 1 carries the start date as `availableFrom` - that is how a check-in set up in
     * advance stays shut until the day. Writing the new date on the check-in and leaving the gate
     * on the old one would give a person a check-in that says it opens on the 22nd and lets them
     * in on the 15th, or the reverse. Only sessions nobody has started, which is all of them here:
     * the guard above refuses a change once anything is answered.
     */
    if (dto.startsAt !== undefined) {
      await this.prisma.checkIn.updateMany({
        where: { groundId, sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
        data: { availableFrom: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, (ground as any)?.workingDays) },
      });
    }

    return this.prisma.ground.update({
      where: { id: groundId },
      data: {
        /**
         * Both columns, so nothing reading the legacy one goes stale - but DAYS is the value that
         * counts, and weeks is derived from it rather than the other way round.
         */
        ...(requestedDays !== undefined && {
          timelineDays: requestedDays,
          timelineWeeks: Math.max(1, Math.round(requestedDays / 7)),
          timelineStated: true,
        }),
        ...(dto.cadence !== undefined && { cadence: dto.cadence as Cadence, cadenceStated: true }),
        ...(requestedLabel !== undefined && { label: requestedLabel }),
        ...(dto.brief !== undefined && { brief: dto.brief.trim() || null }),
        /*
         * AND THE END MOVES WITH THE START, or the run keeps its old finish line and quietly gets
         * shorter. `endsAt` is what "89 days remaining" counts down to and what the stall cron
         * reads, so leaving it behind would make a check-in that starts a week later end a week
         * sooner without saying so. Days come from the request when it carries one, else the
         * check-in's own length.
         */
        ...(dto.startsAt !== undefined && {
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.startsAt
            ? new Date(new Date(dto.startsAt).getTime() + (requestedDays ?? ground.timelineDays ?? 90) * 24 * 60 * 60 * 1000)
            : null,
        }),
        groundAuditLog: auditData,
      },
    });
  }

  /**
   * A NOTE BETWEEN SESSIONS. Private to the person, always.
   *
   * The ground reads like a channel now, and a channel invites you to type. Between
   * sessions there is no check-in to type into, and the honest answer is not a dead
   * input: it is "yes, into something that is not your account".
   *
   * See the ParticipantNote model for why this is not a RecordEntry. Short version:
   * RecordEntry is the record, the shared report reads it, and the other party's
   * context reads theirs - so an unexamined sentence would be compared against
   * somebody else's account. This is carried into the next session as something to
   * ASK about instead.
   */
  /**
   * AN ADMIN ACCEPTS A GROUND, AND ONLY THEN CAN ANYBODY BE ASKED TO TAKE PART.
   *
   * Idempotent on purpose: two admins opening the same list and both clicking accept
   * is a normal race, and the second one should not see an error for agreeing.
   */
  async approve(groundId: string, organizationId: string, adminUserId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true, status: true, label: true, initiatorId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.status !== GroundStatus.AWAITING_APPROVAL) {
      // Already accepted, or never needed accepting. Either way there is nothing to do.
      return { id: ground.id, status: ground.status, alreadyDecided: true };
    }

    const updated = await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: GroundStatus.OPEN, approvedById: adminUserId, approvedAt: new Date() },
      select: { id: true, status: true },
    });

    // The person who set it up is waiting on this, and nothing else would tell them.
    const creator = await this.prisma.user.findUnique({
      where: { id: ground.initiatorId },
      select: { email: true, firstName: true },
    });
    const url = `${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${ground.id}`;
    if (creator?.email) {
      await this.email
        .sendGroundApproved(creator.email, creator.firstName ?? 'there', ground.label, url)
        .catch((err: any) => this.logger.error(`Approval email failed for ground ${ground.id}: ${err.message}`));
    }
    return { ...updated, alreadyDecided: false };
  }

  /**
   * Declined. The ground is CLOSED rather than deleted: somebody wrote it, and a row
   * that vanishes is indistinguishable from a bug to the person who created it.
   */
  async declineGround(groundId: string, organizationId: string, adminUserId: string, reason?: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true, status: true, label: true, initiatorId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.status !== GroundStatus.AWAITING_APPROVAL) {
      return { id: ground.id, status: ground.status, alreadyDecided: true };
    }
    const updated = await this.prisma.ground.update({
      where: { id: groundId },
      data: {
        status: GroundStatus.CLOSED,
        closedAt: new Date(),
        approvedById: adminUserId,
        approvedAt: new Date(),
        declineReason: reason?.trim() || null,
      },
      select: { id: true, status: true },
    });
    const creator = await this.prisma.user.findUnique({
      where: { id: ground.initiatorId },
      select: { email: true, firstName: true },
    });
    if (creator?.email) {
      await this.email
        .sendGroundDeclined(creator.email, creator.firstName ?? 'there', ground.label, reason?.trim() || null)
        .catch((err: any) => this.logger.error(`Decline email failed for ground ${ground.id}: ${err.message}`));
    }
    return { ...updated, alreadyDecided: false };
  }

  /** What is waiting on an admin. Oldest first: the longest wait is the worst one. */
  async listAwaitingApproval(organizationId: string) {
    const rows = await this.prisma.ground.findMany({
      where: { organizationId, status: GroundStatus.AWAITING_APPROVAL },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, label: true, scenario: true, createdAt: true, timelineDays: true, cadence: true, cadenceStated: true, timelineStated: true,
        initiator: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return rows.map((g) => ({
      id: g.id,
      label: g.label,
      scenario: g.scenario,
      createdAt: g.createdAt,
      timelineDays: g.timelineDays,
      cadence: g.cadence,
      /* Whether a person chose these or the product suggested them, so the card can say which (B13, P6-002). */
      cadenceStated: g.cadenceStated,
      timelineStated: g.timelineStated,
      createdBy: [g.initiator.firstName, g.initiator.lastName].filter(Boolean).join(' ') || g.initiator.email,
    }));
  }

  async addMyNote(groundId: string, userId: string, text: string) {
    const trimmed = (text ?? '').trim();
    if (!trimmed) throw new BadRequestException('A note needs some words in it.');
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');
    const note = await this.prisma.participantNote.create({
      data: { groundId, participantId: participant.id, text: trimmed },
      select: { id: true, text: true, createdAt: true, carriedIntoCheckInId: true },
    });
    return note;
  }

  /** This person's own notes on this ground, oldest first. Nobody else can read them. */
  async getMyNotes(groundId: string, userId: string) {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');
    return this.prisma.participantNote.findMany({
      where: { participantId: participant.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, text: true, createdAt: true, carriedIntoCheckInId: true },
    });
  }

  /** Delete one of your own notes. A note is a scratch thought; you can take it back. */
  async deleteMyNote(groundId: string, userId: string, noteId: string) {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');
    // Scoped by participantId as well as id, so one person cannot delete another's
    // by guessing an id.
    const { count } = await this.prisma.participantNote.deleteMany({
      where: { id: noteId, participantId: participant.id },
    });
    if (count === 0) throw new NotFoundException('Note not found');
    return { deleted: true };
  }

  /**
   * A PERSON'S OWN READ ON THEIR OWN RECORD. Private, owner only, and it stays that way:
   * `what-a-leader-can-weigh.ts` refuses to hand specificity to a lead, because it measures how
   * somebody WRITES and reading that as how they WORK is the quiet unfairness this product exists
   * to prevent.
   *
   * It used to return one word - high, moderate, low - and the page printed it as "Overall quality
   * label: low". That is the same verdict, just pointed at the person it belongs to, and it gave
   * them nothing to do about it. A grade you cannot act on is a grade for somebody else's benefit.
   *
   * So it now returns the two things that are actually usable: which way it is going, and the one
   * concrete thing missing from their own recent answers. `whatWouldHelp` is derived from their own
   * entries by the same `runIntake` the engine uses, so it names what the engine itself was looking
   * for and did not find - a date, a number, a name - rather than scoring the prose.
   *
   * `label` stays on the response: `getMyRecord` returns it too and both renders read it.
   */
  /**
   * THE THREE OBJECTIVE WRITES ARE GONE: propose, state-my-own, accept.
   *
   * They implemented the old model - a lead proposes a target, the person accepts it or writes their
   * own - and the product does not work that way. An expectation is stated in the lead's own check-in,
   * extracted from what they actually said, published to Context where everyone reads it, and changed
   * only through the chat, where a change is probed and lands on the record with its reason.
   *
   * Her decision, in her words: "Participants should not be able to rewrite their targets or accept
   * it. One person is doing this, we dont want chaos. But they can see it."
   *
   * DELETED RATHER THAN LEFT UNREACHABLE. The routes went first; leaving the methods behind would
   * leave the old model sitting in the file for the next reader to wire back up, and would keep a
   * decision alive in code that the product has already made the other way.
   *
   * The two rules these carried that still matter - an expectation starts unseen, and changed words
   * are unseen words - moved with the write, into `extractExpectations`. Both are pinned by
   * `an-objective-nobody-has-seen.spec.ts`, which reads them there now.
   */

  /**
   * THIS PERSON HAS NOW SEEN THEIR OWN EXPECTATION. GW-EXP-2.
   *
   * SHOWN, NOT AGREED. `seenBySubject` is what stops anybody being read against words they have never
   * laid eyes on - the founding failure of this product, in one flag. It says they were shown it and
   * claims nothing about whether they accept it, because agreeing is not a thing this product asks
   * anybody to do by form.
   *
   * A DEDICATED CALL, NOT THE GROUND READ. My first version flipped the flag inside `get()`, which
   * runs from every tab - so it marked an expectation seen for somebody who opened Sessions and never
   * saw the words. A guard refused it, correctly. This is called by the view that actually renders
   * them.
   *
   * SCOPED TO THEIR OWN, and it takes no participant id from the client: the row is found from the
   * caller's own user link on this check-in, so nobody can mark somebody else's as seen.
   *
   * Idempotent. Being shown a second time is not a different fact.
   */
  async markMyExpectationShown(groundId: string, requestingUserId: string) {
    const me = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('You are not a participant in this check-in.');

    await this.prisma.personObjective.updateMany({
      where: { groundId, participantId: me.id, seenBySubject: false },
      data: { seenBySubject: true },
    });
    return { ok: true as const };
  }

  /**
   * SOMEBODY LOOKED AT THE TICKET. The one write that keeps a pointer honest.
   *
   * A REFERENCE expectation holds the address of the thing and the words somebody used for its
   * state. Without a way to say "I just looked", that state decays into the copy it was built not to
   * be: captured once and shown as current forever. So this re-stamps both together - what it says
   * and when that was true - and never one without the other.
   *
   * ANYONE WHO CAN SEE IT MAY DO IT, which is not how the rest of this page works and is right here.
   * Looking at a ticket is not ownership: the lead states the expectation, and whoever actually
   * opened Jira this morning is the person who knows what it says. Restricting it to the subject
   * would mean the page goes stale whenever they are the one not looking.
   *
   * The time comes from the server. The one trustworthy field in the row must not be the one
   * anybody can set.
   */
  async markExpectationLookedAt(
    groundId: string,
    requestingUserId: string,
    objectiveId: string,
    lastSeenState: string,
  ) {
    const state = (lastSeenState ?? '').trim();
    if (!state) throw new BadRequestException('Say what it says now.');

    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const me = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
      select: { id: true },
    });
    if (!me && ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('You are not a participant in this check-in');
    }

    const { count } = await this.prisma.personObjective.updateMany({
      where: { id: objectiveId, groundId },
      data: { lastSeenState: state, lastSeenAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Expectation not found');
    return { ok: true as const };
  }

  /**
   * WHAT YOU SAY YOU DELIVERED. The half of the record that did not exist.
   *
   * Everything on Context until now ran one way: the lead states what is expected, the person reads
   * it. A person could see the words they would be measured against and had nowhere at all to put
   * what they actually did, so their side of it only ever reached the record if they happened to say
   * it in a session - which favours whoever is quickest to speak, the exact bias this product was
   * built against.
   *
   * IT IS NOT THEIR ACCOUNT, and that is deliberate. It carries `carriedIntoCheckInId` for the same
   * reason a between-session note does: it reaches their next session as something to ASK ABOUT, and
   * what they say under questioning is what becomes the record. Letting a form become the record
   * would replace the interview with a box that rewards careful writing, which is a different and
   * much worse product.
   *
   * `objectiveId` is optional on purpose. Work nobody asked for is worth having on the page - it is
   * precisely the contribution a report built only from stated expectations cannot see.
   */
  async addDelivery(
    groundId: string,
    userId: string,
    dto: { text: string; evidence?: string | null; objectiveId?: string | null },
  ) {
    const text = (dto.text ?? '').trim();
    if (!text) throw new BadRequestException('Say what you did.');
    const me = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('You are not a participant in this check-in');

    // An expectation id is only accepted where it is one of THIS person's own on THIS check-in.
    // Otherwise a delivery could be filed against somebody else's target.
    let objectiveId: string | null = null;
    if (dto.objectiveId) {
      const own = await this.prisma.personObjective.findFirst({
        where: { id: dto.objectiveId, groundId, participantId: me.id },
        select: { id: true },
      });
      if (!own) throw new BadRequestException('That is not one of your expectations on this check-in.');
      objectiveId = own.id;
    }

    return this.prisma.delivery.create({
      data: { groundId, participantId: me.id, objectiveId, text, evidence: (dto.evidence ?? '').trim() || null },
      select: { id: true, text: true, evidence: true, objectiveId: true, createdAt: true, carriedIntoCheckInId: true },
    });
  }

  /** This person's own deliveries on this check-in, newest first. */
  async getMyDeliveries(groundId: string, userId: string) {
    const me = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('You are not a participant in this check-in');
    return this.prisma.delivery.findMany({
      where: { groundId, participantId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, text: true, evidence: true, objectiveId: true, createdAt: true, carriedIntoCheckInId: true },
    });
  }

  async deleteMyDelivery(groundId: string, userId: string, deliveryId: string) {
    const me = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('You are not a participant in this check-in');
    const { count } = await this.prisma.delivery.deleteMany({
      where: { id: deliveryId, participantId: me.id, carriedIntoCheckInId: null },
    });
    // Once a session has picked it up it is part of what was asked about, and taking it back
    // afterwards would edit the run-up to a conversation that already happened.
    if (count === 0) throw new NotFoundException('Not found, or it has already been raised in a session.');
    return { deleted: true };
  }

  async baselineEntryCandidates(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(asker, ground);
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('Recording where this stood at the start belongs to whoever runs this check-in.');
    }

    const lead = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: ground.initiatorId },
      select: { id: true },
    });
    const recorded = await this.prisma.groundBaselineEntry.findMany({
      where: { groundId },
      select: { text: true, capturedAtSession: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!lead) return { candidates: [], alreadyRecorded: recorded };

    const rows = await this.prisma.recordEntry.findMany({
      where: { participantId: lead.id, checkIn: { sessionNumber: 1 } },
      select: { text: true, type: true },
      orderBy: { createdAt: 'asc' },
    });

    /**
     * `cleanText` strips the engine's own markers - `[INFERRED: ...]`, `[VERIFIABILITY: ...]` - which
     * are how it annotates its own reading rather than part of what the person said. Handing a lead a
     * candidate with a machine tag in it invites them to record the tag.
     */
    const already = new Set(recorded.map(r => r.text));
    const candidates = rows
      .map(r => ({ text: cleanText(r.text), type: String(r.type) }))
      .filter(r => r.text.trim().length > 20 && !already.has(r.text));

    return { candidates, alreadyRecorded: recorded };
  }

  /**
   * Write what the lead confirmed. Append only: no id to update, no delete.
   *
   * `capturedAtSession` is the session the ground has actually reached, not always 1 - a correction
   * recorded in session four is a fact about session four, and the distance between the two rows is
   * the finding.
   */
  async recordBaselineEntries(groundId: string, requestingUserId: string, texts: string[]) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(asker, ground);
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('Recording where this stood at the start belongs to whoever runs this check-in.');
    }
    const clean = (texts ?? []).map(t => t?.trim()).filter((t): t is string => !!t && t.length > 3);
    if (!clean.length) throw new BadRequestException('Nothing to record.');

    const latest = await this.prisma.checkIn.aggregate({
      where: { groundId, status: 'COMPLETED' },
      _max: { sessionNumber: true },
    });
    const capturedAtSession = Math.max(1, latest._max.sessionNumber ?? 1);

    await this.prisma.groundBaselineEntry.createMany({
      data: clean.map(text => ({ groundId, text, capturedAtSession })),
    });
    return this.prisma.groundBaselineEntry.findMany({
      where: { groundId },
      select: { text: true, capturedAtSession: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Readable by everybody on the ground. What the record says was true at the start is not a private
   * note about anybody - it is the thing every later session is measured against.
   */
  async baselineEntries(groundId: string, requestingUserId: string) {
    const link = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId: requestingUserId } });
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(asker, ground);
    if (!link && ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('You are not a participant in this check-in');
    }
    const [entries, done] = await Promise.all([
      this.prisma.groundBaselineEntry.findMany({
        where: { groundId },
        select: { text: true, capturedAtSession: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.checkIn.aggregate({ where: { groundId, status: 'COMPLETED' }, _max: { sessionNumber: true } }),
    ]);
    const completedSessions = done._max.sessionNumber ?? 0;
    return {
      entries,
      completedSessions,
      /**
       * The module's own gate, finally called. A ground with one session has a POSITION, not a
       * movement, and showing "what has changed" off a single session would be inventing an arc.
       */
      canShowMovement: canShowMovement(
        entries[0] ? { text: entries[0].text, capturedAtSession: entries[0].capturedAtSession } : null,
        completedSessions,
      ),
      frozenReason: BASELINE_IS_FROZEN,
    };
  }


  /**
   * WHAT DOING WELL LOOKS LIKE, AND WHAT HAS TO BE TRUE FOR IT. `GroundBaseline`, at last.
   *
   * The table has existed with `successLooksLike` and `conditions` and no code reading or writing
   * either. Which is why `GroundAdminPage` passed `hasBaseline: false` and `conditionCount: 0` as
   * literals into the context read - two hardcoded falses that were an honest report of a table
   * nothing used, and made two of that read's lines fire on every ground regardless of truth.
   *
   * It is the missing home for two things already in use. The report's weigh section asks "what did
   * you say doing well means, and what does the record hold against it" and scrapes the answer out of
   * the lead's check-in prose. The setup chat's `success` gap writes to `brief`, which is what the
   * ground is ABOUT rather than what good would look like in it. Neither is a yardstick you can point
   * at afterwards and say: that is what we agreed on day one.
   *
   * VERSIONED, NEVER EDITED, and the schema's own note says why: "half the findings this product makes
   * are the distance between what people believed at the start and what turned out to be true.
   * Corrected, a baseline becomes a second description of the present and the arc disappears."
   *
   * So a change is a new version with its own date, and the reason if they gave one. Version 1 is what
   * the ground started from, and nothing can overwrite it.
   *
   * THE CONDITIONS ARE THE FAIRNESS HALF. They are the things that have to be true and are not in the
   * person's hands: a decision from somebody else, a tool, another team's work. Named at the start, a
   * missed outcome can be read against them. Unnamed, it reads as somebody underperforming, which is
   * the exact unfairness this product exists to prevent.
   */
  async stateBaseline(
    groundId: string,
    requestingUserId: string,
    dto: { successLooksLike?: string; conditions?: string[]; changeReason?: string },
  ) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { id: true, initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    /**
     * The lead's, or an admin in the same organisation. What doing well looks like is the lead's to
     * state - a party stating it would be the person being read setting their own yardstick, which is
     * the one thing the report exists to compare against something else.
     */
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(asker, ground);
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('Stating what doing well looks like belongs to whoever runs this check-in.');
    }

    const success = dto.successLooksLike?.trim() || null;
    const conditions = (dto.conditions ?? []).map(c => c?.trim()).filter((c): c is string => !!c);
    if (!success && !conditions.length) throw new BadRequestException('Nothing to record.');

    const latest = await this.prisma.groundBaseline.findFirst({
      where: { groundId },
      orderBy: { version: 'desc' },
    });

    /**
     * A restatement needs a reason once one exists. Not to police anybody: the reason is the thing
     * that makes the change legible later, and without it the record shows a yardstick that moved with
     * no account of why - which reads worse than either version does on its own.
     */
    if (latest && !dto.changeReason?.trim()) {
      throw new BadRequestException('Say why this is changing. The first version stays on the record either way.');
    }

    /** Carried forward rather than dropped: restating one half must not silently erase the other. */
    const carried = Array.isArray(latest?.conditions) ? (latest!.conditions as string[]) : [];

    return this.prisma.groundBaseline.create({
      data: {
        groundId,
        version: (latest?.version ?? 0) + 1,
        successLooksLike: success ?? latest?.successLooksLike ?? null,
        conditions: conditions.length ? conditions : carried,
        changeReason: dto.changeReason?.trim() || null,
      },
      select: { id: true, version: true, successLooksLike: true, conditions: true, changeReason: true, effectiveFrom: true },
    });
  }

  /**
   * Every version, oldest first, so the page can show the arc rather than only the latest.
   *
   * Readable by anybody on the ground, not only the lead. The yardstick a person is being read against
   * is the last thing that should be private from them - and if it changed mid-ground, the change is
   * the part they most need to see.
   */
  async baselineHistory(groundId: string, requestingUserId: string) {
    const link = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId: requestingUserId } });
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg(asker, ground);
    if (!link && ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('You are not a participant in this check-in');
    }
    const rows = await this.prisma.groundBaseline.findMany({
      where: { groundId },
      orderBy: { version: 'asc' },
      select: { version: true, successLooksLike: true, conditions: true, changeReason: true, effectiveFrom: true },
    });
    return rows.map(r => ({
      ...r,
      conditions: Array.isArray(r.conditions) ? (r.conditions as string[]) : [],
    }));
  }

  async getMySpecificity(groundId: string, userId: string): Promise<{
    scores: number[];
    label: string;
    trend: 'rising' | 'steady' | 'falling' | 'new';
    whatWouldHelp: string | null;
    /**
     * WHICH OF THE FIVE WOULD MOVE THEM MOST, as a key rather than only as prose.
     *
     * "with the one that would move you most marked" - marked in the list, which needs the list to
     * know which one. The prose has always known: the three branches below are a number, a date and
     * vague language, and the first two are the same dimension. The client was left to guess from a
     * sentence, so it printed the sentence underneath and marked nothing.
     */
    mostUseful: { dimension: string; says: string } | null;
    strongest: string | null;
  }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true, specificityHistory: true },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');
    const raw: number[] = (participant.specificityHistory as number[]) ?? [];
    const scores = raw.filter(n => typeof n === 'number' && isFinite(n));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const label = avg >= 0.65 ? 'high' : avg >= 0.35 ? 'moderate' : 'low';

    /**
     * Under three sessions there is no trend, only noise, and telling somebody their record is
     * "falling" off two numbers is a verdict dressed as an observation.
     */
    let trend: 'rising' | 'steady' | 'falling' | 'new' = 'new';
    if (scores.length >= 3) {
      const half = Math.floor(scores.length / 2);
      const early = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const late = scores.slice(-half).reduce((a, b) => a + b, 0) / half;
      trend = late - early > 0.08 ? 'rising' : early - late > 0.08 ? 'falling' : 'steady';
    }

    /**
     * The teaching half. Their own last few answers, read for the things the engine could not
     * find in them, and their own best answer quoted back as what the checkable version looked
     * like. Showing beats grading: it is the move the engine already makes in conversation.
     */
    const entries = await this.prisma.recordEntry.findMany({
      where: { participantId: participant.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { text: true },
    });
    let whatWouldHelp: string | null = null;
    let mostUseful: { dimension: string; says: string } | null = null;
    let strongest: string | null = null;
    if (entries.length) {
      const read = entries.map(e => ({ text: e.text, ...runIntake(e.text) }));
      const undated = read.filter(r => !/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|last week|this week|yesterday|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/i.test(r.text)).length;
      const unnumbered = read.filter(r => !/\d/.test(r.text)).length;
      const vague = read.filter(r => r.vagueLanguage.length > 0).length;
      /*
       * PLAIN, AND SHORT. These were three sentences each, written from the engine's side: "one
       * figure makes an account checkable that otherwise rests on memory". Read back on the screen
       * that shows them: "you speak english like a robot". They are the one line somebody is meant
       * to act on, so they say the thing and stop.
       */
      /* Her wording, and the dimension it belongs to, so the row can carry the mark. */
      if (unnumbered > entries.length / 2) {
        whatWouldHelp = 'Most of your answers have no number in them. How many? How long? How often? One number changes a lot.';
        mostUseful = { dimension: 'evidence', says: 'a number. How many, how long, how often - one figure carries a lot.' };
      } else if (undated > entries.length / 2) {
        whatWouldHelp = 'Most of your answers do not say when. A date, a week, even "before the handover" is enough.';
        mostUseful = { dimension: 'evidence', says: 'a date. A week, a day, even "before the handover" is enough.' };
      } else if (vague > entries.length / 3) {
        whatWouldHelp = `Some answers lean on words like "${read.find(r => r.vagueLanguage.length)?.vagueLanguage[0]}". Saying what actually happened lands harder.`;
        mostUseful = { dimension: 'delivery', says: 'saying what actually happened, rather than describing it.' };
      }
      const best = read.filter(r => r.specificity >= 0.5).sort((a, b) => b.specificity - a.specificity)[0];
      if (best) strongest = best.text.slice(0, 220);
    }

    return { scores, label, trend, whatWouldHelp, mostUseful, strongest };
  }

  async getMyCheckinStatus(groundId: string, userId: string) {
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');

    const checkIns = await this.prisma.checkIn.findMany({
      where: { participantId: participant.id },
      orderBy: { sessionNumber: 'asc' },
      select: { id: true, sessionNumber: true, status: true, completedAt: true },
    });

    const latest = checkIns[checkIns.length - 1];
    return {
      participantId: participant.id,
      partyType: participant.partyType,
      checkIns,
      latestStatus: latest?.status ?? null,
      latestSessionNumber: latest?.sessionNumber ?? null,
    };
  }


  /**
   * Pause a ground - marks status = PAUSED, stamps pausedAt. Typically called
   * when active legal proceedings are detected in a check-in (GW-08 / context.service.ts)
   * and the admin or user confirms they want to pause. Billing continues to run
   * (the ground is not RESOLVED or CLOSED); an admin un-pauses with `resumeGround`.
   *
   * Only OPEN, AWAITING_PARTIES, ACTIVE, or REPORT_READY grounds can be paused;
   * terminal grounds (RESOLVED, STALLED, CLOSED) are immutable.
   *
   * THE HOLD REMEMBERS WHERE IT CAME FROM. This docstring promised "transitioning back to the prior
   * status" for as long as nothing recorded the prior status, so nothing could. `pausedFromStatus`
   * is written here and read by `resumeGround`, which is the only way out of PAUSED.
   */
  async pauseGround(groundId: string, adminUserId: string, reason: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Check-in not found');

    const PAUSABLE_STATUSES: GroundStatus[] = [
      GroundStatus.OPEN,
      GroundStatus.AWAITING_PARTIES,
      GroundStatus.REPORT_READY,
      GroundStatus.ACTIVE,
    ];
    if (!PAUSABLE_STATUSES.includes(ground.status)) {
      throw new BadRequestException(`Check-in in status "${ground.status}" cannot be paused`);
    }

    // Verify the requesting user belongs to this ground's org or is the initiator.
    const initiatorOrAdmin = await this.prisma.user.findFirst({
      where: { id: adminUserId, organizationId: ground.organizationId },
    });
    if (!initiatorOrAdmin) throw new ForbiddenException('Only an org member may pause a check-in');

    await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: GroundStatus.PAUSED, pausedAt: new Date(), pausedFromStatus: ground.status },
    });

    this.logger.warn(`Ground ${groundId} paused by user ${adminUserId} from ${ground.status}. Reason: ${reason}`);
  }

  /**
   * Lift a hold. Refuses anything that is not PAUSED, takes the same org-membership check as
   * `pauseGround`, and puts the ground back on the status it was paused from. A ground paused before
   * `pausedFromStatus` existed has no recorded prior status; those go back to ACTIVE, and the log
   * says so, because a guess is worth naming.
   */
  async resumeGround(groundId: string, adminUserId: string, reason: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (!isHeld(ground.status)) {
      throw new BadRequestException(`Check-in in status "${ground.status}" is not on hold`);
    }

    const member = await this.prisma.user.findFirst({
      where: { id: adminUserId, organizationId: ground.organizationId },
    });
    if (!member) throw new ForbiddenException('Only an org member may resume a check-in');

    const backTo = ground.pausedFromStatus ?? GroundStatus.ACTIVE;
    if (!ground.pausedFromStatus) {
      this.logger.warn(`Ground ${groundId} was paused before its prior status was recorded; resuming to ACTIVE by default.`);
    }

    await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: backTo, pausedAt: null, pausedFromStatus: null },
    });

    this.logger.warn(`Ground ${groundId} resumed to ${backTo} by user ${adminUserId}. Reason: ${reason}`);
  }

  /**
   * Returns true once every ACTIVE party has completed the given session number.
   *
   * "Active" = anybody who accepted their invite, anybody who has already
   * completed this session, and anybody whose invitation is still live. Only a
   * lapsed invitation drops somebody out of the count, so a no-show cannot hold
   * the round open forever and a person still on their way cannot be skipped.
   *
   * Works for two-party and multi-party grounds, and the difference between the
   * two is where this went wrong before - see the comment on the query.
   */
  async isSessionReadyForReport(groundId: string, sessionNumber: number): Promise<boolean> {
    // A participant is "active" if they accepted the invite (userId set) OR if
    // they already completed a check-in for this session (participant-chat flow
    // can complete a session before the user registers a full account).
    //
    // managingOnly is excluded here on purpose: a lead who chose "managing
    // only" at confirm-lead has userId set (they ARE the initiator's own
    // user) but was deliberately never given a session-1 check-in - see
    // confirmLead. Without this exclusion they would match the `userId not
    // null` clause, count toward the >=2 requirement, then fail the
    // completed-check-in loop below forever (they have no check-in to
    // complete), so the ground would wait for a report that can never
    // release. A managing-only lead is not a party to the comparison.
    /**
     * SOMEBODY WHOSE INVITATION IS STILL OPEN HAS NOT DECLINED. THEY ARE ON
     * THEIR WAY, AND THE ROUND IS NOT OVER.
     *
     * The clause that used to be here counted only people who had ACCEPTED, so
     * anybody still holding an unopened invitation was invisible to the count.
     * On a two-party ground that never shows: there is no third person hovering
     * between invited and accepted for long enough to matter.
     *
     * On ground 2 of the eighteen it showed immediately, and badly. Six people
     * were invited. Three accepted and checked in within the hour. The other
     * three had not opened their email yet, so the round was declared complete at
     * three of six: the shared record released, the ground went ACTIVE, and Eric
     * - who had not written a word - received
     *
     *     "Your shared record is ready: Atlas build, scope and ownership"
     *
     * about work he is part of, built entirely from other people's accounts of
     * it. Session 1 had passed him by. That is the exact failure this product
     * exists to prevent, arriving by email with the product's name on it.
     *
     * So the round now waits on anybody with a LIVE invitation as well. It still
     * does not wait forever, and that was the real point of the original clause:
     * once an invitation has expired, that person drops out of the count and the
     * others are not held hostage. The ground waits exactly as long as the
     * invitation is good for and not a day longer.
     */
    /* EVERYONE DOES A FIRST CHECK-IN. A managing-only lead gives session 1 like everybody else and is
       a party to that round; from session 2 they have no check-in and are not waited on. */
    const active = await this.prisma.groundParticipant.findMany({
      where: {
        groundId,
        ...(sessionNumber > 1 ? { managingOnly: false } : {}),
        OR: [
          { userId: { not: null } },
          { checkIns: { some: { sessionNumber, status: CheckInStatus.COMPLETED } } },
          // Invited, not yet accepted, and the invitation has not run out.
          {
            userId: null,
            invitedAt: { not: null },
            inviteTokenExpiresAt: { gt: new Date() },
          },
        ],
      },
      select: { id: true },
    });
    if (active.length < 2) return false;

    /* Everybody has ANSWERED - and a decline is an answer (an-answer-includes-a-refusal.ts). Counting
       only COMPLETED here froze every round with one refusal in it, for that session and every one after. */
    let completed = 0;
    for (const p of active) {
      const ci = await this.prisma.checkIn.findFirst({
        where: { participantId: p.id, sessionNumber, status: { in: AN_ANSWER } },
        select: { status: true },
      });
      if (!ci) return false;
      if (ci.status === CheckInStatus.COMPLETED) completed += 1;
    }
    /* A round of refusals has answered and has nothing to report: no shared report from zero accounts. */
    return completed >= AT_LEAST_ONE_ACCOUNT;
  }

  /**
   * Progress for the round currently in play, using the same "active" party
   * definition as isSessionReadyForReport (accepted invite OR already
   * completed this session). Lets the client show "N of M checked in" before
   * the report exists, instead of showing nothing until the round is full.
   */
  async getSessionProgress(groundId: string): Promise<{
    sessionNumber: number;
    total: number;
    completed: number;
    missingParticipantIds: string[];
    /**
     * WHO SAID NO. Her decision: "Round completes, report names the decline."
     *
     * A DECLINE IS AN ANSWER, and until now this function was the reason nobody could give it. The
     * `/check-ins/:id/decline` endpoint has existed and worked - it sets the row to DECLINED - but a
     * declined party still had a `userId`, so they stayed in `missingParticipantIds` forever. The
     * round could never complete, the report never left "forming", and the waiting-on row named them
     * for good. Wiring a decline button without this would have created permanently stuck check-ins,
     * which is worse than having no button.
     *
     * They come OUT of `missing` and are reported separately rather than being quietly folded into
     * `completed`. Counting a refusal as an account given would make the report claim four accounts
     * when it holds three, and the report's whole standing rests on not doing that.
     */
    declinedParticipantIds: string[];
  } | null> {
    /**
     * THE ROUND THIS IS ABOUT IS THE ONE PEOPLE HAVE ANSWERED, NOT THE NEWEST ONE OPENED.
     *
     * This used to take the highest sessionNumber any check-in ROW existed for. The moment session 1
     * completes, session 2 rows are created NOT_STARTED - so the count immediately jumped to session 2
     * and reported "0 of 3 checked in" while the report on the same screen was built from three
     * finished session-1 accounts. A leader reading a full report under "0 of 3 checked in" cannot
     * tell which half to believe, and it is the most important page in the product.
     *
     * So: the current round is the highest session that anybody has actually COMPLETED. Only when
     * nothing is complete anywhere does it fall back to the newest open round, which is correct for a
     * ground that has genuinely just started.
     */
    const lastAnswered = await this.prisma.checkIn.aggregate({
      where: { participant: { groundId }, status: CheckInStatus.COMPLETED },
      _max: { sessionNumber: true },
    });
    const newestOpen = await this.prisma.checkIn.aggregate({
      where: { participant: { groundId } },
      _max: { sessionNumber: true },
    });
    const sessionNumber = lastAnswered._max.sessionNumber ?? newestOpen._max.sessionNumber ?? 1;

    const active = await this.prisma.groundParticipant.findMany({
      where: {
        groundId,
        /**
         * A managing-only lead is not counted. They give no account by design, so including them made
         * the denominator a number that could never be reached - "2 of 3" forever on a ground where
         * everybody who was ever going to answer already had.
         */
        managingOnly: false,
        OR: [
          { userId: { not: null } },
          { checkIns: { some: { sessionNumber, status: CheckInStatus.COMPLETED } } },
          /**
           * AND THE PEOPLE HOLDING AN UNOPENED INVITATION, which the release rule counts and this
           * did not - though the comment on this method claims they use "the same active party
           * definition".
           *
           * Seen on one screen: the header said "1 of 2 checked in for session 1" and the release
           * box, three inches below, said "1 of 1 have checked in for this session". Both from
           * this ground, neither wrong on its own terms. And the one saying 1 of 1 is the more
           * misleading of the two, because the round does NOT release at 1 of 1 - somebody with an
           * open invitation holds it, by the rule right above this method.
           *
           * The clause is copied from `isSessionReadyForReport` exactly, so the counter now counts
           * the set whose completion actually releases the report.
           */
          {
            userId: null,
            invitedAt: { not: null },
            inviteTokenExpiresAt: { gt: new Date() },
          },
        ],
      },
      select: { id: true },
    });
    if (active.length === 0) return null;

    const answered = await this.prisma.checkIn.findMany({
      where: {
        participantId: { in: active.map((p) => p.id) },
        sessionNumber,
        status: { in: AN_ANSWER },
      },
      select: { participantId: true, status: true },
    });
    const completedIds = new Set(
      answered.filter((c) => c.status === CheckInStatus.COMPLETED).map((c) => c.participantId),
    );
    const declinedIds = new Set(
      answered.filter((c) => c.status === CheckInStatus.DECLINED).map((c) => c.participantId),
    );

    return {
      sessionNumber,
      total: active.length,
      /** Accounts actually given. A decline is not one, and must never be counted as one. */
      completed: completedIds.size,
      /**
       * Nobody is "missing" once they have answered, and saying no IS answering. This is the single
       * line that lets a round with a decline in it ever finish.
       */
      missingParticipantIds: active
        .filter((p) => !completedIds.has(p.id) && !declinedIds.has(p.id))
        .map((p) => p.id),
      declinedParticipantIds: active.filter((p) => declinedIds.has(p.id)).map((p) => p.id),
    };
  }

  /**
   * Return the authenticated contributor's private longitudinal record for a ground.
   * Specificity trend and pattern observations are gated behind billing - they
   * require careFeeStatus === ACTIVE. Without billing, only session history is returned.
   */
  async getMyRecord(groundId: string, userId: string): Promise<{
    sessions: { sessionNumber: number; completedAt: Date | null; status: string }[];
    specificity: { scores: number[]; avg: number; label: string } | null;
    confidence: { score: number; label: string; description: string } | null;
    patterns: { observation: string; sessionNumber: number | null }[] | null;
    insightsLocked: boolean;
  }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: {
        id: true,
        specificityHistory: true,
        patternDetections: {
          where: { status: 'SURFACED' },
          select: { observationText: true, lastPeriodNumber: true, code: true },
          orderBy: { lastSeenAt: 'desc' },
        },
        checkIns: {
          select: { sessionNumber: true, completedAt: true, status: true },
          orderBy: { sessionNumber: 'asc' },
        },
      },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');

    const sessions = (participant.checkIns ?? []).map(ci => ({
      sessionNumber: ci.sessionNumber,
      completedAt: ci.completedAt,
      status: ci.status,
    }));

    // Insights unlock once the participant has at least one completed session.
    // First session per ground is always free, so no separate billing gate needed.
    const hasCompleted = sessions.some(s => s.status === 'COMPLETED');
    if (!hasCompleted) {
      return { sessions, specificity: null, confidence: null, patterns: null, insightsLocked: true };
    }

    // Specificity trend
    const raw: number[] = (participant.specificityHistory as number[]) ?? [];
    const scores = raw.filter(n => typeof n === 'number' && isFinite(n));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const specLabel = avg >= 0.65 ? 'high' : avg >= 0.35 ? 'moderate' : 'low';

    // Confidence score - how many completed sessions cross-referenced against specificity
    const completedCount = sessions.filter(s => s.status === 'COMPLETED').length;
    const confScore = Math.min(5, completedCount + (avg >= 0.5 ? 1 : 0));
    const confLabel = confScore >= 4 ? 'High' : confScore >= 2 ? 'Building' : 'Early';
    const confDesc = confScore >= 4
      ? 'Multiple sessions cross-referenced. Your record carries strong evidential weight.'
      : confScore >= 2
        ? 'Your record is taking shape. Each session adds depth and specificity to the picture.'
        : 'Your record is just beginning. One more session will start to show the full picture.';

    /*
     * Diplomatic pattern observations - never name the code, never frame as a verdict.
     *
     * This held its own `new Set(['R3'])`, shadowing the imported POSITIVE_CODES, so it was a
     * second answer to "which codes are good news" that could not follow the first. It did not
     * matter while R3 was the only one; the moment seven more arrived it would have run every one
     * of them through the softening meant for bad news, which is how a compliment ends up
     * phrased as a concern.
     */
    const patterns = (participant.patternDetections ?? []).map(d => ({
      /* Carrying is not bad news about them either, so it is not softened as though it were. */
      observation: isPositiveCode(d.code) || isCarryingCode(d.code)
        ? d.observationText ?? ''
        : diplomaticObservation(d.observationText ?? ''),
      sessionNumber: d.lastPeriodNumber,
    })).filter(p => p.observation.length > 0);

    return {
      sessions,
      specificity: { scores, avg, label: specLabel },
      confidence: { score: confScore, label: confLabel, description: confDesc },
      patterns,
      insightsLocked: false,
    };
  }

  async getMySoloReport(groundId: string, userId: string): Promise<{ report: unknown | null; shared: boolean }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { soloArtifact: true, soloArtifactShared: true },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');
    const report = participant.soloArtifact
      ? (() => { try { return JSON.parse(participant.soloArtifact); } catch { return null; } })()
      : null;
    return { report, shared: participant.soloArtifactShared };
  }

  /**
   * THE LEAD'S OWN SCHEDULE FOR CHASING THEIR PEOPLE.
   *
   * Initiator only, because the person who is being chased must not be the person
   * who decides whether the chasing happens — that is the setting turning itself
   * off. Days are whole days since the check-in opened; an empty list and
   * `stopped: true` are the same instruction said two ways and both are honoured.
   */
  async setChasing(
    groundId: string,
    userId: string,
    dto: { days?: number[]; stopped?: boolean; tellTheLead?: boolean },
  ): Promise<{ days: number[]; stopped: boolean; tellTheLead: boolean }> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, chaseAfterDays: true, chasingStopped: true, tellTheLead: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (ground.initiatorId !== userId) {
      throw new ForbiddenException('Only whoever set this check-in up can change how it reminds people.');
    }

    let days = ground.chaseAfterDays;
    if (dto.days !== undefined) {
      /* Whole days, in order, each one only once. A schedule with 3 twice in it
         nudges twice on day three, and the 24-hour throttle would be the only
         thing standing between somebody and two identical emails. */
      if (dto.days.some((d) => !Number.isInteger(d) || d < 1 || d > 365)) {
        throw new BadRequestException('Reminder days are whole days between 1 and 365.');
      }
      days = [...new Set(dto.days)].sort((a, b) => a - b);
    }

    const updated = await this.prisma.ground.update({
      where: { id: groundId },
      data: {
        chaseAfterDays: days,
        chasingStopped: dto.stopped ?? ground.chasingStopped,
        tellTheLead: dto.tellTheLead ?? ground.tellTheLead,
      },
      select: { chaseAfterDays: true, chasingStopped: true, tellTheLead: true },
    });

    return {
      days: updated.chaseAfterDays,
      stopped: updated.chasingStopped,
      tellTheLead: updated.tellTheLead,
    };
  }

  async setMySoloReportShared(groundId: string, userId: string, shared: boolean): Promise<{ shared: boolean }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');
    await this.prisma.groundParticipant.update({
      where: { id: participant.id },
      data: { soloArtifactShared: shared },
    });
    return { shared };
  }

  /**
   * Explicit "my account is accurate, I'm done" confirmation - the deadline
   * for corrections, in place of an arbitrary timer. Signing off does NOT
   * block startSelfCorrectionSession() afterward; a signed-off participant
   * may still genuinely need to fix something. What changes is that any
   * self-correction session started after this point gets CheckIn.isPostSignOff
   * stamped, so the shared report surfaces it as a flagged update rather than
   * silently blending it in as if it had always been there. No undo in v1.
   */
}

/**
 * Rewrites a raw pattern observation into a diplomatic first-person reflection.
 * The original observation describes a behaviour; this wraps it so the contributor
 * reads it as something worth noticing in their own record - not a verdict.
 */
function diplomaticObservation(raw: string): string {
  if (!raw.trim()) return '';
  // Strip any period tags from the three-period rule bookkeeping
  const cleaned = raw.replace(/^\[period=\d+\]\s*/i, '').trim();
  return `Your record across sessions shows something worth noticing: ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)} It is worth being aware of as the record builds.`;
}
