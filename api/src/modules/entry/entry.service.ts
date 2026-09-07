import {
  A_JOIN_LINK_LASTS_HOURS,
  WhatWeSay,
  whatToSayAfterAsking,
  whyThisDidNotWork,
} from './a-join-link-is-not-a-password';
import { Injectable, Logger, BadRequestException, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroundScenario, GroundMoment, TurnRole, CheckInStatus, PartyType, Cadence, TokenType } from '@prisma/client';
import { splitMentions } from './a-client-is-not-a-colleague';
import { theSetupPackFor } from './the-first-question-for-this-situation';
import { isASecondOrganisation, GUEST_ROLE } from '../participants/joining-a-second-organisation';
import {
  restoreTheirWords, truncationsOfTheirWords, causalClaimNobodyMade, ASK_INSTEAD_OF_CONCLUDING,
} from '../conversation/the-record-holds-what-was-said';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService, RECOMMENDED_MOMENT } from '../grounds/grounds.service';
import { EmailService } from '../email/email.service';
import { AnthropicService, ChatTurn } from '../conversation/anthropic.service';
import { ConversationService } from '../conversation/conversation.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import {
  ENGINE_RULES,
  buildScenarioPackForParty,
  buildRuntimeContext,
} from '../conversation/prompt-library';
import { VOCABULARY_RULE } from '../conversation/prompt-library';
import { forHumans, hadCloseMarker } from '../presentation/outbound';
import { DEFAULT_FREE_MEMBER_LIMIT } from '../billing/pricing.service';
import { recordRoundCompletion } from '../grounds/round-completion';
import { screen, ASK_AGAIN } from '../conversation/nothing-invented-reaches-them';
import { mayOpen, HOW_A_NEW_ORG_WORKS } from '../grounds/who-may-open-a-check-in';

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

/**
 * THE SAME LOOKUP, EXCEPT IT ANSWERS "I DO NOT KNOW".
 *
 * `resolveScenario` above defaults to NEW_PROJECT, which is right where a ground is being created
 * and something has to be written down. It is exactly wrong for the setup conversation: an absent
 * or unrecognised value would make it open with "What is the project, and who is on it?" to
 * somebody who never mentioned a project - a confidently wrong first question, which is worse than
 * the generic one it replaced.
 *
 * So setup uses this one, and no scenario means no situation pack and the honest open question.
 */
/**
 * THE SETUP PROMPT, ASSEMBLED. Exported so a guard can read what the model is actually given rather
 * than what the pieces say separately - the whole failure this change fixes was two correct pieces
 * that never met, because the endpoint was not told which situation it was setting up.
 */
export function buildSetupPrompt(base: string, scenarioInput?: string, momentInput?: string): string {
  const pack = theSetupPackFor(scenarioOrNothing(scenarioInput), momentOrNothing(momentInput));
  return pack ? `${base}\n\n---\n\n${pack}` : base;
}

function momentOrNothing(input?: string | null): GroundMoment | null {
  if (!input) return null;
  return Object.values(GroundMoment).includes(input as GroundMoment) ? (input as GroundMoment) : null;
}

