import { Section, Panel } from '@/components/gw/ui'
import { TheBar, THE_LEGEND } from './TheBar'
import { TheStageBars } from './ThePicturedSalesBoard'
import { shareOf, theTicketGrid } from './TheTicketsBoard'
import './pictured-board.css'

type Any = any
const NOT_SAID = 'Not said yet'

/**
 * WOMEN'S SHARE BY COUNTY, AND DROP-OFF BY SESSION (programme.jpg). Two panels side by side. On the left, each group's women as the
 * officer said them ("26 of 42" or a percent), one ringed bar for each, under the county the group trains in; a bar is filled only
 * where a document backs the line. Nothing is added up across groups: a county's share is drawn only as its groups' own figures. A
 * group whose women nobody has said is not drawn, and where no group has one the panel says "Not said yet". On the right, the groups at
 * each stage, as the board already counts them.
 */
export function WomenAndDropOff({ b }: { b: Any }) {
  const grid = theTicketGrid(b)
  const groups: Any[] = (grid?.rows ?? []).filter((r: Any) => r.kind === 'group')
  if (!groups.length && !b.reportedAgainstCriteria) return null
  const byCounty = new Map<string, { name: string; of: number; n: number; proven: boolean }[]>()
  for (const r of groups) {
    const v = String(r.fields?.Women ?? '').trim()
    const share = v ? shareOf(v) : null
    if (!share) continue
    const county = String(r.fields?.County ?? '').trim() || NOT_SAID
    byCounty.set(county, [...(byCounty.get(county) ?? []), { name: r.name, ...share, proven: r.mark === 'proven' }])
  }
  return (
    <Section heading="Women’s share by county, and drop-off by check-in" note="The shape of the work">
      <div className="pb-two">
        <Panel>
          <h3 className="pb-card-h">Women’s share, group by group</h3>
          {byCounty.size === 0 ? (
            <p className="gwui-panel-text">{NOT_SAID}</p>
          ) : (
            [...byCounty.entries()].map(([county, rows]) => (
              <div key={county} className="pb-women-county">
                <p className="pb-sub"><b>{county}</b></p>
                <div className="pb-bars">
                  {rows.map((x) => (
                    <div className="pb-women-row" key={x.name}>
                      <span>{x.name}</span>
                      <TheBar form="stage" of={x.of} said={x.n} shown={x.proven ? x.n : 0} label={`${x.name}, women ${x.n} of ${x.of}, ${x.proven ? 'shown by a document' : 'said and not shown by a document'}`} />
                      <span>{x.of === 100 ? `${x.n}%` : `${x.n} of ${x.of}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <p className="pb-foot">{THE_LEGEND}</p>
        </Panel>
        <Panel>
          <h3 className="pb-card-h">Groups at each check-in</h3>
          <TheStageBars data={b.reportedAgainstCriteria ?? { stages: [], says: NOT_SAID }} />
        </Panel>
      </div>
    </Section>
  )
}
