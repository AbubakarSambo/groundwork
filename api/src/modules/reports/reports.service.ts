import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { forbiddenNames, sanitiseGuide, PostReportGuide } from './guide-sanitiser';
import { labelsForParties, namesVisibleTo, withNames } from './party-labels';
import { withoutOtherPeoplesReads } from './own-reads-only';
import { tallyInReport } from './counts-accounts';
import { forensicInReport, withoutDashes } from './forensic-voice';
import { PrismaService } from '../prisma/prisma.service';
import { computeArcSignals, tierCopy, ArcSignals } from './arc-features';
import { endStatesFor } from '../resolution/end-states';
import { PromptsService } from '../prompts';
import { AnthropicService } from '../conversation';
import { EmailService } from '../email/email.service';
import { UsageService } from '../usage/usage.service';
import { GroundsService } from '../grounds';
import { LEADERSHIP_PATTERNS, buildLeadershipPatternBlock } from '../board/coverage';
import { findDeferrals, findWaitingBehind, buildDeferralNotice } from './deferrals';
import { GroundStatus, PartyType, CheckInStatus, GroundScenario, UsageEventType, ReportActivationStatus, PatternStatus } from '@prisma/client';
import { NEW_STARTING_REPORT_SCHEMA, RECOGNITION_REPORT_SCHEMA, DRIFT_REPORT_SCHEMA } from '../conversation/prompt-library';
import { BAD_FAITH_CODES, POSITIVE_CODES, ALIGNMENT_FEED_ONLY_CODES, isPositiveCode } from '../patterns/pattern-library';

// Lookup from pattern code -> its name, for readable synthesis-evidence phrasing.
// Built once from the two code tables rather than duplicating names here.
const PATTERN_CODE_NAME = new Map<string, string>([
  ...BAD_FAITH_CODES.map((c) => [c.code, c.name] as const),
  ...POSITIVE_CODES.map((c) => [c.code, c.name] as const),
]);

// Solo artifact - single-party "Your private record shows:" summary (#91).
const SOLO_ARTIFACT_SCHEMA = {
  name: 'emit_solo_artifact',
  description: "Emit a short single-party summary of this person's own record.",
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description:
          "Plain-language summary starting with 'Your private record shows:'. Summarise what this person put on the record in their own framing. No verdict, no inference about anyone else.",
      },
      whatToCarry: {
        type: 'string',
        description: 'One specific, forward-looking thing for them to carry into the conversation or watch for next. Not a judgement.',
      },
    },
    required: ['summary'],
  },
};

const SOLO_ARTIFACT_PROMPT =
  "You are Groundwork. You are given ONE person's own record entries (their words). Produce a short artifact for them alone - they have not heard from anyone else and may never. Do not infer the other side. Do not produce a verdict or analysis of any person. Open with the exact phrase \"Your private record shows:\" then summarise what they put on the record in their own framing. Name one specific thing to carry forward. Warm, specific, brief - under 150 words total.";

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
            reason: { type: 'string', description: 'Brief explanation of why this was inferred rather than directly quoted.' },
          },
          required: ['id', 'text', 'participantLabel', 'reason'],
        },
        description: 'Claims in this report that were inferred from context rather than directly stated. Empty array if everything is directly quoted.',
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

