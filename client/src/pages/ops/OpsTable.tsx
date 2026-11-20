import { Skeleton } from '@/components/gw/ui/Skeleton'
import { CARD, LABEL } from './OpsLayout'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * One table for every list in the back office.
 *
 * Written once so that adding a page is choosing columns rather than writing
 * markup — and so no page can quietly invent its own way of saying "nothing
 * here yet", which is the line people read most often on a system this new.
 */

export interface Column<T> {
  head: string
  cell: (row: T) => React.ReactNode
  /** Numbers line up; text does not. */
  numeric?: boolean
}

export function readEnum(value: string | null | undefined): string {
  if (!value) return ' - '
  return value.replace(/_/g, ' ').toLowerCase()
}

export function readDate(value: string | Date | null | undefined): string {
  if (!value) return ' - '
  return whenItWas(value, 'day')
}

/** Overdue is worth seeing at a glance, and only where something is actually due. */
export function DueDate({ value }: { value: string | null | undefined }) {
  if (!value) return <> - </>
  const due = new Date(value)
  const late = due < new Date()
  return (
    <span style={late ? { color: 'var(--gw-red-t)', fontWeight: 700 } : undefined}>
      {whenItWas(due, 'day')}
      {late ? ' · overdue' : ''}
    </span>
  )
}

/**
 * The filters above a table.
 *
 * Every list here gets the same three, because they are the same three
 * questions on every list: is it mine, is it live, and is it late. Written once
 * so a page cannot invent a fourth way of asking them — and so a filter that
 * matches nothing says so rather than showing an empty table that looks like no
 * data.
 */
export interface Filter<T> {
  label: string
  keep: (row: T) => boolean
}

export function Filters<T>({
  filters,
  active,
  onPick,
  showing,
  total,
}: {
  filters: Filter<T>[]
  active: string | null
  onPick: (label: string | null) => void
  showing: number
  total: number
}) {
  if (total === 0) return null

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 10 }}>
      {[{ label: 'All', keep: () => true }, ...filters].map((f) => {
        const on = f.label === 'All' ? active === null : active === f.label
        return (
          <button className={`gwui-choice${on ? ' gwui-choice-on' : ''}`}
            key={f.label}
            type="button"
            onClick={() => onPick(f.label === 'All' ? null : f.label)}
            aria-pressed={on}
          >
            {f.label}
          </button>
        )
      })}
      {active !== null && (
        <span style={{ fontSize: 12, color: 'var(--gw-sub)', marginLeft: 4 }}>
          {showing} of {total}
        </span>
      )}
    </div>
  )
}

export function OpsTable<T>({
  rows,
  columns,
  empty,
  keyOf,
  filteredOutOf,
}: {
  rows: T[] | undefined
  columns: Column<T>[]
  /** What to say when there is nothing. Say what it means, not "no data". */
  empty: string
  keyOf: (row: T) => string
  /** How many there were before filtering, so an empty filter is not read as an empty list. */
  filteredOutOf?: number
}) {
  if (rows === undefined) {
    return <Skeleton what="Getting this table" shape="lines" count={2} />
  }

  /*
   * "Nothing matches that filter" and "there is nothing here" are different
   * facts, and an empty table cannot tell them apart. Getting this wrong sends
   * somebody looking for missing data that was never missing.
   */
  const emptyBecauseFiltered = rows.length === 0 && (filteredOutOf ?? 0) > 0

  return (
    <div style={{ ...CARD, padding: 0, overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 640 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.head}
                style={{
                  ...LABEL,
                  textAlign: c.numeric ? 'right' : 'left',
                  padding: '10px 12px',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyOf(row)} style={{ borderTop: '1px solid var(--gw-border)' }}>
              {columns.map((c) => (
                <td
                  key={c.head}
                  style={{
                    padding: '10px 12px',
                    textAlign: c.numeric ? 'right' : 'left',
                    fontVariantNumeric: c.numeric ? 'tabular-nums' : undefined,
                    verticalAlign: 'top',
                  }}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: '16px 12px', color: 'var(--gw-sub)' }}>
                {emptyBecauseFiltered
                  ? `None of the ${filteredOutOf} here match that. Try All.`
                  : empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
