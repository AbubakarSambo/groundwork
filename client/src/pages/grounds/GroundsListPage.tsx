import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { useHelpStore } from '@/stores/help'
import {
  Page, PageTitle, Section, Panel, Button, Tag, Note, Empty, TextArea, TextField, CheckInsTable, CheckInRow,
} from '@/components/gw/ui'
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
 *
 * REBUILT FROM THE SHARED PARTS (group 2): `Page`/`PageTitle` for the frame and "Start a check-in";
 * `YouAreIn` (already a shared piece) for the just-joined banner; `Section` for each heading and its
 * "N open"; the shared `CheckInsTable`/`CheckInRow` for every table, in place of the page's own
 * `gw-ci-table` markup; `Panel` (with the shared caution tint) for "Waiting for you"; and
 * `Note`/`Empty`/`Button` for loading, failure and the two empty-organisation states.
 */

/** Rows that want something from the reader first; otherwise the order the server sent. */
function byWhatNeedsYou(rows: { g: ListRow; reads: ReturnType<typeof howARowReads> }[]) {
  const rank = (r: (typeof rows)[number]) =>
    r.reads.needs?.tone === 'action' || r.reads.needs?.tone === 'proven' ? 0 : r.reads.needs ? 1 : 2
  return [...rows].sort((a, b) => rank(a) - rank(b))
}

function CheckInsRows({ rows }: { rows: { g: ListRow; reads: ReturnType<typeof howARowReads> }[] }) {
  const navigate = useNavigate()
  return (
    <>
      {rows.map(({ g, reads }) => (
        <CheckInRow
          key={g.id}
          to={`/grounds/${g.id}`}
          onClick={() => navigate(`/grounds/${g.id}`)}
          name={g.label}
          about={reads.about}
          forWhat={reads.forWhat}
          needs={reads.needs && <Tag tone={reads.needs.tone}>{reads.needs.text}</Tag>}
          stands={reads.stands}
          standsTo={reads.standsTo}
          also={reads.also}
        />
      ))}
    </>
  )
}

