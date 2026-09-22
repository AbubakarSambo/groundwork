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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { blockerHasSubstance } from '../board/reads';
import { PrismaService } from '../prisma/prisma.service';
import { forHumans, hadCloseMarker as textHadCloseMarker, whatIsNewSince } from '../presentation/outbound';
import { languageBlock } from '../public-api/a-whatsapp-message-is-routed';
import { endStatesFor } from '../resolution/end-states';
import { PromptsService } from '../prompts';
import { AnthropicService, ChatTurn, houseStyle } from './anthropic.service';
import { ConversationContextService } from './context.service';
import { theFloorFor } from './how-short-a-check-in-may-be';
import { theContextWeHave, whoThisNameIs, theNameWeUseFor, WHAT_A_DOCUMENT_HOLDS_PROMPT, WHAT_A_DOCUMENT_HOLDS_SCHEMA, MOST_OF_A_DOCUMENT_WE_READ, type WhatADocumentHolds } from '../documents/what-a-document-holds';
import { isAnApology, NOTHING_TO_APOLOGISE_FOR } from './an-apology-is-not-owed';
import { theOneThingToDoBetter } from './what-this-session-is-missing';
import { theAimsThatAreNew } from './an-aim-said-twice-is-one-aim';
import { askWhoCarriesWhichPart, alreadyAskedWhoCarriesWhat } from './who-carries-which-part';
import { askWhereTheNumberStands, saysWhereItStands } from './a-number-with-no-starting-point';
import { somethingTheyCouldNotHaveSaid } from './something-they-could-not-have-said-themselves';
import { movedTheirTargetToWhereTheyAre, A_STANDING_IS_NOT_A_TARGET } from './where-you-are-is-not-what-you-aim-at';
import { whatToDoAboutTheirDeadline, theDateItHadToSay, didNotSayTheDate, SAY_THE_DATE, theQuestionTheProductAsks } from './a-period-is-not-a-day';
import { theNumbersDoNotMeet, askWhichItIs, saidBothNumbers, theQuestionAboutTheNumbers, theNumbersIn } from './the-numbers-do-not-meet';
import { thePeriodTheyNamed } from './when-words-mean-a-date';
import { wordsWeDoNotUse, sayItWithoutThose } from './words-we-do-not-use';
import { asksForAShapeWithoutShowingOne, SHOW_WHAT_ONE_LOOKS_LIKE } from './a-question-that-invents-a-shape-shows-one';
import { theLineWithoutItsDanglingJoin } from './half-a-sentence-is-not-a-line-in-a-report';
import { aNameOrNothing } from '../board/a-name-is-short';
import { buildScenarioPackForParty, VOCABULARY_RULE, OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE, COACHING_OBSERVATION_PROMPT, COACHING_OBSERVATION_SCHEMA, SESSION_CLOSE_MARKER, stripCloseMarker, buildIntakeBlock, RECORD_EXTRACTION_PROMPT, DEPENDENCY_EXTRACTION_PROMPT, DEPENDENCY_EXTRACTION_SCHEMA, WORK_MENTION_PROMPT, WORK_MENTION_SCHEMA, EXPECTATION_PROMPT, EXPECTATION_SCHEMA, ALIGNMENT_PROMPT, ALIGNMENT_SCHEMA, OBJECTION_PROMPT, OBJECTION_SCHEMA } from './prompt-library';
import { GroundworkEvents, CheckInCompletedEvent, BlockerEvent } from '../../common';
import { onlyWhatWeCouldRead } from '../documents/a-document-we-could-not-read-is-not-a-source';
import { recordRoundCompletion } from '../grounds/round-completion';
import { Prisma } from '@prisma/client';
import { theInstruction, sourceHashOf, withoutTheirWords, A_READ_IS_DERIVED, WhatItAsks } from './what-an-account-shows';
import { mapSpecificityLevel, NOTHING_SAID, SpecificityLevel } from './how-checkable-a-session-was';

/** `CheckIn.closedReason` when the sweep, not the person, ended the session. */
export const CLOSED_BY_THE_CLOCK = 'auto_closed';
/** `CheckIn.closedReason` when the person declined to take part. */
export const DECLINED_TO_TAKE_PART = 'declined';
import { mirrorCommitment } from '../assistant/a-commitment-carries-past-the-ground';
import { DocumentsService } from '../documents/documents.service';
import { BillingService } from '../billing/billing.service';
import { EmailService } from '../email/email.service';
import { UsageService } from '../usage/usage.service';
import { CheckInStatus, TurnRole, RecordEntryType, Cadence, GroundStatus, UsageEventType, PartyType, GroundMode, DependencyStatus, WorkMentionKind , ContextNoteAudience, PatternStatus } from '@prisma/client';
import { runIntake } from './intake';
import { boardRendersFor } from '../board/board-families';
import { buildRoleProbeBlock, roleMapFor, signalRead, MIN_COACHING_CONFIDENCE, UniversalMode } from '../board/role-maps';
import { STARTING_SCENARIOS, WHO_ARE_YOU_IN_THIS } from './prompt-library';
import {
  nextMove, coachingBlockFor, afterOffering, afterOutcome, EMPTY,
  type CoachingStateShape, type StepOutcome,
} from '../coaching/one-step-at-a-time';
import { detectFunction, detectUniversalModes } from '../board/function-detection';
import { whoOpenedThis } from './who-opened-this';
import { documentWhereFor } from '../documents/who-can-see-a-document';
import { displayName, labelsForParties } from '../reports/party-labels';
import { buildDeliveriesBlock } from './what-they-say-they-delivered';
import { buildNotesBlock } from './between-session-notes';
import { closeReadiness, askedToFinish } from './close-readiness';
import { observeStyle, mergeStyle, styleGuidance } from './person-style';
import { readOutcome, isGenericStep } from './coaching-step';
import { theBehavioursAnybodyCanBeRead, universalSignalRead } from '../board/a-role-nobody-mapped-is-still-a-person';
import { WHAT_KIND_OF_WORK_PROMPT, WHAT_KIND_OF_WORK_SCHEMA, theJobTheyDescribed } from '../board/a-job-is-read-from-what-they-do';
import { FIGURE_PROMPT, FIGURE_SCHEMA, theFiguresTheyStated, theDayThisWasSaid } from './a-figure-is-not-a-figure-until-somebody-says-so';
import { familyFor, BoardFamily } from '../board/board-families';
import { theOneWorthAsking, askAboutItBlockFor } from './what-keeps-happening-becomes-a-question';
import { mayCoach } from './participation-timeline';
import { stillAsking } from './one-question-per-turn';
import { A_CHECK_IN_TAKES_ANSWERS, theCeilingIsReached, howMuchRoomIsLeft } from './there-is-a-ceiling-and-it-is-not-a-surprise';
import { restoreTheirWords, namesWorthReporting, truncationsOfTheirWords, causalClaimNobodyMade, ASK_INSTEAD_OF_CONCLUDING } from './the-record-holds-what-was-said';
import { theThingsThatCannotBeMissed } from './the-last-thing-it-reads-is-the-thing-it-must-not-miss';
import { thePatternLine } from './whether-the-pattern-library-is-doing-anything';
import { whatYouAskedLastTurn } from './you-asked-that-last-turn';
import { onlyTheRulesThisTurnNeeds, whatWasLeftOut } from './only-the-rules-this-turn-needs';
import { THE_OPENER_IS_ONE_MESSAGE, theRosterAlreadySaysWhoTheyAre } from './the-first-thing-it-says-is-its-own-job';
import { SentenceGate, screen, ASK_AGAIN, askInsteadOfInventing, hitLogLine, needsAFreshAsk, Hit } from './nothing-invented-reaches-them';
import { whatIsConcreteIn, THE_ONE_CONCRETE_THING, THE_CLOSE_WAS_HELD, withoutTheGoodbye, isAnAcknowledgement, theOneThingNeverAsked, takenAsSaidAndOn, saysGoodbye, withoutTheHomework, withinTheHomeworkBudget, withoutWhatWasAlreadySaid } from './the-close-is-held-once';
import { aPromiseTheyNeverMade, withoutThePromise } from './a-promise-they-never-made';
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
import { howThisCompanyDoesIt, whatToLookUp } from './how-this-company-does-it';
import { whatTheirWeekLooksLike } from './what-their-week-looks-like';
import { howThisSounds } from './how-this-sounds';
import { withoutQuotesTheyDidNotSay, unmatchedQuotes } from './a-quote-has-to-match-what-they-said';
import { tooManyQuestionsInARow, landThisOneInstead } from './four-questions-in-a-row';
import { hasEnded } from '../grounds/a-ground-that-has-ended';
import { theNextDayTheyWork } from '../grounds/which-days-this-team-works';
import { readsAsBroken, ASK_FOR_IT_AGAIN_PLAINLY } from './a-sentence-with-a-word-missing';
import { hardenedAGuess, DO_NOT_HARDEN_IT } from './a-hedge-is-not-a-fact';
import { whatTheRecordAlreadyHolds } from './what-the-record-already-holds';
import { whatThisSessionHasCovered, sayWhatHasBeenCovered, whereTheSpineIs, theyDeclined, THEY_DECLINED_IT, askedAbout, theyAlreadyAnsweredThat, type AThingToCover } from './what-this-session-has-covered';
import { sayWhatDoesNotAddUp } from './what-does-not-add-up';
import { theBriefForThePlanner, tidyThePlan, sayThePlan, howTheyAnswered, PLAN_PROMPT, PLAN_TOOL } from './the-plan-for-this-session';
import { POSITIVE_CODES, CARRYING_CODES, BAD_FAITH_CODES } from '../patterns/pattern-library';
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
import { whatIsWorthSaying } from './what-the-room-already-knows';
import { whereThatLeavesThem, theySaidANumber } from './where-that-leaves-them';
import { whatIsAlreadyOnThem } from './you-have-already-said-this-about-them';
import { oneThingBack } from './one-thing-back-not-three';
import { whatFiredThisTurn, oneLine } from './which-blocks-actually-fire';
import { isAVerdictAboutSomebodyElse, HERS_TO_DRAW } from './a-verdict-is-not-a-question';
import { isAnEssay, howManyWords, SAY_IT_SHORTER, A_CLOSE_IS_THREE_SENTENCES, A_REPLY_IS_ABOUT } from './a-reply-is-not-an-essay';
import { asksItAgainAfterTheAnswer, theyPushedBackOnTheQuestions, asksTheSameThingAgain, THEY_ALREADY_SAID_NO, opensByRepeatingThem, doNotSayItBack, withoutTheSentenceThatSaysItBack, alreadyAskedTwice, ASKED_IT_TWICE_ALREADY, withoutTheQuestionAskedAgain } from './asked-twice-and-told-no-twice';
import { totalSessionsFor } from '../grounds/session-count';
import { targetsFor, UNLESS_SOMEBODY_SAYS } from '../board/whose-number-is-whose-business';

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
  initiatorId: true,
  whoSeesTargets: true,
  objectives: { select: { name: true, target: true, ownerParticipantId: true }, orderBy: { sortOrder: 'asc' as const } },
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

