import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { howToSayIt, NEVER_CONCLUDE_FROM_A_KIND, WHAT_IT_MEANS, WHO_CAN_MOVE_IT } from '../board/what-kind-of-thing-is-in-the-way';
import { howItReads, WHAT_A_NUMBER_IS_NOT, NEVER_CONCLUDE_FROM_A_NUMBER } from '../public-api/a-number-does-not-argue';
import { whatTheRecordsReach, NEVER_CONCLUDE_ABOUT_SHIPPING } from '../public-api/what-shipped-actually-means';
import { whatCouldBeChecked, AClaim, COULD_NOT_WORK_IT_OUT } from './what-nothing-here-could-check';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { confidenceInThePicture, CURRENT_BEST_READING } from './confidence-in-the-picture';
import { softSpots, whatWouldRaiseIt } from './harder-to-fool';
import { markWhatOnlyTheLeadSaid, whyItWasDropped } from './a-lead-note-is-not-evidence';
import { whatALeaderCanWeigh, THIS_IS_MATERIAL_NOT_A_VERDICT } from './what-a-leader-can-weigh';
import { accountShapeFor, standardsAndWhatTouchedThem, type EntryRow } from './what-the-record-actually-holds';
import { forbiddenNames, sanitiseGuide, PostReportGuide } from './guide-sanitiser';
import { whereYouAreAgainstWhatYouNamed } from './where-you-are-against-what-you-named';
import { whenThisWouldHaveSurfaced } from './when-this-would-have-surfaced';
import { ONE_SITTING_ONLY, ALREADY_IN_THE_OPEN } from './there-is-not-always-a-next-time';
import { isThisACascade } from '../board/is-this-a-cascade';
import { theSessionReport, hasOwnerAndDate } from './the-session-report';
import { whatToWorkOnNext } from './what-to-work-on-next';
import { whatToProbe } from './what-to-probe';
import { wordedByTheModel, type Drafted } from './the-engine-drafts-it-the-model-words-it';
import { rememberedCompose } from './a-line-worded-once-is-kept';
import { stillRaised, notRaisedAgain, sayingWhatWentQuiet } from '../board/a-blocker-nobody-raised-again';
import { pickTheFinding, draftThePicture, draftTheQuestion, WHY_NO_QUESTION } from './the-picture-is-drafted-from-the-reads';
import { sentenceWithANumber } from './where-you-are-against-what-you-named';
import { originLabel, COUNTS_AS_A_SOURCE } from '../documents/what-kind-of-thing-a-document-is';
import { buildCoverage, buildContribution } from '../board/reads';
import { roleMapFor } from '../board/role-maps';
import { BoardFamily, familyFor } from '../board/board-families';

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
import { howTheNumbersSit } from './do-the-parts-add-up-to-the-whole';
import { whatTheyCouldTry } from './what-you-could-try-next';
import { theQuestionOnly } from './the-question-ends-at-the-question-mark';
import { whatSituationThisIsAbout } from './what-situation-this-report-is-about';
import { totalSessionsFor } from '../grounds/session-count';
import { oneBlockerPerThingWaitedOn, theyNamedWhatTheyAreWaitingOn } from '../board/a-blocker-with-nothing-in-it-is-the-same-blocker';
import {
  CORRECTION_WINDOW_KEY,
  DEFAULT_CORRECTION_WINDOW_DAYS,
  isAWindow,
  whetherItCanStillBeCorrected,
} from '../conversation/the-window-for-correcting-a-record';
import { labelsForParties, namesVisibleTo, readsWithNamesOf, withNames, viewerLabelOf } from './party-labels';
import { withoutOtherPeoplesReads } from './own-reads-only';
import { tallyInReport } from './counts-accounts';
import { forensicInReport, withoutDashes } from './forensic-voice';
import { PrismaService } from '../prisma/prisma.service';
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
import { findDeferrals, findWaitingBehind, buildDeferralNotice } from './deferrals';
import { GroundStatus, PartyType, CheckInStatus, GroundScenario, UsageEventType, ReportActivationStatus, PatternStatus, RecordEntryType } from '@prisma/client';
import { NEW_STARTING_REPORT_SCHEMA, RECOGNITION_REPORT_SCHEMA, DRIFT_REPORT_SCHEMA } from '../conversation/prompt-library';
import { BAD_FAITH_CODES, POSITIVE_CODES, CARRYING_CODES, ALIGNMENT_FEED_ONLY_CODES, isPositiveCode, isCarryingCode } from '../patterns/pattern-library';
import { decide, RoundPicture } from './what-the-report-said-at-the-time';
import { whyNot } from './why-it-is-not-happening';
import { howThisHasMoved } from './how-this-has-moved';
import { doesThisReportMarkItsInferences } from './a-report-that-marks-nothing';
import { notTheWordParty } from './not-the-word-party';
import { whyThereIsNoReportYet } from './why-there-is-no-report-yet';
import { whatThisRecordRestsOn, nothingRestsOnADocument } from './what-this-record-rests-on';
import { documentsSection } from './a-document-in-the-corpus';
import { everybodySaidLittle } from './a-record-can-be-thin-for-everybody';
import { whatTheRosterSaysAbout } from './a-party-who-spoke-is-not-absent';
import { everyDivergenceReadable } from './a-field-name-is-not-a-heading';
import { liftsInReport, withholdLiftsIn } from './said-in-its-own-words';
import { rankOf, labelFromMean } from '../conversation/how-checkable-a-session-was';
import { whatThisSessionHolds } from './what-this-session-holds';
import { adminsThisOrg } from '../grounds/who-may-read-this-check-in';
import { documentBackedShare } from './backed-by-a-document';
import { howManyHaveAnswered } from './how-many-have-answered';

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
  'You are a Groundwork analyst. You are given structured data: for each active prompt version, the number of grounds resolved, the total outcomes, and the fairness rate (% of parties who said the process felt fair). Produce a 3–5 sentence summary identifying which version(s) have the highest resolution rate, any version showing decline, and a one-sentence recommendation. Data is anonymous - no names, no org identifiers.';

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
            topic: { type: 'string' },
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
              description: "1-2 short supporting references for this gap, taken from what people actually said (brief paraphrase or short quote). Grounds the gap in what was actually said; omit if nothing supports it.",
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
          required: ['topic', 'positions', 'atStake'],
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
            reason: { type: 'string', description: 'Brief explanation of what this was concluded from, given no participant stated it.' },
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
            evidence: { type: 'string', description: 'Brief paraphrase of what the record says about this uncredited contributor.' },
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

