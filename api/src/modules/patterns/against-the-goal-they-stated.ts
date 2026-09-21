/**
 * "DELIVERS SPECIFIC OUTPUTS AGAINST STATED GOALS" HAS TO BE AGAINST THE GOAL THEY STATED.
 *
 * Adversarial run 2, 20 Sep 2026, loan cohort. Grace took a tractor loan to farm her own maize; her
 * maize fell by a third and she repaid early by hiring the tractor out. Halima's stated goal was 400
 * eggs a day from 500 birds; she was at 200 from 260. Both got M1, Directional Executor: "delivers
 * specific outputs against stated goals". The detector reads one period's transcript and record and
 * had never been shown the goal, so "against stated goals" meant "against whatever they said this
 * week".
 *
 * Two things follow. The detector is shown what the person said this was FOR, from their earlier
 * sessions. And M1 is kept only when its observation shares a word with one of those statements:
 * an output about the tractor's hire income is not an output against a goal about maize.
 */

const STOP = new Set([
  'that', 'this', 'with', 'from', 'have', 'will', 'been', 'they', 'them', 'their', 'there', 'what', 'when', 'where', 'which', 'would',
  'could', 'should', 'about', 'into', 'over', 'more', 'most', 'some', 'than', 'then', 'also', 'just', 'like', 'make', 'making', 'sure',
  'always', 'goal', 'goals', 'target', 'targets', 'main', 'thing', 'want', 'need', 'going', 'time', 'session', 'period', 'record',
  'still', 'because', 'very', 'really', 'being', 'doing', 'done', 'well', 'good', 'much', 'many', 'every', 'each', 'other', 'only',
  'stated', 'specific', 'outputs', 'output', 'delivers', 'delivered', 'against', 'evidence', 'verifiable', 'person', 'their', 'they',
]);

export const wordsOf = (text: string): Set<string> =>
  new Set(
    (text ?? '')
      .toLowerCase()
      .replace(/\[verifiability:\w+\]|\[inferred:[^\]]*\]/g, '')
      .match(/[a-z]{4,}/g)
      ?.map((w) => w.replace(/(ing|ed|es|s)$/, ''))
      .filter((w) => w.length >= 3 && !STOP.has(w)) ?? [],
  );

/**
 * Does this observation speak to any of the goals they stated? With no goal on record there is nothing
 * to have delivered against, so the answer is no: run 3 (20 Sep 2026) credited "delivers against
 * stated goals" in session one, where no goal from an earlier period could exist, on the strength of
 * two drafted proposals.
 */
export function isAgainstAGoalTheyStated(observation: string, statedGoals: string[]): boolean {
  const goals = (statedGoals ?? []).filter((g) => g?.trim());
  if (!goals.length) return false;
  const obs = wordsOf(observation);
  return goals.some((g) => [...wordsOf(g)].some((w) => obs.has(w)));
}

/** The block the detector reads, so "stated goals" means the goals actually stated. */
export function whatTheySaidThisWasFor(statedGoals: string[]): string {
  const goals = (statedGoals ?? []).filter((g) => g?.trim());
  if (!goals.length) return '';
  return (
    '\n\nWHAT THIS PERSON SAID THIS WAS FOR, in earlier periods. "Against stated goals" means against THESE, not against whatever they said this period:\n' +
    goals.map((g) => `- ${g.replace(/\[VERIFIABILITY:\w+\]\s*/g, '').replace(/\s+/g, ' ').trim()}`).join('\n')
  );
}
