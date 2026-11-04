import { toast } from 'sonner'

/**
 * A PHONE NUMBER SOMEBODY GAVE BEFORE THEY WERE SIGNED IN (Hafsah, 30 October 2026: the number is asked wherever a person joins).
 *
 * Joining by a link or answering first asks for an email address and mails a link; the person is signed in only when they open it.
 * Their number is kept in this browser with the address it was given beside, and saved to them, through the same PATCH /auth/me
 * Settings uses, the moment that address signs in here (the auth store's setAuth, the one door every sign-in goes through). A number
 * kept for another address is never saved to whoever signs in. One that does not save says so, and nothing else is undone.
 */
const KEY = 'gw-phone-number-to-save'

export function keepTheNumberForWhenTheySignIn(email: string, number: string): void {
  const n = number.trim()
  const e = email.trim().toLowerCase()
  if (!n || !e) return
  try { window.localStorage.setItem(KEY, JSON.stringify({ email: e, number: n })) } catch { /* private mode: they add it in Settings */ }
}

/** Saves the signed-in person's own number, saying plainly when it did not save. */
export async function saveMyNumber(number: string): Promise<boolean> {
  const n = number.trim()
  if (!n) return true
  try {
    const { authApi } = await import('@/api/auth')
    await authApi.setPhoneNumber(n)
    return true
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? 'Your phone number did not save. You can add it in Settings.')
    return false
  }
}

/** Called once somebody is signed in: saves the number they gave before, if it was given beside this address. */
export async function saveTheNumberTheyGave(email: string | null | undefined): Promise<void> {
  let kept: { email: string; number: string } | null = null
  try { kept = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') } catch { kept = null }
  if (!kept || !email || kept.email !== email.trim().toLowerCase()) return
  try { window.localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
  await saveMyNumber(kept.number)
}
