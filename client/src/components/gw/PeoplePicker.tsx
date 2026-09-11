import { useMemo, useState } from 'react'

/**
 * ADDING PEOPLE THE WAY A GROUP CHAT DOES IT.
 *
 * Search, tick names, one button. "Should be able to click team and see a list and select like how
 * you add people to WhatsApp groups." Colleagues are already known to the organisation, so nobody
 * types an address for them; the box for an outsider stays beside this, owned by the caller.
 *
 * The component knows nothing about check-ins: it takes a list, hides the ones already in, and hands
 * back the chosen addresses. Two callers use it - the Setup chat's invite step and the Setup tab -
 * and the same thing in two places is the point.
 */
export interface APerson {
  email: string
  name: string | null
}

export function PeoplePicker({
  people,
  alreadyIn,
  onAdd,
  adding = false,
}: {
  people: APerson[]
  /** Addresses already on the check-in, or already queued. Lower-cased inside. */
  alreadyIn: string[]
  onAdd: (chosen: APerson[]) => void
  adding?: boolean
}) {
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<Set<string>>(new Set())

  const inAlready = useMemo(() => new Set(alreadyIn.map((e) => e.toLowerCase())), [alreadyIn])
  const candidates = useMemo(() => people.filter((p) => !inAlready.has(p.email.toLowerCase())), [people, inAlready])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((p) => (p.name ?? '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [candidates, query])

  if (!candidates.length) return null

  const toggle = (email: string) =>
    setChosen((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  const allShownChosen = shown.length > 0 && shown.every((p) => chosen.has(p.email))

  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', marginBottom: 10 }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--gw-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          aria-label="Find a colleague"
          placeholder={`Find someone in your organisation (${candidates.length})`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
        <button
          type="button"
          onClick={() => setChosen((prev) => {
            const next = new Set(prev)
            if (allShownChosen) shown.forEach((p) => next.delete(p.email))
            else shown.forEach((p) => next.add(p.email))
            return next
          })}
          style={{ background: 'none', border: 'none', color: 'var(--gw-navy)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '0 4px', whiteSpace: 'nowrap' }}
        >
          {allShownChosen ? 'Clear' : shown.length === candidates.length ? 'Select everyone' : `Select these ${shown.length}`}
        </button>
      </div>
      <div role="listbox" aria-multiselectable="true" style={{ maxHeight: 260, overflowY: 'auto' }}>
        {shown.length === 0 && (
          <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--gw-muted)' }}>Nobody in your organisation matches that. Add them by address below.</div>
        )}
        {shown.map((p) => {
          const on = chosen.has(p.email)
          return (
            <label
              key={p.email}
              role="option"
              aria-selected={on}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderTop: '1px solid var(--gw-border)', background: on ? 'var(--gw-bg)' : 'white' }}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(p.email)} aria-label={p.name ?? p.email} />
              <span style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {(p.name ?? p.email).trim().charAt(0).toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name ?? p.email}</span>
                {p.name && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--gw-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</span>}
              </span>
            </label>
          )
        })}
      </div>
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--gw-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--gw-sub)' }}>
          {chosen.size === 0 ? 'Tick the people who should answer for this.' : `${chosen.size} selected`}
        </span>
        <button
          type="button"
          disabled={chosen.size === 0 || adding}
          onClick={() => {
            const picked = candidates.filter((p) => chosen.has(p.email))
            setChosen(new Set())
            setQuery('')
            onAdd(picked)
          }}
          style={{ padding: '8px 14px', borderRadius: 7, background: chosen.size === 0 || adding ? 'var(--gw-border)' : 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: chosen.size === 0 || adding ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >
          {adding ? 'Adding…' : chosen.size <= 1 ? 'Add' : `Add ${chosen.size} people`}
        </button>
      </div>
    </div>
  )
}
