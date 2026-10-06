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

/*
 * GROUP 3, PIECE 2: the `label` style constant (fontSize/color/marginBottom, spread by reference
 * into four spots) moved to this one class - a listed page (ReportPage.tsx) now imports this
 * component through `@/components/gw/where-to-focus`, and the guard refuses a banned prop passed
 * through a style constant one import deep, same as a literal. Same values, now shared.
 */
const LABEL_CLASS = 'gwui-fs-13 gwui-ink-muted gwui-mb-4'

export function WhereToFocus({ direction }: { direction: TheDirectionOnThePage | null | undefined }) {
  if (!direction) return null
  const lists = LISTS.map((l) => ({ ...l, items: (direction[l.key] as Named[] | undefined) ?? [] })).filter((l) => l.items.length)
  if (!lists.length) return null
  const outOf = direction.outOf ?? 0
  return (
    <div className="gwui-rule gwui-pt-14 gwui-pb-14 gwui-pl-16 gwui-pr-16 gwui-mb-16" style={{ borderRadius: 8, background: 'var(--gw-card)' }}>
      <div className={LABEL_CLASS} style={{ textTransform: 'uppercase', letterSpacing: '.3px', fontWeight: 700 }}>Where to focus</div>
      <div className="gwui-fs-13 gwui-ink-text gwui-mb-12" style={{ lineHeight: 1.6, maxWidth: '68ch' }}>
        {direction.saying?.trim() || `What ${outOf || 'the'} account${outOf === 1 ? '' : 's'} named, most-named first. The number is how many named it.`}
      </div>
      <div className="gwui-gap-12-20" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {lists.map((l) => (
          <div key={l.key}>
            <div className={LABEL_CLASS} style={{ textTransform: 'uppercase', letterSpacing: '.3px', fontWeight: 700 }}>{l.title}</div>
            <ol className="gwui-m-0 gwui-pl-0" style={{ listStyle: 'none' }}>
              {l.items.slice(0, 6).map((item, i) => (
                <li key={`${l.key}-${i}`} className="gwui-gap-8 gwui-fs-13 gwui-ink-text" style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1.5 }}>
                  <span className="gwui-ink-navy" style={{ minWidth: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.namedBy.length}</span>
                  <span>
                    {item.name}
                    {item.asSaid ? <span className="gwui-ink-sub"> - "{item.asSaid}"</span> : null}
                  </span>
                </li>
              ))}
              {l.items.length > 6 && <li className="gwui-fs-13 gwui-ink-sub gwui-pl-30">and {l.items.length - 6} more</li>}
            </ol>
          </div>
        ))}
      </div>
      {direction.splits && direction.splits.length > 0 && (
        <div className="gwui-rule-top gwui-mt-14 gwui-pt-12">
          <div className={LABEL_CLASS} style={{ textTransform: 'uppercase', letterSpacing: '.3px', fontWeight: 700 }}>Where the room split</div>
          {direction.splits.map((s, i) => (
            <div key={i} className="gwui-fs-13 gwui-ink-text" style={{ lineHeight: 1.6, maxWidth: '68ch' }}>{s.saying}</div>
          ))}
        </div>
      )}
    </div>
  )
}
