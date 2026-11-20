import { useState } from 'react'
import { Section, Tag, Table, Button, Dot } from '@/components/gw/ui'
import { TheBar, CORRECT_IT_HERE } from './TheBar'
import './pictured-board.css'

type Any = any
const firstName = (n: unknown) => String(n ?? '').trim().split(/\s+/)[0] ?? ''
const NOT_SAID = 'Not said yet'

/**
 * THE TICKETS FAMILY (support.jpg, ops.jpg, eng.jpg): tickets, incidents and tasks are one shape, a piece of work that moves through
 * stages with a person on it. One board draws all three. The three kinds differ only in the words they use and in which details of a
 * record are shown as columns; every detail is a `fields` label on the record (the extraction in the-kind-of-work.ts gives them), and
 * a detail nobody has said reads "Not said yet". Nothing here is worked out or made up.
 *
 * A trader training programme (programme.jpg) is the same shape: a group of traders moves through its sessions with an officer on it,
 * its county under the officer's name and its size beside its name. Its figures, women and who attended, are said as "26 of 42" or a
 * percent, and each is drawn as a ringed bar, as said, never filled unless a document backs the line.
 */
export type ATicketKind = {
  heading: string
  /** One piece of work, singular and plural, as the people on this board say it. */
  one: string
  many: string
  /** The header of the person column, and the label of the place that sits under their name (a queue, a site). */
  who: string
  place: string
  /** The `fields` label of a size said beside the item's name, such as the people in a group. */
  size?: string
  /** The detail columns: a header, and the `fields` labels it shows. One label shows its value alone; several show each, named. */
  columns: { header: string; labels: string[]; asBar?: boolean }[]
  /** The figures an area card (a queue, a site, an area of work) shows from its own records, each a `fields` label. */
  area: { heading: string; labels: string[] }
  /** What the detail card of one selected record holds (eng.jpg: Change, Test, Deploy), each a `fields` label said word for word or "Not said yet". */
  card: string[]
}

export const TICKET_KINDS: Record<string, ATicketKind> = {
  'support desk': {
    heading: 'Every ticket, and what shows it', one: 'ticket', many: 'tickets', who: 'Agent', place: 'Queue',
    columns: [{ header: 'Cause', labels: ['Cause'] }, { header: 'Seen before', labels: ['Seen before'] }],
    area: { heading: 'By queue', labels: ['Within a day', 'Reopened', 'Passed to engineering'] },
    card: ['Queue', 'Cause', 'Seen before'],
  },
  'distribution operations': {
    heading: 'Every incident, and what shows it', one: 'incident', many: 'incidents', who: 'Owner', place: 'Site',
    columns: [{ header: 'Impact', labels: ['Impact'] }, { header: 'Cause', labels: ['Cause'] }, { header: 'Fix and prevention', labels: ['Fix', 'Prevention'] }],
    area: { heading: 'By site', labels: ['On time', 'Downtime'] },
    card: ['Impact', 'Cause', 'Fix', 'Prevention'],
  },
  'engineering release': {
    heading: 'Every task, and what shows it', one: 'task', many: 'tasks', who: 'Owner', place: 'Area',
    columns: [{ header: 'Done', labels: ['Done'], asBar: true }, { header: 'Change, test and deploy', labels: ['Change', 'Test', 'Deploy'] }],
    area: { heading: 'By area of work', labels: ['Blocked', 'Released'] },
    card: ['Change', 'Test', 'Deploy'],
  },
  'trader training programme': {
    heading: 'Every trader, and what shows it', one: 'group', many: 'groups', who: 'Officer', place: 'County', size: 'Group size',
    columns: [
      { header: 'Women', labels: ['Women'], asBar: true },
      { header: 'Who came', labels: ['Attended'], asBar: true },
      { header: 'Where people stopped', labels: ['Drop-off', 'Why missed'] },
    ],
    area: { heading: 'By county', labels: ['Reached', 'Women', 'Completed', 'Budget spent', 'Cost per trainee'] },
    card: ['Women', 'Attended', 'Why missed'],
  },
}

export const isATicketsKind = (k: unknown): k is string => typeof k === 'string' && k in TICKET_KINDS

/** The one table of a board's work: its Deal grid, where it holds rows. */
export const theTicketGrid = (b: Any): Any | null => (b.workRecords ?? []).find((x: Any) => x.section === 'Deal grid' && (x.rows ?? []).length) ?? null

const said = (r: Any, label: string): string => String(r.fields?.[label] ?? '').trim()

/** Where a record stands now: its stage where the kind has stages, else what the person said about where it stands. */
const stageOf = (r: Any): string => String(r.stage ?? '').trim() || said(r, 'Where it stands')

