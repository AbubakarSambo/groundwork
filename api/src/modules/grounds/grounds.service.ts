import { fullNameToCall } from '../engagement/a-name-to-call-them';
import { theAddressAndNameIn, theDomainOf } from '../../common/an-email-domain';
import { theInvitedRowAsServed } from './the-invited-row-as-served';
import { withoutTheLeadsSetUpForAMember } from './the-leads-set-up-is-the-leads-in-the-anchor';
import { aShortQuestionForAPerson, askedBackToTheLead, theQuestionTheyWereShown } from './a-short-question-for-a-person-in-the-old-chat';
import { aFindingThatReadsRight } from './a-finding-reads-right';
import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';
import { refuseSomeoneAwaitingTheOrganisation, refuseSomeoneHeldForASeat, theCheckInsHeldForASeat, theHeldPersonWhoHasAnswered, whatSomeoneHeldForASeatReads } from '../participants/held-for-a-seat';
import { CANNOT_CHECK_IN_YET } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';
import { theRoomForThisReader } from '../board/the-room-for-this-reader';
import { goalsThisReaderMaySee, notToldYet, withoutGoalsNotToldIn, theConversationPointForTheLead, aWeekHasPassedSinceNotTold, whatThePersonReadsAfterAWeek } from './a-goal-not-told-stays-with-the-lead';
import { areaOfGoalOrFallback } from './the-area-of-a-goal-is-worded-once';
import { namesNotEverybodyMayOpen, withoutPrivateFileNames } from '../documents/a-private-file-is-not-named';
import { thePrivateSummaryAsRead } from '../conversation/the-private-summary-opens-with-a-sentence';
import { hashed } from '../auth/a-token-is-stored-as-its-hash';
import { theirHome } from '../participants/where-somebody-is-from';
import { aGuestHereIfTheyAreFromElsewhere } from '../participants/a-guest-is-a-guest-from-the-moment-they-are-added';
import { theColleaguePickedById, NOT_SOMEONE_HERE, theMemberWithThisAddress, withTheirNamesFromTheOrganisation } from '../../common/colleagues';
import { PATTERNS_ARE_SERVED } from '../patterns/patterns-are-served';
import { servedPatterns, PATTERN_ROW_SELECT, whoIsWhoIn, theOnesTheyAreSeeingFirst, markShownToThePerson, runsItForAPattern, type APatternReader, type AServedPattern } from '../patterns/who-reads-a-pattern';
import { askTheReportsDoor } from '../reports/one-persons-circumstances-stay-their-own';
import { whatThisReaderCallsEachLabel, noStandInLabelAnywhereIn } from '../reports/a-stand-in-label-never-reaches-a-reader';
import { rememberedCompose } from '../reports/a-line-worded-once-is-kept';
import { wordPatternEvidence } from '../reports/pattern-evidence-in-plain-words';
import { withoutBankDetails, withoutBankDetailsInEachTurn } from '../documents/bank-details-are-never-kept';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD, hasEnded, hasStalled, isHeld, isShut, mayChangeOnItsOwn, whyItRefuses, whyAJoinLinkRefuses, WHILE_IT_IS_HELD, IT_RAN_OUT_OF_TIME } from './a-ground-that-has-ended';
import { AN_ANSWER, AT_LEAST_ONE_ACCOUNT, wasAQuietClose } from './an-answer-includes-a-refusal';
import { isNotLetInYet, whoIsNotLetInYet, theWaitingToBeLetInLine } from './who-an-admin-did-not-let-in';
import { whoASessionCounts } from './the-lead-checks-in-when-they-choose';
import { openTheLeadsCheckIn } from './check-in-yourself';
import { waitsOnAManagingOnlyLead } from './the-lead-who-only-asks';
import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, Optional, GoneException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { seatsIn } from '../../common/seats';
import { whetherThereIsRoomForOneMore, type SeatAnswer } from './added-but-waiting-for-a-seat';
import { whatTheDocumentsSay, stillNeedsSomethingInWriting } from './what-the-documents-say';
import { whatFitsInTheRoom, tellThemWhatIsMissing } from '../conversation/a-prompt-that-ran-out-of-room-says-so';
import { daysRemaining, deadlineOf, clockStartsAt } from './when-the-clock-starts';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { aKindMayBeGiven, theBoardKindsOffered, theOldContextChatIsOpen } from '../admin/what-is-hidden-at-release';
import { askNameOf } from '../assistant/ask-name';
import { KINDS_OF_WORK, THE_KIND_OF_WORK_PROMPT, THE_KIND_OF_WORK_SCHEMA, oneOfTheKinds, theSetupWords } from '../board/the-kind-of-work';
import { PrismaService } from '../prisma/prisma.service';
import { theNextDayTheyWork, workingDaysOf } from './which-days-this-team-works';
import { targetsFor } from '../board/whose-number-is-whose-business';
import { withoutWhatTheLeadHasNotToldThemAbout, theWordsOfWhatTheLeadHasNotToldThemAbout, theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { namesOnTheRoster, targetsHiddenFrom, withoutHiddenTargetsIn } from '../board/a-hidden-target-stays-hidden';
import { contextGaps, contextChatPrompt, openingLine, withoutTheOpeningGreeting } from './the-context-chat';
import { LeaveBoardService } from '../suites/the-leave-board.service';
import { leaveOfThePeopleOn, theAwayLinesFor, awayUntilAsServed, isFromOutside, whoOnACheckInIsAway } from '../suites/who-is-away';
import { LEAVE_NOTHING_WAITING, readLeaveDates, sayBackLeave, sendLeave, soundsLikeLeave } from '../suites/leave-said-in-chat';
import { offerToKeep, keepWhatWasOffered, dropWhatWasOffered, offeredBefore } from '../knowledge/organisation-memory';
import { keepable, soundsCompanyWide, MEMORY_PROMPT, MEMORY_TOOL, NOT_KEPT } from '../knowledge/what-the-organisation-keeps';
import { restatesSuccess, saidBackForRestatedSuccess, askToRestateSuccess } from './restating-what-good-means';
import { forHumans } from '../presentation/outbound';
import { AnthropicService } from '../conversation/anthropic.service';
import { EmailService } from '../email/email.service';
import { BillingService } from '../billing';
import { UsageService } from '../usage/usage.service';
import { CreateGroundDto, AddParticipantDto, CreateGroundForLeadDto } from './dto';
import { GroundworkEvents, GroundActivatedEvent, CommitmentsSettledEvent } from '../../common';
import { createHash } from 'node:crypto';
import { ContextItemKind, GroundScenario, GroundStatus, PartyType, CheckInStatus, Cadence, UsageEventType, TokenType, Prisma, GroundMoment, ContextNoteAudience, DocumentVisibility } from '@prisma/client';
import { endStatesFor } from '../resolution/end-states';
import { canSignIn } from './can-sign-in';
import { defaultModeFor, boardRendersFor } from '../board/board-families';
import { howACheckInIsGoing } from './how-a-check-in-is-going';
import { theGlanceAsThisReaderMayReadIt, whatIsInTheWay } from './what-a-manager-needs-at-a-glance';
import { totalSessionsFor } from './session-count';
import { theSessionClock } from '../board/one-count-for-the-sessions';
import { answeredOnALink, aLinkRoundIsReady } from './an-open-link-has-no-roster';
import { sentencesIn } from '../presentation/where-a-sentence-actually-ends';
import { BoardFamily, familyFor } from '../board/board-families';
import { theStoryHasSomeoneToPointTo, withoutAStoredCount } from '../reports/the-picture-in-plain-sentences';
import { whoseIsIt } from './a-blocker-that-says-her-or-his';
import { peersAreNamedOn, peersAreNamedByDefaultOn, theReaderBySignIn, whyThePersonReviewedIsNotTold } from '../reports/peers-are-named';
import { runIntake } from '../conversation/intake';
import { objectiveState, describeObjective, mayBeReadAgainst, canShowMovement, BASELINE_IS_FROZEN } from './an-objective-belongs-to-a-person';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { AUTHORED_AT_SETUP, WHAT_RECORDING_IT_MEANS } from './what-setup-agreed';
import { proposalFrom, extractionToolFor, Heard, Proposal, WHO_AND_WHAT_THEY_EXPECT, asContextThenTheSentence, confirmedSay } from './what-the-context-chat-heard';
import { freeSeatLimitMessage } from '../billing/billing.service';
import { isCovered } from '../../common/subscription';
import { DEFAULT_FREE_MEMBER_LIMIT } from '../billing/pricing.service';
import { howManyTheFreePlanCovers } from './a-cohort-is-not-a-payroll';
import { truncationsOfTheirWords } from '../conversation/the-record-holds-what-was-said';
import { screen, ASK_AGAIN } from '../conversation/nothing-invented-reaches-them';
import { mayOpen, HOW_A_NEW_ORG_WORKS } from './who-may-open-a-check-in';
import { notTheWordParty } from '../reports/not-the-word-party';
import { theSituationIn, theTellingHolds, THE_TELLING_PROMPT, withoutTheSetupAnswers, theBriefAsTheLeadReadsIt, theirOwnFirstNameAsYour } from './what-a-participant-is-told-about-this';
import { whatSomeoneWhoDoesNotRunItReads } from './what-someone-who-does-not-run-it-reads';
import { ABOUT_SOMEBODY, mayBeShared, theLinesFor, WHY_A_LINE_ABOUT_SOMEBODY_STAYS_YOURS } from './what-this-check-in-knows';
import { alreadyHowItIs, theLengthWasChosen } from './nothing-is-offered-that-changes-nothing';
import { saidUntilIEndIt, nothingToTakeFrom, traceableToWhatTheySaid, aLengthTheyCouldHaveMeant, whatTheModelsReplyShows, withoutTheWordGround, aLengthAndNothingElse } from './nothing-proposed-that-nobody-said';
import { whatTheyStillOweAShow } from './what-they-said-they-would-show';
import { whatIsNotSettledAbout } from './a-target-nobody-has-defined';
import {
  A_CHANGE_PROMPT, A_CHANGE_SCHEMA, changeAnswersThisTurn, whatChanged, whatTheyMeant, whatWillChange, whichOneDoYouMean,
  type AChangeHeard, type AThingOnRecord, type WhatTheyWant,
} from './what-the-lead-wants-changed';
import { isASecondOrganisation, GUEST_ROLE } from '../participants/joining-a-second-organisation';
import { aNameOutOfAnAddress } from '../users/a-name-out-of-an-address';
import { theLeadsWordsAbout } from './the-leads-words-about-someone';
import { timelineDaysForAChosenEnd } from './session-count';
import { adminsThisOrg, askedToApproveIt, readsAsAnAdmin, maySee, groundsAViewerMayList, WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS } from './who-may-read-this-check-in';
import { EVALUATION_SCENARIOS, isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { whoMayConfirmSetup, confirmedByAnAdminSentence, briefChangedByAnAdminSentence, ONLY_THE_LEAD_CONFIRMS_SETUP, onlyTheLeadConfirmsSetup, type SetupConfirmDecision } from './who-may-confirm-setup';
import { inviteExpiryFrom } from '../participants/how-long-an-invite-lasts';
import { howManyHaveAnswered } from '../reports/how-many-have-answered';
import { A_DUMP_PROMPT, A_DUMP_SCHEMA, aSuccessStatementHolds, ASK_THEM_THIS_OPENS, whatTheYesLeavesOut, whatThatLeavesOut, withoutWhatTheyLeftOut, BETWEEN_THEM_OPENS, HOW_THE_TEAM_WORKS_OPENS, looksLikeADump, theDatesToKeep, theSameWords, theNumberAsWritten, MY_READ_OF_THEM_OPENS, NOT_SETTLED_OPENS, STILL_TO_DECIDE_OPENS, theSameMeasure, thePasteThisYesIsFor, theTellingInTheList, theDirectionsInTheList, aNameKey, whatWeTookFromThat, type ADumpRead, type WhatAPasteGives } from './a-dump-is-many-things';
import { aQuestionAsTheLeadReadsIt, aQuestionReworded, plainQuestionFrom, theExactQuestion, theLeadsOwnQuestionIfAddressedToThem, THE_EXACT_QUESTION_PROMPT, THE_EXACT_QUESTION_TOOL, whatGroundworkWillAsk, type AQuestionForAPerson } from './a-question-asked-word-for-word';
import { whoThisNameIs, theNameWeUseFor } from '../documents/what-a-document-holds';
import { aLabelTheyCanTellApart } from './four-check-ins-with-the-same-name';
import { howCheckableIsYoursAlone } from './how-checkable-is-yours-alone';
import { writeADocumentsNumbers } from '../documents/write-a-documents-numbers';
import { isThisSessionReleased, isTheTeamPictureNowShared, releasedSessionsOf } from '../reports/each-sessions-picture-is-released-on-its-own';

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
  /** One month, and nothing longer: the anchor is a month of weekly check-ins (requests 167 and 168, known issue B11). */
  HELP_TEAM_UNDERSTAND: 30,
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
  /* One conversation, by design: the direction comes from reading them together, not from a second round. */
  DISCOVERY: 1,
  /**
   * A STANDING UPDATE RUNS UNTIL SOMEBODY STOPS IT, and ninety days is the honest stand-in.
   *
   * Every other number here is the length of a thing that finishes: an onboarding, a handover, a
   * contract. This one has no finish in it - "weekly, until I say otherwise" is what the lead picked
   * - so the number is a default horizon rather than a deadline, and the lead moves it on the Setup
   * tab like any other. A one-off by a date is the other half of the same card and comes in with its
   * own timeline from the date they gave.
   */
  TEAM_UPDATES: 90,
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
  HELP_TEAM_UNDERSTAND: GroundMoment.STARTING,
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
  DISCOVERY: GroundMoment.STARTING,
  /* STARTING, like the other recurring read: the enum's three moments are about where a ground sits
     in its own arc, and a standing update is always at the start of the next one. */
  TEAM_UPDATES: GroundMoment.STARTING,
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
  /** Weekly, for the one month the anchor lasts (anchor plan, section 20). */
  HELP_TEAM_UNDERSTAND: Cadence.WEEKLY,
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
  DISCOVERY: Cadence.ONE_TIME,
  /* Her default of the three offered - daily, weekly, every two weeks. The other two are a click. */
  TEAM_UPDATES: Cadence.WEEKLY,
};

// All scenarios support any number of participants - the initiator decides who
// needs to be in the ground. No hard-coded per-scenario cap.
export function isMultiPartyScenario(_scenario: GroundScenario): boolean {
  return true;
}

/**
 * WHAT THE CHECK-IN'S OWN READ CARRIES OF HOW IT ENDED (U.11): the outcome and when, never the
 * lead's reason. The reason is served by the resolution read, which checks who is asking.
 */
export const RESOLUTION_ON_THE_GROUND = { id: true, endState: true, closedAt: true, createdAt: true } as const;

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
  /* The name somebody gave at the end of an open link, and whether they asked for the report. The lead's
     roster reads both; the send-to-everyone button says who it will reach. */
  nameGiven: true, organisationGiven: true,
  wantsTheReport: true,
  invitedAt: true,
  notifiedAt: true,
  /* On the check-in with nothing sent to them, waiting on a seat. Without this the roster reads
     "Invite pending" about a mail that was never sent, and the lead chases the person instead of
     the admin. See added-but-waiting-for-a-seat.ts. */
  awaitingSeat: true,
  /* The day their invitation waits for, when it waits (U.6 review): the roster says so instead of
     offering "Resend invite" for a mail that has not been sent yet. A date, nothing about the person. */
  startsAt: true,
  /* Whether this person answers at all. The roster counted a managing-only lead among the people a
     round is waiting for, so "4 of 5 checked in" named the person it was for. */
  managingOnly: true,
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

/** The reading may only replace its own earlier answer or an empty one; anything else was chosen by a person or a script. */
function theReadingMustLeaveIt(setBy: string | null | undefined): boolean {
  return !!setBy && setBy !== 'read';
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
    /* For one job: finding the report's own door for names, `ReportsService.theReportAsItWasShared`,
       at the moment report text is served. See `reportTextAsItWasShared`. */
    @Optional() private readonly moduleRef?: ModuleRef,
  ) {}

  /**
   * THE ONE GATE EVERY SETUP-CONFIRMING WRITER CALLS (decision 63). Throws
   * `ONLY_THE_LEAD_CONFIRMS_SETUP` for anybody but the lead, unless the lead has left the
   * organisation, in which case an admin of it may confirm - and this returns the decision so the
   * caller can record who did it, and why, for the people the change reaches.
   *
   * The lead's own case never looks anything up beyond the check-in itself; the lead-left lookups
   * only run once that fast path has already failed.
   */
  private async mayConfirmSetupOn(
    checkIn: { initiatorId: string | null },
    requestingUserId: string,
  ): Promise<Extract<SetupConfirmDecision, { allowed: true }>> {
    const fastPath = whoMayConfirmSetup(requestingUserId, checkIn);
    if (fastPath.allowed) return fastPath;
    const [lead, confirmer] = await Promise.all([
      checkIn.initiatorId
        ? this.prisma.user.findUnique({ where: { id: checkIn.initiatorId }, select: { isActive: true, firstName: true, lastName: true } })
        : Promise.resolve(null),
      this.prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true, organizationId: true, firstName: true, lastName: true } }),
    ]);
    /* A lead whose account says nothing either way counts as present: nobody is let in on a guess. */
    const decision = whoMayConfirmSetup(requestingUserId, checkIn, {
      lead: lead ? { ...lead, isActive: (lead as any).isActive !== false } : null,
      confirmer,
      organizationId: confirmer?.organizationId,
    });
    if (!decision.allowed) throw new ForbiddenException(onlyTheLeadConfirmsSetup([lead?.firstName, lead?.lastName].filter(Boolean).join(' ')));
    return decision;
  }

  /**
   * THE OLD CONTEXT CHAT, WHEN IT IS SWITCHED OFF (`release.oldContextChat`, decision 50). Context and resources are done in Ask now, so while the
   * switch says off, the three routes of the old chat on the check-in page answer with one sentence that sends the person there, naming Ask for
   * their organisation. Only the controller calls this: Ask's own setup lane calls `contextChat` and `applyContextProposal` directly and is never
   * stopped by it. OFF when the row is missing or cannot be read; `{ "on": true }` keeps it.
   */
  async theOldContextChatMustBeOpen(organizationId: string): Promise<void> {
    if (await theOldContextChatIsOpen(this.prisma)) return;
    const ask = await askNameOf(this.prisma as any, organizationId);
    throw new GoneException(`Setting up a check-in now happens in ${ask}, so open ${ask} from this check-in's Context and resources page and say what you want to add.`);
  }

  /**
   * THE SAME QUESTION, ASKED WITHOUT THROWING (decision 65). Ask Groundwork, opened from inside a
   * check-in, needs to know whether the sender may even start the setup conversation for it before
   * it decides how to route their message - a plain "may they, or not", not an exception to catch.
   * Exactly `mayConfirmSetupOn`'s rule (decision 63): the lead, or an admin once the lead has left.
   * A check-in that does not exist, or does not belong to this organisation, is "no" as well.
   */
  async mayOpenSetupChatFor(groundId: string, requestingUserId: string, organizationId: string): Promise<boolean> {
    const checkIn = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { initiatorId: true },
    });
    if (!checkIn) return false;
    try {
      await this.mayConfirmSetupOn(checkIn, requestingUserId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * REPORT TEXT, SERVED THROUGH THE REPORT'S OWN DOOR AND NO OTHER (U.5 re-review).
   *
   * Reports are stored with labels ("the initiator", "Participant A"). Names go in only when the text
   * is served, and only through `ReportsService.theReportAsItWasShared`, which also applies the
   * check-in's peer rule ("a colleague") and the organiser's choice to share without names. The
   * check-in read and the list served the stored text, so a participant read "the initiator's plan
   * counts on 4 sales from Participant A". This asks that door, never a copy of it.
   *
   * Found at call time, not injected: ReportsService depends on this service, so a constructor
   * dependency would be a cycle. FAILS CLOSED: where the door cannot be reached, no report text is
   * served at all, rather than the stored labels.
   */
  private reportTextAsItWasShared<T extends Record<string, string | null | undefined>>(
    ground: { scenario?: any; peersVisibleToEachOther?: boolean | null; initiatorId?: string | null; participants?: any[] },
    text: T,
    sharedAs: string | null | undefined,
    viewerParticipantId: string | null,
    viewerRunsIt: boolean,
  ): { [K in keyof T]: string | null } {
    const nothing = Object.fromEntries(Object.keys(text).map((k) => [k, null])) as { [K in keyof T]: string | null };
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ReportsService } = require('../reports/reports.service');
      const reports = this.moduleRef?.get(ReportsService, { strict: false });
      if (!reports?.theReportAsItWasShared) return nothing;
      /* The people and the lead's names go in with every ask, so the wall in one-persons-circumstances-stay-their-own knows who the lead is. */
      const shared = askTheReportsDoor(
        reports,
        { scenario: ground.scenario, peersVisibleToEachOther: ground.peersVisibleToEachOther, initiatorId: ground.initiatorId ?? null, participants: ground.participants ?? [], report: { ...text, sharedAs: sharedAs ?? null } },
        viewerParticipantId,
        viewerRunsIt,
      );
      if (!shared) return nothing;
      return Object.fromEntries(
        Object.keys(text).map((k) => [k, typeof shared[k] === 'string' ? notTheWordParty(shared[k]) : null]),
      ) as { [K in keyof T]: string | null };
    } catch (e) {
      this.logger.warn(`Report text withheld: the naming door could not be reached (${(e as Error)?.message})`);
      return nothing;
    }
  }

  /**
   * THE REPORT'S AGREEMENTS AND DIFFERENCES, THROUGH THE SAME DOOR AS ITS TEXT (decision 139, item 1). Stored with
   * labels, like every other part of a report. FAILS CLOSED like `reportTextAsItWasShared`: where the door cannot be
   * reached, an empty list rather than the stored labels.
   */
  private reportListsAsItWasShared(
    ground: { scenario?: any; peersVisibleToEachOther?: boolean | null; initiatorId?: string | null; participants?: any[] },
    lists: { agreements: unknown; divergences: unknown },
    sharedAs: string | null | undefined,
    viewerParticipantId: string | null,
    viewerRunsIt: boolean,
  ): { agreements: unknown; divergences: unknown } {
    const nothing = { agreements: [], divergences: [] };
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ReportsService } = require('../reports/reports.service');
      const reports = this.moduleRef?.get(ReportsService, { strict: false });
      if (!reports?.theReportAsItWasShared) return nothing;
      const shared = askTheReportsDoor(
        reports,
        { scenario: ground.scenario, peersVisibleToEachOther: ground.peersVisibleToEachOther, initiatorId: ground.initiatorId ?? null, participants: ground.participants ?? [], report: { ...lists, sharedAs: sharedAs ?? null } },
        viewerParticipantId,
        viewerRunsIt,
      );
      if (!shared) return nothing;
      return { agreements: shared.agreements ?? [], divergences: shared.divergences ?? [] };
    } catch (e) {
      this.logger.warn(`Report lists withheld: the naming door could not be reached (${(e as Error)?.message})`);
      return nothing;
    }
  }

  /**
   * A TARGET THE LEAD HAS NOT SHARED STAYS WITH ITS OWNER, ON THIS PAGE AND THE LIST TOO (29 September
   * 2026). The report and the board took out every sentence giving a colleague's hidden target; this
   * page and the list served the same report words, and the brief, without it. So a colleague on a
   * check-in where people see only their own read "Kwame is aiming for seventeen approved facilities".
   * Whoever set the targets reads everything; everybody else, an admin who only reads included, has
   * those sentences taken out. See board/a-hidden-target-stays-hidden.
   */
  private withoutTheTargetsHiddenFrom<T>(
    ground: { initiatorId?: string | null; whoSeesTargets?: string | null; participants?: any[]; objectives?: { ownerParticipantId: string | null; target: number | null }[] },
    requestingUserId: string | null | undefined,
    served: T,
    /* An admin with access to the check-in reads the figures too (decisions 86 item 3 and 93). */
    readsAsAnAdmin = false,
  ): T {
    const me = (ground.participants ?? []).find((p: any) => !!requestingUserId && p.userId === requestingUserId);
    /* Whoever set the targets reads everything: the lead, and the admin who set the check-in up for them (decisions 5 and 56; privacy sweep finding 4). */
    const hidden = targetsHiddenFrom(
      { participantId: me?.id ?? null, isTheLead: readsAsAnAdmin || (!!requestingUserId && (ground.initiatorId === requestingUserId || (ground as any).createdByUserId === requestingUserId)) },
      ground.whoSeesTargets,
      ground.objectives ?? [],
      namesOnTheRoster(ground.participants ?? []),
      /* And a target written only in the lead's words about somebody (targetsFromTheirRemits). */
      ground.participants ?? [],
    );
    return withoutHiddenTargetsIn(served, hidden);
  }

  /**
   * @param creatorRole the caller's role in the organisation. A ground created by
   *   somebody who is not an ADMIN waits for one to accept it - her requirement, and
   *   the reason it is a parameter rather than a lookup is that the controller already
   *   has it on the token and a second read could disagree with the guard.
   */
  /**
   * WHAT A PARTICIPANT IS TOLD, WRITTEN ONCE FROM THE BRIEF. See what-a-participant-is-told-about-this.
   * Awaited with a ceiling, so a slow model costs a few seconds at setup and never a hang; a failure or
   * an empty rewrite leaves the column null and the read falls back to the filtered brief.
   */
  async tellParticipantsAboutThis(groundId: string, brief: string | null | undefined, scenario?: string | null): Promise<void> {
    /* The anchor lead's conversation is hers alone, so nothing is written from it for the team to read (decision 96, item 8). */
    /* At create the row has no mark yet, so the situation says it; on a later edit of the brief the row's own mark does. */
    const marked = scenario === GroundScenario.HELP_TEAM_UNDERSTAND
      || (await Promise.resolve((this.prisma.ground as any)?.findUnique?.({ where: { id: groundId }, select: { startedFrom: true } })).catch(() => null))?.startedFrom === 'anchor';
    if (marked) {
      this.logger.log(`Ground ${groundId}: the anchor's team is told nothing from the lead's own conversation.`);
      return;
    }
    try {
      const told = await this.composeWhatParticipantsAreTold(groundId, brief);
      await this.prisma.ground.update({ where: { id: groundId }, data: { toldToParticipants: told } as any });
      this.logger.log(`Ground ${groundId}: what participants are told ${told ? 'written' : 'left to the filtered brief'}.`);
    } catch (err: any) {
      this.logger.warn(`Ground ${groundId}: what participants are told could not be written: ${err?.message}`);
    }
  }

  /**
   * WHAT PARTICIPANTS WOULD BE TOLD, COMPOSED AND CHECKED BUT NOT WRITTEN. Null where there is nothing
   * to tell. Throws where the model fails, which callers treat as "nothing to offer". The paste's
   * say-back shows this sentence before the yes, and the yes writes exactly that one (request 92).
   */
  async composeWhatParticipantsAreTold(groundId: string, brief: string | null | undefined): Promise<string | null> {
    /* The model is handed the situation only, never the answers setup put together from the lead's
       conversation: those are the lead's instructions about people, not something to retell to them
       (request 41). A brief that is nothing but those answers leaves nothing to tell. */
    const text = withoutTheSetupAnswers(brief);
    if (!text) return null;
    const people = await this.prisma.groundParticipant.findMany({ where: { groundId }, select: { user: { select: { firstName: true, lastName: true } } } });
    const otherNames = people.flatMap((p) => [p.user?.firstName ?? '', p.user?.lastName ?? '']).filter((n) => n.trim().length >= 3);
    /* The subject as the lead named it, so the rewrite can be checked for naming it - see theTellingHolds. */
    const named = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { label: true, timelineDays: true, cadence: true } as any }).catch(() => null);
    const label = (named as any)?.label ?? '';
    /* One round or many, so the telling cannot promise a person a habit they were never signed up to. */
    const rounds = totalSessionsFor((named as any)?.timelineDays, (named as any)?.cadence) ?? null;
    const raw = await Promise.race([
      this.anthropic.respond(THE_TELLING_PROMPT, [{ role: 'user', content: `What this check-in is called: ${label || 'not named'}\nHow many times these people will be asked: ${rounds == null ? 'not set' : rounds <= 1 ? 'once, and only once' : `${rounds} times`}\n\nWhat the person who set this up wrote:\n\n${text}` }] as any),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('the telling took too long')), 12_000)),
    ]);
    return theTellingHolds(raw, { otherNames, about: `${label} ${text}`, rounds });
  }

  async create(organizationId: string, initiatorId: string, dto: CreateGroundDto, creatorRole?: string) {
    /* What this organisation already calls its check-ins, so a new one is not the fourth thing in
       the rail with the same name. See four-check-ins-with-the-same-name. */
    const labelsAlreadyHere = await this.prisma.ground
      .findMany({ where: { organizationId }, select: { label: true } })
      .then((rows) => rows.map((r) => r.label))
      .catch(() => [] as string[]);
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
      if (!initiator) throw new NotFoundException('The person who runs this check-in could not be found, so check who is named and try again.');

      // Determine free-ground fields from the billing gate result.
      const isFreeGround = canCreate.freeReason !== undefined;
      const groundData: Record<string, unknown> = {
        organizationId,
        initiatorId,
        /*
         * A LABEL THEY CAN TELL APART. Four check-ins in her rail read "The goal is to better
         * un…" because each label is the opening words of a brief and she ran the same brief four
         * times. See four-check-ins-with-the-same-name: a clash takes the day it opened, and the
         * one that already exists is never renamed under somebody who has it open.
         */
        label: aLabelTheyCanTellApart(dto.label, labelsAlreadyHere),
        scenario: dto.scenario,
        // Immutable after this point. Omitting it takes the family default so a
        // sensing-family ground is never accidentally created shared.
        mode: dto.mode ?? defaultModeFor(dto.scenario),
        moment: dto.moment,
        timelineDays: howLongItRuns(dto),
        /** "Until I end it": no planned length, no planned last session (request 37). */
        runsUntilEnded: dto.runsUntilEnded === true,
        /** Whether this was chosen or guessed for them, so the setup chat can offer to fix it. */
        timelineStated: dto.runsUntilEnded === true || dto.timelineDays != null || !!dto.endsAt,
        cadenceStated: dto.cadence != null,
        cadence: dto.cadence ?? RECOMMENDED_CADENCE[dto.scenario],
        cadenceAnchorDay: dto.cadenceAnchorDay ?? null,
        workingDays: workingDaysOf(dto.workingDays),
        startsAt: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, dto.workingDays),
        endsAt: dto.endsAt && dto.runsUntilEnded !== true ? new Date(dto.endsAt) : null,
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
        /* A cohort's people are the subject of the check-in, not seats in the organisation, and
           counting them as staff refused the whole scenario at six people. See
           a-cohort-is-not-a-payroll. */
        freeParticipantCap: dto.freeParticipantCap ?? howManyTheFreePlanCovers(dto.scenario, DEFAULT_FREE_MEMBER_LIMIT),
        isFreeGround,
        /* One session in hand, unless the free plan has stopped for this organisation (U.19). */
        sessionsBalance: canCreate.sessionsToStart ?? 1,
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
          /* Decision 133: the lead's check-ins are optional, and the data says so. */
          optional: true,
          availableFrom: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, dto.workingDays),
        },
      });

      return ground;
    });
    await this.tellParticipantsAboutThis(ground.id, dto.brief, (dto as { scenario?: string }).scenario);
    /* The kind of work, read from what the lead said at setup (request 76). Not awaited: setup is saved either way. */
    void this.readTheKindOfWork(ground.id);

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
          timelineDays: howLongItRuns(dto),
          runsUntilEnded: dto.runsUntilEnded === true,
          /** Whether this was chosen or guessed for them, so the setup chat can offer to fix it. */
          timelineStated: dto.runsUntilEnded === true || dto.timelineDays != null || !!dto.endsAt,
          cadenceStated: dto.cadence != null,
          cadence: dto.cadence ?? RECOMMENDED_CADENCE[dto.scenario],
          cadenceAnchorDay: dto.cadenceAnchorDay ?? null,
          workingDays: workingDaysOf(dto.workingDays),
          startsAt: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, dto.workingDays),
          endsAt: dto.endsAt && dto.runsUntilEnded !== true ? new Date(dto.endsAt) : null,
          /* OPEN FROM THE START. There is no lead page any more (10 Sep 2026): nobody sets a check-in
             up for somebody else to confirm. A ground made through the API with people on it waits
             for them; one with nobody yet is simply open, and the lead's first check-in exists now. */
          status: (dto.participants ?? []).length ? GroundStatus.AWAITING_PARTIES : GroundStatus.OPEN,
          brief: dto.brief ?? null,
          joinToken: crypto.randomBytes(24).toString('hex'),
          freeParticipantCap: howManyTheFreePlanCovers(dto.scenario, DEFAULT_FREE_MEMBER_LIMIT),
          isFreeGround,
          sessionsBalance: canCreate.sessionsToStart ?? 1,
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
            /* The admin setting this up added them, so they do not wait for an admin (U.4). */
            addedByUserId: adminUserId,
            invitedAt: new Date(),
            inviteToken,
            inviteTokenExpiresAt: inviteExpiryFrom(),
          },
        });
        pendingInvites.push({ email: p.email.toLowerCase(), token: inviteToken, participantId: participant.id });
        /* A guest here from the moment they are added, when their account lives elsewhere (U.4 review). */
        await aGuestHereIfTheyAreFromElsewhere(tx as any, organizationId, p.email);
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
      await this.email.sendTheInviteThisGroundSends(ground, invite.email, dto.leadName ?? 'Your lead', invite.token, undefined, { kind: 'PARTICIPANT_INVITE', participantId: invite.participantId, groundId: ground.id }).catch((err: any) =>
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
    await this.tellParticipantsAboutThis(ground.id, dto.brief, (dto as { scenario?: string }).scenario);
    /* The kind of work, read from what the lead said at setup (request 76). Not awaited: setup is saved either way. */
    void this.readTheKindOfWork(ground.id);

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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the person named to run this check-in can confirm it, so ask them to.');
    if (ground.status !== GroundStatus.AWAITING_LEAD) throw new BadRequestException('This check-in is already confirmed, so there is nothing more to do.');

    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId, partyType: PartyType.INITIATOR },
    });
    if (!participant) throw new NotFoundException('The person who runs this check-in has no place in it yet, so contact us and we will put it right.');

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
    if (edits?.brief !== undefined) await this.tellParticipantsAboutThis(groundId, edits.brief);
    /* A changed brief can change the kind of work (request 76); a lead's own choice is kept. */
    if (edits?.brief !== undefined) void this.readTheKindOfWork(groundId);

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
            optional: true,
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
        data: { groundId, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED, availableFrom: ground.startsAt ?? null, optional: true },
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
    /* No code, or not a text (a wrong parameter name, or a list), is a link that was not found, not a fault in the database call (B-150). */
    if (typeof joinToken !== 'string' || !joinToken.trim()) throw new NotFoundException('That join link does not work any more, so ask whoever runs the check-in for a new one.');
    const ground = await this.prisma.ground.findUnique({
      where: { joinToken },
      include: { initiator: { select: { firstName: true } } },
    });
    if (!ground) throw new NotFoundException('That join link does not work any more, so ask whoever runs the check-in for a new one.');
    /**
     * A JOIN LINK INTO A FINISHED CHECK-IN IS A DOOR INTO AN EMPTY ROOM. The token has no expiry of
     * its own, so it outlived the check-in: a link shared in week one still signed people up in
     * month four, onto a ground that was CLOSED, and gave them a session on it. The reason it
     * refuses is the real one - ended, or held - not an expiry the link never had.
     */
    const refused = whyAJoinLinkRefuses(ground.status, ground.endState, ground.scenario);
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
  async getOrgRoster(organizationId: string, requestingUserId?: string) {
    /* Every ground in the organisation, except a performance plan, a promotion or a renewal this admin was
       not given access to (decision 5, request 78): the same rule as the list, asked as a query. */
    const grounds = await this.prisma.ground.findMany({
      where: this.whatAnAdminMayList(organizationId, requestingUserId) as any,
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
            checkIns: { select: { sessionNumber: true, status: true, completedAt: true }, orderBy: { sessionNumber: 'asc' } },
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
          /* No read of how checkable anybody's answers were: that is theirs alone, and this roster
             goes to admins. See how-checkable-is-yours-alone. */
          return {
            email: p.email,
            // Display name only, so the client never has to make one out of the address.
            firstName: (p as any).user?.firstName ?? null,
            partyType: p.partyType,
            /* The lead's note about a person, to that check-in's lead alone. This roster is read by
               admins, and an admin is not the lead of every check-in (U.7 review). */
            roleAsDescribed: theLeadsWordsAbout(p, !!requestingUserId && g.initiator.id === requestingUserId),
            accepted: p.userId != null,
          };
        }),
        contributedParties,
        report: g.report
          /* Counts and the release only. The stored sentences carry report labels ("Participant A", "the initiator"),
             no screen reads them and the developer API does not serve this route (decision 115: names, never labels). */
          ? {
              agreementsCount: Array.isArray(g.report.agreements) ? g.report.agreements.length : 0,
              differencesCount: Array.isArray(g.report.divergences) ? g.report.divergences.length : 0,
              releasedAt: g.report.releasedAt,
            }
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
        /* `awaitingOrgApproval`: whether an admin has let them in yet, which every count reads (decision 77). The
           same yes or no the check-in's own read serves (SAFE_PARTICIPANT_SELECT). */
        participants: { select: { id: true, email: true, partyType: true, userId: true, roleAsDescribed: true, createdAt: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } },
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
          select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, createdAt: true, isSetup: true, availableFrom: true, closedReason: true, optional: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } } },
        },
        // A released report that nobody is told about is a report nobody reads.
        // Ten grounds released theirs and not one person ever activated.
        report: { select: { releasedAt: true, releasedSessions: true, agreements: true, divergences: true, sharedAs: true } },
        /*
         * THE LATEST ROUND'S FINDING, for the card. One row per ground, newest first: the list is
         * read often and a whole history here would be paid for on every load for a single line.
         */
        reportRounds: { select: { sessionNumber: true, finding: true, sharedPicture: true }, orderBy: { sessionNumber: 'desc' }, take: 1 },
        /* Whose target is whose, so no sentence gives a colleague's hidden one (see withoutTheTargetsHiddenFrom). */
        objectives: { select: { id: true, ownerParticipantId: true, target: true, isADecisionAboutAPerson: true } },
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
          /* Never a row held for a seat: it is not offered until its invitation goes (U.4 re-review). */
          /* Nor a row on a check-in still waiting for an admin to accept it: that person is invited by the approval, and is not on the check-in before it (known issue B5). */
          where: { email: userEmail.toLowerCase(), userId: null, awaitingSeat: false, ground: { status: { not: GroundStatus.AWAITING_APPROVAL } } },
          data: { userId },
        });
      }

      /*
       * ONLY THE ORGANISATION CHOSEN (B-197, 10 October 2026). This used to add the check-ins of every OTHER organisation the person takes part in, from the days
       * before the switcher. Somebody in two organisations (Neema, in Msingi Foods and Lakeview Clinic) read each one's check-ins under the other's name, on Today, You, the
       * switcher and Ask's picker. The list is the chosen organisation's alone; to read the other's, she switches to it.
       */
      const links: { groundId: string }[] = [];
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
        /* `awaitingOrgApproval`: whether an admin has let them in yet, which every count reads (decision 77). The
           same yes or no the check-in's own read serves (SAFE_PARTICIPANT_SELECT). */
        participants: { select: { id: true, email: true, partyType: true, userId: true, roleAsDescribed: true, createdAt: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } },
            checkIns: {
              /** Must match the sibling query above: both feed the same list. GW-EXP-6. */
              select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, createdAt: true, isSetup: true, availableFrom: true, closedReason: true, optional: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } } },
            },
            report: { select: { releasedAt: true, releasedSessions: true, agreements: true, divergences: true, sharedAs: true } },
            /* Must match the sibling query above: both feed the same list, and a card fed by this
               one would fall back to the brief for ever while its twin showed the finding. */
            reportRounds: { select: { sessionNumber: true, finding: true, sharedPicture: true }, orderBy: { sessionNumber: 'desc' }, take: 1 },
            /* Same as the sibling query. */
            objectives: { select: { id: true, ownerParticipantId: true, target: true, isADecisionAboutAPerson: true } },
            /* Same as the sibling query: both feed the same card. */
            dependencies: { select: { what: true, status: true, createdAt: true, fromParticipantId: true, onParticipantId: true, onLabel: true } },
            reportActivations: { select: { participantId: true, status: true } },
          },
        });
      }
    }

    /* Who is away today, for every check-in in the list at once (week 23). */
    const leaveOnTheList = await leaveOfThePeopleOn(this.prisma as any, [...orgGrounds, ...participantGrounds].map((g: any) => g.id));
    /* Who an admin has not let in yet on each check-in, with who was declined, read once for the list (decision 77). */
    const notLetInOnTheList = new Map<string, Map<string, { declined: boolean }>>();
    for (const g of [...orgGrounds, ...participantGrounds] as any[]) {
      if (!(g.participants ?? []).some(isNotLetInYet)) continue;
      notLetInOnTheList.set(g.id, await whoIsNotLetInYet(this.prisma, g.participants ?? [], g.organizationId).catch(() => new Map()));
    }
    /* NOBODY HELD FOR A SEAT READS ANYTHING OF THE CHECK-IN, AND THIS LIST FEEDS TODAY AND YOU (second review, new leak A; row 5). */
    const heldForASeat = await theCheckInsHeldForASeat(this.prisma as any, [...orgGrounds, ...participantGrounds].map((g: any) => g.id), userId);
    /* WHETHER EACH LEAD HAS LEFT, FOR AN ADMIN WHO DOES NOT RUN THE CHECK-IN (request 206, decision 119 H10). Worked out as get() does it:
       the lead's account is read only for a reader who is an admin of that organisation and not the lead, and a lead whose account says
       nothing either way is counted as present. One read for the whole list. */
    const adminLeadIds = new Set<string>();
    const mayAdminHere = (g: any) => !!userId && g.initiatorId !== userId && adminsThisOrg({ role: userRole, organizationId, userId } as any, g);
    for (const g of [...orgGrounds, ...participantGrounds] as any[]) {
      if (g.initiatorId && g.organizationId === organizationId && mayAdminHere(g)) adminLeadIds.add(g.initiatorId);
    }
    const leadAccounts = new Map<string, any>();
    if (adminLeadIds.size) {
      const found = await Promise.resolve((this.prisma as any).user?.findMany?.({ where: { id: { in: [...adminLeadIds] } }, select: { id: true, isActive: true, firstName: true, lastName: true } })).catch(() => []);
      for (const l of found ?? []) leadAccounts.set(l.id, l);
    }
    const setupFor = (g: any) => {
      if (userId && g.initiatorId === userId) return { leadHasLeft: false, mayChangeSetup: true };
      const lead = g.initiatorId && g.organizationId === organizationId && mayAdminHere(g) ? leadAccounts.get(g.initiatorId) : null;
      if (!lead) return { leadHasLeft: false, mayChangeSetup: false };
      const leadState = { ...lead, isActive: lead.isActive !== false };
      return {
        leadHasLeft: !leadState.isActive,
        mayChangeSetup: whoMayConfirmSetup(userId, g, { lead: leadState, confirmer: { role: userRole, organizationId } as any, organizationId: g.organizationId ?? null }).allowed,
      };
    };
    return [...orgGrounds, ...participantGrounds]
      .filter((g: any) => !heldForASeat.has(g.id))
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
          timelineDays: (rest as any).runsUntilEnded ? null : (rest as any).timelineDays ?? null,
          cadence: (rest as any).cadence ?? null,
          scenario: (rest as any).scenario ?? null,
          sharedPicture: ((rest as any).reportRounds?.[0]?.sharedPicture as string | null) ?? null,
          /* The opening the report wrote, preferred over slicing the picture. See how-a-check-in-is-going. */
          theOpening: ((rest as any).report?.theOpening as string | null) ?? null,
          leave: leaveOnTheList,
          forTheList: true,
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
        /* AND NOT A COUNT OF WHO HAS ANSWERED, which was true when the report was written and is stale once
         * somebody is added (request 97b): the live count is served beside it, in glance.progress. */
        const latestSummary = going.latestSummary ? theStoryHasSomeoneToPointTo(withoutAStoredCount(going.latestSummary)) || null : null;
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
        /*
         * ONLY WHAT THIS READER MAY SEE (C1, U.5). The row used to go out whole, to every reader of the
         * list, so a participant was handed three things the check-in's own page keeps from them:
         *   - the broadcast join link, which the page gives only to the lead and an admin of the
         *     organisation (see join-token-visibility.spec.ts);
         *   - other people's email addresses, which the page hides while the lead keeps contact
         *     details private (restrictExternalVisibility, the same rule as get());
         *   - the report's agreements and differences, before it was released to them. The list only
         *     needs them to count, and the count (`alignment`) is already worked out above.
         * The audit log goes too: nothing on any screen reads it from here.
         */
        const {
          joinToken, groundAuditLog: _log, report: fullReport, participants: allParticipants,
          checkIns: allCheckIns, dependencies: allDependencies, reportRounds: _rounds, ...safe
        } = rest;
        /* Whoever runs it: the lead, or an admin of the organisation it belongs to. Same test as get(). */
        const runsIt = isInitiator || (userRole === 'ADMIN' && g.organizationId === organizationId && !((g as any).participants ?? []).some((p: any) => p.userId === userId));
        const hideContact = !!(rest as any).restrictExternalVisibility;
        /*
         * AND THE PEER RULE, THE SAME ONE get() APPLIES (U.5 review). Where people are not named to
         * each other, a participant was shown nobody else on the check-in's own page and everybody,
         * with each person's session rows and statuses, here. Now the list gives them only
         * themselves: their own row, their own sessions, and only what is owed to or by them.
         * Today and "N new" read this list, so they follow.
         */
        const peersVisibleEffective = peersAreNamedOn(rest as any, theReaderBySignIn(rest as any, userId));
        const hidePeers = !peersVisibleEffective && !runsIt;
        const isMe = (p: any) => !!userId && p.userId === userId;
        const myRowHere = ((allParticipants ?? []) as any[]).find(isMe);
        /* A guest from another organisation is not told who is waiting to be let in at someone else's company. */
        const readerIsOutsideTheOrg = g.organizationId !== organizationId;
        const participants = ((allParticipants ?? []) as any[])
          .filter((p) => !hidePeers || isMe(p))
          .map((p) => ({
            ...p,
            email: hideContact && !isInitiator && !isMe(p) ? null : p.email,
            /* What the lead wrote about a person is for the lead alone, not an admin (U.7 review).
               See the-leads-words-about-someone.ts. */
            roleAsDescribed: theLeadsWordsAbout(p, isInitiator),
          }));
        const shown = new Set(participants.map((p: any) => p.id));
        const checkInsShown = hidePeers
          ? ((allCheckIns ?? []) as any[]).filter((c) => shown.has(c.participantId))
          : allCheckIns;
        const dependenciesShown = hidePeers
          ? ((allDependencies ?? []) as any[]).filter((d) => shown.has(d.fromParticipantId) || shown.has(d.onParticipantId))
          : allDependencies;
        /*
         * THE TEAM'S REPORT ONLY ONCE IT IS RELEASED (U.5 review). The latest round's summary and
         * finding are report text; somebody who does not run the check-in is given them only after
         * the report has been released, the same as the report itself.
         */
        /*
         * AND NOT WHERE PEOPLE ARE NOT NAMED TO EACH OTHER (request 97e). The latest round's summary and
         * finding are the team's picture, written about the people in it, and a participant on a check-in
         * where colleagues are unnamed (a review, a cohort, or where the lead chose it) is given only
         * themselves everywhere else on this row, so is given none of the team's picture here either.
         * Their own report is read on their own check-in, never through these two fields.
         */
        /* AND ONLY A SESSION THAT HAS BEEN RELEASED (decision 76, item 4): the latest round's summary is
           that round's picture, and each session's picture is released on its own. */
        const latestRound = ((rest as any).reportRounds?.[0]?.sessionNumber as number | undefined) ?? null;
        const mayReadTheReport = runsIt || (!!fullReport?.releasedAt && peersVisibleEffective
          && latestRound !== null && isThisSessionReleased(fullReport as any, latestRound));
        /* And no sentence with a colleague's hidden target, in the brief or the report's words (as get()). The row is then narrowed
           again for anyone who does not run it: nothing built from the lead's private set-up (B-013, B-091), and in an anchor
           check-in not the lead's aims either (decision 96, item 8), exactly as the check-in's own read does. */
        /* WHICH TARGETS THIS READER MAY SEE, BY THE FUNCTION THE CHECK-IN'S OWN READ USES (request 209, B-114). The list sent every person's
           {ownerParticipantId, target} to a member where people see only their own, so a colleague's number was readable here. Now the lead and
           whoever runs it read every share, and everybody else reads what targetsFor gives them, which is the same rule as get(). */
        const readerViewer = { role: userRole, organizationId, userId } as any;
        const readsEveryShare = isInitiator || (!!userId && (g as any).createdByUserId === userId)
          || adminsThisOrg(readerViewer, g as any) || askedToApproveIt(readerViewer, g as any);
        const myParticipantHere = ((allParticipants ?? []) as any[]).find((p: any) => !!userId && p.userId === userId);
        const targetsThisReaderMaySee = targetsFor(
          (((g as any).objectives ?? []) as any[]),
          myParticipantHere?.id ?? null,
          ((g as any).whoSeesTargets ?? 'THEIR_OWN') === 'EVERYBODY' ? 'everybody' : 'their own',
          { isLead: isInitiator, seesEveryShare: readsEveryShare },
        ).shown.map(({ id: _id, isADecisionAboutAPerson: _d, ...kept }: any) => kept);
        return this.withoutTheLeadsSetUpForAReader(g as any, runsIt, this.withoutTheTargetsHiddenFrom(g as any, userId, {
          ...safe,
          objectives: targetsThisReaderMaySee,
          /* Until the lead ends it: no length to show. The flag says so (request 37). */
          timelineDays: (safe as any).runsUntilEnded ? null : (safe as any).timelineDays,
          /*
           * THE BRIEF, BY THE SAME RULE AS THE CHECK-IN'S OWN READ (U.7 third review). It went out
           * raw in `safe` to every reader of the list, so Aisha was sent the lead's setup answers
           * about her. Whoever runs it gets the brief; anybody else the version everyone reads.
           */
          brief: runsIt ? ((safe as any).brief ?? null) : whatSomeoneWhoDoesNotRunItReads(safe as any),
          participants,
          /*
           * WHAT THE ROOM IS ABOUT, AS THIS READER MAY READ IT (decision 121, item 5). It went out raw in `safe`, every place and thing
           * with the id of the person who named it, so a member where people do not see each other read where a colleague works. The
           * check-in's own read applies this wall (board/the-room-for-this-reader); the list now applies the same one.
           */
          ...((safe as any).whatTheRoomIsAbout
            ? {
                whatTheRoomIsAbout: theRoomForThisReader((safe as any).whatTheRoomIsAbout, {
                  participants: (allParticipants ?? []) as any[],
                  me: myRowHere ?? null,
                  initiatorId: (rest as any).initiatorId ?? g.initiatorId ?? null,
                  viewerRunsIt: runsIt,
                  wallOffTheOthers: hidePeers,
                  evaluation: isEvaluationCheckIn((rest as any).scenario),
                }),
              }
            : {}),
          checkIns: checkInsShown,
          dependencies: dependenciesShown,
          peersVisibleEffective,
          /* Decision 17, said plainly: on a check-in about one person the switch never reaches them. */
          whyThePersonReviewedIsNotTold: whyThePersonReviewedIsNotTold(rest as any),
          ...(runsIt ? { joinToken } : {}),
          report: fullReport ? { releasedAt: fullReport.releasedAt ?? null, releasedSessions: releasedSessionsOf(fullReport as any) ?? [] } : null,
          alignment, overdue, checkInsToday, roundsDone, lastActivity, reportWaitingForMe, otherOrgName,
          ...setupFor(g),
          /*
           * WHO IS WAITING TO BE LET IN, APART FROM "N OF M" (decision 77). Only whoever runs it, or an admin
           * here, reads it; never a person who checks in.
           */
          waitingToBeLetIn: theWaitingToBeLetInLine(
            [...(notLetInOnTheList.get(g.id) ?? new Map<string, { declined: boolean }>()).entries()]
              .map(([pid, d]) => {
                const p = ((allParticipants ?? []) as any[]).find((x) => x.id === pid);
                return { p, declined: d.declined, name: [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || (p?.nameGiven ?? '').trim() || null };
              })
              .filter((w) => !!w.p && !w.p.managingOnly && (runsIt || (!w.declined && !!myRowHere && w.p.id !== myRowHere.id && !readerIsOutsideTheOrg)))
              .map(({ name, declined }) => ({ name: runsIt || peersVisibleEffective ? name : null, declined })),
          ),
          /* Through the report's own door, for every reader, so no label is ever served (U.5 re-review). */
          ...(() => {
            if (!mayReadTheReport || (!latestFinding && !latestSummary)) return { latestFinding: null, latestSummary: null };
            const me = ((allParticipants ?? []) as any[]).find(isMe);
            const named = this.reportTextAsItWasShared({ ...(rest as any), participants: allParticipants, initiatorId: (rest as any).initiatorId ?? g.initiatorId ?? null }, { latestFinding, latestSummary }, fullReport?.sharedAs, me?.id ?? null, runsIt);
            return { latestFinding: aFindingThatReadsRight(named.latestFinding) as typeof named.latestFinding, latestSummary: named.latestSummary };
          })(),
          hasBoard,
          /* No count of other people either, where they are not named to this reader: not how many
             answered, nor what is holding them up. Their own turn still shows from their own rows. */
          glance: (() => {
            const { oldestOnParticipantId, ...inTheWay } = (glance.inTheWay ?? {}) as any;
            /*
             * WHAT IS IN THE WAY NAMES NOBODY THIS READER MAY NOT READ (request 105, the more private choice):
             * where people see only themselves, and on an evaluation check-in for anybody but its lead and the
             * admin who set it up, it is counted and named from the reader's own waits only. The same rule as
             * the board's header (theGlanceAsThisReaderMayReadIt). Today reads this list, so it follows.
             */
            const me = ((allParticipants ?? []) as any[]).find(isMe);
            const runsTheEvaluation = isInitiator || (!!userId && (rest as any).createdByUserId === userId);
            const walledFromColleagues = hidePeers || (isEvaluationCheckIn((rest as any).scenario) && !runsTheEvaluation);
            const theirOwn = walledFromColleagues
              ? theGlanceAsThisReaderMayReadIt(glance as any, { participantId: me?.id ?? null }, (allDependencies ?? []) as any[])
              : null;
            if (hidePeers) {
              /* What the reader may say of themselves, in place of numbers about people they are not shown
                 (request 97d): "Just started" was read from those zeroes and was untrue of a check-in
                 where others had answered. */
              const open = glance.progress.openRound;
              const mineThisRound = ((checkInsShown ?? []) as any[]).filter((c) => !c.isSetup && c.sessionNumber === open);
              const answered = mineThisRound.some((c) => c.status === 'COMPLETED' || c.status === 'DECLINED');
              return {
                ...glance,
                progress: { ...glance.progress, answeredThisRound: 0, ofPeople: 0, waitingOn: [], youHaveAnswered: answered, standsSaid: answered ? 'You have answered.' : 'You have not answered yet.' },
                inTheWay: theirOwn!.inTheWay,
              };
            }
            if (theirOwn) return theirOwn;
            /*
             * DECISION 75, ITEM 46: A PARTICIPANT'S ONE LINE IS THEIR OWN WAITS, ON EVERY CHECK-IN. Even where people
             * see each other, somebody who takes part and does not run it is counted and named only what they wait
             * on or what waits on them, to match their own board. Who has answered stays as it was, since people
             * see each other here. Whoever runs it, and an admin reading it, read the team's waits as before.
             */
            const onlyTheirOwn = !!me && !runsTheEvaluation && !runsIt;
            const ownWays = onlyTheirOwn
              ? whatIsInTheWay(((allDependencies ?? []) as any[]).filter((d: any) => d.fromParticipantId === me.id || d.onParticipantId === me.id), new Date(), true) as any
              : null;
            const { oldestOnParticipantId: ownOnId, ...ownInTheWay } = (ownWays ?? {}) as any;
            const theWay = onlyTheirOwn ? ownInTheWay : inTheWay;
            const onWhom = onlyTheirOwn ? ownOnId : oldestOnParticipantId;
            /* A thing waited on that starts with "her" says "A colleague's"; a reader who may name people is told whose. */
            let oldest: string | null = theWay.oldest;
            if (oldest && onWhom && oldest.startsWith("A colleague's")) {
              const who = ((allParticipants ?? []) as any[]).find((p) => p.id === onWhom);
              const name = theFirstNameOfAParticipant(who);
              if (name && (runsIt || peersVisibleEffective)) oldest = whoseIsIt(oldest.replace(/^A colleague's/, 'her'), name);
            }
            return { ...glance, inTheWay: { ...theWay, oldest } };
          })(),
          /* Who runs it, for a reader who is shown nobody else on the row (request 97d). Not a peer: the person
             who invited them. Never their private description of anybody, only a name they gave or have. */
          runByName: ((): string | null => {
            const lead = ((allParticipants ?? []) as any[]).find((p) => p.partyType === 'INITIATOR') ?? ((allParticipants ?? []) as any[]).find((p) => p.userId && p.userId === (rest as any).initiatorId);
            if (!lead) return null;
            const named = [lead.user?.firstName, lead.user?.lastName].filter(Boolean).join(' ').trim() || (lead.nameGiven ?? '').trim();
            return named || null;
          })(),
        }, runsIt));
      })
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  /** The one place a row's lead-only set-up is taken off before it is served to someone who does not run the check-in. */
  private withoutTheLeadsSetUpForAReader<P extends Record<string, any>>(g: Record<string, any>, runsIt: boolean, row: P): P {
    return withoutTheLeadsSetUpForAMember(row, { startedFrom: g.startedFrom ?? null, scenario: g.scenario ?? null, runsIt });
  }

  async get(id: string, organizationId: string, requestingUserId?: string) {
    /**
     * WHO MAY READ ONE. `list()` in this same file gives a non-admin their own grounds only - the
     * ones they lead or take part in - and an admin everything in the organisation. This read gave
     * any member of the organisation any ground in it, with the report's shared picture, the
     * agreements and divergences, the objectives and the participants included. Same rule as the
     * list, asked here too; and the same answer as assertMaySeeGround gives every other read.
     */
    /* Nobody held for a seat reads the check-in page: the invitation page's own refusal, asked first (privacy sweep finding 3). */
    /* Unless they already answered: then the page is theirs, narrowed to their own answers (decision 110, B3). */
    const heldButAnswered = await theHeldPersonWhoHasAnswered(this.prisma as any, id, requestingUserId);
    /* Nor anyone waiting for the organisation's approval (row 5). */
    await refuseSomeoneAwaitingTheOrganisation(this.prisma as any, requestingUserId, CANNOT_CHECK_IN_YET);
    const mayRead = requestingUserId ? await this.assertMaySeeGround(id, requestingUserId) : null;
    // Primary lookup by org - works for org members and the initiator.
    /* `isSetup` is served so that a set-up conversation (the anchor lead's, which is not a check-in) is left out of every count of sessions. The page's own
       filters (`!c.isSetup`, here and on the screens) read it, and read nothing while it was not selected: "1 of 4 sessions are done" on the first day. */
    /* `closedReason` and one person turn (an id only): a session the clock closed with nothing said is not an answer, so no count of
       who checked in may count it (night quality run 1, problem 4: "5 of 5 checked in" with Jared missing). `optional`: the lead's
       own row, which never dates a round the team ran later. */
    const CHECKIN_SELECT = { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true, availableFrom: true, startedAt: true, isFinal: true, isSetup: true, specificityLevel: true, specificityDimensions: true, closedReason: true, optional: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } } } as const;

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
        /* Whose number it is, so the page can group them rather than stack nine of one person's
           beside the team's - see the target table on the Context page. */
        objectives: { select: { id: true, name: true, target: true, ownerParticipantId: true, assumes: true, isADecisionAboutAPerson: true }, orderBy: { sortOrder: 'asc' } },
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
        report: { select: { id: true, releasedAt: true, releasedSessions: true, sharedPicture: true, theOpening: true, createdAt: true, agreements: true, divergences: true, sharedAs: true } },
        /*
         * WHICH ROUNDS HAVE CLOSED, as recorded, so the page stops working it out.
         *
         * GroundAdminPage counted the non-managing participants and the COMPLETED check-ins at the
         * open session number and compared them, on every render. That is the round-closing rule,
         * living on a screen - which meant the server did not know a round had closed, and any
         * second screen wanting the same answer would have had to implement it again.
         */
        roundCompletions: { select: { sessionNumber: true, completedAt: true }, orderBy: { sessionNumber: 'asc' } },
        /*
         * THE OUTCOME, NOT THE WHOLE ROW (U.11). The row now holds the lead's reason, which is read
         * through the resolution read only, where who may read it is checked. Passing the row through
         * here would hand it to every reader of the check-in.
         */
        resolution: { select: RESOLUTION_ON_THE_GROUND },
        patternDetections: {
          select: PATTERN_ROW_SELECT,
          orderBy: { lastSeenAt: 'desc' },
          take: 60,
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
            /* Whose number it is, so the page can group them rather than stack nine of one person's
           beside the team's - see the target table on the Context page. */
        objectives: { select: { id: true, name: true, target: true, ownerParticipantId: true, assumes: true, isADecisionAboutAPerson: true }, orderBy: { sortOrder: 'asc' } },
            /**
             * `agreements` and `divergences` are here because `alignmentRead` COUNTS them, and
             * without them in the select it could only ever return null - so the ground page said
             * "No read yet" about a released report while the grounds list, whose query does fetch
             * them, printed "4 agreed, 2 still open" for the same ground on the previous screen.
             *
             * Found by reading both payloads for one ground rather than either page on its own.
             */
            report: { select: { id: true, releasedAt: true, releasedSessions: true, sharedPicture: true, theOpening: true, createdAt: true, agreements: true, divergences: true, sharedAs: true } },
            /* Same include as the primary query above. TypeScript refused the two shapes when this
               was added to only one of them, which is the check the comment above wishes it had. */
            roundCompletions: { select: { sessionNumber: true, completedAt: true }, orderBy: { sessionNumber: 'asc' } },
            resolution: { select: RESOLUTION_ON_THE_GROUND },
            patternDetections: {
              select: PATTERN_ROW_SELECT,
              orderBy: { lastSeenAt: 'desc' },
              take: 60,
            },
          },
        });
      }
    }

    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Somebody already here, added by their address, is named by their membership (user journeys, F-7). */
    await withTheirNamesFromTheOrganisation(this.prisma as any, (ground as any).organizationId, (ground.participants ?? []) as any);

    /* How checkable each check-in was is a read of that person's answers, so each reader keeps
       their own and nobody else's. See how-checkable-is-yours-alone. */
    (ground as any).checkIns = howCheckableIsYoursAlone(
      (ground.checkIns ?? []) as any[],
      (ground.participants ?? []) as any[],
      requestingUserId,
    );

    // Computed display fields - derived here so the client never needs to repeat the logic.
    const alignment = alignmentRead((ground as any).report);

    /* From the start date when there is one - see when-the-clock-starts.ts. This read createdAt, so
       a check-in set up three weeks before the person arrives spent three weeks counting down. */
    const daysLeft = daysRemaining(ground as any, new Date());
    /* AND THE DAY IT ENDS, AS A DATE. Hafsah, 22 Sep 2026: the check-in set up from the entry chat "still
       doesn't have an end date" - it had one, as a count of days from a start nobody could see, and the
       header only spoke up in the last three of them. The same clock, read as a date, for every check-in. */
    const endsOn = deadlineOf(ground as any);
    /*
     * ONE COUNT FOR THE SESSIONS, THE BOARD'S OWN (request 101 f). Read from every check-in row before any
     * reader's wall, because it names and counts nobody: the open round among the people who check in,
     * capped at the last planned session, as the board's header and the list count it.
     */
    const sessionClock = theSessionClock(
      (((ground as any).checkIns ?? []) as any[]).filter((c) => !c.isSetup),
      /* Nobody an admin has not let in yet holds the clock back (decision 77). */
      new Set((((ground as any).participants ?? []) as any[]).filter((p) => !p.managingOnly && !isNotLetInYet(p)).map((p) => p.id)),
      totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null,
    );

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

    /*
     * WHAT KEEPS COMING UP, ON THE CHECK-IN'S OWN PAGE, UNDER THE SAME RULES AS THE BOARD.
     *
     * This feed served the ten latest SURFACED rows on the ground to every reader of the page, with
     * the code and a "Pattern" badge, so a participant read a colleague's pattern and anybody read
     * good news seen once. It is now the reader's own patterns, or everybody's for whoever runs the
     * check-in, after three periods, in plain words, built by patterns/who-reads-a-pattern. Nothing
     * at all while patterns are not served, and then not even the reader lookup is made.
     */
    const signals = PATTERNS_ARE_SERVED && !heldButAnswered
      ? await (async () => {
          const namesForPatterns = whoIsWhoIn(ground.participants as any, ground.initiatorId, (ground as any).cadence);
          const served = servedPatterns(
            ground.patternDetections as any,
            await this.patternReaderOf(ground as any, requestingUserId),
            namesForPatterns,
          );
          /* Opening a page never asks the model (decision 7): kept wording only, from the same
             cache the warm-up (ReportsService.wordTheReadsFor, BoardService.get) fills. */
          const worded = await wordPatternEvidence(
            served,
            namesForPatterns.firstNameOf ?? (() => null),
            rememberedCompose(this.prisma, async () => null, false),
          ).catch(() => served);
          return worded.map((p) => ({ ...p, groundId: id }));
        })()
      : [];
    /* The person reading their own for the first time starts the clock on when the lead may read it. */
    await markShownToThePerson(this.prisma as any, theOnesTheyAreSeeingFirst(ground.patternDetections as any, signals));

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

    /* What the people in it read about what this is for, and whose words those are (U.7 review). */
    const briefAsEveryoneReadsIt: string | null = whatSomeoneWhoDoesNotRunItReads({ brief, toldToParticipants: (ground as any).toldToParticipants, scenario: (ground as any).scenario });
    const briefChange = rawLog && !Array.isArray(rawLog) && typeof rawLog === 'object' ? (rawLog as any).briefChangedBy ?? null : null;
    const changedBySomebodyElse = !!briefChange?.userId && briefChange.userId !== ground.initiatorId;
    /*
     * WHAT THE LEAD TYPED IN SETUP (U.7 re-check). Handed over only to the reader who leads this
     * check-in and is also the person who typed it; nobody else is sent the text. Its existence also
     * says the brief was put together by setup from her answers, so while nobody has rewritten it the
     * brief is not "her words".
     */
    const setupWords: { authorUserId: string; text: string } | null =
      await ((this.prisma as any).leadSetupWords?.findUnique?.({ where: { groundId: id }, select: { authorUserId: true, text: true } }) ?? Promise.resolve(null)).catch(() => null);
    const briefWasPutTogetherBySetup = !briefChange?.userId && !!setupWords;
    const briefIsTheLeadsOwnWords = !!briefAsEveryoneReadsIt && !changedBySomebodyElse && !briefWasPutTogetherBySetup
      && briefAsEveryoneReadsIt === (typeof brief === 'string' ? brief.trim() : '');

    const briefChangedBy: { firstName: string | null; isYou: boolean; isTheLead: boolean } | null = briefChange?.userId
      ? {
          isYou: briefChange.userId === requestingUserId,
          isTheLead: briefChange.userId === ground.initiatorId,
          firstName: await this.prisma.user
            .findUnique({ where: { id: briefChange.userId }, select: { firstName: true } })
            .then((u: any) => (u?.firstName ?? '').trim() || null)
            .catch(() => null),
        }
      : null;

    const rawTimeline: any[] =
      rawLog && !Array.isArray(rawLog) && typeof rawLog === 'object' ? (rawLog as any).timeline ?? [] : Array.isArray(rawLog) ? rawLog : [];
    /*
     * WHO CHANGED IT, NEVER RESOLVED TO A NAME (U.4 re-review, item 5; the-audit-log-has-a-reader.spec.ts
     * is the test that keeps it that way). Peer visibility can be off on this ground, and resolving
     * `changedBy` to a name here would walk straight around it - a party who is not supposed to know
     * who else is here would learn one from a settings page. `updateTimeline`'s own guard only ever
     * lets the lead or an admin of the organisation make this change, so those - and the reader
     * themselves, when it was them - are the only three anybody needs: "you", "the lead" or "an
     * admin" is true either way, and the page turns each into its own plain sentence.
     *
     * "PARTY" IS GONE. It read as work jargon on the page ("Changed by the party on..."), which is
     * exactly the plain-English rule this file otherwise keeps.
     */
    const settingsChanges = rawTimeline
      .filter(e => e && e.changedAt)
      .map(e => {
        /* STORED IN DAYS, READ AS WEEKS. `updateTimeline` writes `changes.timelineDays` - the one
           authoritative timeline, in days (see the comment there) - but this used to read
           `changes.timelineWeeks`, a key nothing ever wrote, so the week-to-week change this page
           promises to show never actually appeared. */
        const days = e.changes?.timelineDays;
        return {
          changedAt: e.changedAt,
          by: e.changedBy === requestingUserId ? ('you' as const)
            : e.changedBy === ground.initiatorId ? ('lead' as const)
            : ('admin' as const),
          weeks: days ? { from: days.from ? Math.round(days.from / 7) : null, to: days.to != null ? Math.round(days.to / 7) : null } : null,
          /* True when this change made it run until the lead ends it. */
          untilItIsEnded: e.changes?.runsUntilEnded?.to === true,
          cadence: e.changes?.cadence ?? null,
        };
      });

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
    /* Whoever runs it or administers it reads a goal not told: the lead, the admin who set it up and every admin of the organisation (decisions 5 and 86; board/an-untold-goal-is-not-a-board-objective). */
    const viewerRunsIt = theyRunThisCheckIn({ userId: requestingUserId, role: (mayRead as any)?.viewerRole, organizationId }, ground as any);
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
      ? await this.prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true, organizationId: true, email: true } })
      : null;
    /* An admin of a DIFFERENT organisation is a stranger, and this is not the rule to hand them. */
    const viewerAdminsThisOrg = adminsThisOrg({ ...viewer, userId: requestingUserId }, ground as any);
    /* Decision 75, item 2: the admin asked to approve an evaluation check-in reads it as an admin with access
       does. Reading only: the join link below, a write power, still asks `viewerAdminsThisOrg`. */
    const viewerReadsAsAnAdmin = viewerAdminsThisOrg || askedToApproveIt({ ...viewer, userId: requestingUserId }, ground as any);
    const viewerRunsThisGround = viewerIsInitiator || !!viewerReadsAsAnAdmin;
    /*
     * WHO MAY CHANGE THE SETUP, THE BRIEF INCLUDED (request 104, decisions 63 and 72): the lead, or an
     * admin of this organisation once the lead's account shows they have left. Worked out by the same
     * function the writers use, so the screen offers "Rewrite" to exactly whoever the server lets
     * through. The lead's account is read only when the reader is an admin here and not the lead. A
     * lead whose account says nothing either way is counted as present: nobody is let in on a guess.
     */
    const mayChangeSetup = viewerIsInitiator
      ? true
      : viewerAdminsThisOrg && ground.initiatorId
        ? await (async () => {
          const lead = await (this.prisma as any).user.findUnique({ where: { id: ground.initiatorId }, select: { isActive: true, firstName: true, lastName: true } }).catch(() => null);
          return whoMayConfirmSetup(requestingUserId, ground as any, {
            lead: lead ? { ...lead, isActive: lead.isActive !== false } : null,
            confirmer: viewer as any,
            organizationId: (ground as any).organizationId ?? null,
          }).allowed;
        })()
        : false;
    /* Whether the session the stored report holds now has been released (decision 76, item 4). */
    const teamPictureNowShared = viewerRunsThisGround ? true : await isTheTeamPictureNowShared(this.prisma, id, (ground as any).report);

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
    /* One copy of the rule, shared with the board, the reports and the interview. See peers-are-named. */
    const peersVisible = peersAreNamedOn(ground as any, theReaderBySignIn(ground as any, requestingUserId));
    const hidePeers = !peersVisible && !viewerRunsThisGround;

    /**
     * WHAT EACH PERSON IS WORKING TOWARDS, WITH ITS AUTHORSHIP ATTACHED.
     *
     * `describeObjective` and `mayBeReadAgainst` come from the module that had no data: the state travels
     * with the text, always, because "your objective is X" and "your manager has suggested X and you
     * have not replied" are different statements and the difference is the whole point.
     */
    /* A goal the lead has not told the person about reaches the lead alone. See a-goal-not-told-stays-with-the-lead. */
    const objectiveRowsAsStored = await this.prisma.personObjective.findMany({
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
        dueDate: true, status: true, createdAt: true,
      },
    });
    let objectiveRows = goalsThisReaderMaySee(objectiveRowsAsStored, viewerRunsIt);
    /*
     * A goal past its week (item 4 below) is no longer scrubbed out of every other sentence: the
     * person is now told, plainly, that it exists - so its words stop needing to be kept out of the
     * rest of what they read. Still never its full raw sentence, only the area-of-work placeholder
     * built below.
     */
    const goalsNotToldHere = viewerRunsIt
      ? []
      : objectiveRowsAsStored.filter((o: any) => notToldYet(o) && !aWeekHasPassedSinceNotTold(o)).map((o) => o.text ?? '');
    /*
     * DECISION 56, ITEM 4. Once a week has passed still not told, the person reads it plainly here
     * too, on their own check-in page, not only on their You board: who set it, and the worded area
     * - never the number, never the raw sentence.
     */
    if (!viewerRunsIt && requestingUserId) {
      const viewerParticipantId = (ground.participants ?? []).find((p: any) => p.userId === requestingUserId)?.id ?? null;
      const dueAWeek = objectiveRowsAsStored.filter((o: any) => o.participantId === viewerParticipantId && aWeekHasPassedSinceNotTold(o));
      if (dueAWeek.length) {
        const leadFirst = theFirstNameOfAParticipant((ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')) || 'Your lead';
        const worded = await Promise.all(dueAWeek.map(async (o: any) => ({
          ...o,
          /* The plain sentence only - never the lead's own private note about telling them
             (`awarenessDetail`), which stays the lead's alone like any other private note. */
          text: whatThePersonReadsAfterAWeek(leadFirst, await areaOfGoalOrFallback(this.prisma, o.text ?? '')),
          awarenessDetail: null,
        })));
        objectiveRows = [...objectiveRows, ...worded];
      }
    }
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
    /* Whoever runs it reads each person's goals: the lead, and the admins who read the check-in, by the same rule as everywhere else (decisions 5, 56 and 86; privacy sweep finding 4). */
    const peersKeepTheirNumbers =
      !viewerRunsIt && ((ground as any).whoSeesTargets ?? 'THEIR_OWN') !== 'EVERYBODY';

    /**
     * THE LEAD'S FIRST NAME, TO ANYONE IN THE CHECK-IN, EVEN WHEN THE PEER RULE HIDES EVERYONE ELSE.
     *
     * `participantsWithCheckIns` below filters the lead's own row out of `participants` for a
     * participant on a hidden check-in - that is the peer rule doing its job, and it must keep doing
     * it. But three sentences on the screens ("Rukia knows who is here", "Rukia also answers a
     * check-in") looked the lead up IN that same filtered list, so the name silently fell back to
     * "Your lead" on exactly the check-ins the peer rule protects (U.8 fourth review).
     *
     * The invitation a participant read to get here already named the lead in full ("Rukia Otieno
     * invited you"), so her first name is not new information to anyone reading this - only her
     * first name goes out, and nothing else about her (no email, no role, no status).
     *
     * `leadAnswersToo` carries the one other fact those sentences need and the filtered list can no
     * longer supply: whether the lead is a party who answers a check-in herself, or manages without
     * one (`managingOnly`). Read here, off the RAW participants, before the peer filter runs.
     *
     * ONLY HER FIRST WORD (U.8 fifth review). Signup asks for "Your name" in one field and stores
     * whatever was typed as `firstName` (AuthPage.tsx, auth.service.ts), so a lead who signed up as
     * "Rukia Otieno" had that whole string sitting in a field called `leadFirstName` - which is not
     * what it says it is, and prints her surname in a sentence ("Rukia Otieno also answers a
     * check-in.") that the prototype never puts a surname in. Trimmed to one word here, at the one
     * place this field is built, rather than by every reader of it.
     */
    const leadParticipantRaw = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR') as any;
    const leadFirstName = theFirstNameOfAParticipant(leadParticipantRaw);
    const leadAnswersToo = !!leadParticipantRaw?.userId && !leadParticipantRaw?.managingOnly;
    /**
     * WHETHER A TEAM REPORT COMES FROM THIS AT ALL - A BOOLEAN, NOT A COUNT (U.8 fifth review).
     *
     * The Done page decides "Two reports come from this" / "The team's report" card from
     * `howManyAnswer(ground) > 1`, which counts `ground.participants` - the exact array the peer
     * rule reduces to the reader's own row alone on a hidden check-in. A participant there read
     * "Your own report" with no team card at all, whatever the true size of the team, because the
     * filtered list she was handed always looked like a check-in of one.
     *
     * Read here off the RAW participants, same as `leadFirstName` above, and sent as a plain yes/no:
     * whether more than one party answers, never how many. A hidden check-in must not learn its own
     * size from a field meant to answer a different question.
     */
    const aTeamReportComes = (ground.participants ?? []).filter((p: any) => !p.managingOnly).length > 1;

    /*
     * "NOT LET IN", ON THIS CHECK-IN'S OWN ROSTER TOO (U.4 review, item 2). `awaitingOrgApproval`
     * alone reads "waiting for an admin" for good, even once this organisation has actually said no
     * - the same gap `notLetIn` closes on the People page (users.service.ts). Read here the same
     * way: this organisation's latest request for each waiting person decides it. Who decided, and
     * when, is included only for whoever runs this check-in or an admin here - the same reader who
     * can already see it, one click away, on that person's own People page.
     */
    const notLetInAwaitingIds = (ground.participants ?? [])
      .filter((p: any) => !!p.userId && p.user?.awaitingOrgApproval)
      .map((p: any) => p.userId as string);
    const notLetInByUser = new Map<string, { decidedByUserId: string | null; decidedAt: Date | null }>();
    if (notLetInAwaitingIds.length) {
      const requests = await this.prisma.membershipRequest.findMany({
        where: { organizationId, userId: { in: notLetInAwaitingIds } },
        orderBy: { createdAt: 'desc' },
        select: { userId: true, status: true, decidedByUserId: true, decidedAt: true },
      });
      const decided = new Set<string>();
      for (const r of requests) {
        if (decided.has(r.userId)) continue;
        decided.add(r.userId);
        if (r.status === 'DECLINED') notLetInByUser.set(r.userId, { decidedByUserId: r.decidedByUserId, decidedAt: r.decidedAt });
      }
    }
    const canReadWhoDecided = viewerIsInitiator || !!viewerReadsAsAnAdmin;
    const decidersById = new Map<string, string | null>();
    if (canReadWhoDecided && notLetInByUser.size) {
      const deciderIds = [...new Set([...notLetInByUser.values()].map((d) => d.decidedByUserId).filter((x): x is string => !!x))];
      if (deciderIds.length) {
        const deciders = await this.prisma.user.findMany({ where: { id: { in: deciderIds } }, select: { id: true, firstName: true, lastName: true } });
        for (const d of deciders) decidersById.set(d.id, [d.firstName, d.lastName].filter(Boolean).join(' ').trim() || null);
      }
    }

    const participantsWithCheckIns = (ground.participants ?? [])
      .filter((p: any) => !hidePeers || (!!requestingUserId && p.userId === requestingUserId))
      .map((p: any) => {
      const raw = sharedArtifactById.get(p.id);
      const isSelf = !!requestingUserId && p.userId === requestingUserId;
      /* Somebody else's expectations, on a check-in that keeps numbers to their owner. */
      const withholdTheirNumbers = peersKeepTheirNumbers && !isSelf;
      const notLetInInfo = p.userId ? notLetInByUser.get(p.userId) : undefined;
      return {
        ...p,
        notLetIn: !!notLetInInfo,
        /* Not let in yet, still waiting or declined: not counted in "N of M" nor waited on (decision 77). */
        notLetInYet: isNotLetInYet(p),
        notLetInBy: notLetInInfo && canReadWhoDecided ? (decidersById.get(notLetInInfo.decidedByUserId ?? '') ?? null) : null,
        notLetInAt: notLetInInfo && canReadWhoDecided ? (notLetInInfo.decidedAt ?? null) : null,
        email: hideContact && !isSelf && !viewerIsInitiator ? null : p.email,
        /* The lead's words about a person reach the lead alone: not a participant, not an admin
           (U.7 review). See the-leads-words-about-someone.ts. */
        roleAsDescribed: theLeadsWordsAbout(p, viewerIsInitiator),
        soloArtifactShared: p.soloArtifactShared ?? false,
        // Only expose the content when the participant explicitly shared it
        sharedSoloReport: raw
          ? thePrivateSummaryAsRead(raw)
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
            described: describeObjective(shaped, { isThePerson: isSelf, theirName: theFirstNameOfAParticipant(p) || null, theLeadsName: leadFirstName || null }),
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
            /* The lead's own note on whether it was told: hers alone, and so only to whoever runs the check-in (it was served to the person and, on a check-in where everybody reads everybody's goals, to colleagues). */
            awarenessDetail: viewerRunsIt ? ((row as any)?.awarenessDetail ?? null) : null,
            /**
             * DECISION 56, ITEM 1. The prototype's own flag ("Not told yet", Context page): true only
             * for a goal the lead wrote and has not told this person about. Served here whatever the
             * reader is, because `withholdTheirNumbers`/the peer rule above already decide whether
             * this row reaches them at all - a colleague who cannot see the goal cannot see this flag
             * either, since `row` is undefined for them.
             */
            notToldYet: notToldYet(row as any),
            /**
             * DECISION 56, ITEM 3. Wherever this goal counts against the person - and it does, this
             * flag changes nothing about that - the lead is shown it as a conversation point, so
             * nothing is read into it before they have talked it through. The person's own name,
             * never a pronoun.
             */
            conversationPoint: notToldYet(row as any) ? theConversationPointForTheLead(theFirstNameOfAParticipant(p) || 'This person') : null,
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
              awarenessDetail: viewerRunsIt ? ((o as any).awarenessDetail ?? null) : null,
              alignment: (o as any).alignment ?? null,
              alignmentNote: (o as any).alignmentNote ?? null,
              objection: (o as any).objection ?? null,
              seenBySubject: o.seenBySubject,
              /* Decision 56, item 1 - see the single-expectation shape above. */
              notToldYet: notToldYet(o as any),
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
    const readerIsFromOutside = sessionProgress && Object.keys(sessionProgress.awayUntil ?? {}).length
      ? await isFromOutside(this.prisma, requestingUserId, ground.organizationId)
      : false;
    const requestingUserIsMissing = !!(
      sessionProgress && requestingParticipant && sessionProgress.missingParticipantIds.includes(requestingParticipant.id)
    );
    /**
     * WHETHER THIS ROUND ALREADY HAS TWO PEOPLE COUNTED IN IT - A YES/NO, NOT A COUNT (U.8 fifth
     * review). GroundParticipantPage's Report tab says "The shared report compares two accounts...
     * It will build once the person running this check-in adds somebody" from
     * `whoIsInRound(ground.participants, ...).length < 2` - the same `ground.participants` a hidden
     * check-in reduces to the reader's own row alone, so a real team of four read that notice
     * forever. Read here off the RAW participants, with the same rule the client's `countsInRound`
     * uses (a managing-only lead counts in round one, unless the scenario is one where the lead
     * only asks and never answers - `waitsOnAManagingOnlyLead`), so this agrees with the client's own
     * rule rather than a cruder count.
     */
    const roundSessionNumber = sessionProgress?.sessionNumber ?? 1;
    /* Who is ON the check-in, for the rule that a shared report needs two: the lead stays one of the
       people in it even in a round they chose not to check in (decision 133), as isSessionReadyForReport reads it. */
    const atLeastTwoInThisRound = (ground.participants ?? []).filter((p: any) =>
      !p.managingOnly || waitsOnAManagingOnlyLead((ground as any).scenario, roundSessionNumber),
    ).length > 1;

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
          select: { id: true, participantId: true, text: true, createdAt: true, audience: true, confirmedByAdminNote: true },
          orderBy: { createdAt: 'asc' },
        })
      : await this.prisma.leadContextNote.findMany({
          where: { groundId: id, audience: ContextNoteAudience.EVERYONE },
          select: { id: true, participantId: true, text: true, createdAt: true, audience: true, confirmedByAdminNote: true },
          orderBy: { createdAt: 'asc' },
        });

    /*
     * WHAT THIS CHECK-IN KNOWS, AS LINES, FILTERED FOR WHOEVER IS READING.
     *
     * The lead sees every line including their own read of each person; everybody else sees the work
     * buckets that were shared and nothing about anybody. One rule, in one module, so the page and
     * the prompt cannot disagree about it - see what-this-check-in-knows.
     */
    const contextLines = await (this.prisma.groundContextItem?.findMany?.({
      where: { groundId: id },
      select: { id: true, kind: true, text: true, saidAs: true, audience: true, aboutParticipantId: true, closedAt: true, createdAt: true, exactQuestion: true, questionConfirmedAt: true, confirmedByAdminNote: true },
      orderBy: { createdAt: 'asc' },
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
    const theLeadReadsThese = isInitiatorViewer || viewerReadsAsAnAdmin;
    /* A file only its owner can open is not named on a line everybody reads, including a note already
       stored with the name in it (request 46; see documents/a-private-file-is-not-named). */
    const privateFileNamesHere = theLeadReadsThese ? [] : namesNotEverybodyMayOpen(
      await (this.prisma.groundDocument?.findMany?.({ where: { groundId: id }, select: { fileName: true, visibility: true } }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
    );
    const contextItems = theLinesFor(contextLines as any, { isTheLead: theLeadReadsThese })
      .map((l: any) => (privateFileNamesHere.length ? { ...l, text: withoutPrivateFileNames(l.text ?? '', privateFileNamesHere) } : l));
    /* The lead's questions for people, one card each: never built for anybody else. See questionsForPeople. */
    const questionsForPeople = (isInitiatorViewer || viewerReadsAsAnAdmin) ? await this.theQuestionsForPeople(id).catch(() => []) : undefined;
    /*
     * AND WHAT THE LEAD SAYS IS NOT SETTLED ABOUT A TARGET, BESIDE THE TARGET.
     *
     * The board learnt this first; the Context page is where a lead sets the numbers, so it is the
     * page where a number nobody has defined most needs to say so. Same read, same module.
     */
    const notSettledSaid = (contextLines as any[])
      .filter((l) => l.kind === 'UNSETTLED' && !l.closedAt)
      .map((l) => (l.text ?? '').trim())
      .filter(Boolean);

    /*
     * WHAT PEOPLE ARE DOWN AS DOING, ON THE PAGE THE LEAD READS.
     *
     * The actions a paste writes had a table and no surface: a lead could see thirteen targets and
     * none of the nineteen things somebody was supposed to do. Status is whatever it is - UNKNOWN
     * until a person says - and the unowned ones are listed as unowned rather than tidied away.
     */
    /*
     * REVIEW ROUND 3, ITEM 5 (SCREENS WORKSPACE): `settledAt` EXPOSED, NOT COMPUTED.
     * The column has existed since week 9 ("kept in the last four weeks" counts by when a
     * commitment was settled, not when it was promised) but was never selected here, so My work's
     * "promises kept this month" tile had nothing to read. This is the same column, added to the
     * same select - no new logic, nothing about how a commitment is judged.
     */
    const commitments = await (this.prisma.groundCommitment?.findMany?.({
      where: { groundId: id },
      select: { id: true, participantId: true, text: true, whenSaid: true, explicit: true, status: true, settledAt: true },
      orderBy: { createdAt: 'asc' },
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);

    /*
     * WHAT EACH PERSON SAID THEY WOULD SHOW, for the slot on their own card.
     *
     * Her instruction: a participant needs to see the things they agreed to share, on the page where
     * they can attach them. One read over what already existed - see what-they-said-they-would-show.
     */
    const [deliveries, docsForAsks] = await Promise.all([
      this.prisma.delivery?.findMany?.({
        where: { groundId: id },
        select: { id: true, participantId: true, text: true, evidence: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      })?.catch(() => [] as any[]) ?? Promise.resolve([] as any[]),
      /* Optional-chained like its neighbour: a test double with no document table is not a reason a
         page cannot render, and this list only decides whether an ask has been met. */
      this.prisma.groundDocument?.findMany?.({ where: { groundId: id }, select: { participantId: true, createdAt: true } })?.catch(() => [] as any[]) ?? Promise.resolve([] as any[]),
    ]);
    const asks: Record<string, ReturnType<typeof whatTheyStillOweAShow>> = {};
    for (const p of (ground.participants ?? []) as any[]) {
      if (p.managingOnly) continue;
      const theirs = whatTheyStillOweAShow(
        (deliveries as any[]).filter((d) => d.participantId === p.id),
        (commitments as any[]).filter((c) => c.participantId === p.id),
        (docsForAsks as any[]).filter((d) => d.participantId === p.id),
      );
      if (theirs.length) asks[p.id] = theirs;
    }

    /* The raw audit log stays in the server: what anybody needs from it is read out above, as
       `contextNotes`, `settingsChanges` and who changed the brief. It holds user ids (U.7 review). */
    const { patternDetections: _pd, groundAuditLog: _audit, ...rest } = ground as any;
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
    /* AND NO SENTENCE WITH A COLLEAGUE'S HIDDEN TARGET, in any text on this page: the brief, the
       report's words, a note. The same rule the report and the board apply, over the whole read, so a
       field added later is covered by being served. See board/a-hidden-target-stays-hidden. */
    /* And no sentence carrying a goal the lead has not told its person about (a-goal-not-told-stays-with-the-lead). */
    const objectivesNotToldHere = new Set(
      ((ground as any).objectives ?? []).filter((o: any) => !withoutWhatTheLeadHasNotToldThemAbout([o], objectiveRowsAsStored as any[], (ground.participants ?? []) as any[], viewerRunsIt).kept.length).map((o: any) => o.id),
    );
    const thePage = withoutGoalsNotToldIn(this.withoutTheTargetsHiddenFrom(ground as any, requestingUserId, {
      ...rest,
      /*
       * WHAT THE ROOM IS ABOUT, AS THIS READER MAY READ IT (privacy sweep finding 2, decisions 17 and 75 item 14). Stored with
       * every person's full name, and served raw: a cohort colleague read the other borrowers by name beside their aims, and the
       * person on a first-90-days check-in read the colleague giving views. The board's own read, shared: see
       * board/the-room-for-this-reader.
       */
      ...((rest as any).whatTheRoomIsAbout
        ? {
            whatTheRoomIsAbout: theRoomForThisReader((rest as any).whatTheRoomIsAbout, {
              participants: (ground.participants ?? []) as any[],
              me: ((ground.participants ?? []) as any[]).find((p: any) => !!requestingUserId && p.userId === requestingUserId) ?? null,
              initiatorId: ground.initiatorId,
              viewerRunsIt: viewerRunsThisGround,
              wallOffTheOthers: hidePeers,
              evaluation: isEvaluationCheckIn((ground as any).scenario),
            }),
          }
        : {}),
      /* Until the lead ends it: no length to show. The flag says so (request 37). */
      timelineDays: (rest as any).runsUntilEnded ? null : (rest as any).timelineDays,
      /* Everyone on the check-in may see what is to be done; only the lead's private notes are walled. */
      commitments,
      /* The buckets. Already filtered above: a participant is never sent a line about anybody. */
      contextItems,
      /* The lead's alone, and absent - not empty - for everybody else. */
      ...(questionsForPeople ? { questionsForPeople } : {}),
      /* What each person is still to show, keyed by participant. Everybody may see these: a promise
         to hand something over was made out loud, and the page is where it is kept. */
      asks,
      /*
       * AND WHOSE NUMBERS THIS READER MAY SEE, WHICH THIS FIELD WAS NOT ASKING.
       *
       * `peersKeepTheirNumbers` above narrows `participants[].objective` - somebody else's
       * EXPECTATIONS - and it was written for exactly this symptom: "In the check-in itself Rita was
       * shown the team's 500 and her own 150... On the Context tab of the same check-in, one tap
       * away, she was shown Kunle's 150, Amir's 150 and the lead's 50."
       *
       * It fixed one of the two fields. The targets table added on 22-23 September reads THIS one,
       * selected with `ownerParticipantId` for every row and filtered by nobody, so the same leak
       * came back through a different field on the same page. Asked of the read on 23 September
       * 2026: a participant on a THEIR_OWN ground was handed two numbers that were not hers.
       *
       * THROUGH `targetsFor`, which is where this rule is written and has been since owners existed.
       * It had one caller - the conversation - so the rule was right, used once, and ignored by the
       * two other surfaces that show targets. Passing the same `viewerIsInitiator` the expectations
       * path uses, so the two fields on one response cannot disagree about one reader.
       */
      objectives: targetsFor(
        ((ground as any).objectives ?? []) as any[],
        (ground.participants ?? []).find((p: any) => !!requestingUserId && p.userId === requestingUserId)?.id ?? null,
        ((ground as any).whoSeesTargets ?? 'THEIR_OWN') === 'EVERYBODY' ? 'everybody' : 'their own',
        { isLead: viewerIsInitiator, seesEveryShare: viewerRunsThisGround },
      /* And none that is a goal the lead has not told its person about (decisions 48 and 56): the board already left it out, and this page said it in full. */
      ).shown.filter((o: any) => !objectivesNotToldHere.has(o.id)).map((o: any) => ({
        ...o,
        notSettled: whatIsNotSettledAbout({ name: o.name, target: o.target }, notSettledSaid),
        /* Whoever runs the check-in is told which targets are kept from the people until the lead tells them, so the page does not say "seen by everyone" of one. Absent for everybody else. */
        ...(viewerRunsIt && !withoutWhatTheLeadHasNotToldThemAbout([o], objectiveRowsAsStored as any[], (ground.participants ?? []) as any[], false).kept.length ? { notToldYet: true } : {}),
      })),
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
      /*
       * AND ONLY TO WHOEVER MAY READ IT YET (U.5 review). A participant was sent the report's shared
       * picture while `releasedAt` was still null: the lead's whole account of the team, before the
       * report was shared with them. Somebody who does not run the check-in now gets nothing of the
       * report's text until it is released, and never the raw agreements and differences, which the
       * report page serves them through the reports service in the form they may read.
       */
      report: (rest as any).report
        ? (() => {
            const r = (rest as any).report;
            const me = (ground.participants ?? []).find((p: any) => !!requestingUserId && p.userId === requestingUserId) as any;
            /* The text only to whoever may read it yet, and always through the report's own door. The
               stored text is the picture of the session the report holds now, so somebody who does
               not run the check-in reads it only once that session is released (decision 76, item 4). */
            const mayRead = viewerRunsThisGround || teamPictureNowShared;
            const text = mayRead
              ? this.reportTextAsItWasShared(ground as any, { sharedPicture: r.sharedPicture, theOpening: r.theOpening }, r.sharedAs, me?.id ?? null, viewerRunsThisGround)
              : null;
            /*
             * AND THE STAND-IN LABELS NEVER, WHICHEVER FIELD THEY RIDE IN (decision 139, item 1). The text went through the
             * door, but whoever runs the check-in was handed the stored agreements and differences beside it, as they were
             * kept: "The price list has been sent by Participant B." on the lead's and the admin's check-in page, five weeks
             * running (final evaluation, profiles 4 and 5). They go through the same door now, and the whole report is
             * walked last, so a label nothing named is said the way this reader may call that person.
             */
            const called = whatThisReaderCallsEachLabel((ground.participants ?? []) as any[], {
              participantId: me?.id ?? null,
              isLead: viewerRunsThisGround,
              peersAreNamed: peersAreNamedOn(ground as any, { participantId: me?.id ?? null }),
              sharedWithoutNames: r.sharedAs === 'ANONYMOUS',
            });
            if (viewerRunsThisGround) {
              const { sharedAs: _as, ...whole } = r;
              const lists = this.reportListsAsItWasShared(ground as any, { agreements: r.agreements, divergences: r.divergences }, r.sharedAs, me?.id ?? null, true);
              return noStandInLabelAnywhereIn({ ...whole, ...lists, sharedPicture: text?.sharedPicture ?? null, theOpening: text?.theOpening ?? null }, called);
            }
            return noStandInLabelAnywhereIn({
              id: r.id,
              releasedAt: r.releasedAt ?? null,
              releasedSessions: releasedSessionsOf(r) ?? [],
              createdAt: r.createdAt,
              ...(mayRead ? { sharedPicture: text?.sharedPicture ?? null, theOpening: text?.theOpening ?? null } : {}),
            }, called);
          })()
        : (rest as any).report,
      joinToken: mayShareJoinLink ? (rest as any).joinToken ?? null : null,
      /* The session rows follow the peer rule too, so a hidden colleague's statuses do not come by the back door. */
      checkIns: hidePeers
        ? ((rest as any).checkIns ?? []).filter((c: any) => participantsWithCheckIns.some((p: any) => p.id === c.participantId))
        : (rest as any).checkIns,
      participants: participantsWithCheckIns,
      /** The lead's first name alone, to anyone in the check-in - see the note on `leadFirstName` above. */
      leadFirstName,
      /** Whether the lead is also a party who answers a check-in, not only someone who manages it. */
      leadAnswersToo,
      /** Whether more than one party answers this check-in - a yes/no, not a count. See the note above. */
      aTeamReportComes,
      /** Whether this round already has two people counted in it - a yes/no. See the note above. */
      atLeastTwoInThisRound,
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
      peersDefaultVisible: peersAreNamedByDefaultOn(ground as any),
      /**
       * WHY THE SWITCH DOES NOT REACH EVERYBODY, in one plain sentence (decision 17). On a performance
       * plan, a recognition round or a contract renewal, the person reviewed is never told who else gave
       * a view, whatever the lead switched. Null on every other check-in.
       */
      whyThePersonReviewedIsNotTold: whyThePersonReviewedIsNotTold(ground as any),
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
      /* Whether this reader may change the setup and rewrite the brief (request 104). See above. */
      mayChangeSetup,
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
      endsOn,
      /* The header's count, from the board's own clock: "Session 1 of 12.", and the line for a later session
         somebody has started. Every reader gets the same sentences (request 101 f). */
      sessionClock,
      /*
       * WHO IS WAITING TO BE LET IN, APART FROM THE COUNT (decision 77): "Faraji Odhiambo is waiting to be
       * let in." To whoever runs it and an admin, every such person, by name or as a count where no name is
       * known. Never to a person who checks in, whether or not people see each other: whether somebody has
       * been let in is the organisation's business.
       */
      waitingToBeLetIn: await (async () => {
        /*
         * A PERSON WHO CHECKS IN READS IT TOO (decision 93, row 4), that somebody is waiting to be let in: by
         * name where people are named to each other, else as a count. Never that somebody was declined, never
         * who decided, and never to a guest from another organisation.
         */
        const aParticipantReadsIt = !canReadWhoDecided && !!requestingParticipant && !(await isFromOutside(this.prisma, requestingUserId, ground.organizationId));
        return theWaitingToBeLetInLine(
          ((ground.participants ?? []) as any[])
            .filter((p) => !p.managingOnly && isNotLetInYet(p) && p.id !== requestingParticipant?.id)
            .map((p) => ({
              name: canReadWhoDecided || peersVisible
                ? ([p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim() || null)
                : null,
              declined: !!(p.userId && notLetInByUser.has(p.userId)),
            }))
            .filter((w) => canReadWhoDecided || (aParticipantReadsIt && !w.declined)),
        );
      })(),
      /* The lead and the organisation's admins read the brief they wrote. A participant reads the
         situation and nothing that tells the product how to interview them. See
         what-a-participant-is-told-about-this. Goals are on the payload already, under objectives. */
      brief: viewerRunsThisGround ? theBriefAsTheLeadReadsIt(brief) : briefAsEveryoneReadsIt,
      /*
       * AND WHAT THE PEOPLE IN IT READ, TO WHOEVER RUNS IT (U.7 review). The Context page told the
       * lead "Your words, from setup. Everyone reads this before they answer." over her own words,
       * while her people were shown a different text: the short read Groundwork writes from the
       * brief, or its first sentences. The lead now reads what they read, and her own words stay
       * hers to rewrite. A participant already gets exactly this, as `brief`.
       */
      briefAsEveryoneReadsIt: viewerRunsThisGround ? briefAsEveryoneReadsIt : undefined,
      /* Whether what everyone reads is the lead's own words, unchanged by anybody else. */
      briefIsTheLeadsOwnWords,
      /* Who last rewrote it, to whoever runs the check-in: their first name, or "you". */
      briefChangedBy: viewerRunsThisGround ? briefChangedBy : undefined,
      /* Decision 72: when an admin rewrote it because the lead has left, everybody on the check-in
         is told who did it, in one plain sentence. Null otherwise. */
      briefChangedByAnAdmin: typeof briefChange?.byAnAdminSentence === 'string' ? briefChange.byAnAdminSentence : null,
      /* Whether the brief is still the one setup put together from the lead's answers. */
      briefPutTogetherBySetup: viewerRunsThisGround ? briefWasPutTogetherBySetup : undefined,
      /* What she typed in setup, to her alone (U.7 re-check). See LeadSetupWords. */
      leadsOwnSetupWords: viewerIsInitiator && setupWords && !!requestingUserId && setupWords.authorUserId === requestingUserId
        ? setupWords.text
        : undefined,
      signals,
      contextNotes,
      settingsChanges,
      baseline,
      leadContextNotes,
      org: org ?? null,
      /* A guest from another organisation is not told anybody's days away but their own (1 October 2026);
         the count still leaves the person out, without saying why. */
      sessionProgress: sessionProgress
        ? { ...sessionProgress, awayUntil: awayUntilAsServed(sessionProgress.awayUntil ?? {}, { fromOutside: readerIsFromOutside, myParticipantId: requestingParticipant?.id ?? null }), requestingUserIsMissing }
        : null,
      /* WHO IS AWAY, AND THAT THIS ROUND DOES NOT WAIT FOR THEM (week 23). Dates only, never a reason or
         a kind of leave. The lead reads it for each person; a colleague reads only that the person is
         away, and only for a person this reader is already shown by name; a person reads their own.
         Somebody from outside the organisation (a guest, decision 36) reads nobody's but their own. */
      whoIsAway: theAwayLinesFor(
        sessionProgress?.awayUntil ?? {},
        participantsWithCheckIns as any[],
        { viewerRunsThisGround, myParticipantId: requestingParticipant?.id ?? null, fromOutside: readerIsFromOutside },
      ),
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
    }, viewerRunsThisGround), [
      ...goalsNotToldHere,
      /* And the objectives the engine wrote from them, in its own words (decisions 48 and 56). A goal past its week is said as the area sentence, so its stored words are not kept out again. */
      ...theWordsOfWhatTheLeadHasNotToldThemAbout(((ground as any).objectives ?? []) as any[], objectiveRowsAsStored as any[], (ground.participants ?? []) as any[], viewerRunsIt)
        .filter((t) => !objectiveRowsAsStored.some((o: any) => aWeekHasPassedSinceNotTold(o) && (o.text ?? '') === t)),
    ]);
    /* A goal whose whole sentence carried a number this reader may not read is not left as a goal with no words (it is not served, and what the person's own row says is said plainly). */
    /* In an anchor check-in the lead's own set-up (her aim, what it will cover, what a complete answer holds) is hers alone (decision 96, item 8). */
    /* The reader's own first name, as a possessive, is "your": "Zawadi's first weeks" is "Your first weeks" to Zawadi (privacy sweep, 7 October). */
    const myFirstName = ((ground.participants ?? []) as any[]).find((p: any) => !!requestingUserId && p.userId === requestingUserId)?.user?.firstName ?? null;
    const asAMemberReadsIt = <P extends Record<string, any>>(page: P): P => {
      const out: any = withoutTheLeadsSetUpForAMember(page, { startedFrom: (ground as any).startedFrom ?? null, scenario: (ground as any).scenario ?? null, runsIt: viewerRunsThisGround });
      if (viewerRunsThisGround || !myFirstName) return out;
      return { ...out, label: theirOwnFirstNameAsYour(out.label, myFirstName), brief: theirOwnFirstNameAsYour(out.brief, myFirstName), ...(out.briefAsEveryoneReadsIt !== undefined ? { briefAsEveryoneReadsIt: theirOwnFirstNameAsYour(out.briefAsEveryoneReadsIt, myFirstName) } : {}) };
    };
    if (heldButAnswered && requestingUserId) return whatSomeoneHeldForASeatReads(asAMemberReadsIt(thePage), requestingUserId) as any;
    if (!Array.isArray((thePage as any).participants)) return asAMemberReadsIt(thePage);
    return asAMemberReadsIt({
      ...thePage,
      participants: ((thePage as any).participants as any[]).map((p: any) => {
        const o = p?.objective;
        if (!o || typeof o !== 'object') return p;
        const all = Array.isArray(o.all) ? o.all.filter((x: any) => typeof x?.text !== 'string' || x.text.trim()) : o.all;
        const blank = typeof o.text === 'string' && !o.text.trim();
        return { ...p, objective: { ...o, all, ...(blank ? { text: null, described: 'What this person is aiming for is set, and it carries a number you are not given on this page.' } : {}) } };
      }),
    } as typeof thePage);
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
    /** `yesOrNo`: the answer is given with a Yes and a No, as in Ask Groundwork. See the reply below. */
    opts: { yesOrNo?: boolean } = {},
  ) {
    /* A pasted invoice or price list keeps no bank details, before the model reads it or any of it
       is kept. See documents/bank-details-are-never-kept. */
    history = withoutBankDetailsInEachTurn(history);
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, label: true, scenario: true, initiatorId: true, timelineDays: true, runsUntilEnded: true,
        cadence: true, brief: true, timelineStated: true, cadenceStated: true, endsAt: true,
        organizationId: true, createdByUserId: true,
        participants: { select: { id: true, managingOnly: true, userId: true } },
        objectives: { select: { id: true } },
      },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Who is reading what this says back: a line about them says "you". */
    const reader = { participantId: ground.participants.find((p: any) => p.userId === requestingUserId)?.id ?? null };
    /*
     * DECISIONS 63 AND 72: SETUP IS THE LEAD'S, OR AN ADMIN'S ONLY ONCE THE LEAD HAS LEFT THE
     * ORGANISATION. This let in any admin of the organisation while the lead was still there, so an
     * admin could steer a check-in its lead was running, while the confirm step behind it refused them.
     * The same rule, and the same refusal naming the lead, as every writer of setup (mayConfirmSetupOn).
     */
    await this.mayConfirmSetupOn(ground, requestingUserId);

    /*
     * LEAVE DATES GO TO THE LEAVE SUITE, NOT TO THIS CHECK-IN'S RECORD (week 20). Read by rules. Said
     * back with the exact days, and sent to the person who approves only on a yes (applyContextProposal
     * with `leave`). While the suite is off it says so, and nothing is kept: no context line, no
     * proposal, no organisation memory. The rest of the setup conversation does not see this turn.
     */
    {
      const lastLeadTurn = [...history].reverse().find((h) => h.role === 'user')?.content?.trim() ?? '';
      const dates = soundsLikeLeave(lastLeadTurn) ? readLeaveDates(lastLeadTurn) : null;
      if (dates) {
        const said = await sayBackLeave(this.prisma, this.leaveSuite(), { userId: requestingUserId, organizationId: ground.organizationId }, dates);
        return {
          reply: said.ok ? '' : said.say,
          gaps: [] as string[],
          openQuestion: null,
          done: false,
          proposal: said.ok ? { gap: 'leave_request', say: said.say } : null,
        };
      }
    }

    /*
     * A SHORT SENTENCE THAT ASKS A NAMED PERSON SOMETHING is a question for that person, said back as the exact sentence and kept
     * only on a yes, as Ask Groundwork does it (a-short-question-for-a-person-in-the-old-chat.ts). It was read as a goal.
     */
    {
      const lastLeadTurn = [...history].reverse().find((h) => h.role === 'user')?.content?.trim() ?? '';
      const asked = aShortQuestionForAPerson(lastLeadTurn);
      if (asked) {
        try {
          const q = await this.theQuestionForAPerson(groundId, requestingUserId, asked);
          return { reply: '', gaps: [] as string[], openQuestion: null, done: false, proposal: { gap: 'question_for_person', say: askedBackToTheLead(q.who, q.exactQuestion) } };
        } catch (err: any) {
          if (err instanceof BadRequestException) return { reply: err.message, gaps: [] as string[], openQuestion: null, done: false, proposal: null };
          throw err;
        }
      }
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
    const objectiveRowsForGaps = await this.prisma.personObjective.findMany({
      where: { groundId },
      select: { text: true, authoredBy: true, seenBySubject: true, participantId: true },
    });
    const perPersonObjectives = objectiveRowsForGaps.filter(o => mayBeReadAgainst({
      participantId: o.participantId, text: o.text, authoredBy: o.authoredBy as any, seenBySubject: o.seenBySubject,
    })).length;
    /* And how many people have something at all, so the chat does not ask again for what it just
       wrote down and nobody has seen yet - see ContextGaps.perPersonAnyCount. */
    const perPersonAny = new Set(objectiveRowsForGaps.filter((o) => o.text?.trim() && o.participantId).map((o) => o.participantId)).size;
    const targetCount = await this.prisma.groundObjective.count({ where: { groundId } });

    const gaps = contextGaps({
      targetCount,
      scenario: ground.scenario,
      /**
       * `null` here means "nobody chose this", not "the column is empty" - the column cannot be
       * empty. Passing the raw value made the duration question unaskable, which is the one thing
       * this conversation was built to ask.
       */
      timelineDays: theLengthWasChosen(ground as any) ? ground.timelineDays : null,
      runsUntilEnded: !!(ground as any).runsUntilEnded,
      /* A check-in somebody already has a session in is never asked how long it runs (night quality run 1). */
      alreadySetUp: (await (this.prisma.checkIn?.count?.({ where: { groundId, isSetup: false } }) ?? Promise.resolve(0)).catch(() => 0)) > 0,
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
      perPersonAnyCount: perPersonAny,
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
     * OPENING THE PAGE NEVER MAKES A MODEL CALL (request 101 e). The Context tab asks for the opening
     * turn with an empty history every time it is opened, and each open asked the model again and
     * showed a new opening question. The opening is now written from what is stored: the length and
     * rhythm the check-in already has, and the product's own question for the first thing missing.
     * The first model call is made on the lead's first message.
     */
    if (history.length === 0) {
      const opened = openingLine(theLengthWasChosen(ground as any) ? ground.timelineDays : null, ground.cadenceStated ? ground.cadence : null, !!(ground as any).runsUntilEnded);
      const ask = (gaps[0] as { ask?: string } | undefined)?.ask ?? null;
      return {
        reply: forHumans([opened, ask].filter(Boolean).join(' ')),
        gaps: gaps.map((g: { key: string }) => g.key),
        openQuestion: ask,
        done: false,
        proposal: null,
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
    /* What it already holds, counted, so it opens on the page rather than on a greeting. */
    const alreadyHolds = await this.whatThisCheckInAlreadyHolds(groundId, perPersonAny).catch(() => []);
    /* And in full, so a question about the page can be answered from the page. */
    const onRecord = await this.whatIsOnThisCheckIn(groundId).catch(() => []);
    const systemPrompt = `${contextChatPrompt(ground.label, ground.scenario, gaps, alreadyHolds, onRecord)}${expectationRule}\n\n${documentBlock}`;
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
    /*
     * A PASTE IS NOT AN ANSWER TO THE QUESTION ON THE TABLE. See a-dump-is-many-things: somebody who
     * has just written the whole quarter down is handing over the context, and the one-gap-at-a-time
     * shape took one thing from it and asked eight more questions for the rest. So it is read once,
     * for everything it holds, and offered as one thing to say yes to. The gap flow below still runs
     * for ordinary answers, and the reply the lead reads is still the conversation's.
     */
    const fromAPaste = lastFromLead && looksLikeADump(lastFromLead)
      ? await this.whatAPasteGives(groundId, lastFromLead).catch((err: any) => {
          this.logger.warn(`Reading the paste on ${groundId} failed: ${err?.message}`);
          return null;
        })
      : null;
    if (fromAPaste) {
      /* The read the lead is about to be shown is kept, so a yes writes this and not a second reading. */
      this.rememberThePasteWeSaidBack(groundId, lastFromLead!, fromAPaste);
      /* What participants would be told, worked out now so it can be said back before the yes. */
      const told = await this.theTellingAPasteWouldWrite(groundId, fromAPaste).catch(() => null);
      const say = whatWeTookFromThat(fromAPaste, { asking: true, told, reader });
      if (say) proposal = { kind: 'everything', say } as any;
    }
    /*
     * AND A CHANGE TO SOMETHING ALREADY HERE, which this conversation could not hear at all.
     *
     * "Drop the 30-day rule", "the 12m is signed not collected", "Client C is Hassan's" were each
     * answered with the next gap question, because the only thing the chat could do was ask for what
     * was MISSING. It proposes the change now and writes nothing until the lead says yes - see
     * what-the-lead-wants-changed.
     */
    let changeSay: string | null = null;
    /*
     * FIX 6, inventory item 16: RESTATING WHAT DOING WELL LOOKS LIKE, RECOGNISED ON ITS OWN.
     *
     * Driven live: "Change what good means: every stage has an owner and a next date, because the
     * board kept going stale." answered "I cannot find 'what good means' on this check-in." -
     * `whatTheyWantChanged` only ever matches something already sitting as a line, a target or an
     * action, and a success statement lives in its own table (`GroundBaseline`), not among those.
     * Checked before the generic change reader, deterministically, so it never depends on that reader
     * having anything to match against.
     */
    const restated = !fromAPaste && lastFromLead ? restatesSuccess(lastFromLead) : null;
    if (restated) {
      const existingSuccess = await this.statedSuccessFor(groundId);
      if (existingSuccess && !restated.reason) {
        /* A restatement needs a reason once a version exists - stateBaseline's own rule, asked for
           here before a proposal is even offered, rather than refused only once they say yes. */
        changeSay = 'Say why this is changing, and I will record the new version - what is on the record now stays too.';
        proposal = { kind: 'none', why: 'Waiting for a reason.' } as any;
      } else {
        /* FOUND LIVE, 30 September 2026: a colon joining two clauses rather than a sentence. Said as
           a question instead - see askToRestateSuccess. */
        const say = askToRestateSuccess(restated, !!existingSuccess);
        changeSay = say;
        proposal = { kind: 'restate_success', text: restated.newSuccess, reason: restated.reason, say } as any;
      }
    } else if (!fromAPaste && lastFromLead) {
      const wants = await this.whatTheyWantChanged(groundId, lastFromLead).catch(() => null);
      /*
       * A CONFIDENT CHANGE WINS WHATEVER IS OPEN; AN AMBIGUOUS ONE DOES NOT SWALLOW AN ANSWER.
       *
       * Driven live: a lead was asked what they had seen of Ben, and answered "He has missed the last
       * two pipeline updates. I spoke to him once. I want the update in by every Friday." - an answer
       * to the open `objectives` question, naming an expectation. `whatTheyWantChanged` read "I want
       * the update..." as an attempt to change something called "the update", found nothing on the
       * check-in that matches, and answered "I cannot find 'the update' on this check-in" - which
       * swallowed the whole turn before the open-gap extraction below ever ran.
       *
       * "Drop the 30-day rule" still has to win under an open gap (item 7's own rule: a change is
       * answered whatever question was underneath it) - but that case is CONFIDENT: `wants.apply` is
       * set because exactly one thing on the record matched. What is refused here is only the
       * AMBIGUOUS case - `wants.apply` is null because nothing or more than one thing matched - while a
       * gap is open and could still be what the message was actually answering. With nothing open, the
       * ambiguous "which one do you mean" is still the right reply, because there is no competing
       * question this message could be an answer to instead.
       */
      if (wants && changeAnswersThisTurn(wants, openGap)) {
        changeSay = wants.say;
        /*
         * A change they asked for is the whole of this turn, whether it can be placed or not. The
         * first version left the open gap's proposal standing underneath an "I cannot tell which one
         * you mean", so a lead saying yes to the question set what doing well looks like to the word
         * "yes" - and was refused for being too short, which is the only reason it was seen.
         */
        proposal = wants.apply
          ? ({ kind: 'change', say: wants.say } as any)
          : ({ kind: 'none', why: 'Waiting to hear which one they mean.' } as any);
      }
    }
    /* A change they asked for is this turn's business; the gap flow would overwrite the proposal. */
    /*
     * A GREETING IS NOT AN ANSWER, AND NOTHING IS PROPOSED FROM ONE.
     *
     * She typed "hi" and was offered "I will record that as what doing well looks like: 'Hi! What's
     * on your mind?'" - the product's own greeting, about to become the yardstick her team is read
     * against. See nothing-proposed-that-nobody-said.
     */
    if (!fromAPaste && !changeSay && lastFromLead && openGap && !nothingToTakeFrom(lastFromLead)) {
      try {
        const heard = await this.anthropic.extract<Heard>(
          'Read ONLY what the person just said in answer to the question they were asked. Omit any field they did not answer. Never infer a sensible default.',
          [{ role: 'user' as const, content: lastFromLead }],
          extractionToolFor(openGap),
        );
        if (heard) proposal = proposalFrom(openGap, heard, await this.partiesForMatching(groundId), lastFromLead);
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
          /* FIX 4: one reading of this sentence, kept and handed back to the confirm call rather
             than re-asked - see heardAboutObjectivesOnce. */
          const alsoHeard = await this.heardAboutObjectivesOnce(groundId, lastFromLead, () => this.anthropic.extract<Heard>(
            WHO_AND_WHAT_THEY_EXPECT,
            asContextThenTheSentence(history, lastFromLead),
            extractionToolFor('objectives'),
          ));
          if (alsoHeard) {
            const forSomebody = proposalFrom('objectives', alsoHeard, await this.partiesForMatching(groundId), lastFromLead);
            if (forSomebody.kind === 'expectation' || forSomebody.kind === 'lead_read') proposal = forSomebody;
          }
        } catch {
          /* the open gap's proposal, or none, stands */
        }
      }
    }

    /*
     * AND WHATEVER IT READ, THE WORDS HAVE TO BE THEIRS.
     *
     * The greeting case is the loud one; the quiet one is a model tidying an answer into a sentence
     * the lead never typed and offering it as theirs. Checked in code against the message itself -
     * see traceableToWhatTheySaid - because it is the model that is wrong when this happens.
     */
    /* A length and nothing else is a length, whatever question was open (request 92, point 10). */
    const justALength = lastFromLead ? aLengthAndNothingElse(lastFromLead) : null;
    if (justALength) proposal = proposalFrom('timeline', { timelineDays: justALength } as any, [], lastFromLead);
    /* And "until I end it" is an answer to how long it runs, whatever question was open (request 37). */
    else if (lastFromLead && saidUntilIEndIt(lastFromLead, openGap === 'timeline')) proposal = proposalFrom('timeline', { runsUntilEnded: true }, [], lastFromLead);
    /* B-085: what the lead said is what the check-in already has, so nothing is offered, and they are told it is so. */
    const alreadyThere = alreadyHowItIs(ground as any, proposal as any);
    if (alreadyThere) {
      changeSay = alreadyThere;
      proposal = { kind: 'none', why: alreadyThere } as any;
    }
    if (proposal.kind !== 'none' && lastFromLead) {
      const untraceable =
        (proposal.kind === 'success' && !traceableToWhatTheySaid((proposal as any).text, lastFromLead))
        || (proposal.kind === 'expectation' && !traceableToWhatTheySaid((proposal as any).text, lastFromLead))
        || (proposal.kind === 'lead_read' && !traceableToWhatTheySaid((proposal as any).text, lastFromLead))
        || (proposal.kind === 'timeline' && !(proposal as any).untilEnded && !aLengthTheyCouldHaveMeant((proposal as any).days, lastFromLead));
      if (untraceable) {
        this.logger.warn(`Context chat on ${groundId}: dropped a ${proposal.kind} proposal whose words were not theirs.`);
        proposal = { kind: 'none', why: 'Nothing in that answer to record.' } as any;
      }
    }

    /*
     * SOMETHING TRUE OF THE WHOLE COMPANY IS OFFERED BACK FOR THE ORGANISATION (week 20).
     *
     * Only when nothing else is being proposed this turn (one question to say yes to at a time), only
     * from the lead's own last message, and only when it reads like a rule, a definition, a principle,
     * an owner or a client. The model reads it; the guards in what-the-organisation-keeps decide
     * whether it may be offered (their words as typed, nothing private, nothing judging a person). The
     * offer is a row marked OFFERED that nothing reads; only the lead's yes keeps it.
     */
    /*
     * AND WHERE A SETUP QUESTION WAS WAITING, THE QUESTION GETS ITS ANSWER AND THE RULE IS OFFERED
     * NEXT (decision 75, item 29). "Every quote over 1 million needs Grace's sign-off" said while the
     * success question was open was taken as that answer and never offered for the organisation. Now
     * the answer is said back as before, and the offer rides with it as `thenOffer`, asked straight
     * after the lead's yes or no to the answer: one question to say yes to at a time. Offered once per
     * rule, and never again once the lead said no (offeredBefore).
     */
    const answersASetupQuestion = !!openGap && !fromAPaste && !changeSay
      && !['none', 'everything', 'change', 'restate_success', 'organisation_memory', 'leave_request'].includes(proposal.kind as string);
    let memoryOfferId: string | null = null;
    let thenOffer: { gap: 'organisation_memory'; say: string; offerId: string } | null = null;
    if ((proposal.kind === 'none' || answersASetupQuestion) && lastFromLead && soundsCompanyWide(lastFromLead)) {
      try {
        const heard = await this.anthropic.extract<{ items?: { kind?: string; text?: string }[] }>(MEMORY_PROMPT, [{ role: 'user' as const, content: lastFromLead }], MEMORY_TOOL);
        const people = (await this.partiesForMatching(groundId)).flatMap((p: any) => [p.name, p.name?.split(' ')[0]].filter(Boolean)) as string[];
        const [one] = keepable(heard?.items, lastFromLead, people);
        if (one && !(await offeredBefore(this.prisma, { organizationId: ground.organizationId, item: one, history }))) {
          const offered = await offerToKeep(this.prisma, { organizationId: ground.organizationId, groundId, userId: requestingUserId, item: one });
          if (proposal.kind === 'none') {
            memoryOfferId = offered.offerId;
            proposal = { kind: 'organisation_memory', say: offered.say } as any;
          } else {
            thenOffer = { gap: 'organisation_memory', say: offered.say, offerId: offered.offerId };
          }
        }
      } catch {
        /* nothing is offered; the conversation carries on */
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
    /*
     * AND WHERE THEY ASKED TO CHANGE SOMETHING, THAT IS THE ANSWER TO THEIR MESSAGE.
     *
     * The model's reply was written against the open gap, so a lead who said "drop the 30-day rule"
     * got the next gap question and the change offered underneath it, as though they had said two
     * things. What they said was one thing, and it is the reply.
     */
    /*
     * FIX 3: THE OPENING TURN OPENS ON WHAT THE CHECK-IN HOLDS, WRITTEN BY THE PRODUCT, NEVER A
     * GREETING. `isOpeningTurn` is "no prior assistant turn in this conversation yet" - true whether
     * the lead's very first message was empty (decision 65's opener) or something they typed, because
     * either way this is the first reply this conversation has given. `openingLine` says the length
     * and the rhythm as a plain sentence when either is set - the one thing `hasList` in
     * `contextChatPrompt` never covered, because duration and cadence were never part of it - and a
     * greeting the model still adds despite "OPEN ON THAT, NOT ON A GREETING" is stripped rather than
     * asked away a second time.
     */
    const isOpeningTurn = !history.some((h) => h.role === 'assistant');
    const openedOn = isOpeningTurn ? openingLine(theLengthWasChosen(ground as any) ? ground.timelineDays : null, ground.cadenceStated ? ground.cadence : null, !!(ground as any).runsUntilEnded) : null;
    /*
     * FIX 4: NOTHING SAYS IT WILL BE RECORDED UNLESS SOMETHING IS ACTUALLY BEING PROPOSED THIS TURN.
     * "I will record this as your read of Ben" was once said with no `lead_read` or `expectation`
     * proposal attached - a false statement, since nothing was kept. See nothing-proposed-that-
     * nobody-said.ts.
     *
     * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: `changeSay` is never the model's
     * own sentence - it is built in code, in this function, from `restatesSuccess`/`whatTheyWantChanged`
     * (see FIX 6, inventory item 16, above) - and it was being run through the same guard built to
     * catch the MODEL restating a promise it has no business making. On item 16's second turn that
     * dropped the guard's OWN restatement clause and left the tail standing on its own: "What is on
     * the record now stays too, as an earlier version." Rule 2: a sentence the product writes never
     * passes through the model-sentence guard - only `reply`, the model's own text, does.
     */
    /*
     * AND WHERE THE LEAD ANSWERS WITH A YES OR A NO, THE MODEL SAYS NOTHING BESIDE IT (request 92,
     * point 7). The say-back is the one statement of what will be kept and ends in its own question,
     * so a question of the model's beside it would be a second one the person must type to answer
     * while two buttons wait under it. The next turn carries on with what is still open.
     */
    const yesOrNoOnly = opts?.yesOrNo === true && proposal.kind !== 'none';
    const withoutFalsePromises = changeSay ?? (yesOrNoOnly ? '' : whatTheModelsReplyShows(withoutTheWordGround(reply), proposal.kind !== 'none'));
    const spokenReply = isOpeningTurn ? withoutTheOpeningGreeting(withoutFalsePromises) : withoutFalsePromises;
    /*
     * WHAT THE LEAD IS SHOWN, NOT SHOWN TWICE. Item 16, found live, the four live checks, 30
     * September 2026: `changeSay` is threaded into BOTH the reply and `proposal.say` (it IS
     * `proposal.say`, built once in the restate_success and change branches above), so the lead read
     * the same restatement twice on the one turn - once as the reply, word for word again underneath
     * it as "[said back]". A person is told a thing once. Where the reply would repeat what the
     * say-back already states, the say-back is what stays; the reply carries only what is left over
     * (the opening line, when this is the first turn).
     */
    /*
     * THE LIST A PASTE GIVES IS THE PRODUCT'S OWN TEXT, NOT A MODEL'S, SO IT IS NOT RUN THROUGH
     * `forHumans`. That pass runs a list's lines together and takes the bullets off, and this list is
     * shown to the lead exactly as the confirmation after the yes shows it, one bullet to a line.
     * Its wording is written in `whatWeTookFromThat`, where the lead's own words are quoted and must
     * not be reworded either (request 92, point 6).
     */
    const sayBack = proposal.kind === 'none'
      ? null
      : (proposal.kind as string) === 'everything' ? (proposal.say as string) : forHumans(proposal.say);
    /* Told that it already is so, the lead is not also told the same thing as an opening line. */
    let replyText = forHumans(openedOn && !alreadyThere ? `${openedOn} ${spokenReply}`.trim() : spokenReply);
    if (sayBack && (replyText === sayBack || replyText.includes(sayBack))) {
      replyText = openedOn ? forHumans(openedOn) : '';
    }
    return {
      reply: replyText,
      gaps: gaps.map((g: { key: string }) => g.key),
      /** The question still open, as the product words it, so a No to a proposal can carry on with it. */
      openQuestion: (gaps[0] as { ask?: string } | undefined)?.ask ?? null,
      done: gaps.length === 0,
      /** Present only when there is something concrete to confirm. Same boundary: it is said to a person. */
      proposal: proposal.kind === 'none' ? null : {
        gap: proposal.kind,
        say: sayBack as string,
        ...(memoryOfferId ? { offerId: memoryOfferId } : {}),
        /* Asked straight after the yes or no to this answer (decision 75, item 29). */
        ...(thenOffer ? { thenOffer } : {}),
        /*
         * EACH QUESTION FOR A PERSON, AS IT WILL BE ASKED. Not written yet, so no id: the yes to this
         * list keeps them, and each one is then confirmed, changed or left out on its own through
         * questionsForPeople. The exact sentence is not passed through forHumans - it is what the
         * lead will confirm, and the person will read it word for word.
         */
        ...((proposal.kind as string) === 'everything' && fromAPaste?.questionsForPeople?.length ? {
          questionsForPeople: fromAPaste.questionsForPeople.map((q) => ({
            id: null,
            participantId: q.participantId,
            who: q.who,
            exactQuestion: q.exactQuestion?.trim() || plainQuestionFrom(q.question, q.who),
            says: whatGroundworkWillAsk(q.who, q.exactQuestion?.trim() || plainQuestionFrom(q.question, q.who)),
            status: 'not yet kept',
          })),
        } : {}),
      },
    };
  }

  /**
   * WHAT A PASTE GIVES, READ ONCE AND MATCHED TO THE PEOPLE ON THIS CHECK-IN.
   *
   * See a-dump-is-many-things for why a paste is read whole. Nothing here writes: this is the read
   * both halves use - the chat, to show the lead what it took, and the confirmation, to write it from
   * their own words rather than from a value the screen sent back.
   */


  /**
   * WHAT IS ON THIS CHECK-IN ALREADY, COUNTED, for the first thing the conversation says.
   *
   * Counts rather than content: the opener needs to know there are thirteen targets, not what they
   * are, and a prompt that carries every line is a prompt that quotes them back.
   */
  private async whatThisCheckInAlreadyHolds(groundId: string, peopleWithAnExpectation: number): Promise<{ what: string; count: number }[]> {
    const [targets, lines, actions, docs] = await Promise.all([
      this.prisma.groundObjective.count({ where: { groundId } }).catch(() => 0),
      this.prisma.groundContextItem?.count?.({ where: { groundId, closedAt: null } })?.catch(() => 0) ?? Promise.resolve(0),
      this.prisma.groundCommitment?.count?.({ where: { groundId, status: 'UNKNOWN' } })?.catch(() => 0) ?? Promise.resolve(0),
      this.prisma.groundDocument.count({ where: { groundId, visibility: 'OPEN' as any } }).catch(() => 0),
    ]);
    return [
      { what: 'targets, for the team and for people', count: targets },
      { what: 'people with something expected of them', count: peopleWithAnExpectation },
      { what: 'lines of context: the strategy, the rules, what is still to decide, what is not settled', count: lines },
      { what: 'things somebody is down to do', count: actions },
      { what: 'documents every check-in reads', count: docs },
    ];
  }



  /**
   * THE NUMBERS A SHEET IS WAITING ON, TAKEN WHEN THE LEAD SAYS YES.
   *
   * The document read stores what it found and writes nothing - see a-document-is-read-not-agreed.
   * This is the other half for the Context tab: the chat said what the sheet holds and asked, and
   * this is where the answer lands. Only the lead's own documents on this ground, and only the rows
   * the read already resolved, so nothing about who may set whose number is decided here.
   */
  private async whatASheetIsWaitingFor(
    groundId: string,
    requestingUserId: string,
    said: string | null | undefined,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string | null> {
    const answer = (said ?? '').trim();
    if (!answer) return null;
    /* Long enough for the sentence the screen sends: "yes, record the numbers from <file name>". */
    const plainYes = /^(yes|yep|yeah|yup|ok|okay|sure|correct|that is right|thats right|right|confirmed?|take (it|them|those)|record (it|them|those|the numbers))\b[\s\S]{0,160}$/i.test(answer);
    if (!plainYes) return null;
    /* Only where the thing being agreed to is the sentence this product wrote about a sheet. */
    const lastAsked = [...(history ?? [])].reverse().find((h) => h.role === 'assistant')?.content ?? '';
    if (!/Here is the context we have from /i.test(lastAsked)) return null;
    const me = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId: requestingUserId }, select: { id: true } });
    if (!me) return null;
    const docs = await this.prisma.groundDocument.findMany({
      where: { groundId, participantId: me.id, NOT: { holds: { equals: null as any } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, fileName: true, holds: true, visibility: true },
    });
    for (const d of docs) {
      const holds = (d.holds ?? {}) as any;
      const waiting: { name: string; target: number; ownerParticipantId: string | null }[] = Array.isArray(holds.waiting) ? holds.waiting : [];
      if (holds.takenAt || !waiting.length) continue;
      return writeADocumentsNumbers(this.prisma, {
        groundId,
        documentId: d.id,
        fileName: d.fileName,
        documentVisibility: (d as any).visibility,
        waiting,
        holds,
        setByParticipantId: me.id,
        sortOrderBase: 300,
        addNote: true,
        authorUserId: requestingUserId,
        reader: 'setup',
      }).catch((err: any) => {
        this.logger.warn(`Could not take the numbers from ${d.fileName}: ${err?.message}`);
        return null;
      });
    }
    return null;
  }

  /**
   * WHAT IS ON THIS CHECK-IN, IN THE WORDS THE PAGE USES, for a question about the page.
   *
   * Everything here is already on the lead's screen beside the conversation - this is what makes
   * "are these targets right?" answerable rather than a question the chat has to deflect. Capped per
   * heading, because a prompt is not a database and a lead with two hundred lines does not need all
   * of them quoted back at once.
   */
  private async whatIsOnThisCheckIn(groundId: string): Promise<{ heading: string; lines: string[] }[]> {
    const [targets, expectations, lines, actions] = await Promise.all([
      this.prisma.groundObjective.findMany({
        where: { groundId },
        select: { name: true, target: true, ownerParticipantId: true },
        orderBy: { sortOrder: 'asc' },
      }).catch(() => [] as any[]),
      this.prisma.personObjective.findMany({
        where: { groundId },
        select: { text: true, participantId: true },
        orderBy: { createdAt: 'asc' },
      }).catch(() => [] as any[]),
      this.prisma.groundContextItem?.findMany?.({
        where: { groundId, closedAt: null },
        select: { kind: true, text: true, aboutParticipantId: true, exactQuestion: true, questionConfirmedAt: true },
        orderBy: { createdAt: 'asc' },
      })?.catch(() => [] as any[]) ?? Promise.resolve([] as any[]),
      this.prisma.groundCommitment?.findMany?.({
        where: { groundId, status: 'UNKNOWN' },
        select: { text: true, participantId: true, whenSaid: true },
        orderBy: { createdAt: 'asc' },
      })?.catch(() => [] as any[]) ?? Promise.resolve([] as any[]),
    ]);
    const people = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      select: { id: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
    }).catch(() => [] as any[]);
    const who = (id: string | null | undefined) => {
      const p = (people as any[]).find((x) => x.id === id);
      return p ? theNameWeUseFor(p as any) : null;
    };
    const say = (kind: string) => (lines as any[]).filter((l) => l.kind === kind).map((l) => l.text as string).slice(0, 20);
    return [
      {
        heading: 'Targets',
        lines: (targets as any[]).slice(0, 30).map((t) => `${t.name}${t.target != null ? `: ${t.target.toLocaleString('en-GB')}` : ' (no number set)'}${t.ownerParticipantId ? ` [${who(t.ownerParticipantId) ?? 'somebody'}]` : ' [the whole check-in]'}`),
      },
      {
        heading: 'What is expected of each person, in your words, unseen by them',
        lines: (expectations as any[]).slice(0, 20).map((e) => `${who(e.participantId) ?? 'somebody'}: ${e.text}`),
      },
      { heading: 'The strategy', lines: say('STRATEGY') },
      { heading: 'How this team works', lines: say('WAY_OF_WORKING') },
      { heading: 'Still to decide', lines: say('DECISION') },
      { heading: 'Not settled, not to be treated as fact', lines: say('UNSETTLED') },
      { heading: 'Notes', lines: say('NOTE') },
      {
        heading: 'Things somebody is down to do, with nobody marked as having done them',
        lines: (actions as any[]).slice(0, 25).map((a) => `${who(a.participantId) ?? 'nobody owns this'}: ${a.text}${a.whenSaid ? ` (${a.whenSaid})` : ''}`),
      },
      {
        heading: 'Your own read of people and the questions you want asked (never quoted to them)',
        lines: [
          ...(lines as any[]).filter((l) => l.kind === 'ABOUT_A_PERSON').slice(0, 10).map((l) => `${who(l.aboutParticipantId) ?? 'somebody'}: ${l.text}`),
          ...(lines as any[]).filter((l) => l.kind === 'QUESTION_FOR_PERSON').slice(0, 10).map((l) => `${l.questionConfirmedAt && l.exactQuestion ? 'confirmed, and asked word for word' : 'waiting for you to confirm it, and not asked until you do'}. ${whatGroundworkWillAsk(who(l.aboutParticipantId) ?? 'somebody', (l.exactQuestion ?? '').trim() || plainQuestionFrom(l.text, who(l.aboutParticipantId)))}`),
          ...(lines as any[]).filter((l) => l.kind === 'BETWEEN_PEOPLE').slice(0, 6).map((l) => l.text as string),
        ],
      },
    ];
  }

  /**
   * EVERYTHING ON THIS CHECK-IN A LEAD CAN CHANGE BY TALKING ABOUT IT.
   *
   * One list, read by both halves of the conversation: the chat proposes against it and the
   * confirmation applies against it, so the two cannot disagree about which thing was meant.
   */
  private async whatThisCheckInHolds(groundId: string): Promise<AThingOnRecord[]> {
    const [lines, targets, actions] = await Promise.all([
      this.prisma.groundContextItem?.findMany?.({
        where: { groundId, closedAt: null },
        select: { id: true, text: true, kind: true },
      })?.catch(() => [] as any[]) ?? Promise.resolve([] as any[]),
      this.prisma.groundObjective.findMany({ where: { groundId }, select: { id: true, name: true, target: true } }).catch(() => [] as any[]),
      this.prisma.groundCommitment?.findMany?.({
        where: { groundId, status: 'UNKNOWN' },
        select: { id: true, text: true, participantId: true, participant: { select: { email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } } },
      })?.catch(() => [] as any[]) ?? Promise.resolve([] as any[]),
    ]);
    const out: AThingOnRecord[] = [];
    for (const l of lines as any[]) out.push({ id: l.id, what: 'line', text: l.text ?? '', kind: l.kind ?? null });
    for (const t of targets as any[]) out.push({ id: t.id, what: 'target', text: t.name ?? '', number: t.target ?? null });
    for (const a of actions as any[]) {
      out.push({
        id: a.id,
        what: 'action',
        text: a.text ?? '',
        who: a.participantId ? theNameWeUseFor(a.participant as any) : null,
      });
    }
    return out.filter((o) => o.text.trim());
  }

  /**
   * WHAT THE LEAD IS ASKING TO CHANGE, AND WHETHER IT CAN BE FOUND.
   *
   * Returns the sentence to say and the change to make, or the sentence to say and nothing to make -
   * "I cannot find that on this check-in" is an answer, and a better one than silently doing nothing
   * with what somebody just told you.
   */
  private async whatTheyWantChanged(groundId: string, said: string | null | undefined): Promise<
    { say: string; apply: null | { intent: WhatTheyWant; thing: AThingOnRecord; newText?: string | null; toPerson?: string | null; participantId?: string | null } } | null
  > {
    const text = (said ?? '').trim();
    if (!text || looksLikeADump(text)) return null;
    const heard = await this.anthropic
      .extract<AChangeHeard>(A_CHANGE_PROMPT, [{ role: 'user' as const, content: text }], A_CHANGE_SCHEMA as any)
      .catch(() => null);
    const intent = heard?.intent;
    if (!intent || intent === 'none' || !heard?.which?.trim()) return null;
    const things = await this.whatThisCheckInHolds(groundId);
    /* Their whole sentence goes too, for the bucket word the extracted phrase drops. */
    const found = whatTheyMeant(heard.which, things, text);
    /* Two matches is a question, not a coin toss - see whatTheyMeant. */
    if (found.length !== 1) return { say: whichOneDoYouMean(heard.which, found), apply: null };
    const thing = found[0];
    if (intent === 'reword' && !heard.newText?.trim()) return null;
    let participantId: string | null = null;
    if (intent === 'assign') {
      if (!heard.toPerson?.trim()) return null;
      const people = await this.prisma.groundParticipant.findMany({
        where: { groundId, managingOnly: false },
        select: { id: true, email: true, nameGiven: true, roleAsDescribed: true, managingOnly: true, userId: true, user: { select: { firstName: true, lastName: true } } },
      });
      const who = whoThisNameIs(heard.toPerson, people as any);
      if (!who) return { say: `I cannot see anybody called ${heard.toPerson.trim()} on this check-in. Add them and I will put it on them.`, apply: null };
      participantId = who.id;
      const name = theNameWeUseFor(who as any);
      /* "down as Hassan, instead of Hassan" - read live. Nothing to change is worth saying plainly. */
      if (thing.who && thing.who.trim().toLowerCase() === name.trim().toLowerCase()) {
        return { say: `That one is already ${name}'s.`, apply: null };
      }
      return { say: whatWillChange('assign', thing, { toPerson: name }), apply: { intent, thing, participantId, toPerson: name } };
    }
    return {
      say: whatWillChange(intent, thing, { newText: heard.newText }),
      apply: { intent, thing, newText: heard.newText ?? null },
    };
  }

  /**
   * The write behind a confirmed change. One row, one field, nothing else touched.
   *
   * `confirmedByAdminNote` (decision 63) is the plain sentence naming the admin who confirmed this
   * in the lead's place, or null when the lead confirmed it themselves - only recorded on a line,
   * which is the one kind of thing here a participant may read.
   */
  private async makeTheChange(change: { intent: WhatTheyWant; thing: AThingOnRecord; newText?: string | null; participantId?: string | null }, confirmedByAdminNote: string | null = null): Promise<void> {
    const { intent, thing } = change;
    if (thing.what === 'line') {
      if (intent === 'drop' || intent === 'settle') {
        await this.prisma.groundContextItem.update({ where: { id: thing.id }, data: { closedAt: new Date(), confirmedByAdminNote } });
      } else if (intent === 'reword' && change.newText?.trim()) {
        const text = change.newText.trim().slice(0, 400);
        await this.prisma.groundContextItem.update({ where: { id: thing.id }, data: { text, confirmedByAdminNote, ...(thing.kind === ContextItemKind.QUESTION_FOR_PERSON ? aQuestionReworded(text) : {}) } });
      }
      return;
    }
    if (thing.what === 'action') {
      if (intent === 'drop') {
        await this.prisma.groundCommitment.update({ where: { id: thing.id }, data: { status: 'DROPPED' } });
      } else if (intent === 'settle') {
        await this.prisma.groundCommitment.update({ where: { id: thing.id }, data: { status: 'DONE' } });
      } else if (intent === 'assign' && change.participantId) {
        await this.prisma.groundCommitment.update({ where: { id: thing.id }, data: { participantId: change.participantId } });
      } else if (intent === 'reword' && change.newText?.trim()) {
        await this.prisma.groundCommitment.update({ where: { id: thing.id }, data: { text: change.newText.trim().slice(0, 400), saidWordForWord: false } });
      }
      return;
    }
    /* A target. Dropping one takes its counts and its history with it, which is why only the lead
       can ask and why it is said out loud first. */
    if (intent === 'drop') {
      await this.prisma.groundObjective.delete({ where: { id: thing.id } }).catch(() => null);
    } else if (intent === 'reword' && change.newText?.trim()) {
      await this.prisma.groundObjective.update({ where: { id: thing.id }, data: { name: change.newText.trim().slice(0, 120) } });
    }
  }

  /*
   * The last few drafts, so the list the lead is shown and the line that is written from their yes a
   * minute later carry the same sentence where the paste read gave the same question twice.
   */
  /**
   * THE READ OF A PASTE THE LEAD WAS SHOWN, KEPT FOR THEIR YES.
   *
   * Found on realistic dumps (4 October 2026): the yes read the paste again, and the model's second
   * reading of the same words is a different list. The lead said yes to one set of commitments and
   * numbers and a different set was written. Keyed by the check-in and the exact words, held for six
   * hours, and handed out as a copy so a "yes, but not that one" cannot change what is held. When it
   * has gone (a restart), the yes reads the paste again, as it always did.
   */
  private readonly pastesWeSaidBack = new Map<string, { at: number; got: WhatAPasteGives }>();
  private thePasteKey(groundId: string, pasted: string) {
    return `${groundId}:${createHash('sha256').update(pasted.trim()).digest('hex')}`;
  }
  private rememberThePasteWeSaidBack(groundId: string, pasted: string, got: WhatAPasteGives) {
    const now = Date.now();
    if (this.pastesWeSaidBack.size > 200) {
      for (const [k, v] of this.pastesWeSaidBack) if (now - v.at > 6 * 3_600_000) this.pastesWeSaidBack.delete(k);
      if (this.pastesWeSaidBack.size > 200) this.pastesWeSaidBack.clear();
    }
    this.pastesWeSaidBack.set(this.thePasteKey(groundId, pasted), { at: now, got: structuredClone(got) });
  }
  private thePasteWeSaidBack(groundId: string, pasted: string): WhatAPasteGives | null {
    const held = this.pastesWeSaidBack.get(this.thePasteKey(groundId, pasted));
    if (!held || Date.now() - held.at > 6 * 3_600_000) return null;
    return structuredClone(held.got);
  }

  private _draftedQuestions?: Map<string, string>;
  private get draftedQuestions(): Map<string, string> {
    if (!this._draftedQuestions) this._draftedQuestions = new Map();
    return this._draftedQuestions;
  }

  /**
   * ONE READING OF A SENTENCE, NOT TWO THAT CAN DISAGREE. FIX 4 (found live, the four live checks,
   * 30 September 2026).
   *
   * Driven live: "Ben should be more proactive." was said back as a private note quoting "should be
   * more proactive", and saved as "be more proactive" - the word "should" present in what was shown
   * and gone from what was written. `verbatimQuote` (0c61f02d) already locks the SAVED text to the
   * literal characters of what the lead typed, for both `expectation` and `lead_read` alike - that
   * was never the gap. The gap is one step earlier: `contextChat` (propose) and `applyContextProposal`
   * (confirm) are two separate HTTP requests, and each runs its OWN call to the model against the
   * exact same sentence, asking it to say again which words are the expectation. A model is not
   * required to draw that boundary the same way twice, and on this run it did not - one call kept
   * "should", the other trimmed it - so `verbatimQuote` anchored two different, both-real substrings
   * of the same sentence and correctly reported two different results.
   *
   * The fix is not a third rule for `verbatimQuote` to apply - there is no ONE correct way to guess
   * which model call was "right" after the fact. It is to stop asking twice: the propose call's
   * reading of THIS sentence is kept, keyed on the ground and the sentence itself, and the confirm
   * call - reading the identical `said` a few seconds later - is handed that same reading back
   * instead of a second, independently-drawn one. Whichever call runs first decides; the words shown
   * and the words saved are then, structurally, the same call's output, not two.
   *
   * Keyed on the ground and the trimmed, case-folded sentence rather than on a request or a session,
   * so the confirm call needs to know nothing about which turn produced the proposal - only the same
   * two things it already carries forward itself: which ground, and what the lead typed. Capped and
   * aged out rather than kept forever, since this is a same-conversation convenience, not a record.
   */
  private readonly objectivesHeardCache = new Map<string, { heard: Heard | null; at: number }>();
  private static readonly OBJECTIVES_HEARD_CACHE_MAX = 500;
  private static readonly OBJECTIVES_HEARD_CACHE_FRESH_MS = 10 * 60 * 1000;
  private async heardAboutObjectivesOnce(groundId: string, said: string, read: () => Promise<Heard | null>): Promise<Heard | null> {
    const key = `${groundId}::${said.trim().toLowerCase()}`;
    const cached = this.objectivesHeardCache.get(key);
    if (cached && Date.now() - cached.at < GroundsService.OBJECTIVES_HEARD_CACHE_FRESH_MS) return cached.heard;
    const heard = await read();
    if (this.objectivesHeardCache.size >= GroundsService.OBJECTIVES_HEARD_CACHE_MAX) {
      const oldest = [...this.objectivesHeardCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
      if (oldest) this.objectivesHeardCache.delete(oldest);
    }
    this.objectivesHeardCache.set(key, { heard, at: Date.now() });
    return heard;
  }

  /** What the lead has written privately about this person: their notes and their read of them. */
  private async theLeadsOwnWordsAbout(groundId: string, participantId: string): Promise<string[]> {
    const [notes, lines] = await Promise.all([
      (this.prisma.leadContextNote?.findMany?.({ where: { groundId, participantId }, select: { text: true } }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
      (this.prisma.groundContextItem?.findMany?.({ where: { groundId, aboutParticipantId: participantId, kind: { in: ['ABOUT_A_PERSON', 'BETWEEN_PEOPLE'] as any } }, select: { text: true } }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
    ]);
    return [...(notes as any[]), ...(lines as any[])].map((r) => (r?.text ?? '') as string).filter(Boolean);
  }

  /**
   * THE QUESTION AS GROUNDWORK WILL ASK IT, drafted by the model from the lead's words and the
   * person's first name only, checked in code, and the lead's own words made a sentence where the
   * draft fails. Still only a proposal: nothing reads it into a session until the lead confirms it.
   */
  private async theExactQuestionFor(
    participantId: string,
    person: { nameGiven?: string | null; email?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null } | null,
    leadQuestion: string,
    privateWords: (string | null | undefined)[],
    /** What the lead actually typed, so a question she wrote to the person is kept in her words. */
    pasted?: string,
  ): Promise<string> {
    const key = `${participantId}::${leadQuestion.replace(/\s+/g, ' ').trim().toLowerCase()}`;
    const held = this.draftedQuestions.get(key);
    if (held) return held;
    const name = theFirstNameOfAParticipant(person) || 'them';
    /* HER WORDS, WHERE SHE WROTE IT TO THEM. No model is asked to tidy a question that is already one. */
    const hers = theLeadsOwnQuestionIfAddressedToThem(pasted, leadQuestion, { name, privateWords });
    if (hers) {
      this.draftedQuestions.set(key, hers);
      return hers;
    }
    const drafted = await this.anthropic.extract<{ question?: string }>(
      THE_EXACT_QUESTION_PROMPT(name),
      [{ role: 'user' as const, content: `The question as the person running the check-in wrote it: "${leadQuestion}"` }],
      THE_EXACT_QUESTION_TOOL as any,
      { fast: true },
    ).catch((err: any) => { this.logger.warn(`Drafting a question for ${participantId} failed: ${err?.message}`); return null; });
    const out = theExactQuestion(drafted?.question, { leadQuestion, name, privateWords });
    if (!out.fromTheDraft) this.logger.warn(`A drafted question for ${participantId} did not hold, so the lead's own words were used.`);
    if (this.draftedQuestions.size > 200) this.draftedQuestions.clear();
    this.draftedQuestions.set(key, out.exactQuestion);
    return out.exactQuestion;
  }

  /** The brief and the success sentence a yes to this paste would tell participants from. One place, so the say-back and the write agree. */
  private async theTellingAPasteWouldWrite(groundId: string, got: WhatAPasteGives): Promise<string | null> {
    const g = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { brief: true } });
    const fromTheContext = [g?.brief?.trim(), got.success ? `What doing well looks like: ${got.success}` : null].filter(Boolean).join('\n\n');
    return this.composeWhatParticipantsAreTold(groundId, fromTheContext || g?.brief || null);
  }

  private async whatAPasteGives(groundId: string, pasted: string): Promise<WhatAPasteGives | null> {
    const read = await this.anthropic.extract<ADumpRead>(
      A_DUMP_PROMPT,
      [{ role: 'user' as const, content: pasted }],
      A_DUMP_SCHEMA as any,
    );
    if (!read) return null;
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        initiatorId: true,
        participants: { select: { id: true, email: true, nameGiven: true, roleAsDescribed: true, managingOnly: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
    const people = (ground?.participants ?? []).filter((p) => !p.managingOnly);
    const theLeadsOwnRow = (ground?.participants ?? []).find((p) => !!ground?.initiatorId && p.userId === ground.initiatorId) ?? null;
    const forPeople: WhatAPasteGives['forPeople'] = [];
    const unmatched: string[] = [];
    /* What the paste said for each name that is not on this check-in, so it can be said, and so a
       number meant for them is never read as the whole team's. */
    const unmatchedParts: Record<string, string[]> = {};
    const unmatchedNumbers: { name: string; number: number }[] = [];
    for (const r of (read.forPeople ?? []).filter((r) => r?.personName?.trim() && r?.expectation?.trim())) {
      const who = whoThisNameIs(r.personName, people as any);
      if (!who) {
        if (!unmatched.includes(r.personName.trim())) unmatched.push(r.personName.trim());
        /* What it was for them is kept to be SAID, and their numbers to keep them off the team's list. */
        for (const t of (r.targets ?? []).filter((t) => t?.name?.trim())) {
          const n = theNumberAsWritten(t.number, pasted);
          if (n == null) continue;
          unmatchedNumbers.push({ name: t.name.trim().slice(0, 120), number: n });
          (unmatchedParts[r.personName.trim()] ??= []).push(`${t.name.trim().slice(0, 120)}: ${n.toLocaleString('en-GB')}`);
        }
        continue;
      }
      forPeople.push({
        who: theNameWeUseFor(who as any),
        participantId: who.id,
        expectation: r.expectation.trim().slice(0, 600),
        targets: (r.targets ?? [])
          .filter((t) => t?.name?.trim())
          .map((t) => ({ name: t.name.trim().slice(0, 120), number: theNumberAsWritten(t.number, pasted) }))
          .filter((t): t is { name: string; number: number } => t.number != null),
      });
    }
    /* One line each, trimmed, in the paste's order, and nothing empty. */
    const aList = (rows: (string | null | undefined)[] | null | undefined): string[] =>
      (rows ?? []).map((r) => (r ?? '').trim().replace(/\s+/g, ' ')).filter(Boolean).map((r) => r.slice(0, 300)).slice(0, 25);
    /* The lead's read of a person only where the name is somebody on this check-in - never guessed on. */
    const aboutPeople: WhatAPasteGives['aboutPeople'] = [];
    for (const r of (read.aboutPeople ?? []).filter((r) => r?.personName?.trim() && r?.observation?.trim())) {
      const who = whoThisNameIs(r.personName, people as any);
      if (!who) { if (!unmatched.includes(r.personName.trim())) unmatched.push(r.personName.trim()); continue; }
      aboutPeople.push({ who: theNameWeUseFor(who as any), participantId: who.id, observation: r.observation.trim().slice(0, 600) });
    }
    /* Actions: the owner only where the paste said one. An unowned item stays unowned. */
    const commitments: WhatAPasteGives['commitments'] = [];
    for (const r of (read.commitments ?? []).filter((r) => r?.action?.trim())) {
      const named = (r.personName ?? '').trim();
      const who = named ? whoThisNameIs(named, people as any) : null;
      if (named && !who) {
        /* Somebody's job who is not on this check-in is not nobody's job: it is said, under their name, and not kept as an unowned item. */
        if (!unmatched.includes(named)) unmatched.push(named);
        (unmatchedParts[named] ??= []).push(`${r.action.trim().slice(0, 300)}${(r.when ?? '').trim() ? ` (${(r.when ?? '').trim().slice(0, 120)})` : ''}`);
        continue;
      }
      commitments.push({
        who: who ? theNameWeUseFor(who as any) : null,
        participantId: who?.id ?? null,
        /* The action is a phrase that a "(by Friday)" follows, so it carries no full stop of its own. */
        action: r.action.trim().replace(/[.!\s]+$/, '').slice(0, 400),
        outcome: (r.outcome ?? '').trim().slice(0, 400) || null,
        when: (r.when ?? '').trim().slice(0, 120) || null,
        theySaidIt: r.theySaidIt !== false,
      });
    }
    const questionsForPeople: WhatAPasteGives['questionsForPeople'] = [];
    for (const r of (read.questionsForPeople ?? []).filter((r) => r?.personName?.trim() && r?.question?.trim())) {
      /* A question the lead puts to themselves is kept for the lead alone: their row, nobody else's. */
      const toThemselves = /^(?:the lead|me|myself|i|self|you)$/i.test(r.personName.trim()) && theLeadsOwnRow;
      const who = toThemselves ? theLeadsOwnRow : whoThisNameIs(r.personName, people as any);
      if (!who) {
        if (!unmatched.includes(r.personName.trim())) unmatched.push(r.personName.trim());
        (unmatchedParts[r.personName.trim()] ??= []).push(`a question, ${r.question.trim().slice(0, 300)}`);
        continue;
      }
      questionsForPeople.push({ who: theNameWeUseFor(who as any), participantId: who.id, question: r.question.trim().slice(0, 400) });
    }
    /*
     * EACH ONE WRITTEN ONCE, AS IT WILL BE ASKED. Decision 34. The lead's own read of that person - in
     * this paste, in their description of them, in their notes - goes to the check, never to the
     * drafter. See a-question-asked-word-for-word.
     */
    for (const q of questionsForPeople) {
      /* Put to themselves, the lead's own words are the question; no drafter turns it into one for somebody else. */
      if (theLeadsOwnRow && q.participantId === theLeadsOwnRow.id) { q.exactQuestion = plainQuestionFrom(q.question); continue; }
      const person = people.find((p) => p.id === q.participantId) as any;
      const privateWords = [
        person?.roleAsDescribed,
        ...(read.aboutPeople ?? []).filter((a) => whoThisNameIs(a?.personName ?? '', people as any)?.id === q.participantId).map((a) => a.observation),
        ...(await this.theLeadsOwnWordsAbout(groundId, q.participantId)),
      ];
      q.exactQuestion = await this.theExactQuestionFor(q.participantId, person, q.question, privateWords, pasted);
    }
    /* Both people have to be on the check-in, or it is not a pair this product can hold. */
    const betweenPeople: WhatAPasteGives['betweenPeople'] = [];
    for (const r of (read.betweenPeople ?? []).filter((r) => r?.issue?.trim() && (r.people ?? []).length >= 2)) {
      const found = (r.people ?? []).map((n) => whoThisNameIs(n, people as any)).filter(Boolean) as { id: string }[];
      if (found.length < 2) continue;
      betweenPeople.push({
        who: found.slice(0, 3).map((f) => theNameWeUseFor(f as any)),
        participantIds: found.slice(0, 3).map((f) => f.id),
        issue: r.issue.trim().slice(0, 500),
      });
    }
    const got: WhatAPasteGives = {
      /* A rule or a slogan off a bullet list is not a yardstick - see aSuccessStatementHolds. */
      success: aSuccessStatementHolds((read.success ?? '').slice(0, 600)),
      teamTargets: (read.teamTargets ?? [])
        .filter((t) => t?.name?.trim())
        .map((t) => ({
          name: t.name.trim().slice(0, 120),
          target: theNumberAsWritten(t.target as number, pasted),
          notToExceed: !!t.notToExceed,
        }))
        /* A number the paste gave to a person, on this check-in or not, is that person's and not also
           the team's. Found on a quarterly plan (4 October 2026): each priority's number was kept for
           the whole team as well as for its owner, and the numbers of an owner who is not on the
           check-in were kept for the whole team and nobody else. */
        .filter((t) => t.target == null || ![...forPeople.flatMap((p) => p.targets), ...unmatchedNumbers].some((n) => n.number === t.target && theSameWords(n.name, t.name))),
      forPeople,
      unmatchedParts,
      dates: (read.dates ?? []).filter((d) => d?.what?.trim() && d?.when?.trim()).map((d) => ({ what: d.what.trim(), when: d.when.trim() })),
      unmatched,
      /* The three lists that are words rather than numbers, kept as the lead's own note. */
      waysOfWorking: aList(read.waysOfWorking),
      strategy: aList(read.strategy),
      notes: aList(read.notes),
      openDecisions: aList(read.openDecisions),
      notSettled: aList(read.notSettled),
      aboutPeople: aboutPeople,
      commitments,
      questionsForPeople,
      betweenPeople,
    };
    return (got.success || got.teamTargets.length || got.forPeople.length || got.dates.length || got.unmatched.length
      || got.waysOfWorking.length || got.openDecisions.length || got.notSettled.length || got.aboutPeople.length
      || got.commitments.length || got.questionsForPeople.length || got.betweenPeople.length
      || got.strategy.length || got.notes.length) ? got : null;
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
      select: { id: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
    }).catch(() => [] as any[]);
    /* The name they were given when invited counts too, so a person invited as "Amina" is matched and said back as Amina (review of 1678157c). */
    return rows.map((p: any) => ({
      id: p.id,
      email: p.email,
      name: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim() || null,
    }));
  }

  /** The leave suite, found when it is needed. Absent, leave is answered as not switched on. */
  private leaveSuite(): LeaveBoardService | undefined {
    try { return this.moduleRef?.get(LeaveBoardService, { strict: false }) ?? undefined; } catch { return undefined; }
  }

  /** A no to keeping something for the organisation: the offer is deleted and nothing is kept. */
  async declineContextOffer(groundId: string, requestingUserId: string, offerId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true, initiatorId: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* The same door as the conversation that made the offer (decisions 63 and 72). */
    await this.mayConfirmSetupOn(ground, requestingUserId);
    await dropWhatWasOffered(this.prisma, { organizationId: ground.organizationId, offerId, userId: requestingUserId });
    return { changed: 'nothing', say: NOT_KEPT };
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
    dto: { said: string; history?: { role: 'user' | 'assistant'; content: string }[]; offerId?: string; leave?: boolean },
  ) {
    /* The same words the chat was given, so no bank details are kept on a yes either. */
    dto = { ...dto, said: withoutBankDetails(dto?.said) as string, ...(dto?.history ? { history: withoutBankDetailsInEachTurn(dto.history) } : {}) };
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true, initiatorId: true, timelineDays: true, runsUntilEnded: true, cadence: true, brief: true, scenario: true,
        timelineStated: true, cadenceStated: true, endsAt: true, organizationId: true,
        participants: { select: { id: true, managingOnly: true, userId: true } },
        objectives: { select: { id: true } },
      },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /*
     * DECISION 63: THE LEAD CONFIRMS, OR - ONLY ONCE THE LEAD HAS LEFT THE ORGANISATION - AN ADMIN
     * OF IT CAN, IN THEIR PLACE. Before this the lead was the only door here, with no way through at
     * all once they had left: every open proposal on their check-ins would sit unconfirmable for
     * ever. `confirmedByAdminNote` is the plain sentence, or null when the lead confirmed it
     * themselves, threaded into the rows this writes so the people it reaches are told who did it.
     */
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const confirmedByAdminNote = confirm.as === 'admin' ? confirmedByAnAdminSentence(confirm.confirmedByName, confirm.leadName) : null;

    /*
     * A YES TO KEEPING SOMETHING FOR THE ORGANISATION (week 20). The row that was offered is what is
     * kept, in the words the lead typed; the yes carries an id and never a value.
     */
    if (dto.offerId) {
      const kept = await keepWhatWasOffered(this.prisma, { organizationId: ground.organizationId, groundId, offerId: dto.offerId, userId: requestingUserId });
      return { changed: kept.kept ? 'organisation memory' : 'nothing new', say: kept.say };
    }
    /* And a yes to a short question for a named person keeps that question, in the words the lead was shown. */
    const askedOfOne = dto.leave ? null : aShortQuestionForAPerson(dto.said);
    if (askedOfOne) {
      const q = await this.theQuestionForAPerson(groundId, requestingUserId, askedOfOne);
      const shown = theQuestionTheyWereShown(dto.history, q.who);
      const kept = await this.keepAQuestionForAPerson(groundId, requestingUserId, { participantId: q.participantId, leadWords: askedOfOne.leadWords, exactQuestion: shown ?? q.exactQuestion });
      return { changed: `a question for ${q.who}`, say: (kept as any).say };
    }
    /* And a yes to a leave request is sent through the leave suite, from the days in the lead's own words. */
    if (dto.leave) {
      const dates = readLeaveDates(dto.said);
      if (!dates) throw new BadRequestException(LEAVE_NOTHING_WAITING);
      return { changed: 'leave request', say: await sendLeave(this.leaveSuite(), this.prisma, { userId: requestingUserId, organizationId: ground.organizationId }, dates) };
    }

    const openDocumentCount = await this.prisma.groundDocument.count({ where: { groundId, visibility: 'OPEN' } });
    const objectiveRowsForGaps = await this.prisma.personObjective.findMany({
      where: { groundId },
      select: { text: true, authoredBy: true, seenBySubject: true, participantId: true },
    });
    const perPersonObjectives = objectiveRowsForGaps.filter(o => mayBeReadAgainst({
      participantId: o.participantId, text: o.text, authoredBy: o.authoredBy as any, seenBySubject: o.seenBySubject,
    })).length;
    /* And how many people have something at all, so the chat does not ask again for what it just
       wrote down and nobody has seen yet - see ContextGaps.perPersonAnyCount. */
    const perPersonAny = new Set(objectiveRowsForGaps.filter((o) => o.text?.trim() && o.participantId).map((o) => o.participantId)).size;
    const targetCount = await this.prisma.groundObjective.count({ where: { groundId } });
    const gaps = contextGaps({
      targetCount,
      scenario: ground.scenario,
      /**
       * `null` here means "nobody chose this", not "the column is empty" - the column cannot be
       * empty. Passing the raw value made the duration question unaskable, which is the one thing
       * this conversation was built to ask.
       */
      timelineDays: theLengthWasChosen(ground as any) ? ground.timelineDays : null,
      runsUntilEnded: !!(ground as any).runsUntilEnded,
      /* A check-in somebody already has a session in is never asked how long it runs (night quality run 1). */
      alreadySetUp: (await (this.prisma.checkIn?.count?.({ where: { groundId, isSetup: false } }) ?? Promise.resolve(0)).catch(() => 0)) > 0,
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
      perPersonAnyCount: perPersonAny,
      openDocumentCount,
    });
    const openGap = gaps[0]?.key ?? null;
    /*
     * FIX 6, inventory item 16: A RESTATEMENT OF WHAT DOING WELL LOOKS LIKE, CONFIRMED THROUGH
     * `stateBaseline` ITSELF - the same function the Context page's own "restate success" control
     * calls, so the versioning, the carried-forward conditions and the "a reason is required once a
     * version exists" rule are `stateBaseline`'s own, not copied here. Read directly from `dto.said`,
     * exactly as the change reader below is, and checked BEFORE the "is there an open question"
     * guard: restating success is not answering a gap, so a fully set-up check-in with no gap open
     * must still be able to hear it.
     */
    const restated = restatesSuccess(dto.said);
    if (restated) {
      const applied = await this.stateBaseline(groundId, requestingUserId, {
        successLooksLike: restated.newSuccess,
        changeReason: restated.reason ?? undefined,
      });
      return {
        changed: 'success',
        say: saidBackForRestatedSuccess(applied),
      };
    }

    /* A length and nothing else is a length, whatever question is open: never what doing well looks like. */
    const justALength = aLengthAndNothingElse(dto.said);
    if (justALength) {
      const asLength = proposalFrom('timeline', { timelineDays: justALength } as any, [], dto.said);
      if (asLength.kind !== 'timeline') throw new BadRequestException((asLength as any).why);
      await this.updateTimeline(groundId, requestingUserId, { timelineDays: asLength.days });
      return { changed: 'timeline', say: confirmedSay(asLength) };
    }

    if (saidUntilIEndIt(dto.said, openGap === 'timeline')) {
      const untilEnded = proposalFrom('timeline', { runsUntilEnded: true }, [], dto.said);
      await this.updateTimeline(groundId, requestingUserId, { runsUntilEnded: true });
      return { changed: 'timeline', say: confirmedSay(untilEnded) };
    }

    if (!openGap) throw new BadRequestException('There is no open question for this to answer.');
    /*
     * A PASTE IS CONFIRMED WHOLE. The same read as the chat's, run again on the lead's own words - so
     * this is a confirmation and not an edit endpoint taking a value from the screen. See
     * a-dump-is-many-things.
     */
    /* Their own paste, whether they have just typed it again or are saying yes to the list the chat
       printed from it a turn ago - see thePasteThisYesIsFor. */
    /*
     * A CONFIRMED CHANGE TO SOMETHING ALREADY HERE, read from their own words like everything else.
     *
     * The lead's yes carries no id and no value: the sentence they are saying yes to is re-read here
     * against what the check-in holds, and the write is one field of one row.
     */
    const theirChange = await this.whatTheyWantChanged(groundId, dto.said).catch(() => null);
    if (theirChange?.apply) {
      await this.makeTheChange(theirChange.apply, confirmedByAdminNote);
      return { changed: theirChange.apply.intent, say: whatChanged(theirChange.apply) };
    }
    /* A yes to a change proposed on the previous turn: the instruction is one turn up. */
    const yesToAChange = thePasteThisYesIsFor(dto.said, dto.history as any) ? null : await (async () => {
      const plainYes = /^(yes|yep|yeah|ok|okay|sure|do it|go ahead|please do|confirm(ed)?|that is right|correct)\b[\s\S]{0,40}$/i.test((dto.said ?? '').trim());
      if (!plainYes) return null;
      const lastSaid = [...(dto.history ?? [])].reverse().find((h) => h.role === 'user')?.content ?? '';
      const wants = await this.whatTheyWantChanged(groundId, lastSaid).catch(() => null);
      return wants?.apply ? wants : null;
    })();
    if (yesToAChange?.apply) {
      await this.makeTheChange(yesToAChange.apply, confirmedByAdminNote);
      return { changed: yesToAChange.apply.intent, say: whatChanged(yesToAChange.apply) };
    }

    /*
     * A YES TO A QUESTION THAT IS STILL OPEN IS NOT AN ANSWER TO ANYTHING ELSE.
     *
     * Driven on 22 September 2026: the chat asked which of two lines "the 30 day rule" meant, the
     * lead said yes, and the yes was read as the answer to the open gap - "that is too short to
     * stand as what doing well looks like". Their word was fine; the thing that read it was wrong.
     */
    const lastAsked = [...(dto.history ?? [])].reverse().find((h) => h.role === 'assistant')?.content ?? '';
    if (/Which one\?\s*$/.test(lastAsked.trim()) && /^(yes|yep|yeah|ok|okay|sure|do it)\b[\s\S]{0,20}$/i.test((dto.said ?? '').trim())) {
      throw new BadRequestException('Say which one, by its number or by enough of the line to tell them apart, and I will change it.');
    }

    /*
     * A YES TO WHAT A DOCUMENT HOLDS, IN THE LEAD'S OWN TAB.
     *
     * The check-in chat asks this and writes on the answer; the Context tab is where the numbers are
     * SET, and it was the one place that filed the sheet and said nothing about what was in it. Same
     * rule as everywhere else: the read waits on the document and a person's yes writes it.
     */
    const yesToASheet = await this.whatASheetIsWaitingFor(groundId, requestingUserId, dto.said, dto.history as any).catch(() => null);
    if (yesToASheet) return { changed: 'the numbers from the sheet', say: yesToASheet };

    const exception = whatTheYesLeavesOut(dto.said);
    const thePaste = looksLikeADump(dto.said)
      ? dto.said
      : thePasteThisYesIsFor(dto.said, dto.history as any) ?? (exception ? thePasteThisYesIsFor('yes', dto.history as any) : null);
    if (thePaste) {
      /*
       * TAKEN ONCE, MATCHED ON THE PASTE ITSELF.
       *
       * A lead said yes twice in a minute because nothing told them the first one had landed, and the
       * second read of the same text renamed half of it - "document the top 10 questions" came back
       * as "create a list of the top 10 questions" - so word-matching could not see they were the
       * same thing. The text can be matched exactly even when its reading cannot. See GroundPaste.
       */
      /* The words AND who is on the check-in, so adding somebody the paste named and sending it again is a new paste:
         "add them and I will put their part on" was refused as "already on the record". Everything already
         held is skipped by the writers, so only their part is new. */
      const hash = createHash('sha256').update(`${thePaste.trim()}\n${(ground.participants as any[]).map((p) => p.id).sort().join(',')}`).digest('hex');
      const takenBefore = await (this.prisma.groundPaste?.findFirst?.({ where: { groundId, hash }, select: { id: true } }) ?? Promise.resolve(null)).catch(() => null);
      if (takenBefore && !exception) {
        return { changed: 'nothing new', say: 'That is already on the record, exactly as you sent it. Nothing was written twice.' };
      }
      /* WHAT WAS SAID BACK IS WHAT IS WRITTEN. A second reading of the same words by the model is
         never the same list, so the yes uses the reading the lead was shown when it is still held. */
      const read = this.thePasteWeSaidBack(groundId, thePaste) ?? await this.whatAPasteGives(groundId, thePaste).catch(() => null);
      /* What participants are told is written only if the list the lead is answering said it. */
      if (read) read.toldToParticipants = theTellingInTheList(dto.history as any);
      /* And each number's direction only as that list said it (decision 69); a number it did not show stays not set. */
      if (read) {
        const ways = theDirectionsInTheList(dto.history as any);
        read.teamTargets = read.teamTargets.map((t) => ({ ...t, direction: t.target != null ? ways.get(aNameKey(t.name)) ?? null : null }));
      }
      let got = read;
      /*
       * "YES, BUT NOT THE 12M" TAKES THE REST AND LEAVES THAT.
       *
       * Matched against the list they are answering. Where the objection matches nothing in it,
       * nothing is written at all and the chat asks which one they mean - guessing would make the
       * product decide what the lead agreed to. See whatThatLeavesOut.
       */
      if (got && exception) {
        const leaves = whatThatLeavesOut(got, exception.notThis);
        const anything = leaves.teamTargets.length + leaves.people.length + leaves.commitments.length;
        if (!anything) {
          throw new BadRequestException(`I cannot tell which part "${exception.notThis}" is. Say which one to leave out and I will take the rest.`);
        }
        got = withoutWhatTheyLeftOut(got, leaves);
        const left = [...leaves.teamTargets, ...leaves.people, ...leaves.commitments];
        const wroteSome = await this.writeWhatThePasteGave(groundId, got, confirmedByAdminNote);
        const say = `${whatWeTookFromThat(got, { told: got.toldToParticipants, reader: { participantId: (ground.participants as any[]).find((p) => p.userId === requestingUserId)?.id ?? null } }) ?? 'I have recorded it.'}\n\nAs you said, I have left out ${left.join('; ')}.`;
        const questionsForPeople = got.questionsForPeople.length ? await this.theQuestionsForPeople(groundId).catch(() => []) : undefined;
        return { changed: wroteSome ? 'everything but what you left out' : 'nothing new', say, ...(questionsForPeople ? { questionsForPeople } : {}) };
      }
      if (got) {
        const wrote = await this.writeWhatThePasteGave(groundId, got, confirmedByAdminNote);
        /* Only a whole yes marks the paste as taken: a partial one leaves the rest still to take. */
        await (this.prisma.groundPaste?.create?.({ data: { groundId, hash } }) ?? Promise.resolve(null)).catch(() => null);
        /* And the questions it kept, each waiting for its own yes. See confirmQuestionForPerson. */
        const questionsForPeople = got.questionsForPeople.length ? await this.theQuestionsForPeople(groundId).catch(() => []) : undefined;
        if (wrote) return { changed: 'everything', say: whatWeTookFromThat(got, { told: got.toldToParticipants, reader: { participantId: (ground.participants as any[]).find((p) => p.userId === requestingUserId)?.id ?? null } }) ?? 'I have recorded it.', ...(questionsForPeople ? { questionsForPeople } : {}) };
        /* Nothing new to write means it is already on the record, which is not a failure to report as
           one: saying yes twice to the same list used to fall through to one-gap-at-a-time. */
        return { changed: 'nothing new', say: 'That is already on the record. Nothing was written twice.' };
      }
    }


    const heard = await this.anthropic.extract<Heard>(
      'Read ONLY what the person said in answer to the question they were asked. Omit any field they did not answer.',
      [{ role: 'user' as const, content: dto.said }],
      extractionToolFor(openGap),
    );
    const parties = await this.partiesForMatching(groundId);
    let proposal = proposalFrom(openGap, heard ?? {}, parties, dto.said);

    /*
     * AND THE SAME SECOND READING THE CHAT DOES, BECAUSE THIS IS WHERE THE YES LANDS.
     *
     * The chat can now hear "give her 3,000 units by December" whatever question was open. If this
     * half still only read `gaps[0]`, the lead would be shown that proposal, say yes, and be told
     * there was nothing in what they said - or worse, have the length of the check-in changed
     * instead. The two halves have to read the same sentence the same way.
     */
    /**
     * FOUND LIVE, 30 September 2026: when the open gap was 'timeline' but the proposal being
     * confirmed actually came from THIS secondary reading (a judgement or expectation of Ben, heard
     * whatever question was open), and this second, independent model call happened to read it
     * differently from the first - a real disagreement between two calls, the same class the
     * inventory's own equivalence run already names as open for the success field - the lead was
     * shown "REFUSED 400: No length in that answer", the open gap's own irrelevant refusal, for a
     * proposal that was never about the timeline at all. `triedTheSecondReading` says whether this
     * path was even attempted, so the refusal below can be honest about what was actually confirmed.
     */
    const triedTheSecondReading = openGap !== 'objectives';
    if (triedTheSecondReading) {
      /* FIX 4: the same reading the propose turn already made of this exact sentence, not a second
         one that could disagree with it - see heardAboutObjectivesOnce. */
      const alsoHeard = await this.heardAboutObjectivesOnce(groundId, dto.said, () => this.anthropic
        .extract<Heard>(
          WHO_AND_WHAT_THEY_EXPECT,
          asContextThenTheSentence(dto.history, dto.said),
          extractionToolFor('objectives'),
        )
        .catch(() => null));
      if (alsoHeard) {
        const forSomebody = proposalFrom('objectives', alsoHeard, parties, dto.said);
        if (forSomebody.kind === 'expectation' || forSomebody.kind === 'lead_read') proposal = forSomebody;
      }
    }
    if (proposal.kind === 'none') {
      /*
       * AN HONEST REFUSAL, NOT THE OPEN GAP'S OWN UNRELATED ONE. When the second reading was tried
       * and still came back with nothing, `proposal.why` is whatever the PRIMARY, open-gap extraction
       * said above - a reason about timeline, cadence or success that has nothing to do with what the
       * lead actually said yes to. Refused the same honest way the traceability guard just below
       * refuses a mismatch, rather than a confusing reason attached to the wrong field.
       */
      throw new BadRequestException(
        triedTheSecondReading
          ? 'I could not find that in what you said, so nothing was recorded. Say it in your own words and I will take it.'
          : proposal.why,
      );
    }
    /* The same rule where the write happens: nothing is recorded that they did not say. */
    if (
      (proposal.kind === 'success' && !traceableToWhatTheySaid((proposal as any).text, dto.said))
      || (proposal.kind === 'expectation' && !traceableToWhatTheySaid((proposal as any).text, dto.said))
      || (proposal.kind === 'lead_read' && !traceableToWhatTheySaid((proposal as any).text, dto.said))
      || (proposal.kind === 'timeline' && !(proposal as any).untilEnded && !aLengthTheyCouldHaveMeant((proposal as any).days, dto.said))
    ) {
      throw new BadRequestException('I could not find that in what you said, so nothing was recorded. Say it in your own words and I will take it.');
    }

    /**
     * The timeline write goes through `updateTimeline`, which already owns the rules about changing
     * a running ground's length and already appends to the audit log every party can now read. A
     * second path to the same column would be a second set of rules.
     */
    /* B-085: a yes that would change nothing writes nothing, and no line goes into the history. */
    const alreadyThere = alreadyHowItIs(ground as any, proposal as any);
    if (alreadyThere) return { changed: 'nothing new', say: alreadyThere };
    if (proposal.kind === 'timeline') {
      // Days straight through. This used to round to whole weeks, so a proposal of 45 days
      // was applied as 42 - a silent change to a number somebody had agreed.
      await this.updateTimeline(groundId, requestingUserId, proposal.untilEnded ? { runsUntilEnded: true } : { timelineDays: proposal.days });
      return { changed: 'timeline', say: confirmedSay(proposal) };
    }
    if (proposal.kind === 'cadence') {
      await this.updateTimeline(groundId, requestingUserId, { cadence: proposal.cadence });
      return { changed: 'cadence', say: confirmedSay(proposal) };
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
      return { changed: 'expectation', say: confirmedSay(proposal) };
    }
    if (proposal.kind === 'lead_read') {
      /*
       * FIX 4: THROUGH THE NORMAL NOTE PATH, NOT A COPY OF IT. `addLeadContext` already owns who may
       * write one (the same lead-or-admin-in-their-place rule `mayConfirmSetupOn` just checked here),
       * the bank-detail scrub, and the refusal that a note about a person can never be shared - this
       * calls it rather than writing the `LeadContextNote` row a second time with a second set of
       * rules that could drift from the first.
       */
      await this.addLeadContext(groundId, requestingUserId, {
        participantId: proposal.participantId,
        text: proposal.text,
        audience: 'LEAD_ONLY',
      });
      return { changed: 'a private note', say: confirmedSay(proposal) };
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
          /* Decision 69: the direction the say-back stated, which the lead has just said yes to. */
          direction: t.direction ?? null,
        })) as any,
      });
      return { changed: 'targets', say: confirmedSay(proposal) };
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
    return { changed: 'success', say: confirmedSay(proposal) };
  }

  /**
   * WHAT A PASTE GAVE, WRITTEN - AND THE TEAM TOLD.
   *
   * Every rule the one-at-a-time path holds, held here: what doing well looks like becomes a new
   * version rather than an edit, a number the team is held to goes on the board, an expectation of a
   * named person goes down as the LEAD'S and marked unseen until that person reads it, and a number
   * for one person is theirs. Nothing already on the record is overwritten - a paste restated in
   * session four must not double the board.
   *
   * And then the team's own "About this check-in" is written again from the new context, because the
   * whole point of a paste is that the people answering should be standing in it. See
   * what-a-participant-is-told-about-this.
   */
  /** `confirmedByAdminNote` (decision 63): the plain sentence naming the admin who confirmed this
   *  paste in the lead's place, or null when the lead confirmed it themselves. Recorded on the rows
   *  a participant may go on to read: the baseline and the context lines it writes below. */
  private async writeWhatThePasteGave(groundId: string, got: WhatAPasteGives, confirmedByAdminNote: string | null = null): Promise<boolean> {
    let wrote = false;
    if (got.success) {
      const latest = await this.prisma.groundBaseline.findFirst({ where: { groundId }, orderBy: { version: 'desc' }, select: { version: true, conditions: true, successLooksLike: true } });
      if (latest?.successLooksLike?.trim() !== got.success) {
        await this.prisma.groundBaseline.create({
          data: {
            groundId,
            version: (latest?.version ?? 0) + 1,
            successLooksLike: got.success,
            conditions: (latest?.conditions ?? undefined) as any,
            changeReason: latest ? 'Restated in the context conversation.' : null,
            confirmedByAdminNote,
          },
        });
        wrote = true;
      }
    }

    const existing = await this.prisma.groundObjective.findMany({ where: { groundId }, select: { name: true, ownerParticipantId: true, target: true } });
    /* One name inside another is the same measure, because a second read of one paste renames things
       - "signed" and "signed sales" - and two names for one number is two answers. See theSameMeasure. */
    const held: { owner: string; name: string; target: number | null }[] = existing.map((o) => ({ owner: o.ownerParticipantId ?? 'team', name: (o.name ?? '').trim(), target: o.target ?? null }));
    /* Two names that end alike are one measure only when the numbers agree: "Q4 sales" at 180m and "credit
       as a share of sales" at 35 are two measures, and the second was silently never written. */
    const alreadyHeld = (owner: string, name: string, target: number | null) =>
      held.some((h) => h.owner === owner && theSameMeasure(h.name, name) && (h.target == null || target == null || h.target === target));
    const rows: { groundId: string; name: string; target: number | null; ownerParticipantId: string | null; sortOrder: number; direction?: string | null }[] = [];
    let sortOrder = existing.length;
    for (const t of got.teamTargets) {
      if (alreadyHeld('team', t.name, t.target)) continue;
      held.push({ owner: 'team', name: t.name, target: t.target });
      /* Decision 69: only a direction the lead said yes to on the list; otherwise not set. */
      rows.push({ groundId, name: t.name, target: t.target, ownerParticipantId: null, sortOrder: sortOrder++, direction: t.direction ?? null });
    }
    for (const p of got.forPeople) {
      for (const t of p.targets) {
        if (alreadyHeld(p.participantId, t.name, t.number)) continue;
        held.push({ owner: p.participantId, name: t.name, target: t.number });
        rows.push({ groundId, name: t.name, target: t.number, ownerParticipantId: p.participantId, sortOrder: sortOrder++, direction: null });
      }
    }
    if (rows.length) {
      await this.prisma.groundObjective.createMany({ data: rows as any }).catch((err: any) => this.logger.warn(`Could not write the paste's numbers on ${groundId}: ${err?.message}`));
      wrote = true;
    }

    for (const p of got.forPeople) {
      /* The same expectation said at a different length is the same expectation - a second read of one
         paste trims it. Matched on the words, not the characters. */
      const theirs = await this.prisma.personObjective.findMany({ where: { groundId, participantId: p.participantId }, select: { text: true } }).catch(() => [] as { text: string }[]);
      const already = theirs.some((o) => theSameMeasure(o.text ?? '', p.expectation));
      if (already) continue;
      await this.prisma.personObjective.create({
        data: { groundId, participantId: p.participantId, text: p.expectation, authoredBy: AUTHORED_AT_SETUP, seenBySubject: false },
      }).catch((err: any) => this.logger.warn(`Could not write an expectation from the paste on ${groundId}: ${err?.message}`));
      wrote = true;
    }

    /*
     * WHAT IS TO BE DONE, AS ROWS, WITH NOBODY MARKED AS HAVING DONE IT.
     *
     * Thirteen outstanding items and six personal commitments came out of the first paste and had
     * nowhere to go, because a target is a row and an action was not. Status starts UNKNOWN and only a
     * person moves it - the difference between "did you do your task" and "did the thing happen" is
     * the whole reason she asked for this. An item with no owner keeps no owner.
     */
    if (got.commitments.length && this.prisma.groundCommitment?.create) {
      const author = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } }).then((g) => g?.initiatorId ?? null).catch(() => null);
      const theirs = await this.prisma.groundCommitment.findMany({ where: { groundId }, select: { id: true, text: true, participantId: true } }).catch(() => [] as { id: string; text: string; participantId: string | null }[]);
      for (const c of got.commitments) {
        /*
         * THE SAME ACTION IS THE SAME ACTION WHOEVER IT IS FILED UNDER.
         *
         * Matched on the words (theSameMeasure) and NOT on the owner, because a second read of one
         * paste puts the same thing in a different place: "send proposal to Client B" came back as
         * Amina's once and as nobody's the next time, and the list carried both. Where the existing
         * row has no owner and the new read has one, the owner is added to the row that is there.
         */
        const same = theirs.find((h) => theSameMeasure(h.text ?? '', c.action));
        if (same) {
          if (!same.participantId && c.participantId) {
            await this.prisma.groundCommitment.update({ where: { id: same.id }, data: { participantId: c.participantId } })
              .catch((err: any) => this.logger.warn(`Could not place an action on ${groundId}: ${err?.message}`));
            same.participantId = c.participantId;
            wrote = true;
          }
          continue;
        }
        const made = await this.prisma.groundCommitment.create({
          select: { id: true },
          data: {
            groundId,
            participantId: c.participantId,
            text: c.action,
            outcome: c.outcome,
            whenSaid: c.when,
            explicit: c.theySaidIt,
            status: 'UNKNOWN',
            source: 'PASTE',
            authorUserId: author,
          },
        }).catch((err: any) => { this.logger.warn(`Could not keep an action from the paste on ${groundId}: ${err?.message}`); return null; });
        /* With its real id, so a later line of the same paste can place an owner on it. */
        if (made) theirs.push({ id: made.id, text: c.action, participantId: c.participantId });
        wrote = true;
      }
    }

    /*
     * AND THE PARTS THAT ARE WORDS, AS LINES IN NAMED BUCKETS.
     *
     * They used to be four long notes, each a list inside one blob of text, and Hafsah read the page
     * back on 22 September 2026: "the content needs to be parsed and paraphrased in sections - we
     * should have strategy bucket, or notes/tips etc. those sections are so bulky." A blob cannot be
     * edited, shared, retired or asked about. A line can - see GroundContextItem.
     *
     * The four work buckets are shared with the team by default, because that is what a lead wants:
     * the rules, the strategy, what is still to decide and what is not settled are about the work.
     * The three person kinds are never shared and never quoted, and the writer enforces that rather
     * than trusting a caller.
     */
    if (this.prisma.groundContextItem?.create) {
      const author = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } }).then((g) => g?.initiatorId ?? null).catch(() => null);
      const held = await this.prisma.groundContextItem.findMany({
        where: { groundId },
        select: { id: true, kind: true, text: true, aboutParticipantId: true },
      }).catch(() => [] as { id: string; kind: string; text: string; aboutParticipantId: string | null }[]);
      /* The same line said at a different length is the same line - see theSameMeasure. */
      const line = async (kind: ContextItemKind, text: string, opts?: { about?: string | null; saidAs?: string | null; exactQuestion?: string | null }) => {
        const clean = (text ?? '').trim();
        if (!clean) return;
        const about = opts?.about ?? null;
        if (held.some((h) => h.kind === kind && (h.aboutParticipantId ?? null) === about && theSameMeasure(h.text ?? '', clean))) return;
        held.push({ id: 'new', kind, text: clean, aboutParticipantId: about });
        await this.prisma.groundContextItem.create({
          data: {
            groundId,
            kind,
            text: clean.slice(0, 400),
            saidAs: opts?.saidAs?.trim()?.slice(0, 600) ?? null,
            /* A line about a person is the lead's alone, whatever anybody passes. */
            audience: ABOUT_SOMEBODY.has(kind) ? ContextNoteAudience.LEAD_ONLY : ContextNoteAudience.EVERYONE,
            aboutParticipantId: about,
            source: 'PASTE',
            authorUserId: author,
            confirmedByAdminNote,
            /* Never confirmed here: `questionConfirmedAt` is only ever set by the lead's own yes to it. */
            ...(kind === ContextItemKind.QUESTION_FOR_PERSON && opts?.exactQuestion ? { exactQuestion: opts.exactQuestion.slice(0, 400) } : {}),
          },
        }).catch((err: any) => this.logger.warn(`Could not keep a context line on ${groundId}: ${err?.message}`));
        wrote = true;
      };
      for (const t of got.strategy) await line(ContextItemKind.STRATEGY, t);
      for (const t of got.waysOfWorking) await line(ContextItemKind.WAY_OF_WORKING, t);
      for (const t of got.openDecisions) await line(ContextItemKind.DECISION, t);
      for (const t of got.notSettled) await line(ContextItemKind.UNSETTLED, t);
      for (const t of got.notes) await line(ContextItemKind.NOTE, t);
      /* The dates it named, as notes everyone can read. They used to be said back and then dropped. */
      for (const t of theDatesToKeep(got)) await line(ContextItemKind.NOTE, t);
      for (const a of got.aboutPeople) await line(ContextItemKind.ABOUT_A_PERSON, a.observation, { about: a.participantId });
      /*
       * A QUESTION IS KEPT WITH ITS EXACT SENTENCE, AND NOT CONFIRMED. The yes to the paste keeps it;
       * only the lead's yes to that one sentence lets it be asked. See confirmQuestionForPerson. An
       * older line with the same question and no sentence is given the draft, and still waits.
       */
      for (const q of got.questionsForPeople) {
        const exact = q.exactQuestion?.trim() || plainQuestionFrom(q.question, q.who);
        const older = held.find((h) => h.kind === ContextItemKind.QUESTION_FOR_PERSON && (h.aboutParticipantId ?? null) === q.participantId && theSameMeasure(h.text ?? '', q.question));
        if (older && older.id !== 'new') {
          await this.prisma.groundContextItem.updateMany({ where: { id: older.id, exactQuestion: null }, data: { exactQuestion: exact } })
            .catch((err: any) => this.logger.warn(`Could not draft an older question on ${groundId}: ${err?.message}`));
          continue;
        }
        await line(ContextItemKind.QUESTION_FOR_PERSON, q.question, { about: q.participantId, exactQuestion: exact });
      }
      for (const b of got.betweenPeople) await line(ContextItemKind.BETWEEN_PEOPLE, `${b.who.join(' and ')}: ${b.issue}`);
    }

    if (wrote) {
      /* What participants are told is rewritten only with the sentence the lead was shown before the
         yes (request 92, point 3). A list that did not show one leaves it as it was. The numbers are
         appended to it by whatAParticipantIsToldAboutThis, each person seeing the shared ones and
         their own. */
      if (got.toldToParticipants) {
        await this.prisma.ground.update({ where: { id: groundId }, data: { toldToParticipants: got.toldToParticipants } as any })
          .catch((err: any) => this.logger.warn(`Could not tell the team about ${groundId}: ${err?.message}`));
      }
      this.logger.log(`Ground ${groundId}: took a paste whole - ${got.teamTargets.length} team number(s), ${got.forPeople.length} person(s), success ${got.success ? 'set' : 'unchanged'}.`);
    }
    return wrote;
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
  /**
   * SHARE ONE NOTE WITH THE TEAM, DELIBERATELY.
   *
   * Her list, 22 September 2026: everything a paste writes is the lead's own note, private, so the
   * team board stayed empty of the agreements and the open decisions she had just handed over. The
   * answer is not a default - "we sort of agreed" must not become the team's rules by accident - it
   * is one action, on one note, by the person whose words they are.
   *
   * The rule a shared note has always carried holds here: a note everybody reads is about the whole
   * check-in, never about one named person. So this refuses a note about somebody rather than
   * quietly publishing a judgement of them.
   */
  async shareLeadContext(groundId: string, requestingUserId: string, noteId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, organizationId: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Decision 63: the lead, or - only once the lead has left the organisation - an admin standing
       in for them. Was any admin of the organisation, at any time; narrowed here. */
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const confirmedByAdminNote = confirm.as === 'admin' ? confirmedByAnAdminSentence(confirm.confirmedByName, confirm.leadName) : null;
    const note = await this.prisma.leadContextNote.findFirst({ where: { id: noteId, groundId }, select: { id: true, participantId: true, audience: true } });
    if (!note) throw new NotFoundException('That note is no longer on this check-in, so refresh the page.');
    if (note.participantId) {
      throw new BadRequestException(
        'A note everyone reads is about the whole check-in and not about one person. To say what you expect of somebody, say it in your own check-in, where it is published with your name on it.',
      );
    }
    if (note.audience === ContextNoteAudience.EVERYONE) return { id: note.id, audience: note.audience, alreadyShared: true };
    const shared = await this.prisma.leadContextNote.update({
      where: { id: note.id },
      data: { audience: ContextNoteAudience.EVERYONE, confirmedByAdminNote },
      select: { id: true, text: true, audience: true, participantId: true, createdAt: true, confirmedByAdminNote: true },
    });
    this.logger.log(`Ground ${groundId}: a context note was shared with the team${confirm.as === 'admin' ? ', by an admin because the lead has left' : ''}.`);
    return shared;
  }

  /**
   * A TO-DO'S STATE IS SET BY THE PERSON IT BELONGS TO, AND BY NOBODY ELSE.
   *
   * Not even the lead. That is the whole difference between a record and a manager's checklist: a
   * lead can say what they expect and can read what happened, and cannot mark somebody else's work
   * done. Hafsah's own framing of what this product is for - "did we achieve the thing", not "did
   * you do your task" - only holds if the person doing the thing owns the answer.
   *
   * UNKNOWN is a state somebody can return to, because "actually, not yet" is a correction and this
   * product takes corrections everywhere else.
   */
  async setMyCommitment(groundId: string, requestingUserId: string, itemId: string, status: string) {
    const clean = (status ?? '').trim().toUpperCase();
    if (!['DONE', 'NOT_DONE', 'DROPPED', 'UNKNOWN'].includes(clean)) {
      throw new BadRequestException('A to-do is done, not done, dropped, or nobody has said.');
    }
    const row = await this.prisma.groundCommitment.findFirst({
      where: { id: itemId, groundId },
      select: { id: true, participantId: true, text: true },
    });
    if (!row) throw new NotFoundException('That is no longer part of this check-in, so refresh the page.');
    if (!row.participantId) {
      throw new BadRequestException('Nobody owns this one yet. Say whose it is in the conversation and they can move it.');
    }
    const me = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId: requestingUserId }, select: { id: true } });
    if (!me || me.id !== row.participantId) {
      throw new ForbiddenException(
        'This one is somebody else\'s to move. You can say what you expect of them, and read what they say happened, and that is the difference between a record and a checklist.',
      );
    }
    const moved = await this.prisma.groundCommitment.update({
      where: { id: row.id },
      /* When it was settled, so a count over four weeks reads the date it was settled (week 9). By
         hand, so no check-in settled it; moved back to open, it is not settled at all. */
      data: { status: clean, settledAt: clean === 'DONE' || clean === 'NOT_DONE' ? new Date() : null, settledInCheckInId: null, settledBy: clean === 'DONE' || clean === 'NOT_DONE' ? 'SAID' : null },
      select: { id: true, text: true, status: true, participantId: true },
    });
    this.logger.log(`Ground ${groundId}: somebody moved their own to-do to ${clean}.`);
    /* Settled by hand is something new too (decision 7): what is counted from settled commitments reads it now. */
    if (clean === 'DONE' || clean === 'NOT_DONE') {
      this.events?.emit?.(GroundworkEvents.COMMITMENTS_SETTLED, { groundId, participantId: row.participantId } satisfies CommitmentsSettledEvent);
    }
    return moved;
  }

  /**
   * ONE LINE, CHANGED BY THE PERSON WHOSE LINE IT IS.
   *
   * The Context page used to be four blobs of text and three write boxes. Hafsah, 22 September 2026:
   * the boxes go, the buckets are lines, and everything is done from the conversation - so a line has
   * to be editable, shareable and retirable by id. Retired rather than deleted: a decision that was
   * made is not a decision that never existed.
   */
  /**
   * ONE LINE OF WHAT THIS CHECK-IN KNOWS, WRITTEN DIRECTLY.
   *
   * The Context page could change a line, share it, make it private and retire it, and could not
   * create one. Every line arrived through the context chat, which meant a lead on a check-in where
   * the chat is off could read five empty buckets, each telling them to "say it in the conversation
   * above", with no conversation above. A page whose every empty state points at a control that is
   * not there - saved as item B on the Context fix list, 23 September 2026.
   *
   * THE CHAT IS STILL THE WAY IN, and that decision stands: it asks the follow-up a form cannot, and
   * a line that arrives with nothing around it is worth less. This is the door for when there is no
   * chat, not a second front door beside it.
   *
   * A LINE ABOUT A PERSON CANNOT BE CREATED HERE AT ALL. `ABOUT_A_PERSON` is the lead's read of
   * somebody, never shared and never quoted, and it belongs to the conversation that can ask what it
   * rests on. Refused rather than accepted-and-hidden, which is how a form becomes a way to file
   * opinions about people.
   */
  async addContextLine(
    groundId: string,
    requestingUserId: string,
    line: { kind: string; text: string; audience?: 'LEAD_ONLY' | 'EVERYONE' },
  ) {
    line = { ...line, text: withoutBankDetails(line?.text) as string };
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true, status: true, endState: true, scenario: true },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Decision 63: the lead, or - only once the lead has left the organisation - an admin standing
       in for them. Was any admin of the organisation, at any time; narrowed here. */
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const confirmedByAdminNote = confirm.as === 'admin' ? confirmedByAnAdminSentence(confirm.confirmedByName, confirm.leadName) : null;
    /* The same door every other writer goes through: ended, held or out of time refuses alike. */
    const refused = whyItRefuses(ground.status, ground.endState, confirm.as === 'lead' ? 'the lead' : 'anybody else', ground.scenario);
    if (refused) throw new BadRequestException(refused);

    const text = (line.text ?? '').trim();
    if (!text) throw new BadRequestException('Type the line first.');
    if (text.length > 2000) throw new BadRequestException('That is too long for one line. Say the one thing and add another line for the next.');
    const kind = String(line.kind ?? '').toUpperCase();
    if (ABOUT_SOMEBODY.has(kind as any)) throw new BadRequestException(WHY_A_LINE_ABOUT_SOMEBODY_STAYS_YOURS);
    if (!['STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE'].includes(kind)) {
      throw new BadRequestException('That is not one of the things this check-in keeps.');
    }
    const audience = line.audience === 'LEAD_ONLY' ? 'LEAD_ONLY' : 'EVERYONE';
    if (audience === 'EVERYONE' && !mayBeShared(kind as any)) {
      throw new BadRequestException(WHY_A_LINE_ABOUT_SOMEBODY_STAYS_YOURS);
    }
    const made = await this.prisma.groundContextItem.create({
      data: {
        groundId, kind: kind as any, text, audience: audience as any,
        /* Typed in, not heard in a conversation and not pasted, and the record says which. */
        source: 'TYPED',
        authorUserId: requestingUserId,
        confirmedByAdminNote,
      },
      select: { id: true, kind: true, text: true, audience: true, confirmedByAdminNote: true },
    });
    this.logger.log(`Ground ${groundId}: a ${kind} line was typed in directly${confirm.as === 'admin' ? ', by an admin because the lead has left' : ''}.`);
    return made;
  }

  async changeContextLine(
    groundId: string,
    requestingUserId: string,
    itemId: string,
    change: { text?: string; audience?: 'LEAD_ONLY' | 'EVERYONE'; closed?: boolean },
  ) {
    if (typeof change?.text === 'string') change = { ...change, text: withoutBankDetails(change.text) };
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, organizationId: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Decision 63: the lead, or - only once the lead has left the organisation - an admin standing
       in for them. Was any admin of the organisation, at any time; narrowed here. */
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const confirmedByAdminNote = confirm.as === 'admin' ? confirmedByAnAdminSentence(confirm.confirmedByName, confirm.leadName) : null;
    const line = await this.prisma.groundContextItem.findFirst({ where: { id: itemId, groundId }, select: { id: true, kind: true } });
    if (!line) throw new NotFoundException('That line is no longer part of this check-in, so refresh the page.');
    const aQuestion = line.kind === ContextItemKind.QUESTION_FOR_PERSON;
    /* A line about a person can never be shared, whoever asks - see what-this-check-in-knows. */
    if (change.audience === 'EVERYONE' && !mayBeShared(line.kind)) {
      throw new BadRequestException(WHY_A_LINE_ABOUT_SOMEBODY_STAYS_YOURS);
    }
    const text = (change.text ?? '').trim();
    return this.prisma.groundContextItem.update({
      where: { id: line.id },
      data: {
        ...(text ? { text: text.slice(0, 400) } : {}),
        ...(change.audience ? { audience: change.audience === 'EVERYONE' ? ContextNoteAudience.EVERYONE : ContextNoteAudience.LEAD_ONLY } : {}),
        ...(change.closed === undefined ? {} : { closedAt: change.closed ? new Date() : null }),
        /* A question reworded, or opened again, waits for the lead's yes to its sentence once more. */
        ...(aQuestion && text ? aQuestionReworded(text) : {}),
        ...(aQuestion && change.closed !== undefined ? { questionConfirmedAt: null } : {}),
        confirmedByAdminNote,
      },
      select: { id: true, kind: true, text: true, audience: true, aboutParticipantId: true, closedAt: true, confirmedByAdminNote: true },
    });
  }

  /**
   * THE LEAD'S QUESTIONS FOR PEOPLE, ONE CARD EACH, WITH THE EXACT SENTENCE ON IT. Decision 34.
   *
   * Waiting ones first: those are what the lead has to do something about. A line kept before 28
   * September has no sentence, so it is shown its own words made one, marked as written before, and
   * - like every waiting one - is read into nobody's session until the lead confirms it. Retired and
   * left-out ones are not listed. Only ever built for the lead or an admin in their organisation;
   * every caller checks that first.
   */
  async theQuestionsForPeople(groundId: string): Promise<AQuestionForAPerson[]> {
    const [lines, people] = await Promise.all([
      (this.prisma.groundContextItem?.findMany?.({
        where: { groundId, kind: ContextItemKind.QUESTION_FOR_PERSON, closedAt: null },
        select: { id: true, text: true, aboutParticipantId: true, exactQuestion: true, questionConfirmedAt: true, confirmedByAdminNote: true },
        orderBy: { createdAt: 'asc' },
      }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
      this.prisma.groundParticipant.findMany({
        where: { groundId },
        select: { id: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
      }).catch(() => [] as any[]),
    ]);
    const nameOf = (pid: string | null | undefined) => {
      const p = (people as any[]).find((x) => x.id === pid);
      return p ? theNameWeUseFor(p as any) : 'somebody';
    };
    const cards = (lines as any[]).filter((l) => (l.text ?? '').trim()).map((l) => aQuestionAsTheLeadReadsIt(l, nameOf(l.aboutParticipantId)));
    return [...cards.filter((c) => c.status === 'waiting'), ...cards.filter((c) => c.status === 'confirmed')];
  }

  /** The lead's own questions, read by the lead or an admin in their organisation. */
  async questionsForPeople(groundId: string, requestingUserId: string): Promise<AQuestionForAPerson[]> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    if (ground.initiatorId !== requestingUserId && !readsAsAnAdmin({ ...viewer, userId: requestingUserId }, ground)) {
      throw new ForbiddenException('Only the person who runs this check-in can see or change the questions for people. Nothing was changed.');
    }
    return this.theQuestionsForPeople(groundId);
  }

  /**
   * A QUESTION FOR ONE PERSON, SAID IN ONE SENTENCE (request 92, point 11): "ask Amani whether the
   * Kilimani shops have paid". Finds the person on this check-in and works out the sentence Groundwork
   * would ask, word for word, and writes nothing. The lead is shown that sentence and confirms it
   * (decision 34) before anything is kept or asked; `keepAQuestionForAPerson` is the yes.
   */
  async theQuestionForAPerson(
    groundId: string,
    requestingUserId: string,
    said: { name: string; leadWords: string },
  ): Promise<{ participantId: string; who: string; exactQuestion: string }> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Decisions 63 and 72: the lead, or an admin only once the lead has left, as at the yes that keeps it
       (keepAQuestionForAPerson). Was any admin of the organisation, at any time. */
    await this.mayConfirmSetupOn(ground, requestingUserId);
    const people = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      select: { id: true, email: true, nameGiven: true, roleAsDescribed: true, managingOnly: true, userId: true, user: { select: { firstName: true, lastName: true } } },
    });
    const onIt = people.filter((p) => !p.managingOnly);
    const found = whoThisNameIs(said.name, onIt as any);
    if (!found) {
      throw new BadRequestException(`I cannot find anybody called ${said.name.trim()} on this check-in, so nothing was asked. Say the name as it is on the check-in and I will try again.`);
    }
    const privateWords = [found.roleAsDescribed, ...(await this.theLeadsOwnWordsAbout(groundId, found.id))];
    const exactQuestion = await this.theExactQuestionFor(found.id, found as any, said.leadWords, privateWords, said.leadWords);
    if (!exactQuestion) throw new BadRequestException('I could not work out the question to ask, so nothing was asked. Say it again in a sentence.');
    return { participantId: found.id, who: theNameWeUseFor(found as any), exactQuestion };
  }

  /**
   * THE YES TO THAT SENTENCE: the question is kept as a line only the lead reads, and confirmed in the
   * same step, because the lead has just read exactly what will be asked and said yes to it. The door
   * is the one every other confirmation goes through, so an admin is refused while the lead is here.
   */
  async keepAQuestionForAPerson(
    groundId: string,
    requestingUserId: string,
    dto: { participantId: string; leadWords: string; exactQuestion: string },
  ) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, status: true, endState: true, scenario: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const refused = whyItRefuses(ground.status, ground.endState, confirm.as === 'lead' ? 'the lead' : 'anybody else', ground.scenario);
    if (refused) throw new BadRequestException(refused);
    const person = await this.prisma.groundParticipant.findFirst({ where: { id: dto.participantId, groundId }, select: { id: true } });
    if (!person) throw new NotFoundException('That person is not on this check-in.');
    const made = await this.prisma.groundContextItem.create({
      data: {
        groundId,
        kind: ContextItemKind.QUESTION_FOR_PERSON,
        text: (withoutBankDetails(dto.leadWords) as string).trim().slice(0, 400),
        audience: ContextNoteAudience.LEAD_ONLY,
        aboutParticipantId: dto.participantId,
        source: 'CHAT',
        authorUserId: requestingUserId,
        exactQuestion: dto.exactQuestion.slice(0, 400),
      },
      select: { id: true },
    });
    return this.confirmQuestionForPerson(groundId, requestingUserId, made.id, { exactQuestion: dto.exactQuestion });
  }

  /**
   * THE LEAD'S YES TO ONE QUESTION, IN THE WORDS THEY READ OR THE WORDS THEY CHANGED IT TO.
   *
   * With no `exactQuestion`, the sentence on the card is what is confirmed - the stored one, or for a
   * line from before 28 September its own words made a sentence, which is exactly what the card
   * showed. With one, their wording becomes the question, word for word; it is theirs, so nothing
   * here rewrites it, and only a bank or card number is hidden, as everywhere a person types.
   *
   * The lead's alone, like the context chat's confirmation: an admin covering for them can read the
   * questions, and the yes that puts a question to somebody stays with the person who runs it.
   */
  async confirmQuestionForPerson(
    groundId: string,
    requestingUserId: string,
    itemId: string,
    dto: { exactQuestion?: string | null } = {},
  ): Promise<AQuestionForAPerson & { say: string }> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, status: true, endState: true, scenario: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Decision 63: the lead, or - only once the lead has left the organisation - an admin standing
       in for them. See mayConfirmSetupOn and who-may-confirm-setup.ts. */
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const confirmedByAdminNote = confirm.as === 'admin' ? confirmedByAnAdminSentence(confirm.confirmedByName, confirm.leadName) : null;
    /* The same door every other writer goes through: ended, held or out of time refuses alike. */
    const refused = whyItRefuses(ground.status, ground.endState, confirm.as === 'lead' ? 'the lead' : 'anybody else', ground.scenario);
    if (refused) throw new BadRequestException(refused);
    const line = await this.prisma.groundContextItem.findFirst({
      where: { id: itemId, groundId, kind: ContextItemKind.QUESTION_FOR_PERSON },
      select: { id: true, text: true, aboutParticipantId: true, exactQuestion: true, closedAt: true },
    });
    if (!line) throw new NotFoundException('That question is not on this check-in.');
    if (line.closedAt) throw new BadRequestException('You left this question out. Open it again on the Context and resources page first if you want it asked.');
    if (!line.aboutParticipantId) throw new BadRequestException('This question is not for anybody on this check-in, so there is nobody to ask it.');
    const edited = typeof dto?.exactQuestion === 'string' ? (withoutBankDetails(dto.exactQuestion) as string).replace(/\s+/g, ' ').trim() : '';
    if (typeof dto?.exactQuestion === 'string' && !edited) throw new BadRequestException('Write the question as you want it asked first.');
    if (edited.length > 400) throw new BadRequestException('That is too long to ask as one question. Keep it to one or two sentences.');
    const people = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      select: { id: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
    });
    const person = people.find((p) => p.id === line.aboutParticipantId);
    const who = person ? theNameWeUseFor(person as any) : 'somebody';
    const exactQuestion = edited || (line.exactQuestion ?? '').trim() || plainQuestionFrom(line.text, who);
    if (!exactQuestion) throw new BadRequestException('Write the question as you want it asked first.');
    const saved = await this.prisma.groundContextItem.update({
      where: { id: line.id },
      data: { exactQuestion, questionConfirmedAt: new Date(), confirmedByAdminNote },
      select: { id: true, text: true, aboutParticipantId: true, exactQuestion: true, questionConfirmedAt: true, confirmedByAdminNote: true },
    });
    this.logger.log(`Ground ${groundId}: ${confirm.as === 'lead' ? 'the lead' : 'an admin, because the lead has left'} confirmed a question for somebody${edited ? ', in their own changed words' : ''}.`);
    const card = aQuestionAsTheLeadReadsIt(saved as any, who);
    return { ...card, say: `I have confirmed it. Groundwork will ask ${who} "${exactQuestion}" in their next check-in, word for word.` };
  }

  /** Not now: the question is left out, and is asked of nobody. Kept rather than deleted, like every line. */
  async declineQuestionForPerson(groundId: string, requestingUserId: string, itemId: string): Promise<{ id: string; status: 'left out'; say: string }> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Decision 63: the lead, or - only once the lead has left the organisation - an admin standing
       in for them. */
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const confirmedByAdminNote = confirm.as === 'admin' ? confirmedByAnAdminSentence(confirm.confirmedByName, confirm.leadName) : null;
    const line = await this.prisma.groundContextItem.findFirst({
      where: { id: itemId, groundId, kind: ContextItemKind.QUESTION_FOR_PERSON },
      select: { id: true, aboutParticipantId: true },
    });
    if (!line) throw new NotFoundException('That question is not on this check-in.');
    await this.prisma.groundContextItem.update({ where: { id: line.id }, data: { closedAt: new Date(), questionConfirmedAt: null, confirmedByAdminNote } });
    const person = line.aboutParticipantId
      ? await this.prisma.groundParticipant.findFirst({ where: { id: line.aboutParticipantId, groundId }, select: { id: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } }).catch(() => null)
      : null;
    const who = person ? theNameWeUseFor(person as any) : 'anybody';
    return { id: line.id, status: 'left out', say: `I have left it out. Groundwork will not ask ${who} this question.` };
  }

  async addLeadContext(groundId: string, requestingUserId: string, dto: { participantId?: string | null; text: string; audience?: 'LEAD_ONLY' | 'EVERYONE' }) {
    dto = { ...dto, text: withoutBankDetails(dto?.text) as string };
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /**
     * DECISION 63, 30 September 2026, NARROWS THIS: only the lead confirms setup changes, unless the
     * lead has left the organisation, in which case an admin can, in their place. This used to let
     * ANY admin of the organisation write context at any time, reasoning that they could already do
     * the heavier things - release the report, close the check-in - and a lead mid-check-in could be
     * silently overridden by any admin who felt like it. `mayConfirmSetupOn` is the one place this
     * question is decided now, so this file no longer disagrees with itself.
     *
     * WHAT DOES NOT CHANGE: a note is still never quoted, and a note about a person is still never
     * shown to that person. Who may WRITE one is a different question from what one may be used for.
     */
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const confirmedByAdminNote = confirm.as === 'admin' ? confirmedByAnAdminSentence(confirm.confirmedByName, confirm.leadName) : null;
    const text = (dto.text ?? '').trim();
    if (!text) throw new BadRequestException('Write the note first, then add it.');
    if (dto.participantId) {
      const target = await this.prisma.groundParticipant.findFirst({ where: { id: dto.participantId, groundId } });
      if (!target) throw new BadRequestException('That person is not in this check-in, so choose someone who is.');
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
        'A note everyone reads is about the whole check-in and not about one person. To say what you expect of somebody, say it in your own check-in, where it is published with your name on it. To note something only you should see, keep this note private.',
      );
    }

    return this.prisma.leadContextNote.create({
      data: { groundId, participantId: dto.participantId ?? null, authorUserId: requestingUserId, text, audience, confirmedByAdminNote },
      select: { id: true, participantId: true, text: true, createdAt: true, audience: true, confirmedByAdminNote: true },
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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Only the person who runs this check-in can change this, so ask them to.');
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
  private async aSettingOnlyTheLeadMayChange(groundId: string, requestingUserId: string, verb: 'change' | 'read' = 'change') {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const viewer = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    if (verb === 'change') {
      /* Decision 119, H10: changing it is the lead's, and an admin's only once the lead has left. */
      await this.mayConfirmSetupOn(ground, requestingUserId);
      return;
    }
    if (ground.initiatorId !== requestingUserId && !adminsThisOrg({ ...viewer, userId: requestingUserId }, ground)) {
      throw new ForbiddenException(
        `Only the lead of this check-in, or an admin in this organisation, can ${verb} this.`,
      );
    }
  }

  /** Whether people on this check-in see each other's numbers, or only their own. */
  /**
   * THE KIND OF WORK, READ FROM SETUP (request 76). One of the eleven kinds in
   * board/the-kind-of-work.ts, read from the lead's own words and the brief with the model, and kept
   * only when the answer is exactly one of the eleven. Never over a lead's own choice: once the lead
   * has set it, only the lead changes it. Best effort: a failed read leaves it as it was.
   */
  async readTheKindOfWork(groundId: string): Promise<void> {
    try {
      const g = await this.prisma.ground.findUnique({
        where: { id: groundId },
        select: { label: true, brief: true, endState: true, resolutionState: true, kindOfWorkSetBy: true, kindOfWork: true },
      });
      if (!g || theReadingMustLeaveIt(g.kindOfWorkSetBy)) return;
      /* A check-in that already has a kind keeps it, offered or not (docs/deploy.md, "Hidden at release"). */
      const hasOne = oneOfTheKinds(g.kindOfWork);
      const words = theSetupWords(g);
      if (!words.trim()) return;
      const answer = await this.anthropic.extract<{ kind?: string }>(
        THE_KIND_OF_WORK_PROMPT,
        [{ role: 'user', content: words }],
        THE_KIND_OF_WORK_SCHEMA,
      );
      const read = oneOfTheKinds(answer?.kind);
      /* A kind not offered at release is never given to a check-in by the read; one it already holds stays. */
      const kind = read && (await aKindMayBeGiven(this.prisma, read, hasOne)) ? read : null;
      if (read && !kind && hasOne) return;
      /* The model call above can take seconds, and the lead (or a script) may choose a kind meanwhile.
         So the write itself says "only if nobody else has chosen", in one statement, never a check
         made before the call. A choice made in the meantime is left exactly as it is. */
      await this.prisma.ground.updateMany({
        where: { id: groundId, OR: [{ kindOfWorkSetBy: null }, { kindOfWorkSetBy: 'read' }] },
        data: { kindOfWork: kind, kindOfWorkSetBy: kind ? 'read' : null },
      });
    } catch (err: any) {
      this.logger.warn(`Reading the kind of work for ${groundId} failed: ${err?.message}`);
    }
  }

  /**
   * THE LEAD CHANGES THE KIND OF WORK, AND ITS STAGE NAMES. `kind` must be one of the eleven or null
   * (none of them); anything else is refused in plain words rather than stored. `stages` are the
   * organisation's own names, in order; an empty list goes back to the kind's defaults.
   */
  async setKindOfWork(groundId: string, requestingUserId: string, body: { kind?: string | null; stages?: string[] | null }) {
    await this.aSettingOnlyTheLeadMayChange(groundId, requestingUserId);
    const data: Record<string, any> = {};
    if (body.kind !== undefined) {
      const kind = body.kind === null ? null : oneOfTheKinds(body.kind);
      if (body.kind !== null && !kind) {
        throw new BadRequestException(`That is not one of the kinds of work Groundwork knows. Choose one of these: ${KINDS_OF_WORK.join(', ')}.`);
      }
      if (kind) {
        const holds = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { kindOfWork: true } });
        if (!(await aKindMayBeGiven(this.prisma, kind, holds?.kindOfWork))) {
          const offered = await theBoardKindsOffered(this.prisma);
          throw new BadRequestException(`Groundwork does not offer that kind of work yet. Choose ${offered.length ? `one of these: ${offered.join(', ')}` : 'none of them, because none is offered at the moment'}.`);
        }
      }
      data.kindOfWork = kind;
      data.kindOfWorkSetBy = 'lead';
    }
    if (body.stages !== undefined) {
      const own = Array.isArray(body.stages) ? body.stages.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 60)).slice(0, 12) : [];
      data.workStages = own.length ? own : null;
    }
    return this.prisma.ground.update({
      where: { id: groundId },
      data,
      select: { id: true, kindOfWork: true, kindOfWorkSetBy: true, workStages: true },
    });
  }

  async setWhoSeesTargets(groundId: string, requestingUserId: string, everybody: boolean) {
    await this.aSettingOnlyTheLeadMayChange(groundId, requestingUserId);
    return this.prisma.ground.update({
      where: { id: groundId },
      data: { whoSeesTargets: everybody ? 'EVERYBODY' : 'THEIR_OWN' },
      select: { id: true, whoSeesTargets: true },
    });
  }

  /**
   * USE SIMPLER WORDS. Off for every check-in that existed before. When it is on, everybody in the
   * check-in is spoken to in short sentences and everyday words, and everything sent afterwards uses
   * the plainer form of its fixed sentences. Same permission as its neighbours.
   */
  async getSimplerWords(groundId: string, requestingUserId: string) {
    await this.aSettingOnlyTheLeadMayChange(groundId, requestingUserId, 'read');
    return this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, simplerWords: true } });
  }

  async setSimplerWords(groundId: string, requestingUserId: string, on: unknown) {
    await this.aSettingOnlyTheLeadMayChange(groundId, requestingUserId);
    if (typeof on !== 'boolean') throw new BadRequestException('Say whether to use simpler words, with true or false.');
    return this.prisma.ground.update({
      where: { id: groundId },
      data: { simplerWords: on },
      select: { id: true, simplerWords: true },
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
      select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    /* Decision 119, H10: the lead, or an admin once the lead has left. */
    await this.mayConfirmSetupOn(ground, requestingUserId);

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
      select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    /* Decision 119, H10: the lead, or an admin once the lead has left. */
    await this.mayConfirmSetupOn(ground, requestingUserId);

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
     * DECISION 66, 30 SEPTEMBER 2026: A NOTE TYPED ON THE CONTEXT AND RESOURCES TAB COUNTS TOO,
     * SHARED OR PRIVATE, THE SAME AS THE OLDER leadContextNote ROW ABOVE.
     *
     * That tab now writes lines into groundContextItem, sorted into five buckets: the strategy, how
     * we work, still to decide, not settled, and notes. Only the last of those is called a note on
     * the tab itself - the other four are titled by what they are ("The strategy", "How we work",
     * "Still to decide", "Not settled"), never "note". So only kind NOTE counts here; a line about
     * the strategy or a still-open decision says something about the work, but it is not what "a
     * note" means to the person reading this refusal, and stretching the word past what the tab
     * calls it would make the fix as confusing as the bug it replaces. A retired line (closedAt set)
     * does not count - it is no longer live, and neither is what it once said.
     *
     * WHAT STILL DOES NOT COUNT: adding a person. The gate exists so that nobody opens their first
     * session and answers into a vacuum, and the act of inviting somebody says nothing about what
     * the check-in is for. A gate cleared by the action it guards is not a gate.
     */
    const [documents, notes, ground, expectations, contextNotes] = await Promise.all([
      this.prisma.groundDocument.count({ where: { groundId } }),
      this.prisma.leadContextNote.count({ where: { groundId } }),
      this.prisma.ground.findUnique({
        where: { id: groundId },
        select: { brief: true, scenario: true },
      }),
      this.prisma.personObjective.count({ where: { groundId } }),
      this.prisma.groundContextItem.count({
        where: { groundId, kind: ContextItemKind.NOTE, closedAt: null },
      }),
    ]);
    if (documents > 0 || notes > 0 || expectations > 0 || contextNotes > 0) return;
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
          + 'on the Context and resources tab.'
        : 'Nobody can be invited yet: nothing has been said about what this check-in is for. Write the '
          + 'brief, say what you expect of somebody, add a document or a note on the Context and resources tab, or do '
          + 'your own check-in first.',
    );
  }

  async addParticipant(groundId: string, organizationId: string, initiatorId: string, dto: AddParticipantDto) {
    /* A colleague picked by id (U.4): their address is looked up here, never sent to the page. */
    /**
     * THEIR REAL NAME, CARRIED FORWARD WITH THE ADDRESS (U.8 re-review).
     *
     * Picking somebody from the colleague list is not a cold, typed-email invite - the id already
     * names a real account. Keeping only the address and dropping the name left the row as bare as
     * a stranger's typed email, so every screen that shows this person before they accept fell back
     * to guessing a name from the address ("Amani U8" for an account named Amani Wekesa). `userId`
     * still stays null until they actually accept - this only fills in what to call them meanwhile.
     */
    let colleagueName: string | null = null;
    if (dto.colleagueId) {
      const found = await theColleaguePickedById(this.prisma as any, organizationId, dto.colleagueId);
      if (!found) throw new BadRequestException(NOT_SOMEONE_HERE);
      dto = { ...dto, email: found.email };
      colleagueName = found.name;
    }
    /*
     * "PIA ALPHA <pia@brightloom.test>" IS PIA'S ADDRESS AND HER NAME, NOT ONE ADDRESS (journey test, 12 October).
     * Every door that adds a person comes through here (the entry chat's commit calls this too, with no
     * request check in between), so the address is taken out of such a line here, once, and the name
     * goes beside it. Something that is still not an address is refused with the setup screen's sentence.
     */
    if (dto.email) {
      const { email: address, name } = theAddressAndNameIn(dto.email);
      if (!theDomainOf(address)) throw new BadRequestException('That does not look like an email address. Check it and try again.');
      dto = { ...dto, email: address, ...(name && !dto.displayName?.trim() ? { displayName: name } : {}) };
    }
    /* Added by address, but already working here: their own name from their membership, not the address (user journeys, F-7). */
    if (!colleagueName && !dto.displayName?.trim() && dto.email) {
      colleagueName = (await theMemberWithThisAddress(this.prisma as any, organizationId, dto.email))?.name ?? null;
    }
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
    /*
     * THE PERSON IS NAMED NOW AND INVITED WHEN AN ADMIN ACCEPTS (known issue B5; screens request 174 item 3).
     *
     * This used to refuse, and a lead who is not an admin lost everybody she had named when she saved, with a note that stayed after
     * approval. The point of the gate is that no invitation goes out before the approval, because an email cannot be recalled by
     * declining afterwards. That still holds: the row is written with `invitedAt` null and no email goes, exactly as for a start date
     * that is ahead or no seat, and `approve` sends it, once, when an admin accepts. The status is not moved on either, so naming
     * somebody cannot take the check-in past the approval.
     */
    const pending = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId, status: GroundStatus.AWAITING_APPROVAL },
      select: { id: true },
    });
    const heldForApproval = !!pending;

    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

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
        hasEnded(ground.status) ? 'This check-in has ended. Nobody can be added to it.'
          : hasStalled(ground.status) ? IT_RAN_OUT_OF_TIME
          : WHILE_IT_IS_HELD,
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
      throw new ForbiddenException('Only the person who runs this check-in, or the admin who set it up, can add someone, so ask one of them.');
    }

    const initiator = await this.prisma.user.findUnique({ where: { id: initiatorId } });

    // Magic-link invite token, persisted on the participant. They accept it to
    // create/link a user, set userId, and enter their private check-in.
    // If the entry flow pre-generated a token (so the share link could be shown
    // immediately before auth), honour it here - no separate lookup needed.
    /* Tokens are made here and nowhere else: one a caller supplies is ignored (reviewer's audit, 7 October). */
    const token = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = inviteExpiryFrom();

    // Prevent duplicate participant - surface a clean 400 instead of a Prisma constraint error.
    // Exception: if the existing record was never accepted (userId=null), refresh the token and
    // re-send the invite rather than permanently blocking the address.
    const existing = await this.prisma.groundParticipant.findFirst({
      where: { groundId, email: dto.email.toLowerCase() },
    });
    if (existing) {
      if (existing.userId !== null) throw new BadRequestException('That person is already in this check-in, so there is no need to add them again.');
      /* Somebody from another organisation is a guest here from now, not only once they click (U.4 review). */
      await aGuestHereIfTheyAreFromElsewhere(this.prisma as any, ground.organizationId, dto.email);
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
      /* While the check-in waits for an admin, nobody is written to, whether this is the first time or the second (the approval sends it, once). */
      if (heldForApproval) {
        return {
          ...theInvitedRowAsServed(existing),
          alreadyInvited: false,
          notInvitedBecause: 'waiting_for_approval' as const,
          saying: `The invitation to ${dto.email.toLowerCase()} will go as soon as an admin accepts this check-in.`,
        };
      }
      await this.prisma.groundParticipant.update({
        where: { id: existing.id },
        data: { inviteToken: freshToken, inviteTokenExpiresAt: freshExpiry, notifiedAt: null },
      });
      const emailResult = await this.email.sendTheInviteThisGroundSends(
        ground,
        dto.email.toLowerCase(),
        `${initiator?.firstName ?? 'A founder'}`,
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
       *
       * AN EXPLICIT SHAPE, NOT THE ROW (reviewer's audit, 7 October): the row carries the stop-reminders token, the invitation's expiry,
       * how specific their answers were, what function they were detected in, and their private summary, none of which the lead is told.
       */
      return {
        ...theInvitedRowAsServed(existing),
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
    /*
     * A FREE RUN IS COVER, AND EVERY GATE ASKED THE WRONG QUESTION.
     *
     * Hafsah, 23 September 2026: "We gave them an updated free trial where they can use this for 1
     * month for free for all their team but they still only have the 5 people, the tool is refusing
     * to click send the invite to the rest of the team."
     *
     * `isCovered` knows about a free run - it reads `freeUntil` and `freePlan` alongside the paid
     * pair, and its own comment in common/subscription calls it "the read most gates want". It was
     * used in exactly one file in the codebase, billing, and every gate that actually stops a person
     * asked `isSubscribed`, which only sees a paid plan. So a month given away lifted nothing, and
     * the customer was told to subscribe to something they had already been given.
     */
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPlan: true, subscriptionStatus: true, freeUntil: true, freePlan: true },
    });
    const covered = !!org && isCovered(org);

    if (ground.isFreeGround && !covered) {
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
      where: { email: dto.email.toLowerCase(), ...seatsIn(organizationId) },
    });
    let waitingForASeat: SeatAnswer = { room: true };
    if (!alreadyHereWithASeat) {
      const [seatsTaken, seatsIncluded] = await Promise.all([
        this.prisma.user.count({ where: seatsIn(organizationId) }),
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
    /*
     * THE TEAM'S FIRST SESSION OPENS AT THE START THE LEAD CHOSE (item 5, 11 October 2026). The
     * choice ("Now", "Tomorrow" or a date) only held the invitation back; the session itself had no
     * gate, so anybody holding the link could answer session 1 before the check-in started. A start
     * still to come now opens session 1 on that day. "Now", or a start already passed, stays null.
     */
    const theStartChosen = [startsAt, (ground as any).startsAt ? new Date((ground as any).startsAt) : null]
      .filter((d): d is Date => !!d && d.getTime() > Date.now())
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    let session1AvailableFrom: Date | null = theStartChosen;
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

    /* After every refusal above, so a refused add leaves nothing behind (U.4 review). Held when there
       is no seat for them: a guest with an account takes a seat (U.4 re-review). */
    await aGuestHereIfTheyAreFromElsewhere(this.prisma as any, ground.organizationId, dto.email, !waitingForASeat.room);
    const participant = await this.prisma.$transaction(async (tx) => {
      const participant = await tx.groundParticipant.create({
        data: {
          groundId,
          email: dto.email.toLowerCase(),
          partyType: PartyType.PARTICIPANT,
          roleAsDescribed: dto.roleAsDescribed,
          /* Their real account name, when they were picked from the colleague list rather than
             typed in cold. Every reader already prefers this to a guess from the address the
             moment `user.firstName` itself is not yet available (see theirName, party-labels.ts). */
          ...(colleagueName ? { nameGiven: colleagueName } : {}),
          /* What the lead calls this person, typed beside the address ("Name + email"), when they were not picked from the colleague list. */
          ...(!colleagueName && dto.displayName?.trim() ? { nameGiven: dto.displayName.trim().slice(0, 120) } : {}),
          /* What they are accountable for, in the lead's words. It used to be emailed and then lost. */
          remitAsGiven: dto.note?.trim() || null,
          department: dto.department?.trim() || null,
          /* The lead, or the admin who set it up: the door rule asks which (U.4). */
          addedByUserId: initiatorId,
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
          invitedAt: startsInFuture || heldForApproval || !waitingForASeat.room ? null : new Date(),
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
      if (ground.status !== GroundStatus.AWAITING_LEAD && !heldForApproval) {
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
    if (!startsInFuture && !heldForApproval && waitingForASeat.room) {
    try {
      emailResult = await this.email.sendTheInviteThisGroundSends(
        ground,
        dto.email.toLowerCase(),
        `${initiator?.firstName ?? 'A founder'}`,
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
      data: { notifiedAt: startsInFuture || heldForApproval || !waitingForASeat.room ? null : new Date() },
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
    /* Their home from their memberships, not the organisation they last switched to (U.4 third review). */
    const account = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        memberships: { select: { organizationId: true, role: true, createdAt: true, organization: { select: { name: true, ownerUserId: true } } } },
      },
    });
    const theirMemberships = account?.memberships ?? [];
    const home = account ? theirHome(account.id, theirMemberships as any) : null;
    const belongsHere = theirMemberships.some((m) => m.organizationId === organizationId && m.role !== 'GUEST');
    const fromAnotherOrg = !!account && !belongsHere && !!home && home.id !== organizationId;
    /*
     * "NOT INVITED YET" IS THREE DIFFERENT FACTS. The start date is ahead, there is no seat, or the
     * mail did not send - and the screen read them all as one null and told the lead "invited on the
     * start date", false in two of the three. The row carries the facts; this names them.
     */
    const notInvitedBecause: 'starts_later' | 'no_seat' | 'mail_failed' | 'waiting_for_approval' | null = emailFailed
      ? 'mail_failed'
      : !waitingForASeat.room
        ? 'no_seat'
        : heldForApproval
          ? 'waiting_for_approval'
          : invitedAt
            ? null
            : 'starts_later';
    return {
      id, email, partyType, userId, roleAsDescribed, invitedAt: emailFailed ? null : invitedAt, notifiedAt, soloArtifactAt, createdAt,
      /* The name the lead typed, as she typed it, so the row she is shown is never "Somebody invited by email" (journey test, 12 October). */
      nameGiven: colleagueName ?? (dto.displayName?.trim() ? dto.displayName.trim().slice(0, 120) : null),
      notInvitedBecause,
      devUrl: emailResult?.devUrl,
      emailFailed,
      /* On the check-in, not written to, until an admin makes room. The lead is told exactly that -
         see added-but-waiting-for-a-seat.ts for why this is a sentence and not a refusal. */
      awaitingSeat: !waitingForASeat.room,
      ...(waitingForASeat.room ? {} : { saying: waitingForASeat.saying }),
      /* Named, and invited the moment an admin accepts this check-in; said as a sentence, never starting with an address. */
      ...(heldForApproval && waitingForASeat.room
        ? { saying: dto.displayName?.trim() || colleagueName ? `${(dto.displayName?.trim() || colleagueName)!.split(/\s+/)[0]} will be invited as soon as an admin accepts this check-in.` : `The invitation to ${email} will go as soon as an admin accepts this check-in.` }
        : {}),
      /* Named, because "somebody from another organisation" is not something a lead can act on and
         a company name is. Never the person's other colleagues, only where they belong. */
      ...(fromAnotherOrg
        ? { guestFrom: home?.name ?? 'another organisation' }
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
  async resendParticipantInvite(groundId: string, participantId: string, organizationId: string, userId: string, role: string): Promise<{ message: string }> {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /*
     * ONLY WHOEVER RUNS THE CHECK-IN, OR AN ORGANISATION ADMIN (request 178). This checked the organisation and nothing else, so any member of it, a person in
     * the check-in, or a guest could make Groundwork send an invitation in the lead's name. The same two people may add a participant (the lead, or the
     * admin who set it up), and an organisation admin may too.
     */
    const runsIt = ground.initiatorId === userId || (!!ground.createdByUserId && ground.createdByUserId === userId);
    if (!runsIt && role !== 'ADMIN') {
      throw new ForbiddenException('Only the person who runs this check-in, or an administrator of the organisation, can send an invitation again.');
    }

    const participant = await this.prisma.groundParticipant.findFirst({ where: { id: participantId, groundId }, include: { user: { select: { firstName: true } } } });
    if (!participant) throw new NotFoundException('That person is not in this check-in, so check the name and try again.');
    const theirName = ((participant as any).user?.firstName ?? (participant as any).nameGiven ?? '').toString().trim() || 'This person';
    /*
     * SOMEBODY WAITING FOR A SEAT GETS NO INVITATION (request 180 item 5). Their link leads to "This check-in cannot start for you yet",
     * with no way forward, so nothing is sent and the lead is told why. Asked before "already joined": a person held for a seat may have
     * an account already, and the invitation would still lead nowhere.
     */
    if ((participant as any).awaitingSeat === true) {
      throw new BadRequestException(`${theirName} is waiting for a seat on the plan, so an invitation would not let them in yet. They will get their invitation as soon as there is a seat for them.`);
    }
    if (participant.userId) throw new BadRequestException(`${theirName} has already joined this check-in, so there is no invitation to send again.`);

    // Block resend if the participant has already completed a check-in via the invite flow.
    const completedCheckIn = await this.prisma.checkIn.findFirst({
      where: { participantId, status: CheckInStatus.COMPLETED },
    });
    if (completedCheckIn) throw new BadRequestException('That person has already finished their check-in, so there is nothing more to send.');

    const token = participant.inviteToken ?? crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = inviteExpiryFrom();

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: { inviteToken: token, inviteTokenExpiresAt },
    });

    const initiator = await this.prisma.user.findUnique({ where: { id: ground.initiatorId } });
    await this.email.sendTheInviteThisGroundSends(
      ground,
      participant.email,
      `${initiator?.firstName ?? 'A founder'}`,
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
    if (!ground) throw new ForbiddenException('Only the person who runs this check-in can do that, so ask them to.');

    const participant = await this.prisma.groundParticipant.findFirst({
      where: { id: participantId, groundId },
      select: { inviteToken: true, userId: true, nameGiven: true, user: { select: { firstName: true } } },
    });
    if (!participant) throw new NotFoundException('That person is not in this check-in, so check the name and try again.');
    if (participant.userId) throw new BadRequestException(`${participant.user?.firstName?.trim() || participant.nameGiven?.trim() || 'This person'} has already joined this check-in, so there is no invitation link to share.`);
    if (!participant.inviteToken) throw new BadRequestException('That invitation is no longer open, so ask whoever runs the check-in to send a new one.');

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
    if (!ground) throw new ForbiddenException('Only the person who runs this check-in can do that, so ask them to.');

    const participant = await this.prisma.groundParticipant.findFirst({
      where: { id: participantId, groundId },
      select: { id: true, userId: true },
    });
    if (!participant) throw new NotFoundException('That person is not in this check-in, so check the name and try again.');
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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== userId) throw new ForbiddenException('Only the person who runs this check-in can begin the last check-in, so ask them to.');
    if (hasEnded(ground.status)) throw new BadRequestException('This check-in has already ended, so there is nothing more to change.');

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
            data: { groundId, participantId: p.id, sessionNumber: (last?.sessionNumber ?? 0) + 1, status: CheckInStatus.NOT_STARTED, isFinal: true, ...(p.partyType === PartyType.INITIATOR ? { optional: true } : {}) },
          });
        }
        flagged += 1;
      }
    });
    return { groundId, closingSession: true, participantsFlagged: flagged };
  }

  async activate(groundId: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, include: { report: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Activating is not resuming, and it is not reopening. An ended ground stays ended; a held one is lifted by resumeGround, which knows what to go back to. */
    if (!mayChangeOnItsOwn(ground.status)) {
      throw new BadRequestException(
        hasEnded(ground.status) ? 'This check-in has ended and cannot be activated.'
          : hasStalled(ground.status) ? IT_RAN_OUT_OF_TIME
          : WHILE_IT_IS_HELD,
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
      include: { report: { select: { centralQuestion: true, releasedAt: true } } },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const requesterLink = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    const isInitiator = ground.initiatorId === requestingUserId;
    if (!isInitiator && !requesterLink) {
      throw new ForbiddenException('Only the person who runs this check-in, or somebody in it, can ask for this, so ask one of them.');
    }
    /* Nobody held for a seat or waiting for the organisation reads anything of the check-in (privacy row 5). */
    if (!isInitiator) {
      await refuseSomeoneHeldForASeat(this.prisma as any, groundId, requestingUserId);
      await refuseSomeoneAwaitingTheOrganisation(this.prisma as any, requestingUserId, CANNOT_CHECK_IN_YET);
    }

    const daysOpen = Math.floor((Date.now() - ground.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const endStateOptions = endStatesFor(ground.scenario).map((s) => s.label);
    /*
     * THE REPORT'S QUESTION IS THE TEAM'S PICTURE, AND IT WAITS FOR THE RELEASE (decision 76, item 4). The report withholds its central
     * question from everybody but the lead until the lead releases it; this brief served it to every participant the moment the report was
     * written. Only the lead reads it before then.
     */
    const released = !!ground.report?.releasedAt;
    const gapSummary = ground.report?.centralQuestion && (isInitiator || released)
      ? ground.report.centralQuestion
      : 'The team\u2019s picture is not shared yet.';

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
  /**
   * WHO THIS READER IS, FOR A PATTERN. Their own row when they take part, and whether they run the
   * check-in for a pattern's purposes (decision 58): its lead, or the admin who set it up for them -
   * never every admin of the organisation. See `runsItForAPattern`, the one rule this calls. A lead
   * of a department who may open the check-in does not run it, and reads no pattern about anybody.
   */
  private patternReaderOf(
    ground: { initiatorId: string | null; createdByUserId?: string | null; participants?: { id: string; userId: string | null }[] },
    userId: string | undefined,
  ): APatternReader {
    const mine = (ground.participants ?? []).find((p) => p.userId === userId) ?? null;
    return { participantId: mine?.id ?? null, runsIt: runsItForAPattern(ground, userId) };
  }

  private async assertMaySeeGround(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { organizationId: true, initiatorId: true, scenario: true, createdByUserId: true, status: true, approvedById: true, participants: { select: { userId: true, email: true } } },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { role: true, organizationId: true, email: true },
    });
    const viewer = { ...user, department: user?.role === 'LEAD' ? await this.departmentOf(userId, ground.organizationId) : null };
    const leadDepartment = user?.role === 'LEAD' && ground.initiatorId ? await this.departmentOf(ground.initiatorId, ground.organizationId) : null;
    if (!maySee(userId, { ...viewer, userId }, { ...ground, leadDepartment })) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    return { ...ground, viewerRole: user?.role ?? null };
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
      /* Not into a check-in that is over, stopped or paused, nor one still waiting for an admin to accept it, nor one an admin declined (that is closed):
         the seat is not the only reason nobody has been written to (known issue B5). */
      where: { awaitingSeat: true, ground: { organizationId, status: { notIn: [...A_GROUND_THE_JOBS_LEAVE_ALONE, ...A_GROUND_IS_HELD, GroundStatus.AWAITING_APPROVAL] } } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, email: true, inviteToken: true, groundId: true,
        ground: { select: { label: true, scenario: true, brief: true, initiator: { select: { firstName: true } } } },
      },
    });
    if (!waiting.length) return { sent: 0, stillWaiting: 0 };

    const room = await this.billing.seatsLeft(organizationId);
    /* Null is uncapped: everybody goes. */
    const canSend = room === null ? waiting.length : Math.max(0, room);
    let sent = 0;

    for (const w of waiting.slice(0, canSend)) {
      try {
        await this.email.sendTheInviteThisGroundSends(
          { scenario: w.ground?.scenario ?? '', brief: w.ground?.brief ?? null, label: w.ground?.label ?? 'a check-in' },
          w.email,
          w.ground?.initiator?.firstName ?? 'A founder',
          w.inviteToken ?? '',
          undefined,
          /* So the "you can ignore this" line resolves to this person, as it does on a first send. */
          { kind: 'PARTICIPANT_INVITE', participantId: w.id, groundId: w.groundId },
        );
        await this.prisma.groundParticipant.update({
          where: { id: w.id },
          data: { awaitingSeat: false, invitedAt: new Date() },
        });
        /* A guest held for a seat takes it now (U.4 re-review). */
        await this.prisma.organizationMembership.updateMany({
          where: { organizationId, heldForASeat: true, user: { email: w.email.toLowerCase() } },
          data: { heldForASeat: false },
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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) {
      const mine = ground.participants.some((p) => p.userId === requestingUserId);
      if (!mine) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
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
          /* Never an address as a name (Hafsah, 28 Sep 2026; screens requests 56, 58, 65). */
          return named || (p as any)?.nameGiven?.trim() || 'a colleague';
        });
      throw new BadRequestException(
        `${who.join(' and ')} ${who.length === 1 ? 'has' : 'have'} already answered here, so this is not a test any more, and deleting it would destroy what they wrote with no way to get it back. Close the check-in instead, and everybody keeps their record.`,
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
    dto: { label?: string; timelineDays?: number; timelineWeeks?: number; runsUntilEnded?: boolean; cadence?: string; contextNote?: string; startsAt?: string; brief?: string; workingDays?: number[]; cadenceAnchorDay?: number | null; endsOn?: string },
  ) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

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
    const isOrgAdmin = adminsThisOrg({ ...viewer, userId: requestingUserId }, { ...ground, participants: link ? [{ userId: requestingUserId }] : [] });
    if (!link && ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
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
    /* "Until I end it" (request 37) is stored as no planned length: zero days and the flag. A finite
       length sent later turns the flag off again. */
    const goesOnUntilEnded = dto.runsUntilEnded === true;
    /*
     * "GIVE IT MORE TIME" TO A CHOSEN END (journey test, 12 October 2026). The page turned the date into calendar days, and the count
     * was those days over the rhythm's gap, so a weekly check-in moved to an end could say a different number of sessions from the one
     * setup lists for the same end, and the stored end never moved. The end now sets the length the same way setup's does: the
     * schedule's own rounds from the real start (or the day it was made, with the "Now" rule) up to it, and the end is stored.
     */
    const theEndChosen = !goesOnUntilEnded && dto.endsOn && !Number.isNaN(new Date(dto.endsOn).getTime()) ? new Date(dto.endsOn) : null;
    const cadenceNow = (dto.cadence as Cadence | undefined) ?? ground.cadence;
    const requestedDays = goesOnUntilEnded ? 0 : theEndChosen
      ? timelineDaysForAChosenEnd({
        startsAt: dto.startsAt ? new Date(dto.startsAt) : ground.startsAt,
        endsAt: theEndChosen,
        cadence: cadenceNow,
        workingDays: dto.workingDays ?? (ground as any).workingDays ?? null,
        anchorDay: dto.cadenceAnchorDay !== undefined ? dto.cadenceAnchorDay : (ground as any).cadenceAnchorDay ?? null,
        now: ground.createdAt,
      })
      : dto.timelineDays ?? (dto.timelineWeeks !== undefined ? dto.timelineWeeks * 7 : undefined);
    /*
     * AND WHICH DAYS THE TEAM WORKS, WHICH COULD ONLY EVER BE SAID AT CREATION.
     *
     * "He cannot choose to set check-ins to happen outside of weekends." It was already built - the
     * days are stored, every cadence honours them, and the entry flow offers them under the rhythm
     * with a "weekdays only" shortcut. But a lead who set the check-in up in the app, or who
     * realised afterwards that it was landing on Sundays, had nowhere to say so: this is the only
     * place the rhythm can be changed after the fact and it did not carry the days.
     *
     * It changes the schedule, so it is the lead's call like the rhythm itself.
     */
    const changesTheSchedule = requestedDays !== undefined || dto.cadence !== undefined || dto.workingDays !== undefined || dto.cadenceAnchorDay !== undefined;
    if (changesTheSchedule && ground.initiatorId !== requestingUserId) {
      /* Decision 119, H10: an admin only once the lead has left. */
      await this.mayConfirmSetupOn(ground, requestingUserId);
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
      if (ground.initiatorId !== requestingUserId) await this.mayConfirmSetupOn(ground, requestingUserId);
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
     * THE BRIEF. It is the words everybody reads before they answer. Hafsah, 1 October (decision 72):
     * rewriting it follows the same rule as every other setup change (decision 63). Only the lead
     * can, unless the lead has left the organisation; then an admin of it can, and the people on
     * the check-in are told who did it. It used to carry renaming's permission, so any admin could
     * rewrite a present lead's words. Blank clears it, deliberately: a lead who wants the wrong
     * brief GONE should not have to replace it with something they do not mean.
     */
    let briefDecision: Awaited<ReturnType<GroundsService['mayConfirmSetupOn']>> | null = null;
    if (dto.brief !== undefined) {
      briefDecision = await this.mayConfirmSetupOn(ground, requestingUserId);
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
      if (ground.initiatorId !== requestingUserId) await this.mayConfirmSetupOn(ground, requestingUserId);
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
        throw new BadRequestException(`That is not a rhythm Groundwork offers, so choose one of ${Object.values(Cadence).map((c) => c.toLowerCase().replace('_', ' ')).join(', ')}.`);
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

    /*
     * THE DAY IT LANDS ON (request 194): a weekday (0 to 6) for weekly and fortnightly, a day of the month (1 to 31) for monthly, or null to clear it.
     * Refused with a sentence where the number means nothing for the rhythm, rather than stored and ignored: a control that agrees with you and changes nothing.
     */
    const theRhythm = (dto.cadence as Cadence | undefined) ?? ground.cadence;
    if (dto.cadenceAnchorDay !== undefined && dto.cadenceAnchorDay !== null) {
      const day = dto.cadenceAnchorDay;
      if (theRhythm === Cadence.WEEKLY || theRhythm === Cadence.FORTNIGHTLY) {
        if (!Number.isInteger(day) || day < 0 || day > 6) throw new BadRequestException('Choose a day of the week for the check-ins to land on, from Sunday to Saturday.');
      } else if (theRhythm === Cadence.MONTHLY) {
        if (!Number.isInteger(day) || day < 1 || day > 31) throw new BadRequestException('Choose a day of the month for the check-ins to land on, from the 1st to the 31st.');
      } else {
        throw new BadRequestException('A check-in that happens every day, once, or when you decide has no day to land on, so choose a weekly, fortnightly or monthly rhythm first.');
      }
    }

    // Parse existing audit log - migrate legacy array format to structured object.
    const rawLog = ground.groundAuditLog;
    const auditData: { timeline: object[]; contextNotes: string[]; briefChangedBy?: { userId: string; at: string; byAnAdminSentence?: string } } =
      rawLog && !Array.isArray(rawLog) && typeof rawLog === 'object'
        ? {
            timeline: (rawLog as any).timeline ?? [], contextNotes: (rawLog as any).contextNotes ?? [],
            ...((rawLog as any).briefChangedBy ? { briefChangedBy: (rawLog as any).briefChangedBy } : {}),
          }
        : { timeline: Array.isArray(rawLog) ? (rawLog as object[]) : [], contextNotes: [] };

    /*
     * WHO LAST CHANGED WHAT THIS CHECK-IN IS FOR (U.7 review). The comment on the brief's permission
     * above has always promised "the same audit entry" as renaming, and nothing was written. The
     * Context page now says "Otieno changed this." when an admin rewrote the lead's words, and says
     * "Your words" only while they are. Kept apart from `timeline`, which the setup page reads as
     * changes to the length and the cadence.
     */
    if (dto.brief !== undefined && (dto.brief.trim() || null) !== ((ground as any).brief ?? null)) {
      auditData.briefChangedBy = {
        userId: requestingUserId,
        at: new Date().toISOString(),
        /* Decision 72: an admin who rewrote it because the lead has left is named to everybody on
           the check-in, in the same sentence shape as decision 63's. */
        ...(briefDecision?.as === 'admin'
          ? { byAnAdminSentence: briefChangedByAnAdminSentence(briefDecision.confirmedByName, briefDecision.leadName) }
          : {}),
      };
    }

    if (requestedDays !== undefined || dto.cadence !== undefined || dto.workingDays !== undefined || dto.cadenceAnchorDay !== undefined) {
      const changes: Record<string, { from: unknown; to: unknown }> = {
        ...(requestedDays !== undefined && { timelineDays: { from: (ground as any).runsUntilEnded ? null : ground.timelineDays, to: goesOnUntilEnded ? null : requestedDays } }),
        ...(requestedDays !== undefined && ((ground as any).runsUntilEnded === true) !== goesOnUntilEnded && { runsUntilEnded: { from: !!(ground as any).runsUntilEnded, to: goesOnUntilEnded } }),
        ...(dto.cadence !== undefined && { cadence: { from: ground.cadence, to: dto.cadence } }),
        ...(dto.workingDays !== undefined && {
          workingDays: { from: (ground as any).workingDays ?? [], to: workingDaysOf(dto.workingDays) },
        }),
        ...(dto.cadenceAnchorDay !== undefined && { cadenceAnchorDay: { from: (ground as any).cadenceAnchorDay ?? null, to: dto.cadenceAnchorDay } }),
      };
      /* B-085: only what actually changed is written to the history. "From FORTNIGHTLY to FORTNIGHTLY" is not a change, and a line saying so is not kept. */
      for (const k of Object.keys(changes)) {
        if (JSON.stringify(changes[k].from) === JSON.stringify(changes[k].to)) delete changes[k];
      }
      if (Object.keys(changes).length) {
        auditData.timeline.push({ changedAt: new Date().toISOString(), changedBy: requestingUserId, changes });
      }
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
        data: { availableFrom: this.theFirstDayTheyWork(dto.startsAt ? new Date(dto.startsAt) : null, dto.workingDays ?? (ground as any)?.workingDays) },
      });
    }

    /*
     * AND A GATE ALREADY ON A SUNDAY MOVES OFF IT.
     *
     * Saying "weekdays only" has to do something to the check-in in front of them, or it is a
     * setting that agrees with you and changes nothing - which is the whole family of bugs this
     * week. The first session's gate is the one thing already on a date, so it moves forward to the
     * next day they work. Forward only, and only where nobody has started: later is a delay,
     * earlier is a different promise.
     */
    if (dto.workingDays !== undefined && dto.startsAt === undefined) {
      const open = await this.prisma.checkIn.findMany({
        where: { groundId, sessionNumber: 1, status: CheckInStatus.NOT_STARTED, availableFrom: { not: null } },
        select: { id: true, availableFrom: true },
      });
      for (const row of open) {
        const moved = theNextDayTheyWork(new Date(row.availableFrom as Date), dto.workingDays);
        if (moved.getTime() !== new Date(row.availableFrom as Date).getTime()) {
          await this.prisma.checkIn.update({ where: { id: row.id }, data: { availableFrom: moved } });
        }
      }
      if (open.length) {
        this.logger.log(`Ground ${groundId}: working days changed, ${open.length} first-session gate(s) checked against them.`);
      }
    }

    /*
     * AND GIVING IT MORE TIME OPENS IT AGAIN, WHICH IS WHAT THEY WERE REACHING FOR.
     *
     * Nate Peterson, 23 September 2026: "i let a few check-ins wait and they are now stalled, with
     * no clear way to open them back up. i can't easily see where to reopen them or to extend the
     * timeline." There was no reopen anywhere, and extending the time was worse than missing: it
     * wrote, the dates moved, the status stayed STALLED, and the check-in was still dead. A control
     * that agrees with you and changes nothing.
     *
     * So the extension IS the reopen - one act, because they are one intention. Back to what it was
     * before the time ran out, which the sweep now records rather than this having to guess.
     *
     * ONLY WHERE THE NEW DEADLINE IS ACTUALLY IN THE FUTURE. Reopening a check-in to a date that
     * has already passed would hand it straight back to tonight's sweep, and the person would watch
     * it stall again by morning having done exactly what the product told them to.
     */
    const reopening = hasStalled(ground.status) && requestedDays !== undefined
      ? goesOnUntilEnded
        /* No end to be past: it opens again, and only the lead ending it closes it. */
        ? new Date(Date.now() + 86_400_000)
        : deadlineOf({ createdAt: ground.createdAt, startsAt: dto.startsAt ? new Date(dto.startsAt) : ground.startsAt, timelineDays: requestedDays, ...(theEndChosen ? { endsAt: theEndChosen } : {}) })
      : null;
    const opensAgain = !!reopening && reopening.getTime() > Date.now();
    if (hasStalled(ground.status) && requestedDays !== undefined && !opensAgain) {
      throw new BadRequestException(
        'That is not enough time to reopen this check-in, because the new end date has already passed. Give it a date in the future and it opens again.',
      );
    }

    const updated = await this.prisma.ground.update({
      where: { id: groundId },
      data: {
        /*
         * Back to what it was, or ACTIVE where the sweep that stalled it predates this column and
         * recorded nothing. ACTIVE rather than OPEN on that fallback: a check-in that ran long
         * enough to stall has been under way, and telling everybody it is newly open would be the
         * product forgetting what happened in it.
         */
        ...(opensAgain && {
          status: ground.stalledFromStatus ?? GroundStatus.ACTIVE,
          stalledFromStatus: null,
          stalledAt: null,
          stallWarningSentAt: null,
        }),
        /**
         * Both columns, so nothing reading the legacy one goes stale - but DAYS is the value that
         * counts, and weeks is derived from it rather than the other way round.
         */
        ...(requestedDays !== undefined && {
          timelineDays: requestedDays,
          timelineWeeks: goesOnUntilEnded ? null : Math.max(1, Math.round(requestedDays / 7)),
          runsUntilEnded: goesOnUntilEnded,
          timelineStated: true,
          ...(goesOnUntilEnded && { endsAt: null }),
          ...(theEndChosen && { endsAt: theEndChosen }),
        }),
        ...(dto.cadence !== undefined && { cadence: dto.cadence as Cadence, cadenceStated: true }),
        /* Normalised on the way in: seven days listed is the same instruction as saying nothing,
           and junk from an old client must not make a check-in unschedulable. */
        ...(dto.workingDays !== undefined && { workingDays: workingDaysOf(dto.workingDays) }),
        ...(dto.cadenceAnchorDay !== undefined && { cadenceAnchorDay: dto.cadenceAnchorDay }),
        /* Moving between a weekly kind of rhythm and a monthly one with no new day said would leave a Monday (1) to be read as the 1st of the month. It is cleared. */
        ...(dto.cadence !== undefined && dto.cadenceAnchorDay === undefined && (ground as any).cadenceAnchorDay != null && theKindOfDayItLandsOn(dto.cadence as Cadence) !== theKindOfDayItLandsOn(ground.cadence) && { cadenceAnchorDay: null }),
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
          endsAt: theEndChosen ?? (dto.startsAt && !(goesOnUntilEnded || (requestedDays === undefined && (ground as any).runsUntilEnded))
            ? new Date(new Date(dto.startsAt).getTime() + (requestedDays ?? ground.timelineDays ?? 90) * 24 * 60 * 60 * 1000)
            : null),
        }),
        groundAuditLog: auditData,
      },
    });
    if (dto.brief !== undefined) await this.tellParticipantsAboutThis(groundId, dto.brief);
    /* A changed brief can change the kind of work (request 76); a lead's own choice is kept. */
    if (dto.brief !== undefined) void this.readTheKindOfWork(groundId);
    if (opensAgain) {
      auditData.timeline.push({
        changedAt: new Date().toISOString(),
        changedBy: requestingUserId,
        changes: { reopened: { from: GroundStatus.STALLED, to: ground.stalledFromStatus ?? GroundStatus.ACTIVE } },
      });
      await this.prisma.ground.update({ where: { id: groundId }, data: { groundAuditLog: auditData } }).catch(() => undefined);
      this.logger.log(`Ground ${groundId} reopened after stalling: now ${ground.stalledFromStatus ?? GroundStatus.ACTIVE}, ${requestedDays} days.`);
      /*
       * AND THE PEOPLE WHO WERE TOLD IT STALLED ARE TOLD IT IS BACK.
       *
       * They each got an email saying this check-in had stalled. Leaving them with that as the last
       * word, while the lead sees a live check-in, is how somebody decides it is not worth
       * answering - which is the outcome he was actually worried about.
       */
      this.tellThemItIsOpenAgain(groundId).catch((err: any) =>
        this.logger.warn(`Could not tell everybody ${groundId} is open again: ${err?.message}`));
    }
    return updated;
  }

  /** One email each to everybody on a check-in that has just been given more time. */
  private async tellThemItIsOpenAgain(groundId: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { label: true, endsAt: true, participants: { select: { email: true } } },
    });
    if (!ground) return;
    const where = `${this.config.get<string>('resend.frontendUrl') || ''}/grounds/${groundId}`;
    for (const p of ground.participants) {
      await this.email
        .sendReopenedNotification(p.email, ground.label, where, ground.endsAt ?? null)
        .catch((err: any) => this.logger.warn(`Reopened notice failed for ${groundId}: ${err?.message}`));
    }
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
    await this.refuseAnEvaluationTheAdminWasNotGivenAccessTo(groundId, organizationId, adminUserId);
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true, status: true, label: true, initiatorId: true },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.status !== GroundStatus.AWAITING_APPROVAL) {
      // Already accepted, or never needed accepting. Either way there is nothing to do.
      return { id: ground.id, status: ground.status, alreadyDecided: true };
    }

    const updated = await this.prisma.ground.update({
      where: { id: groundId },
      data: { status: GroundStatus.OPEN, approvedById: adminUserId, approvedAt: new Date() },
      select: { id: true, status: true },
    });
    /* The people the lead named while it waited are invited now, once each (known issue B5). */
    const invitedNow = await this.sendTheInvitationsHeldForApproval(groundId, organizationId).catch((err: any) => { this.logger.error(`Held invitations for ground ${groundId} failed: ${err?.message}`); return 0; });

    // The person who set it up is waiting on this, and nothing else would tell them.
    const creator = await this.prisma.user.findUnique({
      where: { id: ground.initiatorId },
      select: { email: true, firstName: true },
    });
    const url = `${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${ground.id}`;
    if (creator?.email) {
      await this.email
        .sendGroundApproved(creator.email, creator.firstName ?? 'there', ground.label, url, invitedNow)
        .catch((err: any) => this.logger.error(`Approval email failed for ground ${ground.id}: ${err.message}`));
    }
    return { ...updated, alreadyDecided: false };
  }

  /**
   * THE INVITATIONS THAT WAITED FOR THE APPROVAL, SENT ONCE (known issue B5).
   *
   * Everybody the lead named while the check-in waited is on it with `invitedAt` and `notifiedAt` empty. Those two empty fields are the
   * whole of "held", and writing them is what makes this send each invitation once: a second run, or a second admin's click, finds
   * nothing to send. Left alone: anybody waiting for a seat (they have none to be invited into), anybody whose start date is ahead
   * (the cron sends on the day), and anybody who has left. When at least one went, the check-in moves on to waiting for its parties,
   * as it would have the moment they were added.
   */
  private async sendTheInvitationsHeldForApproval(groundId: string, organizationId: string): Promise<number> {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) return 0;
    const held = await this.prisma.groundParticipant.findMany({
      /* Not filtered on `userId`: a colleague who already has an account is a person who has opened Groundwork, not one already invited, and is invited like anybody else. */
      where: { groundId, partyType: PartyType.PARTICIPANT, invitedAt: null, notifiedAt: null, awaitingSeat: false, leftAt: null },
      select: { id: true, email: true, inviteToken: true, remitAsGiven: true, startsAt: true },
    });
    const due = held.filter((p) => !p.startsAt || p.startsAt.getTime() <= Date.now());
    if (!due.length) return 0;
    const initiator = await this.prisma.user.findUnique({ where: { id: ground.initiatorId }, select: { firstName: true } });
    let sent = 0;
    for (const p of due) {
      /* Claimed first, so two approvals at once send once. */
      const claimed = await this.prisma.groundParticipant.updateMany({ where: { id: p.id, invitedAt: null, notifiedAt: null }, data: { invitedAt: new Date(), notifiedAt: new Date() } });
      if (!claimed?.count) continue;
      try {
        await this.email.sendTheInviteThisGroundSends(ground as any, p.email, `${initiator?.firstName ?? 'A founder'}`, p.inviteToken ?? '', p.remitAsGiven ?? undefined, { kind: 'PARTICIPANT_INVITE', participantId: p.id, groundId });
        sent += 1;
      } catch (err: any) {
        /* The row says nothing went, so the lead can resend it from the check-in. */
        await this.prisma.groundParticipant.update({ where: { id: p.id }, data: { invitedAt: null, notifiedAt: null } }).catch(() => undefined);
        this.logger.error(`The held invitation to ${p.email} on ground ${groundId} did not send: ${err?.message}`);
      }
    }
    if (sent > 0 && ground.status !== GroundStatus.AWAITING_LEAD) {
      await this.prisma.ground.update({ where: { id: groundId }, data: { status: GroundStatus.AWAITING_PARTIES } }).catch(() => undefined);
    }
    return sent;
  }

  /**
   * Declined. The ground is CLOSED rather than deleted: somebody wrote it, and a row
   * that vanishes is indistinguishable from a bug to the person who created it.
   */
  async declineGround(groundId: string, organizationId: string, adminUserId: string, reason?: string) {
    await this.refuseAnEvaluationTheAdminWasNotGivenAccessTo(groundId, organizationId, adminUserId);
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      select: { id: true, status: true, label: true, initiatorId: true },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
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

  /**
   * THE CHECK-INS AN ADMIN MAY LIST, as a query: the organisation's, except the performance plans,
   * promotions and renewals they were not given access to. Without who is asking, none of those three.
   */
  private whatAnAdminMayList(organizationId: string, adminUserId: string | undefined): Record<string, unknown> {
    return adminUserId
      ? groundsAViewerMayList(adminUserId, { role: 'ADMIN', organizationId }, organizationId)
      : { organizationId, scenario: { notIn: EVALUATION_SCENARIOS } };
  }

  /** The approval asks an admin, so it reads the same as any other admin read: no evaluation they were not given access to. */
  private async refuseAnEvaluationTheAdminWasNotGivenAccessTo(groundId: string, organizationId: string, adminUserId: string): Promise<void> {
    const found = await this.prisma.ground.findFirst({
      where: { id: groundId, ...(this.whatAnAdminMayList(organizationId, adminUserId) as any) },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  }

  /** What is waiting on an admin. Oldest first: the longest wait is the worst one. */
  async listAwaitingApproval(organizationId: string, adminUserId?: string) {
    const rows = await this.prisma.ground.findMany({
      where: { ...(this.whatAnAdminMayList(organizationId, adminUserId) as any), status: GroundStatus.AWAITING_APPROVAL },
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
      createdBy: fullNameToCall({ user: g.initiator }),
    }));
  }

  async addMyNote(groundId: string, userId: string, text: string) {
    text = withoutBankDetails(text) as string;
    const trimmed = (text ?? '').trim();
    if (!trimmed) throw new BadRequestException('A note needs some words in it.');
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
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
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
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
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
    // Scoped by participantId as well as id, so one person cannot delete another's
    // by guessing an id.
    const { count } = await this.prisma.participantNote.deleteMany({
      where: { id: noteId, participantId: participant.id },
    });
    if (count === 0) throw new NotFoundException('That note could not be found, so refresh the page.');
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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const me = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
      select: { id: true },
    });
    if (!me && ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
    }

    const { count } = await this.prisma.personObjective.updateMany({
      where: { id: objectiveId, groundId },
      data: { lastSeenState: state, lastSeenAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('That expectation could not be found, so refresh the page.');
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
    dto = { ...dto, text: withoutBankDetails(dto?.text) as string, evidence: withoutBankDetails(dto?.evidence) ?? null };
    const text = (dto.text ?? '').trim();
    if (!text) throw new BadRequestException('Say what you did.');
    const me = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: { id: true },
    });
    if (!me) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');

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
    if (!me) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
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
    if (!me) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
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
      select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    /* Reading only, so the admin asked to approve it reads it too (decision 75, item 2). */
    const isOrgAdmin = readsAsAnAdmin({ ...asker, userId: requestingUserId }, ground);
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
      select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    const isOrgAdmin = adminsThisOrg({ ...asker, userId: requestingUserId }, ground);
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
      select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    /* Reading only, so the admin asked to approve it reads it too (decision 75, item 2). */
    const isOrgAdmin = readsAsAnAdmin({ ...asker, userId: requestingUserId }, ground);
    if (!link && ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
    }
    /* Nobody held for a seat or waiting for the organisation reads the check-in's starting point (privacy row 5). */
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      await refuseSomeoneHeldForASeat(this.prisma as any, groundId, requestingUserId);
      await refuseSomeoneAwaitingTheOrganisation(this.prisma as any, requestingUserId, CANNOT_CHECK_IN_YET);
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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /**
     * DECISION 63: the lead's, or - only once the lead has left the organisation - an admin of the
     * same organisation, standing in for them. What doing well looks like is the lead's to state - a
     * party stating it would be the person being read setting their own yardstick, which is the one
     * thing the report exists to compare against something else. Was any admin of the organisation,
     * at any time; narrowed here to match every other setup writer.
     */
    const confirm = await this.mayConfirmSetupOn(ground, requestingUserId);
    const confirmedByAdminNote = confirm.as === 'admin' ? confirmedByAnAdminSentence(confirm.confirmedByName, confirm.leadName) : null;

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
        confirmedByAdminNote,
      },
      select: { id: true, version: true, successLooksLike: true, conditions: true, changeReason: true, effectiveFrom: true, confirmedByAdminNote: true },
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
      select: { initiatorId: true, organizationId: true, ...WHAT_AN_ADMIN_NEEDS_TO_BE_GIVEN_ACCESS },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const asker = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true, organizationId: true },
    });
    /* Reading only, so the admin asked to approve it reads it too (decision 75, item 2). */
    const isOrgAdmin = readsAsAnAdmin({ ...asker, userId: requestingUserId }, ground);
    if (!link && ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
    }
    /* Nobody held for a seat or waiting for the organisation reads the check-in's starting point (privacy row 5). */
    if (ground.initiatorId !== requestingUserId && !isOrgAdmin) {
      await refuseSomeoneHeldForASeat(this.prisma as any, groundId, requestingUserId);
      await refuseSomeoneAwaitingTheOrganisation(this.prisma as any, requestingUserId, CANNOT_CHECK_IN_YET);
    }
    const rows = await this.prisma.groundBaseline.findMany({
      where: { groundId },
      orderBy: { version: 'asc' },
      select: { version: true, successLooksLike: true, conditions: true, changeReason: true, effectiveFrom: true, confirmedByAdminNote: true },
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
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
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
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');

    const checkIns = await this.prisma.checkIn.findMany({
      where: { participantId: participant.id },
      orderBy: { sessionNumber: 'asc' },
      /* availableFrom: the day the next one opens, which the finished screen tells the person. */
      /* closedReason and the first word the person said: a session the clock closed with nothing said is not one they finished (wasAQuietClose). */
      select: { id: true, sessionNumber: true, status: true, completedAt: true, availableFrom: true, closedReason: true, turns: { where: { role: 'PERSON' as any }, select: { id: true }, take: 1 } },
    }).then((rows: any[]) => (rows ?? []).map(({ turns, ...c }) => ({ ...c, personTurns: Array.isArray(turns) ? turns.length : undefined })));

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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const PAUSABLE_STATUSES: GroundStatus[] = [
      GroundStatus.OPEN,
      GroundStatus.AWAITING_PARTIES,
      GroundStatus.REPORT_READY,
      GroundStatus.ACTIVE,
    ];
    if (!PAUSABLE_STATUSES.includes(ground.status)) {
      throw new BadRequestException('This check-in cannot be paused in the state it is in now, so there is nothing to do.');
    }

    // Verify the requesting user belongs to this ground's org or is the initiator.
    const initiatorOrAdmin = await this.prisma.user.findFirst({
      where: { id: adminUserId, organizationId: ground.organizationId },
    });
    if (!initiatorOrAdmin) throw new ForbiddenException('Only a member of the organisation can pause a check-in, so ask one to do it.');

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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (!isHeld(ground.status)) {
      throw new BadRequestException('This check-in is not on hold, so there is nothing to resume.');
    }

    const member = await this.prisma.user.findFirst({
      where: { id: adminUserId, organizationId: ground.organizationId },
    });
    if (!member) throw new ForbiddenException('Only a member of the organisation can resume a check-in, so ask one to do it.');

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
  /** Decision 133: "Check in yourself" - see check-in-yourself.ts. */
  async openTheLeadsCheckIn(groundId: string, organizationId: string, userId: string) {
    return openTheLeadsCheckIn(this.prisma, groundId, organizationId, userId);
  }

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
    /* And in a situation where the lead only asks, they are not a party to any round of it. */
    /* Decision 133: the lead checks in when they choose, so a round never waits on them and counts
       them only when they answered it (the-lead-checks-in-when-they-choose.ts). */
    const active = await this.prisma.groundParticipant.findMany({
      where: {
        groundId,
        AND: [whoASessionCounts(sessionNumber, AN_ANSWER)],
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
      select: { id: true, userId: true },
    }).then(async (rows: any[]) => {
      /* Nobody an admin has not let in yet, unless they answered anyway (decision 77): the session
         closes once everybody let in has answered. Same rule as recordRoundCompletion. */
      const notLetIn = await whoIsNotLetInYet(this.prisma, rows ?? []);
      if (!notLetIn.size) return rows;
      const spoke = new Set(((await this.prisma.checkIn.findMany({
        where: { sessionNumber, status: { in: AN_ANSWER }, participantId: { in: [...notLetIn.keys()] } },
        select: { participantId: true },
      }).catch(() => [])) ?? []).map((c: any) => c.participantId));
      return rows.filter((p) => !notLetIn.has(p.id) || spoke.has(p.id));
    });
    /* The lead is still one of the people in it, for the rule that a shared report needs two, even in
       a round they chose not to check in (decision 133): a lead and one colleague still get a report. */
    const theLeadSatThisOneOut = await (this.prisma.groundParticipant.count?.({
      where: { groundId, partyType: PartyType.INITIATOR, NOT: { checkIns: { some: { sessionNumber, status: { in: AN_ANSWER } } } } },
    }) ?? Promise.resolve(0)).catch(() => 0);
    if (active.length + (theLeadSatThisOneOut > 0 ? 1 : 0) < 2) return false;

    /*
     * A GROUND ANSWERED ON A LINK IS READY ON ANSWERS, NOT ON ATTENDANCE.
     *
     * The loop below waits for EVERY active party, which cannot be satisfied where parties keep
     * arriving and the lead never answers: ten agribusinesses answered one link and `releasedAt`
     * stayed null, so nobody who asked for the report was ever told it existed. See
     * an-open-link-has-no-roster.
     */
    const howTheyArrived = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      select: {
        cameThroughTheLink: true, managingOnly: true,
        checkIns: { where: { sessionNumber, status: CheckInStatus.COMPLETED }, select: { id: true } },
      },
    }).then((rows) => rows.map((r) => ({
      cameThroughTheLink: r.cameThroughTheLink, managingOnly: r.managingOnly, finished: r.checkIns.length > 0,
    }))).catch(() => [] as any[]);
    if (answeredOnALink(howTheyArrived)) return aLinkRoundIsReady(howTheyArrived);

    /* Everybody has ANSWERED - and a decline is an answer (an-answer-includes-a-refusal.ts). Counting
       only COMPLETED here froze every round with one refusal in it, for that session and every one after. */
    let completed = 0;
    /* Somebody on approved leave today is not waited on; if they answer anyway, they count (week 23). */
    const away = await whoOnACheckInIsAway(this.prisma as any, groundId);
    for (const p of active) {
      const ci = await this.prisma.checkIn.findFirst({
        where: { participantId: p.id, sessionNumber, status: { in: AN_ANSWER } },
        select: { status: true, closedReason: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } } },
      });
      if (!ci && away.has(p.id)) continue;
      if (!ci) return false;
      /* A session the clock closed with nothing said ends the wait on that person, but is not an account. */
      if (ci.status === CheckInStatus.COMPLETED && !wasAQuietClose(ci as any)) completed += 1;
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
    /** Who is on approved leave today and not waited on, with the last day of it (week 23). Dates only. */
    awayUntil: Record<string, string>;
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

    /*
     * THE SAME PEOPLE THE RELEASE RULE WAITS ON, ASKED OF THE ONE PLACE THAT KNOWS. This carried its
     * own copy of that clause - the third - and a rule with three copies is three answers waiting to
     * happen. See how-many-have-answered.ts, and the note there about the day one session read four
     * different numbers on four screens.
     */
    const counted = await howManyHaveAnswered(this.prisma, groundId, sessionNumber);
    if (counted.expected === 0) return null;
    const declined = new Set(counted.declinedIds);

    return {
      sessionNumber,
      total: counted.expected,
      /** Accounts actually given. A decline is not one, and must never be counted as one. */
      completed: counted.completed,
      /**
       * Nobody is "missing" once they have answered, and saying no IS answering. This is the single
       * line that lets a round with a decline in it ever finish.
       */
      missingParticipantIds: counted.waitingOn,
      declinedParticipantIds: counted.expectedIds.filter((id) => declined.has(id)),
      awayUntil: counted.awayUntil ?? {},
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
    patterns: AServedPattern[] | null;
    insightsLocked: boolean;
  }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId },
      select: {
        id: true,
        specificityHistory: true,
        patternDetections: {
          select: PATTERN_ROW_SELECT,
          orderBy: { lastSeenAt: 'desc' },
        },
        /* For the one sentence that says who else reads it: the lead's first name. */
        ground: { select: { initiatorId: true, cadence: true, participants: { select: { id: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } } } },
        checkIns: {
          select: { sessionNumber: true, completedAt: true, status: true },
          orderBy: { sessionNumber: 'asc' },
        },
      },
    });
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');

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
     * THEIR OWN PATTERNS, AND NOBODY ELSE'S, after three periods and in plain words. See
     * patterns/who-reads-a-pattern. This page wrapped the engine's sentence in "Your record across
     * sessions shows something worth noticing", served every SURFACED row including good news seen
     * once, and gave no way to answer. None at all while patterns are not served.
     */
    const namesForOwnPatterns = whoIsWhoIn((participant as any).ground?.participants, (participant as any).ground?.initiatorId, (participant as any).ground?.cadence);
    const servedOwn = servedPatterns(
      participant.patternDetections as any,
      { participantId: participant.id, runsIt: false },
      namesForOwnPatterns,
    );
    /* Opening a page never asks the model (decision 7): kept wording only. */
    const patterns = await wordPatternEvidence(
      servedOwn,
      namesForOwnPatterns.firstNameOf ?? (() => null),
      rememberedCompose(this.prisma, async () => null, false),
    ).catch(() => servedOwn);
    await markShownToThePerson(this.prisma as any, theOnesTheyAreSeeingFirst(participant.patternDetections as any, patterns));

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
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
    const report = thePrivateSummaryAsRead(participant.soloArtifact);
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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
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
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');
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
 * HOW LONG A NEW CHECK-IN RUNS (U.6 review): what they said, else the end they chose, else the
 * situation's usual length. See timelineDaysForAChosenEnd.
 */
