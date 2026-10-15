/**
 * THE SCHEDULE THE LEAD SAID, READ FROM HER OWN WORDS (setup page, piece 3a).
 *
 * The setup summary at the end is filled in from the conversation. The engine already reads the
 * rhythm and the length ("daily", "six weeks", "until I end it"), but two things the lead often says
 * in so many words never reached the summary: which days ("weekdays only") and the last day ("until
 * 30 December"). Walked on 13 October: a lead typed "Daily, weekdays only, until 30 December" and the
 * summary showed "Any day" and an end in January.
 *
 * ONLY WHAT SHE SAID, NEVER A GUESS. The working days are never inferred (which-days-this-team-works.ts
 * on the server): an empty answer means nobody said. So this takes only plain statements about the
 * schedule - "weekdays only", "no weekends", "Monday to Friday" - and an end said with "until", "till",
 * "to", "ends" or "ending" followed by a day and a month. A date that has already passed this year is
 * taken as next year's. Two different end dates is not one answer, so nothing is taken.
 */
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH = `(${MONTHS.join('|')}|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)`

export interface TheScheduleTheySaid {
  /** 1..5 when they said weekdays only; absent when they said nothing about the days. */
  workingDays?: number[]
  /** The last day, as YYYY-MM-DD; absent when they named none. */
  endsOn?: string
  /** True when they said it runs until they end it themselves. */
  runsUntilEnded?: boolean
  /** The rhythm she said in so many words ("daily", "weekly"), the last one said. */
  cadence?: 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'
  /** The name she gave in so many words ("Call it New accounts."), the last one given. */
  name?: string
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function monthIndex(word: string): number {
  const w = word.toLowerCase()
  return MONTHS.findIndex((m) => m.startsWith(w.slice(0, 3)))
}

export function theScheduleTheySaid(texts: (string | null | undefined)[], today: Date = new Date()): TheScheduleTheySaid {
  const out: TheScheduleTheySaid = {}
  const ends = new Set<string>()
  for (const raw of texts) {
    const t = (raw ?? '').toLowerCase().replace(/[’']/g, "'")
    if (/\bweekdays?\b(\s+only)?|\bno weekends?\b|\bnot (?:at|on) (?:the )?weekends?\b|\bskip(?:ping)? (?:the )?weekends?\b|\bmonday to friday\b|\bmon(?:day)?\s*-\s*fri(?:day)?\b|\b(?:every |each )?(?:working|work|business) days?\b/.test(t)
      && !/\b(?:and|or|including|also) (?:the )?weekends?\b|\bweekends? too\b|\bany day\b/.test(t)) {
      out.workingDays = [1, 2, 3, 4, 5]
    }
    if (/\buntil i (?:end|stop|close) it\b|\bwhen i end it\b|\bno end\b|\bno fixed end\b|\bopen[- ]ended\b/.test(t)) {
      out.runsUntilEnded = true
    }
    /* The rhythm, said plainly (setup page review: the card stayed "0 of 4 set" after "Weekly, on
       Thursdays, with no end"). Two weeks is read before one week, so "every two weeks" is not weekly. */
    if (/\bfortnightly\b|\bevery (?:two|2) weeks\b|\bevery other week\b/.test(t)) out.cadence = 'FORTNIGHTLY'
    else if (/\bmonthly\b|\bevery month\b|\bonce a month\b/.test(t)) out.cadence = 'MONTHLY'
    else if (/\bweekly\b|\bevery week\b|\bonce a week\b|\bevery (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t)) out.cadence = 'WEEKLY'
    else if (/\bdaily\b|\bevery day\b|\beach day\b/.test(t)) out.cadence = 'DAILY'
    const named = (raw ?? '').match(/\b(?:call it|call this|name it|name this)\s+["“']?([^"”\n.!?]+(?:\.\d+[^"”\n.!?]*)?)/i)
    if (named && named[1].trim()) out.name = named[1].trim().replace(/[,;:]$/, '')
    const re = new RegExp(`\\b(?:until|till|til|to|ends?|ending|end on|finish(?:es|ing)? on|through)\\s+(?:the\\s+)?(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}|${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?)(?:,?\\s+(\\d{4}))?\\b`, 'g')
    for (const m of t.matchAll(re)) {
      const day = Number(m[1] ?? m[4])
      const month = monthIndex(m[2] ?? m[3])
      if (!day || month < 0) continue
      let year = m[5] ? Number(m[5]) : today.getFullYear()
      let d = new Date(year, month, day)
      if (d.getMonth() !== month) continue
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      if (!m[5] && d < startOfToday) { year += 1; d = new Date(year, month, day) }
      ends.add(iso(d))
    }
    /* "Until the end of the year", "to the end of December", "until month end" (local test, 15 October): Muchemi's
       "every working day until the end of the year" ended on 26 December because no end was read at all. */
    const yearEnd = /\b(?:until|till|til|to|through|by|ends?|ending)\s+(?:the\s+)?(?:end of (?:the |this )?year|year[- ]end)\b/.test(t)
    const monthEnd = t.match(new RegExp(`\\b(?:until|till|til|to|through|by|ends?|ending)\\s+(?:the\\s+)?end of ${MONTH}\\b`))
    if (yearEnd) ends.add(iso(new Date(today.getFullYear(), 11, 31)))
    if (monthEnd) {
      const month = monthIndex(monthEnd[1])
      let d = new Date(today.getFullYear(), month + 1, 0)
      if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) d = new Date(today.getFullYear() + 1, month + 1, 0)
      if (month >= 0) ends.add(iso(d))
    }
  }
  if (ends.size === 1) out.endsOn = [...ends][0]
  if (out.endsOn) delete out.runsUntilEnded
  return out
}
