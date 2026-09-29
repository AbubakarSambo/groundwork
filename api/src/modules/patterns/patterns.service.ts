import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { PrismaService } from '../prisma/prisma.service';
import { shouldThisCodeBeAboutThem } from './a-chaser-is-not-the-blocker';
import { whatWasSeenLastPeriod, lastPeriodBlockFor, HOW_FAR_BACK } from './the-detector-has-no-memory-of-last-period';
import { AnthropicService } from '../conversation';
import { runIntake } from '../conversation/intake';
import { plainVoice } from './plain-voice';
import { PERIODS_BEFORE_A_PATTERN_IS_SHOWN, PATTERN_ROW_SELECT, patternRowsThisReaderMayRead, servedPatterns, type AServedPattern } from './who-reads-a-pattern';
import { PATTERNS_ARE_SERVED } from './patterns-are-served';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { theFirstNameFrom } from '../reports/a-title-is-not-a-first-name';
import { isAgainstAGoalTheyStated, whatTheySaidThisWasFor } from './against-the-goal-they-stated';
import { saysSomethingCheckable } from '../board/reads';
import { PatternStatus, TurnRole, GroundStatus, CheckInStatus, Prisma } from '@prisma/client';
import { mirrorDetection } from '../detectors/mirror-a-detection';
import { isBackedByADocument } from '../reports/backed-by-a-document';
import {
  PATTERN_DETECTION_PROMPT,
  PATTERN_DETECTION_SCHEMA,
  BAD_FAITH_CODES,
  isBadFaithCode,
  isPositiveCode,
  isCarryingCode,
  detectR3,
  checkF1Conditions,
  DetectionInput,
  collusionRuleGate,
  COLLUSION_COMPLETION_WORDS,
  COLLUSION_CONFIRM_PROMPT,
} from './pattern-library';

/** Lookup map from code -> description for the AI confirmation prompt. */
const CODE_DESCRIPTIONS = new Map(BAD_FAITH_CODES.map((c) => [c.code, `${c.name}: ${c.signal}`]));

const THREE_PERIOD_RULE = 3;


// Grounds still in motion.
const ACTIVE_STATUSES: GroundStatus[] = [
  GroundStatus.AWAITING_PARTIES,
  GroundStatus.REPORT_READY,
  GroundStatus.ACTIVE,
];

/**
 * Pattern detection. Behavioural signals across check-in PERIODS - never a
 * verdict on a person (Part 4). A code only surfaces after it has been observed
 * in three CONSECUTIVE periods (THREE PERIOD RULE; a gap resets the streak).
 * The API exposes the plain observationText, never the code as a score/list.
 */
@Injectable()
export class PatternsService {
  private readonly logger = new Logger(PatternsService.name);

  constructor(
    private prisma: PrismaService,
    private anthropic: AnthropicService,
  ) {}

