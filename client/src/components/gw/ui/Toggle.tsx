import './gw-ui.css'

/**
 * TOGGLE (prototype: a switch, app.css). 48 by 28px, 14px corners, a 22px white knob, 3px inside;
 * green when on, the line colour when off (design-audit.md item 13: the old `gw-switch` is navy
 * when on - this is green, as the prototype draws it). A real switch for screen readers, with its
 * own name.
 */
export function Toggle({ on, onChange, label, disabled }: {
  on: boolean
  onChange: (on: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`gwui-toggle${on ? ' gwui-toggle-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="gwui-toggle-knob" />
    </button>
  )
}
