import { restsOnARecordNobodyHolds, whatTheRecordRuleTookOut, aLineForWhatTheRecordRuleTookOut } from './a-pattern-does-not-rest-on-a-record-nobody-holds';
import { thePersonJudgementsAreOn, thePersonJudgementsAreOnFor } from '../organisation/person-judgements';
import { Injectable, Optional, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { theirApprovedLeave } from '../suites/who-is-away';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LEARNING_SIGNAL } from '../learning/learning-signal';
import { theirOwnEarlierRecord, earlierRecordQuery } from './the-detector-reads-their-own-earlier-record';
import {
  theReadsWereSplit,
  couldChangeWhatIsShown,
  whatCountsThisPeriod,
  MORE_READS_WHEN_SPLIT,
  votesOf,
  whatTheSettlingLetGo,
  aLineForWhatTheSettlingLetGo,
} from './a-period-at-the-line-is-settled-on-all-the-evidence';
import { whatWasSeenLastPeriod, lastPeriodBlockFor, evidenceBorrowedFromAnotherCode, HOW_FAR_BACK } from './the-detector-has-no-memory-of-last-period';
import { AnthropicService } from '../conversation';
import { PromptsService } from '../prompts/prompts.service';
import { runIntake } from '../conversation/intake';
import { plainVoice } from './plain-voice';
import { PERIODS_BEFORE_A_PATTERN_IS_SHOWN, PATTERN_ROW_SELECT, patternRowsThisReaderMayRead, servedPatterns, periodsSeen, type AServedPattern, type ALeadPatternMark } from './who-reads-a-pattern';
import { periodOf } from './period-of';
import { PATTERNS_ARE_SERVED } from './patterns-are-served';
import { theLeadMarksAPatternAcrossTime } from './the-leads-mark-on-a-pattern';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';
import { theFirstNameFrom } from '../reports/a-title-is-not-a-first-name';
import { isAgainstAGoalTheyStated, whatTheySaidThisWasFor } from './against-the-goal-they-stated';
import { saysSomethingCheckable } from '../board/reads';
import { PatternStatus, TurnRole, GroundStatus, CheckInStatus, Prisma } from '@prisma/client';
import { mirrorDetection } from '../detectors/mirror-a-detection';
import { theFactsOnRecord } from '../conversation/the-facts-on-record';
import {
  PATTERN_DETECTION_PROMPT,
  PATTERN_DETECTION_PROMPT_KEY,
  PATTERN_DETECTION_SCHEMA,
  BAD_FAITH_CODES,
  isBadFaithCode,
  isPositiveCode,
  isCarryingCode,
  detectR3,
  checkF1Conditions,
  DetectionInput,
  PATTERN_DETECTORS,
  detectPattern,
  mergedEvidenceSource,
  AnEvidenceSource,
  collusionRuleGate,
  COLLUSION_COMPLETION_WORDS,
  COLLUSION_CONFIRM_PROMPT,
} from './pattern-library';

/** Lookup map from code -> description for the AI confirmation prompt. */
const CODE_DESCRIPTIONS = new Map(BAD_FAITH_CODES.map((c) => [c.code, `${c.name}: ${c.signal}`]));

/**
 * THE STEADIEST SETTING THE MODEL HAS, FOR THE TWO DETECTOR CALLS.
 *
 * Measured live against run-20 of journey/all-24 (30 September 2026, step 2 - see
 * api/journey/the-detector-read-twice.ts and docs/morning-report.md, "Step 2, the fix"). Kept
 * here, not applied anywhere by default, until that measurement says which of the extraction call,
 * the confirming call, or neither should use it.
 */
export const PATTERN_DETECTION_STEADY_OPTIONS = { temperature: 0, seed: 20260930 } as const;

