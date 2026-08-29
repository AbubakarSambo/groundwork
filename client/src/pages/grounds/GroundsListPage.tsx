import { AdminFirstRun } from './an-admin-lands-on-a-check-in-list'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import type { Ground } from '@/types'
import { alignmentLabel } from '@/lib/alignment'
import { personLabel } from '@/lib/utils'
import { Stat } from '@/components/gw/kit'
import { toast } from 'sonner'


const MODE_COLORS: Record<string, { bg: string; color: string }> = {
  Starting:       { bg: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' },
  Recognition:    { bg: 'var(--gw-amber-bg)', color: 'var(--gw-amber-t)' },
  Resolution:     { bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  'Multi-party':  { bg: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' },
  Accountability: { bg: 'var(--gw-red-bg)', color: 'var(--gw-red-t)' },
  Contract:       { bg: '#F0EAF8', color: '#5B2EA6' },
  Urgent:         { bg: 'var(--gw-red-bg)', color: 'var(--gw-red-t)' },
}

function GroundCard({ g, onClick }: { g: Ground; onClick: () => void }) {
  // What the report holds, or nothing. The old "{score}/5 {band}" was a count
  // of completed check-ins wearing the word "Aligned".
  const read = alignmentLabel((g as any).alignment)
  const mc = MODE_COLORS[g.moment ?? ''] ?? MODE_COLORS['Resolution']
  return (
    <div className="gw-ground-card" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{g.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: mc.bg, color: mc.color }}>{g.moment}</span>
            {/*
              A GROUND IN SOMEBODY ELSE'S ORGANISATION, SAID OUT LOUD.

              `grounds.list` deliberately includes grounds in other organisations where
              you are a participant - that is how somebody invited across a boundary
              finds their check-in at all, and it was unambiguous when there was only
              one organisation to be in.

              With the switcher it is not. Switch to a client's organisation and your own
              company's ground is still in the list, with nothing saying why. Seen while
              clicking the switcher for the first time.
            */}
            {(g as any).otherOrgName && (
              <span
                title={`This check-in belongs to ${(g as any).otherOrgName}. You are in it as a participant.`}
                style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)' }}
              >
                {(g as any).otherOrgName}
              </span>
            )}
            {g.status === 'ACTIVE' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          {read
            ? <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', textAlign: 'right', maxWidth: 132, lineHeight: 1.35 }}>{read}</div>
            : <div style={{ fontSize: 11, color: 'var(--gw-muted)', textAlign: 'right' }}>No read yet</div>}
        </div>
      </div>
      {g.brief && <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 10 }}>{g.brief}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/*
          WHO LEADS IT, WHICH IS WHY /org/roster EXISTED. W9-5.
          
          `grounds.list` already returns every ground in the organisation when the
          caller is an admin, so "All grounds" was the same data at a second address -
          one page with two levels of detail, not two audiences. The lead was the one
          column it added that mattered, and it is derivable here from the participant
          the server already sends.
        */}
        <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>
          {(() => {
            /**
             * "LED BY HAFSAH", LOWERCASE, FROM AN EMAIL ADDRESS. W8-66.
             *
             * The third place doing this. An address is not what somebody is called, and
             * for a viewer who is not the ground's lead the API nulls the email on
             * purpose - so the guess produced either a lowercase fragment or nothing at
             * all. `grounds.list` now sends the display name.
             */
            /**
             * And this is the line that comment is about, still splitting the address two lines
             * under its own warning. W-UX-4. `personLabel` is the one chain now: name, else what
             * they do here, else the address whole rather than a lowercase fragment of it.
             */
            const lead = (g.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
            const firstName = (lead?.user?.firstName ?? (lead as any)?.firstName ?? '').trim()
            const who = lead ? personLabel({ ...(lead as any), user: (lead as any).user ?? (firstName ? { firstName } : null) }) : null
            /**
             * THE SESSION COUNT, ON THE CARD SOMEBODY CHOOSES FROM. W13-6.
             *
             * "12 of 12 sessions done" is the clearest thing on the ground page and it
             * appeared nowhere a person decides WHICH ground to open. Derived here from the
             * timeline and rhythm the list already sends, the same way the ground page does
             * it, rather than a new field.
             *
             * The RAIL is deliberately left alone: it lists names only, by her decision that
             * a channel list is names, with the count on each row's tooltip. This is the card,
             * which is where the choosing happens.
             */
            const planned = plannedSessionsFor(
              g.timelineDays,
              (g as any).cadence,
              (g as any).maxSessions ?? (g as any).totalSessions,
            )
            // `roundsDone` comes from the list endpoint: rounds where EVERY party is
            // complete, not a count of check-in rows.
            const doneRounds = (g as any).roundsDone as number | undefined
            const sessions = planned != null && doneRounds != null
              ? `${doneRounds} of ${planned} sessions done`
              : planned != null
                ? `${planned} sessions`
                : null
            const people = `${g.participants.length} participant${g.participants.length !== 1 ? 's' : ''}`
            return who
              ? `Led by ${who} · ${people}${sessions ? ` · ${sessions}` : ''}`
              : `${people}${sessions ? ` · ${sessions}` : ''}`
          })()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {g.status === 'ACTIVE' && g.participants.length > 1 && !(g.checkIns ?? []).some(c => c.status === 'COMPLETED') && (g.overdue ?? 0) === 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 20, padding: '2px 8px' }}>No check-ins yet</span>}
          {/* A report was released to this person and they have not opened it.
              Across ten grounds and thirty-three people, not one report was
              ever activated - the release email was the only thing that ever
              said so, and nothing in the product did. */}
          {(g as any).reportWaitingForMe && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', borderRadius: 20, padding: '2px 8px' }}>Your report is ready</span>}
          {(g.overdue ?? 0) > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 20, padding: '2px 8px' }}>{g.overdue} overdue</span>}
          {g.status === 'REPORT_READY' && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', borderRadius: 20, padding: '2px 8px' }}>Report ready</span>}
          {g.status === 'AWAITING_LEAD' && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 20, padding: '2px 8px' }}>Awaiting lead</span>}
          {g.daysLeft != null && <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{g.daysLeft}d left</span>}
        </div>
      </div>
    </div>
  )
}

