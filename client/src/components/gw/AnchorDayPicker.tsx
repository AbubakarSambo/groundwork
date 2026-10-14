import { FieldLabel, Select, Stack, Text, ToggleChoices } from './ui'
/**
 * THE ONE DAY PICKER FOR WHEN CHECK-INS LAND (request 194, 8 October 2026).
 *
 * Setup (`TheSetup.tsx`, the entry chat) already had its own weekday/day-of-month picker for
 * `cadenceAnchorDay`, offered only while the check-in is being created. Request 194 asks for the
 * same choice on "People and setup", once the check-in is already running, so a lead can change the
 * day later - and the rule from U.6's review still holds: there is only ever one day picker for this
 * fact, never two that could disagree. So this is that picker, pulled out of `TheSetup.tsx` so both
 * places use the same component and the same choices, rather than two copies that could drift.
 *
 * The engine takes 0 to 6 (Sunday to Saturday) for a weekly or fortnightly rhythm, and 1 to 31 for a
 * monthly one (docs/answers-from-engine.md, "Request 194, answered") - the month picker here goes the
 * full 1 to 31, not the 1 to 28 `TheSetup.tsx` used to offer, which could never reach the last few
 * days of a 31-day month.
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ordinal(day: number): string {
  if (day % 10 === 1 && day !== 11) return `${day}st`
  if (day % 10 === 2 && day !== 12) return `${day}nd`
  if (day % 10 === 3 && day !== 13) return `${day}rd`
  return `${day}th`
}

/* Setup page, piece 3a: built from the shared parts (`FieldLabel`, `ToggleChoices`, `Select`,
   `Stack`), the same look as "How often" and "On which days" beside it, in place of inline styles. */
export function AnchorDayPicker({
  cadence, anchorDay, onAnchorDay, idPrefix,
}: {
  cadence: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | string
  anchorDay: number | null
  onAnchorDay: (day: number | null) => void
  /** Keeps the day-of-month `<select>`'s id unique when the picker appears more than once on a page. */
  idPrefix?: string
}) {
  if (cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY') {
    const label = 'Which day of the week should check-ins open? (optional)'
    return (
      <Stack gap={8}>
        <Text size="14-5" weight={700} as="p">{label}</Text>
        <ToggleChoices
          label={label}
          options={DAY_SHORT.map((d, i) => ({ key: String(i), label: d, title: DAY_NAMES[i] }))}
          values={anchorDay != null ? [String(anchorDay)] : []}
          onToggle={(key) => onAnchorDay(anchorDay === Number(key) ? null : Number(key))}
        />
      </Stack>
    )
  }
  if (cadence === 'MONTHLY') {
    const selectId = idPrefix ? `${idPrefix}-cadence-anchor-day-of-month` : 'cadence-anchor-day-of-month'
    return (
      <Stack gap={8}>
        <FieldLabel htmlFor={selectId}>Which day of the month should check-ins open? (optional)</FieldLabel>
        <Select
          id={selectId}
          value={anchorDay ?? ''}
          onChange={(e) => onAnchorDay(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">No fixed day</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>{ordinal(day)} of the month</option>
          ))}
        </Select>
      </Stack>
    )
  }
  return null
}
