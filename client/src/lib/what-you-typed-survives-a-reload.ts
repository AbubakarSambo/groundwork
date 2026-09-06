/**
 * WHAT SOMEBODY TYPED SURVIVES A RELOAD, WHICH IN THE CREATION FLOW IT DID NOT.
 *
 * The eight-step wizard kept exactly one thing — the situation card, in `sessionStorage` — and held
 * the brief, the people, the dates, the lead, the remits and the name in plain component state. A
 * reload, an accidental back, a session timing out, or a phone deciding to reclaim a backgrounded
 * tab lost all of it, at the end of a form that takes a careful person ten minutes.
 *
 * The entry chat, written by the same team two files away, persists every turn. This is that,
 * given a name so the next form does not have to rediscover it.
 *
 * ==========================================================================
 * WHAT IT WILL NOT DO.
 * ==========================================================================
 *
 * IT KEEPS NOTHING ONCE THE WORK LANDS. A draft that outlives the thing it was drafting is a
 * half-finished ground reappearing on the next visit, which is worse than losing it: somebody
 * finishes it a second time and invites everybody twice.
 *
 * IT IS ONE DEVICE AND ONE BROWSER, and it says so rather than implying a server-side draft. What
 * is stored here is what somebody typed on this machine, including colleagues' addresses — so it
 * is cleared on success, and on being told the person has finished with it.
 *
 * IT NEVER THROWS. A private window, a full quota or a browser told to block site data all make
 * storage refuse, and a form that will not render because it could not save a draft is a worse
 * product than one that quietly forgets.
 */

export interface Kept<T> {
  /** What was stored, or null when there is nothing usable. */
  value: T | null;
  /** When it was stored, so a caller can decline something ancient. */
  at: Date | null;
}

/** Long enough to come back after lunch or a crash. Beyond that it is a different piece of work. */
export const A_DRAFT_LASTS_HOURS = 48;

export function keep<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), value }));
  } catch {
    /* Storage refused — private window, full quota, site data blocked. Losing the draft is the
       cost; refusing to work is not. */
  }
}

export function whatWasKept<T>(key: string, now: Date = new Date()): Kept<T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { value: null, at: null };

    const parsed = JSON.parse(raw) as { at?: string; value?: T };
    const at = parsed.at ? new Date(parsed.at) : null;
    if (!at || Number.isNaN(+at)) return { value: null, at: null };

    const hours = (now.getTime() - at.getTime()) / (1000 * 60 * 60);
    /* Ancient, or from the future because a clock moved. Either way not somebody's live draft. */
    if (hours > A_DRAFT_LASTS_HOURS || hours < -1) {
      forget(key);
      return { value: null, at: null };
    }

    return { value: (parsed.value ?? null) as T | null, at };
  } catch {
    /* Corrupt, half-written, or written by an older version of this form. Not worth restoring
       and definitely not worth crashing over. */
    forget(key);
    return { value: null, at: null };
  }
}

export function forget(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Nothing to be done, and nothing that should stop the page. */
  }
}

/** How long ago, in the words somebody reads on the offer to pick it up again. */
export function howLongAgo(at: Date, now: Date = new Date()): string {
  const minutes = Math.max(1, Math.round((now.getTime() - at.getTime()) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return 'yesterday';
}