6. LABEL INFERENCES. Any claim you make that is not a direct quote from the record is an inference. List every inference in the inferences array with its id, text, participantLabel, and reason. An inference is anything you concluded from context, implied meaning, or pattern - not from an explicit statement. If a claim appears in the report body and is not a direct quote, it must appear in inferences. An empty inferences array means everything in the report is directly quoted.
7. CROSS-REFERENCE SESSIONS. Each record entry is labeled with the session it came from (e.g. "[the initiator session 1]", "[participant A session 3]"). If the same party's position has changed across sessions, name that change explicitly - "in session 1 the initiator described X; by session 3 they described Y." If a commitment from an earlier session has not been followed up in later sessions, name it. The longitudinal arc is the product's core value. A report that reads as a snapshot of only the latest session has failed.
8. NO FALSE CONSENSUS. Do not write "both agree" or "everyone is aligned" unless every party's record contains explicit matching statements on that specific point. If parties described the same topic differently in any session, that is a divergence - surface it. Smoothing a disagreement into apparent consensus is a more serious error than noting the gap.
9. SURFACE HIDDEN CONTRIBUTORS. If any party's record references someone else's input, work, or decisions - someone who is not themselves a party with their own account on this ground - name them in hiddenContributors with the evidence. Do not invent a hidden contributor; only surface what is explicitly referenced.
10. FLAG CONCERN PATTERNS FACTUALLY, NEVER AS ACCUSATION. If the record shows one party's follow-through, commitments, or contribution is notably thinner than other parties' on the same ground, note it in concernFlags as a plain factual observation about the record - not a judgement of the person. Do not speculate about motive.
11. NAME THE CAUSE OF LOW OR HIGH SPECIFICITY WHEN INFERABLE. If a party's specificity is notably low or high, use specificityCauses to say why if the record supports an inference: a behavioral pattern, a misunderstanding, an adversarial stance, "declined_by_choice" if the record shows an explicit, stated decline to answer (a refusal is a choice, never file it as adversarial or unclear), or "unclear" if the record does not support a specific cause.
12. NEVER INVENT PARTY COUNTS OR ROLES. The PARTY ROSTER at the top of this corpus is the exhaustive, exact list of who is on this ground - use its exact count and exact labels only. Never state a number of parties, an "other parties" count, or a role/title/affiliation (e.g. "founder", "funders", "the board") that does not appear verbatim in the roster. If you are unsure how many parties are missing or who they are, use the roster's own wording rather than describing them yourself.
14. SURFACE LEADERSHIP GAPS AS NAMED PATTERNS, ACROSS PERIODS, NEVER AS QUOTES. Where one party leads another, look for the named leadership patterns listed below. Use ONLY those pattern names. A pattern is real only when its stated signature is met AND it is visible across MORE THAN ONE period - one session showing something is not a pattern, and you must report the number of periods you saw it across. Each pattern belongs to one of two opposite poles: CONTROL (holding on to work and decisions, so nobody else can own) or ABDICATION (not holding anyone, so things slip and hard conversations never happen). These need opposite responses, so never blur them together. State the gap as a difference between two accounts ("one account describes ownership being set clearly; another describes still being unsure what they own"). NEVER quote either side, NEVER name who said what, and NEVER say which is right - something can be set clearly and still not land, and both people can be describing their own experience honestly. If no pattern's signature is met across periods, return an empty array.

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
  ) {}

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

  async synthesize(groundId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, include: { participants: true } });
    if (!ground) throw new NotFoundException('Ground not found');

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
    const leadSignals = Array.isArray(initiatorProfile?.signals) ? (initiatorProfile!.signals as string[]) : [];
    if (leadSignals.length) {
      groundContextLines.push(`LEAD PROFILE (from past grounds - use to add alignment recommendations at the end of the report):\n${leadSignals.map(s => `- ${s}`).join('\n')}`);
    }
    // CLOSING ROUND: when every accepted party has completed a final-flagged
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
            where: { participantId: pid, checkInId: { not: null } },
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
      groundContextLines.push(`CLOSING ROUND - THIS IS THE FINAL REPORT. Structure the synthesis per goal as: what was AGREED (the target on record) -> what was DELIVERED (the final accounts) -> WHAT THE RECORD SHOWS OVER TIME. Use the arc lines below verbatim as the over-time basis - do not soften or contradict them, and never speculate about anyone's intent:
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

    const records = await this.prisma.recordEntry.findMany({
      where: { participant: { groundId } },
      include: {
        participant: { select: { id: true } },
        checkIn: { select: { sessionNumber: true } },
      },
    });

    // GW-41: fetch the full version object so we can stamp promptVersionId on the
    // report. Without this, Outcome records have no prompt attribution and the
    // learning loop cannot measure per-version outcome rates.
    const synthesisVersion = await this.prompts.getActive('report_synthesis');
    // Append hard synthesis rules that override any vagueness in the base prompt.
    // These address four recurring failure modes: specifics lost, conditions stripped,
    // absent parties misrepresented, and actionable commitments buried.
    // The leadership-pattern block is generated FROM the role map, so adding or
    // changing a pattern changes what the synthesis looks for. Pinned by a test.
    const systemPrompt = synthesisVersion.content + "\n\n" + SYNTHESIS_RULES + "\n\n" + buildLeadershipPatternBlock();


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

    // DETERMINISTIC ROSTER: the corpus below only contains text from parties
    // who produced record entries. Without an explicit roster, the model has
    // to guess how many other parties exist and what their roles are from
    // context alone - and it will invent wrong counts and role names. This
    // roster is the ONLY source of truth for "who is on this ground."
    const recordEntryCountByParty = new Map<string, number>();
    for (const r of records) {
      recordEntryCountByParty.set(r.participant.id, (recordEntryCountByParty.get(r.participant.id) ?? 0) + 1);
    }
    const rosterLines = parties.map((p) => {
      const label = labelById.get(p.id) ?? 'a party';
      const entryCount = recordEntryCountByParty.get(p.id) ?? 0;
      // WHO LEADS WHOM. Without this the leadership-gap rules have nothing to
      // match: they open with "where one party leads another", and a roster of
      // anonymous labels never says that anyone does. In a live 12-session run
      // with textbook abdication in the record, zero gaps were found for
      // exactly this reason - the rule was correct and the input was silent.
      const leadNote =
        p.partyType === PartyType.INITIATOR
          ? ' [leads this ground and the other parties on it]'
          : '';
      return `- ${label}${leadNote}: ${entryCount > 0 ? `contributed ${entryCount} record entr${entryCount === 1 ? 'y' : 'ies'} (shown below)` : 'checked in but has no record entries with text - do not describe their views, role, or affiliation beyond this exact label'}`;
    });
    const roster = `PARTY ROSTER (exhaustive - there are exactly ${parties.length} parties on this ground, no others exist):\n${rosterLines.join('\n')}\n\n`;

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
    const maxChars = Math.max(...turnCounts.map((p) => p.charCount), 1);
    const thinParties = turnCounts.filter((p) => p.charCount < maxChars * 0.15);
    const thinNotice =
      thinParties.length > 0
        ? `NOTE: ${thinParties.map((p) => p.label).join(', ')}'s record contains significantly fewer exchanges. A further session from ${thinParties.length === 1 ? 'that party' : 'those parties'} would strengthen the cross-reference.\n\n`
        : '';

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
    const surfacedPatternRows = await this.prisma.patternDetection.findMany({
      where: { groundId, status: PatternStatus.SURFACED },
      select: { participantId: true, code: true, observationText: true },
    });
    const patternNotices = surfacedPatternRows
      .filter((p) => !ALIGNMENT_FEED_ONLY_CODES.has(p.code))
      .map((p) => {
        const label = labelById.get(p.participantId) ?? 'a party';
        const name = PATTERN_CODE_NAME.get(p.code) ?? p.code;
        const rawObservation = p.observationText ?? 'no further detail recorded';
        const observation = rawObservation.trim().replace(/[.!?]+$/, '');
        return isPositiveCode(p.code)
          ? `NOTE [longitudinal pattern evidence - positive, code ${p.code} ${name}]: ${label} - ${observation}. This is a positive signal, not a concern. Reflect it in the narrative or hiddenContributors if the record supports it. Do NOT place this in concernFlags - that field is for reduced follow-through or thinner contribution only.`
          : `NOTE [longitudinal pattern evidence - code ${p.code} ${name}]: ${label} - ${observation}. If the record itself corroborates this, note it in concernFlags as a plain factual observation about the record per synthesis rule 10 - never an accusation, never a judgement of the person, never speculation about motive. If the record does not corroborate it, do not include it.`;
      });
    const patternNotice = patternNotices.length ? patternNotices.join('\n') + '\n\n' : '';

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

    const corpus =
      groundContextHeader +
      roster +
      deferralNotice +
      leadContextSection +
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
    let result: SynthesisResult | null;
    try {
      result = await this.anthropic.extract<SynthesisResult>(
        systemPrompt,
        [{ role: 'user', content: corpus }],
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
      const retry = await this.anthropic.extract<SynthesisResult>(
        systemPrompt,
        [{ role: 'user', content: brevityPrefix + corpus }],
        activeSchema,
      );
      if (retry) result = retry;
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
          this.prisma.recordEntry.findMany({ where: { participantId: p.id }, select: { text: true } }),
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
        const scored = await this.prisma.checkIn.findMany({
          where: { participantId: p.id, status: CheckInStatus.COMPLETED, specificityLevel: { not: null } },
          select: { specificityLevel: true },
        });
        const RANK: Record<string, number> = { vague: 0, directional: 1, managed: 2, specific: 3 };
        const ranks = scored.map((c) => RANK[String(c.specificityLevel)] ?? 0);
        const mean = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
        // No sessions scored yet is not a bad record, it is no record. "low"
        // would be a verdict on somebody who has not been asked anything.
        const specificityLabel: 'high' | 'moderate' | 'low' | 'not scored yet' =
          !ranks.length ? 'not scored yet' : mean >= 2 ? 'high' : mean >= 1 ? 'moderate' : 'low';
        return { label: labelById.get(p.id) ?? 'a party', sessions, recordEntries, documentsAttached, contributed: contributorIds.has(p.id), specificityLabel };
      }),
    );

    // difficultyDisclosures: true if any record entry for this ground contains a difficulty keyword.
    const allGroundTexts = await this.prisma.recordEntry.findMany({
      where: { participant: { groundId } },
      select: { text: true, evidenceType: true },
    });
    const lowerTexts = allGroundTexts.map((e) => e.text.toLowerCase());
    const difficultyDisclosures = DIFFICULTY_KEYWORDS.some((kw) => lowerTexts.some((t) => t.includes(kw)));

    // documentBackedPct: share of record entries backed by an attached document
    // (DOCUMENT_AT_AGREEMENT or DOCUMENT_AFTER). CHECK_IN and ANCHORED_RECALL
    // entries are not document-backed - only actual document references count.
    // Returns 0 when no documents exist to avoid the 100%-with-no-docs bug.
    const totalEntries = allGroundTexts.length;
    const documentBackedCount = allGroundTexts.filter(
      (e) => e.evidenceType === 'DOCUMENT_AT_AGREEMENT' || e.evidenceType === 'DOCUMENT_AFTER',
    ).length;
    const documentBackedPct = totalEntries > 0 && documentBackedCount > 0
      ? Math.round((documentBackedCount / totalEntries) * 100)
      : 0;

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

    const engagement = {
      coverage,
      documentBacked: engagementParties.some((e) => e.documentsAttached > 0),
      specificitySignal: Object.fromEntries(engagementParties.map((p) => [p.label, p.specificityLabel])),
      sessionCounts,
      documentBackedPct,
      coverageBand,
      difficultyDisclosures,
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

    const recallNotes: { label: string; recallConfidence: string; note: string }[] = [];
    for (const p of parties) {
      const lastCheckIn = await this.prisma.checkIn.findFirst({
        where: { participantId: p.id, status: CheckInStatus.COMPLETED },
        orderBy: { sessionNumber: 'desc' },
        select: { recallConfidence: true, sessionNumber: true },
      });
      if (!lastCheckIn?.recallConfidence) continue;
      const label = labelById.get(p.id) ?? 'a party';
      const rcLabel: Record<string, string> = {
        certain: 'certain',
        mostly_certain: 'mostly certain',
        uncertain: 'uncertain on key points',
      };
      recallNotes.push({
        label,
        recallConfidence: lastCheckIn.recallConfidence,
        note: `${label} was ${rcLabel[lastCheckIn.recallConfidence] ?? lastCheckIn.recallConfidence} about their account in session ${lastCheckIn.sessionNumber}.`,
      });
    }

    const [groundDocsAll, annotatedEntries, tensionEntries] = await Promise.all([
      this.prisma.groundDocument.findMany({ where: { groundId }, select: { id: true } }),
      this.prisma.recordEntry.findMany({ where: { participant: { groundId }, recallBased: false }, select: { id: true } }),
      this.prisma.recordEntry.findMany({
        where: { participant: { groundId }, recallBased: false, type: { in: ['TENSION', 'WORRY'] } },
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

    const enrichedEngagement = {
      ...engagement,
      specificityNotes,
      recallNotes,
      docStatus,
      session2Focus,
      hiddenContributors: result.hiddenContributors ?? [],
      concernFlags: result.concernFlags ?? [],
      specificityCauses: result.specificityCauses ?? [],
    };

    const inferences = ((result as any).inferences ?? []) as Array<{ id: string; text: string; participantLabel: string; reason: string }>;

    /**
     * The private per-person guides, read back before the write that would
     * otherwise erase them. Everything else in engagement is rebuilt from this
     * synthesis; these are not, so they are the one thing carried across.
     */
    const priorEngagement = (await this.prisma.report.findUnique({
      where: { groundId },
      select: { engagement: true },
    }))?.engagement as Record<string, any> | null | undefined;
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
          const tally = tallyInReport(result as any);
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
        centralQuestion: result.centralQuestion,
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
        centralQuestion: result.centralQuestion,
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

    return report;
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
      where: { participantId: initiatorParticipant.id },
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
    if (!ground) throw new NotFoundException('Ground not found');

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
      include: { participants: true, report: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');
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
    const emailResults = await Promise.allSettled(
      ground.participants.map((p) => this.email.sendReportReady(p.email, ground.label, reportUrl)),
    );
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
  ): T {
    // An org admin reads with the lead's eyes; they already see the whole ground.
    const asWhom = viewerIsLead
      ? (parties.find((p) => p.partyType === PartyType.INITIATOR)?.id ?? viewerParticipantId)
      : viewerParticipantId;
    const visible = namesVisibleTo(asWhom, parties);
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
    const t = (v: any): any =>
      typeof v === 'string' ? withoutDashes(withNames(v, visible)) : v;
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

    return {
      ...report,
      sharedPicture: t(report.sharedPicture),
      centralQuestion: t(report.centralQuestion),
      agreements: walk(report.agreements),
      divergences: walk(report.divergences),
      finalSynthesis: walk(report.finalSynthesis),
      leadershipGaps: walk(report.leadershipGaps),
    };
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
    if (!ground?.report) throw new NotFoundException('Report not found');

    const isInitiator = ground.initiatorId === requestingUserId;
    const participant = ground.participants.find((p) => p.userId === requestingUserId);
    // Org admins can read reports for grounds in their own org (read-only, same view as initiator).
    const isOrgAdmin = !isInitiator && !participant && !!requestingUserOrgId && ground.organizationId === requestingUserOrgId;
    if (!participant && !isInitiator && !isOrgAdmin) throw new ForbiddenException('You are not a party to this ground');

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
      // This party's own solo artifact ("Your private record shows:") is generated
      // as soon as their own check-in completes, but was only ever attached to the
      // response after the FINAL release - so a participant who finished before the
      // other party had no way to see their own private record at all in the
      // meantime. Surface it here too, same as the released branch below.
      const soloArtifact = participant?.soloArtifact
        ? (() => { try { return JSON.parse(participant.soloArtifact!); } catch { return null; } })()
        : null;
      return {
        ...this.applyNames(ground.report as any, ground.participants as any, participant?.id ?? null, isInitiator || isOrgAdmin),
        activated: true,
        forming: true,
        nextStep: isInitiator ? 'release' : isOrgAdmin ? 'wait' : undefined,
        soloArtifact,
        sessionProgress: sessionProgress ? { ...sessionProgress, requestingUserIsMissing } : null,
      };
    }

    // Per-party reveal gate: each participant must activate before seeing
    // content, but only their own activation is checked here - this is not
    // mutual. The initiator is exempt - they released the report and can
    // always read it.
    if (participant && !isInitiator) {
      const activation = await this.prisma.reportActivation.findUnique({
        where: { groundId_participantId: { groundId, participantId: participant.id } },
      });
      if (!activation || activation.status !== ReportActivationStatus.ACTIVATED) {
        // Return a pre-activation stub - client shows the "Reveal" button.
        return {
          id: ground.report.id,
          groundId,
          createdAt: ground.report.createdAt,
          releasedAt: ground.report.releasedAt,
          activated: false,
        };
      }
    }

    const engagement = ground.report.engagement && typeof ground.report.engagement === 'object'
      ? (ground.report.engagement as Record<string, any>)
      : {};
    const postReportGuide = participant ? (engagement.postReportGuides?.[participant.id] ?? null) : null;

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
    const base: any = {
      ...withoutOtherPeoplesReads(
        this.applyNames(ground.report as any, ground.participants as any, participant?.id ?? null, isInitiator || isOrgAdmin) as any,
        {
          viewerLabel: participant ? (labelsForParties(ground.participants as any).get(participant.id) ?? null) : null,
          viewerParticipantId: participant?.id ?? null,
          viewerIsLead: isInitiator || isOrgAdmin,
        },
      ),
      activated: true,
      postReportGuide,
      soloArtifact,
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
    if (!participant) throw new ForbiddenException('You are not a participant on this ground');

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
    if (!ground) throw new NotFoundException('Ground not found');
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
   * Generate (or re-generate) the single-party "Your private record shows:"
   * artifact for a participant. Called after each check-in completes via the
   * conversation service, and can also be called directly (e.g. if an earlier
   * run failed). Owner-scoped - reads only this participant's own record.
   */
  async generateSoloArtifact(participantId: string, groundId: string): Promise<void> {
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
    if (!result?.summary) return;

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: {
        soloArtifact: JSON.stringify({ summary: result.summary, whatToCarry: result.whatToCarry ?? '' }),
        soloArtifactAt: new Date(),
      },
    });
  }

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
            where: { participantId },
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

          const { guide, dropped } = sanitiseGuide(result, names);
          for (const d of dropped) {
            // Logged, because a field being dropped often means the prompt needs
            // work - and a silent strip would hide that the model is still
            // reaching for names.
            this.logger.warn(
              `Dropped post-report guide field ${d.field} for participant ${participantId}: ${d.reason}.`,
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
