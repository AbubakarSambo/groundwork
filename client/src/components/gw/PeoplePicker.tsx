import { useMemo, useState } from 'react'
import { roleWord } from './your-organisations'

/**
 * ADDING PEOPLE THE WAY A GROUP CHAT DOES IT.
 *
 * Search, tick names, one button. "Should be able to click team and see a list and select like how
 * you add people to WhatsApp groups." Colleagues are already known to the organisation, so nobody
 * types an address for them; the box for an outsider stays beside this, owned by the caller.
 *
 * The component knows nothing about check-ins: it takes a list, hides the ones already in, and hands
 * back the chosen people. Two callers use it - the Setup chat's invite step and the Setup tab -
 * and the same thing in two places is the point.
 *
 * NO ADDRESSES (U.4). The list of colleagues carries each person's id, name, role and team, and
 * nothing else: Hafsah decided nobody sees anything of a colleague beyond name, role and team. So a
 * person is picked by id and the server looks their address up. Typing a team's name finds everyone
 * in it, and "Select these" adds the whole team.
 *
 * ROLE BESIDE THE NAME (8 October, night note item 2, found by the old-against-new check on
 * Riverbank Trading). `GET /users/colleagues` serves `role` and `team` for every colleague, and
 * several rows can read the same name - "Someone who has not given a name yet" among them - so both
 * are shown under the name, not team alone, to tell two same-named rows apart.
 */
export interface APerson {
  id: string
  name: string
  role?: string
  team?: string | null
}

/**
 * B-054: THE PRODUCT'S OWN WORD FOR THE ROLE, NOT THE SERVER'S CODE. `GET /users/colleagues` serves
 * `role` as it is stored - "MEMBER", "LEAD" - and this used to print that straight under the name,
 * so a lead read "Arjun Shah, MEMBER" and searching "takes part" or "account manager" found nobody,
 * because nothing on screen or in the search read those words. `roleWord` (your-organisations.ts) is
 * the one mapping the People page itself already uses for the same codes - "Admin", "Can open
 * check-ins", "Takes part" - so this reads and searches the same word a lead already knows from
 * there, never a second translation of the same codes.
 *
 * Role and team together, comma-joined as the rest of the product already writes two facts side
 * by side (see `whereTheySitLine`, people-here.ts) - never a colon, dot or arrow between them.
 */
function roleAndTeam(p: APerson): string {
  const role = roleWord(p.role).trim()
  const team = (p.team ?? '').trim()
  if (role && team) return `${role}, ${team}`
  return role || team
}

export function PeoplePicker({
  people,
  alreadyIn,
  onAdd,
  adding = false,
}: {
  people: APerson[]
  /** The ids of the people already on the check-in, or already queued. */
  alreadyIn: string[]
  onAdd: (chosen: APerson[]) => void
  adding?: boolean
}) {
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<Set<string>>(new Set())

  const inAlready = useMemo(() => new Set(alreadyIn), [alreadyIn])
  const candidates = useMemo(() => people.filter((p) => !inAlready.has(p.id)), [people, inAlready])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.team ?? '').toLowerCase().includes(q) || roleWord(p.role).toLowerCase().includes(q))
  }, [candidates, query])

  if (!candidates.length) return null

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allShownChosen = shown.length > 0 && shown.every((p) => chosen.has(p.id))

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
            if (allShownChosen) shown.forEach((p) => next.delete(p.id))
            else shown.forEach((p) => next.add(p.id))
            return next
          })}
          style={{ background: 'none', border: 'none', color: 'var(--gw-navy)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '0 4px', whiteSpace: 'nowrap' }}
        >
          {allShownChosen ? 'Clear' : shown.length === candidates.length ? 'Select everyone' : `Select these ${shown.length}`}
        </button>
      </div>
      <div role="listbox" aria-multiselectable="true" style={{ maxHeight: 260, overflowY: 'auto' }}>
        {shown.length === 0 && (
          <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--gw-muted)' }}>Nobody in your organisation matches that. Add them by their email address below.</div>
        )}
        {shown.map((p) => {
          const on = chosen.has(p.id)
          return (
            <label
              key={p.id}
              role="option"
              aria-selected={on}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderTop: '1px solid var(--gw-border)', background: on ? 'var(--gw-bg)' : 'white' }}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(p.id)} aria-label={p.name} />
              <span style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {p.name.trim().charAt(0).toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {roleAndTeam(p) && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--gw-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleAndTeam(p)}</span>}
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
            const picked = candidates.filter((p) => chosen.has(p.id))
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
