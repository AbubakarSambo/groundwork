import { useTheDesignSystem } from './the-design-system'
/**
 * QUICK REPLIES, AS OUTLINED PILLS (B3, docs/prototype/source/app.css: `.chip`).
 *
 * `min-height:40px;padding:0 14px;border-radius:20px;background:var(--surface);box-shadow:inset 0
 * 0 0 1.5px var(--rule2);font-size:15px` - a white pill with an inset border, not a filled one,
 * under the latest question.
 *
 * ROUND 4, ITEM B: the prototype's own pill, extracted so `SuggestedAnswers.tsx` (the engine's
 * suggested answers under the question) draws from the same values as anything else in
 * `components/gw/ui` that uses a pill, rather than a third set of numbers.
 */
export function QuickReplies({ items, onPick, disabled, label, stacked }: {
  items: string[]
  onPick: (item: string) => void
  disabled?: boolean
  /** For the group's own accessible name, e.g. "Suggested answers". */
  label?: string
  /** One per line, each its own width (between-check-ins.jpg: four chips stacked, not wrapped
      into a row), rather than the default wrapping row. */
  stacked?: boolean
}) {
  const ds = useTheDesignSystem()
  if (items.length === 0) return null
  /* On a rebuilt page the chips read only the tokens (blocks.css, .ds-chip): a tap tall, body text, a hairline. */
  if (ds) {
    return (
      <div role="group" aria-label={label} className={stacked ? 'ds-chips ds-chips-stacked' : 'ds-chips'}>
        {items.map(item => <button key={item} type="button" className="ds-chip" onClick={() => onPick(item)} disabled={disabled}>{item}</button>)}
      </div>
    )
  }
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', flexWrap: stacked ? 'nowrap' : 'wrap', alignItems: stacked ? 'flex-start' : 'stretch', gap: 8 }}>
      {items.map(item => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          disabled={disabled}
          style={{
            minHeight: 44,
            padding: '0 14px',
            borderRadius: 20,
            background: 'var(--gw-card)',
            boxShadow: 'inset 0 0 0 1px var(--rule2-crisp)',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 15,
            color: 'var(--gw-text)',
            display: 'inline-flex',
            alignItems: 'center',
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
