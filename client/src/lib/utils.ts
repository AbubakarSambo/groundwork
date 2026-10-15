import { plainWordsByPerson, oneWithNoName, atTheStart } from './a-colleague'
export { atTheStart } from './a-colleague'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `₦${new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/**
 * WHO SOMEBODY IS, ON A SCREEN. Request 36, 27 September 2026.
 *
 * Their name, else the name they typed at the end of an open link (`nameGiven`), else, on the
 * lead's own pages only, what the lead's typed address says. NEVER `roleAsDescribed`: that row is
 * mostly the lead's own private sentence about the person ("Daniel - Your sales manager, who you
 * said is not meeting his agreed targets..."), and a label is read by everybody the name is shown
 * to. The lead still reads their own note, as a note beside the name that says it is theirs
 * (the-leads-note.ts), never as the name.
 *
 * With no name, the engine's own words (a-colleague.ts): "a colleague", or "the lead". Where a
 * screen shows several people together, `peopleLabels` gives the several-form: "one colleague",
 * "another colleague", "a third colleague".
 */
type APerson = {
  id?: string | null
  partyType?: string | null
  createdAt?: string | Date | null
  user?: { firstName?: string | null; lastName?: string | null } | null
  /** Kept in the type so callers can pass the row whole. Never read here: see above. */
  roleAsDescribed?: string | null
  email?: string | null
  /** The name typed at the end of an open-link check-in, where there is no sign-in to carry one. */
  nameGiven?: string | null
}

/** Their own name, or the name they gave at the end of an open link. Never anything the lead wrote. */
function theirName(p: APerson | null | undefined): string | null {
  return [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || (p?.nameGiven ?? '').trim() || null
}

/**
 * DECISION 115: A NAME FOR EVERY PERSON, NEVER ONE GUESSED OUT OF THEIR ADDRESS. B-058.
 *
 * The same placeholder sentence the People page already serves for somebody who has not given a
 * name (`GET /users`'s `displayName`): "Someone who has not given a name yet". `GET /grounds/:id`
 * does not yet send that field on each participant (request 201 asks the engine to), so this is the
 * client-side equivalent - and it replaces the old W-UX-4 rule below, which this file used to
 * follow for the lead's own pages.
 *
 * THE OLD RULE, KEPT HERE SO THE HISTORY IS NOT LOST: "the LEAD invited these people by typing
 * their addresses, so on the lead's pages the address is not a leak", and a real name was guessed
 * out of the local part of the address ("qx7@riverbank.test" became "Qx7"). E1 on Riverbank
 * Trading's old data (docs/existing-users-check.md) found this read as a person's actual name on
 * the Context tab, the Report tab and My work's "Every session" lines - "Qx7 said...", a card headed
 * "Fo4" - while the very same person was "Someone who has not given a name yet" on People. One
 * person, two different accounts of who they are, the audit's own complaint ("Some people show as
 * email addresses, others as names, in the same column.") repeated at a different address-handling
 * step. Decision 115 settled this: a name slot takes the real name or the placeholder sentence,
 * never a guess and never the plain address either.
 */
function theNameOrAddress(p: APerson | null | undefined): string | null {
  const name = theirName(p)
  if (name) return name
  const email = p?.email?.trim()
  if (email && !email.endsWith('@unclaimed.invalid')) {
    /*
     * A DESK, NOT A PERSON, STILL READS AS ITS ADDRESS. "accounts@harvestline.test" is not somebody
     * waiting on a name; it is a shared inbox, and the placeholder sentence would be a worse answer
     * than the address it stands for.
     */
    const local = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim()
    const NOT_A_PERSON = new Set(['info', 'hello', 'admin', 'sales', 'support', 'contact', 'team', 'office', 'accounts', 'finance', 'hr', 'billing', 'help', 'enquiries', 'inquiries', 'noreply', 'mail', 'post'])
    if (NOT_A_PERSON.has(local.toLowerCase())) return email
    return SOMEONE_WITH_NO_NAME
  }
  return null
}

/** Decision 115's placeholder sentence, word for word as `GET /users` serves it. */
export const SOMEONE_WITH_NO_NAME = 'Someone who has not given a name yet'

/** The lead's own pages: name, else address, else "a colleague" or "the lead". */
export function personLabel(p: APerson | null | undefined): string {
  return theNameOrAddress(p) ?? oneWithNoName(p)
}

/**
 * NAME, OR THE PLAIN ADDRESS ITSELF - NEVER ONE GUESSED OUT OF IT. Walkthrough pass 2, item 1.
 *
 * `theNameOrAddress` above is right for most of the lead's own pages (an invented "Zawadi U8" reads
 * fine where there is no other name on offer), but it gave the same person a THIRD answer on the
 * lead's own sessions roster, next to "Somebody invited by email" on People and setup and "A
 * colleague" on the board - the walkthrough's one complaint, three screens disagreeing about one
 * person. This is the same lead's-page fallback with the guess removed: their name, else the
 * address exactly as it was typed, else null (so a caller still falls back to "a colleague" the
 * usual way).
 */
function theNameOrPlainAddress(p: APerson | null | undefined): string | null {
  return theirName(p) ?? (p?.email?.trim() || null)
}

/** How a party is shown to ANOTHER party: name, else "a colleague" or "the lead". Never the email. */
export function participantLabel(p: APerson | null | undefined): string {
  return theirName(p) ?? oneWithNoName(p)
}

/**
 * EVERYBODY ON ONE SCREEN AT ONCE, SO TWO PEOPLE WITH NO NAME ARE NOT BOTH "A COLLEAGUE".
 *
 * Keyed by id. `forTheLead` uses `personLabel`'s order (the address counts as a name); otherwise
 * `participantLabel`'s. Lower case: use `atTheStart` where the label begins a line.
 */
export function peopleLabels(
  people: (APerson | null | undefined)[],
  opts: { forTheLead?: boolean; readerId?: string | null; readerIsInIt?: boolean; neverGuessFromAnAddress?: boolean } = {},
): Map<string, string> {
  const named = opts.neverGuessFromAnAddress ? theNameOrPlainAddress : opts.forTheLead ? theNameOrAddress : theirName
  const plain = plainWordsByPerson(people as (APerson & { id?: string | null })[], {
    named: (p) => !!named(p), readerId: opts.readerId ?? null, readerIsInIt: opts.readerIsInIt,
  })
  const out = new Map<string, string>()
  for (const p of people) {
    if (!p?.id) continue
    out.set(p.id, named(p) ?? plain.get(p.id) ?? oneWithNoName(p, opts.readerIsInIt))
  }
  return out
}

/** A first name for a short slot, or the plain words whole: never "a" out of "a colleague". */
export function firstNameOrLabel(p: APerson | null | undefined, forTheLead = true): string {
  const named = forTheLead ? theNameOrAddress(p) : theirName(p)
  if (!named) return oneWithNoName(p)
  /* The placeholder sentence is read whole, never split to its first word ("Someone"). */
  return named === SOMEONE_WITH_NO_NAME ? named : named.split(' ')[0]
}

/**
 * WHETHER SOMEBODY HAS A REAL NAME ON RECORD - their own, or the one they typed at the end of an
 * open link - never a name guessed out of an email address. `theNameOrAddress` guesses one for the
 * lead's own pages ("zawadi.u8@example.test" becomes "Zawadi U8"), which is right where the lead
 * typed the address themselves, but wrong wherever a screen would otherwise show the address itself
 * (U.4 re-review, item 4): a guess mid-sentence reads as a name nobody gave, and it is worse than
 * the plain address it stands in for.
 */
export function hasARealName(p: APerson | null | undefined): boolean {
  return !!theirName(p)
}

/**
 * ONE NAME FOR SOMEBODY WITH NO SEAT, EVERYWHERE THEY ARE SHOWN. Walkthrough pass 2, item 1.
 *
 * The same person with no account yet read as three different things on three screens: "A
 * colleague... Has not given a name" (the board, which says the engine's own words and is not
 * changed here - request 151 E11), "Zawadi U8" on the lead's Every session roster
 * (GroundAdminPage.tsx, which used to call `personLabel`, guessing a name out of the email's local
 * part), and "Somebody invited by email" on People and setup (WhosInItRoster.tsx, which never
 * guessed). The guess is the odd one out - U.4 re-review already ruled it wrong wherever a screen
 * would otherwise show the plain address (see `hasARealName` above) - so both callers now share this
 * one rule: their real name if they have one, else the plain address wherever this reader may see
 * it, else the plain words for nobody having given one at all.
 */
export function nameWithoutGuessing(p: APerson | null | undefined): { name: string; inASentence: string; nameless: boolean } {
  const noRealName = !hasARealName(p)
  const email = p?.email?.trim()
  const nameless = noRealName && !email
  /* A real name is capitalised for a row heading; the plain address is shown exactly as it is,
     never re-cased into something that reads like a guess. */
  const name = noRealName && email
    ? email
    : nameless
      ? 'Somebody invited by email'
      : atTheStart(theirName(p) ?? oneWithNoName(p))
  return { name, inASentence: nameless ? 'this person' : name, nameless }
}
