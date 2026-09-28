import { workingDaysOf } from './when-the-check-ins-land'

/**
 * WHICH DAYS THIS TEAM WORKS - ONE PICKER, USED WHEREVER THE RHYTHM IS SET.
 *
 * "He cannot choose to set check-ins to happen outside of weekends." Everything underneath was
 * already built: the days are stored, every cadence honours them, and the setup chat offered them.
 * What did not exist was any way to say it once the check-in existed - and the in-app rhythm editor,
 * which is where a lead goes when they notice their check-ins landing on a Sunday, had no control at
 * all.
 *
 * SO IT IS ONE COMPONENT RATHER THAN A SECOND COPY. The setup chat had this as inline markup. A
 * second inline copy on the admin page is how the two quietly stop agreeing - the same lesson as the
 * ranking that decides what to ask, which is now one method for exactly this reason.
 *
 * NOTHING IS PRE-SELECTED, AND THAT IS DELIBERATE. Monday to Friday is one region's office week, not
 * a fact about anybody's: field teams work Saturdays and the week starts on Sunday across much of
 * where this is used. An empty list means nobody said, the date stays where the cadence put it, and
 * the label says so instead of quietly assuming.
 */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAYS = [1, 2, 3, 4, 5]

const isWeekdaysOnly = (days: number[]) => days.length === 5 && WEEKDAYS.every((d) => days.includes(d))

/** What the picker currently means, in the words somebody would use about their own week. */
export function whatTheDaysMean(days: number[] | null | undefined): string {
  const on = workingDaysOf(days)
  if (!on.length) return 'Any day. A check-in can open on a Saturday or a Sunday.'
  if (isWeekdaysOnly(on)) return 'Weekdays only. A check-in never opens at the weekend.'
  return `Only ${on.map((d) => DAYS[d]).join(', ')}. A check-in never opens on the other days.`
}

export function WhichDaysTheyWork({
  value,
  onChange,
  label = 'Which days does this team work?',
}: {
  value: number[]
  onChange: (days: number[]) => void
  label?: string
}) {
  const weekdaysOnly = isWeekdaysOnly(value)
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 6 }}>
        {label} <span style={{ fontWeight: 500 }}>(optional)</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {DAYS.map((d, i) => {
          const on = value.includes(i)
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              aria-label={d}
              onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort((a, b) => a - b))}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${on ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                background: on ? 'var(--gw-blue-bg)' : 'white',
                color: on ? 'var(--gw-navy)' : 'var(--gw-muted)',
              }}
            >
              {d}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(weekdaysOnly ? [] : [...WEEKDAYS])}
        style={{ background: 'none', border: 'none', color: 'var(--gw-navy)', cursor: 'pointer', fontSize: 11.5, padding: 0, fontFamily: 'inherit' }}
      >
        {weekdaysOnly ? 'Clear - any day is fine' : 'Weekdays only, skip weekends'}
      </button>
      {/* Said in plain words, because seven small buttons do not tell anybody what will happen. */}
      <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 6, lineHeight: 1.5 }}>
        {whatTheDaysMean(value)}
      </div>
    </div>
  )
}
