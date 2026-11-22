import { Stat, Grid } from './Stat'
import { useTheDesignSystem } from './the-design-system'
import './gw-ui.css'

/**
 * NUMBER TILES (light prototype, s71): side by side on a laptop; on a phone they sit in one row
 * that swipes sideways, a tile at a time. Each tile is a label, its number, and an optional line.
 */
export function NumberTiles({ tiles, label }: {
  tiles: { key: string; label: string; value: string; sub?: string | null }[]
  label?: string
}) {
  const ds = useTheDesignSystem()
  if (!tiles.length) return null
  /* ON A REBUILT PAGE: each tile is the design system's Stat, in 2 to 4 equal columns, one column on a phone (rule 1). */
  if (ds) {
    const columns = Math.min(Math.max(tiles.length, 2), 4) as 2 | 3 | 4
    return (
      <Grid columns={columns} label={label ?? 'Figures'}>
        {tiles.map((t) => <Stat key={t.key} role="listitem" label={t.label} value={t.value} meta={t.sub} />)}
      </Grid>
    )
  }
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
