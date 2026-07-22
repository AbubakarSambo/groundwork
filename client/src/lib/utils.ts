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
