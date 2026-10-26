import { theSituationBoard, theRelease8SituationsIsOn } from './release-8-situations';
import { whereTheTimeWent } from './the-switchboards-own-sections';
import { theRelease4TeamsIsOn, theUnitOfATarget } from './release-4-teams';
import { theProjectBoard, theRelease5ProjectsIsOn, isAProject, aMilestoneAcceptedIsAnInvoiceToRaise } from './release-5-projects';
import { eachPersonsOwnBesideTheTeams, whyTheNumbersDoNotMatch } from './the-team-and-each-persons-figures';
import { theTemplate } from './the-thirteen-templates';
import { inAboutEightWords } from './what-happens-next-to-a-record';
import { theDirectMorningFor, asServedOnTheBoard } from '../engagement/the-direct-morning';
import { yourTeamPersonByPerson, theLeadActsOnAPerson, type AnActionAsked } from './your-team-person-by-person';
import { theNudgesOnTheBoard } from '../engagement/the-leads-own-nudge';
import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';
import { theRelease1bTabsAreOn } from '../grounds/release-1b-tabs';
import { aLineThatSaysItHappened } from './somebody-said-it-happened';
import { withoutTheLeadsSetUpForAMember } from '../grounds/the-leads-set-up-is-the-leads-in-the-anchor';
import { owesThisSession } from '../grounds/the-lead-checks-in-when-they-choose';
import { whoHasMissedCheckIns, whatTheLeadReads, theNextStepSuggested, TOLD_THE_LEAD, whoMissedTheCheckInsJustBefore } from '../grounds/missed-check-ins';
import { SOMEONE as SOMEONE_NAMED } from '../engagement/a-name-to-call-them';
import { theConfirmedWaits } from '../grounds/a-wait-is-the-speakers-account';
import { wholeDaysTo, theDayItBegan, theRecordsClock } from './a-wait-is-dated-not-counted';
import { aFindingThatDoesNotSayTheWaitAgain } from './where-each-person-is-against-their-number';
import { eachRepeatedSentenceSaidOnce } from './each-repeated-sentence-said-once';
import { isAWholeSentence } from '../reports/what-people-said-differently-about';
import { theGlanceInASentence } from './the-glance-in-a-sentence';
import { aPartyOutside, aWaitOnOneself, theWaitsAsABoardReadsThem } from './a-thing-is-not-somebody';
import { theClaimOn, theClaimQuestion, afterTheLeadsAnswer, whatIsNotADetail, theAnswerSaidBack } from './a-claim-on-a-record-is-checked-first';
import { whoSeesThisDifferently } from './who-sees-this-differently';
import { holdsTheClock, theRoundCappedAtThePlan, whatEachSessionSays } from './one-count-for-the-sessions';
import { aWaitSaidInFull } from './a-wait-said-in-full';
import { howOftenItWasRaised } from './how-often-it-was-raised';
import { theBlockers } from './the-blockers';
import { aParticipantsOwnBoard, withoutOtherPeoplesDeals } from './a-participants-board-is-their-own';
import { theBoardForThisKind } from './each-kind-gets-its-own-board';
import { theGlanceAsThisReaderMayReadIt } from '../grounds/what-a-manager-needs-at-a-glance';
import { theNextStepTheyGave, howARecordIsKnown, theRecordsMark, whatHappensNext } from './what-happens-next-to-a-record';
import { whereThisTargetStands, theHeadlineQuestion, theDirectionToReadIn, type ATeamAim } from './the-headline-and-where-each-target-stands';
import { whereThisIsHeading } from './where-this-is-heading';
import { whoTheEndingIsAbout } from '../resolution/who-the-ending-is-about';
import { readWhatMayBeRelevant, whatWasSaidNotRelevant, NOT_RELEVANT_KEY, type SomethingThatMayBeRelevant } from './what-may-be-relevant';
import { mayReadWhatIsKept } from '../knowledge/organisation-memory';
import { theMonthEndedOn } from './the-anchor-month-end-event';
import { deadlineOf } from '../grounds/when-the-clock-starts';
import { theWorkByArea, reportedAgainstTheRules } from './the-work-by-area-and-by-stage';
import { theBoardAtAGlance } from './the-board-at-a-glance';
import { toCloseTheGap } from './to-close-the-gap';
import { theValueOf, theContactHistory, theirReadInTheirWords, NO_VALUE_SAID, WHAT_CONTACT_HISTORY_IS } from './a-deal-row-from-its-record';
import { helpNobodyMentioned } from './help-nobody-mentioned';
import { theOpenIssues, sharesTheWords, ISSUE_STEPS, type AnOpenIssue, type WhatTheIssuesAreReadFrom } from './the-open-issues';

/** Said where the prototype has "Open issues" (request 115 c): what the record would need to hold. */
export const NO_OPEN_ISSUES_ON_RECORD = 'Groundwork does not follow an issue from the day it is raised to the day it is decided and done, so there is no list of open issues here. Where people see something differently, and the questions written down to decide on the Context page, are under what needs you.';
import { theShareSays, YOU_HAVE_NO_SHARE_YET } from './your-share';
import { theirOwnAimsKeptOnlyAsPromises, AN_AIM_FROM_THEIR_PROMISE } from './an-aim-kept-only-as-their-promise';
import { eachDealInItsGroup } from './each-deal-in-its-group';
import { aPromiseSomebodyElseMade } from '../conversation/a-promise-somebody-else-made';
import { thePriceRangeAnswer, thePriceRangeDecision, THE_RANGE_QUESTION, type ARangeAnswer } from './a-deals-four-criteria';
import { theDealWasDropped, theLostDeal } from './a-deal-that-was-dropped';
import { theStartOfATargetFromTheDeals } from './where-a-target-from-the-deals-started';
import { theDealsThePromisesAreAbout } from './the-deal-a-promise-is-about';
import { notABlockerTheyRaised } from './not-a-blocker-they-raised';
import { theWordsNameTheDeal, theDepositFor, aDepositSaid, theBackingDocuments, theDocumentBehind, thePaymentRecords, theSignedOrders, aPaymentRecordFor, theMPesaCodeFor, withTheSaleEachCodeAnswered, theTurnsBehindTheCodes, theSaleAsItsPaymentShowsIt, type ABackingDocument } from './a-deals-proof-is-about-that-deal';
import { withTheValueWorkedOut, withOnlyTheNumbersSaid, theBuyingDateOf, theBuyingDateTheySaid, BUYING_DATE, aLineIsAbout } from './a-deals-value-and-buying-date';
import { theirLine, theirCheckInToday, HAS_NOT_CHECKED_IN_TODAY, CHECKED_IN_TODAY } from './each-persons-line-today';
import { withoutADealsFigure } from './a-deals-units-are-not-a-target';
import { KEEP_THE_TEAM_ON_TRACK, CONNECT_GOALS_ACROSS, A_NUMBER_MADE_OF_ITS_CUSTOMERS } from '../conversation/what-a-check-in-owes';
import { eachTargetOnce, theDifferencesThatAreOnlyATargetSaidAgain } from './a-target-said-again-is-that-target';
import { theCorrectionsOnTheCheckIn, withWhatACorrectionSettled, whoIsBehindALabel } from '../reports/a-correction-is-their-latest-word';
import { notAnsweringSince, theContactOf, theNamesOnOurSide, thePeopleAtEachCustomer, workingDaysSince } from './a-deal-that-has-stalled';
import { aRoundCanBeChecked } from './a-round-backed-by-a-document-can-be-checked';
import { proofNamesTheDeal, aLineNamesTheCustomer, theSameCustomer } from './one-deal-per-customer';
import { isTheTeamPictureNowShared } from '../reports/each-sessions-picture-is-released-on-its-own';
import { withoutItsOwnSpeaker } from './a-view-does-not-start-with-its-speaker';
import { everyActionHasALabel, whatToDoAboutALeadAction, whatToDoAboutADecision, isAYesOrNoQuestion, theAnswerAsALine, aWaitTheLeadCanAnswer, whatToDoAboutAWaitTheLeadCanAnswer, theDealsAtTheStallRule } from './what-needs-you-and-what-to-do';
import { theOwedThingAskedPlainly } from '../conversation/each-owed-thing-asked-plainly';
import { howManyGoalsAreNotTold, notToldYet, withoutGoalsNotToldIn, theConversationPointForTheLead, aGoalTheLeadSetAndHasNotTold } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { whoAnAdminDidNotLetIn, isNotLetInYet, whoIsNotLetInYet, theWaitingToBeLetInLine } from '../grounds/who-an-admin-did-not-let-in';
import { theSharedReadWithoutTheLeadsJudgement } from './what-the-room-says-is-not-a-reading-of-the-lead';
import { areaOfGoalOrFallback } from '../grounds/the-area-of-a-goal-is-worded-once';
import { withoutWhatTheLeadHasNotToldThemAbout, theWordsOfWhatTheLeadHasNotToldThemAbout, whatThePersonReadsOfTheirOwnUntoldGoals, theyRunThisCheckIn } from './an-untold-goal-is-not-a-board-objective';
import { whatEachLabelIsCalled, withoutInternalLabelsIn } from '../reports/no-internal-label-reaches-anyone';
import { contributionAsThisReaderMayRead } from './a-rating-goes-only-to-the-person';
import { contributionWithoutTheLeadsAdvice, coverageWithoutTheLeadsAdvice } from './the-leads-advice-stays-with-the-lead';
import { coverageAsThisReaderMayRead, withNoRatingNumber } from './no-rating-is-served';
import { theBoardKindsOffered, theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { theAnchorBoardParts } from './the-anchor-board-parts';
import { aShortTagForTheWork } from './a-short-tag-for-the-work';
import { oneOfTheKinds, isASalesKind, plainFields, theSameName, theRecordSections, itemKindsFor, stagesFor, RECORDS_FOR_EACH_KIND, KINDS_THAT_ARE_NOT_WORK, type AServedRecord, type KindOfWork } from './the-kind-of-work';

/** What the lead sends to add or change a record of the kind of work. */
export interface WorkItemInput {
  kind?: string;
  name?: string;
  stage?: string | null;
  ownerParticipantId?: string | null;
  due?: string | null;
  fields?: Record<string, string>;
}
import { targetsHiddenFrom, withoutHiddenTargets, withoutHiddenTargetsIn } from './a-hidden-target-stays-hidden';
import { namesThisReaderMayNotOpen, withoutPrivateFileNamesIn } from '../documents/a-private-file-is-not-named';
import { THEIR_OWN_WORDS_ON_THE_BOARD, withTheirOwnWordsKept, withoutLinesWithNoWords } from './their-own-words-stay';
import { canSeeDocument } from '../documents/who-can-see-a-document';
import { anAimIsOwedHere } from '../entry/a-check-in-with-no-aim-has-nothing-to-read-against';
import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { whoNeedsYou, Need } from '../detectors/who-needs-you-this-week';
import { PrismaService } from '../prisma/prisma.service';
import { howACheckInIsGoing } from '../grounds/how-a-check-in-is-going';
import { CheckInStatus, DependencyStatus, GroundMode, PartyType } from '@prisma/client';
import { onlyWhatThisReaderMaySee, onlyHandoffsTheyAreIn, WHY_YOU_ONLY_SEE_YOURSELF, WHY_YOU_ONLY_SEE_YOURSELF_AND_YOUR_LEAD } from './the-board-keeps-the-same-wall';
import {
  BoardFamily,
  BoardSection,
  boardRendersFor,
  boardHasSection,
  familyFor,
  pickBoardSafeReportFields,
  sectionsFor,
  sectionsForARunOf,
} from './board-families';
import { totalSessionsFor } from '../grounds/session-count';
import { labelsForParties, namesVisibleTo, readsWithNamesOf, eachSideGetsSomebody, plainWordsByPerson, atTheStart, withNames } from '../reports/party-labels';
import { anAimAsASentence, yourOwnWhereYouAreTheSubject, anAimTheHolderSet, aPromiseNotAnAim } from './an-aim-is-a-sentence-about-somebody';
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
import { periodsTheRecordHolds, aTruePeriodCount } from '../patterns/period-of';
import { AnthropicService } from '../conversation/anthropic.service';
import { GroundsService } from '../grounds/grounds.service';
import { theSessionReport } from '../reports/the-session-report';
import { isThisACascade } from './is-this-a-cascade';
import { theJourneySoFar } from './a-measure-that-goes-down-is-still-going-well';
import { asADirection, whatTheWordsSuggest, theQuestionAboutWhichWay, theDayItIsDue, THE_KINDS_NAME, type TargetDirection } from './an-aim-or-a-limit';
import { aDateOnly, theDayInWords } from './the-day-in-words';

/** Whether a date-only day has passed on this clock, read in Lagos as every board date is. */
function aDeadlineHasPassed(dueOn: Date | string | null | undefined, now: Date): boolean {
  const d = aDateOnly(dueOn);
  if (!d) return false;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return d.toISOString().slice(0, 10) < today;
}
import { onlyWhoIsActuallyOutside, WHY_THIS_IS_HERE } from './somebody-carrying-work-with-no-account';
import { draftTheQuestion } from '../reports/the-picture-is-drafted-from-the-reads';
import { whyNothingIsCrossReferenced } from './why-nothing-is-cross-referenced';
import { whatIsNotSettledAbout } from '../grounds/a-target-nobody-has-defined';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { theyOweAnAccountFirst, BECAUSE_YOURS_WOULD_BE_AN_ANSWER } from './a-board-is-not-read-before-you-answer';
import { whatThisDocumentIs } from '../documents/what-kind-of-thing-a-document-is';
import { wordedByTheModel, type Drafted } from '../reports/the-engine-drafts-it-the-model-words-it';
import { rememberedCompose } from '../reports/a-line-worded-once-is-kept';
import { wordPatternEvidence } from '../reports/pattern-evidence-in-plain-words';
import { OneAtATime } from '../reports/one-warm-up-at-a-time';
import { ReadInput, buildContribution, buildCoverage, dedupeDependencies } from './reads';
import { oneBlockerPerThingWaitedOn } from './a-blocker-with-nothing-in-it-is-the-same-blocker';
import {
  OrgDependency,
  whatThePlaceIsWaitingOn,
  whoIsBeingWaitedOn,
} from './what-the-whole-place-is-waiting-on';
import { PATTERNS_ARE_SERVED } from '../patterns/patterns-are-served';
import { servedPatterns, PATTERN_ROW_SELECT, whoIsWhoIn, theOnesTheyAreSeeingFirst, markShownToThePerson, runsItForAPattern, readsHowTheLeadingIsLanding } from '../patterns/who-reads-a-pattern';
import { overTimeAsServed, meetingsOnRecordFor, inOurVoice, looksLikeATimeOrADate } from '../reports/what-the-record-shows-over-time';
import { everyStoredSentenceReadsRight } from '../reports/a-stored-sentence-reads-right';
import { aBoardWithNoEmptyLine } from './a-board-has-no-empty-line';
import { withTheEarlierRead } from '../patterns/stored-pattern-lines-through-the-wall';
import { patternQuestionsToSettleFirst } from './pattern-questions-to-settle-first';
import { everyDivergenceReadable } from '../reports/a-field-name-is-not-a-heading';
import { forbiddenNames, namesAnyone, ForbiddenName } from '../reports/guide-sanitiser';
import { theFirstNameFrom, theShortNameOf, theFirstNameOfAParticipant, aSurnameOrNothing } from '../reports/a-title-is-not-a-first-name';
import { aWaitInTheirOwnWords } from './a-holder-in-their-own-words';
import { yourOwnRowsSayYou } from './your-own-read-says-you';
import { theRoomForThisReader } from './the-room-for-this-reader';
import { askTheReportsDoor, theLeadsNamesOf, theLeadsLineAsAParticipantMayRead, aboutOneOfThem } from '../reports/one-persons-circumstances-stay-their-own';
import { whatThisSessionHolds, atAGlanceTiles, theBlockersTileNamesThis } from '../reports/what-this-session-holds';
import { quotesBuiltAtTheRead, theRecordAQuoteMayComeFrom } from '../reports/a-quote-built-at-the-read';
import { howManyHaveAnswered } from '../reports/how-many-have-answered';
import { whoHasNotJoinedYet, theNotJoinedYetLine } from '../grounds/invited-not-joined-yet';
import { wasAQuietClose } from '../grounds/an-answer-includes-a-refusal';
/** The person's first turn on a check-in, if any: with `closedReason`, enough to tell a session the clock closed with nothing said (wasAQuietClose). */
const SAID = { where: { role: 'PERSON' as any }, take: 1, select: { id: true } };
import { isFromOutside, leaveOfThePeopleOn, theAwayLinesFor } from '../suites/who-is-away';
import { adminsThisOrg, askedToApproveIt } from '../grounds/who-may-read-this-check-in';
import { refuseSomeoneHeldForASeat } from '../participants/held-for-a-seat';
import { withTheirNamesFromTheOrganisation } from '../../common/colleagues';
import { CANNOT_OPEN_THE_BOARD_YET } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';
import { theLeadsWordsAbout, withoutTheLeadsDescriptionOfAnyone, theShareableTextFor } from '../grounds/the-leads-words-about-someone';
import { whereEachPersonIs, hasANumberADateOrADocument, notNothingWhereThePageSaysSomething } from './where-each-person-is-against-their-number';
import { theQuickReadAgreesWithTheReport, theDisagreementTheReportOpensWith, theDifferencesReadAgreesWithTheQuestion } from './the-quick-read-agrees-with-the-report';
import { theNinetyDaysInThreeSteps } from './the-ninety-days-in-three-steps';
import { theQuickReadCountsTheWaitsTheBoardCounts } from './the-quick-read-counts-the-waits-the-board-counts';
import { oneCountPerThing } from './one-count-per-thing';
import { type ToLookAt } from './the-same-thing-for-three-check-ins';
import { theSameThingFromTheRows } from './the-same-thing-read-from-the-record';
import { whenTheBoardLastChanged, whatAReaderWhoOnlyReadsIsTold } from './when-the-board-last-changed';
import { whatTheLeadShouldKnow, targetsFor } from './whose-number-is-whose-business';
import { whichRoundIsOpen, theTeamsOpenRound } from './which-round-is-open';
import { splitTheTotal, sayingWhatTheSplitDoes } from '../alignment/a-total-splits-by-what-people-did';
import { peopleFrom } from '../alignment/a-file-of-people-becomes-people';
import { whatTheyTried } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';
import { theBoardsJudgementFor } from '../reports/the-judgement-is-the-leads';
import { withTheCountsBehindIt } from './the-counts-behind-this';
import { isEvaluationCheckIn, theSubjectOfAnEvaluationCheckIn, viewerIsTheSubjectOfAnEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { whatEachHandoffPersonTyped, withTheirWordsChecked } from './the-handoff-words-the-person-typed';
import { whatWasAgreedAtTheStart, theGoalsSetForAnyone } from './what-was-agreed-at-the-start';
import { changeSinceTheLastCheckIn } from './change-since-the-last-check-in';
import { whatTheyCommittedTo } from './the-switchboards-own-sections';
import { theSameMeasure } from '../grounds/a-dump-is-many-things';
import { theRisks, theWorkPlan, theTimeline, thePersonHistory, theBlockerCheck, theEvidenceIndex, theBusyOrMoving, theLeadActions, theObligations, theForecast, whoWaitedOnWhom, theContradictions, theQuestionsForTheLead, type WhoIsReading, type ACommitment } from './the-switchboards-own-sections';
import { whoOwnsWhatForTheSubject, divergenceForTheSubject, theNewHireReadsTheLeadsWords } from '../reports/colleagues-exact-words-stay-with-the-manager';
import { eachLineInTheirName, eachLineWithTheKindThatFits, inTheirOwnWords } from './what-each-person-said-is-in-their-name';
import { theirWordsWithTheName } from './who-him-is-in-their-check-in';
import { theRecordAQuoteMayComeFromByParticipant } from '../reports/a-quote-built-at-the-read';
import { ReportsService } from '../reports/reports.service';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { aNameFor, thePersonWaitingAsTheyRead, atTheStartOfASentence, somebodyIn } from './the-person-waiting-by-name';
import { itWasTakenFurther } from '../reports/what-they-said-they-did-about-it';
import { ESCALATE_AFTER_DAYS } from '../webhooks/a-handoff-that-has-sat-too-long';
import { theMarkOf, whoAddedEachBackingDocument, WHAT_A_MARK_READS } from '../reports/how-a-line-is-known';
import { theDayZone } from '../../common/the-organisations-own-day';
import { whatTheDealStillNeeds, theValueLine } from './what-a-deal-still-needs';
import { theDecisionsTheLeadPromised } from './a-decision-the-lead-promised';
import { thePromisesCarriedOver } from './a-promise-carried-over';
import { theSalesSignals } from './where-this-is-heading';
import { whatToCoachThisWeek } from './what-to-coach-this-week';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';
import { theStagesKept } from './a-deals-stages-are-kept';
import { aDaySaidInFull } from './a-day-said-in-full';
import { theStallRuleOnRecord, theStallRuleAsALine, theStallRuleDeclined, NO_STALL_RULE_YET, THE_SUGGESTED_DAYS, THE_STALL_RULE_ASKED, type TheStallRule } from './the-stall-rule';
import { whenTheyPay, theUnitsOf } from './a-sales-aim-is-counted-from-the-deals';
import { theDealsOnRecord, theAimsTheDealsCount, theSalesStages, whereAWeeklyCountStands, whatTheseDealsHold, theDealsTheCountIsMadeOf, type ACountFromTheDeals, type ADealOnRecord } from './a-sales-aim-is-counted-from-the-deals';
import { theWaitsOnCustomersApart, theirOwnAnswersWhereTheWaitsWereSaid, withoutTheWaitsOnCustomers } from './a-customers-reply-is-on-its-deal';
import { theReleaseOneSalesBoardIsOn } from './release-one-sales-board';
import { whatTheSwitchboardServes, type TheSwitchboardServed } from './the-switchboard';
import { theCollectionsBoardFor } from './the-collections-board.service';
import { theMatterBoardFor } from './the-matter-board.service';
import { theBillAfterTheLeadsAnswer } from './a-fee-note-due-on-an-event';
import { aCollectionsCheckInWithRelease2 } from '../grounds/release-2-collections';
import { withTheStageKept, theStagesToKeep } from './a-deals-stages-are-kept';
import { WHAT_EACH_MARK_SAYS } from '../reports/the-mark-on-every-line';

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
/** A phrase put inside a sentence: "Whether a range counts" becomes "whether a range counts"; "Kwame's target" stays. */
/**
 * WHO SAID DIFFERENT THINGS, BY NAME WHERE THIS READER MAY SEE THE NAMES.
 *
 * "The accounts differ" is how the engine talks, not how a person does. Every side of the
 * difference is named only when every side resolves to a name this reader may see; one missing
 * name and nobody is named, so a hidden person is never left out of a list that names the others.
 */
export function whoSaidDifferentThings(d: any, nameForLabel: (label: string) => string | undefined): string {
  const sides: any[] = Array.isArray(d?.positions) ? d.positions : Array.isArray(d?.perspectives) ? d.perspectives : [];
  const names = [...new Set(sides.map((s) => nameForLabel(String(s?.participantLabel ?? ''))?.trim() ?? ''))];
  if (sides.length >= 2 && names.length >= 2 && names.every(Boolean)) {
    return names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  return 'People in this check-in';
}

export const inASentence = (phrase: string): string => {
  const t = (phrase ?? '').trim().replace(/[.!?]+$/, '');
  return /^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

/* What the Owner column says when nobody has been named, in a sentence (screens request 88). */
const NOBODY_NAMED_TO_DECIDE = 'Nobody has been named to decide this.';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);
  /* One board warm-up at a time for each ground, shared by every trigger. See one-warm-up-at-a-time. */
  private readonly boardWarming = new OneAtATime<void>();

  /*
   * `AnthropicService` for one job: rewording the reads' reason lines. The board decides nothing
   * with it. See the-engine-drafts-it-the-model-words-it.ts for the guard.
   */
  constructor(
    private prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    /* For `getSessionProgress` only - which round is open, and who has not answered it. */
    private readonly grounds: GroundsService,
    /*
     * For ONE job: putting people's names into the report's own sentences before the board serves
     * them, through the same door the report uses. See `theReportAsItWasShared`. forwardRef for the
     * reason the module note gives: module wiring is invisible to tsc and to the unit tests, and
     * the cost of the wrapper is nothing.
     */
    @Inject(forwardRef(() => ReportsService)) private readonly reports: ReportsService,
  ) {}

  /**
   * What has stayed open for three or more of a person's check-ins, for the lead. Read from the
   * record: the promises said again, and what was said to be in the way in the first and the latest
   * of their check-ins. Names as this reader resolves them, or "a colleague".
   */
  private async whatHasStayedTheSameFor(
    groundId: string,
    ground: { participants: any[]; dependencies?: any[] },
    checkIns: { id: string; participantId: string; sessionNumber: number; status: string; completedAt: Date | null }[],
    rawDependencies: any[],
    myParticipantId: string | null,
    nameOf: (pid: string) => string | null,
    aColleague: (pid: string | null | undefined) => string,
  ): Promise<ToLookAt[]> {
    /* One read with the report's, so both say the same sentences. See the-same-thing-read-from-the-record. */
    return theSameThingFromTheRows(this.prisma, {
      groundId, participants: ground.participants, checkIns, rawDependencies,
      dependencies: (ground as any).dependencies ?? [], myParticipantId, nameOf, aColleague,
    });
  }

  /*
   * THE BOARD IS BUILT WHEN THE SESSION ENDS, NOT WHEN THE LEAD OPENS IT. Every worded line the
   * board shows is kept by its hash (see a-line-worded-once-is-kept), so reading it once here, a
   * few seconds after the check-in that changed it, means the lead's first open pays nothing.
   * Best-effort: a failure here is logged and the open still works, it is just slower.
   */
  /*
   * ONCE PER CHECK-IN THAT CHANGES IT (decision 44). Check-ins landing while a warm-up runs share
   * one more run after it, which reads all of them; nothing starts beside a run already out. The
   * fingerprint is what the board is built from, so a check-in event that brings nothing new (a
   * repair of one already counted) asks nothing. And there is one instance of this service: run-19
   * warmed every board twice because the public API module built a second one (see
   * only-one-board-listens.spec).
   */
  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async warmOnCheckInCompleted(event: CheckInCompletedEvent) {
    try {
      await (this.boardWarming ?? new OneAtATime<void>()).run(event.groundId, () => this.whatTheBoardIsBuiltFrom(event.groundId), async () => {
        const ground = await this.prisma.ground.findUnique({ where: { id: event.groundId }, select: { initiatorId: true } });
        if (!ground?.initiatorId) return;
        await this.get(event.groundId, ground.initiatorId, DEFAULT_COVERAGE_VARIANT, { mayWordNewLines: true });
        this.logger.log(`Board warmed for ${event.groundId} after session ${event.sessionNumber}.`);
      });
    } catch (err: any) {
      this.logger.warn(`Board warm-up failed for ${event.groundId}: ${err?.message}`);
    }
  }

  /* The board's inputs, as one fingerprint: check-ins, the record's lines and documents, the aims and
     numbers, what is in the way, who is in it, and the report whose story it carries. */
  private async whatTheBoardIsBuiltFrom(groundId: string): Promise<string | null> {
    const [checkIns, lines, docs, aims, blockers, people, report] = await Promise.all([
      this.prisma.checkIn.aggregate({ where: { groundId }, _count: { _all: true }, _max: { completedAt: true } }),
      this.prisma.recordEntry.aggregate({ where: { disputedAt: null, participant: { groundId } }, _count: { _all: true }, _max: { createdAt: true } }),
      this.prisma.groundDocument.count({ where: { groundId } }),
      this.prisma.groundObjective.aggregate({ where: { groundId }, _count: { _all: true }, _max: { updatedAt: true } }),
      this.prisma.groundDependency.aggregate({ where: { groundId }, _count: { _all: true }, _max: { updatedAt: true } }),
      this.prisma.groundParticipant.count({ where: { groundId } }),
      this.prisma.report.findUnique({ where: { groundId }, select: { updatedAt: true } }),
    ]);
    return JSON.stringify([checkIns, lines, docs, aims, blockers, people, report?.updatedAt ?? null]);
  }

  /*
   * OPENING THE BOARD NEVER REBUILDS IT (decision 7). Only the warm-up above, which runs when a
   * check-in comes in, may ask the model to word a new line. Every other read - the lead opening it,
   * a participant, an admin, the API - serves the lines already worded, and the engine's own words
   * where a line has not been worded yet. See the-board-as-each-reader-reads-it.spec.
   */
  /** The switchboard's pick for the board, as `{ switchboard }` where Release 2 is on, or nothing at all. Never fails the board. */
  private async theSwitchboardsPick(ground: any): Promise<{ switchboard?: TheSwitchboardServed }> {
    const served = await whatTheSwitchboardServes(this.prisma, ground).catch(() => null);
    return served ? { switchboard: served } : {};
  }

  /**
   * THE COLLECTIONS BOARD (Release 2, pull request 2 of 3; the-collections-board), as `{ collections }`, only where the switchboard
   * picks the collections board or the loans board for this check-in: Release 2 on, a "Collect what's owed" check-in, its type on
   * record. Walled for this reader before it is built (the-collections-board.service). Otherwise nothing, so the board is as before.
   */
  private async theCollectionsBoardIfPicked(ground: any, reader: { runsIt: boolean; participantId: string | null }, now: Date): Promise<{ collections?: unknown }> {
    const served = await whatTheSwitchboardServes(this.prisma, ground).catch(() => null);
    if (!served || (served.board !== 'the collections board' && served.board !== 'the loans board')) return {};
    const board = await theCollectionsBoardFor(this.prisma, ground.id, reader, now).catch(() => null);
    return board ? { collections: board } : {};
  }

  async get(
    groundId: string,
    requestingUserId: string,
    variant: CoverageVariant = DEFAULT_COVERAGE_VARIANT,
    /* `now`: the board's clock. Dates it writes leave out the year only where it is this clock's year. */
    opts: { mayWordNewLines?: boolean; now?: Date } = {},
  ) {
    const now = opts.now ?? new Date();
    /* Nobody held for a seat reads the board (finding 3). */
    await refuseSomeoneHeldForASeat(this.prisma as any, groundId, requestingUserId);
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: {
        participants: {
          select: {
            id: true, email: true, userId: true, partyType: true, createdAt: true, roleAsDescribed: true, remitAsGiven: true, nameGiven: true, organisationGiven: true,
            managingOnly: true, signedOffAt: true,
            /* What the population rule reads: still holding a live invitation counts as expected. */
            invitedAt: true, inviteTokenExpiresAt: true,
            detectedFunction: true, detectedFunctionConfidence: true, detectedFunctionConfirmedAt: true,
            user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } },
          },
        },
        report: true,
        objectives: { orderBy: { sortOrder: 'asc' } },
        dependencies: { orderBy: { createdAt: 'asc' } },
        /* For the header's "how it is going": the rounds, and the newest round's shared picture. */
        /* participantId too: the glance counts who has answered this round by it, and without it the board read
           "0 of 2 answered this round" to a woman who had just answered (Hafsah, 21 Sep 2026). */
        /* With the close reason and the person's first turn, so the glance does not count a session the clock closed with nothing said as answered. */
        checkIns: { select: { sessionNumber: true, status: true, isSetup: true, completedAt: true, participantId: true, availableFrom: true, closedReason: true, turns: SAID } },
        reportRounds: { select: { sharedPicture: true, sessionNumber: true }, orderBy: { sessionNumber: 'desc' }, take: 1 },
        poll: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Somebody already here, added by their address, is named by their membership (user journeys, F-7). */
    await withTheirNamesFromTheOrganisation(this.prisma as any, (ground as any).organizationId, (ground.participants ?? []) as any);
    /* A wait on oneself is not a wait, a wait on "the lead" is a wait on the lead, and one wait said four ways is one (request 111 e, request 123 items 4 and 5). */
    (ground as any).dependencies = theWaitsAsABoardReadsThem((ground as any).dependencies ?? [], ground.participants.find((p) => !!ground.initiatorId && p.userId === ground.initiatorId)?.id);
    /*
     * ON A SALES CHECK-IN, AN AIM THE DEALS HOLD IS COUNTED FROM THE DEALS (Hafsah's answers of 17 October, Drop Access).
     * Read once here, before anything reads a count, so every section that reads an aim (the targets, where each stands,
     * the headline, the forecast, each person's share) reads the same number, from the record. Nothing is written: the
     * count kept on the target is brought up to date by the board listener when something new comes in. See
     * a-sales-aim-is-counted-from-the-deals.
     */
    const countedFromTheDeals = new Map<string, ACountFromTheDeals>();
    let theDealsCounted: ADealOnRecord[] = [];
    /* Release 1's sales board, switched on per organisation (release-one-sales-board). Off, the board reads as it did before it. */
    const releaseOne = await theReleaseOneSalesBoardIsOn(this.prisma, (ground as any).organizationId);
    /* Release 4 (release-4-teams): each team type's board as its kit picture, and each target with its unit. Off, as before. */
    const releaseFour = await theRelease4TeamsIsOn(this.prisma, (ground as any).organizationId);
    /* The direct morning (organisation/the-direct-morning-switch): it changes the board's own words, never who reads what. Off, as before. */
    const direct = await theDirectMorningIsOn(this.prisma, (ground as any).organizationId).catch(() => false);
    /* The lead's answer on whether a price range counts as a budget, from how we work (a-deals-four-criteria). Release 1 only. */
    const priceRange: ARangeAnswer = releaseOne && isASalesKind((ground as any).kindOfWork) ? await thePriceRangeAnswer(this.prisma, groundId) : null;
    /* The lead's own stall rule, or none (standing decision 4, 18 October; the-stall-rule). Off Release 1, the rule the board always read. */
    const stallRule: TheStallRule | null = releaseOne && isASalesKind((ground as any).kindOfWork) ? await theStallRuleOnRecord(this.prisma, groundId) : null;
    const stallDays: number | null | undefined = stallRule ? stallRule.days : undefined;
    /*
     * A TARGET SAID AGAIN IS THAT TARGET (Hafsah's point 9, 17 October). An aim whose number and the thing it counts match a
     * target already on record, the team's or the person's own, is that target: "My target is 120 units" from a rep is the team's
     * 120, and "Sell 40 units" is the rep's own 40. Read once here, so every section reads each target once. Nothing is deleted.
     * See a-target-said-again-is-that-target.
     */
    if (releaseOne && isASalesKind((ground as any).kindOfWork)) (ground as any).objectives = eachTargetOnce((ground.objectives ?? []) as any[]);
    /* A DEAL'S UNITS ARE NOT A TARGET (Drop Access run 1, item 27): "the Mama Pima deal for 10 units" is the deal's. See a-deals-units-are-not-a-target. */
    const theCustomers: string[] | null = releaseOne && isASalesKind((ground as any).kindOfWork)
      ? [...new Set((((await Promise.resolve((this.prisma as any).workItem?.findMany?.({ where: { groundId, kind: { in: ['deal', 'lead'] } }, select: { name: true } })).catch(() => [])) ?? []) as { name: string }[]).map((r) => String(r.name ?? '').trim()).filter(Boolean))]
      : null;
    const thePeople = ((ground.participants ?? []) as any[]).map((p) => p.user?.firstName ?? '').filter(Boolean) as string[];
    if (theCustomers) (ground as any).objectives = withoutADealsFigure((ground.objectives ?? []) as any[], theCustomers, thePeople);
    if (releaseOne && isASalesKind((ground as any).kindOfWork)) {
      /* "With proof of payment" counts the payment records only (Hafsah's point 12). */
      theDealsCounted = await theDealsOnRecord(this.prisma, groundId, { paymentRecord: true }).catch(() => [] as ADealOnRecord[]);
      const counted = theAimsTheDealsCount(ground.objectives as any[], theDealsCounted, theSalesStages((ground as any).workStages), now, theDayZone());
      for (const o of (ground.objectives ?? []) as any[]) {
        const c = counted.get(o.id);
        if (!c) continue;
        countedFromTheDeals.set(o.id, c);
        o.count = c.count;
      }
    }

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
          'There is no board for this check-in yet. Read the report instead. It has everything people said in their check-ins.',
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
    /* A wait on "my direct reports" is said from this reader's side, never as the reader's own (item 18). */
    if (Array.isArray((ground as any).dependencies)) {
      /* And what they wait for, with its "I" and "my", too (item 21). See a-holder-in-their-own-words. */
      (ground as any).dependencies = (ground as any).dependencies.map((d: any) => aWaitInTheirOwnWords(d, me?.id ?? null));
    }
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
        select: { role: true, organizationId: true, awaitingOrgApproval: true, email: true },
      })
      : null;
    /* Whoever runs it, set it up or administers it reads a goal not told (decisions 5 and 86); the person it is about, and a colleague, do not. */
    const theyRunIt = theyRunThisCheckIn({ userId: requestingUserId, role: viewer?.role, organizationId: viewer?.organizationId }, ground as any);
    /* Nobody held for a seat reads the board, its report's story or its names (request 49). */
    if ((viewer as any)?.awaitingOrgApproval === true) throw new ForbiddenException(CANNOT_OPEN_THE_BOARD_YET);
    /* The board is read only, so the admin asked to approve an evaluation check-in reads it too (decision 75,
       item 2). Patterns and colleagues' exact words still go only to whoever runs it or set it up. */
    const adminHere = adminsThisOrg({ ...viewer, userId: requestingUserId }, ground as any) || askedToApproveIt({ ...viewer, userId: requestingUserId }, ground as any);
    if (!me && !isInitiator && !isSetupAdmin && !adminHere) {
      /* NotFound, not Forbidden: a 403 tells a stranger, or an admin without access to a review, that the check-in is real (GW-PRI-04). */
      throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    }

    /*
     * GATE 1b: AND YOU GIVE YOUR ACCOUNT BEFORE YOU READ EVERYBODY ELSE'S.
     *
     * See a-board-is-not-read-before-you-answer. The round comes from `getSessionProgress` rather
     * than from anything worked out here, because WHICH round is the one people are answering has
     * been got wrong before - it is the round people have answered, not the newest row opened, and
     * that distinction has its own note on that method.
     *
     * `renders: true`, because the board exists and they will read it shortly. A false here would
     * say this check-in has no board, which is a different and untrue thing.
     */
    const thisRound = await this.grounds.getSessionProgress(groundId).catch(() => null);
    if (theyOweAnAccountFirst(
      { participantId: me?.id ?? null, runsThisGround: isInitiator || isSetupAdmin || adminHere },
      thisRound,
    )) {
      return {
        groundId,
        renders: true,
        withheldUntilYouCheckIn: true,
        mode: ground.mode,
        family: familyFor(ground.scenario),
        /* The direct morning says it in one line, with one button (Hafsah, 25 October). Off, as before. */
        saying: direct ? 'Check in first, then you’ll see the board.' : BECAUSE_YOURS_WOULD_BE_AN_ANSWER,
      };
    }

    // Collapse duplicate handoffs before anything reads them, so existing
    // grounds get the same answer as new ones.
    /*
     * Two passes, because they catch different things. `dedupeDependencies` joins two descriptions
     * of one named thing; `oneBlockerPerThingWaitedOn` joins the times somebody said they were
     * stuck without naming anything. See that file for why neither is a similarity threshold.
     */
    /* The rows as written, for when each thing was first and last said (the-same-thing-for-three-check-ins). */
    const rawDependencies = [...((ground as any).dependencies ?? [])] as any[];
    (ground as any).dependencies = oneBlockerPerThingWaitedOn(dedupeDependencies(ground.dependencies as any));
    /*
     * A CUSTOMER'S REPLY IS ON ITS DEAL (Hafsah's answer of 17 October). On a sales check-in, an open wait on a customer of a
     * deal (the deal's contact, or its business) is taken off the waits every section reads (Blockers, Waiting on, the glance,
     * the quick read, the risks) and kept for that deal, unless what was said says it stops the deal. Before anything reads the
     * waits, so no section is left counting it. See a-customers-reply-is-on-its-deal.
     */
    let waitsOnCustomers: any[] = [];
    if (theDealsCounted.length) {
      const theirOwnAnswers = await theirOwnAnswersWhereTheWaitsWereSaid(this.prisma, (ground as any).dependencies as any[]).catch(() => new Map<string, string[]>());
      const apart = theWaitsOnCustomersApart((ground as any).dependencies as any[], theDealsCounted, theirOwnAnswers);
      (ground as any).dependencies = apart.team;
      waitsOnCustomers = apart.onDeals;
    }

    /* What this run can actually show: a one-round read has no across-rounds sections. See sectionsForARunOf. */
    /*
     * NO PATTERN SECTION WHILE PATTERNS ARE NOT SERVED. The family still lists it, so turning the
     * switch on brings it back where it was; off, the board neither builds it nor tells the page it
     * has one. See patterns-are-served.
     */
    /* Judgements of a person off for this organisation: no pattern section, no pattern questions, no coaching about a person (organisation/person-judgements.ts). */
    const judged = await thePersonJudgementsAreOn(this.prisma, (ground as any).organizationId ?? null);
    const sections = sectionsForARunOf(ground.scenario, totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null)
      .filter((s) => (PATTERNS_ARE_SERVED && judged) || s !== 'patterns');
    const has = (s: BoardSection) => sections.includes(s);
    const family = familyFor(ground.scenario);

    /*
     * A PERSON'S OWN AIM THAT WAS KEPT ONLY AS THEIR PROMISE (screens request 110). Read from the record as
     * a target of theirs, set by them, before any wall below, so it goes through every rule a stored target
     * of theirs goes through (who sees targets, the untold goals, naming). Nothing is written. See
     * an-aim-kept-only-as-their-promise.
     */
    {
      const promises = await ((this.prisma as any).personObjective?.findMany?.({
        where: { groundId, authoredBy: 'self', kind: 'TARGET' },
        select: { id: true, participantId: true, text: true, kind: true, target: true, measure: true, status: true, authoredBy: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }) ?? Promise.resolve([])).catch(() => []);
      const fromPromises = theirOwnAimsKeptOnlyAsPromises(promises as any[], (ground.objectives ?? []) as any[], ground.participants as any[], groundId);
      if (fromPromises.length) (ground as any).objectives = [...((ground.objectives ?? []) as any[]), ...fromPromises];
      /* "My target is still 120 units by October 30th", kept as Kevin's promise, is the team's 120 said again (point 9). */
      if (fromPromises.length && releaseOne && isASalesKind((ground as any).kindOfWork)) (ground as any).objectives = eachTargetOnce((ground.objectives ?? []) as any[]);
      if (fromPromises.length && theCustomers) (ground as any).objectives = withoutADealsFigure((ground.objectives ?? []) as any[], theCustomers, thePeople);
    }


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
    /* One copy of the rule, shared with the grounds page, the reports and the interview. See peers-are-named. */
    const peersVisible = peersAreNamedOn(ground as any, { participantId: me?.id ?? null });
    /* `viewer` and `adminHere` are read once at the door above - see the note there. */
    const runsThisGround = isInitiator || isSetupAdmin || adminHere;
    const whoMaySee = { peersHidden: !peersVisible && !runsThisGround, meParticipantId: me?.id ?? null };

    /**
     * GATE 3: THE NAMES, ON THE WHOLE ROW, ONCE, FOR THIS READER.
     *
     * The board serves the report's own sentences, and the model writes those sentences in LABELS -
     * "the initiator", "participant A" - which the report resolves per reader on the way out.
     *
     * The board used to do its own half of that, over the whitelisted fields only, so everything it
     * took STRAIGHT off the stored row kept its labels. Read on the running board, as the lead of
     * the sales check-in, about her own team:
     *
     *   "The initiator believes the team is behind on a collective goal for one reason, but the
     *    record shows each person is working on an individual goal."
     *   "the initiator is waiting on the credit committee for 'decisions on their deals'"
     *
     * So the ROW ITSELF IS REPLACED, here, before anything reads it - rather than the six fields
     * that happen to be read today. That is the whole point: a field list was the bug twice in the
     * report for exactly this reason, and a column added to that table tomorrow is named the day it
     * arrives rather than the day somebody notices it is not. Mutated in place, like `dependencies`
     * a few lines above, so no read downstream can pick the raw row by mistake.
     *
     * Through the report's own door and not a copy of it. Names are only one of the four things
     * that read does - it also leaves `.label` raw (a name there silently keeps the wrong person's
     * quality reads), drops the identifying detail out of a check-in shared without names, and puts
     * the reader's own "you" in - and a board with the names but not the rest is worse than a board
     * with neither. See `ReportsService.theReportAsItWasShared`.
     */
    (ground as any).report = askTheReportsDoor(
      this.reports,
      ground as any,
      me?.id ?? null,
      runsThisGround,
    );

    /*
     * AND A DIFFERENCE THAT IS ONLY THOSE TARGETS SAID AGAIN, OR ONLY WHERE SOMEBODY'S WORK STANDS, IS NOT ONE (point 9): Grace's
     * 40 each against the reps naming the team's 120, and the 10 new leads against "I have not planned for generating new leads
     * yet". Left out of the report as this board reads it, so every section that reads the differences leaves it out. Release 1's sales board only.
     */
    if (releaseOne && isASalesKind((ground as any).kindOfWork) && (ground as any).report && Array.isArray((ground as any).report.divergences)) {
      const leadRowId = ground.participants.find((p: any) => !!ground.initiatorId && p.userId === ground.initiatorId)?.id ?? null;
      const whoIs = (label: string): string | null => {
        const n = label.trim().toLowerCase();
        if (!n) return null;
        return (ground.participants as any[]).find((p) => {
          const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim().toLowerCase();
          return full === n || (p.user?.firstName ?? '').trim().toLowerCase() === n || (p.nameGiven ?? '').trim().toLowerCase() === n;
        })?.id ?? null;
      };
      const report = { ...((ground as any).report as any) };
      const only = theDifferencesThatAreOnlyATargetSaidAgain(report.divergences as any[], (ground.objectives ?? []) as any[], leadRowId, whoIs);
      const notOne = (report.divergences as any[]).filter((d) => only.has(d));
      if (notOne.length) {
        report.divergences = (report.divergences as any[]).filter((d) => !notOne.includes(d));
        /* The question the report drew from one of them is not a question either. */
        const topics = notOne.map((d) => String(d?.topic ?? '').trim().replace(/[.!?]+$/, '')).filter(Boolean);
        if (typeof report.centralQuestion === 'string' && topics.some((t) => report.centralQuestion.includes(t))) report.centralQuestion = null;
        (ground as any).report = report;
      }
      /*
       * AND A PERSON CORRECTING THEMSELVES SETTLES IT (Drop Access short run, item 1): a report stored before the rule kept Mercy's
       * KES 120,000 and 125,000 as a difference and a question to ask her. Left out as this board reads it, by the rule the report is
       * now written with (a-correction-is-their-latest-word).
       */
      const corrections = await theCorrectionsOnTheCheckIn(this.prisma, groundId).catch(() => []);
      if (corrections.length) {
        const settled = withWhatACorrectionSettled((ground as any).report, corrections, (label) => (/^you$/i.test(label.trim()) ? (me?.id ?? null) : whoIs(label) ?? whoIsBehindALabel(ground.participants as any[], labelsForParties(ground.participants as any))(label)));
        if (settled.leftOut.length) (ground as any).report = settled.report;
      }
    }

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
        /* The check-in's read of how checkable the answers were, for "Nothing checkable" on the rows
           only whoever runs the check-in reads. See saidAnythingCheckable. */
        completedAt: true, specificityLevel: true, specificityDimensions: true,
        /* When each session opened, for the session lines (request 107 e). */
        availableFrom: true, startedAt: true,
        /* Whether it was a set-up conversation, which the timeline leaves out: the anchor lead's set-up is saved done, and read as "the first answers for
           session 1 came in" before anybody had answered (review of fd583ba5). */
        isSetup: true,
        /* Whether the clock closed it with nothing said, which is not an answer (the grid's "answered"). */
        closedReason: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } },
      },
      orderBy: { sessionNumber: 'asc' },
    });
    const maxSession = checkIns.reduce((m, c) => Math.max(m, c.sessionNumber), 1);
    /* ONE CLOCK. The open round is the lowest session anybody who gives a check-in has not finished.
       When a third person is added, the round goes back to session 1 while the lead's session 2 may
       already be in progress; the board said "session 2" and the header said "back to session 1".
       The round is the clock everywhere; a session ahead of it is upcoming, not current. */
    /* ONE CLOCK, AND ONE PLACE THAT KNOWS WHAT IT READS. This had its own copy of the rule and
       `which-round-is-open.ts` had another, and the two disagreed: this one took the lowest
       unfinished session, which is next week's row written ahead of time, so every tile counted a
       round with nothing in it. The rule now lives in one function and both callers ask it. */
    /* Nobody an admin has not let in yet holds the round open (decision 77). */
    /* Decision 133: the round's clock is the team's; the lead checks in when they choose. */
    const givers = new Set(ground.participants.filter((p: any) => owesThisSession(p) && holdsTheClock(p, isNotLetInYet)).map((p: any) => p.id));
    const mine = checkIns.filter((c) => givers.has(c.participantId));
    const openRound = mine.length ? whichRoundIsOpen(mine as any) : maxSession;
    /* THE BOARD IS EVERY SESSION. The session report runs its engines over one session's rows; the
       board runs the same engines over all of them, so the two share a vocabulary and differ only in
       scope. Same tiles, same settled-and-open, same question engine. */
    /* Whether a colleague's own words are walled from this reader: the person an evaluation check-in is
       about, or an admin without access to it (the same rule as Who owns what, further down). */
    const colleaguesWordsWalled = viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: (ground as any).scenario,
      isLead: isInitiator || runsItForAPattern(ground as any, requestingUserId),
      viewerParticipantId: me?.id ?? null,
      participants: ground.participants as any,
    }) || (adminHere && !runsItForAPattern(ground as any, requestingUserId) && isEvaluationCheckIn((ground as any).scenario));
    /* The new hire on an onboarding check-in reads their lead's own words and row (request 124, Hafsah's answer of 3 October). */
    const theNewHireReadsTheLead = theNewHireReadsTheLeadsWords((ground as any).scenario) && viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: (ground as any).scenario,
      isLead: isInitiator || runsItForAPattern(ground as any, requestingUserId),
      viewerParticipantId: me?.id ?? null,
      participants: ground.participants as any,
    });
    /* And the Blockers tile names only the reader's own waits wherever the header above it does (see ownWaitsOnly). */
    const ownWaitsOnly = whoMaySee.peersHidden || (isEvaluationCheckIn(ground.scenario) && !isInitiator && !runsItForAPattern(ground as any, requestingUserId));
    const theMovementsReader = { participantId: me?.id ?? null, isLead: isInitiator, runsIt: theyRunIt, colleaguesWordsWalled, ownWaitsOnly };
    /*
     * WHETHER THIS READER IS A PARTICIPANT WHOSE BOARD IS THEIR OWN (request 105; the prototype's B5): somebody
     * who checks in and does not run the check-in. Not the lead, the admin who set it up, or an admin of the
     * organisation; and not the person reviewed on an evaluation check-in, whose board its own rules already
     * narrowed. See a-participants-board-is-their-own.
     */
    const aParticipantOnly = !!me?.id && !runsThisGround && !runsItForAPattern(ground as any, requestingUserId)
      && !viewerIsTheSubjectOfAnEvaluationCheckIn({
        scenario: ground.scenario,
        isLead: isInitiator || runsItForAPattern(ground as any, requestingUserId),
        viewerParticipantId: me?.id ?? null,
        participants: ground.participants as any,
      });
    const sessionShape: any = await this.everySessionThroughTheReportEngines(groundId, ground as any, checkIns as any[], openRound, theMovementsReader).catch((err: any) => {
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
     * The board never falls back to the address: it is read by every party, and a party's address
     * can be hidden from the others. The client's `participantLabel` refuses the email for this
     * reason and this did not.
     *
     * It used to fall back to the ROLE instead, on the grounds that the board shows each person
     * "against their own role in its own terms". It no longer does, because the role on the row is
     * the lead's own description of the person (request 36, below). With no name, a person is
     * "A colleague" (see plainWordsByPerson).
     */
    /* Somebody with no name, in the same plain words every surface uses: "A colleague", "Another colleague". */
    /*
     * AND WHERE PEOPLE SEE ONLY THEMSELVES, NOBODY BUT THE READER AND THE LEAD IS NAMED TO THEM.
     *
     * Found 27 September 2026: the wall below took other people's rows off a participant's board,
     * and every name still came through the one place names come from - the list of people, both
     * ends of a handoff (screens request 19), who picked a time in the poll. So the wall is here,
     * in the name itself: on such a check-in a participant reads their own name, the lead's, and
     * "one colleague", "another colleague" for everybody else, in the same words the reports use,
     * because the names they may see are worked out by the same rule (namesVisibleTo). The lead
     * and admins are never walled, and read everybody.
     */
    const noName = plainWordsByPerson(
      ground.participants as any,
      whoMaySee.peersHidden ? namesVisibleTo(me?.id ?? null, ground.participants as any, false) : undefined,
    );
    const aColleague = (pid: string | null | undefined) => atTheStart((pid ? noName.get(pid) : null) ?? 'a colleague');
    const theLeadsRow = ground.participants.find((x) => !!ground.initiatorId && x.userId === ground.initiatorId)?.id ?? null;
    const hiddenFromThisReader = (pid: string) => whoMaySee.peersHidden && pid !== me?.id && pid !== theLeadsRow;
    /*
     * THE FOUR CRITERIA ON EACH DEAL (Release 1's sales board; a-deals-four-criteria): the lead's answer on a price range, and who
     * decides it as this reader names them ("You" to the lead, the lead's first name to anybody else).
     */
    const criteriaFor = (): { range: ARangeAnswer; whoDecides: string } | null => {
      if (!releaseOne || !isASalesKind((ground as any).kindOfWork)) return null;
      if (isInitiator) return { range: priceRange, whoDecides: 'You' };
      const lead = theLeadsRow ? ground.participants.find((x: any) => x.id === theLeadsRow) as any : null;
      const first = String(lead?.user?.firstName ?? lead?.nameGiven ?? '').trim().split(/\s+/)[0];
      return { range: priceRange, whoDecides: first || 'The lead' };
    };
    const nameOf = (pid: string) => {
      const p = ground.participants.find((x) => x.id === pid);
      if (!p) return null;
      if (hiddenFromThisReader(pid)) return aColleague(pid);
      const n = [p.user?.firstName, aSurnameOrNothing(p.user?.lastName)].filter(Boolean).join(' ').trim() || ((p as any).nameGiven ?? '').trim();
      /*
       * AND WHO THEY ANSWERED FOR, THE SAME WAY THE REPORT DOES IT.
       *
       * The report said "Hafsah (Coamana)" and the board said "Hafsah" on the same check-in, two
       * inches apart. On a network-wide check-in the organisation is the unit anybody reads for -
       * see displayName in party-labels, which this now matches.
       */
      const forWhom = ((p as any).organisationGiven ?? '').trim();
      /*
       * A NAME, OR NOTHING, AND NEVER THE LEAD'S WORDS ABOUT THEM. Request 36, 27 September 2026.
       *
       * With no name this fell back to `roleAsDescribed`, cut short by `aNameOrNothing`. That field
       * is the sentence the lead typed about the person when inviting them, and it can hold the
       * lead's private words: "Daniel - Your sales manager, who you said is not meeting his agreed
       * targets" came out as "Daniel - Your sales manager", printed as a name to every reader of the
       * board, the person included. With no name the callers say "A colleague" instead.
       */
      const label = n || null;
      return label && n && forWhom ? `${label} (${forWhom})` : label;
    };

    // GATE 2: whitelist. Only these report fields may cross to the board.
    /* The row is already named, for this reader, at gate 3 above - see the note there. */
    const reportSafe = ground.report ? pickBoardSafeReportFields(ground.report as any) : null;
    /* Whether the team's picture as it stands now is shared (decision 76, item 4): the session the report holds now is released. */
    const teamPictureShared = await isTheTeamPictureNowShared(this.prisma, groundId, (ground as any).report);

    /*
     * AND THE NAMES THE DIVERGENCE SECTION LOOKS UP BY HAND.
     *
     * `participantLabel` is one of the two fields the report's read deliberately leaves raw, so
     * that `own-reads-only` can still match a person's rows on it. The board prints it, so it
     * resolves it here, at the one place that prints it, under the same permission rule: a reader
     * who may not see who somebody is gets the role back.
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

    /*
     * BUILT ONCE PER READ, for the read-side net below (decision 30, narrowed 30 September 2026):
     * everything a non-lead reader may already read regardless of the lead's private descriptions,
     * so a legitimately shared sentence - the brief, a shared target, an aim, what somebody said in
     * their own check-in - is never taken out just because it happens to share words with one.
     */
    const shareableText = isInitiator ? [] : await theShareableTextFor(this.prisma as any, ground as any).catch(() => [] as string[]);

    /*
     * WHAT KEEPS COMING UP, AS QUESTIONS TO SETTLE FIRST, FOR THE LEAD ONLY (decision 86, item 1). Built from the
     * patterns the lead is served, so on the same timing: after the person's answer, or after 3 or 7 days. Nobody
     * else reads `overTime`. See pattern-questions-to-settle-first.
     */
    const patternQuestions: string[] = isInitiator && judged
      ? await (async () => {
          const rows = await (this.prisma as any).patternDetection.findMany({
            where: { groundId },
            select: PATTERN_ROW_SELECT,
            orderBy: { lastSeenAt: 'desc' },
            take: 60,
          });
          const served = servedPatterns(rows as any, { participantId: me?.id ?? null, runsIt: true }, {
            ...whoIsWhoIn(ground.participants as any, ground.initiatorId, (ground as any).cadence),
            now,
          });
          return patternQuestionsToSettleFirst(served, (pid) => nameOf(pid));
        })().catch(() => [] as string[])
      : [];

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
      /* The kind of work (request 76): one of the eleven names in the-kind-of-work.ts, or null. Checked
         again on the way out, so a stored value that is not one of the eleven is served as none. */
      kindOfWork: oneOfTheKinds((ground as any).kindOfWork),
      /* Whether this organisation has Release 1's sales board switched on (release-one-sales-board), so the page draws what it serves. */
      releaseOneSalesBoard: releaseOne,
      /* Release 4 (release-4-teams): each team type's board drawn as its kit picture, where the organisation has it on. Off, as before. */
      /* Release 4 off, nothing new is served, so every reader gets exactly what they got before. On, the template the lead attached. */
      ...(releaseFour ? { releaseFourTeams: true, template: theTemplate((ground as any).templateId) } : {}),
      /* What the switchboard picks for this scenario and type (the-switchboard.ts), only where Release 2 is on; off, the key is not served at all. */
      ...(await this.theSwitchboardsPick(ground as any)),
      /* The collections board, where the switchboard picks it, walled for this reader (the-collections-board.service). */
      ...(await this.theCollectionsBoardIfPicked(ground as any, { runsIt: isInitiator || theyRunIt, participantId: me?.id ?? null }, now)),
      /* The kinds a NEW check-in may be given at release. A check-in that holds another keeps it above. */
      kindsOffered: await theBoardKindsOffered(this.prisma, (ground as any).organizationId),
      /* Whether a new anchor check-in can be started (release.anchorScenario). Off at release. Nothing on the board changes with it yet. */
      anchorScenarioOn: await theAnchorScenarioIsOn(this.prisma),
      /**
       * HOW IT IS GOING, AT THE TOP, WHICH IS WHY SOMEBODY OPENED THIS.
       *
       * "When I come in as a manager, I want progress/status and blockers/risks." The board opened
       * on "where people differ" and said nothing about either - a manager had to read three zones
       * to work out how far through it was, and the one screen that knew was the check-in LIST,
       * which they had just left.
       *
       * Computed by how-a-check-in-is-going.ts, the same function the list calls, so the two cannot
       * disagree about one week. Not a new read: the same summary, the same two facts.
       */
      howItIsGoing: howACheckInIsGoing({
        leave: await leaveOfThePeopleOn(this.prisma as any, [groundId]),
        checkIns: (ground as any).checkIns ?? [],
        participants: ground.participants ?? [],
        dependencies: (ground as any).dependencies ?? [],
        timelineDays: (ground as any).runsUntilEnded ? null : (ground as any).timelineDays ?? null,
        cadence: (ground as any).cadence ?? null,
        scenario: (ground as any).scenario ?? null,
        /* Whoever runs it reads the story's count as the record has it now, the same as the active line beside it (the count is the product's own arithmetic). */
        storyRound: isInitiator || isSetupAdmin || adminHere ? ((ground as any).reportRounds?.[0]?.sessionNumber ?? null) : null,
        /*
         * NEVER A RUN OF THE LEAD'S PRIVATE DESCRIPTION OF ANYONE, FOR A READER WHO IS NOT THE LEAD
         * (decision 30). The read-side net: see withoutTheLeadsDescriptionOfAnyone and the same
         * guard on the report. Both fields are shared with everybody on the ground by design; what
         * is stripped is only a sentence built from a description nobody but the lead wrote.
         */
        sharedPicture: withoutTheLeadsDescriptionOfAnyone(
          ((ground as any).reportRounds?.[0]?.sharedPicture as string | null) ?? null,
          (ground.participants as any[] ?? []).flatMap((p) => [p.roleAsDescribed, p.remitAsGiven]),
          isInitiator,
          shareableText,
        ),
        /* The opening the report wrote, preferred over slicing the picture. See how-a-check-in-is-going. */
        theOpening: withoutTheLeadsDescriptionOfAnyone(
          ((ground as any).report?.theOpening as string | null) ?? null,
          (ground.participants as any[] ?? []).flatMap((p) => [p.roleAsDescribed, p.remitAsGiven]),
          isInitiator,
          shareableText,
        ),
      }),
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
      /*
       * WHAT THE ANSWERS SAY, ABOVE WHO HAS NOT GIVEN ONE.
       *
       * Hafsah, 23 September 2026, looking at a hundred-person board: "the reports and boards needs
       * to show more reasoning, they look more like things that just do counts." She was reading a
       * hundred identical rows - "0 of 500, has not answered, ask them to check in" - on a check-in
       * whose whole point is what the answers say.
       *
       * The read already exists: where enough separate accounts came in, the report carries the
       * network picture (a-hundred-accounts-are-not-two). It was only on the report page, which is
       * not the page somebody opens to see how this is going. It goes on the board too.
       *
       * WHO SEES IT. The person running the check-in always - it is their read of their own
       * check-in. Everybody else once it has been released, which is the same rule the report
       * itself uses, so the board cannot show a picture the report is still withholding.
       */
      /* Decision 76, item 4: someone who does not run it reads it only once the session the report holds now is released. */
      whatTheAnswersSay: (isInitiator || (runsThisGround ? (ground as any).report?.releasedAt : teamPictureShared))
        ? ((ground as any).report?.networkPicture ?? null)
        : null,
      /*
       * THE JUDGEMENT, AND THE TABLE IT WAS WRITTEN FROM.
       *
       * Same door as the network read above it: whoever runs the check-in sees it, and everybody
       * else once the report has been released to them. It is a read across every answer, so it is
       * the shared picture across the whole run - the board's own cell in the four-report map - and
       * it has nowhere else to be.
       *
       * The table travels with it because a count is the only reason to believe a sentence, and
       * because the test for the whole thing is that it can be laid out as rows and columns.
       */
      /*
       * AND IT IS THE LEAD'S, RELEASED OR NOT.
       *
       * This used to read `isInitiator || releasedAt`, so the moment a round closed every
       * participant's board carried the verdict on the room. Watched on the performance-plan
       * scenario: the person the plan was about could read that it was coming. The release of a
       * SHARED picture is not permission to hand round the reading of it.
       * See reports/the-judgement-is-the-leads.
       */
      ...(await withTheCountsBehindIt(this.prisma, groundId, theBoardsJudgementFor((ground as any).report, {
        isLead: isInitiator,
        /* A check-in of one (request 136 item 7): the same reading the report uses, people who answer, not people managing. */
        theReaderIsTheOnlyPerson: ((ground.participants as any[]) ?? []).filter((x) => !x.managingOnly).length === 1
          && ((ground.participants as any[]) ?? []).filter((x) => !x.managingOnly)[0]?.userId === (ground as any).initiatorId,
      }))),
      /*
       * AND WHAT THE RECORD SHOWS ACROSS EVERY SESSION - commitments, dependencies, patterns, gaps,
       * what is still open. The lead's own surface, because it is the lead who has to decide
       * something, and because three of these were empty in the report on the one engagement that
       * was entirely about them. See what-the-record-shows-over-time.
       */
      /* Without its patterns while they are not served, or the lines built from them. See patterns-are-served. */
      /* Counted to the sessions somebody has finished, as the work plan counts them, so one commitment is open for the
         same number of sessions in both (item 18). */
      overTime: isInitiator ? await (async () => {
        const served = overTimeAsServed((ground as any).report?.overTime ?? null, {
          sessionsSoFar: Math.max(0, ...checkIns.filter((c: any) => !c.isSetup && c.status === CheckInStatus.COMPLETED && !wasAQuietClose(c)).map((c: any) => c.sessionNumber ?? 0)),
          meetingsOnRecord: await meetingsOnRecordFor(this.prisma, groundId),
        });
        const kept = served && !judged ? { ...served, patterns: [] } as any : served;
        return kept && patternQuestions.length ? { ...kept, toSettleFirst: [...(kept.toSettleFirst ?? []), ...patternQuestions] } : kept;
      })() : null,
      myParticipantId: me?.id ?? null,
      // Whether the caller may set the frame (targets, the poll question). The
      // board is otherwise read-only, so the client should not offer controls it
      // would only be rejected for using.
      canEditFrame: isInitiator,
      /* For a reader who only reads (an admin who neither runs nor takes part). See when-the-board-last-changed. */
      readOnlyNote: whatAReaderWhoOnlyReadsIsTold(
        { runsIt: isInitiator, takesPart: !!me, mayRead: true },
        (() => {
          const lead = ground.participants.find((p) => !!ground.initiatorId && p.userId === ground.initiatorId);
          return lead ? nameOf(lead.id) : null;
        })(),
      ),
      /*
       * WHEN THE BOARD LAST CHANGED: the newest thing in the record it is built from. Read, never
       * written, so opening the board cannot move it. See when-the-board-last-changed.
       */
      lastChangedAt: whenTheBoardLastChanged({
        checkIns: ((ground as any).checkIns ?? []).filter((c: any) => !c.isSetup),
        report: (ground as any).report ?? null,
        objectives: (ground.objectives ?? []) as any[],
        dependencies: ((ground as any).dependencies ?? []) as any[],
        documentsEveryoneMayRead: await (this.prisma as any).groundDocument?.findMany?.({
          where: { groundId, visibility: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        })?.catch?.(() => []) ?? [],
        agreedWithThePerson: await ((this.prisma as any).personObjective?.findMany?.({
          where: { groundId, seenBySubject: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, seenBySubject: true },
        }) ?? Promise.resolve([])).catch(() => []),
        decidedAt: (ground as any).closedAt ?? null,
        monthEndedAt: theMonthEndedOn((ground as any).groundAuditLog),
      }),
      participants: ground.participants.map((p) => ({
        id: p.id,
        name: nameOf(p.id),
        /* U.6 review: the lead's words about a person are for whoever runs the check-in only. */
        /* Managing only is an internal flag, never said as a role: the real role is the lead's own words, or nothing. */
        role: theLeadsWordsAbout(p, isInitiator) ?? null,
        managingOnly: p.managingOnly,
        signedOffAt: p.signedOffAt,
        /*
         * WHO RUNS THE CHECK-IN, SO A LEAD WITH NO NAME IS "THE LEAD" AND NOT A COLLEAGUE (request 38).
         * Only that one fact: the lead, or everybody else.
         */
        partyType: p.partyType === 'INITIATOR' ? 'INITIATOR' : 'PARTICIPANT',
      })),
      /*
       * WHETHER MORE THAN ONE PERSON ANSWERS, AS A YES OR NO. Screens request 50. The board's "only
       * one person here" notice counted `participants`, and on a check-in that hides people from each
       * other that list is now the reader's own row and the lead's (below), so it cannot say whether
       * anybody else answers. The same rule and the same name as the check-in read's
       * `aTeamReportComes` (grounds.service): a yes or no, never how many.
       */
      aTeamReportComes: ground.participants.filter((p) => !p.managingOnly).length > 1,
      /*
       * WHO IS WAITING TO BE LET IN, APART FROM THE COUNT (decision 77). Not in "N of M" and not waited on;
       * said here instead. Whoever runs it, the admin who set it up and an admin read each by name ("Faraji
       * Odhiambo is waiting to be let in."), or as a count where no name is known. Never a person who checks
       * in, whether or not people see each other: whether somebody has been let in is the organisation's business.
       */
      waitingToBeLetIn: await (async () => {
        const runsIt = isInitiator || isSetupAdmin || adminHere;
        /* A person who checks in reads that somebody is waiting (decision 93, row 4), never a decline, and never as a guest. */
        const aParticipantReadsIt = !runsIt && !!me && !(await isFromOutside(this.prisma, requestingUserId, ground.organizationId));
        return theWaitingToBeLetInLine(
          [...(await whoIsNotLetInYet(this.prisma, ground.participants as any[], (ground as any).organizationId)).entries()]
            .filter(([pid]) => !checkIns.some((c) => c.participantId === pid && c.sessionNumber === openRound && (c.status === CheckInStatus.COMPLETED || c.status === CheckInStatus.DECLINED)))
            .map(([pid, d]) => ({ pid, name: hiddenFromThisReader(pid) ? null : nameOf(pid), declined: d.declined }))
            .filter(({ pid, declined }) => runsIt || (aParticipantReadsIt && !declined && pid !== me?.id))
            .map(({ name, declined }) => ({ name, declined })),
        );
      })(),
      /* WHO IS AWAY AND NOT WAITED ON THIS ROUND (week 23). Dates only. The lead reads it for each person;
         a colleague only for a person the board already names to them; a person reads their own. */
      whoIsAway: theAwayLinesFor(
        (await howManyHaveAnswered(this.prisma, groundId, openRound)).awayUntil ?? {},
        ground.participants.map((p: any) => {
          const shown = nameOf(p.id);
          const first = (p.user?.firstName ?? '').trim();
          const name = shown && shown !== 'A colleague' ? (first && shown.includes(first) ? first : shown) : null;
          return { id: p.id, nameGiven: name, user: null };
        }),
        {
          viewerRunsThisGround: isInitiator || isSetupAdmin || adminHere,
          myParticipantId: me?.id ?? null,
          /* A guest from another organisation reads nobody's days away but their own (1 October 2026). */
          fromOutside: !(isInitiator || isSetupAdmin || adminHere) && await isFromOutside(this.prisma, requestingUserId, ground.organizationId),
        },
        true,
      ),
    };

    /*
     * THE GLANCE NAMES NOBODY THIS READER MAY NOT READ (request 105, the more private choice). Where people
     * see only themselves, and for anybody on an evaluation check-in who does not run it (the person
     * reviewed, a colleague giving a view, an admin without access), the header counts and names only the
     * reader's own waits, and says only whether they themselves have answered. The list of check-ins and
     * Today apply the same rule (grounds.service, list). See theGlanceAsThisReaderMayReadIt.
     */
    if (out.howItIsGoing?.glance && (whoMaySee.peersHidden || (isEvaluationCheckIn(ground.scenario) && !isInitiator && !runsItForAPattern(ground as any, requestingUserId)))) {
      out.howItIsGoing = {
        ...out.howItIsGoing,
        glance: theGlanceAsThisReaderMayReadIt(out.howItIsGoing.glance, { participantId: me?.id ?? null }, ((ground as any).dependencies ?? []) as any[]),
      };
    }
    /*
     * DECISION 75, ITEM 46: AND A PARTICIPANT'S ONE LINE IS THEIR OWN WAITS ON EVERY CHECK-IN. Where people see each
     * other, somebody who takes part and does not run it still reads only what they wait on or what waits on them,
     * to match their own board. Who has answered stays, since people see each other here.
     */
    else if (out.howItIsGoing?.glance && me && !isInitiator && !isSetupAdmin && !adminHere) {
      const theirOwn = theGlanceAsThisReaderMayReadIt(out.howItIsGoing.glance, { participantId: me.id }, ((ground as any).dependencies ?? []) as any[]);
      out.howItIsGoing = { ...out.howItIsGoing, glance: { ...out.howItIsGoing.glance, inTheWay: theirOwn.inTheWay } };
    }

    /*
     * THE RECORD'S OWN CLOCK (request 117, part 9). The newest thing the board is built from, never the moment it
     * is read. How long a wait has sat is measured to this, and said as the day it began, so the board reads the
     * same at 20:46 and at 20:51 and the next morning, until something new comes in (decision 7).
     */
    const recordsClock = out.lastChangedAt ? new Date(out.lastChangedAt) : now;
    const theGlanceWait = out.howItIsGoing?.glance?.inTheWay;
    if (theGlanceWait?.since) {
      out.howItIsGoing.glance.inTheWay = {
        ...theGlanceWait,
        /* No count of days (request 118, part 6): counted to the board's last change it read "2 days" beside "since 27
           September", and counted to the moment it is read it would change on opening. `sinceSays` says it. */
        daysWaiting: null,
        sinceSays: `since ${theDayItBegan(theGlanceWait.since, recordsClock)}`,
      };
    }

    if (has('phaseSpine')) {
      /*
       * ONE COUNT, FROM THE BOARD'S OWN CLOCK (request 107 e). The header and every session's line are
       * served as sentences from the same open round, capped at the last planned session as the list
       * and Today are (request 97 a), so "Session 1 of 12" never sits beside "Session 2 opened on ...".
       * See one-count-for-the-sessions.
       */
      const planned = totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null;
      /* A finished round hands the count to the next one that has come (theRoundThatHasCome), by the board's own clock. */
      const theRound = theRoundCappedAtThePlan(openRound, planned, mine as any[], now, releaseOne);
      const roundNumbers = Array.from(new Set(checkIns.map((c) => c.sessionNumber))).sort((a, b) => a - b);
      /* The header is drawn from these two numbers ("Session 1 of 12."); see theHeaderSays for its words. */
      out.phaseSpine = {
        startsAt: ground.startsAt,
        endsAt: ground.endsAt,
        currentSession: theRound,
        plannedSessions: planned,
        sessions: roundNumbers.map((n) => {
          const forSession = checkIns.filter((c) => c.sessionNumber === n);
          const allDone = forSession.length > 0 && forSession.every((c) => c.status === CheckInStatus.COMPLETED);
          /* WHEN IT OPENS, FOR A SESSION NOBODY HAS DONE. The team "complained about not knowing when the
             next sessions will start" (Hafsah, 22 Sep 2026); the pill said "Session 2" and nothing else.
             The earliest availableFrom across that session's check-ins is the day it opens. */
          const opens = forSession.map((c: any) => c.availableFrom).filter(Boolean).sort((a: Date, b: Date) => a.getTime() - b.getTime())[0] ?? null;
          const line = whatEachSessionSays(n, mine as any[], theRound, now, releaseOne);
          /* A session somebody has already checked in to, or started, is open, never "upcoming" (request 115 g):
             session 2 read as upcoming while two people had answered it, because session 1 was still open. */
          const somebodyIsIn = forSession.some((c) => c.status !== CheckInStatus.NOT_STARTED);
          return {
            n,
            state: n < theRound || allDone ? 'done' : n === theRound || somebodyIsIn ? 'current' : 'upcoming',
            date: forSession.find((c) => c.completedAt)?.completedAt ?? null,
            opensOn: opens,
            /* The day it opened, never the day somebody finished it, and its line in a full sentence. */
            openedOn: line.openedOn,
            says: line.says,
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
      /*
       * WHAT THE RECORD SAYS THE NUMBER IS, READ WHEN THE ROUND CLOSED.
       *
       * This was worked out here, on every board read, by a rule that never once fired: every word
       * of the target's name in one sentence plus a verb from a list of nine, and then it suggested
       * the COUNT OF MATCHING SENTENCES rather than the number somebody said. A team who reported
       * "nine of the forty teams are migrated" and then "all forty migrated by Friday" left the
       * board reading 0 of 40 at the close.
       *
       * It is the model's reading now, written once when a round closes (board.listener.ts), and
       * this is just the column. See what-the-record-says-a-number-is for why.
       */
      /*
       * WHERE EACH ONE STARTED, WHICH IS WHAT TELLS US WHICH WAY IS GOOD.
       *
       * The lowest session we have a snapshot for, per objective. A target added at session six
       * starts at session six - nobody gets credit for distance covered before anybody was
       * counting. See a-measure-that-goes-down-is-still-going-well.ts. Since decision 69 the lead
       * can also say which way is good (GroundObjective.direction), and where they have, that wins.
       */
      const firstSnapshots = await this.prisma.groundObjectiveSnapshot.findMany({
        where: { groundId },
        orderBy: { sessionNumber: 'asc' },
        select: { objectiveId: true, count: true, sessionNumber: true },
      });
      const startOf = new Map<string, number>();
      for (const s of firstSnapshots) if (!startOf.has(s.objectiveId)) startOf.set(s.objectiveId, s.count);
      /* THE FIRST COUNT IS NOT A RISE (request 130 a). A number counted once, on top of a starting 0 nobody counted, was
         read "81 now, up from 0" and "up 81 this session". With one snapshot at 0 and a count above it, there is no
         "before": prevCount is null, the change is 0, and the journey has no start. */
      const snapshotsOf = new Map<string, number>();
      for (const s of firstSnapshots) snapshotsOf.set(s.objectiveId, (snapshotsOf.get(s.objectiveId) ?? 0) + 1);
      const firstSession = new Map<string, number>();
      for (const s of firstSnapshots) if (!firstSession.has(s.objectiveId)) firstSession.set(s.objectiveId, (s as any).sessionNumber);
      /* Only while that 0 is the newest session's: a 0 that an earlier session closed on, followed by a later session, is a real start. */
      const theFirstCount = (o: { id: string; count: number }) => startOf.get(o.id) === 0 && o.count > 0 && (snapshotsOf.get(o.id) ?? 0) <= 1 && firstSession.get(o.id) === maxSession;
      /*
       * A TARGET COUNTED FROM THE DEALS STARTS WHERE THE DEALS STOOD BEFORE ANYBODY ANSWERED (final real-model check, item 12). Grace's
       * "Units sold by 30 October" was set before Monday's check-ins, and its first snapshot was taken when Monday's round closed, after
       * Kevin sold 40 units at Kilele Hotel, so the board said "It was 40 at the start and is 40 now". Where the target was on record before
       * the first answer of the session it was first counted at, its start is what the deals held then: what was won before that answer.
       */
      const firstAnswerAt = (n: number | undefined) => (checkIns as any[]).filter((c) => c.sessionNumber === n && c.completedAt && !c.isSetup).map((c) => new Date(c.completedAt).getTime()).sort((a, b) => a - b)[0] ?? null;
      const theStartOf = (o: { id: string; count: number; createdAt?: Date | null; ownerParticipantId?: string | null }): number | null =>
        theStartOfATargetFromTheDeals(o, countedFromTheDeals.get(o.id) ?? null, firstAnswerAt(firstSession.get(o.id)), theDealsCounted, startOf.get(o.id) ?? null);

      /*
       * AND WHAT THE LEAD SAYS IS NOT SETTLED ABOUT THIS NUMBER, next to the number.
       *
       * "signed 12m" read as agreed while the lead's own note said nobody had decided whether the
       * 12m is signed or recognised revenue. A reader cannot tell an agreed number from a typed one,
       * so the number carries it - see a-target-nobody-has-defined.
       */
      const notSettledLines = await (this.prisma.groundContextItem?.findMany?.({
        where: { groundId, kind: 'UNSETTLED' as any, closedAt: null },
        select: { text: true },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }) ?? Promise.resolve([] as { text: string }[]))
        .then((rows: { text: string }[]) => rows.map((r) => (r.text ?? '').trim()).filter(Boolean))
        .catch(() => [] as string[]);

      /*
       * WHOSE NUMBERS THIS READER MAY SEE, THROUGH THE RULE THAT OWNS IT.
       *
       * `targetsFor` sits in this module's own folder - whose-number-is-whose-business - written the
       * day a salesperson opened his first check-in and read every colleague's quota, from the best
       * seller's 40 down to the newest person's 13. It had one caller: the conversation. The board
       * showed every owned target to everybody and read `whoSeesTargets` for one purpose only,
       * telling the lead their privacy setting was doing nothing on the targets that had no owner.
       *
       * The lead keeps everything, as they do everywhere else. ONLY THE LEAD, since the U.7 review:
       * this read `runsThisGround`, which lets in any admin of the organisation, while the Context
       * page of the same check-in (grounds.service, `isLead: viewerIsInitiator`) did not. Otieno, an
       * admin not in Wanjiru's check-in, was shown only the team's targets on Context and every
       * person's share, Baraka's included, on the board. That rule, "the check-in's lead sees every
       * share", is reversed by decision 86: an admin, the chief executive included, sees the figures, so
       * whoever runs this check-in (the admin who set it up, an admin of the organisation) sees every
       * share as the lead does, except the lead's own decision about a person (decision 46). Anybody
       * else sees the team's targets and their own share.
       */
      const mayRead = targetsFor(
        ground.objectives as any[],
        me?.id ?? null,
        (ground as any).whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own',
        { isLead: isInitiator, seesEveryShare: runsThisGround },
      ).shown as typeof ground.objectives;

      /*
       * AND NOT WHAT THE LEAD HAS SET FOR A PERSON AND NOT YET TOLD THEM (decision 56). See
       * an-untold-goal-is-not-a-board-objective: the lead's own words in the check-in become objectives that
       * share no sentence with the stored goal, so the sentence wall below never caught them.
       */
      /* Whoever runs it reads a goal not told: the lead, and the admin who set it up (decisions 5 and 86). */
      const untoldRows = theyRunIt ? [] : await this.untoldGoalRows(groundId);
      const { kept: mayReadUntold } = withoutWhatTheLeadHasNotToldThemAbout(mayRead as any[], untoldRows, ground.participants as any[], theyRunIt);

      out.objectives = (mayReadUntold as typeof ground.objectives).map((o) => ({
        /* The lead's own direction where they set one (decision 69); otherwise the words of the name, as before. */
        journey: theJourneySoFar({
          start: theFirstCount(o) ? null : theStartOf(o as any), now: o.count, target: o.target, name: o.name, direction: asADirection((o as any).direction),
          /* A date to meet says its day, and whether it has passed, on the board's own clock (decision 75, item 17). */
          dueDay: theDayItIsDue((o as any).dueOn, now), isPast: aDeadlineHasPassed((o as any).dueOn, now),
        }),
        /*
         * AN AIM TO REACH, OR A LIMIT NOT TO GO OVER, AS THE LEAD SET IT (decision 69). Null: not set.
         * To whoever may read the target, because it is part of the target. The suggestion and the
         * question go to the lead alone, the only person who can answer it (assertInitiatorOfBoardGround
         * on the update route), and only while nobody has answered it.
         */
        direction: asADirection((o as any).direction),
        directionSuggested: isInitiator && o.target != null && asADirection((o as any).direction) == null ? whatTheWordsSuggest(o.name, o.target) : null,
        /* The prototype's own name for the kind ("Up", "Lower is better", "Rate", "Deadline", "Zero"), where the lead set one. */
        kind: (() => { const d = asADirection((o as any).direction); return d ? THE_KINDS_NAME[d] : null; })(),
        /* The day a date to meet is due, "2026-10-30", to whoever may read the target. Null on every other kind. */
        dueOn: asADirection((o as any).direction) === 'DEADLINE' && (o as any).dueOn ? new Date((o as any).dueOn).toISOString().slice(0, 10) : null,
        directionQuestion: isInitiator && asADirection((o as any).direction) == null ? theQuestionAboutWhichWay(o.target) : null,
        /** The lead's own sentence about what is unsettled here, where there is one. Never a block. */
        notSettled: whatIsNotSettledAbout({ name: o.name, target: o.target }, notSettledLines),
        id: o.id, name: o.name, count: o.count, prevCount: theFirstCount(o) ? null : o.prevCount, target: o.target,
        /* Where the count comes from the deals on record (a sales aim), what they hold, in the prototype's words: "65 sold, 40 with proof of payment." */
        fromTheDeals: (() => { const c = countedFromTheDeals.get(o.id); return c ? { counts: c.counts, sold: c.count, proven: c.proven, shown: c.shown ?? 0, ...(c.deposit ? { deposit: c.deposit } : {}), currency: c.currency, says: c.says } : null; })(),
        /* What the target assumes (U.7), to whoever may read the target, and to nobody else. */
        assumes: Array.isArray((o as any).assumes) ? ((o as any).assumes as string[]).filter((a) => typeof a === 'string' && a.trim()) : [],
        /* Where nothing is written down, said plainly rather than left empty (request 115 c). Nothing is made up. */
        assumesSays: (Array.isArray((o as any).assumes) ? ((o as any).assumes as string[]).filter((a) => typeof a === 'string' && a.trim()) : []).length
          ? null
          : isInitiator
            ? 'Nothing on record says what this target assumes yet.'
            : 'Nobody has written down what this target assumes yet.',
        /*
         * WHOSE NUMBER THIS IS. The board listed a target set for one person exactly as it listed the
         * team's, so a sheet of nine rows read as nine things everybody was held to (Hafsah, 22 Sep
         * 2026). The name resolves by the same rule as everywhere else, so a reader who may not see
         * somebody's name sees their role or nothing rather than a placeholder.
         */
        ownerParticipantId: o.ownerParticipantId ?? null,
        owner: o.ownerParticipantId ? nameOf(o.ownerParticipantId) : null,
        delta: theFirstCount(o) ? 0 : o.count - o.prevCount,
        isNew: o.addedAtSession != null && o.addedAtSession >= maxSession,
        // Only present when the record disagrees with the lead's number. Never
        // applied automatically - it is a prompt, not a correction.
        /* Only while it still disagrees: the lead may have accepted it, or typed their own. */
        suggestedCount: o.suggestedCount != null && o.suggestedCount !== o.count ? o.suggestedCount : null,
        /* And the line it was read from, so a lead sees what they are accepting. */
        suggestedSaid: o.suggestedCount != null && o.suggestedCount !== o.count ? o.suggestedSaid : null,
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
              (c) => c.participantId === p.id && c.sessionNumber >= (o.addedAtSession as number) && c.status === CheckInStatus.COMPLETED && !wasAQuietClose(c as any),
            ),
          })),
      }));
      /* A week past, the person reads that the goal exists, with no number (decision 56, item 4). Only they do. */
      if (untoldRows.length) {
        const leadFirst = theFirstNameOfAParticipant((ground.participants as any[]).find((p) => p.partyType === 'INITIATOR')) || 'Your lead';
        const withArea = await Promise.all(untoldRows.map(async (g) => ({ ...g, area: await areaOfGoalOrFallback(this.prisma, g.text ?? '') })));
        for (const say of whatThePersonReadsOfTheirOwnUntoldGoals(withArea, me?.id ?? null, leadFirst, new Date(), { releaseOne: await theReleaseOneSalesBoardIsOn(this.prisma, (ground as any).organizationId).catch(() => false) })) {
          (out.objectives as any[]).push({
            journey: { direction: 'unknown', start: null, now: 0, target: null, say: '', covered: null },
            notSettled: null, id: `lead-set-goal-${(out.objectives as any[]).length}`, name: say, count: 0, prevCount: 0, target: null,
            direction: null, directionSuggested: null, directionQuestion: null, kind: null, dueOn: null,
            assumes: [], ownerParticipantId: me?.id ?? null, owner: null, delta: 0, isNew: false, suggestedCount: null, suggestedSaid: null, askedOf: null,
          });
        }
      }
    }

    /* One row per thing, with one count. See one-count-per-thing. */
    if (Array.isArray(out.objectives)) out.objectives = oneCountPerThing(out.objectives as any[], theLeadsRow);

    /*
     * EACH AIM, AS A FULL SENTENCE ABOUT SOMEBODY, NAMED FOR THIS READER (review of 1 October 2026).
     * After one-count-per-thing, which joins rows on the words as they were stored. "I", "the speaker"
     * and "the person" are whoever set the aim; a row that only says what is counted is its holder
     * aiming at its number. Then the same naming every report goes through, so the reader's own name
     * is "you". The sentences the board wrote itself above (an untold goal) are already finished.
     */
    if (Array.isArray(out.objectives)) {
      const labels = labelsForParties(ground.participants as any);
      const readerLabel = me?.id ? labels.get(me.id) ?? null : null;
      const stored = new Map(((ground.objectives ?? []) as any[]).map((o) => [o.id, o]));
      const othersNames = (ground.participants as any[]).filter((p) => p.id !== me?.id)
        .flatMap((p) => [p.user?.firstName, p.user?.lastName, p.nameGiven].filter(Boolean) as string[]);
      /* A promise to do something is the person's commitment, already on the board as that, and never an aim. See aPromiseNotAnAim. */
      out.objectives = (out.objectives as any[]).filter((o) => !(stored.has(o.id) && aPromiseNotAnAim(stored.get(o.id)?.name)));
      out.objectives = (out.objectives as any[]).map((o) => {
        const row = stored.get(o.id);
        if (!row) return o;
        const setBy = row.setByParticipantId ?? row.ownerParticipantId ?? theLeadsRow;
        const inLabels = anAimAsASentence(o.name, {
          speaker: setBy ? labels.get(setBy) ?? null : null,
          holder: o.ownerParticipantId ? labels.get(o.ownerParticipantId) ?? null : null,
          target: o.target ?? null,
          direction: asADirection(row.direction),
          /* A person's own aim is theirs, never read as a number the lead set (decision 75, item 37). */
          setByTheHolder: anAimTheHolderSet(row, theLeadsRow),
          /* Its day, kept apart from its name (request 117, part 11). */
          dueOnSays: (row as any).dueOn && aDateOnly((row as any).dueOn) ? theDayInWords(aDateOnly((row as any).dueOn)!, now) : null,
        });
        const named = withNames(inLabels, visibleNames, labels.values(), { viewerLabel: readerLabel });
        return { ...o, name: yourOwnWhereYouAreTheSubject(named, othersNames) };
      });
    }

    /*
     * YOUR SHARE, ON A PARTICIPANT'S OWN BOARD (request 107 c; the prototype's B5: "Your share. 4 of
     * your 5 sales so far; 3 paid. Only you and Wairimu see your share."). Only the reader's own
     * targets, from the targets this reader may already read (targetsFor, above), so nothing new is
     * shown: the person running the check-in and an admin get no field, and a goal the lead has not
     * told them about is not here. Who else sees it is said by the check-in's own setting.
     */
    /* RELEASE 4: EACH TARGET CARRIES ITS UNIT, as stored, or "%" for a share to keep at or above (a rate), so "91% of 90%" reads correctly. */
    if (releaseFour && Array.isArray(out.objectives)) {
      const stored = new Map(((ground.objectives ?? []) as any[]).map((o) => [o.id, o]));
      out.objectives = (out.objectives as any[]).map((o) => ({ ...o, unit: theUnitOfATarget(stored.get(o.id) ?? o) }));
    }
    /*
     * RELEASE 4: EACH PERSON'S OWN TARGET BESIDE THE TEAM'S, AND WHY THE NUMBERS DON'T MATCH (the-team-and-each-persons-figures). Only
     * for whoever already reads every target here (the lead and an admin, the same `targetsFor` rule); read only from targets on record.
     */
    if (releaseFour && Array.isArray(out.objectives) && runsThisGround) {
      const nameOfParticipant = (pid: string) => { const p = ((ground as any).participants ?? []).find((x: any) => x.id === pid); return p ? nameOf(p) : null; };
      out.eachPersonsOwn = eachPersonsOwnBesideTheTeams(out.objectives as any[], nameOfParticipant);
      out.whyTheNumbersDoNotMatch = whyTheNumbersDoNotMatch(out.objectives as any[], nameOfParticipant);
    }
    if (!isInitiator && me?.id && Array.isArray(out.objectives)) {
      const mine = (out.objectives as any[]).filter((o) => o.ownerParticipantId === me.id && o.target != null);
      const leadName = theLeadsRow ? nameOf(theLeadsRow) : null;
      /*
       * ALWAYS SENT TO A PERSON WHO CHECKS IN (screens request 110 a). It was left out where they had no number of
       * their own, so the screen could not tell "nothing of yours" from "not sent". Now it is a list, empty where
       * there is nothing, with `yourShareSays` saying so in a sentence.
       */
      out.yourShare = mine.map((o) => ({
        objectiveId: o.id,
        /* On Release 1's sales board, the reader's own deals are named in it (R-5): from their own aim's count only. */
        says: theShareSays(o.name, o.count, o.target, o.direction, releaseOne && countedFromTheDeals.get(o.id) ? { ...(o.fromTheDeals ?? {}), ...(countedFromTheDeals.get(o.id) as any) } : (o.fromTheDeals ?? null)),
        /* With the direct morning on, no note about who else sees it: who reads it is the backend's rule, the same either way. */
        ...(direct ? {} : {
          whoSees: (ground as any).whoSeesTargets === 'EVERYBODY'
            ? 'Everybody in this check-in sees your share.'
            : `Only you and ${(releaseOne ? (leadName ?? '').split(/\s+/)[0] : leadName) || 'the person running this check-in'} see your share.`,
        }),
      }));
      if (!mine.length) out.yourShareSays = YOU_HAVE_NO_SHARE_YET;
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
          /* A field name the model wrote into a value comes out at the read too, for reports already stored (item 21). */
          ? (everyDivergenceReadable(reportSafe.divergences as any[]) as any[]).map((d) => {
              const named = (side: any) => {
                const resolved = visibleNames.get(String(side?.participantLabel ?? '')) ?? side?.participantLabel;
                const whoPrinted = /^(participant\s+[a-z0-9]+|the initiator|initiator)$/i.test(String(resolved ?? '').trim()) ? 'A colleague' : (String(resolved ?? '').trim() || 'A colleague');
                return {
                  ...side,
                  /* The screen prints "{who} said {view}", so a view never starts with its own speaker (request 151, S2). Served only; the stored text is unchanged. */
                  ...(typeof side?.view === 'string' ? { view: withoutItsOwnSpeaker(side.view, whoPrinted) } : {}),
                  participantLabel: resolved,
                  /*
                   * WHAT THE SCREEN PRINTS (U.10). `.participantLabel` must never be printed: a label
                   * nobody could resolve is the engine's own ("Participant A", "the initiator"), and
                   * those read as "a colleague". See docs/answers-from-engine.md.
                   */
                  who: /^(participant\s+[a-z0-9]+|the initiator|initiator)$/i.test(String(resolved ?? '').trim())
                    ? 'A colleague'
                    : (String(resolved ?? '').trim() || 'A colleague'),
                };
              };
              /* A label the model invented - "Person", twice, on a live three-person report - is
                 matched to somebody by position before any name is looked up. See
                 eachSideGetsSomebody. */
              /* A side with no words is not served: Rukia's name was drawn with nothing under it (request 109 d). */
              const real = (sides: any[]) => eachSideGetsSomebody(sides, visibleNames.keys()).map(named)
                .filter((side: any) => String(side?.view ?? side?.says ?? side?.text ?? '').trim());
              const positions = Array.isArray(d?.positions) ? real(d.positions) : null;
              const perspectives = Array.isArray(d?.perspectives) ? real(d.perspectives) : null;
              return {
                ...d,
                ...(positions ? { positions } : {}),
                ...(perspectives ? { perspectives } : {}),
                /* Who sees it differently, everybody named once (request 109 e). See whoSeesThisDifferently. */
                whoSeesIt: whoSeesThisDifferently([...(positions ?? []), ...(perspectives ?? [])].map((x: any) => x.who), me?.id ? nameOf(me.id) : null),
              };
            })
          : [],
        agreements: Array.isArray(reportSafe.agreements) ? reportSafe.agreements : [],
        ...(Array.isArray((reportSafe as any).agreementMarks) ? { agreementMarks: (reportSafe as any).agreementMarks } : {}),
        /* Why it is empty, where it is, rather than one sentence for every reason - see the module. */
        whyNothingYet: whyNothingIsCrossReferenced({
          stillToAnswer: Math.max(0, (out.howItIsGoing?.glance?.progress?.ofPeople ?? 0) - (out.howItIsGoing?.glance?.progress?.answeredThisRound ?? 0)),
          peopleExpected: out.howItIsGoing?.glance?.progress?.ofPeople ?? (ground.participants ?? []).filter((p: any) => !p.managingOnly).length,
        }),
        /* The report's own central question comes first, so the board and the report ask the same one (run-29, loans: the board asked
           "That call has been open a while", a role-map probe, while the report asked about the first repayment). The drafted
           question is only for a report that has none yet. */
        centralQuestion: (typeof reportSafe.centralQuestion === 'string' && reportSafe.centralQuestion.trim() ? reportSafe.centralQuestion : null) ?? sessionShape?.theConversationWorthHaving ?? null,
        settled: sessionShape?.whereThingsStand?.settled ?? [],
        stillOpen: sessionShape?.whereThingsStand?.differences ?? sessionShape?.whereThingsStand?.open ?? [],
        ...(sessionShape?.whereThingsStand?.settledMarks ? { settledMarks: sessionShape.whereThingsStand.settledMarks } : {}),
        ...(sessionShape?.whereThingsStand?.openMarks ? { stillOpenMarks: sessionShape.whereThingsStand.openMarks } : {}),
      };
      /*
       * AND THE REASON THERE IS NOTHING HERE ONLY WHERE THERE IS NOTHING HERE (review of 1 October
       * 2026). "Everybody answered, and nothing in the written report reads as a difference or an
       * agreement yet." went out on 38 boards that listed differences right beside it. The screen
       * hid it; the payload, which the panel and the API read too, said both. It is said only over
       * an empty section now.
       */
      if ((out.divergence.items as any[]).length || (out.divergence.agreements as any[]).length) delete out.divergence.whyNothingYet;
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
      /*
       * NEVER THE ENGINE'S OWN WORKING NOTE (request 107 a). `what` on a gap row is the line the model
       * was given about what the record is missing ("how they are making their number. Not the total:
       * ..."), written for the model and never for a person. The board serves the plain question that
       * was owed, and one sentence about it for this reader; the stored line itself goes nowhere.
       */
      /*
       * A GAP THE RECORD NOW ANSWERS IS NOT STILL UNANSWERED (Drop Access short run, item 12). A gap is settled when a check-in
       * ends; one asked before the rule that settles it was right ("Greenfield is secured for 25 units. And I've got Mama Mboga
       * Mart wanting 2 units.") stayed open, and the board read "Mercy Wairimu has not answered it yet". Read again from the same
       * rule (whatIsStillOwed's saidAbout), from that person's own lines, and on a sales check-in a number made up of what each
       * customer takes (A_NUMBER_MADE_OF_ITS_CUSTOMERS). Nothing is written. Behind Release 1's switch: off, the board reads as before.
       */
      const owedByWhat = new Map([...KEEP_THE_TEAM_ON_TRACK, ...CONNECT_GOALS_ACROSS].map((o) => [o.what, o]));
      const linesOf = new Map<string, { type: string; text: string }[]>();
      const answeredBy = (o: { id: string; saidAbout?: RegExp }, text: string) => !!o.saidAbout && (o.saidAbout.test(text) || (o.id === 'how-the-number-is-made' && A_NUMBER_MADE_OF_ITS_CUSTOMERS.test(text)));
      if (releaseOne && (gapRows as any[]).some((g) => owedByWhat.get(String(g.what ?? ''))?.saidAbout)) {
        const theirs = ((await (this.prisma.recordEntry.findMany({ where: { disputedAt: null, participantId: { in: [...new Set((gapRows as any[]).map((g) => g.participantId))] } } as any, select: { participantId: true, type: true, text: true } as any }) as Promise<any[]>).catch(() => [])) ?? []) as any[];
        for (const l of theirs) linesOf.set(l.participantId, [...(linesOf.get(l.participantId) ?? []), { type: l.type, text: cleanText(l.text ?? '') }]);
      }
      const nowAnswered = (g: any) => {
        const o = owedByWhat.get(String(g.what ?? ''));
        return !!o?.saidAbout && (linesOf.get(g.participantId) ?? []).some((l) => o.satisfiedBy.includes(l.type as any) && answeredBy(o, l.text));
      };
      out.stillUnanswered = (gapRows as any[])
        .filter((g) => g.asked >= 2)
        .filter((g) => !nowAnswered(g))
        .map((g) => {
          const isYou = !!me && g.participantId === me.id;
          const who = isYou ? 'You' : (nameOf(g.participantId) ?? aColleague(g.participantId));
          const question = theOwedThingAskedPlainly(String(g.what ?? ''));
          const n = g.firstRound ?? 1;
          const certain = g.certain !== false;
          const asked = isYou ? 'you were asked' : `${who} was asked`;
          const says = question
            ? (certain
              ? `In session ${n}, ${asked}, "${question}" ${isYou ? 'You have' : `${who} has`} not answered it yet.`
              : `In session ${n}, ${asked}, "${question}" Nothing on record can confirm the answer yet.`)
            : (certain
              ? `${isYou ? 'You have' : `${who} has`} something from session ${n} that is still not answered.`
              : `${isYou ? 'You were' : `${who} was`} asked something in session ${n} that nothing on record can confirm yet.`);
          return { who, what: question ?? 'Something the check-in asked', says, sinceRound: n, certain };
        });
    }

    if (has('checkInGrid') && runsThisGround) {
      /* Whoever runs the check-in reads each person's share, an admin included (decision 86, which
         reverses that part of decision 73), so no share is held back in this section. */
      const sharesStayWithTheirOwner = !runsThisGround && (ground as any).whoSeesTargets !== 'EVERYBODY';
      /*
       * THE ROUND THAT IS OPEN IS THE ONE SOMEBODY HAS STARTED, not the newest row that exists.
       *
       * Rows for the next round are written ahead of time, so taking the highest number meant the
       * board opened a fresh week by telling a manager that all ten people had not answered - a
       * page of red on the morning the round begins, about a round nobody was late for. A round
       * nobody has touched is next week's.
       */
      /* Not held back by somebody an admin has not let in yet (decision 77): the same givers as the header. */
      const heldAtTheDoor = new Set(ground.participants.filter((p: any) => isNotLetInYet(p)).map((p: any) => p.id));
      const roundRows = checkIns.filter((c) => !heldAtTheDoor.has(c.participantId) || c.status === CheckInStatus.COMPLETED || c.status === CheckInStatus.DECLINED);
      /* And never set by the lead's own extra check-in (journey test, 12 October): theTeamsOpenRound. */
      const openRound = theTeamsOpenRound((roundRows.length ? roundRows : checkIns) as any, ground.participants as any);
      /*
       * WHAT THIS ROUND PUT ON THE RECORD, so the board can say whether it holds anything to count.
       * The record, not the rating: the lead may read what was written down, and never how anybody's
       * answers were scored. A line somebody disputed has stopped counting, here as everywhere.
       */
      const thisRoundsCheckIns = checkIns.filter((c) => c.sessionNumber === openRound).map((c) => c.id);
      const thisRoundsLines = thisRoundsCheckIns.length
        ? ((await this.prisma.recordEntry?.findMany?.({
            where: { checkInId: { in: thisRoundsCheckIns }, disputedAt: null },
            select: { checkInId: true, text: true, anchoredDocumentId: true, documentSays: true },
          })?.catch(() => [])) ?? []) as any[]
        : [];
      /*
       * WHETHER A CHECK-IN'S ANSWERS CAN BE CHECKED. The question as asked: did ANY turn carry a date,
       * a number or a document. The level is a mean, and a reluctant person's one fact drowned in
       * their "fine"s (adversarial run, 20 Sep 2026), so `checkable` answers first. A check-in not
       * read yet is never marked for want of a read: the record of it answers instead.
       */
      /*
       * A DOCUMENT OR A PHOTO ON THE RECORD THAT BACKS A LINE MAKES IT CHECKABLE, whatever the conversation's own read said
       * (pilots after fixes, A5). Brian sent his draft as a PDF and a photo, and Aisha her registry receipt, and the board
       * still read "Nothing ... can be checked yet ... Ask ... for a photo", because the model had read the session as vague.
       */
      const backedByADocument = new Set(thisRoundsLines.filter((e: any) => !!e.anchoredDocumentId).map((e: any) => e.checkInId));
      const checkableRead = (c: any, recordHasSomething: boolean): boolean => aRoundCanBeChecked(c, recordHasSomething, backedByADocument.has(c?.id));
      const somethingToCount = new Set(
        thisRoundsLines
          .filter((e) => hasANumberADateOrADocument({ text: cleanText(e.text ?? ''), anchoredDocumentId: e.anchoredDocumentId, documentSays: e.documentSays }))
          .map((e) => e.checkInId),
      );
      /*
       * WHO THE ORGANISATION DID NOT LET IN (screens request 85). Somebody an admin declined at the
       * door cannot be asked to check in, so the row says what happened rather than asking the lead
       * to chase them. Read the way the People page and the check-in's own roster read it: this
       * organisation's latest request for each waiting person decides it. Only rows for whoever
       * runs the check-in or an admin are built at all, so the decider's name goes no wider than
       * the same rule in GET /grounds/:id.
       */
      const notLetInByUser = new Map<string, { by: string | null; at: Date | null }>();
      const waitingUserIds = ground.participants
        .filter((p: any) => !!p.userId && p.user?.awaitingOrgApproval)
        .map((p: any) => p.userId as string);
      if (waitingUserIds.length && (ground as any).organizationId) {
        const declined = await whoAnAdminDidNotLetIn(this.prisma, (ground as any).organizationId, waitingUserIds);
        const deciderIds = new Set([...declined.values()].map((d) => d.decidedByUserId).filter((x): x is string => !!x));
        const deciders: any[] = deciderIds.size
          ? (await (this.prisma as any).user.findMany({ where: { id: { in: [...deciderIds] } }, select: { id: true, firstName: true, lastName: true } })) ?? []
          : [];
        const deciderName = new Map(deciders.map((d) => [d.id, [d.firstName, d.lastName].filter(Boolean).join(' ').trim() || null]));
        for (const [userId, d] of declined) {
          notLetInByUser.set(userId, { by: deciderName.get(d.decidedByUserId ?? '') ?? null, at: d.decidedAt ?? null });
        }
      }
      /* Everybody not let in yet, declined or still waiting: the same givers as the header's count (decision 77, request 121 part 4). */
      const heldBack = await whoIsNotLetInYet(this.prisma, ground.participants as any[], (ground as any).organizationId);
      /* Who missed the check-ins just before their latest one, so a row never reads "nothing here needs you" after two missed (night quality run 1). */
      const missedJustBefore = await whoMissedTheCheckInsJustBefore(this.prisma, groundId).catch(() => new Map<string, number[]>());
      out.eachPerson = whereEachPersonIs(
        /*
         * AND THE MANAGER IS NOT IN THEIR OWN LIST.
         *
         * The initiator checked in once to set the context and does not carry a number; ranked
         * among the people she manages she came out top, "has not answered", about a round she is
         * not running. This read is what to do about other people.
         */
        /*
         * AND NOBODY ELSE'S LIST EITHER (pilots, 13 October 2026, problem 11). Read by the admin, Wanjiru's board said "Njeri
         * Kamau has not checked in for this session yet. Ask Njeri Kamau to check in." about the lead. The lead answers her
         * own check-in when she chooses, so she is never chased or marked as not answered, whoever is reading.
         */
        ground.participants.filter((p) => !p.managingOnly && p.id !== me?.id && (p as any).partyType !== 'INITIATOR').map((p) => {
          /* Their share, to whoever may read it: the same rule as the targets above (U.7 review). An
             admin standing in reads each person's number too (decision 86). */
          const theirs = sharesStayWithTheirOwner
            ? undefined
            : (ground.objectives ?? []).find((o: any) => o.ownerParticipantId === p.id);
          const mine = checkIns.filter((c) => c.participantId === p.id);
          const thisRound = mine.find((c) => c.sessionNumber === openRound);
          return {
            participantId: p.id,
            /* A person whose name this reader may not resolve still has a row: the read is about
               what to do, and "a colleague" with a three-week blocker is still worth acting on. */
            who: nameOf(p.id) ?? aColleague(p.id),
            /*
             * "Hafsah · no name given" - read on a live board, 23 September 2026, beside a report
             * that called the same person "Hafsah (Coamana)".
             *
             * `nameOf` above falls back to the name somebody typed at the end of an open link, and
             * this asked a narrower question - does she have an ACCOUNT name - so anybody who gave
             * their name on the link got their real name printed and "no name given" beside it.
             * The two now ask the same question, which is the whole point of the flag: is this
             * label a name, or a role standing in for one.
             */
            nameIsTheirRole: !(
              [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim()
              || ((p as any).nameGiven ?? '').trim()
            ),
            /* Declined by an admin, or still waiting to be let in (decision 77): neither can be asked to check in. */
            notLetIn: p.userId && notLetInByUser.has(p.userId)
              ? { by: notLetInByUser.get(p.userId)!.by, at: notLetInByUser.get(p.userId)!.at, declined: true }
              : (heldBack.has(p.id) ? { by: null, at: null, declined: false } : undefined),
            target: theirs?.target ?? null,
            count: theirs?.count ?? 0,
            answeredThisRound: thisRound?.status === CheckInStatus.COMPLETED && !wasAQuietClose(thisRound as any),
            roundsSoFar: new Set(mine.map((c) => c.sessionNumber)).size,
            missedJustBefore: missedJustBefore.get(p.id)?.length ?? 0,
            inTheWay: (ground.dependencies ?? [])
              .filter((d: any) => d.fromParticipantId === p.id && d.status !== 'CLEARED')
              .map((d: any) => ({
                what: d.what,
                /* A thing is never said as who something comes from (request 107 b): "a decision on who owns them" is nobody. */
                owner: d.onParticipantId ? nameOf(d.onParticipantId) : (aPartyOutside(d) ? (d.onLabel ?? null) : null),
                /* With the reader themselves: the ask is theirs, not "speak to <their own name>" (request 65). */
                onTheReader: !!me?.id && d.onParticipantId === me.id,
                /* Measured to the record's own clock and said as the day it began, never counted from the reading (request 117, part 9). */
                days: wholeDaysTo(d.createdAt, recordsClock),
                since: d.createdAt ? theDayItBegan(d.createdAt, recordsClock) : null,
                /* Read off their own words. Nobody has said is 'nothing', which is the truth. */
                tried: whatTheyTried(d.triedSaid ?? ''),
              })),
            /* The check-in's own read where there is one; the record of it where it has not been read yet. */
            saidAnythingCheckable: !!thisRound && checkableRead(thisRound, somethingToCount.has(thisRound.id)),
            nothingCheckableInARow: (() => {
              let n = 0;
              for (const c of [...mine].filter((c) => c.status === CheckInStatus.COMPLETED && c.sessionNumber <= (thisRound?.sessionNumber ?? 0)).sort((a, b) => b.sessionNumber - a.sessionNumber)) {
                if (checkableRead(c, c.id === thisRound?.id ? somethingToCount.has(c.id) : true)) break;
                n += 1;
              }
              return n;
            })(),
            noProof: !!thisRound && ((thisRound as any).specificityDimensions as any)?.evidence != null
              && (thisRound as any).specificityDimensions.evidence !== 'specific',
            roundIsA: (ground as any).cadence === 'WEEKLY' ? 'week' : (ground as any).cadence === 'FORTNIGHTLY' ? 'fortnight' : (ground as any).cadence === 'MONTHLY' ? 'month' : 'check-in',
            /* Decision 53, item 11: an admin standing in, who cannot see this person's target, is
               never told "nothing here needs you this week" as if that were known to be true. */
            targetHiddenFromReader: sharesStayWithTheirOwner,
          };
        }),
        /* The planned length, for the only honest read of pace. Without one it says nothing
           rather than guessing the bar - see behindThePace. */
        (ground as any).totalSessions ?? null,
      );
      /*
       * AND WHAT THE RECORD SAYS ABOUT EACH OF THEM, IN THE PRODUCT'S WORDS. "Grace - nothing to do"
       * sat on a board while Grace's own record said her maize was late and the hire income was
       * paying the loan (run 6, 21 Sep 2026). The finding per person is written at synthesis from
       * the record; the row carries it, with the label resolved for this reader.
       */
      const findings = Array.isArray((ground as any).report?.findings) ? ((ground as any).report.findings as any[]) : [];
      if (findings.length) {
        const byId = new Map(findings.map((f) => [f.participantId, f]));
        /* The served finding carries no label any more (see a-finding-is-served-without-its-label),
           so the one this row strips off the front is derived the way the report was written. */
        const labelOf = labelsForParties(ground.participants as any);
        out.eachPerson = (out.eachPerson as any[]).map((row) => {
          const f = byId.get(row.participantId);
          if (!f) return row;
          const label = String(labelOf.get(row.participantId) ?? '');
          const named = label
            ? String(f.text ?? '').replace(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), row.who ?? 'They')
            : String(f.text ?? '');
          /* Each fact once per row: a wait the row already says is not said again in the finding (request 117, part 7). */
          const waitsTheRowSays = /\bwaiting\b/.test(`${row.says ?? ''} ${row.ask ?? ''}`)
            ? ((ground as any).dependencies ?? []).filter((d: any) => d.fromParticipantId === row.participantId && d.status !== 'CLEARED').map((d: any) => String(d.what ?? ''))
            : [];
          const text = aFindingThatDoesNotSayTheWaitAgain(named, waitsTheRowSays);
          if (!text) return row;
          return { ...row, finding: text, hasGap: !!f.hasGap, ...(f.mark ? { findingMark: f.mark, findingMarkSays: f.markSays, ...(f.markNote ? { findingMarkNote: f.markNote } : {}) } : {}) };
        });
      }
    }

    /*
     * THE SAME THING, STILL OPEN, FOR THREE CHECK-INS (week 12, screens requests 3c and 11): the
     * prototype's "Samuel has chased the same 5 leads for 3 check-ins", from the record's own counts
     * and never from a rating. To the lead only: it is one person's work across their check-ins, so
     * no colleague reads it. An admin with access to the check-in reads it too (decision 93, row 9). See the-same-thing-for-three-check-ins.
     */
    if (isInitiator || adminHere) {
      out.toLookAt = await this.whatHasStayedTheSameFor(groundId, ground as any, checkIns as any[], rawDependencies, me?.id ?? null, nameOf, aColleague);
    }

    /*
     * AND NOBODY THIS PAGE SHOWS AS SOMETHING TO LOOK AT IS "NOTHING HERE NEEDS YOU" (review of
     * 1 October 2026). On the sales run the lead read "Femi Okonkwo has checked in, and nothing here
     * needs you this week." above "Femi Okonkwo has had the same thing in the way for 3 check-ins.",
     * and Kwame Mensah got the same line while a difference two sections up was about his count. A
     * person named in a difference on this board, or in what keeps coming up, has something here.
     */
    if (Array.isArray(out.eachPerson)) {
      /* And where the report opens with a disagreement it never listed (contractreview, run 21), the
         people that opening names are in it. See the-quick-read-agrees-with-the-report. */
      const sp = ((ground as any).report?.sharedPicture as string | null) ?? '';
      const theOpening = theDisagreementTheReportOpensWith(sp) ? String(sp).split(/\n\s*\n/)[0] : '';
      out.eachPerson = notNothingWhereThePageSaysSomething(
        out.eachPerson as any[],
        [
          ...(theOpening
            ? (out.eachPerson as any[]).filter((r) => String(r.who ?? '').trim() && theOpening.includes(String(r.who).trim())).map((r) => ({ participantId: r.participantId, who: null }))
            : []),
          ...((out.toLookAt as any[] | undefined) ?? []).map((t) => ({ participantId: t?.participantId ?? null, who: null })),
          ...((out.divergence?.items as any[] | undefined) ?? []).flatMap((d) => [...(d?.positions ?? []), ...(d?.perspectives ?? [])])
            .map((side: any) => ({ participantId: null, who: typeof side?.who === 'string' ? side.who : null })),
        ],
      );
    }

    if (has('checkInGrid')) {
      out.checkInGrid = {
        sessions: Array.from(new Set(checkIns.map((c) => c.sessionNumber))).sort((a, b) => a - b),
        /* A lead who only manages does not check in, so she has no row in "Who checked in" (B-079): an empty square beside her name read as a missed session. */
        rows: ground.participants.filter((p) => !p.managingOnly).map((p) => ({
          participantId: p.id,
          name: nameOf(p.id),
          /* Managing only is an internal flag, never said as a role: the real role is the lead's own words, or nothing. */
        role: theLeadsWordsAbout(p, isInitiator) ?? null,
          // A managing-only lead has no account of their own and is not counted
          // in readiness, so their row is dashes, not "overdue".
          managingOnly: p.managingOnly,
          cells: Object.fromEntries(
            Array.from(new Set(checkIns.map((c) => c.sessionNumber))).map((n) => {
              if (p.managingOnly) return [n, 'na'];
              const ci = checkIns.find((c) => c.participantId === p.id && c.sessionNumber === n);
              if (!ci) return [n, 'na'];
              /* Closed by the clock with nothing said: missed, never "Checked in" (decision 8, night run 3). */
              if (ci.status === CheckInStatus.COMPLETED && wasAQuietClose(ci as any)) return [n, 'missed'];
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
        where: { disputedAt: null, participant: { groundId }, type: { in: ['COMMITMENT', 'SUCCESS_DEFINITION', 'INTENT', 'PROGRESS'] } },
        select: { id: true, participantId: true, type: true, text: true, checkInId: true, createdAt: true, ...WHAT_A_MARK_READS },
        orderBy: { createdAt: 'asc' },
      });
      /* How each line is known, by the same rule as the reports (week 6b). Stored columns only. */
      const whoAdded = await whoAddedEachBackingDocument(this.prisma, entries as any[]);
      /* What each person typed in their own check-ins, so a line is quoted only in words they said. See
         what-each-person-said-is-in-their-name. */
      const typed = await whatEachHandoffPersonTyped(
        this.prisma,
        (entries as any[]).map((e) => ({ fromParticipantId: e.participantId, sourceCheckInId: e.checkInId })),
        checkIns as any[],
      );
      /*
       * AND WHAT THEY PROMISED IN A CHECK-IN (request 130 b). A commitment said in a check-in is stored as
       * its own row (GroundCommitment, source CHECK_IN), and this panel read only record lines, so a person
       * whose promise was stored there and nowhere else had an empty list here: Aisha committed to a photo
       * of the delivery sheets and "Who owns what" sent her nothing. Only the person's own check-in promises
       * (never a paste or a lead's line), never one that was dropped, and never one already here in the same
       * words. Quoted only where the row says it is their words, word for word.
       */
      const promisedInACheckIn = (((await ((this.prisma as any).groundCommitment?.findMany?.({
        where: { groundId, source: 'CHECK_IN', participantId: { not: null } },
        orderBy: { createdAt: 'asc' },
      }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[])
        .filter((c) => c?.source === 'CHECK_IN' && !!c.participantId && c.status !== 'DROPPED' && c.explicit !== false && typeof c.text === 'string' && c.text.trim());
      /*
       * WHO "HIM" IS (Drop Access short run, 18 October), with Release 1's switch on: a line that says "him" is read against the
       * line before it in that person's check-in, and where that line names one person on record, the name is carried as
       * `himIs` for eachLineInTheirName, which says it only where the reader may read their words. See who-him-is-in-their-check-in.
       */
      const himIsIn = new Map<string, { wordsWithHim: string; withTheName: string }>();
      /* "Him" in the words the reader is served: their own typed sentences where the line came from them. */
      const servedWords = (e: any) => inTheirOwnWords(cleanText(e.text), e.checkInId ? typed.get(e.checkInId) : undefined).text;
      const saysHim = releaseOne ? (entries as any[]).filter((e) => e.checkInId && /\bhim\b/i.test(servedWords(e))) : [];
      if (releaseOne && saysHim.length) {
        const ids = [...new Set(saysHim.map((e) => e.checkInId as string))];
        const turns = (((await ((this.prisma as any).conversationTurn?.findMany?.({
          where: { checkInId: { in: ids }, role: { in: ['AI', 'PERSON'] } },
          select: { checkInId: true, role: true, content: true },
          orderBy: { createdAt: 'asc' },
        }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[]);
        const contacts = (((await ((this.prisma as any).workItem?.findMany?.({ where: { groundId, kind: 'deal' }, select: { fields: true } }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[])
          .map((d) => theContactOf(d?.fields ?? null) ?? '').filter(Boolean);
        const namesOf = (p: any) => [[p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim(), String(p?.user?.firstName ?? p?.nameGiven ?? '').trim().split(/\s+/)[0] ?? '', String(p?.nameGiven ?? '').trim()].filter((n) => n.length > 1);
        const people = [...(ground.participants as any[]).flatMap(namesOf), ...contacts];
        for (const e of saysHim) {
          const owner = (checkIns as any[]).find((c) => c.id === e.checkInId)?.participantId;
          if (owner !== e.participantId) continue;
          const words = servedWords(e);
          const them = (turns as any[]).filter((t) => t.checkInId === e.checkInId).map((t) => ({ role: String(t.role ?? 'PERSON'), content: String(t.content ?? '') }));
          const speaker = namesOf((ground.participants as any[]).find((p) => p.id === e.participantId));
          const named = theirWordsWithTheName(words, them, people, speaker);
          if (named) himIsIn.set(e.id, { wordsWithHim: words, withTheName: named });
        }
      }
      /* The reader's own names, so their name inside a promise is said as "you" (the work plan's rule). */
      const myNames = me
        ? [[(me as any).user?.firstName, (me as any).user?.lastName].filter(Boolean).join(' ').trim(), ((me as any).user?.firstName ?? '').trim()].filter((n) => n.length > 1)
        : [];
      /* Each line with when it was said, so promises and record lines read in the order they were said. */
      const theirPromises = (pid: string) => promisedInACheckIn
        .filter((c) => c.participantId === pid)
        /* Never somebody else's promise as theirs (Hafsah's point 13, Release 1). */
        .filter((c) => !(releaseOne && aPromiseSomebodyElseMade(cleanText(c.text))))
        /* The same promise in other words is one promise: the sameness rule the writer uses (request 130 b, review). */
        .filter((c) => !entries.some((e) => e.participantId === pid && e.type === 'COMMITMENT' && theSameMeasure(cleanText(e.text), cleanText(c.text))))
        .map((c) => {
          const text = cleanText(c.text);
          const mark = theMarkOf({ type: 'COMMITMENT', text, recallBased: false, participantId: pid } as any, whoAdded);
          /* Not kept word for word: said in our voice from the promise, never an empty "has made a commitment". */
          const clause = c.saidWordForWord === true ? null : whatTheyCommittedTo(text, pid, me?.id ?? null, myNames);
          return {
            at: new Date(c.createdAt ?? 0).getTime(),
            line: {
              id: c.id, type: 'COMMITMENT', text: clause ?? text,
              saidAs: (c.saidWordForWord === true ? 'their-words' : clause ? 'what-they-committed-to' : 'not-their-words') as string,
              mark, markSays: WHAT_EACH_MARK_SAYS[mark],
              sessionNumber: typeof c.statedInSession === 'number' ? c.statedInSession : null,
            },
          };
        });
      out.whoOwnsWhat = ground.participants
        .filter((p) => !p.managingOnly)
        .map((p) => ({
          participantId: p.id,
          /* The reader's own heading is "You", never their own name (run-26, cofounder). */
          name: p.id === me?.id ? 'You' : nameOf(p.id),
          role: theLeadsWordsAbout(p, isInitiator),
          /*
           * `cleanText`, NOT `e.text`. This panel is read by a person, and the stored text still
           * carries the engine's own markers - a live board showed
           * "[VERIFIABILITY:HIGH] We need to hit 270 units this year." under somebody's name.
           * Everywhere else that renders an entry already strips them; this was the one that did
           * not. `loadReadInput` below deliberately keeps the raw text, because the tiering in
           * reads.ts is the thing that READS the marker - that one is not a surface.
           */
          items: entries.filter((e) => e.participantId === p.id).map((e) => ({ at: new Date((e as any).createdAt ?? 0).getTime(), line: {
            id: e.id,
            /* Somebody else's promise, kept before it was filed as theirs, reads as what happened, never as this person's
               commitment or their "Will do" (Hafsah's point 13, behind Release 1's switch). */
            type: releaseOne && e.type === 'COMMITMENT' && aPromiseSomebodyElseMade(cleanText(e.text)) ? 'PROGRESS' : e.type,
            ...inTheirOwnWords(cleanText(e.text), e.checkInId ? typed.get(e.checkInId) : undefined),
            /* Never served as it is: eachLineInTheirName says it only where these same words reach the reader as theirs. */
            ...(himIsIn.has(e.id) ? { theNameForHim: himIsIn.get(e.id) } : {}),
            mark: theMarkOf({ ...(e as any), text: cleanText(e.text) }, whoAdded),
            markSays: WHAT_EACH_MARK_SAYS[theMarkOf({ ...(e as any), text: cleanText(e.text) }, whoAdded)],
            sessionNumber: checkIns.find((c) => c.id === e.checkInId)?.sessionNumber ?? null,
          } })).concat(theirPromises(p.id) as any[])
            .sort((a, b) => a.at - b.at)
            .map((x) => x.line) as any[],
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
        from: d.fromParticipantId && d.fromParticipantId === me?.id ? 'You' : nameOf(d.fromParticipantId),
        fromParticipantId: d.fromParticipantId,
        what: d.what,
        on: d.onParticipantId ? (d.onParticipantId === me?.id ? 'You' : nameOf(d.onParticipantId)) : d.onLabel,
        onParticipantId: d.onParticipantId,
        status: d.status,
        then: d.then,
        /* How often it was raised, and over which days (request 107 c; the prototype's "Raised: 3 times, 1 Sep to 23 Sep"). */
        raised: howOftenItWasRaised((d as any).raisedAt),
      })).map((d) => ({
        ...d,
        /* Who waits on whom, in one sentence for this reader, in place of "Waiting on: <on>" (request 115 h). */
        waitingSays: aWaitSaidInFull(d, me?.id ?? null),
      }));
    }

    if (has('decisions')) {
      out.decisions = this.deriveDecisions(
        Array.isArray(reportSafe?.divergences) ? (reportSafe!.divergences as any[]) : [],
        /* "Mercy Wairimu is waiting on approval, so it needs deciding." was a school board's own approval (final real-model check, item 2). */
        (ground.dependencies as any[]).filter((d) => !notABlockerTheyRaised(d, { sales: isASalesKind((ground as any).kindOfWork), keepTheAsks: true, keepWhatCleared: true })),
        nameOf,
        /*
         * AND WHAT THE LEAD WROTE DOWN AS STILL TO DECIDE, once they have shared it.
         *
         * Six decisions nobody had made came out of one paste and lived on a page only the lead
         * opens. They are decisions about the work, not about a person, which is exactly what this
         * section is - so they belong here the moment the lead shares the note.
         */
        await this.whatTheLeadSaysIsStillToDecide(groundId),
        (label: string) => visibleNames.get(label),
        {
          meId: me?.id ?? null,
          leadId: theLeadsRow,
          /* The same rule the switchboard's sections read a wait by (handoffMayBeRead, below). */
          mayRead: (d) => {
            const evaluation = isEvaluationCheckIn(ground.scenario);
            const runsIt = isInitiator || runsItForAPattern(ground as any, requestingUserId);
            if (adminHere && !runsIt && evaluation) return false;
            if (runsIt || (runsThisGround && !evaluation)) return true;
            const others = (ground.participants as any[])
              .filter((p) => p.id !== theLeadsRow && !p.managingOnly)
              .flatMap((p) => [`${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim(), (p.user?.firstName ?? '').trim(), (p.nameGiven ?? '').trim()])
              .filter((n) => n.length > 1);
            const namesSomebody = others.some((n) => new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(d.what ?? ''));
            if (d.fromParticipantId && d.fromParticipantId === theLeadsRow && (evaluation || namesSomebody)) return false;
            if (!(whoMaySee.peersHidden || evaluation)) return true;
            return !!me?.id && (d.fromParticipantId === me.id || d.onParticipantId === me.id);
          },
        },
      );
      /*
       * WHAT THE LEAD CAN DO ABOUT EACH ONE (screens request 112 b): to the lead alone, the one person who can act on
       * it. The ids it is built from are taken off for every reader. See what-needs-you-and-what-to-do.
       */
      out.decisions = ((out.decisions ?? []) as any[]).map(({ contextItemId, waitsOn, ...d }: any) => (isInitiator
        ? { ...d, action: whatToDoAboutADecision({ ...d, contextItemId, waitsOn }, groundId, theLeadsRow, (pid) => nameOf(pid)) }
        : d));
    }

    // #12: nothing ever asked the lead to set targets, so "what we are aiming
    // for" sat empty for a whole quarter and the summary read "no change" after
    // twelve productive weeks. The board now says so plainly, to the one person
    // who can fix it.
    if (has('objectives') && (out.objectives ?? []).length === 0 && isInitiator) {
      out.objectivesPrompt =
        'No targets set yet, so there is nothing for this board to measure progress against. Add two or three things this ground is aiming for.';
    }

    /*
     * WHAT THE ROOM IS ABOUT. Read when a round closes (board.listener.ts), served here as it was
     * stored. Null is said out loud rather than rendered as an empty heading: "not read yet" and
     * "nobody named a place" are different facts and a blank block cannot tell them apart.
     */
    if (has('whatTheRoomIsAbout')) {
      const room = (ground as any).whatTheRoomIsAbout as { aims?: any[]; places?: any[]; things?: any[] } | null;
      out.whatTheRoomIsAbout = room
        ? {
            aims: Array.isArray(room.aims) ? room.aims : [],
            places: Array.isArray(room.places) ? room.places : [],
            things: Array.isArray(room.things) ? room.things : [],
            readAtSession: (ground as any).whatTheRoomIsAboutSession ?? null,
          }
        : null;
      if (!room) {
        out.whatTheRoomIsAboutNote = 'This is read when a round closes. Nothing has closed yet, so there is nothing to add up.';
      }
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
        const held = await whatThisSessionHolds(this.prisma, groundId, openRound, theMovementsReader);
        /*
         * THE DIFFERENCE THE PAGE IS SHOWING IS THE DIFFERENCE THE TILE COUNTS. Read live, 22 Sep
         * 2026: the tile said "Nothing to compare yet" on a board whose own session report, one
         * click away, named "the definition of a 'verified' supplier" and what would settle it. The
         * tile counted the live report's divergences; the section under it renders the round's. They
         * are two readings of one round and the tile takes whichever has found something.
         */
        const openHere = Array.isArray(sessionShape?.whereThingsStand?.differences ?? sessionShape?.whereThingsStand?.open) ? (sessionShape!.whereThingsStand!.differences ?? sessionShape!.whereThingsStand!.open).length : 0;
        const divCount = Math.max(openHere, Array.isArray(reportSafe?.divergences) ? (reportSafe!.divergences as any[]).length : 0);
        const agreedCount = Array.isArray(reportSafe?.agreements) ? (reportSafe!.agreements as any[]).length : 0;
        const eng = (reportSafe?.engagement ?? {}) as Record<string, any>;
        const firstDivergence = Array.isArray(reportSafe?.divergences)
          ? (reportSafe!.divergences as any[])[0]
          : null;
        out.quickRead = atAGlanceTiles({
          agreed: agreedCount, stillOpen: divCount, movedOnTargets: held.movedOnTargets, blocked: held.blocked, waiting: held.waiting,
          /* How many exist, so "no target set" is only said where none is - see whatThisSessionHolds. */
          targetsSet: held.targetsSet,
          targetsWithANumber: held.targetsWithANumber,
          targetsMoved: held.targetsMoved,
          /* How many have still to answer, from the one counter - the tile said "not everybody has
             answered yet" on every board because this was never passed and undefined is not zero. */
          stillToAnswer: Math.max(0, (out.howItIsGoing?.glance?.progress?.ofPeople ?? 0) - (out.howItIsGoing?.glance?.progress?.answeredThisRound ?? 0)),
          backedPct: eng.documentBackedPct ?? null, numberWasSaid: false,
          /* Named rather than counted - see atAGlanceTiles. */
          theDifference: typeof firstDivergence?.topic === 'string' ? firstDivergence.topic : null,
          theBlocker: held.theFirstBlocker,
          worries: held.worries,
          theWorry: held.theFirstWorry,
          whyNoWorry: held.whyNoWorryIsShown,
          waitsFromEarlier: held.waitsFromEarlier,
        });
      }
      /* The same first blocker as the top line, from the one place that picks it (request 88). */
      {
        /* Whether the top line's wait is a hard one, so a tile counting hard blockers never names a softer wait (item 21). */
        const oldest = String(out.howItIsGoing?.glance?.inTheWay?.oldest ?? '').trim().toLowerCase();
        const itsRow = oldest ? ((ground as any).dependencies ?? []).find((d: any) => d.status !== 'CLEARED' && String(d.what ?? '').trim().toLowerCase() === oldest) : null;
        out.quickRead = theBlockersTileNamesThis(out.quickRead as any, out.howItIsGoing?.glance?.inTheWay?.oldest ?? null,
          itsRow ? { itIsHard: itsRow.status === 'BLOCKING' } : {});
      }
      /* And the waits are counted once: the tile says the number the top line and the Blockers section say. */
      out.quickRead = theQuickReadCountsTheWaitsTheBoardCounts(out.quickRead as any, out.howItIsGoing?.glance?.inTheWay?.count) as any;
      /* And never "no disagreement" over a report that opens with one. See the-quick-read-agrees-with-the-report. */
      out.quickRead = theQuickReadAgreesWithTheReport(out.quickRead as any, ((ground as any).report?.sharedPicture as string | null) ?? null) as any;
      out.quickRead = theDifferencesReadAgreesWithTheQuestion(out.quickRead as any, ((ground as any).report?.centralQuestion as string | null) ?? null) as any;
    }

    // Loaded once and shared. It was fetched twice, running every one of these
    // queries a second time to produce the same answer.
    if (has('contribution') || has('coverage')) {
      const readInput = await this.loadReadInput(ground);
      /*
       * THE REMIT IS THE LEAD'S WORDS, SO IT GOES ONLY TO WHOEVER RUNS THE CHECK-IN. Request 36.
       *
       * `remit` is `roleAsDescribed`, the sentence the lead typed about the person when inviting
       * them. It reached every reader of the board: on a live-shaped board, the person and a peer
       * both read "Daniel - Your sales manager, who you said is not meeting his agreed targets".
       * The same rule as the roster's `role` above: the lead reads it, nobody else, not even an admin
       * (U.7 review).
       * `remitDefined` stays, because it says only that a role was given, not what it says.
       */
      if (has('contribution')) {
        /* Only the person reads their own rating; everybody else, the lead and an admin included,
           reads "Nothing checkable" or nothing (decisions 38, 40, 43). Done before the wording, so
           no rating is ever handed to the model to word either. */
        /* Somebody still waiting for the organisation to let them in is not "has not checked in yet": they
           cannot, and the lead is not to be asked to chase them (request 85). Their row says nothing. */
        const waitingAtTheDoor = new Set(ground.participants.filter((p: any) => p.user?.awaitingOrgApproval).map((p: any) => p.id));
        /* Invited and not joined yet (Hafsah, 13 October): never "has not checked in yet"; said for what it is. */
        const notJoinedOnTheBoard = await whoHasNotJoinedYet(this.prisma, ground.participants as any[]).catch(() => new Set<string>());
        out.contribution = contributionAsThisReaderMayRead(buildContribution(readInput, nameOf), me?.id ?? null)!
          .map((r) => ({
            ...r,
            ...(r.notCheckedInYet && waitingAtTheDoor.has(r.participantId) ? { reason: null } : {}),
            ...(r.notCheckedInYet && !waitingAtTheDoor.has(r.participantId) && notJoinedOnTheBoard.has(r.participantId)
              ? { reason: theNotJoinedYetLine([r.name ?? null]), notJoinedYet: true } : {}),
            remit: theLeadsWordsAbout({ roleAsDescribed: r.remit }, isInitiator),
          }));
      }
      /*
       * HELP NOBODY MENTIONED (request 115 c): a colleague named somebody as the reason something moved,
       * and that person's own lines say nothing about it. Whoever runs the check-in, and an admin with access to it
       * (decision 93, row 10); who said it is never served. See help-nobody-mentioned.
       */
      if (runsItForAPattern(ground as any, requestingUserId) || adminHere) {
        /* What each colleague said in their own check-ins: a credit stands only where those words hold it (the final check). Read
           only to check, never served. A lookup that fails checks nothing. */
        const whoseCheckIn = new Map((checkIns as any[]).map((c) => [c.id, c.participantId as string]));
        const theirOwnWordsBy = await (this.prisma as any).conversationTurn?.findMany?.({
          where: { checkInId: { in: [...whoseCheckIn.keys()] }, role: 'PERSON' },
          select: { checkInId: true, content: true },
        }).then((rows: any[]) => {
          const by = new Map<string, string[]>();
          for (const r of rows ?? []) {
            const pid = whoseCheckIn.get(r?.checkInId);
            if (pid) by.set(pid, [...(by.get(pid) ?? []), String(r?.content ?? '')]);
          }
          return by;
        }).catch(() => undefined);
        const help = helpNobodyMentioned(
          (readInput as any).mentions ?? [],
          ((readInput as any).entries ?? []).map((e: any) => ({ participantId: e.participantId, text: cleanText(e.text ?? '') })),
          ground.participants as any[],
          (pid) => nameOf(pid),
          me?.id ?? null,
          theirOwnWordsBy,
        );
        if (help) out.helpNobodyMentioned = help;
      }
      /* Built from what may be served, never the read passed through whole: no confidence, no percentage,
         no count of evidence, and nothing of a read too thin to show (request 111 a, no-rating-is-served). */
      if (has('coverage')) out.coverage = coverageAsThisReaderMayRead(buildCoverage(readInput, nameOf), me?.id ?? null, { theLead: isInitiator });
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
            rememberedCompose(this.prisma, opts.mayWordNewLines
              ? (system, draft) => this.anthropic.respond(system, [{ role: 'user', content: draft }])
              /* Kept lines only: nothing new is worded, and nothing is written, by opening. */
              : async () => null, !!opts.mayWordNewLines),
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

    /*
     * HOW THE LEADING IS LANDING IS A PATTERN, AND IS SERVED ONLY AS PATTERNS ARE. Screens request 64.
     *
     * `managerAlignment` is a pattern about how the check-in is being led ("seen across 2 sessions"),
     * and it went on the wire outside `sections`, so it reached every reader while patterns are
     * switched off, a participant included, although the report never gives a participant the
     * leadership reads it is built from. Now it is served only when patterns are (PATTERNS_ARE_SERVED),
     * and then only to the lead, whose leading it is about, and only once it has been seen in three
     * periods (decision 8), the setup gap included. Nobody else reads it: it has no answer box and no
     * clock of its own, so decision 39 (the person answers first) cannot be kept for anyone else.
     * Access follows decision 58's rule, the same as any other pattern (runsItForAPattern): the lead,
     * or an admin who set the check-in up for them - never a participant, never an admin without that
     * access, even one who can otherwise read the rest of this board (decision 64).
     */
    if (has('contribution') && PATTERNS_ARE_SERVED && judged && readsHowTheLeadingIsLanding(ground as any, requestingUserId)) {
      // Only meaningful where someone actually manages someone: needs a manager
      // and at least one report, both with accounts on record.
      // The forbidden-name list is built from THIS ground's participants. See
      // buildManagerAlignment for why the board needs one at all.
      /* The count of periods is made true here too, for a report stored before it was made true at the source
         (request 79 a): never more than the sessions that were answered, as decision 57 counts them. */
      const answeredHere = ((ground as any).checkIns ?? []).filter((c: any) => c.status === CheckInStatus.COMPLETED && !c.isSetup && !wasAQuietClose(c));
      const periodsHeld = periodsTheRecordHolds(answeredHere.map((c: any) => ({ sessionNumber: c.sessionNumber, when: c.completedAt })), ground as any);
      const reportWithTrueCounts = Array.isArray((reportSafe as any)?.leadershipGaps)
        ? { ...(reportSafe as any), leadershipGaps: (reportSafe as any).leadershipGaps.map((g: any) => ({ ...g, periods: aTruePeriodCount(g?.periods, periodsHeld) })) }
        : reportSafe;
      const alignment = this.buildManagerAlignment(
        reportWithTrueCounts,
        forbiddenNames(
          ground.participants.map((p: any) => ({
            firstName: p.user?.firstName,
            lastName: p.user?.lastName,
            email: p.email,
          })),
        ),
      );
      /*
       * THREE PERIODS, WHATEVER THE PATTERN (decision 8) - EXCEPT THE ONE THAT IS NOT A BEHAVIOUR.
       *
       * SETUP_NEVER_SAID only ever has one period (it reads what the setup did or did not say, and
       * there is no second period in which an absence becomes more true - see coverage.ts and the
       * builder above). Applying the three-period floor here unconditionally filtered it straight
       * back out even though `buildManagerAlignment` already exempted it, which is why it never
       * once reached a board (decision 55's "restored, fixed properly"; decision 57, item 7).
       */
      const seenThreeTimes = alignment.filter(
        (a) => a.pattern === LeadershipPattern.SETUP_NEVER_SAID || Number(a.periods ?? 0) >= 3,
      );
      if (seenThreeTimes.length) out.managerAlignment = seenThreeTimes;
    }

    /* The coaching, from the report's own builders and under its privacy (request 79 b): your own note, and
       for whoever runs the check-in and an admin with access to it, what to ask each person (decision 93, row 9). */
    {
      const coaching = judged ? await Promise.resolve().then(() => this.reports.coachingForTheBoard(groundId, requestingUserId, { adminReadsIt: adminHere })).catch(() => null) : null;
      if (coaching) (out as any).coaching = coaching;
    }

    if (has('patterns')) {
      /*
       * WHAT KEEPS COMING UP, UNDER HAFSAH'S RULES AND NO OTHER. See patterns/who-reads-a-pattern.
       *
       * This section used to serve every SURFACED row on the ground to every reader, with its
       * internal name as `label` and the library's question as `askThem`: "Blame Shifting" beside
       * Ngozi's work on Femi's own board, and "Named Collaborator" on the lead's after one session.
       * Now the reader's own patterns, or everybody's for whoever runs the check-in, after three
       * periods, in plain words, and nothing else. The person-judging codes (collusion, arc
       * concentration, E4, F5) have no plain name, so they never reach it.
       */
      const detections = await this.prisma.patternDetection.findMany({
        where: { groundId },
        select: PATTERN_ROW_SELECT,
        orderBy: { lastSeenAt: 'desc' },
        take: 60,
      });
      /* Decision 58: an admin who does not run this check-in reads no pattern, even where
         `runsThisGround` (which includes every admin of the organisation) says they may read the
         rest of the board. See patterns/who-reads-a-pattern, runsItForAPattern. */
      const patternReader = { participantId: me?.id ?? null, runsIt: runsItForAPattern(ground as any, requestingUserId) };
      const namesForPatterns = whoIsWhoIn(ground.participants as any, ground.initiatorId, (ground as any).cadence);
      const served = withTheEarlierRead(servedPatterns(detections as any, patternReader, { ...namesForPatterns, now }), detections as any, (ground as any).report?.overTime?.patterns, patternReader);
      out.patterns = await wordPatternEvidence(
        served,
        namesForPatterns.firstNameOf ?? (() => null),
        rememberedCompose(this.prisma, opts.mayWordNewLines
          ? (system, draft) => this.anthropic.respond(system, [{ role: 'user', content: draft }])
          /* Kept lines only: nothing new is worded, and nothing is written, by opening. */
          : async () => null, !!opts.mayWordNewLines),
      ).catch(() => served);
      /* The person reading their own for the first time starts the clock on when the lead may read it. */
      await markShownToThePerson(this.prisma as any, theOnesTheyAreSeeingFirst(detections as any, out.patterns as any));
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
     * EVERY QUOTE IN WHAT IS BUILT ON OPEN IS THE RECORD'S WORDS, OR IS NOT A QUOTE.
     *
     * The stored report's quotes were made the record's words before it was kept. What this board
     * builds now never went through that pass: the tiles quote a worry or a blocker in its record
     * words, and the sections below carry the engines' and the wording model's own sentences. Read
     * on seniorhire, run 12, Amina's Blockers tile: "I haven't explicitly said 'get me out of these
     * meetings.' I did say he..." - she typed those words in double marks, the record reader wrote
     * them in single ones, and nobody said them as the tile quoted them. See a-quote-built-at-the-read.
     *
     * Not the record's own rows (whoOwnsWhat, dependencies), which are the record, and not what the
     * lead typed (the targets, the poll, the title), which is theirs as they typed it. A tile keeps
     * its place: only its line is read, so a tile never goes, and its line never goes blank.
     */
    {
      const quotable = await theRecordAQuoteMayComeFrom(this.prisma as any, groundId);
      const requoted: string[] = [];
      const q = <T,>(v: T): T => (v == null ? v : quotesBuiltAtTheRead(v, quotable, requoted));
      if (Array.isArray(out.quickRead)) out.quickRead = (out.quickRead as any[]).map((t) => ({ ...t, sub: q(t?.sub) }));
      /* Not `stillUnanswered`: since request 107 (a) it holds only the question Groundwork asked, in
         quotation marks, and a name. Nobody's own words are in it, so there is nothing to check
         against the record, and the check would strip the marks from Groundwork's own question. */
      for (const k of ['howItIsGoing', 'divergence', 'eachPerson', 'toLookAt', 'contribution', 'coverage', 'hiddenContributors', 'decisions', 'managerAlignment'] as const) {
        if (out[k] != null) out[k] = q(out[k]);
      }
      if (requoted.length) this.logger?.warn?.(`Board for ${groundId}: ${requoted.length} quote(s) built at the read were not the record's words. First: ${requoted[0].slice(0, 200)}`);
    }

    /*
     * EACH PERSON TODAY, AND WHAT KEEPS COMING UP (week 12, screens request 11). The prototype's
     * "The team today" puts under each person's line what keeps coming up ("Same leads, 3 check-ins
     * running"). Here that is the same sentence as `toLookAt`, from the same read of the record, so
     * the two can never disagree. The line is the one the lead's row already says; where something
     * keeps coming up it no longer ends "nothing here needs you", because something does. Lead only,
     * like `toLookAt`: a colleague gets no field, and an admin with access reads it (decision 93, row 9).
     */
    if ((isInitiator || adminHere) && Array.isArray(out.eachPerson)) {
      const firstFor = new Map<string, any>();
      for (const t of (out.toLookAt as any[] | undefined) ?? []) if (!firstFor.has(t.participantId)) firstFor.set(t.participantId, t);
      /*
       * DECISION 56, ITEM 3. Wherever an untold goal counts against the person - here, the team
       * board's per-person line - the lead is also shown it as a conversation point, so nothing is
       * read into it before they have talked it through. Lead only, like the rest of this block: a
       * colleague and an admin who only reads never see `eachPersonToday` at all.
       */
      const nameByParticipant = new Map((out.eachPerson as any[]).map((row) => [row.participantId, String(row.who ?? '').trim()]));
      /* One point per person, with how many goals, never the same sentence once per goal (item 21). */
      const untoldCount = howManyGoalsAreNotTold(await this.goalsNotToldYetByParticipant(groundId));
      const untoldByParticipant = new Map<string, string[]>();
      for (const [pid, n] of untoldCount) untoldByParticipant.set(pid, [theConversationPointForTheLead(nameByParticipant.get(pid) || 'This person', n)]);
      out.eachPersonToday = (out.eachPerson as any[]).map((row) => {
        const k = firstFor.get(row.participantId);
        const said = String(row.says ?? '');
        const line = k ? said.replace(/, and nothing here needs you this week\.$/, '.') : said;
        /* The conversation point is the lead's own (decision 56, item 3): an admin who reads the line reads no point beside it. */
        const points = isInitiator ? untoldByParticipant.get(row.participantId) : undefined;
        return { participantId: row.participantId, who: row.who, line, ...(k ? { keepsComingUp: k.says } : {}), ...(points?.length ? { conversationPoints: points } : {}) };
      });
      /*
       * A SHORT TAG FOR THE WORK, ON A SALES BOARD (board-as-lead.txt: "Many visits, few moves", "Visits without names"),
       * from the patterns about the work this reader is already served, and nothing else. See a-short-tag-for-the-work.ts.
       */
      const kind = oneOfTheKinds((ground as any).kindOfWork);
      const served = ((out.patterns as any[] | undefined) ?? []).filter((x) => x?.id && x?.participantId && x?.about === 'the work');
      if (isASalesKind(kind) && served.length) {
        const rows = ((await (this.prisma as any).patternDetection?.findMany?.({ where: { id: { in: served.map((x) => x.id) }, groundId }, select: { id: true, code: true } })?.catch?.(() => [])) ?? []) as { id: string; code: string }[];
        const codeOf = new Map(rows.map((r) => [r.id, r.code]));
        out.eachPersonToday = (out.eachPersonToday as any[]).map((row) => {
          const tag = aShortTagForTheWork(served.filter((x) => x.participantId === row.participantId).map((x) => codeOf.get(x.id) ?? ''));
          return tag ? { ...row, workTag: tag } : row;
        });
      }
      /*
       * THE TEAM TODAY IS ABOUT TODAY (Hafsah's point 10, 17 October; board-as-lead.txt). Each rep read "has not checked in for
       * this session yet" on the day they had checked in, because the next session had opened. On Release 1's sales board, a
       * person who checked in today reads their line from that check-in, word for word, and one who has not reads the kit's
       * "Hasn't checked in today". Their words go to the lead only; an admin who reads reads that they checked in. See
       * each-persons-line-today.
       */
      if (releaseOne && isASalesKind(kind)) {
        const zone = theDayZone();
        const today = new Map<string, any>();
        for (const row of out.eachPersonToday as any[]) {
          const c = theirCheckInToday(checkIns as any[], row.participantId, now, zone);
          if (c) today.set(row.participantId, c);
        }
        /*
         * ON A DAY WITH NO CHECK-IN, THE LAST ONE (Hafsah's quality pass, 18 October, B-21): Grace opened her board on Sunday and read
         * "Hasn't checked in today" three times. On a day this check-in does not run (a weekend for a weekday check-in), each person's
         * line is from their last check-in, with its day, and its tag says when ("Last in 14 Oct").
         */
        const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'short' }).format(now);
        const aDayItRuns = !(/^(?:Sat|Sun)/.test(weekday) && String((ground as any).cadence ?? '').toUpperCase() === 'DAILY');
        const last = new Map<string, any>();
        if (!aDayItRuns) {
          for (const row of out.eachPersonToday as any[]) {
            if (today.has(row.participantId)) continue;
            const c = (checkIns as any[]).filter((x) => x.participantId === row.participantId && String(x.status).toUpperCase() === 'COMPLETED' && x.completedAt && !x.isSetup)
              .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
            if (c) last.set(row.participantId, c);
          }
        }
        const ids = [...today.values(), ...last.values()].map((c) => c.id);
        const said = ids.length && isInitiator
          ? ((await (this.prisma.recordEntry.findMany({ where: { disputedAt: null, checkInId: { in: ids } }, select: { checkInId: true, text: true, type: true, createdAt: true }, orderBy: { createdAt: 'asc' } } as any) as Promise<any[]>).catch(() => [] as any[])) ?? [])
          : [];
        const deals = isInitiator
          ? (((await ((this.prisma as any).workItem?.findMany?.({ where: { groundId, kind: 'deal' }, select: { name: true, ownerParticipantId: true } }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[])
          : [];
        out.eachPersonToday = (out.eachPersonToday as any[]).map((row) => {
          const c = today.get(row.participantId);
          const before = last.get(row.participantId);
          if (!c && before) {
            const words = isInitiator
              ? theirLine((said as any[]).filter((l) => l.checkInId === before.id).map((l) => ({ text: cleanText(String(l.text ?? '')), type: l.type ?? null, createdAt: l.createdAt })), deals.filter((d) => d.ownerParticipantId === row.participantId).map((d) => String(d.name ?? '')))
              : null;
            const on = aDaySaidInFull(new Date(before.completedAt));
            const first = String(row.who ?? '').trim().split(/\s+/)[0] || 'They';
            const shortDay = new Intl.DateTimeFormat('en-GB', { timeZone: zone, day: 'numeric', month: 'short' }).format(new Date(before.completedAt)).replace('Sept', 'Sep');
            return { ...row, line: words ? `On ${on}, ${first} said, “${words}”` : `${first} last checked in on ${on}.`, checkedInToday: false, lastIn: shortDay };
          }
          if (!c) return { ...row, line: HAS_NOT_CHECKED_IN_TODAY, checkedInToday: false };
          const line = isInitiator
            ? theirLine((said as any[]).filter((l) => l.checkInId === c.id).map((l) => ({ text: cleanText(String(l.text ?? '')), type: l.type ?? null, createdAt: l.createdAt })), deals.filter((d) => d.ownerParticipantId === row.participantId).map((d) => String(d.name ?? '')))
            : null;
          return { ...row, line: line ?? CHECKED_IN_TODAY, checkedInToday: true };
        });
      }
    }

    /*
     * THE RECORDS THIS KIND OF WORK NEEDS (request 76): deals and their stages, releases, tickets, a
     * matter's deadlines and parties. Each section is served under the switchboard's own name, and
     * says whether it is filled, has none yet, or is not something Groundwork keeps ("not-known").
     * Only the rows: whose each is, named for this reader, and the line it came from word for word.
     * A row from a line the person has since disputed is left out, as it is from every read.
     */
    {
      const kind = oneOfTheKinds((ground as any).kindOfWork);
      const items = kind
        ? await ((this.prisma as any).workItem?.findMany?.({ where: { groundId, kind: { notIn: KINDS_THAT_ARE_NOT_WORK } }, orderBy: { createdAt: 'asc' } }) ?? Promise.resolve([])).catch(() => [])
        : [];
      const sourceIds = (items as any[]).map((i) => i.sourceEntryId).filter(Boolean);
      const sources = sourceIds.length
        ? await (this.prisma.recordEntry.findMany({ where: { disputedAt: null, id: { in: sourceIds } }, select: { id: true, text: true, disputedAt: true, participantId: true, type: true, createdAt: true, ...WHAT_A_MARK_READS } }) as Promise<any[]>).catch(() => [] as any[])
        : [];
      const lineOf = new Map((sources as any[]).map((l) => [l.id, l]));
      /* How each record is known, by the same mark every line carries (request 107 c). */
      const whoAddedTheirs = await whoAddedEachBackingDocument(this.prisma, sources as any[]).catch(() => new Map<string, string | null>());
      /* What happens next: an open commitment that names the record, said by somebody this reader may read about it. */
      const openPromisesAsKept = items.length
        ? ((await ((this.prisma as any).groundCommitment?.findMany?.({ where: { groundId }, orderBy: { createdAt: 'asc' } }) ?? Promise.resolve([])).catch(() => [])) as any[])
          .filter((c) => String(c.status ?? '').toUpperCase() === 'UNKNOWN')
        : [];
      /* Which deal each promise is about, from the conversation it was made in, where its words name none (the-deal-a-promise-is-about). */
      const promiseTurns = openPromisesAsKept.length && (items as any[]).some((i) => i.kind === 'deal')
        ? ((((await (this.prisma.conversationTurn?.findMany?.({ where: { checkIn: { groundId } }, select: { checkInId: true, role: true, content: true, createdAt: true, checkIn: { select: { participantId: true } } }, orderBy: { createdAt: 'asc' } }) ?? Promise.resolve([]))?.catch?.(() => [])) ?? []) as any[])
          .map((t) => ({ checkInId: t.checkInId ?? null, participantId: t.checkIn?.participantId ?? null, role: String(t.role), content: String(t.content ?? ''), createdAt: t.createdAt })))
        : [];
      const aboutDeal = promiseTurns.length
        ? theDealsThePromisesAreAbout(openPromisesAsKept, promiseTurns, (items as any[]).filter((i) => i.kind === 'deal').map((i) => ({ name: String(i.name ?? ''), ownerParticipantId: (i.sourceEntryId ? lineOf.get(i.sourceEntryId)?.participantId : null) ?? i.ownerParticipantId ?? null , contact: String((i.fields as any)?.Contact ?? '').trim() || null})))
        : new Map<string, string>();
      const openPromises = openPromisesAsKept.map((c) => (aboutDeal.has(c.id) ? { ...c, about: aboutDeal.get(c.id) } : c));
      /* Whoever runs it reads every commitment about a record; anybody else only their own and the record holder's, never the lead's (decisions 4 and 30). */
      const runsIt = isInitiator || runsItForAPattern(ground as any, requestingUserId) || (runsThisGround && !isEvaluationCheckIn(ground.scenario));
      /*
       * WHO SAID THE LINE A RECORD CAME FROM (screens request 89), under the rule every other name on
       * the board follows: a person this reader may not name is "a colleague" and their id is not
       * served. The first name only, the way the board says a person in a sentence.
       */
      const whoSaidIt = (pid: string | null | undefined): { saidBy: string | null; saidByParticipantId: string | null; saidByLine: string | null } => {
        const p = pid ? ground.participants.find((x: any) => x.id === pid) : null;
        if (!p) return { saidBy: null, saidByParticipantId: null, saidByLine: null };
        /* The reader's own line is "In your words,", never their own first name. */
        if (me?.id && p.id === me.id) return { saidBy: 'You', saidByParticipantId: p.id, saidByLine: 'In your words,' };
        /* In lower case: the screen puts it inside "In ...'s words", so it is not the start of a sentence. */
        const aColleagueMidSentence = noName.get(p.id) ?? 'a colleague';
        if (hiddenFromThisReader(p.id)) return { saidBy: aColleagueMidSentence, saidByParticipantId: null, saidByLine: `In ${aColleagueMidSentence}'s words,` };
        const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || ((p as any).nameGiven ?? '').trim();
        const by = full ? theShortNameOf(full) : aColleagueMidSentence;
        return { saidBy: by, saidByParticipantId: p.id, saidByLine: `In ${by}'s words,` };
      };
      const rows: AServedRecord[] = [];
      for (const i of items as any[]) {
        const line = i.sourceEntryId ? lineOf.get(i.sourceEntryId) : null;
        if (i.sourceEntryId && (!line || line.disputedAt)) continue;
        /* A record is always owned by the person who said it (run-26), whatever an older row stored. */
        const ownerId: string | null = (line?.participantId as string | undefined) ?? i.ownerParticipantId ?? null;
        rows.push({
          id: i.id,
          kind: i.kind,
          name: i.name,
          stage: i.stage ?? null,
          owner: ownerId ? nameOf(ownerId) ?? aColleague(ownerId) : null,
          ownerParticipantId: ownerId,
          /*
           * SOMEBODY SAYS IT IS THEIRS, AND ONLY THE LEAD'S YES MAKES IT SO (decision 76, item 3). Said back to
           * the lead alone, on a record that still has nobody's name: "Amani Wekesa says the Westgate Deli
           * deal is theirs. Is it?" Nobody else is sent the claim. See a-claim-on-a-record-is-checked-first.
           */
          ...(() => {
            const claim = isInitiator && !ownerId ? theClaimOn(i.fields) : null;
            const claimant = claim ? ground.participants.find((x: any) => x.id === claim.participantId) : null;
            if (!claim || !claimant) return {};
            const who = claimant.userId && claimant.userId === requestingUserId ? null : (nameOf(claimant.id) ?? aColleague(claimant.id));
            return { ownerClaim: { participantId: claimant.id, who: who ?? 'You', says: theClaimQuestion(who, { name: i.name, kind: i.kind }) } };
          })(),
          due: i.dueAt ? new Date(i.dueAt).toISOString().slice(0, 10) : null,
          /* The day somebody last spoke about it: the day of the line it came from (request 112 a). Null for one added on the board. */
          lastSaidOn: line?.createdAt ? new Date(line.createdAt).toISOString().slice(0, 10) : null,
          fields: plainFields(i.fields),
          /* Each stage somebody said it was at, in order, for "Reported vs criteria met" (quality pass, 18 October, B-23). */
          ...(releaseOne && i.kind === 'deal' ? { stagesSaid: [...new Set([...theStagesKept(i.fields).map((x) => x.stage), ...(i.stage ? [String(i.stage)] : [])])] } : {}),
          from: i.sourceEntryId ? 'said' : 'lead',
          ...(line ? { said: cleanText(line.text) } : {}),
          ...(line ? whoSaidIt(line.participantId) : { saidBy: null, saidByParticipantId: null, saidByLine: null }),
          ...howARecordIsKnown(
            line ? theMarkOf({ ...line, text: cleanText(line.text) }, whoAddedTheirs) : null,
            !!i.addedByUserId && i.addedByUserId === requestingUserId,
          ),
          /* The proof mark the screens' ProofMark reads (request 108 c), from the line it came from, never upgraded. */
          mark: theRecordsMark(line ? theMarkOf({ ...line, text: cleanText(line.text) }, whoAddedTheirs) : null),
          /* The lead's own promise ("Be following up more closely with each rep on ... Kilele Hotel, Greenfield Supermarket and Mama Pima Stores") is hers, never a deal's next step (Drop Access short run, item 5; Release 1's sales board). */
          ...whatHappensNext(i, openPromises.filter((c) => !(releaseOne && i.kind === 'deal' && !!theLeadsRow && c.participantId === theLeadsRow && ownerId !== theLeadsRow)).filter((c) => runsIt || c.participantId === me?.id || (!!ownerId && c.participantId === ownerId && c.participantId !== theLeadsRow)), (pid) => {
            if (pid && pid === me?.id) return 'You';
            return pid ? (nameOf(pid) ?? aColleague(pid)) : 'Somebody';
          }),
        });
      }
      /*
       * WHAT A DEAL ROW NEEDS (request 115 b): its value, the days it was spoken about, and the rep's own read in
       * their words, only from the record, and only from people whose words this reader may read: their own,
       * or everybody's for whoever runs it and an admin outside an evaluation check-in, or where people see
       * each other and this reader's board is not only their own. See a-deal-row-from-its-record.
       */
      if (isASalesKind(kind) && rows.some((r) => r.kind === 'deal')) {
        const readsEveryonesWords = runsIt || (adminHere && !isEvaluationCheckIn(ground.scenario))
          || (!whoMaySee.peersHidden && !colleaguesWordsWalled && !aParticipantOnly);
        const mayReadTheWordsOf = (pid: string | null | undefined) => !!pid && (pid === me?.id || readsEveryonesWords);
        const everyLine = ((await (this.prisma.recordEntry.findMany({
          where: { disputedAt: null, participant: { groundId } } as any,
          select: { id: true, text: true, participantId: true, checkInId: true, createdAt: true, disputedAt: true, ...WHAT_A_MARK_READS } as any,
        }) as Promise<any[]>).catch(() => [] as any[])) ?? []) as any[];
        const readableRows = everyLine.filter((l) => !l.disputedAt && mayReadTheWordsOf(l.participantId));
        const whoAddedEach = await whoAddedEachBackingDocument(this.prisma, readableRows).catch(() => new Map<string, string | null>());
        /* The documents behind the lines, so proof counts only for the customer it is about, on the day it came in (a-deals-proof-is-about-that-deal). */
        const docOf = await theBackingDocuments(this.prisma, readableRows).catch(() => new Map<string, ABackingDocument>());
        const readable = readableRows
          .map((l) => ({ id: l.id, participantId: l.participantId, text: cleanText(l.text ?? ''), createdAt: l.createdAt, mark: theRecordsMark(theMarkOf({ ...l, text: cleanText(l.text ?? '') }, whoAddedEach)) as string, documentBy: l.anchoredDocumentId ? (whoAddedEach.get(l.anchoredDocumentId) ?? null) : null, ...(releaseOne ? theDocumentBehind(l.anchoredDocumentId, docOf) : {}) }));
        const owners = [...new Set(rows.filter((r) => r.kind === 'deal' && mayReadTheWordsOf(r.ownerParticipantId)).map((r) => r.ownerParticipantId as string))];
        const ownersCheckIns = (checkIns as any[]).filter((c) => owners.includes(c.participantId)).map((c) => c.id);
        const turns = ownersCheckIns.length
          ? (((await (this.prisma as any).conversationTurn?.findMany?.({
            where: { checkInId: { in: ownersCheckIns }, role: 'PERSON' },
            select: { checkInId: true, content: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          })?.catch?.(() => [])) ?? []) as any[])
          : [];
        const ownerOfCheckIn = new Map((checkIns as any[]).map((c) => [c.id, c.participantId]));
        /* Whose silence a line says: a person in the check-in or on the roster not answering is not the customer going quiet. */
        const ourSide = await theNamesOnOurSide(this.prisma, (ground as any).organizationId, ground.participants as any[]).catch(() => [] as string[]);
        /*
         * A PAYMENT RECORD (Release 1's sales board; a-deals-four-criteria: "Won: paid, or a deposit received, with a payment
         * record"). A line this reader may read, backed by a document, where the line or the document reads as a payment: an
         * M-Pesa message, a receipt, money received. A signed order is proof, but not a payment.
         */
        /*
         * Each payment record is about the customer its document names, or, with no document, the customer its line names
         * (Drop Access run 1, A1: Savannah Cafe's M-Pesa message is not a payment from Ngong Road Minimart).
         */
        /* A code typed as the answer to a question about one sale is read with that sale (polish round 15, U14; withTheSaleEachCodeAnswered). */
        const readableAsProof = releaseOne
          ? withTheSaleEachCodeAnswered(
            readableRows.map((l) => ({ ...l, text: cleanText(l.text ?? '') })),
            await theTurnsBehindTheCodes(this.prisma, readableRows.map((l) => ({ ...l, text: cleanText(l.text ?? '') }))).catch(() => []),
            rows.filter((r) => r.kind === 'deal').map((r) => ({ name: r.name, fields: r.fields, ownerParticipantId: r.ownerParticipantId ?? null })),
          )
          : readableRows;
        const provenHere = releaseOne
          ? readableAsProof
            .filter((l) => theRecordsMark(theMarkOf({ ...l, text: cleanText(l.text ?? '') }, whoAddedEach)) === 'proven')
            .map((l) => ({ text: cleanText(l.text ?? ''), createdAt: l.createdAt, anchoredDocumentId: l.anchoredDocumentId ?? null }))
          : [];
        const paymentLines: { text: string }[] = releaseOne ? thePaymentRecords(provenHere, docOf) : [];
        /* And the signed orders: with a payment record, the other proof that meets Won (Hafsah, 18 October, answer 2). */
        const signedOrderLines: { text: string }[] = releaseOne ? theSignedOrders(provenHere, docOf) : [];
        /* The people the record ties to each customer (a wait on Wanjiru about Mama Pima): their answers are the customer's (Drop Access run 1, A3). */
        const peopleAt = releaseOne
          ? await thePeopleAtEachCustomer(this.prisma, groundId, rows.filter((r) => r.kind === 'deal').map((r) => ({ id: r.id, name: r.name, ownerParticipantId: r.ownerParticipantId })), ourSide).catch(() => new Map<string, string[]>())
          : new Map<string, string[]>();
        for (const r of rows) {
          if (r.kind !== 'deal') continue;
          if (releaseOne) {
            /*
             * THE VALUE IS THE WHOLE DEAL'S, AND THE BUYING DATE IS THE CUSTOMER'S (Hafsah's points 5 and 6). A value the owner's lines
             * call a price for one unit ("the KES 4,500 price for Juja Hardware") or a discount ("the KES 12,000 discount") is not the
             * value; units times the price of one unit is. The buying date filed on the deal is served on its own, for its group.
             * Read from the owner's lines whoever reads, so every reader reads the same deal. See a-deals-value-and-buying-date.
             */
            const theirs = everyLine.filter((l) => !l.disputedAt && (!r.ownerParticipantId || l.participantId === r.ownerParticipantId)).map((l) => cleanText(l.text ?? ''));
            /*
             * Only the units and value a line about this deal says, as the owner said them (Drop Access run 1, A2): the record's own
             * note on a line ("[INFERRED: 'He' refers to Mr. Kariuki, owner of Juja Hardware]") says which customer a line is about.
             */
            const aboutIt = r.from === 'said'
              ? everyLine
                .filter((l) => !l.disputedAt && (!r.ownerParticipantId || l.participantId === r.ownerParticipantId))
                .map((l) => String(l.text ?? ''))
                .filter((t) => theWordsNameTheDeal(t, { name: r.name, fields: r.fields }) || theWordsNameTheDeal(cleanText(t), { name: r.name, fields: r.fields }))
              : [];
            let worked = withTheValueWorkedOut(aboutIt.length ? withOnlyTheNumbersSaid(r.fields, aboutIt) : r.fields, theirs);
            /* Filed on the deal, or, where the listener has not filed it yet, the latest the owner said: the reports' own rule, so the board and the reports agree. */
            r.buyingDate = theBuyingDateOf(worked)
              ?? theBuyingDateTheySaid({ name: r.name, ownerParticipantId: r.ownerParticipantId, fields: worked }, everyLine.filter((l) => !l.disputedAt).map((l) => ({ text: cleanText(l.text ?? ''), participantId: l.participantId, createdAt: l.createdAt })));
            delete worked[BUYING_DATE];
            r.paymentRecord = aPaymentRecordFor({ name: r.name, fields: worked }, paymentLines);
            /*
             * What was sold is what its payment shows (polish round 15, U2 and U14; theSaleAsItsPaymentShowsIt), the count's own rule: kept
             * beside the deal's own details, which only take a value where they had none.
             */
            const soldFields = r.paymentRecord ? theSaleAsItsPaymentShowsIt({ name: r.name, fields: worked }, paymentLines) : null;
            if (soldFields) (r as any).soldFields = soldFields;
            if (soldFields?.Value && !Object.keys(worked).some((k) => /^(?:deal\s+)?(?:value|amount|worth|size)$/i.test(k.trim()))) worked = { ...worked, Value: soldFields.Value };
            r.fields = worked;
            /* A deposit only is said as a deposit, never as paid (final real-model check, item 10): "Deposit paid, KES 15,000 of KES 30,000." */
            const deposit = r.paymentRecord ? theDepositFor({ name: r.name, fields: soldFields ?? worked }, paymentLines) : null;
            if (deposit) (r as any).deposit = { ...deposit, says: aDepositSaid(deposit) };
            /* An M-Pesa code given in words is the payment record, shown as "M-Pesa code" (Hafsah, 19 October; theMPesaCodeFor). */
            const shownByADocument = r.paymentRecord && aPaymentRecordFor({ name: r.name, fields: worked }, thePaymentRecords(provenHere.filter((l) => !!l.anchoredDocumentId), docOf));
            const code = r.paymentRecord && !shownByADocument ? theMPesaCodeFor({ name: r.name, fields: worked }, provenHere) : null;
            if (code) { (r as any).mpesaCode = code; r.known = 'proof'; r.mark = 'proven'; r.knownSays = `M-Pesa code ${code} shows it.`; }
            if (deposit) r.knownSays = code ? `M-Pesa code ${code} shows the deposit. ${aDepositSaid(deposit)}` : aDepositSaid(deposit);
            r.signedOrder = aPaymentRecordFor({ name: r.name, fields: worked }, signedOrderLines);
            /*
             * LOST: the customer said no, or the rep gave it up (Drop Access run 1, A5; Hafsah, 18 October: a Lost stage), with the
             * reason in the rep's own words where this reader may read them, what shows it, and what it teaches only where the record
             * supports it. Read from the owner's lines whoever reads, so every reader reads the same deal. See a-deal-that-was-dropped.
             */
            const salesStages = theSalesStages((ground as any).workStages);
            const dropped = theDealWasDropped({ name: r.name, stage: r.stage, ownerParticipantId: r.ownerParticipantId, fields: worked }, everyLine, { lastStage: salesStages[salesStages.length - 1] ?? null, peopleThere: peopleAt.get(r.id) ?? [], saidInTheCheckIn: ((items as any[]).find((x) => x.id === r.id)?.fields as any)?._dropped ?? null, otherDeals: rows.filter((x) => x.kind === 'deal').map((x) => String(x.name ?? '')) });
            if (dropped) {
              const who = !mayReadTheWordsOf(r.ownerParticipantId) ? null : r.ownerParticipantId === me?.id ? 'You' : (r.owner ? theShortNameOf(r.owner) : null);
              r.lost = { on: dropped.on, ...theLostDeal(r.name, dropped, who) };
            }
          }
          const value = theValueOf(r.fields);
          r.value = value;
          /* Proof on any line naming the customer shows the deal (problem 2): the M-Pesa line, not only the line the deal was written from. */
          /* Only a deal said in a check-in on somebody's word: a colleague's confirmation and the lead's own entry keep saying how they are known. */
          if (r.from === 'said' && r.mark !== 'proven' && r.mark !== 'confirmed' && proofNamesTheDeal(r.name, readable, r.ownerParticipantId ?? null)) {
            r.proofOnAnotherLine = true;
            /* The row reads as the proof shows it: a line naming this customer is backed by the speaker's own document. */
            r.mark = 'proven';
            r.known = 'proof';
            r.knownSays = 'Proof shows it.';
          }
          r.valueSays = value ? null : NO_VALUE_SAID;
          /* The next step said about the deal, where no commitment names it (theNextStepTheyGave). Said as the speaker's, under the same naming rule. */
          if (!r.next && releaseOne) {
            const given = theNextStepTheyGave(r.fields, r.saidBy === 'You' ? 'You' : (r.saidBy ? `${r.saidBy.charAt(0).toUpperCase()}${r.saidBy.slice(1)}` : null));
            if (given) Object.assign(r, given);
          }
          r.contactHistory = theContactHistory(r.name, readable, now, releaseOne ? r.fields : null, peopleAt.get(r.id) ?? []);
          /* When the customer stopped answering, from the lines this reader may read (A4). */
          const silent = notAnsweringSince(r.name, readable as any, releaseOne ? { people: ourSide, contact: theContactOf(r.fields), peopleThere: peopleAt.get(r.id) ?? [] } : {});
          r.notAnsweringSince = silent ? silent.toISOString().slice(0, 10) : null;
          /* The last day somebody spoke with the customer before they went quiet: "no reply since 12 October" (standing decision 4). */
          const quietFrom = r.notAnsweringSince;
          if (releaseOne && quietFrom) (r as any).noReplySince = ((r.contactHistory ?? []) as any[]).map((c) => String(c.on)).filter((on) => on < quietFrom).sort().pop() ?? quietFrom;
          r.contactHistorySays = WHAT_CONTACT_HISTORY_IS;
          /*
           * ONE ANSWER TO "WHEN WAS IT LAST SPOKEN ABOUT" (request 117, part 4). A deal added on the board has no line
           * it came from, so its group said "Nobody has spoken about it in a check-in yet." beside "On 27 September,
           * somebody spoke about it". The newest day in its contact history is the day it was last spoken about.
           */
          const newest = r.contactHistory[0]?.on ?? null;
          if (newest && (!r.lastSaidOn || newest > r.lastSaidOn)) r.lastSaidOn = newest;
          const theirs = mayReadTheWordsOf(r.ownerParticipantId)
            ? turns.filter((t) => ownerOfCheckIn.get(t.checkInId) === r.ownerParticipantId).map((t) => String(t.content ?? ''))
            : [];
          const words = theirs.length ? theirReadInTheirWords(r.name, theirs, releaseOne ? rows.filter((x) => x.kind === 'deal' && x.id !== r.id).map((x) => String(x.name ?? '')) : []) : null;
          r.theirRead = words && r.owner
            ? (r.ownerParticipantId === me?.id
              ? { who: 'You', words, says: 'Your read, in your own words.' }
              : { who: r.owner, words, says: `${r.owner}'s read, in their own words.` })
            : null;
        }
      }
      /*
       * THE FOUNDER'S WORK PLAN HOLDS WHAT THE PERSON PROMISED IN THEIR CHECK-IN TOO (request 136 item 2). Its records were only
       * the rows added on the board, so Wanjiru's two commitments from session 1 were not in the table. Each commitment on
       * record, said by someone this reader may read, is a row, unless a row of the same name is there already. Nothing is made
       * up: the name is the commitment's own words without "I will", and the time is the time they gave.
       */
      if (kind === "founder's own check-in") {
        const taken = new Set(rows.map((r) => theSameName(String(r.name ?? ''))));
        const promised = ((await ((this.prisma as any).groundCommitment?.findMany?.({ where: { groundId }, orderBy: { createdAt: 'asc' } }) ?? Promise.resolve([])).catch(() => [])) as any[]);
        for (const c of promised) {
          const mayRead = !!c.participantId && (c.participantId === me?.id || runsIt) && !hiddenFromThisReader(c.participantId);
          const clause = inOurVoice(String(c.text ?? ''), c.participantId === me?.id ? 'you' : 'them');
          if (!mayRead || !clause || taken.has(theSameName(clause))) continue;
          taken.add(theSameName(clause));
          const state = String(c.status ?? '').toUpperCase();
          rows.push({
            id: `commitment-${c.id}`,
            kind: 'commitment',
            name: clause,
            stage: null,
            owner: c.participantId === me?.id ? 'You' : (nameOf(c.participantId) ?? aColleague(c.participantId)),
            ownerParticipantId: c.participantId,
            due: null,
            lastSaidOn: c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : null,
            fields: {
              ...(c.whenSaid && looksLikeATimeOrADate(String(c.whenSaid)) ? { 'Time given': String(c.whenSaid).trim().slice(0, 120) } : {}),
              Status: state === 'DONE' ? 'Done' : state === 'NOT_DONE' ? 'Not done' : state === 'DROPPED' ? 'Dropped' : 'Open',
            },
            from: 'said',
            ...(c.saidWordForWord === true ? { said: cleanText(String(c.text ?? '')) } : {}),
            saidBy: c.participantId === me?.id ? 'You' : (nameOf(c.participantId) ?? null),
            saidByParticipantId: c.participantId,
            mark: 'said',
          } as AServedRecord);
        }
      }
      /*
       * EACH ITEM'S OWN EVIDENCE, BESIDE IT (Release 1B, pull request 2 of 3: "Proof added in a check-in is read, filed on its item
       * as evidence, and shown on the board beside that item"). Only while the organisation's Release 1B switch is on; off, the
       * rows are served exactly as before. Whoever runs it reads every piece; anybody else only what they added themselves, the
       * same rule as References and resources' Evidence. Read from the rows proof-filed-on-its-item.ts wrote, never worked out here.
       */
      if (rows.length && await theRelease1bTabsAreOn(this.prisma as any, (ground as any).organizationId)) {
        const filed = ((await ((this.prisma as any).itemEvidence?.findMany?.({
          where: { groundId, workItemId: { in: rows.map((r: any) => r.id).filter(Boolean) } },
          select: { id: true, documentId: true, participantId: true, workItemId: true, readAs: true, countsAsProof: true, shows: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
        const zone = theDayZone();
        for (const r of rows as any[]) {
          const mine = filed.filter((e) => e.workItemId === r.id && (runsIt || (!!me?.id && e.participantId === me.id)));
          r.evidence = mine.map((e) => ({
            id: e.id,
            documentId: e.documentId,
            readAs: e.readAs,
            countsAsProof: e.countsAsProof === true,
            shows: e.shows ?? null,
            addedOn: new Intl.DateTimeFormat('en-GB', { timeZone: zone, day: 'numeric', month: 'long' }).format(new Date(e.createdAt)),
            addedBy: e.participantId && e.participantId === me?.id ? 'You' : (e.participantId ? nameOf(e.participantId) : null) ?? 'a colleague',
          }));
        }
      }
      out.workRecords = theRecordSections(kind, (ground as any).workStages, rows);
    }

    /*
     * APPLIED IN ONE PLACE, AT THE END, ON PURPOSE. Threading the rule through eight builders is
     * eight chances to forget it and no single place to read what the board gives away. Here the
     * whole answer is one paragraph, and a section added later is walled by being added to it
     * rather than by whoever wrote it remembering.
     */
    /*
     * CONTRIBUTION AND COVERAGE ARE READ IN FULL BY WHOEVER RUNS THE CHECK-IN AND BY AN ADMIN WITH ACCESS TO IT
     * (screens request 88, decision 58; the admin was added by decision 93, row 8, Hafsah's answer of 5 October).
     * A participant gets only their own row, and nothing when they have none, whether or not people see each
     * other on this check-in. An admin of the organisation reads them on every check-in but a performance
     * plan, promotion, renewal or probation they were not given access to (`adminHere` already says so).
     * Decision 5 lets an admin read the board; decision 58 narrowed a pattern to the lead and the admin
     * who set the check-in up, and these two sections name and describe each person the same way.
     * (Narrowed the same way pending Hafsah's confirmation.)
     */
    if (!runsItForAPattern(ground as any, requestingUserId) && !adminHere) {
      const onlyMine = (rows: any) => (Array.isArray(rows) ? rows.filter((r: any) => !!r.participantId && r.participantId === (me?.id ?? null)) : []);
      if (out.contribution) out.contribution = contributionWithoutTheLeadsAdvice(onlyMine(out.contribution));
      if (out.coverage) out.coverage = coverageWithoutTheLeadsAdvice({ ...(out.coverage as any), reads: onlyMine((out.coverage as any).reads) });
    }
    if (whoMaySee.peersHidden) {
      /*
       * THE LEAD'S OWN ROWS, FOR A PARTICIPANT WHERE PEOPLE DO NOT SEE EACH OTHER (run-26 review). A record is owned by whoever
       * said it, so the lead's line about one borrower's tricycle was the lead's row, kept for every borrower and served
       * word for word. It goes through the same wall as the shared picture: a sentence about one other person is dropped, and a
       * row left with nothing to say is left out. The lead and an admin never reach this block.
       */
      const leadsNames = theLeadsNamesOf(ground.participants as any[], ground.initiatorId);
      const theOthersTheReaderMayNotName = {
        names: (ground.participants as any[]).filter((p) => p.id !== me?.id && p.id !== theLeadsRow)
          .flatMap((p) => [[p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || (p?.nameGiven ?? '').trim() || null, (p.user?.firstName ?? '').trim().length > 2 ? p.user.firstName.trim() : null].filter(Boolean) as string[]),
        lead: leadsNames,
      };
      const theLeadsRowAsAParticipantMayRead = (r: any) => {
        if (aboutOneOfThem(String(r.name ?? ''), theOthersTheReaderMayNotName, true)) return null;
        if (typeof r.said !== 'string' || !r.said.trim()) return r;
        const { kept } = theLeadsLineAsAParticipantMayRead(r.said, theOthersTheReaderMayNotName);
        return kept ? { ...r, said: kept } : null;
      };
      out.contribution = onlyWhatThisReaderMaySee(out.contribution as any, whoMaySee);
      /*
       * COVERAGE IS NOT A LIST. It is `{ scope, reads }`, and handing the whole object to a filter
       * for lists threw "rows.filter is not a function", so a participant on a delivery check-in
       * where people see only themselves got an error instead of a board. The rows are the reads;
       * the wall goes round those and the shape the page draws stays as it is.
       */
      if (out.coverage) {
        out.coverage = { ...(out.coverage as any), reads: onlyWhatThisReaderMaySee((out.coverage as any).reads, whoMaySee) ?? [] };
      }
      out.whoOwnsWhat = onlyWhatThisReaderMaySee(out.whoOwnsWhat as any, { ...whoMaySee, alsoThe: theNewHireReadsTheLead ? theLeadsRow : null });
      /* A record whose person is walled from this reader is not served to them: only their own, the lead's, and those with nobody's name on them. */
      out.workRecords = ((out.workRecords ?? []) as any[]).map((sec) => (Array.isArray(sec.rows)
        ? (() => {
          const rows = sec.rows
            .filter((r: any) => !r.ownerParticipantId || r.ownerParticipantId === me?.id || r.ownerParticipantId === theLeadsRow)
            .map((r: any) => (!isEvaluationCheckIn(ground.scenario) && r.ownerParticipantId && r.ownerParticipantId === theLeadsRow && r.ownerParticipantId !== me?.id ? theLeadsRowAsAParticipantMayRead(r) : r))
            .filter((r: any) => !!r);
          return { ...sec, rows, state: rows.length ? 'filled' : 'none-yet' };
        })()
        : sec));
      out.managerAlignment = onlyWhatThisReaderMaySee(out.managerAlignment as any, whoMaySee);
      /* servedPatterns already serves a participant only their own; the wall stays round it as well. */
      if (out.patterns) out.patterns = onlyWhatThisReaderMaySee(out.patterns as any, whoMaySee);
      out.dependencies = onlyHandoffsTheyAreIn(out.dependencies as any, whoMaySee);
      if (out.checkInGrid) {
        out.checkInGrid = {
          ...(out.checkInGrid as any),
          rows: onlyWhatThisReaderMaySee((out.checkInGrid as any).rows, { ...whoMaySee, alsoThe: theNewHireReadsTheLead ? theLeadsRow : null }),
        };
      }
      /*
       * THE LIST OF PEOPLE, TOO. Screens request 50: every other row stayed on this list as "a
       * colleague", "another colleague", with whether each had signed off, so a participant on a
       * check-in that hides people from each other could count their colleagues and follow each
       * one's progress, which the check-in read (grounds.service) already refuses. They keep their
       * own row and the lead's, whose name they may read; `aTeamReportComes` says whether anybody
       * else answers.
       */
      out.participants = ((out.participants ?? []) as any[]).filter((p) => p.id === me?.id || p.id === theLeadsRow);
      /* Said, rather than left as a board that has quietly lost most of itself. */
      if (!theNewHireReadsTheLead) out.whyYouOnlySeeYourself = WHY_YOU_ONLY_SEE_YOURSELF;
      /* The new hire reads the lead's row too, so it is said only where somebody else is left out, and it says "you and your lead". */
      else if ((ground.participants as any[]).some((p) => p.id !== me?.id && p.id !== theLeadsRow && !p.managingOnly)) out.whyYouOnlySeeYourself = WHY_YOU_ONLY_SEE_YOURSELF_AND_YOUR_LEAD;
    }

    /*
     * THE SWITCHBOARD'S OWN SECTIONS (request 70): the ones no other field carries. Built from rows the
     * record already holds, with no model and nothing written, under one rule for who reads what. See
     * the-switchboards-own-sections.ts and the map in docs/answers-from-engine.md.
     */
    {
      const evaluation = isEvaluationCheckIn(ground.scenario);
      const runsIt = isInitiator || runsItForAPattern(ground as any, requestingUserId);
      /* An admin of the organisation reads everyone on a check-in that is not an evaluation, as the board does
         for every other row; on an evaluation one, only the lead and the admin who set it up (decision 58). */
      const mayReadEveryone = runsIt || (runsThisGround && !evaluation);
      const adminWithoutAccess = adminHere && !runsIt && evaluation;
      /* On an evaluation check-in people never read each other's things, whatever was chosen about seeing each other (request 78, part 3). */
      const peersWalled = whoMaySee.peersHidden || evaluation;
      /* Whether a sentence names one of the people on this check-in other than the lead: first name, or full name. */
      const namesOfThePeople = (ground.participants as any[])
        .filter((p) => p.id !== theLeadsRow && !p.managingOnly)
        .flatMap((p) => [`${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim(), (p.user?.firstName ?? '').trim(), (p.nameGiven ?? '').trim()])
        .filter((n) => n.length > 1)
        .map((n) => new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu'));
      const namesAnyone = (text: string | null | undefined) => !!text && namesOfThePeople.some((re) => re.test(text));
      /*
       * A PARTICIPANT READS ONLY THEIR OWN HERE (request 105; the prototype's B5, "Only yours"). Somebody who
       * checks in and does not run the check-in reads their own commitments, the waits they are in and their own
       * history, and nobody else's, whether or not people see each other. The person reviewed on an evaluation
       * check-in keeps the rules that already narrowed their board. See a-participants-board-is-their-own.
       */
      const onlyTheirOwn = aParticipantOnly;
      const reader: WhoIsReading = {
        /* The kit's sales board has no "Tried:" or "Not backed:" beside a claim (Hafsah, 18 October, answer 5). */
        noteBesideTheClaim: !(releaseOne && isASalesKind((ground as any).kindOfWork)),
        meId: me?.id ?? null,
        myNames: me
          ? [[me.user?.firstName, me.user?.lastName].filter(Boolean).join(' ').trim(), (me.user?.firstName ?? '').trim(), (me.user?.lastName ?? '').trim()]
            /* A first or last name another person here shares is not only the reader's, so it stays a name. */
            .filter((n, i) => n.length > 1 && (i === 0 || !(ground.participants as any[]).some((p) => p.id !== me.id && [p.user?.firstName, p.user?.lastName].some((x: string) => (x ?? '').trim().toLowerCase() === n.toLowerCase()))))
          : [],
        mayReadEveryone,
        theLeadsId: theLeadsRow,
        personMayBeRead: (pid) => {
          if (onlyTheirOwn) return !!pid && pid === me?.id;
          if (adminWithoutAccess) return false;
          if (mayReadEveryone) return true;
          if (!pid) return !peersWalled;
          return pid === me?.id || pid === theLeadsRow || !peersWalled;
        },
        handoffMayBeRead: (d) => {
          if (adminWithoutAccess) return false;
          if (onlyTheirOwn && !(!!me?.id && (d.fromParticipantId === me.id || d.onParticipantId === me.id))) return false;
          if (mayReadEveryone) return true;
          /* What the lead said they are waiting on, about people, is the lead's (decisions 4 and 30). */
          if (d.fromParticipantId && d.fromParticipantId === theLeadsRow && (evaluation || namesAnyone(d.what))) return false;
          if (!peersWalled) return true;
          return !!me?.id && (d.fromParticipantId === me.id || d.onParticipantId === me.id);
        },
        commitmentMayBeRead: (c) => {
          if (onlyTheirOwn) return !!c.participantId && c.participantId === me?.id;
          if (adminWithoutAccess) return false;
          if (mayReadEveryone || !c.participantId || c.participantId === me?.id) return true;
          /* The lead's own commitments are the lead's intentions: never read by a person in an evaluation check-in, nor, anywhere, when they name somebody. */
          if (c.participantId === theLeadsRow) return !evaluation && !namesAnyone(c.text);
          return true;
        },
        nameOf: (pid) => nameOf(pid),
        aColleague: (pid) => aColleague(pid),
      };
      const mine = await this.theRecordTheSwitchboardsSectionsRead(groundId, checkIns as any[]);
      const sessions = (checkIns as any[]).map((c) => ({ id: c.id, participantId: c.participantId, sessionNumber: c.sessionNumber, status: c.status, completedAt: c.completedAt ?? null, isSetup: !!c.isSetup, closedReason: c.closedReason ?? null, turns: c.turns }));
      const people = (ground.participants as any[]).map((p) => ({ id: p.id, managingOnly: !!p.managingOnly }));
      /* A quotation mark goes only round words found character for character in what that person typed. */
      /*
       * A CUSTOMER'S OWN BUDGET OR APPROVAL IS WHERE A DEAL STANDS, NOT A BLOCKER (final real-model check, item 2). Mercy's "the budget" from
       * the school and "approval" from the school board were listed as her blockers with "Nobody has said what has been tried."; the deal
       * row already says the school cannot buy now. An ask for ideas from the team is not one either; one for the lead's view stays, as hers.
       */
      const salesHere = isASalesKind((ground as any).kindOfWork);
      const namesHere = (ground.participants as any[]).map((p) => [p.user?.firstName ?? '', p.user?.lastName ?? ''].filter(Boolean));
      const handoffs = withTheirWordsChecked(
        ((ground.dependencies ?? []) as any[]).filter((d) => !notABlockerTheyRaised(d, { sales: salesHere, namesHere, keepTheAsks: true, keepWhatCleared: true })),
        await whatEachHandoffPersonTyped(this.prisma, (ground.dependencies ?? []) as any[], checkIns as any[]),
      ) as any[];
      /* Which waits on a colleague that colleague has confirmed (decision 137; change 4). */
      {
        const confirmedWaits = await theConfirmedWaits(this.prisma, handoffs.map((h: any) => ({ ...h, groundId: h.groundId ?? groundId })));
        for (const h of handoffs) if (h.onParticipantId) h.confirmed = confirmedWaits.has(h.id);
      }
      const risks = theRisks(mine.commitments, handoffs, sessions, typeof (out as any).targetsNobodyOwns === 'string' ? (out as any).targetsNobodyOwns : null, reader);
      if (risks.length) out.risks = risks;
      const workPlan = theWorkPlan(mine.commitments, sessions, reader);
      if (workPlan.length) out.workPlan = workPlan;
      const timeline = theTimeline(mine.commitments, handoffs, sessions, (ground as any).closedAt ?? null, reader);
      if (timeline.length) out.timeline = timeline;
      const personHistory = thePersonHistory(people, mine.commitments, handoffs, sessions, reader);
      if (personHistory.length) out.personHistory = personHistory;
      const blockerCheck = theBlockerCheck(handoffs, reader);
      if (blockerCheck.length) out.blockerCheck = blockerCheck;
      /* RELEASE 8: where the time went, from what each person committed to, by the piece of work it names. Never hours. To whoever runs it. */
      if (runsIt) {
        const itemNames = ((out.workRecords ?? []) as any[]).flatMap((sec: any) => ((sec?.rows ?? []) as any[]).map((x: any) => String(x?.name ?? ''))).filter(Boolean);
        const timeWent = whereTheTimeWent(mine.commitments, itemNames, reader);
        if (timeWent.length) (out as any).whereTheTimeWent = timeWent;
      }
      /* Their words, so only for those whose words this reader may read: their own, or everybody's where people see each other or the reader runs it. */
      const evidenceIndex = theEvidenceIndex(
        mine.lines.map((l) => ({ ...l, wordsMayBeRead: mayReadEveryone || l.participantId === me?.id || !peersWalled })),
        reader,
      );
      if (evidenceIndex.length) out.evidenceIndex = evidenceIndex;
      const busyOrMoving = theBusyOrMoving(people, mine.commitments, handoffs, sessions, reader);
      if (busyOrMoving) out.busyOrMoving = busyOrMoving;
      /* A goal the lead has not told the person about is the lead's own note (decision 56): only the lead's list carries it. */
      const untoldGoals = isInitiator ? await this.goalsNotToldYetByParticipant(groundId) : [];
      const leadActions = theLeadActions(mine.commitments, handoffs, sessions, untoldGoals, reader);
      /* What the lead can do about each one (request 112 b), to the lead alone. */
      if (leadActions.length) {
        /* The deals on the board, for a wait whose words name one of the waiting person's own (aWaitTheLeadCanAnswer). */
        const dealsOnTheBoard = ((Array.isArray(out.workRecords) ? out.workRecords : []) as any[])
          .flatMap((s: any) => (s?.rows ?? []) as any[]).filter((r: any) => r?.kind === 'deal' && r.name);
        out.leadActions = isInitiator
          ? leadActions.map((a) => {
            const wait = a.id.startsWith('waiting-on-the-lead-') ? handoffs.find((h: any) => `waiting-on-the-lead-${h.id}` === a.id) : null;
            const whoWaits = wait?.fromParticipantId ? nameOf(wait.fromParticipantId) : null;
            /*
             * A WAIT ON THE LEAD THAT A YES OR A NO ANSWERS (Hafsah, 17 October): the same line, with the question as the
             * prototype puts it and Yes and No, which keep the answer and clear the wait. See aWaitTheLeadCanAnswer.
             */
            const decision = wait && releaseOne ? aWaitTheLeadCanAnswer(wait, whoWaits, dealsOnTheBoard.filter((r: any) => r.ownerParticipantId === wait.fromParticipantId), dealsOnTheBoard) : null;
            if (wait && decision) return { ...a, decision: { question: decision.question, asked: decision.asked, why: decision.why, afterwards: decision.afterwards }, action: whatToDoAboutAWaitTheLeadCanAnswer(wait.id, groundId, decision) };
            return { ...a, action: whatToDoAboutALeadAction(a, groundId, whoWaits) };
          })
          : leadActions;
      }
      /*
       * A DECISION THE LEAD PROMISED HERSELF (standing decision 3 of Hafsah's quality pass, 18 October, B-8): to the lead alone, on
       * Release 1's sales board, from her own promise to decide that names a deal and a discount its customer asked for that
       * nobody has answered. Her yes or no goes in how we work, and then it is not asked again. See a-decision-the-lead-promised.
       */
      if (isInitiator && releaseOne && isASalesKind((ground as any).kindOfWork) && theLeadsRow) {
        const dealRows = ((Array.isArray(out.workRecords) ? out.workRecords : []) as any[]).flatMap((s: any) => (s?.rows ?? []) as any[]).filter((r: any) => r?.kind === 'deal' && r.name && r.group !== 'won');
        const wanted = [theLeadsRow, ...new Set(dealRows.map((r: any) => r.ownerParticipantId).filter(Boolean))] as string[];
        const said = ((((await (this.prisma.recordEntry.findMany({ where: { disputedAt: null, participantId: { in: wanted } } as any, select: { text: true, type: true, participantId: true, createdAt: true } as any }) as Promise<any[]>).catch(() => [] as any[])) ?? []) as any[])
          .map((l) => ({ text: cleanText(String(l.text ?? '')), type: l.type ?? null, participantId: l.participantId ?? null, createdAt: l.createdAt })));
        const answers = (((await Promise.resolve((this.prisma as any).groundContextItem?.findMany?.({ where: { groundId, kind: 'WAY_OF_WORKING' }, select: { text: true } })).catch(() => [])) ?? []) as any[]).map((c) => String(c.text ?? ''));
        const firstOf = (pid: string | null) => {
          const p = pid ? (ground.participants as any[]).find((x) => x.id === pid) : null;
          return p ? (String(p.user?.firstName ?? '').trim() || null) : null;
        };
        const promised = theDecisionsTheLeadPromised(
          dealRows.map((r: any) => ({ id: r.id, name: r.name, ownerParticipantId: r.ownerParticipantId ?? null, fields: r.fields ?? null, stage: r.stage ?? null })),
          said.filter((l) => l.participantId === theLeadsRow),
          said.filter((l) => l.participantId !== theLeadsRow),
          firstOf,
          (q) => answers.includes(theAnswerAsALine(q, true)) || answers.includes(theAnswerAsALine(q, false)),
        );
        if (promised.length) {
          out.leadActions = [...((out.leadActions ?? []) as any[]), ...promised.map((p) => ({
            id: `the-leads-own-decision-${p.dealId}`,
            kind: 'decision',
            text: p.question,
            decision: { question: p.question, asked: `${p.question.replace(/^Decide whether /, 'Can ').replace(/^Can (.+?) can have /, 'Can $1 have ')}?`, why: p.why, afterwards: 'Your answer goes in how we work, and the board stops asking.' },
            action: {
              label: 'Decide it',
              says: 'Your answer goes in how we work, and the board stops asking.',
              goesTo: null,
              choices: [true, false].map((yes) => ({ label: yes ? 'Yes, agree to it' : 'No', route: { method: 'POST' as const, path: `/grounds/${groundId}/board/deals/${p.dealId}/decide`, body: { yes } } })),
            },
          }))];
        }
      }
      /*
       * MISSED CHECK-INS (decision 136), to the lead of this check-in alone: three of the last four missed, said as facts and what they do, with the reason
       * the person gave beside it and, if it goes on, the next step as a suggestion. Never a label. Never the lead's own sessions, never a session in approved
       * leave. Not to an admin, a colleague or the person themselves (they read their own on Today).
       */
      if (isInitiator) {
        /* With the direct morning on, the fact, the reason and what to do, without the lecture on what missing costs or "Groundwork will not start one by itself". */
        const missed = (await whoHasMissedCheckIns(this.prisma, [groundId]).catch(() => [] as Awaited<ReturnType<typeof whoHasMissedCheckIns>>))
          .filter((m) => m.stand.stage >= TOLD_THE_LEAD && m.name !== SOMEONE_NAMED);
        const missedSaid = missed
          .map((m) => ({ participantId: m.participantId, name: m.name, text: whatTheLeadReads(m.name, m.stand, undefined, direct), reason: m.stand.reason, suggestion: theNextStepSuggested(m.name, m.stand.stage, direct) }));
        if (missedSaid.length) (out as any).missedCheckIns = missedSaid;
      }
      const obligations = theObligations(people, mine.commitments, handoffs, sessions, reader);
      if (obligations.length) out.obligations = obligations;
      const waits = whoWaitedOnWhom(handoffs, reader);
      if (waits.length) out.whoWaitedOnWhom = waits;
      /*
       * EACH WAIT ON A CUSTOMER, ON ITS DEAL (Hafsah's answer of 17 October), under the same wall as every other wait
       * (`handoffMayBeRead`): "Kevin Omondi has been waiting on Jane for a deposit since 14 October, and it has not been
       * cleared." on the Savannah Cafe deal, and "Waiting on Jane for a deposit" where the deal has no next step said.
       */
      if (waitsOnCustomers.length && Array.isArray(out.workRecords)) {
        const readable = waitsOnCustomers.filter((w) => reader.handoffMayBeRead(w));
        const saidOf = new Map(whoWaitedOnWhom(readable, reader).map((x) => [x.id, x.says]));
        for (const sec of out.workRecords as any[]) {
          for (const row of (sec?.rows ?? []) as any[]) {
            if (row.kind !== 'deal') continue;
            const onIt = readable.filter((w) => w.dealId === row.id && saidOf.has(w.id));
            if (!onIt.length) continue;
            row.waitingOnTheCustomer = onIt.map((w) => {
              const what = String(w.what ?? '').trim().replace(/[.\s]+$/, '');
              return { id: w.id, says: saidOf.get(w.id)!, step: `Waiting on ${String(w.onLabel).trim()} for ${/^[A-Z][a-z]/.test(what) ? what.charAt(0).toLowerCase() + what.slice(1) : what}` };
            });
            if (!row.next && !row.nextStep) row.nextStep = direct ? inAboutEightWords(row.waitingOnTheCustomer[row.waitingOnTheCustomer.length - 1].step) : row.waitingOnTheCustomer[row.waitingOnTheCustomer.length - 1].step;
          }
        }
      }
      /*
       * WHAT EACH DEAL STILL NEEDS, AND FROM WHOM (Hafsah's quality pass, 18 October: Q3, B-5, B-16, R-2, R-4; what-a-deal-still-needs).
       * Release 1's sales board only. From the waits this reader may read (the same wall as every wait) and the owner's own lines
       * only where this reader may read that owner's words: whoever runs it, or the owner reading their own deal.
       */
      if (releaseOne && isASalesKind((ground as any).kindOfWork) && Array.isArray(out.workRecords)) {
        /* Each wait as it was said (before two sayings of one wait were joined), so its own day is kept; under the same wall. */
        const readableWaits = rawDependencies.filter((w) => reader.handoffMayBeRead(w));
        const owners = new Set<string>();
        for (const sec of out.workRecords as any[]) for (const row of (sec?.rows ?? []) as any[]) if (row.kind === 'deal' && row.ownerParticipantId && (runsIt || row.ownerParticipantId === me?.id)) owners.add(row.ownerParticipantId);
        const ownersLines = owners.size
          ? ((((await (this.prisma.recordEntry.findMany({ where: { disputedAt: null, participantId: { in: [...owners] } } as any, select: { text: true, type: true, participantId: true, createdAt: true } as any }) as Promise<any[]>).catch(() => [] as any[])) ?? []) as any[])
            .map((l) => ({ text: cleanText(String(l.text ?? '')), type: l.type ?? null, participantId: l.participantId ?? null, createdAt: l.createdAt })))
          : [];
        const firstNameOf = (pid: string | null) => {
          const p = pid ? (ground.participants as any[]).find((x) => x.id === pid) : null;
          return p ? (String(p.user?.firstName ?? '').trim() || (p.nameGiven ?? '').trim() || null) : null;
        };
        for (const sec of out.workRecords as any[]) {
          for (const row of (sec?.rows ?? []) as any[]) {
            if (row.kind !== 'deal') continue;
            const theirs = ownersLines.filter((l) => l.participantId === row.ownerParticipantId);
            const line = whatTheDealStillNeeds(
              { name: row.name, ownerParticipantId: row.ownerParticipantId ?? null, group: row.group ?? null, stage: row.stage ?? null, fields: row.fields ?? null, buyingDate: row.buyingDate ?? null, notAnsweringSince: row.notAnsweringSince ?? null, paysWhen: whenTheyPay(row.fields ?? null, theirs.map((l) => ({ text: l.text, createdAt: new Date(l.createdAt) }))) },
              readableWaits,
              theirs,
              { me: me?.id ?? null, lead: theLeadsRow, firstName: firstNameOf },
            );
            const valueLine = theValueLine({ name: row.name, ownerParticipantId: row.ownerParticipantId ?? null, fields: row.fields ?? null }, readableWaits, { me: me?.id ?? null, lead: theLeadsRow, firstName: firstNameOf }, theUnitsOf(row.fields ?? null));
            if (valueLine && valueLine !== row.value) row.valueLine = valueLine;
            if (!line) continue;
            row.next = line.says;
            /* In about eight words where the direct morning is on (Hafsah, 25 October); off, as before. */
            row.nextStep = direct ? inAboutEightWords(line.says) : line.says;
            row.nextSays = line.says;
            row.nextKnown = 'said';
            if (line.on) row.nextOn = line.on.toISOString().slice(0, 10);
          }
        }
      }
      /*
       * BLOCKERS, ONE SECTION (request 105): each open blocker with every time it was raised, what the
       * proof shows, the time given, and what would clear it only where somebody said so. Under the
       * same wall as every other wait (`handoffMayBeRead`). See the-blockers.
       */
      const sessionOfCheckIn = new Map((checkIns as any[]).map((c) => [c.id, c.sessionNumber as number]));
      const blockers = theBlockers(
        handoffs,
        mine.commitments,
        mine.lines.map((l) => ({ ...l, wordsMayBeRead: mayReadEveryone || l.participantId === me?.id || !peersWalled })),
        (id) => (id ? sessionOfCheckIn.get(id) ?? null : null),
        reader,
        undefined,
        /* Behind Release 1's switch, a promise is what would clear a wait only by person and subject (Hafsah's point 8). */
        {
          byPersonAndSubject: releaseOne,
          /* And, on Release 1's sales board, the kit's card (the-blockers, theKitsCard; quality pass B-10, B-17 to B-20). */
          theKitsCard: releaseOne && isASalesKind((ground as any).kindOfWork)
            ? {
              deals: ((Array.isArray(out.workRecords) ? out.workRecords : []) as any[]).flatMap((sec: any) => (sec?.rows ?? []) as any[]).filter((x: any) => x?.kind === 'deal')
                .map((x: any) => ({ name: String(x.name), fields: x.fields ?? null, buyingDate: x.buyingDate ?? null, units: theUnitsOf(x.fields ?? null) })),
              firstName: (pid: string | null) => {
                const p = pid ? (ground.participants as any[]).find((x) => x.id === pid) : null;
                return p ? (String(p.user?.firstName ?? '').trim() || (p.nameGiven ?? '').trim() || null) : null;
              },
              waitsAsSaid: rawDependencies.filter((w) => reader.handoffMayBeRead(w)),
              isAYesOrNo: (w: { what?: string | null }) => !!aWaitTheLeadCanAnswer(w, 'Somebody'),
              linesOf: (pid: string | null) => (mine.lines as any[]).filter((l) => l.participantId === pid && l.createdAt && (mayReadEveryone || l.participantId === me?.id || !peersWalled)).map((l) => ({ text: l.text, createdAt: l.createdAt })),
            }
            : null,
        },
      );
      if (blockers.length) out.blockers = blockers;
      /*
       * WHAT MOVED EACH DAY, FOR THE REPORTS LIST (Hafsah's quality pass, 18 October, B-24; the kit's "6 of 6 checked in. Nyama Choma
       * Palace paid."): to whoever runs it, on Release 1's sales board, one sentence a day from the deals: a payment record, else a
       * signed order, else a customer's yes to a quote, on the day it came in.
       */
      if (releaseOne && runsIt && isASalesKind((ground as any).kindOfWork) && Array.isArray(out.workRecords)) {
        const byDay = new Map<string, { rank: number; says: string }>();
        const put = (day: string | null | undefined, rank: number, says: string) => {
          if (!day) return;
          const had = byDay.get(day);
          if (!had || rank < had.rank) byDay.set(day, { rank, says });
        };
        for (const sec of out.workRecords as any[]) for (const r of ((sec?.rows ?? []) as any[])) {
          if (r?.kind !== 'deal') continue;
          const units = theUnitsOf(r.fields ?? null);
          const forUnits = units ? ` for ${units} ${units === 1 ? 'unit' : 'units'}` : '';
          const proofDay = ((r.contactHistory ?? []) as any[]).filter((c) => /proof/i.test(String(c.how ?? ''))).map((c) => String(c.on)).sort()[0] ?? null;
          if (r.paymentRecord && r.deposit) put(proofDay, 0, `${r.name} paid a deposit${forUnits}, ${String(r.deposit.says ?? '').replace(/^Deposit paid, /, '').replace(/\.$/, '')}.`.replace(/, A deposit is paid\.$/, '.'));
          else if (r.paymentRecord) put(proofDay, 0, `${r.name} paid${forUnits}.`);
          else if (r.signedOrder) put(proofDay, 1, `${r.name} signed${forUnits}.`);
          const yes = String(r.fields?.['Quote accepted'] ?? '').slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(yes)) put(yes, 2, `${r.name} said yes${units ? ` to ${units} ${units === 1 ? 'unit' : 'units'}` : ' to the quote'}.`);
        }
        if (byDay.size) out.whatMovedEachDay = Object.fromEntries([...byDay.entries()].map(([d, v]) => [d, v.says]));
      }
      /* What to coach each rep this week, one line about the work, to whoever runs it (Q6; what-to-coach-this-week). */
      if (releaseOne && runsIt && judged && isASalesKind((ground as any).kindOfWork) && Array.isArray(out.eachPersonToday) && Array.isArray(out.workRecords)) {
        const dealRows = (out.workRecords as any[]).flatMap((sec: any) => (sec?.rows ?? []) as any[]).filter((r: any) => r?.kind === 'deal');
        const crit = (r: any) => (eachDealInItsGroup('sales org', [{ section: 'Deal grid', stages: theSalesStages((ground as any).workStages), rows: [r] }] as any, deadlineOf(ground as any), now, { countedFromTheDeals: true, contactedWhenSpokenOf: true, byBuyingDate: true, criteria: criteriaFor(), stallDays }) as any[])?.[0]?.rows?.[0]?.criteria ?? [];
        const owners = [...new Set(dealRows.map((r: any) => r.ownerParticipantId).filter(Boolean))] as string[];
        const said = owners.length
          ? ((((await (this.prisma.recordEntry.findMany({ where: { disputedAt: null, participantId: { in: owners } } as any, select: { text: true, type: true, participantId: true, createdAt: true } as any }) as Promise<any[]>).catch(() => [] as any[])) ?? []) as any[])
            .map((l) => ({ text: cleanText(String(l.text ?? '')), type: l.type ?? null, participantId: l.participantId ?? null, createdAt: l.createdAt })))
          : [];
        const coachFirst = (pid: string | null) => (pid ? String((ground.participants as any[]).find((x) => x.id === pid)?.user?.firstName ?? '').trim() || null : null);
        const coached = dealRows.map((r: any) => ({ name: r.name, ownerParticipantId: r.ownerParticipantId ?? null, stage: r.stage ?? null, fields: r.fields ?? null, buyingDate: r.buyingDate ?? null, lost: r.lost ?? null, criteria: crit(r) }));
        out.eachPersonToday = (out.eachPersonToday as any[]).map((row) => {
          const line = whatToCoachThisWeek(row.participantId, coachFirst(row.participantId) ?? 'them', coached, rawDependencies.filter((w) => reader.handoffMayBeRead(w)), said, coachFirst);
          return line ? { ...row, thisWeek: line } : row;
        });
      }
      /*
       * A PROMISE CARRIED OVER, THREE CHECK-INS RUNNING (standing decision 5, as changed on 18 October; a-promise-carried-over), on
       * Release 1's sales board: to whoever runs it, each one; to a person, only their own. Said about the work, in our words.
       */
      if (releaseOne && isASalesKind((ground as any).kindOfWork)) {
        const readableWaits = (handoffs as any[]).filter((w) => reader.handoffMayBeRead(w));
        const holders = [...new Set(readableWaits.map((w) => w.onParticipantId).filter(Boolean))] as string[];
        const theirCheckIns = (checkIns as any[]).filter((c) => holders.includes(c.participantId));
        const turns = theirCheckIns.length
          ? ((((await (this.prisma as any).conversationTurn?.findMany?.({ where: { checkInId: { in: theirCheckIns.map((c) => c.id) } }, select: { checkInId: true, role: true, content: true, createdAt: true }, orderBy: { createdAt: 'asc' } })?.catch?.(() => [])) ?? []) as any[]))
          : [];
        const dealNames = ((Array.isArray(out.workRecords) ? out.workRecords : []) as any[]).flatMap((sec: any) => (sec?.rows ?? []) as any[]).filter((r: any) => r?.kind === 'deal').map((r: any) => String(r.name));
        const carried = thePromisesCarriedOver(readableWaits, checkIns as any[], mine.lines as any[], turns, dealNames)
          .filter((x) => runsIt || x.participantId === me?.id);
        if (carried.length) {
          out.keepsComingUp = carried.map((x) => ({ participantId: x.participantId, says: x.says, yours: x.participantId === me?.id }));
          if (Array.isArray(out.eachPersonToday)) {
            out.eachPersonToday = (out.eachPersonToday as any[]).map((row) => {
              const mineToo = carried.find((x) => x.participantId === row.participantId);
              return mineToo && !row.keepsComingUp ? { ...row, keepsComingUp: mineToo.says } : row;
            });
          }
        }
      }
      /*
       * THE GLANCE COUNTS WHAT THE BLOCKERS LIST HOLDS (request 132 a and b, request 129 item 2). The glance was counted by
       * its own rule, with a bar of substance the list does not use, so the lead read "1 thing is in the way" over a list of
       * 2, and a participant read "Nothing is in the way" over her own blocking wait. For the same reader, the count is the
       * list's, and the oldest is the oldest one on it.
       */
      if (out.howItIsGoing?.glance?.inTheWay && blockers.length !== out.howItIsGoing.glance.inTheWay.count) {
        const theWay = out.howItIsGoing.glance.inTheWay;
        const oldestListed = [...blockers].filter((b: any) => b.raised?.firstRaisedAt).sort((a: any, b: any) => String(a.raised.firstRaisedAt).localeCompare(String(b.raised.firstRaisedAt)))[0];
        const oldestName = oldestListed ? String(oldestListed.name ?? '').trim().replace(/^["\u201c](.*)["\u201d]$/, '$1') : null;
        out.howItIsGoing = {
          ...out.howItIsGoing,
          glance: {
            ...out.howItIsGoing.glance,
            inTheWay: blockers.length === 0
              ? { ...theWay, count: 0, oldest: null, daysWaiting: null, since: null, sinceSays: null }
              : { ...theWay, count: blockers.length, ...(theWay.oldest ? {} : { oldest: oldestName || null, since: oldestListed?.raised?.firstRaisedAt ?? null, sinceSays: oldestListed?.raised?.firstRaisedAt ? `since ${theDayItBegan(oldestListed.raised.firstRaisedAt, new Date(oldestListed.raised.firstRaisedAt))}` : null }) },
          },
        };
      }
      /* And the header said in full sentences for this reader, from the list they are served (request 134 item 6). */
      if (out.howItIsGoing?.glance?.inTheWay) {
        out.howItIsGoing = {
          ...out.howItIsGoing,
          glance: {
            ...out.howItIsGoing.glance,
            inTheWay: { ...out.howItIsGoing.glance.inTheWay, says: theGlanceInASentence(blockers as any[], (iso) => theDayItBegan(iso, recordsClock), Number(/^(\d+) worr/.exec(String((out.quickRead as any[] | undefined)?.find?.((t: any) => t?.label === 'Blockers')?.value ?? ''))?.[1] ?? 0)) },
          },
        };
      }
      const contradictions = theContradictions(mine.commitments, sessions, reader);
      if (contradictions.length) out.contradictions = contradictions;
      const questionsForTheLead = theQuestionsForTheLead(mine.commitments, handoffs, sessions, reader);
      if (questionsForTheLead.length) out.questionsForTheLead = questionsForTheLead;
      /* The onboarding board's own sections (request 123), from the same rows and under the same wall. See what-was-agreed-at-the-start. A string on the other boards, an object or null here. */
      if (family === BoardFamily.ONBOARDING) {
        const goals = await theGoalsSetForAnyone(this.prisma, groundId);
        const agreed = whatWasAgreedAtTheStart({ goals, commitments: mine.commitments, sessions, people, startsAt: (ground as any).startsAt ?? null, createdAt: (ground as any).createdAt ?? null, reader });
        (out as any).startingState = agreed;
        const change = changeSinceTheLastCheckIn({ commitments: mine.commitments, handoffs, goals, sessions, people, reader, now });
        if (change) (out as any).changeSinceLast = change;
        /* The 90 days, in three steps (request 123), from the same goals, commitments and waits, under the same wall. */
        const leadOfIt = (ground.participants as any[]).find((p) => p.id === theLeadsRow);
        const ninety = theNinetyDaysInThreeSteps({
          goals, commitments: mine.commitments, handoffs, sessions, people, startsAt: (ground as any).startsAt ?? null, createdAt: (ground as any).createdAt ?? null,
          leadFirstName: theFirstNameOfAParticipant(leadOfIt),
          readerIsTheLead: isInitiator, reader, now,
        });
        if (ninety) (out as any).ninetyDays = ninety;
      }
      /*
       * Built from the targets this reader is already served, so every wall on a target holds here too. Never on an
       * evaluation check-in. It says the aim or the limit, so it goes only to those who read aims and limits (decision
       * 73, as the weekly report): whoever runs the check-in, an admin of the organisation (decision 86 reverses
       * decision 73 for admins, the chief executive included), and a person in it only where everybody sees the targets.
       */
      const readsTheAims = runsIt || runsThisGround || (!!me && (ground as any).whoSeesTargets === 'EVERYBODY');
      if (!evaluation && readsTheAims && Array.isArray(out.objectives) && (out.objectives as any[]).length) {
        const stored = new Map(((ground.objectives ?? []) as any[]).map((o) => [o.id, o]));
        /* A count that starts again each week is not carried forward at a pace (whereAWeeklyCountStands). */
        const served = (out.objectives as any[]).filter((o) => stored.has(o.id) && countedFromTheDeals.get(o.id)?.window !== 'week').map((o) => {
          const row = stored.get(o.id);
          return { id: o.id, about: String(o.name ?? ''), target: typeof o.target === 'number' ? o.target : null, ownerParticipantId: o.ownerParticipantId ?? null, direction: asADirection(row.direction) ?? whatTheWordsSuggest(row.name, row.target) };
        });
        const counts = await (this.prisma.groundObjectiveSnapshot.findMany({ where: { groundId }, select: { objectiveId: true, sessionNumber: true, count: true } }) as Promise<any[]>).catch(() => [] as any[]);
        const forecast = theForecast(served, (counts ?? []) as any[], totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null)
          /*
           * NO PACE FROM TOO LITTLE (Hafsah's quality pass, 18 October, B-26): "about 215 by session 15" was carried forward from two
           * orders in three sessions. On Release 1's sales board, an aim counted from the deals is carried forward only from four
           * sessions and three sales or more.
           */
          .filter((f: any) => {
            const c = countedFromTheDeals.get(f.objectiveId);
            if (!releaseOne || !c) return true;
            const sessionsCounted = new Set(((counts ?? []) as any[]).filter((x) => x.objectiveId === f.objectiveId).map((x) => x.sessionNumber)).size;
            const sales = theDealsTheCountIsMadeOf(c).length;
            return sessionsCounted >= 4 && sales >= 3;
          });
        if (forecast.length) out.forecast = forecast;
        /*
         * WHERE EACH TARGET STANDS, AND THE HEADLINE QUESTION (request 108, a and b). From the same targets and
         * counts as the forecast, under the same gate, so nothing reaches a reader who could not already read the
         * target and its number. A word only on a team target: on somebody's own target it would be a label on them.
         * See the-headline-and-where-each-target-stands.
         */
        const totalSessions = totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null;
        const countsOf = (id: string) => ((counts ?? []) as any[]).filter((c) => c.objectiveId === id && typeof c.sessionNumber === 'number');
        const aims: ATeamAim[] = [];
        /* What the deals under "Likely" hold, for an aim counted from the deals: the prototype's "and 2 more are likely". From the same rows and groups as the deal grid. */
        const salesHere = isASalesKind((ground as any).kindOfWork);
        const likelyDeals = salesHere && countedFromTheDeals.size
          ? ((eachDealInItsGroup('sales org', out.workRecords as any, deadlineOf(ground as any), now, { countedFromTheDeals: releaseOne, contactedWhenSpokenOf: releaseOne, byBuyingDate: releaseOne, criteria: criteriaFor(), stallDays }) ?? []) as any[]).flatMap((sec) => (sec.rows ?? []) as any[]).filter((r) => r.kind === 'deal' && r.group === 'likely')
          : [];
        out.objectives = (out.objectives as any[]).map((o) => {
          const row = stored.get(o.id);
          if (!row || o.ownerParticipantId || row.isADecisionAboutAPerson) return { ...o, stands: null };
          const direction = theDirectionToReadIn(asADirection(row.direction), row.name);
          const journeyDirection = (o.journey?.direction ?? 'unknown') as 'up' | 'down' | 'unknown';
          const start = typeof o.journey?.start === 'number' ? o.journey.start : null;
          const dueDay = theDayItIsDue(row.dueOn, now);
          const weekly = countedFromTheDeals.get(o.id)?.window === 'week' && typeof o.target === 'number' && !direction;
          const stands = weekly
            ? whereAWeeklyCountStands(o.count, o.target)
            : whereThisTargetStands(
              { id: o.id, target: typeof o.target === 'number' ? o.target : null, count: o.count, start, direction, journeyDirection, notSettled: o.notSettled ?? null, dueDay, isPast: aDeadlineHasPassed(row.dueOn, now) },
              countsOf(o.id), totalSessions,
            );
          const fromTheDeals = countedFromTheDeals.get(o.id) ?? null;
          aims.push({
            id: o.id, name: String(row.name ?? ''), target: typeof o.target === 'number' ? o.target : null, count: o.count, start, direction, journeyDirection, word: stands?.word ?? null, dueDay,
            ...(fromTheDeals ? { fromTheDeals, likely: whatTheseDealsHold(fromTheDeals.counts, likelyDeals, fromTheDeals.currency) } : {}),
          });
          return { ...o, stands };
        });
        const leadFirst = (ground.participants as any[]).find((p) => p.id === theLeadsRow)?.user?.firstName ?? null;
        const headline = theHeadlineQuestion(aims, deadlineOf(ground as any), now, { askedBy: isInitiator ? 'you' : leadFirst });
        if (headline) out.headline = headline;
      }
      /*
       * WHERE THIS IS HEADING (request 108 d). To whoever runs the check-in (the lead and the admin who set it
       * up) and, since decision 93 (row 14), to any admin of the organisation, never on an evaluation check-in, where the suggestion and the decision already have their own way
       * (decision 6). Built from what this reader is already served and the endings the check-in's own way of
       * recording a decision offers. See where-this-is-heading.
       */
      /* ON AN EVALUATION CHECK-IN, THE LEAD ONLY (Hafsah's answer 3, 16 October 2026): the possible outcomes are about a person,
         so only the lead reads them; the person sees the facts, then the decision with its reasons once it is made (decision 6),
         and nobody else, not even the admin who set it up, reads where it is heading. */
      if ((!evaluation && (runsIt || adminHere)) || (evaluation && isInitiator)) {
        const leadRow = (ground.participants as any[]).find((p) => p.id === theLeadsRow);
        const leadName = [leadRow?.user?.firstName, leadRow?.user?.lastName].filter(Boolean).join(' ').trim() || (leadRow?.nameGiven ?? '').trim() || null;
        /* Release 1's sales board, to whoever runs it: the signals and what would settle it, from the deals (theSalesSignals; B-26 to B-28). */
        let sales: { signals: any[]; whatWouldSettleIt: string[] } | null = null;
        const teamAim = ((ground.objectives ?? []) as any[]).find((o) => !o.ownerParticipantId && countedFromTheDeals.get(o.id) && countedFromTheDeals.get(o.id)!.counts !== 'new leads' && typeof o.target === 'number');
        if (releaseOne && isInitiator && isASalesKind((ground as any).kindOfWork) && teamAim) {
          const c = countedFromTheDeals.get(teamAim.id)!;
          const last = (theSalesStages((ground as any).workStages).slice(-1)[0] ?? 'Won').toLowerCase();
          const open = theDealsCounted.filter((d) => String(d.stage ?? '').toLowerCase() !== last && !d.dropped);
          const openHold = whatTheseDealsHold(c.counts, open as any, c.currency);
          const firstOf = (pid: string | null) => (pid ? String((ground.participants as any[]).find((x) => x.id === pid)?.user?.firstName ?? '').trim() || null : null);
          const waiting = new Map<string, { count: number; aboutPrice: boolean }>();
          for (const w of rawDependencies) {
            if (!theLeadsRow || w.onParticipantId !== theLeadsRow || !w.fromParticipantId || String(w.status).toUpperCase() === 'CLEARED' || w.clearedAt) continue;
            const had = waiting.get(w.fromParticipantId) ?? { count: 0, aboutPrice: true };
            waiting.set(w.fromParticipantId, { count: had.count + 1, aboutPrice: had.aboutPrice && /\b(?:price|discount|quote|offer)\b/i.test(String(w.what ?? '')) });
          }
          for (const a of ((out.leadActions ?? []) as any[]).filter((x) => String(x?.id ?? '').startsWith('the-leads-own-decision-'))) {
            const dealId = String(a.id).replace('the-leads-own-decision-', '');
            const owner = theDealsCounted.find((d) => d.id === dealId)?.ownerParticipantId ?? null;
            if (!owner) continue;
            const had = waiting.get(owner) ?? { count: 0, aboutPrice: true };
            waiting.set(owner, { count: had.count + 1, aboutPrice: had.aboutPrice });
          }
          const paymentsDue: { says: string; day: string | null }[] = [];
          for (const d of open) {
            const contact = String(d.fields?.Contact ?? '').trim();
            const w = rawDependencies.find((x) => !x.onParticipantId && x.fromParticipantId === d.ownerParticipantId && String(x.status).toUpperCase() !== 'CLEARED' && !x.clearedAt
              && (!!contact && String(x.onLabel ?? '').trim().toLowerCase() === contact.toLowerCase()) && /\b(?:deposit|payment|pay)\b/i.test(String(x.what ?? '')));
            if (!w) continue;
            const day = w.dueOn ? new Date(w.dueOn) : theDayTheyMeant(w.dueSaid ?? null, new Date(w.createdAt));
            paymentsDue.push({ says: `${d.name} pays its ${/deposit/i.test(String(w.what)) ? 'deposit' : 'payment'}`, day: day ? aDaySaidInFull(day) : null });
          }
          for (const d of theDealsCounted.filter((x) => String(x.stage ?? '').toLowerCase() === last && !x.paid && x.paysWhen)) {
            const m = String(d.paysWhen).match(/^pays (on delivery)?(?: ?on )?(.*)$/);
            paymentsDue.push({ says: `${d.name} pays${m?.[1] ? ' on delivery' : ''}`, day: m?.[2] ? m[2].trim() || null : null });
          }
          sales = theSalesSignals({
            sold: c.count, target: teamAim.target, thing: c.counts === 'value' ? '' : c.thing,
            wonDeals: theDealsTheCountIsMadeOf(c).map((x) => x.name),
            openHold,
            answersWaiting: [...waiting.entries()].map(([pid, v]) => ({ first: firstOf(pid) ?? 'Somebody', ...v })),
            paymentsDue,
          });
        }
        out.whereThisIsHeading = whereThisIsHeading({
          sales,
          scenario: ground.scenario,
          hadAnObjective: ((ground.objectives ?? []) as any[]).length > 0,
          readerIsTheLead: isInitiator,
          leadName,
          board: out,
          decided: (ground as any).status === 'CLOSED' || (ground as any).status === 'RESOLVED'
            ? { endState: (ground as any).endState ?? null, on: (ground as any).resolvedAt ?? null }
            : null,
          now,
          who: whoTheEndingIsAbout(ground.participants as any[], visibleNames, me?.id ?? null),
        });
      }
    }

    /*
     * AND LAST, WHAT THE LEAD HAS NOT SHARED, IN THE WORDS AS WELL AS THE FIELDS. Hafsah, 28 September
     * 2026: neither a private file's name nor a hidden target's number may reach anyone the lead has
     * not shared it with. The fields were already walled; the sentences were not (screens requests
     * 46 and 63). Read over everything this reader is served, once, here, so a section added later
     * is covered by being served. See a-private-file-is-not-named and a-hidden-target-stays-hidden.
     */
    {
      const reader = { participantId: me?.id ?? null, isLead: isInitiator || adminHere };
      const docsHere = await ((this.prisma as any).groundDocument?.findMany?.({ where: { groundId }, select: { fileName: true, visibility: true, participantId: true } }) ?? Promise.resolve([])).catch(() => []);
      const privateNames = namesThisReaderMayNotOpen(docsHere as any[], reader, (d, r) => canSeeDocument(d as any, r, true));
      const namesOfPerson = (pid: string) => {
        const p = (ground.participants as any[]).find((x) => x.id === pid);
        const first = (p?.user?.firstName ?? '').trim();
        const full = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim();
        return [full, first, (p?.nameGiven ?? '').trim(), nameOf(pid) ?? ''].filter((n: string) => n && n.length > 1);
      };
      /* An admin reads every share, so no share is hidden from an admin's words either (decision 86). */
      const hiddenTargets = targetsHiddenFrom(
        { participantId: me?.id ?? null, isTheLead: runsThisGround },
        (ground as any).whoSeesTargets,
        (ground.objectives ?? []) as any[],
        namesOfPerson,
        /* And a target written only in the lead's words about somebody (targetsFromTheirRemits). */
        ground.participants as any[],
      );
      /* A row about one person loses any sentence with that person's hidden number in it. */
      if (Array.isArray(out.eachPerson) && hiddenTargets.length) {
        out.eachPerson = (out.eachPerson as any[]).map((row) => {
          const theirs = ((ground.objectives ?? []) as any[]).find((o) => o.ownerParticipantId === row.participantId && typeof o.target === 'number');
          const aboutOnly = theirs && hiddenTargets.length ? { names: namesOfPerson(row.participantId), target: theirs.target } : undefined;
          if (!aboutOnly) return row;
          return {
            ...row,
            ...(typeof row.says === 'string' ? { says: withoutHiddenTargets(row.says, hiddenTargets, { aboutOnly }) } : {}),
            ...(typeof row.finding === 'string' ? { finding: withoutHiddenTargets(row.finding, hiddenTargets, { aboutOnly }) } : {}),
          };
        });
      }
      /* And no internal label reaches anyone, whichever section it sits in. See reports/no-internal-label-reaches-anyone. */
      const called = whatEachLabelIsCalled(ground.participants as any[], { viewerParticipantId: me?.id ?? null, viewerIsLead: runsThisGround, peersAreNamed: !!peersVisible });
      /* Labels become names first, so the hidden-target read can find the person (see reports.service). */
      /*
       * WHAT PEOPLE SAID STAYS AS THEY SAID IT (screens request 77). Names and a private file's name
       * are swapped in every field, the lines people said included; the hidden-target rule is for
       * Groundwork's own sentences, so each line a person said is held aside while it runs. See
       * their-own-words-stay.
       */
      let walled = withTheirOwnWordsKept(
        withoutPrivateFileNamesIn(withoutInternalLabelsIn(out, called), privateNames),
        THEIR_OWN_WORDS_ON_THE_BOARD,
        (v) => withoutHiddenTargetsIn(v, hiddenTargets),
      ) as any;
      /* A goal the lead has not told somebody about is in no sentence anybody but the lead reads. See
         grounds/a-goal-not-told-stays-with-the-lead. */
      if (!theyRunIt) {
        walled = withoutGoalsNotToldIn(walled, [
          ...(await this.goalsNotToldYet(groundId)),
          /* And the objectives the engine wrote from them, in its own words (decisions 48 and 56). */
          ...theWordsOfWhatTheLeadHasNotToldThemAbout(ground.objectives as any[], await this.untoldGoalRows(groundId), ground.participants as any[], false)
            .filter((t) => !(ground.objectives as any[]).every((o) => o.name !== t)),
        ]);
      }
      /* The shared read of the answers carries no sentence that is a reading of the lead, to anybody but the lead. */
      if (!isInitiator && walled.whatTheAnswersSay) {
        const leadRow = (ground.participants as any[]).find((p) => p.id === theLeadsRow);
        const leadNames = [[leadRow?.user?.firstName, leadRow?.user?.lastName].filter(Boolean).join(' '), leadRow?.user?.firstName ?? '', leadRow?.nameGiven ?? ''];
        walled.whatTheAnswersSay = theSharedReadWithoutTheLeadsJudgement(walled.whatTheAnswersSay, leadNames);
      }
      /* An aim whose only sentence was the hidden number is not left on the board as an empty line. */
      if (Array.isArray(walled.objectives)) walled.objectives = walled.objectives.filter((o: any) => !(typeof o?.aim === 'string' && !o.aim.trim()));
      /* What the room is about, said to this reader: the wall of decision 75 item 14 where people do not see each other, then their own aims in "you", and a row a wall emptied is dropped. The check-in page reads it the same way. See the-room-for-this-reader. */
      if (walled.whatTheRoomIsAbout) {
        walled.whatTheRoomIsAbout = theRoomForThisReader(walled.whatTheRoomIsAbout, {
          participants: ground.participants as any[],
          me,
          initiatorId: ground.initiatorId,
          viewerRunsIt: runsThisGround,
          wallOffTheOthers: whoMaySee.peersHidden && !isEvaluationCheckIn(ground.scenario),
        });
      }
      /* And a line with no words is left out here, never served for the page to draw as an empty line. */
      walled = withoutLinesWithNoWords(walled, ['whoOwnsWhat', '*', 'items'], 'text');
      /* Each line is a person's own words, so it is served as theirs, in quotation marks with their name. See what-each-person-said-is-in-their-name. */
      if (Array.isArray(walled.whoOwnsWhat)) walled.whoOwnsWhat = eachLineInTheirName(walled.whoOwnsWhat, me?.id ?? null);
      /*
       * PART 3, HAFSAH'S RULING, 30 SEPTEMBER 2026: in an evaluation check-in, the person being
       * reviewed reads the facts on this board, never a colleague's exact words - those stay with
       * the manager (an admin WITH access to this check-in reads as the manager does). See
       * colleagues-exact-words-stay-with-the-manager.ts. A colleague giving a view, and every
       * reader on every other kind of check-in, reads `whoOwnsWhat` and `divergence` exactly as
       * before - this is a no-op for them.
       *
       * DECISION 60 POINT 4, 30 September 2026: an admin WITHOUT access to this check-in reads no
       * colleague's exact words here either - the SAME access rule decision 58 gave patterns
       * (`runsItForAPattern`), never `runsThisGround`, which also counts every admin of the
       * organisation (`adminHere`). `isLead` here is deliberately narrower than `runsThisGround`.
       */
      const evaluationWordsRunsIt = runsItForAPattern(ground as any, requestingUserId);
      const adminWithoutCheckInAccess = adminHere && !evaluationWordsRunsIt && isEvaluationCheckIn(ground.scenario);
      if (viewerIsTheSubjectOfAnEvaluationCheckIn({
        scenario: ground.scenario,
        isLead: isInitiator || evaluationWordsRunsIt,
        viewerParticipantId: me?.id ?? null,
        participants: ground.participants as any,
      }) || adminWithoutCheckInAccess) {
        if (Array.isArray(walled.whoOwnsWhat)) walled.whoOwnsWhat = whoOwnsWhatForTheSubject(walled.whoOwnsWhat, me?.id ?? null, { aDecisionIsBelow: !!((ground as any).resolvedAt || (ground as any).endState), theLeadsRow: theNewHireReadsTheLead ? theLeadsRow : null });
        if (Array.isArray(walled.divergence?.items)) {
          walled.divergence = {
            ...walled.divergence,
            items: divergenceForTheSubject(walled.divergence.items, [me?.id ? nameOf(me.id) : null], {
              /* The subject's own lines, and the lead's where the new hire reads the lead's own words (request 124). */
              subjectRecord: await (async () => {
                const byParticipant = await theRecordAQuoteMayComeFromByParticipant(this.prisma as any, groundId).catch(() => new Map<string, string[]>());
                return [...(me?.id ? (byParticipant.get(me.id) ?? []) : []), ...(theNewHireReadsTheLead && theLeadsRow ? (byParticipant.get(theLeadsRow) ?? []) : [])];
              })(),
              theLeadsWordsAreReadable: theNewHireReadsTheLead,
              leadNames: [theLeadsRow ? nameOf(theLeadsRow) : null, 'Your lead', 'The lead', 'your lead', 'the lead'],
              /* "...and the decision with its reasons, are below" only where a decision has been made (request 124, part 2). */
              aDecisionIsBelow: !!((ground as any).resolvedAt || (ground as any).endState),
            }),
          };
        }
      }
      /*
       * THE NAME OF AN EVALUATION CHECK-IN, FOR THE PERSON IT IS ABOUT AND FOR A COLLEAGUE. The label is the
       * lead's own ("Formal improvement plan: the account manager"), which describes the person and names the
       * plan before anybody has told them. Neither reads it; they read whose check-in it is (decisions 4 and 30,
       * "no labels on people"). The lead, and an admin given access, read the label as the lead typed it.
       */
      if (isEvaluationCheckIn(ground.scenario) && !(isInitiator || evaluationWordsRunsIt)) {
        /* The first name, never a title in the first-name field: "Dr" with "Amina Bello" is Amina (item 18). */
        const theLeadsUser = (ground.participants as any[]).find((p) => p.partyType === 'INITIATOR')?.user;
        const leadFirst = (theFirstNameFrom(theLeadsUser?.firstName, theLeadsUser?.lastName) ?? '').trim();
        const theirs = viewerIsTheSubjectOfAnEvaluationCheckIn({ scenario: ground.scenario, isLead: false, viewerParticipantId: me?.id ?? null, participants: ground.participants as any });
        walled.title = leadFirst ? `${theirs ? 'Your' : 'A'} check-in with ${leadFirst}` : (theirs ? 'Your check-in' : 'A check-in');
      }
      /* A record whose name was only a hidden number is not left as a row with no name. */
      if (Array.isArray(walled.workRecords)) {
        walled.workRecords = walled.workRecords.map((sec: any) => (Array.isArray(sec.rows)
          ? (() => {
            const rows = sec.rows.filter((r: any) => typeof r?.name === 'string' && r.name.trim());
            return { ...sec, rows, state: rows.length ? 'filled' : 'none-yet' };
          })()
          : sec));
      }
      /*
       * FIVE KINDS OF WORK GET THEIR OWN BOARD SHAPE (request 105; the prototype's gov, loans, matter, mvnext
       * and mvq4 examples). Built from the board as this reader is served it, after every wall above, plus the
       * numbers from another system and the lines a document says differently, each read under the same
       * walls. Nothing is invented: a section the record cannot fill says so. See each-kind-gets-its-own-board.
       */
      {
        const kind = oneOfTheKinds((ground as any).kindOfWork);
        const evaluationHere = isEvaluationCheckIn(ground.scenario);
        const readerRunsIt = isInitiator || evaluationWordsRunsIt || (runsThisGround && !evaluationHere);
        /* Only for whoever runs the check-in: a person who checks in reads their own board (part 3), and the person
           reviewed on an evaluation check-in is never told how many others answered or are waiting (decision 17). */
        if (kind && readerRunsIt) {
          const answeredBy = new Set((checkIns as any[]).filter((c) => String(c.status).toUpperCase() === 'COMPLETED' && !wasAQuietClose(c)).map((c) => c.participantId));
          /* Somebody an admin has not let in yet is not one of the cohort's count (decision 77). */
          const people = (ground.participants as any[]).filter((p) => !isNotLetInYet(p) || answeredBy.has(p.id)).map((p) => ({
            id: p.id,
            name: p.id === me?.id ? 'You' : (nameOf(p.id) ?? aColleague(p.id)),
            managingOnly: !!p.managingOnly,
            isLead: p.id === theLeadsRow,
            answered: answeredBy.has(p.id),
            /* The lead's own words about who each person is, as this reader is already served them on the board's own
               participants (the lead alone; theLeadsWordsAbout, applied once there). */
            describedAs: ((walled as any).participants ?? []).find((x: any) => x.id === p.id)?.role ?? null,
          }));
          /* Numbers from another system about what this check-in is about: only whoever runs it reads them. */
          const subject = (ground as any).subjectExternalId as string | null;
          const metrics = readerRunsIt && subject && (kind === 'a government programme' || kind === 'MarketView Q4')
            ? await ((this.prisma as any).productMetric?.findMany?.({
              where: { organizationId: ground.organizationId, subjectExternalId: subject },
              orderBy: { asOf: 'desc' },
              take: 12,
              select: { key: true, says: true, value: true, unit: true, asOf: true, sourceSystem: true, subjectExternalId: true },
            }) ?? Promise.resolve([])).catch(() => [])
            : [];
          /* A line a document says differently, only where this reader may open that document. */
          const documentSaysOf = new Map<string, string>();
          if (kind === 'MarketView Q4') {
            const differ = await ((this.prisma.recordEntry.findMany({
              where: { disputedAt: null, participant: { groundId }, documentSays: { not: null } } as any,
              select: { id: true, documentSays: true, documentSaysId: true } as any,
            }) as Promise<any[]>).catch(() => [] as any[]));
            const docIds = [...new Set((differ ?? []).map((d: any) => d.documentSaysId).filter(Boolean))];
            const docs = docIds.length
              ? await ((this.prisma as any).groundDocument?.findMany?.({ where: { id: { in: docIds } }, select: { id: true, visibility: true, participantId: true } }) ?? Promise.resolve([])).catch(() => [])
              : [];
            const mayOpen = new Set((docs as any[]).filter((d) => canSeeDocument(d as any, reader, true)).map((d) => d.id));
            for (const d of differ ?? []) if (d.documentSays && d.documentSaysId && mayOpen.has(d.documentSaysId)) documentSaysOf.set(d.id, String(d.documentSays));
          }
          Object.assign(walled, theBoardForThisKind({
            kind, board: walled, people, readerRunsIt, readerIsTheLead: isInitiator, metrics: metrics as any[], documentSaysOf,
          }));
        }
      }
      /*
       * A PARTICIPANT'S BOARD IS THEIR OWN (request 105; the prototype's B5). After every wall above, so the
       * walls have all run first: a person who checks in and does not run the check-in is served the frame,
       * their own rows, and the team's picture once it is released, and nothing else a lead gets. See
       * a-participants-board-is-their-own.
       */
      if (aParticipantOnly && me?.id) {
        /* Every deal on record before the board is narrowed to the reader's own: whose each is, so the wall below knows the others'. */
        const everyDeal = ((Array.isArray(walled.workRecords) ? walled.workRecords : []) as any[]).flatMap((sec: any) => (Array.isArray(sec?.rows) ? sec.rows : []) as any[]).filter((r: any) => r?.kind === 'deal' && r.name);
        walled = aParticipantsOwnBoard(walled, {
          meId: me.id,
          /* Each session's team picture is released on its own (decision 76, item 4): shared only once the session the report holds now is. */
          released: teamPictureShared,
          hasOwnReport: (checkIns as any[]).some((c) => c.participantId === me.id && String(c.status).toUpperCase() === 'COMPLETED' && !wasAQuietClose(c)),
        });
        /*
         * THE DAY THE REPORTS ARE FOR, WHEN IT IS NOT TODAY (Hafsah's quality pass, 18 October, R-1): on Sunday Mercy read "Today's team
         * picture is shared." and "Your own report is ready now." of Wednesday's. Release 1's sales board says the day: "The team's
         * report for Wednesday 14 October is shared." and "Your report for 14 October is ready."
         */
        if (releaseOne && isASalesKind((ground as any).kindOfWork) && walled.teamPicture) {
          const zone = theDayZone();
          const dayOf = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
          const done = (checkIns as any[]).filter((c) => String(c.status).toUpperCase() === 'COMPLETED' && c.completedAt && !c.isSetup);
          const latest = (xs: any[]) => xs.map((c) => new Date(c.completedAt)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
          const teamDay = latest(done);
          const myDay = latest(done.filter((c) => c.participantId === me.id));
          if (teamDay && dayOf(teamDay) !== dayOf(now)) (walled.teamPicture as any).forDay = aDaySaidInFull(teamDay);
          if (myDay && dayOf(myDay) !== dayOf(now)) (walled.teamPicture as any).yourReportFor = theDayInWords(myDay, now);
        }
        /* A rep's board never names another rep's deals, in any section (Drop Access run 1, A9; withoutOtherPeoplesDeals). Release 1's sales board. */
        if (releaseOne && isASalesKind((ground as any).kindOfWork)) {
          const mine = everyDeal.filter((r: any) => r.ownerParticipantId === me.id).map((r: any) => String(r.name));
          const others = [...new Set(everyDeal.filter((r: any) => r.ownerParticipantId !== me.id).map((r: any) => String(r.name)))]
            .filter((n) => !mine.some((m) => theSameCustomer(m, n)));
          walled = withoutOtherPeoplesDeals(walled, me.id, others, aLineNamesTheCustomer) as any;
        }
      }
      /*
       * THE MATTER BOARD (Release 2, pull request 3 of 3; the-matter-board), as `matter`, only where the switchboard picks it: Release 2
       * on, a PULSE_CHECK whose type on record is a legal matter. Built after every wall above, and walled again for this reader at its
       * own read (the-matter-board.service): the check-in's lines, deadlines and waits as this reader is served them (whoever runs it
       * every one, a person their own), each matter's fees by part 2's rule in the fee notes check-in, and what waits for a decision
       * from the board this reader is already served. Off, nothing is added and the board is as before.
       */
      {
        const matter = await theMatterBoardFor(this.prisma, groundId, { runsIt: isInitiator || theyRunIt, participantId: me?.id ?? null, userId: requestingUserId }, now, {
          decisions: ((Array.isArray(walled.decisions) ? walled.decisions : []) as any[])
            .filter((d) => typeof d?.question === 'string' && d.question.trim())
            .map((d) => ({ question: String(d.question), why: typeof d.why === 'string' ? d.why : null })),
        }).catch((err: any) => { this.logger.warn(`The matter board could not be read for ${groundId}: ${err?.message ?? err}`); return null; });
        if (matter) walled.matter = matter;
      }
      /*
       * BY AREA OF WORK, AND WHAT WAS REPORTED AT EACH SALES STAGE (request 107 c). Read last, from the
       * records this reader is served after every wall above, so they count only rows the reader can
       * already read. See the-work-by-area-and-by-stage.
       */
      if (Array.isArray(walled.workRecords) && oneOfTheKinds((ground as any).kindOfWork)) {
        /* Each deal in its group, with why, from the rows this reader is served (request 112 a). See each-deal-in-its-group. */
        walled.workRecords = eachDealInItsGroup(oneOfTheKinds((ground as any).kindOfWork), walled.workRecords, deadlineOf(ground as any), now, { countedFromTheDeals: releaseOne, contactedWhenSpokenOf: releaseOne, byBuyingDate: releaseOne, criteria: criteriaFor(), stallDays });
        walled.byArea = theWorkByArea(walled.workRecords);
        /* RELEASE 5: a funded project's board (release-5-projects), from the same records this reader is served. Off, nothing new. */
        if (isAProject((ground as any).kindOfWork) && (await theRelease5ProjectsIsOn(this.prisma, (ground as any).organizationId))) {
          const rows = ((walled.workRecords ?? []) as any[]).flatMap((s: any) => (s.rows ?? []) as any[]);
          const invoicesFollow = await Promise.resolve((this.prisma as any).organization?.findUnique?.({ where: { id: (ground as any).organizationId }, select: { release3InvoicesOn: true } })).then((o: any) => o?.release3InvoicesOn === true).catch(() => false);
          walled.project = theProjectBoard(rows, now.toISOString().slice(0, 10), { invoicesFollow });
          walled.releaseFiveProjects = true;
        }
        const atEachStage = reportedAgainstTheRules(oneOfTheKinds((ground as any).kindOfWork), walled.workRecords, { criteria: !!criteriaFor() });
        if (atEachStage) walled.reportedAgainstCriteria = atEachStage;
        /* The stages said were read for that count only; they are not served on each row. */
        for (const sec of ((walled.workRecords ?? []) as any[])) for (const r of ((sec?.rows ?? []) as any[])) if (r && 'stagesSaid' in r) delete r.stagesSaid;
        /* To close the gap (request 115 c): to whoever is served the headline, from the deals they are served. See to-close-the-gap. */
        if (walled.headline && !aParticipantOnly) {
          const storedAims = new Map(((ground.objectives ?? []) as any[]).map((o) => [o.id, o]));
          const gap = toCloseTheGap(oneOfTheKinds((ground as any).kindOfWork), walled.workRecords, ((walled.objectives ?? []) as any[]).map((o) => ({ ...o, dueOn: storedAims.get(o.id)?.dueOn ?? null })), deadlineOf(ground as any), now, { nothingBooked: releaseOne, inShort: releaseOne, short: direct });
          /* The heading ("To close the gap, two of these three") is Release 1's; off, the gap reads as it did before it. */
          if (gap && !releaseOne) delete (gap as any).heading;
          if (gap) walled.toCloseTheGap = gap;
        }
        /*
         * "DECIDE WHETHER A PRICE RANGE COUNTS AS A BUDGET" (board-as-lead.txt), to the lead alone, only where a deal she is served
         * has a budget said as a range and she has not answered. Her answer goes in how we work (answerThePriceRange).
         */
        if (isInitiator && releaseOne) {
          const asked = thePriceRangeDecision(((walled.workRecords ?? []) as any[]).flatMap((sec: any) => (sec?.rows ?? []) as any[]), priceRange, groundId);
          if (asked) walled.leadActions = [asked, ...((Array.isArray(walled.leadActions) ? walled.leadActions : []) as any[])];
        }
        /* Each deal at the stall rule, with whose it is, to the lead alone (board-as-lead.txt, "Ask him"). See theDealsAtTheStallRule. */
        if (isInitiator && releaseOne) {
          const stalledRows = ((walled.workRecords ?? []) as any[]).flatMap((sec: any) => (sec?.rows ?? []) as any[]).filter((r: any) => r?.kind === 'deal' && r.group === 'cold');
          const ownersLines = stalledRows.length
            ? ((((await (this.prisma.recordEntry.findMany({ where: { disputedAt: null, participantId: { in: [...new Set(stalledRows.map((r: any) => r.ownerParticipantId).filter(Boolean))] as string[] } } as any, select: { text: true, participantId: true, createdAt: true } as any }) as Promise<any[]>).catch(() => [] as any[])) ?? []) as any[])
              .map((l) => ({ text: cleanText(String(l.text ?? '')), participantId: l.participantId ?? null, createdAt: l.createdAt })))
            : [];
          /* Only by the lead's own rule (standing decision 4): with none set, no deal is at a stall rule. */
          const stalled = stallRule?.days ? theDealsAtTheStallRule(stalledRows, { lines: ownersLines, theLeadsRule: { days: stallRule.days } }) : [];
          if (stalled.length) (walled as any).atTheStallRule = stalled;
          /*
           * NO STALL RULE SET YET (standing decision 4): one item under What needs you, with the suggested default for her to confirm.
           * Her yes keeps the rule in how we work; her no is kept too, and it is not asked again.
           */
          if (stallRule && stallRule.days == null && !stallRule.declined) {
            const quiet = ((walled.workRecords ?? []) as any[]).flatMap((sec: any) => (sec?.rows ?? []) as any[]).filter((r: any) => r?.kind === 'deal' && r.notAnsweringSince && workingDaysSince(new Date(r.notAnsweringSince), now) >= THE_SUGGESTED_DAYS);
            const example = quiet[0] ? ` ${quiet[0].name} has not answered since ${theDayItBegan(quiet[0].noReplySince ?? quiet[0].notAnsweringSince, now)}, which is more than that.` : '';
            walled.leadActions = [...((Array.isArray(walled.leadActions) ? walled.leadActions : []) as any[]), {
              id: 'the-stall-rule',
              kind: 'decision',
              /* With the direct morning on, the question itself and what follows from it, with no "Groundwork suggests" (the-stall-rule). */
              text: direct ? THE_STALL_RULE_ASKED : NO_STALL_RULE_YET,
              decision: {
                question: direct ? THE_STALL_RULE_ASKED : NO_STALL_RULE_YET,
                asked: THE_STALL_RULE_ASKED,
                why: direct
                  ? `No deal is marked cold or dropped for going quiet until you set this.${example}`
                  : `Groundwork suggests dropping a deal after ${THE_SUGGESTED_DAYS} working days with no answer from the customer. Until you set a rule, no deal is marked cold or dropped for going quiet.${example}`,
                afterwards: 'Your answer goes in how we work.',
              },
              action: {
                label: 'Set it',
                says: 'Your answer goes in how we work.',
                goesTo: null,
                choices: [
                  { label: `Yes, ${THE_SUGGESTED_DAYS} working days`, route: { method: 'POST' as const, path: `/grounds/${groundId}/board/stall-rule/answer`, body: { yes: true } } },
                  { label: 'Not now', route: { method: 'POST' as const, path: `/grounds/${groundId}/board/stall-rule/answer`, body: { yes: false } } },
                ],
              },
            }];
          }
        }
      }
      /*
       * OPEN ISSUES (request 115 c; the prototype's "Each one moving towards a decision"). Nothing on record follows
       * an issue through its stages, so nothing is made up: whoever runs the check-in is told what would be needed.
       */
      if (runsItForAPattern(ground as any, requestingUserId) && !isEvaluationCheckIn(ground.scenario)) {
        /* What on record already moves towards a decision, each at its stage (the-open-issues, screen match 16 October). */
        const read = await this.theOpenIssuesOnRecord(ground as any, groundId, theLeadsRow, reportSafe, visibleNames, now).catch((err: any) => { this.logger.warn(`Open issues could not be read for ${groundId}: ${err?.message ?? err}`); return [] as AnOpenIssue[]; });
        /* What only the lead can do (her own promise kept, a conversation she prepares) is offered to the lead alone; anybody else who runs it reads where each stands. */
        const issues = isInitiator ? read : read.map((i) => ({ ...i, action: null, quiet: null }));
        walled.openIssues = issues.length
          ? { state: 'filled', issues, steps: ISSUE_STEPS }
          : { state: 'not-known', why: NO_OPEN_ISSUES_ON_RECORD };
      }
      /* What the organisation kept from another check-in of the same kind, for the lead who runs this one (what-may-be-relevant). */
      if (isInitiator) {
        const relevant = await this.whatMayBeRelevantHere(ground as any, requestingUserId).catch((err: any) => { this.logger.warn(`What may be relevant could not be read for ${groundId}: ${err?.message ?? err}`); return []; });
        if (relevant.length) (walled as any).mayBeRelevant = relevant;
      }
      /* And no number that rates a person leaves on any section, whoever reads it (request 111 a). */
      /* A sentence true of several people is said once for the section (request 117, part 8). */
      /* And what is left on the reader's own rows is said to them, as "you" (item 18). After the said-once pass, which
         already says "you" for the reader where a sentence is true of several people (request 118, part 2). */
      /* And a sentence stored before the wording rules reads right as it is served (decision 91). */
      /* A line typed as an intention that intends nothing is sent with no kind (requests 127 item 4, 129 item 5), after every board that reads the kind. */
      /*
       * RELEASE 8: THE REMAINING SITUATIONS (release-8-situations). Which of the sections already served, after every wall above, this
       * situation's board draws, and in which order. Built from the board this reader is served and nothing else. Off, nothing new.
       */
      const releaseEight = await theRelease8SituationsIsOn(this.prisma, (ground as any).organizationId);
      /* The purple, situation-only sections are drawn on the kit boards too, only with Release 8 on. */
      if (releaseEight) (walled as any).releaseEight = true;
      if (!(walled as any).collections && !(walled as any).matter && !(walled as any).project && releaseEight) {
        const situation = theSituationBoard(String((ground as any).scenario ?? ''), walled as any, { runsIt: isInitiator || theyRunIt });
        if (situation) { (walled as any).situation = situation; (walled as any).releaseEightSituations = true; }
      }
      if (Array.isArray((walled as any).whoOwnsWhat)) (walled as any).whoOwnsWhat = eachLineWithTheKindThatFits((walled as any).whoOwnsWhat);
      const asServed = everyActionHasALabel(aBoardWithNoEmptyLine(everyStoredSentenceReadsRight(withNoRatingNumber(yourOwnRowsSayYou(eachRepeatedSentenceSaidOnce(walled), me?.id ?? null)), (ground.participants ?? []).map((p: any) => nameOf(p.id)).filter((n: any): n is string => typeof n === 'string' && n.length > 1))));
      /*
       * THE BOARD AT A GLANCE (the light prototype; docs/light-rebuild/sales-first.md, rule 3): one fact for each
       * folded line and two for each box, built from this board as served, after every wall, so a fact never says
       * more than the sections it sums up. For the sales board, and not to a participant, who reads their own view.
       */
      if (isASalesKind((ground as any).kindOfWork) && !aParticipantOnly) {
        (asServed as any).atAGlance = theBoardAtAGlance(asServed, {
          readerCheckedInThisRound: me?.id
            ? (checkIns as any[]).some((c) => c.participantId === me.id && c.sessionNumber === openRound && String(c.status).toUpperCase() === 'COMPLETED')
            : null,
          readerIsTheLead: isInitiator,
        });
      }
      /*
       * THE DIRECT MORNING AT THE TOP (engagement/the-direct-morning.ts): for the lead who runs it, where her organisation's switch is on,
       * the same four parts her morning summary says, in the same order, built from this board as she is served it. Never to anybody else.
       */
      if (isInitiator) {
        const morning = await theDirectMorningFor(this.prisma, { groundId, leadUserId: requestingUserId, board: asServed, now }).catch(() => null);
        if (morning) {
          /*
           * "NUDGE PETER" (engagement/the-leads-own-nudge.ts): each team member who has not answered today, past their usual time or after
           * a missed day, with the button's words, to the lead alone, at the top and on their row of "The team today". The route that sends
           * it refuses anybody but her; this only says who she may nudge, and whether she already has today ("Nudged at 10:40").
           */
          const nudges = await theNudgesOnTheBoard(this.prisma, (ground as any).organizationId ?? null, morning.mayBeNudged ?? [], now).catch(() => [] as Awaited<ReturnType<typeof theNudgesOnTheBoard>>);
          (asServed as any).theMorning = { ...asServedOnTheBoard(morning), ...(nudges.length ? { nudges } : {}) };
          if (nudges.length && Array.isArray((asServed as any).eachPersonToday)) {
            (asServed as any).eachPersonToday = ((asServed as any).eachPersonToday as any[]).map((row) => {
              const n = nudges.find((x) => x.participantId === row.participantId);
              return n ? { ...row, nudge: n } : row;
            });
          }
          /*
           * YOUR TEAM, PERSON BY PERSON (your-team-person-by-person.ts; Groundwork does the managing, part 2): for her monthly look, each
           * person's delivered work with proof, their record and coaching, where they stand (only where judgements of a person are on),
           * and her one-tap actions. To the lead alone, beside the direct morning; the action route refuses anybody else.
           */
          const team = await yourTeamPersonByPerson(this.prisma, { groundId, leadUserId: requestingUserId, board: asServed, kind: morning.kind, now }).catch(() => null);
          if (team?.people.length) (asServed as any).yourTeam = team;
        }
      }
      /* The anchor scenario's own parts (request 149), added after every wall above: only whoever runs an anchor check-in, only with the switch on. */
      const roundOpensAt = (checkIns as any[]).filter((c) => c.sessionNumber === openRound).map((c) => c.availableFrom ?? c.startedAt).filter(Boolean).sort((a: Date, b: Date) => a.getTime() - b.getTime())[0] ?? null;
      /* In an anchor check-in the lead's own aim is hers alone: a member reads no objectives on the board either (decision 96, item 8; known issue P13). */
      return withoutTheLeadsSetUpForAMember({ ...asServed, ...(await theAnchorBoardParts({ prisma: this.prisma, ground: ground as any, readerRunsIt: runsThisGround, openRound, roundOpenedAt: roundOpensAt, readerIsTheLead: isInitiator, clock: recordsClock, monthEnded: !!theMonthEndedOn((ground as any).groundAuditLog), served: asServed as any, patterns: patternQuestions, readerParticipantId: me?.id ?? null })) }, { startedFrom: (ground as any).startedFrom ?? null, scenario: (ground as any).scenario ?? null, runsIt: runsThisGround });
    }
  }

  /**
   * Decisions needed: derived from the divergences and the hard blockers, which
   * is what turns the board from a status read into a meeting agenda. Nothing
   * new is detected here - it is a view over things already established.
   */
  /** The rows the switchboard's own sections read, as stored. Read only: opening a board writes nothing. */
  private async theRecordTheSwitchboardsSectionsRead(groundId: string, checkIns: { id: string; sessionNumber: number }[]): Promise<{
    commitments: ACommitment[];
    lines: { id: string; participantId: string | null; text: string; mark: string; sessionNumber: number | null; type?: string | null; createdAt?: Date | null; checkInId?: string | null; documentWords?: string | null }[];
  }> {
    const commitments = await ((this.prisma as any).groundCommitment?.findMany?.({ where: { groundId }, orderBy: { createdAt: 'asc' } }) ?? Promise.resolve([])).catch(() => []);
    /* Only lines somebody has not disputed, marked by the same rule as the reports (how-a-line-is-known). */
    const entries = await (this.prisma.recordEntry.findMany({
      where: { disputedAt: null, participant: { groundId } },
      select: { id: true, participantId: true, type: true, text: true, checkInId: true, createdAt: true, ...WHAT_A_MARK_READS },
      orderBy: { createdAt: 'asc' },
    }) as Promise<any[]>).catch(() => [] as any[]);
    const whoAdded = await whoAddedEachBackingDocument(this.prisma, entries as any[]).catch(() => new Map<string, string | null>());
    /* The words of the document behind each line, so a document is proof only of what it is about (the-blockers, B-17). */
    const docOf = await theBackingDocuments(this.prisma, entries as any[]).catch(() => new Map<string, ABackingDocument>());
    const lines = (entries as any[]).map((e) => {
      const text = cleanText(e.text);
      return {
        id: e.id,
        participantId: e.participantId ?? null,
        text,
        mark: theMarkOf({ ...e, text }, whoAdded),
        sessionNumber: checkIns.find((c) => c.id === e.checkInId)?.sessionNumber ?? null,
        type: e.type ?? null,
        createdAt: e.createdAt ? new Date(e.createdAt) : null,
        checkInId: e.checkInId ?? null,
        documentWords: theDocumentBehind(e.anchoredDocumentId, docOf).documentWords,
      };
    });
    /* Where somebody else said an open promise happened, the board says who and what, never "nobody has said" (messages test, 19 October, finding 4). */
    const withWhatWasSaid = (commitments as ACommitment[]).map((c) => {
      const said = aLineThatSaysItHappened(c as any, lines);
      return said ? { ...c, saidHappened: { participantId: said.participantId, text: said.text, createdAt: said.createdAt ?? null } } : c;
    });
    return { commitments: withWhatWasSaid, lines };
  }

  /**
   * The open decisions the lead wrote down, and only where they chose to share the note. A private
   * note is private: the audience is the lead's choice and this reads it rather than deciding it.
   */
  /**
   * The rows the open issues are read from (the-open-issues.ts): a difference between the lead and one other
   * person in the report, the lead's questions still to decide with how many check-ins raised the same words,
   * what the organisation kept from deciding before, and what the lead said they would do.
   */
  /** Kept knowledge from other check-ins of this one's kind, behind the organisation memory's own wall (what-may-be-relevant.ts). */
  private async whatMayBeRelevantHere(ground: any, readerUserId: string): Promise<SomethingThatMayBeRelevant[]> {
    const reader = await this.prisma.user.findUnique({ where: { id: readerUserId }, select: { role: true } });
    return readWhatMayBeRelevant(this.prisma, ground, { userId: readerUserId, role: (reader as any)?.role ?? null }, (r) => mayReadWhatIsKept(this.prisma, r));
  }

  /** The lead says what was offered as relevant is not, for this check-in. Kept in the check-in's own record; the organisation's knowledge is not touched. */
  async sayItIsNotRelevant(groundId: string, memoryIds: string[], requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, initiatorId: true, groundAuditLog: true } as any }) as any;
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the lead of this check-in can say this.');
    const log = ground.groundAuditLog && typeof ground.groundAuditLog === 'object' && !Array.isArray(ground.groundAuditLog) ? ground.groundAuditLog : {};
    const ids = [...new Set([...whatWasSaidNotRelevant(log), ...memoryIds.filter((x) => typeof x === 'string' && x)])];
    await this.prisma.ground.update({ where: { id: groundId }, data: { groundAuditLog: { ...log, [NOT_RELEVANT_KEY]: { memoryIds: ids } } } as any });
    return { notRelevant: ids.length };
  }

  private async theOpenIssuesOnRecord(ground: any, groundId: string, leadRow: string | null, reportSafe: any, visibleNames: Map<string, string>, now: Date): Promise<AnOpenIssue[]> {
    const people: any[] = ground.participants ?? [];
    const firstOf = (pid: string | null | undefined) => {
      const p = people.find((x) => x.id === pid);
      const full = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || (p?.nameGiven ?? '').trim();
      return full ? full.split(/\s+/)[0] : null;
    };
    const idForName = (name: string | null | undefined) => {
      const n = (name ?? '').trim().toLowerCase();
      if (!n) return null;
      return people.find((p) => {
        const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim().toLowerCase();
        return full === n || (p.user?.firstName ?? '').trim().toLowerCase() === n;
      })?.id ?? null;
    };
    const differences: WhatTheIssuesAreReadFrom['differences'] = [];
    for (const [i, d] of (Array.isArray(reportSafe?.divergences) ? reportSafe.divergences : []).entries()) {
      const sides: any[] = Array.isArray(d?.positions) ? d.positions : Array.isArray(d?.perspectives) ? d.perspectives : [];
      /* "the initiator" is the lead; read by the lead, their own side is already "You" by now. */
      const idOf = (label: string) => (/^(?:the\s+)?initiator$/i.test(label.trim()) || label.trim() === 'You' || visibleNames.get(label) === 'You' ? leadRow : idForName(visibleNames.get(label) ?? label));
      const ids = [...new Set(sides.map((x) => idOf(String(x?.participantLabel ?? ''))).filter(Boolean) as string[])];
      if (!leadRow || ids.length !== 2 || !ids.includes(leadRow)) continue;
      const other = ids.find((x) => x !== leadRow)!;
      const first = firstOf(other);
      if (first && typeof d?.topic === 'string') differences.push({ key: String(i), topic: d.topic, withFirstName: first, since: d?.since ? new Date(d.since) : null });
    }
    const asked = await (this.prisma.groundContextItem?.findMany?.({
      where: { groundId, kind: 'DECISION' as any, audience: 'EVERYONE' as any, closedAt: null },
      select: { id: true, text: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 8,
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
    const lines = asked.length
      ? await ((this.prisma.recordEntry as any)?.findMany?.({ where: { disputedAt: null, participant: { groundId } }, select: { text: true, checkInId: true } }) ?? Promise.resolve([])).catch(() => [])
      : [];
    const stillToDecide = (asked as any[]).map((q) => ({
      id: q.id, text: String(q.text ?? '').trim(), createdAt: new Date(q.createdAt),
      raisedIn: new Set((lines as any[]).filter((l) => l.checkInId && sharesTheWords(String(l.text ?? ''), String(q.text ?? ''))).map((l) => l.checkInId)).size,
    })).filter((q) => q.text);
    const memories = ((await ((this.prisma as any).organizationMemory?.findMany?.({ where: { organizationId: ground.organizationId, status: 'KEPT' }, select: { text: true }, take: 50 }) ?? Promise.resolve([])).catch(() => [])) ?? []) as { text: string }[];
    const promises = leadRow
      ? ((await ((this.prisma as any).groundCommitment?.findMany?.({ where: { groundId, participantId: leadRow, status: 'UNKNOWN' }, select: { id: true, text: true, createdAt: true }, orderBy: { createdAt: 'asc' } }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[]
      : [];
    return theOpenIssues({
      groundId, now, differences, stillToDecide, memories,
      leadPromises: promises.map((p) => ({ id: p.id, text: String(p.text ?? ''), createdAt: new Date(p.createdAt) })),
    });
  }

  private async whatTheLeadSaysIsStillToDecide(groundId: string): Promise<{ id: string | null; text: string }[]> {
    const lines = await (this.prisma.groundContextItem?.findMany?.({
      where: { groundId, kind: 'DECISION' as any, audience: 'EVERYONE' as any, closedAt: null },
      select: { id: true, text: true },
      orderBy: { createdAt: 'asc' },
      take: 8,
    }) ?? Promise.resolve([] as { id?: string; text: string }[])).catch(() => [] as { id?: string; text: string }[]);
    return (lines as { id?: string; text: string }[]).map((l) => ({ id: l.id ?? null, text: (l.text ?? '').trim() })).filter((l) => l.text);
  }

  /* A topic said inside a sentence: its first word lower-cased only when it is an ordinary word, never a name. */
  private deriveDecisions(
    divergences: any[],
    dependencies: { what: string; status: DependencyStatus; fromParticipantId?: string | null; onParticipantId: string | null; onLabel: string | null }[],
    nameOf: (id: string) => string | null,
    stillToDecide: { id: string | null; text: string }[] = [],
    /** The name this reader may see for a report label, or undefined. Nothing else is printed. */
    nameForLabel: (label: string) => string | undefined = () => undefined,
    /**
     * WHO IS READING (request 107 b). The person waiting is named, or "You" to themselves, and a wait
     * this reader may not read on the rest of the board is not read here either. The owner of what the
     * lead must settle is the lead, by name, or "You" to the lead, never "Lead and team".
     */
    reader: { meId: string | null; leadId: string | null; mayRead: (d: { fromParticipantId?: string | null; onParticipantId?: string | null; what?: string | null }) => boolean } = { meId: null, leadId: null, mayRead: () => true },
  ) {
    const someone = (pid: string | null | undefined): string | null => {
      if (!pid) return null;
      if (pid === reader.meId) return 'You';
      return nameOf(pid);
    };
    const theLeadOwns = someone(reader.leadId) ?? 'The person running this check-in';
    const fromDivergence = divergences.map((d) => {
      /* Full sentences, never a label and a colon (screens request 68, 28 Sep 2026). Said as what
         each person said, never as "the accounts differ" (29 Sep 2026). A topic that is a whole
         sentence is said as its own sentence, never after "about" (request 107 b). */
      const who = whoSaidDifferentThings(d, nameForLabel);
      const topic = String(d.topic ?? '').trim().replace(/[.!?]+$/, '');
      return {
        question: !topic
          ? `${who} said different things about this, so it needs settling.`
          : isAWholeSentence(topic)
            ? `${who} said different things. ${topic.charAt(0).toUpperCase()}${topic.slice(1)}. This needs settling.`
            : `${who} said different things about ${inASentence(topic)}, so it needs settling.`,
        why: 'What people said about this does not match, so nobody can assume it is agreed.',
        owner: theLeadOwns,
        source: 'divergence' as const,
      };
    });
    const fromBlockers = dependencies
      // Only STILL-OPEN blockers. A cleared handoff is not a decision anyone
      // needs to make, and leaving them on grew this list to 15 items.
      .filter((d) => d.status === DependencyStatus.BLOCKING)
      .filter((d) => reader.mayRead(d))
      .map((d) => {
        /* The person waiting is known: say who (request 107 b). */
        const who = someone(d.fromParticipantId) ?? 'Somebody';
        const owner = d.onParticipantId
          ? (someone(d.onParticipantId) ?? NOBODY_NAMED_TO_DECIDE)
          : (aPartyOutside(d) ? d.onLabel!.trim() : NOBODY_NAMED_TO_DECIDE);
        /*
         * ONLY A DECISION NEEDS DECIDING (item 21, the engineering and founder boards). Ifeoma read "Samuel Otieno is
         * waiting on the sandbox credentials, so it needs deciding.", and Ada "Tunde Bakare is waiting on the co-founder
         * agreement, so it needs deciding.": a thing somebody has to send is not a decision. A wait the record calls a
         * decision, or whose words say one, reads as before; any other says who it waits on, or that nobody was named.
         */
        const aDecision = (d as any).blockerKind === 'DECISION' || /\b(?:decision|decide|deciding|decided|approval|approve|sign-?off|go-ahead|answer)\b/i.test(String(d.what ?? ''));
        const is = who === 'You' ? 'are' : 'is';
        const holder = owner === NOBODY_NAMED_TO_DECIDE ? null : owner === 'You' ? 'you' : owner;
        return {
          question: aDecision
            ? `${who} ${is} waiting on ${inASentence(d.what)}, so it needs deciding.`
            : holder
              ? `${who} ${is} waiting on ${holder} for ${inASentence(d.what)}.`
              : `${who} ${is} waiting for ${inASentence(d.what)}, and nobody has been named to provide it.`,
          why: aDecision
            ? (who === 'You' ? 'You cannot move until this is decided.' : 'They cannot move until this is decided.')
            : (who === 'You' ? 'You cannot move until it comes.' : 'They cannot move until it comes.'),
          owner: !aDecision && owner === NOBODY_NAMED_TO_DECIDE ? 'Nobody has been named to provide it.' : owner,
          source: 'blocker' as const,
          /* For what the lead can do about it (request 112 b); taken off before the board is served. */
          waitsOn: { participantId: d.onParticipantId ?? null, outside: aPartyOutside(d) ? d.onLabel!.trim() : null, what: d.what },
        };
      });

    // Same decision phrased slightly differently is one decision.
    /* The lead's own, said as theirs: nobody agreed these, one person wrote them down. */
    const fromTheLead = stillToDecide.map((q) => ({
      question: q.text,
      /* For the lead's answer (request 112 b); taken off before the board is served. */
      contextItemId: q.id,
      why: theLeadOwns === 'You' ? 'You wrote this down as still to decide.' : `${theLeadOwns} wrote this down as still to decide.`,
      owner: theLeadOwns,
      source: 'lead' as const,
    }));

    const seen = new Set<string>();
    const deduped = [...fromBlockers, ...fromDivergence, ...fromTheLead].filter((d) => {
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
        /* `verifiability` too: it is a column now, and a read that does not select it falls back to
           parsing the old inline marker, which new rows do not have. */
        select: { participantId: true, text: true, verifiability: true, checkIn: { select: { sessionNumber: true } } },
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
      /* A situation with no aim by design has no remit either: see a-check-in-with-no-aim. */
      situationHasRoles: anAimIsOwedHere((ground as any).scenario),
      participants: ground.participants.map((p) => ({
        id: p.id,
        roleAsDescribed: p.roleAsDescribed ?? null,
        managingOnly: !!p.managingOnly,
        detectedFunction: p.detectedFunction ?? null,
        detectedFunctionConfidence: p.detectedFunctionConfidence ?? null,
        detectedFunctionConfirmedAt: (p as any).detectedFunctionConfirmedAt ?? null,
      })),
      checkIns,
      entries: entries.map((e) => ({
        participantId: e.participantId,
        sessionNumber: e.checkIn?.sessionNumber ?? null,
        text: e.text,
        /* From the column. Null on rows written before it, where reads.ts parses the old marker. */
        verifiability: (e as any).verifiability ?? null,
      })),
      mentions,
      dependencies: dependencies.filter((d: any) => !aWaitOnOneself(d)),
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
  /** The words of every lead-written goal on this check-in the lead has not told its person about. */
  private async goalsNotToldYet(groundId: string): Promise<string[]> {
    const rows = await ((this.prisma as any).personObjective?.findMany?.({
      where: { groundId, awareness: 'NOT_TOLD' },
      select: { text: true, awareness: true, authoredBy: true },
    }) ?? Promise.resolve([])).catch(() => []);
    return (rows as any[]).filter(notToldYet).map((r) => String(r.text ?? '')).filter(Boolean);
  }

  /** The lead-written goals not told yet, whole rows (for the board's objectives, decision 56). */
  private async untoldGoalRows(groundId: string): Promise<{ participantId: string | null; text: string | null; awareness: string | null; authoredBy: string | null; createdAt: Date | null }[]> {
    const rows = await ((this.prisma as any).personObjective?.findMany?.({
      where: { groundId, awareness: 'NOT_TOLD' },
      select: { participantId: true, text: true, awareness: true, authoredBy: true, createdAt: true },
    }) ?? Promise.resolve([])).catch(() => []);
    return (rows as any[]).filter(notToldYet);
  }

  /** The same rows, kept by participant - decision 56, item 3: wherever an untold goal counts
   *  against the person, the lead is shown it as a conversation point. */
  private async goalsNotToldYetByParticipant(groundId: string): Promise<{ participantId: string; text: string }[]> {
    const rows = await ((this.prisma as any).personObjective?.findMany?.({
      where: { groundId, awareness: 'NOT_TOLD' },
      select: { participantId: true, text: true, awareness: true, authoredBy: true, kind: true },
    }) ?? Promise.resolve([])).catch(() => []);
    /* Only goals the lead set: a promise or a to-do is never "a goal you have not told them about" (pilots after fixes, A2). */
    return (rows as any[]).filter(aGoalTheLeadSetAndHasNotTold).map((r) => ({ participantId: r.participantId as string, text: String(r.text ?? '') })).filter((r) => r.text);
  }

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
        /*
         * EXCEPT FOR THE ONE THAT IS NOT A BEHAVIOUR. SETUP_NEVER_SAID reads what was written
         * before anybody arrived: either the setup named the thing people differ about or it did
         * not, and there is no second period in which an absence becomes more true. Waiting for it
         * to repeat is waiting for the same silence twice, and it is the only pattern here that is
         * about a document rather than about how somebody is behaving. See coverage.ts.
         */
        const periods = Number(g.periods ?? 0);
        if (periods < 2 && named.pattern !== LeadershipPattern.SETUP_NEVER_SAID) return null;
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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
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
      throw new ForbiddenException('This check-in does not keep targets, so there is nothing to change here.');
    }
    if (ground.initiatorId !== requestingUserId) {
      throw new ForbiddenException('Only the person who set this check-in up can change what it is aiming for, so ask them to.');
    }
    return ground;
  }

  /**
   * THE LEAD ADDS, CHANGES OR REMOVES A RECORD OF THE KIND OF WORK (request 76): a deal, a release,
   * a deadline. Only the lead of the check-in. The record's kind must belong to the check-in's kind
   * of work, its stage must be one of the check-in's stages, and its person must be on the check-in.
   * A record read from a check-in line keeps pointing at that line; the lead can move it on.
   */
  private async theLeadsWorkItemGround(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { id: true, initiatorId: true, kindOfWork: true, workStages: true, participants: { select: { id: true } } } as any,
    }) as any;
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the lead of this check-in can change its records.');
    const kind = oneOfTheKinds(ground.kindOfWork);
    if (!kind) throw new BadRequestException('Choose what kind of work this check-in is about first, then add its records.');
    return { ground, kind };
  }

  private theWorkItemFields(ground: any, kind: KindOfWork, dto: WorkItemInput, isNew: boolean) {
    const data: Record<string, any> = {};
    if (isNew || dto.kind !== undefined) {
      if (!dto.kind || !itemKindsFor(kind).includes(dto.kind)) {
        throw new BadRequestException(`This check-in keeps these kinds of record: ${itemKindsFor(kind).join(', ')}.`);
      }
      data.kind = dto.kind;
    }
    if (isNew || dto.name !== undefined) {
      const name = (dto.name ?? '').trim();
      if (!name) throw new BadRequestException('Give the record a name.');
      data.name = name.slice(0, 120);
    }
    if (dto.stage !== undefined) {
      const itemKind = data.kind ?? dto.kind;
      const section = RECORDS_FOR_EACH_KIND[kind].find((s) => !itemKind || s.itemKinds.includes(itemKind));
      const stages = section ? stagesFor(section, ground.workStages) ?? [] : [];
      if (dto.stage === null) data.stage = null;
      else {
        const stage = stages.find((s) => s.toLowerCase() === String(dto.stage).trim().toLowerCase());
        if (!stage) throw new BadRequestException(stages.length ? `The stage has to be one of these: ${stages.join(', ')}.` : 'These records have no stages.');
        data.stage = stage;
      }
    }
    if (dto.ownerParticipantId !== undefined) {
      if (dto.ownerParticipantId !== null && !(ground.participants ?? []).some((p: any) => p.id === dto.ownerParticipantId)) {
        throw new BadRequestException('That person is not on this check-in.');
      }
      data.ownerParticipantId = dto.ownerParticipantId;
    }
    if (dto.due !== undefined) {
      if (dto.due === null) data.dueAt = null;
      else {
        const d = /^\d{4}-\d{2}-\d{2}$/.test(String(dto.due)) ? new Date(`${dto.due}T00:00:00.000Z`) : null;
        if (!d || isNaN(d.getTime())) throw new BadRequestException('Give the date as year, month and day, like 2026-10-02.');
        data.dueAt = d;
      }
    }
    if (dto.fields !== undefined) data.fields = plainFields(dto.fields);
    return data;
  }

  async addWorkItem(groundId: string, requestingUserId: string, dto: WorkItemInput) {
    const { ground, kind } = await this.theLeadsWorkItemGround(groundId, requestingUserId);
    const data = this.theWorkItemFields(ground, kind, dto, true);
    /* The stage it is put at, kept with its day (a-deals-stages-are-kept). */
    if (data.stage) data.fields = withTheStageKept(data.fields ?? {}, data.stage, new Date(), 'board');
    return (this.prisma as any).workItem.create({ data: { groundId, ...data, addedByUserId: requestingUserId } });
  }

  /** One tap of the lead on one person's part of her board: praise, start a plan, set a deadline, reassign (your-team-person-by-person.ts). */
  async actOnAPerson(groundId: string, participantId: string, requestingUserId: string, asked: AnActionAsked) {
    return theLeadActsOnAPerson(this.prisma, { updateWorkItem: (g, i, u, dto) => this.updateWorkItem(g, i, u, dto) }, groundId, participantId, requestingUserId, asked ?? {});
  }

  async updateWorkItem(groundId: string, itemId: string, requestingUserId: string, dto: WorkItemInput) {
    const { ground, kind } = await this.theLeadsWorkItemGround(groundId, requestingUserId);
    const item = await (this.prisma as any).workItem.findFirst({ where: { id: itemId, groundId } });
    if (!item) throw new NotFoundException('That record is not on this check-in.');
    const data = this.theWorkItemFields(ground, kind, { kind: item.kind, ...dto }, false);
    /* A claim waiting for the lead's answer is not one of the record's details, so editing them keeps it. */
    if (data.fields !== undefined) data.fields = { ...data.fields, ...whatIsNotADetail(item.fields), ...theStagesToKeep(item.fields) };
    /* A stage the lead moves it to on the board is kept with its day, after where it stood (a-deals-stages-are-kept). */
    if (data.stage && String(data.stage).toLowerCase() !== String(item.stage ?? '').toLowerCase()) {
      data.fields = withTheStageKept(data.fields ?? item.fields, data.stage, new Date(), 'board', { stage: item.stage ?? null, since: item.updatedAt ? new Date(item.updatedAt) : null });
    }
    /* The lead naming the owner herself answers any claim: it is her decision either way. */
    if (data.ownerParticipantId !== undefined && theClaimOn(item.fields)) {
      data.fields = afterTheLeadsAnswer(data.fields ?? item.fields, data.ownerParticipantId === theClaimOn(item.fields)!.participantId);
    }
    const updated = await (this.prisma as any).workItem.update({ where: { id: itemId }, data });
    /* Release 5: a milestone the lead moves to Accepted is an invoice to raise at once (release-5-projects). Off, nothing. */
    if (item.kind === 'milestone' && data.stage === 'Accepted') await aMilestoneAcceptedIsAnInvoiceToRaise(this.prisma, groundId).catch(() => 0);
    return updated;
  }

  /**
   * THE LEAD'S ANSWER TO "AMANI WEKESA SAYS THE WESTGATE DELI DEAL IS THEIRS. IS IT?" (decision 76, item 3).
   * Only her yes sets the owner. A no leaves the record with nobody's name, and the same person's claim
   * on it is not put to her again. Either way she reads back what happened, in one sentence.
   */
  async answerAClaimOnARecord(groundId: string, itemId: string, requestingUserId: string, yes: boolean) {
    await this.theLeadsWorkItemGround(groundId, requestingUserId);
    const item = await (this.prisma as any).workItem.findFirst({ where: { id: itemId, groundId } });
    if (!item) throw new NotFoundException('That record is not on this check-in.');
    const claim = theClaimOn(item.fields);
    if (!claim || item.ownerParticipantId) throw new BadRequestException('Nobody is waiting for your answer about this record.');
    const claimant = await this.prisma.groundParticipant.findFirst({
      where: { id: claim.participantId, groundId },
      select: { id: true, userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
    }) as any;
    if (yes && !claimant) throw new BadRequestException('The person who said this record is theirs is no longer on this check-in.');
    const name = claimant
      ? ([claimant.user?.firstName, claimant.user?.lastName].filter(Boolean).join(' ').trim() || String(claimant.nameGiven ?? '').trim() || 'A colleague')
      : 'A colleague';
    const who = claimant?.userId && claimant.userId === requestingUserId ? null : name;
    const updated = await (this.prisma as any).workItem.update({
      where: { id: itemId },
      data: { fields: afterTheLeadsAnswer(item.fields, yes), ...(yes ? { ownerParticipantId: claim.participantId } : {}) },
    });
    return { record: { id: updated?.id ?? itemId, ownerParticipantId: yes ? claim.participantId : null }, saidBack: theAnswerSaidBack(who, { name: item.name, kind: item.kind }, yes) };
  }

  /**
   * THE LEAD ANSWERS A QUESTION THEY WROTE DOWN AS STILL TO DECIDE (screens request 112 b). Only a question answered
   * yes or no, and only by the lead. The answer goes in how we work, read by everybody the question was shared with,
   * in the lead's own words ("On whether to take the credit committee delays to the Head of Credit, the answer is
   * yes."), and the question is closed, so it comes off the list. Nothing else is changed.
   */
  async answerADecision(groundId: string, itemId: string, requestingUserId: string, yes: boolean) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, initiatorId: true } as any }) as any;
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the lead of this check-in can answer this.');
    const line = await (this.prisma as any).groundContextItem.findFirst({ where: { id: itemId, groundId, kind: 'DECISION', closedAt: null } });
    if (!line) throw new NotFoundException('This is not waiting for an answer any more.');
    if (!isAYesOrNoQuestion(line.text ?? '')) throw new BadRequestException('This is not a question with a yes or a no. Write down what you decided on the Context page.');
    const text = theAnswerAsALine(line.text, yes);
    await (this.prisma as any).groundContextItem.create({
      data: { groundId, kind: 'WAY_OF_WORKING', text, audience: line.audience ?? 'EVERYONE', source: 'BOARD', authorUserId: requestingUserId },
    });
    await (this.prisma as any).groundContextItem.update({ where: { id: itemId }, data: { closedAt: new Date() } });
    return { answered: { id: itemId, yes }, saidBack: `This is now in how we work. It reads, "${text}"` };
  }

  /**
   * THE LEAD ANSWERS A WAIT ON THEM THAT A YES OR A NO ANSWERS (Hafsah, 17 October; board-as-lead.txt and team-report.txt,
   * "Yes" and "No"). Joseph Kariuki waits on Grace for "an answer about the KES 4,500 price for Juja Hardware". Only the
   * lead answers, only a wait on the lead herself, and only one aWaitTheLeadCanAnswer reads as a yes-or-no question. The
   * answer is kept the way an answered decision is kept (answerADecision): a line in how we work, read by everybody, in
   * the lead's own words ("On whether to agree to the KES 4,500 price for Juja Hardware, the answer is yes."). The wait
   * is then cleared, because the answer it waited for has been given, so it comes off the board and off the report.
   */
  async answerAWaitOnTheLead(groundId: string, waitId: string, requestingUserId: string, yes: boolean) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, initiatorId: true } as any }) as any;
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the lead of this check-in can answer this.');
    const lead = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId: requestingUserId }, select: { id: true } }) as any;
    const wait = await (this.prisma as any).groundDependency.findFirst({
      where: { id: waitId, groundId, clearedAt: null, status: { in: ['WAITING', 'BLOCKING'] } },
      select: { id: true, what: true, then: true, createdAt: true, fromParticipantId: true, onParticipantId: true },
    });
    if (!wait || !lead || wait.onParticipantId !== lead.id) throw new NotFoundException('This is not waiting for an answer any more.');
    /* The deals, so the question kept is the one the board asked (aWaitTheLeadCanAnswer, quality pass B-7). */
    const theDeals = (((await Promise.resolve((this.prisma as any).workItem?.findMany?.({ where: { groundId, kind: 'deal' }, select: { name: true, fields: true, ownerParticipantId: true } })).catch(() => [])) ?? []) as any[])
      .map((d) => ({ name: String(d.name ?? ''), fields: plainFields(d.fields), ownerParticipantId: d.ownerParticipantId ?? null }));
    const from = wait.fromParticipantId
      ? await this.prisma.groundParticipant.findFirst({ where: { id: wait.fromParticipantId, groundId }, select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } } as any }) as any
      : null;
    const whoWaits = from ? ([from.user?.firstName, from.user?.lastName].filter(Boolean).join(' ').trim() || String(from.nameGiven ?? '').trim() || null) : null;
    const decision = aWaitTheLeadCanAnswer(wait, whoWaits, theDeals.filter((d) => d.ownerParticipantId === wait.fromParticipantId), theDeals);
    if (!decision) throw new BadRequestException('This is not a question with a yes or a no. Tell Groundwork in your check-in what you will do about it.');
    const text = theAnswerAsALine(decision.question, yes);
    await (this.prisma as any).groundContextItem.create({
      data: { groundId, kind: 'WAY_OF_WORKING', text, audience: 'EVERYONE', source: 'BOARD', authorUserId: requestingUserId },
    });
    await (this.prisma as any).groundDependency.update({ where: { id: wait.id }, data: { status: 'CLEARED', clearedAt: new Date() } });
    return { answered: { id: wait.id, yes }, saidBack: `This is now in how we work. It reads, "${text}"` };
  }

  /**
   * THE LEAD ANSWERS "DECIDE WHETHER A PRICE RANGE COUNTS AS A BUDGET" (Hafsah's answer to Needs Hafsah 7: "Whether a price range
   * counts as a budget is Grace's decision for Drop Access ... put it under 'What needs you' with Yes and No, as the kit does, and
   * apply her answer"). Kept as an answered decision is kept (answerADecision): a line in how we work, read by everybody, in the
   * lead's own words ("On whether a price range counts as a budget, the answer is yes."). The board reads it for the Qualified rule
   * (a-deals-four-criteria, thePriceRangeAnswer). Only the lead answers, and only once.
   */
  /**
   * THE LEAD ANSWERS A DECISION SHE PROMISED HERSELF (quality pass, 18 October, B-8; a-decision-the-lead-promised). Lead only. The
   * question is read again from the record, as the board asked it, and her answer is kept in how we work, read by everybody; the
   * board then stops asking.
   */
  async answerADecisionTheLeadPromised(groundId: string, dealId: string, requestingUserId: string, yes: boolean) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, initiatorId: true, participants: { select: { id: true, userId: true, user: { select: { firstName: true } } } } } as any }) as any;
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the lead of this check-in can answer this.');
    const lead = (ground.participants as any[]).find((p) => p.userId === requestingUserId);
    const deals = (((await Promise.resolve((this.prisma as any).workItem?.findMany?.({ where: { groundId, kind: 'deal' }, select: { id: true, name: true, fields: true, stage: true, ownerParticipantId: true } })).catch(() => [])) ?? []) as any[])
      .map((d) => ({ id: d.id, name: String(d.name ?? ''), fields: plainFields(d.fields), stage: d.stage ?? null, ownerParticipantId: d.ownerParticipantId ?? null }));
    const said = (((await (this.prisma.recordEntry.findMany({ where: { disputedAt: null, participant: { groundId } } as any, select: { text: true, type: true, participantId: true, createdAt: true } as any }) as Promise<any[]>).catch(() => [] as any[])) ?? []) as any[])
      .map((l) => ({ text: cleanText(String(l.text ?? '')), type: l.type ?? null, participantId: l.participantId ?? null, createdAt: l.createdAt }));
    const firstOf = (pid: string | null) => (ground.participants as any[]).find((p) => p.id === pid)?.user?.firstName ?? null;
    const asked = theDecisionsTheLeadPromised(deals.filter((d) => d.stage !== 'Won'), said.filter((l) => l.participantId === lead?.id), said.filter((l) => l.participantId !== lead?.id), firstOf, () => false).find((p) => p.dealId === dealId);
    if (!asked) throw new NotFoundException('This is not waiting for an answer any more.');
    const text = theAnswerAsALine(asked.question, yes);
    await (this.prisma as any).groundContextItem.create({
      data: { groundId, kind: 'WAY_OF_WORKING', text, audience: 'EVERYONE', source: 'BOARD', authorUserId: requestingUserId },
    });
    return { answered: { id: dealId, yes }, saidBack: `This is now in how we work. It reads, "${text}"` };
  }

  /** The lead sets the suggested stall rule, or says not now (standing decision 4; the-stall-rule). Lead only; kept in how we work. */
  async answerTheStallRule(groundId: string, requestingUserId: string, yes: boolean) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, initiatorId: true } as any }) as any;
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the lead of this check-in can set its stall rule.');
    const now = await theStallRuleOnRecord(this.prisma, groundId);
    if (now.days != null) throw new BadRequestException(`A stall rule is already set: ${theStallRuleAsALine(now.days)}`);
    const text = yes ? theStallRuleAsALine(THE_SUGGESTED_DAYS) : theStallRuleDeclined;
    await (this.prisma as any).groundContextItem.create({
      data: { groundId, kind: 'WAY_OF_WORKING', text, audience: 'EVERYONE', source: 'BOARD', authorUserId: requestingUserId },
    });
    return { answered: { id: 'the-stall-rule', yes }, saidBack: `This is now in how we work. It reads, "${text}"` };
  }

  /**
   * THE LEAD'S ANSWER TO A LINE THAT CAME CLOSE TO THE EVENT A FEE NOTE WAITS FOR (a-fee-note-due-on-an-event). Lead of the fee notes
   * check-in only, where Release 2 is on. Yes makes the fee note due on that day, with the line as its source; no keeps the line as
   * answered, so it is not asked again. Nothing else on the fee note changes.
   */
  async answerADueOnAnEvent(groundId: string, requestingUserId: string, itemId: string, lineId: string, yes: boolean) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, initiatorId: true } as any }) as any;
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the lead of this check-in can answer this.');
    if (!(await aCollectionsCheckInWithRelease2(this.prisma, groundId))) throw new NotFoundException('This is not waiting for an answer any more.');
    const item = await (this.prisma as any).workItem.findFirst({ where: { id: itemId, groundId, kind: 'bill' }, select: { id: true, stage: true, fields: true } });
    if (!item) throw new NotFoundException('That fee note is not on this check-in.');
    const after = theBillAfterTheLeadsAnswer(item, lineId, yes);
    if (!after) throw new NotFoundException('This is not waiting for an answer any more.');
    await (this.prisma as any).workItem.update({ where: { id: item.id }, data: { stage: after.stage, fields: after.fields, ...(after.dueAt ? { dueAt: after.dueAt } : {}) } });
    return {
      answered: { id: `${itemId}:${lineId}`, yes },
      saidBack: yes ? 'It is due from that day now, and it shows under What needs you.' : 'Nothing has changed, and you will not be asked about that line again.',
    };
  }

  async answerThePriceRange(groundId: string, requestingUserId: string, yes: boolean) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, initiatorId: true } as any }) as any;
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the lead of this check-in can answer this.');
    if (await thePriceRangeAnswer(this.prisma, groundId)) throw new BadRequestException('This has been answered already. It is in how we work, where you can change it.');
    const text = theAnswerAsALine(THE_RANGE_QUESTION, yes);
    await (this.prisma as any).groundContextItem.create({
      data: { groundId, kind: 'WAY_OF_WORKING', text, audience: 'EVERYONE', source: 'BOARD', authorUserId: requestingUserId },
    });
    return { answered: { yes }, saidBack: `This is now in how we work. It reads, "${text}"` };
  }

  async deleteWorkItem(groundId: string, itemId: string, requestingUserId: string) {
    await this.theLeadsWorkItemGround(groundId, requestingUserId);
    const item = await (this.prisma as any).workItem.findFirst({ where: { id: itemId, groundId }, select: { id: true } });
    if (!item) throw new NotFoundException('That record is not on this check-in.');
    await (this.prisma as any).workItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async createObjective(
    groundId: string,
    requestingUserId: string,
    dto: { name: string; target?: number | null; ownerParticipantId?: string | null; isADecisionAboutAPerson?: boolean; direction?: TargetDirection | null; dueOn?: string | null; assumes?: string[]; unit?: string | null },
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
        /* What the number counts, as the lead wrote it ("units", "%", "KES"); blank is none (round 1 dead end, 25 October). */
        unit: String(dto.unit ?? '').trim().slice(0, 12) || null,
        ownerParticipantId: owner,
        sortOrder: count,
        addedAtSession,
        /* What the target rests on, as the lead wrote it when she made it (the same rule as updateObjective):
           blank lines dropped, nothing reworded. Before this a new target lost them, so the board said nobody
           had written down what it assumes (Drop Access, 18 October). */
        assumes: Array.isArray(dto.assumes) ? dto.assumes.map((a) => String(a ?? '').trim()).filter(Boolean).slice(0, 12) : [],
        /* Decision 46, 29 September 2026: said plainly by the lead when the target is made, never
           guessed from its wording. This route is already the lead's alone - assertInitiatorOfBoardGround
           above. */
        isADecisionAboutAPerson: dto.isADecisionAboutAPerson === true,
        /* Decision 69: an aim to reach or a limit not to go over, as the lead chose it. Absent is null,
           not set, and the board keeps reading the words of the name until the lead says. Decision 75,
           item 17: or a share, a date to meet (with its day) or a count to keep at zero. */
        direction: asADirection(dto.direction),
        dueOn: asADirection(dto.direction) === 'DEADLINE' ? aDateOnly(dto.dueOn ?? null) : null,
      } as any,
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
    dto: { name?: string; target?: number | null; count?: number; assumes?: string[]; isADecisionAboutAPerson?: boolean; direction?: TargetDirection | null; dueOn?: string | null; unit?: string | null; ownerParticipantId?: string | null },
  ) {
    await this.assertInitiatorOfBoardGround(groundId, requestingUserId);
    /* A person's own aim read from their promise (request 110): the lead's change puts it on the record first, as theirs. */
    if (objectiveId.startsWith(AN_AIM_FROM_THEIR_PROMISE)) objectiveId = await this.putTheirOwnAimOnTheRecord(groundId, objectiveId);
    const existing = await this.prisma.groundObjective.findUnique({ where: { id: objectiveId } });
    if (!existing || existing.groundId !== groundId) throw new NotFoundException('That aim could not be found, so go back to the check-in and open it from there.');
    /*
     * ACCEPTING A NUMBER READ OFF A CLOSED ROUND PUTS IT WHERE THAT ROUND CLOSED (review of 1 October
     * 2026). The listener writes a number it lands into that round's snapshot, so the Movement tile and
     * Since the last round read the same movement. A number it only offered, and the lead accepts later,
     * is the same fact about the same round, so it goes into that round's snapshot too. Only a snapshot
     * that exists is changed: a round still open has none, and its live count already stands in.
     */
    const suggestedAt = (existing as any).suggestedAtSession as number | null | undefined;
    if (dto.count !== undefined && suggestedAt != null && (existing as any).suggestedCount != null && dto.count === (existing as any).suggestedCount) {
      await (this.prisma as any).groundObjectiveSnapshot?.updateMany?.({
        where: { groundId, objectiveId, sessionNumber: suggestedAt },
        data: { count: dto.count },
      })?.catch?.(() => undefined);
    }
    return this.prisma.groundObjective.update({
      where: { id: objectiveId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        /* What the target rests on, as the lead wrote it: blank lines dropped, nothing reworded. */
        ...(Array.isArray(dto.assumes)
          ? { assumes: dto.assumes.map((a) => String(a ?? '').trim()).filter(Boolean).slice(0, 12) }
          : {}),
        ...(dto.target !== undefined ? { target: dto.target } : {}),
        /* Whose goal it is, as the lead names it: somebody in this check-in, or null for whoever runs it (round 1, 25 October). */
        ...(dto.ownerParticipantId !== undefined ? { ownerParticipantId: await this.whoOnThisGround(groundId, dto.ownerParticipantId) } : {}),
        /* The unit the lead writes; blank takes it off (round 1, 25 October). */
        ...(dto.unit !== undefined ? { unit: String(dto.unit ?? '').trim().slice(0, 12) || null } : {}),
        ...(dto.count !== undefined ? { count: dto.count, prevCount: existing.count } : {}),
        /* Decision 46: the lead alone (assertInitiatorOfBoardGround above), set plainly, never guessed. */
        ...(dto.isADecisionAboutAPerson !== undefined ? { isADecisionAboutAPerson: dto.isADecisionAboutAPerson === true } : {}),
        /* Decision 69: the lead sets or changes which way is good here; null puts it back to not set. */
        ...(dto.direction !== undefined ? { direction: asADirection(dto.direction) } : {}),
        /* The day a date to meet is due (decision 75, item 17); null takes it off. */
        ...(dto.dueOn !== undefined ? { dueOn: aDateOnly(dto.dueOn) } : {}),
      } as any,
    });
  }

  /**
   * A PERSON'S OWN AIM, READ FROM THEIR PROMISE, PUT ON THE RECORD WHEN THE LEAD CHANGES IT (request 110). Written
   * once, as theirs and set by them, in their own words, exactly as the extraction writes one today. Returns the
   * stored target's id. Refused, in a sentence, where the promise is not an aim of theirs on this check-in.
   */
  private async putTheirOwnAimOnTheRecord(groundId: string, syntheticId: string): Promise<string> {
    const promiseId = syntheticId.slice(AN_AIM_FROM_THEIR_PROMISE.length);
    const [promise, ground] = await Promise.all([
      (this.prisma as any).personObjective.findUnique({ where: { id: promiseId } }),
      this.prisma.ground.findUnique({ where: { id: groundId }, include: { objectives: true, participants: { select: { id: true, partyType: true } } } }),
    ]);
    const rows = promise && promise.groundId === groundId && ground
      ? theirOwnAimsKeptOnlyAsPromises([promise], (ground as any).objectives ?? [], (ground as any).participants ?? [], groundId)
      : [];
    if (!rows.length) throw new NotFoundException('This aim is not on this check-in any more.');
    const made = await this.prisma.groundObjective.create({
      data: { groundId, name: rows[0].name, target: rows[0].target, ownerParticipantId: rows[0].ownerParticipantId, setByParticipantId: rows[0].setByParticipantId, sortOrder: 100 + ((ground as any).objectives?.length ?? 0) } as any,
    });
    return made.id;
  }

  async deleteObjective(groundId: string, objectiveId: string, requestingUserId: string) {
    await this.assertInitiatorOfBoardGround(groundId, requestingUserId);
    /*
     * A person's own aim, read from what they said (request 110), is theirs: it is not taken off their board from here.
     * Decided for Hafsah to confirm: the lead can change its number or count, but only the person can drop their own aim.
     */
    if (objectiveId.startsWith(AN_AIM_FROM_THEIR_PROMISE)) {
      throw new ForbiddenException('This aim is one the person set for themselves in their own check-in, so only they can drop it. You can change its number or what is counted against it.');
    }
    const existing = await this.prisma.groundObjective.findUnique({ where: { id: objectiveId } });
    if (!existing || existing.groundId !== groundId) throw new NotFoundException('That aim could not be found, so go back to the check-in and open it from there.');
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
    if (labels.length === 0) throw new ForbiddenException('Add at least one time for people to choose between, then send the poll.');

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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (!boardRendersFor(ground.scenario)) {
      throw new ForbiddenException('This check-in has no board, so there is nothing to open here.');
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
      throw new ForbiddenException('This check-in does not set its own dates, so there is nothing to choose between.');
    }
    const me = ground.participants.find((p) => p.userId === requestingUserId);
    if (!me) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');

    const option = await this.prisma.groundPollOption.findUnique({
      where: { id: optionId },
      include: { poll: { select: { groundId: true } } },
    });
    if (!option || option.poll.groundId !== groundId) throw new NotFoundException('That time is no longer in the poll, so refresh the page and choose again.');

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

  /**
   * `leaveOut`: check-ins whose waits are never read at all (decision 82, item 7: Ask Groundwork on
   * WhatsApp and a check-in kept in the app). They are left out in the query, BEFORE alike waits are
   * merged across check-ins, so a kept wait can never lend its words, its date or who it is on to a
   * wait that is said. '*' leaves out every check-in.
   */
  async waitingAcrossTheOrg(organizationId: string, now = new Date(), opts: { leaveOut?: ReadonlySet<string> } = {}) {
    const rows = await this.prisma.groundDependency.findMany({
      where: {
        ground: { organizationId },
        status: { in: [DependencyStatus.BLOCKING, DependencyStatus.WAITING] },
        ...notInTheseCheckIns(opts.leaveOut, 'groundId'),
      },
      select: {
        fromParticipantId: true, onParticipantId: true, onLabel: true, what: true,
        status: true, createdAt: true, groundId: true, sourceCheckInId: true,
        /*
         * WHETHER IT WAS TAKEN FURTHER (3 October 2026). Never selected before, so "where am I needed" could
         * never show the people whose wait was taken further. `escalatedAt` is the product's own overnight
         * stamp (a wait still open after ESCALATE_AFTER_DAYS); `triedSaid` is what the person said they did.
         */
        escalatedAt: true, triedSaid: true,
        /* Who runs it and whether its people are named to each other, so each reader is told a name only where they may be. */
        ground: { select: { label: true, scenario: true, initiatorId: true, peersVisibleToEachOther: true, participants: { select: { id: true, userId: true, email: true, partyType: true, managingOnly: true, createdAt: true } } } },
        fromParticipant: { select: { email: true, userId: true, partyType: true, nameGiven: true, organisationGiven: true, user: { select: { firstName: true, lastName: true } } } },
        onParticipant: { select: { email: true, userId: true, partyType: true, nameGiven: true, organisationGiven: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    /*
     * THE ROSTER'S NAME, for somebody who has not signed in and gave no name. Never the address: the
     * address is only the key the two sides are matched by (the-person-waiting-by-name.ts).
     */
    const addresses = [...new Set(rows.flatMap((r: any) => [r.fromParticipant?.email?.toLowerCase(), r.onParticipant?.email?.toLowerCase()]).filter(Boolean))] as string[];
    const people = (this.prisma as any).person;
    const roster: any[] = addresses.length && typeof people?.findMany === 'function'
      ? await Promise.resolve(people.findMany({
        where: { organizationId, email: { in: addresses, mode: 'insensitive' } },
        select: { email: true, displayName: true, givenName: true, familyName: true },
      })).catch(() => []) ?? []
      : [];
    const rosterName = new Map<string, string>();
    for (const p of (roster ?? []) as any[]) {
      const n = (p.displayName ?? '').trim() || [p.givenName, p.familyName].filter((x: any) => !!x?.trim()).join(' ').trim();
      if (p.email && n) rosterName.set(String(p.email).toLowerCase(), n);
    }

    /* A customer's reply is on its deal, not something the place is waiting on, unless it was said to stop the deal (a-customers-reply-is-on-its-deal). */
    /* Behind Release 1's switch for this organisation: off, every wait is read as it was before it. */
    const teamWaits = (await theReleaseOneSalesBoardIsOn(this.prisma, organizationId).catch(() => false))
      ? await withoutTheWaitsOnCustomers(this.prisma, rows as any[]).catch(() => rows as any[])
      : (rows as any[]);
    const deps: OrgDependency[] = [];
    for (const r of teamWaits as any[]) {
      /* Nobody waits on themselves (request 117, part 6): Today and Ask Groundwork read this too. */
      if (aWaitOnOneself(r)) continue;
      const from = r.fromParticipant?.email?.toLowerCase();
      if (!from) continue;
      const runsIt = (p: any) => p?.partyType === 'INITIATOR' || (!!r.ground?.initiatorId && p?.userId === r.ground.initiatorId);
      deps.push({
        fromName: aNameFor(r.fromParticipant, rosterName.get(from)),
        fromRunsIt: runsIt(r.fromParticipant),
        naming: {
          scenario: r.ground?.scenario,
          peersVisibleToEachOther: r.ground?.peersVisibleToEachOther ?? null,
          participants: ((r.ground?.participants ?? []) as any[]).map((p) => ({
            id: p.id, partyType: p.partyType, managingOnly: p.managingOnly ?? null, createdAt: p.createdAt ?? null,
            key: p.email?.toLowerCase() ?? null, runsIt: runsIt(p),
          })),
        },
        fromParticipantId: r.fromParticipantId,
        onParticipantId: r.onParticipantId,
        onLabel: r.onLabel,
        /* Said only to whoever runs the check-in (whoNeedsYouThisWeek). Never an address. */
        onName: r.onParticipant ? aNameFor(r.onParticipant, rosterName.get(r.onParticipant?.email?.toLowerCase() ?? '')) : null,
        what: r.what,
        status: r.status,
        escalatedAt: r.escalatedAt ?? null,
        triedSaid: r.triedSaid ?? null,
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
  async whoNeedsYouThisWeek(organizationId: string, managerKey: string, opts: { leaveOut?: ReadonlySet<string>; readerIsAdmin?: boolean } = {}) {
    const key = managerKey.toLowerCase();
    const now = new Date();
    const { waiting } = await this.waitingAcrossTheOrg(organizationId, now, opts);
    /*
     * A WAIT IS SAID WITH THE DAY IT BEGAN (request 117, part 9), against the record's own clock, so the
     * answer reads the same at any hour. `waitingDays` stays for the order only.
     */
    const clock = theRecordsClock((waiting as any[]).map((w) => w.createdAt), now);
    const theDay = (at: any) => (at ? theDayItBegan(at, clock) : null);

    const needs: Need[] = [];

    for (const w of waiting as any[]) {
      /* By name where this reader may read it, else "somebody in <the check-in>". Never an address. */
      const who = thePersonWaitingAsTheyRead(w, key, { readerIsAdmin: opts.readerIsAdmin });
      const day = theDay(w.createdAt);
      /*
       * THE MANAGER'S OWN QUEUE FIRST. A manager reading a list of people who need attention while
       * being the thing several of them are waiting for is the version of this that does harm.
       */
      if (w.onPersonKey === key) {
        needs.push({
          kind: 'WAITING_ON_YOU',
          who,
          says: `waiting on you for ${w.what}`,
          waitingDays: w.waitingDays,
          sinceSays: day ? `since ${day}` : null,
          sentence: `${atTheStartOfASentence(who)} has been waiting on you for ${w.what}${day ? ` since ${day}` : ''}.`,
        });
        continue;
      }
      /*
       * TAKEN FURTHER, STILL OPEN, AND NOT THIS READER'S TO CLEAR (3 October 2026). Long waits sort themselves
       * to the top of the group, and the group comes second, after the reader's own queue (WHAT_IT_ASKS order).
       *
       * WHO RAISED IT. Nobody presses a button to raise a wait. `escalatedAt` is the product's own overnight
       * stamp, put on a wait still open after ESCALATE_AFTER_DAYS (webhooks.cron.ts), so it is said as
       * Groundwork raising it, never as the person having raised it. The person raised it only where they
       * said so themselves (`triedSaid`, read by `itWasTakenFurther`, the one reader of those words).
       *
       * WHO READS IT. Everybody who asks, since 5 October (decision 93, row 2). It was only whoever runs the
       * check-in it was said in; Hafsah removed that, so a colleague, an admin and the person a performance
       * plan is about read it too. The name of the person waiting is still said only as that reader may read
       * it (`thePersonWaitingAsTheyRead`), and nobody is told about their own wait as somebody needing them.
       */
      if (w.fromPersonKey === key) continue;
      /*
       * A PERFORMANCE PLAN, PROMOTION, RENEWAL OR PROBATION IS NOT LISTED TO SOMEBODY NOT IN IT. Row 23 is kept
       * (the Company page lists none of them), and listing its label and its waits here would say what it
       * refuses to say there. The person it is about reads their own queue above, never this group.
       */
      const theReader = ((w.naming?.participants ?? []) as any[]).find((p) => p.key === key);
      if (isEvaluationCheckIn(w.naming?.scenario)
        && (!theReader || theSubjectOfAnEvaluationCheckIn((w.naming?.participants ?? []) as any) === theReader.id)) continue;
      const theySaidSo = itWasTakenFurther({ triedSaid: w.triedSaid ?? null });
      const groundworkRaisedIt = !!w.escalatedAt;
      if (!theySaidSo && !groundworkRaisedIt) continue;
      const Who = atTheStartOfASentence(who);
      /* Who it waits on is named only where the person waiting is, so a reader outside the check-in learns neither. */
      const nameIsSaid = who !== somebodyIn(w.groundLabel);
      const on = (nameIsSaid ? (w.onName ?? '').trim() : '') || (w.onLabel ?? '').trim() || null;
      const since = day ? ` since ${day}` : '';
      const where = who === somebodyIn(w.groundLabel) || !w.groundLabel?.trim() ? '' : `, in the check-in ${w.groundLabel.trim()}`;
      const waited = w.status === DependencyStatus.BLOCKING
        ? `${Who} says they cannot go on without ${w.what}, and has been waiting${on ? ` on ${on}` : ''} for it${since}${where}.`
        : `${Who} has been waiting${on ? ` on ${on}` : ''} for ${w.what}${since}${where}.`;
      const raised = [
        theySaidSo ? 'They have said they took it higher.' : null,
        groundworkRaisedIt
          ? `It was still open after ${ESCALATE_AFTER_DAYS} days, so Groundwork raised it on ${theDayItBegan(w.escalatedAt, clock)}.`
          : null,
      ].filter(Boolean).join(' ');
      needs.push({
        kind: 'STUCK_AND_RAISED',
        who,
        says: `waiting${on ? ` on ${on}` : ''} for ${w.what}, and it has been taken further`,
        waitingDays: w.waitingDays,
        sinceSays: day ? `since ${day}` : null,
        sentence: `${waited} ${raised}`,
        youRunIt: !!theReader?.runsIt,
      });
    }

    /*
     * ASKED TO BE SHOWN. The cheapest thing on the whole list to fix and the one most likely to be
     * read as a performance problem, which is why it carries its own sentence about what it asks
     * for. Only ever from what the person said about themselves - see they-said-why-themselves.ts.
     */
    const said = await this.prisma.checkIn.findMany({
      where: { saidWhy: 'SKILL', ground: { organizationId }, ...notInTheseCheckIns(opts.leaveOut, 'groundId') },
      /*
       * The check-in's own completion, not a timestamp on the person. `completedAt` is when they
       * said it; falling back to when the check-in was made keeps an in-progress one from reading
       * as nought days old.
       */
      select: { completedAt: true, createdAt: true, participant: { select: { nameGiven: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }).catch(() => [] as any[]);

    for (const c of said as any[]) {
      /* Never an address as a name (Hafsah, 28 Sep 2026; screens requests 56, 58, 65). */
      const who = [c.participant?.user?.firstName, c.participant?.user?.lastName].filter(Boolean).join(' ').trim()
        || (c.participant?.nameGiven ?? '').trim() || 'a colleague';
      const day = theDay(c.completedAt ?? c.createdAt);
      needs.push({
        kind: 'ASKED_TO_BE_SHOWN',
        who,
        says: 'said themselves that they do not know how to do something they have taken on',
        waitingDays: Math.max(0, Math.floor((now.getTime() - new Date(c.completedAt ?? c.createdAt).getTime()) / 86400000)),
        sinceSays: day ? `on ${day}` : null,
        sentence: `${atTheStartOfASentence(who)} said in their own check-in${day ? ` on ${day}` : ''} that they do not know how to do something they have taken on.`,
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
  private async everySessionThroughTheReportEngines(groundId: string, ground: any, checkIns: any[], openRound: number, reader: { participantId: string | null; isLead: boolean; runsIt?: boolean; colleaguesWordsWalled?: boolean }) {
    const completed = checkIns.filter((c) => c.status === CheckInStatus.COMPLETED && !wasAQuietClose(c as any));
    const [entries, docs, baseline, deps] = await Promise.all([
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, checkInId: { in: completed.map((c) => c.id) } },
        select: { type: true, text: true, participantId: true, recallBased: true, anchoredOrigin: true, dimensionThreadKey: true, confirmedAt: true, anchoredDocumentId: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.groundDocument.findMany({ where: { groundId, visibility: 'OPEN' as any }, select: { fileName: true, participantId: true, origin: true } }),
      (this.prisma as any).groundBaseline?.findFirst?.({ where: { groundId }, select: { successLooksLike: true } }) ?? Promise.resolve(null),
      this.prisma.groundDependency.findMany({ where: { groundId, status: { in: ['WAITING', 'BLOCKING'] as any } }, select: { what: true, status: true, blockerKind: true, fromParticipantId: true, onParticipantId: true, onLabel: true } }).then((rows: any[]) => rows.filter((d) => !aWaitOnOneself(d))),
    ]);
    const labels = labelsForParties(ground.participants as any);
    const nameOf = (pid: string | null) => (pid ? (labels.get(pid) ?? 'A colleague') : null);
    const report = ground.report ?? {};
    /* Who answered THIS round, against the one definition of who is expected (how-many-have-answered.ts). */
    const whoAnswered = await howManyHaveAnswered(this.prisma, groundId, openRound);
    const waiting = new Set(whoAnswered.waitingOn);
    const answered = ground.participants.filter((p: any) => !waiting.has(p.id) && completed.some((c) => c.participantId === p.id && c.sessionNumber === openRound));
    const held = await whatThisSessionHolds(this.prisma, groundId, openRound, reader);
    /* Whose document backs each line: somebody else's proves nothing of theirs (how-a-line-is-known). */
    const whoseDocument = await whoAddedEachBackingDocument(this.prisma, entries as any[]);
    const shape = theSessionReport({
      sessionNumber: openRound,
      closed: !!report.releasedAt,
      agreements: (report.agreements ?? []) as unknown[],
      divergences: (report.divergences ?? []) as unknown[],
      entries: entries.map((e) => ({ type: e.type, text: cleanText(e.text), who: nameOf(e.participantId), recallBased: e.recallBased, backedBy: (e as any).anchoredOrigin ?? null, confirmedAt: (e as any).confirmedAt ?? null, ...((e as any).anchoredDocumentId && whoseDocument.has((e as any).anchoredDocumentId) ? { documentIsTheirOwn: whoseDocument.get((e as any).anchoredDocumentId) === e.participantId } : {}), threadKey: e.dimensionThreadKey ?? null })),
      previousEntries: [],
      baselineSuccess: baseline?.successLooksLike ?? null,
      startingPoint: null,
      previousSharedPicture: null,
      evidence: docs.map((d: any) => ({ text: whatThisDocumentIs(d.fileName, d.origin), who: nameOf(d.participantId) })),
      specificityLevel: null,
      centralQuestion: report.centralQuestion ?? null,
      /* From the one owner, over the round in play - not a lifetime delta and not every dependency ever raised. */
      movedOnTargets: held.movedOnTargets,
      targetsSet: held.targetsSet,
      targetsWithANumber: held.targetsWithANumber,
      targetsMoved: held.targetsMoved,
      blocked: held.blocked,
      waiting: held.waiting,
      /* And the blocker itself, so the board's tile names it exactly as the report's does. */
      theFirstBlocker: held.theFirstBlocker,
      worries: held.worries,
      theFirstWorry: held.theFirstWorry,
      whyNoWorryIsShown: held.whyNoWorryIsShown,
      waitsFromEarlier: held.waitsFromEarlier,
      answeredThisSession: answered.map((p: any) => ({ who: nameOf(p.id) ?? 'A colleague', isYou: false })),
      peopleInAll: whoAnswered.expected,
    });
    const question = draftTheQuestion({
      functions: ground.participants.map((p: any) => ({ fn: p.detectedFunction ?? null, confidence: p.detectedFunctionConfidence ?? null })),
      blockers: deps.map((d) => ({ what: d.what, kind: (d.blockerKind as any) ?? null })),
      /*
       * THE BOARD READS THE DIFFERENCE THE SAME PAGE IS SHOWING.
       *
       * The report learnt this on 22 September 2026 and the board did not: the divergence section
       * named what two people described differently, and "What to settle together", a few inches
       * below it, fell through to a role-map probe about the work in general. Same rows, so the
       * same question - see draftTheQuestion.
       */
      differences: ((report.divergences ?? []) as any[])
        .filter((d) => d?.topic)
        .map((d) => ({ topic: String(d.topic), settledBy: d.settledBy ?? d.atStake ?? null })),
    });
    /* The tiles are counted over the round in play, so "this session" is now true on the board too;
       the rewrite to "across every session" that used to sit here was papering over lifetime counts. */
    return { ...shape, theConversationWorthHaving: question?.text ?? null };
  }

}

/**
 * A where clause that never selects a row from these check-ins (by the row's `field`, a required
 * check-in id). Nothing to leave out gives an empty clause; '*' leaves out every check-in.
 */
export function notInTheseCheckIns(leaveOut: ReadonlySet<string> | undefined, field: string): Record<string, unknown> {
  if (!leaveOut?.size) return {};
  if (leaveOut.has('*')) return { [field]: { in: [] } };
  return { [field]: { notIn: [...leaveOut] } };
}
