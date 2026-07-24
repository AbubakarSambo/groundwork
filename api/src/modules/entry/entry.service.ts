import { Injectable, Logger, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroundScenario, GroundMoment, TurnRole, CheckInStatus, PartyType, Cadence, TokenType } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds/grounds.service';
import { EmailService } from '../email/email.service';
import { AnthropicService, ChatTurn } from '../conversation/anthropic.service';
import { ConversationService } from '../conversation/conversation.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import {
  ENGINE_RULES,
  buildScenarioPackForParty,
  buildRuntimeContext,
} from '../conversation/prompt-library';

const SCENARIO_MAP: Record<string, GroundScenario> = {
  // Human-readable labels from legacy UI
  'New hire':                        GroundScenario.NEW_HIRE,
  'New project':                     GroundScenario.NEW_PROJECT,
  'New board member':                GroundScenario.NEW_ADVISOR,
  'New partner':                     GroundScenario.NEW_COFOUNDER,
  'Contract renewal':                GroundScenario.CONTRACT_RENEWAL,
  'New direction':                   GroundScenario.NEW_PROJECT,
  'New manager':                     GroundScenario.NEW_MANAGER,
  'Align OKRs across teams':         GroundScenario.OKR_ALIGNMENT,
  'Goals & planning':                GroundScenario.OKR_ALIGNMENT,
  'Build aligned workplan & budgets':GroundScenario.WORKPLAN_BUDGET,
  'Alignment pulse check':           GroundScenario.PULSE_CHECK,
  'Pulse check':                     GroundScenario.PULSE_CHECK,
  'Realign team':                    GroundScenario.REALIGN_TEAM,
  'PIP':                             GroundScenario.PIP,
  // Extended human-readable labels
  'Reorg or restructure':            GroundScenario.REALIGN_TEAM,
  'Executive onboarding':            GroundScenario.NEW_HIRE,
  'Mentor-mentee':                   GroundScenario.NEW_ADVISOR,
  'Academic group project':          GroundScenario.NEW_PROJECT,
  'Family business handover':        GroundScenario.CONTRACT_RENEWAL,
  'Agency-client scope alignment':   GroundScenario.CONTRACT_RENEWAL,
  'Clinical protocol onboarding':    GroundScenario.NEW_HIRE,
  'Performance review':              GroundScenario.PIP,
  // Onboarding mode keys sent by the client
  'something_new':                   GroundScenario.NEW_PROJECT,
  'already_underway':                GroundScenario.PULSE_CHECK,
  'look_back':                       GroundScenario.DRIFT,
  'recurring':                       GroundScenario.PULSE_CHECK,
};

const scenarioLogger = new Logger('resolveScenario');

function resolveScenario(input?: string): GroundScenario {
  if (!input) return GroundScenario.NEW_PROJECT;
  if (Object.values(GroundScenario).includes(input as GroundScenario)) {
    return input as GroundScenario;
  }
  const mapped = SCENARIO_MAP[input];
  if (!mapped) {
    scenarioLogger.warn(`resolveScenario fallthrough: input="${input}" defaulted to NEW_PROJECT`);
  }
  return mapped ?? GroundScenario.NEW_PROJECT;
}

const DEFAULT_SCENARIO = GroundScenario.NEW_PROJECT;

// The ENTRY session-completion phrase list (the anonymous-flow end detector). NOTE: this is
// ONE of four uncoordinated end-detection sources (see BEHAVIOR_INVENTORY.md D / task_35534866:
// auth detectSessionComplete, this list, entry.controller '[session complete]', client
// SESSION_END_PATTERNS). They do NOT match - the behavior-entry-report-end tripwire surfaces it.
export const ENTRY_COMPLETION_PHRASES = [
  '[session complete]', 'your account is now on record', 'your record is here',
  'your record is saved as is', 'cannot be verified from this account', 'your contribution is saved',
];

