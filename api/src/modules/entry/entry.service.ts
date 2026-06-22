import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GroundScenario, GroundMoment, TurnRole, CheckInStatus, PartyType, Cadence } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds/grounds.service';
import { AnthropicService, ChatTurn } from '../conversation/anthropic.service';
import {
  ENGINE_RULES,
  buildScenarioPackForParty,
  buildRuntimeContext,
} from '../conversation/prompt-library';

const SCENARIO_MAP: Record<string, GroundScenario> = {
  'New hire':         GroundScenario.NEW_HIRE,
  'New project':      GroundScenario.NEW_PROJECT,
  'New board member': GroundScenario.NEW_ADVISOR,
  'New partner':      GroundScenario.NEW_COFOUNDER,
  'Contract renewal': GroundScenario.CONTRACT_RENEWAL,
  'New direction':    GroundScenario.NEW_PROJECT,
  'New manager':      GroundScenario.NEW_MANAGER,
};

const DEFAULT_SCENARIO = GroundScenario.NEW_HIRE;

const ENTRY_SESSION_ADDENDUM = `
# Entry session context
This is the person's first session. They have not yet created an account.
There is no prior check-in data, no longitudinal patterns, no other-party record yet.
Do not reference prior sessions or the other party's account.
Do not mention saving or payment unless the person asks.
The first two sessions are free.

# Formatting
Do not use dashes of any kind — no em dashes, no en dashes, no hyphens in prose.
Use straight quotes only. Keep questions short. One question at a time.`.trim();

const FAQ_PROMPT = `FAQ MODE. Answer the person's question about how Groundwork works in one or two plain sentences, then stop. Do not start a check-in. Do not ask a follow up unless it is needed for clarity. Do not use dashes of any kind. Use straight quotes. Reference facts only: Your account is private. The other party submits their own account independently. The report shows where accounts agree, where they differ, and what the gap means. Both parties see it at the same moment. Most first sessions take 8 to 15 minutes. The first two sessions per participant are free. Billing is $25 per month per account plus $25 per month per active participant. For anything else: hello@myground.work.`;

const ENTRY_REPORT_PROMPT = `You are Groundwork. A person has just completed their first check-in session. Generate their session 1 report: what you saw in their account, where clarity exists, where it does not, and what to do next.

Rules:
- Begin the report with a single framing line, exactly: "This is your private record from session 1. It reflects what you put on record. It has not been cross-referenced with any other account yet."
- No verdicts. No judgements of any person.
- Never name the other party personally. Use "the other party" or their role.
- Be specific to what was actually said. Do not invent.
- The alignment status reflects THIS session only. No cross-reference yet since the other party has not checked in.
- Areas requiring alignment are things still unclear or unstated, not failures.
- The recommended move is practical, not prescriptive.
- Honest close must name what is settled, what is open, what to revisit, and what the risk is if things stay as they are.
- In areasRequiringAlignment, always include at least one entry for any significant topic raised in the conversation but not addressed directly — name it explicitly as an unaddressed area with observation "This topic came up but was not fully explored in this session."`;

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
        enum: ['Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned'],
        description: 'Where the account stands after session 1.',
      },
      alignmentBasis: {
        type: 'string',
        description: '1 sentence explaining what determined the alignment status.',
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
    },
    required: ['whatGroundworkSaw', 'alignmentStatus', 'alignmentBasis', 'areasRequiringAlignment', 'alignmentReached', 'honestClose'],
  },
};

export interface EntryReport {
  whatGroundworkSaw: string;
  alignmentStatus: 'Unresolved' | 'Mixed' | 'Emerging' | 'Clear' | 'Aligned';
  alignmentBasis: string;
  areasRequiringAlignment: { title: string; observation: string; whyItMatters: string; recommendedMove: string }[];
  alignmentReached: { title: string; note: string }[];
  honestClose: { aligned: string; open: string; revisit: string; risk: string };
}

