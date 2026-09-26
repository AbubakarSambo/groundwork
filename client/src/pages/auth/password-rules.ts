/**
 * THE RULES A NEW PASSWORD HAS TO MEET, AS THE SERVER CHECKS THEM TODAY.
 *
 * The server's rule lives in api/src/modules/auth/dto/set-password.dto.ts and reset-password.dto.ts:
 * at least 8 characters, with at least one uppercase and one lowercase letter. This file says the
 * same thing in words a person reads, so the list on screen can never promise less than the server
 * will accept.
 *
 * The prototype asks for different rules ("A number or a symbol", "Not your email address"). Which
 * rules to use is waiting for Hafsah. Until she decides, these stay the product's rules, and when
 * they change they change here and in those two DTOs together.
 */
export interface PasswordRule { text: string; met: boolean }

export function todaysPasswordRules(password: string, confirm?: string): PasswordRule[] {
  const rules: PasswordRule[] = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'A capital letter and a small letter', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
  ]
  if (confirm !== undefined) {
    rules.push({ text: 'Both passwords match', met: password.length > 0 && password === confirm })
  }
  return rules
}

export function meetsTodaysPasswordRules(password: string, confirm?: string): boolean {
  return todaysPasswordRules(password, confirm).every(r => r.met)
}