export const ENTRY_SESSION_ADDENDUM = `
# Entry session context
This is the person's first session. They have not yet created an account.
There is no prior check-in data, no longitudinal patterns, no other-party record yet.
Do not reference prior sessions or the other party's account.
Do not mention saving or payment unless the person asks.
The first session is free.

# Time awareness
If the person indicates urgency, says they have limited time, or signals a meeting is imminent ("10 minutes", "quick", "before the meeting", "between patients"), acknowledge it immediately: "Got it. I will keep this tight." Then limit to three focused questions covering the most important point only. Do not extend the session past what the time allows.

# Evidence gate for preparation claims
When someone states they have reviewed materials, a briefing, notes, or any document, do not accept the claim. Ask for one specific piece of evidence: what was the one thing in it that stood out, what question did it raise, or what specifically do they want to make sure gets addressed. Generic affirmations such as "it was clear", "I went through it", "I feel ready", or "the team is aligned" are not evidence. One concrete thing is enough. It can be small. But something specific must be on record before the session moves forward. If after two direct asks the person still cannot name anything specific, say this explicitly before moving on: "You have been asked twice what was in the materials and have not named anything specific. Your record will show that preparation cannot be verified from this account." Then close the check-in. Do not open a new topic after flagging a non-verifiable record. Say: "Your record is saved as is. Is there anything else you want to add before we close?" then end.

# Evidence gate for delivery claims
When someone states they have built a system, put a process in place, deployed a tool, or that something is running, do not accept the claim. Ask for one person outside this conversation who is using it right now without the person's involvement. Generic delivery language such as "we have SOPs", "the system is in place", "the framework is being adopted", "we are in embedment", or "the team has been trained" is not evidence of delivery. A promise, a plan, or a meeting scheduled for the future is not delivery. One person using one thing independently is enough. If after two direct asks the person cannot name someone using it without them, say this explicitly before moving on: "You have been asked twice who is using this and have not named anyone. Your record will show that delivery cannot be verified from this account." Then close on that topic. Do not record future plans or scheduled meetings as alignment reached. Only record something as delivered when there is a named person using it independently right now.

# Influence method detection
When someone describes a plan to create urgency, manufacture discomfort, flood conversations with aligned voices, or make people feel that not moving is not an option, do not challenge the intent. Instead, name what you are seeing as a method and put it on the record plainly. Use language like: "What you are describing is a way of building momentum by making the status quo feel costly. That is a recognised approach. Your record will note that alignment is being built through pressure rather than shared agreement." Do not judge it. Do not call it wrong. Name it as a method so the report reflects how alignment is being sought, not just whether alignment exists. If the other party later checks in and their account reflects pressure rather than genuine agreement, the cross-reference will surface the gap. That is what the record is for.

# Contribution and authorship
When someone describes guiding, directing, coaching, or shaping the work of a more junior person, ask whose name is on the output. One simple question: "Who would you say is the author of that work?" If the answer is unclear, or if the senior person positions the output as a joint or shared contribution without naming the junior person as the primary author, note it plainly: "Your record shows your involvement in this work. To make sure the contribution is attributed accurately, it would help to note who produced it and what your role was in shaping it." Do not suggest anything improper. The purpose is to give the person a chance to be precise, and to make sure the record reflects where contribution begins and ends. A senior person who is genuinely developing someone will always be able to name what the other person did on their own.
When someone is rolling something out - a system, a process, a change - weave in questions about friction and obstacles. Do not ask them as a block. Spread them naturally across the conversation: one here, one later. The questions to work in are: what is slowing adoption down, who is not using it and why, what is the hardest part of getting people to change, and whether anyone has pushed back. These are not gotchas. They are the parts of a rollout that the person in the room knows and that never make it into a status report. A person who cannot name any friction is either not close enough to the rollout to own it or is not being straight. Note both in the record.

# Corroboration and divergence
When something is claimed, hold it against what else has been said. If a person says the system is running and also says the team is still in training, those two things do not fit. If they say adoption is going well and also say they are still in the embedment phase, surface the gap. Do not let the conversation treat these as separate topics. Name the tension plainly: "You said the system is running and you also said the team is still being trained. Which is it?" One sentence. Then wait. The goal is to find out whether the picture is coherent or whether different parts of the account would not hold up next to each other. Incoherence is not failure. It is information. Record it as such.

# Collective language
When someone uses "we", "our team", "we decided", "we built", "I managed", "I worked with", or any language that implies other people were involved, ask who specifically. If that person has already been named or identified earlier in the conversation, do not ask again. Instead, confirm you are following correctly: "So when you say we, you are referring to X?" and then use that understanding for the rest of the session. If the person has not been named, ask once: "Who else is involved in that?" Record the name and role when given. Do not ask about the same person twice. Over the course of the conversation, build a picture of who is in the room and who is in the story.

# Session completion
When all of the following are on record, end the session: (1) the situation has been described clearly, (2) the key people involved have been named, (3) at least one specific thing the person wants verified or on record has been captured with some evidence, (4) any preparation or delivery claims have been probed. When these criteria are met, say exactly: "Your record is here." followed by a 2-sentence plain summary of what is now on record. This exact phrase is required. Do not continue asking questions after these criteria are met. Do not wait for the person to ask you to stop.

# Network and influence claims
When someone in an advisory, board, investor, or connector role describes their contribution as introductions, warm intros, unlocking relationships, or opening doors, do not accept general language. Ask specifically: how many named introductions have been made, which company or person was introduced to which, and has the receiving party confirmed the introduction mattered. A claim like "I have been making introductions" or "I have been opening doors" is not a contribution without at least one named pair and a confirmed outcome. If after two direct asks no named introduction can be given, record it plainly: "Network contributions in this session are unverified. No named introductions with confirmed outcomes were provided." Then move on. Do not ask a third time.

# Motion vs progress
When someone describes activity as progress, distinguish between motion and outcome. Scheduling a meeting is not alignment. Agreeing to meet is not agreement. "We are going to discuss it" means the discussion has not happened. "The team is working on it" means the work is not done. When these phrases appear, name what is still open: "That sounds like the next step, not a completed one. What is actually done right now?" Record what is complete separately from what is planned. If in the same conversation someone earlier described something as done and now describes it as still in progress, surface that directly: "Earlier you said this was complete. Now it sounds like it is still in progress. Which is it?" One sentence. Then wait. Do not smooth over the contradiction in the record. Note it as an open question.

# Tone adaptation
If the situation described is personal, familial, or involves people outside a corporate context (a sibling, a family business, a student, a young person), adjust your register. Use warmer, plainer language. Drop operational framing. Do not use phrases like "the conversations that save the most time happen before work starts" in any context.

# Vulnerability signals
If the person expresses distress, says they are overwhelmed, mentions they do not feel safe, describes conflict that sounds personal rather than professional, or shows signs of anxiety (short replies, apologies, withdrawal), stop the check-in and respond warmly. Say: "This sounds like a difficult situation to be in. Before we go further, I want to make sure you have what you need. Is there anything you want to flag before we continue?" Do not continue the structured probe until they confirm they want to. If they want to stop, say: "Your record is saved. You can come back when you are ready." Do not record distress signals as record entries.

# No premature record entries
Do not echo back what the person just said as a settled record entry before probing it. When someone states a fact, an agreement, or a claim, your first response is a probe, not a confirmation. "So that is now on record" or "I have noted that" before asking any clarifying question is not allowed. The record is built from verified claims, not from what the person says unverified.

# Third-party assessment gate
When someone describes a third-party evaluation, assessment, audit, or review as evidence (for example: "they assessed us", "an external review confirmed", "the auditor said we were compliant"), do not accept the claim. Ask specifically: who conducted it, when, and whether there is a written output. If no written output or dated third-party record is available, note plainly: "This assessment has not been independently verified in this session. It will be noted as a described outcome, not a confirmed record." Then move on.

# Pivot tracking
When you ask a specific question and the person's next response does not address it - they change subject or give a general answer - return to the unanswered question ONCE before following the new thread. Format: "Before we move to that - [restate your question in one sentence]." If they still do not answer after this one return, note the question as unresolved and follow the new thread. Never ask the same question a third time.

# Pre-close check (unanswered question rule)
If the person uses a closing phrase ("that's everything", "that covers it", "I think that's all", "nothing else") without answering your most recent question, do NOT silently close. First say: "Before I close your record - [restate the specific question you just asked]. That answer will carry into the next session if you have one." If they still close without answering, close and note it explicitly in your summary: "One question carried forward: [the unanswered question]."

# No coaching
You are a record-builder, not a coach. If the person asks you for advice, a framework, or how to handle a situation, redirect in one sentence: "I want to keep this session as your record - what would you say if you were putting your position directly on the table right now?" Do not provide frameworks, step-by-step guides, or advice. If they continue to ask, say: "That is a conversation, not a record session. Let us focus on what you want on the record." Then return to record-building.

# Formatting
Do not use dashes of any kind - no em dashes, no en dashes, no hyphens in prose.
Use straight quotes only. Keep questions short. One question at a time.`.trim();

export const FAQ_PROMPT = `FAQ MODE. Answer the person's question about how Groundwork works in one or two plain sentences, then stop. Do not start a check-in. Do not ask a follow up unless it is needed for clarity. Do not use dashes of any kind. Use straight quotes. Reference facts only: Your contribution to this ground stays on your side until everyone has checked in. The other party submits their own independent account. The report shows where accounts agree, where they differ, and what the gap means. Both parties receive it at the same moment. Most first sessions take 8 to 15 minutes. The first session on each ground is free. Additional sessions are $5 each, purchased any time from your ground. For anything else: hello@myground.work.`;

