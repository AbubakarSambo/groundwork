/**
 * WHEN A MAIL MAY GO, AND WHAT IT MAY SAY.
 *
 * Two rules from §13D, and they fail in opposite directions if you get them wrong. Send at the wrong
 * hour and somebody's phone lights up at three in the morning about work. Send the wrong CONTENT and
 * it is in a mailbox their administrators can read, forward and export, permanently, and no later
 * decision about permissions can pull it back.
 *
 * The second is why the headline rule is here as a function rather than as care taken while writing
 * a template. A template is edited by whoever needs one more field in it.
 */

/** The hours nobody wants to hear about work in, when they have not said otherwise. */
export const DEFAULT_QUIET_BEFORE = 8;
export const DEFAULT_QUIET_AFTER = 20;

export type Prefs = {
  quietBeforeHour: number | null;
  quietAfterHour: number | null;
  unsubscribedAt: Date | null;
  roundDigest: boolean;
  nudges: boolean;
};

/**
 * Their local hour, from an IANA zone.
 *
 * `Intl` rather than arithmetic on an offset, because an offset is wrong twice a year and the days
 * it is wrong on are exactly the ones somebody notices.
 */
export function localHour(now: Date, timezone: string | null): number {
  if (!timezone) return now.getUTCHours();
  try {
    return Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone, hour: 'numeric', hour12: false,
    }).format(now));
  } catch {
    /* An unrecognised zone is a data problem, not a reason to mail somebody at 3am. Falling back to
       UTC is the conservative direction: it can only ever make the window narrower for most people,
       never wider. */
    return now.getUTCHours();
  }
}

export type MayNotSend = 'unsubscribed' | 'opted_out' | 'quiet_hours' | 'already_nudged_today';

/**
 * Every reason not to send, in the order they matter.
 *
 * Unsubscribed first and unconditionally: it is the promise most easily broken by a later feature
 * that only checks the specific flag for the thing it is sending.
 */
export function mayNotSend(args: {
  kind: 'round_digest' | 'nudge';
  prefs: Prefs | null;
  timezone: string | null;
  now: Date;
  nudgedInPanelToday?: boolean;
}): MayNotSend | null {
  const p = args.prefs;

  if (p?.unsubscribedAt) return 'unsubscribed';
  if (p && args.kind === 'round_digest' && !p.roundDigest) return 'opted_out';
  if (p && args.kind === 'nudge' && !p.nudges) return 'opted_out';

  /*
   * ONE BUDGET, SHARED WITH THE PANEL (§12/§13D.3). Somebody already nudged in the panel today is
   * not nudged again by mail for the same thing - otherwise the two channels each behave reasonably
   * and the person receives twice as much as either intended.
   */
  if (args.kind === 'nudge' && args.nudgedInPanelToday) return 'already_nudged_today';

  const hour = localHour(args.now, args.timezone);
  const before = p?.quietBeforeHour ?? DEFAULT_QUIET_BEFORE;
  const after = p?.quietAfterHour ?? DEFAULT_QUIET_AFTER;
  if (hour < before || hour >= after) return 'quiet_hours';

  return null;
}

/**
 * WHAT A ROUND DIGEST MAY CARRY: a headline, a count, one thing to look at, and a link.
 *
 * §13D.2 spells out what it may not - not the full finding set, not attributed content, never a
 * transcript. So this takes counts and a permalink and has nowhere to put anything else: there is
 * no field for a quote, a name, or a finding body, and adding one means editing this rather than
 * passing more into a template.
 */
export type DigestFacts = {
  groundLabel: string;
  roundNumber: number;
  participantCount: number;
  /** How many things need attention. A number, never the things. */
  needsAttention: number;
  permalink: string;
};

export function digestSubject(f: DigestFacts): string {
  return `${f.groundLabel} - round ${f.roundNumber} is complete`;
}

export function digestBody(f: DigestFacts, unsubscribeUrl: string): string {
  const attention = f.needsAttention === 0
    ? 'Nothing is flagged for attention.'
    : `${f.needsAttention} ${f.needsAttention === 1 ? 'thing needs' : 'things need'} attention.`;

  return [
    `Everyone has checked in for round ${f.roundNumber} of ${f.groundLabel}.`,
    `${f.participantCount} ${f.participantCount === 1 ? 'person' : 'people'} took part. ${attention}`,
    /* The link is the point of the mail. What was actually said stays behind it, under whatever
       permissions govern it, rather than travelling into a mailbox. */
    `Read it here: ${f.permalink}`,
    '',
    `To stop these emails: ${unsubscribeUrl}`,
  ].join('\n');
}