  /**
   * Analyse one completed check-in (one period for one party). Extracts pattern
   * signals from this party's own transcript + record and feeds them through
   * the three-period rule. Idempotent: skips already-analysed check-ins.
   */
  async analyzeCheckIn(checkInId: string): Promise<void> {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: {
        id: true, groundId: true, participantId: true, sessionNumber: true,
        patternsAnalyzedAt: true, specificityDimensions: true,
      },
    });
    if (!checkIn || checkIn.patternsAnalyzedAt) return;

    const [turns, records, statedGoalRows] = await Promise.all([
      this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.recordEntry.findMany({ where: { checkInId } }),
      /* What they said this was for, in earlier periods. See against-the-goal-they-stated. */
      this.prisma.recordEntry.findMany({
        where: { participantId: checkIn.participantId, disputedAt: null, type: 'SUCCESS_DEFINITION' as any, checkIn: { sessionNumber: { lt: checkIn.sessionNumber } } },
        orderBy: { createdAt: 'asc' },
        select: { text: true },
        take: 12,
      }).catch(() => [] as { text: string }[]),
    ]);
    const statedGoals = statedGoalRows.map((r) => r.text);

    if (turns.length === 0 && records.length === 0) {
      await this.markAnalyzed(checkInId);
      return;
    }

    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const recordText = records.map((r) => `(${r.type}) ${r.text}`).join('\n');
    const content = `PERIOD ${checkIn.sessionNumber}\n\nTRANSCRIPT:\n${transcript}\n\nEXTRACTED RECORD:\n${recordText}${whatTheySaidThisWasFor(statedGoals)}`;

    // --- R3 positive signal (rule-based, no AI extraction needed) ---
    const allPriorText = records.map((r) => r.text);
    const r3Input: DetectionInput = { submissions: allPriorText };
    if (detectR3(r3Input)) {
      await this.observePositive(
        checkIn.groundId,
        checkIn.participantId,
        'R3',
        'The record names another person positively with specific evidence of their contribution.',
        checkIn.sessionNumber,
      );
    }

    /**
     * WHAT WAS SEEN LAST PERIOD, SO THE SAME THING IS RECOGNISABLE AS THE SAME THING.
     *
     * The detector read one period in isolation and was never told what it saw last time, so it
     * labelled fresh every period from thirty codes with overlapping signals - and a behaviour that
     * genuinely persisted came back under a different code, which resets the streak. Every
     * behavioural detection in the database sits at periodsObserved = 1, with last periods as high
     * as 20; the only code that ever reaches three is the deterministic scorer, which cannot
     * relabel itself because it is a measurement rather than a label.
     *
     * The three-period rule does not move. See the module next door for why this is not a way
     * round it, and for the guardrail, which is the one already used twice in this codebase.
     */
    const lastPeriod = await this.prisma.patternDetection
      .findMany({
        where: {
          participantId: checkIn.participantId,
          lastPeriodNumber: { gte: checkIn.sessionNumber - HOW_FAR_BACK, lte: checkIn.sessionNumber - 1 },
        },
        select: { code: true, observationText: true, lastPeriodNumber: true },
      })
      .catch(() => [] as { code: string; observationText: string | null; lastPeriodNumber: number | null }[]);
    const recogniseBlock = lastPeriodBlockFor(whatWasSeenLastPeriod(lastPeriod, checkIn.sessionNumber), checkIn.sessionNumber);

    /*
     * WHO THIS PERSON IS WAITING ON, BY NAME, INSIDE THIS CHECK-IN.
     *
     * Read before anything is written, because three of the codes are reads about carrying your own
     * work and must not land on the person doing the chasing. See a-chaser-is-not-the-blocker.
     */
    const theirDependencies = await (this.prisma.groundDependency?.findMany?.({
      where: { groundId: checkIn.groundId, fromParticipantId: checkIn.participantId },
      select: { onParticipantId: true, status: true, what: true },
    }) ?? Promise.resolve([] as any[])).catch(() => [] as any[]);

    try {
      const result = await this.anthropic.extract<{ detections: { code: string; observation: string }[] }>(
        PATTERN_DETECTION_PROMPT + recogniseBlock,
        [{ role: 'user', content }],
        PATTERN_DETECTION_SCHEMA,
      );

      for (const d of result?.detections ?? []) {
        if (!d.observation?.trim()) continue;

        /*
         * THE GOOD ONES TAKE THE SHORT ROAD, WHICH IS THE PRODUCT'S OWN RULE.
         *
         * "Positive patterns do not require three periods. Surface them immediately when seen" -
         * the conversation prompt has said that for the product's whole life, and observePositive
         * has existed to do it. Nothing reached it but R3, because the line below dropped every
         * code that was not bad faith, so the seven good ones were extracted and thrown away.
         *
         * No confirmation pass either. That gate exists because a false positive on a bad-faith
         * code is an accusation, and asking a second model to confirm is worth the call. A false
         * positive here is a compliment somebody did not quite earn, on a board that says where it
         * came from. The costs are not the same and the gate should not be either.
         */
        if (isPositiveCode(d.code)) {
          /* M1 is about the goal they stated. An output about something else, or with no goal on record, is not it. */
          if (d.code === 'M1' && !isAgainstAGoalTheyStated(d.observation, statedGoals)) {
            this.logger.log(`Check-in ${checkInId}: M1 dropped; ${statedGoals.length ? 'the observation speaks to none of the goals this person stated' : 'no goal is on record yet to have delivered against'}.`);
            continue;
          }
          /* And a good pattern needs something somebody could check. "Actively manages what their work
             needs" with no number, date, name or document in it is a compliment, not an observation
             (run 3, 20 Sep 2026, credited to a director whose pipeline was two drafts). */
          if (!saysSomethingCheckable(d.observation)) {
            this.logger.log(`Check-in ${checkInId}: ${d.code} dropped; the observation carries nothing anybody could check.`);
            continue;
          }
          await this.observePositive(
            checkIn.groundId, checkIn.participantId, d.code, d.observation.trim(), checkIn.sessionNumber,
          );
          continue;
        }
        /*
         * CARRYING TAKES THE LONG ROAD AND SKIPS THE GATE.
         *
         * Longitudinal like the bad-faith codes, so it goes through observe() and the three-period
         * rule: one hard week is not somebody holding the place together. But no confirmation
         * call - that gate is there to slow an accusation down, and saying somebody is carrying
         * too much is not an accusation of them.
         */
        if (isCarryingCode(d.code)) {
          await this.observe(
            checkIn.groundId, checkIn.participantId, d.code, d.observation.trim(), checkIn.sessionNumber,
          );
          continue;
        }
        if (!isBadFaithCode(d.code)) continue;
        /*
         * AND NOT ABOUT THE PERSON WAITING. B5, B11 and K3 read one transcript for "a lot of talking
         * and it has not moved", which is exactly the shape a lead produces when the person they
         * hired is not delivering - it surfaced on the client, not the consultant, and her coaching
         * then told her to communicate better. See a-chaser-is-not-the-blocker.
         */
        const mine = shouldThisCodeBeAboutThem(d.code, theirDependencies as any[]);
        if (!mine.keep) {
          this.logger.log(`Check-in ${checkInId}: ${d.code} not written about this person; ${mine.because}.`);
          continue;
        }
        // AI confirmation gate: each candidate pattern is confirmed by a
        // second AI call before being written to the record. This prevents
        // false positives from the batch extraction step.
        const confirmed = await this.confirmDetection(d.code, d.observation.trim()).catch((err) => {
          this.logger.warn(`Pattern confirmation skipped for ${d.code}: ${err.message}`);
          return false;
        });
        if (!confirmed) continue;

        // Gap #30 - F1 composite gate: F1 (Insight Without Operation) requires
        // ALL four conditions (high thinking-language, low output-language,
        // pattern sustained 3 periods, no change after prior surfacing). The AI
        // extraction pass can flag F1 too early; we enforce the composite rule
        // here using per-participant historical scores before accepting the signal.
        if (d.code === 'F1') {
          const f1Input = await this.buildF1Input(checkIn.participantId);
          if (!checkF1Conditions(f1Input)) {
            this.logger.debug(`F1 gate: composite conditions not met for participant ${checkIn.participantId} - skipping`);
            continue;
          }
        }

        await this.observe(checkIn.groundId, checkIn.participantId, d.code, d.observation.trim(), checkIn.sessionNumber);
      }
    } catch (err: any) {
      this.logger.error(`Pattern extraction failed for check-in ${checkInId}: ${err.message}`);
    }

    // LOW_SPEC_MULTI_DIM: alignment-feed-only flag when 3+ dimensions were vague/managed.
    // Surfaces immediately (observePositive) so the admin sees it in the current period.
    // Never surfaces to the participant in conversation (filtered by ALIGNMENT_FEED_ONLY_CODES).
    if (checkIn.specificityDimensions) {
      const dims = checkIn.specificityDimensions as Record<string, string>;
      const lowCount = Object.values(dims).filter((v) => v === 'vague' || v === 'managed').length;
      if (lowCount >= 3) {
        const next = checkIn.sessionNumber + 1;
        /* A note to the engine, not a pattern about a person. It reached the board's alignment feed
           as "Session 2 will use a different approach". The prompt already reads specificityDimensions
           directly, so nothing needed this row. */
        this.logger.log(`Low specificity across ${lowCount} dimensions on session ${checkIn.sessionNumber}; session ${next} adjusts.`);
      }
    }

    await this.markAnalyzed(checkInId);
  }

  /**
   * Record an observed signal for a participant in a given period.
   *
   * THREE PERIODS IS STILL THE FLOOR. What changed on 24 September 2026 is how they are counted.
   * `periodsObserved` remains the CONSECUTIVE run and a gap still resets it, because a streak is a
   * useful thing to know. `seenInSessions` is every period it was actually seen in, and three of
   * those surfaces the pattern whether they touch or not.
   *
   * WHY. A consultant on a three-month engagement made an uncompleted future-tense promise in all
   * six of his fortnights. E2 fired in fortnight two and fortnight six, the streak reset both
   * times, and his client was told nothing for three months. A behaviour seen in three separate
   * periods is not one data point that might be nothing, which is the only thing the rule was ever
   * protecting against. Two periods still surfaces nothing, consecutive or not.
   */
  async observe(groundId: string, participantId: string, code: string, rawObservation: string, periodNumber: number) {
    /**
     * Strip the courtroom opener before it is stored, not on the way out.
     *
     * Every surface that reads an observation would otherwise have to remember
     * to do it, and one that forgets puts "The record shows..." back on screen.
     * Storing the plain sentence means there is only one place it can go wrong.
     */
    const observationText = plainVoice(rawObservation);
    const existing = await this.prisma.patternDetection.findUnique({
      where: { participantId_code: { participantId, code } },
    });

    if (!existing) {
      return this.createAndMirror({
        groundId,
        participantId,
        code,
        observationText,
        periodsObserved: 1,
        lastPeriodNumber: periodNumber,
        seenInSessions: [periodNumber],
        status: PatternStatus.CANDIDATE,
      });
    }

    const last = existing.lastPeriodNumber ?? 0;

    // Stale / already counted for this or an earlier period - ignore.
    if (periodNumber <= last) return existing;

    /* Every period it was really seen in, in order, with no duplicates. */
    const seenInSessions = [...new Set([...(existing.seenInSessions ?? []), periodNumber])].sort((a, b) => a - b);
    /* The consecutive run: extended where this period follows the last one, restarted where it does not. */
    const periodsObserved = periodNumber === last + 1 ? existing.periodsObserved + 1 : 1;
    /*
     * SURFACED on three consecutive OR three separate periods. The second is not a softer bar - it
     * is the same bar, counted without throwing periods away. Once surfaced, it stays surfaced: a
     * behaviour seen three times does not become unseen because the fourth period was quiet.
     */
    const enough = periodsObserved >= THREE_PERIOD_RULE || seenInSessions.length >= THREE_PERIOD_RULE;
    return this.prisma.patternDetection.update({
      where: { id: existing.id },
      data: {
        periodsObserved,
        seenInSessions,
        lastPeriodNumber: periodNumber,
        lastSeenAt: new Date(),
        observationText,
        status: enough || existing.status === PatternStatus.SURFACED ? PatternStatus.SURFACED : PatternStatus.CANDIDATE,
        /* The moment the person it is about may first read it. Set once, never moved. See who-reads-a-pattern. */
        ...(!existing.readyAt && seenInSessions.length >= PERIODS_BEFORE_A_PATTERN_IS_SHOWN ? { readyAt: new Date() } : {}),
      },
    });
  }

  /**
   * Record a positive signal (e.g. R3) for a participant. Positive signals are
   * surfaced immediately - they are not subject to the three-period rule.
   */
  async observePositive(
    groundId: string,
    participantId: string,
    code: string,
    observationText: string,
    periodNumber: number,
  ) {
    const existing = await this.prisma.patternDetection.findUnique({
      where: { participantId_code: { participantId, code } },
    });

    if (!existing) {
      return this.prisma.patternDetection.create({
        data: {
          groundId,
          participantId,
          code,
          observationText,
          periodsObserved: 1,
          lastPeriodNumber: periodNumber,
          seenInSessions: [periodNumber],
          // Positive signals surface immediately.
          status: PatternStatus.SURFACED,
        },
      });
    }

    if (periodNumber <= (existing.lastPeriodNumber ?? 0)) return existing;

    /*
     * Every period it was seen in, as the bad ones keep it. Good news surfaces at once in the
     * detector, but a person reads it only after three periods like any other pattern (decision 8),
     * and that is counted from this list. See who-reads-a-pattern.
     */
    const seenInSessions = [...new Set([...(existing.seenInSessions ?? []), periodNumber])].sort((a, b) => a - b);
    const periodsObserved = existing.periodsObserved + 1;
    return this.prisma.patternDetection.update({
      where: { id: existing.id },
      data: {
        periodsObserved,
        seenInSessions,
        lastPeriodNumber: periodNumber,
        lastSeenAt: new Date(),
        observationText,
        status: PatternStatus.SURFACED,
        ...(!existing.readyAt && Math.max(seenInSessions.length, periodsObserved) >= PERIODS_BEFORE_A_PATTERN_IS_SHOWN ? { readyAt: new Date() } : {}),
      },
    });
  }

  /**
   * Gap #21 - surfacePatterns(): enforce the three-period rule across ALL
   * CANDIDATE detections for a ground. Any detection that has been observed in
   * exactly THREE consecutive periods is transitioned to SURFACED; any whose
   * consecutive streak is broken is left as CANDIDATE with its counter reset.
   *
   * This is the explicit promotion pass. It is safe to call multiple times -
   * already-SURFACED detections are skipped.
   */
  async surfacePatterns(groundId: string): Promise<void> {
    const candidates = await this.prisma.patternDetection.findMany({
      where: { groundId, status: PatternStatus.CANDIDATE },
    });

    for (const det of candidates) {
      if (det.periodsObserved >= THREE_PERIOD_RULE) {
        await this.prisma.patternDetection.update({
          where: { id: det.id },
          data: { status: PatternStatus.SURFACED },
        });
      }
    }
  }

  /**
   * Gap #22 - startNewPeriod(groundId):
   *   1. Archives (marks with period tag in observationText) current CANDIDATE
   *      detections so they are queryable by period.
   *   2. Resets per-period counters for detections that did NOT fire in the
   *      most recent period (consecutive streak broken by a missed period).
   *   3. Runs surfacePatterns() to promote any detection that has now reached
   *      THREE consecutive periods.
   *
   * "Archiving" here means appending a "[period=N]" prefix to observationText
   * so that historical period membership is preserved without a schema change.
   */
  async startNewPeriod(groundId: string): Promise<void> {
    // Determine the current highest period number in use for this ground.
    const latest = await this.prisma.checkIn.findFirst({
      where: { groundId },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });
    const currentPeriod = latest?.sessionNumber ?? 0;

    // 1. Tag CANDIDATE detections with their period number if not yet tagged.
    const candidates = await this.prisma.patternDetection.findMany({
      where: { groundId, status: PatternStatus.CANDIDATE },
    });

    for (const det of candidates) {
      const periodTag = `[period=${det.lastPeriodNumber ?? currentPeriod}]`;
      const alreadyTagged = det.observationText?.startsWith('[period=') ?? false;
      if (!alreadyTagged) {
        await this.prisma.patternDetection.update({
          where: { id: det.id },
          data: {
            observationText: `${periodTag} ${det.observationText ?? ''}`.trim(),
          },
        });
      }

      // 2. If this detection's last period is not the current period, the streak
      //    is broken - reset the consecutive counter back to 0 so the next
      //    observation restarts the streak properly.
      const lastP = det.lastPeriodNumber ?? 0;
      if (lastP < currentPeriod) {
        await this.prisma.patternDetection.update({
          where: { id: det.id },
          data: { periodsObserved: 0 },
        });
      }
    }

    // 3. Promote any detections that now meet the three-period threshold.
    await this.surfacePatterns(groundId);

    this.logger.log(`startNewPeriod: ground ${groundId}, period boundary at session ${currentPeriod}`);
  }

  /**
   * Gap #29 - detectConcentrationRisk(orgId):
   * Detects when a single person (by userId) appears as a participant in 3 or
   * more active grounds simultaneously within the same organisation. When
   * detected, creates a CONCENTRATION_RISK PatternDetection on one of those
   * grounds (the earliest) so it surfaces in the alignment feed.
   */
  async detectConcentrationRisk(orgId: string): Promise<void> {
    // Find all active grounds for the org.
    const activeGrounds = await this.prisma.ground.findMany({
      where: { organizationId: orgId, status: { in: ACTIVE_STATUSES } },
      select: {
        id: true,
        participants: {
          where: { userId: { not: null } },
          select: { id: true, userId: true },
        },
      },
    });

    // Count how many active grounds each userId appears in.
    const groundsByUser = new Map<string, { groundId: string; participantId: string }[]>();
    for (const ground of activeGrounds) {
      for (const p of ground.participants) {
        if (!p.userId) continue;
        const entry = { groundId: ground.id, participantId: p.id };
        const existing = groundsByUser.get(p.userId) ?? [];
        existing.push(entry);
        groundsByUser.set(p.userId, existing);
      }
    }

    for (const [userId, entries] of groundsByUser) {
      if (entries.length < 3) continue;

      // Use the first entry as the anchor ground for this detection.
      const anchor = entries[0];
      const observationText =
        `A single participant (user ${userId}) is an active party in ${entries.length} simultaneous grounds ` +
        `within this organisation. Concentration in multiple active grounds at once may indicate over-extension ` +
        `or undue influence across proceedings.`;

      const existingRisk = await this.prisma.patternDetection.findUnique({
        where: { participantId_code: { participantId: anchor.participantId, code: 'CONCENTRATION_RISK' } },
      });

      if (!existingRisk) {
        await this.prisma.patternDetection.create({
          data: {
            groundId: anchor.groundId,
            participantId: anchor.participantId,
            code: 'CONCENTRATION_RISK',
            observationText,
            periodsObserved: 1,
            status: PatternStatus.SURFACED,
          },
        });
        this.logger.warn(
          `Concentration risk detected: user ${userId} active in ${entries.length} grounds (org ${orgId})`,
        );
      } else {
        // Update the observation if the count changed.
        await this.prisma.patternDetection.update({
          where: { id: existingRisk.id },
          data: { observationText, lastSeenAt: new Date() },
        });
      }
    }
  }

  /**
   * COLLUSION_RISK - cross-party detector. The single-party pattern path cannot
   * see collusion because it analyses one party in isolation; this pass sees a
   * PAIR together. Over each pair of participants that each have >= 3 completed
   * check-ins: a cheap rule gate (reciprocal naming + a shared claim both frame
   * as settled + NO independent anchor), then an AI confirm on survivors, then
   * observe() so it inherits the three-period rule. It is written feed-only with
   * no probe (see pattern-library), so it reaches the admin feed ONLY - never a
   * live probe to the accused and never a participant-facing report.
   *
   * The false-positive design is deliberate: the independent anchor is the hard
   * gate (a document, a third party's record, or a named external clears the
   * pair before any model call), reciprocity is mandatory, and three periods are
   * required. Prefer false negatives over false positives.
   */
  async analyzeGroundForCollusion(groundId: string): Promise<void> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: {
        id: true,
        documents: { select: { participantId: true } },
        participants: {
          where: { userId: { not: null } },
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            checkIns: { where: { status: CheckInStatus.COMPLETED }, select: { sessionNumber: true } },
            recordEntries: { select: { text: true, anchoredDocumentId: true, anchoredOrigin: true, recallBased: true } },
          },
        },
      },
    });
    if (!ground) return;

    const STOP = new Set([
      'the', 'and', 'that', 'this', 'with', 'have', 'has', 'for', 'was', 'were', 'are', 'our',
      'their', 'they', 'them', 'from', 'what', 'when', 'which', 'would', 'about', 'into', 'been',
      'will', 'your', 'you', 'his', 'her', 'she', 'him', 'not', 'but', 'all', 'any', 'can',
      'work', 'done', 'team', 'project', 'thing', 'things', 'said', 'get', 'got', 'also',
    ]);
    const nameTokens = (u: any): string[] => {
      const parts = [u?.firstName, u?.lastName, (u?.email ?? '').split('@')[0]]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter((t: string) => t.length >= 3);
      return Array.from(new Set(parts));
    };
    const contentTokens = (text: string): Set<string> =>
      new Set(
        text.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((t) => t.length > 3 && !STOP.has(t)),
      );
    const namesOther = (entries: { text: string }[], otherTokens: string[]) =>
      entries.filter((e) => otherTokens.some((t) => e.text.toLowerCase().includes(t)));
    const hasCompletion = (entries: { text: string }[]) =>
      entries.some((e) => COLLUSION_COMPLETION_WORDS.some((w) => e.text.toLowerCase().includes(w)));
    const hasDocAnchor = (p: any) =>
      p.recordEntries.some((r: any) => isBackedByADocument(r)) ||
      ground.documents.some((d: any) => d.participantId === p.id);

    const eligible = ground.participants.filter((p) => (p.checkIns?.length ?? 0) >= 3);
    if (eligible.length < 2) return;

    for (let x = 0; x < eligible.length; x++) {
      for (let y = x + 1; y < eligible.length; y++) {
        const a = eligible[x];
        const b = eligible[y];
        const aTok = nameTokens(a.user);
        const bTok = nameTokens(b.user);
        if (aTok.length === 0 || bTok.length === 0) continue;

        const aNamingB = namesOther(a.recordEntries, bTok);
        const bNamingA = namesOther(b.recordEntries, aTok);

        // Shared claim = content-token overlap between the entries where each names the other.
        const aClaimTokens = new Set<string>();
        aNamingB.forEach((e) => contentTokens(e.text).forEach((t) => !bTok.includes(t) && aClaimTokens.add(t)));
        const shared: string[] = [];
        bNamingA.forEach((e) => contentTokens(e.text).forEach((t) => aClaimTokens.has(t) && !aTok.includes(t) && shared.push(t)));
        const sharedTopicTokens = Array.from(new Set(shared));

        // Independent anchor: a document for either party, OR a THIRD participant whose
        // record references the shared claim (corroborated outside the pair).
        const thirdPartyRefs = sharedTopicTokens.length
          ? ground.participants.some(
              (p) =>
                p.id !== a.id &&
                p.id !== b.id &&
                p.recordEntries.some((r: any) => sharedTopicTokens.some((t) => r.text.toLowerCase().includes(t))),
            )
          : false;
        const hasIndependentAnchor = hasDocAnchor(a) || hasDocAnchor(b) || thirdPartyRefs;

        const gate = collusionRuleGate({
          aNamesB: aNamingB.length > 0,
          bNamesA: bNamingA.length > 0,
          aCompletionOnShared: hasCompletion(aNamingB),
          bCompletionOnShared: hasCompletion(bNamingA),
          sharedTopicTokens,
          hasIndependentAnchor,
        });
        if (!gate.candidate) continue;

        // Survivor of the cheap gate - the nuanced call goes to the model.
        const aName = [a.user?.firstName, a.user?.lastName].filter(Boolean).join(' ') || 'Party A';
        const bName = [b.user?.firstName, b.user?.lastName].filter(Boolean).join(' ') || 'Party B';
        const confirmed = await this.confirmCollusion(
          aNamingB.map((e) => e.text).join('\n'),
          bNamingA.map((e) => e.text).join('\n'),
          aName,
          bName,
        );
        if (!confirmed) continue;

        // Anchor to a stable participant (min id) so the three-period streak is
        // consistent across weekly runs; the partner is captured for the admin.
        const [anchorId, partnerId] = [a.id, b.id].sort();
        const period = Math.max(
          ...a.checkIns.map((c) => c.sessionNumber),
          ...b.checkIns.map((c) => c.sessionNumber),
        );
        const observationText =
          `Two accounts corroborate the same claims across periods with no independent evidence - ` +
          `each is supported only by the other. Worth an admin look. Pair (participants): ${anchorId} & ${partnerId}.`;
        await this.observe(groundId, anchorId, 'COLLUSION_RISK', observationText, period);
        this.logger.warn(`COLLUSION_RISK candidate flagged for review on ground ${groundId} (pair ${anchorId} & ${partnerId})`);
      }
    }
  }

  /** Cross-party AI confirm for COLLUSION_RISK - the pair analog of confirmDetection. */
  private async confirmCollusion(aText: string, bText: string, aName: string, bName: string): Promise<boolean> {
    const question =
      `PARTY A (${aName}) record:\n${aText}\n\nPARTY B (${bName}) record:\n${bText}\n\nAnswer YES or NO.`;
    const reply = await this.anthropic.respond(COLLUSION_CONFIRM_PROMPT, [{ role: 'user', content: question }]);
    return reply.trim().toUpperCase().startsWith('YES');
  }

  /**
   * Gap #32 - Org-wide mention tracking for Degree 3 cross-reference.
   * Returns all record entries from ALL grounds in the given organisation where
   * the specified participant email is mentioned, so cross-ground mention
   * patterns can be detected across the entire org rather than a single ground.
   */
  async getOrgWideMentions(orgId: string, mentionEmail: string): Promise<{ groundId: string; text: string }[]> {
    // Get all participants across the org whose email matches.
    const orgGrounds = await this.prisma.ground.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const groundIds = orgGrounds.map((g) => g.id);

    if (groundIds.length === 0) return [];

    // Query record entries from all grounds in the org and filter by mention
    // of the target email or name fragment in the text. Because names are
    // free-text we search for the email prefix (the local part before @) as a
    // pragmatic proxy for name mentions.
    const namePart = mentionEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase();

    const entries = await this.prisma.recordEntry.findMany({
      where: {
        participant: { groundId: { in: groundIds } },
        text: { contains: namePart, mode: 'insensitive' },
      },
      select: { text: true, participant: { select: { groundId: true } } },
    });

    return entries.map((e) => ({ groundId: e.participant.groundId, text: e.text }));
  }

  /**
   * `surfacedForGround` is deleted with the alignment feed that was its only caller. W13-13.
   *
   * It returned each surfaced pattern's observation text for one ground, which the feed showed
   * as a list. The ground page reads the same detections through `patternDetections` on the
   * ground itself, so nothing lost a capability - one query had two shapes and only one of them
   * had a reader.
   *
   * Found by the dead-method guard the moment the feed's service went, which is the guard
   * working exactly as intended.
   */

  /**
   * Gap #30 - Build a DetectionInput for the F1 composite check using the
   * participant's historical check-in data. Scores are computed on-the-fly from
   * each period's record entries using runIntake() (scores are not persisted on
   * the CheckIn model). Includes prior surfaced codes so condition 4 can be
   * evaluated (no change despite prior F1 surfacing).
   */
  private async buildF1Input(participantId: string): Promise<DetectionInput> {
    const checkIns = await this.prisma.checkIn.findMany({
      where: { participantId, status: CheckInStatus.COMPLETED },
      orderBy: { sessionNumber: 'asc' },
      select: {
        id: true,
        recordEntries: { select: { text: true } },
      },
    });

    const submissions: string[] = [];
    const thinkingScore: number[] = [];
    const outputScore: number[] = [];

    for (const ci of checkIns) {
      const periodText = ci.recordEntries.map((r) => r.text).join(' ');
      const intake = runIntake(periodText);
      submissions.push(periodText);
      thinkingScore.push(intake.thinkingScore);
      outputScore.push(intake.outputScore);
    }

    // Collect codes already surfaced for this participant (condition 4).
    const surfaced = await this.prisma.patternDetection.findMany({
      where: { participantId, status: PatternStatus.SURFACED },
      select: { code: true },
    });
    const priorSurfacedCodes = surfaced.map((s) => s.code);

    return { submissions, thinkingScore, outputScore, priorSurfacedCodes };
  }

  /**
   * Ask the AI to confirm a single candidate pattern detection before saving.
   * Returns true only if the model answers YES. Any other response or an error
   * is treated as rejection so we fail safely (no false positives).
   *
   * The excerpt is the observation text produced by the batch extraction step -
   * a plain-language description of what the record shows, never a verdict.
   */
  private async confirmDetection(code: string, excerpt: string): Promise<boolean> {
    const description = CODE_DESCRIPTIONS.get(code) ?? code;
    const systemPrompt =
      'You are a pattern-detection verifier. Answer only YES or NO. No explanation. No preamble.';
    const question = `Does this text exhibit pattern ${code} (${description})?\nText: ${excerpt}\nAnswer YES or NO.`;

    const reply = await this.anthropic.respond(systemPrompt, [{ role: 'user', content: question }]);
    return reply.trim().toUpperCase().startsWith('YES');
  }

  private markAnalyzed(checkInId: string) {
    return this.prisma.checkIn.update({ where: { id: checkInId }, data: { patternsAnalyzedAt: new Date() } });
  }

  /**
   * "SAY WHAT'S BEHIND IT." The person a pattern is about answers it, in their own words.
   *
   * Only that person, and only a pattern they may already read (three periods, a plain name, the
   * switch on): anything else is "not found", so nobody can learn from this route that a pattern
   * exists about somebody else. The answer is kept beside the pattern and read by the person and by
   * whoever runs the check-in, never by a colleague; answering is also what lets the lead read it
   * at once rather than after three days. They can change it later. Bank and card numbers are
   * hidden before it is stored, as in a check-in message (decision 35).
   */
  async answerAsThePerson(detectionId: string, userId: string, text: string): Promise<AServedPattern> {
    const nothingHere = () => new NotFoundException('There is nothing here for you to answer.');
    if (!PATTERNS_ARE_SERVED) throw nothingHere();
    const row = await this.prisma.patternDetection.findUnique({
      where: { id: detectionId },
      select: {
        ...PATTERN_ROW_SELECT,
        participant: {
          select: {
            userId: true,
            ground: { select: { initiatorId: true, participants: { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } } } },
          },
        },
      },
    });
    if (!row || !row.participant?.userId || row.participant.userId !== userId) throw nothingHere();
    const reader = { participantId: row.participantId, runsIt: false };
    if (!patternRowsThisReaderMayRead([row], reader).length) throw nothingHere();

    const words = withoutBankDetails(String(text ?? '').trim());
    if (!words) throw new BadRequestException('Write what is behind it in a sentence or two.');
    if (words.length > 2000) throw new BadRequestException('That is longer than 2,000 characters. Say what is behind it in a few sentences.');

    const now = new Date();
    const saved = await this.prisma.patternDetection.update({
      where: { id: row.id },
      data: { personAnswer: words, personAnsweredAt: now, ...(row.shownToPersonAt ? {} : { shownToPersonAt: now }) },
      select: PATTERN_ROW_SELECT,
    });
    const ground = row.participant.ground;
    const lead = ground?.participants?.find((p) => !!ground.initiatorId && p.userId === ground.initiatorId);
    return servedPatterns([saved], reader, { now, leadName: theFirstNameFrom(lead?.user?.firstName, lead?.user?.lastName), leadParticipantId: lead?.id ?? null })[0];
  }

  /**
   * Record an accuracy rating for a surfaced pattern detection.
   * Only platform admins can rate; raters see the observation text, not the code directly.
   */
  async rateAccuracy(detectionId: string, accurate: boolean, ratedByUserId: string): Promise<void> {
    await this.prisma.patternDetection.update({
      where: { id: detectionId },
      data: { accuracyRating: accurate, ratedAt: new Date(), ratedBy: ratedByUserId },
    });
  }

  /**
   * Per-code accuracy summary for the prompts dashboard.
   * Returns each code with surfaced count, rated count, and accuracy rate.
   */
  async codeAccuracySummary(): Promise<{ code: string; surfaced: number; rated: number; accuracyRate: number | null }[]> {
    const detections = await this.prisma.patternDetection.findMany({
      where: { status: PatternStatus.SURFACED },
      select: { code: true, accuracyRating: true },
    });

    const byCode: Record<string, { surfaced: number; accurate: number; rated: number }> = {};
    for (const d of detections) {
      if (!byCode[d.code]) byCode[d.code] = { surfaced: 0, accurate: 0, rated: 0 };
      byCode[d.code].surfaced++;
      if (d.accuracyRating !== null) {
        byCode[d.code].rated++;
        if (d.accuracyRating) byCode[d.code].accurate++;
      }
    }

    return Object.entries(byCode)
      .map(([code, stats]) => ({
        code,
        surfaced: stats.surfaced,
        rated: stats.rated,
        accuracyRate: stats.rated > 0 ? Math.round((stats.accurate / stats.rated) * 100) / 100 : null,
      }))
      .sort((a, b) => b.surfaced - a.surfaced);
  }
  /**
   * WRITE THE GROUND'S ROW, THEN MIRROR IT INTO THE ORG LAYER.
   *
   * The ground's detection is unchanged and stays authoritative for its ground - the thirty-eight
   * codes, the three-period rule and the collusion confirmation are untouched. The mirror is what
   * lets the same behaviour be watched across check-ins and tied to a piece of the customer's work.
   *
   * Nothing in the live product reads the mirror. Mirroring is best-effort and a failure is
   * swallowed inside `mirrorDetection`: a detection must never fail because its copy did.
   */
  private async createAndMirror(data: Prisma.PatternDetectionUncheckedCreateInput) {
    const created = await this.prisma.patternDetection.create({ data });

    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: created.participantId },
      select: { email: true, userId: true, ground: { select: { organizationId: true } } },
    });
    /* A guest's detection is theirs, never an entry's on the host's list. See a-guest-is-never-somebody-on-the-hosts-list. */
    const roster = participant?.email && !(await isAGuestIn(this.prisma, participant.ground.organizationId, participant))
      ? await this.prisma.person.findFirst({
          where: { organizationId: participant.ground.organizationId, email: participant.email.toLowerCase() },
          select: { externalId: true },
        })
      : null;

    await mirrorDetection(this.prisma, {
      organizationId: participant!.ground.organizationId,
      groundId: created.groundId,
      patternDetectionId: created.id,
      personExternalId: roster?.externalId ?? null,
      code: created.code,
      periodsObserved: created.periodsObserved,
      observationText: created.observationText,
    });
    return created;
  }

}