Write only about what this person told you. Address them directly as "you" and "your", never by name. Do not infer the other side. Do not produce a verdict or analysis of any person. Open with the exact phrase "What you shared:" then summarise it in their own framing. Name one specific thing to carry forward. Warm, specific, brief - under 200 words total.`;

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

@Injectable()
export class ConversationService {
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
    const asRead = <T extends { role: TurnRole; content: string }>(t: T): T =>
      t.role === TurnRole.AI ? { ...t, content: forHumans(t.content) } : t;

    return {
      checkIn: {
        ...checkIn,
        groundLabel: ground?.label ?? null,
        scenario: ground?.scenario ?? null,
      },
      brief: this.briefFor(ground, this.whoIsReadingIt(ground as any, checkIn as any)),
      /* The turn floor the server will hold this to, so the screen offers to finish exactly when the server will honour it. See how-short-a-check-in-may-be. */
      mayCompleteAfter: theFloorFor(!!(checkIn as any).isSelfCorrection, (ground as any).scenario ?? null),
      turns: turns.map(asRead),
      priorTurns: priorTurns.map(asRead),
      priorSessionNumber,
      priorRecordEntries,
    };
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
  ): { subject: string | null; says: string | null; objectives: { name: string; target: number | null }[]; alsoSay?: string | null } | null {
    if (!ground) return null;
    const maySee = targetsFor(
      ground.objectives ?? [],
      reader?.participantId ?? null,
      ground.whoSeesTargets === 'EVERYBODY' ? 'everybody' : UNLESS_SOMEBODY_SAYS,
      { isLead: !!reader?.isLead },
    );
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
        : whatAParticipantIsToldAboutThis(ground.brief, maySee.shown as any, { told: (ground as any).toldToParticipants ?? null, readerParticipantId: reader?.participantId ?? null }),
      objectives: maySee.shown,
      alsoSay: maySee.alsoSay,
    };
  }

  async open(checkInId: string, requestingUserId: WhoIsAsking) {
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
      return { reply: existingAiTurn.content, groundId: checkIn.groundId, brief: this.briefFor(ground, this.whoIsReadingIt(ground as any, checkIn as any)), mayCompleteAfter: theFloorFor(!!(checkIn as any).isSelfCorrection, (ground as any).scenario ?? null) };
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
            throw new ForbiddenException('This check-in is beyond your ten free check-ins. Resubscribe to continue checking in - the report and board stay available either way.');
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

    const fullSystem = await this.composeSystemPrompt(checkIn);
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
    const openerSystem = `${await this.composeSystemPrompt(checkIn, undefined, { forTheOpener: true })}\n\n${THE_OPENER_IS_ONE_MESSAGE}`;
    this.logger.log(`Check-in ${checkIn.id}: opener prompt ${openerSystem.length} chars against a turn's ${fullSystem.length}.`);

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
    /* Unless their row already says which of the two they are - see theRosterAlreadySaysWhoTheyAre. */
    const theRosterIsSilent = !theRosterAlreadySaysWhoTheyAre(checkIn.participant.roleAsDescribed);
    const reply = startsSomething && notTheLead && firstSession && theRosterIsSilent && correctingSession == null && !(checkIn as any).isFinal
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
    const held = await this.theOpenerIsHeldToTheSameBar(checkIn.id, openerSystem, beginMessage, forHumans(reply));
    /* Before this person has typed a word in any session, nothing can be "you said". See the module. */
    const saidSoFar = await (this.prisma.conversationTurn?.count?.({ where: { role: TurnRole.PERSON, checkIn: { participantId: checkIn.participantId } } }) ?? Promise.resolve(1)).catch(() => 1);
    const quoted = nothingSaidYetCannotBeQuoted(held, saidSoFar);
    if (quoted.changed) this.logger.warn(`Check-in ${checkIn.id}: the opener quoted a person who has not spoken; rewritten.`);
    const opening = quoted.text;

    // An opener never closes a session, but strip defensively so the marker can
    // never reach a person even if the model emits it in the wrong place.
    const aiTurn = await this.prisma.conversationTurn.create({
      data: {
        checkInId: checkIn.id, role: TurnRole.AI, content: opening,
        /* Stamped as it is written, so the two-party balance can be counted without ever reading
           one person's turns while answering another - see the-same-burden-on-both-sides.ts. */
        askedFor: stampWhatItAskedFor(opening),
      },
    });
    await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.IN_PROGRESS, startedAt: new Date() } });
    /* A session that opens after a document was attached opens with what we have from it. Once. */
    const contextAtTheTop = await this.theContextNotYetSaid(checkIn as any);
    return { reply: contextAtTheTop ? `${contextAtTheTop}\n\n${aiTurn.content}` : aiTurn.content, groundId: checkIn.groundId, brief: this.briefFor(ground, this.whoIsReadingIt(ground as any, checkIn as any)), mayCompleteAfter: theFloorFor(!!(checkIn as any).isSelfCorrection, (ground as any).scenario ?? null) };
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
      .respond(`${fullSystem}\n\n${wrong.map((w) => w.instruction).join('\n\n')}`, [{ role: 'user', content: beginMessage }])
      .then((t) => forHumans(t))
      .catch(() => '');
    if (second.trim() && faults(second).length === 0) {
      this.logger.log(`Check-in ${checkInId}: the second opener cleared it.`);
      return second;
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

  async sendMessage(checkInId: string, requestingUserId: WhoIsAsking, message: string) {
    const checkIn = await this.aSessionUnderway(checkInId, requestingUserId);

    const again = await this.theSameAnswerAgain(checkIn.id, message);
    if (again.kind === 'the same answer, already answered') {
      return { reply: again.reply, sessionComplete: false };
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

    const composed = await this.composeSystemPrompt(checkIn, message);
    /*
     * AND WHAT TO DO ABOUT THE DEADLINE THEY JUST GAVE, WHICH NOTHING WAS DOING.
     *
     * "If i say end of year it should respond with december? what date?" A period gets its reading
     * said back and checked; something genuinely vague gets the open question. Appended to the
     * prompt for THIS reply rather than run as a retry afterwards: it is about what the person said,
     * not about what the product wrote. See a-period-is-not-a-day.
     */
    const aboutTheirDeadline = whatToDoAboutTheirDeadline(message, new Date());
    if (aboutTheirDeadline) {
      this.logger.log(`Check-in ${checkIn.id}: they gave a time with no day; asking which.`);
    }

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
    const earlierAiTurnsForTheGap = await this.prisma.conversationTurn
      .findMany({ where: { checkInId: { in: herOwnCheckIns }, role: TurnRole.AI }, select: { content: true } })
      .then((rows) => rows.map((r) => r.content ?? ''))
      .catch(() => [] as string[]);
    const numbersGap = theNumbersDoNotMeet(theirNumbers, message, alreadyTheirs, earlierAiTurnsForTheGap);
    if (numbersGap) {
      this.logger.log(`Check-in ${checkIn.id}: what they said does not meet the objective; asking which it is.`);
    }

    const fullSystem = [composed, aboutTheirDeadline, numbersGap ? askWhichItIs(numbersGap) : null]
      .filter(Boolean)
      .join('\n\n');

    // Persist the person's turn.
    const personTurn = await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.PERSON, content: message },
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
      let rawReply = await this.anthropic.respond(fullSystem, history);
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
      const readerName = (checkIn as any).participant?.user?.firstName ?? null;
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
        this.logger.warn(`Check-in ${checkIn.id}: a reply asked nothing and did not close.`);
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
          .respond(`${fullSystem}\n\n${ASKED_IT_TWICE_ALREADY}`, history)
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
          if (withoutIt.trim() && withoutIt !== screened.text) {
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
            .respond(`${fullSystem}\n\n${theyAlreadyAnsweredThat(askedAgain.thing.what, askedAgain.answer)}`, history)
            .catch(() => '');
          const second = moved.trim()
            ? screen(withoutQuotesTheyDidNotSay(forHumans(moved), theirWords), known, readerName, conversationSoFar)
            : null;
          if (second?.text && !second.hits.length && !askedAbout(askedAgain.thing, second.text)) {
            screened = second;
          } else {
            const withoutIt = withoutTheQuestionAskedAgain(screened.text, [askedAgain.thing.what]);
            if (withoutIt.trim() && withoutIt !== screened.text) {
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
       */
      {
        const lastAskHere = earlierAsks[earlierAsks.length - 1] ?? '';
        const theyAnswered = !theyDeclined(message) && !theyPushedBackOnTheQuestions(message) && (message ?? '').trim().length >= 3;
        if (lastAskHere && theyAnswered && asksItAgainAfterTheAnswer(lastAskHere, screened.text)) {
          const askedSentence = lastAskHere.split(/(?<=[.!?])\s+/).find((x) => /\?\s*$/.test(x)) ?? lastAskHere;
          this.logger.warn(`Check-in ${checkIn.id}: asked the last question again after it was answered; asking for another turn.`);
          const moved = await this.anthropic
            .respond(`${fullSystem}\n\n${theyAlreadyAnsweredThat(`this - ${JSON.stringify(askedSentence.slice(0, 160))}`, message)}`, history)
            .catch(() => '');
          const second = moved.trim()
            ? screen(withoutQuotesTheyDidNotSay(forHumans(moved), theirWords), known, readerName, conversationSoFar)
            : null;
          if (second?.text && !second.hits.length && !asksItAgainAfterTheAnswer(lastAskHere, second.text)) {
            screened = second;
          } else {
            const withoutIt = withoutTheQuestionAskedAgain(screened.text, [lastAskHere]);
            if (withoutIt.trim() && withoutIt !== screened.text) {
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
          .respond(`${fullSystem}\n\n${HERS_TO_DRAW}`, history)
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
            .respond(`${fullSystem}\n\n${declined ? THEY_DECLINED_IT : THEY_ALREADY_SAID_NO}`, history)
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
      if (opensByRepeatingThem(message, screened.text)) {
        this.logger.warn(`Check-in ${checkIn.id}: the reply opened by repeating them; asking again.`);
        /* The offending sentence goes back with the instruction. Asking for "no restatement" in the
           abstract lost 58 times out of 75 across nineteen live check-ins. */
        const straight = await this.anthropic
          .respond(`${fullSystem}\n\n${doNotSayItBack(message, screened.text)}`, history)
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
          if (trimmed) {
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
          .respond(`${fullSystem}\n\n${askFor}`, history)
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
      const dateItHadToSay = theDateItHadToSay(message, new Date());
      if (dateItHadToSay && didNotSayTheDate(screened.text, dateItHadToSay)) {
        const period = thePeriodTheyNamed(message)!;
        this.logger.warn(`Check-in ${checkIn.id}: the reply left the date out; asking again.`);
        const withTheDate = await this.anthropic
          .respond(`${fullSystem}\n\n${SAY_THE_DATE(period, dateItHadToSay)}`, history)
          .catch(() => '');
        const second = withTheDate.trim()
          ? screen(withoutQuotesTheyDidNotSay(forHumans(withTheDate), theirWords), known, readerName, conversationSoFar)
          : null;
        if (second?.text && !second.hits.length && !didNotSayTheDate(second.text, dateItHadToSay) && !isADeadEnd(second.text, closingNow)) {
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
          .respond(`${fullSystem}\n\n${askWhichItIs(numbersGap)}`, history)
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
          .respond(`${fullSystem}\n\n${SHOW_WHAT_ONE_LOOKS_LIKE}`, history)
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
      const notOurWords = wordsWeDoNotUse(screened.text, theirWords);
      if (notOurWords.length) {
        this.logger.warn(`Check-in ${checkIn.id}: ${notOurWords.length} word(s) we do not use; asking again.`);
        const ours = await this.anthropic
          .respond(`${fullSystem}\n\n${sayItWithoutThose(notOurWords, screened.text)}`, history)
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
          .respond(`${fullSystem}\n\n${A_STANDING_IS_NOT_A_TARGET(standsAt, target)}`, history)
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
        const cut = withoutThePromise(screened.text, promiseNobodyMade);
        if (cut.trim()) screened = { ...screened, text: cut };
      }

      /* AND NO HOMEWORK IN A ONE-TIME SESSION. See withoutTheHomework. */
      const cadenceHere = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { cadence: true } }).catch(() => null);
      if (cadenceHere?.cadence === Cadence.ONE_TIME) {
        const noHomework = withoutTheHomework(screened.text);
        if (noHomework.cut) {
          this.logger.warn(`Check-in ${checkIn.id}: cut "what will you do about this, and by when" from a one-time session.`);
          screened = { ...screened, text: noHomework.text };
        }
      } else {
        /* AND THE HOMEWORK QUESTION HAS A BUDGET, AND THE LEAD'S IS A DECISION. See withinTheHomeworkBudget. */
        const budget = withinTheHomeworkBudget(screened.text, earlierAsks, (checkIn as any).participant?.partyType === PartyType.INITIATOR);
        if (budget.changed !== 'kept') {
          this.logger.warn(`Check-in ${checkIn.id}: the homework question was ${budget.changed === 'decision' ? 'made the lead\'s decision question' : 'cut, over budget'}.`);
          screened = { ...screened, text: budget.text };
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
        screened = { ...screened, text: unsupported.text };
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
      hadCloseMarker = stripped.hadMarker;
      aiTurn = await this.prisma.conversationTurn.create({
        data: {
          checkInId: checkIn.id, role: TurnRole.AI, content: reply,
          askedFor: stampWhatItAskedFor(reply),
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
    const signalled = hadCloseMarker || this.closesInOtherWords(reply, message);
    const close: { ready: boolean; ask?: string; sayFirst?: string } = signalled ? await this.mayClose(checkIn.id, !!(checkIn as any).isSelfCorrection) : { ready: false };
    /* A close on an apology says, first, that none was owed. See an-apology-is-not-owed. */
    if (close.ready && !close.ask && isAnApology(message)) close.sayFirst = NOTHING_TO_APOLOGISE_FOR;
    if (close.ask) {
      /* The goodbye goes first. It was written before the product ruled on the close, and appending
         a question underneath it told a lead the session was over and then that it was not. */
      const earlierAi = await this.prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id, role: TurnRole.AI, id: { not: aiTurn.id } }, select: { content: true } }).then((rows) => rows.map((r) => r.content ?? '')).catch(() => [] as string[]);
      const stillOpen = withoutWhatWasAlreadySaid(withoutTheGoodbye(aiTurn.content ?? ''), earlierAi);
      aiTurn = await this.prisma.conversationTurn.update({
        where: { id: aiTurn.id },
        data: { content: stillOpen ? `${stillOpen}\n\n${close.ask}` : close.ask },
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
     * AND SAY WHEN THE CEILING IS COMING. `personTurnCount` was read before this turn was stored,
     * so the count including it is one more. Appended to the reply rather than returned as a
     * separate field, because a field needs a screen to render it and this has to reach somebody on
     * the path they are already on.
     */
    const room = howMuchRoomIsLeft(personTurnCount + 1);
    const withRoomLeft = room ? `${aiTurn.content}\n\n${room}` : aiTurn.content;

    /*
     * AND A DOCUMENT ATTACHED SOMEWHERE ELSE IS SAID HERE, ONCE. Somebody who puts the sheet on the
     * Context tab is not in the chat when it is read, so the next thing the chat says opens with what
     * we now have. See theContextNotYetSaid.
     */
    const contextNotSaid = await this.theContextNotYetSaid(checkIn as any);
    return { reply: contextNotSaid ? `${contextNotSaid}\n\n${withRoomLeft}` : withRoomLeft, sessionComplete };
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
      .respond(`${fullSystem}\n\n${askInsteadOfInventing(hits)}`, history)
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
  private async mayClose(checkInId: string, isSelfCorrection = false): Promise<{ ready: boolean; ask?: string; sayFirst?: string }> {
    const [row, turns] = await Promise.all([
      this.prisma.checkIn.findUnique({ where: { id: checkInId }, select: { closeHeldAt: true, participantId: true, startedAt: true, ground: { select: { cadence: true, scenario: true } } } }),
      this.prisma.conversationTurn.findMany({
        where: { checkInId },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      }),
    ]);
    const personSaid = turns.filter((t) => t.role === TurnRole.PERSON).map((t) => t.content ?? '');
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
    if (!oneTime && !justDeclined) {
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
    AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; reply: string; sessionComplete: boolean }, void, unknown> {
    /* The door people actually use. It had no lock for as long as the guard lived only on sendMessage(). See openTheDoor. */
    const checkIn = await this.aSessionUnderway(checkInId, requestingUserId);
    const againStreaming = await this.theSameAnswerAgain(checkIn.id, message);
    if (againStreaming.kind !== 'a new answer') {
      const say =
        againStreaming.kind === 'the same answer, already answered'
          ? againStreaming.reply
          : STILL_ON_YOUR_LAST_ANSWER;
      yield { type: 'delta', text: say };
      yield { type: 'done', reply: say, sessionComplete: false };
      return;
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

    const fullSystem = await this.composeSystemPrompt(checkIn, message);
    const personTurn = await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.PERSON, content: message },
    });
    await this.keepTheDocumentDescription(checkIn.id, personTurn.id, message).catch((err) =>
      this.logger.warn(`Could not keep a document description on ${checkIn.id}: ${err?.message}`),
    );
    await this.noteIfTheySaidWhy(checkIn as any, message);

    let raw = '';
    try {
      const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id }, orderBy: { createdAt: 'asc' } });
      const history: ChatTurn[] = turns.map((t) => ({ role: t.role === TurnRole.AI ? 'assistant' : 'user', content: t.content }));
      // Hold back a tail the length of the marker so a marker split across two
      // deltas can never flash up in the person's chat before being stripped.
      /*
       * NOTHING UNCHECKED LEAVES. The marker hold-back was already here; this adds the screen.
       *
       * Until now a delta went to the screen the moment it arrived, so an invented name was read
       * before anything inspected it, and the repair at the end could only correct what somebody
       * had already seen. There is no way to un-send a delta - so the gate holds each sentence until
       * it is finished, checks it, and emits only what survives.
       *
       * The cost is a sentence of latency instead of a word, paid on every reply rather than only
       * the bad ones. That is the whole price of "nothing invented reaches a person".
       */
      const streamPersonWords = turns
        .filter((t) => t.role === TurnRole.PERSON)
        .map((t) => t.content ?? '')
        .concat(message);
      const streamKnown = streamPersonWords.concat(this.knownForThisTurn.get(checkIn.id) ?? []);
      this.knownForThisTurn.delete(checkIn.id);
      const streamReaderName = (checkIn as any).participant?.user?.firstName ?? null;
      const gate = new SentenceGate(
        streamKnown,
        streamReaderName,
        turns.map((t) => t.content ?? ''),
        [...streamPersonWords, ...(this.theirEarlierWordsForThisTurn.get(checkIn.id) ?? [])],
      );
      this.theirEarlierWordsForThisTurn.delete(checkIn.id);
      let shown = '';

      /*
       * THE DOCUMENT'S OWN WORDS GO FIRST, BEFORE A SINGLE DELTA.
       *
       * See the-line-that-touches-what-they-said.ts. On this path the quotation cannot be added
       * afterwards - the person has already read the reply, and there is no un-sending a delta. So
       * it is emitted before the model starts, which is also where it reads best: the fact, then
       * the question.
       *
       * It is not passed through the gate. The gate exists to catch words the MODEL invented; this
       * sentence was written here, from the file, and checking our own quotation against the
       * person's vocabulary would drop it for not sounding like them.
       */
      const owedUpFront = this.takeCitationFor(checkIn.id);
      if (owedUpFront) {
        shown += `${owedUpFront}\n\n`;
        yield { type: 'delta', text: `${owedUpFront}\n\n` };
      }

      /* And what a document holds, where nobody has been told yet. Same place, same reason: it is our
         own sentence about a file, and it reads best before the question. See theContextNotYetSaid. */
      const contextFirst = await this.theContextNotYetSaid(checkIn as any);
      if (contextFirst) {
        shown += `${contextFirst}\n\n`;
        yield { type: 'delta', text: `${contextFirst}\n\n` };
      }

      let emitted = 0;
      /** How much of the CLEANED text has gone. Cleaning changes lengths, so raw offsets do not fit. */
      /*
       * CLEANING IS NOT PREFIX-STABLE, SO THE LIVE TEXT IS DIFFED, NOT SLICED. See whatIsNewSince:
       * slicing the newly cleaned prefix at the length of the last one skipped words and cut one in
       * half ("That's a clea writing the text"). `cleanShown` is the cleaned text handed to the gate.
       */
      let cleanShown = '';
      for await (const delta of this.anthropic.respondStream(fullSystem, history)) {
        raw += delta;
        const safeUpTo = Math.max(0, raw.length - SESSION_CLOSE_MARKER.length);
        if (safeUpTo > emitted) {
          const cleanedSoFar = forHumans(raw.slice(0, safeUpTo));
          const fresh = whatIsNewSince(cleanShown, cleanedSoFar);
          if (fresh) cleanShown = cleanedSoFar;
          emitted = safeUpTo;
          const clean = fresh ? gate.push(fresh) : '';
          if (clean) { shown += clean; yield { type: 'delta', text: clean }; }
        }
      }
      const cleanedWhole = forHumans(raw);
      const withheld = whatIsNewSince(cleanShown, cleanedWhole);
      const fromWithheld = withheld ? gate.push(withheld) : '';
      if (fromWithheld) { shown += fromWithheld; yield { type: 'delta', text: fromWithheld }; }
      const tailFromGate = gate.flush();
      if (tailFromGate) { shown += tailFromGate; yield { type: 'delta', text: tailFromGate }; }
      const strippedStream = { text: cleanedWhole, hadMarker: textHadCloseMarker(raw) };
      if (!strippedStream.text) throw new Error('AI returned an empty response');
      /*
       * THE RECORD IS THE WHOLE REPLY, CLEANED WHOLE AND SCREENED WHOLE. What streamed is a preview
       * and can be short where cleaning moved earlier text. The stored turn and the `done` event
       * carry this, and the client replaces the preview with it.
       */
      const whole = screen(cleanedWhole, streamKnown, streamReaderName, turns.map((t) => t.content ?? ''));
      shown = whole.text;

      /*
       * WHAT THEY SAW IS WHAT IS KEPT. `shown` is the concatenation of the deltas that actually
       * left, so the stored turn and the screen agree by construction rather than by a second pass
       * arriving at the same answer twice.
       *
       * Everything being dropped is rare and has to be handled rather than left to produce an empty
       * bubble. The reply asks them to say it again: from their side nothing went wrong, and telling
       * somebody the model hallucinated is alarming and useless to them.
       */
      /*
       * EVERY HIT IS WRITTEN DOWN AND NOTHING IS REMOVED. See DELETES_WHAT_IT_FINDS in the gate.
       * The branch that used to ask the model again when NOTHING survived cannot arise now that
       * nothing is dropped, and it went with the other three re-asks for the same reason: measured
       * live, they fired four times and won nothing.
       */
      let reply = shown.trim();
      for (const h of whole.hits) this.logger.warn(hitLogLine(checkIn.id, h, 'noted, not removed'));
      const reachedAPatternOnTheStream = thePatternLine(checkIn.id, reply);
      if (reachedAPatternOnTheStream) this.logger.log(reachedAPatternOnTheStream);
      if (!reply) {
        for (const h of gate.hits) this.logger.warn(hitLogLine(checkIn.id, h, 'nothing came back'));
        reply = ASK_AGAIN;
        yield { type: 'delta', text: reply };
      }

      /*
       * THE OTHER TWO CHECKS, WHICH REPORT RATHER THAN REMOVE.
       *
       * A shortened version of their own word and a causal claim they did not make are both real
       * faults, and neither is an invention of a person - so neither justifies deleting a sentence
       * somebody is waiting to read. They are written down; the rate is what decides whether they
       * ever become drops too.
       */
      const streamTruncated = truncationsOfTheirWords(reply, streamPersonWords);
      if (streamTruncated.length) {
        this.logger.warn(
          `Shortened one of their own words on check-in ${checkIn.id}: ${streamTruncated.join(', ')}.`,
        );
      }
      const streamCausal = causalClaimNobodyMade(reply, streamPersonWords);
      if (streamCausal.length) {
        this.logger.warn(
          `Causal claim nobody made on ${checkIn.id}: ${streamCausal.join(', ')}. ${ASK_INSTEAD_OF_CONCLUDING}`,
        );
      }

      const streamAiTurn = await this.prisma.conversationTurn.create({
        data: { checkInId: checkIn.id, role: TurnRole.AI, content: reply, askedFor: stampWhatItAskedFor(reply) },
      });
      const signalled = strippedStream.hadMarker || this.closesInOtherWords(reply, message);
      const close: { ready: boolean; ask?: string; sayFirst?: string } = signalled ? await this.mayClose(checkIn.id, !!(checkIn as any).isSelfCorrection) : { ready: false };
      if (close.ready && !close.ask && isAnApology(message)) close.sayFirst = NOTHING_TO_APOLOGISE_FOR;
      if (close.ask) {
        /* Same as the turn path: a refused close may not keep its goodbye. The stream has already
           put the farewell on the screen, so the whole reply is re-sent rather than appended to. */
        const earlierAi = await this.prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id, role: TurnRole.AI, id: { not: streamAiTurn.id } }, select: { content: true } }).then((rows) => rows.map((r) => r.content ?? '')).catch(() => [] as string[]);
        const stillOpen = withoutWhatWasAlreadySaid(withoutTheGoodbye(reply), earlierAi);
        reply = stillOpen ? `${stillOpen}\n\n${close.ask}` : close.ask;
        await this.prisma.conversationTurn.update({ where: { id: streamAiTurn.id }, data: { content: reply } });
        /* The farewell is already on the screen by now, and `done` carries the whole corrected
           reply - ChatPage replaces the streamed text with it. So the delta only has to add the
           question; no second event type is invented for something the page already does. */
        yield { type: 'delta', text: `\n\n${close.ask}` };
      } else if (close.ready && close.sayFirst) {
        reply = `${reply}\n\n${close.sayFirst}`;
        await this.prisma.conversationTurn.update({ where: { id: streamAiTurn.id }, data: { content: reply } });
        yield { type: 'delta', text: `\n\n${close.sayFirst}` };
      }
      yield { type: 'done', reply, sessionComplete: close.ready };
    } catch (err) {
      await this.prisma.conversationTurn.delete({ where: { id: personTurn.id } }).catch(() => undefined);
      throw err;
    }
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
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: { participantId: true, ground: { select: { organizationId: true } } },
    });
    if (!checkIn) throw new NotFoundException('No such check-in.');

    /* Theirs and nobody else's, checked the same way every other write in this file is. */
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { id: checkIn.participantId, user: { id: userId } },
      /* A participant has no display name of its own; the account behind it does. */
      select: { id: true, email: true, user: { select: { firstName: true, lastName: true } } },
    });
    if (!participant) throw new ForbiddenException('This check-in is not yours.');

    return this.prisma.whatWorked.create({
      data: {
        organizationId: checkIn.ground.organizationId,
        byParticipantId: participant.id,
        byName: [participant.user?.firstName, participant.user?.lastName].filter(Boolean).join(' ').trim() || participant.email,
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
  private _knownForThisTurn?: Map<string, string[]>;
  private get knownForThisTurn(): Map<string, string[]> {
    if (!this._knownForThisTurn) this._knownForThisTurn = new Map();
    return this._knownForThisTurn;
  }
  /* Their own words from earlier sessions, per check-in, for the number-claim cut. Same shape and lifetime. */
  private _theirEarlierWordsForThisTurn?: Map<string, string[]>;
  private get theirEarlierWordsForThisTurn(): Map<string, string[]> {
    if (!this._theirEarlierWordsForThisTurn) this._theirEarlierWordsForThisTurn = new Map();
    return this._theirEarlierWordsForThisTurn;
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
        objectives: { select: { name: true, target: true, ownerParticipantId: true }, orderBy: { sortOrder: 'asc' } },
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
            managingOnly: true,
            roleAsDescribed: true,
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
        /* A sentence is not a name - see a-name-is-short.ts. */
        const name = p.user?.firstName?.trim() || aNameOrNothing(p.roleAsDescribed);
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
      const g = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { organizationId: true } });
      if (uid && g) {
        const prof = await this.prisma.personStyleProfile.findUnique({
          where: { userId_organizationId: { userId: uid, organizationId: g.organizationId } },
        });
        if (prof) styleBlock = styleGuidance(prof, prof.groundsSeen);
      }
    } catch { /* never block a check-in over a nicety */ }

    /*
     * WHAT THEIR OWN SYSTEMS SAY IS HAPPENING, alongside what was agreed.
     *
     * Read from every objective this person holds, not only the first: somebody carrying a target and
     * a commitment has two things with numbers against them, and showing one is how a check-in ends
     * up asking about the wrong half of somebody's quarter.
     */
    const evidenceItems = personObjectives
      .filter((o: any) => o.lastSeenState && o.lastSeenAt)
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
    const [objectivesOnRecord, inTheWayRows, lastTimeRows] = await Promise.all([
      this.prisma.groundObjective?.findMany({
        where: { groundId: ground.id },
        orderBy: { sortOrder: 'asc' },
        select: { name: true, target: true, count: true, ownerParticipantId: true, setByParticipantId: true },
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
        select: { text: true },
      })?.catch(() => [] as any[]) ?? [],
    ]);
    /* A ground whose participants were not selected on this read has none to label, and an
       undefined list is not an empty one as far as the labeller is concerned. */
    const labelOf = labelsForParties((ground.participants ?? []) as any);
    const recordAlreadyHolds = whatTheRecordAlreadyHolds({
      /* Theirs, and the check-in's own. Somebody else's owned number is on the board, not in this person's interview. */
      targets: (objectivesOnRecord as any[])
        .filter((o) => !o.ownerParticipantId || o.ownerParticipantId === checkIn.participantId)
        .map((o) => ({ name: o.name, target: o.target, count: o.count, yours: o.ownerParticipantId === checkIn.participantId, setByThem: o.setByParticipantId === checkIn.participantId })),
      inTheWay: (inTheWayRows as any[]).map((d) => ({
        what: d.what,
        on: d.onParticipantId ? (labelOf.get(d.onParticipantId) ?? d.onLabel ?? null) : (d.onLabel ?? null),
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
    const turnsThisSession: { role: 'AI' | 'PERSON'; content: string }[] = await (this.prisma.conversationTurn?.findMany?.({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    }) ?? Promise.resolve([]))
      .then((rows: any[]) => rows.map((r) => ({ role: r.role === TurnRole.AI ? 'AI' as const : 'PERSON' as const, content: r.content ?? '' })))
      .catch(() => [] as { role: 'AI' | 'PERSON'; content: string }[]);
    if (latestMessage && (turnsThisSession.length === 0 || turnsThisSession[turnsThisSession.length - 1].content !== latestMessage)) {
      turnsThisSession.push({ role: 'PERSON', content: latestMessage });
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
      timelineDays: ground.timelineDays,
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
      personObjectives: personObjectives.map((o: any) => ({
        text: o.text,
        authoredBy: o.authoredBy,
        seenBySubject: o.seenBySubject,
        authoredByThem: o.authoredBy === 'self',
        fromTheirSystem: !!o.sourceSystem,
        /* Loaded from the row all along and dropped here. See `describeObjective`. */
        kind: o.kind ?? null,
        dueSaid: o.dueSaid ?? null,
        dueDate: o.dueDate ?? null,
        /* Why the number is that number, where the customer's system recorded one.
           The session facing a shortfall can then ask whether the reason still
           holds rather than asking somebody why they are behind. */
        whyThisNumber: o.whyThisNumber ?? null,
        owedToName: o.owedToParticipantId ? (nameByParticipantId.get(o.owedToParticipantId) ?? 'somebody on this check-in') : null,
        status: o.status ?? null,
      })),
      personObjective: personObjective
        ? {
            text: personObjective.text,
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
          }
        : null,
      partyType: checkIn.participant.partyType,
      /* Who is answering, by first name where they have one. See TALKING_TO in the block. */
      readerName: ((checkIn.participant as any)?.user?.firstName ?? '').trim() || null,
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
      totalSessions: totalSessionsFor(ground.timelineDays, ground.cadence) ?? undefined,
      roleAsDescribed: checkIn.participant.roleAsDescribed,
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
          label:
            displayName(p as any) ??
            aNameOrNothing(p.roleAsDescribed) ??
            'a teammate',
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
      sharedNote:
        (ground as any).leadContextNotes
          ?.find((n: any) => n.audience === 'EVERYONE' && !n.participantId)
          ?.text?.trim() || undefined,
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
                  label: displayName(p as any) ?? aNameOrNothing(p.roleAsDescribed) ?? 'a teammate',
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
      adminBrief: (ground as any).brief ?? null,
      objectives: (ground as any).objectives ?? [],
      priorContext: checkIn.participant.roleAsDescribed ?? null,
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
    const howWeDoIt = howThisCompanyDoesIt(companyCards);

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
        who: nameOf(d.participant?.user) ?? d.participant?.email ?? null,
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
        who: nameOf(d.participant?.user) ?? d.participant?.email ?? null,
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
${target ?? 'No pre-agreed target - ask the person what success was supposed to look like when this started, then measure their account against their own answer.'}
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
        .map((p: any) => [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || p.roleAsDescribed || '')
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
          select: { text: true, documentSays: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        })
        .then((rows) => rows.length
          ? 'A DOCUMENT THEY CAN SEE READS DIFFERENTLY FROM SOMETHING THEY SAID. This is theirs to answer, once, as an ordinary question: put the two side by side and ask which is current. Never say the document is right. Never say they were wrong. Do not raise it twice.\n'
            + rows.map((r) => `- They said: "${r.text.replace(/^\[VERIFIABILITY:\w+\] /, '')}". The document says: "${r.documentSays}".`).join('\n')
          : '')
        .catch(() => ''),
      this.prisma.checkIn
        .findUnique({ where: { id: checkIn.id }, select: { closeHeldAt: true } })
        .then((r) => (r?.closeHeldAt ? THE_CLOSE_WAS_HELD : ''))
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
    /* What the invention gate may treat as already said. See knownForThisTurn. */
    this.knownForThisTurn.set(checkIn.id, [
      ...(ground.participants ?? []).flatMap((p) => [p.user?.firstName ?? '', p.user?.lastName ?? '', p.roleAsDescribed ?? '']),
      ...(ground.leadContextNotes ?? []).map((n) => n.text ?? ''),
      ...uploadedDocs.map((d: any) => `${d.fileName ?? ''} ${d.content ?? ''} ${d.uploaderNote ?? ''}`),
      ...((ground as any).objectives ?? []).map((o: any) => `${o.name ?? ''} ${o.target ?? ''}`),
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
      ['finalSession', finalSessionContext], ['returningUser', returningUserContext], ['roleProbe', roleProbeBlock], ['coaching', coachingBlock], ['patternProbe', patternProbeBlock],
      ['floorGiveBack', theFloorGiveBack], ['whoCarries', numbersAndOwners.whoCarries], ['whereItStands', numbersAndOwners.whereItStands],
      ['seenBefore', seenBefore], ['closeHeld', closeHeldLine], ['documentReadsDifferently', documentReadsDifferently], ['documentNotAsDescribed', documentNotAsDescribed], ['rhythm', rhythmNow], ['dynamicContext', dynamicContext], ['docs', docContext],
      ['docHint', docPromptHint], ['notes', notesBlock], ['deliveries', deliveriesBlock], ['burden', burden], ['putThisToThem', putThisToThem],
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
    const packForThisSituation =
      scenarioPackOverride ?? buildScenarioPackForParty(ground.scenario as any, checkIn.participant.partyType as any, undefined, undefined, checkIn.participant.roleAsDescribed ?? null);
    /* And where the pack's own spine is, read the same way. The pack says "skip any they have already
       answered"; this says which. */
    const spineSoFar = how?.forTheOpener ? '' : whereTheSpineIs(packForThisSituation ?? '', turnsThisSession);

    /*
     * THE PLAN FOR THIS SESSION. Written once, at the opener, from everything above; read at the top of
     * every turn with where the session has got to in it. See the-plan-for-this-session.
     */
    const planBlock = await this.thePlanForThisSession(checkIn, ground, {
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
        return (p?.user?.firstName ?? '').trim() || (p?.roleAsDescribed ?? '').split(/[.,]/)[0].trim() || 'they';
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
      ['openWithSomethingNew', OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE],
      ['planBlock', planBlock], ['disagreementBlock', disagreementBlock], ['recordAlreadyHolds', recordAlreadyHolds], ['doesNotAddUp', doesNotAddUp], ['owedBlock', owedBlock], ['spineSoFar', spineSoFar], ['intakeBlock', intakeBlock],
      ['pendingLines', pendingLines.join('')], ['evidenceLines', evidenceLines.join('')],
      ['theirWeek', theirWeek], ['howWeDoIt', howWeDoIt], ['styleBlock', styleBlock],
      ['clarificationContext', clarificationContext], ['selfCorrectionContext', selfCorrectionContext],
      ['finalSessionContext', finalSessionContext], ['returningUserContext', returningUserContext],
      ['roleProbeBlock', roleProbeBlock], ['coachingBlock', coachingBlock],
      ['patternProbeBlock', patternProbeBlock], ['theOneThingBack', theOneThingBack],
      ['theFloorGiveBack', theFloorGiveBack], ['whoCarriesWhichPart', numbersAndOwners.whoCarries], ['whereTheNumberStands', numbersAndOwners.whereItStands],
      ['oneThingToDoBetter', oneThingToDoBetter],
      ['seenBefore', seenBefore], ['closeHeldLine', closeHeldLine],
      ['documentReadsDifferently', documentReadsDifferently], ['documentNotAsDescribed', documentNotAsDescribed],
      ['rhythmNow', rhythmNow], ['dynamicContext', dynamicContext], ['docContext', docContext],
      ['docPromptHint', docPromptHint], ['notesBlock', notesBlock], ['deliveriesBlock', deliveriesBlock],
      ['burden', burden], ['putThisToThem', putThisToThem],
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

    return [systemPrompt, theirLanguage, VOCABULARY_RULE, OPEN_WITH_SOMETHING_THEY_DO_NOT_ALREADY_HAVE, planBlock, disagreementBlock, recordAlreadyHolds, doesNotAddUp, owedBlock, spineSoFar, intakeBlock, ...pendingLines, ...evidenceLines, theirWeek, howWeDoIt, styleBlock, clarificationContext, selfCorrectionContext, finalSessionContext, returningUserContext, roleProbeBlock, coachingBlock, theOneThingBack, theFloorGiveBack, numbersAndOwners.whoCarries, numbersAndOwners.whereItStands, oneThingToDoBetter, seenBefore, closeHeldLine, documentReadsDifferently, documentNotAsDescribed, rhythmNow, dynamicContext, docContext, docPromptHint, notesBlock, deliveriesBlock, burden, putThisToThem, cannotBeMissed, askedLastTurn, patternProbeBlock].filter(Boolean).join('\n\n');
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
        select: { mode: true },
      });
      if (ground?.mode !== 'SHARED') return '';
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
          fromParticipant: { select: { roleAsDescribed: true, user: { select: { firstName: true, lastName: true } } } },
        },
        take: 40,
      });
      const others = rows.map((r: any) => ({
        what: r.what ?? '',
        raisedBy: [r.fromParticipant?.user?.firstName, r.fromParticipant?.user?.lastName].filter(Boolean).join(' ').trim()
          || aNameOrNothing(r.fromParticipant?.roleAsDescribed ?? null),
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
          participant: { select: { roleAsDescribed: true, user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      const onThem = rows.map((r: any) => ({
        name: [r.participant?.user?.firstName, r.participant?.user?.lastName].filter(Boolean).join(' ').trim()
          || aNameOrNothing(r.participant?.roleAsDescribed ?? null) || '',
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
        select: { code: true, periodsObserved: true, accuracyRating: true },
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

  /** platform_settings.coaching_live = true, set by hand once the first outputs have been read. */
  private async coachingIsLive(): Promise<boolean> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key: COACHING_LIVE_KEY } });
      return row?.value === true || row?.value === 'true';
    } catch {
      return false;
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

    /**
     * THE LEAD'S ENTRY CAN DETERMINE WHAT SOMEBODY IS COACHED ON.
     *
     * I built this reading only the person's own transcript against their role map,
     * and ignored the lead completely - the third time in one sitting I treated the
     * lead's input as a liability rather than as an input. It is the opposite: a
     * lead's note is usually WHY the ground exists, and their check-ins shape what
     * matters as priorities move. A coaching layer that cannot hear "the handover is
     * the thing that matters this month" is coaching last month's ground.
     *
     * a-hypothesis-is-not-a-finding.ts already drew the line and nothing had ever
     * called it: mayShapeProbing is true for a hypothesis, mayBeSurfaced is not. So
     * the note steers WHICH behaviour is looked for first, and the REASON still has
     * to come from what the person said. That order is the whole guardrail:
     *
     *   the lead says where to look        allowed, and useful
     *   the lead's words become the reason  never - the prompt takes the reason from
     *                                       the transcript, and a step with no reason
     *                                       is refused by the machine
     *
     * So a lead can point at ownership and the coach still says nothing unless this
     * person's own session showed something about ownership.
     */
    // Optional chaining, and a catch, because a steer is an improvement to the
    // question and must never be the reason nobody gets coached. My first version
    // used .catch() alone, which does nothing when the accessor itself is missing -
    // a synchronous TypeError, not a rejected promise.
    const leadNotes = await (this.prisma.leadContextNote?.findMany({
      where: { participantId },
      select: { text: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }) ?? Promise.resolve([] as { text: string }[])).catch(() => [] as { text: string }[]);
    const steer = leadNotes.length
      ? `\n\nWHAT THE PERSON RUNNING THIS GROUND HAS SAID MATTERS (most recent first). Use this ONLY to decide which behaviour above to look at first. It is not evidence, it is never the reason, and if the transcript does not show the behaviour then the answer is still none:\n${leadNotes.map((n) => `- ${n.text}`).join('\n')}`
      : '';

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
     * show it, the answer is still none - the same rule the lead's steer above already carries, and
     * for the same reason: a pattern is a place to look, not a finding to confirm.
     */
    const surfaced = await (this.prisma.patternDetection?.findMany({
      where: { participantId, status: 'SURFACED' as any },
      select: { observationText: true, periodsObserved: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 3,
      /*
       * Optional chaining AND a catch, the same shape as the lead's steer above and for the reason
       * written there: `.catch()` alone does nothing when the accessor itself is missing - that is
       * a synchronous TypeError, not a rejected promise. A steer must never be the reason nobody
       * gets coached.
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
      [{ role: 'user', content: `BEHAVIOURS FOR THIS KIND OF WORK:\n${behaviours}${steer}${alreadySeen}\n\nTRANSCRIPT:\n${transcript}` }],
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
    if (read?.noticed && read.reason?.trim() && !observations.some((o) => o.sessionNumber === sessionNumber && o.noticed === read.noticed)) {
      observations.push({ sessionNumber, noticed: read.noticed, reason: read.reason.trim() });
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
  async complete(checkInId: string, requestingUserId: WhoIsAsking, how: { theyAskedToFinish?: boolean } = {}) {
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
          'A few more exchanges are needed before this check-in can close - the record is still thin. Answer one or two more questions, then complete.',
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
    const substantiveTurns = personTurnRows.filter((t) => (t.content?.trim().length ?? 0) >= 12);
    const totalPersonChars = personTurnRows.reduce((sum, t) => sum + (t.content?.trim().length ?? 0), 0);
    const MIN_CHARS = checkIn.isSelfCorrection ? 20 : 50;
    const MIN_REAL_TURNS = checkIn.isSelfCorrection ? 1 : 2;

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
    if (totalPersonChars < MIN_CHARS || substantiveTurns.length < MIN_REAL_TURNS) {
      throw new BadRequestException({
        message: 'There is almost nothing here yet. Answer a couple of the questions properly, then complete.',
        canContinue: true,
      });
    }

    return this.finishTheSession(checkIn, 'the person');
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
      include: { participant: { include: { user: { select: { awaitingOrgApproval: true, firstName: true } } } } },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');
    return this.finishTheSession(checkIn, 'the clock');
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
  private async finishTheSession(checkIn: any, by: 'the person' | 'the clock'): Promise<{ status: 'completed'; groundId: string }> {
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

    await this.extractRecordEntries(checkIn.id, checkIn.participantId).catch((err) =>
      this.logger.error(`Record extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );
    /* The lines just taken are read against the documents this person can see. Best effort, after
       the extraction they depend on, before the report reads recallBased. */
    await this.anchorRecordToDocuments(checkIn.participantId, checkIn.groundId).catch((err) =>
      this.logger.warn(`Document anchoring failed for participant ${checkIn.participantId}: ${err.message}`),
    );

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
    await this.settleTheGaps(checkIn).catch((err) =>
      this.logger.warn(`Check-in ${checkIn.id}: could not settle the gaps: ${err?.message}`));
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
      return { status: 'completed', groundId: checkIn.groundId };
    }
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

    return { status: 'completed', groundId: checkIn.groundId };
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
    if (hasEnded(ground?.status)) {
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
      select: { timelineDays: true, cadence: true },
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
    const planned = step > 0 && ground ? Math.max(1, Math.floor(ground.timelineDays / step)) : null;
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
  private async scoreSessionSpecificity(checkInId: string): Promise<{
    level: SpecificityLevel;
    dimensions: Record<string, SpecificityLevel>;
  }> {
    const personTurns = await this.prisma.conversationTurn.findMany({
      where: { checkInId, role: TurnRole.PERSON },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });
    if (personTurns.length === 0) {
      /* One verdict about nothing, not two: the level and every dimension are the bottom. */
      const dims = { delivery: NOTHING_SAID, evidence: NOTHING_SAID, enablement: NOTHING_SAID, coverage: NOTHING_SAID, commitment: NOTHING_SAID };
      return { level: NOTHING_SAID, dimensions: dims };
    }

    const all = personTurns.map(t => runIntake(t.content));
    /*
     * A RELUCTANT PERSON GIVES ONE FACT PER TURN, AND THE MEAN PUNISHED THEM FOR IT. "Forty tonnes a
     * week." "October." "Six of them." were three checkable answers between six "fine"s and "no"s,
     * and the mean over nine turns came out under the bottom cut: "managed", "nothing checkable", on
     * a rice miller who had named his tonnage, his month and his headcount (adversarial run, 20 Sep
     * 2026). The level is read over the turns that said anything - a bare "no" or "fine" is a turn
     * of the conversation, not a turn of the account - and whether ANY turn was checkable is kept
     * as its own fact, because that is the question the board asks.
     */
    const substantive = all.filter((r, i) => r.checkable || (personTurns[i].content ?? '').trim().split(/\s+/).length > 3);
    const intakes = substantive.length ? substantive : all;
    const anyCheckable = all.some((r) => r.checkable);
    const n = intakes.length;
    const avgSpecificity = intakes.reduce((s, r) => s + r.specificity, 0) / n;

    // Five dimensions derived from runIntake() aggregates.
    const avgDelivery   = intakes.reduce((s, r) => s + r.outputScore, 0) / n;
    const avgEnablement = intakes.reduce((s, r) => s + r.thinkingScore, 0) / n;
    const coverageScore = Math.min(1, (intakes.filter(r => r.types.includes('absorption') || r.types.includes('rescue')).length / n) * 1.5);
    const commitScore   = intakes.filter(r => r.types.includes('movement')).length / n;

    const dimensions: Record<string, SpecificityLevel> = {
      delivery:   mapSpecificityLevel(avgDelivery),
      evidence:   mapSpecificityLevel(avgSpecificity),
      enablement: mapSpecificityLevel(avgEnablement),
      coverage:   mapSpecificityLevel(coverageScore),
      commitment: mapSpecificityLevel(commitScore),
      /* Kept as a level so the column's type holds: 'specific' means at least one turn could be checked. */
      checkable:  anyCheckable ? 'specific' : NOTHING_SAID,
    };

    return {
      /* A session with a checkable turn in it is never "nothing checkable was said". */
      level: anyCheckable && mapSpecificityLevel(avgSpecificity) === NOTHING_SAID ? 'vague' : mapSpecificityLevel(avgSpecificity),
      dimensions,
    };
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
          firstName: ((checkIn.participant as any)?.user?.firstName ?? '').trim() || null,
          roleAsDescribed: checkIn.participant?.roleAsDescribed ?? null,
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
        await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { sessionPlan: plan as any } }).catch(() => undefined);
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

  async extractRecordEntries(checkInId: string, participantId: string) {
    const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } });
    if (turns.length === 0) return;

    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    /* Their side alone, kept for the check after extraction. See a-record-is-what-they-said.ts. */
    const whatTheySaid = turns.filter((t) => t.role !== TurnRole.AI).map((t) => t.content).join('\n');
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

    const valid = (result?.entries ?? []).filter(
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
        isTheirs(e.text, whatTheySaid),
    );

    /*
     * Worth a line in the log rather than silence: it is how anybody finds out that the extractor
     * has started reaching for the session's words again.
     */
    const dropped = (result?.entries ?? []).length - valid.length;
    if (dropped > 0) this.logger?.log?.(`Dropped ${dropped} extracted entr${dropped === 1 ? 'y' : 'ies'} on check-in ${checkInId} as not traceable to what the person said.`);
    if (valid.length === 0) return;

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
    await this.prisma.recordEntry.createMany({
      data: valid.map((e) => {
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
          text: theLineWithoutItsDanglingJoin(e.text),
        };
      }),
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

  async anchorRecordToDocuments(participantId: string, groundId: string): Promise<{ backed: number; of: number; readsDifferently?: number }> {
    const [docs, entries] = await Promise.all([
      this.prisma.groundDocument.findMany({
        where: { groundId, OR: [{ participantId }, { visibility: 'OPEN' as any }] },
        select: { id: true, fileName: true, content: true, origin: true, descriptionCheck: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }).then((all) => all.filter((d) => {
        /* A document that does not read as its uploader described it backs nothing until they have
           answered for it. It is still on the list and still theirs; it just carries no weight yet. */
        const check = d.descriptionCheck as any;
        return !(check && check.matches === false);
      })),
      /* Every line of theirs, backed or not: a line one document backs can still be read differently
         by a newer one (the revised offer letter that moves the start date), and that is the case that
         matters most. Only an unbacked line can become backed here. */
      this.prisma.recordEntry.findMany({
        where: { participantId, disputedAt: null },
        select: { id: true, text: true, recallBased: true },
        orderBy: { createdAt: 'asc' },
        take: 120,
      }),
    ]);
    /*
     * A DOCUMENT WE COULD NOT READ BACKS NOTHING. Its content is our own sentence saying we could
     * not open it, and handing that to the model invites it to anchor somebody's record line to an
     * apology - which then counts as document-backed, which is what makes a report say the evidence
     * is strong. Three other readers already stepped around these; this one did not exist yet.
     */
    const readable = onlyWhatWeCouldRead(docs);
    if (!readable.length || !entries.length) return { backed: 0, of: entries.length, readsDifferently: 0 };
    const documents = readable.map((d, i) => `[${i}] "${d.fileName}"\n${(d.content ?? '').slice(0, 6000)}`).join('\n\n');
    const lines = entries.map((e, i) => `[${i}] ${e.text.replace(/^\[VERIFIABILITY:\w+\] /, '')}`).join('\n');
    const result = await this.anthropic.extract<{ backed: { line: number; document: number; where: string }[]; readsDifferently?: { line: number; document: number; says: string }[] }>(
      ANCHOR_TO_DOCUMENTS_PROMPT,
      [{ role: 'user', content: `DOCUMENTS:\n${documents}\n\nRECORD LINES:\n${lines}` }],
      ANCHOR_TO_DOCUMENTS_SCHEMA,
    ).catch(() => null);
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
      const text = `On ${about}, they described: ${theirs}. What is written here: ${written}. `
        + `Which is right is worth settling - the written one may be out of date.${told}`;

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
      select: { user: { select: { email: true } } },
    });
    const person = me?.user?.email
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
  ) {
    const result = await this.anthropic.extract<{
      promises: { promise: string; kind?: string; check?: string; dueKind?: string; dueSaid?: string; owedTo?: string; target?: string; measure?: string }[];
    }>(OWN_PROMISE_PROMPT, [{ role: 'user', content: transcript }], OWN_PROMISE_SCHEMA);
    if (!result?.promises?.length) return;

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
    }
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
      await this.writeTheirOwnPromises(participantId, groundId, transcript, saidOn, ground.participants as any);
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
    }>(EXPECTATION_PROMPT, [{ role: 'user', content: transcript }], EXPECTATION_SCHEMA as any);
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
        select: { id: true, text: true, trackedUrl: true },
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

        /*
         * AND A COPY THAT OUTLIVES THIS GROUND, for the org layer.
         *
         * Additive: the row above stays authoritative for this ground and nothing here changes what
         * a check-in does. The mirror is what lets somebody's word carry into the next one. Failing
         * to mirror must never fail the check-in that was being written, so `mirrorCommitment`
         * swallows its own errors and returns false.
         */
        if (kind === 'COMMITMENT') {
          const person = await this.prisma.groundParticipant.findUnique({
            where: { id: target },
            select: { email: true, ground: { select: { organizationId: true } } },
          });
          const roster = person?.email
            ? await this.prisma.person.findFirst({
                where: { organizationId: person.ground.organizationId, email: person.email.toLowerCase() },
                select: { externalId: true },
              })
            : null;
          await mirrorCommitment(this.prisma, {
            organizationId: person!.ground.organizationId,
            groundId,
            personObjectiveId: created.id,
            personExternalId: roster?.externalId ?? null,
            text,
            dueSaid,
            /* Only ever a date somebody actually gave. `dueSaid` is never parsed into one. */
            dueAt: null,
          });
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
      .map((a) => (a.target != null && !numbersInTheirWords.has(a.target) ? { ...a, target: null } : a));
    if (aims.length) {
      /* Against their own aims AND the shared ones: a participant restating the check-in's $400,000 as
         "bring in $400k of new business" is not setting a second target (run 6, 20 Sep 2026). */
      const existing = await this.prisma.groundObjective.findMany({
        where: { groundId, OR: [{ ownerParticipantId: null }, ...(aimsAreShared ? [] : [{ ownerParticipantId: participantId }])] },
        select: { name: true, target: true },
      });
      /* Matching on the name alone put "units of tea sold in Abuja (10,000)" and "10,000 units
         (10,000)" on the same board, as two objectives. See an-aim-said-twice-is-one-aim. */
      const fresh = theAimsThatAreNew(aims, existing as any, (n) => numbersInTheirWords.has(n));
      if (fresh.length) {
        await this.prisma.groundObjective.createMany({
          data: fresh.map((a, i) => ({ groundId, name: a.name, target: a.target, sortOrder: existing.length + i, ownerParticipantId: aimsAreShared ? null : participantId, setByParticipantId: participantId })),
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

    await this.putOwnedTargetsOnTheRecord(groundId, theirOwnNumbers, participantId);
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
    const owned = await this.prisma.groundObjective.findMany({
      where: { groundId, ownerParticipantId: { not: null } },
      select: { name: true, ownerParticipantId: true },
    });
    const held = new Set(owned.map((o) => `${o.ownerParticipantId}::${o.name.trim().toLowerCase()}`));
    const fresh = rows.filter((t) => !held.has(`${t.participantId}::${t.name.trim().toLowerCase()}`));
    if (!fresh.length) return [];
    const wrote = await this.prisma.groundObjective.createMany({
      data: fresh.map((t, i) => ({
        groundId,
        name: t.name,
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
      select: { email: true, user: { select: { firstName: true, lastName: true } } },
    });
    /* `from` is which side stated it and `statedBy` is who. Both are the customer's own handles
       rather than row ids, because a figure has to stay readable after anybody leaves. */
    const who = [participant?.user?.firstName, participant?.user?.lastName].filter(Boolean).join(' ')
      || participant?.email
      || participantId;

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
  async extractDependencies(checkInId: string, participantId: string, groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { mode: true, scenario: true, participants: { select: { id: true, email: true, user: { select: { firstName: true, lastName: true } } } } },
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
      dependencies: { what: string; onName?: string | null; onLabel?: string | null; status: string; then?: string | null; triedSaid?: string | null; namedTheThing?: boolean }[];
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

    for (const d of valid) {
      const onParticipantId = matchParticipant(d.onName);
      const status = (['BLOCKING', 'WAITING', 'CLEARED'] as const).includes(d.status as any)
        ? (d.status as DependencyStatus)
        : DependencyStatus.WAITING;
      const onLabel = onParticipantId ? null : (d.onLabel?.trim() || d.onName?.trim() || null);
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
          },
        });
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
        },
        select: { id: true, what: true, onParticipantId: true, onLabel: true, status: true, namedTheThing: true },
      });
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
      select: { type: true, text: true },
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

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: {
        soloArtifact: JSON.stringify({ summary: result.summary, whatToCarry: result.whatToCarry ?? '' }),
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
    return { artifact: JSON.parse(p.soloArtifact) as { summary: string; whatToCarry: string }, generatedAt: p.soloArtifactAt };
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
      const said = docs.map((d) => theContextWeHave(d.holds as any, { asking: true })).filter(Boolean) as string[];
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
    const submittedCount = await this.prisma.checkIn.count({
      where: { groundId, status: CheckInStatus.COMPLETED },
    });
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
        objectives: { select: { name: true, target: true, ownerParticipantId: true }, orderBy: { sortOrder: 'asc' } },
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
      include: { participant: { include: { user: { select: { awaitingOrgApproval: true, firstName: true } } } } },
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
