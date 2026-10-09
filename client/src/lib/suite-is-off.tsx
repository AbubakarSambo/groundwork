import { Link } from 'react-router-dom'

/**
 * WHEN A SUITE IS OFF, AN ADMIN IS TOLD WHERE TO SWITCH IT ON (walkthrough pass 2, item 3).
 *
 * Every suite's "not switched on" refusal ends the same way on the server (the-leave-board.service.ts,
 * the-spending.service.ts, the-spending-for-finance.service.ts, the-reviews.service.ts, and the rest:
 * "The <suite> suite is not switched on."), which this reads rather than guessing at a suite's name.
 * Only an admin can actually switch one on, so only an admin is pointed at Suites; a lead or a
 * participant reading the same sentence has nothing to do with it.
 *
 * The Suites breadcrumb on these same pages only leads somewhere real for an admin or a lead - the
 * server refuses anybody else who opens it (SuitesPage.tsx: "Only an admin or a lead can open the
 * suites."), so a participant's crumb reads as plain text instead of a link to a page that refuses
 * them.
 */
export function maySeeSuites(role?: string): boolean {
  return role === 'ADMIN' || role === 'LEAD'
}

export function maySwitchSuitesOn(role?: string): boolean {
  return role === 'ADMIN'
}

/**
 * B-122 (deep page audit, 9 October): the server's sentence for an off suite now ends "An admin
 * switches it on under Suites." (`a-suite-that-is-off-says-what-to-do.ts`, `AN_ADMIN_SWITCHES_IT_ON`),
 * not "...is not switched on." as this used to check for. With the old check, an admin - the one
 * person who can actually act on it - read the same plain sentence as everybody else, with nothing
 * to press: a dead end. This now matches the server's real ending, so the admin's "Suites" becomes a
 * working link again. A lead or a member still reads the server's sentence with no link, since
 * neither of them can switch a suite on.
 */
export function isSuiteOffMessage(message?: string | null): boolean {
  return !!message && /\bunder Suites\.?\s*$/.test(message.trim())
}

/**
 * The server's own "not switched on" sentence, with "Suites" turned into a working link for an
 * admin. A lead or a member reads the server's sentence and nothing more, since neither of them can
 * switch a suite on.
 */
export function SuiteOffMessage({ message, role }: { message: string; role?: string }) {
  if (!isSuiteOffMessage(message) || !maySwitchSuitesOn(role)) return <>{message}</>
  const trimmed = message.trim()
  const before = trimmed.replace(/under Suites\.?\s*$/, 'under ')
  return <>{before}<Link to="/settings/suites">Suites</Link>.</>
}