14b. A LEADERSHIP PATTERN CAN LIVE IN ONE ACCOUNT. Several of these patterns are visible from a single person's record over time - a conversation named as still to be had across three sessions without it happening is a pattern whether or not anyone else mentions it. Do not require both sides to speak to it before reporting it. Where a second account does corroborate, say so in the note.
13. LEAD-SUPPLIED CONTEXT IS DIRECTION, NEVER A CLAIM. The LEAD-SUPPLIED CONTEXT section is private background from the initiator, not a party's statement. Use it only to decide what to weigh and what to probe. Never attribute it to a party, never quote it, never present it as an established fact, and never let it become a claim in the report. Every claim you write must trace to a party's own record entry - if lead context points at something no party's record supports, do not assert it.`;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

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
  ): Promise<Record<string, any>> {
    try {
      const lead = participants.find((p) => p.partyType === PartyType.INITIATOR);
      if (!lead) return {};

      const [rows, docs, closing] = await Promise.all([
        this.prisma.recordEntry.findMany({
          where: { disputedAt: null, participant: { groundId } },
          select: { participantId: true, type: true, text: true, checkIn: { select: { sessionNumber: true } } },
        }),
        this.prisma.groundDocument.findMany({ where: { groundId }, select: { participantId: true, fileName: true } }),
        this.prisma.ground.findUnique({ where: { id: groundId }, select: { status: true, resolutionState: true } }),
      ]);

      const entries: EntryRow[] = rows
        .filter((r) => !!r.participantId)
        .map((r) => ({
          participantId: r.participantId as string,
          type: String(r.type),
          text: r.text,
          sessionNumber: r.checkIn?.sessionNumber ?? 1,
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
      const section = whatALeaderCanWeigh({
        statedStandards: stated,
        standardsTouched,
        entries: entries.map((r) => ({ kind: r.type as any, text: r.text, session: r.sessionNumber })),
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
      'Third person, present tense where the lines allow: "Has the migration running on two of the',
      'four services and expects the rest by the end of the month, with the data backfill still',
      'unscheduled."',
      '',
      'If the lines are too thin or too scattered to say anything true in one sentence, return an',
      'empty string. An empty string is a correct answer here and a vague sentence is not - the',
      'fragments are shown either way, so nothing is lost by declining.',
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
          const res = await this.anthropic.extract<{ saying: string }>(
            SAYING_PROMPT,
            [{ role: 'user', content: `THEIR OWN LINES:\n${lines.map((l) => `- ${l}`).join('\n')}` }],
            SAYING_SCHEMA,
          );
          const text = res?.saying?.trim();
          if (text) person.saying = text;
        } catch (err: any) {
          /* One person loses their sentence and keeps every line. The report is unaffected. */
          this.logger?.warn?.(`The written-sentence pass failed for one person: ${err?.message}`);
        }
      }),
    );
  }

  async synthesize(groundId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, include: { participants: true } });
    if (!ground) throw new NotFoundException('Check-in not found');

    // Build context preamble from the ground's pre-agreed resolution state,
    // initiator brief, and the initiator's persistent profile signals (if any).
    const [initiatorProfile] = await Promise.all([
      this.prisma.adminProfile.findUnique({ where: { userId: ground.initiatorId }, select: { signals: true } }).catch(() => null),
    ]);
    const groundContextLines: string[] = [];
    if ((ground as any).resolutionState) {
      groundContextLines.push(`PRE-AGREED RESOLUTION STATE: ${(ground as any).resolutionState}`);
    }
    if ((ground as any).brief) {
      groundContextLines.push(`INITIATOR'S OPENING BRIEF: ${(ground as any).brief}`);
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
      select: { name: true, target: true, ownerParticipantId: true },
    }) ?? Promise.resolve([]))
      .catch(() => [] as { name: string; target: number | null; ownerParticipantId: string | null }[]);
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
        const label = (ground.participants ?? []).find((p) => p.id === pid)?.email ?? pid;
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
      select: { id: true, partyType: true, roleAsDescribed: true },
    });
    // One labelling rule, shared with the read path so a stored label always
    // resolves back to the same person. See party-labels.ts.
    const labelById = labelsForParties(parties as any);

    /*
     * DISPUTED LINES COME THROUGH HERE, LABELLED. See
     * a-disputed-line-is-shown-as-disputed.ts: a dispute stops a line counting, it does not delete
     * it. The reads that COUNT still filter it out; this is the read the report is written from, so
     * the claim and the objection arrive together and the report can say the accounts differ.
     */
    const records = (await this.prisma.recordEntry.findMany({
      where: { participant: { groundId } },
      include: {
        participant: { select: { id: true } },
        checkIn: { select: { sessionNumber: true } },
      },
    })).map(withTheDisputeAttached);

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
      where: { participant: { groundId }, isSetup: false },
      _max: { sessionNumber: true },
    }) ?? Promise.resolve(null))
      .then((r: any) => r?._max?.sessionNumber ?? 1)
      .catch(() => 1);
    const theSituation = whatSituationThisIsAbout(
      (ground as any).scenario,
      roundNow,
      totalSessionsFor((ground as any).timelineDays, (ground as any).cadence) ?? null,
    );
    const systemPrompt = synthesisVersion.content + "\n\n" + SYNTHESIS_RULES + "\n\n" + buildLeadershipPatternBlock() + "\n\n" + HOW_TO_READ_A_DISPUTED_LINE + (theSituation ? "\n\n" + theSituation : "");


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
      });
    });
    const roster = `PARTY ROSTER (exhaustive - there are exactly ${parties.length} parties on this ground, no others exist):\n${rosterLines.join('\n')}\n\n`;

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
      records.map((r) => {
        const label = labelById.get(r.participant.id) ?? 'a party';
        const session = r.checkIn?.sessionNumber ? ` session ${r.checkIn.sessionNumber}` : '';
        return `[${label}${session}] (${r.type}) ${r.text}`;
      }).join('\n');

    const NEW_STARTING_SCENARIOS: GroundScenario[] = [
      GroundScenario.NEW_HIRE,
      GroundScenario.NEW_COFOUNDER,
      GroundScenario.NEW_ADVISOR,
      GroundScenario.NEW_PROJECT,
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

    let result: SynthesisResult | null;
    try {
      result = await this.anthropic.extract<SynthesisResult>(
        systemPrompt,
        [{ role: 'user', content: grounding ? `${corpus}\n\n${grounding}` : corpus }],
        activeSchema,
      );
    } catch (err: any) {
      this.logger?.error?.('Report synthesis extract failed', err?.message);
      throw new Error('Report synthesis failed - AI response could not be parsed. Please try again.');
    }
    if (!result) throw new Error('Report synthesis failed to return structured output');

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
        .extract<SynthesisResult>(systemPrompt, [{ role: 'user', content: brevityPrefix + corpus }], activeSchema)
        .catch((err: any) => {
          this.logger?.warn?.(`The shorter-version pass failed; keeping the long report. ${err?.message ?? err}`);
          return null;
        });
      if (retry) result = retry;
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
    const corpusText = records.map((r) => r.text).join('\n');
    const corpusDigits = new Set(corpusText.match(/\d+/g) ?? []);
    const knownWords = new Set(
      [...labelById.values(), ...(corpusText.match(/\b[A-Z][a-zA-Z]+\b/g) ?? [])]
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
              `${corpus}\n\nA previous attempt had a problem and was not used. ` +
              `Write the report again, fixing this: ${faults.join(' Also: ')}`,
          }],
          activeSchema,
        )
        .catch(() => null);
      if (secondPass && faultsIn(secondPass).length < faults.length) {
        result = secondPass;
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
              `${corpus}\n\nHere is the report you wrote:\n${JSON.stringify(result)}\n\n` +
              `These phrases are copied word for word from one person's record: ${stillLifted.map((l) => `"${l.run}"`).join('; ')}. ` +
              `Return the same report with each of those phrases said in your own words. Keep every fact and change nothing else.`,
          }],
          activeSchema,
        )
        .catch(() => null);
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
      this.logger?.warn?.(`Ground ${groundId}: the picture kept a severe fault after two passes (${stillSevere.join('; ')}); shipping the previous picture instead.`);
      /* Read here, on this rare path, rather than threaded from the engagement read further down. */
      const previous = await this.prisma.report.findUnique({ where: { groundId }, select: { sharedPicture: true } }).catch(() => null);
      (result as any).sharedPicture = previous?.sharedPicture ?? '';
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

    await this.fillAtStake(result.divergences);

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
      note: `This report is built from what each person said themselves - it is not independently verified.${absent.length ? ` ${absent.length} invited part${absent.length === 1 ? 'y has' : 'ies have'} not yet contributed a record - the picture below reflects only the accounts that are present. Do not read any shared positions or agreements as bilateral until all parties have checked in.` : ''}`,
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
        dimensions: Object.entries(dims).map(([dim, level]) => ({
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
          openQuestions.push(questions[questions.length - 1].trim());
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
    const enrichedEngagement = gated.engagement;

    const inferences = ((result as any).inferences ?? []) as Array<{ id: string; text: string; participantLabel: string; reason: string }>;

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
      select: { engagement: true },
    });
    const priorEngagement = priorReport?.engagement as Record<string, any> | null | undefined;
    const existingGuides = priorEngagement?.postReportGuides;

    const report = await this.prisma.report.upsert({
      where: { groundId },
      create: {
        groundId,
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
        inferences: inferences as any,
        leadershipGaps: (((result as any).leadershipGaps ?? []).length ? (result as any).leadershipGaps : undefined) as any,
        promptVersionId: synthesisVersion.id,
        finalSynthesis: (Object.keys(arcByParticipant).length
          ? { closingComplete: true, tiers: Object.fromEntries(Object.entries(arcByParticipant).map(([pid, s2]) => [pid, s2.tier])), endStates: endStatesFor(ground.scenario).map((o) => ({ value: o.value, label: o.label })) }
          : undefined) as any,
        arcSignals: (Object.keys(arcByParticipant).length ? arcByParticipant : undefined) as any,
        releasedAt: null,
      },
      update: {
        sharedPicture: result.sharedPicture,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: theQuestionOnly(result.centralQuestion) ?? result.centralQuestion,
        // Carry the private guides across. See the note on the create branch:
        // this write is what destroyed them on every session after the first.
        engagement: { ...enrichedEngagement, ...(existingGuides ? { postReportGuides: existingGuides } : {}) } as any,
        inferences: inferences as any,
        leadershipGaps: (((result as any).leadershipGaps ?? []).length ? (result as any).leadershipGaps : undefined) as any,
        promptVersionId: synthesisVersion.id,
        finalSynthesis: (Object.keys(arcByParticipant).length
          ? { closingComplete: true, tiers: Object.fromEntries(Object.entries(arcByParticipant).map(([pid, s2]) => [pid, s2.tier])), endStates: endStatesFor(ground.scenario).map((o) => ({ value: o.value, label: o.label })) }
          : undefined) as any,
        arcSignals: (Object.keys(arcByParticipant).length ? arcByParticipant : undefined) as any,
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
  /** The one rule (grounds/who-may-read-this-check-in.ts): an admin of THIS organisation, by role, re-read from the database. */
  private async isAnAdminOf(requestingUserId: string, requestingUserOrgId: string | undefined, groundOrganizationId: string): Promise<boolean> {
    if (!requestingUserOrgId || groundOrganizationId !== requestingUserOrgId) return false;
    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true, organizationId: true } });
    return adminsThisOrg(user, { organizationId: groundOrganizationId });
  }

  async whereAgainstSuccess(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        organizationId: true,
        initiatorId: true,
        participants: {
          select: {
            id: true, userId: true, roleAsDescribed: true, managingOnly: true, partyType: true, email: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        report: { select: { releasedAt: true } },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    const isInitiator = ground.initiatorId === requestingUserId;
    const me = ground.participants.find((p) => p.userId === requestingUserId) ?? null;
    const isOrgAdmin = !isInitiator && !me && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground.organizationId));
    /* NotFound, not Forbidden. GW-PRI-04: a 403 tells a stranger the check-in is real. */
    if (!me && !isInitiator && !isOrgAdmin) throw new NotFoundException('Check-in not found');

    const viewerIsLead = isInitiator || isOrgAdmin;
    const released = !!ground.report?.releasedAt;
    const readableParticipantIds = released || viewerIsLead
      ? ground.participants.map((p) => p.id)
      : me ? [me.id] : [];

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
    const nameByLabel = namesVisibleTo(me?.id ?? null, ground.participants as any, this.peersAreNamed(ground as any));
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
        where: { disputedAt: null, participantId: { in: readableParticipantIds } },
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
      version: baseline?.version ?? null,
      conditions: Array.isArray(baseline?.conditions) ? (baseline!.conditions as string[]) : [],
      entries: entries.map((e) => ({ type: e.type, text: cleanText(e.text), who: whoOf(e.participantId) })),
    });
  }

  async sessionReport(groundId: string, sessionNumber: number, requestingUserId: string, requestingUserOrgId?: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        organizationId: true,
        initiatorId: true,
        /* `partyType` and the user's name because `namesVisibleTo` decides from both which
           labels this reader may resolve; `email` as the last resort a lead is entitled to. */
        participants: {
          select: {
            /* The function detection columns, so the conversation question can read the role map of
               the round's clearest function. Same tier as roleAsDescribed: a fact about the work. */
            detectedFunction: true, detectedFunctionConfidence: true,
            id: true, userId: true, roleAsDescribed: true, managingOnly: true, partyType: true, email: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        report: { select: { agreements: true, divergences: true, centralQuestion: true, releasedAt: true } },
        brief: true,
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    const isInitiator = ground.initiatorId === requestingUserId;
    const me = ground.participants.find((p) => p.userId === requestingUserId) ?? null;
    const isOrgAdmin = !isInitiator && !me && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground.organizationId));
    /*
     * NOT FOUND, NOT FORBIDDEN. GW-PRI-04.
     *
     * A 403 answers "this check-in exists, it is just not yours", and a 404 answers nothing - so
     * a 403 here lets somebody with a list of guessed ids tell real check-ins from imaginary
     * ones. `get()` has always thrown NotFound for both cases for exactly this reason, and the
     * privacy suite pins it. I wrote this one as Forbidden.
     */
    if (!me && !isInitiator && !isOrgAdmin) throw new NotFoundException('Report not found');
    const viewerIsLead = isInitiator || isOrgAdmin;
    const released = !!ground.report?.releasedAt;

    /* The snapshot, when this round closed. Its presence IS what makes the report final. */
    const snapshot = await this.prisma.reportRound.findUnique({
      where: { groundId_sessionNumber: { groundId, sessionNumber } },
      select: { sharedPicture: true, agreements: true, divergences: true, centralQuestion: true, takenAt: true, amendedAt: true, amendedNote: true },
    });

    const previousSnapshot = sessionNumber > 1
      ? await this.prisma.reportRound.findUnique({
        where: { groundId_sessionNumber: { groundId, sessionNumber: sessionNumber - 1 } },
        select: { sharedPicture: true },
      })
      : null;

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
        select: { type: true, text: true, recallBased: true, anchoredOrigin: true, dimensionThreadKey: true, participantId: true },
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

    const docs = await this.prisma.groundDocument.findMany({
      where: { groundId, participantId: { in: readableParticipantIds } },
      select: { fileName: true, participantId: true, origin: true },
    });

    /*
     * NAMED WHERE THIS READER IS ALLOWED TO SEE A NAME, and labelled where they are not.
     *
     * The report is generated in labels - "participant A", "participant B" - precisely so it can
     * never carry a name across the wall, and `namesVisibleTo` decides which of them this reader
     * may resolve: their own, the lead's, and everybody's if they ARE the lead. Driven live as a
     * lead, this row read "participant A (you)" and "participant B", which is the same defect as
     * a roster calling three colleagues "a teammate" - and the rule that fixes it is the one the
     * report body already uses, not a second guess at it.
     */
    const nameByLabel = namesVisibleTo(me?.id ?? null, ground.participants as any, this.peersAreNamed(ground as any));
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
     * WHO ANSWERED THIS SESSION, READ BEFORE ANYTHING USES IT.
     *
     * This sat with the reveal rows further down, and the per-person section built above it reads
     * the same set - so the assembled report threw "Cannot access 'answeredIds' before
     * initialization" on every request. TypeScript cannot see it: a `const` used before its line
     * is a runtime temporal-dead-zone error, not a type error, and every unit test passed because
     * they call the pure assembler rather than this read. Found by opening the page.
     */
    const answered = await this.prisma.checkIn.findMany({
      where: { groundId, sessionNumber, status: 'COMPLETED' },
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
      whatThisSessionHolds(this.prisma, groundId, sessionNumber),
      this.prisma.recordEntry.count({ where: { disputedAt: null, participant: { groundId }, checkIn: { sessionNumber } } }),
      this.prisma.recordEntry.count({ where: { disputedAt: null, participant: { groundId }, checkIn: { sessionNumber }, recallBased: false, anchoredOrigin: { in: [...COUNTS_AS_A_SOURCE] as any } } }),
      howManyHaveAnswered(this.prisma, groundId, sessionNumber),
    ]);

    const shape = theSessionReport({
      sessionNumber,
      /* The same arithmetic the chat composer does when it says "session 3 of 6": the length over
         the rhythm. Null where either is unset, so the header omits the position rather than
         inventing a denominator. */
      plannedSessions: (() => {
        const step = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30 }[(ground as any).cadence as string];
        const days = (ground as any).timelineDays;
        return step && days ? Math.max(1, Math.floor(days / step)) : null;
      })(),
      closed: !!snapshot,
      agreements: (snapshot?.agreements ?? ground.report?.agreements ?? []) as unknown[],
      divergences: (snapshot?.divergences ?? ground.report?.divergences ?? []) as unknown[],
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
        who: whoOf(e.participantId),
        recallBased: e.recallBased,
        backedBy: (e as any).anchoredOrigin ?? null,
        threadKey: e.dimensionThreadKey ?? null,
      })),
      previousEntries: previousEntries.map((e) => ({
        type: e.type,
        text: cleanText(e.text),
        /* Whose commitment it was. Without it the reader calls every carried line the reader's own. */
        who: whoOf(e.participantId),
        threadKey: e.dimensionThreadKey ?? null,
      })),
      baselineSuccess: baseline?.successLooksLike ?? null,
      startingPoint: startingPoint?.text ?? null,
      previousSharedPicture: previousSnapshot?.sharedPicture ?? null,
      /* A document with no participant belongs to the check-in rather than to a person. */
      /* Named for what kind of thing it is: a typed document, a photo, notes written with a model. */
      evidence: docs.map((d) => ({ text: originLabel((d as any).origin) ? `${d.fileName} · ${originLabel((d as any).origin)}` : d.fileName, who: d.participantId ? whoOf(d.participantId) : null })),
      specificityLevel: checkIn?.specificityLevel ?? null,
      centralQuestion: snapshot?.centralQuestion ?? ground.report?.centralQuestion ?? null,
      /*
       * THE THREE THE FOUR READS NEED THAT THE ENTRIES DO NOT CARRY. Read the same way the board
       * reads them, from the same rows, so the two surfaces cannot disagree about how many things
       * are blocked - which is worse than one of them not saying.
       */
      movedOnTargets: held.movedOnTargets,
      blocked: held.blocked,
      waiting: held.waiting,
      saidInAll,
      documentedInAll,
      /* Everybody the session counts, from the one definition (how-many-have-answered.ts): the
         confidence read is about how much basis there is, and somebody who has not answered is the
         largest gap there is. */
      peopleInAll: whoAnswered.expected,
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
                  return label || 'A teammate';
          })(),
          isYou: !!me && p.id === me.id,
        })),
    });

    /*
     * The written sentence per person, above their own fragments. See the pass: it is given one
     * person's lines and nothing else, the fragments are kept, and a decline costs nothing.
     */
    await this.fillWhatEachPersonSaid(shape.whatEachPersonSaid as any[]);

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
    const counting = ground.participants
      .filter((p) => !p.managingOnly)
      .map((p, i) => ({
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
              return label || 'A teammate';
        })(),
        isYou: !!me && p.id === me.id,
        answered: answeredIds.has(p.id),
        hasShownTheirs: shown.has(p.id),
      }));

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
    const againstSuccess = whereYouAreAgainstWhatYouNamed({
      counting: readableParticipantIds.length === ground.participants.length ? 'everyone' : 'only-yours',
      stated: baseline?.successLooksLike ?? null,
      leadHasSaidIt: everyEntrySoFar.some(
        (e) => e.type === RecordEntryType.SUCCESS_DEFINITION
          && ground.participants.find((x) => x.id === e.participantId)?.userId === ground.initiatorId,
      ),
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

    /* Surfaced detections, computed once: the section renders them and the picture draft reads them. */
    const patternsForPage = (await this.prisma.patternDetection.findMany({
      where: { groundId, status: PatternStatus.SURFACED },
      orderBy: [{ periodsObserved: 'desc' }, { lastSeenAt: 'desc' }],
      select: { participantId: true, code: true, periodsObserved: true },
    }))
      .filter((r) => !ALIGNMENT_FEED_ONLY_CODES.has(r.code) && patternCatalogue().has(r.code))
      .map((r) => {
        const lib = patternCatalogue().get(r.code)!;
        return {
          who: whoOf(r.participantId) ?? (me && r.participantId === me.id ? 'You' : 'Somebody'),
          isYou: !!me && r.participantId === me.id,
          signal: lib.signal,
          positive: isPositiveCode(r.code),
          carrying: isCarryingCode(r.code),
          periodsObserved: r.periodsObserved,
        };
      });
    /* Rows the picture draft and the question read. Each starts inside a promise: see myOwnSoftSpots. */
    const started = <T,>(f: () => Promise<T>, fallback: T): Promise<T> => Promise.resolve().then(f).catch(() => fallback);
    const [mentionRows, depRows] = await Promise.all([
      started(() => this.prisma.workMention.findMany({ where: { groundId }, select: { sourceParticipantId: true, aboutParticipantId: true, kind: true, sessionNumber: true } }), [] as any[]),
      started(() => this.prisma.groundDependency.findMany({
        where: { groundId, status: { in: ['WAITING', 'BLOCKING'] as any } },
        select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, status: true, createdAt: true, escalatedAt: true, blockerKind: true, sourceCheckInId: true },
      }), [] as any[]),
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
    const currentDeps = stillRaised(withSession, latestSessionByPerson);
    const wentQuiet = notRaisedAgain(withSession, latestSessionByPerson).length;
    if (wentQuiet) this.logger.log(`${wentQuiet} handoff(s) on ${groundId} have not been raised again; left out of the current read.`);

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
      shape.atAGlance.forEach((t, i) => drafts.push({ key: `sub${i}`, text: `${t.label}: ${t.value}, ${t.sub}.`, mustKeep: [t.value] }));
      shape.confidence.reasons.forEach((r, i) => drafts.push({ key: `why${i}`, text: r }));
      drafts.push({ key: 'conf', text: shape.confidence.saying });
      drafts.push({ key: 'stand', text: shape.whereThingsStand.saying });
      const said = await this.phrase('the session report', drafts);
      const subOf = (i: number, t: { label: string; value: string; sub: string }) => {
        const w = said[`sub${i}`];
        /* The tile keeps label and value as its own fields; only the sub-line takes the wording. */
        const m = w ? w.match(new RegExp(`^${t.label}: ${t.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\s*(.*)\.?$`)) : null;
        return m ? m[1].replace(/\.$/, '') : t.sub;
      };
      return {
        ...shape,
        sections: shape.sections.map((sec, i) => ({ ...sec, saying: sec.saying ? (said[`say${i}`] ?? sec.saying) : sec.saying })),
        atAGlance: shape.atAGlance.map((t, i) => ({ ...t, sub: subOf(i, t) })),
        confidence: { ...shape.confidence, saying: said.conf ?? shape.confidence.saying, reasons: shape.confidence.reasons.map((r, i) => said[`why${i}`] ?? r) },
        whereThingsStand: { ...shape.whereThingsStand, saying: said.stand ?? shape.whereThingsStand.saying },
      };
    })();

    return {
      ...wordedShape,
      againstSuccess,
      cascade: cascade && (cascade.isCascade || cascade.basis.includes('DECLARED')) ? cascade : null,
      /* For the page that says what the check-in still needs: the date this person gave, and the
         brief's own number, so neither is asked for as if nobody had said it. */
      myTimeframe: me ? (entries.filter((e) => e.participantId === me.id && e.type === RecordEntryType.TIMEFRAME).map((e) => cleanText(e.text)).pop() ?? null) : null,
      briefStandard: sentenceWithANumber((ground as any).brief),
      correctable: canCorrect.allowed,
      whyNotCorrectable: canCorrect.allowed ? null : canCorrect.saying,
      counting,
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
      released: !!ground.report?.releasedAt,
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
      patterns: patternsForPage,
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
         * THE READ IS ABOUT THE RECORD, SO IT IS GIVEN THE RECORD. This passed only the session in
         * hand, so the coverage read said "1 check-in on record" to somebody on their fourth, and
         * the shape-over-time read had one point to draw a shape from. Read live on the closing
         * report of a four-session ground. The whole run, with each entry under the session it was
         * said in.
         */
        const [everyAnswered, everyEntry] = await Promise.all([
          this.prisma.checkIn.findMany({
            where: { groundId, status: CheckInStatus.COMPLETED },
            select: { participantId: true, sessionNumber: true },
          }),
          this.prisma.recordEntry.findMany({
            /* A line somebody has disputed counts toward nothing. See a-disputed-row-counts-toward-nothing. */
            where: { disputedAt: null, checkIn: { groundId } },
            select: { participantId: true, text: true, checkIn: { select: { sessionNumber: true } } },
          }),
        ]);
        const readInput = {
          participants: ground.participants.map((p: any) => ({
            id: p.id, roleAsDescribed: p.roleAsDescribed ?? null, managingOnly: !!p.managingOnly,
            detectedFunction: p.detectedFunction ?? null, detectedFunctionConfidence: p.detectedFunctionConfidence ?? null,
          })),
          checkIns: everyAnswered.map((c) => ({ participantId: c.participantId, sessionNumber: c.sessionNumber, status: CheckInStatus.COMPLETED })),
          /*
           * THE RAW TEXT, MARKER AND ALL, AND THIS WAS A REAL FAULT.
           *
           * `cleanText` strips the `[VERIFIABILITY:HIGH]` prefix the extraction stamps on every
           * row. These reads decide how checkable somebody's account is by reading exactly that
           * prefix, so stripping it first made every entry unverifiable, for everybody, always.
           *
           * Read live on 11 September: a person who had given five dates, three names, a count of
           * twenty three items and two documents was told on the shared picture "1 check-in on
           * record. Nothing named so far could be checked by anyone else - no named people,
           * organisations, numbers or dates." The board says the opposite about the same rows,
           * because the board passes them through untouched.
           *
           * The reads strip the marker themselves before showing anything (see `body` in
           * reads.ts), so nothing reaches a reader with machinery on the front of it.
           */
          entries: everyEntry.map((e) => ({ participantId: e.participantId, sessionNumber: e.checkIn?.sessionNumber ?? sessionNumber, text: e.text })),
          mentions: mentionRows,
          dependencies: currentDeps.map((d: any) => ({
            fromParticipantId: d.fromParticipantId, onParticipantId: d.onParticipantId, onLabel: d.onLabel,
            what: d.what, status: d.status, createdAt: d.createdAt,
          })),
        };
        let coverage: { name: string; reasonText: string }[] = [];
        let contribution: { name: string; reason: string }[] = [];
        try {
          coverage = buildCoverage(readInput as any, nameFor).reads
            .filter((r) => r.reasonText?.trim() && r.name)
            .map((r) => ({ name: r.name!, reasonText: r.reasonText }));
          contribution = buildContribution(readInput as any, nameFor)
            .filter((r) => r.reason?.trim() && r.name)
            .map((r) => ({ name: r.name!, reason: r.reason! }));
        } catch (err: any) {
          this.logger.warn(`Board reads unavailable for the picture on ${groundId}: ${err?.message}`);
        }
        const drafts = draftThePicture({
          /* Where two people describe the same thing differently, that is the finding. */
          differences: ((snapshot?.divergences ?? ground.report?.divergences ?? []) as any[])
            .filter((d) => d?.topic && Array.isArray(d.perspectives) && d.perspectives.length >= 2)
            .slice(0, 3)
            .map((d) => ({
              topic: String(d.topic),
              sides: (d.perspectives as any[]).slice(0, 3).map((p) => ({ who: nameByLabel.get(String(p.participantLabel ?? '')) ?? String(p.participantLabel ?? 'somebody'), says: String(p.view ?? '') })),
            })),
          answered: whoAnswered.answered,
          ofPeople: whoAnswered.expected,
          confidence: shape.confidence,
          tiles: shape.atAGlance,
          patterns: patternsForPage,
          coverage,
          contribution,
          blockers: currentDeps.map((d: any) => ({
            who: nameFor(d.fromParticipantId),
            on: d.onParticipantId ? nameFor(d.onParticipantId) : d.onLabel,
            onIsPerson: !!d.onParticipantId,
            what: d.what, kind: (d.blockerKind as any) ?? null, escalated: !!d.escalatedAt,
            /* Whether they named the thing: the model's answer where we have it, the word-list rule
               on the rows written before that column existed. The finding's sentence branches on it. */
            named: theyNamedWhatTheyAreWaitingOn(d),
          })),
          settled: shape.whereThingsStand.settled,
          open: shape.whereThingsStand.open,
        });
        const question = draftTheQuestion({
          functions: ground.participants.map((p: any) => ({ fn: p.detectedFunction ?? null, confidence: p.detectedFunctionConfidence ?? null })),
          blockers: currentDeps.map((d: any) => ({ what: d.what, kind: (d.blockerKind as any) ?? null })),
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
        const findingKey = pickTheFinding(drafts.map((d) => d.key));
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
             chat composer does when it says "session 3 of 6". Null where either is unset, which
             makes the read fall silent rather than guess at a last session. */
          plannedSessions: (() => {
            const step = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30 }[(ground as any).cadence as string];
            const days = (ground as any).timelineDays;
            return step && days ? Math.max(1, Math.floor(days / step)) : null;
          })(),
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
          theConversationWorthHaving: question ? (wordedQ.question ?? question.text) : null,
          whyNoQuestion: question ? null : WHY_NO_QUESTION,
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
      writtenPicture: snapshot?.sharedPicture
        ? this.applyNames(
            { sharedPicture: snapshot.sharedPicture } as any,
            ground.participants as any,
            me?.id ?? null,
            viewerIsLead,
            this.peersAreNamed(ground as any),
          ).sharedPicture
        : null,
      takenAt: snapshot?.takenAt ?? null,
      amendedAt: snapshot?.amendedAt ?? null,
      amendedNote: snapshot?.amendedNote ?? null,
      /* Before release a party sees the counts and their own words, and is told so plainly. */
      showsEverybody: released || viewerIsLead,
    };
  }

  async rounds(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        organizationId: true,
        initiatorId: true,
        report: { select: { releasedAt: true } },
        participants: { select: { userId: true } },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    const isInitiator = ground.initiatorId === requestingUserId;
    const isParty = ground.participants.some((p) => p.userId === requestingUserId);
    const isOrgAdmin = !isInitiator && !isParty && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground.organizationId));
    /* NotFound, not Forbidden, for the reason in `sessionReport` above: a 403 confirms the
       check-in exists. This endpoint has had the leak since it was written. GW-PRI-04. */
    if (!isParty && !isInitiator && !isOrgAdmin) throw new NotFoundException('Report not found');

    /* Nothing has been revealed yet, so there is nothing anybody may read. */
    if (!ground.report?.releasedAt) return { rounds: [] };

    const kept = await this.prisma.reportRound.findMany({
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
    });

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
    const moved = howThisHasMoved(cleaned as any).map((m: any) => ({
      ...m,
      says: typeof m.says === 'string' ? notTheWordParty(m.says) : m.says,
    }));
    /*
     * WHAT EACH ROUND LED WITH, WORDED. `moved[].says` came out of howThisHasMoved and whyNot as
     * template sentences, the same on every ground. One call for the list, the round's own count of
     * differences held as a number the model may not touch.
     */
    const saidMoved = await this.phrase(
      'how this has moved',
      moved.map((m: any, i: number) => ({ key: `m${i}`, text: String(m.says ?? '') })),
    );
    return { rounds: cleaned, moved: moved.map((m: any, i: number) => ({ ...m, says: saidMoved[`m${i}`] ?? m.says })) };
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
        select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, escalatedAt: true, blockerKind: true },
      }),
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
            escalated: !!b.escalatedAt,
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
      lines.push(`- ${from}: ${howToSayIt(b.blockerKind as any, b.what, on)}${b.escalatedAt ? ' Already raised.' : ''}`);
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
  async generateForAdmin(groundId: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } });
    if (!ground) throw new NotFoundException('Check-in not found');

    const completedCount = await this.prisma.checkIn.count({ where: { groundId, status: 'COMPLETED' } });
    if (completedCount === 0) {
      throw new BadRequestException('No check-ins completed yet - at least one party must complete a session before a report can be generated.');
    }

    await this.synthesize(groundId);
    return { groundId, generated: true };
  }

  async release(groundId: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      include: { participants: { include: { user: { select: { passwordHash: true } } } }, report: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    if (!ground.report) throw new NotFoundException('Report not generated yet');
    if (ground.report.releasedAt) return ground.report; // already released

    // Send notification emails before stamping releasedAt so that if delivery
    // fails entirely, the report is not marked released without anyone being
    // notified. Partial failure (one email bounces) is still logged but does
    // not block the release - a hard stop would be worse than a logged gap.
    const frontend = this.config.get<string>('resend.frontendUrl');
    /**
     * THE ROUTE IS /grounds/:id/report, AND THIS SAID /report/:id.
     *
     * Every "your shared record is ready" email ever sent pointed at a path the
     * client has no route for, so the link opened the not-found page. The one
     * email in the product whose entire job is to bring somebody back to read
     * the thing they have been waiting for.
     *
     * Found by following the link out of a real inbox on ground 2. It cannot be
     * found any other way: nothing in the API knows what the client's routes are,
     * and the string looks perfectly reasonable sitting here.
     */
    const reportUrl = `${frontend}/grounds/${groundId}/report`;
    /*
     * A REPORT LINK OPENS THE REPORT (NL-022). The route is behind the sign-in wall, and this mail goes
     * to people invited by address who have never set a password - so the one mail whose whole job is
     * to bring somebody back landed them on a sign-in page. For them the link is their own invite
     * link, which signs them in the way it always has, with the report as where to go next. Somebody
     * with a password gets the report route directly.
     */
    const linkFor = (p: { inviteToken: string | null; user: { passwordHash: string | null } | null }) =>
      p.user?.passwordHash || !p.inviteToken
        ? reportUrl
        : `${frontend}/invite?token=${p.inviteToken}&next=${encodeURIComponent(`/grounds/${groundId}/report`)}`;
    const emailResults = await Promise.allSettled(
      ground.participants.map((p) => this.email.sendReportReady(p.email, ground.label, linkFor(p))),
    );
    /*
     * AND THE CHANNEL, IF THERE IS ONE.
     *
     * After the emails and outside the failure count on purpose: nobody's report
     * is unreleased because a customer's Slack channel was archived. The notice
     * says a report is ready and links to it — never what is in it, because a
     * channel is read by more people than a check-in. See
     * `what-a-channel-may-be-told.ts`.
     */
    await this.workspace
      .tell(ground.organizationId, { what: 'a report is ready', about: ground.label, link: reportUrl })
      .catch((err) => this.logger.warn(`Workspace notice failed for ground ${groundId}: ${err?.message}`));

    const failures = emailResults.filter((r) => r.status === 'rejected');
    if (failures.length) {
      failures.forEach((r) => this.logger.error(`Report release email failed for ground ${groundId}: ${(r as PromiseRejectedResult).reason}`));
      if (failures.length === ground.participants.length) {
        throw new Error('All report notification emails failed - report not released. Retry to send notifications.');
      }
    }

    const released = await this.prisma.report.update({ where: { groundId }, data: { releasedAt: new Date() } });
    this.usage.emit(UsageEventType.REPORT_RELEASED, { groundId, organizationId }).catch(() => undefined);

    // Generate per-party post-report conversation guides (#99). Best-effort -
    // a guide generation failure must never block report delivery.
    await this.generatePostReportGuides(released, ground.participants.map((p) => p.id)).catch((err) =>
      this.logger.error(`Post-report guide generation failed for ground ${groundId}: ${err.message}`),
    );

    return released;
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
  private applyNames<T extends Record<string, any>>(
    report: T,
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
      if (Array.isArray(v)) return v.map(walkTextOnly);
      if (v && typeof v === 'object') {
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) out[k] = NEVER_NAMED.has(k) ? val : walkTextOnly(val);
        return out;
      }
      return v;
    };

    return {
      ...report,
      sharedPicture: t(report.sharedPicture),
      centralQuestion: t(report.centralQuestion),
      agreements: walk(report.agreements),
      divergences: walk(report.divergences),
      finalSynthesis: walk(report.finalSynthesis),
      leadershipGaps: walk(report.leadershipGaps),
      engagement: walkTextOnly(report.engagement),
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
  private peersAreNamed(ground: { scenario?: any; peersVisibleToEachOther?: boolean | null }): boolean {
    const evaluative = [BoardFamily.EVALUATION, BoardFamily.COHORT].includes(familyFor(ground.scenario));
    return (ground as any).peersVisibleToEachOther ?? !evaluative;
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
  private async phrase(what: string, drafts: Drafted[]): Promise<Record<string, string>> {
    const out = await wordedByTheModel(
      drafts,
      rememberedCompose(this.prisma, (system, draft) => this.anthropic.respond(system, [{ role: 'user', content: draft }])),
      (why) => this.logger.warn(`Wording refused for ${what}, shipping the engine's own words: ${why}`),
    ).catch(() => drafts);
    return Object.fromEntries(out.map((d) => [d.key, d.text]));
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

  private async whatTheRecordHoldsFor(groundId: string, ground: any) {
    const [detections, dependencies, entries, docs, sessions] = await Promise.all([
      this.prisma.patternDetection.findMany({
        where: { groundId, status: PatternStatus.SURFACED },
        orderBy: { lastSeenAt: 'desc' },
        select: { participantId: true, code: true, periodsObserved: true },
      }),
      this.prisma.groundDependency.findMany({
        where: { groundId, status: { in: ['WAITING', 'BLOCKING'] as any } },
        select: {
          fromParticipantId: true, onParticipantId: true, onLabel: true,
          what: true, createdAt: true, escalatedAt: true,
          /* What kind of thing is in the way, and therefore who can move it. The row has carried
             this all along and both coaching surfaces said "waiting on X" without reading it. */
          blockerKind: true,
        },
      }),
      this.prisma.recordEntry.findMany({
        where: { disputedAt: null, participant: { groundId } },
        select: { participantId: true, type: true, text: true, recallBased: true },
      }),
      this.prisma.groundDocument.findMany({ where: { groundId }, select: { participantId: true } }),
      this.prisma.checkIn.findMany({
        where: { groundId, status: CheckInStatus.COMPLETED },
        select: { participantId: true, sessionNumber: true },
      }),
    ]);
    const wholeDays = (d: Date) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));
    return { detections, dependencies, entries, docs, sessions, wholeDays, ground };
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
    participant: { id: string; roleAsDescribed?: string | null },
    nameOf: (participantId: string | null, fallback: string | null) => string | null,
  ) {
    const held = await this.whatTheRecordHoldsFor(groundId, ground);
    const mine = held.entries.filter((e) => e.participantId === participant.id);
    const mySessions = held.sessions.filter((c) => c.participantId === participant.id);
    const sessionNumber = mySessions.length ? Math.max(...mySessions.map((c) => c.sessionNumber)) : 1;
    const planned = (ground.checkIns ?? []).reduce((n: number, c: any) => Math.max(n, c.sessionNumber ?? 0), 0);

    const map = roleMapFor((participant as any).detectedFunction);
    const thisOneIsTheClosingSession = !!(await this.prisma.checkIn.findFirst({
      where: { groundId, participantId: participant.id, sessionNumber, isFinal: true },
      select: { id: true },
    }));
    const note = whatToWorkOnNext({
      patterns: held.detections
        .filter((d) => d.participantId === participant.id)
        .map((d) => ({ code: d.code, periodsObserved: d.periodsObserved })),
      role: participant.roleAsDescribed ?? null,
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
          escalated: !!d.escalatedAt,
          kind: (d.blockerKind as any) ?? null,
        })),
      holdingUp: held.dependencies
        .filter((d) => d.onParticipantId === participant.id)
        .map((d) => ({
          what: d.what,
          who: nameOf(d.fromParticipantId, null),
          daysOld: held.wholeDays(d.createdAt),
          escalated: !!d.escalatedAt,
          kind: (d.blockerKind as any) ?? null,
        })),
      saidSomethingSpecific: mine.length > 0,
      anythingDocumented: mine.some((e) => !e.recallBased),
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
        { key: 'protectAgainst', text: `This kind of work is often read unfairly, and that is worth knowing before you read anything into where you stand.`, context: `How ${note.role.label.toLowerCase()} work gets read unfairly: ${note.role.protectAgainst}` },
      ] : []),
      ...note.beforeNextTime.map((t, n) => ({
        key: `a${n}`,
        text: t,
        mustKeep: rows.filter((r) => t.includes(r)),
      })),
    ]);
    return {
      ...note,
      whyItMatters: said.whyItMatters ?? note.whyItMatters,
      role: note.role ? {
        ...note.role,
        /* Only the fairness line is shown as its own block; it is written from the map, not lifted. */
        protectAgainst: said.protectAgainst ?? note.role.protectAgainst,
      } : null,
      beforeNextTime: note.beforeNextTime.map((t, n) => said[`a${n}`] ?? t),
    };
  }

  /**
   * WHAT TO PROBE EACH PERSON ON. THE LEAD, AND NOBODY ELSE.
   *
   * Guarded here rather than in the shape: a surface that is lead-only because a caller remembered
   * to check is one refactor away from not being.
   */
  private async whatToProbeOn(
    groundId: string,
    ground: any,
    viewerIsLead: boolean,
    nameOf: (participantId: string | null, fallback: string | null) => string | null,
    /** The same resolver without the second-person substitution, for headings. */
    nameOf2: (participantId: string) => string | null,
  ) {
    if (!viewerIsLead) return null;
    const held = await this.whatTheRecordHoldsFor(groundId, ground);
    const planned = (ground.checkIns ?? []).reduce((n: number, c: any) => Math.max(n, c.sessionNumber ?? 0), 0);
    const thisRound = planned > 0 ? planned : 1;

    const reads = (ground.participants ?? [])
      .filter((p: any) => !p.managingOnly)
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
          who: nameOf2(p.id) ?? 'Somebody',
          participantId: p.id,
          role: p.roleAsDescribed ?? null,
          answeredThisSession: answered,
          patterns: held.detections
            .filter((d) => d.participantId === p.id)
            .map((d) => {
              const lib = patternCatalogue().get(d.code);
              return {
                code: d.code,
                periodsObserved: d.periodsObserved,
                signal: lib?.signal ?? d.code,
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
              escalated: !!d.escalatedAt,
              kind: (d.blockerKind as any) ?? null,
            })),
          holdingUp: held.dependencies
            .filter((d) => d.onParticipantId === p.id)
            .map((d) => ({
              what: d.what,
              who: nameOf(d.fromParticipantId, null),
              daysOld: held.wholeDays(d.createdAt),
              kind: (d.blockerKind as any) ?? null,
            })),
          concrete: mine
            .filter((e) => e.type === RecordEntryType.SUCCESS_DEFINITION || !e.recallBased)
            .map((e) => cleanText(e.text))
            .slice(0, 2),
          documentsAttached: held.docs.filter((d) => d.participantId === p.id).length,
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
    return reads.map((r: any, i: number) => ({
      ...r,
      probe: r.probe.map((t: string, n: number) => said[`p${i}.${n}`] ?? t),
      encourage: r.encourage.map((t: string, n: number) => said[`e${i}.${n}`] ?? t),
      triedToUnblock: said[`u${i}`] ?? r.triedToUnblock,
    }));
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
      select: { id: true, what: true, onLabel: true, createdAt: true, triedSaid: true, escalatedAt: true },
    }) ?? Promise.resolve([] as any[]))?.catch?.(() => []) ?? [];

    /*
     * THE SAME COLLAPSE THE BOARD DOES, BECAUSE THE ADVICE QUOTED THE STALE ROW.
     *
     * One live run recorded "a specific request" and "the finance dependency" as two blockers on
     * one person against one owner. The board showed two, and the ways through were drawn from the
     * older - so somebody with one problem was handed two lists, the first about a row they would
     * not recognise. The board deduped on read for exactly this reason and this path did not.
     */
    const theirs = oneBlockerPerThingWaitedOn(
      (mine as any[]).map((d) => ({ ...d, fromParticipantId: participantId })) as any,
    ) as any[];

    const day = 24 * 60 * 60 * 1000;
    return whatTheyCouldTry(
      theirs.map((d) => ({
        id: d.id,
        what: d.what,
        /* Only a resolved person is somebody you can be waiting on - a team cannot answer an email. */
        owner: d.onLabel ?? null,
        days: Math.max(0, Math.floor((Date.now() - new Date(d.createdAt).getTime()) / day)),
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
        select: { id: true, type: true, text: true, disputedAt: true, recallBased: true, documentSays: true, checkIn: { select: { id: true, sessionNumber: true } } },
      }) ?? Promise.resolve([] as any[]))
      .then((rows: any[]) => rows.map((r) => ({
        id: r.id, type: r.type, text: cleanText(r.text), disputedAt: r.disputedAt,
        documented: !r.recallBased, documentSays: r.documentSays ?? null,
        checkInId: r.checkIn?.id ?? null, sessionNumber: r.checkIn?.sessionNumber ?? null,
      })))
      .catch(() => [] as any[]);
  }

  async get(groundId: string, requestingUserId: string, requestingUserOrgId?: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: {
        // The user is included so labels can be resolved to names for the
        // readers entitled to them - see nameFor() below and party-labels.ts.
        participants: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        report: true,
      },
    });
    if (!ground) throw new NotFoundException('Report not found');
    /*
     * WHY, not just no. See `why-there-is-no-report-yet.ts` — the same 404, with the reason the
     * person can act on. The entitlement check below still runs for everybody who HAS a report;
     * this branch is reached before it, so it says nothing a participant list would not.
     */
    if (!ground.report) {
      const mine = ground.participants.some(
        (p) => p.userId === requestingUserId,
      ) || ground.initiatorId === requestingUserId || (!!requestingUserOrgId && ground.organizationId === requestingUserOrgId);
      if (!mine) throw new NotFoundException('Report not found');
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
    const isOrgAdmin = !isInitiator && !participant && (await this.isAnAdminOf(requestingUserId, requestingUserOrgId, ground.organizationId));
    if (!participant && !isInitiator && !isOrgAdmin) throw new ForbiddenException('You are not a participant in this check-in');

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
      // This party's own solo artifact ("What you shared:") is generated
      // as soon as their own check-in completes, but was only ever attached to the
      // response after the FINAL release - so a participant who finished before the
      // other party had no way to see their own private record at all in the
      // meantime. Surface it here too, same as the released branch below.
      const soloArtifact = participant?.soloArtifact
        ? (() => { try { return JSON.parse(participant.soloArtifact!); } catch { return null; } })()
        : null;
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
          saying:
            'A picture is forming from the accounts that are in. You will be able to read it as soon as you have given yours - reading somebody else\'s account first would make yours an answer to theirs, and the whole point is that they are independent.',
          soloArtifact,
          /* Their own rows, which do not wait on a release: see theirOwnRows. */
          myRows: await this.theirOwnRows(participant?.id),
          couldTry: await this.whatTheyCouldTryNext(groundId, participant?.id),
          sessionProgress: sessionProgress ? { ...sessionProgress, requestingUserIsMissing } : null,
          declined: await this.declinedThisRound(groundId, ground.participants as any),
        };
      }

      return {
        ...this.applyNames(ground.report as any, ground.participants as any, participant?.id ?? null, isInitiator || isOrgAdmin, this.peersAreNamed(ground as any)),
        activated: true,
        forming: true,
        nextStep: isInitiator ? 'release' : isOrgAdmin ? 'wait' : undefined,
        soloArtifact,
        myRows: await this.theirOwnRows(participant?.id),
        couldTry: await this.whatTheyCouldTryNext(groundId, participant?.id),
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
    const postReportGuide = participant ? (engagement.postReportGuides?.[participant.id] ?? null) : null;

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
    const coachNames = namesVisibleTo(participant?.id ?? null, ground.participants as any, this.peersAreNamed(ground as any));
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

    const soloArtifact = participant?.soloArtifact
      ? (() => { try { return JSON.parse(participant.soloArtifact); } catch { return null; } })()
      : null;

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
      this.whatToProbeOn(groundId, ground as any, isInitiator || isOrgAdmin, nameOf, plainNameOf).catch((err) => {
        this.logger.warn(`Could not build the probe list for ${groundId}: ${err?.message}`);
        return null;
      }),
    ]);
    const base: any = {
      ...withoutOtherPeoplesReads(
        this.applyNames(ground.report as any, ground.participants as any, participant?.id ?? null, isInitiator || isOrgAdmin, this.peersAreNamed(ground as any)) as any,
        {
          viewerLabel: participant ? (labelsForParties(ground.participants as any).get(participant.id) ?? null) : null,
          viewerParticipantId: participant?.id ?? null,
          viewerIsLead: isInitiator || isOrgAdmin,
        },
      ),
      activated: true,
      postReportGuide,
      coaching,
      /*
       * THE LINES TAKEN FROM WHAT YOU SAID, AS ROWS, WITH THE PRESS THAT DISPUTES ONE.
       *
       * The person had never seen these as rows. They saw the text, on the shared report, under
       * their name, with nothing saying it was extracted rather than typed. This is theirs alone, on
       * their own half, labelled as what it is. Disputed rows are returned too, so the page can show
       * the dispute; every read that COUNTS rows filters them out.
       */
      myRows: await this.theirOwnRows(participant?.id),
      couldTry: await this.whatTheyCouldTryNext(groundId, participant?.id),
      mySoftSpots: participant
        ? await this.myOwnSoftSpots(groundId, participant.id).catch(() => [])
        : [],
      /*
       * AND THE LEAD'S OWN SECTION. Null for everybody else, decided inside `whatToProbeOn` rather
       * than by this caller remembering to ask - a lead-only surface guarded at the call site is
       * one refactor away from not being lead-only.
       */
      probes,
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
      ...(this.confidenceEnabled()
        ? await this.whatTheRecordHolds(groundId, ground.participants as any, isInitiator || isOrgAdmin)
        : {}),
    };
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

    return base;
  }

  /**
   * Each participant calls this once to confirm they are ready to see the
   * report. Creates or updates their ReportActivation row to ACTIVATED.
   * Returns the activation status for both parties so the client can show
   * whether the other side has also revealed.
   */
  async activate(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { participants: true, report: true },
    });
    if (!ground?.report?.releasedAt) throw new ForbiddenException('Report has not been released yet');

    const participant = ground.participants.find((p) => p.userId === requestingUserId);
    if (!participant) throw new ForbiddenException('You are not a participant on this check-in');

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

    return this.getActivationStatus(groundId, ground.participants.map((p) => p.id));
  }

  /** Guard-checked version for the controller - verifies caller is a party first. */
  async getActivationStatusForUser(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { participants: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    const isParty = ground.initiatorId === requestingUserId ||
      ground.participants.some((p) => p.userId === requestingUserId);
    // Non-parties (org admins, platform admins) can still see aggregate status.
    if (!isParty) return this.getActivationStatus(groundId, ground.participants.map((p) => p.id));
    return this.getActivationStatus(groundId, ground.participants.map((p) => p.id));
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
            POST_REPORT_GUIDE_PROMPT,
            [{ role: 'user', content: corpus }],
            POST_REPORT_GUIDE_SCHEMA,
          );
          if (!result) return;

          let { guide, dropped } = sanitiseGuide(result, names);

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
              const second = sanitiseGuide(retry, names);
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
  @Cron('20 * * * *', { timeZone: 'UTC' })
  async finishClosingSynthesesThatFailed(): Promise<void> {
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
