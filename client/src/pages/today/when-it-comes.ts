import { whenItWas, theZoneDatesAreIn } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * THE WORDS FOR WHEN, ON TODAY (C1). The server gives moments; these say them in the reader's own
 * time, as the prototype does: "Morning, Wairimu", "Wednesday 23 September.", "Tomorrow, 4pm",
 * "Friday", "Monday".
 */

/** "Morning", "Afternoon" or "Evening", by the clock of the zone the product says its dates in (West Africa unless a surface set another), not the browser's: the server's moment must read the same hour everywhere. */
export function partOfTheDay(now: Date = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: theZoneDatesAreIn() }).format(now))
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

/** "4pm", or "4:30pm". */
export function hourOf(d: Date): string {
  return whenItWas(d, 'hourOfDay').replace(':00', '').replace(/\s/g, '')
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/**
 * When something is coming up: "Today, 4pm", "Tomorrow, 4pm", then the day of the week for the rest
 * of this week ("Friday"), then the date ("1 October"). The hour is said only for today and
 * tomorrow, where it is the part that helps.
 */
export function whenItComes(at: string | Date, now: Date = new Date()): string {
  const d = at instanceof Date ? at : new Date(at)
  const days = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000)
  if (days <= 0) return `Today, ${hourOf(d)}`
  if (days === 1) return `Tomorrow, ${hourOf(d)}`
  if (days < 7) return whenItWas(d, 'weekday')
  return whenItWas(d, 'dayAndMonthLong')
}
