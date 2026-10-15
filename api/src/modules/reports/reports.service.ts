import { HOW, whatProvedIt } from '../conversation/the-end-card';
import { filesSentWith } from './files-sent-with-a-check-in';
import { aRoleOrNothing } from '../../common/a-role-or-nothing';
import { theOpenSession } from '../engagement/heres-what-is-new';
import { recordThatTheLeadRead } from './a-lead-read-this-report';
import { aNumberInWords } from '../engagement/a-number-in-words';
import { theSharedPictureSubject } from '../engagement/the-leads-subjects-carry-the-facts';
import { theFirstInsight, theFindingOnItsOwn } from '../engagement/the-first-insight';
import { theFactsOfTheWeek, theWeekOf } from '../email/the-leads-weekly-letter';
import { theRecordsClock, theDayItBegan, wholeDaysTo } from '../board/a-wait-is-dated-not-counted';
import { THE_REPORT_IN_SIMPLER_WORDS } from '../grounds/what-is-sent-in-simpler-words';
import { aWaitOnOneself } from '../board/a-thing-is-not-somebody';
import { notToldYet, withoutGoalsNotToldIn } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { aCheckInStartedFromTheAnchor } from '../conversation/the-anchor-weekly-check-in';
import { theWordsOfWhatTheLeadHasNotToldThemAbout, theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { onceAcrossCopies, theHour, theWeek } from '../prisma/once-across-copies';
import { theJudgementWithItsConversationPoints } from './the-judgement-and-a-goal-not-told';
import { whatEachLabelIsCalled, withoutInternalLabelsIn } from './no-internal-label-reaches-anyone';
import { thePrivateSummaryAsRead } from '../conversation/the-private-summary-opens-with-a-sentence';
import { whoIsInTheRound } from './how-many-have-answered';
import { whoHasNotJoinedYet } from '../grounds/invited-not-joined-yet';
import { whoIsNotLetInYet, theWaitingToBeLetInLine } from '../grounds/who-an-admin-did-not-let-in';
import { isFromOutside, whoOnACheckInIsAway } from '../suites/who-is-away';
import { AsyncLocalStorage } from 'async_hooks';
import { canSeeDocument } from '../documents/who-can-see-a-document';
import { targetsHiddenFrom, withoutHiddenTargetsIn } from '../board/a-hidden-target-stays-hidden';
import { THEIR_OWN_WORDS_IN_A_REPORT, withTheirOwnWordsKept } from '../board/their-own-words-stay';
import { withoutLinesWithNoWords } from './a-line-with-no-words-is-not-a-line';
import { namesThisReaderMayNotOpen, withoutPrivateFileNamesIn } from '../documents/a-private-file-is-not-named';
import { namesNotEverybodyMayOpen, withoutPrivateFileNames } from '../documents/a-private-file-is-not-named';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { howToSayIt, NEVER_CONCLUDE_FROM_A_KIND, WHAT_IT_MEANS, WHO_CAN_MOVE_IT } from '../board/what-kind-of-thing-is-in-the-way';
import { howItReads, WHAT_A_NUMBER_IS_NOT, NEVER_CONCLUDE_FROM_A_NUMBER } from '../public-api/a-number-does-not-argue';
import { whatTheRecordsReach, NEVER_CONCLUDE_ABOUT_SHIPPING } from '../public-api/what-shipped-actually-means';
import { whatCouldBeChecked, AClaim, COULD_NOT_WORK_IT_OUT } from './what-nothing-here-could-check';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { confidenceInThePicture, CURRENT_BEST_READING, theFiveReadings } from './confidence-in-the-picture';
import { softSpots, whatWouldRaiseIt } from './harder-to-fool';
import { markWhatOnlyTheLeadSaid, whyItWasDropped } from './a-lead-note-is-not-evidence';
import { whatALeaderCanWeigh, THIS_IS_MATERIAL_NOT_A_VERDICT, whoIsReadingTheWeighing } from './what-a-leader-can-weigh';
import { accountShapeFor, standardsAndWhatTouchedThem, type EntryRow } from './what-the-record-actually-holds';
import { forbiddenNames, sanitiseGuide, PostReportGuide } from './guide-sanitiser';
import { whereYouAreAgainstWhatYouNamed } from './where-you-are-against-what-you-named';
import { DIRECTION_PROMPT, DIRECTION_TOOL, tidy, isItADirection, whatYouNamed, mergeDirections, inChunks, ACCOUNTS_PER_READ, TheDirection, whereTheRoomSplit, withTheNumbersTheModelMissed } from './what-the-room-said';
import { anAimIsOwedHere } from '../entry/a-check-in-with-no-aim-has-nothing-to-read-against';
import { whenThisWouldHaveSurfaced } from './when-this-would-have-surfaced';
import { ONE_SITTING_ONLY, ALREADY_IN_THE_OPEN } from './there-is-not-always-a-next-time';
import { isThisACascade } from '../board/is-this-a-cascade';
import { theSessionReport, hasOwnerAndDate } from './the-session-report';
import { readableWithoutFieldNames } from './no-field-names-on-the-page';
import { whatToWorkOnNext, theNoteBeforeYouHaveCheckedIn } from './what-to-work-on-next';
import { whatToProbe } from './what-to-probe';
import { wordedByTheModel, type Drafted, type Compose } from './the-engine-drafts-it-the-model-words-it';
import { rememberedCompose } from './a-line-worded-once-is-kept';
import { wordPatternEvidence } from './pattern-evidence-in-plain-words';
import { runAtOnce, READERS_WARMED_TOGETHER } from './run-at-once-with-a-cap';
import { Syntheses, theSentenceWhileItIsWritten, withoutTheCountWhileItIsWritten } from './the-report-is-being-written';
import { itWasTakenFurther } from './what-they-said-they-did-about-it';
import { everyLineTheFinalCheckPasses, type WhatTheRecordHolds } from '../conversation/the-final-check';
import { whatTheRecordHolds } from '../conversation/what-the-record-holds';
import { whatALineOfTheirsIsCalled } from '../conversation/what-happened-to-what-they-said';
import { OneAtATime } from './one-warm-up-at-a-time';
import { stillRaised, notRaisedAgain, sayingWhatWentQuiet } from '../board/a-blocker-nobody-raised-again';
import { pickTheFinding, draftThePicture, draftTheQuestion, WHY_NO_QUESTION } from './the-picture-is-drafted-from-the-reads';
import { sentenceWithANumber } from './where-you-are-against-what-you-named';
import { COUNTS_AS_A_SOURCE, whatThisDocumentIs } from '../documents/what-kind-of-thing-a-document-is';
import { roleMapFor } from '../board/role-maps';
import { BoardFamily, familyFor } from '../board/board-families';
import { peersAreNamedOn } from './peers-are-named';
import { YOUR_OWN_ACCOUNT_IS_NOT_HERE } from './a-sentence-from-the-readers-side';

/**
 * The catalogue by code, so both coaching surfaces read the same plain words.
 *
 * BUILT ON FIRST USE, NOT AT IMPORT. As a module-level const this threw "Cannot access
 * 'pattern_library_1' before initialization" across twenty-five suites: this file and the pattern
 * library sit in an import cycle, and a top-level `new Map([...CODES])` runs while the other half
 * of the cycle is still an empty object. A function body runs after both are loaded.
 */
let patternByCode: Map<string, { code: string; signal: string; probe?: string }> | null = null;
const patternCatalogue = () => (patternByCode ??= new Map(
  /* All three families. A code missing from here reaches `.get(code)!` and takes the report
     down with it, which is what a fourth family would do next time. */
  [...BAD_FAITH_CODES, ...POSITIVE_CODES, ...CARRYING_CODES].map((c) => [c.code, c]),
));
import { cleanText } from './what-the-record-actually-holds';
import { theMarksOfAReport, markTheRows, withTheMarksOnItsLines, WHAT_EACH_MARK_SAYS } from './the-mark-on-every-line';
import { theMarkOf, whoAddedEachBackingDocument, WHAT_A_MARK_READS, type HowALineIsKnown } from './how-a-line-is-known';
import { withoutAGuessedPronoun } from './nobody-is-he-or-she-here';
import { whatDoesNotAddUpPerPerson, withoutUncountedAlls } from './the-picture-gets-what-the-conversation-gets';
import { factsAbout, type PersonFacts } from './the-facts-about-a-person';
import {
  thePictureInstruction, THE_PICTURE_SCHEMA, factsAsLines, whenThePictureCannotBeWritten, theCountSaidRight,
  type ThePicture,
} from './the-picture-in-plain-sentences';
import { howTheNumbersSit } from './do-the-parts-add-up-to-the-whole';
import { whatTheyCouldTry } from './what-you-could-try-next';
import { theQuestionOnly } from './the-question-ends-at-the-question-mark';
import { whatSituationThisIsAbout } from './what-situation-this-report-is-about';
import { totalSessionsFor } from '../grounds/session-count';
import { theSessionClock } from '../board/one-count-for-the-sessions';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { hasEnded } from '../grounds/a-ground-that-has-ended';
import { nobodyHasSaidWhoArrangedAnything } from '../conversation/who-secured-that-meeting';
import { oneBlockerPerThingWaitedOn, theyNamedWhatTheyAreWaitingOn } from '../board/a-blocker-with-nothing-in-it-is-the-same-blocker';
import {
  CORRECTION_WINDOW_KEY,
  DEFAULT_CORRECTION_WINDOW_DAYS,
  isAWindow,
  whetherItCanStillBeCorrected,
} from '../conversation/the-window-for-correcting-a-record';
import { labelsForParties, namesVisibleTo, readsWithNamesOf, withNames, viewerLabelOf, eachSideGetsSomebody, handleOf, plainWordsForTheUnnameable, plainWordsByPerson, atTheStart, THE_LEADS_LABEL, displayName } from './party-labels';
import { aMoveForTheReader } from './a-move-is-the-thing-to-do';
import { praiseTheNumbersDoNotSupport, sentencesTheNumbersDoNotSupport } from './praise-the-numbers-do-not-support';
import { withoutOtherPeoplesReads } from './own-reads-only';
import { findingsWithoutTheirLabels } from './a-finding-is-served-without-its-label';
import { gapsAsTheirSentences } from './a-gap-is-served-as-its-sentence';
import { linesBuiltAtTheRead } from './a-line-built-at-the-read-is-read-too';
import { whatTheRecordHoldsForBlame, type WhatTheRecordHoldsForBlame } from '../conversation/a-colleagues-fault-is-the-speakers-account';
import { quotesBuiltAtTheRead, theRecordAQuoteMayComeFrom, theRecordAQuoteMayComeFromByParticipant } from './a-quote-built-at-the-read';
import { whatTodayReads } from './what-today-reads-from-the-record';
import { theSameThingForTheLead } from '../board/the-same-thing-read-from-the-record';
import { everyLineIsReadBeforeItIsKept, AReader, REWRITE_THE_LINES, theLinesToRewrite, THE_LINES_REWRITTEN, theRewritesById } from './every-line-is-read-before-it-is-kept';
import { aNameInTheirWordsIsTheLabel } from './a-name-in-their-words-is-the-label';
import { everyQuoteFromTheRecord, theLinesAQuoteMayComeFrom, type ALabelAndAName } from './a-quote-is-what-they-said';
import { whatAParticipantMayRead } from './the-judgement-is-the-leads';
import { isEvaluationCheckIn, viewerIsTheSubjectOfAnEvaluationCheckIn } from './is-this-an-evaluation-check-in';
import { onlyCountsAndPatternsAboutTheOthers, theLeadsNamesOf, askTheReportsDoor, withoutSentencesAboutOneOfThem } from './one-persons-circumstances-stay-their-own';

/** The names of everybody in it but the reader and the lead, full and first, for the item 14 wall. */
function theOtherPeoplesNames(participants: any[], readerParticipantId: string | null, leadUserId: string | null): string[] {
  const out = new Set<string>();
  for (const p of participants ?? []) {
    if (!p || p.id === readerParticipantId || p.partyType === 'INITIATOR' || (leadUserId && p.userId === leadUserId)) continue;
    const first = (p.user?.firstName ?? '').trim();
    const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim();
    if (full) out.add(full);
    if (first.length > 2) out.add(first);
  }
  return [...out];
}
import { whatEachPersonSaidForTheSubject, deeplyWithoutColleaguesQuotesForTheSubject, theNewHireReadsTheLeadsWords } from './colleagues-exact-words-stay-with-the-manager';
import { theTableStaysWithTheEngine } from './the-table-is-for-the-engine';
import { tallyInReport } from './counts-accounts';
import { forensicInReport, withoutDashes } from './forensic-voice';
import { PrismaService } from '../prisma/prisma.service';
import { readAsANetwork, theNetworkInstruction, THE_NETWORK_REPORT_SCHEMA } from './a-hundred-accounts-are-not-two';
import type { AField } from '../conversation/what-a-complete-answer-holds';
import type { AFittedAnswer } from './fitting-an-answer-into-the-frame';
import {
  whatTheNumbersSay, howGoodIsThis, theTable, theJudgementInstruction, THE_JUDGEMENT_SCHEMA,
  thisIsARoom, theRoom, theJudgementOverARoom, THE_ROOM_JUDGEMENT_SCHEMA,
  THE_JUDGEMENT_ROOM_KEY, THE_JUDGEMENT_POPULATION_KEY, fillTheJudgement,
  everySentenceCarriesANumber, talksLikeAPerson,
} from './the-judgement-over-the-answers';
import { onePerPerson, howManyPeople, AnAnswerInItsSession } from './one-person-is-one-answer';
import { howFarBehind } from './a-report-behind-the-answers';
import {
  commitmentsOverTime, dependenciesOverTime, patternsOverTime, gapsOverTime, theOnesStillOpen,
  whatThisCannotTellYou, theRecordOverTime, toSettleFirst, overTimeForThisReader, WhatTheRecordShowsOverTime, aMeetingIsOnRecord, meetingsOnRecordFor,
  inOurVoice, looksLikeATimeOrADate,
} from './what-the-record-shows-over-time';
/*
 * THE ONE WORDING RULEBOOK, SPLIT BY SURFACE. The post-report guide is written to one person in the
 * moment, so it gets the rules themselves. The synthesis rules are appended to the shared report's
 * prompt, which is written once in labels and rendered for each reader, so they get the examples
 * and the rule about writing labels rather than "you". Imported, never retyped - see plain-words.ts
 * for what happened the last time three surfaces each kept their own copy.
 */
import { PLAIN_WORDS, PLAIN_WORDS_EXAMPLES, WRITTEN_ONCE_FOR_SEVERAL_READERS } from '../conversation/plain-words';
import { namesTheyMayRead, nothingIdentifyingIn, isHowItWasShared, type HowItWasShared } from './what-the-respondents-get';
import { computeArcSignals, tierCopy, ArcSignals } from './arc-features';
import { endStatesFor } from '../resolution/end-states';
import { withTheDisputeAttached, HOW_TO_READ_A_DISPUTED_LINE } from './a-disputed-line-is-shown-as-disputed';
import { isBaselineRound, withoutWhatOneRoundCannotShow, whyItIsTooEarly } from './a-read-needs-a-run';
import { PromptsService } from '../prompts';
import { AnthropicService } from '../conversation';
import { EmailService } from '../email/email.service';
import { UsageService } from '../usage/usage.service';
import { GroundsService } from '../grounds';
import { WorkspaceNotifierService } from '../workspace/workspace-notifier.service';
import { canShowMovement } from '../grounds/an-objective-belongs-to-a-person';
import { LEADERSHIP_PATTERNS, buildLeadershipPatternBlock } from '../board/coverage';
import { AN_UNCLAIMED_ADDRESS } from '../entry/the-open-link.service';
import { findDeferrals, findWaitingBehind, buildDeferralNotice } from './deferrals';
import { GroundStatus, PartyType, CheckInStatus, GroundScenario, UsageEventType, ReportActivationStatus, PatternStatus, RecordEntryType, Cadence, Prisma } from '@prisma/client';
import { NEW_STARTING_REPORT_SCHEMA, RECOGNITION_REPORT_SCHEMA, DRIFT_REPORT_SCHEMA } from '../conversation/prompt-library';
import { BAD_FAITH_CODES, POSITIVE_CODES, CARRYING_CODES, ALIGNMENT_FEED_ONLY_CODES, isPositiveCode, isCarryingCode, nameOfPattern } from '../patterns/pattern-library';
import { PATTERNS_ARE_SERVED } from '../patterns/patterns-are-served';
import { withTheEarlierRead } from '../patterns/stored-pattern-lines-through-the-wall';
import { servedPatterns, patternRowsThisReaderMayRead, periodsSeen, patternRowAsOfSession, PATTERN_ROW_SELECT, whoIsWhoIn, theOnesTheyAreSeeingFirst, markShownToThePerson, runsItForAPattern, type APatternRow } from '../patterns/who-reads-a-pattern';
import { periodOf, periodsTheRecordHolds, aTruePeriodCount } from '../patterns/period-of';
import { plainNameOf as plainPatternNameOf } from '../patterns/plain-pattern-names';
import { whatMoreThanOnePersonNamed, namedByMoreThanOne } from './what-more-than-one-person-named';
import { decide, RoundPicture } from './what-the-report-said-at-the-time';
import { aStoredSentenceReadsRight } from './a-stored-sentence-reads-right';
import { aJudgementThatReadsRight } from './the-judgement-reads-right';
import { onlyNumbersTheBlocksHold } from './a-number-the-blocks-hold';
import { whyNot } from './why-it-is-not-happening';
import { howThisHasMoved } from './how-this-has-moved';
import { doesThisReportMarkItsInferences } from './a-report-that-marks-nothing';
import { notTheWordParty } from './not-the-word-party';
import { whatYourOwnRecordSays } from './what-your-own-record-says';
import { whatChangedSinceLastTime } from './what-changed-since-last-time';
import { whyThereIsNoReportYet } from './why-there-is-no-report-yet';
import { aReportWithNoEmptyLine } from './a-report-has-no-empty-line';
import { whatThisRecordRestsOn, nothingRestsOnADocument } from './what-this-record-rests-on';
import { documentsSection } from './a-document-in-the-corpus';
import { differencesHeldToOneWeek, aDifferenceThatStands, theWeekOf as theWeekItWasSaidIn, type AStatementInItsWeek } from './a-difference-is-within-one-week';
import { everybodySaidLittle } from './a-record-can-be-thin-for-everybody';
import { whatTheRosterSaysAbout } from './a-party-who-spoke-is-not-absent';
import { THE_LEAD_ONLY_ASKS } from '../grounds/the-lead-who-only-asks';
import { everyDivergenceReadable } from './a-field-name-is-not-a-heading';
import { liftsInReport, withholdLiftsIn } from './said-in-its-own-words';
import { keepWhatTheFirstFound, whatADraftHolds, isAnEmptyReport } from './a-second-ask-keeps-what-the-first-found';
import { rankOf, labelFromMean } from '../conversation/how-checkable-a-session-was';
import { whatThisSessionHolds } from './what-this-session-holds';
import { adminsThisOrg, adminsTheOrg, readsAsAnAdmin, runsOrSetItUp } from '../grounds/who-may-read-this-check-in';
import { ONLY_THE_LEAD_RELEASES } from './only-the-lead-releases';
import { whoSharedItBecauseTheLeadLeft, fullNameOf, sharedByAnAdminFrom, type SharedBecauseLeadLeft } from './who-shared-it-because-the-lead-left';
import { theReaderIsYouOnTheirOwnLines } from './the-reader-is-you-on-their-own-lines';
import { refuseSomeoneHeldForASeat } from '../participants/held-for-a-seat';
import { CANNOT_READ_THE_REPORT_YET } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';
import { documentBackedShare } from './backed-by-a-document';
import { howManyHaveAnswered, howManyInTheRoundAnswered } from './how-many-have-answered';
import { NOT_A_QUIET_CLOSE, aQuietCloseWhere, AN_ANSWER } from '../grounds/an-answer-includes-a-refusal';
import { theInferencesOfSession, keptWithEachSessionsOwn } from './each-sessions-inferences-are-its-own';
import { asTheReleasedSessionHadIt, isThisSessionReleased, releasedSessionsOf, theLatestReleasedSession, theSessionTheReportHolds, thisSessionIsNotSharedYet, whatReleasingThisSessionDoes, withThisSessionReleased, youAreReadingAnEarlierSession } from './each-sessions-picture-is-released-on-its-own';
import { aRoleInTheirOwnWords, withoutTheLeadsDescriptionOfAnyone, deeplyWithoutTheLeadsDescriptionOfAnyone, theShareableTextFor } from '../grounds/the-leads-words-about-someone';

// Lookup from pattern code -> its name, for readable synthesis-evidence phrasing.
// Built once from the two code tables rather than duplicating names here.

/**
 * SOLO_ARTIFACT_SCHEMA and SOLO_ARTIFACT_PROMPT were defined here and used nowhere.
 *
 * The live pair lives in `conversation.service.ts`, which is what `buildSoloArtifact` calls. Two
 * definitions of one prompt is how the two came to differ - this copy still said "under 150 words"
 * while the one that runs said 200, and neither carried the rules about not inventing parties. A
 * dead copy of a prompt is worse than none: the next person to harden it has even odds of editing
 * the one that never executes.
 */
// Post-report conversation guide schema (#99).
const POST_REPORT_GUIDE_SCHEMA = {
  name: 'emit_post_report_guide',
  description: 'Emit a short guide to help each person walk into the conversation.',
  input_schema: {
    type: 'object',
    properties: {
      openingLine: {
        type: 'string',
        description: "One opening line this person can use to start the conversation - grounded, not defensive.",
      },
      questionToCarry: {
        type: 'string',
        description: 'One question they should carry into the room - a genuine inquiry, not a challenge.',
      },
      toAcknowledge: {
        type: 'string',
        description: "One specific thing the other person said that this person should take seriously, even if they see it differently.",
      },
    },
    required: ['openingLine', 'questionToCarry', 'toAcknowledge'],
  },
};

export const POST_REPORT_GUIDE_PROMPT = [
  "You are Groundwork. A shared report has just gone out to everyone in this ground. Given one person's own check-in entries and the shared picture, write a short, specific guide for that one person.",
  '',
  'Three things: (1) one opening line they can use to start the real conversation - grounded, not defensive; (2) one question to carry - genuine, not a challenge; (3) one concrete thing someone else said that they should take seriously, even if they see it differently.',
  '',
  'NEVER NAME ANYONE AND NEVER QUOTE ANYONE. Not a first name, not a role label, not "the lead", and not a phrase in quotation marks - including a two-word phrase you found in a record. Say "the other view" or "how someone else saw it". Naming who said what is the one thing this product promises it never does, and a form of words lifted from a private check-in identifies its author just as surely as a name does. Anything carrying a name or a quotation is discarded before the person sees it, so a guide written that way is simply lost.',
  '',
  'LEAD WITH THE GAP, NOT WITH REASSURANCE. The FIRST CLAUSE of the opening line must be about what is not settled. Not the second clause after a "but" - the first.',
  '',
  'These are all wrong, and all were produced on a ground whose entire finding was that people disagreed about what success meant:',
  '  "It is great that we have a shared handle on the concrete tasks and we are making progress. I think it would be helpful to connect..."',
  '  "It is good to see so much progress on our shared list; I want to make sure we are all clear on..."',
  '  "I am glad our tracking against the list is solid, but it feels important to talk about..."',
  '',
  'Each opens by congratulating the team on the part that was never in question, which buries the finding and makes whoever raises it sound like the difficult one. This is right:',
  '  "It looks like we have different views of what success is for the quarter."',
  '',
  'Do not open with: it is great, it is good, I am glad, well done, we are aligned, we are tracking well, we are making progress, good progress, solid. Do not soften the gap by pairing it with praise. Warmth is fine and belongs in HOW the difference is put; it is not a preamble to be got through first.',
  '',
  'ANCHOR THE OPENING IN WHAT THIS PERSON THEMSELVES SAID, NOT IN THE GAP AS A HEADLINE. Everyone is being handed a guide about the same gap, so an opening that only restates the gap comes out near-identical for all of them - and two colleagues comparing notes then find they were given the same sentence, which makes the whole thing read as generated rather than considered.',
  '',
  'So start from what THIS person has been working on or pressing for, in their own terms, and let the difference arrive out of that. "The weekly list has been my measure of whether we are on track, and I am not sure it is the same measure everyone else is using" leads with the gap AND could only have been written for the person who kept the list. This is still about the work, never about the other side: describe your own position and what is unsettled about it, never characterise anyone else\'s.',
  '',
  'Do not say which side of the gap anyone else is on, or how many people hold each view. Counting sides is taking a register of who agrees with whom, which is exactly the thing this report does not do.',
  '',
  'DO NOT ASSUME A MEETING. There may be no conversation scheduled, and there may never be a room. Never write "in the room", "in our meeting", "on the call", or "this session". The opening line is something they could say in a corridor, a message, or a one-to-one - so write it as words they could use, not as an agenda item for an event that may not exist.',
  '',
  'Brief and direct - no more than 3 sentences per item.',
  '',
  PLAIN_WORDS,
  '',
  /*
   * AND THE ONE PLACE THE RULEBOOK HAS TO GIVE WAY, SAID OUT LOUD RATHER THAN LEFT TO CHANCE.
   *
   * The rulebook says to use people's names, because on nearly every other surface a label where a
   * name belongs is the defect. This guide is the exception: it is written from one person's own
   * check-in and from the shared picture, and a name or a lifted phrase in it tells that person who
   * said what. The guide is discarded before anybody reads it if it carries one, so the two rules
   * have to be ranked here instead of leaving the model to guess which wins.
   */
  'ONE EXCEPTION TO THE RULES ABOVE, AND IT IS THE NAMING ONE. The rulebook says to use people\'s names. This guide names nobody, so write "the other view" or "how somebody else saw it" instead, exactly as the no-naming rule further up says. Everything else in the rulebook holds here: full sentences, plain words, no fragments, no management words.',
].join('\n');

/**
 * AND WHEN THE RUN IS OVER, IT IS A DIFFERENT CONVERSATION.
 *
 * Live run, 24 September 2026. Final report of a three-month consulting engagement the client was
 * about to end, and the guide handed her: "I have been thinking about what needs to happen in the
 * next two weeks, and it seems we have different ideas about the right pace for the work." A pace
 * conversation, two weeks out, on an engagement with no next fortnight in it. Everything in the
 * prompt above is written for a run that continues, because until now that was the only case it
 * knew about.
 */
export const THE_RUN_IS_OVER = [
  '',
  'THIS IS THE LAST ROUND. There is no next session and there may be no next fortnight of this work at all.',
  '',
  'So the conversation is not about pace, or about the next two weeks, or about how to work better together',
  'from here. Write it as the conversation people have at the end of something: what this came to, what is',
  'settled and what is not, and what each person needs in order to decide what happens next. Never assume the',
  'arrangement continues, and never assume it ends.',
].join('\n');

// Admin profile - extract preference signals from an initiator's check-in records.
const SIGNAL_EXTRACTION_PROMPT =
  'You are analysing the check-in record of the person who opened this ground (the initiator/lead). Identify 3 to 5 recurring preference signals - things they consistently probed on, pushed back on, or returned to across the session. Write each signal as a plain one-sentence observation that would help an AI know where to dig deeper on a future ground. Focus on probe patterns, not opinions. Do not include personal opinions, judgements, or anything that could embarrass the person if read back. Do not invent signals - only extract what is clearly present in the record.';

const SIGNAL_EXTRACTION_SCHEMA = {
  name: 'emit_lead_signals',
  description: 'Extract 3-5 preference signals from an initiator check-in record.',
  input_schema: {
    type: 'object',
    properties: {
      signals: {
        type: 'array',
        items: { type: 'string' },
        description: 'Each signal is one plain sentence describing a recurring probe or focus pattern.',
        minItems: 1,
        maxItems: 5,
      },
    },
    required: ['signals'],
  },
};

// Outcome learning - weekly prompt-version resolution-rate summary (#100).
const OUTCOME_LEARNING_PROMPT =
  'You are a Groundwork analyst. You are given structured data: for each active prompt version, the number of grounds resolved, the total outcomes, and the fairness rate (% of parties who said the process felt fair). Produce a 3 to 5 sentence summary identifying which version(s) have the highest resolution rate, any version showing decline, and a one-sentence recommendation. Data is anonymous - no names, no org identifiers.';

export const REPORT_SCHEMA = {
  name: 'emit_report',
  description: 'Emit the shared picture, agreements, divergences (the gap) and the one central question.',
  input_schema: {
    type: 'object',
    properties: {
      sharedPicture: { type: 'string', description: 'Plain-language synthesis of the situation from both records.' },
      agreements: { type: 'array', items: { type: 'string' }, description: 'What everyone sees the same way.' },
      divergences: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            /*
             * A TOPIC HAD NO DESCRIPTION AT ALL, AND CAME BACK AS A HEADING.
             *
             * On the workplan run it wrote "Total budget vs. proposed plans" and that string was
             * printed as the difference, on the lead's report, the lead's board and everybody
             * else's. It names the subject and says nothing about the disagreement, and "vs." is
             * the shape the wording rules exist to stop.
             */
            topic: {
              type: 'string',
              description:
                'What the people here disagree about, written as one plain, full sentence that names both sides of it. Somebody who reads only this sentence should understand the disagreement. Never a heading, never a fragment, and never "vs." - a live report wrote "Total budget vs. proposed plans", which tells a reader the subject and nothing else. Write "The lead says the budget is 180,000 and the team\'s plans add up to more than that" instead.',
            },
            positions: {
              type: 'array',
              description: "Where each person stands on this topic. Two on a two-person ground; more on a project or team ground.",
              items: {
                type: 'object',
                properties: {
                  participantLabel: { type: 'string', description: "How to refer to this person: their role if they have one (e.g. 'the project owner'), otherwise 'the initiator' or 'participant A'. Never a personal name. The reader's own copy substitutes real names in place of these, so write naturally around the label." },
                  view: { type: 'string', description: 'How this person described it, in plain language.' },
                },
                required: ['participantLabel', 'view'],
              },
            },
            evidence: {
              type: 'array',
              items: { type: 'string' },
              description: 'One or two plain, full sentences saying what people actually said that shows this gap. Each one is read on its own under the gap, so write a whole sentence, never a fragment and never a label with a colon after it. A short quotation of somebody\'s own words inside the sentence is fine and keeps their wording exactly. Omit the list if nothing in the record supports the gap.',
            },
            settledBy: {
              type: 'string',
              description:
                "What would settle this, in one short sentence a person could act on today. \"Agree one unit and who carries how much\" or \"put a date on the pricing sheet and tell the two people waiting on it\". Never advice about how to communicate, never \"have a conversation about it\" - name the decision or the thing that has to exist. Read off a live report: a difference was printed as the words \"The definition of success\" and nothing else, which told a reader what the subject was and nothing about what to do. Return an empty string only where the record genuinely points at nothing.",
            },
            atStake: {
              type: 'string',
              description:
                "One sentence on what happens TO THE WORK if this gap holds. About the work, never about a person: no fault, no prediction about anyone's behaviour, no consequence for an individual. Conditional, because it has not happened yet - \"if this holds, the quarter could end with...\". Say it plainly enough that a busy reader knows why this one is worth their attention. Write one for every gap you report: a gap that cleared the evidence bar almost always supports one. If and only if you would have to invent a consequence the record does not point to, return an empty string - never a filler sentence, and never something dramatic to fill the space.",
            },
          },
          // atStake is REQUIRED, and the empty string is how the model declines it.
          //
          // It was optional first, with an instruction to write one for every
          // gap. Across three real grounds it came back on one gap out of three,
          // including one where ten sessions of deferred decisions plainly
          // supported it - and rewording the instruction changed nothing,
          // because an optional field in a structured-output schema is one the
          // model can skip without ever weighing whether it should.
          //
          // Required forces the decision to happen. The escape survives as ''
          // rather than as absence, so declining is a thing the model does on
          // purpose rather than by omission, and the renderer treats '' exactly
          // as it treated a missing field.
          /* settledBy is required for the same reason atStake is: an optional field is one the
             model skips without ever weighing whether it should. '' is how it declines. */
          required: ['topic', 'positions', 'atStake', 'settledBy'],
        },
        description:
          "The gap. For each topic, where each person stands - never framed as one side being right.\n\nORDER MATTERS: put the gap that matters most FIRST, and order the rest after it. Significance is about the WORK: how much of the ground's purpose is exposed if the gap holds, how many people it reaches, and whether it undermines something the other agreements depend on. It is never about who is more at fault - you are ranking gaps, not people.",
      },
      centralQuestion: { type: 'string', description: 'The one question that, answered honestly, moves things forward.' },
      inferences: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'A short unique slug for this inference (e.g. "initiator-ownership-1").' },
            text: { type: 'string', description: 'The inferred statement as it appears in the report.' },
            participantLabel: { type: 'string', description: 'Who this inference is about, using the same label as above.' },
            reason: { type: 'string', description: 'One plain, full sentence saying what this was concluded from, given nobody said it themselves.' },
          },
          required: ['id', 'text', 'participantLabel', 'reason'],
        },
        description:
          'Claims in this report that YOU concluded, which no participant stated in their own account. A claim somebody wrote down is not an inference even when you have put it in your own words. Reading across two accounts, filling a gap from context, or drawing out an implication IS. Empty array only if every claim traces to something a participant actually said.',
      },
      hiddenContributors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: "Whose record references this contributor (e.g. 'the project owner')." },
            evidence: { type: 'string', description: 'One plain, full sentence saying what the record holds about this person, who was not credited.' },
          },
          required: ['label', 'evidence'],
        },
        description: "People whose input, work, or decisions come up in someone's check-in but who are not in this ground themselves - i.e. someone contributing behind the scenes with no voice here. Empty array if none.",
      },
      concernFlags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Who this observation is about, using the same label as above.' },
            observation: { type: 'string', description: 'A factual, evidence-based observation - never an accusation or verdict.' },
          },
          required: ['label', 'observation'],
        },
        description: "Plain observations, grounded only in what people actually said, where someone's contribution shows less follow-through, unmet commitments, or is noticeably thinner than others on this same ground. Say what is missing from the work, never pass judgement on the person. Empty array if nothing in the record supports this.",
      },
      leadershipGaps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              enum: LEADERSHIP_PATTERNS.map((p) => p.pattern),
              description: 'Which of the named leadership patterns this is. Use only these; do not invent one.',
            },
            gap: { type: 'string', description: 'The difference, stated as a gap in the work. Never quote either side and never name who said what.' },
            note: { type: 'string', description: 'One sentence on why this is worth a conversation rather than a correction.' },
            periods: { type: 'integer', description: 'How many distinct sessions/periods the pattern is visible across. One period is NOT a pattern - if you only see it once, do not report it.' },
            /**
             * WHAT THREE PERIODS ACTUALLY MEANT, IN TIME.
             *
             * A period is a check-in, not a month - so "visible across three periods" is three days on
             * a daily recovery ground and six weeks on a fortnightly one. The same sentence reads as
             * "this has been going on for a while" in both cases, and in one of them it has been going
             * on since Tuesday. The reader is often about to make a decision from it.
             */
            span: { type: 'string', description: 'How much real time those periods covered, in plain words, from the cadence: for example "three days" on a daily ground or "six weeks" on a fortnightly one. Never imply more elapsed time than the cadence allows.' },
          },
          required: ['pattern', 'gap', 'note', 'periods'],
        },
        description: "Where one person's sense of how they are LEADING differs from another's sense of how they are BEING LED, matched to one of the named leadership patterns. Only where the pattern's stated signature is genuinely met across more than one period. Empty array if there is no manager relationship here, or no pattern.",
      },
      specificityCauses: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            cause: { type: 'string', enum: ['behavioral', 'misunderstanding', 'adversarial', 'unclear', 'declined_by_choice'] },
            note: { type: 'string', description: 'One sentence explaining why this cause was inferred.' },
          },
          required: ['label', 'cause', 'note'],
        },
        description: "Where someone gave much more or much less detail than the rest, name the likely reason if it is inferable from the record itself: a behavioral pattern (e.g. consistently vague), a misunderstanding (e.g. confused about scope), an adversarial stance (e.g. deliberately withholding), 'declined_by_choice' if the record shows an explicit, stated decline to answer or provide evidence (a refusal is a choice, not vagueness and not bad faith - never file a genuine decline under adversarial or unclear), or 'unclear' if there is not enough evidence to say. Do not guess beyond what the record supports. Empty array if not inferable.",
      },
    },
    required: ['sharedPicture', 'agreements', 'divergences', 'centralQuestion', 'inferences'],
  },
};

export const SYNTHESIS_RULES = `SYNTHESIS RULES (override all other instructions if there is a conflict):
1. PRESERVE SPECIFICS VERBATIM. Every specific number ("three investor introductions in Q1"), named artifact ("one-page document"), named threshold ("30% cut by Friday"), and named organization or role from the records must appear in the report with the same precision. Never replace a specific with a category (do not convert "three introductions" to "specific milestones").
2. CAPTURE CONDITIONS. If someone's agreement is conditional ("I will cooperate provided that X", "but only if Y is agreed"), the agreements section must state the condition. Never flatten a conditional agreement into an unconditional one.
3. DO NOT PUT WORDS IN THE MOUTH OF SOMEONE WHO HAS NOT CHECKED IN. If someone has not given their side yet, do not describe what they agree with or think. Write "only [label] has checked in so far" rather than "both agree".
4. SURFACE ACTIONABLE COMMITMENTS. If someone named a specific deliverable, threshold, or exit condition (e.g., "I will leave if X is not met by Y"), it must appear in the agreements or gaps, with who said it and the exact terms.
5. NAME THE TENSION PRECISELY. If a conflict has a named structure (sequencing, values, role authority, information gap), name it explicitly in the divergences - do not soften it to "different perspectives."
5c. NEVER COUNT THE ACCOUNTS. Do not write "two of the three", "most people said", "the majority", "everyone except", "both colleagues", or any other tally of who reported what. On a ground with more than two people this is how a shared picture quietly turns into a verdict: three accounts describing the same friction becomes "three people said X about him", which is a case built by arithmetic rather than a gap named in the work. A gap is real because the record supports it, not because a number of people mentioned it. Write the divergence itself and the evidence for it. If several accounts point the same way, that shows in the evidence you cite; it is never the claim.

5b. WRITE LIKE A PERSON, NOT LIKE A CASE FILE. This is the register rule and it governs every sentence you write.

NEVER narrate through the record or the accounts. Banned openings: "The record shows", "The record describes", "The record contains", "Both records describe", "Both parties' records show", "The accounts differ", "Another account describes", "One account states". The reader knows where this came from. Announcing it every time reads like disclosure in litigation, which is the opposite of what this is: a shared picture of work, not a case being built against somebody.

Say the thing:
  WRITE: "For the first seven weeks the two of them were working to different ideas of what doing well meant."
  NOT:   "Both parties' records describe a period in which the parties operated with different definitions of success."

  WRITE: "Deadlines slipped in October and nobody flagged it."
  NOT:   "The record shows that deadlines were missed and no escalation is evidenced."

  WRITE: "He sees success as clearing the queue. She sees it as owning a client end to end."
  NOT:   "One account defines success as queue clearance; another account describes ownership."

Same facts every time. The second version of each sounds like a lawyer wrote it about strangers.

Do not say "party" or "parties" in anything the reader sees. Say the person's label, "the two of you", "everyone in this ground", or just name what happened. Do not say "evidence", "testimony", "as stated", "per the account", "submitted", or "opted out".

6. LABEL INFERENCES, AND THE TEST IS WHETHER SOMEBODY SAID IT. An inference is a claim YOU concluded that no participant stated in their own account: something you read across two accounts, filled in from context, or drew out as an implication. A claim somebody actually made is not an inference even when you have put it in your own words - rewording what a person said does not make it yours. List every inference in the inferences array with its id, text, participantLabel and reason, where text is the sentence as it appears in the report. Leave the array empty only if every claim in the report traces back to something a participant actually said.
7. CROSS-REFERENCE SESSIONS. Each record entry is labeled with the session it came from (e.g. "[the initiator session 1]", "[participant A session 3]"). If the same party's position has changed across sessions, name that change explicitly - "in session 1 the initiator described X; by session 3 they described Y." If a commitment from an earlier session has not been followed up in later sessions, name it. The longitudinal arc is the product's core value. A report that reads as a snapshot of only the latest session has failed.
8. NO FALSE CONSENSUS. Do not write "both agree" or "everyone is aligned" unless every party's record contains explicit matching statements on that specific point. If parties described the same topic differently in any session, that is a divergence - surface it. Smoothing a disagreement into apparent consensus is a more serious error than noting the gap.
9. SURFACE HIDDEN CONTRIBUTORS. If any party's record references someone else's input, work, or decisions - someone who is NOT themselves a party with their own account on this ground - name them in hiddenContributors with the evidence.

NOBODY ON THE PARTY ROSTER IS EVER A HIDDEN CONTRIBUTOR. Not by name, and not as "the initiator", "the lead", "the manager", "party A" or "participant B". Run over every report this has ever produced, half of what came back named somebody sitting in the check-in - which is the read looking at the people in front of it and calling them absent. If the only person you can point at is on the roster, return nothing.

NEVER QUOTE ANYBODY IN THE EVIDENCE. Say what they were referenced doing, in your own words, in one sentence. A quotation here is attached to a NAME, which is worse than one attached to a role, and it is dropped before anybody reads it.

AND ONLY WHAT WAS REFERENCED. If you are reasoning from what success would imply, or what a handover suggests must exist, you are inventing a person. "Implying", "suggests" and "presumably" are the words that give it away. Nothing is the common and correct answer.
10. FLAG CONCERN PATTERNS FACTUALLY, NEVER AS ACCUSATION. If the record shows one party's follow-through, commitments, or contribution is notably thinner than other parties' on the same ground, note it in concernFlags as a plain factual observation about the record - not a judgement of the person. Do not speculate about motive.
11. NAME THE CAUSE OF LOW OR HIGH SPECIFICITY WHEN INFERABLE. If a party's specificity is notably low or high, use specificityCauses to say why if the record supports an inference: a behavioral pattern, a misunderstanding, an adversarial stance, "declined_by_choice" if the record shows an explicit, stated decline to answer (a refusal is a choice, never file it as adversarial or unclear), or "unclear" if the record does not support a specific cause.
12. NEVER INVENT PARTY COUNTS OR ROLES. The PARTY ROSTER at the top of this corpus is the exhaustive, exact list of who is on this ground - use its exact count and exact labels only. Never state a number of parties, an "other parties" count, or a role/title/affiliation (e.g. "founder", "funders", "the board") that does not appear verbatim in the roster. If you are unsure how many parties are missing or who they are, use the roster's own wording rather than describing them yourself.
14. SURFACE LEADERSHIP GAPS AS NAMED PATTERNS, ACROSS PERIODS, NEVER AS QUOTES. State the SPAN alongside the count: a period is a check-in, so three periods on a daily ground is three days and on a fortnightly one is six weeks, and a reader deciding something from it must not be left to assume the longer one. Where one party leads another, look for the named leadership patterns listed below. Use ONLY those pattern names. A pattern is real only when its stated signature is met AND it is visible across MORE THAN ONE period - one session showing something is not a pattern, and you must report the number of periods you saw it across. Each pattern belongs to one of two opposite poles: CONTROL (holding on to work and decisions, so nobody else can own) or ABDICATION (not holding anyone, so things slip and hard conversations never happen). These need opposite responses, so never blur them together. State the gap as a difference between two accounts ("one account describes ownership being set clearly; another describes still being unsure what they own"). NEVER quote either side, NEVER name who said what, and NEVER say which is right - something can be set clearly and still not land, and both people can be describing their own experience honestly. If no pattern's signature is met across periods, return an empty array.

14a. ROUTING - THIS IS WHERE LEADERSHIP FINDINGS GO. If something you found matches one of the leadership patterns, it belongs in leadershipGaps and NOT in divergences. Do not put it in both. A leadership pattern is about how one party is LEADING and how that lands for the people they lead - a deferred conversation, a commitment nobody was held to, work not handed over, a contribution not seen. That is different from a divergence, which is two parties describing the same FACT differently. If you find yourself writing a divergence whose topic is really about how someone is managing, being held accountable, or being credited, move it to leadershipGaps with the matching pattern name. This routing is required: leadership findings placed in divergences are lost, because the two are read on different surfaces for different purposes.

14c. THE GAP TEXT IS MECHANICALLY CONSTRAINED. It must contain NO quotation marks of any kind, not even around two words, and NO party label - not "the lead", not "party A", not "party B", not a name. Write it as "one account ... another account ...". A two-word quote is still a quote: it tells the other person exactly what was said, which is the one thing this must never do. If you cannot state the gap without quoting or labelling, restate it in your own words until you can.

14d. ONE OF THE PATTERNS IS ABOUT THE SETUP, AND IT IS THE ONLY ONE THAT IS NOT ABOUT MANAGING. SETUP_NEVER_SAID is for a difference that is answered by what nobody was ever told, rather than by what the people believe. Two tests, and both have to hold. First, read what was opened with - the brief above, which may say that none was written. Second, ask whether the difference would still exist if that had named the thing they differ about. If it would, this is a real divergence and it belongs in divergences; if it would not, it belongs here. Two more rules. It does not need more than one period: a setup either said the thing or it did not, and waiting for it to happen twice is waiting for the same absence. And it is never written as a fault of the person - state what was not pinned down, never who failed to pin it.

14b. A LEADERSHIP PATTERN CAN LIVE IN ONE ACCOUNT. Several of these patterns are visible from a single person's record over time - a conversation named as still to be had across three sessions without it happening is a pattern whether or not anyone else mentions it. Do not require both sides to speak to it before reporting it. Where a second account does corroborate, say so in the note.
15. "ALL", "EVERY" AND "EACH" ARE COUNTS YOU HAVE MADE. Before writing that all clients, every person or each participant does or has something, check every account in the corpus across every session. Where one account says otherwise - a bike that is with a cousin, a target that was not met - the sentence is false, and the exception is a divergence to write, not a detail to smooth. A cohort report read "All clients are using the asset they received a loan for" over a record in which one had said his cousin had it (20 Sep 2026). Prefer "the clients who..." with the exception named to a universal that one record contradicts.
13. LEAD-SUPPLIED CONTEXT IS DIRECTION, NEVER A CLAIM. The LEAD-SUPPLIED CONTEXT section is private background from the initiator, not a party's statement. Use it only to decide what to weigh and what to probe. Never attribute it to a party, never quote it, never present it as an established fact, and never let it become a claim in the report. Every claim you write must trace to a party's own record entry - if lead context points at something no party's record supports, do not assert it.

15a. A DIFFERENCE IS ONLY EVER WITHIN ONE WEEK. Each line of the corpus says the week it was said in. A divergence, or any sentence that sets one statement against another, is only between two statements about the same item (the same thing, person, order or deal) from the same week, and it names that week: "In the week of 19 October, ...". Statements from different weeks never contradict each other: they are a change over time, said with each week named, earlier week first, and they are never a divergence. Night run 2 wrote "first reporting nine or ten and later saying it was four or five" (four or five was the week before) and "Amina reports sending twenty kits, not the 15 kits Hassan mentioned" (two different weeks' orders). Both are wrong.

16. ONE PAGE TELLS ONE STORY. The opening, the agreements, the divergences and the central question are read on one page, and none of them may say the opposite of another. Before you return, read them against each other:
  - If the opening says people disagree on something, that thing is in divergences. If divergences is empty, the opening does not say anybody disagrees.
  - Never say people disagree on a point and, anywhere else, that they agree on the same point. Where they agree on part of it and differ on the rest, say which part is which: "Both of you say Tobi owns the five largest clients. You differ on whether that includes pricing and renewals."
  - If you say there is one thing they disagree on, there is one, and it is the same one everywhere it is named.
  - A number, a target or a fact is stated once, the same way, everywhere. Do not write "you have not set individual targets" in one place and "the individual targets add up to 40" in another. Where two people say different things about it, that is a divergence: say who said which.
  - Where you name a cause, it is the cause the record gives. If one section says a difference comes from how the loan was designed, no other section says it comes from what people were told.
  - Write about the latest session. Where somebody's account changed, say what they say now, and that it changed; do not keep an earlier sentence that the latest session contradicts.

15. AND HOW EVERY SENTENCE OF IT IS WRITTEN. These two blocks are the product's one wording rulebook, and they override anything above or below them that disagrees.

${PLAIN_WORDS_EXAMPLES}

${WRITTEN_ONCE_FOR_SEVERAL_READERS}`;

/** What a participant who has not answered yet is told, on the report and on a session's report alike. */
export const A_PICTURE_IS_FORMING =
  'A picture is forming from what people have said so far. You can read it as soon as you have answered. Reading somebody else\'s first would turn yours into an answer to theirs, and the point is that they are separate.';

/* Set only while the warm-up words what each reader will read (ReportsService.wordTheReadsFor). At
   module scope so a service made without its constructor still reads "not warming". */
const WORDING_NEW_LINES = new AsyncLocalStorage<true>();

/**
 * WHERE THE RECORD IS CUT FOR THE REPORT OF A SESSION THAT HAS CLOSED (request 102): that session, the
 * moment it closed, and the pattern period it closed in.
 */
interface AsOfARound {
  sessionNumber: number;
  at: Date;
  period: number;
}

/**
 * OUR OWN CATCH-ALLS, which name nothing and are no use as a thing to carry forward. Matched on
 * the words with the punctuation and capitals taken off, so a question mark or a stray "so" does
 * not slip one past. Anything that names something real is kept, however short.
 */
const CATCH_ALL_QUESTIONS = [
  'what else should i know', 'what else', 'is there anything else', 'anything else',
  'is there more', 'anything you want to add', 'anything to add', 'what have i missed',
  'is there anything i have missed', 'anything i should know',
];
export function aCatchAllQuestion(q: string): boolean {
  const bare = (q ?? '').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  return CATCH_ALL_QUESTIONS.some((c) => bare === c || bare === `so ${c}` || bare === `and ${c}`);
}

/*
 * THE ENGINE'S OWN LINES, BEFORE THE WORDING PASS, FOR THE FINAL CHECK AT THE READ. Keyed by the coaching note or probe list served,
 * so nothing here outlives it. See holdTheEnginesOwnLines.
 */
const theEnginesOwnLines = new WeakMap<object, string[]>();

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  /*
   * THE ENGINE'S OWN LINES, BEFORE THE WORDING PASS, FOR THE FINAL CHECK AT THE READ. The coaching note and the probe list are
   * built by the code from the record ("This is session 1 of 12 of this work.", "... since 24 September"), and then reworded. A
   * count, date or name the code worked out is the record's value (the-final-check), so it is held when they are served; only
   * what the rewording added can be cut. Keyed by the value served, so nothing here outlives it.
   */
  private holdTheEnginesOwnLines<T>(served: T, draft: unknown): T {
    const lines: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string') lines.push(v);
      else if (typeof v === 'number' && Number.isFinite(v)) lines.push(String(v));
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v as Record<string, unknown>).forEach(walk);
    };
    walk(draft);
    if (served && typeof served === 'object') theEnginesOwnLines.set(served as any, lines);
    return served;
  }

  constructor(
    private prisma: PrismaService,
    private prompts: PromptsService,
    private anthropic: AnthropicService,
    private email: EmailService,
    private config: ConfigService,
    private usage: UsageService,
    private grounds: GroundsService,
    private workspace: WorkspaceNotifierService,
  ) {}

  /**
   * G10, G34 and G35, reaching a reader for the first time.
   *
   * Three modules were built with tests and no consumer. The arithmetic they need
   * lives in what-the-record-actually-holds.ts; this is the join, and it is behind
   * CONFIDENCE_ENABLED with everything else in that wave.
   *
   * WHAT IT REFUSES TO DO IS THE PART TO READ.
   *
   * G10 appears only at the close, and only for the lead or the subject - never
   * for a colleague, because the material behind a decision about somebody else is
   * the thing the wall exists to prevent. It appears at all only where the lead
   * stated a standard, since without a yardstick it is just the record arranged to
   * look like grounds for a decision.
   *
   * The soft spots go to nobody but the lead. They lower confidence in a picture,
   * which is the lead's job to hold; handed to a participant they read as a note
   * about a colleague, which is precisely what they are written not to be.
   *
   * Everything fails to nothing. A missing entry, a ground with no closing seund,
   * a participant with no id: the field is absent rather than empty, because an
   * empty confidence read looks like a confident "no problems here".
   */
  private async whatTheRecordHolds(
    groundId: string,
    participants: { id: string; partyType: PartyType }[],
    viewerIsLead: boolean,
    /** Who is reading, for the weighing: the lead and the subject only. See whoIsReadingTheWeighing. */
    reader: { isTheLead: boolean; participantId: string | null } = { isTheLead: false, participantId: null },
  ): Promise<Record<string, any>> {
    try {
      const lead = participants.find((p) => p.partyType === PartyType.INITIATOR);
      if (!lead) return {};

      const [rows, docs, closing] = await Promise.all([
        this.prisma.recordEntry.findMany({
          where: { disputedAt: null, participant: { groundId } },
          select: { participantId: true, type: true, text: true, ...WHAT_A_MARK_READS, checkIn: { select: { sessionNumber: true } } },
        }),
        this.prisma.groundDocument.findMany({ where: { groundId }, select: { id: true, participantId: true, fileName: true } }),
        this.prisma.ground.findUnique({ where: { id: groundId }, select: { status: true, resolutionState: true } }),
      ]);

      /* How each line is known, by the one rule (week 6b). Who added each backing document is read
         off the documents fetched above; no file is named. */
      const whoAdded = new Map<string, string | null>((docs as any[]).map((d) => [d.id, d.participantId ?? null]));
      const entries: (EntryRow & { mark: HowALineIsKnown })[] = rows
        .filter((r) => !!r.participantId)
        .map((r) => ({
          participantId: r.participantId as string,
          type: String(r.type),
          text: r.text,
          sessionNumber: r.checkIn?.sessionNumber ?? 1,
          mark: theMarkOf({ ...r, text: cleanText(r.text) }, whoAdded),
        }));
      if (!entries.length) return {};

      const out: Record<string, any> = {};

      // G10. The closing session only, and never for a colleague.
      const isClosing = closing?.status === GroundStatus.RESOLVED || !!closing?.resolutionState;
      const { statedStandards, standardsTouched } = standardsAndWhatTouchedThem(lead.id, entries);

      /**
       * THE STATED BASELINE COMES FIRST, IF THERE IS ONE.
       *
       * `statedStandards` is scraped from the lead's own check-in entries - anything the engine typed
       * as a SUCCESS_DEFINITION while they were talking. That is a good fallback and it is not the same
       * thing as a yardstick somebody deliberately wrote down and can be held to.
       *
       * `GroundBaseline` is that, and until now nothing wrote it. When it exists it goes at the front,
       * marked as session 0 because it predates every session: it is what was agreed before anybody
       * answered anything. The scraped ones stay behind it rather than being dropped - a lead who
       * restated a standard mid-conversation said something real, and the weigh section is supposed to
       * show everything they said doing well means.
       */
      const baseline = await this.prisma.groundBaseline.findFirst({
        where: { groundId },
        orderBy: { version: 'desc' },
        select: { successLooksLike: true, conditions: true },
      });
      const stated = baseline?.successLooksLike?.trim()
        ? [{ text: baseline.successLooksLike.trim(), session: 0 }, ...statedStandards]
        : statedStandards;
      /**
       * The conditions travel with it. They are the things that had to be true and were not in the
       * person's hands, and a weigh section that shows an unmet standard without them invites exactly
       * the reading this product exists to prevent.
       */
      const restsOn = Array.isArray(baseline?.conditions) ? (baseline!.conditions as string[]) : [];
      /* Built only for the lead and the subject; anybody else gets no section (whoIsReadingTheWeighing). */
      const mayWeigh = whoIsReadingTheWeighing(reader, participants as any) !== 'somebody else';
      const section = mayWeigh && whatALeaderCanWeigh({
        statedStandards: stated,
        standardsTouched,
        entries: entries.map((r) => ({ kind: r.type as any, text: cleanText(r.text), session: r.sessionNumber, mark: r.mark, markSays: WHAT_EACH_MARK_SAYS[r.mark] })),
        isClosing,
      });
      if (section) {
        out.whatTheGroundCanTellYou = section;
        out.whatTheGroundCanTellYouNote = THIS_IS_MATERIAL_NOT_A_VERDICT;
        /** Only when there are any: an empty list rendered as a heading says nothing twice. */
        if (restsOn.length) out.whatItRestedOn = restsOn;
      }

      /**
       * WHERE THIS STOOD AT THE START, and the one thing the report has never been able to say.
       *
       * A different thing from the baseline above it. That one is the yardstick - what doing well
       * would look like. This is what was actually TRUE on day one, in the lead's own words, recorded
       * from their first session and frozen.
       *
       * GATED ON `canShowMovement`, which is the module's own rule and the reason this is not simply
       * printed whenever it exists: one completed session is a POSITION, not a movement. Showing
       * "where this started" beside a record that has only ever been described once invites the
       * reader to see an arc that nothing in the record supports. So the report stays silent about
       * the beginning until there is a later session to hold it against.
       */
      const [startedRows, sessionsDone] = await Promise.all([
        this.prisma.groundBaselineEntry.findMany({
          where: { groundId },
          select: { text: true, capturedAtSession: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.checkIn.aggregate({ where: { groundId, status: 'COMPLETED' }, _max: { sessionNumber: true } }),
      ]);
      if (
        canShowMovement(
          startedRows[0] ? { text: startedRows[0].text, capturedAtSession: startedRows[0].capturedAtSession } : null,
          sessionsDone._max.sessionNumber ?? 0,
        )
      ) {
        out.whereThisStarted = startedRows.map((r) => ({ text: r.text, session: r.capturedAtSession }));
      }

      // G34. The lead's, and nobody else's.
      if (viewerIsLead) {
        const sessionsByParticipant = new Map<string, number>();
        for (const e of entries) {
          sessionsByParticipant.set(e.participantId, Math.max(sessionsByParticipant.get(e.participantId) ?? 0, e.sessionNumber));
        }
        const spots: Record<string, any[]> = {};
        for (const p of participants) {
          const shape = accountShapeFor(
            p.id,
            entries,
            // The column is fileName; the read wants a name. Mapped here rather
            // than renaming either, because both names are right where they are.
            docs.map((d) => ({ participantId: d.participantId, name: d.fileName })),
            sessionsByParticipant.get(p.id) ?? 0,
          );
          const found = softSpots(shape);
          if (found.length) {
            // G34's guarantee, joined here rather than trusted: a soft spot never
            // travels without what would raise it.
            spots[p.id] = found.map((f) => ({ ...f, wouldRaiseIt: whatWouldRaiseIt(f.spot) }));
          }
        }
        if (Object.keys(spots).length) out.softSpots = spots;
      }

      return out;
    } catch (err) {
      // A read that adds material must never be the reason a report page 500s.
      this.logger.warn(`Could not build the record read for ${groundId}: ${(err as Error)?.message}`);
      return {};
    }
  }

  /**
   * G30's kill switch, read where it is used rather than at the call site, and
   * failing to OFF.
   *
   * A flag that can throw would take the whole report down, which is a worse
   * outcome than the flag being wrong - and one spec's mock config is not a
   * reason to make production fragile.
   */
  private confidenceEnabled(): boolean {
    try {
      return this.config?.get<boolean>('app.confidenceEnabled') === true;
    } catch {
      return false;
    }
  }

  /**
   * Generate the report from BOTH parties' private records. This is the only
   * place two parties' data meet, and the output is a NEW document (the
   * synthesis), not either party's words verbatim beyond quoted exact words.
   */
  /**
   * Give each gap a sentence on what it costs the work, in place.
   *
   * Runs after synthesis, one call per gap that does not already have one, so
   * a gap the synthesis pass DID manage to answer is left alone rather than
   * re-asked. Every call is independent, so one failure costs one sentence and
   * never the report: a gap with no atStake renders exactly as it did before
   * this existed.
   *
   * Deliberately given ONLY the gap - the topic and the positions - and never
   * the party labels, the records, or the rest of the report. It cannot name a
   * person it was never told about, which is a stronger guarantee than asking
   * it not to.
   */
  private async fillAtStake(divergences: any[]): Promise<void> {
    if (!Array.isArray(divergences) || divergences.length === 0) return;

    const AT_STAKE_PROMPT = [
      'A shared report has found a gap: two or more people described the same thing differently.',
      'Say in ONE sentence what happens TO THE WORK if that gap is never closed.',
      '',
      'It is about the work, never about a person. No fault. No consequence for an individual.',
      'Never a prediction about what anyone will do. You have not been told who these people',
      'are and you must not guess - write about the work itself, not the parties.',
      '',
      'Conditional, because it has not happened yet: "if this holds, the quarter could end with',
      'the weekly tasks done and the outcome the strategy needed unowned."',
      '',
      'Plain enough that a busy reader knows why this gap is worth their attention. Do not',
      'restate the gap - the reader has just read it. Say what it costs.',
      '',
      'If saying anything would mean inventing a consequence this gap does not point to,',
      'return an empty string. Never a filler sentence, and never something dramatic to fill',
      'the space - reaching is the worse failure of the two.',
      '',
      PLAIN_WORDS,
    ].join('\n');

    const AT_STAKE_SCHEMA = {
      name: 'emit_at_stake',
      description: 'Emit one sentence on what this gap costs the work, or an empty string.',
      input_schema: {
        type: 'object',
        properties: {
          atStake: {
            type: 'string',
            description:
              'One conditional sentence about the work. Empty string if the gap does not support one.',
          },
        },
        required: ['atStake'],
      },
    };

    await Promise.all(
      divergences.map(async (d) => {
        if (!d || typeof d !== 'object') return;
        if (typeof d.atStake === 'string' && d.atStake.trim()) return;

        const positions = Array.isArray(d.positions)
          ? d.positions.map((p: any) => `- ${p?.view ?? ''}`).join('\n')
          : '';
        if (!d.topic && !positions.trim()) return;

        try {
          const res = await this.anthropic.extract<{ atStake: string }>(
            AT_STAKE_PROMPT,
            [{ role: 'user', content: `THE GAP: ${d.topic ?? ''}\n\nHOW EACH ACCOUNT DESCRIBED IT:\n${positions}` }],
            AT_STAKE_SCHEMA,
          );
          const text = res?.atStake?.trim();
          if (text) d.atStake = text;
        } catch (err: any) {
          // One gap loses its sentence; the report is unaffected.
          this.logger?.warn?.(`atStake pass failed for a gap: ${err?.message}`);
        }
      }),
    );
  }

  /**
   * WHAT ONE PERSON SAID, WRITTEN AS A SENTENCE INSTEAD OF QUOTED IN PIECES.
   *
   * The per-person block on the session report printed `lines[]` - the raw fragments the extraction
   * pulled out of that person's own account, each in italics with a cite under it. Eight people
   * produced eight stacks of disconnected clauses, and a reader could not tell from them what any
   * one person had actually said. The marketing page's example does the opposite and it is the
   * reason it reads better: one written sentence per person, no quotation marks.
   *
   * NOTHING IS REPLACED. The sentence goes ABOVE the fragments and the fragments stay, folded, with
   * their cites. A written summary is a read of somebody's words and the words themselves are the
   * record; a reader who wants to check the sentence against them must be able to.
   *
   * WHAT THIS PASS IS AND IS NOT TOLD. One person's own lines, and nothing else - not their name,
   * not their role, not anybody else's account, not the report. It cannot compare them to a
   * colleague or characterise them as a worker, because it has never been shown either. Same
   * guarantee as `fillAtStake` and for the same reason: a rule the model cannot break beats a rule
   * it is asked not to.
   */
  private async fillWhatEachPersonSaid(people: any[]): Promise<void> {
    if (!Array.isArray(people) || people.length === 0) return;

    const SAYING_PROMPT = [
      'Below are the lines one person gave in their own check-in, pulled out of what they wrote.',
      'Write ONE sentence saying what they said they did and where they think things stand.',
      '',
      'Write it, do not quote it. No quotation marks and no lifted phrases longer than a few words.',
      'The sentence is a plain summary of their own account of their own work.',
      '',
      'You have not been told who this person is, what their role is, or what anybody else said,',
      'and you must not guess any of it. Never compare them to anyone. Never say whether they are',
      'doing well or badly, never praise, never fault. This is not an assessment of a person.',
      '',
      'Third person, present tense where the lines allow, and NO pronoun for the person: start with',
      'the verb. "Has the migration running on two of the four services and expects the rest by the',
      'end of the month, with the data backfill still unscheduled." Never he, never she: you have not',
      'been told, and a name is not a pronoun.',
      '',
      'If the lines are too thin or too scattered to say anything true in one sentence, return an',
      'empty string. An empty string is a correct answer here and a vague sentence is not - the',
      'fragments are shown either way, so nothing is lost by declining.',
      '',
      PLAIN_WORDS,
      '',
      'ONE THING IN THE RULES ABOVE DOES NOT APPLY HERE. They say to use people\'s names. You have not been told this person\'s name and must not guess one, so the no-pronoun, no-name rule further up wins. Everything else in the rulebook holds.',
    ].join('\n');

    const SAYING_SCHEMA = {
      name: 'emit_saying',
      description: 'Emit one written sentence summarising this person\'s own account, or an empty string.',
      input_schema: {
        type: 'object',
        properties: {
          saying: {
            type: 'string',
            description: 'One sentence, written not quoted. Empty string if the lines do not support one.',
          },
        },
        required: ['saying'],
      },
    };

    await Promise.all(
      people.map(async (person) => {
        if (!person || typeof person !== 'object') return;
        /* Already carries the line that says they answered and named nothing. Leave it. */
        if (typeof person.saying === 'string' && person.saying.trim()) return;
        const lines: string[] = Array.isArray(person.lines) ? person.lines.filter((l: any) => typeof l === 'string' && l.trim()) : [];
        if (lines.length === 0) return;

        try {
          /*
           * WRITTEN WHEN SOMETHING NEW COMES IN, KEPT, AND SERVED KEPT (decision 7). Opening a session
           * report asked the model for this sentence on every open: 20 to 68 seconds, and a different
           * sentence each time. Now only the warm-up (wordTheReadsFor, after a synthesis or a release)
           * asks, and keeps what it wrote by the hash of the lines. Every open reads the kept sentence;
           * where none is kept yet, the lines are served without one and no model is asked.
           */
          const mayWord = WORDING_NEW_LINES.getStore() === true;
          const kept = await rememberedCompose(this.prisma, mayWord
            ? async (system, draft) => {
              const res = await this.anthropic.extract<{ saying: string }>(system, [{ role: 'user', content: draft }], SAYING_SCHEMA);
              return res?.saying?.trim() || null;
            }
            : async () => null, mayWord)(SAYING_PROMPT, `THEIR OWN LINES:\n${lines.map((l) => `- ${l}`).join('\n')}`);
          /* And no pronoun guessed from a name. See nobody-is-he-or-she-here. */
          const text = withoutAGuessedPronoun(kept?.trim() ?? '');
          if (text) person.saying = text;
        } catch (err: any) {
          /* One person loses their sentence and keeps every line. The report is unaffected. */
          this.logger?.warn?.(`The written-sentence pass failed for one person: ${err?.message}`);
        }
      }),
    );
  }

  /**
   * ONE SYNTHESIS AT A TIME PER GROUND, IN THE ORDER THEY WERE ASKED FOR.
   *
   * Five people finished a round inside the same minute and five syntheses ran at once. The one
   * that started first, when two people's entries were in, finished last and overwrote the full
   * picture; the board then read "three of the five people provided records too brief to compare"
   * about three people who had each said plenty (rerun, 20 Sep 2026). Queued per ground, the last
   * completion's read is the last write.
   */
  private readonly synthesisQueue = new Map<string, Promise<unknown>>();
  /* One warm-up of the reads at a time for each round, shared by every trigger. See one-warm-up-at-a-time. */
  private readonly readsWarming = new OneAtATime<{ userId: string; sessionReport: any }[]>();
  /* One waiting run is enough: it will read everything that has landed by the time it starts. Six
     people finishing inside a minute asked for six syntheses at three minutes each; the sixth read
     nothing the second would not have. */
  private readonly synthesisWaiting = new Map<string, Promise<any>>();

  /* Which check-ins have a synthesis out or waiting, for the lead's "being written" line. Module-level
     fallback below so a service made without its constructor still reads "not being written". */
  private readonly synthesesOut = new Syntheses();

  async synthesize(groundId: string) {
    const waiting = this.synthesisWaiting.get(groundId);
    if (waiting) return waiting;
    this.synthesesOut?.begin(groundId);
    try {
      return await this.synthesizeInTurn(groundId);
    } finally {
      this.synthesesOut?.end(groundId);
    }
  }

  private async synthesizeInTurn(groundId: string) {
    const after = this.synthesisQueue.get(groundId) ?? Promise.resolve();
    const mine = after.then(() => {
      this.synthesisWaiting.delete(groundId);
      return this.synthesizeUntilItHoldsEveryoneWhoFinished(groundId);
    });
    if (this.synthesisQueue.has(groundId)) this.synthesisWaiting.set(groundId, mine);
    const tail = mine.catch(() => undefined);
    this.synthesisQueue.set(groundId, tail);
    try {
      return await mine;
    } finally {
      if (this.synthesisQueue.get(groundId) === tail) this.synthesisQueue.delete(groundId);
    }
  }

  /**
   * A REPORT TAKES MINUTES TO WRITE, AND SOMEBODY CAN FINISH WHILE IT IS BEING WRITTEN. What it counts
   * and who it says has contributed is read from the record as it stood when the run began, so the last
   * person to finish could be left out of the report that was stored after they finished. If the number
   * of people who have finished is different when the run ends from when it began, it is written again,
   * from the record as it stands, up to three times.
   */
  private async synthesizeUntilItHoldsEveryoneWhoFinished(groundId: string) {
    const howManyFinished = async () => {
      const rows = await ((this.prisma as any)?.checkIn?.findMany?.({ where: { groundId, status: CheckInStatus.COMPLETED, isSetup: false }, select: { participantId: true, sessionNumber: true } }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
      return new Set((rows as any[]).map((r) => `${r.participantId}:${r.sessionNumber}`)).size;
    };
    let written: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      const before = await howManyFinished();
      written = await this.synthesizeNow(groundId);
      if ((await howManyFinished()) === before) break;
    }
    return written;
  }

  private async synthesizeNow(groundId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, include: { participants: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    // Build context preamble from the ground's pre-agreed resolution state,
    // initiator brief, and the initiator's persistent profile signals (if any).
    const [initiatorProfile] = await Promise.all([
      this.prisma.adminProfile.findUnique({ where: { userId: ground.initiatorId }, select: { signals: true } }).catch(() => null),
    ]);
    const groundContextLines: string[] = [];
    if ((ground as any).resolutionState) {
      groundContextLines.push(`PRE-AGREED RESOLUTION STATE: ${(ground as any).resolutionState}`);
    }
    /*
     * AND WHEN THERE IS NO BRIEF, THE CORPUS HAS TO SAY SO, OR NOBODY CAN NOTICE NOTHING.
     *
     * 256 of 442 check-ins in the database were opened with no brief at all. The line above only
     * ever appeared when one existed, so the most common setup failure was invisible to the
     * synthesis: it cannot read an absence it is never shown. SETUP_NEVER_SAID is the pattern that
     * reads this - see coverage.ts - and this line is what makes the silent case legible to it.
     */
    if ((ground as any).brief) {
      groundContextLines.push(`INITIATOR'S OPENING BRIEF: ${(ground as any).brief}`);
    } else {
      groundContextLines.push(
        'INITIATOR\'S OPENING BRIEF: none was written. Nobody answering was told what they were checking in against, beyond the questions they were asked.',
      );
    }

    /*
     * THE ARITHMETIC, DONE HERE, BECAUSE THE REPORT WAS NOT DOING IT.
     *
     * Read off a real shared report: the objective was ten thousand units of tea, the three people
     * in it described two thousand units, a hundred and fifty bags and fifty bags each, and the
     * report's finding was that the role was never clearly defined. True of almost every check-in,
     * and it told her nothing. Her words: "doesnt tell us to go work out individual targets and
     * also the fact that all of us are listing goals too low to meet the objective."
     *
     * The service already says how this works a few lines down - "deterministic features are
     * computed here (never by the model); the model narrates them" - and nothing was computing the
     * one thing anybody could have checked on a napkin.
     *
     * See do-the-parts-add-up-to-the-whole: it refuses more often than it answers, because two
     * thousand units and a hundred and fifty bags cannot be added together and a total would be a
     * number nobody said.
     */
    /* Optional-chained: a property access on a client without this model throws before any
       `.catch` can see it, and a report must never fail because the arithmetic could not run. */
    const objectivesForTheSums = await (this.prisma.groundObjective?.findMany?.({
      where: { groundId },
      select: { name: true, target: true, ownerParticipantId: true, direction: true },
    }) ?? Promise.resolve([]))
      .catch(() => [] as { name: string; target: number | null; ownerParticipantId: string | null; direction?: string | null }[]);
    const answering = (ground.participants ?? []).filter((p: any) => !p.managingOnly).length;
    const numbers = howTheNumbersSit(objectivesForTheSums, answering);
    if (numbers.says) groundContextLines.push(numbers.says);
    const leadSignals = Array.isArray(initiatorProfile?.signals) ? (initiatorProfile!.signals as string[]) : [];
    if (leadSignals.length) {
      groundContextLines.push(`LEAD PROFILE (from past grounds - use to add alignment recommendations at the end of the report):\n${leadSignals.map(s => `- ${s}`).join('\n')}`);
    }
    // CLOSING SESSION: when every accepted party has completed a final-flagged
    // session, the synthesis reads the WHOLE ARC. Deterministic features are
    // computed here (never by the model); the model narrates them.
    const arcByParticipant: Record<string, ArcSignals> = {};
    const finalDone = await this.prisma.checkIn.findMany({
      where: { groundId, isFinal: true, status: 'COMPLETED' as any },
      select: { participantId: true, completedAt: true },
    });
    const acceptedIds = (ground.participants ?? []).filter((p) => p.userId).map((p) => p.id);
    const closingComplete = acceptedIds.length > 0 && acceptedIds.every((id) => finalDone.some((f) => f.participantId === id));
    if (closingComplete) {
      for (const pid of acceptedIds) {
        const [entries, sessions, docs] = await Promise.all([
          this.prisma.recordEntry.findMany({
            where: { disputedAt: null, participantId: pid, checkInId: { not: null } },
            select: { type: true, recallBased: true, dimensionThreadKey: true, checkIn: { select: { sessionNumber: true } } },
          }),
          this.prisma.checkIn.findMany({
            where: { participantId: pid },
            orderBy: { sessionNumber: 'asc' },
            select: { sessionNumber: true, isFinal: true, completedAt: true },
          }),
          this.prisma.groundDocument.findMany({ where: { groundId, participantId: pid }, select: { createdAt: true } }),
        ]);
        arcByParticipant[pid] = computeArcSignals({
          entries: entries.map((e) => ({
            sessionNumber: e.checkIn?.sessionNumber ?? 0,
            type: e.type as string,
            recallBased: e.recallBased,
            threadKey: e.dimensionThreadKey,
          })),
          sessions: sessions.map((x) => ({ sessionNumber: x.sessionNumber, isFinal: (x as any).isFinal, completedAt: x.completedAt })),
          docs,
          finalCompletedAt: finalDone.find((f) => f.participantId === pid)?.completedAt ?? null,
        });
      }
      const endStates = endStatesFor(ground.scenario).map((o) => o.label).join(' / ');
      const arcLines = Object.entries(arcByParticipant).map(([pid, sig]) => {
        /* Never an address as a name (Hafsah, 28 Sep 2026; screens requests 56, 58, 65). */
        const label = labelsForParties((ground.participants ?? []) as any).get(pid) ?? 'a party';
        // The shared report gets record-shape language only. The negative
        // tier's advisory copy goes to the admin surface, never in here.
        return `- ${label}: ${tierCopy(sig.tier).shared} (record shape: ${sig.f1_concentration.detail}; ${sig.f5_evidenceTiming.detail})`;
      });
      groundContextLines.push(`CLOSING SESSION - THIS IS THE FINAL REPORT. Structure the synthesis per goal as: what was AGREED (the target on record) -> what was DELIVERED (the final accounts) -> WHAT THE RECORD SHOWS OVER TIME. Use the arc lines below verbatim as the over-time basis - do not soften or contradict them, and never speculate about anyone's intent:
${arcLines.join('\n')}

Close the report by framing - neutrally, without recommending one - the choice now in front of the parties among this ground's end states: ${endStates}. The resolution step is where they choose together.`);
    }

    const groundContextHeader = groundContextLines.length
      ? `GROUND CONTEXT (set before any check-in - use to frame the synthesis):\n${groundContextLines.join('\n')}\n\n`
      : '';

    // Stable, distinct label per party so the synthesis can attribute each
    // position to a specific party (works for two-party and N-party grounds).
    const parties = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, partyType: true, createdAt: true, roleAsDescribed: true, managingOnly: true, nameGiven: true, organisationGiven: true, remitAsGiven: true, user: { select: { firstName: true, lastName: true } } },
    });
    /* Whether this ground's lead only asks - see the-lead-who-only-asks. It changes one roster line. */
    const itsSituation = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { scenario: true } });
    const theLeadOnlyAsks = THE_LEAD_ONLY_ASKS.includes(itsSituation?.scenario ?? '');
    // One labelling rule, shared with the read path so a stored label always
    // resolves back to the same person. See party-labels.ts.
    const labelById = labelsForParties(parties as any);
    /*
     * AND EACH PERSON'S NAME BESIDE THEIR LABEL, so a label inside a quote can be found in the record
     * as the name the person actually said. See a-quote-is-what-they-said. The names are the ones
     * displayName already serves at the read, from the same rows, without the organisation and never
     * the address; they are used only to find words in the record, and nothing stored is built from them.
     */
    const namesInThisCheckIn: ALabelAndAName[] = (parties as any[]).map((p) => ({
      label: labelById.get(p.id) ?? '',
      name: displayName({ ...p, organisationGiven: null }, false),
    }));

    /*
     * DISPUTED LINES COME THROUGH HERE, LABELLED. See
     * a-disputed-line-is-shown-as-disputed.ts: a dispute stops a line counting, it does not delete
     * it. The reads that COUNT still filter it out; this is the read the report is written from, so
     * the claim and the objection arrive together and the report can say the accounts differ.
     */
    const theRecordAsItIs = await this.prisma.recordEntry.findMany({
      where: { participant: { groundId } },
      include: {
        participant: { select: { id: true } },
        checkIn: { select: { sessionNumber: true, completedAt: true } },
      },
    });
    const records = theRecordAsItIs.map(withTheDisputeAttached)
      /* A name in their words becomes that person's label here, once, so every read below - the
         corpus, the facts about each person, the network read - gets the same text. See
         a-name-in-their-words-is-the-label. The quotes the models write from it are put back into
         the person's own words, name and all, before the report is stored: see
         a-quote-is-what-they-said, which reads `theRecordAsItIs`, never this. */
      .map((r) => ({ ...r, text: aNameInTheirWordsIsTheLabel(r.text, namesInThisCheckIn) }));
    /* THE LINES A QUOTE IN THIS REPORT MAY COME FROM: this same read, before anything is added to it,
       and the lead's own words at set-up. See a-quote-is-what-they-said. */
    /* And what they said they would do, and when, where each is their own words (the commitment row is
       stamped as it is written), because "what the record shows over time" quotes them. */
    const theirPromises = await (this.prisma.groundCommitment?.findMany?.({
      where: { groundId },
      select: { text: true, whenSaid: true, saidWordForWord: true, whenSaidWordForWord: true },
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
    const whatAQuoteMayBe = theLinesAQuoteMayComeFrom(
      [
        ...(theRecordAsItIs as any[]),
        ...(theirPromises as any[]).map((c) => ({ text: c.text, saidWordForWord: c.saidWordForWord === true })),
        ...(theirPromises as any[]).map((c) => ({ text: c.whenSaid, saidWordForWord: c.whenSaidWordForWord === true })),
      ],
      [(ground as any).brief, ...(parties as any[]).flatMap((p) => [p.remitAsGiven, p.roleAsDescribed])],
    );

    // GW-41: fetch the full version object so we can stamp promptVersionId on the
    // report. Without this, Outcome records have no prompt attribution and the
    // learning loop cannot measure per-version outcome rates.
    const synthesisVersion = await this.prompts.getActive('report_synthesis');
    // Append hard synthesis rules that override any vagueness in the base prompt.
    // These address four recurring failure modes: specifics lost, conditions stripped,
    // absent parties misrepresented, and actionable commitments buried.
    // The leadership-pattern block is generated FROM the role map, so adding or
    // changing a pattern changes what the synthesis looks for. Pinned by a test.
    /* Which situation this is, and where in the run - a cue, from the same table the conversation
       reads. See what-situation-this-report-is-about for why the questions were interchangeable. */
    /* Optional-chained the way the rest of this codebase reaches a model a test double may not
       carry: a synthesis must not fall over because a fixture has no checkIn.aggregate. Round one
       is the safe default - it says "nothing earlier to compare against", which is true of any
       round the product cannot place. */
    const roundNow = await (this.prisma.checkIn?.aggregate?.({
      /* The round is the highest session somebody has FINISHED. A next session that is waiting, not started,
         is not a round anybody has answered (the journeys: all three finished and the count read "two of three"). */
      where: { participant: { groundId }, isSetup: false, status: CheckInStatus.COMPLETED },
      _max: { sessionNumber: true },
    }) ?? Promise.resolve(null))
      .then((r: any) => r?._max?.sessionNumber ?? 1)
      .catch(() => 1);
    const theSituation = whatSituationThisIsAbout(
      (ground as any).scenario,
      roundNow,
      totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null,
    );
    const systemPrompt = synthesisVersion.content + "\n\n" + SYNTHESIS_RULES + "\n\n" + buildLeadershipPatternBlock() + "\n\n" + HOW_TO_READ_A_DISPUTED_LINE + (theSituation ? "\n\n" + theSituation : "") + ((ground as any).simplerWords ? "\n\n" + THE_REPORT_IN_SIMPLER_WORDS : "");


    // Note any invited party who contributed no record - surfaced as an absence,
    // never inferred (decision: generate when everyone who accepted is done;
    // note no-shows).
    // A participant counts as a contributor if they have any record entries OR
    // completed a check-in (extractRecordEntries may occasionally produce zero
    // entries for a valid session - we still credit the session as contributed).
    const completedCheckInParticipantIds = await this.prisma.checkIn.findMany({
      where: { participant: { groundId }, status: CheckInStatus.COMPLETED },
      select: { participantId: true },
    });
    const contributorIds = new Set([
      ...records.map((r) => r.participant.id),
      ...completedCheckInParticipantIds.map((c) => c.participantId),
    ]);
    const absent = parties.filter((p) => !contributorIds.has(p.id));
    const header = absent.length
      ? `NOTE: ${absent.length} invited part${absent.length === 1 ? 'y' : 'ies'} did not contribute a record: ${absent
          .map((p) => labelById.get(p.id))
          .join(', ')}. Reflect this as an absence; do not infer their views.\n\n`
      : '';

    // THIN-RECORD NOTICE: compute turn counts per participant to detect parties
    // whose record is much thinner than others, and warn the synthesis accordingly.
    const participantsWithTurns = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      select: {
        id: true,
        partyType: true,
        createdAt: true,
        checkIns: {
          select: {
            turns: { select: { id: true, role: true, content: true } },
          },
        },
      },
    });
    // Measure contribution by total character count of PERSON turns, not turn count.
    // A single detailed message (e.g. 50-submission analysis) should not read as "thin."
    const turnCounts = participantsWithTurns.map((p) => {
      const personTurns = p.checkIns.flatMap((c) => c.turns).filter((t) => t.role === 'PERSON');
      const charCount = personTurns.reduce((sum, t) => sum + (t.content?.length ?? 0), 0);
      return { label: labelById.get(p.id) ?? p.partyType, turns: personTurns.length, charCount };
    });
    // DETERMINISTIC ROSTER: the corpus below only contains text from parties
    // who produced record entries. Without an explicit roster, the model has
    // to guess how many other parties exist and what their roles are from
    // context alone - and it will invent wrong counts and role names. This
    // roster is the ONLY source of truth for "who is on this ground."
    const recordEntryCountByParty = new Map<string, number>();
    for (const r of records) {
      recordEntryCountByParty.set(r.participant.id, (recordEntryCountByParty.get(r.participant.id) ?? 0) + 1);
    }
    const saidByLabel = new Map(turnCounts.map((t) => [t.label, t.charCount]));
    const rosterLines = parties.map((p) => {
      const label = labelById.get(p.id) ?? 'a party';
      // WHO LEADS WHOM. Without this the leadership-gap rules have nothing to
      // match: they open with "where one party leads another", and a roster of
      // anonymous labels never says that anyone does. In a live 12-session run
      // with textbook abdication in the record, zero gaps were found for
      // exactly this reason - the rule was correct and the input was silent.
      //
      // And what the line says about a party with no record entries is decided in
      // a-party-who-spoke-is-not-absent.ts, because it had been telling somebody
      // who answered that their record was not present.
      return whatTheRosterSaysAbout({
        label,
        leads: p.partyType === PartyType.INITIATOR,
        recordEntries: recordEntryCountByParty.get(p.id) ?? 0,
        charsSaid: saidByLabel.get(label) ?? 0,
        onlyAsks: theLeadOnlyAsks && p.managingOnly,
      });
    });
    /*
     * AND THE LABELS ARE THE ONLY ONES ALLOWED, WHICH THE ROSTER NEVER SAID OUTRIGHT.
     *
     * The schema asks for "their role if they have one, otherwise the initiator or participant A".
     * Run live on a three-person check-in, the model wrote "Person" for both participants - not one
     * of the labels on the roster, so the substitution that turns a label into a name had nothing
     * to match, and a report about three people named two of them "Person".
     *
     * The roster already lists the labels. What was missing was the sentence saying those are the
     * only strings that may appear in participantLabel.
     */
    const theOnlyLabels = `USE THESE LABELS AND NO OTHERS. Every participantLabel you write must be one of these strings, copied exactly: ${parties
      .map((p: any) => `"${labelById.get(p.id)}"`)
      .join(', ')}. Never "Person", never "the participant", never a name, and never a label you have invented - each reader's own copy swaps these for the real names they are allowed to see, and a label that is not on this list is swapped for nothing.\n\n`;

    const roster = `PARTY ROSTER (exhaustive - there are exactly ${parties.length} parties on this ground, no others exist):\n${rosterLines.join('\n')}\n\n${theOnlyLabels}`;

    const maxChars = Math.max(...turnCounts.map((p) => p.charCount), 1);
    const thinParties = turnCounts.filter((p) => p.charCount < maxChars * 0.15);
    const relativeThinNotice =
      thinParties.length > 0
        ? `NOTE: ${thinParties.map((p) => p.label).join(', ')}'s record contains significantly fewer exchanges. A further session from ${thinParties.length === 1 ? 'that party' : 'those parties'} would strengthen the cross-reference.\n\n`
        : '';
    /*
     * AND THE CASE THE RELATIVE CHECK CANNOT SEE. Two people who each say a hundred and seventy
     * characters are both at 100% of the maximum, so nothing above fires, and the model is handed
     * almost nothing with no indication that it is almost nothing. See
     * a-record-can-be-thin-for-everybody.ts - measured, 58 of 59 thin reports followed a thin
     * check-in rather than a rich one.
     */
    const thinNotice =
      relativeThinNotice || everybodySaidLittle(turnCounts, relativeThinNotice);

    // Fix 6: Longitudinal vagueness - flag participants whose accounts across
    // sessions contain no distinct concrete claims (same progress language, nothing closes).
    const sessionTextsPerParty = await Promise.all(
      parties.map(async (p) => {
        const sessions = await this.prisma.checkIn.findMany({
          where: { participantId: p.id, status: CheckInStatus.COMPLETED },
          orderBy: { sessionNumber: 'asc' },
          include: { turns: { where: { role: 'PERSON' }, select: { content: true } } },
        });
        return { label: labelById.get(p.id) ?? 'a party', sessions };
      }),
    );

    const MOTION_PHRASES = ['working on', 'making progress', 'moving forward', 'in progress', 'setting up', 'building', 'been focusing', 'getting there', 'in motion', 'underway'];
    const OWNERSHIP_PHRASES = ['i own', 'i am responsible', 'my role is', 'i lead', 'i manage', 'i handle', 'i deliver', 'i run', 'i oversee', 'i cover', 'that is mine', "that's mine"];
    const longitudinalNotices: string[] = [];
    for (const { label, sessions } of sessionTextsPerParty) {
      if (sessions.length < 2) continue;
      const sessionTexts = sessions.map(s => s.turns.map(t => t.content).join(' ').toLowerCase());

      // Pattern 1: motion language across all sessions with no deliverable ever closed.
      const motionOnly = sessionTexts.filter(t => {
        const hasMotion = MOTION_PHRASES.some(p => t.includes(p));
        const hasDeliverable = /\b(completed|shipped|delivered|finished|launched|submitted|signed|approved|merged|closed|deployed|confirmed|released)\b/.test(t);
        return hasMotion && !hasDeliverable;
      });
      if (motionOnly.length === sessions.length) {
        longitudinalNotices.push(`NOTE [longitudinal - no deliverable]: ${label} has submitted ${sessions.length} sessions. No session contains a concrete deliverable or closed outcome - only progress or activity language. Flag this pattern in the report explicitly.`);
      }

      // Pattern 2: perpetual ambiguity - no ownership or responsibility claimed across
      // any session, while other parties on the same ground have named theirs.
      const allText = sessionTexts.join(' ');
      const hasAnyOwnership = OWNERSHIP_PHRASES.some(p => allText.includes(p));
      const otherPartiesNamed = sessionTextsPerParty
        .filter(other => other.label !== label && other.sessions.length >= 1)
        .some(other => OWNERSHIP_PHRASES.some(p => other.sessions.map(s => s.turns.map(t => t.content).join(' ').toLowerCase()).join(' ').includes(p)));
      if (!hasAnyOwnership && sessions.length >= 2 && otherPartiesNamed) {
        longitudinalNotices.push(`NOTE [longitudinal - perpetual ambiguity]: ${label} has submitted ${sessions.length} sessions with no claimed responsibility, ownership, or defined role across any session. Other parties on this ground have named their roles. Sustained ambiguity across all sessions is itself a pattern worth naming in the report.`);
      }
    }
    const longitudinalNotice = longitudinalNotices.length ? longitudinalNotices.join('\n') + '\n\n' : '';

    // Fix 7: Implausible over-agreement - flag when two accounts match too precisely
    // on specific numbers or dates (a signal of coordination outside the system).
    const NUMBER_RE = /\b(\d+(?:\.\d+)?)\s*(%|percent|equity|shares?|basis points?)\b/gi;
    const DATE_RE = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4})\b/gi;
    const allTexts = records.map(r => r.text);
    const extractMatches = (re: RegExp, texts: string[]) => texts.flatMap(t => [...t.matchAll(re)].map(m => m[0].toLowerCase().trim()));
    const allNumbers = extractMatches(NUMBER_RE, allTexts);
    const allDates = extractMatches(DATE_RE, allTexts);
    const duplicateNumbers = allNumbers.filter((n, i) => allNumbers.indexOf(n) !== i);
    const duplicateDates = allDates.filter((d, i) => allDates.indexOf(d) !== i);
    const overAgreementNotice = (duplicateNumbers.length >= 2 || duplicateDates.length >= 2) && parties.length >= 2
      ? `NOTE [Fix 7 - over-agreement signal]: Multiple parties used identical specific figures or dates (${[...new Set([...duplicateNumbers, ...duplicateDates])].slice(0, 5).join(', ')}). Independent accounts rarely match on exact specifics by chance. Note in the report that these figures appear in multiple accounts and their source should be confirmed.\n\n`
      : '';

    // Fix 8: Evidence absence - flag participants who submitted multiple sessions
    // with no supporting documents in a ground where others attached documents.
    const docCounts = await this.prisma.groundDocument.groupBy({
      by: ['participantId'],
      _count: { id: true },
      where: { groundId },
    });
    const totalDocCount = docCounts.reduce((s, r) => s + r._count.id, 0);
    const evidenceAbsenceNotices: string[] = [];
    if (totalDocCount > 0) {
      for (const p of parties) {
        const pDocs = docCounts.find(d => d.participantId === p.id)?._count.id ?? 0;
        const pSessions = sessionTextsPerParty.find(s => s.label === (labelById.get(p.id) ?? 'a party'))?.sessions.length ?? 0;
        if (pDocs === 0 && pSessions >= 2) {
          evidenceAbsenceNotices.push(`NOTE [Fix 8 - evidence absence]: ${labelById.get(p.id) ?? 'a party'} submitted ${pSessions} sessions with no supporting documents attached, in a ground where at least one other party did attach documents. Surface this as an observation in the report - not an accusation, but a factual note about the record.`);
        }
      }
    }
    const evidenceAbsenceNotice = evidenceAbsenceNotices.length ? evidenceAbsenceNotices.join('\n') + '\n\n' : '';

    // Longitudinal pattern evidence (Option B): surfaced, code-detected behavioural
    // patterns (pattern-library.ts's threshold detectors - real thresholds, not a
    // model guess) are handed to synthesis as EVIDENCE the model weighs alongside
    // everything else in the record, never as a pre-formed conclusion. Codes in
    // ALIGNMENT_FEED_ONLY_CODES (F5, E4 - both explicitly documented as "never name
    // to either person directly") are excluded here exactly as they are from the
    // live conversation - the report is read by the parties themselves, so the same
    // rule applies. Bad-faith codes are routed toward concernFlags per SYNTHESIS
    // RULE 10 (factual, never an accusation); the one positive code (R3, Named
    // Collaborator) is explicitly told NOT to go in concernFlags - that field's own
    // schema is scoped to reduced follow-through/thinner contribution, and forcing a
    // compliment into a "concern" field would mischaracterize it.
    /*
     * THE PROMPT ROUTE FOR PATTERNS IS GONE. It read every surfaced detection and wrote the model a
     * paragraph per row saying to note it "if the record corroborates this". The engine's finding
     * became a suggestion the model could decline, and when it did not decline, the same fact reached
     * the page twice - once here in the model's words and once in the section - and could disagree
     * with itself. Patterns render as their own read in `sessionReport` now, in the library's words.
     */
    const patternNotice = '';

    // LEAD-SUPPLIED CONTEXT: private notes the initiator fed in about a participant or
    // the ground. Read from its OWN store (leadContextNote) - never RecordEntry, never
    // routed through claim extraction - and injected as its own labeled corpus section so
    // the model weighs it as background/direction and can never present it as the party's
    // own words. Enforced by synthesis rule 13.
    const leadNotes = await this.prisma.leadContextNote.findMany({
      where: { groundId },
      select: { participantId: true, text: true },
      orderBy: { createdAt: 'asc' },
    });
    const leadContextSection = leadNotes.length
      ? `LEAD-SUPPLIED CONTEXT (private background from the initiator - NOT the parties' own words. Use ONLY to decide what to weigh and what to probe, per synthesis rule 13. Never quote it, never attribute it to a party, never state it as an established fact):\n${leadNotes
          .map((n) => {
            const about = n.participantId ? (labelById.get(n.participantId) ?? 'a party') : 'the ground';
            return `- about ${about}: ${n.text}`;
          })
          .join('\n')}\n\n`
      : '';

    // WHAT THE MODEL CANNOT BE ASKED TO SPOT FOR ITSELF.
    //
    // The leadership patterns only exist in the shape of the record over many
    // sessions. Asking a model to notice that the same intention was restated in
    // sessions 4, 6 and 8 across twenty pages found nothing in a live run where
    // the pattern was textbook. Counting is cheap and exact here, so it happens
    // here, and the model is handed the count rather than sent hunting for it.
    const workMentionsForLeadership = await this.prisma.workMention.findMany({
      where: { groundId },
      select: { sourceParticipantId: true, aboutParticipantId: true, kind: true, sessionNumber: true },
    });
    const deferralNotice = buildDeferralNotice(
      findDeferrals(
        records.map((r) => ({
          label: labelById.get(r.participant.id) ?? 'a party',
          sessionNumber: r.checkIn?.sessionNumber ?? null,
          text: r.text,
        })),
      ),
      findWaitingBehind(workMentionsForLeadership, (id) => labelById.get(id) ?? 'a party'),
    );

    /*
     * THE DOCUMENTS EVERYBODY CAN SEE, BY NAME. See a-document-in-the-corpus.ts — the prompt was
     * handed a count and nothing else, which is why one report of a hundred and forty-five ever
     * mentioned a document. OPEN only: this corpus produces the one shared picture, and a party's
     * own evidence is theirs to disclose.
     */
    const openDocs = await this.prisma.groundDocument.findMany({
      where: { groundId, visibility: 'OPEN' },
      select: { fileName: true, participantId: true, assessment: true, uploaderNote: true },
      orderBy: { createdAt: 'asc' },
    });
    const documentsNotice = documentsSection(
      openDocs.map((d) => ({
        fileName: d.fileName,
        attachedBy: d.participantId ? (labelById.get(d.participantId) ?? 'a party') : 'the lead',
        suggests: Array.isArray((d.assessment as any)?.suggests) ? (d.assessment as any).suggests : [],
        uploaderNote: d.uploaderNote,
      })),
    );

    /* The product's own arithmetic, per person, handed to the synthesis the way it is handed to the
       conversation. See the-picture-gets-what-the-conversation-gets. */
    const objectivesForTheGaps = await (this.prisma.groundObjective?.findMany?.({
      where: { groundId },
      select: { name: true, target: true, count: true, ownerParticipantId: true, setByParticipantId: true },
    }) ?? Promise.resolve([])).catch(() => [] as any[]);
    const doesNotAddUpPerPerson = whatDoesNotAddUpPerPerson(
      parties.map((p: any) => ({
        participantId: p.id,
        label: labelById.get(p.id) ?? 'a party',
        said: records
          .filter((r) => r.participant.id === p.id)
          .map((r) => ({ text: cleanText(r.text), type: String(r.type), session: r.checkIn?.sessionNumber ?? 1 })),
        targets: (objectivesForTheGaps as any[])
          .filter((o) => !o.ownerParticipantId || o.ownerParticipantId === p.id)
          .map((o) => ({ name: o.name, target: o.target, count: o.count ?? 0, yours: o.ownerParticipantId === p.id, setByThem: o.setByParticipantId === p.id })),
      })),
      roundNow,
    );

    const privateFileNames = namesNotEverybodyMayOpen(
      await (this.prisma.groundDocument?.findMany?.({ where: { groundId }, select: { fileName: true, visibility: true } }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]),
    );
    const corpus =
      groundContextHeader +
      roster +
      deferralNotice +
      leadContextSection +
      documentsNotice +
      thinNotice +
      header +
      longitudinalNotice +
      overAgreementNotice +
      evidenceAbsenceNotice +
      patternNotice +
      doesNotAddUpPerPerson +
      records.map((r) => {
        const label = labelById.get(r.participant.id) ?? 'a party';
        const session = r.checkIn?.sessionNumber ? ` session ${r.checkIn.sessionNumber}` : '';
        /* And the week it was said in: a difference is only ever between two statements of one week. See a-difference-is-within-one-week. */
        const week = `, week of ${theWeekItWasSaidIn(new Date((r.checkIn as any)?.completedAt ?? r.createdAt))}`;
        /* A file only its owner can open is not named in what everybody reads. See a-private-file-is-not-named. */
        return `[${label}${session}${week}] (${r.type}) ${withoutPrivateFileNames(r.text, privateFileNames)}`;
      }).join('\n');

    const NEW_STARTING_SCENARIOS: GroundScenario[] = [
      GroundScenario.NEW_HIRE,
      GroundScenario.NEW_COFOUNDER,
      GroundScenario.NEW_ADVISOR,
      GroundScenario.NEW_PROJECT,
      GroundScenario.HELP_TEAM_UNDERSTAND,
      GroundScenario.NEW_MANAGER,
    ];
    const activeSchema =
      NEW_STARTING_SCENARIOS.includes(ground.scenario as GroundScenario)
        ? NEW_STARTING_REPORT_SCHEMA
        : ground.scenario === GroundScenario.RECOGNITION
        ? RECOGNITION_REPORT_SCHEMA
        : ground.scenario === GroundScenario.DRIFT || ground.scenario === GroundScenario.CRISIS_ALIGNMENT
        ? DRIFT_REPORT_SCHEMA
        : REPORT_SCHEMA;

    type SynthesisResult = {
      sharedPicture: string; agreements: string[]; divergences: any[]; centralQuestion: string;
      hiddenContributors?: { label: string; evidence: string }[];
      concernFlags?: { label: string; observation: string }[];
      specificityCauses?: { label: string; cause: string; note: string }[];
    };
    /*
     * WHAT IS AGREED, WHAT IS IN THE WAY, AND WHAT THE RECORD SHOWS ABOUT WHY.
     *
     * Added to what the model reads, never replacing it. Without this the synthesis sees only what
     * people said in conversation, so "he could not get pricing approval" and "he did not do it"
     * arrive looking identical - the blockers were recorded, from both sides, and never reached the
     * report.
     *
     * The six explanations are worked out in code before the model sees them, and it is told it
     * may state them and must not invent a seventh. A model asked why something is late will always
     * produce a reason; this makes the reason a fact somebody recorded.
     *
     * OUTSIDE THE TRY, AND BEST-EFFORT. It sat inside it at first, where a database hiccup came
     * back as "AI response could not be parsed" and cost the whole report. A report without its
     * grounding is worse than one with it and far better than none.
     */
    const grounding = await this.whatTheRecordShows(groundId, labelById).catch((err: any) => {
      this.logger?.warn?.(`Grounding the synthesis for ground ${groundId} failed: ${err.message}`);
      return '';
    });

    /* What the first ask read, and so what every later ask reads too: a re-ask without the grounding
       is a re-ask over less than the first draft saw. See a-second-ask-keeps-what-the-first-found. */
    const whatItReads = grounding ? `${corpus}\n\n${grounding}` : corpus;
    let result: SynthesisResult | null;
    try {
      result = await this.anthropic.extract<SynthesisResult>(
        systemPrompt,
        [{ role: 'user', content: whatItReads }],
        activeSchema,
      );
    } catch (err: any) {
      this.logger?.error?.('Report synthesis extract failed', err?.message);
      throw new Error('Report synthesis failed - AI response could not be parsed. Please try again.');
    }
    if (!result) throw new Error('Report synthesis failed to return structured output');
    this.logger?.log?.(`Ground ${groundId}: the first draft holds ${whatADraftHolds(result)}.`);

    // WORD COUNT VALIDATION: if the combined text fields exceed 500 words, make
    // one additional call asking for a shorter version. Max 2 total attempts.
    const wordCount = Object.values(result).join(' ').split(/\s+/).filter(Boolean).length;
    if (wordCount > 500) {
      const brevityPrefix =
        'The previous report was too long. Regenerate under 500 words total. Preserve all four sections and the central question. Cut explanatory language, not substance.\n\n';
      /*
       * A LENGTH PASS MAY NOT LOSE A REPORT THAT ALREADY SUCCEEDED.
       *
       * This call had no catch. The synthesis above had already worked - the substance was in
       * hand - and a cosmetic ask for a shorter version, made to the same model that had just
       * answered, could throw and take the whole report with it. The person's session then
       * reported a failure for a report that existed.
       *
       * Long is a blemish. Nothing is a loss. So the retry is best-effort in both directions: an
       * exception keeps the long version, and so does a retry that comes back empty.
       */
      const retry = await this.anthropic
        .extract<SynthesisResult>(systemPrompt, [{ role: 'user', content: brevityPrefix + whatItReads }], activeSchema)
        .catch((err: any) => {
          this.logger?.warn?.(`The shorter-version pass failed; keeping the long report. ${err?.message ?? err}`);
          return null;
        });
      /* Shorter, never with fewer findings. See a-second-ask-keeps-what-the-first-found. */
      if (retry) {
        const kept = keepWhatTheFirstFound(result, retry);
        if (kept.putBack.length) this.logger?.warn?.(`Ground ${groundId}: the shorter version lost ${kept.putBack.join(', ')}; put back from the first draft.`);
        result = kept.report;
      }
    }

    /*
     * TWO RULES THAT WERE ONLY EVER LOGGED, NOW ASKED FOR AGAIN.
     *
     * `tallyInReport` catches a report establishing something by counting accounts - "three of four
     * people said the process is broken" - which the rules forbid, because a gap is real when the
     * record supports it and not when it wins a vote. `doesThisReportMarkItsInferences` catches a
     * full synthesis that marked nothing it concluded; ten of twelve reports on the local database
     * came back that way.
     *
     * Both already ran. Both only ever wrote a line to a log nobody reads, and the report shipped
     * with the fault in it. This is the same second pass the post-report guide already does: name
     * exactly what was wrong and ask once. Once, not a loop - a model that does it twice is telling
     * us the prompt needs work, and the log is what says so.
     *
     * The retry is not trusted blindly either. If the second attempt is worse on the same tests,
     * the first one is kept: a rule is not worth a worse report.
     */
    /*
     * THE PICTURE IS CHECKED AGAINST THE CORPUS IT WAS WRITTEN FROM.
     *
     * The assistant's phrasing layer refuses an invented number and an invented capitalised word,
     * after a live reply attributed the holding-up of somebody's work to a fabricated "Alex Smith".
     * The stored picture here is the most weighted prose in the product, it is written by a model
     * over the whole corpus, and nothing checked it. The same failure is worse here: it goes into the
     * permanent shared record and is quoted back in later sessions.
     *
     * Three checks, computed, never asked of the model. A number not in any record. A capitalised
     * word mid-sentence that is neither a party label nor in any record. A run of eight or more
     * words lifted verbatim from one person's entry, because a long enough lifted phrase identifies
     * its author as surely as a name and the picture promises synthesis, not quotation.
     */
    /*
     * AND THE CORPUS IS EVERYTHING THE PRODUCT ITSELF PUT IN FRONT OF THE MODEL, NOT ONLY THE
     * RECORD ENTRIES.
     *
     * Live run, 24 September 2026, ten agribusinesses on one open link. The picture was refused
     * twice and the report kept a severe fault, for this: `it named "Nigeria", which is not a party
     * here and appears in nobody's record`. Nigeria is in the brief the lead wrote and in the
     * ground's own label. It is in nobody's record entry because people naming their own state say
     * "Kwara", and the check only ever read the entries.
     *
     * So a guard built to catch a fabricated "Alex Smith" spent two extra model calls and several
     * minutes rejecting the name of the country the whole check-in is about - and on a ground with
     * ten unrelated organisations, that is the ordinary case rather than the edge one.
     *
     * What is added is only what the product supplied or a person typed about themselves: the
     * brief, the label, and the names and organisations people gave. None of it can reveal anything
     * the reader does not already have, and a genuinely invented name is still caught, because an
     * invented name is in none of these either.
     */
    const whatThisCheckInIsAbout = [
      (ground as any)?.brief ?? '',
      (ground as any)?.label ?? '',
      ...parties.map((p: any) => `${p.nameGiven ?? ''} ${p.organisationGiven ?? ''} ${p.roleAsDescribed ?? ''}`),
    ].join('\n');
    const corpusText = records.map((r) => r.text).join('\n');
    const everythingSaid = `${corpusText}\n${whatThisCheckInIsAbout}`;
    const corpusDigits = new Set(everythingSaid.match(/\d+/g) ?? []);
    const knownWords = new Set(
      [...labelById.values(), ...(everythingSaid.match(/\b[A-Z][a-zA-Z]+\b/g) ?? [])]
        .flatMap((w) => w.split(/\s+/))
        .map((w) => w.toLowerCase()),
    );
    const severeFaultsIn = (picture: string): string[] => {
      const out: string[] = [];
      for (const n of picture.match(/\d+/g) ?? []) {
        if (!corpusDigits.has(n)) out.push(`it used the number ${n}, which appears in nobody's record`);
      }
      const midSentence = picture.replace(/(^|[.!?]\s+)[A-Z][a-zA-Z]+/g, (m) => m.toLowerCase());
      for (const w of midSentence.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? []) {
        if (!knownWords.has(w.toLowerCase()) && !/^(I|You|Your)$/.test(w)) out.push(`it named "${w}", which is not a party here and appears in nobody's record`);
      }
      return out;
    };
    /* Their words, as they were recorded, for the lift check over EVERY field - see said-in-its-own-words.ts. */
    const theirWords = records.map((r) => r.text.replace(/^\[VERIFIABILITY:\w+\] /, ''));

    const faultsIn = (r: SynthesisResult) => {
      const faults: string[] = [];
      for (const f of severeFaultsIn(String((r as any).sharedPicture ?? ''))) {
        faults.push(`${f}. Use only numbers and names that are in the records.`);
      }
      for (const lift of liftsInReport(r as any, theirWords)) {
        faults.push(`in ${lift.path} it copied "${lift.run}" word for word from one person's record. Say what it shows; do not quote it.`);
      }
      const tally = tallyInReport(r as any, ground.peopleWorkTogether !== false);
      if (tally) {
        faults.push(
          `it established something by counting accounts, in ${tally.field}: "${tally.phrase}". ` +
            `State what the record supports, never how many people said it.`,
        );
      }
      const marking = doesThisReportMarkItsInferences(
        { sharedPicture: (r as any).sharedPicture, agreements: (r as any).agreements, divergences: (r as any).divergences },
        ((r as any).inferences ?? []) as unknown[],
      );
      if (marking.looksUnmarked) {
        faults.push(
          `it marked no inferences at all, and ${marking.why} Every claim you concluded rather ` +
            `than one somebody stated belongs in the inferences array.`,
        );
      }
      return faults;
    };

    const faults = faultsIn(result);
    if (faults.length) {
      this.logger?.warn?.(`Ground ${groundId}: asking again. ${faults.join(' ')}`);
      const secondPass = await this.anthropic
        .extract<SynthesisResult>(
          systemPrompt,
          [{
            role: 'user',
            content:
              `${whatItReads}\n\nA previous attempt had a problem and was not used. ` +
              `Write the report again, fixing this: ${faults.join(' Also: ')}`,
          }],
          activeSchema,
        )
        .catch(() => null);
      if (secondPass && faultsIn(secondPass).length < faults.length) {
        /*
         * BETTER, BUT NEVER BY LOSING A FINDING. Run 26: the second answer dropped every difference,
         * which also dropped every copied phrase in them, and so "won". What the first draft found
         * is put back; a copied phrase in it is restated or withheld just below.
         */
        this.logger?.log?.(`Ground ${groundId}: the second attempt holds ${whatADraftHolds(secondPass)}.`);
        const kept = keepWhatTheFirstFound(result, secondPass);
        if (kept.putBack.length) this.logger?.warn?.(`Ground ${groundId}: the second attempt lost ${kept.putBack.join(', ')}; put back from the first draft.`);
        result = kept.report;
      } else if (secondPass) {
        this.logger?.warn?.(`Ground ${groundId}: the second attempt was no better, keeping the first.`);
      }
    }
    /*
     * THEIR WORDS DO NOT SHIP, IN ANY FIELD, FORMING OR RELEASED - AND THE INFORMATION DOES.
     *
     * This used to read "a lifted quotation is a fault to retry on, not to withhold for", and it
     * checked the shared picture alone. Decided by the product owner, 11 September 2026: never
     * verbatim, and never lose the substance either. So after the two passes above, a lift that
     * survives gets one more ask - restate these exact phrases in your own words, change nothing
     * else - and one that survives THAT has its sentence withheld. The sentence, not the report, and
     * not a rewrite by us of what the sentence claimed (counts-accounts.ts says why). This runs at
     * synthesis, which is where the forming report comes from as well as the released one.
     */
    const stillLifted = liftsInReport(result as any, theirWords);
    if (stillLifted.length) {
      const restated = await this.anthropic
        .extract<SynthesisResult>(
          systemPrompt,
          [{
            role: 'user',
            content:
              `${whatItReads}\n\nHere is the report you wrote:\n${JSON.stringify(result)}\n\n` +
              `These phrases are copied word for word from one person's record: ${stillLifted.map((l) => `"${l.run}"`).join('; ')}. ` +
              `Return the same report with each of those phrases said in your own words. Keep every fact and change nothing else.`,
          }],
          activeSchema,
        )
        .catch(() => null)
        /* "Change nothing else" is asked; it is not trusted. A restatement that drops a finding gets it back. */
        .then((r) => (r ? keepWhatTheFirstFound(result as SynthesisResult, r).report : null));
      if (restated && liftsInReport(restated as any, theirWords).length < stillLifted.length && faultsIn(restated).length <= faultsIn(result).length) {
        result = restated;
      }
      let withheld = 0;
      for (const field of ['sharedPicture', 'agreements', 'divergences'] as const) {
        const cut = withholdLiftsIn((result as any)[field], theirWords);
        (result as any)[field] = cut.value;
        withheld += cut.withheld;
      }
      if (withheld > 0) this.logger?.warn?.(`Ground ${groundId}: ${withheld} sentence(s) withheld from the report because they repeated somebody's words after three attempts.`);
    }

    /*
     * A PICTURE THAT STILL NAMES SOMEBODY WHO IS NOT HERE, OR A NUMBER NOBODY GAVE, DOES NOT SHIP.
     *
     * Two passes and the severe faults are still in it. There is no draft to fall back to, so what
     * ships is the last picture that was released - kept on the previous report row - and the
     * amendment machinery already says a picture did not move. On a first round there is none, and
     * the picture is empty rather than wrong; the counts, tiles and per-person lines are engine
     * output and unaffected.
     */
    const stillSevere = severeFaultsIn(String((result as any).sharedPicture ?? ''));
    if (stillSevere.length) {
      /*
       * THE SENTENCE COMES OUT, NOT THE PICTURE. Run 3, 20 Sep 2026: a fresh picture of six accounts
       * carried "the number 33, which appears in nobody's record", so the previous picture shipped -
       * and the previous picture had been written when one account was in: "five of the six people
       * provided records too brief to compare". It stood on the lead's page for two rounds while
       * everybody had fourteen to twenty-seven entries. A stale picture is a wrong picture. The
       * sentences that carry the fault come out; the rest of the fresh picture stands. Only when
       * nothing is left does the previous one ship.
       */
      const picture = String((result as any).sharedPicture ?? '');
      const offending = stillSevere.map((f) => /number (\d+)/.exec(f)?.[1] ?? /named "([^"]+)"/.exec(f)?.[1]).filter(Boolean) as string[];
      const kept = picture
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !offending.some((o) => sentence.includes(o)))
        .join(' ')
        .trim();
      if (kept && !severeFaultsIn(kept).length) {
        this.logger?.warn?.(`Ground ${groundId}: the picture kept a severe fault after two passes (${stillSevere.join('; ')}); the sentences carrying it were taken out.`);
        (result as any).sharedPicture = kept;
      } else {
        this.logger?.warn?.(`Ground ${groundId}: the picture kept a severe fault after two passes (${stillSevere.join('; ')}); shipping the previous picture instead.`);
        /* Read here, on this rare path, rather than threaded from the engagement read further down. */
        const previous = await this.prisma.report.findUnique({ where: { groundId }, select: { sharedPicture: true } }).catch(() => null);
        (result as any).sharedPicture = previous?.sharedPicture ?? '';
      }
    }

    /* A count of the people the product cannot verify does not ship. See the-picture-gets-what-the-conversation-gets. */
    {
      const alls = withoutUncountedAlls(String((result as any).sharedPicture ?? ''));
      if (alls.cut.length) {
        this.logger?.warn?.(`Ground ${groundId}: ${alls.cut.length} sentence(s) counting the people came out of the picture: ${alls.cut.map((c) => JSON.stringify(c.slice(0, 80))).join('; ')}`);
        (result as any).sharedPicture = alls.text;
      }
    }

    // SECOND PASS: what is at stake, one gap at a time.
    //
    // Asking for atStake inside the synthesis schema did not work. It was tried
    // as an optional field with an instruction to write one for every gap (1 of
    // 3 real gaps came back with one), reworded (no change), then made
    // `required` (no change - the field came back absent, not even the empty
    // string the instruction offered). The synthesis call is doing a great deal
    // at once and this clause is what it drops.
    //
    // One small call per gap gets it reliably, which is the shape of task the
    // model is good at. It also reaches every scenario: NEW_STARTING,
    // RECOGNITION and DRIFT use their own report schemas that never had an
    // atStake field at all, and they all share this divergence shape.
    //
    // The guardrail travels WITH the call, not just in the synthesis prompt.
    // This pass is the one most likely to break it: it is handed a single gap,
    // out of the context of the rest of the report, and asked what it costs -
    // which is exactly the framing that invites naming whoever is responsible.
    // So the instruction below restates the whole rule rather than assuming any
    // of it carried over.
    /**
     * THE LEAD'S NOTE STOPS BEING A WALL MADE OF WORDING.
     *
     * The note reaches the model in a labelled section saying "never state it as
     * an established fact", which is the exact shape of guardrail this codebase
     * has watched leak twice in one day - and the module that states the rule
     * properly had never been called by anything.
     *
     * So anything whose distinctive words come from a lead note and from no
     * party's own account is dropped here, before atStake is filled and before
     * anything is stored. Dropped rather than warned, unlike the tone check next
     * door: a stiff sentence is a stiff sentence, and a finding that exists only
     * because the manager said so is the specific harm this product was built to
     * prevent, arriving inside a document that reads as neutral.
     */
    if (leadNotes.length) {
      const partyEntries = records.map((r) => ({ text: r.text }));
      /*
       * KEPT AND LABELLED, NOT DROPPED. These used to be removed from the report with a line in the
       * log - read by us, never by the person the finding is about. The report deletes nothing
       * (11 September); a lead's unsupported read of a person is still not evidence, and saying
       * that out loud beats making it vanish. A reader who can see the claim and its caveat can go
       * and check it; a reader who cannot see it cannot.
       */
      const marked = markWhatOnlyTheLeadSaid(
        result.divergences ?? [],
        (d: any) => [d?.topic, d?.whatEachSaid, d?.note].filter(Boolean).join(' '),
        (d: any, caveat: string) => ({ ...d, note: [d?.note, caveat].filter(Boolean).join(' ') }),
        leadNotes,
        partyEntries,
      );
      for (const { text } of marked.marked) this.logger.warn(whyItWasDropped(text));
      result.divergences = marked.all as any;

      const markedAgreements = markWhatOnlyTheLeadSaid(
        (result.agreements ?? []) as any[],
        (a: any) => (typeof a === 'string' ? a : [a?.topic, a?.note].filter(Boolean).join(' ')),
        (a: any, caveat: string) => (typeof a === 'string' ? `${a} ${caveat}` : { ...a, note: [a?.note, caveat].filter(Boolean).join(' ') }),
        leadNotes,
        partyEntries,
      );
      for (const { text } of markedAgreements.marked) this.logger.warn(whyItWasDropped(text));
      result.agreements = markedAgreements.all as any;
    }

    /* The model has been seen writing "atStake:" and its whole value INTO the topic, so the heading
       printed the field name at the reader and repeated the consequence. Split it back apart before
       fillAtStake runs - otherwise that pass sees an atStake that is already populated (by the
       duplicate) and leaves the mangled topic standing. See a-field-name-is-not-a-heading.ts. */
    result.divergences = everyDivergenceReadable(result.divergences) as any;
    /*
     * A DIFFERENCE IS BETWEEN TWO STATEMENTS OF ONE WEEK, AND SAYS THE WEEK (Hafsah, 12 October). Night
     * run 2 put "first reporting nine or ten and later saying it was four or five" on the lead's board:
     * two weeks, the wrong way round. Every sentence that sets one statement against another is placed on
     * the record here, before the quotes are put back into people's own words. See a-difference-is-within-one-week.
     */
    const saidInTheirWeeks: AStatementInItsWeek[] = records.map((r: any) => ({
      who: labelById.get(r.participant.id) ?? 'a party',
      text: String(r.text ?? ''),
      saidOn: new Date(r.checkIn?.completedAt ?? r.createdAt ?? Date.now()),
      wordForWord: r.saidWordForWord === true,
    }));
    if (Array.isArray((result as any).divergences)) {
      (result as any).divergences = (result as any).divergences
        .map((d: any) => {
          const topic = typeof d?.topic === 'string' ? aDifferenceThatStands(d.topic, saidInTheirWeeks) : d?.topic;
          return topic === null ? null : { ...d, topic };
        })
        .filter(Boolean);
    }

    /* WEEK 25. The sentence on what each gap costs is independent of the picture below it (which is
       given only the gaps' topics, which this pass never changes), so both are asked at once and the
       judgement waits for this one. Each call is given exactly what it was given before. */
    const atStakePass = this.fillAtStake(result.divergences).catch((err: any) => {
      this.logger.warn(`The what-is-at-stake pass failed, so the gaps read without it: ${err?.message}`);
    });

    // Engagement-quality + confidence header (B4/B5a). Factual, not a verdict -
    // it tells both parties what the report is built on (session counts, record
    // depth, documents, absentees) and carries the "not independently verified"
    // disclosure. Shown alongside the synthesis.
    const DIFFICULTY_KEYWORDS = ['struggle', 'hard', 'difficult', 'unclear', 'behind', 'worried', 'frustrated', 'failed', 'challenging'];

    const engagementParties = await Promise.all(
      parties.map(async (p) => {
        const [sessions, allEntries, documentsAttached] = await Promise.all([
          this.prisma.checkIn.count({ where: { participantId: p.id, status: CheckInStatus.COMPLETED } }),
          this.prisma.recordEntry.findMany({ where: { disputedAt: null, participantId: p.id }, select: { text: true } }),
          this.prisma.groundDocument.count({ where: { groundId, participantId: p.id } }),
        ]);
        const recordEntries = allEntries.length;

        /**
         * THE SCORE WAS MEASURING HOW LONG PEOPLE WROTE.
         *
         * specificityLabel counted record entries over 120 characters. The
         * completion gate learned this lesson already and says so at length:
         * "SUBSTANCE, NOT LENGTH. Counting characters rejected two of one
         * person's real check-ins - answers that named a buyer, a number and a
         * blocker, but tersely. Length was measuring the wrong thing." One half
         * of this codebase knew, and the half that produces the number people
         * actually see did not.
         *
         * It reads exactly backwards, because record ENTRIES are extracted
         * facts, not prose. From Ground 1's twelve-session run: 69 entries,
         * average 101 characters, 10 of them over 120. So both parties scored
         * "low" - on a ground whose per-session dimensions came out mostly
         * "managed" and whose report was good. The better the extraction, the
         * shorter the entry, the worse the score.
         *
         *   "[VERIFIABILITY:HIGH] owning at least one client relationship end to end"
         *
         * 52 characters, checkable, and it counted against them.
         *
         * The engine already scores this properly per session, weighing whether
         * something can be checked rather than how long it is - specificityLevel
         * on each check-in, from scoreSessionSpecificity. That is the read the
         * headline label is built from now.
         */
        /* Every completed session, scored or not: a scorer that was tried and failed is a different
           fact from one that has not run, and the picture must not present either as a verdict. */
        const completedSessions = await this.prisma.checkIn.findMany({
          where: { participantId: p.id, status: CheckInStatus.COMPLETED },
          select: { specificityLevel: true, specificityScoredAt: true },
        });
        /* The order lives in how-checkable-a-session-was.ts; the map that ranked `managed` above `directional` is gone. */
        const ranks = completedSessions.map((c) => rankOf(c.specificityLevel)).filter((r): r is number => r !== null);
        const failed = completedSessions.filter((c) => c.specificityScoredAt && c.specificityLevel == null).length;
        const mean = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
        // No sessions scored yet is not a bad record, it is no record. "low"
        // would be a verdict on somebody who has not been asked anything.
        const specificityLabel: 'high' | 'moderate' | 'low' | 'not scored yet' =
          !ranks.length ? 'not scored yet' : labelFromMean(mean);
        return {
          label: labelById.get(p.id) ?? 'a party', sessions, recordEntries, documentsAttached,
          contributed: contributorIds.has(p.id), specificityLabel,
          // G30. The same two numbers, said about the picture rather than the
          // person. Computed always, attached only behind the flag below.
          confidence: confidenceInThePicture(ranks.length, mean, { failed }),
        };
      }),
    );

    // difficultyDisclosures: true if any record entry for this ground contains a difficulty keyword.
    const allGroundTexts = await this.prisma.recordEntry.findMany({
      where: { disputedAt: null, participant: { groundId } },
      select: { text: true, anchoredDocumentId: true, anchoredOrigin: true, recallBased: true },
    });
    const lowerTexts = allGroundTexts.map((e) => e.text.toLowerCase());
    const difficultyDisclosures = DIFFICULTY_KEYWORDS.some((kw) => lowerTexts.some((t) => t.includes(kw)));

    // documentBackedPct: share of record entries with a document anchored to them. Read from the
    // columns the anchoring path writes, not from an enum nothing wrote - see backed-by-a-document.ts.
    const documentBackedPct = documentBackedShare(allGroundTexts);

    // sessionCounts: turns per party label (from the turnCounts computed above).
    const sessionCounts = Object.fromEntries(turnCounts.map((p) => [p.label, p.turns]));

    const contributing = engagementParties.filter((e) => e.contributed);
    const minSessions = contributing.length ? Math.min(...contributing.map((e) => e.sessions)) : 0;
    const minEntries = contributing.length ? Math.min(...contributing.map((e) => e.recordEntries)) : 0;
    const coverage = minSessions >= 2 && minEntries >= 4 ? 'strong' : minSessions >= 1 && minEntries >= 2 ? 'moderate' : 'thin';

    // coverageBand: strong if all contributing parties have > 6 turns AND documentBackedPct > 30;
    // thin if any contributing party has < 3 turns; else moderate.
    const allPartyTurns = contributing.map((ep) => {
      const tc = turnCounts.find((t) => t.label === ep.label);
      return tc ? tc.turns : 0;
    });
    const coverageBand: 'strong' | 'moderate' | 'thin' =
      allPartyTurns.length > 0 && allPartyTurns.every((t) => t > 6) && documentBackedPct > 30
        ? 'strong'
        : allPartyTurns.some((t) => t < 3)
        ? 'thin'
        : 'moderate';

    /*
     * WHICH CLAIMS STOOD UP AGAINST SOMETHING, AND WHICH ARE HERE BECAUSE SOMEBODY SAID THEM.
     *
     * The `note` below already says this report is not independently verified, and that sentence is
     * the same whether every claim was corroborated or none was. A reader cannot act differently on
     * the two, so in practice they act the same on both, and the caveat does no work.
     *
     * It matters most exactly where the reader cannot judge the content themselves. Somebody
     * non-technical reading about technical work has no independent way to tell a claim that held
     * from one that was repeated, and a well-written report reads equally confident about both.
     *
     * COMPUTED HERE, NEVER ASKED OF THE MODEL. A model asked which of its own statements are
     * well-supported will answer, and the answer will be a feeling about its own prose. Each of the
     * three sources below is a row that either exists or does not.
     */
    const claimsAndWhatBacksThem = await this.whatBacksEachClaim(groundId).catch((err: any) => {
      this.logger?.warn?.(`Working out what backs each claim on ground ${groundId} failed: ${err?.message}`);
      return null;
    });
    const partiesWhoGaveAnAccount = engagementParties.filter((e) => e.contributed).length;
    /*
     * FAILS TO A SENTENCE, NEVER TO SILENCE. Letting this fall away when it cannot be computed
     * leaves the report reading exactly as confident as one where everything checked out, which is
     * the thing being fixed.
     */
    const couldBeChecked = claimsAndWhatBacksThem
      ? whatCouldBeChecked(
        claimsAndWhatBacksThem,
        /* Others, not everybody: a person cannot corroborate themselves. */
        Math.max(0, partiesWhoGaveAnAccount - 1),
      )
      : { checked: 0, total: 0, says: [COULD_NOT_WORK_IT_OUT] };

    const engagement = {
      coverage,
      whatCouldBeChecked: couldBeChecked,
      documentBacked: engagementParties.some((e) => e.documentsAttached > 0),
      specificitySignal: Object.fromEntries(engagementParties.map((p) => [p.label, p.specificityLabel])),
      sessionCounts,
      documentBackedPct,
      coverageBand,
      difficultyDisclosures,
      ...(this.confidenceEnabled()
        ? {
            /**
             * G30/G33, behind the switch. Not a replacement for
             * specificitySignal - that stays, because things read it. What
             * changes is that the report now also carries a sentence about the
             * PICTURE, and a reader who sees both has the honest one available.
             */
            pictureConfidence: Object.fromEntries(
              engagementParties.map((p) => [p.label, p.confidence]),
            ),
            currentBestReading: CURRENT_BEST_READING,
          }
        : {}),
      /* Said in full sentences, without dashes (release round, 5 October 2026: the dash showed in all 24 scenarios). */
      note: `This report is built from what each person said themselves. Nobody has checked it against anything else.${absent.length ? ` ${absent.length === 1 ? 'One person who was invited has' : `${absent.length} people who were invited have`} not checked in yet, so this is built only from the people who have. Do not take anything here as agreed by everybody until they have all checked in.` : ''}`,
      parties: engagementParties,
    };

    /**
     * The five dimensions in words. Each says what the RECORD holds or does not
     * hold, never what the person is - and the ones a reader is meant to act on
     * say what would change it.
     */
    const PLAIN_DIMENSION: Record<string, Record<string, string>> = {
      vague: {
        coverage: 'Parts of the work are not described yet',
        delivery: 'What was actually finished is not clear from this',
        evidence: 'Nothing here can be checked against anything',
        commitment: 'No next step with a date on it',
        enablement: 'What is needed from other people is not named',
      },
      directional: {
        coverage: 'The shape of the work is here, the detail is not',
        delivery: 'Progress is described, without what landed',
        evidence: 'Some of this could be checked, most could not',
        commitment: 'Intentions named, no dates yet',
        enablement: 'Dependencies hinted at rather than named',
      },
      managed: {
        coverage: 'The work is described across the board',
        delivery: 'Clear on what was finished',
        evidence: 'Most of this can be checked',
        commitment: 'Next steps named, some with dates',
        enablement: 'Clear about what is needed from others',
      },
      specific: {
        coverage: 'Every part of the work is accounted for',
        delivery: 'Precise about what was finished and when',
        evidence: 'All of this can be checked',
        commitment: 'Next steps named with dates',
        enablement: 'What is needed from others is named and dated',
      },
    };

    const specificityNotes: { label: string; dimensions: { dim: string; level: string; note: string }[] }[] = [];
    for (const p of parties) {
      const lastCheckIn = await this.prisma.checkIn.findFirst({
        where: { participantId: p.id, status: CheckInStatus.COMPLETED },
        orderBy: { sessionNumber: 'desc' },
        select: { specificityDimensions: true, sessionNumber: true },
      });
      if (!lastCheckIn) continue;
      const dims = lastCheckIn.specificityDimensions as Record<string, string> | null;
      if (!dims) continue;
      const label = labelById.get(p.id) ?? 'a party';
      specificityNotes.push({
        label,
        /*
         * THE FIVE READINGS, AND NOT A SIXTH KEY THE SCORER ALSO STORES (review of 1 October 2026).
         * `checkable` sits in the same column as a summary flag, not one of the five, and it came
         * out as "In session 1, what was said about checkable was specific." under a confidence line
         * that said "What is here is general rather than checkable", about the same reader, on the
         * same page. Only the five the confidence is read from are said here.
         */
        dimensions: theFiveReadings(dims).map(([dim, level]) => ({
          dim,
          level,
          /**
           * WRITTEN AS A SENTENCE SOMEBODY WOULD SAY.
           *
           * It read "the initiator was managed on coverage in session 12" - a
           * label, a dimension and a session number in a sentence shape. Nobody
           * talks like that, and a person reading it about themselves cannot
           * tell whether it is praise, a complaint, or a system message.
           *
           * It also read as a grade on a PERSON. The subject is the record, so
           * the record is what the sentence is about now.
           */
          note: PLAIN_DIMENSION[level] && PLAIN_DIMENSION[level][dim]
            ? `${PLAIN_DIMENSION[level][dim]} (session ${lastCheckIn.sessionNumber})`
            : `In session ${lastCheckIn.sessionNumber}, what was said about ${dim} was ${level}.`,
        })),
      });
    }

    const [groundDocsAll, annotatedEntries, tensionEntries] = await Promise.all([
      this.prisma.groundDocument.findMany({ where: { groundId }, select: { id: true } }),
      this.prisma.recordEntry.findMany({ where: { disputedAt: null, participant: { groundId }, recallBased: false }, select: { id: true } }),
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participant: { groundId }, recallBased: false, type: { in: ['TENSION', 'WORRY'] } },
        select: { text: true, participant: { select: { id: true } } },
      }),
    ]);
    const discrepancyFlags: string[] = tensionEntries.map((e) => {
      const label = labelById.get(e.participant.id) ?? 'a party';
      return `Document annotation from ${label} flagged a tension or concern.`;
    });
    const docStatus = {
      total: groundDocsAll.length,
      withAnnotations: annotatedEntries.length,
      discrepancyFlags,
    };

    // Detect questions the AI asked at the end of a session that the participant
    // closed without answering - carry these into session2Focus so session 2
    // has a concrete thread to pick up rather than starting from scratch.
    const CLOSING_PHRASES = ["that's everything", "that covers", "that's all", "i think that", "nothing else", "i'm done", "nothing more"];
    const openQuestions: string[] = [];
    for (const p of parties) {
      const lastSession = await this.prisma.checkIn.findFirst({
        where: { participantId: p.id, status: CheckInStatus.COMPLETED },
        orderBy: { sessionNumber: 'desc' },
        include: { turns: { orderBy: { createdAt: 'asc' }, select: { role: true, content: true } } },
      });
      if (!lastSession?.turns?.length) continue;

      const turns = lastSession.turns;
      const lastPersonIdx = turns.map((t) => t.role).lastIndexOf('PERSON');
      if (lastPersonIdx < 2) continue;

      const personClose = (turns[lastPersonIdx]?.content ?? '').toLowerCase();
      const isClosingWithoutAnswer = CLOSING_PHRASES.some((ph) => personClose.includes(ph));
      if (!isClosingWithoutAnswer) continue;

      // Find the most recent AGENT turn before the close - extract any question it contains
      for (let i = lastPersonIdx - 1; i >= Math.max(0, lastPersonIdx - 3); i--) {
        if (turns[i]?.role !== 'AI') continue;
        const content = turns[i]?.content ?? '';
        const questions = content.match(/([A-Z][^.!?]*\?)/g);
        if (questions?.length) {
          const last = questions[questions.length - 1].trim();
          /*
           * A HOUSEKEEPING QUESTION IS NOT SOMETHING TO CARRY INTO THE NEXT SESSION (run 32,
           * discovery): the lead's report served `session2Focus: "What else should I know?"`.
           *
           * This takes the last question Groundwork asked before somebody closed without
           * answering, which is right when the question was about the work and useless when it
           * was our own catch-all. A focus item is a thing to cover; "what else should I know"
           * names nothing, so carrying it tells session two to ask the same empty question again.
           */
          if (!aCatchAllQuestion(last)) openQuestions.push(last);
          break;
        }
      }
    }

    const session2Focus = [
      ...(result.divergences ?? []).slice(0, 3).map((d: any) => d.topic as string),
      ...openQuestions,
    ].slice(0, 5);

    /**
     * THE FIRST ROUND OF A GROUND THAT OPENED AT THE START HAS NO RUN IN IT.
     *
     * See a-read-needs-a-run.ts. Concern flags and hidden contributors both read a run; on a session
     * whose entire purpose is agreeing what success would look like, there is nothing for them to read
     * and what they produce is a judgement formed from a designed absence.
     *
     * DERIVED FROM WHAT WAS ALREADY LOADED, NOT FROM A NEW QUERY. The first version of this ran a
     * `checkIn.aggregate` here, and six existing tests broke - not because the logic was wrong but
     * because every mock of this method suddenly lacked a stub. That is a fair signal: `sessions` on
     * each engagement party is already a count of COMPLETED check-ins for that person, which is
     * exactly the question being asked. Completed matters: a check-in row exists from the moment a
     * session opens, so counting rows would let an opened-but-unanswered second session unlock a read
     * of a run that has not happened.
     */
    const highestCompletedSession = engagementParties.reduce(
      (max, party) => Math.max(max, (party as { sessions?: number }).sessions ?? 0),
      0,
    );
    const baselineRound = isBaselineRound({ moment: ground.moment, highestCompletedSession });

    const enrichedEngagementRaw = {
      ...engagement,
      specificityNotes,
      docStatus,
      session2Focus,
      hiddenContributors: result.hiddenContributors ?? [],
      concernFlags: result.concernFlags ?? [],
      specificityCauses: result.specificityCauses ?? [],
    };

    /**
     * Structural, not instructional. The synthesis prompt could be asked to skip these on a first
     * session; a prompt rule is a request. This is a decision about what may reach a reader.
     */
    const gated = baselineRound
      ? withoutWhatOneRoundCannotShow(enrichedEngagementRaw)
      : { engagement: enrichedEngagementRaw, removed: [] as string[] };
    /* The reader is told why, in place of the section. An unexplained gap reads as "nothing to say". */
    const tooEarlyToRead = whyItIsTooEarly(gated.removed);
    if (tooEarlyToRead) (gated.engagement as any).tooEarlyToRead = tooEarlyToRead;
    if (gated.removed.length) {
      this.logger.log(
        `Ground ${groundId}: withheld ${gated.removed.join(', ')} from the first round of a ground opened at the start - there is no run to read yet.`,
      );
    }
    let enrichedEngagement = gated.engagement;

    let inferences = ((result as any).inferences ?? []) as Array<{ id: string; text: string; participantLabel: string; reason: string }>;

    /* Ten of twelve reports came back marking nothing. Logged rather than refused - see the module. */
    const marking = doesThisReportMarkItsInferences(
      { sharedPicture: (result as any).sharedPicture, agreements: (result as any).agreements, divergences: (result as any).divergences },
      inferences,
    );
    if (marking.looksUnmarked) {
      this.logger.warn(`Ground ${groundId}: report marks no inferences. ${marking.why}`);
    }

    /**
     * The private per-person guides, read back before the write that would
     * otherwise erase them. Everything else in engagement is rebuilt from this
     * synthesis; these are not, so they are the one thing carried across.
     */
    const priorReport = await this.prisma.report.findUnique({
      where: { groundId },
      /* And the inferences already kept, so an earlier session's stay its own (request 102). */
      select: { engagement: true, inferences: true, updatedAt: true },
    });
    const priorEngagement = priorReport?.engagement as Record<string, any> | null | undefined;
    const existingGuides = priorEngagement?.postReportGuides;

    /*
     * THE PRODUCT'S HALF OF THE PICTURE GOES FIRST. See the-finding-per-person: after the guards had
     * cut everything the model got wrong, run 6's final picture was one platitude. The finding per
     * person is written here from the record, the overview counts what the product can count, and
     * the model's narrative follows under it. Both halves go through the same name resolution at the
     * read, so "the tractor owner" becomes "you" on her own page and her name on the lead's.
     */
    const theFacts = parties
      .filter((p: any) => !p.managingOnly)
      .map((p: any) => factsAbout({
        participantId: p.id,
        label: labelById.get(p.id) ?? 'a party',
        isLead: p.partyType === PartyType.INITIATOR,
        said: records.filter((r) => r.participant.id === p.id).map((r) => ({ text: cleanText(r.text), type: String(r.type), session: r.checkIn?.sessionNumber ?? 1, week: theWeekItWasSaidIn(new Date((r.checkIn as any)?.completedAt ?? r.createdAt ?? Date.now())) })),
        targets: (objectivesForTheGaps as any[])
          .filter((o) => !o.ownerParticipantId || o.ownerParticipantId === p.id)
          .map((o) => ({ name: o.name, target: o.target, count: o.count ?? 0, yours: o.ownerParticipantId === p.id, setByThem: o.setByParticipantId === p.id })),
      }, roundNow))
      .filter((f): f is NonNullable<typeof f> => !!f);
    const howManyDifferences = Array.isArray((result as any).divergences) ? (result as any).divergences.length : 0;
    /*
     * HOW MANY ANSWERED, NOT HOW MANY WERE WRITTEN UP, AND THEY ARE NOT THE SAME NUMBER.
     *
     * This passed `findings.length` as the count of people who answered, so the sentence was always
     * "N of N people have given an account" - true by construction and therefore saying nothing. On
     * the live open link it read "6 of 6" on the same page as a table headed "9 people answered this
     * check-in": a person whose answer produced no finding is still a person who answered.
     */
    const peopleWhoAnswered = await (this.prisma.checkIn?.findMany?.({
      where: { groundId, status: CheckInStatus.COMPLETED, AND: [NOT_A_QUIET_CLOSE], },
      select: { participantId: true },
    }) ?? Promise.resolve([] as any[])).then((rows: any[]) => new Set(rows.map((r) => r.participantId)).size).catch(() => findings.length);
    /*
     * AND NOW SOMETHING THAT CAN READ WRITES IT. See the-picture-in-plain-sentences.
     *
     * What stood here joined slot names to raw answers - "said this was for:", "Where they say they
     * stand now:" - and put a fixed sentence on top claiming the accounts did not contradict each
     * other, immediately before listing the contradictions. 734 glued lines and 80 contradicted
     * openings across the twenty-four-scenario run.
     *
     * The facts are the same facts. Only the writing moved.
     */
    const differenceTopics: string[] = (Array.isArray((result as any).divergences) ? (result as any).divergences : [])
      .map((d: any) => (typeof d === 'string' ? d : d?.topic))
      .filter((t: any): t is string => typeof t === 'string' && !!t.trim())
      .slice(0, 4);
    /*
     * THE SAME PEOPLE AS THE CHECK-IN'S HEADER, FOR THIS ROUND. Hafsah, 28 September 2026. This counted
     * everybody who had ever finished a check-in, the lead included, against everybody but a lead who
     * only asks, so the two numbers were of different people ("Four of the 6" beside a header saying
     * something else). Now both count who is in the round by the header's rule (whoIsInTheRound),
     * and "answered" is who answered this round.
     */
    const answeredThisRound = new Set(
      ((await (this.prisma.checkIn?.findMany?.({
        where: { groundId, sessionNumber: roundNow, status: { in: AN_ANSWER }, AND: [NOT_A_QUIET_CLOSE], },
        select: { participantId: true },
      }) ?? Promise.resolve([] as any[])).catch(() => [] as any[])) as any[]).map((r: any) => r.participantId),
    );
    /* Somebody away, who has not answered, is not in the count (week 23). */
    const awayThisRound = await whoOnACheckInIsAway(this.prisma, groundId);
    /* Nobody an admin has not let in yet is in the count (decision 77). */
    const notLetInThisRound = await whoIsNotLetInYet(this.prisma, parties as any[]);
    /* Nor anybody invited who has not joined yet (Hafsah, 13 October): not counted, and not in the judgement's room below. */
    const notJoinedThisRound = await whoHasNotJoinedYet(this.prisma, parties as any[]).catch(() => new Set<string>());
    const inTheRound = whoIsInTheRound(
      (parties as any[]).map((p: any) => ({ ...p, notLetIn: notLetInThisRound.has(p.id), notJoinedYet: notJoinedThisRound.has(p.id), awayUntil: awayThisRound.get(p.id) ?? null, checkIns: answeredThisRound.has(p.id) ? [{ status: 'COMPLETED', sessionNumber: roundNow }] : [] })),
      roundNow,
      (ground as any).scenario,
    );
    const inRoundIds = new Set(inTheRound.map((p: any) => p.id));
    const answered = [...answeredThisRound].filter((id) => inRoundIds.has(id)).length || Math.min(peopleWhoAnswered, inTheRound.length);
    const expected = inTheRound.length || answered;
    /*
     * AND THE SECOND READ, WHERE THERE ARE ENOUGH SEPARATE ACCOUNTS FOR IT TO MEAN ANYTHING.
     *
     * The report above is an alignment read and it is capped at five hundred words, which is right
     * for two people and useless for a hundred organisations. So the network picture is its own
     * call with its own shape and its own room. See a-hundred-accounts-are-not-two.
     *
     * BEST EFFORT, ALWAYS. A report that already succeeded must never be lost to this: if the
     * second read fails the first one is still written, and the column is simply null.
     */
    /*
     * WEEK 25. Started here, before the picture is written, and waited for after the judgement: it
     * reads the roster and the record lines, none of which the picture or the judgement changes, so
     * the two calls no longer queue behind each other. It is asked exactly what it was asked before.
     */
    const networkRead = (async () => {
    const howManyAnswered = await this.prisma.checkIn.findMany({
      where: { groundId, status: CheckInStatus.COMPLETED },
      select: { participantId: true },
    }).then((rows) => new Set(rows.map((r) => r.participantId)).size).catch(() => 0);
    let networkPicture: any = null;
    if (readAsANetwork(howManyAnswered)) {
      const asked = ((ground as any).brief ?? '').trim() || ground.label;
      try {
        const began = Date.now();
        networkPicture = await this.anthropic.extract<any>(
          theNetworkInstruction(howManyAnswered, asked),
          [{ role: 'user', content: `${roster}\n\n${records.map((r) => {
            const label = labelById.get(r.participant.id) ?? 'a party';
            return `[${label}] (${r.type}) ${r.text}`;
          }).join('\n')}` }],
          THE_NETWORK_REPORT_SCHEMA as any,
          /* Nobody is sitting in front of this, and a hundred accounts do not fit in a minute.
             See A_HUNDRED_ACCOUNTS_WAIT - it timed out three times at sixty seconds and the
             report was written with an empty picture in it, saying nothing had gone wrong. */
          { patient: true },
        );
        this.logger.log(`Read ${howManyAnswered} accounts on ${groundId} as a network in ${Date.now() - began}ms.`);
      } catch (err: any) {
        this.logger.warn(`The network read on ${groundId} failed, so the report is the alignment one alone: ${err?.message}`);
      }
    }
    return { howManyAnswered, networkPicture };
    })();

    const picture = await this.pictureInPlainSentences(theFacts, {
      peopleAnswered: answered,
      peopleExpected: expected,
      differenceTopics,
      /* An evaluation check-in is about one person, who reads this: a performance plan, a promotion, a renewal
         and a probation (decision 75, item 25). */
      aboutOnePerson: isEvaluationCheckIn((ground as any).scenario),
    });

    /*
     * AND THE PRODUCT'S OWN SENTENCES ARE HELD TO THE RECORD'S NUMBERS, the same as the judgement's.
     * The board reads these findings and the opening, so a "22 successful applications" written here
     * would reach it whatever the judgement did. What a person said in their own words is theirs and
     * is never judged. See praise-the-numbers-do-not-support.
     */
    const whoThePraiseCouldBeAbout = theFacts.map((f) => {
      const party = (parties as any[]).find((p) => p.id === f.participantId);
      return { who: f.label, role: ((party?.remitAsGiven ?? party?.roleAsDescribed ?? null) as string | null), facts: f };
    });
    const praiseHeldBack: string[] = [];
    const heldToTheNumbers = (text: string, about: string | null): string => {
      const r = sentencesTheNumbersDoNotSupport(text, whoThePraiseCouldBeAbout, about);
      praiseHeldBack.push(...r.heldBack);
      return r.text;
    };
    picture.opening = heldToTheNumbers(picture.opening, null);
    const findings = theFacts.map((f) => {
      const written = picture.perPerson.find((x) => x.participantId === f.participantId);
      return {
        participantId: f.participantId,
        label: f.label,
        text: heldToTheNumbers(written?.text ?? '', f.label),
        hasGap: f.hasGap,
        headline: written?.headline ?? null,
      };
    }).filter((f) => f.text);

    picture.opening = differencesHeldToOneWeek(picture.opening, saidInTheirWeeks);
    for (const f of findings) f.text = differencesHeldToOneWeek(f.text, saidInTheirWeeks);
    findings.splice(0, findings.length, ...findings.filter((f) => f.text));
    (result as any).sharedPicture = differencesHeldToOneWeek(String((result as any).sharedPicture ?? ''), saidInTheirWeeks);

    const productHalf = [picture.opening, ...findings.map((f) => f.text)].filter(Boolean).join('\n\n');
    if (productHalf) {
      const modelHalf = heldToTheNumbers(String((result as any).sharedPicture ?? '').trim(), null);
      (result as any).sharedPicture = modelHalf ? `${productHalf}\n\n${modelHalf}` : productHalf;
    }
    /*
     * NOBODY HAS ANSWERED YET, SO THE PRODUCT SAYS SO, WITH THE COUNT IT KNOWS (B-009). With no answer on record the model wrote
     * "You are the only person invited to this ground and you have not checked in yet" for a lead who had invited three people,
     * and said "ground". The count of people in the round is the product's, and so are these words.
     */
    if (answered === 0 && expected > 0) {
      (result as any).sharedPicture = `Nobody has checked in yet, out of ${aNumberInWords(expected)} ${expected === 1 ? 'person' : 'people'}. The shared picture is made once people have answered.`;
    }
    if (praiseHeldBack.length) {
      this.logger.warn(`Report for ground ${groundId}: held back ${praiseHeldBack.length} sentence(s) of the picture that call a figure a success the record does not support: ${praiseHeldBack.map((x) => `"${x}"`).join(', ')}`);
    }
    /* THE BOARD READS THIS, NOT THE FIRST PARAGRAPH OF THE REPORT. See how-a-check-in-is-going. */
    (result as any).theOpening = picture.opening || null;

    /*
     * AND THE JUDGEMENT OVER EVERY ANSWER: CLASSIFY, ASSESS, THEN RECOMMEND, IN THAT ORDER.
     *
     * Two customers read a report that listed what people said and called it worthless - "it did not
     * classify things or assess or recommend well", "too abstract, talked in parables". They were
     * right, and the report was not where it went wrong: a hundred differently shaped answers cannot
     * be counted, ranked or cut by kind of organisation, so the only thing left to write was
     * atmosphere.
     *
     * Each answer is now fitted into the lead's own fields as its person finishes, so this is rows.
     * The counts and the standing of each field are arithmetic and no model touches them. Only the
     * last part is written, and it is handed nothing but the table, with every sentence required to
     * carry a number that is already in it.
     */
    await atStakePass;
    const theJudgement = await this.judgeTheAnswers(groundId, {
      /*
       * THE ROOM, for a ground too small for counts to mean anything. Built from what synthesis has
       * already computed - the per-person findings, the surfaced patterns, the open commitments and
       * the differences - rather than from the frame's field counts, which on four people produce
       * "3 of 4 are blocked" about three people in three different situations. See thisIsARoom.
       */
      /* Somebody invited who has not joined yet is not in the room: nothing is asked of them yet (Hafsah, 13 October). */
      people: (parties as any[]).filter((p) => !p.managingOnly && !(notJoinedThisRound.has(p.id) && !answeredThisRound.has(p.id))).map((p) => ({
        who: labelById.get(p.id) ?? 'a party',
        isLead: p.partyType === PartyType.INITIATOR,
        role: (p.remitAsGiven ?? p.roleAsDescribed ?? null) as string | null,
        finding: findings.find((f) => f.participantId === p.id)?.text ?? null,
        participantId: p.id,
        facts: theFacts.find((f) => f.participantId === p.id) ?? null,
      })),
      leadName: (parties as any[]).filter((p) => p.partyType === PartyType.INITIATOR).map((p) => labelById.get(p.id) ?? null)[0] ?? null,
      namesInThisCheckIn,
      differences: (Array.isArray((result as any).divergences) ? (result as any).divergences : []).map((d: any) => ({
        topic: String(d?.topic ?? ''),
        positions: (Array.isArray(d?.positions) ? d.positions : []).map((x: any) => ({
          who: String(x?.participantLabel ?? 'a party'), view: String(x?.view ?? ''),
        })),
      })),
    }).catch((err: any) => {
      this.logger.warn(`The judgement on ${groundId} did not run, so the report is what it was: ${err?.message}`);
      return null;
    });

    /*
     * AND WHAT THE RECORD SHOWS ACROSS EVERY SESSION, WHICH IS ARITHMETIC OVER ROWS.
     *
     * Commitments, dependencies, patterns, gaps and what is still open. Three of these were empty on
     * a live three-month engagement while the facts for all three sat in tables the report never
     * read - see what-the-record-shows-over-time. Best effort like every other read here: a report
     * that is already written is never lost to this.
     */
    let overTime = await this.readTheRecordOverTime(groundId, parties as any, labelById).catch((err: any) => {
      this.logger.warn(`The longitudinal read on ${groundId} did not run: ${err?.message}`);
      return null;
    });

    const { howManyAnswered, networkPicture: networkRead0 } = await networkRead;
    let networkPicture: any = networkRead0;

    /*
     * EVERY QUOTE IS THE RECORD'S WORDS, OR IS NOT A QUOTE, BEFORE ANYTHING IS STORED.
     *
     * Hafsah: "Every quote any person sees must be the person's original words, taken from the
     * record, never the model's copy of them." One pass, here, over everything this write stores and
     * the round copy below keeps, so no field can be missed by being added later to only one of them:
     * the picture, the differences and agreements, the question, the findings, the inferences, the
     * judgement, what the record shows over time, the network read and the engagement notes. See
     * a-quote-is-what-they-said.
     */
    {
      let restoredHere = 0;
      const unquotedHere: string[] = [];
      const droppedHere: string[] = [];
      const fromTheRecord = <V,>(v: V): V => {
        if (v === null || v === undefined) return v;
        const r = everyQuoteFromTheRecord(v, whatAQuoteMayBe, namesInThisCheckIn);
        restoredHere += r.restored;
        unquotedHere.push(...r.unquoted);
        droppedHere.push(...r.dropped);
        return r.value;
      };
      (result as any).sharedPicture = fromTheRecord((result as any).sharedPicture);
      (result as any).theOpening = fromTheRecord((result as any).theOpening);
      (result as any).agreements = fromTheRecord((result as any).agreements);
      (result as any).divergences = fromTheRecord((result as any).divergences);
      (result as any).centralQuestion = fromTheRecord((result as any).centralQuestion);
      (result as any).leadershipGaps = fromTheRecord((result as any).leadershipGaps);
      /* A count of periods is a claim the model makes; it is made true here, at the source, against the
         sessions that were answered (request 79 a). */
      if (Array.isArray((result as any).leadershipGaps) && (result as any).leadershipGaps.length) {
        const answered = await this.prisma.checkIn.findMany({
          where: { groundId, status: 'COMPLETED' as any, isSetup: false },
          select: { sessionNumber: true, completedAt: true, createdAt: true },
        }).catch(() => [] as { sessionNumber: number; completedAt: Date | null; createdAt: Date }[]);
        const held = periodsTheRecordHolds(answered.map((c) => ({ sessionNumber: c.sessionNumber, when: c.completedAt ?? c.createdAt })), ground as any);
        (result as any).leadershipGaps = (result as any).leadershipGaps.map((g: any) => ({ ...g, periods: aTruePeriodCount(g?.periods, held) }));
      }
      findings.splice(0, findings.length, ...fromTheRecord(findings));
      inferences = fromTheRecord(inferences);
      enrichedEngagement = fromTheRecord(enrichedEngagement);
      networkPicture = fromTheRecord(networkPicture);
      if (theJudgement) theJudgement.judgement = fromTheRecord(theJudgement.judgement);
      overTime = fromTheRecord(overTime);
      if (unquotedHere.length) {
        this.logger.warn(
          `Report for ground ${groundId}: ${unquotedHere.length} quote(s) were not in the record word for word, so they are no longer quotes (${restoredHere} kept, in the record's own words). First: "${unquotedHere[0].slice(0, 120)}"`,
        );
      }
      if (droppedHere.length) {
        this.logger.warn(
          `Report for ground ${groundId}: ${droppedHere.length} sentence(s) taken out, because each quoted words that were not in the record and could not stand without the marks. First: "${droppedHere[0].slice(0, 160)}"`,
        );
      }
    }

    /*
     * AND EVERY LINE, READ AS EACH PERSON WILL READ IT, BEFORE ANYTHING IS STORED.
     *
     * Task 1.6. The quote pass above makes every quotation the record's words; this renders every
     * line through the same door the reads use - names in, the reader's own "you", each reader's
     * filters - and runs the run scorer's own tests on it. A line that fails is rewritten once by the
     * model, in its stored form; a rewrite that still fails, or that touches a quotation, is not
     * kept, and the sentence goes under the no-blank rules. See every-line-is-read-before-it-is-kept.
     * Best effort, like the reads above: a report is never lost to its own check.
     */
    try {
      const checked = await this.everyLineReadAsItWillBe(groundId, ground as any, {
        sharedPicture: (result as any).sharedPicture,
        theOpening: (result as any).theOpening,
        agreements: (result as any).agreements,
        divergences: (result as any).divergences,
        centralQuestion: (result as any).centralQuestion,
        findings,
        theJudgement: theJudgement ? theJudgement.judgement : undefined,
        overTime,
        inferences,
      });
      if (checked) {
        /*
         * AND THE QUOTE PASS AGAIN, OVER WHAT THE CHECK CHANGED. A rewrite may not add a quotation
         * (see mayStand), and this is the second lock on the same door: nothing the check hands back
         * is stored with a quote the record does not hold word for word. Openread, check-2.
         */
        const again = everyQuoteFromTheRecord(checked, whatAQuoteMayBe, namesInThisCheckIn);
        if (again.unquoted.length || again.dropped.length) {
          this.logger.warn(`Report for ground ${groundId}: after the check, ${again.unquoted.length} quote(s) lost their marks and ${again.dropped.length} sentence(s) went, because they were not in the record word for word.`);
        }
        Object.assign(checked, again.value);
        (result as any).sharedPicture = checked.sharedPicture;
        (result as any).theOpening = checked.theOpening;
        (result as any).agreements = checked.agreements;
        (result as any).divergences = checked.divergences;
        (result as any).centralQuestion = checked.centralQuestion;
        findings.splice(0, findings.length, ...((checked.findings as any[]) ?? []));
        if (theJudgement && checked.theJudgement) theJudgement.judgement = checked.theJudgement;
        overTime = checked.overTime as any;
        inferences = checked.inferences as any;
      }
    } catch (err: any) {
      this.logger.warn(`Report for ground ${groundId}: the check of every line as it will be read did not run (${err?.message}). The report is kept as written.`);
    }

    /*
     * THE FINAL CHECK, BEFORE ANYTHING IS STORED (Hafsah, 12 October). One entry point in place of the two checks that ran here: a
     * colleague's fault stated as fact becomes the speaker's account first (decision 137), then a claim the record does not hold is cut
     * (decision 139, must-fix 3), then a number, status, date, name or credit the record does not hold. Read with the labels the report
     * is stored in. What the code worked out from the record (the findings, the record over time) is held, so a true count it wrote is
     * never cut. Every reader is served from what is stored here. Best effort: a report is never lost to its own check. See
     * conversation/the-final-check.
     */
    try {
      const stored = {
        sharedPicture: (result as any).sharedPicture,
        theOpening: (result as any).theOpening,
        agreements: (result as any).agreements,
        divergences: (result as any).divergences,
        centralQuestion: (result as any).centralQuestion,
        leadershipGaps: (result as any).leadershipGaps,
        findings,
        inferences,
        theJudgement: theJudgement ? theJudgement.judgement : undefined,
        overTime,
      };
      const held = await whatTheRecordHolds(this.prisma, { groundId, value: stored, codeWrote: { findings, overTime }, asLabels: true });
      const checked = everyLineTheFinalCheckPasses(stored, held, { where: `report for ground ${groundId}`, log: this.logger });
      if (checked.removed.length) {
        const v = checked.value as typeof stored;
        (result as any).sharedPicture = v.sharedPicture;
        (result as any).theOpening = v.theOpening;
        (result as any).agreements = v.agreements;
        (result as any).divergences = v.divergences;
        (result as any).centralQuestion = v.centralQuestion;
        (result as any).leadershipGaps = v.leadershipGaps;
        findings.splice(0, findings.length, ...((v.findings as any[]) ?? []));
        inferences = v.inferences as any;
        if (theJudgement && v.theJudgement) theJudgement.judgement = v.theJudgement;
        overTime = v.overTime as any;
      }
    } catch (err: any) {
      this.logger.warn(`Report for ground ${groundId}: the final check did not run (${err?.message}). The report is kept as written.`);
    }

    /*
     * THE FOUR MARKS ON EVERY LINE THE SYNTHESIS WROTE (week 6b, decision 43), worked out HERE, when the
     * report is built from the record, and stored with it. Opening a report reads them and asks nothing.
     * The product decides each mark from the record lines behind the line, never the model. Best effort:
     * a report is never lost to its marks, and one stored without them reads as it always did.
     */
    try {
      const rows = await this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participant: { groundId } } as any,
        select: { participantId: true, type: true, text: true, ...WHAT_A_MARK_READS } as any,
      }) as any[];
      const whoAdded = await whoAddedEachBackingDocument(this.prisma, rows);
      const marked = markTheRows(rows.map((r) => ({ ...r, text: cleanText(r.text) })), whoAdded);
      (enrichedEngagement as any) = {
        ...(enrichedEngagement as any),
        marksOnItsLines: theMarksOfAReport(
          { sharedPicture: (result as any).sharedPicture, agreements: (result as any).agreements, divergences: (result as any).divergences, findings },
          marked,
        ),
      };
    } catch (err: any) {
      this.logger.warn(`Report for ground ${groundId}: the marks on its lines were not worked out (${err?.message}). The report is kept without them.`);
    }

    /*
     * EACH SESSION'S INFERENCES STAY ITS OWN (request 102). This synthesis replaces only the items of the
     * session the report holds now; an earlier session's are kept as that session left them, so its
     * own report never shows what a later session concluded. Items kept before they carried a session
     * belong to the session the report held when it was last written.
     */
    this.logger?.log?.(`Ground ${groundId}: stored report holds ${whatADraftHolds(result)}.`);
    if (isAnEmptyReport(result) && !isAnEmptyReport(priorReport as any)) {
      throw new Error('Report synthesis came back empty; the report already stored is kept.');
    }
    const holdsNow = await theSessionTheReportHolds(this.prisma, groundId);
    const heldWhenLastWritten = (priorReport as any)?.updatedAt
      ? (((await (this.prisma.checkIn?.aggregate?.({
        where: { groundId, status: CheckInStatus.COMPLETED, isSetup: false, completedAt: { lte: (priorReport as any).updatedAt } } as any,
        _max: { sessionNumber: true },
      }) ?? Promise.resolve(null)).catch(() => null)) as any)?._max?.sessionNumber ?? holdsNow)
      : holdsNow;
    const inferencesKept = keptWithEachSessionsOwn((priorReport as any)?.inferences, inferences, holdsNow, heldWhenLastWritten);

    const report = await this.prisma.report.upsert({
      where: { groundId },
      create: {
        groundId,
        ...(theJudgement ? { theJudgement: theJudgement.judgement as any, theTable: theJudgement.table } : {}),
        ...(overTime ? { overTime: overTime as any } : {}),
        builtFromAnswers: howManyAnswered,
        // A tally is how a shared picture becomes a verdict by arithmetic. It
        // cannot be stripped the way a stiff opener can - cutting "two of the
        // three" out of a sentence changes what the sentence says - so it is
        // reported and a person decides. See counts-accounts.ts.
        ...(((): {} => {
          // The register check. The prompt forbids all of this at length, but a
          // model under load reverts to the voice it was trained on, and a report
          // that reads like a filing changes what the next person writes.
          const forensic = forensicInReport(result as any);
          if (forensic) {
            /**
             * WARN, DO NOT REWRITE, AND DO NOT BLOCK.
             *
             * This fired five times across one twelve-session run, so the prompt
             * rule holds most of the time and not always. Three options and only
             * one of them is right:
             *
             *   REWRITE  cutting "both records describe" out of a sentence
             *            leaves something that says a different thing. Silently
             *            altering a claim inside an accountability record is far
             *            worse than a stiff sentence.
             *   BLOCK    refusing to release the report means the ground goes
             *            quiet at exactly the moment two people are waiting for
             *            it, over a matter of tone.
             *   WARN     the phrase and its reason, where a person can see it.
             *
             * So this is an alarm on the prompt, not a filter on the output. If
             * it fires often, the instruction needs work; that is a decision for
             * somebody, not something to paper over per report.
             */
            this.logger.warn(
              `Report for ground ${groundId} reads like a case file, in ${forensic.field}: "${forensic.hit.phrase}" (${forensic.hit.why}). The prompt asked for plain language and did not get it - worth a look if this recurs.`,
            );
          }
          // A cohort is told apart here, not inside the detector's patterns: on a
          // ground where nobody sees anybody else's work, a tally is the finding
          // rather than a verdict. See counts-accounts.ts.
          const tally = tallyInReport(result as any, ground.peopleWorkTogether !== false);
          if (tally) {
            this.logger.warn(
              `Report for ground ${groundId} establishes something by counting accounts, in ${tally.field}: "${tally.phrase}". A gap is real because the record supports it, not because a number of people mentioned it.`,
            );
          }
          return {};
        })()),
        sharedPicture: result.sharedPicture,
        /* The opening on its own, for the board. See the-picture-in-plain-sentences. */
        theOpening: ((result as any).theOpening ?? null) as any,
        findings: (findings.length ? findings : undefined) as any,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: theQuestionOnly(result.centralQuestion) ?? result.centralQuestion,
        /**
         * PRIVATE GUIDES SURVIVE A RE-SYNTHESIS.
         *
         * engagement was overwritten wholesale on every session, and the
         * per-person post-report guides live inside it under postReportGuides.
         * So a guide written when session 1 released was destroyed by session
         * 2's synthesis, and every session after it - and release() returns
         * early once releasedAt is set, so nothing ever wrote them again.
         *
         * Found on Ground 2's real report: six people, eight sessions, and no
         * postReportGuides key at all. The one surface that exists to tell
         * somebody privately what they might do differently produced nothing for
         * anybody, and it did so silently, because the write that erased it was
         * a normal successful update.
         *
         * The guides are the only part of engagement not derived from this
         * synthesis, so they are the only part carried across.
         */
        engagement: enrichedEngagement as any,
        inferences: inferencesKept as any,
        leadershipGaps: (((result as any).leadershipGaps ?? []).length ? (result as any).leadershipGaps : undefined) as any,
        promptVersionId: synthesisVersion.id,
        finalSynthesis: (Object.keys(arcByParticipant).length
          ? { closingComplete: true, tiers: Object.fromEntries(Object.entries(arcByParticipant).map(([pid, s2]) => [pid, s2.tier])), endStates: endStatesFor(ground.scenario).map((o) => ({ value: o.value, label: o.label })) }
          : undefined) as any,
        arcSignals: (Object.keys(arcByParticipant).length ? arcByParticipant : undefined) as any,
        networkPicture: (networkPicture ?? undefined) as any,
        releasedAt: null,
      },
      update: {
        sharedPicture: result.sharedPicture,
        /* The opening on its own, for the board. See the-picture-in-plain-sentences. */
        theOpening: ((result as any).theOpening ?? null) as any,
        findings: (findings.length ? findings : undefined) as any,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: theQuestionOnly(result.centralQuestion) ?? result.centralQuestion,
        // Carry the private guides across. See the note on the create branch:
        // this write is what destroyed them on every session after the first.
        engagement: { ...enrichedEngagement, ...(existingGuides ? { postReportGuides: existingGuides } : {}) } as any,
        inferences: inferencesKept as any,
        leadershipGaps: (((result as any).leadershipGaps ?? []).length ? (result as any).leadershipGaps : undefined) as any,
        promptVersionId: synthesisVersion.id,
        finalSynthesis: (Object.keys(arcByParticipant).length
          ? { closingComplete: true, tiers: Object.fromEntries(Object.entries(arcByParticipant).map(([pid, s2]) => [pid, s2.tier])), endStates: endStatesFor(ground.scenario).map((o) => ({ value: o.value, label: o.label })) }
          : undefined) as any,
        arcSignals: (Object.keys(arcByParticipant).length ? arcByParticipant : undefined) as any,
        /* A failed second read leaves the one already stored alone rather than blanking it. */
        networkPicture: (networkPicture ?? undefined) as any,
        /* Same rule: a judgement that could not be written this time leaves the last one standing. */
        ...(theJudgement ? { theJudgement: theJudgement.judgement as any, theTable: theJudgement.table } : {}),
        ...(overTime ? { overTime: overTime as any } : {}),
        builtFromAnswers: howManyAnswered,
      },
    });

    // Fire-and-forget: extract preference signals from the initiator's records and
    // upsert into their AdminProfile. Runs after the report is saved so it never
    // blocks report delivery. Errors are swallowed - a failed extraction just means
    // the profile stays as-is.
    this.extractAndStoreLeadSignals(groundId, ground.initiatorId).catch(() => null);

    /*
     * KEEP WHAT THIS ROUND SAID, so day 14 still exists at day 90.
     *
     * After the live report is written, never instead of it: everything that reads a report still
     * reads the same row it always did, and this is a copy taken when a round closes.
     *
     * Best-effort on purpose. A failure to keep the history must never fail the synthesis somebody
     * is waiting on - the picture they are about to read matters more than the copy of it.
     */
    this.keepThisRound(groundId, {
      sharedPicture: result.sharedPicture,
      agreements: result.agreements,
      divergences: result.divergences,
      centralQuestion: theQuestionOnly(result.centralQuestion) ?? result.centralQuestion,
    }).catch((err: any) =>
      this.logger.warn(`Keeping the round for ground ${groundId} failed: ${err.message}`),
    );

    return report;
  }

  /**
   * WHICH ROUND THIS IS, AND KEEPING IT.
   *
   * A round is a session number every party has completed - the same test the release path uses,
   * asked here rather than invented a second time. Synthesis runs whenever anybody finishes, so
   * most calls find no completed round and do nothing at all.
   *
   * The highest complete round is the one kept: a late correction to session 2 in a ground now on
   * session 4 amends round 2, because that is the round it belongs to.
   */
  /**
   * WHAT THE REPORT SAID AT THE END OF EACH ROUND, for somebody entitled to read it.
   *
   * The same permission test as the report itself, asked the same way: a party to the check-in, or
   * an admin of the organisation it belongs to. This is the same content at an earlier moment, so
   * it cannot be readable by anybody the current one is not.
   *
   * ONLY RELEASED ROUNDS. A round is kept when it closes, and released is a separate step - the
   * mutual reveal that stops one person reading the picture before the other has finished. Handing
   * back an unreleased round here would be a way round that, so the gate is asked once, at the top,
   * exactly as `get` asks it.
   */
  /**
   * The correction window, read the same way the conversation service reads it. Duplicated as a
   * READ and not as a RULE: the arithmetic and the sentence live in one file, and this only
   * fetches the number so a report can say what the rule will decide.
   */
  private async correctionWindowDays(): Promise<number> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key: CORRECTION_WINDOW_KEY } });
      if (isAWindow(row?.value)) return row!.value as number;
    } catch (err: any) {
      this.logger?.warn?.(`Could not read the correction window, using the default: ${err?.message}`);
    }
    return DEFAULT_CORRECTION_WINDOW_DAYS;
  }

  /**
   * ONE SESSION'S REPORT, IN THE PROMISED SHAPE.
   *
   * "I need the forming sessions report(s) to take the same shape we promised the client for each
   * session." The assembly and the reasoning are in `the-session-report.ts`; this reads the rows.
   *
   * WHO MAY READ IT. A party reads their own session and the shared counts. A lead reads the
   * check-in they run. Nobody reads another party's account through here - the entries are
   * filtered to the reader unless the shared report has released, at which point the accounts are
   * comparable by design and the labels are the same ones the report uses.
   */
  /**
   * WHERE PEOPLE ARE AGAINST WHAT SUCCESS WAS SAID TO BE, on its own, for the surfaces that are not
   * a session report - a party's own record, and the board.
   *
   * The session report carries the same read inline, because a reader who has the report open
   * should not have to go and fetch the thing it is measuring against. This is the same computation
   * behind the same wall, for the pages that show it without a session.
   */
  /**
   * AN ORG ADMIN READS WITH THE LEAD'S EYES. A MEMBER DOES NOT.
   *
   * The decision in an-org-admin-reads-with-the-lead-s-eyes.spec.ts stands: an admin of the
   * organisation a check-in belongs to reads its report as the lead does, names included. What the
   * four readers below actually tested was narrower than the argument - "same organisation", with
   * no role in it - so every MEMBER of the customer's organisation was handed the lead's eyes:
   * resolved names, what the record rests on, what it holds, the probe list. board.service.ts asks
   * the right question; this is that question, asked once for all four.
   */
  /**
   * NOBODY HELD FOR A SEAT READS A REPORT (request 49). Asked before anything about the check-in is
   * looked up, so the refusal says nothing about whether this check-in exists. A lookup that fails
   * refuses too: the more private answer when the fact cannot be read.
   */
  private async refuseSomeoneNotYetLetIn(requestingUserId: string, groundId?: string): Promise<void> {
    /* Held for a seat reads nothing either: the same refusal the invitation page gives (privacy sweep finding 3). */
    await refuseSomeoneHeldForASeat(this.prisma as any, groundId, requestingUserId);
    const find = (this.prisma as any).user?.findUnique;
    if (!find || !requestingUserId) return;
    const me = await Promise.resolve(find.call((this.prisma as any).user, { where: { id: requestingUserId }, select: { awaitingOrgApproval: true } }))
      .catch(() => ({ awaitingOrgApproval: true }));
    if (me?.awaitingOrgApproval === true) throw new ForbiddenException(CANNOT_READ_THE_REPORT_YET);
  }

  /** The one rule (grounds/who-may-read-this-check-in.ts): an admin of THIS organisation, by role, re-read from the database. */
  private async isAnAdminOf(
    requestingUserId: string,
    requestingUserOrgId: string | undefined,
    ground: { organizationId: string; scenario: GroundScenario | null | undefined; initiatorId: string | null; createdByUserId: string | null | undefined; participants?: { userId: string | null }[]; status?: string | null; approvedById?: string | null },
    groundId?: string,
  ): Promise<boolean> {
    if (!requestingUserOrgId || ground.organizationId !== requestingUserOrgId) return false;
    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true, organizationId: true, email: true } });
    /* On a performance plan, a promotion, a renewal or a probation an admin reads only what they were given
       access to (decision 5, request 78); the rule lives in who-may-read-this-check-in.ts, not here. Every read
       here is reading only, so the admin asked to approve it reads it too (decision 75, item 2): whether it
       waits, and who decided, are read here when the caller did not select them. */
    if (adminsThisOrg({ ...user, userId: requestingUserId }, ground)) return true;
    if (!isEvaluationCheckIn(ground.scenario)) return false;
    let approval = { status: ground.status, approvedById: ground.approvedById };
    if ((approval.status === undefined || approval.approvedById === undefined) && groundId) {
      const row = await Promise.resolve((this.prisma.ground as any).findUnique?.({ where: { id: groundId }, select: { status: true, approvedById: true } }))
        .catch(() => null);
      approval = { status: row?.status ?? null, approvedById: row?.approvedById ?? null };
    }
    return readsAsAnAdmin({ ...user, userId: requestingUserId }, { ...ground, ...approval });
  }

  /** Where things stand against what success was said to be, through the same last read. */
  async whereAgainstSuccess(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    await this.refuseSomeoneNotYetLetIn(requestingUserId, groundId);
    const served = await this.whereAgainstSuccessAsBuilt(groundId, requestingUserId, requestingUserOrgId);
    return this.whatTheLeadHasNotShared(groundId, requestingUserId, requestingUserOrgId, served);
  }

  private async whereAgainstSuccessAsBuilt(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        organizationId: true,
        initiatorId: true,
        createdByUserId: true,
        /*
         * RE-REVIEW PRIVACY BUG (SCREENS WORKSPACE): `scenario` AND `peersVisibleToEachOther`
         * WERE NEVER SELECTED, SO `peersAreNamedOn` BELOW COULD NOT SEE WHETHER THIS CHECK-IN
         * HIDES ITS PEOPLE FROM EACH OTHER.
         *
         * `this.peersAreNamed(ground as any)` (below) calls the one shared rule the board, the
         * grounds page and the interview all use - but with both fields missing from this
         * select, `ground.scenario` and `ground.peersVisibleToEachOther` were always
         * `undefined`. `peersAreNamedOn` reads an undefined scenario as "not evaluative" and an
         * undefined override as "nobody has said", which together default to TRUE - so a
         * participant on a hidden (evaluation or cohort) check-in was served every colleague's
         * real name on "What success looks like", word for word, the exact thing peer-hiding
         * exists to stop. Adding the two fields this function already expects is the whole fix -
         * no change to the rule itself, which was already correct everywhere it had its inputs.
         */
        scenario: true,
        peersVisibleToEachOther: true,
        participants: {
          select: {
            id: true, userId: true, roleAsDescribed: true, managingOnly: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        report: { select: { releasedAt: true, releasedSessions: true } },
      },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const isInitiator = ground.initiatorId === requestingUserId;
    const me = ground.participants.find((p) => p.userId === requestingUserId) ?? null;
    const isOrgAdmin = !isInitiator && !me && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground, groundId));
    /* NotFound, not Forbidden. GW-PRI-04: a 403 tells a stranger the check-in is real. */
    if (!me && !isInitiator && !isOrgAdmin) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const viewerIsLead = isInitiator || isOrgAdmin;
    const released = !!ground.report?.releasedAt;
    const readableParticipantIds = released || viewerIsLead
      ? ground.participants.map((p) => p.id)
      : me ? [me.id] : [];
    /*
     * A COLLEAGUE'S LINES ONLY FROM A SESSION THAT HAS BEEN RELEASED (decision 76, item 4). Once the
     * report had been released for session 1, a participant read every colleague's line from every
     * later session here too. Their own lines are theirs, from every session.
     */
    const releasedSessions = viewerIsLead ? null : releasedSessionsOf(ground.report as any);
    const whoseLines = releasedSessions === null || !me
      ? { participantId: { in: readableParticipantIds } }
      : { OR: [{ participantId: me.id }, { participantId: { in: readableParticipantIds.filter((id) => id !== me.id) }, checkIn: { sessionNumber: { in: releasedSessions } } }] };

    const labels = labelsForParties(ground.participants as any);
    /*
     * A PARTICIPANT ID, NOT A USER ID, WHICH IS WHAT I PASSED.
     *
     * `namesVisibleTo` finds the viewer by `p.id` - their row on this check-in - to work out
     * whether they are the lead and therefore entitled to everybody's name. Handed a USER id it
     * finds nobody, decides the reader is not the lead, and resolves only the lead's name and the
     * reader's own. Everyone else falls through to the email fallback.
     *
     * Seen on the board: the success band listed "Amara" three times and then
     * "nadia.hr@northwindlog.test" for the fourth line - one list, two kinds of identity, on a
     * check-in whose lead is plainly entitled to her name and is shown it on the next tab along.
     * The session report two hundred lines below passes `me?.id` and has always been right.
     */
    const nameByLabel = namesVisibleTo(me?.id ?? null, ground.participants as any, this.peersAreNamed(ground as any, me?.id ?? null));
    const whoOf = (participantId: string | null) => {
      if (!participantId) return null;
      const label = labels.get(participantId) ?? null;
      const named = label ? nameByLabel.get(label) : undefined;
      if (named) return named;
      const p = ground.participants.find((x) => x.id === participantId);
      return label;
    };

    const [baseline, entries] = await Promise.all([
      this.prisma.groundBaseline.findFirst({
        where: { groundId },
        orderBy: { version: 'desc' },
        select: { successLooksLike: true, version: true, conditions: true },
      }),
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, ...whoseLines } as any,
        orderBy: { createdAt: 'asc' },
        select: { type: true, text: true, participantId: true },
      }),
    ]);

    return whereYouAreAgainstWhatYouNamed({
      /* What this read was allowed to look at, so its words can say "you have not" rather than
         "nobody" when it only ever saw one person's rows. */
      counting: readableParticipantIds.length === ground.participants.length ? 'everyone' : 'only-yours',
      /* THE BRIEF COUNTS. "Get 10 clients on the platform" in the brief is a standard; telling its
         author nothing is set while it sits one tab over is wrong. Until one is set on Setup, the
         first sentence of the brief that carries a number is read as the standard, and says so. */
      stated: baseline?.successLooksLike ?? sentenceWithANumber((ground as any).brief) ?? null,
      statedFromBrief: !baseline?.successLooksLike && !!sentenceWithANumber((ground as any).brief),
      /* Whether the LEAD has said it in their own check-in, which is not the same as having set it
         on Setup - see the note on `leadHasSaidIt`. */
      leadHasSaidIt: entries.some(
        (e) => e.type === RecordEntryType.SUCCESS_DEFINITION
          && ground.participants.find((x) => x.id === e.participantId)?.userId === ground.initiatorId,
      ),
      readerIsTheLead: isInitiator,
      leadName: whoOf(ground.participants.find((x) => !!ground.initiatorId && x.userId === ground.initiatorId)?.id ?? null),
      version: baseline?.version ?? null,
      conditions: Array.isArray(baseline?.conditions) ? (baseline!.conditions as string[]) : [],
      entries: entries.map((e) => ({ type: e.type, text: cleanText(e.text), who: whoOf(e.participantId) })),
    });
  }

  private async sessionReportAsBuilt(groundId: string, sessionNumber: number, requestingUserId: string, requestingUserOrgId?: string, asIfReleased = false) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        organizationId: true,
        initiatorId: true,
        /* The one per-check-in admin grant a pattern's access rule reads: see runsItForAPattern. */
        createdByUserId: true,
        /* `partyType` and the user's name because `namesVisibleTo` decides from both which
           labels this reader may resolve; `email` as the last resort a lead is entitled to. */
        participants: {
          select: {
            /* The function detection columns, so the conversation question can read the role map of
               the round's clearest function. Same tier as roleAsDescribed: a fact about the work. */
            detectedFunction: true, detectedFunctionConfidence: true,
            id: true, userId: true, roleAsDescribed: true, managingOnly: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        report: { select: { agreements: true, divergences: true, centralQuestion: true, releasedAt: true, releasedSessions: true, findings: true, direction: true, engagement: true } },
        brief: true,
        /* A one-time listening session is drafted differently from a run of work. See PictureInput.oneTime. */
        cadence: true, scenario: true, id: true,
        /* The run's length, for "session N of M": with the rhythm it gives plannedSessions below.
           Left out of this select, plannedSessions was null on every read (request 55). */
        timelineDays: true,
        runsUntilEnded: true,
      },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const isInitiator = ground.initiatorId === requestingUserId;
    const me = ground.participants.find((p) => p.userId === requestingUserId) ?? null;
    const isOrgAdmin = !isInitiator && !me && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground, groundId));
    /*
     * NOT FOUND, NOT FORBIDDEN. GW-PRI-04.
     *
     * A 403 answers "this check-in exists, it is just not yours", and a 404 answers nothing - so
     * a 403 here lets somebody with a list of guessed ids tell real check-ins from imaginary
     * ones. `get()` has always thrown NotFound for both cases for exactly this reason, and the
     * privacy suite pins it. I wrote this one as Forbidden.
     */
    if (!me && !isInitiator && !isOrgAdmin) throw new NotFoundException('That report could not be found, so go back to the check-in and open it from there.');
    const viewerIsLead = isInitiator || isOrgAdmin;
    /* DECISION 60 POINT 4, 30 September 2026: narrower than viewerIsLead (which counts every admin
       of the organisation) - colleagues' exact words in an evaluation check-in (decision 4's
       exception) go only to whoever runs this check-in: its lead, or the admin who set it up for
       them. NEVER every admin of the organisation, the same access rule decision 58 gave patterns.
       See patterns/who-reads-a-pattern, runsItForAPattern. */
    const evaluationWordsRunsIt = runsItForAPattern(ground as any, requestingUserId);
    /* THIS SESSION'S picture, released on its own (decision 76, item 4): not the report's first release. */
    const released = isThisSessionReleased(ground.report as any, sessionNumber);

    /*
     * NOT UNTIL YOU HAVE ANSWERED, AS ON THE MAIN REPORT. Screens request 51, 28 September 2026: this
     * read had no such rule, so a participant who had not checked in for this session read the team's
     * findings for it before giving their own account - the thing get()'s forming branch refuses,
     * because reading somebody else's first turns yours into an answer to theirs. Before the report is
     * released, a participant who has not answered this session is told what is happening and why,
     * and given nothing else. The lead and an admin read as before; once released, everybody does.
     */
    if (me && !viewerIsLead && !released) {
      const answeredThis = await (this.prisma.checkIn?.count?.({
        where: { participantId: me.id, sessionNumber, status: { in: AN_ANSWER }, AND: [NOT_A_QUIET_CLOSE], },
      }) ?? Promise.resolve(1)).catch(() => 1);
      if (!answeredThis) {
        return { sessionNumber, withheldUntilYouAnswer: true, saying: A_PICTURE_IS_FORMING } as any;
      }
    }

    /* The snapshot, when this round closed. Its presence IS what makes the report final. */
    let snapshot = await this.prisma.reportRound.findUnique({
      where: { groundId_sessionNumber: { groundId, sessionNumber } },
      select: { sharedPicture: true, agreements: true, divergences: true, centralQuestion: true, takenAt: true, amendedAt: true, amendedNote: true },
    });

    let previousSnapshot = sessionNumber > 1
      ? await this.prisma.reportRound.findUnique({
        where: { groundId_sessionNumber: { groundId, sessionNumber: sessionNumber - 1 } },
        select: { sharedPicture: true },
      })
      : null;

    /*
     * THE TEAM'S PICTURE OF A SESSION NOT RELEASED IS NOT SENT (decision 76, item 4).
     *
     * Before, a participant who had answered read this session's agreements, differences, central
     * question and written picture before it was shared, from the round's snapshot or the stored
     * report, whichever there was; and once the report had been released for session 1 they read
     * session 2's the same way. Somebody who reads only what is released now gets, for a session not
     * released, the counts and their own words, as before, and none of the team's picture: it is
     * emptied here, at the source every line below reads, so no line can bring it back. The previous
     * session's picture is theirs only if that session is released.
     */
    /* `asIfReleased` is for the one mail that goes at the moment of release, before the release is stamped (tellThemTheReportIsReady): the team's picture, which
       everybody is about to read, is not withheld from it. Everybody's words stay as walled as before, because `released` still decides those. */
    const pictureWithheld = !!me && !viewerIsLead && !released && !asIfReleased;
    if (pictureWithheld) {
      (ground as any).report = ground.report
        ? { ...ground.report, agreements: [], divergences: [], centralQuestion: '', findings: null, direction: null, engagement: null }
        : ground.report;
      if (snapshot) snapshot = { ...snapshot, sharedPicture: '', agreements: [], divergences: [], centralQuestion: '' };
    }
    if (!!me && !viewerIsLead && previousSnapshot && !isThisSessionReleased(ground.report as any, sessionNumber - 1)) previousSnapshot = null;

    const labels = labelsForParties(ground.participants as any);
    /*
     * WHOSE WORDS THIS READER MAY SEE. Before release, their own only - that is the wall the whole
     * product rests on. After release the accounts are comparable and carry the report's own
     * labels, never names, because this is not the surface that decides who may be named.
     */
    const readableParticipantIds = released || viewerIsLead
      ? ground.participants.map((p) => p.id)
      : me ? [me.id] : [];
    const mine = new Set(me ? [me.id] : []);

    const [entries, previousEntries, baseline, startingPoint, checkIn] = await Promise.all([
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participantId: { in: readableParticipantIds }, checkIn: { sessionNumber } },
        select: { type: true, text: true, recallBased: true, anchoredOrigin: true, dimensionThreadKey: true, participantId: true, confirmedAt: true, anchoredDocumentId: true },
      }),
      sessionNumber > 1
        ? this.prisma.recordEntry.findMany({
          where: { disputedAt: null, participantId: { in: readableParticipantIds }, checkIn: { sessionNumber: sessionNumber - 1 } },
          select: { type: true, text: true, dimensionThreadKey: true, participantId: true },
        })
        : Promise.resolve([]),
      this.prisma.groundBaseline.findFirst({
        where: { groundId },
        orderBy: { version: 'desc' },
        /* `version` and `conditions` for the read that places people against what was named -
           the table has carried conditions since it was created and nothing had ever read them. */
        select: { successLooksLike: true, version: true, conditions: true },
      }),
      this.prisma.groundBaselineEntry.findFirst({
        where: { groundId },
        orderBy: { capturedAtSession: 'asc' },
        select: { text: true },
      }),
      me
        ? this.prisma.checkIn.findFirst({
          where: { groundId, participantId: me.id, sessionNumber },
          select: { specificityLevel: true },
        })
        : Promise.resolve(null),
    ]);

    /* Only the documents this reader may open are listed by name: every OPEN one, and their own.
       This listed every document of every readable person, whoever could open it (request 46). */
    const docs = await this.prisma.groundDocument.findMany({
      where: {
        groundId,
        participantId: { in: readableParticipantIds },
        OR: [{ visibility: 'OPEN' as any }, ...(me ? [{ participantId: me.id }] : [])],
      },
      select: { fileName: true, participantId: true, origin: true, createdAt: true },
    });
    /*
     * AND HOW MANY OF THEM WERE SENT WITH THIS SESSION'S CHECK-INS (B-103): in the app, on WhatsApp,
     * a photo or a location pin, each kept the same way. A file is with a check-in when its sender
     * sent it while that check-in was open. Only what this reader may see is counted.
     */
    const thisSessionsCheckIns = await (this.prisma.checkIn?.findMany?.({
      where: { groundId, sessionNumber, participantId: { in: readableParticipantIds } },
      select: { participantId: true, startedAt: true, completedAt: true },
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
    const filesSentThisSession = filesSentWith(docs as any[], thisSessionsCheckIns as any[]);

    /*
     * NAMED WHERE THIS READER IS ALLOWED TO SEE A NAME, and labelled where they are not.
     *
     * The report is generated in labels - "participant A", "participant B" - precisely so it can
     * never carry a name across the wall, and `namesVisibleTo` decides which of them this reader
     * may resolve: their own, the lead's, and everybody's if they ARE the lead. Driven live as a
     * lead, this row read "participant A (you)" and "participant B", which is the same defect as
     * a roster calling three colleagues "a teammate" (the word before request 36) - and the rule that fixes it is the one the
     * report body already uses, not a second guess at it.
     */
    /* Whoever runs this check-in - its lead, or an admin with access to it - reads everybody by
       name, as on the main report (decision 5). Only a participant is held to the peer rule. */
    const nameByLabel = namesVisibleTo(me?.id ?? null, ground.participants as any, viewerIsLead || this.peersAreNamed(ground as any, me?.id ?? null));
    /*
     * AND SOMEBODY THIS READER CANNOT NAME IS A COLLEAGUE, NEVER "PARTICIPANT B" OR "A TEAMMATE".
     * Request 36: the same plain words, for the same person, as every other surface. A line of the
     * list starts with it, so it takes a capital.
     */
    const plainWords = plainWordsByPerson(ground.participants as any, nameByLabel, viewerLabelOf(me?.id ?? null, ground.participants as any));
    const aColleague = (pid: string) => atTheStart(plainWords.get(pid) ?? 'a colleague');
    /*
     * THE SAME NAMING RULE ON THE LINES AS ON THE ROWS.
     *
     * This returned the raw label - "participant B" - for anybody but the reader, so a lead
     * entitled to every name on their own check-in read their colleague's own words attributed to
     * a placeholder. `namesVisibleTo` is the rule that decides which labels THIS reader may
     * resolve, and it is the rule the report body already uses; using it here too means the
     * labels never reach a person who is allowed a name, and never leave one for a person who is
     * not. Defined after `nameByLabel` for that reason.
     */
    const whoOf = (participantId: string) => {
      /* The reader's own rows carried no name, so the list read as three voices and one anonymous
         one. They get the same name everybody else's rows get; the page adds "(you)". */
      const label = labels.get(participantId);
      if (!label) return null;
      const named = nameByLabel.get(label);
      if (named) return named;
      const p = ground.participants.find((x) => x.id === participantId);
      return label;
    };

    /*
     * ONE STRING FOR A PERSON ON A ROW AND ON EACH OF THEIR LINES (E1, Riverbank Trading). A row is named by the name this reader may see, or
     * "A colleague" (decision 115: an address is never a name). Their lines were filed under `whoOf`, which falls back to the raw label for a
     * person with no name, so the lines and the row never met and the lead read "This person has answered, and nothing specific enough to
     * record came out of it." beside people whose words were on record: seven of the twelve at an organisation made before the rebuild.
     */
    const nameOnARow = (participantId: string): string | null => {
      const label = labels.get(participantId);
      if (!label) return null;
      return nameByLabel.get(label) ?? aColleague(participantId);
    };

    /*
     * WHO ANSWERED THIS SESSION, READ BEFORE ANYTHING USES IT.
     *
     * This sat with the reveal rows further down, and the per-person section built above it reads
     * the same set - so the assembled report threw "Cannot access 'answeredIds' before
     * initialization" on every request. TypeScript cannot see it: a `const` used before its line
     * is a runtime temporal-dead-zone error, not a type error, and every unit test passed because
     * they call the pure assembler rather than this read. Found by opening the page.
     */
    /* A DECLINE IS AN ANSWER, and this counted only COMPLETED - so a declined session read as silence
       on the masthead while the finding under it counted the same person as having answered. */
    const answered = await this.prisma.checkIn.findMany({
      where: { groundId, sessionNumber, status: { in: AN_ANSWER }, AND: [NOT_A_QUIET_CLOSE], },
      select: { participantId: true },
    });
    const answeredIds = new Set(answered.map((c) => c.participantId));

    /*
     * MOVEMENT AND BLOCKERS, OVER THIS SESSION, FROM THE ONE OWNER. This read every dependency on the
     * ground and every objective's lifetime delta under a heading that said "this session". See
     * what-this-session-holds.ts. And the confidence read is given the WHOLE session's line counts,
     * not this reader's slice of them (P3-010).
     */
    const [held, saidInAll, documentedInAll, whoAnswered] = await Promise.all([
      whatThisSessionHolds(this.prisma, groundId, sessionNumber, {
        participantId: me?.id ?? null,
        isLead: viewerIsLead,
        /* A goal not told is read by whoever runs the check-in and by every admin of the organisation who reads it (decisions 5 and 86). */
        runsIt: theyRunThisCheckIn(requestingUserId, ground as any) || isOrgAdmin,
        /* A colleague's own words are walled from the person an evaluation is about, and from an admin without access to it. */
        colleaguesWordsWalled: viewerIsTheSubjectOfAnEvaluationCheckIn({
          scenario: (ground as any).scenario,
          isLead: isInitiator || evaluationWordsRunsIt,
          viewerParticipantId: me?.id ?? null,
          participants: ground.participants as any,
        }) || (isOrgAdmin && !evaluationWordsRunsIt && isEvaluationCheckIn((ground as any).scenario)),
        /* The Blockers tile names only the reader's own waits, as the board's header and tile do (ownWaitsOnly). */
        ownWaitsOnly: !!me && !viewerIsLead && !evaluationWordsRunsIt
          && (!this.peersAreNamed(ground as any, me.id) || isEvaluationCheckIn((ground as any).scenario)),
      }),
      this.prisma.recordEntry.count({ where: { disputedAt: null, participant: { groundId }, checkIn: { sessionNumber } } }),
      this.prisma.recordEntry.count({ where: { disputedAt: null, participant: { groundId }, checkIn: { sessionNumber }, recallBased: false, anchoredOrigin: { in: [...COUNTS_AS_A_SOURCE] as any } } }),
      howManyHaveAnswered(this.prisma, groundId, sessionNumber),
    ]);
    /*
     * THE COUNT A PERSON READS, BY THE ONE RULE EVERY HALF COUNTS WITH (requests 56 and 69). This
     * report said "4 of 5" beside a check-in header, and a board, reading "4 of 6": its count left
     * out somebody invited who had not joined. The header's rule, which the board's glance already
     * reads (whoIsInTheRound): everybody on the check-in, and a lead who only asks only where the
     * round waits on them. Who the round WAITS on before it is written stays whoAnswered, above.
     */
    const notLetInHere = new Set(whoAnswered.notLetInIds ?? []);
    /* Invited, not joined yet: in no count and never named as not checked in (Hafsah, 13 October). */
    const notJoinedHere = new Set(whoAnswered.notJoinedIds ?? []);
    const theRound = howManyInTheRoundAnswered(
      (ground.participants as any[]).map((p: any) => ({ ...p, notLetIn: notLetInHere.has(p.id), notJoinedYet: notJoinedHere.has(p.id), awayUntil: whoAnswered.awayUntil?.[p.id] ?? null, checkIns: answeredIds.has(p.id) ? [{ status: CheckInStatus.COMPLETED, sessionNumber }] : [] })),
      sessionNumber,
      (ground as any).scenario,
    );

    /* Whose document backs each line: somebody else's proves nothing of theirs (how-a-line-is-known). */
    const whoseDocument = await whoAddedEachBackingDocument(this.prisma, entries as any[]);
    /* Only the person who runs it can end it, so anybody else is told who that is: by name where
       this reader may read a name (the same rule as every other line), otherwise by the role. */
    const whoEndsIt = isInitiator ? null : (() => {
      const lead = ground.participants.find((x) => !!ground.initiatorId && x.userId === ground.initiatorId);
      const label = lead ? labels.get(lead.id) : null;
      return (label && nameByLabel.get(label)) || 'the person running it';
    })();
    const shape = theSessionReport({
      sessionNumber,
      runsUntilEnded: !!(ground as any).runsUntilEnded,
      whoEndsIt,
      /* The one rule the board and the engine use (session-count.ts): a one-time check-in is one,
         otherwise the length over the rhythm. Null where either is unset, so the header omits the
         position rather than inventing a denominator. Worked out inline it had no step for a one-time
         check-in, so the report read "Session 1." while the board read "of 1" (12 October). */
      plannedSessions: totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null,
      closed: !!snapshot,
      /* The wall is the release, not whether the round has closed (user journeys, F-12). */
      othersWordsAreNotYetOpen: !(released || viewerIsLead),
      agreements: (snapshot?.agreements ?? ground.report?.agreements ?? []) as unknown[],
      /* The marks the build stored, only for the live report: a closed round's lines were kept as they were. */
      marksOnItsLines: snapshot ? null : ((ground.report as any)?.engagement?.marksOnItsLines ?? null),
      /*
       * EACH SIDE NAMED THE WAY EVERY OTHER LINE IS. The positions carried the raw label, and the page
       * printed "Expansion lead at MarketView, an agricultural market intelligence platform. I am
       * running one session with 24 organisations...:" as a name (run 8, 21 Sep 2026). The same rule
       * as the rows: a name where this reader may see one, the role's handle where they may not.
       */
      divergences: ((snapshot?.divergences ?? ground.report?.divergences ?? []) as any[]).map((d) => {
        const sides = Array.isArray(d?.positions) ? d.positions : Array.isArray(d?.perspectives) ? d.perspectives : null;
        if (!sides) return d;
        const named = sides.map((p: any) => {
          const label = String(p?.participantLabel ?? p?.who ?? '').trim();
          const pid = [...labels.entries()].find(([, l]) => l === label || l === label.replace(/[.]+$/, ''))?.[0];
          const who = pid ? whoOf(pid) : null;
          const printed = who && who !== label ? who : (label.split(/\s+/).length > 5 ? handleOf(label) : label);
          return { ...p, participantLabel: printed, who: printed };
        });
        return { ...d, ...(Array.isArray(d?.positions) ? { positions: named } : {}), ...(Array.isArray(d?.perspectives) ? { perspectives: named } : {}) };
      }),
      /*
       * `cleanText` STRIPS THE ENGINE'S OWN MARKERS BEFORE ANYBODY READS THEM.
       *
       * Record entries are stored with the extraction's verifiability tier stamped on the front -
       * `[VERIFIABILITY:HIGH] Fifteen qualified meetings a month`. Driven live, the promised
       * per-session report rendered every line with that prefix showing: machinery on the one
       * screen whose claim is that it holds what a person said. The helper already existed for
       * exactly this reason and this is the read that has to call it.
       */
      entries: entries.map((e) => ({
        type: e.type,
        text: cleanText(e.text),
        who: nameOnARow(e.participantId),
        recallBased: e.recallBased,
        backedBy: (e as any).anchoredOrigin ?? null,
        confirmedAt: (e as any).confirmedAt ?? null,
        ...((e as any).anchoredDocumentId && whoseDocument.has((e as any).anchoredDocumentId) ? { documentIsTheirOwn: whoseDocument.get((e as any).anchoredDocumentId) === e.participantId } : {}),
        threadKey: e.dimensionThreadKey ?? null,
      })),
      previousEntries: previousEntries.map((e) => ({
        type: e.type,
        text: cleanText(e.text),
        /* Whose commitment it was. Without it the reader calls every carried line the reader's own. */
        who: nameOnARow(e.participantId),
        threadKey: e.dimensionThreadKey ?? null,
      })),
      baselineSuccess: baseline?.successLooksLike ?? null,
      startingPoint: startingPoint?.text ?? null,
      previousSharedPicture: previousSnapshot?.sharedPicture ?? null,
      /* A document with no participant belongs to the check-in rather than to a person. */
      /* Named for what kind of thing it is: a typed document, a photo, notes written with a model. */
      /* One sentence each, never the file name and its kind joined with a dot (request 61). */
      evidence: docs.map((d) => ({ text: whatThisDocumentIs(d.fileName, (d as any).origin), who: d.participantId ? whoOf(d.participantId) : null })),
      specificityLevel: checkIn?.specificityLevel ?? null,
      centralQuestion: snapshot?.centralQuestion ?? ground.report?.centralQuestion ?? null,
      /*
       * THE THREE THE FOUR READS NEED THAT THE ENTRIES DO NOT CARRY. Read the same way the board
       * reads them, from the same rows, so the two surfaces cannot disagree about how many things
       * are blocked - which is worse than one of them not saying.
       */
      movedOnTargets: held.movedOnTargets,
      /* And how many exist, so "no target set" is only ever said where none is. */
      targetsSet: held.targetsSet,
      targetsWithANumber: held.targetsWithANumber,
      targetsMoved: held.targetsMoved,
      blocked: held.blocked,
      waiting: held.waiting,
      /* So the Blockers tile names the thing instead of repeating its own label. */
      theFirstBlocker: held.theFirstBlocker,
      worries: held.worries,
      theFirstWorry: held.theFirstWorry,
      filesSentThisSession,
      whyNoWorryIsShown: held.whyNoWorryIsShown,
      waitsFromEarlier: held.waitsFromEarlier,
      saidInAll,
      documentedInAll,
      /* Everybody the session counts, from the one definition (how-many-have-answered.ts): the
         confidence read is about how much basis there is, and somebody who has not answered is the
         largest gap there is. */
      peopleInAll: whoAnswered.expected,
      /* Invited and not joined yet: not waited on, and never read as "everybody has answered" (reviewer, 14 October). */
      notJoinedYet: (whoAnswered.notJoinedIds ?? []).length,
      /*
       * A COMMITMENT WITH A NAME AND A DATE ON IT IS A DIFFERENT OBJECT FROM ONE WITHOUT.
       *
       * Counted here rather than read from a model: an entry that mentions somebody and carries a
       * month, a weekday or a date is checkable, and one that does not is an intention. It is one
       * of the four things the confidence reading is built from.
       */
      commitmentsWithOwnerAndDate: entries.filter(
        (e) => e.type === RecordEntryType.COMMITMENT && hasOwnerAndDate(cleanText(e.text)),
      ).length,
      answeredThisSession: ground.participants
        .filter((p) => !p.managingOnly && answeredIds.has(p.id))
        .map((p, i) => ({
          who: (() => {
            const label = labels.get(p.id);
            const named = label ? nameByLabel.get(label) : undefined;
            if (named) return named;
            return aColleague(p.id);
          })(),
          isYou: !!me && p.id === me.id,
        })),
    });

    /*
     * The written sentence per person, above their own fragments. See the pass: it is given one
     * person's lines and nothing else, the fragments are kept, and a decline costs nothing.
     */
    await this.fillWhatEachPersonSaid(shape.whatEachPersonSaid as any[]);

    /*
     * AND THE PRODUCT'S OWN FINDING FOR EACH PERSON, under the model's sentence. Written at synthesis
     * from the record (see the-finding-per-person); here the label is turned into the name this
     * reader may see, or "You" for their own row. The lead reads every row; a participant reads
     * their own and, where peers are named on this ground, the others by name.
     */
    const storedFindings = Array.isArray((ground as any).report?.findings) ? ((ground as any).report.findings as any[]) : [];
    if (storedFindings.length) {
      for (const row of shape.whatEachPersonSaid as any[]) {
        const pid = ground.participants.find((p) => {
          const label = labels.get(p.id);
          const named = label ? nameByLabel.get(label) : undefined;
          return (named ?? label) === row.who;
        })?.id;
        const f = pid ? storedFindings.find((x) => x.participantId === pid) : null;
        if (!f) continue;
        const esc = String(f.label ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        row.finding = String(f.text ?? '').replace(new RegExp(`^${esc}`), row.isYou ? 'You' : row.who).replace(/^You said this was for/, 'You said this was for');
        row.hasGap = !!f.hasGap;
      }
    }

    /*
     * PART 3, HAFSAH'S RULING, 30 SEPTEMBER 2026: in an evaluation check-in, the person being
     * reviewed reads the facts, never a colleague's exact words - those go only to the manager (an
     * admin WITH access to this check-in reads as the manager does). This is the one reader that
     * changes for: see colleagues-exact-words-stay-with-the-manager.ts. A colleague giving a view,
     * and everybody on every other kind of check-in, reads `whatEachPersonSaid` exactly as before.
     *
     * DECISION 60 POINT 4, 30 September 2026: an admin WITHOUT access to this check-in reads no
     * colleague's exact words here either - the same access rule decision 58 gave patterns
     * (`evaluationWordsRunsIt`, above), never "every admin of the organisation". `isLead` here is
     * deliberately narrower than `viewerIsLead`: an admin covering for this specific check-in is
     * still read as the manager, and an admin who merely has decision 5's wider board-and-report
     * access is not.
     */
    if (viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: (ground as any).scenario,
      isLead: isInitiator || evaluationWordsRunsIt,
      viewerParticipantId: me?.id ?? null,
      participants: ground.participants as any,
    }) || (isOrgAdmin && !evaluationWordsRunsIt && isEvaluationCheckIn((ground as any).scenario))) {
      const unwalled = shape.whatEachPersonSaid as any[];
      shape.whatEachPersonSaid = whatEachPersonSaidForTheSubject(shape.whatEachPersonSaid as any[], { aDecisionIsBelow: !!((ground as any).resolvedAt || (ground as any).endState) }) as any;
      /* The new hire reads the lead's own row word for word (request 124, Hafsah's answer of 3 October). Only the lead's: a colleague's stays walled. */
      const theLead = (ground.participants as any[]).find((p) => p.partyType === 'INITIATOR');
      if (theNewHireReadsTheLeadsWords((ground as any).scenario) && theLead && viewerIsTheSubjectOfAnEvaluationCheckIn({
        scenario: (ground as any).scenario, isLead: isInitiator || evaluationWordsRunsIt, viewerParticipantId: me?.id ?? null, participants: ground.participants as any,
      })) {
        const leadLabel = labels.get(theLead.id);
        const leadWho = (leadLabel ? nameByLabel.get(leadLabel) : undefined) ?? aColleague(theLead.id);
        shape.whatEachPersonSaid = (shape.whatEachPersonSaid as any[]).map((row, i) => (!row.isYou && row.who === leadWho ? unwalled[i] : row)) as any;
      }
    }

    /**
     * WHO THIS REPORT IS COUNTING, AND WHO HAS SHOWN THEIRS.
     *
     * "You see who's checked in, the report is counting." Two different questions, and both were
     * answered somewhere other than on the report: the count lived on the tab above it, and the
     * reveal state lived in a row that named people by position - "not yet, Party 2" - which
     * tells a lead nothing they can act on.
     *
     * Both come with the report now, carrying the report's own labels rather than an index. A
     * party who has never recorded a name still occupies a row, because losing the row would lose
     * the fact that somebody has not answered, which is the point of it.
     */
    const activations = await this.prisma.reportActivation.findMany({
      where: { groundId },
      select: { participantId: true, status: true },
    });
    const shown = new Set(
      activations.filter((a) => a.status === ReportActivationStatus.ACTIVATED).map((a) => a.participantId),
    );
    /*
     * WHO THIS SESSION IS COUNTING, ASKED OF THE ONE RULE. This listed every row on the roster minus
     * managing-only, so the masthead said "4 people, 2 of 4 answered" while the finding three lines
     * below it - which asks how-many-have-answered - said "2 of 5". Same card, two denominators.
     */
    const awayNow = await whoOnACheckInIsAway(this.prisma, groundId);
    const counting = whoIsInTheRound(
      ground.participants.map((p: any) => ({ ...p, notLetIn: notLetInHere.has(p.id), notJoinedYet: notJoinedHere.has(p.id), awayUntil: awayNow.get(p.id) ?? null, checkIns: answeredIds.has(p.id) ? [{ status: CheckInStatus.COMPLETED, sessionNumber }] : [] })),
      sessionNumber,
      (ground as any).scenario,
    )
      .map((p: any, i: number) => ({
        who: (() => {
          const label = labels.get(p.id);
          const named = label ? nameByLabel.get(label) : undefined;
          if (named) return named;
          /*
           * Somebody who has not joined yet has no name of their own, so `displayName` returns
           * null by design. To a PEER the label is the right answer and the address is not
           * theirs to see; to the LEAD, who typed that address, "participant B" is useless -
           * they cannot tell which invitation is outstanding. That distinction is already
           * written down above `displayName`; this is the read that needed it.
           */
          return aColleague(p.id);
        })(),
        isYou: !!me && p.id === me.id,
        answered: answeredIds.has(p.id),
        hasShownTheirs: shown.has(p.id),
      }));

    /*
     * WHO IS WAITING TO BE LET IN, SAID APART FROM THE COUNT (decision 77). Somebody an admin has not let
     * in yet is not in `counting` or in "N of M"; they are said here instead, to whoever runs the
     * check-in and an admin with access: each by name, or as a count where no name is known. Never to a
     * person who checks in, whether or not people see each other: whether somebody has been let in is
     * the organisation's business.
     */
    /* A person who checks in reads it too (decision 93, row 4): that somebody is waiting, by name only where this report names people, never a decline, never as a guest. */
    const aParticipantReadsIt = !viewerIsLead && !!me && !(await isFromOutside(this.prisma, requestingUserId, (ground as any).organizationId));
    const waitingToBeLetIn = theWaitingToBeLetInLine(
      [...(await whoIsNotLetInYet(this.prisma, ground.participants as any[], (ground as any).organizationId)).entries()]
        .filter(([id]) => !answeredIds.has(id) && id !== me?.id)
        .map(([id, d]) => {
          const label = labels.get(id);
          return { name: (label ? nameByLabel.get(label) : undefined) ?? null, declined: d.declined };
        })
        .filter((w) => viewerIsLead || (aParticipantReadsIt && !w.declined)),
    );

    /*
     * AND WHETHER THIS IS STILL CORRECTABLE, said before somebody presses the button rather than
     * after. A control that offers a correction and then refuses it teaches a person the product
     * is unreliable; a control that says "corrections closed on the 8th" is the same fact,
     * delivered where they can act on it.
     */
    /**
     * WHERE PEOPLE ARE AGAINST WHAT WAS NAMED, which is the question the product asked and then
     * never answered. Every entry so far rather than this session's, because a condition somebody
     * committed to in session two is not unspoken in session three, and each person's own account
     * of what success is was given once and stands until they change it.
     *
     * Same reader wall as everything else on this page: `readableParticipantIds` is their own row
     * until the report releases. Before release a party sees their own definition beside the
     * lead's stated one, which is the comparison that is theirs to make; the rest arrives with
     * the report.
     */
    const everyEntrySoFar = await this.prisma.recordEntry.findMany({
      where: { disputedAt: null, participantId: { in: readableParticipantIds }, checkIn: { sessionNumber: { lte: sessionNumber } } },
      orderBy: { createdAt: 'asc' },
      select: { type: true, text: true, participantId: true },
    });
    /* A team target the lead set is what success looks like, said as a number (request 132 g): "No standard is set. You have not
       said what success looks like" was read by a lead who had set 6,000. Only to the lead, who may read every target. */
    const theTargetTheLeadSet = !(baseline?.successLooksLike ?? '').trim() && isInitiator
      ? await Promise.resolve((this.prisma as any).groundObjective?.findFirst?.({
        where: { groundId: (ground as any).id, ownerParticipantId: null },
        orderBy: { sortOrder: 'asc' }, select: { name: true },
      })).then((o: any) => (typeof o?.name === 'string' && o.name.trim() ? o.name.trim() : null)).catch(() => null)
      : null;
    const againstSuccess = whereYouAreAgainstWhatYouNamed({
      counting: readableParticipantIds.length === ground.participants.length ? 'everyone' : 'only-yours',
      stated: baseline?.successLooksLike ?? theTargetTheLeadSet ?? null,
      leadHasSaidIt: everyEntrySoFar.some(
        (e) => e.type === RecordEntryType.SUCCESS_DEFINITION
          && ground.participants.find((x) => x.id === e.participantId)?.userId === ground.initiatorId,
      ),
      readerIsTheLead: isInitiator,
      onlyTheLeadIsHere: ground.participants.filter((x) => !x.managingOnly).length === 1 && ground.participants.filter((x) => !x.managingOnly)[0].userId === ground.initiatorId,
      leadName: ((id) => (id ? whoOf(id) : null))(ground.participants.find((x) => !!ground.initiatorId && x.userId === ground.initiatorId)?.id),
      version: baseline?.version ?? null,
      conditions: Array.isArray(baseline?.conditions) ? (baseline!.conditions as string[]) : [],
      entries: everyEntrySoFar.map((e) => ({
        type: e.type,
        text: cleanText(e.text),
        who: whoOf(e.participantId),
      })),
    });

    /*
     * WHAT THIS SITS UNDER, IF ANYTHING SITS ABOVE IT.
     *
     * The same read the board runs, on the same page as the objective it qualifies. A cascade is a
     * fact about the objective rather than a section of its own, so it travels beside
     * `againstSuccess` and renders above it: a reader who does not know what this work is FOR cannot
     * read a single line of movement underneath it correctly.
     *
     * Evidence only - the situation picked at setup never carries this on its own. See
     * is-this-a-cascade.ts for why, and for why the no answer is still worth printing.
     */
    /* Fetched rather than read off `ground`: this query selects neither the scenario nor the
       targets, and reading an undefined off it would silently answer "no cascade" forever. */
    const forCascade = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { scenario: true, objectives: { select: { name: true } } },
    });
    const cascade = forCascade
      ? isThisACascade({
        scenario: forCascade.scenario,
        objectiveNames: forCascade.objectives.map((o) => o.name),
        importedWithParents: [],
        entries: everyEntrySoFar.map((e) => ({ participantId: e.participantId, text: cleanText(e.text) })),
      })
      : null;

    const window = await this.correctionWindowDays();
    const canCorrect = whetherItCanStillBeCorrected({
      releasedAt: (ground.report?.releasedAt as Date | null) ?? null,
      windowDays: window,
    });

    /*
     * WHAT KEEPS COMING UP, FOR THIS READER ONLY. See patterns/who-reads-a-pattern.
     *
     * This read every SURFACED row on the ground and served it to every reader of the report, "who"
     * and all, and handed the same list to the picture, which everybody in the check-in reads. Now
     * the section carries the reader's own patterns, or everybody's for whoever runs the check-in,
     * after three periods, in plain words; and the picture carries none, because it is shared and a
     * pattern never is. Nothing at all while patterns are not served, and then not even the read.
     */
    const patternRowsForPage = PATTERNS_ARE_SERVED
      ? await this.prisma.patternDetection.findMany({ where: { groundId }, orderBy: [{ lastSeenAt: 'desc' }], select: PATTERN_ROW_SELECT })
      : [];
    /* A report for session N shows only what had reached three periods BY session N - not the
       ground's current state, which may have reached it later. See patternRowAsOfSession. On a
       daily ground `seenInSessions` holds calendar-week period numbers, not session numbers (see
       period-of.ts), so "as of this session" has to ask in the same units: the period this
       session's own report was taken in, not its raw session number. */
    const periodOfThisSession = periodOf({ sessionNumber, when: snapshot?.takenAt }, ground as any);
    const patternRowsAsOfThisSession = (patternRowsForPage as APatternRow[]).map((r) => patternRowAsOfSession(r, periodOfThisSession));
    const namesForPatterns = whoIsWhoIn(ground.participants as any, ground.initiatorId, (ground as any).cadence);
    /* Decision 58: narrower than viewerIsLead (which counts every admin of the organisation) - a
       pattern and its answer go only to the lead or the admin who set this check-in up for them.
       See patterns/who-reads-a-pattern, runsItForAPattern. */
    const patternRunsIt = runsItForAPattern(ground as any, requestingUserId);
    const patternsForPage = await wordPatternEvidence(
      servedPatterns(
        patternRowsAsOfThisSession as any,
        { participantId: me?.id ?? null, runsIt: patternRunsIt },
        namesForPatterns,
      ),
      namesForPatterns.firstNameOf ?? (() => null),
      this.patternEvidenceCompose(),
    ).catch(() => servedPatterns(patternRowsAsOfThisSession as any, { participantId: me?.id ?? null, runsIt: patternRunsIt }, namesForPatterns));
    /* What the report kept about each pattern, beside that pattern and for whoever runs the check-in only: see patterns/stored-pattern-lines-through-the-wall. */
    const patternsWithWhatWasKept = withTheEarlierRead(
      patternsForPage,
      patternRowsAsOfThisSession as any,
      patternRunsIt
        ? await Promise.resolve((this.prisma as any).report?.findUnique?.({ where: { groundId }, select: { overTime: true } })).then((r: any) => (Array.isArray(r?.overTime?.patterns) ? r.overTime.patterns : [])).catch(() => [])
        : [],
      { runsIt: patternRunsIt },
    );
    /* The person reading their own for the first time starts the clock on when the lead may read it. */
    await markShownToThePerson(this.prisma as any, theOnesTheyAreSeeingFirst(patternRowsForPage as any, patternsForPage));
    /* Rows the picture draft and the question read. Each starts inside a promise: see myOwnSoftSpots. */
    const started = <T,>(f: () => Promise<T>, fallback: T): Promise<T> => Promise.resolve().then(f).catch(() => fallback);
    const [depRows] = await Promise.all([
      started(() => this.prisma.groundDependency.findMany({
        where: { groundId, status: { in: ['WAITING', 'BLOCKING'] as any } },
        select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, status: true, createdAt: true, escalatedAt: true, triedSaid: true, blockerKind: true, sourceCheckInId: true },
      /* Nobody waits on themselves: a wait on oneself stored before request 111 (e) is not read as one (request 117, part 6). */
      }).then((rows: any[]) => rows.filter((d) => !aWaitOnOneself(d))), [] as any[]),
    ]);

    /*
     * WHAT IS STILL BEING WAITED ON, AS OPPOSED TO WHAT WAS ONCE SAID. A handoff clears only when
     * somebody says it has; one resolved quietly stays open for the life of the ground. See
     * a-blocker-nobody-raised-again.ts - read live as "waiting for 6 things, starting with
     * introductions" on the closing report of a ground where the introductions happened in week six.
     */
    const allCheckIns = await this.prisma.checkIn.findMany({ where: { groundId }, select: { id: true, participantId: true, sessionNumber: true, status: true } });
    const sessionOfCheckIn = new Map(allCheckIns.map((c) => [c.id, c.sessionNumber]));
    const latestSessionByPerson = new Map<string, number>();
    for (const c of allCheckIns.filter((c) => c.status === CheckInStatus.COMPLETED)) {
      latestSessionByPerson.set(c.participantId, Math.max(latestSessionByPerson.get(c.participantId) ?? 0, c.sessionNumber));
    }
    const withSession = (depRows as any[]).map((d) => ({ ...d, statedInSession: d.sourceCheckInId ? sessionOfCheckIn.get(d.sourceCheckInId) ?? null : null }));
    let currentDeps = stillRaised(withSession, latestSessionByPerson);
    const wentQuiet = notRaisedAgain(withSession, latestSessionByPerson).length;
    if (wentQuiet) this.logger.log(`${wentQuiet} handoff(s) on ${groundId} have not been raised again; left out of the current read.`);
    /*
     * A CLOSED SESSION'S PICTURE WAITS ON WHAT WAS WAITED ON THEN (found with request 102). Session 1's
     * picture, closed on 27 September, said "Amani Wekesa is waiting on you for the price list", a wait
     * raised in session 2, and left out the wait on the discount that session 1 was about, because it
     * had been cleared since. For a session before the one the report holds now, the waits are those
     * raised by the day it closed and not cleared by then, taken further only if that was by then.
     */
    const closedAsOf = await this.whereThisSessionIsCut(groundId, sessionNumber, snapshot?.takenAt ?? null, periodOfThisSession).catch(() => undefined);
    if (closedAsOf) {
      const at = new Date(closedAsOf.at).getTime();
      const by = (d: unknown) => !!d && new Date(d as any).getTime() <= at;
      const then = await (this.prisma.groundDependency?.findMany?.({
        where: { groundId },
        select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, status: true, createdAt: true, clearedAt: true, escalatedAt: true, triedSaid: true, blockerKind: true, sourceCheckInId: true, namedTheThing: true } as any,
      }) ?? Promise.resolve([])).catch(() => null);
      if (Array.isArray(then)) {
        currentDeps = (then as any[])
          .filter((d) => by(d.createdAt))
          .filter((d) => ['WAITING', 'BLOCKING'].includes(String(d.status)) || (!!d.clearedAt && !by(d.clearedAt)))
          .map((d) => ({ ...d, escalatedAt: d.escalatedAt && by(d.escalatedAt) ? d.escalatedAt : null, statedInSession: d.sourceCheckInId ? sessionOfCheckIn.get(d.sourceCheckInId) ?? null : null }))
          .filter((d) => d.statedInSession === null || d.statedInSession <= sessionNumber) as any;
      }
    }

    /*
     * THE ASSEMBLER'S OWN SENTENCES GO THROUGH THE SAME WORDING PASS AS EVERYTHING ELSE.
     *
     * "Nobody committed to anything specific this session", the tile sub-lines and the confidence
     * reasons were template output read by every ground in the product in identical words. One call
     * for the lot, and the claims are held: a tile's VALUE is a count or a library string and must
     * survive; a reason's numbers must survive; and the draft ships on any refusal.
     */
    const wordedShape = await (async () => {
      const drafts: Drafted[] = [];
      shape.sections.forEach((sec, i) => { if (sec.saying) drafts.push({ key: `say${i}`, text: sec.saying }); });
      shape.atAGlance.forEach((t, i) => drafts.push({ key: `sub${i}`, text: `${t.label}: ${t.value}, ${t.sub.replace(/\.$/, '')}.`, mustKeep: [t.value] }));
      shape.confidence.reasons.forEach((r, i) => drafts.push({ key: `why${i}`, text: r }));
      drafts.push({ key: 'conf', text: shape.confidence.saying });
      drafts.push({ key: 'stand', text: shape.whereThingsStand.saying });
      const said = await this.phrase('the session report', drafts);
      /* And their quotes are the record's words, because none of this is stored: see
         a-quote-built-at-the-read. The tiles carry a worry or a blocker in its record words. */
      const quotable = await theRecordAQuoteMayComeFrom(this.prisma as any, groundId);
      const q = <T,>(v: T): T => this.quotesAsTheRecordHasThem(v, groundId, 'the session report', quotable);
      const subOf = (i: number, t: { label: string; value: string; sub: string }) => {
        const w = said[`sub${i}`];
        /* The tile keeps label and value as its own fields; only the sub-line takes the wording. */
        /* `\\s` in the pattern, not `\s`: in a template string `\s` is a plain "s", so every worded
           sub-line came out with a space in front of it. */
        const m = w ? w.match(new RegExp(`^${t.label}: ${t.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*(.*)\\.?$`)) : null;
        if (!m) return t.sub;
        const worded = m[1].trim().replace(/\.$/, '');
        /* A sub-line that is a sentence of its own keeps its full stop (request 67). */
        return /\.$/.test(t.sub) && worded ? `${worded.charAt(0).toUpperCase()}${worded.slice(1)}.` : worded;
      };
      return {
        ...shape,
        sections: shape.sections.map((sec, i) => ({ ...sec, saying: q(sec.saying ? (said[`say${i}`] ?? sec.saying) : sec.saying) })),
        atAGlance: shape.atAGlance.map((t, i) => ({ ...t, sub: q(subOf(i, t)) })),
        confidence: { ...shape.confidence, saying: q(said.conf ?? shape.confidence.saying), reasons: q(shape.confidence.reasons.map((r, i) => said[`why${i}`] ?? r)) },
        whereThingsStand: { ...shape.whereThingsStand, saying: q(said.stand ?? shape.whereThingsStand.saying) },
      };
    })();

    /*
     * A SITUATION WITH NO AIM IS NOT A SITUATION MISSING ONE.
     *
     * Read on a live team update: section 01, "What everybody said good looks like", saying "No
     * standard is set. The person running this has not said what success looks like, so nobody is
     * being measured against anything yet." Nobody was ever going to. That card asks one question
     * and collects the answers; a standard is not part of it, and telling a lead they have failed
     * to set one is the product misreading its own design as somebody's omission.
     *
     * So where an aim is not owed and nobody has stated one anyway, the section is left out rather
     * than filled with its own absence. A lead who DID state one still gets it, in every situation.
     */
    const anAimBelongsHere = anAimIsOwedHere((ground as any).scenario);
    const somebodyStatedOne = !!(baseline?.successLooksLike ?? '').trim() || againstSuccess.definitions.length > 0;

    /*
     * A ONE-TIME LISTENING SESSION HAS NO TILES AND NO STANDARD. "Movement: not tracked", "Blockers: 44",
     * "All from memory" and a sixty-line list of every aim ever said sat on a discovery report (run 8,
     * 21 Sep 2026). They measure a run of work against a stated aim; a room that met once has neither.
     */
    const listeningOnce = (ground as any).cadence === Cadence.ONE_TIME;

    return {
      ...wordedShape,
      ...(listeningOnce ? { atAGlance: [] } : {}),
      againstSuccess: !listeningOnce && (anAimBelongsHere || somebodyStatedOne) ? againstSuccess : null,
      cascade: cascade && (cascade.isCascade || cascade.basis.includes('DECLARED')) ? cascade : null,
      /* For the page that says what the check-in still needs: the date this person gave, and the
         brief's own number, so neither is asked for as if nobody had said it. */
      myTimeframe: me ? (entries.filter((e) => e.participantId === me.id && e.type === RecordEntryType.TIMEFRAME).map((e) => cleanText(e.text)).pop() ?? null) : null,
      briefStandard: sentenceWithANumber((ground as any).brief),
      correctable: canCorrect.allowed,
      whyNotCorrectable: canCorrect.allowed ? null : canCorrect.saying,
      counting,
      /* "Faraji Odhiambo is waiting to be let in.", or null. Not in `counting` (decision 77). */
      waitingToBeLetIn,
      everybodyHasShownTheirs: counting.every((c) => c.hasShownTheirs),
      /*
       * WHETHER THE SHARED REPORT HAS GONE OUT, AND WHETHER THIS READER HAS SHOWN THEIRS.
       *
       * The mutual reveal - each person choosing to show their own report, and the comparison
       * opening only once everybody has - lived on the lead's report tab and on the party page.
       * The report tab became a list of sessions, and the action went with the body: so a LEAD who
       * is also a party to their own check-in, which is almost always, lost the only way to show
       * their report to their team. Nobody caught it because the call still existed in the party
       * component, which a lead never sees.
       *
       * It belongs on the report it gates rather than on either page, so both readers get it from
       * the same place. These two flags are all a screen needs to offer it.
       */
      released,
      /* Which sessions' pictures are released, and, for a reader of only those, that this one is not
         shared yet, in a plain sentence (decision 76, item 4). */
      releasedSessions: releasedSessionsOf(ground.report as any) ?? [],
      ...(pictureWithheld ? { teamPicture: { shared: false, sessionNumber, says: thisSessionIsNotSharedYet(sessionNumber) } } : {}),
      ...(isInitiator && !released ? { releaseThisSession: await (async () => {
        const now = await theSessionTheReportHolds(this.prisma, groundId);
        return now === sessionNumber ? { sessionNumber, saying: whatReleasingThisSessionDoes(sessionNumber) } : null;
      })() } : {}),
      iHaveShownMine: !!me && shown.has(me.id),
      /*
       * WHAT KEEPS SHOWING UP, AS A SECTION AND NOT A SUGGESTION.
       *
       * The pattern engine has survived a three-period rule and has three hundred surfaced rows in
       * this database, and its only route into the shared report was a paragraph telling the
       * synthesis model to mention it "if the record corroborates". A model that may decline is a
       * suggestion, not a section, and two routes for one fact can disagree on one page - so the
       * prompt route is gone (see synthesize) and this is the route.
       *
       * SURFACED only: a CANDIDATE has been seen once and once is not a pattern. The alignment-feed
       * codes stay out, as they do everywhere a person reads. The wording is the library's own
       * `signal`, and who it is about follows the same naming rule as every other line here.
       */
      patterns: patternsWithWhatWasKept,
      /*
       * THIS SESSION'S OWN COACHING NOTE, PROBE LIST AND INFERENCES (request 102, 2 October 2026).
       *
       * The report page of session 1, closed on 27 September, read all three from `GET /report`, the
       * check-in's working copy, so under "Closed 27 Sept 2026. This does not change." it opened "This
       * is session 2 ...", and the lead's probe list said Baraka had not answered "this session", while
       * the team report on the same page said he had. Each is now carried here, built from the record
       * as it stood when this session closed, under the same walls as `GET /report`: the reader's own
       * coaching note to the reader alone, and the probe list and the inferences to whoever runs it.
       * Built from what is stored, so opening the page rebuilds nothing (decision 7).
       */
      /* A note that cannot be built must not take the report down: the report is what they came for. */
      ...(await this.thisSessionsOwnCoaching(groundId, ground as any, sessionNumber, me as any, requestingUserId, viewerIsLead, snapshot?.takenAt ?? null, periodOfThisSession)
        .catch((err: any) => { this.logger?.warn?.(`Session ${sessionNumber}'s own coaching for ${groundId} could not be built: ${err?.message}`); return {}; })),
      /*
       * THE PICTURE FROM EVERYBODY, DRAFTED FROM THE READS AND WORDED BY THE MODEL.
       *
       * The stored `sharedPicture` is a model over the whole corpus and nothing checks it. It stays
       * for the ground report and the board, under `writtenPicture` here. On THIS page the picture
       * is built from the engines' own claims and the model rewords the draft under the same guard
       * as every other line. With no engine basis it is empty, not filled from the transcript.
       * See the-picture-is-drafted-from-the-reads.ts.
       */
      ...(await (async () => {
        /* The reader is 'you' in the picture, whatever whoOf calls them in a cite. */
        const nameFor = (pid: string) => (me && pid === me.id ? 'You' : whoOf(pid) ?? null);
        /*
         * NO READING ABOUT ANY PERSON IN THE PICTURE (request 101 a and b, 2 October 2026).
         *
         * The picture is read by everybody in the check-in. It carried the coverage read of each
         * person, grouped by what it said, so Amani was sent "Rukia Otieno, Baraka Mwangi, You and
         * Neema Achieng: the role was never clearly defined, so there is no boundary to measure work
         * against. Define what this role owns before reading anything into where work is landing."
         * That is a reading about each person and advice to the lead, sent to every participant, as
         * pieces joined by a colon. Before it, the contribution read did the same ("Faraji Odhiambo:
         * 0 check-ins on record, nothing specific named yet.", about a man an admin had not let in),
         * and request 111 (a) took that one out. A reading about a person reaches only that person
         * and the lead (decision 74, decisions 58 and 67), and the lead reads both on the board, so
         * neither comes into the shared picture at all. The engine still makes both reads; only this
         * shared page no longer carries them.
         */
        const coverage: { name: string; reasonText: string }[] = [];
        const contribution: { name: string; reason: string }[] = [];
        const oneTime = (ground as any).cadence === Cadence.ONE_TIME;
        const directionForThePicture = oneTime ? await this.theDirectionAsLines(ground, me ? (labels.get(me.id) ?? null) : null) : null;
        const drafts = draftThePicture({
          /* Where two people describe the same thing differently, that is the finding. */
          differences: ((snapshot?.divergences ?? ground.report?.divergences ?? []) as any[])
            .filter((d) => d?.topic && Array.isArray(d.perspectives) && d.perspectives.length >= 2)
            .slice(0, 3)
            .map((d) => ({
              topic: String(d.topic),
              sides: (d.perspectives as any[]).slice(0, 3).map((p) => ({ who: nameByLabel.get(String(p.participantLabel ?? '')) ?? String(p.participantLabel ?? 'somebody'), says: String(p.view ?? '') })),
            })),
          /*
           * THE ARITHMETIC, COMPUTED HERE AND NARRATED THERE. Same rule this service already
           * follows for every other deterministic feature, and the reason the finding could read
           * "the role was never clearly defined" while three people's numbers sat four lines below
           * it, in three different units. See do-the-parts-add-up-to-the-whole.
           */
          numbers: howTheNumbersSit(
            (await (this.prisma.groundObjective?.findMany?.({
              where: { groundId },
              select: { name: true, target: true, ownerParticipantId: true, direction: true },
            }) ?? Promise.resolve([])).catch(() => [] as any[])) as any[],
            whoAnswered.expected,
          ).says,
          /*
           * AND WHAT MOVED SINCE THE LAST ROUND, which from round two is the most useful sentence
           * on the page and was never on it. 4.3. Computed from the rounds already kept, so it
           * cannot disagree with the movement view. See what-changed-since-last-time.
           */
          sinceLastTime: await (async () => {
            /* Not while this session's picture is withheld from the reader: what changed IS that picture. */
            if (pictureWithheld) return null;
            /*
             * THIS SESSION AND THE ONE BEFORE IT, NOT THE LATEST TWO. This read the two newest rounds
             * whatever session was in hand, so session 1's report said what changed in session 2
             * (found with decision 76, item 4). And for somebody who reads only what is released, only
             * rounds that have been.
             */
            const kept = ((await (this.prisma.reportRound?.findMany?.({
              where: { groundId, sessionNumber: { lte: sessionNumber } },
              orderBy: { sessionNumber: 'desc' },
              take: 2,
              select: { sessionNumber: true, divergences: true },
            }) ?? Promise.resolve([] as any[])).catch(() => [] as any[])) as any[])
              .filter((r: any) => typeof r?.sessionNumber !== 'number' || r.sessionNumber <= sessionNumber)
              .filter((r: any) => viewerIsLead || !me || typeof r?.sessionNumber !== 'number' || isThisSessionReleased(ground.report as any, r.sessionNumber));
            /* A kept round holds what was said, not who had answered when it was taken, so the
               count is left out of the comparison rather than guessed at. */
            const rounds = (kept as any[]).map((r: any) => ({
              topics: (Array.isArray(r.divergences) ? r.divergences : []).map((d: any) => String(d?.topic ?? '')).filter(Boolean),
              answered: whoAnswered.answered,
            }));
            const current = {
              topics: ((snapshot?.divergences ?? ground.report?.divergences ?? []) as any[]).map((d: any) => String(d?.topic ?? '')).filter(Boolean),
              answered: whoAnswered.answered,
            };
            /* The most recent kept round is this one where it has already been stored. */
            const previous = rounds.find((r) => r.topics.join('|') !== current.topics.join('|')) ?? rounds[1] ?? null;
            return whatChangedSinceLastTime(current, previous);
          })(),
          answered: theRound.answered,
          ofPeople: theRound.ofPeople,
          confidence: shape.confidence,
          tiles: shape.atAGlance,
          /* The picture is read by everybody in the check-in, and a pattern is never shared. */
          patterns: [],
          coverage,
          contribution,
          blockers: currentDeps.map((d: any) => ({
            who: nameFor(d.fromParticipantId),
            on: d.onParticipantId ? nameFor(d.onParticipantId) : d.onLabel,
            onIsPerson: !!d.onParticipantId,
            what: d.what, kind: (d.blockerKind as any) ?? null, escalated: itWasTakenFurther(d),
            /* Whether they named the thing: the model's answer where we have it, the word-list rule
               on the rows written before that column existed. The finding's sentence branches on it. */
            named: theyNamedWhatTheyAreWaitingOn(d),
          })),
          settled: shape.whereThingsStand.settled,
          open: shape.whereThingsStand.differences ?? shape.whereThingsStand.open,
          oneTime,
          direction: directionForThePicture,
        });
        /* No role-map question to a room that met once; the sales map asked a discovery convener "what
           did that turn into - pipeline, conversion, sign-ups?" (run 8, 21 Sep 2026). */
        const question = oneTime ? null : draftTheQuestion({
          functions: ground.participants.map((p: any) => ({ fn: p.detectedFunction ?? null, confidence: p.detectedFunctionConfidence ?? null })),
          blockers: currentDeps.map((d: any) => ({ what: d.what, kind: (d.blockerKind as any) ?? null })),
          /* The difference this round found, and what the report says settles it - see draftTheQuestion. */
          differences: ((snapshot?.divergences ?? ground.report?.divergences ?? []) as any[])
            .filter((d) => d?.topic)
            .map((d) => ({ topic: String(d.topic), settledBy: d.settledBy ?? d.atStake ?? null })),
          /* The role map's probe is the lead's question to ask, never put to a participant (B-103). */
          forTheLead: viewerIsLead,
        });
        /* Two wording passes that do not depend on each other, in parallel. Measured serial: this
           endpoint took ten seconds and the page waited on it before drawing the shared half. */
        const [worded, wordedQ] = await Promise.all([
          this.phrase('the picture from everybody', drafts),
          question ? this.phrase('the conversation worth having', [question]) : Promise.resolve({} as Record<string, string>),
        ]);
        const pictureLines = drafts.map((d) => worded[d.key] ?? d.text);
        /* Keyed as well, so the page can lead with the finding and leave out the lines the tiles and
           the settled-and-open section already carry. */
        const picture = drafts.map((d) => ({ key: d.key, text: worded[d.key] ?? d.text }));
        /* With the drafts' own words, so a coverage line that says nothing is happening cannot be the
           sentence the round is named by. See pickTheFinding. */
        const findingKey = pickTheFinding(drafts.map((d) => d.key), Object.fromEntries(drafts.map((d) => [d.key, d.text])));
        /**
         * WHEN THIS WOULD HAVE COME UP ON ITS OWN.
         *
         * Under the finding and nowhere else: on its own it is a remark about a calendar, and under
         * the thing it is about it is the reason that thing matters now rather than later.
         *
         * THE THREE SITUATIONS THAT GET NOTHING are not special cases bolted on here - they are one
         * condition, `thereIsALater`, asked once. A one-off read has no next occasion by design. A
         * run on its last session has none left. And a shock has already surfaced, which is why the
         * check-in exists at all, so a sentence about when it would have surfaced is nonsense.
         *
         * The earliest stated due date across the measures, because the first one to fall due is
         * the first time anybody looks. Never a date nobody stated.
         */
        const soonestDue = ((ground as any).objectives ?? [])
          .map((o: any) => o.dueDate ?? null)
          .filter((d: any): d is Date => !!d)
          .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0] ?? null;
        const wouldHaveSurfaced = whenThisWouldHaveSurfaced({
          measure: (ground as any).objectives?.[0]?.name ?? null,
          dueOn: soonestDue,
          thisSession: sessionNumber,
          /* How many this run holds, from the length and the rhythm - the same arithmetic the
             chat composer does when it says "session 3 of 6", by the one rule in session-count.ts. Null where either is unset, which
             makes the read fall silent rather than guess at a last session. */
          plannedSessions: totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null,
          thereIsALater: ONE_SITTING_ONLY.has((ground as any).scenario)
            ? false
            : ALREADY_IN_THE_OPEN.has((ground as any).scenario)
              ? false
              : true,
        });
        const finding = findingKey
          ? {
            key: findingKey,
            text: picture.find((l) => l.key === findingKey)!.text,
            basis: picture.find((l) => l.key === 'basis')?.text ?? null,
            wouldHaveSurfaced: wouldHaveSurfaced?.say ?? null,
          }
          : null;
        return {
          /* One claim per line, kept as lines: joined into a paragraph it read as a wall of prose. */
          pictureLines,
          picture,
          finding,
          sharedPicture: drafts.length ? pictureLines.join(' ') : null,
          pictureBasis: drafts.length ? 'engines' : 'none',
          /* An old row's field names come out and a sentence said twice is said once (journey walk rows 1 and 2; no-field-names-on-the-page.ts). */
          theConversationWorthHaving: question ? readableWithoutFieldNames(wordedQ.question ?? question.text) : null,
          /* How the question is found is the lead's method; a participant with none is told nothing about it. */
          whyNoQuestion: question || oneTime || !viewerIsLead ? null : WHY_NO_QUESTION,
          /* The direction itself, for the page to draw as lists. Null off a discovery ground. */
          direction: oneTime ? await this.theDirectionFrom({ ...(ground as any), report: ground.report }, me ? (labels.get(me.id) ?? null) : null).catch(() => null) : null,
          /*
           * The waiting list here is the still-raised one. Without this line the reader is shown a
           * shorter list and nothing tells them why it got shorter - they read it as resolved. It
           * may be. Nobody has said so, and that is what this says.
           */
          whatWentQuiet: sayingWhatWentQuiet(wentQuiet),
        };
      })()),
      /*
       * THE ONE SURFACE THAT HANDED OUT RAW LABELS.
       *
       * Read off the page: "a 2am call to the initiator for a bed shortage on a weekend
       * participant A was thought to be on call... with participant B reporting delays" - to
       * participant B, who is the person reading it. Three registers in one paragraph, one of them
       * the reader described in the third person by a placeholder.
       *
       * Every other read runs the picture through `applyNames`, which resolves each label to a
       * name where this reader may see one, leaves it where they may not, and turns the reader's
       * own label into "you". This one returned the stored string. Same resolver, so the picture,
       * the counting table and the attributions cannot disagree about what to call somebody.
       */
      /* The stored, model-written picture, under its own name so nothing downstream that still reads
         it breaks, and so the page can never mistake it for the engine-drafted one. */
      /*
       * AND THROUGH THE SAME DECISION AS THE REPORT ITSELF.
       *
       * This read its own answer from `peersAreNamed`, which is the check-in's setting rather than
       * the organiser's choice at the moment of sending - so an organiser who sent a hundred people
       * an anonymised report would have had every name put back on this one surface. The picture on
       * the session page is the same picture; it gets the same rule. See what-the-respondents-get.
       */
      writtenPicture: snapshot?.sharedPicture
        ? this.asItWasShared(
            { ...(ground as any), report: { ...(ground as any).report, sharedPicture: snapshot.sharedPicture } },
            me?.id ?? null,
            viewerIsLead,
          ).sharedPicture
        : null,
      takenAt: snapshot?.takenAt ?? null,
      amendedAt: snapshot?.amendedAt ?? null,
      /* Put right where it is served, so a note stored with a colon reads as a sentence (request 131 item 3). */
      amendedNote: snapshot?.amendedNote ? aStoredSentenceReadsRight(snapshot.amendedNote) : null,
      /* Before release a party sees the counts and their own words, and is told so plainly. */
      showsEverybody: released || viewerIsLead,
    };
  }

  /** The rounds, through the same last read as every other report read. */
  async rounds(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    await this.refuseSomeoneNotYetLetIn(requestingUserId, groundId);
    const served = await this.roundsAsBuilt(groundId, requestingUserId, requestingUserOrgId);
    return this.whatTheLeadHasNotShared(groundId, requestingUserId, requestingUserOrgId, served);
  }

  private async roundsAsBuilt(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        organizationId: true,
        initiatorId: true,
        scenario: true,
        createdByUserId: true,
        report: { select: { releasedAt: true, releasedSessions: true } },
        participants: { select: { userId: true, email: true } },
      },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const isInitiator = ground.initiatorId === requestingUserId;
    const isParty = ground.participants.some((p) => p.userId === requestingUserId);
    /* Somebody who reads only what is released reads only the rounds that have been (decision 76, item 4). */
    const onlyReleased = isParty && !isInitiator;
    const isOrgAdmin = !isInitiator && !isParty && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground, groundId));
    /* NotFound, not Forbidden, for the reason in `sessionReport` above: a 403 confirms the
       check-in exists. This endpoint has had the leak since it was written. GW-PRI-04. */
    if (!isParty && !isInitiator && !isOrgAdmin) throw new NotFoundException('That report could not be found, so go back to the check-in and open it from there.');

    /* Nothing has been revealed yet, so there is nothing anybody may read. */
    if (!ground.report?.releasedAt) return { rounds: [] };

    const kept = (await this.prisma.reportRound.findMany({
      where: { groundId },
      orderBy: { sessionNumber: 'asc' },
      select: {
        sessionNumber: true,
        sharedPicture: true,
        agreements: true,
        divergences: true,
        centralQuestion: true,
        takenAt: true,
        amendedAt: true,
        amendedNote: true,
      },
    })).filter((round: any) => !onlyReleased || isThisSessionReleased(ground.report as any, round.sessionNumber));

    /*
     * Named, not spread. The same rule the rest of this API follows, and the reason is the same:
     * a column added to this table later must not appear in somebody's report by accident.
     *
     * `moved` is the same rounds read as a sequence - what each one led with, when it was taken,
     * how many accounts differed. No score and no direction: whether that is improvement is the
     * reader's judgement, and an arrow here would be a rating.
     */
    /*
     * THE SAME RULES THE REPORT ITSELF GETS. This returns stored report text straight from the
     * column, and for a while it was the last place on the page still saying "Both parties agree"
     * while the report tab beside it said "Both agree". Four endpoints serve this text and only the
     * report's own read had the rule; this is one of the three that did not.
     */
    const cleaned = kept.map((round: any) => ({
      ...round,
      sharedPicture: typeof round.sharedPicture === 'string' ? notTheWordParty(round.sharedPicture) : round.sharedPicture,
    }));
    /* The table calls it sessionNumber and the sequence reads `round`: without this every movement
       came back with no session number, and the page printed "At the end of session undefined"
       (request 59). */
    const moved = howThisHasMoved(cleaned.map((r: any) => ({ ...r, round: r.sessionNumber }))).map((m: any) => ({
      ...m,
      says: typeof m.says === 'string' ? notTheWordParty(m.says) : m.says,
    }));
    /*
     * WHAT EACH ROUND LED WITH, AS THAT ROUND'S PICTURE SAID IT, FOR EVERY READER. Screens request 66.
     *
     * `moved[].says` went through the assistant's wording pass, which speaks to one person as "you".
     * The line it was given is the opening of a picture written once for several readers, in labels,
     * so it came back addressed to whoever the model took the reader to be - "You have received
     * answers from all three people." - and was served to everybody, so Amani and Juma read a
     * sentence about what the lead had received. It is now the round's own opening sentence, the one
     * every reader of this check-in already reads in `rounds[].sharedPicture`, and its labels are
     * turned into a name, or into "you", for each reader on the way out (whatTheLeadHasNotShared).
     */
    return { rounds: cleaned, moved };
  }

  /**
   * THE AGREED THINGS, WHAT IS BLOCKING THEM, AND WHAT THE RECORD SHOWS ABOUT WHY.
   *
   * Facts, assembled from rows somebody wrote, for the synthesis to use. Nothing here is a
   * judgement: a blocker exists because the person waiting described it in their own account, a
   * date exists because somebody named one, and the explanation is decided by `whyNot` from those
   * two and nothing else.
   *
   * Labelled, never named. The same labels the rest of the synthesis uses, so this cannot become
   * the one place a name reaches a stored report.
   */

  /**
   * WHAT BACKS EACH THING THE RECORD HOLDS, AS THREE FACTS PER CLAIM.
   *
   * The claims are the objectives, because those are the things a report is read to find out about.
   * The three sources are deliberately narrow and each is a row that exists or does not:
   *
   *   another account - somebody ELSE recorded something of their own about this work;
   *   document - the claim is anchored to something attached rather than remembered;
   *   record - a system's own record of something that happened, above plain say-so.
   *
   * How much detail somebody gave and how many sessions they did are not here. They describe the
   * telling rather than the thing told, and counting them as corroboration is the exact mistake
   * this is built to stop.
   */
  private async whatBacksEachClaim(groundId: string): Promise<AClaim[]> {
    const objectives = await this.prisma.personObjective.findMany({
      where: { groundId },
      select: { id: true, text: true, participantId: true },
    });
    if (!objectives.length) return [];

    const [anchored, deliveries, records] = await Promise.all([
      /* Entries anchored to a document rather than recalled - the model already records which. */
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participant: { groundId }, recallBased: false },
        select: { participantId: true },
      }),
      /* Somebody's recorded progress against a specific objective, with evidence named. */
      this.prisma.delivery.findMany({
        where: { groundId, NOT: { objectiveId: null } },
        select: { objectiveId: true, participantId: true, evidence: true },
      }),
      /* Everybody's own entries, so "somebody else said something too" can be answered per party. */
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participant: { groundId } },
        select: { participantId: true },
      }),
    ]);

    const anchoredBy = new Set(anchored.map((a) => a.participantId));
    const spokeAtAll = new Set(records.map((r) => r.participantId));

    return objectives.map((o) => {
      const theirs = deliveries.filter((d) => d.objectiveId === o.id);
      return {
        what: o.text,
        /* Somebody OTHER than whoever owns this objective has given an account of their own. */
        anotherAccount: [...spokeAtAll].some((pid) => pid !== o.participantId),
        document: anchoredBy.has(o.participantId),
        /* Progress recorded against this objective by anybody, with evidence named for it. */
        record: theirs.some((d) => !!d.evidence?.trim()),
      };
    });
  }

  private async whatTheRecordShows(groundId: string, labelById: Map<string, string>): Promise<string> {
    const [objectives, blockers, deliveries, saidWhy] = await Promise.all([
      this.prisma.personObjective.findMany({
        where: { groundId },
        select: {
          participantId: true, text: true, dueDate: true, dueSaid: true, status: true,
          seenBySubject: true, awareness: true, kind: true,
        },
      }),
      this.prisma.groundDependency.findMany({
        where: { groundId, status: 'WAITING' },
        select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, escalatedAt: true, triedSaid: true, blockerKind: true },
      }).then((rows) => rows.filter((d) => !aWaitOnOneself(d))),
      this.prisma.delivery.findMany({ where: { groundId }, select: { participantId: true, objectiveId: true, text: true } }),
      /*
       * WHAT THEY SAID ABOUT WHY, AS A CLASSIFICATION AND NEVER AS WORDS.
       *
       * This read the transcript at first, and a guard on a promise the marketing site makes -
       * "it never shows anyone's raw answers" - stopped it. The promise is a bright line: the
       * shared report may not touch the transcript at all, not even to derive something safe from
       * it, because a line that has to be argued about each time is not a line.
       *
       * So the deciding happens once, in the conversation, where the person's words already live,
       * and what crosses into a shared surface is SKILL or CONFIDENCE and nothing else. The check-in
       * belongs to exactly one participant, so this cannot become one person's words explaining
       * another.
       */
      this.prisma.checkIn.findMany({
        where: { groundId, saidWhy: { not: null } },
        select: { participantId: true, saidWhy: true },
      }),
    ]);
    if (!objectives.length && !blockers.length) return '';

    const now = new Date();
    const lines: string[] = [];

    const saidWhyByParticipant = new Map(saidWhy.map((c) => [c.participantId, c.saidWhy!]));

    for (const o of objectives) {
      const who = labelById.get(o.participantId) ?? 'a party';
      const mine = blockers.filter((b) => b.fromParticipantId === o.participantId);
      const why = whyNot(
        {
          text: o.text,
          dueDate: o.dueDate,
          status: o.status,
          seenBySubject: o.seenBySubject,
          awareness: o.awareness,
          openBlockers: mine.map((b) => ({
            what: b.what,
            onName: b.onParticipantId ? (labelById.get(b.onParticipantId) ?? null) : (b.onLabel ?? null),
            escalated: itWasTakenFurther(b),
          })),
          progress: deliveries.filter((d) => d.participantId === o.participantId).map((d) => ({ text: d.text })),
          saidWhy: saidWhyByParticipant.get(o.participantId) ?? null,
        },
        now,
      );
      const due = o.dueDate
        ? ` Due ${o.dueDate.toISOString().slice(0, 10)}${o.dueSaid ? ` (they said "${o.dueSaid}")` : ''}.`
        : o.dueSaid ? ` They said "${o.dueSaid}" for when, which is not a date.` : '';
      lines.push(`- ${who}: "${o.text}".${due} What the record shows: ${why.says}`);
    }

    /*
     * WHERE A SYSTEM AND A PERSON DISAGREE ABOUT THE SAME WORK.
     *
     * The most useful thing evidence produces, and the one a report is most likely to get wrong. A
     * salesperson's own account of a call sits beside a CRM that has no record of it, and neither
     * settles the other: the app fails, the phone is unconnected, the shop is logged twice.
     *
     * Both sides are stated and nothing is resolved. A discrepancy preserved is worth more than a
     * certainty invented, and the person reading this is in a position to ask - which the product
     * is not.
     */
    /* Read once. It was inlined inside the where clause and a second reader needed it too. */
    const orgId = (await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true } }))?.organizationId ?? '';

    const theirAccounts = await this.prisma.interaction.findMany({
      where: { organizationId: orgId, strength: 'SELF_REPORTED' as any },
      orderBy: { happenedAt: 'desc' },
      take: 20,
      select: { personExternalId: true, counterpartyExternalId: true, kind: true, happenedAt: true, note: true },
    }).catch(() => [] as any[]);

    if (theirAccounts.length) {
      lines.push('');
      lines.push('WHERE SOMEBODY\'S OWN ACCOUNT IS THE ONLY RECORD:');
      for (const t of theirAccounts.slice(0, 8)) {
        lines.push(
          `- A ${String(t.kind).toLowerCase()} on ${t.happenedAt.toISOString().slice(0, 10)}, `
          + `described in a check-in and not in any connected system.${t.note ? ` They said: "${t.note}".` : ''} `
          + 'That is their account, and a missing record is not evidence it did not happen.',
        );
      }
    }

    /*
     * HOW FAR TECHNICAL WORK HAS ACTUALLY GOT, WHICH IS NOT WHAT ANYBODY CALLS IT.
     *
     * "Shipped" is one word for eight states, and a leader who cannot read the code has no way to
     * tell which one they were told. This states the furthest state anything is evidenced at and -
     * the part that does the work - which states nothing here can see at all.
     *
     * ORGANISATION-WIDE, LIKE THE ACCOUNTS ABOVE IT. A merge record is pushed against the company,
     * not against one check-in, and the same read that already brings somebody's own account of a
     * call brings these.
     */
    const technical = await this.prisma.interaction.findMany({
      where: {
        organizationId: orgId,
        kind: { in: ['MERGE', 'TEST_RUN', 'DEPLOY', 'RELEASE'] as any },
      },
      orderBy: { happenedAt: 'desc' },
      take: 40,
      select: { kind: true },
    }).catch(() => [] as any[]);

    if (technical.length) {
      const reach = whatTheRecordsReach(technical.map((t) => String(t.kind)));
      lines.push('');
      lines.push('HOW FAR THE TECHNICAL RECORDS REACH:');
      for (const said of reach.says) lines.push(`- ${said}`);
    }

    /*
     * NUMBERS FROM THEIR OWN PRODUCT, WHICH NOBODY IN THE ROOM WROTE.
     *
     * Every other line above this is somebody's account: what a person said, what a colleague said,
     * what a system logged about an event somebody caused. A crash rate is none of those, and it is
     * the only thing here that can sit beside "the product is stable" without being another
     * opinion about it.
     *
     * MOST RECENT FIRST AND A HANDFUL ONLY. A wall of numbers in a report about a person reads as a
     * case against them however innocent each one is, and the sentences under them are what keep
     * this evidence rather than an ambush.
     */
    const metrics = await this.prisma.productMetric.findMany({
      where: { organizationId: orgId },
      orderBy: { asOf: 'desc' },
      take: 6,
      select: { key: true, says: true, value: true, unit: true, asOf: true, sourceSystem: true },
    }).catch(() => [] as any[]);

    if (metrics.length) {
      lines.push('');
      lines.push('NUMBERS FROM THEIR OWN SYSTEMS:');
      for (const m of metrics) lines.push(`- ${howItReads(m as any)}`);
      for (const said of WHAT_A_NUMBER_IS_NOT) lines.push(`- ${said}`);
    }

    /* Blockers nobody has an objective for still matter - somebody is still waiting. */
    for (const b of blockers) {
      const from = labelById.get(b.fromParticipantId) ?? 'a party';
      const on = b.onParticipantId ? (labelById.get(b.onParticipantId) ?? 'somebody') : (b.onLabel ?? 'somebody outside this check-in');
      /*
       * WHAT KIND OF THING IS IN THE WAY, WHERE THE PERSON WAITING SAID. Six situations read
       * identically as "one person waiting on another", and they need different people in the
       * room - so the argument was being settled by whoever described it best.
       */
      lines.push(`- ${from}: ${howToSayIt(b.blockerKind as any, b.what, on)}${itWasTakenFurther(b) ? ' Already raised.' : ''}`);
    }

    return `WHAT IS ON THE RECORD, AND WHAT IT SHOWS.
These are rows somebody wrote, not conclusions. Each blocker exists because the person waiting
described it in their own account of their own work - never because anybody reported anybody else.

${lines.join('\n')}

USING THIS.
You may state what is written above. Do not invent a different explanation for something being
behind: told nothing, blocked, not knowing how, putting it off, not acted on, and too early are the
only six, and where the line says the record cannot tell, say that rather than choosing one.
The two about the person themselves are only ever there because THEY said so, in their own words,
not from anything you inferred. Their actual sentence is deliberately NOT given to you and you must
not guess at it or invent one - somebody not knowing how is a thing to show them, and somebody
putting a thing off is a conversation about what makes it hard.
A blocker is a reason, not an excuse, and neither is it a complaint about the person it names.
${NEVER_CONCLUDE_ABOUT_SHIPPING}
${NEVER_CONCLUDE_FROM_A_NUMBER}
${NEVER_CONCLUDE_FROM_A_KIND}
Never write that somebody failed, underperformed, or is not capable. Say what was agreed, what
happened, and what is in the way.`;
  }

  private async keepThisRound(groundId: string, now: RoundPicture): Promise<void> {
    const sessions = await this.prisma.checkIn.findMany({
      where: { participant: { groundId } },
      select: { sessionNumber: true },
      distinct: ['sessionNumber'],
      orderBy: { sessionNumber: 'desc' },
    });

    let round: number | null = null;
    for (const s of sessions) {
      if (await this.grounds.isSessionReadyForReport(groundId, s.sessionNumber)) {
        round = s.sessionNumber;
        break;
      }
    }
    if (round === null) return;

    const kept = await this.prisma.reportRound.findUnique({
      where: { groundId_sessionNumber: { groundId, sessionNumber: round } },
    });
    const answer = decide(now, kept as any);
    if (!answer.keep) return;

    if (answer.as === 'new') {
      await this.prisma.reportRound.create({
        data: { groundId, sessionNumber: round, ...(now as any), takenAt: new Date() },
      });
      return;
    }

    await this.prisma.reportRound.update({
      where: { groundId_sessionNumber: { groundId, sessionNumber: round } },
      data: { ...(now as any), amendedAt: new Date(), amendedNote: answer.note },
    });
  }

  /**
   * Extract preference signals from the initiator's check-in records and upsert
   * into their AdminProfile. Called fire-and-forget after each synthesis.
   */
  /**
   * THE JUDGEMENT OVER EVERY ANSWER TO ONE BRIEF.
   *
   * Three parts in one order, because the order is what makes it defensible rather than confident.
   * The counts and each field's standing are arithmetic over the fitted answers. The judgement is
   * the only part a model writes and it is given nothing but the table - every sentence has to carry
   * a number that is in it, which is checked rather than requested, because you cannot be abstract
   * about twenty-nine out of thirty-four.
   *
   * IT NEEDS A FRAME AND IT NEEDS ROWS. A check-in whose brief was too short to specify anything
   * gets no frame, and one where nobody has finished yet has no rows - both return nothing, and the
   * report is exactly what it was before. See the-judgement-over-the-answers.
   */
  /**
   * THE LONGITUDINAL READ, FROM ROWS.
   *
   * Nothing here asks a model anything. Every model in this file can be having a bad day and this
   * section still says the same true thing, which is the point of it: the three sections that came
   * back empty on a live engagement were the three that depended on a model routing into them.
   */
  private async readTheRecordOverTime(
    groundId: string,
    parties: { id: string; roleAsDescribed: string | null; managingOnly: boolean; remitAsGiven?: string | null }[],
    labelById: Map<string, string>,
  ): Promise<WhatTheRecordShowsOverTime | null> {
    const labelOf = (id: string | null) => (id ? labelById.get(id) ?? 'a party' : 'nobody named');

    const [commitmentRows, dependencyRows, patternRows, checkIns, documents, entries] = await Promise.all([
      (this.prisma.groundCommitment?.findMany?.({
        where: { groundId },
        orderBy: { createdAt: 'asc' },
        select: {
          participantId: true, text: true, whenSaid: true, explicit: true, status: true, source: true,
          statedInSession: true, saidAgainIn: true, settledBy: true,
          saidWordForWord: true, whenSaidWordForWord: true,
        },
      }) ?? Promise.resolve([])).catch(() => [] as any[]),
      (this.prisma.groundDependency?.findMany?.({
        where: { groundId },
        orderBy: { createdAt: 'asc' },
        select: { what: true, fromParticipantId: true, onParticipantId: true, onLabel: true, status: true, escalatedAt: true, triedSaid: true, createdAt: true },
      }) ?? Promise.resolve([])).catch(() => [] as any[]),
      (this.prisma.patternDetection?.findMany?.({
        where: { groundId },
        select: { participantId: true, code: true, observationText: true, seenInSessions: true, periodsObserved: true, lastPeriodNumber: true, status: true },
      }) ?? Promise.resolve([])).catch(() => [] as any[]),
      (this.prisma.checkIn?.findMany?.({
        where: { groundId, status: CheckInStatus.COMPLETED },
        select: { participantId: true, sessionNumber: true },
      }) ?? Promise.resolve([])).catch(() => [] as any[]),
      (this.prisma.groundDocument?.count?.({ where: { groundId } }) ?? Promise.resolve(0)).catch(() => 0),
      (this.prisma.recordEntry?.findMany?.({
        where: { participant: { groundId }, disputedAt: null },
        select: { participantId: true, verifiability: true, anchoredDocumentId: true, text: true },
      }) ?? Promise.resolve([])).catch(() => [] as any[]),
    ]);

    const sessionsSoFar = Math.max(0, ...(checkIns as any[]).map((c) => c.sessionNumber ?? 0));
    if (!sessionsSoFar) return null;

    /* A dependency has no session of its own, so it takes the session its person was in when it landed. */
    const firstSessionOf = new Map<string, number>();
    for (const c of (checkIns as any[]).slice().sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))) {
      if (!firstSessionOf.has(c.participantId)) firstSessionOf.set(c.participantId, c.sessionNumber ?? 1);
    }

    /*
     * DID ANYBODY EVER SAY WHO ARRANGED ANYTHING? Read from the words themselves by the
     * conversation's own detector, not inferred from how checkable a line is - see
     * who-secured-that-meeting. Two different questions, and the first version asked the wrong one.
     */
    const saidWhoArranged = !nobodyHasSaidWhoArrangedAnything(
      (entries as any[]).map((e) => ({ text: String(e.text ?? ''), session: 1 })),
    );

    const commitments = commitmentsOverTime(commitmentRows as any[], labelOf, sessionsSoFar);
    const dependencies = dependenciesOverTime(
      (dependencyRows as any[]).map((d) => ({ ...d, statedInSession: firstSessionOf.get(d.fromParticipantId) ?? null })),
      labelOf,
      sessionsSoFar,
    );
    const patterns = patternsOverTime(patternRows as any[], (code) => nameOfPattern(code), labelOf, sessionsSoFar);

    const gaps = gapsOverTime(parties.filter((p) => !p.managingOnly).map((p) => {
      const theirs = (entries as any[]).filter((e) => e.participantId === p.id);
      return {
        participantId: p.id,
        label: labelOf(p.id),
        /*
         * THE REMIT FIRST, THE TITLE ONLY IF THAT IS ALL THERE IS.
         *
         * `note` is what the lead wrote when they added the person - what they are accountable for -
         * and `roleAsDescribed` is a job title. Reading the title as the remit produced "Government
         * Liaison Consultant was taken on for: Government Liaison Consultant".
         */
        expected: ((p as any).remitAsGiven ?? '').trim() || (p.roleAsDescribed ?? '').trim(),
        lines: theirs.length,
        checkable: theirs.filter((e) => e.verifiability === 'HIGH' || !!e.anchoredDocumentId).length,
        documented: theirs.filter((e) => !!e.anchoredDocumentId).length,
        openCommitments: commitments.filter((c) => c.participantId === p.id && String(c.status).toUpperCase() === 'UNKNOWN').length,
        owedToOthers: dependencies.filter((d) => d.onParticipantId === p.id).length,
        sessions: (checkIns as any[]).filter((c) => c.participantId === p.id).length,
      };
    }));

    /* Still open: their own words for what is in the way, and the promises nobody closed. */
    const stillOpen = [
      ...dependencies.map((d) => d.say),
      ...theOnesStillOpen(commitments).slice(0, 10).map((c) => c.say),
    ];

    /* Somebody an admin has not let in yet cannot answer, so nobody counts them as missing (decision 77, request 121 part 5). */
    const heldBack = await Promise.resolve((this.prisma.groundParticipant as any)?.findMany?.({
      where: { groundId }, select: { id: true, userId: true, user: { select: { awaitingOrgApproval: true } } },
    })).then((rows: any[]) => whoIsNotLetInYet(this.prisma, rows ?? [])).catch(() => new Map<string, unknown>());
    const answeredIds = new Set((checkIns as any[]).map((c) => c.participantId));
    const answered = answeredIds.size;
    const cannotTellYou = whatThisCannotTellYou({
      documentsAttached: Number(documents ?? 0),
      peopleWhoAnswered: answered,
      peopleInvited: parties.filter((p) => !p.managingOnly && (!heldBack.has(p.id) || answeredIds.has(p.id))).length,
      /*
       * WHETHER ANYBODY ACTUALLY SAID WHO ARRANGED ANYTHING, read from the words.
       *
       * The first version of this used HIGH verifiability as a proxy, which is not the same
       * question at all - a specific sentence about an email is HIGH and says nothing about who
       * secured a meeting. The conversation's own detector answers it exactly.
       */
      anybodyAskedWhoArrangedThings: saidWhoArranged,
      meetingsOnRecord: aMeetingIsOnRecord(entries as any[]),
    });

    const settleFirst = toSettleFirst({
      commitments, dependencies, patterns,
      documentsAttached: Number(documents ?? 0),
      anybodySaidWhoArrangedThings: saidWhoArranged,
      meetingsOnRecord: aMeetingIsOnRecord(entries as any[]),
    });

    return theRecordOverTime({
      sessions: sessionsSoFar, commitments, dependencies, patterns, gaps, stillOpen, cannotTellYou,
      toSettleFirst: settleFirst,
    });
  }

  private async judgeTheAnswers(
    groundId: string,
    room?: {
      /* `facts` is what the record holds about them, so praise can be checked against their numbers. */
      people: { who: string; isLead: boolean; role: string | null; finding: string | null; participantId: string; facts?: PersonFacts | null }[];
      leadName: string | null;
      /* Each person's label and name, so their own words reach the judgement with labels in them too. */
      namesInThisCheckIn?: ALabelAndAName[];
      differences: { topic: string; positions: { who: string; view: string }[] }[];
    },
  ): Promise<{ judgement: any; table: string } | null> {
    /*
     * READ OFF THE GROUND RATHER THAN ASKED FOR, and that is deliberate. The conversation derives
     * the frame on the first turn and keeps it there; going through the conversation service to get
     * it would point reports at conversation while conversation already points at this module's
     * fitting prompt, and a cycle between the two is not worth one property access.
     */
    const frame = await this.prisma.ground
      .findUnique({ where: { id: groundId }, select: { whatACompleteAnswerHolds: true } })
      .then((g) => (((g as any)?.whatACompleteAnswerHolds ?? []) as AField[]))
      .catch(() => [] as AField[]);

    /*
     * A ROOM IS JUDGED WITHOUT A FRAME, BECAUSE A ROOM READ NEVER USED ONE.
     *
     * This used to return here on an empty frame, for every check-in. But the frame and the
     * counted table are the POPULATION path: below the counting floor the material handed to the
     * model is `theRoom(people, differences, sessions)`, built from who is in the check-in and
     * what they disagree about, and it does not touch either. So the guard was throwing away a
     * judgement that would not have used the thing being guarded.
     *
     * What that cost: eight of the twenty-four reports had no judgement at all, and they were
     * exactly the eight whose brief fell under the forty-word floor upstream. The floor is gone
     * now (see `theFrameFor`), and this is the second half of the same fix - so that a frame that
     * comes back thin for any other reason cannot silently take the judgement with it.
     */
    const asARoom = !!room?.people?.length && thisIsARoom(room.people.length);
    if (!asARoom && (!Array.isArray(frame) || !frame.length)) return null;

    const rows = await this.prisma.checkIn.findMany({
      /*
       * `DbNull`, NOT `null`, AND THE DIFFERENCE IS THE WHOLE QUERY.
       *
       * On a Json column Prisma reads `equals: null` as the JSON value null, not as an absent
       * column. This one is never written until an answer is fitted, so every unfitted row is a SQL
       * NULL and `NOT { equals: null }` matched none of them - the judgement would have found zero
       * answers on a ground with a hundred and five of them and quietly written nothing. Measured
       * against the real run: 0 rows with the wrong filter, 105 with this one.
       *
       * The same idiom appears on `holds` elsewhere and happens to work there, because that column
       * IS written as JSON null when a document has nothing read out of it. Left alone rather than
       * churned, and noted here so the next person knows which of the two they are looking at.
       */
      where: { groundId, status: CheckInStatus.COMPLETED, NOT: { theirAnswerFitted: { equals: Prisma.DbNull } } },
      select: { sessionNumber: true, theirAnswerFitted: true, participant: { select: { specificityHistory: true, recordEntries: { select: { verifiability: true, anchoredDocumentId: true } } } } },
    }).catch(() => [] as any[]);
    const perSession: AnAnswerInItsSession[] = rows.map((r: any) => {
      const fit = r.theirAnswerFitted ?? {};
      const history: number[] = (r.participant?.specificityHistory as number[]) ?? [];
      return {
        ...fit,
        sessionNumber: r.sessionNumber ?? 0,
        /*
         * WHAT THE CONVERSATION MEASURED, JOINED ON HERE RATHER THAN AT THE FIT.
         *
         * Both of these are facts about the person's participation rather than about their answer,
         * they change after the fit is written, and they are what the lead asked to see: "he can not
         * see in clear terms if the team gave evidence", "he can not see clearly people who provided
         * specifics versus not".
         */
        specificity: history.length ? Math.round((history.reduce((a, b) => a + b, 0) / history.length) * 100) / 100 : null,
        gaveEvidence: (r.participant?.recordEntries ?? []).some((e: any) => e.verifiability === 'HIGH' || !!e.anchoredDocumentId),
      } as AFittedAnswer;
    }).filter((a) => Array.isArray((a as any).values)) as AnAnswerInItsSession[];

    /*
     * ONE ROW PER PERSON, NOT PER CHECK-IN. Six fortnights by two people is twelve rows here and
     * two people in the world, and the arithmetic below cannot tell the difference - see
     * one-person-is-one-answer.ts for what that produced in front of a customer.
     */
    const answers = onePerPerson(perSession);
    /* Same reason as the frame above: a room is read from its people, not from fitted answers. */
    if (!asARoom && !answers.length) return null;

    const canCount = Array.isArray(frame) && frame.length > 0 && answers.length > 0;
    const reads = canCount ? whatTheNumbersSay(frame, answers) : [];
    const assessments = reads.map(howGoodIsThis);
    const table = canCount ? theTable(reads, assessments, howManyPeople(answers)) : '';

    /*
     * A ROOM IS NOT A POPULATION. Below the counting floor the table is every field marked THIN and
     * the judgement writes recommendations off proportions of four. The room read is written from
     * the people instead. Same schema out, so nothing downstream knows which one ran.
     */
    let material = table;
    let instruction = theJudgementInstruction(
      'whoever called this check-in',
      'what to do next about the people and the work it covers',
    );
    if (asARoom) {
      const open = await (this.prisma.groundCommitment?.findMany?.({
        where: { groundId, status: 'UNKNOWN' },
        select: { text: true, participantId: true, whenSaid: true, whenSaidWordForWord: true },
      }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
      /* Only what the lead may already read, in plain words: see patterns/who-reads-a-pattern. None, and no read, while patterns are not served. */
      const seen = PATTERNS_ARE_SERVED
        ? servedPatterns(await (this.prisma.patternDetection?.findMany?.({
          where: { groundId },
          select: PATTERN_ROW_SELECT,
        }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]) as any, { participantId: null, runsIt: true })
        : [];
      const sessions = Math.max(0, ...rows.map((r: any) => r.sessionNumber ?? 0));
      /*
       * AND WHAT MORE THAN ONE PERSON'S RECORD NAMES, WHICH NOBODY IN THE CHECK-IN CAN SEE.
       *
       * The judgement is built from one written paragraph per person, so a thing two people both
       * named only reaches it if it survived into both paragraphs - and on the workplan scenario
       * it survived into one. The plan came to 141% of the budget because two leads had both
       * costed the same design contractor for the same eight weeks, and the judgement reported
       * the two totals and asked for one supplier's cost: circling it, because the fact was not
       * in front of it.
       *
       * Counted off the records rather than written: see what-more-than-one-person-named.ts.
       */
      const theirWords = (t: string) => aNameInTheirWordsIsTheLabel(t, room!.namesInThisCheckIn ?? []);
      const perPersonTexts = await this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participant: { groundId } },
        select: { text: true, participantId: true },
      }).catch(() => [] as any[]);
      const shared = whatMoreThanOnePersonNamed(
        room!.people.map((p) => ({
          who: p.who,
          /* Their words with every name in this check-in already a label, the same as the corpus. This
             read comes straight off the table, so without it "Nadia" reached the judgement as a
             stranger here too - and was even counted as something two people named. */
          texts: (perPersonTexts as any[]).filter((r) => r.participantId === p.participantId).map((r) => theirWords(String(r.text ?? ''))),
        })),
        room!.people.map((p) => p.who),
      );
      if (shared.length) this.logger.log(`The judgement on ${groundId} was given ${shared.length} thing(s) named by more than one person: ${shared.map((x) => x.name).join(', ')}.`);
      material = theRoom(
        room!.people.map((p) => ({
          who: p.who,
          isLead: p.isLead,
          role: p.role,
          /* A name in it is a label too, so the lead named in somebody's finding is not read as a
             stranger and then written about in the third person to the lead (the 1 October review). */
          finding: p.finding ? theirWords(p.finding) : p.finding,
          /*
           * AND THE SAME EXCLUSION THE SYNTHESIS CORPUS HAS, WHICH THIS PATH NEVER GOT.
           *
           * `ALIGNMENT_FEED_ONLY_CODES` - F5, E4, LOW_SPEC_MULTI_DIM, COLLUSION_RISK - are
           * documented as never to be named to either person directly, and they are filtered out
           * of the report corpus, the board's alignment feed and the live conversation for that
           * reason. This material was the one route with no filter on it, and the judgement built
           * from it is read by the lead: a cofounder ground handed it "[E4 Founder Burden
           * Imbalance]: absorbs operational load relative to the other founder" and "[F5 Cofounder
           * Burden Asymmetry]: operational absorption", about the other founder, to the founder.
           *
           * Found on 26 September by the pattern-wiring tripwire, which went red when the room
           * judgement started running on grounds that used to return early. It was true on every
           * ground that already had a frame; the change only made it visible.
           */
          /* None while patterns are not served: the lead reads the judgement on the board, and the
             model wrote the names it was given into it. See patterns/patterns-are-served. */
          patterns: seen
            .filter((x) => x.participantId === p.participantId && !!x.whatHappened)
            .map((x) => ({ name: x.heading, observation: x.whatHappened as string, seenInSessions: x.sessions })),
          /* As an action with its time where it can be said that way (request 134 item 4), else their words as before. */
          openCommitments: (open as any[]).filter((c) => c.participantId === p.participantId).map((c) => {
            const clause = inOurVoice(String(c.text ?? ''), 'them');
            const when = typeof c.whenSaid === 'string' && c.whenSaid.trim() && (c.whenSaidWordForWord === true || looksLikeATimeOrADate(c.whenSaid)) ? c.whenSaid.trim() : null;
            return clause ? { clause: theirWords(clause), when } : theirWords(String(c.text));
          }),
        })),
        room!.differences.map((d) => ({
          topic: theirWords(d.topic),
          positions: d.positions.map((x) => ({ who: x.who, view: theirWords(x.view) })),
        })),
        sessions,
        namedByMoreThanOne(shared),
      );
      instruction = theJudgementOverARoom(
        'whoever called this check-in',
        'what to do next about the people and the work it covers',
        room!.leadName,
      );
      this.logger.log(`The judgement on ${groundId} is a room read: ${room!.people.length} people, ${sessions} session(s).`);
    }

    /*
     * THE STORED VERSION WINS WHERE ONE IS ACTIVE, AND ITS ID IS KEPT WITH THE JUDGEMENT. The code text above is the
     * fallback; a version stored under the judgement's own key replaces it, filled the same way. See the keys in
     * the-judgement-over-the-answers.ts.
     */
    const theKey = asARoom ? THE_JUDGEMENT_ROOM_KEY : THE_JUDGEMENT_POPULATION_KEY;
    const stored = await (this.prompts?.getActive?.(theKey) ?? Promise.resolve(null)).catch(() => null);
    if (stored?.content) {
      instruction = fillTheJudgement(stored.content, {
        whoIsReading: 'whoever called this check-in',
        whatTheyAreDeciding: 'what to do next about the people and the work it covers',
        leadName: asARoom ? room!.leadName : null,
      });
    }

    const judgement = await this.anthropic.extract<any>(
      instruction,
      [{ role: 'user', content: material }],
      /* Same field names, asking for a person where the other asks for a count - the room's
         whatToDo came back empty against the population schema. See THE_ROOM_JUDGEMENT_SCHEMA. */
      (asARoom ? THE_ROOM_JUDGEMENT_SCHEMA : THE_JUDGEMENT_SCHEMA) as any,
      { patient: true },
    ).catch((err: any) => {
      this.logger.warn(`The judgement on ${groundId} did not read: ${err?.message}`);
      return null;
    });
    if (!judgement) return null;

    /*
     * AND IT IS HELD TO ITS ONE RULE RATHER THAN TRUSTED WITH IT.
     *
     * The prompt says it in the strongest terms available and that has never been enough - the
     * report promise, the filler sentence and the goodbye each arrived anyway. A finding carrying no
     * count is dropped rather than softened: the reader has already said what an ungrounded sentence
     * is worth to him.
     *
     * BUT THE RULE IS THE POPULATION'S, AND A ROOM'S RULE IS ITS OPPOSITE.
     *
     * The nine-borrower cohort logged "7 finding(s) carried no number and were dropped" and its
     * `whatToDo` came back empty twice running. Of course it did: the room instruction says every
     * sentence must name a PERSON and never a proportion, and this filter then deleted every
     * sentence that had a person in it and no digits. The only lines that survived were the two
     * that happened to quote a weekly figure. The guard was doing exactly what it was built to do,
     * to output built under the opposite instruction.
     *
     * A room's finding is grounded in a NAMED PERSON rather than in a count, and that is the thing
     * checked here instead - so an ungrounded sentence is still dropped, by the standard the
     * sentence was actually written to.
     */
    /*
     * AND IT MATCHES HOW A PERSON IS ACTUALLY REFERRED TO, NOT THE WHOLE LABEL.
     *
     * The first version required the sentence to contain the label in full. Labels on a roster
     * ground are long - "Relationship officer, Ikeja. Target 14 approved facilities this quarter." -
     * and the model writes "the Ikeja officer", so four findings that named people perfectly well
     * were dropped for naming them the way a person would. A word that belongs to ONE person's
     * label and to nobody else's is that person: "Ikeja" is, "officer" is not.
     */
    const generic = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'their', 'they', 'target',
      'quarter', 'month', 'year', 'week', 'total', 'team', 'initiator', 'party', 'participant', 'borrower',
      'officer', 'relationship', 'manager', 'lead', 'director', 'approved', 'facilities', 'loan', 'machine']);
    const handlesOf = (who: string): string[] => (who ?? '').toLowerCase().match(/[a-z]{4,}/g)?.filter((w) => !generic.has(w)) ?? [];
    const theirOwnWords = new Map<string, string[]>();
    for (const p of room?.people ?? []) {
      const others = (room?.people ?? []).filter((x) => x.who !== p.who).flatMap((x) => handlesOf(x.who));
      theirOwnWords.set(p.who, handlesOf(p.who).filter((w) => !others.includes(w)));
    }
    const namesSomebody = (text: string | null | undefined): boolean => {
      const t = (text ?? '').toLowerCase().trim();
      if (!t) return false;
      for (const p of room?.people ?? []) {
        if (p.who && t.includes(p.who.toLowerCase())) return true;
        if ((theirOwnWords.get(p.who) ?? []).some((w) => t.includes(w))) return true;
      }
      return false;
    };
    const grounded = asARoom ? namesSomebody : everySentenceCarriesANumber;
    let kept = {
      ...judgement,
      whatTheNumbersSay: (judgement.whatTheNumbersSay ?? []).filter((x: any) => grounded(x?.says)),
      whatToDo: (judgement.whatToDo ?? []).filter((x: any) => grounded(x?.because) || grounded(x?.startWith) || grounded(x?.move))
        /* A move that tells the reader to do something is stored as the thing to do. The lead read
           "Tell you to get Chidi Eze and Sara Lindqvist in a room" (run-7). See a-move-is-the-thing-to-do. */
        .map((x: any) => (typeof x?.move === 'string' ? { ...x, move: aMoveForTheReader(x.move, THE_LEADS_LABEL) } : x)),
    };
    const dropped = (judgement.whatTheNumbersSay ?? []).length - kept.whatTheNumbersSay.length
      + (judgement.whatToDo ?? []).length - kept.whatToDo.length;
    const parables = talksLikeAPerson([kept.theGap, ...kept.whatTheNumbersSay.map((x: any) => x.says)].join(' '));
    if (dropped) this.logger.warn(`The judgement on ${groundId}: ${dropped} finding(s) ${asARoom ? 'named nobody' : 'carried no number'} and were dropped.`);
    /*
     * AND IT NEVER PRAISES A CLAIM THE RECORD'S OWN NUMBERS CONTRADICT.
     *
     * Run 8: "Recognise Kwame Mensah for exceeding their target of 14 approved facilities", because
     * "22 facilities were processed smoothly". His record says three approved and twenty-two
     * applications. Praise of what somebody reached is held back wherever no figure in their record,
     * in the target's own unit, reaches the target. Nothing is written in its place. See
     * praise-the-numbers-do-not-support.
     */
    const praise = praiseTheNumbersDoNotSupport(kept, (room?.people ?? []).map((p) => ({ who: p.who, role: p.role, facts: p.facts ?? null })));
    kept = praise.judgement;
    if (praise.heldBack.length) {
      this.logger.warn(`The judgement on ${groundId}: held back ${praise.heldBack.length} line(s) of praise the record's numbers do not support: ${praise.heldBack.map((x) => `"${x}"`).join(', ')}`);
    }
    if (parables.length) this.logger.warn(`The judgement on ${groundId} used ${parables.length} phrase(s) a person would not: ${parables.join(', ')}`);
    /*
     * AND A NUMBER IS ONE THE BLOCKS HOLD (request 135 item 3). In a room nothing checked a number, so "four different
     * activities in two locations" reached the lead about two crops in two places. A line with a number the material
     * does not hold is left out, as a line naming nobody is. See a-number-the-blocks-hold.
     */
    if (asARoom) {
      const numbers = onlyNumbersTheBlocksHold(kept, material);
      kept = numbers.judgement;
      if (numbers.leftOut.length) this.logger.warn(`The judgement on ${groundId}: left out ${numbers.leftOut.length} line(s) with a number no block holds: ${numbers.leftOut.map((x) => `"${x}"`).join(', ')}`);
    }
    this.logger.log(`Judged ${answers.length} answer(s) on ${groundId} over ${frame.length} fields.`);
    /* Which instruction wrote it: the stored version's id, or null where the code text ran. */
    return { judgement: { ...kept, promptVersionId: stored?.id ?? null }, table };
  }

  private async extractAndStoreLeadSignals(groundId: string, initiatorUserId: string): Promise<void> {
    const initiatorParticipant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, partyType: PartyType.INITIATOR },
      select: { id: true },
    });
    if (!initiatorParticipant) return;

    const entries = await this.prisma.recordEntry.findMany({
      where: { disputedAt: null, participantId: initiatorParticipant.id },
      select: { type: true, text: true },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    if (!entries.length) return;

    const corpus = entries.map(e => `(${e.type}) ${e.text.replace(/^\[VERIFIABILITY:\w+\] /, '')}`).join('\n');
    const extracted = await this.anthropic.extract<{ signals: string[] }>(
      SIGNAL_EXTRACTION_PROMPT,
      [{ role: 'user', content: corpus }],
      SIGNAL_EXTRACTION_SCHEMA,
    );
    if (!extracted?.signals?.length) return;

    // Merge with existing signals, dedup, cap at 10.
    const existing = await this.prisma.adminProfile.findUnique({ where: { userId: initiatorUserId }, select: { signals: true } });
    const existingSignals = Array.isArray(existing?.signals) ? (existing!.signals as string[]) : [];
    const merged = [...new Set([...existingSignals, ...extracted.signals])].slice(0, 10);

    await this.prisma.adminProfile.upsert({
      where: { userId: initiatorUserId },
      create: { userId: initiatorUserId, signals: merged },
      update: { signals: merged },
    });
  }

  /**
   * Release the report to BOTH parties at the same moment. releasedAt is set
   * once, atomically - neither party reads it before the other. (Part E:
   * "why the report goes to both parties simultaneously".)
   */
  async generateForAdmin(groundId: string, organizationId: string, adminUserId?: string) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, include: { participants: { select: { userId: true, email: true } } } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* A performance plan, a promotion or a renewal is not an admin's to touch without access (decision 5, request 78). */
    if (isEvaluationCheckIn(ground.scenario) && !runsOrSetItUp(adminUserId, ground)) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const completedCount = await this.prisma.checkIn.count({ where: { groundId, status: 'COMPLETED' } });
    if (completedCount === 0) {
      throw new BadRequestException('Nobody has finished a check-in yet, so there is no report to write. It can be written once at least one person has finished.');
    }

    await this.synthesize(groundId);
    return { groundId, generated: true };
  }

  /**
   * ONLY THE PERSON WHO RUNS THE CHECK-IN RELEASES ITS REPORT (request 57) - UNLESS THEY HAVE LEFT
   * (decision 53, 29 September 2026).
   *
   * The route was guarded by the admin role alone, so any admin of the organisation could share a
   * check-in's report while the lead's own Sessions tab told them "Sharing the report and ending
   * the check-in are Rukia's to decide". Hafsah's decision: the lead (`initiatorId`) decides, and
   * nobody else. There is no override for another admin; the automatic release the listener does
   * when a round closes goes through `release()` itself and is not a person pressing anything.
   *
   * DECISION 53 ADDS ONE EXCEPTION: if the lead's membership has ended - `User.isActive === false`,
   * the same flag `leaveOrg` and the admin's `remove` set (users.service.ts) - there is nobody left
   * who could ever press the button, and the report would sit released-never. Another admin may
   * share it in their place, and the report and its notification say who shared it and why. See
   * who-shared-it-because-the-lead-left.ts.
   */
  async releaseAsTheLead(groundId: string, userId: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, select: { initiatorId: true } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId === userId) return this.release(groundId, organizationId);

    const lead = await this.prisma.user.findUnique({
      where: { id: ground.initiatorId },
      select: { isActive: true, firstName: true, lastName: true },
    }).catch(() => null);
    /* Present, just not the one who pressed Release: still refused, exactly as request 57 decided. */
    if (!userId || !lead || lead.isActive) throw new ForbiddenException(ONLY_THE_LEAD_RELEASES);

    /* AND STILL ONLY AN ADMIN OF THIS ORGANISATION. The route is already gated on the admin role
       (`@Roles(Role.ADMIN)`), but that gate lives on the HTTP layer; checked again here so this
       method refuses on its own, the same defence-in-depth `isAnAdminOf` gives every other read. */
    const sharingAdmin = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, role: true, organizationId: true },
    }).catch(() => null);
    if (!adminsTheOrg(sharingAdmin, organizationId)) throw new ForbiddenException(ONLY_THE_LEAD_RELEASES);

    const byName = fullNameOf(sharingAdmin, 'An admin');
    const leadName = fullNameOf(lead, 'The person who ran this check-in');
    return this.release(groundId, organizationId, {
      byUserId: userId,
      byName,
      leadName,
      sentence: whoSharedItBecauseTheLeadLeft(byName, leadName),
    });
  }

  async release(groundId: string, organizationId: string, sharedBecauseLeadLeft?: Omit<SharedBecauseLeadLeft, 'at'>) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      include: { participants: { include: { user: { select: { passwordHash: true } } } }, report: true },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (!ground.report) throw new NotFoundException('This report is not written yet, so check again once everyone has answered.');
    /*
     * EACH SESSION'S PICTURE IS RELEASED ON ITS OWN (decision 76, item 4). This returned early once
     * `releasedAt` was set, so the first release shared every later session too: a participant read
     * the report as it grew into session 2 while session 2 had not been shared. Now a release is of
     * the session the report holds now, and a session already released is left as it is.
     */
    const roundNow = await theSessionTheReportHolds(this.prisma, groundId);
    if (ground.report.releasedAt) {
      if (isThisSessionReleased(ground.report as any, roundNow)) return ground.report; // already released
      return this.releaseALaterSession(ground, groundId, roundNow, sharedBecauseLeadLeft);
    }

    // Send notification emails before stamping releasedAt so that if delivery
    // fails entirely, the report is not marked released without anyone being
    // notified. Partial failure (one email bounces) is still logged but does
    // not block the release - a hard stop would be worse than a logged gap.
    /*
     * THE MAILS ARE ONE JOB, DONE IN ONE PLACE. See tellThemTheReportIsReady: once per person per round,
     * with a link to that round's report that signs them in. This used to mail everybody here and only
     * here, so session two's report told nobody and an open link's late answerers got nothing.
     */
    const told = await this.tellThemTheReportIsReady(groundId, roundNow, undefined, sharedBecauseLeadLeft?.sentence);
    if (told.attempted > 0 && told.failed === told.attempted) {
      throw new Error('All report notification emails failed - report not released. Retry to send notifications.');
    }

    /* Who shared it, when the lead has left (decision 53). See keepWhoSharedIt. */
    if (sharedBecauseLeadLeft) await this.keepWhoSharedIt(ground, groundId, sharedBecauseLeadLeft);

    /* A discovery session's direction is what its report IS; read it at release, once, and keep it. */
    if (ground.scenario === 'DISCOVERY') {
      await this.readAndKeepTheDirection(groundId).catch((err: any) => this.logger.warn(`Direction at release failed for ${groundId}: ${err?.message}`));
    }
    const released = await this.prisma.report.update({
      where: { groundId },
      data: { releasedAt: new Date(), releasedSessions: withThisSessionReleased(ground.report as any, roundNow) } as any,
    });
    this.usage.emit(UsageEventType.REPORT_RELEASED, { groundId, organizationId }).catch(() => undefined);

    // Generate per-party post-report conversation guides (#99). Best-effort -
    // a guide generation failure must never block report delivery.
    await this.generatePostReportGuides(released, ground.participants.map((p) => p.id)).catch((err) =>
      this.logger.error(`Post-report guide generation failed for ground ${groundId}: ${err.message}`),
    );

    /* Released is something new: word what each reader will now read, off the critical path, so the
       first open serves kept wording rather than asking a model (decision 7). */
    void this.wordTheReadsFor(groundId, roundNow).catch((err: any) => this.logger.warn(`Wording the reads after release failed for ${groundId}: ${err?.message}`));

    return released;
  }

  /**
   * A LATER SESSION'S PICTURE, RELEASED ON ITS OWN (decision 76, item 4).
   *
   * `releasedAt` stays the moment the report was first shared. The session is added to the ones
   * released, the people in it are told once (the same mail, once per person per session, that a
   * later round always sent from the listener), and the reads are worded for it, because a release
   * is something new (decision 7). Nothing is written again: the report is the one already kept.
   */
  private async releaseALaterSession(ground: any, groundId: string, sessionNumber: number, sharedBecauseLeadLeft?: Omit<SharedBecauseLeadLeft, 'at'>) {
    const told = await this.tellThemTheReportIsReady(groundId, sessionNumber, undefined, sharedBecauseLeadLeft?.sentence);
    if (told.attempted > 0 && told.failed === told.attempted) {
      throw new Error('All report notification emails failed - report not released. Retry to send notifications.');
    }
    if (sharedBecauseLeadLeft) await this.keepWhoSharedIt(ground, groundId, sharedBecauseLeadLeft);
    const released = await this.prisma.report.update({
      where: { groundId },
      data: { releasedSessions: withThisSessionReleased(ground.report, sessionNumber) } as any,
    });
    void this.wordTheReadsFor(groundId, sessionNumber).catch((err: any) => this.logger.warn(`Wording the reads after release failed for ${groundId}: ${err?.message}`));
    return released;
  }

  /* DECISION 53: KEPT ON THE GROUND'S OWN AUDIT LOG, an existing free-form JSON column, so this
     needs no schema change. `getAsBuilt` reads this one key back out and serves it to every reader
     of the report as `sharedByAnAdmin`, so the sentence outlives the one release email. */
  private async keepWhoSharedIt(ground: any, groundId: string, sharedBecauseLeadLeft: Omit<SharedBecauseLeadLeft, 'at'>) {
    const existingLog = ground.groundAuditLog && typeof ground.groundAuditLog === 'object' && !Array.isArray(ground.groundAuditLog)
      ? (ground.groundAuditLog as Record<string, unknown>)
      : {};
    await this.prisma.ground.update({
      where: { id: groundId },
      data: { groundAuditLog: { ...existingLog, sharedBecauseLeadLeft: { ...sharedBecauseLeadLeft, at: new Date().toISOString() } } },
    }).catch((err: any) => this.logger.warn(`Could not record who shared the report for ${groundId}: ${err?.message}`));
  }

  /**
   * THE SUBJECT OF THE REPORT-READY NOTICE, AS A FACT (decision 109 item 3). Everybody is told how many people checked in; the lead is told the week's
   * two facts (what was done and by whom, what waits and on whom) where there are any, as facts and never comparisons. Counts and first names only:
   * nothing anybody said, and nothing from the report itself.
   */
  /** What the shared picture finds, for one person, read as they are served it (never the stored report), so their privacy and naming rules hold. */
  private async theInsightFor(
    ground: { id: string; label: string; initiatorId: string; organizationId: string; simplerWords?: boolean | null },
    p: { userId: string | null },
    sessionNumber: number,
  ) {
    if (!p.userId) return null;
    /* As if released: this goes out at the moment of release, before it is stamped, and a participant's own read of the team's picture is withheld until then. */
    const report = await this.sessionReport(ground.id, sessionNumber, p.userId, ground.organizationId, true);
    return theFirstInsight(report, ground.label, { isTheLead: p.userId === ground.initiatorId, simplerWords: ground.simplerWords });
  }

  /**
   * THE ONE FINDING OF A CHECK-IN, for Ask when it is opened about that check-in (screens request 198). It is the finding the first-insight mail's subject says,
   * read from the report AS THIS READER IS SERVED IT (sessionReport), so every wall that report has holds here: a person who may not read the check-in is told
   * it does not exist, a participant reads nothing until the picture is released to them, and a colleague's words never come with it, because only the report's
   * own sentence about what is still open does. Nothing is built or worded here, and opening it writes nothing.
   */
  async theFindingOf(groundId: string, userId: string, organizationId?: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { label: true, report: { select: { releasedAt: true, releasedSessions: true } } } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const held = ((await this.prisma.checkIn.aggregate({ where: { groundId }, _max: { sessionNumber: true } }).catch(() => null)) as any)?._max?.sessionNumber ?? 1;
    const session = theLatestReleasedSession(ground.report as any, held);
    /* Whoever may not read this check-in is refused here, released or not, so the answer never tells a stranger anything. */
    const report = await this.sessionReport(groundId, session ?? 1, userId, organizationId);
    const none = { groundId, label: ground.label, sessionNumber: session, finding: null, moreStillOpen: 0, conversationWorthHaving: null };
    if (!session) return none;
    const found = theFindingOnItsOwn(report, ground.label);
    return found ? { ...none, ...found } : none;
  }

  private async theReportReadySubject(ground: { id: string; label: string; initiatorId: string }, p: { userId: string | null }): Promise<string | undefined> {
    const stood = await theOpenSession(this.prisma, ground.id, ground.initiatorId);
    const isTheLead = !!p.userId && p.userId === ground.initiatorId;
    const facts = isTheLead ? theFactsOfTheWeek(await theWeekOf(this.prisma, ground, new Date())) : null;
    return theSharedPictureSubject(ground.label, stood, facts);
  }

  /**
   * TELL EACH PERSON THIS ROUND'S REPORT IS READY, ONCE, WITH A LINK THAT OPENS IT.
   *
   * Hafsah, 22 Sep 2026, after a live round: "people don't really get a link to the report once they
   * put in their details ... We want people to get a link to the report." Three things were true.
   * release() mailed everybody the first time and then returned early for ever, so no round after the
   * first told anybody. With an open link the round released at the first two answers, so everyone who
   * answered later got nothing. And the link went to the ground's report page, not the round they had
   * just been part of.
   *
   * So: one row in report_notices per person per round, written as the mail goes; anyone with a row is
   * skipped. The link is the ROUND's page. Somebody with a password gets the route; somebody who came
   * in on a link gets their own invite link with the round page as where to go next, which is how they
   * have always signed in; an open-link row that left no address is not mailed, because there is
   * nowhere to send it. Called on release, when a later round closes, and when somebody completes after
   * the report has released - the last of these is what the open link needed.
   */
  async tellThemTheReportIsReady(groundId: string, sessionNumber: number, onlyParticipantId?: string, sharedByAnAdminSentence?: string): Promise<{ attempted: number; failed: number }> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { participants: { include: { user: { select: { passwordHash: true } } } } },
    });
    if (!ground) return { attempted: 0, failed: 0 };
    const frontend = this.config.get<string>('resend.frontendUrl');
    /* The round's own page, /grounds/:id/session/:n - a client route; the-report-link-goes-to-the-report checks it. */
    const linkFor = (p: { inviteToken: string | null; user: { passwordHash: string | null } | null }) =>
      p.user?.passwordHash || !p.inviteToken
        ? `${frontend}/grounds/${groundId}/session/${sessionNumber}`
        : `${frontend}/invite?token=${p.inviteToken}&next=${encodeURIComponent(`/grounds/${groundId}/session/${sessionNumber}`)}`;
    const aStandingUpdate = (ground as any).scenario === 'TEAM_UPDATES';
    const theOneLine = ((ground as any).brief ?? '').trim();
    const already = new Set(
      (await this.prisma.reportNotice.findMany({ where: { groundId, sessionNumber }, select: { participantId: true } })).map((n) => n.participantId),
    );
    /* Somebody the clock closed on, who said nothing, has not answered: the picture is not mailed to them as if they had. */
    const saidNothing = new Set(
      ((await (this.prisma.checkIn?.findMany?.({ where: { groundId, sessionNumber, status: CheckInStatus.COMPLETED, ...aQuietCloseWhere }, select: { participantId: true } }) ?? Promise.resolve([] as any[])).catch(() => [] as any[])) as any[])
        .map((c: any) => c.participantId),
    );
    const owed = ground.participants.filter((p) =>
      !already.has(p.id)
      && !saidNothing.has(p.id)
      && (!onlyParticipantId || p.id === onlyParticipantId)
      && !!p.email
      && !p.email.endsWith(AN_UNCLAIMED_ADDRESS)
      /* Somebody who was asked and said no is not sent it. Null is nobody asked, which is everybody the lead invited. */
      && (p as any).wantsTheReport !== false,
    );
    let failed = 0;
    for (const p of owed) {
      try {
        /* The row first: two listeners firing together must not send twice. A unique clash means the other one has it. */
        await this.prisma.reportNotice.create({ data: { groundId, participantId: p.id, sessionNumber } });
      } catch { continue; }
      try {
        if (aStandingUpdate && theOneLine) await this.email.sendTeamUpdateAllIn(p.email, theOneLine, ground.participants.length, linkFor(p), sharedByAnAdminSentence);
        else {
          /* The finding itself, as this reader is served the report (spec section 7). Where it cannot be read, the notice goes as it always did. */
          const insight = await this.theInsightFor(ground, p, sessionNumber).catch(() => null);
          const subject = (insight?.subjectForTheLead) ?? await this.theReportReadySubject(ground, p).catch(() => undefined);
          /* WHERE THERE IS A FINDING, "I CAN HELP YOU DO THAT" (request 198): a way into Ask about this check-in, for the lead, and for a participant only where the report served to them names one. */
          /* Only for somebody who signs in with a password: a person who comes in on an invite link is taken only to the report (the invite page honours no other path). */
          const chat = insight?.hasAFinding && p.user?.passwordHash
            ? { url: `${frontend}/chat?about=${groundId}`, label: p.userId === ground.initiatorId ? 'I can help you do that' : 'I can help you talk it through' }
            : undefined;
          await this.email.sendReportReady(p.email, ground.label, linkFor(p), sharedByAnAdminSentence, ground.id, subject, insight?.lines, chat);
        }
      } catch (err: any) {
        failed += 1;
        this.logger.error(`Report-ready mail failed for ${p.email} on ${groundId} round ${sessionNumber}: ${err?.message}`);
        await this.prisma.reportNotice.deleteMany({ where: { groundId, participantId: p.id, sessionNumber } }).catch(() => undefined);
      }
    }
    if (owed.length) this.logger.log(`Told ${owed.length - failed} of ${owed.length} the round ${sessionNumber} report is ready on ${groundId}.`);
    return { attempted: owed.length, failed };
  }

  /**
   * SEND THIS ROUND'S REPORT TO EVERYONE WHO ANSWERED AND ASKED FOR IT. The lead's button. See the
   * controller. Who will get it is listed back, by name and address, so the lead can see the send
   * before and after it happens: `owed` is who has not been told yet, `told` who has.
   */
  async sendToEveryone(groundId: string, userId: string, organizationId: string, as: HowItWasShared = 'NAMED'): Promise<{ sessionNumber: number; sent: number; failed: number; alreadyTold: number; notAsked: number; sharedAs: HowItWasShared }> {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, select: { id: true, initiatorId: true, report: { select: { releasedAt: true } } } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (ground.initiatorId !== userId) throw new ForbiddenException('Only the person running this check-in can send its report.');
    const completed = await this.prisma.checkIn.count({ where: { groundId, status: CheckInStatus.COMPLETED } });
    if (completed === 0) throw new BadRequestException('Nobody has answered yet, so there is no report to send.');
    if (!ground.report) await this.synthesize(groundId);
    /* The session the report holds now, released if it is not yet (decision 76, item 4). */
    await this.release(groundId, organizationId);
    /*
     * THE ORGANISER'S CHOICE, WRITTEN BEFORE A SINGLE MAIL GOES OUT.
     *
     * Written first on purpose: the link in the mail leads to a page that reads this column, so a
     * send that wrote it afterwards would race its own email. See what-the-respondents-get.
     */
    const sharedAs: HowItWasShared = isHowItWasShared(as) ? as : 'NAMED';
    await this.prisma.report.update({ where: { groundId }, data: { sharedAs } });
    const sessionNumber = await this.prisma.checkIn.aggregate({ where: { groundId, status: CheckInStatus.COMPLETED }, _max: { sessionNumber: true } }).then((r) => r._max.sessionNumber ?? 1);
    const before = await this.prisma.reportNotice.count({ where: { groundId, sessionNumber } });
    const notAsked = await this.prisma.groundParticipant.count({ where: { groundId, wantsTheReport: false } });
    const r = await this.tellThemTheReportIsReady(groundId, sessionNumber);
    return { sessionNumber, sent: r.attempted - r.failed, failed: r.failed, alreadyTold: before, notAsked, sharedAs };
  }

  /** Fetch the report. If released, returns full content for any party or the
   * initiator. If not yet released, returns a locked stub { id, groundId,
   * createdAt, releasedAt: null } for the initiator only so the admin page can
   * show the release button - no content is included before release.
   *
   * After release, each participant must activate their own ReportActivation
   * before full content is returned to THEM - this is a per-party reveal
   * confirmation, not a mutual gate: one party activating has no effect on
   * any other party's access. The initiator always sees the full report
   * once released - they are the one who released it.
   */

  /**
   * PUT THE NAMES BACK, FOR THE PEOPLE ALLOWED TO SEE THEM.
   *
   * Reports are stored without personal names: the model is told never to use
   * one, and the parties reach it as "the initiator" and "participant A". That
   * is a good property to keep, because an artefact with no names in it cannot
   * leak one wherever it ends up.
   *
   * But it made the report unreadable for the person it is mostly for. A lead
   * opening a report about their own team, on a page that already shows both
   * names in the header, was reading "the initiator" and "participant A"
   * describing a conversation they had themselves.
   *
   * So names are added on the way out, and only for the reader entitled to them:
   * the lead sees everyone, anybody else sees themselves and the lead. A new
   * hire must never find "Kavon said the handover was late" - a colleague's
   * account, attributed to them, in front of the person it is about. The
   * colleague stays behind their role label, which still says honestly where the
   * account came from without saying who gave it.
   *
   * This is access control, not wording, so it lives here in code rather than in
   * an instruction to a model.
   */
  /**
   * THE CHECK BEFORE THE REPORT IS KEPT, WITH THE PRODUCT'S OWN DOOR AS THE RENDER.
   *
   * The lead reads the report named (`asItWasShared`); a participant reads it through the same door
   * and then their own filters, with the longitudinal read narrowed to them - exactly the three
   * steps `get()` takes. Returns the checked fields, or null when nothing needed changing.
   */
  private async everyLineReadAsItWillBe<R extends Record<string, any>>(groundId: string, ground: { scenario?: any; peersVisibleToEachOther?: boolean | null }, candidate: R): Promise<R | null> {
    const [participants, stored] = await Promise.all([
      this.prisma.groundParticipant.findMany({
        where: { groundId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, userId: true, email: true, partyType: true, createdAt: true, roleAsDescribed: true, managingOnly: true, nameGiven: true, organisationGiven: true, remitAsGiven: true, user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.report.findUnique({ where: { groundId }, select: { sharedAs: true } }).catch(() => null),
    ]);
    const lead = (participants as any[]).find((p) => p.partyType === PartyType.INITIATOR);
    const readers: AReader[] = [
      { participantId: lead?.id ?? null, isLead: true },
      ...(participants as any[]).filter((p) => p.partyType !== PartyType.INITIATOR).map((p) => ({ participantId: p.id as string, isLead: false })),
    ];
    const labels = labelsForParties(participants as any);
    const asGround = (report: any) => ({ scenario: ground.scenario, peersVisibleToEachOther: ground.peersVisibleToEachOther, participants, report: { ...report, sharedAs: (stored as any)?.sharedAs ?? null } });
    const named = (report: R, r: AReader) => this.asItWasShared(asGround(report) as any, r.participantId, r.isLead) as any;
    const served = (report: R, r: AReader) => {
      if (r.isLead) return named(report, r);
      const viewer = { isLead: false, participantId: r.participantId };
      return {
        ...whatAParticipantMayRead(withoutOtherPeoplesReads(named(report, r), {
          viewerLabel: r.participantId ? (labels.get(r.participantId) ?? null) : null,
          viewerParticipantId: r.participantId,
          viewerIsLead: false,
        }), viewer),
        overTime: (this.asItWasShared(asGround({ overTime: overTimeForThisReader((report as any).overTime, viewer) }) as any, r.participantId, false) as any).overTime,
      };
    };
    const { report, done } = await everyLineIsReadBeforeItIsKept({
      report: candidate,
      readers,
      named,
      served,
      fields: Object.keys(candidate),
      /* One structured call for every failing line of the report. See every-line-is-read-before-it-is-kept. */
      rewriteAll: async (asks) => {
        const started = Date.now();
        const answer = await this.anthropic.extract<any>(REWRITE_THE_LINES, [{ role: 'user', content: theLinesToRewrite(asks) }] as any, THE_LINES_REWRITTEN as any);
        this.logger.log(`Report for ground ${groundId}: ${asks.length} line(s) sent for a rewrite in one call, ${Date.now() - started} ms.`);
        return theRewritesById(answer);
      },
    });
    /* One line each, so the rate of each fault can be read off the log before anything is tuned. */
    for (const d of done) {
      this.logger.warn(`Report for ground ${groundId}: ${d.outcome} at ${d.path} (${d.problems.join('; ')}). Was: "${d.was.slice(0, 200)}"${d.now ? ` Now: "${d.now.slice(0, 200)}"` : ''}`);
    }
    return done.length ? (report as R) : null;
  }

  /**
   * A line built at the read, made to read right or not shown, with a line in the log for each. Its
   * quotes first, against `record`, the same lines the stored pass quotes from: see
   * a-quote-built-at-the-read.
   */
  private readAsItWillBeRead<T>(value: T, groundId: string, what: string, record: string[], blame?: WhatTheRecordHoldsForBlame | null): T {
    if (value == null) return value;
    const quoted = this.quotesAsTheRecordHasThem(value, groundId, what, record);
    const dropped: string[] = [];
    let out = linesBuiltAtTheRead(quoted, dropped);
    if (dropped.length) this.logger.warn(`Report for ground ${groundId}: ${dropped.length} line(s) of ${what} not shown, because they still failed a test after the read's repairs. First: "${dropped[0].slice(0, 160)}"`);
    /*
     * AND A COLLEAGUE'S FAULT IS THE SPEAKER'S ACCOUNT, WITH THE NOTE (decision 139, must-fix 4). Hassan's coaching read "You have been
     * waiting on Amina Otieno for the stock from Kisumu since 12 October" and the lead's "Hassan Mwenda has been waiting on Amina Otieno
     * ... Ask what that is waiting on." when nothing confirmed it. See a-colleagues-fault-is-the-speakers-account.
     */
    /*
     * THROUGH THE FINAL CHECK, which runs that check first and then removes a number, status, date, name or credit the record does not
     * hold (Hafsah, 12 October): coaching and probes as they are served. Held: the record's lines, each person's own words, and the engine's own lines before the wording pass (theEnginesOwnLines).
     */
    if (blame) {
      const held: WhatTheRecordHolds = {
        blame,
        texts: [...record, ...(blame.theirOwnWords ?? []).map((w) => w.text), ...(theEnginesOwnLines.get(value as any) ?? [])],
        people: blame.people,
        theirOwnWords: blame.theirOwnWords,
        reader: blame.speaker?.isTheReader ? blame.speaker.name : null,
      };
      out = everyLineTheFinalCheckPasses(out, held, { where: `report for ground ${groundId}, ${what}`, log: this.logger }).value;
    }
    return out;
  }

  /** What the record holds for the check on a colleague's fault, read once for a read that has coaching or probes to serve. */
  private async theBlameHeld(groundId: string, speakerParticipantId: string | null | undefined): Promise<WhatTheRecordHoldsForBlame | null> {
    return whatTheRecordHoldsForBlame(this.prisma, groundId, { speakerParticipantId: speakerParticipantId ?? null, speakerIsTheReader: true }).catch(() => null);
  }

  /** Only the quote rule, for a part built at the read that has no other test to pass. */
  private quotesAsTheRecordHasThem<T>(value: T, groundId: string, what: string, record: string[]): T {
    if (value == null) return value;
    const requoted: string[] = [];
    const out = quotesBuiltAtTheRead(value, record, requoted);
    if (requoted.length) this.logger.warn(`Report for ground ${groundId}: ${requoted.length} quote(s) in ${what} were not the record's words. First: ${requoted[0].slice(0, 200)}`);
    return out;
  }

  private applyNames<T extends Record<string, any>>(
    reportIn: T,
    parties: any[],
    viewerParticipantId: string | null,
    viewerIsLead: boolean,
    /** Whether this check-in names people to each other. See `peersAreNamed`. */
    peersAreNamed = false,
  ): T {
    // An org admin reads with the lead's eyes; they already see the whole ground.
    // Shared with the board, which had no version of this at all and showed a lead their
    // own ground in placeholders as a result. W8-73.
    const asWhom = readsWithNamesOf({ viewerIsLead, viewerParticipantId, parties });
    /* The check-in's own setting, so the picture names people the same way the roster three
       inches above it does. See the-report-names-people-the-way-the-setting-says.spec.ts. */
    const visible = namesVisibleTo(asWhom, parties, peersAreNamed);
    // Deliberately NO early return when there are no names to put back. The
    // dash cleanup below runs on every report, and an invited participant who
    // has not joined yet has no name - which is exactly a report that would
    // otherwise keep its em dashes because nobody could be named in it.

    /**
     * Names in, dashes out, at the same moment and for the same reason: this is
     * the last place the text is touched before somebody reads it.
     *
     * The dash fix is safe in code because nothing about it is a judgement:
     * a dash between clauses is a comma. The forensic phrases are NOT safe that
     * way - cutting "both records describe" out of a sentence changes what the
     * sentence says - so those are still detected and logged for a person.
     */
    // Every party's label, so the bare-label tidy-up can tell "unambiguous" from "the only
    // one I am allowed to see". W8-73.
    const allLabels = [...labelsForParties(parties).values()];

    /*
     * A LABEL THE MODEL INVENTED, GIVEN TO SOMEBODY REAL, BEFORE ANY NAME GOES BACK.
     *
     * Run live on a three-person check-in: the corpus listed the labels, the schema said to use
     * them, an instruction was added saying they were the only strings allowed - and it wrote
     * "Person" for both participants twice. A report about three people named two of them Person.
     *
     * The substitution below can only replace labels it knows, so an invented one survives to the
     * screen. This hands each side of a difference somebody who is actually on the check-in, by
     * position, before the names are looked up. See eachSideGetsSomebody.
     */
    const withSomebodyOnEachSide = (d: any) => {
      if (!d || typeof d !== 'object') return d;
      const fix = (sides: any[]) => eachSideGetsSomebody(sides, allLabels);
      return {
        ...d,
        ...(Array.isArray(d.positions) ? { positions: fix(d.positions) } : {}),
        ...(Array.isArray(d.perspectives) ? { perspectives: fix(d.perspectives) } : {}),
      };
    };
    const report = {
      ...(reportIn as any),
      ...(Array.isArray((reportIn as any)?.divergences)
        ? { divergences: (reportIn as any).divergences.map(withSomebodyOnEachSide) }
        : {}),
    };
    /**
     * The reader's own label, so the report addresses them rather than describing them. A person
     * opened their private report and read "Hafsah Jumare described their role" about themselves.
     */
    const readerLabel = viewerLabelOf(viewerParticipantId, parties);
    /*
     * `notTheWordParty` runs here, at the read, because the prompt rule forbidding it has been
     * ignored since the day it was written - see the module. It sits inside `t` so it reaches
     * exactly what names reach and nothing else: the label fields are already excluded by
     * NEVER_NAMED below, for the same reason.
     */
    const t = (v: any): any =>
      typeof v === 'string'
        ? notTheWordParty(withoutDashes(withNames(v, visible, allLabels, { viewerLabel: readerLabel })))
        : v;
    const walk = (v: any): any => {
      if (typeof v === 'string') return t(v);
      /* A Date is not a plain object: Object.entries on it is empty, so it arrived as {} (request 53). */
      if (v instanceof Date) return v;
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) out[k] = walk(val);
        return out;
      }
      return v;
    };

    /**
     * THE FIELD LIST WAS THE BUG. W8-74.
     *
     * This substituted six named fields and let everything else through on `...report`. Two
     * of the things it let through carry prose:
     *
     *   engagement.recallNotes[].note    "the initiator was uncertain on key points"
     *   inferences[].text                "the initiator and participant were operating from
     *                                     different definitions of success"
     *
     * So the lead of a twelve-session ground read her own report with her name in one
     * paragraph and "the initiator" in the next, and every inference - the part that says
     * what the product CONCLUDED about people - in placeholders. Verified against the live
     * endpoint: `withNames` works, the board now works, and this path never called it on
     * those two fields.
     *
     * WHY THE LABEL FIELDS ARE LEFT ALONE, and this is the part that matters. `own-reads-only.ts`
     * filters per-person rows by `row.label === viewerLabel`, matching on the RAW label. Put a
     * name in `.label` and that comparison stops matching - which does not fail loudly, it
     * silently keeps the wrong rows, and those rows are other people's quality reads. So text
     * is named and labels stay labels, by key name, deliberately.
     */
    const NEVER_NAMED = new Set(['label', 'participantLabel']);
    const walkTextOnly = (v: any): any => {
      if (typeof v === 'string') return t(v);
      if (v instanceof Date) return v;
      if (Array.isArray(v)) return v.map(walkTextOnly);
      if (v && typeof v === 'object') {
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) out[k] = NEVER_NAMED.has(k) ? val : walkTextOnly(val);
        return out;
      }
      return v;
    };

    /*
     * AND NOW EVERY FIELD, BECAUSE THE FIELD LIST WAS THE BUG TWICE.
     *
     * The note above records the first time: six fields named, everything else through on
     * `...report`, and the lead read "the initiator" in her own inferences. Two fields were added
     * and the default was left alone - so when `theJudgement` and `findings` arrived, the same
     * defect regrew in them. The twenty-four-scenario run counted "the initiator" twenty-four
     * times in ONE lead's report, almost all of it inside the judgement.
     *
     * So the default is inverted. Everything is walked; `NEVER_NAMED` is the exception list, and it
     * is the one that has a reason - `own-reads-only` filters per-person rows on the raw label, so
     * a name in `.label` silently keeps the wrong person's rows.
     *
     * The named fields below stay named only where they need a DIFFERENT walker: `divergences` gets
     * a side assigned to each position before names go in, and `engagement` gets a name carried
     * beside the label rather than into it.
     */
    const named = walkTextOnly(report);
    /*
     * A STEP THAT ONLY ASKED THE READER TO ASK THEMSELVES IS NOT A STEP (the 1 October review). Once
     * their own name is "you", withNames writes it as what is missing ("Your own account of ... is
     * not in this check-in."), which belongs under what this cannot tell them, not under what to do.
     */
    if (named?.theJudgement && Array.isArray(named.theJudgement.whatToDo)) {
      named.theJudgement = {
        ...named.theJudgement,
        whatToDo: named.theJudgement.whatToDo.filter((m: any) => !(m && typeof m.move === 'string' && YOUR_OWN_ACCOUNT_IS_NOT_HERE.test(m.move))),
      };
    }
    /* And no step that is only a piece, and no promise quoted as a fragment (request 134 item 4), as the board serves it. */
    /* The same repairs the board makes, so the lead's report and board read alike: no piece for a step, a promise as
       what was promised, whose account is missing, and a check-in of one (requests 134, 136 and the 5 October run). */
    if (named?.theJudgement) {
      const answering = (parties as any[]).filter((p) => !p?.managingOnly);
      named.theJudgement = aJudgementThatReadsRight(named.theJudgement, {
        theReaderIsTheOnlyPerson: viewerIsLead && answering.length === 1 && answering[0]?.id === viewerParticipantId,
      });
    }
    return {
      ...named,
      sharedPicture: t(report.sharedPicture),
      centralQuestion: t(report.centralQuestion),
      agreements: walk(report.agreements),
      divergences: walk(report.divergences),
      finalSynthesis: walk(report.finalSynthesis),
      leadershipGaps: walk(report.leadershipGaps),
      /*
       * AND A NAME BESIDE THE LABEL, WITHOUT TOUCHING THE LABEL.
       *
       * Ten agribusinesses gave their name and their organisation at the end of an open link, and
       * their own lead's report listed them as "Participant A", "Participant B", "Participant C",
       * "Participant D" - while the paragraph above named them. `label` is deliberately never
       * substituted (the note above says why: own-reads-only filters on the raw label and a name in
       * that field silently keeps the wrong person's quality read), so the fix is not to resolve it
       * but to carry the resolved name alongside it.
       *
       * `who` is what a page prints. `label` is what the filters match. Same permission rule as
       * every other name on this read: a reader who may not see somebody gets the label back.
       */
      engagement: theNamesBesideTheLabels(
        walkTextOnly(report.engagement),
        visible,
        plainWordsForTheUnnameable(allLabels, visible, readerLabel),
      ),
      inferences: walkTextOnly(report.inferences),
    };
  }

  /**
   * WHO DECLINED THIS ROUND, NAMED THE SAME WAY THE REPORT NAMES EVERYBODY ELSE.
   *
   * Her decision: "Round completes, report names the decline", and the report must say so plainly
   * rather than presenting three accounts as though only three people were ever asked.
   *
   * NAMED THROUGH `labelsForParties`, NOT FROM THE USER ROW. That map is what the whole report is
   * written in, and it handles the cases a second implementation would get wrong: same-role parties
   * disambiguated, and a viewer who is not entitled to a real name getting the role instead. A
   * decline is a fact about a person, so it is the last place to invent a second naming rule.
   */
  private async declinedThisRound(
    groundId: string,
    parties: any[],
  ): Promise<{ participantId: string; label: string }[]> {
    const progress = await this.grounds.getSessionProgress(groundId);
    if (!progress?.declinedParticipantIds.length) return [];
    const labels = labelsForParties(parties as any);
    return progress.declinedParticipantIds.map((participantId) => ({
      participantId,
      label: labels.get(participantId) ?? 'A party',
    }));
  }

  /**
   * The documents this reader may know about, by name, with whether anything read them.
   *
   * Visibility is `canSeeDocument`'s question and is asked of it rather than answered again here.
   */
  /**
   * THE ROWS BOTH COACHING SURFACES READ, READ ONCE.
   *
   * The member's own note and the lead's probe list are two readings of the same facts, and they
   * must not contradict each other: a lead told to probe somebody on a thing has to find that the
   * person was already told to move it, or the conversation is an ambush. One read, two shapes.
   */

  /**
   * WHETHER THIS CHECK-IN NAMES PEOPLE TO EACH OTHER. See namesVisibleTo.
   *
   * The same read the board and the check-in page make, in the same words, so the report cannot
   * disagree with them: the lead's setting where they have made one, and otherwise hidden on the
   * kinds of check-in that decide something about a person.
   */
  /**
   * THE REPORT AS THE ORGANISER CHOSE TO SHARE IT.
   *
   * Both report reads went through `applyNames(..., peersAreNamed)`, which answers a question about
   * the CHECK-IN - are people named to each other here - and there was no way to answer the
   * different question the organiser is actually asked at the moment of sending: is the copy these
   * hundred people receive named or anonymised. See what-the-respondents-get.
   *
   * Anonymised is two things, not one. Names are not put back, AND the text is scrubbed of the
   * people and organisations by name, because a name inside a quote survives every label
   * substitution ever written. The lead's own copy is untouched: they ran this.
   */
  private asItWasShared(
    ground: { scenario?: any; peersVisibleToEachOther?: boolean | null; report?: any; participants?: any[] },
    viewerParticipantId: string | null,
    viewerIsLead: boolean,
  ) {
    const sharedAs = (ground.report as any)?.sharedAs ?? null;
    const named = namesTheyMayRead({ viewerIsLead, sharedAs, peersAreNamed: this.peersAreNamed(ground as any, viewerParticipantId) });
    /* AND THE MACHINE'S TABLE NEVER LEAVES THE MACHINE, for any reader, lead included. Stripped
       here because this is the door every report read goes through, the board's included. See
       the-table-is-for-the-engine. */
    /* And a finding's positional label stays on the stored row: nothing renders it, and it was 113
       of the 114 labels anybody was handed. See a-finding-is-served-without-its-label. The same for
       the lead's own description of a person under a gap over time: see a-gap-is-served-as-its-sentence. */
    /* The marks the build stored, beside each line they belong to (week 6b). Taken out of the engagement
       block so they are served once, on the lines, and never as a second copy. */
    const asStored = (ground.report ?? {}) as any;
    const { marksOnItsLines, ...theRestOfEngagement } = (asStored.engagement && typeof asStored.engagement === 'object' ? asStored.engagement : {}) as Record<string, any>;
    const withMarks = !ground.report ? (ground.report as any) : withTheMarksOnItsLines(
      asStored.engagement && typeof asStored.engagement === 'object' ? { ...asStored, engagement: theRestOfEngagement } : asStored,
      marksOnItsLines,
    );
    /* A field name the model wrote into a divergence comes out at every read, for reports already stored (item 21). */
    const readable = withMarks && Array.isArray((withMarks as any).divergences) ? { ...(withMarks as any), divergences: everyDivergenceReadable((withMarks as any).divergences) } : withMarks;
    const withNamesPutIn = this.withoutTheNamesTheReaderMayNotRead(
      this.applyNames(gapsAsTheirSentences(findingsWithoutTheirLabels(theTableStaysWithTheEngine(readable))), (ground.participants ?? []) as any, viewerParticipantId, viewerIsLead, named),
      (ground.participants ?? []) as any[],
      viewerParticipantId,
      viewerIsLead || this.peersAreNamed(ground as any, viewerParticipantId),
    );
    /*
     * DECISION 75, ITEM 14: WHERE PEOPLE DO NOT SEE EACH OTHER, ONE PERSON'S CIRCUMSTANCES NEVER REACH ANOTHER. The
     * shared picture a participant reads carries counts and patterns across people, never a sentence about one
     * colleague. Not on an evaluation check-in, where what the person reviewed and a colleague read has its own
     * rule (decision 17). Whoever runs it, and an admin, read it whole. See one-persons-circumstances-stay-their-own.
     */
    /* And nobody is served a line with no words in it, whatever the wall took out of it (a-report-has-no-empty-line). */
    const withNames = aReportWithNoEmptyLine(!viewerIsLead && !this.peersAreNamed(ground as any, viewerParticipantId) && !isEvaluationCheckIn((ground as any).scenario)
      ? onlyCountsAndPatternsAboutTheOthers(withNamesPutIn, { names: theOtherPeoplesNames(ground.participants ?? [], viewerParticipantId, (ground as any).initiatorId ?? null), lead: theLeadsNamesOf(ground.participants, (ground as any).initiatorId) })
      : withNamesPutIn);
    if (viewerIsLead || sharedAs !== 'ANONYMOUS') return withNames;
    return aReportWithNoEmptyLine(nothingIdentifyingIn(withNames, (ground.participants ?? []).map((p: any) => ({
      name: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || p.nameGiven || null,
      organisation: p.organisationGiven ?? null,
    }))));
  }

  /**
   * A NAME INSIDE A QUOTE IS A NAME LIKE ANY OTHER, FOR A READER WHO MAY NOT READ IT (privacy sweep, 5 October 2026, finding 5).
   *
   * A report is stored with its names turned into labels, and `withNames` turns the labels back into the right words for each
   * reader, but it leaves the inside of a quotation alone, because a quote is what the person said (a-quote-is-what-they-said).
   * So a quote that held a colleague's name ("Aisha is current", "Seyi tells me partnerships are close") reached a reader who
   * may not read that name, with the name in it. For that reader, and only that reader, the name inside the quote is swapped for
   * the plain words everything else says for that person ("a colleague", "another colleague"), exactly as it is outside a quote.
   * Nothing else in a quote is touched, and a reader who may read the name reads the quote as it was said. Stored rows need no
   * rewrite: this is applied to whatever is stored, on every read.
   */
  private withoutTheNamesTheReaderMayNotRead<T>(value: T, parties: any[], viewerParticipantId: string | null, readerMayReadNames: boolean): T {
    if (readerMayReadNames || !parties.length) return value;
    let people: { label: string; name: string }[] = [];
    try {
      const visible = namesVisibleTo(viewerParticipantId, parties as any, false);
      const plain = plainWordsByPerson(parties as any, visible, viewerLabelOf(viewerParticipantId, parties as any));
      people = parties
        .filter((p: any) => p.id !== viewerParticipantId && p.partyType !== 'INITIATOR' && !!plain.get(p.id) && !!displayName(p))
        .map((p: any) => ({ label: plain.get(p.id)!, name: displayName(p)! }));
    } catch {
      return value;
    }
    if (!people.length) return value;
    const NOT_A_NAME_FIELD = new Set(['label', 'participantLabel']);
    const walk = (v: any, key?: string): any => {
      if (typeof v === 'string') return key && NOT_A_NAME_FIELD.has(key) ? v : aNameInTheirWordsIsTheLabel(v, people, { asTheReadSeesIt: true });
      if (v instanceof Date || v === null || typeof v !== 'object') return v;
      if (Array.isArray(v)) return v.map((x) => walk(x, key));
      const out: Record<string, any> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x, k);
      return out;
    };
    return walk(value);
  }

  private peersAreNamed(
    ground: { scenario?: any; peersVisibleToEachOther?: boolean | null; participants?: any[] | null },
    readerParticipantId: string | null | undefined,
  ): boolean {
    /* One copy of the rule, shared with the board, the grounds page and the interview. See
       peers-are-named. The reader is passed so that decision 17 can tell the person reviewed on an
       evaluation check-in, who is never named a colleague, from a colleague the lead's switch names. */
    return peersAreNamedOn(ground as any, { participantId: readerParticipantId ?? null });
  }

  /**
   * THE SAME READ, FOR THE BOARD, WHICH HAD NO VERSION OF IT AT ALL.
   *
   * The board serves the report's own sentences, and those sentences are stored in labels. It had
   * its own half of the rule - a `withNames` walk over the whitelisted fields - and that half
   * missed three things the report's read does: it walked `.label` too (a name there silently
   * keeps the wrong person's rows, see the note in `applyNames`), it never dropped the identifying
   * detail out of a check-in shared without names, and it never reached `theJudgement` or
   * `overTime`, which the board takes straight off the stored row. So a lead read their own board
   * as "The initiator believes the team is behind on a collective goal".
   *
   * One implementation, asked for rather than copied. This is deliberately a thin door onto
   * `asItWasShared` and not a second naming path: the anonymous-send scrub, the label exception
   * and the reader's own "you" all have to come with the names or the board gets the names without
   * the rules that go with them.
   */
  theReportAsItWasShared(
    ground: { scenario?: any; peersVisibleToEachOther?: boolean | null; report?: any; participants?: any[] },
    viewerParticipantId: string | null,
    viewerIsLead: boolean,
  ) {
    if (!ground?.report) return null;
    return this.asItWasShared(ground, viewerParticipantId, viewerIsLead);
  }

  /**
   * THE ENGINE'S CLAIMS, SAID BETTER, OR THE ENGINE'S CLAIMS.
   *
   * One call per surface rather than one per sentence, so the model sees the whole block and can
   * vary it as a piece. `wordedByTheModel` holds the line count and runs the assistant's own
   * `safeToUse` on each line, and hands back the draft untouched on any refusal.
   *
   * Never allowed to fail the read. A report that will not load because a wording pass timed out
   * is strictly worse than one that reads like an engine wrote it.
   */
  /**
   * THE PICTURE, WRITTEN ONCE, FROM THE FACTS.
   *
   * One call for everybody rather than one per person: the opening has to be true across the room,
   * and four separate calls would let four paragraphs disagree about how many people answered.
   *
   * NEVER ALLOWED TO FAIL THE REPORT. A refusal, a timeout or a shape that does not match falls
   * back to `plainlyWithoutAModel`, which reads flatly and does not glue. Flat is a worse report;
   * glued is a broken one.
   */
  private async pictureInPlainSentences(
    facts: PersonFacts[],
    about: { peopleAnswered: number; peopleExpected: number; differenceTopics: string[]; aboutOnePerson: boolean },
  ): Promise<ThePicture> {
    /* The label is what is stored; the name is swapped in at the read. The model is given the label
       so that whatever it writes still goes through the same name resolution as everything else. */
    const nameFor = (label: string) => label;
    if (!facts.length) return { opening: '', perPerson: [] };

    const fallback = (): ThePicture => whenThePictureCannotBeWritten(about.peopleAnswered, about.peopleExpected);

    try {
      const written = await this.anthropic.extract<ThePicture>(
        thePictureInstruction(about),
        [{ role: 'user', content: facts.map((f) => factsAsLines(f, nameFor)).join('\n\n') }],
        THE_PICTURE_SCHEMA as any,
        { patient: true },
      );
      const perPerson = Array.isArray(written?.perPerson) ? written.perPerson.filter((p: any) => p?.participantId && p?.text?.trim()) : [];
      if (!written?.opening?.trim() || !perPerson.length) {
        this.logger.warn('The picture came back without an opening or without people; writing it plainly instead.');
        return fallback();
      }
      /* The count is the product's own arithmetic, never the model's wording of it. See theCountSaidRight. */
      return { opening: theCountSaidRight(written.opening.trim(), about.peopleAnswered, about.peopleExpected), perPerson };
    } catch (err: any) {
      this.logger.warn(`Writing the picture failed, so it is written plainly: ${err?.message}`);
      return fallback();
    }
  }

  /**
   * OPENING A REPORT NEVER ASKS A MODEL (decision 7).
   *
   * Every worded line is kept by its hash (a-line-worded-once-is-kept). Only the warm-up that runs
   * when something new comes in (`wordTheReadsFor`, after a synthesis or a release) may ask the model
   * to word a line that is not kept yet. Every other read - the lead opening the report, a
   * participant, an admin, the API - serves the kept wording, and the engine's own words where a
   * line has not been worded yet. Found 29 September 2026: the probe list and the coaching note were
   * worded by the model on the first open after every change.
   */

  private async phrase(what: string, drafts: Drafted[]): Promise<Record<string, string>> {
    const mayWord = WORDING_NEW_LINES.getStore() === true;
    const out = await wordedByTheModel(
      drafts,
      rememberedCompose(this.prisma, mayWord
        ? (system, draft) => this.anthropic.respond(system, [{ role: 'user', content: draft }])
        /* Kept lines only: nothing new is worded, and nothing is written, by opening. */
        : async () => null, mayWord),
      mayWord ? (why) => this.logger.warn(`Wording refused for ${what}, shipping the engine's own words: ${why}`) : undefined,
    ).catch(() => drafts);
    return Object.fromEntries(out.map((d) => [d.key, d.text]));
  }

  /** The same warm-up-only, kept-once wording as `phrase`, for pattern-evidence.ts's one-line-at-a-time compose. */
  private patternEvidenceCompose(): Compose {
    const mayWord = WORDING_NEW_LINES.getStore() === true;
    return rememberedCompose(this.prisma, mayWord
      ? (system, draft) => this.anthropic.respond(system, [{ role: 'user', content: draft }])
      /* Kept lines only: nothing new is worded, and nothing is written, by opening. */
      : async () => null, mayWord);
  }

  /**
   * WHAT THE READS OF A ROUND ARE BUILT FROM, AS ONE FINGERPRINT (decision 44).
   *
   * Read when a warm-up starts. If it is the same as the last warm-up of this round read, nothing
   * new has come in and the warm-up does nothing: the report, its release, the round's own row, the
   * record's lines and documents, the finished check-ins and who is in the check-in. Any of those
   * moving is something new, and the reads are worded again.
   *
   * It waits first for any synthesis of this ground that is running or queued, because the reads are
   * built from the report it is about to write: warming the report it is replacing would ask the
   * model for lines nobody will read. A read that fails gives no fingerprint, and the warm-up runs.
   */
  private async whatTheReadsAreBuiltFrom(groundId: string, sessionNumber: number): Promise<string | null> {
    for (let tries = 0; tries < 50; tries++) {
      const queued = this.synthesisQueue?.get(groundId);
      if (!queued) break;
      await queued.catch(() => undefined);
      await new Promise((r) => setImmediate(r));
    }
    const [report, round, lines, docs, done, people] = await Promise.all([
      this.prisma.report.findUnique({ where: { groundId }, select: { updatedAt: true, releasedAt: true } }),
      this.prisma.reportRound.findUnique({ where: { groundId_sessionNumber: { groundId, sessionNumber } }, select: { takenAt: true, amendedAt: true } }),
      this.prisma.recordEntry.aggregate({ where: { disputedAt: null, participant: { groundId } }, _count: { _all: true }, _max: { createdAt: true } }),
      this.prisma.groundDocument.count({ where: { groundId } }),
      this.prisma.checkIn.count({ where: { groundId, status: CheckInStatus.COMPLETED } }),
      this.prisma.groundParticipant.count({ where: { groundId } }),
    ]);
    return JSON.stringify([
      report?.updatedAt ?? null, report?.releasedAt ?? null, round?.takenAt ?? null, round?.amendedAt ?? null,
      (lines as any)?._count?._all ?? 0, (lines as any)?._max?.createdAt ?? null, docs, done, people,
    ]);
  }

  /**
   * WORD EVERY READ NOW, FOR EVERYBODY WHO WILL OPEN IT, WHILE SOMETHING NEW HAS COME IN.
   *
   * Runs each reader's report and session report once with the model allowed, so the lines they
   * will read are kept before anybody opens the page: the lead, each person in the check-in, and one
   * admin of the organisation (every admin reads the same drafts). A discovery session's direction
   * is read and kept here too, if it is not kept yet. Returns each reader's session report, so the
   * caller can keep what the round found. Best effort: a reader that fails is skipped.
   */
  async wordTheReadsFor(groundId: string, sessionNumber: number): Promise<{ userId: string; sessionReport: any }[]> {
    /* Once per new thing (decision 44): shared while one runs, skipped when nothing has changed. */
    return (this.readsWarming ?? new OneAtATime<{ userId: string; sessionReport: any }[]>()).run(`${groundId}:${sessionNumber}`, () => this.whatTheReadsAreBuiltFrom(groundId, sessionNumber), () => this.wordTheReadsNow(groundId, sessionNumber));
  }

  private async wordTheReadsNow(groundId: string, sessionNumber: number): Promise<{ userId: string; sessionReport: any }[]> {
    return WORDING_NEW_LINES.run(true, async () => {
      const ground = await this.prisma.ground.findUnique({
        where: { id: groundId },
        select: { organizationId: true, initiatorId: true, scenario: true, participants: { select: { userId: true, email: true } }, report: { select: { direction: true } } },
      } as any).catch(() => null) as any;
      if (!ground) return [];
      if (ground.scenario === 'DISCOVERY' && !ground.report?.direction) {
        await this.readAndKeepTheDirection(groundId).catch((err: any) => this.logger.warn(`Direction for ${groundId} failed: ${err?.message}`));
      }
      const inTheCheckIn = [...new Set([ground.initiatorId, ...(ground.participants ?? []).map((p: any) => p.userId)].filter(Boolean))] as string[];
      const anAdmin = await (this.prisma.user?.findFirst?.({
        where: { organizationId: ground.organizationId, role: 'ADMIN', id: { notIn: inTheCheckIn } } as any,
        select: { id: true },
      }) ?? Promise.resolve(null)).catch(() => null);
      const readers = [...inTheCheckIn, ...(anAdmin?.id ? [anAdmin.id] : [])];
      /* WEEK 25. Each reader's two reads are independent of every other reader's, and of each other, so
         readers are warmed together, four at a time, and handed back in the order they were listed.
         A line two readers share is still asked once (a-line-worded-once-is-kept shares it). */
      const out = await runAtOnce(readers, READERS_WARMED_TOGETHER, async (userId) => {
        const sessionReport = await this.sessionReport(groundId, sessionNumber, userId, ground).catch(() => undefined);
        await this.get(groundId, userId, ground).catch(() => undefined);
        return { userId, sessionReport };
      });
      /* Logged here, where the work is done, so a warm-up that was shared or skipped is not counted. */
      this.logger.log(`Reads warmed for ${groundId}, session ${sessionNumber}, ${readers.length} reader(s).`);
      return out;
    });
  }

  /**
   * WHAT IS THIN IN YOUR OWN ACCOUNT, AND WHAT WOULD FIX IT. YOURS, TO YOU.
   *
   * `softSpots` and `whatWouldRaiseIt` already existed and rendered on the ground report for the
   * lead, per participant (G34: the lead's, and nobody else's). The specificity meter on the session
   * page gestured at the same thing with a hand-written sentence. So the person themselves never saw
   * the engine's read of their own thinness, only their manager did.
   *
   * G34 is about not showing one person's spots to another. Showing yours to you is the opposite
   * case, and it is not behind CONFIDENCE_ENABLED because that flag gates what a lead may read
   * about others, not what you may read about yourself. Every spot travels with what would raise
   * it, which is G34's own guarantee, kept here.
   */
  private async myOwnSoftSpots(groundId: string, participantId: string) {
    /*
     * EACH READ STARTS INSIDE A PROMISE. A missing method on the client throws synchronously while
     * the array is still being built, which leaves a sibling read that has already started - and
     * already rejected - with no handler. Node treats that as fatal. Seen as a jest worker dying
     * under the-record-read-reaches-the-payload.spec, whose whole point is that a failing read must
     * never take the report down.
     */
    const start = <T,>(f: () => Promise<T>): Promise<T> => Promise.resolve().then(f);
    const [rows, docs, done] = await Promise.all([
      start(() => this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participant: { groundId } },
        select: { participantId: true, type: true, text: true, checkIn: { select: { sessionNumber: true } } },
      })),
      start(() => this.prisma.groundDocument.findMany({ where: { groundId }, select: { participantId: true, fileName: true } })),
      start(() => this.prisma.checkIn.count({ where: { participantId, status: CheckInStatus.COMPLETED } })),
    ]);
    const entries: EntryRow[] = rows
      .filter((r) => !!r.participantId)
      .map((r) => ({ participantId: r.participantId as string, type: String(r.type), text: r.text, sessionNumber: r.checkIn?.sessionNumber ?? 1 }));
    const shape = accountShapeFor(participantId, entries, docs.map((d) => ({ participantId: d.participantId, name: d.fileName })), done);
    return softSpots(shape).map((f) => ({ line: f.line, wouldRaiseIt: whatWouldRaiseIt(f.spot) }));
  }

  /**
   * `asOf`: the record as it stood when an earlier session closed (request 102), so that session's own
   * report is coached and probed on what was there then, never on a later session. Without it, the
   * record as it is now, as the main report reads it.
   */
  private async whatTheRecordHoldsFor(groundId: string, ground: any, asOf?: AsOfARound) {
    const [detectionsNow, dependenciesNow, entriesNow, docsNow, sessionsNow] = await Promise.all([
      /* Not even read while patterns are not served. */
      PATTERNS_ARE_SERVED
        ? this.prisma.patternDetection.findMany({
          where: { groundId },
          orderBy: { lastSeenAt: 'desc' },
          select: PATTERN_ROW_SELECT,
        })
        : Promise.resolve([] as APatternRow[]),
      this.prisma.groundDependency.findMany({
        /* As of an earlier session, a wait cleared since then was still open then. */
        where: asOf ? { groundId } : { groundId, status: { in: ['WAITING', 'BLOCKING'] as any } },
        select: {
          fromParticipantId: true, onParticipantId: true, onLabel: true,
          what: true, createdAt: true, updatedAt: true, escalatedAt: true, triedSaid: true,
          /* What kind of thing is in the way, and therefore who can move it. The row has carried
             this all along and both coaching surfaces said "waiting on X" without reading it. */
          blockerKind: true,
          ...(asOf ? { status: true, clearedAt: true } : {}),
        },
      }),
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participant: { groundId } },
        select: { participantId: true, type: true, text: true, recallBased: true, saidWordForWord: true, ...(asOf ? { checkIn: { select: { sessionNumber: true } } } : {}) },
      }),
      this.prisma.groundDocument.findMany({ where: { groundId }, select: { participantId: true, ...(asOf ? { createdAt: true } : {}) } }),
      this.prisma.checkIn.findMany({
        where: { groundId, status: CheckInStatus.COMPLETED },
        select: { participantId: true, sessionNumber: true, completedAt: true, isSetup: true },
      }),
    ]);
    /*
     * THE RECORD AS IT STOOD WHEN THAT SESSION CLOSED (request 102). Its own sessions and lines, the
     * waits raised by then and not cleared by then (taken further only if that was by then), documents
     * added by then, and each pattern counted only over the periods it had been seen in by then. How
     * long somebody had been waiting is counted to the day it closed, not to today.
     */
    const cut = asOf ? new Date(asOf.at).getTime() : null;
    const by = (d: unknown) => cut === null || (!!d && new Date(d as any).getTime() <= cut);
    const sessions = asOf ? sessionsNow.filter((c) => c.sessionNumber <= asOf.sessionNumber) : sessionsNow;
    const entries = asOf
      ? (entriesNow as any[]).filter((e) => typeof e.checkIn?.sessionNumber !== 'number' || e.checkIn.sessionNumber <= asOf.sessionNumber) as typeof entriesNow
      : entriesNow;
    const docs = asOf ? (docsNow as any[]).filter((d) => !d.createdAt || by(d.createdAt)) as typeof docsNow : docsNow;
    /*
     * NOBODY WAITS ON THEMSELVES, HERE TOO (request 117, part 6). Rukia's own "to approve a discount for Baraka
     * Mwangi and to send a price list to Amani Wekesa", stored as a wait on "themselves" before request 111 (e),
     * still reached her coaching note ("Put to approve a discount ... in writing") and the lead's probe list,
     * because the board left it out and this read did not. Her colleagues' own waits on her already say it:
     * "Baraka Mwangi and Amani Wekesa are waiting on you for the discount and the price list."
     */
    const dependenciesNowReal = (dependenciesNow as any[]).filter((d) => !aWaitOnOneself(d)) as typeof dependenciesNow;
    const dependencies = asOf
      ? (dependenciesNowReal as any[])
        .filter((d) => by(d.createdAt))
        .filter((d) => ['WAITING', 'BLOCKING'].includes(String(d.status)) ? true : !!d.clearedAt && !by(d.clearedAt))
        .map((d) => ({ ...d, escalatedAt: d.escalatedAt && by(d.escalatedAt) ? d.escalatedAt : null })) as typeof dependenciesNow
      : dependenciesNowReal;
    const detections = asOf
      ? (detectionsNow as APatternRow[]).map((r) => patternRowAsOfSession(r, asOf.period))
      : detectionsNow;
    /*
     * HOW LONG IS MEASURED TO THE RECORD'S OWN CLOCK, NEVER THE READING (request 117, part 9). The coaching said
     * "for 5 days" where the board's row said 4, and both moved each time the page was opened. The clock is the
     * newest thing this record holds: a finished check-in, a wait raised or changed, or the report rewritten. A
     * closed session's own report is measured to the day it closed, as before. And each wait is said with the day
     * it began.
     */
    const recordsClock = cut !== null ? new Date(cut) : theRecordsClock([
      ...(sessions as any[]).map((c) => c.completedAt),
      ...(dependencies as any[]).flatMap((d) => [d.createdAt, d.updatedAt]),
      ground?.report?.updatedAt,
    ], new Date());
    const now = recordsClock.getTime();
    const wholeDays = (d: Date) => Math.max(0, Math.floor((now - new Date(d).getTime()) / 86400000));
    const since = (d: Date) => theDayItBegan(d, recordsClock);
    /* Every row, for the two builders to narrow to their reader: the coaching note to the person's own,
       the probe list to what the lead may read. See patterns/who-reads-a-pattern. */
    return { detections, dependencies, entries, docs, sessions, wholeDays, since, ground };
  }

  /**
   * THE COACHING THE BOARD SERVES, UNDER THE REPORT'S OWN PRIVACY AND BUILT BY THE REPORT'S OWN BUILDERS
   * (request 79 b). Nothing here is written a second time: the note is `coachingNoteFor` and the list for
   * the lead is `whatToProbeOn`, the two the report serves.
   *
   *   yours       the reader's own coaching note, for anyone who takes part (the lead included), about
   *               themselves only, exactly as the report serves it.
   *   eachPerson  what to ask each person, for whoever runs the check-in (the lead, or the admin who set
   *               it up) and for an admin with access to it (decision 93, row 9), and nobody else. This is what the report gives
   *               the lead in place of other people's notes, which the report never serves to anybody but
   *               the person.
   *
   * Null when there is nothing to serve, so the board draws nothing rather than an empty block.
   */
  async coachingForTheBoard(groundId: string, requestingUserId: string, opts: { adminReadsIt?: boolean } = {}): Promise<{ yours: any; eachPerson: any } | null> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { participants: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }, report: true },
    });
    if (!ground) return null;
    const participant = (ground.participants as any[]).find((p) => p.userId === requestingUserId) ?? null;
    /* Whoever runs it, and an admin with access to it (decision 93, row 9); the caller says whether the admin has access. */
    const patternRunsIt = runsItForAPattern(ground as any, requestingUserId);
    const runsIt = patternRunsIt || !!opts.adminReadsIt;
    if (!participant && !runsIt) return null;

    const labels = labelsForParties(ground.participants as any);
    const names = namesVisibleTo(participant?.id ?? null, ground.participants as any, this.peersAreNamed(ground as any, participant?.id ?? null));
    const plainNameOf = (id: string): string | null => {
      const label = labels.get(id);
      return (label ? names.get(label) : undefined) ?? label ?? null;
    };
    const nameOf = (id: string | null, fallback: string | null): string | null => {
      if (!id) return fallback;
      if (participant && id === participant.id) return 'you';
      const label = labels.get(id);
      return (label ? names.get(label) : undefined) ?? label ?? fallback;
    };
    const quotable = await theRecordAQuoteMayComeFrom(this.prisma as any, groundId);
    const [note, probes] = await Promise.all([
      participant
        ? this.coachingNoteFor(groundId, ground as any, participant, nameOf).catch((err) => {
          this.logger.warn(`Could not build the coaching note for the board, ${participant.id}: ${err?.message}`);
          return null;
        })
        : Promise.resolve(null),
      runsIt && (ground as any).cadence !== Cadence.ONE_TIME
        /* AN ADMIN WHO ONLY READS GETS THE LIST WITHOUT ITS PATTERNS (decision 58; decision 139, item 1). Decision 93
           gave her what to ask each person; a pattern, and the line built from it ("Presents well, delivers late,
           more than once. On record across 3 sessions."), stays with whoever runs the check-in. Read in the final
           evaluation on Grace's board, three profiles running. */
        ? this.whatToProbeOn(groundId, ground as any, true, nameOf, plainNameOf, undefined, { withPatterns: patternRunsIt }).catch((err) => {
          this.logger.warn(`Could not build the probe list for the board, ${groundId}: ${err?.message}`);
          return null;
        })
        : Promise.resolve(null),
    ]);
    const blame = (note || probes) ? await this.theBlameHeld(groundId, participant?.id) : null;
    const yours = this.readAsItWillBeRead(note, groundId, 'the coaching note', quotable, blame);
    const eachPerson = this.readAsItWillBeRead(probes, groundId, 'the probe list', quotable, blame && { ...blame, speaker: null });
    if (!yours && !eachPerson) return null;
    return { yours: yours ?? null, eachPerson: eachPerson ?? null };
  }

  /**
   * WHICH SESSION THIS IS, BY THE BOARD'S OWN CLOCK (screens request 117, part 3).
   *
   * The sales board's header said "Session 1 of 12" while the coaching note said "This is session 2" and the
   * lead's questions said Baraka "has not answered this session", though the same board said he had checked
   * in. Three counts: the header the open round among the people who check in (one-count-for-the-sessions),
   * the coaching note the reader's own newest check-in, and the questions the highest row anybody had, rows
   * written ahead of time included. All three now read this one: the open round among the people who check
   * in (nobody an admin has not let in holds it back, decision 77), capped at the last planned session.
   */
  private async theBoardsClock(groundId: string, ground: any): Promise<{ current: number; planned: number | null }> {
    const rows = ((await (this.prisma.checkIn?.findMany?.({
      where: { groundId },
      select: { participantId: true, sessionNumber: true, status: true, isSetup: true, availableFrom: true, startedAt: true, completedAt: true },
    }) ?? Promise.resolve([] as any[]))?.catch?.(() => [] as any[])) ?? []) as any[];
    const givers = new Set(((ground?.participants ?? []) as any[]).filter((p) => !p.managingOnly && !isNotLetInYet(p)).map((p) => p.id));
    const planned = totalSessionsFor(ground?.timelineDays, ground?.cadence) ?? null;
    const clock = theSessionClock(rows.filter((c) => !c.isSetup) as any, givers, planned);
    return { current: clock.currentSession, planned: clock.plannedSessions };
  }

  /**
   * WHAT THIS PERSON SHOULD WORK ON NEXT, built from four things rather than from one session.
   *
   * SURFACED only. A CANDIDATE is the engine's first read and has not survived the three-period
   * rule, and telling somebody a candidate observation about themselves as though it were settled
   * is exactly the accusation this product refuses to make.
   */
  private async coachingNoteFor(
    groundId: string,
    ground: any,
    participant: { id: string; roleAsDescribed?: string | null; partyType?: string | null },
    nameOf: (participantId: string | null, fallback: string | null) => string | null,
    /* That session's record only, for the report of a session that has closed (request 102). */
    asOf?: AsOfARound,
  ) {
    /* No coaching note for a discovery participant: they were asked as experts, not people being developed. */
    if (ground.scenario === 'DISCOVERY') return null;
    const held = await this.whatTheRecordHoldsFor(groundId, ground, asOf);
    const mine = held.entries.filter((e) => e.participantId === participant.id);
    const allMine = held.sessions.filter((c) => c.participantId === participant.id);
    /* A set-up conversation is not a check-in: a person whose only conversation is one gets no coaching about it,
       and where there are real check-ins, the set-up is not counted among them. */
    if (allMine.length > 0 && allMine.every((c: any) => c.isSetup)) return null;
    const mySessions = allMine.filter((c: any) => !c.isSetup);
    /*
     * NOTHING IS SAID ABOUT A SESSION UNTIL THERE IS ONE (B-164). A lead who had not checked in read "Everything in your session came from memory",
     * "This is session 1 of 6 of your work as head of sales" and "Nothing here says what kind of work this is". She had no session to speak of.
     */
    if (mySessions.length === 0) {
      return theNoteBeforeYouHaveCheckedIn();
    }
    /* Office work has documents; a tractor, a cold store and a rice mill do not. See TheirOwnRecord.documentsExpected. */
    const documentsExpected = !['COHORT_CHECK', 'DISCOVERY', 'SNAPSHOT'].includes(String(ground.scenario));
    /* The product's finding about this person, from the report: the first thing the note says. */
    /* The findings are the latest report's, so a closed session's own note does not read them. */
    const myFinding = asOf ? undefined : (Array.isArray(ground.report?.findings) ? (ground.report.findings as any[]) : []).find((f) => f.participantId === participant.id);
    const findingLines: string[] = myFinding?.hasGap && myFinding.text
      ? String(myFinding.text).split(/(?<=[.!?])\s+/).filter((l: string) => /count moved|two numbers|Nothing they have reported since|is in the way|The lead set/.test(l)).slice(0, 2).map((l: string) => l.replace(/^Nothing they have reported since/, 'Nothing you have reported since').replace(/^The lead set ([^ ]+) for them/, 'The lead set $1 for you').replace(/their own number/, 'your own number'))
      : [];
    const theirNewest = mySessions.length ? Math.max(...mySessions.map((c) => c.sessionNumber)) : 1;
    /* One count for the sessions: the board's own clock, except on a closed session's own report, which is
       about that session (request 117, part 3). */
    const clock = asOf ? null : await this.theBoardsClock(groundId, ground);
    const sessionNumber = clock ? clock.current : theirNewest;
    const planned = clock?.planned ?? (ground.checkIns ?? []).reduce((n: number, c: any) => Math.max(n, c.sessionNumber ?? 0), 0);

    const map = roleMapFor((participant as any).detectedFunction);
    const thisOneIsTheClosingSession = !!(await this.prisma.checkIn.findFirst({
      where: { groundId, participantId: participant.id, sessionNumber: theirNewest, isFinal: true },
      select: { id: true },
    }));
    /* The board's numbers, for the sentences that are about this person's share of them. */
    const theBoardNumbers = await (this.prisma.groundObjective?.findMany?.({
      where: { groundId }, select: { name: true, target: true, ownerParticipantId: true },
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);
    const theWholeNumber = (theBoardNumbers as any[]).find((o: any) => !o.ownerParticipantId && typeof o.target === 'number');
    const theOwnedNumbers = (theBoardNumbers as any[]).filter((o: any) => o.ownerParticipantId && typeof o.target === 'number');
    const theirOwnNumber = theOwnedNumbers.find((o: any) => o.ownerParticipantId === participant.id);

    const note = whatToWorkOnNext({
      /* Their own, after three periods, and nobody else's. See patterns/who-reads-a-pattern. */
      patterns: patternRowsThisReaderMayRead(held.detections, { participantId: participant.id, runsIt: false })
        .map((d) => ({ code: d.code, periodsObserved: periodsSeen(d) })),
      /*
       * NEVER THE LEAD'S SENTENCE ABOUT THIS PERSON, EVEN HERE (decision 30). This note is served
       * to the very person `roleAsDescribed` is about, and it used to hand that field to
       * `whatToWorkOnNext` unguarded - safe today only because `roleToSay` below happens to also be
       * passed and preferred, which is an accident of two fields agreeing, not a rule. Both fields
       * now carry the same guarded value: their own words at setup for a lead, nothing for anyone
       * else. See aRoleInTheirOwnWords.
       */
      role: aRoleInTheirOwnWords(participant as any),
      /* Said to this person only in their own words, never the lead's sentence about them (request 36). */
      /* Said to her as "your work as …" only when it is a role, never a piece of an answer (staging test, 15 October). */
      roleToSay: aRoleOrNothing(aRoleInTheirOwnWords(participant as any)),
      /*
       * THE COLUMN THAT SELECTS THE ROLE MAP, read here for the first time on this page. See
       * whichRoleMap: below MIN_COACHING_CONFIDENCE there is no map and the note says why, rather
       * than coaching somebody against a function nobody established.
       */
      detectedFunction: (participant as any).detectedFunction ?? null,
      functionConfidence: (participant as any).detectedFunctionConfidence ?? null,
      /*
       * ALWAYS NULL HERE, AND THAT IS A WALL RATHER THAN A GAP.
       *
       * The map's `failureSignals` are paired with `successSignals`, and finding which one applies
       * to a person means reading `coachingState.staircase` - what they were asked to work on and
       * what they did not manage, given voluntarily on the understanding that it was for them.
       *
       * `coaching-can-never-justify-a-firing.spec.ts` makes reports.service one of five files with
       * no path to that table, deliberately, and it reads the source rather than the behaviour so
       * that adding the import fails. I added the import; it failed; it was right to.
       *
       * The argument is not only that a firing could be justified with it. It is that people would
       * work out that it could, and stop answering honestly, which destroys the layer in the same
       * motion. And this read feeds the LEAD's probe list as well as the private note.
       *
       * So the paired signals do not reach this page. Everything else in the map is per-function
       * rather than per-person and carries no such risk.
       */
      noticedBehaviour: null,
      sessionNumber,
      totalSessions: planned > 0 ? planned : null,
      /* A lead can close early, so the count cannot tell you this. See CoachingInputs.isFinalSession. */
      isFinalSession: thisOneIsTheClosingSession,
      scenario: ground.scenario ?? null,
      waitingOn: held.dependencies
        .filter((d) => d.fromParticipantId === participant.id)
        .map((d) => ({
          what: d.what,
          /* `onLabel` is whatever the extraction captured and is often a thing rather than a
             person - "the on-call rota" - which turned into "waiting for X from the on-call rota".
             Only a resolved participant is somebody you can be waiting on. */
          who: d.onParticipantId ? nameOf(d.onParticipantId, null) : null,
          daysOld: held.wholeDays(d.createdAt),
          since: held.since(d.createdAt),
          escalated: itWasTakenFurther(d),
          kind: (d.blockerKind as any) ?? null,
        })),
      holdingUp: held.dependencies
        .filter((d) => d.onParticipantId === participant.id)
        .map((d) => ({
          what: d.what,
          who: nameOf(d.fromParticipantId, null),
          daysOld: held.wholeDays(d.createdAt),
          since: held.since(d.createdAt),
          escalated: itWasTakenFurther(d),
          kind: (d.blockerKind as any) ?? null,
        })),
      saidSomethingSpecific: mine.length > 0,
      anythingDocumented: mine.some((e) => !e.recallBased),
      documentsExpected,
      /*
       * AND THE PART THAT IS ABOUT THIS ONE PERSON. 4.4.
       *
       * Everything above is about a role, a stage or a blocker. These are sentences carrying a
       * figure or a thing off their own lines, so none of them could be said to anybody else. See
       * what-your-own-record-says.
       */
      aboutYou: whatYourOwnRecordSays({
        whole: theWholeNumber ? { name: theWholeNumber.name, target: theWholeNumber.target! } : null,
        peopleWithANumber: theOwnedNumbers.length,
        peopleInIt: ground.participants.filter((p: any) => !p.managingOnly).length,
        theirs: theirOwnNumber ? { name: theirOwnNumber.name, target: theirOwnNumber.target! } : null,
        standsAt: null,
        promises: mine
          .filter((e: any) => String(e.kind ?? '').toUpperCase().includes('COMMIT'))
          .map((e: any) => ({ what: e.text ?? '', hasDate: !!e.dueDate || /\b(by|on)\b.{0,20}\d/i.test(e.text ?? '') })),
        anythingDocumented: mine.some((e) => !e.recallBased),
        documentsExpected,
        findingLines,
      }),
    });

    /*
     * THE ROLE MAP'S OWN FIELDS ARE NOT REWORDED. They are somebody's considered sentences about a
     * function, written once and read by everybody in it, and a model paraphrasing them per reader
     * would drift the one thing here that is meant to be stable. What varies is the part built by
     * substitution: the actions, and the sentence around the map.
     */
    /*
     * AND WHAT THE ROWS SAY, HELD INTACT THROUGH THE REWORDING.
     *
     * Every awaited or blocked item is somebody's own words for the thing they are owed. Driven
     * live, "a named on-call person published by Friday each week" came back as "Each Friday, give
     * Hafsah ... a named on-call person": the cadence moved from the item to the action, which is a
     * different claim, and no number or name changed so nothing caught it.
     */
    const rows = [
      ...held.dependencies.map((d) => d.what.replace(/[.\s]+$/, '')),
      /* And the library's own sentences about the kind of blocker, which are claims, not wording. */
      ...Object.values(WHAT_IT_MEANS), ...Object.values(WHO_CAN_MOVE_IT),
    ];
    /*
     * THE ROLE MAP IS CONTEXT FOR WHAT TO SAY, NOT A QUOTATION.
     *
     * The first version held the map's sentences verbatim through the wording pass, so every person
     * in the same function read the same paragraph and the box read as a quotation from a manual.
     * Read back: "seems to be quoting directly from the role map instead of using it as context".
     * The claims are unchanged - what on track means, what going wrong looks like, what this work
     * gets read as unfairly - and the words are now the model's, under the same guard as every other
     * line. Only the ROWS - what somebody is waiting for - stay held word for word, because those are
     * somebody's own words for the thing they are owed.
     */
    const mapContext = note.role
      ? `What on track looks like in ${note.role.label.toLowerCase()} work: ${note.role.onTrack} What going wrong looks like: ${note.role.goingWrong} How this work gets read unfairly: ${note.role.protectAgainst}`
      : undefined;
    const said = await this.phrase('the coaching note', [
      /* Written FROM the map, never quoting it. See Drafted.context. */
      { key: 'whyItMatters', text: note.whyItMatters, context: mapContext },
      ...(note.role ? [
        /*
         * THE SEED SENTENCE SAID NOTHING, SO THE MODEL WROTE FILLER AROUND IT.
         *
         * It was "This kind of work is often read unfairly, and that is worth knowing before you
         * read anything into where you stand." - a preamble with no content in it. Read live on the
         * tea ground under the heading "Where this kind of work gets misread":
         *
         *   "The buyer-side process takes weeks, and most of it is invisible to you, so silence is
         *    just a stage. It is worth knowing how unfairly this kind of work can be read before
         *    you draw any conclusions about where you stand."
         *
         * The first sentence is the map earning its place. The second is the empty seed coming back
         * out, and it is the exact voice she has flagged twice: "this kind of work often faces
         * unfair reading". A wording pass cannot add substance to a draft that has none, so the
         * draft is the map's own claim now and the pass does what it is for - putting it in plain
         * words for this reader rather than quoting a manual at them.
         */
        {
          key: 'protectAgainst',
          text: note.role.protectAgainst,
          context: `This is about ${note.role.label.toLowerCase()} work. Say the thing itself, plainly, as one sentence to the person doing it. `
            + 'Never open with a preamble about what is worth knowing, and never use the words "this kind of work".',
        },
      ] : []),
      ...note.beforeNextTime.map((t, n) => ({
        key: `a${n}`,
        text: t,
        mustKeep: rows.filter((r) => t.includes(r)),
      })),
    ]);
    return this.holdTheEnginesOwnLines({
      ...note,
      whyItMatters: said.whyItMatters ?? note.whyItMatters,
      role: note.role ? {
        ...note.role,
        /* Only the fairness line is shown as its own block; it is written from the map, not lifted. */
        protectAgainst: said.protectAgainst ?? note.role.protectAgainst,
      } : null,
      beforeNextTime: note.beforeNextTime.map((t, n) => said[`a${n}`] ?? t),
    }, note);
  }

  /**
   * WHERE THE RECORD IS CUT FOR ONE SESSION'S OWN REPORT (request 102). Nothing for the session the report
   * holds now, which reads the record as it is. For an earlier one, the moment it closed: its kept round,
   * or else the last answer given in it.
   */
  private async whereThisSessionIsCut(groundId: string, sessionNumber: number, closedAt: Date | null, period: number): Promise<AsOfARound | undefined> {
    const holds = await theSessionTheReportHolds(this.prisma, groundId);
    if (sessionNumber >= holds) return undefined;
    const lastAnswer = closedAt ? null : await (this.prisma.checkIn?.findFirst?.({
      where: { groundId, sessionNumber, status: CheckInStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }) ?? Promise.resolve(null)).catch(() => null);
    return { sessionNumber, at: closedAt ?? (lastAnswer as any)?.completedAt ?? new Date(), period };
  }

  /**
   * THE COACHING NOTE, THE PROBE LIST AND THE INFERENCES OF ONE SESSION, FOR ITS OWN REPORT (request 102).
   *
   * For the session the report holds now, the same as `GET /report` serves. For an earlier session,
   * built from the record as it stood when that session closed (see whatTheRecordHoldsFor), and the
   * inferences that session's synthesis kept (see each-sessions-inferences-are-its-own). Who is sent
   * what is the same as `GET /report`: the coaching note to a person who takes part, about themselves;
   * the probe list to whoever runs the check-in (the lead, or the admin who set it up); the inferences
   * to the lead and an admin who reads the report as the lead does. A field a reader is not given is
   * not sent at all.
   */
  private async thisSessionsOwnCoaching(
    groundId: string,
    ground: any,
    sessionNumber: number,
    me: { id: string } | null,
    requestingUserId: string,
    viewerIsLead: boolean,
    closedAt: Date | null,
    period: number,
  ): Promise<{ coaching?: any; probes?: any; inferences?: any[] }> {
    const holds = await theSessionTheReportHolds(this.prisma, groundId);
    const asOf = await this.whereThisSessionIsCut(groundId, sessionNumber, closedAt, period);
    const labels = labelsForParties(ground.participants as any);
    const names = namesVisibleTo(me?.id ?? null, ground.participants as any, this.peersAreNamed(ground as any, me?.id ?? null));
    const plainNameOf = (id: string): string | null => {
      const label = labels.get(id);
      return (label ? names.get(label) : undefined) ?? label ?? null;
    };
    const nameOf = (id: string | null, fallback: string | null): string | null => {
      if (!id) return fallback;
      if (me && id === me.id) return 'you';
      const label = labels.get(id);
      return (label ? names.get(label) : undefined) ?? label ?? fallback;
    };
    const runsIt = runsItForAPattern(ground as any, requestingUserId);
    const [note, probes, stored] = await Promise.all([
      me
        ? this.coachingNoteFor(groundId, ground, me as any, nameOf, asOf).catch((err) => {
          this.logger.warn(`Could not build session ${sessionNumber}'s coaching note for ${me.id}: ${err?.message}`);
          return null;
        })
        : Promise.resolve(null),
      runsIt && ground.cadence !== Cadence.ONE_TIME
        ? this.whatToProbeOn(groundId, ground, true, nameOf, plainNameOf, asOf).catch((err) => {
          this.logger.warn(`Could not build session ${sessionNumber}'s probe list for ${groundId}: ${err?.message}`);
          return null;
        })
        : Promise.resolve(null),
      viewerIsLead
        ? (this.prisma.report?.findUnique?.({ where: { groundId }, select: { inferences: true } }) ?? Promise.resolve(null)).catch(() => null)
        : Promise.resolve(null),
    ]);
    const quotable = (note || probes) ? await theRecordAQuoteMayComeFrom(this.prisma as any, groundId) : [];
    const blame = (note || probes) ? await this.theBlameHeld(groundId, (me as any)?.id) : null;
    return {
      ...(me ? { coaching: this.readAsItWillBeRead(note, groundId, 'the coaching note', quotable, blame) ?? null } : {}),
      ...(runsIt ? { probes: this.readAsItWillBeRead(probes, groundId, 'the probe list', quotable, blame && { ...blame, speaker: null }) ?? null } : {}),
      ...(viewerIsLead ? { inferences: theInferencesOfSession((stored as any)?.inferences, sessionNumber, holds) } : {}),
    };
  }

  /**
   * WHAT TO PROBE EACH PERSON ON. THE LEAD, AND NOBODY ELSE.
   *
   * Guarded here rather than in the shape: a surface that is lead-only because a caller remembered
   * to check is one refactor away from not being.
   *
   * `opts.withPatterns` is false for an admin who reads the list without running the check-in
   * (decision 93 gives her the list; decisions 58 and 139 keep every pattern line from her).
   */
  private async whatToProbeOn(
    groundId: string,
    ground: any,
    viewerIsLead: boolean,
    nameOf: (participantId: string | null, fallback: string | null) => string | null,
    /** The same resolver without the second-person substitution, for headings. */
    nameOf2: (participantId: string) => string | null,
    /* That session's record only, for the report of a session that has closed (request 102). */
    asOf?: AsOfARound,
    opts = { withPatterns: true },
  ) {
    if (!viewerIsLead) return null;
    const held = await this.whatTheRecordHoldsFor(groundId, ground, asOf);
    /*
     * WHICH ROUND THIS IS, FROM THE READ THAT ALWAYS HAS IT.
     *
     * `ground.checkIns` is not selected on every path into here, and where it is missing this fell
     * back to 1 - which made `earlyDays` true, and printed "with no escalation on record. This early
     * that is worth showing them rather than asking about" on the sixth and final session of a
     * three-month engagement. `held.sessions` is the completed-check-in read this function already
     * does, so it is the same number and it is always there.
     */
    const fromTheRecord = Math.max(0, ...held.sessions.map((c: any) => c.sessionNumber ?? 0));
    const fromTheGround = (ground.checkIns ?? []).reduce((n: number, c: any) => Math.max(n, c.sessionNumber ?? 0), 0);
    const planned = Math.max(fromTheRecord, fromTheGround);
    /* The round a closed session's own report is about is that session, whatever came after it. Otherwise the
       board's own clock, so "has not answered this session" counts the session the header names (request 117,
       part 3). */
    const thisRound = asOf ? asOf.sessionNumber : (await this.theBoardsClock(groundId, ground)).current || (planned > 0 ? planned : 1);

    /*
     * NOBODY THE ORGANISATION HAS NOT LET IN (request 85, request 101 b). Faraji Odhiambo, whom an
     * admin had not let in, was listed with "has not answered this session", which asks the lead to
     * chase somebody who cannot check in. The board says what happened to him instead.
     */
    const notInYet = await whoIsNotLetInYet(this.prisma, (ground.participants ?? []) as any[]);
    const reads = (ground.participants ?? [])
      .filter((p: any) => !p.managingOnly)
      .filter((p: any) => !notInYet.has(p.id))
      /* "What to ask each person" is about the others: it listed Rukia, who runs the sales board, to Rukia
         herself (request 111 e). The reader's own row is the one the resolver says as "you". */
      .filter((p: any) => (nameOf(p.id, null) ?? '').trim().toLowerCase() !== 'you')
      .map((p: any) => {
        const mine = held.entries.filter((e) => e.participantId === p.id);
        const answered = held.sessions.some((c) => c.participantId === p.id && c.sessionNumber === thisRound);
        return whatToProbe({
          /*
           * THE LEAD'S OWN ROW IS HEADED WITH THEIR NAME, NOT "you".
           *
           * `nameOf` answers "you" for the reader, which is right inside a sentence and wrong as
           * the heading of a section in a list of people - it rendered a card titled "you" above
           * two cards titled by name. `nameOf2` is the same resolver without that substitution.
           */
          who: nameOf2(p.id) ?? 'A colleague',
          /* Inside a sentence, the reader's own row is "you" (request 107 b). */
          whoInASentence: nameOf(p.id, null) ?? nameOf2(p.id) ?? 'a colleague',
          participantId: p.id,
          role: p.roleAsDescribed ?? null,
          answeredThisSession: answered,
          /* What the lead may read of this person's, and nothing sooner. See patterns/who-reads-a-pattern. */
          /*
           * THE PLAIN NAME, NEVER THE LIBRARY'S OWN SIGNAL. `patternCatalogue().get(d.code)?.signal`
           * is the detector's internal description ("Ownership claimed for work others delivered."),
           * written for whoever reads the detector, not for a lead. This printed straight onto the
           * probe list until decision 52: the same rule that keeps an internal name off a board kept
           * it off this list, so it reads the plain name from plain-pattern-names.ts, the one place
           * every other reader's pattern is named from. `patternRowsThisReaderMayRead` already
           * guarantees a plain name exists for every row it returns.
           */
          patterns: (opts.withPatterns ? patternRowsThisReaderMayRead(held.detections, { participantId: null, runsIt: true }) : [])
            .filter((d) => d.participantId === p.id)
            .map((d) => {
              const lib = patternCatalogue().get(d.code);
              return {
                code: d.code,
                periodsObserved: periodsSeen(d),
                signal: plainPatternNameOf(d.code)?.name ?? lib?.signal ?? d.code,
                probe: lib?.probe,
              };
            })
            .filter((x) => !ALIGNMENT_FEED_ONLY_CODES.has(x.code)),
          waitingOn: held.dependencies
            .filter((d) => d.fromParticipantId === p.id)
            .map((d) => ({
              what: d.what,
              /* `onLabel` is whatever the extraction captured and is often a thing rather than a
             person - "the on-call rota" - which turned into "waiting for X from the on-call rota".
             Only a resolved participant is somebody you can be waiting on. */
          who: d.onParticipantId ? nameOf(d.onParticipantId, null) : null,
              daysOld: held.wholeDays(d.createdAt),
              since: held.since(d.createdAt),
              escalated: itWasTakenFurther(d),
              kind: (d.blockerKind as any) ?? null,
            })),
          holdingUp: held.dependencies
            .filter((d) => d.onParticipantId === p.id)
            .map((d) => ({
              what: d.what,
              who: nameOf(d.fromParticipantId, null),
              daysOld: held.wholeDays(d.createdAt),
              since: held.since(d.createdAt),
              kind: (d.blockerKind as any) ?? null,
            })),
          concrete: mine
            .filter((e) => e.type === RecordEntryType.SUCCESS_DEFINITION || !e.recallBased)
            .map((e) => cleanText(e.text))
            .slice(0, 2),
          /* Only a line stamped as their own words is quoted as theirs (request 111 e). */
          concreteWordForWord: mine
            .filter((e) => (e.type === RecordEntryType.SUCCESS_DEFINITION || !e.recallBased) && (e as any).saidWordForWord === true)
            .map((e) => cleanText(e.text)),
          documentsAttached: held.docs.filter((d) => d.participantId === p.id).length,
          worries: mine.filter((e) => e.type === RecordEntryType.WORRY || e.type === RecordEntryType.TENSION).length,
          sessionNumber: thisRound,
          totalSessions: planned > 0 ? planned : null,
          scenario: ground.scenario ?? null,
        });
      });

    /* One call for the whole list rather than one per person: the same guard, a tenth of the
       calls, and the model sees the section as a section. */
    const drafts: Drafted[] = [];
    const rowWords = [
      ...held.dependencies.map((d) => d.what.replace(/[.\s]+$/, '')),
      ...Object.values(WHAT_IT_MEANS), ...Object.values(WHO_CAN_MOVE_IT),
    ];
    const keeping = (t: string) => rowWords.filter((r) => t.includes(r));
    reads.forEach((r: any, i: number) => {
      r.probe.forEach((t: string, n: number) => drafts.push({ key: `p${i}.${n}`, text: t, mustKeep: keeping(t) }));
      r.encourage.forEach((t: string, n: number) => drafts.push({ key: `e${i}.${n}`, text: t, mustKeep: keeping(t) }));
      drafts.push({ key: `u${i}`, text: r.triedToUnblock });
    });
    const said = await this.phrase('the probe list', drafts);
    return this.holdTheEnginesOwnLines(reads.map((r: any, i: number) => ({
      ...r,
      probe: r.probe.map((t: string, n: number) => said[`p${i}.${n}`] ?? t),
      encourage: r.encourage.map((t: string, n: number) => said[`e${i}.${n}`] ?? t),
      triedToUnblock: said[`u${i}`] ?? r.triedToUnblock,
    })), drafts.map((d) => d.text));
  }

  private async whatItRestsOn(
    groundId: string,
    parties: any[],
    viewerParticipantId: string | null,
    viewerIsLead: boolean,
  ) {
    const docs = await this.prisma.groundDocument.findMany({
      where: { groundId },
      select: { id: true, fileName: true, participantId: true, visibility: true, assessment: true },
    });
    if (!docs.length) return { documents: [], otherPartiesHave: 0, nothing: nothingRestsOnADocument() };

    return whatThisRecordRestsOn(
      docs.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        participantId: d.participantId,
        visibility: d.visibility,
        assessed: d.assessment !== null && d.assessment !== undefined,
      })),
      { participantId: viewerParticipantId, isLead: viewerIsLead },
      labelsForParties(parties as any),
      /* The same flag documents.service reads: off means every document is private to its
         uploader whatever the column says, and this list must agree with that. */
      this.config.get<boolean>('app.contextEnabled') === true,
    );
  }

  /**
   * THE LINES TAKEN FROM WHAT THIS PERSON SAID, AS ROWS, WITH THE PRESS THAT DISPUTES ONE.
   *
   * Theirs alone, so it is not gated on the shared report going out. It was: the pre-release branch
   * of `get` returned a shape with no myRows at all, and a report is released by the lead after
   * everybody has answered - so at the exact moment the close card exists for, somebody finishing
   * their own check-in, its two main blocks were structurally empty. Watched on a live board: six
   * extracted entries including a worry and an ask, and a card showing neither.
   *
   * Nothing here crosses a wall. These are the reader's own words, read back to the reader.
   */
  /**
   * WHAT THEY COULD TRY, ON THEIR OWN HALF, BESIDE THE BLOCKER IT BELONGS TO.
   *
   * Sits next to `theirOwnRows` because it answers to the same rule: this is the person's own half
   * and it does not wait on anybody else finishing. See what-you-could-try-next for why it is
   * computed rather than asked of the model.
   */
  private async whatTheyCouldTryNext(groundId: string, participantId: string | null | undefined) {
    if (!participantId) return [];
    const ground = await (this.prisma.ground?.findUnique?.({
      where: { id: groundId },
      select: { expectThemToUnblock: true },
    }) ?? Promise.resolve(null as any))?.catch?.(() => null) ?? null;
    /* Default TRUE, matching the column: a check-in that cannot be read still coaches. */
    const expects = ground?.expectThemToUnblock !== false;

    const mine = await (this.prisma.groundDependency?.findMany?.({
      where: { groundId, fromParticipantId: participantId, status: { in: ['BLOCKING', 'WAITING'] } },
      /*
       * `onLabel` is the name as the record captured it, which is what the person themselves said -
       * "Amina", "finance". Where it names a team rather than a person, `waysThrough` opens with
       * "find out who owns this by name", which is exactly the right first move.
       */
      select: { id: true, what: true, onLabel: true, onParticipantId: true, createdAt: true, triedSaid: true, escalatedAt: true },
    }) ?? Promise.resolve([] as any[]))?.catch?.(() => []) ?? [];
    /* Nobody waits on themselves, so nobody is told to "speak to themselves" (request 117, part 6). */
    const mineReal = (mine as any[]).filter((d) => !aWaitOnOneself({ ...d, fromParticipantId: participantId }));

    /*
     * THE SAME COLLAPSE THE BOARD DOES, BECAUSE THE ADVICE QUOTED THE STALE ROW.
     *
     * One live run recorded "a specific request" and "the finance dependency" as two blockers on
     * one person against one owner. The board showed two, and the ways through were drawn from the
     * older - so somebody with one problem was handed two lists, the first about a row they would
     * not recognise. The board deduped on read for exactly this reason and this path did not.
     */
    const theirs = oneBlockerPerThingWaitedOn(
      mineReal.map((d) => ({ ...d, fromParticipantId: participantId })) as any,
    ) as any[];

    /* How long it has sat is measured to the record's own clock, never the reading (request 117, part 9). */
    const finished = ((await (this.prisma.checkIn?.findMany?.({
      where: { groundId, status: CheckInStatus.COMPLETED }, select: { completedAt: true },
    }) ?? Promise.resolve([] as any[]))?.catch?.(() => [] as any[])) ?? []) as any[];
    const recordsClock = theRecordsClock([...finished.map((c) => c.completedAt), ...(mine as any[]).map((d) => d.createdAt)], new Date());
    return whatTheyCouldTry(
      theirs.map((d) => ({
        id: d.id,
        what: d.what,
        /* Only a resolved person is somebody you can be waiting on - a team cannot answer an email. */
        owner: d.onLabel ?? null,
        days: wholeDaysTo(d.createdAt, recordsClock),
        tried: (d.escalatedAt ? 'escalated' : (d.triedSaid ?? 'nothing')) as any,
        /*
         * Nothing stores a chase date on a dependency - `chaseBy` exists on Standing and on no
         * column - so this is null and `waysThrough` keeps offering "put a date on it in writing",
         * which is the right thing to offer somebody who has not got one.
         */
        chaseBy: null,
      })),
      expects,
    );
  }

  private async theirOwnRows(participantId: string | null | undefined) {
    if (!participantId) return [];
    /* Optional-chained like its neighbours: a caller whose prisma double stubs only what it needs
       must get an empty list, not a crash inside a report it was not asking about. */
    return (this.prisma.recordEntry?.findMany?.({
        where: { participantId },
        orderBy: [{ createdAt: 'asc' }],
        select: { id: true, participantId: true, type: true, text: true, disputedAt: true, documentSays: true, ...WHAT_A_MARK_READS, checkIn: { select: { id: true, sessionNumber: true } } },
      }) ?? Promise.resolve([] as any[]))
      .then(async (rows: any[]) => {
        /* How each of their own lines is known, by the one rule (week 6b). Read from stored columns. */
        const whoAdded = await whoAddedEachBackingDocument(this.prisma, rows);
        return rows.map((r) => {
          const mark = theMarkOf({ ...r, text: cleanText(r.text) }, whoAdded);
          return {
          id: r.id, type: r.type, text: cleanText(r.text), disputedAt: r.disputedAt,
          documented: !r.recallBased, documentSays: r.documentSays ?? null,
          mark,
          markSays: WHAT_EACH_MARK_SAYS[mark],
          /* Where the line comes from, in the end card's own words, so the own report and the card say it the same way
             (sales-first.md, section 5): "From the photo you added." only where a photo backs it. */
          how: howTheirLineIsKnown(r.type, mark, r.anchoredOrigin),
          /* What the line is called, filled in from the record, never from the kind the model gave it (night quality run 2). */
          ...(whatALineOfTheirsIsCalled({ type: r.type, text: cleanText(r.text), mark }) ? { typeSays: whatALineOfTheirsIsCalled({ type: r.type, text: cleanText(r.text), mark }) } : {}),
          checkInId: r.checkIn?.id ?? null, sessionNumber: r.checkIn?.sessionNumber ?? null,
          };
        });
      })
      .catch(() => [] as any[]);
  }


  /**
   * THE DIRECTION A DISCOVERY SESSION IS FOR, AND THE READ THE PERSON WHO ANSWERED GETS BACK.
   *
   * Only on a discovery ground, because only there is it what the session was run to produce. It is
   * computed at the read rather than stored: the accounts it reads are already stored, and a
   * direction that goes stale the moment somebody else answers is worse than one built when asked.
   *
   * Fails to null, never to a broken report. A lead whose model call times out gets the shared
   * picture they would have got anyway; they do not get an error page.
   */
  private async theDirectionFrom(ground: any, viewerLabel: string | null) {
    if (ground.scenario !== 'DISCOVERY') return null;
    /*
     * READ ONCE, SERVED FROM THE ROW. Computed on every read, a twenty-four-account direction timed out
     * on every read and the page took two minutes (adversarial run, 20 Sep 2026). The stored read is
     * what the release or the warm-up after a new check-in wrote; until one of them has run, the read
     * gets null - the page never waits on the model, and opening it never starts one.
     */
    const stored = ground.report?.direction as TheDirection | null | undefined;
    if (stored) return this.presentTheDirection(stored, viewerLabel);
    /* Opening the report never asks a model, not even in the background (decision 7): the direction
       is read when something new comes in (wordTheReadsFor) and at release. Until then, nothing. */
    return null;
  }

  /**
   * THE DIRECTION AS SENTENCES, for the picture of a one-time session: each list the room answered,
   * most-named first, with the count that makes it the room's answer rather than one person's.
   */
  private async theDirectionAsLines(ground: any, viewerLabel: string | null): Promise<{ saying: string | null; lines: string[] } | null> {
    const d = await this.theDirectionFrom(ground, viewerLabel).catch(() => null);
    if (!d) return null;
    const titles: [keyof TheDirection, string][] = [
      ['regions', 'Regions'], ['markets', 'Markets'], ['valueChains', 'Value chains'], ['actors', 'Who to reach'],
      ['dataGaps', 'Information people do not have'], ['networks', 'Relationships that would unlock it'],
      ['pilots', 'Where people would start'], ['nextTwelveMonths', 'Their own next twelve months'],
    ];
    const lines: string[] = [];
    for (const [key, title] of titles) {
      const items = ((d as any)[key] ?? []) as { name: string; namedBy?: string[]; count?: number }[];
      const top = items
        .map((i) => ({ name: i.name, count: i.count ?? i.namedBy?.length ?? 0 }))
        .filter((i) => i.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      if (top.length) lines.push(`${title}: ${top.map((i) => `${i.name} (${i.count})`).join(', ')}.`);
    }
    for (const split of ((d as any).splits ?? []) as { saying?: string }[]) if (split?.saying?.trim()) lines.push(split.saying.trim());
    if (!lines.length) return null;
    /* THE FINDING IS WHERE THE ROOM POINTS, not how many things were named. "27 of the 87 things named
       were named by more than one person" is a statistic; "Jigawa (12 of 25), rice and paddy (6) and price
       data (4) lead" is a direction. */
    const lead = (key: keyof TheDirection) => {
      const items = (((d as any)[key] ?? []) as { name: string; namedBy?: string[]; count?: number }[])
        .map((i) => ({ name: i.name, count: i.count ?? i.namedBy?.length ?? 0 }))
        .filter((i) => i.count >= 2)
        .sort((a, b) => b.count - a.count);
      return items[0] ?? null;
    };
    const outOf = Number((d as any).outOf ?? 0) || null;
    const heads = [
      lead('regions') && `${lead('regions')!.name} (${lead('regions')!.count}${outOf ? ` of ${outOf}` : ''})`,
      lead('valueChains') && `${lead('valueChains')!.name} (${lead('valueChains')!.count})`,
      lead('dataGaps') && `${lead('dataGaps')!.name} (${lead('dataGaps')!.count})`,
    ].filter(Boolean) as string[];
    const headline = heads.length
      ? `The room points to ${heads.length === 1 ? heads[0] : `${heads.slice(0, -1).join(', ')} and ${heads[heads.length - 1]}`}.`
      : (d as any).saying?.trim() || null;
    return { saying: headline, lines };
  }

  private presentTheDirection(stored: TheDirection, viewerLabel: string | null) {
    /* Re-merged on the way out, so a stored direction picks up a better idea of what is the same thing
       ("Paddy / Rice", "Paddy and Rice") without being read again. */
    const direction = mergeDirections([stored], stored.outOf);
    const enough = isItADirection(direction);
    return {
      ...direction,
      enough: enough.enough,
      saying: enough.saying,
      /* Where two groups gave two answers to the same question. See whereTheRoomSplit. */
      splits: whereTheRoomSplit(direction),
      /* Their own read, which is the whole of what a one-time session can give back. */
      yours: viewerLabel ? whatYouNamed(direction, viewerLabel) : null,
    };
  }

  /** The read itself: every account, in chunks the model finishes, merged into one direction and kept. */
  async readAndKeepTheDirection(groundId: string): Promise<TheDirection | null> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { participants: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }, report: { select: { id: true } } },
    });
    if (!ground || ground.scenario !== 'DISCOVERY' || !ground.report) return null;
    const read = await this.readTheDirectionInChunks(ground);
    if (!read) return null;
    /* Its quotes are the record's words or are not quotes, the same as the report's. See a-quote-is-what-they-said. */
    const labels = labelsForParties(ground.participants as any);
    const said = await this.prisma.recordEntry.findMany({
      where: { disputedAt: null, participant: { groundId } },
      select: { text: true, saidWordForWord: true },
    });
    const kept = everyQuoteFromTheRecord(
      read,
      theLinesAQuoteMayComeFrom(said, [(ground as any).brief, ...ground.participants.flatMap((p: any) => [p.remitAsGiven, p.roleAsDescribed])]),
      ground.participants.map((p: any) => ({ label: labels.get(p.id) ?? '', name: displayName({ ...p, organisationGiven: null }, false) })),
    );
    if (kept.unquoted.length || kept.dropped.length) this.logger.warn(`The direction for ${groundId}: ${kept.unquoted.length} quote(s) were not in the record word for word, so they are no longer quotes, and ${kept.dropped.length} sentence(s) that could not stand without them were taken out.`);
    const direction = kept.value;
    await this.prisma.report.update({ where: { groundId }, data: { direction: direction as any } }).catch((err: any) =>
      this.logger.warn(`The direction for ${groundId} was read but could not be kept: ${err?.message}`));
    return direction;
  }

  private async readTheDirectionInChunks(ground: any): Promise<TheDirection | null> {
    const labels = labelsForParties(ground.participants as any);
    const entries = await this.prisma.recordEntry.findMany({
      where: { disputedAt: null, participant: { groundId: ground.id } },
      orderBy: { createdAt: 'asc' },
      select: { text: true, participantId: true },
      take: 600,
    });
    if (entries.length < 2) return null;

    const byLabel = new Map<string, string[]>();
    for (const e of entries) {
      const label = labels.get(e.participantId);
      if (!label) continue;
      byLabel.set(label, [...(byLabel.get(label) ?? []), cleanText(e.text)]);
    }
    const knownLabels = [...byLabel.keys()];
    if (knownLabels.length < 2) return null;

    const parts: TheDirection[] = [];
    for (const chunk of inChunks(knownLabels, ACCOUNTS_PER_READ)) {
      const corpus = chunk
        .map((label) => `${label}:\n${(byLabel.get(label) ?? []).map((t) => `- ${t}`).join('\n')}`)
        .join('\n\n');
      const raw = await this.anthropic
        .extract<any>(DIRECTION_PROMPT, [{ role: 'user', content: corpus }], DIRECTION_TOOL)
        .catch((err: any) => {
          this.logger.warn(`The direction could not be read for ${ground.id} (${chunk.length} accounts): ${err?.message}`);
          return null;
        });
      if (raw) parts.push(tidy(raw, chunk, chunk.length));
    }
    if (!parts.length) return null;
    if (parts.length < inChunks(knownLabels, ACCOUNTS_PER_READ).length) {
      this.logger.warn(`The direction for ${ground.id} was read from ${parts.length} of ${inChunks(knownLabels, ACCOUNTS_PER_READ).length} chunks; it is kept from what came back.`);
    }
    /* And the plans with a number and a when in them that the model's read left out. See what-the-room-said. */
    return withTheNumbersTheModelMissed(mergeDirections(parts, knownLabels.length), byLabel);
  }

  /**
   * THE REPORT A READER IS SERVED, WITH WHAT THE LEAD HAS NOT SHARED TAKEN OUT OF ITS WORDS. Hafsah,
   * 28 September 2026: a private file's name and a hidden target's number may not reach anyone the
   * lead has not shared them with. The report is built as it always was, then read once more, here,
   * for this reader. See whatTheLeadHasNotShared.
   */
  async get(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    await this.refuseSomeoneNotYetLetIn(requestingUserId, groundId);
    const served = await this.getAsBuilt(groundId, requestingUserId, requestingUserOrgId);
    return this.whatTheLeadHasNotShared(groundId, requestingUserId, requestingUserOrgId, await this.withBeingWritten(groundId, requestingUserId, await this.withWhatTodayReads(groundId, requestingUserId, requestingUserOrgId, await this.withWhatHasStayedTheSame(groundId, requestingUserId, served, requestingUserOrgId))));
  }

  /**
   * `beingWritten` ON THE LEAD'S READ, WHILE A SYNTHESIS OF THIS CHECK-IN IS OUT OR WAITING (week 25).
   * Only the person who runs the check-in; nobody else is told. Read from the service's own record of
   * what is running: it asks no model and starts nothing. Its sentence carries labels, and the wrapper
   * after this turns them into the names this reader may see. See the-report-is-being-written.
   */
  private async withBeingWritten<T>(groundId: string, requestingUserId: string, served: T): Promise<T> {
    if (!served || typeof served !== 'object') return served;
    const since = this.synthesesOut?.since(groundId);
    if (!since) return served;
    const ground = await (this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, participants: { select: { id: true, userId: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, roleAsDescribed: true, remitAsGiven: true, managingOnly: true, user: { select: { firstName: true, lastName: true } } } } } as any,
    }) as Promise<any>).catch(() => null);
    if (!ground || ground.initiatorId !== requestingUserId) return served;
    const answered = await this.prisma.checkIn.findMany({ where: { groundId, status: CheckInStatus.COMPLETED, AND: [NOT_A_QUIET_CLOSE], }, select: { participantId: true } }).catch(() => [] as { participantId: string }[]);
    const answeredIds = new Set(answered.map((c) => c.participantId));
    const labels = labelsForParties(ground.participants ?? []);
    const who = (ground.participants ?? []).filter((p: any) => answeredIds.has(p.id) && !p.managingOnly && p.userId !== requestingUserId).map((p: any) => labels.get(p.id) as string).filter(Boolean);
    return { ...withoutTheCountWhileItIsWritten(served as any), beingWritten: { since: since.toISOString(), sentence: theSentenceWhileItIsWritten(who) } };
  }

  /**
   * SINCE THE LAST ROUND, AND WHAT ONLY THE LEAD CAN SETTLE, ON THE LATEST REPORT (week 16, screens
   * request 3a and 3b). Built from the stored rows at the read: no model is asked and nothing is
   * written. `sinceLast` goes to every reader, each only about what they may already see;
   * `forTheLead` only to the person who runs the check-in. Served before whatTheLeadHasNotShared,
   * so a hidden target, a private file's name or a goal not told yet is walled here as well.
   * See what-today-reads-from-the-record.
   */
  private async withWhatTodayReads<T>(groundId: string, requestingUserId: string, requestingUserOrgId: string | undefined, served: T): Promise<T> {
    if (!served || typeof served !== 'object') return served;
    const ground = await (this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, organizationId: true, scenario: true, createdByUserId: true, participants: { select: { userId: true, email: true } }, report: { select: { releasedAt: true, releasedSessions: true } } } as any,
    }) as Promise<any>).catch(() => null);
    if (!ground) return served;
    const isParty = ((ground.participants ?? []) as any[]).some((p) => p.userId === requestingUserId);
    /* What moved in a session not released yet is that session's picture, so somebody who reads only
       what is released is not told it (decision 76, item 4). */
    if (isParty && ground.initiatorId !== requestingUserId
      && !isThisSessionReleased(ground.report, await theSessionTheReportHolds(this.prisma, groundId))) return served;
    const isAdmin = ground.initiatorId !== requestingUserId && !isParty
      && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground, groundId).catch(() => false));
    const today = await whatTodayReads(this.prisma as any, groundId, { userId: requestingUserId, isAdmin }).catch(() => ({}));
    return Object.keys(today).length ? { ...(served as any), ...today } : served;
  }

  /**
   * WHAT HAS STAYED THE SAME FOR THREE CHECK-INS, ON THE LATEST REPORT AS THE LEAD READS IT (week
   * 12, screens request 3c). The board's `toLookAt`, the same sentences from the same read, built
   * from the stored rows at the read: no model is asked and nothing is written. Only the person
   * who runs the check-in, and an admin with access to it (decision 93, row 9): it is one person's work across
   * their check-ins, so a colleague never reads it. `theSameThingForTheLead` checks that
   * itself, so a caller cannot hand it to anybody else by mistake.
   */
  private async withWhatHasStayedTheSame<T>(groundId: string, requestingUserId: string, served: T, requestingUserOrgId?: string): Promise<T> {
    if (!served || typeof served !== 'object') return served;
    /* An admin with access to the check-in reads it too (decision 93, row 9); a colleague never does. */
    const groundForAccess = requestingUserOrgId
      ? await (this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, organizationId: true, scenario: true, createdByUserId: true, status: true, approvedById: true, participants: { select: { userId: true, email: true } } } as any }) as Promise<any>).catch(() => null)
      : null;
    const adminReadsIt = !!groundForAccess && groundForAccess.initiatorId !== requestingUserId
      && !((groundForAccess.participants ?? []) as any[]).some((p) => p.userId === requestingUserId)
      && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, groundForAccess, groundId).catch(() => false));
    const toLookAt = await theSameThingForTheLead(this.prisma as any, groundId, requestingUserId, { adminReadsIt }).catch(() => []);
    if (!toLookAt.length) return served;
    const quotable = await theRecordAQuoteMayComeFrom(this.prisma as any, groundId);
    return { ...(served as any), toLookAt: this.quotesAsTheRecordHasThem(toLookAt, groundId, 'what has stayed the same', quotable) };
  }

  /** The same for the report of one session. */
  /** Decision 133: when the lead opens a report, the time is recorded (a-lead-read-this-report.ts). It never fails the read. */
  async noteTheLeadRead(groundId: string, sessionNumber: number, userId: string): Promise<void> {
    await recordThatTheLeadRead(this.prisma, groundId, sessionNumber, userId).catch((err: any) => this.logger?.warn?.(`A report read was not recorded: ${err?.message}`));
  }

  async sessionReport(groundId: string, sessionNumber: number, requestingUserId: string, requestingUserOrgId?: string, asIfReleased = false) {
    await this.refuseSomeoneNotYetLetIn(requestingUserId, groundId);
    const served = await this.sessionReportAsBuilt(groundId, sessionNumber, requestingUserId, requestingUserOrgId, asIfReleased);
    return this.whatTheLeadHasNotShared(groundId, requestingUserId, requestingUserOrgId, served);
  }

  /**
   * A private file's name comes out for a reader who may not open the file (the rule every document
   * read uses), and a sentence giving a person's target comes out for a reader who may not see that
   * target (whoSeesTargets). The lead sees every target they set; a lead and an admin see a file
   * only as who-can-see-a-document allows, so a lead's own private file is not named to an admin.
   */
  private async whatTheLeadHasNotShared<T>(groundId: string, requestingUserId: string, requestingUserOrgId: string | undefined, served: T): Promise<T> {
    if (!served || typeof served !== 'object') return served;
    const ground = await (this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        initiatorId: true, organizationId: true, createdByUserId: true, whoSeesTargets: true, scenario: true, startedFrom: true, peersVisibleToEachOther: true,
        participants: { select: { id: true, userId: true, partyType: true, createdAt: true, email: true, nameGiven: true, organisationGiven: true, roleAsDescribed: true, remitAsGiven: true, user: { select: { firstName: true, lastName: true } } } },
        objectives: { select: { name: true, ownerParticipantId: true, target: true } },
        report: { select: { sharedAs: true } },
      } as any,
    }) as Promise<any>).catch(() => null);
    if (!ground) return served;
    const me = (ground.participants ?? []).find((p: any) => p.userId === requestingUserId) ?? null;
    const isInitiator = ground.initiatorId === requestingUserId;
    const isOrgAdmin = !isInitiator && !me && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground, groundId).catch(() => false));
    const docs = await ((this.prisma as any).groundDocument?.findMany?.({ where: { groundId }, select: { fileName: true, visibility: true, participantId: true } }) ?? Promise.resolve([])).catch(() => []);
    const privateNames = namesThisReaderMayNotOpen(docs as any[], { participantId: me?.id ?? null, isLead: isInitiator || isOrgAdmin }, (d, r) => canSeeDocument(d as any, r, true));
    const namesOfPerson = (pid: string) => {
      const p = (ground.participants ?? []).find((x: any) => x.id === pid);
      const first = (p?.user?.firstName ?? '').trim();
      const full = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim();
      return [full, first, (p?.nameGiven ?? '').trim()].filter((n: string) => n && n.length > 1);
    };
    const hiddenTargets = targetsHiddenFrom({ participantId: me?.id ?? null, isTheLead: isInitiator }, ground.whoSeesTargets, ground.objectives ?? [], namesOfPerson, ground.participants ?? []);
    /* And no internal label reaches anyone, whichever field it sits in. See no-internal-label-reaches-anyone. */
    const called = whatEachLabelIsCalled(ground.participants ?? [], {
      viewerParticipantId: me?.id ?? null,
      viewerIsLead: isInitiator || isOrgAdmin,
      peersAreNamed: this.peersAreNamed(ground as any, me?.id ?? null),
      /* The reader is "you" about themselves in every report read (request 101 d). */
      readerIsYou: true,
    });
    /* Labels become names FIRST: the hidden-target read looks for a person's name, and a line still
       saying "Participant B" hid nothing (read live, 28 Sep 2026). */
    /* A goal the lead has not told somebody about is in no sentence anybody but the lead reads. See
       grounds/a-goal-not-told-stays-with-the-lead. Its words carry no label, so this can go first. */
    /* Whoever runs it reads a goal not told: the lead, the admin who set it up and every admin of the organisation who reads this check-in (decisions 5 and 86). */
    if (!(theyRunThisCheckIn(requestingUserId, ground) || isOrgAdmin)) {
      const notTold = await ((this.prisma as any).personObjective?.findMany?.({
        where: { groundId, awareness: 'NOT_TOLD' },
        select: { participantId: true, text: true, awareness: true, authoredBy: true },
      }) ?? Promise.resolve([])).catch(() => []);
      /* And the objectives the engine wrote from them, in its own words (decisions 48 and 56). */
      served = withoutGoalsNotToldIn(served, theWordsOfWhatTheLeadHasNotToldThemAbout(ground.objectives ?? [], notTold as any[], ground.participants ?? [], false));
      /*
       * IN AN ANCHOR CHECK-IN, NONE OF THE LEAD'S AIMS, for anybody who does not run it (decision 96, item 8; release check, 8 October
       * 2026). Her aims are made from what she said she is seeing today, which stays hers. The model was already kept from them
       * (4eb427e2), but the session report's shared picture quoted one to Juma on test bed copy a: "The objective, in the lead's own
       * words, is "The team checks orders before baking to reduce the 20 percent of bread that gets thrown away"". The same wall as
       * a goal not told, through the same door, so the lead's words and their numbers are in no sentence a team member reads.
       */
      if (aCheckInStartedFromTheAnchor(ground)) {
        served = withoutGoalsNotToldIn(served, (ground.objectives ?? []).map((o: any) => String(o?.name ?? '')).filter((n: string) => n.trim()));
      }
      /* A line of the picture whose only sentence was the goal is not left as a line with no words. */
      if (Array.isArray((served as any).sharedPictureLines)) {
        served = { ...(served as any), sharedPictureLines: (served as any).sharedPictureLines.filter((l: any) => !(l && typeof l.text === 'string' && !l.text.trim())) };
      }
    }
    /* What people said stays as they said it: the hidden-target rule is for the report's own words.
       See board/their-own-words-stay (screens request 77). */
    const walled = withoutLinesWithNoWords(withTheirOwnWordsKept(
      withoutPrivateFileNamesIn(withoutInternalLabelsIn(served, called), privateNames),
      THEIR_OWN_WORDS_IN_A_REPORT,
      (v) => withoutHiddenTargetsIn(v, hiddenTargets),
    ));
    /* WHERE PEOPLE DO NOT SEE EACH OTHER, ONE PERSON'S CIRCUMSTANCES NEVER REACH ANOTHER (decision 75, item 14). The
       session report, the rounds and the against-success read are served through here as well as the report, so the
       same wall, through the same door, stands on every one of them. See wherePeopleDoNotSeeEachOther. */
    return this.wherePeopleDoNotSeeEachOther(ground, me, isInitiator || isOrgAdmin, theReaderIsYouOnTheirOwnLines(walled));
  }

  /**
   * THE WALL OF DECISION 75 ITEM 14, ON EVERY REPORT READ A PARTICIPANT CAN REACH.
   *
   * Only `GET /report` applied it (in `asItWasShared`); the session report, the rounds and the against-success read
   * were built from the record and the stored rounds, and served each colleague's circumstances, and the lead's
   * lines about named colleagues, to people who must not read them. They now go through the same door as the
   * report and the board, `askTheReportsDoor`, handed the people and the lead's names like every other caller.
   *
   * A person's own words are held aside while the door runs, so its rules for Groundwork's own sentences (names,
   * dashes) never touch them (their-own-words-stay). The wall is then applied to the lines of every row that is not
   * the reader's own, which drops a sentence about one of the others and changes nothing else. The reader's own row,
   * and everything a reader who runs the check-in reads, is left whole.
   */
  private wherePeopleDoNotSeeEachOther<T>(
    ground: { initiatorId?: string | null; scenario?: any; peersVisibleToEachOther?: boolean | null; participants?: any[]; report?: any },
    me: { id: string } | null,
    viewerRunsIt: boolean,
    served: T,
  ): T {
    if (!served || typeof served !== 'object') return served;
    if (viewerRunsIt) return served;
    const namedToThisReader = this.peersAreNamed(ground as any, me?.id ?? null);
    /* An evaluation check-in keeps its own rule (decision 17): the person reviewed is not told a colleague's name, a quote included, and nothing more is taken out. */
    if (isEvaluationCheckIn(ground.scenario)) return this.withoutTheNamesTheReaderMayNotRead(served, ground.participants ?? [], me?.id ?? null, namedToThisReader);
    if (namedToThisReader) return served;
    const others = {
      names: theOtherPeoplesNames(ground.participants ?? [], me?.id ?? null, ground.initiatorId ?? null),
      lead: theLeadsNamesOf(ground.participants, ground.initiatorId),
    };
    const sharedAs = ground.report?.sharedAs ?? null;
    const throughTheDoor = (piece: any): any => withTheirOwnWordsKept(piece, THEIR_OWN_WORDS_IN_A_REPORT, (v: any) => {
      const shared = askTheReportsDoor(
        this,
        { scenario: ground.scenario, peersVisibleToEachOther: ground.peersVisibleToEachOther, initiatorId: ground.initiatorId ?? null, participants: ground.participants ?? [], report: { ...v, sharedAs } },
        me?.id ?? null,
        false,
      );
      if (shared && typeof shared === 'object' && 'sharedAs' in shared && !('sharedAs' in v)) { const { sharedAs: _gone, ...rest } = shared; return rest; }
      return shared ?? v;
    });
    /* Each round on its own, so a round with one sentence about a colleague loses that sentence and is not dropped whole. */
    const { rounds, ...theRest } = served as any;
    const thatDoor = Array.isArray(rounds)
      ? { ...throughTheDoor(theRest), rounds: rounds.map((r: any) => throughTheDoor(r)) }
      : throughTheDoor(served);
    /* The lines of every other row: the lead's, about a colleague, and a colleague's own. */
    if (Array.isArray(thatDoor?.whatEachPersonSaid)) {
      thatDoor.whatEachPersonSaid = thatDoor.whatEachPersonSaid
        .map((row: any) => (row && !row.isYou && Array.isArray(row.lines)
          ? { ...row, lines: row.lines.map((l: any) => (typeof l === 'string' ? withoutSentencesAboutOneOfThem(l, others) : l)).filter((l: any) => !(typeof l === 'string' && !l.trim())) }
          : row));
    }
    return thatDoor;
  }

  /** The lead's untold goals with the first name of the person each is about (decision 56, point 3). */
  private async goalsNotToldByName(groundId: string, participants: any[]): Promise<{ name: string; goal: string }[]> {
    const rows = await ((this.prisma as any).personObjective?.findMany?.({
      where: { groundId, awareness: 'NOT_TOLD' },
      select: { participantId: true, text: true, awareness: true, authoredBy: true },
    }) ?? Promise.resolve([])).catch(() => []);
    return (rows as any[]).filter(notToldYet).map((r) => {
      const p = (participants ?? []).find((x: any) => x.id === r.participantId);
      const name = (p?.user?.firstName ?? p?.nameGiven ?? '').toString().trim().split(/\s+/)[0] ?? '';
      return { name, goal: String(r.text ?? '') };
    }).filter((u) => u.name);
  }

  private async getAsBuilt(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: {
        // The user is included so labels can be resolved to names for the
        // readers entitled to them - see nameFor() below and party-labels.ts.
        participants: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        report: true,
      },
    });
    if (!ground) throw new NotFoundException('That report could not be found, so go back to the check-in and open it from there.');
    /*
     * WHY, not just no. See `why-there-is-no-report-yet.ts` — the same 404, with the reason the
     * person can act on. The entitlement check below still runs for everybody who HAS a report;
     * this branch is reached before it, so it says nothing a participant list would not.
     */
    if (!ground.report) {
      /* ANYBODY WHO MAY NOT READ THE CHECK-IN IS TOLD "Check-in not found" (second review, new leak B; GW-PRI-04). A member of the
         organisation with no part in it is no more "mine" than a stranger; an admin is, as on every other read, only where an admin may read it. */
      const mine = ground.participants.some(
        (p) => p.userId === requestingUserId,
      ) || ground.initiatorId === requestingUserId || (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground, groundId).catch(() => false));
      if (!mine) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
      const checkIns = await this.prisma.checkIn.findMany({
        where: { groundId },
        select: { status: true, participantId: true },
      });
      const byParty = new Map<string, { completed: boolean; started: boolean }>();
      for (const c of checkIns) {
        const at = byParty.get(c.participantId) ?? { completed: false, started: false };
        byParty.set(c.participantId, {
          completed: at.completed || c.status === 'COMPLETED',
          started: at.started || c.status !== 'NOT_STARTED',
        });
      }
      throw new NotFoundException(
        whyThereIsNoReportYet({
          parties: ground.participants.map(
            (p) => byParty.get(p.id) ?? { completed: false, started: false },
          ),
        }),
      );
    }

    const isInitiator = ground.initiatorId === requestingUserId;
    const participant = ground.participants.find((p) => p.userId === requestingUserId);
    // Org admins can read reports for grounds in their own org (read-only, same view as initiator).
    const isOrgAdmin = !isInitiator && !participant && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground, groundId));
    /* NotFound, not Forbidden: a 403 tells a stranger, or an admin without access to a review, that the check-in is real (GW-PRI-04). */
    if (!participant && !isInitiator && !isOrgAdmin) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* Decision 58: narrower than isInitiator || isOrgAdmin - a pattern (the lead's probe list
       included) goes only to the lead or the admin who set this check-in up for them, never to
       every admin of the organisation. See patterns/who-reads-a-pattern, runsItForAPattern. */
    const patternRunsIt = runsItForAPattern(ground as any, requestingUserId);

    /*
     * THE LINES A QUOTE MAY COME FROM, for everything below that is built now rather than stored.
     * The stored report's quotes were made the record's words before it was kept; these were never
     * seen by that pass. See a-quote-built-at-the-read.
     */
    const quotable = await theRecordAQuoteMayComeFrom(this.prisma as any, groundId);
    const quotesChecked = <T,>(value: T, what: string): T => this.quotesAsTheRecordHasThem(value, groundId, what, quotable);

    /*
     * EACH SESSION'S TEAM PICTURE IS RELEASED ON ITS OWN (decision 76, item 4).
     *
     * Somebody who reads only what is released - a participant, the person reviewed on an evaluation
     * check-in included - reads the team's picture of a session only once that session has been
     * released. The stored report is one row that every session's synthesis rewrites, so once it
     * holds a session that is not released, it is not theirs to read: they read the picture of the
     * latest released session, as it was kept when that session closed (`ReportRound`), or, where
     * nothing is released yet, that the picture is not shared yet, with their own things. Whoever runs
     * the check-in and an admin read as before.
     */
    const readsOnlyWhatIsReleased = !!participant && !isInitiator && !isOrgAdmin;
    const heldSession = readsOnlyWhatIsReleased ? await theSessionTheReportHolds(this.prisma, groundId) : 0;
    let readingAnEarlierSession: { sessionNumber: number; saying: string } | null = null;
    if (readsOnlyWhatIsReleased && !isThisSessionReleased(ground.report as any, heldSession)) {
      const sessionProgress = await this.grounds.getSessionProgress(groundId);
      const requestingUserIsMissing = !!(sessionProgress && participant && sessionProgress.missingParticipantIds.includes(participant.id));
      const earlier = theLatestReleasedSession(ground.report as any, heldSession);
      const kept = earlier
        ? await (this.prisma.reportRound?.findUnique?.({
          where: { groundId_sessionNumber: { groundId, sessionNumber: earlier } },
          select: { sharedPicture: true, agreements: true, divergences: true, centralQuestion: true },
        }) ?? Promise.resolve(null)).catch(() => null)
        : null;
      if (!earlier || !kept) {
        const saying = thisSessionIsNotSharedYet(heldSession);
        return {
          activated: true,
          forming: true,
          notSharedYet: true,
          /* Before they have answered, the reason is that, as it always was. */
          ...(requestingUserIsMissing ? { withheldUntilYouAnswer: true, saying: A_PICTURE_IS_FORMING } : { saying }),
          teamPicture: { shared: false, sessionNumber: heldSession, says: saying },
          releasedSessions: releasedSessionsOf(ground.report as any) ?? [],
          soloArtifact: thePrivateSummaryAsRead(participant?.soloArtifact),
          /* Their own rows, which do not wait on a release: see theirOwnRows. */
          myRows: await this.theirOwnRows(participant?.id),
          couldTry: quotesChecked(await this.whatTheyCouldTryNext(groundId, participant?.id), 'what they could try'),
          sessionProgress: sessionProgress ? { ...sessionProgress, requestingUserIsMissing } : null,
          declined: await this.declinedThisRound(groundId, ground.participants as any),
        } as any;
      }
      /* The released session's picture, and nothing the report learned after it. */
      (ground as any).report = asTheReleasedSessionHadIt(ground.report, kept);
      readingAnEarlierSession = { sessionNumber: earlier, saying: youAreReadingAnEarlierSession(earlier, heldSession) };
    }

    if (!ground.report.releasedAt) {
      // Before everyone has checked in, the report is a forming picture, not
      // a final one - show it as such rather than blocking anyone entirely.
      // No mutual-reveal gate applies here: that gate exists to protect the
      // FINAL simultaneous reveal, not a picture that is still openly
      // incomplete for everyone, initiator included. This used to
      // short-circuit for the initiator/org-admin before reaching this
      // point, returning a bare stub with no content - the comment above
      // always stated the symmetric intent ("initiator included"); the code
      // just never carried it out for that branch.
      const sessionProgress = await this.grounds.getSessionProgress(groundId);
      const requestingUserIsMissing = !!(
        sessionProgress && participant && sessionProgress.missingParticipantIds.includes(participant.id)
      );
      // This party's own solo artifact ("Here is what you shared.") is generated
      // as soon as their own check-in completes, but was only ever attached to the
      // response after the FINAL release - so a participant who finished before the
      // other party had no way to see their own private record at all in the
      // meantime. Surface it here too, same as the released branch below.
      const soloArtifact = thePrivateSummaryAsRead(participant?.soloArtifact);
      /**
       * A PARTY WHO HAS NOT ANSWERED YET DOES NOT READ THE FORMING PICTURE.
       *
       * Walked as a real participant on a real check-in. Zainab, invited and not yet checked in,
       * opened her Report tab and read:
       *
       *   "Only Demo has checked in so far... Demo's account describes two standards for a
       *    successful first quarter: one that was communicated, and another that was not."
       *
       * That is her manager's private account of her, summarised, handed to her before she writes
       * a word. Whatever she says next is an answer to it. The entire claim of this product is
       * that the accounts are independent - "nobody else sees your answers" - and the site says
       * plainly that the shared report appears once everyone has checked in.
       *
       * So: the forming picture is for whoever is WAITING on it - the lead, an org admin, and any
       * party who has already given their account this round. A party who has not is told what is
       * happening and why they cannot read it yet, which is a fact about the method rather than a
       * refusal.
       *
       * Not `!participant` - an org admin has no participant row and must still see it. The test
       * is having a row and being in this round's missing list.
       */
      if (participant && requestingUserIsMissing && !isInitiator && !isOrgAdmin) {
        return {
          activated: true,
          forming: true,
          withheldUntilYouAnswer: true,
          saying: A_PICTURE_IS_FORMING,
          soloArtifact,
          /* Their own rows, which do not wait on a release: see theirOwnRows. */
          myRows: await this.theirOwnRows(participant?.id),
          couldTry: quotesChecked(await this.whatTheyCouldTryNext(groundId, participant?.id), 'what they could try'),
          sessionProgress: sessionProgress ? { ...sessionProgress, requestingUserIsMissing } : null,
          declined: await this.declinedThisRound(groundId, ground.participants as any),
        };
      }

      const formingBase: any = whatAParticipantMayRead(withoutOtherPeoplesReads(
        this.asItWasShared(ground as any, participant?.id ?? null, isInitiator || isOrgAdmin) as any,
        {
          viewerLabel: participant ? (labelsForParties(ground.participants as any).get(participant.id) ?? null) : null,
          viewerParticipantId: participant?.id ?? null,
          viewerIsLead: isInitiator || isOrgAdmin,
          partyNames: ((ground.participants ?? []) as any[]).flatMap((p) => [[p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim(), (p?.user?.firstName ?? '').trim(), (p?.nameGiven ?? '').trim()]).filter(Boolean),
        },
      ), { isLead: isInitiator || isOrgAdmin, participantId: participant?.id ?? null, anAdminWhoOnlyReads: isOrgAdmin && !patternRunsIt });
      /*
       * AND THE JUDGEMENT, FOR AN ADMIN WHO DOES NOT RUN THE CHECK-IN, ON A FORMING REPORT TOO
       * (decision 5, clarified 29 September). Same reason as the released branch below: the admin who
       * set it up keeps `theJudgement` (an admin who only reads never has it, decision 139), but not a sentence built from the lead's
       * private description of somebody. See deeplyWithoutTheLeadsDescriptionOfAnyone.
       */
      if (isInitiator && formingBase.theJudgement) {
        formingBase.theJudgement = theJudgementWithItsConversationPoints(formingBase.theJudgement, await this.goalsNotToldByName(groundId, ground.participants as any[]));
      }
      if (!isInitiator && 'theJudgement' in formingBase) {
        const theDescriptions = (ground.participants as any[]).flatMap((p) => [p.roleAsDescribed, p.remitAsGiven]);
        const shareable = await theShareableTextFor(this.prisma as any, ground as any).catch(() => [] as string[]);
        formingBase.theJudgement = deeplyWithoutTheLeadsDescriptionOfAnyone(formingBase.theJudgement, theDescriptions, false, shareable);
      }

      return {
        /* THE LEAD'S LAYER COMES OFF HERE TOO. A forming report carries the same stored row, so a
           participant who has answered read the judgement about the room before it was released. */
        /* AND OTHER PEOPLE'S RATINGS OFF, as in the released branch below. This branch skipped
           withoutOtherPeoplesReads, so a participant who had answered read every other person's
           specificity read on a forming report (screens request 43, 28 September 2026). */
        ...formingBase,
        activated: true,
        forming: true,
        /* NAMED, LIKE EVERYTHING ELSE SOMEBODY READS. overTime is assembled after the name pass,
           so its prose kept its labels: "Participant A is waiting on the person who called this
           meeting". Through the wrapper, not `applyNames` directly - the wrapper is also where an
           anonymously shared report loses its identifying detail, and a read that skips it would
           name people on a check-in shared without names. */
        overTime: (this.asItWasShared(
          { ...(ground as any), report: { overTime: overTimeForThisReader((ground.report as any)?.overTime as any, { isLead: isInitiator || isOrgAdmin, participantId: participant?.id ?? null }, { meetingsOnRecord: await meetingsOnRecordFor(this.prisma, (ground as any).id) }) } },
          participant?.id ?? null,
          isInitiator || isOrgAdmin,
        ) as any).overTime,
        /* A forming report is partial by definition, so it is the one that most needs to say how
           partial. Same read as the released branch - see a-report-behind-the-answers. */
        /* Optional-chained like every other read here: a caller whose prisma double does not stub a
           model must get an empty read rather than a crash mid-report. */
        behindTheAnswers: howFarBehind(
          await (this.prisma.checkIn?.findMany?.({ where: { groundId, status: CheckInStatus.COMPLETED, AND: [NOT_A_QUIET_CLOSE], }, select: { participantId: true } }) ?? Promise.resolve([] as any[]))
            .then((rows: any[]) => new Set(rows.map((r) => r.participantId)).size)
            .catch(() => 0),
          (ground.report as any)?.builtFromAnswers ?? null,
        ),
        nextStep: isInitiator ? 'release' : isOrgAdmin ? 'wait' : undefined,
        /* What pressing Release would share, said plainly to whoever runs it (decision 76, item 4). */
        releasedSessions: [],
        ...(isInitiator ? await (async () => {
          const now = await theSessionTheReportHolds(this.prisma, groundId);
          return { releaseThisSession: { sessionNumber: now, saying: whatReleasingThisSessionDoes(now) } };
        })() : {}),
        soloArtifact,
        myRows: await this.theirOwnRows(participant?.id),
        couldTry: quotesChecked(await this.whatTheyCouldTryNext(groundId, participant?.id), 'what they could try'),
        sessionProgress: sessionProgress ? { ...sessionProgress, requestingUserIsMissing } : null,
        declined: await this.declinedThisRound(groundId, ground.participants as any),
        /* AND WHAT IT RESTS ON. Sixteen documents were attached across an audit run and one report of
           a hundred and forty-five mentioned a document at all — the synthesis prompt is handed a count
           and nothing else. Computed rather than asked of a model, so a document cannot vanish from the
           account of what happened. See what-this-record-rests-on.ts. */
        restsOn: await this.whatItRestsOn(groundId, ground.participants as any, participant?.id ?? null, isInitiator || isOrgAdmin),
      };
    }

    /**
     * THERE IS NO REVEAL. THE REPORT UPDATES AS PEOPLE CHECK IN, AND THAT IS ALL IT IS.
     *
     * What stood here was a per-party gate: a released report was withheld from every participant
     * until they pressed a button, and the lead was exempt. Walked as a real participant and it
     * was theatre on both sides of the screen.
     *
     * It withheld nothing. `sessionReport` - the per-session read the report page actually makes -
     * walls on `released || viewerIsLead` and had never heard of activation, so the same person
     * blocked here was handed the whole thing, every party's own words included, one request
     * later. The button sat above the record it claimed to be protecting, saying "this cannot be
     * undone" about a door that was already open.
     *
     * And it made the product lie about itself. `get()` returned `{ activated: false }` with no
     * content, so the card that renders it printed "Not enough has been said yet to draw one.
     * Too little to say. 0 areas settled." to somebody whose session had produced a full
     * three-party synthesis. The one screen that tells a participant what their ten minutes were
     * worth told them it was worth nothing.
     *
     * The independence this product rests on is protected in the place it actually lives: nobody
     * reads a forming picture before giving their own account - see the branch above, which is
     * about having ANSWERED, not about having pressed anything. Once a report is released it is
     * released, and it shows.
     *
     * The `ReportActivation` rows and `activate()` are left where they are rather than dropped in
     * the same change: nothing reads them to decide what anybody may see any more, and removing a
     * table is a migration that has no business riding along with a fix to what people see.
     */

    const engagement = ground.report.engagement && typeof ground.report.engagement === 'object'
      ? (ground.report.engagement as Record<string, any>)
      : {};
    const guideAsStored = participant ? (engagement.postReportGuides?.[participant.id] ?? null) : null;
    /* The guide goes through the same door as the shared picture, so a sentence in it about what happened to the other people
       is left out of it too (decision 75, item 14; run-29, loans: "for others, the problem is that they do not have the asset"). */
    const postReportGuide = guideAsStored
      ? ((this.asItWasShared({ ...(ground as any), report: { postReportGuide: guideAsStored } }, participant?.id ?? null, isInitiator || isOrgAdmin) as any).postReportGuide ?? null)
      : guideAsStored;

    /**
     * AND THE COACHING NOTE, WHICH IS THE ONE PART OF THIS THAT SPEAKS TO THE READER.
     *
     * `postReportGuide` is about the conversation to have next and is written from one session's
     * text. This is about the person: what keeps showing up for them across sessions, what that
     * means for somebody in their role at this point in the run, and the one thing to do before
     * the next one. See what-to-work-on-next.ts.
     *
     * Only for a party, and only about themselves. A lead reading somebody else's report gets
     * nothing here, because coaching somebody through a document they cannot reply to is the
     * opposite of what this is for.
     */
    /*
     * WHO ANYBODY IS CALLED, decided by the same rule the rest of the report uses. Passed in so
     * the coaching surfaces cannot invent a second naming rule of their own.
     */
    const coachLabels = labelsForParties(ground.participants as any);
    const coachNames = namesVisibleTo(participant?.id ?? null, ground.participants as any, this.peersAreNamed(ground as any, participant?.id ?? null));
    /** Whoever this is, named, with no "you" - for a heading rather than a sentence. */
    const plainNameOf = (participantId: string): string | null => {
      const label = coachLabels.get(participantId);
      return (label ? coachNames.get(label) : undefined) ?? label ?? null;
    };
    const nameOf = (participantId: string | null, fallback: string | null): string | null => {
      if (!participantId) return fallback;
      if (participant && participantId === participant.id) return 'you';
      const label = coachLabels.get(participantId);
      return (label ? coachNames.get(label) : undefined) ?? label ?? fallback;
    };

    /* Started now, awaited beside the probe list below: neither wording call needs the other. */
    const coachingPending = participant
      ? this.coachingNoteFor(groundId, ground as any, participant as any, nameOf).catch((err) => {
          /* A NOTE THAT CANNOT BE BUILT MUST NOT TAKE THE REPORT DOWN. The report is the thing
             somebody came for; the coaching note is an addition to it. Same rule as the record
             read and the guide above. */
          this.logger.warn(`Could not build the coaching note for ${participant.id}: ${err?.message}`);
          return null;
        })
      : Promise.resolve(null);

    const soloArtifact = thePrivateSummaryAsRead(participant?.soloArtifact);

    // The arc ADVISORY is a reviewer flag, never part of the shared report:
    // only the initiator / org admin sees it, and only when the negative tier
    // fired. Participants receive the neutral record-shape line inside the
    // report body itself; arcSignals never leave the admin surface.
    /**
     * OTHER PEOPLE'S READS COME OUT BEFORE ANYTHING ELSE HAPPENS.
     *
     * engagement carried a five-dimension quality read for every party, and
     * finalSynthesis a closing tier for every party, to every reader. See
     * own-reads-only.ts for what that looked like on a real report and why it
     * is worse than it appears.
     */
    const [coaching, probes] = await Promise.all([
      coachingPending,
      /* "What to ask each person" is for the next session. A room that met once has none: twenty-four
         identical "Waiting for X, with no escalation on record" blocks went to a discovery convener (run
         8, 21 Sep 2026). */
      (ground as any).cadence === Cadence.ONE_TIME
        ? Promise.resolve(null)
        : this.whatToProbeOn(groundId, ground as any, patternRunsIt, nameOf, plainNameOf).catch((err) => {
          this.logger.warn(`Could not build the probe list for ${groundId}: ${err?.message}`);
          return null;
        }),
    ]);
    const blame = (coaching || probes) ? await this.theBlameHeld(groundId, participant?.id) : null;
    const base: any = {
      /*
       * AND THE LEAD'S LAYER, OFF, BEFORE ANYTHING ELSE RUNS.
       *
       * `withoutOtherPeoplesReads` takes the per-person quality reads out. It never looked at
       * `theJudgement`, because the judgement did not exist when it was written - so a participant's
       * own report carried a verdict on the room written for their manager. See
       * the-judgement-is-the-leads.
       */
      ...whatAParticipantMayRead(withoutOtherPeoplesReads(
        this.asItWasShared(ground as any, participant?.id ?? null, isInitiator || isOrgAdmin) as any,
        {
          viewerLabel: participant ? (labelsForParties(ground.participants as any).get(participant.id) ?? null) : null,
          viewerParticipantId: participant?.id ?? null,
          viewerIsLead: isInitiator || isOrgAdmin,
          partyNames: ((ground.participants ?? []) as any[]).flatMap((p) => [[p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim(), (p?.user?.firstName ?? '').trim(), (p?.nameGiven ?? '').trim()]).filter(Boolean),
        },
      ), { isLead: isInitiator || isOrgAdmin, participantId: participant?.id ?? null, anAdminWhoOnlyReads: isOrgAdmin && !patternRunsIt }),
      activated: true,
      /*
       * AND THE LONGITUDINAL READ, NARROWED TO THIS READER.
       *
       * The board gates this on `isInitiator`; the report returns the whole row, so a participant's
       * own report carried other people's commitments and dependencies. See overTimeForThisReader.
       */
      /* And named through the wrapper, for the reason in the forming branch above. */
      overTime: (this.asItWasShared(
        { ...(ground as any), report: { overTime: overTimeForThisReader((ground.report as any)?.overTime as any, { isLead: isInitiator || isOrgAdmin, participantId: participant?.id ?? null }, { meetingsOnRecord: await meetingsOnRecordFor(this.prisma, (ground as any).id) }) } },
        participant?.id ?? null,
        isInitiator || isOrgAdmin,
      ) as any).overTime,
      /*
       * WHETHER THESE NUMBERS ARE OLDER THAN THE ANSWERS.
       *
       * A synthesis that fails keeps the report that is already there, silently, and on an open
       * link somebody finishes every few minutes. A lead reading "4 people answered" on a check-in
       * ten people answered cannot tell a thin response rate from a stale page, and those call for
       * opposite decisions. See a-report-behind-the-answers.
       */
      behindTheAnswers: howFarBehind(
        await (this.prisma.checkIn?.findMany?.({ where: { groundId, status: CheckInStatus.COMPLETED, AND: [NOT_A_QUIET_CLOSE], }, select: { participantId: true } }) ?? Promise.resolve([] as any[]))
          .then((rows: any[]) => new Set(rows.map((r) => r.participantId)).size)
          .catch(() => 0),
        (ground.report as any)?.builtFromAnswers ?? null,
      ),
      postReportGuide: quotesChecked(postReportGuide, 'the guide to the next conversation'),
      coaching: this.readAsItWillBeRead(coaching, groundId, 'the coaching note', quotable, blame),
      /* Only a discovery session has one; everything else gets null and renders nothing. */
      theDirection: await this.theDirectionFrom(
        ground,
        participant ? (labelsForParties(ground.participants as any).get(participant.id) ?? null) : null,
      ).catch(() => null),
      /*
       * THE LINES TAKEN FROM WHAT YOU SAID, AS ROWS, WITH THE PRESS THAT DISPUTES ONE.
       *
       * The person had never seen these as rows. They saw the text, on the shared report, under
       * their name, with nothing saying it was extracted rather than typed. This is theirs alone, on
       * their own half, labelled as what it is. Disputed rows are returned too, so the page can show
       * the dispute; every read that COUNTS rows filters them out.
       */
      myRows: await this.theirOwnRows(participant?.id),
      couldTry: quotesChecked(await this.whatTheyCouldTryNext(groundId, participant?.id), 'what they could try'),
      mySoftSpots: participant
        ? quotesChecked(await this.myOwnSoftSpots(groundId, participant.id).catch(() => []), 'their soft spots')
        : [],
      /*
       * AND THE LEAD'S OWN SECTION. Null for everybody else, decided inside `whatToProbeOn` rather
       * than by this caller remembering to ask - a lead-only surface guarded at the call site is
       * one refactor away from not being lead-only.
       */
      /* Built at the read with the reader's "you" already in, so held to the same tests here. See
         a-line-built-at-the-read-is-read-too. */
      probes: this.readAsItWillBeRead(probes, groundId, 'the probe list', quotable, blame && { ...blame, speaker: null }),
      soloArtifact,
      /**
       * A RELEASED report is exactly where this matters most, and it was the branch that could not
       * say it: `sessionProgress` is attached only to the forming response, so once a round with a
       * decline in it completed - which it now can - the report went out naming three accounts and
       * nothing about the fourth person having refused.
       */
      declined: await this.declinedThisRound(groundId, ground.participants as any),
      /* AND WHAT IT RESTS ON. Sixteen documents were attached across an audit run and one report of
         a hundred and forty-five mentioned a document at all — the synthesis prompt is handed a count
         and nothing else. Computed rather than asked of a model, so a document cannot vanish from the
         account of what happened. See what-this-record-rests-on.ts. */
      restsOn: await this.whatItRestsOn(groundId, ground.participants as any, participant?.id ?? null, isInitiator || isOrgAdmin),
      /* The whole record's marks read every session, so not while an earlier session is what they read. */
      ...(this.confidenceEnabled() && !readingAnEarlierSession
        ? await this.whatTheRecordHolds(groundId, ground.participants as any, isInitiator || isOrgAdmin, { isTheLead: isInitiator, participantId: participant?.id ?? null })
        : {}),
    };
    /*
     * THE READ-SIDE NET (decision 30, narrowed 30 September 2026). `sharedPicture`, `findings` and
     * `theOpening` are the shared picture everybody in the check-in reads - by design (see
     * the-judgement-is-the-leads) - so they are never stripped wholesale. What may not reach a
     * non-lead reader is a sentence built from a lead's private description of anyone that is not
     * ALSO something this reader may already read some other way - what they were told, the shared
     * targets and aims, and what people said in their own check-ins (decision 4). Checked live: the
     * seniorhire "own the relationships with the five largest clients" sentence is shareable this
     * way on both run 19 and goals-1, and stays for Tobi; a private phrase found nowhere shareable
     * still comes out. See theShareableTextFor and withoutTheLeadsDescriptionOfAnyone.
     */
    /* The working copy's inferences are the latest session's only; an earlier session's are on its own
       report (request 102). */
    if (Array.isArray(base.inferences)) {
      const holds = await theSessionTheReportHolds(this.prisma, groundId);
      base.inferences = theInferencesOfSession(base.inferences, holds, holds);
    }
    if (isInitiator && base.theJudgement) {
      base.theJudgement = theJudgementWithItsConversationPoints(base.theJudgement, await this.goalsNotToldByName(groundId, ground.participants as any[]));
    }
    if (!isInitiator) {
      const theDescriptions = (ground.participants as any[]).flatMap((p) => [p.roleAsDescribed, p.remitAsGiven]);
      const shareable = await theShareableTextFor(this.prisma as any, ground as any).catch(() => [] as string[]);
      base.sharedPicture = withoutTheLeadsDescriptionOfAnyone(base.sharedPicture, theDescriptions, false, shareable);
      base.theOpening = withoutTheLeadsDescriptionOfAnyone(base.theOpening, theDescriptions, false, shareable);
      if (Array.isArray(base.findings)) {
        base.findings = base.findings.map((f: any) => (f && typeof f === 'object'
          ? { ...f, text: withoutTheLeadsDescriptionOfAnyone(f.text, theDescriptions, false, shareable) ?? '' }
          : f));
      }
      /*
       * AND THE JUDGEMENT, FOR AN ADMIN WHO DOES NOT RUN THE CHECK-IN (decision 5, clarified 29
       * September). `whatAParticipantMayRead` keeps `theJudgement` here only for the admin who set the
       * check-in up (an admin who only reads loses it there, decision 139, item 1) - but the room judgement is handed "taken on for:
       * <role>", where role is `remitAsGiven ?? roleAsDescribed`, the lead's own private words. What
       * the model writes back can carry those words in any of its sentences, so the same net that
       * protects sharedPicture, theOpening and findings above is walked over the whole structure. A
       * no-op for a genuine participant, whose `theJudgement` is already gone by this point. See
       * deeplyWithoutTheLeadsDescriptionOfAnyone.
       */
      if ('theJudgement' in base) {
        base.theJudgement = deeplyWithoutTheLeadsDescriptionOfAnyone(base.theJudgement, theDescriptions, false, shareable);
      }
    }
    /*
     * PART 3, HAFSAH'S RULING, 30 SEPTEMBER 2026: a quote of a colleague's words in the TEAM
     * report - sharedPicture, theOpening, findings[].text, agreements, and anywhere else this is
     * served as prose - becomes a statement of the fact without the exact words, for the subject of
     * an evaluation check-in only. Every quote here is already known to be somebody's own words
     * (a-quote-is-what-they-said runs before this is ever stored, and a-quote-built-at-the-read for
     * what is built now); this only decides whose, using the same matching rule
     * (theRecordAQuoteMayComeFromByParticipant), and fails closed - a quote is left alone only
     * where it positively matches the SUBJECT's own record. A no-op for the lead, an admin WITH
     * access to this check-in (both read `isLead` here, same as everywhere else in this method) and
     * a colleague giving a view.
     *
     * DECISION 60 POINT 4, 30 September 2026: an admin WITHOUT access to this check-in reads no
     * colleague's exact words here either - `patternRunsIt` (decision 58's own access rule, above)
     * decides "with access", never "every admin of the organisation". Such an admin has no record
     * of their own on this check-in, so every quote is treated as not theirs and comes out, the same
     * as it does for the subject.
     */
    const evaluationWordsRunsIt = patternRunsIt;
    const adminWithoutCheckInAccess = isOrgAdmin && !evaluationWordsRunsIt && isEvaluationCheckIn((ground as any).scenario);
    if (viewerIsTheSubjectOfAnEvaluationCheckIn({
      scenario: (ground as any).scenario,
      isLead: isInitiator || evaluationWordsRunsIt,
      viewerParticipantId: participant?.id ?? null,
      participants: ground.participants as any,
    }) || adminWithoutCheckInAccess) {
      const recordByParticipant = await theRecordAQuoteMayComeFromByParticipant(this.prisma as any, groundId).catch(() => new Map<string, string[]>());
      /* Their own lines, and the lead's where the new hire reads the lead's own words (request 124). */
      const theLeadsId = theNewHireReadsTheLeadsWords((ground as any).scenario) ? ((ground.participants as any[]).find((p) => p.partyType === 'INITIATOR')?.id ?? null) : null;
      const subjectRecord = [...(participant?.id ? (recordByParticipant.get(participant.id) ?? []) : []), ...(theLeadsId && participant?.id ? (recordByParticipant.get(theLeadsId) ?? []) : [])];
      base.sharedPicture = deeplyWithoutColleaguesQuotesForTheSubject(base.sharedPicture, subjectRecord);
      base.theOpening = deeplyWithoutColleaguesQuotesForTheSubject(base.theOpening, subjectRecord);
      base.agreements = deeplyWithoutColleaguesQuotesForTheSubject(base.agreements, subjectRecord);
      /* The shared picture sentence by sentence, with its marks: the same words, so the same wall (1 October review). */
      if (Array.isArray(base.sharedPictureLines)) base.sharedPictureLines = deeplyWithoutColleaguesQuotesForTheSubject(base.sharedPictureLines, subjectRecord).filter((l: any) => !(l && typeof l.text === 'string' && !l.text.trim()));
      if (Array.isArray(base.findings)) {
        base.findings = base.findings.map((f: any) => (f && typeof f === 'object'
          ? { ...f, text: deeplyWithoutColleaguesQuotesForTheSubject(f.text, subjectRecord) ?? '' }
          : f));
      }
    }
    if (!isInitiator && !isOrgAdmin) {
      delete base.arcSignals;
    } else if (base.arcSignals && typeof base.arcSignals === 'object') {
      const advisories = Object.entries(base.arcSignals as Record<string, any>)
        .filter(([, sig]) => sig?.tier === 'CONCENTRATED_FINISH')
        .map(([pid, sig]) => ({
          participantId: pid,
          email: ground.participants.find((p) => p.id === pid)?.email ?? null,
          note: 'Most of the delivery record for this party appears only in the closing session, without earlier support in the record. Worth asking about the history before treating the final account as settled.',
          features: [sig.f1_concentration, sig.f2_lateUnsupported, sig.f4_cadenceShape, sig.f5_evidenceTiming].filter((f: any) => f?.fired).map((f: any) => f.detail),
        }));
      if (advisories.length) base.arcAdvisories = advisories;
    }

    // Visible Updates trail: any self-correction session (startSelfCorrectionSession)
    // shows up here as a flagged, dated entry instead of being silently blended
    // into the report. Deliberately carries no correction TEXT - only who,
    // when, and whether it landed after that participant had already signed
    // off - so the other party can see something changed without either
    // side's private reasoning leaking to the other.
    const updateCheckIns = await this.prisma.checkIn.findMany({
      where: { groundId, isSelfCorrection: true, status: CheckInStatus.COMPLETED },
      select: { participantId: true, sessionNumber: true, completedAt: true, isPostSignOff: true },
      orderBy: { completedAt: 'asc' },
    });
    if (updateCheckIns.length) {
      base.updates = updateCheckIns.map((c) => ({
        participantId: c.participantId,
        email: ground.participants.find((p) => p.id === c.participantId)?.email ?? null,
        sessionNumber: c.sessionNumber,
        completedAt: c.completedAt,
        isPostSignOff: c.isPostSignOff,
      }));
    }

    /*
     * DECISION 53: WHO SHARED THIS, IF IT WAS NOT THE LEAD. Kept on the ground's own audit log by
     * release() (see who-shared-it-because-the-lead-left.ts) rather than a new column. Served to
     * every reader of a released report - the fact of who shared it, and why, is not one of this
     * product's private things.
     */
    const sharedByAnAdmin = sharedByAnAdminFrom((ground as any).groundAuditLog);
    if (sharedByAnAdmin) base.sharedByAnAdmin = sharedByAnAdmin;

    /* Which sessions' pictures are released, for every reader, and for whoever runs the check-in the
       one a release would share now, said plainly before they press it (decision 76, item 4). */
    base.releasedSessions = releasedSessionsOf(ground.report as any) ?? [];
    if (isInitiator) {
      const now = await theSessionTheReportHolds(this.prisma, groundId);
      if (!isThisSessionReleased(ground.report as any, now)) base.releaseThisSession = { sessionNumber: now, saying: whatReleasingThisSessionDoes(now) };
    }
    if (readingAnEarlierSession) {
      base.teamPicture = { shared: false, sessionNumber: heldSession, says: thisSessionIsNotSharedYet(heldSession) };
      base.readingSession = readingAnEarlierSession;
      /* A colleague waiting on them comes from that colleague's account of a session not released yet. */
      if (base.overTime && Array.isArray(base.overTime.dependencies)) {
        base.overTime = { ...base.overTime, dependencies: base.overTime.dependencies.filter((d: any) => d?.fromParticipantId === participant?.id) };
      }
      delete base.updates;
    }

    return base;
  }

  /**
   * Each participant calls this once to confirm they are ready to see the
   * report. Creates or updates their ReportActivation row to ACTIVATED.
   * Returns the activation status for both parties so the client can show
   * whether the other side has also revealed.
   */
  async activate(groundId: string, requestingUserId: string) {
    await this.refuseSomeoneNotYetLetIn(requestingUserId, groundId);
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { participants: true, report: true },
    });
    if (!ground?.report?.releasedAt) throw new ForbiddenException('This report has not been shared yet, so check again once the lead shares it.');

    const participant = ground.participants.find((p) => p.userId === requestingUserId);
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');

    await this.prisma.reportActivation.upsert({
      where: { groundId_participantId: { groundId, participantId: participant.id } },
      create: {
        groundId,
        participantId: participant.id,
        status: ReportActivationStatus.ACTIVATED,
        activatedAt: new Date(),
      },
      update: {
        status: ReportActivationStatus.ACTIVATED,
        activatedAt: new Date(),
      },
    });

    const status = await this.getActivationStatus(groundId, ground.participants.map((p) => p.id));
    return this.activationStatusThisReaderMaySee(status, ground as any, ground.initiatorId === requestingUserId ? null : participant.id);
  }

  /**
   * WHO HAS SHOWN THEIRS, READ ONLY BY THE PEOPLE IN THIS CHECK-IN AND ITS ORGANISATION'S ADMINS.
   *
   * This used to answer anybody who was signed in, from any organisation, with every participant id
   * on the check-in: its own comment said "non-parties can still see aggregate status", and both of
   * its branches returned the same thing. Now somebody who is neither in the check-in nor an admin
   * of the organisation it belongs to is told it does not exist (404, as `get()` does, so a guessed
   * id cannot be told from a real one). On a check-in that hides people from each other, a
   * participant reads only their own row; the lead and an admin read every row.
   */
  async getActivationStatusForUser(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    await this.refuseSomeoneNotYetLetIn(requestingUserId, groundId);
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { participants: true },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const isInitiator = ground.initiatorId === requestingUserId;
    const me = ground.participants.find((p) => p.userId === requestingUserId) ?? null;
    const isOrgAdmin = !isInitiator && !me && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground, groundId));
    if (!isInitiator && !me && !isOrgAdmin) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const status = await this.getActivationStatus(groundId, ground.participants.map((p) => p.id));
    return this.activationStatusThisReaderMaySee(status, ground as any, isInitiator || isOrgAdmin ? null : me?.id ?? null);
  }

  /** On a check-in that hides people from each other, a participant reads only their own row. */
  private activationStatusThisReaderMaySee<T extends { parties: Array<{ participantId: string }> }>(
    status: T,
    ground: { peersVisibleToEachOther?: boolean | null },
    participantId: string | null,
  ): T {
    if (!participantId || ground.peersVisibleToEachOther !== false) return status;
    return { ...status, parties: status.parties.filter((p) => p.participantId === participantId) };
  }

  /** Returns activation status for all participants on a ground. */
  async getActivationStatus(groundId: string, participantIds: string[]) {
    const activations = await this.prisma.reportActivation.findMany({
      where: { groundId },
    });
    const statusMap = Object.fromEntries(activations.map((a) => [a.participantId, a.status]));
    return {
      groundId,
      parties: participantIds.map((id) => ({
        participantId: id,
        activated: statusMap[id] === ReportActivationStatus.ACTIVATED,
      })),
      allActivated: participantIds.every((id) => statusMap[id] === ReportActivationStatus.ACTIVATED),
    };
  }

  // ---------------------------------------------------------------------------
  // #91 - Solo artifact: public entry point used when a report is not yet ready
  // ---------------------------------------------------------------------------

  /**
   * generateSoloArtifact USED TO LIVE HERE, AND NOTHING CALLED IT.
   *
   * Its own comment said "called after each check-in completes via the conversation
   * service". The conversation service has its own near-identical copy,
   * buildSoloArtifact, and calls that. So this one had never run - a dead
   * near-duplicate of a user-visible artifact, with a docstring asserting it was the
   * live path.
   *
   * That is worse than an unused function. Anybody improving the private-record
   * summary would have read this comment, edited this method, tested it, and shipped
   * a change that reached nobody - which happened three separate times today for
   * other reasons. Deleted rather than wired, because the live one works and two
   * implementations of one artifact drift.
   *
   * A LIMIT OF THE UNWIRED-MODULE RULE, worth knowing: it checks files, not methods.
   * reports.service.ts is imported everywhere, so a dead method inside it is
   * invisible to that check. This one was found by following a silent early return.
   */


  // ---------------------------------------------------------------------------
  // #99 - Post-report conversation guide
  // ---------------------------------------------------------------------------

  /**
   * Generate a personalised post-report guide for each participant in the
   * ground: one opening line, one question to carry, one thing to acknowledge
   * from the other side's record. Stored in the report's `engagement` JSON
   * under key `postReportGuides` (a map of participantId → guide). No schema
   * migration required. Called atomically after report release.
   */
  private async generatePostReportGuides(
    report: { groundId: string; sharedPicture: string; agreements: any; divergences: any; centralQuestion: string; engagement: any },
    participantIds: string[],
  ): Promise<void> {
    // ON as of 2026-08-08 (POST_REPORT_GUIDE_ENABLED). One Gemini call per
    // participant per report release.
    //
    // It stayed off through two rounds of review, and the reason is worth keeping:
    // the first real preview produced "I want to acknowledge Eric's consistent
    // focus" for two participants, with the prompt forbidding exactly that. One
    // party being told by name what another said in their private check-in. The
    // gate is what caught it - nothing had reached a real person.
    //
    // What changed before this was turned on: the name and quote strip became
    // STRUCTURAL (guide-sanitiser.ts, applied below between extraction and
    // storage, built from this ground's own participants), and a re-reviewed
    // preview over real records showed zero names, zero quotes, and per-party
    // openings that lead on the gap rather than on reassurance.
    //
    // The flag remains the off switch. If a leak is ever seen, set it to false and
    // generation stops the same release - do not patch the prompt and hope.
    if (!this.config.get<boolean>('app.postReportGuideEnabled')) {
      this.logger.debug(`Post-report guide generation skipped for ground ${report.groundId} (POST_REPORT_GUIDE_ENABLED off)`);
      return;
    }

    // Build the shared synthesis text so the AI can reference it.
    const synthesisText = [
      `Shared picture: ${report.sharedPicture}`,
      `Agreements: ${Array.isArray(report.agreements) ? report.agreements.join('; ') : JSON.stringify(report.agreements)}`,
      `Divergences: ${JSON.stringify(report.divergences)}`,
      `Central question: ${report.centralQuestion}`,
    ].join('\n');

    const guides: Record<string, PostReportGuide> = {};

    /**
     * Every name on the ground, so no guide can carry one.
     *
     * ENFORCED HERE, not merely requested in the prompt. On a real seven-party
     * ground this feature produced "I want to acknowledge Eric's consistent
     * focus..." for two different participants - one party told, by name, what
     * another said in their private check-in - while the prompt forbidding
     * exactly that was in place. See guide-sanitiser.ts for the full account.
     *
     * The model has to see the party's own record, which names colleagues, so
     * withholding the names is not available the way it was for the atStake
     * pass. The strip therefore happens on the way out.
     */
    const parties = await this.prisma.groundParticipant.findMany({
      where: { groundId: report.groundId },
      select: { email: true, user: { select: { firstName: true, lastName: true } } },
    });
    const names = forbiddenNames(
      parties.map((p) => ({
        firstName: p.user?.firstName,
        lastName: p.user?.lastName,
        email: p.email,
      })),
    );

    /*
     * IS THERE A NEXT SESSION? Two ways a run is over and both count: somebody closed it, or the
     * last planned session has been held. Read once for everybody, because the answer is about the
     * check-in and not about a person.
     */
    const theRunIsOver = await (async () => {
      const g = await this.prisma.ground.findUnique({
        where: { id: report.groundId },
        select: {
          status: true, timelineDays: true, cadence: true,
          checkIns: { select: { sessionNumber: true, isFinal: true, status: true } },
        },
      }).catch(() => null);
      if (!g) return false;
      if (hasEnded(g.status as any)) return true;
      if ((g.checkIns ?? []).some((c: any) => c.isFinal && c.status === CheckInStatus.COMPLETED)) return true;
      const planned = totalSessionsFor((g as any).timelineDays, (g as any).cadence) ?? null;
      const held = Math.max(0, ...(g.checkIns ?? []).map((c: any) => c.sessionNumber ?? 0));
      return planned !== null && held >= planned;
    })().catch(() => false);

    await Promise.all(
      participantIds.map(async (participantId) => {
        try {
          const entries = await this.prisma.recordEntry.findMany({
            where: { disputedAt: null, participantId },
            orderBy: { createdAt: 'asc' },
            select: { type: true, text: true },
          });
          if (entries.length === 0) return;

          const partyRecord = entries.map((e) => `(${e.type}) ${e.text}`).join('\n');
          const corpus = `SHARED SYNTHESIS:\n${synthesisText}\n\nTHIS PARTY'S RECORD:\n${partyRecord}`;

          const result = await this.anthropic.extract<PostReportGuide>(
            /* The end of a run is a different conversation - see THE_RUN_IS_OVER. */
            theRunIsOver ? POST_REPORT_GUIDE_PROMPT + THE_RUN_IS_OVER : POST_REPORT_GUIDE_PROMPT,
            [{ role: 'user', content: corpus }],
            POST_REPORT_GUIDE_SCHEMA,
          );
          if (!result) return;

          /* What was actually said on this check-in, so a line about nothing in it is recognised.
             The shared picture counts as said here: it is built from everybody's own words. */
          const saidHere = [...entries.map((e) => e.text ?? ''), synthesisText];
          let { guide, dropped } = sanitiseGuide(result, names, saidHere);

          /**
           * ONE MORE ATTEMPT WHEN A FIELD IS STRIPPED, AND HERE IS THE RUN THAT
           * ASKED FOR IT.
           *
           * On the all-flags run, one party's guide came out with no
           * questionToCarry: the model wrote a question containing a quotation, the
           * no-quote rule dropped it, and the log said so exactly as designed. The
           * product was right. The person still ended up with a guide that had
           * nothing to carry into the conversation.
           *
           * The guide is the only private surface that tells somebody what they
           * might do differently, and its question is the part they act on. Losing it
           * to a rule the model can trivially satisfy on a second pass is a waste, so
           * the second pass is asked for - naming the fields that were stripped and
           * why, which is a far better instruction than the original prompt could
           * give.
           *
           * Once, not a loop: a model that quotes twice is telling us the prompt
           * needs work, and the log is what says so.
           */
          if (dropped.length) {
            const why = dropped
              .map((d) => `${d.field} (${d.reason === 'names-a-party' ? 'it named somebody' : 'it contained a quotation'})`)
              .join(', ');
            const retry = await this.anthropic
              .extract<PostReportGuide>(
                POST_REPORT_GUIDE_PROMPT,
                [{
                  role: 'user',
                  content:
                    `${corpus}

A previous attempt had to be discarded in part. Rewrite it so that no field names any person and no field contains a quotation, direct or paraphrased. Discarded last time: ${why}. Write all three fields.`,
                }],
                POST_REPORT_GUIDE_SCHEMA,
              )
              .catch(() => null);
            if (retry) {
              const second = sanitiseGuide(retry, names, saidHere);
              // Only take the retry if it actually lost less. A worse second attempt
              // is not an improvement, and the first one is already sanitised.
              if (Object.keys(second.guide).length > Object.keys(guide).length) {
                guide = second.guide;
                dropped = second.dropped;
              }
            }
          }

          for (const d of dropped) {
            // Logged, because a field being dropped often means the prompt needs
            // work - and a silent strip would hide that the model is still
            // reaching for names.
            this.logger.warn(
              `Dropped post-report guide field ${d.field} for participant ${participantId}: ${d.reason}, and a second attempt did not recover it.`,
            );
          }
          // A guide stripped to nothing is no guide. Storing an empty object
          // would render as a heading with nothing under it.
          if (Object.keys(guide).length === 0) return;

          guides[participantId] = guide;
        } catch (err: any) {
          this.logger.error(`Post-report guide failed for participant ${participantId}: ${err.message}`);
        }
      }),
    );

    if (Object.keys(guides).length === 0) return;

    // Merge guides into the existing engagement JSON and persist.
    const existingEngagement = report.engagement && typeof report.engagement === 'object' ? report.engagement : {};
    await this.prisma.report.update({
      where: { groundId: report.groundId },
      data: { engagement: { ...existingEngagement, postReportGuides: guides } as any },
    });
  }

  // ---------------------------------------------------------------------------
  // #100 - Ground outcome learning loop
  // ---------------------------------------------------------------------------

  /**
   * Record outcome learning data after a ground closes. Reads the ground's
   * outcome (prompt version, session count, resolvable flag, fairness ratings)
   * and creates/updates an OutcomeFeedback-style aggregate record. Called from
   * closure flows (ResolutionService, GroundsCron, etc.) - idempotent.
   */
  async recordOutcomeLearning(groundId: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) return;

    const sessionCount = await this.prisma.checkIn.count({
      where: { groundId, status: CheckInStatus.COMPLETED },
    });

    const feedbackRows = await this.prisma.outcomeFeedback.findMany({
      where: { groundId },
      select: { feltFair: true },
    });
    const fairCount = feedbackRows.filter((f) => f.feltFair).length;
    const fairnessRate = feedbackRows.length > 0 ? Math.round((fairCount / feedbackRows.length) * 100) : null;

    // Upsert the Outcome record with the learning-loop fields. The Outcome table
    // is the canonical learning record; we enrich it here so the weekly summary
    // cron can read a single table.
    await this.prisma.outcome.upsert({
      where: { groundId },
      create: {
        groundId,
        promptVersionId: ground.promptVersionId,
        resolvedState: (ground as any).status ?? 'CLOSED',
        moment: (ground as any).moment ?? null,
        sessionCount,
        resolvable: fairnessRate !== null ? fairnessRate >= 50 : null,
        notes: fairnessRate !== null ? `fairnessRate=${fairnessRate}%` : null,
      },
      update: {
        sessionCount,
        resolvable: fairnessRate !== null ? fairnessRate >= 50 : undefined,
        notes: fairnessRate !== null ? `fairnessRate=${fairnessRate}%` : undefined,
      },
    });
  }

  /**
   * Weekly cron - Mondays at 08:00 UTC. Reads all Outcome records grouped by
   * prompt version, asks the AI to summarise which versions have the highest
   * resolution rate and any declining trend, then logs the result. A lightweight
   * "learning loop status report" for the team; the full data is already in
   * IntelligenceService.outcomeRates().
   */
  // The comment above already claimed "08:00 UTC" but the decorator never
  // actually pinned a timeZone - implicit, same gap as grounds.cron.ts. Now
  // genuinely UTC, matching what the comment always said.
  /**
   * A CLOSING SYNTHESIS THAT NEVER LANDED, PICKED UP AND FINISHED.
   *
   * Found on a live twelve-session run and it is the worst failure shape in the
   * product: every party finished their final session, the closing synthesis ran,
   * the model returned prose instead of calling the tool, the listener logged an
   * error nobody reads, and the report kept its mid-ground state PERMANENTLY.
   *
   * No closing tiers, no end states, no closingComplete - and nothing anywhere
   * says so. The report opens and looks finished. A lead reads a twelve-week
   * ground's summary that is missing the entire closing read and has no way to
   * know it, which is exactly the "confident and wrong" failure G35 exists to
   * refuse, arriving through an unhandled error instead of a bad inference.
   *
   * A retry at the model seam makes this rarer. It cannot make it impossible, so
   * this closes the hole: any ground whose parties have all finished but whose
   * report has no finalSynthesis gets synthesised again. Idempotent by
   * construction - once it lands, the ground stops matching.
   *
   * HOURLY, not daily. The gap between a ground closing and its lead opening the
   * report is usually minutes.
   */
  /**
   * AND THE REPORTS THAT FELL BEHIND THE ANSWERS.
   *
   * A synthesis that fails keeps the report that is already there, which is right - a report with
   * four people in it beats no report at all. What was missing is anybody going back for the rest.
   * Measured on a live open link, 24 September 2026: ten people answered over ten minutes, two
   * syntheses failed to parse and one was refused by a guard, and the report the lead read was
   * built from four answers and stayed that way. Nothing said so and nothing retried.
   *
   * Hourly and idempotent by construction: a ground stops matching the moment its report has read
   * as many answers as the ground holds.
   */
  @Cron('35 * * * *', { timeZone: 'UTC' })
  async catchUpReportsLeftBehind(): Promise<void> {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'catch-up-reports-left-behind', theHour(), () => this.catchUpReportsLeftBehindHere());
  }

  private async catchUpReportsLeftBehindHere(): Promise<void> {
    try {
      const reports = await this.prisma.report.findMany({
        where: { ground: { status: { notIn: [GroundStatus.CLOSED, GroundStatus.RESOLVED] } } },
        select: { groundId: true, builtFromAnswers: true },
        take: 200,
      });
      for (const r of reports) {
        const answered = await this.prisma.checkIn
          .findMany({ where: { groundId: r.groundId, status: CheckInStatus.COMPLETED }, select: { participantId: true } })
          .then((rows) => new Set(rows.map((x) => x.participantId)).size)
          .catch(() => 0);
        /* Null means it was written before this column existed; leave those alone rather than
           re-synthesising every old report in the database on the first run after a deploy. */
        if (r.builtFromAnswers === null || r.builtFromAnswers === undefined) continue;
        if (answered <= r.builtFromAnswers) continue;
        this.logger.log(`Report on ${r.groundId} read ${r.builtFromAnswers} answer(s) and ${answered} are on record. Writing it again.`);
        await this.synthesize(r.groundId).catch((err: any) =>
          this.logger.warn(`Catching up the report on ${r.groundId} failed again: ${err?.message}`));
      }
    } catch (err: any) {
      this.logger.warn(`The catch-up sweep did not run: ${err?.message}`);
    }
  }

  @Cron('20 * * * *', { timeZone: 'UTC' })
  async finishClosingSynthesesThatFailed(): Promise<void> {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'finish-closing-syntheses-that-failed', theHour(), () => this.finishClosingSynthesesThatFailedHere());
  }

  private async finishClosingSynthesesThatFailedHere(): Promise<void> {
    try {
      const candidates = await this.prisma.ground.findMany({
        where: {
          report: { isNot: null },
          participants: { some: { checkIns: { some: { isFinal: true, status: CheckInStatus.COMPLETED } } } },
        },
        select: {
          id: true,
          report: { select: { finalSynthesis: true } },
          participants: {
            select: {
              id: true, userId: true,
              checkIns: { where: { isFinal: true, status: CheckInStatus.COMPLETED }, select: { id: true } },
            },
          },
        },
      });

      for (const g of candidates) {
        if (g.report?.finalSynthesis) continue;
        // The same test synthesize() uses: every ACCEPTED party has a completed
        // final session. An invited party who never joined must not hold this open.
        const accepted = g.participants.filter((p) => p.userId);
        if (!accepted.length || !accepted.every((p) => p.checkIns.length > 0)) continue;

        this.logger.warn(
          `Ground ${g.id} finished its closing session and has no closing synthesis. Synthesising again - the first attempt failed and nothing retried it.`,
        );
        await this.synthesize(g.id).catch((err) =>
          this.logger.error(`Repairing the closing synthesis for ${g.id} failed again: ${(err as Error)?.message}`),
        );
      }
    } catch (err) {
      this.logger.error(`Closing-synthesis repair sweep failed: ${(err as Error)?.message}`);
    }
  }

  @Cron('0 8 * * 1', { timeZone: 'UTC' })
  async weeklyOutcomeLearningReport(): Promise<void> {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'weekly-outcome-learning-report', theWeek(), () => this.weeklyOutcomeLearningReportHere());
  }

  private async weeklyOutcomeLearningReportHere(): Promise<void> {
    this.logger.log('Weekly outcome learning report: starting');
    try {
      const outcomes = await this.prisma.outcome.findMany({
        select: { promptVersionId: true, resolvable: true, sessionCount: true, notes: true },
      });
      if (outcomes.length === 0) {
        this.logger.log('Weekly outcome learning report: no outcome data yet - skipping');
        return;
      }

      // Aggregate by prompt version.
      const byVersion = new Map<string, { resolvedCount: number; resolvableCount: number; sessionTotal: number; fairRates: number[] }>();
      for (const o of outcomes) {
        const key = o.promptVersionId ?? 'unversioned';
        const e = byVersion.get(key) ?? { resolvedCount: 0, resolvableCount: 0, sessionTotal: 0, fairRates: [] };
        e.resolvedCount += 1;
        if (o.resolvable) e.resolvableCount += 1;
        if (o.sessionCount) e.sessionTotal += o.sessionCount;
        // Parse fairnessRate from notes field if present.
        if (o.notes) {
          const m = o.notes.match(/fairnessRate=(\d+)%/);
          if (m) e.fairRates.push(parseInt(m[1], 10));
        }
        byVersion.set(key, e);
      }

      const versionSummary = [...byVersion.entries()].map(([key, e]) => ({
        promptVersionId: key,
        resolvedCount: e.resolvedCount,
        resolutionRate: e.resolvedCount > 0 ? Math.round((e.resolvableCount / e.resolvedCount) * 100) : 0,
        avgSessionCount: e.resolvedCount > 0 ? Math.round(e.sessionTotal / e.resolvedCount) : 0,
        avgFairnessRate: e.fairRates.length > 0 ? Math.round(e.fairRates.reduce((a, b) => a + b, 0) / e.fairRates.length) : null,
      }));

      const dataText = versionSummary
        .map(
          (v) =>
            `Version ${v.promptVersionId}: ${v.resolvedCount} grounds, ${v.resolutionRate}% resolution rate, avg ${v.avgSessionCount} sessions, avg fairness ${v.avgFairnessRate ?? 'n/a'}%`,
        )
        .join('\n');

      const result = await this.anthropic.respond(OUTCOME_LEARNING_PROMPT, [
        { role: 'user', content: dataText },
      ]);

      this.logger.log(`Weekly outcome learning report:\n${result}`);
    } catch (err: any) {
      this.logger.error(`Weekly outcome learning report failed: ${err.message}`);
    }
  }
}

/**
 * A name beside each label in the engagement header, leaving every label exactly as it was.
 *
 * Structural only: it adds one key and changes nothing else, so nothing that matches on `label`
 * can be affected by it.
 */
export function theNamesBesideTheLabels(
  engagement: any,
  visible: Map<string, string>,
  /**
   * AND A PLAIN PHRASE WHERE THERE IS NO NAME TO PUT.
   *
   * `who` is the field a page prints, and it fell back to the raw label - so the header of the
   * report Amara Diallo opens listed her colleague as "Participant B" while the paragraph below it
   * called him something a person would say. Same map the prose uses, so the header and the
   * paragraph cannot disagree about what one person is called. See plainWordsForTheUnnameable.
   */
  plainly?: Map<string, string>,
): any {
  if (!engagement || typeof engagement !== 'object' || !Array.isArray(engagement.parties)) return engagement;
  return {
    ...engagement,
    parties: engagement.parties.map((p: any) => {
      const label = typeof p?.label === 'string' ? p.label : null;
      const name = label ? visible.get(label) ?? plainly?.get(label.trim()) : null;
      return name ? { ...p, who: name } : { ...p, who: label ?? null };
    }),
  };
}

/**
 * WHERE ONE OF THEIR OWN LINES COMES FROM, IN THE END CARD'S WORDS (sales-first.md, section 5): their own
 * report says how each line is known the way the card before they finished did, so a photo is only ever
 * claimed where one backs the line.
 */
export function howTheirLineIsKnown(type: unknown, mark: string, anchoredOrigin: string | null | undefined): string {
  if (mark === 'proven') return whatProvedIt({ anchoredOrigin: anchoredOrigin ?? null });
  if (mark === 'confirmed') return HOW.confirmed;
  if (mark === 'memory') return HOW.memory;
  return String(type) === 'COMMITMENT' ? HOW.commitment : HOW.said;
}
