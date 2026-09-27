import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { type OrgMember, fetchMembers, nameOf, firstNameOf, initialsOf, statusWord, A_FAILURE } from './people-here'

/**
 * ONE PERSON, AS AN ADMIN READS THEM (U.4, A4 one-person.txt, #/settings/people/miriam).
 *
 * Where they sit, their role here, their team, their status and seat, their WhatsApp number when
 * WhatsApp is on, their check-ins here, and what an admin can see.
 *
 * "Across check-ins" (D3, U.16) says only how many check-ins they are in, which is all an admin
 * reads of someone's load: what is asked of them is on their own You page, served to them alone. It
 * stops before "they choose who else sees it", because nothing lets anybody share it yet.
 *
 * Left out, each for a reason in the morning report: "Region" (no such field), "Free this seat" and "Remove from Baridi" (today's removal
 * erases the whole account in every organisation, and cannot be undone), and the clause "and what
 * someone writes in their own check-in stays theirs", which decisions.md rule 5 contradicts.
 */
type RoleWrite = 'MEMBER' | 'LEAD' | 'ADMIN'
const ROLE_CHOICES: { value: RoleWrite | 'GUEST'; title: string; says: string }[] = [
  { value: 'ADMIN', title: 'Admin', says: 'Manages people and billing, and can read every check-in.' },
  { value: 'LEAD', title: 'Can open check-ins', says: 'Can start check-ins and run them. Takes part in others.' },
  { value: 'MEMBER', title: 'Takes part', says: 'Answers the check-ins they’re invited to.' },
  { value: 'GUEST', title: 'Guest', says: 'From another organisation. Sees only the check-ins they’re invited to.' },
]

