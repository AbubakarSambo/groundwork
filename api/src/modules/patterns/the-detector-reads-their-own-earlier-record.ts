import { periodOf } from './period-of';

/**
 * WHAT THIS PERSON THEMSELVES RECORDED IN THE LAST TWO PERIODS, FOR THE CODES THAT ONLY SHOW OVER TIME.
 *
 * Measured 30 September 2026 (decisions 55 and 68). Reading the same check-in fourteen times, the
 * codes that came and went most were the ones that can only be judged across time: the same problem
 * raised again and never fixed (K3), more than once (B2), research that keeps going and no decision
 * comes (B6). The detector saw one check-in and only the CODES seen last period, never what the
 * person had actually said, so for these it guessed, and guessed differently each read.
 *
 * This gives it the evidence instead of a guess. It removes, weakens and merges nothing.
 *
 * ONLY THIS PERSON'S OWN RECORD. The query that feeds this is filtered to the person's own
 * participantId, and a pattern shown to a person must never carry a colleague's words; this file
 * only formats what it is handed and adds nothing from anywhere else. Disputed lines are left out
 * by the query, as they count toward no read.
 *
 * Built once per check-in and handed, as the same text, to all five reads.
 */

export const EARLIER_RECORD_TYPES = ['COMMITMENT', 'PROGRESS', 'ASK', 'INTENT', 'WORRY', 'TENSION'] as const;

/** The most lines the detector is given, so a long history cannot crowd out the check-in itself. */
export const MOST_EARLIER_LINES = 30;
const HOW_MANY_PERIODS = 2;
const MOST_CHARACTERS_PER_LINE = 240;

export interface AnEarlierLine {
  type: string;
  text: string;
  createdAt?: Date | string | null;
  checkIn?: {
    sessionNumber: number;
    completedAt?: Date | null;
    startedAt?: Date | null;
    createdAt?: Date | null;
    ground?: { cadence?: string | null } | null;
  } | null;
}

/** What each kind of line means, in words the reader of the record already uses. */
const WHAT_IT_IS: Record<string, string> = {
  COMMITMENT: 'Promised',
  PROGRESS: 'Reported as done',
  ASK: 'Asked for',
  INTENT: 'Said they intended',
  WORRY: 'Raised as a worry or problem',
  TENSION: 'Named as a tension',
};

const tidy = (s: string) =>
  s.replace(/\[VERIFIABILITY:\w+\]\s*/g, '').replace(/\s+/g, ' ').trim().slice(0, MOST_CHARACTERS_PER_LINE);

export function theirOwnEarlierRecord(lines: AnEarlierLine[], thisPeriod: number): string {
  const withPeriod = (lines ?? [])
    .filter((l) => l?.checkIn && l.text?.trim() && WHAT_IT_IS[l.type])
    .map((l) => ({
      line: l,
      period: periodOf(
        { sessionNumber: l.checkIn!.sessionNumber, when: l.checkIn!.completedAt ?? l.checkIn!.startedAt ?? l.checkIn!.createdAt },
        l.checkIn!.ground,
      ),
    }))
    .filter((x) => x.period < thisPeriod);
  if (!withPeriod.length) return '';

  const periods = [...new Set(withPeriod.map((x) => x.period))].sort((a, b) => b - a).slice(0, HOW_MANY_PERIODS);
  const out: string[] = [];
  for (const [i, p] of periods.entries()) {
    const label = p < 10000 ? `Period ${p}` : i === 0 ? 'The most recent earlier period' : 'The period before that';
    for (const x of withPeriod.filter((y) => y.period === p).sort((a, b) => +new Date(a.line.createdAt ?? 0) - +new Date(b.line.createdAt ?? 0))) {
      out.push(`- ${label}. ${WHAT_IT_IS[x.line.type]}: ${tidy(x.line.text)}`);
    }
  }
  /* Keep the newest lines if there are too many: the most recent period matters most. */
  const kept = out.slice(0, MOST_EARLIER_LINES);
  return (
    '\n\nWHAT THIS PERSON THEMSELVES RECORDED IN THE LAST TWO PERIODS, from their own earlier check-ins (never anybody else\'s). ' +
    'Use it only to tell whether something in THIS period is a repeat: the same problem raised before and still open, a promise made before and not kept, research or options still open with no decision. ' +
    'It is not evidence on its own. A code that needs history counts only when this period\'s check-in shows it again.\n' +
    kept.join('\n')
  );
}

export const earlierRecordQuery = (participantId: string, sessionNumber: number) => ({
  where: {
    participantId,
    disputedAt: null,
    type: { in: [...EARLIER_RECORD_TYPES] as any },
    checkIn: { sessionNumber: { lt: sessionNumber } },
  },
  orderBy: { createdAt: 'desc' as const },
  take: 120,
  select: {
    type: true, text: true, createdAt: true,
    checkIn: { select: { sessionNumber: true, completedAt: true, startedAt: true, createdAt: true, ground: { select: { cadence: true } } } },
  },
});
