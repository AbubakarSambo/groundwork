/**
 * WHAT A SLACK CHANNEL MAY BE TOLD, AND IT IS LESS THAN AN EMAIL.
 *
 * An email goes to one person. A channel is read by whoever is in it — including
 * people who are not on the check-in, were never invited to it, and in a shared
 * channel do not work here at all. Somebody wires a webhook into #general on a
 * Friday and every notice after that is a broadcast.
 *
 * SO A NOTICE SAYS THAT SOMETHING HAPPENED, AND WHERE TO GO. Never what anybody
 * wrote, never how anybody is doing, never a name attached to a difficulty. The
 * link is the wall: it opens the product, which knows who is asking and shows
 * them what they may see. A notice that carried the content would have decided
 * that question in a channel, where nobody can take it back.
 *
 * THIS IS STRUCTURAL, NOT A HABIT. The composer is given a `Notice` with no field
 * that can hold what was said — there is nowhere to put it, so no future edit can
 * accidentally include it.
 *
 * TEAMS IS THE SAME NOTICE, A DIFFERENT ENVELOPE. Everything above is about what
 * is said; only `asSlack` and `asTeams` differ, and they differ in payload shape
 * alone.
 */

export type WhatHappened =
  | 'a round finished'
  | 'a check-in is waiting'
  | 'a report is ready'
  | 'somebody is blocked'
  /*
   * Their own system, not their team. The only notice here that is about plumbing — and it belongs
   * in a channel more than most, because the person who can fix a webhook is not always the person
   * who reads the admin's email.
   */
  | 'an integration cannot be reached';

export interface Notice {
  what: WhatHappened;
  /** The check-in's own label — chosen by the lead, already shown to everybody in it. */
  about: string;
  /** How many people it concerns. A count is safe here; a name is not. */
  howMany?: number;
  /** Where to go. The product decides what the person may see when they arrive. */
  link: string;
}

const SAYS: Record<WhatHappened, (n: Notice) => string> = {
  'a round finished': (n) => `A round finished on “${n.about}”.`,
  'a check-in is waiting': (n) =>
    n.howMany && n.howMany > 1
      ? `${n.howMany} people have a check-in waiting on “${n.about}”.`
      : `A check-in is waiting on “${n.about}”.`,
  'a report is ready': (n) => `A report is ready on “${n.about}”.`,
  'somebody is blocked': (n) => `Something is blocked on “${n.about}”, and somebody is waiting.`,
  'an integration cannot be reached': (n) => `Groundwork cannot deliver events to ${n.about}. Nothing is lost - every attempt is in your delivery log.`,
};

/** The sentence, the same in every workspace. */
export function whatItSays(notice: Notice): string {
  return SAYS[notice.what](notice);
}

/** Slack's incoming-webhook shape. `text` is kept as the fallback every client can render. */
export function asSlack(notice: Notice): Record<string, unknown> {
  const said = whatItSays(notice);
  return {
    text: said,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: said } },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `<${notice.link}|Open it in Groundwork>` }],
      },
    ],
  };
}

/** Teams' connector shape. Same sentence, same link, different envelope. */
export function asTeams(notice: Notice): Record<string, unknown> {
  const said = whatItSays(notice);
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: said,
    text: said,
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'Open it in Groundwork',
        targets: [{ os: 'default', uri: notice.link }],
      },
    ],
  };
}

/**
 * WHERE A NOTICE MAY BE POSTED.
 *
 * A webhook URL is a secret and it is also an address we will POST to on a
 * schedule, so the same reasoning as reading a pasted link applies: it must be a
 * real workspace, not something inside our network wearing a webhook's clothes.
 */
export function isAWorkspaceAddress(
  kind: 'SLACK' | 'TEAMS',
  url: string,
  /*
   * A LOCAL ADDRESS, FOR DRIVING THIS WITHOUT A WORKSPACE.
   *
   * Passed in rather than read from the environment here, so that the caller —
   * which knows whether this is production — is the thing that decides. In
   * production it is never passed, and a guard holds that.
   */
  alsoAllow?: string,
): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const host = u.hostname.toLowerCase();
  /* https everywhere except the one local address a developer may allow, because
     a webhook URL is a secret and http puts it on the wire in the clear. */
  if (u.protocol !== 'https:' && !(alsoAllow && host === alsoAllow.toLowerCase() && u.protocol === 'http:')) {
    return false;
  }

  if (alsoAllow && host === alsoAllow.toLowerCase()) return true;
  if (kind === 'SLACK') return host === 'hooks.slack.com';
  return host.endsWith('.office.com') || host.endsWith('.webhook.office.com');
}
