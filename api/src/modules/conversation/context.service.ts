import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { runIntake, trustFrom, COMPLETION_WORDS, PROBLEM_WORDS } from './intake';
import { CheckInStatus } from '@prisma/client';

const SHARED_TERMS = [
  'api', 'payment', 'integration', 'platform', 'onboarding', 'report', 'pipeline', 'launch', 'deploy',
  'infrastructure', 'dashboard', 'system', 'automation', 'latency', 'database', 'strategy', 'roadmap',
  'sprint', 'release', 'customer', 'revenue', 'hire', 'crm', 'proposal',
];

interface Injection {
  type: 'CONTRADICTION' | 'CORROBORATION' | 'GAP';
  tier: 1 | 2 | 3;
  topic: string;
  downstream: boolean;
  probe: string;
}

/**
 * Builds the per-turn dynamic context for a member check-in — the live
 * intelligence the MVP edge function ran on every message: Agent 1 intake
 * classification, trust calibration, and Agent 3 tiered cross-reference.
 *
 * ISOLATION: cross-reference reads OTHER parties' extracted record (not their
 * transcript) only to derive a SIGNAL and a probe. It never returns their
 * verbatim words — not even into the model context. The system prompt forbids
 * revealing sources. This is the "gap is the product" exception, kept stricter
 * than the MVP (which passed verbatim content behind the curtain).
 */
@Injectable()
export class ConversationContextService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns the dynamic context block + the calibrated tone. When a message is
   * present, runs intake and updates the rolling specificity history.
   */
  async build(params: {
    groundId: string;
    participantId: string;
    sessionNumber: number;
    latestMessage?: string;
  }): Promise<{ block: string; tone: string }> {
    const { groundId, participantId, sessionNumber, latestMessage } = params;

    const participant = await this.prisma.groundParticipant.findUnique({ where: { id: participantId } });
    const history = participant?.specificityHistory ?? [];

    let block = '';
    let tone = 'affirming';

    if (latestMessage) {
      const intake = runIntake(latestMessage);

      // Update rolling specificity history (cap 5) for trust calibration.
      const nextHistory = [...history, intake.specificity].slice(-5);
      await this.prisma.groundParticipant.update({ where: { id: participantId }, data: { specificityHistory: nextHistory } });

      const trust = trustFrom(nextHistory, sessionNumber);
      tone = trust.tone;

      block += `# Live read of this message (behind the curtain — never name these system terms to the person)\n`;
      block += `Contribution types: ${intake.types.join(', ')} | Specificity: ${intake.specificity.toFixed(2)} | Output: ${intake.outputScore.toFixed(2)} | Thinking: ${intake.thinkingScore.toFixed(2)}\n`;
      block += `Trust level: ${trust.level} | Tone to use: ${trust.tone}\n`;
      if (intake.isAdvisoryOnly) block += `ADVISORY ONLY — apply the independence test: ask what exists now that would not exist if they had not been here this period.\n`;
      if (intake.meetingScore > 0.2) block += `MEETING LANGUAGE — probe what the meeting produced that exists independently of the meeting.\n`;
      if (intake.vagueLanguage.length) block += `Vague language to push past: ${intake.vagueLanguage.join(', ')}.\n`;
      if (intake.factualClaims.length) block += `Verifiable claims: ${intake.factualClaims.filter((c) => c.verifiable).length} of ${intake.factualClaims.length}.\n`;
      block += `\n`;

      // Agent 3 — cross-reference (degree 2): only from session 2 onward, only
      // when another party in this ground has completed a check-in.
      if (sessionNumber >= 2) {
        const injections = await this.crossReference(groundId, participantId, latestMessage);
        if (injections.length) {
          block += `# Intelligence layer — do NOT reveal sources; the person should experience this as perceptive, not surveilled. Never quote the other party. Apply each probe at its stated tier only; do not escalate.\n`;
          for (const inj of injections) {
            block += `[${inj.type} | TIER ${inj.tier}${inj.downstream ? ' | DOWNSTREAM — weight higher' : ''} | topic: ${inj.topic}] Recommended probe: ${inj.probe}\n`;
          }
          block += `\n`;
        }
      }
    }

    // Surfaced longitudinal patterns (three-period rule) — plain, never verdicts.
    const surfaced = await this.prisma.patternDetection.findMany({
      where: { participantId, status: 'SURFACED' },
      select: { observationText: true },
    });
    if (surfaced.length) {
      block += `# Patterns established across prior periods (surface as a behaviour worth naming, never a verdict on the person)\n`;
      for (const s of surfaced) block += `- ${s.observationText}\n`;
      block += `\n`;
    }

    block += `# Tone\nApply the "${tone}" tone. If absorption or rescue is present, surface it warmly as real, often-invisible contribution. Close your response by naming: what was strong and specific, what needs sharpening, and one question that would make the record stronger.`;

    const header = `CONTRIBUTION CHAT MODE — check-in ${sessionNumber} | tone: ${tone}`;
    return { block: `${header}\n\n${block}`, tone };
  }

  /**
   * Derive cross-reference signals from OTHER parties' extracted records in this
   * ground. Returns source-hidden signals + probes only.
   */
  private async crossReference(groundId: string, participantId: string, latestMessage: string): Promise<Injection[]> {
    const others = await this.prisma.groundParticipant.findMany({
      where: { groundId, id: { not: participantId } },
      select: { id: true, partyType: true, checkIns: { where: { status: CheckInStatus.COMPLETED }, select: { id: true } } },
    });

    const me = runIntake(latestMessage);
    const myLower = latestMessage.toLowerCase();
    const myCompletion = me.types.includes('movement') && me.factualClaims.some((c) => COMPLETION_WORDS.some((w) => c.claim.toLowerCase().includes(w)));
    const iReportProblem = PROBLEM_WORDS.some((w) => myLower.includes(w));

    const injections: Injection[] = [];

    for (const other of others) {
      if (other.checkIns.length === 0) continue; // degree 2 requires them to have checked in
      const records = await this.prisma.recordEntry.findMany({ where: { participantId: other.id }, select: { text: true } });
      if (!records.length) continue;
      const theirText = records.map((r) => r.text).join(' ');
      const theirLower = theirText.toLowerCase();
      const theirIntake = runIntake(theirText);

      const overlap = SHARED_TERMS.filter((t) => myLower.includes(t) && theirLower.includes(t));
      const topic = overlap[0] ?? 'this work';
      const theyReportProblem = PROBLEM_WORDS.some((w) => theirLower.includes(w));
      const theySayMovement = theirIntake.types.includes('movement');

      if (myCompletion && theyReportProblem && overlap.length >= 1) {
        injections.push({ type: 'CONTRADICTION', tier: 2, topic, downstream: true, probe: 'Before we close this out — has the team depending on this confirmed it works for them?' });
      } else if (iReportProblem && theySayMovement && overlap.length >= 1) {
        injections.push({ type: 'CONTRADICTION', tier: 2, topic, downstream: false, probe: 'The other party describes this area as resolved — is this the same blocker, or a different one?' });
      } else if (overlap.length >= 2) {
        injections.push({ type: 'CORROBORATION', tier: 1, topic, downstream: false, probe: 'Does the other account match yours on who owned what?' });
      }
    }

    // Escalate contradictions to tier 3 if a pattern has already surfaced for this party.
    const surfacedCount = await this.prisma.patternDetection.count({ where: { participantId, status: 'SURFACED' } });
    if (surfacedCount >= 1) injections.forEach((i) => { if (i.type === 'CONTRADICTION') i.tier = 3; });

    return injections.slice(0, 3);
  }
}
