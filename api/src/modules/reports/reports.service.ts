import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts';
import { AnthropicService } from '../conversation';
import { EmailService } from '../email/email.service';
import { GroundStatus } from '@prisma/client';

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
            initiatorView: { type: 'string' },
            participantView: { type: 'string' },
          },
          required: ['topic', 'initiatorView', 'participantView'],
        },
        description: 'The gap. Framed as two understandings of the same thing — never one side being right.',
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

    const records = await this.prisma.recordEntry.findMany({
      where: { participant: { groundId } },
      include: { participant: { select: { partyType: true } } },
    });

    const systemPrompt = await this.prompts.getActiveContent('report_synthesis');
    const corpus = records
      .map((r) => `[${r.participant.partyType}] (${r.type}) ${r.text}`)
      .join('\n');

    const result = await this.anthropic.extract<{ sharedPicture: string; agreements: string[]; divergences: any[]; centralQuestion: string }>(
      systemPrompt,
      [{ role: 'user', content: corpus }],
      REPORT_SCHEMA,
    );
    if (!result) throw new Error('Report synthesis failed to return structured output');

    const report = await this.prisma.report.upsert({
      where: { groundId },
      create: {
        groundId,
        sharedPicture: result.sharedPicture,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: result.centralQuestion,
        releasedAt: null,
      },
      update: {
        sharedPicture: result.sharedPicture,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: result.centralQuestion,
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
