import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts';
import { AnthropicService } from '../conversation';
import { EmailService } from '../email/email.service';
import { GroundStatus, PartyType, CheckInStatus, GroundScenario } from '@prisma/client';
import { NEW_STARTING_REPORT_SCHEMA, RECOGNITION_REPORT_SCHEMA, DRIFT_REPORT_SCHEMA } from '../conversation/prompt-library';

const REPORT_SCHEMA = {
  name: 'emit_report',
  description: 'Emit the shared picture, agreements, divergences (the gap) and the one central question.',
  input_schema: {
    type: 'object',
    properties: {
      sharedPicture: { type: 'string', description: 'Plain-language synthesis of the situation from both records.' },
      agreements: { type: 'array', items: { type: 'string' }, description: 'Where both accounts agree.' },
      divergences: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            positions: {
              type: 'array',
              description: "Every diverging party's position on this topic. Two for a two-party ground; more for a project / team ground.",
              items: {
                type: 'object',
                properties: {
                  participantLabel: { type: 'string', description: "The party's role label (e.g. 'the initiator', 'the project owner', 'participant A') — never a personal name." },
                  view: { type: 'string', description: 'How this party described the topic.' },
                },
                required: ['participantLabel', 'view'],
              },
            },
            evidence: {
              type: 'array',
              items: { type: 'string' },
              description: "1-2 short supporting references for this gap, drawn from the parties' own records (brief paraphrase or short quote). Grounds the gap in what was actually said; omit if nothing supports it.",
            },
          },
          required: ['topic', 'positions'],
        },
        description: 'The gap. For each topic, every party\'s position — never framed as one side being right.',
      },
      centralQuestion: { type: 'string', description: 'The one question that, answered honestly, moves things forward.' },
    },
    required: ['sharedPicture', 'agreements', 'divergences', 'centralQuestion'],
  },
};

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private prompts: PromptsService,
    private anthropic: AnthropicService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  /**
   * Generate the report from BOTH parties' private records. This is the only
   * place two parties' data meet, and the output is a NEW document (the
   * synthesis), not either party's words verbatim beyond quoted exact words.
   */
  async synthesize(groundId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, include: { participants: true } });
    if (!ground) throw new NotFoundException('Ground not found');

    // Stable, distinct label per party so the synthesis can attribute each
    // position to a specific party (works for two-party and N-party grounds).
    const parties = await this.prisma.groundParticipant.findMany({
      where: { groundId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, partyType: true, roleAsDescribed: true },
    });
    let participantIdx = 0;
    const labelById = new Map<string, string>();
    for (const p of parties) {
      if (p.partyType === PartyType.INITIATOR) {
        labelById.set(p.id, p.roleAsDescribed?.trim() || 'the initiator');
      } else {
        const letter = String.fromCharCode(65 + participantIdx++);
        labelById.set(p.id, p.roleAsDescribed?.trim() || `participant ${letter}`);
      }
    }

    const records = await this.prisma.recordEntry.findMany({
      where: { participant: { groundId } },
      include: { participant: { select: { id: true } } },
    });

    // GW-41: fetch the full version object so we can stamp promptVersionId on the
    // report. Without this, Outcome records have no prompt attribution and the
    // learning loop cannot measure per-version outcome rates.
    const synthesisVersion = await this.prompts.getActive('report_synthesis');
    const systemPrompt = synthesisVersion.content;

    // Note any invited party who contributed no record — surfaced as an absence,
    // never inferred (decision: generate when everyone who accepted is done;
    // note no-shows).
    const contributorIds = new Set(records.map((r) => r.participant.id));
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
            turns: { select: { id: true } },
          },
        },
      },
    });
    const turnCounts = participantsWithTurns.map((p) => ({
      label: labelById.get(p.id) ?? p.partyType,
      turns: p.checkIns.flatMap((c) => c.turns).length,
    }));
    const maxTurns = Math.max(...turnCounts.map((p) => p.turns), 1);
    const thinParties = turnCounts.filter((p) => p.turns < maxTurns * 0.4);
    const thinNotice =
      thinParties.length > 0
        ? `NOTE: ${thinParties.map((p) => p.label).join(', ')}'s record contains significantly fewer exchanges. A further session from ${thinParties.length === 1 ? 'that party' : 'those parties'} would strengthen the cross-reference.\n\n`
        : '';

    const corpus =
      thinNotice +
      header +
      records.map((r) => `[${labelById.get(r.participant.id) ?? 'a party'}] (${r.type}) ${r.text}`).join('\n');

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

    let result = await this.anthropic.extract<{ sharedPicture: string; agreements: string[]; divergences: any[]; centralQuestion: string }>(
      systemPrompt,
      [{ role: 'user', content: corpus }],
      activeSchema,
    );
    if (!result) throw new Error('Report synthesis failed to return structured output');

    // WORD COUNT VALIDATION: if the combined text fields exceed 500 words, make
    // one additional call asking for a shorter version. Max 2 total attempts.
    const wordCount = Object.values(result).join(' ').split(/\s+/).filter(Boolean).length;
    if (wordCount > 500) {
      const brevityPrefix =
        'The previous report was too long. Regenerate under 500 words total. Preserve all four sections and the central question. Cut explanatory language, not substance.\n\n';
      const retry = await this.anthropic.extract<{ sharedPicture: string; agreements: string[]; divergences: any[]; centralQuestion: string }>(
        systemPrompt,
        [{ role: 'user', content: brevityPrefix + corpus }],
        activeSchema,
      );
      if (retry) result = retry;
    }

    // Engagement-quality + confidence header (B4/B5a). Factual, not a verdict —
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
        const specificEntries = allEntries.filter((e) => e.text.length > 120).length;
        const specificityRatio = recordEntries > 0 ? specificEntries / recordEntries : 0;
        const specificityLabel: 'high' | 'moderate' | 'low' = specificityRatio > 0.65 ? 'high' : specificityRatio > 0.35 ? 'moderate' : 'low';
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

    // documentBackedPct: share of record entries that are NOT unanchored recall.
    const totalEntries = allGroundTexts.length;
    const documentBackedCount = allGroundTexts.filter((e) => e.evidenceType !== 'UNANCHORED_RECALL').length;
    const documentBackedPct = totalEntries > 0 ? Math.round((documentBackedCount / totalEntries) * 100) : 0;

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
      note: `This report is built from each party's self-reported account — it is not independently verified.${absent.length ? ` ${absent.length} invited part${absent.length === 1 ? 'y' : 'ies'} did not contribute, so the picture below reflects the records present.` : ''}`,
      parties: engagementParties,
    };

    const report = await this.prisma.report.upsert({
      where: { groundId },
      create: {
        groundId,
        sharedPicture: result.sharedPicture,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: result.centralQuestion,
        engagement: engagement as any,
        promptVersionId: synthesisVersion.id,
        releasedAt: null,
      },
      update: {
        sharedPicture: result.sharedPicture,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: result.centralQuestion,
        engagement: engagement as any,
        promptVersionId: synthesisVersion.id,
      },
    });

    await this.prisma.ground.update({ where: { id: groundId }, data: { status: GroundStatus.REPORT_READY } });
    return report;
  }

  /**
   * Release the report to BOTH parties at the same moment. releasedAt is set
   * once, atomically — neither party reads it before the other. (Part E:
   * "why the report goes to both parties simultaneously".)
   */
  async release(groundId: string, organizationId: string) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, organizationId },
      include: { participants: true, report: true },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    if (!ground.report) throw new NotFoundException('Report not generated yet');
    if (ground.report.releasedAt) return ground.report; // already released

    const released = await this.prisma.report.update({ where: { groundId }, data: { releasedAt: new Date() } });

    const frontend = this.config.get<string>('resend.frontendUrl');
    const reportUrl = `${frontend}/report/${groundId}`;
    await Promise.all(ground.participants.map((p) => this.email.sendReportReady(p.email, ground.label, reportUrl)));

    return released;
  }

  /** Fetch the report — only after release, only for a party to the ground. */
  async get(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, include: { participants: true, report: true } });
    if (!ground?.report) throw new NotFoundException('Report not found');

    const isParty = ground.participants.some((p) => p.userId === requestingUserId);
    if (!isParty) throw new ForbiddenException('You are not a party to this ground');
    if (!ground.report.releasedAt) throw new ForbiddenException('Report has not been released yet');

    return ground.report;
  }
}
