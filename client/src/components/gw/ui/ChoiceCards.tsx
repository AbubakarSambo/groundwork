import './gw-ui.css'

/**
 * CHOICE CARDS (prototype: white panel rows, a chosen 2px ink outline, app.css). For the role on
 * one person's page. White rows in panels, a 16px bold title and a 15px line, 8px between; the
 * chosen one keeps its white fill and gets a 2px ink outline (design-audit.md item 12 - the product
 * used to draw the chosen role as a solid navy card, which this replaces).
 *
 * `disabled` locks the whole group - one person's own role, or the account that holds the
 * organisation, cannot be changed from this page (design-audit.md item 6, one-person.txt). The
 * chosen card stays visible and marked as chosen; only the others stop responding to a click.
 */
export type ChoiceCard = { key: string; title: string; description?: string }

export function ChoiceCards({ options, value, onChange, label, disabled }: {
  options: ChoiceCard[]
  value: string
  onChange: (key: string) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="gwui-choice-cards" role="radiogroup" aria-label={label}>
      {options.map(o => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            className={`gwui-choice-card${on ? ' gwui-choice-card-on' : ''}`}
            disabled={disabled && !on}
            onClick={() => { if (!disabled) onChange(o.key) }}
          >
            <div className="gwui-choice-card-title">{o.title}</div>
            {o.description && <div className="gwui-choice-card-desc">{o.description}</div>}
          </button>
        )
      })}
    </div>
  )
}
