/**
 * WHO WAS NOT INVITED, AFTER THE PAGE THAT KNEW HAS GONE.
 *
 * Creating a check-in adds the people one call at a time, and a refusal for one of them — a seat
 * limit, an address already on the check-in, a bad address — used to be a toast, on a page the
 * admin was navigated away from a moment later. Toasts do not survive a navigation and they do not
 * survive a reload, so the admin's list of five became three and the only record of why had
 * already faded. They land on the check-in page believing everybody was asked.
 *
 * Kept against the ground's id so the destination can say it, and it survives the reload that
 * loses a toast. Not a database column: this is one admin's unfinished business with one screen,
 * and it is cleared when they have dealt with it.
 */
import { keep, whatWasKept, forget } from '@/lib/what-you-typed-survives-a-reload'

export interface NotInvited {
  email: string
  because: string
}

const key = (groundId: string) => `gw_not_invited_${groundId}`

export function rememberWhoWasNotInvited(groundId: string, failed: readonly NotInvited[]): void {
  if (!failed.length) return
  keep(key(groundId), failed as NotInvited[])
}

export function whoWasNotInvited(groundId: string): NotInvited[] {
  return whatWasKept<NotInvited[]>(key(groundId)).value ?? []
}

export function thatIsDealtWith(groundId: string): void {
  forget(key(groundId))
}

/**
 * The sentence for the banner. Names them, because a count is the thing the admin then has to go
 * and work out for themselves — which is the work the message was supposed to save.
 */
export function whatToSayAboutThem(failed: readonly NotInvited[]): string {
  if (!failed.length) return ''
  const who = failed.length === 1 ? 'One person you added was not invited' : `${failed.length} people you added were not invited`
  return `${who}. They are not on this check-in, and nothing has been sent to them.`
}
