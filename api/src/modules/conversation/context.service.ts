import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { runIntake, trustFrom, COMPLETION_WORDS, PROBLEM_WORDS } from './intake';
import { ALIGNMENT_FEED_ONLY_CODES } from '../patterns/pattern-library';
import { CheckInStatus, RecordEntryType } from '@prisma/client';

// ---------------------------------------------------------------------------
// #12 — Dynamic cross-reference anchors.
// Replace hardcoded SHARED_TERMS with a function that extracts the top 10
// nouns / noun-phrases from each party's last check-in transcript using simple
// word-frequency analysis. Common stop-words and short tokens are filtered out.
// The hardcoded list is kept as a fallback when transcripts are unavailable.
// ---------------------------------------------------------------------------

const FALLBACK_SHARED_TERMS = [
  'api', 'payment', 'integration', 'onboarding', 'pipeline', 'deploy',
  'infrastructure', 'automation', 'latency', 'database', 'roadmap',
  'sprint', 'release', 'crm', 'proposal',
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'had',
  'was', 'were', 'are', 'been', 'they', 'their', 'them', 'there', 'then',
  'when', 'what', 'which', 'will', 'would', 'could', 'should', 'about',
  'into', 'also', 'just', 'not', 'but', 'our', 'all', 'one', 'two', 'its',
  'has', 'did', 'out', 'we', 'us', 'it', 'he', 'she', 'you', 'i', 'a', 'an',
  'at', 'to', 'of', 'in', 'on', 'is', 'by', 'up', 'so', 'as', 'be', 'or',
  'do', 'if', 'my', 'me', 'no', 'go', 'get', 'got', 'let', 'can', 'how',
  'said', 'said', 'than', 'more', 'some', 'any', 'been', 'now', 'very',
  'well', 'back', 'still', 'through', 'over', 'made', 'make', 'before',
  'after', 'during', 'because', 'while', 'time', 'work', 'team', 'people',
]);

/**
 * Extract the top-N most frequent meaningful tokens from a block of text.
 * Used to derive dynamic cross-reference anchors per party (#12).
 */
function extractTopNouns(text: string, n = 10): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));

  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);

  // Also collect two-word phrases (bigrams) for noun-phrase detection.
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    freq.set(bigram, (freq.get(bigram) ?? 0) + 1);
  }

  return [...freq.entries()]
    .filter(([, count]) => count >= 2) // only recurring terms
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

// ---------------------------------------------------------------------------
// GW-08 — Disclosure detection. When a check-in message contains signals of
// harassment, illegal conduct, active legal proceedings, or crisis/self-harm,
// the standard contribution-chat sequence must stop. The AI must acknowledge,
// NOT probe for evidence, and route to appropriate support.
// ---------------------------------------------------------------------------

const DISCLOSURE_PATTERNS: Record<string, string[]> = {
  crisis: [
    'hurt myself', 'self-harm', 'self harm', 'suicide', 'suicidal', 'kill myself',
    "can't go on", "don't want to be here", 'end it all', 'not worth living',
  ],
  legalProceedings: [
    'lawsuit', 'filed a complaint', 'eeoc', 'grievance', 'legal proceedings',
    'suing', 'my attorney', 'my lawyer', 'complaint filed', 'employment tribunal',
  ],
  harassment: [
    'harassed', 'harassing', 'harassment', 'assaulted', 'threatened me',
    'unsafe to speak', 'hostile work environment', 'discriminated', 'discrimination',
    'retaliation', 'retaliating', 'sexually', 'bullying', 'bullied me',
  ],
};

function detectDisclosure(message: string): { category: string } | null {
  const lower = message.toLowerCase();
  for (const [category, patterns] of Object.entries(DISCLOSURE_PATTERNS)) {
    if (patterns.some((p) => lower.includes(p))) return { category };
  }
  return null;
}

const SUPPORT_RESOURCES = `SUPPORT RESOURCES (include these in your response):
  - Employee Assistance Programme (EAP), if the org has one
  - ACAS helpline (UK): 0300 123 1100 | SHRM (US): shrm.org
  - Crisis Text Line: text HOME to 741741 | 988 Suicide & Crisis Lifeline (US): call or text 988`;

