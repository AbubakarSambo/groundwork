import './gw-ui.css'

/**
 * CHOICES (prototype: .seg, .seg button, app.css). Each choice 40px tall, 14px at the sides, 15px,
 * 8px corners, white with a 1.5px inside line; the chosen one navy with white bold text. Used for
 * the People filters and "Who can open a check-in". `stacked` is for a choice with a line of
 * description (12/14px inside, bold title, 14.5px line).
 */
export type Choice = { key: string; label: string; description?: string }

export function Choices({ options, value, onChange, stacked, label }: {
  options: Choice[]
  value: string
  onChange: (key: string) => void
  stacked?: boolean
  label: string
}) {
  return (
    <div className={`gwui-choices${stacked ? ' gwui-choices-stacked' : ''}`} role="radiogroup" aria-label={label}>
      {options.map(o => {
        const on = o.key === value
        const className = ['gwui-choice', stacked && 'gwui-choice-stacked', on && 'gwui-choice-on'].filter(Boolean).join(' ')
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
