import { Section, Table } from '@/components/gw/ui'
import { TheBar } from './TheBar'
import './pictured-board.css'

type Any = any
const NOT_SAID = 'Not said yet'
const firstName = (n: unknown) => String(n ?? '').trim().split(/\s+/)[0] ?? ''

/**
 * WHERE NEXT, RANKED (mvnext.jpg): one open table, a row for each theme people named, in the order of how many named it. The priorities
 * are what each person said; each is under the theme the extraction read from their own words (the `Theme` detail), and a priority
 * with no theme said is under "Not said yet". The counts are the board's own: how many different people named something under the
 * theme, out of how many answered, drawn as a ringed bar because it is what people said. Where the lead has said who each person is
 * (`byWhoTheyAre`), the same count is given for each group, out of how many in that group answered; a group where nobody answered reads
 * "Not said yet". No count is made up and nothing is worked out beyond counting the people.
 */
export function WhereNextRanked({ b }: { b: Any }) {
  const t = (b.workRecords ?? []).find((x: Any) => x.section === 'Themes')
  const rows: Any[] = t?.rows ?? []
  if (!rows.length) return null
  const answered = (b.checkInGrid?.rows ?? []).filter((r: Any) => !r.managingOnly && Object.values(r.cells ?? {}).includes('done')).length
  const groups: Any[] = b.byWhoTheyAre?.state === 'filled' ? (b.byWhoTheyAre.groups ?? []).filter((g: Any) => Array.isArray(g.participantIds)) : []
  const byTheme = new Map<string, { theme: string; rows: Any[] }>()
  for (const r of rows) {
    const said = String(r.fields?.Theme ?? '').trim()
    const k = said.toLowerCase()
    const e = byTheme.get(k) ?? { theme: said || NOT_SAID, rows: [] }
    e.rows.push(r)
    byTheme.set(k, e)
  }
  const people = (rs: Any[]) => new Set(rs.map((r) => r.ownerParticipantId).filter(Boolean))
  const bar = (n: number, of: number, label: string) => <TheBar form="stage" of={of} said={n} label={label} />
  const ranked = [...byTheme.values()].sort((a, c) => people(c.rows).size - people(a.rows).size)
  const columns = [
    { key: 'theme', header: 'About', rowHeader: true, width: '18%' },
    { key: 'named', header: 'What was named' },
    { key: 'by', header: answered ? `Named by, of ${answered} who answered` : 'Named by', width: '18%' },
    ...groups.map((g) => ({ key: `g:${g.group}`, header: g.group, width: `${Math.floor(40 / groups.length)}%` })),
  ]
  return (
    <Section heading="Where next, ranked" note="From how many said it, and who">
      <Table keepEmptyColumns
        caption="What people named, one row for each theme, and how many named it"
        phone="stack"
        columns={columns}
        rows={ranked.map((e) => {
          const who = people(e.rows)
          const row: Record<string, any> = {
            theme: e.theme,
            named: <>{e.rows.map((r) => r.name).join('; ')}<div className="pb-sub">{`Named by ${[...new Set(e.rows.map((r) => firstName(r.owner)).filter(Boolean))].join(', ')}`}</div></>,
            by: answered
              ? <>{`${who.size} of ${answered}`}{bar(who.size, Math.max(answered, who.size), `${e.theme}, named by ${who.size} of ${answered} who answered, said and not tested`)}</>
              : `${who.size}`,
          }
          for (const g of groups) {
            const n = e.rows.filter((r) => (g.participantIds as string[]).includes(r.ownerParticipantId)).map((r) => r.ownerParticipantId)
            const inGroup = new Set(n).size
            row[`g:${g.group}`] = g.answered
              ? <>{`${inGroup} of ${g.answered}`}{bar(inGroup, Math.max(g.answered, inGroup), `${e.theme}, named by ${inGroup} of ${g.answered} ${g.group} who answered, said and not tested`)}</>
              : NOT_SAID
          }
          return row
        })}
      />
    </Section>
  )
}
