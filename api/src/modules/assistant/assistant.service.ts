import { aDaySaidInFull } from '../board/a-day-said-in-full';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { understandTheMessage, type TheMessageUnderstood } from './ask-understands-with-the-model';
/** END, done or finish, on its own: what a check-in that has closed is told (it reaches Ask only when nothing is open). */
const AN_END_WITH_NOTHING_OPEN = /^\s*(?:end|end it|end the (?:check-?in|session)|stop the (?:check-?in|session)|finish|finished|done|i'?m done|i am done)\s*[.!]*\s*$/i;
const NOTHING_TO_END = 'There is no check-in open here, so there is nothing to end.';
/** What an update said in Ask is told, where nothing of theirs on record is what it changes. Ask is private, so it is not put on the record from here. */
const AN_UPDATE_SAID_IN_ASK = 'Thank you. What you say here in Ask stays between you and Groundwork, so it is not on your record yet. To put it there, say it in your next check-in, or press Add something on your check-in.';
import { clearTheWaitsTheRecordEnds } from '../conversation/a-wait-is-over-from-what-it-means';
import { checkTheCorrection, type WhatTheRecordHolds, type TheCorrectionChecked, type ANumberShownThem } from './a-correction-is-checked-like-a-claim';
import { thePromisesOf, thePromisesCounted } from '../grounds/the-promises-counted-once';
import { withTheirCountNow } from '../board/an-aim-is-counted-now';
import { forHumans } from '../presentation/outbound';
import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { WAITING_TO_BE_LET_IN } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';
import { asksWhatWeKnowOfTheirJob, parseAJobCorrection, theCorrectionSaidBack, whatTheyToldUs, SHARE_KIND as JOB_CORRECTION_KIND } from './my-job-in-ask';
import { correctTheirJob, theirJobForThem } from '../suites/correct-their-job';
import { SHARE_WITH_THE_ROLE_MAP_KIND } from '../conversation/their-role-in-the-first-check-in';
import { withoutComparisonsAnywhere } from '../reports/no-comparison-between-people';
import { A_LINK_IS_NOT_READ } from './a-link-is-not-read';
import { namesTheyCanTellApart } from '../../common/check-ins-you-can-tell-apart';
import { whatWasSaid } from './what-was-said-is-what-is-kept';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { NOTHING_FLAGGED } from '../detectors/who-needs-you-this-week';
import { PrismaService } from '../prisma/prisma.service';
import { contextIsInAskGroundwork } from '../admin/what-is-hidden-at-release';
import { DependencyStatus } from '@prisma/client';
import { aQuestionAskedAboutARequest, aQuestionSaidBack, aQuestionSent, aQuestionNotSent, WHICH_REQUEST_TO_ASK_ABOUT, NOTHING_TO_ASK_ABOUT, HOURS_TAKE_NO_QUESTION } from '../suites/an-approver-asks-by-saying-so';
import { whatYouCanAskSaid } from './what-you-can-ask-here';
import { route, whatICanDoWith, Lane } from './the-router-is-deterministic';
import { aPromiseAsASentence } from './a-promise-as-a-sentence';
import { noSeatYetSays, whenIsMyNextCheckIn, whatMyCheckInIsFor, theCompanysPriorities, asksWhatTheCompanyIsWorkingOn, isTheStrategyMoving, THE_REQUEST_STARTERS, howToAskForLeaveOrSpending } from './about-your-check-ins-and-the-company';
import { Reply, rules, text, picker, SourceBlock } from './a-reply-is-a-payload-not-a-string';
import { isACorrection, whatTheyMean, theCorrectionAnswered, aChangeOfTheirs, theChangePutOnRecord, aWaitingRequestNamed, stillWaitingSaid } from './a-correction-said-in-ask';
import { ReportsService } from '../reports/reports.service';
import { askTheReportsDoor } from '../reports/one-persons-circumstances-stay-their-own';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { whatThisReaderCallsEachLabel, noStandInLabelAnywhereIn } from '../reports/a-stand-in-label-never-reaches-a-reader';
import { howManyAnsweredInWords } from '../reports/the-picture-in-plain-sentences';
import { whatSomeoneSaid, checkInsTheyMayRead, latestRounds, I_CANNOT_SHOW_YOU_THAT } from './what-they-said-that-you-may-read';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { theOneToDoFirst, whatMustSurviveIn } from './what-to-do-next';
import { aReportSource, YOUR_TO_DOS_SOURCE, YOUR_COMMITMENTS_SOURCE, WHAT_NEEDS_YOU_SOURCE } from './a-source-says-where-it-came-from';
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import { AnthropicService } from '../conversation/anthropic.service';
import { STYLE, STYLE_VERSION, safeToUse, composePrompt, roleNameIn } from './the-model-words-it-and-nothing-more';
import { hasSlipped, theOneToRaise } from './what-somebody-said-they-would-do';
import { catchCommitment, resolveConfirmation, proposalSummary } from './something-said-in-passing';
import { BoardService } from '../board/board.service';
import { thePersonWaitingAsTheyRead, atTheStartOfASentence, somebodyIn } from '../board/the-person-waiting-by-name';
import { theRecordsClock, theDayItBegan } from '../board/a-wait-is-dated-not-counted';
import { OnboardingService } from '../grounds/onboarding.service';
import { ContributionKind } from '@prisma/client';
import {
  Load, Waiting, theOneMove, theMirror, goingCold, bankedWins, sayTheMoves,
} from '../coaching/the-four-converting-moves';
import { KnowledgeService, STOPWORDS } from '../knowledge/knowledge.service';
import {
  ADDED_TO_THE_HANDBOOK, FOR_THE_ORGANISATION, NOT_ADDED, NO_WORDS_IN_IT, OFFER_FOR_THE_ORGANISATION, ONLY_AN_ADMIN_ADDS_ONE,
  ORGANISATION_DOCUMENT_KIND, SAYS_IT_IS_FOR_THE_ORGANISATION, SAYS_IT_IS_FOR_THE_WHOLE_ORGANISATION, itsParts, whatTheDocumentSays, WHAT_IS_IN_IT_PROMPT,
} from './a-document-for-the-whole-organisation';
import { keptForTheOrganisation, keptThatTouches, mayReadWhatIsKept } from '../knowledge/organisation-memory';
import { LeaveBoardService } from '../suites/the-leave-board.service';
import { LEAVE_NOT_SENT, LEAVE_NOTHING_WAITING, LEAVE_WHICH_DAYS, plainlyAsksForLeave, readLeaveDates, sayBackLeave, sendLeave, soundsLikeLeave } from '../suites/leave-said-in-chat';
import { TimeSheetsService } from '../suites/the-time-sheets.service';
import { SpendingService } from '../suites/the-spending.service';
import { SuitesService } from '../suites/suites.service';
import { readDuties } from '../suites/who-holds-each-duty';
import { setsSpendingSteps, theStepsSaid, theStepsSetSaid } from './spending-steps-said-in-ask';
import type { Duties } from '../suites/who-holds-each-duty';
import type { Weekday } from '../suites/the-time-sheet-rules';
import {
  SUITE_SETUP_KIND, SUITE_SETUP_CONFIRM_KIND, STOP as STOP_SETTING_UP, asksToSetUpASuite, startPlan, nextQuestion, takeAnswer, takeAChange,
  theFirstQuestionSaid, theSayBack, theSetUpSaid, whatToWrite, planFromStored, onlyAnAdminSetsThisUp, THE_DUTY_FOR,
  SET_UP_DONE, SET_UP_NOT_DONE, SET_UP_STOPPED, SET_UP_CHANGE_NOT_READ, SUITE_IN_WORDS,
  type Plan as ASetUpPlan, type SetUpSuite, type WhatIsKnown as WhatIsKnownToSetUp,
} from './a-suite-set-up-by-talking';
import { theirSignIn } from '../suites/a-roster-entry-and-its-sign-in';
import { withoutCommitmentsFromGoalsNotToldYet } from '../grounds/a-commitment-from-a-goal-not-told-is-not-read-by-its-person';
import { theOpenSession as theOpenSessionOfACheckIn, whereOneStands } from '../engagement/heres-what-is-new';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { theRecordForPromises, thePromisesSaidDone } from '../conversation/a-promise-said-done-is-kept';
import { onWhatsApp, askedOnWhatsApp, keptInTheApp, mayBeRead, notFromAKeptCheckIn, notAKeptCheckIn } from './a-check-in-kept-in-the-app-is-not-read-on-whatsapp';
/** The parked kinds that belong to the app's setup conversation (Add context), never to a message on WhatsApp. */
const THE_APPS_OWN_SETUP_KINDS = new Set(['context', 'context_turn', 'context_line', 'lead_note', 'which_context_check_in']);
import { aDecisionIn, onlyTheDecision, aDecisionSaidBack, aDecisionDone, aDecisionNotMade, whichDecision, NOTHING_TO_DECIDE, HOURS_ARE_NOT_DECLINED, type AWaitingRequest } from '../suites/a-request-in-words';
import { whatWaitsForYouToDecide } from '../suites/what-waits-for-you-to-decide';
import { whoApprovesFor } from '../suites/who-approves';
import {
  HOURS_ARE_OFF_FOR_YOUR_QUESTION, LEAVE_IS_OFF_FOR_YOUR_QUESTION, NEITHER_SUITE_IS_ON, NO_SIGN_IN_FOR_YOUR_QUESTION, SPENDING_IS_OFF_FOR_YOUR_QUESTION,
  daysOfLeaveLeftSaid, theDaysAskedAbout, theSuiteRefusal, whatIsDueSaid, whatWaitsForYouSaid, whereYourRequestsAre, whichOfYourRequests, whichSuite, whoApprovesSaid, whoIsAwaySaid,
  type AwayRow,
} from './your-own-requests-asked-about';
import { LEAVE_ANSWER_KIND, LEAVE_QUESTION_KIND, LONGEST, NO_QUESTION_WAITING, QUESTION_REFUSED, aDeclineWithAReasonSaidBack, aReasonIn, anAnswerNotSent, anAnswerSaidBack, anAnswerSent, noQuestionWaiting, type AQuestionWaiting, type QuestionSuite } from '../suites/a-question-about-a-request';
import { HOURS_CAN_BE_TOLD_HERE, HOURS_NOT_SENT, HOURS_NOTHING_WAITING, HOURS_SUITE_OFF, asksWhereMyHoursStand, hoursSaidBack, hoursSent, readHours, soundsLikeHours, type HoursSaid } from '../suites/hours-said-in-chat';
import { billableSaidBack, billableSaidIn, type TimeRules } from '../suites/the-time-sheet-rules';
import { DRAFT_CHANGE_NOT_READ, DRAFT_NOT_SENT, HOURS_WEEK_DRAFT_KIND, aLineRemoved, asksToDraftMyWeek, theClientNamedIn, theDraftChanged, theDraftSaidBack, theDraftSent, type ADraftEntry } from '../suites/a-week-drafted-from-the-record';
import { aReasonInASentence, SPEND_PURPOSE_KIND, SPEND_MISSING_KIND, SPEND_NOT_SENT, SPEND_NOTHING_WAITING, SPEND_SUITE_OFF, readSpending, soundsLikeSpending, spendingSaidBack, spendingSent, type SpendSaid } from '../suites/spend-said-in-chat';
import { theCategoryCalled, theCategoryIn, whichCategory, whichCategoryAgain, type SpendRules } from '../suites/the-spending-rules';
import { NOT_KEPT, NOT_KEPT_ANYWHERE, theRuleIsTheAnswerRefused } from '../knowledge/what-the-organisation-keeps';
import { howLongAgo, splitBySession } from './what-you-told-me-before';
import { ScenariosService } from '../detectors/scenarios.service';
import { DraftsService } from '../drafts/drafts.service';
import { whatToAskForNext } from '../drafts/a-number-nobody-argued-for';
import { readToDo, toDoProposal, whichToDo, listToDos, addedToYourToDos } from './a-to-do-is-yours';
import {
  readTheDay, readAMove, thereIsNoMoveToRead, moveProposal, moveDone, NOTHING_WAS_CHANGED, onlyTheyCanChangeIt,
  readACommitment, noCommitmentToRead, additionProposal, additionDone, tickProposal, tickDone,
  type AMove, type AnAddition, type ATick,
} from './a-change-said-back-first';
import { addACommitment, markACommitmentDone, moveACommitmentsDeadline } from './a-commitment-has-one-writer';
import { whatItTakesToStart } from './what-it-takes-to-start';
import {
  ROLE_INTERVIEW_KIND, ROLE_INTERVIEW_CONFIRM_KIND, THE_FOUR, INTERVIEW_INVITATION, theyWantToBegin, theyWantToStop,
  LONGEST_ANSWER, tidy, sayItBack, SAVED, LEFT, NOT_NOW_SAID, TOO_LONG, EMPTY,
  type InterviewPayload, type ConfirmPayload, type TheFourAnswers,
} from './the-role-interview';
import {
  whichSituation,
  askWhichSituation,
  whoWouldBeAsked,
  askBeforeOpeningIt,
  saidAsAList,
} from './what-a-new-check-in-would-be';
import { WhatIsTrueService } from './what-is-true.service';
import { WHAT_THE_ASSISTANT_CAN_DO } from './what-the-assistant-can-do';
import { EmailService } from '../email/email.service';
import { GroundsService } from '../grounds/grounds.service';
import {
  whereItLives,
  whatToCallIt,
  whatWeCanAndCannotDo,
} from '../documents/where-a-document-lives';
import { ReadItIfWeCanService } from '../documents/read-it-if-we-can.service';
import {
  whyThereIsNowhereToPutIt,
  askWhoItIsFor,
  whoTheyMeant,
  askAgain,
  whatWasDone,
} from './a-document-is-private-until-you-say-otherwise';
import {
  whyThisCannotBeSent,
  askBeforeSending,
  theMail,
} from './anything-it-can-say-it-can-send';
import { whatIStillCannotDo } from './what-is-not-offered-in-chat';
import { whatTheyWantToCallIt } from './what-they-want-to-call-it';
import { asALine, whatIsMissingAcrossThem } from './what-a-target-was-for';
import {
  THINK_IT_THROUGH_PROMPT, THINK_IT_THROUGH_PROMPT_KEY, THINK_IT_THROUGH_SCHEMA, WHAT_TO_THINK_ABOUT, COULD_NOT_LAY_OUT, NOT_ENOUGH_TO_GO_ON,
  whatToThinkAbout, thePromptFor, theOptionsThatStay, theOptionsSaid,
} from './think-it-through';
import { PromptsService } from '../prompts/prompts.service';
import { recall, saidOf, NOTHING_FINISHED, NOTHING_AT_ALL } from './what-the-last-round-produced';
import { COOLING_DAYS } from '../detectors/a-conversation-the-record-suggests';
import {
  Suggestible, fromRow, suggestionLine, askAbout, acceptedLine, acceptedNextStep, declinedLine, NOTHING_PENDING,
} from './a-suggestion-you-can-answer';
import { Prisma } from '@prisma/client';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { looksLikeADump } from '../grounds/a-dump-is-many-things';
import { asksToAddADocument, LINE_KINDS, whatKindOfThingWasSaid } from './what-kind-of-thing-was-said';
import { isAGuestsKey } from './a-guests-questions-are-kept-apart';
import { withoutGoalsNotToldIn } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { theWordsOfWhatTheLeadHasNotToldThemAbout, theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { targetsHiddenFrom, withoutHiddenTargetsIn, namesOnTheRoster } from '../board/a-hidden-target-stays-hidden';
import { runsIt, groundsAViewerMayList } from '../grounds/who-may-read-this-check-in';
import { A_GROUND_IS_OVER } from '../grounds/a-ground-that-has-ended';
import { parseContextLine, parseLeadNote, labelForContextKind, parseChangeContextLine, parseAskAPerson } from './a-line-or-a-note-typed-in-chat';
import { quotedThenEnding } from './a-quote-takes-no-second-mark';
import { theContextWeHave, WhatLanded } from '../documents/what-a-document-holds';
import { writeADocumentsNumbers } from '../documents/write-a-documents-numbers';

/**
 * THE LANES, AND EVERY ONE OF THEM WORKS WITH THE MODEL OFF.
 *
 * That is the floor the spec asks for and it is built first rather than last, because a
 * deterministic reply written after a model-composed one is written to match it - and what you get
 * is a fallback nobody would ship on its own.
 *
 * There is no model call in this file at all yet. Every lane here answers from records the customer
 * actually pushed, so what it says is either true or absent. Composition can be layered over these
 * later; the answers will not change, only the wording.
 *
 * The lanes that do not exist yet are not stubbed. A stub is a lane that answers, badly, and gets
 * believed - `unplaced` says plainly what it can do instead.
 */
/**
 * How many finished check-ins a recall carries. A person in eight of them asked what was agreed
 * does not want eight reports pasted at them - they want the recent ones and a pointer to the rest.
 */
const ROUNDS_RECALLED = 3;

/**
 * NOTHING FROM ANY OF THESE FOUR LANES IS REMEMBERED IN A PERSON'S ORDINARY ASK GROUNDWORK HISTORY
 * (inventory item 2). All four are setup-side administration of a check-in a lead runs, in the same
 * spirit as `add_context` itself, which decision 50 already settled this way - see `respond`.
 */
const LONGEST_QUESTION = 1000;
const SETUP_LANES = new Set<string>(['add_context', 'context_line', 'lead_note', 'questions_for_people', 'ask_for_leave', 'log_hours', 'ask_to_spend', 'decide_a_request', 'set_up_a_suite'] satisfies Lane[]);

/**
 * SOMEBODY SAYING THEY JUST PUT A DOCUMENT IN, in the past tense - "I added the Q4 targets sheet",
 * "I've uploaded it" - as opposed to `add_a_document`'s own patterns, which are about STARTING an
 * upload ("upload the handbook"). Narrow on purpose: a word for having just done it, not a request.
 */
const A_FILE_KEPT = 'I have kept it with the check-in, and I will use it from now on. Ask me anything about what is in it.';
const JUST_ADDED_A_DOCUMENT =
  /\bi(?:'ve| have)?\s+(?:just\s+)?(?:added|uploaded|attached|put\s+(?:up|in))\b/i;

/** The lanes that move the Context tab into Ask Groundwork. Hidden at release; the old context chat stays. */
const THE_CONTEXT_LANES = new Set<string>(['add_context', 'context_line', 'lead_note', 'questions_for_people']);

/**
 * WHETHER A PIECE OF TEXT COULD BE SOMEBODY'S NAME. Four words at most, and no sentence inside it:
 * a full stop, a comma, a question mark or a semicolon means somebody typed a sentence, not a name.
 * Deliberately generous at the short end - one word is a first name - and strict about length,
 * because the cost of guessing wrong is reading a person's question back to them as a colleague.
 */
export function looksLikeAName(q: string): boolean {
  const t = (q ?? '').trim();
  if (!t || t.length > 60) return false;
  if (/[.,;:!?]/.test(t)) return false;
  const words = t.split(/\s+/);
  return words.length >= 1 && words.length <= 4;
}

/** Groundwork's own tags for what people told it (the chat, the panel, the seed), which no customer ever named. */
function aSourceIsGroundworks(sys: string): boolean {
  return /^(groundwork|gwc_|panel$|seed$)/i.test(sys);
}

/** Where the information came from, in words a person uses (B-028): never "groundwork-chat". A customer's own system keeps its own name. */
function aSourceInPlainWords(sys: string, _stale: boolean): string {
  return aSourceIsGroundworks(sys) ? 'What you have told Groundwork' : sys;
}

import { isAQuestion, answerFromTheDocuments, NO_DOCUMENTS_TO_READ, NOT_IN_THE_DOCUMENTS } from './a-question-is-answered-from-the-documents';
import { openTheLeadsCheckIn } from '../grounds/check-in-yourself';
/** "I want to do my own check-in", "check in myself", "my check-in now". */
const A_WISH_TO_CHECK_IN_MYSELF = /\b(?:(?:do|start|begin|answer)\s+my\s+(?:own\s+)?check[\s-]?in|check[\s-]?in\s+(?:myself|for\s+myself)|my\s+own\s+check[\s-]?in)\b/i;
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    /*
     * Named for a provider it no longer uses - it speaks to Gemini - and left alone, because a
     * rename here would touch the check-in engine, which is not what this change is about.
     */
    private readonly engine: AnthropicService,
    private readonly knowledge: KnowledgeService,
    private readonly board: BoardService,
    private readonly onboarding: OnboardingService,
    /*
     * The detectors already produced these and already knew how to take an answer. Injecting the
     * service rather than reading `scenarioCandidate` here is what keeps the "only the person it
     * was put to may answer it" check in one place - `decide` owns that, and a query written here
     * would be a second, weaker copy of it.
     */
    private readonly scenarios: ScenariosService,
    /*
     * The drafting flow already existed — it opens a draft, pulls people in,
     * refuses to seed while anybody still disagrees, and writes the objective.
     * It was reachable by nothing. Injecting it rather than writing a second
     * objective-setting path here is what keeps that refusal in one place.
     */
    private readonly drafts: DraftsService,
    /*
     * WHAT IS TRUE FOR THIS PERSON, ASSEMBLED ONCE. Lanes ask it rather than
     * querying, so what the assistant knows stops depending on which question
     * was asked. See `what-is-true-for-this-person.ts`.
     */
    private readonly truth: WhatIsTrueService,
    private readonly reader: ReadItIfWeCanService,
    private readonly email: EmailService,
    private readonly grounds: GroundsService,
    /*
     * THE REPORT AS IT IS SERVED TO ONE READER (week 17). Asked only as the person asking, for "what
     * did Femi say", so a colleague's words reach this assistant only as far as that read serves
     * them. Optional so the many tests that build the assistant without it still do; with it
     * missing, that question is answered "I cannot show you that".
     */
    @Optional() private readonly reports?: ReportsService,
    /* The stored prompt for "think it through", so the version that ran is the one recorded (week 19). Optional like the above. */
    @Optional() private readonly prompts?: PromptsService,
    /* The leave suite, for leave dates said in chat (week 20). Without it, leave is answered as not switched on. */
    @Optional() private readonly leave?: LeaveBoardService,
    /* The time sheets and spending suites, for hours and spending said in chat (weeks 21 and 22). Without them, each is answered as not switched on. */
    @Optional() private readonly timeSheets?: TimeSheetsService,
    @Optional() private readonly spending?: SpendingService,
    /* The suites' own rules, for an admin setting a suite up by talking (decision 85). Written only through its methods, the same ones the Suites page uses. */
    @Optional() private readonly suites?: SuitesService,
  ) {}

  /**
   * `groundId` IS THE CHECK-IN CHOSEN UNDER "ABOUT" (see ask.service.ts). Only the `add_context`
   * lane reads it - every other lane answers from the person's whole record, unchanged. Optional and
   * backward compatible: every other caller of `respond` still calls it with three arguments.
   *
   * `openedFromSetup` (decision 65) is Ask Groundwork opened from inside a check-in's own Context
   * and resources page or setup. `ask.service.ts` has already checked, before calling this, that the
   * sender may confirm setup on `groundId` (decision 63's rule, `GroundsService.mayOpenSetupChatFor`)
   * - this only skips the word "context" the ordinary door still needs, it does not itself decide
   * who may reach the setup conversation, so nothing else should set it true without that same check.
   * With it true, the message is routed straight to `addContext` for `groundId`, whatever it says,
   * empty included - `addContext` already opens on what is missing when there is nothing to answer.
   */
  /**
   * ASK GROUNDWORK, ASKED ON WHATSAPP (decision 82, item 7). The same answer as in the app, except that
   * nothing is read from a check-in the lead keeps in the app: every read below asks `keptInTheApp`,
   * which is empty in the app. See a-check-in-kept-in-the-app-is-not-read-on-whatsapp.ts.
   */
  respondOnWhatsApp(organizationId: string, personId: string, message: string): Promise<Reply> {
    return onWhatsApp(() => this.respond(organizationId, personId, message));
  }

  async respond(organizationId: string, personId: string, message: string, groundId?: string, openedFromSetup = false): Promise<Reply> {
    /* No sentence that ranks a person against others is said in an answer (reports/no-comparison-between-people.ts). */
    return withoutComparisonsAnywhere(await this.respondInner(organizationId, personId, message, groundId, openedFromSetup));
  }

  private async respondInner(organizationId: string, personId: string, message: string, groundId?: string, openedFromSetup = false): Promise<Reply> {
    /* Decision 35: a bank or card number typed here is hidden before it is kept or read by a model. See documents/bank-details-are-never-kept. */
    message = withoutBankDetails(message);
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true, linkedUserId: true, email: true },
    });
    /* A guest's key is nobody's history, whichever entry carries it. See a-guests-questions-are-kept-apart. */
    const who = me?.externalId && !isAGuestsKey(me.externalId) ? me.externalId : null;
    /* The signed-in USER, not the Person row - `contextChat`/`applyContextProposal` check this
       against `ground.initiatorId` and against org-admin membership, neither of which a Person id
       can answer. Ask Groundwork always links the two (see ask.service.ts whoIsAsking). */
    /* Linked, or matched to their sign-in by address (decision 82, item 6): a roster entry that was
       never linked is still this person for leave, hours and spending. */
    const userId = await theirSignIn(this.prisma, organizationId, me).catch(() => me?.linkedUserId ?? null);

    /* A correction is checked against what they wrote, never shrugged at (a-correction-said-in-ask.ts, 26 October). */
    const theirTurns = async () => ((await Promise.resolve((this.prisma as any).conversationTurn?.findMany?.({
      where: { role: 'PERSON', checkIn: { participant: { userId } } },
      orderBy: { createdAt: 'desc' }, take: 200,
      select: { content: true, createdAt: true, checkInId: true, checkIn: { select: { participantId: true, ground: { select: { label: true } } } } },
    })).catch(() => [])) ?? []).map((t: any) => ({ text: String(t.content ?? ''), at: new Date(t.createdAt), label: t.checkIn?.ground?.label ?? null, checkInId: t.checkInId, participantId: t.checkIn?.participantId }));
    /*
     * WHAT THEY MEAN, READ BY THE MODEL WHERE THE RULES PLACE NOTHING (fix plan, pattern 2; ask-understands-with-the-model.ts). The rules
     * still go first, and keep every lane that writes, approves or sends: the model can only point at a lane that reads, or say the message
     * is a correction or an update.
     */
    /*
     * END WITH NOTHING OPEN (fix plan, pattern 3; quarter test). A check-in that has already closed has nothing to end: END, "done" or
     * "finish" reaches Ask, and was answered "I cannot answer that one yet". It says so, and when the next one comes.
     */
    if (AN_END_WITH_NOTHING_OPEN.test(message)) {
      /* Only where nothing is open: "There is no check-in open here" went to people whose check-in was open (two-week check). */
      const stillOpen = userId ? await Promise.resolve((this.prisma as any).checkIn?.findFirst?.({
        where: { participant: { userId, ground: { organizationId, status: { notIn: ['RESOLVED', 'CLOSED', 'STALLED', 'PAUSED'] } } }, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }, isSetup: false, OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }] },
        select: { ground: { select: { label: true } } }, orderBy: { createdAt: 'desc' },
      })).catch(() => null) : null;
      if (stillOpen) return rules('a_check_in_still_open', text(`Your check-in for “${stillOpen.ground?.label ?? 'your team'}” is still open, so nothing was ended. Go back into it to finish it, or carry on answering there.`));
      const next = await this.answer(organizationId, personId, who, 'When is my next check-in?', false, groundId, userId, openedFromSetup);
      const first = (next as any)?.blocks?.[0];
      const after = first?.type === 'text' && first.body && !/^I cannot answer that one yet/.test(first.body) ? ` ${first.body}` : '';
      return rules('when_is_my_next_check_in', text(`${NOTHING_TO_END}${after}`));
    }
    const placedByRules = route(message).lane !== 'unplaced';
    const understood = userId && (!placedByRules || isACorrection(message))
      ? await understandTheMessage(this.engine as any, this.prompts as any, message).catch(() => null)
      : null;
    /* A correction, in any words, is checked like a claim against their own record (a-correction-is-checked-like-a-claim.ts). */
    if (userId && (understood?.kind === 'correction' || (!understood && isACorrection(message)))) {
      const record = await this.whatTheRecordHoldsFor(organizationId, userId).catch(() => null);
      const checked = record ? await checkTheCorrection(this.engine as any, this.prompts as any, message, record).catch(() => null) : null;
      if (checked) {
        await this.putTheCorrectionOnRecord(record!, checked).catch(() => undefined);
        /* A backed correction closes, everywhere in the organisation, every wait it shows is over, not only the one the check named
           (Hafsah, 29 October). Only that a wait is over is written; nothing they typed here reaches anybody. After the reply, not before. */
        if (checked.verdict === 'backed') void this.closeTheWaitsACorrectionEnds(organizationId, userId, message, checked.reply).catch(() => undefined);
        return rules('a_correction', text(checked.reply));
      }
    }
    if (userId && isACorrection(message)) {
      const theirs = await theirTurns();
      const found = whatTheyMean(message, theirs);
      const quoted = /["“]([^"”]{6,})["”]/.exec(message)?.[1]?.trim() ?? null;
      if (!found && quoted) {
        /* Words of theirs Groundwork quoted that nothing they wrote holds: off the record, so it is never said again. */
        await (this.prisma as any).recordEntry.updateMany({ where: { participant: { userId }, text: { contains: quoted.slice(0, 120), mode: 'insensitive' }, disputedAt: null }, data: { disputedAt: new Date() } }).catch(() => undefined);
      }
      return rules('a_correction', text(theCorrectionAnswered(found, !found && !!quoted)));
    }
    let reply = await this.answer(organizationId, personId, who, message, false, groundId, userId, openedFromSetup, understood);
    /* Not a question, about something they wrote: their update, kept beside it, never "I cannot answer that one yet" (a-correction-said-in-ask.ts). */
    const shrugged = (reply as any)?.blocks?.[0]?.type === 'text' && /^I cannot answer that one yet\./.test((reply as any).blocks[0].body ?? '');
    const waitingNamed = shrugged && userId ? aWaitingRequestNamed(message, await this.waitingForYouToDecide(organizationId, userId).catch(() => [])) : null;
    if (waitingNamed) reply = rules('decide_a_request', text(stillWaitingSaid(waitingNamed)));
    else if (shrugged && userId && aChangeOfTheirs(message)) {
      /*
       * NEVER WRITTEN TO THE RECORD FROM ASK (polish round 3). What somebody types in Ask is theirs alone, always. Kept on the record, a
       * line Wanjiru typed in Ask was served word for word to Aisha as Wanjiru's check-in words. Ask shows them the line it is about and
       * says how to put the change on record themselves: Add something, or their next check-in.
       */
      const found = whatTheyMean(message, await theirTurns(), 2);
      if (found) reply = rules('a_correction', text(theChangePutOnRecord(found, message)));
      /* An update with nothing of theirs to set it beside is still not shrugged at: where it goes is said (two-week check, Kevin). */
      else if (understood?.kind === 'update') reply = rules('an_update', text(AN_UPDATE_SAID_IN_ASK));
    }

    /*
     * NOTHING FROM THE CONTEXT LANE IS REMEMBERED HERE. The setup conversation has never kept its
     * own history server-side - the old context chat is stateless and the client held it - and
     * decision 50 keeps that: "the context lane's history is stored where the context chat stores
     * it today", which is nowhere, and never in this person's own private Ask Groundwork history.
     * `addContext` and its parked-proposal handling carry what little continuity they need in the
     * proposal's own payload instead. See docs/context-chat-inventory.md, item 2.
     */
    if (who && !SETUP_LANES.has(reply.lane) && reply.lane !== 'role_interview') {
      await this.remember(organizationId, who, message, reply).catch(() => undefined);
    }
    return reply;
  }

  /**
   * THE SIX STAGES, IN THE ORDER THE CONFIRMATION HAS TO HAPPEN.
   *
   * A parked proposal is resolved BEFORE anything else is considered, because the person is
   * answering a question we asked. Routing their "yes" as if it were a fresh question would lose it
   * and leave the proposal parked, which is the state that must never persist.
   */
  private async answer(
    organizationId: string,
    personId: string,
    who: string | null,
    message: string,
    /*
     * RE-ENTRY IS BOUNDED BY A FLAG, NOT BY A DATABASE WRITE HAVING SUCCEEDED.
     *
     * The drop path answers the person's actual message by calling this again, and the only thing
     * stopping that from looping was the proposal no longer being PARKED - true only if the update
     * landed. A failed write would have meant an infinite loop inside a request. Found by a test
     * whose fake returned the same parked row every time, which is what a database under a failed
     * write would do.
     */
    afterDrop = false,
    /** The check-in chosen under "About". Read only by `addContext`. See `respond`. */
    groundId?: string,
    /** The signed-in user behind `who`. Read only by `addContext`. See `respond`. */
    userId?: string | null,
    /**
     * DECISION 65. True only when `respond` was called with `openedFromSetup`, itself only set by
     * `ask.service.ts` once it has confirmed the sender may confirm setup on `groundId`. Skips the
     * keyword router entirely and goes straight to `addContext` - not just prioritised above the
     * other lanes below, replacing the routing decision outright, because the screen has already
     * said what this message is for and a message like "twelve weeks" or "" must not be read as
     * `unplaced` or anything else just because it does not happen to contain the word "context".
     */
    forceAddContext = false,
    /** What the model read the message as, where the rules placed nothing (ask-understands-with-the-model.ts). Only ever a lane that reads. */
    understood: TheMessageUnderstood | null = null,
  ): Promise<Reply> {
    if (who && !afterDrop) {
      let parked = await this.prisma.assistantProposal.findFirst({
        where: { organizationId, personExternalId: who, state: 'PARKED' },
        orderBy: { createdAt: 'desc' },
      });
      /*
       * A SETUP CONVERSATION LEFT OPEN ON ONE CHECK-IN DOES NOT TAKE WHAT IS SAID ON ANOTHER (4 October 2026).
       * Found running the dumps: a lead left the setup chat open on one check-in, then pasted a whole
       * update from another check-in's page, and the paste was read as the answer to the first one and
       * written there. When the screen names a check-in and the waiting setup turn is about a
       * different one, the waiting turn is let go, and what was said is answered for the check-in named.
       * A long paste is never a yes, so a waiting yes on a different check-in is let go for one as well.
       */
      const pg = (parked?.payload as any)?.groundId as string | undefined;
      if (parked && groundId && pg && pg !== groundId
        && (parked.kind === 'context_turn' || (parked.kind === 'context' && looksLikeADump(message)))) {
        await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } }).catch(() => undefined);
        parked = null;
      }
      /*
       * THE APP'S SETUP CONVERSATION DOES NOT WAIT ON THE PHONE (pilots, 13 October 2026, problem 6). Njeri and Grace each
       * used Add context in the app; two days later their "Hi" on WhatsApp was read as the No to a line waiting there, and
       * they read "I have not added the line. Nothing was changed. What does doing well look like here?". A setup turn left
       * waiting in the app is let go when the next message comes in on WhatsApp, and that message is answered as itself.
       */
      /* Only one left waiting for more than an hour: a yes or a no said on WhatsApp to something asked on WhatsApp comes within minutes. */
      if (parked && askedOnWhatsApp() && THE_APPS_OWN_SETUP_KINDS.has(parked.kind) && Date.now() - new Date(parked.createdAt ?? 0).getTime() > 60 * 60 * 1000) {
        await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } }).catch(() => undefined);
        parked = null;
      }
      if (parked) return this.resolveParked(organizationId, personId, who, parked, message, { groundId, userId, forceAddContext });
    }

    /*
     * THE SIGNED-IN PERSON, ALSO AFTER A SAY-BACK WAS LEFT UNANSWERED (found live, 1 October 2026,
     * item 6). When somebody leaves a say-back waiting and writes something else, it is dropped and
     * their message is answered again through here without `userId`, so leave, hours and spending
     * (which need it) were skipped: "I want leave on 20 October", sent after an unanswered leave
     * say-back, was answered "I cannot answer that one yet". It is read from their own entry.
     */
    if (userId === undefined && who) {
      const mine = await this.prisma.person.findFirst({ where: { id: personId, organizationId }, select: { linkedUserId: true, email: true } }).catch(() => null);
      userId = await theirSignIn(this.prisma, organizationId, mine).catch(() => mine?.linkedUserId ?? null);
    }

    /* Asking one person something is not an answer to the question the setup conversation has open,
       even inside it (request 92, point 11): it is said back as the exact question and confirmed. */
    /* The context and setup lanes are hidden at release (docs/deploy.md, "Hidden at release"). The old
       context chat on the check-in page does all of this, exactly as before. */
    const contextIsHere = await contextIsInAskGroundwork(this.prisma);
    if (!contextIsHere) forceAddContext = false;
    if (forceAddContext && parseAskAPerson(message)) return this.questionsForPeopleByChat(organizationId, who, userId ?? null, groundId, message);
    if (forceAddContext) return this.addContext(organizationId, who, userId ?? null, groundId, message);

    /*
     * DECISION 85: AN ADMIN SETS A SUITE UP BY SAYING SO ("Set up our employee leave process"). Before
     * the leave, hours and spending lanes, because the words hold "leave", "hours" or "spending". Asked
     * one question at a time, said back, and written only on a yes. See a-suite-set-up-by-talking.ts.
     */
    /* What they told us about their own job, or a correction of it (decision 129): theirs alone, said back, and written only on a yes. */
    if (who && userId) {
      const theirs = await this.aboutTheirJob(organizationId, who, userId, message);
      if (theirs) return theirs;
    }

    /* "Spending over KES 20,000 should be approved by Mercy in finance first, and then by me." Set, and said back (26 October 2026). */
    if (who && userId && setsSpendingSteps(message)) {
      const set = await this.setSpendingStepsSaid(organizationId, userId, message);
      if (set) return set;
    }

    if (who) {
      const suite = asksToSetUpASuite(message);
      if (suite) return this.setUpASuite(organizationId, who, userId ?? null, suite, message);
    }

    /*
     * AN APPROVER DECIDING BY SAYING SO (decision 82, item 1), on WhatsApp or here: "approve",
     * "decline Omar's spending". What they are deciding is said back and decided only on a yes,
     * through the same code the boards use, which checks again that they are the one who approves.
     */
    if (who && userId && aDecisionIn(message)) {
      const proposed = await this.proposeADecision(organizationId, who, userId, message);
      if (proposed) return proposed;
    }

    /*
     * AN APPROVER ASKS A QUESTION ABOUT A REQUEST BY SAYING SO ("question for Amina about her leave: who
     * will cover?"), on WhatsApp or here. Said back word for word and sent only on a yes, through the
     * same `askAQuestion` the app's box uses. Only two exact shapes, and only for a request that waits
     * for this reader, so a question to somebody in a check-in is never read as this.
     */
    if (who && userId) {
      const asked = aQuestionAskedAboutARequest(message);
      if (asked) {
        const proposed = await this.proposeAQuestionAboutARequest(organizationId, who, userId, asked);
        if (proposed) return proposed;
      }
    }

    /*
     * LEAVE DATES GO TO THE LEAVE SUITE (week 20), said back and sent only on a yes. Read by rules,
     * before any lane, so a day is never guessed and nothing about it reaches a record.
     */
    if (who && userId && soundsLikeLeave(message)) {
      const dates = readLeaveDates(message);
      if (dates) return this.proposeLeave(organizationId, who, userId, dates, message);
      /* Plainly a request for time off whose days cannot be read without guessing: asked again, never shrugged at. */
      if (plainlyAsksForLeave(message)) return rules('ask_for_leave', text(LEAVE_WHICH_DAYS));
    }

    /*
     * HOURS (week 21) AND SPENDING (week 22), SAID BACK AND SENT ONLY ON A YES. Read by rules, before
     * any lane, so an amount, a project or a day is never guessed and nothing reaches a record.
     */
    if (who && userId && soundsLikeHours(message)) {
      const proposed = await this.proposeHours(organizationId, who, userId, message);
      if (proposed) return proposed;
    }
    if (who && userId && soundsLikeSpending(message)) {
      const proposed = await this.proposeSpending(organizationId, who, userId, message);
      if (proposed) return proposed;
    }
    /*
     * THIS WEEK'S HOURS DRAFTED FROM THE RECORD (decision 85, build step 11): "draft my hours for this
     * week". Said back with what was found and parked; nothing is kept or sent without the person's yes.
     */
    if (who && userId && asksToDraftMyWeek(message)) return this.proposeAWeekDraft(organizationId, who, userId);
    /*
     * WHERE YOUR HOURS STAND (decision 85, build step 11): "how many hours have I logged this week?"
     * answered from the person's own hours against the time sheet rules, for them only. With no rules
     * set, or rules that do not ask this person, it falls through to what answered it before.
     */
    if (who && userId && asksWhereMyHoursStand(message) && this.timeSheets) {
      const standing = await Promise.resolve(this.timeSheets.standing?.({ userId, organizationId })).catch(() => null);
      if (standing?.said) return rules('log_hours', text(`${standing.said} ${HOURS_CAN_BE_TOLD_HERE}`));
    }


    /* "Ask for leave, or to spend money." with nothing said yet: told how, for what is switched on here (request 180 item 1). */
    if (THE_REQUEST_STARTERS.test(message)) {
      const on = await this.prisma.organizationSuite?.findMany?.({ where: { organizationId, suite: { in: ['leave', 'spend'] }, isOn: true }, select: { suite: true } }).catch(() => null);
      /* A read that failed says nothing is switched on, never that both are: the sentence must be true or say less (privacy sweep, 7 October). */
      const suites = new Set<string>((on ?? []).map((r: any) => r.suite));
      return rules('how_to_ask_for_leave_or_spending', text(howToAskForLeaveOrSpending({ leave: suites.has('leave'), spend: suites.has('spend') })));
    }

    /* Where the rules place nothing, a question is answered from the record and the documents below, never sent to a lane's own
       lookup by the model (ask-understands-with-the-model.ts, 1 November 2026). */
    let routedByRules = route(message);
    /* The company by its own name: the router cannot know it, so it is asked here (B-134). */
    if (routedByRules.lane === 'unplaced' && /\bworking\s+on\b/i.test(message)) {
      const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }).catch(() => null);
      if (asksWhatTheCompanyIsWorkingOn(message, org?.name)) routedByRules = { lane: 'company_priorities' };
    }
    const routed = !contextIsHere && THE_CONTEXT_LANES.has(routedByRules.lane) ? { ...routedByRules, lane: 'unplaced' as typeof routedByRules.lane } : routedByRules;

    /*
     * A DOCUMENT'S NUMBERS, SAID BACK BEFORE ANYTHING ELSE IS ROUTED (decision 50, task A).
     *
     * `DocumentsService.whatItHolds` keeps what a document found as `holds.waiting`, with the owner
     * resolved, and writes nothing - see a-document-is-read-not-agreed. The old context chat and the
     * check-in conversation each have their own moment to say it back and ask. Ask Groundwork had
     * neither: a lead who added a sheet through Ask Groundwork's own upload flow, or mentioned having
     * just added one, was never told what it held, so the numbers could never be confirmed and never
     * be written. This is that moment - checked here, before the ordinary lane switch, on either of
     * the two ways somebody says a document just arrived: naming the act in the past tense, or asking
     * to add one on a check-in where an earlier upload is still waiting on a yes.
     */
    if (who && (routed.lane === 'add_a_document' || JUST_ADDED_A_DOCUMENT.test(message))) {
      /*
       * A LINK IS NOT A FILE (B-027). Wairimu wrote "Here is a document https://docs.google.com/... for Sales team, Q4" and was
       * shown the numbers of a different file she had uploaded earlier, and asked whether to record them. A link to a document
       * is not read, so this says so, and never offers another file in its place.
       */
      if (/https?:\/\/\S+/i.test(message) && message.length < 600) return rules('add_a_document', text(A_LINK_IS_NOT_READ));
      /*
       * A DOCUMENT THE LEAD ADDED TO A CHECK-IN THEY RUN IS READ THE WAY A PASTE IS (4 October 2026).
       * The numbers in it were said back, and nothing else in it was: not its dates, decisions,
       * rules, questions for people or what it expects of each person. Same reading, same say-back,
       * same yes as a paste, and the yes is the lead's. Anybody else's own document keeps its numbers.
       */
      if (userId && contextIsHere) {
        const whole = await this.aDocumentToReadWhole(organizationId, personId, userId, groundId);
        if (whole) return this.runContextChat(organizationId, who, userId, whole.groundId, whole.text, undefined, whole.documentId);
      }
      const waiting = await this.waitingDocumentFor(organizationId, personId, groundId);
      if (waiting) return this.proposeDocumentNumbers(organizationId, who, waiting);
      /*
       * NOTHING TO RECORD FROM IT (26 October 2026). Grace added a photo of an M-Pesa message in Ask; the panel said what was in it, then
       * her "I've uploaded it." was answered "I cannot answer that one yet". A file with no numbers to record is simply kept and can be asked about.
       */
      if (JUST_ADDED_A_DOCUMENT.test(message) && (await this.aFileJustAdded(organizationId, personId, groundId))) return rules('add_a_document', text(A_FILE_KEPT));
    }

    /*
     * AN OPEN DRAFT TAKES PLAIN ANSWERS.
     *
     * The objective lane asked "what is being measured?" and then nothing read the reply: a person
     * who answered "revenue from the Lagos hub" was told what the assistant can do instead. A message
     * no lane claims, from somebody with a draft that is still asking, is the answer to what it asked.
     */
    if (who && routed.lane === 'unplaced') {
      const continued = await this.continueTheDraft(organizationId, who, message);
      if (continued) return continued;
    }

    switch (routed.lane) {
      case 'add_a_to_do':
        return this.addAToDo(organizationId, who, routed.subject ?? '', message);
      case 'my_to_dos':
        return this.compose(await this.myToDos(organizationId, who));
      case 'tick_off_a_to_do':
        return this.tickOffAToDo(organizationId, who, routed.subject ?? message);
      case 'move_a_deadline':
        return this.moveADeadline(organizationId, who, userId ?? null, message);
      case 'add_a_commitment':
        return this.addACommitmentByChat(organizationId, who, message);
      case 'think_it_through':
        return this.thinkItThrough(organizationId, personId, userId ?? null, message, routed.subject);
      case 'set_up_a_suite':
        /* Reached only by somebody with no entry of their own here, such as a guest: never an admin of this organisation. */
        return rules('set_up_a_suite', text(await this.whoSetsThisUp(organizationId, asksToSetUpASuite(message) ?? 'leave')));
      case 'what_you_can_see':
        return this.compose(await this.whatICanSee(organizationId));
      case 'what_am_i_on':
        return this.compose(await this.whatAmIOn(organizationId, personId));
      case 'who_is':
        /* "Who's my best performer this month?" asks about the record, not for somebody called "my best performer" (polish round 1). */
        if (userId && /^(?:my|our|the)\b/i.test(routed.subject ?? '')) return this.aQuestionAnsweredFromTheDocuments(organizationId, who, userId, groundId ?? null, message);
        return this.compose(await this.whoIs(organizationId, routed.subject ?? ''));
      case 'what_did_i_commit_to':
        return this.myCommitments(organizationId, personId);
      case 'where_am_i_up_to':
        /*
         * The role name has to survive. Losing it is what turned "what is my role" into a checklist
         * with no answer in it, and the lane is the only thing that knows which word matters.
         */
        return this.whereAmIUpTo(organizationId, who).then((r) => this.compose(r, roleNameIn(r)));
      case 'what_should_we_talk_about':
        return this.whatShouldWeTalkAbout(organizationId, who);
      case 'what_came_of_it':
        return this.whatCameOfIt(organizationId, personId);
      case 'set_an_objective':
        return this.setAnObjective(organizationId, who, message);
      case 'start_a_check_in':
        return this.startACheckIn(organizationId, personId, who, message);
      case 'send_me_that':
        return this.sendMeThat(organizationId, personId, who);
      case 'add_a_document':
        return this.addADocument(organizationId, personId, who ?? '', message, groundId, userId ?? null);
      case 'add_context':
        return this.addContext(organizationId, who, userId ?? null, groundId, message);
      case 'context_line':
        return this.addContextLineByChat(organizationId, who, userId ?? null, groundId, message);
      case 'lead_note':
        return this.addLeadNoteByChat(organizationId, who, userId ?? null, groundId, message);
      case 'questions_for_people':
        return this.questionsForPeopleByChat(organizationId, who, userId ?? null, groundId, message);
      case 'where_am_i_needed':
        return this.compose(await this.whereAmINeeded(organizationId, who, userId ?? null));
      case 'what_is_stuck':
        return this.compose(await this.whatIsStuck(organizationId, who, message, userId ?? null));
      case 'how_is_the_team':
        return this.howIsTheTeam(organizationId, who, userId ?? null, routed.subject);
      case 'who_has_not_checked_in':
        return this.whoHasNotCheckedIn(organizationId, userId ?? null, routed.subject);
      case 'how_am_i_doing':
        return this.compose(await this.howAmIDoing(organizationId, who));
      case 'what_can_you_do':
        return this.whatYouCanAsk(organizationId, personId, userId ?? null);
      case 'your_requests':
        return this.aboutYourRequests(organizationId, userId ?? null, message);
      case 'who_approves':
        return this.whoApprovesYours(organizationId, userId ?? null, message);
      case 'what_is_due':
        return this.whatIsDue(organizationId, who, userId ?? null);
      case 'who_is_away':
        return this.whoIsAway(organizationId, userId ?? null, routed.subject ?? message);
      case 'when_is_my_next_check_in':
        return rules('when_is_my_next_check_in', text(await whenIsMyNextCheckIn(this.prisma, organizationId, userId ?? null)));
      case 'what_my_check_in_is_for':
        return rules('what_my_check_in_is_for', text(await whatMyCheckInIsFor(this.prisma, organizationId, userId ?? null)));
      case 'company_priorities':
        return rules('company_priorities', text(await theCompanysPriorities(this.prisma, this.grounds, await this.readerOfTheCompany(organizationId, userId ?? null))));
      case 'is_the_strategy_moving':
        return rules('is_the_strategy_moving', text(await isTheStrategyMoving(this.prisma, this.grounds, await this.readerOfTheCompany(organizationId, userId ?? null))));
      case 'what_next':
        return this.whatNext(organizationId, who, userId ?? null);
      case 'what_did_they_say':
        return this.whatTheySaid(organizationId, userId ?? null, routed.subject, message);
      case 'what_did_i_say':
        return this.compose(await this.whatDidISay(organizationId, who, routed.subject ?? message, userId ?? null));
      case 'how_we_work':
        /*
         * NOT COMPOSED, AND THIS WAS A REAL MISTAKE FOR ONE LIVE REPLY.
         *
         * The comment on `howWeWork` says a policy quoted is not a policy paraphrased, and then the
         * answer went through the composer, which paraphrased it: "Anything under 100 pounds you
         * can just claim" came back as "Claim anything under £100". Perfectly good English and
         * nobody's actual policy. What is written down goes out as written.
         */
        return this.howWeWork(organizationId, who, routed.subject ?? message);
      default: {
        /*
         * NOTHING TO ANSWER, BUT MAYBE SOMETHING TO NOTICE.
         *
         * A commitment said in passing lands here, because "I'll send it Wednesday" is not a
         * question and no lane owns it. Offering to write it down is a better answer than a list of
         * things it cannot do.
         */
        /* A question nothing else answers is answered from the documents this person may open, privately (pilots, problem 1). */
        /* And a statement the model read as a question or an update reaches the documents too, not only a sentence ending in "?" (fix plan, pattern 2). */
        if (userId && (isAQuestion(message) || understood?.kind === 'question')) return this.aQuestionAnsweredFromTheDocuments(organizationId, who, userId, groundId ?? null, message);
        if (userId && understood?.kind === 'update') {
          const fromTheDocuments = await this.aQuestionAnsweredFromTheDocuments(organizationId, who, userId, groundId ?? null, message).catch(() => null);
          const said = (fromTheDocuments as any)?.blocks?.[0]?.body ?? '';
          if (fromTheDocuments && said && said !== NO_DOCUMENTS_TO_READ && said !== NOT_IN_THE_DOCUMENTS && !/\bnothing\b.*\b(?:document|on file)\b/i.test(said)) return fromTheDocuments;
        }
        if (who) {
          const proposal = await this.maybePropose(organizationId, who, message);
          if (proposal) return proposal;
        }
        /*
         * NOT COMPOSED, DELIBERATELY. There is nothing here to say better: it is a fixed sentence
         * and a list of buttons, and a model rewording it would only make the one reply a person
         * sees most often vary for no reason.
         */
        const { line, options } = whatICanDoWith(message);
        return rules('unplaced', text(line), picker(options));
      }
    }
  }


  /** Their own record, as the correction check reads it: their promises, their lines, and the numbers shown them with how each was counted. */
  private async whatTheRecordHoldsFor(organizationId: string, userId: string): Promise<WhatTheRecordHolds> {
    const db = this.prisma as any;
    const places = ((await Promise.resolve(db.groundParticipant?.findMany?.({ where: { userId, ground: { organizationId } }, select: { id: true, groundId: true, ground: { select: { id: true, label: true, organizationId: true, kindOfWork: true, workStages: true, initiatorId: true } } } })).catch(() => [])) ?? []) as any[];
    const label = new Map<string, string>(places.map((p) => [p.groundId, String(p.ground?.label ?? 'a check-in')]));
    const ids = places.map((p) => p.id);
    const day = (d: any) => (d ? aDaySaidInFull(new Date(d)) : '');
    const promises = await thePromisesOf(db, ids, (g) => label.get(g) ?? 'a check-in').catch(() => [] as any[]);
    const commitmentIds = new Set(((await Promise.resolve(db.groundCommitment?.findMany?.({ where: { id: { in: promises.map((p: any) => p.id) } }, select: { id: true } })).catch(() => [])) ?? []).map((c: any) => c.id));
    const lines = ((await Promise.resolve(db.recordEntry?.findMany?.({
      where: { participantId: { in: ids }, disputedAt: null },
      select: { id: true, text: true, createdAt: true, anchoredDocumentId: true, participant: { select: { groundId: true } } },
      orderBy: { createdAt: 'desc' }, take: 40,
    })).catch(() => [])) ?? []) as any[];
    const counted = thePromisesCounted(promises as any[]);
    const numbers: ANumberShownThem[] = [];
    if (counted.kept + counted.notDone) numbers.push({ name: 'Promises kept', says: `You kept ${counted.kept} of ${counted.kept + counted.notDone} promises.`, howItIsCounted: 'every promise you made in your check-ins that is settled, done or not done, with a to-do you wrote and the same promise said in a check-in counted once.' });
    /* Their check-ins, done and specific, as My work counts them (the two-week check: Peter's "4 out of 14" had nothing to be checked against). */
    for (const p of places) {
      const rows = ((await Promise.resolve(db.checkIn?.findMany?.({ where: { participantId: p.id, isSetup: false }, select: { status: true, specificityLevel: true, availableFrom: true } })).catch(() => [])) ?? []) as any[];
      const due = rows.filter((c) => !c.availableFrom || new Date(c.availableFrom) <= new Date());
      const done = due.filter((c) => c.status === 'COMPLETED');
      const specific = done.filter((c) => c.specificityLevel === 'specific');
      if (due.length) numbers.push({ name: `Check-ins in ${label.get(p.groundId)}`, says: `${done.length} of ${due.length} check-ins done, ${specific.length} of the ${done.length} done were specific.`, howItIsCounted: 'every session of this check-in that has opened for you, done where you finished it, and specific where you named the item, what changed and the day.' });
    }
    /*
     * AND, FOR A CHECK-IN THEY RUN, WHO HAS CHECKED IN, FROM THE ONE COUNT (round 6, 1 November 2026). The mobile cinema lead said "You
     * told me they have checked in" about Aisha and David, and this record held only his own check-ins, so he was answered about his own.
     * The count the board and the check-in's page say, by name, is part of what he was shown, so it is here to be checked against.
     */
    for (const p of places) {
      if (p.ground?.initiatorId !== userId) continue;
      const stood = await theOpenSessionOfACheckIn(db, p.groundId, userId).catch(() => null);
      if (stood?.says) numbers.push({ name: `Who has checked in to ${label.get(p.groundId)}`, says: stood.says, howItIsCounted: 'the session the board counts: everybody on the check-in who has joined, who has checked in, who has started and not finished, and who has not started.' });
    }
    for (const p of places) {
      const aims = ((await Promise.resolve(db.groundObjective?.findMany?.({ where: { groundId: p.groundId, ownerParticipantId: p.id }, select: { id: true, name: true, target: true, count: true, ownerParticipantId: true } })).catch(() => [])) ?? []) as any[];
      for (const a of await withTheirCountNow(db, p.ground, aims).catch(() => aims)) {
        if (typeof a.target !== 'number') continue;
        numbers.push({ name: String(a.name), says: `${a.count ?? 0} of ${a.target}.`, howItIsCounted: a.fromTheDeals ? `the deals on the board in ${label.get(p.groundId)}: ${a.fromTheDeals.says}` : `what was said in ${label.get(p.groundId)}, read when the last session closed.` });
      }
    }
    const me = await Promise.resolve(db.user?.findUnique?.({ where: { id: userId }, select: { firstName: true } })).catch(() => null);
    const waitRows = ((await Promise.resolve(db.groundDependency?.findMany?.({
      where: { status: { in: ['BLOCKING', 'WAITING'] }, OR: [{ fromParticipantId: { in: ids } }, { onParticipantId: { in: ids } }] },
      select: { id: true, what: true, fromParticipantId: true, onParticipantId: true, createdAt: true, groundId: true },
      orderBy: { createdAt: 'desc' }, take: 30,
    })).catch(() => [])) ?? []) as any[];
    const waits = waitRows.map((w) => ({ id: w.id, says: `${ids.includes(w.onParticipantId) ? 'Somebody is waiting on you' : 'You are waiting on somebody'} for ${String(w.what ?? '').slice(0, 200)} (in ${label.get(w.groundId) ?? 'a check-in'})`, since: day(w.createdAt) }));
    return {
      waits,
      firstName: String(me?.firstName ?? 'They'),
      promises: (promises as any[]).slice(-40).map((p) => ({ id: p.id, table: commitmentIds.has(p.id) ? 'commitment' : 'todo', text: String(p.raw ?? ''), status: p.status, checkIn: label.get(p.groundId) ?? 'a check-in', madeOn: day(p.createdAt) })),
      lines: lines.map((l) => ({ id: l.id, text: cleanText(String(l.text ?? '')).slice(0, 300), checkIn: label.get(l.participant?.groundId) ?? 'a check-in', on: day(l.createdAt), proof: !!l.anchoredDocumentId })),
      numbers,
      documents: [],
    };
  }

  private async closeTheWaitsACorrectionEnds(organizationId: string, userId: string, message: string, checked: string): Promise<void> {
    const db = this.prisma as any;
    const place = await Promise.resolve(db.groundParticipant?.findFirst?.({ where: { userId, ground: { organizationId } }, select: { groundId: true, user: { select: { firstName: true } } } })).catch(() => null);
    if (!place?.groundId) return;
    await clearTheWaitsTheRecordEnds(db, this.engine as any, this.prompts as any, place.groundId, [{
      id: 'correction', who: String(place.user?.firstName ?? 'They'), kind: 'correction', where: 'a correction checked against the record',
      on: new Date(), text: `${String(message).slice(0, 600)} (checked against the record: ${String(checked).slice(0, 400)})`, byUserId: userId,
    }]);
  }

  /** A backed correction changes the record itself, so every page reads the new thing. Only an id the check was handed, in only two ways. */
  private async putTheCorrectionOnRecord(record: WhatTheRecordHolds, checked: TheCorrectionChecked): Promise<void> {
    if (checked.verdict !== 'backed') return;
    const db = this.prisma as any;
    const now = new Date();
    if (checked.promise) {
      const p = record.promises.find((x) => x.id === checked.promise!.id);
      if (p?.table === 'commitment') await db.groundCommitment.update({ where: { id: p.id }, data: { status: checked.promise.nowIs, settledBy: 'SAID', settledAt: now } });
      else if (p && checked.promise.nowIs === 'DONE') await db.personObjective.update({ where: { id: p.id }, data: { status: 'MET', statusChangedAt: now } });
    }
    if (checked.lineOff) await db.recordEntry.update({ where: { id: checked.lineOff }, data: { disputedAt: now } });
    /* A wait the record shows is over is cleared, so no page says somebody is still waiting (two-week check, Njeri and FN-007). */
    if (checked.waitOver) await db.groundDependency.update({ where: { id: checked.waitOver }, data: { status: 'CLEARED', clearedAt: now } });
  }

  /**
   * "HELP ME THINK IT THROUGH" (week 19). See think-it-through.ts. Writes nothing, parks nothing and
   * decides nothing: the lead is offered options and then a plain question. What the model is given is
   * only what this reader may already read (their own objectives and commitments and, for a lead or an
   * admin, what the check-ins they may read serve to them), and every number, name and date in what it
   * returns is checked against that before anything is shown.
   */
  private async thinkItThrough(organizationId: string, personId: string, userId: string | null, message: string, captured: string | undefined): Promise<Reply> {
    const lane = 'think_it_through';
    const question = whatToThinkAbout(captured, message);
    if (!question) return rules(lane, text(WHAT_TO_THINK_ABOUT));

    const lines: string[] = [];
    const truth: any = await this.truth.forPerson(organizationId, personId).catch(() => null);
    for (const o of truth?.objectives?.value ?? []) {
      const bits = [`Your target "${o.title}"`];
      if (o.target) bits.push(`is ${o.target}`);
      if (o.dueDate) bits.push(`and is due ${whenItWas(new Date(o.dueDate), 'dayAndMonthLong')}`);
      lines.push(bits.join(' ') + (o.justification ? `. The reason written down is that ${String(o.justification).trim().replace(/[.]+$/, '')}.` : '.'));
    }
    for (const c of truth?.commitments?.value ?? []) {
      if (c.state && c.state !== 'OPEN') continue;
      lines.push(`You have committed to "${c.text}"${c.dueSaid ? `, which you said is due ${c.dueSaid}` : ''}.`);
    }

    /* A lead or an admin also reads what the check-ins they may read serve to them, by the same read as "what did Femi say". A participant thinks through their own work only. */
    const membership = userId
      ? await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch(() => null)
      : null;
    const role = membership?.role ?? null;
    if (userId && this.reports && (role === 'LEAD' || role === 'ADMIN')) {
      const asker = { userId, organizationId, role };
      try {
        for (const g of (await checkInsTheyMayRead(await this.theCheckInsItMayRead(organizationId), asker)).slice(0, 3)) {
          const [round] = await latestRounds(this.prisma as any, g.id);
          if (!round) continue;
          let served: any;
          try { served = await this.reports.sessionReport(g.id, round.sessionNumber, userId, organizationId); } catch { continue; }
          for (const row of (Array.isArray(served?.whatEachPersonSaid) ? served.whatEachPersonSaid : []).slice(0, 6)) {
            const said = (Array.isArray(row?.lines) ? row.lines : []).filter((l: unknown) => typeof l === 'string' && l.trim()).slice(0, 3);
            if (!said.length || typeof row?.who !== 'string') continue;
            lines.push(`In the check-in ${g.label}, ${row.isYou ? 'you' : row.who} said ${said.map((l: string) => `"${l.trim()}"`).join(' and ')}.`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Think it through could not read the check-ins: ${err?.message}`);
      }
    }

    const version = await this.prompts?.getActive(THINK_IT_THROUGH_PROMPT_KEY).catch(() => null);
    let result: any = null;
    try {
      result = await this.engine.extract(version?.content ?? THINK_IT_THROUGH_PROMPT, [{ role: 'user', content: thePromptFor(question, { lines }) }], THINK_IT_THROUGH_SCHEMA as any);
    } catch (err: any) {
      this.logger.warn(`Think it through unavailable: ${err?.message}`);
    }
    if (!result) return rules(lane, text(COULD_NOT_LAY_OUT));

    const options = theOptionsThatStay(result, `${message}\n${question}\n${lines.join('\n')}`);
    if (!options) return rules(lane, text(NOT_ENOUGH_TO_GO_ON));
    const named = (captured ?? '').trim().replace(/^(?:for|on|about|with|through)\s+/i, '') || null;
    return { blocks: [text(theOptionsSaid(named, options, lines.length === 0))], composedBy: 'model', lane, promptVersionId: version?.id ?? null };
  }

  /**
   * THE ANSWER IS ALREADY CORRECT BEFORE THIS RUNS. This only changes how it sounds.
   *
   * One model call, and a failure of any kind - off, unreachable, slow, or a reply that fails the
   * checks - ships the draft. The person gets the true answer either way; only the wording and the
   * `composedBy` stamp differ, and the stamp is why that is honest rather than hidden.
   */
  private async compose(reply: Reply, mustKeep: string[] = []): Promise<Reply> {
    /*
     * NEVER THE "I CANNOT ANSWER THAT" SENTENCE (release check, 7 October 2026). Lanes such as "who is" fall back to it, and the
     * composer turned 'I cannot answer that one yet. Here is what I can do with "behind on Sales team, Q4".' into "You are behind on
     * the Sales team's Q4 work." for the lead, a member, somebody held for a seat and a lead the board refuses: a verdict about the
     * reader that nothing on record says. It passed every check, because every word was in the draft. The default lane already leaves
     * this sentence alone for the same reason.
     */
    if (reply.lane === 'unplaced') return reply;
    const first = reply.blocks[0];
    if (!first || first.type !== 'text') return reply;
    const draft = first.body;

    try {
      const composed = await this.engine.respond(STYLE, [{ role: 'user', content: composePrompt(draft) }]);
      if (!safeToUse(draft, composed, mustKeep)) {
        this.logger.warn(`Composition refused for lane ${reply.lane}; shipping the draft.`);
        return reply;
      }
      return {
        ...reply,
        blocks: [text(composed.trim()), ...reply.blocks.slice(1)],
        composedBy: 'model',
        styleVersion: STYLE_VERSION,
      };
    } catch (err: any) {
      /* An outage must not cost somebody their answer. */
      this.logger.warn(`Composition unavailable for lane ${reply.lane}: ${err?.message}`);
      return reply;
    }
  }

  /**
   * WHAT THIS ROLE IS, AND WHAT IS STILL OUTSTANDING.
   *
   * §11.1 asks for exactly this and says why: the chat answers from live status. Somebody in their
   * first fortnight asking "what am I meant to be doing" is the person least able to go and find an
   * admin console, and most likely to conclude the answer is nowhere.
   *
   * It says what is LEFT rather than how far through they are. A proportion is a progress bar about
   * a person, and there is no version of "you are 40% onboarded" that helps somebody who wants to
   * know which thing to do next.
   */
  private async whereAmIUpTo(organizationId: string, who: string | null): Promise<Reply> {
    if (!who) return rules('where_am_i_up_to', text('I cannot look that up without knowing who you are.'));

    const status = await this.onboarding.statusFor(organizationId, who);
    if (!status.roleName) {
      return rules('where_am_i_up_to', text(
        'No role is recorded for you here, so there is nothing set up for you to work through.',
      ));
    }
    if (!status.gates.length) {
      return rules('where_am_i_up_to', text(
        `You are down as ${status.roleName}. Nothing has been set up as a starting checklist for that role, `
        + 'so there is nothing outstanding.',
      ));
    }
    /*
     * THE ROLE IS NAMED AS ITS OWN SENTENCE, NOT ONLY IN A LIST HEADER.
     *
     * §11.1 asks the chat to answer what this role IS as well as what is left, and driving it showed
     * why that is two things. `sayWhatIsLeft` carried the role only in "Still to do for Engineer:",
     * and the composer rewrote that header to "Your next steps:" - correct English, and it deleted
     * the answer to the question actually asked. `safeToUse` refuses a proper noun the model ADDS;
     * it says nothing about one it drops.
     *
     * A standalone sentence is harder to lose than a header, and if it is lost the check-in is one
     * sentence poorer rather than unanswered.
     */
    return rules('where_am_i_up_to', text(
      `You are down as ${status.roleName}.\n\n${status.says ?? ''}`,
    ));
  }

  /**
   * WHAT IS WAITING, ACROSS EVERY GROUND, WITH HOW LONG.
   *
   * The handoff record has existed for a long time and the board reads it well - but only ever one
   * ground at a time, which is the boundary the question does not respect. Somebody waiting three
   * weeks on the same person appears as a mild note on three separate boards and as nothing anywhere.
   *
   * Two answers come out of the same read, and which one somebody gets depends on the question they
   * asked. "What am I waiting on" is theirs to chase. "Who is waiting on me" is the one that usually
   * lands as news, because the person holding things up is normally the last to know.
   */
  /**
   * WHERE A MANAGER IS NEEDED, ASKED IN THE PLACE THEY ALREADY ASK THINGS.
   *
   * This is the lane rather than a screen because a screen would be a fifth place to look for
   * somebody who already has too many, and because what it produces is four short lists that mean
   * nothing without the sentences around them - which is what a conversation is good at and a panel
   * is not.
   *
   * IT SAYS WHAT IT IS NOT, EVERY TIME. A manager reading a few names under a heading supplies their
   * own meaning within about a second, and the meaning they supply is "my problem people". That is
   * the opposite of what most of this list is: the largest bucket is usually the company owing
   * somebody something.
   */
  private async whereAmINeeded(organizationId: string, who: string | null, userId: string | null = null): Promise<Reply> {
    const person = who
      ? await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { email: true } })
      : null;
    const key = person?.email?.toLowerCase() ?? null;
    if (!key) {
      return rules('where_am_i_needed', text('I cannot match you to a check-in, so I cannot tell you where you are needed.'));
    }

    const readerIsAdmin = !!userId && await this.isAnAdminHere(organizationId, userId);
    const week = await this.board.whoNeedsYouThisWeek(organizationId, key, { ...(await this.theBoardLeavesOut(organizationId)), readerIsAdmin });
    if (!week.buckets.length) return rules('where_am_i_needed', text(NOTHING_FLAGGED));

    /*
     * EACH ONE A FULL SENTENCE, WITH THE PERSON'S NAME AND THE DAY IT BEGAN (3 October 2026). This read
     * "femi@baridi.test: waiting on you for the new price list for Kilimani, 22 days.", an address where
     * the name belongs, pieces joined with a colon, and a count that changed every time it was asked.
     * The sentence is the board's; a list of one is just the sentence.
     */
    const aSentence = (n: any) => n.sentence ?? `${atTheStartOfASentence(n.who)} ${n.kind === 'WAITING_ON_YOU' ? 'is ' : ''}${n.says}.`;
    const parts = week.buckets.map((b) => [
      b.asks,
      ...(b.needs.length === 1 ? [aSentence(b.needs[0])] : b.needs.map((n) => `- ${aSentence(n)}`)),
    ].join('\n'));

    /* Never trimmed away when the list is long. A long list is when it matters most. */
    parts.push(week.whatThisIsNot.join(' '));
    return this.withItsSource(rules('where_am_i_needed', text(parts.join('\n\n'))), WHAT_NEEDS_YOU_SOURCE);
  }

  private async whatIsStuck(organizationId: string, who: string | null, question = '', userId: string | null = null): Promise<Reply> {
    const readerIsAdmin = !!userId && await this.isAnAdminHere(organizationId, userId);
    const { waiting, waitedOn } = await this.board.waitingAcrossTheOrg(organizationId, undefined, await this.theBoardLeavesOut(organizationId));

    const person = who
      ? await this.prisma.person.findFirst({
          where: { organizationId, externalId: who },
          select: { email: true },
        })
      : null;
    const key = person?.email?.toLowerCase() ?? null;

    const mine = key ? waiting.filter((w) => w.fromPersonKey === key) : [];
    const onMe = key ? (waitedOn.find((p) => p.personKey === key)?.waiting ?? []) : [];
    /*
     * `escalatedAt` and `triedSaid` ride on each wait now (3 October 2026) and are left out of this answer
     * on purpose: it says who waits on whom and for what. Whether a wait was taken further is said only to
     * whoever runs that check-in, in "where am I needed" (whoNeedsYouThisWeek).
     */

    if (!mine.length && !onMe.length) {
      return rules('what_is_stuck', text(
        key
          ? 'Nothing is recorded as waiting on you, and you have not named anything you are waiting on.'
          : 'I cannot match you to a check-in, so I cannot tell you what is waiting on you.',
      ));
    }

    /*
     * The day it began is stated rather than turned into a word. "Long overdue" is a judgement the
     * record cannot support - it does not know what a reasonable wait is for any of these - and "since
     * 10 September" is a fact the reader can weigh for themselves. It is the day, not a count of days,
     * so the answer reads the same at any hour (request 117, part 9).
     */
    /*
     * THE DRAFT NAMES THE STATUS, BECAUSE A GAP IS WHAT THE MODEL FILLS.
     *
     * The first version left severity out and the composer supplied it - a WAITING handoff came back
     * as "has been blocked for 2 days". That distinction is load-bearing here: the quick read counts
     * only BLOCKING, and the decisions list promotes only BLOCKING, labelled as something nobody can
     * move past. Instructing the composer not to embellish would not have helped, and cutting it off
     * from the model would have traded a better sentence for a bug left in place. Stating the status
     * leaves nothing to invent.
     *
     * EACH ONE A FULL SENTENCE, WITH A NAME (3 October 2026). This opened "Waiting on you:" and each
     * line was "- the price list (Sales team, Q3) - waiting, 22 days", with nobody in it. The person
     * waiting is named only where this reader may read their name, else "somebody in <the check-in>",
     * and never by their address (the-person-waiting-by-name.ts).
     */
    const clock = theRecordsClock(waiting.map((w) => w.createdAt as any), new Date());
    const since = (w: (typeof waiting)[number]) => (w.createdAt ? ` since ${theDayItBegan(w.createdAt as any, clock)}` : '');
    const where = (w: (typeof waiting)[number]) => (w.groundLabel?.trim() ? `, in the check-in ${w.groundLabel.trim()}` : '');
    const onYou = (w: (typeof waiting)[number]) => {
      const named = thePersonWaitingAsTheyRead(w, key, { readerIsAdmin });
      const who = atTheStartOfASentence(named);
      /* "Somebody in Sales team, Q3" already says where; it is not said twice. */
      const inIt = named === somebodyIn(w.groundLabel) ? '' : where(w);
      return w.status === DependencyStatus.BLOCKING
        ? `${who} says they cannot go on without ${w.what}, and has been waiting on you for it${since(w)}${inIt}.`
        : `${who} has been waiting on you for ${w.what}${since(w)}${inIt}.`;
    };
    const yours = (w: (typeof waiting)[number]) => (w.status === DependencyStatus.BLOCKING
      ? `You said you cannot go on without ${w.what}, and you have been waiting for it${since(w)}${where(w)}.`
      : `You have been waiting for ${w.what}${since(w)}${where(w)}.`);
    const aList = (lines: string[]) => (lines.length === 1 ? lines[0] : lines.map((l) => `- ${l}`).join('\n'));

    /*
     * ANSWER THE QUESTION THEY ASKED FIRST, EVEN WHEN THE ANSWER IS NOTHING.
     *
     * Driving this found it: asked "what am I waiting on", somebody with nothing of their own but
     * one handoff sitting with them got back a list headed "Waiting on you". Both facts are true and
     * the second is the more useful one, but leading with it silently answers a different question,
     * and the reader has to work out that the swap happened. Saying so costs one line.
     */
    const askedAboutTheirOwn = /waiting on\b/i.test(question) && !/on me\b/i.test(question);

    const parts: string[] = [];
    if (askedAboutTheirOwn && !mine.length && onMe.length) {
      parts.push('You have not named anything you are waiting on. What I do have is the other direction.');
    }
    if (onMe.length) {
      parts.push(
        `${onMe.length > 1 ? 'Other people have said they are waiting on you for these things.\n' : ''}${aList(onMe.map(onYou))}\n\n`
        + 'That is from what other people said about their own work, not from anyone assigning it to you.',
      );
    }
    if (mine.length) {
      parts.push(`${mine.length > 1 ? 'You have said you are waiting for these things.\n' : ''}${aList(mine.map(yours))}`);
    }
    return rules('what_is_stuck', text(parts.join('\n\n')));
  }

  /**
   * "WHO HAS NOT CHECKED IN" (B-134). Private to the lead who asks, about the check-ins they RUN only, counted by the one function the
   * "here is what is new" email and the board use (the people who can answer the round the board calls open, never anybody only managing or
   * not yet let in), so the answer agrees with Today, the board and the mail. A check-in somebody only takes part in is not theirs to be
   * told names about. Stalled, ended, held and waiting check-ins are not asked about.
   */
  private async whoHasNotCheckedIn(organizationId: string, userId: string | null, subject: string | undefined): Promise<Reply> {
    const lane = 'who_has_not_checked_in';
    if (!userId) return rules(lane, text('I cannot look that up without knowing who you are.'));
    const kept = await keptInTheApp(this.prisma as any, organizationId);
    /* An admin reads every board in the organisation, who has answered included (decision 5), except a performance plan, a promotion or a renewal
       they were not given; everybody else is told about the check-ins they run. The one rule says which (who-may-read-this-check-in). */
    const membership = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch(() => null);
    const anAdmin = membership?.role === 'ADMIN';
    const run = (await this.prisma.ground.findMany({
      where: anAdmin
        ? { AND: [groundsAViewerMayList(userId, { role: 'ADMIN', organizationId }, organizationId) as any, { status: { notIn: [...A_GROUND_NO_MESSAGE_IS_ABOUT] } }] }
        : { organizationId, initiatorId: userId, status: { notIn: [...A_GROUND_NO_MESSAGE_IS_ABOUT] } },
      select: { id: true, label: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })).filter((g) => mayBeRead(kept, g.id));
    if (!run.length) {
      return rules(lane, text(anAdmin
        ? 'There is no check-in going in the organisation that you can read, so there is nobody for me to tell you about.'
        : 'You do not run a check-in that is going yet, so there is nobody for me to tell you about. You can ask me what you are waiting on.'));
    }
    const named = (subject ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const chosen = named ? run.filter((g) => String(g.label).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').includes(named)) : run;
    if (!chosen.length) {
      return rules(lane, text(`I cannot find a check-in called ${subject!.trim()} that you ${anAdmin ? 'can read' : 'run'}. The ones you ${anAdmin ? 'can read' : 'run'} include ${run.slice(0, 5).map((g) => `"${g.label}"`).join(', ')}.`));
    }
    const lines: string[] = [];
    for (const g of chosen.slice(0, 5)) {
      const open = await theOpenSessionOfACheckIn(this.prisma, g.id, userId).catch(() => null);
      if (open) lines.push(whereOneStands({ ...open, label: g.label }));
    }
    if (!lines.length) {
      return rules(lane, text(`Nothing is open for anybody to check in on in the check-ins you ${anAdmin ? 'can read' : 'run'} right now.`));
    }
    const more = chosen.length > 5 ? `\n\nThere ${chosen.length - 5 === 1 ? 'is one more check-in' : `are ${chosen.length - 5} more check-ins`} you can read. Ask me about one by its name.` : '';
    return rules(lane, text(`${lines.join('\n')}${more}\n\nThis is counted the way your board counts it, and only you can read it here.`));
  }

  /**
   * "HOW IS THE TEAM DOING" (4 October 2026, the user journeys). Private to the lead who asks, and read from what the
   * board and the latest report of each check-in they RUN already say: the board's own sentence on how it is going and
   * its count of who has answered and what is in the way, read as the lead, so nothing is added to it and nothing is
   * hidden by this lane alone. A check-in somebody only takes part in is not the team they lead. Nothing is rebuilt:
   * the board is read, never opened for writing (decision 7).
   */
  private async howIsTheTeam(organizationId: string, who: string | null, userId: string | null, subject?: string): Promise<Reply> {
    const lane = 'how_is_the_team';
    if (!userId) return rules(lane, text('I cannot look that up without knowing who you are.'));
    const kept = await keptInTheApp(this.prisma as any, organizationId);
    /* An admin reads every board in the organisation (decision 5), except a performance plan, a promotion or a renewal she was not given; a lead is told about the check-ins she runs. */
    const membership = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch(() => null);
    const anAdmin = membership?.role === 'ADMIN';
    let run = (await this.prisma.ground.findMany({
      where: anAdmin
        ? { AND: [groundsAViewerMayList(userId, { role: 'ADMIN', organizationId }, organizationId) as any, { status: { notIn: [...A_GROUND_NO_MESSAGE_IS_ABOUT] } }] }
        : { organizationId, initiatorId: userId },
      select: { id: true, label: true },
      orderBy: { createdAt: 'desc' },
      take: anAdmin ? 40 : 5,
    })).filter((g) => mayBeRead(kept, g.id));
    /* "How is the sales team doing?" is about the check-ins with "sales" in their name, where there are any. */
    const word = (subject ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (word) {
      const named = run.filter((g) => String(g.label).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').includes(word));
      if (named.length) run = named;
    }
    if (!run.length) {
      return rules(lane, text(anAdmin
        ? 'There is no check-in going in the organisation that you can read, so there is no team for me to tell you about.'
        : 'You do not run a check-in yet, so there is no team for me to tell you about. You can ask me how you are doing, or what you are waiting on.'));
    }

    const parts: string[] = [];
    for (const g of run.slice(0, 3)) {
      let board: any;
      try { board = await this.board.get(g.id, userId); } catch { continue; }
      if (!board || board.renders === false) continue;
      const going = board.howItIsGoing ?? {};
      const progress = going.glance?.progress;
      const lines: string[] = [];
      if (typeof going.latestSummary === 'string' && going.latestSummary.trim()) lines.push(going.latestSummary.trim());
      if (progress && progress.ofPeople > 0) lines.push(howManyAnsweredInWords(progress.answeredThisRound ?? 0, progress.ofPeople));
      const way = going.glance?.inTheWay;
      if (way?.count > 0) {
        const oldest = typeof way.oldest === 'string' ? way.oldest.trim().replace(/[.!?]+$/, '') : '';
        lines.push(way.count === 1 ? 'One thing is in the way.' : `${way.count} things are in the way.`);
        if (oldest) lines.push(`The one that has waited longest is "${oldest}"${way.sinceSays ? `, ${way.sinceSays}` : ''}.`);
      }
      if (!lines.length) continue;
      /* Each sentence once: the report's own opening often says "All three people have answered." and so does the count (user journeys, F-14). */
      const said = new Set<string>();
      const once = lines.join(' ').match(/[^.!?]+[.!?]+["”']?\s*/g)?.filter((x) => { const k = x.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); if (!k || said.has(k)) return false; said.add(k); return true; }).join('').trim() ?? lines.join(' ');
      parts.push(`${run.length > 1 ? `This is about ${String(g.label).replace(/[.\s]+$/, '')}. ` : ''}${once}`);
    }
    if (!parts.length) {
      return rules(lane, text('Nobody has answered in the check-ins you run yet, so there is nothing to tell you about the team so far. I will have more once people have finished.'));
    }
    return rules(lane, text(`${parts.join('\n\n')}\n\nThis is what ${anAdmin ? 'the' : 'your'} board${anAdmin ? 's' : ''} and ${anAdmin ? 'the' : 'your'} latest report${anAdmin ? 's' : ''} say, and only you can read it here.`));
  }

  /**
   * THE COACH THAT ALREADY EXISTS, ASKED FROM A DIFFERENT PLACE.
   *
   * There is no second coach here and there must not be. `CoachingState` has been written on every
   * completed check-in for a long time, by a state machine with rules earned the hard way - one step
   * at a time, never a list; a step that goes unmanaged twice changes rather than repeating; and
   * nothing ever accumulates into a judgement. This lane READS that. Building a parallel coach for
   * the panel would give somebody two answers about themselves from one product.
   *
   * The state is per PARTICIPANT, which is per ground. A person is usually in more than one, so the
   * most recent step is the one that is live - an older ground's step is not wrong, it is finished.
   *
   * WHAT THIS DOES NOT DO is answer "how am I doing" with an assessment. The question gets a step,
   * because a step is the only honest answer a machine can give to it, and the alternative is the
   * verdict that coaching-can-never-justify-a-firing.spec.ts exists to prevent.
   */
  private async howAmIDoing(organizationId: string, who: string | null): Promise<Reply> {
    if (!who) return rules('how_am_i_doing', text('I cannot look that up without knowing who you are.'));

    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: who },
      select: { email: true },
    });
    if (!person?.email) {
      return rules('how_am_i_doing', text('I cannot match you to a check-in, so I have nothing to go on yet.'));
    }

    /* Judgements of a person off for the organisation: no coaching step is told (organisation/person-judgements.ts). */
    if (!(await thePersonJudgementsAreOn(this.prisma, organizationId))) {
      return rules('how_am_i_doing', text('Your organisation does not show coaching about people here, so there is no step to tell you. What you said you would do is on your page.'));
    }
    const state = await this.prisma.coachingState.findFirst({
      /* On WhatsApp, never a step from a check-in kept in the app (decision 82, item 7). */
      where: { participant: { email: person.email, ground: { organizationId }, ...this.notInAKeptCheckIn(await keptInTheApp(this.prisma as any, organizationId)) } },
      orderBy: { updatedAt: 'desc' },
      select: { currentStep: true, staircase: true },
    });

    const moves = await this.theConvertingMoves(organizationId, who);

    if (!state?.currentStep) {
      /*
       * No step is a real answer and a common one. The engine only offers one when the record has
       * earned it, and saying "you are doing fine" instead would be inventing an assessment out of
       * an absence - the exact thing this lane must not do.
       */
      return rules('how_am_i_doing', text(
        'There is no step waiting for you. That is not a verdict either way. The coaching in your check-in only offers a step when something specific is worth doing. Right now nothing is.'
        + moves,
      ));
    }

    return rules('how_am_i_doing', text(
      `One thing, from your last check-in: ${state.currentStep}\n\n`
      + 'That is the whole of it. It is meant to be small enough to actually happen this week, and if it is not, saying so in your next check-in changes it rather than repeating it.'
      + moves,
    ));
  }

  /**
   * THE FOUR CONVERTING MOVES, UNDERNEATH THE STEP RATHER THAN INSTEAD OF IT.
   *
   * The check-in coach decides the step; nothing here overrides it. What these add is the context a
   * step cannot carry on its own - what they finished since, how much of the load is actually theirs
   * to move, and what has quietly stopped coming up.
   *
   * They live in the chat because that is where coaching lives in this product. A board of these
   * numbers is a scoreboard about a person however carefully it is worded, and the numbers here are
   * counts precisely so they cannot be ranked between people.
   */
  private async theConvertingMoves(organizationId: string, personExternalId: string): Promise<string> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const commitments = await withoutCommitmentsFromGoalsNotToldYet(this.prisma, await this.prisma.commitment.findMany({
      where: { organizationId, personExternalId, ...notFromAKeptCheckIn(await keptInTheApp(this.prisma as any, organizationId), 'sourceGroundId') },
      select: { id: true, text: true, state: true, statedAt: true, dueAt: true, lastFollowedUpAt: true, sourcePersonObjectiveId: true },
    }));
    if (!commitments.length) return '';

    const load: Load[] = commitments.map((c) => ({
      id: c.id, text: c.text, state: c.state, statedAt: c.statedAt, dueAt: c.dueAt,
      /*
       * `lastFollowedUpAt` is the closest record of "last time this came up", and it is not the same
       * thing - it is when the assistant raised it, not when they mentioned it. Using it means a
       * commitment the assistant has nagged about looks warm. Named here rather than papered over;
       * the honest fix is a mention timestamp, which does not exist yet.
       */
      lastMentionedAt: c.lastFollowedUpAt,
    }));

    const { waiting } = await this.board.waitingAcrossTheOrg(organizationId, undefined, await this.theBoardLeavesOut(organizationId));
    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: personExternalId }, select: { email: true },
    });
    const key = person?.email?.toLowerCase() ?? null;
    const theirs: Waiting[] = key
      ? waiting.filter((w) => w.fromPersonKey === key)
        .map((w) => ({ what: w.what, status: w.status, onPersonKey: w.onPersonKey, waitingDays: w.waitingDays }))
      : [];

    const unblocked = await this.prisma.contribution.aggregate({
      where: { organizationId, personExternalId, kind: ContributionKind.UNBLOCKING },
      _sum: { weight: true },
    });

    const said = sayTheMoves({
      move: theOneMove(load, theirs),
      mirror: theMirror(load, theirs),
      cold: goingCold(load, new Date()),
      wins: bankedWins(load, unblocked._sum.weight ?? 0, since),
    });
    return said ? `\n\n${said}` : '';
  }

  /**
   * ONE THING FIRST, AND WHY (week 17). Read as the person asking and nobody else: their own
   * commitments and to-dos, and what is waiting on them. See what-to-do-next.ts.
   */
  /** Who is asking about the company, with their standing in this organisation, as the Company page asks it. */
  private async readerOfTheCompany(organizationId: string, userId: string | null) {
    const m = userId ? await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch(() => null) : null;
    const u = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }).catch(() => null) : null;
    return { userId, email: u?.email ?? '', organizationId, role: m?.role ?? 'MEMBER' };
  }

  private async whatNext(organizationId: string, who: string | null, userId: string | null = null): Promise<Reply> {
    if (!who) return rules('what_next', text('I cannot see you in your organisation records, so I have nothing to put first.'));
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { email: true, linkedUserId: true } as any }) as any;
    const kept = await keptInTheApp(this.prisma as any, organizationId);
    const [fromTheirSystems, toDos, inCheckIns] = await Promise.all([
      this.prisma.commitment.findMany({ where: { organizationId, personExternalId: who, state: 'OPEN', ...notFromAKeptCheckIn(kept, 'sourceGroundId') }, orderBy: [{ dueAt: 'asc' }, { statedAt: 'asc' }] }).then((rows) => withoutCommitmentsFromGoalsNotToldYet(this.prisma, rows)),
      this.prisma.todo.findMany({ where: { organizationId, personExternalId: who, state: 'OPEN' }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }] }),
      /* The promises in their own check-ins, read as "What did I promise?" reads them (polish round 15, U5). */
      this.theOpenPromisesInTheirCheckIns(organizationId, person?.linkedUserId ?? null, kept),
    ]);
    const sameWords = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const listed = new Set((fromTheirSystems as any[]).map((c) => sameWords(String(c.text ?? ''))));
    const commitments = [
      ...(fromTheirSystems as any[]),
      ...inCheckIns.filter((c) => !listed.has(sameWords(c.text))).map((c) => ({ id: c.id, text: c.text, dueSaid: c.whenSaid, dueAt: null, statedAt: c.createdAt, state: 'OPEN' as const, lastFollowedUpAt: null })),
    ];
    const key = person?.email?.toLowerCase() ?? null;
    const readerIsAdmin = !!userId && await this.isAnAdminHere(organizationId, userId);
    const week = key ? await this.board.whoNeedsYouThisWeek(organizationId, key, { ...(await this.theBoardLeavesOut(organizationId)), readerIsAdmin }) : { buckets: [] as any[] };
    const waitingOnYou = (week.buckets as any[]).filter((b) => b.kind === 'WAITING_ON_YOU').flatMap((b) => b.needs as any[]);
    const reply = theOneToDoFirst({ commitments: commitments as any, toDos: toDos as any, waitingOnYou, now: new Date() });
    return this.compose(reply, whatMustSurviveIn(reply));
  }

  /**
   * THE CHECK-INS ASK GROUNDWORK MAY READ FOR THIS QUESTION (decision 82, item 7). In the app, all of
   * them, as before. On WhatsApp, never one kept in the app: the query never selects it.
   */
  private async theCheckInsItMayRead(organizationId: string): Promise<any> {
    const kept = await keptInTheApp(this.prisma as any, organizationId);
    if (!kept.size) return this.prisma as any;
    const prisma = this.prisma as any;
    return {
      ground: { findMany: (args: any) => prisma.ground.findMany({ ...args, where: { ...(args?.where ?? {}), AND: [...(args?.where?.AND ?? []), notAKeptCheckIn(kept)] } }) },
      checkIn: { findMany: (args: any) => prisma.checkIn.findMany({ ...args, where: { ...(args?.where ?? {}), AND: [...(args?.where?.AND ?? []), { ground: notAKeptCheckIn(kept) }] } }) },
      person: { findMany: (args: any) => prisma.person.findMany(args) },
    };
  }

  /** A participant's `groundId` that is not a check-in kept in the app. Nothing in the app. */
  private notInAKeptCheckIn(kept: Set<string>): { groundId?: { notIn: string[] } | { in: string[] } } {
    const id = notAKeptCheckIn(kept).id;
    return id ? { groundId: id } : {};
  }

  /** The served report, refused for a check-in kept in the app when the question came in on WhatsApp. */
  private async theReportsItMayRead(organizationId: string): Promise<any> {
    const kept = await keptInTheApp(this.prisma as any, organizationId);
    if (!this.reports || !kept.size) return this.reports as any;
    const reports = this.reports;
    return {
      sessionReport: (groundId: string, sessionNumber: number, userId: string, orgId?: string) => (mayBeRead(kept, groundId)
        ? reports.sessionReport(groundId, sessionNumber, userId, orgId)
        : Promise.reject(new Error('This check-in is kept in the Groundwork app.'))),
    };
  }

  /**
   * THE CHECK-INS THE BOARD'S READS LEAVE OUT for this question (decision 82, item 7): none in the
   * app; on WhatsApp, every check-in kept in the app. The board leaves them out in its own query,
   * before it merges alike waits across check-ins, so a kept wait never lends its words to one that
   * is said. Nothing is read and then hidden.
   */
  private async theBoardLeavesOut(organizationId: string): Promise<{ leaveOut: Set<string> }> {
    return { leaveOut: await keptInTheApp(this.prisma as any, organizationId) };
  }

  /**
   * WHAT SOMEBODY ELSE SAID, AS MUCH AS THIS READER MAY ALREADY READ (week 17). See
   * what-they-said-that-you-may-read.ts: nothing about a person is read here, only the report of each
   * check-in as the asker is served it. Their exact lines survive any rewording.
   */
  private async whatTheySaid(organizationId: string, userId: string | null, subject: string | undefined, message: string): Promise<Reply> {
    const membership = userId
      ? await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } })
      : null;
    const reply = await whatSomeoneSaid(
      { db: await this.theCheckInsItMayRead(organizationId), reports: await this.theReportsItMayRead(organizationId) },
      { userId, organizationId, role: membership?.role ?? null },
      subject,
      message,
    );
    const first = reply.blocks[0];
    /*
     * NOTHING TO READ BECAUSE THEY HAVE NOT FINISHED, SAID AS THAT (round 6, 1 November 2026). The mobile cinema lead asked where Aisha's and
     * David's check-ins were and read "I cannot show you that. I have nothing from Aisha and David's check-ins", which sounds like a wall:
     * they had started session 1 and not finished it. For a check-in this lead runs with them on it, the one count says where they are,
     * by name, as the board and the check-in's page say it.
     */
    if (userId && first?.type === 'text' && first.body.startsWith(I_CANNOT_SHOW_YOU_THAT) && subject) {
      const asked = subject.split(/\s*(?:,|\band\b|&)\s*/i).map((n) => (n.trim().split(/\s+/)[0] ?? '').replace(/['’]s$/i, '')).filter((n) => n.length > 1);
      const theirs = await this.prisma.ground.findMany({ where: { organizationId, initiatorId: userId }, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => [] as { id: string }[]);
      for (const g of theirs) {
        const stood = await theOpenSessionOfACheckIn(this.prisma, g.id, userId).catch(() => null);
        if (stood?.says && asked.length && asked.every((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(stood.says!))) {
          return rules('what_did_they_say', text(`There is nothing of theirs to read yet, because they have not finished a check-in. ${stood.says}`));
        }
      }
    }
    const keep = first && first.type === 'text'
      ? first.body.split('\n').filter((l) => l.startsWith('- "')).map((l) => l.slice(2))
      : [];
    /* NOTHING QUOTED, NOTHING REWORDED (B-125). "I have nothing from Amani about pricing approvals in the check-ins you can read" went to the composer and
       came back "You did not mention pricing approvals from Amani in your check-ins": a different claim, about a different person. A refusal, or a
       wall's sentence, goes out as the lane wrote it; only an answer that quotes people is worded, and its quotes are kept. */
    return keep.length ? this.compose(reply, keep) : reply;
  }

  /** The answer, then where it came from, in a sentence and as a block. Used by every lane that reads a record. */
  private withItsSource(reply: Reply, source: SourceBlock): Reply {
    const first = reply.blocks[0];
    if (!first || first.type !== 'text') return reply;
    return { ...reply, blocks: [text(`${first.body}\n\n${source.says}`), ...reply.blocks.slice(1), source] };
  }

  /**
   * WHAT THEY TOLD ME BEFORE - AND ONLY EVER WHAT THEY TOLD ME.
   *
   * THE SCOPE IS THE FEATURE. A recall that could reach another participant's turns would be the
   * product quoting one colleague to another, which is the thing it exists to prevent - so the
   * person is in the where clause, not in a filter applied afterwards, and there is a guard whose
   * only job is to check that.
   *
   * Their own words come back verbatim with a plain "you said". Summarising somebody's own sentence
   * back at them is both worse and riskier than quoting it.
   */
  private async whatDidISay(organizationId: string, who: string | null, topic: string, userId: string | null = null): Promise<Reply> {
    if (!who) return rules('what_did_i_say', text('I cannot look back without knowing who you are.'));
    const q = topic.trim().replace(/[?.!]+$/, '');
    if (q.length < 3) return rules('what_did_i_say', text('About what?'));

    /*
     * STOPWORDS REMOVED, AND FORGETTING THEM MADE THIS ABSURD.
     *
     * The first version filtered on length alone, so "the" was a search word - and since "the" is
     * in almost every sentence anybody types, "did I mention the pricing model" came back with
     * every turn the person had ever written. It looked like a memory and was a table scan with a
     * confident sentence on top.
     */
    const words = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    /* Nothing meaningful left to search on is a real answer, not a reason to match everything. */
    if (!words.length) return rules('what_did_i_say', text('About what, specifically?'));
    const needles = words;

    const hits = await this.prisma.$queryRaw<{ content: string; createdAt: Date; role: string }[]>(
      Prisma.sql`
        SELECT content, created_at AS "createdAt", role
        FROM assistant_turns
        WHERE organization_id = ${organizationId}
          AND person_external_id = ${who}
          AND role = 'person'
          AND (
            content % ${q}
            OR EXISTS (
              SELECT 1 FROM unnest(${needles}::text[]) AS w
              WHERE regexp_replace(lower(content), '[^a-z0-9]', '', 'g') LIKE '%' || w || '%'
            )
          )
        ORDER BY created_at DESC
        LIMIT 4
      `,
    );

    /*
     * THEIR OWN QUESTIONS ARE NOT THINGS THEY TOLD ME.
     *
     * Every message a person types is stored, including "did I mention the vendor comparison" - so
     * asking twice recalled the first asking, which is noise dressed as memory. A turn that is
     * itself a question to the assistant is dropped, and the check is the router: if it routes to a
     * lane, it was a question rather than an account of somebody's work.
     */
    const saidToMe = hits.filter((h) => route(h.content).lane === 'unplaced');
    /*
     * AND WHAT THEY SAID IN THEIR OWN CHECK-INS (user journeys, F-13). "What did I say about the Green Mart proposal?" was answered "You have not
     * mentioned the Green Mart proposal before" with her own check-in holding it, because only what was typed to Ask was searched. Her own words
     * in her own place in each check-in, found through her own sign-in and nobody else's, and never a check-in kept in the app.
     */
    const inCheckIns = await this.whatTheySaidInTheirOwnCheckIns(organizationId, userId, needles);
    const said = [...saidToMe, ...inCheckIns].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4);

    if (!said.length) {
      return rules('what_did_i_say', text(`You have not mentioned ${q} to me before. That may just mean it was said somewhere I cannot see.`));
    }

    const now = new Date();
    const { current, earlier } = splitBySession(said, now);
    const lines: string[] = [];
    const where = (h: any) => (h.label ? `, in "${h.label}"` : '');
    for (const h of current) lines.push(`- Earlier just now${where(h)}: "${h.content}"`);
    for (const h of earlier) lines.push(`- ${howLongAgo(h.createdAt, now)}${where(h)}: "${h.content}"`);
    return rules('what_did_i_say', text(`You have mentioned ${q}:\n${lines.join('\n')}`));
  }

  /** The asker's own words in their own check-ins, matching what they asked about. See whatDidISay. */
  private async whatTheySaidInTheirOwnCheckIns(organizationId: string, userId: string | null, needles: string[]): Promise<{ content: string; createdAt: Date; role: string; label?: string }[]> {
    if (!userId || !needles.length) return [];
    try {
      const kept = await keptInTheApp(this.prisma as any, organizationId);
      const places: { id: string; ground?: { label?: string } }[] = await (this.prisma as any).groundParticipant?.findMany?.({
        where: { userId, ground: { organizationId, ...notAKeptCheckIn(kept) } },
        select: { id: true, ground: { select: { label: true } } },
      })?.catch?.(() => []) ?? [];
      if (!places.length || typeof (this.prisma as any).$queryRaw !== 'function') return [];
      const labelOf = new Map(places.map((p) => [p.id, p.ground?.label ?? undefined]));
      /* Most of what they asked about has to be in the sentence, so one common word is not a match. */
      const need = Math.max(1, Math.ceil(needles.length * 0.6));
      const rows = await (this.prisma as any).$queryRaw(
        Prisma.sql`
          SELECT t.content AS "content", t.created_at AS "createdAt", c.participant_id AS "participantId"
          FROM conversation_turns t
          JOIN check_ins c ON c.id = t.check_in_id
          WHERE c.participant_id = ANY(${places.map((p) => p.id)}::text[])
            AND t.role = 'PERSON'
            AND (
              SELECT count(*) FROM unnest(${needles}::text[]) AS w
              WHERE regexp_replace(lower(t.content), '[^a-z0-9]', '', 'g') LIKE '%' || w || '%'
            ) >= ${need}
          ORDER BY t.created_at DESC
          LIMIT 4
        `,
      ) as { content: string; createdAt: Date; participantId: string }[];
      /* Nothing here is a question to Ask: these are answers in a check-in, so the router's test of "was this a question" is not applied. */
      return (rows ?? [])
        .map((r) => ({ content: r.content, createdAt: new Date(r.createdAt), role: 'person', label: labelOf.get(r.participantId) }));
    } catch {
      return [];
    }
  }

  /**
   * "HOW WE WORK HERE", ANSWERED FROM WHAT THE ORGANISATION HAS ACTUALLY DECIDED.
   *
   * Not a hand-written FAQ that drifts, and not the model's general knowledge about how companies
   * usually do expenses. Their own cards or nothing - and nothing is a real answer here, because
   * the alternative is an assistant confidently describing a policy this company does not have.
   *
   * The card body is quoted rather than summarised. A policy paraphrased is a policy changed, and
   * somebody acting on the paraphrase has been told something nobody wrote.
   */
  private async howWeWork(organizationId: string, who: string | null, topic: string): Promise<Reply> {
    if (!who) return rules('how_we_work', text('I cannot look that up without knowing who you are.'));

    /* The topic, not the sentence: "how do I swap" scores against nothing and drags the rest down. */
    const { cards, truncated } = await this.knowledge.retrieve(organizationId, who, topic);
    /*
     * WHAT A LEAD CONFIRMED IS TRUE OF THE WHOLE COMPANY (week 20), for the people who may read it: an
     * admin, a lead, and anybody who runs a check-in. It is said as what the organisation has kept,
     * never as anybody's account and never with who said it.
     */
    const kept = await this.keptThatMatches(organizationId, who, topic);
    if (!cards.length && !kept.length) {
      return rules('how_we_work', text('Your organisation has not written anything down about that here. If it should have, whoever set Groundwork up can add it.'));
    }

    const parts = cards.map((c) => `${c.title}\n${c.body}`);
    if (kept.length) {
      parts.push(`${kept.length === 1 ? 'Your organisation has kept this' : 'Your organisation has kept these'} from a setup conversation.\n${kept.map((k) => `"${k.text.replace(/[.!?]+$/, '')}".`).join('\n')}`);
    }
    if (truncated) {
      /* Said rather than hidden: somebody acting on a partial policy should know it was partial. */
      parts.push('There is more written down about this than I have shown here.');
    }
    return rules('how_we_work', text(parts.join('\n\n')));
  }

  /** What the organisation has kept that touches a question, for the people who may read it. */
  private async keptThatMatches(organizationId: string, who: string, topic: string) {
    const me = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } }).catch(() => null);
    if (!me?.linkedUserId) return [];
    const m = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: me.linkedUserId, organizationId } },
      select: { role: true },
    }).catch(() => null);
    if (!(await mayReadWhatIsKept(this.prisma, { userId: me.linkedUserId, organizationId, role: m?.role }).catch(() => false))) return [];
    return keptThatTouches(await keptForTheOrganisation(this.prisma, organizationId).catch(() => []), topic);
  }

  /**
   * PROPOSE. Never on the first turn, and never while another proposal is parked.
   *
   * The first-turn rule is not politeness. Offering to write something down within a second of a
   * stranger opening a panel, before it has answered a single question, is the behaviour that makes
   * somebody decide this thing is going to be a problem.
   */
  private async maybePropose(organizationId: string, who: string, message: string): Promise<Reply | null> {
    const caught = catchCommitment(message);
    if (!caught) return null;

    const turns = await this.prisma.assistantTurn.count({
      where: { organizationId, personExternalId: who, role: 'person' },
    });
    if (turns < 1) return null;

    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'commitment',
        summary: proposalSummary(caught),
        payload: caught as any,
      },
    });
    return {
      lane: 'propose_commitment',
      composedBy: 'rules',
      blocks: [
        text(proposal.summary),
        { type: 'proposal', proposalId: proposal.id, summary: proposal.summary },
      ],
    };
  }

  /**
   * STARTING A CHECK-IN BY SAYING SO.
   *
   * The last thing about a check-in that was a button and not a sentence.
   *
   * IT DOES NOT START ANYTHING ITSELF. It works out which of four situations somebody is in and
   * offers the one act that moves them, as a `next_step` the panel performs — same reason the accept
   * line stopped carrying a path: this code cannot know which application it is being read inside,
   * and a customer whose own system has a place for this should be able to use it.
   *
   * Matched by the ADDRESS the invitation went to as well as by the account, because a participant
   * is linked to an account only when somebody accepts. Without that, a person with a session
   * sitting in front of them is told there is nothing.
   */
  /**
   * A DOCUMENT OF THEIRS THAT STILL HAS NUMBERS WAITING ON A YES.
   *
   * Only ever what THIS PERSON'S OWN participant record put on the document: `DocumentsService.
   * whatItHolds` already resolved who may hold which number at read time (their own, and the
   * group's; anybody's only when the uploader is the lead), so nothing about who may set whose
   * number is decided again here - it only reads what is already on `holds.waiting`. Scoped to the
   * chosen check-in when one was chosen (see ask.service.ts `checkTheCheckIn`), and to every check-in
   * this person is on otherwise, most recently read first.
   */
  /** Whether this person added a file of their own in the last fifteen minutes. */
  private async aFileJustAdded(organizationId: string, personId: string, groundId?: string): Promise<boolean> {
    const person = await this.prisma.person.findFirst({ where: { id: personId, organizationId }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) return false;
    const participants = await this.prisma.groundParticipant.findMany({
      where: { userId: person.linkedUserId, ...(groundId ? { groundId } : {}) },
      select: { id: true },
    });
    if (!participants.length) return false;
    const [newest] = await this.prisma.groundDocument.findMany({
      where: { participantId: { in: participants.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { createdAt: true },
    });
    const at = newest?.createdAt ? new Date(newest.createdAt).getTime() : NaN;
    return Number.isFinite(at) && Date.now() - at < 15 * 60_000;
  }

  private async waitingDocumentFor(
    organizationId: string,
    personId: string,
    groundId?: string,
  ): Promise<{ documentId: string; groundId: string; fileName: string; holds: WhatLanded; visibility: string | null; participantId: string | null } | null> {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { linkedUserId: true },
    });
    if (!person?.linkedUserId) return null;
    const participants = await this.prisma.groundParticipant.findMany({
      where: { userId: person.linkedUserId, ...(groundId ? { groundId } : {}) },
      select: { id: true, groundId: true },
    });
    if (!participants.length) return null;

    /*
     * ONLY THE DOCUMENT JUST ADDED (26 October 2026). Grace added a photo of an M-Pesa message in Ask and was asked to record the numbers of
     * a PDF she had added earlier: the newest documents with numbers waiting were walked, and the photo, still being read, was skipped.
     * What was just added is the one Ask talks about, or none.
     */
    const docs = await this.prisma.groundDocument.findMany({
      where: { participantId: { in: participants.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { id: true, fileName: true, holds: true, groundId: true, visibility: true, participantId: true },
    });
    for (const d of docs) {
      const holds = (d.holds ?? {}) as any;
      const waiting: { name: string; target: number; ownerParticipantId: string | null }[] = Array.isArray(holds.waiting) ? holds.waiting : [];
      if (holds.takenAt || !waiting.length) continue;
      return { documentId: d.id, groundId: d.groundId, fileName: d.fileName, holds, visibility: (d as any).visibility ?? null, participantId: (d as any).participantId ?? null };
    }
    return null;
  }

  /**
   * THE LEAD'S LATEST DOCUMENT ON A CHECK-IN THEY RUN, NOT YET TAKEN, WITH ENOUGH IN IT TO BE A DUMP.
   * Only a document the lead put there themselves, and only on a check-in they may set up
   * (`mayOpenSetupChatFor`, the same rule as the setup conversation). The words are cleaned of bank
   * details before anything reads them, as a paste is.
   */
  private async aDocumentToReadWhole(
    organizationId: string,
    personId: string,
    userId: string,
    groundId?: string,
  ): Promise<{ documentId: string; groundId: string; text: string } | null> {
    const mine = await this.prisma.groundParticipant.findMany({
      where: { userId, ...(groundId ? { groundId } : {}) },
      select: { id: true, groundId: true },
    });
    if (!mine.length) return null;
    const docs = await this.prisma.groundDocument.findMany({
      where: { participantId: { in: mine.map((m) => m.id) } },
      orderBy: { createdAt: 'desc' },
      /* Only the one just added, never an older one in its place (see waitingDocumentFor). */
      take: 1,
      select: { id: true, groundId: true, content: true, holds: true },
    });
    for (const d of docs) {
      const holds = (d.holds ?? {}) as any;
      if (holds.takenAt || holds.wholeAt) continue;
      const text = (withoutBankDetails(d.content ?? '') as string).trim();
      if (!looksLikeADump(text) || text.length > 40_000) continue;
      if (!(await this.grounds.mayOpenSetupChatFor(d.groundId, userId, organizationId).catch(() => false))) continue;
      return { documentId: d.id, groundId: d.groundId, text };
    }
    return null;
  }

  /** The numbers on a document were taken as part of a whole read, so they are not offered again. */
  private async markADocumentTaken(documentId: string): Promise<void> {
    const doc = await this.prisma.groundDocument.findUnique({ where: { id: documentId }, select: { holds: true } }).catch(() => null);
    if (!doc) return;
    const stamp = new Date().toISOString();
    await this.prisma.groundDocument.update({ where: { id: documentId }, data: { holds: { ...((doc.holds ?? {}) as any), takenAt: stamp, wholeAt: stamp } as any } }).catch(() => undefined);
  }

  /**
   * SAYING BACK WHAT A DOCUMENT HOLDS, THE SAME WORDS THE CONTEXT PAGE USES, AND ASKING.
   *
   * `theContextWeHave` is the one place these sentences are written (see what-a-document-holds.ts):
   * every number already says whose it is, by name, or that it is for everybody. Nothing is written
   * until a yes reaches `resolveParkedDocumentNumbers`.
   */
  private async proposeDocumentNumbers(
    organizationId: string,
    who: string,
    waiting: { documentId: string; groundId: string; fileName: string; holds: WhatLanded; visibility?: string | null; participantId?: string | null },
  ): Promise<Reply> {
    /* The yes writes a note everyone reads (writeADocumentsNumbers, addNote), so it is said here first. */
    /* The reader is "you": a number of their own reads "Your target for ...", never their own name. */
    const me = await this.prisma.person.findFirst({ where: { externalId: who, organizationId }, select: { displayName: true } }).catch(() => null);
    const said = theContextWeHave(waiting.holds, {
      willNoteIt: { visibility: waiting.visibility },
      reader: { participantId: waiting.participantId ?? null, name: me?.displayName ?? null },
    });
    /* Cannot happen in practice - `waitingDocumentFor` only returns a document whose `waiting` array
       is non-empty, and that is exactly what makes `theContextWeHave` return something. Guarded
       anyway rather than trusting that link never breaks. */
    if (!said) return rules('add_a_document', text('I could not find anything to say about that document.'));
    const summary = `${said}\n\nShall I record these numbers on this check-in?`;

    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'document_numbers',
        state: 'PARKED',
        summary,
        payload: { documentId: waiting.documentId, groundId: waiting.groundId, fileName: waiting.fileName } as never,
      },
    });
    return {
      lane: 'add_a_document',
      composedBy: 'rules',
      blocks: [text(summary), { type: 'proposal', proposalId: proposal.id, summary }],
    };
  }

  /** The organisation's own name, for the sentences about its handbook. */
  private async organisationNameOf(organizationId: string): Promise<string | null> {
    return (await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }).catch(() => null))?.name ?? null;
  }

  /** The file picker, for a document for the whole organisation. Only ever offered to an admin of it. */
  private async offerADocumentForTheOrganisation(organizationId: string): Promise<Reply> {
    return rules(
      'add_a_document',
      text(OFFER_FOR_THE_ORGANISATION(await this.organisationNameOf(organizationId))),
      {
        type: 'next_step',
        label: 'Choose a file',
        href: '/company',
        kind: 'upload_a_document',
        id: FOR_THE_ORGANISATION,
        context: { forTheOrganisation: 'yes' },
      },
    );
  }

  /**
   * THE FILE AN ADMIN CHOSE FOR THE WHOLE ORGANISATION, READ AND SAID BACK (fix list, item 3). Nothing is added here:
   * the words wait on a yes, on the asker's own waiting row, and are kept in the handbook only by that yes. The caller
   * (ask.service.ts) has already checked the asker is an admin of the organisation; the yes checks again.
   */
  async sayBackADocumentForTheOrganisation(organizationId: string, personId: string, fileName: string, title: string, words: string): Promise<Reply> {
    const me = await this.prisma.person.findFirst({ where: { id: personId, organizationId }, select: { externalId: true } });
    const who = me?.externalId && !isAGuestsKey(me.externalId) ? me.externalId : null;
    const name = await this.organisationNameOf(organizationId);
    const said = `Here is ${fileName}.`;
    const clean = (withoutBankDetails(words ?? '') as string).trim();
    let reply: Reply;
    if (!who) {
      reply = rules('add_a_document', text('I cannot see you in your organisation records, so I cannot add it.'));
    } else if (!clean) {
      reply = rules('add_a_document', text(NO_WORDS_IN_IT(title)));
    } else {
      /* Only one waits at a time: an older one still waiting is let go, with its words. */
      await this.prisma.assistantProposal.updateMany({
        where: { organizationId, personExternalId: who, kind: ORGANISATION_DOCUMENT_KIND, state: 'PARKED' },
        data: { state: 'DROPPED', resolvedAt: new Date(), payload: {} as never },
      });
      const inIt = await this.engine.respond(WHAT_IS_IN_IT_PROMPT, [{ role: 'user', content: clean.slice(0, 6000) }]).then((r) => forHumans(r)).catch(() => '');
      const { body, summary } = whatTheDocumentSays(title, clean, name, inIt);
      const proposal = await this.prisma.assistantProposal.create({
        data: { organizationId, personExternalId: who, kind: ORGANISATION_DOCUMENT_KIND, state: 'PARKED', summary, payload: { title, fileName, words: clean } as never },
      });
      reply = rules('add_a_document', text(body), { type: 'proposal', proposalId: proposal.id, summary });
    }
    if (who) await this.remember(organizationId, who, said, reply).catch(() => undefined);
    return reply;
  }

  /** The yes adds it to the handbook, if they are still an admin there. The no, or anything else, keeps nothing. */
  private async resolveParkedOrganisationDocument(organizationId: string, personId: string, who: string, parked: any, message: string, where?: { groundId?: string; userId?: string | null; forceAddContext?: boolean }): Promise<Reply> {
    const p = (parked.payload ?? {}) as { title?: string; fileName?: string; words?: string };
    const title = p.title ?? 'The document';
    const decision = resolveConfirmation(message);
    const letGo = (state: 'DECLINED' | 'DROPPED' | 'ACCEPTED') =>
      this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state, resolvedAt: new Date(), payload: { title, fileName: p.fileName ?? null } as never } });
    if (decision === 'drop') {
      await letGo('DROPPED');
      return this.answer(organizationId, personId, who, message, true, where?.groundId, where?.userId, where?.forceAddContext);
    }
    if (decision === 'decline') {
      await letGo('DECLINED');
      return rules('add_a_document', text(NOT_ADDED(title)));
    }
    const name = await this.organisationNameOf(organizationId);
    const me = await this.prisma.person.findFirst({ where: { organizationId, externalId: who, active: true }, select: { linkedUserId: true, email: true } });
    const userId = me ? await theirSignIn(this.prisma, organizationId, me).catch(() => me.linkedUserId ?? null) : null;
    if (!userId || !(await this.isAnAdminHere(organizationId, userId))) {
      await letGo('DROPPED');
      return rules('add_a_document', text(`${ONLY_AN_ADMIN_ADDS_ONE(name)} ${NOT_ADDED(title)}`));
    }
    const words = String(p.words ?? '');
    const key = `ask-handbook:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || parked.id}`;
    await this.knowledge.ingestDocument(organizationId, { key, title, text: words, kind: 'handbook', sourceRef: p.fileName ?? null, sourceSystem: 'ask' });
    await letGo('ACCEPTED');
    return rules('add_a_document', text(ADDED_TO_THE_HANDBOOK(title, itsParts(title, words).count, name)));
  }

  /**
   * PUTTING A DOCUMENT IN.
   *
   * A chat cannot carry a file, which is why this was on the not-offered list. What it can do is
   * start it and own the question that matters — who the document is for — and the panel it lives in
   * has the file picker.
   *
   * IT OFFERS, IT DOES NOT UPLOAD. Same shape as everything else that acts: this returns a
   * `next_step` the panel performs, so a customer whose own application has a place for files can
   * point at that instead. And the file arrives PRIVATE whatever happens next: the question of who
   * it is for is asked afterwards, when somebody is actually looking at it, and a conversation
   * abandoned halfway leaves it seen by nobody but its owner.
   */
  private async addADocument(
    organizationId: string,
    personId: string,
    who: string,
    message: string,
    groundId?: string,
    userId: string | null = null,
  ): Promise<Reply> {
    const truth = await this.truth.forPerson(organizationId, personId);
    if (!truth) {
      return rules('add_a_document', text('I cannot see you in your organisation records, so I do not know where to put it.'));
    }

    /* AN ADMIN'S DOCUMENT FOR THE WHOLE ORGANISATION (fix list, item 3): when they say it is for everybody, or when there is no check-in of theirs to put it on. */
    const anAdmin = !!userId && (await this.isAnAdminHere(organizationId, userId).catch(() => false));
    if (anAdmin && !groundId && SAYS_IT_IS_FOR_THE_ORGANISATION.test(message)) return this.offerADocumentForTheOrganisation(organizationId);

    const open = truth.sessions.value.filter((s) => s.standing === 'open to you');

    /*
     * THE CHECK-IN CHOSEN UNDER "ABOUT" COUNTS, AND SO DOES RUNNING IT.
     *
     * A document goes with a check-in, and the person who runs one may put a document on it whether
     * or not they have a session of their own that is open today (a session opened early, with a
     * later first day, is not "open to you" yet, and a lead who only runs the check-in has none).
     * The same `runsIt` rule the setup conversation uses decides; a person who does not run it falls
     * back to the check-ins they have open, as before.
     */
    let chosen: { groundId: string; label: string } | null = null;
    if (groundId && userId) {
      const ground = await this.prisma.ground.findFirst({
        where: { id: groundId, organizationId, status: { notIn: A_GROUND_IS_OVER } },
        select: { id: true, label: true, initiatorId: true, organizationId: true, scenario: true, createdByUserId: true, participants: { select: { userId: true } } },
      });
      const viewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, organizationId: true } });
      if (ground && runsIt(userId, viewer, ground)) chosen = { groundId: ground.id, label: ground.label };
    }
    if (!chosen && groundId) {
      const mine = open.find((s) => s.groundId === groundId);
      if (mine) chosen = { groundId: mine.groundId, label: mine.label };
    }
    /*
     * AND RUNNING ONE COUNTS EVEN WHEN NO CHECK-IN WAS NAMED (screens request 154, item 2).
     *
     * The rule above was only applied when the screen sent a `groundId`. Ask now covers the whole
     * organisation by default and is usually opened with no check-in chosen, so a lead fell
     * straight through to "You have none open, so there is nowhere to put one yet." - read live by
     * somebody running ten open check-ins. A document belongs to a check-in, not to a session, and
     * she runs ten of them.
     */
    if (!chosen && !open.length && userId) {
      const viewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, organizationId: true } });
      const hers = await this.prisma.ground.findMany({
        where: { organizationId, status: { notIn: A_GROUND_IS_OVER } },
        select: { id: true, label: true, initiatorId: true, organizationId: true, createdByUserId: true, participants: { select: { userId: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const runs = hers.find((g) => runsIt(userId, viewer, g as any));
      if (runs) chosen = { groundId: runs.id, label: runs.label };
    }
    if (!chosen && anAdmin && !open.length) return this.offerADocumentForTheOrganisation(organizationId);
    if (!chosen) {
      const nowhere = whyThereIsNowhereToPutIt(open.length);
      if (nowhere) return rules('add_a_document', text(nowhere));
      chosen = { groundId: open[0].groundId, label: open[0].label };
    }
    const first = chosen;
    const rest = open.filter((s) => s.groundId !== first.groundId);

    /*
     * THEY PASTED A LINK, so there is nothing to pick and nothing to upload.
     *
     * Almost nothing a company works from lives in here — the job description is
     * in Drive, the contract is in Dropbox — and asking somebody to download and
     * re-upload is asking them to keep two copies in step. They do it once.
     *
     * It is recorded, never read: see `where-a-document-lives.ts` for why these
     * are a different table rather than a document with no text in it.
     */
    const where = whereItLives(message);
    if (where) {
      const me = await this.prisma.person.findFirst({
        where: { id: personId, organizationId },
        select: { linkedUserId: true },
      });
      const participant = await this.prisma.groundParticipant.findFirst({
        where: { groundId: first.groundId, userId: me?.linkedUserId ?? undefined },
        select: { id: true },
      });
      const title = whatToCallIt(where, message);

      /*
       * SOMETIMES WE CAN JUST READ IT.
       *
       * A published page, a Doc set to "anyone with the link" — refusing to read
       * those is not caution. What must never happen is the middle: a document we
       * half-read, or a claim to have read one we did not. So it is one thing or
       * the other, and the person is told which.
       *
       * READ means a real document with text in it, in the documents table.
       * NOT READ means a link in its own table, which nothing that assembles
       * document text can reach.
       */
      const attempt = await this.reader.read(where.url);
      if (attempt.read) {
        const held = await this.prisma.groundDocument.create({
          data: {
            groundId: first.groundId,
            participantId: participant?.id ?? null,
            fileName: title,
            mimeType: 'text/plain',
            content: attempt.text,
            uploaderNote: `Read from ${attempt.from}: ${where.url}`,
          },
        });

        await this.prisma.assistantProposal.create({
          data: {
            organizationId,
            personExternalId: who,
            kind: 'document',
            state: 'PARKED',
            summary: `Who "${title}" is for`,
            payload: { documentId: held.id, elsewhere: false, groundId: first.groundId, fileName: title },
          },
        });

        return rules(
          'add_a_document',
          text(
            `"${title}" was readable, so I have read it and kept the text - ${attempt.text.length.toLocaleString()} characters from ${attempt.from}. `
            + `I will use it the way I use anything else on this check-in.\n\n${askWhoItIsFor(title)}`,
          ),
        );
      }

      const recorded = await this.prisma.documentElsewhere.create({
        data: {
          groundId: first.groundId,
          participantId: participant?.id ?? null,
          url: where.url,
          livesIn: where.livesIn,
          title,
          note: null,
        },
      });

      await this.prisma.assistantProposal.create({
        data: {
          organizationId,
          personExternalId: who,
          kind: 'document',
          state: 'PARKED',
          summary: `Who "${title}" is for`,
          payload: { documentId: recorded.id, elsewhere: true, groundId: first.groundId, fileName: title },
        },
      });

      /* WHY it could not be read, said out loud. "I cannot read it" invites the
         person to try again the same way; "not readable without signing in" tells
         them what would change it. */
      return rules(
        'add_a_document',
        text(`${whatWeCanAndCannotDo(where, title)} (I tried: ${attempt.because}.)\n\n${askWhoItIsFor(title)}`),
      );
    }

    const also = rest.length
      ? ` You have ${rest.length === 1 ? 'one other check-in' : `${rest.length} other check-ins`} open - say which if it belongs somewhere else.`
      : '';

    return rules(
      'add_a_document',
      text(
        `It will go on "${first.label}", and only you will be able to see it until you say otherwise.${also}`,
      ),
      {
        type: 'next_step',
        label: 'Choose a file',
        href: '/grounds',
        kind: 'upload_a_document',
        /* The check-in's own id, the ground. Not a session's. */
        id: first.groundId,
        context: { groundId: first.groundId, label: first.label },
      },
    );
  }

  /**
   * EMAIL ME THAT.
   *
   * The first capability that could not have been a lane in the old sense: it does not answer a
   * question about the records, it acts on what was already said. Which is also why it is the proof
   * the registry was worth building — it declares that it writes and how that is agreed, and the
   * guard holds it to that without anybody remembering to.
   *
   * IT PROPOSES. Mail leaves the building and cannot be recalled, so it is never sent on a sentence
   * that merely sounded like a request — "can you send me that" is a question in some rooms.
   */
  private async sendMeThat(organizationId: string, personId: string, who: string | null): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true, displayName: true, email: true },
    });
    if (!me || !who) {
      return rules('send_me_that', text('I cannot see you in your organisation records, so I do not know where to send it.'));
    }

    /*
     * WHAT WAS ACTUALLY SAID, from their own turns and nobody else's. The last thing the assistant
     * said, and the question it answered — sending a summary would mean the mail and the
     * conversation disagree, and only one of them is in front of them.
     */
    const recent = await this.prisma.assistantTurn.findMany({
      where: { organizationId, personExternalId: who },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { role: true, content: true, lane: true },
    });
    const lastReply = recent.find((t) => t.role === 'assistant' && t.lane !== 'send_me_that');
    const theQuestion = recent.find((t) => t.role === 'person');

    const latest = lastReply
      ? { body: lastReply.content, about: theQuestion?.content ?? 'your work', lane: lastReply.lane ?? 'unplaced' }
      : null;

    const cannot = whyThisCannotBeSent(latest, me);
    if (cannot) return rules('send_me_that', text(cannot));

    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'delivery',
        summary: askBeforeSending(latest!, me),
        payload: latest as never,
      },
    });

    return {
      lane: 'send_me_that',
      composedBy: 'rules',
      blocks: [
        text(proposal.summary),
        { type: 'proposal', proposalId: proposal.id, summary: proposal.summary },
      ],
    };
  }

  private async startACheckIn(organizationId: string, personId: string, _who: string | null, message: string): Promise<Reply> {
    /* THE ONE READ. This lane used to query the grounds and the check-ins
       itself, which is how the same logic came to exist three times and drift.
       See `what-is-true.service.ts`. */
    const truth = await this.truth.forPerson(organizationId, personId);
    if (!truth) {
      return rules('start_a_check_in', text('I cannot see you in your organisation records, so I cannot tell what is waiting for you.'));
    }

    const sessions = truth.sessions.value;
    const said = whatItTakesToStart({
      toStart: sessions
        .filter((x) => x.standing === 'waiting on you to start')
        .map((x) => ({ groundId: x.groundId, label: x.label })),
      open: sessions
        .filter((x) => x.standing === 'open to you')
        .map((x) => ({ checkInId: x.checkInId as string, label: x.label, aboutOnePerson: x.aboutOnePerson })),
      notAccepted: sessions
        .filter((x) => x.standing === 'invitation not accepted')
        .map((x) => ({ label: x.label })),
    });

    if (said.act) {
      return rules(
        'start_a_check_in',
        text(said.line),
        { type: 'next_step', label: said.act.label, href: '/grounds', kind: said.act.kind, id: said.act.id },
      );
    }

    /*
     * NOTHING WAITING, SO OFFER TO OPEN ONE.
     *
     * The same lane rather than a second one, and the registry is why: "set up a check-in" belongs
     * to this capability, and a lane that also claimed it would be the fifth collision of the week.
     * It is better for the person too — nobody should have to know whether the thing they want
     * already exists.
     */
    if (truth.sessions.value.length === 0) {
      return this.offerToOpenOne(organizationId, personId, truth.person.externalId, message);
    }

    return rules('start_a_check_in', text(said.line));
  }

  /**
   * OPENING ONE THAT DOES NOT EXIST YET.
   *
   * The first capability that emails people, which changes what care means. Everything else here is
   * recoverable in the next sentence; an invitation is in somebody's inbox, and what it invites them
   * to is accounting for themselves.
   *
   * So it proposes, and the proposal NAMES EVERYBODY. Never a count.
   */
  private async offerToOpenOne(
    organizationId: string,
    personId: string,
    who: string,
    message: string,
  ): Promise<Reply> {
    const read = whichSituation(message);

    if (read === null) return rules('start_a_check_in', text(askWhichSituation()));
    if ('ambiguous' in read) return rules('start_a_check_in', text(askWhichSituation(read.ambiguous)));

    const roster = await this.prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, displayName: true, managerExternalId: true, active: true },
    });
    const people = whoWouldBeAsked(roster, who);
    const label = whatTheyWantToCallIt(message) ?? read.says;

    const asks = askBeforeOpeningIt({ says: read.says, label, people });

    /*
     * NOTHING IS PARKED WHEN THERE IS NOBODY TO ASK, and the first version got this wrong in a way
     * only running it showed. It parked a proposal with an empty list, so a "yes" resolved it and
     * answered "none of those people can be reached now" — about people who had never been named.
     * A parked action nobody can sensibly say yes to should not exist.
     */
    if (people.length === 0) return rules('start_a_check_in', text(asks));

    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'open_a_check_in',
        summary: asks,
        payload: {
          scenario: read.scenario,
          label,
          people: people.map((p) => p.externalId),
        } as never,
      },
    });

    return {
          lane: 'start_a_check_in',
          composedBy: 'rules',
          blocks: [
            text(proposal.summary),
            { type: 'proposal', proposalId: proposal.id, summary: proposal.summary },
          ],
        };
  }

  /**
   * SETTING AN OBJECTIVE, WHICH IS THE ONE LANE THAT STARTS SOMETHING.
   *
   * Every other lane answers a question about records that already exist. This one opens a draft
   * and then asks for the four things a draft needs, one at a time, refusing an answer that is a
   * way of getting past the question rather than answering it.
   *
   * IT DOES NOT WRITE THE OBJECTIVE. The draft has to be agreed by the people on it, and seeding is
   * a separate act with its own refusals — one of which is that nobody has said why the number is
   * the one that matters. An assistant that could turn a two-minute conversation into an official
   * target would be the fastest way to fill this system with objectives nobody agreed.
   *
   * THE QUESTIONS ARE THE DRAFT'S, NOT THIS LANE'S. `askNext` comes back from the drafting service,
   * so the screen and the conversation ask the same thing in the same words — and adding a fifth
   * question later does not mean remembering to add it here too.
   */
  private async setAnObjective(organizationId: string, who: string | null, message: string): Promise<Reply> {
    if (!who) {
      return rules(
        'set_an_objective',
        text('I cannot see you in your organisation records, so I cannot open a draft in your name.'),
      );
    }

    /*
     * AN OPEN DRAFT IS CONTINUED, NEVER DUPLICATED. Somebody saying "let's set an objective" twice
     * in one conversation means they are still on the first one — and a second draft would split
     * the answers across two records, each looking half-finished.
     */
    const open = await this.prisma.objectiveDraft.findFirst({
      where: { organizationId, initiatorExternalId: who, state: { in: ['DRAFTING', 'CONTESTED'] } },
      orderBy: { updatedAt: 'desc' },
    });

    if (open) {
      const next = whatToAskForNext(open);
      if (!next) return this.offerToSeed(organizationId, who, open);
      return rules('set_an_objective', text(`We are still working on "${open.workingTitle}". ${next.asks}`));
    }

    /*
     * The working title is the person's own words, minus the asking. Not the model's paraphrase:
     * this becomes the objective's title if the draft survives, and a title nobody typed is one
     * nobody recognises in the list a fortnight later.
     */
    const workingTitle = whatTheyWantToCallIt(message);
    if (!workingTitle) {
      return rules(
        'set_an_objective',
        text('What is it about? A few words is enough to start - the title can change.'),
      );
    }

    const draft = await this.drafts.start(organizationId, who, { workingTitle });
    const next = whatToAskForNext(draft);

    return rules(
      'set_an_objective',
      text(`I have started a draft called "${draft.workingTitle}". ${next ? next.asks : ''}`.trim()),
    );
  }

  /**
   * THE ROLE INTERVIEW, ONE QUESTION AT A TIME (request 25).
   *
   * An admin sent it; it waits as a parked request for this person. Until they say "start" their own
   * messages are answered as usual (with one reminder), because they did not come to be interviewed.
   * After that, each message is the answer to the question just asked, kept exactly as typed. When the
   * fourth is in, all four are said back and only a yes writes the row (decision 12).
   */
  private async resolveParkedInterview(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
    const p = parked.payload as InterviewPayload;
    const typed = tidy(message);

    if (theyWantToStop(typed)) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('role_interview', text(NOT_NOW_SAID));
    }

    if (p.answered === 0 && !p.started) {
      if (!theyWantToBegin(typed)) {
        /* They asked something else. Answer it, and say once that the interview is waiting. */
        const reply = await this.answer(organizationId, personId, who, message, true);
        if (p.reminded) return reply;
        await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { payload: { ...p, reminded: true } as never } });
        return { ...reply, blocks: [...reply.blocks, text(INTERVIEW_INVITATION(p.roleName))] };
      }
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { payload: { ...p, started: true } as never } });
      return rules('role_interview', text(THE_FOUR[0].asks(p.roleName)));
    }

    if (!typed) return rules('role_interview', text(EMPTY));
    if (typed.length > LONGEST_ANSWER) return rules('role_interview', text(TOO_LONG));

    const here = THE_FOUR[p.answered];
    const answers = { ...p.answers, [here.key]: (message ?? '').trim() };
    const answered = p.answered + 1;

    if (answered < THE_FOUR.length) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { payload: { ...p, answers, answered } as never } });
      return rules('role_interview', text(THE_FOUR[answered].asks(p.roleName)));
    }

    /* All four are in: said back, and nothing is written until a yes. */
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    const all = answers as TheFourAnswers;
    const say = sayItBack(all);
    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId, personExternalId: who, kind: ROLE_INTERVIEW_CONFIRM_KIND, summary: say,
        payload: { roleName: p.roleName, answers: all } as never,
      },
    });
    return rules('role_interview', text(say), { type: 'proposal', proposalId: proposal.id, summary: say });
  }

  // ------------------------------------ a suite set up by talking ------------------------------------

  /**
   * DECISION 85: "Set up our employee leave process". An admin may set up every suite; whoever holds the
   * HR duty may set up leave and reviews, and whoever holds the finance duty spending and time sheets
   * ("The company/admin/HR/finance lead sets up the rules once"). The server says so again on the yes,
   * because every write goes through SuitesService, which refuses anybody else. Anybody else is told
   * plainly who sets it up, and nothing is parked or changed.
   */
  private async setUpASuite(organizationId: string, who: string, userId: string | null, suite: SetUpSuite, message: string): Promise<Reply> {
    if (!userId || !(await this.maySetUpHere(organizationId, userId, suite))) {
      return rules('set_up_a_suite', text(await this.whoSetsThisUp(organizationId, suite)));
    }
    if (!this.suites) return rules('set_up_a_suite', text(`I cannot set up ${SUITE_IN_WORDS[suite]} from here yet. You can set them up on the Suites page.`));
    const known = await this.whatIsKnownToSetUp({ userId, organizationId }, suite);
    return this.askOrSayBack(organizationId, who, startPlan(suite, message, known), known, { opening: true });
  }

  /** The next question, parked so the reply is read as its answer; or, with nothing missing, the whole of it said back and parked for a yes. */
  private async askOrSayBack(
    organizationId: string, who: string, plan: ASetUpPlan, known: WhatIsKnownToSetUp,
    how: { opening?: boolean; parkedId?: string; lead?: string } = {},
  ): Promise<Reply> {
    const q = nextQuestion(plan, known);
    if (q) {
      const say = `${how.lead ?? ''}${how.opening ? theFirstQuestionSaid(plan.suite, q.ask) : q.ask}`;
      const payload = { ...plan, asking: q.key } as never;
      if (how.parkedId) await this.prisma.assistantProposal.update({ where: { id: how.parkedId }, data: { payload, summary: say } });
      else await this.prisma.assistantProposal.create({ data: { organizationId, personExternalId: who, kind: SUITE_SETUP_KIND, summary: say, payload } });
      return rules('set_up_a_suite', text(say));
    }
    if (how.parkedId) await this.prisma.assistantProposal.update({ where: { id: how.parkedId }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    const say = `${how.lead ?? ''}${theSayBack(plan, known)}`;
    const proposal = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: SUITE_SETUP_CONFIRM_KIND, summary: say, payload: { ...plan, asking: null } as never },
    });
    return rules('set_up_a_suite', text(say), { type: 'proposal', proposalId: proposal.id, summary: say });
  }

  /** An answer to the question asked. Read by rules; anything they cannot read is asked again. Nothing is stored. */
  private async resolveParkedSuiteSetUp(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
    const plan = parked.payload as ASetUpPlan;
    const typed = tidy(message);
    if (STOP_SETTING_UP.test(typed)) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('set_up_a_suite', text(SET_UP_STOPPED(plan.suite)));
    }
    const userId = await this.signedInAs(organizationId, who);
    if (!userId || !this.suites || !(await this.maySetUpHere(organizationId, userId, plan.suite))) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('set_up_a_suite', text(await this.whoSetsThisUp(organizationId, plan.suite)));
    }
    const known = await this.whatIsKnownToSetUp({ userId, organizationId }, plan.suite);
    const read = takeAnswer(plan, plan.asking ?? '', typed, known);
    if ('again' in read) {
      /* They asked something else: the set-up stops, nothing is kept, and their question is answered. */
      if (route(typed).lane !== 'unplaced' || aDecisionIn(typed)) return this.stopSettingUpAndAnswer(organizationId, personId, who, parked, plan, message);
      return rules('set_up_a_suite', text(read.again));
    }
    return this.askOrSayBack(organizationId, who, read.plan, known, { parkedId: parked.id });
  }

  /** After the said-back: a yes writes it, a no writes nothing, and a change is said back again before anything is written. */
  private async resolveParkedSuiteSetUpConfirm(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
    const plan = parked.payload as ASetUpPlan;
    const decision = resolveConfirmation(message);
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('set_up_a_suite', text(SET_UP_NOT_DONE(plan.suite)));
    }
    const userId = await this.signedInAs(organizationId, who);
    if (!userId || !this.suites || !(await this.maySetUpHere(organizationId, userId, plan.suite))) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('set_up_a_suite', text(await this.whoSetsThisUp(organizationId, plan.suite)));
    }
    if (decision === 'accept') return this.writeTheSetUp(organizationId, userId, parked, plan);
    const known = await this.whatIsKnownToSetUp({ userId, organizationId }, plan.suite);
    const changed = takeAChange(plan, message, known);
    if (changed) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return this.askOrSayBack(organizationId, who, { ...changed, asking: null }, known, { lead: 'I have changed that. ' });
    }
    if (route(message).lane !== 'unplaced' || aDecisionIn(message)) return this.stopSettingUpAndAnswer(organizationId, personId, who, parked, plan, message, true);
    return rules('set_up_a_suite', text(SET_UP_CHANGE_NOT_READ));
  }

  private async stopSettingUpAndAnswer(organizationId: string, personId: string, who: string, parked: any, plan: ASetUpPlan, message: string, saidBack = false): Promise<Reply> {
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
    const reply = await this.answer(organizationId, personId, who, message, true);
    return { ...reply, blocks: [text(saidBack ? SET_UP_NOT_DONE(plan.suite) : SET_UP_STOPPED(plan.suite)), ...reply.blocks] };
  }

  /**
   * THE YES. Written through the same SuitesService methods the Suites page and its routes use, as the
   * admin, so each write checks again that they are an admin and the rules history keeps it as their
   * change. Then read back through the same service, and said from what is stored.
   */
  private async writeTheSetUp(organizationId: string, userId: string, parked: any, plan: ASetUpPlan): Promise<Reply> {
    const reader = { userId, organizationId };
    const known = await this.whatIsKnownToSetUp(reader, plan.suite);
    const w = whatToWrite(plan, known);
    if (!w) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('set_up_a_suite', text(`I could not set up ${SUITE_IN_WORDS[plan.suite]} as I said it, because something in it is no longer true in your organisation, for example somebody named in it has left. Nothing has changed. Say “set up ${SUITE_IN_WORDS[plan.suite]}” to go through it again.`));
    }
    const suites = this.suites!;
    try {
      await suites.switch(reader, plan.suite, { on: true, answers: w.answers }, { theStepsAreSet: !!w.spendRules });
      if (w.spendRules) await suites.setSpendRules(reader, w.spendRules);
      if (w.duties) await suites.setDuties(reader, w.duties);
      if (w.workflows) await suites.setWorkflows(reader, w.workflows);
      if (w.leaveRules) await suites.setLeaveRules(reader, w.leaveRules);
      if (w.timeRules) await suites.setTimeRules(reader, w.timeRules);
    } catch (e: any) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      if (e?.status === 403) return rules('set_up_a_suite', text(await this.whoSetsThisUp(organizationId, plan.suite)));
      this.logger.warn(`A suite set up by talking stopped part way: ${e?.message ?? e}`);
      return rules('set_up_a_suite', text(`I could not finish setting up ${SUITE_IN_WORDS[plan.suite]}. Some of it may already be set, so please look at the Suites page to see what is set now.`));
    }
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    return rules('set_up_a_suite', text(SET_UP_DONE(plan.suite, await this.theSetUpAsStored(reader, plan.suite))));
  }

  /** What is stored now, read back through SuitesService and said by the same function as the said-back. */
  async theSetUpAsStored(reader: { userId: string; organizationId: string }, suite: SetUpSuite): Promise<string[]> {
    const suites = this.suites!;
    const known = await this.whatIsKnownToSetUp(reader, suite);
    const wf = suite === 'reviews' ? null : (await suites.workflows(reader)).suites.find((s) => s.key === suite) ?? null;
    const leave = suite === 'leave' ? await suites.leaveRules(reader) : null;
    const spend = suite === 'spend' ? await suites.spendRules(reader) : null;
    const time = suite === 'time' ? await suites.timeRules(reader) : null;
    const plan = planFromStored(suite, {
      answers: known.answers,
      steps: wf?.steps ?? null, escalateAfter: wf?.escalateAfter ?? null,
      tellHr: leave?.rules.tellHr ?? null,
      thresholds: (spend ? spend.rules.thresholds : leave?.rules.thresholds) ?? null,
      hoursAWeek: time?.rules.hoursAWeek ?? null,
      cutOff: time?.rules.cutOff && typeof time.rules.cutOff.day === 'string' ? { day: time.rules.cutOff.day as Weekday, time: time.rules.cutOff.time } : null,
    });
    return theSetUpSaid(plan, known);
  }

  /** The organisation as the person setting a suite up may read it, through SuitesService. */
  private async whatIsKnownToSetUp(reader: { userId: string; organizationId: string }, suite: SetUpSuite): Promise<WhatIsKnownToSetUp> {
    const suites = this.suites!;
    const [duties, page, directory] = await Promise.all([
      suites.duties(reader),
      suites.forReader(reader),
      this.prisma.person.findMany({ where: { organizationId: reader.organizationId, active: true }, select: { linkedUserId: true, department: true } }).catch(() => [] as { linkedUserId: string | null; department: string | null }[]),
    ]);
    const teamOf = new Map(directory.filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p.department?.trim() || null]));
    const d: Duties = {};
    for (const o of duties.organisation) if (o.holder) d[o.key as 'finance' | 'hr' | 'chiefExecutive'] = o.holder.id;
    for (const t of duties.teams) {
      if (t.budgetOwner) d.budgetOwners = { ...(d.budgetOwners ?? {}), [t.team]: t.budgetOwner.id };
      if (t.head) d.departmentHeads = { ...(d.departmentHeads ?? {}), [t.team]: t.head.id };
    }
    /* An admin reads every suite; whoever holds the HR or finance duty reads the suites that duty sets up. */
    const row = 'groups' in page
      ? (page.groups ?? []).flatMap((g) => g.suites).find((x) => x.key === suite)
      : (page.youSetUp ?? []).find((x) => x.key === suite);
    return {
      people: duties.people.map((p) => ({ ...p, team: teamOf.get(p.id) ?? null })),
      teams: duties.teams.map((t) => t.team),
      duties: d,
      me: reader.userId,
      answers: (row?.answers ?? {}) as Record<string, unknown>,
      on: !!row?.on,
      /* Only an admin names who holds a job. */
      mayNameJobs: page.reader === 'admin',
    };
  }

  /** Whether this person may set up this suite: an admin, or whoever holds the duty that sets it up (SuitesService decides). */
  private async maySetUpHere(organizationId: string, userId: string, suite: SetUpSuite): Promise<boolean> {
    if (!this.suites) return this.isAnAdminHere(organizationId, userId);
    return this.suites.maySetUp({ userId, organizationId }, suite).catch(() => false);
  }

  /** "Only an admin or Joy, who looks after HR, can set up how leave requests work ...", with who to ask. */
  private async whoSetsThisUp(organizationId: string, suite: SetUpSuite): Promise<string> {
    const holderId = (await readDuties(this.prisma, organizationId).catch((): Duties => ({})))[THE_DUTY_FOR[suite]];
    const holder = holderId
      ? ((await (this.prisma as any).user?.findMany?.({ where: { id: { in: [holderId] } }, select: { firstName: true } }).catch(() => [])) ?? [])[0]?.firstName?.trim() || null
      : null;
    return onlyAnAdminSetsThisUp(suite, await this.adminsByFirstName(organizationId), holder);
  }

  /**
   * APPROVAL STEPS FOR SPENDING, SAID IN ONE SENTENCE (spending-steps-said-in-ask.ts). Written through SuitesService.setSpendRules, the
   * same call the spending page makes, which refuses anybody but an admin or whoever looks after finance. What was set is said back.
   */
  private async setSpendingStepsSaid(organizationId: string, userId: string, message: string): Promise<Reply | null> {
    if (!this.suites) return null;
    const reader = { userId, organizationId };
    if (!(await this.suites.maySetUp(reader, 'spend').catch(() => false))) {
      return rules('set_up_a_suite', text(await this.whoSetsThisUp(organizationId, 'spend')));
    }
    const members: any[] = await this.prisma.organizationMembership
      .findMany({ where: { organizationId }, select: { userId: true, role: true, user: { select: { firstName: true, lastName: true } } } })
      .catch(() => []);
    const people = (members ?? []).map((m) => ({ userId: m.userId, first: String(m.user?.firstName ?? '').trim(), full: `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() }));
    const me = people.find((p) => p.userId === userId) ?? { userId, first: '', full: '' };
    const isAdmin = (members ?? []).some((m) => m.userId === userId && m.role === 'ADMIN');
    const duties = await readDuties(this.prisma, organizationId).catch(() => ({}));
    const read = theStepsSaid(message, me, isAdmin, people.filter((p) => p.userId !== userId), duties);
    if ('notRead' in read) return rules('set_up_a_suite', text(`${read.notRead} Nothing has changed.`));
    const now = await this.suites.spendRules(reader).catch(() => null);
    const thresholds = [...(now?.rules?.thresholds ?? []).filter((t: any) => t.above !== read.above), { above: read.above, steps: read.steps.map((r) => [r]) }]
      .sort((a: any, b: any) => a.above - b.above);
    try {
      await this.suites.setSpendRules(reader, { thresholds });
    } catch (e: any) {
      return rules('set_up_a_suite', text(`${e?.response?.message ?? e?.message ?? 'That could not be set.'} Nothing has changed.`));
    }
    const suite: any = await (this.prisma as any).organizationSuite?.findUnique?.({ where: { organizationId_suite: { organizationId, suite: 'spend' } }, select: { answers: true } }).catch(() => null);
    const currency = typeof suite?.answers?.currency === 'string' ? suite.answers.currency : null;
    return rules('set_up_a_suite', text(theStepsSetSaid(currency, read, me.first)));
  }

  private async isAnAdminHere(organizationId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch(() => null);
    return m?.role === 'ADMIN';
  }

  /** The admins here, by first name, for "you could ask Grace". */
  private async adminsByFirstName(organizationId: string): Promise<string[]> {
    const ms = await this.prisma.organizationMembership
      .findMany({ where: { organizationId, role: 'ADMIN' }, select: { user: { select: { firstName: true } } } })
      .catch(() => [] as { user: { firstName: string | null } | null }[]);
    return [...new Set((ms ?? []).map((m: any) => m.user?.firstName?.trim()).filter((n: unknown): n is string => !!n))];
  }

  /** The sign-in behind a person's key, linked or matched by address. */
  private async signedInAs(organizationId: string, who: string): Promise<string | null> {
    const me = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true, email: true } }).catch(() => null);
    return theirSignIn(this.prisma, organizationId, me).catch(() => me?.linkedUserId ?? null);
  }

  /**
   * WHAT THEY TOLD US ABOUT THEIR JOB, AND CORRECTING IT (decision 129). Private to the person. A correction is said back with their
   * words quoted, and written only on a yes, through the same writer the route uses. A person who has told us nothing yet is not
   * hijacked by a sentence that merely starts "I own": only "my job is" and "change my job to" are read without a row.
   */
  private async aboutTheirJob(organizationId: string, who: string, userId: string, message: string): Promise<Reply | null> {
    const wants = parseAJobCorrection(message);
    const asks = !wants && asksWhatWeKnowOfTheirJob(message);
    if (!wants && !asks) return null;
    const mine = await theirJobForThem(this.prisma, { userId, organizationId }).catch(() => null);
    if (!mine) return null;
    if (asks) return rules('role_interview', text(whatTheyToldUs(mine)));
    if (wants!.part !== 'roleName' && !mine.roleName) return null;
    const old = wants!.part === 'roleName' ? mine.roleName : (mine as any)[wants!.part] ?? null;
    if (old && old.trim().toLowerCase() === wants!.value.trim().toLowerCase()) {
      return rules('role_interview', text('That is already what I have, so nothing needs to change.'));
    }
    const say = theCorrectionSaidBack(wants!.part, wants!.value, old);
    const proposal = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: JOB_CORRECTION_KIND, summary: say, payload: { part: wants!.part, value: wants!.value } as never },
    });
    return rules('role_interview', text(say), { type: 'proposal', proposalId: proposal.id, summary: say });
  }

  /** The yes writes one new row through the route's own writer. The no writes nothing. */
  private async resolveParkedJobCorrection(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('role_interview', text('I have left it as it was. Nothing was changed.'));
    }
    const userId = await this.signedInAs(organizationId, who);
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    if (!userId) return rules('role_interview', text('I could not change that, because I can no longer see you in your organisation records.'));
    try {
      const done = await correctTheirJob(this.prisma, { userId, organizationId }, { [parked.payload.part]: parked.payload.value });
      return rules('role_interview', text(`I have changed it. I have your job as "${done.roleName}". It is private to you, and the role map only shows what you own if you have agreed to that.`));
    } catch (err) {
      return rules('role_interview', text(err instanceof RangeError ? err.message : 'I could not change that just now. Please try again in a moment.'));
    }
  }

  /**
   * AFTER THEIR FIRST CHECK-IN: MAY THE ROLE MAP SHOW WHAT THEY OWN. Waits for the person. A message that is not a yes or a no is
   * answered as usual and the request stays, with the question put once more; only a yes shows it, and only what they own.
   */
  private async resolveParkedRoleShare(organizationId: string, personId: string, who: string, parked: any, message: string, where?: { groundId?: string; userId?: string | null; forceAddContext?: boolean }): Promise<Reply> {
    const decision = resolveConfirmation(message);
    if (decision === 'drop') {
      const reply = await this.answer(organizationId, personId, who, message, true, where?.groundId, where?.userId, where?.forceAddContext);
      /* Not on top of a say-back of its own, and only once: a second question under an answer is one too many. */
      if ((parked.payload as any)?.reminded || reply.blocks.some((b: any) => b.type === 'proposal')) return reply;
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { payload: { ...(parked.payload as any), reminded: true } as never } });
      return { ...reply, blocks: [...reply.blocks, text(parked.summary), { type: 'proposal', proposalId: parked.id, summary: parked.summary }] };
    }
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() } });
    if (decision === 'decline') return rules('role_interview', text('That is fine. The role map will not show anything, and what you told me about your job stays private to you.'));
    const rowId = (parked.payload as any)?.rowId as string | undefined;
    const row = rowId ? await this.prisma.roleInterviewAnswer.findUnique({ where: { id: rowId }, select: { roleName: true, organizationId: true } }) : null;
    if (!row || row.organizationId !== organizationId) return rules('role_interview', text('I could not find what you told me, so nothing was shown.'));
    await this.prisma.roleInterviewAnswer.update({ where: { id: rowId! }, data: { sharedAt: new Date() } });
    /* The role map lists the jobs people hold by their roster title, so a person made by Ask after their check-in gets the title they gave (only when they have none). */
    const mePerson = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { id: true, title: true } }).catch(() => null);
    if (mePerson && !mePerson.title?.trim() && row.roleName) await this.prisma.person.update({ where: { id: mePerson.id }, data: { title: row.roleName } }).catch(() => undefined);
    /* If they corrected something since, the newest row is the one the map reads, and it carries the agreement too. */
    const newest = await this.prisma.roleInterviewAnswer.findFirst({ where: { organizationId, personExternalId: (parked.payload as any)?.personExternalId ?? who }, orderBy: { createdAt: 'desc' }, select: { id: true, sharedAt: true } }).catch(() => null);
    if (newest && newest.id !== rowId && !newest.sharedAt) await this.prisma.roleInterviewAnswer.update({ where: { id: newest.id }, data: { sharedAt: new Date() } });
    return rules('role_interview', text(`I have let the role map show what the ${row.roleName} job owns. It is about the job and not about you. Everything else you told me stays private to you.`));
  }

  /** The yes writes one row. The no writes nothing, and the interview can be started again. */
  private async resolveParkedInterviewConfirm(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    const p = parked.payload as ConfirmPayload;
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      await this.prisma.assistantProposal.create({
        data: { organizationId, personExternalId: who, kind: ROLE_INTERVIEW_KIND, summary: INTERVIEW_INVITATION(p.roleName), payload: { roleName: p.roleName, answered: 0, answers: {} } as never },
      });
      return rules('role_interview', text(LEFT));
    }
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who, active: true }, select: { id: true } });
    if (!person) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('role_interview', text('I could not save that, because I can no longer see you in your organisation records.'));
    }
    await this.prisma.roleInterviewAnswer.create({
      data: {
        organizationId, personExternalId: who, roleName: p.roleName,
        owns: p.answers.owns, decides: p.answers.decides, dependsOn: p.answers.dependsOn, dependedOnBy: p.answers.dependedOnBy,
        promptVersionId: null,
      },
    });
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    return rules('role_interview', text(SAVED(p.roleName)));
  }

  /**
   * CONFIRM, RE-VERIFY, DELEGATE, AUDIT, READ BACK.
   *
   * The re-verification matters more than it looks: between the offer and the yes, the person may
   * have been deprovisioned, or their organisation disconnected. A parked action carries the
   * authorisation it had when it was offered, and that is exactly what must not be trusted.
   */
  private async resolveParked(
    organizationId: string,
    personId: string,
    who: string,
    parked: any,
    message: string,
    /** Where the person is and what the screen said this message is for, so a dropped yes/no does not lose it. */
    where?: { groundId?: string; userId?: string | null; forceAddContext?: boolean },
  ): Promise<Reply> {
    /*
     * A DOCUMENT IS ANSWERED BEFORE THE YES/NO READING, because its question is not a yes/no one.
     * "Everyone" is not a confirmation and "just me" is not a refusal, and running them through
     * that reading first would take "no one" as a decline and drop the whole thing — leaving a file
     * uploaded, private, and nobody told what happened to it.
     */
    if (parked.kind === 'document') {
      return this.resolveParkedDocument(organizationId, who, parked, message);
    }
    /* A document for the whole organisation: a yes adds it, anything else keeps nothing (fix list, item 3). */
    if (parked.kind === ORGANISATION_DOCUMENT_KIND) {
      return this.resolveParkedOrganisationDocument(organizationId, personId, who, parked, message, where);
    }

    /*
     * WHICH CHECK-IN THEY MEANT is answered by naming one, not by yes or no - same reason a
     * document's question is handled above, before the yes/no reading would misread it.
     */
    if (parked.kind === 'which_context_check_in') {
      return this.resolveParkedWhichCheckIn(organizationId, who, parked, message);
    }

    /*
     * AN OPEN SETUP CONVERSATION (item 2) IS ANSWERED BEFORE THE YES/NO READING, for the same reason
     * a document and "which check-in" are: its question is not a yes/no one, and reading a bare
     * answer like "twelve weeks" through `resolveConfirmation` would call it neither and drop it as a
     * "no" reads nothing said - leaving the setup conversation exactly where it started.
     */
    if (parked.kind === 'context_turn') {
      return this.resolveParkedContextTurn(organizationId, who, parked, message);
    }

    /*
     * A QUESTION ABOUT THE PERSON'S OWN LEAVE (decision 85, build step 7): what they type next is their
     * answer, said back before it goes, so it is read before the yes/no reading.
     */
    if (parked.kind === LEAVE_QUESTION_KIND) {
      return this.resolveParkedLeaveQuestion(organizationId, personId, who, parked, message);
    }

    /*
     * THE ONE THING A REQUEST TO SPEND IS MISSING (build step 9): the reply is read as the category
     * Groundwork asked for, so it is read before the yes/no reading.
     */
    if (parked.kind === SPEND_MISSING_KIND) {
      return this.resolveParkedSpendMissing(organizationId, personId, who, parked, message);
    }
    /* WHAT AN AMOUNT IS FOR, asked because the words did not say: what they type next is the reason. */
    if (parked.kind === SPEND_PURPOSE_KIND) {
      return this.resolveParkedSpendPurpose(organizationId, personId, who, parked, message);
    }

    /*
     * A WEEK OF HOURS DRAFTED FROM THE RECORD (build step 11): the reply can change a line ("6 hours on
     * Naivas on Monday", "remove Naivas on Monday") before the yes, so it is read before the yes/no reading.
     */
    if (parked.kind === HOURS_WEEK_DRAFT_KIND) {
      return this.resolveParkedWeekDraft(organizationId, personId, who, parked, message);
    }

    /*
     * A SUITE BEING SET UP BY TALKING (decision 85): what is typed answers the question asked, and
     * after the said-back it may be a change as well as a yes or a no, so both are read here first.
     */
    if (parked.kind === SUITE_SETUP_KIND) {
      return this.resolveParkedSuiteSetUp(organizationId, personId, who, parked, message);
    }
    if (parked.kind === SUITE_SETUP_CONFIRM_KIND) {
      return this.resolveParkedSuiteSetUpConfirm(organizationId, personId, who, parked, message);
    }

    /* THE ROLE INTERVIEW (request 25): what is typed is an answer to its question, not a yes or a no. */
    if (parked.kind === ROLE_INTERVIEW_KIND) {
      return this.resolveParkedInterview(organizationId, personId, who, parked, message);
    }

    /* After a first check-in: may the role map show what they own (decision 129). Not dropped by another message. */
    if (parked.kind === SHARE_WITH_THE_ROLE_MAP_KIND) {
      return this.resolveParkedRoleShare(organizationId, personId, who, parked, message, where);
    }

    const decision = resolveConfirmation(message);

    if (decision === 'drop') {
      /*
       * THE DROP. Anything that is not a clear yes or no ends it, so a "yes" later in the
       * conversation - meant for something else - can never fire this.
       */
      await this.prisma.assistantProposal.update({
        where: { id: parked.id },
        data: { state: 'DROPPED', resolvedAt: new Date() },
      });
      /*
       * And their message is still answered, because they were talking about something. The real
       * personId is carried through: the lanes look somebody up by it, and an empty one would have
       * every lane answer "I cannot find you" immediately after a dropped proposal - which reads as
       * the product breaking at the exact moment somebody changed the subject.
       */
      /* The check-in they are on and the set-up door they came through stay with the message (found live, 10 October 2026: a fact typed on one check-in, after a say-back was left waiting on another, was answered "I cannot answer that one yet"). */
      return this.answer(organizationId, personId, who, message, true, where?.groundId, where?.userId, where?.forceAddContext);
    }

    /*
     * WHICH QUESTION IS BEING ANSWERED, decided before anything is written. Below this line the
     * code assumes the payload is a commitment - it reads `payload.text` and creates one - so a
     * scenario answered here without the branch would have written a commitment whose text was
     * undefined. Both kinds share the reading of yes/no/drop above and nothing after it.
     */
    if (parked.kind === 'scenario') {
      return this.resolveParkedScenario(organizationId, who, parked, decision);
    }

    if (parked.kind === 'delivery') {
      return this.resolveParkedDelivery(organizationId, who, parked, decision);
    }

    if (parked.kind === 'open_a_check_in') {
      return this.resolveParkedOpening(organizationId, personId, who, parked, decision);
    }
    if (parked.kind === 'todo') {
      return this.resolveParkedToDo(organizationId, who, parked, decision);
    }
    if (parked.kind === 'seed_objective') {
      return this.resolveParkedSeed(organizationId, who, parked, decision);
    }
    if (parked.kind === 'context') {
      return this.resolveParkedContext(organizationId, who, parked, decision);
    }
    if (parked.kind === 'leave_request') {
      return this.resolveParkedLeave(organizationId, who, parked, decision);
    }
    if (parked.kind === 'hours_entry') {
      return this.resolveParkedHours(organizationId, who, parked, decision);
    }
    if (parked.kind === 'spend_request') {
      return this.resolveParkedSpending(organizationId, who, parked, decision);
    }
    if (parked.kind === 'request_decision') {
      return this.resolveParkedDecision(organizationId, who, parked, decision);
    }
    if (parked.kind === 'request_question') {
      return this.resolveParkedRequestQuestion(organizationId, who, parked, decision);
    }
    if (parked.kind === LEAVE_ANSWER_KIND) {
      return this.resolveParkedLeaveAnswer(organizationId, who, parked, decision);
    }
    if (parked.kind === 'document_numbers') {
      return this.resolveParkedDocumentNumbers(organizationId, who, parked, decision);
    }
    if (parked.kind === 'context_line') {
      return this.resolveParkedContextLine(organizationId, who, parked, decision);
    }
    if (parked.kind === 'lead_note') {
      return this.resolveParkedLeadNote(organizationId, who, parked, decision);
    }
    if (parked.kind === 'share_lead_note') {
      return this.resolveParkedShareLeadNote(organizationId, who, parked, decision);
    }
    if (parked.kind === 'change_context_line') {
      return this.resolveParkedChangeContextLine(organizationId, who, parked, decision);
    }
    if (parked.kind === 'move_deadline' || parked.kind === 'add_commitment' || parked.kind === 'tick_off') {
      return this.resolveParkedChange(organizationId, who, parked, decision);
    }
    if (parked.kind === 'question_for_person') {
      return this.resolveParkedQuestionForPerson(organizationId, who, parked, decision);
    }
    if (parked.kind === JOB_CORRECTION_KIND) {
      return this.resolveParkedJobCorrection(organizationId, who, parked, decision);
    }
    if (parked.kind === ROLE_INTERVIEW_CONFIRM_KIND) {
      return this.resolveParkedInterviewConfirm(organizationId, who, parked, decision);
    }

    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({
        where: { id: parked.id },
        data: { state: 'DECLINED', resolvedAt: new Date() },
      });
      return rules('confirm_commitment', text('I have left it as it was. Nothing was recorded.'));
    }

    /* RE-VERIFY at execution: still a person here, still active. */
    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: who, active: true },
      select: { id: true },
    });
    if (!person) {
      await this.prisma.assistantProposal.update({
        where: { id: parked.id },
        data: { state: 'DROPPED', resolvedAt: new Date() },
      });
      return rules('confirm_commitment', text('I could not write that down, because I can no longer see you in your organisation records.'));
    }

    const payload = parked.payload as { text: string; dueSaid: string | null };
    const created = await this.prisma.commitment.create({
      data: {
        organizationId,
        personExternalId: who,
        text: payload.text,
        dueSaid: payload.dueSaid,
        /* Never inferred. They said words, not a date. */
        dueAt: null,
        source: 'assistant',
      },
    });

    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: 'ACCEPTED', resolvedAt: new Date(), createdCommitmentId: created.id },
    });

    /* READ BACK. Success is reported on what the database confirms, never on intent. */
    const confirmed = await this.prisma.commitment.findUnique({ where: { id: created.id } });
    if (!confirmed) return rules('confirm_commitment', text('I tried to note that and cannot see it on the record, so treat it as not written down.'));

    return rules('confirm_commitment', text(`I have written down "${confirmed.text}". It will come back to you in your next check-in.`));
  }

  /**
   * WHAT THE RECORD IS ASKING YOU TO DECIDE.
   *
   * NOT COMPOSED, and that is the same call as `how_we_work`. `says` is the detector's sentence
   * about a named colleague, carrying the evidence that produced it - a model asked to make it read
   * better would reword the one part that has to survive intact. The wording rules exist to smooth
   * the product's own voice, not to restate a finding about a person.
   *
   * ONE AT A TIME. `pendingFor` returns them ranked, and the list is shown so nothing is hidden,
   * but only the top one is put as a question. Parking two would mean a "yes" that could not be
   * matched to what it answered - and the parked-proposal machinery is deliberately built around
   * exactly one open question, because that is the only way a bare "yes" is unambiguous.
   */
  private async whatShouldWeTalkAbout(organizationId: string, who: string | null): Promise<Reply> {
    if (!who) return rules('what_should_we_talk_about', text('I cannot find you in what your organisation has sent us.'));

    /* Mapped, not cast. `says` lives inside the evidence blob - see `fromRow`. */
    const kept = await keptInTheApp(this.prisma as any, organizationId);
    const pending = (await this.scenarios.pendingFor(organizationId, who)).filter((r: any) => mayBeRead(kept, r?.groundId)).map(fromRow);
    if (!pending.length) return rules('what_should_we_talk_about', text(NOTHING_PENDING));

    const now = new Date();
    const top = pending[0];

    /*
     * The rest are listed, not asked about. Somebody with four pending suggestions being asked
     * about one of them and told nothing of the others would reasonably think there was one.
     */
    const others = pending.slice(1).map((s) => `- ${suggestionLine(s, now)}`);
    const body = [
      suggestionLine(top, now),
      askAbout(top),
      ...(others.length ? ['', `${others.length} more waiting on you:`, ...others] : []),
    ].join('\n');

    /*
     * PARKED BEFORE THE REPLY GOES OUT, so a "yes" typed immediately has something to land on. The
     * candidate id is all the payload carries: re-reading the candidate at the moment of the answer
     * is what makes an expired or already-decided one fail honestly rather than firing on a stale
     * copy of itself.
     */
    await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'scenario',
        summary: suggestionLine(top, now),
        payload: { candidateId: top.id, scenario: top.scenario },
      },
    });

    return rules('what_should_we_talk_about', text(body));
  }

  /**
   * THE ANSWER TO A SUGGESTION, which is a different thing from the answer to a noted commitment.
   *
   * Both arrive through the same parked question and the same yes/no/drop reading of the reply -
   * that part should never be duplicated, since it is the piece that decides whether an ambiguous
   * message fires a write. What differs is only what a yes means, so this branches on `kind` and
   * nowhere else.
   */
  /**
   * OPENING THE CHECK-IN, OR NOT.
   *
   * RE-READ AT EXECUTION, and here it matters more than anywhere else in this file. Between the
   * offer and the yes somebody may have left, been deactivated, or had their address removed — and
   * this is the one act that puts a message in another person's inbox. A parked action carries the
   * roster it was offered under, which is exactly what must not be trusted.
   *
   * Anybody who has gone is DROPPED AND NAMED rather than silently skipped: a check-in that quietly
   * opened without one of the people somebody agreed to is a check-in they will read the report of
   * and not understand.
   */
  private async resolveParkedOpening(
    organizationId: string,
    personId: string,
    who: string,
    parked: any,
    decision: 'accept' | 'decline',
  ): Promise<Reply> {
    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });

    if (decision === 'decline') return rules('start_a_check_in', text('I have left it as it was. Nothing was sent.'));

    const payload = parked.payload as { scenario: string; label: string; people: string[] };

    const still = await this.prisma.person.findMany({
      where: { organizationId, externalId: { in: payload.people }, active: true },
      select: { externalId: true, displayName: true, email: true },
    });
    const gone = payload.people.filter((id) => !still.some((p) => p.externalId === id));
    const reachable = still.filter((p) => p.email);
    const noAddress = still.filter((p) => !p.email).map((p) => p.displayName ?? p.externalId);

    if (reachable.length === 0) {
      return rules(
        'start_a_check_in',
        text('I did not open it: none of those people can be reached now. Nothing was sent.'),
      );
    }

    const me = await this.prisma.person.findFirst({
      where: { organizationId, externalId: who, active: true },
      select: { linkedUserId: true },
    });
    if (!me?.linkedUserId) {
      return rules(
        'start_a_check_in',
        text('I could not open it in your name, because your sign-in is not linked to a person here yet, and a check-in has to belong to somebody. Nothing was sent.'),
      );
    }

    const ground = await this.grounds.create(organizationId, me.linkedUserId, {
      label: payload.label,
      scenario: payload.scenario as never,
      moment: 'STARTING' as never,
    });

    for (const p of reachable) {
      await this.grounds.addParticipant(ground.id, organizationId, me.linkedUserId, {
        email: p.email as string,
      });
    }

    const said = [`I have opened "${payload.label}". ${saidAsAList(reachable.map((p) => p.displayName ?? p.externalId))} ${reachable.length === 1 ? 'has' : 'have'} been invited.`];
    /* Named, not counted, in both directions — the same rule the offer runs on. */
    if (gone.length) said.push(`${saidAsAList(gone)} ${gone.length === 1 ? 'is' : 'are'} no longer on the roster, so ${gone.length === 1 ? 'they were' : 'they were'} left out.`);
    if (noAddress.length) said.push(`${saidAsAList(noAddress)} ${noAddress.length === 1 ? 'has' : 'have'} no email address on the roster and could not be invited.`);

    return rules('start_a_check_in', text(said.join(' ')));
  }

  /**
   * WHO THE DOCUMENT IS FOR.
   *
   * The file is already in and already private. This only ever OPENS it, and only on an answer clear
   * enough to act on — anything ambiguous asks again rather than guessing, because guessing in the
   * permissive direction publishes somebody's document to their team and there is no undo for that.
   *
   * The proposal stays parked while the answer is unclear, so somebody can say it properly rather
   * than starting again.
   */
  private async resolveParkedDocument(organizationId: string, who: string, parked: any, message: string): Promise<Reply> {
    const payload = parked.payload as { documentId: string; groundId: string; fileName: string; elsewhere?: boolean };
    const meant = whoTheyMeant(message);

    if (meant === null) return rules('add_a_document', text(askAgain()));

    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: 'ACCEPTED', resolvedAt: new Date() },
    });

    /* OWN is where it already is. Saying so is not a write — and a write that changes nothing is
       still a write somebody has to be able to account for. */
    if (meant !== 'OWN') {
      /* Two tables, one question. A document that lives elsewhere is recorded in
         its own table precisely so nothing that assembles document TEXT can reach
         it — which means this has to know which of the two it is holding. */
      if (payload.elsewhere) {
        await this.prisma.documentElsewhere.update({
          where: { id: payload.documentId },
          data: { visibility: meant },
        });
      } else {
        await this.prisma.groundDocument.update({
          where: { id: payload.documentId },
          data: { visibility: meant },
        });
      }
    }

    return rules('add_a_document', text(whatWasDone(payload.fileName, meant)));
  }

  /**
   * SENDING IT, OR NOT.
   *
   * RE-READ AT EXECUTION, like every other confirmed act here: between the offer and the yes their
   * address may have changed or been removed, and a parked action carries the address it was offered
   * under. Mail to a stale address is the one mistake that cannot be taken back.
   */
  private async resolveParkedDelivery(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });

    if (decision === 'decline') return rules('send_me_that', text('I have left it here. Nothing was sent to your email.'));

    const me = await this.prisma.person.findFirst({
      where: { organizationId, externalId: who, active: true },
      select: { displayName: true, email: true },
    });
    if (!me?.email) {
      return rules('send_me_that', text('I could not send it: there is no longer an email address for you in your organisation records.'));
    }

    const latest = parked.payload as { body: string; about: string; lane: string };
    const mail = theMail(latest, me);

    try {
      await this.email.sendMeThat(me.email, mail.subject, mail.text);
    } catch (error) {
      /* Said plainly rather than swallowed. Somebody who asked for an email and got a cheerful
         "sent" that never arrived stops trusting everything else this says. */
      this.logger.warn(`Could not send to ${who}: ${(error as Error).message}`);
      return rules('send_me_that', text('I could not send it just now, so treat it as not sent. It is still here.'));
    }

    return rules('send_me_that', text(`I have sent it to ${me.email}. Nobody else was copied.`));
  }

  private async resolveParkedScenario(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    const payload = parked.payload as { candidateId: string; scenario: string };

    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });

    try {
      /*
       * `decide` re-checks that this suggestion was put to this person and is still open. It throws
       * on an expired or already-answered one, and that is caught rather than allowed out: the
       * person did nothing wrong by answering a question the product asked them, and a 404 in a
       * chat window is the product blaming them for its own timing.
       */
      const decided = fromRow(await this.scenarios.decide(organizationId, payload.candidateId, who, decision === 'accept'));

      if (decision !== 'accept') {
        return rules('what_should_we_talk_about', text(declinedLine(COOLING_DAYS)));
      }

      /* The words say what happened; the block says where setting it up lives. Kept apart so the
         panel can route it into the customer's own application instead of sending somebody out of
         their own system - see `acceptedNextStep`. */
      return rules(
        'what_should_we_talk_about',
        text(acceptedLine(decided)),
        { type: 'next_step', ...acceptedNextStep(decided) },
      );
    } catch {
      return rules('what_should_we_talk_about', text('That suggestion is no longer open, so there was nothing for me to record. Ask me what is waiting on you and I will tell you what still stands.'));
    }
  }

  /**
   * WHAT THE CHECK-INS PRODUCED, WHICH THE ASSISTANT HAD NO WAY OF KNOWING.
   *
   * Every table this service reads is about the present: objectives, commitments, contributions,
   * its own turns. The product's actual output - a released report with a question a group agreed
   * was the central one - was invisible to it, so "what did we decide about the platform work" was
   * answered from a handbook or not at all.
   *
   * SCOPED BY PARTICIPATION, THROUGH THE PARTICIPANT ROW, and this is the only reason a query here
   * is acceptable at all. A person reaches a report because they were in that check-in - the same
   * bridge `whereAmIUpTo` already uses, matching a `Person` to a `GroundParticipant` by email,
   * which is the one identifier the two share. Somebody who was not in it does not select the row,
   * so there is nothing to filter afterwards.
   *
   * RELEASED ONLY. An unreleased report exists in the database before its parties may read it -
   * `releasedAt` is set once, atomically, for everybody at the same moment, and a recall that ran
   * ahead of it would hand one person a report the others cannot see yet.
   *
   * NARROWER THAN THE REPORT PAGE, DELIBERATELY. That page also lets an org admin read with the
   * lead's eyes. This does not: asking a chat window one question and receiving every check-in in
   * the organisation is a different act from opening one report, and the narrower default is the
   * one to start from. It is a decision to revisit, not a limitation to work around.
   *
   * NOT COMPOSED. The agreements are what a group settled on, in the words the report recorded, and
   * the composer's job is wording - it would rewrite the one thing here that has to be quotable.
   */
  private async whatCameOfIt(organizationId: string, personId: string): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { email: true, linkedUserId: true },
    });
    if (!me?.email) return rules('what_came_of_it', text('I cannot find you in what your organisation has sent us.'));

    /* On WhatsApp, a check-in kept in the app is never recalled (decision 82, item 7). */
    const kept = await keptInTheApp(this.prisma as any, organizationId);
    const mine = await this.prisma.groundParticipant.findMany({
      where: { email: me.email, ground: { organizationId, ...notAKeptCheckIn(kept) } },
      select: {
        id: true,
        ground: {
          select: {
            id: true,
            label: true,
            initiatorId: true,
            createdByUserId: true,
            /*
             * WHOSE TARGET A COLLEAGUE MAY READ, read here because this pulls the report straight
             * from the ground rather than through reports.service.ts's `get`, which already runs
             * this net (`whatTheLeadHasNotShared`). Without it, a recall reached exactly what that
             * file's own comment warns about: Ngozi asking "what came of it" and being handed
             * Kwame's target inside the shared agreements, on a check-in where each person sees only
             * their own. See board/whose-number-is-whose-business and board/a-hidden-target-stays-hidden.
             */
            whoSeesTargets: true,
            objectives: { select: { name: true, ownerParticipantId: true, target: true } },
            /* A goal the lead has not told its person about is never recalled to anybody else (decisions 48 and 56). */
            personObjectives: { where: { awareness: 'NOT_TOLD' }, select: { participantId: true, text: true, awareness: true, authoredBy: true, createdAt: true } },
            /* The check-in's own naming rule, for the report's door below. */
            scenario: true,
            peersVisibleToEachOther: true,
            participants: {
              /* `createdAt`, so each person's stand-in letter is the one the stored report was written with. */
              select: {
                id: true, userId: true, email: true, createdAt: true, managingOnly: true, nameGiven: true, organisationGiven: true, roleAsDescribed: true, remitAsGiven: true, partyType: true,
                user: { select: { firstName: true, lastName: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
            /*
             * AN ALLOWLIST, NOT A ROW. `Report` also carries `engagement`, `finalSynthesis`,
             * `arcSignals` and `inferences` - per-person material that `own-reads-only.ts` exists
             * because it once went to everybody. Selecting the four shared fields by name means a
             * field added to the model later cannot arrive here by accident.
             */
            report: { select: { releasedAt: true, centralQuestion: true, agreements: true, divergences: true, sharedAs: true } },
          },
        },
      },
    });

    const finished = mine
      .filter((p): p is typeof p & { ground: NonNullable<typeof p.ground> & { report: { releasedAt: Date } } } =>
        Boolean(p.ground?.report?.releasedAt))
      .sort((a, b) => b.ground.report.releasedAt!.getTime() - a.ground.report.releasedAt!.getTime());

    if (!finished.length) {
      /* Two different silences, and which one it is is the useful part. */
      return rules('what_came_of_it', text(mine.length ? NOTHING_FINISHED : NOTHING_AT_ALL));
    }

    const now = new Date();
    const body: string[] = [];
    for (const p of finished.slice(0, ROUNDS_RECALLED)) {
      const g = p.ground;
      /* The same rule the report page runs, run again here because this is a second, direct read of
         the report - a target belonging to somebody else stays out of what is recalled to them. */
      const hiddenTargets = targetsHiddenFrom(
        { participantId: p.id, isTheLead: g.initiatorId === me.linkedUserId },
        g.whoSeesTargets,
        g.objectives ?? [],
        namesOnTheRoster(g.participants ?? []),
        g.participants ?? [],
      );
      /*
       * NAMED THROUGH THE REPORT'S OWN DOOR, AS THIS PERSON READS IT (decision 139, item 1). The three fields are stored in
       * labels, and this recall read them straight off the row: "Agreed: The price list has been sent by Participant B."
       * Names go in first, because the hidden-target rule below looks for a person's name.
       */
      const named = this.theRecallAsThisPersonReadsIt(g as any, p.id, theyRunThisCheckIn(me.linkedUserId, g as any));
      const guarded = withoutGoalsNotToldIn(withoutHiddenTargetsIn(
        named,
        hiddenTargets,
      ), theWordsOfWhatTheLeadHasNotToldThemAbout(g.objectives ?? [], ((g as any).personObjectives ?? []) as any[], (g.participants ?? []) as any[], theyRunThisCheckIn(me.linkedUserId, g as any)));
      const r = recall({
        groundLabel: g.label,
        releasedAt: g.report.releasedAt!,
        centralQuestion: guarded.centralQuestion,
        agreements: guarded.agreements,
        divergences: guarded.divergences,
      });
      body.push(...saidOf(r, howLongAgo(r.when, now)), '');
    }
    if (finished.length > ROUNDS_RECALLED) {
      body.push(`${finished.length - ROUNDS_RECALLED} earlier check-ins are on your check-ins page.`);
    }

    const newest = finished[0];
    return this.withItsSource(
      rules('what_came_of_it', text(body.join('\n').trim())),
      aReportSource({ on: newest.ground.report.releasedAt, label: newest.ground.label, groundId: (newest.ground as any).id }),
    );
  }

  /**
   * THE RECALLED FIELDS, THROUGH `ReportsService.theReportAsItWasShared` FOR THIS READER, and then the last-line guard,
   * so no stand-in label ("Participant A", "the initiator") is ever recalled to anybody. Where the door is not wired in,
   * the guard alone says every label the way this person may call that person; on a copy shared without names, nobody
   * is named to somebody who does not run the check-in.
   */
  private theRecallAsThisPersonReadsIt(
    g: { scenario?: any; peersVisibleToEachOther?: boolean | null; initiatorId?: string | null; participants?: any[]; report: { centralQuestion: string | null; agreements: unknown; divergences: unknown; sharedAs?: string | null } },
    participantId: string,
    runsIt: boolean,
  ): { centralQuestion: string | null; agreements: unknown; divergences: unknown } {
    const asStored = { centralQuestion: g.report.centralQuestion, agreements: g.report.agreements, divergences: g.report.divergences };
    let named: any = asStored;
    try {
      const shared = this.reports
        ? askTheReportsDoor(this.reports as any, { scenario: g.scenario, peersVisibleToEachOther: g.peersVisibleToEachOther, initiatorId: g.initiatorId ?? null, participants: g.participants ?? [], report: { ...asStored, sharedAs: g.report.sharedAs ?? null } }, participantId, runsIt)
        : null;
      if (shared) named = { centralQuestion: shared.centralQuestion ?? null, agreements: shared.agreements ?? [], divergences: shared.divergences ?? [] };
    } catch (e) {
      this.logger.warn(`The recall could not reach the report's door: ${(e as Error)?.message}`);
    }
    const called = whatThisReaderCallsEachLabel((g.participants ?? []) as any[], {
      participantId,
      isLead: runsIt,
      peersAreNamed: peersAreNamedOn(g as any, { participantId }),
      sharedWithoutNames: g.report.sharedAs === 'ANONYMOUS',
    });
    return noStandInLabelAnywhereIn(named, called);
  }

  /** The running history, scoped to one person and never anybody else's turns. */
  private async remember(organizationId: string, who: string, message: string, reply: Reply) {
    await this.prisma.assistantTurn.createMany({
      data: [
        { organizationId, personExternalId: who, role: 'person', content: message },
        {
          organizationId, personExternalId: who, role: 'assistant',
          content: whatWasSaid(reply), lane: reply.lane, composedBy: reply.composedBy,
        },
      ],
    });
  }

  /**
   * WHAT THEY SAID THEY WOULD DO, AND WHICH OF IT IS LATE.
   *
   * Late is only ever said about a commitment that carried a real date. One with words and no date
   * is listed as what it is - something they said - and never as something they have missed.
   */
  /**
   * THE DRAFT'S NEXT QUESTION IS ANSWERED HERE.
   *
   * Only when a draft of theirs is still asking and no lane claimed the message. The draft's own
   * refusal ("that is not a measure") is returned as the reply, so the screen and the chat say the
   * same thing about the same answer. When the last piece lands, the offer to set it follows.
   */
  private async continueTheDraft(organizationId: string, who: string, message: string): Promise<Reply | null> {
    /* A draft that cannot be read is no draft: this must never be the reason a plain message gets no answer. */
    const open = await Promise.resolve(
      this.prisma.objectiveDraft?.findFirst({
        where: { organizationId, initiatorExternalId: who, state: { in: ['DRAFTING', 'CONTESTED'] } },
        orderBy: { updatedAt: 'desc' },
      }) ?? null,
    ).catch(() => null);
    if (!open) return null;
    const next = whatToAskForNext(open);
    if (!next) return null;
    try {
      const r = await this.drafts.answer(organizationId, open.id, who, next.piece, message);
      if (r.askNext) return rules('set_an_objective', text(`I have noted that. ${r.askNext.asks}`));
      const fresh = await this.prisma.objectiveDraft.findUnique({ where: { id: open.id } });
      return this.offerToSeed(organizationId, who, fresh ?? open);
    } catch (err: any) {
      const why = err?.message ?? 'That did not read as an answer.';
      return rules('set_an_objective', text(`${why} ${next.asks}`));
    }
  }

  /**
   * SET IT, AFTER A PLAIN YES. The draft becomes an objective on the organisation's own board -
   * the same subjects the API lists - owned by the person who drafted it. Never on a maybe, and
   * never by the assistant deciding the draft is good enough: the drafting service's own readiness
   * rule is asked first, and its reason is the reply when it says no.
   */
  private async offerToSeed(organizationId: string, who: string, draft: { id: string; workingTitle: string }): Promise<Reply> {
    const status = await this.drafts.status(organizationId, draft.id, who);
    if (!status.ready) return rules('set_an_objective', text(`"${draft.workingTitle}" has your answers. It cannot be set yet: ${status.because}`));
    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'seed_objective',
        summary: `Set "${draft.workingTitle}" as an objective on your organisation's board, owned by you? Yes to set it, no to leave it as a draft.`,
        payload: { draftId: draft.id, title: draft.workingTitle } as any,
      },
    });
    return {
      lane: 'set_an_objective',
      composedBy: 'rules',
      blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
    };
  }

  private async resolveParkedSeed(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });
    const payload = parked.payload as { draftId: string; title: string };
    if (decision === 'decline') return rules('set_an_objective', text(`I have left it as a draft. "${payload.title}" is still here when you want it.`));
    try {
      const r = await this.drafts.seed(organizationId, payload.draftId, `chat-${payload.draftId}`, 'groundwork-chat', who);
      return rules(
        'set_an_objective',
        text(`I have set it. "${payload.title}" is on your organisation's board as an objective you own (subject ${r.subjectExternalId}). Check-ins against it read your evidence from here on.`),
      );
    } catch (err: any) {
      return rules('set_an_objective', text(`I could not set it: ${err?.message ?? 'something refused it'}. The draft is still here.`));
    }
  }

  /*
   * --- ADDING CONTEXT TO A CHECK-IN (decision 50, step (b), piece 1) ---
   *
   * THE ONE CHAT, CALLING THE OLD CHAT'S OWN CODE. Nothing here re-implements what a check-in still
   * needs, how a document is read, how a target is matched to a person, or the confirm-before-saving
   * rule - `GroundsService.contextChat` and `GroundsService.applyContextProposal` do all of that,
   * unchanged, exactly as `POST :id/context-chat` and `.../confirm` still call them. This is why the
   * rules are the same BY CONSTRUCTION rather than by two copies agreeing: there is only one copy.
   *
   * See docs/context-chat-inventory.md for the full list of what those two methods already do and
   * keep doing here for free - reading documents, hiding bank details, matching names, recognising a
   * paste, hearing a change, requiring a yes before anything is written.
   */

  /**
   * WHO MAY ADD CONTEXT TO WHICH CHECK-IN, and which one this message is about.
   *
   * THE SAME PERMISSION RULE THE CONTEXT CHAT USES, not a copy of it: `runsIt` is the shared function
   * behind `contextChat`'s own guard (`ground.initiatorId !== requestingUserId && !isOrgAdmin`) - the
   * lead who started the check-in, or an admin of this organisation covering for them. A participant
   * or a guest never has a check-in in this list, so they fall straight through to the ordinary
   * unplaced reply below, never into the setup conversation (item 3 in the inventory).
   */
  private async addContext(
    organizationId: string,
    who: string | null,
    userId: string | null,
    groundId: string | undefined,
    message: string,
  ): Promise<Reply> {
    if (!who || !userId) {
      const { line, options } = whatICanDoWith(message);
      return rules('unplaced', text(line), picker(options));
    }

    const grounds = await this.prisma.ground.findMany({
      where: { organizationId, status: { notIn: A_GROUND_IS_OVER } },
      select: { id: true, label: true, createdAt: true, initiator: { select: { firstName: true } }, initiatorId: true, organizationId: true, scenario: true, createdByUserId: true, participants: { select: { userId: true } } },
    });
    const viewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, organizationId: true } });
    /*
     * AND ONLY THE CHECK-INS THIS PERSON MAY SET UP (decisions 63 and 72): their own, or one whose lead
     * has left the organisation, for an admin of it. An admin is no longer offered the setup
     * conversation on a check-in its lead is still running; `contextChat` refuses it too.
     */
    const candidates = [] as typeof grounds;
    for (const g of grounds.filter((x) => runsIt(userId, viewer, x))) {
      if (g.initiatorId === userId || (await this.grounds.mayOpenSetupChatFor(g.id, userId, organizationId).catch(() => false))) candidates.push(g);
    }

    /*
     * NOBODY TO SET UP. Not the lead or an admin of anything here, so this is answered exactly as an
     * unplaced message would be - never the setup conversation, and never a reason given that would
     * tell a participant "you are not senior enough", which is not this product's business to say.
     */
    if (!candidates.length) {
      const { line, options } = whatICanDoWith(message);
      return rules('unplaced', text(line), picker(options));
    }

    let target = groundId ? candidates.find((g) => g.id === groundId) : undefined;
    if (!target && !groundId) {
      if (candidates.length === 1) {
        target = candidates[0];
      } else {
        /* NAMED, NOT GUESSED. Two check-ins mentioned by the same word would match both and neither
           is chosen - the same refusal-to-guess the document and paste readers keep (inventory item 21). */
        const named = message.toLowerCase();
        const byName = candidates.filter((g) => named.includes(g.label.toLowerCase()));
        if (byName.length === 1) target = byName[0];
      }
    }

    if (!target) {
      const proposal = await this.prisma.assistantProposal.create({
        data: {
          organizationId,
          personExternalId: who,
          kind: 'which_context_check_in',
          summary: `Which check-in do you mean? ${toldApart(candidates).map((g) => g.label).join(', ')}.`,
          payload: { candidates: toldApart(candidates).map((g) => ({ groundId: g.id, label: g.label })), said: message, purpose: 'setup' } as never,
        },
      });
      return {
        lane: 'add_context',
        composedBy: 'rules',
        blocks: [text(proposal.summary), picker(candidates.map((g) => ({ key: g.id, label: g.label })))],
      };
    }

    return this.setUpTurn(organizationId, who, userId, target.id, message);
  }

  /**
   * Somebody answered "which check-in", by name or by picking one. Never a yes or a no.
   *
   * `purpose` says which of the four setup doors asked the question in the first place - missing on
   * an older parked row (or in a test that predates this), which reads as `'setup'`, the only purpose
   * that existed before items 8, 9 and 17 were added, so nothing already parked breaks.
   */
  private async resolveParkedWhichCheckIn(organizationId: string, who: string, parked: any, message: string): Promise<Reply> {
    const payload = parked.payload as {
      candidates: { groundId: string; label: string }[];
      said: string;
      purpose?: 'setup' | 'context_line' | 'lead_note' | 'questions_for_people';
    };
    const said = message.trim();
    const byKey = payload.candidates.find((c) => c.groundId === said);
    const byName = payload.candidates.filter((c) => said.toLowerCase().includes(c.label.toLowerCase()));
    const found = byKey ?? (byName.length === 1 ? byName[0] : undefined);

    if (!found) {
      return {
        lane: 'add_context',
        composedBy: 'rules',
        blocks: [
          text(`I still cannot tell which check-in you mean. Say one of: ${payload.candidates.map((c) => c.label).join(', ')}.`),
          picker(payload.candidates.map((c) => ({ key: c.groundId, label: c.label }))),
        ],
      };
    }

    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });

    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) {
      return rules('add_context', text('I could not open that check-in, because I can no longer see you in your organisation records.'));
    }

    switch (payload.purpose) {
      case 'context_line': {
        const parsed = parseContextLine(payload.said);
        if (!parsed) return rules('add_context', text('Say the kind and the line - for example "decision: we will drop the pilot" - and I will add it.'));
        return this.proposeContextLine(organizationId, who, found.groundId, parsed);
      }
      case 'lead_note': {
        const parsed = parseLeadNote(payload.said);
        if (!parsed) return rules('add_context', text('Say the note after "private note:" and I will keep it, just for you.'));
        return this.proposeLeadNote(organizationId, who, found.groundId, parsed);
      }
      case 'questions_for_people':
        return this.questionsForPeopleByChat(organizationId, who, person.linkedUserId, found.groundId, payload.said);
      case 'setup':
      default:
        return this.setUpTurn(organizationId, who, person.linkedUserId, found.groundId, payload.said);
    }
  }

  /**
   * ONE TURN OF THE SET-UP CONVERSATION IN ASK: WHAT KIND OF THING WAS SAID, AND WHICH DOOR IT GOES THROUGH
   * (B-083, B-084).
   *
   * The set-up conversation used to take every message as the answer to whichever question was open,
   * so a fact was offered back as what doing well looks like, "I want to add a document" became a
   * measure, and a sentence that was neither was dropped. Here the lead's words are first sent to the
   * door that fits them, and only an answer, a goal or a measure reaches the set-up conversation:
   *
   *   a document to add, or one just added   -> the document door (a file control, then what it holds)
   *   a line typed with its kind              -> the typed-in line door
   *   a private note                          -> the lead's note door (for the lead alone)
   *   a question for one person               -> the questions-for-people door (decision 34)
   *   a fact, a rule, a decision, a strategy, or something not settled -> a line everybody in the check-in reads
   *   anything else                           -> the set-up conversation, as before
   *
   * Every door says it back and writes only on a yes, through the writer the old chat and the Context
   * page already use, so the same words write the same rows. The kind is read by the model; which door
   * it goes through, and that the words kept are the lead's own, is code.
   */
  private async setUpTurn(
    organizationId: string,
    who: string,
    userId: string,
    groundId: string,
    message: string,
    priorHistory?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<Reply> {
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { id: true } });
    const document = asksToAddADocument(message);
    if (document && person) {
      /*
       * "FOR THE WHOLE ORGANISATION" IS WHERE IT GOES, EVEN WITH A CHECK-IN'S SETUP CONVERSATION OPEN (local test of staging,
       * 15 October). Hafsah, an admin who runs "Sales check-in", pressed Ask's "+" while its setup conversation was waiting;
       * she sent "I want to add a document for the whole organisation." and read "It will go on "Sales check-in"". An admin
       * who says so is offered the organisation's own document, exactly as with no conversation open.
       */
      if (document === 'wants' && SAYS_IT_IS_FOR_THE_WHOLE_ORGANISATION.test(message) && (await this.isAnAdminHere(organizationId, userId).catch(() => false))) {
        return this.offerADocumentForTheOrganisation(organizationId);
      }
      if (document === 'wants') return this.addADocument(organizationId, person.id, who, message, groundId, userId);
      return this.whatTheDocumentHolds(organizationId, person.id, who, userId, groundId, message);
    }
    if (parseChangeContextLine(message) || parseContextLine(message)) return this.addContextLineByChat(organizationId, who, userId, groundId, message);
    if (parseLeadNote(message) || /\bshare\s+(?:the|my|this)\s+note\b/i.test(message)) return this.addLeadNoteByChat(organizationId, who, userId, groundId, message);
    if (parseAskAPerson(message)) return this.questionsForPeopleByChat(organizationId, who, userId, groundId, message);
    /*
     * "I WANT TO DO MY OWN CHECK-IN", SAID IN THE SETUP CONVERSATION (pilots, 13 October 2026, problem 6). It was read as
     * an answer to the setup question and asked about the rhythm. It opens her own check-in on this one, through the
     * same door as Check in yourself, and says where it is.
     */
    if (A_WISH_TO_CHECK_IN_MYSELF.test(message)) {
      const opened = await openTheLeadsCheckIn(this.prisma, groundId, organizationId, userId).catch(() => null);
      if (opened) return rules('start_a_check_in', text('Your own check-in is open. Open it to answer.'), { type: 'next_step', label: 'Open my check-in', href: `/checkin/${opened.checkInId}`, kind: 'open_a_check_in', id: opened.checkInId });
    }
    /* A question is answered, from the documents, to the asker alone; it is never offered as a line (pilots, problem 1). */
    if (isAQuestion(message) && !looksLikeADump(message)) return this.aQuestionAnsweredFromTheDocuments(organizationId, who, userId, groundId, message, priorHistory);
    if (looksLikeADump(message)) return this.runContextChat(organizationId, who, userId, groundId, message, priorHistory);

    /* What is open, so the model can tell an answer to it from something else, and so it is asked again afterwards. */
    const lastAsked = [...(priorHistory ?? [])].reverse().find((h) => h.role === 'assistant')?.content ?? null;
    const heard = await whatKindOfThingWasSaid(this.engine as any, message, lastAsked);
    const carried = priorHistory?.length ? { history: priorHistory, openQuestion: lastAsked } : undefined;
    if (heard.kind in LINE_KINDS) {
      return this.proposeContextLine(organizationId, who, groundId, { kind: LINE_KINDS[heard.kind as keyof typeof LINE_KINDS], text: (heard as any).text }, carried);
    }
    if (heard.kind === 'private_note') return this.proposeLeadNote(organizationId, who, groundId, { about: heard.about, text: heard.text }, carried);
    if (heard.kind === 'question_for_person') {
      return this.proposeAQuestionForAPerson(organizationId, who, userId, groundId, { name: heard.about, leadWords: `Ask ${heard.about}: ${heard.question}` });
    }
    return this.runContextChat(organizationId, who, userId, groundId, message, priorHistory);
  }

  /**
   * A DOCUMENT THE LEAD SAYS THEY HAVE JUST ADDED: WHAT WAS READ IN IT, SAID BACK, AND NOTHING KEPT ON ITS OWN.
   * The numbers, the whole-document read and the plain description are the old chat's own. When the file
   * has no numbers and is not a plan, the lead is still told what it was read as, and that it stays
   * private to them until they share it. A file still being read, or none at all, is said honestly.
   */
  private async whatTheDocumentHolds(organizationId: string, personId: string, who: string, userId: string, groundId: string, message: string): Promise<Reply> {
    if (/https?:\/\/\S+/i.test(message) && message.length < 600) return rules('add_a_document', text(A_LINK_IS_NOT_READ));
    const whole = await this.aDocumentToReadWhole(organizationId, personId, userId, groundId);
    if (whole) return this.runContextChat(organizationId, who, userId, whole.groundId, whole.text, undefined, whole.documentId);
    const waiting = await this.waitingDocumentFor(organizationId, personId, groundId);
    if (waiting) return this.proposeDocumentNumbers(organizationId, who, waiting);
    const mine = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId }, select: { id: true } });
    const latest = mine
      ? await this.prisma.groundDocument.findFirst({ where: { groundId, participantId: mine.id }, orderBy: { createdAt: 'desc' }, select: { fileName: true, content: true, holds: true, visibility: true } })
      : null;
    if (!latest) {
      return this.addADocument(organizationId, personId, who, 'add a document', groundId, userId);
    }
    if (!(latest.content ?? '').trim() && !latest.holds) {
      return rules('add_a_document', text(`I am still reading ${latest.fileName}. Tell me again that you have added it in a moment, and I will say what I found.`));
    }
    const what = String(((latest.holds ?? {}) as any).whatItIs ?? '').trim().replace(/[.]+$/, '');
    const who2 = latest.visibility === 'OPEN' ? 'Everybody in this check-in can read it.' : 'Only you can read it until you share it.';
    return rules('add_a_document', text(
      `I have read ${latest.fileName}.${what ? ` It looks like ${/^(a|an|the)\b/i.test(what) ? what : `${what}`}.` : ''} `
      + `It does not hold a number for anybody, so there is nothing in it for me to record as a target. ${who2} `
      + 'If there is a fact, a rule or a decision in it that you want everybody to know, tell me in a sentence and I will say it back to you first.',
    ));
  }

  /**
   * THE ACTUAL CALL, TO THE SAME SERVICE METHOD THE OLD ROUTE CALLS.
   *
   * `history` carries only this one message: Ask Groundwork does not keep the setup conversation's
   * own turns (see `respond`, and inventory item 2), so each turn is sent as though it opened the
   * conversation, the same way the old chat's first message would. `contextChat` computes what is
   * missing from the ground's own record, not from the history, so this loses nothing there; what a
   * longer history would add is pronoun resolution across several turns in one sitting, which is why
   * a proposal still waiting for a yes carries its own `said`/`history` forward in its payload rather
   * than depending on Ask Groundwork's turn log.
   */
  /**
   * `priorHistory` is what item 2 adds: the turns this setup conversation has already had, for THIS
   * check-in and THIS lead, so a bare answer with nothing else in it ("twelve weeks") has something
   * to land on instead of being read as a fresh, contextless message. Omitted, this behaves exactly
   * as it always has - a single-message history, as though the conversation just opened.
   */
  private async runContextChat(
    organizationId: string,
    who: string,
    userId: string,
    groundId: string,
    said: string,
    priorHistory?: { role: 'user' | 'assistant'; content: string }[],
    /** The document these words are, when a document is being read as a paste. A yes marks it taken. */
    documentId?: string,
  ): Promise<Reply> {
    /*
     * AN EMPTY OPENER IS AN EMPTY HISTORY, NOT AN EMPTY TURN.
     *
     * Decision 65's opener sends `said: ''` to mean "start" - the same thing the old route's client
     * sends as `history: []` on the very first call. This used to build `[{ role: 'user', content: '' }]`
     * and hand THAT to `GroundsService.contextChat`, which maps it straight into a message sent to the
     * model - Gemini refuses an empty user turn with a 400, surfaced to the person as a 503. The old
     * route never does this: `dto.history ?? []` is empty, and `contextChat` itself substitutes
     * `{ role: 'user', content: 'Start.' }` only when `history.length` is zero. So an empty `said` with
     * nothing carried forward must produce the same empty array, never a turn with nothing in it - and
     * the same is true mid-conversation, in case a blank message ever reaches this with prior turns.
     */
    const history: { role: 'user' | 'assistant'; content: string }[] = said.trim()
      ? (priorHistory ? [...priorHistory, { role: 'user', content: said }] : [{ role: 'user', content: said }])
      : (priorHistory ?? []);
    const result = await this.grounds.contextChat(groundId, userId, history, { yesOrNo: true });

    if (result.proposal) {
      const proposal = await this.prisma.assistantProposal.create({
        data: {
          organizationId,
          personExternalId: who,
          kind: 'context',
          summary: result.proposal.say,
          /*
           * THE SAY-BACK IS PART OF THE HISTORY THE YES IS GIVEN, as it is on the old route, where the
           * client holds the conversation. A yes to a paste's list writes what participants are told only
           * when that sentence was in the list the lead read, and it can only tell from the list itself.
           */
          payload: {
            groundId, said, history: [...history, { role: 'assistant' as const, content: result.proposal.say }], openQuestion: (result as any).openQuestion ?? null,
            ...(documentId ? { documentId } : {}),
            /* What the yes is for when it is not a change to this check-in: a sentence to keep for the organisation, or leave (week 20). */
            ...((result.proposal as any).offerId ? { offerId: (result.proposal as any).offerId } : {}),
            /* A company rule said while a setup question was waiting: offered straight after this yes or no (decision 75, item 29). */
            ...((result.proposal as any).thenOffer ? { thenOffer: (result.proposal as any).thenOffer } : {}),
            ...(result.proposal.gap === 'leave_request' ? { leave: true } : {}),
          } as never,
        },
      });
      /*
       * NEVER AN EMPTY BUBBLE (found live, 1 October 2026, item 6). Where the lead answers with a yes
       * or a no the setup conversation says nothing beside the say-back, so `reply` is empty, and the
       * panel drew that empty text block as an empty bubble above the question. The say-back is then
       * the text as well, which the panel shows once, and it is also what is kept as the turn.
       */
      return {
        lane: 'add_context',
        composedBy: 'rules',
        blocks: [text(result.reply?.trim() ? result.reply : proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
      };
    }

    /*
     * ITEM 2: STILL GATHERING, NOTHING CONCRETE YET. `contextChat` is stateless - the ground's own
     * gaps decide what it asks next time, not this history - but PRONOUN RESOLUTION AND A BARE
     * ANSWER both need the turns said so far, which the old, client-held conversation always had and
     * a single Ask Groundwork message never does on its own. Parked as its own kind, `context_turn`,
     * rather than folded into the `context` kind above: a `context` proposal is a concrete value
     * waiting for a yes/no, and this is not one - the next message, whatever it is, is read as an
     * answer to keep gathering with, not as a decision.
     *
     * THIS USED TO READ `!result.done`, AND `done` IS `gaps.length === 0` - A FACT ABOUT THE GROUND'S
     * OWN STRUCTURAL SETUP, NOT ABOUT WHETHER THIS CONVERSATION IS FINISHED. Driven live: a lead told
     * a fully set-up check-in "Ben is struggling and honestly he is difficult to work with", was asked
     * what they had seen, answered on the next message - and that second message reached `contextChat`
     * with NO history at all, because `gaps.length === 0` on this ground made `done` true on the first
     * turn, so nothing had parked to carry the conversation forward. The coaching conversation in rule
     * 2 of `contextChatPrompt`, and an expectation of a named person, both carry on turn to turn
     * whether or not the ground still has a structural gap open - so what decides whether to keep
     * gathering is whether anything CONCRETE came back to confirm, not whether the ground's own setup
     * gaps happen to be empty.
     */
    if (!result.proposal) {
      const withReply = [...history, { role: 'assistant' as const, content: result.reply }];
      await this.prisma.assistantProposal.create({
        data: {
          organizationId,
          personExternalId: who,
          kind: 'context_turn',
          summary: result.reply,
          payload: { groundId, history: withReply } as never,
        },
      });
    }

    return rules('add_context', text(result.reply));
  }

  /**
   * THE NEXT TURN OF AN OPEN SETUP CONVERSATION (item 2). Not a yes/no: whatever the lead just said
   * is read as the answer to the gap `contextChat` just asked about, carrying the turns so far
   * forward. Re-verified the same way every other continuation here is - still linked to a user.
   */
  private async resolveParkedContextTurn(organizationId: string, who: string, parked: any, message: string): Promise<Reply> {
    const payload = parked.payload as { groundId: string; history: { role: 'user' | 'assistant'; content: string }[] };
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) {
      return rules('add_context', text('I could not continue that, because I can no longer see you in your organisation records.'));
    }
    if (parseAskAPerson(message)) return this.questionsForPeopleByChat(organizationId, who, person.linkedUserId, payload.groundId, message);
    return this.setUpTurn(organizationId, who, person.linkedUserId, payload.groundId, message, payload.history);
  }

  /**
   * THE YES OR THE NO, RUN THROUGH `applyContextProposal` - EXACTLY THE ROUTE THE OLD CONFIRM ENDPOINT
   * CALLS. `said` is the lead's own words that produced the proposal, not the word "yes": the value is
   * re-derived from what they typed, the same guarantee the old confirm route keeps (item 5).
   *
   * DECISION 63, 30 September 2026: `applyContextProposal` is the lead's, or - only once the lead has
   * left the organisation - an admin's, in their place; `mayConfirmSetupOn` decides which, in one
   * place, so this door and the old confirm route can never disagree. Before this it was the lead's
   * alone with no way through at all, the asymmetry inventory items 5 and 14 both flagged: an admin
   * covering for an absent lead could have the whole conversation and still be refused here, honestly
   * (not silently), by the catch below. That still happens - while the lead is still in the
   * organisation, this is unchanged.
   */
  private async resolveParkedContext(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      /*
       * A NO DOES NOT END THE CONVERSATION (request 92, point 10). Nothing was written, so whatever
       * was still open is still open: it is asked again, in the product's own words, and the next
       * message is read as its answer. The say-back that was just declined is not kept in what the
       * conversation carries forward, because nobody agreed to it.
       */
      const declined = parked.payload as { groundId?: string; history?: { role: 'user' | 'assistant'; content: string }[]; openQuestion?: string | null; offerId?: string; leave?: boolean; thenOffer?: { say: string; offerId: string } };
      /* A no to keeping something for the organisation deletes the offer: it is kept nowhere. */
      if (declined?.offerId && declined.groundId) {
        const asker = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
        if (asker?.linkedUserId) await this.grounds.declineContextOffer(declined.groundId, asker.linkedUserId, declined.offerId).catch(() => undefined);
      }
      /* After a no to the answer itself, the rule was never kept on this check-in either, so "It stays only on this check-in" would be untrue (reviewer, 14 October). */
      const left = declined?.offerId ? ((declined as any).answerDeclined ? NOT_KEPT_ANYWHERE : NOT_KEPT) : declined?.leave ? LEAVE_NOT_SENT : 'I have left it as it was. Nothing was changed.';
      /*
       * The company rule said with the answer is still offered, once, after the no (decision 75, item 29) - but
       * never when the rule IS the answer just refused (reviewer, 14 October): Grace said no to recording "Every
       * rep closes at least one deal a week with proof" and was asked at once whether to keep those same words
       * for the whole organisation. A no to the words is a no to the rule too, so the offer is put away.
       */
      if (declined?.thenOffer?.offerId && declined.groundId) {
        if (theRuleIsTheAnswerRefused(declined.thenOffer.say, (declined as any).said ?? parked.summary ?? '')) {
          const asker = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
          if (asker?.linkedUserId) await this.grounds.declineContextOffer(declined.groundId, asker.linkedUserId, declined.thenOffer.offerId).catch(() => undefined);
        } else {
          const before = [...(declined.history ?? [])];
          if (before.length && before[before.length - 1].role === 'assistant') before.pop();
          return this.offerTheRuleNext(organizationId, who, declined.groundId, left, declined.thenOffer, before, declined.openQuestion ?? null, true);
        }
      }
      /*
       * AFTER A NO, STOP (reviewer, 14 October; the same rule as `carryOn`). The no is said, and nothing else: the
       * open question is not asked again underneath it. Grace's second no brought the doing-well question back
       * word for word. The conversation keeps that question as what is still open, so her next message answers it.
       */
      const still = (declined?.openQuestion ?? '').trim();
      if (declined?.groundId) {
        const before = [...(declined.history ?? [])];
        if (before.length && before[before.length - 1].role === 'assistant') before.pop();
        await this.prisma.assistantProposal.create({
          data: {
            organizationId,
            personExternalId: who,
            kind: 'context_turn',
            summary: still || left,
            /* What the conversation carries still holds the question, so the model reads the next message as its answer; only the screen leaves it out. */
            payload: { groundId: declined.groundId, history: [...before, { role: 'assistant' as const, content: still ? `${left}\n\n${still}` : left }] } as never,
          },
        });
      }
      return rules('add_context', text(left));
    }

    const payload = parked.payload as {
      groundId: string;
      said: string;
      history: { role: 'user' | 'assistant'; content: string }[];
      offerId?: string;
      leave?: boolean;
      thenOffer?: { say: string; offerId: string };
      openQuestion?: string | null;
      documentId?: string;
    };

    /* RE-VERIFY at execution, same as every other write here: still linked to a user at all. */
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text('I could not save that, because I can no longer see you in your organisation records.'));
    }

    try {
      const applied = await this.grounds.applyContextProposal(payload.groundId, person.linkedUserId, {
        said: payload.said,
        history: payload.history,
        ...(payload.offerId ? { offerId: payload.offerId } : {}),
        ...(payload.leave ? { leave: true } : {}),
      });
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
      /* A document read as a paste is taken: its numbers are not offered a second time. */
      if (payload.documentId) await this.markADocumentTaken(payload.documentId);
      /* The company rule said with the answer is offered now, once (decision 75, item 29). */
      if (payload.thenOffer?.offerId) {
        return this.offerTheRuleNext(organizationId, who, payload.groundId, applied.say, payload.thenOffer, [...payload.history, { role: 'assistant' as const, content: applied.say }], null);
      }
      /*
       * FOUND LIVE, 30 September 2026, on the four live checks: after a lead confirmed what doing
       * well looks like, the very next reply opened with "This check-in runs for 12 weeks and people
       * check in once a week." again - the product's own opening line, which `contextChat` only ever
       * adds on the FIRST reply of a conversation (`isOpeningTurn`, in grounds.service.ts). This was
       * the first reply of a conversation, as far as `contextChat` could tell: nothing here carried
       * the fact that an assistant turn had already happened forward to the next message, the way
       * `runContextChat`'s "still gathering" branch below already does. Parked the same way, as a
       * `context_turn`, so the next message reaches `contextChat` with this confirmation in its own
       * history and `isOpeningTurn` reads false, exactly as it would on the old route's client-held
       * history.
       */
      await this.prisma.assistantProposal.create({
        data: {
          organizationId,
          personExternalId: who,
          kind: 'context_turn',
          summary: applied.say,
          payload: {
            groundId: payload.groundId,
            history: [...payload.history, { role: 'assistant' as const, content: applied.say }],
          } as never,
        },
      });
      return rules('add_context', text(applied.say));
    } catch (err: any) {
      /*
       * ANY REFUSAL IS SURFACED RATHER THAN SWALLOWED. An admin covering for an absent lead who is
       * still in the organisation can have had this whole conversation and still be refused here
       * (decision 63), and the honest answer says so instead of pretending it saved.
       */
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text(err?.message ?? 'That could not be saved.'));
    }
  }

  /**
   * A COMPANY RULE THE LEAD SAID WHILE A SETUP QUESTION WAS WAITING, OFFERED STRAIGHT AFTER THE ANSWER
   * (decision 75, item 29). Parked as its own proposal, the same as any offer to keep something for
   * the organisation: only a yes keeps it, and a no keeps nothing. What was still open is asked after it.
   */
  private async offerTheRuleNext(
    organizationId: string,
    who: string,
    groundId: string,
    first: string,
    offer: { say: string; offerId: string },
    history: { role: 'user' | 'assistant'; content: string }[],
    openQuestion: string | null,
    answerDeclined = false,
  ): Promise<Reply> {
    const row = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'context',
        summary: offer.say,
        payload: { groundId, said: '', history: [...history, { role: 'assistant' as const, content: offer.say }], openQuestion, offerId: offer.offerId, ...(answerDeclined ? { answerDeclined: true } : {}) } as never,
      },
      select: { id: true },
    });
    return { lane: 'add_context', composedBy: 'rules', blocks: [text(first), { type: 'proposal', proposalId: row.id, summary: offer.say }] };
  }

  /** The sign-in behind a roster entry, linked or matched by address (decision 82, item 6), for leave, hours and spending. */
  private async theSignInOf(organizationId: string, who: string): Promise<{ linkedUserId: string | null }> {
    const row = await this.prisma.person.findFirst({ where: { organizationId, externalId: who, active: true }, select: { linkedUserId: true, email: true } });
    return { linkedUserId: await theirSignIn(this.prisma, organizationId, row).catch(() => row?.linkedUserId ?? null) };
  }

  /**
   * LEAVE SAID TO ASK GROUNDWORK (week 20): said back with the days, the days left and who else is
   * off, parked, and sent through the leave suite only on a yes. While the suite is off it says so
   * and parks nothing, so nothing is kept. The days are not kept as context, a record line or a
   * to-do, and no reason is asked for.
   */
  private async proposeLeave(organizationId: string, who: string, userId: string, dates: { startsOn: string; endsOn: string }, message?: string): Promise<Reply> {
    /* The message is read only for the kind of leave, when the admin has set kinds (build step 8). */
    const said = await sayBackLeave(this.prisma, this.leave, { userId, organizationId }, dates, new Date(), message);
    if (!said.ok) return rules('ask_for_leave', text(said.say));
    const row = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: 'leave_request', summary: said.say, payload: { ...dates, ...(said.kind ? { kind: said.kind } : {}) } as never },
      select: { id: true },
    });
    return {
      lane: 'ask_for_leave',
      composedBy: 'rules',
      blocks: [text(said.say), { type: 'proposal', proposalId: row.id, summary: said.say }],
    };
  }

  private async resolveParkedLeave(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('ask_for_leave', text(LEAVE_NOT_SENT));
    }
    const dates = parked.payload as { startsOn: string; endsOn: string; kind?: string };
    const person = await this.theSignInOf(organizationId, who);
    if (!person?.linkedUserId || !dates?.startsOn || !dates?.endsOn) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('ask_for_leave', text(LEAVE_NOTHING_WAITING));
    }
    const say = await sendLeave(this.leave, this.prisma, { userId: person.linkedUserId, organizationId }, dates, { proposalId: parked.id });
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    return rules('ask_for_leave', text(say));
  }

  /**
   * A QUESTION ABOUT THE PERSON'S OWN LEAVE, WAITING FOR THEIR ANSWER (decision 85, build step 7). Whoever
   * decides the request asked it. What the person types next is said back as their answer and sent only
   * on a yes. A message that is plainly something else (a decision, or a new request for leave, hours or
   * spending) is answered as it would be, and the question keeps waiting. When the question is no
   * longer waiting (answered in the app, or the request decided), it is let go and the message is
   * answered as usual.
   */
  private async resolveParkedLeaveQuestion(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
    const requestId = (parked.payload as { requestId?: string } | null)?.requestId;
    /* A question about a request to spend is held the same way (build step 9), marked with its suite. */
    const suite: QuestionSuite = (parked.payload as { suite?: string } | null)?.suite === 'spend' ? 'spend' : 'leave';
    const lane = suite === 'spend' ? 'ask_to_spend' : 'ask_for_leave';
    const me = await this.theSignInOf(organizationId, who);
    const asking = suite === 'spend' ? this.spending : this.leave;
    const waiting = me.linkedUserId && requestId && asking
      ? await Promise.resolve(asking.questionWaitingFor?.({ userId: me.linkedUserId, organizationId }, requestId)).catch(() => null)
      : null;
    if (!waiting) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return this.answer(organizationId, personId, who, message, true);
    }
    const typed = (message ?? '').trim();
    if (!typed || aDecisionIn(typed) || soundsLikeLeave(typed) || soundsLikeHours(typed) || soundsLikeSpending(typed)) {
      return this.answer(organizationId, personId, who, message, true);
    }
    if (typed.length > LONGEST) return rules(lane, text(QUESTION_REFUSED.tooLong));
    const say = anAnswerSaidBack(waiting.askedBy, waiting.leave, waiting.question, typed);
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    const row = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: LEAVE_ANSWER_KIND, summary: say, payload: { requestId, answer: typed, askedBy: waiting.askedBy, ...(suite === 'spend' ? { suite } : {}) } as never },
      select: { id: true },
    });
    return { lane, composedBy: 'rules', blocks: [text(say), { type: 'proposal', proposalId: row.id, summary: say }] };
  }

  /** The person's yes sends their answer through the leave suite; a no keeps the question waiting for them. */
  private async resolveParkedLeaveAnswer(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    const p = (parked.payload ?? {}) as { requestId?: string; answer?: string; askedBy?: string; suite?: string };
    const suite: QuestionSuite = p.suite === 'spend' ? 'spend' : 'leave';
    const lane = suite === 'spend' ? 'ask_to_spend' : 'ask_for_leave';
    const asker = p.askedBy || 'the person who decides it';
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      if (p.requestId) {
        await this.prisma.assistantProposal.create({
          data: { organizationId, personExternalId: who, kind: LEAVE_QUESTION_KIND, summary: parked.summary, payload: { requestId: p.requestId, ...(suite === 'spend' ? { suite } : {}) } as never },
        }).catch(() => undefined);
      }
      return rules(lane, text(anAnswerNotSent(asker, suite)));
    }
    const me = await this.theSignInOf(organizationId, who);
    const none = noQuestionWaiting(suite);
    let reply: string;
    try {
      const answering = suite === 'spend' ? this.spending : this.leave;
      if (!answering || !me.linkedUserId || !p.requestId || !p.answer) throw new Error(none);
      await answering.answerAQuestion({ userId: me.linkedUserId, organizationId }, p.requestId, p.answer);
      reply = anAnswerSent(asker, suite);
    } catch (err: any) {
      const why = typeof err?.message === 'string' && err.message ? err.message : none;
      reply = why === none || why === QUESTION_REFUSED.nothingToAnswer ? none : `I could not send it. ${why}`;
    }
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    return rules(lane, text(reply));
  }

  /**
   * HOURS SAID TO ASK GROUNDWORK (week 21, request 22): for billing only (decision 10). Said back with
   * the real date and the project, parked, and written through the time sheets suite only on a yes,
   * then waiting for the person's approver. Nothing is read back from the time sheets here, and
   * nothing about the hours is said beyond what the person gave. With the suite off it says so and
   * parks nothing. Returns null when the words only looked like hours, so the other lanes can answer.
   */
  private async proposeHours(organizationId: string, who: string, userId: string, message: string): Promise<Reply | null> {
    if (!this.timeSheets) return rules('log_hours', text(HOURS_SUITE_OFF));
    let facts: { clients: string[]; approverFirstName: string | null; rules?: TimeRules };
    try { facts = await this.timeSheets.forChat(organizationId, userId); } catch { return rules('log_hours', text(HOURS_SUITE_OFF)); }
    const read = readHours(message, facts.clients);
    if (read.kind === 'none') return null;
    if (read.kind === 'ask') return rules('log_hours', text(read.say));
    /* Billable or not (build step 11): read from the words only when the rules say what is billable; said back before the yes. */
    const billable = facts.rules?.billable ? billableSaidIn(message) : null;
    const said: HoursSaid = { ...read.said, ...(billable !== null ? { billable } : {}) };
    const say = hoursSaidBack(said, facts.approverFirstName, facts.rules ? billableSaidBack(facts.rules, said.entries, billable) : []);
    const row = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: 'hours_entry', summary: say, payload: { ...said } as never },
      select: { id: true },
    });
    return { lane: 'log_hours', composedBy: 'rules', blocks: [text(say), { type: 'proposal', proposalId: row.id, summary: say }] };
  }

  /**
   * THIS WEEK'S HOURS, DRAFTED FROM THE PERSON'S OWN RECORD (decision 85, build step 11). What was found
   * and the draft are said back, and the draft is parked for the person's yes. With nothing to draft,
   * it says what was found and asks for the hours instead, and nothing is parked. Hours are for billing
   * only (decision 10): nothing here is kept anywhere but the parked proposal until the yes.
   */
  private async proposeAWeekDraft(organizationId: string, who: string, userId: string): Promise<Reply> {
    if (!this.timeSheets?.draftAWeek) return rules('log_hours', text(HOURS_SUITE_OFF));
    let facts: { approverFirstName: string | null };
    let drafted: Awaited<ReturnType<TimeSheetsService['draftAWeek']>>;
    try {
      facts = await this.timeSheets.forChat(organizationId, userId);
      drafted = await this.timeSheets.draftAWeek({ userId, organizationId });
    } catch { return rules('log_hours', text(HOURS_SUITE_OFF)); }
    const { say, canSend } = theDraftSaidBack(drafted, facts.approverFirstName);
    if (!canSend) return rules('log_hours', text(say));
    const row = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: HOURS_WEEK_DRAFT_KIND, summary: say, payload: { weekOf: drafted.weekOf, entries: drafted.entries } as never },
      select: { id: true },
    });
    return { lane: 'log_hours', composedBy: 'rules', blocks: [text(say), { type: 'proposal', proposalId: row.id, summary: say }] };
  }

  private async resolveParkedWeekDraft(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
    const entries: ADraftEntry[] = Array.isArray(parked.payload?.entries) ? parked.payload.entries : [];
    const me = await this.theSignInOf(organizationId, who);
    const close = (state: 'ACCEPTED' | 'DECLINED' | 'DROPPED') => this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state, resolvedAt: new Date() } });
    if (!this.timeSheets || !me?.linkedUserId || !entries.length) {
      await close('DROPPED');
      return rules('log_hours', text(HOURS_NOTHING_WAITING));
    }
    let facts: { clients: string[]; approverFirstName: string | null };
    try { facts = await this.timeSheets.forChat(organizationId, me.linkedUserId); } catch { await close('DROPPED'); return rules('log_hours', text(HOURS_SUITE_OFF)); }
    const typed = (message ?? '').trim();
    const decision = resolveConfirmation(typed);
    if (decision === 'decline') {
      await close('DECLINED');
      return rules('log_hours', text(DRAFT_NOT_SENT));
    }
    if (decision === 'accept') {
      let reply: string;
      try {
        await this.timeSheets.record(organizationId, me.linkedUserId, entries.map((e) => ({ client: e.client, onDay: e.onDay, hours: e.hours })), { proposalId: parked.id });
        reply = theDraftSent(entries, facts.approverFirstName);
      } catch (err: any) {
        reply = typeof err?.message === 'string' && err.message ? `I could not send it. ${err.message}` : HOURS_SUITE_OFF;
      }
      await close('ACCEPTED');
      return rules('log_hours', text(reply));
    }
    /* A change to one line, said back with the whole draft before the yes. */
    let next: ADraftEntry[] | null = null;
    const weekOf = typeof parked.payload?.weekOf === 'string' ? parked.payload.weekOf : entries[0].onDay;
    const inTheDraftsWeek = (day: string) => day >= weekOf && new Date(`${day}T00:00:00.000Z`).getTime() < new Date(`${weekOf}T00:00:00.000Z`).getTime() + 7 * 86_400_000;
    const removed = aLineRemoved(typed, entries);
    if (removed) next = entries.filter((e) => !(e.client === removed.client && e.onDay === removed.onDay));
    else {
      const read = readHours(soundsLikeHours(typed) ? typed : `I spent ${typed}`, facts.clients);
      if (read.kind === 'ask' && theClientNamedIn([typed], facts.clients)) return rules('log_hours', text(read.say));
      if (read.kind === 'ok' && inTheDraftsWeek(read.said.onDay)) {
        next = entries.filter((e) => !(e.onDay === read.said.onDay && read.said.entries.some((x) => x.client === e.client)));
        for (const x of read.said.entries) next.push({ client: x.client, onDay: read.said.onDay, hours: x.hours });
        next.sort((a, b) => a.onDay.localeCompare(b.onDay) || a.client.localeCompare(b.client));
      }
    }
    if (next) {
      if (!next.length) { await close('DECLINED'); return rules('log_hours', text(theDraftChanged(next, facts.approverFirstName))); }
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { payload: { ...(parked.payload ?? {}), entries: next } as never, summary: theDraftChanged(next, facts.approverFirstName) } });
      return rules('log_hours', text(theDraftChanged(next, facts.approverFirstName)));
    }
    /* Something about the draft that could not be read is asked again; anything else leaves the draft unsent and is answered. */
    if (theClientNamedIn([typed], [...new Set(entries.map((e) => e.client))]) || /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(typed)) {
      return rules('log_hours', text(DRAFT_CHANGE_NOT_READ));
    }
    await close('DROPPED');
    return this.answer(organizationId, personId, who, message, true);
  }

  private async resolveParkedHours(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('log_hours', text(HOURS_NOT_SENT));
    }
    const said = parked.payload as HoursSaid;
    const person = await this.theSignInOf(organizationId, who);
    if (!person?.linkedUserId || !said?.onDay || !Array.isArray(said.entries) || !said.entries.length) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('log_hours', text(HOURS_NOTHING_WAITING));
    }
    let reply: string;
    try {
      if (!this.timeSheets) throw new Error(HOURS_SUITE_OFF);
      const facts = await this.timeSheets.forChat(organizationId, person.linkedUserId);
      await this.timeSheets.record(organizationId, person.linkedUserId, said.entries.map((e) => ({ client: e.client, onDay: said.onDay, hours: e.hours, ...(typeof said.billable === 'boolean' ? { billable: said.billable } : {}) })), { proposalId: parked.id });
      reply = hoursSent(said, facts.approverFirstName);
    } catch (err: any) {
      reply = typeof err?.message === 'string' && err.message && err.message !== HOURS_SUITE_OFF ? `I could not send it. ${err.message}` : HOURS_SUITE_OFF;
    }
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    return rules('log_hours', text(reply));
  }

  /**
   * A REQUEST TO SPEND SAID TO ASK GROUNDWORK (week 22, request 26): checked against the person's own
   * team budget and the spending rule, said back with anything over either before the yes, parked,
   * and written through the spending suite only on a yes. With the suite off it says so and parks
   * nothing. It tells the person nothing about anybody else's spending.
   */
  private async proposeSpending(organizationId: string, who: string, userId: string, message: string): Promise<Reply | null> {
    if (!this.spending) return rules('ask_to_spend', text(SPEND_SUITE_OFF));
    const today = new Date();
    let first: Awaited<ReturnType<SpendingService['checkForChat']>>;
    try { first = await this.spending.checkForChat(organizationId, userId, 1, today); } catch { return rules('ask_to_spend', text(SPEND_SUITE_OFF)); }
    const read = readSpending(message, first.currency);
    if (read.kind === 'none') return null;
    if (read.kind === 'ask' && read.purpose) {
      /* Only the reason is missing, so the amount is kept and the next reply is taken as the reason. */
      await this.prisma.assistantProposal.create({
        data: { organizationId, personExternalId: who, kind: SPEND_PURPOSE_KIND, summary: read.say, payload: { ...read.purpose } as never },
        select: { id: true },
      });
      return rules('ask_to_spend', text(read.say));
    }
    if (read.kind === 'ask') return rules('ask_to_spend', text(read.say));
    return this.carryOnWithSpending(organizationId, who, userId, message, read.said, first);
  }

  /** What a person typed after "What is it for?" is the reason; anything that is plainly something else is answered as it would be. */
  private async resolveParkedSpendPurpose(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
    const typed = (message ?? '').trim();
    const kept = parked.payload as { amount?: number; currency?: string | null };
    const drop = (state: 'DROPPED' | 'DECLINED' | 'ACCEPTED') => this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state, resolvedAt: new Date() } });
    if (resolveConfirmation(typed) === 'decline') { await drop('DECLINED'); return rules('ask_to_spend', text(SPEND_NOT_SENT)); }
    const me = await this.theSignInOf(organizationId, who);
    /* A reason is not a yes, a greeting, thanks, a question, or an answer to something asked half an hour ago. */
    const stale = parked.createdAt && Date.now() - new Date(parked.createdAt).getTime() > 30 * 60 * 1000;
    if (stale || resolveConfirmation(typed) === 'accept' || /^(hi|hello|hey|thanks?|thank you|ok(ay)?|good (morning|afternoon|evening))\b/i.test(typed) || /^(who|what|when|how|why|can|is|do)\b/i.test(typed)
      || !typed || !(kept?.amount && kept.amount > 0) || !this.spending || !me.linkedUserId
      || aDecisionIn(typed) || soundsLikeLeave(typed) || soundsLikeHours(typed) || soundsLikeSpending(typed) || /\?\s*$/.test(typed)) {
      await drop('DROPPED');
      return this.answer(organizationId, personId, who, message, true);
    }
    let first: Awaited<ReturnType<SpendingService['checkForChat']>>;
    try { first = await this.spending.checkForChat(organizationId, me.linkedUserId, 1, new Date()); } catch { await drop('DROPPED'); return rules('ask_to_spend', text(SPEND_SUITE_OFF)); }
    await drop('ACCEPTED');
    const names = await this.theNamesTheOrganisationKnows(organizationId, me.linkedUserId);
    const what = aReasonInASentence(typed.replace(/^\s*(?:it(?:'s| is)\s+|that(?:'s| is)\s+|for\s+|on\s+)/i, '').replace(/[.!]+$/, '').replace(/\s+/g, ' ').trim().slice(0, 300), names);
    return this.carryOnWithSpending(organizationId, who, me.linkedUserId, typed, { amount: kept.amount!, what, currency: kept.currency ?? first.currency }, first);
  }

  /**
   * THE NAMES THE ORGANISATION KNOWS, so a person's own capital letter is kept: people (first, last and display names), customers and
   * other counterparties, departments (the teams), and the clients on the time sheet. Read-only, best effort, and only ever used to
   * decide whether a word keeps its capital.
   */
  private async theNamesTheOrganisationKnows(organizationId: string, userId: string): Promise<string[]> {
    const p: any = this.prisma;
    const names: string[] = [];
    const take = async (f: () => Promise<any[] | undefined>, pick: (r: any) => any[]) => {
      try { for (const r of (await f()) ?? []) for (const v of pick(r)) if (typeof v === 'string' && v.trim()) names.push(v.trim()); } catch { /* a name we cannot read is one we do not keep */ }
    };
    await take(() => p.person?.findMany?.({ where: { organizationId }, select: { givenName: true, familyName: true, displayName: true, department: true }, take: 2000 }), (r) => [r.givenName, r.familyName, r.displayName, r.department]);
    await take(() => p.subject?.findMany?.({ where: { organizationId, type: 'COUNTERPARTY' }, select: { title: true }, take: 2000 }), (r) => [r.title]);
    try { names.push(...(((await this.timeSheets?.forChat(organizationId, userId)) as any)?.clients ?? [])); } catch { /* as above */ }
    return names;
  }

  /** A request to spend that is read in full goes on to the rules, and then to the say-back. */
  private async carryOnWithSpending(organizationId: string, who: string, userId: string, message: string, said: SpendSaid, first: Awaited<ReturnType<SpendingService['checkForChat']>>): Promise<Reply> {
    const read = { said };
    const today = new Date();
    /*
     * THE SPENDING RULES (build step 9). When the admin named categories and the words name none of
     * them, that one thing is asked for ("Which project is this for?"), and nothing else.
     */
    const theRules: SpendRules = (first as any).rules ?? {};
    if (theRules.categories?.length) {
      const category = theCategoryIn(message, theRules);
      if (!category) {
        const ask = whichCategory(theRules);
        const row = await this.prisma.assistantProposal.create({
          data: { organizationId, personExternalId: who, kind: SPEND_MISSING_KIND, summary: ask, payload: { ...read.said } as never },
          select: { id: true },
        });
        return { lane: 'ask_to_spend', composedBy: 'rules', blocks: [text(ask), { type: 'proposal', proposalId: row.id, summary: ask }] };
      }
      return this.saySpendingBack(organizationId, who, userId, read.said, category.name, today);
    }
    return this.saySpendingBack(organizationId, who, userId, read.said, null, today);
  }

  /** The say-back of a request to spend, parked for the yes. The category, when there is one, goes with it. */
  private async saySpendingBack(organizationId: string, who: string, userId: string, said: SpendSaid, category: string | null, today = new Date()): Promise<Reply> {
    const facts = await this.spending!.checkForChat(organizationId, userId, said.amount, today, category);
    const month = whenItWas(today, 'month', 'UTC');
    const theRules: SpendRules = (facts as any).rules ?? {};
    const say = spendingSaidBack(said, { ...facts, approver: facts.approver, category: category ? { name: category, called: theRules.categoryCalled ?? 'category' } : null }, month);
    const row = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: 'spend_request', summary: say, payload: { ...said, ...(category ? { category } : {}) } as never },
      select: { id: true },
    });
    return { lane: 'ask_to_spend', composedBy: 'rules', blocks: [text(say), { type: 'proposal', proposalId: row.id, summary: say }] };
  }

  /**
   * THE CATEGORY GROUNDWORK ASKED FOR (build step 9). A reply that names one goes on to the say-back;
   * a no sends nothing; a message that is plainly something else is answered as it would be; anything
   * else is asked again.
   */
  private async resolveParkedSpendMissing(organizationId: string, personId: string, who: string, parked: any, message: string): Promise<Reply> {
    const said = parked.payload as SpendSaid;
    const me = await this.theSignInOf(organizationId, who);
    if (!this.spending || !me.linkedUserId || !(said?.amount > 0) || !said?.what) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return this.answer(organizationId, personId, who, message, true);
    }
    const typed = (message ?? '').trim();
    if (resolveConfirmation(typed) === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('ask_to_spend', text(SPEND_NOT_SENT));
    }
    let spendRules: SpendRules = {};
    try { spendRules = ((await this.spending.checkForChat(organizationId, me.linkedUserId, said.amount)) as any).rules ?? {}; } catch {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('ask_to_spend', text(SPEND_SUITE_OFF));
    }
    const category = theCategoryCalled(typed.replace(/[.!]+$/, ''), spendRules) ?? theCategoryIn(typed, spendRules);
    if (category) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
      return this.saySpendingBack(organizationId, who, me.linkedUserId, said, category.name);
    }
    if (!typed || aDecisionIn(typed) || soundsLikeLeave(typed) || soundsLikeHours(typed) || soundsLikeSpending(typed)) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return this.answer(organizationId, personId, who, message, true);
    }
    return rules('ask_to_spend', text(whichCategoryAgain(spendRules)));
  }

  private async resolveParkedSpending(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('ask_to_spend', text(SPEND_NOT_SENT));
    }
    const said = parked.payload as SpendSaid;
    const person = await this.theSignInOf(organizationId, who);
    if (!person?.linkedUserId || !(said?.amount > 0) || !said?.what) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('ask_to_spend', text(SPEND_NOTHING_WAITING));
    }
    let reply: string;
    try {
      if (!this.spending) throw new Error(SPEND_SUITE_OFF);
      const facts = await this.spending.checkForChat(organizationId, person.linkedUserId, said.amount);
      const category = (parked.payload as { category?: string } | null)?.category ?? null;
      await this.spending.ask(organizationId, person.linkedUserId, { amount: said.amount, what: said.what, proposalId: parked.id, ...(category ? { category } : {}) });
      reply = spendingSent(said, facts.currency, facts.approverFirstName);
    } catch (err: any) {
      reply = typeof err?.message === 'string' && err.message && err.message !== SPEND_SUITE_OFF ? `I could not send it. ${err.message}` : SPEND_SUITE_OFF;
    }
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    return rules('ask_to_spend', text(reply));
  }

  /**
   * WHAT IS WAITING FOR THIS PERSON TO DECIDE (decision 82, item 1), read from the boards themselves,
   * which already say row by row whether this reader is the one who approves (who-approves.ts). A
   * board this reader may not open, or a suite that is off, gives nothing.
   */
  private async waitingForYouToDecide(organizationId: string, userId: string): Promise<AWaitingRequest[]> {
    return whatWaitsForYouToDecide({ userId, organizationId }, { leave: this.leave, timeSheets: this.timeSheets, spending: this.spending as any });
  }

  /**
   * YOUR OWN LEAVE DAYS LEFT, WHERE YOUR OWN REQUESTS STAND, AND WHAT WAITS FOR YOU TO DECIDE. Each is
   * read from what the suites already serve this reader (`mine`, and the boards' own waiting lists), so
   * nothing here decides who may know what, and nothing about anybody else is read. Said in plain
   * sentences, to this reader only. Nothing is written.
   */
  /**
   * "WHAT CAN YOU HELP ME WITH?": the check-ins this reader is in or runs, the suites switched on for
   * them and what waits for them to approve, said in plain sentences. Reads only this reader's own.
   */
  private async whatYouCanAsk(organizationId: string, personId: string, userId: string | null): Promise<Reply> {
    const me = await this.prisma.person.findFirst({ where: { id: personId, organizationId }, select: { email: true } }).catch(() => null);
    const email = me?.email?.toLowerCase() ?? null;
    const links: any[] = (userId || email)
      ? await Promise.resolve().then(() => (this.prisma as any).groundParticipant.findMany({
          where: {
            OR: [...(userId ? [{ userId }] : []), ...(email ? [{ email: { equals: email, mode: 'insensitive' } }] : [])],
            ground: { organizationId, status: { in: ['OPEN', 'AWAITING_PARTIES', 'REPORT_READY', 'ACTIVE'] } },
          },
          select: { groundId: true, partyType: true },
        })).catch(() => [])
      : [];
    const grounds = new Set(links.map((l) => l.groundId));
    const run = new Set(links.filter((l) => l.partyType === 'INITIATOR').map((l) => l.groundId));
    const on = async (probe: (() => Promise<unknown>) | null) => (probe && userId ? probe().then(() => true).catch(() => false) : false);
    const [leaveIsOn, spendingIsOn, hoursAreOn, waiting] = await Promise.all([
      on(this.leave ? () => this.leave!.mine({ userId: userId!, organizationId }) : null),
      on(this.spending ? () => this.spending!.mine({ userId: userId!, organizationId }) : null),
      on(this.timeSheets ? () => (this.timeSheets as any).forChat(organizationId, userId!) : null),
      userId ? this.waitingForYouToDecide(organizationId, userId).catch(() => []) : Promise.resolve([]),
    ]);
    return rules('what_can_you_do', text(whatYouCanAskSaid({
      checkInsYouAreIn: grounds.size, checkInsYouRun: run.size, leaveIsOn, spendingIsOn, hoursAreOn, waitingForYou: waiting.length,
    })));
  }

  private async aboutYourRequests(organizationId: string, userId: string | null, message: string): Promise<Reply> {
    const lane = 'your_requests';
    if (!userId) return rules(lane, text(NO_SIGN_IN_FOR_YOUR_QUESTION));
    const reader = { userId, organizationId };
    const which = whichOfYourRequests(message);
    if (which === 'waiting_for_you') {
      const waiting = await this.waitingForYouToDecide(organizationId, userId);
      return rules(lane, text(whatWaitsForYouSaid(waiting.map((w) => w.thing))));
    }
    if (which === 'days_left') {
      let refused: string | null = null;
      const mine = this.leave ? await this.leave.mine(reader).catch((err) => { refused = theSuiteRefusal(err); return null; }) : null;
      return rules(lane, text(mine ? daysOfLeaveLeftSaid(mine) : refused ?? LEAVE_IS_OFF_FOR_YOUR_QUESTION));
    }
    const suite = whichSuite(message);
    let refused: string | null = null;
    const [leave, spend] = await Promise.all([
      suite === 'spend' || !this.leave ? null : this.leave.mine(reader).catch((err) => { refused = theSuiteRefusal(err); return null; }),
      suite === 'leave' || !this.spending ? null : this.spending.mine(reader).catch((err) => { refused = theSuiteRefusal(err); return null; }),
    ]);
    if (!leave && !spend) return rules(lane, text(refused ?? (suite === 'leave' ? LEAVE_IS_OFF_FOR_YOUR_QUESTION : suite === 'spend' ? SPENDING_IS_OFF_FOR_YOUR_QUESTION : NEITHER_SUITE_IS_ON)));
    const all = [...(leave?.requests ?? []), ...(spend?.requests ?? [])].filter((r) => r.where);
    /* What still waits first, then what was decided, each group in the order the suite served it (newest first). */
    const ordered = [...all.filter((r) => r.status === 'waiting'), ...all.filter((r) => r.status !== 'waiting')];
    return rules(lane, text(whereYourRequestsAre(ordered.map((r) => r.where))));
  }

  /**
   * WHO APPROVES YOUR LEAVE, YOUR HOURS OR YOUR SPENDING, in plain words, from the same approval rule
   * that routes the request (who-may-decide.ts): the first step for you, and for spending the people
   * above the limit. Your own approver only; nobody else's requests are read.
   */
  private async whoApprovesYours(organizationId: string, userId: string | null, message: string): Promise<Reply> {
    const lane = 'who_approves';
    if (!userId) return rules(lane, text(NO_SIGN_IN_FOR_YOUR_QUESTION));
    const asked = whichSuite(message);
    const suites = asked ? [asked] : (['leave', 'spend', 'time'] as const);
    const m = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch(() => null);
    const readerIsAdmin = m?.role === 'ADMIN';
    const said: string[] = [];
    const off: string[] = [];
    for (const suite of suites) {
      if (suite === 'leave') {
        const on = this.leave ? await this.leave.mine({ userId, organizationId }).then(() => true).catch(() => false) : false;
        if (!on) { off.push(LEAVE_IS_OFF_FOR_YOUR_QUESTION); continue; }
        const a = await whoApprovesFor(this.prisma, { organizationId, personUserId: userId, suite: 'leave' });
        said.push(whoApprovesSaid({ suite, firstName: a.kind === 'admin' ? null : a.firstName, readerIsAdmin }));
      } else if (suite === 'time') {
        const facts: any = this.timeSheets ? await this.timeSheets.forChat(organizationId, userId).catch(() => null) : null;
        if (!facts) { off.push(HOURS_ARE_OFF_FOR_YOUR_QUESTION); continue; }
        said.push(whoApprovesSaid({ suite, firstName: facts.approverFirstName ?? null, readerIsAdmin }));
      } else {
        const first: any = this.spending ? await this.spending.checkForChat(organizationId, userId, 1).catch(() => null) : null;
        if (!first) { off.push(SPENDING_IS_OFF_FOR_YOUR_QUESTION); continue; }
        const bar = first.limit ?? null;
        const above: any = bar != null ? await this.spending!.checkForChat(organizationId, userId, bar + 1).catch(() => null) : null;
        said.push(whoApprovesSaid({
          suite, firstName: first.approverFirstName ?? null, over: bar, currency: first.currency ?? null,
          aboveFirstName: above?.approverFirstName ?? null, thenTo: above?.thenTo ?? [], readerIsAdmin,
        }));
      }
    }
    /* A suite that is off is mentioned only when it was the one asked about, or when nothing else could be said. */
    const body = said.length ? said : off.slice(0, 1);
    if (asked && off.length && said.length === 0) return rules(lane, text(off[0]));
    return rules(lane, text(body.join('\n')));
  }

  /** What is due on this person's own commitments and to-dos, soonest first, and how many requests wait for them. */
  private async whatIsDue(organizationId: string, who: string | null, userId: string | null): Promise<Reply> {
    const lane = 'what_is_due';
    if (!who) return rules(lane, text('I cannot see you in your organisation records, so I have nothing to say is due.'));
    /* Nobody waiting to be let in is told what came out of check-ins they cannot yet take part in (row 5, kept by decision 93). */
    if (userId) {
      const me: any = await Promise.resolve((this.prisma as any).user?.findUnique?.({ where: { id: userId }, select: { awaitingOrgApproval: true } })).catch(() => ({ awaitingOrgApproval: true }));
      if (me?.awaitingOrgApproval === true) return rules(lane, text(WAITING_TO_BE_LET_IN));
    }
    const [commitments, toDos, waiting] = await Promise.all([
      this.prisma.commitment.findMany({ where: { organizationId, personExternalId: who, state: 'OPEN', ...notFromAKeptCheckIn(await keptInTheApp(this.prisma as any, organizationId), 'sourceGroundId') }, orderBy: [{ dueAt: 'asc' }, { statedAt: 'asc' }] }).then((rows) => withoutCommitmentsFromGoalsNotToldYet(this.prisma, rows)),
      this.prisma.todo.findMany({ where: { organizationId, personExternalId: who, state: 'OPEN' }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }] }),
      userId ? this.waitingForYouToDecide(organizationId, userId).catch(() => []) : Promise.resolve([]),
    ]);
    return rules(lane, text(whatIsDueSaid({ commitments: commitments as any, toDos: toDos as any, waitingToDecide: waiting.length, now: new Date() })));
  }

  /**
   * WHO IS OFF, from approved leave, as far as this reader may know. An admin reads everyone's, a lead
   * their own team's (both exactly as the leave board serves them), a member their own and their teammates'
   * (decision 93, row 25), and a guest only their own: a guest is never told a colleague's leave
   * (decision 75, item 28). Dates only, never a reason or a kind of leave.
   */
  private async whoIsAway(organizationId: string, userId: string | null, subject: string): Promise<Reply> {
    const lane = 'who_is_away';
    if (!userId) return rules(lane, text(NO_SIGN_IN_FOR_YOUR_QUESTION));
    const window = theDaysAskedAbout(subject, new Date());
    const reader = { userId, organizationId };
    const overlaps = (r: { startsOn: string; endsOn: string }) => r.startsOn <= window.to.toISOString().slice(0, 10) && r.endsOn >= window.from.toISOString().slice(0, 10);
    if (!this.leave) return rules(lane, text(LEAVE_IS_OFF_FOR_YOUR_QUESTION));
    const m = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, select: { role: true } }).catch(() => null);
    if (m?.role === 'ADMIN' || m?.role === 'LEAD') {
      const board = await this.leave.board(reader).catch(() => null);
      if (!board) return rules(lane, text(LEAVE_IS_OFF_FOR_YOUR_QUESTION));
      const rows: AwayRow[] = board.off.filter(overlaps).map((o) => ({ name: o.name, startsOn: o.startsOn, endsOn: o.endsOn }));
      return rules(lane, text(whoIsAwaySaid(rows, window, m.role === 'ADMIN' ? 'everyone' : 'your team')));
    }
    const mine = await this.leave.mine(reader).catch(() => null);
    /* Leave switched off for a member is said as it is for a lead, not as "no team" (privacy sweep finding 6). */
    if (!mine && m?.role === 'MEMBER') return rules(lane, text(LEAVE_IS_OFF_FOR_YOUR_QUESTION));
    const rows: AwayRow[] = (mine?.requests ?? []).filter((r) => r.status === 'approved' && overlaps(r)).map((r) => ({ name: 'You', startsOn: r.startsOn, endsOn: r.endsOn }));
    /*
     * A MEMBER ALSO READS THEIR TEAMMATES' APPROVED LEAVE, dates only (decision 93, row 25). The reader's team is the staff
     * directory's department; where they have none, or they are a guest, the answer is what it was: their own leave only.
     */
    const team = m?.role === 'MEMBER' ? await Promise.resolve().then(() => this.leave!.teammatesOff(reader)).catch(() => null) : null;
    if (team) {
      const theirs: AwayRow[] = team.filter(overlaps);
      return rules(lane, text(whoIsAwaySaid([...rows, ...theirs].sort((a, b) => a.startsOn.localeCompare(b.startsOn)), window, 'your team')));
    }
    /* A member with no department has no team, and says so plainly; a guest is only ever told their own leave (decision 75, item 28). */
    return rules(lane, text(whoIsAwaySaid(rows, window, m?.role === 'MEMBER' ? 'no team' : 'you')));
  }

  /** Whether anything waits for this person to approve or decline. The WhatsApp router asks, so a decision is never taken into a check-in. */
  async somethingWaitsForYouToDecide(organizationId: string, personId: string): Promise<boolean> {
    const me = await this.prisma.person.findFirst({ where: { id: personId, organizationId }, select: { linkedUserId: true, email: true } }).catch(() => null);
    const userId = await theirSignIn(this.prisma, organizationId, me).catch(() => null);
    return !!userId && (await this.waitingForYouToDecide(organizationId, userId)).length > 0;
  }

  /**
   * THE QUESTION WAITING FOR THIS PERSON'S ANSWER (decision 85, build step 7), for the WhatsApp router:
   * the latest question whoever decides one of their own requests asked them, while that request
   * still waits and the question is not answered. Only their own; never anybody else's. Null when none
   * waits. Never throws.
   */
  async aQuestionWaitsForYourAnswer(organizationId: string, personId: string): Promise<AQuestionWaiting | null> {
    try {
      const me = await this.prisma.person.findFirst({ where: { id: personId, organizationId }, select: { linkedUserId: true, email: true } });
      const userId = await theirSignIn(this.prisma, organizationId, me).catch(() => null);
      const table = (this.prisma as any).suiteQuestion;
      if (!userId || !table?.findMany) return null;
      const open = await table.findMany({ where: { organizationId, toUserId: userId, answer: null }, orderBy: { askedAt: 'desc' }, take: 5 });
      for (const q of open ?? []) {
        const reader = { userId, organizationId };
        if (q.suite === 'leave' && this.leave) {
          const waiting = await Promise.resolve(this.leave.questionWaitingFor?.(reader, q.ref)).catch(() => null);
          if (waiting) return { id: q.id, suite: 'leave', ref: q.ref, askedBy: waiting.askedBy, about: 'your leave' };
        }
        if (q.suite === 'spend' && this.spending) {
          const waiting = await Promise.resolve(this.spending.questionWaitingFor?.(reader, q.ref)).catch(() => null);
          if (waiting) return { id: q.id, suite: 'spend', ref: q.ref, askedBy: waiting.askedBy, about: 'your request to spend' };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * THE PERSON SAID YES, THIS IS MY ANSWER, ON WHATSAPP (decision 85, build step 7). Sent through the
   * suite's own code, which checks again that the question is theirs and still waiting, and tells
   * whoever asked. Returns what the person reads.
   */
  async answerAQuestionOnWhatsApp(organizationId: string, personId: string, questionId: string, answer: string): Promise<string> {
    const waiting = await this.aQuestionWaitsForYourAnswer(organizationId, personId);
    if (!waiting || waiting.id !== questionId) return NO_QUESTION_WAITING;
    const none = noQuestionWaiting(waiting.suite);
    const typed = (answer ?? '').trim();
    if (!typed) return none;
    if (typed.length > LONGEST) return QUESTION_REFUSED.tooLong;
    const me = await this.prisma.person.findFirst({ where: { id: personId, organizationId }, select: { linkedUserId: true, email: true } });
    const userId = await theirSignIn(this.prisma, organizationId, me).catch(() => null);
    try {
      const answering = waiting.suite === 'spend' ? this.spending : this.leave;
      if (!userId || !answering) throw new Error(none);
      await answering.answerAQuestion({ userId, organizationId }, waiting.ref, typed);
      return anAnswerSent(waiting.askedBy, waiting.suite);
    } catch (err: any) {
      const why = typeof err?.message === 'string' && err.message ? err.message : none;
      return why === none || why === QUESTION_REFUSED.nothingToAnswer ? none : `I could not send it. ${why}`;
    }
  }

  /**
   * "APPROVE", "DECLINE OMAR'S SPENDING" (decision 82, item 1). Narrowed by the first name and the kind
   * said in the reply; with one left it is said back ("You are approving Amina's leave from ... Is that
   * right?") and parked; with more, the person is asked which. Null when nothing waits and the
   * message said more than the decision, so the other lanes answer it.
   */
  private async proposeADecision(organizationId: string, who: string, userId: string, message: string): Promise<Reply | null> {
    const outcome = aDecisionIn(message)!;
    const all = await this.waitingForYouToDecide(organizationId, userId);
    /*
     * A message that opens with "approve" or "decline" is a decision, never the sender's own request (polish round 1, 26 October
     * 2026): Grace's "Decline Peter's leave because Friday 23 October is the day the 60 units arrive" found nothing waiting for
     * her, fell through to the leave lane, and was read as Grace asking for Friday off herself.
     */
    if (!all.length) return rules('decide_a_request', text(NOTHING_TO_DECIDE));
    const said = message.toLowerCase();
    const byName = all.filter((r) => r.firstName && new RegExp(`\\b${r.firstName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(said));
    const named = byName.length ? byName : all;
    const kinds = { leave: /\b(leave|time off|days? off)\b/, hours: /\b(hours?|time ?sheets?)\b/, spend: /\b(spend|spending|money|budget|expense)\b/ };
    const byKind = named.filter((r) => kinds[r.kind].test(said));
    const left = byKind.length ? byKind : named;
    if (left.length > 1) return rules('decide_a_request', text(whichDecision(left)));
    const r = left[0];
    if (r.kind === 'hours' && outcome === 'declined') return rules('decide_a_request', text(HOURS_ARE_NOT_DECLINED(r.firstName)));
    /* A reason given with a declined leave ("because ...") is said back, and told to the person (decision 85, build step 7). */
    const reason = outcome === 'declined' && (r.kind === 'leave' || r.kind === 'spend') ? aReasonIn(message) : null;
    const say = reason ? aDeclineWithAReasonSaidBack(r.thing, r.firstName, reason) : aDecisionSaidBack(r, outcome);
    const row = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: 'request_decision', summary: say, payload: { request: r, outcome, ...(reason ? { reason } : {}) } as never },
      select: { id: true },
    });
    return { lane: 'decide_a_request', composedBy: 'rules', blocks: [text(say), { type: 'proposal', proposalId: row.id, summary: say }] };
  }

  /** The approver's question about a request, said back before it goes. Null when what was written is not about a request waiting for them. */
  private async proposeAQuestionAboutARequest(organizationId: string, who: string, userId: string, asked: { name: string | null; kind: 'leave' | 'spend' | 'hours' | null; question: string }): Promise<Reply | null> {
    const lane = 'decide_a_request';
    const all = await this.waitingForYouToDecide(organizationId, userId);
    if (!all.length) return asked.name || asked.kind ? rules(lane, text(NOTHING_TO_ASK_ABOUT)) : null;
    const byName = asked.name ? all.filter((r) => r.firstName?.toLowerCase() === asked.name!.toLowerCase()) : all;
    if (asked.name && !byName.length) return null;
    const byKind = asked.kind ? byName.filter((r) => r.kind === asked.kind) : byName;
    const left = byKind.length ? byKind : byName;
    if (left.length > 1) return rules(lane, text(WHICH_REQUEST_TO_ASK_ABOUT(left)));
    const r = left[0];
    if (r.kind === 'hours') return rules(lane, text(HOURS_TAKE_NO_QUESTION(r.firstName)));
    if (asked.question.length > LONGEST_QUESTION) return rules(lane, text(QUESTION_REFUSED.tooLong));
    const say = aQuestionSaidBack(r, asked.question);
    const row = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: 'request_question', summary: say, payload: { request: r, question: asked.question } as never },
      select: { id: true },
    });
    return { lane, composedBy: 'rules', blocks: [text(say), { type: 'proposal', proposalId: row.id, summary: say }] };
  }

  /** The yes: the question goes through the boards' own `askAQuestion`, which checks again that this reader decides it, and tells the person. */
  private async resolveParkedRequestQuestion(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    const { request, question } = (parked.payload ?? {}) as { request: AWaitingRequest; question: string };
    if (decision === 'decline' || !request?.ref) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('decide_a_request', text(request?.ref ? aQuestionNotSent(request) : NOTHING_TO_ASK_ABOUT));
    }
    const me = await this.theSignInOf(organizationId, who);
    let reply: string;
    try {
      const asking = request.kind === 'spend' ? this.spending : this.leave;
      if (!me.linkedUserId || !asking) throw new Error(NOTHING_TO_ASK_ABOUT);
      await asking.askAQuestion({ userId: me.linkedUserId, organizationId }, request.ref, question);
      reply = aQuestionSent(request);
    } catch (err: any) {
      const why = typeof err?.message === 'string' && err.message ? err.message : NOTHING_TO_ASK_ABOUT;
      reply = why === NOTHING_TO_ASK_ABOUT ? why : `I could not send it. ${why}`;
    }
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    return rules('decide_a_request', text(reply));
  }

  /**
   * THE APPROVER'S YES, THROUGH THE BOARDS' OWN CODE (decision 82, item 1). `decide` and `approve`
   * check again that this reader is the one who approves and that it is still waiting, and tell the
   * person what was decided. A no changes nothing.
   */
  private async resolveParkedDecision(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    const { request, outcome, reason } = (parked.payload ?? {}) as { request: AWaitingRequest; outcome: 'approved' | 'declined'; reason?: string };
    if (decision === 'decline' || !request?.ref) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('decide_a_request', text(request?.ref ? aDecisionNotMade(request) : NOTHING_TO_DECIDE));
    }
    const me = await this.theSignInOf(organizationId, who);
    let reply: string;
    try {
      if (!me.linkedUserId) throw new Error(NOTHING_TO_DECIDE);
      const reader = { userId: me.linkedUserId, organizationId };
      /* An approval at a step that is not the last sends it on (decision 85, build step 4): say to whom. */
      let nowWaitsFor: string | null = null;
      if (request.kind === 'leave') {
        if (!this.leave) throw new Error(NOTHING_TO_DECIDE);
        await (reason ? this.leave.decide(reader, request.ref, outcome, reason) : this.leave.decide(reader, request.ref, outcome));
        nowWaitsFor = await Promise.resolve(this.leave.nowWaitingFor?.(organizationId, request.ref)).catch(() => null) ?? null;
      } else if (request.kind === 'spend') {
        if (!this.spending) throw new Error(NOTHING_TO_DECIDE);
        await (reason ? this.spending.decide(reader, request.ref, outcome, undefined, reason) : this.spending.decide(reader, request.ref, outcome));
        nowWaitsFor = await Promise.resolve(this.spending.nowWaitingFor?.(organizationId, request.ref)).catch(() => null) ?? null;
      } else {
        if (!this.timeSheets) throw new Error(NOTHING_TO_DECIDE);
        const [personId, weekOf] = request.ref.split('|');
        await this.timeSheets.approve(reader, personId, weekOf);
        nowWaitsFor = await Promise.resolve(this.timeSheets.nowWaitingFor?.(organizationId, personId, weekOf)).catch(() => null) ?? null;
      }
      reply = aDecisionDone(request, outcome, nowWaitsFor);
      if (reason && outcome === 'declined') reply = reply.replace(/ know\.$/, ' know. They can read your reason in Groundwork.');
    } catch (err: any) {
      const why = typeof err?.message === 'string' && err.message ? err.message : NOTHING_TO_DECIDE;
      reply = why === NOTHING_TO_DECIDE ? why : `I could not do that. ${why}`;
    }
    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
    return rules('decide_a_request', text(reply));
  }

  /**
   * A DOCUMENT'S NUMBERS, WRITTEN ONLY ON A YES, THROUGH THE SAME CODE EVERY OTHER READER USES.
   *
   * `writeADocumentsNumbers` is the one place any of the three readers of a "yes" to a document
   * actually writes - see write-a-documents-numbers.ts. A no leaves the document exactly where it
   * was: still read, still waiting, nothing on the record.
   *
   * RE-READ AT EXECUTION, not trusted from the parked payload: between the offer and the yes,
   * somebody else may have already taken the same numbers - the setup chat, the check-in, or a
   * second yes through here - so this reads `holds` fresh and writes nothing a second time.
   */
  private async resolveParkedDocumentNumbers(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('add_a_document', text('I have left it as it was. Nothing was recorded.'));
    }

    const payload = parked.payload as { documentId: string; groundId: string; fileName: string };
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    const participant = person?.linkedUserId
      ? await this.prisma.groundParticipant.findFirst({
        where: { groundId: payload.groundId, userId: person.linkedUserId },
        select: { id: true },
      })
      : null;

    if (!participant) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_a_document', text('I could not record that, because I can no longer see you on that check-in.'));
    }

    const doc = await this.prisma.groundDocument.findFirst({
      where: { id: payload.documentId, groundId: payload.groundId },
      select: { id: true, fileName: true, holds: true, visibility: true },
    });
    const holds = (doc?.holds ?? {}) as any;
    const waitingRows: { name: string; target: number; ownerParticipantId: string | null }[] = Array.isArray(holds.waiting) ? holds.waiting : [];

    await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });

    if (!doc || holds.takenAt || !waitingRows.length) {
      /* Somebody else already said yes to this document - the setup chat, the check-in, or an
         earlier turn here. Answered honestly rather than written twice. */
      return rules('add_a_document', text('Those numbers are already recorded, so I have not written them a second time.'));
    }

    const said = await writeADocumentsNumbers(this.prisma, {
      groundId: payload.groundId,
      documentId: doc.id,
      fileName: doc.fileName,
      documentVisibility: doc.visibility,
      waiting: waitingRows,
      holds,
      setByParticipantId: participant.id,
      sortOrderBase: 400,
      addNote: true,
      authorUserId: person?.linkedUserId,
      reader: 'setup',
    });
    return rules('add_a_document', text(said));
  }

  /**
   * WHICH CHECK-IN THIS ONE OF THE OTHER THREE SETUP DOORS MEANS - the same candidate list and the
   * same refusal to guess as `addContext` (inventory item 14 and item 21), kept as its own copy
   * rather than a shared call so `addContext`'s own well-covered behaviour is never at risk of moving
   * under it. Returns the resolved ground, or an early `Reply` (asking which one, or the ordinary
   * unplaced answer for somebody with nothing to set up) when there is nothing more to decide yet.
   */
  private async resolveGroundFor(
    organizationId: string,
    who: string,
    userId: string,
    groundId: string | undefined,
    message: string,
    purpose: 'context_line' | 'lead_note' | 'questions_for_people',
  ): Promise<{ id: string; label: string } | Reply> {
    const grounds = await this.prisma.ground.findMany({
      where: { organizationId, status: { notIn: A_GROUND_IS_OVER } },
      select: { id: true, label: true, createdAt: true, initiator: { select: { firstName: true } }, initiatorId: true, organizationId: true, scenario: true, createdByUserId: true, participants: { select: { userId: true } } },
    });
    const viewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, organizationId: true } });
    /* Only the check-ins this person may set up (decisions 63 and 72), the same as the setup conversation:
       a context line is setup, a private note is the lead's own, and a question for a person is the lead's to
       ask. The lead, or an admin only once the lead has left the organisation. */
    const candidates = [] as typeof grounds;
    for (const g of grounds.filter((x) => runsIt(userId, viewer, x))) {
      if (g.initiatorId === userId || (await this.grounds.mayOpenSetupChatFor(g.id, userId, organizationId).catch(() => false))) candidates.push(g);
    }

    if (!candidates.length) {
      const { line, options } = whatICanDoWith(message);
      return rules('unplaced', text(line), picker(options));
    }

    let target = groundId ? candidates.find((g) => g.id === groundId) : undefined;
    if (!target && !groundId) {
      if (candidates.length === 1) {
        target = candidates[0];
      } else {
        const named = message.toLowerCase();
        const byName = candidates.filter((g) => named.includes(g.label.toLowerCase()));
        if (byName.length === 1) target = byName[0];
      }
    }

    if (target) return target;

    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'which_context_check_in',
        summary: `Which check-in do you mean? ${toldApart(candidates).map((g) => g.label).join(', ')}.`,
        payload: { candidates: toldApart(candidates).map((g) => ({ groundId: g.id, label: g.label })), said: message, purpose } as never,
      },
    });
    return {
      lane: 'add_context',
      composedBy: 'rules',
      blocks: [text(proposal.summary), picker(candidates.map((g) => ({ key: g.id, label: g.label })))],
    };
  }

  /*
   * --- ITEM 17: TYPING A CONTEXT LINE DIRECTLY, WITH NO CHAT ---
   *
   * Calls the same `GroundsService.addContextLine` the Context and resources page's own "type it in"
   * box calls - the kinds it accepts, the refusal of a line about a named person, and the sharing
   * rules on NOTE/STRATEGY/WAY_OF_WORKING/DECISION/UNSETTLED all come from there, unchanged.
   */
  private async addContextLineByChat(
    organizationId: string,
    who: string | null,
    userId: string | null,
    groundId: string | undefined,
    message: string,
  ): Promise<Reply> {
    if (!who || !userId) {
      const { line, options } = whatICanDoWith(message);
      return rules('unplaced', text(line), picker(options));
    }
    /*
     * CHANGING A LINE ALREADY ON THE RECORD (decision 50, piece 3, item 2: `changeContextLine`), read
     * before the "write a new line" parse below, so "reword the line ..." is never mistaken for a new
     * decision, strategy note, and so on.
     */
    const change = parseChangeContextLine(message);
    if (change) {
      const resolved = await this.resolveGroundFor(organizationId, who, userId, groundId, message, 'context_line');
      if ('lane' in resolved) return resolved;
      return this.manageContextLineByChat(organizationId, who, resolved.id, change);
    }
    const parsed = parseContextLine(message);
    if (!parsed) {
      return rules('add_context', text('Say the kind and the line - for example "decision: we will drop the pilot" - and I will add it.'));
    }
    const resolved = await this.resolveGroundFor(organizationId, who, userId, groundId, message, 'context_line');
    if ('lane' in resolved) return resolved;
    return this.proposeContextLine(organizationId, who, resolved.id, parsed);
  }

  /**
   * ONE LINE ALREADY ON THE RECORD, SAID BACK IN ITS NEW FORM BEFORE `GroundsService.changeContextLine`
   * EVER RUNS. Only lines this same door can create - `STRATEGY`, `WAY_OF_WORKING`, `DECISION`,
   * `UNSETTLED`, `NOTE` - are ever offered here; a line about a named person has no way in through this
   * lane, the same as when it is first typed (item 17), because `changeContextLine`'s own
   * `mayBeShared` refusal is the one rule this exists to keep, not a copy of it.
   */
  private async manageContextLineByChat(
    organizationId: string,
    who: string,
    groundId: string,
    change: { action: 'reword' | 'share' | 'private' | 'retire'; fragment: string | null; newText?: string },
  ): Promise<Reply> {
    const lines = await this.prisma.groundContextItem.findMany({
      where: { groundId, kind: { in: ['STRATEGY', 'WAY_OF_WORKING', 'DECISION', 'UNSETTLED', 'NOTE'] as any }, closedAt: null },
      select: { id: true, text: true, audience: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!lines.length) {
      return rules('add_context', text('There is no open line on this check-in to change.'));
    }
    const said1 = (x: string) => x.trim().replace(/[\s.!?]+$/, '').toLowerCase();
    /* The lead's own words, exactly, find their line first; only then is part of a line enough. */
    const exact = change.fragment ? lines.filter((l) => said1(l.text) === said1(change.fragment!)) : [];
    const matches = exact.length
      ? exact
      : change.fragment
        ? lines.filter((l) => l.text.toLowerCase().includes(change.fragment!.toLowerCase()))
        : lines.length === 1 ? lines : [];
    if (matches.length !== 1) {
      const said = lines.map((l) => `"${l.text}"`);
      return rules(
        'add_context',
        text(`I cannot tell which line you mean. What is open on this check-in is: ${said.join(', ')}. Say enough of its own words, in quotes, for me to tell them apart.`),
      );
    }
    const line = matches[0];
    let summary: string;
    switch (change.action) {
      case 'reword':
        if (!change.newText) return rules('add_context', text(`What should the line "${line.text}" say instead? Put your new wording in quotes.`));
        summary = `Shall I change the line "${line.text}" to say "${change.newText}" instead?`;
        break;
      case 'share':
        summary = `Shall I share the line "${line.text}" with everybody on this check-in?`;
        break;
      case 'private':
        summary = `Shall I make the line "${line.text}" visible only to you?`;
        break;
      case 'retire':
        summary = `Shall I retire the line ${quotedThenEnding(line.text, '?')} It stays on the record but no longer counts as open.`;
        break;
    }
    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'change_context_line',
        summary,
        payload: { groundId, itemId: line.id, action: change.action, newText: change.newText ?? null } as never,
      },
    });
    return {
      lane: 'add_context',
      composedBy: 'rules',
      blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
    };
  }

  private async resolveParkedChangeContextLine(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('add_context', text('I have left the line as it was. Nothing was changed.'));
    }
    const payload = parked.payload as { groundId: string; itemId: string; action: 'reword' | 'share' | 'private' | 'retire'; newText: string | null };
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text('I could not change that, because I can no longer see you in your organisation records.'));
    }
    const change =
      payload.action === 'reword'
        ? { text: payload.newText ?? '' }
        : payload.action === 'share'
          ? { audience: 'EVERYONE' as const }
          : payload.action === 'private'
            ? { audience: 'LEAD_ONLY' as const }
            : { closed: true };
    const said =
      payload.action === 'reword'
        ? 'I have changed the line.'
        : payload.action === 'share'
          ? 'I have shared the line. Everybody on this check-in can now read it.'
          : payload.action === 'private'
            ? 'I have made the line private. Only you can see it now.'
            : 'I have retired the line. It stays on the record but no longer counts as open.';
    try {
      await this.grounds.changeContextLine(payload.groundId, person.linkedUserId, payload.itemId, change);
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
      return rules('add_context', text(said));
    } catch (err: any) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text(err?.message ?? 'That could not be changed.'));
    }
  }

  /**
   * A QUESTION, ANSWERED FROM THE DOCUMENTS THE ASKER MAY OPEN, AND TO THEM ALONE (pilots, problem 1). Where it was
   * asked in the middle of setting a check-in up, the setup conversation is kept waiting where it was, so the next
   * answer carries on with it, and its question is not asked again here.
   */
  private async aQuestionAnsweredFromTheDocuments(
    organizationId: string,
    who: string | null,
    userId: string,
    groundId: string | null,
    question: string,
    priorHistory?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<Reply> {
    const said = await answerFromTheDocuments({ prisma: this.prisma, engine: this.engine as any }, { organizationId, userId, groundId, question });
    /*
     * NO DOCUMENT TO OPEN, BUT THE HANDBOOK SAYS (fix list, item 3). Found live: Grace added the staff handbook through
     * Ask, asked "What is our travel policy?", and read "There are no documents here that you can open yet ... Add one
     * with Choose a file". What the handbook says about it is answered instead, as it is written.
     */
    if (said === NO_DOCUMENTS_TO_READ && who) {
      const { cards } = await this.knowledge.retrieve(organizationId, who, question).catch(() => ({ cards: [] as unknown[] }));
      if (cards.length) return this.howWeWork(organizationId, who, question);
    }
    if (who && groundId && priorHistory?.length) {
      await this.prisma.assistantProposal.create({
        data: { organizationId, personExternalId: who, kind: 'context_turn', summary: priorHistory[priorHistory.length - 1]?.content ?? '', payload: { groundId, history: priorHistory } as never },
      }).catch(() => undefined);
    }
    return rules('answer_from_documents', text(said));
  }

  private async proposeContextLine(
    organizationId: string,
    who: string,
    groundId: string,
    parsed: { kind: string; text: string },
    /** The set-up conversation this line interrupted: asked again after the yes or the no, so the question that was open is not lost. */
    carried?: { history: { role: 'user' | 'assistant'; content: string }[]; openQuestion: string | null },
  ): Promise<Reply> {
    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'context_line',
        summary: `Shall I add "${parsed.text}" to this check-in's context as ${labelForContextKind(parsed.kind)}? Everybody in this check-in will read it.`,
        payload: { groundId, kind: parsed.kind, text: parsed.text, ...(carried ? { carried } : {}) } as never,
      },
    });
    return {
      lane: 'add_context',
      composedBy: 'rules',
      blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
    };
  }

  /**
   * AFTER A LINE OR A NOTE THAT INTERRUPTED THE SET-UP CONVERSATION, THE QUESTION THAT WAS OPEN IS ASKED AGAIN,
   * and the next message is read as its answer. Without it a fact said in the middle of set-up left the
   * conversation with nothing to carry on from.
   */
  private async carryOn(
    organizationId: string,
    who: string,
    groundId: string,
    said: string,
    carried?: { history: { role: 'user' | 'assistant'; content: string }[]; openQuestion: string | null },
  ): Promise<Reply> {
    const still = (carried?.openQuestion ?? '').trim();
    if (!carried || !still) return rules('add_context', text(said));
    /*
     * THE OPEN QUESTION WAITS, AND IS NOT ASKED AGAIN HERE (pilots, 13 October 2026, problem 1 and E3). This said the
     * yes or the no and then the open question underneath it, and kept both as the last thing Groundwork said, so the
     * next No read "I have not added the line. Nothing was changed." followed by "I have added the line to this
     * check-in." and the doing-well question again. Now the person is told only what happened. The conversation stays
     * where it was, with its own question as the last thing asked, so their next message still answers it.
     */
    await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'context_turn',
        summary: still,
        payload: { groundId, history: carried.history } as never,
      },
    });
    return rules('add_context', text(said));
  }

  private async resolveParkedContextLine(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      const was = parked.payload as { groundId: string; carried?: any };
      return this.carryOn(organizationId, who, was.groundId, 'I have not added the line. Nothing was changed.', was.carried);
    }
    const payload = parked.payload as { groundId: string; kind: string; text: string; carried?: any };
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text('I could not add that, because I can no longer see you in your organisation records.'));
    }
    try {
      await this.grounds.addContextLine(payload.groundId, person.linkedUserId, { kind: payload.kind, text: payload.text });
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
      return this.carryOn(organizationId, who, payload.groundId, 'I have added the line to this check-in. Everybody in it can read it now.', payload.carried);
    } catch (err: any) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text(err?.message ?? 'That could not be added.'));
    }
  }

  /*
   * --- ITEM 9: A NOTE ONLY THE LEAD SEES ---
   *
   * Calls `GroundsService.addLeadContext` - the same table, the same LEAD_ONLY default, and the same
   * refusal to let a note about one named person be shared, which `addLeadContext` itself enforces
   * (never here, so there is only one place that rule can be got wrong).
   */
  private async addLeadNoteByChat(
    organizationId: string,
    who: string | null,
    userId: string | null,
    groundId: string | undefined,
    message: string,
  ): Promise<Reply> {
    if (!who || !userId) {
      const { line, options } = whatICanDoWith(message);
      return rules('unplaced', text(line), picker(options));
    }
    /*
     * SHARING A NOTE WITH EVERYBODY (decision 50, piece 3, item 2: `shareLeadContext`), read before
     * the "write a new note" parse below, so "share the note about the launch" is never mistaken for
     * a new note to save.
     */
    if (/\bshare\s+(?:the|my|this)\s+note\b/i.test(message)) {
      const resolved = await this.resolveGroundFor(organizationId, who, userId, groundId, message, 'lead_note');
      if ('lane' in resolved) return resolved;
      return this.shareLeadNoteByChat(organizationId, who, resolved.id, message);
    }
    const parsed = parseLeadNote(message);
    if (!parsed) {
      return rules('add_context', text('Say "private note:" and then what you want to keep, just for you.'));
    }
    const resolved = await this.resolveGroundFor(organizationId, who, userId, groundId, message, 'lead_note');
    if ('lane' in resolved) return resolved;
    return this.proposeLeadNote(organizationId, who, resolved.id, parsed);
  }

  /**
   * ONE OF THE LEAD'S OWN NOTES ABOUT THE WHOLE CHECK-IN, SAID BACK BEFORE IT REACHES EVERYBODY.
   *
   * Only ever calls `GroundsService.shareLeadContext` - the same function the old Context and
   * resources page's own "share" button calls - so the one rule this exists to keep (a note about a
   * named person can never be shared, inventory item 9) is `shareLeadContext`'s own refusal, not a
   * copy of it here. Notes about a named person are left off this list entirely, not merely refused
   * if picked, so the chat never even offers to do the one thing it cannot do.
   */
  private async shareLeadNoteByChat(organizationId: string, who: string, groundId: string, message: string): Promise<Reply> {
    const notes = await this.prisma.leadContextNote.findMany({
      where: { groundId, participantId: null, audience: 'LEAD_ONLY' as any },
      select: { id: true, text: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!notes.length) {
      return rules('add_context', text('You have no private note about this check-in waiting to be shared.'));
    }
    const quoted = /["'“](.+?)["'”]/.exec(message);
    let matches = notes;
    if (quoted) {
      const needle = quoted[1].trim().toLowerCase();
      matches = notes.filter((n) => n.text.toLowerCase().includes(needle));
    } else if (notes.length > 1) {
      matches = [];
    }
    if (matches.length !== 1) {
      const lines = notes.map((n) => `"${n.text}"`);
      return rules(
        'add_context',
        text(`I cannot tell which note you mean. Your private notes about this check-in are: ${lines.join(', ')}. Say "share the note" and put enough of its own words in quotes for me to tell them apart.`),
      );
    }
    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'share_lead_note',
        summary: `Shall I share "${matches[0].text}" with everybody on this check-in?`,
        payload: { groundId, noteId: matches[0].id } as never,
      },
    });
    return {
      lane: 'add_context',
      composedBy: 'rules',
      blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
    };
  }

  private async resolveParkedShareLeadNote(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('add_context', text('I have left the note private. Nothing was changed.'));
    }
    const payload = parked.payload as { groundId: string; noteId: string };
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text('I could not share that, because I can no longer see you in your organisation records.'));
    }
    try {
      await this.grounds.shareLeadContext(payload.groundId, person.linkedUserId, payload.noteId);
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
      return rules('add_context', text('I have shared the note. Everybody on this check-in can now read it.'));
    } catch (err: any) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text(err?.message ?? 'That could not be shared.'));
    }
  }

  private async proposeLeadNote(
    organizationId: string,
    who: string,
    groundId: string,
    parsed: { about: string | null; text: string },
    carried?: { history: { role: 'user' | 'assistant'; content: string }[]; openQuestion: string | null },
  ): Promise<Reply> {
    let participantId: string | null = null;
    let aboutClause = '';
    if (parsed.about) {
      const people = await this.prisma.groundParticipant.findMany({
        where: { groundId },
        select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
      });
      const name = parsed.about.trim().toLowerCase();
      const matches = (people as any[]).filter((p) => {
        const given = (p.nameGiven ?? '').trim().toLowerCase();
        const first = (p.user?.firstName ?? '').trim().toLowerCase();
        const full = `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim().toLowerCase();
        return (given && given === name) || (first && first === name) || (full && full === name);
      });
      /* NEVER GUESSED (inventory item 21): no match, or more than one, is said out loud rather than picked. */
      if (matches.length === 0) {
        return rules('add_context', text(`I cannot find anybody called "${parsed.about}" on this check-in, so I have not saved the note. Say their name as it is on the check-in.`));
      }
      if (matches.length > 1) {
        return rules('add_context', text(`More than one person on this check-in could be "${parsed.about}", so I have not guessed which. Say more of their name.`));
      }
      participantId = matches[0].id;
      aboutClause = ` about ${parsed.about}`;
    }
    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId,
        personExternalId: who,
        kind: 'lead_note',
        summary: `Shall I keep "${parsed.text}" as a private note${aboutClause} that only you can see?`,
        payload: { groundId, participantId, text: parsed.text, ...(carried ? { carried } : {}) } as never,
      },
    });
    return {
      lane: 'add_context',
      composedBy: 'rules',
      blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
    };
  }

  private async resolveParkedLeadNote(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      const was = parked.payload as { groundId: string; carried?: any };
      return this.carryOn(organizationId, who, was.groundId, 'I have left it as it was. Nothing was saved.', was.carried);
    }
    const payload = parked.payload as { groundId: string; participantId: string | null; text: string; carried?: any };
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text('I could not save that, because I can no longer see you in your organisation records.'));
    }
    try {
      await this.grounds.addLeadContext(payload.groundId, person.linkedUserId, {
        participantId: payload.participantId,
        text: payload.text,
        audience: 'LEAD_ONLY',
      });
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
      return this.carryOn(organizationId, who, payload.groundId, 'I have saved the note, and only you can read it.', payload.carried);
    } catch (err: any) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text(err?.message ?? 'That could not be saved.'));
    }
  }

  /*
   * --- ITEM 8: THE LEAD'S EXACT QUESTIONS FOR PEOPLE (decision 34) ---
   *
   * Lists what `GroundsService.questionsForPeople` already has waiting, and turns "confirm the
   * question for X" or "leave out the question for X" into a proposal that says the exact sentence
   * back before `confirmQuestionForPerson`/`declineQuestionForPerson` - the routes the old Context and
   * resources page's own cards call, the lead's or (decision 63, once the lead has left) an admin's -
   * ever runs.
   */
  private async questionsForPeopleByChat(
    organizationId: string,
    who: string | null,
    userId: string | null,
    groundId: string | undefined,
    message: string,
  ): Promise<Reply> {
    if (!who || !userId) {
      const { line, options } = whatICanDoWith(message);
      return rules('unplaced', text(line), picker(options));
    }
    const resolved = await this.resolveGroundFor(organizationId, who, userId, groundId, message, 'questions_for_people');
    if ('lane' in resolved) return resolved;

    const askedOfOne = parseAskAPerson(message);
    if (askedOfOne) return this.proposeAQuestionForAPerson(organizationId, who, userId, resolved.id, askedOfOne);

    let cards: { id: string; who: string; exactQuestion: string; status: 'waiting' | 'confirmed' }[];
    try {
      cards = (await this.grounds.questionsForPeople(resolved.id, userId)) as any;
    } catch (err: any) {
      return rules('add_context', text(err?.message ?? 'I could not read the questions for people on this check-in.'));
    }
    const waiting = cards.filter((c) => c.status === 'waiting');
    if (!waiting.length) {
      return rules('add_context', text('There is no question waiting to be confirmed for anybody on this check-in.'));
    }

    const findByName = (raw: string) => {
      const name = raw.trim().replace(/[?.!]+$/, '').toLowerCase();
      return waiting.filter((c) => c.who.toLowerCase() === name || c.who.toLowerCase().includes(name) || name.includes(c.who.toLowerCase()));
    };

    const decline = /\b(?:decline|leave\s+out)\s+(?:the\s+)?question\s+for\s+(.+)/i.exec(message);
    const confirm = /\bconfirm\s+(?:the\s+)?question\s+for\s+(.+)/i.exec(message);
    /*
     * CONFIRMING WITH THE LEAD'S OWN CHANGED WORDING (decision 34; decision 50, piece 3, item 3):
     * "ask Ben 'how are the Lagos numbers looking?' instead". Read before decline/confirm above so it
     * is tried first, though neither of those patterns matches this shape anyway.
     */
    const reword = /\bask\s+(.+?)\s+["'“](.+?)["'”]\s*(?:instead)?\s*[.!]?\s*$/i.exec(message);

    if (reword) {
      const found = findByName(reword[1]);
      if (found.length !== 1) return rules('add_context', text(`I cannot tell which question you mean. The people waiting are ${((w) => w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : (w[0] ?? ''))(waiting.map((c) => c.who))}.`));
      const newQuestion = reword[2].trim();
      if (!newQuestion) return rules('add_context', text('Put the question you want asked in quotes.'));
      const proposal = await this.prisma.assistantProposal.create({
        data: {
          organizationId, personExternalId: who, kind: 'question_for_person',
          summary: `Groundwork will ask ${found[0].who}, word for word, "${newQuestion}" in ${found[0].who}'s next check-in. Shall I keep it for then?`,
          payload: { groundId: resolved.id, itemId: found[0].id, action: 'confirm', exactQuestion: newQuestion } as never,
        },
      });
      return { lane: 'add_context', composedBy: 'rules', blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }] };
    }

    if (decline) {
      const found = findByName(decline[1]);
      if (found.length !== 1) return rules('add_context', text(`I cannot tell which question you mean. The people waiting are ${((w) => w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : (w[0] ?? ''))(waiting.map((c) => c.who))}.`));
      const proposal = await this.prisma.assistantProposal.create({
        data: {
          organizationId, personExternalId: who, kind: 'question_for_person',
          summary: `Shall I leave out the question for ${found[0].who}, ${quotedThenEnding(found[0].exactQuestion ?? '', '?')}`,
          payload: { groundId: resolved.id, itemId: found[0].id, action: 'decline' } as never,
        },
      });
      return { lane: 'add_context', composedBy: 'rules', blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }] };
    }

    if (confirm) {
      const found = findByName(confirm[1]);
      if (found.length !== 1) return rules('add_context', text(`I cannot tell which question you mean. The people waiting are ${((w) => w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : (w[0] ?? ''))(waiting.map((c) => c.who))}.`));
      const proposal = await this.prisma.assistantProposal.create({
        data: {
          organizationId, personExternalId: who, kind: 'question_for_person',
          summary: `Groundwork will ask ${found[0].who}, word for word, "${found[0].exactQuestion}" in ${found[0].who}'s next check-in. Shall I keep it for then?`,
          payload: { groundId: resolved.id, itemId: found[0].id, action: 'confirm' } as never,
        },
      });
      return { lane: 'add_context', composedBy: 'rules', blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }] };
    }

    const lines = waiting.map((c) => `${c.who}: "${c.exactQuestion}"`);
    return rules(
      'add_context',
      text(`Waiting to be confirmed:\n${lines.join('\n')}\nSay "confirm the question for" a name to send one, or "leave out the question for" a name to drop it.`),
    );
  }

  /**
   * "ASK AMANI WHETHER THE KILIMANI SHOPS HAVE PAID", SAID BACK AS THE EXACT QUESTION (request 92,
   * point 11; decision 34). Nothing is kept and nobody is asked until the lead says yes to the
   * sentence, and a lead's own question, written to the person, is kept in her words.
   */
  private async proposeAQuestionForAPerson(
    organizationId: string,
    who: string,
    userId: string,
    groundId: string,
    asked: { name: string; leadWords: string },
  ): Promise<Reply> {
    let q: { participantId: string; who: string; exactQuestion: string };
    try {
      q = await this.grounds.theQuestionForAPerson(groundId, userId, asked);
    } catch (err: any) {
      return rules('add_context', text(err?.message ?? 'I could not work out that question, so nothing was asked.'));
    }
    const first = q.who.split(/\s+/)[0];
    const proposal = await this.prisma.assistantProposal.create({
      data: {
        organizationId, personExternalId: who, kind: 'question_for_person',
        summary: `Groundwork will ask ${q.who}, word for word, "${q.exactQuestion}" in ${first}'s next check-in. Shall I keep it for then?`,
        payload: { groundId, action: 'keep', participantId: q.participantId, leadWords: asked.leadWords, exactQuestion: q.exactQuestion } as never,
      },
    });
    return { lane: 'add_context', composedBy: 'rules', blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }] };
  }

  private async resolveParkedQuestionForPerson(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    if (decision === 'decline') {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DECLINED', resolvedAt: new Date() } });
      return rules('add_context', text('I have left it as it was. Nothing was asked.'));
    }
    const payload = parked.payload as { groundId: string; itemId: string; action: 'confirm' | 'decline' | 'keep'; exactQuestion?: string | null; participantId?: string; leadWords?: string };
    const person = await this.prisma.person.findFirst({ where: { organizationId, externalId: who }, select: { linkedUserId: true } });
    if (!person?.linkedUserId) {
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text('I could not save that, because I can no longer see you in your organisation records.'));
    }
    try {
      const result = payload.action === 'keep'
        ? await this.grounds.keepAQuestionForAPerson(payload.groundId, person.linkedUserId, {
            participantId: payload.participantId as string, leadWords: payload.leadWords as string, exactQuestion: payload.exactQuestion as string,
          })
        : payload.action === 'decline'
        ? await this.grounds.declineQuestionForPerson(payload.groundId, person.linkedUserId, payload.itemId)
        /* THE LEAD'S OWN CHANGED WORDING (decision 34; decision 50, piece 3, item 3): with
           `exactQuestion` set, `confirmQuestionForPerson` takes it word for word as the question,
           replacing whatever was waiting - the same call the "as shown" confirm makes with nothing. */
        : await this.grounds.confirmQuestionForPerson(payload.groundId, person.linkedUserId, payload.itemId, {
            exactQuestion: payload.exactQuestion ?? undefined,
          });
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'ACCEPTED', resolvedAt: new Date() } });
      return rules('add_context', text((result as any).say));
    } catch (err: any) {
      /* DECISION 63: an admin who listed the questions, while the lead is still in the organisation,
         can still be refused here, honestly - `confirmQuestionForPerson`/`declineQuestionForPerson`
         are the lead's, or an admin's only once the lead has left. */
      await this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state: 'DROPPED', resolvedAt: new Date() } });
      return rules('add_context', text(err?.message ?? 'That could not be saved.'));
    }
  }

  /* --- to-dos: a note to yourself, apart from anything promised to anybody --- */

  private async addAToDo(organizationId: string, who: string | null, subject: string, message: string): Promise<Reply> {
    if (!who) return rules('add_a_to_do', text('I cannot see you in your organisation records, so I have no list to put that on.'));
    const todo = readToDo(subject, message);
    if (!todo) return rules('add_a_to_do', text('What goes on the list? A few words is enough.'));
    const proposal = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind: 'todo', summary: toDoProposal(todo), payload: todo as any },
    });
    return {
      lane: 'add_a_to_do',
      composedBy: 'rules',
      blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }],
    };
  }

  private async resolveParkedToDo(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    await this.prisma.assistantProposal.update({
      where: { id: parked.id },
      data: { state: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', resolvedAt: new Date() },
    });
    if (decision === 'decline') return rules('add_a_to_do', text('I have left it as it was. Nothing was added.'));
    const payload = parked.payload as { text: string; dueSaid: string | null };
    await this.prisma.todo.create({
      data: { organizationId, personExternalId: who, text: payload.text, dueSaid: payload.dueSaid, dueAt: null, source: 'chat' },
    });
    return rules('add_a_to_do', text(addedToYourToDos(payload)));
  }

  private async myToDos(organizationId: string, who: string | null): Promise<Reply> {
    if (!who) return rules('my_to_dos', text('I cannot see you in your organisation records, so I have no list to read.'));
    const open = await this.prisma.todo.findMany({
      where: { organizationId, personExternalId: who, state: 'OPEN' },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });
    const listed = rules('my_to_dos', text(listToDos(open)));
    return open.length ? this.withItsSource(listed, YOUR_TO_DOS_SOURCE) : listed;
  }

  /**
   * TICKING SOMETHING OFF IS SAID BACK FIRST (week 18). It used to close on a matching sentence; now
   * it parks a question, and only a yes through `POST /ask/answer` closes it. It reaches the
   * person's own to-dos and their own commitments and nobody else's: not even a lead marks
   * somebody's commitment done, because the person doing the thing owns the answer.
   */
  private async tickOffAToDo(organizationId: string, who: string | null, said: string): Promise<Reply> {
    if (!who) return rules('tick_off_a_to_do', text('I cannot see you in your organisation records, so I have no list to close anything on.'));
    const todos = await this.prisma.todo.findMany({ where: { organizationId, personExternalId: who, state: 'OPEN' } });
    const commitments = await withoutCommitmentsFromGoalsNotToldYet(this.prisma, await this.prisma.commitment.findMany({ where: { organizationId, personExternalId: who, state: 'OPEN' } }));
    const open = [
      ...todos.map((t: any) => ({ id: `todo:${t.id}`, text: t.text as string, dueSaid: (t.dueSaid ?? null) as string | null })),
      ...commitments.map((c: any) => ({ id: `commitment:${c.id}`, text: c.text as string, dueSaid: (c.dueSaid ?? null) as string | null })),
    ];
    const which = whichToDo(said, open);
    if ('none' in which) {
      const colleague = await this.aColleagueNamedIn(organizationId, who, said);
      if (colleague) return rules('tick_off_a_to_do', text(onlyTheyCanChangeIt(colleague)));
      return rules('tick_off_a_to_do', text(open.length ? `Nothing on your list reads like "${said}". ${listToDos(todos)}` : 'Your list is empty, so there is nothing to close.'));
    }
    if ('several' in which) return rules('tick_off_a_to_do', text(`More than one of these could be it. Which?\n${which.several.map((t) => `- ${t.text}`).join('\n')}`));
    const [kind, id] = which.one.id.split(':');
    const tick: ATick = { kind: kind as ATick['kind'], id, text: which.one.text };
    return this.parkAChange('tick_off_a_to_do', organizationId, who, 'tick_off', tickProposal(tick), tick);
  }

  /** One question parked, and the same sentence shown, with the proposal the screen answers. */
  private async parkAChange(lane: Lane, organizationId: string, who: string, kind: string, summary: string, payload: object): Promise<Reply> {
    const proposal = await this.prisma.assistantProposal.create({
      data: { organizationId, personExternalId: who, kind, summary, payload: payload as any },
    });
    return { lane, composedBy: 'rules', blocks: [text(proposal.summary), { type: 'proposal', proposalId: proposal.id, summary: proposal.summary }] };
  }

  /**
   * THE FIRST NAME OF A COLLEAGUE THE ASKER NAMED, never anybody the asker did not name. A refusal
   * built from what the asker typed tells them nothing they did not already say.
   */
  private async aColleagueNamedIn(organizationId: string, who: string, said: string): Promise<string | null> {
    const people = await this.prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, displayName: true, givenName: true },
    });
    for (const p of people as any[]) {
      if (p.externalId === who) continue;
      const first = ((p.givenName ?? p.displayName ?? '') as string).trim().split(/\s+/)[0];
      if (first.length >= 2 && new RegExp(`\\b${first.replace(/[^a-z0-9]/gi, '')}(?:['’]s)?\\b`, 'i').test(said)) return first;
    }
    return null;
  }

  /**
   * THE COMMITMENTS THIS PERSON MAY MOVE. Their own, and - only for a lead - the ones the lead made
   * for somebody on a check-in the lead runs. A commitment somebody made for themselves is theirs to
   * move, whoever runs the check-in.
   */
  private async commitmentsIMayMove(organizationId: string, who: string, userId: string | null) {
    const own = await withoutCommitmentsFromGoalsNotToldYet(this.prisma, await this.prisma.commitment.findMany({ where: { organizationId, personExternalId: who, state: 'OPEN' } }));
    const out: { id: string; text: string; dueAt: Date | null; dueSaid: string | null; ownerExternalId: string; mine: boolean }[] =
      (own as any[]).map((c) => ({ id: c.id, text: c.text, dueAt: c.dueAt ?? null, dueSaid: c.dueSaid ?? null, ownerExternalId: c.personExternalId, mine: true }));
    if (userId) {
      const setByMe = await this.prisma.personObjective.findMany({
        where: { authoredBy: 'lead', status: 'OPEN', ground: { initiatorId: userId, organizationId } },
        select: { id: true },
      });
      const ids = (setByMe as any[]).map((o) => o.id);
      if (ids.length) {
        const forOthers = await this.prisma.commitment.findMany({
          where: { organizationId, state: 'OPEN', sourcePersonObjectiveId: { in: ids }, personExternalId: { not: who } },
        });
        for (const c of forOthers as any[]) {
          out.push({ id: c.id, text: c.text, dueAt: c.dueAt ?? null, dueSaid: c.dueSaid ?? null, ownerExternalId: c.personExternalId, mine: false });
        }
      }
    }
    return out;
  }

  private async firstNameOf(organizationId: string, externalId: string): Promise<string> {
    const p: any = await this.prisma.person.findFirst({ where: { organizationId, externalId }, select: { displayName: true, givenName: true } });
    return ((p?.givenName ?? p?.displayName ?? 'them') as string).trim().split(/\s+/)[0];
  }

  /**
   * MOVING A DEADLINE, SAID BACK. The day is read in code, by the reader the product uses for a date
   * said in a check-in, or asked for. Nothing is moved here: the exact change is parked as a
   * question, and only a yes moves it.
   */
  private async moveADeadline(organizationId: string, who: string | null, userId: string | null, message: string): Promise<Reply> {
    if (!who) return rules('move_a_deadline', text('I cannot see you in your organisation records, so I have nothing of yours to move.'));
    const move = readAMove(message);
    if (!move) return rules('move_a_deadline', text(thereIsNoMoveToRead()));

    const mine = await this.commitmentsIMayMove(organizationId, who, userId);
    const which = whichToDo(move.what, mine);
    if ('none' in which) {
      const colleague = await this.aColleagueNamedIn(organizationId, who, move.what);
      if (colleague) return rules('move_a_deadline', text(onlyTheyCanChangeIt(colleague)));
      return rules('move_a_deadline', text(mine.length
        ? `Nothing you may move reads like "${move.what}". Say part of the words of the commitment you mean.`
        : 'You have no open commitments to move.'));
    }
    if ('several' in which) return rules('move_a_deadline', text(`More than one of these could be it. Which?\n${which.several.map((t) => `- ${t.text}`).join('\n')}`));

    const day = readTheDay(move.whenSaid, new Date());
    if ('ask' in day) return rules('move_a_deadline', text(day.ask));

    const one = which.one as (typeof mine)[number];
    const proposal: AMove = {
      commitmentId: one.id,
      text: one.text,
      ownerExternalId: one.ownerExternalId,
      ownerFirstName: one.mine ? null : await this.firstNameOf(organizationId, one.ownerExternalId),
      was: { at: one.dueAt ? one.dueAt.toISOString() : null, said: one.dueAt ? null : one.dueSaid },
      toISO: day.date.toISOString(),
      toSaid: move.whenSaid,
    };
    return this.parkAChange('move_a_deadline', organizationId, who, 'move_deadline', moveProposal(proposal), proposal);
  }

  /** ADDING A COMMITMENT, SAID BACK. It is always the asker's own: nobody adds one in somebody else's name. */
  private async addACommitmentByChat(organizationId: string, who: string | null, message: string): Promise<Reply> {
    if (!who) return rules('add_a_commitment', text('I cannot see you in your organisation records, so I have nowhere to write that.'));
    const c = readACommitment(message);
    if (!c) return rules('add_a_commitment', text(noCommitmentToRead()));
    let dueISO: string | null = null;
    if (c.dueSaid) {
      const day = readTheDay(c.dueSaid, new Date());
      if ('ask' in day) return rules('add_a_commitment', text(day.ask));
      dueISO = day.date.toISOString();
    }
    const addition: AnAddition = { text: c.text, dueSaid: c.dueSaid, dueISO };
    return this.parkAChange('add_a_commitment', organizationId, who, 'add_commitment', additionProposal(addition), addition);
  }

  /**
   * THE YES OR THE NO TO ONE OF THE THREE. Everything is checked again here, at the moment of the
   * yes, because what a person could change when the question was asked is not what they may change
   * now: the commitment may have closed, or the check-in may have passed to somebody else.
   */
  private async resolveParkedChange(organizationId: string, who: string, parked: any, decision: 'accept' | 'decline'): Promise<Reply> {
    const lane: Lane = parked.kind === 'move_deadline' ? 'move_a_deadline' : parked.kind === 'add_commitment' ? 'add_a_commitment' : 'tick_off_a_to_do';
    const settle = (state: 'ACCEPTED' | 'DECLINED' | 'DROPPED') =>
      this.prisma.assistantProposal.update({ where: { id: parked.id }, data: { state, resolvedAt: new Date() } });
    if (decision === 'decline') {
      await settle('DECLINED');
      return rules(lane, text(NOTHING_WAS_CHANGED));
    }
    const me: any = await this.prisma.person.findFirst({ where: { organizationId, externalId: who, active: true }, select: { linkedUserId: true } });
    if (!me) {
      await settle('DROPPED');
      return rules(lane, text('I could not change that, because I can no longer see you in your organisation records. Nothing was changed.'));
    }

    if (parked.kind === 'add_commitment') {
      const a = parked.payload as AnAddition;
      await addACommitment(this.prisma, {
        organizationId, personExternalId: who, text: a.text, dueSaid: a.dueSaid, dueAt: a.dueISO ? new Date(a.dueISO) : null, source: 'assistant',
      });
      await settle('ACCEPTED');
      return rules(lane, text(additionDone(a)));
    }

    if (parked.kind === 'tick_off') {
      const t = parked.payload as ATick;
      const row: any = t.kind === 'todo'
        ? await this.prisma.todo.findFirst({ where: { id: t.id, organizationId, personExternalId: who, state: 'OPEN' } })
        : await this.prisma.commitment.findFirst({ where: { id: t.id, organizationId, personExternalId: who, state: 'OPEN' } });
      if (!row) {
        await settle('DROPPED');
        return rules(lane, text(`"${t.text}" is no longer open on your list, so I have changed nothing.`));
      }
      if (t.kind === 'todo') await this.prisma.todo.update({ where: { id: t.id }, data: { state: 'DONE', doneAt: new Date() } });
      else await markACommitmentDone(this.prisma, t.id);
      await settle('ACCEPTED');
      return rules(lane, text(tickDone(t)));
    }

    const m = parked.payload as AMove;
    const allowed = (await this.commitmentsIMayMove(organizationId, who, me.linkedUserId ?? null)).find((c) => c.id === m.commitmentId);
    if (!allowed) {
      await settle('DROPPED');
      const first = m.ownerFirstName ?? (await this.firstNameOf(organizationId, m.ownerExternalId));
      return rules(lane, text(m.ownerExternalId === who
        ? `"${m.text}" is no longer open, so I have changed nothing.`
        : `${onlyTheyCanChangeIt(first)} You can no longer move it for them, so I have changed nothing.`));
    }
    await moveACommitmentsDeadline(this.prisma, m.commitmentId, new Date(m.toISO), m.toSaid);
    await settle('ACCEPTED');
    return rules(lane, text(moveDone(m)));
  }

  /**
   * THE PROMISES STILL OPEN IN THEIR OWN CHECK-INS, ONE READING FOR EVERY LANE (polish round 15, U5). Kevin asked "What did I promise this
   * week?" and read "You said you would do 2 things that are still waiting", then "What should I do next about Upper Hill Offices?" and
   * read "You have no open commitments or to-dos": one lane read his check-ins' promises and the other did not. Both read this. A promise
   * the record shows was done (thePromisesSaidDone, the lead's morning summary's own reading) is not open. Only the asker's own place in
   * each check-in is read, never through a name.
   */
  private async theOpenPromisesInTheirCheckIns(organizationId: string, linkedUserId: string | null | undefined, kept: any): Promise<{ id: string; text: string; whenSaid: string | null; createdAt: Date; ground: { label: string } | null }[]> {
    if (!linkedUserId) return [];
    const rows: any[] = await (this.prisma as any).groundCommitment?.findMany?.({
      where: {
        status: 'UNKNOWN',
        /* Held for a seat keeps their own promises (decision 110, B3): only the seat limit stops, and only new participation. */
        participant: { userId: linkedUserId },
        ground: { organizationId, ...notAKeptCheckIn(kept) },
      },
      select: { id: true, text: true, whenSaid: true, createdAt: true, participantId: true, groundId: true, ground: { select: { label: true } } },
      orderBy: { createdAt: 'asc' },
    })?.catch?.(() => []) ?? [];
    if (!rows.length) return [];
    const forPromises = await theRecordForPromises(this.prisma as any, [...new Set(rows.map((r) => String(r.groundId)).filter(Boolean))]).catch(() => ({ lines: [], waits: [], people: [], answers: [] } as any));
    const done = new Set(thePromisesSaidDone(
      rows.map((c) => ({ id: c.id, participantId: c.participantId, text: c.text, createdAt: c.createdAt })),
      forPromises.lines, forPromises.waits, (id: string) => forPromises.people.find((p: any) => p.id === id)?.names ?? [], forPromises.people.map((p: any) => p.id), forPromises.answers,
    ).map((x) => x.id));
    return rows.filter((r) => !done.has(r.id)).map((r) => ({ id: r.id, text: String(r.text ?? ''), whenSaid: r.whenSaid ?? null, createdAt: new Date(r.createdAt), ground: r.ground ?? null }));
  }

  /**
   * WHAT THE PERSON SAID THEY WOULD DO, IN PLAIN WORDS (requests 170, 180 item 2 and 182 item 8). It read only the commitments brought in from the
   * organisation's own systems, so somebody with two promises written down in a check-in ("ground_commitments", still unsettled) was told they had
   * none, in the words "open actions". Both are read now, and only the asker's own: a check-in's promises are found through the asker's own
   * place in it, never through a name. Not reworded by the model: what is written down goes out as written.
   */
  private async myCommitments(organizationId: string, personId: string): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true, linkedUserId: true },
    });
    if (!me) return rules('what_did_i_commit_to', text('I cannot find you in what your organisation has sent us.'));

    const kept = await keptInTheApp(this.prisma as any, organizationId);
    const open = await withoutCommitmentsFromGoalsNotToldYet(this.prisma, await this.prisma.commitment.findMany({
      where: { organizationId, personExternalId: me.externalId, state: 'OPEN', ...notFromAKeptCheckIn(kept, 'sourceGroundId') },
      orderBy: [{ dueAt: 'asc' }, { statedAt: 'asc' }],
    }));
    const inCheckIns: any[] = await this.theOpenPromisesInTheirCheckIns(organizationId, me.linkedUserId, kept);

    /*
     * WHAT THEY SAID THEY WOULD DO, WRITTEN DOWN WHILE SETTING A CHECK-IN UP OR ANSWERING, AS THE YOU PAGE READS IT (user journeys, F-5).
     * The You page lists the person's own to-dos and commitments from their goals ("person_objectives", said by themselves, still open), and
     * Ask read neither, so a lead whose You page held "Settle the 21 day credit rule with finance by the end of October." was told she had
     * said she would do nothing. The same rows, the same rule, and only the asker's own place in each check-in.
     */
    const myPlaces: any[] = me.linkedUserId
      ? await (this.prisma as any).groundParticipant?.findMany?.({
        where: { userId: me.linkedUserId, ground: { organizationId, ...notAKeptCheckIn(kept) } },
        select: { id: true, awaitingSeat: true, ground: { select: { label: true } } },
      })?.catch?.(() => []) ?? []
      : [];
    const ownToDos: any[] = myPlaces.length
      ? await (this.prisma as any).personObjective?.findMany?.({
        where: { participantId: { in: myPlaces.map((x) => x.id) }, kind: { in: ['COMMITMENT', 'TODO'] }, authoredBy: 'self', status: 'OPEN' },
        select: { text: true, dueSaid: true, participantId: true },
        orderBy: { createdAt: 'asc' },
      })?.catch?.(() => []) ?? []
      : [];
    const sameWords = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const alreadyListed = new Set(inCheckIns.map((c) => sameWords(String(c.text))));
    for (const o of ownToDos) {
      const text = String(o.text ?? '').trim();
      if (!text || alreadyListed.has(sameWords(text))) continue;
      alreadyListed.add(sameWords(text));
      inCheckIns.push({ text, whenSaid: o.dueSaid ?? null, ground: myPlaces.find((x) => x.id === o.participantId)?.ground ?? null });
    }

    const now = new Date();
    const lines: string[] = [];
    const late: string[] = [];
    for (const c of open) {
      const slipped = hasSlipped(c as any, now);
      const said = aPromiseAsASentence(String(c.text), c.dueSaid);
      lines.push(`- ${slipped ? `${said.replace(/\.$/, '')}, and the date you gave has passed.` : said}`);
      if (slipped) late.push(c.text);
    }
    /* ONCE EACH, AS THE PERSON READS IT. A promise written down in a check-in ("I will call him", said "on the 15th") and the same promise kept as
       her own to-do ("I will call him on the 15th.") differ in their stored words but read as one sentence, and were listed twice. */
    for (const c of inCheckIns) {
      const line = `- ${aPromiseAsASentence(String(c.text), c.whenSaid, c.ground?.label ?? 'your check-in')}`;
      if (!lines.includes(line)) lines.push(line);
    }
    /* In a check-in with no seat for them yet, said plainly, so a person is not left to wonder why nothing new is asked of them. */
    const noSeat = myPlaces.filter((x) => x.awaitingSeat);
    if (!lines.length) {
      return rules('what_did_i_commit_to', text(`You have not said you will do anything that is still waiting. When you say you will do something in a check-in, it shows up here.${noSeat.length ? `\n\n${noSeat.map((x) => noSeatYetSays(String(x.ground?.label ?? 'your check-in'))).join('\n')}` : ''}`));
    }
    const heading = `You said you would do ${lines.length === 1 ? 'one thing' : `${lines.length} things`} that ${lines.length === 1 ? 'is' : 'are'} still waiting.`;
    const parts = [heading, ...lines];
    for (const x of noSeat) parts.push(`\n${noSeatYetSays(String(x.ground?.label ?? 'your check-in'))}`);
    if (late.length) {
      parts.push(`\n${late.length === 1 ? 'One of them is' : `${late.length} of them are`} past the date you gave. That is worth saying out loud in your next check-in rather than letting it sit.`);
    }
    return this.withItsSource(rules('what_did_i_commit_to', text(parts.join('\n'))), YOUR_COMMITMENTS_SOURCE);
  }

  private async whatICanSee(organizationId: string): Promise<Reply> {
    const subjects = await this.prisma.subject.findMany({
      where: { organizationId, sourceDeletedAt: null },
      select: { sourceSystem: true, syncedAt: true, sourceDeletedAt: true },
    });
    /* EVERYONE WHO BELONGS HERE (B-028): the roster rows, plus members who were invited and never put on a roster, so an organisation of 19 does not read "15 people". */
    const rosterRows = await this.prisma.person.count({ where: { organizationId, active: true } });
    const onTheRoster = new Set<string>(((await (this.prisma as any).person?.findMany?.({ where: { organizationId, active: true, linkedUserId: { not: null } }, select: { linkedUserId: true } })) ?? []).map((r: any) => String(r.linkedUserId)));
    const members: any[] = (await (this.prisma as any).organizationMembership?.findMany?.({
      where: { organizationId, role: { not: 'GUEST' }, user: { deletedAt: null, isActive: true, awaitingOrgApproval: false } },
      select: { userId: true },
    })) ?? [];
    const people = rosterRows + members.filter((m) => !onTheRoster.has(String(m.userId))).length;

    if (!subjects.length && !people) {
      return rules('what_you_can_see', text('Nothing is connected yet, so there is genuinely nothing I can tell you. Your admin can connect your systems from the Connect page.'));
    }

    const now = new Date();
    const bySystem = new Map<string, { syncedAt: Date; stale: boolean }>();
    for (const s of subjects) {
      const cur = bySystem.get(s.sourceSystem);
      if (!cur || s.syncedAt > cur.syncedAt) {
        bySystem.set(s.sourceSystem, { syncedAt: s.syncedAt, stale: freshnessOf(s, now) === 'stale' });
      }
    }

    const lines = [
      `${subjects.length} ${subjects.length === 1 ? 'objective or project' : 'objectives and projects'}, and ${people} ${people === 1 ? 'person' : 'people'}.`,
      ...[...bySystem.entries()].map(([sys, v]) =>
        /* Staleness is said out loud rather than left for somebody to infer from a date. */
        v.stale
          ? `${aSourceInPlainWords(sys, true)} last ${aSourceIsGroundworks(sys) ? 'added to' : 'sent anything'} on ${v.syncedAt.toDateString()}, which is old enough that I would check it before relying on it.`
          : `${aSourceInPlainWords(sys, false)}, last updated ${v.syncedAt.toDateString()}.`,
      ),
    ];

    const quiet = quietUntil(
      await this.prisma.detectionQuietPeriod.findMany({ where: { organizationId }, select: { endsAt: true } }),
      now,
    );
    if (quiet) lines.push(`I am not raising anything until ${quiet.toDateString()}, because your systems were only just connected.`);

    /*
     * AND WHAT I CAN DO WITH IT, READ FROM THE REGISTRY RATHER THAN LISTED HERE.
     *
     * A hand-written list of abilities in this one lane would be wrong within a
     * fortnight — it is the same failure as a hand-written pattern, one layer up.
     * Reading the declarations means the answer cannot drift from what the router
     * actually does, because a guard already holds those together.
     *
     * The honest half is `whatIStillCannotDo`: somebody who asks what this can do
     * is usually about to ask for the one thing it cannot, and hearing "not yet,
     * and here is why" is a better answer than discovering it a question later.
     */
    lines.push('', 'What you can ask me for:');
    for (const c of WHAT_THE_ASSISTANT_CAN_DO) {
      lines.push(`- ${c.does}${c.writes === 'nothing' ? '' : ` (${c.writes})`}`);
    }

    const notYet = whatIStillCannotDo();
    if (notYet.length) {
      lines.push('', 'What I cannot do yet:');
      for (const n of notYet) lines.push(`- ${n}`);
    }

    return rules('what_you_can_see', text(lines.join('\n')));
  }

  /**
   * Answered from the imported graph, and honest about the difference between the two ways of being
   * on something. "Assigned" is what their tool says; whether the person has ever discussed it is a
   * different question this cannot answer yet, and it does not pretend otherwise.
   */
  private async whatAmIOn(organizationId: string, personId: string): Promise<Reply> {
    const me = await this.prisma.person.findFirst({
      where: { id: personId, organizationId },
      select: { externalId: true },
    });
    if (!me) return rules('what_am_i_on', text('I cannot find you in what your organisation has sent us, which is something your admin would need to look at.'));

    const all = await this.prisma.subject.findMany({
      where: { organizationId, sourceDeletedAt: null },
      /* `justification` and `approach` are the reason the number is the number and what anybody
         meant to do about it. They were collected, carried across the API and rendered into the
         check-in prompt, and were invisible here - so the one place somebody ASKS about their work
         was the one place that could not say what it was for. */
      select: { title: true, target: true, measure: true, ownerExternalId: true, contributorExternalIds: true, dueDate: true, justification: true, approach: true },
      orderBy: { dueDate: 'asc' },
    });

    const owned = all.filter((s) => s.ownerExternalId === me.externalId);
    const contributing = all.filter(
      (s) => s.ownerExternalId !== me.externalId
        && Array.isArray(s.contributorExternalIds)
        && (s.contributorExternalIds as unknown[]).includes(me.externalId),
    );

    if (!owned.length && !contributing.length) {
      /* An empty answer that says WHY it is empty. "Nothing" and "nothing has been sent to me" are
         different facts and only one of them is about the person. */
      return rules('what_am_i_on', text('Nothing your organisation has sent us lists you as an owner or a contributor. That may mean the work is tracked somewhere that is not connected yet.'));
    }

    const parts: string[] = [];
    if (owned.length) parts.push(`You own ${owned.length}:`, ...owned.map(asALine));
    if (contributing.length) parts.push(`${parts.length ? '\n' : ''}You are a contributor on ${contributing.length}:`, ...contributing.map(asALine));

    const missing = whatIsMissingAcrossThem([...owned, ...contributing]);
    if (missing) parts.push(`\n${missing}`);

    parts.push('\nThat is what your systems say. Whether it matches what you are actually spending your time on is the more interesting question, and one for your check-in.');

    return rules('what_am_i_on', text(parts.join('\n')));
  }

  /**
   * A ROSTER LOOKUP AND NOTHING MORE.
   *
   * Name, role, department, who they report to - the things an org chart holds. Deliberately not
   * how they are doing, what they have said, or anything derived from a check-in: this is a
   * question one colleague asks about another, and the answer stays on the side of the wall that
   * shared intelligence lives on.
   */
  private async whoIs(organizationId: string, query: string): Promise<Reply> {
    const q = query.replace(/[?.]+$/, '').trim();
    if (!q) return rules('who_is', text('Who did you mean?'));

    /*
     * AND IT HAS TO LOOK LIKE A NAME BEFORE IT IS CALLED ONE (screens request 154, item 2).
     *
     * This echoed whatever it was handed. Juma asked about looking after people while the road was
     * closed and read back: 'I do not have anybody called "looking after them while the road is
     * closed. ...". I only know the people your organisation has sent us.' A request to add some
     * notes, read back to him as a missing colleague.
     *
     * The router put him here and that is worth fixing too, but the damage is done at this line,
     * which is the place to hold it: a name is a few words with no sentence inside it. Anything
     * else is not somebody we have failed to find, it is something we did not understand, and
     * saying so with what Ask can do is both true and more use.
     */
    if (!looksLikeAName(q)) {
      const { line, options } = whatICanDoWith(query);
      return rules('unplaced', text(line), picker(options));
    }

    const people = await this.prisma.person.findMany({
      where: { organizationId, active: true },
      select: { externalId: true, userName: true, displayName: true, title: true, department: true, managerExternalId: true },
    });
    const lower = q.toLowerCase();
    const hit = people.find(
      (p) => (p.displayName ?? '').toLowerCase() === lower
        || (p.userName ?? '').toLowerCase() === lower
        || (p.displayName ?? '').toLowerCase().split(' ')[0] === lower
        || p.externalId.toLowerCase() === lower,
    );
    if (!hit) return rules('who_is', text(`I do not have anybody called "${q}". I only know the people your organisation has sent us.`));

    const manager = hit.managerExternalId
      ? people.find((p) => p.externalId === hit.managerExternalId)
      : null;

    const bits = [
      `${hit.displayName ?? hit.userName}${hit.title ? `, ${hit.title}` : ''}${hit.department ? `, in ${hit.department}` : ''}.`,
      manager
        ? `Reports to ${manager.displayName ?? manager.userName}.`
        : hit.managerExternalId
          /* The id resolved to nobody: said plainly rather than rendered as "no manager", which is a
             different and wrong fact. */
          ? `Their reporting line points at ${hit.managerExternalId}, who has not been sent to us.`
          : 'No reporting line has been sent for them.',
    ];
    return rules('who_is', text(bits.join(' ')));
  }

}


/** Two check-ins of the same name are offered with when each started, so the person can pick one. */
function toldApart<T extends { id: string; label: string; createdAt?: Date | null; initiator?: { firstName?: string | null } | null }>(candidates: T[]): T[] {
  const said = namesTheyCanTellApart(candidates.map((g) => ({ id: g.id, label: g.label, startedAt: g.createdAt, leadName: g.initiator?.firstName })));
  return candidates.map((g) => ({ ...g, label: said.get(g.id) ?? g.label }));
}
