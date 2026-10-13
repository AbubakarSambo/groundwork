/**
 * WHAT THE FOUR FIELDS ACTUALLY PRODUCE, AS DATES A PERSON CAN READ.
 *
 * A rhythm, a day of the week, a start date and a set of working days are four controls nobody can
 * compose in their head, and the only way to find out what they produced was to wait. So the form
 * says it: the next few days a check-in would open, in plain words, updating as the fields change.
 *
 * IT MIRRORS THE SERVER AND IS NOT THE SERVER. The scheduler is the truth; this is a preview, and
 * it says "would" rather than "will" because nothing is scheduled until the check-in exists. If
 * the two ever disagree the server wins and the preview is the bug.
 */

export type Cadence = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'SEQUENTIAL'

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAYS = [1, 2, 3, 4, 5]

/** Empty, or all seven, means nobody restricted anything. */
export function workingDaysOf(raw: number[] | null | undefined): number[] {
  const days = [...new Set((raw ?? []).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))]
  return days.length === 0 || days.length === 7 ? [] : days.sort((a, b) => a - b)
}

/** Forward only. Rolling back would move a check-in into a week already reported on. */
export function theNextDayTheyWork(date: Date, raw: number[] | null | undefined): Date {
  const days = workingDaysOf(raw)
  if (days.length === 0) return date
  const d = new Date(date)
  for (let i = 0; i < 7 && !days.includes(d.getDay()); i += 1) d.setDate(d.getDate() + 1)
  return d
}

function step(cadence: Cadence): number | null {
  switch (cadence) {
    case 'DAILY': return 1
    case 'WEEKLY': return 7
    case 'FORTNIGHTLY': return 14
    case 'MONTHLY': return 30
    default: return null
  }
}

/**
 * The next few dates a check-in would open on.
 *
 * ONE_TIME and SEQUENTIAL return a single date or none, because neither has a rhythm: one happens
 * once, and the other happens when somebody checks in. Showing a made-up series for either would be
 * the preview inventing a schedule the product does not have.
 */
export function whenTheCheckInsLand(a: {
  cadence: Cadence
  anchorDay: number | null
  startsAt: Date | null
  workingDays: number[]
  howMany?: number
  today?: Date
}): Date[] {
  /* A DAY, NOT A MOMENT (U.6 review). "Now" is today with the clock's time on it, and every date
     after it carried that time, so a check-in on the last day fell after that day's midnight and was
     dropped from the count. Each date is the start of its day. */
  const from = a.startsAt ?? a.today ?? new Date()
  const first = theNextDayTheyWork(new Date(from.getFullYear(), from.getMonth(), from.getDate()), a.workingDays)
  if (a.cadence === 'ONE_TIME' || a.cadence === 'SEQUENTIAL') return [first]

  const out = [first]
  const s = step(a.cadence)
  if (s == null) return out
  const want = a.howMany ?? 4
  let cursor = first
  while (out.length < want) {
    const d = new Date(cursor)
    /* Item 5, the same rule as the server's the-check-ins-own-schedule.ts: after the start, the next
       one is the first set day still to come, so a Sunday start for "every Monday" lists Monday 12,
       not Monday 19, and a start on the 11th for "the 20th" lists the 20th of the same month. */
    /* "Now" (Hafsah, 11 October 2026), the same as the server: with no start chosen, the first one
       stays open until the next set day at least half a cycle away (4 days for weekly, 7 for
       fortnightly, half the start's month rounded down for monthly), so "every Monday" set up on
       Sunday 11 lists Sun 11 October, Mon 19, Mon 26, and never two a day apart. */
    const second = out.length === 1
    const startsNow = a.startsAt == null
    const onTheDay = (year: number, month: number, day: number) => new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()))
    if (a.cadence === 'MONTHLY') {
      const anchored = a.anchorDay != null && a.anchorDay >= 1 && a.anchorDay <= 31
      const thisMonth = anchored ? onTheDay(d.getFullYear(), d.getMonth(), a.anchorDay!) : null
      if (second && startsNow && anchored) {
        const half = Math.floor(new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate() / 2)
        const daysOn = (x: Date) => Math.round((x.getTime() - first.getTime()) / 86_400_000)
        let j = 0
        while (daysOn(onTheDay(first.getFullYear(), first.getMonth() + j, a.anchorDay!)) < half) j += 1
        d.setTime(onTheDay(first.getFullYear(), first.getMonth() + j, a.anchorDay!).getTime())
      } else if (second && thisMonth && thisMonth > first) d.setDate(thisMonth.getDate())
      else {
        d.setMonth(d.getMonth() + 1)
        if (anchored) {
          const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
          d.setDate(Math.min(a.anchorDay!, daysInMonth))
        }
      }
    } else {
      const setDay = a.anchorDay != null && a.anchorDay >= 0 && a.anchorDay <= 6
      const firstGap = !setDay ? s : startsNow ? (a.cadence === 'FORTNIGHTLY' ? 7 : 4) : a.cadence === 'WEEKLY' ? 1 : s
      d.setDate(d.getDate() + (second && (a.cadence === 'WEEKLY' || a.cadence === 'FORTNIGHTLY') ? firstGap : s))
      if ((a.cadence === 'WEEKLY' || a.cadence === 'FORTNIGHTLY') && a.anchorDay != null && a.anchorDay >= 0 && a.anchorDay <= 6) {
        while (d.getDay() !== a.anchorDay) d.setDate(d.getDate() + 1)
      }
    }
    cursor = theNextDayTheyWork(d, a.workingDays)
    out.push(cursor)
  }
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Tuesday 16 Sep" — the day name is the point, since that is what the rules are about. */
export function sayTheDate(d: Date): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${names[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/**
 * ONE SENTENCE SAYING WHAT WAS SET AND WHAT WAS NOT.
 *
 * The panel knows which fields are still empty and never said so; a person filled in three of five
 * and had no way to tell. Absences are named as absences, in the product's own voice, without
 * telling anybody off for them - every one of these is optional and the check-in runs without it.
 */
export function whatIsSetAndWhatIsNot(a: {
  name: string
  cadenceChosen: boolean
  startsAt: Date | null
  workingDays: number[]
  peopleAdded: number
}): string {
  const missing: string[] = []
  if (!a.name.trim()) missing.push('a name')
  if (!a.cadenceChosen) missing.push('a rhythm')
  if (!a.startsAt) missing.push('a start date')
  if (a.peopleAdded === 0) missing.push('anybody else')

  if (missing.length === 0) {
    const days = workingDaysOf(a.workingDays).length
      ? ' Check-ins only open on the days you picked.'
      : ''
    return `Set: a name, a rhythm, a start date and ${a.peopleAdded} ${a.peopleAdded === 1 ? 'person' : 'people'}.${days}`
  }
  const last = missing.pop()
  const list = missing.length ? `${missing.join(', ')} and ${last}` : last
  return a.peopleAdded === 0 && missing.length === 0 && last === 'anybody else'
    ? 'You have not added anybody else yet. A check-in with one person still works, and it stays a note to yourself until somebody joins it.'
    /* "Still to set" rather than "not set yet": the rhythm field already says "Not set yet" right
       above this, and two lines opening the same way read as the same warning printed twice. */
    : `Still to set: ${list}. You can start without any of it, and it is easier to change now than later.`
}
