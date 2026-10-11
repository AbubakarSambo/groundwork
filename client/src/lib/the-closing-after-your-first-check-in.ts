/**
 * THE ONE CLOSING MESSAGE AT THE END OF THE LEAD'S FIRST CHECK-IN (decision 133, change 5).
 *
 * Built in code from the check-in's real schedule, never by the model and never invented: the
 * cadence and the day are read off the check-in itself. When the day cannot be known (no set day
 * and no start date), the sentence says how often and leaves the day out rather than guessing one.
 * "in setup" is a link to People and setup, where the day and how often are actually changed.
 */
export type TheSchedule = {
  cadence?: string | null
  /** Weekly and fortnightly: 0 = Sunday .. 6 = Saturday. Monthly: the day of the month. */
  cadenceAnchorDay?: number | null
  startsAt?: string | null
  createdAt?: string | null
  /** 0 = Sunday .. 6 = Saturday. */
  workingDays?: number[] | null
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${s}`
}

/** The weekday the team checks in on: the set day, else the start's own weekday moved to a day they work. */
function theWeekday(s: TheSchedule): string | null {
  if (typeof s.cadenceAnchorDay === 'number' && s.cadenceAnchorDay >= 0 && s.cadenceAnchorDay <= 6) return DAYS[s.cadenceAnchorDay]
  const from = s.startsAt || s.createdAt
  if (!from) return null
  const d = new Date(from)
  if (Number.isNaN(d.getTime())) return null
  let day = d.getUTCDay()
  const works = (s.workingDays ?? []).filter((n) => n >= 0 && n <= 6)
  for (let i = 0; i < 7 && works.length > 0 && !works.includes(day); i += 1) day = (day + 1) % 7
  return DAYS[day]
}

/** "every Monday", "every other Monday", "every day", "on the 5th of each month", or null when it cannot be said truly. */
export function howOftenTheTeamChecksIn(s: TheSchedule): string | null {
  const c = (s.cadence ?? '').toUpperCase()
  if (c === 'DAILY') return 'every day'
  if (c === 'WEEKLY') { const d = theWeekday(s); return d ? `every ${d}` : 'every week' }
  if (c === 'FORTNIGHTLY') { const d = theWeekday(s); return d ? `every other ${d}` : 'every two weeks' }
  if (c === 'MONTHLY') {
    if (typeof s.cadenceAnchorDay === 'number' && s.cadenceAnchorDay >= 1 && s.cadenceAnchorDay <= 31) return `on the ${ordinal(s.cadenceAnchorDay)} of each month`
    return 'once a month'
  }
  if (c === 'ONE_TIME') return 'once'
  return null
}

export type TheClosing = { before: string; link: string; after: string }

/** The closing message in three parts, so "in setup" can be a link and the rest plain text. */
export function theClosingAfterYourFirstCheckIn(s: TheSchedule): TheClosing {
  const often = howOftenTheTeamChecksIn(s)
  const team = often ? ` Your team will check in ${often}, as you set it.` : ''
  return {
    before: `That's your first check-in done. Come back any time to add updates.${team} You can change how often `,
    link: 'in setup',
    after: '.',
  }
}

export function theClosingAsOneSentence(s: TheSchedule): string {
  const c = theClosingAfterYourFirstCheckIn(s)
  return `${c.before}${c.link}${c.after}`
}

/*
 * WHERE THE LEAD LANDS (walk fault 3). The entry flow's check-in ends by saving the check-in and
 * opening its page, so the closing is shown there, once, on the lead's Check-in tab. Kept for this
 * tab only (sessionStorage), and wrapped: a browser that refuses storage simply does not show it.
 */
const KEY = (groundId: string) => `gw-first-check-in-closing:${groundId}`
export function rememberTheFirstCheckInClosing(groundId: string | null | undefined): void {
  if (!groundId) return
  try { sessionStorage.setItem(KEY(groundId), '1') } catch { /* nothing to show then */ }
}
export function takeTheFirstCheckInClosing(groundId: string | null | undefined): boolean {
  if (!groundId) return false
  try {
    const there = sessionStorage.getItem(KEY(groundId)) === '1'
    if (there) sessionStorage.removeItem(KEY(groundId))
    return there
  } catch { return false }
}
