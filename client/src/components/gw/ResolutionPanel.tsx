import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { resolutionApi } from '@/api/resolution'
import { toast } from 'sonner'
import { Confirm } from './a-second-press-before-it-is-gone'
import { Panel, Callout, Button, Note } from './ui'
import { useAuthStore } from '@/stores/auth'

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
/* "30 September", through the one date formatter (one-date-format-everywhere). */
const onTheDay = (iso: string) => whenItWas(iso, 'dayAndMonthLong')

/**
 * "You decide", never "You decides" (B-071). A name swapped for "You" still needs its verb to
 * agree: wherever a sentence here puts a subject that MAY be "You" in front of "decides", it goes
 * through this first, so a future caller never has to remember the conjugation by hand.
 */
const decidesVerb = (subject: string) => (subject === 'You' ? 'decide' : 'decides')

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
  const user = useAuthStore((s) => s.user)
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
    onError: () => toast.error('That didn’t save. Try again.'),
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

  /**
   * THE NAME EVERYONE ELSE ACTUALLY READS, NEVER "YOU" (B-071). The server's own label for the
   * lead's confirmation is "You" when the reader IS the lead - right wherever this panel addresses
   * her directly ("You decided this on..."), but `leadName` is also quoted below as what SOMEBODY
   * ELSE's screen says, and nobody else ever reads "You" about her. `myFullName` is the one source
   * of her own name this component has when the server has swapped it away.
   */
  const myFullName = user?.firstName?.trim() ? `${user.firstName} ${user.lastName ?? ''}`.trim() : null
  const leadNameAsOthersReadIt = (leadName === 'You' ? myFullName : leadName) ?? 'Whoever runs it'

  const label = (v: string | null) => options.find(o => o.value === v)?.label ?? v ?? ''

  const headingClass = 'gwui-fs-16 gwui-ink-text gwui-mb-8'
  const paraClass = 'gwui-fs-13 gwui-ink-sub gwui-mb-12'
  const paraStyle = { lineHeight: 1.6 } as const
  const subheadingClass = 'gwui-fs-13 gwui-ink-text gwui-mt-14 gwui-mb-6'
  const subheadingStyle = { fontWeight: 700 } as const

  /* What a participant reads while it is open. The lead is shown the same words, word for word. */
  const whatTheyRead = viewerIsParty
    ? `These are the outcomes this check-in can reach. ${leadNameAsOthersReadIt} ${decidesVerb(leadNameAsOthersReadIt)} which one it is. Your words are kept either way, and you can still correct or add to them.`
    : `These are the outcomes this check-in can reach. ${leadNameAsOthersReadIt} ${decidesVerb(leadNameAsOthersReadIt)} which one it is.`

  /* ------------------------------------------------------------------ how it ended, for everyone */
  const howItEnded = closed && resolution && (
    <Panel className="gwui-mb-12">
      <div className={headingClass}>How this ended</div>
      <div className="gwui-fs-15 gwui-ink-green" style={{ fontWeight: 700 }}>{label(resolution.endState)}</div>
      <div className="gwui-mt-4">
        <Note>
          {viewerIsLead
            ? `You decided this on ${onTheDay(resolution.closedAt!)}.`
            : leadName
              ? `${leadName} decided this on ${onTheDay(resolution.closedAt!)}.`
              : `This was decided on ${onTheDay(resolution.closedAt!)}.`}
        </Note>
      </div>
      {resolution.reason && (
        <>
          <div className={subheadingClass} style={subheadingStyle}>{viewerIsLead ? 'Your reason' : leadName ? possessive(leadName) + ' reason' : 'The reason'}</div>
          <div className="gwui-fs-13-5 gwui-ink-text" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{resolution.reason}</div>
        </>
      )}
      {!viewerIsLead && viewerIsParty && (
        <div className="gwui-mt-12">
          <Note>Your words are kept, and you can still correct them.</Note>
        </div>
      )}
    </Panel>
  )

  if (place === 'board-top') {
    if (closed) return howItEnded || null
    /* "The last session is done. It’s yours to decide how this ends." The lead only, near the end. */
    if (!viewerIsLead || nearTheEnd === false) return null
    return (
      <Panel className="gwui-mb-12">
        {lastSessionDone && <div className={headingClass}>The last session is done</div>}
        <div className={paraClass} style={paraStyle}>It’s yours to decide how this ends.</div>
        <Button to={`/grounds/${groundId}/end`}>Decide how it ends</Button>
      </Panel>
    )
  }
  if (place === 'board-bottom' && (closed || viewerIsLead)) return null
  if (closed) return howItEnded || null

  /* ------------------------------------------------------------------ still open */
  const whoElse = oneOther ?? 'Everyone in the check-in'
  return (
    <Panel className="gwui-mb-12">
      <div className={headingClass}>How does this end?</div>
      {/*
        WHO DECIDES, SAID PLAINLY, AND ONLY THE RIGHT PERSON IS ASKED.

        Whoever called the check-in closes it: "the lead is meant to close it, nothing like
        agreement." `leadDecides` comes off the server and is true for every scenario. The branch
        stays because the server owns the answer, not this component. The words are the
        prototype's (ending-and-probation-review.txt).
      */}
      <div className={paraClass} style={paraStyle}>
        {viewerIsLead
          ? oneOther
            ? `This one is yours to decide. ${oneOther} can see the possible outcomes and where things stand, and what each of you shared stays whichever way you go.`
            : 'This one is yours to decide. Everyone in the check-in can see the possible outcomes and where things stand, and what each person shared stays whichever way you go.'
          : whatTheyRead}
      </div>

      {confirmations.filter(c => c.confirmed).length > 1 && new Set(confirmations.filter(c => c.confirmed).map(c => c.endState)).size > 1 && (
        <div className="gwui-mb-12">
          <Callout tone="warning">
            People have chosen differently so far. That disagreement is the useful part - it is
            worth talking about before anyone changes their answer.
          </Callout>
        </div>
      )}

      {canChoose && <div className={subheadingClass} style={subheadingStyle}>The outcome</div>}
      <div className="gwui-gap-6 gwui-mb-12" style={{ display: 'flex', flexDirection: 'column' }}>
        {options.map(o => canChoose ? (
          <button
            key={o.value}
            type="button"
            aria-pressed={picked === o.value}
            onClick={() => setPicked(o.value)}
            className="gwui-rule gwui-fs-13 gwui-pt-10 gwui-pr-12 gwui-pb-10 gwui-pl-12"
            style={{
              textAlign: 'left', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              borderColor: picked === o.value ? 'var(--gw-navy)' : undefined,
              borderWidth: picked === o.value ? 2 : undefined,
              background: picked === o.value ? 'var(--gw-blue-bg)' : 'white',
            }}
          >
            <div className="gwui-ink-text" style={{ fontWeight: 600 }}>{o.label}</div>
            {o.description && (
              <div className="gwui-fs-13 gwui-ink-sub gwui-mt-3" style={{ lineHeight: 1.45 }}>{o.description}</div>
            )}
          </button>
        ) : (
          /* A person who does not decide sees the outcomes as a list, never as buttons to press. */
          <div key={o.value} className="gwui-rule gwui-fs-13 gwui-pt-8 gwui-pr-12 gwui-pb-8 gwui-pl-12" style={{ borderRadius: 8 }}>
            <div className="gwui-ink-text" style={{ fontWeight: 600 }}>{o.label}</div>
            {o.description && (
              <div className="gwui-fs-13 gwui-ink-sub gwui-mt-3" style={{ lineHeight: 1.45 }}>{o.description}</div>
            )}
          </div>
        ))}
      </div>

      {canChoose && (
        <>
          <label htmlFor={`why-${groundId}`} className={subheadingClass} style={{ ...subheadingStyle, display: 'block' }}>Why, in a sentence or two</label>
          <textarea
            id={`why-${groundId}`}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            maxLength={1000}
            rows={3}
            className="gwui-rule gwui-fs-13 gwui-pt-9 gwui-pr-11 gwui-pb-9 gwui-pl-11"
            style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8, fontFamily: 'inherit', lineHeight: 1.5 }}
          />
          <div className="gwui-mt-4 gwui-mb-12">
            <Note>{whoElse} reads this with the outcome.</Note>
          </div>
        </>
      )}

      {canChoose && !confirming && (
        <button
          type="button"
          onClick={() => picked && setConfirming(true)}
          disabled={!picked || !why.trim() || proposeMut.isPending}
          className="btn pri"
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
          <div className="gwui-fs-13 gwui-ink-sub gwui-mt-12" style={{ lineHeight: 1.6 }}>
            {oneOther
              ? `Ending means nobody can add to it. Both of you keep your own history, and ${oneOther} can still correct what they said.`
              : 'Ending means nobody can add to it. Everyone keeps their own history, and can still correct what they said.'}
          </div>
          <div className={subheadingClass} style={subheadingStyle}>{oneOther ? `What ${oneOther} sees now` : 'What everyone else sees now'}</div>
          <div className="gwui-fs-13 gwui-ink-sub" style={{ lineHeight: 1.6 }}>“{`These are the outcomes this check-in can reach. ${leadNameAsOthersReadIt} ${decidesVerb(leadNameAsOthersReadIt)} which one it is. Your words are kept either way, and you can still correct or add to them.`}”</div>
        </>
      )}

      {/*
        THE SAME FALSE TALLY, THIRD LOCATION. W-UX-P. Where the lead decides there is nothing to
        tally - one answer closes it - and the people in those rows never had a say to withhold.
      */}
      {totalActive > 0 && !leadDecides && (
        <div className="gwui-rule-top gwui-mt-14 gwui-pt-10" style={{ borderTopColor: 'var(--gw-bg)' }}>
          <div className="gwui-mb-6">
            <Note tone="muted">
              {confirmedCount} of {totalActive} {totalActive === 1 ? 'person has' : 'people have'} answered
            </Note>
          </div>
          {confirmations.map(c => (
            <div key={c.participantId} className="gwui-gap-12 gwui-pt-4 gwui-pb-4 gwui-fs-13" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="gwui-ink-text">{c.label}</span>
              <span className={c.confirmed ? 'gwui-ink-green' : 'gwui-ink-muted'} style={{ fontWeight: c.confirmed ? 600 : 400 }}>
                {c.confirmed ? label(c.endState) : 'not yet'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