const SCENARIO_OPENERS: Record<string, string> = {
  'New hire':         'You are setting up a new hire situation. Good moment to use Groundwork. This is exactly when getting aligned early pays off, before anyone interprets things differently. It takes about ten minutes.\n\nTell me a little about it. Who is the new hire, and what do you want to get right from the start?',
  'New project':      'You are setting up a new project. Good moment to use Groundwork. Getting everyone on the same page at the start prevents a lot of friction later. It takes about ten minutes.\n\nTell me a little about it. Who is involved, and what do you want to be clear about before you begin?',
  'New board member': 'You are setting up a new board member situation. Good moment to use Groundwork. Getting expectations explicit early makes the relationship work better for everyone. It takes about ten minutes.\n\nTell me a little about it. Who is coming on, and what do you most want to get right?',
  'New partner':      'You are setting up a new partner relationship. Good moment to use Groundwork. Getting both sides of the picture now prevents misalignment later. It takes about ten minutes.\n\nTell me a little about it. Who is the partner, and what matters most to get right from the start?',
  'Contract renewal': 'You are looking at a contract renewal. Good moment to use Groundwork. Putting both accounts on record before anyone negotiates keeps things grounded in what actually happened. It takes about ten minutes.\n\nTell me a little about it. What is the relationship, and what do you want the record to show?',
  'New direction':    'You are navigating a new direction. Good moment to use Groundwork. Getting everyone aligned on what the direction means prevents different people walking away with different interpretations. It takes about ten minutes.\n\nTell me a little about it. What is changing, and who needs to be on the same page?',
};

const DEFAULT_OPENER = "Welcome to Groundwork. This is a space to build a clear, shared record of a working relationship or situation, one that captures each person's account independently and then shows you where you agree, where you differ, and what the gap is. It takes about ten minutes.\n\nThe best way to see how it works is to try it on something real. Tell me what is on your mind. Who is involved, and what are you trying to get right?";

function isLikelyQuestion(text: string): boolean {
  const t = text.trim();
  if (t.endsWith('?')) return true;
  const lower = t.toLowerCase();
  const starters = ['what is', 'what are', 'how does', 'how do', 'can you', 'is this', 'will ', 'do you', 'does this', 'why does', 'who can', 'when does'];
  return starters.some(s => lower.startsWith(s));
}

function buildEntrySystemPrompt(scenario: GroundScenario, groundLabel: string): string {
  const scenarioPack = buildScenarioPackForParty(scenario, PartyType.INITIATOR);
  const runtimeCtx = buildRuntimeContext({
    scenario,
    partyType: PartyType.INITIATOR,
    sessionNumber: 1,
    otherPartyCheckedIn: false,
    groundLabel: groundLabel || 'Entry session',
    trustLevel: 'building',
  });
  return [ENGINE_RULES, scenarioPack, runtimeCtx, ENTRY_SESSION_ADDENDUM].join('\n\n---\n\n');
}

@Injectable()
export class EntryService {
  private readonly logger = new Logger(EntryService.name);

  constructor(
    private anthropic: AnthropicService,
    private prisma: PrismaService,
    private grounds: GroundsService,
  ) {}

  opener(scenario?: string): string {
    if (scenario && SCENARIO_OPENERS[scenario]) return SCENARIO_OPENERS[scenario];
    return DEFAULT_OPENER;
  }

  faq(question: string): Promise<string> {
    return this.anthropic.respond(FAQ_PROMPT, [{ role: 'user', content: question }]);
  }

  async participantChat(token: string, messages: ChatTurn[]): Promise<{ reply: string; sessionComplete: boolean }> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');

