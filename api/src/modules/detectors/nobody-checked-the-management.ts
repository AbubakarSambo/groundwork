/**
 * SENSE-CHECKING THE OBJECTIVES, AND TAKING THEM BACK TO WHOEVER SET THEM.
 *
 * §13 and §14. Everything else in this product examines how work is going; this examines whether
 * what is being asked for holds together at all, before a quarter is spent finding out.
 *
 * TWO THINGS I GOT WRONG THE FIRST TIME, both worth stating because they are easy to repeat.
 *
 * 1. I addressed every question to the person the objective was ABOUT. So when a lead set somebody a
 *    target with nothing to measure it by, the question went to the person who did not write it and
 *    could not answer it. A question about an objective belongs to whoever set it.
 *
 * 2. I read §14 - do not assume management is correct - as "do not look at who wrote it", and wrote a
 *    test forbidding this file from reading `authoredBy`. Those are opposite things. You can only
 *    check management's assumptions if you know which assumptions are management's, and §14 gets
 *    SHARPER with authorship, not weaker.
 *
 * The rule that actually holds is narrower: authorship decides WHO IS ASKED, never WHETHER. Nothing
 * here exempts an objective from a check because of who set it.
 *
 * AND IT PROPOSES, IT DOES NOT ONLY ASK. §13 says flag ambiguity rather than SILENTLY rewrite, and
 * "silently" is doing the work in that sentence. This product's pattern everywhere else is propose,
 * a human accepts, acceptance is recorded. A question with no suggested answer leaves the work
 * exactly where it was.
 *
 * WHAT KEEPS A PROPOSAL HONEST: every number in one has to come from somewhere real - a collective
 * target, live evidence, another objective. Where nothing supplies it, this asks instead of
 * inventing. The same discipline as the composer, which refuses any digit it was not given.
 */
import { ObjectiveKind, ObjectiveScope, ObjectiveCheck, ObjectiveDue } from '@prisma/client';

export type Objective = {
  externalId: string | null;
  /** Whose objective it is. */
  personExternalId: string;
  text: string;
  kind: ObjectiveKind | null;
  scope: ObjectiveScope | null;
  check: ObjectiveCheck | null;
  dueKind: ObjectiveDue | null;
  owedToPersonExternalId: string | null;
  seenBySubject: boolean;
  /** 'self', 'lead', or the name of the system that seeded it. */
  authoredBy: string;
  /** Who signed it off in the customer's system, when one did. */
  approvedByExternalId: string | null;
  /** Their manager, for when nobody else can be identified. */
  managerExternalId: string | null;
};

/** Who a question about this objective belongs to, and why that person. */
export type Addressed = { personExternalId: string | null; because: string };

/**
 * WHOEVER SET IT, THEN WHOEVER SIGNED IT OFF, THEN THEIR MANAGER, THEN THE LEAD.
 *
 * Four steps because each is a real situation. Somebody who wrote their own objective answers for it.
 * A seeded one belongs to whoever approved it in the customer's system. Where nobody did - an import
 * with no approver - the manager is the person who can actually change it. The lead is the last
 * resort so a question is never dropped for want of an addressee.
 */
export function addressee(o: Objective, leadExternalId: string | null): Addressed {
  if (o.authoredBy === 'self') {
    return { personExternalId: o.personExternalId, because: 'they set this themselves' };
  }
  if (o.approvedByExternalId) {
    return { personExternalId: o.approvedByExternalId, because: 'they approved it' };
  }
  if (o.authoredBy === 'lead' && leadExternalId) {
    return { personExternalId: leadExternalId, because: 'they lead this check-in and set this' };
  }
  if (o.managerExternalId) {
    return { personExternalId: o.managerExternalId, because: 'it came from a system with no approver named, and they manage the person it is about' };
  }
  return { personExternalId: leadExternalId, because: 'nobody is recorded as having set it' };
}

export type Question = {
  kind: 'unmeasurable' | 'no_date' | 'unowned' | 'unseen' | 'arithmetic' | 'duplicate_responsibility';
  /** Who this is for. Not who it is about. */
  addressedTo: string | null;
  addressedBecause: string;
  /** Whose objective it concerns, so a caller can show context without misdirecting the question. */
  aboutPersonExternalId: string | null;
  objectiveExternalIds: string[];
  asks: string;
  /**
   * A concrete corrected version, when one can be built from material that actually exists. Null
   * where it cannot: a proposal with an invented number is worse than a question.
   */
  proposes: string | null;
  /** Where every part of the proposal came from. Empty when there is no proposal. */
  basis: string[];
};

