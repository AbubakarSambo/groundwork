/**
 * ONE THING, ONE COUNT (review of 1 October 2026).
 *
 * The sales board listed the team's target of 40 approved facilities three times: once as the lead
 * said it ("I'm aiming for 40 approved facilities this quarter."), once as the team's target ("The
 * team has a target of 40 approved facilities."), and once as the lead's own row ("approved
 * facilities", 40). Each row kept its own count, so the lead and every participant read "0 at the
 * start, 0 now, said 40." and "0 at the start, 11 now, said 40." about the same 40.
 *
 * Rows are the same thing when they aim at the same number, belong to the same person (a target
 * held by the lead is the team's), and measure the same thing: once the words that only carry the
 * sentence are taken away ("I'm aiming for", "the team has a target of", "this quarter"), the words
 * of one are all in the other. Two people with 14 each are two things, because they belong to two
 * people. "40 approved facilities" and "40 disbursed facilities" are two things, because neither
 * holds all the other's words.
 *
 * The row that has moved furthest is the one kept, since it holds the latest count anybody gave; the
 * others are named on it in `sameThingAs`, so nothing is lost from the record.
 */
export interface AnObjectiveRow {
  id: string;
  name: string;
  count: number;
  target: number | null;
  ownerParticipantId: string | null;
}

/* Words that carry the sentence and say nothing about what is counted. */
const CARRIES_THE_SENTENCE = new Set([
  'i', "i'm", 'im', 'we', "we're", 'our', 'my', 'the', 'a', 'an', 'of', 'for', 'to', 'by', 'in', 'on', 'at', 'and', 'is', 'are', 'be',
  'aiming', 'aim', 'aims', 'target', 'targets', 'goal', 'goals', 'team', "team's", 'teams', 'has', 'have', 'get', 'reach', 'hit', 'want',
  'this', 'that', 'quarter', 'month', 'year', 'week', 'period', 'end', 'total', 'overall', 'so', 'far', 'set', 'our',
]);

function whatIsCounted(name: string): Set<string> {
  return new Set(
    String(name ?? '')
      .toLowerCase()
      .replace(/[“”"'.,!?:;()]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !CARRIES_THE_SENTENCE.has(w) && !/^[n₦$£€]?\d[\d,.]*(?:m|k|bn|million|thousand)?$/.test(w)),
  );
}

const within = (a: Set<string>, b: Set<string>) => [...a].every((w) => b.has(w));

export function oneCountPerThing<T extends AnObjectiveRow>(rows: T[], leadParticipantId: string | null): (T & { sameThingAs?: string[] })[] {
  if (!Array.isArray(rows) || rows.length < 2) return rows;
  const whose = (r: T) => (r.ownerParticipantId && r.ownerParticipantId !== leadParticipantId ? r.ownerParticipantId : 'the team');
  const groups: T[][] = [];
  for (const row of rows) {
    const words = whatIsCounted(row.name);
    const home = row.target == null || !words.size
      ? null
      : groups.find((g) => g.some((o) => {
        if (o.target !== row.target || whose(o) !== whose(row)) return false;
        const theirs = whatIsCounted(o.name);
        return theirs.size > 0 && (within(words, theirs) || within(theirs, words));
      }));
    if (home) home.push(row);
    else groups.push([row]);
  }
  if (groups.every((g) => g.length === 1)) return rows;
  const keep = new Map<string, string[]>();
  for (const g of groups) {
    if (g.length === 1) continue;
    /* The furthest count is the latest anybody gave; on a tie, the first written. */
    const kept = g.reduce((best, r) => (Number(r.count ?? 0) > Number(best.count ?? 0) ? r : best), g[0]);
    keep.set(kept.id, g.filter((r) => r.id !== kept.id).map((r) => r.id));
  }
  const dropped = new Set([...keep.values()].flat());
  return rows
    .filter((r) => !dropped.has(r.id))
    .map((r) => (keep.has(r.id) ? { ...r, sameThingAs: keep.get(r.id)! } : r));
}
