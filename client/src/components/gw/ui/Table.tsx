import React from 'react'
import { Tag, type TagTone } from './Tag'
import { Button } from './Button'
import { useTheDesignSystem } from './the-design-system'
import './gw-ui.css'
import { useIsAPhone } from '../../../lib/a-phone-is-not-a-narrow-desktop'

/**
 * TABLE (prototype: the boards' row tables, white `.panel` with hairline rows, app.css; the scenario boards in
 * docs/prototype/screens/G1-example-check-ins/).
 *
 * ONE OPEN TABLE. A real `<table>` with a caption, header cells with `scope`, numbers right-aligned, status tags, an
 * optional totals row. It never folds: pilot customers said "everything is collapsible when it shouldn't be and clients
 * couldn't see their data in tables", so every row is on the page. Use it for any list of records that has columns.
 *
 *   <Table
 *     caption="What each county reports"                 // always read by a screen reader; drawn only with showCaption
 *     columns={[{ key: 'name', header: 'County', rowHeader: true }, { key: 'visits', header: 'Visits', numeric: true }]}
 *     rows={[{ name: 'Kiambu', visits: 120 }]}
 *     totals={{ name: 'All three', visits: 300 }}        // optional
 *   />
 *
 * A cell is a string, a number, any React node, or `{ tag: 'Three months late', tone: 'concern' }` for a status tag
 * (tones are Tag's own: proven, attention, action, concern, plain). A row may carry `_highlight: true` for the amber
 * row the prototype uses where something needs reading first.
 *
 * `hideHeader`: the column names stay in the markup for a screen reader but are not drawn (the prototype's gov rows
 * have none). `phone`: 'scroll' (default) keeps every column and scrolls sideways inside the table's own box,
 * `minWidth` px wide; 'stack' turns each row into a small stack of its own cells on a phone, for narrative rows whose
 * columns are sentences. Both keep the cells in the table's own order, and 'stack' gives the elements their table
 * roles back, since a block-drawn table loses them. In 'stack', each cell also carries its column's name (`data-label`), drawn small above its
 * value (unless `hideHeader`), so "Not said yet" always says what is not said.
 *
 * A LONG LIST IS SAID BEFORE IT IS SHOWN, ON A PHONE ONLY. Past `limit` rows (30 by default) a phone's table draws the first `limit`, says in a plain sentence
 * how many there are and how many are not drawn, and offers "Show the other N" in one press. Two hundred rows at phone width ran to
 * 127,000 pixels with no way to see the shape (board assessment, 15 November). `summary` is the table's own one-sentence shape of the
 * whole list, drawn above it whenever the list is cut, so the part not drawn is still described.
 */
export type TableCell = React.ReactNode | { tag: string; tone?: TagTone }
export type TableRow = Record<string, TableCell | boolean | undefined>
export type TableColumn = {
  key: string
  header: string
  /** Right-aligned, in tabular figures. */
  numeric?: boolean
  /** The row's own name: drawn as a `<th scope="row">`, bold. One per table. */
  rowHeader?: boolean
  /** The column's width, e.g. '22%' or '140px'; the rest share what is left. */
  width?: string
}

/** What a cell says where nobody has said it. On a phone these cells are not drawn one each: the row says once which are missing. */
const MISSING = 'Not said yet'
const isMissing = (c: unknown) => typeof c === 'string' && c.trim() === MISSING
const wordsOf = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0])

function isTag(c: unknown): c is { tag: string; tone?: TagTone } {
  return typeof c === 'object' && c !== null && !React.isValidElement(c) && 'tag' in (c as object)
}

function cell(c: TableCell | boolean | undefined): React.ReactNode {
  if (isTag(c)) return <Tag tone={c.tone ?? 'plain'}>{c.tag}</Tag>
  if (typeof c === 'boolean') return null
  return c
}

/** The small round mark at the start of a row: filled when something is on the record, open when it is only said or still open. Decorative. */
/*
 * THE TABLE'S CLASSES, AS IT WAS AND ON A REBUILT PAGE (rule 4, the design system, 23 November 2026).
 * On a rebuilt page the table has no box of its own (a card holds it if it needs one), its numbers
 * are right-aligned in tabular figures, and a wide table scrolls inside its own region (blocks.css).
 */
const OLD = {
  wrap: 'gwui-table-wrap', panel: 'panel', wrapStack: 'gwui-table-wrap-stack', table: 'gwui-table', stack: 'gwui-table-stack',
  caption: 'gwui-table-caption', num: 'gwui-table-num', rowhead: 'gwui-table-rowhead', hl: 'gwui-table-hl', missing: 'gwui-table-missing',
  gaps: 'gwui-table-gaps', total: 'gwui-table-total', more: 'gwui-table-more', moreText: 't-small', summary: 'gwui-table-summary',
}
const DS: typeof OLD = {
  wrap: 'ds-table-wrap', panel: '', wrapStack: '', table: 'ds-table', stack: 'ds-table-stack',
  caption: 'ds-table-caption', num: 'ds-table-num', rowhead: 'ds-table-rowhead', hl: 'ds-table-hl', missing: '',
  gaps: 'ds-table-gaps', total: 'ds-table-total', more: 'ds-table-more', moreText: 'ds-text-secondary', summary: 'ds-text-secondary',
}

export function Dot({ filled }: { filled?: boolean }) {
  return <span aria-hidden className={filled ? 'gwui-table-dot gwui-table-dot-on' : 'gwui-table-dot'} />
}

