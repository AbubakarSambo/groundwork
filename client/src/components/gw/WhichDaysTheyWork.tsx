import { workingDaysOf } from './when-the-check-ins-land'
import { Stack, Text, ToggleChoices } from './ui'
import { theDaysInASentence } from '@/lib/the-days-in-words'

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

/** What the picker currently means, as one full sentence (setup page review, 13 October). */
export function whatTheDaysMean(days: number[] | null | undefined): string {
  return theDaysInASentence(days)
}

/* U.6: drawn as the prototype's setup draws it (setup.txt): "On which days", the week from Monday,
   then "Weekdays only" and "Any day is fine" as two choices. Still the one picker: the entry setup
   and the check-in's own Setup both use this, with the same look and the same choices.
   Setup page, piece 3a: built from the shared parts now (`ToggleChoices`, the prototype's `.seg`
   with several days on at once; `Stack`; `Text`), in place of its own inline-styled buttons. */
const WEEK_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
  /* Nobody said means every day, so every day shows as on (setup page review: "Any day is fine"
     showed all seven off). Turning one off leaves the other six; the last one on cannot go. */
  const shown = days.length ? days : [0, 1, 2, 3, 4, 5, 6]
  return (
    <section aria-label={label}>
      <Stack gap={8}>
        <Text size="14-5" weight={700} as="p">{label}</Text>
        <ToggleChoices
          label={label}
          options={WEEK_FROM_MONDAY.map((i) => ({ key: String(i), label: DAYS[i], ariaLabel: DAY_NAMES[i] }))}
          values={shown.map(String)}
          onToggle={(key) => {
            const i = Number(key)
            const next = shown.includes(i) ? shown.filter((x) => x !== i) : [...shown, i]
            if (!next.length) return
            onChange(workingDaysOf(next).sort((a, b) => a - b))
          }}
        />
        {/* The two quick choices as plain words, not more buttons beside the seven days (Hafsah, 24 October: fewer buttons). */}
        <p className="t-small gw-links" role="group" aria-label="Weekdays or any day">
          <button type="button" className="gw-link" aria-pressed={weekdaysOnly} onClick={() => onChange([...WEEKDAYS])}>Weekdays only</button>
          <button type="button" className="gw-link" aria-pressed={days.length === 0} onClick={() => onChange([])}>Any day is fine</button>
        </p>
        {/* Said in plain words, because seven small buttons do not tell anybody what will happen. */}
        <Text size="14-5" ink="sub" as="p">{whatTheDaysMean(value)}</Text>
      </Stack>
    </section>
  )
}
