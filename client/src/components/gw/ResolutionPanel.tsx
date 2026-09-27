import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { resolutionApi } from '@/api/resolution'
import { toast } from 'sonner'
import { Confirm } from './a-second-press-before-it-is-gone'

/**
 * HOW A GROUND ENDS.
 *
 * The resolution flow was fully built - service, controller, per-scenario end
 * states, both emails, even the client API functions - and no page ever called
 * any of it. An eighteen-ground run finished 265 check-ins across ten grounds
 * and closed exactly none of them: every one still ACTIVE, still labelled
 * STARTING, with all its sessions done. Everything downstream of an ending was
 * dead too, because a verified profile record only exists for a closed ground.
 *
 * This is the missing entry point, and nothing more. The rules all live on the
 * server and stay there: no party may close a ground alone, everyone active has
 * to pick the SAME end state, and changing the proposal clears the earlier
 * confirmations so nobody is counted as agreeing to something they never saw.
 */
/**
 * WHERE THIS PANEL SITS (U.11, B6).
 *
 * - `board-top`: the top of the board. Once the check-in has ended, everyone reads how it ended
 *   there ("The board shows it at the top"). Near the end, the lead reads "It’s yours to decide how
 *   this ends." with a way to the page where they decide.
 * - `board-bottom`: the foot of the board, for everyone except the lead while it is still open, as
 *   before. The lead decides on the ending page instead, and an ending shows at the top.
 * - Left out: the whole panel, as on the ending page and on "My record".
 */
export type WhereThePanelSits = 'board-top' | 'board-bottom'

const possessive = (name: string) => `${name}’s`
const onTheDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

