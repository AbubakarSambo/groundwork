import { CARD, LABEL } from './OpsLayout'

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
  if (!value) return '—'
  return value.replace(/_/g, ' ').toLowerCase()
}

export function readDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

/** Overdue is worth seeing at a glance, and only where something is actually due. */
export function DueDate({ value }: { value: string | null | undefined }) {
  if (!value) return <>—</>
  const due = new Date(value)
  const late = due < new Date()
  return (
    <span style={late ? { color: 'var(--gw-red-t)', fontWeight: 600 } : undefined}>
      {due.toLocaleDateString()}
      {late ? ' · overdue' : ''}
    </span>
  )
}

export function OpsTable<T>({
  rows,
  columns,
  empty,
  keyOf,
}: {
  rows: T[] | undefined
  columns: Column<T>[]
  /** What to say when there is nothing. Say what it means, not "no data". */
  empty: string
  keyOf: (row: T) => string
}) {
  if (rows === undefined) {
    return <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Working it out…</p>
  }

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
            <tr key={keyOf(row)} style={{ borderTop: '0.5px solid var(--gw-border)' }}>
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
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