/**
 * READ FIVE TIMES, KEEP WHAT THREE AGREE ON.
 *
 * Measured live against run-20 of journey/all-24 (50 check-ins, 30 September 2026 - see
 * api/journey/how-steady-each-way-is.py and -2.py, and docs/morning-report.md). One ordinary read
 * gives the same (person, pattern) pairs across a scenario only 36% of the time. One read at the
 * steady setting above (temperature 0, a fixed seed) gives 57%. Five steady reads, keeping a
 * pattern only when at least three of the five keep it, gives 80%, while still finding at least as
 * many real patterns as today's single read (71% of the patterns most reads agree on, measured
 * independently). The smallest thinking budget was ruled out separately - it finds almost nothing.
 */
export const READS_PER_CHECK_IN = 5;
export const READS_THAT_MUST_AGREE = 3;

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
    /* Optional so that a service built by hand (most specs) still works; tells the learning counts a new signal came in. */
    @Optional() private events?: EventEmitter2,
    /* Optional so that a service built by hand still works: the stored detector prompt is read through it, the code's text is the fallback. */
    @Optional() private prompts?: PromptsService,
  ) {}

  /** The detector's prompt that runs: the version stored under `pattern_detection`, else the text in the code. */
  private async theDetectorPrompt(): Promise<{ content: string; id: string | null }> {
    const stored = await this.prompts?.getActive(PATTERN_DETECTION_PROMPT_KEY).catch(() => null);
    return stored ? { content: stored.content, id: stored.id } : { content: PATTERN_DETECTION_PROMPT, id: null };
  }


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
        patternsAnalyzedAt: true, specificityDimensions: true, sessionReport: true,
        completedAt: true, startedAt: true, createdAt: true,
        ground: { select: { cadence: true, cadenceDays: true } },
      },
    });
    if (!checkIn || checkIn.patternsAnalyzedAt) return;
    /* Judgements of a person off for this organisation: no pattern is found about anybody, and the check-in is marked read so the sweep does not retry it (organisation/person-judgements.ts). */
    if (!(await thePersonJudgementsAreOnFor(this.prisma, checkIn.groundId))) { await this.markAnalyzed(checkInId); return; }

    /* The period this check-in belongs to, honestly (decision 57, item 1). A session on a weekly-or-
       slower ground is its own period; a session on a daily ground belongs to the calendar week it
       fell in, so several sessions in one week are the one period the three-period rule means. */
    const period = periodOf(
      { sessionNumber: checkIn.sessionNumber, when: checkIn.completedAt ?? checkIn.startedAt ?? checkIn.createdAt },
      checkIn.ground,
    );

    const [turns, records, statedGoalRows] = await Promise.all([
      this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } }),
      /* In the order they were written, so two readings of one check-in are given the same text (9 Oct 2026). */
      this.prisma.recordEntry.findMany({ where: { checkInId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      /* What they said this was for, in earlier periods. See against-the-goal-they-stated. */
      this.prisma.recordEntry.findMany({
        where: { participantId: checkIn.participantId, disputedAt: null, type: 'SUCCESS_DEFINITION' as any, checkIn: { sessionNumber: { lt: checkIn.sessionNumber } } },
        orderBy: { createdAt: 'asc' },
        select: { text: true },
        take: 12,
      }).catch(() => [] as { text: string }[]),
    ]);
    const statedGoals = statedGoalRows.map((r) => r.text);
    /* Their own earlier record, for the codes that only show over time. Built once; all five reads get this same text. */
    const earlierLines = await this.prisma.recordEntry
      .findMany(earlierRecordQuery(checkIn.participantId, checkIn.sessionNumber) as any)
      .catch(() => [] as any[]);

    if (turns.length === 0 && records.length === 0) {
      await this.markAnalyzed(checkInId);
      return;
    }

    /* What the PERSON said, and the lines taken from it, and their own earlier lines: never Groundwork's side. */
    const whatThePersonSaid = [
      ...turns.filter((t) => t.role !== TurnRole.AI).map((t) => t.content ?? ''),
      ...records.map((r) => r.text),
      ...(earlierLines as any[]).map((r) => r?.text ?? ''),
    ];
    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const recordText = records.map((r) => `(${r.type}) ${r.text}`).join('\n');
    const content = `PERIOD ${period}\n\nTRANSCRIPT:\n${transcript}\n\nEXTRACTED RECORD:\n${recordText}${whatTheySaidThisWasFor(statedGoals)}${theirOwnEarlierRecord(earlierLines as any, period)}`;

    // --- R3 positive signal (rule-based, no AI extraction needed) ---
    const allPriorText = records.map((r) => r.text);
    const r3Input: DetectionInput = { submissions: allPriorText };
    if (detectR3(r3Input)) {
      // R3 is never read by the model at all - a rule-only finding, not a lesser one.
      await this.observePositive(
        checkIn.groundId,
        checkIn.participantId,
        'R3',
        'The record names another person positively with specific evidence of their contribution.',
        period,
        'rule',
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
          lastPeriodNumber: { gte: period - HOW_FAR_BACK, lte: period - 1 },
        },
        orderBy: [{ lastPeriodNumber: 'asc' }, { code: 'asc' }],
        select: { code: true, observationText: true, lastPeriodNumber: true },
      })
      .catch(() => [] as { code: string; observationText: string | null; lastPeriodNumber: number | null }[]);
    const recogniseBlock = lastPeriodBlockFor(whatWasSeenLastPeriod(lastPeriod, period), period);


    /*
     * THE NUMBER-BASED RULES ARE A SECOND SOURCE OF EVIDENCE (decision 57, item 4), wherever one
     * exists for the code the model found. Built once, lazily, from this person's own per-PERIOD
     * scores (never sessions - see period-of.ts), and only when a code with a rule actually comes
     * up, so a check-in with nothing to cross-check never pays for the extra query. The model's
     * reading stays the one thing that can surface a bad-faith code at all: this never runs before
     * the model has already spoken and, for bad faith, been confirmed - it only says, afterwards,
     * whether a second, independent read agrees.
     */
    let detectionInputCache: DetectionInput | null = null;
    const getDetectionInput = async (): Promise<DetectionInput> => {
      if (!detectionInputCache) detectionInputCache = await this.buildDetectionInputForParticipant(checkIn.participantId);
      return detectionInputCache;
    };
    const evidenceSourceFor = async (code: string): Promise<AnEvidenceSource | undefined> => {
      if (!PATTERN_DETECTORS[code]) return undefined;
      const ruleAgrees = detectPattern(code, await getDetectionInput());
      this.logger.log(
        ruleAgrees
          ? `Check-in ${checkInId}: ${code} backed by two separate reads of the record - the model's reading and the number-based rule.`
          : `Check-in ${checkInId}: ${code} backed by the model's reading only; the number-based rule did not confirm it on this person's per-period scores.`,
      );
      return ruleAgrees ? 'both' : 'model';
    };

    /*
     * READ FIVE TIMES, KEEP WHAT THREE AGREE ON (measured 30 September 2026 - see
     * PATTERN_DETECTION_STEADY_OPTIONS's neighbour, READS_PER_CHECK_IN, above). Each read goes
     * through exactly the same steps as before this change - whatOneReadKeeps runs the extraction
     * call and every filter in the same order, and only decides what a single read would keep,
     * without writing anything. The five run in parallel, at the steadiest setting the model has.
     */
    /* What each read left out because it rested on a record nobody holds, for one line at the end. */
    const leftOutForARecord: { code: string; observation: string }[][] = [];
    const detector = await this.theDetectorPrompt();
    const attempts = await Promise.allSettled(
      Array.from({ length: READS_PER_CHECK_IN }, () => {
        const leftOut: { code: string; observation: string }[] = [];
        leftOutForARecord.push(leftOut);
        return this.whatOneReadKeeps(checkInId, content, recogniseBlock, lastPeriod, statedGoals, getDetectionInput, whatThePersonSaid, leftOut, detector.content);
      }),
    );

    const succeeded: { code: string; observation: string }[][] = [];
    attempts.forEach((attempt, i) => {
      if (attempt.status === 'fulfilled') {
        succeeded.push(attempt.value);
      } else {
        this.logger.error(`Pattern extraction failed for check-in ${checkInId}, read ${i + 1} of ${READS_PER_CHECK_IN}: ${attempt.reason?.message}`);
      }
    });

    if (succeeded.length < READS_THAT_MUST_AGREE) {
      /* Fewer than three reads to agree on anything. Nothing is written, and the check-in is left
         unmarked so the nightly sweep (patterns.cron.ts) retries it rather than treating a run of
         bad luck against the model as "nothing here". */
      this.logger.error(`Pattern extraction: only ${succeeded.length} of ${READS_PER_CHECK_IN} reads succeeded for check-in ${checkInId}; leaving it unanalysed for the nightly sweep to retry.`);
      return;
    }

    /*
     * EACH BAD-FAITH CODE IS CONFIRMED ONCE, NOT ONCE PER READ (2 November 2026). The confirming
     * call used to run inside every read for every candidate, so one code was confirmed up to ten
     * times in a check-in on slightly different wordings of the same observation (13.8 calls a
     * check-in). Now each distinct code that at least two reads kept, the least that could ever be
     * split or counted, is confirmed once on the first observation that kept it, and a code the
     * verifier rejects leaves every read. The vote, the split and the settle then run on exactly
     * the codes they did before.
     */
    const verdicts = await this.confirmEachCodeOnce(checkInId, succeeded);
    const confirmedOnly = (reads: { code: string; observation: string }[][]) =>
      reads.map((read) => read.filter((d) => !isBadFaithCode(d.code) || verdicts.get(d.code) === true));
    succeeded.splice(0, succeeded.length, ...confirmedOnly(succeeded));

    /* Count how many of the successful reads kept each code (one vote per read), keeping the
       observation from the first of the five, in order, that kept it. */
    const firstVotes = votesOf(succeeded);

    /*
     * A PERIOD THE READS WERE SPLIT ON IS SETTLED ONCE, ON MORE OF THE SAME EVIDENCE. Where two or
     * three of the five kept a code on a pattern not yet shown, the check-in is read five more times,
     * the same way, and that code is decided on all ten by majority, a tie going the way the first
     * five went. See
     * a-period-at-the-line-is-settled-on-all-the-evidence.
     */
    const countedSoFar = new Map<string, number[]>();
    if ([...firstVotes.values()].some(({ count }) => theReadsWereSplit(count, READS_THAT_MUST_AGREE))) {
      const rows = await this.prisma.patternDetection
        .findMany({ where: { participantId: checkIn.participantId }, select: { code: true, seenInSessions: true } })
        .catch(() => [] as { code: string; seenInSessions: number[] }[]);
      for (const r of rows ?? []) countedSoFar.set(r.code, r.seenInSessions ?? []);
    }
    const toSettle = (code: string, count: number) =>
      theReadsWereSplit(count, READS_THAT_MUST_AGREE) && couldChangeWhatIsShown(countedSoFar.get(code) ?? [], period, PERIODS_BEFORE_A_PATTERN_IS_SHOWN);
    const more: { code: string; observation: string }[][] = [];
    if ([...firstVotes].some(([code, { count }]) => toSettle(code, count))) {
      const moreAttempts = await Promise.allSettled(
        Array.from({ length: MORE_READS_WHEN_SPLIT }, () => {
          const leftOut: { code: string; observation: string }[] = [];
          leftOutForARecord.push(leftOut);
          return this.whatOneReadKeeps(checkInId, content, recogniseBlock, lastPeriod, statedGoals, getDetectionInput, whatThePersonSaid, leftOut, detector.content);
        }),
      );
      moreAttempts.forEach((attempt, i) => {
        if (attempt.status === 'fulfilled') more.push(...confirmedOnly([attempt.value]));
        else this.logger.warn(`Pattern extraction failed for check-in ${checkInId}, extra read ${i + 1} of ${MORE_READS_WHEN_SPLIT}: ${attempt.reason?.message}`);
      });
    }

    const countsThisPeriod = whatCountsThisPeriod(succeeded, more, toSettle, READS_THAT_MUST_AGREE);
    /* One line for each code either rule kept from counting, so a run shows what each one drops (2 October 2026). */
    for (const letGo of whatTheSettlingLetGo(succeeded, more, toSettle, READS_THAT_MUST_AGREE)) {
      this.logger.log(aLineForWhatTheSettlingLetGo(checkInId, period, letGo, succeeded.length));
    }
    for (const took of whatTheRecordRuleTookOut(leftOutForARecord, countsThisPeriod.keys())) {
      this.logger.log(aLineForWhatTheRecordRuleTookOut(checkInId, period, took, succeeded.length + more.length));
    }
    for (const [code, { observation, votes, reads, settled }] of countsThisPeriod) {
      if (settled) this.logger.log(`Check-in ${checkInId}: ${code} was kept by ${votes} of ${reads} reads after the first five were split, so it counts for period ${period}.`);
      if (isPositiveCode(code)) {
        await this.observePositive(checkIn.groundId, checkIn.participantId, code, observation, period, await evidenceSourceFor(code), detector.id);
      } else {
        await this.observe(checkIn.groundId, checkIn.participantId, code, observation, period, await evidenceSourceFor(code), detector.id);
      }
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
   * WHAT ONE READ OF THIS CHECK-IN WOULD KEEP, without writing anything.
   *
   * One extraction call at the steady setting, then the same filters in the same order this method
   * always ran, when it ran once: the borrowed-evidence check, the positive-code short road (M1
   * against a stated goal, then "does this say something checkable"), carrying codes (no
   * confirmation) and the F1
   * composite gate. Five calls to this, run in parallel, are how analyzeCheckIn reads a check-in
   * five times; a code is only written once at least three of the five keep it.
   */
  private async whatOneReadKeeps(
    checkInId: string,
    content: string,
    recogniseBlock: string,
    lastPeriod: { code: string; observationText: string | null; lastPeriodNumber: number | null }[],
    statedGoals: string[],
    getDetectionInput: () => Promise<DetectionInput>,
    whatThePersonSaid: string[] = [],
    leftOutForARecord: { code: string; observation: string }[] = [],
    detectorPrompt: string = PATTERN_DETECTION_PROMPT,
  ): Promise<{ code: string; observation: string }[]> {
    const kept: { code: string; observation: string }[] = [];

    const result = await this.anthropic.extract<{ detections: { code: string; observation: string }[] }>(
      detectorPrompt + recogniseBlock,
      [{ role: 'user', content }],
      PATTERN_DETECTION_SCHEMA,
      PATTERN_DETECTION_STEADY_OPTIONS,
    );

    for (const d of result?.detections ?? []) {
      if (!d.observation?.trim()) continue;

      /* The transcript the detector reads has Groundwork's own lines in it, and a record the conversation
         invented ("the record shows no payments") became a finding that somebody was not honest. A
         pattern rests only on what the record holds. See a-pattern-does-not-rest-on-a-record-nobody-holds. */
      if (restsOnARecordNobodyHolds(d.observation, whatThePersonSaid)) {
        this.logger.log(`Check-in ${checkInId}: ${d.code} dropped; it rests on a record this person's record does not hold.`);
        leftOutForARecord.push({ code: d.code, observation: d.observation.trim() });
        continue;
      }

      /* The steer recognised something and wrote it up under the wrong code. See
         the-detector-has-no-memory-of-last-period.evidenceBorrowedFromAnotherCode. */
      const borrowedFrom = evidenceBorrowedFromAnotherCode(d.observation, d.code, lastPeriod);
      if (borrowedFrom) {
        this.logger.log(`Check-in ${checkInId}: ${d.code} dropped; its evidence is ${borrowedFrom}'s own words from a recent period, not a fresh reading of this one.`);
        continue;
      }

      /*
       * THE GOOD ONES TAKE THE SHORT ROAD, WHICH IS THE PRODUCT'S OWN RULE.
       *
       * "Positive patterns do not require three periods. Surface them immediately when seen" -
       * the conversation prompt has said that for the product's whole life, and observePositive
       * has existed to do it.
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
        kept.push({ code: d.code, observation: d.observation.trim() });
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
        kept.push({ code: d.code, observation: d.observation.trim() });
        continue;
      }
      if (!isBadFaithCode(d.code)) continue;
      /* The confirming call is not made here: a code is confirmed once per check-in, across all the
         reads (analyzeCheckIn, confirmEachCodeOnce), not once in every read that kept it. */

      // Gap #30 - F1 composite gate: F1 (Insight Without Operation) requires
      // ALL four conditions (high thinking-language, low output-language,
      // pattern sustained 3 periods, no change after prior surfacing). The AI
      // extraction pass can flag F1 too early; we enforce the composite rule
      // here using per-participant historical scores before accepting the signal.
      if (d.code === 'F1') {
        const f1Input = await getDetectionInput();
        if (!checkF1Conditions(f1Input)) {
          this.logger.debug(`F1 gate: composite conditions not met for participant - skipping`);
          continue;
        }
      }

      kept.push({ code: d.code, observation: d.observation.trim() });
    }

    return kept;
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
  async observe(
    groundId: string,
    participantId: string,
    code: string,
    rawObservation: string,
    periodNumber: number,
    evidenceSource?: AnEvidenceSource,
    promptVersionId?: string | null,
  ) {
    /**
     * Strip the courtroom opener before it is stored, not on the way out.
     *
     * Every surface that reads an observation would otherwise have to remember
     * to do it, and one that forgets puts "The record shows..." back on screen.
     * Storing the plain sentence means there is only one place it can go wrong.
     */
    if (!(await thePersonJudgementsAreOnFor(this.prisma, groundId))) return null as any;
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
        evidenceSource: evidenceSource ?? null,
        ...(promptVersionId ? { promptVersionId } : {}),
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
        evidenceSource: mergedEvidenceSource(existing.evidenceSource as AnEvidenceSource | null, evidenceSource),
        ...(promptVersionId ? { promptVersionId } : {}),
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
    evidenceSource?: AnEvidenceSource,
    promptVersionId?: string | null,
  ) {
    if (!(await thePersonJudgementsAreOnFor(this.prisma, groundId))) return null as any;
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
          evidenceSource: evidenceSource ?? null,
        ...(promptVersionId ? { promptVersionId } : {}),
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
        evidenceSource: mergedEvidenceSource(existing.evidenceSource as AnEvidenceSource | null, evidenceSource),
        ...(promptVersionId ? { promptVersionId } : {}),
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
      select: { sessionNumber: true, completedAt: true, startedAt: true, createdAt: true, ground: { select: { cadence: true, cadenceDays: true } } },
    });
    const currentPeriod = latest
      ? periodOf({ sessionNumber: latest.sessionNumber, when: latest.completedAt ?? latest.startedAt ?? latest.createdAt }, latest.ground)
      : 0;

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
      /* A period spent on approved leave is not a period they went quiet in: the streak is paused,
         not broken (week 23). */
      if (lastP < currentPeriod && !(await this.wasAwayThisPeriod(det.participantId, latest?.createdAt ?? null))) {
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

  /** Whether this person had approved leave at any time since the period began (week 23). */
  private async wasAwayThisPeriod(participantId: string | null, since: Date | null): Promise<boolean> {
    if (!participantId) return false;
    const p = await this.prisma.groundParticipant
      .findUnique({ where: { id: participantId }, select: { userId: true, ground: { select: { organizationId: true } } } })
      .catch(() => null);
    if (!p?.userId) return false;
    const now = new Date();
    const start = since ?? new Date(now.getTime() - 7 * 86_400_000);
    return (await theirApprovedLeave(this.prisma as any, p.userId, p.ground?.organizationId ?? null)).some((l) => l.from <= now && l.to >= start);
  }

  /**
   * Gap #29 - detectConcentrationRisk(orgId):
   * Detects when a single person (by userId) appears as a participant in 3 or
   * more active grounds simultaneously within the same organisation. When
   * detected, creates a CONCENTRATION_RISK PatternDetection on one of those
   * grounds (the earliest) so it surfaces in the alignment feed.
   */
  async detectConcentrationRisk(orgId: string): Promise<void> {
    if (!(await thePersonJudgementsAreOn(this.prisma, orgId))) return;
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
          },
        },
      },
    });
    if (!ground) return;
    /*
     * READ FROM THE ASSESSMENTS, AS EVERY OTHER PATTERN IS (issue 52, Hafsah, 4 November 2026). The definition is kept whole: who names
     * whom, a shared claim both frame as settled, and no independent anchor. What each person said is now their assessment's items,
     * through the one reader (theFactsOnRecord, as the lead reads them), and a claim with proof behind it is an anchor, as a line backed
     * by a document was. One source, so this can never read a line the board does not.
     */
    const facts = await theFactsOnRecord(this.prisma as any, { groundId, reader: { kind: 'the lead', judgements: true } }).catch(() => []);
    const saidBy = new Map<string, { text: string; proved: boolean }[]>();
    for (const f of facts) saidBy.set(f.participantId, [...(saidBy.get(f.participantId) ?? []), { text: f.words, proved: f.proved }]);
    const participants = ground.participants.map((p) => ({ ...p, recordEntries: saidBy.get(p.id) ?? [] }));

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
      p.recordEntries.some((r: any) => r.proved) ||
      ground.documents.some((d: any) => d.participantId === p.id);

    const eligible = participants.filter((p) => (p.checkIns?.length ?? 0) >= 3);
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
          ? participants.some(
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
        // The cheap rule gate and the model's own confirmation both had to agree to reach here.
        await this.observe(groundId, anchorId, 'COLLUSION_RISK', observationText, period, 'both');
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
  /**
   * A PARTICIPANT'S OWN RECORD, AS A `DetectionInput` OF PER-PERIOD SCORES (decision 57, item 4).
   *
   * Was `buildF1Input`, one code's private helper, keyed by session. Every detector that reads a
   * score series (`D`-`K` bad-faith codes, `M1`/`R3`'s siblings, `F1`-`F5`) needs the same shape, so
   * this builds it once for whichever code asks. Grouped by PERIOD, never by session (`period-of.ts`,
   * decision 57 item 1): a daily ground's several sessions inside one calendar week are the one
   * period the three-period rule means, so their scores are averaged into it rather than counted as
   * three separate weeks of evidence.
   */
  private async buildDetectionInputForParticipant(participantId: string): Promise<DetectionInput> {
    const [participant, checkIns] = await Promise.all([
      this.prisma.groundParticipant.findUnique({
        where: { id: participantId },
        select: { roleAsDescribed: true, ground: { select: { cadence: true, cadenceDays: true } } },
      }),
      this.prisma.checkIn.findMany({
        where: { participantId, status: CheckInStatus.COMPLETED },
        orderBy: { sessionNumber: 'asc' },
        select: {
          sessionNumber: true, completedAt: true, startedAt: true, createdAt: true,
          recordEntries: { select: { text: true } },
        },
      }),
    ]);

    const byPeriod = new Map<number, { texts: string[]; thinking: number[]; output: number[]; meeting: number[]; specificity: number[] }>();
    for (const ci of checkIns) {
      const period = periodOf(
        { sessionNumber: ci.sessionNumber, when: ci.completedAt ?? ci.startedAt ?? ci.createdAt },
        participant?.ground,
      );
      const periodText = ci.recordEntries.map((r) => r.text).join(' ');
      const intake = runIntake(periodText);
      const bucket = byPeriod.get(period) ?? { texts: [], thinking: [], output: [], meeting: [], specificity: [] };
      bucket.texts.push(periodText);
      bucket.thinking.push(intake.thinkingScore);
      bucket.output.push(intake.outputScore);
      bucket.meeting.push(intake.meetingScore);
      bucket.specificity.push(intake.specificity);
      byPeriod.set(period, bucket);
    }

    const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
    const orderedPeriods = [...byPeriod.keys()].sort((a, b) => a - b);
    const submissions: string[] = [];
    const thinkingScore: number[] = [];
    const outputScore: number[] = [];
    const meetingScore: number[] = [];
    const specificityScores: number[] = [];
    for (const p of orderedPeriods) {
      const bucket = byPeriod.get(p)!;
      submissions.push(bucket.texts.join(' '));
      thinkingScore.push(avg(bucket.thinking));
      outputScore.push(avg(bucket.output));
      meetingScore.push(avg(bucket.meeting));
      specificityScores.push(avg(bucket.specificity));
    }

    // Collect codes already surfaced for this participant (F1's condition 4).
    const surfaced = await this.prisma.patternDetection.findMany({
      where: { participantId, status: PatternStatus.SURFACED },
      select: { code: true },
    });
    const priorSurfacedCodes = surfaced.map((s) => s.code);

    return {
      submissions, thinkingScore, outputScore, meetingScore, specificityScores,
      role: participant?.roleAsDescribed ?? undefined,
      priorSurfacedCodes,
    };
  }

  /**
   * Ask the AI to confirm a single candidate pattern detection before saving.
   * Returns true only if the model answers YES. Any other response or an error
   * is treated as rejection so we fail safely (no false positives).
   *
   * The excerpt is the observation text produced by the batch extraction step -
   * a plain-language description of what the record shows, never a verdict.
   */
  /**
   * One confirming call for each distinct bad-faith code that at least two reads kept, on the first
   * observation that kept it. A code fewer reads kept can never be split or counted, so it is not
   * asked about and leaves the reads with the rejected ones. An error counts as a NO, as it always has.
   */
  private async confirmEachCodeOnce(checkInId: string, reads: { code: string; observation: string }[][]): Promise<Map<string, boolean>> {
    const asked = [...votesOf(reads)].filter(([code, { count }]) => isBadFaithCode(code) && count >= READS_THAT_MUST_AGREE - 1);
    const answers = await Promise.all(
      asked.map(([code, { observation }]) =>
        this.confirmDetection(code, observation, PATTERN_DETECTION_STEADY_OPTIONS).catch((err) => {
          this.logger.warn(`Check-in ${checkInId}: pattern confirmation skipped for ${code}: ${err.message}`);
          return false;
        }),
      ),
    );
    return new Map(asked.map(([code], i) => [code, answers[i]]));
  }

  private async confirmDetection(code: string, excerpt: string, options: { temperature?: number; seed?: number } = {}): Promise<boolean> {
    const description = CODE_DESCRIPTIONS.get(code) ?? code;
    const systemPrompt =
      'You are a pattern-detection verifier. Answer only YES or NO. No explanation. No preamble.';
    const question = `Does this text exhibit pattern ${code} (${description})?\nText: ${excerpt}\nAnswer YES or NO.`;

    const reply = await this.anthropic.respond(systemPrompt, [{ role: 'user', content: question }], options);
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
      data: { personAnswer: words, personAnsweredAt: now },
      select: PATTERN_ROW_SELECT,
    });
    const ground = row.participant.ground;
    const lead = ground?.participants?.find((p) => p.userId === ground.initiatorId);
    return servedPatterns([saved], reader, { now, leadName: theFirstNameFrom(lead?.user?.firstName, lead?.user?.lastName), leadParticipantId: lead?.id ?? null })[0];
  }

  /**
   * "AFTER TALKING A PATTERN THROUGH, THE LEAD MARKS IT RIGHT, WRONG OR NOT SURE" (decision 57, item 2), and "AND CAN MARK 'WE
   * TALKED ABOUT IT'" (item 3). The lead reads what the record shows about each person (layer 2) and marks that: see
   * the-leads-mark-on-a-pattern.ts. A stored pattern is read only by the person it is about, so nobody else marks one.
   */
  async markAsTheLead(id: string, userId: string, mark: ALeadPatternMark): Promise<AServedPattern> {
    if (!PATTERNS_ARE_SERVED) throw new ForbiddenException('Only the person who runs this check-in can do that.');
    return theLeadMarksAPatternAcrossTime(this.prisma, id, userId, { mark });
  }

  async markTalkedAbout(id: string, userId: string): Promise<AServedPattern> {
    if (!PATTERNS_ARE_SERVED) throw new ForbiddenException('Only the person who runs this check-in can do that.');
    return theLeadMarksAPatternAcrossTime(this.prisma, id, userId, { talkedAbout: true });
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
