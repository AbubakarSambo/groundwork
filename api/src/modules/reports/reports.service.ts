import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts';
import { AnthropicService } from '../conversation';
import { EmailService } from '../email/email.service';
import { GroundStatus, PartyType, CheckInStatus } from '@prisma/client';

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

    const systemPrompt = await this.prompts.getActiveContent('report_synthesis');

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

    const corpus =
      header +
      records.map((r) => `[${labelById.get(r.participant.id) ?? 'a party'}] (${r.type}) ${r.text}`).join('\n');

    const result = await this.anthropic.extract<{ sharedPicture: string; agreements: string[]; divergences: any[]; centralQuestion: string }>(
      systemPrompt,
      [{ role: 'user', content: corpus }],
      REPORT_SCHEMA,
    );
    if (!result) throw new Error('Report synthesis failed to return structured output');

    // Engagement-quality + confidence header (B4/B5a). Factual, not a verdict —
    // it tells both parties what the report is built on (session counts, record
    // depth, documents, absentees) and carries the "not independently verified"
    // disclosure. Shown alongside the synthesis.
    const engagementParties = await Promise.all(
      parties.map(async (p) => {
        const [sessions, recordEntries, documentsAttached] = await Promise.all([
          this.prisma.checkIn.count({ where: { participantId: p.id, status: CheckInStatus.COMPLETED } }),
          this.prisma.recordEntry.count({ where: { participantId: p.id } }),
          this.prisma.groundDocument.count({ where: { groundId, participantId: p.id } }),
        ]);
        return { label: labelById.get(p.id) ?? 'a party', sessions, recordEntries, documentsAttached, contributed: contributorIds.has(p.id) };
      }),
    );
    const contributing = engagementParties.filter((e) => e.contributed);
    const minSessions = contributing.length ? Math.min(...contributing.map((e) => e.sessions)) : 0;
    const minEntries = contributing.length ? Math.min(...contributing.map((e) => e.recordEntries)) : 0;
    const coverage = minSessions >= 2 && minEntries >= 4 ? 'strong' : minSessions >= 1 && minEntries >= 2 ? 'moderate' : 'thin';
    const engagement = {
      coverage,
      documentBacked: engagementParties.some((e) => e.documentsAttached > 0),
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
        releasedAt: null,
      },
      update: {
        sharedPicture: result.sharedPicture,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: result.centralQuestion,
        engagement: engagement as any,
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
  async release(groundId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, include: { participants: true, report: true } });
    if (!ground?.report) throw new NotFoundException('Report not generated yet');
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
