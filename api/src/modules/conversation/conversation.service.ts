import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts';
import { AnthropicService, ChatTurn } from './anthropic.service';
import { ConversationContextService } from './context.service';
import { buildRuntimeContext, RECORD_EXTRACTION_PROMPT } from './prompt-library';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { CheckInStatus, TurnRole, RecordEntryType } from '@prisma/client';

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
          },
          required: ['type', 'text'],
        },
      },
    },
    required: ['entries'],
  },
};

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
  ) {}

  /** Returns the transcript for a check-in — owner-scoped only. */
  async getTranscript(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    const turns = await this.prisma.conversationTurn.findMany({
      where: { checkInId: checkIn.id },
      orderBy: { createdAt: 'asc' },
    });
    return { checkIn, turns };
  }

  /**
   * Open the check-in: the engine speaks first, delivering the moment's opening
   * per the runtime context. Idempotent — if turns already exist, returns the
   * existing first turn rather than re-opening.
   */
  async open(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    if (checkIn.status === CheckInStatus.COMPLETED) {
      throw new BadRequestException('This check-in is already complete');
    }

    const existing = await this.prisma.conversationTurn.count({ where: { checkInId: checkIn.id } });
    if (existing > 0) {
      const first = await this.prisma.conversationTurn.findFirst({ where: { checkInId: checkIn.id, role: TurnRole.AI }, orderBy: { createdAt: 'asc' } });
      return { reply: first?.content ?? '' };
    }

    const fullSystem = await this.composeSystemPrompt(checkIn);
    const reply = await this.anthropic.respond(fullSystem, [
      { role: 'user', content: '<<BEGIN_CHECK_IN>> The person has just arrived. Open the check-in now per your runtime context — deliver the moment opening; do not wait for them to speak first.' },
    ]);

    const aiTurn = await this.prisma.conversationTurn.create({ data: { checkInId: checkIn.id, role: TurnRole.AI, content: reply } });
    await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.IN_PROGRESS, startedAt: new Date() } });
    return { reply: aiTurn.content };
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
    await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.PERSON, content: message },
    });

    // Rebuild history (this party only) and ask the engine for the next turn.
    const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id }, orderBy: { createdAt: 'asc' } });
    const history: ChatTurn[] = turns.map((t) => ({ role: t.role === TurnRole.AI ? 'assistant' : 'user', content: t.content }));

    const reply = await this.anthropic.respond(fullSystem, history);

    const aiTurn = await this.prisma.conversationTurn.create({
      data: { checkInId: checkIn.id, role: TurnRole.AI, content: reply },
    });

    if (checkIn.status === CheckInStatus.NOT_STARTED) {
      await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.IN_PROGRESS, startedAt: new Date() } });
    }

    return { reply: aiTurn.content };
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

    const [systemPrompt, scenarioPack] = await Promise.all([
      this.prompts.getActiveContent('system'),
      this.prompts.getActiveContent(`scenario.${ground.scenario.toLowerCase()}`).catch(() => ''),
    ]);

    const otherPartyCheckedIn = await this.hasOtherPartyCheckedIn(checkIn.groundId, checkIn.participantId);
    const runtimeContext = buildRuntimeContext({
      scenario: ground.scenario,
      partyType: checkIn.participant.partyType,
      sessionNumber: checkIn.sessionNumber,
      roleAsDescribed: checkIn.participant.roleAsDescribed,
      otherPartyCheckedIn,
      groundLabel: ground.label,
    });

    const { block: dynamicContext } = await this.context.build({
      groundId: checkIn.groundId,
      participantId: checkIn.participantId,
      sessionNumber: checkIn.sessionNumber,
      latestMessage,
    });

    return [systemPrompt, scenarioPack, runtimeContext, dynamicContext].filter(Boolean).join('\n\n');
  }

  /**
   * Complete a check-in. Triggers structured extraction of record entries.
   * When BOTH parties finish session 2, ReportsService.synthesize() is invoked
   * (wired in GroundsService / an event) — not here, to keep parties isolated.
   */
  async complete(checkInId: string, requestingUserId: string) {
    const checkIn = await this.loadOwnedCheckIn(checkInId, requestingUserId);
    await this.prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: CheckInStatus.COMPLETED, completedAt: new Date() } });

    // Extract the structured record from this party's own transcript.
    await this.extractRecord(checkIn.id, checkIn.participantId).catch((err) =>
      this.logger.error(`Record extraction failed for check-in ${checkIn.id}: ${err.message}`),
    );

    // Open the next session for this party so they have somewhere to return to.
    await this.ensureNextSession(checkIn.groundId, checkIn.participantId, checkIn.sessionNumber);

    // Announce completion. The reports listener decides whether the ground is
    // now ready for synthesis (both parties through session 2). No import of
    // the reports module here — that would create a cycle.
    this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {
      checkInId: checkIn.id,
      groundId: checkIn.groundId,
      participantId: checkIn.participantId,
      sessionNumber: checkIn.sessionNumber,
    } satisfies CheckInCompletedEvent);

    return { status: 'completed', groundId: checkIn.groundId };
  }

  /** Create the next session for a participant if it does not already exist. */
  private async ensureNextSession(groundId: string, participantId: string, sessionNumber: number) {
    const next = sessionNumber + 1;
    const existing = await this.prisma.checkIn.findUnique({ where: { participantId_sessionNumber: { participantId, sessionNumber: next } } });
    if (existing) return;
    await this.prisma.checkIn.create({ data: { groundId, participantId, sessionNumber: next, status: CheckInStatus.NOT_STARTED } });
  }

  /**
   * Extract RecordEntry rows from one party's transcript. Owner-scoped: reads
   * only this check-in's turns. Stores the person's own words.
   */
  private async extractRecord(checkInId: string, participantId: string) {
    const turns = await this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } });
    if (turns.length === 0) return;

    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const result = await this.anthropic.extract<{ entries: { type: string; text: string }[] }>(
      RECORD_EXTRACTION_PROMPT,
      [{ role: 'user', content: transcript }],
      RECORD_EXTRACTION_SCHEMA,
    );

    const valid = (result?.entries ?? []).filter(
      (e) => e.text?.trim() && (Object.values(RecordEntryType) as string[]).includes(e.type),
    );
    if (valid.length === 0) return;

    await this.prisma.recordEntry.createMany({
      data: valid.map((e) => ({ participantId, checkInId, type: e.type as RecordEntryType, text: e.text.trim() })),
    });
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