export function ResolutionPanel({ groundId, nearTheEnd, lastSessionDone, place }: {
  groundId: string
  /**
   * HOW A CHECK-IN ENDS IS NOT THE FIRST THING YOU SEE ABOUT IT.
   *
   * Rendered unconditionally, this panel is four buttons including "Stop the project" on a
   * check-in that started yesterday - `the-exit-belongs-at-the-exit`. The caller says whether the
   * run is at or near its last session; this decides the other half of the same rule, because
   * somebody who has already started resolving must not lose the panel to arithmetic saying it is
   * early, and only this component knows whether anybody has picked.
   *
   * Undefined means "the caller has not gated it" and the panel shows, which is right for a
   * caller that only mounts it at the end anyway.
   */
  nearTheEnd?: boolean
  /** Every planned session is done, so "The last session is done" is true. Only `board-top` reads it. */
  lastSessionDone?: boolean
  place?: WhereThePanelSits
}) {
  const qc = useQueryClient()
  const [picked, setPicked] = useState<string | null>(null)
  const [why, setWhy] = useState('')
  const [confirming, setConfirming] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['resolution', groundId],
    queryFn: () => resolutionApi.get(groundId),
    // Somebody the server will not show this to gets a 403 here. That is the server being right,
    // so we render nothing rather than an error - see the `error` branch below.
    retry: false,
  })

  const proposeMut = useMutation({
    mutationFn: ({ endState, reason }: { endState: string; reason: string }) =>
      resolutionApi.propose(groundId, endState, reason),
    onSuccess: (state) => {
      qc.invalidateQueries({ queryKey: ['resolution', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      qc.invalidateQueries({ queryKey: ['grounds'] })
      qc.invalidateQueries({ queryKey: ['board', groundId] })
      setPicked(null)
      setWhy('')
      setConfirming(false)
      toast.success(
        state?.resolution?.closedAt
          ? 'This check-in has ended. Everyone in it can read the outcome and your reason.'
          : 'Your choice is recorded.',
      )
    },
    onError: () => toast.error('That did not save. Your outcome and reason are still here, so you can try again.'),
  })

  const leadDecides = !!data?.leadDecides
  const viewerIsLead = !!data?.viewerIsLead
  /** An admin reading a check-in they are not in has no account of their own on it. */
  const viewerIsParty = data?.viewerIsParty !== false
  /** Can the person looking at this actually choose? */
  const canChoose = viewerIsLead || (!leadDecides && viewerIsParty)

  if (isLoading || error || !data) return null

  const { options, confirmations, confirmedCount, totalActive, resolution } = data
  const closed = !!resolution?.closedAt

  /* The exit, at the exit. Or wherever a decision is already under way. */
  const decisionUnderWay = closed || (confirmations ?? []).some((c) => c.confirmed)
  if (nearTheEnd === false && !decisionUnderWay) return null

  /* Who is who, by the names the server lets this reader see. */
  const lead = confirmations.find((c) => c.partyType === 'INITIATOR')
  const leadName = lead?.label ?? null
  const others = confirmations.filter((c) => c.partyType !== 'INITIATOR')
  const oneOther = others.length === 1 ? others[0].label : null

  const label = (v: string | null) => options.find(o => o.value === v)?.label ?? v ?? ''

  const card = { background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 12 } as const
  const heading = { fontSize: 16, fontWeight: 800, color: 'var(--gw-text)', marginBottom: 8 } as const
  const para = { fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 } as const
  const subheading = { fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', margin: '14px 0 6px' } as const

  /* What a participant reads while it is open. The lead is shown the same words, word for word. */
  const whatTheyRead = viewerIsParty
    ? `These are the outcomes this check-in can reach. ${leadName ?? 'Whoever runs it'} decides which one it is. Your account is kept either way, and you can still correct or add to it.`
    : `These are the outcomes this check-in can reach. ${leadName ?? 'Whoever runs it'} decides which one it is.`

  /* ------------------------------------------------------------------ how it ended, for everyone */
  const howItEnded = closed && resolution && (
    <div style={card}>
      <div style={heading}>How this ended</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-green-t)' }}>{label(resolution.endState)}</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 4 }}>
        {viewerIsLead
          ? `You decided this on ${onTheDay(resolution.closedAt!)}.`
          : leadName
            ? `${leadName} decided this on ${onTheDay(resolution.closedAt!)}.`
            : `This was decided on ${onTheDay(resolution.closedAt!)}.`}
      </div>
      {resolution.reason && (
        <>
          <div style={subheading}>{viewerIsLead ? 'Your reason' : leadName ? possessive(leadName) + ' reason' : 'The reason'}</div>
          <div style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{resolution.reason}</div>
        </>
      )}
      {!viewerIsLead && viewerIsParty && (
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 12 }}>
          Your account is kept, and you can still correct it.
        </div>
      )}
    </div>
  )

  if (place === 'board-top') {
    if (closed) return howItEnded || null
    /* "The last session is done. It’s yours to decide how this ends." The lead only, near the end. */
    if (!viewerIsLead || nearTheEnd === false) return null
    return (
      <div style={card}>
        {lastSessionDone && <div style={heading}>The last session is done</div>}
        <div style={para}>It’s yours to decide how this ends.</div>
        <Link
          to={`/grounds/${groundId}/end`}
          style={{ display: 'inline-block', padding: '9px 16px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
        >
          Decide how it ends
        </Link>
      </div>
    )
  }
  if (place === 'board-bottom' && (closed || viewerIsLead)) return null
  if (closed) return howItEnded || null

  /* ------------------------------------------------------------------ still open */
  const whoElse = oneOther ?? 'Everyone in the check-in'
  return (
    <div style={card}>
      <div style={heading}>How does this end?</div>
      {/*
        WHO DECIDES, SAID PLAINLY, AND ONLY THE RIGHT PERSON IS ASKED.

        Whoever called the check-in closes it: "the lead is meant to close it, nothing like
        agreement." `leadDecides` comes off the server and is true for every scenario. The branch
        stays because the server owns the answer, not this component. The words are the
        prototype's (ending-and-probation-review.txt).
      */}
      <div style={para}>
        {viewerIsLead
          ? oneOther
            ? `This one is yours to decide. ${oneOther} can see the possible outcomes and where things stand, and what each of you shared stays whichever way you go.`
            : 'This one is yours to decide. Everyone in the check-in can see the possible outcomes and where things stand, and what each person shared stays whichever way you go.'
          : whatTheyRead}
      </div>

      {confirmations.filter(c => c.confirmed).length > 1 && new Set(confirmations.filter(c => c.confirmed).map(c => c.endState)).size > 1 && (
        <div style={{ fontSize: 12.5, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, lineHeight: 1.55 }}>
          People have chosen differently so far. That disagreement is the useful part - it is
          worth talking about before anyone changes their answer.
        </div>
      )}

      {canChoose && <div style={subheading}>The outcome</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {options.map(o => canChoose ? (
          <button
            key={o.value}
            type="button"
            aria-pressed={picked === o.value}
            onClick={() => setPicked(o.value)}
            style={{
              textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13,
              border: picked === o.value ? '2px solid var(--gw-navy)' : '1px solid var(--gw-border)',
              background: picked === o.value ? 'var(--gw-blue-bg)' : 'white',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--gw-text)' }}>{o.label}</div>
            {o.description && (
              <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.45 }}>{o.description}</div>
            )}
          </button>
        ) : (
          /* A person who does not decide sees the outcomes as a list, never as buttons to press. */
          <div key={o.value} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: 'var(--gw-text)' }}>{o.label}</div>
            {o.description && (
              <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.45 }}>{o.description}</div>
            )}
          </div>
        ))}
      </div>

      {canChoose && (
        <>
          <label htmlFor={`why-${groundId}`} style={{ ...subheading, display: 'block' }}>Why, in a sentence or two</label>
          <textarea
            id={`why-${groundId}`}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            maxLength={1000}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--gw-border)', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5 }}
          />
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '4px 0 12px' }}>
            {whoElse} reads this with the outcome.
          </div>
        </>
      )}

      {canChoose && !confirming && (
        <button
          type="button"
          onClick={() => picked && setConfirming(true)}
          disabled={!picked || !why.trim() || proposeMut.isPending}
          style={{
            padding: '10px 18px', borderRadius: 7, fontFamily: 'inherit',
            fontSize: 13, fontWeight: 700,
            /* A BUTTON WAITING FOR A CHOICE IS STILL A BUTTON SOMEBODY HAS TO READ.
               Paper with a line round it says "not yet" and the words stay legible. */
            background: picked && why.trim() ? 'var(--gw-dark)' : 'var(--gw-card)',
            border: picked && why.trim() ? '1px solid var(--gw-dark)' : '1px solid var(--gw-border)',
            color: picked && why.trim() ? 'white' : 'var(--gw-sub-d)',
            cursor: picked && why.trim() && !proposeMut.isPending ? 'pointer' : 'default',
          }}
        >
          {proposeMut.isPending ? 'Saving…' : leadDecides ? 'Save the outcome and end it' : 'This is my answer'}
        </button>
      )}
      {/*
        THE CONSEQUENCES, THEN THE PRESS (nothing-irreversible-happens-on-one-press). Ending a
        check-in cannot be undone, so the first press names what it does and the second records it.
      */}
      {canChoose && confirming && picked && (
        <Confirm danger={false}
          saying={`End it as "${label(picked)}"? As the lead, your answer closes this check-in. Nobody can add to it after that.`}
          confirmLabel="Yes, end it" keepLabel="Not yet" pending={proposeMut.isPending} pendingLabel="Saving…"
          onConfirm={() => proposeMut.mutate({ endState: picked, reason: why.trim() })} onKeep={() => setConfirming(false)}
        />
      )}

      {viewerIsLead && (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 12 }}>
            {oneOther
              ? `Ending means nobody can add to it. Both of you keep your own history, and ${oneOther} can still correct their account.`
              : 'Ending means nobody can add to it. Everyone keeps their own history, and can still correct their own account.'}
          </div>
          <div style={subheading}>{oneOther ? `What ${oneOther} sees now` : 'What everyone else sees now'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>“{`These are the outcomes this check-in can reach. ${leadName ?? 'Whoever runs it'} decides which one it is. Your account is kept either way, and you can still correct or add to it.`}”</div>
        </>
      )}

      {/*
        THE SAME FALSE TALLY, THIRD LOCATION. W-UX-P. Where the lead decides there is nothing to
        tally - one answer closes it - and the people in those rows never had a say to withhold.
      */}
      {totalActive > 0 && !leadDecides && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--gw-bg)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 6 }}>
            {confirmedCount} of {totalActive} {totalActive === 1 ? 'person has' : 'people have'} answered
          </div>
          {confirmations.map(c => (
            <div key={c.participantId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', fontSize: 12.5 }}>
              <span style={{ color: 'var(--gw-text)' }}>{c.label}</span>
              <span style={{ color: c.confirmed ? 'var(--gw-green-t)' : 'var(--gw-muted)', fontWeight: c.confirmed ? 600 : 400 }}>
                {c.confirmed ? label(c.endState) : 'not yet'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
