import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { opsApi, type OpsEverybodyRow } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'

/**
 * THE ONE BOARD. Everybody's quarter, side by side.
 *
 * Read `everybody-in-one-place.ts` in the API before adding anything here. Two
 * things this page must not grow: a total across the columns, and a sort. Both
 * turn six people doing six different jobs into a ranking.
 *
 * So there is no table header with a total row, and the column headings are not
 * buttons. The rows are in name order because the server put them in name order.
 */

const money = (cents: number) =>
  cents === 0 ? ' - ' : `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const SERVES_SAID: Record<string, string> = {
  SALES: 'sales',
  MOAT: 'the moat',
  UNLOCKS_A_CUSTOMER: 'a new customer',
  KEEPING_IT_UP: 'keeping it up',
}

function Count({ label, value, muted }: { label: string; value: number | string; muted?: boolean }) {
  return (
    <div style={{ minWidth: 74 }}>
      <div style={{ ...LABEL, fontSize: 10 }}>{label}</div>
      <div
        style={{
          fontSize: 19,
          fontVariantNumeric: 'tabular-nums',
          color: muted && (value === 0 || value === ' - ') ? 'var(--gw-sub)' : 'inherit',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function PersonRow({ row }: { row: OpsEverybodyRow }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ ...CARD, marginBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 170, flex: '1 1 170px' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{row.displayName}</div>
          <div style={{ ...LABEL, fontSize: 10, marginTop: 2 }}>
            {row.functionalRole.replace(/_/g, ' ').toLowerCase()}
          </div>
        </div>

        <Count label="Objectives" value={row.objectives.length} muted />
        <Count label="Committed" value={row.commitments.total} muted />
        <Count label="Done" value={row.commitments.closed} muted />
        <Count label="Blocked" value={row.commitments.blocked} muted />
        <Count label="Originated" value={row.sales.originated} muted />
        <Count label="New revenue" value={money(row.sales.newRevenueCents)} muted />
        <Count label="Work declared" value={row.product.total} muted />
      </div>

      {row.says.length > 0 && (
        <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--gw-sub)' }}>
          {row.says.map((s, i) => (
            <li key={i} style={{ marginBottom: 3 }}>
              {s}
            </li>
          ))}
        </ul>
      )}

      {(row.objectives.length > 0 || row.product.total > 0) && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            style={{ all: 'unset', cursor: 'pointer', ...LABEL, fontSize: 10 }}
          >
            {open ? 'Hide what these are' : 'What these are'}
          </button>
          {open && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {row.objectives.map((o) => (
                <div key={o.id} style={{ marginBottom: 5 }}>
                  {o.title}
                  <span style={{ color: 'var(--gw-sub)' }}>
                    {o.serves ? ` - serves ${SERVES_SAID[o.serves] ?? o.serves.toLowerCase()}` : ' - serves nothing named'}
                    {o.unjustifiedKeyResults > 0
                      ? ` · ${o.unjustifiedKeyResults} target${o.unjustifiedKeyResults === 1 ? '' : 's'} with no justification or approach`
                      : ''}
                  </span>
                </div>
              ))}
              {Object.entries(row.product.byServes).map(([serves, n]) => (
                <div key={serves} style={{ color: 'var(--gw-sub)', marginBottom: 3 }}>
                  {n} piece{n === 1 ? '' : 's'} of work serving {SERVES_SAID[serves] ?? serves.toLowerCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function OpsEverybodyPage() {
  const [period, setPeriod] = useState('')
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })
  const chosen = period || periods.data?.[0]?.key || ''

  const board = useQuery({
    queryKey: ['ops', 'everybody', chosen],
    queryFn: () => opsApi.everybody(chosen),
    enabled: chosen !== '',
    retry: false,
  })

  return (
    <div style={PAGE}>
      <OpsHeader
        name="Everybody"
        answers="What each person agreed to this period, and what they did. Read a row on its own - nothing here is added up across people, and the order is by name on purpose."
      />

      {(periods.data ?? []).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <select
            value={chosen}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Period"
            style={{ padding: '6px 8px', fontSize: 13 }}
          >
            {(periods.data ?? []).map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {board.data && (
        <div
          style={{
            ...CARD,
            marginBottom: 16,
          }}
        >
          <div style={{ ...LABEL, fontSize: 10 }}>The period</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{board.data.quarter.says}</div>
        </div>
      )}

      {board.isError && (
        <div style={CARD}>
          You cannot see everybody's contribution. That needs contributor:read-all.
        </div>
      )}

      {(board.data?.people ?? []).map((row) => (
        <PersonRow key={row.personId} row={row} />
      ))}

      {board.data && (board.data.people ?? []).length === 0 && (
        <div style={CARD}>Nobody active is on the team yet.</div>
      )}
    </div>
  )
}