export function GroundsListPage() {
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

  /* HAFSAH'S FAULT 4: a way to find one among a hundred (check-ins.txt draws no search box of its
     own - there was no hundred-check-in organisation when it was written - so this is plain and
     in keeping with the page's own voice, the same as the People page's "Find somebody"). Filters
     by what this reader already sees: the row's own name, never anything the server did not send. */
  const [find, setFind] = useState('')
  const q = find.trim().toLowerCase()

  const now = new Date()
  const me = user?.id
  const allRows = (grounds as unknown as ListRow[]).map(g => ({ g, reads: howARowReads(g, me, now, { isAdmin }) }))
  const rows = q ? allRows.filter(r => r.g.label.toLowerCase().includes(q)) : allRows
  const open = rows.filter(r => !isFinished(r.g))
  const youRun = byWhatNeedsYou(open.filter(r => !!me && r.g.initiatorId === me))
  const youreIn = byWhatNeedsYou(open.filter(r => r.g.initiatorId !== me && (r.g.participants ?? []).some(p => !!me && p.userId === me)))
  const others = byWhatNeedsYou(open.filter(r => !youRun.includes(r) && !youreIn.includes(r)))
  const finished = rows.filter(r => isFinished(r.g))

  return (
    <Page>
      <PageTitle
        title="Check-ins"
        subtitle="Every check-in you run or take part in. Each has its own board."
        action={
          /* A signed-in person starts one at /start?new=1, never the anonymous entry chat. */
          user?.mayOpenCheckIns !== false && <Button to="/start?new=1">Start a check-in</Button>
        }
      />

      {justSetUp && (
        <YouAreIn checkIns={isLoading || isError ? null : grounds.length} mayStart={user?.mayOpenCheckIns !== false} />
      )}

      {isAdmin && awaiting.length > 0 && (
        <Panel className="gwui-panel-caution">
          <h2>Waiting for you</h2>
          <p className="gwui-panel-text-muted">
            {awaiting.length === 1 ? 'Somebody has set up a check-in' : `${awaiting.length} check-ins have been set up`} and
            {' '}nobody has been invited to {awaiting.length === 1 ? 'it' : 'them'} yet. Nothing goes out until you say so.
          </p>
          {awaiting.map(a => (
            <div key={a.id} className="gwui-waiting-one">
              <b>{a.label}</b>
              <p className="gwui-panel-text-muted">
                {a.createdBy} set it up.
                {/* A number the product chose is said to be one, so the admin approving it knows what
                    was decided and what was assumed (B13, P6-002). */}
                {a.timelineDays ? ` It runs for ${a.timelineDays} days${a.timelineStated === false ? ', which Groundwork suggested' : ''}.` : ''}
                {a.cadence ? ` ${a.cadence === 'SEQUENTIAL' ? 'People check in when the lead chooses' : `People check in ${cadenceLabel(a.cadence as never).toLowerCase()}`}${a.cadenceStated === false ? ', which Groundwork suggested' : ''}.` : ''}
              </p>
              {declining === a.id ? (
                <div className="gwui-waiting-acts">
                  <TextArea
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    placeholder="Why not? They will see this."
                    aria-label="Why not? They will see this."
                    rows={2}
                  />
                  {/* Not the screen's primary (navy) button: "Approve" is, and the two never show at
                      once for the same row - this is a step before a decline, styled as the negative
                      action it is. */}
                  <Button kind="danger" size="small" onClick={() => { declineMut.mutate({ groundId: a.id, reason: declineReason }); setDeclining(null); setDeclineReason('') }}>Decline it</Button>
                  <Button kind="secondary" size="small" onClick={() => { setDeclining(null); setDeclineReason('') }}>Keep it waiting</Button>
                </div>
              ) : (
                <div className="gwui-waiting-acts">
                  {/* Not this screen's primary (navy) button: "Start a check-in" is (U.5 review,
                      "one primary action per screen"), so this stays secondary even though it is
                      the main thing to do inside this one panel. */}
                  <Button kind="secondary" size="small" onClick={() => approveMut.mutate(a.id)} disabled={approveMut.isPending}>Approve</Button>
                  <Button kind="secondary" size="small" onClick={() => setDeclining(a.id)}>Not this one</Button>
                  <Button kind="quiet" size="small" to={`/grounds/${a.id}`}>Look at it first</Button>
                </div>
              )}
            </div>
          ))}
        </Panel>
      )}

      {isLoading && <Note>Loading…</Note>}

      {!isLoading && isError && (
        /* Could not load. Say which of the two things happened, and offer the one that helps. */
        <Empty title="We could not load your check-ins" action={<Button kind="secondary" onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Trying…' : 'Try again'}</Button>}>
          This is a connection problem, not a lost record. Nothing you have written is affected.
        </Empty>
      )}

      {!isLoading && !isError && grounds.length === 0 && (
        <>
          {/*
           * TWO EMPTY STATES, FROM THE PROTOTYPE (F4-small-states/states.txt, "No check-ins yet,
           * a lead" / "No check-ins yet, anyone else") - keyed on whether this reader may open a
           * check-in at all (`mayOpenCheckIns`), not on `isAdmin`: the setting that decides who
           * may start one is independent of role (docs/backend-map.md, "who may open check-ins").
           * The prototype's "anyone else" state still offers "Set up one of your own"; that is
           * only true here when the reader actually can, so it is left off when they cannot - the
           * same door every other "Start a check-in" control already checks (`App.tsx`,
           * `AppShell.tsx`).
           */}
          {user?.mayOpenCheckIns !== false ? (
            <Empty
              title="No check-ins yet"
              action={
                <div className="gwui-button-row">
                  {/* Not this screen's primary (navy) button: "Start a check-in", above in
                      PageTitle's own action, already is (U.5 review, "one primary action per
                      screen"), so this stays secondary even with nothing else to press here. */}
                  <Button kind="secondary" to="/start?new=1">Set up a check-in</Button>
                  <button type="button" className="gwui-plain-link" onClick={() => useHelpStore.getState().show(4)}>Try one on your own</button>
                </div>
              }
            >
              Describe what you want your team to check in about, and it’s set up as you talk.
            </Empty>
          ) : (
            <Empty title="Nothing here yet">
              Check-ins appear here when someone adds you to one. You’ll also get an email.
            </Empty>
          )}
        </>
      )}

      {/* A way to find one among many (HAFSAH'S FAULT 4). Only once there is more than a
          glance's worth to look through - with a handful, scanning the sections below is faster
          than typing. */}
      {!isLoading && !isError && allRows.length > 8 && (
        <TextField
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="Find a check-in"
          aria-label="Find a check-in"
          style={{ maxWidth: 320 }}
        />
      )}

      {!isLoading && !isError && allRows.length > 0 && rows.length === 0 && (
        <Empty>{`Nothing here matches "${find.trim()}".`}</Empty>
      )}

      {youRun.length > 0 && (
        <Section heading="You run" note={`${youRun.length} open`}>
          <CheckInsTable label="You run"><CheckInsRows rows={youRun} /></CheckInsTable>
        </Section>
      )}
      {youreIn.length > 0 && (
        <Section heading="You’re in" note={`${youreIn.length} open`} foot="You see these boards as a participant: the team’s picture once it’s shared, and your own part in full.">
          <CheckInsTable label="You’re in"><CheckInsRows rows={youreIn} /></CheckInsTable>
        </Section>
      )}
      {/* An admin or a lead who runs none and is in none: said, so the list does not open on someone else's heading (U.5 review). */}
      {others.length > 0 && youRun.length === 0 && youreIn.length === 0 && (
        <Note>You do not run any check-ins, and you are not in any yet.</Note>
      )}
      {others.length > 0 && (
        <Section heading={`Other check-ins in ${orgName}`} note={`${others.length} open`}>
          <CheckInsTable label={`Other check-ins in ${orgName}`}><CheckInsRows rows={others} /></CheckInsTable>
        </Section>
      )}
      {finished.length > 0 && (
        <Section heading="Finished">
          <CheckInsTable label="Finished"><CheckInsRows rows={finished} /></CheckInsTable>
        </Section>
      )}
    </Page>
  )
}