const numbersIn = (s: string): number[] =>
  (s.match(/\b\d{1,6}\b/g) ?? []).map(Number).filter((n) => n > 0);

/** Strip a trailing full stop so a proposal can be built onto the wording somebody already chose. */
const stem = (t: string) => t.trim().replace(/[.\s]+$/, '');

/**
 * A TARGET THAT CANNOT BE CHECKED IS A HOPE.
 *
 * The proposal only appears when another objective supplies the number - a collective target the
 * individual one is a share of, most often. With nothing to draw on it stays a question, because the
 * one thing worse than a vague target is a specific one somebody made up.
 */
export function unmeasurable(objectives: Objective[], lead: string | null = null): Question[] {
  const collective = objectives.filter(
    (o) => o.scope === ObjectiveScope.WHOLE_CHECK_IN && numbersIn(o.text).length,
  );
  return objectives
    .filter((o) => o.kind === ObjectiveKind.TARGET && o.check !== ObjectiveCheck.A_NUMBER && !numbersIn(o.text).length)
    .map((o) => {
      const to = addressee(o, lead);
      const share = collective[0];
      return {
        kind: 'unmeasurable' as const,
        addressedTo: to.personExternalId,
        addressedBecause: to.because,
        aboutPersonExternalId: o.personExternalId,
        objectiveExternalIds: [o.externalId ?? ''],
        asks: `"${o.text}" is recorded as a target, which means a number crosses a line. What number, and who reads it?`,
        proposes: share
          ? `${stem(o.text)}, measured against the shared target of ${Math.max(...numbersIn(share.text))}`
          : null,
        basis: share ? [`the number comes from the shared target: "${share.text}"`] : [],
      };
    });
}

/**
 * A DEADLINE THAT EXISTS IN SOMEBODY'S HEAD.
 *
 * Proposed only where another objective in the same set already carries a period - so the date is
 * the one the rest of the quarter is on, not one this invented.
 */
export function noDate(objectives: Objective[], lead: string | null = null): Question[] {
  const dated = objectives.find((o) => o.dueKind === ObjectiveDue.A_DATE || o.dueKind === ObjectiveDue.A_CYCLE);
  return objectives
    .filter((o) => o.kind === ObjectiveKind.TARGET || o.kind === ObjectiveKind.COMMITMENT)
    .filter((o) => !o.dueKind || o.dueKind === ObjectiveDue.NOT_SAID)
    .map((o) => {
      const to = addressee(o, lead);
      return {
        kind: 'no_date' as const,
        addressedTo: to.personExternalId,
        addressedBecause: to.because,
        aboutPersonExternalId: o.personExternalId,
        objectiveExternalIds: [o.externalId ?? ''],
        asks: `"${o.text}" has no date on it. By when, and does everybody waiting on it know that date?`,
        proposes: dated ? `${stem(o.text)}, on the same period as the rest of this check-in` : null,
        basis: dated ? [`the rest of this check-in runs to the period on "${dated.text}"`] : [],
      };
    });
}

export function unowned(objectives: Objective[], lead: string | null = null): Question[] {
  return objectives
    .filter((o) => o.kind === ObjectiveKind.COMMITMENT && !o.owedToPersonExternalId)
    .map((o) => {
      const to = addressee(o, lead);
      return {
        kind: 'unowned' as const,
        addressedTo: to.personExternalId,
        addressedBecause: to.because,
        aboutPersonExternalId: o.personExternalId,
        objectiveExternalIds: [o.externalId ?? ''],
        asks: `"${o.text}" is a commitment, so somebody is waiting on it. Who, and do they know?`,
        /* No proposal. Guessing who is owed a commitment invents a relationship between two people,
           which is the worst thing in this file to be wrong about. */
        proposes: null,
        basis: [],
      };
    });
}

/**
 * SOMEBODY HELD TO SOMETHING THEY HAVE NOT SEEN.
 *
 * Addressed to whoever set it, because they are the only person who can fix it - and it is the one
 * question here with a person on the wrong end of it while it goes unanswered.
 */
