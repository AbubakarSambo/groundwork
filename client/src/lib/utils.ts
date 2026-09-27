import { plainWordsByPerson, oneWithNoName } from './a-colleague'
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
 * THE LEAD'S OWN VIEW, WHERE AN ADDRESS IS A LEGITIMATE LAST RESORT. W-UX-4.
 *
 * `participantLabel` must never reach for the email, because a party's address can be hidden from
 * the other parties and we identify people by name to each other regardless. But the LEAD invited
 * these people by typing their addresses, so on the lead's pages the address is not a leak - and
 * before this, half a dozen places put it in the NAME position instead of as a last resort. The
 * audit's line: "Some people show as email addresses, others as names, in the same column."
 */
function theNameOrAddress(p: APerson | null | undefined): string | null {
  const name = theirName(p)
  if (name) return name
  /*
   * THE NAME IN THE ADDRESS, NOT THE ADDRESS.
   *
   * Read live on 22 September 2026: a Context page whose person rows read "david@harvestline.test"
   * and whose target groups read "SARAH@HARVESTLINE.TEST". Somebody invited by email has no name on
   * record until they accept, and their address usually holds it - the same read the server does
   * when it matches a name in a paste to a person. Where the local part is a desk rather than a
   * person, the address stands, because guessing a name out of "accounts@" would be worse.
   */
  const email = p?.email?.trim()
  if (email && !email.endsWith('@unclaimed.invalid')) {
    /*
     * DIGITS STAY. Stripping them read every address in a hundred-person load test - person1@,
     * person2@, person3@ - as the same person called "Person", and the targets table collapsed a
     * hundred people's numbers into one group. A digit in somebody's address is part of who they
     * are here, and an odd-looking name beats a hundred people sharing one.
     */
    const local = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim()
    const NOT_A_PERSON = new Set(['info', 'hello', 'admin', 'sales', 'support', 'contact', 'team', 'office', 'accounts', 'finance', 'hr', 'billing', 'help', 'enquiries', 'inquiries', 'noreply', 'mail', 'post'])
    if (local.length >= 2 && !NOT_A_PERSON.has(local.toLowerCase())) {
      return local.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
    return email
  }
  return null
}

/** The lead's own pages: name, else address, else "a colleague" or "the lead". */
export function personLabel(p: APerson | null | undefined): string {
  return theNameOrAddress(p) ?? oneWithNoName(p)
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
  opts: { forTheLead?: boolean; readerId?: string | null; readerIsInIt?: boolean } = {},
): Map<string, string> {
  const named = opts.forTheLead ? theNameOrAddress : theirName
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
  return named ? named.split(' ')[0] : oneWithNoName(p)
}
