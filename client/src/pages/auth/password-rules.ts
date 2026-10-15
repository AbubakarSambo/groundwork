import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'

/**
 * THE RULES A NEW PASSWORD HAS TO MEET: THE PROTOTYPE'S, HAFSAH'S DECISION OF 26 SEPTEMBER.
 *
 *   At least 8 characters
 *   A number or a symbol
 *   Not your email address
 *   Both passwords match      (only where there are two boxes)
 *
 * The server checks the same rules (api/src/modules/auth/the-password-rules.ts: the first two on the
 * request, "not your email address" in the service), so the list on screen never promises less than
 * the server accepts. They replace "a capital letter and a small letter".
 *
 * "NOT YOUR EMAIL ADDRESS" WHEN THE PAGE DOES NOT KNOW THE ADDRESS. The reset page is not told whose
 * link it is (Hafsah: the address stays off that page). A password that is not shaped like an email
 * address cannot be anybody's email address, so without the address that is what is checked; the
 * server checks the real one and says so if it matches.
 */
export interface PasswordRule { text: string; met: boolean }

export function todaysPasswordRules(password: string, confirm?: string, email?: string | null): PasswordRule[] {
  const notTheirEmail = email
    ? password.length > 0 && password.trim().toLowerCase() !== email.trim().toLowerCase()
    : password.length > 0 && !looksLikeAnAddress(password.trim())
  const rules: PasswordRule[] = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'A number or a symbol', met: /[^A-Za-z]/.test(password) },
    { text: 'Not your email address', met: notTheirEmail },
  ]
  if (confirm !== undefined) {
    rules.push({ text: 'Both passwords match', met: password.length > 0 && password === confirm })
  }
  return rules
}

export function meetsTodaysPasswordRules(password: string, confirm?: string, email?: string | null): boolean {
  return todaysPasswordRules(password, confirm, email).every(r => r.met)
}
