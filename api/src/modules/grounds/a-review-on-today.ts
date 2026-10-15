import type { Need } from './what-needs-you';
import type { NextReview, YourReview } from '../suites/the-reviews.service';
import { saidAsADay } from '../suites/who-is-away';

/**
 * A PERFORMANCE REVIEW, TOLD ON TODAY (item 16). Two readers, and nobody else:
 *
 *   - the person the review is about, once somebody has started it, in the very words the reviews
 *     suite already sends them (`GET /suites/reviews/mine`, `yourReviewSaid`). A review Groundwork only
 *     proposed has no review row yet, so it is never among them.
 *   - the person who writes it with them, when it is ready for them to start (the board's own
 *     `mayStart`, which already asks who writes it) and due within the next two weeks or already due.
 *
 * Nothing here decides who reads what: both lists come from the reviews service, read as this reader.
 * Nothing of a review's contents is said, only that it waits for you.
 */

const DAY = 86_400_000;
/** As far ahead as "Coming up" on Today looks. */
const SOON = 14 * DAY;
/** How long a decided review stays on Today after its date, so the person reads the decision. */
const DECIDED_STAYS = 14 * DAY;

const at = (day: string) => new Date(`${day}T00:00:00.000Z`).getTime();
const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? '';

/** "Wairimu has started your review." and "You can read it and add your own view before you meet.", the suite's own words. */
function titleAndDetail(says: string): { title: string; detail: string | null } {
  const cut = says.indexOf('. ');
  return cut < 0 ? { title: says, detail: null } : { title: says.slice(0, cut + 1), detail: says.slice(cut + 2).trim() || null };
}

export function yourReviewsOnToday(mine: YourReview[], organizationId: string, now: Date = new Date()): Need[] {
  return mine
    .filter((r) => r.stands === 'started' || at(r.dueOn) + DECIDED_STAYS >= now.getTime())
    .map((r) => ({
      key: `your-review-${r.id}`,
      kind: 'look' as const,
      ...titleAndDetail(r.says),
      action: { label: 'Read it', to: '/suite/reviews' },
      groundId: '',
      organizationId,
    }));
}

export function reviewsToStartOnToday(next: NextReview[], organizationId: string, now: Date = new Date()): Need[] {
  return next
    .filter((n) => n.mayStart && !n.reviewId && at(n.dueOn) <= now.getTime() + SOON)
    .map((n) => {
      const name = firstName(n.name);
      return {
        key: `start-review-${n.dueId}`,
        kind: 'decide' as const,
        title: `${name}’s review is ready for you to start.`,
        detail: n.proposal ?? `It ${at(n.dueOn) + DAY <= now.getTime() ? 'was' : 'is'} due on ${saidAsADay(n.dueOn)}.`,
        action: { label: 'Look at it', to: '/suite/reviews' },
        groundId: '',
        organizationId,
      };
    });
}