    // Load ground + participant context from the invite token.
    const participant = await this.prisma.groundParticipant.findUnique({
      where: { inviteToken: token },
      include: {
        ground: {
          include: {
            initiator: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!participant) throw new BadRequestException('Invalid or expired invite token');

    const ground = participant.ground;
    const initiatorName = `${ground.initiator.firstName} ${ground.initiator.lastName}`.trim();

    // Determine session number from this participant's check-in history.
    const completedSessions = await this.prisma.checkIn.findMany({
      where: { participantId: participant.id, status: 'COMPLETED' },
      orderBy: { sessionNumber: 'asc' },
    });
    const sessionNumber = completedSessions.length + 1;

    // Fix 1: For session 2+, load key claims from the prior completed session.
    let priorSessionContext = '';
    if (sessionNumber > 1) {
      const lastSession = completedSessions[completedSessions.length - 1];
      const priorTurns = await this.prisma.conversationTurn.findMany({
        where: { checkInId: lastSession.id },
        orderBy: { createdAt: 'asc' },
      });
      const priorPersonTurns = priorTurns
        .filter(t => t.role === 'PERSON')
        .map(t => t.content)
        .join(' | ');
      if (priorPersonTurns) {
        priorSessionContext = `\n\n# Prior session context (session ${sessionNumber - 1})\nWhat this participant said last session: ${priorPersonTurns.slice(0, 1200)}\n\nWhen asking what moved forward, reference specifically what they said last session. If the same goal appears with no new evidence, name that directly.`;
      }
    }

    // Fix 5: Load specific claims from other completed accounts on this ground.
    const otherCompletedCheckIns = await this.prisma.checkIn.findMany({
      where: {
        groundId: ground.id,
        status: 'COMPLETED',
        participantId: { not: participant.id },
      },
      include: {
        turns: { where: { role: 'PERSON' }, orderBy: { createdAt: 'asc' }, take: 10 },
        participant: { select: { partyType: true } },
      },
    });

    let crossClaimsContext = '';
    if (otherCompletedCheckIns.length > 0) {
      const claims = otherCompletedCheckIns.flatMap(ci =>
        ci.turns.map(t => t.content)
      ).join(' | ').slice(0, 800);
      if (claims) {
        crossClaimsContext = `\n\n# Cross-reference context (do not reveal to participant)\nOther accounts on this ground have described the situation as follows. Ask about the same areas naturally without revealing what others said: ${claims}`;
      }
    }

    // Fix 2: vagueness pushback + Fix 3: evidence invitation — baked into system prompt.
    const participantSystemPrompt = buildEntrySystemPrompt(
      (SCENARIO_MAP[ground.scenario] ?? DEFAULT_SCENARIO) as any,
      ground.label,
    ) + `\n\n# Participant check-in rules
This is a participant (not the admin/initiator). They are giving their own independent account.
Session number: ${sessionNumber}
Ground: ${ground.label}
Opened by: ${initiatorName}

# Vagueness pushback (Fix 2)
If a response uses activity or framing language ("I have been working on", "we are making progress", "things are moving forward") without naming a concrete output, deliverable, or observable change — ask once: "What is actually in place now that was not there before?" Maximum one pushback per topic. Do not push a third time.

# Evidence invitation (Fix 3)
Once per session, at a natural moment, ask: "Is there anything you can point to that shows how this went — a note, a log, a message, a record?" Accept whatever they share. If nothing: note it as no supporting evidence for this session and move on. Do not press.
${priorSessionContext}${crossClaimsContext}`;

    const reply = await this.anthropic.respond(participantSystemPrompt, messages);

    // Detect session completion (AI signals done).
    const sessionComplete = reply.toLowerCase().includes('[session complete]') ||
      reply.toLowerCase().includes('your account is now on record') ||
      messages.length > 20;

    return { reply, sessionComplete };
  }

  async chat(messages: ChatTurn[], scenario?: string, groundLabel?: string): Promise<string> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser && isLikelyQuestion(lastUser.content)) {
      return this.anthropic.respond(FAQ_PROMPT, messages);
    }

    const mapped = (scenario && SCENARIO_MAP[scenario]) ? SCENARIO_MAP[scenario] : DEFAULT_SCENARIO;
    return this.anthropic.respond(buildEntrySystemPrompt(mapped, groundLabel || scenario || ''), messages);
  }

  async report(messages: ChatTurn[], scenario?: string, groundLabel?: string): Promise<EntryReport | null> {
    if (!messages || messages.length === 0) throw new BadRequestException('messages required');

    const mapped = (scenario && SCENARIO_MAP[scenario]) ? SCENARIO_MAP[scenario] : DEFAULT_SCENARIO;
    const systemPrompt = buildEntrySystemPrompt(mapped, groundLabel || scenario || '');

    return this.anthropic.extract<EntryReport>(
      ENTRY_REPORT_PROMPT + '\n\n' + systemPrompt,
      messages,
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
      checkInBy?: string;
      history: ChatTurn[];
      report?: EntryReport | null;
      contributors: { email: string; context?: string; inviteToken?: string; note?: string }[];
    },
  ): Promise<{ groundId: string }> {
    const label = dto.groundLabel.trim() || 'My first ground';
    const scenario = (dto.scenario && SCENARIO_MAP[dto.scenario]) ? SCENARIO_MAP[dto.scenario] : DEFAULT_SCENARIO;

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
      WEEKLY: Cadence.WEEKLY,
      FORTNIGHTLY: Cadence.FORTNIGHTLY,
      MONTHLY: Cadence.MONTHLY,
    };
    const ground = await this.grounds.create(organizationId, initiatorId, {
      label,
      scenario,
      moment: GroundMoment.STARTING,
      cadence: (dto.cadence && cadenceMap[dto.cadence]) ? cadenceMap[dto.cadence] : Cadence.FORTNIGHTLY,
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

    // Invite each contributor. addParticipant handles token generation, DB write,
    // and the invite email in one call.
    for (const c of dto.contributors) {
      try {
        await this.grounds.addParticipant(ground.id, organizationId, initiatorId, {
          email: c.email,
          roleAsDescribed: c.context,
          note: c.note,
          inviteToken: c.inviteToken,
        });
      } catch (err: any) {
        // Log but don't fail the commit — the ground is already created.
        this.logger.error(`entry commit: failed to invite ${c.email}: ${err.message}`);
      }
    }

    return { groundId: ground.id };
  }
}