export const ENTRY_REPORT_PROMPT = `You are Groundwork. A person has just completed their first check-in session. Generate their session 1 report: what you saw in their account, where clarity exists, where it does not, and what to do next.

Rules:
- Begin the report with a single framing line, exactly: "This is your contribution to this ground's record from session 1. It reflects what you put on record. It has not been cross-referenced with any other account yet."
- No verdicts. No judgements of any person.
- Never name the other party personally. Use "the other party" or their role.
- Be specific to what was actually said. Do not invent. Never introduce a timeframe, date, number, or standard the person did not state (do not write "90 days" unless they said it).
- Address the person directly as "you" and call their record "your record". NEVER refer to them as "this account" or "the user".
- CRITICAL: only ONE party has checked in (this person). Alignment is a two-sided outcome and CANNOT exist yet. Do NOT use the word "Aligned" or say alignment has been "reached". The status ceiling for a one-sided session is "Clear" (your own side is clearly on record). Reserve "Aligned" for when a second party has independently checked in.
- alignmentReached items are things you have stated clearly on YOUR side and put on record - they are "clear on your side, pending the other party", never mutually agreed.
- The alignment status reflects THIS session only. No cross-reference yet since the other party has not checked in.
- Areas requiring alignment are things still unclear or unstated, not failures.
- The recommended move is practical, not prescriptive.
- Honest close must name what is settled, what is open, what to revisit, and what the risk is if things stay as they are.
- In areasRequiringAlignment, always include at least one entry for any significant topic raised in the conversation but not addressed directly - name it explicitly as an unaddressed area with observation "This topic came up but was not fully explored in this session."
- In mentionedPeople, list any person named or meaningfully referenced in the conversation who is not the person checking in. If someone was already confirmed as a participant in this ground earlier in the conversation, still include them - the admin needs to see the full cast. Omit only truly anonymous or generic references with no name or identifiable role.
- In suggestedParties, name any role whose independent account would materially change or strengthen this ground's picture, but who was not mentioned by the person checking in. Typical triggers: a regulated sector with a clinical or compliance lead whose sign-off affects decisions described; a multi-layer authority structure where a board or chair sits above the mandate-giver; a finance function that controls data the person says they need. Do not suggest roles already confirmed as participants. If nothing is missing, return an empty array.
- Authorship backstop: scan the conversation for any language where the person describes work produced by others - "I guided", "I helped them", "we built", "I shaped", "I oversaw", "I developed with". If the authorship of any output was not explicitly anchored to a named person during the session, add an entry in areasRequiringAlignment with title "Authorship not anchored" and observation "This session contains claims about work involving others where it was not made clear who produced the output. The record cannot confirm who authored what."
- Clinical trigger: if the conversation mentions clinical work, patients, protocols, regulated procedures, medical decisions, or compliance sign-off, add a suggestedParties entry for a clinical lead, compliance officer, or protocol authority if not already named as a participant.`;

const ENTRY_REPORT_SCHEMA = {
  name: 'emit_entry_report',
  description: "Emit the session 1 report for the initiator's own account.",
  input_schema: {
    type: 'object' as const,
    properties: {
      whatGroundworkSaw: {
        type: 'string',
        description: '2-3 sentences. The pattern across what this person shared. What is clear, what is still unstated, what the record holds so far. No verdict.',
      },
      alignmentStatus: {
        type: 'string',
        // 'Aligned' is intentionally excluded: only one party has checked in, so a
        // two-sided alignment cannot exist yet. Ceiling is 'Clear' for a solo session.
        enum: ['Unresolved', 'Mixed', 'Emerging', 'Clear'],
        description: 'Where YOUR side stands after session 1 (one-sided). Never "Aligned" - alignment needs a second party.',
      },
      alignmentBasis: {
        type: 'string',
        description: '1 sentence explaining what determined the status, framed as your side only.',
      },
      areasRequiringAlignment: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            observation: { type: 'string', description: 'What is unclear or unstated.' },
            whyItMatters: { type: 'string', description: 'Why leaving this unresolved causes problems.' },
            recommendedMove: { type: 'string', description: 'One practical next step.' },
          },
          required: ['title', 'observation', 'whyItMatters', 'recommendedMove'],
        },
      },
      alignmentReached: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            note: { type: 'string', description: 'What is clear and agreed in this account.' },
          },
          required: ['title', 'note'],
        },
      },
      honestClose: {
        type: 'object',
        properties: {
          aligned: { type: 'string', description: 'What is settled in this account.' },
          open: { type: 'string', description: 'What still needs to be resolved.' },
          revisit: { type: 'string', description: 'What to check again next session.' },
          risk: { type: 'string', description: 'What happens if the open items stay unresolved.' },
        },
        required: ['aligned', 'open', 'revisit', 'risk'],
      },
      mentionedPeople: {
        type: 'array',
        description: 'Names or roles of people mentioned in the conversation who are not the person checking in. Only include people who appear to be meaningfully involved in the situation described. Do not include vague references like "the team" without a name. Return an empty array if none.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Their name or role as mentioned.' },
            context: { type: 'string', description: 'One sentence on how they were described or what their involvement is.' },
          },
          required: ['name', 'context'],
        },
      },
      suggestedParties: {
        type: 'array',
        description: 'Roles or functions that should be in this ground but were not mentioned by the person checking in. Only suggest a role if the conversation makes it clear this person exists and their account would materially change the picture. Do not suggest roles that are already confirmed as participants. Return an empty array if none.',
        items: {
          type: 'object',
          properties: {
            role: { type: 'string', description: 'The role or function - e.g. Chief Clinical Officer, CFO, Board Chair.' },
            reason: { type: 'string', description: 'One sentence on why their account matters for this ground.' },
          },
          required: ['role', 'reason'],
        },
      },
    },
    required: ['whatGroundworkSaw', 'alignmentStatus', 'alignmentBasis', 'areasRequiringAlignment', 'alignmentReached', 'honestClose', 'mentionedPeople', 'suggestedParties'],
  },
};

export interface EntryReport {
  whatGroundworkSaw: string;
  alignmentStatus: 'Unresolved' | 'Mixed' | 'Emerging' | 'Clear' | 'Aligned';
  alignmentBasis: string;
  areasRequiringAlignment: { title: string; observation: string; whyItMatters: string; recommendedMove: string }[];
  alignmentReached: { title: string; note: string }[];
  honestClose: { aligned: string; open: string; revisit: string; risk: string };
  mentionedPeople: { name: string; context: string }[];
  suggestedParties: { role: string; reason: string }[];
}

