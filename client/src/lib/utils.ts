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
 * How a participant is shown to ANOTHER participant: by name, falling back to their
 * role, then a generic label. NEVER the email - a participant's email may be hidden
 * (contact-visibility toggle), and even when visible we identify people by name here,
 * not by a raw address. Null-safe: email may be null, user may be a pending invite.
 */
/**
 * THE LEAD'S OWN VIEW, WHERE AN ADDRESS IS A LEGITIMATE LAST RESORT. W-UX-4.
 *
 * `participantLabel` must never reach for the email, because a party's address can be hidden from
 * the other parties and we identify people by name to each other regardless. But the LEAD invited
 * these people by typing their addresses, so on the lead's pages the address is not a leak - and
 * before this, half a dozen places put it in the NAME position instead of as a last resort. The
 * audit's line: "Some people show as email addresses, others as names, in the same column."
 *
 * The order is what a person would say out loud: their name, else what they do here, else the
 * address we have for them.
 */
export function personLabel(p: {
  user?: { firstName?: string | null; lastName?: string | null } | null
  roleAsDescribed?: string | null
  email?: string | null
} | null | undefined): string {
  const name = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim()
  if (name) return name
  /* The address before the role: "runs the connect page · waiting" in a list of people reads as a
     job title, and an address is at least somebody. */
  const email = p?.email?.trim()
  if (email) return email
  const role = p?.roleAsDescribed?.trim()
  if (role) return role
  return 'a teammate'
}

export function participantLabel(p: {
  user?: { firstName?: string | null; lastName?: string | null } | null
  roleAsDescribed?: string | null
} | null | undefined): string {
  const name = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim()
  if (name) return name
  const role = p?.roleAsDescribed?.trim()
  if (role) return role
  return 'a teammate'
}