function AChange({ label, value, empty, onSave, choices }: {
  label: string; value: string; empty: string; onSave: (v: string) => void
  choices?: { value: string; label: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const shown = choices ? choices.find((c) => c.value === value)?.label ?? '' : value
  return (
    <div className="gw-one-field">
      <span className="gw-one-label">{label}</span>
      {editing ? (
        <span className="gw-one-edit">
          {choices ? (
            <select aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)}>
              <option value="">{empty}</option>
              {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          ) : (
            <input aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={120} />
          )}
          <button type="button" className="gw-btn-sm" aria-label={`Save ${label.toLowerCase()}`} onClick={() => { onSave(draft); setEditing(false) }}>Save</button>
          <button type="button" className="gw-link-btn" onClick={() => setEditing(false)}>Cancel</button>
        </span>
      ) : (
        <>
          <span className="gw-one-value">{shown || empty}</span>
          <button type="button" className="gw-link-btn" aria-label={`Change ${label.toLowerCase()}`} onClick={() => { setDraft(value); setEditing(true) }}>Change</button>
        </>
      )}
    </div>
  )
}

export function OnePersonPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const whatsappOn = useWhatsAppIsOn()
  const orgName = user?.organization?.name ?? user?.organizationName ?? 'your organisation'
  const { data, isLoading, isError } = useQuery({ queryKey: ['org-members'], queryFn: fetchMembers })
  const owner = useQuery({
    queryKey: ['org-owner'],
    queryFn: () => apiClient.get('/users/organization/owner').then((r) => r.data.data ?? r.data),
    retry: false,
  })
  const ownerId: string | null = owner.data?.ownerUserId ?? null
  const [team, setTeam] = useState<string | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['org-members'] })
  const sit = useMutation({
    mutationFn: (change: { level?: string; team?: string; reportsToUserId?: string }) => apiClient.patch(`/users/${id}/where-they-sit`, change),
    onSuccess: () => { refresh(); toast.success('Saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })
  const role = useMutation({
    mutationFn: (what: RoleWrite) => apiClient.patch(`/users/${id}`, { role: what }),
    onSuccess: () => { refresh(); toast.success('Their role has changed.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })
  const phone = useMutation({
    mutationFn: (number: string) => apiClient.patch(`/users/${id}`, { phoneNumber: number }),
    onSuccess: () => { refresh(); toast.success('Saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That number did not save. Nothing else changed.'),
  })
  const handOver = useMutation({
    mutationFn: () => apiClient.patch('/users/organization/owner', { userId: id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-owner'] }); toast.success('Handed over. They now own this organisation.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })

  if (isError) return <p className="gw-people-problem" role="alert" style={{ margin: 32 }}>We could not load this person just now. Reload the page, and if it keeps happening, tell us.</p>
  if (isLoading) return <p className="gw-people-note" style={{ margin: 32 }}>Loading…</p>
  const everybody = data?.data ?? []
  const m: OrgMember | undefined = everybody.find((p) => p.id === id)
  if (!m) {
    return (
      <div className="gw-people-page" style={{ padding: '28px 20px', maxWidth: 860, margin: '0 auto' }}>
        <p className="gw-people-note">This person is not in {orgName}.</p>
        <Link to="/org/members">People</Link>
      </div>
    )
  }

  const name = nameOf(m)
  const first = firstNameOf(m)
  const isOwner = !!ownerId && m.id === ownerId
  const isMe = m.id === user?.id
  const guest = m.role === 'GUEST'
  const managers = everybody.filter((p) => p.id !== m.id && p.role !== 'GUEST').map((p) => ({ value: p.id, label: nameOf(p) }))
  const checkIns = m.checkIns ?? []

  return (
    <div className="gw-people-page" style={{ padding: '28px 20px 80px', maxWidth: 860, margin: '0 auto' }}>
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/org/members">People</Link> / {name}</nav>
      <div className="gw-one-head">
        <span className="gw-people-av big" aria-hidden>{initialsOf(name)}</span>
        <div>
          <h1 className="gw-people-h1">{name}</h1>
          {name !== m.email && <p className="gw-people-note">{m.email}</p>}
        </div>
      </div>

      <section className="gw-people-sec" aria-labelledby="sit-h">
        <h2 id="sit-h">Where they sit</h2>
        <AChange label="Level" value={m.level ?? ''} empty="Not set" onSave={(v) => sit.mutate({ level: v })} />
        <AChange label="Reports to" value={m.reportsTo?.id ?? ''} empty="Nobody" choices={managers} onSave={(v) => sit.mutate({ reportsToUserId: v })} />
        <p className="gw-people-note">{`This describes the organisation. What ${first} can do still comes only from their role and their access to each check-in.`}</p>
      </section>

      <section className="gw-people-sec" aria-labelledby="across-h">
        <h2 id="across-h">Across check-ins</h2>
        <p className="gw-people-note">{`${checkIns.length === 1 ? '1 check-in' : `${checkIns.length} check-ins`}. What’s asked of them is on their own You page.`}</p>
      </section>

      <section className="gw-people-sec" aria-labelledby="role-h">
        <div className="gw-people-sec-head">
          <h2 id="role-h">{`Role at ${orgName}`}</h2>
          <span>Changes apply straight away.</span>
        </div>
        {isOwner && <p className="gw-people-note">{isMe ? 'You own this organisation, so your role cannot be changed here.' : `${first} owns this organisation, so their role cannot be changed here.`}</p>}
        <div role="radiogroup" aria-label={`Role at ${orgName}`} className="gw-people-choices">
          {ROLE_CHOICES.filter((c) => c.value !== 'GUEST' || guest).map((c) => {
            const on = m.role === c.value
            const locked = isOwner || isMe || c.value === 'GUEST' || role.isPending
            return (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={on}
                className={on ? 'on' : ''}
                disabled={locked && !on}
                onClick={() => { if (!on && !locked) role.mutate(c.value as RoleWrite) }}
              >
                <b>{c.title}</b>
                <span>{c.says}</span>
              </button>
            )
          })}
        </div>
        {ownerId === user?.id && !isMe && m.role === 'ADMIN' && (
          <button
            type="button"
            className="gw-link-btn"
            onClick={() => {
              if (window.confirm(`Hand this organisation to ${name}?\n\nThey become the person who cannot be removed by other admins, and you stop being that person. You stay an admin.`)) handOver.mutate()
            }}
          >Hand over</button>
        )}
      </section>

      <section className="gw-people-sec" aria-labelledby="team-h">
        <div className="gw-people-sec-head">
          <h2 id="team-h">Team</h2>
          <span>Used to add whole teams to a check-in</span>
        </div>
        <div className="gw-people-actions">
          <input aria-label="Team" value={team ?? m.team ?? ''} onChange={(e) => setTeam(e.target.value)} maxLength={120} />
          <button type="button" className="gw-btn-sm" aria-label="Save team" disabled={team === null || sit.isPending} onClick={() => { sit.mutate({ team: team ?? '' }); setTeam(null) }}>Save</button>
        </div>
      </section>

      <section className="gw-people-sec" aria-labelledby="status-h">
        <h2 id="status-h">Status</h2>
        <div className="gw-one-field"><span className="gw-one-label">Now</span><span className="gw-one-value">{statusWord(m)}</span></div>
        {!guest && !m.awaitingOrgApproval && <div className="gw-one-field"><span className="gw-one-label">Seat</span><span className="gw-one-value">Holds a seat</span></div>}
        {m.arrivedThroughACheckIn && <p className="gw-people-note">They came in by accepting an invitation to a check-in.</p>}
        {whatsappOn && (
          <div className="gw-one-field">
            <span className="gw-one-label">WhatsApp</span>
            <input
              aria-label={`WhatsApp number for ${first}`}
              defaultValue={m.phoneNumber ?? ''}
              disabled={phone.isPending}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              onBlur={(e) => { const next = e.target.value.trim(); if (next !== (m.phoneNumber ?? '')) phone.mutate(next) }}
            />
          </div>
        )}
      </section>

      <section className="gw-people-sec" aria-labelledby="checkins-h">
        <div className="gw-people-sec-head">
          <h2 id="checkins-h">Check-ins</h2>
          <span>{checkIns.length === 1 ? '1 check-in' : `${checkIns.length} check-ins`}</span>
        </div>
        {checkIns.length === 0 ? <p className="gw-people-note">{`${first} is not on a check-in here yet.`}</p> : checkIns.map((c) => (
          <div key={c.id} className="gw-one-field">
            <span className="gw-one-value">{c.label ?? 'A check-in with no name yet'}</span>
            <span className="gw-one-label">{c.runsIt ? 'Runs it' : 'Checks in'}</span>
            <button type="button" className="gw-link-btn" aria-label={`Open ${c.label ?? 'this check-in'}`} onClick={() => navigate(`/grounds/${c.id}`)}>Open</button>
          </div>
        ))}
      </section>

      <section className="gw-people-sec" aria-labelledby="admin-sees-h">
        <h2 id="admin-sees-h">What an admin can see</h2>
        <p className="gw-people-note">{`As an admin you can read every check-in at ${orgName}, change its setup and end it. You don’t see anyone’s private notes.`}</p>
      </section>
    </div>
  )
}
