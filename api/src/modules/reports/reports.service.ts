import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PromptsService } from '../prompts';
import { AnthropicService } from '../conversation';
import { EmailService } from '../email/email.service';
import { GroundStatus, PartyType, CheckInStatus, GroundScenario } from '@prisma/client';
import { NEW_STARTING_REPORT_SCHEMA, RECOGNITION_REPORT_SCHEMA, DRIFT_REPORT_SCHEMA } from '../conversation/prompt-library';

// Solo artifact — single-party "Your private record shows:" summary (#91).
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
  "You are Groundwork. You are given ONE person's own record entries (their words). Produce a short artifact for them alone — they have not heard from anyone else and may never. Do not infer the other side. Do not produce a verdict or analysis of any person. Open with the exact phrase \"Your private record shows:\" then summarise what they put on the record in their own framing. Name one specific thing to carry forward. Warm, specific, brief — under 150 words total.";

// Post-report conversation guide schema (#99).
const POST_REPORT_GUIDE_SCHEMA = {
  name: 'emit_post_report_guide',
  description: 'Emit a short post-report guide to help each party walk into the conversation.',
  input_schema: {
    type: 'object',
    properties: {
      openingLine: {
        type: 'string',
        description: "One opening line this person can use to start the conversation — grounded, not defensive.",
      },
      questionToCarry: {
        type: 'string',
        description: 'One question they should carry into the room — a genuine inquiry, not a challenge.',
      },
      toAcknowledge: {
        type: 'string',
        description: "One specific thing from the other party's record that this person should acknowledge, even if they see it differently.",
      },
    },
    required: ['openingLine', 'questionToCarry', 'toAcknowledge'],
  },
};

const POST_REPORT_GUIDE_PROMPT =
  'You are Groundwork. A shared report has just been released to both parties. Given one party\'s record entries and the shared synthesis, produce a short, specific post-report guide for THIS party only. Three things: (1) one opening line they can use to start the real conversation — grounded, not defensive; (2) one question to carry into the room — genuine, not a challenge; (3) one concrete thing from the other side\'s record they should acknowledge, even if they see it differently. Brief, direct — no more than 3 sentences per item.';