const SCENARIO_OPENERS: Record<string, string> = {
  'New hire':         'You are setting up a new hire situation. Good moment to use Groundwork. This is exactly when getting aligned early pays off, before anyone interprets things differently. It takes about ten minutes.\n\nTell me a little about it. Who is the new hire, and what do you want to get right from the start?',
  'New project':      'You are setting up a new project. Good moment to use Groundwork. Getting everyone on the same page at the start prevents a lot of friction later. It takes about ten minutes.\n\nTell me a little about it. Who is involved, and what do you want to be clear about before you begin?',
  'New board member': 'You are setting up a new board member situation. Good moment to use Groundwork. Getting expectations explicit early makes the relationship work better for everyone. It takes about ten minutes.\n\nTell me a little about it. Who is coming on, and what do you most want to get right?',
  'New partner':      'You are setting up a new partner relationship. Good moment to use Groundwork. Getting both sides of the picture now prevents misalignment later. It takes about ten minutes.\n\nTell me a little about it. Who is the partner, and what matters most to get right from the start?',
  'Contract renewal': 'You are looking at a contract renewal. Good moment to use Groundwork. Putting both accounts on record before anyone negotiates keeps things grounded in what actually happened. It takes about ten minutes.\n\nTell me a little about it. What is the relationship, and what do you want the record to show?',
  'New direction':                    'You are navigating a new direction. Good moment to use Groundwork. Getting everyone aligned on what the direction means prevents different people walking away with different interpretations. It takes about ten minutes.\n\nTell me a little about it. What is changing, and who needs to be on the same page?',
  'Align OKRs across teams':          'You are aligning OKRs across teams. Good moment to use Groundwork. Getting each person\'s objectives and key results on record independently surfaces the gaps and overlaps before the planning cycle locks in. It takes about ten minutes.\n\nTell me a little about it. What period are you planning for, and which teams are involved?',
  'Build aligned workplan & budgets': 'You are building aligned workplans and budgets. Good moment to use Groundwork. Getting each person\'s plan on record independently shows where the work is coherent and where it is not before anyone starts executing. It takes about ten minutes.\n\nTell me a little about it. What period are you planning for, and who needs to submit a plan?',
  'Alignment pulse check':            'You are running an alignment pulse check. Good moment to use Groundwork. A quick independent read from each person shows where things are moving and where they are stuck, without a meeting. It takes about five minutes.\n\nLet\'s start. What is going well right now?',
  'Realign team':                     'You are realigning a team. Good moment to use Groundwork. Getting each person\'s current read on where things stand, independently and before the group talks, is the fastest way to find out what the real gap is. It takes about ten minutes.\n\nTell me a little about it. What shifted, and what does the team need to agree on?',
  'PIP':                              'You are opening a performance improvement ground. Good moment to use Groundwork. Getting both accounts on record independently, the concern and the person\'s understanding of it, gives the process a fair foundation. It takes about ten minutes.\n\nTell me a little about it. What is the concern, and what does success look like at the end of this period?',
};

const DEFAULT_OPENER = "Welcome to Groundwork. This is a space to build a clear, shared record of a working relationship or situation, one that captures each person's account independently and then shows you where you agree, where you differ, and what the gap is. It takes about ten minutes.\n\nThe best way to see how it works is to try it on something real. Tell me what is on your mind. Who is involved, and what are you trying to get right?";

function isLikelyQuestion(text: string): boolean {
  const t = text.trim();
  if (t.endsWith('?')) return true;
  const lower = t.toLowerCase();
  const starters = ['what is', 'what are', 'how does', 'how do', 'can you', 'is this', 'will ', 'do you', 'does this', 'why does', 'who can', 'when does'];
  return starters.some(s => lower.startsWith(s));
}

export function buildEntrySystemPrompt(scenario: GroundScenario, groundLabel: string, partyType: PartyType = PartyType.INITIATOR): string {
  // partyType drives the opener + framing. INITIATOR (default) is the person
  // opening the ground ("what are you starting"); PARTICIPANT is an invitee
  // giving their own independent read of the situation the initiator already
  // framed - never "what is beginning". Threaded so participantChat no longer
  // reuses the initiator's opener (BUG 1 root cause).
  const scenarioPack = buildScenarioPackForParty(scenario, partyType);
  const runtimeCtx = buildRuntimeContext({
    scenario,
    partyType,
    sessionNumber: 1,
    otherPartyCheckedIn: false,
    groundLabel: groundLabel || 'Entry session',
    trustLevel: 'building',
  });
  return [ENGINE_RULES, scenarioPack, runtimeCtx, ENTRY_SESSION_ADDENDUM].join('\n\n---\n\n');
}

/** Merge the server-side EntryDraft (base) with whatever the browser sent
 * (overlay). The draft was written at entry-save and kept fresh via PATCH, so
 * it is authoritative for the cross-browser case (body is an empty skeleton);
 * in the same-browser case the body's fresher localStorage values win
 * field-by-field. Exported for the guard tests. */
