/**
 * AN ORGANISATION'S OWN WHATSAPP NUMBER COUNTS ONLY WHEN IT IS REALLY SET UP (Drop Access, 21 October 2026).
 *
 * Drop Access has no WhatsApp Business number of its own. Its lead typed the team's phone numbers into Groundwork so the team could
 * check in on WhatsApp, and from then on nobody got an opening or a nudge, and the lead got no summary. A row in
 * `whatsapp_connections` that is switched on sends everything Groundwork starts from that "number", with that row's keys and that
 * row's (empty) list of approved templates, so one half-filled row silences a whole organisation.
 *
 * So a connection is the organisation's number only when all of this is true:
 *  - it is switched on;
 *  - it has what sending and receiving need: a phone number ID as Meta gives it (digits), an access token, an app secret and a
 *    verify token;
 *  - and something has proved it is a real number: Meta checked the webhook address, a message came in through it, or a message
 *    went out on it (the setup page's test message does that).
 * Anything less is read exactly like no connection at all, so Groundwork's own number, its approved templates and its 24 hours are
 * used, as they are for an organisation that never opened the setup page. Nothing in the row is changed or deleted.
 *
 * A new connection is refused unless every key is given (`whatIsMissingFrom`), so it can never be half set up again from somebody
 * typing a number into the wrong place.
 */
export type AConnectionRow = {
  enabled?: boolean | null;
  phoneNumberId?: string | null;
  accessToken?: string | null;
  appSecret?: string | null;
  verifyToken?: string | null;
  webhookVerifiedAt?: Date | string | null;
  lastInboundAt?: Date | string | null;
  lastOutboundAt?: Date | string | null;
};

/** What to read from `whatsapp_connections` to know whether the row works. */
export const WHAT_SAYS_IT_WORKS = {
  enabled: true, phoneNumberId: true, accessToken: true, appSecret: true, verifyToken: true,
  webhookVerifiedAt: true, lastInboundAt: true, lastOutboundAt: true,
} as const;

const given = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

/** It has every key that sending and receiving need. */
export function itIsSetUp(row: AConnectionRow | null | undefined): boolean {
  return !!row && /^\d{6,}$/.test(String(row.phoneNumberId ?? '').trim()) && given(row.accessToken) && given(row.appSecret) && given(row.verifyToken);
}

/** Meta checked its webhook address, a message came in through it, or one went out on it. */
export function itWasProven(row: AConnectionRow | null | undefined): boolean {
  return !!row && !!(row.webhookVerifiedAt || row.lastInboundAt || row.lastOutboundAt);
}

/** The organisation's own number is the one in use: switched on, set up, and proven. Otherwise it is Groundwork's number. */
export function itSendsFromTheirNumber(row: AConnectionRow | null | undefined): boolean {
  return !!row?.enabled && itIsSetUp(row) && itWasProven(row);
}

/**
 * WHAT A NEW CONNECTION MUST BE GIVEN. The verify token is made by Groundwork, so it is never asked for. Said in the words the setup
 * page uses for each field.
 */
export const THE_KEYS_A_CONNECTION_NEEDS: { field: 'phoneNumberId' | 'businessAccountId' | 'displayNumber' | 'accessToken' | 'appSecret'; said: string }[] = [
  { field: 'phoneNumberId', said: 'the phone number ID' },
  { field: 'businessAccountId', said: 'the WhatsApp Business account ID' },
  { field: 'displayNumber', said: 'the number as people will see it' },
  { field: 'accessToken', said: 'the access token' },
  { field: 'appSecret', said: 'the app secret' },
];

export function whatIsMissingFrom(dto: Partial<Record<(typeof THE_KEYS_A_CONNECTION_NEEDS)[number]['field'], string | null | undefined>>, existing?: { accessToken?: string | null; appSecret?: string | null; businessAccountId?: string | null; displayNumber?: string | null } | null): string[] {
  return THE_KEYS_A_CONNECTION_NEEDS
    .filter(({ field }) => !given(dto[field]) && !(existing && given((existing as any)[field])))
    .map(({ said }) => said);
}

/** "a, b and c". */
export function inASentence(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** The one sentence that says what this page is for, and where a team member's number goes instead. */
export const THIS_IS_FOR_YOUR_OWN_NUMBER =
  "This is for connecting your organisation's own WhatsApp Business number. To let a team member check in on WhatsApp, add their number on People and setup.";

export const NOTHING_WAS_SAVED_BECAUSE = (missing: string[]) =>
  `Nothing was saved, because ${inASentence(missing)} ${missing.length === 1 ? 'is' : 'are'} missing. ${THIS_IS_FOR_YOUR_OWN_NUMBER}`;

export const THAT_IS_A_TEAM_MEMBERS_NUMBER = (name: string | null) =>
  `Nothing was saved, because ${name ? `that is ${name}'s number` : "that is a team member's number"}, not a WhatsApp Business number. ${THIS_IS_FOR_YOUR_OWN_NUMBER}`;

export const A_PHONE_NUMBER_IS_NOT_ITS_ID =
  `Nothing was saved, because the phone number ID is the long number Meta gives the number under API Setup, not the phone number itself. ${THIS_IS_FOR_YOUR_OWN_NUMBER}`;

/** Said on Connections when a row exists and is not the number in use. */
export const NOT_FINISHED_SO_GROUNDWORKS_NUMBER =
  "Your organisation's own WhatsApp number is not finished, so Groundwork writes to your people from Groundwork's own WhatsApp number until it is.";
