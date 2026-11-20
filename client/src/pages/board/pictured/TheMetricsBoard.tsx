import { Section, Table, Note, Dot } from '@/components/gw/ui'
import type { BoardPresent } from '@/api/board'
import { TheBar } from './TheBar'
import { shareOf } from './TheTicketsBoard'
import './pictured-board.css'

type Any = any
const NOT_SAID = 'Not said yet'
const firstName = (n: unknown) => String(n ?? '').trim().split(/\s+/)[0] ?? ''

/** A figure read only when it is a plain number at the start, such as "40", "162" or "40 this quarter"; "KES 10 million" is left as words and never drawn as a bar. */
const plainFigure = (v: string): number | null => {
  const m = v.match(/^\s*(\d[\d,]*(?:\.\d+)?)\s*%?(?:\s+(?!million\b|billion\b|thousand\b|k\b)\S.*)?$/i)
  return m ? Number(m[1].replace(/,/g, '')) : null
}
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[_‘’“”'"]/g, ' ').replace(/^\s*(?:a|an|the)\s+/, '').replace(/\s+/g, ' ').trim()
const said = (r: Any, label: string): string => String(r.fields?.[label] ?? '').trim()
const withUnit = (value: number, unit: string | null) => `${Number(value).toLocaleString('en-GB')}${unit ? ` ${unit}` : ''}`
const dayInWords = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`))

type Number_ = NonNullable<BoardPresent['whatTheSystemsShow']>['numbers'] extends (infer T)[] | undefined ? T : never

/** The metrics people stated in their check-ins: one record each, with the figure said, the goal said and where they say it comes from. */
export const theMetricsPeopleSaid = (b: Any): Any[] =>
  ((b.workRecords ?? []) as Any[]).flatMap((s) => (s.rows ?? []) as Any[]).filter((r) => r.kind === 'metric')

export type AMetricRow = {
  key: string
  name: string
  goal: string | null
  /** What a system shows now, with the figure the person said beside it where there is one of each. */
  now: string
  alsoSaid: string | null
  /** Where the figure comes from, and whether a system shows it (filled) or a person said it (ringed). */
  source: string
  shownBySystem: boolean
  against: string | null
  bar: { of: number; shown: number; said: number; label: string } | null
  change: string | null
}

/**
 * THE METRICS, ONE ROW EACH: a metric a system holds (a number brought in from another system) and a metric a person stated, joined only where
 * both are named in the same words. A system's value is filled; a person's figure is ringed and never filled; a goal is a goal only where a
 * person stated it, and the bar against it is drawn only where both figures are plain numbers. A figure nobody said reads "Not said yet".
 */
export function theMetricRows(numbers: Number_[], peopleSaid: Any[]): AMetricRow[] {
  const byKey = new Map<string, Number_[]>()
  for (const n of numbers) byKey.set(n.key, [...(byKey.get(n.key) ?? []), n].sort((a, z) => z.measuredAt.localeCompare(a.measuredAt)))
  const unused = new Set(peopleSaid.map((r) => r.id))
  const out: AMetricRow[] = []
  for (const [key, list] of byKey) {
    const [latest, earlier] = list
    /* The name is always in somebody's words: the words the system sent with the figure, or else the words a person used for it, never the key. */
    const match = peopleSaid.find((r) => unused.has(r.id) && (norm(r.name) === norm(latest.label ?? '') || norm(r.name) === norm(key)))
    const wording: string = String(latest.label ?? '').trim() || match?.name || `A figure sent by ${latest.source}`
    if (match) unused.delete(match.id)
    const goalText = match ? (said(match, 'Goal') || (shareOf(said(match, 'Said')) ? String(shareOf(said(match, 'Said'))!.of) : '')) : ''
    const goalN = goalText ? plainFigure(goalText) : null
    out.push({
      key,
      name: wording.replace(/^./, (c) => c.toUpperCase()),
      goal: goalText || null,
      now: withUnit(latest.value, latest.unit),
      alsoSaid: match && said(match, 'Said') ? `${firstName(match.saidBy ?? match.owner) || 'Somebody'} said ${said(match, 'Said')}` : null,
      source: `From ${latest.source}, as of ${dayInWords(latest.measuredAt)}`,
      shownBySystem: true,
      against: goalN ? `${Number(latest.value).toLocaleString('en-GB')} of ${goalN.toLocaleString('en-GB')}` : null,
      bar: goalN ? { of: goalN, shown: latest.value, said: latest.value, label: `${String(wording)}, ${latest.value} of ${goalN}, shown by ${latest.source}` } : null,
      change: earlier ? `${latest.value > earlier.value ? 'Up' : latest.value < earlier.value ? 'Down' : 'The same'} ${latest.value === earlier.value ? 'as' : 'from'} ${Number(earlier.value).toLocaleString('en-GB')}` : null,
    })
  }
  for (const r of peopleSaid.filter((x) => unused.has(x.id))) {
    const figure = said(r, 'Said')
    const share = figure ? shareOf(figure) : null
    const goalText = said(r, 'Goal') || (share ? String(share.of) : '')
    const goalN = goalText ? plainFigure(goalText) : null
    const nowN = share ? share.n : figure ? plainFigure(figure) : null
    out.push({
      key: r.id,
      name: r.name,
      goal: goalText || null,
      now: figure || NOT_SAID,
      alsoSaid: null,
      source: `Said by ${firstName(r.saidBy ?? r.owner) || 'somebody'}${said(r, 'Source') ? `, from ${said(r, 'Source')}` : ''}`,
      shownBySystem: false,
      against: goalN && nowN != null ? `${nowN.toLocaleString('en-GB')} of ${goalN.toLocaleString('en-GB')}` : null,
      bar: goalN && nowN != null ? { of: goalN, shown: 0, said: nowN, label: `${r.name}, ${nowN} of ${goalN}, said and not shown by a system` } : null,
      change: null,
    })
  }
  return out
}

/**
 * WHEN THE NEWEST NUMBER WAS SENT, as mvq4.jpg's "Updated this morning": from the day the newest number was measured, never guessed. A
 * number carries a day and no time, so "today" is as close as the record can say.
 */
export function whenTheNumbersWereUpdated(numbers: { measuredAt: string }[], now = new Date()): string | null {
  const newest = numbers.map((n) => String(n.measuredAt ?? '').slice(0, 10)).filter(Boolean).sort().pop()
  if (!newest) return null
  const day = (d: Date) => d.toISOString().slice(0, 10)
  if (newest === day(now)) return 'Updated today.'
  if (newest === day(new Date(now.getTime() - 86400000))) return 'Updated yesterday.'
  return `Last updated on ${dayInWords(newest)}.`
}

/**
 * WHAT THE SYSTEMS SHOW (mvq4.jpg): one open table with a row for each metric: the metric, its goal, where it stands now, where that comes from
 * and how it stands against the goal as a bar. What a system shows is filled; what a person said is ringed; a goal is only one a person stated.
 * Nobody connects Paystack or MarketView automatically yet: numbers reach the board only when the organisation sends them, so a metric nobody
 * sent is a person's word, and the board says so under the table.
 */
export function TheMetricsTable({ data, rows = [] }: { data: BoardPresent['whatTheSystemsShow']; rows?: Any[] }) {
  if (!data) return null
  const metrics = theMetricRows(data.state === 'filled' ? (data.numbers ?? []) : [], rows)
  if (!metrics.length) {
    return (
      <Section heading={data.heading}>
        <Note tone="muted">{data.why}</Note>
      </Section>
    )
  }
  return (
    <Section heading={data.heading} note={`Ringed is someone’s word. Filled is shown by a system.${data.state === 'filled' && whenTheNumbersWereUpdated(data.numbers ?? []) ? ` ${whenTheNumbersWereUpdated(data.numbers ?? [])}` : ''}`}>
      <Table keepEmptyColumns
        caption="Each metric, its goal, where it stands now and where that comes from"
        phone="stack"
        columns={[
          { key: 'name', header: 'Target', rowHeader: true, width: '24%' },
          { key: 'goal', header: 'Goal', width: '14%' },
          { key: 'now', header: 'Now', width: '18%' },
          { key: 'source', header: 'Source', width: '22%' },
          { key: 'against', header: 'Against goal', width: '22%' },
        ]}
        rows={metrics.map((m) => ({
          name: m.name,
          goal: m.goal ?? NOT_SAID,
          now: <>{m.now}{m.alsoSaid && <div className="pb-sub">{m.alsoSaid}</div>}{m.change && <div className="pb-sub">{m.change}</div>}</>,
          source: <><Dot filled={m.shownBySystem} />{m.source}</>,
          against: m.bar ? <span className="pb-done-cell"><span>{m.against}</span><TheBar form="stage" of={m.bar.of} said={m.bar.said} shown={m.bar.shown} label={m.bar.label} /></span> : NOT_SAID,
        }))}
      />
      {data.state !== 'filled' && <Note tone="muted">{data.why}</Note>}
      {(data.whatANumberIsNot ?? []).map((line, i) => (
        <Note key={i} tone="muted">{line}</Note>
      ))}
    </Section>
  )
}