function scenarioOrNothing(input?: string | null): GroundScenario | null {
  if (!input) return null;
  if (Object.values(GroundScenario).includes(input as GroundScenario)) return input as GroundScenario;
  return SCENARIO_MAP[input] ?? null;
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

export const FAQ_PROMPT = `${VOCABULARY_RULE}

FAQ MODE. Answer the person's question about how Groundwork works in one or two plain sentences, then stop. Do not start a check-in. Do not ask a follow up unless it is needed for clarity. Do not use dashes of any kind. Use straight quotes. Reference facts only: Your contribution to this ground stays on your side until everyone has checked in. The other party submits their own independent account. The report shows where accounts agree, where they differ, and what the gap means. Both parties receive it at the same moment. Most first sessions take 8 to 15 minutes. Ten grounds are free, each with unlimited sessions and reports. A subscription lifts that cap. Nothing is charged per session, and participants are never charged at all. For anything else: hello@myground.work.`;

export const ENTRY_REPORT_PROMPT = `${VOCABULARY_RULE}

You are Groundwork. A person has just completed their first check-in session. Generate their session 1 report: what you saw in their account, where clarity exists, where it does not, and what to do next.

Rules:
- Begin the report with a single framing line, exactly: "This is your contribution to this record from session 1. It reflects what you put on record. Nobody else has weighed in yet."
- No verdicts. No judgements of any person.
- Never name the other party personally. Use "the other party" or their role.
- Be specific to what was actually said. Do not invent. Never introduce a timeframe, date, number, or standard the person did not state (do not write "90 days" unless they said it).
- Address the person directly as "you" and call their record "your record". NEVER refer to them as "this account" or "the user".
- CRITICAL: only ONE party has checked in (this person). Alignment is a two-sided outcome and CANNOT exist yet. Do NOT use the word "Aligned" or say alignment has been "reached". The status ceiling for a one-sided session is "Clear" (your own side is clearly on record). Reserve "Aligned" for when somebody else has checked in separately.
- alignmentReached items are things you have stated clearly on YOUR side and put on record - they are "clear on your side, waiting on the other person", never agreed by both. Each title is a heading a person reads next to other headings, so it names the settled thing in two to five words. "The quarterly target is on record" works; "quarter" does not.
- The alignment status reflects THIS session only. No cross-reference yet since the other party has not checked in.
- Areas requiring alignment are things still unclear or unstated, not failures.
- The recommended move is practical, not prescriptive.
- Honest close must name what is settled, what is open, what to revisit, and what the risk is if things stay as they are.
- In areasRequiringAlignment, always include at least one entry for any significant topic raised in the conversation but not addressed directly - name it explicitly as an unaddressed area with observation "This topic came up but was not fully explored in this session."
- In mentionedPeople, list any person named or meaningfully referenced in the conversation who is not the person checking in. If someone was already confirmed as a participant in this check-in earlier in the conversation, still include them - the admin needs to see the full cast. Omit only truly anonymous or generic references with no name or identifiable role.
- In suggestedParties, name any role whose independent account would materially change or strengthen this check-in's picture, but who was not mentioned by the person checking in. Typical triggers: a regulated sector with a clinical or compliance lead whose sign-off affects decisions described; a multi-layer authority structure where a board or chair sits above the mandate-giver; a finance function that controls data the person says they need. Do not suggest roles already confirmed as participants. If nothing is missing, return an empty array.
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
            title: {
              type: 'string',
              description:
                'A short noun phrase naming what is settled, two to five words, sentence case. It is rendered as a card heading beside others like "Evidence baseline established" and "Team named", so it must read as a heading on its own. Never a bare noun lifted from the conversation: a live report produced the single word "quarter" as a heading, which tells the reader nothing.',
            },
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
        description: 'Roles or functions that should be in this check-in but were not mentioned by the person checking in. Only suggest a role if the conversation makes it clear this person exists and their account would materially change the picture. Do not suggest roles that are already confirmed as participants. Return an empty array if none.',
        items: {
          type: 'object',
          properties: {
            role: { type: 'string', description: 'The role or function - e.g. Chief Clinical Officer, CFO, Board Chair.' },
            reason: { type: 'string', description: 'One sentence on why their account matters for this check-in.' },
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
  /** W3. Named and shown, deliberately without a button. See splitMentions. */
  alsoCameUp?: { name: string; context: string }[];
  alsoCameUpNote?: string | null;
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

export function buildEntrySystemPrompt(
  scenario: GroundScenario,
  groundLabel: string,
  partyType: PartyType = PartyType.INITIATOR,
  // A cohort at the start is an onboarding period that ends in a decision about
  // each person, not a repeatable pulse. Optional here because the pre-account
  // walkthrough often has not established the moment yet.
  moment?: GroundMoment | null,
): string {
  // partyType drives the opener + framing. INITIATOR (default) is the person
  // opening the ground ("what are you starting"); PARTICIPANT is an invitee
  // giving their own independent read of the situation the initiator already
  // framed - never "what is beginning". Threaded so participantChat no longer
  // reuses the initiator's opener (BUG 1 root cause).
  const scenarioPack = buildScenarioPackForParty(scenario, partyType, moment);
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


/**
 * WHEN SETUP HAS ENOUGH TO STOP ASKING - AND IT DEPENDS ENTIRELY ON WHO IS ANSWERING.
 *
 * The old rule was `mode && initial && whoInvolved && decision` for everybody, and it was wrong in
 * both directions at once.
 *
 * FOR A COORDINATOR IT DEMANDED WHAT THEY DO NOT HAVE. Somebody told to set this up for other people
 * often knows one thing: who runs it. The prompt already says so - "do not press a bystander for a
 * situation they cannot describe" - but this gate required a situation, a reason and a roster before
 * setup could finish, so the instruction said do not ask and the gate said you cannot leave until you
 * have. The gate won, by being satisfiable with a guess. Observed live: `whoInvolved: "My team"` -
 * three people, no names - cleared it.
 *
 * FOR EVERYBODY IT IGNORED THE ONE FIELD THAT DECIDES WHAT THE REST MEAN. `yourRole` says whether
 * these words are somebody's own account or hearsay about other people, which the product treats
 * completely differently. It was extracted first, on purpose, and then left out of the gate - so all
 * four other fields could be collected before anything knew which kind they were.
 *
 * WHAT REPLACES IT:
 *   - Nobody is ready until `yourRole` is known. It is asked first; it now gates first.
 *   - A coordinator is ready as soon as it IS known. What they have to give - who runs the first
 *     check-in - is collected by the step immediately after this, and needs none of these fields.
 *     Anything else they happen to know is welcome and none of it is required.
 *   - A party still owes the situation and why now, because those are genuinely theirs.
 *
 * WHO IS INVOLVED IS DELIBERATELY NOT HERE, even for a party. It is warned about instead - see
 * `needsPeople`. A required field somebody cannot answer becomes a field they invent.
 */
export function onboardingIsReady(extracted: {
  mode?: string;
  initial?: string;
  decision?: string;
  yourRole?: string;
}): boolean {
  if (!extracted.yourRole) return false;
  if (extracted.yourRole !== 'a_party') return true;
  return !!(extracted.mode && extracted.initial && extracted.decision);
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

  async faq(question: string): Promise<string> {
    /* Prose, to a person, containing whatever they typed - so it needs the same guard as every
       other reply. It was the fourth path found without one. */
    return this.guardedReply(FAQ_PROMPT, [{ role: 'user', content: question }]);
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
      /*
       * The marker is the VARIABLE NAME, not a comment. It used to be a comment, and the repo-wide
       * rule that source-assertion specs must strip comments first - which is right, because a
       * sentence quoting code passes a scanner while the code is gone - took it with it.
       *
       * A name survives stripping and reads at the call site, so whoever adds the next direct call
       * still has to say in the open which kind theirs is.
       */
      const notAReplyToAnybody = await this.anthropic.respond(prompt, [{ role: 'user', content: 'Classify.' }]);
      const raw = notAReplyToAnybody;
      const match = raw.match(/"scenario"\s*:\s*"([A-Z_]+)"/);
      if (match && Object.values(GroundScenario).includes(match[1] as GroundScenario)) {
        return { scenario: match[1] as GroundScenario };
      }
    } catch { /* fall through */ }
    return { scenario: resolveScenario(mode) };
  }

  async onboard(
    messages: ChatTurn[],
    /**
     * THE CARD THEY CLICKED. Twenty-two situations opened with one question because this argument
     * did not exist - see the-first-question-for-this-situation.ts for the whole account.
     */
    scenarioInput?: string,
    momentInput?: string,
  ): Promise<{
    reply: string;
    extracted: {
      mode?: string;
      initial?: string;
      whoInvolved?: string;
      /** One entry per individual. "My team" is zero entries, not one. */
      peopleNamed?: string[];
      decision?: string;
      goals?: string[];
      brief?: string;
      yourRole?: string;
    };
    ready: boolean;
    /** Party path only: setup can finish, but nobody has been named yet and they are told so. */
    needsPeople: boolean;
  }> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');

    /**
     * NO VOCABULARY_RULE HERE, DELIBERATELY, AND I ADDED IT BEFORE TAKING IT BACK OUT.
     *
     * The rule says "never say ground, it is a check-in". This prompt already says never say
     * "ground" OR "check-in" OR "on record" OR "contributor" - say "situation". That is stricter
     * and it is the right call for a first conversation with somebody who has never heard of the
     * product. Prepending the rule told the model to use the exact word this prompt bans, which
     * is worse than the problem it was fixing.
     *
     * FAQ_PROMPT and ENTRY_REPORT_PROMPT do carry it: those speak to somebody who has already
     * been through setup, where "check-in" is the honest name for the thing.
     */
    const ONBOARD_SYSTEM = `You are Groundwork, helping someone set up a record for a situation involving more than one person.

Your job is to gather these things through natural conversation:
1. yourRole: WHO WRITES THE OBJECTIVE, AND WHO CHECKS IN AGAINST IT. Ask this FIRST, before anything
   about the situation itself, in one short question with the three answers named:

     - you set the context and objective, and you check in against it too
     - you set the context and objective, and other people check in against it

   ASK IT IN THOSE TERMS, not as "are you part of this". The old wording asked where they sit, which
   is a seating plan; what is actually being decided is who writes the objective and who is measured
   against it. The setup screen asks it the same way now and the two must not drift apart.

   THERE USED TO BE A THIRD ANSWER - "somebody else sets the context, you are only setting the
   check-in up and inviting them" - and it is gone on her call: "I think we should remove the whole
   org admin setting a context and handing it over to a lead. It seems like it is confusing." It
   produced a check-in belonging to nobody in the room: this person named a lead, and the lead was
   emailed to confirm a context they had not written and could not read until they accepted.
   IF SOMEBODY SAYS THAT IS THEIR SITUATION - they were told to set this up and do not know the
   detail - do NOT offer to hand it over. Say plainly that whoever knows what this is about should
   be the one setting it up, and that they can add themselves to watch the reports afterwards from
   the check-in's settings. Then stop; do not gather a situation they cannot describe.

   WHY IT COMES FIRST AND NOT THIRD. It decides what everything they say next IS. A party's words are
   their own account. A non-party's words are context about other people, which this product treats
   completely differently - it is a place to look, never a thing that is true. Asking afterwards means
   collecting the words and establishing what kind of words they were once they are already written.

   AND IT IS WORST FOR THE COMMONEST CASE. Somebody told to set this up has no situation of their own
   to describe. Asking them to describe one for two rounds before anything asks whose it is wastes
   their time and produces a record of what a bystander imagines.

   THE FIRST MESSAGE MAY NOT BE THEIRS. Setup usually opens with a sentence the PRODUCT wrote, from a
   list of situations they clicked - it is phrased in the first person ("I want one honest read from
   everyone on my team this week...") but they typed none of it. For a party that is roughly what they
   meant and no harm is done. FOR SOMEBODY SETTING THIS UP FOR OTHER PEOPLE IT IS THE PRODUCT WRITING
   AN ACCOUNT IN THEIR VOICE about a situation they never described - and goals were being extracted
   from it as though they had said them.

   So once yourRole is NOT "a_party", treat that opening sentence as a TOPIC THEY PICKED, not as
   something they told you. Do not extract goals, a situation description or a reason from it. Only
   what they have actually typed counts.

   IF THEY ARE A PARTY, SAY THIS ONCE, PLAINLY: they will do their own check-in separately, and nothing
   they write here counts as their account. It is true, it is never currently said, and without it the
   later check-in feels like being asked the same thing twice for no reason.

   IF SOMEBODY ELSE WILL RUN IT and they do not know the detail, say so is fine: take the names and let
   the person who does know it lead. Do not press a bystander for a situation they cannot describe.

   NAME THE SITUATION THEY PICKED. THIS IS NOT OPTIONAL AND IT WAS THE COMPLAINT.
   They clicked a card that says exactly what this is about - a new hire starting, a contract about
   to be signed, a project that has drifted - and the first thing back was a role question that
   could have been asked of anybody about anything. It reads as though the click went nowhere.
   So the role question OPENS by naming their actual subject in their own terms, then asks the
   three answers: "A new hire starting. Before we get into it, who writes what good looks like
   here, and who checks in against it?" One sentence of subject, one question. Do not summarise
   the card back at length, and do not add any fact the card did not carry.

   AND THE QUESTION AFTER IT IS THE CONCRETE ONE THE SITUATION IMPLIES, not a blank "tell me about
   the situation" - which asks them to type out what they just picked. A new hire starting means
   "Who is the new hire, and when do they start?". A contract about to be signed means "What is
   the agreement, and who is on the other side of it?". A project that has drifted means "Which
   project, and what has changed since you agreed it?". Ask for the missing specifics, never for
   the topic they already gave you.
2. mode: is this something new starting, already underway, already happened, or a recurring check-in
3. initial: what the situation is actually about
4. whoInvolved: who else is part of this AND their role.
   ORGANISATIONS ARE NOT PEOPLE. If the answer names companies, teams, partners or clients rather
   than individuals ("we work with Afrimash, Bayer and NABG"), that is a good answer to a
   different question, and you are not finished. Ask once, in one sentence, who the person
   responsible is inside them - by name if they know it, by role if they do not. A record is
   built from accounts that individual people give; an organisation cannot check in. If they say
   they do not know yet, accept it and move on: never press twice, and never invent a name.
5. decision: what is making this worth getting on record right now.
   ASK THIS ONE WITH EXAMPLES, ALWAYS. Bare, it is the question people stall on: "what makes you
   want to get this on record right now?" sounds like it is asking them to justify themselves, and
   the honest answer ("it just seemed sensible") feels wrong to type. Two or three concrete
   examples turn it into a menu they can point at. Phrase it close to this:
   "What do you want out of having this written down? For example: to know the onboarding went
   well, to have something real to look at when probation is decided, or to be able to show the
   project started off right."
   Use examples that fit what they have already told you, not these exact three every time.
   NEVER OFFER AN HR REASON. A live run produced "to have a clear reference for performance
   reviews", which is the one thing the product says it is not for: the public page reads "not an
   HR system, employee monitoring tool, or permanent performance-management layer. In fact, we do
   not recommend using it that way." Suggesting appraisals, performance reviews, formal
   evaluations, or building a file on somebody contradicts that at the exact moment a new person is
   deciding what this is for. Reasons are about the WORK going well - understanding what is
   actually happening, catching a gap early, agreeing what good looks like - never about
   assessing a person.
6. goals: what they need from this process (can be more than one)
7. brief: anything specific they want the questions to focus on (optional)

Rules:
- Ask one short question at a time. One sentence. No lists, no sub-questions.
- Keep each reply to 1 or 2 sentences. Never write more than that.
- The person's own role is STEP 1 and is asked before anything else - see above. It used to be an
  instruction to "ask early" inside step 3, which is why it kept arriving third, mixed into a question
  about other people. Do NOT ask about the same thing (role, position, who is involved) more than once -
  if it has already been answered, move on. Re-asking is a bug.
- Use plain everyday language. Never say "ground", "check-in", "on record", or "contributor". Say "situation", "your account", "saved", "other person" instead.
- Do not use dashes of any kind. Straight quotes only.
- Acknowledge what the person says before asking the next question.
- NEVER invent facts the person did not say. Do not assume a timeframe (like "90 days"), a date, a number, or a standard. If a timeframe matters, ask for it - do not fill it in yourself.
- If the person says they have a document, guide, notes, brief, or any material, invite them to add it: "You can upload or paste that here so it is kept with your record." Do not just acknowledge it and move on.
- Describe what WILL happen next, not only what the person should do. Before wrapping up, let them know: after this, they will add the people involved, then end this session to generate their report.
- If someone asks who will see this: say their answers stay private until both people have finished, then both people see each other's responses at the same time.
- If someone asks what they will get at the end: say they will get a private summary for themselves and a shared report that shows where both sides agree and where the conversation still needs to happen.
- If someone seems confused about what this is: say it is a way for both people to give their account of a situation independently, so the report can show where they agree and where they see things differently.
- HOW LONG AND HOW OFTEN. Before you wrap up, you must have asked how long this runs and how often they want to check in - once, in one question, phrased plainly ("How long should this run, and how often do you want to check in?"). These two answers decide the shape of the whole ground: ninety days weekly is twelve check-ins, ninety days fortnightly is six, and nobody can change that afterwards without noticing it was never asked. Ask once. If they answer vaguely or say they do not mind, accept that and move on - do not press, and do not guess a value they did not give.
- THE WRAP-UP TURN (read carefully). WHEN YOU ARE DONE GATHERING DEPENDS ON WHO YOU ARE TALKING TO,
  and it is the same rule the product uses to decide it:
    - Somebody SETTING THIS UP FOR OTHER PEOPLE is done the moment you know that is what they are.
      Do not gather a situation, a reason or a roster from them. The next screen asks for the one
      thing they have - who runs the first check-in - and everything else is the lead's to give.
    - A PARTY is done once you have mode, initial and decision, and you have ASKED how long and how
      often. WHO IS INVOLVED IS NOT A CONDITION: they are allowed to finish without naming anybody
      and the screen tells them so. Ask for the names once; do not hold the setup hostage to them.
  Once you are done gathering, On that turn your reply MUST be a warm closer that contains NO question mark anywhere. A closer and a question are mutually exclusive: if you have what you need, you close and you do NOT ask one more thing; if you still genuinely need one of those four items, you ask for it and you do NOT wrap up yet. Never do both in the same reply. Do not close with "does that sound right?", "shall we begin?", "anything else?", or any other trailing question. Do NOT claim to have what you need, and do not summarise what you took down: the screen prints what is actually on the record directly underneath your reply, including anything still missing, so a claim from you can only contradict it. Say what happens next (the next screen asks who gives the accounts, then the check-in itself) and stop.
- THE CLOSER MUST NOT READ AS THE END OF EVERYTHING. "Thank you, that gives me what I need to set
  this up for you." is a full stop, and the screen then asks another question, so the product looks
  like it changed its mind. It is a HANDOVER, not a finish: say what you have, then say plainly that
  the next screen asks who gives the accounts, and that the check-in itself comes after that. Two
  sentences. Somebody who knows what is coming does not experience the next question as an
  interruption.`.trim();

    /**
     * Through the boundary before anything else touches it. This reply reached the screen raw,
     * which is how `[[SESSION_COMPLETE]]` and `**Outreach:**` were photographed in a chat bubble.
     *
     * AND THROUGH `guardedReply`, WHICH IT WAS NOT.
     *
     * The comment on that helper says a new exit should be guarded by default and forgetting should
     * be the unusual act. It says that because the word-restoration had already been fixed once and
     * missed the entry path. It then missed this one: `chat()` was routed through the helper and
     * `onboard()` was left calling the model directly - in the flow every single new person meets
     * first, and the same flow the original "microchipshit" bug was found in.
     */
    /*
     * THE SITUATION'S OWN FIRST QUESTION, APPENDED RATHER THAN WOVEN IN.
     *
     * The general rules of setup are the same for every card - one question at a time, plain words,
     * never invent a timeframe, the role question first - and what differs is one question. So the
     * pack is a block on the end rather than twenty-two variants of the whole prompt, which is the
     * shape that drifts.
     *
     * Empty for somebody describing their own situation, and that is the honest state: nothing has
     * been classified yet, so the generic opener stands until `classifyIntent` has an answer to
     * work from and the next turn carries a real scenario.
     */
    const reply = await this.guardedReply(buildSetupPrompt(ONBOARD_SYSTEM, scenarioInput, momentInput), messages);

    // Second lightweight call to extract structured fields
    const EXTRACT_SYSTEM = `You are extracting structured data from an onboarding conversation for Groundwork.

From the conversation history, extract whatever you can. Return only what has been clearly stated.

Fields:
- mode: one of "something_new", "already_underway", "look_back", "recurring" - infer from context if not stated explicitly
- initial: a plain description of the situation
- yourRole: one of "a_party", "setting_up_for_others" - what they said in step 1. There is no third
  value: handing the context to somebody else was removed.
  Extract it as soon as they answer, and do not infer it from how they describe the situation: a lead
  describing somebody else's problem in detail reads exactly like a party, and getting this wrong
  changes whether their words are treated as an account or as context about other people.
- whoInvolved: who else is part of this
- peopleNamed: an array with ONE ENTRY PER INDIVIDUAL PERSON, named where you have a name and described
  by their role where you do not ("Priya", "Tom", "the finance lead"). A team, a company, a client or a
  department is NOT an entry: "my team" is zero people, not one. Leave it out entirely if no individual
  has been identified - an empty list is an honest answer and is handled.
- decision: what prompted this, why now
- goals: array of what they need from this
- brief: anything specific to focus on or probe
- cadence: how often they check in, IF they said. One of "DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY", "ONE_TIME". Map their own words: "weekly" or "every week" -> WEEKLY; "every two weeks", "fortnightly", "every other week" -> FORTNIGHTLY; "monthly" or "once a month" -> MONTHLY; "just once", "a single check-in" -> ONE_TIME. Omit it entirely if they did not say.
- timelineDays: how long the whole period runs, in days, IF they said. "90 days" or "three months" -> 90; "60 days" -> 60; "a quarter" -> 90; "two weeks" -> 14. Omit if they did not say.

Only include a field if it has been clearly communicated. Omit fields that are still unknown.
Never guess a cadence or a duration. Somebody who did not mention how often, or for how long,
must come back with those fields absent - a wrong number here silently sets up the wrong check-in.

MODE IS THE ONE EXCEPTION AND IT IS ALWAYS REQUIRED. Every situation is one of the four: starting,
already underway, looking back, or recurring. There is no such thing as a situation that is none of
them, so "unknown" is never the right answer here - infer it from what the person described and
default to "something_new" if the words genuinely do not say. This is not the same as guessing a
cadence: a wrong cadence silently sets up the wrong schedule, whereas an absent mode stops the setup
from finishing at all.`;

    const EXTRACT_TOOL = {
      name: 'extract_onboarding',
      description: 'Extract structured onboarding fields from the conversation.',
      input_schema: {
        type: 'object' as const,
        properties: {
          mode: { type: 'string', enum: ['something_new', 'already_underway', 'look_back', 'recurring'] },
          initial: { type: 'string' },
          /**
           * STRUCTURED, NOT INFERRED. It used to live only inside the prose for whoInvolved, so the
           * person's own role was read out of a sentence about other people - and the instruction to
           * "ask it early" did not stop it arriving third. A field is a thing the engine either has or
           * does not; an instruction is a request.
           */
          yourRole: { type: 'string', enum: ['a_party', 'setting_up_for_others'] },
          whoInvolved: { type: 'string' },
          /**
           * THE PEOPLE, COUNTABLE. `whoInvolved` is a free string, so ANY string satisfies it -
           * "My team" passed as an answer to who is involved, and the interview went on to ask what
           * is expected of each person with no roster to work from.
           *
           * A separate list, one entry per individual, is the thing that can actually be counted.
           * It is what decides whether the lead is warned, and it is the roster the per-person
           * expectation questions need. Names where given, roles where not. An organisation, a team
           * or a client is NOT an entry - there is already a rule about that in the prompt, and a
           * rule is what "My team" walked past.
           */
          peopleNamed: { type: 'array', items: { type: 'string' } },
          decision: { type: 'string' },
          goals: { type: 'array', items: { type: 'string' } },
          brief: { type: 'string' },
          // GW-017: the cadence used to be decided by a client-side
          // useState('FORTNIGHTLY') that nothing ever updated, so a person who
          // said "90 days, weekly check-ins" got a fortnightly ground - half the
          // sessions they asked for. Their words were recorded correctly in the
          // brief and then dropped on the way to the enum.
          cadence: { type: 'string', enum: ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ONE_TIME'] },
          timelineDays: { type: 'number' },
        },
        /**
         * MODE REQUIRED, AND THIS IS WHY THE SETUP USED TO DEAD-END.
         *
         * Nothing was required, and the prompt above tells the model to omit anything not clearly
         * communicated. `ready` is computed as mode && initial && whoInvolved && decision, so the
         * most inferential of the four decided whether the setup could finish. Driven in the
         * browser on "Setting shared goals": across five turns `initial`, `whoInvolved` and
         * `decision` all populated and `mode` never did once, so `ready` stayed false, the wrap-up
         * card never rendered, and the conversation ended with the assistant saying "next you will
         * add the people involved" above a screen with nothing to click.
         *
         * Required here AND excepted from the omit rule in the prompt, because a schema requirement
         * the instructions contradict is a coin toss.
         */
        required: ['mode'] as string[],
      },
    };

    const allMessages: ChatTurn[] = [...messages, { role: 'assistant', content: reply }];
    let extracted: { mode?: string; initial?: string; whoInvolved?: string; peopleNamed?: string[]; decision?: string; goals?: string[]; brief?: string; cadence?: string; timelineDays?: number; yourRole?: string } = {};
    try {
      const result = await this.anthropic.extract<typeof extracted>(EXTRACT_SYSTEM, allMessages, EXTRACT_TOOL);
      if (result) extracted = result;
    } catch { /* extraction is best-effort */ }

    const ready = onboardingIsReady(extracted);

    /**
     * A LEAD WHO HAS NAMED NOBODY IS LET THROUGH, AND TOLD. Hafsah's call.
     *
     * Blocking would guarantee the roster, and it would also be one more required field somebody
     * fills with a guess to get past it - which is exactly how "My team" became an answer to who is
     * involved. So it is a warning, and they add the people afterwards.
     *
     * Only ever true on the party path. A coordinator is not warned about a roster they were never
     * expected to have.
     */
    const needsPeople = extracted.yourRole === 'a_party' && !extracted.peopleNamed?.length;

    return { reply, extracted, ready, needsPeople };
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
You are receiving a check-in from someone who joined via a shared link. They are a participant, not the person who created this check-in.

Check-in: ${ground.label}
${briefLine}YOUR ROLE: capture this participant's own perspective and put it on record.

STRICT RULES:
- NEVER ask "What is this check-in about for you?" - that is already set.
- NEVER ask who opened it or why the check-in was created.
- Your first message MUST reflect back what they just said before asking anything.
- Ask only about their own view: what they think, what they have seen, what they would want on record.
- When you have a clear account of their perspective, say exactly: "Your record is here." followed by a 2-sentence plain summary of what is now on their record.
- Off-topic or very brief first messages: name that gently and redirect - "This check-in is to get your perspective on ${ground.label}. In a sentence or two, what would you want on record?"

` + buildEntrySystemPrompt(joinScenario, ground.label, PartyType.PARTICIPANT);
        return this.guardedReply(joinPrompt, messages);
      }
    }

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    // Only route to FAQ on the very first user message (conversationStarted guard)
    // and only for short messages - long context blocks from startCheckin are never FAQ questions.
    const conversationStarted = messages.filter(m => m.role === 'user').length > 1;
    if (!conversationStarted && lastUser && lastUser.content.length <= 200 && isLikelyQuestion(lastUser.content)) {
      return this.guardedReply(FAQ_PROMPT, messages);
    }

    const mapped = resolveScenario(scenario);
    return this.guardedReply(buildEntrySystemPrompt(mapped, groundLabel || scenario || ''), messages);
  }


  /**
   * EVERY REPLY THIS FLOW PRODUCES, WITH HER WORD PUT BACK. (W2, and the half I missed)
   *
   * The restore was built and tested and wired into conversation.service, which
   * serves logged-in check-ins. Her walkthrough was /entry - a separate path that
   * calls anthropic.respond directly - so the fix reached everything except the
   * flow she found it in, and "microchipshit" would still have come back as
   * "Microchip Solutions" to the next stranger who typed it.
   *
   * ONE HELPER RATHER THAN THREE CALL SITES. chat() has three exits today (the
   * join-link branch, the FAQ branch, the ordinary one) and the next branch
   * somebody adds would not have the restore on it. Going through here means a new
   * exit is guarded by default and forgetting is the unusual act.
   */
  private async guardedReply(system: string, messages: ChatTurn[]): Promise<string> {
    const reply = await this.anthropic.respond(system, messages);
    const personSaid = messages.filter((m) => m.role === 'user').map((m) => m.content ?? '');
    /*
     * NOTHING INVENTED REACHES A PERSON, on this path as on the check-in. A sentence naming somebody
     * who does not exist is dropped rather than repaired, because there is nothing of theirs to put
     * back - and this is the flow a stranger meets first, where an invented colleague is least
     * explicable and most likely to be the last thing they read here.
     */
    const screened = screen(reply, personSaid);
    if (screened.dropped.length) {
      this.logger.warn(`Dropped ${screened.dropped.length} sentence(s) with an invented name on the entry path.`);
    }
    const restored = screened.text || ASK_AGAIN;

    // The causal upgrade cannot be repaired by substitution - there is no word of
    // theirs to put back, because the causation was invented whole. Logged, as on
    // the other path, rather than edited into prose that reads as a lost thread.
    const invented = causalClaimNobodyMade(restored, personSaid);
    if (invented.length) {
      /* The COUNT, not the claim: the same rule as the check-in path. A log is a place staff can
         read, and the product promises they cannot read somebody's account of their work. */
      this.logger.warn(
        `${invented.length} causal claim(s) nobody made on the entry path. ${ASK_INSTEAD_OF_CONCLUDING}`,
      );
    }

    /* The two the substitution above cannot reach: a name invented whole, which has nothing of
       theirs underneath to put back, and one of their own words quietly shortened. Reported rather
       than edited, on the same reasoning as the check-in path - the point is that the rate stops
       being unknowable. */
    const shortened = truncationsOfTheirWords(restored, personSaid);
    if (shortened.length) {
      this.logger.warn(`Shortened one of their own words on the entry path: ${shortened.join(', ')}.`);
    }
    /**
     * Last, after the word-restoration and the causal check, because both of those reason about
     * what the model actually said. Cleaning the text first would have them inspect a string the
     * model did not produce.
     */
    /**
     * The marker is stripped here, so whether it was there has to travel separately.
     * `lastReplyHadCloseMarker` is read by the controller immediately after this call.
     */
    this.lastReplyHadCloseMarker = hadCloseMarker(restored);
    return forHumans(restored);
  }

  /**
   * DID THE LAST REPLY CARRY THE CLOSE MARKER.
   *
   * The entry controller decided "is this session over" by string-matching phrases in the reply
   * ("your record is here", "your contribution is saved"). It never matched the marker the model is
   * actually instructed to emit - it looks for "[session complete]" with a space, and the marker is
   * "[[SESSION_COMPLETE]]" with an underscore - so the authoritative signal was unused and a
   * rephrased closer silently failed to close anything.
   *
   * Stripping the marker at the boundary made that worse rather than better: the one reliable
   * signal was being removed before the only code that could have used it. So it is captured on the
   * way through. The phrase list stays as a backstop for older replies.
   */
  private lastReplyHadCloseMarker = false;
  didLastReplyClose(): boolean {
    return this.lastReplyHadCloseMarker;
  }

  async report(messages: ChatTurn[], scenario?: string, groundLabel?: string): Promise<EntryReport | null> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');

    const mapped = resolveScenario(scenario);
    const systemPrompt = buildEntrySystemPrompt(mapped, groundLabel || scenario || '');

    // Anthropic requires the conversation to end with a user message
    const trimmed = [...messages];
    while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant') trimmed.pop();
    if (!trimmed.length) throw new BadRequestException('no user messages in history');

    const report = await this.anthropic.extract<EntryReport>(
      ENTRY_REPORT_PROMPT + '\n\n' + systemPrompt,
      trimmed,
      ENTRY_REPORT_SCHEMA,
    );
    if (!report) return report;

    /**
     * W3. THE SPLIT HAPPENS AT THE READ, not in the prompt.
     *
     * Her report offered "Microchip Solutions" and "Mass General" with an
     * "+ Add them" button next to two of her direct reports, and adding a client
     * sends that client an invitation to give their own account of her team's
     * performance. One click, by somebody skimming.
     *
     * Asking the extractor to be careful about this is the version that fails
     * one time in twenty, and one time in twenty is a client receiving an
     * invitation. So the two lists are separated here, where it is arithmetic.
     * Nothing is dropped - everything the extractor found is still on the page.
     */
    const split = splitMentions(report.mentionedPeople ?? []);

    /**
     * W2 REACHES THE REPORT TOO, and this is where she actually read it: her
     * private report said "Microchip Solutions" in the summary, in the two
     * findings, and twice in the people-mentioned list. Restoring the chat reply
     * alone would have left the invented name in the document that gets kept.
     *
     * Walked over every string in the payload rather than a named list of fields,
     * because the report shape has grown four times and the next field added would
     * not be on any list.
     */
    const personSaid = trimmed.filter((m) => m.role === 'user').map((m) => m.content ?? '');
    const restore = (v: any): any => {
      if (typeof v === 'string') return restoreTheirWords(v, personSaid);
      if (Array.isArray(v)) return v.map(restore);
      if (v && typeof v === 'object') {
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) out[k] = restore(val);
        return out;
      }
      return v;
    };

    return restore({
      ...report,
      mentionedPeople: split.couldBeAdded,
      alsoCameUp: split.alsoCameUp,
      alsoCameUpNote: split.note,
    });
  }

  /**
   * Commit an anonymous entry session to a real ground after account creation.
   * Called from MagicVerifyPage once the user has a JWT. Creates the ground,
   * marks session 1 complete with the full transcript, stores the solo report,
   * and fires invite emails for any contributors the admin queued.
   */
  /**
   * What this person actually is, for the rule that decides whether they may open a check-in.
   *
   * MEMBER when the row has gone, which is the safe direction: `mayOpen` refuses a member in an
   * organisation that limits opening to its leads, and a missing user should never be treated as
   * the most powerful thing on the account.
   */
  private async roleOf(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return u?.role ?? 'MEMBER';
  }

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
      /** Documents attached during the anonymous chat, kept as real records. */
      documents?: { fileName: string; content: string; mimeType?: string }[];
      report?: EntryReport | null;
      contributors: { email: string; context?: string; inviteToken?: string; note?: string }[];
    },
  ): Promise<{ groundId: string; joinToken: string | null; contributors: { email: string; devUrl?: string }[]; failedInvites: string[]; whyInvitesFailed?: { email: string; because: string }[] }> {
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
  ): Promise<{ groundId: string; joinToken: string | null; contributors: { email: string; devUrl?: string }[]; failedInvites: string[]; whyInvitesFailed?: { email: string; because: string }[] }> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const d = await this.prisma.entryDraft.findUnique({ where: { userId } });
      if (d?.groundId) {
        const ground = await this.prisma.ground.findUnique({
          where: { id: d.groundId },
          select: {
            id: true,
            joinToken: true,
            /**
             * WHO WAS ACTUALLY INVITED, RATHER THAN AN ASSERTION THAT NOBODY WAS.
             *
             * This path returned `contributors: []` flat, and the verify page reads
             * that field to decide whether to show "Invited (N)". So whenever the
             * commit ran twice - a retried request, a remount, a double-submit - the
             * second call won the response, reported no contributors and no
             * failures, and the person was told nothing about the invites the FIRST
             * call had already sent. The emails went out and the confirmation said
             * they had not.
             *
             * An empty list here was never a fact; it was this path not looking. So
             * it looks: the participants on the ground are what happened, whichever
             * call created them.
             */
            participants: {
              // Somebody who was sent an invite, and not the person reading this
              // page. The initiator is created as the first party with no
              // invitedAt, so the date filter alone would already exclude them -
              // but resting the count on that is an invisible coupling to how
              // grounds.create happens to build the initiator row, and the number
              // shown to a person should not depend on it.
              where: { invitedAt: { not: null }, partyType: { not: PartyType.INITIATOR } },
              select: { email: true },
            },
          },
        });
        if (ground) {
          return {
            groundId: ground.id,
            joinToken: ground.joinToken ?? null,
            /**
             * `?? []` because this runs on the screen a person sees after a
             * double-submit, and a missing relation must degrade to "we cannot show
             * the invites" rather than throw. Prisma always returns the relation for
             * this select, so the fallback is unreachable in production - it fired
             * immediately against two existing tests whose mocks return a ground
             * with no participants, which is exactly the shape a crash here would
             * take: a TypeError on the success page, after the commit succeeded.
             */
            contributors: (ground.participants ?? []).map((p) => ({ email: p.email })),
            // Not knowable from here: a failure belongs to the call that tried to
            // send. Staying empty rather than guessing, which would invent a
            // failure the person cannot act on.
            failedInvites: [],
          };
        }
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
  ): Promise<{ groundId: string; joinToken: string | null; contributors: { email: string; devUrl?: string }[]; failedInvites: string[]; whyInvitesFailed?: { email: string; because: string }[] }> {
    // Nothing usable from either source: the old client silently skipped this
    // case and stranded the user on /setup. Fail EXPLICITLY so the client can
    // show "we couldn't find your session on this device".
    if ((!dto.history || dto.history.length === 0) && !dto.lead) {
      throw new BadRequestException('NO_ENTRY_SESSION');
    }

    /*
     * MAY THIS PERSON OPEN A CHECK-IN HERE AT ALL.
     *
     * Asked once, at the top, because this method has two ways out - one that opens a check-in for
     * the person themselves and one that hands it to a lead - and both create a check-in in an
     * organisation that may have said who is allowed to.
     *
     * `POST /entry/commit` is authenticated, and anybody signed in can walk the entry chat: an
     * admin, a lead, or somebody who takes part in other people's check-ins. Without this, the
     * entry chat was the way round the setting - refused at the create page, allowed here.
     *
     * A BRAND NEW SIGN-UP IS UNAFFECTED. They are the admin of the organisation just made for them,
     * and an admin is subject to neither setting.
     */
    const role = await this.roleOf(initiatorId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whoMayOpenCheckIns: true, checkInsNeedApproval: true },
    });
    const answer = mayOpen({ role }, {
      whoMayOpen: (org?.whoMayOpenCheckIns as 'NAMED_LEADS' | 'EVERYONE') ?? HOW_A_NEW_ORG_WORKS.whoMayOpen,
      needsApproval: org?.checkInsNeedApproval ?? HOW_A_NEW_ORG_WORKS.needsApproval,
    });
    if (!answer.may) throw new ForbiddenException(answer.because);

    const label = (dto.groundLabel ?? '').trim() || 'My first ground';
    const scenario = resolveScenario(dto.scenario);

    if (dto.contributors.length > 20) {
      throw new BadRequestException('Contributor count exceeds the limit of 20 per check-in. Split into multiple check-ins if needed.');
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
      ONE_TIME: Cadence.ONE_TIME,
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
        /**
         * WAS HARDCODED STARTING, at both creation paths in this file.
         *
         * So every ground opened from the public entry believed it was beginning, whatever the person
         * had just described. "Your biggest client left on Tuesday" and "the project is eight weeks
         * late" both arrived as start-of-something grounds, and nothing ever corrected the value -
         * `moment` is write-once.
         *
         * The scenario has just been classified from what they actually said, so it is the best
         * available answer, and it is a recommendation the lead can change afterwards.
         */
        moment: RECOMMENDED_MOMENT[scenario],
        cadence: (dto.cadence && cadenceMap[dto.cadence]) ? cadenceMap[dto.cadence] : Cadence.FORTNIGHTLY,
        cadenceAnchorDay: dto.cadenceAnchorDay ?? undefined,
        // Mirrors the self path a few lines below (dto.checkInBy/lastCheckInBy
        // -> startsAt/endsAt) - the admin's chosen dates were previously
        // collected on the client and silently dropped here; the lead ended
        // up with no availableFrom gate and no endsAt no matter what the
        // admin picked.
        startsAt: dto.checkInBy || undefined,
        endsAt: dto.lastCheckInBy || undefined,
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
    /**
     * THE ENTRY FLOW IS ITS OWN APPROVAL. W9-7.
     *
     * `create` holds a ground for an admin to accept when the caller is not one, and
     * fails closed when no role is passed - which is right, and it broke this. The
     * person coming out of the entry chat IS the admin of the organisation that was
     * created for them a moment ago: there is nobody else to approve it, and holding
     * it would leave them staring at a ground that never starts.
     *
     * Found by the persona suite going red on "Invited (2)" - the invites were being
     * refused by the pending gate, so both contributors were dropped. Nothing about
     * that failure named the approval; it looked like the vanish bug.
     */
    const ground = await this.grounds.create(organizationId, initiatorId, {
      label,
      scenario,
      /**
         * WAS HARDCODED STARTING, at both creation paths in this file.
         *
         * So every ground opened from the public entry believed it was beginning, whatever the person
         * had just described. "Your biggest client left on Tuesday" and "the project is eight weeks
         * late" both arrived as start-of-something grounds, and nothing ever corrected the value -
         * `moment` is write-once.
         *
         * The scenario has just been classified from what they actually said, so it is the best
         * available answer, and it is a recommendation the lead can change afterwards.
         */
        moment: RECOMMENDED_MOMENT[scenario],
      cadence: (dto.cadence && cadenceMap[dto.cadence]) ? cadenceMap[dto.cadence] : Cadence.FORTNIGHTLY,
      cadenceAnchorDay: dto.cadenceAnchorDay ?? undefined,
      startsAt: dto.checkInBy || undefined,
      endsAt: dto.lastCheckInBy || undefined,
      brief,
      freeParticipantCap: isBroadcast ? 100 : DEFAULT_FREE_MEMBER_LIMIT,
      /*
       * THEIR ACTUAL ROLE, NOT 'ADMIN'.
       *
       * This was hardcoded on the argument that the entry flow's creator is the admin of the org
       * just created for them - true for a brand new sign-up, and false for everybody else who
       * reaches this. `POST /entry/commit` is authenticated, so anybody already signed in walks the
       * same path: a member refused at the create page could open the entry chat, click "Save
       * this", and get a check-in that skipped both the permission and the approval.
       *
       * Reading the role costs one query and makes the rule the same rule everywhere. A brand new
       * sign-up is genuinely an ADMIN, so nothing about that case changes.
       */
    }, role);

    // Find the session 1 check-in and the initiator participant just created.
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId: ground.id, userId: initiatorId },
    });
    if (!participant) throw new BadRequestException('Participant not found after creating a check-in');

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

    /*
     * A ground made through the entry chat can be a round of one - the person who created it is
     * often the only party at this point - and a round of one closes the moment they finish. This
     * path writes COMPLETED directly rather than going through the conversation's completion, so
     * without this call the very first round of the flow most people meet would never be recorded
     * as closed.
     */
    await recordRoundCompletion(this.prisma, this.events, checkIn.groundId, checkIn.sessionNumber);

    /**
     * KEEP THE DOCUMENTS THE PERSON ATTACHED.
     *
     * The entry chat's "+ Doc" control folded a document into the transcript as
     * text and created no record of it, so evidence attached in the flow most
     * people meet first was not evidence as far as the product was concerned: no
     * entry in Documents, no visibility, no assessment, and it never counted
     * toward the document-backed share of the record that the report measures and
     * shows to both parties.
     */
    for (const doc of dto.documents ?? []) {
      await this.prisma.groundDocument
        .create({
          data: {
            groundId: ground.id,
            participantId: participant.id,
            fileName: doc.fileName,
            mimeType: doc.mimeType ?? 'text/plain',
            content: doc.content,
          },
        })
        .catch((e) => this.logger.error(`entry commit: could not keep document "${doc.fileName}": ${e?.message ?? e}`));
    }

    /**
     * AND SCHEDULE SESSION 2.
     *
     * Sessions after the first come from `ensureNextSession`, which runs when a
     * check-in COMPLETES through the conversation service. This path completes one
     * with a direct `update`, so it never fired: a ground made through the entry
     * chat had exactly one check-in and nothing scheduled a second. The ground page
     * offers "Session N is ready for you" only when an open check-in exists, so it
     * never appeared, and it read as a missing button rather than a missing session.
     *
     * Best-effort: a ground that exists with a saved record is worth more than one
     * that fails to commit because the follow-up could not be scheduled. ONE_TIME
     * correctly schedules nothing.
     */
    await this.conversation
      .ensureNextSession(ground.id, participant.id, 1)
      .catch((e) => this.logger.error(`entry commit: could not schedule session 2 for ground ${ground.id}: ${e?.message ?? e}`));

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
    /*
     * WHY EACH ONE FAILED, NOT JUST THAT IT DID.
     *
     * The screen said "these addresses were not reached, you can resend from your check-in page",
     * which is right for a bounced email and wrong for the commonest cause by far: the free plan
     * covers five people including the person setting it up, so an admin who names five colleagues
     * in the entry chat loses one and never learns why. Resending will not fix a seat limit, and
     * being told to try again at something that cannot work is worse than being told the limit.
     *
     * `addParticipant` already answers with a sentence written for a person. It was being reduced
     * to an email address one line after it arrived.
     */
    const whyInvitesFailed: { email: string; because: string }[] = [];
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
        whyInvitesFailed.push({ email: c.email, because: err?.message ?? 'The invite did not send.' });
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
    return { groundId: ground.id, joinToken, contributors: inviteResults, failedInvites, whyInvitesFailed };
  }

  /** Pre-auth draft update, authorized by the bearer draftToken (same pattern
   * as invite tokens). The entry page calls this for edits made AFTER the
   * email was sent - org name, ground name, cadence, dates, contributors -
   * which previously lived only in localStorage and were lost cross-browser. */
  async patchDraft(draftToken: string, payload: Record<string, any>): Promise<{ ok: true }> {
    if (!draftToken || typeof draftToken !== 'string') throw new BadRequestException('draftToken required');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('payload must be an object');
    if (JSON.stringify(payload).length > 200_000) throw new BadRequestException('payload too large');

    /**
     * The draft may still be a PENDING SIGNUP, with no user behind it yet.
     *
     * Post-email edits arrive through here - the organisation name is the main
     * one - and they used to land on an EntryDraft that `entrySave` had already
     * created. Since GW-001, a brand-new address creates nothing until the
     * verification link is opened, so between pressing save and opening the mail
     * the only thing holding the session is `pendingSignup`. Without this branch
     * every such edit 404s, and the org name the person typed is silently lost
     * at commit.
     */
    const pending = await this.prisma.pendingSignup.findUnique({ where: { draftToken } });
    if (pending) {
      const mergedPending = { ...((pending.payload ?? {}) as Record<string, any>), ...payload };
      const typedOrgName = typeof payload.orgName === 'string' ? payload.orgName.trim().slice(0, 120) : undefined;
      await this.prisma.pendingSignup.update({
        where: { id: pending.id },
        data: {
          payload: mergedPending as any,
          // Kept as a column too, because verifyEmail names the organisation
          // from it before any draft is read.
          ...(typedOrgName ? { orgName: typedOrgName } : {}),
        },
      });
      return { ok: true };
    }

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

  /*
   * JOIN-COMMIT IS GONE, AND THIS NOTE IS WHY.
   *
   * It took a join token and an arbitrary email address, found that person's
   * existing account with no organisation scope and no proof the caller owned
   * the address, and returned a signed session as them. A join link is a
   * broadcast credential — it exists to be handed to a cohort — so everybody who
   * received one could sign in as anybody whose address they could guess.
   *
   * Nothing called it. `entryApi.commit` is the live path; this was its join-flow
   * twin, and the orphan list had already asked somebody to confirm it was dead
   * before deleting it. It was. `joinAccept` below had the same hole and is
   * fixed rather than deleted, because the join page does use it.
   */

  /**
   * ASKING TO JOIN. NOTHING IS CREATED AND NOTHING IS SIGNED.
   *
   * This used to take a join token and an arbitrary email address and hand back a
   * session as whoever that address belonged to. See
   * `a-join-link-is-not-a-password.ts` for why that was the worst thing in the
   * product and why the fix is not softer for an address nobody has seen before.
   *
   * All that happens here is a row and an email. The link does the work.
   */
  async askToJoin(dto: {
    joinToken: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roleAsDescribed?: string;
  }): Promise<WhatWeSay> {
    if (!dto.joinToken?.trim()) throw new BadRequestException('A join link is required.');
    if (!dto.email?.trim()) throw new BadRequestException('An email is required to join.');

    const ground = await this.prisma.ground.findUnique({
      where: { joinToken: dto.joinToken },
      select: { id: true },
    });
    if (!ground) throw new NotFoundException('Join link not found or has expired');

    const email = dto.email.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString('hex');

    /* One live ask per address per link. Somebody who presses the button twice
       gets one link that works rather than two that race, and the older row
       cannot be used to arrive twice. */
    await this.prisma.pendingJoin.updateMany({
      where: { joinToken: dto.joinToken, email, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.pendingJoin.create({
      data: {
        joinToken: dto.joinToken,
        email,
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        roleAsDescribed: dto.roleAsDescribed?.trim() || null,
        token,
        expiresAt: new Date(Date.now() + A_JOIN_LINK_LASTS_HOURS * 60 * 60 * 1000),
      },
    });

    /* Sent, not awaited into the response: whether the mail provider is having a
       moment must not tell the caller whether that address exists here. */
    this.email
      .sendJoinConfirmation(email, token)
      .catch((err) => this.logger.error(`join confirmation to ${email} failed: ${err?.message}`));

    this.logger.log(`join-ask: link sent for ground ${ground.id}`);
    return whatToSayAfterAsking(email);
  }

  /**
   * THE ADDRESS ANSWERED, SO NOW THE WORK HAPPENS.
   *
   * Everything the old `joinAccept` did, moved behind proof of the address: the
   * account, the participant, the session-1 check-in, and the session itself.
   *
   * The account is created `isEmailVerified: true` — unlike before — because
   * opening this link IS the proof. A row that says unverified after somebody has
   * proved it is a lie that some later check will believe.
   */
  async joinConfirm(token: string): Promise<{ groundId: string; checkInId: string; accessToken: string; userId: string; existingAccount: boolean }> {
    if (!token?.trim()) throw new BadRequestException(whyThisDidNotWork('that link is not one we know'));

    const pending = await this.prisma.pendingJoin.findUnique({ where: { token } });
    if (!pending) throw new NotFoundException(whyThisDidNotWork('that link is not one we know'));
    if (pending.usedAt) throw new BadRequestException(whyThisDidNotWork('that link has already been used'));
    if (pending.expiresAt < new Date()) throw new BadRequestException(whyThisDidNotWork('that link has expired'));

    const ground = await this.prisma.ground.findUnique({
      where: { joinToken: pending.joinToken },
      select: { id: true, organizationId: true },
    });
    if (!ground) throw new NotFoundException('Join link not found or has expired');

    const email = pending.email;
    const firstName = pending.firstName ?? '';
    const lastName = pending.lastName ?? '';

    let user = await this.prisma.user.findUnique({ where: { email } });
    const existingAccount = !!user;
    if (user && isASecondOrganisation(user.organizationId, ground.organizationId)) {
      /* Somebody with an account elsewhere, joining a check-in here. Without this the organisation
         never appears in their switcher and every org-scoped read returns nothing, because their
         token still carries their home organisation — the third of the three paths that skipped it.
         GUEST, never the role they hold at home. */
      await this.prisma.organizationMembership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: ground.organizationId } },
        create: { userId: user.id, organizationId: ground.organizationId, role: GUEST_ROLE },
        /* Nothing on a second one: a role somebody was given here is theirs to keep. */
        update: {},
      });
    }
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          organizationId: ground.organizationId,
          email,
          firstName,
          lastName,
          role: 'MEMBER',
          /* Proved by construction: this only runs because the link opened. */
          isEmailVerified: true,
          passwordHash: null,
        },
      });
      const setupToken = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, token: setupToken, type: TokenType.PASSWORD_SETUP, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      });
      this.email.sendAddPasswordEmail(email, user.firstName, setupToken).catch(() => null);
    }

    let participant = await this.prisma.groundParticipant.findUnique({
      where: { groundId_email: { groundId: ground.id, email } },
    });
    if (!participant) {
      participant = await this.prisma.groundParticipant.create({
        data: {
          groundId: ground.id,
          email,
          userId: user.id,
          partyType: PartyType.PARTICIPANT,
          roleAsDescribed: pending.roleAsDescribed ?? null,
          invitedAt: new Date(),
          notifiedAt: new Date(),
        },
      });
    } else if (!participant.userId) {
      participant = await this.prisma.groundParticipant.update({ where: { id: participant.id }, data: { userId: user.id } });
    }

    let checkIn = await this.prisma.checkIn.findFirst({
      where: { participantId: participant.id, status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] } },
      orderBy: { sessionNumber: 'asc' },
    });
    if (!checkIn) {
      checkIn = await this.prisma.checkIn.create({
        data: { groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
      });
    }

    /* Marked used only now. A failure anywhere above leaves the link usable, which
       is the right way round: a wasted link is an annoyance, a half-made join is a
       person who cannot get in and cannot ask again. */
    await this.prisma.pendingJoin.update({ where: { id: pending.id }, data: { usedAt: new Date() } });

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, organizationId: user.organizationId, role: user.role });
    this.logger.log(`join-confirm: ${email} joined ground ${ground.id} -> check-in ${checkIn.id} (new user: ${!existingAccount})`);
    return { groundId: ground.id, checkInId: checkIn.id, accessToken, userId: user.id, existingAccount };
  }
}
