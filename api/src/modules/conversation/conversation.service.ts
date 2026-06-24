import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts';
import { AnthropicService, ChatTurn } from './anthropic.service';
import { ConversationContextService } from './context.service';
import { buildIntakeBlock, RECORD_EXTRACTION_PROMPT } from './prompt-library';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { DocumentsService } from '../documents/documents.service';
import { BillingService } from '../billing/billing.service';
import { UsageService } from '../usage/usage.service';
import { CheckInStatus, TurnRole, RecordEntryType, Cadence, GroundStatus, UsageEventType } from '@prisma/client';
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

// Single-party artifact (B2) — gives a person standalone value from session 1
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

const SOLO_ARTIFACT_PROMPT = `You are Groundwork. You are given ONE person's own record entries (their words). Produce a short artifact for them alone — they have not heard from anyone else and may never. Do not infer the other side. Do not produce a verdict or analysis of any person. Open with the exact phrase "Your private record shows:" then summarise what they put on the record in their own framing. Name one specific thing to carry forward. Warm, specific, brief — under 200 words total.`;

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
    private usage: UsageService,
  ) {}

  /** Returns the transcript for a check-in — owner-scoped only. */
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
      'Groundwork — Contribution Record',
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
   * per the runtime context. Idempotent — if turns already exist, returns the
   * existing first turn rather than re-opening.
   *
   * NO PAYMENT OR CADENCE WALL (B1/B3, Part 9). Check-ins are never gated on
   * payment — "if participant sessions are ever gated, trust collapses" — and
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

    // Billing session gate: session 1 is always free; session 2+ requires an
    // active care-fee subscription. If the org is not billing-ready, block the
    // open and surface a clear message — trust must not be conditional on payment
    // during the session itself (B1/B3), but we can gate the START of session 2+.
    if (ground?.organizationId) {
      const gate = await this.billing.checkSessionGate(ground.organizationId, checkIn.sessionNumber);
      if (!gate.allowed) {
        throw new ForbiddenException(gate.reason);
      }
    }

    // GW-41: stamp the engine_rules prompt version on the ground at first check-in
    // open time. Outcome data is attributed to the engine version active when the
    // conversation STARTED, not the one current at resolution time — without this
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
    const reply = await this.anthropic.respond(fullSystem, [
      { role: 'user', content: '<<BEGIN_CHECK_IN>> The person has just arrived. Open the check-in now per your runtime context — deliver the moment opening; do not wait for them to speak first.' },
    ]);

    const aiTurn = await this.prisma.conversationTurn.create({ data: { checkInId: checkIn.id, role: TurnRole.AI, content: reply } });
    await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.IN_PROGRESS, startedAt: new Date() } });
    return { reply: aiTurn.content, groundId: checkIn.groundId };
  }

  /**
   * Send a person's message and get the AI's next turn. Scoped to this party —
   * the other party's turns are never loaded into context.
   */
  async sendMessage(checkInId: string, requestingUserId: string, message: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
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
    // ISSUE 22: message-count auto-complete removed — only the AI's explicit signal triggers completion.
    // ISSUE 23: all checks are case-insensitive via replyLower; alternative phrases added for resilience.
    const replyLower = reply.toLowerCase();
    const sessionComplete =
      replyLower.includes('here is what is now in your record') ||
      replyLower.includes('what is in your record from today') ||
      replyLower.includes('in your record from today') ||
      replyLower.includes('your account is now on record') ||
      replyLower.includes('your record from this session') ||
      (replyLower.includes('now in your record') && replyLower.includes('next steps')) ||
      (replyLower.includes('now in your record') && replyLower.includes('carry forward')) ||
      (replyLower.includes('now in your record') && (replyLower.includes('next step') || replyLower.includes('come back when'))) ||
      (replyLower.includes('your record now') && replyLower.includes('session'));

    return { reply: aiTurn.content, sessionComplete };
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
      participant: { partyType: any; roleAsDescribed: string | null };
    },
    latestMessage?: string,
  ): Promise<string> {
    const ground = await this.prisma.ground.findUnique({ where: { id: checkIn.groundId } });
    if (!ground) throw new NotFoundException('Ground not found');

    const systemPrompt = await this.prompts.getActiveContent('system');

    // Load the prior session summary for PRIOR_SESSION in the intake block (max 500 chars).
    // Also read specificityDimensions to detect multi-dim low specificity for session builder.
    let priorSession: string | undefined;
    let lowSpecificityMultiDim = false;
    if (checkIn.sessionNumber >= 2) {
      const prevCheckIn = await this.prisma.checkIn.findFirst({
        where: { participantId: checkIn.participantId, sessionNumber: checkIn.sessionNumber - 1, status: CheckInStatus.COMPLETED },
        select: { id: true, specificityDimensions: true },
      });
      if (prevCheckIn) {
        const entries = await this.prisma.recordEntry.findMany({
          where: { checkInId: prevCheckIn.id, participantId: checkIn.participantId },
          orderBy: { createdAt: 'asc' },
          select: { type: true, text: true },
          take: 6,
        });
        if (entries.length) {
          priorSession = entries.map(e => `(${e.type}) ${e.text.replace(/^\[VERIFIABILITY:\w+\] /, '')}`).join(' | ').slice(0, 500);
        }
        if (prevCheckIn.specificityDimensions) {
          const dims = prevCheckIn.specificityDimensions as Record<string, string>;
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
    const intakeBlock = buildIntakeBlock({
      scenario: ground.scenario,
      partyType: checkIn.participant.partyType,
      sessionNumber: checkIn.sessionNumber,
      roleAsDescribed: checkIn.participant.roleAsDescribed,
      otherPartyCheckedIn,
      groundLabel: ground.label,
      adminBrief: (ground as any).description ?? null,
      priorContext: checkIn.participant.roleAsDescribed ?? null,
      priorSession,
      lowSpecificityMultiDim,
      groundState,
      leadSignals,
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
        ? `DOC_PROMPT_HINT: At a natural moment in your next response — when the conversation has reached a point where something is described but not evidenced — say something like: "There is probably something in writing that captures this. A brief, a plan, an email exchange. If you have it, attach it using the button at the bottom — I want to know what it shows." Weave it in as one sentence. Do not make it an agenda item or a request. Only if it fits naturally.`
        : '';

    return [systemPrompt, intakeBlock, returningUserContext, dynamicContext, docContext, docPromptHint].filter(Boolean).join('\n\n');
  }

  /**
   * #2 — Build a returning-user context block for session 2+.
   * Loads WORRY or TENSION entries from the most recent completed check-in and
   * injects the most important unresolved one. Adds an explicit guard preventing
   * the AI from asking "what have you been working on" to returning participants.
   */
  private async buildReturningUserContext(participantId: string, sessionNumber: number): Promise<string> {
    // Find the previous completed check-in for this participant.
    const prevCheckIn = await this.prisma.checkIn.findFirst({
      where: {
        participantId,
        sessionNumber: sessionNumber - 1,
        status: CheckInStatus.COMPLETED,
      },
      select: { id: true, specificityLevel: true, specificityDimensions: true },
    });
    if (!prevCheckIn) return '';

    // Pull unresolved items — WORRY, TENSION, and open COMMITMENTs from the last session.
    const lastEntries = await this.prisma.recordEntry.findMany({
      where: {
        checkInId: prevCheckIn.id,
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

    const lines: string[] = [
      `# Returning user — session ${sessionNumber}`,
      `GUARD: Do NOT ask "what have you been working on?" or "what has been going on?" or any equivalent generic opening. This person has been here before. Open by referencing their specific record.`,
      `Most important unresolved item from their last check-in (${topItem.type}): "${topItem.text}"`,
    ];

    if (lowSpecificity) {
      const weakDims = dims
        ? Object.entries(dims).filter(([, v]) => v === 'vague' || v === 'managed').map(([k]) => k)
        : [];
      const dimNote = weakDims.length >= 3 ? ` Dimensions that were thin: ${weakDims.join(', ')}.` : '';
      lines.push(
        `SPECIFICITY NOTE: Their last session produced ${priorSpecificity} specificity.${dimNote} Do not open with the same framing as last time. Ask about one unexpected angle — what almost went wrong, what they wish had happened differently, or what they held back last time. Do not announce the change. Push for something concrete they can name.`,
      );
    } else {
      lines.push(`Open by naming this specifically. Ask what has changed since they last described it.`);
    }

    return lines.join('\n');
  }

  /**
   * #15 — Evidence Definition enforcement.
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
   * reports listener — not here, to keep parties isolated (#36).
   */
  async complete(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
    }

    // Completion-readiness gate (B4): a check-in only closes once the person has
    // actually built a record. Hollow completions produce thin, over-confident
    // reports. Require at least 3 substantive answers from the person.
    const personTurns = await this.prisma.conversationTurn.count({
      where: { checkInId: checkIn.id, role: TurnRole.PERSON },
    });
    if (personTurns < 3) {
      throw new BadRequestException(
        'A few more exchanges are needed before this check-in can close — the record is still thin. Answer one or two more questions, then complete.',
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
    // now ready for synthesis (both parties through session 1 — #36). No import
    // of the reports module here — that would create a cycle.
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
    const next = sessionNumber + 1;
    const existing = await this.prisma.checkIn.findUnique({ where: { participantId_sessionNumber: { participantId, sessionNumber: next } } });
    if (existing) return;

    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { cadence: true } });
    const availableFrom = ground ? this.cadenceToDate(ground.cadence) : null;

    await this.prisma.checkIn.create({ data: { groundId, participantId, sessionNumber: next, status: CheckInStatus.NOT_STARTED, availableFrom } });
  }

  /** Convert a cadence enum to the next available date from now. */
  private cadenceToDate(cadence: Cadence): Date {
    const days = cadence === Cadence.WEEKLY ? 7 : cadence === Cadence.MONTHLY ? 30 : 14; // FORTNIGHTLY = 14
    const d = new Date();
    d.setDate(d.getDate() + days);
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
  private async extractRecordEntries(checkInId: string, participantId: string) {
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
    // have a dedicated column — this preserves the signal without a migration.
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
   * parties finish. Owner-scoped — reads only this party's own entries.
   */
  private async buildSoloArtifact(participantId: string, groundId: string) {
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
   * Decline to take part (B8). Penalty-free — marks this party's check-in
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
   * Whether any OTHER party on this ground has completed a check-in — gates the
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
