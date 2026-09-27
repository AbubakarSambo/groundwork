import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { useHelpStore } from '@/stores/help'
import { Button, Tag } from '@/components/gw/kit'
import { cadenceLabel } from '@/lib/cadence'
import { howARowReads, isFinished, type ListRow } from './how-a-row-reads'
import { YouAreIn } from '@/pages/today/YouAreIn'

/**
 * THE CHECK-INS LIST (C1, #/checkins in the prototype, /grounds here). The wording is copied from
 * docs/prototype/screens/C1-today-and-check-ins/check-ins.txt:
 *
 *   "Check-ins"
 *   "Every check-in you run or take part in. Each has its own board."
 *   "You run"  "3 open"     "You're in"  "2 open"     "Finished"
 *   "Check-in"  "What it's for"  "Needs you"  "Where it stands"
 *   "You see these boards as a participant: the team's picture once it's shared, and your own part in full."
 *
 * Each row is said from the reader's side (see how-a-row-reads.ts): "Kwame and you", "Run by Amani
 * Njoroge", never the reader's own name and never pieces joined with dots.
 *
 * WHAT THE LIST HOLDS IS THE SERVER'S. It shows the rows `GET /grounds` gives this reader, which is
 * already cut to what they may see. An admin, and a lead with a department, are given check-ins they
 * neither run nor take part in; those sit under their own heading, since the prototype draws no
 * such reader here.
 *
 * NOT BUILT: "Examples in other shapes" (docs/prototype/not-to-build.md).
 */

/** Rows that want something from the reader first; otherwise the order the server sent. */
function byWhatNeedsYou(rows: { g: ListRow; reads: ReturnType<typeof howARowReads> }[]) {
  const rank = (r: (typeof rows)[number]) =>
    r.reads.needs?.tone === 'action' || r.reads.needs?.tone === 'proven' ? 0 : r.reads.needs ? 1 : 2
  return [...rows].sort((a, b) => rank(a) - rank(b))
}

