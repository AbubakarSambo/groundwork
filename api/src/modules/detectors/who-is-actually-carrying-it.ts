/**
 * THE ORG CHART SAYS WHO IS ASSIGNED. THE CONVERSATIONS SAY WHO IS DOING IT.
 *
 * Two findings come out of the gap, and they point in opposite directions:
 *
 *   Somebody repeatedly described doing work they are formally on nothing for. This is the person
 *   who gets missed at review time, and the reason they get missed is that the only record of what
 *   they did is in other people's sentences.
 *
 *   Somebody formally on work they are never mentioned in. Which is usually not a person problem
 *   at all - it is a roster that stopped being true, and saying so is a favour.
 *
 * NEITHER IS A RANKING AND NEITHER IS A VERDICT. Both are statements about how the work is
 * distributed. The second in particular has an innocent explanation far more often than not, and
 * the wording has to carry that or it becomes an accusation with a database behind it.
 */

export interface ContributionRow {
  personExternalId: string;
  subjectExternalId: string;
  kind: 'ASSIGNED' | 'STATED' | 'REFERENCED' | 'UNBLOCKING';
  weight: number;
}

/**
 * Enough signal to say somebody is carrying something. Two distinct other people describing it, or
 * the person themselves describing it repeatedly - one mention either way is a sentence, not a load.
 */
export const CARRYING_REFERENCED_BY = 2;
export const CARRYING_STATED_TIMES = 3;

export interface Unrecognised {
  personExternalId: string;
  subjectExternalId: string;
  statedTimes: number;
  referencedBy: number;
}

export function findUnrecognisedContributors(rows: ContributionRow[]): Unrecognised[] {
  const byPair = new Map<string, ContributionRow[]>();
  for (const r of rows) {
    const k = `${r.personExternalId}::${r.subjectExternalId}`;
    byPair.set(k, [...(byPair.get(k) ?? []), r]);
  }

  const out: Unrecognised[] = [];
  for (const [k, group] of byPair) {
    const [personExternalId, subjectExternalId] = k.split('::');
    /* Formally on it is the whole test. Being assigned makes this a normal arrangement. */
    if (group.some((g) => g.kind === 'ASSIGNED')) continue;

    const stated = group.find((g) => g.kind === 'STATED')?.weight ?? 0;
    const referenced = group.find((g) => g.kind === 'REFERENCED')?.weight ?? 0;
    if (referenced >= CARRYING_REFERENCED_BY || stated >= CARRYING_STATED_TIMES) {
      out.push({ personExternalId, subjectExternalId, statedTimes: stated, referencedBy: referenced });
    }
  }
  /* Most-corroborated first: somebody two colleagues describe is a stronger signal than somebody
     who has said it three times themselves. */
  return out.sort((a, b) => (b.referencedBy - a.referencedBy) || (b.statedTimes - a.statedTimes));
}

export interface NominalOnly {
  personExternalId: string;
  /** The subjects they are on and never mentioned in. */
  subjectExternalIds: string[];
}

/**
 * ONE UNMENTIONED ASSIGNMENT IS NOTHING. A person is on things they are not the one talking about,
 * and that is normal - a name on a list is often just governance. It becomes worth saying when it
 * is most of what they are on, because then the roster is describing somebody who is not there.
 */
export const NOMINAL_MINIMUM_SUBJECTS = 3;

export function findNominalOnly(rows: ContributionRow[]): NominalOnly[] {
  const assigned = new Map<string, Set<string>>();
  const active = new Map<string, Set<string>>();
  for (const r of rows) {
    const target = r.kind === 'ASSIGNED' ? assigned : active;
    target.set(r.personExternalId, (target.get(r.personExternalId) ?? new Set()).add(r.subjectExternalId));
  }

  const out: NominalOnly[] = [];
  for (const [person, subjects] of assigned) {
    const seen = active.get(person) ?? new Set<string>();
    const silent = [...subjects].filter((s) => !seen.has(s));
    if (subjects.size >= NOMINAL_MINIMUM_SUBJECTS && silent.length === subjects.size) {
      out.push({ personExternalId: person, subjectExternalIds: silent });
    }
  }
  return out.sort((a, b) => b.subjectExternalIds.length - a.subjectExternalIds.length);
}

/**
 * THE WORDING, and it is doing more work than the arithmetic.
 *
 * "Carrying load with no formal place" said badly becomes "this person is doing somebody else's
 * job". Said well it is a prompt to fix a roster. The finding is about the record being incomplete,
 * and the person is the beneficiary of fixing it rather than its subject.
 */
export function sayUnrecognised(u: Unrecognised, name: string, title: string): string {
  const how = u.referencedBy >= CARRYING_REFERENCED_BY
    ? `${u.referencedBy} other people have described them doing it`
    : `they have described doing it ${u.statedTimes} times`;
  return `${name} is not listed on ${title}, but ${how}. `
    + `If that is right, the record is missing them - which matters most at the point somebody is looking back at who did what.`;
}

export function sayNominal(n: NominalOnly, name: string, titles: string[]): string {
  return `${name} is listed on ${titles.length} pieces of work and has not been mentioned in any of them: ${titles.join(', ')}. `
    + `That usually means the list is out of date rather than anything about them - it is worth checking whether those are still theirs.`;
}
