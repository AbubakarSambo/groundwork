import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { endStatesFor } from '../resolution/end-states';
import { PromptsService } from '../prompts';
import { AnthropicService, ChatTurn, houseStyle } from './anthropic.service';
import { ConversationContextService } from './context.service';
import { buildIntakeBlock, RECORD_EXTRACTION_PROMPT } from './prompt-library';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { DocumentsService } from '../documents/documents.service';
import { BillingService } from '../billing/billing.service';
import { EmailService } from '../email/email.service';
import { UsageService } from '../usage/usage.service';
import { CheckInStatus, TurnRole, RecordEntryType, Cadence, GroundStatus, UsageEventType, PartyType } from '@prisma/client';
import { runIntake } from './intake';

function mapSpecificityLevel(avgScore: number): string {
  if (avgScore >= 0.6) return 'specific';
  if (avgScore >= 0.35) return 'directional';
  if (avgScore >= 0.15) return 'vague';
  return 'managed';
}

function mapRecallConfidence(avgScore: number): string {
  if (avgScore >= 0.5) return 'certain';
  if (avgScore >= 0.25) return 'mostly_certain';
  return 'uncertain';
}

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
      summary: { type: 'string', description: "Plain-language summary of what this person put on the record, in their own framing. No verdict, no inference about anyone else." },
      whatToCarry: { type: 'string', description: 'One specific, forward-looking thing for them to carry into the conversation or watch for next. Not a judgement.' },
    },
    required: ['summary'],
  },
};

const SOLO_ARTIFACT_PROMPT = `You are Groundwork. You are given ONE person's own record entries (their words). Produce a short artifact for them alone - they have not heard from anyone else and may never. Do not infer the other side. Do not produce a verdict or analysis of any person. Open with the exact phrase "Your private record shows:" then summarise what they put on the record in their own framing. Name one specific thing to carry forward. Warm, specific, brief - under 200 words total.`;

