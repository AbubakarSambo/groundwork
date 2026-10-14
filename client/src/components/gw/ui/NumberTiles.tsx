import './gw-ui.css'

/**
 * NUMBER TILES (light prototype, s71): side by side on a laptop; on a phone they sit in one row
 * that swipes sideways, a tile at a time. Each tile is a label, its number, and an optional line.
 */
export function NumberTiles({ tiles, label }: {
  tiles: { key: string; label: string; value: string; sub?: string | null }[]
  label?: string
}) {
  if (!tiles.length) return null
  return (
    <div className="gwui-tiles" role="list" aria-label={label}>
      {tiles.map((t) => (
        <div key={t.key} className="gwui-tile" role="listitem">
          <div className="gwui-tile-label">{t.label}</div>
          <div className="gwui-tile-value">{t.value}</div>
          {t.sub && <div className="gwui-tile-sub">{t.sub}</div>}
        </div>
      ))}
    </div>
  )
}
