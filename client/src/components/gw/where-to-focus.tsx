/**
 * WHERE TO FOCUS: what the room named, read together.
 *
 * A one-time discovery session exists to turn twenty-four accounts into a direction. The API has
 * read it - eight lists, each item carrying how many named it - since 20 September 2026, and the
 * report page never drew it, so the lead who convened the session saw the shared picture and the
 * central question and not the regions, value chains, gaps and pilots the session was for.
 *
 * Eight short lists, most-named first, with the count. Below them, where the room split: two answers
 * to the same question from two groups with nobody in common, which is the one thing a list of
 * counts hides. Nothing here is the model's wording; the names are the room's own words and the
 * counts are counts.
 */
type Named = { name: string; namedBy: string[]; asSaid?: string | null }
type Split = { list: string; saying: string }

export type TheDirectionOnThePage = {
  regions?: Named[]
  markets?: Named[]
  valueChains?: Named[]
  actors?: Named[]
  dataGaps?: Named[]
  networks?: Named[]
  pilots?: Named[]
  nextTwelveMonths?: Named[]
  outOf?: number
  enough?: boolean
  saying?: string | null
  splits?: Split[]
}

const LISTS: { key: keyof TheDirectionOnThePage; title: string }[] = [
  { key: 'regions', title: 'Regions' },
  { key: 'markets', title: 'Markets inside them' },
  { key: 'valueChains', title: 'Value chains' },
  { key: 'actors', title: 'Who to reach' },
  { key: 'dataGaps', title: 'Information people do not have' },
  { key: 'networks', title: 'Relationships that would unlock it' },
  { key: 'pilots', title: 'Where people would start' },
  { key: 'nextTwelveMonths', title: 'Their own next twelve months' },
]

const label = { fontSize: 10.5, textTransform: 'uppercase' as const, letterSpacing: '.3px', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 4 }

export function WhereToFocus({ direction }: { direction: TheDirectionOnThePage | null | undefined }) {
  if (!direction) return null
  const lists = LISTS.map((l) => ({ ...l, items: (direction[l.key] as Named[] | undefined) ?? [] })).filter((l) => l.items.length)
  if (!lists.length) return null
  const outOf = direction.outOf ?? 0
  return (
    <div style={{ marginBottom: 16, border: '1px solid var(--gw-border)', borderRadius: 8, padding: '14px 16px', background: 'var(--gw-card)' }}>
      <div style={label}>Where to focus</div>
      <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '68ch', marginBottom: 12 }}>
        {direction.saying?.trim() || `What ${outOf || 'the'} account${outOf === 1 ? '' : 's'} named, most-named first. The number is how many named it.`}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px 20px' }}>
        {lists.map((l) => (
          <div key={l.key}>
            <div style={label}>{l.title}</div>
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {l.items.slice(0, 6).map((item, i) => (
                <li key={`${l.key}-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.5 }}>
                  <span style={{ minWidth: 22, fontWeight: 700, color: 'var(--gw-navy)', fontVariantNumeric: 'tabular-nums' }}>{item.namedBy.length}</span>
                  <span>
                    {item.name}
                    {item.asSaid ? <span style={{ color: 'var(--gw-sub)' }}> - "{item.asSaid}"</span> : null}
                  </span>
                </li>
              ))}
              {l.items.length > 6 && <li style={{ fontSize: 12, color: 'var(--gw-sub)', paddingLeft: 30 }}>and {l.items.length - 6} more</li>}
            </ol>
          </div>
        ))}
      </div>
      {direction.splits && direction.splits.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--gw-border)' }}>
          <div style={label}>Where the room split</div>
          {direction.splits.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '68ch' }}>{s.saying}</div>
          ))}
        </div>
      )}
    </div>
  )
}