/**
 * The conversation engine. Drives a single party's check-in.
 *
 * HARD RULE (architectural): a party's transcript and record are NEVER loaded
 * into the other party's context. Every method here is scoped to one
 * participantId and must not join across parties. The only thing that crosses
 * is the synthesised report (see ReportsService), which is a new document.
 */
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
  ) {}

  /** Returns the transcript for a check-in - owner-scoped only. */
  async getTranscript(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'asc' },
    });
    const ground = await this.prisma.ground.findUnique({
      where: { id: checkIn.groundId },
      select: { label: true, scenario: true },
    });
    // hasIntake: true when the participant has submitted the cofounder pre-check-in intake.
    const hasIntake = !!checkIn.participant.foundingIntent;
    return {
      checkIn: {
        ...checkIn,
        groundLabel: ground?.label ?? null,
        scenario: ground?.scenario ?? null,
        hasIntake,
      },
      turns,
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
   * date only. The paywall sits solely between REPORT_READY and ACTIVE
   * (GroundsService.activate): the report is the conversion moment, not the session.
   */
  async open(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
    }

    const ground = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId }, select: { status: true, organizationId: true } });
    const OPEN_STATUSES: GroundStatus[] = [GroundStatus.OPEN, GroundStatus.AWAITING_PARTIES, GroundStatus.ACTIVE, GroundStatus.REPORT_READY];
    if (ground && !OPEN_STATUSES.includes(ground.status)) {
      throw new BadRequestException('This ground is no longer accepting check-ins');
    }

    // ISSUE 7: use a single findFirst on the AI turn as the idempotency guard.
    // This collapses the count + separate findFirst into one query and closes the
    // TOCTOU window: if any AI turn exists (written by a concurrent open()), return
    // it immediately without calling Gemini again.
    const existingAiTurn = await this.prisma.conversationTurn.findFirst({
      where: { checkInId: checkIn.id, role: TurnRole.AI },
      orderBy: { createdAt: 'asc' },
    });
    if (existingAiTurn) {
      return { reply: existingAiTurn.content, groundId: checkIn.groundId };
    }

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
          throw new ForbiddenException({ message: gate.reason, freeExtensionAvailable: gate.freeExtensionAvailable ?? false });
        }
        // Metering runs ONLY for metered grounds. gate.sessionsBalance === -1
        // signals unlimited (free-tier or active subscription) - those grounds are
        // never decremented and never hit the balance throw below. This is the
        // second gate: without this guard, a free-tier or subscribed ground whose
        // balance had already reached 0 (e.g. a returning session 2) would throw
        // "No sessions remaining" here even though canStartSession allowed it.
        if (gate.sessionsBalance !== -1) {
          // Atomic check-and-decrement: only succeeds when balance is still > 0,
          // preventing two concurrent requests from both passing canStartSession and
          // both decrementing into negative territory.
          const decremented = await this.prisma.ground.updateMany({
            where: { id: checkIn.groundId, sessionsBalance: { gt: 0 } },
            data: { sessionsBalance: { decrement: 1 } },
          });
          if (decremented.count === 0) {
            throw new ForbiddenException('No sessions remaining. Add a session for $5 to continue.');
          }
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
    const beginMessage = (checkIn as any).isFinal
      ? '<<BEGIN_CHECK_IN>> The person has just arrived for their CLOSING session. Open by telling them plainly, in your first sentence, that this is their closing check-in - the last word on their record, worth documenting thoroughly - and then continue per your runtime context.'
      : '<<BEGIN_CHECK_IN>> The person has just arrived. Open the check-in now per your runtime context - deliver the moment opening; do not wait for them to speak first.';
    const reply = await this.anthropic.respond(fullSystem, [
      { role: 'user', content: beginMessage },
    ]);

    const aiTurn = await this.prisma.conversationTurn.create({ data: { checkInId: checkIn.id, role: TurnRole.AI, content: reply } });
    await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.IN_PROGRESS, startedAt: new Date() } });
    return { reply: aiTurn.content, groundId: checkIn.groundId };
  }

  /**
   * Send a person's message and get the AI's next turn. Scoped to this party -
   * the other party's turns are never loaded into context.
   */
  async sendMessage(checkInId: string, requestingUserId: string, message: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
    }

    const personTurnCount = await this.prisma.conversationTurn.count({
      where: { checkInId: checkIn.id, role: TurnRole.PERSON },
    });
    if (personTurnCount >= 20) {
      throw new BadRequestException('Session turn limit reached. Please complete your session.');
    }

    const fullSystem = await this.composeSystemPrompt(checkIn, message);

    // Persist the person's turn.
    const personTurn = await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.PERSON, content: message },
    });

    // Rebuild history (this party only) and ask the engine for the next turn.
    // ISSUE 5: if the AI call fails, delete the orphan PERSON turn then re-throw.
    let reply: string;
    let aiTurn: { id: string; content: string };
    try {
      const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id }, orderBy: { createdAt: 'asc' } });
      const history: ChatTurn[] = turns.map((t) => ({ role: t.role === TurnRole.AI ? 'assistant' : 'user', content: t.content }));
      reply = await this.anthropic.respond(fullSystem, history);
      aiTurn = await this.prisma.conversationTurn.create({
        data: { checkInId: checkIn.id, role: TurnRole.AI, content: reply },
      });
    } catch (err) {
      await this.prisma.conversationTurn.delete({ where: { id: personTurn.id } }).catch(() => undefined);
      throw err;
    }

    if (checkIn.status === CheckInStatus.NOT_STARTED) {
      await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.IN_PROGRESS, startedAt: new Date() } });
    }

    // Signal the frontend that the AI has delivered the session-closing elements
    // so the "Complete session" button can appear. Detected by the mandatory
    // SESSION CLOSE phrase defined in ENGINE_RULES.
    // ISSUE 22: message-count auto-complete removed - only the AI's explicit signal triggers completion.
    // ISSUE 23: all checks are case-insensitive via replyLower; alternative phrases added for resilience.
    const sessionComplete = this.detectSessionComplete(reply);

    return { reply: aiTurn.content, sessionComplete };
  }

  /** Whether the AI reply contains the mandatory session-closing phrasing. */
  private detectSessionComplete(reply: string): boolean {
    const replyLower = reply.toLowerCase();
    return (
      replyLower.includes('here is what is now in your record') ||
      replyLower.includes('what is in your record from today') ||
      replyLower.includes('in your record from today') ||
      replyLower.includes('your account is now on record') ||
      replyLower.includes('your record from this session') ||
      (replyLower.includes('now in your record') && replyLower.includes('next steps')) ||
      (replyLower.includes('now in your record') && replyLower.includes('carry forward')) ||
      (replyLower.includes('now in your record') && (replyLower.includes('next step') || replyLower.includes('come back when'))) ||
      (replyLower.includes('your record now') && replyLower.includes('session'))
    );
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
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
    }
    const personTurnCount = await this.prisma.conversationTurn.count({
      where: { checkInId: checkIn.id, role: TurnRole.PERSON },
    });
    if (personTurnCount >= 20) {
      throw new BadRequestException('Session turn limit reached. Please complete your session.');
    }

    const fullSystem = await this.composeSystemPrompt(checkIn, message);
    const personTurn = await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.PERSON, content: message },
    });

    let raw = '';
    try {
      const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id }, orderBy: { createdAt: 'asc' } });
      const history: ChatTurn[] = turns.map((t) => ({ role: t.role === TurnRole.AI ? 'assistant' : 'user', content: t.content }));
      for await (const delta of this.anthropic.respondStream(fullSystem, history)) {
        raw += delta;
        yield { type: 'delta', text: delta };
      }
      const reply = houseStyle(raw.trim());
      if (!reply) throw new Error('AI returned an empty response');
      await this.prisma.conversationTurn.create({ data: { checkInId: checkIn.id, role: TurnRole.AI, content: reply } });
      if (checkIn.status === CheckInStatus.NOT_STARTED) {
        await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.IN_PROGRESS, startedAt: new Date() } });
      }
      yield { type: 'done', reply, sessionComplete: this.detectSessionComplete(reply) };
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
      participant: { partyType: any; roleAsDescribed: string | null };
    },
    latestMessage?: string,
  ): Promise<string> {
    const ground = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId } });
    if (!ground) throw new NotFoundException('Ground not found');

    const systemPrompt = await this.prompts.getActiveContent('system');

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
    const scenarioPackOverride =
      checkIn.sessionNumber === 1
        ? await this.prompts
            .getActiveContent(`scenario.${ground.scenario.toLowerCase()}.${checkIn.participant.partyType.toLowerCase()}`)
            // null (not '') on failure - buildActivePathway's `??` only falls
            // through to the in-code pack on null/undefined, so resolving to
            // '' here would silently defeat that fallback whenever no active
            // DB version exists for this scenario+party.
            .catch(() => null)
        : null;

    const intakeBlock = buildIntakeBlock({
      scenario: ground.scenario,
      partyType: checkIn.participant.partyType,
      sessionNumber: checkIn.sessionNumber,
      roleAsDescribed: checkIn.participant.roleAsDescribed,
      otherPartyCheckedIn,
      groundLabel: ground.label,
      // Pre-existing gap, found while proving this fix: resolutionState was
      // never wired into the intake context at all, so RESOLUTION_STATE in
      // the prompt was always "not yet defined" regardless of what the
      // initiator actually set at ground creation.
      resolutionState: (ground as any).resolutionState ?? null,
      adminBrief: (ground as any).brief ?? null,
      priorContext: checkIn.participant.roleAsDescribed ?? null,
      priorSession,
      lowSpecificityMultiDim,
      groundState,
      leadSignals,
      scenarioPackOverride,
    });

    // Returning user protocol: for session 2+, inject the most important unresolved
    // item from the prior session so the AI opens with it specifically.
    let returningUserContext = '';
    if (checkIn.sessionNumber >= 2) {
      returningUserContext = await this.buildReturningUserContext(checkIn.participantId, checkIn.sessionNumber);
    }

    const [{ block: dynamicContext }, uploadedDocs, personTurnCount] = await Promise.all([
      this.context.build({
        groundId: checkIn.groundId,
        participantId: checkIn.participantId,
        sessionNumber: checkIn.sessionNumber,
        latestMessage,
        checkInId: checkIn.id,
      }),
      this.prisma.groundDocument.findMany({
        where: { groundId: checkIn.groundId, participantId: checkIn.participantId },
        select: { fileName: true, content: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.conversationTurn.count({ where: { checkInId: checkIn.id, role: TurnRole.PERSON } }),
    ]);

    const docContext = uploadedDocs.length
      ? 'SUPPORTING DOCUMENTS (uploaded by this party before the session):\n\n' +
        uploadedDocs.map((d) => `--- ${d.fileName} ---\n${d.content}`).join('\n\n')
      : '';

    const docPromptHint =
      personTurnCount >= 2 && uploadedDocs.length === 0
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
      finalSessionContext = `FINAL SESSION - this is the CLOSING check-in for this ground. OPEN THE SESSION by saying so, plainly, in your first message - before anything else: this is their closing check-in, the last word on the record, and what they document here is what the final report weighs, so it is worth being thorough. This overrides any other opener instruction (including the returning-user opener); weave the usual continuity in AFTER naming the closing. Same conversation as always - no new format.

Work through, woven naturally into the conversation, not as a checklist:
1. FINAL STATE vs THE TARGET. The target on record:
${target ?? 'No pre-agreed target - ask the person what success was supposed to look like when this started, then measure their account against their own answer.'}
Ask where things actually landed against that, in their words.
2. DELIVERED vs AGREED. For each thing they say was delivered: what exists, and what shows it? Ask for the artifact. If something is described but not evidenced, say plainly that a document would carry more weight than memory, and invite an upload.
3. WHAT REMAINS OPEN. Unfinished items, handovers, loose ends - get them named, not smoothed over.
4. THE REVISION DOOR. Ask once, near the end: is there anything in their earlier record they would correct before the ground closes? If yes, take the correction now.

The ground will close toward one of these end states: ${endStates || 'the parties will define the end state'}. Do NOT push them to pick one - that choice happens in the resolution step with the other party. Your job is the honest account it will rest on.`;
    }

    return [systemPrompt, intakeBlock, clarificationContext, selfCorrectionContext, finalSessionContext, returningUserContext, dynamicContext, docContext, docPromptHint].filter(Boolean).join('\n\n');
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
  async complete(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
    }

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
    const minTurns = checkIn.isSelfCorrection ? 1 : 3;
    if (personTurnRows.length < minTurns) {
      throw new BadRequestException(
        'A few more exchanges are needed before this check-in can close - the record is still thin. Answer one or two more questions, then complete.',
      );
    }
    const totalPersonChars = personTurnRows.reduce((sum, t) => sum + (t.content?.trim().length ?? 0), 0);
    // roughly two real sentences total for a normal session; a single specific
    // sentence is enough to anchor a correction.
    const MIN_SUBSTANTIVE_CHARS = checkIn.isSelfCorrection ? 40 : 120;
    if (totalPersonChars < MIN_SUBSTANTIVE_CHARS) {
      throw new BadRequestException(
        'These answers are pretty short - the record needs a bit more detail before this check-in can close. Add specifics (names, numbers, what actually happened), then complete.',
      );
    }

    // Score session specificity from person's turns before marking complete
    const specificityData = await this.scoreSessionSpecificity(checkIn.id).catch(() => null);

    // ISSUE 6: extractRecordEntries runs BEFORE the status flips to COMPLETED so
    // the record is populated before the status change races past it. buildSoloArtifact
    // is still fire-and-forget. Both are best-effort.
    await this.extractRecordEntries(checkIn.id, checkIn.participantId).catch((err) =>
      this.logger.error(`Record extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );

    await this.prisma.checkIn.update({
      where: { id: checkIn.id },
      data: {
        status: CheckInStatus.COMPLETED,
        completedAt: new Date(),
        specificityLevel: specificityData?.level ?? null,
        recallConfidence: specificityData?.recallConfidence ?? null,
        specificityDimensions: specificityData?.dimensions ?? undefined,
      },
    });
    this.usage.emit(UsageEventType.CHECK_IN_COMPLETED, { groundId: checkIn.groundId, participantId: checkIn.participantId }).catch(() => undefined);

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
    } satisfies CheckInCompletedEvent);

    return { status: 'completed', groundId: checkIn.groundId };
  }

  /**
   * Create the next session for a participant if it does not already exist.
   * Sets availableFrom based on the ground's cadence so session 2 respects
   * the fortnightly / weekly / monthly schedule.
   */
  private async ensureNextSession(groundId: string, participantId: string, sessionNumber: number) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { cadence: true, cadenceAnchorDay: true, endsAt: true },
    });
    const cadence = ground?.cadence ?? Cadence.FORTNIGHTLY;

    // The completer's own next session. For SEQUENTIAL there is no clock: their
    // next round is not auto-scheduled (availableFrom stays null until triggered).
    const ownAvailableFrom =
      cadence === Cadence.SEQUENTIAL ? null : this.cadenceToDate(cadence, ground?.cadenceAnchorDay ?? null);
    // Respect the end date: do not schedule a next session past it.
    const pastEnd = ground?.endsAt && ownAvailableFrom && ownAvailableFrom > ground.endsAt;
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
    // explicit "Begin the closing round".)
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { timelineDays: true, cadence: true },
    });
    const cadenceDays: Record<string, number> = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30, ONE_TIME: 0, SEQUENTIAL: 0 };
    const step = cadenceDays[ground?.cadence ?? ''] ?? 0;
    const planned = step > 0 && ground ? Math.max(1, Math.floor(ground.timelineDays / step)) : null;
    const isFinal = planned != null && sessionNumber >= planned;
    await this.prisma.checkIn.create({ data: { groundId, participantId, sessionNumber, status: CheckInStatus.NOT_STARTED, availableFrom, isFinal } });
  }

  /**
   * Convert a cadence enum to the next available date from now.
   * anchorDay: weekly/fortnightly = weekday (0=Sun..6=Sat); monthly = day of month (1-31).
   */
  private cadenceToDate(cadence: Cadence, anchorDay: number | null = null): Date {
    const d = new Date();
    if (cadence === Cadence.DAILY) {
      d.setDate(d.getDate() + 1);
      return d;
    }
    if (cadence === Cadence.MONTHLY) {
      // Next month; if a day-of-month anchor is set, land on it (clamped to month length).
      d.setMonth(d.getMonth() + 1);
      if (anchorDay != null && anchorDay >= 1 && anchorDay <= 31) {
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(anchorDay, daysInMonth));
      }
      return d;
    }
    const days = cadence === Cadence.WEEKLY ? 7 : 14; // FORTNIGHTLY = 14
    d.setDate(d.getDate() + days);
    // For weekly cadences with a fixed weekday (e.g. "every Monday"), roll forward
    // to the next occurrence of that weekday.
    if ((cadence === Cadence.WEEKLY || cadence === Cadence.FORTNIGHTLY) && anchorDay != null && anchorDay >= 0 && anchorDay <= 6) {
      while (d.getDay() !== anchorDay) d.setDate(d.getDate() + 1);
    }
    return d;
  }

  /**
   * Score the specificity level for the session from person's turns.
   * Returns mapped level (specific/directional/vague/managed) and recall confidence.
   */
  private async scoreSessionSpecificity(checkInId: string): Promise<{
    level: string;
    recallConfidence: string;
    dimensions: Record<string, string>;
  }> {
    const personTurns = await this.prisma.conversationTurn.findMany({
      where: { checkInId, role: TurnRole.PERSON },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });
    if (personTurns.length === 0) {
      const dims = { delivery: 'managed', evidence: 'managed', enablement: 'managed', coverage: 'managed', commitment: 'managed' };
      return { level: 'vague', recallConfidence: 'uncertain', dimensions: dims };
    }

    const intakes = personTurns.map(t => runIntake(t.content));
    const n = intakes.length;
    const avgSpecificity = intakes.reduce((s, r) => s + r.specificity, 0) / n;

    // Five dimensions derived from runIntake() aggregates.
    const avgDelivery   = intakes.reduce((s, r) => s + r.outputScore, 0) / n;
    const avgEnablement = intakes.reduce((s, r) => s + r.thinkingScore, 0) / n;
    const coverageScore = Math.min(1, (intakes.filter(r => r.types.includes('absorption') || r.types.includes('rescue')).length / n) * 1.5);
    const commitScore   = intakes.filter(r => r.types.includes('movement')).length / n;

    const dimensions: Record<string, string> = {
      delivery:   mapSpecificityLevel(avgDelivery),
      evidence:   mapSpecificityLevel(avgSpecificity),
      enablement: mapSpecificityLevel(avgEnablement),
      coverage:   mapSpecificityLevel(coverageScore),
      commitment: mapSpecificityLevel(commitScore),
    };

    return {
      level: mapSpecificityLevel(avgSpecificity),
      recallConfidence: mapRecallConfidence(avgSpecificity),
      dimensions,
    };
  }

  /**
   * Extract RecordEntry rows from one party's transcript (#93). Owner-scoped:
   * reads only this check-in's turns. Stores the person's own words plus a
   * verifiability rating (HIGH/MEDIUM/LOW) for each entry so the synthesis can
   * weight evidence-backed claims appropriately.
   */
  async extractRecordEntries(checkInId: string, participantId: string) {
    const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } });
    if (turns.length === 0) return;

    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const result = await this.anthropic.extract<{ entries: { type: string; text: string; verifiability: string }[] }>(
      RECORD_EXTRACTION_PROMPT,
      [{ role: 'user', content: transcript }],
      RECORD_EXTRACTION_SCHEMA,
    );

    const VALID_VERIFIABILITY = ['HIGH', 'MEDIUM', 'LOW'];
    const valid = (result?.entries ?? []).filter(
      (e) => e.text?.trim() && (Object.values(RecordEntryType) as string[]).includes(e.type),
    );
    if (valid.length === 0) return;

    // Store entries. The verifiability field is kept in the text as a prefix
    // tag ([VERIFIABILITY: HIGH]) because the RecordEntry schema does not yet
    // have a dedicated column - this preserves the signal without a migration.
    await this.prisma.recordEntry.createMany({
      data: valid.map((e) => {
        const v = VALID_VERIFIABILITY.includes(e.verifiability) ? e.verifiability : 'LOW';
        return {
          participantId,
          checkInId,
          type: e.type as RecordEntryType,
          text: `[VERIFIABILITY:${v}] ${e.text.trim()}`,
        };
      }),
    });
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
    if (!result?.summary) return;

    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: {
        soloArtifact: JSON.stringify({ summary: result.summary, whatToCarry: result.whatToCarry ?? '' }),
        soloArtifactAt: new Date(),
      },
    });
  }

  /** Fetch this party's single-party artifact (B2, owner-scoped). */
  async getSoloArtifact(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    const p = await this.prisma.groundParticipant.findUnique({
      where: { id: checkIn.participantId },
      select: { soloArtifact: true, soloArtifactAt: true },
    });
    if (!p?.soloArtifact) return { artifact: null };
    return { artifact: JSON.parse(p.soloArtifact) as { summary: string; whatToCarry: string }, generatedAt: p.soloArtifactAt };
  }

  /**
   * Called immediately after a document is uploaded during an active check-in.
   * Generates a focused AI response acknowledging the document and asking what
   * it confirms. Owner-scoped: reads only this participant's documents.
   */
  async documentReceived(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);

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

    await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.AI, content: reply },
    });

    return { reply };
  }

  /**
   * Decline to take part (B8). Penalty-free - marks this party's check-in
   * DECLINED. The record reflects that the process was offered and declined;
   * this is shown to the admin as a neutral status, never a negative signal.
   */
  async decline(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
    }
    await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.DECLINED } });
    return { status: 'declined' };
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
    if (!report) throw new NotFoundException('Report not found for this ground');
    const inferenceList = (report.inferences ?? []) as Array<{ id: string; text: string; participantLabel: string; reason: string }>;
    const inference = inferenceList.find(i => i.id === inferenceId);
    if (!inference) throw new NotFoundException('Inference not found');

    // Find the participant record for this user on this ground
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    if (!participant) throw new ForbiddenException('You are not a participant on this ground');

    // Find the next available session number for this participant
    const lastCheckIn = await this.prisma.checkIn.findFirst({
      where: { participantId: participant.id },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });
    const nextSession = (lastCheckIn?.sessionNumber ?? 0) + 1;

    const checkIn = await this.prisma.checkIn.create({
      data: {
        groundId,
        participantId: participant.id,
        sessionNumber: nextSession,
        status: CheckInStatus.NOT_STARTED,
        isClarification: true,
        clarificationTarget: inferenceId,
      },
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
  async startSelfCorrectionSession(requestingUserId: string, groundId: string, targetSessionNumber: number): Promise<{ checkInId: string }> {
    const participant = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: requestingUserId },
    });
    if (!participant) throw new ForbiddenException('You are not a participant on this ground');

    const targetCheckIn = await this.prisma.checkIn.findUnique({
      where: { participantId_sessionNumber: { participantId: participant.id, sessionNumber: targetSessionNumber } },
    });
    if (!targetCheckIn || targetCheckIn.status !== CheckInStatus.COMPLETED) {
      throw new NotFoundException('That session is not a completed check-in on this ground');
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

    const lastCheckIn = await this.prisma.checkIn.findFirst({
      where: { participantId: participant.id },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });
    const nextSession = (lastCheckIn?.sessionNumber ?? 0) + 1;

    const checkIn = await this.prisma.checkIn.create({
      data: {
        groundId,
        participantId: participant.id,
        sessionNumber: nextSession,
        status: CheckInStatus.NOT_STARTED,
        isSelfCorrection: true,
        selfCorrectionTargetSession: targetSessionNumber,
      },
    });

    return { checkInId: checkIn.id };
  }

  /** Loads a check-in only if the requesting user owns the participant side. */
  private async loadOwnedCheckIn(checkInId: string, requestingUserId: string) {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      include: { participant: true },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');
    if (checkIn.participant.userId !== requestingUserId) {
      // Never let one party read another party's conversation.
      throw new ForbiddenException('This check-in does not belong to you');
    }
    return checkIn;
  }
}
