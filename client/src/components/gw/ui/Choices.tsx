import './gw-ui.css'

/**
 * CHOICES (prototype: .seg, .seg button, app.css). Each choice 40px tall, 14px at the sides, 15px,
 * 8px corners, white with a 1.5px inside line; the chosen one navy with white bold text. Used for
 * the People filters and "Who can open a check-in". `stacked` is for a choice with a line of
 * description (12/14px inside, bold title, 14.5px line).
 *
 * `quiet`: THE CHOSEN OPTION READS AS CHOSEN WITHOUT BEING A SECOND NAVY BUTTON (walkthrough pass
 * 2, item 4). Sign-up asks "How would you like to sign in?" above its own submit button, "Create
 * account" - with the chosen option drawn navy, the page carries two navy buttons at once, which
 * CLAUDE.md's "at most one navy button per page" rules out, and the prototype's own sign-up screen
 * has only the one (signup.txt). Nothing here invents a new one-off style: `quiet` is a second,
 * already-dark-text way of marking the chosen option (an ink outline, the same shape "Choice
 * cards" already uses below), shared by any caller that needs it, while People's filters and "Who
 * can open a check-in" - each the one navy thing on their own page - keep the default.
 */
export type Choice = { key: string; label: string; description?: string }

export function Choices({ options, value, onChange, stacked, label, quiet }: {
  options: Choice[]
  value: string
  onChange: (key: string) => void
  stacked?: boolean
  label: string
  /** The chosen option is marked with an ink outline instead of a navy fill - for a page whose own
      submit button is already the one navy thing on it. */
  quiet?: boolean
}) {
  return (
    <div className={`gwui-choices${stacked ? ' gwui-choices-stacked' : ''}`} role="radiogroup" aria-label={label}>
      {options.map(o => {
        const on = o.key === value
        const className = ['gwui-choice', stacked && 'gwui-choice-stacked', on && (quiet ? 'gwui-choice-on-quiet' : 'gwui-choice-on')].filter(Boolean).join(' ')
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            className={className}
            onClick={() => onChange(o.key)}
          >
            {stacked
              ? (
                <>
                  <span className="gwui-choice-title">{o.label}</span>
                  {o.description && <span className="gwui-choice-desc">{o.description}</span>}
                </>
              )
              : o.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * TOGGLE CHOICES (prototype: .seg with more than one button `on`, the setup's "On which days"). The
 * same look as `Choices`, but each button is switched on and off on its own (`aria-pressed`), so a
 * group can hold several at once - the days of the week - or none. `ariaLabel` names a button whose
 * own text is short ("Mon" read as "Monday").
 */
export type ToggleChoice = { key: string; label: string; ariaLabel?: string; title?: string }

export function ToggleChoices({ options, values, onToggle, label }: {
  options: ToggleChoice[]
  values: string[]
  onToggle: (key: string) => void
  label: string
}) {
  return (
    <div className="gwui-choices" role="group" aria-label={label}>
      {options.map(o => {
        const on = values.includes(o.key)
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            aria-label={o.ariaLabel}
            title={o.title}
            className={['gwui-choice', on && 'gwui-choice-on'].filter(Boolean).join(' ')}
            onClick={() => onToggle(o.key)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
