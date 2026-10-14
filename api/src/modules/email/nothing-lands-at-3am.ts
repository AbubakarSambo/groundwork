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

/** Whether this moment is inside their quiet hours. The one rule, for every sender. */
export function inQuietHours(now: Date, timezone: string | null, prefs: { quietBeforeHour: number | null; quietAfterHour: number | null } | null): boolean {
  const hour = localHour(now, timezone);
  const before = prefs?.quietBeforeHour ?? DEFAULT_QUIET_BEFORE;
  const after = prefs?.quietAfterHour ?? DEFAULT_QUIET_AFTER;
  return hour < before || hour > after;
}

/**
 * THE NEXT MOMENT A MAIL MAY GO. Held, not dropped: a message refused for quiet hours is sent at the
 * start of the next allowed hour in the recipient's own zone. Found by walking forward an hour at a
 * time, because the zone's clock and not ours decides, and an offset is wrong twice a year.
 */
export function nextAllowedMoment(now: Date, timezone: string | null, prefs: { quietBeforeHour: number | null; quietAfterHour: number | null } | null): Date {
  const onTheHour = new Date(now);
  onTheHour.setUTCMinutes(0, 0, 0);
  for (let i = 1; i <= 48; i++) {
    const t = new Date(onTheHour.getTime() + i * 60 * 60 * 1000);
    if (!inQuietHours(t, timezone, prefs)) return t;
  }
  return new Date(now.getTime() + 60 * 60 * 1000);
}

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

  /*
   * SYMMETRIC WITH THE MORNING SIDE. `hour < before` already reads "don't send before this
   * hour, but the hour itself is fine" - `quietBeforeHour: 8` sends starting at 8am. The
   * evening side used `>=`, so `quietAfterHour: 23` (the fixture's own "no restriction, the
   * whole day is fine" value) refused every mail sent during the 23:00 hour - a real send
   * outside anybody's stated quiet hours, and a test that only failed when CI happened to run
   * in that hour. `>` matches "don't send after this hour ends." (inQuietHours)
   */
  if (inQuietHours(args.now, args.timezone, p)) return 'quiet_hours';

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
  sessionNumber: number;
  participantCount: number;
  /** Of those, how many gave an account, from the record. Absent where the caller did not count it. */
  accountsGiven?: number;
  /** How many things need attention. A number, never the things. */
  needsAttention: number;
  permalink: string;
};

export function digestSubject(f: DigestFacts): string {
  return `${f.groundLabel} - session ${f.sessionNumber} is complete`;
}

export function digestBody(f: DigestFacts, unsubscribeUrl: string): string {
  const attention = f.needsAttention === 0
    ? 'Nothing is flagged for attention.'
    : `${f.needsAttention} ${f.needsAttention === 1 ? 'thing needs' : 'things need'} attention.`;

  /* Reviewer, 14 October: "Everyone has checked in... 3 people took part" when only the lead had.
     "Everyone" only when everyone gave an account; otherwise how many of how many, from the record. */
  const gave = f.accountsGiven ?? f.participantCount;
  const of = f.participantCount;
  const said = gave >= of
    ? [`Everyone has checked in for session ${f.sessionNumber} of ${f.groundLabel}.`,
      `${of} ${of === 1 ? 'person' : 'people'} took part. ${attention}`]
    : [`Session ${f.sessionNumber} of ${f.groundLabel} has closed.`,
      `${gave} of ${of} ${of === 1 ? 'person' : 'people'} checked in. ${attention}`];
  return [
    ...said,
    /* The link is the point of the mail. What was actually said stays behind it, under whatever
       permissions govern it, rather than travelling into a mailbox. */
    `Read it here: ${f.permalink}`,
    '',
    `To stop these emails: ${unsubscribeUrl}`,
  ].join('\n');
}
