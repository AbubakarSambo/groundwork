import { Section, Table, Tag } from '@/components/gw/ui'
import { TheBar, THE_LEGEND } from './TheBar'
import './pictured-board.css'

type Any = any
const NOT_SAID = 'Not said yet'

/** The commitments on a founder's work plan: every row that came from something the person promised. */
const theCommitments = (b: Any): Any[] =>
  ((b.workRecords ?? []).find((x: Any) => x.section === 'Work plan')?.rows ?? []).filter((r: Any) => r.kind === 'commitment' && r.lastSaidOn)

/** The Monday of the week a day falls in, and the week's number, as people count weeks of the year (the picture's "Week 37"). */
export function theWeekOf(day: string): { monday: string; number: number } {
  const d = new Date(`${day.slice(0, 10)}T12:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7
  const monday = new Date(d.getTime() - dow * 86400000)
  const thursday = new Date(monday.getTime() + 3 * 86400000)
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return { monday: monday.toISOString().slice(0, 10), number: Math.floor((thursday.getTime() - jan1) / (7 * 86400000)) + 1 }
}
const dayInWords = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))

/**
 * WHAT WAS SAID AND WHAT HAPPENED, WEEK BY WEEK (founder.jpg). One open table from the commitments on record: a row for each week in which
 * something was promised, with how many were said that week, and what became of those: done, carried (still open, or said not done) and
 * dropped, each counted from the commitment's own status, which only a person sets. Done is also a bar of what was said that week:
 * ringed for what the person said they did, filled only for what a document they added shows. Nothing is worked out beyond the count.
 */
export function SaidVersusDone({ b }: { b: Any }) {
  const rows = theCommitments(b)
  if (!rows.length) return null
  const weeks = new Map<string, { number: number; said: number; done: number; proven: number; carried: number; dropped: number }>()
  for (const r of rows) {
    const w = theWeekOf(String(r.lastSaidOn))
    const x = weeks.get(w.monday) ?? { number: w.number, said: 0, done: 0, proven: 0, carried: 0, dropped: 0 }
    const status = String(r.fields?.Status ?? '')
    x.said += 1
    if (status === 'Done') { x.done += 1; if (r.settledBy === 'PROVEN') x.proven += 1 }
    else if (status === 'Dropped') x.dropped += 1
    else x.carried += 1
    weeks.set(w.monday, x)
  }
  const list = [...weeks.entries()].sort(([a], [z]) => a.localeCompare(z)).slice(-8)
  return (
    <Section heading="Said vs happened, week by week" note="The shape of the work">
      <Table
        caption="What was said and what became of it, for each week"
        columns={[
          { key: 'week', header: 'Week', rowHeader: true, width: '22%' },
          { key: 'said', header: 'Said', width: '12%' },
          { key: 'done', header: 'Done', width: '30%' },
          { key: 'carried', header: 'Carried', width: '14%' },
          { key: 'dropped', header: 'Dropped', width: '14%' },
        ]}
        phone="stack"
        rows={list.map(([monday, x]) => ({
          week: <>{`Week ${x.number}`}<div className="pb-sub">{`from ${dayInWords(monday)}`}</div></>,
          said: x.said,
          done: <span className="pb-done-cell"><b>{x.done}</b>{x.said > 0 && <TheBar form="stage" of={x.said} said={x.done} shown={x.proven} label={`Done, ${x.done} of ${x.said} said, ${x.proven} shown by a document`} />}</span>,
          carried: x.carried,
          dropped: x.dropped,
        }))}
      />
      <p className="pb-foot">Carried is what is still open, or was said not to be done. {THE_LEGEND}</p>
    </Section>
  )
}

/** The figures a founder states about money, how long it lasts and what they do each week, kept on their items as said. */
const THE_FIGURES = ['Money', 'Runway', 'Each week'] as const

/**
 * MONEY, RUNWAY AND WEEKLY FIGURES, AS SAID (founder.jpg's headline and runway). One open table: a row for each item of the founder's work
 * plan on which a figure of money, runway or something done each week was said, each as said and "Not said yet" where it was not. No system
 * feeds these, so none is drawn as shown. A figure that has a target is drawn as a ringed bar under "Where each target stands".
 */
export function TheFoundersFigures({ b }: { b: Any }) {
  const rows: Any[] = ((b.workRecords ?? []).find((x: Any) => x.section === 'Work plan')?.rows ?? [])
    .filter((r: Any) => THE_FIGURES.some((l) => String(r.fields?.[l] ?? '').trim()))
  if (!rows.length) return null
  return (
    <Section heading="Money, runway and weekly figures, as said" note="Said by the founder; no system has counted them">
      <Table
        caption="The money, runway and weekly figures said on each item"
        phone="stack"
        columns={[
          { key: 'item', header: 'Item', rowHeader: true, width: '34%' },
          { key: 'Money', header: 'Money', width: '22%' },
          { key: 'Runway', header: 'Runway', width: '22%' },
          { key: 'Each week', header: 'Each week', width: '22%' },
        ]}
        rows={rows.map((r) => ({
          item: <>{r.name}<div className="pb-sub"><Tag tone="plain">{r.kind === 'decision' ? 'Decision' : 'Commitment'}</Tag></div></>,
          ...Object.fromEntries(THE_FIGURES.map((l) => [l, String(r.fields?.[l] ?? '').trim() || NOT_SAID])),
        }))}
      />
    </Section>
  )
}
