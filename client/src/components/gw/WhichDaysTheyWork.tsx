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

/* U.6: drawn as the prototype's setup draws it (setup.txt): "On which days", the week from Monday,
   then "Weekdays only" and "Any day is fine" as two choices. Still the one picker: the entry setup
   and the check-in's own Setup both use this, with the same look and the same choices. */
const WEEK_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        padding: '7px 13px', borderRadius: 999, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600,
        border: `1px solid ${on ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
        background: on ? 'var(--gw-navy)' : 'white', color: on ? 'white' : 'var(--gw-text)',
      }}
    >
      {children}
    </button>
  )
}

export function WhichDaysTheyWork({
  value,
  onChange,
  label = 'On which days',
}: {
  value: number[]
  onChange: (days: number[]) => void
  label?: string
}) {
  const days = workingDaysOf(value)
  const weekdaysOnly = isWeekdaysOnly(days)
  return (
    <section aria-label={label} style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', margin: '0 0 8px' }}>{label}</h3>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {WEEK_FROM_MONDAY.map((i) => {
          const on = days.includes(i)
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={DAY_NAMES[i]}
              onClick={() => onChange(on ? days.filter((x) => x !== i) : [...days, i].sort((a, b) => a - b))}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${on ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                background: on ? 'var(--gw-blue-bg)' : 'white',
                color: on ? 'var(--gw-navy)' : 'var(--gw-muted)',
              }}
            >
              {DAYS[i]}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Choice on={weekdaysOnly} onClick={() => onChange([...WEEKDAYS])}>Weekdays only</Choice>
        <Choice on={days.length === 0} onClick={() => onChange([])}>Any day is fine</Choice>
      </div>
      {/* Said in plain words, because seven small buttons do not tell anybody what will happen. */}
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 6, lineHeight: 1.5 }}>
        {whatTheDaysMean(value)}
      </div>
    </section>
  )
}