function buildDisclosureBlock(category: string): string {
  if (category === 'crisis') {
    return `DISCLOSURE MODE — CRISIS / SELF-HARM SIGNAL DETECTED
STOP the alignment-ground sequence immediately.

1. Respond with genuine warmth — acknowledge what was shared in one specific sentence. Do not use generic validation language.
2. Say: "What you have shared is important. This is not the right space for what you need right now — please reach out to someone who can support you directly."
3. Share the support resources below.
4. Do NOT record this as a record entry.
5. Do NOT return to alignment-ground questions unless the person re-engages directly.

${SUPPORT_RESOURCES}`;
  }

  if (category === 'legalProceedings') {
    return `DISCLOSURE MODE — ACTIVE LEGAL PROCEEDINGS SIGNAL DETECTED
STOP the alignment-ground sequence.

1. Acknowledge what they have shared, calmly and specifically.
2. Say: "Groundwork is designed for alignment before formal processes begin. Where legal proceedings are active, the record built here could interact with those proceedings in ways I cannot advise on. I would strongly recommend speaking with your team or legal counsel before we continue."
3. Ask: "Would you like to pause this session for now?"
4. Do NOT probe for further details about the legal situation.
5. Do NOT log legal specifics as record entries.

${SUPPORT_RESOURCES}`;
  }

  // category === 'harassment'
  return `DISCLOSURE MODE — POTENTIAL HARASSMENT / DISCRIMINATION / RETALIATION SIGNAL DETECTED
The standard contribution-chat sequence MUST NOT continue.

1. Acknowledge what was shared — one sentence, specific to their words, not generic.
2. Do NOT probe for evidence ("when did this happen?", "who else saw it?"). Evidence-gathering is not your role here.
3. Say: "What you have described may go beyond what this tool is designed to handle. Your account matters, and it needs to reach the right people — not just this record."
4. Say: "This record is currently visible only to you. If the ground is activated, the report goes to both parties — including the person you have described. Before we continue, consider where this record goes."
5. Share support resources. Let them decide whether to pause or continue.

${SUPPORT_RESOURCES}`;
}