export function overlayDraftOntoBody(
  draft: { payload: unknown; history: unknown },
  body: Record<string, any>,
): any {
  const base = (draft.payload ?? {}) as Record<string, any>;
  const merged: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(body ?? {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    merged[k] = v;
  }
  // History: body wins only when it actually has turns; otherwise the draft's
  // transcript (the whole point of the draft) is used.
  const bodyHistory = Array.isArray(body?.history) ? body.history : [];
  const draftHistory = Array.isArray(draft.history) ? draft.history : [];
  merged.history = bodyHistory.length > 0 ? bodyHistory : draftHistory;
  // The client payload stores the report as reportSummary; map it into the
  // dto's report shape so the ground brief populates ("visible before
  // participants arrive").
  if (!merged.report && merged.reportSummary?.whatGroundworkSaw) {
    merged.report = { whatGroundworkSaw: merged.reportSummary.whatGroundworkSaw };
  }
  if (!Array.isArray(merged.contributors)) merged.contributors = [];
  return merged;
}

@Injectable()
export class EntryService {
  private readonly logger = new Logger(EntryService.name);

  constructor(
    private anthropic: AnthropicService,
    private prisma: PrismaService,
    private grounds: GroundsService,
    private jwt: JwtService,
    private email: EmailService,
    private conversation: ConversationService,
    private events: EventEmitter2,
  ) {}

  opener(scenario?: string): string {
    if (scenario && SCENARIO_OPENERS[scenario]) return SCENARIO_OPENERS[scenario];
    return DEFAULT_OPENER;
  }

  faq(question: string): Promise<string> {
    return this.anthropic.respond(FAQ_PROMPT, [{ role: 'user', content: question }]);
  }

  async classifyIntent(description: string, mode?: string): Promise<{ scenario: GroundScenario }> {
    const modeHint = mode ? `\nBroad category selected by the user: "${mode}"` : '';
    const prompt = `You are a classifier. Given a brief description of a workplace situation and optionally a broad category, return the single best matching scenario key.

Available scenarios:
NEW_HIRE - onboarding a new hire or someone joining a team
NEW_PROJECT - starting a new project, workstream, or initiative
PULSE_CHECK - checking in on how something is going mid-flight
DRIFT - a project, plan, or initiative has gone off track or diverged from what was agreed
REALIGN_TEAM - two specific people (or a small team) see the current situation differently and need to close an interpersonal gap, after conflict, change, or confusion
NEW_COFOUNDER - new co-founder, co-lead, or equal partner relationship
NEW_ADVISOR - new board member, advisor, investor, or mentor relationship
NEW_MANAGER - new manager coming into an existing team or role handover
CONTRACT_RENEWAL - renewing, renegotiating, or extending a contract or agreement
OKR_ALIGNMENT - aligning on objectives, goals, or key results across parties
WORKPLAN_BUDGET - aligning on workplan, resourcing, or budget
PIP - performance improvement, formal feedback, or capability concern
BOARD_STRATEGY - board or leadership team aligning on strategy, priorities, or big bets
COHORT_CHECK - many people in the same role or programme checking in against a shared question (e.g. field officers, franchisees, a training cohort)
ACUTE_SHOCK - a sudden jarring event just happened (an incident, a blow-up, sudden bad news) and everyone needs a shared honest picture of what actually happened before any decision
RECOGNITION - someone wants a raise, promotion, equity, or recognition, and the evidence behind the ask needs to be on record before the conversation
${modeHint}

Description: "${description.slice(0, 400)}"

Respond with exactly one JSON object: {"scenario": "<SCENARIO_KEY>"}`;

    try {
      const raw = await this.anthropic.respond(prompt, [{ role: 'user', content: 'Classify.' }]);
      const match = raw.match(/"scenario"\s*:\s*"([A-Z_]+)"/);
      if (match && Object.values(GroundScenario).includes(match[1] as GroundScenario)) {
        return { scenario: match[1] as GroundScenario };
      }
    } catch { /* fall through */ }
    return { scenario: resolveScenario(mode) };
  }

  async onboard(messages: ChatTurn[]): Promise<{
    reply: string;
    extracted: {
      mode?: string;
      initial?: string;
      whoInvolved?: string;
      decision?: string;
      goals?: string[];
      brief?: string;
    };
    ready: boolean;
  }> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');

    const ONBOARD_SYSTEM = `You are Groundwork, helping someone set up a record for a situation involving more than one person.

Your job is to gather these things through natural conversation:
1. mode: is this something new starting, already underway, already happened, or a recurring check-in
2. initial: what the situation is actually about
3. whoInvolved: who else is part of this AND their role, and the person's own role in relation to them
4. decision: what is making this worth getting on record right now
5. goals: what they need from this process (can be more than one)
6. brief: anything specific they want the questions to focus on (optional)

Rules:
- Ask one short question at a time. One sentence. No lists, no sub-questions.
- Keep each reply to 1 or 2 sentences. Never write more than that.
- Ask the person's own role early ("what is your role in relation to them?"). Do NOT ask about the same thing (role, position, who is involved) more than once - if it has already been answered, move on. Re-asking is a bug.
- Use plain everyday language. Never say "ground", "check-in", "on record", or "contributor". Say "situation", "your account", "saved", "other person" instead.
- Do not use dashes of any kind. Straight quotes only.
- Acknowledge what the person says before asking the next question.
- NEVER invent facts the person did not say. Do not assume a timeframe (like "90 days"), a date, a number, or a standard. If a timeframe matters, ask for it - do not fill it in yourself.
- If the person says they have a document, guide, notes, brief, or any material, invite them to add it: "You can upload or paste that here so it is kept with your record." Do not just acknowledge it and move on.
- Describe what WILL happen next, not only what the person should do. Before wrapping up, let them know: after this, they will add the people involved, then end this session to generate their report.
- If someone asks who will see this: say their answers stay private until both people have finished, then both people see each other's responses at the same time.
- If someone asks what they will get at the end: say they will get a private summary for themselves and a shared report that shows where both sides agree and where the conversation still needs to happen.
- If someone seems confused about what this is: say it is a way for both people to give their account of a situation independently, so the report can show where they agree and where they see things differently.
- THE WRAP-UP TURN (read carefully). The moment you have mode, initial, whoInvolved (including roles), and decision, you are DONE gathering. On that turn your reply MUST be a warm closer that contains NO question mark anywhere. A closer and a question are mutually exclusive: if you have what you need, you close and you do NOT ask one more thing; if you still genuinely need one of those four items, you ask for it and you do NOT wrap up yet. Never do both in the same reply. Do not close with "does that sound right?", "shall we begin?", "anything else?", or any other trailing question. Just confirm warmly that you have what you need, tell them what happens next (add the people involved, then end the session to get the report), and stop.`.trim();

    const reply = await this.anthropic.respond(ONBOARD_SYSTEM, messages);

    // Second lightweight call to extract structured fields
    const EXTRACT_SYSTEM = `You are extracting structured data from an onboarding conversation for Groundwork.

From the conversation history, extract whatever you can. Return only what has been clearly stated.

Fields:
- mode: one of "something_new", "already_underway", "look_back", "recurring" - infer from context if not stated explicitly
- initial: a plain description of the situation
- whoInvolved: who else is part of this
- decision: what prompted this, why now
- goals: array of what they need from this
- brief: anything specific to focus on or probe

Only include a field if it has been clearly communicated. Omit fields that are still unknown.`;

    const EXTRACT_TOOL = {
      name: 'extract_onboarding',
      description: 'Extract structured onboarding fields from the conversation.',
      input_schema: {
        type: 'object' as const,
        properties: {
          mode: { type: 'string', enum: ['something_new', 'already_underway', 'look_back', 'recurring'] },
          initial: { type: 'string' },
          whoInvolved: { type: 'string' },
          decision: { type: 'string' },
          goals: { type: 'array', items: { type: 'string' } },
          brief: { type: 'string' },
        },
      },
    };

    const allMessages: ChatTurn[] = [...messages, { role: 'assistant', content: reply }];
    let extracted: { mode?: string; initial?: string; whoInvolved?: string; decision?: string; goals?: string[]; brief?: string } = {};
    try {
      const result = await this.anthropic.extract<typeof extracted>(EXTRACT_SYSTEM, allMessages, EXTRACT_TOOL);
      if (result) extracted = result;
    } catch { /* extraction is best-effort */ }

    const ready = !!(extracted.mode && extracted.initial && extracted.whoInvolved && extracted.decision);

    return { reply, extracted, ready };
  }

  async chat(messages: ChatTurn[], scenario?: string, groundLabel?: string, joinToken?: string): Promise<string> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');

    // Join participant path: the person scanned a QR code and is responding to a specific ground question.
    // Use a participant-aware prompt that includes the ground context and explains what they're doing.
    if (joinToken) {
      const ground = await this.prisma.ground.findUnique({
        where: { joinToken },
        select: { label: true, scenario: true, brief: true },
      });
      if (ground) {
        const joinScenario = resolveScenario(ground.scenario);
        const briefLine = ground.brief ? `Ground context from the organiser:\n${ground.brief}\n\n` : '';
        const joinPrompt = `# BROADCAST CHECK-IN - PARTICIPANT MODE
You are receiving a check-in from someone who joined via a shared link. They are a participant, not the person who created this ground.

Ground: ${ground.label}
${briefLine}YOUR ROLE: capture this participant's own perspective and put it on record.

STRICT RULES:
- NEVER ask "What is this ground about for you?" - that is already set.
- NEVER ask who opened it or why the ground was created.
- Your first message MUST reflect back what they just said before asking anything.
- Ask only about their own view: what they think, what they have seen, what they would want on record.
- When you have a clear account of their perspective, say exactly: "Your record is here." followed by a 2-sentence plain summary of what is now on their record.
- Off-topic or very brief first messages: name that gently and redirect - "This check-in is to get your perspective on ${ground.label}. In a sentence or two, what would you want on record?"

` + buildEntrySystemPrompt(joinScenario, ground.label, PartyType.PARTICIPANT);
        return this.anthropic.respond(joinPrompt, messages);
      }
    }

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    // Only route to FAQ on the very first user message (conversationStarted guard)
    // and only for short messages - long context blocks from startCheckin are never FAQ questions.
    const conversationStarted = messages.filter(m => m.role === 'user').length > 1;
    if (!conversationStarted && lastUser && lastUser.content.length <= 200 && isLikelyQuestion(lastUser.content)) {
      return this.anthropic.respond(FAQ_PROMPT, messages);
    }

    const mapped = resolveScenario(scenario);
    return this.anthropic.respond(buildEntrySystemPrompt(mapped, groundLabel || scenario || ''), messages);
  }

  async report(messages: ChatTurn[], scenario?: string, groundLabel?: string): Promise<EntryReport | null> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');

    const mapped = resolveScenario(scenario);
    const systemPrompt = buildEntrySystemPrompt(mapped, groundLabel || scenario || '');

    // Anthropic requires the conversation to end with a user message
    const trimmed = [...messages];
    while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant') trimmed.pop();
    if (!trimmed.length) throw new BadRequestException('no user messages in history');

    return this.anthropic.extract<EntryReport>(
      ENTRY_REPORT_PROMPT + '\n\n' + systemPrompt,
      trimmed,
      ENTRY_REPORT_SCHEMA,
    );
  }

  /**
   * Commit an anonymous entry session to a real ground after account creation.
   * Called from MagicVerifyPage once the user has a JWT. Creates the ground,
   * marks session 1 complete with the full transcript, stores the solo report,
   * and fires invite emails for any contributors the admin queued.
   */
  async commit(
    organizationId: string,
    initiatorId: string,
    dto: {
      groundLabel: string;
      orgName?: string;
      scenario?: string;
      cadence?: string;
      cadenceAnchorDay?: number;
      checkInBy?: string;
      lastCheckInBy?: string;
      // Coordinator/lead path: the onboarding context (used as the brief) and
      // the lead who will run the first check-in.
      brief?: string;
      lead?: { email: string; name?: string; contextNote?: string };
      history: ChatTurn[];
      report?: EntryReport | null;
      contributors: { email: string; context?: string; inviteToken?: string; note?: string }[];
    },
  ): Promise<{ groundId: string; joinToken: string | null; contributors: { email: string; devUrl?: string }[]; failedInvites: string[] }> {
    // ---- Server-side draft (written at entry-save, the ISSUE-17 consent
    // moment). The draft is the base and whatever the browser sent overlays
    // it, so commit works no matter which browser opened the magic link.
    // The draft is CLAIMED atomically up front (updateMany guarded on
    // consumedAt: null), so concurrent commits - a double-clicked link, the
    // dev double-fire - cannot both create a ground: exactly one wins, the
    // other waits for the winner's groundId and returns it. Sequential
    // replays return the recorded ground immediately.
    const draft = await this.prisma.entryDraft.findUnique({ where: { userId: initiatorId } });
    if (draft?.consumedAt) {
      return this.awaitConsumedDraftGround(initiatorId);
    }
    if (draft) {
      const claimed = await this.prisma.entryDraft.updateMany({
        where: { id: draft.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (claimed.count === 0) {
        // Lost the race to a concurrent commit: return its ground.
        return this.awaitConsumedDraftGround(initiatorId);
      }
      dto = overlayDraftOntoBody(draft, dto);
      try {
        const result = await this.commitInner(organizationId, initiatorId, dto);
        await this.prisma.entryDraft.updateMany({
          where: { id: draft.id },
          data: { groundId: result.groundId },
        });
        return result;
      } catch (err) {
        // Un-claim so a retry (the draft persists server-side) can succeed.
        await this.prisma.entryDraft.updateMany({
          where: { id: draft.id, groundId: null },
          data: { consumedAt: null },
        }).catch(() => undefined);
        throw err;
      }
    }
    return this.commitInner(organizationId, initiatorId, dto);
  }

  /** A consumed draft means a commit already ran (or is mid-flight). Return
   * its ground, briefly waiting out an in-flight winner. */
  private async awaitConsumedDraftGround(
    userId: string,
  ): Promise<{ groundId: string; joinToken: string | null; contributors: { email: string; devUrl?: string }[]; failedInvites: string[] }> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const d = await this.prisma.entryDraft.findUnique({ where: { userId } });
      if (d?.groundId) {
        const ground = await this.prisma.ground.findUnique({ where: { id: d.groundId }, select: { id: true, joinToken: true } });
        if (ground) return { groundId: ground.id, joinToken: ground.joinToken ?? null, contributors: [], failedInvites: [] };
      }
      if (!d?.consumedAt) break; // winner failed and un-claimed; caller should retry
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new BadRequestException('COMMIT_IN_PROGRESS');
  }

  private async commitInner(
    organizationId: string,
    initiatorId: string,
    dto: Parameters<EntryService['commit']>[2],
  ): Promise<{ groundId: string; joinToken: string | null; contributors: { email: string; devUrl?: string }[]; failedInvites: string[] }> {
    // Nothing usable from either source: the old client silently skipped this
    // case and stranded the user on /setup. Fail EXPLICITLY so the client can
    // show "we couldn't find your session on this device".
    if ((!dto.history || dto.history.length === 0) && !dto.lead) {
      throw new BadRequestException('NO_ENTRY_SESSION');
    }

    const label = (dto.groundLabel ?? '').trim() || 'My first ground';
    const scenario = resolveScenario(dto.scenario);

    if (dto.contributors.length > 20) {
      throw new BadRequestException('Contributor count exceeds the limit of 20 per ground. Split into multiple grounds if needed.');
    }

    // Update org name if the admin filled it in.
    if (dto.orgName?.trim()) {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { name: dto.orgName.trim() },
      });
    }

    // Create the ground. This also creates session 1 check-in (NOT_STARTED) and
    // the initiator participant in one transaction.
    const cadenceMap: Record<string, Cadence> = {
      DAILY: Cadence.DAILY,
      WEEKLY: Cadence.WEEKLY,
      FORTNIGHTLY: Cadence.FORTNIGHTLY,
      MONTHLY: Cadence.MONTHLY,
      SEQUENTIAL: Cadence.SEQUENTIAL,
    };

    // --- Coordinator/lead path ---------------------------------------------
    // The committer is setting this ground up for someone ELSE to run: route
    // through the existing for-lead machinery (AWAITING_LEAD; the lead is
    // invited to confirm and becomes the initiator; the committer is recorded
    // as createdByUserId only). Deliberately NO check-in, NO transcript, and NO
    // report for the coordinator - they did not have a session, and the record
    // must not pretend they did. Contributors become pre-added participants
    // (createForLead invites them alongside the lead). The onboarding context
    // arrives as dto.brief; the coordinator's note to the lead becomes a
    // LeadContextNote (participantId null = about the ground).
    if (dto.lead) {
      const ground = await this.grounds.createForLead(organizationId, initiatorId, {
        leadEmail: dto.lead.email,
        leadName: dto.lead.name,
        label,
        scenario,
        moment: GroundMoment.STARTING,
        cadence: (dto.cadence && cadenceMap[dto.cadence]) ? cadenceMap[dto.cadence] : Cadence.FORTNIGHTLY,
        cadenceAnchorDay: dto.cadenceAnchorDay ?? undefined,
        brief: dto.brief?.trim() || undefined,
        participants: dto.contributors.map((c) => ({ email: c.email, roleAsDescribed: c.context })),
      });
      if (dto.lead.contextNote?.trim()) {
        await this.prisma.leadContextNote.create({
          data: { groundId: ground.id, authorUserId: initiatorId, text: dto.lead.contextNote.trim() },
        });
      }
      const leadJoinToken = (ground as { joinToken?: string | null }).joinToken ?? null;
      return {
        groundId: ground.id,
        joinToken: leadJoinToken,
        contributors: dto.contributors.map((c) => ({ email: c.email })),
        failedInvites: [],
      };
    }

    // Use the AI's own summary as the ground brief so it's visible before participants arrive.
    const brief = dto.report?.whatGroundworkSaw ?? undefined;

    // Broadcast grounds (no named contributors) default to a higher participant cap.
    const isBroadcast = dto.contributors.length === 0;
    const ground = await this.grounds.create(organizationId, initiatorId, {
      label,
      scenario,
      moment: GroundMoment.STARTING,
      cadence: (dto.cadence && cadenceMap[dto.cadence]) ? cadenceMap[dto.cadence] : Cadence.FORTNIGHTLY,
      cadenceAnchorDay: dto.cadenceAnchorDay ?? undefined,
      startsAt: dto.checkInBy || undefined,
      endsAt: dto.lastCheckInBy || undefined,
      brief,
      freeParticipantCap: isBroadcast ? 100 : 4,
    });

    // Find the session 1 check-in and the initiator participant just created.
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId: ground.id, userId: initiatorId },
    });
    if (!participant) throw new BadRequestException('Participant not found after ground creation');

    const checkIn = await this.prisma.checkIn.findFirst({
      where: { groundId: ground.id, participantId: participant.id, sessionNumber: 1 },
    });
    if (!checkIn) throw new BadRequestException('Session 1 check-in not found');

    // Bulk-insert the conversation turns from the anonymous session.
    if (dto.history.length > 0) {
      await this.prisma.conversationTurn.createMany({
        data: dto.history.map(t => ({
          checkInId: checkIn.id,
          role: t.role === 'user' ? TurnRole.PERSON : TurnRole.AI,
          content: t.content,
        })),
      });
    }

    // Mark session 1 complete.
    await this.prisma.checkIn.update({
      where: { id: checkIn.id },
      data: {
        status: CheckInStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Extract structured record entries for the initiator so report synthesis can read them.
    if (dto.history.length > 0) {
      this.conversation.extractRecordEntries(checkIn.id, participant.id)
        .then(() => this.conversation.buildSoloArtifact(participant.id, ground.id))
        .catch((err) => this.logger.error(`commit: record extraction failed for initiator: ${err.message}`));
    }

    // Store the solo report on the participant record (soloArtifact lives there, not on CheckIn).
    if (dto.report) {
      await this.prisma.groundParticipant.update({
        where: { id: participant.id },
        data: {
          soloArtifact: JSON.stringify(dto.report),
          soloArtifactAt: new Date(),
        },
      });
    }

    // Invite each contributor. addParticipant generates a fresh token per participant.
    // Do NOT pass a shared client-side inviteToken here - it would collide on the unique constraint
    // for the second and subsequent contributors, silently dropping them.
    const inviteResults: { email: string; devUrl?: string }[] = [];
    const failedInvites: string[] = [];
    for (const c of dto.contributors) {
      try {
        const result = await this.grounds.addParticipant(ground.id, organizationId, initiatorId, {
          email: c.email,
          roleAsDescribed: c.context,
          note: c.note,
        });
        inviteResults.push({ email: c.email, devUrl: (result as any)?.devUrl });
      } catch (err: any) {
        this.logger.error(`entry commit: failed to invite ${c.email}: ${err.message}`);
        failedInvites.push(c.email);
      }
    }

    // Zero contributors = a deliberate solo/broadcast start: the initiator
    // completing session 1 is the whole party, so the ground goes ACTIVE.
    // A TOTAL invite failure is NOT intent - the ground stays OPEN ("parties
    // may not all be added") and failedInvites tells the client to surface it
    // with a resend path, instead of silently rebranding it a solo ground.
    if (dto.contributors.length === 0) {
      await this.prisma.ground.update({ where: { id: ground.id }, data: { status: 'ACTIVE' as any } });
    }

    const joinToken = (await this.prisma.ground.findUnique({ where: { id: ground.id }, select: { joinToken: true } }))?.joinToken ?? null;
    return { groundId: ground.id, joinToken, contributors: inviteResults, failedInvites };
  }

  /** Pre-auth draft update, authorized by the bearer draftToken (same pattern
   * as invite tokens). The entry page calls this for edits made AFTER the
   * email was sent - org name, ground name, cadence, dates, contributors -
   * which previously lived only in localStorage and were lost cross-browser. */
  async patchDraft(draftToken: string, payload: Record<string, any>): Promise<{ ok: true }> {
    if (!draftToken || typeof draftToken !== 'string') throw new BadRequestException('draftToken required');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('payload must be an object');
    if (JSON.stringify(payload).length > 200_000) throw new BadRequestException('payload too large');

    const draft = await this.prisma.entryDraft.findUnique({ where: { draftToken } });
    if (!draft || draft.consumedAt) throw new NotFoundException('Draft not found');

    const merged = { ...(draft.payload as Record<string, any>), ...payload };
    await this.prisma.entryDraft.update({ where: { id: draft.id }, data: { payload: merged as any } });
    return { ok: true };
  }

  /** Public proxy so the controller can resolve a joinToken without exposing grounds service directly. */
  async joinPreview(joinToken: string) {
    return this.grounds.getJoinPreview(joinToken);
  }

  /**
   * Join commit: save an anonymous check-in session to an existing ground via joinToken.
   * If email + name are provided, create/link a User, send password setup email, and
   * return a JWT so they're immediately signed in. If no email, the session is discarded.
   */
  async joinCommit(dto: {
    joinToken: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    roleAsDescribed?: string;
    history: ChatTurn[];
    report?: EntryReport | null;
  }): Promise<{ groundId: string; accessToken?: string; userId?: string }> {
    const ground = await this.prisma.ground.findUnique({
      where: { joinToken: dto.joinToken },
      select: { id: true, organizationId: true, label: true, scenario: true },
    });
    if (!ground) throw new NotFoundException('Join link not found or has expired');

    if (!dto.email?.trim()) {
      // Anonymous - nothing stored.
      return { groundId: ground.id };
    }

    const email = dto.email.trim().toLowerCase();
    // Never fabricate a name from the email address - an empty firstName is
    // the correct "no name given" value; participantLabel() and every other
    // display surface already fall back to roleAsDescribed / "a teammate".
    const firstName = dto.firstName?.trim() || '';
    const lastName = dto.lastName?.trim() || '';

    const { user, isNew } = await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });
      const isNew = !user;
      if (!user) {
        // Mark isEmailVerified: false - the join flow is authenticated via the joinToken
        // (ground-scoped), not by proving ownership of the email address. The account is
        // functional for this ground but email remains unverified until the user completes
        // a standard sign-in flow (magic link or password setup).
        user = await tx.user.create({
          data: {
            organizationId: ground.organizationId,
            email,
            firstName,
            lastName,
            role: 'MEMBER',
            isEmailVerified: false,
            passwordHash: null,
          },
        });
      }
      return { user, isNew };
    });

    // If this email already joined this ground once, don't create a second
    // GroundParticipant row (the [groundId, email] unique constraint would
    // otherwise surface as a raw DB error to the joining person). Sign them
    // back in against their existing participant record instead of
    // re-processing another "first" check-in on top of it.
    const existingParticipant = await this.prisma.groundParticipant.findUnique({
      where: { groundId_email: { groundId: ground.id, email } },
    });
    if (existingParticipant) {
      const accessToken = this.jwt.sign({
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      });
      this.logger.log(`join-commit: ${email} already joined ground ${ground.id} - signing back in, no duplicate created`);
      return { groundId: ground.id, accessToken, userId: user.id };
    }

    // Create participant record for this person on the ground.
    const participant = await this.prisma.groundParticipant.create({
      data: {
        groundId: ground.id,
        userId: user.id,
        email,
        partyType: PartyType.PARTICIPANT,
        roleAsDescribed: dto.roleAsDescribed?.trim() || null,
        notifiedAt: new Date(),
      },
    });

    // Create and mark session 1 complete.
    const checkIn = await this.prisma.checkIn.create({
      data: {
        groundId: ground.id,
        participantId: participant.id,
        sessionNumber: 1,
        status: CheckInStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Save conversation turns.
    if (dto.history.length > 0) {
      await this.prisma.conversationTurn.createMany({
        data: dto.history.map((t) => ({
          checkInId: checkIn.id,
          role: t.role === 'user' ? TurnRole.PERSON : TurnRole.AI,
          content: t.content,
        })),
      });
      // Extract structured record entries so report synthesis can read them.
      // Fire-and-forget with error logging - a failure here should not block the commit response.
      this.conversation.extractRecordEntries(checkIn.id, participant.id)
        .then(() => this.conversation.buildSoloArtifact(participant.id, ground.id))
        .catch((err) => this.logger.error(`join-commit: record extraction failed for ${email}: ${err.message}`));
    }

    // Save solo report artifact.
    if (dto.report) {
      await this.prisma.groundParticipant.update({
        where: { id: participant.id },
        data: { soloArtifact: JSON.stringify(dto.report), soloArtifactAt: new Date() },
      });
    }

    // Send password setup email so they can return and sign in.
    if (isNew || !(await this.prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }))?.passwordHash) {
      const setupToken = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: setupToken,
          type: TokenType.PASSWORD_SETUP,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      });
      this.email.sendAddPasswordEmail(email, user.firstName, setupToken).catch(() => null);
    }

    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    });

    this.logger.log(`join-commit: ${email} checked in on ground ${ground.id} (new user: ${isNew})`);
    return { groundId: ground.id, accessToken, userId: user.id };
  }

  /**
   * ONE PATH for broadcast join: instead of running the entry-pipeline chat and
   * committing a finished transcript, a cohort member signs in against the join
   * link and lands in the REAL conversation engine (like accepting an invite,
   * #82/#83). Creates/links their account, a GroundParticipant on the ground,
   * and a session-1 check-in (NOT_STARTED - they run it in the engine), and
   * returns the checkInId to hand off to /checkin/:id. Sign-in is required
   * (there is no anonymous branch): the real engine needs an owned check-in.
   */
  async joinAccept(dto: {
    joinToken: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roleAsDescribed?: string;
  }): Promise<{ groundId: string; checkInId: string; accessToken: string; userId: string; existingAccount: boolean }> {
    // Validate inputs before any DB lookup - a malformed request must be a
    // clean 400, not a 500 from querying on an undefined join token.
    if (!dto.joinToken?.trim()) throw new BadRequestException('A join link is required.');
    if (!dto.email?.trim()) throw new BadRequestException('An email is required to join.');
    const ground = await this.prisma.ground.findUnique({
      where: { joinToken: dto.joinToken },
      select: { id: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Join link not found or has expired');

    const email = dto.email.trim().toLowerCase();
    // Never fabricate a name from the email address (see joinCommit above).
    const firstName = dto.firstName?.trim() || '';
    const lastName = dto.lastName?.trim() || '';

    let user = await this.prisma.user.findUnique({ where: { email } });
    const existingAccount = !!user;
    if (!user) {
      user = await this.prisma.user.create({
        data: { organizationId: ground.organizationId, email, firstName, lastName, role: 'MEMBER', isEmailVerified: false, passwordHash: null },
      });
      const setupToken = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token: setupToken, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      });
      this.email.sendAddPasswordEmail(email, user.firstName, setupToken).catch(() => null);
    }

    // Reuse an existing participant+check-in if this email already joined (no
    // duplicate row - mirrors join-commit's idempotency), else create both.
    let participant = await this.prisma.groundParticipant.findUnique({
      where: { groundId_email: { groundId: ground.id, email } },
    });
    if (!participant) {
      participant = await this.prisma.groundParticipant.create({
        data: {
          groundId: ground.id,
          userId: user.id,
          email,
          partyType: PartyType.PARTICIPANT,
          roleAsDescribed: dto.roleAsDescribed?.trim() || null,
          notifiedAt: new Date(),
        },
      });
    } else if (!participant.userId) {
      participant = await this.prisma.groundParticipant.update({ where: { id: participant.id }, data: { userId: user.id } });
    }

    // The session-1 check-in they will run in the real engine. Reuse an open one.
    let checkIn = await this.prisma.checkIn.findFirst({
      where: { participantId: participant.id, status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] } },
      orderBy: { sessionNumber: 'asc' },
    });
    if (!checkIn) {
      checkIn = await this.prisma.checkIn.create({
        data: { groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
      });
    }

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, organizationId: user.organizationId, role: user.role });
    this.logger.log(`join-accept: ${email} joined ground ${ground.id} -> real engine check-in ${checkIn.id} (new user: ${!existingAccount})`);
    return { groundId: ground.id, checkInId: checkIn.id, accessToken, userId: user.id, existingAccount };
  }
}