export function GroundsListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const justSetUp = searchParams.get('welcome') === '1'
  const [showInviteColleague, setShowInviteColleague] = useState(false)
  const [colleagueEmail, setColleagueEmail] = useState('')

  const teamInviteMut = useMutation({
    mutationFn: (email: string) => authApi.teamInvite(email),
    onSuccess: () => {
      toast.success('Invite sent.')
      setColleagueEmail('')
      setShowInviteColleague(false)
    },
    onError: () => toast.error('Could not send invite. Please try again.'),
  })

  const { data: grounds = [], isLoading } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    enabled: !!user,
  })

  // The billing-status query went with the upsells - nothing on this page
  // depends on what the org is paying any more.

  // checkoutMut removed with the two "Unlock insights" upsells.
  /**
   * "ACTIVE GROUNDS 2" WITH ONE OF THEM NOT STARTED. W13-2.
   *
   * `active` was everything not closed, which counts a ground that is sitting in the
   * approval queue directly above this tile - nobody invited, nothing happening, and it
   * is being reported to the admin as work in progress in the same eyeful as
   * "waiting for you".
   *
   * A ground waiting on an approval, or on its lead accepting it, has not started.
   */
  const NOT_STARTED_YET = ['AWAITING_APPROVAL', 'AWAITING_LEAD', 'DECLINED']
  const active = grounds.filter(
    g => g.status !== 'CLOSED' && g.status !== 'RESOLVED' && !NOT_STARTED_YET.includes(g.status),
  )
  const checkInsToday = grounds.reduce((n, g) => n + (g.checkInsToday ?? 0), 0)
  // Count reports waiting for THIS person. The old count was grounds in
  // REPORT_READY status, which is a different thing and sat permanently at
  // zero while every ground stayed ACTIVE.
  const reportsReady = grounds.filter(g => (g as any).reportWaitingForMe).length

  /**
   * AND THE OTHER HALF OF THE SAME LEGACY, WHICH THE LABEL FIX EXPOSED.
   *
   * These two lines still test `status === 'REPORT_READY'`, and nothing has written that status
   * since report release started auto-activating straight to ACTIVE - the schema says so in its own
   * comment. So the "Needs your attention" banner could only ever fire on an overdue check-in, and
   * the urgency sort's REPORT_READY weight was unreachable. A released report nobody had opened -
   * the single most actionable thing on this page - was the one thing that could not raise its hand.
   *
   * `reportWaitingForMe` is the live signal for the same idea, so both now read it. The dead status
   * is kept in the test rather than removed, because legacy rows written before that change still
   * carry it and they should still surface.
   */
  const attentionWorthy = (g: typeof grounds[number]) =>
    (g as any).reportWaitingForMe || g.status === 'REPORT_READY' || (g.overdue ?? 0) > 0
  const needsAttention = grounds.filter(attentionWorthy)
  const sortedGrounds = [...grounds].sort((a, b) => {
    const urgency = (g: typeof a) =>
      ((g as any).reportWaitingForMe || g.status === 'REPORT_READY') ? 10 : (g.overdue ?? 0) > 0 ? 5 : 0
    return urgency(b) - urgency(a)
  })

  /**
   * WHAT IS WAITING ON AN ADMIN. W9-7.
   *
   * A member's ground does not start until an admin accepts it, and nobody can be
   * invited to it in the meantime. That is only a good rule if the admin can SEE what
   * is waiting - a pending queue nobody looks at is just a ground that never starts,
   * and the person who set it up has no idea why.
   */
  const { data: awaiting = [] } = useQuery({
    queryKey: ['awaiting-approval'],
    queryFn: groundsApi.awaitingApproval,
    enabled: !!user && isAdmin,
    retry: false,
  })
  const approveMut = useMutation({
    mutationFn: (groundId: string) => groundsApi.approve(groundId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['awaiting-approval'] }); qc.invalidateQueries({ queryKey: ['grounds'] }); toast.success('Approved. The people involved can be invited now.') },
    onError: () => toast.error('Could not approve. Try again.'),
  })
  const declineMut = useMutation({
    mutationFn: ({ groundId, reason }: { groundId: string; reason: string }) => groundsApi.declineGround(groundId, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['awaiting-approval'] }); toast.success('Declined. Nobody was invited.') },
    onError: () => toast.error('Could not decline. Try again.'),
  })
  const [declining, setDeclining] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="var(--gw-navy)" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="var(--gw-navy)" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="var(--gw-navy)" />
          </svg>
          {/* The rail already says Groundwork two inches to the left. This said it again, so
              the page's own name is here instead - which is the thing a second line of
              chrome could usefully carry. W13-11. */}
              <span className="gw-logo">In progress</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 20, padding: '3px 10px' }}>
            {isAdmin ? 'Admin' : 'Team member'}
          </span>
          {/*
            A SECOND NAVIGATION BAR FOR THINGS THE FIRST ONE ALREADY HAD. W-UX-3.
            
            Platform ops, Settings and Sign out were all here AND all in the rail immediately to the
            left - Settings as a rail item, Sign out and the back office in the user block at the
            bottom of it. Three links, twice, on the screen a person opens every day, and one of them
            ("Admin") wore the same word as the pill beside it while going somewhere else entirely.
            
            The pill stays: it is the one thing here that is not navigation. It says what you are in
            this organisation, which is what makes the difference between the two Admins legible.
          */}
        </div>
      </div>

      <div className="gw-bd" style={{ paddingTop: 8, maxWidth: 600, margin: '0 auto', width: '100%' }}>
        {isAdmin && awaiting.length > 0 && (
          <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gw-amber-t)', marginBottom: 4 }}>
              Waiting for you
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
              {awaiting.length === 1 ? 'Somebody has set up a check-in' : `${awaiting.length} check-ins have been set up`} and
              {' '}nobody has been invited to {awaiting.length === 1 ? 'it' : 'them'} yet. Nothing goes out until you say so.
            </div>
            {awaiting.map(a => (
              <div key={a.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-text)' }}>{a.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 2 }}>
                  Set up by {a.createdBy}
                  {a.timelineDays ? ` · ${a.timelineDays} days` : ''}
                  {a.cadence ? ` · ${a.cadence.replace(/_/g, ' ').toLowerCase()}` : ''}
                </div>
                {declining === a.id ? (
                  <div style={{ marginTop: 9 }}>
                    <textarea
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                      placeholder="Why not? They will see this."
                      rows={2}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
                      <button
                        onClick={() => { declineMut.mutate({ groundId: a.id, reason: declineReason }); setDeclining(null); setDeclineReason('') }}
                        style={{ padding: '7px 13px', borderRadius: 7, background: 'var(--gw-red-t)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
                      >Decline it</button>
                      <button
                        onClick={() => { setDeclining(null); setDeclineReason('') }}
                        style={{ padding: '7px 13px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
                      >Keep it waiting</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center' }}>
                    <button
                      onClick={() => approveMut.mutate(a.id)}
                      disabled={approveMut.isPending}
                      style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
                    >Approve</button>
                    <button
                      onClick={() => setDeclining(a.id)}
                      style={{ padding: '7px 12px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
                    >Not this one</button>
                    <button
                      onClick={() => navigate(`/grounds/${a.id}`)}
                      style={{ background: 'none', border: 'none', color: 'var(--gw-navy)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}
                    >Look at it first →</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isAdmin ? (
          <>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { val: active.length,    label: 'In progress' },
                { val: checkInsToday,    label: 'Participant sessions today' },
                /**
                 * THE LABEL SAYS WHAT THE NUMBER COUNTS.
                 *
                 * It read "Reports ready" while counting reports waiting for THIS person to open -
                 * and the initiator is exempt by design, because they released it and can always
                 * read it. So a lead looking at a ground whose own summary line said "4 agreed, 2
                 * still open" was told "Reports ready 0", on the same screen. The value was right
                 * and had been fixed once already; the label was left behind pointing at the old
                 * meaning.
                 */
                { val: reportsReady,     label: 'Waiting for you to read' },
              /**
               * A ZERO IS NOT A SUMMARY. W-UX-2.
               *
               * Two of the three tiles read 0 on every account looked at - "Participant sessions
               * today" is zero for most of any given day by design, and "Waiting for you to read"
               * exempts the lead, who is the person reading this page. So the widest, highest strip
               * on the landing screen was mostly dead space.
               *
               * A count of nothing is not worth a tile. "In progress" always shows, because zero
               * in progress is itself the thing a person needs to know; the other two earn their
               * place only when there is something in them.
               */
              ].filter(s => s.label === 'In progress' || s.val > 0).map(s => (
                // The board's own stat tile, so the same number does not have two
                // different looks depending on which page you opened it from.
                <Stat key={s.label} label={s.label} value={String(s.val)} />
              ))}
            </div>

            {/* Removed: "Unlock full insights" sold specificity trends and
                confidence scores as a paid unlock, routed at a per-session
                checkout. Neither half is real - there is no session billing,
                and the insights were never locked. */}
            {/* Open ground CTA */}
            <button
              onClick={() => navigate('/grounds/new')}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>What's going on?</span>
              <span style={{ fontSize: 18, fontWeight: 300 }}>+</span>
            </button>

            {/* Invite a colleague - admin only, matches the backend guard on POST /auth/team-invite */}
            {isAdmin && (!showInviteColleague ? (
              <button
                onClick={() => setShowInviteColleague(true)}
                /**
                 * ONE PRIMARY ACTION PER SCREEN. W-UX-2.
                 *
                 * This was a second full-width navy button directly under "What's going on?" -
                 * identical weight, identical colour, stacked. Two primaries is no primary, and the
                 * one a person wants ninety-nine times out of a hundred is the one above. Inviting a
                 * colleague is a real action and stays; it just stops shouting as loud.
                 */
                style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke="var(--gw-navy)" strokeWidth="1.5"/><path d="M1 16c0-2.21 2.686-4 6-4s6 1.79 6 4" stroke="var(--gw-navy)" strokeWidth="1.5" strokeLinecap="round"/><path d="M15 8v4M13 10h4" stroke="var(--gw-navy)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Invite a team member
              </button>
            ) : (
              <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Invite a colleague</div>
                <div style={{ fontSize: 12, color: 'var(--gw-blue-t)', lineHeight: 1.5, marginBottom: 12 }}>
                  They will receive an email with a link to set up their own Groundwork account. They can then open and manage their own check-ins.
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={colleagueEmail}
                    onChange={e => setColleagueEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && colleagueEmail.includes('@')) teamInviteMut.mutate(colleagueEmail.trim()) }}
                    style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-blue-b)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', background: 'white' }}
                    autoFocus
                  />
                  <button
                    onClick={() => { if (colleagueEmail.includes('@')) teamInviteMut.mutate(colleagueEmail.trim()) }}
                    disabled={teamInviteMut.isPending || !colleagueEmail.includes('@')}
                    style={{ padding: '9px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    {teamInviteMut.isPending ? 'Sending…' : 'Send invite'}
                  </button>
                  <button
                    onClick={() => { setShowInviteColleague(false); setColleagueEmail('') }}
                    style={{ padding: '9px 10px', borderRadius: 6, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}

            {/*
              THE SAME NAME, THREE TIMES, ON THE SCREEN YOU LAND ON EVERY DAY.
              
              This banner listed every check-in needing attention BY NAME, and then the list below
              listed all of them again by name, and the rail on the left listed them a third time.
              Ten check-ins read as thirty things to do. The audit's own line: "Looks like you have
              30 things when you have 10."
              
              The signal was never wrong - it is the duplication that was. The cards already sort
              urgent-first and already carry the badge saying WHY ("Your report is ready", "2
              overdue"), so a name list here added nothing a person could not see one inch lower.
              What it could not see is the COUNT, so that is what is left: one line, no names.
            */}
            {!isLoading && needsAttention.length > 0 && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.5 }}>
                <strong style={{ fontWeight: 700 }}>
                  {needsAttention.length === 1 ? 'One check-in needs you' : `${needsAttention.length} check-ins need you`}
                </strong>
                {needsAttention.length === 1 ? ' - it is at the top of the list.' : ' - they are at the top of the list.'}
              </div>
            )}

            {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>Loading…</div>}

            {!isLoading && grounds.length === 0 && (
              <>
              {/* An org admin's own job, on the screen they actually land on. See the file. */}
              <AdminFirstRun />
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, marginBottom: 24, height: 44 }}>
                  <div style={{ width: 10, height: 32, borderRadius: 5, background: 'var(--gw-border)', opacity: .5 }} />
                  <div style={{ width: 14, height: 44, borderRadius: 7, background: 'var(--gw-blue-b)' }} />
                  <div style={{ width: 10, height: 28, borderRadius: 5, background: 'var(--gw-border)', opacity: .5 }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>Your first check-in is one tap away.</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 280, margin: '0 auto 24px' }}>Open a check-in for a new hire, a cofounder conversation, or a team that needs alignment.</div>
                <button onClick={() => navigate('/grounds/new')} style={{ padding: '13px 28px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Open your first check-in</button>
              </div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedGrounds.map(g => <GroundCard key={g.id} g={g} onClick={() => navigate(`/grounds/${g.id}`)} />)}
            </div>
          </>
        ) : (
          <>
            {/* Welcome banner after password setup */}
            {justSetUp && (
              <div style={{ background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 3 }}>Your account is live.</div>
                <div style={{ fontSize: 12, color: 'var(--gw-green-t-soft)', lineHeight: 1.5 }}>You will see your check-ins and reports here. Open one to start contributing.</div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {grounds.length > 0 ? `In progress (${grounds.length})` : 'In progress'}
              </div>
              {/*
                A SIGNED-IN PERSON MUST NOT BE SENT TO /start.
                /start is the anonymous entry chat: no account, transcript in
                localStorage, and a save card at the end asking for the email of
                somebody who is already signed in. An admin who wants a ground
                belongs in the picker at /grounds/new.
              */}
              <button
                onClick={() => navigate('/grounds/new')}
                style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + New check-in
              </button>
            </div>

            {/* Removed: this one was shown to CONTRIBUTORS, offering to
                sell a participant their own record back. */}
            {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>Loading…</div>}
            {!isLoading && grounds.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Nothing here yet.</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 300, margin: '0 auto 8px' }}>
                  A check-in is a shared space where two or more parties check in privately. The report releases when everyone has checked in.
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto 24px' }}>
                  You will see check-ins here when someone invites you, or when you open one yourself.
                </div>
                <button
                  onClick={() => navigate('/grounds/new')}
                  style={{ padding: '12px 24px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Open a check-in
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grounds.map(g => (
                // A non-admin who is themselves the initiator (or a lead admin
                // assigned to run this ground) still needs the admin view - the
                // participant page has no confirm-lead / add-participant / release
                // actions. Only route to /p when they are genuinely a participant.
                <GroundCard key={g.id} g={g} onClick={() => navigate(g.initiatorId === user?.id ? `/grounds/${g.id}` : `/grounds/${g.id}/p`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