function CheckInsTable({ label, rows }: { label: string; rows: { g: ListRow; reads: ReturnType<typeof howARowReads> }[] }) {
  const navigate = useNavigate()
  return (
    <div className="gw-ci-table-wrap">
      <table className="gw-ci-table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">Check-in</th>
            <th scope="col">What it’s for</th>
            <th scope="col">Needs you</th>
            <th scope="col">Where it stands</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ g, reads }) => (
            <tr key={g.id} onClick={() => navigate(`/grounds/${g.id}`)}>
              <td>
                <Link to={`/grounds/${g.id}`} className="gw-ci-table-name" onClick={e => e.stopPropagation()}>{g.label}</Link>
                {reads.about && <div className="gw-ci-table-about">{reads.about}</div>}
              </td>
              <td>{reads.forWhat}</td>
              <td>{reads.needs && <Tag tone={reads.needs.tone}>{reads.needs.text}</Tag>}</td>
              <td>
                {reads.standsTo
                  ? <Link to={reads.standsTo} onClick={e => e.stopPropagation()}>{reads.stands}</Link>
                  : reads.stands}
                {reads.also && <div className="gw-ci-table-also">{reads.also}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const id = `ci-${title.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <section aria-labelledby={id} className="gw-ci-section">
      <div className="gw-ci-section-head">
        <h2 id={id} className="gw-t-h2">{title}</h2>
        {count != null && <span className="gw-t-small">{count} open</span>}
      </div>
      {children}
    </section>
  )
}

export function GroundsListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const justSetUp = searchParams.get('welcome') === '1'
  const orgName = user?.organizationName ?? 'your organisation'

  /**
   * `isError` MATTERS BECAUSE THE FALLBACK IS A LIE. A failed fetch must not fall through to the
   * same branch as a genuinely empty account: "Nothing here yet" and "we could not load this" are
   * different sentences, and the page has to be able to say both.
   */
  const { data: grounds = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    enabled: !!user,
  })

  /**
   * WHAT IS WAITING ON AN ADMIN. W9-7. A member's check-in does not start until an admin accepts
   * it. That is only a good rule if the admin can SEE what is waiting.
   */
  const { data: awaiting = [] } = useQuery({
    queryKey: ['awaiting-approval'],
    queryFn: groundsApi.awaitingApproval,
    enabled: !!user && isAdmin,
    retry: false,
  })
  const approveMut = useMutation({
    mutationFn: (groundId: string) => groundsApi.approve(groundId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awaiting-approval'] })
      qc.invalidateQueries({ queryKey: ['grounds'] })
      qc.invalidateQueries({ queryKey: ['today'] })
      toast.success('Approved. The people involved can be invited now.')
    },
    onError: () => toast.error('Not approved. Nothing has changed. Try again.'),
  })
  const declineMut = useMutation({
    mutationFn: ({ groundId, reason }: { groundId: string; reason: string }) => groundsApi.declineGround(groundId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['awaiting-approval'] })
      qc.invalidateQueries({ queryKey: ['today'] })
      toast.success('Declined. Nobody was invited.')
    },
    onError: () => toast.error('Not declined. Nothing has changed. Try again.'),
  })
  const [declining, setDeclining] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  const now = new Date()
  const me = user?.id
  const rows = (grounds as unknown as ListRow[]).map(g => ({ g, reads: howARowReads(g, me, now, { isAdmin }) }))
  const open = rows.filter(r => !isFinished(r.g))
  const youRun = byWhatNeedsYou(open.filter(r => !!me && r.g.initiatorId === me))
  const youreIn = byWhatNeedsYou(open.filter(r => r.g.initiatorId !== me && (r.g.participants ?? []).some(p => !!me && p.userId === me)))
  const others = byWhatNeedsYou(open.filter(r => !youRun.includes(r) && !youreIn.includes(r)))
  const finished = rows.filter(r => isFinished(r.g))

  return (
    /* Wide, because it is a table and not a column of prose; capped so a long name keeps a line
       somebody can read (the-dashboard-uses-the-screen.spec.ts). */
    <div className="gw-bd" style={{ padding: '32px clamp(16px, 3vw, 32px) 80px', maxWidth: 1160, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="gw-ci-page-head">
        <div>
          <h1 className="gw-t-title gw-ci-h1">Check-ins</h1>
          <p className="gw-t-body gw-ci-sub">Every check-in you run or take part in. Each has its own board.</p>
        </div>
        {/* A signed-in person starts one at /start?new=1, never the anonymous entry chat. */}
        {user?.mayOpenCheckIns !== false && <Button onClick={() => navigate('/start?new=1')}>Start a check-in</Button>}
      </div>

      {justSetUp && (
        <YouAreIn checkIns={isLoading || isError ? null : grounds.length} />
      )}

      {isAdmin && awaiting.length > 0 && (
        <section className="gw-ci-waiting" aria-labelledby="ci-waiting-h">
          <h2 id="ci-waiting-h" className="gw-t-h3">Waiting for you</h2>
          <p className="gw-t-small">
            {awaiting.length === 1 ? 'Somebody has set up a check-in' : `${awaiting.length} check-ins have been set up`} and
            {' '}nobody has been invited to {awaiting.length === 1 ? 'it' : 'them'} yet. Nothing goes out until you say so.
          </p>
          {awaiting.map(a => (
            <div key={a.id} className="gw-ci-waiting-one">
              <b>{a.label}</b>
              <p className="gw-t-small">
                {a.createdBy} set it up.
                {/* A number the product chose is said to be one, so the admin approving it knows what
                    was decided and what was assumed (B13, P6-002). */}
                {a.timelineDays ? ` It runs for ${a.timelineDays} days${a.timelineStated === false ? ', which Groundwork suggested' : ''}.` : ''}
                {a.cadence ? ` People check in ${cadenceLabel(a.cadence as never).toLowerCase()}${a.cadenceStated === false ? ', which Groundwork suggested' : ''}.` : ''}
              </p>
              {declining === a.id ? (
                <div className="gw-ci-waiting-acts">
                  <textarea
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    placeholder="Why not? They will see this."
                    aria-label="Why not? They will see this."
                    rows={2}
                  />
                  <Button kind="primary" size="small" onClick={() => { declineMut.mutate({ groundId: a.id, reason: declineReason }); setDeclining(null); setDeclineReason('') }}>Decline it</Button>
                  <Button kind="secondary" size="small" onClick={() => { setDeclining(null); setDeclineReason('') }}>Keep it waiting</Button>
                </div>
              ) : (
                <div className="gw-ci-waiting-acts">
                  <Button kind="primary" size="small" onClick={() => approveMut.mutate(a.id)} disabled={approveMut.isPending}>Approve</Button>
                  <Button kind="secondary" size="small" onClick={() => setDeclining(a.id)}>Not this one</Button>
                  <Button kind="quiet" size="small" to={`/grounds/${a.id}`}>Look at it first</Button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {isLoading && <p className="gw-t-body gw-ci-quiet">Loading…</p>}

      {!isLoading && isError && (
        /* Could not load. Say which of the two things happened, and offer the one that helps. */
        <div className="gw-ci-empty" role="alert">
          <h2 className="gw-t-h3">We could not load your check-ins</h2>
          <p className="gw-t-body">This is a connection problem, not a lost record. Nothing you have written is affected.</p>
          <Button onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Trying…' : 'Try again'}</Button>
        </div>
      )}

      {!isLoading && !isError && grounds.length === 0 && (
        <div className="gw-ci-empty">
          {isAdmin ? (
            <>
              <h2 className="gw-t-h3">Your first check-in is one tap away.</h2>
              <p className="gw-t-body">Open a check-in for a new hire, a cofounder conversation, or a team that needs alignment.</p>
              {/* Trying it alone is possible, and the Help panel says how. A line, not a second button. */}
              <button type="button" className="gw-ci-link" onClick={() => useHelpStore.getState().show(4)}>Or try it on your own first</button>
            </>
          ) : (
            <>
              <h2 className="gw-t-h3">Nothing here yet.</h2>
              <p className="gw-t-body">You will see check-ins here when someone invites you, or when you open one yourself.</p>
            </>
          )}
        </div>
      )}

      {youRun.length > 0 && (
        <Section title="You run" count={youRun.length}><CheckInsTable label="You run" rows={youRun} /></Section>
      )}
      {youreIn.length > 0 && (
        <Section title="You’re in" count={youreIn.length}>
          <CheckInsTable label="You’re in" rows={youreIn} />
          <p className="gw-t-small gw-ci-note">You see these boards as a participant: the team’s picture once it’s shared, and your own part in full.</p>
        </Section>
      )}
      {others.length > 0 && (
        <Section title={`Other check-ins in ${orgName}`} count={others.length}>
          <CheckInsTable label={`Other check-ins in ${orgName}`} rows={others} />
        </Section>
      )}
      {finished.length > 0 && (
        <Section title="Finished"><CheckInsTable label="Finished" rows={finished} /></Section>
      )}
    </div>
  )
}
