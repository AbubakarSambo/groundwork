import { plainNameOf } from '../patterns/plain-pattern-names';
import { MIN_SIGNALS_BEFORE_A_WEIGHT_MOVES } from './a-suggested-weight';

/**
 * WHAT THE PLATFORM ADMIN READS ABOUT HOW WELL EACH PATTERN, STEP AND QUESTION IS WORKING.
 *
 * Counts in plain sentences, and the weight the counts suggest. No organisation's name or id, no
 * person, no words. The weight is a suggestion only: it changes nothing until the switch in
 * a-suggested-weight.ts is turned on, and the page says so.
 */
export interface LearningRow {
  kind: 'pattern' | 'coaching step' | 'question';
  what: string;
  /** Plain sentences, each a full sentence. */
  counts: string[];
  suggestedWeight: number;
  /** One full sentence on what the weight means, or why it has not moved. */
  weightSaid: string;
}

const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`;

export function whatAProbeSourceIs(key: string): string {
  const [source, rest] = [key.split(':')[0], key.slice(key.indexOf(':') + 1)];
  const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase();
  if (source === 'situation') return `The questions written for the situation "${pretty(rest)}"`;
  if (source === 'role') return `The neutral questions for the role "${pretty(rest)}"`;
  if (source === 'pattern') {
    const name = plainNameOf(rest)?.name ?? `the pattern ${rest}`;
    return `The question that goes with the pattern "${name}"`;
  }
  return key;
}

export function plainLearningRows(rows: any[]): LearningRow[] {
  return rows.map((r) => {
    const counts: string[] = [];
    let kind: LearningRow['kind'];
    let what: string;
    if (r.kind === 'PATTERN') {
      kind = 'pattern';
      what = plainNameOf(r.key)?.name ?? `The pattern ${r.key}`;
      counts.push(`Leads marked it right ${n(r.goodCount, 'time', 'times')}, wrong ${n(r.badCount, 'time', 'times')} and not sure ${n(r.unsureCount, 'time', 'times')}.`);
      counts.push(`${n(r.answeredCount, 'person answered', 'people answered')} when it was shown to them.`);
      counts.push(`Leads had the conversation in ${r.talkHappened} of ${r.talkDue} cases.`);
      counts.push(`After the conversation, it did not come back in ${r.changedCount} of ${r.changeJudged} cases that have had a later check-in.`);
    } else if (r.kind === 'COACHING_STEP') {
      kind = 'coaching step';
      what = r.key;
      counts.push(`It was offered ${n(r.talkDue, 'time', 'times')}, and ${r.talkHappened} of those have been asked about in a later check-in.`);
      counts.push(`Of those, it was done, or done and more, ${n(r.goodCount, 'time', 'times')}, it was not done ${n(r.badCount, 'time', 'times')}, and something else was done ${n(r.unsureCount, 'time', 'times')}.`);
    } else {
      kind = 'question';
      what = whatAProbeSourceIs(r.key);
      counts.push(`It was given to work from in ${n(r.judged, 'check-in', 'check-ins')} that were later read for how specific the answers were.`);
      counts.push(`The answers were specific ${n(r.goodCount, 'time', 'times')}, in between ${n(r.unsureCount, 'time', 'times')}, and vague ${n(r.badCount, 'time', 'times')}.`);
    }
    const weightSaid = r.weightMoved
      ? `Suggested weight ${r.suggestedWeight}, where 1 is neutral. This is a suggestion only and is not used yet.`
      : `Suggested weight 1, which is neutral. It stays there until at least ${MIN_SIGNALS_BEFORE_A_WEIGHT_MOVES} signals are in, and there are ${r.judged} so far.`;
    return { kind, what, counts, suggestedWeight: r.suggestedWeight, weightSaid };
  });
}