export function unseen(objectives: Objective[], lead: string | null = null): Question[] {
  return objectives
    .filter((o) => !o.seenBySubject && (o.kind === ObjectiveKind.TARGET || o.kind === ObjectiveKind.COMMITMENT))
    .map((o) => {
      const to = addressee(o, lead);
      return {
        kind: 'unseen' as const,
        addressedTo: to.personExternalId,
        addressedBecause: to.because,
        aboutPersonExternalId: o.personExternalId,
        objectiveExternalIds: [o.externalId ?? ''],
        asks: `Has "${o.text}" been shown to the person it is about? Nothing here will read them against it until it has.`,
        proposes: null,
        basis: [],
      };
    });
}

/**
 * THE SIX-EACH VERSUS TEN-COLLECTIVE PROBLEM.
 *
 * Nobody notices it in a planning meeting because the two numbers are said an hour apart. Both may be
 * deliberate - one a stretch, one the commitment - which is exactly why it is asked rather than
 * corrected, and why the proposal is to SAY which, rather than to change either number.
 */
export function arithmetic(objectives: Objective[], lead: string | null = null): Question[] {
  const individuals = objectives.filter(
    (o) => o.scope !== ObjectiveScope.WHOLE_CHECK_IN && o.kind === ObjectiveKind.TARGET && numbersIn(o.text).length,
  );
  const collective = objectives.filter(
    (o) => o.scope === ObjectiveScope.WHOLE_CHECK_IN && numbersIn(o.text).length,
  );
  if (!collective.length || individuals.length < 2) return [];

  const out: Question[] = [];
  for (const c of collective) {
    const target = Math.max(...numbersIn(c.text));
    const sum = individuals.reduce((n, o) => n + Math.max(...numbersIn(o.text)), 0);
    if (sum === target) continue;
    const to = addressee(c, lead);
    out.push({
      kind: 'arithmetic',
      addressedTo: to.personExternalId,
      addressedBecause: to.because,
      /* Nobody's. Attaching "your numbers do not add up" to a person turns a question about the plan
         into a question about them. */
      aboutPersonExternalId: null,
      objectiveExternalIds: [c.externalId ?? '', ...individuals.map((o) => o.externalId ?? '')],
      asks: `The individual targets add up to ${sum}, and the shared one is ${target}. Are these measuring different things, or is one of them the wrong number?`,
      proposes: `${stem(c.text)} - and say in the wording whether the individual targets of ${sum} are a stretch above it or the same clients counted twice`,
      basis: [
        `${sum} is the sum of the individual targets`,
        `${target} is the shared target as written`,
        'neither number is changed - what is proposed is saying which is which',
      ],
    });
  }
  return out;
}

export function duplicateResponsibility(objectives: Objective[], lead: string | null = null): Question[] {
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter((w) => w.length >= 4).sort().join(' ');
  const byShape = new Map<string, Objective[]>();
  for (const o of objectives.filter((x) => x.kind === ObjectiveKind.ROLE_EXPECTATION || x.kind === ObjectiveKind.COMMITMENT)) {
    const k = norm(o.text);
    if (!k) continue;
    (byShape.get(k) ?? byShape.set(k, []).get(k)!).push(o);
  }
  return [...byShape.values()]
    .filter((group) => new Set(group.map((o) => o.personExternalId)).size > 1)
    .map((group) => {
      const to = addressee(group[0], lead);
      return {
        kind: 'duplicate_responsibility' as const,
        addressedTo: to.personExternalId,
        addressedBecause: to.because,
        aboutPersonExternalId: null,
        objectiveExternalIds: group.map((o) => o.externalId ?? ''),
        asks: `${group.length} people are recorded with what looks like the same responsibility: "${group[0].text}". Is that shared on purpose, or does one of them own it?`,
        /* No proposal: choosing which of two people owns something is the decision, not the wording. */
        proposes: null,
        basis: [],
      };
    });
}

/**
 * Everything, fairness first.
 *
 * Somebody held to an unseen standard is the one with a person on the wrong end of it while nobody
 * answers. Then the things that make a quarter unresolvable at its end.
 */
export function senseCheck(objectives: Objective[], leadExternalId: string | null = null): Question[] {
  return [
    ...unseen(objectives, leadExternalId),
    ...unowned(objectives, leadExternalId),
    ...arithmetic(objectives, leadExternalId),
    ...duplicateResponsibility(objectives, leadExternalId),
    ...unmeasurable(objectives, leadExternalId),
    ...noDate(objectives, leadExternalId),
  ];
}