// Outcome learning — weekly prompt-version resolution-rate summary (#100).
const OUTCOME_LEARNING_PROMPT =
  'You are a Groundwork analyst. You are given structured data: for each active prompt version, the number of grounds resolved, the total outcomes, and the fairness rate (% of parties who said the process felt fair). Produce a 3–5 sentence summary identifying which version(s) have the highest resolution rate, any version showing decline, and a one-sentence recommendation. Data is anonymous — no names, no org identifiers.';

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
  private readonly logger = new Logger(ReportsService.name);

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
          note: `${label} was ${level} on ${dim} in session ${lastCheckIn.sessionNumber}.`,
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

    const session2Focus = (result.divergences ?? []).slice(0, 3).map((d: any) => d.topic as string);

    const enrichedEngagement = {
      ...engagement,
      specificityNotes,
      recallNotes,
      docStatus,
      session2Focus,
    };

    const report = await this.prisma.report.upsert({
      where: { groundId },
      create: {
        groundId,
        sharedPicture: result.sharedPicture,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: result.centralQuestion,
        engagement: enrichedEngagement as any,
        promptVersionId: synthesisVersion.id,
        releasedAt: null,
      },
      update: {
        sharedPicture: result.sharedPicture,
        agreements: result.agreements as any,
        divergences: result.divergences as any,
        centralQuestion: result.centralQuestion,
        engagement: enrichedEngagement as any,
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

    // Generate per-party post-report conversation guides (#99). Best-effort —
    // a guide generation failure must never block report delivery.
    await this.generatePostReportGuides(released, ground.participants.map((p) => p.id)).catch((err) =>
      this.logger.error(`Post-report guide generation failed for ground ${groundId}: ${err.message}`),
    );

    const frontend = this.config.get<string>('resend.frontendUrl');
    const reportUrl = `${frontend}/report/${groundId}`;
    await Promise.all(ground.participants.map((p) => this.email.sendReportReady(p.email, ground.label, reportUrl)));

    return released;
  }

  /** Fetch the report. If released, returns full content for any party or the
   * initiator. If not yet released, returns a locked stub { id, groundId,
   * createdAt, releasedAt: null } for the initiator only so the admin page can
   * show the release button — no content is included before release.
   */
  async get(groundId: string, requestingUserId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, include: { participants: true, report: true } });
    if (!ground?.report) throw new NotFoundException('Report not found');

    const isInitiator = ground.initiatorId === requestingUserId;
    const participant = ground.participants.find((p) => p.userId === requestingUserId);
    if (!participant && !isInitiator) throw new ForbiddenException('You are not a party to this ground');

    if (!ground.report.releasedAt) {
      if (isInitiator) {
        // Return locked stub — admin sees the release button, no content exposed.
        return { id: ground.report.id, groundId, createdAt: ground.report.createdAt, releasedAt: null };
      }
      throw new ForbiddenException('Report has not been released yet');
    }

    // Attach this party's post-report guide (stored in engagement.postReportGuides
    // keyed by participantId — #99) and solo artifact (#91) to the response.
    const engagement = ground.report.engagement && typeof ground.report.engagement === 'object'
      ? (ground.report.engagement as Record<string, any>)
      : {};
    const postReportGuide = participant ? (engagement.postReportGuides?.[participant.id] ?? null) : null;

    const soloArtifact = participant?.soloArtifact
      ? (() => { try { return JSON.parse(participant.soloArtifact); } catch { return null; } })()
      : null;

    return { ...ground.report, postReportGuide, soloArtifact };
  }

  // ---------------------------------------------------------------------------
  // #91 — Solo artifact: public entry point used when a report is not yet ready
  // ---------------------------------------------------------------------------

  /**
   * Generate (or re-generate) the single-party "Your private record shows:"
   * artifact for a participant. Called after each check-in completes via the
   * conversation service, and can also be called directly (e.g. if an earlier
   * run failed). Owner-scoped — reads only this participant's own record.
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
  // #99 — Post-report conversation guide
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
    // Build the shared synthesis text so the AI can reference it.
    const synthesisText = [
      `Shared picture: ${report.sharedPicture}`,
      `Agreements: ${Array.isArray(report.agreements) ? report.agreements.join('; ') : JSON.stringify(report.agreements)}`,
      `Divergences: ${JSON.stringify(report.divergences)}`,
      `Central question: ${report.centralQuestion}`,
    ].join('\n');

    const guides: Record<string, { openingLine: string; questionToCarry: string; toAcknowledge: string }> = {};

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

          const result = await this.anthropic.extract<{ openingLine: string; questionToCarry: string; toAcknowledge: string }>(
            POST_REPORT_GUIDE_PROMPT,
            [{ role: 'user', content: corpus }],
            POST_REPORT_GUIDE_SCHEMA,
          );
          if (!result) return;

          guides[participantId] = result;
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
  // #100 — Ground outcome learning loop
  // ---------------------------------------------------------------------------

  /**
   * Record outcome learning data after a ground closes. Reads the ground's
   * outcome (prompt version, session count, resolvable flag, fairness ratings)
   * and creates/updates an OutcomeFeedback-style aggregate record. Called from
   * closure flows (ResolutionService, GroundsCron, etc.) — idempotent.
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
   * Weekly cron — Mondays at 08:00 UTC. Reads all Outcome records grouped by
   * prompt version, asks the AI to summarise which versions have the highest
   * resolution rate and any declining trend, then logs the result. A lightweight
   * "learning loop status report" for the team; the full data is already in
   * IntelligenceService.outcomeRates().
   */
  @Cron('0 8 * * 1')
  async weeklyOutcomeLearningReport(): Promise<void> {
    this.logger.log('Weekly outcome learning report: starting');
    try {
      const outcomes = await this.prisma.outcome.findMany({
        select: { promptVersionId: true, resolvable: true, sessionCount: true, notes: true },
      });
      if (outcomes.length === 0) {
        this.logger.log('Weekly outcome learning report: no outcome data yet — skipping');
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