export function Table({ caption, columns: allColumns, rows: allRows, totals, hideHeader, showCaption, phone = 'scroll', minWidth = 560, onPanel = true, limit = 10, summary, what = 'rows', keepEmptyColumns = false }: {
  caption: string
  columns: TableColumn[]
  rows: TableRow[]
  totals?: TableRow
  hideHeader?: boolean
  showCaption?: boolean
  phone?: 'scroll' | 'stack'
  minWidth?: number
  /** Drawn in its own white box (default). False when it sits inside a Panel that already is one. */
  onPanel?: boolean
  /** Rows drawn before the rest wait behind "Show the other N". */
  limit?: number
  /** One plain sentence about the whole list, drawn above it when the list is cut. */
  summary?: React.ReactNode
  /** What a row is, in the plural, for the sentence about the cut ("loans", "tickets"). */
  what?: string
  /** A column nobody has filled in is dropped, unless its emptiness is the answer (a group nobody from answered). */
  keepEmptyColumns?: boolean
}) {
  const [showAll, setShowAll] = React.useState(false)
  const k = useTheDesignSystem() ? DS : OLD
  /* A column nobody has filled in is not drawn: "Not said yet" fourteen times down one column says it once too often (Hafsah, 15 November). */
  const columns = allRows.length > 1 && !keepEmptyColumns ? allColumns.filter((c) => c.rowHeader || !allRows.every((row) => isMissing(row[c.key]))) : allColumns
  /* The cut is for a phone only: a desktop table of two hundred rows is a normal page (Hafsah, 15 November). */
  const phoneScreen = useIsAPhone()
  const cut = phoneScreen && !showAll && allRows.length > limit
  const rows = cut ? allRows.slice(0, limit) : allRows
  const stack = phone === 'stack'
  const r = (role: string) => (stack ? { role } : {})
  // A stacked cell has no column beside it, so it carries its column's name, drawn small above its value on a phone only (the
  // stylesheet draws `data-label`, so the name is not a second copy in the page's text). Skipped where the header is hidden on purpose
  // (a column of sentences that names itself).
  const label = (c: TableColumn) => (stack && !hideHeader ? c.header : undefined)
  const wrapCls = [k.wrap, onPanel && k.panel, stack && k.wrapStack].filter(Boolean).join(' ')
  return (
    <>
    {phoneScreen && allRows.length > limit && summary ? <p className={k.summary}>{summary}</p> : null}
    <div className={wrapCls} {...(!stack ? { role: 'region', 'aria-label': caption, tabIndex: 0 } : {})}>
      <table className={stack ? `${k.table} ${k.stack}` : k.table} style={stack ? undefined : { minWidth }} {...r('table')} aria-label={stack ? caption : undefined}>
        <caption className={showCaption ? k.caption : 'gwui-sr-only'}>{caption}</caption>
        {columns.some((c) => c.width) && <colgroup>{columns.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}</colgroup>}
        <thead className={hideHeader ? 'gwui-sr-only' : undefined} {...r('rowgroup')}>
          <tr {...r('row')}>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.numeric ? k.num : undefined} {...r('columnheader')}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody {...r('rowgroup')}>
          {rows.map((row, i) => (
            <tr key={i} className={row._highlight ? k.hl : undefined} {...r('row')}>
              {columns.map((c) =>
                c.rowHeader ? (
                  <th key={c.key} scope="row" className={k.rowhead} {...r('rowheader')}>{cell(row[c.key])}</th>
                ) : (
                  <td key={c.key} className={[c.numeric && k.num, stack && isMissing(row[c.key]) && k.missing].filter(Boolean).join(' ') || undefined} data-label={label(c)} {...r('cell')}>{
                    /* Said once a row: the first gap in a row says "Not said yet", the others are a quiet dash under their own column's name. */
                    isMissing(row[c.key]) && columns.find((k) => !k.rowHeader && isMissing(row[k.key])) !== c
                      ? <span aria-label={MISSING}>–</span>
                      : cell(row[c.key])
                  }</td>
                ),
              )}
              {stack && !hideHeader && (() => {
                const gaps = columns.filter((c) => !c.rowHeader && isMissing(row[c.key])).map((c) => c.header.toLowerCase())
                /* One line a row on a phone, where there are two or more gaps; a single gap keeps its own cell. */
                return gaps.length > 1 ? <td className={k.gaps} {...r('cell')}>{`Not said yet for ${wordsOf(gaps)}.`}</td> : null
              })()}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot {...r('rowgroup')}>
            <tr className={k.total} {...r('row')}>
              {columns.map((c, i) =>
                i === 0 ? (
                  <th key={c.key} scope="row" className={k.rowhead} {...r('rowheader')}>{cell(totals[c.key])}</th>
                ) : (
                  <td key={c.key} className={c.numeric ? k.num : undefined} data-label={label(c)} {...r('cell')}>{cell(totals[c.key])}</td>
                ),
              )}
            </tr>
          </tfoot>
        )}
      </table>
      {cut && (
        <div className={k.more}>
          <p className={k.moreText}>{`The first ${limit} of ${allRows.length} ${what} are shown.`}</p>
          <Button kind="secondary" size="small" onClick={() => setShowAll(true)}>{`Show the other ${allRows.length - limit}`}</Button>
        </div>
      )}
    </div>
    </>
  )
}
