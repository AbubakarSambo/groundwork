/**
 * NO READER IS SENT A RATING OF A PERSON (screens request 111 (a), decisions 11, 38 and 43).
 *
 * Read on the sales board ("Sales team, Q3"), 2 October 2026: Amani's own board answer carried
 * `coverage.reads[].confidence: 0.15`, `pct: 0` and `contribution[].confidence: 0`, and the lead's
 * answer carried the same `confidence`, `pct`, `evidenceCount` and `basis` for every person. The
 * screen drew none of them, but they were sent. Hafsah's rule: leads never see how a person's
 * answers were rated, and nothing rates a person.
 *
 * Why they were sent: the reads in reads.ts spread `...confidenceOf(...)` into every row, and the
 * board passed each row through whole. So the rows are now built from a list of what may be served
 * (an allow-list), and a field added to a read later reaches nobody until somebody adds it here.
 *
 * What the engine keeps: every rating is still worked out in reads.ts and used there, to decide
 * whether a read is too thin to show (`shown`). Only the serving changes.
 *
 * What a person still reads about their own answers (decision 38: "A person may still see the read
 * of their own answers"): the words of their own contribution read and what it rests on (`reason`,
 * `basis`). Never a number: no confidence, no count of evidence, no percentage.
 */

/** Numbers that rate a person or how sure the engine is about a read of a person. Never served. */
export const A_RATING_NUMBER = ['confidence', 'evidenceCount', 'pct', 'score'] as const;

/** One read of where a person's work is landing, as it may be served to anybody. */
export interface CoverageAsServed {
  participantId: string;
  name: string | null;
  scope: string;
  kind?: string;
  trend?: string;
  what?: string;
  reason?: string;
  reasonText?: string;
  ownVoice?: string | null;
  coupledToBlocker?: boolean;
  remitDefined: boolean;
  shown: boolean;
  /** Only on the reader's own row: what the read rests on, in words. */
  basis?: string;
}

/**
 * Where work is landing, as this reader may be sent it.
 *
 * A read the engine judged too thin to show (`shown: false`) is sent as that, with nothing of what
 * it would have said: no kind, no sentence, no count. It was sent whole before, and only the screen
 * left it out.
 */
export function coverageAsThisReaderMayRead<T extends { scope?: string; reads?: any[] }>(
  coverage: T | undefined,
  meParticipantId: string | null,
): T | undefined {
  if (!coverage || !Array.isArray(coverage.reads)) return coverage;
  const reads: CoverageAsServed[] = coverage.reads.map((r: any) => {
    const own = !!meParticipantId && r.participantId === meParticipantId;
    const shown = r.shown !== false;
    if (!shown) {
      return { participantId: r.participantId, name: r.name ?? null, scope: r.scope, remitDefined: !!r.remitDefined, shown: false };
    }
    return {
      participantId: r.participantId,
      name: r.name ?? null,
      scope: r.scope,
      kind: r.kind,
      trend: r.trend,
      what: r.what,
      reason: r.reason,
      reasonText: r.reasonText,
      ownVoice: r.ownVoice ?? null,
      coupledToBlocker: !!r.coupledToBlocker,
      remitDefined: !!r.remitDefined,
      shown: true,
      ...(own && typeof r.basis === 'string' ? { basis: r.basis } : {}),
    };
  });
  return { ...coverage, reads } as T;
}

/**
 * THE NET UNDER EVERYTHING ELSE. Whatever a section of the board carries, a number that rates a
 * person is taken off before the board is sent. A board has no number by these names that is not a
 * rating of a person, so nothing a reader needs is lost; a new section that spreads a read into its
 * rows is caught here, and the test that serves every board as every reader finds it.
 */
export function withNoRatingNumber<T>(payload: T): T {
  const strip = (v: any): any => {
    if (Array.isArray(v)) return v.map(strip);
    if (!v || typeof v !== 'object') return v;
    /* Only plain objects are walked; a date or any other class instance is sent as it is. */
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return v;
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) {
      if ((A_RATING_NUMBER as readonly string[]).includes(k) && typeof x === 'number') continue;
      out[k] = strip(x);
    }
    return out;
  };
  return strip(payload) as T;
}