/** A figure as a share of a whole, only where the person gave it as "26 of 42" or as a percent ("60% done", "88%"); otherwise none, and nothing is drawn. */
export const shareOf = (v: string): { n: number; of: number } | null => {
  const f = v.match(/(\d[\d,]*)\s+of\s+(\d[\d,]*)/)
  if (f) { const n = Number(f[1].replace(/,/g, '')), of = Number(f[2].replace(/,/g, '')); return of > 0 && n <= of ? { n, of } : null }
  const m = v.match(/(\d+(?:\.\d+)?)\s*%/)
  return m ? { n: Math.min(100, Number(m[1])), of: 100 } : null
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

/** A detail cell: each label that has been said, or "Not said yet". A percent is also drawn as a ringed bar, since it is somebody's word. */
function Detail({ r, labels, asBar }: { r: Any; labels: string[]; asBar?: boolean }) {
  const held = labels.filter((l) => said(r, l))
  if (!held.length) return <>{NOT_SAID}</>
  if (labels.length === 1) {
    const v = said(r, labels[0])
    const share = asBar ? shareOf(v) : null
    return <>{v}{share && <TheBar form="stage" of={share.of} said={share.n} label={`${labels[0]}, ${share.n} of ${share.of}, said and not shown by a document`} />}</>
  }
  return <>{held.map((l) => <span className="pb-row-more" key={l}><b>{l}</b> {said(r, l)}</span>)}</>
}

/**
 * THE DETAIL OF ONE RECORD (eng.jpg "Payment integration: Change, Test, Deploy"; support.jpg and ops.jpg the same): the record the lead
 * selected, with each detail its people said word for word, "Not said yet" for one nobody said, what happens next, and how it is known.
 * The first record is open at the start, as in the pictures. Nothing here is worked out.
 */
function TheOpenRecord({ r, t }: { r: Any; t: ATicketKind }) {
  const proofed = r.mark === 'proven'
  const next = r.nextStep ?? r.next ?? said(r, 'Next step')
  return (
    <div className="pb-card pb-open-record" aria-label={`The detail of ${r.name}`}>
      <div className="pb-card-top"><h3 className="pb-card-h">{r.name}</h3></div>
      <dl className="pb-record-card">
        {t.card.map((l) => <div key={l}><dt>{l}</dt><dd>{said(r, l) || NOT_SAID}</dd></div>)}
      </dl>
      <p className="pb-sub">{next ? `Next, ${String(next).charAt(0).toLowerCase()}${String(next).slice(1).replace(/[.]+$/, '')}.` : 'What happens next has not been said yet.'}</p>
      <p className="pb-sub">{proofed ? 'A document backs this record.' : `${firstName(r.saidBy ?? r.owner) || 'Somebody'} said this, and no document backs it yet.`}</p>
    </div>
  )
}

/**
 * EVERY TICKET, INCIDENT OR TASK, AND WHAT SHOWS IT: one open table, a row for each record on the board. Above it, the count as one
 * bar (filled for what a document backs, ringed for what somebody said) and one chip for each stage somebody said.
 */
export function EveryTicketAndWhatShowsIt({ section, kindOfWork, groundId, me }: { section: Any; kindOfWork: string; groundId: string; me: string | null }) {
  const t = TICKET_KINDS[kindOfWork]
  const rows: Any[] = (section.rows ?? []).filter((r: Any) => r.kind !== 'county')
  const [openId, setOpenId] = useState<string | null>(null)
  if (!t || !rows.length) return null
  const open = rows.find((r) => r.id === openId) ?? rows[0]
  const stages: string[] = Array.isArray(section.stages) ? section.stages : []
  const proven = rows.filter((r) => r.mark === 'proven').length
  const columns = [
    { key: 'item', header: t.one.charAt(0).toUpperCase() + t.one.slice(1), rowHeader: true, width: '15%' },
    { key: 'who', header: t.who, width: '10%' },
    { key: 'stage', header: 'Stage now', width: '13%' },
    ...t.columns.map((c, i) => ({ key: `d${i}`, header: c.header, width: `${Math.floor(40 / t.columns.length)}%` })),
    { key: 'shows', header: 'What shows it', width: '10%' },
    { key: 'next', header: 'Next', width: '12%' },
  ]
  return (
    <Section heading={t.heading} >
      <div className="pb-ticket-count">
        <TheBar of={rows.length} shown={proven} said={rows.length - proven} label={`${plural(rows.length, t.one, t.many)}, ${proven} shown by a document`} />
      </div>
      <div className="pb-ticket-table">
      <Table
        caption={`Each ${t.one}, with what shows it and what happens next`}
        phone="stack"
        what={t.many}
        columns={columns}
        rows={rows.map((r) => {
          const proofed = r.mark === 'proven'
          const place = said(r, t.place)
          const stage = stageOf(r)
          const at = stage && stages.length ? stages.indexOf(stage) : -1
          const row: Record<string, any> = {
            item: <><Dot filled={proofed} /><button type="button" className="pb-pick" aria-pressed={r.id === open.id} onClick={() => setOpenId(r.id)}>{r.name}</button>{t.size && said(r, t.size) ? ` (${said(r, t.size)})` : ''}</>,
            who: <><b>{me && r.ownerParticipantId === me ? 'You' : r.owner ? firstName(r.owner) : 'Nobody yet'}</b>{place && <div className="pb-sub">{place}</div>}</>,
            stage: stage
              ? <>{<Tag tone={proofed ? 'proven' : 'plain'}>{stage}</Tag>}{at >= 0 && <TheBar form="stage" of={stages.length} said={at + 1} shown={proofed ? at + 1 : 0} label={`${stage}, stage ${at + 1} of ${stages.length}${proofed ? ', shown by a document' : ', said and not shown by a document'}`} />}</>
              : NOT_SAID,
            shows: proofed ? 'A document backs it' : `${firstName(r.saidBy ?? r.owner) || 'Somebody'} said it`,
            next: r.nextStep ?? r.next ?? (said(r, 'Next step') || NOT_SAID),
          }
          t.columns.forEach((c, i) => { row[`d${i}`] = <Detail r={r} labels={c.labels} asBar={c.asBar} /> })
          return row
        })}
      />
      </div>
      <TheOpenRecord r={open} t={t} />
      <div style={{ textAlign: 'center' }}><Button kind="quiet" to={`/grounds/${groundId}`}>Not right? Tell the check-in</Button></div>
      <p className="pb-foot">{CORRECT_IT_HERE}</p>
    </Section>
  )
}

/**
 * EACH QUEUE, SITE OR AREA OF WORK, AS ONE CARD (support.jpg "By queue", ops.jpg "By site", eng.jpg "By area of work"). The count of
 * records in it is the board's own (`byArea`); every other figure is what the people on its records said, each as said, and one nobody
 * has said reads "Not said yet". A figure given as a percent is also a ringed bar. Names are the people whose records are in it.
 */
export function EachAreaOfTheWork({ b }: { b: Any }) {
  const a = b.byArea
  const t = TICKET_KINDS[b.kindOfWork]
  const grid = theTicketGrid(b)
  if (!t || !grid || !a || a.state !== 'filled' || !(a.areas ?? []).length) return null
  const byId = new Map<string, Any>((grid.rows ?? []).map((r: Any) => [r.id, r]))
  const heading = a.heading === 'By area' && b.kindOfWork === 'engineering release' ? t.area.heading : (a.heading ?? t.area.heading)
  return (
    <Section heading={heading}>
      <div className="pb-area-cards">
        {a.areas.map((x: Any) => {
          const rs: Any[] = (x.recordIds ?? []).map((id: string) => byId.get(id)).filter(Boolean)
          const who = [...new Set(rs.map((r) => firstName(r.owner)).filter(Boolean))]
          return (
            <div className="pb-card" key={x.area}>
              <div className="pb-card-top"><h3 className="pb-card-h">{x.area}</h3></div>
              <div className="pb-area-figures">
                <div className="pb-area-figure">{Number.isFinite(x.records) && <><b>{Number(x.records).toLocaleString('en-GB')}</b><span>{x.records === 1 ? t.one : t.many}</span></>}</div>
                {t.area.labels.map((l) => {
                  const values = [...new Set(rs.map((r) => said(r, l)).filter(Boolean))]
                  const share = values.length === 1 ? shareOf(values[0]) : null
                  return (
                    <div className="pb-area-figure" key={l}>
                      {values.length ? <b className={values.join('; ').length > 14 ? 'pb-area-words' : undefined}>{values.join('; ')}</b> : <span className="pb-area-none">{NOT_SAID}</span>}
                      <span>{l}</span>
                      {share && <TheBar form="stage" of={share.of} said={share.n} label={`${l}, ${share.n} of ${share.of}, said and not shown by a document`} />}
                    </div>
                  )
                })}
              </div>
              <p className="pb-sub">{x.says}</p>
              {who.length > 0 && <p className="pb-sub"><b>{who.join(', ')}</b></p>}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/**
 * INCIDENTS BY SITE AND TYPE (ops.jpg): one count for each incident on record that says its site and its type, in the last eight
 * weeks of what was said. Drawn only where some incident says both; otherwise nothing, and the board says no more than the record does.
 */
export function theIncidentsBySiteAndType(b: Any, now: Date): Any[] {
  const grid = theTicketGrid(b)
  if (!grid) return []
  const since = now.getTime() - 56 * 86400000
  return (grid.rows ?? [])
    .filter((r: Any) => r.kind === 'incident' && said(r, 'Site') && said(r, 'Type') && (!r.lastSaidOn || Date.parse(`${r.lastSaidOn}T12:00:00Z`) >= since))
    .map((r: Any) => ({ id: r.id, fields: { site: said(r, 'Site'), type: said(r, 'Type'), count: 1 } }))
}
