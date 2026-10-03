/**
 * THE MODEL WROTE THE FIELD NAME INTO THE FIELD.
 *
 * A divergence is `{ topic, atStake, evidence, positions }`. The synthesis is meant to put a short
 * subject in `topic` and the consequence in `atStake`. Read on a real report, it put both in the
 * topic:
 *
 *   topic:   "Clarity on onboarding support. atStake: If this holds, the new coordinator may not
 *             get the foundational knowledge to perform his role..."
 *   atStake: "If this holds, the new coordinator may not get the foundational knowledge..."
 *
 * Three things follow, all of them visible to whoever opens the report. The words "atStake:" are
 * printed at a person. The consequence is said twice - once inside the heading and once under "why
 * it matters". And on the third divergence of that same report the model put it ONLY in the topic,
 * leaving `atStake` undefined, so that one has a heading three lines long and no "why it matters"
 * at all.
 *
 * It is worse further down. The session report builds sentences by lowercasing the topic and
 * wrapping it in a template, which turned it into:
 *
 *   "That clarity on onboarding support. atstake: if this holds, ... is settled - it may read
 *    differently from the other seat."
 *
 * REPAIRED AT THE READ, NOT ASKED FOR AGAIN IN THE PROMPT. The schema already says what each field
 * is for and the model wrote it this way anyway; a report that has already been generated is not
 * going to be regenerated because the wording improved. This is the same shape as the verifiability
 * marker and the bracketed insertions: machinery and mistakes come out where they are read, so
 * every reader of every existing report gets the fix.
 */

/** The field names the synthesis has been seen to write into a value. */
const A_FIELD_NAME = /\s*\b(atStake|at stake|whyItMatters|why it matters|evidence|positions|recommendedMove)\s*:\s*/i;

export interface ADivergence {
  topic?: string | null;
  atStake?: string | null;
  [k: string]: unknown;
}

/**
 * Split a topic that swallowed another field, and fill the empty field with what it swallowed.
 *
 * Only ever moves text sideways - nothing is invented and nothing is dropped. Where `atStake` is
 * already set, the tail is discarded as the duplicate it is; where it is empty, the tail is what
 * the model meant to put there and had put somewhere else.
 */
/*
 * AND IN THE EVIDENCE TOO (item 21, the engineering board). Ifeoma read, as the first line of evidence under a
 * difference, "atStake: If this holds, the project could be delivered on time according to your definition, but
 * fail ...". A line of evidence that opens with a field name loses the field name; where the difference has no
 * "what is at stake" of its own, the line is moved there, as the topic's tail is below.
 */
const A_FIELD_NAME_FIRST = /^\s*(?:atStake|at stake|whyItMatters|why it matters|evidence|positions|recommendedMove)\s*:\s*/i;
function theEvidenceWithoutFieldNames<T extends ADivergence>(d: T): T {
  const evidence = (d as any)?.evidence;
  if (!Array.isArray(evidence) || !evidence.some((e) => typeof e === 'string' && A_FIELD_NAME_FIRST.test(e))) return d;
  let atStake = (d.atStake ?? '').toString().trim();
  const kept: unknown[] = [];
  for (const e of evidence) {
    if (typeof e !== 'string' || !A_FIELD_NAME_FIRST.test(e)) { kept.push(e); continue; }
    const text = e.replace(A_FIELD_NAME_FIRST, '').trim();
    if (!text) continue;
    if (!atStake) { atStake = text; continue; }
    kept.push(text);
  }
  return { ...d, evidence: kept, atStake: atStake || d.atStake };
}

export function aFieldNameIsNotAHeading<T extends ADivergence>(input: T): T {
  const d = input ? theEvidenceWithoutFieldNames(input) : input;
  const topic = (d?.topic ?? '').trim();
  if (!topic) return d;
  const at = topic.search(A_FIELD_NAME);
  if (at < 0) return d;

  const head = topic.slice(0, at).replace(/[.:;,\s]+$/, '').trim();
  const tail = topic.slice(at).replace(A_FIELD_NAME, '').trim();

  /* A topic that is ONLY a field name and its value keeps its text rather than becoming empty: a
     heading nobody can read is worse than a long one. */
  if (!head) return d;

  return {
    ...d,
    topic: head,
    atStake: (d.atStake ?? '').toString().trim() || tail || d.atStake,
  };
}

export function everyDivergenceReadable<T extends ADivergence>(list: T[] | null | undefined): T[] {
  return (list ?? []).map(aFieldNameIsNotAHeading);
}
