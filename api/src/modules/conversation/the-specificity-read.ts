import { runIntake } from './intake';
import { mapSpecificityLevel, NOTHING_SAID, rankOf, SpecificityLevel, whatWasSaidOnce, atLeastMet } from './how-checkable-a-session-was';

/**
 * THE PERSON'S OWN READ OF ONE CHECK-IN, FROM WHAT THEY TYPED. One function, so the read written when a
 * check-in completes and the read a stored session is brought up to date with are the same rule
 * (request 103). It reads only the person's own turns, and whether they attached a document to this
 * check-in since it started.
 */
export interface TheSpecificityRead {
  level: SpecificityLevel;
  dimensions: Record<string, SpecificityLevel>;
}

export function readTheTurns(turns: string[], attachedADocument: boolean): TheSpecificityRead {
  if (turns.length === 0) {
    /* One verdict about nothing, not two: the level and every dimension are the bottom. */
    const dims = { delivery: NOTHING_SAID, evidence: NOTHING_SAID, enablement: NOTHING_SAID, coverage: NOTHING_SAID, commitment: NOTHING_SAID };
    return { level: NOTHING_SAID, dimensions: dims };
  }

  const all = turns.map((t) => runIntake(t));
  /*
   * A RELUCTANT PERSON GIVES ONE FACT PER TURN, AND THE MEAN PUNISHED THEM FOR IT. "Forty tonnes a
   * week." "October." "Six of them." were three checkable answers between six "fine"s and "no"s,
   * and the mean over nine turns came out under the bottom cut: "managed", "nothing checkable", on
   * a rice miller who had named his tonnage, his month and his headcount (adversarial run, 20 Sep
   * 2026). The level is read over the turns that said anything - a bare "no" or "fine" is a turn
   * of the conversation, not a turn of the account - and whether ANY turn was checkable is kept
   * as its own fact, because that is the question the board asks.
   */
  const substantive = all.filter((r, i) => r.checkable || (turns[i] ?? '').trim().split(/\s+/).length > 3);
  const intakes = substantive.length ? substantive : all;
  const anyCheckable = all.some((r) => r.checkable);
  const n = intakes.length;
  const avgSpecificity = intakes.reduce((s, r) => s + r.specificity, 0) / n;

  // Five dimensions derived from runIntake() aggregates.
  const avgDelivery = intakes.reduce((s, r) => s + r.outputScore, 0) / n;
  const avgEnablement = intakes.reduce((s, r) => s + r.thinkingScore, 0) / n;
  const coverageScore = Math.min(1, (intakes.filter((r) => r.types.includes('absorption') || r.types.includes('rescue')).length / n) * 1.5);
  const commitScore = intakes.filter((r) => r.types.includes('movement')).length / n;

  /* Two of the five read as the Done page names them: said once is there (request 45). */
  const saidOnce = whatWasSaidOnce(turns, attachedADocument);

  const dimensions: Record<string, SpecificityLevel> = {
    delivery: mapSpecificityLevel(avgDelivery),
    evidence: atLeastMet(mapSpecificityLevel(avgSpecificity), anyCheckable || saidOnce.aDateNumberOrDocument),
    enablement: atLeastMet(mapSpecificityLevel(avgEnablement), saidOnce.whatTheyWereWaitingOn),
    coverage: mapSpecificityLevel(coverageScore),
    commitment: mapSpecificityLevel(commitScore),
    /* Kept as a level so the column's type holds: 'specific' means at least one turn could be checked. */
    checkable: anyCheckable ? 'specific' : NOTHING_SAID,
  };

  return {
    /* A session with a checkable turn in it is never "nothing checkable was said". */
    level: anyCheckable && mapSpecificityLevel(avgSpecificity) === NOTHING_SAID ? 'vague' : mapSpecificityLevel(avgSpecificity),
    dimensions,
  };
}

/**
 * A STORED READ BROUGHT UP TO THE CURRENT RULE, NEVER LOWERED (request 103).
 *
 * Sessions scored before request 45's fix (29 September) keep the old read of "One date, number or
 * document" and "What you were waiting on, and from whom", so the Done page says "Groundwork did not
 * pick this up this time." about a date the person gave. Each part is raised to what the current rule
 * reads from the same turns, where that is higher, and is never lowered: a part the old rule read
 * higher stays as it was. A part the stored read did not have is left out, so the shape of the row is
 * kept. Returns null when nothing would change.
 */
export function raisedToTheCurrentRule(
  stored: Record<string, unknown> | null | undefined,
  now: Record<string, SpecificityLevel>,
): { dimensions: Record<string, unknown>; raised: string[] } | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
  const out: Record<string, unknown> = { ...stored };
  const raised: string[] = [];
  for (const [part, was] of Object.entries(stored)) {
    const fresh = now[part];
    const wasRank = rankOf(typeof was === 'string' ? was : null);
    const freshRank = rankOf(fresh);
    if (freshRank === null || wasRank === null) continue;
    if (freshRank > wasRank) {
      out[part] = fresh;
      raised.push(part);
    }
  }
  return raised.length ? { dimensions: out, raised } : null;
}