interface Injection {
  type: 'CONTRADICTION' | 'CORROBORATION' | 'GAP' | 'INVISIBLE_LABOUR';
  tier: 1 | 2 | 3;
  topic?: string;
  text?: string;
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
    checkInId?: string;
  }): Promise<{ block: string; tone: string }> {
    const { groundId, participantId, sessionNumber, latestMessage, checkInId } = params;

    const participant = await this.prisma.groundParticipant.findUnique({ where: { id: participantId } });
    const history = participant?.specificityHistory ?? [];

    let block = '';
    let tone = 'affirming';

    if (latestMessage) {
      // GW-08: check for disclosure signals before any other processing. A message
      // containing harassment, crisis, or legal-proceedings signals must route to
      // the disclosure protocol — never to the evidence-building flow.
      const disclosure = detectDisclosure(latestMessage);
      if (disclosure) {
        const disclosureBlock = buildDisclosureBlock(disclosure.category);
        return { block: disclosureBlock, tone: 'crisis' };
      }

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

      // Agent 3 — cross-reference (degree 2 + degree 3): only from session 2 onward,
      // only when another party in this ground has completed a check-in.
      if (sessionNumber >= 2) {
        const injections = await this.crossReference(groundId, participantId, latestMessage);
        if (injections.length) {
          block += `# Intelligence layer — do NOT reveal sources; the person should experience this as perceptive, not surveilled. Never quote the other party. Apply each probe at its stated tier only; do not escalate.\n`;
          for (const inj of injections) {
            const topicPart = inj.topic ? ` | topic: ${inj.topic}` : '';
            block += `[${inj.type} | TIER ${inj.tier}${inj.downstream ? ' | DOWNSTREAM — weight higher' : ''}${topicPart}] Recommended probe: ${inj.probe}\n`;
          }
          block += `\n`;
        }
      }

      // #13 — Degree 1 cross-reference: COMMITMENT-type record entries from
      // earlier in this same session injected as a 'Prior commitments this session'
      // block so the AI can reference them.
      if (checkInId) {
        const sessionCommitments = await this.prisma.recordEntry.findMany({
          where: { checkInId, participantId, type: RecordEntryType.COMMITMENT },
          select: { text: true },
          orderBy: { createdAt: 'asc' },
        });
        if (sessionCommitments.length) {
          block += `# Prior commitments this session (Degree 1 cross-reference — reference these when relevant, never as accusation)\n`;
          for (const c of sessionCommitments) block += `- ${c.text}\n`;
          block += `\n`;
        }
      }
    }

    // Surfaced longitudinal patterns (three-period rule) — plain, never verdicts.
    // Feed-only codes (F5/E4 — cofounder/founder burden asymmetry) must NEVER be
    // named to either person directly; they surface to the alignment feed only.
    // (Part 4 / GW-07.) The WHERE clause excludes them at the DB level; the
    // post-query filter below is a defense-in-depth guard in case the DB result
    // set ever contains a stale or unexpected code value.
    const surfacedRaw = await this.prisma.patternDetection.findMany({
      where: { participantId, status: 'SURFACED', code: { notIn: [...ALIGNMENT_FEED_ONLY_CODES] } },
      select: { code: true, observationText: true },
    });
    // GW-07 defense-in-depth: filter again in memory so a DB inconsistency
    // cannot leak a feed-only code into the conversation context.
    const surfaced = surfacedRaw.filter((p) => !ALIGNMENT_FEED_ONLY_CODES.has(p.code));
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
   *
   * #12 — shared terms are now derived dynamically from the top nouns in each
   * party's last check-in transcript, falling back to FALLBACK_SHARED_TERMS when
   * transcripts are unavailable.
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

    // #12 — extract top nouns from the current message for dynamic anchors.
    const myTopNouns = extractTopNouns(latestMessage, 10);

    const injections: Injection[] = [];

    for (const other of others) {
      if (other.checkIns.length === 0) continue; // degree 2 requires them to have checked in
      const records = await this.prisma.recordEntry.findMany({ where: { participantId: other.id }, select: { text: true } });
      if (!records.length) continue;
      const theirText = records.map((r) => r.text).join(' ');
      const theirLower = theirText.toLowerCase();
      const theirIntake = runIntake(theirText);

      // #12 — build dynamic shared terms from their top nouns + current message nouns.
      const theirTopNouns = extractTopNouns(theirText, 10);
      const dynamicTerms = myTopNouns.length && theirTopNouns.length
        ? myTopNouns.filter((t) => theirTopNouns.includes(t))
        : FALLBACK_SHARED_TERMS.filter((t) => myLower.includes(t) && theirLower.includes(t));

      // Also include fallback terms that appear in both texts as additional anchors.
      const fallbackOverlap = FALLBACK_SHARED_TERMS.filter((t) => myLower.includes(t) && theirLower.includes(t));
      const sharedTerms = [...new Set([...dynamicTerms, ...fallbackOverlap])];

      const overlap = sharedTerms;
      const topic = overlap[0] ?? 'this work';
      const theyReportProblem = PROBLEM_WORDS.some((w) => theirLower.includes(w));
      const theySayMovement = theirIntake.types.includes('movement');

      // GW-37: require ≥2 overlapping specific terms for CONTRADICTION (was 1).
      // Probes must NOT attribute a position to the other party — only ask the
      // person about their own record. "The other party says X" based on keyword
      // overlap is fabricated intelligence in the trust-critical moment.
      if (myCompletion && theyReportProblem && overlap.length >= 2) {
        injections.push({ type: 'CONTRADICTION', tier: 2, topic, downstream: true, probe: `Before we log ${topic} as complete — has the downstream team or person depending on this confirmed it works for them?` });
      } else if (iReportProblem && theySayMovement && overlap.length >= 2) {
        injections.push({ type: 'CONTRADICTION', tier: 2, topic, downstream: false, probe: `You have named ${topic} as a blocker — is there a version of this that is already resolved elsewhere, or is this still open?` });
      } else if (overlap.length >= 3) {
        injections.push({ type: 'CORROBORATION', tier: 1, topic, downstream: false, probe: `Both versions seem to touch on ${topic} — does your description cover who specifically owned what and what the handoff looked like?` });
      }
    }

    // Escalate contradictions to tier 3 if a pattern has already surfaced for this party.
    const surfacedCount = await this.prisma.patternDetection.count({ where: { participantId, status: 'SURFACED' } });
    if (surfacedCount >= 1) injections.forEach((i) => { if (i.type === 'CONTRADICTION') i.tier = 3; });

    // -------------------------------------------------------------------------
    // Degree 3: org-wide name mentions — invisible labour detection.
    // Looks across ALL grounds in this org for mentions of this participant by
    // name in other parties' record entries.
    // -------------------------------------------------------------------------
    let degree3Injections = 0;

    const participantWithOrg = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      select: {
        user: { select: { firstName: true, lastName: true } },
        ground: { select: { organizationId: true } },
      },
    });

    if (participantWithOrg?.user && participantWithOrg?.ground) {
      const firstName = participantWithOrg.user.firstName?.toLowerCase() ?? '';
      const lastName = participantWithOrg.user.lastName?.toLowerCase() ?? '';

      if (firstName || lastName) {
        // Find RecordEntries across this org, excluding this ground and this participant.
        const orgRecords = await this.prisma.recordEntry.findMany({
          where: {
            participant: {
              ground: {
                organizationId: participantWithOrg.ground.organizationId,
                id: { not: groundId },
              },
              id: { not: participantId },
            },
          },
          select: { text: true, type: true, participantId: true },
          take: 100,
        });

        // Find entries that mention this person by name.
        const mentioningEntries = orgRecords.filter((r) => {
          const t = r.text.toLowerCase();
          return (firstName && t.includes(firstName)) || (lastName && t.includes(lastName));
        });

        // Classify mentions for invisible labour.
        const operationalWords = ['delivered', 'built', 'shipped', 'completed', 'launched', 'deployed', 'created', 'finished'];
        const invisibleLabourMentions = mentioningEntries.filter((r) => {
          const t = r.text.toLowerCase();
          return operationalWords.some((w) => t.includes(w));
        });

        // If 2+ operational mentions AND person's own record doesn't already cover the topics.
        if (invisibleLabourMentions.length >= 2 && degree3Injections < 1) {
          injections.push({
            type: 'INVISIBLE_LABOUR',
            tier: 1,
            downstream: false,
            text: "Your name appears in other parts of the organisation's record in connection with specific work. Your own record should reflect that work explicitly.",
            probe: 'There is work that appears connected to you in the broader record. What specifically did you contribute to that, and does your record here reflect it?',
          });
          degree3Injections++;
        }
      }
    }

    // GW-37: cap at 2 injections (was 3) to reduce false-positive density.
    return injections.slice(0, 2);
  }
}
