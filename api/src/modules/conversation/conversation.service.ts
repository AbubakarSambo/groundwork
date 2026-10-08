import { HELD_FOR_A_SEAT } from '../participants/held-for-a-seat';
import { theAimsNameKeepsItsShare, theNameWithItsSum } from './the-aims-name-keeps-its-share';
import { theParticipantAsServed, theFitAsServed, theCheckInRowAsServed, theyAreTheirOwnWords } from './a-transcript-serves-only-what-is-theirs';
import { theNumberInTheNameIsKept } from './an-aim-said-twice-is-one-aim';
import { theDayKeptApart, aNumberPeopleCanRead } from '../board/an-aim-is-a-sentence-about-somebody';
import { suggestAnswers } from './suggested-answers';
import { whatTheYesSays, startsWithAYes } from './yes-but-a-new-number';
import { READS_DIFFERENTLY, alreadyAsked as theLinesInTheStamps, theStampForWhatItRaised } from './a-document-that-disagrees-is-asked-once';
import { aClaimNothingShowsYet, askForProofKindly } from './asking-for-proof-kindly';
import { managementWordsIn, sayItInPlainWords } from './management-words';
import { namesNotEverybodyMayOpen, withoutPrivateFileNames } from '../documents/a-private-file-is-not-named';
import { theLeadByName, mentionsTheLeadByALabel } from './the-lead-has-a-name';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { aSentenceStartsWithACapital } from './a-sentence-starts-with-a-capital';
import { theFirstNameFrom } from '../reports/a-title-is-not-a-first-name';
import { theSpeakerLine } from './the-person-speaking';
import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { whereThisCameFrom, WHAT_TO_DO_WITH_THESE } from './where-this-document-came-from';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { whatAParticipantIsToldAboutThis } from '../grounds/what-a-participant-is-told-about-this';
import { whatToPutToThem, theReplyAlreadyQuotesIt } from './the-line-that-touches-what-they-said';
import { aDirectiveAboutTheBurden, countWhatWasAsked, stampWhatItAskedFor } from './the-same-burden-on-both-sides';
import { whatFitsInTheRoom, tellThemWhatIsMissing } from './a-prompt-that-ran-out-of-room-says-so';
import { isTheirs, ONLY_THEIR_WORDS } from './a-record-is-what-they-said';
import { whatTheySaidAboutWhy } from './they-said-why-themselves';
import { CANNOT_CHECK_IN_YET } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';
import { isThisTheSameAnswerAgain, STILL_ON_YOUR_LAST_ANSWER } from './a-second-press-is-not-a-second-answer';
import { ConfigService } from '@nestjs/config';
import { connectWhatsAppFor, type ConnectWhatsApp } from '../whatsapp/connect-whatsapp';
import { keptOffThePhone } from '../whatsapp/a-check-in-kept-off-the-phone';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { blockerHasSubstance } from '../board/reads';
import { PrismaService } from '../prisma/prisma.service';
import { forHumans, hadCloseMarker as textHadCloseMarker, whatIsNewSince } from '../presentation/outbound';
import { languageBlock } from '../public-api/a-whatsapp-message-is-routed';
import { endStatesFor } from '../resolution/end-states';
import { PromptsService } from '../prompts';
import { AnthropicService, ChatTurn, houseStyle } from './anthropic.service';
import { ConversationContextService } from './context.service';
import { almostNothingHereYet, theFloorFor } from './how-short-a-check-in-may-be';
import { withoutTheLastOne } from './a-first-session-has-no-last-one';
import { theContextWeHave, whoThisNameIs, theNameWeUseFor, WHAT_A_DOCUMENT_HOLDS_PROMPT, WHAT_A_DOCUMENT_HOLDS_SCHEMA, MOST_OF_A_DOCUMENT_WE_READ, type WhatADocumentHolds } from '../documents/what-a-document-holds';
import { isAnApology, NOTHING_TO_APOLOGISE_FOR } from './an-apology-is-not-owed';
import { theOneThingToDoBetter } from './what-this-session-is-missing';
import { theAimsThatAreNew } from './an-aim-said-twice-is-one-aim';
import { askWhoCarriesWhichPart, alreadyAskedWhoCarriesWhat } from './who-carries-which-part';
import { askWhereTheNumberStands, saysWhereItStands } from './a-number-with-no-starting-point';
import { somethingTheyCouldNotHaveSaid } from './something-they-could-not-have-said-themselves';
import { movedTheirTargetToWhereTheyAre, A_STANDING_IS_NOT_A_TARGET } from './where-you-are-is-not-what-you-aim-at';
import { whatToDoAboutTheirDeadline, theDateItHadToSay, didNotSayTheDate, SAY_THE_DATE, theQuestionTheProductAsks, repeatsTheInstruction } from './a-period-is-not-a-day';
import { theNumbersDoNotMeet, askWhichItIs, saidBothNumbers, theQuestionAboutTheNumbers, theNumbersIn } from './the-numbers-do-not-meet';
import { thePeriodTheyNamed } from './when-words-mean-a-date';
import { wordsWeDoNotUse, sayItWithoutThose } from './words-we-do-not-use';
import { asksForAShapeWithoutShowingOne, SHOW_WHAT_ONE_LOOKS_LIKE } from './a-question-that-invents-a-shape-shows-one';
import { theLineWithoutItsDanglingJoin } from './half-a-sentence-is-not-a-line-in-a-report';
import { theCheckInItWaitsOn } from './which-check-in-it-waits-on';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';
import { aWaitOnOneself } from '../board/a-thing-is-not-somebody';
import { BLOCKER_TRACE_PROMPT, BLOCKER_TRACE_PROMPT_KEY, BLOCKER_TRACE_SCHEMA, theChainFrom, theInputKey, theRecordForTheModel, theTraceTheRecordSupports, type TheModelsTrace } from './where-the-blocker-started';
import { buildScenarioPackForParty, VOCABULARY_RULE, A_CORRECTION_IS_NOT_A_SCOLDING, OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE, COACHING_OBSERVATION_PROMPT, COACHING_OBSERVATION_SCHEMA, SESSION_CLOSE_MARKER, stripCloseMarker, buildIntakeBlock, RECORD_EXTRACTION_PROMPT, DEPENDENCY_EXTRACTION_PROMPT, DEPENDENCY_EXTRACTION_SCHEMA, WORK_MENTION_PROMPT, WORK_MENTION_SCHEMA, EXPECTATION_PROMPT, EXPECTATION_SCHEMA, ALIGNMENT_PROMPT, ALIGNMENT_SCHEMA, OBJECTION_PROMPT, OBJECTION_SCHEMA } from './prompt-library';
import { GroundworkEvents, CheckInCompletedEvent, BlockerEvent, CommitmentsSettledEvent } from '../../common';
import { onlyWhatWeCouldRead } from '../documents/a-document-we-could-not-read-is-not-a-source';
import { recordRoundCompletion } from '../grounds/round-completion';
import { Prisma } from '@prisma/client';
import { endingOnTheClose, endsOnTheClose, type Door } from './the-close-says-what-comes-next';
import { theEndCard, theCardStillStanding, type EndCard, type ALineForTheCard } from './the-end-card';
import { aThingToCarry, openingWithASentence, thePrivateSummaryAsRead } from './the-private-summary-opens-with-a-sentence';
import { READ_WHAT_HAPPENED, WHAT_HAPPENED_SCHEMA, theSettlements, thePrompt as theHappenedPrompt, aCommitmentKey, oneOfEach, type AnAnswer } from './what-happened-to-what-they-said';
import { theProofSettlements, thePrompt as theProofPrompt, WHICH_COMMITMENT_A_LINE_KEEPS_PROMPT, WHICH_COMMITMENT_A_LINE_KEEPS_SCHEMA, whatThisLineProves, mayBeSettledByProof } from './settled-by-proof';
import { whoAddedEachBackingDocument } from '../reports/how-a-line-is-known';
import { aWaitThatConfirms, theLineToConfirm, thePrompt as theDeliveredPrompt, WHICH_LINE_WAS_DELIVERED_PROMPT, WHICH_LINE_WAS_DELIVERED_SCHEMA } from './confirmed-by-who-received-it';
import { theInstruction, sourceHashOf, withoutTheirWords, A_READ_IS_DERIVED, WhatItAsks } from './what-an-account-shows';
import type { SpecificityLevel } from './how-checkable-a-session-was';
import { readTheTurns } from './the-specificity-read';

/** `CheckIn.closedReason` when the sweep, not the person, ended the session. It lives in a file with no imports, so nothing that reads it has to import this service. */
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
export { CLOSED_BY_THE_CLOCK };
/** `CheckIn.closedReason` when the person declined to take part. */
export const DECLINED_TO_TAKE_PART = 'declined';
import { mirrorCommitment } from '../assistant/a-commitment-carries-past-the-ground';
import { STARTED_FROM_THE_ANCHOR, aCheckInStartedFromTheAnchor, theAnchorMarkOf, theAnchorParticipantGuidance, whatTheyToldYouBefore, withoutAnAnnouncedAngle } from './the-anchor-weekly-check-in';
import { theAnchorBaselineGuidance } from './the-anchor-baseline';
import { withoutAnExampleAnswer, THE_BASELINE_CLOSING_REMINDER, THE_BASELINE_READ_SYSTEM, THE_BASELINE_READ_TOOL, everythingIsLearned, whatIsLearnedFrom, whatTheBaselineHasLearned, type WhatIsLearned } from './the-baseline-so-far';
import { whatTheAnswerAgreedTo, hasAlreadyOffered, whatHappenedToTheOffer, weSayAboutTheOffer, whatIsStillOwedToThem, withoutTheSecondTellingOfIt, isAnOfferToWriteItDown, whatTheyJustSaidMayBeTheirOwnStep, YOU_HAVE_ALREADY_OFFERED } from './giving-the-person-agency';
import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { DocumentsService } from '../documents/documents.service';
import { BillingService } from '../billing/billing.service';
import { EmailService } from '../email/email.service';
import { UsageService } from '../usage/usage.service';
import { CheckInStatus, TurnRole, RecordEntryType, Cadence, GroundStatus, UsageEventType, PartyType, GroundMode, DependencyStatus, WorkMentionKind , ContextNoteAudience, PatternStatus } from '@prisma/client';
import { runIntake } from './intake';
import { boardRendersFor } from '../board/board-families';
import { buildRoleProbeBlock, roleMapFor, signalRead, MIN_COACHING_CONFIDENCE, UniversalMode } from '../board/role-maps';
import { STARTING_SCENARIOS, WHO_ARE_YOU_IN_THIS } from './prompt-library';
import { PLAIN_WORDS } from './plain-words';
import {
  nextMove, coachingBlockFor, afterOffering, afterOutcome, EMPTY,
  type CoachingStateShape, type StepOutcome,
} from '../coaching/one-step-at-a-time';
import {
  detectFunction, detectUniversalModes, needsRoleConfirmation, roleConfirmationQuestion,
  ROLE_CONFIRM_ASKED, ROLE_CONFIRM_COOLDOWN_PERIODS, ROLE_CONFIRMATION_READ_PROMPT, ROLE_CONFIRMATION_READ_SCHEMA,
  theRoleConfirmationVerdict, LOW_CONFIDENCE_CONFIRM_THRESHOLD,
} from '../board/function-detection';
import { RoleFunction } from '../board/role-maps';
import { whoOpenedThis } from './who-opened-this';
import { documentWhereFor } from '../documents/who-can-see-a-document';
import { displayName, plainWordsByPerson, atTheStart } from '../reports/party-labels';
import { everyQuoteFromTheRecord, theLinesAQuoteMayComeFrom, saidWordForWord } from '../reports/a-quote-is-what-they-said';
import { theirQuotationMarksBack } from './their-quotation-marks-are-theirs';
import { peersAreNamedOn } from '../reports/peers-are-named';
import {
  plainWordsForEveryoneElse,
  whatToCallThem,
  whoIsOnThisGround,
} from './a-colleague-in-an-interview-has-a-name';
import { buildDeliveriesBlock } from './what-they-say-they-delivered';
import { buildNotesBlock } from './between-session-notes';
import { closeReadiness, askedToFinish, isTheWordFinish, tooFewAnswersToFinish, NOT_ENOUGH_YET_TO_FINISH_HERE } from './close-readiness';
import { observeStyle, mergeStyle, styleGuidance, simplerWordsGuidance } from './person-style';
import { readOutcome, isGenericStep } from './coaching-step';
import { theBehavioursAnybodyCanBeRead, universalSignalRead } from '../board/a-role-nobody-mapped-is-still-a-person';
import { WHAT_KIND_OF_WORK_PROMPT, WHAT_KIND_OF_WORK_SCHEMA, theJobTheyDescribed } from '../board/a-job-is-read-from-what-they-do';
import { FIGURE_PROMPT, FIGURE_SCHEMA, theFiguresTheyStated, theDayThisWasSaid } from './a-figure-is-not-a-figure-until-somebody-says-so';
import { familyFor, BoardFamily } from '../board/board-families';
import { theOneWorthAsking, askAboutItBlockFor } from './what-keeps-happening-becomes-a-question';
import { mayCoach } from './participation-timeline';
import { theirApprovedLeave } from '../suites/who-is-away';
import { aNewIdeaIn, afterTheirTurn, anIdeaReadBackAsAPromise, withoutAskingWhatToCapture, anAnswerToTheIdeaOffer, ANSWERED_THE_IDEA_OFFER } from './ideas-from-the-team';
import { theSumsOnlyARequestSaid, whereARequestInAnOrdinaryCheckInGoes } from './a-request-in-an-ordinary-check-in-goes-to-ask';
import { withoutARatingOfWhatHappened } from './the-anchor-does-not-rate-what-happened';
import { aRequestAfterTheirTurn, theyAreAnsweringAnOffer, withoutACannotApprove, withoutAPromiseToPassItOn } from './a-request-offered-in-the-check-in';
import { stillAsking } from './one-question-per-turn';
import { oneThingAsked, wouldLeaveAQuestionOut, asksMoreThanOneThing, withTheOneMoreLine, ASK_ONE_THING } from './a-turn-asks-one-thing';
import { A_CHECK_IN_TAKES_ANSWERS, theCeilingIsReached, howMuchRoomIsLeft } from './there-is-a-ceiling-and-it-is-not-a-surprise';
import { restoreTheirWords, namesWorthReporting, truncationsOfTheirWords, causalClaimNobodyMade, ASK_INSTEAD_OF_CONCLUDING } from './the-record-holds-what-was-said';
import { theThingsThatCannotBeMissed } from './the-last-thing-it-reads-is-the-thing-it-must-not-miss';
import { thePatternLine } from './whether-the-pattern-library-is-doing-anything';
import { whatYouAskedLastTurn } from './you-asked-that-last-turn';
import { theSetTheySpokeToPartOf, whatTheyToldWithoutWhen, askForWhatTheyLeftOut } from './asking-for-what-they-left-out';
import { onlyTheRulesThisTurnNeeds, whatWasLeftOut } from './only-the-rules-this-turn-needs';
import { THE_OPENER_IS_ONE_MESSAGE, theRosterAlreadySaysWhoTheyAre } from './the-first-thing-it-says-is-its-own-job';
import { SentenceGate, screen, ASK_AGAIN, askInsteadOfInventing, hitLogLine, needsAFreshAsk, Hit } from './nothing-invented-reaches-them';
import { theNextStepIsStillOwed, theCloseQuestionFor, whereTheCheckInIs, whyTheCloseWasHeld, theyHaveJustAnsweredIt } from './what-they-will-do-is-asked-before-the-end';
import { whatIsConcreteIn, THE_ONE_CONCRETE_THING, THE_CLOSE_WAS_HELD, withoutTheGoodbye, isAnAcknowledgement, theOneThingNeverAsked, takenAsSaidAndOn, saysGoodbye, hasAGoodbye, withoutTheHomework, withinTheHomeworkBudget, withoutWhatWasAlreadySaid } from './the-close-is-held-once';
import { aPromiseTheyNeverMade, whatIsLeftToSend } from './a-promise-they-never-made';
import { withoutARecordClaimNobodyHolds } from './a-record-claim-nobody-holds';
import { withoutADateNobodyGave } from './a-date-nobody-gave';
import { withoutCommentsOnTheAnswer } from './a-comment-is-not-a-question';
import { withOneQuestionPerSentence } from './a-question-asks-one-thing-in-one-sentence';
import { aNameNobodyTyped } from './a-record-line-with-a-name-nobody-typed';
import { commitmentsTheyNeverMade } from './a-commitment-is-read-back-from-a-commitment';
import { withoutAThingTheLeadListedAsTheirs } from './a-thing-the-lead-listed-is-not-theirs';
import { aCutThatLeavesAFragment, afterTheCut } from './a-cut-never-leaves-a-fragment';
import { seenInEnoughSessions, theyAskedForItThemselves, type Observation } from '../coaching/one-step-at-a-time';
import { ANCHOR_TO_DOCUMENTS_PROMPT, ANCHOR_TO_DOCUMENTS_SCHEMA } from './prompt-library';

/** The coaching block reaches a live prompt only when this platform setting is true. See coachingIsLive(). */
export const COACHING_LIVE_KEY = 'coaching_live';
/** askedFor stamp on the turn that asks what an uploaded document shows; the id follows. */
export const DESCRIBES_DOCUMENT = 'describes document:';
import {
  CORRECTION_WINDOW_KEY,
  DEFAULT_CORRECTION_WINDOW_DAYS,
  isAWindow,
  refuseIfTheWindowHasClosed,
} from './the-window-for-correcting-a-record';
import { evidenceBlock } from '../public-api/what-the-numbers-show';
import { describePending, PENDING_RULE } from '../public-api/six-is-still-the-target';
import { whenTheyMeant } from './when-words-mean-a-date';
import { OWN_PROMISE_PROMPT, OWN_PROMISE_SCHEMA, OPERATING_DIFFERENCE_PROMPT, OPERATING_DIFFERENCE_SCHEMA, PROGRESS_PROMPT, PROGRESS_SCHEMA, THEY_SAY_HAPPENED_PROMPT, THEY_SAY_HAPPENED_SCHEMA } from './prompt-library';
import { TheySay, worthRecording, WHEN_THEY_SAY_IT_IS_MISSING } from './what-they-say-happened';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { keptForTheOrganisation, MOST_KEPT_IN_A_PROMPT } from '../knowledge/organisation-memory';
import { whatTheOrganisationKeepsBlock } from '../knowledge/what-the-organisation-keeps';
import { howThisCompanyDoesIt, whatToLookUp } from './how-this-company-does-it';
import { whatTheirWeekLooksLike } from './what-their-week-looks-like';
import { howThisSounds } from './how-this-sounds';
import { withoutQuotesTheyDidNotSay, unmatchedQuotes } from './a-quote-has-to-match-what-they-said';
import { tooManyQuestionsInARow, landThisOneInstead } from './four-questions-in-a-row';
import { isShut } from '../grounds/a-ground-that-has-ended';
import { theNextDayTheyWork } from '../grounds/which-days-this-team-works';
import { readsAsBroken, ASK_FOR_IT_AGAIN_PLAINLY } from './a-sentence-with-a-word-missing';
import { hardenedAGuess, DO_NOT_HARDEN_IT } from './a-hedge-is-not-a-fact';
import { theGoodNewsIn, whatTheRecordAlreadyHolds } from './what-the-record-already-holds';
import { whatThisSessionHasCovered, sayWhatHasBeenCovered, whereTheSpineIs, theyDeclined, THEY_DECLINED_IT, askedAbout, theyAlreadyAnsweredThat, type AThingToCover } from './what-this-session-has-covered';
import { sayWhatDoesNotAddUp } from './what-does-not-add-up';
import { probeSourcesOffered } from '../learning/how-signals-are-counted';
import { theBriefForThePlanner, tidyThePlan, sayThePlan, howTheyAnswered, PLAN_PROMPT, PLAN_TOOL } from './the-plan-for-this-session';
import { POSITIVE_CODES, CARRYING_CODES, BAD_FAITH_CODES } from '../patterns/pattern-library';
import { periodOf } from '../patterns/period-of';
import { withoutTheClaimsTheNumbersDoNotSupport, numbersIn as numbersInAClaim } from './a-claim-the-numbers-do-not-support';
import { recordAndMoveOn, NOTHING_HERE_HAS_A_NUMBER, NO_DECISION_YET } from './a-refusal-is-an-answer';
import { nothingSaidYetCannotBeQuoted } from './nothing-said-yet-cannot-be-quoted';
import { theSentenceToThePerson, theSentenceToTheLead, sayTheDisagreementOnce } from './the-disagreement-said-once';
import {
  whatIsStillOwed, sayWhatIsMissing, stageOf, ASK_TWICE_THEN_LET_IT_GO,
  whichCard, owedFor, type Owed, type Role,
} from './what-a-check-in-owes';
import { everythingOwedFor } from './what-every-check-in-owes';
import { isADeadEnd, ASK_SOMETHING_OR_CLOSE } from './a-reply-that-asks-nothing-is-a-dead-end';
import { withAQuestion } from './nobody-is-left-looking-at-a-paragraph';
import { theReportIsNotTheirsYet, withoutPromisingTheReport } from './the-report-is-not-yours-to-promise';
import { notTheSameAsLastTime } from './the-same-sentence-five-times';
import { theWorkTheySaid, notARemarkAboutUs, ANSWER_THE_REMARK, aboutTheToolNotTheWork } from './a-remark-about-the-tool-is-not-the-work';
import { nothingYet, withThisTurn, whatToAskAbout, type WhatWeHave, type Claim } from './what-we-have-so-far';
import {
  READ_THE_BRIEF, READ_THE_BRIEF_SCHEMA, whatToCoverNext, breadthFirst, theyHaveTalkedAbout,
  theSubjectWorthRaising, type ASubject,
} from './the-ground-the-brief-asks-us-to-cover';
import { whatTheyWantAsked, asSomethingToCover, followTheirLead } from './they-can-tell-us-what-to-ask';
import { theChallengeWorthPutting, sayThisChallenge } from './what-a-claim-costs-to-prove';
import {
  READ_THIS_TURN, READ_THIS_TURN_SCHEMA, theNotesSoFar, theSubjectsToJudgeAgainst, theFieldsToJudgeAgainst,
} from './reading-what-they-just-said';
import {
  askForThisField, theFieldWorthAsking, theFrameComesFirst,
} from './the-field-this-answer-is-missing';
import {
  READ_THE_FRAME, READ_THE_FRAME_AGAIN, READ_THE_FRAME_SCHEMA, theFrameFrom, whatTheFrameLeftOut,
  THE_MOST_ANYBODY_WILL_FILL, type AField,
} from './what-a-complete-answer-holds';
import { whatTheyGaveUs, type WhatTheyGave } from './what-they-gave-us-to-work-with';
import {
  theFitInstruction, THE_FIT_SCHEMA, theFitFrom, howCompletely,
} from '../reports/fitting-an-answer-into-the-frame';
import { whatIsWorthSaying } from './what-the-room-already-knows';
import { whereThatLeavesThem, theySaidANumber } from './where-that-leaves-them';
import { whatIsAlreadyOnThem } from './you-have-already-said-this-about-them';
import { oneThingBack } from './one-thing-back-not-three';
import { whatFiredThisTurn, oneLine } from './which-blocks-actually-fire';
import { isAVerdictAboutSomebodyElse, HERS_TO_DRAW } from './a-verdict-is-not-a-question';
import { isAnEssay, howManyWords, SAY_IT_SHORTER, A_CLOSE_IS_THREE_SENTENCES, A_REPLY_IS_ABOUT } from './a-reply-is-not-an-essay';
import { asksItAgainAfterTheAnswer, anAnsweredQuestionAskedAgain, theyPushedBackOnTheQuestions, asksTheSameThingAgain, THEY_ALREADY_SAID_NO, opensByRepeatingThem, doNotSayItBack, withoutTheSentenceThatSaysItBack, alreadyAskedTwice, ASKED_IT_TWICE_ALREADY, withoutTheQuestionAskedAgain } from './asked-twice-and-told-no-twice';
import { totalSessionsFor } from '../grounds/session-count';
import { deadlineOf } from '../grounds/when-the-clock-starts';
import { whenThisIsOver, theyAskedWhenThisIsOver, THE_RUN_IS_WHAT_THEY_ASKED_ABOUT } from './when-this-is-over';
import { whatTheySaidTheyWouldDo, thingsNobodyOwns, whatIsNotSettled, theQuestionsTheLeadWants, whatSitsBetweenPeople, whatTheyHedged, keepTheirHedge, howThisTeamWorks } from './what-the-context-already-holds';
import { alreadyAsked, withTheQuestionAsConfirmed } from '../grounds/a-question-asked-word-for-word';
import { targetsFor, UNLESS_SOMEBODY_SAYS } from '../board/whose-number-is-whose-business';
import { withoutWhatTheLeadHasNotToldThemAbout, type AnUntoldGoalRow } from '../board/an-untold-goal-is-not-a-board-objective';
import { mayThisGoalBeCopiedToCommitments } from '../grounds/a-commitment-from-a-goal-not-told-is-not-read-by-its-person';
import { asADirection } from '../board/an-aim-or-a-limit';
import { theTargetAsASentence } from './each-target-is-a-sentence-about-whoever-set-it';
import { withoutOurInstructions } from './our-instructions-never-reach-them';
import { withoutTheLeadsBrief, aSentenceThatQuotesTheBrief, theLeadsSetupWords } from './the-leads-brief-is-never-quoted-to-them';
import { withoutSentencesAboutOneOfThem } from '../reports/one-persons-circumstances-stay-their-own';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';
import { namesOnTheRoster, targetsHiddenFrom, withoutHiddenTargets } from '../board/a-hidden-target-stays-hidden';
import { askWhoSecuredIt } from './who-secured-that-meeting';
import { READ_WHAT_THEY_PROMISED, WHAT_THEY_PROMISED_SCHEMA, theOnesToKeep } from './what-they-said-they-would-do-next';
import { theFullerPromise, nameTwoDifferentDates } from './the-same-promise-said-more-fully';
import { theSameMeasure } from '../grounds/a-dump-is-many-things';
import { aRoleInTheirOwnWords } from '../grounds/the-leads-words-about-someone';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { writeADocumentsNumbers } from '../documents/write-a-documents-numbers';
import { contextIsInAskGroundwork } from '../admin/what-is-hidden-at-release';
import { askNameOf } from '../assistant/ask-name';
import { whereToTakeALongPaste } from './a-long-paste-from-the-lead-has-a-better-door';
import { notToldYet } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { wordTheAreaOfAGoal, areaOfGoalOrFallback } from '../grounds/the-area-of-a-goal-is-worded-once';
import { saysWhatAnUntoldGoalWithholds, IT_NAMED_THE_UNTOLD_NUMBER, type AnUntoldGoal } from './an-untold-goals-number-is-not-said';

/**
 * How many things in this text could actually be checked by someone later.
 *
 * Substance, not length. A live run rejected two real check-ins for being
 * "too short" while they named a count, an outcome and a blocker, and let
 * through "things are going quite well and the team seems happy" at 90
 * characters. Length was measuring the wrong thing.
 *
 * NEGATION MATTERS MORE THAN ANYTHING ELSE HERE. "nothing I can point to as
 * closed yet" contains the word "closed", and counting it as an achievement is
 * how a person who delivered nothing for six weeks scored the same as a person
 * who delivered all quarter. An absence is not a specific.
 */
const NEGATION = /\b(nothing|not|no|none|never|without|yet to|hasn'?t|haven'?t|didn'?t|cannot|can'?t|couldn'?t|unable|still (waiting|pushing|working)|nowhere)\b/i;

export function countCheckableSpecifics(text: string): number {
  /**
   * Count clause by clause, so a negated clause cannot contribute - and so a
   * negated clause cannot poison the positive one sitting next to it.
   *
   * "and" USED NOT TO SPLIT, and that single omission erased people's work.
   *
   *   "I closed 22 tickets in my first three weeks."                     -> 3
   *   "I closed 22 tickets in my first three weeks
   *    AND nothing has slipped past its date."                           -> 0
   *
   * Identical achievement, scored three or zero depending on whether the person
   * also mentioned something that had NOT gone wrong. The whole sentence became
   * one clause, the word "nothing" made it negated, and the numbers in the first
   * half were never counted.
   *
   * That is how careful people report progress - "I did X and nothing broke",
   * "we shipped A and there were no regressions" - so the filter systematically
   * discarded the contributions of anyone who reports honestly, while rewarding
   * anyone who only states positives. Because an entry that counts zero
   * specifics is dropped as a non-answer, their words never reached the record
   * at all, and the shared report then told their manager they had contributed
   * nothing.
   *
   * Measured in the eighteen-ground run, after the fact:
   *
   *   hafeezah@org.test | 16 completed sessions | 0 record entries
   *   kavon@org.test    |  7 completed sessions | 0 record entries
   *
   * Hafeezah's was a performance improvement plan. Sixteen sessions of her
   * account, erased, on the one record where that matters most.
   *
   * The original rule stands and is still right: an absence is not an
   * achievement. "nothing closed and nothing shipped" is still two negated
   * clauses and still counts zero. Splitting on the conjunctions only stops the
   * absence swallowing the achievement beside it.
   */
  const clauses = text.split(/[.!?;]|\bbut\b|\bthough\b|\band\b|\bwhile\b|\balthough\b|\bwhereas\b|,\s*(?=nothing|no |not )/i);
  let total = 0;
  for (const clause of clauses) {
    if (!clause.trim()) continue;
    const negated = NEGATION.test(clause);

    // Proper nouns: a capitalised word NOT starting a sentence. Sentence
    // openers ("Yeah...", "Not...") are not named entities. These still count
    // in a negated clause - naming who you did NOT hear from is still specific.
    total += (clause.match(/(?<=[a-z,] )[A-Z][a-zA-Z]{2,}\b/g) ?? []).length;

    if (negated) continue; // an absence is not an achievement

    total += (clause.match(/\b\d+([.,]\d+)?%?\b/g) ?? []).length;
    total += (clause.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|hundred|thousand)\b/gi) ?? []).length;
    total += (clause.match(/\b(mon|tues|wednes|thurs|fri|satur|sun)day\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\bnext (week|month|quarter)\b|\bq[1-4]\b/gi) ?? []).length;
    total += (clause.match(/\b(signed|shipped|closed|delivered|launched|agreed|blocked|paid|hired|sent|booked|onboarded)\b/gi) ?? []).length;
  }
  return total;
}


/**
 * EVERYTHING briefFor NEEDS, IN ONE PLACE, BECAUSE IT WAS IN TWO AND THEY DISAGREED.
 *
 * `whoIsReadingIt` is handed the ground through `as any`, so a field a query forgot to select is
 * not a compile error - it arrives undefined, and undefined is falsy. `initiatorId` was missing
 * here, so every lead opening their own check-in read as isLead false and was handed the narrowed
 * participant view of targets they set themselves, with "everybody's own number is their own" said
 * back to the person who set them. `whoSeesTargets` was missing the same way, so a check-in set so
 * everybody sees every number was still read under the narrow rule.
 *
 * One constant, so the next read cannot be half right.
 */
const WHAT_THE_BRIEF_IS_READ_FROM = {
  label: true,
  brief: true,
  /* What a participant is told, written by the product. Run 8 (21 Sep 2026) wrote it for every ground and
     showed nobody, because this select did not read it. */
  toldToParticipants: true,
  scenario: true,
  /* So a check-in the anchor link started can be told apart: its lead's words are not served to the team (decision 96, item 8). */
  startedFrom: true,
  initiatorId: true,
  /* AND WHOEVER THAT IS, BY NAME. The opener says "Bisi says your target is 12", never "the person
     who set this up said". See nothing-said-yet-cannot-be-quoted. */
  initiator: { select: { firstName: true, lastName: true } },
  whoSeesTargets: true,
  /* WHO SET EACH TARGET AND WHICH WAY IT GOES (decision 69), so it is said about them and not as the reader's own. */
  objectives: { select: { name: true, target: true, ownerParticipantId: true, isADecisionAboutAPerson: true, setByParticipantId: true, direction: true }, orderBy: { sortOrder: 'asc' as const } },
  /* And the people, by first name, under the same naming rule as everywhere else. */
  peersVisibleToEachOther: true,
  participants: { select: { id: true, partyType: true, createdAt: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

const RECORD_EXTRACTION_SCHEMA = {
  name: 'emit_record_entries',
  description: 'Emit the structured record entries extracted from this party\'s transcript.',
  input_schema: {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: Object.values(RecordEntryType),
              description: 'The kind of entry.',
            },
            text: { type: 'string', description: "The entry in the person's own words." },
            verifiability: {
              type: 'string',
              enum: ['HIGH', 'MEDIUM', 'LOW'],
              description:
                'How verifiable this entry is from external evidence. HIGH = document or concrete fact; MEDIUM = specific claim that could be checked; LOW = subjective or memory-only.',
            },
          },
          required: ['type', 'text', 'verifiability'],
        },
      },
    },
    required: ['entries'],
  },
};

// Single-party artifact (B2) - gives a person standalone value from session 1
// without waiting on the other party.
const SOLO_ARTIFACT_SCHEMA = {
  name: 'emit_solo_artifact',
  description: "Emit a short single-party summary of this person's own record.",
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: "Plain-language summary of what this person put on the record, in their own framing. No verdict, no inference about anyone else, and never a rating of the record itself: not 'your record is specific', not 'clear', not 'thin'. The page has its own meter for that." },
      whatToCarry: { type: 'string', description: "One specific, forward-looking thing for them to carry into the conversation or watch for next. A thing to do or watch, in their words. Never praise ('great', 'very clear', 'excellent') and never a judgement." },
    },
    required: ['summary'],
  },
};

const SOLO_ARTIFACT_PROMPT = `You are Groundwork. You are given ONE person's own record entries (their words) and NOTHING ELSE. Produce a short artifact for them alone - they have not heard from anyone else and may never.

WHAT YOU DO NOT KNOW, AND MUST THEREFORE NEVER STATE. You have not been told how many people are on this check-in, who they are, what they are called, or whether any of them has contributed anything. That information is not in your input. So:
- Never state or imply a number of parties. Not "two of the three", not "the other party", not "both of you".
- Never refer to another person by name, role or position. Never invent one such as "the 2nd lead".
- Never say whether anybody has or has not checked in, contributed, or recorded anything.
- Never say whose account this picture is drawn from. It is drawn from theirs; that is the only account you have.

A live report opened with "Two of the three parties on this ground, Hafsah Jumare and the 2nd lead, have not yet contributed a record. The picture below is therefore drawn from Hafsah Jumare's account alone." Every fact in that sentence was invented - the count, the second name, and the claim about who had contributed - because none of it was in the input. It also contradicted itself, naming the same person as both absent and the sole source.

Write only about what this person told you. Address them directly as "you" and "your", never by name. Do not infer the other side. Do not produce a verdict or analysis of any person. Open with the sentence "Here is what you shared." on its own, then summarise it in their own framing in full sentences. Name one specific thing to carry forward. Warm, specific, brief - under 200 words total.

${PLAIN_WORDS}

ONE THING IN THE RULES ABOVE DOES NOT APPLY HERE. They say to use people's names. You have not been told anybody's name and must not invent one, so the rule two paragraphs up wins: no name, not theirs and not anybody else's. Everything else in the rulebook holds, including the full sentences and the plain words.`;

/**
 * The conversation engine. Drives a single party's check-in.
 *
 * HARD RULE (architectural): a party's transcript and record are NEVER loaded
 * into the other party's context. Every method here is scoped to one
 * participantId and must not join across parties. The only thing that crosses
 * is the synthesised report (see ReportsService), which is a new document.
 */
/**
 * WHO IS ASKING FOR THIS CHECK-IN: a signed-in user, or the participant row itself.
 *
 * The second is how somebody answers through a shared link or a QR code, before they have given a
 * name or an address. It is not a looser check - it names one row, the way a user id does - and the
 * secret behind it is resolved before anything in this service sees it. See the-open-link.
 */
export type WhoIsAsking = string | { theParticipant: string };

/** How long the end card is given, after the goodbye, before it is left out and finishing reads the record as before. */
const THE_END_CARD_WAITS_MS = 90_000;

/** How long finishing, or the screen asking for the card, waits for the card still being built. The live reads took 10 to 47 seconds. */
const FINISHING_WAITS_FOR_THE_CARD_MS = 50_000;

/** "3", "150k", "1.5m", "12,000" as a number, or null where it is not one plainly (request 107 c). */
export function aNumberTheySaid(said: string | null | undefined): number | null {
  const m = /^\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m|million|thousand)?\s*$/i.exec(said ?? '');
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  const times = /^k|thousand/i.test(m[2] ?? '') ? 1_000 : /^m/i.test(m[2] ?? '') ? 1_000_000 : 1;
  const v = Math.round(n * times);
  return Number.isFinite(v) && v > 0 ? v : null;
}

@Injectable()
export class ConversationService {
  /** Answers being worked on right now, so the same answer arriving twice is answered once. See sendMessage. */
  private inFlight?: Map<string, Promise<any>>;
  /* Made on first use, so a service built without its constructor (as some specs build it) still has one. */
  private get answersInFlight(): Map<string, Promise<any>> {
    return (this.inFlight ??= new Map());
  }

  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private prisma: PrismaService,
    private prompts: PromptsService,
    private anthropic: AnthropicService,
    private context: ConversationContextService,
    private events: EventEmitter2,
    private documents: DocumentsService,
    private billing: BillingService,
    private email: EmailService,
    private usage: UsageService,
    private config: ConfigService,
    /*
     * THE ORGANISATION'S OWN WRITTEN PROCESS, for the one question that shows understanding rather
     * than asking about it.
     *
     * Last, and optional to TypeScript. Nest injects it - the provider is registered - and the two
     * dozen specs that build this service positionally keep compiling without a stub they would
     * never use. Every call site treats it as absent, which is also what happens in an
     * organisation that has written nothing down.
     */
    private knowledge?: KnowledgeService,
  ) {}

  /** Best-effort, and never the reason a refusal fails to reach the person refused. */
  private async tellAnAdminToAddACard(groundId: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { organizationId: true, organization: { select: { name: true } } },
    });
    if (!ground) return;
    const admins = await this.prisma.user.findMany({
      where: { organizationId: ground.organizationId, role: 'ADMIN' as any, deletedAt: null },
      select: { email: true },
    });
    for (const a of admins) {
      await this.email
        .sendPaymentRequestEmail(a.email, ground.organization?.name ?? 'your organisation', groundId)
        .catch(() => undefined);
    }
  }

  /**
   * One session left, said once, to the people who can do something about it.
   *
   * Best-effort by construction: a notification must never be the reason a check-in
   * cannot start, and the balance has already been decremented by the time this
   * runs.
   */
  private async warnIfNearlyOutOfSessions(groundId: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { label: true, sessionsBalance: true, organizationId: true },
    });
    if (!ground || ground.sessionsBalance !== 1) return;

    const admins = await this.prisma.user.findMany({
      where: { organizationId: ground.organizationId, role: 'ADMIN' as any, deletedAt: null },
      select: { email: true },
    });
    const url = `${this.config?.get<string>('resend.frontendUrl') ?? ''}/grounds/${groundId}`;
    for (const a of admins) {
      await this.email.sendApproachingSessionLimit(a.email, ground.label ?? 'your ground', url).catch(() => undefined);
    }
  }

  /** Returns the transcript for a check-in - owner-scoped only. */
  /**
   * Two to four suggested answers for the question this turn asks, stored on the turn so they
   * survive a reload. Empty when it asks nothing, and on any failure: a missing suggestion is never
   * an error the person sees. See suggested-answers.
   */
  private async suggestedAnswersFor(turnId: string, turnText: string, theirLastAnswer: string | null, checkInId?: string): Promise<string[]> {
    /*
     * NOTHING IS SUGGESTED IN THE TEAM BASELINE (anchor piece 14). Its questions ask what the person sees from where they sit, what they
     * think their lead is worried about, and who they depend on. A ready-made answer there ("I believe we are shipping the product.") is an
     * answer put into their mouth, on the one conversation that exists to learn what is in theirs.
     */
    if (checkInId && this.anchorWeekForThisTurn.get(checkInId)?.isTheBaseline) return [];
    const answers = await suggestAnswers(this.anthropic as any, turnText, theirLastAnswer).catch(() => [] as string[]);
    if (answers.length) {
      await this.prisma.conversationTurn.update({ where: { id: turnId }, data: { suggestedAnswers: answers } as any }).catch(() => undefined);
    }
    return answers;
  }

  /**
   * THE TARGETS THIS PERSON'S OWN CHECK-IN MAY BE GIVEN (week 0 of docs/weekly-plan.md). Where people
   * see only their own targets, a colleague's is not given to the model that talks to them: the rule
   * the brief on their screen already follows (whose-number-is-whose-business). The lead gets all.
   */
  private theTargetsThisPersonMaySee(
    ground: { objectives?: { name: string; target: number | null; ownerParticipantId?: string | null }[]; whoSeesTargets?: string | null; participants?: any[] },
    checkIn: { participantId: string; participant?: { partyType?: string | null } | null },
    untold: AnUntoldGoalRow[] = [],
  ) {
    const isLead = checkIn.participant?.partyType === PartyType.INITIATOR;
    const shown = targetsFor(
      (ground.objectives ?? []) as any[],
      checkIn.participantId ?? null,
      ground.whoSeesTargets === 'EVERYBODY' ? 'everybody' : UNLESS_SOMEBODY_SAYS,
      { isLead },
    ).shown;
    /* AND NOT A GOAL THE LEAD HAS NOT TOLD THEM ABOUT (decision 56): the board's own wall, read the same way. */
    return withoutWhatTheLeadHasNotToldThemAbout(shown as any[], untold, (ground.participants ?? []) as any[], isLead).kept;
  }

  /** The goals the lead has set for somebody on this check-in and not yet told them (decision 56). */
  private async untoldGoalsOn(groundId: string): Promise<AnUntoldGoalRow[]> {
    const rows = await ((this.prisma as any).personObjective?.findMany?.({
      where: { groundId, awareness: 'NOT_TOLD' },
      select: { participantId: true, text: true, awareness: true, authoredBy: true, createdAt: true },
    }) ?? Promise.resolve([])).catch(() => []);
    return (rows as any[]).filter(notToldYet);
  }

  /**
   * EACH TARGET THIS PERSON MAY READ, AS A SENTENCE ABOUT WHOEVER SET IT (decision 69). "You" for the
   * person in this check-in, a first name for anybody this check-in names to them, "a colleague"
   * otherwise. Only the wording: who may read which target is decided before this is called.
   */
  /** Who runs the check-in, and a colleague's first name where this reader may be told it, for the goals they are told about. */
  /** Whether the lead has switched on "Use simpler words" for this check-in. Off when it cannot be read. */
  private async usesSimplerWords(groundId: string): Promise<boolean> {
    const g = await (this.prisma as any).ground?.findUnique?.({ where: { id: groundId }, select: { simplerWords: true } })?.catch?.(() => null);
    return !!g?.simplerWords;
  }

  private whoSetWhatForThisReader(ground: { participants?: any[]; scenario?: any; peersVisibleToEachOther?: boolean | null } | null, readerParticipantId: string | null) {
    const people = (ground?.participants ?? []) as any[];
    const lead = people.find((p) => p.partyType === PartyType.INITIATOR);
    const peersMayBeNamed = peersAreNamedOn(ground as any, { participantId: readerParticipantId });
    const first = (p: any) => (p?.user?.firstName ?? p?.nameGiven ?? '').trim() || null;
    return {
      leadParticipantId: lead?.id ?? null,
      nameOf: (id: string) => (id === lead?.id || peersMayBeNamed ? first(people.find((p) => p.id === id)) : null),
    };
  }

  private theTargetsAsSentences(
    rows: { name: string; target: number | null; ownerParticipantId?: string | null; setByParticipantId?: string | null; direction?: string | null }[],
    ground: { participants?: any[]; scenario?: any; peersVisibleToEachOther?: boolean | null } | null,
    readerParticipantId: string | null,
  ): { name: string; target: number | null; direction: 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO' | null }[] {
    const people = (ground?.participants ?? []) as any[];
    const first = (p: any) => (p?.user?.firstName ?? p?.nameGiven ?? '').trim() || null;
    const reader = people.find((p) => p.id === readerParticipantId);
    const lead = people.find((p) => p.partyType === PartyType.INITIATOR);
    const peersMayBeNamed = peersAreNamedOn(ground as any, { participantId: readerParticipantId });
    return rows.map((o) => ({
      name: theTargetAsASentence(o, {
        readerId: readerParticipantId,
        readerFirstName: first(reader),
        leadId: lead?.id ?? null,
        /* The lead runs the check-in and is named to everybody in it; anybody else by the naming rule. */
        firstNameOf: (id) => (id === lead?.id || peersMayBeNamed ? first(people.find((p) => p.id === id)) : null),
      }),
      target: o.target ?? null,
      direction: asADirection(o.direction),
    }));
  }

  /**
   * IN AN ANCHOR CHECK-IN, WHAT THE LEAD SAID IN HER OWN CONVERSATION IS NOT GIVEN TO THE MODEL FOR SOMEBODY ON HER TEAM (decision 96, item 8).
   * Her brief, and the aims her words made, were handed to a team member's model as the situation, and the model said one of them to a team
   * member: "That connects directly to Wairimu's aim for the team to understand that a crate left in the sun for twenty minutes is a spoiled
   * order." (anchor walk, 8 October). Stripped here, in code, at the read; the team member's words name only what they have been told.
   */
  private theLeadsOwnWordsStayHers(ground: unknown, checkIn: { participant?: { partyType?: string | null } | null }): boolean {
    return checkIn.participant?.partyType !== PartyType.INITIATOR && aCheckInStartedFromTheAnchor(ground as any);
  }

  /**
   * AND THE BRIEF, WITHOUT A COLLEAGUE'S HIDDEN TARGET (29 September 2026). The lead's setup words go
   * to every person's check-in as the situation, and they can say "Kwame Mensah should reach
   * seventeen approved facilities". Where people see only their own targets, that sentence is not
   * given to Ngozi's model; the rule is the one every served text uses (a-hidden-target-stays-hidden).
   * The lead, and a check-in where targets are shared with everybody, get the brief as written.
   */
  private theBriefThisPersonMayBeGiven(
    ground: { brief?: string | null; whoSeesTargets?: string | null; objectives?: { target: number | null; ownerParticipantId?: string | null }[]; participants?: any[] },
    checkIn: { participantId: string; participant?: { partyType?: string | null } | null },
  ): string | null {
    return this.theLeadsWordsThisPersonMayBeGiven(ground, checkIn, ground.brief);
  }

  /**
   * THE SAME FOR THE LEAD'S NOTE TO EVERYONE (29 September 2026, the more private option). The note
   * reaches every person's own check-in as the situation, and can carry a colleague's hidden target
   * as much as the brief can. Same rule, same exceptions: the lead, and targets shared with everybody.
   */
  private theSharedNoteThisPersonMayBeGiven(
    ground: { leadContextNotes?: { text?: string | null; audience?: string | null; participantId?: string | null }[]; whoSeesTargets?: string | null; objectives?: { target: number | null; ownerParticipantId?: string | null }[]; participants?: any[] },
    checkIn: { participantId: string; participant?: { partyType?: string | null } | null },
  ): string | undefined {
    const note = (ground.leadContextNotes ?? []).find((n) => n.audience === 'EVERYONE' && !n.participantId)?.text?.trim();
    return this.theLeadsWordsThisPersonMayBeGiven(ground, checkIn, note)?.trim() || undefined;
  }

  /** Words the lead wrote for everyone, without a sentence giving a target this person may not see. */
  private theLeadsWordsThisPersonMayBeGiven(
    ground: { whoSeesTargets?: string | null; objectives?: { target: number | null; ownerParticipantId?: string | null }[]; participants?: any[] },
    checkIn: { participantId: string; participant?: { partyType?: string | null } | null },
    text: string | null | undefined,
  ): string | null {
    if (!text) return text ?? null;
    const hidden = targetsHiddenFrom(
      { participantId: checkIn.participantId ?? null, isTheLead: checkIn.participant?.partyType === PartyType.INITIATOR },
      ground.whoSeesTargets,
      (ground.objectives ?? []).map((o) => ({ ownerParticipantId: o.ownerParticipantId ?? null, target: o.target })),
      namesOnTheRoster(ground.participants ?? []),
      /* And a target written only in the lead's words about somebody (targetsFromTheirRemits). */
      ground.participants ?? [],
    );
    return withoutHiddenTargets(text, hidden) || null;
  }

  async getTranscript(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'asc' },
    });
    const ground = await this.prisma.ground.findUnique({
      where: { id: checkIn.groundId },
      select: {
        /*
         * WHAT THE CHECK-IN IS ABOUT, WHICH ONLY EVER ARRIVED ONCE.
         *
         * `open()` returns the brief, and the client stores it in that response handler and nowhere
         * else. So the band that says what this check-in is about renders on the single load that
         * OPENS the session, and never again - come back, refresh, or land on a session already
         * open and it is gone.
         *
         * Reported by somebody who did a whole check-in and only saw what it was about afterwards.
         * The band's own comment on the client says why that is the wrong behaviour: "it stays
         * visible rather than appearing once, because a target you saw at the top of a ten-minute
         * conversation is a target you are no longer looking at by the time it matters." It was
         * describing what the code was supposed to do.
         *
         * The transcript is what every later load reads, so the brief travels on it too. Same
         * `briefFor`, same shared-facts-only rule: the subject, what the lead wrote, the objectives.
         */
        ...WHAT_THE_BRIEF_IS_READ_FROM,
      },
    });

    // Reopen (#3): when this is a self-correction session, surface the prior
    // session's turns so the person can SEE what they said before adding to it.
    // Same participant, so no cross-party content crosses (HARD RULE holds).
    // The original session's turns are read-only context here; the correction
    // is recorded as this new session (the original is never edited).
    let priorTurns: typeof turns = [];
    let priorSessionNumber: number | null = null;
    if (checkIn.isSelfCorrection && checkIn.selfCorrectionTargetSession != null) {
      const priorCheckIn = await this.prisma.checkIn.findUnique({
        where: {
          participantId_sessionNumber: {
            participantId: checkIn.participantId,
            sessionNumber: checkIn.selfCorrectionTargetSession,
          },
        },
        select: { id: true },
      });
      if (priorCheckIn) {
        priorTurns = await this.prisma.conversationTurn.findMany({
          where: { checkInId: priorCheckIn.id },
          orderBy: { createdAt: 'asc' },
        });
        priorSessionNumber = checkIn.selfCorrectionTargetSession;
      }
    }

    // #3: continuity is real in the model's prompt (composeSystemPrompt's
    // PRIOR_SESSION block) and in the final report, but was invisible to the
    // person themselves - a normal session 2+ open showed nothing of their
    // own prior answers, leaving continuity entirely dependent on whatever
    // the AI's opening line happened to mention. Surface the person's own
    // record entries from every completed prior session (same source the
    // model reads), read-only, whenever this is a normal returning session -
    // not a self-correction, which already gets the richer full-turn replay
    // above. Same for initiator and participant: this reads checkIn.participantId
    // generically, with no party-type branch.
    let priorRecordEntries: { sessionNumber: number; entries: { type: string; text: string }[] }[] = [];
    if (checkIn.sessionNumber >= 2 && !checkIn.isSelfCorrection) {
      const priorCheckIns = await this.prisma.checkIn.findMany({
        where: {
          participantId: checkIn.participantId,
          sessionNumber: { lt: checkIn.sessionNumber },
          status: CheckInStatus.COMPLETED,
        },
        orderBy: { sessionNumber: 'asc' },
        select: { id: true, sessionNumber: true },
      });
      const withEntries = await Promise.all(
        priorCheckIns.map(async (ci) => {
          const entries = await this.prisma.recordEntry.findMany({
            /* A line they unsaid is not replayed to them as their record. Low harm - it is their
               own page - but a disputed line shown back with nothing marking it reads as still
               standing, which is the whole thing "this is not what I said" exists to stop. */
            where: { checkInId: ci.id, participantId: checkIn.participantId, disputedAt: null },
            orderBy: { createdAt: 'asc' },
            select: { type: true, text: true },
            take: 10,
          });
          return { sessionNumber: ci.sessionNumber, entries };
        }),
      );
      priorRecordEntries = withEntries.filter((s) => s.entries.length > 0);
    }

    /*
     * CLEANED ON THE WAY OUT, NOT REWRITTEN IN THE DATABASE.
     *
     * `forHumans` runs when a reply is generated, so every turn stored before a rule existed keeps
     * whatever it was saved with. Scrolling back through a finished session still showed "That
     * Zainab has not been told is now on the record" - the courtroom sentence the strip was added
     * to remove - because the strip had never seen that row.
     *
     * WHY NOT A MIGRATION. What is stored is what a person was actually told. Editing it changes
     * the record of the conversation to say something that was not said, on a product whose whole
     * claim is that it keeps what people said. Cleaning at the read changes only what is shown, and
     * it covers every old session at once rather than every old session that a migration remembered.
     *
     * Only the AI's own turns. A person's words go through untouched: `forHumans` strips OUR
     * ceremony and house style, and running it over somebody's account would be the product editing
     * them.
     */
    const asRead = <T extends { role: TurnRole; content: string }>(t: T): T => {
      /* The lines behind the end card are not written yet and are never served: only the card is. */
      const { recordDraft: _notServed, ...turn } = t as any;
      return (t.role === TurnRole.AI ? { ...turn, content: forHumans(t.content) } : turn) as T;
    };

    /* The person reads their own transcript. What the lead typed about them is the lead's: only the person who runs it is served the whole row. */
    const runsIt = (checkIn as any).participant?.partyType === 'INITIATOR';
    return {
      checkIn: {
        ...theCheckInRowAsServed(checkIn as any, runsIt),
        participant: theParticipantAsServed((checkIn as any).participant, runsIt),
        theirAnswerFitted: theFitAsServed((checkIn as any).theirAnswerFitted, runsIt, {
          said: (turns as any[]).filter((t) => t.role === TurnRole.PERSON).map((t) => String(t.content ?? '')),
          organisationGiven: (checkIn as any).participant?.organisationGiven ?? null,
        }),
        groundLabel: ground?.label ?? null,
        scenario: ground?.scenario ?? null,
      },
      brief: this.briefFor(ground, this.whoIsReadingIt(ground as any, checkIn as any), await this.untoldGoalsOn(checkIn.groundId)),
      /* The turn floor the server will hold this to, so the screen offers to finish exactly when the server will honour it. See how-short-a-check-in-may-be. */
      mayCompleteAfter: theFloorFor(!!(checkIn as any).isSelfCorrection, (ground as any).scenario ?? null),
      turns: turns.map(asRead),
      /* The end card, once the conversation has closed and it is ready: on the closing turn, and only
         while nothing has been said after it (task 2.7). The screen reads it here. */
      endCard: theCardStillStanding(turns as any),
      priorTurns: priorTurns.map(asRead),
      priorSessionNumber,
      priorRecordEntries,
      /* "Connect WhatsApp" for the person reading their own check-in, or null (decision 106 item 4). Owner-only read. */
      connectWhatsApp: await this.connectWhatsAppOn(checkIn.groundId, requestingUserId),
    };
  }

  /** The person's own "Connect WhatsApp" link on this check-in, or null. See whatsapp/connect-whatsapp.ts. */
  private async connectWhatsAppOn(groundId: string, userId: string): Promise<ConnectWhatsApp> {
    const g = await (this.prisma as any).ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true, overWhatsApp: true } })?.catch?.(() => null);
    if (!g) return null;
    const me = await (this.prisma as any).user?.findUnique?.({ where: { id: userId }, select: { email: true } })?.catch?.(() => null);
    return connectWhatsAppFor(this.prisma, this.config, { organizationId: g.organizationId, userId, email: me?.email ?? null, keptInTheApp: keptOffThePhone(g) });
  }

  /**
   * Return the transcript formatted as plain text for download.
   * Owner-scoped: the person can only download their own record.
   */
  async getDownload(checkInId: string, requestingUserId: string): Promise<string> {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'asc' },
    });

    const header = [
      'Groundwork - Contribution Record',
      `Session ${checkIn.sessionNumber}`,
      checkIn.completedAt
        ? `Completed: ${checkIn.completedAt.toISOString().slice(0, 10)}`
        : `Status: ${checkIn.status}`,
      '',
      'This record belongs to you. It was built from your words in a private check-in.',
      '─'.repeat(60),
      '',
    ].join('\n');

    const body = turns
      .map((t) => {
        const speaker = t.role === TurnRole.AI ? 'Groundwork' : 'You';
        return `[${speaker}]\n${t.content}`;
      })
      .join('\n\n');

    return header + body;
  }

  /**
   * Open the check-in: the engine speaks first, delivering the moment's opening
   * per the runtime context. Idempotent - if turns already exist, returns the
   * existing first turn rather than re-opening.
   *
   * NO PAYMENT OR CADENCE WALL (B1/B3, Part 9). Check-ins are never gated on
   * payment - "if participant sessions are ever gated, trust collapses" - and
   * the cadence is a recommendation, not a wall, so the initiator reaches the
   * report fast. `availableFrom` is surfaced in the UI as a suggested return
   * date only. (Historically a paywall sat between REPORT_READY and ACTIVE;
   * since 60ce541 report release auto-activates straight to ACTIVE, so new
   * grounds never pause at that gate - the report is still the conversion
   * moment, not the session.)
   */
  /**
   * What a participant is told they are checking in on, before they are asked anything.
   *
   * Deliberately only the SHARED facts: the subject and the stated objectives. Nothing another
   * party wrote about them, nothing from anybody else's account. A brief that leaked one
   * participant's words to another would break the promise that makes the answers worth having.
   */
  /**
   * WHICH LIST OF THINGS THIS CHECK-IN OWES, or none.
   *
   * Both goal cards run on OKR_ALIGNMENT, because a cascade is detected from what people say rather
   * than declared at setup. What tells them apart is the sentence the person picked the card with,
   * which is on the ground as its brief - the cascade card's says there is something above this
   * team. Nothing is inferred beyond that: a check-in with neither shape gets no list at all, and
   * the conversation runs exactly as it did.
   */
  private whichOwedListFor(scenario: string, brief: string | null): Owed[] | null {
    /*
     * THE TWO GOAL CARDS KEEP THEIR OWN LISTS, and everything else gets the spine.
     *
     * Those two were written out slot by slot from copy given for them, so a spine underneath would
     * double up - "what they understood they were meant to do" beside "what this is trying to
     * achieve" is one question asked twice.
     *
     * The other twenty had NO list at all until now, which meant first, middle and last were shaped
     * by whatever a model made of a session number in a sentence. See what-every-check-in-owes: a
     * spine every situation shares, plus the one or two things each situation actually asks for
     * that the spine does not.
     */
    const card = whichCard(scenario, brief);
    if (card) return owedFor(card);
    /*
     * A TEAM UPDATE OWES NOTHING BUT THE LEAD'S LINE. Read live, 22 Sep 2026: an update whose one
     * line was "What moved this week, and what is stuck" opened with "What did you understand these
     * updates are for?" - the spine's first slot, and exactly the setup question TEAM_UPDATES_PACK
     * forbids ("do not ask what success looks like, what they own, what was agreed"). The pack has
     * the whole shape: ask the line, ask once for a number or a date, close. No list, so nothing
     * here can hold the close for a slot the update never had.
     */
    if (scenario === 'TEAM_UPDATES') return null;
    return everythingOwedFor(scenario);
  }

  /**
   * WHICH OF THE THREE ROLES THIS PERSON IS ANSWERING AS.
   *
   * By answerability rather than rank. Whoever runs the check-in is the lead. Somebody whose role
   * says they run or represent a team answers for work other people did, which is what makes the
   * partner questions fair to put to them and the "what are you working on" ones not. Everybody
   * else answers for their own work, which is the common case and the safe default.
   */
  private roleOfTheReaderFor(
    ground: { initiatorId?: string | null } | null,
    checkIn: { participant?: { userId?: string | null; roleAsDescribed?: string | null; partyType?: string | null } | null } | null,
  ): Role {
    const p = checkIn?.participant;
    if (ground?.initiatorId && p?.userId && ground.initiatorId === p.userId) return 'lead';
    const role = (p?.roleAsDescribed ?? '').toLowerCase();
    if (/\b(lead|head of|manager|director|partner|agency|vendor|supplier|principal|chief)\b/.test(role)) return 'partner';
    return 'member';
  }

  /**
   * The reader, for the one part of the brief that is not a shared fact. Their participant row and
   * whether they run this check-in; both already on the objects in hand, so nothing is fetched.
   */
  private whoIsReadingIt(
    ground: { initiatorId?: string | null } | null,
    checkIn: { participantId?: string | null; participant?: { userId?: string | null } | null } | null,
  ) {
    return {
      participantId: checkIn?.participantId ?? null,
      isLead: !!ground?.initiatorId && !!checkIn?.participant?.userId && ground.initiatorId === checkIn.participant.userId,
    };
  }

  private briefFor(
    ground: {
      label: string | null; brief?: string | null;
      objectives: { name: string; target: number | null; ownerParticipantId?: string | null }[];
      whoSeesTargets?: 'THEIR_OWN' | 'EVERYBODY';
    } | null,
    /*
     * WHO IS READING, because a target with somebody's name on it is not a shared fact.
     *
     * Everything else in this brief is: the subject, what the lead wrote, a target belonging to the
     * whole check-in. A target belonging to one person is a different object, and ten of them on a
     * colleague's screen is a decision nobody made. See whose-number-is-whose-business.
     */
    reader?: { participantId: string | null; isLead: boolean },
    untold: AnUntoldGoalRow[] = [],
  ): { subject: string | null; says: string | null; objectives: { name: string; target: number | null; direction: 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO' | null }[]; alsoSay?: string | null } | null {
    if (!ground) return null;
    /*
     * A CHECK-IN THE ANCHOR LINK STARTED TELLS THE TEAM NOTHING OF WHAT THE LEAD SAID IN HER OWN CONVERSATION (decision 96, item 8).
     * What she is carrying and what she is seeing are hers alone, and what she needs the team to understand reaches them only once she
     * says so, which nothing records yet. So her brief and the aims her words made are not served to anybody who is not the lead: the
     * invitation has already said that she wants to hear their side. Her own reading of them is unchanged.
     */
    if (!reader?.isLead && aCheckInStartedFromTheAnchor(ground as any)) {
      return {
        subject: ground.label ?? null,
        /* Only what the product was told to tell them, never the brief and never her aims. */
        says: whatAParticipantIsToldAboutThis(null, [], { told: (ground as any).toldToParticipants ?? null, readerParticipantId: reader?.participantId ?? null, scenario: (ground as any).scenario ?? null }),
        objectives: [],
        alsoSay: null,
      };
    }
    const allowed = targetsFor(
      ground.objectives ?? [],
      reader?.participantId ?? null,
      ground.whoSeesTargets === 'EVERYBODY' ? 'everybody' : UNLESS_SOMEBODY_SAYS,
      { isLead: !!reader?.isLead },
    );
    /* AND NOT A GOAL THE LEAD HAS NOT TOLD THEM ABOUT (decision 56), the board's own wall. */
    const maySee = {
      ...allowed,
      shown: withoutWhatTheLeadHasNotToldThemAbout(allowed.shown as any[], untold, ((ground as any).participants ?? []) as any[], !!reader?.isLead).kept,
    };
    return {
      subject: ground.label ?? null,
      /*
       * AND WHAT IT IS ACTUALLY ABOUT, WHICH THIS WAS NOT SAYING.
       *
       * The subject is the check-in's LABEL, and on the picker path the label is the scenario -
       * "New hire". So a participant's first screen, under a heading reading "What this check-in is
       * about", said "New hire" and nothing else. Read on a real invitation: the lead had written
       * four sentences describing the situation, and the person being asked to account for it was
       * shown a category name.
       *
       * The brief is already a shared fact - the Context page publishes it to everybody on the
       * check-in, and the lead wrote it as the description of the work. The caution above is about
       * one participant's ACCOUNT reaching another, which this is not.
       */
      /* The lead reads their own brief. Anybody else reads the situation and the goals they may see,
         never the lead's instructions to the product. See what-a-participant-is-told-about-this. */
      says: reader?.isLead
        ? ground.brief?.trim() || null
        : whatAParticipantIsToldAboutThis(ground.brief, maySee.shown as any, {
          told: (ground as any).toldToParticipants ?? null, readerParticipantId: reader?.participantId ?? null, scenario: (ground as any).scenario ?? null,
          /* So a person's own aim is told as theirs, and a colleague's as the colleague's (decision 75, item 37). */
          ...this.whoSetWhatForThisReader(ground as any, reader?.participantId ?? null),
        }),
      /* Each as a sentence about whoever set it, and only the fields a reader is shown: never the row as stored. */
      objectives: this.theTargetsAsSentences(maySee.shown as any[], ground as any, reader?.participantId ?? null),
      alsoSay: maySee.alsoSay,
    };
  }

  /**
   * `alreadyWritten` is an opener composed for an earlier respondent on the same open link.
   *
   * An opener is written from the brief and the scenario and nothing else - somebody arriving
   * through a link has said nothing and the product knows nothing about them - so for a hundred
   * people it is a hundred identical sentences, each costing the person in front of it fourteen to
   * eighteen seconds. The first one pays; nobody after does. Never passed for a named participant,
   * whose opener may name them. See theOpenerForThisLink in the-open-link.service.
   */
  /** The opens still working, by check-in and by who is asking, so a second one is handed the first one's answer. */
  private readonly opensInFlight = new Map<string, Promise<Awaited<ReturnType<ConversationService['openOnce']>>>>();

  /**
   * ONE FIRST QUESTION PER SESSION, EVEN IF IT IS ASKED FOR TWICE AT ONCE.
   *
   * The first open of a new check-in takes a minute or more, because the brief is read before the
   * question is written. The stored turn that tells a later open "already done" does not exist until
   * the first open has finished, so a second tab, or "Try again" after the screen's wait, made a second
   * model call and a second, different first question. A second open for the same person now waits for
   * the first and returns the same answer. It is keyed by who is asking as well, so waiting is never a
   * way past the check on who may open this session (openTheDoor). The question is still written by the
   * model; this only decides how many times it is asked.
   */
  async open(checkInId: string, requestingUserId: WhoIsAsking, alreadyWritten?: string | null) {
    const key = `${checkInId}:${typeof requestingUserId === 'string' ? requestingUserId : `participant:${requestingUserId.theParticipant}`}`;
    const running = this.opensInFlight.get(key);
    if (running) return running;
    const started = this.openOnce(checkInId, requestingUserId, alreadyWritten);
    this.opensInFlight.set(key, started);
    const done = () => { if (this.opensInFlight.get(key) === started) this.opensInFlight.delete(key); };
    started.then(done, done);
    return started;
  }

  private async openOnce(checkInId: string, requestingUserId: WhoIsAsking, alreadyWritten?: string | null) {
    const checkIn = await this.openTheDoor(checkInId, requestingUserId);

    /**
     * THE BRIEF, FETCHED HERE BECAUSE THIS QUERY WAS ALREADY RUNNING.
     *
     * A participant arrives by invite link and is asked to be honest and specific about work,
     * having been shown nothing: not what the check-in is about, not what they are being read
     * against. Then the report is built on that answer. `an-objective-nobody-has-seen.spec.ts`
     * already names the problem - "reading a person against a target they have never seen is the
     * definition of an unfair review, and the fact that the product would be doing it silently
     * makes it worse rather than better" - and the rule has a `seenBySubject` state precisely so
     * that showing it is what makes reading against it fair. Nothing was showing it.
     */
    const ground = await this.prisma.ground.findUnique({
      where: { id: checkIn.groundId },
      select: {
        status: true,
        organizationId: true,
        ...WHAT_THE_BRIEF_IS_READ_FROM,
      },
    });
    // ISSUE 7: use a single findFirst on the AI turn as the idempotency guard.
    // This collapses the count + separate findFirst into one query and closes the
    // TOCTOU window: if any AI turn exists (written by a concurrent open()), return
    // it immediately without calling Gemini again.
    const existingAiTurn = await this.prisma.conversationTurn.findFirst({
      where: { checkInId: checkIn.id, role: TurnRole.AI },
      orderBy: { createdAt: 'asc' },
    });
    if (existingAiTurn) {
      return { reply: existingAiTurn.content, groundId: checkIn.groundId, brief: this.briefFor(ground, this.whoIsReadingIt(ground as any, checkIn as any), await this.untoldGoalsOn(checkIn.groundId)), mayCompleteAfter: theFloorFor(!!(checkIn as any).isSelfCorrection, (ground as any).scenario ?? null) };
    }
    /*
     * THE BRIEF IS READ WHILE EVERYTHING ELSE IS GATHERED, NOT AFTER IT (request 44). The opener's
     * prompt needs the subjects the brief asks about and the frame of a complete answer. On the first
     * open of a check-in neither is kept yet, and each is a model call; they were asked for one after
     * the other, at the end of a long run of reads, before the opener could be asked for at all. Both
     * start here, side by side, and the prompt below picks up the same reads. Once kept on the
     * ground, each is one quick read and this costs nothing.
     */
    if (!alreadyWritten && checkIn.groundId) {
      this.theSubjectsToCover(checkIn.groundId).catch(() => undefined);
      this.theFrameFor(checkIn.groundId).catch(() => undefined);
    }
    await this.provisionalFunctionFromTheStatedRole(checkIn.participant as any).catch((err) =>
      this.logger.warn(`Provisional function read failed for participant ${checkIn.participantId}: ${err.message}`),
    );

    // Session balance gate: consume one session from the ground's balance once
    // per session round (sessionNumber). If any other participant has already
    // opened a check-in for the same session number, that round was already paid
    // for - allow without decrementing. Re-opens of the same check-in are already
    // caught above by the existingAiTurn guard.
    //
    // Self-correction is NEVER gated on payment. A participant fixing an error in
    // their OWN prior record must always be able to, even on a ground with zero
    // balance - charging $5 to correct your own words is exactly the "if
    // participant sessions are ever gated, trust collapses" failure this module
    // warns about. Correction sessions carry a fresh sessionNumber, so without
    // this exemption they would be billed as brand-new sessions and dead-end at
    // the paywall.
    if (checkIn.groundId && !checkIn.isSelfCorrection) {
      // Determine whether another participant already opened this session round.
      const roundAlreadyStarted = await this.prisma.conversationTurn.findFirst({
        where: {
          checkIn: {
            groundId: checkIn.groundId,
            sessionNumber: checkIn.sessionNumber,
            id: { not: checkIn.id },
          },
          role: TurnRole.AI,
        },
        select: { id: true },
      });

      if (!roundAlreadyStarted) {
        // First participant to open this round - consume one session from the balance.
        const gate = await this.billing.canStartSession(checkIn.groundId);
        if (!gate.allowed) {
          // Nudge the ground's initiator so they know someone is blocked.
          this.prisma.ground.findUnique({
            where: { id: checkIn.groundId },
            select: {
              label: true,
              id: true,
              participants: {
                where: { partyType: 'INITIATOR' },
                select: { email: true },
                take: 1,
              },
            },
          }).then(g => {
            if (!g) return;
            const initiatorEmail = g.participants[0]?.email;
            if (!initiatorEmail) return;
            const participantEmail = checkIn.participant.email;
            const groundUrl = `${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${g.id}`;
            this.email.sendParticipantBlockedNudge(initiatorEmail, g.label, participantEmail, groundUrl).catch(() => undefined);
          }).catch(() => undefined);

          /**
           * AND THE PERSON WHO CAN ACTUALLY PAY IS TOLD TO PAY.
           *
           * The nudge above goes to the ground's INITIATOR and says somebody is
           * blocked. sendPaymentRequestEmail goes to the org ADMIN and says what to
           * do about it - and it existed, tested, with no caller anywhere, which is
           * its own documented purpose going unserved: "sent to the org admin when a
           * ground's first free session is complete and the next requires payment".
           *
           * The initiator is often not the admin. Somebody was being stopped
           * mid-check-in while the only person who could clear it heard nothing.
           */
          this.tellAnAdminToAddACard(checkIn.groundId).catch(() => undefined);
          throw new ForbiddenException({ message: gate.reason, freeExtensionAvailable: gate.freeExtensionAvailable ?? false });
        }
        // Metering runs ONLY for metered grounds. gate.sessionsBalance === -1
        // signals unlimited (free-tier or active subscription) - those grounds are
        // never decremented and never hit the balance throw below. This is the
        // second gate: without this guard, a free-tier or subscribed ground whose
        // balance had already reached 0 (e.g. a returning session 2) would throw
        // the over-limit message here even though canStartSession allowed it.
        if (gate.sessionsBalance !== -1) {
          // Atomic check-and-decrement: only succeeds when balance is still > 0,
          // preventing two concurrent requests from both passing canStartSession and
          // both decrementing into negative territory.
          const decremented = await this.prisma.ground.updateMany({
            where: { id: checkIn.groundId, sessionsBalance: { gt: 0 } },
            data: { sessionsBalance: { decrement: 1 } },
          });
          if (decremented.count === 0) {
            /* Billing's own sentence, asked again now the race is lost (request 30a): "ten free
               check-ins" is untrue for an organisation with no free plan. */
            const again = await this.billing.canStartSession(checkIn.groundId).catch(() => null);
            throw new ForbiddenException({
              message: (again && !again.allowed && again.reason) || 'This check-in cannot start until your team adds more check-ins. Only an admin can do that, and your answers so far are kept.',
              freeExtensionAvailable: again?.freeExtensionAvailable ?? false,
            });
          }
          /**
           * "YOU ARE ON YOUR LAST SESSION" - AT THE MOMENT IT BECOMES TRUE.
           *
           * sendApproachingSessionLimit existed, was tested, and nothing called it:
           * a ground ran out of sessions and the first anybody knew was a refusal
           * mid-check-in, which is the worst possible moment to learn about billing.
           *
           * Fired on the TRANSITION rather than from a check or a cron, so it is
           * naturally once per crossing: the decrement above has just happened, and
           * a balance of exactly 1 means this session was the second to last.
           */
          this.warnIfNearlyOutOfSessions(checkIn.groundId).catch(() => undefined);

          // Increment the free-sessions counter so the per-org cap is enforced.
          const groundMeta = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { isFreeGround: true, organizationId: true } });
          if (groundMeta?.isFreeGround) {
            await this.prisma.organization.update({
              where: { id: groundMeta.organizationId },
              data: { freeSessionsUsed: { increment: 1 } },
            });
          }
        }
      }
    }

    // GW-41: stamp the engine_rules prompt version on the ground at first check-in
    // open time. Outcome data is attributed to the engine version active when the
    // conversation STARTED, not the one current at resolution time - without this
    // stamp, intelligence.service.ts recordOutcome() always writes null promptVersionId.
    // updateMany with promptVersionId: null guard makes this idempotent: the first
    // check-in to open wins; later openings on the same ground are no-ops.
    if (checkIn.sessionNumber === 1) {
      const engineVersion = await this.prompts.getActive('system');
      await this.prisma.ground.updateMany({
        where: { id: checkIn.groundId, promptVersionId: null },
        data: { promptVersionId: engineVersion.id },
      });
    }

    // The closing session must be NAMED in the opener - the system-context
    // instruction alone loses to the returning-user opener script, so the
    // begin turn (the most-attended instruction) carries it too.
    /*
     * AND A CORRECTION MUST BE NAMED HERE TOO, FOR THE REASON DIRECTLY ABOVE.
     *
     * The comment on the closing session says it exactly: the system-context instruction alone
     * loses to the returning-user opener script, so the begin turn - the most-attended instruction
     * - has to carry it. That lesson was learned for closing sessions and not applied to
     * corrections, and corrections lost the same way.
     *
     * Reported as "the chat about Zainab is meant to clarify things about session 1 but it is
     * acting like a new session". Removing the competing returning-session block was necessary and
     * was not enough: driven immediately afterwards, the opener was still
     * "In your first check-in you set the evidence baseline... what exists right now that counts
     * toward it?" - a progress question, on a session whose whole purpose is to change what is
     * already recorded.
     */
    const correctingSession = (checkIn as any).isSelfCorrection
      ? (checkIn as any).selfCorrectionTargetSession
      : null;
    /*
     * THE OPENER GETS ITS OWN LAST WORD. See the-first-thing-it-says-is-its-own-job: written from
     * the whole engine and one line of "they have arrived", twenty of twenty-two participant openers
     * explained what the check-in was for before asking anything.
     */
    /*
     * AND THE OPENER IS ROUTED HARDER THAN A TURN. See only-the-rules-this-turn-needs: most of the
     * engine is about a conversation already underway, and an opener is written before anybody has
     * spoken. With the whole thing behind it, a short instruction at the end was read and outweighed
     * - thirteen of twenty-two lead openers still explained what the check-in was for.
     */
    /*
     * COMPOSED ONLY WHERE IT IS GOING TO BE USED.
     *
     * A second full prompt was composed here on every opener and used for nothing but the length in
     * the log line below - and composing is no longer cheap: it waits for the last turn's note and
     * reads the brief's subjects. The comparison was interesting once; it is not worth seconds of
     * somebody's arrival.
     */
    const openerSystem = alreadyWritten
      ? ''
      : await (async () => {
        const composedOpener = await this.composeSystemPrompt(checkIn, undefined, { forTheOpener: true });
        const anchored = this.theAnchorWeekWords(checkIn.id);
        return `${[composedOpener, ...anchored.before].filter(Boolean).join('\n\n')}\n\n${THE_OPENER_IS_ONE_MESSAGE}${anchored.last ? `\n\n${anchored.last}` : ''}`;
      })();
    if (!alreadyWritten) this.logger.log(`Check-in ${checkIn.id}: opener prompt ${openerSystem.length} chars.`);
    /* The opener is saved through the same step as every turn, so it is read against its own prompt. */
    if (openerSystem) this.setThePromptForThisTurn(checkIn.id, openerSystem);

    const beginMessage = (checkIn as any).isFinal
      ? '<<BEGIN_CHECK_IN>> The person has just arrived for their CLOSING session. Open by telling them plainly, in your first sentence, that this is their closing check-in - the last word on their record, worth documenting thoroughly - and then continue per your runtime context.'
      : correctingSession != null
        ? `<<BEGIN_CHECK_IN>> The person pressed "correct it" on session ${correctingSession}. This is NOT a new session and NOT a progress check. Do not ask what has happened since, do not ask what exists now, and do not ask how anything is going. Open in one sentence by saying you are back on session ${correctingSession} and asking what they want to change or add - then let them tell you, and only then probe for specifics. Their original answers are not deleted or edited; this is recorded alongside them.`
        : '<<BEGIN_CHECK_IN>> The person has just arrived. Open the check-in now per your runtime context - deliver the moment opening; do not wait for them to speak first.';
    /*
     * THE FIRST QUESTION TO SOMEBODY WHO IS NOT THE LEAD, IN A STARTING SCENARIO, IS WRITTEN HERE.
     *
     * The prompt has two roles: initiator and participant. Every non-initiator got the participant
     * block, and in NEW_HIRE that block is the HIRE's question - "what do you think you were hired
     * to do". Walked as a real third party (the clinic the ward refers into) and the model, seeing
     * the person was plainly not the hire, improvised the initiator's framing instead: "in 90 days,
     * if she is succeeding, what will she be doing that you are doing now?" He does not do her job.
     *
     * Nothing on the participant row says whether they are the person this is about. So the
     * product asks, in its own words, before the model asks anything - the same move as the
     * session-date citation: the product writes the line, the model only takes it from there. The
     * answer is in the transcript, and the pack tells the model which block follows from it.
     */
    /*
     * `ground` is the row loaded above with `scenario` selected. The first version read
     * `checkIn.ground`, which `loadOwnedCheckIn` never includes, so the guard was always false and the
     * model wrote the opener - found by opening a real session and reading it. And a FIRST session
     * only: the answer is in session one's transcript, and asking again on session two puts a
     * question to somebody the record has already answered.
     */
    const startsSomething = STARTING_SCENARIOS.has(String(ground?.scenario ?? ''));
    const notTheLead = checkIn.participant.partyType !== PartyType.INITIATOR;
    const firstSession = checkIn.sessionNumber === 1;
    /* Unless their row already says which of the two they are - see theRosterAlreadySaysWhoTheyAre.
       IN THEIR OWN WORDS ONLY (request 36). The model is no longer handed the lead's sentence about
       an invited person, so a row that holds only that sentence says nothing the conversation can
       use: they are asked, the same as somebody with no role at all. */
    const theRosterIsSilent = !theRosterAlreadySaysWhoTheyAre(aRoleInTheirOwnWords(checkIn.participant as any));
    /* The team baseline opens with its own question about their work, never "are you the person this check-in is about": nothing here is about one person. */
    const theBaselineIsRunning = !!this.anchorWeekForThisTurn.get(checkIn.id)?.isTheBaseline;
    const reply = alreadyWritten
      ? alreadyWritten
      : startsSomething && notTheLead && firstSession && theRosterIsSilent && correctingSession == null && !(checkIn as any).isFinal && !theBaselineIsRunning
      ? WHO_ARE_YOU_IN_THIS
      : await this.anthropic.respond(openerSystem, [
          { role: 'user', content: beginMessage },
        ]);

    /*
     * AND THE OPENER IS HELD TO THE SAME BAR AS EVERY OTHER TURN, WHICH IT NEVER WAS.
     *
     * Every reply in `send` passes nine guards. The opener passed none: it went through `forHumans`
     * and straight to the screen. Swept across all twenty-two scenarios, two answers each: six
     * openers were over the length bar (61 to 92 words, against a limit of 60) and three asked
     * nothing at all, which leaves somebody looking at a paragraph with no question in it as the
     * first thing this product ever says to them.
     *
     * The three cheapest and most visible of the guards, one retry, and the second is kept only if
     * it is genuinely better - the same shape as the others. See theOpenerIsHeldToTheSameBar.
     */
    /* An opener written for an earlier respondent has already been through every guard below; it
       is not rewritten, and above all it is not rewritten DIFFERENTLY for each person. */
    /* The anchor's weekly opening never announces a new angle ("Today we are going to..."): see withoutAnAnnouncedAngle. */
    const theOpening = this.anchorWeekForThisTurn.get(checkIn.id) && !alreadyWritten ? withoutAnAnnouncedAngle(forHumans(reply)) : forHumans(reply);
    const held = alreadyWritten
      ? forHumans(reply)
      : await this.theOpenerIsHeldToTheSameBar(checkIn.id, openerSystem, beginMessage, theOpening);
    /* Before this person has typed a word in any session, nothing can be "you said". See the module. */
    const saidSoFar = await (this.prisma.conversationTurn?.count?.({ where: { role: TurnRole.PERSON, checkIn: { participantId: checkIn.participantId } } }) ?? Promise.resolve(1)).catch(() => 1);
    /* Named, because "the person who set this up" is a label and this is the first sentence
       somebody ever reads from this product. See the module. */
    const whoSetItUp = [
      (ground as any)?.initiator?.firstName,
      (ground as any)?.initiator?.lastName,
    ].filter(Boolean).join(' ').trim() || null;
    const quoted = nothingSaidYetCannotBeQuoted(held, saidSoFar, whoSetItUp);
    if (quoted.changed) this.logger.warn(`Check-in ${checkIn.id}: the opener quoted a person who has not spoken; rewritten.`);
    const opening = await this.theTurnAsItIsSaved(checkIn as any, quoted.text);

    // An opener never closes a session, but strip defensively so the marker can
    // never reach a person even if the model emits it in the wrong place.
    const aiTurn = await this.prisma.conversationTurn.create({
      data: {
        checkInId: checkIn.id, role: TurnRole.AI, content: opening,
        /* Stamped as it is written, so the two-party balance can be counted without ever reading
           one person's turns while answering another - see the-same-burden-on-both-sides.ts. */
        askedFor: stampWhatItAskedFor(opening),
          /* A turn that put a document's side to them is stamped with that line instead, so it is asked once. */
          ...await this.theDocumentQuestionItRaised(checkIn.participantId, opening).then((raised) => (raised ? { askedFor: raised } : {})),
      },
    });
    await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.IN_PROGRESS, startedAt: new Date() } });
    /* A session that opens after a document was attached opens with what we have from it. Once. */
    const contextAtTheTop = await this.theContextNotYetSaid(checkIn as any);
    /* Suggested answers under the opening question too. */
    const suggestedAnswers = await this.suggestedAnswersFor(aiTurn.id, aiTurn.content ?? '', null, checkIn.id);
    return { reply: contextAtTheTop ? `${contextAtTheTop}\n\n${aiTurn.content}` : aiTurn.content, theOpener: aiTurn.content, groundId: checkIn.groundId, brief: this.briefFor(ground, this.whoIsReadingIt(ground as any, checkIn as any), await this.untoldGoalsOn(checkIn.groundId)), mayCompleteAfter: theFloorFor(!!(checkIn as any).isSelfCorrection, (ground as any).scenario ?? null), ...(suggestedAnswers.length ? { suggestedAnswers } : {}), ...(this.anchorVersionForThisTurn.get(checkIn.id) ? { promptVersionId: this.anchorVersionForThisTurn.get(checkIn.id) } : {}) };
  }


  /**
   * "THE PERSON WHO SET THIS UP", "YOUR LEAD" AND "THE LEAD" BECOME THEIR NAME BEFORE A TURN IS SAVED.
   * See the-lead-has-a-name, which says which of them and why so narrowly.
   *
   * Looked up only when the phrase is there, so an ordinary turn costs nothing. Not for the lead's
   * own conversation: the phrase there would be about the reader, and the setup block already tells
   * the model to say "you".
   */
  private async theTurnAsItIsSaved(checkIn: { groundId?: string; participant?: { partyType?: PartyType } }, raw: string): Promise<string> {
    /*
     * AND A QUESTION THE LEAD CONFIRMED IS ASKED IN THE WORDS THEY CONFIRMED. Decision 34: the model
     * decides when to ask it, and where it asked it its own way the confirmed sentence is put back.
     * Here because every path a turn is saved by - the opener, the turn, the stream - comes through.
     */
    /*
     * AND NO RECORD IS PRESENTED THAT THE PERSON DOES NOT HOLD. "The record from our side shows that
     * weekly repayments have not been made" went to a borrower who had paid every week; no record was
     * ever given to the check-in. Every path saves through here, so it is cut here. See
     * a-record-claim-nobody-holds.
     */
    /* What this check-in has already said, so a fallback question is never one it has asked before. */
    const saidHereBefore: string[] = (checkIn as any)?.id
      ? await (this.prisma.conversationTurn?.findMany?.({ where: { checkInId: (checkIn as any).id, role: TurnRole.AI }, select: { content: true } }) ?? Promise.resolve([]))
        .then((rows: any[]) => (rows ?? []).map((r) => r.content ?? '')).catch(() => [] as string[])
      : [];
    /*
     * AND NONE OF OUR INSTRUCTIONS TO THE MODEL. Tobi read "Your last three turns all ended by asking them
     * something. This one should not. Say the single thing you noticed in what they just told you" (re-e):
     * the rhythm block, copied out. Cut here, where every reply is saved, against the whole prompt this
     * turn was given. See our-instructions-never-reach-them.
     */
    const thePrompt = (checkIn as any)?.id
      ? [this.promptForThisTurn.get((checkIn as any).id) ?? '', ...(this.retryInstructionsForThisTurn.get((checkIn as any).id) ?? [])].filter(Boolean).join('\n\n')
      : '';
    if (thePrompt) {
      const theirWordsHere: string[] = await (this.prisma.conversationTurn?.findMany?.({ where: { checkInId: (checkIn as any).id, role: TurnRole.PERSON }, select: { content: true } }) ?? Promise.resolve([]))
        .then((rows: any[]) => (rows ?? []).map((r) => r.content ?? '')).catch(() => [] as string[]);
      const sayable = [
        ...theirWordsHere,
        ...(this.theirEarlierWordsForThisTurn.get((checkIn as any).id) ?? []),
        ...(this.knownForThisTurn.get((checkIn as any).id) ?? []),
      ];
      const ours = withoutOurInstructions(raw, thePrompt, sayable, saidHereBefore);
      for (const c of ours.cut) this.logger.warn(`Check-in ${(checkIn as any).id}: cut a sentence that copied our instructions to the model: "${c.slice(0, 160)}"`);
      raw = ours.text;
    }
    const noRecordInvented = withoutARecordClaimNobodyHolds(raw, saidHereBefore);
    if (noRecordInvented.cut.length) this.logger.warn(`Check-in ${(checkIn as any).id}: cut ${noRecordInvented.cut.length} sentence(s) claiming what "the record" shows, which this person's record does not hold.`);
    raw = noRecordInvented.text;
    /*
     * AND NO THING THE LEAD LISTED IS SAID TO THEM AS THEIRS. Three borrowers were told they had the
     * wrong asset: the brief lists four, and the model took the first. See a-thing-the-lead-listed-is-not-theirs.
     */
    if ((checkIn as any)?.id && (checkIn as any)?.participant?.partyType !== PartyType.INITIATOR && checkIn?.groundId) {
      const setUp = await (this.prisma.ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { brief: true, toldToParticipants: true, scenario: true, peersVisibleToEachOther: true, initiatorId: true, initiator: { select: { firstName: true } }, leadContextNotes: { where: { audience: 'EVERYONE', participantId: null }, select: { text: true, audience: true, participantId: true } }, participants: { select: { id: true, userId: true, partyType: true, createdAt: true, managingOnly: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } } } as any }) ?? Promise.resolve(null)).catch(() => null);
      const brief: string | null = (setUp as any)?.brief ?? null;
      /* The brief and the lead's note to everyone: both the lead's setup, never quoted to a person (release, 5 October). */
      const theLeadsSetup = theLeadsSetupWords(setUp as any);
      if (brief) {
        const theirs = await (this.prisma.conversationTurn?.findMany?.({ where: { role: TurnRole.PERSON, checkIn: { participantId: (checkIn as any).participantId } }, select: { content: true } }) ?? Promise.resolve([]))
          .then((rows: any[]) => rows.map((r) => r.content ?? '')).catch(() => [] as string[]);
        const notTheirs = withoutAThingTheLeadListedAsTheirs(raw, brief, theirs, saidHereBefore);
        if (notTheirs.cut.length) this.logger.warn(`Check-in ${(checkIn as any).id}: cut ${notTheirs.cut.length} sentence(s) naming something from the lead's list as this person's.`);
        raw = notTheirs.text;
      }
      if (theLeadsSetup) {
        const theirs = await (this.prisma.conversationTurn?.findMany?.({ where: { role: TurnRole.PERSON, checkIn: { participantId: (checkIn as any).participantId } }, select: { content: true } }) ?? Promise.resolve([]))
          .then((rows: any[]) => rows.map((r) => r.content ?? '')).catch(() => [] as string[]);
        /*
         * AND THE LEAD'S BRIEF IS NEVER QUOTED TO THEM (decision 75, item 13). It guides the conversation as
         * context; a sentence that copies six or more words of it in a row is cut. Their own words, and what the
         * check-in tells them it is for (the lead confirmed it, and they already read it), are not a quote.
         * Not on a team update: there the lead's one line IS the question their team is sent, word for word.
         */
        const theLineIsTheQuestion = (setUp as any)?.scenario === 'TEAM_UPDATES';
        const notTheBrief = theLineIsTheQuestion
          ? { text: raw, cut: [] as string[] }
          : withoutTheLeadsBrief(raw, theLeadsSetup, [...theirs, (setUp as any)?.toldToParticipants ?? ''], saidHereBefore, (setUp as any)?.initiator?.firstName ?? null);
        for (const c of notTheBrief.cut) this.logger.warn(`Check-in ${(checkIn as any).id}: cut a sentence that quoted the lead's brief: "${c.slice(0, 160)}"`);
        raw = notTheBrief.text;
      }
      /*
       * AND, WHERE PEOPLE DO NOT SEE EACH OTHER, NOBODY ELSE'S CIRCUMSTANCES (decision 75, item 14). A sentence that
       * names another person in the check-in, other than the lead and anybody this person named themselves, is cut.
       * Not on an evaluation check-in, which has its own rule (decision 17).
       */
      if (setUp && !peersAreNamedOn(setUp as any, { participantId: (checkIn as any).participantId ?? null }) && !isEvaluationCheckIn((setUp as any).scenario)) {
        const theirOwn = await (this.prisma.conversationTurn?.findMany?.({ where: { role: TurnRole.PERSON, checkIn: { participantId: (checkIn as any).participantId } }, select: { content: true } }) ?? Promise.resolve([]))
          .then((rows: any[]) => rows.map((r) => r.content ?? '').join(' ')).catch(() => '');
        const others = (((setUp as any).participants ?? []) as any[])
          .filter((p) => p.id !== (checkIn as any).participantId && p.partyType !== PartyType.INITIATOR && p.userId !== (setUp as any).initiatorId)
          .flatMap((p) => [[p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim(), (p.user?.firstName ?? '').trim(), (p.nameGiven ?? '').trim()])
          .filter((n) => n.length > 2 && !new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(theirOwn));
        if (others.length) {
          const kept = withoutSentencesAboutOneOfThem(raw, { names: [...new Set(others)] }, { namesOnly: true });
          if (kept !== raw.trim()) this.logger.warn(`Check-in ${(checkIn as any).id}: cut a sentence naming somebody else in a check-in where people do not see each other.`);
          raw = kept || (aQuestionNotYetAsked(WHAT_ELSE, saidHereBefore) ?? WHAT_ELSE);
        }
      }
    }
    /*
     * AND NO COMMENT ON THEIR ANSWER. "That is noted, and it is the kind of thing that changes how you go
     * about the conversation" went out in seven scenarios, and "That is a very specific thing to not know"
     * to a new hire. There was never a net for it, only a paragraph in the prompt. See a-comment-is-not-a-question.
     */
    const noComment = withoutCommentsOnTheAnswer(raw);
    if (noComment.cut.length) this.logger.warn(`Check-in ${(checkIn as any).id}: cut ${noComment.cut.length} comment(s) on the answer.`);
    raw = noComment.text;
    const asConfirmed = (checkIn as any)?.id ? this.withTheLeadsQuestionsAsConfirmed((checkIn as any).id, raw) : { text: raw, confirmed: [] as string[] };
    /*
     * AND ONE QUESTION, ON EVERY PATH. The opener, the turn and the stream all save through here, so
     * this is the one place a second question cannot get past. The question the lead confirmed is the
     * one kept where there are two. See a-turn-asks-one-thing, which counts the shapes this repairs.
     */
    const oneThing = oneThingAsked(asConfirmed.text, asConfirmed.confirmed);
    if (oneThing.changed) this.logger.warn(`Check-in ${(checkIn as any).id}: a turn asked more than one question; ${oneThing.saidAsAnExample} said as an example, ${oneThing.leftOut} left out.`);
    /* AND ONE QUESTION IN A SENTENCE: two joined by "and" or "or" had one question mark and went through. */
    const oneInASentence = withOneQuestionPerSentence(oneThing.text, asConfirmed.confirmed);
    if (oneInASentence.cut.length) this.logger.warn(`Check-in ${(checkIn as any).id}: ${oneInASentence.cut.length} question(s) joined to another by "and" or "or" were left out.`);
    /* AND NO SENTENCE STARTS IN LOWER CASE. See a-sentence-starts-with-a-capital. */
    const capitalised = aSentenceStartsWithACapital(oneInASentence.text);
    if (capitalised.changed) this.logger.warn(`Check-in ${(checkIn as any).id}: a sentence started in lower case and was repaired before saving.`);
    const text = capitalised.text;
    if (!text || !mentionsTheLeadByALabel(text)) return text;
    if (checkIn?.participant?.partyType === PartyType.INITIATOR || !checkIn?.groundId) return text;
    const lead = await (this.prisma.ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { initiator: { select: { firstName: true, lastName: true } } } }) ?? Promise.resolve(null))
      .then((g: any) => theFirstNameFrom(g?.initiator?.firstName, g?.initiator?.lastName))
      .catch(() => null);
    const named = theLeadByName(text, lead);
    if (named.changed) this.logger.warn(`Check-in ${(checkIn as any).id}: a label for the lead was put back as the lead's name.`);
    return named.text;
  }

  /**
   * A DOCUMENT'S NUMBERS WAIT FOR A YES, AND THIS IS THE YES.
   *
   * Driven in the browser, 22 September 2026: a sheet of Q4 targets was attached mid-conversation,
   * nineteen rows appeared on the record, and the chat then asked "Is that right?" - about something
   * already done. Reading a document is not agreeing to it. A target is the yardstick somebody is
   * read against, so it waits, exactly as a paste does.
   *
   * WHOSE NUMBERS MAY BE WRITTEN is decided where the document was read (mayHoldANumber): their own
   * and the group's, or anybody's when the lead attached it. This only writes what is already on the
   * document, so that rule cannot be widened here.
   */
  private async whatTheDocumentWaitsFor(
    checkIn: { id: string; groundId: string; participantId: string },
    said: string | null | undefined,
  ): Promise<string | null> {
    const answer = (said ?? '').trim();
    /* A bare yes, or a "yes, but" with the new number in it. See yes-but-a-new-number. */
    if (!answer || !startsWithAYes(answer)) return null;
    try {
      const docs = await this.prisma.groundDocument.findMany({
        where: { groundId: checkIn.groundId, participantId: checkIn.participantId, NOT: { holds: { equals: null as any } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, fileName: true, holds: true },
      });
      for (const d of docs) {
        const holds = (d.holds ?? {}) as any;
        const waiting: { name: string; target: number; ownerParticipantId: string | null }[] = Array.isArray(holds.waiting) ? holds.waiting : [];
        if (holds.takenAt || !waiting.length) continue;
        const yes = whatTheYesSays(answer, waiting);
        if (yes.kind === 'not a yes') return null;
        if (yes.kind === 'yes, but which one') {
          return `Which number should be ${yes.target.toLocaleString('en-GB')}? Tell me what it is for, and I will write that one down with the new number and the rest as ${d.fileName} has them.`;
        }
        /* The person's number wins over the document's, on the one line their answer is about. */
        const corrected = yes.kind === 'yes, with a new number' ? waiting.map((w, i) => (i === yes.row ? { ...w, target: yes.target } : w)) : waiting;
        const said = await writeADocumentsNumbers(this.prisma, {
          groundId: checkIn.groundId,
          documentId: d.id,
          fileName: d.fileName,
          waiting: corrected,
          holds,
          setByParticipantId: checkIn.participantId,
          sortOrderBase: 200,
          addNote: false,
          reader: 'check-in',
          corrected: yes.kind === 'yes, with a new number'
            ? { name: waiting[yes.row].name, theirs: yes.target, documents: waiting[yes.row].target }
            : null,
        }).catch((err: any) => {
          this.logger.warn(`Could not take the numbers from ${d.fileName}: ${err?.message}`);
          return null;
        });
        if (said) this.logger.log(`Check-in ${checkIn.id}: took number(s) from ${d.fileName} on a yes.`);
        return said;
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`Could not take a document's numbers on ${checkIn.id}: ${err?.message}`);
      return null;
    }
  }

  /**
   * THE FIRST THING THIS PRODUCT EVER SAYS, CHECKED THE WAY EVERYTHING AFTER IT IS.
   *
   * `send` puts every reply through nine guards. `open` put its reply through none - `forHumans`
   * and out. Nobody had looked, because a fault in an opener reads as the scenario pack being
   * wordy rather than as a guard being absent.
   *
   * Swept live across all twenty-two scenarios: six openers over the length bar, three that asked
   * nothing. Three guards run here, chosen because they are the ones somebody would notice in the
   * first two seconds: too long, asks nothing, uses a word we do not use.
   *
   * ONE RETRY, AND ONLY IF IT IS BETTER. Same rule as everywhere else in this file: the second try
   * has to clear the bar the first one missed AND not fail the other two, or the first stands. An
   * opener is not worth losing over a guard.
   */
  private async theOpenerIsHeldToTheSameBar(
    checkInId: string,
    fullSystem: string,
    beginMessage: string,
    opener: string,
  ): Promise<string> {
    const faults = (text: string) => {
      const out: { why: string; instruction: string }[] = [];
      if (isAnEssay(text, false)) out.push({ why: `${howManyWords(text)} words`, instruction: SAY_IT_SHORTER });
      if (isADeadEnd(text, false)) out.push({ why: 'asks nothing', instruction: ASK_SOMETHING_OR_CLOSE });
      const banned = wordsWeDoNotUse(text, []);
      if (banned.length) out.push({ why: `words we do not use: ${banned.join(', ')}`, instruction: sayItWithoutThose(banned, text) });
      /* An opener is the one question asked completely cold, so it is the question that most needs
         to show what an answer looks like. Measured in the sweep: one scenario in twenty-two. */
      if (asksForAShapeWithoutShowingOne(text)) out.push({ why: 'asks for a shape without showing one', instruction: SHOW_WHAT_ONE_LOOKS_LIKE });
      return out;
    };

    const wrong = faults(opener);
    if (!wrong.length) return opener;
    this.logger.warn(`Check-in ${checkInId}: the opener ${wrong.map((w) => w.why).join(' and ')}; asking again.`);

    const second = await this.anthropic
      .respond(this.keptForTheLeakCheck(checkInId, `${fullSystem}\n\n${wrong.map((w) => w.instruction).join('\n\n')}`), [{ role: 'user', content: beginMessage }])
      .then((t) => forHumans(t))
      .catch(() => '');
    if (second.trim() && faults(second).length === 0) {
      this.logger.log(`Check-in ${checkInId}: the second opener cleared it.`);
      return second;
    }
    /*
     * AND IF NEITHER ATTEMPT ASKED ANYTHING, THE FIRST NO LONGER JUST STANDS.
     *
     * "The first stands" is right for a long opener or a banned word - a blemish on something
     * usable. It is wrong for one that asks nothing, because that ships a paragraph and a text box
     * as the first thing this product ever says to somebody. See
     * nobody-is-left-looking-at-a-paragraph.
     */
    const stillADeadEnd = faults(opener).some((w) => w.why === 'asks nothing')
      && faults(second || opener).some((w) => w.why === 'asks nothing');
    if (stillADeadEnd) {
      this.logger.warn(`Check-in ${checkInId}: neither opener asked anything; adding a question so nobody is stranded.`);
      return withAQuestion(opener, { opening: true });
    }
    this.logger.warn(`Check-in ${checkInId}: the second opener did not clear it either; the first stands.`);
    return opener;
  }

  /**
   * Send a person's message and get the AI's next turn. Scoped to this party -
   * the other party's turns are never loaded into context.
   */

  /**
   * A GROUND THAT HAS STOPPED ACCEPTING INPUT HAS STOPPED, INCLUDING MID-SESSION.
   *
   * `open()` has always checked this. `sendMessage()` never did - its whole body contained no
   * reference to the ground's status at all - so starting a check-in on a paused, closed or stalled
   * ground was refused while CONTINUING one already open was not. Every further turn persisted, was
   * extracted into the record, and reached synthesis and the shared report.
   *
   * That matters most for PAUSED, whose documented purpose is "temporarily paused (e.g. active legal
   * proceedings detected)". A hold that keeps accepting answers is not a hold. So this refuses rather
   * than accepting-and-flagging: once somebody has paused a ground for a legal reason, the cheaper
   * error is a participant losing an in-flight answer, not the record gaining one it should not have.
   *
   * The message names the state, because "no longer accepting check-ins" tells a person nothing about
   * whether to wait or give up.
   */
  private async assertGroundAcceptsInput(groundId: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { status: true },
    });
    /**
     * A ground this guard cannot read a status for is NOT treated as closed, and that is a
     * deliberate call rather than a loophole.
     *
     * `status` is non-nullable in the schema and THIS METHOD OWNS ITS OWN QUERY - it selects
     * `status` itself, so no caller can drop it. In production, therefore, a row that exists always
     * has one. An absent status can only mean a test double, and answering "this ground is closed"
     * to that is both untrue and misleading: it was the first version of this guard, and it failed
     * 46 prompt-assembly tests with a message about closure that had nothing to do with the defect
     * they were checking.
     *
     * Fail-closed still holds where it matters: any status this guard actually reads and does not
     * recognise as open is refused below.
     *
     * But a row that EXISTS with no status is not a test double, it is a fact about production this
     * guard would otherwise wave through in silence. So it is logged at error level, by ground. If
     * the line never fires, the reasoning above is confirmed; if it does, somebody has to look.
     */
    if (ground && !ground.status) {
      this.logger.error(`Ground ${groundId} exists but has no readable status; input accepted on the test-double rule above.`);
    }
    if (!ground?.status) return;
    const OPEN_STATUSES: GroundStatus[] = [
      GroundStatus.OPEN, GroundStatus.AWAITING_PARTIES, GroundStatus.ACTIVE, GroundStatus.REPORT_READY,
    ];
    if (OPEN_STATUSES.includes(ground.status)) return;
    if (ground.status === GroundStatus.PAUSED) {
      throw new BadRequestException('This check-in is on hold. Nothing can be added to it until it is resumed.');
    }
    throw new BadRequestException('This check-in is closed. Nothing further can be added to it.');
  }

  /**
   * EVERY DOOR INTO A SESSION ASKS THE SAME QUESTIONS, IN THE SAME ORDER.
   *
   * There were four ways into one conversation and the guards were added to one of them. `open()`
   * checked the ground's status with its own list and a generic message; `sendMessage()` gained
   * `assertGroundAcceptsInput` when a paused ground kept accepting answers; `sendMessageStream()` -
   * the route the client actually posts to - got neither for as long as the guard lived only on its
   * sibling, so the protected route was the one nobody called. `complete()` had its own copy.
   *
   * Now there is one door. Ownership first, so a stranger is refused for not owning the check-in
   * rather than told the ground's state; then whether this session may still be written to (the
   * loader refuses COMPLETED and DECLINED); then whether the ground accepts input at all. A route
   * that wants in calls this and nothing else. Metering is NOT here: it stays in `open()`, once per
   * round per ground, after the idempotency guard that makes a second open() free. Putting it in
   * the door would charge every message.
   */
  private async openTheDoor(checkInId: string, who: WhoIsAsking) {
    const checkIn = await this.loadOwnedOpenCheckIn(checkInId, who);
    await this.assertGroundAcceptsInput(checkIn.groundId);
    return checkIn;
  }

  /**
   * AND A MESSAGE NEEDS A SESSION THAT HAS BEEN OPENED.
   *
   * `open()` is the only door that meters. Both message routes used to accept a NOT_STARTED check-in
   * and flip it to IN_PROGRESS themselves, with no billing call - so a client that posted an answer
   * without ever calling open() ran a whole session free, and the only thing standing between a
   * customer and that was remembering to knock first. Every caller that exists knocks: the web
   * client, both WhatsApp paths and the public API all open before they send. Nothing legitimate
   * reaches this with NOT_STARTED, so it is refused rather than metered here - moving the meter into
   * the message path would mean a second copy of the billing rule, and the audit of this plan found
   * that the obvious way to do that charges per message.
   */
  private async aSessionUnderway(checkInId: string, who: WhoIsAsking) {
    const checkIn = await this.openTheDoor(checkInId, who);
    if (checkIn.status === CheckInStatus.NOT_STARTED) {
      throw new BadRequestException('This session has not been opened yet. Open it first, then answer.');
    }
    return checkIn;
  }

  /**
   * WHAT TO DO ABOUT A SECOND PRESS. See `a-second-press-is-not-a-second-answer.ts`.
   *
   * Both the plain and the streaming path ask this before writing anything, because a person who
   * presses twice does not know which of the two their client used.
   */
  private async theSameAnswerAgain(checkInId: string, message: string) {
    const recent = await this.prisma.conversationTurn.findMany({
      where: { checkInId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true, createdAt: true },
    });
    return isThisTheSameAnswerAgain(
      recent.map((t) => ({
        role: t.role === TurnRole.AI ? ('AI' as const) : ('PERSON' as const),
        content: t.content ?? '',
        createdAt: t.createdAt,
      })),
      message,
    );
  }

  /*
   * THE STREAMED ROUTE RUNS THIS SAME CODE. Hafsah, 28 September 2026: the streamed route must have
   * the same safety net as the plain route. It used to be a copy of this method, written before most
   * of the second tries below existed, and it had none of them: a banned word, a management word,
   * or two questions the save could not split went out on the stream as the model wrote them. Now
   * the stream is this method with one difference: the first draft is shown as it is written,
   * through `streamDraft`. Everything after the draft is the same code, and the final text, which is
   * what is saved, replaces the draft on the screen. See sendMessageStream.
   */
  async sendMessage(checkInId: string, requestingUserId: WhoIsAsking, message: string, how: { streamDraft?: (text: string) => void; alreadyJoined?: boolean; door?: Door } = {}): Promise<any> {
    const checkIn = await this.aSessionUnderway(checkInId, requestingUserId);
    /*
     * ONE ANSWER, ONE REPLY, HOWEVER MANY TIMES IT ARRIVES (request 48). The closing reply was read
     * twice. The second-press check below reads the turns already saved, but the person's turn is
     * saved only after the prompt is built, which takes seconds, so the same answer arriving twice
     * in that window (a retry after a dropped stream, two tabs) passed the check both times and
     * wrote two replies. While an answer is being worked on, the same answer from the same person
     * on the same check-in waits for it and gets the same reply, and nothing is written twice.
     */
    if (!how.alreadyJoined) {
      const key = `${checkInId}\u0000${JSON.stringify(requestingUserId)}\u0000${withoutBankDetails(message).trim()}`;
      const running = this.answersInFlight.get(key);
      if (running) {
        this.logger.log(`Check-in ${checkInId}: the same answer arrived while it was still being answered; it gets the same reply.`);
        return running;
      }
      const mine = this.sendMessage(checkInId, requestingUserId, message, { ...how, alreadyJoined: true })
        .finally(() => this.answersInFlight.delete(key));
      this.answersInFlight.set(key, mine);
      return mine;
    }

    /* Decision 35: a bank or card number typed here is hidden before it is kept or read by a model.
       Straight after the door, before anything reads the message. See documents/bank-details-are-never-kept. */
    message = withoutBankDetails(message);

    const again = await this.theSameAnswerAgain(checkIn.id, message);
    if (again.kind === 'the same answer, already answered') {
      /*
       * AND THE SAME FLAG IT WAS SENT WITH (request 47). This said `sessionComplete: false` under a
       * closing reply, so "Please finish my check-in" pressed again got the goodbye back and no end
       * card. A goodbye is only ever left on a turn that closed (see the goodbye rule below), so the
       * reply itself says whether it closed.
       */
      return { reply: again.reply, sessionComplete: endsOnTheClose(again.reply) || (hasAGoodbye(again.reply) && !stillAsking(again.reply)) };
    }
    if (again.kind === 'the same answer, still working') {
      return { reply: STILL_ON_YOUR_LAST_ANSWER, sessionComplete: false };
    }

    const personTurnCount = await this.prisma.conversationTurn.count({
      where: { checkInId: checkIn.id, role: TurnRole.PERSON },
    });
    if (personTurnCount >= A_CHECK_IN_TAKES_ANSWERS) {
      /*
       * A refusal that says their record is safe and what to do, rather than naming a limit nobody
       * mentioned. `canContinue: false` because this one really cannot be answered by typing more —
       * unlike the too-short refusal, where it can. See
       * there-is-a-ceiling-and-it-is-not-a-surprise.ts.
       */
      throw new BadRequestException({ message: theCeilingIsReached(), canFinish: true });
    }
    /* The word "finish" on its own, before there is enough to finish with, is a command and not an answer: one plain sentence, as on WhatsApp, and nothing is kept (user journeys, F-10). */
    if (isTheWordFinish(message)) {
      const scenarioHere = (await (this.prisma as any).ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { scenario: true } })?.catch?.(() => null))?.scenario ?? null;
      if (tooFewAnswersToFinish(personTurnCount, !!(checkIn as any).isSelfCorrection, scenarioHere)) return { reply: NOT_ENOUGH_YET_TO_FINISH_HERE, sessionComplete: false };
    }

    const composedBefore = await this.composeSystemPrompt(checkIn, message);
    const anchored = this.theAnchorWeekWords(checkIn.id);
    /* The team baseline learns how their work looks; it does not turn a period into a date or hold what they said against a number. */
    const inTheBaseline = !!this.anchorWeekForThisTurn.get(checkIn.id)?.isTheBaseline;
    const offerAnswered = await this.theirYesBecomesACommitment(checkIn);
    const whatTheyAgreedTo = offerAnswered.forTheModel;
    const composed = [composedBefore, ...anchored.before].filter(Boolean).join('\n\n');
    /*
     * AND WHAT TO DO ABOUT THE DEADLINE THEY JUST GAVE, WHICH NOTHING WAS DOING.
     *
     * "If i say end of year it should respond with december? what date?" A period gets its reading
     * said back and checked; something genuinely vague gets the open question. Appended to the
     * prompt for THIS reply rather than run as a retry afterwards: it is about what the person said,
     * not about what the product wrote. See a-period-is-not-a-day.
     */

    /*
     * AND WHETHER WHAT THEY JUST SAID MEETS THE OBJECTIVE ON THIS CHECK-IN.
     *
     * The gap was on the screen and nothing mentioned it: a check-in aiming at 10,000 units, a
     * person saying "my target is 150 bags", and the next question about the pricing sheet. It
     * compares their words against a number they have already been shown, never against anybody
     * else's account. See the-numbers-do-not-meet.
     */
    const theirNumbers = await (this.prisma.groundObjective?.findMany?.({
      where: { groundId: checkIn.groundId },
      select: { name: true, target: true, ownerParticipantId: true },
    }) ?? Promise.resolve([])).catch(() => [] as { name: string; target: number | null; ownerParticipantId: string | null }[]);
    const alreadyTheirs = theirNumbers
      .filter((o) => o.ownerParticipantId === checkIn.participantId && typeof o.target === 'number')
      .map((o) => o.target as number);
    /* ONCE PER GROUND. Bola was asked whether 8,000,000 was her own part of the 180,000,000 in session two and
       again in session three (run 8, 21 Sep 2026); she had answered the first time. Every check-in of hers counts. */
    const herOwnCheckIns = await this.prisma.checkIn
      .findMany({ where: { participantId: checkIn.participantId }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id))
      .catch(() => [checkIn.id]);
    const herEarlierAiTurns = await this.prisma.conversationTurn
      .findMany({ where: { checkInId: { in: herOwnCheckIns }, role: TurnRole.AI }, select: { content: true, checkInId: true } })
      .then((rows) => rows ?? [])
      .catch(() => [] as { content: string | null; checkInId?: string }[]);
    const earlierAiTurnsForTheGap = herEarlierAiTurns.map((r) => r.content ?? '');
    /*
     * WHAT THE PRODUCT ALREADY ASKED IN THIS CHECK-IN, so the date question is asked once. Patience
     * was asked "Year-end - so 31 December 2026?" seven times in a row, answering the same each
     * time, until the question limit ended her check-in. Only this check-in's own replies are read.
     */
    const repliesInThisCheckIn = herEarlierAiTurns.filter((r) => r.checkInId === checkIn.id).map((r) => r.content ?? '');
    const aboutTheirDeadline = whatToDoAboutTheirDeadline(message, new Date(), repliesInThisCheckIn);
    if (aboutTheirDeadline && !inTheBaseline) {
      this.logger.log(`Check-in ${checkIn.id}: they gave a time with no day; asking which.`);
    }
    const numbersGap = inTheBaseline ? null : theNumbersDoNotMeet(theirNumbers, message, alreadyTheirs, earlierAiTurnsForTheGap);
    if (numbersGap) {
      this.logger.log(`Check-in ${checkIn.id}: what they said does not meet the objective; asking which it is.`);
    }

    const fullSystem = [composed, inTheBaseline ? null : aboutTheirDeadline, numbersGap ? askWhichItIs(numbersGap) : null]
      .filter(Boolean)
      .join('\n\n')
      /* The anchor's short reminder, when it is in play, is read after everything else. */
      + (anchored.last ? `\n\n${anchored.last}` : '')
      /* What happened to the offer they just answered is about this turn alone, so it is the very last thing read. */
      + (whatTheyAgreedTo ? `\n\n${whatTheyAgreedTo}` : '');
    this.setThePromptForThisTurn(checkIn.id, fullSystem);

    // Persist the person's turn.
    /* Mark the turn when it answers an idea offer that is showing (the turn's own `stage`, which no person's turn used), so no later read has to guess from the words alone. The words are stored as typed. */
    const answersTheOfferShowing = anAnswerToTheIdeaOffer(message)
      && ((await (this.prisma as any).workItem?.count?.({ where: { groundId: checkIn.groundId, kind: 'idea-offered', ownerParticipantId: (checkIn as any).participantId ?? '' } })?.catch?.(() => 0)) ?? 0) > 0;
    const personTurn = await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.PERSON, content: message, ...(answersTheOfferShowing ? { stage: ANSWERED_THE_IDEA_OFFER } : {}) },
    });
    await this.keepTheDocumentDescription(checkIn.id, personTurn.id, message).catch((err) =>
      this.logger.warn(`Could not keep a document description on ${checkIn.id}: ${err?.message}`),
    );
    await this.noteIfTheySaidWhy(checkIn as any, message);

    // Rebuild history (this party only) and ask the engine for the next turn.
    // ISSUE 5: if the AI call fails, delete the orphan PERSON turn then re-throw.
    let reply: string;
    let hadCloseMarker = false;
    let aiTurn: { id: string; content: string };
    try {
      const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id }, orderBy: { createdAt: 'asc' } });
      const history: ChatTurn[] = turns.map((t) => ({ role: t.role === TurnRole.AI ? 'assistant' : 'user', content: t.content }));
      let rawReply = how.streamDraft
        ? await this.streamTheDraft(checkIn as any, fullSystem, history, turns, message, how.streamDraft)
        : await this.anthropic.respond(fullSystem, history);
      /*
       * AN EMPTY ANSWER IS ASKED FOR AGAIN BEFORE ANYBODY IS TOLD IT DID NOT COME OUT RIGHT. Grace,
       * the tractor owner, said "I will buy another tractor. The demand is there." and was told "That
       * did not come out right. Say that again" - nothing was wrong with what she said; the reply
       * came through empty (rerun, 20 Sep 2026). One more call before that line ships.
       */
      if (!forHumans(rawReply).trim()) {
        this.logger.warn(`Check-in ${checkIn.id}: the model returned nothing; asking once more.`);
        rawReply = await this.anthropic.respond(fullSystem, history).catch(() => rawReply);
      }
      // Strip the close marker before it is stored or shown - it is machinery.
      /**
       * Through the shared boundary now, not just the marker strip. This path removed the close
       * marker and left markdown and curly punctuation alone, so `**Outreach:**` reached the
       * authenticated check-in exactly as it reached the entry chat - it simply was not the screen
       * that got photographed. `hadMarker` is still needed, so it is read separately.
       */
      /*
       * QUOTATION MARKS ARE A CLAIM ABOUT WHOSE WORDS THESE ARE.
       *
       * Seen live: this person wrote "Sam is waiting on me and I know it." and the reply quoted her
       * back with "iss". One letter, and it is the promise the whole product rests on. The truth is
       * right here in `turns`, so a quoted phrase either appears in what she typed or it does not.
       * An unmatched one loses its quotation marks and stays as reported speech - the sentence
       * around it is nearly always right, and only the claim that these were her words is wrong.
       */
      const theirWords = turns.filter((t) => t.role !== TurnRole.AI).map((t) => t.content);
      const honest = withoutQuotesTheyDidNotSay(forHumans(rawReply), theirWords);
      const misquoted = unmatchedQuotes(forHumans(rawReply), theirWords);
      if (misquoted.length) {
        /*
         * THE COUNT, NOT THE WORDS. This logged up to 120 characters of the phrase, which put a
         * fragment of somebody's account of their work into the application log — a place staff
         * can read and the product promises they cannot. The log exists to make a RATE knowable,
         * and a rate does not need the sentence. The length is kept because a two-word misquote
         * and a two-line one are different problems.
         */
        this.logger.warn(
          `Check-in ${checkIn.id}: reply quoted ${misquoted.length} phrase(s) this person did not write. ` +
            `Marks removed. Longest was ${Math.max(...misquoted.map((q) => q.length))} characters.`,
        );
      }
      const stripped = { text: honest, hadMarker: textHadCloseMarker(rawReply) };
      /**
       * W2. THE NAME GOES BACK BEFORE THE SENTENCE IS STORED OR SHOWN.
       *
       * She typed "microchipshit" and the engine wrote "Microchip Solutions",
       * then put it on her record. This product's whole claim is that it holds
       * what people said, so the restore happens here - between the model and
       * the database - rather than as a flag somebody reads afterwards, by which
       * time she has already read a company name she never typed.
       *
       * It only ever puts back a word SHE typed. Where nothing of hers matches,
       * the reply is left exactly as written, because a guard that picks its own
       * replacement is committing the fault it exists to stop.
       */
      const personWords = turns
        .filter((t) => t.role === TurnRole.PERSON)
        .map((t) => t.content ?? '')
        .concat(message);
      /*
       * THE SAME RULE AS THE STREAM. Nothing invented reaches a person on either path, and the
       * difference between them is only WHEN it can be caught - here the whole reply is in hand, so
       * the screen runs once over all of it rather than sentence by sentence.
       */
      /* Who is reading, so their own name cannot come back at them in the third person. Their
         first name is on the row this method already loaded. */
      /* The first name that is not a title: "Dr" is nobody's first name. See a-title-is-not-a-first-name. */
      const readerName = theFirstNameFrom((checkIn as any).participant?.user?.firstName, (checkIn as any).participant?.user?.lastName);
      const known = personWords.concat(this.knownForThisTurn.get(checkIn.id) ?? []);
      this.knownForThisTurn.delete(checkIn.id);
      const conversationSoFar = turns.map((t) => t.content ?? '');
      let screened = screen(stripped.text, known, readerName, conversationSoFar);
      /*
       * IT IS WRITTEN DOWN, NOT ASKED AGAIN. See DELETES_WHAT_IT_FINDS in the gate for the whole
       * argument. Measured live: four of these fired in one conversation and all four logged "the
       * second try was no better; the first stands" - a model call of latency, on the turn a person
       * is waiting for, buying nothing. The detection stays, because the count is what tells us
       * whether any of this is worth having; the second call goes.
       */
      for (const h of screened.hits) this.logger.warn(hitLogLine(checkIn.id, h, 'noted, not removed'));
      /* Counting whether the 16,000 characters of pattern library are reaching the words at all.
         See whether-the-pattern-library-is-doing-anything - it changes nothing. */
      const reachedAPattern = thePatternLine(checkIn.id, screened.text);
      if (reachedAPattern) this.logger.log(reachedAPattern);
      if (!screened.text) {
        for (const h of screened.hits) this.logger.warn(hitLogLine(checkIn.id, h, 'whole reply, asked again'));
      }

      /*
       * A SENTENCE WITH A WORD MISSING IS ASKED FOR AGAIN. "every we discuss is to help you build a
       * clear, honest record" reached a real transcript and was saved. One retry, the same shape as
       * the invention gate's; if the second try is broken too the first stands, because a reply
       * that reads oddly is better than no reply at all. See a-sentence-with-a-word-missing.ts.
       */
      if (screened.text && readsAsBroken(screened.text)) {
        this.logger.warn(`Check-in ${checkIn.id}: a sentence read as broken.`);
      }
      /*
       * AND A GUESS IS NOT ALLOWED TO HARDEN INTO A FACT ON THE WAY OUT.
       *
       * Same shape as the broken-sentence gate above, and the same second chance: read the reply
       * against what the person actually said, and where it has taken the hedge off a number they
       * hedged, ask for the turn again. See a-hedge-is-not-a-fact.ts for the live turn this was
       * written from - "about a third of the way there I would say" came back as "You're a third of
       * the way there", and that is what a lead then reads about somebody.
       *
       * If the second try hardens it too, the first stands and a warning is logged: a reply that
       * overstates is still better than no reply, and a loop here would strand the person.
       */
      /* The turn this reply is answering, not the whole conversation: a hedge from three turns ago
         does not make a number they have since counted into a guess. */
      const theirLastTurn = theirWords[theirWords.length - 1] ?? '';
      const hardened = screened.text ? hardenedAGuess(theirLastTurn, screened.text) : null;
      if (hardened) {
        this.logger.warn(`Check-in ${checkIn.id}: the reply stated "${hardened}" as fact.`);
      }

      /*
       * AND A REPLY THAT ASKS NOTHING AND DOES NOT CLOSE LEAVES SOMEBODY HOLDING IT.
       *
       * Written down like the two above rather than asked again. This is the one of the four with
       * the best case for a retry - a reply with no question in it really does strand somebody -
       * so if the log says it happens, it comes back as a retry aimed with evidence.
       */
      /* `textHadCloseMarker`, not the local flag of the same name: that one is set further down,
         after this runs. The alias exists for exactly this collision. */
      const closingNow = textHadCloseMarker(rawReply);
      if (isADeadEnd(screened.text, closingNow)) {
        /*
         * IT USED TO STOP AT THE WARNING, and the comment above said what should happen next: a
         * reply with no question really does strand somebody, so if the log says it happens it
         * comes back as a retry. The log said it happens - a live open-link conversation, five
         * answers in, 23 September 2026 - so here is the retry, in the same shape as the four
         * below it: ask again with one instruction, keep the second only if it is better.
         */
        /*
         * NO SECOND MODEL CALL. A retry here was deliberately removed once before, for latency on
         * the turn somebody is actually waiting for - see a-reply-that-asks-nothing-is-a-dead-end,
         * which pins that decision. The log was left to say whether it mattered.
         *
         * It says it does: caught live on an open-link conversation five answers in, 23 September
         * 2026. But the cure it was pinned against was a second call, and the person staring at a
         * dead end right now is the one who would pay for it. One plain question, added to what the
         * model did write, strands nobody and costs nothing. See nobody-is-left-looking-at-a-
         * paragraph.
         */
        this.logger.warn(`Check-in ${checkIn.id}: a reply asked nothing and did not close; adding a question.`);
        screened.text = withAQuestion(screened.text, { closing: closingNow, asked: turns.filter((t) => t.role === TurnRole.AI).map((t) => t.content ?? '') });
      }

      /*
       * AND NO REPLY IS EVER THE PREVIOUS REPLY, WORD FOR WORD.
       *
       * She read "That goes on this record as you put it." twice in a row from two different code
       * paths, and a page that says the identical sentence twice is indistinguishable from one that
       * has stopped working. The filler itself is gone (see the-same-sentence-five-times); this is
       * the general case, because any guard that collapses a reply can collide with the last one.
       */
      const askedBefore = turns.filter((t) => t.role === TurnRole.AI);
      const lastAi = askedBefore.length ? (askedBefore[askedBefore.length - 1].content ?? null) : null;
      const notRepeated = notTheSameAsLastTime(screened.text, lastAi, askedBefore.length);
      if (notRepeated !== screened.text) {
        this.logger.warn(`Check-in ${checkIn.id}: a reply repeated the previous one word for word; replaced.`);
        screened.text = notRepeated;
      }

      /*
       * AND IF THEY JUST SAID THE QUESTIONS ARE WRONG, DO NOT ASK THE SAME ONE AGAIN.
       *
       * Fourth of the retries, and the same shape as the three above: spot it, ask again with one
       * instruction, keep the second only if it is better. It runs last because it reads the final
       * text, after the other three have had their say.
       *
       * The prompt was changed too, and had to be - it literally said "do not proceed until the gap
       * is addressed". But the failure IS an instruction being followed, so a second instruction is
       * not the fix on its own. This checks shape: they objected to the asking, and the reply is
       * about the same thing as the question they objected to. See asked-twice-and-told-no-twice.
       */
      /*
       * ASKED TWICE ALREADY, AND NOBODY HAD TO OBJECT. The guard below needs somebody to say the
       * questions are wrong, and most people never do: they answer something adjacent and take the
       * same question again. Seen in a first setup conversation, three turns running.
       */
      const earlierAsks = turns.filter((t) => t.role === TurnRole.AI).map((t) => t.content ?? '');
      if (alreadyAskedTwice(screened.text, earlierAsks)) {
        this.logger.warn(`Check-in ${checkIn.id}: the same question a third time; asking again.`);
        const moved = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${ASKED_IT_TWICE_ALREADY}`), history)
          .catch(() => '');
        const second = moved.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(moved), theirWords), known, readerName, conversationSoFar)
          : null;
        if (second?.text && !second.hits.length && !alreadyAskedTwice(second.text, earlierAsks)) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try moved on.`);
        } else {
          /*
           * THE FOURTH ASK DOES NOT SHIP. Keeping the first is the fallback everywhere else here,
           * and everywhere else it costs a clumsy sentence. Here it costs the person the same
           * question for the fourth time, which is the fault. The question comes out and whatever
           * else the reply said stands. See withoutTheQuestionAskedAgain.
           */
          const withoutIt = withoutTheQuestionAskedAgain(screened.text, earlierAsks);
          /* A fragment left behind counts as nothing else in it. See a-cut-never-leaves-a-fragment. */
          if (withoutIt.trim() && withoutIt !== screened.text && !aCutThatLeavesAFragment(screened.text, withoutIt)) {
            screened = { ...screened, text: withoutIt };
            this.logger.warn(`Check-in ${checkIn.id}: the second try asked it again; the question was taken out.`);
          } else {
            /* Nothing else in it, so the product records the absence and moves on itself. See a-refusal-is-an-answer. */
            const how = await this.howToMoveOn(checkIn.id, earlierAsks[earlierAsks.length - 1] ?? '');
            /* Asked three times is not declined: they answered, just not with what the model wanted. "Then it
               goes on this record as not given: what has moved since last time" went to Bola after she had
               said what moved (run 8, 21 Sep 2026). The answer stands as given; only a refusal is an absence. */
            screened = { ...screened, text: recordAndMoveOn(null, how), hits: [] };
            this.logger.warn(`Check-in ${checkIn.id}: the second try asked it again and there was nothing else in it; recorded the absence and moved on to ${JSON.stringify(how.question ?? how.owed ?? 'nothing')}.`);
          }
        }
      }

      /*
       * ASKED AGAIN AFTER A REAL ANSWER. The two guards above catch a third ask and a refusal. Run 10 (21
       * Sep 2026): "repeated question" 18 times among participants, most of them a second ask about a
       * thing the person had answered. The coverage read knows which owed things this session has
       * answered, and what was said; a reply that asks about one of them is told so once, and if it
       * asks again the question comes out. See what-this-session-has-covered.
       */
      if (earlierAsks.length) {
        const answeredHere = await this.whatThisSessionHasAnswered(checkIn.id).catch(() => [] as { thing: AThingToCover; answer: string }[]);
        const askedAgain = answeredHere.find((a) => askedAbout(a.thing, screened.text) && /\?/.test(screened.text));
        if (askedAgain) {
          this.logger.warn(`Check-in ${checkIn.id}: asked again about ${JSON.stringify(askedAgain.thing.what)} after it was answered; asking for another turn.`);
          const moved = await this.anthropic
            .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${theyAlreadyAnsweredThat(askedAgain.thing.what, askedAgain.answer)}`), history)
            .catch(() => '');
          const second = moved.trim()
            ? screen(withoutQuotesTheyDidNotSay(forHumans(moved), theirWords), known, readerName, conversationSoFar)
            : null;
          if (second?.text && !second.hits.length && !askedAbout(askedAgain.thing, second.text)) {
            screened = second;
          } else {
            const withoutIt = withoutTheQuestionAskedAgain(screened.text, [askedAgain.thing.what]);
            if (withoutIt.trim() && withoutIt !== screened.text && !aCutThatLeavesAFragment(screened.text, withoutIt)) {
              screened = { ...screened, text: withoutIt };
              this.logger.warn(`Check-in ${checkIn.id}: the second try asked it again; the question came out.`);
            }
          }
        }
      }

      /*
       * AND THE SAME QUESTION STRAIGHT BACK, AFTER A REAL ANSWER TO IT, whether or not the thing was on
       * an owed list. The guard above knows the owed things; this one knows the last ask. "What are you
       * doing to keep them healthy" - "Vaccinating them" - "what are you doing to keep your 260 hens
       * healthy" (run 11). Once more with the answer named; if it asks again, the question comes out.
       * See asksItAgainAfterTheAnswer.
       *
       * AND ANY EARLIER QUESTION THEY ANSWERED, word for word. Hana was asked "What just happened with
       * Meridian, as you understand it?" again two turns after she answered it (run 9, shock). See
       * anAnsweredQuestionAskedAgain.
       */
      {
        const aRealAnswer = (said: string) => !theyDeclined(said) && !theyPushedBackOnTheQuestions(said) && (said ?? '').trim().length >= 3;
        const soFar = turns.map((t) => ({ role: t.role === TurnRole.AI ? 'AI' as const : 'PERSON' as const, content: t.content ?? '' }));
        const again = anAnsweredQuestionAskedAgain(soFar, screened.text, aRealAnswer);
        if (again) {
          const lastAskHere = again.ask;
          const askedSentence = lastAskHere.split(/(?<=[.!?])\s+/).find((x) => /\?\s*$/.test(x)) ?? lastAskHere;
          this.logger.warn(`Check-in ${checkIn.id}: asked a question again after it was answered; asking for another turn.`);
          const moved = await this.anthropic
            .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${theyAlreadyAnsweredThat(`this - ${JSON.stringify(askedSentence.slice(0, 160))}`, again.answer)}`), history)
            .catch(() => '');
          const second = moved.trim()
            ? screen(withoutQuotesTheyDidNotSay(forHumans(moved), theirWords), known, readerName, conversationSoFar)
            : null;
          if (second?.text && !second.hits.length && !anAnsweredQuestionAskedAgain(soFar, second.text, aRealAnswer)) {
            screened = second;
          } else {
            const withoutIt = withoutTheQuestionAskedAgain(screened.text, [lastAskHere]);
            if (withoutIt.trim() && withoutIt !== screened.text && !aCutThatLeavesAFragment(screened.text, withoutIt)) {
              screened = { ...screened, text: withoutIt };
              this.logger.warn(`Check-in ${checkIn.id}: the second try asked it again; the question came out.`);
            }
          }
        }
      }

      /*
       * AND IT DOES NOT DECIDE WHAT KIND OF PROBLEM SOMEBODY ELSE'S BEHAVIOUR IS.
       *
       * Read off a real check-in: "You've raised this with Marketing twice, and nothing has changed.
       * That stops being a communication problem somewhere around the second time." Nobody in
       * Marketing is in that conversation, they cannot answer it, and they will read the board it
       * feeds. The prompt carries three and a half thousand characters on exactly this and it did
       * not hold. See a-verdict-is-not-a-question.
       */
      if (isAVerdictAboutSomebodyElse(message, screened.text)) {
        this.logger.warn(`Check-in ${checkIn.id}: a verdict about somebody not in the room; asking again.`);
        const hers = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${HERS_TO_DRAW}`), history)
          .catch(() => '');
        const second = hers.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(hers), theirWords), known, readerName, conversationSoFar)
          : null;
        if (second?.text && !second.hits.length && !isAVerdictAboutSomebodyElse(message, second.text)) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try left the conclusion to them.`);
        } else {
          this.logger.warn(`Check-in ${checkIn.id}: the second try reached a verdict too; the first stands.`);
        }
      }

      /*
       * DECISION 56, ITEM 2, SECOND LAYER. `composeSystemPrompt` already gives the model only the
       * area of a goal the lead has not told this person about - no number, no date - and tells it
       * never to say a goal has been set. This is the check: a reply is read for the number that
       * goal is measured by, or for saying outright that a goal, target or expectation exists, and
       * if either slipped through, the model is asked again once. See
       * an-untold-goals-number-is-not-said.ts.
       */
      const untoldGoalsHere: AnUntoldGoal[] = await (this.prisma.personObjective?.findMany?.({
        where: { groundId: checkIn.groundId, participantId: checkIn.participantId, awareness: 'NOT_TOLD' },
        select: { text: true, target: true, authoredBy: true, awareness: true },
      }) ?? Promise.resolve([] as any[]))
        .catch(() => [] as any[])
        .then((rows: any[]) => rows.filter(notToldYet).map((o) => ({ text: o.text as string, target: o.target ?? null })));
      if (untoldGoalsHere.length && saysWhatAnUntoldGoalWithholds(screened.text, untoldGoalsHere)) {
        this.logger.warn(`Check-in ${checkIn.id}: a reply named a number or a goal the lead has not told them about; asking again.`);
        const withheld = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${IT_NAMED_THE_UNTOLD_NUMBER}`), history)
          .catch(() => '');
        const second = withheld.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(withheld), theirWords), known, readerName, conversationSoFar)
          : null;
        if (second?.text && !second.hits.length && !saysWhatAnUntoldGoalWithholds(second.text, untoldGoalsHere)) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try withheld it.`);
        } else {
          this.logger.warn(`Check-in ${checkIn.id}: the second try named it too; the first stands.`);
        }
      }

      /*
       * AND A DECLINE IS AN ANSWER. "I don't focus on a weekly number" was followed by a question about
       * the weekly number; "we don't share that" by the same ask reworded (adversarial run 2, 20 Sep
       * 2026, the judge's "badgering", ten times). Same guard as the pushback, same retry, different
       * instruction: nobody objected to the questions, they answered one with no.
       */
      const declined = !theyPushedBackOnTheQuestions(message) && theyDeclined(message);
      if (theyPushedBackOnTheQuestions(message) || declined) {
        const lastAsk = [...turns].reverse().find((t) => t.role === TurnRole.AI)?.content ?? '';
        if (lastAsk && asksTheSameThingAgain(lastAsk, screened.text)) {
          this.logger.warn(`Check-in ${checkIn.id}: they ${declined ? 'declined it' : 'said the questions were wrong'} and the reply asked it again; asking again.`);
          const heard = await this.anthropic
            .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${declined ? THEY_DECLINED_IT : THEY_ALREADY_SAID_NO}`), history)
            .catch(() => '');
          const second = heard.trim()
            ? screen(withoutQuotesTheyDidNotSay(forHumans(heard), theirWords), known, readerName, conversationSoFar)
            : null;
          if (second?.text && !second.hits.length && !asksTheSameThingAgain(lastAsk, second.text)) {
            screened = second;
            this.logger.log(`Check-in ${checkIn.id}: the second try let it go.`);
          } else if (declined) {
            /* They said no twice over and the model would ask a third time. The product records the absence
               and moves on; a third ask is the badgering the judge counted. See a-refusal-is-an-answer. */
            const how = await this.howToMoveOn(checkIn.id, lastAsk);
            screened = { ...screened, text: recordAndMoveOn(how.declinedWhat, how), hits: [] };
            this.logger.warn(`Check-in ${checkIn.id}: declined twice and the model asked again; recorded the absence and moved on.`);
          } else {
            this.logger.warn(`Check-in ${checkIn.id}: the second try asked it again too; the first stands.`);
          }
        }
      }

      /*
       * AND IT DOES NOT OPEN BY SAYING THEIR OWN ANSWER BACK TO THEM.
       *
       * Fifth retry, same shape as the four above. This is the one that made a real check-in read as
       * "repeat and going around in circles": nothing was wrong with any single reply, and half of
       * every one of them was the person's own last message. See asked-twice-and-told-no-twice.
       */
      /* In the team baseline, a sentence that offers an example answer comes off: nothing is put in their mouth. */
      if (this.anchorWeekForThisTurn.get(checkIn.id)?.isTheBaseline) {
        const withoutExamples = withoutAnExampleAnswer(screened.text);
        if (withoutExamples.cut.length && withoutExamples.text) {
          this.logger.warn(`Check-in ${checkIn.id}: the baseline's reply offered an example answer; ${withoutExamples.cut.length} sentence(s) came off.`);
          screened = { ...screened, text: withoutExamples.text };
        }
      }
      /* An offer to write their words down quotes those words on purpose: that is the offer, so it is not "saying it back". Only in the anchor's weekly check-in. */
      const anOfferIsBeingMade = !!this.anchorWeekForThisTurn.get(checkIn.id) && isAnOfferToWriteItDown(screened.text);
      if (!anOfferIsBeingMade && opensByRepeatingThem(message, screened.text)) {
        this.logger.warn(`Check-in ${checkIn.id}: the reply opened by repeating them; asking again.`);
        /* The offending sentence goes back with the instruction. Asking for "no restatement" in the
           abstract lost 58 times out of 75 across nineteen live check-ins. */
        const straight = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${doNotSayItBack(message, screened.text)}`), history)
          .catch(() => '');
        const second = straight.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(straight), theirWords), known, readerName, conversationSoFar)
          : null;
        if (second?.text && !second.hits.length && !opensByRepeatingThem(message, second.text)) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try got on with it.`);
        } else {
          /*
           * AND IF IT SAYS IT BACK TWICE, THE SENTENCE COMES OFF.
           *
           * Everything else here keeps the first reply when the retry fails, because a flat reply
           * beats no reply and text surgery usually takes something real with it. This one fault is
           * the exception, and it is the exception because of what it is: an opening sentence that
           * carries NOTHING the person did not just say. Removing it removes nothing.
           *
           * Narrow on purpose. Only when there is another sentence behind it, only when what is
           * left still asks them something, and only after the model has been asked and failed.
           * Otherwise the first reply stands exactly as before.
           */
          const better = second?.text && !second.hits.length ? second : screened;
          const trimmed = withoutTheSentenceThatSaysItBack(message, better.text);
          if (trimmed && !aCutThatLeavesAFragment(better.text, trimmed)) {
            screened = { ...better, text: trimmed };
            this.logger.warn(`Check-in ${checkIn.id}: said it back twice; the opening sentence was dropped.`);
          } else {
            this.logger.warn(`Check-in ${checkIn.id}: the second try repeated them too; the first stands.`);
          }
        }
      }

      /*
       * THE LAST WORD ON A REPEATED QUESTION, AFTER EVERY RETRY. Run 11 (21 Sep 2026): "What is stopping
       * you from doing that now?" went to Adamu eight times, word for word. The third-ask guard runs
       * above and caught nothing to cut because the whole reply was the question; then the
       * restatement retry below it asked the model again and got the same question back, after
       * the guard had had its turn. Whatever the retries produced, a reply that repeats the last
       * question word for word, or asks a thing already asked twice, does not ship: the record line
       * and the next thing this check-in is for go instead.
       */
      if (earlierAsks.length && alreadyAskedTwice(screened.text, earlierAsks)) {
        const how = await this.howToMoveOn(checkIn.id, earlierAsks[earlierAsks.length - 1] ?? '');
        screened = { ...screened, text: recordAndMoveOn(null, how), hits: [] };
        this.logger.warn(`Check-in ${checkIn.id}: the reply still repeated a question after every retry; recorded and moved on to ${JSON.stringify(how.question ?? how.owed ?? 'nothing')}.`);
      }

      /*
       * LENGTH IS JUDGED AFTER THE RESTATEMENT HAS GONE, NOT BEFORE.
       *
       * This ran three guards earlier. Reading every reply that shipped over the bar in nineteen
       * live check-ins: all of them were long for the same reason, which is that they summarised
       * the person back before asking. Three in four were flagged as restating outright and the
       * fourth was a paraphrase close enough to slip that check.
       *
       * So length was being measured on text that was about to lose its opening sentence anyway. A
       * 66-word reply whose first sentence is their own answer handed back is a 25-word reply once
       * the guard above has finished with it, and asking the model for "shorter" in between was
       * asking it to fix the symptom while the cause was still sitting in the text.
       */
      /*
       * AND IT IS NOT AN ESSAY. Nothing in this product constrained length: a hundred and thirty-six
       * rules about what to ask and not one about how much to say. See a-reply-is-not-an-essay.
       */
      /*
       * AND A TURN THAT IS STILL ASKING IS NOT A CLOSE, WHATEVER MARKER IT CARRIES.
       *
       * The hundred and forty words a close may run to are for the one turn that names what now
       * exists, with the figures and the people in it. A reply that carries the marker AND ends on
       * a question is not that turn: the product already knows this and refuses to complete the
       * session on it, a few hundred lines down, because marking it complete put a finish button
       * under a question nobody had answered.
       *
       * Both readings were using the same flag, so a turn that asked one more thing inherited the
       * close's allowance and could run to a hundred and forty. Read live on a second check-in: a
       * hundred and twenty seven words of restating, a compliment about her flexibility, then the
       * question. Sixty is the bar for anything still asking.
       */
      const thisIsTheClosingTurn = closingNow && !stillAsking(screened.text);
      if (isAnEssay(screened.text, thisIsTheClosingTurn)) {
        /* Counts, never the words themselves. no-log-line-carries-what-somebody-wrote reads the
           interpolation and not what it evaluates to, and it is right to: a guard that has to
           reason about what a call returns is a guard that will miss the next one. */
        const wasThisLong = howManyWords(screened.text);
        this.logger.warn(`Check-in ${checkIn.id}: ${wasThisLong} words; asking for shorter.`);
        /* A close that ran long is not a long reply, it is a close that read the record back. Ask
           for what a close is FOR, or the retry trims a paragraph that should not exist at all. */
        const askFor = thisIsTheClosingTurn ? A_CLOSE_IS_THREE_SENTENCES : SAY_IT_SHORTER;
        const shorter = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${askFor}`), history)
          .catch(() => '');
        const second = shorter.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(shorter), theirWords), known, readerName, conversationSoFar)
          : null;
        if (second?.text && !second.hits.length && !isAnEssay(second.text, thisIsTheClosingTurn) && !isADeadEnd(second.text, closingNow)) {
          screened = second;
          const nowThisLong = howManyWords(second.text);
          this.logger.log(`Check-in ${checkIn.id}: the second try was ${nowThisLong} words.`);
        } else {
          this.logger.warn(`Check-in ${checkIn.id}: the second try was no shorter; the first stands.`);
        }
      }

      /*
       * AND IT SAID THE DATE, WHICH THE INSTRUCTION ALONE DID NOT ACHIEVE.
       *
       * Where they named a period, the prompt was told to come back with the date it reads as. Run
       * live twice, it asked something else both times - reasonable questions with no date in them.
       * The same shape as every other rule that lost today, and there is already a note here saying
       * the prompt-wording route is exhausted for dates. So it is checked. See a-period-is-not-a-day.
       */
      const dateItHadToSay = inTheBaseline ? null : theDateItHadToSay(message, new Date(), repliesInThisCheckIn);
      if (dateItHadToSay && didNotSayTheDate(screened.text, dateItHadToSay)) {
        const period = thePeriodTheyNamed(message)!;
        this.logger.warn(`Check-in ${checkIn.id}: the reply left the date out; asking again.`);
        const theInstruction = SAY_THE_DATE(period, dateItHadToSay);
        const withTheDate = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${theInstruction}`), history)
          .catch(() => '');
        const second = withTheDate.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(withTheDate), theirWords), known, readerName, conversationSoFar)
          : null;
        /* And never our own instruction handed to them as a reply: Jide read one (fix6-2). */
        if (
          second?.text && !second.hits.length && !didNotSayTheDate(second.text, dateItHadToSay)
          && !isADeadEnd(second.text, closingNow) && !repeatsTheInstruction(second.text, theInstruction)
        ) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try said the date.`);
        } else {
          /*
           * THE PRODUCT ASKS IT. Two attempts and no date, which is where the decision on quoting
           * dates already points: the product writes the line, the model asks the questions.
           */
          const ours = theQuestionTheProductAsks(period, dateItHadToSay);
          screened = { ...screened, text: ours };
          this.logger.warn(`Check-in ${checkIn.id}: it would not say the date; the product asked instead.`);
        }
      }

      /*
       * AND IT PUT BOTH NUMBERS IN FRONT OF THEM.
       *
       * Same shape as the date: the instruction is checkable, so it is checked, and where two goes
       * fail the product asks the question itself rather than letting the gap pass a second time.
       */
      if (numbersGap && !saidBothNumbers(screened.text, numbersGap)) {
        this.logger.warn(`Check-in ${checkIn.id}: the reply left the numbers out; asking again.`);
        const withBoth = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${askWhichItIs(numbersGap)}`), history)
          .catch(() => '');
        const second = withBoth.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(withBoth), theirWords), known, readerName, conversationSoFar)
          : null;
        if (second?.text && !second.hits.length && saidBothNumbers(second.text, numbersGap) && !isADeadEnd(second.text, closingNow)) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try named both numbers.`);
        } else {
          screened = { ...screened, text: theQuestionAboutTheNumbers(numbersGap) };
          this.logger.warn(`Check-in ${checkIn.id}: it would not name them; the product asked instead.`);
        }
      }

      /*
       * AND A QUESTION THAT ASKS THEM TO INVENT A SHAPE SHOWS ONE.
       *
       * "It doesn't give examples of the responses it expects." Read off a live check-in: "When
       * you say 10,000 units are sold, what would tell you, or anyone else looking, that this goal
       * has been met?" - a fair question and a hard one cold.
       *
       * The prompt has asked for examples on exactly these questions for months, in one paragraph
       * of eighteen thousand words, and it loses the same way the restating rule lost. The examples
       * themselves are judgement and stay with the model; what is checkable is whether it gave any.
       *
       * After the restating guard, because a reply that both restates and asks bare should lose the
       * restatement first - and before the ban list, which is last on purpose.
       */
      if (asksForAShapeWithoutShowingOne(screened.text)) {
        this.logger.warn(`Check-in ${checkIn.id}: asked for a shape without showing one; asking again.`);
        const withOne = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${SHOW_WHAT_ONE_LOOKS_LIKE}`), history)
          .catch(() => '');
        const second = withOne.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(withOne), theirWords), known, readerName, conversationSoFar)
          : null;
        if (
          second?.text && !second.hits.length &&
          !asksForAShapeWithoutShowingOne(second.text) &&
          !isAnEssay(second.text, thisIsTheClosingTurn) && !isADeadEnd(second.text, closingNow) &&
          !opensByRepeatingThem(message, second.text)
        ) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try showed what an answer looks like.`);
        } else {
          this.logger.warn(`Check-in ${checkIn.id}: the second try showed nothing either; the first stands.`);
        }
      }

      /*
       * AND IT DOES NOT USE THE WORDS THIS PRODUCT DOES NOT USE.
       *
       * The prompt bans a list of phrases and words outright and got 237 of them through in 8,317
       * turns. A literal string is a shape, so it is checked here. Their own word handed back to
       * them is not the fault - the fault is the product reaching for it - so what they have said
       * so far is passed in. See words-we-do-not-use.
       *
       * LAST OF THE GUARDS, AND IT USED TO BE FOURTH. Three guards below it can REPLACE the reply,
       * and a replacement was never checked against this list. Measured across nineteen live
       * check-ins: banned phrases went from two to eight the moment the restating guard started
       * succeeding more often, because its rewrites were reaching people unchecked. Running last
       * means whatever actually ships is what got read.
       */
      /*
       * AND ONE QUESTION. Where the reply asks two real questions, it is asked for once more with the
       * rule named, because only the model can say which one it meant. An example written as a
       * question is not asked for again: the save point says it as an example, which loses nothing.
       * If the second try asks two as well, the first stands and the save point keeps its first
       * question. See a-turn-asks-one-thing.
       */
      if (wouldLeaveAQuestionOut(screened.text)) {
        this.logger.warn(`Check-in ${checkIn.id}: the reply asked more than one question; asking again.`);
        const once = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${ASK_ONE_THING}`), history)
          .catch(() => '');
        const second = once.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(once), theirWords), known, readerName, conversationSoFar)
          : null;
        if (
          second?.text && !second.hits.length && !asksMoreThanOneThing(second.text) &&
          !isAnEssay(second.text, thisIsTheClosingTurn) && !isADeadEnd(second.text, closingNow) &&
          !opensByRepeatingThem(message, second.text) && !alreadyAskedTwice(second.text, earlierAsks)
        ) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try asked one question.`);
        } else {
          this.logger.warn(`Check-in ${checkIn.id}: the second try asked more than one too; the first question stands.`);
        }
      }

      /*
       * AND NO MANAGEMENT WORD THEY DID NOT USE FIRST. Task 2.3, week 3: "pipeline", "escalate",
       * "deliverable" and the rest, when Groundwork reached for them itself. Asked again once, with
       * the sentence quoted and a plain way offered; if the second try is no better, the first
       * stands. See management-words. It runs before the word guard below, which stays last so it
       * reads whatever ships, this one's rewrite included.
       */
      const jargonHere = managementWordsIn(screened.text, theirWords);
      if (jargonHere.length) {
        this.logger.warn(`Check-in ${checkIn.id}: ${jargonHere.length} management word(s) they did not use; asking again.`);
        const plain = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${sayItInPlainWords(jargonHere, screened.text)}`), history)
          .catch(() => '');
        const second = plain.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(plain), theirWords), known, readerName, conversationSoFar)
          : null;
        if (
          second?.text && !second.hits.length &&
          !managementWordsIn(second.text, theirWords).length &&
          !wordsWeDoNotUse(second.text, theirWords).length &&
          !asksMoreThanOneThing(second.text) &&
          !isAnEssay(second.text, thisIsTheClosingTurn) && !isADeadEnd(second.text, closingNow) &&
          !opensByRepeatingThem(message, second.text)
        ) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try said it plainly.`);
        } else {
          this.logger.warn(`Check-in ${checkIn.id}: the second try was no plainer; the first stands.`);
        }
      }

      const notOurWords = wordsWeDoNotUse(screened.text, theirWords);
      if (notOurWords.length) {
        this.logger.warn(`Check-in ${checkIn.id}: ${notOurWords.length} word(s) we do not use; asking again.`);
        const ours = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${sayItWithoutThose(notOurWords, screened.text)}`), history)
          .catch(() => '');
        const second = ours.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(ours), theirWords), known, readerName, conversationSoFar)
          : null;
        if (
          second?.text && !second.hits.length &&
          !wordsWeDoNotUse(second.text, theirWords).length &&
          !isAnEssay(second.text, thisIsTheClosingTurn) && !isADeadEnd(second.text, closingNow) &&
          /* Running last means this one can undo the guard above it, so it checks that too. */
          !opensByRepeatingThem(message, second.text)
        ) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try used none of them.`);
        } else {
          this.logger.warn(`Check-in ${checkIn.id}: the second try used them too; the first stands.`);
        }
      }


      /*
       * AND SAY SO WHENEVER A LONG ONE SHIPS, NOT ONLY WHEN THE GUARD TRIPS.
       *
       * A hundred and twenty seven word reply reached somebody and the log could not say which of
       * two things had happened: the guard never fired because a close marker had lifted the bar,
       * or it fired twice and the second try was no better. Different faults, different fixes, and
       * no way to tell them apart afterwards. One line, at the point of shipping, so the next one
       * answers that question by itself.
       */
      /*
       * AND IT DOES NOT MOVE THEIR TARGET TO WHERE THEY ARE STANDING.
       *
       * Read in a browser: she said "my 3000 is short, I am at about 900" and got back "your
       * 3000-unit target is now 900". Both figures are hers, so nothing else here objects, and a
       * target quietly rewritten down to match progress means nothing is ever behind.
       *
       * Asked again, once, with both numbers named. See where-you-are-is-not-what-you-aim-at.
       */
      const standingNow = saysWhereItStands(message ?? '') ? theNumbersIn(message ?? '') : [];
      const theirOwnTarget = standingNow.length
        ? await (this.prisma.groundObjective?.findFirst?.({
            where: { groundId: checkIn.groundId, ownerParticipantId: checkIn.participantId },
            select: { target: true },
          }) ?? Promise.resolve(null)).catch(() => null)
        : null;
      const target = typeof theirOwnTarget?.target === 'number' ? theirOwnTarget.target : null;
      const standsAt = standingNow.length ? Math.max(...standingNow) : null;
      const movedIt = movedTheirTargetToWhereTheyAre(screened.text, standsAt, target);
      if (movedIt && standsAt != null && target != null) {
        this.logger.warn(`Check-in ${checkIn.id}: the reply moved a target to where they stand; asking again.`);
        const again = await this.anthropic
          .respond(this.keptForTheLeakCheck(checkIn.id, `${fullSystem}\n\n${A_STANDING_IS_NOT_A_TARGET(standsAt, target)}`), history)
          .catch(() => '');
        const second = again.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(again), theirWords), known, readerName, conversationSoFar)
          : null;
        if (second?.text && !second.hits.length && !movedTheirTargetToWhereTheyAre(second.text, standsAt, target)) {
          screened = second;
          this.logger.log(`Check-in ${checkIn.id}: the second try left the target where it was.`);
        } else {
          this.logger.warn(`Check-in ${checkIn.id}: the second try moved it too; the first stands.`);
        }
      }

      /*
       * AND IT DOES NOT TELL THEM THEY PROMISED SOMETHING THEY NEVER MENTIONED.
       *
       * "You said you would send the rota by Friday" - to somebody selling tea, whose check-in has
       * never contained the word rota. It came from the engine's own worked example of a closing
       * turn, copied whole. Last of the guards and the only one that CUTS rather than asking again:
       * a model that has just invented a commitment is not the thing to ask for a better one. See
       * a-promise-they-never-made.
       */
      const promiseNobodyMade = aPromiseTheyNeverMade(screened.text, [...theirWords, ...known]);
      if (promiseNobodyMade) {
        this.logger.warn(`Check-in ${checkIn.id}: cut an attribution nothing supports: ${JSON.stringify(promiseNobodyMade)}`);
        /* And never cut a close down to a stub: "Speak soon." was all Elena read (run-7). */
        const cut = whatIsLeftToSend(screened.text, promiseNobodyMade, closingNow);
        if (cut) screened = { ...screened, text: cut };
      }

      /*
       * AND A COMMITMENT IS ONLY READ BACK FROM A COMMITMENT. "You said you would track the integration
       * project's status" went to a man who had said the project was on track because he had been told so;
       * the net above let it stand because the TOPIC was his. See a-commitment-is-read-back-from-a-commitment.
       */
      const commitmentRows = this.commitmentsForThisTurn.get(checkIn.id) ?? [];
      this.commitmentsForThisTurn.delete(checkIn.id);
      for (const unmade of commitmentsTheyNeverMade(screened.text, [...theirWords, ...(this.theirEarlierWordsForThisTurn.get(checkIn.id) ?? [])], commitmentRows)) {
        this.logger.warn(`Check-in ${checkIn.id}: cut a commitment read back that this person never made: ${JSON.stringify(unmade)}`);
        const cutAlready = whatIsLeftToSend(screened.text, unmade, closingNow);
        if (cutAlready) screened = { ...screened, text: cutAlready };
      }

      /* AND AN IDEA IS NEVER READ BACK AS THEIR PROMISE (review of anchor piece 19). See ideas-from-the-team. */
      const participantIdHere = (checkIn as any).participantId ?? null;
      const theirIdeas: string[] = participantIdHere
        ? (((await (this.prisma as any).workItem?.findMany?.({ where: { groundId: checkIn.groundId, ownerParticipantId: participantIdHere, kind: { in: ['idea', 'idea-offered'] } }, select: { name: true } })?.catch?.(() => [])) ?? []) as { name: string }[]).map((w) => w.name)
        : [];
      for (const asAPromise of anIdeaReadBackAsAPromise(screened.text, theirIdeas, [...theirWords, ...(this.theirEarlierWordsForThisTurn.get(checkIn.id) ?? [])])) {
        this.logger.warn(`Check-in ${checkIn.id}: cut an idea read back as a promise: ${JSON.stringify(asAPromise)}`);
        const cutAlready = whatIsLeftToSend(screened.text, asAPromise, closingNow);
        if (cutAlready) screened = { ...screened, text: cutAlready };
      }

      /* AND NO HOMEWORK IN A ONE-TIME SESSION. See withoutTheHomework. */
      const cadenceHere = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { cadence: true } }).catch(() => null);
      if (cadenceHere?.cadence === Cadence.ONE_TIME) {
        const noHomework = withoutTheHomework(screened.text);
        if (noHomework.cut) {
          this.logger.warn(`Check-in ${checkIn.id}: cut "what will you do about this, and by when" from a one-time session.`);
          /* "Before we close," was all Ifeoma read once a cut like this ran (fix7-2). See a-cut-never-leaves-a-fragment. */
          screened = { ...screened, text: afterTheCut(screened.text, noHomework.text, { closing: closingNow, mayRestore: true }) };
        }
      } else {
        /* AND THE HOMEWORK QUESTION HAS A BUDGET, AND THE LEAD'S IS A DECISION. See withinTheHomeworkBudget. */
        const budget = withinTheHomeworkBudget(screened.text, earlierAsks, (checkIn as any).participant?.partyType === PartyType.INITIATOR);
        if (budget.changed !== 'kept') {
          this.logger.warn(`Check-in ${checkIn.id}: the homework question was ${budget.changed === 'decision' ? 'made the lead\'s decision question' : 'cut, over budget'}.`);
          screened = { ...screened, text: afterTheCut(screened.text, budget.text, { closing: closingNow, mayRestore: true }) };
        }
      }

      /*
       * AND A NUMBER CLAIM THE RECORD DOES NOT SUPPORT. "You are past the N40m target" to somebody at
       * N26m; "last time you said N80m" to somebody who never did. Same shape as the promise cut, same
       * reason for cutting rather than asking again. See a-claim-the-numbers-do-not-support.
       */
      const unsupported = withoutTheClaimsTheNumbersDoNotSupport(screened.text, {
        theirWords: [...theirWords, ...(this.theirEarlierWordsForThisTurn.get(checkIn.id) ?? [])],
      });
      this.theirEarlierWordsForThisTurn.delete(checkIn.id);
      if (unsupported.cut.length) {
        for (const c of unsupported.cut) this.logger.warn(`Check-in ${checkIn.id}: cut a number claim: ${c.why}: ${JSON.stringify(c.sentence)}`);
        /* An untrue number never goes back in; a fragment on the closing turn becomes the plain close. */
        screened = { ...screened, text: afterTheCut(screened.text, unsupported.text, { closing: closingNow, mayRestore: false }) };
      }

      /*
       * AND NO CALENDAR DAY THAT NOBODY GAVE. "By the end of the quarter, so by December 31st", said as a
       * fact to a woman whose quarter ended on 30 September. A statement naming a day stands only where
       * somebody said it, a document has it, or the product put it. See a-date-nobody-gave.
       */
      const noDateInvented = withoutADateNobodyGave(screened.text, [...known, ...theirWords, ...(dateItHadToSay ? [dateItHadToSay] : [])]);
      if (noDateInvented.cut.length) {
        this.logger.warn(`Check-in ${checkIn.id}: cut ${noDateInvented.cut.length} statement(s) naming a calendar day nobody gave.`);
        screened = { ...screened, text: afterTheCut(screened.text, noDateInvented.text, { closing: closingNow, mayRestore: false }) };
      }

      const shipping = howManyWords(screened.text);
      if (shipping > A_REPLY_IS_ABOUT) {
        this.logger.warn(
          `Check-in ${checkIn.id}: shipping ${shipping} words (closing turn: ${thisIsTheClosingTurn}).`,
        );
      }

      /* A bare "Ok." that the screen left nothing to reply to is answered, not told it did not come out right (adversarial run, 20 Sep 2026). */
      reply = screened.text || (isAnAcknowledgement(message) ? 'Noted.' : ASK_AGAIN);

      /*
       * AND THE DOCUMENT'S OWN WORDS GO IN FRONT OF IT, WHERE THIS TURN OWES THEM.
       *
       * See the-line-that-touches-what-they-said.ts. Where what they just said contradicts a
       * document everybody on this check-in can read, the quotation is written by us from the file
       * and put first - because four attempts at getting the model to say it, including exceptions
       * written into both of the prompt rules suppressing it, got as far as naming the file and
       * never the line.
       *
       * Skipped if the reply already carries it: on the odd turn where the model does quote the
       * document, printing it twice is worse than not printing it at all.
       */
      const owed = this.takeCitationFor(checkIn.id);
      if (owed && !theReplyAlreadyQuotesIt(reply, owed)) reply = `${owed}\n\n${reply}`;

      /*
       * AND THE ONES SUBSTITUTION CANNOT REACH ARE AT LEAST WRITTEN DOWN.
       *
       * A mangled name has one of hers underneath it and gets put back. A name invented WHOLE -
       * "did Alex Smith get back to you" when there is no Alex Smith - has nothing underneath, so
       * the rule above deliberately leaves the reply alone rather than picking a replacement. That
       * reasoning holds. What did not hold is that nothing then recorded it, so a fabricated
       * colleague reached somebody with no trace anywhere that it had happened.
       *
       * This does not decide what to DO about it, which is a real question with costs on every
       * side. It makes the rate knowable, which is the precondition for deciding.
       */

      // The other half of W2 cannot be repaired by substitution, because there
      // is no word of hers to put back - the causation was invented whole. It is
      // logged rather than edited: silently deleting half a sentence would leave
      // prose that reads as though the engine lost its train of thought.
      /*
       * AND A QUOTE THEY DID NOT SAY LOSES ITS MARKS, ON THE PATH PEOPLE ACTUALLY READ.
       *
       * `withoutQuotesTheyDidNotSay` has existed for weeks and was wired into the coaching and the
       * report, never into the reply. Read in the browser, 22 September 2026, one turn after a
       * document was confirmed: 'You also mentioned earlier that "What moved in your part?"' - the
       * product's own question from the turn before, in quotation marks, attributed to her.
       *
       * The sentence survives and the marks come off, which is what the module was written to do: a
       * paraphrase dressed as a quotation is the fault, not the paraphrase.
       */
      const honestlyQuoted = withoutQuotesTheyDidNotSay(reply, personWords);
      if (honestlyQuoted !== reply) {
        this.logger.warn(`Check-in ${checkIn.id}: a quotation nobody said lost its marks.`);
        reply = honestlyQuoted;
      }
      const truncated = truncationsOfTheirWords(reply, personWords);
      if (truncated.length) {
        /* How many, not which: the words are the person's own. */
        this.logger.warn(
          `Shortened ${truncated.length} of their own word(s) on check-in ${checkIn.id}.`,
        );
      }
      const invented = causalClaimNobodyMade(reply, personWords);
      if (invented.length) {
        /* The rate is the point of this line; the claim itself is about somebody's work. */
        this.logger.warn(
          `${invented.length} causal claim(s) nobody made on ${checkIn.id}. ${ASK_INSTEAD_OF_CONCLUDING}`,
        );
      }
      /*
       * A REQUEST FOR LEAVE OR MONEY, SAID IN AN ORDINARY CHECK-IN, IS TOLD WHERE IT IS ASKED FOR, BY US, IN ONE SENTENCE (user journeys, F-9). A bare
       * "Yes, send it." after that sentence gets the sentence again and no next question. See a-request-in-an-ordinary-check-in-goes-to-ask.
       */
      {
        const there = await (this.prisma as any).ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { startedFrom: true, scenario: true, organizationId: true } })?.catch?.(() => null);
        const lastWeSaid = await (this.prisma as any).conversationTurn?.findFirst?.({ where: { checkInId: checkIn.id, role: TurnRole.AI, createdAt: { lt: (personTurn as any).createdAt } }, orderBy: { createdAt: 'desc' }, select: { content: true } })?.catch?.(() => null);
        const where = await whereARequestInAnOrdinaryCheckInGoes(this.prisma, { organizationId: there?.organizationId ?? null, startedFrom: theAnchorMarkOf(there), message, theLastThingWeSaid: lastWeSaid?.content ?? null });
        if (where) reply = where.replaceTheReply ? where.say : `${reply}\n\n${where.say}`;
      }
      hadCloseMarker = stripped.hadMarker;
      reply = await this.theTurnAsItIsSaved(checkIn as any, reply);
      aiTurn = await this.prisma.conversationTurn.create({
        data: {
          checkInId: checkIn.id, role: TurnRole.AI, content: reply,
          askedFor: stampWhatItAskedFor(reply),
          /* A turn that put a document's side to them is stamped with that line instead, so it is asked once. */
          ...await this.theDocumentQuestionItRaised(checkIn.participantId, reply).then((raised) => (raised ? { askedFor: raised } : {})),
        },
      });
    } catch (err) {
      await this.prisma.conversationTurn.delete({ where: { id: personTurn.id } }).catch(() => undefined);
      throw err;
    }

    // Two detectors, union. The model states plainly that it is closing (the
    // [[SESSION_COMPLETE]] marker in ENGINE_RULES), and the old phrase matching
    // stays as a backstop for a turn where the model forgets the marker.
    //
    // Why: a live 12-session run closed cleanly only 18% of the time, and three
    // of the genuine misses were off by ONE WORD - the model wrote "here is what
    // is in your record" where the list wanted "here is what is NOW in your
    // record". No phrase list is ever complete, so the model says it outright
    // instead. Costs nothing: it rides on the reply it was already generating.
    /* A yes or a no to an offer of a request that is waiting is never the person saying they are done (known issue B12). */
    const answeringAnOffer = await theyAreAnsweringAnOffer(this.prisma, {
      groundId: checkIn.groundId,
      startedFrom: theAnchorMarkOf((checkIn as any).ground?.startedFrom !== undefined && (checkIn as any).ground?.scenario !== undefined
        ? (checkIn as any).ground
        : await (this.prisma as any).ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { startedFrom: true, scenario: true } })?.catch?.(() => null)),
      participantId: (checkIn as any).participantId ?? null,
      message,
    });
    const signalled = !answeringAnOffer && (hadCloseMarker || this.closesInOtherWords(reply, message));
    const close: { ready: boolean; ask?: string; sayFirst?: string; nextStep?: { isLead: boolean; personSaid: string[] } } = signalled ? await this.mayClose(checkIn.id, !!(checkIn as any).isSelfCorrection) : { ready: false };
    /* A close on an apology says, first, that none was owed. See an-apology-is-not-owed. */
    if (close.ready && !close.ask && isAnApology(message)) close.sayFirst = NOTHING_TO_APOLOGISE_FOR;
    if (close.ask) {
      /* The goodbye goes first. It was written before the product ruled on the close, and appending
         a question underneath it told a lead the session was over and then that it was not. */
      const earlierAi = await this.prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id, role: TurnRole.AI, id: { not: aiTurn.id } }, select: { content: true } }).then((rows) => rows.map((r) => r.content ?? '')).catch(() => [] as string[]);
      const stillOpen = withoutWhatWasAlreadySaid(withoutTheGoodbye(aiTurn.content ?? ''), earlierAi);
      /* And the close line is the one question: what the model left above it asking goes. See withTheOneMoreLine. */
      aiTurn = await this.prisma.conversationTurn.update({
        where: { id: aiTurn.id },
        /* The next-step question is worded against what is kept above it, so it never asks about a "that" with nothing before it. */
        data: { content: withTheOneMoreLine(stillOpen, close.nextStep ? theCloseQuestionFor(close.nextStep.isLead, close.nextStep.personSaid, stillOpen) : close.ask) },
      });
    } else if (!close.ready && hasAGoodbye(aiTurn.content ?? '')) {
      /*
       * NO GOODBYE IN A TURN THAT IS NOT THE LAST. Request 47, 28 September 2026: Rukia read "Your
       * report is ready now. Speak soon." while the check-in stayed open, three times, because the
       * product refused the close (the turn floor) with no question of its own to add, and the
       * model's goodbye went out as it was written. The goodbye comes off; if nothing is left
       * asking, the product's own question goes on.
       */
      aiTurn = await this.prisma.conversationTurn.update({
        where: { id: aiTurn.id },
        data: { content: withAQuestion(withoutTheGoodbye(aiTurn.content ?? ''), { closing: false, asked: await this.whatThisCheckInAskedBefore(checkIn.id, aiTurn.id) }) },
      });
    } else if (close.ready && close.sayFirst) {
      /* A close that records something before the goodbye: the goodbye stays, the fact goes in front of it. */
      const goodbye = aiTurn.content ?? '';
      aiTurn = await this.prisma.conversationTurn.update({ where: { id: aiTurn.id }, data: { content: `${withoutTheGoodbye(goodbye)} ${close.sayFirst} ${goodbye.slice(withoutTheGoodbye(goodbye).length).trim()}`.replace(/\s+/g, ' ').trim() } });
    }
    /*
     * NOT WHILE IT IS STILL ASKING. A reply can carry the close marker and end in a question - the
     * model closing and asking one more thing in the same breath. Marking that turn complete put a
     * "Complete session" button under a question the person had not answered: "the session closing
     * without an option to chat more, but the agent asks more questions". The signal comes again on
     * the next turn, after they have answered. Decided here, in code, and not by asking the model.
     */
    const sessionComplete = close.ready && !stillAsking(aiTurn.content ?? '');

    /*
     * AND A TURN THE PRODUCT DID NOT CLOSE MUST HAVE SOMETHING TO ANSWER.
     *
     * Read live, 23 September 2026, five answers in: "That is a clear picture of the impact you want
     * to have. The goal of 30,000 smallholders with a 30% income increase is ambitious and
     * specific." Nothing to answer, and the conversation was not over - she had to decide for
     * herself whether it had finished.
     *
     * There is a dead-end guard hundreds of lines above this and it let the reply through, because
     * it asks whether the MODEL was closing - it had emitted the close marker - and the product
     * then declined to close, which is the product's call and not the model's. So the check is made
     * again here, where the answer to "is this conversation over" is finally known. Both stay: the
     * early one runs on every turn the close machinery never reaches.
     */
    if (!sessionComplete && isADeadEnd(aiTurn.content ?? '', false)) {
      const asking = withAQuestion(aiTurn.content ?? '', { closing: false, asked: await this.whatThisCheckInAskedBefore(checkIn.id, aiTurn.id) });
      if (asking !== (aiTurn.content ?? '')) {
        this.logger.warn(`Check-in ${checkIn.id}: the model closed, the product did not, and the reply asked nothing; added a question.`);
        aiTurn = await this.prisma.conversationTurn.update({ where: { id: aiTurn.id }, data: { content: asking } });
      }
    }

    /*
     * AND THE REPORT IS NOT THIS CONVERSATION'S TO HAND OVER, READ AFTER THE CLOSE IS BUILT.
     *
     * "it also tole my collegue the report is ready" - Hafsah, 23 September 2026. On a check-in run
     * across a network there is no report at the end of any one conversation: it is synthesised
     * once enough accounts are in and it reaches people when the ORGANISER sends it. The prompt has
     * said not to claim otherwise for days and the sentence arrives anyway, which is what a prompt
     * rule is worth against a phrase the model has good reason to reach for.
     *
     * IT WAS READ EARLIER AND THAT WAS TOO EARLY. The first version sat with the other reply guards,
     * a few hundred lines above, and it worked on the run where the model wrote the promise into its
     * own reply. Then it read "Your report is ready now. Speak soon." on the very next run, because
     * the goodbye is not written by the model at all - the close is assembled here, after every
     * guard has finished. A guard that runs before the sentence exists is a guard that does not run.
     * See the-last-thing-it-reads-is-the-thing-it-must-not-miss.
     */
    const thisGroundsScenario = await this.prisma.ground
      .findUnique({ where: { id: checkIn.groundId }, select: { scenario: true } })
      .then((g) => g?.scenario ?? null)
      .catch(() => null);
    if (theReportIsNotTheirsYet(thisGroundsScenario)) {
      const honest = withoutPromisingTheReport(aiTurn.content ?? '');
      if (honest !== (aiTurn.content ?? '')) {
        this.logger.warn(`Check-in ${checkIn.id}: a reply promised a report that is the organiser's to release; said what happens instead.`);
        aiTurn = await this.prisma.conversationTurn.update({ where: { id: aiTurn.id }, data: { content: honest } });
      }
    }

    /*
     * AND SAY WHEN THE CEILING IS COMING. `personTurnCount` was read before this turn was stored,
     * so the count including it is one more. Appended to the reply rather than returned as a
     * separate field, because a field needs a screen to render it and this has to reach somebody on
     * the path they are already on.
     */
    /* A FIRST SESSION HAS NO LAST ONE. See the module: "nothing has moved since the last update" went
       out in the first minute of a first conversation. */
    const withoutALastOne = withoutTheLastOne(aiTurn.content ?? '', (checkIn as any).sessionNumber);
    if (withoutALastOne.changed) {
      aiTurn = await this.prisma.conversationTurn.update({ where: { id: aiTurn.id }, data: { content: withoutALastOne.text } });
      this.logger.warn(`Check-in ${checkIn.id}: a reference to a previous session came out of a first-session reply.`);
    }

    /*
     * AND NOT ON THE TURN THAT IS CLOSING, WHICH IS WHERE SHE READ IT.
     *
     * Live, 23 September 2026. She asked to end the session, said she had nothing else, and got:
     * "No problem. Your report is ready now. Speak soon. There is room for 3 more answers in this
     * session. Anything still on your mind is worth saying now."
     *
     * Three faults in one message, and this is two of them. The room notice is for somebody with a
     * long way still to go - "early enough to plan", says its own module - and it was appended to a
     * goodbye, so the turn said the report was finished and then asked for more. It is also the
     * product's own plumbing: the twenty-answer ceiling is a fact about our storage and nobody
     * being told a conversation is over needs the number.
     */
    /* AND THE CLOSE ENDS AS THE PROTOTYPE'S DOES, with the card below it. See the-close-says-what-comes-next. */
    if (sessionComplete) {
      /* WhatsApp and the API show no card, so they end on their own next step, never on "Below is". */
      const closed = endingOnTheClose(aiTurn.content ?? '', how.door ?? 'web', await this.usesSimplerWords(checkIn.groundId));
      if (closed !== (aiTurn.content ?? '')) aiTurn = await this.prisma.conversationTurn.update({ where: { id: aiTurn.id }, data: { content: closed } });
    }
    /* The product has already said it was written down; the model's own telling of it is taken out, so it is not said twice. */
    if (offerAnswered.weSay) {
      const once = withoutTheSecondTellingOfIt(aiTurn.content ?? '', (this.anchorWeekForThisTurn.get(checkIn.id)?.agreed as any)?.text ?? '');
      if (once !== (aiTurn.content ?? '')) aiTurn = await this.prisma.conversationTurn.update({ where: { id: aiTurn.id }, data: { content: once } });
    }
    const room = sessionComplete ? null : howMuchRoomIsLeft(personTurnCount + 1);
    const withRoomLeft = room ? `${aiTurn.content}\n\n${room}` : aiTurn.content;

    /*
     * AND A DOCUMENT ATTACHED SOMEWHERE ELSE IS SAID HERE, ONCE. Somebody who puts the sheet on the
     * Context tab is not in the chat when it is read, so the next thing the chat says opens with what
     * we now have. See theContextNotYetSaid.
     */
    const contextNotSaid = await this.theContextNotYetSaid(checkIn as any);
    /*
     * AND A YES TO WHAT A DOCUMENT HOLDS IS THE MOMENT ITS NUMBERS ARE WRITTEN.
     *
     * The chat says "Here is the context we have... Is that right?" - so this turn is where that
     * question is answered. Before today the numbers were already on the record when the question
     * was asked. See whatTheDocumentWaitsFor.
     */
    const tookTheNumbers = await this.whatTheDocumentWaitsFor(checkIn as any, message);
    /* A long paste from the lead is kept as their words, and they are told where it can be put on the check-in. */
    const whereToTakeIt = whereToTakeALongPaste({
      isTheLead: checkIn.participant?.partyType === PartyType.INITIATOR,
      message,
      askGroundworkTakesContext: await contextIsInAskGroundwork(this.prisma).catch(() => false),
      ask: await askNameOf(this.prisma, (await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { organizationId: true } }).catch(() => null))?.organizationId),
    });
    /*
     * AND WHAT WE SAID BEFORE THE MODEL SPOKE IS KEPT IN THE TURN, so the transcript holds it too. The
     * streamed route always did this ("nine targets were written and the screen said only 'Right.
     * The Q4 targets are clear.'"); since both routes are one, this is where it happens for both.
     */
    const ourOwnWords = [contextNotSaid, tookTheNumbers, whereToTakeIt, offerAnswered.weSay].filter(Boolean).join('\n\n');
    if (ourOwnWords) {
      aiTurn = await this.prisma.conversationTurn.update({ where: { id: aiTurn.id }, data: { content: `${ourOwnWords}\n\n${aiTurn.content}` } });
    }
    /*
     * AND THE WORKING NOTES, AFTER THE REPLY AND NEVER IN FRONT OF IT.
     *
     * Fire and forget: it costs a model call and the person waiting for this answer should not pay
     * for it, and a conversation must never fail over its own notes. The state is one turn behind
     * when the next reply is composed, which is the right arrangement - what reads from it is a
     * challenge about accumulated claims, not a comment on the word just typed. See
     * what-we-have-so-far and reading-what-they-just-said.
     */
    /*
     * The idea offer's own yes or no is not something they said about the work (known issue B12). Only while an offer is waiting for them: the check-in row
     * carries no ground here, so the test read nothing and every "Yes, capture it" was noted; and a "Not now." typed to any other question is their answer
     * and is kept (review of fd583ba5, where it was noted as a plan and read as contradicting the plan before it).
     */
    const answersAWaitingIdeaOffer = anAnswerToTheIdeaOffer(message)
      && ((await (this.prisma as any).workItem?.count?.({ where: { groundId: checkIn.groundId, kind: 'idea-offered', ownerParticipantId: (checkIn as any).participantId ?? '' } })?.catch?.(() => 0)) ?? 0) > 0;
    if (!answersAWaitingIdeaOffer) {
      this.noteWhatTheySaid(checkIn.id, message).catch((err: any) =>
        this.logger?.warn?.(`Notes not updated for ${checkIn.id}: ${err?.message}`));
    }
    /* Suggested answers under the question: task 2.6, screens request 7a. See suggested-answers. */
    const suggestedAnswers = sessionComplete ? [] : await this.suggestedAnswersFor(aiTurn.id, aiTurn.content ?? '', message, checkIn.id);
    /*
     * WHAT IS NOW IN THEIR RECORD, SHOWN BEFORE THEY FINISH (task 2.7, screens request 7b). Built after
     * the goodbye and never in front of it: the record reader takes ten to forty-seven seconds on the
     * local corpus, and nobody should wait that long for "That's all for today". It is kept on this
     * turn and served on the transcript, where the screen picks it up.
     */
    if (sessionComplete) this.startTheEndCard(checkIn as any, aiTurn.id);
    /*
     * AN IDEA, SAID BACK FOR A YES (anchor piece 19). Only on a check-in started from the anchor link, with the switch
     * on: their yes captures the idea waiting for it, and a new idea in what they just wrote is offered in the spec's
     * words. See ideas-from-the-team.
     */
    const startedFrom = theAnchorMarkOf((checkIn as any).ground?.startedFrom !== undefined && (checkIn as any).ground?.scenario !== undefined
      ? (checkIn as any).ground
      : await (this.prisma as any).ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { startedFrom: true, scenario: true } })?.catch?.(() => null));
    /* A request said in their own words is offered there, as WhatsApp does (anchor pieces 26 and 27). Read first, so a
       leave request is never also offered as an idea. See a-request-offered-in-the-check-in. */
    const organizationId = (checkIn as any).ground?.organizationId
      ?? (await (this.prisma as any).ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { organizationId: true } })?.catch?.(() => null))?.organizationId
      ?? null;
    const request = startedFrom ? await aRequestAfterTheirTurn(this.prisma, { groundId: checkIn.groundId, organizationId, startedFrom, participantId: (checkIn as any).participantId ?? null, message, sessionComplete }) : {};
    const idea = startedFrom && !request.requestOffer && !request.openTheRequest ? await afterTheirTurn(
      { prisma: this.prisma, anthropic: this.anthropic as any, prompts: this.prompts as any },
      { groundId: checkIn.groundId, startedFrom, participantId: (checkIn as any).participantId ?? null, message, sessionComplete },
    ) : {};
    const answer: any = {
      reply: [contextNotSaid, tookTheNumbers, whereToTakeIt, offerAnswered.weSay, withRoomLeft].filter(Boolean).join('\n\n'),
      sessionComplete,
      ...(suggestedAnswers.length ? { suggestedAnswers } : {}),
      ...(idea.ideaOffer ? { ideaOffer: idea.ideaOffer } : {}),
      ...(request.requestOffer ? { requestOffer: request.requestOffer } : {}),
      ...(request.openTheRequest ? { openTheRequest: request.openTheRequest } : {}),
      ...(this.anchorVersionForThisTurn.get(checkIn.id) ? { promptVersionId: this.anchorVersionForThisTurn.get(checkIn.id) } : {}),
    };
    /* With the offer or the request's form attached, the reply never says Groundwork cannot approve it or sends them elsewhere. */
    if (request.requestOffer || request.openTheRequest) {
      const taken = withoutACannotApprove(answer.reply);
      if (taken.cut.length) {
        this.logger?.warn?.(`Check-in ${checkIn.id}: took off what contradicts the request offer: ${JSON.stringify(taken.cut)}`);
        answer.reply = taken.text;
      }
    }
    /* In an anchor check-in with no offer or form on the reply, no promise to pass a request on: nothing here does (known issue B12). */
    if (startedFrom === STARTED_FROM_THE_ANCHOR && !request.requestOffer && !request.openTheRequest) {
      const kept = withoutAPromiseToPassItOn(answer.reply);
      if (kept.cut.length) {
        this.logger?.warn?.(`Check-in ${checkIn.id}: took off a promise to pass a request on: ${JSON.stringify(kept.cut)}`);
        if (kept.text) answer.reply = kept.text;
      }
    }
    /* In an anchor check-in, for somebody on the lead's team, what happened is said and never rated (the weekly words forbid it; the model sometimes does not obey). */
    if (startedFrom === STARTED_FROM_THE_ANCHOR && (checkIn as any).participant?.partyType !== PartyType.INITIATOR) {
      const said = withoutARatingOfWhatHappened(answer.reply);
      if (said.cut.length) {
        this.logger?.warn?.(`Check-in ${checkIn.id}: took off a rating of what they did: ${JSON.stringify(said.cut)}`);
        answer.reply = said.text;
      }
    }
    if (request.sayFirst) answer.reply = [request.sayFirst, answer.reply].filter(Boolean).join('\n\n');
    /* "I have captured it for the team." is said first, before anything else in the reply (anchor piece 19). */
    if (idea.sayFirst) {
      /* Captured already: the model's own "Capture what, specifically?" is taken off first. */
      const notAsked = withoutAskingWhatToCapture(answer.reply);
      if (notAsked.cut.length) this.logger?.warn?.(`Check-in ${checkIn.id}: took off asking what to capture, after it was captured: ${JSON.stringify(notAsked.cut)}`);
      answer.reply = [idea.sayFirst, notAsked.text].filter(Boolean).join('\n\n');
    }
    return answer;
  }

  /**
   * The engine has offered to close. Should it?
   *
   * It closes when the person stops producing new material, and running out of
   * things to say correlates with having had little to say - so the thinnest
   * records were getting the tidiest endings. This holds a close back exactly
   * ONCE when there is nothing checkable and the person has not said there is
   * nothing, and then never again in that session. Nobody gets trapped in a loop
   * to extract a specific that does not exist.
   */
  /**
   * ONE MORE TRY, WITH THE INVENTION NAMED. Returns nothing if the second reply is not clean.
   */
  private async askAgainWithoutTheInvention(
    fullSystem: string,
    history: ChatTurn[],
    hits: Hit[],
    known: string[],
    readerName: string | null,
    theirWords: string[],
    checkInId: string,
  ): Promise<{ screened: ReturnType<typeof screen>; hadMarker: boolean } | null> {
    const second = await this.anthropic
      .respond(this.keptForTheLeakCheck(checkInId, `${fullSystem}\n\n${askInsteadOfInventing(hits)}`), history)
      .catch(() => '');
    if (!second.trim()) {
      for (const h of hits) this.logger.warn(hitLogLine(checkInId, h, 'regenerated, still hit'));
      return null;
    }
    const screened = screen(withoutQuotesTheyDidNotSay(forHumans(second), theirWords), known, readerName, history.map((h) => h.content));
    const clean = screened.hits.length === 0 && !!screened.text;
    for (const h of hits) this.logger.warn(hitLogLine(checkInId, h, clean ? 'regenerated, clean' : 'regenerated, still hit'));
    if (!clean) {
      for (const h of screened.hits) this.logger.warn(hitLogLine(checkInId, h, 'regenerated, still hit'));
      return null;
    }
    return { screened, hadMarker: textHadCloseMarker(second) };
  }

  /**
   * THE CLOSE BAR, AND THE ONE HOLD.
   *
   * The model has signalled a close. Before it is accepted, the last thing the person said is read
   * for a number, a date, a document or an attachment. If none of those is there, and this check-in
   * has not been held before, it is held ONCE: closeHeldAt is stamped, the product's one question
   * goes out on the end of the reply, and the next answer closes it whatever it says.
   *
   * closeReadiness then runs as it always did. Its "already held back once" branch used to be fed
   * by aiTurns > personTurns, which is true on every turn of every session (the opener is an AI
   * turn), so the hold never held. It is fed by the stamp now.
   */
  /** Every earlier thing this check-in said, so a fallback question is never one it has already asked. */
  private async whatThisCheckInAskedBefore(checkInId: string, notThisTurn: string): Promise<string[]> {
    return (this.prisma.conversationTurn?.findMany?.({ where: { checkInId, role: TurnRole.AI, id: { not: notThisTurn } }, select: { content: true } }) ?? Promise.resolve([]))
      .then((rows: any[]) => (rows ?? []).map((r) => r.content ?? ''))
      .catch(() => [] as string[]);
  }

  private async mayClose(checkInId: string, isSelfCorrection = false): Promise<{ ready: boolean; ask?: string; sayFirst?: string; nextStep?: { isLead: boolean; personSaid: string[] } }> {
    const [row, turns] = await Promise.all([
      this.prisma.checkIn.findUnique({ where: { id: checkInId }, select: { closeHeldAt: true, participantId: true, startedAt: true, isClarification: true, sessionNumber: true, participant: { select: { partyType: true } }, ground: { select: { cadence: true, scenario: true, startedFrom: true } } } }),
      this.prisma.conversationTurn.findMany({
        where: { checkInId },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      }),
    ]);
    const personSaid = turns.filter((t) => t.role === TurnRole.PERSON).map((t) => t.content ?? '');
    /*
     * NEVER A GOODBYE FOR A RECORD THE SERVER WILL NOT WRITE (request 47). complete() refuses an
     * empty record whatever was said, so the close refuses it by the same reading, first.
     */
    if (almostNothingHereYet(personSaid, isSelfCorrection)) {
      this.logger.log(`Holding the close on ${checkInId}: almost nothing in the record yet.`);
      return { ready: false };
    }
    /*
     * THEIR SESSION, THEIR CALL, BEFORE ANY COUNT OR HOLD. Read live, 22 Sep 2026: "That's it from me
     * this week" was answered with "One more before this closes". closeReadiness has always let
     * somebody out on that sentence; the floor and the holds above it in this method did not know,
     * so the product held the door on the person walking through it.
     */
    if (askedToFinish(personSaid)) return { ready: true };
    const minTurns = theFloorFor(isSelfCorrection, (row as any)?.ground?.scenario ?? null);
    if (personSaid.length < minTurns) {
      this.logger.log(`Holding the close on ${checkInId}: only ${personSaid.length} answer(s) so far.`);
      return { ready: false };
    }
    /*
     * THE TEAM BASELINE IS NEVER HELD AT ITS CLOSE (anchor piece 14). It learns how their work looks from where they sit; it does not ask what they
     * will do and by when, does not ask for a date or a number, and does not go back for something the situation's list owed. Its own words decide
     * when it is done (all nine learned), so when it closes, it closes.
     */
    if (await this.theBaselineApplies({ sessionNumber: (row as any)?.sessionNumber ?? 1, participant: { partyType: (row as any)?.participant?.partyType } }, (row as any)?.ground)) {
      /*
       * AN IDEA IN THEIR LAST ANSWER IS OFFERED BEFORE THE GOODBYE. "What could the team be doing better" is the last of the nine, and it is where
       * ideas are said; a session that closed on it would end before anybody could say yes to capturing it. So the close waits for the offer.
       */
      const idea = await aNewIdeaIn({ prisma: this.prisma, anthropic: this.anthropic as any, prompts: this.prompts as any }, personSaid[personSaid.length - 1] ?? '').catch(() => null);
      if (idea) {
        this.logger.log(`The close on ${checkInId} waits: they said a concrete idea, which is offered before the goodbye.`);
        return { ready: false };
      }
      return { ready: true };
    }
    /*
     * THE HOLD BUDGET IS ONE. Run 10 (21 Sep 2026) raised it to two, one per thing never asked, because
     * "closing too early" was the commonest fault among the personas. Then a real person met it
     * (Hafsah, 22 Sep 2026, a live team): the model wrote "One last thing before we close", the product
     * followed with "One more before this closes: what is clear and what is not", she answered
     * "everything is clear", and it followed with "One more before this closes: what you need from
     * other people". Three last things in a row is a session that will not end. One hold, and the
     * close lands whatever the record looks like; what was never asked is the report's to say.
     */
    if (row?.closeHeldAt) {
      return { ready: closeReadiness(personSaid, true, minTurns).ready };
    }
    const justDeclined = theyDeclined(personSaid[personSaid.length - 1] ?? '');
    const attached = row
      ? (await this.prisma.groundDocument.count({
          where: { participantId: row.participantId, createdAt: { gte: row.startedAt ?? new Date(0) } },
        })) > 0
      : false;
    /*
     * THE WHOLE SESSION IS READ FOR THE ONE CONCRETE THING, NOT THE LAST ANSWER. Adversarial run,
     * 20 Sep 2026: a rep who had said "N38m" and "the invoices" two turns earlier was held for a
     * number on "No. My numbers speak for themselves", and told "It's on the system" as the answer.
     * The hold exists to get one checkable thing into the record; once the session holds one, the
     * question has been answered whatever the last turn was.
     *
     * AND A ONE-TIME SESSION IS NEVER HELD. Nobody in a discovery or snapshot session is tracked;
     * its brief says so, and "put a date on that" to a business owner who was asked what their year
     * looks like is the product asking for the commitment it promised not to.
     */
    const oneTime = (row as any)?.ground?.cadence === Cadence.ONE_TIME;
    /*
     * A LEAD WHO CLOSES ON "I WILL KEEP MONITORING" HAS MADE NO DECISION, AND THE RECORD SAYS SO. Six
     * runs: "I will continue to monitor his progress" - "Understood. The report is ready now." The
     * lead's close is a decision or a thing put in front of somebody; when it is neither, the close
     * stands and the fact goes in front of the goodbye.
     */
    const leadRow = await this.prisma.checkIn.findUnique({ where: { id: checkInId }, select: { participant: { select: { partyType: true } } } }).catch(() => null);
    const isLead = (leadRow as any)?.participant?.partyType === PartyType.INITIATOR;
    const lastSaid = personSaid[personSaid.length - 1] ?? '';
    const noDecision = isLead && /\b(keep (?:monitoring|an eye|watching)|continue to (?:monitor|watch|track)|carry on as|see how it goes|we(?:'ll| will) (?:discuss|review|revisit) (?:it|this|that) (?:at|in|then)|wait and see|leave it (?:for now|with (?:him|her|them)))\b/i.test(lastSaid);
    /*
     * AND A SESSION DOES NOT CLOSE WITH THE THING IT WAS FOR NEVER RAISED. The hold budget is the
     * same one: once, then the next close lands whatever happened. The product writes the line, in
     * the owed list's own words, so the model cannot soften it into a fourth question about
     * something else. A one-time session has no owed list to hold on.
     */
    /*
     * AND NOT WITHOUT ASKING WHAT THEY WILL DO, AND BY WHEN. The prompt has said for weeks that the close
     * is attached to this question, and nothing here checked it: six check-ins in re-c and re-d closed
     * with no next step and no date, and the one hold went to the owed list instead. The model is told
     * where it is from the sixth answer (whereTheCheckInIs); this is only for the close it reached
     * without asking. It takes the one hold, so it is asked once and the next close lands. Never in a
     * one-time session, a correction, a clarification or a team update, and never after a decline.
     */
    if (!justDeclined && theNextStepIsStillOwed({
      personTurns: personSaid,
      aiTurns: turns.filter((t) => t.role === TurnRole.AI).map((t) => t.content ?? ''),
      oneTime,
      isLead,
      notACheckIn: isSelfCorrection || !!(row as any)?.isClarification || (row as any)?.ground?.scenario === 'TEAM_UPDATES',
      askedToFinish: false,
    })) {
      await this.prisma.checkIn.update({ where: { id: checkInId }, data: { closeHeldAt: new Date() } });
      this.logger.log(`Holding the close once on ${checkInId}: they were never asked what they will do, and by when.`);
      return { ready: false, ask: theCloseQuestionFor(isLead, personSaid), nextStep: { isLead, personSaid } };
    }
    /*
     * NOT THE LEAD, AND NOT ON TOP OF AN ANSWER THEY HAVE JUST GIVEN (re-e, 1 October 2026). Amina, who runs
     * the check-in, was held with "What did you understand you were meant to do?": the first-session spine
     * owes that of every role, and it is a participant's question; the lead's own close is the decision,
     * held for above. And Kwame said he would start tomorrow and was asked "How is it actually going?" on
     * top of it: a person who has just said what they will do, and when, has given the close its answer.
     */
    const aiSaid = turns.filter((t) => t.role === TurnRole.AI).map((t) => t.content ?? '');
    if (!oneTime && !justDeclined && !isLead && !theyHaveJustAnsweredIt(aiSaid, personSaid)) {
      const neverAsked = await this.whatThisSessionNeverAsked(checkInId).catch(() => [] as string[]);
      if (neverAsked.length) {
        await this.prisma.checkIn.update({ where: { id: checkInId }, data: { closeHeldAt: new Date() } });
        this.logger.log(`Holding the close once on ${checkInId}: never asked about ${JSON.stringify(neverAsked[0])}.`);
        return { ready: false, ask: theOneThingNeverAsked(neverAsked[0]) };
      }
    }
    const concrete = whatIsConcreteIn(personSaid.join('\n'), attached);
    const verdict = closeReadiness(personSaid, false, minTurns);
    /*
     * EITHER READER LETS THEM OUT. The two readers disagreed on the rerun: "$400k" and "end of the
     * month" satisfied whatIsConcreteIn while countCheckableSpecifics saw nothing, and the lead who
     * had just confirmed 30 September was asked to "put a date on that". The hold's own question is
     * for a date, a number or a document; once the session holds one, asking it is the product not
     * having listened, whatever the other reader thinks.
     */
    if (oneTime || concrete.length || verdict.ready) return noDecision ? { ready: true, sayFirst: NO_DECISION_YET } : { ready: true };
    /*
     * THE CLOSE CHASES NOTHING. "Put a date or a number on that" went out to people who had just said
     * "No." (six runs, 20-21 Sep 2026), and never once produced the number. The close records that
     * nothing here carries one, in a line the person reads, and closes. See a-refusal-is-an-answer.
     */
    this.logger.log(`Closing ${checkInId} with nothing checkable in it; said so rather than held.`);
    return { ready: true, sayFirst: NOTHING_HERE_HAS_A_NUMBER };
  }

  /**
   * WHAT COUNTS AS THE MODEL CLOSING.
   *
   * The [[SESSION_COMPLETE]] marker, checked by the caller. This is the only other way: the person
   * has just said they are finished and the reply asks them nothing. Nine hard-coded phrases used
   * to sit here ("here is what is now in your record", "your account is now on record"). A reply
   * that closed in other words left the session open, and a mid-session reply that happened to say
   * "now in your record" and "next step" closed it. Both went with the list.
   */
  private closesInOtherWords(reply: string, lastPersonTurn: string): boolean {
    return (!/\?/.test(reply) && askedToFinish([lastPersonTurn])) || saysGoodbye(reply);
  }

  /**
   * Streaming variant of sendMessage. Async-generates events:
   *   { type: 'delta', text }              - a chunk of the answer, as it arrives
   *   { type: 'done', reply, sessionComplete } - final sanitized text + completion flag
   * Persistence and status transitions match sendMessage exactly; the AI turn is
   * written once, sanitized, after the stream completes.
   */
  async *sendMessageStream(checkInId: string, requestingUserId: string, message: string):
    AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; reply: string; sessionComplete: boolean; suggestedAnswers?: string[]; ideaOffer?: any; requestOffer?: any; openTheRequest?: any }, void, unknown> {
    /*
     * THE SAME CODE AS THE PLAIN ROUTE, WITH THE DRAFT SHOWN AS IT IS WRITTEN. Hafsah, 28 September
     * 2026. What the person reads last is `done.reply`, which is exactly what sendMessage returns and
     * saves: every second try, the one-question rule, the closing line and the goodbye rule included.
     * ChatPage already replaces the streamed text with it.
     */
    /* The same door first, so a refused session is refused before the stream opens. sendMessage checks it again. */
    const checkIn = await this.aSessionUnderway(checkInId, requestingUserId);
    this.logger?.debug?.(`Check-in ${checkIn.id}: streaming the plain route.`);
    const waiting: string[] = [];
    let wake: (() => void) | null = null;
    let finished = false;
    let result: Awaited<ReturnType<ConversationService['sendMessage']>> | null = null;
    let failure: unknown = null;
    const running = this.sendMessage(checkInId, requestingUserId as any, message, {
      streamDraft: (text) => { waiting.push(text); wake?.(); },
    })
      .then((r) => { result = r; }, (err) => { failure = err; })
      .finally(() => { finished = true; wake?.(); });
    for (;;) {
      while (waiting.length) yield { type: 'delta', text: waiting.shift() as string };
      if (finished) break;
      await new Promise<void>((resolve) => { wake = resolve; });
      wake = null;
    }
    await running;
    if (failure) throw failure;
    const r = result as any;
    yield {
      type: 'done',
      reply: r.reply,
      sessionComplete: !!r.sessionComplete,
      ...(Array.isArray(r.suggestedAnswers) && r.suggestedAnswers.length ? { suggestedAnswers: r.suggestedAnswers } : {}),
      /* The idea offer rides on the last event too (anchor piece 19), and so do the request offer and its yes (26, 27). */
      ...(r.ideaOffer ? { ideaOffer: r.ideaOffer } : {}),
      ...(r.requestOffer ? { requestOffer: r.requestOffer } : {}),
      ...(r.openTheRequest ? { openTheRequest: r.openTheRequest } : {}),
    };
  }

  /** For a participant's own check-in, the test for a sentence that quotes the lead's brief; null for the lead, or a team update. */
  private async aSentenceThatQuotesTheBriefFor(
    checkIn: { groundId?: string; participantId?: string; participant?: { partyType?: PartyType | string | null } | null },
    theirWords: string[],
  ): Promise<((sentence: string) => boolean) | null> {
    if (!checkIn?.groundId || checkIn.participant?.partyType === PartyType.INITIATOR) return null;
    const g: any = await (this.prisma.ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { brief: true, toldToParticipants: true, scenario: true, initiator: { select: { firstName: true } }, leadContextNotes: { where: { audience: 'EVERYONE', participantId: null }, select: { text: true, audience: true, participantId: true } } } as any }) ?? Promise.resolve(null)).catch(() => null);
    const setup = theLeadsSetupWords(g);
    if (!setup || g.scenario === 'TEAM_UPDATES') return null;
    return aSentenceThatQuotesTheBrief(setup, [...theirWords, g.toldToParticipants ?? ''], g.initiator?.firstName ?? null);
  }

  /**
   * The first draft, streamed to the screen as it is written, and returned whole for the plain
   * route's own checks. What is shown live goes through the same sentence gate the stream always
   * had, and the close marker is held back until it can be told apart from ordinary text. Only the
   * draft: whatever the checks after it change arrives in `done`.
   */
  private async streamTheDraft(
    checkIn: { id: string; participant?: { user?: { firstName?: string | null; lastName?: string | null } } },
    fullSystem: string,
    history: ChatTurn[],
    turns: { role: TurnRole; content: string | null }[],
    message: string,
    show: (text: string) => void,
  ): Promise<string> {
    const personWords = turns.filter((t) => t.role === TurnRole.PERSON).map((t) => t.content ?? '').concat(message);
    const known = personWords.concat(this.knownForThisTurn.get(checkIn.id) ?? []);
    const readerName = theFirstNameFrom(checkIn.participant?.user?.firstName, checkIn.participant?.user?.lastName);
    /* Decision 75, item 13: a sentence quoting the lead's brief is not shown to a participant while it streams
       either, the same test the saved turn is held to (theTurnAsItIsSaved). */
    const quotesTheBrief = await this.aSentenceThatQuotesTheBriefFor(checkIn as any, personWords);
    const gate = new SentenceGate(
      known,
      readerName,
      turns.map((t) => t.content ?? ''),
      [...personWords, ...(this.theirEarlierWordsForThisTurn.get(checkIn.id) ?? [])],
      quotesTheBrief ?? undefined,
    );
    let raw = '';
    let emitted = 0;
    let cleanShown = '';
    try {
      for await (const delta of this.anthropic.respondStream(fullSystem, history)) {
        raw += delta;
        const safeUpTo = Math.max(0, raw.length - SESSION_CLOSE_MARKER.length);
        if (safeUpTo > emitted) {
          const cleanedSoFar = forHumans(raw.slice(0, safeUpTo));
          const fresh = whatIsNewSince(cleanShown, cleanedSoFar);
          if (fresh) cleanShown = cleanedSoFar;
          emitted = safeUpTo;
          const clean = fresh ? gate.push(fresh) : '';
          if (clean) show(clean);
        }
      }
    } catch (err: any) {
      /*
       * A STREAM THAT FAILS IS ASKED FOR AGAIN THE WAY THE PLAIN ROUTE ASKS. Run-15, 28 September
       * 2026, the first full run on the streamed route: eight check-ins stopped on "The reply could
       * not be finished", because the stream did not open within 20 seconds, the fetch failed, or the
       * model was busy (429). respond() retries on exactly those; respondStream() did not. So the
       * draft falls back to respond(), shown whole rather than in pieces, and `done` carries it as
       * always. Only if that fails too does the person see the error.
       */
      this.logger.warn(`Check-in ${checkIn.id}: the stream failed (${err?.message ?? err}); asking the plain way.`);
      raw = await this.anthropic.respond(fullSystem, history);
      const whole = forHumans(raw);
      const fresh = whatIsNewSince(cleanShown, whole);
      if (fresh) { cleanShown = whole; const clean = gate.push(fresh); if (clean) show(clean); }
    }
    const cleanedWhole = forHumans(raw);
    const withheld = whatIsNewSince(cleanShown, cleanedWhole);
    const fromWithheld = withheld ? gate.push(withheld) : '';
    if (fromWithheld) show(fromWithheld);
    const tail = gate.flush();
    if (tail) show(tail);
    return raw;
  }

  /**
   * Assemble the full system prompt for a check-in:
   *   engine rules (versioned) + scenario pack (versioned) + runtime framing +
   *   per-turn dynamic context (Agent 1 intake, trust calibration, Agent 3
   *   cross-reference). The dynamic context only runs when a message is present.
   */

  /**
   * TWO REASONS ONLY THE PERSON CAN GIVE, DECIDED HERE AND NOWHERE ELSE.
   *
   * Not knowing how and putting a thing off need opposite responses - one is shown, the other is
   * talked about - and both used to land in "the agreed thing is not being done", which reads as
   * neither. They are caught in the person's own check-in because this is the one place their words
   * legitimately are: a shared report may not touch a transcript at all, so what leaves this module
   * is SKILL or CONFIDENCE and never the sentence.
   *
   * ONE HELPER, TWO CALLERS. Both turn-persisting paths need it, and a second copy is how one of
   * them keeps classifying after somebody narrows the other.
   *
   * NEVER OVERWRITTEN ONCE SET, and never allowed to break a check-in: somebody who says on Monday
   * that they have never done one has said it, whatever Tuesday is about, and a failure to record
   * why beats losing the turn that said it.
   */
  /**
   * THEY WRITE IT DOWN FOR OTHER PEOPLE, DELIBERATELY.
   *
   * The only thing in this product that crosses from one person's check-in to another's, and it
   * crosses because its author sent it. Nothing harvests a method out of somebody who happened to
   * find one - a team of twelve solving the same problem twelve times is a real cost, and the fix
   * for it is still not to take what works from the people it works for.
   *
   * Their name goes on it, which is the one place a name attaches to somebody's work by default
   * here. Safe for the reason it is unsafe elsewhere: they wrote it to be read, and a tip from
   * nobody cannot be asked a follow-up question.
   */
  async offerWhatWorked(checkInId: string, userId: string, about: string, what: string) {
    about = withoutBankDetails(about);
    what = withoutBankDetails(what);
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: { participantId: true, ground: { select: { organizationId: true } } },
    });
    if (!checkIn) throw new NotFoundException('No such check-in.');

    /* Theirs and nobody else's, checked the same way every other write in this file is. */
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { id: checkIn.participantId, user: { id: userId } },
      /* A participant has no display name of its own; the account behind it does. */
      select: { id: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
    });
    if (!participant) throw new ForbiddenException('This check-in is not yours.');

    return this.prisma.whatWorked.create({
      data: {
        organizationId: checkIn.ground.organizationId,
        byParticipantId: participant.id,
        /* Never an address as a name (week 12c): what was offered is read later in sentences. */
        byName: [participant.user?.firstName, participant.user?.lastName].filter(Boolean).join(' ').trim()
          || ((participant as any).nameGiven ?? '').trim() || 'a colleague',
        about: about.trim(),
        what: what.trim(),
      },
      select: { id: true, about: true, what: true, offeredAt: true },
    });
  }

  private async noteIfTheySaidWhy(checkIn: { id: string; saidWhy?: string | null }, message: string) {
    if (checkIn.saidWhy) return;
    const said = whatTheySaidAboutWhy([message]);
    if (!said) return;
    await this.prisma.checkIn
      .update({ where: { id: checkIn.id }, data: { saidWhy: said.kind } })
      .catch((err: any) => this.logger?.warn?.(`Recording why for check-in ${checkIn.id} failed: ${err?.message}`));
  }

  /**
   * THE QUOTATION THIS TURN OWES THE PERSON, from `composeSystemPrompt` to whoever is replying.
   *
   * See the-line-that-touches-what-they-said.ts: where somebody's account contradicts a document
   * everybody on the check-in can read, the product puts the document's own words on the screen
   * rather than asking the model to. Written when the prompt is composed and taken by the reply
   * path in the same request.
   */
  private _citationForThisTurn?: Map<string, { citation: string; directive: string }>;

  /**
   * Made on first use rather than as a field initialiser. Several specs build this service by
   * hand - `Object.create(prototype)` and friends - so class fields never run for them, and a map
   * that only exists when the constructor did would be undefined in exactly the tests that
   * exercise the prompt.
   */
  /**
   * WHAT IS ALREADY ON THE TABLE, for the invention gate.
   *
   * The gate checked a reply against the person's own words and their first name. Everything else
   * the prompt legitimately hands the model (who else is in the check-in, the lead's shared note,
   * the documents, the objectives, their own prior rows, the citation the product wrote) was
   * "invented" by that reading, so a reply that used a colleague's name from the roster lost the
   * sentence. Written by composeSystemPrompt, read once by the reply path, same request.
   */
  /*
   * THE PROMPT THIS TURN WAS GIVEN, so the step every reply is saved through can cut a sentence that copies
   * our instructions to the model. Written by composeSystemPrompt and again once the turn's own additions
   * are on it; read once by theTurnAsItIsSaved, same request. See our-instructions-never-reach-them.
   */
  private _promptForThisTurn?: Map<string, string>;
  private get promptForThisTurn(): Map<string, string> {
    if (!this._promptForThisTurn) this._promptForThisTurn = new Map();
    return this._promptForThisTurn;
  }
  /*
   * AND WHAT A RETRY ADDED TO IT. A reply asked for again goes out with one more instruction on the end
   * (ASK_ONE_THING, HERS_TO_DRAW, the invention note and the rest), and a reply that copies THAT is as much a
   * leak as one that copies the first prompt. Every retry's system text passes through here on its way to
   * the model, so the leak check reads the instruction the reply was actually written under.
   */
  private keptForTheLeakCheck(checkInId: string, system: string): string {
    const base = this.promptForThisTurn.get(checkInId) ?? '';
    const added = (base && system.startsWith(base) ? system.slice(base.length) : system).trim();
    if (added) this.retryInstructionsForThisTurn.set(checkInId, [...(this.retryInstructionsForThisTurn.get(checkInId) ?? []), added]);
    return system;
  }
  private _retryInstructionsForThisTurn?: Map<string, string[]>;
  private get retryInstructionsForThisTurn(): Map<string, string[]> {
    if (!this._retryInstructionsForThisTurn) this._retryInstructionsForThisTurn = new Map();
    return this._retryInstructionsForThisTurn;
  }
  /** The prompt this turn was given, every retry's added instruction with it. A new turn's prompt starts the list again. */
  private setThePromptForThisTurn(checkInId: string, prompt: string): void {
    this.promptForThisTurn.set(checkInId, prompt);
    this.retryInstructionsForThisTurn.delete(checkInId);
  }
  private _knownForThisTurn?: Map<string, string[]>;
  private get knownForThisTurn(): Map<string, string[]> {
    if (!this._knownForThisTurn) this._knownForThisTurn = new Map();
    return this._knownForThisTurn;
  }
  /* Their commitment rows from earlier sessions, per check-in, for the commitment read-back cut. Same shape and lifetime. */
  private _commitmentsForThisTurn?: Map<string, string[]>;
  private get commitmentsForThisTurn(): Map<string, string[]> {
    if (!this._commitmentsForThisTurn) this._commitmentsForThisTurn = new Map();
    return this._commitmentsForThisTurn;
  }
  /* Their own words from earlier sessions, per check-in, for the number-claim cut. Same shape and lifetime. */
  private _theirEarlierWordsForThisTurn?: Map<string, string[]>;
  private get theirEarlierWordsForThisTurn(): Map<string, string[]> {
    if (!this._theirEarlierWordsForThisTurn) this._theirEarlierWordsForThisTurn = new Map();
    return this._theirEarlierWordsForThisTurn;
  }

  /*
   * THE LEAD'S CONFIRMED QUESTIONS THIS TURN MAY ASK, written when the prompt is composed and taken by
   * the reply path in the same request, like the citation. See grounds/a-question-asked-word-for-word.
   */
  private _questionsForThisTurn?: Map<string, string[]>;
  private get questionsForThisTurn(): Map<string, string[]> {
    if (!this._questionsForThisTurn) this._questionsForThisTurn = new Map();
    return this._questionsForThisTurn;
  }

  /** The reply with each confirmed question in its confirmed words, where the model asked it in its own. */
  /* The reply, and the confirmed questions it now asks word for word, so the one-question rule keeps those. */
  private withTheLeadsQuestionsAsConfirmed(checkInId: string, reply: string): { text: string; confirmed: string[] } {
    const questions = this.questionsForThisTurn.get(checkInId) ?? [];
    this.questionsForThisTurn.delete(checkInId);
    let out = reply;
    const confirmed: string[] = [];
    for (const q of questions) {
      const put = withTheQuestionAsConfirmed(out, q);
      if (put.putBack) this.logger.warn(`Check-in ${checkInId}: a confirmed question was asked in other words, and its confirmed words were put back.`);
      if (put.asked) confirmed.push(q.trim());
      out = put.text;
    }
    return { text: out, confirmed };
  }

  private get citationForThisTurn(): Map<string, { citation: string; directive: string }> {
    if (!this._citationForThisTurn) this._citationForThisTurn = new Map();
    return this._citationForThisTurn;
  }

  /** Takes it and clears it: a citation belongs to one turn and must never appear on the next. */
  private takeCitationFor(checkInId: string): string | null {
    const held = this.citationForThisTurn.get(checkInId);
    this.citationForThisTurn.delete(checkInId);
    return held?.citation ?? null;
  }

  private async composeSystemPrompt(
    checkIn: {
      id: string;
      groundId: string;
      participantId: string;
      sessionNumber: number;
      isClarification?: boolean;
      clarificationTarget?: string | null;
      isSelfCorrection?: boolean;
      selfCorrectionTargetSession?: number | null;
      participant: { partyType: any; roleAsDescribed: string | null; userId?: string | null; detectedFunction?: string | null; detectedFunctionConfidence?: number | null };
    },
    latestMessage?: string,
    /* The opener is a different job from a turn - see only-the-rules-this-turn-needs. */
    how?: { forTheOpener?: boolean },
  ): Promise<string> {
    /**
     * Objectives included, because the engine was reading people against a target it had not been
     * given. This fetched every scalar on the ground and no relations, so `GroundObjective` - the
     * thing the check-in is FOR - never reached the prompt. The screen now shows it to the person;
     * this is the other half, so the interviewer can press on the actual target instead of a
     * generic one it inferred from the scenario.
     */
    const ground = await this.prisma.ground.findUnique({
      where: { id: checkIn.groundId },
      include: {
        objectives: { select: { name: true, target: true, ownerParticipantId: true, isADecisionAboutAPerson: true, setByParticipantId: true, direction: true }, orderBy: { sortOrder: 'asc' } },
        /* The product's finding per person, for the lead's side of the disagreement. */
        report: { select: { findings: true } },
        /**
         * THE ROSTER, SO THE INTERVIEW CAN USE PEOPLE'S NAMES. GW-EXP-1.
         *
         * Nothing in the prompt has ever known who else is in a check-in. That is why no question has
         * ever asked a lead what they expect of a NAMED person - it could not say the name - and why
         * `personObjective` holds zero rows for the product's whole life. A missing question, not a
         * missing field.
         */
        participants: {
          select: {
            id: true,
            partyType: true,
            createdAt: true,
            managingOnly: true,
            roleAsDescribed: true,
            /* The name somebody typed at the end of an open-link check-in; they have no sign-in to
               carry one, and without this they were "a teammate" (now "a colleague") to everybody. */
            nameGiven: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        /**
         * THE LEAD'S FRAMING, AND ONLY THE FRAMING.
         *
         * Filtered to EVERYONE in the query, so a private note about somebody cannot reach a session
         * prompt by way of a later mistake. The private notes have their own path into the coach with
         * their own wrapper; they must never arrive through this one, where the text would sit in the
         * general context every question is built from.
         */
        leadContextNotes: {
          where: { audience: ContextNoteAudience.EVERYONE, participantId: null },
          select: { text: true, audience: true, participantId: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    /* The goals the lead has not told people about yet (decision 56): no target of theirs reaches this check-in. */
    const untoldHere = await this.untoldGoalsOn(checkIn.groundId);

    /*
     * WHAT THIS INTERVIEW MAY CALL THE OTHER PEOPLE IN IT.
     *
     * Read once, here, because four separate blocks below put a colleague into the prompt and each
     * of them had its own answer - one used the REPORT's labeller and told the engine somebody was
     * waiting on "Participant B", which is a slot in a template and not something a question can
     * be built out of. Two others handed over a real name in check-ins where the report and the
     * board deliberately withhold one.
     *
     * `peersMayBeNamed` is the same rule the report and the board apply - see peers-are-named.
     * `plainWords` is the wording the reports already use for somebody this reader may not have
     * the name of. The three rules for choosing between them are in whatToCallThem.
     */
    const peersMayBeNamed = peersAreNamedOn(ground as any, { participantId: checkIn.participantId });
    const whoIsHere = whoIsOnThisGround((ground.participants ?? []) as any);
    const plainWords = plainWordsForEveryoneElse((ground.participants ?? []) as any, checkIn.participantId);

    const wholeEngine = await this.prompts.getActiveContent('system');

    // Load prior session summaries for PRIOR_SESSION in the intake block.
    // For session 3+, include all prior sessions for longitudinal context (max 800 chars total).
    // Also read specificityDimensions from the most recent prior session.
    let priorSession: string | undefined;
    let lowSpecificityMultiDim = false;
    if (checkIn.sessionNumber >= 2) {
      const priorCheckIns = await this.prisma.checkIn.findMany({
        where: {
          participantId: checkIn.participantId,
          sessionNumber: { lt: checkIn.sessionNumber },
          status: CheckInStatus.COMPLETED,
        },
        orderBy: { sessionNumber: 'asc' },
        select: { id: true, sessionNumber: true, specificityDimensions: true },
      });
      if (priorCheckIns.length) {
        const allEntries = await Promise.all(
          priorCheckIns.map(async (ci) => {
            const entries = await this.prisma.recordEntry.findMany({
              where: { checkInId: ci.id, participantId: checkIn.participantId },
              orderBy: { createdAt: 'asc' },
              select: { type: true, text: true },
              take: 6,
            });
            return { sessionNumber: ci.sessionNumber, entries };
          }),
        );
        const parts = allEntries
          .filter(({ entries }) => entries.length > 0)
          .map(({ sessionNumber, entries }) => {
            const summary = entries.map(e => `(${e.type}) ${e.text.replace(/^\[VERIFIABILITY:\w+\] /, '')}`).join(' | ');
            return `[S${sessionNumber}] ${summary}`;
          });
        if (parts.length) {
          priorSession = parts.join(' || ').slice(0, 800);
        }
        const lastCheckIn = priorCheckIns[priorCheckIns.length - 1];
        if (lastCheckIn?.specificityDimensions) {
          const dims = lastCheckIn.specificityDimensions as Record<string, string>;
          const lowCount = Object.values(dims).filter((v) => v === 'vague' || v === 'managed').length;
          lowSpecificityMultiDim = lowCount >= 3;
        }
      }
    }

    const [otherPartyCheckedIn, initiatorProfile] = await Promise.all([
      this.hasOtherPartyCheckedIn(checkIn.groundId, checkIn.participantId),
      this.prisma.adminProfile.findUnique({ where: { userId: ground.initiatorId }, select: { signals: true } }).catch(() => null),
    ]);
    const groundState = await this.buildGroundState(checkIn.groundId, otherPartyCheckedIn);
    const leadSignals = Array.isArray(initiatorProfile?.signals) ? (initiatorProfile!.signals as string[]) : null;

    // Session-1-only DB override for this scenario+party's pack (PromptVersion
    // key "scenario.<name>.<party>"). Lets an admin publish a revised pack via
    // the Prompt Versioning page without a deploy - the whole reason this seed
    // key exists. Falls back to the in-code pack (or the bare pathway
    // question) in buildActivePathway when no active version exists.
    //
    // MOMENT-QUALIFIED FIRST. The key scheme is scenario + party, with no place
    // for the moment - and one scenario now needs different packs at different
    // moments (a cohort at the start is an onboarding period that ends in a
    // decision; later it is a repeatable pulse). Because a stored row wins over
    // the in-code pack, a moment-specific pack written in code could never take
    // effect while any generic row existed: the onboarding lead kept getting the
    // pulse, and the change looked correct in every test that called the pack
    // builder directly. So the moment-qualified key is tried first, and the
    // generic key remains the fallback so nothing else changes behaviour.
    /**
     * Loaded here rather than on the ground include, because it is per-PARTICIPANT: the objective this
     * person is working to, not the ground's.
     *
     * TOLERANT IN TWO DIFFERENT WAYS, FOR TWO DIFFERENT REASONS. A query failure is caught, because a
     * missing objective must never stop somebody checking in - it reads as "none set", which is itself
     * a finding the pack acts on. And the DELEGATE ITSELF is optional, because forty-six existing tests
     * mock this service's prisma and none of them knew about a table that did not exist when they were
     * written. Requiring the stub would mean editing all of them to assert nothing, which is churn that
     * teaches nobody anything - and the behaviour without it is exactly the correct one.
     */
    /**
     * Every expectation on this check-in, for the revision comparison above. One query rather than one
     * per participant, and empty for anybody who is not the lead.
     */
    const expectationRows =
      checkIn.participant.partyType === PartyType.INITIATOR
        ? await (this.prisma.personObjective?.findMany({
            where: { groundId: checkIn.groundId },
            select: { participantId: true, text: true },
            /**
             * Optional-chained like the `findUnique` directly below, and for the same reason: a steer
             * on the QUESTION must never be why a session fails to open. Without a comparison the
             * interview simply cannot spot a revision, which is a smaller loss than a dead session.
             */
          }) ?? Promise.resolve([] as { participantId: string; text: string }[])).catch(() => [] as { participantId: string; text: string }[])
        : [];
    const expectationByParticipant = new Map(expectationRows.map((r) => [r.participantId, r]));

    /**
     * ALL OF THEIRS, not one. A person can be held to a commitment and a standing role expectation at
     * the same time, and the session has to know about both - reading only the first row found is how
     * somebody gets pressed on one thing while another goes unmentioned for a whole check-in.
     *
     * The first is still what the single-expectation prompt fields use, so nothing downstream had to
     * change on the day this landed; `personObjectives` is what the rest of it reads.
     */
    const personObjectives = await (this.prisma.personObjective?.findMany({
      where: { groundId: ground.id, participantId: checkIn.participantId },
      orderBy: { createdAt: 'asc' },
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
    const personObjective = personObjectives[0] ?? null;

    /*
     * WHO IS WAITING, BY NAME. A commitment's whole point is the person on the other end of it, and
     * "somebody is waiting on this" is a weaker sentence than "Hafsah is waiting on this".
     *
     * Only names for people on this check-in, which is the only place `owedToParticipantId` can
     * point - so this cannot introduce a name from anywhere else.
     */
    const nameByParticipantId = new Map<string, string>();
    if (personObjectives.some((o: any) => o.owedToParticipantId)) {
      const owed = await this.prisma.groundParticipant.findMany({
        where: { groundId: checkIn.groundId },
        select: { id: true, user: { select: { firstName: true } }, roleAsDescribed: true },
      }).catch(() => [] as any[]);
      for (const p of owed) {
        /*
         * AND NOT IN A CHECK-IN THAT DOES NOT NAME PEOPLE TO EACH OTHER.
         *
         * This named a colleague to whoever was answering, in every kind of check-in. On a PIP the
         * report withholds that name and the interview handed it over. Plain words instead - see
         * whatToCallThem - so the sentence still has somebody in it and gives nobody away.
         */
        const name = whatToCallThem({
          person: whoIsHere.get(p.id) ?? (p as any),
          peersMayBeNamed,
          plainWords,
        });
        if (name) nameByParticipantId.set(p.id, name);
      }
    }

    const packKeyBase = `scenario.${ground.scenario.toLowerCase()}`;
    const packParty = checkIn.participant.partyType.toLowerCase();
    const scenarioPackOverride =
      checkIn.sessionNumber === 1
        ? await (ground.moment
            ? this.prompts
                .getActiveContent(`${packKeyBase}.${String(ground.moment).toLowerCase()}.${packParty}`)
                .catch(() => null)
            : Promise.resolve(null)
          ).then(async (momentSpecific) =>
            momentSpecific ??
            (await this.prompts.getActiveContent(`${packKeyBase}.${packParty}`).catch(() => null)) ??
            /*
             * AND A PACK WRITTEN ONCE FOR SITUATIONS THAT DO NOT DIFFER BY ROLE.
             *
             * Twelve of the twenty-three situations have byte-identical initiator and participant
             * packs, because the pack describes the SITUATION and that situation reads the same to
             * whoever is answering. What differs by role is what a person owes, and that lives in
             * what-a-check-in-owes now, as slots per role and stage.
             *
             * Two identical rows are not a cost at runtime - only one is ever loaded - they are a
             * trap: edit the lead's, forget the participant's, and the two roles diverge in a way
             * nobody chose. This lets the next one be written once. The existing pairs are left
             * alone, because they are still correct and rewriting live prompt rows to tidy them is
             * a change with risk and no reader.
             */
            (await this.prompts.getActiveContent(packKeyBase).catch(() => null)),
          )
            // null (not '') throughout - buildActivePathway's `??` only falls
            // through to the in-code pack on null/undefined, so resolving to
            // '' here would silently defeat that fallback.
        : null;

    // How this person has answered before, across grounds in this org. Style
    // only - the block itself cannot carry content, by construction.
    let styleBlock = '';
    try {
      const uid = checkIn.participant?.userId;
      const g = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { organizationId: true, simplerWords: true } });
      if (uid && g) {
        const prof = await this.prisma.personStyleProfile.findUnique({
          where: { userId_organizationId: { userId: uid, organizationId: g.organizationId } },
        });
        if (prof) styleBlock = styleGuidance(prof, prof.groundsSeen);
      }
      /* "Use simpler words": for everybody in the check-in, whether or not they have a profile. Empty when off. */
      styleBlock += simplerWordsGuidance(g?.simplerWords);
    } catch { /* never block a check-in over a nicety */ }

    /*
     * WHAT THEIR OWN SYSTEMS SAY IS HAPPENING, alongside what was agreed.
     *
     * Read from every objective this person holds, not only the first: somebody carrying a target and
     * a commitment has two things with numbers against them, and showing one is how a check-in ends
     * up asking about the wrong half of somebody's quarter.
     */
    const evidenceItems = personObjectives
      /* An untold goal's tracked-system state is a number too (decision 56, item 2) - left out here
         for the same reason dueSaid/dueDate/whyThisNumber are left out above. */
      .filter((o: any) => o.lastSeenState && o.lastSeenAt && !notToldYet(o))
      .map((o: any) => {
        let state: Record<string, string | number> = {};
        try {
          const parsed = JSON.parse(o.lastSeenState);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) state = parsed;
        } catch {
          /* `lastSeenState` predates this and held a plain string. An unparseable value is that
             older shape, and showing it raw is better than dropping the only number anybody has. */
          state = { state: String(o.lastSeenState).slice(0, 40) };
        }
        return { text: o.text as string, evidence: { objectiveExternalId: o.externalId ?? o.id, observedAt: o.lastSeenAt as Date, state } };
      });
    const evidenceLines = evidenceBlock(evidenceItems, new Date());

    /*
     * A CHANGE ASKED FOR AND NOT YET AGREED.
     *
     * The requirement in one line: while six-to-four is awaiting approval, the interview must know
     * six is still the target AND that four has been asked for - both, without either quietly
     * becoming the other. Without this block the proposal exists in the record and the conversation
     * carries on as though nothing had been asked.
     */
    const pendingRows = personObjectives.length
      ? await this.prisma.proposedChange.findMany({
        where: {
          personObjectiveId: { in: personObjectives.map((o: any) => o.id) },
          state: 'AWAITING_APPROVAL',
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => [] as any[])
      : [];
    const pendingLines = pendingRows.length
      ? [`${PENDING_RULE}\n${pendingRows.map((c: any) => describePending(
        personObjectives.find((o: any) => o.id === c.personObjectiveId)?.text ?? '(the agreement)',
        c,
        new Date(),
      )).join('\n\n')}`]
      : [];

    /*
     * WHAT THE BOARD ALREADY KNOWS, COMING BACK THE OTHER WAY.
     *
     * Everything below this line is already on this check-in's own record: the numbers the board
     * is measuring against, the things this person has themselves said are in their way, and what
     * they said last time. The conversation has never seen any of it, which is why it opens every
     * week by asking somebody what they are aiming for while the board holds the answer.
     *
     * Facts, not instructions - see the module. A model that is told a blocker is three weeks old
     * and nobody escalated it does not need a rule telling it to ask.
     */
    /* Optional-chained like `personObjective` above: a caller whose prisma double does not stub a
       model must get an empty read, not a crash mid-prompt. */
    const [objectivesAsStored, inTheWayRows, lastTimeRows] = await Promise.all([
      this.prisma.groundObjective?.findMany({
        where: { groundId: ground.id },
        orderBy: { sortOrder: 'asc' },
        select: { name: true, target: true, count: true, ownerParticipantId: true, setByParticipantId: true, direction: true },
      })?.catch(() => [] as any[]) ?? [],
      /*
       * Theirs only. Somebody else's blocker is on the board, not in this person's interview.
       *
       * BOTH OPEN STATES, not just WAITING. The enum has three - BLOCKING, WAITING, CLEARED - and
       * the live extractor writes BLOCKING for the shape this is most for: "I am waiting on finance
       * and six units are sitting there". Filtering on WAITING alone read as working and returned
       * nothing, which is the quietest way for a wired thing to be unwired.
       */
      this.prisma.groundDependency?.findMany({
        where: { groundId: ground.id, fromParticipantId: checkIn.participantId, status: { in: ['BLOCKING', 'WAITING'] } },
        orderBy: { createdAt: 'asc' },
        select: { what: true, onLabel: true, onParticipantId: true, createdAt: true, escalatedAt: true, then: true },
      })?.catch(() => [] as any[]) ?? [],
      /* Their own words from the session before this one, so a promise can be followed up. */
      this.prisma.recordEntry?.findMany({
        where: {
          participantId: checkIn.participantId,
          disputedAt: null,
          checkIn: { sessionNumber: { lt: checkIn.sessionNumber ?? 1 }, status: 'COMPLETED' },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { text: true, type: true },
      })?.catch(() => [] as any[]) ?? [],
    ]);
    /*
     * AND NO GOAL THE LEAD HAS NOT TOLD THEM ABOUT (decision 56), for every block below that reads the
     * targets: the record, what does not add up, the disagreement and the rest. The board's own wall.
     */
    const objectivesOnRecord = withoutWhatTheLeadHasNotToldThemAbout(
      (objectivesAsStored ?? []) as any[], untoldHere, (ground.participants ?? []) as any[], checkIn.participant.partyType === PartyType.INITIATOR,
    ).kept;
    const recordAlreadyHolds = whatTheRecordAlreadyHolds({
      /* Good news first, when there is some: task 2.4. Only in the opener, only from the same lines as saidLastTime. */
      wentWellLastTime: how?.forTheOpener ? theGoodNewsIn(lastTimeRows as any[]) : [],
      /* Theirs, and the check-in's own. Somebody else's owned number is on the board, not in this person's interview. */
      /* Each said about whoever set it, "you" for this person (decision 69). */
      targets: (objectivesOnRecord as any[])
        .filter((o) => !o.ownerParticipantId || o.ownerParticipantId === checkIn.participantId)
        .map((o) => ({ name: this.theTargetsAsSentences([o], ground as any, checkIn.participantId)[0].name.replace(/[.\s]+$/, ''), target: o.target, count: o.count, yours: o.ownerParticipantId === checkIn.participantId, setByThem: o.setByParticipantId === checkIn.participantId })),
      inTheWay: (inTheWayRows as any[]).map((d) => ({
        what: d.what,
        /* Their own word for whoever they meant first, then a name where this check-in allows one,
           then plain words. Never a positional label - see whatToCallThem. */
        on: whatToCallThem({
          person: d.onParticipantId ? whoIsHere.get(d.onParticipantId) : null,
          speakerCalledThem: d.onLabel,
          peersMayBeNamed,
          plainWords,
        }),
        since: d.createdAt,
        escalated: !!d.escalatedAt,
        then: d.then,
      })),
      saidLastTime: (lastTimeRows as any[]).map((e) => String(e.text ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).reverse(),
      /* The lead's call for this check-in, not a global rule. See the field on the ground. */
      expectThemToUnblock: (ground as any).expectThemToUnblock !== false,
      now: new Date(),
    });

    /*
     * WHAT THIS CHECK-IN STILL OWES, worked out here rather than written into eighteen packs.
     *
     * The two goal scenarios want a different conversation from a lead, a team member and a partner,
     * at the first round, a middle one and the last. Serving that as prose would be eighteen blocks
     * competing with 273 imperatives. This is the same tables as data: what has to end up on the
     * record, who owes it, when. What is missing gets asked for; what is answered never gets asked
     * again; what somebody will not answer is recorded and let go.
     */
    /*
     * THIS SESSION'S OWN TURNS, so the blocks below can see what has already been asked and answered
     * in the conversation in hand. Entries are extracted at completion; until then the record knows
     * nothing about this session, and every "still to cover" list read the same on turn nine as on
     * turn one. See what-this-session-has-covered.
     */
    const turnsThisSession: { role: 'AI' | 'PERSON'; content: string; answeredTheOffer?: boolean }[] = await (this.prisma.conversationTurn?.findMany?.({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true, stage: true },
    }) ?? Promise.resolve([]))
      .then((rows: any[]) => rows.map((r) => ({ role: r.role === TurnRole.AI ? 'AI' as const : 'PERSON' as const, content: r.content ?? '', answeredTheOffer: r.stage === ANSWERED_THE_IDEA_OFFER })))
      .catch(() => [] as { role: 'AI' | 'PERSON'; content: string; answeredTheOffer?: boolean }[]);
    if (latestMessage && (turnsThisSession.length === 0 || turnsThisSession[turnsThisSession.length - 1].content !== latestMessage)) {
      /* Not stored yet, so the offer showing is read again here: the same test the turn is marked by when it is stored. */
      const answersTheOfferNow = anAnswerToTheIdeaOffer(latestMessage)
        && ((await (this.prisma as any).workItem?.count?.({ where: { groundId: checkIn.groundId, kind: 'idea-offered', ownerParticipantId: (checkIn as any).participantId ?? '' } })?.catch?.(() => 0)) ?? 0) > 0;
      turnsThisSession.push({ role: 'PERSON', content: latestMessage, answeredTheOffer: answersTheOfferNow });
    }
    /* In the anchor, a click on the idea offer answers the offer and not the question that was open, so no read of what they have told us counts it (known issue B12).
       Only a turn marked as answering an offer that was showing is left out; a "Not now." typed to an ordinary question is their answer and stays. */
    if (aCheckInStartedFromTheAnchor(ground)) {
      for (let i = turnsThisSession.length - 1; i >= 0; i--) if (turnsThisSession[i].role === 'PERSON' && turnsThisSession[i].answeredTheOffer) turnsThisSession.splice(i, 1);
    }

    /*
     * WHAT DOES NOT ADD UP, worked out here from the record and this session's own turns, and quoted
     * to the model as facts. The lowest-scoring thing in two adversarial runs was noticing exactly
     * this; see what-does-not-add-up. This session's answers are not extracted yet, so its PERSON
     * turns stand in as what they have said this time.
     */
    const pastEntries: { text: string; type: string; session: number }[] = await (this.prisma.recordEntry?.findMany?.({
      where: { participantId: checkIn.participantId, disputedAt: null, checkIn: { status: 'COMPLETED' } },
      orderBy: { createdAt: 'asc' },
      select: { text: true, type: true, checkIn: { select: { sessionNumber: true } } },
    }) ?? Promise.resolve([]))
      .then((rows: any[]) => rows.map((r) => ({ text: cleanText(r.text ?? ''), type: String(r.type), session: r.checkIn?.sessionNumber ?? 1 })))
      .catch(() => [] as { text: string; type: string; session: number }[]);
    const doesNotAddUp = await Promise.resolve(pastEntries)
      .then((rows) => {
        const said = [
          ...rows,
          ...turnsThisSession.filter((t) => t.role === 'PERSON').map((t) => ({ text: t.content, type: 'PROGRESS', session: checkIn.sessionNumber ?? 1 })),
        ];
        const planned = totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null;
        return sayWhatDoesNotAddUp({
          said,
          thisSession: checkIn.sessionNumber ?? 1,
          targets: (objectivesOnRecord as any[])
            .filter((o) => !o.ownerParticipantId || o.ownerParticipantId === checkIn.participantId)
            .map((o) => ({ name: o.name, target: o.target, count: o.count, yours: o.ownerParticipantId === checkIn.participantId, setByThem: o.setByParticipantId === checkIn.participantId })),
          sessionsLeft: planned != null ? Math.max(0, planned - (checkIn.sessionNumber ?? 1)) : null,
          aiTurnsThisSession: turnsThisSession.filter((t) => t.role === 'AI').map((t) => t.content),
        });
      })
      .catch(() => '');

    /*
     * A MEETING HAPPENED AND NOBODY IS ON IT.
     *
     * Same `said` list as the read above: their record plus this session's own words. Fifty-seven
     * questions across a three-month engagement never asked who arranged a single meeting, and the
     * report then credited the consultant with the one his client's team had set up. See
     * who-secured-that-meeting.
     */
    const whoSecuredIt = await Promise.resolve(pastEntries)
      .then((rows) => askWhoSecuredIt([
        ...rows.map((r) => ({ text: r.text, session: r.session })),
        ...turnsThisSession
          .filter((t) => t.role === 'PERSON')
          .map((t) => ({ text: t.content ?? '', session: checkIn.sessionNumber ?? 1 })),
      ]))
      .catch(() => '');

    const owedForThis = this.whichOwedListFor(ground.scenario as any, (ground as any).brief ?? null);
    let owedBlock = '';
    /* For the session plan: what is still owed and unasked, and what was declined or asked to the limit. */
    let stillOwedForThePlan: string[] = [];
    let declinedForThePlan: string[] = [];
    if (owedForThis) {
      const [minePastAndPresent, gapRows] = await Promise.all([
        this.prisma.recordEntry?.findMany?.({
          where: { participantId: checkIn.participantId, disputedAt: null },
          select: { type: true, text: true },
        })?.catch(() => [] as any[]) ?? [],
        this.prisma.checkInGap?.findMany?.({
          where: { participantId: checkIn.participantId },
          select: { slug: true, asked: true, answeredAt: true },
        })?.catch(() => [] as any[]) ?? [],
      ]);
      const stage = stageOf(
        checkIn.sessionNumber ?? 1,
        /* Derived from the timeline and the cadence, which is where a planned length lives. */
        totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null,
        !!(checkIn as any).isFinal,
      );
      const still = whatIsStillOwed(owedForThis, this.roleOfTheReaderFor(ground as any, checkIn as any), stage, {
        types: (minePastAndPresent as any[]).map((e) => e.type),
        entries: (minePastAndPresent as any[]).map((e) => ({ type: e.type, text: cleanText(e.text ?? '') })),
        answered: (gapRows as any[]).filter((g) => g.answeredAt).map((g) => g.slug),
        letGo: (gapRows as any[]).filter((g) => !g.answeredAt && g.asked >= ASK_TWICE_THEN_LET_IT_GO).map((g) => g.slug),
      });
      /* Split by what this session has already done with each: still to ask, answered (quoted), asked
         once without a specific, or to be left. Only the first list is "still to cover". */
      const covered = sayWhatHasBeenCovered(still, whatThisSessionHasCovered(still, turnsThisSession));
      owedBlock = [sayWhatIsMissing(covered.notAsked as any, stage), covered.block].filter(Boolean).join('\n\n');
      stillOwedForThePlan = covered.notAsked.map((o) => o.what);
      declinedForThePlan = [
        ...covered.leave.map((l) => `${l.thing.what} (${l.why} this session)`),
        ...(gapRows as any[]).filter((g) => !g.answeredAt && g.asked >= ASK_TWICE_THEN_LET_IT_GO).map((g) => `${owedForThis.find((o) => o.id === g.slug)?.what ?? g.slug} (asked ${g.asked} times before, never answered)`),
      ];
    }

    const intakeBlock = buildIntakeBlock({
      scenario: ground.scenario,
      // A cohort at the START is an onboarding period whose end decides
      // something about each person; the same scenario later is a repeatable
      // pulse. Without this the onboarding cohort got the pulse conversation.
      moment: ground.moment,
      // So the engine can tell a fortnight from a year. See where-in-the-run.ts.
      timelineDays: (ground as any).runsUntilEnded ? null : ground.timelineDays,
      /**
       * This person's own objective, with who set it and whether they have seen it. Both columns
       * existed on PersonObjective and neither reached the engine, so the interview could press
       * somebody on a standard they were reading for the first time.
       */
      /*
       * ALL OF THEM. `personObjective` stays as the first for anything still reading it, and
       * `personObjectives` is what the block renders - a person holding a target and a commitment
       * and a standing expectation had everything after the first invisible to the interview.
       */
      /*
       * DECISION 56, ITEM 2. A goal the lead wrote and has not yet told this person about still
       * reaches the model - so it can ask about the work - but with `text` cut back to the WORDED
       * area (see the-area-of-a-goal-is-worded-once.ts: worded once by the model when the goal was
       * saved, kept, and only ever read here - never asked for on this turn), and every
       * number-carrying field left null, so nothing here can say the number or the date the lead has
       * not shared. `notToldYetAreaOnly` is what tells `describeObjective` to render it that way
       * instead of the ordinary sentence.
       */
      personObjectives: await Promise.all(personObjectives.map(async (o: any) => {
        const untold = notToldYet(o);
        return {
          text: untold ? await areaOfGoalOrFallback(this.prisma, o.text) : o.text,
          authoredBy: o.authoredBy,
          seenBySubject: o.seenBySubject,
          authoredByThem: o.authoredBy === 'self',
          fromTheirSystem: !!o.sourceSystem,
          /* Loaded from the row all along and dropped here. See `describeObjective`. */
          kind: o.kind ?? null,
          dueSaid: untold ? null : (o.dueSaid ?? null),
          dueDate: untold ? null : (o.dueDate ?? null),
          /* Why the number is that number, where the customer's system recorded one.
             The session facing a shortfall can then ask whether the reason still
             holds rather than asking somebody why they are behind. Withheld for an untold goal,
             same reason as dueSaid/dueDate: it is stated in terms of the number. */
          whyThisNumber: untold ? null : (o.whyThisNumber ?? null),
          owedToName: untold ? null : (o.owedToParticipantId ? (nameByParticipantId.get(o.owedToParticipantId) ?? 'somebody on this check-in') : null),
          status: o.status ?? null,
          notToldYetAreaOnly: untold,
        };
      })),
      personObjective: personObjective
        ? {
            text: notToldYet(personObjective) ? await areaOfGoalOrFallback(this.prisma, personObjective.text) : personObjective.text,
            authoredBy: personObjective.authoredBy,
            seenBySubject: personObjective.seenBySubject,
            /*
             * `authoredBy` holds 'self' or 'lead', never a participant id - so comparing it to one
             * was false for every objective ever written, and the interview told everybody their own
             * objective had been set for them. Found while routing sense-check questions by author.
             */
            authoredByThem: personObjective.authoredBy === 'self',
            /* Seeded by an integration rather than written by anybody here. */
            fromTheirSystem: !!(personObjective as any).sourceSystem,
            notToldYetAreaOnly: notToldYet(personObjective),
          }
        : null,
      partyType: checkIn.participant.partyType,
      /* Who is answering, by first name where they have one. See TALKING_TO in the block. */
      readerName: theFirstNameFrom((checkIn.participant as any)?.user?.firstName, (checkIn.participant as any)?.user?.lastName),
      /* Whoever set it up, by first name, so the setup block never says "the person who set this up".
         A lead is named to everybody in their own check-in, so this is no wider than the report. */
      setUpBy: ((lead: any) => theFirstNameFrom(lead?.user?.firstName, lead?.user?.lastName))((ground.participants ?? []).find((p) => p.partyType === PartyType.INITIATOR)),
      sessionNumber: checkIn.sessionNumber,
      /**
       * HOW LONG THIS RUN IS, WHICH THE PROMPT WAS GUESSING AT.
       *
       * `buildIntakeBlock` falls back to `?? 4`, and nothing ever passed this - so every session of
       * every check-in was told "SESSION: n of 4", whatever the ground actually held. On the run
       * that found it, the header beside the conversation said "Session 1 of 8" while the assistant
       * said "the first of four check-ins", in the same viewport.
       *
       * Not cosmetic. `whereInTheRun` reads the total to decide whether this is an early, a middle
       * or a CLOSING session, and calibrates how hard to press on that. On an eight-session ground
       * it treated session four as the last one, so the interview changed shape halfway through and
       * told people a deadline that did not exist.
       *
       * `totalSessionsFor` was imported into this file and never called: somebody wired it meaning
       * to pass it and stopped. Derived here from the same timeline and cadence the header uses, so
       * the two cannot say different numbers.
       */
      /* Zero days for a check-in that runs until the lead ends it, which gives no total. */
      totalSessions: totalSessionsFor(ground.timelineDays, ground.cadence) ?? undefined,
      runsUntilEnded: !!(ground as any).runsUntilEnded,
      /* Their own words for their part only: for anybody the lead invited it is the lead's sentence about them. */
      roleAsDescribed: aRoleInTheirOwnWords(checkIn.participant as any),
      /*
       * WHO OPENED THIS, so the safety rule in ENGINE_RULES can finally fire. It fell back to the
       * party type of whoever was ANSWERING, which made "the opener is senior and this person is
       * not" impossible to express - and told every participant they had equal standing with
       * whoever opened the check-in. See who-opened-this.ts.
       */
      openerRole: whoOpenedThis(
        (ground.participants ?? []).find((p) => p.partyType === PartyType.INITIATOR)?.roleAsDescribed
          ?? null,
        checkIn.participant.partyType === PartyType.INITIATOR,
      ),
      otherPartyCheckedIn,
      groundLabel: ground.label,
      /**
       * Everyone except the person answering, and except a managing-only lead who gives no account.
       * `participantLabel` so nobody is ever named by an email address, and a person with no account
       * yet shows as the role they were described as.
       */
      otherParties: (ground.participants ?? [])
        .filter((p) => p.id !== checkIn.participantId && !p.managingOnly)
        .map((p) => ({
          /* A name where this check-in names people to each other, plain words where it does not.
             Never a positional label, and never a role in an evaluation - see whatToCallThem. */
          label: whatToCallThem({ person: p as any, peersMayBeNamed, plainWords, fallback: 'a colleague' })
            ?? 'a colleague',
        })),
      /**
       * THE LEAD'S FRAMING OF THE SITUATION, READ BY EVERY SESSION.
       *
       * A note the lead addressed to the whole check-in. It reaches the questions so a session opens
       * knowing what this is about rather than cold - which is the entire purpose of the Context page.
       *
       * IT IS NEVER EVIDENCE, and the audience has nothing to do with that. Visibility is a choice;
       * quotability is fixed by the kind of thing this is, and a note is somebody's words about a
       * situation. So it steers what gets asked and can never be quoted, attributed, or stated as
       * fact - the same rule the private note follows, with a different readership.
       */
      /* Without a sentence giving a colleague's hidden target, as the brief (29 September 2026). */
      sharedNote: this.theSharedNoteThisPersonMayBeGiven(ground as any, checkIn as any),
      /**
       * GW-EXP-4. So the interview can tell a revision from a restatement, and ask what changed. Only
       * for the lead's own conversation: a party has no expectations of anybody to revise.
       */
      existingExpectations:
        checkIn.participant.partyType === PartyType.INITIATOR
          ? (ground.participants ?? [])
              .filter((p) => p.id !== checkIn.participantId && !p.managingOnly)
              .map((p) => {
                const row = expectationByParticipant.get(p.id);
                if (!row?.text?.trim()) return null;
                return {
                  /* The lead's own conversation, and a lead always reads their own team by name -
                     which is why this one passes `peersMayBeNamed: true` rather than the ground's rule. */
                  label: whatToCallThem({ person: p as any, peersMayBeNamed: true, plainWords, fallback: 'a colleague' })
                    ?? 'a colleague',
                  text: row.text.trim(),
                };
              })
              .filter(Boolean) as { label: string; text: string }[]
          : [],
      // Pre-existing gap, found while proving this fix: resolutionState was
      // never wired into the intake context at all, so RESOLUTION_STATE in
      // the prompt was always "not yet defined" regardless of what the
      // initiator actually set at ground creation.
      resolutionState: (ground as any).resolutionState ?? null,
      // Never reached the model before - see the comment on PromptContext.cadence.
      cadence: (ground as any).cadence ?? null,
      /* The brief without a sentence giving a colleague's hidden target, in figures or in words. */
      adminBrief: this.theLeadsOwnWordsStayHers(ground, checkIn) ? null : this.theBriefThisPersonMayBeGiven(ground as any, checkIn as any),
      /* ONLY THE TARGETS THIS PERSON MAY SEE (week 0). Every target went in, so on a check-in where
         people see only their own, each person's model was given everybody's numbers and could say
         them back. The same rule the brief on their screen uses. */
      /* And each one as a sentence about whoever set it, "you" for this person (decision 69). */
      objectives: this.theLeadsOwnWordsStayHers(ground, checkIn) ? [] : this.theTargetsAsSentences(this.theTargetsThisPersonMaySee(ground as any, checkIn as any, untoldHere) as any[], ground as any, checkIn.participantId),
      /* The same: never the lead's words about this person, in this person's own session (request 36). */
      priorContext: aRoleInTheirOwnWords(checkIn.participant as any),
      priorSession,
      lowSpecificityMultiDim,
      groundState,
      leadSignals,
      scenarioPackOverride,
    });

    // Returning user protocol: for session 2+, inject the most important unresolved
    // item from the prior session so the AI opens with it specifically.
    /*
     * NOT ON A CORRECTION, WHICH IS THE BUG SHE FOUND.
     *
     * "The chat about Zainab is one that is meant to clarify things about session 1, but it is
     * acting like a new session." It was. She pressed Correct it on session 1 and the conversation
     * opened with:
     *
     *   "In your first session, you set two standards for Zainab's first quarter... We're now in
     *    week five. How does her record look against those two things?"
     *
     * That is the RETURNING-SESSION opener, and it is a good one - for a returning session. A
     * correction is created at the next free session number, so it is always >= 2, so this block
     * built and injected "open with the most important unresolved item from last time" alongside
     * the self-correction block that says "open by naming that you are returning to session 1 and
     * ask what they want to change". Two openers in one prompt, and this one is concatenated LAST,
     * so it is the instruction the model acted on.
     *
     * The same guard already exists thirty lines further up, where the prior-entries replay is
     * skipped for a correction because the full-turn replay covers it. This is that rule, applied
     * to the other half.
     */
    let returningUserContext = '';
    if (checkIn.sessionNumber >= 2 && !checkIn.isSelfCorrection) {
      returningUserContext = await this.buildReturningUserContext(checkIn.participantId, checkIn.sessionNumber);
    }

    const [{ block: dynamicContext }, uploadedDocs, personTurnCount, pendingNotes, pendingDeliveries] = await Promise.all([
      this.context.build({
        groundId: checkIn.groundId,
        participantId: checkIn.participantId,
        sessionNumber: checkIn.sessionNumber,
        latestMessage,
        checkInId: checkIn.id,
      }),
      /**
       * THE SESSION MUST SEE THE SAME DOCUMENTS THE PERSON CAN SEE. W8-6.
       *
       * This asked for `participantId: checkIn.participantId` - the reader's own
       * uploads and nothing else. `documents.list` was moved onto
       * `documentWhereFor` so an OPEN document, the lead's brief or a grant's
       * terms, reaches everybody on the ground; this query was left behind. So a
       * participant could open the Context tab, read the brief the lead had
       * shared with them, start their check-in, and be interviewed by something
       * that had never seen it. The one case OPEN exists for was the one case it
       * did not reach.
       *
       * Same function as the list, so the two cannot drift, and it carries the
       * CONTEXT_ENABLED flag inside it - with the flag off this is byte for byte
       * the query above.
       */
      this.prisma.groundDocument.findMany({
        where: documentWhereFor(
          checkIn.groundId,
          { participantId: checkIn.participantId, isLead: ground.initiatorId === checkIn.participant.userId },
          this.config.get<boolean>('app.contextEnabled') === true,
        ) as any,
        /* `participant` too, so each document can say who provided it and whether everybody here
           can read it. Without that the block went in under one heading claiming the person being
           interviewed had written all of it - see where-this-document-came-from.ts. */
        select: {
          fileName: true, content: true, uploaderNote: true, visibility: true,
          participant: {
            select: {
              userId: true, email: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.conversationTurn.count({ where: { checkInId: checkIn.id, role: TurnRole.PERSON } }),
      /**
       * THINGS THEY WROTE DOWN BETWEEN SESSIONS, NOT YET RAISED.
       *
       * A note is not their account - see the ParticipantNote model. It reaches
       * the session as something to ASK about, and whatever they say under
       * questioning becomes the record through the normal path. `carriedInto`
       * null means no session has picked it up yet, so a note is raised once
       * rather than in every session from now on.
       */
      this.prisma.participantNote.findMany({
        where: { participantId: checkIn.participantId, carriedIntoCheckInId: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, text: true, createdAt: true },
      }),
      /**
       * WHAT THEY SAY THEY DELIVERED, NOT YET PUT BACK TO THEM.
       *
       * Same shape as a note and for the same reason - see
       * what-they-say-they-delivered.ts. A self-report is a claim to test, so it
       * reaches the session as something to ASK about and is stamped carried the
       * moment it is raised, once rather than every session after.
       */
      this.prisma.delivery.findMany({
        where: { participantId: checkIn.participantId, carriedIntoCheckInId: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, text: true, evidence: true, objective: { select: { text: true } } },
      }),
    ]);

    /*
     * WHAT THIS COMPANY SAYS ITS OWN PROCESS IS.
     *
     * Looked up from what they just said, which is the only honest query available - it is what the
     * conversation is about right now. Nothing comes back for a short answer, for an organisation
     * that has written nothing down, or when this service is not wired, and all three are ordinary.
     *
     * Best-effort throughout. A check-in must never fail because a handbook lookup did.
     */
    /*
     * WHAT THEIR OWN SYSTEMS RECORDED THIS PERIOD.
     *
     * Matched by the directory id their organisation already uses - the same identifier SCIM
     * pushes and the machine API sends - via the email their account and their `Person` row share.
     * Nothing is recorded against somebody who is not in the directory, which is the safe
     * direction: an unmatched record is invisible rather than attached to the wrong person.
     *
     * Best-effort and silent when nothing is connected, which is most organisations and every
     * check-in this product has run until now.
     */
    const theirRecords = await (async () => {
      const email = checkIn.participant.userId
        ? (await this.prisma.user.findUnique({ where: { id: checkIn.participant.userId }, select: { email: true } }))?.email
        : null;
      if (!email) return [] as any[];
      /* A guest's check-in never reads the records of an entry on the host's list that shares their address. See a-guest-is-never-somebody-on-the-hosts-list. */
      if (await isAGuestIn(this.prisma, ground.organizationId, { userId: checkIn.participant.userId, userEmail: email })) return [] as any[];
      const person = await this.prisma.person.findFirst({
        where: { organizationId: ground.organizationId, email },
        select: { externalId: true },
      });
      if (!person) return [] as any[];

      /* This period only. A quarter of somebody's activity is not context, it is an archive. */
      const since = new Date(Date.now() - 45 * 86_400_000);
      const rows = await this.prisma.interaction.findMany({
        where: { organizationId: ground.organizationId, personExternalId: person.externalId, happenedAt: { gte: since } },
        orderBy: { happenedAt: 'desc' },
        take: 40,
      });
      if (!rows.length) return [] as any[];

      /* Counterparty ids resolved to the names their own system gave them. */
      const ids = [...new Set(rows.map((r) => r.counterpartyExternalId).filter(Boolean))] as string[];
      const named = ids.length
        ? await this.prisma.subject.findMany({
          where: { organizationId: ground.organizationId, externalId: { in: ids }, type: 'COUNTERPARTY' as any },
          select: { externalId: true, title: true },
        })
        : [];
      const titleById = new Map(named.map((n) => [n.externalId, n.title]));

      return rows.map((r) => ({
        kind: r.kind as any,
        strength: r.strength as any,
        happenedAt: r.happenedAt,
        note: r.note,
        counterparty: r.counterpartyExternalId ? (titleById.get(r.counterpartyExternalId) ?? null) : null,
        sourceSystem: r.sourceSystem,
        disputed: !!r.disputedAt,
      }));
    })().catch(() => [] as any[]);
    const theirWeek = whatTheirWeekLooksLike(theirRecords as any, new Date());

    const lookUp = whatToLookUp(latestMessage);
    const companyCards = lookUp && this.knowledge
      ? await this.knowledge
          .covering(ground.organizationId, lookUp)
          .catch(() => [])
      : [];
    /*
     * AND WHAT THE ORGANISATION'S LEAD CONFIRMED IS TRUE OF THE WHOLE COMPANY (week 20). Context to
     * understand people with, in the same place as the written process and never mixed into it: it is
     * not something a person's account is compared with, and it is not quoted to anybody.
     */
    const keptForTheOrg = await keptForTheOrganisation(this.prisma, ground.organizationId, MOST_KEPT_IN_A_PROMPT).catch(() => []);
    const howWeDoIt = [howThisCompanyDoesIt(companyCards), whatTheOrganisationKeepsBlock(keptForTheOrg)].filter(Boolean).join('\n\n');

    /*
     * BOUNDED, AND HONEST ABOUT THE BOUND.
     *
     * This concatenated every visible document whole, every turn. Right for a two page brief, and
     * for a thirty page architecture document beside a twenty page spec it meant the model's
     * attention decided what mattered rather than anything here - silently. The session still
     * answers, still sounds informed, and has read whichever part survived.
     *
     * Silent is the whole problem. A session that read half a document and says so is one somebody
     * can work with; one that read half and behaves as though it read all of it is worse than one
     * that read none, because the person believes their document is in the room.
     *
     * NEWEST FIRST, because a document attached this session is almost always the one they are
     * about to talk about. This is not retrieval and does not pretend to be - chunking these
     * through the knowledge module is the real answer and a larger change than this one.
     */
    /*
     * WHERE EACH DOCUMENT CAME FROM, attached before anything is measured for room, so a document
     * that only half fits still says whose it is. The lead is resolved from the ground rather than
     * asked for again.
     */
    const nameOf = (u: { firstName: string | null; lastName: string | null } | null | undefined) =>
      [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || null;
    const withProvenance = uploadedDocs.map((d: any) => ({
      fileName: d.fileName,
      content: d.content,
      uploaderNote: d.uploaderNote,
      provenance: whereThisCameFrom({
        mine: d.participant?.userId === checkIn.participant.userId,
        /* Never an address as a name (28 Sep 2026): the model would say it back. */
        who: nameOf(d.participant?.user) ?? d.participant?.nameGiven ?? null,
        fromTheLead: !!d.participant?.userId && d.participant.userId === ground.initiatorId,
        sharedWithEveryone: d.visibility === 'OPEN',
      }),
    }));
    /* What they are talking about right now decides which passages of a long document go in. */
    const fitted = whatFitsInTheRoom([...withProvenance].reverse(), undefined, [latestMessage ?? '', (ground as any).brief ?? ''].join(' '));
    if (fitted.leftOut.length) {
      this.logger?.log?.(`Check-in ${checkIn.id}: documents that did not fit the prompt - ${fitted.leftOut.join(', ')}.`);
    }
    /*
     * THE HEADING WAS FALSE ABOUT MOST OF WHAT IT INTRODUCED.
     *
     * "uploaded by this party before the session" - said over the lead's brief, a grant's terms, an
     * admin's policy, every OPEN document anybody in the check-in has shared. Each document says
     * where it came from now, and the instructions say what to do with that.
     */
    const docContext = fitted.block
      ? 'DOCUMENTS THIS SESSION CAN READ:\n\n' + fitted.block
        + (fitted.leftOut.length ? `\n\n${tellThemWhatIsMissing(fitted.leftOut)}` : '')
        + `\n\n${WHAT_TO_DO_WITH_THESE}`
      : '';

    /*
     * AND THE ONE LINE WORTH PUTTING TO THEM THIS TURN, COMPUTED RATHER THAN HOPED FOR.
     *
     * Driven live, the instructions above got the session as far as noticing a mismatch and no
     * further: "Which is right? The plan could easily be out of date" - about a date it would not
     * name. Two absolutes in its own prompt forbid stating a date the person did not give, both
     * rightly, and the citation worth making is almost always a date. Writing an exception into the
     * timeframe rule did not beat them either. So the overlap is worked out here and the sentence
     * is handed over. See the-line-that-touches-what-they-said.ts.
     *
     * Only documents already marked shared with everyone: a private one is never quoted at anybody
     * and this never sees one.
     */
    const shareableForThisTurn = (uploadedDocs as any[])
      .filter((d) => d.visibility === 'OPEN')
      .map((d) => ({
        fileName: d.fileName,
        content: d.content ?? '',
        /* Never an address as a name (28 Sep 2026): the model would say it back. */
        who: nameOf(d.participant?.user) ?? d.participant?.nameGiven ?? null,
        fromTheLead: !!d.participant?.userId && d.participant.userId === ground.initiatorId,
      }));
    /*
     * THE FACT IS OURS TO PUT; THE QUESTION IS THE SESSION'S.
     *
     * See the-line-that-touches-what-they-said.ts. The quotation is written from the document and
     * shown to the person before the model's turn, because four attempts at making the model say it
     * - including exceptions written into both of the rules suppressing it - got as far as naming
     * the file and no further. The session is told the difference is already on the screen.
     */
    /*
     * AND WHETHER THE TWO SIDES HAVE BEEN ASKED THE SAME KIND OF THING.
     *
     * See the-same-burden-on-both-sides.ts. On a real two-party conflict one engineer was invited
     * to examine his own part and the other was asked to prove herself three times - both correct
     * turn by turn, and impartiality broken across the session. Neither could see it, because
     * neither reads the other's check-in.
     *
     * Only where there IS another side: on a solo check-in there is nothing to be uneven with.
     */
    /* `?? 0`: a ground read that did not select participants cannot tell one side from another, so
       there is nothing to compare and no query worth running. */
    /*
     * COUNTED FROM STAMPS, NOT FROM TEXT. Each AI turn records what it asked for when it is written
     * - see the-same-burden-on-both-sides.ts - so this reads tallies across the check-in without
     * ever loading one person's turns while answering another. The first version read the turns and
     * an existing guard refused it, correctly: an AI turn carries the person's own words reflected
     * back, and that must not cross between participants even in memory.
     */
    const burden = (ground.participants?.length ?? 0) > 1
      ? await (async () => {
        /*
         * A groupBy, DELIBERATELY, AND NOT A findMany.
         *
         * The rule next door is that a content-bearing turn load stays scoped to one check-in - an
         * AI turn carries the person's own words reflected back, so reading Fay's while answering
         * Eli is reading Fay's account into Eli's session. My first version was a ground-scoped
         * findMany and the guard refused it.
         *
         * A groupBy cannot return content: it returns the fields grouped on and a count, and there
         * is no way to widen it into a leak later without rewriting it into something else. The
         * participant is resolved from the check-ins already in hand rather than joined in.
         */
        const perCheckIn = await this.prisma.conversationTurn.groupBy({
          by: ['checkInId', 'askedFor'],
          where: { role: TurnRole.AI, askedFor: { not: null }, checkIn: { groundId: checkIn.groundId } },
          _count: { _all: true },
        });
        const whose = new Map<string, string>();
        for (const p of ground.participants ?? []) {
          for (const c of ((p as any).checkIns ?? [])) whose.set(c.id, p.id);
        }
        whose.set(checkIn.id, checkIn.participantId);
        const stamps: { participantId: string; askedFor: string | null }[] = [];
        for (const row of perCheckIn) {
          const pid = whose.get(row.checkInId);
          if (!pid) continue;
          for (let i = 0; i < row._count._all; i++) stamps.push({ participantId: pid, askedFor: row.askedFor });
        }
        return aDirectiveAboutTheBurden(countWhatWasAsked(stamps, checkIn.participantId));
      })()
      : '';

    const toPut = latestMessage ? whatToPutToThem(latestMessage, shareableForThisTurn) : null;
    const putThisToThem = toPut?.directive ?? '';
    /* Handed to the caller for this turn only. `composeSystemPrompt` returns a string and has three
       call sites; threading a second return value through all of them to carry one optional
       sentence would be a worse change than a keyed handoff that is written and read in the same
       request. Cleared by the reader. */
    if (toPut) this.citationForThisTurn.set(checkIn.id, toPut);
    else this.citationForThisTurn.delete(checkIn.id);

    // See between-session-notes.ts for why the wording is the mechanism. Kept in
    // its own file so the assembled text can be tested as text rather than as the
    // code that concatenates it.
    const notesBlock = buildNotesBlock(pendingNotes);

    // Same treatment, different claim: a note is a thought, a delivery is an assertion about work
    // done. Both reach the engine as questions to ask. See what-they-say-they-delivered.ts.
    const deliveriesBlock = buildDeliveriesBlock(
      pendingDeliveries.map((d) => ({ text: d.text, evidence: d.evidence, against: d.objective?.text ?? null })),
    );
    if (pendingDeliveries.length) {
      // Stamped on being PUT to them, exactly as a note is, so abandoning a session does not
      // re-raise the same claim every time after.
      await this.prisma.delivery
        .updateMany({
          where: { id: { in: pendingDeliveries.map((d) => d.id) } },
          data: { carriedIntoCheckInId: checkIn.id },
        })
        .catch((e) => this.logger.error(`Could not mark deliveries carried for check-in ${checkIn.id}: ${e?.message ?? e}`));
    }

    if (pendingNotes.length) {
      // Stamped now rather than on completion: a note that has been PUT to somebody
      // has been raised, whether or not they finish the session. Otherwise abandoning
      // a session would re-raise the same note next time and every time after.
      await this.prisma.participantNote
        .updateMany({
          where: { id: { in: pendingNotes.map((n) => n.id) } },
          data: { carriedIntoCheckInId: checkIn.id },
        })
        .catch((e) => this.logger.error(`Could not mark notes carried for check-in ${checkIn.id}: ${e?.message ?? e}`));
    }

    /* Not in a one-time session: nobody there is evidencing anything to anybody, and "attach the brief"
       to a business owner asked where they would expand is the product asking for homework again. */
    const docPromptHint =
      personTurnCount >= 2 && uploadedDocs.length === 0 && (ground as any).cadence !== Cadence.ONE_TIME
        ? `DOC_PROMPT_HINT: At a natural moment in your next response - when the conversation has reached a point where something is described but not evidenced - say something like: "There is probably something in writing that captures this. A brief, a plan, an email exchange. If you have it, attach it using the button at the bottom - I want to know what it shows." Weave it in as one sentence. Do not make it an agenda item or a request. Only if it fits naturally.`
        : '';

    // Clarification session context: when this check-in is correcting a specific
    // inference the participant flagged, inject the inference text so the AI opens
    // on that specific claim rather than the standard opener.
    let clarificationContext = '';
    if (checkIn.isClarification && checkIn.clarificationTarget) {
      const report = await this.prisma.report.findUnique({ where: { groundId: checkIn.groundId }, select: { inferences: true } });
      const inferenceList = (report?.inferences ?? []) as Array<{ id: string; text: string; participantLabel: string; reason: string }>;
      const inference = inferenceList.find(i => i.id === checkIn.clarificationTarget);
      if (inference) {
        clarificationContext = `CLARIFICATION SESSION - the participant flagged the following inference in the report as inaccurate:

"${inference.text}"

This was inferred because: ${inference.reason}

Open the session by naming this specific inference directly. Do NOT ask the standard opener. Instead say something like: "In your last report, we wrote that [inference text]. You said that wasn't accurate. Tell me what was actually happening." Then use the standard probes and extraction rules. Record only what they explicitly say. Do not re-infer. The goal is to replace the inferred claim with the participant's own words.`;
      }
    }

    // Self-correction session context: when this check-in is correcting the
    // participant's OWN prior session (not a shared-report inference), inject
    // what they said in that session so the AI opens by asking what needs to
    // change, rather than starting a fresh, unrelated conversation.
    let selfCorrectionContext = '';
    if (checkIn.isSelfCorrection && checkIn.selfCorrectionTargetSession != null) {
      const targetEntries = await this.prisma.recordEntry.findMany({
        where: { participantId: checkIn.participantId, checkIn: { sessionNumber: checkIn.selfCorrectionTargetSession } },
        orderBy: { createdAt: 'asc' },
        select: { type: true, text: true },
      });
      if (targetEntries.length) {
        const summary = targetEntries.map(e => `(${e.type}) ${e.text}`).join('\n');
        selfCorrectionContext = `SELF-CORRECTION SESSION - the participant is returning to correct or add to what they said in session ${checkIn.selfCorrectionTargetSession}:

${summary}

Open the session by naming that you're returning to session ${checkIn.selfCorrectionTargetSession}, and ask directly what they'd like to correct or add. Do NOT ask the standard opener. Once they've told you, use the standard probes to get specifics, then close normally. This session's record is what carries the correction - the original session's record is not deleted or edited, so be clear this is an update, not an erasure.`;
      }
    }

    /*
     * HOW LONG THIS RUNS, so "how do i know if we are done" can be answered with the run rather than
     * with a summary of the conversation - see when-this-is-over.ts. Three facts already on the
     * ground; none of them had ever reached the model.
     */
    /* Their hedge, kept, on the turn they make one - see keepTheirHedge. */
    const theirHedge = keepTheirHedge(whatTheyHedged(latestMessage));
    /* And the one line that says they just asked, last of all - see when-this-is-over.ts. */
    const askedWhenThisEnds = theyAskedWhenThisIsOver(latestMessage) ? THE_RUN_IS_WHAT_THEY_ASKED_ABOUT : '';
    const howLongThisRuns = whenThisIsOver({
      sessionNumber: checkIn.sessionNumber ?? 1,
      roundsPlanned: totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null,
      endsOn: deadlineOf(ground as any),
      runsUntilEnded: !!(ground as any).runsUntilEnded,
    });

    /*
     * WHAT THE CONTEXT ALREADY HOLDS, IN THE CONVERSATION THAT ASKS ABOUT IT.
     *
     * Her instruction, 22 September 2026: "make sure it is used as context in the conversations." A
     * lead had pasted a quarter in - actions, questions for named people, what sits between two of
     * them, a list of what is explicitly not settled - and a check-in could see none of it. Each
     * piece arrives with the rule that keeps it honest; the rules are in what-the-context-already-holds.
     */
    const isTheLead = checkIn.participant.partyType === PartyType.INITIATOR;
    const commitmentRows = await (this.prisma.groundCommitment?.findMany?.({
      where: { groundId: checkIn.groundId },
      select: { text: true, whenSaid: true, explicit: true, participantId: true, status: true },
      orderBy: { createdAt: 'asc' },
      take: 40,
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
    const mine = (commitmentRows as any[]).filter((c) => c.participantId === checkIn.participantId && c.status === 'UNKNOWN');
    const ownerless = (commitmentRows as any[]).filter((c) => !c.participantId && c.status === 'UNKNOWN').map((c) => c.text as string);
    const theirCommitments = whatTheySaidTheyWouldDo(mine.map((c) => ({ text: c.text, when: c.whenSaid, explicit: c.explicit })));
    /* The unowned list is the lead's to place, and nobody else's to be asked about. */
    const nobodyOwns = isTheLead ? thingsNobodyOwns(ownerless) : '';

    /*
     * WHAT THE CHECK-IN KNOWS, BY KIND, FROM THE LINES THEMSELVES.
     *
     * This used to parse the opening sentence of four long notes to work out what each blob was. The
     * lines carry their own kind now - see GroundContextItem - so nothing here depends on wording.
     */
    /*
     * NOTHING THE LEAD WROTE PRIVATELY ABOUT A PERSON, AND LEFT OUT AT THE READ. Decision 32, 27
     * September 2026: "A lead's private notes about a person never reach the model in that person's
     * own session. They are left out of what that session is given, not kept back by an instruction
     * to the model."
     *
     * The capability check put "She may leave after Q4 because of the commute" - a line the lead had
     * asked to go to nobody - into Ngozi's own check-in, under an instruction that it was "never
     * quoted". So the lead's read of a person (ABOUT_A_PERSON) is not read into any check-in, and the
     * lead's account of something between two people (BETWEEN_PEOPLE, always the lead's only) is read
     * into the lead's own check-in and nobody else's. Neither is in the rows, so no sentence about
     * them has to hold. A question the lead wants put to somebody (QUESTION_FOR_PERSON) still arrives,
     * because being asked is what it is for.
     */
    const contextLines = await (this.prisma.groundContextItem?.findMany?.({
      where: {
        groundId: checkIn.groundId,
        closedAt: null,
        kind: { notIn: (isTheLead ? ['ABOUT_A_PERSON'] : ['ABOUT_A_PERSON', 'BETWEEN_PEOPLE']) as any },
        /* A question the lead has not confirmed word for word is not read into anybody's session.
           Decision 34 - see grounds/a-question-asked-word-for-word. */
        NOT: [
          { kind: 'QUESTION_FOR_PERSON' as any, questionConfirmedAt: null },
          { kind: 'QUESTION_FOR_PERSON' as any, exactQuestion: null },
        ],
      },
      select: { kind: true, text: true, aboutParticipantId: true, exactQuestion: true, questionConfirmedAt: true },
      orderBy: { createdAt: 'asc' },
      take: 80,
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
    /* A file only its owner can open is not named in anybody else's check-in, including on notes
       already stored with the name in them (request 46; see a-private-file-is-not-named). */
    const privateFileNamesHere = isTheLead ? [] : namesNotEverybodyMayOpen(
      await (this.prisma.groundDocument?.findMany?.({ where: { groundId: checkIn.groundId }, select: { fileName: true, visibility: true } }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
    );
    const ofKind = (kind: string, aboutMe?: boolean) => (contextLines as any[])
      .filter((l) => l.kind === kind && (aboutMe === undefined || (aboutMe ? l.aboutParticipantId === checkIn.participantId : !l.aboutParticipantId)))
      .map((l) => withoutPrivateFileNames((l.text ?? '').trim(), privateFileNamesHere))
      .filter(Boolean);
    const notSettledLines = ofKind('UNSETTLED');
    /*
     * THE LEAD'S QUESTIONS FOR THIS PERSON, AS THE SENTENCES THE LEAD CONFIRMED, AND NEVER TWICE.
     *
     * Decision 34, 28 September 2026. `text` is the lead's shorthand and is never read into a session;
     * the confirmed `exactQuestion` is, and only where it was confirmed - checked here as well as in
     * the query, so a row that reaches this without both is still not asked. One already asked in any
     * of this person's check-ins on this ground is left out, and the rest are kept for the reply path,
     * which puts the confirmed words back where the model used its own.
     */
    const confirmedForMe = (contextLines as any[])
      .filter((l) => l.kind === 'QUESTION_FOR_PERSON' && l.aboutParticipantId === checkIn.participantId && l.questionConfirmedAt && (l.exactQuestion ?? '').trim())
      .map((l) => (l.exactQuestion as string).trim());
    let askThemLines: string[] = [];
    if (confirmedForMe.length) {
      const mineOnThisGround = await (this.prisma.checkIn?.findMany?.({
        where: { participantId: checkIn.participantId },
        select: { id: true },
      }) ?? Promise.resolve([] as { id: string }[])).catch(() => [] as { id: string }[]);
      const ids = [...new Set([checkIn.id, ...(mineOnThisGround as { id: string }[]).map((c) => c.id)])];
      const saidSoFar = await (this.prisma.conversationTurn?.findMany?.({
        where: { checkInId: { in: ids }, role: TurnRole.AI },
        select: { content: true },
        take: 400,
      }) ?? Promise.resolve([] as { content: string | null }[])).catch(() => [] as { content: string | null }[]);
      askThemLines = confirmedForMe.filter((q) => !alreadyAsked((saidSoFar as any[]).map((t) => t.content ?? ''), q));
    }
    if (askThemLines.length) this.questionsForThisTurn.set(checkIn.id, askThemLines);
    else this.questionsForThisTurn.delete(checkIn.id);
    /* A pair line names both people in its own text, so this person's own name is the test. */
    const myName = [
      (checkIn.participant as any).user?.firstName,
      (checkIn.participant as any).user?.lastName,
      (checkIn.participant as any).nameGiven,
      (checkIn.participant as any).email,
    ].map((n) => (n ?? '').trim()).filter((n) => n.length >= 3);
    const betweenLines = (contextLines as any[])
      .filter((l) => l.kind === 'BETWEEN_PEOPLE')
      .map((l) => (l.text ?? '').trim())
      .filter((t) => t && (isTheLead || myName.some((n) => t.toLowerCase().includes(n.toLowerCase()))));
    /* And the work buckets a session is better for knowing: how this team says it sells and works. */
    const howWeWorkLines = [...ofKind('STRATEGY'), ...ofKind('WAY_OF_WORKING')];
    const notSettledBlock = whatIsNotSettled(notSettledLines);
    const leadsQuestions = theQuestionsTheLeadWants(askThemLines);
    const betweenBlock = whatSitsBetweenPeople(betweenLines);
    /* Shared by design: a person answering should know what this team says it is doing. */
    const howWeWork = howThisTeamWorks(howWeWorkLines);

    /*
     * WHAT THEY HAVE NOT SAID YET. See asking-for-what-they-left-out: Grace named three banks and
     * Peter talked about Equity only, in four runs of five; Tobi and Hana told the Meridian story
     * without the when. Read off this session's turns against what the check-in is about, and fed
     * in as context for the next question. Not on the opener: nobody has said anything yet.
     *
     * Where a set can come from: the brief, the goals this person can already see, their own
     * objectives, what the team has written down for everybody, the lead's confirmed questions, and
     * - for a participant on a shared check-in where the lead's expectation is said out loud - the
     * lead's own words in their check-in on this ground, which people in the check-in may read.
     * Only the names in a list are taken, never the lead's sentence, and never a person's name.
     */
    const heldBack = how?.forTheOpener ? '' : await (async () => {
      const lead = (ground.participants ?? []).find((p: any) => p.partyType === PartyType.INITIATOR) as any;
      const leadName = theFirstNameFrom(lead?.user?.firstName, lead?.user?.lastName);
      const namedIn: { text: string; namedBy: string }[] = [];
      /* Not on an evaluation or a cohort, where what the lead says in her own check-in is mostly about the people in it. */
      const mayUseTheLeadsWords = !isTheLead && lead?.id && (ground as any).mode === 'SHARED' && (ground as any).participantsHearTheLeadsExpectation !== false && peersMayBeNamed;
      if (mayUseTheLeadsWords) {
        const theLeadSaid = await (this.prisma.conversationTurn?.findMany?.({
          where: { role: TurnRole.PERSON, checkIn: { groundId: checkIn.groundId, participantId: lead.id, sessionNumber: { lte: checkIn.sessionNumber ?? 1 } } },
          orderBy: { createdAt: 'asc' },
          select: { content: true },
          take: 60,
        }) ?? Promise.resolve([] as { content: string | null }[])).catch(() => [] as { content: string | null }[]);
        for (const t of theLeadSaid as { content: string | null }[]) if (t.content?.trim()) namedIn.push({ text: t.content, namedBy: `${leadName ?? 'The person who set this up'} named` });
      }
      if ((ground as any).brief?.trim()) namedIn.push({ text: (ground as any).brief, namedBy: 'The brief for this check-in names' });
      for (const o of objectivesOnRecord as any[]) {
        if (o.ownerParticipantId && o.ownerParticipantId !== checkIn.participantId) continue;
        if (o.name?.trim()) namedIn.push({ text: o.name, namedBy: 'A goal on this check-in names' });
      }
      for (const o of personObjectives as any[]) if (o.text?.trim()) namedIn.push({ text: o.text, namedBy: 'Your objective names' });
      for (const l of [...howWeWorkLines, ...notSettledLines, ...askThemLines]) namedIn.push({ text: l, namedBy: 'What this team has written down names' });
      const peopleHere = (ground.participants ?? []).flatMap((p: any) => [p.user?.firstName, p.user?.lastName, p.nameGiven]).map((n: any) => String(n ?? '').trim()).filter(Boolean);
      const set = theSetTheySpokeToPartOf(namedIn, turnsThisSession, peopleHere);
      const withoutWhen = whatTheyToldWithoutWhen(turnsThisSession);
      if (set) this.logger.log(`Check-in ${checkIn.id}: spoke about ${set.spokeAbout.join(', ')} of ${set.all.join(', ')}; asking about the rest.`);
      if (withoutWhen.length) this.logger.log(`Check-in ${checkIn.id}: ${withoutWhen.length} thing(s) told without when; asking when.`);
      return askForWhatTheyLeftOut(set, withoutWhen, theFirstNameFrom((checkIn.participant as any)?.user?.firstName, (checkIn.participant as any)?.user?.lastName));
    })().catch((err: any) => {
      this.logger.warn(`What was left out could not be read for ${checkIn.id}: ${err?.message}`);
      return '';
    });

    /* Asking for proof kindly: task 2.5, week 4. Not in the opener, which has nothing of theirs yet. */
    const proofKindly = how?.forTheOpener ? '' : askForProofKindly(aClaimNothingShowsYet(turnsThisSession as any));

    /*
     * WHERE THIS CHECK-IN IS, AND WHETHER THEY HAVE BEEN ASKED WHAT THEY WILL DO. Context, never the
     * question itself: from the sixth answer, while it is still unasked, the model is told how far in
     * it is and that the next session can only test what is said here. See
     * what-they-will-do-is-asked-before-the-end.
     */
    const whereItIs = how?.forTheOpener ? '' : whereTheCheckInIs({
      personTurns: turnsThisSession.filter((t) => t.role === 'PERSON').map((t) => t.content),
      aiTurns: turnsThisSession.filter((t) => t.role === 'AI').map((t) => t.content),
      oneTime: (ground as any).cadence === Cadence.ONE_TIME,
      isLead: isTheLead,
      notACheckIn: !!checkIn.isSelfCorrection || !!checkIn.isClarification || ground.scenario === 'TEAM_UPDATES',
      askedToFinish: askedToFinish(latestMessage ? [latestMessage] : []),
    });

    // FINAL SESSION: same conversation, flagged closing. The block adds the
    // four closing probes and the thoroughness framing; assessment targets are
    // the pre-agreed resolutionState when set, else the party's own session-1
    // SUCCESS_DEFINITION entries (entry-flow grounds have no resolutionState).
    let finalSessionContext = '';
    if ((checkIn as any).isFinal) {
      const ground = await this.prisma.ground.findUnique({
        where: { id: checkIn.groundId },
        select: { scenario: true, resolutionState: true } as any,
      });
      let target = (ground as any)?.resolutionState as string | null;
      if (!target) {
        const defs = await this.prisma.recordEntry.findMany({
          where: { participantId: checkIn.participantId, type: 'SUCCESS_DEFINITION' as any },
          orderBy: { createdAt: 'asc' },
          take: 5,
          select: { text: true },
        });
        target = defs.length ? defs.map(d => `- ${d.text}`).join('\n') : null;
      }
      const endStates = ground ? endStatesFor((ground as any).scenario).map(o => o.label).join(' / ') : '';
      /* Not "for this ground": the word swap that keeps "ground" off the screen turned it into "your closing check-in for this check-in" (run 6, 20 Sep 2026). */
      finalSessionContext = `FINAL SESSION - this is their CLOSING check-in, the last one of this period. OPEN THE SESSION by saying so, plainly, in your first message - before anything else: this is their closing check-in, the last word on the record, and what they document here is what the final report weighs, so it is worth being thorough. Never say "for this check-in" or "of this check-in" after "closing check-in". This overrides any other opener instruction (including the returning-user opener); weave the usual continuity in AFTER naming the closing. Same conversation as always - no new format.

Work through, woven naturally into the conversation, not as a checklist:
1. FINAL STATE vs THE TARGET. The target on record:
${target ?? 'No target was agreed beforehand. Ask the person what success was supposed to look like when this started, then measure their account against their own answer.'}
Ask where things actually landed against that, in their words.
2. DELIVERED vs AGREED. For each thing they say was delivered: what exists, and what shows it? Ask for the artifact. If something is described but not evidenced, say plainly that a document would carry more weight than memory, and invite an upload.
3. WHAT REMAINS OPEN. Unfinished items, handovers, loose ends - get them named, not smoothed over.
4. THE REVISION DOOR. Ask once, near the end: is there anything in their earlier record they would correct before the ground closes? If yes, take the correction now.

The ground will close toward one of these end states: ${endStates || 'the parties will define the end state'}. Do NOT push them to pick one - that choice happens in the resolution step with the other party. Your job is the honest account it will rest on.`;
    }

    // Role-tuned probing. RUNTIME, not seeded: detectedFunction is per-person and
    // revised over sessions, so it cannot live in the per-scenario DB seeds. It is
    // also deliberately NOT in ENGINE_RULES - that prompt is invariant-checked and
    // reseeded on boot, and a bad edit there hard-fails startup.
    //
    // Adds nothing at all when the function is unknown or confidence is low, so an
    // uncertain profile never produces coaching from a guess.
    const roleRead = await this.roleReadForThisTurn(checkIn as any, latestMessage);
    const roleProbeBlock = buildRoleProbeBlock(roleRead.fn, roleRead.confidence, roleRead.modes);
    /* A role guessed with low confidence is confirmed before it is used (decision 57, item 5). */
    const roleConfirmationBlock = await this.roleConfirmationBlockFor(checkIn.participantId, roleRead.fn, roleRead.confidence, checkIn.sessionNumber);

    /**
     * G42. THE COACHING STEP, AND THE FIRST TIME ANYTHING HAS READ THESE ROWS.
     *
     * ON, everywhere. This comment used to say "behind COACHING_ENABLED, off in
     * every environment" while coachingEnabled() returned true, and the comment was
     * the wrong one: the block has been reaching live prompts since it was wired.
     * There is no flag. It still adds nothing at all when there is no step to raise.
     *
     * It also adds nothing when there is no step to raise, which is most sessions.
     * A coaching block that always has something in it is a product that always
     * has something to say about you.
     */
    const coachingBlock = await this.coachingBlock(checkIn.participantId, checkIn.sessionNumber);

    /*
     * WHAT KEEPS HAPPENING, AS A QUESTION.
     *
     * The pattern library has carried a `probe` on every code from the start - the ordinary
     * question to ask about the work when that thing keeps coming up - and it reached exactly one
     * caller: the board, as a suggestion to a LEAD. So the person it is about was never asked
     * anything, and the one surface that could ask naturally, in the moment, with their own words
     * still on the screen, was the one surface that never saw it.
     *
     * Same failure mode as the coaching block above: a chain that runs in full and says nothing to
     * anybody. Gated on SURFACED and two periods, one question at most, and never named.
     */
    const patternProbeBlock = await this.whatKeepsHappeningBlock(checkIn.participantId);
    /*
     * AND THE HOLE IN WHAT THEY HAVE ALREADY SAID, WHICH IS WHAT THE NOTES ARE FOR.
     *
     * The conversation asked the next unasked item on the brief. It now asks about the most useful
     * thing missing from what somebody has actually said - a target with no way to verify it, a
     * change with no starting point, a plan nobody owns - because that is the question whose answer
     * decides whether any of the rest can be claimed at the end. See what-we-have-so-far.
     *
     * The brief is still the floor: where nothing is missing, this block is empty and the pack's
     * own questions carry the turn as before.
     */
    /*
     * BREADTH AGAINST DEPTH, AND BOTH ARE ALWAYS IN PLAY.
     *
     * `whatToAskAbout` pushes on a hole in what somebody said - a target with no way to verify it,
     * a change with no baseline. Left alone it will spend a whole check-in sharpening one claim
     * while seven of the brief's subjects go unasked, which is the complaint this started from:
     * "the questions dont help us get what we want". See the-ground-the-brief-asks-us-to-cover.
     */
    /*
     * AND THE NOTE FROM THE LAST TURN HAS TO HAVE LANDED, OR NONE OF THIS IS WORTH ANYTHING.
     *
     * Read live on 23 September 2026: six answers, and a minute after the conversation had closed
     * the notes were perfect - every claim, the 30,000 smallholders, the 30% income target, and the
     * challenge about which half of that income they meant. All of it arrived too late to be asked.
     * The note is fire-and-forget and was taking fifteen seconds; she answered every three. So the
     * whole apparatus - the claims, the coverage, the challenge - was permanently one turn behind a
     * conversation that only had six.
     *
     * So this turn waits for the last turn's note, and the row is read again afterwards rather than
     * trusting the copy fetched before the wait. With the note itself now fast, a person who pauses
     * to type waits for nothing; the wait only ever costs anything to somebody answering faster
     * than they could read. It is bounded, because a hung note must never hold a conversation.
     */
    await this.theNoteFromTheLastTurnLands(checkIn.id);
    const notes = await this.prisma.checkIn
      .findUnique({ where: { id: checkIn.id }, select: { whatWeHave: true } })
      .then((row) => ((row as any)?.whatWeHave as WhatWeHave) ?? null)
      .catch(() => ((checkIn as any).whatWeHave as WhatWeHave) ?? null);
    const subjects = await this.theSubjectsToCover(checkIn.groundId).catch(() => [] as ASubject[]);
    const theirAnswers = await this.prisma.conversationTurn
      .findMany({ where: { checkInId: checkIn.id, role: TurnRole.PERSON }, select: { content: true } })
      .then((rows) => rows.map((r) => r.content ?? ''))
      .catch(() => [] as string[]);
    /*
     * AND WHAT THEY ASKED FOR COMES FIRST, BEFORE EITHER.
     *
     * The brief promises them they can direct this conversation. A product that then asks its own
     * next question has broken a promise it made before they typed anything, which is worse than
     * never having offered. Their steer is dropped from the rank only once they have actually
     * talked about it - decided by the same coverage rule as everything else.
     */
    const frame = await this.theFrameFor(checkIn.groundId).catch(() => [] as AField[]);
    const theHole = this.whichHoleToPush(notes, subjects, theirAnswers, frame).text;

    /*
     * AND ONE THING THE ROOM ALREADY KNOWS THAT THEY DO NOT.
     *
     * The conversation gives nothing back until the report, which is read afterwards and alone. This
     * is the first block that trades: they name a thing in the way, and the reply can tell them
     * somebody else is waiting on the same thing and nobody owns it. Drawn only from handoffs that
     * already render on the shared board, so it reveals nothing, and only on a shared ground.
     * See what-the-room-already-knows.ts.
     */
    const roomKnows = await this.whatTheRoomAlreadyKnows(checkIn, latestMessage ?? '');

    /*
     * AND WHERE THEIR OWN NUMBER LEAVES THEM, when they have just said one. The safest trade in the
     * product: her number against her target, nothing about anybody else. See where-that-leaves-them.
     */
    const againstTheirNumber = await this.whereTheirNumberLeavesThem(checkIn, latestMessage ?? '');

    /*
     * AND WHAT THEY HAVE ALREADY SAID ABOUT SOMEBODY THEY JUST NAMED, including whether that person
     * knows. Nothing here crosses the wall: an expectation is written for the person it is about and
     * published to them. See you-have-already-said-this-about-them.ts.
     */
    const alreadySaidAboutThem = await this.whatIsAlreadyOnSomebodyTheyNamed(checkIn, latestMessage ?? '');

    /*
     * AND ONLY ONE OF THEM REACHES THE TURN. Each block refuses to hand over more than one fact and
     * none of them knew about the others, so a single sentence from a lead came back carrying all
     * three - a briefing with a question stapled to the end. Found by running one turn; every block
     * passed its own tests. See one-thing-back-not-three.ts.
     */
    const theOneThingBack = oneThingBack({ againstTheirNumber, alreadySaidAboutThem, roomKnows });

    /*
     * AND THE ONE THING THIS CHECK-IN IS MISSING, SAID BEFORE SESSION 1 CLOSES.
     *
     * "I want the chat and the first session to give me an insight into something i need to do
     * better in the conversation like setting the targets per person and telling them." Nothing
     * did, and the reason was exact: the coach only speaks where a step is already outstanding from
     * an EARLIER session, so session 1 could never say anything. That guard is right; what was
     * missing is a source for the session that has no history yet.
     *
     * Only the person who runs the check-in gets it - a participant is not the one who divides the
     * objective up - and only where something is genuinely missing. See what-this-session-is-missing.
     */
    /*
     * AND THE FLOOR UNDER ALL OF IT: NO SESSION GIVES BACK NOTHING.
     *
     * Part 5. The three give-backs above are better than this when they fire, and they need data
     * the first session does not have, so the session where somebody most needs a reason to keep
     * going was the session that gave them least. This runs only where they all came back empty
     * and the conversation has gone far enough that silence is what the person is getting.
     *
     * The bar is hers: something they could not have said themselves. Not a number they just gave,
     * handed back. See something-they-could-not-have-said-themselves.
     */
    const theFloorGiveBack = await (async () => {
      if (theOneThingBack) return '';
      const [board, mine, turns] = await Promise.all([
        (this.prisma.groundObjective?.findMany?.({
          where: { groundId: checkIn.groundId }, select: { target: true, name: true, ownerParticipantId: true },
        }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
        (this.prisma.personObjective?.findMany?.({
          where: { groundId: checkIn.groundId, participantId: checkIn.participantId }, select: { dueDate: true },
        }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
        (this.prisma.conversationTurn?.findMany?.({
          where: { checkInId: checkIn.id }, select: { role: true, content: true },
        }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
      ]);
      const answers = (turns as any[]).filter((t: any) => t.role === TurnRole.PERSON);
      const aiSaid = (turns as any[]).filter((t: any) => t.role === TurnRole.AI).map((t: any) => t.content ?? '');
      const owned = (board as any[]).filter((o: any) => o.ownerParticipantId && typeof o.target === 'number');
      const whole = (board as any[]).find((o: any) => !o.ownerParticipantId && typeof o.target === 'number');
      const theirs = owned.find((o: any) => o.ownerParticipantId === checkIn.participantId);
      const due = (mine as any[]).map((m: any) => m.dueDate).find(Boolean);
      const daysLeft = due ? Math.ceil((new Date(due).getTime() - Date.now()) / 86400000) : null;
      /* Where their own number stands, taken only from a figure they said next to a now-word. */
      const standing = theNumbersIn(
        answers.map((t: any) => t.content ?? '').filter((c: string) => saysWhereItStands(c)).join(' '),
      );
      return somethingTheyCouldNotHaveSaid({
        whole: whole ? { name: whole.name, target: whole.target } : null,
        parts: owned.map((o: any) => ({ target: o.target, theirs: o.ownerParticipantId === checkIn.participantId })),
        standsAt: standing.length ? Math.max(...standing) : null,
        theirTarget: theirs?.target ?? null,
        daysLeft,
        answersSoFar: answers.length,
        /* Once this session has handed something back, it has met the floor. */
        gaveSomethingAlready: aiSaid.some((line: string) => /\bthat is [\d,]+ short\b|\ba week from here\b/i.test(line)),
        somethingBetterFired: false,
      }) ?? '';
    })();

    /*
     * AND THE TWO QUESTIONS A NUMBER NEEDS, ASKED IN THE MIDDLE RATHER THAN NOTED AT THE END.
     *
     * 3.2 and 3.4 on her list, and they are the same fault twice: the product took a number and
     * asked nothing that would make it checkable next time. Who carries which part of it, and
     * where it stands today. The close already says the first one is worth doing before the next
     * check-in - a note about what to go and do, where a question they could answer in the moment
     * was what was wanted.
     *
     * Both are the lead's, both fire at most once, and both take "not decided" and "I do not know"
     * as real answers. See who-carries-which-part and a-number-with-no-starting-point.
     */
    const numbersAndOwners = await (async () => {
      const leadsSession = !!ground?.initiatorId && ground.initiatorId === (checkIn as any)?.participant?.userId;
      if (!leadsSession) return { whoCarries: '', whereItStands: '' };
      const [board, owned, said] = await Promise.all([
        (this.prisma.groundObjective?.findMany?.({
          where: { groundId: checkIn.groundId },
          select: { name: true, target: true, ownerParticipantId: true },
        }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
        (this.prisma.personObjective?.findMany?.({
          where: { groundId: checkIn.groundId }, select: { participantId: true, text: true },
        }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
        (this.prisma.conversationTurn?.findMany?.({
          where: { checkInId: checkIn.id, role: TurnRole.AI }, select: { content: true },
        }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
      ]);
      const aiSoFar = (said as any[]).map((t: any) => t.content ?? '');
      const others = (ground?.participants ?? [])
        .filter((p: any) => p.id !== checkIn.participantId && !p.managingOnly)
        /* A name only, never the lead's description of them (request 36): somebody with no name is left out of the list. */
        .map((p: any) => [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim() || '')
        .filter(Boolean);
      const whoCarries = askWhoCarriesWhichPart({
        sharedNumbers: (board as any[]).filter((o: any) => !o.ownerParticipantId).map((o: any) => ({ name: o.name, target: o.target })),
        peopleWithANumberOfTheirOwn: new Set((board as any[]).filter((o: any) => o.ownerParticipantId).map((o: any) => o.ownerParticipantId)).size,
        peopleNamed: others,
        theyRunIt: true,
        alreadyAsked: alreadyAskedWhoCarriesWhat(aiSoFar),
      }) ?? '';
      /* A starting point is known once anything on record says where the thing stands. */
      const standingSaid = (owned as any[]).some((o: any) => saysWhereItStands(o.text ?? ''))
        || aiSoFar.some((line) => saysWhereItStands(line));
      const whereItStands = askWhereTheNumberStands(
        (board as any[]).map((o: any) => ({
          name: o.name,
          target: o.target ?? 0,
          theirs: !o.ownerParticipantId || o.ownerParticipantId === checkIn.participantId,
          baselineKnown: standingSaid,
        })),
        latestMessage ?? '',
      ) ?? '';
      /* One of the two per turn. Two instructions about the same number is the briefing fault. */
      return whoCarries ? { whoCarries, whereItStands: '' } : { whoCarries: '', whereItStands };
    })();

    const oneThingToDoBetter = checkIn.sessionNumber === 1
      ? theOneThingToDoBetter({
          /*
           * The board's objectives carry the numbers; the dates live on the per-person
           * expectations, which is a different table. Both are needed: a number with no date is one
           * of the four things this looks for.
           */
          objectives: await (async () => {
            /* Optional-chained: a property access on a client without the model throws before any
               `.catch` can see it, and none of this may be the reason a check-in cannot start. */
            const [board, expectations] = await Promise.all([
              (this.prisma.groundObjective?.findMany?.({
                where: { groundId: checkIn.groundId },
                select: { name: true, target: true, ownerParticipantId: true },
              }) ?? Promise.resolve([])).catch(() => [] as any[]),
              (this.prisma.personObjective?.findMany?.({
                where: { groundId: checkIn.groundId }, select: { participantId: true, dueDate: true },
              }) ?? Promise.resolve([])).catch(() => [] as any[]),
            ]);
            const dated = new Map(expectations.map((e: any) => [e.participantId, e.dueDate]));
            return board.map((o: any) => ({ ...o, dueDate: dated.get(o.ownerParticipantId) ?? null }));
          })(),
          peopleInIt: await (this.prisma.groundParticipant?.count?.({
            where: { groundId: checkIn.groundId, managingOnly: false },
          }) ?? Promise.resolve(0)).catch(() => 0),
          theyRunIt: !!ground?.initiatorId && ground.initiatorId === (checkIn as any)?.participant?.userId,
          anythingDocumented: await (this.prisma.groundDocument?.count?.({
            where: { participantId: checkIn.participantId },
          }) ?? Promise.resolve(0)).then((n: number) => n > 0).catch(() => false),
          /*
           * AND WHEN, WHICH IS THE HALF THAT WAS MISSING. The note went into every turn of session
           * 1 and came out twice in a row, mid-interview. It is due only once the session could
           * close, and only if no turn is already carrying it.
           */
          ...(await (this.prisma.conversationTurn?.findMany?.({
            where: { checkInId: checkIn.id },
            orderBy: { createdAt: 'asc' },
            select: { role: true, content: true },
          }) ?? Promise.resolve([] as any[]))
            .catch(() => [] as any[])
            .then((rows: any[]) => ({
              answersSoFar: rows.filter((r) => r.role === TurnRole.PERSON).length,
              alreadySaidThisSession: rows.filter((r) => r.role === TurnRole.AI).map((r) => r.content ?? ''),
            }))),
        })
      : null;

    /*
     * WHAT IT HAS JUST BEEN DOING, SAID AT THE MOMENT IT MATTERS.
     *
     * The rhythm rule sits near the top of a long prompt and the number did not move: 76% of turns
     * ended on a question before it, 80% after. A description of its own last three turns is harder
     * to read past than a preference it met half an hour ago. Not text surgery - stripping a
     * trailing question would take out the probe, and the probe is the product.
     */
    const rhythmNow = await this.prisma.conversationTurn
      .findMany({
        where: { checkInId: checkIn.id, role: TurnRole.AI },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { content: true },
      })
      .then((rows) => (tooManyQuestionsInARow(rows.map((r) => r.content).reverse()) ? landThisOneInstead() : ''))
      .catch(() => '');

    /* Immediately after the intake block, because it is about the same objectives and the two read
       as one thing: what was agreed, and what is happening against it. */
    const [seenBefore, closeHeldLine, documentReadsDifferently, documentNotAsDescribed] = await Promise.all([
      this.whatHasBeenSeenAcrossTheirSessions(checkIn.participantId),
      this.prisma.recordEntry
        .findMany({
          where: { participantId: checkIn.participantId, documentSays: { not: null }, disputedAt: null },
          select: { id: true, text: true, documentSays: true },
          orderBy: { createdAt: 'desc' },
          take: 12,
        })
        /* ASKED ONCE, IN CODE (week 14): a line whose question a turn already raised is never put again. */
        .then(async (all) => {
          const asked = await this.theLinesAlreadyAskedAbout(checkIn.participantId);
          return all.filter((r) => !asked.has(r.id)).slice(0, 1);
        })
        .then((rows) => rows.length
          ? 'A DOCUMENT THEY CAN SEE READS DIFFERENTLY FROM SOMETHING THEY SAID. This is theirs to answer, once, as an ordinary question: put the two side by side, with the document\'s own number or words, and ask which is current. Never say the document is right. Never say they were wrong. It is asked only once, so ask it now if it fits.\n'
            + rows.map((r) => `- They said: "${r.text.replace(/^\[VERIFIABILITY:\w+\] /, '')}". The document says: "${r.documentSays}".`).join('\n')
          : '')
        .catch(() => ''),
      this.prisma.checkIn
        .findUnique({ where: { id: checkIn.id }, select: { closeHeldAt: true } })
        .then((r) => (r?.closeHeldAt ? whyTheCloseWasHeld(turnsThisSession.filter((t) => t.role === 'AI').map((t) => t.content)) : ''))
        .catch(() => ''),
      /* THE UPLOADER IS ASKED, NOT CORRECTED. A document that does not read as they described it is
         put to them once as a question; until they answer it backs nothing. */
      this.prisma.groundDocument
        .findMany({
          where: { groundId: checkIn.groundId, participantId: checkIn.participantId, uploaderNote: { not: null } },
          select: { fileName: true, uploaderNote: true, descriptionCheck: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
        .then((docs) => docs.filter((d) => (d.descriptionCheck as any)?.matches === false && !(d.descriptionCheck as any)?.answered))
        .then((docs) => docs.length
          ? 'A DOCUMENT THEY UPLOADED DOES NOT READ AS THEY DESCRIBED IT. Ask, once, as an ordinary question; never correct them. Until they answer, the document backs nothing. Say what the file reads as and ask whether it is the one they meant, or whether their description is the fuller picture.\n'
            + docs.map((d) => `- "${d.fileName}": they said it is ${JSON.stringify(d.uploaderNote)}. It reads as: ${JSON.stringify((d.descriptionCheck as any).reads)}.`).join('\n')
          : '')
        .catch(() => ''),
    ]);

    /* Their own words from earlier sessions, for the number-claim cut. Same lifetime as knownForThisTurn. */
    this.theirEarlierWordsForThisTurn.set(checkIn.id, pastEntries.map((e) => e.text));
    this.commitmentsForThisTurn.set(checkIn.id, pastEntries.filter((e) => e.type === 'COMMITMENT').map((e) => e.text));
    /* What the invention gate may treat as already said. See knownForThisTurn. */
    this.knownForThisTurn.set(checkIn.id, [
      ...(ground.participants ?? []).flatMap((p) => [p.user?.firstName ?? '', p.user?.lastName ?? '', p.roleAsDescribed ?? '']),
      /* The lead's note as this person was given it: a colleague's hidden number in it is not "already said" to them. */
      ...(ground.leadContextNotes ?? []).map((n) => this.theLeadsWordsThisPersonMayBeGiven(ground as any, checkIn as any, n.text) ?? ''),
      ...uploadedDocs.map((d: any) => `${d.fileName ?? ''} ${d.content ?? ''} ${d.uploaderNote ?? ''}`),
      /* Only the targets this person may see: a colleague's hidden number is not "already said" to them (week 0). */
      ...this.theTargetsThisPersonMaySee(ground as any, checkIn as any, untoldHere).map((o: any) => `${o.name ?? ''} ${o.target ?? ''}`),
      priorSession ?? '',
      /* Their own earlier sessions' entries: a difference the product quotes from session one is theirs to hear back. */
      ...pastEntries.map((e) => e.text),
      toPut?.citation ?? '',
      ...pendingNotes.map((n: any) => n.text ?? ''),
      ...pendingDeliveries.map((d: any) => `${d.text ?? ''} ${d.evidence ?? ''}`),
    ].filter(Boolean));

    /* Which blocks were actually there, one log line per turn. Two blocks that looked wired and were
       not were found by reading; this is so the next one is found by looking. */
    /* Their language, when it is not English. See a-whatsapp-message-is-routed.ts: the conversation happens in it, the record stays in English. */
    const theirLanguage = languageBlock((checkIn as any).participant?.language ?? null);
    const named: [string, string][] = [
      ['language', theirLanguage], ['intake', intakeBlock], ['pending', pendingLines.join('')], ['evidence', evidenceLines.join('')], ['theirWeek', theirWeek],
      ['howWeDoIt', howWeDoIt], ['style', styleBlock], ['clarification', clarificationContext], ['selfCorrection', selfCorrectionContext],
      ['finalSession', finalSessionContext], ['returningUser', returningUserContext], ['roleProbe', roleProbeBlock], ['roleConfirm', roleConfirmationBlock], ['coaching', coachingBlock], ['patternProbe', patternProbeBlock],
      ['floorGiveBack', theFloorGiveBack], ['whoCarries', numbersAndOwners.whoCarries], ['whereItStands', numbersAndOwners.whereItStands], ['whoSecuredIt', whoSecuredIt],
      ['seenBefore', seenBefore], ['closeHeld', closeHeldLine], ['documentReadsDifferently', documentReadsDifferently], ['documentNotAsDescribed', documentNotAsDescribed], ['rhythm', rhythmNow], ['dynamicContext', dynamicContext], ['docs', docContext],
      ['docHint', docPromptHint], ['notes', notesBlock], ['deliveries', deliveriesBlock], ['burden', burden], ['putThisToThem', putThisToThem], ['whereItIs', whereItIs],
    ];
    this.logger.log(`prompt-blocks check-in=${checkIn.id} present=${named.filter(([, v]) => !!(v ?? '').trim()).map(([k]) => k).join(',')} absent=${named.filter(([, v]) => !(v ?? '').trim()).map(([k]) => k).join(',')}`);

    /*
     * AND ONLY THE PART OF THE ENGINE THIS TURN CAN USE. See only-the-rules-this-turn-needs.
     *
     * Nothing is removed from the product: a section is left out of the turns where its own text
     * says it does not apply. The biggest is the goal-alignment fallback, 13,019 characters whose
     * own opening calls it "the fallback for when there is none" - and every one of the twenty-two
     * situations has a prompt of its own, so it has been riding along on every turn, never meant to
     * run, and once demonstrably running alongside the real one.
     *
     * Done here rather than at the read, because whether this conversation has a situation prompt
     * is only settled by the time the pathway is built.
     */
    /*
     * THE TEAM BASELINE IS THE WHOLE CONVERSATION, NOT ONE VOICE AMONG MANY (anchor piece 14). A first session for somebody on the anchor
     * lead's team is read on its own words: no plan written from the lead's brief (it said "Must establish: Amina understands that..."), no
     * situation pack or intake with its "what did you understand your role in this to be", no owed list. Those are for a conversation that is
     * about somebody's work against a brief, and this one exists to learn how their work looks from where they sit.
     */
    const theBaselineRuns = await this.theBaselineApplies(checkIn, ground);
    const packForThisSituation =
      scenarioPackOverride ?? buildScenarioPackForParty(ground.scenario as any, checkIn.participant.partyType as any, undefined, undefined, checkIn.participant.roleAsDescribed ?? null);
    /* And where the pack's own spine is, read the same way. The pack says "skip any they have already
       answered"; this says which. */
    const spineSoFar = how?.forTheOpener ? '' : whereTheSpineIs(packForThisSituation ?? '', turnsThisSession);

    /*
     * THE PLAN FOR THIS SESSION. Written once, at the opener, from everything above; read at the top of
     * every turn with where the session has got to in it. See the-plan-for-this-session.
     */
    const planBlock = theBaselineRuns ? '' : await this.thePlanForThisSession(checkIn, ground, {
      forTheOpener: !!how?.forTheOpener,
      pack: packForThisSituation ?? '',
      recordAlreadyHolds,
      doesNotAddUp,
      owed: stillOwedForThePlan,
      declined: declinedForThePlan,
      earlier: pastEntries,
      turnsThisSession,
    }).catch((err: any) => {
      this.logger.warn(`The plan for check-in ${checkIn.id} could not be read: ${err?.message}`);
      return '';
    });
    /*
     * THE DISAGREEMENT, SAID ONCE. See the-disagreement-said-once. To a participant: what the lead
     * set for them, by the lead's name, against their own words. To the lead: the product's read of
     * a person's account against what the lead set. Not on the opener; once per session.
     */
    const disagreementBlock = how?.forTheOpener ? '' : await (async () => {
      const isLead = checkIn.participant.partyType === PartyType.INITIATOR;
      const setForThem = (objectivesOnRecord as any[]).filter((o) => o.ownerParticipantId && o.setByParticipantId && o.setByParticipantId !== o.ownerParticipantId && o.name?.trim());
      if (!setForThem.length) return '';
      /* ONCE PER GROUND, NOT PER SESSION. Tunde heard "Funmi has set this for you: $400,000" in session two
         and again in session three (run 7, 21 Sep 2026). The earlier sessions' AI turns count as said. */
      const ownEarlierCheckIns = await this.prisma.checkIn.findMany({
        where: { participantId: checkIn.participantId, sessionNumber: { lt: checkIn.sessionNumber ?? 1 } },
        select: { id: true },
      }).catch(() => [] as { id: string }[]);
      const aiTurnsSoFar = [
        ...(await this.prisma.conversationTurn.findMany({
          where: { checkInId: { in: ownEarlierCheckIns.map((c) => c.id) }, role: TurnRole.AI },
          select: { content: true },
          take: 200,
        }).catch(() => [] as { content: string | null }[])).map((t) => t.content ?? ''),
        ...turnsThisSession.filter((t) => t.role === 'AI').map((t) => t.content),
      ];
      const nameOfParticipant = (pid: string) => {
        const p = (ground.participants ?? []).find((x: any) => x.id === pid) as any;
        /* A name only, never the lead's description of them (request 36). "they" made "they's own account reads".
           With no name, the plain words every surface uses for them. */
        return (p?.user?.firstName ?? '').trim() || (p?.nameGiven ?? '').trim()
          || atTheStart(plainWordsByPerson((ground.participants ?? []) as any).get(pid) ?? 'a colleague');
      };
      if (isLead) {
        const findings = Array.isArray((ground as any).report?.findings) ? ((ground as any).report.findings as any[]) : [];
        const gap = setForThem.map((o) => ({ o, f: findings.find((f) => f.participantId === o.ownerParticipantId && f.hasGap && f.headline) })).find((x) => x.f);
        if (!gap) return '';
        const sentence = theSentenceToTheLead({ leadName: '', target: { name: gap.o.name, target: gap.o.target }, theirOwn: [], personName: nameOfParticipant(gap.o.ownerParticipantId), personHeadline: String(gap.f.headline).replace(/^[^:]*:\s*/, '') });
        return sayTheDisagreementOnce(sentence, aiTurnsSoFar);
      }
      if ((ground as any).participantsHearTheLeadsExpectation === false) return '';
      const mine = setForThem.find((o) => o.ownerParticipantId === checkIn.participantId);
      if (!mine) return '';
      /* Their definition of success first; an intent only when it is more than a date ("We're looking at end of
         next week now" was read back to Tunde as his side of the $400,000, run 7). */
      const notADate = (t: string) => !/\b(end of (?:next |this )?(?:week|month)|next week|by (?:friday|monday)|tomorrow)\b/i.test(t) && t.trim().split(/\s+/).length >= 6;
      const byRecency = (a: { session: number }, b: { session: number }) => b.session - a.session;
      const theirOwn = [
        ...pastEntries.filter((e) => e.type === 'SUCCESS_DEFINITION').sort(byRecency),
        ...pastEntries.filter((e) => e.type === 'INTENT' && notADate(e.text)).sort(byRecency),
      ].map((e) => e.text);
      const lead = (ground.participants ?? []).find((x: any) => x.partyType === PartyType.INITIATOR) as any;
      const leadName = (lead?.user?.firstName ?? '').trim() || 'The lead';
      const sentence = theSentenceToThePerson({ leadName, target: { name: mine.name, target: mine.target }, theirOwn });
      return sayTheDisagreementOnce(sentence, aiTurnsSoFar);
    })().catch(() => '');

    const thisTurn = {
      hasASituationPack: !!(packForThisSituation && packForThisSituation.trim().length > 200),
      sessionNumber: checkIn.sessionNumber,
      isTheOpener: !!how?.forTheOpener,
    };
    const systemPrompt = onlyTheRulesThisTurnNeeds(wholeEngine, thisTurn);
    const leftOut = whatWasLeftOut(thisTurn);
    /* `wholeEngine` is whatever the prompt store returned, which in a test is sometimes nothing. */
    if (leftOut.length && wholeEngine) {
      this.logger.log(
        `Check-in ${checkIn.id}: engine ${wholeEngine.length} to ${(systemPrompt ?? '').length} chars, leaving out ${leftOut.join('; ')}`,
      );
    }

    /*
     * WHAT ACTUALLY FIRED, NAMED AND SIZED. Logs and changes nothing: the prompt below is byte for
     * byte what it was. Before a single block moves out of the base prompt, this says which blocks
     * never fire, which fire every turn, and which are in play on a turn somebody complained about.
     * You cannot tune what always fires. See which-blocks-actually-fire.ts.
     */
    const inThisTurn = [
      ['systemPrompt', systemPrompt], ['theirLanguage', theirLanguage], ['VOCABULARY_RULE', VOCABULARY_RULE],
      ['A_CORRECTION_IS_NOT_A_SCOLDING', A_CORRECTION_IS_NOT_A_SCOLDING],
      ['ANSWER_THE_REMARK', ANSWER_THE_REMARK],
      ['openWithSomethingNew', OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE],
      ['planBlock', planBlock], ['disagreementBlock', disagreementBlock], ['recordAlreadyHolds', recordAlreadyHolds], ['doesNotAddUp', doesNotAddUp], ['owedBlock', owedBlock], ['spineSoFar', spineSoFar], ['intakeBlock', intakeBlock],
      ['pendingLines', pendingLines.join('')], ['evidenceLines', evidenceLines.join('')],
      ['theirWeek', theirWeek], ['howWeDoIt', howWeDoIt], ['styleBlock', styleBlock],
      ['clarificationContext', clarificationContext], ['selfCorrectionContext', selfCorrectionContext],
      ['finalSessionContext', finalSessionContext], ['howLongThisRuns', howLongThisRuns], ['returningUserContext', returningUserContext],
      ['roleProbeBlock', roleProbeBlock], ['coachingBlock', coachingBlock],
      ['patternProbeBlock', patternProbeBlock], ['theHole', theHole], ['theOneThingBack', theOneThingBack],
      ['theFloorGiveBack', theFloorGiveBack], ['whoCarriesWhichPart', numbersAndOwners.whoCarries], ['whereTheNumberStands', numbersAndOwners.whereItStands], ['whoSecuredIt', whoSecuredIt],
      ['oneThingToDoBetter', oneThingToDoBetter],
      ['seenBefore', seenBefore], ['closeHeldLine', closeHeldLine],
      ['documentReadsDifferently', documentReadsDifferently], ['documentNotAsDescribed', documentNotAsDescribed],
      ['rhythmNow', rhythmNow], ['dynamicContext', dynamicContext], ['docContext', docContext],
      ['docPromptHint', docPromptHint], ['notesBlock', notesBlock], ['deliveriesBlock', deliveriesBlock],
      ['burden', burden], ['putThisToThem', putThisToThem], ['askedWhenThisEnds', askedWhenThisEnds], ['theirHedge', theirHedge], ['heldBack', heldBack], ['whereItIs', whereItIs],
      ['theirCommitments', theirCommitments], ['nobodyOwns', nobodyOwns], ['notSettledBlock', notSettledBlock],
      ['leadsQuestions', leadsQuestions], ['betweenBlock', betweenBlock], ['howWeWork', howWeWork],
    ].map(([name, text]) => ({ name: String(name), text: text as any }));
    this.logger.log(oneLine(whatFiredThisTurn(inThisTurn)));

    /*
     * AND THREE LINES LAST, AFTER EVERYTHING. See the-last-thing-it-reads-is-the-thing-it-must-not-
     * miss: a rule at character 31,345 of 113,000 behaves like a suggestion, and one of them did,
     * live, the day it was written. Position is the fix, not another guard.
     */
    const cannotBeMissed = theThingsThatCannotBeMissed(latestMessage, theyPushedBackOnTheQuestions(latestMessage ?? ''));

    /*
     * AND THE QUESTION IT ASKED LAST TURN, HANDED BACK. See you-asked-that-last-turn: the product
     * refuses a third ask and never looked at the second, which is the one people read because it
     * arrives in the next breath. Twenty of twenty-two conversations repeated a question, almost
     * always consecutively. Context in, nothing removed.
     */
    /* Best-effort, like every other block here: not knowing the last question makes this turn no
       worse than it was before the block existed, and failing to build a prompt over it would. */
    let lastAiTurn: { content: string | null } | null = null;
    /* EVERY EARLIER TURN, not only the last one. A block that knows one turn back cannot stop the
       third identical ask: by then it is reporting the repeat rather than preventing it. Six is
       plenty - a session is about ten turns - and it is capped so this cannot grow with the
       transcript. See you-asked-that-last-turn. */
    let earlierAiTurns: { content: string | null }[] = [];
    try {
      const recent = await this.prisma.conversationTurn.findMany({
        where: { checkInId: checkIn.id, role: TurnRole.AI },
        orderBy: { createdAt: 'desc' },
        take: 7,
        select: { content: true },
      });
      lastAiTurn = recent[0] ?? null;
      earlierAiTurns = recent.slice(1);
    } catch {
      /* A try rather than a .catch: a caller whose client has no findMany throws before there is a
         promise to catch on, and this block is never worth failing a turn over. */
    }
    const askedLastTurn = whatYouAskedLastTurn(
      lastAiTurn?.content ?? null,
      earlierAiTurns.map((t) => t.content ?? '').filter(Boolean),
    );

    /*
     * THE ANCHOR'S WEEKLY CHECK-IN, ONLY WHEN THE SWITCH IS ON AND THIS CHECK-IN WAS STARTED FROM THE ANCHOR LINK (anchor piece 15).
     * Kept beside the prompt, not in it: the caller puts these words after everything else, so they are read last. Otherwise nothing
     * is kept, and the prompt is byte for byte what it was.
     */
    const anchorWeek = await this.theAnchorWeek(checkIn, ground, untoldHere, latestMessage ?? '', turnsThisSession).catch((err: any) => {
      this.logger.warn(`The anchor's weekly guidance for ${checkIn.id} could not be read: ${err?.message}`);
      return null;
    });
    if (anchorWeek) this.logger.log(`anchor-weekly check-in=${checkIn.id} prompt-version=${anchorWeek.promptVersionId ?? 'the file'}`);
    this.anchorVersionForThisTurn.set(checkIn.id, anchorWeek?.promptVersionId ?? null);
    this.anchorWeekForThisTurn.set(checkIn.id, anchorWeek);

    const theBaselinePrompt = !theBaselineRuns ? '' : await (async () => {
      /* The engine's own rules, the person's language, and the few things every turn needs; the baseline's words follow, and its reminder is read last. */
      const theirFirstName = theFirstNameFrom((checkIn.participant as any)?.user?.firstName, (checkIn.participant as any)?.user?.lastName);
      /* Their lead, by first name, so the question about what the lead is most concerned about uses a name and not "your lead". */
      const leadsFirstName = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { initiator: { select: { firstName: true, lastName: true } } } } as any)
        .then((g: any) => theFirstNameFrom(g?.initiator?.firstName, g?.initiator?.lastName)).catch(() => null);
      const theBaselineParts = [systemPrompt, theirLanguage, VOCABULARY_RULE, A_CORRECTION_IS_NOT_A_SCOLDING, ANSWER_THE_REMARK, [theirFirstName ? `The person you are talking with is ${theirFirstName}.` : '', leadsFirstName ? `Their lead is ${leadsFirstName}, and the person you are talking with knows that.` : ''].filter(Boolean).join(' '), docContext, cannotBeMissed, askedLastTurn];
      return theBaselineParts.filter(Boolean).join('\n\n');
    })();
    if (theBaselinePrompt) return theBaselinePrompt;
    return [systemPrompt, theirLanguage, VOCABULARY_RULE, A_CORRECTION_IS_NOT_A_SCOLDING, ANSWER_THE_REMARK, OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE, planBlock, disagreementBlock, recordAlreadyHolds, doesNotAddUp, owedBlock, spineSoFar, intakeBlock, ...pendingLines, ...evidenceLines, theirWeek, howWeDoIt, styleBlock, clarificationContext, selfCorrectionContext, finalSessionContext, howLongThisRuns, returningUserContext, roleProbeBlock, roleConfirmationBlock, coachingBlock, theOneThingBack, theFloorGiveBack, numbersAndOwners.whoCarries, numbersAndOwners.whereItStands, whoSecuredIt, oneThingToDoBetter, seenBefore, closeHeldLine, documentReadsDifferently, documentNotAsDescribed, rhythmNow, dynamicContext, docContext, docPromptHint, notesBlock, deliveriesBlock, theirCommitments, nobodyOwns, notSettledBlock, leadsQuestions, betweenBlock, howWeWork, burden, putThisToThem, askedWhenThisEnds, theirHedge, theHole, heldBack, proofKindly, whereItIs, cannotBeMissed, askedLastTurn, patternProbeBlock].filter(Boolean).join('\n\n');
  }

  /**
   * WHICH OF THE NINE THE PERSON HAS TOLD US, from their own words, by one fast read. Nothing when there is nothing to read yet or the read fails:
   * the baseline then runs on its own words, as before.
   */
  private async whatTheBaselineHasLearnedSoFar(turns: { role: 'AI' | 'PERSON'; content: string }[]): Promise<WhatIsLearned | null> {
    if (!turns.some((t) => t.role === 'PERSON' && t.content.trim())) return null;
    const history = turns.map((t) => ({ role: t.role === 'AI' ? 'assistant' as const : 'user' as const, content: t.content }));
    while (history.length && history[history.length - 1].role === 'assistant') history.pop();
    if (!history.length) return null;
    try {
      const read = await this.anthropic.extract<Record<string, boolean>>(THE_BASELINE_READ_SYSTEM, history, THE_BASELINE_READ_TOOL, { fast: true });
      return whatIsLearnedFrom(read);
    } catch (err: any) {
      this.logger.warn(`The baseline could not count what it has learned: ${err?.message}`);
      return null;
    }
  }

  /** Whether this is the first session of somebody on the anchor lead's team, with the anchor on: the one gate the baseline's own words use too. */
  private async theBaselineApplies(checkIn: { sessionNumber: number; participant: { partyType: any } }, ground: any): Promise<boolean> {
    if (!aCheckInStartedFromTheAnchor(ground)) return false;
    if (checkIn.participant.partyType === PartyType.INITIATOR || checkIn.sessionNumber !== 1) return false;
    return (await theAnchorScenarioIsOn(this.prisma)) === true;
  }

  /* Which stored version of the anchor's weekly words this turn ran, per check-in. Same shape and lifetime as the other per-turn maps. */
  private _anchorVersionForThisTurn?: Map<string, string | null>;
  private get anchorVersionForThisTurn(): Map<string, string | null> {
    if (!this._anchorVersionForThisTurn) this._anchorVersionForThisTurn = new Map();
    return this._anchorVersionForThisTurn;
  }
  /* The anchor's weekly words for this turn, written by composeSystemPrompt and read by the reply path that puts them after the rest. */
  private _anchorWeekForThisTurn?: Map<string, { text: string; block: string; last: string; promptVersionId: string | null; agreed: ReturnType<typeof whatTheAnswerAgreedTo>; isTheBaseline?: boolean } | null>;
  private get anchorWeekForThisTurn() {
    if (!this._anchorWeekForThisTurn) this._anchorWeekForThisTurn = new Map<string, { text: string; block: string; last: string; promptVersionId: string | null; agreed: ReturnType<typeof whatTheAnswerAgreedTo>; isTheBaseline?: boolean } | null>();
    return this._anchorWeekForThisTurn;
  }
  /** The anchor's weekly words that go before the turn's own additions, and the ones that go after everything. Both empty unless the anchor is in play. */
  private theAnchorWeekWords(checkInId: string): { before: string[]; last: string } {
    const w = this.anchorWeekForThisTurn.get(checkInId);
    return w ? { before: [w.text, w.block], last: w.last } : { before: [], last: '' };
  }

  /**
   * THE ANCHOR'S WEEKLY CHECK-IN FOR SOMEBODY ON THE LEAD'S TEAM (anchor piece 15): the scenario's words, and what this person has
   * told us before, in their own words. Null unless the switch is on, the check-in began at the anchor link, this is not the lead and
   * not the first session. Only this person's own earlier words and commitments are read, and only the aims they have been told.
   */
  private async theAnchorWeek(
    checkIn: { id: string; groundId: string; participantId: string; sessionNumber: number; participant: { partyType: any } },
    ground: any,
    untoldHere: AnUntoldGoalRow[],
    latestMessage: string,
    turnsThisSession: { role: 'AI' | 'PERSON'; content: string }[] = [],
  ): Promise<{ text: string; block: string; last: string; promptVersionId: string | null; agreed: ReturnType<typeof whatTheAnswerAgreedTo>; isTheBaseline?: boolean } | null> {
    const guidance = await theAnchorParticipantGuidance(() => theAnchorScenarioIsOn(this.prisma), this.prompts, {
      ground,
      isTheLead: checkIn.participant.partyType === PartyType.INITIATOR,
      sessionNumber: checkIn.sessionNumber,
    });
    if (!guidance) {
      /*
       * THE FIRST SESSION IS THE TEAM BASELINE (anchor piece 14; decision 105 item 6): the spec's nine things to learn,
       * one at a time, never a list. Only what this person has been told the check-in is for goes with it.
       */
      const baseline = await theAnchorBaselineGuidance(() => theAnchorScenarioIsOn(this.prisma), this.prompts, {
        ground,
        isTheLead: checkIn.participant.partyType === PartyType.INITIATOR,
        sessionNumber: checkIn.sessionNumber,
      });
      if (!baseline) return null;
      const told = this.briefFor(ground, { participantId: checkIn.participantId, isLead: false }, untoldHere)?.says?.trim() || null;
      const aboutIt = told ? `# What this person has been told this check-in is for

${told}` : '';
      /* What has been learned so far, counted from the person's own words, and the closing once all nine are. */
      const learned = await this.whatTheBaselineHasLearnedSoFar(turnsThisSession);
      const closes = !!learned && everythingIsLearned(learned);
      return {
        text: baseline.text,
        block: [aboutIt, learned ? whatTheBaselineHasLearned(learned) : ''].filter(Boolean).join('\n\n'),
        last: closes ? THE_BASELINE_CLOSING_REMINDER : baseline.last,
        promptVersionId: baseline.promptVersionId, agreed: null as any, isTheBaseline: true,
      };
    }
    const lastCheckIn = await this.prisma.checkIn.findFirst({
      where: { participantId: checkIn.participantId, sessionNumber: { lt: checkIn.sessionNumber }, status: CheckInStatus.COMPLETED },
      orderBy: { sessionNumber: 'desc' },
      select: { id: true, completedAt: true },
    }).catch(() => null);
    const entries = lastCheckIn
      ? await this.prisma.recordEntry.findMany({
        where: { checkInId: lastCheckIn.id, participantId: checkIn.participantId },
        orderBy: { createdAt: 'asc' },
        select: { text: true },
        take: 5,
      }).catch(() => [] as { text: string }[])
      : [];
    const promises = await (this.prisma.groundCommitment?.findMany?.({
      where: { groundId: checkIn.groundId, participantId: checkIn.participantId, status: 'UNKNOWN' },
      select: { text: true, whenSaid: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    }) ?? Promise.resolve([])).catch(() => [] as { text: string; whenSaid: string | null }[]);
    /*
     * What this person has been told the check-in is for (what a participant is told about it, never the lead's own brief). And NO aim of the
     * lead's: in an anchor check-in every aim on the check-in came out of her own conversation, which is hers alone until she says so (decision 96,
     * item 8). The weekly words took "the aims they may see" and the model said it to a team member: "That connects directly to Wairimu's aim for
     * the team to understand that a crate left in the sun for twenty minutes is a spoiled order." (anchor walk, 8 October).
     */
    const toldAboutIt = this.briefFor(ground, { participantId: checkIn.participantId, isLead: false }, untoldHere)?.says?.trim() || null;
    const aims = [toldAboutIt]
      .filter((a): a is string => !!a)
      .slice(0, 6);
    const block = whatTheyToldYouBefore({
      lastSession: lastCheckIn?.completedAt ? { finishedAt: lastCheckIn.completedAt, said: entries.map((e) => e.text.replace(/^\[VERIFIABILITY:\w+\] /, '')) } : null,
      theySaidTheyWould: promises as { text: string; whenSaid: string | null }[],
      whatTheGroupIsTryingToChange: aims,
    }, new Date());
    /* WHAT THEY JUST SAID YES OR NO TO, read from the record of this conversation and not from anything the model says it did. */
    const sofar = await (this.prisma.conversationTurn?.findMany?.({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { role: true, content: true },
    }) ?? Promise.resolve([])).catch(() => [] as { role: string; content: string | null }[]);
    const agreed = whatTheAnswerAgreedTo(sofar as any[], latestMessage);
    const offered = hasAlreadyOffered(sofar as any[]);
    /* Owed to them, read from the record: asked after the reminder, so it is the last thing read about what to ask. Not while an offer is being answered. */
    const owed = agreed ? '' : [whatTheyJustSaidMayBeTheirOwnStep(sofar as any[], latestMessage), whatIsStillOwedToThem(sofar as any[])].filter(Boolean).join('\n\n');
    return { text: guidance.text, block, last: [guidance.last, owed, offered ? YOU_HAVE_ALREADY_OFFERED : ''].filter(Boolean).join('\n\n'), promptVersionId: guidance.promptVersionId, agreed };
  }

  /**
   * THEIR YES BECOMES A COMMITMENT, AND ONLY THEIR YES (anchor piece 17). Read from the anchor's weekly words for this turn: when the
   * last thing Groundwork said was an offer to write something down and the person has just said a plain yes, their own words are
   * written down the way every other thing a person says they will do is written, and the model is told what happened. Nothing is
   * written for a no, for anything else, or when the anchor is not in play.
   */
  private async theirYesBecomesACommitment(checkIn: { id: string; groundId: string; participantId: string; sessionNumber: number }): Promise<{ forTheModel: string; weSay: string }> {
    const agreed = this.anchorWeekForThisTurn.get(checkIn.id)?.agreed ?? null;
    if (!agreed) return { forTheModel: '', weSay: '' };
    if (agreed.kind === 'no') return { forTheModel: whatHappenedToTheOffer(agreed, false), weSay: '' };
    let written: boolean | 'already' = false;
    try {
      const theirs = await this.prisma.groundCommitment.findMany({
        where: { groundId: checkIn.groundId, participantId: checkIn.participantId },
        select: { text: true },
      });
      if ((theirs as any[]).some((h) => theSameMeasure(h.text ?? '', agreed.text))) {
        written = 'already';
      } else {
        await this.prisma.groundCommitment.create({
          data: {
            groundId: checkIn.groundId,
            participantId: checkIn.participantId,
            text: agreed.text,
            explicit: true,
            status: 'UNKNOWN',
            source: 'CHECK_IN',
            statedInSession: checkIn.sessionNumber,
            /* Their own words, from what they typed, and never reworded. */
            saidWordForWord: true,
            whenSaidWordForWord: false,
          },
        });
        written = true;
        this.logger.log(`Check-in ${checkIn.id} session ${checkIn.sessionNumber}: wrote one commitment they said yes to.`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not write the commitment they said yes to on ${checkIn.id}: ${err?.message}`);
    }
    return { forTheModel: whatHappenedToTheOffer(agreed, written), weSay: weSayAboutTheOffer(agreed, written) };
  }

  /**
   * COACHING IS ON. THE FLAG IS GONE.
   *
   * It was built behind `app.coachingEnabled`, off in every environment, and it stayed off long
   * enough that the best-designed thing in the check-in had never run for anybody: one step at a
   * time, remembered across sessions, shrunk when somebody has not managed it twice.
   *
   * A flag that is never turned on is not caution, it is a feature nobody has to decide about. This
   * is the decision - Hafsah's, and made once rather than per environment.
   *
   * NOTHING ELSE ABOUT IT CHANGED. It still adds nothing at all when there is no step to raise,
   * which is most sessions: a coach that always has something to say is a product that always has
   * something to say about you.
   */
  /**
   * The one recurring thing worth a question this session, or nothing.
   *
   * SURFACED only, never CANDIDATE - see the module next door for why. Reads the detections for
   * this person on this ground; `theOneWorthAsking` applies the period floor, drops the codes that
   * exist for the alignment feed only, and picks at most one.
   */
  /**
   * One true thing off the shared board, worth saying back in the turn they said it.
   *
   * Best effort in the strictest sense: a give-back must never be the reason somebody cannot get a
   * reply, so every failure here is a silent empty string and the conversation carries on.
   */
  private async whatTheRoomAlreadyKnows(
    checkIn: { id: string; groundId: string; participantId: string },
    latestMessage: string,
  ): Promise<string> {
    try {
      if (!latestMessage.trim()) return '';
      const ground = await this.prisma.ground.findUnique({
        where: { id: checkIn.groundId },
        select: { mode: true, scenario: true, peersVisibleToEachOther: true, participants: { select: { id: true, partyType: true, managingOnly: true, createdAt: true } } },
      });
      if (ground?.mode !== 'SHARED') return '';
      /*
       * AND WHETHER THIS CHECK-IN NAMES PEOPLE TO EACH OTHER AT ALL.
       *
       * This block tells the engine to say a fact back to the person, and the fact came with the
       * names of whoever raised it. Mode was the only gate, and an evaluation check-in is SHARED
       * by default - so on a PIP the report withheld a colleague's name and this handed it to the
       * person being reviewed in the next question. The fact still gets said; without the names it
       * reads "Somebody else on this check-in has already named the same thing".
       */
      const mayName = peersAreNamedOn(ground as any, { participantId: checkIn.participantId });
      const rows = await this.prisma.groundDependency.findMany({
        where: {
          groundId: checkIn.groundId,
          clearedAt: null,
          status: { in: ['WAITING', 'BLOCKING'] as any },
          fromParticipantId: { not: checkIn.participantId },
        },
        select: {
          what: true,
          onParticipantId: true,
          fromParticipant: { select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
        },
        take: 40,
      });
      const others = rows.map((r: any) => ({
        what: r.what ?? '',
        /* A name only, never the lead's description of them (request 36). No name reads "Somebody else". */
        raisedBy: mayName
          ? ([r.fromParticipant?.user?.firstName, r.fromParticipant?.user?.lastName].filter(Boolean).join(' ').trim()
            || (r.fromParticipant?.nameGiven ?? '').trim() || null)
          : null,
        owned: !!r.onParticipantId,
      }));
      return whatIsWorthSaying({ shared: true, theyJustSaid: latestMessage, others });
    } catch (err: any) {
      this.logger.warn(`Could not read what the room knows for ${checkIn.id}: ${err?.message}`);
      return '';
    }
  }

  /**
   * Their own targets in front of the model, but only in a turn where they said a number.
   *
   * Silent otherwise, deliberately: a conversation that recites somebody's targets back at them
   * unprompted is the restating fault wearing a different coat, and that one is already on record.
   */
  private async whereTheirNumberLeavesThem(
    checkIn: { id: string; groundId: string; participantId: string },
    latestMessage: string,
  ): Promise<string> {
    try {
      if (!theySaidANumber(latestMessage)) return '';
      const theirs = await this.prisma.groundObjective.findMany({
        where: {
          groundId: checkIn.groundId,
          target: { not: null },
          OR: [{ ownerParticipantId: checkIn.participantId }, { ownerParticipantId: null }],
        },
        select: { name: true, target: true, count: true },
        orderBy: { sortOrder: 'asc' },
        take: 8,
      });
      return whereThatLeavesThem(latestMessage, theirs as any);
    } catch (err: any) {
      this.logger.warn(`Could not read their targets for ${checkIn.id}: ${err?.message}`);
      return '';
    }
  }

  /**
   * What this person has already put on somebody they just named again.
   *
   * Only expectations THIS person set, so nothing another party wrote is read, and only on a ground
   * where the named person is a participant. Best effort: a give-back never blocks a reply.
   */
  private async whatIsAlreadyOnSomebodyTheyNamed(
    checkIn: { id: string; groundId: string; participantId: string },
    latestMessage: string,
  ): Promise<string> {
    try {
      if (!latestMessage.trim()) return '';
      const rows = await this.prisma.personObjective.findMany({
        where: { groundId: checkIn.groundId, participantId: { not: checkIn.participantId } },
        select: {
          text: true,
          awareness: true,
          participant: { select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      const onThem = rows.map((r: any) => ({
        /* A name only, never the lead's description of them (request 36); nobody is matched without one. */
        name: [r.participant?.user?.firstName, r.participant?.user?.lastName].filter(Boolean).join(' ').trim()
          || (r.participant?.nameGiven ?? '').trim() || '',
        text: r.text ?? '',
        awareness: r.awareness ?? null,
      })).filter((r: { name: string }) => r.name);
      return whatIsAlreadyOnThem(latestMessage, onThem);
    } catch (err: any) {
      this.logger.warn(`Could not read what is already on them for ${checkIn.id}: ${err?.message}`);
      return '';
    }
  }

  private async whatKeepsHappeningBlock(participantId: string): Promise<string> {
    try {
      const rows = await this.prisma.patternDetection.findMany({
        where: { participantId, status: PatternStatus.SURFACED },
        select: { code: true, periodsObserved: true, seenInSessions: true, accuracyRating: true },
      });
      return askAboutItBlockFor(theOneWorthAsking(rows));
    } catch (err) {
      // A probe must never be the reason somebody cannot start a check-in.
      this.logger.warn(`Could not build the pattern probe for ${participantId}: ${(err as Error)?.message}`);
      return '';
    }
  }

  private coachingEnabled(): boolean {
    return true;
  }

  /**
   * platform_settings.coaching_live: ON BY DEFAULT, ON EVERY DATABASE (decision 57, item 6, 30
   * September 2026). Coaching is one of the product's protected capabilities (decision 55); a
   * missing row used to read as off, which switched it off everywhere until somebody had set the
   * row by hand, including on every new database. A missing row now reads as on. An admin can
   * still pause it: a row whose value is explicitly `false` (or `"false"`) still turns it off.
   */
  private async coachingIsLive(): Promise<boolean> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key: COACHING_LIVE_KEY } });
      if (row === null || row === undefined) return true;
      return row.value !== false && row.value !== 'false';
    } catch {
      return true;
    }
  }

  /**
   * What the coach has to say into THIS session, or nothing.
   *
   * Reads the state the last session left, asks the machine what the next move is,
   * and turns that into instructions. The machine is pure and tested next door; all
   * that happens here is the loading.
   *
   * The step is only ever asked ABOUT here. It is offered by
   * recordCoachingStep(), after the session, because what to offer depends on what
   * the session turned out to contain - and a step chosen before somebody speaks is
   * chosen from their last week rather than this one.
   */
  private async coachingBlock(participantId: string, sessionNumber: number): Promise<string> {
    if (!this.coachingEnabled()) return '';
    /*
     * THE GATE. Rows are written on every completed session and can be read at /admin/coaching.
     * The block reaches a live prompt only once the platform setting below has been set to true,
     * by a person, after reading a first batch. Until then the chain runs in full and says nothing
     * to anybody. There is no default row: absent means off.
     */
    if (!(await this.coachingIsLive())) return '';
    try {
      const row = await this.prisma.coachingState.findUnique({ where: { participantId } });
      if (!row?.currentStep) return '';

      const state: CoachingStateShape = {
        currentStep: row.currentStep,
        stepGivenAt: row.stepGivenAt ?? null,
        staircase: row.staircase ?? null,
        staircasePosition: row.staircasePosition ?? 0,
        history: Array.isArray(row.history) ? (row.history as any[]) : [],
      };

      // A step given in THIS session is not something to ask about in this
      // session, which would be the coach asking about a thing it has not yet
      // said.
      if (state.stepGivenAt !== null && state.stepGivenAt >= sessionNumber) return '';

      const move = nextMove(state, {
        noticed: null,
        lookingLike: null,
        // Enough to get past the guards: this call is only ever about the step
        // already outstanding, never about choosing a new one.
        reason: 'a step is outstanding from last session',
        sessionNumber,
        hadSubstance: true,
      });
      return coachingBlockFor(move) ?? '';
    } catch (err) {
      // Coaching must never be the reason somebody cannot start a check-in.
      this.logger.warn(`Could not build the coaching block for ${participantId}: ${(err as Error)?.message}`);
      return '';
    }
  }

  /**
   * Read this session against this person's own role map, and let the machine
   * decide what to do about it.
   *
   * A MODEL CALL, for the same reason record extraction is one: the question is
   * about meaning. A regex cannot tell "I did the demo myself because they were
   * not ready" from "I did the demo myself again", and the difference is the whole
   * read.
   *
   * WHAT IT WILL NOT DO.
   *
   * It never runs on a low-confidence function. A step chosen from a guess about
   * what somebody's job is lands as a stranger's advice, and the same threshold
   * already governs the role probes.
   *
   * It never invents the reason. The prompt takes it from what the person said,
   * and the machine refuses a step without one - so a model that returns an index
   * with no reason produces nothing rather than a verdict.
   *
   * It never decides whether they managed their last step. That comes back only if
   * the transcript says so, in their words. Inferring it from a better-looking week
   * would make the step a target.
   */
  private async observeForCoaching(checkInId: string, participantId: string, sessionNumber: number): Promise<void> {
    if (!this.coachingEnabled()) return;

    /* A set-up conversation is not a check-in, so it is never read for coaching. */
    const thisOne = await (this.prisma.checkIn?.findUnique?.({ where: { id: checkInId }, select: { isSetup: true } }) ?? Promise.resolve(null)).catch(() => null);
    if ((thisOne as any)?.isSetup) return;

    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      select: {
        detectedFunction: true, detectedFunctionConfidence: true,
        joinedAt: true, leftAt: true, leavePeriods: true,
      },
    });

    /**
     * NOBODY IS COACHED WHILE THEY ARE AWAY, OR AFTER THEY HAVE GONE.
     *
     * participation-timeline.ts has said this since it was written, and nothing
     * had ever called it - so the coaching path I built an hour ago would happily
     * have offered a step to somebody on parental leave, or to somebody who had
     * left the company. Its own comment names both: the first is the tone-deaf
     * thing that ends trust in a product permanently, and the second is absurd.
     *
     * Found by the unwired-module rule, in code I had just written.
     */
    const leaves = Array.isArray(participant?.leavePeriods)
      ? (participant!.leavePeriods as any[])
          .map((l) => ({ from: new Date(l?.from), to: l?.to ? new Date(l.to) : null }))
          .filter((l) => !isNaN(l.from.getTime()))
      : [];
    /* And the approved leave itself, by dates (week 23): nothing wrote leavePeriods, so this read the
       field and found it empty for everybody. */
    const asked = await this.prisma.groundParticipant.findUnique({ where: { id: participantId }, select: { userId: true, ground: { select: { organizationId: true } } } }).catch(() => null);
    if (asked?.userId) {
      for (const l of await theirApprovedLeave(this.prisma as any, asked.userId, asked.ground?.organizationId ?? null)) leaves.push({ from: l.from, to: l.to });
    }
    if (!mayCoach(new Date(), {
      joinedAt: participant?.joinedAt ?? null,
      leftAt: participant?.leftAt ?? null,
      leaves,
    })) {
      return;
    }

    const map = roleMapFor(participant?.detectedFunction);
    const confident = (participant?.detectedFunctionConfidence ?? 0) >= MIN_COACHING_CONFIDENCE;
    /**
     * A ROLE NOBODY MAPPED IS STILL A PERSON.
     *
     * This returned here, before reading a word of the transcript, whenever there was no role map
     * or the function sat below the confidence floor. Both exits are RIGHT about the role - a map
     * chosen from a guess coaches somebody out of the wrong one - and both were wrong about the
     * person: 477 people on record, 32 clearing this gate, so 93% could never be coached about
     * anything, not because nothing was noticed but because nothing was ever looked at.
     *
     * So the role gate now selects WHICH behaviours are read rather than whether anybody is read at
     * all. With a confident map, the function's own failure signals, as before. Without one, the
     * universal floor - which is deliberately weaker and says so: every line of it is about the
     * ACCOUNT, not about the work, because the work is the part that cannot be read without
     * knowing the job.
     */
    const readFromTheAccount = !map?.failureSignals?.length || !confident;
    const whyTheFloor = readFromTheAccount
      ? (!map?.failureSignals?.length
        ? `no role map for function ${participant?.detectedFunction ?? 'none'}`
        : `function ${participant?.detectedFunction} at confidence ${participant?.detectedFunctionConfidence ?? 0}, below ${MIN_COACHING_CONFIDENCE}`)
      : null;

    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });
    if (!turns.length) return;

    const personSaid = turns.filter((t) => t.role === TurnRole.PERSON).map((t) => t.content ?? '');
    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const behaviours = (readFromTheAccount ? theBehavioursAnybodyCanBeRead() : map!.failureSignals!)
      .map((b, i) => `${i}. ${b}`).join('\n');

    /*
     * NO STEER FROM THE LEAD'S PRIVATE NOTES ABOUT THIS PERSON. Decision 32, 27 September 2026.
     *
     * This read every note the lead had written about this person - every one of them the lead's
     * only, because a note about one named person is never shared - and handed it to the model
     * reading this person's own session, with an instruction that it only said where to look. That
     * is the lead's private words in the model's hands in this person's session, kept from them by an
     * instruction, which is what the decision rules out. The coach reads what this person said, the
     * behaviours for their kind of work, and what has already been seen across their own sessions.
     */
    /*
     * WHAT HAS ALREADY BEEN SEEN ABOUT THIS PERSON, ACROSS SESSIONS.
     *
     * The behavioural engine has held these all along - a code, a plain-language observation, and a
     * count of consecutive periods before anything surfaces - and the coach could not see any of
     * it. So the coach met somebody fresh every session while the product had been watching a
     * pattern build for three.
     *
     * SURFACED ONLY. A candidate is one or two periods of something that may be nothing, and
     * coaching somebody on it would be reading a fortnight as a trait. Three consecutive periods
     * is the bar the engine already sets and this does not lower it.
     *
     * IT STEERS WHICH BEHAVIOUR TO LOOK AT, NEVER WHAT THE ANSWER IS. If the transcript does not
     * show it, the answer is still none, because a pattern is a place to look, not a finding to
     * confirm.
     */
    const surfaced = await (this.prisma.patternDetection?.findMany({
      where: { participantId, status: 'SURFACED' as any },
      select: { observationText: true, periodsObserved: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 3,
      /*
       * Optional chaining AND a catch: `.catch()` alone does nothing when the accessor itself is
       * missing - that is a synchronous TypeError, not a rejected promise. A steer must never be the
       * reason nobody gets coached.
       */
    }) ?? Promise.resolve([] as { observationText: string | null; periodsObserved: number }[]))
      .catch(() => [] as { observationText: string | null; periodsObserved: number }[]);

    const alreadySeen = surfaced.filter((p2) => p2.observationText?.trim()).length
      ? '\n\nWHAT HAS ALREADY BEEN SEEN ACROSS SESSIONS. Use this ONLY to decide which behaviour '
        + 'above to look at first. It is not evidence about this session, it is never the reason, and '
        + 'if this transcript does not show it then the answer is still none. Never repeat it back to '
        + 'them as a description of who they are:\n'
        + surfaced
          .filter((p2) => p2.observationText?.trim())
          .map((p2) => `- ${p2.observationText!.trim()} (seen across ${p2.periodsObserved} periods)`)
          .join('\n')
      : '';

    const observed = await this.anthropic.extract<{
      index: number | null;
      reason: string | null;
      theyAskedForThisThemselves?: boolean;
      lastStepOutcome: string | null;
    }>(
      COACHING_OBSERVATION_PROMPT,
      [{ role: 'user', content: `BEHAVIOURS FOR THIS KIND OF WORK:\n${behaviours}${alreadySeen}\n\nTRANSCRIPT:\n${transcript}` }],
      COACHING_OBSERVATION_SCHEMA,
    );

    // signalRead applies the guards that matter - an index off the end, an empty
    // reason - and returns null rather than something to hand a person.
    const read = readFromTheAccount
      ? universalSignalRead(observed?.index ?? -1, observed?.reason ?? '')
      : signalRead(participant?.detectedFunction, observed?.index ?? -1, observed?.reason ?? '');

    /**
     * TWO VOCABULARIES FOR THE SAME FOUR OUTCOMES, RECONCILED AT THE BOUNDARY.
     *
     * coaching-step.ts already read these from a person's own words - written
     * before my state machine and never wired to anything, so I built a second set
     * spelled with spaces where its are spelled with underscores. Both are right;
     * having two is not. The existing reader is the fallback here, because a regex
     * over what somebody actually typed is better evidence than a model asked to
     * classify it, and its spelling is mapped to the machine's at this one point.
     */
    const FROM_READER: Record<string, StepOutcome> = {
      done: 'done', did_more: 'did more', not_done: 'not done', sideways: 'sideways',
    };
    const OUTCOMES = ['done', 'not done', 'did more', 'sideways'];
    let outcome: StepOutcome | null = OUTCOMES.includes(String(observed?.lastStepOutcome))
      ? (observed!.lastStepOutcome as StepOutcome)
      : null;

    // The model said nothing about the last step. Read their own words instead,
    // which is what coaching-step.ts is for. 'unclear' stays null - guessing an
    // outcome puts a fact in the record nobody said.
    if (!outcome) {
      const fromWords = readOutcome(personSaid.join(' '));
      outcome = FROM_READER[fromWords] ?? null;
    }

    // A step that could have gone to anybody is not coaching, it is a slogan.
    // Every step here comes from a role map so this should never fire, which is
    // exactly why it is cheap to keep: if a map entry is ever edited into
    // something generic, nothing offers it.
    /*
     * TWO CHECKS BEFORE ANYTHING IS OFFERED, both from the first batch that was ever read.
     * Recurrence: this session's observation is kept, and a step is offered only when the same thing
     * was seen in two distinct sessions (SESSIONS_BEFORE_A_STEP). Inversion: never a step the person
     * asked for themselves, by their own words and by the model's own field.
     */
    const prior = await this.prisma.coachingState.findUnique({ where: { participantId }, select: { observations: true } }).catch(() => null);
    const observations: Observation[] = Array.isArray((prior as any)?.observations) ? ((prior as any).observations as Observation[]) : [];
    /* Two DISTINCT PERIODS, not two sessions (decision 57, item 1). On a weekly-or-slower ground
       these are the same thing, as they always were; on a daily ground several sessions in one
       calendar week must not look like recurrence on their own. Observation.sessionNumber is read
       by seenInEnoughSessions as the period number, so what is stored here already is one. */
    const checkInForPeriod = await (this.prisma.checkIn?.findUnique?.({
      where: { id: checkInId },
      select: { completedAt: true, startedAt: true, createdAt: true, ground: { select: { cadence: true } } },
    }) ?? Promise.resolve(null)).catch(() => null);
    const period = checkInForPeriod
      ? periodOf(
        { sessionNumber, when: checkInForPeriod.completedAt ?? checkInForPeriod.startedAt ?? checkInForPeriod.createdAt },
        checkInForPeriod.ground,
      )
      : sessionNumber;
    if (read?.noticed && read.reason?.trim() && !observations.some((o) => o.sessionNumber === period && o.noticed === read.noticed)) {
      observations.push({ sessionNumber: period, noticed: read.noticed, reason: read.reason.trim() });
    }
    const recurring = seenInEnoughSessions(observations, read?.noticed ?? null);
    /* The word check decides. The model's own field said "they asked for it" on six cases the word
       check rejected, including an unanswered email with no ask in it; zero cases where both agreed.
       The field is kept on the row for reading, and it no longer suppresses anything. */
    const inverted = !!read && theyAskedForItThemselves(read.lookingLike, personSaid);
    const modelSaidTheyAsked = observed?.theyAskedForThisThemselves === true;
    if (read && inverted) this.logger.log(`Coaching: not offering "${read.lookingLike}" to ${participantId}, they asked for it themselves.`);
    if (read && !recurring) this.logger.log(`Coaching: "${read.noticed}" seen once for ${participantId}, waiting for recurrence.`);
    const offerable = read && !isGenericStep(read.lookingLike) && recurring && !inverted;

    await this.recordCoachingStep(
      participantId,
      sessionNumber,
      {
        noticed: offerable ? read!.noticed : null,
        lookingLike: offerable ? read!.lookingLike : null,
        reason: offerable ? read!.reason : null,
        observed: read ? { noticed: read.noticed, reason: read.reason, recurring, inverted, modelSaidTheyAsked } : null,
        observations,
        /* Which floor this step came off. A step read from the account rather than the role has to
           be traceable as one - it is weaker by construction, and a row that does not say so would
           be indistinguishable later from a role-mapped read. */
        why: whyTheFloor ?? undefined,
        // The same substance test the completion gate uses, rather than a second
        // definition of "said something real".
        hadSubstance: personSaid.some((t) => countCheckableSpecifics(t) > 0),
        /* A step off the universal floor is about how the account reads, so a thin session is the
           evidence for it rather than a reason to withhold it. See nextMove. */
        aboutTheAccount: readFromTheAccount,
      },
      outcome,
    );
  }

  /**
   * After a session: record what became of the last step, and choose the next.
   *
   * This is the write path, and the first thing in the product ever to put a row
   * in coaching_states. Behind the same flag, and everything it does is additive:
   * with the flag off the table stays empty and the check-in behaves exactly as it
   * does today.
   *
   * WHAT IT WILL NOT DO. It does not decide whether somebody managed their step -
   * only the person can say that, in their own words, and the outcome is written
   * from what they said rather than inferred from whether the record looks better.
   * Inferring it would make the step a target, and a target is the one thing a
   * coaching mechanic must not become.
   */
  async recordCoachingStep(
    participantId: string,
    sessionNumber: number,
    read: {
      noticed: string | null; lookingLike: string | null; reason: string | null; hadSubstance: boolean;
      /** Whether the step is about how they give their account rather than about the work. */
      aboutTheAccount?: boolean;
      /** What this session showed before the recurrence and inversion checks, for the reader at /admin/coaching. */
      observed?: { noticed: string; reason: string; recurring: boolean; inverted: boolean; modelSaidTheyAsked?: boolean } | null;
      observations?: Observation[];
      /** Why nothing could be read this session, when that is the case. */
      why?: string;
    },
    outcomeOfLastStep?: StepOutcome | null,
  ): Promise<{ offered: string | null }> {
    if (!this.coachingEnabled()) return { offered: null };
    try {
      const row = await this.prisma.coachingState.findUnique({ where: { participantId } });
      let state: CoachingStateShape = row
        ? {
            currentStep: row.currentStep ?? null,
            stepGivenAt: row.stepGivenAt ?? null,
            staircase: row.staircase ?? null,
            staircasePosition: row.staircasePosition ?? 0,
            history: Array.isArray(row.history) ? (row.history as any[]) : [],
          }
        : { ...EMPTY };

      if (outcomeOfLastStep && state.currentStep) state = afterOutcome(state, outcomeOfLastStep);

      const { observed, observations, why, ...forTheMove } = read;
      const move = nextMove(state, { ...forTheMove, sessionNumber });
      let offered: string | null = null;
      if (move.move === 'offer') {
        offered = move.step;
        state = afterOffering(state, move.step, sessionNumber);
      }

      /* The read that produced this, kept beside it: the first outputs are to be read against their input. */
      const lastInput = { ...forTheMove, observed: observed ?? null, why: why ?? null, sessionNumber, outcomeOfLastStep: outcomeOfLastStep ?? null, move: move.move, offered, at: new Date().toISOString() } as any;
      await this.prisma.coachingState.upsert({
        where: { participantId },
        create: {
          participantId,
          currentStep: state.currentStep,
          stepGivenAt: state.stepGivenAt,
          staircase: state.staircase,
          staircasePosition: state.staircasePosition,
          history: state.history as any,
          lastInput,
          observations: (observations ?? []) as any,
        },
        update: {
          currentStep: state.currentStep,
          stepGivenAt: state.stepGivenAt,
          staircase: state.staircase,
          staircasePosition: state.staircasePosition,
          history: state.history as any,
          lastInput,
          ...(observations ? { observations: observations as any } : {}),
        },
      });
      return { offered };
    } catch (err) {
      this.logger.warn(`Could not record the coaching step for ${participantId}: ${(err as Error)?.message}`);
      return { offered: null };
    }
  }

  /**
   * #2 - Build a returning-user context block for session 2+.
   * Loads WORRY or TENSION entries from the most recent completed check-in and
   * injects the most important unresolved one. Adds an explicit guard preventing
   * the AI from asking "what have you been working on" to returning participants.
   */
  private async buildReturningUserContext(participantId: string, sessionNumber: number): Promise<string> {
    // Find all prior completed check-ins for this participant (for session 3+ longitudinal view).
    const priorCheckIns = await this.prisma.checkIn.findMany({
      where: {
        participantId,
        sessionNumber: { lt: sessionNumber },
        status: CheckInStatus.COMPLETED,
      },
      orderBy: { sessionNumber: 'desc' },
      select: { id: true, sessionNumber: true, specificityLevel: true, specificityDimensions: true },
    });
    if (!priorCheckIns.length) return '';

    const prevCheckIn = priorCheckIns[0]; // most recent prior session

    // Pull unresolved items - WORRY, TENSION, and open COMMITMENTs from ALL prior sessions.
    const allPriorIds = priorCheckIns.map(ci => ci.id);
    const lastEntries = await this.prisma.recordEntry.findMany({
      where: {
        checkInId: { in: allPriorIds },
        participantId,
        type: { in: [RecordEntryType.WORRY, RecordEntryType.TENSION, RecordEntryType.COMMITMENT] },
      },
      orderBy: { createdAt: 'asc' },
      select: { type: true, text: true },
    });

    if (!lastEntries.length) return '';

    // Prioritise: TENSION first, then WORRY, then COMMITMENT.
    const priority = [RecordEntryType.TENSION, RecordEntryType.WORRY, RecordEntryType.COMMITMENT];
    const sorted = [...lastEntries].sort((a, b) => priority.indexOf(a.type as any) - priority.indexOf(b.type as any));
    const topItem = sorted[0];

    const priorSpecificity = prevCheckIn.specificityLevel ?? 'unknown';
    const dims = prevCheckIn.specificityDimensions as Record<string, string> | null ?? null;
    const lowDimCount = dims ? Object.values(dims).filter((v) => v === 'vague' || v === 'managed').length : 0;
    const lowSpecificity = priorSpecificity === 'vague' || priorSpecificity === 'managed' || lowDimCount >= 3;

    // How many sessions IN A ROW came back thin, newest first. One thin week is
    // a week; several in a row is a person who has not been shown what we mean.
    const staleSessions = (() => {
      let n = 0;
      for (const ci of priorCheckIns) {
        const lvl = ci.specificityLevel ?? null;
        if (lvl === 'vague' || lvl === 'managed') n += 1;
        else break;
      }
      return n;
    })();

    const sessionRange = priorCheckIns.length > 1
      ? `sessions 1 through ${priorCheckIns[0].sessionNumber}`
      : `session ${priorCheckIns[0].sessionNumber}`;
    const lines: string[] = [
      `# Returning user - session ${sessionNumber} (${sessionRange} on record)`,
      `GUARD: Do NOT ask "what have you been working on?" or "what has been going on?" or any equivalent generic opening. This person has been here before. Open by referencing their specific record.`,
      `Most important unresolved item across all prior check-ins (${topItem.type}): "${topItem.text}"`,
    ];

    if (lowSpecificity) {
      const weakDims = dims
        ? Object.entries(dims).filter(([, v]) => v === 'vague' || v === 'managed').map(([k]) => k)
        : [];
      const dimNote = weakDims.length >= 3 ? ` Dimensions that were thin: ${weakDims.join(', ')}.` : '';
      lines.push(
        `SPECIFICITY NOTE: Their last session produced ${priorSpecificity} specificity.${dimNote} Do not open with the same framing as last time. Ask about one unexpected angle - what almost went wrong, what they wish had happened differently, or what they held back last time. Do not announce the change. Push for something concrete they can name.`,
      );

      // SHOW, once asking has stopped working.
      //
      // An eighteen-ground run had someone reach eight check-ins with "nothing
      // specific named yet" on their board. Every one of those sessions asked
      // her a different way. Re-angling the question works on someone who has
      // the answer and is not volunteering it; it does nothing for someone who
      // does not know what a checkable answer looks like. That person is
      // usually the one with the least practice at being asked - so the
      // product noticing and never helping lands hardest exactly where it
      // should land softest.
      //
      // Demonstrate, do not grade. Never say their answers have been thin.
      if (staleSessions >= 2) {
        lines.push(
          `THIS HAS NOT WORKED FOR ${staleSessions} SESSIONS RUNNING. Stop re-asking and SHOW them instead. Once, early, offer one example of the KIND of answer that can be checked later - built from their own situation, not a generic one: "something like: I sent the draft to Priya on the 14th, and she has not come back yet." Then ask your question again. Do not tell them their answers have been vague, do not compare them to anyone, and do not repeat the example if they still cannot give one - take what they give you and move on. Someone who cannot yet name specifics is not failing; they may never have been asked to work this way before.`,
        );
      }
    } else {
      lines.push(`Open by naming this specifically. Ask what has changed since they last described it.`);
    }

    return lines.join('\n');
  }

  /**
   * #15 - Evidence Definition enforcement.
   * Checks whether the EVIDENCE_DEFINITION_STEP has been completed for the
   * current session by looking for SUCCESS_DEFINITION entries that contain
   * both an artefact reference and a named verifier (two completions).
   * If the person turn count has reached 3+ and these are not present,
   * injects the EVIDENCE_DEFINITION_STEP prompt.
   */
  private async buildEvidenceDefinitionBlock(checkInId: string, participantId: string): Promise<string> {
    const personTurnCount = await this.prisma.conversationTurn.count({
      where: { checkInId, role: TurnRole.PERSON },
    });

    // Only inject after turn 3 to give the conversation time to develop.
    if (personTurnCount < 3) return '';

    // Check whether SUCCESS_DEFINITION has been established in this session.
    const successEntries = await this.prisma.recordEntry.findMany({
      where: { checkInId, participantId, type: RecordEntryType.SUCCESS_DEFINITION },
      select: { text: true },
    });

    // Consider evidence definition complete if we have at least 2 SUCCESS_DEFINITION
    // entries (artefact + verifier answers) or if any entry contains verifier language.
    const hasArtefact = successEntries.some((e) => e.text.length > 0);
    const hasVerifier = successEntries.some((e) =>
      /(who|confirm|person|name|specific|told|asked|knows?|verif)/i.test(e.text),
    );

    // If both artefact and verifier are present, evidence definition is complete.
    if (hasArtefact && hasVerifier) return '';

    // If only one or neither is complete, inject the evidence definition step.
    return '';
  }

  /**
   * Complete a check-in. Triggers structured extraction of record entries and
   * a single-party solo artifact (#93, #91). When BOTH parties finish session 1
   * (their first check-in), ReportsService.synthesize() is invoked via the
   * reports listener - not here, to keep parties isolated (#36).
   */
  /**
   * Remember HOW to talk to this person next time. Never what they said.
   *
   * Called once, on completion, so a session that never finished teaches
   * nothing. Failures here are swallowed: this is a convenience for the next
   * conversation and must never be the reason someone cannot close the one they
   * are in.
   */
  private async rememberStyle(checkIn: any): Promise<void> {
    try {
      const userId = checkIn.participant?.userId;
      if (!userId) return;
      const ground = await this.prisma.ground.findUnique({
        where: { id: checkIn.groundId },
        select: { organizationId: true },
      });
      if (!ground) return;

      const said = await this.prisma.conversationTurn.findMany({
        where: { checkInId: checkIn.id, role: TurnRole.PERSON },
        select: { content: true },
        orderBy: { createdAt: 'asc' },
      });
      const seen = observeStyle(said.map((t) => t.content ?? ''));

      const existing = await this.prisma.personStyleProfile.findUnique({
        where: { userId_organizationId: { userId, organizationId: ground.organizationId } },
      });
      const merged = mergeStyle(existing, seen);

      // groundsSeen counts GROUNDS, not sessions - twelve check-ins on one
      // ground is still one shared history, and counting sessions would tell the
      // engine someone is a veteran on their first week.
      const firstSessionHere = checkIn.sessionNumber === 1;
      await this.prisma.personStyleProfile.upsert({
        where: { userId_organizationId: { userId, organizationId: ground.organizationId } },
        create: { userId, organizationId: ground.organizationId, ...merged, groundsSeen: 1 },
        update: { ...merged, ...(firstSessionHere ? { groundsSeen: { increment: 1 } } : {}) },
      });
    } catch (e: any) {
      this.logger.warn(`Could not record how to talk to this person: ${e.message}`);
    }
  }

  /**
   * @param how `theyAskedToFinish`: the person pressed the thing that says they are done - the open
   *   link's "I am done" - which is the same sentence as "that's everything from me", said with a
   *   button. The turn floor lets that sentence out (see the floor below); it lets the button out too.
   *   Read live, 22 Sep 2026: three answers on an open-link discovery, "I am done", and "a few more
   *   exchanges are needed" - the pop-up Hafsah had reported that morning, on the other path.
   */
  async complete(checkInId: string, requestingUserId: WhoIsAsking, how: { theyAskedToFinish?: boolean; waitForTheCard?: boolean } = {}) {
    const checkIn = await this.openTheDoor(checkInId, requestingUserId);

    // Completion-readiness gate (B4): a check-in only closes once the person has
    // actually built a record. Hollow completions produce thin, over-confident
    // reports. Two checks, both required: at least 3 person turns, AND those
    // turns must carry real content - not just "yes"/"ok"/"fine" three times.
    // The character-count approach mirrors the thin-record heuristic already
    // used at report-synthesis time (reports.service.ts), applied here at the
    // gate instead of only flagged after the fact.
    //
    // Self-correction sessions carry a RELAXED gate. A correction is inherently
    // short and targeted ("the deadline was March, not May") - it is not a fresh
    // record being built from scratch. The engine legitimately closes a
    // correction after one or two exchanges, so the standard 3-turn floor would
    // strand it: the AI signals done, the input disables, but completion 400s
    // for a turn the person can no longer add. We still require ONE substantive
    // turn so a correction cannot close empty.
    const personTurnRows = await this.prisma.conversationTurn.findMany({
      where: { checkInId: checkIn.id, role: TurnRole.PERSON },
      select: { content: true },
    });
    /**
     * THE TURN FLOOR HAS THE SAME ESCAPE HATCH THE ENGINE HAS.
     *
     * closeReadiness lets somebody out below the floor the moment they say they
     * are done - "that's everything from me", "I need to go". That is right: it
     * is their session and nothing should trap them in it.
     *
     * This end did not know about that. So the engine accepted the sentence,
     * showed a "Complete session" button, and the server then refused the same
     * session for being one turn short. Invited to finish, then declined, on the
     * words that had just been honoured. It fired around forty times in one
     * six-person run and reads as a broken product, because from the outside it
     * is one.
     *
     * The record is still protected: the substance gate below is unconditional,
     * so somebody can leave early but cannot leave nothing behind.
     */
    const scenarioOfThis = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { scenario: true } }).then((g) => g?.scenario ?? null).catch(() => null);
    const minTurns = theFloorFor(!!checkIn.isSelfCorrection, scenarioOfThis);
    if (personTurnRows.length < minTurns && !how.theyAskedToFinish && !askedToFinish(personTurnRows.map((t) => t.content ?? ''))) {
      throw new BadRequestException({
        message:
          /* The same sentence the app and WhatsApp say (4 October 2026), in whole sentences, with no dash. */
          'I need a little more from you before this check-in can close. Please answer one or two more questions, then finish again.',
        /** See ANSWERABLE below: this refusal asks for something, so it must be possible to give it. */
        canContinue: true,
      });
    }
    // SUBSTANCE, NOT LENGTH. Counting characters rejected two of one person's
    // real check-ins in a live run - answers that named a buyer, a number and a
    // blocker, but tersely. Meanwhile "I think things are going quite well and
    // the team seems happy with progress overall" sails through at 90 characters
    // and says nothing. Length was measuring the wrong thing.
    //
    // A record is substantive when it contains specifics someone could later
    // check: a named person or organisation, a number, a date, or a concrete
    // outcome. Short and specific passes; long and vague does not.
    // THIS GATE ONLY STOPS AN EMPTY RECORD. It is not a quality bar.
    //
    // Two different jobs were being confused here. Whether someone ANSWERED is a
    // gate question. Whether their answer was any good is the BOARD's question,
    // and the board now reads that honestly (verifiability, negation-aware
    // specificity, trajectory). Enforcing quality here instead would trap an
    // evasive person until they produced specifics, which is badgering - the
    // design forbids it, and it punishes the honest person having a bad week
    // just as hard as the one avoiding.
    //
    // So: real sentences pass, even unverifiable ones. "ok / yes / fine" does not.

    /**
     * ANSWERABLE. A REFUSAL THAT ASKS FOR SOMETHING HAS TO LEAVE A WAY TO GIVE IT.
     *
     * These two gates say "answer one or two more questions, then complete" - and the person they
     * say it to often cannot. When the engine decides a session is over it returns sessionComplete,
     * the chat sets `done`, and `done` disables the composer. So the sequence is: the engine closes
     * the session, the person presses Complete, the server tells them to answer more, and the box
     * they would answer in is already switched off. There is nothing left to press. That is the
     * dead end behind "I could not complete the check-in".
     *
     * The turn floor above already had half of this fixed - it lets somebody out when they SAID
     * they were done. This gate is deliberately unconditional and stays that way: leaving early is
     * fine, leaving nothing behind is not, and weakening it would put empty records into shared
     * reports. What was missing was not a softer gate but an honest one, so it now tells the client
     * that this particular refusal is answerable, and the client re-opens the composer.
     *
     * `canContinue` is on the refusal rather than inferred from its wording, because matching on
     * the sentence would make the copy load-bearing: somebody rewording it later would silently
     * reinstate the trap.
     */
    if (almostNothingHereYet(personTurnRows.map((t) => t.content ?? ''), !!checkIn.isSelfCorrection)) {
      throw new BadRequestException({
        message: 'There is almost nothing here yet. Answer a couple of the questions properly, then complete.',
        canContinue: true,
      });
    }

    return this.finishTheSession(checkIn, 'the person', { waitForTheCard: how.waitForTheCard !== false });
  }

  /**
   * THE CLOCK CLOSING A SESSION DOES WHAT A PERSON CLOSING IT DOES.
   *
   * The auto-close sweep used to be a second, thinner definition of "completed": it wrote the
   * status, emitted the event and closed the round, and did none of the rest - no specificity
   * score, no record extraction, no anchoring, no solo artifact, no usage event, and no next
   * session. The person who walked away was stamped complete with an empty record, counted present
   * in a report built without their words, and left with nowhere to return to, so the next round
   * could never complete either. Now the sweep decides only WHICH sessions are stale; this is the
   * one place a session finishes. Public because the sweep lives in the grounds module.
   *
   * No readiness gates on this path, on purpose: the clock closes whatever is there. The gates in
   * complete() protect against a person leaving nothing behind; a person who left is the case they
   * cannot help.
   */
  async closeByTheClock(checkInId: string): Promise<{ status: 'completed'; groundId: string }> {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      include: { participant: { include: { user: { select: { awaitingOrgApproval: true, firstName: true, lastName: true } } } } },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');
    return this.finishTheSession(checkIn, 'the clock', { waitForTheCard: false });
  }

  /**
   * ONE SESSION FINISHES ONCE.
   *
   * Everything that happens when a session ends, after the gates: scoring, extraction, the status
   * write, the usage event, the next session, the completion event and the round. Two callers -
   * complete() for a person, closeByTheClock() for the sweep - and `by` changes exactly one thing:
   * the record carries that the clock closed it, so a report can say so rather than present
   * silence as an account.
   *
   * THE WRITE IS THE CLAIM. Two presses of Complete used to run all twelve extractors twice and emit
   * CHECK_IN_COMPLETED twice, double-firing the report builder and the webhook queue, because the
   * only "is it already complete" check was an in-memory read at the top of the method. The status
   * write is now guarded in its `where`: whoever flips IN_PROGRESS to COMPLETED wins, and only the
   * winner emits, schedules the next session and closes the round. The loser returns the same
   * completed response, because from the person's side it did complete.
   *
   * ISSUE 6 STANDS: the extractors still run BEFORE the write, so the record is populated before
   * the status change races past it - the other party's completion can trigger a round check that
   * reads this check-in as COMPLETED, and it must find the entries there. The cost of keeping that
   * order is that a true same-instant double press can still run the awaited extractors twice; the
   * event and the round are protected, the record may gain duplicate lines, and that is the cheaper
   * of the two failures. Closing it fully needs a claim column, which is its own change.
   */
  private async finishTheSession(
    checkIn: any,
    by: 'the person' | 'the clock',
    how: { waitForTheCard?: boolean } = {},
  ): Promise<{ status: 'completed'; groundId: string; endCard?: EndCard | null; whatYouGave?: WhatTheyGave }> {
    // Score session specificity from person's turns before marking complete
    /* A scorer that fails is logged by check-in, and the row says it was TRIED: specificityScoredAt set
       with no level is "scoring failed", which is not "not scored yet" and not a fact about the ground. */
    const specificityData = await this.scoreSessionSpecificity(checkIn.id).catch((err) => {
      this.logger.error(`Specificity scoring failed for check-in ${checkIn.id}: ${err?.message ?? err}`);
      return null;
    });

    // ISSUE 6: extractRecordEntries runs BEFORE the status flips to COMPLETED so
    // the record is populated before the status change races past it. buildSoloArtifact
    // is still fire-and-forget. Both are best-effort.

    /*
     * WHAT SOMEBODY WAITS FOR AT THE END OF A CHECK-IN, TIMED AND THEN NARROWED.
     *
     * Hafsah, 22 September 2026: "generating reports at the end of a checkin etc. all seem to load
     * for a long time." Three steps were awaited here in a row and eight more run in the background.
     * Only the first is a dependency: extraction writes the record, and the two after it read it.
     * They do not read each other, so they run together.
     */
    const closingStartedAt = Date.now();
    /* The card still being built is waited for, so what is written is what the card says. */
    /* Not for the clock, or a door that cannot hold a reply that long (WhatsApp's webhook). */
    if (how.waitForTheCard) await this.waitForTheCardBeingBuilt(checkIn.id);
    /* The lines the end card showed, if nothing was said after it (task 2.7). See writeTheRecordAtTheEnd. */
    const endCard: EndCard | null = await this.writeTheRecordAtTheEnd(checkIn).catch((err) => {
      this.logger.error(`Record extraction failed for check-in ${checkIn.id}: ${err.message}`);
      return null;
    });
    this.logger.log(`Check-in ${checkIn.id}: took the record out of it in ${Date.now() - closingStartedAt}ms.`);

    // Handoffs are a board object, so this only runs on SHARED-mode grounds.
    // Best-effort: a failure here must never block the check-in completing.
    this.extractDependencies(checkIn.id, checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Dependency extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );

    // Re-read which function map fits this person, from their own account. Runs
    // every session because detection is continuous, not a tag set once.
    this.extractStatedFigures(checkIn.id, checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Could not take the figures from ${checkIn.id}: ${err?.message}`));

    /*
     * AND THE GAPS ARE SETTLED FOR THIS ROUND: answered ones closed, unanswered ones recorded.
     *
     * AFTER EXTRACTION AND NOT BEFORE, which is where I first put it against my own comment saying
     * otherwise. Whether a slot was answered is a question about the record, and extraction is what
     * writes the record: run first, it reads a round that has not been extracted yet, so somebody
     * who gave a clear goal in this very session has it recorded as a gap. Watched happen - "the
     * goal or target that fits their own role", against a person who had just said 1,200 qualified
     * leads against 1,000 last quarter.
     *
     * A gap closes permanently the moment it is answered, in this round or any later one: a fact
     * does not stop being on the record because a new round began.
     */
    /* The two that read what extraction just wrote, together: neither reads the other. */
    const afterExtractionAt = Date.now();
    await Promise.all([
      /* The lines just taken are read against the documents this person can see, before the report
         reads recallBased. */
      this.anchorRecordToDocuments(checkIn.participantId, checkIn.groundId).catch((err) =>
        this.logger.warn(`Document anchoring failed for participant ${checkIn.participantId}: ${err.message}`)),
      this.settleTheGaps(checkIn).catch((err) =>
        this.logger.warn(`Check-in ${checkIn.id}: could not settle the gaps: ${err?.message}`)),
    ]);
    this.logger.log(`Check-in ${checkIn.id}: anchored the record and settled the gaps in ${Date.now() - afterExtractionAt}ms; the whole close took ${Date.now() - closingStartedAt}ms.`);
    this.extractWorkMentions(checkIn.id, checkIn.participantId, checkIn.groundId, checkIn.sessionNumber).catch((err) =>
      this.logger.warn(`Work-mention extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );

    /**
     * GW-EXP-1b. Fire-and-forget beside the other extractors, and for the same reason: a failure here
     * must never be why a person's completed session does not complete. It is initiator-only and
     * returns immediately for everybody else.
     */
    this.extractExpectations(checkIn.id, checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Expectation extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );

    /**
     * GW-EXP-3. Runs on every completion and returns immediately unless this person both has an
     * expectation and has said what doing well looks like. Re-read each session on purpose: their own
     * view develops, and a stale alignment is worse than none.
     */
    this.extractAlignment(checkIn.id, checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Alignment read failed for check-in ${checkIn.id}: ${err.message}`),
    );

    /**
     * GW-EXP-7. Fire-and-forget beside the others: an objection somebody raised must never be the
     * reason their session fails to complete. Returns immediately when nothing is expected of them.
     */
    this.extractWhatTheySayHappened(checkIn.id, checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Their-own-account extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );

    this.extractProgress(checkIn.id, checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Progress extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );

    this.extractOperatingDifferences(checkIn.id, checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Operating-difference extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );

    this.extractObjection(checkIn.id, checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Objection read failed for check-in ${checkIn.id}: ${err.message}`),
    );

    this.reviseDetectedFunction(checkIn.participantId).catch((err) =>
      this.logger.warn(`Function detection failed for participant ${checkIn.participantId}: ${err.message}`),
    );

    this.extractRoleConfirmation({ id: checkIn.id, participantId: checkIn.participantId }).catch((err) =>
      this.logger.warn(`Role-confirmation read failed for check-in ${checkIn.id}: ${err.message}`),
    );

    /**
     * G42. THE NOTICING, and the call that stops recordCoachingStep from being a
     * method nobody invokes - which is what it was an hour after being written,
     * in the same session I committed a note about exactly that failure.
     *
     * Best-effort and last, like the others: nothing about coaching may delay or
     * block a session completing.
     */
    this.observeForCoaching(checkIn.id, checkIn.participantId, checkIn.sessionNumber).catch((err) =>
      this.logger.warn(`Coaching observation failed for check-in ${checkIn.id}: ${err.message}`),
    );

    const won = await this.prisma.checkIn.updateMany({
      where: { id: checkIn.id, status: { not: CheckInStatus.COMPLETED } },
      data: {
        status: CheckInStatus.COMPLETED,
        completedAt: new Date(),
        specificityLevel: specificityData?.level ?? null,
        specificityScoredAt: new Date(),
        specificityDimensions: specificityData?.dimensions ?? undefined,
        /* The one thing `by` decides. A person's completion leaves whatever reason was already there. */
        ...(by === 'the clock' ? { closedReason: CLOSED_BY_THE_CLOCK } : {}),
      },
    });
    if (won.count === 0) {
      this.logger.warn(`Check-in ${checkIn.id} was completed by another call first; nothing emitted twice.`);
      return { status: 'completed', groundId: checkIn.groundId, ...(endCard ? { endCard } : {}) };
    }

    /*
     * AND WHAT THEY GAVE US, SAID BACK TO THEM.
     *
     * "specificity should be communicated to each user after their checkin." It has been measured on
     * every message since long before today and used only to pick the model's tone - the prompt
     * carrying it says "never name these system terms to the person" - so the one person who could
     * act on it was the only one never told.
     *
     * Read from what the conversation already holds: no model call, nothing a person waits for, and
     * nothing asserted that is not already in their own words. See what-they-gave-us-to-work-with.
     */
    const whatYouGave = whatTheyGaveUs(
      ((checkIn as any).whatWeHave as WhatWeHave) ?? null,
      (specificityData?.level ?? null) as any,
    );
    if (whatYouGave.saying) {
      this.logger.log(`Check-in ${checkIn.id}: told them what they gave - ${whatYouGave.checkable} checkable, ${whatYouGave.general} general.`);
    }

    /*
     * AND THEIR WHOLE ANSWER GOES INTO THE FIELDS EVERY ANSWER HOLDS.
     *
     * Here rather than when the report runs, and that is the whole design: one call now, with a
     * finished answer in front of it, instead of a hundred calls at once while somebody waits for a
     * report. What it produces is one row of the same shape as everybody else's, which is what makes
     * the findings arithmetic. Fire and forget - a report with ninety-nine rows is worth having and
     * nothing about a person's own completion may fail over it. See fitting-an-answer-into-the-frame.
     */
    this.fitTheirAnswer(checkIn.id).catch((err: any) =>
      this.logger.warn(`Could not fit the answer on ${checkIn.id} into the frame: ${err?.message}`));
    /*
     * AND WHAT THEY SAID THEY WOULD DO BECOMES A ROW, which is the half of the commitment loop that
     * was never built - see what-they-said-they-would-do-next.ts. Same fire-and-forget rule as the
     * fit above: nothing about a person finishing their own check-in may fail over it.
     */
    /* What they said happened to what they said last time, settled first so a promise they said is
       done is not then counted as said again (week 9). See what-happened-to-what-they-said. */
    this.settleWhatTheySaidTheyWouldDo(checkIn.id)
      .catch((err: any) => this.logger.warn(`Could not settle what they said they would do on ${checkIn.id}: ${err?.message}`))
      .then(() => this.writeWhatTheyPromised(checkIn.id))
      .catch((err: any) => this.logger.warn(`Could not write what they promised on ${checkIn.id}: ${err?.message}`));
    this.usage.emit(UsageEventType.CHECK_IN_COMPLETED, { groundId: checkIn.groundId, participantId: checkIn.participantId }).catch(() => undefined);

    /*
     * HOW THIS ONE SOUNDED.
     *
     * "It sounds like an examiner" is a real complaint and an unfalsifiable one, so the habits that
     * produce it are counted per conversation instead. Measured across 79 turns before the voice
     * work: a quarter opened by grading the answer, half said "the record" to the person whose work
     * it was, three quarters ended on a question, and not one carried a view.
     *
     * Logged rather than enforced, and after the write so it can never affect whether a check-in
     * completes. Two of the four cannot be enforced anyway - you cannot make a model have an
     * opinion, and a rule demanding one would produce fakes.
     */
    this.prisma.conversationTurn
      .findMany({ where: { checkInId: checkIn.id, role: TurnRole.AI }, select: { content: true } })
      .then((turns) => {
        const sound = howThisSounds(turns.map((t) => t.content));
        if (!sound.turns) return;
        this.logger.log(
          `Check-in ${checkIn.id} voice: ${sound.turns} turns, ` +
            `${sound.judgesTheAnswer} graded the answer, ${sound.saysTheRecord} said the record, ` +
            `${sound.endsOnAQuestion} ended on a question, ${sound.offersAView} offered a view.`,
        );
      })
      .catch(() => undefined);

    // Learn how to talk to this person next time - style only, never content.
    // On completion rather than per message, so an abandoned session teaches
    // nothing, and awaited so the next ground has it.
    await this.rememberStyle(checkIn);

    // Build a single-party artifact (B2) so the person has standalone value from
    // this session without waiting on anyone else. Fire-and-forget.
    this.buildSoloArtifact(checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.error(`Solo artifact failed for participant ${checkIn.participantId}: ${err.message}`),
    );

    // Open the next session for this party so they have somewhere to return to.
    await this.ensureNextSession(checkIn.groundId, checkIn.participantId, checkIn.sessionNumber);


    // Announce completion. The reports listener decides whether the ground is
    // now ready for synthesis (both parties through session 1 - #36). No import
    // of the reports module here - that would create a cycle.
    this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {
      checkInId: checkIn.id,
      groundId: checkIn.groundId,
      participantId: checkIn.participantId,
      sessionNumber: checkIn.sessionNumber,
      ...(by === 'the clock' ? { source: 'auto-close' as const } : {}),
    } satisfies CheckInCompletedEvent);

    /*
     * And whether that was the last one the round was waiting on. Awaited rather than
     * fire-and-forget like the others above: this one writes a row the delivery rule reads, so a
     * session reporting itself complete before the round row exists would let a reader see a round
     * as open that has in fact closed. Two queries and an insert that usually does nothing.
     */
    await recordRoundCompletion(this.prisma, this.events, checkIn.groundId, checkIn.sessionNumber);

    /* Only where there is something true to say. An empty block on the screen after somebody has
       just finished is worse than no block, and a session with nothing in its notes has nothing to
       tell anybody about their own answers. */
    /* The card, with exactly the lines just written, so the screen shows it even if it never saw it arrive. */
    return { status: 'completed', groundId: checkIn.groundId, ...(endCard ? { endCard } : {}), ...(whatYouGave.saying ? { whatYouGave } : {}) };
  }

  /**
   * Create the next session for a participant if it does not already exist.
   * Sets availableFrom based on the ground's cadence so session 2 respects
   * the fortnightly / weekly / monthly schedule.
   */
  /**
   * PUBLIC because the entry flow needs it too.
   *
   * This runs when a session COMPLETES, and the anonymous entry flow never
   * completes one - it writes session 1 straight to COMPLETED at commit time
   * (`entry.service.ts`, "Create and mark session 1 complete"). So a ground made
   * through the entry chat, which is the flow most people meet first, was created
   * with exactly one check-in and nothing ever scheduled a second.
   *
   * The visible symptom was the whole of "I have no way to come in and do my
   * checkin": the ground page offers "Session N is ready for you" only when an
   * open check-in row exists, and for these grounds none ever did. It read as a
   * missing button. The button was fine; there was no session for it to open.
   */
  async ensureNextSession(groundId: string, participantId: string, sessionNumber: number) {
    /* A managing-only lead checks in once, to set the context. After that only the people they
       invited check in, so no second session is made for them. */
    const me = await this.prisma.groundParticipant.findUnique({ where: { id: participantId }, select: { managingOnly: true } }).catch(() => null);
    if (me?.managingOnly) return;
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { cadence: true, cadenceAnchorDay: true, endsAt: true, status: true, workingDays: true, timelineDays: true },
    });

    /*
     * NOTHING FOLLOWS THE END. A ground that has been resolved, closed or stalled gets no next
     * session, and neither does the closing session itself - it is called the closing session
     * because there is nothing after it. Watched live: a resolved ground grew a "Session 5 of 6"
     * for both people minutes after the decision was taken. See a-ground-that-has-ended.ts.
     */
    /* Stalled counts here too: a check-in that ran out of time must not quietly grow a session 6
       while nobody can answer session 5. Reopening it is what schedules again. */
    if (isShut(ground?.status)) {
      this.logger.log(`No next session for ${participantId}: ground ${groundId} is ${ground?.status}.`);
      return;
    }
    const cadence = ground?.cadence ?? Cadence.FORTNIGHTLY;

    // ONE_TIME: a single check-in, full stop. No next session for this party,
    // ever - not "not yet scheduled" like SEQUENTIAL, but genuinely never.
    // Explicit early return rather than relying on a 0-day step in
    // cadenceDays below: a 0-day step still CREATES a session (immediately
    // available), which is the opposite of "no follow-up round."
    if (cadence === Cadence.ONE_TIME) return;

    const justClosed = await this.prisma.checkIn.findUnique({
      where: { participantId_sessionNumber: { participantId, sessionNumber } },
      select: { isFinal: true },
    });
    if (justClosed?.isFinal) {
      this.logger.log(`No next session for ${participantId}: session ${sessionNumber} was the closing one.`);
      return;
    }

    // The completer's own next session. For SEQUENTIAL there is no clock: their
    // next round is not auto-scheduled (availableFrom stays null until triggered).
    const ownAvailableFrom =
      cadence === Cadence.SEQUENTIAL ? null : this.cadenceToDate(cadence, ground?.cadenceAnchorDay ?? null, ground?.workingDays ?? []);
    /*
     * THE RUN HAS AS MANY SESSIONS AS IT SAYS. A 90-day quarterly check-in reads "Session 1 of 1", and
     * when its one session closed a second was created for day 90 - the end date itself - so the
     * board opened on round 2 and read "0 of 2 answered this round" to a woman who had just answered
     * (Hafsah, 21 Sep 2026). The planned count is the same arithmetic the header uses; a session past
     * it, or opening on or after the end, is not made.
     */
    const planned = totalSessionsFor((ground as any)?.timelineDays ?? null, cadence);
    if (planned != null && sessionNumber >= planned) {
      this.logger.log(`No next session for ${participantId}: session ${sessionNumber} of ${planned} was the last planned.`);
      return;
    }
    // Respect the end date: do not schedule a next session on or past it.
    const pastEnd = ground?.endsAt && ownAvailableFrom && ownAvailableFrom >= ground.endsAt;
    if (!pastEnd) {
      await this.createNextIfAbsent(groundId, participantId, sessionNumber + 1, ownAvailableFrom);
    }

    // SEQUENTIAL trigger: when the INITIATOR checks in, the team's next round
    // opens immediately (this is the "I check in, my team gets theirs" mode).
    if (cadence === Cadence.SEQUENTIAL) {
      const me = await this.prisma.groundParticipant.findUnique({
        where: { id: participantId },
        select: { partyType: true },
      });
      if (me?.partyType === PartyType.INITIATOR) {
        const others = await this.prisma.groundParticipant.findMany({
          where: { groundId, partyType: { not: PartyType.INITIATOR }, userId: { not: null } },
          select: { id: true },
        });
        const now = new Date();
        for (const o of others) {
          // Open their earliest not-started session now; if none exists, create it.
          const open = await this.prisma.checkIn.findFirst({
            where: { participantId: o.id, status: CheckInStatus.NOT_STARTED },
            orderBy: { sessionNumber: 'asc' },
          });
          if (open) {
            await this.prisma.checkIn.update({ where: { id: open.id }, data: { availableFrom: now } });
          } else {
            const last = await this.prisma.checkIn.findFirst({
              where: { participantId: o.id },
              orderBy: { sessionNumber: 'desc' },
              select: { sessionNumber: true },
            });
            await this.createNextIfAbsent(groundId, o.id, (last?.sessionNumber ?? 0) + 1, now);
          }
        }
      }
    }
  }

  private async createNextIfAbsent(groundId: string, participantId: string, sessionNumber: number, availableFrom: Date | null) {
    const existing = await this.prisma.checkIn.findUnique({ where: { participantId_sessionNumber: { participantId, sessionNumber } } });
    if (existing) return;
    // AUTO-FLAG the closing session: the last cadence slot inside the ground's
    // timeline is final - the person is told to document thoroughly and the
    // final report reads the whole arc. (The other path is the initiator's
    // explicit "Begin the closing session".)
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { timelineDays: true, cadence: true, runsUntilEnded: true },
    });
    // ONE_TIME never reaches this function - ensureNextSession's early return
    // above (and the SEQUENTIAL-only guard on the other caller) mean
    // createNextIfAbsent is never called for a ONE_TIME ground. No entry for
    // it here: a phantom "ONE_TIME: 0" used to sit next to SEQUENTIAL, but a
    // 0-day step still creates a session (immediately available) - the
    // opposite of "no follow-up" - so a stray future caller falling through
    // to that entry would have silently broken the guarantee.
    const cadenceDays: Record<string, number> = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30, SEQUENTIAL: 0 };
    const step = cadenceDays[ground?.cadence ?? ''] ?? 0;
    /* A check-in that runs until the lead ends it has no planned last session, so no session is made final. */
    const planned = step > 0 && ground && !ground.runsUntilEnded ? Math.max(1, Math.floor(ground.timelineDays / step)) : null;
    const isFinal = planned != null && sessionNumber >= planned;

    /**
     * A GROUND THAT HAS RUN ITS PLAN IS OVER.
     *
     * isFinal was computed here and then used only to change the wording of the
     * closing session's opening message. Nothing consulted it before making the
     * NEXT one, and the only stop conditions above are ONE_TIME and an endsAt
     * date that is usually null - so completing the final session created
     * another, which created another.
     *
     * Seen live on a ninety-day weekly ground, which plans twelve check-ins:
     *
     *     session 12  COMPLETED  isFinal  <- the plan ends here
     *     session 13  COMPLETED  isFinal
     *     session 14  COMPLETED  isFinal
     *     session 15  IN_PROGRESS
     *
     * Every one of those is a real ask of two real people, and the ground could
     * never report itself finished because there was always one more waiting.
     * A person would be asked to check in on a closed piece of work forever.
     *
     * Past the plan, no next session.
     */
    if (planned != null && sessionNumber > planned) return;

    await this.createSessionOnce({ groundId, participantId, sessionNumber, status: CheckInStatus.NOT_STARTED, availableFrom, isFinal });
  }

  /**
   * A SESSION IS CREATED ONCE, HOWEVER MANY TIMES THE REQUEST ARRIVES.
   *
   * Every place that makes a session computed `last + 1` and then created, against
   * `@@unique([participantId, sessionNumber])`, with nothing catching the collision. Two requests
   * in the same instant - a double click, a retry, the entry flow and the completion racing - both
   * read the same `last`, and the second create threw P2002 as a 500. On ensureNextSession that 500
   * came out of complete(), at the exact moment the person's work was being saved.
   *
   * The unique index was always the right arbiter. This lets it decide, and on a collision hands
   * back the row that won.
   */
  private async createSessionOnce(data: Prisma.CheckInUncheckedCreateInput) {
    try {
      return await this.prisma.checkIn.create({ data });
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
      const existing = await this.prisma.checkIn.findUnique({
        where: { participantId_sessionNumber: { participantId: data.participantId, sessionNumber: data.sessionNumber } },
      });
      if (!existing) throw err;
      this.logger.log(`Session ${data.sessionNumber} for participant ${data.participantId} already existed; using it.`);
      return existing;
    }
  }


  /**
   * Convert a cadence enum to the next available date from now.
   * anchorDay: weekly/fortnightly = weekday (0=Sun..6=Sat); monthly = day of month (1-31).
   */
  private cadenceToDate(cadence: Cadence, anchorDay: number | null = null, workingDays: number[] = []): Date {
    /*
     * EVERY BRANCH ENDS AT THE SAME ROLL-FORWARD, WHICH IS WHY IT IS WRAPPED RATHER THAN REPEATED.
     *
     * Daily was `+1 day` flat and landed on Saturdays. Fixing only that branch would have left a
     * fortnightly anchor doing the same thing more quietly, and a check-in that opens on a day
     * nobody works reads on the board as somebody who did not answer.
     */
    const onADayTheyWork = (date: Date) => theNextDayTheyWork(date, workingDays);
    const d = new Date();
    if (cadence === Cadence.DAILY) {
      d.setDate(d.getDate() + 1);
      return onADayTheyWork(d);
    }
    if (cadence === Cadence.MONTHLY) {
      // Next month; if a day-of-month anchor is set, land on it (clamped to month length).
      d.setMonth(d.getMonth() + 1);
      if (anchorDay != null && anchorDay >= 1 && anchorDay <= 31) {
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(anchorDay, daysInMonth));
      }
      return onADayTheyWork(d);
    }
    const days = cadence === Cadence.WEEKLY ? 7 : 14; // FORTNIGHTLY = 14
    d.setDate(d.getDate() + days);
    // For weekly cadences with a fixed weekday (e.g. "every Monday"), roll forward
    // to the next occurrence of that weekday.
    if ((cadence === Cadence.WEEKLY || cadence === Cadence.FORTNIGHTLY) && anchorDay != null && anchorDay >= 0 && anchorDay <= 6) {
      while (d.getDay() !== anchorDay) d.setDate(d.getDate() + 1);
    }
    return onADayTheyWork(d);
  }

  /**
   * Score the specificity level for the session from person's turns.
   * Returns mapped level (specific/directional/vague/managed) and recall confidence.
   */
  /**
   * The mapper and the order live in how-checkable-a-session-was.ts, because four functions used
   * to disagree about them. `recallConfidence` is no longer produced: it was this same specificity
   * number under a second name, and the report presented the two as independent corroboration.
   * Measuring recall honestly (RecordEntry.recallBased) is structurally zero for any ground with no
   * documents (planaudit_b.md C7), so the column is written null and its sentence is gone.
   */
  /** A document this person attached to this check-in's ground since the session started. Best effort. */
  private async theyAttachedADocumentIn(checkInId: string): Promise<boolean> {
    try {
      const row = await this.prisma.checkIn?.findUnique?.({ where: { id: checkInId }, select: { groundId: true, participantId: true, startedAt: true } as any });
      if (!(row as any)?.groundId || !(row as any)?.participantId || !this.prisma.groundDocument?.count) return false;
      const n = await this.prisma.groundDocument.count({
        where: {
          groundId: (row as any).groundId,
          participantId: (row as any).participantId,
          ...((row as any).startedAt ? { createdAt: { gte: (row as any).startedAt } } : {}),
        } as any,
      });
      return n > 0;
    } catch {
      return false;
    }
  }

  private async scoreSessionSpecificity(checkInId: string): Promise<{
    level: SpecificityLevel;
    dimensions: Record<string, SpecificityLevel>;
  }> {
    const personTurns = await this.prisma.conversationTurn.findMany({
      where: { checkInId, role: TurnRole.PERSON },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });
    /* The rule lives in the-specificity-read.ts, so a stored session is brought up to date by the same one (request 103). */
    const attachedADocument = personTurns.length ? await this.theyAttachedADocumentIn(checkInId) : false;
    return readTheTurns(personTurns.map((t) => t.content ?? ''), attachedADocument);
  }

  /**
   * Extract RecordEntry rows from one party's transcript (#93). Owner-scoped:
   * reads only this check-in's turns. Stores the person's own words plus a
   * verifiability rating (HIGH/MEDIUM/LOW) for each entry so the synthesis can
   * weight evidence-backed claims appropriately.
   */
  /**
   * CLOSE WHAT WAS ANSWERED, RECORD WHAT WAS NOT, AND PRESS NOTHING.
   *
   * Run once at the end of a round. Everything still owed at that point is a gap: either it is
   * newly recorded, or it has been asked again and its count goes up. Past the limit the
   * conversation stops asking for it and the lead sees it on their own page instead.
   *
   * A gap is never a mark against anybody. It is a thing the record does not have, which is a fact
   * about the record - and half the time the honest reason is that nobody could have answered it.
   */
  /**
   * THE PLAN FOR THIS SESSION: read from the row when it exists; written once at the opener when it does
   * not. Everything the planner reads was already computed for the prompt; this adds the role map, the
   * behaviour seen in earlier periods, the coaching step and how they have answered before.
   */
  private async thePlanForThisSession(
    checkIn: { id: string; groundId: string; participantId: string; sessionNumber: number; participant: any },
    ground: any,
    got: { forTheOpener: boolean; pack: string; recordAlreadyHolds: string; doesNotAddUp: string; owed: string[]; declined: string[]; earlier: { text: string; type: string; session: number }[]; turnsThisSession: { role: 'AI' | 'PERSON'; content: string }[] },
  ): Promise<string> {
    const row = await this.prisma.checkIn?.findUnique?.({ where: { id: checkIn.id }, select: { sessionPlan: true, isFinal: true } as any }).catch(() => null);
    let plan = tidyThePlan((row as any)?.sessionPlan);
    if (!plan && got.forTheOpener) {
      const [patterns, coaching, earlierTurns] = await Promise.all([
        this.prisma.patternDetection?.findMany?.({
          where: { participantId: checkIn.participantId },
          select: { code: true, observationText: true, periodsObserved: true },
          orderBy: { periodsObserved: 'desc' },
          take: 6,
        })?.catch(() => [] as any[]) ?? [],
        this.prisma.coachingState?.findUnique?.({ where: { participantId: checkIn.participantId }, select: { currentStep: true } })?.catch(() => null) ?? null,
        this.prisma.conversationTurn?.findMany?.({
          where: { role: TurnRole.PERSON, checkIn: { participantId: checkIn.participantId, sessionNumber: { lt: checkIn.sessionNumber ?? 1 } } },
          select: { content: true },
          take: 80,
        })?.catch(() => [] as any[]) ?? [],
      ]);
      const codeOf = (code: string) => [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES].find((c) => c.code === code);
      const planned = totalSessionsFor(ground.timelineDays, ground.cadence) ?? null;
      const brief = theBriefForThePlanner({
        scenarioLabel: `${ground.scenario}${ground.label ? `: ${ground.label}` : ''}`,
        pack: got.pack,
        sessionNumber: checkIn.sessionNumber ?? 1,
        sessionsPlanned: planned,
        stage: stageOf(checkIn.sessionNumber ?? 1, planned, !!(row as any)?.isFinal),
        oneTime: ground.cadence === Cadence.ONE_TIME,
        person: {
          firstName: theFirstNameFrom((checkIn.participant as any)?.user?.firstName, (checkIn.participant as any)?.user?.lastName),
          /* "Who described their role as" is only true of the lead's own row (request 36). */
          roleAsDescribed: aRoleInTheirOwnWords(checkIn.participant as any),
          isLead: checkIn.participant?.partyType === PartyType.INITIATOR,
        },
        roleMap: roleMapFor(checkIn.participant?.detectedFunction ?? null),
        leadBrief: ground.brief ?? null,
        recordAlreadyHolds: got.recordAlreadyHolds,
        doesNotAddUp: got.doesNotAddUp,
        owed: got.owed,
        declinedOrAskedTwice: got.declined,
        earlier: got.earlier,
        patterns: (patterns as any[]).map((p) => ({ code: p.code, name: codeOf(p.code)?.name ?? p.code, observation: p.observationText ?? null, periods: p.periodsObserved ?? 1, probe: codeOf(p.code)?.probe ?? null })),
        coachingStep: (coaching as any)?.currentStep ?? null,
        howTheyAnswer: howTheyAnswered((earlierTurns as any[]).map((t) => t.content ?? ''), (t) => runIntake(t).checkable, theyDeclined),
      });
      const raw = await this.anthropic.extract<any>(PLAN_PROMPT, [{ role: 'user', content: brief }], PLAN_TOOL, { fast: true });
      plan = tidyThePlan(raw, { coach: (patterns as any[]).length > 0 || !!(coaching as any)?.currentStep });
      if (plan) {
        /* Where the questions came from, kept as plain keys so the learning counts can set them beside how specific the answers were (week 8b). */
        const probeSources = probeSourcesOffered({
          scenario: String(ground.scenario ?? '') || null,
          detectedFunction: checkIn.participant?.detectedFunction ?? null,
          roleHasNeutralQuestions: !!roleMapFor(checkIn.participant?.detectedFunction ?? null)?.neutralProbes?.length,
          patternCodesWithAQuestion: (patterns as any[]).filter((p) => codeOf(p.code)?.probe).map((p) => p.code),
        });
        await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { sessionPlan: plan as any, probeSources } as any }).catch(() => undefined);
        this.logger.log(`Check-in ${checkIn.id}: planned. Must establish: ${plan.mustEstablish}`);
      } else {
        this.logger.warn(`Check-in ${checkIn.id}: the planner returned nothing usable; the session runs without a plan.`);
      }
    }
    return plan ? sayThePlan(plan, got.turnsThisSession, got.forTheOpener) : '';
  }

  /**
   * WHAT THIS SESSION IS FOR AND HAS NOT YET ASKED. The close bar reads it: a session that closes
   * with a required thing never raised is the "closing too early" the judge counted thirty times
   * (adversarial runs, 20 Sep 2026). Only things the record can prove (`certain`), only for this
   * role and stage, only those no turn of this session came near. Asked and unanswered is not here:
   * asking a third time is the other fault.
   */
  /**
   * WHAT TO SAY WHEN A QUESTION HAS TO BE LET GO: which owed thing the last ask was about (so the
   * absence can be named), and the next thing - the plan's next unasked question, else the next owed
   * thing never asked. See a-refusal-is-an-answer.
   */
  private async howToMoveOn(checkInId: string, lastAsk: string): Promise<{ declinedWhat: string | null; question: string | null; owed: string | null }> {
    const row = await this.prisma.checkIn.findUnique({ where: { id: checkInId }, select: { sessionPlan: true } as any }).catch(() => null);
    const plan = tidyThePlan((row as any)?.sessionPlan);
    const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' }, select: { role: true, content: true } }).catch(() => []);
    const asTurns = turns.map((t) => ({ role: t.role === TurnRole.AI ? 'AI' as const : 'PERSON' as const, content: t.content ?? '' }));
    let question: string | null = null;
    if (plan) {
      const things = plan.questions.map((q, i) => ({ id: `plan-${i + 1}`, what: q.ask }));
      const covered = sayWhatHasBeenCovered(things, whatThisSessionHasCovered(things, asTurns));
      question = covered.notAsked.find((t) => !asksTheSameThingAgain(lastAsk, t.what))?.what ?? null;
    }
    const neverAsked = await this.whatThisSessionNeverAsked(checkInId).catch(() => [] as string[]);
    const owed = neverAsked.find((w) => !asksTheSameThingAgain(lastAsk, w)) ?? null;
    /* Which owed thing the abandoned question was about, so the line can name what goes unrecorded. */
    const all = await this.everythingOwedHere(checkInId).catch(() => [] as string[]);
    const declinedWhat = all.find((w) => asksTheSameThingAgain(w, lastAsk)) ?? null;
    return { declinedWhat, question, owed };
  }

  private async everythingOwedHere(checkInId: string): Promise<string[]> {
    const checkIn = await this.prisma.checkIn.findUnique({ where: { id: checkInId }, select: { groundId: true } });
    if (!checkIn) return [];
    const ground = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { scenario: true, brief: true } as any });
    return (this.whichOwedListFor((ground as any)?.scenario, (ground as any)?.brief ?? null) ?? []).map((o) => o.what);
  }


  private async whatThisSessionNeverAsked(checkInId: string): Promise<string[]> {
    const covered = await this.theCoverageFor(checkInId);
    return covered ? covered.notAsked.map((o) => o.what) : [];
  }

  /** What this person has answered this session, with the answer, so a second ask can be stopped at the reply. */
  private async whatThisSessionHasAnswered(checkInId: string): Promise<{ thing: AThingToCover; answer: string }[]> {
    const covered = await this.theCoverageFor(checkInId);
    if (!covered) return [];
    /* A vague answer given to a thing already asked twice is an answer too: the pack allows one more ask for
       the specific, and after that "No reliable weekly paddy price" is what they said (run 11). */
    const askedTwice = covered.leave.filter((v) => v.why === 'asked twice').map((v) => ({ thing: v.thing, answer: v.answer ?? 'what they said the first two times' }));
    return [...covered.answered, ...askedTwice];
  }

  private async theCoverageFor(checkInId: string): Promise<ReturnType<typeof sayWhatHasBeenCovered> | null> {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: { groundId: true, participantId: true, sessionNumber: true, isFinal: true, participant: { select: { userId: true, roleAsDescribed: true, partyType: true } } },
    });
    if (!checkIn) return null;
    const ground = await this.prisma.ground.findUnique({
      where: { id: checkIn.groundId },
      select: { scenario: true, brief: true, initiatorId: true, timelineDays: true, cadence: true } as any,
    });
    const owed = this.whichOwedListFor((ground as any)?.scenario, (ground as any)?.brief ?? null);
    if (!owed) return null;
    const [types, gapRows, turns] = await Promise.all([
      this.prisma.recordEntry.findMany({ where: { participantId: checkIn.participantId, disputedAt: null }, select: { type: true, text: true } }),
      this.prisma.checkInGap.findMany({ where: { participantId: checkIn.participantId }, select: { slug: true, asked: true, answeredAt: true } }),
      this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' }, select: { role: true, content: true } }),
    ]);
    const stage = stageOf(checkIn.sessionNumber ?? 1, totalSessionsFor((ground as any)?.timelineDays, (ground as any)?.cadence) ?? null, !!checkIn.isFinal);
    const role = this.roleOfTheReaderFor(ground as any, { participant: checkIn.participant } as any);
    const still = whatIsStillOwed(owed, role, stage, {
      types: types.map((t) => t.type),
      entries: types.map((t) => ({ type: t.type, text: cleanText((t as any).text ?? '') })),
      answered: gapRows.filter((g) => g.answeredAt).map((g) => g.slug),
      letGo: gapRows.filter((g) => !g.answeredAt && g.asked >= ASK_TWICE_THEN_LET_IT_GO).map((g) => g.slug),
    });
    /*
     * A THING NOTHING ON THE RECORD CAN PROVE IS STILL A THING TO ASK. `noTypeYet` items were dropped
     * here, so "the wider objective theirs sits under" was never in the plan and never held for, and a
     * goals check-in took a rep from "$50,000 in signed contracts" to the close without once asking
     * what that sat under, beside a $1,000,000 team target on his own screen (Abubakar, 21 Sep 2026).
     * Coverage reads the turns, not the record, so it can see whether such a thing was asked. It asks,
     * it does not insist: the hold is one ask, capped at two, and a decline ends it.
     */
    return sayWhatHasBeenCovered(
      still,
      whatThisSessionHasCovered(still, turns.map((t) => ({ role: t.role === TurnRole.AI ? 'AI' as const : 'PERSON' as const, content: t.content ?? '' }))),
    );
  }

  private async settleTheGaps(checkIn: any): Promise<void> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: checkIn.groundId },
      /* No totalSessions on a ground: the planned length is derived from the timeline and the
         cadence, which is what session-count exists for. Selecting it threw the whole settle. */
      select: { scenario: true, brief: true, initiatorId: true, timelineDays: true, cadence: true } as any,
    });
    const owed = this.whichOwedListFor((ground as any)?.scenario, (ground as any)?.brief ?? null);
    if (!owed) return;

    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: checkIn.participantId },
      select: { userId: true, roleAsDescribed: true, partyType: true },
    });
    const [types, gapRows] = await Promise.all([
      this.prisma.recordEntry.findMany({
        where: { participantId: checkIn.participantId, disputedAt: null },
        select: { type: true, text: true },
      }),
      this.prisma.checkInGap.findMany({ where: { participantId: checkIn.participantId } }),
    ]);

    const stage = stageOf(
      checkIn.sessionNumber ?? 1,
      totalSessionsFor((ground as any)?.timelineDays, (ground as any)?.cadence) ?? null,
      !!checkIn.isFinal,
    );
    const role = this.roleOfTheReaderFor(ground as any, { participant } as any);
    const held = {
      types: types.map((t) => t.type),
      entries: types.map((t) => ({ type: t.type, text: cleanText((t as any).text ?? '') })),
      answered: gapRows.filter((g) => g.answeredAt).map((g) => g.slug),
      letGo: [] as string[],
    };

    /* Anything now satisfied that was open is answered, whichever round it was asked in. */
    const stillOwedIds = new Set(whatIsStillOwed(owed, role, stage, held).map((o) => o.id));
    const nowAnswered = gapRows.filter((g) => !g.answeredAt && !stillOwedIds.has(g.slug));
    if (nowAnswered.length) {
      await this.prisma.checkInGap.updateMany({
        where: { id: { in: nowAnswered.map((g) => g.id) } },
        data: { answeredAt: new Date() },
      });
    }

    for (const o of owed.filter((x) => stillOwedIds.has(x.id))) {
      const existing = gapRows.find((g) => g.slug === o.id);
      if (existing?.answeredAt) continue;
      if (existing) {
        await this.prisma.checkInGap.update({ where: { id: existing.id }, data: { asked: existing.asked + 1 } });
      } else {
        await this.prisma.checkInGap.create({
          data: {
            groundId: checkIn.groundId,
            participantId: checkIn.participantId,
            slug: o.id,
            what: o.what,
            /* A slot nothing can prove is asked and then recorded as unconfirmable, not as
               unanswered. See `certain` on the model. */
            certain: !o.noTypeYet,
            firstRound: checkIn.sessionNumber ?? 1,
          },
        });
      }
    }
  }

  /**
   * WHAT WE HAVE SO FAR, KEPT UP TO DATE ONE TURN AT A TIME.
   *
   * Runs AFTER the reply has gone, so nobody waits for it, and best-effort, so a conversation never
   * fails over its own working notes. The state is therefore one turn behind when the next reply is
   * composed - which is the right arrangement: what reads from it is a challenge about accumulated
   * claims, not a comment on the word just typed. See reading-what-they-just-said.
   *
   * A remark about the product is counted and nothing else: it is not an answer, so it adds no
   * claims, and the extractor is not even asked about it.
   */
  /**
   * THE SUBJECTS THIS BRIEF ASKS ABOUT, READ ONCE PER CHECK-IN.
   *
   * Lazy rather than at creation: a brief can be written, rewritten and pasted over before anybody
   * answers, and a list read from the first draft would send a hundred people through the wrong
   * ground. The first conversation to need it reads it, and every conversation after that uses the
   * same list - which is the point, since a hundred answers only add up to one picture if everybody
   * was asked about the same things.
   *
   * Best effort. Where it fails the conversation is exactly what it was yesterday: the brief's own
   * questions, and the holes in what somebody said.
   */
  /**
   * WHICH HOLE TO PUSH ON THIS TURN, AND WHICH OF THE BRIEF'S SUBJECTS THAT PUSHES.
   *
   * WHAT THEY ASKED FOR COMES FIRST. The brief promises them they can direct this conversation. A
   * product that then asks its own next question has broken a promise it made before they typed
   * anything, which is worse than never having offered. Their steer is dropped from the rank only
   * once they have actually talked about it - by the same coverage rule as everything else.
   *
   * THEN A CHALLENGE, WHERE THERE IS ONE TO PUT. Asking "what is the baseline?" is a form asking
   * for a field. Saying "that is sixty thousand measurements, twice, of the same people - is
   * somebody running that?" is the same gap with the consequence attached, and it is the difference
   * between a survey and somebody who knows the work. Everything it asserts is arithmetic or a
   * definition, never a fact about anybody's business - see what-a-claim-costs-to-prove.
   *
   * THEN BREADTH AGAINST DEPTH. `whatToAskAbout` pushes on a hole in what somebody said - a target
   * with no way to verify it, a change with no baseline. Left alone it will spend a whole check-in
   * sharpening one claim while seven of the brief's subjects go unasked, which is the complaint
   * this started from: "the questions dont help us get what we want".
   *
   * IT RETURNS THE SUBJECT AS WELL AS THE WORDS because the note written after the reply has to
   * know which subject this turn put to them, so an answer in their own vocabulary still counts as
   * covered. Both callers run it on the same state, so neither can drift from the other - the
   * alternative was the rank written twice, and the second copy being subtly wrong is exactly how
   * somebody gets asked the same question at turn five that they answered at turn one.
   */
  private whichHoleToPush(
    notes: WhatWeHave | null,
    subjects: ASubject[],
    theirAnswers: string[],
    frame: AField[] = [],
  ): { text: string; subject: ASubject | null; field?: AField | null } {
    const raised = notes?.covered ?? [];
    const stillOwed = (notes?.asked ?? [])
      .map((subject) => asSomethingToCover(subject))
      .filter((s) => !theyHaveTalkedAbout(s as any, theirAnswers));
    if (stillOwed.length) return { text: followTheirLead(stillOwed[0].subject), subject: null };
    /*
     * AND THE LEAD'S OWN FIELDS COME BEFORE OUR CURIOSITY, WHILE MOST OF THEM ARE STILL MISSING.
     *
     * Eighty-six of a hundred and one conversations never reached how the person vets anybody.
     * Seventy-two never reached which actors they need. Sixty never reached volumes. The frame says
     * what a complete answer holds; without this it was a specification nothing was held to, and
     * the report was asked to bucket answers that had never been collected.
     *
     * AHEAD OF THE CHALLENGE, and only while half of them are still owed. The challenge is the
     * thing that makes this feel like somebody who knows the work, and it is worth nothing if the
     * conversation ends without the columns the lead asked for. Once the shape is there it goes
     * back in front, which is the same trade breadthFirst makes next door.
     */
    const theirKind = [notes?.who?.organisation, notes?.who?.role].filter(Boolean).join(' ') || null;
    if (frame.length && theFrameComesFirst(frame, notes, theirKind)) {
      const field = theFieldWorthAsking(frame, notes, theirKind);
      if (field) return { text: askForThisField(field), subject: null, field };
    }
    const challenge = theChallengeWorthPutting(notes?.claims, notes?.challenged ?? []);
    if (challenge) return { text: sayThisChallenge(challenge), subject: null };
    /* And after it, because a missing column still beats a topic nobody asked for. */
    if (frame.length) {
      const field = theFieldWorthAsking(frame, notes, theirKind);
      if (field) return { text: askForThisField(field), subject: null, field };
    }
    const cover = () => {
      const s = theSubjectWorthRaising(subjects, theirAnswers, raised);
      const text = whatToCoverNext(subjects, theirAnswers, raised);
      return s && text ? { text, subject: s } : null;
    };
    const gap = () => {
      const text = whatToAskAbout(notes as any);
      return text ? { text, subject: null } : null;
    };
    const breadth = breadthFirst(subjects, theirAnswers, raised);
    return (breadth ? cover() ?? gap() : gap() ?? cover()) ?? { text: '', subject: null };
  }

  /**
   * WHAT A COMPLETE ANSWER TO THIS BRIEF HOLDS, read once and kept.
   *
   * Same arrangement as the subjects directly below, and for a stronger reason: a column that means
   * something different for respondent forty than for respondent four is not a column. Read on the
   * first check-in that needs it, stored on the ground, identical for everybody after.
   *
   * IT DOES NOT FALL BACK TO SOMETHING SMALLER. Where the brief is too short to specify anything, or
   * the read comes back with fewer than three comparable fields, there is no frame and the
   * conversation behaves exactly as it did before - subjects, holes, challenges. A guessed frame
   * would be worse than none: it becomes a question a hundred people are made to answer and a
   * column in a report nobody ordered.
   */
  /**
   * ONE PERSON'S ANSWERS, PUT INTO THE FIELDS A COMPLETE ANSWER HOLDS.
   *
   * Reads the transcript rather than the record. The record is typed lines somebody may quote and is
   * deliberately conservative; a fit asks a different question - not "what did they state for the
   * record" but "which of these seven things did they tell us, in whatever words". On the
   * hundred-person run the records held six entries a person and the transcripts held everything.
   */
  /**
   * WHAT THEY SAID THEY WOULD DO, AS ROWS ON THE GROUND.
   *
   * Runs as a session finishes, on that person's own words only. Saying the same thing again lands
   * on the row that is already there rather than making a second one, because a promise restated is
   * the same promise still open, and the count of sessions it was restated in is the finding.
   *
   * NOTHING HERE DECIDES ANYTHING WAS DONE. Status stays UNKNOWN and only a person moves it.
   */
  /**
   * PROOF SETTLES WHAT THEY SAID THEY WOULD DO (week 9, decision 12). See settled-by-proof.ts. Reads
   * this person's commitments proof may still settle and their own lines a document of theirs backs
   * or a colleague confirmed; the model pairs them and code checks every pair. Only ever DONE: proof
   * never marks anything not done. A commitment already DONE on their word keeps its status and date
   * and gains the mark. Asks no model when there is nothing to pair.
   */
  async settleByProof(participantId: string): Promise<number> {
    if (!this.prisma.groundCommitment?.findMany || !participantId) return 0;
    const commitments = (await this.prisma.groundCommitment.findMany({
      where: { participantId, OR: [{ status: 'UNKNOWN' }, { status: 'DONE', OR: [{ settledBy: null }, { settledBy: 'SAID' }] }] },
      select: { id: true, participantId: true, text: true, status: true, settledBy: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 30,
    })).filter(mayBeSettledByProof);
    if (!commitments.length) return 0;
    const earliest = commitments[0].createdAt;
    const rows = await this.prisma.recordEntry.findMany({
      where: {
        participantId, disputedAt: null, createdAt: { gt: earliest },
        OR: [{ recallBased: false, anchoredDocumentId: { not: null } }, { confirmedAt: { not: null } }],
      },
      select: { id: true, participantId: true, type: true, text: true, recallBased: true, anchoredDocumentId: true, anchoredOrigin: true, confirmedAt: true, disputedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 26,
    });
    const whoAdded = await whoAddedEachBackingDocument(this.prisma, rows);
    const lines = rows.filter((l: any) => whatThisLineProves(l, whoAdded));
    if (!lines.length) return 0;
    const read = await this.anthropic.extract<{ pairs: { commitment: number; line: string }[] }>(
      WHICH_COMMITMENT_A_LINE_KEEPS_PROMPT,
      [{ role: 'user', content: theProofPrompt(commitments, lines) }],
      WHICH_COMMITMENT_A_LINE_KEEPS_SCHEMA as any,
      { fast: true, thinkingBudget: 0 },
    );
    const settled = theProofSettlements(commitments as any, lines as any, whoAdded, read?.pairs);
    const now = new Date();
    let wrote = 0;
    for (const s of settled) {
      /* Written only if it is still as it was read: a hand that moved it meanwhile wins. */
      const done = s.wasOpen
        ? await this.prisma.groundCommitment.updateMany({ where: { id: s.id, status: 'UNKNOWN' }, data: { status: 'DONE', settledAt: now, settledInCheckInId: null, settledBy: s.settledBy } })
        : await this.prisma.groundCommitment.updateMany({ where: { id: s.id, status: 'DONE', OR: [{ settledBy: null }, { settledBy: 'SAID' }] }, data: { settledBy: s.settledBy } });
      wrote += done?.count ?? 0;
      /* Ids only: the words are theirs. */
      this.logger.log(`settled-by-proof commitment=${s.id} line=${s.lineId} by=${s.settledBy} wasOpen=${s.wasOpen}`);
    }
    return wrote;
  }

  /**
   * WHAT HAPPENED TO WHAT THEY SAID THEY WOULD DO, FROM THEIR OWN WORDS IN THIS CHECK-IN (week 9).
   * Only the commitments of theirs that were open before this check-in, and so were put to them;
   * only DONE or NOT_DONE, and only what they plainly said. See what-happened-to-what-they-said.
   */
  async settleWhatTheySaidTheyWouldDo(checkInId: string): Promise<number> {
    if (!this.prisma.groundCommitment?.findMany) return 0;
    const row = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: {
        groundId: true, participantId: true, startedAt: true,
        /* Both sides, so each answer carries the question it answered. "I haven't done anything further.
           He didn't reply." means nothing on its own; after "What have you done to get an answer from
           Mr. Adebayo?" it plainly says the follow-up was not done (review, 29 September). */
        turns: { orderBy: { createdAt: 'asc' }, select: { role: true, content: true } },
      },
    });
    if (!row?.participantId) return 0;
    const said: AnAnswer[] = [];
    let asked: string | null = null;
    for (const t of row.turns as any[]) {
      const text = String(t.content ?? '').trim();
      if (!text) continue;
      if (t.role === TurnRole.PERSON || t.role === undefined) { said.push(asked ? { asked, said: text } : text); asked = null; }
      else asked = text.length > 300 ? `${text.slice(0, 300)}...` : text;
    }
    if (!said.length) return 0;
    const open = await this.prisma.groundCommitment.findMany({
      /* Open before they started this one: those are what it put to them. Not the check-in row's own
         date, which is written when the one before finishes, before that one's promises are. */
      where: { groundId: row.groundId, participantId: row.participantId, status: 'UNKNOWN', createdAt: { lt: row.startedAt ?? new Date() } },
      select: { id: true, text: true, whenSaid: true, status: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    if (!open.length) return 0;
    /* The same promise written twice is put once, and what they said about it settles both rows. */
    const once = oneOfEach(open);
    const read = await this.anthropic.extract<{ outcomes: { item: number; happened: string }[] }>(
      READ_WHAT_HAPPENED,
      [{ role: 'user', content: theHappenedPrompt(once, said) }],
      WHAT_HAPPENED_SCHEMA as any,
      { fast: true, thinkingBudget: 0 },
    );
    const settled = theSettlements(once, read?.outcomes).flatMap((s) => {
      const key = aCommitmentKey(once.find((o) => o.id === s.id)?.text ?? '', once.find((o) => o.id === s.id)?.whenSaid);
      return open.filter((o) => o.id === s.id || (key && aCommitmentKey(o.text, o.whenSaid) === key)).map((o) => ({ id: o.id, status: s.status }));
    });
    const now = new Date();
    for (const s of settled) {
      /* Still open at the moment of writing: somebody who pressed it by hand meanwhile wins. */
      await this.prisma.groundCommitment.updateMany({
        where: { id: s.id, status: 'UNKNOWN' },
        data: { status: s.status, settledAt: now, settledInCheckInId: checkInId, settledBy: 'SAID' },
      });
    }
    /* Ids and counts only: the words are theirs. */
    if (settled.length) this.logger.log(`Check-in ${checkInId}: settled ${settled.length} of ${open.length} open commitment(s) from their own words (${settled.filter((x) => x.status === 'DONE').length} done).`);
    /* Something new came in (decision 7): what is counted from settled commitments reads it now, not a check-in late. */
    if (settled.length) {
      this.events?.emit?.(GroundworkEvents.COMMITMENTS_SETTLED, { groundId: row.groundId, participantId: row.participantId } satisfies CommitmentsSettledEvent);
    }
    return settled.length;
  }

  async writeWhatTheyPromised(checkInId: string): Promise<void> {
    if (!this.prisma.groundCommitment?.create) return;
    const row = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: {
        groundId: true, sessionNumber: true, participantId: true,
        turns: { where: { role: TurnRole.PERSON }, orderBy: { createdAt: 'asc' }, select: { content: true } },
      },
    });
    if (!row?.participantId) return;
    const said = row.turns.map((t) => (t.content ?? '').trim()).filter(Boolean);
    if (!said.length) return;

    const read = await this.anthropic.extract<any>(
      READ_WHAT_THEY_PROMISED,
      [{ role: 'user', content: `THEIR OWN WORDS, in order:\n${said.map((x, n) => `${n + 1}. ${x}`).join('\n')}` }],
      WHAT_THEY_PROMISED_SCHEMA as any,
      { fast: true, thinkingBudget: 0 },
    ).catch((err: any) => {
      this.logger.warn(`What they promised on ${checkInId} did not read: ${err?.message}`);
      return null;
    });
    const keep = theOnesToKeep(Array.isArray(read?.commitments) ? read.commitments : []);
    if (!keep.length) return;

    const theirs = await this.prisma.groundCommitment.findMany({
      where: { groundId: row.groundId, participantId: row.participantId },
      select: { id: true, text: true, whenSaid: true, status: true, saidAgainIn: true, statedInSession: true },
    }).catch(() => [] as any[]);

    let written = 0;
    let again = 0;
    for (const kept of keep) {
      /* Their quotation marks, as in the record. See their-quotation-marks-are-theirs. */
      const c = { ...kept, action: theirQuotationMarksBack(kept.action, said), when: kept.when ? theirQuotationMarksBack(kept.when, said) : kept.when };
      /* The same promise said short and then whole, in this one check-in, is one row in the fuller words. */
      const fuller = (theirs as any[]).map((h) => ({ h, which: h.statedInSession === row.sessionNumber && h.status === 'UNKNOWN' ? theFullerPromise({ text: h.text ?? '', when: h.whenSaid }, { text: c.action, when: c.when }) : null })).find((x) => x.which);
      if (fuller) {
        if (fuller.which === 'existing') continue;
        const wholeText = c.action.slice(0, 400);
        const wholeWhen = c.when ?? fuller.h.whenSaid ?? null;
        let moved = true;
        await this.prisma.groundCommitment.update({
          where: { id: fuller.h.id },
          data: {
            text: wholeText,
            whenSaid: wholeWhen,
            saidWordForWord: saidWordForWord(wholeText, said),
            whenSaidWordForWord: wholeWhen ? saidWordForWord(wholeWhen, said) : false,
          },
        }).catch((err: any) => { moved = false; this.logger.warn(`Could not write a promise more fully on ${checkInId}: ${err?.message}`); });
        if (moved) { fuller.h.text = wholeText; fuller.h.whenSaid = wholeWhen; }
        continue;
      }
      /* The same promise said twice in one breath, once with its time on the end, is one promise. */
      /* Said in another session at another length, it is its own record and the earlier one is left as it was. */
      const same = (theirs as any[]).find((h) => !(h.statedInSession !== row.sessionNumber && theFullerPromise({ text: h.text ?? '', when: h.whenSaid }, { text: c.action, when: c.when })) && !(h.statedInSession === row.sessionNumber && nameTwoDifferentDates({ text: h.text ?? '', when: h.whenSaid }, { text: c.action, when: c.when })) && (theSameMeasure(h.text ?? '', c.action)
        || (!!aCommitmentKey(c.action, c.when) && aCommitmentKey(h.text ?? '', h.whenSaid) === aCommitmentKey(c.action, c.when))));
      if (same) {
        /* Already settled by a person: saying it again does not reopen it and is not counted. */
        if (same.status !== 'UNKNOWN') continue;
        if (same.statedInSession === row.sessionNumber) continue;
        if ((same.saidAgainIn ?? []).includes(row.sessionNumber)) continue;
        await this.prisma.groundCommitment.update({
          where: { id: same.id },
          data: { saidAgainIn: { set: [...(same.saidAgainIn ?? []), row.sessionNumber] } },
        }).then(() => { again += 1; })
          .catch((err: any) => this.logger.warn(`Could not record a restatement on ${checkInId}: ${err?.message}`));
        continue;
      }
      await this.prisma.groundCommitment.create({
        data: {
          groundId: row.groundId,
          participantId: row.participantId,
          text: c.action.slice(0, 400),
          outcome: c.outcome ?? null,
          whenSaid: c.when ?? null,
          explicit: true,
          status: 'UNKNOWN',
          source: 'CHECK_IN',
          statedInSession: row.sessionNumber,
          /* Whether the action and its "when" are their own words, from what they typed in this
             session. Only then may a report quote them. See reports/a-quote-is-what-they-said. */
          saidWordForWord: saidWordForWord(c.action.slice(0, 400), said),
          whenSaidWordForWord: c.when ? saidWordForWord(c.when, said) : false,
        },
      }).then((made: any) => {
        written += 1;
        /* Known from now on, so a second copy later in this same list is not written again. */
        (theirs as any[]).push({ id: made?.id, text: c.action, whenSaid: c.when ?? null, status: 'UNKNOWN', saidAgainIn: [], statedInSession: row.sessionNumber });
      })
        .catch((err: any) => this.logger.warn(`Could not write a commitment from ${checkInId}: ${err?.message}`));
    }
    if (written || again) {
      this.logger.log(`Check-in ${checkInId} session ${row.sessionNumber}: ${written} new commitment(s), ${again} said again.`);
    }
  }

  async fitTheirAnswer(checkInId: string): Promise<void> {
    const row = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: {
        groundId: true, whatWeHave: true,
        participant: { select: { id: true, roleAsDescribed: true, organisationGiven: true } },
        turns: { where: { role: TurnRole.PERSON }, orderBy: { createdAt: 'asc' }, select: { content: true } },
      },
    });
    if (!row) return;
    const frame = await this.theFrameFor(row.groundId).catch(() => [] as AField[]);
    if (!frame.length) return;
    const said = row.turns.map((t) => t.content ?? '').filter(Boolean);
    if (!said.length) return;

    const read = await this.anthropic.extract<any>(
      theFitInstruction(frame, row.participant?.roleAsDescribed ?? row.participant?.organisationGiven ?? null),
      [{ role: 'user', content: `WHAT THEY SAID, in order:\n${said.map((x, n) => `${n + 1}. ${x}`).join('\n')}` }],
      THE_FIT_SCHEMA as any,
      { fast: true, thinkingBudget: 0 },
    ).catch((err: any) => {
      this.logger.warn(`The fit on ${checkInId} did not read: ${err?.message}`);
      return null;
    });
    if (!read) return;
    const kind = String(read.kind ?? '').trim() || row.participant?.roleAsDescribed || null;
    const values = theFitFrom(read, frame, (why) => this.logger.warn(`Fit on ${checkInId}: ${why}`));
    const notes = ((row as any).whatWeHave ?? {}) as WhatWeHave;
    await this.prisma.checkIn.update({
      where: { id: checkInId },
      data: {
        theirAnswerFitted: {
          participantId: row.participant?.id ?? null,
          /* Only the person's own words: the model is told what the lead wrote about them and can hand it back as "the organisation". */
          organisation: (theyAreTheirOwnWords(String(read.organisation ?? ''), said, row.participant?.organisationGiven) ? String(read.organisation).trim() : null) || row.participant?.organisationGiven || null,
          kind,
          values,
          completeness: howCompletely(values, frame, kind),
          /*
           * WHAT THE CONVERSATION MEASURED, not a second opinion about it. `specificityHistory` is
           * scored turn by turn while they answer and has never been read by anything but the
           * assistant's tone.
           */
          specificity: null,
          gaveEvidence: false,
        } as any,
      },
    }).catch((err: any) => this.logger.warn(`Could not keep the fit on ${checkInId}: ${err?.message}`));
    this.logger.log(`Fitted ${checkInId}: ${values.filter((v) => !v.couldNotSay).length} of ${frame.length} fields, ${values.filter((v) => v.couldNotSay).length} ruled out. (${notes.answers ?? 0} answers read.)`);
  }

  /**
   * THE TWO READS OF THE BRIEF, ONE AT A TIME PER GROUND AND NEVER TWICE AT ONCE (request 44).
   *
   * Both are model calls, both are kept on the ground after the first, and both used to run one
   * after the other inside the opener's prompt, so the first person to open a check-in waited for
   * two reads of the brief before the opener itself was even asked for. `open` now starts both at
   * the door, side by side, while the rest of the prompt is gathered; a second caller for the same
   * ground while a read is running is given the same read, not a new one. Nothing about what is
   * read changes, only when.
   */
  private briefReadsInFlight = new Map<string, Promise<unknown>>();

  private readTheBriefOnce<T>(key: string, read: () => Promise<T>): Promise<T> {
    /* Optional for the same reason as notesInFlight: some guards build the service off its prototype. */
    if (!this.briefReadsInFlight) return read();
    const running = this.briefReadsInFlight.get(key) as Promise<T> | undefined;
    if (running) return running;
    const started = read();
    this.briefReadsInFlight.set(key, started);
    started.catch(() => undefined).finally(() => {
      if (this.briefReadsInFlight.get(key) === started) this.briefReadsInFlight.delete(key);
    });
    return started;
  }

  async theFrameFor(groundId: string): Promise<AField[]> {
    return this.readTheBriefOnce(`frame:${groundId}`, () => this.theFrameForNow(groundId));
  }

  private async theFrameForNow(groundId: string): Promise<AField[]> {
    const ground = await this.prisma.ground
      .findUnique({ where: { id: groundId }, select: { whatACompleteAnswerHolds: true, brief: true } })
      .catch(() => null);
    if (!ground) return [];
    const already = (ground as any).whatACompleteAnswerHolds as AField[] | null;
    if (Array.isArray(already) && already.length) return already;
    const brief = (ground.brief ?? '').trim();
    /*
     * NO WORD COUNT DECIDES WHETHER A CHECK-IN GETS READ. (Hafsah, 26 September 2026: "The
     * judgement must run whatever the length of the lead's description, so remove the 40-word
     * threshold.")
     *
     * This used to refuse any brief under forty words, on the reasoning that such a brief is a
     * question rather than a specification. Reasonable about a frame of fields. Catastrophic
     * downstream, because `judgeTheAnswers` opens with a return on an empty frame: the eight
     * reports in the twenty-four with no judgement at all were exactly the eight grounds whose
     * brief was under forty words. `drift` was judged at exactly forty. `board` was not, at
     * thirty-nine. A lead who writes plainly got no judgement, and nothing anywhere said why.
     *
     * An empty brief still gets nothing, because there is nothing to read. Everything else is
     * read, and `theFrameFrom` throws out what does not hold up - which is the check that should
     * have been doing this work all along, rather than a word count standing in front of it.
     */
    if (!brief) return [];

    const read = await this.anthropic.extract<{ fields?: unknown[] }>(
      READ_THE_FRAME,
      [{ role: 'user', content: brief }],
      READ_THE_FRAME_SCHEMA as any,
    ).catch((err: any) => {
      this.logger?.warn?.(`Could not read what a complete answer holds on ${groundId}: ${err?.message}`);
      return null;
    });
    const frame = theFrameFrom(read, (why) => this.logger?.warn?.(`Frame on ${groundId}: ${why}`));
    if (!frame.length) return [];

    /*
     * AND WHAT THE BRIEF ASKED FOR THAT THIS MISSED.
     *
     * Read off two real briefs. From the newer MarketView one the frame returned a field for the
     * single biggest risk they face; from the Friends of NABG one, whose brief asks in as many
     * words about "the risks and challenges you have encountered, what you would prefer not to
     * repeat", it returned nine fields and not one about failure. Same reader, same instruction,
     * one subject the lead had spent a sentence on quietly gone.
     *
     * The brief is already read into subjects for the conversation, so there is a second and
     * independent list of what it is about. Where a subject's words appear in no field's question,
     * it gets one more pass naming only what was missed - which also stops the second answer
     * re-litigating the first. Best-effort: a frame with nine good fields is not thrown away
     * because the check for a tenth failed.
     */
    const missed = await this.theSubjectsToCover(groundId)
      .then((subjects) => whatTheFrameLeftOut(frame, subjects))
      .catch(() => [] as { id: string; subject: string }[]);
    if (missed.length && frame.length < THE_MOST_ANYBODY_WILL_FILL) {
      this.logger?.log?.(`Frame on ${groundId} missed ${missed.length} subject(s) the brief raises: ${missed.map((m) => m.id).join(', ')}. Reading again.`);
      const more = await this.anthropic.extract<{ fields?: unknown[] }>(
        READ_THE_FRAME_AGAIN(missed),
        [{ role: 'user', content: brief }],
        READ_THE_FRAME_SCHEMA as any,
      ).catch(() => null);
      /* Validated by the same rules, then only the ids the first pass did not already hold. */
      const held = new Set(frame.map((f) => f.id));
      for (const f of theFrameFrom(more, (why) => this.logger?.warn?.(`Frame on ${groundId}, second pass: ${why}`), 1)) {
        if (held.has(f.id) || frame.length >= THE_MOST_ANYBODY_WILL_FILL) continue;
        frame.push(f);
        held.add(f.id);
      }
    }

    await this.prisma.ground
      .update({ where: { id: groundId }, data: { whatACompleteAnswerHolds: frame as any } })
      .catch((err: any) => this.logger?.warn?.(`Could not keep the frame on ${groundId}: ${err?.message}`));
    this.logger?.log?.(`Read ${frame.length} fields a complete answer holds on ${groundId}: ${frame.map((f) => `${f.id}:${f.shape}`).join(', ')}.`);
    return frame;
  }

  async theSubjectsToCover(groundId: string): Promise<ASubject[]> {
    return this.readTheBriefOnce(`subjects:${groundId}`, () => this.theSubjectsToCoverNow(groundId));
  }

  private async theSubjectsToCoverNow(groundId: string): Promise<ASubject[]> {
    const ground = await this.prisma.ground
      .findUnique({ where: { id: groundId }, select: { subjectsToCover: true, brief: true } })
      .catch(() => null);
    if (!ground) return [];
    const already = (ground as any).subjectsToCover as ASubject[] | null;
    if (Array.isArray(already) && already.length) return already;
    const brief = (ground.brief ?? '').trim();
    /* Nothing to read. A one-line brief has one subject and the pack already asks about it. */
    if (brief.split(/\s+/).length < 40) return [];

    const read = await this.anthropic.extract<{ subjects?: ASubject[] }>(
      READ_THE_BRIEF,
      [{ role: 'user', content: brief }],
      READ_THE_BRIEF_SCHEMA as any,
    ).catch((err: any) => {
      this.logger?.warn?.(`Could not read the subjects out of the brief on ${groundId}: ${err?.message}`);
      return null;
    });
    const subjects = (read?.subjects ?? []).filter((x) => x?.id && x?.subject?.trim() && x?.ask?.trim());
    if (!subjects.length) return [];
    await this.prisma.ground
      .update({ where: { id: groundId }, data: { subjectsToCover: subjects as any } })
      .catch((err: any) => this.logger?.warn?.(`Could not keep the subjects on ${groundId}: ${err?.message}`));
    this.logger?.log?.(`Read ${subjects.length} subjects out of the brief on ${groundId}: ${subjects.map((x) => x.id).join(', ')}.`);
    return subjects;
  }

  /**
   * ONE NOTE AT A TIME PER CHECK-IN.
   *
   * Found by driving a real conversation: six answers went in and the notes said `answers=3`, with
   * the volumes, the vetting answer and a whole 30,000-smallholder target missing. Nothing had
   * failed. `noteWhatTheySaid` is fire-and-forget and takes tens of seconds, so turn five's note
   * was still running when turn six read the same row - both merged onto the version they had read,
   * and the last write won. A read-modify-write on a row two requests are holding.
   *
   * Serialised per check-in, which is the shape the data has anyway: one person answers one turn at
   * a time, so there is nothing to gain from overlapping them and a whole target to lose.
   *
   * IN PROCESS, AND HONEST ABOUT IT. This holds for one running instance. Two instances would need
   * the merge inside a transaction that re-reads - worth doing when there are two, and not worth
   * pretending to have solved today.
   */
  private notesInFlight = new Map<string, Promise<void>>();

  /**
   * HOW LONG A NOTE MAY HOLD UP A REPLY.
   *
   * Not a target - the note takes two or three seconds and the wait is normally zero, because
   * anybody typing an answer has already spent longer than that. This is the point at which a note
   * that has gone wrong stops being the conversation's problem. Twelve seconds, which is under the
   * chat's own ceiling, so the worst case is a reply composed without the last turn's claims rather
   * than a person watching a spinner.
   */
  private static readonly A_NOTE_MAY_HOLD_A_TURN_FOR = 12_000;

  private async theNoteFromTheLastTurnLands(checkInId: string): Promise<void> {
    /* Optional because the guards that assemble a prompt build the service off its prototype, so
       the field initialiser has never run. No map means no note in flight, which is the truth. */
    const running = this.notesInFlight?.get(checkInId);
    if (!running) return;
    let timer: NodeJS.Timeout | undefined;
    const waited = Date.now();
    await Promise.race([
      running.catch(() => undefined),
      new Promise<void>((done) => {
        timer = setTimeout(done, ConversationService.A_NOTE_MAY_HOLD_A_TURN_FOR);
      }),
    ]);
    if (timer) clearTimeout(timer);
    const held = Date.now() - waited;
    if (held > 2000) this.logger?.warn?.(`Check-in ${checkInId}: waited ${held}ms for the last turn's note.`);
  }

  async noteWhatTheySaid(checkInId: string, theirTurn: string): Promise<void> {
    const queued = (this.notesInFlight.get(checkInId) ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => this.noteWhatTheySaidNow(checkInId, theirTurn));
    this.notesInFlight.set(checkInId, queued.catch(() => undefined));
    /* Dropped once it is the last one, so the map does not grow for the life of the process. */
    queued.catch(() => undefined).finally(() => {
      if (this.notesInFlight.get(checkInId) === queued) this.notesInFlight.delete(checkInId);
    });
    return queued;
  }

  private async noteWhatTheySaidNow(checkInId: string, theirTurn: string): Promise<void> {
    const row = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: { whatWeHave: true, sessionNumber: true, groundId: true, completedAt: true },
    });
    if (!row) return;
    const before: WhatWeHave = ((row as any).whatWeHave as WhatWeHave) ?? nothingYet();

    /*
     * A STEER IS KEPT, and kept before anything else is decided about the turn: the brief told them
     * they could direct this conversation, so what they asked for is the most important thing in
     * the record of it. Same phrase twice is one steer. See they-can-tell-us-what-to-ask.
     */
    /*
     * AND THE CHALLENGE THAT WAS PUT LAST TURN IS REMEMBERED.
     *
     * Recorded here rather than where it is composed, because the prompt is assembled on every
     * turn and writing there would mark a challenge as put whether or not the turn went out. This
     * runs after the reply has gone. See what-a-claim-costs-to-prove.
     */
    const putLastTurn = row.completedAt ? null : theChallengeWorthPutting(before.claims, before.challenged ?? []);
    if (putLastTurn) {
      before.challenged = Array.from(new Set([...(before.challenged ?? []), putLastTurn.key]));
    }

    const steer = whatTheyWantAsked(theirTurn);
    if (steer) {
      const asked = Array.from(new Set([...(before.asked ?? []), steer]));
      await this.prisma.checkIn
        .update({ where: { id: checkInId }, data: { whatWeHave: { ...before, asked } as any } })
        .catch(() => undefined);
      this.logger?.log?.(`Check-in ${checkInId}: they asked to talk about "${steer}".`);
      before.asked = asked;
    }

    if (aboutTheToolNotTheWork(theirTurn)) {
      const after = withThisTurn(before, [], true);
      await this.prisma.checkIn.update({ where: { id: checkInId }, data: { whatWeHave: after as any } });
      return;
    }

    /*
     * AND THE SUBJECT THE LAST TURN PUT TO THEM IS MARKED COVERED.
     *
     * Found by driving her own brief: she was asked which states at turn one, said "Niger and
     * Kogi", and was asked which states again at turn five. Coverage was decided by matching the
     * brief's words against her answers, and an answer names the place rather than the category -
     * "Niger" contains none of "states" or "markets". So the subject the conversation actually
     * raised is remembered here, where we know the reply went out and they answered it. The words
     * check still stands and still catches coverage this cannot see.
     *
     * Recomputed from `before` and the answers that existed before this one, which is the state the
     * last prompt was composed from - the same rank, run on the same inputs, so it names the same
     * subject. Nothing is marked when that turn pushed on a claim or followed a steer instead.
     *
     * AFTER THE REMARK CHECK, because a remark is not an answer. A subject was put to somebody who
     * replied "you already asked me that" - it is still owed, and marking it covered would retire
     * it on the strength of a complaint. And nothing at all is marked once the conversation has
     * closed: that reply was a goodbye and put nothing to anybody.
     */
    const stillTalking = !row.completedAt;
    const priorAnswers = await this.prisma.conversationTurn
      .findMany({
        where: { checkInId, role: TurnRole.PERSON },
        orderBy: { createdAt: 'asc' },
        select: { content: true },
      })
      .then((rows) => rows.slice(0, -1).map((r) => r.content ?? ''))
      .catch(() => [] as string[]);
    const subjects = await this.theSubjectsToCover(row.groundId).catch(() => [] as ASubject[]);
    const frame = await this.theFrameFor(row.groundId).catch(() => [] as AField[]);
    const lastTurnPut = (subjects.length || frame.length) && stillTalking
      ? this.whichHoleToPush(before, subjects, priorAnswers, frame)
      : null;
    const putToThem = lastTurnPut?.subject ?? null;
    if (putToThem) {
      before.covered = Array.from(new Set([...(before.covered ?? []), putToThem.id]));
      this.logger?.log?.(`Check-in ${checkInId}: they answered on "${putToThem.subject}".`);
    }
    /*
     * AND THE FIELD IT PUT TO THEM IS REMEMBERED WHETHER OR NOT THEY ANSWERED IT.
     *
     * Not conditional on the answer, which is the whole point: driven live, the conversation asked
     * what products she wanted three turns running - through an answer about farmers and agents and
     * an answer about vetting - because nothing recorded that it had already asked. One entry per
     * ask, and two asks is enough.
     */
    if (lastTurnPut?.field) {
      before.askedFields = [...(before.askedFields ?? []), lastTurnPut.field.id];
      this.logger?.log?.(`Check-in ${checkInId}: asked for "${lastTurnPut.field.id}".`);
    }

    const read = await this.anthropic.extract<{
      opens?: Partial<Claim>[];
      sharpens?: (Partial<Claim> & { id: string })[];
      who?: { name?: string; role?: string; organisation?: string };
      fills?: string[];
      cannotSay?: string[];
      covered?: string[];
      contradiction?: { between?: string[]; why?: string };
    }>(
      READ_THIS_TURN,
      [{
        role: 'user',
        content: [
          theNotesSoFar(before),
          theFieldsToJudgeAgainst(frame, before),
          theSubjectsToJudgeAgainst(subjects),
          `WHAT THEY JUST SAID:\n${theirTurn}`,
        ].filter(Boolean).join('\n\n'),
      }],
      READ_THIS_TURN_SCHEMA as any,
      /*
       * THE FAST MODEL, AND NO THINKING BUDGET.
       *
       * It was running on the deliberating model with the default budget, which is why it took
       * fifteen seconds while the reply it runs beside takes two. What it does is not deliberation:
       * it reads one answer and fills in fields that are almost all quoted straight out of it. On
       * her own six answers the fast model returned the same five claims - the 30,000, the 30%, the
       * vetting, the volumes, the move into Niger and Kogi - in a fraction of the time.
       */
      { fast: true, thinkingBudget: 0 },
    ).catch((err: any) => {
      this.logger?.warn?.(`Could not note what was said on ${checkInId}: ${err?.message}`);
      return null;
    });
    /*
     * A FAILED READ STILL COUNTS THE ANSWER.
     *
     * My first version returned early, so a timed-out extraction lost the turn from the count as
     * well as from the claims - and the count is what decides when to ask somebody who they are.
     * Caught by replaying seven answers and reading "answers 3".
     */
    if (!read) {
      const anyway = withThisTurn(before, [], false);
      await this.prisma.checkIn.update({ where: { id: checkInId }, data: { whatWeHave: anyway as any } })
        .catch(() => undefined);
      return;
    }

    /*
     * TWO ARRAYS, BECAUSE ONE BLURRED THE DECISION.
     *
     * With a single `claims` array the extractor kept reusing the first id for every answer, so one
     * claim ended up holding a plan, a crop, a target and a verification and the 30% target was
     * nowhere. Asking separately - what does this OPEN, what does it SHARPEN - makes the choice
     * explicit instead of implied. Proven on a live replay of her own seven answers.
     */
    const opened: Claim[] = (read.opens ?? [])
      .filter((c) => c?.id && c?.kind && c?.said?.trim())
      .map((c) => ({ ...(c as Claim), session: row.sessionNumber ?? 1 }));
    /* A sharpen only ever lands on a claim that exists: an id nobody has seen would silently become
       a claim with no words in it, which is unreadable everywhere downstream. */
    const held = new Set(before.claims.map((c) => c.id));
    const sharpened: Claim[] = (read.sharpens ?? [])
      .filter((c) => c?.id && held.has(c.id))
      .map((c) => ({ ...(c as Claim), said: '', kind: undefined as any, session: row.sessionNumber ?? 1 }));
    /*
     * AND WHICH OF THE BRIEF'S SUBJECTS THIS ANSWER ACTUALLY COVERED.
     *
     * Read by the model, because this is a reading: "about two thousand tonnes a quarter" covers the
     * volumes they move and shares not one word with the way the brief asks for it. The words check
     * and the subject-we-put-to-them check both stay - three ways of noticing the same thing, and
     * the cost of noticing is one question not asked while the cost of missing is asking somebody
     * the same thing twice.
     *
     * Only ids that are really in the brief: an id the model invented would silently retire a
     * subject that is still owed, and nothing downstream would ever show it.
     */
    const real = new Set(subjects.map((s) => s.id));
    const theyCovered = (read.covered ?? []).filter((id) => real.has(id));
    /*
     * AND WHICH OF THE LEAD'S FIELDS THIS ANSWER FILLED, which is what makes a hundred answers
     * comparable instead of a hundred transcripts. Only ids that are really in the frame, for the
     * same reason as the subjects: an invented one would mark a column complete that nobody has
     * answered, and the column is the whole product.
     */
    const theFields = new Set(frame.map((f) => f.id));
    const nowFilled = (read.fills ?? []).filter((id) => theFields.has(id));
    const nowRuledOut = (read.cannotSay ?? []).filter((id) => theFields.has(id));
    let after = withThisTurn(before, [...opened, ...sharpened], false);
    if (theyCovered.length) {
      after = { ...after, covered: Array.from(new Set([...(after.covered ?? []), ...theyCovered])) };
    }
    if (nowFilled.length || nowRuledOut.length) {
      /* Giving a value beats having ruled it out: somebody who said they had no way to know and
         then produced the figure has answered it, and the conversation must stop asking. */
      const ruledOut = new Set([...(after.cannotSay ?? []), ...nowRuledOut]);
      const filled = Array.from(new Set([...(after.filled ?? []), ...nowFilled]));
      for (const id of filled) ruledOut.delete(id);
      after = { ...after, filled, cannotSay: Array.from(ruledOut) };
      this.logger?.log?.(`Check-in ${checkInId}: ${filled.length} of ${frame.length} fields given, ${ruledOut.size} ruled out.`);
    }
    /* Only ever filled in: a turn that says nothing about who they are must not blank it. */
    if (read.who && (read.who.name || read.who.role || read.who.organisation)) {
      after = { ...after, who: { ...(after.who ?? {}), ...read.who } };
    }
    if (read.contradiction?.between?.length === 2 && read.contradiction.why) {
      after = {
        ...after,
        contradictions: [
          ...after.contradictions,
          { between: [read.contradiction.between[0], read.contradiction.between[1]], why: read.contradiction.why },
        ],
      };
    }
    await this.prisma.checkIn.update({ where: { id: checkInId }, data: { whatWeHave: after as any } })
      .catch((err: any) => this.logger?.warn?.(`Could not store the notes on ${checkInId}: ${err?.message}`));
  }

  async extractRecordEntries(checkInId: string, participantId: string) {
    const rows = await this.readTheRecord(checkInId, participantId);
    if (!rows.length) return;
    await this.prisma.recordEntry.createMany({ data: rows });
  }

  /**
   * THE END CARD, STARTED AND NOT WAITED FOR. Nothing awaits this work, so nothing else would catch
   * what goes wrong in it: a database blip or a model error would become an unhandled rejection, and
   * that can take the whole API down. Whatever fails here is logged and means no card; the closing
   * reply has already gone, and finishing reads the record as before.
   */
  private startTheEndCard(checkIn: { id: string; participantId: string; groundId: string }, closingTurnId: string): void {
    const building: Promise<EndCard | null> = this.theEndCardFor(checkIn, closingTurnId).catch((err: any) => {
      this.logger.warn(`Check-in ${checkIn.id}: no end card (${err?.message ?? err}); the record is read when they finish.`);
      return null;
    });
    /* Kept while it is being built, so finishing and the screen can wait for it instead of missing it. */
    const cards = this.endCardsBeingBuilt();
    cards.set(checkIn.id, building);
    building.finally(() => { if (cards.get(checkIn.id) === building) cards.delete(checkIn.id); }).catch(() => undefined);
  }

  /** End cards still being built, by check-in. See startTheEndCard. */
  private endCardsBeingBuilt(): Map<string, Promise<EndCard | null>> {
    return ((this as any).endCardsInFlight ??= new Map());
  }

  /**
   * WAIT FOR THE CARD THAT IS BEING BUILT, IF ONE IS, FOR AT MOST FINISHING_WAITS_FOR_THE_CARD_MS.
   *
   * The card arrives 10 to 47 seconds after the goodbye, and the screen read it only when the
   * transcript loaded, so nobody saw it; and finishing before it was ready read the record again, so
   * the card was not what was written. Both now wait for it here. Nothing fails if it never comes.
   */
  private async waitForTheCardBeingBuilt(checkInId: string): Promise<void> {
    const building = this.endCardsBeingBuilt().get(checkInId);
    if (!building) return;
    let timer: NodeJS.Timeout | undefined;
    await Promise.race([
      building.catch(() => null),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), FINISHING_WAITS_FOR_THE_CARD_MS); timer.unref?.(); }),
    ]);
    if (timer) clearTimeout(timer);
  }

  /**
   * THE END CARD FOR THE SCREEN TO WAIT ON (GET /check-ins/:id/end-card). The card if it is ready,
   * or the one being built once it is, for the person themselves only: the same owner check as the
   * transcript. Null when there is no card standing.
   */
  async theEndCardWhenReady(checkInId: string, requestingUserId: WhoIsAsking): Promise<{ endCard: EndCard | null }> {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    await this.waitForTheCardBeingBuilt(checkIn.id);
    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, endCard: true },
    });
    return { endCard: theCardStillStanding(turns as any) };
  }

  /**
   * THE END CARD, BUILT AT THE CLOSING REPLY (task 2.7, screens request 7b).
   *
   * Reads the record from the conversation without writing it, marks each line from the documents
   * the person may have added, and keeps both on the closing turn: the card to be shown, and the
   * lines, so that finishing writes exactly what the card said. Nothing reaches record_entries here.
   * Anything that fails or takes too long leaves no card, and finishing reads the record as before.
   */
  private async theEndCardFor(checkIn: { id: string; participantId: string; groundId: string }, closingTurnId: string): Promise<EndCard | null> {
    const started = Date.now();
    const inTime = <T>(work: Promise<T>): Promise<T | null> =>
      Promise.race([work, new Promise<null>((resolve) => setTimeout(() => resolve(null), THE_END_CARD_WAITS_MS).unref?.())]);
    try {
      const draft = await inTime((async () => {
        const rows = await this.readTheRecord(checkIn.id, checkIn.participantId);
        if (!rows.length) return { rows, photos: new Set<string>(), theirs: new Set<string>() };
        /* A line a document backs is proven. Only asked when there is a document to ask about. */
        const readable = await this.documentsThatMayBack(checkIn.participantId, checkIn.groundId);
        const photos = new Set(readable.filter((d: any) => String(d.mimeType ?? '').startsWith('image/')).map((d) => d.id));
        /* Only their own document proves their line; somebody else's plan is not proof. */
        const theirs = new Set(readable.filter((d: any) => d.participantId === checkIn.participantId).map((d) => d.id));
        if (readable.length) {
          const result = await this.whatTheDocumentsBack(readable, rows.map((r) => String(r.text ?? '')));
          for (const b of result?.backed ?? []) {
            const row = Number.isInteger(b.line) ? rows[b.line] : undefined;
            const doc = Number.isInteger(b.document) ? readable[b.document] : undefined;
            if (!row || !doc) continue;
            Object.assign(row, { recallBased: false, anchoredDocumentId: doc.id, anchoredPassage: (b.where ?? '').slice(0, 400) || null, anchoredOrigin: (doc as any).origin ?? null });
          }
        }
        return { rows, photos, theirs };
      })());
      if (!draft) {
        this.logger.warn(`Check-in ${checkIn.id}: the end card took longer than ${THE_END_CARD_WAITS_MS}ms, so it was left out; the record is read when they finish.`);
        return null;
      }
      const lines: ALineForTheCard[] = draft.rows.map((r) => ({
        type: String(r.type), text: String(r.text ?? ''), recallBased: (r as any).recallBased ?? true,
        anchoredDocumentId: (r as any).anchoredDocumentId ?? null, anchoredOrigin: (r as any).anchoredOrigin ?? null,
        backedByAPhoto: !!(r as any).anchoredDocumentId && draft.photos.has((r as any).anchoredDocumentId),
        ...((r as any).anchoredDocumentId ? { documentIsTheirOwn: draft.theirs.has((r as any).anchoredDocumentId) } : {}),
      }));
      const card = theEndCard(lines, await this.usesSimplerWords(checkIn.groundId));
      await this.prisma.conversationTurn.update({
        where: { id: closingTurnId },
        data: { recordDraft: draft.rows as any, ...(card ? { endCard: card as any } : {}) },
      });
      this.logger.log(`Check-in ${checkIn.id}: end card with ${card?.inYourRecord?.length ?? 0} line(s) in ${Date.now() - started}ms; nothing written to the record yet.`);
      return card;
    } catch (err: any) {
      this.logger.warn(`Check-in ${checkIn.id}: no end card (${err?.message ?? err}); the record is read when they finish.`);
      return null;
    }
  }

  /**
   * WHAT FINISHING WRITES. The lines the end card showed, when nothing was said after it; otherwise
   * the record is read again, as it always was.
   */
  private async writeTheRecordAtTheEnd(checkIn: { id: string; participantId: string; groundId?: string }): Promise<EndCard | null> {
    const closing = await this.prisma.conversationTurn.findFirst({
      where: { checkInId: checkIn.id, role: TurnRole.AI },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, recordDraft: true, endCard: true },
    });
    const draft = Array.isArray(closing?.recordDraft) ? (closing!.recordDraft as unknown as Prisma.RecordEntryCreateManyInput[]) : null;
    const saidSince = draft
      ? await this.prisma.conversationTurn.count({ where: { checkInId: checkIn.id, role: TurnRole.PERSON, createdAt: { gt: closing!.createdAt } } })
      : 0;
    if (draft && saidSince === 0) {
      if (draft.length) await this.prisma.recordEntry.createMany({ data: draft.map((r) => ({ ...r, checkInId: checkIn.id, participantId: checkIn.participantId })) });
      this.logger.log(`Check-in ${checkIn.id}: wrote the ${draft.length} line(s) the end card showed.`);
      return ((closing as any).endCard as EndCard | null) ?? null;
    }
    if (draft) this.logger.log(`Check-in ${checkIn.id}: they said more after the end card, so the record is read again.`);
    const rows = await this.readTheRecord(checkIn.id, checkIn.participantId);
    if (rows.length) await this.prisma.recordEntry.createMany({ data: rows });
    /*
     * AND THE CARD SAYS WHAT WAS WRITTEN. Read again, the record can differ from the card that was
     * shown (the reviewer saw it), so the card on the closing turn is replaced with the lines just
     * written. "What is now in your record" is then always true.
     */
    /* Who added each backing document, as the first card knew: somebody else's plan proves nothing of theirs. */
    const whoAdded = await whoAddedEachBackingDocument(this.prisma, rows as any[]);
    const card = theEndCard(rows.map((r) => {
      const doc = (r as any).anchoredDocumentId ?? null;
      return {
        type: String(r.type), text: String(r.text ?? ''), recallBased: (r as any).recallBased ?? true, anchoredDocumentId: doc, anchoredOrigin: (r as any).anchoredOrigin ?? null,
        ...(doc && whoAdded.has(doc) ? { documentIsTheirOwn: whoAdded.get(doc) === checkIn.participantId } : {}),
      };
    }), checkIn.groundId ? await this.usesSimplerWords(checkIn.groundId) : false);
    if (closing?.id) {
      await this.prisma.conversationTurn.update({ where: { id: closing.id }, data: { endCard: (card ?? Prisma.DbNull) as any, recordDraft: rows as any } })
        .catch((err: any) => this.logger.warn(`Check-in ${checkIn.id}: could not replace the end card with what was written (${err?.message})`));
    }
    return card;
  }

  /**
   * THE LINES THE RECORD READER TAKES OUT OF A CONVERSATION, WITHOUT WRITING THEM.
   *
   * Split from extractRecordEntries so the end card (task 2.7) can show a person what is going into
   * their record before they finish, while nothing reaches record_entries until they do: forty-nine
   * readers of that table do not wait for a check-in to finish. Same filters, same stamps, same
   * logs as before; extractRecordEntries is this and then the write.
   */
  private async readTheRecord(checkInId: string, participantId: string): Promise<Prisma.RecordEntryCreateManyInput[]> {
    const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } });
    if (turns.length === 0) return [];

    /*
     * A REMARK ABOUT THE TOOL IS NOT THE WORK, AND THIS IS THE READ THAT DECIDES IT.
     *
     * Read on a live board: "you are repeating yourself, please end the session" filed under Asks,
     * "you didnt even as me what i do" as a Risk AND a tracked blocker, "this is meant to be about
     * personal" as a priority. Nothing in this pipeline had the concept of a turn that is not about
     * the work, so every one of them was themed and shipped to a board an expansion team reads.
     *
     * Filtered here rather than in the prompt, and at the READ rather than at the write: the
     * remarks stay in the transcript, because they are what the person said and not ours to
     * delete, and they cannot reach the record by any path that forgot to ask. See
     * a-remark-about-the-tool-is-not-the-work.
     */
    const theirs = turns.filter((t) => t.role !== TurnRole.AI);
    const work = theWorkTheySaid(theirs);
    if (theirs.length - work.length > 0) {
      this.logger?.log?.(`Check-in ${checkInId}: ${theirs.length - work.length} turn(s) were about the conversation rather than the work; kept in the transcript, out of the record.`);
    }
    /* Nothing but remarks is not a thin record, it is no record. Extracting from it would leave the
       themer only the AI's own words to work with, which is how a reply became a finding. */
    if (work.length === 0) return [];
    const keep = new Set(work.map((t) => t.id));

    const transcript = turns
      .filter((t) => t.role === TurnRole.AI || keep.has(t.id))
      .map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    /* Their side alone, kept for the check after extraction. See a-record-is-what-they-said.ts. */
    const whatTheySaid = work.map((t) => t.content).join('\n');
    const result = await this.anthropic.extract<{ entries: { type: string; text: string; verifiability: string }[] }>(
      `${RECORD_EXTRACTION_PROMPT}\n\n${ONLY_THEIR_WORDS}`,
      [{ role: 'user', content: transcript }],
      RECORD_EXTRACTION_SCHEMA,
    );

    const VALID_VERIFIABILITY = ['HIGH', 'MEDIUM', 'LOW'];

    // A NON-ANSWER IS NOT A RECORD ENTRY.
    //
    // In a live run the extractor faithfully recorded "Nothing new to add for
    // session 3" and "just a lot going on" as entries. Because the contribution
    // card counted entries, the person who stopped working for ten weeks scored
    // 43 and the person who delivered all quarter scored 45. Saying nothing was
    // being counted as contributing.
    const NON_ANSWER = /^(nothing (new|much|else)|no( real)? (update|change|progress)|same as (before|last|above)|not (really |much )?(sure|applicable)|n\/?a|none|tbd|as (before|discussed))\b/i;

    /**
     * SOME ENTRY TYPES ARE NOT SUPPOSED TO CONTAIN NUMBERS.
     *
     * The checkable-specifics test asks "is there a name, number, date or
     * outcome in here" - the right question for a claim about DELIVERY, and the
     * wrong one for a statement of meaning.
     *
     *   SUCCESS_DEFINITION  "doing well means clearing the queue each week"
     *   INTENT              "nobody has told me I own a client; I assumed that
     *                        came later, once I had proved I could deliver"
     *
     * Neither has a number in it. Both are exactly what this product exists to
     * capture - the second IS the gap on a new-hire ground, the difference
     * between throughput and ownership. Requiring a metric of them dropped the
     * substance and kept the arithmetic.
     *
     * So evidence-shaped types are still held to evidence. Meaning-shaped types
     * are held to being a real answer: long enough to say something, and not one
     * of the stock non-answers.
     */
    const EVIDENCE_TYPES = new Set(['COMMITMENT', 'TIMEFRAME']);

    const isNonAnswer = (text: string, type?: string) => {
      // Strip the model's own [INFERRED: ...] commentary before judging. The
      // extractor appends its reasoning to thin answers ("just a lot going on
      // [INFERRED: is making it harder to close these deals]"), which made an
      // empty answer look like a substantive entry.
      const t = text.replace(/\[INFERRED:[^\]]*\]/gi, '').trim().replace(/[.!]+$/, '');
      if (t.length < 12) return true;                 // "ok", "fine", "yes"
      if (NON_ANSWER.test(t)) return true;
      // Only a claim about delivery has to be checkable. A definition or an
      // assumption is judged on whether it actually says something.
      if (type && !EVIDENCE_TYPES.has(type)) return false;
      // Nothing checkable in it at all - no name, number, date or outcome.
      return countCheckableSpecifics(t) === 0;
    };

    /* EVERYBODY IN THIS CHECK-IN BY NAME, for the line that puts the wrong one on somebody's work. */
    const roster: string[] = await (async () => {
      const ci = await this.prisma.checkIn?.findUnique?.({ where: { id: checkInId }, select: { groundId: true } });
      if (!ci?.groundId) return [] as string[];
      const rows: any[] = (await this.prisma.groundParticipant?.findMany?.({ where: { groundId: ci.groundId }, select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } } } as any)) ?? [];
      return rows.flatMap((r) => [r.user?.firstName ?? r.nameGiven ?? '', r.user?.lastName ?? '']).filter(Boolean);
    })().catch(() => [] as string[]);

    /* And belt-and-braces on the way out: an entry that quotes a remark anyway - by reaching into
       an AI turn that repeated it back - is dropped. The thing it prevents ends up on a board. */
    const valid = notARemarkAboutUs(result?.entries ?? []).filter(
      (e) =>
        e.text?.trim() &&
        (Object.values(RecordEntryType) as string[]).includes(e.type) &&
        !isNonAnswer(e.text, e.type) &&
        /*
         * AND IT HAS TO BE TRACEABLE TO WORDS THEY USED.
         *
         * A lead's report quoted "Five tabs, one design language" and "light theme only,
         * deliberately" as her own commitments in a check-in she spent talking about testing and
         * bugs. The transcript handed to the extractor carries both speakers, and nothing told it
         * which one was the party - so the session's own summaries were available to be recorded
         * as things she had committed to.
         *
         * The prompt now says so. This is what makes it hold, because a prompt asking a model
         * politely not to confuse two speakers is the thing that just failed.
         */
        isTheirs(e.text, whatTheySaid) &&
        /*
         * AND IT CARRIES NO NAME THEY NEVER TYPED. "He did. He set them up." was written as "Amina set up
         * the client meetings I am still attending" - the lead's own name on the hire's work, in the
         * lead's own list. See a-record-line-with-a-name-nobody-typed.
         */
        !aNameNobodyTyped(e.text, whatTheySaid, roster).length,
    );

    /*
     * Worth a line in the log rather than silence: it is how anybody finds out that the extractor
     * has started reaching for the session's words again.
     */
    const dropped = (result?.entries ?? []).length - valid.length;
    if (dropped > 0) this.logger?.log?.(`Dropped ${dropped} extracted entr${dropped === 1 ? 'y' : 'ies'} on check-in ${checkInId} as not traceable to what the person said.`);
    if (valid.length === 0) return [];

    /*
     * Store entries. Verifiability is its OWN COLUMN now.
     *
     * It used to be stamped on the front of the text - "[VERIFIABILITY:HIGH] ..." - with a comment
     * here saying the schema had no column for it and this preserved the signal without a
     * migration. It came due twice: once under people's names on the board, and once inside the
     * line a lead is shown when accepting a number, in code written the same evening. Every reader
     * had to remember to strip it and the fifth one did not.
     *
     * The text is stored clean, which is the part that ends the leak: a marker that is not in the
     * text cannot be printed by a reader who forgot it was there.
     */
    /* What this person typed in this check-in, every turn of it, for the stamp below. */
    const whatTheyTyped = theirs.map((t) => String(t.content ?? ''));
    return valid.map((e) => {
        /* Their quotation marks, where the marks are all the reader changed: the words are theirs, and
           the marks are part of them. See their-quotation-marks-are-theirs. */
        const line = theirQuotationMarksBack(theLineWithoutItsDanglingJoin(e.text), whatTheyTyped);
        const v = VALID_VERIFIABILITY.includes(e.verifiability) ? e.verifiability : 'LOW';
        /* "November 12 2026" came back typed COMMITMENT and sat under Commitments on the shared
           report. A line that is nothing but a date is a timeframe, whatever the extractor called it. */
        const bareDate = /^\s*(?:by |on |until |before |from )?(?:\d{1,2}(?:st|nd|rd|th)?\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:\s+\d{1,2}(?:st|nd|rd|th)?)?,?(?:\s+\d{4})?\s*\.?\s*$/i.test(e.text) || /^\s*(?:by |on |until |before )?\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\s*$/.test(e.text);
        return {
          participantId,
          checkInId,
          type: (bareDate ? 'TIMEFRAME' : e.type) as RecordEntryType,
          verifiability: v as any,
          /* A half sentence that kept its "and" is not a line anybody should read under a heading.
             See half-a-sentence-is-not-a-line-in-a-report. */
          text: line,
          /* Whether the line as stored is their own words or the reader's tidied version. Only the
             first may ever be quoted to anybody. See reports/a-quote-is-what-they-said. */
          saidWordForWord: saidWordForWord(line, whatTheyTyped),
        };
      });
  }

  /**
   * Re-read which function map fits this person, from their OWN account only.
   *
   * Runs after every completed check-in, because detection is continuous: the
   * stated title is a weak prior and what the work is actually made of is what
   * settles it. Never reads another party's account to decide this.
   *
   * Writes the confidence alongside the function so a low-confidence read adds
   * no coaching downstream rather than being treated as settled.
   */
  /**
   * THE ROLE MAP FROM TURN ONE.
   *
   * detectFunction ran only at complete(), so the first session of every participant, and every
   * session of the 94% who never got a read, had no role map at all: the coaching box and the
   * probe list were wired to a column that was empty for almost everybody. On the first open, the
   * stated role alone gives a provisional read (confidence 0.4, under MIN_COACHING_CONFIDENCE, so
   * buildRoleProbeBlock hedges it as PROVISIONAL). complete() re-reads with the record rows and
   * overwrites, so the read sharpens rather than appears from nowhere.
   */
  private async provisionalFunctionFromTheStatedRole(participant: {
    id: string;
    roleAsDescribed: string | null;
    detectedFunction: string | null;
    detectedFunctionConfidence: number | null;
  }) {
    if (participant.detectedFunction) return;
    const read = detectFunction(participant.roleAsDescribed, [], null);
    if (!read.fn) return;
    await this.prisma.groundParticipant.update({
      where: { id: participant.id },
      data: { detectedFunction: read.fn, detectedFunctionConfidence: read.confidence, detectedFunctionAt: new Date() },
    });
    participant.detectedFunction = read.fn;
    participant.detectedFunctionConfidence = read.confidence;
    this.logger.log(`Provisional function ${read.fn} (${read.confidence}) for participant ${participant.id}: ${read.basis}`);
  }

  /**
   * WHICH MAP THIS TURN USES. The stored read when it is confident. Below MIN_COACHING_CONFIDENCE,
   * what they have said so far in THIS session is read too, in memory and not persisted: the
   * persisted read is complete()'s job. When the in-session read disagrees with the stored one,
   * detectFunction's own rule applies (the words win, held more tentatively, minus 0.1) and it is
   * logged. The person sees none of this; the map only changes which question is asked next.
   */
  /**
   * ALSO READS THE SHAPE OF THE ACCOUNT, WHICH IS THE FLOOR UNDER THE FUNCTION READ.
   *
   * It used to return early when the stored function was already confident, which saved one query
   * and skipped the thing everybody gets regardless of their job - vagueness, non-commitment, work
   * that cannot be seen from outside. The texts are read once now and used for both.
   */
  private async roleReadForThisTurn(
    checkIn: { id: string; participant: { roleAsDescribed: string | null; detectedFunction: string | null; detectedFunctionConfidence: number | null } },
    latestMessage?: string,
  ): Promise<{ fn: string | null; confidence: number | null; modes: UniversalMode[] }> {
    const stored = { fn: checkIn.participant.detectedFunction, confidence: checkIn.participant.detectedFunctionConfidence };
    const turns = await this.prisma.conversationTurn
      .findMany({ where: { checkInId: checkIn.id, role: TurnRole.PERSON }, select: { content: true }, orderBy: { createdAt: 'asc' } })
      .catch(() => [] as { content: string }[]);
    const texts = turns.map((t) => t.content ?? '').concat(latestMessage ?? '').filter(Boolean);
    if (!texts.length) return { ...stored, modes: [] };
    const modes = detectUniversalModes(texts);
    if ((stored.confidence ?? 0) >= MIN_COACHING_CONFIDENCE) return { ...stored, modes };
    const read = detectFunction(checkIn.participant.roleAsDescribed, texts, stored);
    if (read.fn && read.fn !== stored.fn) {
      this.logger.log(`In-session function read on ${checkIn.id}: ${stored.fn ?? 'none'} -> ${read.fn} (${read.confidence}). ${read.basis}`);
    }
    return read.fn ? { fn: read.fn, confidence: read.confidence, modes } : { ...stored, modes };
  }

  /**
   * A ROLE GUESSED WITH LOW CONFIDENCE IS CONFIRMED BEFORE IT IS USED (decision 57, item 5).
   *
   * Below LOW_CONFIDENCE_CONFIRM_THRESHOLD (the same MIN_COACHING_CONFIDENCE that already withholds
   * a role-tuned probe - see buildRoleProbeBlock) and not yet confirmed, the model is told to ask
   * the plain-words question once, this turn. Their answer is read as their own account of their
   * role, never scored - it is turned into a confirmation or a correction by the participants route
   * (PATCH /participants/:id or POST /participants/:id/confirm-role), not by this prompt. Nothing
   * here is a role-tuned probe: buildRoleProbeBlock already stays silent below the same threshold,
   * so the universal floor is all that is asked from otherwise.
   */
  private async roleConfirmationBlockFor(participantId: string, fn: string | null, confidence: number | null, sessionNumber: number): Promise<string> {
    if (!fn) return '';
    const participant = await this.prisma.groundParticipant
      .findUnique({ where: { id: participantId }, select: { detectedFunctionConfirmedAt: true } })
      .catch(() => null);
    if (!needsRoleConfirmation({ fn: fn as RoleFunction, confidence: confidence ?? 0 }, participant?.detectedFunctionConfirmedAt ?? null)) return '';

    /*
     * ASKED ONCE, NOT EVERY CHECK-IN. An unclear earlier answer is stamped ROLE_CONFIRM_ASKED (see
     * extractRoleConfirmation, run after the check-in that carries the stamp closes) - a clear
     * confirmation or correction instead sets detectedFunctionConfirmedAt, which the check above
     * already catches. Skip asking again until the cooldown has passed.
     */
    const recentlyAsked = await this.prisma.conversationTurn
      .findFirst({
        where: { role: TurnRole.AI, askedFor: ROLE_CONFIRM_ASKED, checkIn: { participantId } },
        orderBy: { createdAt: 'desc' },
        select: { checkIn: { select: { sessionNumber: true } } },
      })
      .catch(() => null);
    if (recentlyAsked && sessionNumber - (recentlyAsked.checkIn?.sessionNumber ?? 0) < ROLE_CONFIRM_COOLDOWN_PERIODS) return '';

    return `CONFIRM THE ROLE, ONCE (decision 57, item 5): somewhere natural in this turn, ask plainly - "${roleConfirmationQuestion(fn as RoleFunction)}" Their answer is their own statement of their role, not a score. If they have already answered a version of this earlier in this check-in, do not ask again.`;
  }

  /**
   * WHAT HAS ALREADY BEEN SEEN ACROSS THIS PERSON'S SESSIONS, framed as offerWhatWorked frames it:
   * a place to look, not a finding. SURFACED only; a CANDIDATE never reaches a conversation. The
   * query is on THIS participantId, so nothing another person said can arrive through it.
   */
  private async whatHasBeenSeenAcrossTheirSessions(participantId: string): Promise<string> {
    const surfaced = await (this.prisma.patternDetection?.findMany({
      where: { participantId, status: 'SURFACED' as any },
      select: { observationText: true, periodsObserved: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 3,
    }) ?? Promise.resolve([] as { observationText: string | null; periodsObserved: number }[]))
      .catch(() => [] as { observationText: string | null; periodsObserved: number }[]);
    const rows = surfaced.filter((p) => p.observationText?.trim());
    if (!rows.length) return '';
    return (
      'WHAT HAS ALREADY BEEN SEEN ACROSS THIS PERSON\'S OWN SESSIONS. Use this ONLY to decide which one question '
      + 'matters most right now. It is a place to look, not a finding: it is not evidence about this session, it is '
      + 'never the reason for anything you say, and if this conversation does not show it then it is not here. Never '
      + 'repeat it back to them, never describe them with it, never ask about it by name. Ask about the work.\n'
      + rows.map((p) => `- ${p.observationText!.trim()} (seen across ${p.periodsObserved} periods)`).join('\n')
    );
  }

  /**
   * A DOCUMENT HAS TO CHANGE SOMETHING. See ANCHOR_TO_DOCUMENTS_PROMPT.
   *
   * Every record line of this person's that is still recall is read against the documents they can
   * see: their own, and any on the ground marked OPEN. A line a document plainly backs becomes
   * recallBased=false and names the document. Nothing else is touched; the tiles, the confidence
   * meter and What this rests on already read recallBased, so they move on their own. Runs at
   * complete() and again when a document is uploaded, so an upload after the session still counts.
   */
  /**
   * THE ANSWER TO "WHAT DOES THIS SHOW" IS THE DOCUMENT'S DESCRIPTION.
   * If the turn before this one was the product asking that about a document, this message is kept
   * as the document's uploaderNote and the description is checked against the file. 2 of 27 uploads
   * had a description because this surface, the one people use, threw the answer away.
   */
  private async keepTheDocumentDescription(checkInId: string, personTurnId: string, message: string) {
    const previous = await this.prisma.conversationTurn.findFirst({
      where: { checkInId, role: TurnRole.AI, id: { not: personTurnId } },
      orderBy: { createdAt: 'desc' },
      select: { askedFor: true },
    });
    if (!previous?.askedFor?.startsWith(DESCRIBES_DOCUMENT)) return;
    const docId = previous.askedFor.slice(DESCRIBES_DOCUMENT.length);
    const said = message.trim().slice(0, 500);
    if (!said) return;
    await this.prisma.groundDocument.update({ where: { id: docId }, data: { uploaderNote: said } }).catch(() => undefined);
    this.logger.log(`document-description doc=${docId} said=${JSON.stringify(said.slice(0, 120))}`);
    await this.documents?.checkDescription(docId).catch(() => null);
  }

  /** The record lines a document reads differently from that a turn has already put to this person. */
  private async theLinesAlreadyAskedAbout(participantId: string): Promise<Set<string>> {
    /* A groupBy, like the burden count: it can return the stamps and never a turn's content. */
    const stamps = await this.prisma.conversationTurn.groupBy({
      by: ['askedFor'],
      where: { role: TurnRole.AI, askedFor: { startsWith: READS_DIFFERENTLY }, checkIn: { participantId } },
    }).catch(() => [] as { askedFor: string | null }[]);
    return theLinesInTheStamps(((stamps ?? []) as { askedFor: string | null }[]).map((t) => t.askedFor));
  }

  /**
   * THE STAMP FOR A TURN THAT PUT A DOCUMENT'S SIDE TO THEM, so it is never asked again. Read from
   * what the turn says, not from what the prompt offered. See a-document-that-disagrees-is-asked-once.
   */
  private async theDocumentQuestionItRaised(participantId: string, reply: string): Promise<string | null> {
    try {
      const lines = await this.prisma.recordEntry.findMany({
        where: { participantId, documentSays: { not: null }, disputedAt: null },
        select: { id: true, text: true, documentSays: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
      });
      if (!lines?.length) return null;
      const asked = await this.theLinesAlreadyAskedAbout(participantId);
      return theStampForWhatItRaised(reply, lines.filter((l) => !asked.has(l.id)));
    } catch {
      return null;
    }
  }

  /** The documents that may back this person's lines: their own and any open on the ground, readable, and as described. */
  private async documentsThatMayBack(participantId: string, groundId: string) {
    const docs = await this.prisma.groundDocument.findMany({
      where: { groundId, OR: [{ participantId }, { visibility: 'OPEN' as any }] },
      select: { id: true, fileName: true, content: true, origin: true, descriptionCheck: true, mimeType: true, participantId: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }).then((all) => all.filter((d) => {
      /* A document that does not read as its uploader described it backs nothing until they have
         answered for it. It is still on the list and still theirs; it just carries no weight yet. */
      const check = d.descriptionCheck as any;
      return !(check && check.matches === false);
    }));
    /*
     * A DOCUMENT WE COULD NOT READ BACKS NOTHING. Its content is our own sentence saying we could
     * not open it, and handing that to the model invites it to anchor somebody's record line to an
     * apology - which then counts as document-backed, which is what makes a report say the evidence
     * is strong. Three other readers already stepped around these; this one did not exist yet.
     */
    return onlyWhatWeCouldRead(docs);
  }

  /** Which of these lines these documents back, or read differently. A read only: nothing is written. */
  private async whatTheDocumentsBack(readable: { fileName: string; content: string | null }[], lines: string[]) {
    const documents = readable.map((d, i) => `[${i}] "${d.fileName}"\n${(d.content ?? '').slice(0, 6000)}`).join('\n\n');
    const numbered = lines.map((t, i) => `[${i}] ${t.replace(/^\[VERIFIABILITY:\w+\] /, '')}`).join('\n');
    return this.anthropic.extract<{ backed: { line: number; document: number; where: string }[]; readsDifferently?: { line: number; document: number; says: string }[] }>(
      ANCHOR_TO_DOCUMENTS_PROMPT,
      [{ role: 'user', content: `DOCUMENTS:\n${documents}\n\nRECORD LINES:\n${numbered}` }],
      ANCHOR_TO_DOCUMENTS_SCHEMA,
    ).catch(() => null);
  }

  async anchorRecordToDocuments(participantId: string, groundId: string): Promise<{ backed: number; of: number; readsDifferently?: number }> {
    /* Both reads are started inside Promise.all's reach: a read that throws before it returns a
       promise would otherwise leave the documents read already started with nothing waiting on it,
       and its failure would become an unhandled rejection that can take the API down. */
    const [readable, entries] = await Promise.all([
      this.documentsThatMayBack(participantId, groundId),
      /* Every line of theirs, backed or not: a line one document backs can still be read differently
         by a newer one (the revised offer letter that moves the start date), and that is the case that
         matters most. Only an unbacked line can become backed here. */
      Promise.resolve().then(() => this.prisma.recordEntry.findMany({
        where: { participantId, disputedAt: null },
        select: { id: true, text: true, recallBased: true },
        orderBy: { createdAt: 'asc' },
        take: 120,
      })),
    ]);
    if (!readable.length || !entries.length) return { backed: 0, of: entries.length, readsDifferently: 0 };
    const result = await this.whatTheDocumentsBack(readable, entries.map((e) => e.text));
    const rows = (result?.backed ?? []).filter((b) => Number.isInteger(b.line) && Number.isInteger(b.document) && entries[b.line]?.recallBased && readable[b.document]);
    let backed = 0;
    for (const b of rows) {
      /*
       * EVERY DECISION, GREPPABLE - BY ITS IDENTIFIERS, NOT ITS CONTENT (G4).
       *
       * This printed the record entry in full and two hundred characters of the document passage.
       * That is the private record, in a log that more people can read than the database and that
       * no retention policy sweeps. The ids are what a false match is chased with anyway: the row
       * is one query away for anybody who is allowed to see it, and this line is readable by
       * people who are not.
       */
      this.logger.log(`anchoring-decision participant=${participantId} entry=${entries[b.line].id} document=${readable[b.document].id} passageChars=${(b.where ?? '').length}`);
      await this.prisma.recordEntry
        .update({ where: { id: entries[b.line].id }, data: { recallBased: false, anchoredDocumentId: readable[b.document].id, anchoredPassage: (b.where ?? '').slice(0, 400) || null, anchoredOrigin: (readable[b.document] as any).origin ?? null } })
        .then(() => { backed++; })
        .catch(() => undefined);
    }
    /*
     * WHERE A DOCUMENT READS DIFFERENTLY, THE LINE STAYS THEIRS. Nothing is overwritten and nobody
     * is ruled wrong: the line keeps their words, gains what the document says beside it, shows in
     * their own report, and is put to them as a question in their next session. "Not what I said"
     * still works on it. The document may be the stale one.
     */
    const differs = (result?.readsDifferently ?? []).filter((d) => Number.isInteger(d.line) && Number.isInteger(d.document) && entries[d.line] && readable[d.document] && d.says?.trim());
    for (const d of differs) {
      /* Ids, not content. See the anchoring-decision line above. */
      this.logger.log(`anchoring-decision kind=reads-differently participant=${participantId} entry=${entries[d.line].id} document=${readable[d.document].id} saysChars=${d.says.trim().length}`);
      await this.prisma.recordEntry
        .update({ where: { id: entries[d.line].id }, data: { documentSays: d.says.trim().slice(0, 300), documentSaysId: readable[d.document].id } })
        .catch(() => undefined);
    }
    if (backed || differs.length) this.logger.log(`Document anchoring: ${backed} of ${entries.length} line(s) for participant ${participantId} now backed by a document; ${differs.length} read differently.`);
    /* A line their own document now backs may keep something they said they would do (week 9). */
    if (backed) await this.settleByProof(participantId).catch((err: any) =>
      this.logger.warn(`Could not settle by proof for participant ${participantId}: ${err?.message ?? err}`));
    return { backed, of: entries.length, readsDifferently: differs.length };
  }

  async reviseDetectedFunction(participantId: string) {
    const p = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      select: { roleAsDescribed: true, detectedFunction: true, detectedFunctionConfidence: true },
    });
    if (!p) return;

    const entries = await this.prisma.recordEntry.findMany({
      /*
       * A LINE SOMEBODY UNSAID MUST NOT DECIDE WHAT KIND OF WORK THEY DO.
       *
       * This read the whole corpus, disputed lines included. "This is not what I said" sets
       * `disputedAt` and every read filters on it - that is the rule the extraction wall rests on -
       * and this one did not, so a wrongly extracted line could still be what picks the role map
       * somebody is then coached and probed against for the rest of the run. The louder the
       * misreading, the more it looked like a function.
       */
      where: { participantId, disputedAt: null },
      select: { text: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    let result = detectFunction(
      p.roleAsDescribed,
      entries.map((e) => e.text),
      { fn: p.detectedFunction, confidence: p.detectedFunctionConfidence },
    );

    /**
     * WHEN THE KEYWORDS FIND NOTHING, READ IT.
     *
     * The matcher scores zero on all ten lists for 294 of the 298 people who have said anything at
     * all - not a tuning problem, just that nobody writes the way the lists expect. So 92% had no
     * job on record, the role map never loaded, and nobody was read in the terms of their own work.
     *
     * The matcher stays the fast path: free, deterministic, and usually right when it fires. This
     * runs only when it did not, and only when there is something to read. It never overrides a
     * read that already exists - a model call that can quietly replace a settled yardstick is a
     * yardstick that moves.
     */
    if (!result.fn && entries.length) {
      try {
        const said = await this.anthropic.extract<{ fn?: string; certainty?: string; basis?: string }>(
          WHAT_KIND_OF_WORK_PROMPT,
          [{ role: 'user', content: entries.map((e) => e.text.replace(/^\[[^\]]*\]\s*/, '')).join('\n') }],
          WHAT_KIND_OF_WORK_SCHEMA as any,
          { fast: true },
        );
        const read = theJobTheyDescribed(said ?? null);
        if (read) {
          result = read;
          this.logger.log(`Function read from the account for ${participantId}: ${read.fn} (${read.confidence}). ${read.basis}`);
        }
      } catch (err) {
        /* The matcher's answer stands. Reading the job is an improvement on a silence, never a
           reason a session cannot be completed. */
        this.logger.warn(`Could not read the kind of work for ${participantId}: ${(err as Error)?.message}`);
      }
    }

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: {
        detectedFunction: result.fn,
        detectedFunctionConfidence: result.confidence,
        detectedFunctionAt: new Date(),
      },
    });

    /**
     * WHEN DETECTION FINDS NOTHING, EVERYTHING ROLE-TUNED IS SILENTLY OFF.
     *
     * Found while watching a live run: seven sessions in, both participants had
     * detectedFunction null and confidence 0, so the role probes never fired and
     * the coaching layer could never produce a row. Nothing anywhere said so.
     *
     * The detection itself is behaving correctly. Its signals were deliberately
     * tightened after an entire software team came out as SALES at 0.78 confidence
     * and got read against "named buyers with budget and authority" - the comment
     * there is right that a lens becomes a label the moment it is confidently
     * wrong. Scoring zero on work no map covers is the honest answer.
     *
     * What was wrong is that it was INVISIBLE. A feature that quietly does nothing
     * for a whole ground is indistinguishable from a feature that is broken, and I
     * spent a probe and a database query working out which one this was. The same
     * shape as the closing synthesis that failed and said nothing.
     *
     * The record on this run was a new hire clearing a support queue and shadowing
     * client accounts. There is no support or customer-service function among the
     * nine, which is a product decision rather than a bug - and it is now a
     * decision somebody can see.
     */
    if (!result.fn || result.confidence < MIN_COACHING_CONFIDENCE) {
      this.logger.log(
        `No function is confident enough for participant ${participantId} (${result.fn ?? 'none'} at ${result.confidence}). ` +
          `Role-tuned probes and coaching are OFF for them, which is correct and not a failure: ${result.basis} ` +
          `If this holds for a whole ground, either the work is not covered by the nine role maps or nobody described the role at setup.`,
      );
    }
  }

  /**
   * READING WHAT THEY SAID, AFTER THE CHECK-IN CLOSES (decision 57, item 5, tightened 30 September
   * 2026). Fire-and-forget beside the other post-close reads: a failure here must never be why a
   * completed session does not complete.
   *
   * Runs only when this check-in actually carried the confirmation question - found by the
   * question's own literal text on one of this check-in's AI turns, never assumed from the prompt
   * block having been built (a model can leave an offered line unused). A clear "yes" stamps
   * detectedFunctionConfirmedAt/By; a different description does too, AND is written to the
   * person's OWN role (their account's jobTitle - see PATCH /participants/:id for why this is never
   * GroundParticipant.roleAsDescribed, the lead's private description, decision 30). Anything else
   * stamps nothing about the person - only the turn that asked, with ROLE_CONFIRM_ASKED, so the
   * cooldown in roleConfirmationBlockFor holds off asking again for a couple of periods rather than
   * every remaining check-in.
   */
  async extractRoleConfirmation(checkIn: { id: string; participantId: string }): Promise<void> {
    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: checkIn.participantId },
      select: { userId: true, detectedFunction: true, detectedFunctionConfidence: true, detectedFunctionConfirmedAt: true },
    });
    if (!participant?.userId || !participant.detectedFunction || participant.detectedFunctionConfirmedAt) return;
    if ((participant.detectedFunctionConfidence ?? 0) >= LOW_CONFIDENCE_CONFIRM_THRESHOLD) return;

    const question = roleConfirmationQuestion(participant.detectedFunction as RoleFunction);
    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, askedFor: true },
    });
    const askedAt = turns.findIndex((t) => t.role === TurnRole.AI && (t.content ?? '').includes(question));
    if (askedAt === -1) return; // Never put to them this check-in; nothing to read, nothing to stamp.

    const stampAskedIfUnstamped = () => {
      const turn = turns[askedAt];
      if (turn.askedFor) return Promise.resolve(); // Already carries a stamp from something else - never overwritten.
      return this.prisma.conversationTurn.update({ where: { id: turn.id }, data: { askedFor: ROLE_CONFIRM_ASKED } }).catch(() => {});
    };

    const reply = (turns.slice(askedAt + 1).find((t) => t.role === TurnRole.PERSON)?.content ?? '').trim();
    if (!reply) {
      await stampAskedIfUnstamped();
      return;
    }

    let said: { verdict?: string; correctedRole?: string } | null = null;
    try {
      said = await this.anthropic.extract<{ verdict?: string; correctedRole?: string }>(
        ROLE_CONFIRMATION_READ_PROMPT,
        [{ role: 'user', content: `QUESTION THEY WERE ASKED: ${question}\nTHEIR REPLY: ${reply}` }],
        ROLE_CONFIRMATION_READ_SCHEMA,
        { fast: true },
      );
    } catch (err) {
      this.logger.warn(`Role-confirmation read failed for check-in ${checkIn.id}: ${(err as Error)?.message}`);
    }
    const verdict = theRoleConfirmationVerdict(said);
    const now = new Date();

    if (verdict.verdict === 'confirmed') {
      await this.prisma.groundParticipant.update({
        where: { id: checkIn.participantId },
        data: { detectedFunctionConfirmedAt: now, detectedFunctionConfirmedBy: participant.userId },
      });
      this.logger.log(`Check-in ${checkIn.id}: the person confirmed their guessed function as it stands.`);
    } else if (verdict.verdict === 'corrected') {
      await Promise.all([
        this.prisma.user.update({ where: { id: participant.userId }, data: { jobTitle: verdict.correctedRole } }),
        this.prisma.groundParticipant.update({
          where: { id: checkIn.participantId },
          data: { detectedFunctionConfirmedAt: now, detectedFunctionConfirmedBy: participant.userId },
        }),
      ]);
      this.logger.log(`Check-in ${checkIn.id}: the person described their role differently ("${verdict.correctedRole}") - written to their own job title, never the lead's roleAsDescribed.`);
    } else {
      await stampAskedIfUnstamped();
    }
  }

  /**
   * Resolve, to participant IDs, whose other work this person's account
   * referenced and in what sense.
   *
   * SHARED-mode only. This replaces matching first names against other people's
   * text, which false-positives on common names, misses anyone referred to
   * differently, and cannot tell crediting someone from covering for them.
   *
   * A name the model reports is matched against the roster ONCE here and, if it
   * does not resolve to a participant, is dropped. A wrong attribution on a read
   * about a person is worse than a missing one.
   */
  /**
   * WHAT THE LEAD SAID THEY EXPECT, WRITTEN DOWN. GW-EXP-1b.
   *
   * Slice 1a gave the lead's session the per-person questions and proved live that it asks them, and
   * asks whether the person knows. This is the half that keeps the answers: without it the interview
   * produces a good conversation and `personObjective` stays at the zero rows it has held for the
   * product's whole life.
   *
   * INITIATOR ONLY. Expectations have one author, and that is the whole point of the design - a
   * participant's session is where they say what success looks like to THEM, which is a different
   * field and gets compared against this rather than merged into it.
   *
   * NAMES ARE RESOLVED, NEVER GUESSED. Lifted from `extractWorkMentions`, including its rule: a name
   * that does not match somebody on the roster is dropped. An expectation attached to the wrong person
   * is worse than a missing one, because it becomes a thing somebody is measured against that was
   * never about them.
   *
   * UPSERT, NOT CREATE. A later session where the lead restates an expectation replaces it, because
   * the current expectation is the one that counts. The transcript keeps the history.
   */
  /**
   * WRITE DOWN WHAT THIS PERSON SAID THEY WOULD DO.
   *
   * The other half of expectations, and the half that was missing. A lead's session records what
   * they expect OF people; this records what somebody promised about their OWN work, so the next
   * check-in can return to it by name and by date instead of asking how things are going.
   *
   * `authoredBy: 'self'` is what tells the interview these are theirs. `describeObjective` already
   * renders a self-authored expectation differently from one handed down, and has since before
   * anything could produce one.
   *
   * `seenBySubject: true`, and only here. That field exists to stop somebody being read against an
   * expectation they have never laid eyes on - a real risk for something a lead wrote about them,
   * and a nonsense for a sentence they said themselves ten minutes ago.
   */
  /**
   * WHERE THEIR ACCOUNT OF A PROCESS AND THE WRITTEN ONE DIFFER.
   *
   * The durable half of asking somebody to walk you through something. Without it the walk-through
   * happens, the difference is noticed in the moment, and it is gone - buried in a transcript that
   * the next check-in reads six entries of.
   *
   * ONLY WHERE THE COMPANY HAS WRITTEN IT DOWN. No cards, no differences, no entries, and that is
   * most organisations. This never invents a process to measure somebody against.
   *
   * `dimensionThreadKey` is the card's own key, which is what that column was built for and what
   * nothing has ever written to it: it groups the same theme across sessions, so "contracting" at
   * day 14 and "contracting" at day 60 are the same thread rather than two unrelated notes.
   */
  async extractOperatingDifferences(checkInId: string, participantId: string, groundId: string) {
    if (!this.knowledge) return;

    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId, role: TurnRole.PERSON },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });
    const said = turns.map((t) => t.content).join('\n').trim();
    if (said.length < 200) return; /* Too little was said for any of this to mean anything. */

    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { organizationId: true },
    });
    if (!ground) return;

    const cards = await this.knowledge
      .covering(ground.organizationId, said.slice(0, 4_000))
      .catch(() => [] as any[]);
    if (!cards.length) return;

    const written = cards.map((c: any) => `--- ${c.title} (key: ${c.key}) ---\n${c.body}`).join('\n\n');
    const result = await this.anthropic.extract<{
      differences: { about: string; theirAccount: string; whatIsWritten: string; neverTold?: boolean }[];
    }>(
      OPERATING_DIFFERENCE_PROMPT,
      [{ role: 'user', content: `WHAT IS WRITTEN:\n${written}\n\nWHAT THEY SAID:\n${said}` }],
      OPERATING_DIFFERENCE_SCHEMA,
    ).catch(() => null);
    if (!result?.differences?.length) return;

    for (const d of result.differences) {
      const about = (d.about ?? '').trim();
      const theirs = (d.theirAccount ?? '').trim();
      const written = (d.whatIsWritten ?? '').trim();
      if (!about || !theirs || !written) continue;

      /*
       * BOTH SIDES IN ONE SENTENCE, always. An entry saying only what they said would read as a
       * quote; one saying only what is written would read as a correction. The difference is the
       * thing, and it is only visible with both halves of it present.
       */
      const told = d.neverTold
        ? ' They said nobody had told them this, so it is worth checking who should have.'
        : '';
      /*
       * AND IT IS BUILT OUT OF WHOLE SENTENCES, NOT JOINED WITH COLONS.
       *
       * What this used to write, and what a person read: "On the refund process, they described:
       * {their words}. What is written here: {the document}." Two colon joins and a fragment where
       * the first sentence should be, which is the pattern fix 2 took out of the reports and which
       * survived here because this entry is written in the conversation service rather than in a
       * report. `about` is one full sentence now, so it opens the entry on its own.
       */
      const text = `${about} This is what they described. ${theirs} This is what the written process says. `
        + `${written} Which of the two is right is worth settling, because the written one may be out of date.${told}`;

      /* The card's key groups this theme across sessions. */
      const key = cards.find((c: any) => about.toLowerCase().includes(String(c.key).toLowerCase()))?.key
        ?? cards[0]?.key ?? null;

      await this.prisma.recordEntry.create({
        data: {
          participantId,
          checkInId,
          type: 'OPERATING_DIFFERENCE' as any,
          text,
          recallBased: true,
          dimensionThreadKey: key,
        },
      }).catch(() => undefined);
    }
  }

  /**
   * WHAT THEY SAID THEY HAD DONE, WRITTEN AGAINST THE PROMISE IT IS ABOUT.
   *
   * The record could hold a promise and a date and had no way to hear the answer: progress existed
   * only if somebody typed it into a form. So a person could describe two proposals at length and
   * the record would still say nothing had been done.
   *
   * That is not just a missing feature. The report's reading that "the agreed thing is not being
   * done" rests on nothing being recorded as done - so an empty progress list turned every passed
   * date into that reading, for somebody who had been getting on with it and saying so.
   *
   * IT REUSES `Delivery`, which has always been the record of what somebody delivered against an
   * expectation. It only ever had a form behind it and never a conversation.
   *
   * FINISHED IS A HIGH BAR. Marking a promise complete when they only said they had started is
   * worse than marking nothing: they lose the credit for what is genuinely still outstanding, and
   * the record stops matching what they said.
   */
  /**
   * WHAT THEY SAY HAPPENED WITH A CUSTOMER, RECORDED AS THEIR OWN ACCOUNT.
   *
   * The other half of taking in evidence, and the half that keeps it honest. External records fail
   * in ordinary ways - a call from a phone nothing is connected to, an app that did not sync, a
   * shop logged twice - and in every one of those the record is silent while the work happened.
   *
   * Their account is written at `SELF_REPORTED`, which the report already knows how to describe
   * without doubting it or dressing it up as corroboration. Nothing is overwritten in either
   * direction: a discrepancy preserved is worth more than a certainty invented.
   *
   * ONLY THEIR OWN WORK, and only where the organisation already takes in evidence. In an
   * organisation that connects nothing, a check-in should not quietly start building an activity
   * log about somebody out of what they said in confidence.
   */
  async extractWhatTheySayHappened(checkInId: string, participantId: string, groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { organizationId: true },
    });
    if (!ground) return;

    /*
     * The organisation has to be taking in evidence already. Without this, a private check-in in a
     * company that connected nothing would start producing a record of somebody's movements, which
     * is not what anybody agreed to when they answered the questions.
     */
    const takesEvidence = await this.prisma.interaction.count({
      where: { organizationId: ground.organizationId },
      take: 1,
    });
    if (!takesEvidence) return;

    const me = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      select: { userId: true, email: true, user: { select: { email: true } } },
    });
    /* A guest's words are never filed as the work of an entry on the host's list. See a-guest-is-never-somebody-on-the-hosts-list. */
    const person = me?.user?.email && !(await isAGuestIn(this.prisma, ground.organizationId, { userId: me.userId, email: me.email, userEmail: me.user.email }))
      ? await this.prisma.person.findFirst({
        where: { organizationId: ground.organizationId, email: me.user.email },
        select: { externalId: true },
      })
      : null;
    /* Nobody in the directory, nobody to attribute it to. Never guessed. */
    if (!person) return;

    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId, role: TurnRole.PERSON },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });
    const said = turns.map((t) => t.content).join('\n').trim();
    if (said.length < 80) return;

    const result = await this.anthropic.extract<{ happened: TheySay[] }>(
      THEY_SAY_HAPPENED_PROMPT,
      [{ role: 'user', content: said }],
      THEY_SAY_HAPPENED_SCHEMA,
    ).catch(() => null);
    if (!result?.happened?.length) return;

    /* Counterparties this organisation already knows, matched by the name their system gave them. */
    const known = await this.prisma.subject.findMany({
      where: { organizationId: ground.organizationId, type: 'COUNTERPARTY' as any, sourceDeletedAt: null },
      select: { externalId: true, title: true },
    });

    for (const item of result.happened) {
      if (!worthRecording(item)) continue;

      const named = (item.counterparty ?? '').trim().toLowerCase();
      const hit = known.find((k) => k.title.trim().toLowerCase() === named)
        ?? known.find((k) => named.length > 4 && k.title.toLowerCase().includes(named));

      await this.prisma.interaction.create({
        data: {
          organizationId: ground.organizationId,
          personExternalId: person.externalId,
          /* Unmatched stays null rather than guessing - a visit filed against the wrong shop is
             worse than one filed against none. Their words survive in the note either way. */
          counterpartyExternalId: hit?.externalId ?? null,
          kind: (item.kind ?? '').toUpperCase() as any,
          strength: 'SELF_REPORTED' as any,
          /*
           * The date their words meant, and today when they carry none. Unlike a promise, a thing
           * that already happened has to sit somewhere on a calendar to be read beside the records,
           * and "this check-in" is the honest place for it.
           */
          happenedAt: whenTheyMeant(item.when ?? null, new Date()) ?? new Date(),
          note: [item.note?.trim(), hit ? null : (item.counterparty?.trim() ? `They said: ${item.counterparty.trim()}` : null)]
            .filter(Boolean).join(' ').slice(0, 500) || null,
          sourceSystem: 'their own account',
          externalId: null,
        },
      }).catch(() => undefined);
    }
  }

  async extractProgress(checkInId: string, participantId: string, groundId: string) {
    const mine = await this.prisma.personObjective.findMany({
      where: { groundId, participantId, status: 'OPEN' },
      select: { id: true, text: true },
    });
    if (!mine.length) return;

    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId, role: TurnRole.PERSON },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });
    const said = turns.map((t) => t.content).join('\n').trim();
    if (said.length < 80) return;

    const result = await this.anthropic.extract<{
      progress: { promise: string; whatTheyDid: string; finished?: boolean }[];
    }>(
      PROGRESS_PROMPT,
      [{ role: 'user', content: `THEIR PROMISES:\n${mine.map((m) => `- ${m.text}`).join('\n')}\n\nTHEIR CHECK-IN:\n${said}` }],
      PROGRESS_SCHEMA,
    ).catch(() => null);
    if (!result?.progress?.length) return;

    for (const p of result.progress) {
      const did = (p.whatTheyDid ?? '').trim();
      if (!did) continue;

      /*
       * Matched on the promise's own words, and dropped when it matches none. A piece of progress
       * filed against the wrong promise is worse than one filed against nothing: it marks the
       * wrong thing as moving, and quietly leaves the real one looking untouched.
       */
      const wanted = (p.promise ?? '').trim().toLowerCase();
      const hit = mine.find((m) => m.text.trim().toLowerCase() === wanted)
        ?? mine.find((m) => wanted.length > 12 && m.text.toLowerCase().includes(wanted))
        ?? null;
      if (!hit) continue;

      await this.prisma.delivery.create({
        data: { groundId, participantId, objectiveId: hit.id, text: did, carriedIntoCheckInId: checkInId },
      }).catch(() => undefined);

      if (p.finished === true) {
        await this.prisma.personObjective.update({
          where: { id: hit.id },
          data: { status: 'MET', statusChangedAt: new Date() },
        }).catch(() => undefined);
      }
    }
  }

  private async writeTheirOwnPromises(
    participantId: string,
    groundId: string,
    transcript: string,
    saidOn: Date,
    participants: { id: string; managingOnly: boolean; email: string | null; roleAsDescribed: string | null; user: { firstName: string | null; lastName: string | null } | null }[],
  ): Promise<{ participantId: string; name: string; target: number }[]> {
    /* Their own counted aims, returned so a participant's can be put on the board as theirs (request 107 c). */
    const counted: { participantId: string; name: string; target: number }[] = [];
    const result = await this.anthropic.extract<{
      promises: { promise: string; kind?: string; check?: string; dueKind?: string; dueSaid?: string; owedTo?: string; target?: string; measure?: string }[];
    }>(OWN_PROMISE_PROMPT, [{ role: 'user', content: transcript }], OWN_PROMISE_SCHEMA);
    if (!result?.promises?.length) return counted;

    /* Same resolver as everywhere else: a name matching nobody is dropped, never guessed. */
    const others = participants.filter((p) => p.id !== participantId && !p.managingOnly);
    const resolve = (name: string): string | null => {
      const n = (name ?? '').trim().toLowerCase();
      if (!n) return null;
      const hit = others.find((p) => {
        const first = (p.user?.firstName ?? '').toLowerCase();
        const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').toLowerCase();
        const emailLocal = (p.email ?? '').split('@')[0].toLowerCase();
        const role = (p.roleAsDescribed ?? '').toLowerCase();
        return (!!full && full === n) || (!!first && first === n) || (!!emailLocal && emailLocal === n) || (!!role && role === n);
      });
      return hit?.id ?? null;
    };

    const KINDS = ['TODO', 'COMMITMENT', 'TARGET', 'GOAL'];
    const CHECKS = ['DONE_OR_NOT', 'A_NUMBER', 'A_JUDGEMENT', 'NOT_CHECKABLE'];
    const DUES = ['A_DATE', 'A_CYCLE', 'STANDING', 'NOT_SAID'];

    for (const p of result.promises) {
      const text = (p.promise ?? '').trim();
      if (!text) continue;
      const kind = KINDS.includes(p.kind ?? '') ? (p.kind as any) : 'TODO';
      const check = CHECKS.includes(p.check ?? '') ? (p.check as any) : 'NOT_CHECKABLE';
      const dueKind = DUES.includes(p.dueKind ?? '') ? (p.dueKind as any) : 'NOT_SAID';
      const dueSaid = (p.dueSaid ?? '').trim() || null;
      /* A commitment with nobody waiting is a to-do, whatever the model called it. */
      const owedTo = kind === 'COMMITMENT' ? resolve(p.owedTo ?? '') : null;

      /* Only where they stated a number. A promise nobody counted does not become one here. */
      const target = (p.target ?? '').trim() || null;
      const measure = (p.measure ?? '').trim() || null;

      const data = {
        text,
        target: target && measure ? target : null,
        measure: target && measure ? measure : null,
        authoredBy: 'self',
        kind: (kind === 'COMMITMENT' && !owedTo ? 'TODO' : kind) as any,
        check,
        dueKind,
        dueSaid,
        dueDate: whenTheyMeant(dueSaid, saidOn),
        owedToParticipantId: owedTo,
        seenBySubject: true,
      };

      /*
       * One row per kind, which is the constraint this table already holds. Restating the same
       * kind is a REVISION - "make that four proposals, not three" - and updates in place, so a
       * record does not fill up with every version of the same promise.
       */
      const prior = await this.prisma.personObjective.findFirst({
        where: { groundId, participantId, kind: data.kind, externalId: '' },
        select: { id: true },
      });
      if (prior) {
        await this.prisma.personObjective.update({ where: { id: prior.id }, data });
      } else {
        await this.prisma.personObjective.create({ data: { ...data, groundId, participantId } });
      }
      const asANumber = aNumberTheySaid(data.target);
      if (data.kind === 'TARGET' && data.measure && asANumber != null) counted.push({ participantId, name: text, target: asANumber });
    }
    return counted;
  }

  /**
   * THE COPY THAT OUTLIVES THIS GROUND, for the org layer: a commitment the lead set for somebody, once the lead has told them
   * (decisions 48 and 56). Additive: the row in the ground stays authoritative and nothing here changes what a check-in does.
   * Failing to mirror must never fail the check-in being written, so `mirrorCommitment` swallows its own errors.
   */
  private async copyToTheOrganisationsCommitments(groundId: string, participantId: string, personObjectiveId: string, text: string, dueSaid: string | null): Promise<void> {
    const person = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      select: { email: true, userId: true, ground: { select: { organizationId: true } } },
    });
    /* A guest's word is theirs, never an entry's on the host's list. See a-guest-is-never-somebody-on-the-hosts-list. */
    const roster = person?.email && !(await isAGuestIn(this.prisma, person.ground.organizationId, person))
      ? await this.prisma.person.findFirst({
        where: { organizationId: person.ground.organizationId, email: person.email.toLowerCase() },
        select: { externalId: true },
      })
      : null;
    await mirrorCommitment(this.prisma, {
      organizationId: person!.ground.organizationId,
      groundId,
      personObjectiveId,
      personExternalId: roster?.externalId ?? null,
      text,
      dueSaid,
      /* Only ever a date somebody actually gave. `dueSaid` is never parsed into one. */
      dueAt: null,
    });
  }

  /**
   * @param spokenElsewhere the conversation to read, where it is not on the check-in's own record.
   *
   * SETUP IS NOT A CHECK-IN ANY MORE, AND ITS WORDS STILL SET THE TARGETS.
   *
   * The lead's setup conversation used to be copied onto session 1, which is how this found it.
   * Since setup stopped counting as her account - she does her own first check-in now - session 1
   * is empty at commit and this would have returned at `turns.length === 0`, silently taking the
   * five targets back out of the product the same day they were put in.
   *
   * The targets were never her ACCOUNT of the work. They are what she said the check-in is for,
   * which is exactly what setup is, so they still come from there.
   */
  async extractExpectations(checkInId: string, participantId: string, groundId: string, spokenElsewhere?: { role: string; content: string }[]) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        peopleWorkTogether: true,
        participants: {
          select: {
            id: true,
            partyType: true,
            createdAt: true,
            managingOnly: true,
            email: true,
            roleAsDescribed: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!ground) return;

    const me = ground.participants.find((p) => p.id === participantId);
    if (!me) return;

    /*
     * WHOSE AIM IS AN AIM SAID IN A CHECK-IN. Adversarial run, 20 September 2026: a loan officer
     * said "she is one month behind on a 150,000 NGN payment" about one borrower; it was written as
     * an aim of the whole ground with nobody's name on it, and two other borrowers were then told
     * "You said you need to make the 150,000 NGN payment". One person's number reached two other
     * people's private check-ins. An aim said inside somebody's own check-in belongs to the person
     * who said it. The one exception is the lead setting a target for a team that works together -
     * that is what a shared target IS. In a cohort, where people do not work together, even the
     * lead's spoken numbers stay the lead's; a target for everybody is set at setup, on the form.
     */
    const aimsAreShared = me.partyType === PartyType.INITIATOR && (ground as any).peopleWorkTogether !== false;

    /*
     * EVERYBODY'S PROMISES, NOT ONLY THE LEAD'S.
     *
     * This returned here unless the speaker was the INITIATOR, so only the person leading a
     * check-in produced structured expectations. Everybody else's promises - the new hire's "three
     * proposals by the 30th", the exact thing the next check-in most needs to return to - were
     * written to `RecordEntry` as text and never became anything a question could be built from.
     *
     * `authoredBy` already carried the distinction and nothing was using it: 'lead' for an
     * expectation somebody sets for another person, 'self' for one you take on yourself. The
     * interview renders the two differently and has since before this line changed.
     *
     * The rules underneath are unchanged and still do the work that matters: an expectation is
     * only ever written against a real named person on this check-in, and never against a team,
     * a customer or an organisation.
     */
    const authoredBy = me.partyType === PartyType.INITIATOR ? 'lead' : 'self';

    /* The day this was said, which every relative deadline is read against. */
    const saidOn = new Date();

    const turns = spokenElsewhere?.length
      ? spokenElsewhere.map((t) => ({ role: t.role === 'user' ? TurnRole.PERSON : TurnRole.AI, content: t.content }))
      : await this.prisma.conversationTurn.findMany({
          where: { checkInId },
          orderBy: { createdAt: 'asc' },
        });
    if (turns.length === 0) return;
    /* Every number in the person's own turns, at every scale it could be read at. See the aims filter below. */
    /*
     * WHAT THEY ATTACHED IS WHAT THEY SAID. A lead who put the team's numbers in a sheet has given them
     * to us as surely as if they had typed them (Hafsah, 22 Sep 2026), and this read the transcript only
     * - so the sheet's targets had nowhere to land and the aims filter below would have stripped them
     * as numbers nobody said. Their own attachments, labelled as attachments, and their numbers count
     * as theirs. Capped, because this is an extraction input and a plan is not a sheet.
     */
    /* Optional-chained the way the rest of this file reaches a model a test double may not carry. */
    const theirDocuments = await (this.prisma.groundDocument?.findMany?.({
      where: { groundId, participantId },
      orderBy: { createdAt: 'asc' },
      select: { fileName: true, content: true },
    }) ?? Promise.resolve([])).catch(() => [] as { fileName: string; content: string | null }[]);
    const attached = theirDocuments
      .filter((d) => (d.content ?? '').trim())
      .map((d) => `THEY ATTACHED "${d.fileName}":\n${(d.content ?? '').slice(0, MOST_OF_A_DOCUMENT_WE_READ)}`)
      .join('\n\n');
    const numbersInTheirWords = new Set<number>(
      turns
        .filter((t) => t.role === TurnRole.PERSON)
        .map((t) => t.content ?? '')
        .concat(theirDocuments.map((d) => d.content ?? ''))
        .flatMap((text) => numbersInAClaim(text))
        .flatMap((n) => [n, Math.round(n)]),
    );
    const theirWordsAsText = [...turns.filter((t) => t.role === TurnRole.PERSON).map((t) => t.content ?? ''), ...theirDocuments.map((d) => d.content ?? '')].join('\n');
    const sumsOnlyARequestSaid = theSumsOnlyARequestSaid(turns.filter((t) => t.role === TurnRole.PERSON).map((t) => t.content ?? ''));
    const transcript = turns
      .map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`)
      .join('\n')
      + (attached ? `\n\n${attached}` : '');

    /*
     * A PARTICIPANT'S OWN PROMISES GO DOWN A DIFFERENT PROMPT.
     *
     * `EXPECTATION_PROMPT` reads a lead's session and its rules forbid the speaker writing anything
     * about themselves, which is correct for what it does. Pointing it at a participant would have
     * captured what the new hire expects of the CEO - the opposite of what is needed. So their own
     * promises have their own prompt, their own schema, and one target: themselves.
     */
    if (me.partyType !== PartyType.INITIATOR) {
      const theirAims = await this.writeTheirOwnPromises(participantId, groundId, transcript, saidOn, ground.participants as any);
      /*
       * AND A NUMBER THEY SET FOR THEMSELVES IS A TARGET ON THE BOARD, AS THEIRS (request 107 c).
       *
       * "I am aiming for 3 shops in Kilimani" was kept as a promise of Amani's and went nowhere else:
       * this branch returned before the only path that puts an owned target on the board, which
       * read the lead's session alone. It is now hers, set by her, in her own words, and read like
       * every owned target: by her and the person running it, or by everybody where the lead chose
       * that. A number already on the board for her is never overwritten from here.
       */
      if (theirAims.length) await this.putOwnedTargetsOnTheRecord(groundId, theirAims, participantId);
      return;
    }

    /*
     * THE LEAD'S OWN PROMISES, WHICH NOTHING WROTE DOWN.
     *
     * This branched: a participant's session went to `writeTheirOwnPromises`, a lead's went to
     * `EXPECTATION_PROMPT` - and that prompt's rules forbid the speaker writing anything about
     * themselves, correctly, because its job is what they expect OF OTHERS.
     *
     * So the one person whose own next step nobody recorded was the person running the check-in.
     * Read back from a real session: the lead said "I have not told him, and that is on me", the
     * conversation agreed it was the most important fact established, and it went into the record as
     * an observation about the situation rather than as anything he owed. Session two had nothing of
     * his to test.
     *
     * BOTH NOW, NOT INSTEAD. Expectations of others and promises of your own are different things
     * about different people, they are stored differently, and a lead has both. The two prompts do
     * not overlap: one is explicitly barred from self-statements and the other reads nothing else.
     */
    await this.writeTheirOwnPromises(participantId, groundId, transcript, saidOn, ground.participants as any);

    const result = await this.anthropic.extract<{
      groundAims: { name: string; target?: number | null; by?: string | null }[];
      theirOwnTarget?: { name: string; target: number } | null;
      expectations: {
        personName: string;
        targetNumber?: number | null;
        expectation: string;
        awareness: string;
        awarenessDetail?: string;
        /** The primitive. Validated against the enums below, never trusted as returned. */
        kind?: string;
        check?: string;
        dueKind?: string;
        dueSaid?: string;
        owedTo?: string;
        /** REFERENCE only: where the work is tracked. Never its state. */
        trackedUrl?: string;
      }[];
    }>(EXPECTATION_PROMPT, [{ role: 'user', content: `${theSpeakerLine(me)}\n\n${transcript}` }], EXPECTATION_SCHEMA as any);
    if (!result) return;

    /** The same resolver as work mentions: a name that matches nobody is dropped, never guessed. */
    const others = ground.participants.filter((p) => p.id !== participantId && !p.managingOnly);
    const resolve = (name: string): string | null => {
      const n = (name ?? '').trim().toLowerCase();
      if (!n) return null;
      const hit = others.find((p) => {
        const first = (p.user?.firstName ?? '').toLowerCase();
        const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').toLowerCase();
        const emailLocal = (p.email ?? '').split('@')[0].toLowerCase();
        const role = (p.roleAsDescribed ?? '').toLowerCase();
        return (!!full && full === n) || (!!first && first === n) || (!!emailLocal && emailLocal === n) || (!!role && role === n);
      });
      return hit?.id ?? null;
    };

    const AWARENESS = ['TOLD', 'NOT_TOLD', 'UNSURE', 'NOT_ASKED'];
    /**
     * THE PRIMITIVE, VALIDATED AGAINST THE ENUM RATHER THAN TRUSTED.
     *
     * A model returning a value outside the set has to fall to something honest, and the honest
     * fallback is the one that ADMITS IGNORANCE: an unknown kind is not a to-do, and an unknown
     * check is NOT_CHECKABLE. Defaulting the other way would let a junk value become a target
     * somebody is then read against.
     */
    const KINDS = ['TODO', 'COMMITMENT', 'TARGET', 'GOAL', 'SUCCESS_DEFINITION', 'ROLE_EXPECTATION', 'REFERENCE'];
    const CHECKS = ['DONE_OR_NOT', 'A_NUMBER', 'A_JUDGEMENT', 'NOT_CHECKABLE'];
    const DUES = ['A_DATE', 'A_CYCLE', 'STANDING', 'NOT_SAID'];

    /* "150 each" said about three people is three owned targets, not one. Collected here where the
       name is already resolved to a participant, written below beside the ground's own aims. */
    const theirOwnNumbers: { participantId: string; name: string; target: number }[] = [];
    for (const e of result.expectations ?? []) {
      const target = resolve(e.personName);
      if (!target) continue;
      if (Number.isFinite(e.targetNumber) && (e.targetNumber as number) > 0) {
        const said = (e.expectation ?? '').trim();
        if (said) theirOwnNumbers.push({ participantId: target, name: said, target: Math.round(e.targetNumber as number) });
      }
      const text = (e.expectation ?? '').trim();

      const kind = KINDS.includes(e.kind ?? '') ? (e.kind as any) : null;
      const check = CHECKS.includes(e.check ?? '') ? (e.check as any) : 'NOT_CHECKABLE';
      const dueKind = DUES.includes(e.dueKind ?? '') ? (e.dueKind as any) : 'NOT_SAID';
      const dueSaid = (e.dueSaid ?? '').trim() || null;
      /**
       * WHO IS WAITING ON IT, resolved against this check-in's roster like any other name - and
       * DROPPED if it does not resolve, never guessed. A commitment pointing at somebody who is not
       * here would put a handoff on a page belonging to nobody.
       */
      const owedTo = kind === 'COMMITMENT' && e.owedTo ? resolve(e.owedTo) : null;
      /**
       * WHERE IT IS TRACKED. REFERENCE only, so a ticket number cannot creep onto a target.
       *
       * The state is deliberately NOT taken from the conversation. The lead saying "OPS-418 is in
       * review" is a claim about a moment already past by the time it is written down, and storing
       * it as the ticket's state would make this page a stale copy of the tracker. Somebody has to
       * say they looked, and that write stamps the time itself.
       */
      const trackedUrl = kind === 'REFERENCE' ? (e.trackedUrl ?? '').trim() || null : null;
      if (!text) continue;
      const awareness = AWARENESS.includes(e.awareness) ? e.awareness : 'NOT_ASKED';

      /**
       * CHANGED WORDS ARE UNSEEN WORDS. GW-EXP-4, fixing a defect I introduced in the extraction.
       *
       * `proposeObjective` has always reset `seenBySubject` when a lead rewrites an expectation, with
       * the reasoning on it: "carrying the old seenBySubject: true forward would let a changed target
       * be read against somebody who never saw the change." My upsert carried it forward.
       *
       * The consequence was live and quiet: a lead restating an expectation differently in session 3
       * would leave the person marked as having seen words they never saw, and the gap probe would
       * then press them on it in their very next session. The one protection this whole design keeps
       * from the old model, defeated by an update clause.
       *
       * Only a CHANGE resets it. A lead repeating the same expectation is not new words, and resetting
       * on every session would make an unchanged expectation permanently unseen.
       */
      /**
       * MATCHED ON PERSON AND KIND, so a lead can hold somebody to more than one thing.
       *
       * The row used to be unique per person, so "Abubakar owes Hafsah the plan by Friday, and he
       * owns escalations from now on" stored one of the two and silently dropped the other.
       *
       * `findFirst` rather than a composite `upsert` because `kind` is nullable: Prisma cannot look a
       * row up by a unique key containing a null, and rows written before the primitive have one.
       * Same rule either way - same person, same kind is a revision; a different kind is a different
       * thing and gets its own row.
       */
      const prior = await this.prisma.personObjective.findFirst({
        where: { groundId, participantId: target, kind },
        select: { id: true, text: true, trackedUrl: true, awareness: true, authoredBy: true },
      });
      const textChanged = !!prior && prior.text.trim() !== text;

      /*
       * THE DATE THOSE WORDS MEAN, WHERE THEY MEAN ONE.
       *
       * Read from `dueSaid` by a rule that refuses more than it accepts - see
       * `when-words-mean-a-date.ts`. Resolved against the day this was SAID rather than now, so
       * a re-run cannot move somebody's deadline.
       *
       * Null is the common case and stays comfortable: "soon" and "once procurement clears" are
       * real answers, and the interview asks about them rather than this guessing.
       */
      const dueDate = whenTheyMeant(dueSaid, saidOn);

      const eTarget = ((e as any).target ?? '').trim() || null;
      const eMeasure = ((e as any).measure ?? '').trim() || null;

      const shared = {
        text,
        dueDate,
        /* Both or neither: a number with nothing named is not a target anybody can check. */
        target: eTarget && eMeasure ? eTarget : null,
        measure: eTarget && eMeasure ? eMeasure : null,
        authoredBy: authoredBy as string,
        awareness,
        awarenessDetail: (e.awarenessDetail ?? '').trim() || null,
        kind,
        check,
        dueKind,
        dueSaid,
        owedToParticipantId: owedTo,
        trackedUrl,
      };

      if (prior) {
        /**
         * A RE-STATED EXPECTATION MUST NOT DESTROY THE POINTER OR ITS HISTORY.
         *
         * `shared` carries trackedUrl, so writing it wholesale set the url to whatever this
         * extraction happened to produce - which is null every time the lead restates the
         * expectation without repeating the ticket number. The link went, and `lastSeenState` and
         * `lastSeenAt` were left behind describing a ticket the row no longer names: everybody's
         * record of having looked, orphaned, still rendering as current.
         *
         * So: a url is only written when this extraction actually found one. And a DIFFERENT url is
         * a different ticket, which means the remembered state is about something else and has to
         * go with it - keeping it would be the copy-of-a-tracker failure with somebody else's
         * ticket's words in it.
         */
        const keepsPointer = !trackedUrl || trackedUrl === prior.trackedUrl;
        await this.prisma.personObjective.update({
          where: { id: prior.id },
          data: {
            ...shared,
            ...(keepsPointer
              ? { trackedUrl: prior.trackedUrl }
              : { trackedUrl, lastSeenState: null, lastSeenAt: null }),
            /** New words, so they have not seen them. Unchanged words keep whatever was already true. */
            ...(textChanged ? { seenBySubject: false } : {}),
          },
        });
        /* DECISION 56, ITEM 2: the area is worded once, here, at the point the goal is saved - never
           on a page read (decision 7). Best effort: a failure here is retried by the next save or by
           the warm-up, and every reader falls back to FALLBACK_AREA until then. */
        if (awareness === 'NOT_TOLD') {
          wordTheAreaOfAGoal(this.anthropic, this.prisma, text).catch((err: any) => this.logger.warn(`Wording the area of an untold goal failed: ${err?.message}`));
        }
        /* A commitment held back until the lead said they had told the person is copied now that they have (decisions 48 and 56). */
        if (kind === 'COMMITMENT' && !mayThisGoalBeCopiedToCommitments(prior as any) && mayThisGoalBeCopiedToCommitments({ awareness, authoredBy })) {
          await this.copyToTheOrganisationsCommitments(groundId, target, prior.id, text, dueSaid);
        }
      } else {
        const created = await this.prisma.personObjective.create({
          data: {
            ...shared,
            groundId,
            participantId: target,
            /**
             * False on creation and it must stay false: the person has not seen this yet.
             * `seenBySubject` is what stops anybody being read against an expectation they have never
             * laid eyes on, and publishing it to Context is what will flip it.
             */
            seenBySubject: false,
          },
        });
        /* Decision 56, item 2 - see the update branch above for why this is fire-and-forget. */
        if (awareness === 'NOT_TOLD') {
          wordTheAreaOfAGoal(this.anthropic, this.prisma, text).catch((err: any) => this.logger.warn(`Wording the area of an untold goal failed: ${err?.message}`));
        }

        /*
         * AND A COPY THAT OUTLIVES THIS GROUND, for the org layer.
         *
         * Additive: the row above stays authoritative for this ground and nothing here changes what
         * a check-in does. The mirror is what lets somebody's word carry into the next one. Failing
         * to mirror must never fail the check-in that was being written, so `mirrorCommitment`
         * swallows its own errors and returns false.
         */
        /* A goal the lead has not told the person about is not copied to what they owe until the lead says they have (decisions 48 and 56). */
        if (kind === 'COMMITMENT' && mayThisGoalBeCopiedToCommitments({ awareness, authoredBy })) {
          await this.copyToTheOrganisationsCommitments(groundId, target, created.id, text, dueSaid);
        }
      }
    }

    /**
     * The check-in's own aims, which have also always been empty. Only written when there are none
     * yet: a lead restating the aim in session 4 should not silently duplicate the list, and merging
     * by text is the kind of guess this file avoids elsewhere.
     */
    /*
     * THE NUMBER THEY SAID IS KEPT. IT USED TO BE THROWN AWAY.
     *
     * This stored `target: null` on every aim, always. A lead said "500 contracts by the end of the
     * year, 150 each, and I have a target of 50", and what was kept was three names and no figures.
     * Her board then read "No targets set yet, so there is nothing for this board to measure
     * progress against" and "Movement: not tracked", about the numbers she had just given it.
     * Nothing was being tracked because nothing had been kept.
     *
     * AND IT RAN ONCE PER GROUND, EVER. `existing === 0` meant a lead naming a second objective in
     * session four was dropped without a word. Aims are matched by name now and only what is new is
     * added, so restating an aim does not duplicate it and adding one is not refused.
     *
     * A NUMBER A PERSON SET BY HAND IS NEVER OVERWRITTEN. Where an aim already exists, this leaves
     * it alone. The board already has the honest shape for that case - "the record shows 40 for
     * this, not 0, press to accept" - and `suggestedCount` is where a conflict belongs, not here.
     */
    const aims = (result.groundAims ?? [])
      /* A sum said only to ask for it is the request's, never an aim (user journeys, F-9). */
      .filter((a) => !(Number.isFinite(a?.target) && sumsOnlyARequestSaid.has(Math.round(a!.target as number))))
      .map((a) => ({
        name: (a?.name ?? '').trim(),
        /* A target is a whole count of something. A wrong number is worse than none. */
        target: Number.isFinite(a?.target) && (a!.target as number) > 0 ? Math.round(a!.target as number) : null,
      }))
      .filter((a) => a.name)
      /*
       * A TARGET HAS TO BE A NUMBER THEY SAID. Run 4, 20 Sep 2026: a rep said "50kg bags" and the
       * extraction wrote him a N50m target, which the next turn then asked him about. A number that
       * appears in none of the person's own turns, at any scale (50, 50k, 50m), is the model's,
       * and the aim keeps its name and loses the number.
       */
      .map((a) => (a.target != null && !numbersInTheirWords.has(a.target) ? { ...a, target: null } : a))
      /* An aim the lead said as a share keeps its percent sign and its word, so a limit is not read as a count (user journeys, F-4). */
      .map((a) => theAimsNameKeepsItsShare([a], theirWordsAsText)[0]);
    /*
     * AND A NUMBER IN THE AIM'S OWN NAME IS ITS NUMBER, WHERE THEY SAID IT (request 117, part 2). "Sign 12 shops for
     * kitchen appliances in Nairobi." was kept with no number, so the board's headline had no answer and no bar.
     * See theNumberInTheNameIsKept.
     */
    const aimsWithTheirNumbers = theNumberInTheNameIsKept(aims, (n) => numbersInTheirWords.has(n));
    if (aimsWithTheirNumbers.length) {
      /* Against their own aims AND the shared ones: a participant restating the check-in's $400,000 as
         "bring in $400k of new business" is not setting a second target (run 6, 20 Sep 2026). */
      const existing = await this.prisma.groundObjective.findMany({
        where: { groundId, OR: [{ ownerParticipantId: null }, ...(aimsAreShared ? [] : [{ ownerParticipantId: participantId }])] },
        select: { name: true, target: true },
      });
      /* Matching on the name alone put "units of tea sold in Abuja (10,000)" and "10,000 units
         (10,000)" on the same board, as two objectives. See an-aim-said-twice-is-one-aim. */
      const fresh = theAimsThatAreNew(aimsWithTheirNumbers, existing as any, (n) => numbersInTheirWords.has(n));
      if (fresh.length) {
        await this.prisma.groundObjective.createMany({
          /* A person's own aim keeps the thing counted as its name, and its day as its date (request 117, part 11). */
          data: fresh.map((a, i) => {
            const kept = aimsAreShared ? { name: a.name, dueOn: null } : theDayKeptApart(a.name, (said) => theDayTheyMeant(said, new Date()));
            return { groundId, name: kept.name, target: a.target, sortOrder: existing.length + i, ownerParticipantId: aimsAreShared ? null : participantId, setByParticipantId: participantId, ...(kept.dueOn ? { dueOn: kept.dueOn } : {}) };
          }),
        });
        const withNumbers = fresh.filter((a) => a.target != null).length;
        this.logger.log(`Ground ${groundId}: kept ${fresh.length} aim(s), ${withNumbers} with a number.`);
      }
    }

    /*
     * AND A NUMBER SAID ABOUT ONE PERSON IS THAT PERSON'S.
     *
     * "150 each" about three people is three targets with three owners, not one target of 150 sitting
     * on the ground with nobody against it. `ownerParticipantId` has been on the model the whole time
     * and `where-each-person-is-against-their-number.ts` already renders progress per person; nothing
     * was writing the rows.
     *
     * Same rules as the aims above: matched by name and owner so restating does not duplicate, and a
     * number already on the board is never overwritten from here.
     */
    /*
     * AND THE SPEAKER'S OWN NUMBER, WHICH HAD NOWHERE TO GO.
     *
     * "150 each and i have a target of 50" was read live: the three 150s landed on the three people
     * and the 50 did not land anywhere. Everything above this is about OTHER people, so a lead's own
     * target was the one number on the board that went missing, and the lead is the person who set
     * the whole thing up.
     *
     * Found by running her transcript through the real extraction and reading the rows, not by
     * reading the code. Nothing in the tests would have caught it.
     */
    const own = result.theirOwnTarget;
    if (own?.name?.trim() && Number.isFinite(own.target) && own.target > 0) {
      theirOwnNumbers.push({ participantId, name: own.name.trim(), target: Math.round(own.target) });
    }

    /* A sum said only to ask for it is the request's, never somebody's goal (user journeys, F-9). */
    await this.putOwnedTargetsOnTheRecord(groundId, theirOwnNumbers.filter((t) => !sumsOnlyARequestSaid.has(t.target)), participantId);
  }

  /**
   * A NUMBER SAID ABOUT ONE PERSON IS THAT PERSON'S, and it is written in one place.
   *
   * Matched by owner and name so restating does not duplicate, and a number already on the board is
   * never overwritten from here - the board's own "the record shows 40 for this, press to accept" is
   * where a conflict belongs. Two callers: what the speaker said, and what a sheet they attached says
   * (see a-sheet-of-targets-is-read).
   *
   * @returns the rows that landed, so a caller can say what it took.
   */
  private async putOwnedTargetsOnTheRecord(
    groundId: string,
    rows: { participantId: string; name: string; target: number }[],
    setByParticipantId: string,
  ): Promise<{ participantId: string; name: string; target: number }[]> {
    if (!rows.length) return [];
    const [owned, team] = await Promise.all([
      this.prisma.groundObjective.findMany({
        where: { groundId, ownerParticipantId: { not: null } },
        select: { name: true, target: true, ownerParticipantId: true },
      }),
      this.prisma.groundObjective.findMany({
        where: { groundId, ownerParticipantId: null },
        select: { id: true, name: true, target: true, dueOn: true },
      }),
    ]);
    /*
     * ONE AIM IS ONE TARGET, WHOEVER RESTATES IT (screens requests 109 b and 111 b). The sales board listed
     * "Sign 12 shops for kitchen appliances in Nairobi.", "You want us to sign 12 shops by 20 December." and
     * "You want to get 12 shops onboarded." to its lead: the team's aim, and the lead saying it again twice,
     * each written as the lead's own target because it was matched on its exact name. A number somebody
     * says that is the team's aim said again (the same figure, about the same thing) is that aim, and the
     * same goes for one of their own they already hold. Where the restatement gives the day the team's aim
     * is due by, and the aim has none, the day is kept on the aim, so the board asks by the lead's own date.
     */
    const fresh: typeof rows = [];
    for (const t of rows) {
      const theirOwn = owned.filter((o) => o.ownerParticipantId === t.participantId).map((o) => ({ name: o.name, target: o.target }));
      const aim = { name: t.name, target: t.target };
      if (!theAimsThatAreNew([aim], theirOwn).length) continue;
      const theTeams = team.find((a) => !theAimsThatAreNew([aim], [{ name: a.name, target: a.target }]).length);
      if (theTeams) {
        const by = /\bby\s+(.+?)[.!]?$/i.exec(t.name)?.[1] ?? null;
        const day = by && !theTeams.dueOn ? theDayTheyMeant(by, new Date()) : null;
        if (day) await this.prisma.groundObjective.update({ where: { id: theTeams.id }, data: { dueOn: day } }).catch(() => undefined);
        continue;
      }
      fresh.push(t);
    }
    if (!fresh.length) return [];
    const wrote = await this.prisma.groundObjective.createMany({
      data: fresh.map((t, i) => ({
        groundId,
        /* The thing counted as the name, and the day it is due by as its date (request 117, part 11). */
        ...(() => {
          const kept = theDayKeptApart(theNameWithItsSum(t.name, t.target, aNumberPeopleCanRead), (said) => theDayTheyMeant(said, new Date()));
          return { name: kept.name, ...(kept.dueOn ? { dueOn: kept.dueOn } : {}) };
        })(),
        target: t.target,
        ownerParticipantId: t.participantId,
        /* The speaker: the lead setting "150 each" for three people, or a person naming their own. */
        setByParticipantId,
        sortOrder: 100 + i,
      })),
    }).then(() => true).catch((err: any) => {
      this.logger.warn(`Could not write per-person targets on ${groundId}: ${err?.message}`);
      return false;
    });
    if (!wrote) return [];
    this.logger.log(`Ground ${groundId}: kept ${fresh.length} target(s) against the person who owns them.`);
    return fresh;
  }

  /**
   * DO THE TWO VIEWS OF THIS PERSON'S JOB CONNECT? GW-EXP-3.
   *
   * The last piece, and the one the product exists for. The lead has said what they expect; this
   * person has said, in their own session and their own words, what doing well looks like. Comparing
   * them is the finding:
   *
   *     "I was measured on a queue and judged on judgement, and only one of those was said."
   *
   * PARTICIPANT SIDE, because it runs on THEIR words. It compares against the expectation held for
   * them, whether or not they have seen it - and the unseen case is the most valuable one there is,
   * since it is exactly the story above: two people working to different definitions, neither aware.
   *
   * NOTHING IS INVENTED WHERE THEY HAVE NOT SPOKEN. No success definition means the alignment stays
   * null, and the surface says "not yet said" rather than implying agreement. An absent view is not a
   * matching one.
   */
  /**
   * AN OBJECTION THAT SOMEBODY CAN SEE. GW-EXP-7.
   *
   * Her decision: "They should object in a way that you can see."
   *
   * The lead revises an expectation and the new words appear on the card with a reason. The person it
   * is about could only disagree into a transcript, so the visible lever belonged entirely to the side
   * that already had the power. This is the other half of that.
   *
   * IT DOES NOT CHANGE THE EXPECTATION. One person still owns it - that was the whole point of the
   * design, and an objection that silently rewrote the target would be the chaos the decision avoided.
   * What it does is make the disagreement as visible as the revision, so the lead answers it in their
   * own check-in rather than never hearing it.
   *
   * NOT THE SAME AS THE ALIGNMENT READ. "They described doing well differently" is a difference of
   * view, inferred from two statements. This is "I think this is wrong", said on purpose.
   */
  async extractObjection(checkInId: string, participantId: string, groundId: string) {
    /**
     * The most recently changed one. A person may be held to several things now, and an objection is
     * almost always about whichever was last put to them - and where it is not, the words they used
     * are recorded verbatim anyway, so the objection still says what they meant.
     */
    const expectation = await (this.prisma.personObjective?.findFirst({
      where: { groundId, participantId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, text: true },
    }) ?? Promise.resolve(null)).catch(() => null);
    /** Nothing recorded of them, so there is nothing to object TO. */
    if (!expectation?.text?.trim()) return;

    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });
    if (turns.length === 0) return;
    /* Every number in the person's own turns, at every scale it could be read at. See the aims filter below. */
    const numbersInTheirWords = new Set<number>(
      turns
        .filter((t) => t.role === TurnRole.PERSON)
        .flatMap((t) => numbersInAClaim(t.content ?? ''))
        .flatMap((n) => [n, Math.round(n)]),
    );
    const transcript = turns
      .map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`)
      .join('\n');

    const result = await this.anthropic.extract<{ objected: boolean; words?: string }>(
      OBJECTION_PROMPT,
      [{ role: 'user', content: `EXPECTATION RECORDED OF THEM: ${expectation.text}\n\nTRANSCRIPT:\n${transcript}` }],
      OBJECTION_SCHEMA as any,
    );
    if (!result?.objected) return;

    /**
     * Their own words or nothing. An objection recorded as "they objected", with no sentence anybody
     * can read, is an accusation the person cannot answer and the lead cannot act on.
     */
    const words = (result.words ?? '').trim();
    if (!words) return;

    /** Written to the row the objection was read against, not to "the person's objective". */
    await this.prisma.personObjective.update({
      where: { id: expectation.id },
      data: { objection: words, objectionAt: new Date() },
    }).catch(() => undefined);
  }

  async extractAlignment(checkInId: string, participantId: string, groundId: string) {
    /** The most recently changed one, and the alignment read is written back to that same row. */
    const expectation = await (this.prisma.personObjective?.findFirst({
      where: { groundId, participantId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, text: true },
    }) ?? Promise.resolve(null)).catch(() => null);
    if (!expectation?.text?.trim()) return;

    /**
     * Their own words, newest first. SUCCESS_DEFINITION is the record-entry type the session already
     * produces when it asks what doing well looks like - the field has existed and been populated all
     * along; nothing had ever compared it to anything.
     */
    const own = await this.prisma.recordEntry.findMany({
      where: { participantId, type: 'SUCCESS_DEFINITION' as any },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { text: true },
    });
    const ownView = own.map((o) => o.text.trim()).filter(Boolean).join(' ');
    if (!ownView) return;

    const result = await this.anthropic.extract<{ verdict: string; note: string }>(
      ALIGNMENT_PROMPT,
      [{ role: 'user', content: `EXPECTATION: ${expectation.text.trim()}\n\nTHEIR OWN VIEW: ${ownView}` }],
      ALIGNMENT_SCHEMA as any,
    );
    if (!result) return;

    /**
     * An unrecognised verdict becomes CANNOT_TELL rather than being stored raw or dropped. Dropping it
     * would leave the last good read standing over words that have since changed; storing junk would
     * put a state on screen that nothing knows how to render.
     */
    const VERDICTS = ['ALIGNS', 'DIFFERS', 'CANNOT_TELL'];
    const verdict = VERDICTS.includes(result.verdict) ? result.verdict : 'CANNOT_TELL';

    await this.prisma.personObjective.update({
      where: { id: expectation.id },
      data: { alignment: verdict, alignmentNote: (result.note ?? '').trim() || null },
    }).catch(() => undefined);
  }

  /**
   * THE FIGURES A TRACKING CHECK-IN IS FOR.
   *
   * The implementation-tracking pack presses harder on this than on anything else - the figures,
   * the period each covers, and where it came from - and twelve contract check-ins have run with
   * `ReportedFigure` empty, because nothing carried an answer out of the conversation. The chat
   * asked the right question and the answer stayed prose.
   *
   * ONLY ON AN AGREEMENT GROUND. Every other situation has numbers in it too, and they are not
   * figures reported under an arrangement - they are somebody describing their week. Writing those
   * here would put a person's own account into a table built for reconciling two companies.
   *
   * EVERYTHING WRITTEN IS UNCONFIRMED. The schema's own rule, obeyed: a model's reading is not the
   * figure until a person says so, and nothing compares an unconfirmed one to anything.
   */
  async extractStatedFigures(checkInId: string, participantId: string, groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { scenario: true, organizationId: true },
    });
    if (!ground || familyFor(ground.scenario) !== BoardFamily.AGREEMENT) return;

    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });
    if (!turns.length) return;
    /* Every number in the person's own turns, at every scale it could be read at. See the aims filter below. */
    const numbersInTheirWords = new Set<number>(
      turns
        .filter((t) => t.role === TurnRole.PERSON)
        .flatMap((t) => numbersInAClaim(t.content ?? ''))
        .flatMap((n) => [n, Math.round(n)]),
    );
    const transcript = turns
      .map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`)
      .join('\n');

    /* The model does not know what year it is. Driven live, "the thirty-first of August" came back
       dated 2024 on a check-in run in 2026 - see theDayThisWasSaid for why that is the worst error
       this table can hold. */
    const said = await this.anthropic.extract<{ figures?: unknown }>(
      FIGURE_PROMPT + theDayThisWasSaid(new Date()),
      [{ role: 'user', content: transcript }],
      FIGURE_SCHEMA as any,
    );
    const figures = theFiguresTheyStated(said ?? null);
    if (!figures.length) return;

    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      select: { email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
    });
    /* `from` is which side stated it and `statedBy` is who. Both are the customer's own handles
       rather than row ids, because a figure has to stay readable after anybody leaves. */
    /* Never an address as a name (week 12c): it is read back later in sentences. */
    const who = [participant?.user?.firstName, participant?.user?.lastName].filter(Boolean).join(' ')
      || ((participant as any)?.nameGiven ?? '').trim()
      || 'a colleague';

    for (const f of figures) {
      await this.prisma.reportedFigure.create({
        data: {
          organizationId: ground.organizationId,
          groundId,
          says: f.says,
          minorUnits: f.minorUnits,
          currency: f.currency,
          periodFrom: f.periodFrom,
          periodTo: f.periodTo,
          source: f.source,
          statedBy: who,
          from: who,
          // Unconfirmed, always. See the module's header and the schema's.
          confirmedAt: null,
        },
      }).catch((err: any) => this.logger.warn(`Could not keep a stated figure on ${checkInId}: ${err?.message}`));
    }
    this.logger.log(`Kept ${figures.length} stated figure(s) from ${checkInId}, unconfirmed.`);
  }

  async extractWorkMentions(checkInId: string, participantId: string, groundId: string, sessionNumber: number) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        mode: true, scenario: true,
        participants: { select: { id: true, email: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!ground || !boardRendersFor(ground.scenario)) return;

    const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } });
    if (turns.length === 0) return;
    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');

    const result = await this.anthropic.extract<{
      mentions: { personName: string; kind: string; text: string }[];
    }>(WORK_MENTION_PROMPT, [{ role: 'user', content: transcript }], WORK_MENTION_SCHEMA);

    const others = ground.participants.filter((p) => p.id !== participantId);
    const resolve = (name: string): string | null => {
      const n = name.trim().toLowerCase();
      if (!n) return null;
      const hit = others.find((p) => {
        const first = (p.user?.firstName ?? '').toLowerCase();
        const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').toLowerCase();
        const emailLocal = (p.email ?? '').split('@')[0].toLowerCase();
        return (!!full && full === n) || (!!first && first === n) || (!!emailLocal && emailLocal === n);
      });
      return hit?.id ?? null;
    };

    const rows = (result?.mentions ?? [])
      .map((m) => {
        const aboutParticipantId = resolve(m.personName);
        if (!aboutParticipantId) return null; // unresolved name: dropped, never guessed
        if (!(['CREDIT', 'COVERAGE', 'BLOCKED_BY'] as const).includes(m.kind as any)) return null;
        if (!m.text?.trim()) return null;
        return {
          groundId,
          sourceParticipantId: participantId,
          aboutParticipantId,
          checkInId,
          sessionNumber,
          kind: m.kind as WorkMentionKind,
          text: m.text.trim(),
        };
      })
      .filter(Boolean) as any[];

    if (rows.length) await this.prisma.workMention.createMany({ data: rows });
  }

  /**
   * Extract handoffs (dependencies) from this person's own account.
   *
   * SHARED-mode only: handoffs are a board object, and a private alignment
   * ground has no board, so extracting them there would build a structure
   * nothing can render and quietly create cross-party data a private ground
   * promised not to create.
   *
   * Only records a handoff the person named in their OWN account. Matching a
   * named person to a participant is best-effort on first name; an unmatched
   * name is kept as a free-text label rather than dropped, so "waiting on the
   * client's legal team" survives.
   */
  /**
   * THE LINE A COLLEAGUE'S CLEARED WAIT CONFIRMS. See confirmed-by-who-received-it.ts. Reads the
   * colleague's own record lines on this check-in, asks which one says they delivered what was waited
   * for, and marks that one line, once.
   */
  private async confirmWhatArrived(onParticipantId: string, what: string, receivedByParticipantId: string) {
    const lines = await this.prisma.recordEntry.findMany({
      where: { participantId: onParticipantId, disputedAt: null, confirmedAt: null },
      select: { id: true, text: true, confirmedAt: true, disputedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    if (!lines.length) return;
    const answer = await this.anthropic.extract<{ line: number | null }>(
      WHICH_LINE_WAS_DELIVERED_PROMPT,
      [{ role: 'user', content: theDeliveredPrompt(what, lines) }],
      WHICH_LINE_WAS_DELIVERED_SCHEMA,
    );
    const line = theLineToConfirm(lines, answer?.line, what);
    if (!line) return;
    await this.prisma.recordEntry.update({ where: { id: line.id }, data: { confirmedAt: new Date(), confirmedByParticipantId: receivedByParticipantId } });
    /* Ids, not content: see the anchoring-decision log line. */
    this.logger.log(`confirmed-by-who-received-it entry=${line.id} about=${onParticipantId} by=${receivedByParticipantId}`);
    /* The line the colleague confirmed may keep something the person said they would do (week 9). */
    await this.settleByProof(onParticipantId).catch((err: any) =>
      this.logger.warn(`Could not settle by proof for participant ${onParticipantId}: ${err?.message ?? err}`));
  }

  async extractDependencies(checkInId: string, participantId: string, groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { mode: true, scenario: true, organizationId: true, participants: { select: { id: true, email: true, user: { select: { firstName: true, lastName: true } } } } },
    });
    if (!ground) return;
    /**
     * THE MODE CHECK IS GONE, NOT MOVED. It skipped extraction on any non-shared check-in, so a private
     * one silently collected no waiting-on-somebody at all - and now that every check-in has a board,
     * that would mean a board with a dependencies section and nothing ever put in it.
     */
    if (!boardRendersFor(ground.scenario)) return;

    const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } });
    if (turns.length === 0) return;

    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const result = await this.anthropic.extract<{
      dependencies: { what: string; onName?: string | null; onLabel?: string | null; status: string; then?: string | null; triedSaid?: string | null; dueSaid?: string | null; namedTheThing?: boolean }[];
    }>(DEPENDENCY_EXTRACTION_PROMPT, [{ role: 'user', content: transcript }], DEPENDENCY_EXTRACTION_SCHEMA);

    const valid = (result?.dependencies ?? []).filter((d) => d.what?.trim());
    if (valid.length === 0) return;

    const matchParticipant = (name?: string | null): string | null => {
      if (!name?.trim()) return null;
      const needle = name.trim().toLowerCase();
      const hit = ground.participants.find((p) => {
        const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').toLowerCase();
        const first = (p.user?.firstName ?? '').toLowerCase();
        return (
          (!!full && (full === needle || full.includes(needle) || needle.includes(full))) ||
          (!!first && first === needle) ||
          (p.email ?? '').toLowerCase() === needle
        );
      });
      return hit?.id ?? null;
    };

    // The SAME handoff gets described again every session it is still open, so
    // inserting blindly produced 27 rows for about 4 real handoffs ("pricing",
    // "Pricing", "the pricing" all counted separately) and left stale BLOCKING
    // rows forever, because nothing ever updated the original. One row per real
    // handoff, and the newest account decides its status.
    const normalise = (t: string) =>
      t.toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\b(the|a|an|my|our|his|her|their|this|that|some|more|any)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const openForThisPerson = await this.prisma.groundDependency.findMany({
      where: { groundId, fromParticipantId: participantId },
      select: { id: true, what: true, onParticipantId: true, onLabel: true, status: true },
    });

    /*
     * WHAT THEY SAID ABOUT WHEN, ONLY IF THOSE EXACT WORDS ARE IN THE TRANSCRIPT (request 18). The
     * model is asked to copy them; this keeps them only if it did, so a reworded or invented time
     * is dropped and the handoff simply has no time, which is the truth.
     */
    const theirWords = turns.filter((t) => t.role !== TurnRole.AI).map((t) => t.content).join('\n').toLowerCase().replace(/\s+/g, ' ');
    const dueSaidBy = (d: { dueSaid?: string | null }): string | null => {
      const said = (d.dueSaid ?? '').trim().replace(/\s+/g, ' ');
      return said && said.length <= 120 && theirWords.includes(said.toLowerCase()) ? said : null;
    };
    /* The other check-ins this company has running, read once, for the link each handoff may carry. */
    let otherCheckIns: { id: string; organizationId: string; label: string | null }[] | null = null;
    const waitingOnCheckIn = async (d: { onName?: string | null; onLabel?: string | null }, onParticipantId: string | null) => {
      const said = (d.onLabel ?? d.onName ?? '').trim();
      if (!said || onParticipantId || !(ground as any).organizationId) return null;
      otherCheckIns ??= await this.prisma.ground.findMany({
        where: { organizationId: (ground as any).organizationId, closedAt: null, resolvedAt: null },
        select: { id: true, organizationId: true, label: true },
      }).catch(() => []);
      return theCheckInItWaitsOn(said, { id: groundId, organizationId: (ground as any).organizationId }, otherCheckIns ?? []);
    };
    /* Handoffs written or changed in this extraction: only these can change a trace. */
    const touched: string[] = [];

    for (const d of valid) {
      const onParticipantId = matchParticipant(d.onName);
      const status = (['BLOCKING', 'WAITING', 'CLEARED'] as const).includes(d.status as any)
        ? (d.status as DependencyStatus)
        : DependencyStatus.WAITING;
      const onLabel = onParticipantId ? null : (d.onLabel?.trim() || d.onName?.trim() || null);
      /* Nobody waits on themselves: what is their own to do is not a wait (request 111 e). */
      if (aWaitOnOneself({ fromParticipantId: participantId, onParticipantId, onLabel })) continue;
      const key = normalise(d.what);

      // Same person waiting on the same party for roughly the same thing.
      const existing = openForThisPerson.find(
        (e) =>
          e.onParticipantId === onParticipantId &&
          (e.onLabel ?? null) === onLabel &&
          (normalise(e.what) === key ||
            normalise(e.what).includes(key) ||
            key.includes(normalise(e.what))),
      );

      if (existing) {
        // The newest account wins, which is what finally CLEARS a handoff: a
        // person who stops describing something as blocking is no longer blocked
        // on it.
        await this.prisma.groundDependency.update({
          where: { id: existing.id },
          data: {
            status,
            then: d.then?.trim() || undefined,
            /* What they said they did, this time. Undefined leaves what an earlier round heard:
               somebody who chased last week and says nothing this week still chased. */
            triedSaid: d.triedSaid?.trim() || undefined,
            sourceCheckInId: checkInId,
            /* The newest account decides this too: somebody who names the thing this week has
               named it, whatever they said the first time. Undefined leaves what we had. */
            namedTheThing: typeof d.namedTheThing === 'boolean' ? d.namedTheThing : undefined,
            clearedAt: status === DependencyStatus.CLEARED ? new Date() : null,
            /* Their newest words for when, and the newest certain link; left alone where this account says neither. */
            ...(dueSaidBy(d) ? { dueSaid: dueSaidBy(d), dueOn: theDayTheyMeant(dueSaidBy(d), new Date()) } : {}),
            ...((d.onLabel ?? d.onName)?.trim() ? { waitingOnGroundId: await waitingOnCheckIn(d, onParticipantId) } : {}),
          },
        });
        touched.push(existing.id);
        /* The colleague they were waiting on delivered it, in the waiter's own words: that colleague's
           line saying so is confirmed by the person who received it (week 6). */
        if (aWaitThatConfirms({ status, previousStatus: existing.status, fromParticipantId: participantId, onParticipantId: existing.onParticipantId })) {
          await this.confirmWhatArrived(existing.onParticipantId as string, existing.what, participantId).catch((err: any) =>
            this.logger.warn(`Could not read which line of ${existing.onParticipantId} was delivered: ${err?.message ?? err}`));
        }
        continue;
      }

      const created = await this.prisma.groundDependency.create({
        data: {
          groundId,
          fromParticipantId: participantId,
          onParticipantId,
          // Keep the spoken name when it did not match a participant, so an
          // external blocker is still visible instead of silently dropped.
          onLabel,
          what: d.what.trim(),
          then: d.then?.trim() || null,
          /* Their own words for what they have already done about it. Null means they did not say,
             which is what "nothing said yet" on the board honestly means. */
          triedSaid: d.triedSaid?.trim() || null,
          /* Whether they named the thing, or only said they were stuck. Null where the model did
             not answer, which reads as "we do not know" rather than as "they did not". */
          namedTheThing: typeof d.namedTheThing === 'boolean' ? d.namedTheThing : null,
          status,
          sourceCheckInId: checkInId,
          clearedAt: status === DependencyStatus.CLEARED ? new Date() : null,
          /* Their own words for when, word for word, and the day they name if they name one. */
          dueSaid: dueSaidBy(d),
          dueOn: theDayTheyMeant(dueSaidBy(d), new Date()),
          /* The other check-in it waits on, only when that is certain from the names (request 18). */
          waitingOnGroundId: await waitingOnCheckIn(d, onParticipantId),
        },
        select: { id: true, what: true, onParticipantId: true, onLabel: true, status: true, namedTheThing: true },
      });
      touched.push(created.id);
      // So a second mention within the SAME extraction also dedupes.
      openForThisPerson.push(created);

      /*
       * ONLY A HANDOFF WITH SUBSTANCE BECOMES AN ALERT SOMEWHERE ELSE.
       *
       * The same bar the board uses, and reused rather than restated - it excludes the throwaway
       * mention and refuses a handoff somebody has recorded against themselves. Without it the
       * honest way to set off a customer's alerting is to say "still a bit stuck" once, and the
       * person genuinely waiting is indistinguishable from them at the far end of a webhook.
       *
       * Emitting after the row is written, and never inside its transaction: a webhook is a
       * courtesy and must not be able to roll back the record of what somebody said.
       */
      if (blockerHasSubstance({ ...created, fromParticipantId: participantId, createdAt: new Date() })) {
        this.events.emit(GroundworkEvents.BLOCKER_RAISED, {
          blockerId: created.id,
          groundId,
        } as BlockerEvent);
      }
    }

    /* Something new came in, so the trace of any blocker it touches is looked at again. Never on opening. */
    await this.followTheBlockersAcrossCheckIns(touched);
  }

  /**
   * WHERE A BLOCKER STARTED, WRITTEN ONCE WHEN THE RECORD CHANGES (request 18, decision 7).
   *
   * For each handoff just written that waits on another check-in, follow it through the check-ins it
   * passes through and have the steps written. `theInputKey` is what it was written from: the same
   * record again means no second model call. The model is given people as tokens and nothing else,
   * its answer is checked against the record in code (`theTraceTheRecordSupports`), and a trace that
   * fails is not stored. The instructions come from the stored `blocker_trace` version, and its id is
   * recorded on the row. Stored without names; the reports folder swaps them in when it serves.
   */
  async followTheBlockersAcrossCheckIns(touchedIds: string[]): Promise<void> {
    try {
      if (touchedIds.length === 0) return;
      const fields = { id: true, groundId: true, waitingOnGroundId: true, fromParticipantId: true, onParticipantId: true, what: true, then: true, triedSaid: true, dueSaid: true, onLabel: true, createdAt: true, status: true, clearedAt: true } as const;
      const touchedRows = await this.prisma.groundDependency.findMany({ where: { id: { in: touchedIds } }, select: { ...fields, ground: { select: { organizationId: true } } } });
      const goneIds = touchedRows.filter((r) => r.status === DependencyStatus.CLEARED || r.clearedAt || !r.waitingOnGroundId).map((r) => r.id);
      if (goneIds.length) await this.prisma.blockerTrace.deleteMany({ where: { anchorDependencyId: { in: goneIds } } });
      /* And any open handoff elsewhere that waits on a check-in where something just changed: its chain runs through here. */
      const groundsTouched = [...new Set(touchedRows.map((r) => r.groundId))];
      const upstream = await this.prisma.groundDependency.findMany({
        where: { waitingOnGroundId: { in: groundsTouched }, status: { in: [DependencyStatus.WAITING, DependencyStatus.BLOCKING] }, clearedAt: null, id: { notIn: touchedIds } },
        select: { ...fields, ground: { select: { organizationId: true } } },
      });
      const anchors = [...touchedRows.filter((r) => !goneIds.includes(r.id)), ...upstream];
      if (anchors.length === 0) return;

      for (const anchor of anchors) {
        const organizationId = (anchor as any).ground?.organizationId as string;
        const open = await this.prisma.groundDependency.findMany({
          where: { status: { in: [DependencyStatus.WAITING, DependencyStatus.BLOCKING] }, clearedAt: null, ground: { organizationId } },
          select: fields,
        });
        const { handoffs, groundIds } = theChainFrom(anchor as any, open as any);
        const inputKey = theInputKey(handoffs);
        const had = await this.prisma.blockerTrace.findUnique({ where: { anchorDependencyId: anchor.id }, select: { inputKey: true } });
        if (had?.inputKey === inputKey) continue;

        const people = await this.prisma.groundParticipant.findMany({
          where: { groundId: { in: groundIds } },
          select: { id: true, groundId: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
        });
        const { text, tokens } = theRecordForTheModel(handoffs, groundIds);
        const version = await this.prompts.getActive(BLOCKER_TRACE_PROMPT_KEY).catch(() => null);
        const answer = await this.anthropic.extract<TheModelsTrace>(
          version?.content ?? BLOCKER_TRACE_PROMPT, [{ role: 'user', content: text }], BLOCKER_TRACE_SCHEMA,
        );
        const trace = theTraceTheRecordSupports(answer, anchor as any, handoffs, people as any, tokens);
        if (!trace) {
          /* What was true before is not true of this record, and nothing checkable replaces it. */
          await this.prisma.blockerTrace.deleteMany({ where: { anchorDependencyId: anchor.id } });
          continue;
        }
        const data = {
          organizationId, endGroundId: trace.endGroundId, startGroundId: trace.startGroundId,
          steps: trace.steps as any, whereItStarted: trace.whereItStarted, decisionNeeded: trace.decisionNeeded,
          decisionOwnerParticipantId: trace.decisionOwnerParticipantId, inputKey, promptVersionId: version?.id ?? null,
        };
        await this.prisma.blockerTrace.upsert({ where: { anchorDependencyId: anchor.id }, create: { anchorDependencyId: anchor.id, ...data }, update: data });
      }
    } catch (err: any) {
      /* A trace is a courtesy on top of the record; it never fails what somebody just said. */
      this.logger.warn(`Could not follow a blocker across check-ins: ${err?.message ?? err}`);
    }
  }

  /**
   * Build a single-party artifact from this party's own record (B2): a short
   * "your record so far" they can use immediately, independent of the other
   * party. Stored on the participant; superseded by the full report once both
   * parties finish. Owner-scoped - reads only this party's own entries.
   */
  async buildSoloArtifact(participantId: string, groundId: string) {
    const entries = await this.prisma.recordEntry.findMany({
      where: { participantId, participant: { groundId } },
      orderBy: { createdAt: 'asc' },
      select: { type: true, text: true, saidWordForWord: true },
    });
    if (entries.length === 0) return;

    const corpus = entries.map((e) => `(${e.type}) ${e.text}`).join('\n');
    const result = await this.anthropic.extract<{ summary: string; whatToCarry?: string }>(
      SOLO_ARTIFACT_PROMPT,
      [{ role: 'user', content: corpus }],
      SOLO_ARTIFACT_SCHEMA,
    );
    /**
     * THE PRIVATE RECORD SUMMARY IS THE FIRST THING A PERSON READS ABOUT THEIR OWN
     * CHECK-IN, and this returned silently when the model gave nothing back.
     *
     * Since extract() now retries once, a null here means two failed attempts - and
     * the person opens their report to find the summary simply absent, with nothing
     * anywhere recording that it was meant to be there. Same shape as the closing
     * synthesis that failed and said nothing, and as the detection that quietly
     * switched off a whole feature.
     */
    if (!result?.summary) {
      this.logger.warn(
        `No private record summary for participant ${participantId} on ground ${groundId}: the model returned nothing twice. ` +
          `Their report will open without the "what we heard from you" section. Re-running the check-in completion rebuilds it.`,
      );
      return;
    }

    /*
     * AND ITS QUOTES ARE THEIR OWN WORDS FROM THE RECORD, OR ARE NOT QUOTES. The same rule as every
     * report, over the same lines this summary was written from: see a-quote-is-what-they-said. On
     * the run of 26 September two of the seven quotes in these summaries were in nobody's record.
     */
    const theirs = everyQuoteFromTheRecord(
      { summary: result.summary, whatToCarry: aThingToCarry(result.whatToCarry) },
      theLinesAQuoteMayComeFrom(entries),
    );
    if (theirs.unquoted.length || theirs.dropped.length) {
      this.logger.warn(`Private record summary for participant ${participantId}: ${theirs.unquoted.length} quote(s) were not in their record word for word, so they are no longer quotes, and ${theirs.dropped.length} sentence(s) that could not stand without them were taken out.`);
    }

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: {
        soloArtifact: JSON.stringify({ ...theirs.value, summary: openingWithASentence(theirs.value.summary) }),
        soloArtifactAt: new Date(),
      },
    });
  }

  /**
   * "THIS IS NOT WHAT I SAID." THE ONE PRESS THAT MAKES THE EXTRACTION WALL VISIBLE.
   *
   * Nine model extractors write record entries and every engine downstream counts them as record.
   * Nothing compared a row against the words it came from, and the person never saw the row as a
   * row - only their manager did, on the shared report. Correcting added a contradicting row beside
   * the wrong one, and both then counted equally.
   *
   * Owner-scoped: the check-in has to be this person's, and the entry has to be theirs. Nothing is
   * deleted or edited. The row stays, the dispute stays, and from this moment the row counts toward
   * nothing - every read filters `disputedAt: null`.
   */
  async disputeEntry(checkInId: string, entryId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    const entry = await this.prisma.recordEntry.findFirst({
      where: { id: entryId, participantId: checkIn.participantId },
      select: { id: true, disputedAt: true },
    });
    if (!entry) throw new NotFoundException('That line is not on the record');
    if (entry.disputedAt) return { id: entry.id, disputedAt: entry.disputedAt };
    const updated = await this.prisma.recordEntry.update({
      where: { id: entry.id },
      data: { disputedAt: new Date() },
      select: { id: true, disputedAt: true },
    });
    return updated;
  }

  /**
   * THE REPORT THIS SESSION ENDED ON, exactly as it was read.
   *
   * Owner-scoped, and returned untouched: the point of it is sameness. `null` when this session
   * never produced one - sessions that ran before it was kept, and sessions still open.
   */
  async getSessionReport(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    const row = await this.prisma.checkIn.findUnique({
      where: { id: checkIn.id },
      select: {
        sessionReport: true,
        completedAt: true,
        sessionNumber: true,
        groundId: true,
        /* Whether this session was the lead's own, so a page rendering it can label it as the
           card under the transcript labels it rather than guessing. */
        participant: { select: { partyType: true } },
      },
    });
    return {
      report: (row?.sessionReport ?? null) as Record<string, unknown> | null,
      finishedAt: row?.completedAt ?? null,
      sessionNumber: row?.sessionNumber ?? null,
      groundId: row?.groundId ?? null,
      isInitiator: row?.participant?.partyType === 'INITIATOR',
    };
  }

  /** Fetch this party's single-party artifact (B2, owner-scoped). */
  async getSoloArtifact(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    const p = await this.prisma.groundParticipant.findUnique({
      where: { id: checkIn.participantId },
      select: { soloArtifact: true, soloArtifactAt: true },
    });
    if (!p?.soloArtifact) {
      /*
       * NULL, AND WHY.
       *
       * This returned a bare `{ artifact: null }`, so the person who had just spent ten minutes
       * answering and pressed through to their own summary was handed nothing at all — no
       * distinction between "you have not finished yet", "it is being written" and "it failed".
       * Driven and measured: the summary lands about twenty-two seconds after completion, because
       * `buildSoloArtifact` is deliberately fire-and-forget so a model failure cannot stop a
       * check-in completing. Twenty-two silent seconds reads as nothing coming.
       */
      const saying =
        checkIn.status !== CheckInStatus.COMPLETED
          ? 'Your summary is written when you finish this check-in.'
          : 'Your summary is being written from what you said. It takes up to a minute - this page will show it as soon as it is there.';
      return { artifact: null, saying, finished: checkIn.status === CheckInStatus.COMPLETED };
    }
    return { artifact: thePrivateSummaryAsRead<{ summary: string; whatToCarry: string }>(p.soloArtifact), generatedAt: p.soloArtifactAt };
  }

  /**
   * Called immediately after a document is uploaded during an active check-in.
   * Generates a focused AI response acknowledging the document and asking what
   * it confirms. Owner-scoped: reads only this participant's documents.
   */
  /**
   * THE CONTEXT WE HAVE FROM A DOCUMENT NOBODY HAS BEEN TOLD ABOUT YET.
   *
   * Hafsah, 22 September 2026: "once read, the conversation should go into the chat as here is the
   * context we have." The reading happens once, at upload, wherever the file was attached - the chat,
   * the Context tab, an invite link - and lands on the row (see what-a-document-holds). This is the
   * telling, and it happens once: `holdsSaidAt` is stamped as the words go out, the way a note
   * carried into a session is raised once and not in every session after it.
   *
   * Their own documents, and for the person running the check-in anything shared with everybody -
   * which is the same read the prompt itself is given, so the conversation cannot be told about a
   * document it has not been shown.
   */
  /**
   * THE NUMBERS THAT WERE WAITING FOR A NAME TO ARRIVE.
   *
   * A document read before somebody was on the check-in carries their name in `holds.unmatched` and
   * their rows nowhere. Retried against the roster as it now is: what resolves is written against them
   * and said once, and the name comes off the unmatched list so it is not offered again. Only ever the
   * lead's read, because only the lead may set somebody else's number.
   */
  private async whatTheNewPeopleClaim(groundId: string, participantId: string, isLead: boolean): Promise<string | null> {
    if (!isLead) return null;
    const docs = await this.prisma.groundDocument.findMany({
      where: { groundId, NOT: { holds: { equals: null as any } } },
      select: { id: true, fileName: true, holds: true, content: true },
    });
    const waiting = docs.filter((d) => ((d.holds as any)?.unmatched ?? []).length);
    if (!waiting.length) return null;
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        participants: { select: { id: true, email: true, nameGiven: true, roleAsDescribed: true, managingOnly: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
        objectives: { select: { name: true, ownerParticipantId: true } },
      },
    });
    if (!ground) return null;
    const people = ground.participants.filter((p) => !p.managingOnly);
    const out: string[] = [];
    for (const d of waiting) {
      const holds = d.holds as any;
      const stillWaiting: string[] = [];
      const landedFor: { who: string; what: string; target: number; by?: string | null }[] = [];
      /* Their rows are read from the document again rather than kept in the row: what a person's
         numbers are belongs to the document, and duplicating them here would be a second copy to drift. */
      const read = await this.anthropic.extract<WhatADocumentHolds>(
        WHAT_A_DOCUMENT_HOLDS_PROMPT,
        [{ role: 'user', content: `Document: "${d.fileName}"\n\n${(d.content ?? '').slice(0, MOST_OF_A_DOCUMENT_WE_READ)}` }],
        WHAT_A_DOCUMENT_HOLDS_SCHEMA as any,
      ).catch(() => null);
      const rows = (read?.forOnePerson ?? []).filter((r) => r?.personName?.trim() && r?.what?.trim() && Number.isFinite(r.target) && r.target > 0);
      for (const name of holds.unmatched as string[]) {
        const who = whoThisNameIs(name, people as any);
        if (!who) { stillWaiting.push(name); continue; }
        const theirs = rows.filter((r) => r.personName.trim().toLowerCase() === name.trim().toLowerCase());
        const wrote = await this.putOwnedTargetsOnTheRecord(
          groundId,
          theirs.map((r) => ({ participantId: who.id, name: r.what.trim().slice(0, 120), target: Math.round(r.target) })),
          participantId,
        );
        if (!wrote.length) { continue; }
        for (const w of wrote) landedFor.push({ who: theNameWeUseFor(who as any), what: w.name, target: w.target, by: theirs.find((r) => r.what.trim().slice(0, 120) === w.name)?.by ?? null });
      }
      await this.prisma.groundDocument.update({ where: { id: d.id }, data: { holds: { ...holds, unmatched: stillWaiting } as any } }).catch(() => undefined);
      if (landedFor.length) {
        out.push(theContextWeHave({ fileName: d.fileName, whatItIs: null, forOnePerson: landedFor, forEverybody: [], dates: [], unmatched: [] }) ?? '');
        this.logger.log(`Ground ${groundId}: ${landedFor.length} number(s) from ${JSON.stringify(d.fileName)} found their person.`);
      }
    }
    return out.filter(Boolean).join('\n\n') || null;
  }

  private async theContextNotYetSaid(checkIn: { id: string; groundId: string; participantId: string }): Promise<string | null> {
    try {
      const ground = await this.prisma.ground.findUnique({
        where: { id: checkIn.groundId },
        select: { initiatorId: true, participants: { select: { id: true, userId: true } } },
      });
      const me = ground?.participants.find((p) => p.id === checkIn.participantId);
      const isLead = !!me?.userId && ground?.initiatorId === me.userId;
      /*
       * A NAME THAT HAD NOBODY WHEN THE FILE WAS READ, FIRST. The read says "add them and their numbers
       * go on too", and until now nothing kept that promise: the read happens once, at upload, and
       * somebody added afterwards was a name in a list nobody looked at again. Every unmatched name is
       * tried again against the roster as it is now. Before the query below on purpose - it takes names
       * off the unmatched list, and a read announced with a stale list says somebody is missing who is
       * standing right there.
       */
      const nowMatched = await this.whatTheNewPeopleClaim(checkIn.groundId, checkIn.participantId, isLead);
      const docs = await this.prisma.groundDocument.findMany({
        where: {
          groundId: checkIn.groundId,
          holdsSaidAt: null,
          NOT: { holds: { equals: null as any } },
          ...(isLead ? { OR: [{ participantId: checkIn.participantId }, { visibility: 'OPEN' as any }] } : { participantId: checkIn.participantId }),
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, holds: true },
      });
      if (!docs.length) return nowMatched;
      const said = docs.map((d) => theContextWeHave(d.holds as any, { asking: true, reader: { participantId: checkIn.participantId } })).filter(Boolean) as string[];
      await this.prisma.groundDocument.updateMany({ where: { id: { in: docs.map((d) => d.id) } }, data: { holdsSaidAt: new Date() } });
      return [nowMatched, ...said].filter(Boolean).join('\n\n') || null;
    } catch (err: any) {
      this.logger.warn(`Could not say what a document holds on ${checkIn.id}: ${err?.message}`);
      return null;
    }
  }

  async documentReceived(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedOpenCheckIn(checkInId, requestingUserId);

    const doc = await this.prisma.groundDocument.findFirst({
      where: { groundId: checkIn.groundId, participantId: checkIn.participantId },
      orderBy: { createdAt: 'desc' },
    });

    const systemPrompt =
      'You are Groundwork. A supporting document has just been attached to this check-in session. Acknowledge it by name in one sentence. Then ask one question: what does this document confirm about what you have described? Wait for their answer before asking about complications. Warm, direct, brief. Do not summarise the document. Do not make a judgement. Do not list questions.';

    const docContext = doc
      ? `[Document attached: "${doc.fileName}"]\n${doc.content.slice(0, 1000)}`
      : '[A document was attached but could not be read.]';

    const reply = await this.anthropic.respond(systemPrompt, [{ role: 'user', content: docContext }]);

    /*
     * AND IF IT IS A SHEET OF TARGETS, THE TARGETS GO ON THE RECORD NOW. See
     * a-sheet-of-targets-is-read: a lead who attaches the numbers instead of typing them has given
     * them to us. The product's own sentence naming what it took goes under the acknowledgement, and
     * it ends by asking whether that is right - nothing here treats a read as settled.
     */
    const fromTheSheet = await this.theContextNotYetSaid(checkIn);

    const said = fromTheSheet ? `${reply}\n\n${fromTheSheet}` : reply;
    await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.AI, content: said, askedFor: doc ? `${DESCRIBES_DOCUMENT}${doc.id}` : stampWhatItAskedFor(said) },
    });

    return { reply: said };
  }

  /**
   * Decline to take part (B8). Penalty-free - marks this party's check-in
   * DECLINED. The record reflects that the process was offered and declined;
   * this is shown to the admin as a neutral status, never a negative signal.
   */
  async decline(checkInId: string, requestingUserId: string) {
    /** The already-complete and already-declined refusals both live in the loader now. */
    const checkIn = await this.loadOwnedOpenCheckIn(checkInId, requestingUserId);
    /*
     * WHAT THEY ALREADY SAID IS THEIRS. The loader permits IN_PROGRESS, so somebody can decline
     * partway through - and this wrote DECLINED and nothing else, losing every turn they had given
     * from their private record. The extraction complete() runs is run here first, best-effort, so
     * their own words reach their own record before the session closes. And the reason is written,
     * so a reader can tell a decline from a close.
     */
    if (checkIn.status === CheckInStatus.IN_PROGRESS) {
      await this.extractRecordEntries(checkIn.id, checkIn.participantId).catch((err) =>
        this.logger.warn(`Record extraction before a decline failed for check-in ${checkIn.id}: ${err.message}`),
      );
    }
    await this.prisma.checkIn.update({
      where: { id: checkIn.id },
      data: { status: CheckInStatus.DECLINED, closedReason: DECLINED_TO_TAKE_PART },
    });
    await this.closeTheRoundIfThisWasTheLastAnswer(checkIn.groundId, checkIn.sessionNumber);
    return { status: 'declined' };
  }

  /**
   * A DECLINE IS AN ANSWER, SO IT CAN BE THE ONE THE ROUND WAS WAITING ON.
   *
   * Every reader was taught that a decline counts as an answer. The decline itself was not: it
   * wrote DECLINED and returned, recording no round and emitting nothing. So when the last
   * outstanding person declined, the round was closed in fact and open in the record, and the
   * report - already written, already waiting - sat there until the 3am backstop found it. Up to a
   * day late, for the one person who acted.
   *
   * This is the backstop's own logic, run at the moment it becomes true instead of overnight, and
   * guarded the same way: the round row first, then release only if no report has been taken for
   * this round. `recordRoundCompletion` returns false when the round is not closed, when it was
   * already recorded, or when nobody completed - so a round of nothing but declines correctly
   * produces no report, because there is no account to build one from.
   *
   * It rides the same event as the backstop, with the same `source: 'repair'`, which already means
   * "a round closed without its report" everywhere that listens. That keeps the admin's "X has
   * checked in" notice suppressed, which is right: nobody checked in.
   */
  private async closeTheRoundIfThisWasTheLastAnswer(groundId: string, sessionNumber: number): Promise<void> {
    const roundJustClosed = await recordRoundCompletion(this.prisma, this.events, groundId, sessionNumber);
    if (!roundJustClosed) return;

    const taken = await this.prisma.reportRound.findUnique({
      where: { groundId_sessionNumber: { groundId, sessionNumber } },
      select: { id: true },
    });
    if (taken) return;

    /* Somebody has to have given an account for there to be a report. */
    const anAccount = await this.prisma.checkIn.findFirst({
      where: { groundId, sessionNumber, status: CheckInStatus.COMPLETED },
      select: { id: true, participantId: true },
    });
    if (!anAccount) return;

    this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {
      checkInId: anAccount.id,
      groundId,
      participantId: anAccount.participantId,
      sessionNumber,
      source: 'repair',
    } satisfies CheckInCompletedEvent);
  }

  // --- helpers ---

  /**
   * Whether any OTHER party on this ground has completed a check-in - gates the
   * degree-two cross-reference. Reads only completion metadata, never content.
   */
  private async hasOtherPartyCheckedIn(groundId: string, participantId: string): Promise<boolean> {
    const count = await this.prisma.checkIn.count({
      where: { groundId, participantId: { not: participantId }, status: CheckInStatus.COMPLETED },
    });
    return count > 0;
  }

  private async buildGroundState(groundId: string, otherPartyCheckedIn: boolean): Promise<string> {
    /* PEOPLE, NOT CHECK-INS. This counted every completed check-in, so from the second round on it
       said more had answered than there are people, and the model read it out: "Since then, 5 of
       the 4 people involved in this check-in have submitted" (week 3 re-runs, 28 Sep 2026). */
    const submittedCount = new Set(
      ((await this.prisma.checkIn.findMany({
        where: { groundId, status: CheckInStatus.COMPLETED },
        select: { participantId: true },
      })) ?? []).map((c: any) => c.participantId),
    ).size;
    const totalCount = await this.prisma.groundParticipant.count({ where: { groundId } });
    const parts: string[] = [];
    if (otherPartyCheckedIn) {
      parts.push(`${submittedCount} of ${totalCount} parties have submitted their accounts.`);
    } else {
      parts.push(`${submittedCount} of ${totalCount} parties have submitted so far. The other party has not yet submitted.`);
    }
    return parts.join(' ');
  }

  /**
   * Create a clarification check-in for a participant to correct a specific inference.
   * Returns the new check-in id which the client opens immediately.
   */
  async startClarificationSession(requestingUserId: string, groundId: string, inferenceId: string): Promise<{ checkInId: string }> {
    // Verify the inference exists on this ground's report
    const report = await this.prisma.report.findUnique({ where: { groundId }, select: { inferences: true } });
    if (!report) throw new NotFoundException('Report not found for this check-in');
    const inferenceList = (report.inferences ?? []) as Array<{ id: string; text: string; participantLabel: string; reason: string }>;
    const inference = inferenceList.find(i => i.id === inferenceId);
    if (!inference) throw new NotFoundException('Inference not found');

    // Find the participant record for this user on this ground
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    if (!participant) throw new ForbiddenException('You are not a participant on this check-in');

    // Find the next available session number for this participant
    const lastCheckIn = await this.prisma.checkIn.findFirst({
      where: { participantId: participant.id },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });
    const nextSession = (lastCheckIn?.sessionNumber ?? 0) + 1;

    const checkIn = await this.createSessionOnce({
      groundId,
      participantId: participant.id,
      sessionNumber: nextSession,
      status: CheckInStatus.NOT_STARTED,
      isClarification: true,
      clarificationTarget: inferenceId,
    });

    return { checkInId: checkIn.id };
  }

  /**
   * Create a self-correction check-in so a participant can go back and correct
   * or add to what they said in a specific PAST session of their OWN record
   * (not the shared report - that's startClarificationSession above). The AI
   * probes for the correction using the standard conversation prompts, rather
   * than the participant typing a free-text edit directly.
   */
  /**
   * HOW LONG A RELEASED REPORT STAYS CORRECTABLE, read from the platform setting.
   *
   * Never throws, and a bad row means the number we shipped with. Zero from a DELIBERATE row is
   * honoured - "final the moment it is shared" is a real policy - but zero from a broken row would
   * silently make every released report uncorrectable, so the guard is on the row's shape rather
   * than on the value alone.
   */
  private async correctionWindowDays(): Promise<number> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key: CORRECTION_WINDOW_KEY } });
      if (isAWindow(row?.value)) return row!.value as number;
    } catch (err: any) {
      this.logger.warn(`Could not read the correction window, using the default: ${err?.message}`);
    }
    return DEFAULT_CORRECTION_WINDOW_DAYS;
  }

  async startSelfCorrectionSession(requestingUserId: string, groundId: string, targetSessionNumber: number): Promise<{ checkInId: string }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    if (!participant) throw new ForbiddenException('You are not a participant on this check-in');

    const targetCheckIn = await this.prisma.checkIn.findUnique({
      where: { participantId_sessionNumber: { participantId: participant.id, sessionNumber: targetSessionNumber } },
    });
    if (!targetCheckIn || targetCheckIn.status !== CheckInStatus.COMPLETED) {
      throw new NotFoundException('That session is not a completed check-in on this check-in');
    }

    // LOCKING: a session can be corrected only until the next one opens. If any
    // later session has already started (or completed), it is already building
    // on this one - correcting the source now would leave the sessions that
    // followed inconsistent with it. Lock it.
    const laterStarted = await this.prisma.checkIn.findFirst({
      where: {
        participantId: participant.id,
        sessionNumber: { gt: targetSessionNumber },
        status: { in: [CheckInStatus.IN_PROGRESS, CheckInStatus.COMPLETED] },
      },
      select: { sessionNumber: true },
    });
    if (laterStarted) {
      throw new BadRequestException(
        `Session ${targetSessionNumber} can no longer be corrected - a later session has already started and is building on it.`,
      );
    }

    /*
     * AND THE REPORT ITSELF. The lock above is about SESSIONS building on each other; it says
     * nothing about the report having gone out. So a round could close, the report reach
     * everybody, and the account it was built from still be edited - which is the one case where
     * a correction stops being a correction and becomes a rewrite of something people have read.
     *
     * See the-window-for-correcting-a-record.ts for why this is a window and not a lock.
     */
    const releasedReport = await this.prisma.report.findUnique({
      where: { groundId },
      select: { releasedAt: true },
    });
    refuseIfTheWindowHasClosed({
      releasedAt: releasedReport?.releasedAt ?? null,
      windowDays: await this.correctionWindowDays(),
    });

    const lastCheckIn = await this.prisma.checkIn.findFirst({
      where: { participantId: participant.id },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });
    const nextSession = (lastCheckIn?.sessionNumber ?? 0) + 1;

    // Not a block - a signed-off participant may still genuinely need to fix
    // something - but the shared report needs to know this correction landed
    // after they already confirmed their account was accurate, so it can be
    // surfaced as a flagged update rather than silently blended in.
    const checkIn = await this.createSessionOnce({
      groundId,
      participantId: participant.id,
      sessionNumber: nextSession,
      status: CheckInStatus.NOT_STARTED,
      isSelfCorrection: true,
      selfCorrectionTargetSession: targetSessionNumber,
      isPostSignOff: !!participant.signedOffAt,
    });

    return { checkInId: checkIn.id };
  }

  /** Loads a check-in only if the requesting user owns the participant side. */
  /**
   * EVERY TURN THIS PERSON HAS SAID IN ONE GROUND, IN ORDER.
   *
   * The ground opens to its own history as a conversation - sessions in sequence
   * with dividers, the way a channel reads. Built one way it is twelve requests
   * on load, one per check-in, because `getTranscript` is per check-in and there
   * was nothing else. This is the first thing a person sees when they open a
   * ground, so it is one request.
   *
   * OWNERSHIP IS THE WHOLE POINT AND IT IS DONE BY THE QUERY. The participant row
   * is found from `userId`, and turns are then read by `participantId`, so there
   * is no path through this function that returns somebody else's words - not a
   * filter applied afterwards that a later edit could drop. A channel-shaped view
   * is exactly where a person would expect to see other people talking, and here
   * they never will.
   */
  /**
   * WHAT EACH ACCOUNT SHOWS, FOR THE LEAD. See what-an-account-shows.ts for the decision and the
   * three rules. Lead only, as the raw route it replaces was. Completed sessions only: an account
   * still being given is not one to read yet, and reading half of it would mislead.
   */
  async whatTheAccountsShow(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, initiatorId: requestingUserId },
      select: {
        id: true, label: true, scenario: true, brief: true,
        objectives: { select: { name: true, target: true, ownerParticipantId: true, isADecisionAboutAPerson: true }, orderBy: { sortOrder: 'asc' } },
        participants: {
          select: {
            id: true, email: true, partyType: true, roleAsDescribed: true,
            checkIns: {
              where: { status: CheckInStatus.COMPLETED },
              orderBy: { sessionNumber: 'asc' },
              select: { id: true, sessionNumber: true, completedAt: true },
            },
          },
        },
      },
    });
    if (!ground) throw new ForbiddenException('Only the lead of this check-in can read what the accounts show');

    const asks: WhatItAsks = { label: ground.label, scenario: ground.scenario as any, brief: ground.brief, objectives: ground.objectives };

    const participants = await Promise.all(
      ground.participants.map(async (p) => {
        const sessions = await Promise.all(
          p.checkIns.map(async (ci) => {
            const read = await this.readOfOneAccount(ci.id, ground.id, p.id, asks, p.partyType, p.roleAsDescribed);
            return { checkInId: ci.id, sessionNumber: ci.sessionNumber, completedAt: ci.completedAt, ...read, derived: true as const };
          }),
        );
        return { participantId: p.id, email: p.email, partyType: p.partyType, sessions };
      }),
    );

    return { groundId: ground.id, groundLabel: ground.label, whatItAsks: asks, meaning: A_READ_IS_DERIVED, participants };
  }

  /** Made once per account and kept; screened at the read every time, cached or not. */
  private async readOfOneAccount(
    checkInId: string, groundId: string, participantId: string, asks: WhatItAsks, partyType: string, roleAsDescribed: string | null,
  ): Promise<{ shows: string | null; withheld: number }> {
    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId, role: TurnRole.PERSON },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });
    const theirs = turns.map((t) => t.content ?? '').filter((t) => t.trim());
    if (theirs.length === 0) return { shows: null, withheld: 0 };
    const sourceHash = sourceHashOf(theirs);

    const kept = await this.prisma.whatAnAccountShows
      .findUnique({ where: { checkInId_sourceHash: { checkInId, sourceHash } }, select: { text: true } })
      .catch(() => null);
    const raw = kept?.text ?? (await this.anthropic.respond(theInstruction(asks, partyType, roleAsDescribed), [
      { role: 'user', content: theirs.join('\n\n') },
    ]));

    /* The screen runs on what is returned, kept or fresh: a line that would be withheld is withheld the same way. */
    const screened = withoutTheirWords(forHumans(raw), theirs);
    if (!kept && raw?.trim()) {
      await this.prisma.whatAnAccountShows
        .upsert({
          where: { checkInId_sourceHash: { checkInId, sourceHash } },
          create: { checkInId, groundId, participantId, sourceHash, text: raw, withheld: screened.withheld },
          update: {},
        })
        .catch(() => undefined);
    }
    return { shows: screened.text || null, withheld: screened.withheld };
  }

  async getMyGroundTranscript(groundId: string, requestingUserId: string) {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this check-in');

    const checkIns = await this.prisma.checkIn.findMany({
      where: { participantId: participant.id },
      orderBy: { sessionNumber: 'asc' },
      select: {
        id: true,
        sessionNumber: true,
        status: true,
        completedAt: true,
        createdAt: true,
        isSelfCorrection: true,
        selfCorrectionTargetSession: true,
        turns: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    return {
      sessions: checkIns.map((c) => ({
        checkInId: c.id,
        sessionNumber: c.sessionNumber,
        status: c.status,
        // The date the divider shows. A session spans days, so the date it was
        // finished is the one that places it; an unfinished one is placed by when
        // it opened, which is the only date it has.
        date: (c.completedAt ?? c.createdAt).toISOString(),
        isSelfCorrection: c.isSelfCorrection,
        correctionOf: c.selfCorrectionTargetSession,
        /* Cleaned on the way out, same as `open` above: a turn stored before a rule existed keeps
           whatever it was saved with, and what is shown should follow today's rules even where the
           row cannot. The AI's turns only - a person's words are theirs. */
        turns: c.turns.map((t) => ({ id: t.id, role: t.role, content: t.role === TurnRole.AI ? forHumans(t.content) : t.content })),
      })),
    };
  }

  /**
   * A SESSION THE PERSON HAS ALREADY ANSWERED IS CLOSED TO FURTHER WRITING.
   *
   * Her decision on declining: "No, it is final for that session." That has to be enforced at the
   * write paths, not just in the button, or a declined session could be reopened and typed into -
   * and the round it belongs to has already been allowed to complete on the strength of the decline.
   *
   * WHY A SECOND LOADER RATHER THAN A CHECK IN NINE PLACES. `loadOwnedCheckIn` has nine callers and
   * three of them are READS - transcript, download and the person's own solo artifact. Somebody must
   * still be able to read their own record of a session they declined; refusing that would be a new
   * wall in the name of a rule about writing. So the loader's NAME carries the distinction, and a
   * future write path gets the rule by picking the right one rather than by remembering it.
   */
  private async loadOwnedOpenCheckIn(checkInId: string, who: WhoIsAsking) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, who);
    /* NEW PARTICIPATION STOPS FOR SOMEBODY HELD FOR A SEAT (decision 110, B3): no new session, and no answer to one. What they have already said and their own report stay theirs to read, through the readers above. */
    if ((checkIn as any).participant?.awaitingSeat === true) throw new ForbiddenException(HELD_FOR_A_SEAT);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
    }
    if (checkIn.status === CheckInStatus.DECLINED) {
      throw new BadRequestException('You declined this session, and that is recorded. The next one is yours to take part in.');
    }
    return checkIn;
  }

  private async loadOwnedCheckIn(checkInId: string, who: WhoIsAsking) {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      /**
       * The participant's own account comes back with them, for the door check below. One query
       * rather than two: the flag is a boolean on a row this query is already joining to, and the
       * alternative was a second findUnique on every message anybody sends.
       */
      include: { participant: { include: { user: { select: { awaitingOrgApproval: true, firstName: true, lastName: true } } } } },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');
    /*
     * TWO WAYS TO BE THE PERSON WHOSE CHECK-IN THIS IS, AND THE SECOND ONE IS NOT A WEAKENING.
     *
     * Signed in, it is their user id. Through the open link - the QR code a lead shares, where
     * somebody answers before they have given any name at all - there is no user yet, so it is the
     * participant row itself, resolved from the secret they hold before this is called. Either way
     * the test names exactly one row, and passing the wrong one gets nothing. See the-open-link.
     */
    const itIsTheirs = typeof who === 'string'
      ? checkIn.participant.userId === who
      : checkIn.participantId === who.theParticipant;
    if (!itIsTheirs) {
      // Never let one party read another party's conversation.
      throw new ForbiddenException('This check-in does not belong to you');
    }
    /**
     * AND NOT YET, IF THEY ARE STILL WAITING TO BE LET INTO THE ORGANISATION.
     *
     * HERE rather than on `open`, because five call sites share this loader - open, send a message,
     * complete, attach a document, correct a record - and a gate that covers one of them is a gate
     * somebody walks around by pressing the next button. Driven: answering without opening returns
     * 403 only because the check is at this level.
     *
     * See participants/nobody-joins-your-company-by-being-invited-to-a-check-in.ts.
     */
    if (checkIn.participant.user?.awaitingOrgApproval) {
      throw new ForbiddenException(CANNOT_CHECK_IN_YET);
    }
    return checkIn;
  }
}