/** Whether a rhythm lands on a weekday, on a day of the month, or on no chosen day at all. */
function theKindOfDayItLandsOn(c: Cadence): 'weekday' | 'month' | 'none' {
  return c === Cadence.MONTHLY ? 'month' : c === Cadence.WEEKLY || c === Cadence.FORTNIGHTLY ? 'weekday' : 'none';
}

function howLongItRuns(dto: { runsUntilEnded?: boolean; timelineDays?: number; endsAt?: string | Date | null; startsAt?: string | Date | null; cadence?: any; scenario: any; workingDays?: number[] | null; cadenceAnchorDay?: number | null }): number {
  /* No planned length. Zero is what every reader of the length already reads as "no end". */
  if (dto.runsUntilEnded === true) return 0;
  if (dto.timelineDays != null) return dto.timelineDays;
  if (dto.endsAt) {
    return timelineDaysForAChosenEnd({
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: new Date(dto.endsAt),
      cadence: dto.cadence ?? RECOMMENDED_CADENCE[dto.scenario as keyof typeof RECOMMENDED_CADENCE],
      workingDays: dto.workingDays ?? null,
      anchorDay: dto.cadenceAnchorDay ?? null,
    });
  }
  return DEFAULT_TIMELINE_DAYS[dto.scenario as keyof typeof DEFAULT_TIMELINE_DAYS];
}

