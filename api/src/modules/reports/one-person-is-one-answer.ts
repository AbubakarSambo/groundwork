/**
 * ONE PERSON IS ONE ANSWER, HOWEVER MANY TIMES THEY CHECKED IN.
 *
 * Run live on 24 September 2026: a two-person check-in, a CEO and the consultant she hired, six
 * fortnights each. The report opened with "11 people answered this check-in", found that "no single
 * option had more than 20% of the vote", and recommended "a workshop to build a single stakeholder
 * map with all 11 people". There were two people.
 *
 * The judgement read one row per COMPLETED check-in, which is one row per person per session. It was
 * right on the hundred-person corpus by accident: everybody there answered once, so check-ins and
 * people were the same number. Put anybody on a fortnightly cadence and their own six answers become
 * six strangers who cannot agree with each other - the concentration collapses, every field reads
 * SPLIT, and the recommendation is a workshop with a population that does not exist.
 *
 * SO THE FOLD HAPPENS BEFORE THE ARITHMETIC, NEVER INSIDE IT. `whatTheNumbersSay` counts rows and
 * must go on counting rows; what changes is that a row is a person. The latest session wins each
 * field, because the point of checking in again is that the answer moved - "Lagos" in fortnight one
 * and "Lagos and Ogun" in fortnight five is one person's current answer, not a disagreement.
 *
 * AND `couldNotSay` DOES NOT SURVIVE AN ANSWER. Somebody who could not name a date in fortnight one
 * and named one in fortnight four has named one. The refusal is kept only where nothing later
 * replaced it, so "said they cannot" stays honest without holding the earliest answer against them.
 */
import type { AFittedAnswer, AFittedValue } from './fitting-an-answer-into-the-frame';

/** One fitted answer per session, in the order the sessions happened. */
export interface AnAnswerInItsSession extends AFittedAnswer {
  sessionNumber: number;
}

export function onePerPerson(answers: AnAnswerInItsSession[]): AFittedAnswer[] {
  const byPerson = new Map<string, AnAnswerInItsSession[]>();
  for (const a of answers) {
    if (!a?.participantId) continue;
    byPerson.set(a.participantId, [...(byPerson.get(a.participantId) ?? []), a]);
  }

  return [...byPerson.values()].map((theirs) => {
    const inOrder = [...theirs].sort((x, y) => (x.sessionNumber ?? 0) - (y.sessionNumber ?? 0));
    const latest = inOrder[inOrder.length - 1];

    /* Field by field, the last thing they said about it that said anything. */
    const values = new Map<string, AFittedValue>();
    for (const a of inOrder) {
      for (const v of a.values ?? []) {
        if (!v?.fieldId) continue;
        const held = values.get(v.fieldId);
        const saysSomething = !!v.value && !v.couldNotSay;
        /* An answer replaces anything. A refusal replaces only a refusal or an absence. */
        if (saysSomething || !held || (!held.value && !held.couldNotSay)) values.set(v.fieldId, v);
        else if (v.couldNotSay && !held.value) values.set(v.fieldId, v);
      }
    }

    return {
      participantId: latest.participantId,
      /* Identity from the latest session: a name or a kind given later is the one they settled on. */
      who: inOrder.map((a) => a.who).filter(Boolean).pop() ?? null,
      organisation: inOrder.map((a) => a.organisation).filter(Boolean).pop() ?? null,
      kind: inOrder.map((a) => a.kind).filter(Boolean).pop() ?? null,
      values: [...values.values()],
      /* The best they ever got to, not their average: the fold is what they have told us in total. */
      completeness: Math.max(...inOrder.map((a) => a.completeness ?? 0), 0),
      specificity: inOrder.map((a) => a.specificity).filter((s) => s !== null && s !== undefined).pop() ?? null,
      gaveEvidence: inOrder.some((a) => a.gaveEvidence),
    };
  });
}

/** How many people are in a set of answers. The number the table is allowed to print. */
export function howManyPeople(answers: { participantId: string }[]): number {
  return new Set(answers.map((a) => a.participantId).filter(Boolean)).size;
}
