/**
 * THE LAST THREE SPEC DETECTORS, AND WHY THEY WERE NOT BUILT SOONER.
 *
 * All three were reported as blocked on machinery that does not exist - role benchmarks, an
 * onboarding window. Only one of those was true. `no_lead` needs a reporting line, and SCIM has been
 * writing `managerExternalId` since the day it landed; `unattached_work` needs conversations and
 * subjects, both of which are here. Only `no_checkin` genuinely wanted something missing, and less
 * of it than claimed.
 *
 * A blocker nobody rechecks outlives the thing that caused it. That is the same fault as the "there
 * are no blockers in this product" comment that kept two webhook events and a contribution kind
 * withheld for months after it stopped being true.
 */
import { SubjectRef } from './nobody-wrote-the-dependency-down';
import { STOPWORDS } from '../knowledge/knowledge.service';

export type Turn = { personExternalId: string; content: string; createdAt: Date };

/** How many separate times somebody has to describe work before its absence means anything. */
export const UNATTACHED_MENTIONS = 3;

/** Phrases that mean somebody is describing work rather than asking a question about it. */
const DOING_IT = [
  /\bi(?:'ve| have)?\s+(?:been\s+)?(?:working|worked)\s+on\b/i,
  /\bi(?:'m| am)\s+(?:working|building|writing|fixing|running|drafting)\b/i,
  /\bi\s+(?:built|wrote|fixed|shipped|finished|drafted|ran)\b/i,
  /\bmost of my (?:time|week)\b/i,
  /\bspent (?:the |my )?(?:week|time|day)\b/i,
];

/**
 * WORK SOMEBODY KEEPS DESCRIBING THAT SITS AGAINST NOTHING.
 *
 * The finding is not "this person mentioned something unrecognised" - that is every conversation
 * ever had, and a detector that fires on it is noise with a name. It is that they have described
 * DOING work, repeatedly, and none of those turns touched a single declared objective. That is
 * either work the organisation does not know it is paying for, or an objective nobody wrote down.
 *
 * WHAT IT DELIBERATELY CANNOT SAY is what the work was. The turn is the person's own words about
 * their own work, and the finding travels to an admin - so it carries a count and the dates, and
 * whoever wants the substance asks the person, which is the conversation the finding exists to
 * cause.
 */
export type UnattachedWork = {
  personExternalId: string;
  mentions: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export function findUnattachedWork(
  subjects: SubjectRef[],
  turns: Turn[],
  minMentions = UNATTACHED_MENTIONS,
): UnattachedWork[] {
  const keyed = subjects
    .map((s) => s.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)))
    .filter((w) => w.length > 0);

  const by = new Map<string, Date[]>();
  for (const t of turns) {
    if (!DOING_IT.some((r) => r.test(t.content))) continue;
    const flat = t.content.toLowerCase().replace(/[^a-z0-9]/g, '');
    /* Touching ANY declared objective is enough. The finding is about work attached to nothing at
       all, not about work attached to the wrong thing - which is a different detector. */
    if (keyed.some((words) => words.every((w) => flat.includes(w)))) continue;
    (by.get(t.personExternalId) ?? by.set(t.personExternalId, []).get(t.personExternalId)!).push(t.createdAt);
  }

  const out: UnattachedWork[] = [];
  for (const [personExternalId, dates] of by) {
    if (dates.length < minMentions) continue;
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    out.push({
      personExternalId,
      mentions: sorted.length,
      firstSeenAt: sorted[0],
      lastSeenAt: sorted[sorted.length - 1],
    });
  }
  return out;
}

export function sayUnattached(u: UnattachedWork): string {
  return `Has described doing work ${u.mentions} times without it touching any declared objective.`;
}

/**
 * NOBODY IS THIS PERSON'S MANAGER.
 *
 * The reporting line comes from the customer's own directory through SCIM, so this detector reads
 * their data rather than judging it - and that is the point. A person with no manager is usually an
 * import that half-worked or somebody whose manager left, and in both cases nobody has noticed,
 * because the only place it shows is a field nobody looks at.
 *
 * THE ONE AT THE TOP IS NOT A FINDING. Somebody has to have no manager; the chief executive reports
 * to a board that is not in the directory. Firing on them every night would put a permanent false
 * entry at the top of the list and teach whoever reads it that the list has noise in it.
 */
export type Unled = { personExternalId: string; managerExternalId: string | null };

export function findNoLead(
  people: { externalId: string; managerExternalId: string | null; active: boolean }[],
): Unled[] {
  const active = people.filter((p) => p.active);
  const withoutManager = active.filter((p) => !p.managerExternalId);

  /*
   * Exactly one person with no manager is the shape of a normal organisation, not a gap. Two or
   * more is the shape of an import that dropped the field, and then every one of them is worth
   * asking about - including whichever is genuinely at the top, because nothing here can tell which.
   */
  const missingField = withoutManager.length <= 1 ? [] : withoutManager;

  /*
   * A manager who is not in the directory at all is the leaver case, and it is worse than an empty
   * field: the record looks complete.
   *
   * This is computed WHATEVER the rule above decided, which it was not at first - an early return
   * meant that an organisation with one chief executive and a dangling reporting line reported
   * neither, and the dangling one is the more urgent of the two. The top-of-the-tree exemption is
   * about an empty field being normal; it says nothing about a line pointing at nobody.
   */
  const known = new Set(active.map((p) => p.externalId));
  const danglingManager = active.filter((p) => p.managerExternalId && !known.has(p.managerExternalId));

  return [...missingField, ...danglingManager].map((p) => ({
    personExternalId: p.externalId,
    managerExternalId: p.managerExternalId,
  }));
}

export function sayNoLead(u: Unled): string {
  return u.managerExternalId
    ? 'Their manager is not in the directory - the reporting line points at somebody who is not there.'
    : 'No manager is recorded for them.';
}

/**
 * SOMEBODY WHO HAS NEVER GIVEN THEIR OWN ACCOUNT.
 *
 * The spec puts two conditions on this and both matter more than the detector does. It must not
 * fire during the post-import quiet period, and it must not fire against somebody still inside
 * their onboarding window - because in both cases the honest answer is "not yet", and a product
 * that opens by telling a new joiner they have failed to do something is not one they will use.
 *
 * The caller passes the date the window starts from. That is now `RoleAssignment.startedAt` where
 * an assignment exists, which is the real thing: somebody who moved into a new role after three
 * years at the company was, by the directory date, three years overdue on their first day in it. It
 * falls back to the directory date where no assignment exists, because most organisations will not
 * populate assignments on day one and the weaker test beats none.
 */
export const SETTLING_IN_DAYS = 21;

export type NeverCheckedIn = { personExternalId: string; knownForDays: number };

export function findNoCheckIn(
  people: { externalId: string; active: boolean; createdAt: Date }[],
  whoHasCheckedIn: Set<string>,
  now: Date,
  settlingInDays = SETTLING_IN_DAYS,
): NeverCheckedIn[] {
  const out: NeverCheckedIn[] = [];
  for (const p of people) {
    if (!p.active) continue;
    if (whoHasCheckedIn.has(p.externalId)) continue;
    const knownForDays = Math.floor((now.getTime() - p.createdAt.getTime()) / 86_400_000);
    if (knownForDays < settlingInDays) continue;
    out.push({ personExternalId: p.externalId, knownForDays });
  }
  return out;
}

export function sayNoCheckIn(n: NeverCheckedIn): string {
  return `Has been in the directory ${n.knownForDays} days and has never given their own account of their work.`;
}
