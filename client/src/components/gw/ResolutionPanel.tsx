import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
export function ResolutionPanel({ groundId, nearTheEnd }: {
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
}) {
  const qc = useQueryClient()
  const [picked, setPicked] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['resolution', groundId],
    queryFn: () => resolutionApi.get(groundId),
    // A non-party (an admin who set the ground up but is not in it) gets a 403
    // here. That is the server being right, so we render nothing rather than an
    // error - see the `error` branch below.
    retry: false,
  })

  const proposeMut = useMutation({
    mutationFn: (endState: string) => resolutionApi.propose(groundId, endState),
    onSuccess: (state) => {
      qc.invalidateQueries({ queryKey: ['resolution', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      qc.invalidateQueries({ queryKey: ['grounds'] })
      setPicked(null)
      setConfirming(false)
      toast.success(
        state?.resolution?.closedAt
          ? 'That is how this check-in ended. It is closed.'
          : 'Your choice is recorded.',
      )
    },
    onError: () => toast.error('Could not record that. Please try again.'),
  })

  const leadDecides = !!data?.leadDecides
  const viewerIsLead = !!(data as any)?.viewerIsLead
  /** Can the person looking at this actually choose? */
  const canChoose = !leadDecides || viewerIsLead

  if (isLoading || error || !data) return null

  /* The exit, at the exit. Or wherever a decision is already under way. */
  const decisionUnderWay =
    !!data.resolution?.closedAt || (data.confirmations ?? []).some((c) => c.confirmed)
  if (nearTheEnd === false && !decisionUnderWay) return null

  const { options, confirmations, confirmedCount, totalActive, resolution } = data
  const closed = !!resolution?.closedAt
  const myChoiceExists = confirmations.some(c => c.confirmed)
  const chosen = new Set(confirmations.filter(c => c.confirmed).map(c => c.endState))
  const split = chosen.size > 1

  const label = (v: string | null) => options.find(o => o.value === v)?.label ?? v ?? ''

  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gw-muted)', marginBottom: 8 }}>
        {closed ? 'How this ended' : 'Bringing this to an end'}
      </div>

      {closed ? (
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gw-green-t)' }}>
          {label(resolution!.endState)}
          <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--gw-sub)', marginTop: 4 }}>
            Everyone in this check-in chose the same outcome. The record stays open to all parties.
          </div>
        </div>
      ) : (
        <>
          {/*
            WHO DECIDES, SAID PLAINLY, AND ONLY THE RIGHT PERSON IS ASKED.

            Whoever called the check-in closes it. There used to be a third version of this line for
            the scenarios that needed everybody to pick the same outcome - "nobody closes it alone" -
            and it is gone with the rule: "the lead is meant to close it, nothing like agreement."

            `leadDecides` comes off the server and is now true for every scenario. The branch stays
            because the server owns the answer, not this component, and a page that assumes it would
            be wrong the day one scenario needs something else.
          */}
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
            {viewerIsLead ? (
              <>This one is yours to decide. Everyone in the check-in can see the possible outcomes and
              where things stand, and what each person shared stays whichever way you go.</>
            ) : (
              <>These are the outcomes this check-in can reach. Whoever runs it decides which one it is.
              Your account stays on the record either way, and you can still correct or add to it.</>
            )}
          </div>

          {split && (
            <div style={{ fontSize: 12.5, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, lineHeight: 1.55 }}>
              People have chosen differently so far. That disagreement is the useful part - it is
              worth talking about before anyone changes their answer.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => canChoose && setPicked(o.value)}
                disabled={!canChoose}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                  cursor: canChoose ? 'pointer' : 'default',
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
            ))}
          </div>

          {canChoose && !confirming && (
          <button
            onClick={() => picked && setConfirming(true)}
            disabled={!picked || proposeMut.isPending}
            style={{
              padding: '10px 18px', borderRadius: 7, fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700,
              /* A BUTTON WAITING FOR A CHOICE IS STILL A BUTTON SOMEBODY HAS TO READ.
                 Grey ink on the border grey measured 4.04:1 - the one contrast failure on this
                 whole page. Paper with a line round it says "not yet" just as clearly and the
                 words stay legible. */
              background: picked ? 'var(--gw-dark)' : 'var(--gw-card)',
              border: picked ? '1px solid var(--gw-dark)' : '1px solid var(--gw-border)',
              color: picked ? 'white' : 'var(--gw-sub-d)',
              cursor: picked && !proposeMut.isPending ? 'pointer' : 'default',
            }}
          >
            {proposeMut.isPending ? 'Saving…' : myChoiceExists ? 'Change my answer' : 'This is my answer'}
          </button>
          )}
          {/*
            THE CONSEQUENCES, THEN THE PRESS. The options include ending the engagement, and this was
            one click. Same shape as the decline confirm on the check-in page: what happens is listed,
            and the second press records it.
          */}
          {canChoose && confirming && picked && (
            <Confirm danger={false}
              saying={`Record "${options.find(o => o.value === picked)?.label ?? picked}" as your answer? It is kept on the record with your name against it. As the lead, your answer closes this check-in. Everybody's accounts stay on the record whichever way it goes.`}
              confirmLabel="Yes, that is my answer" keepLabel="Not yet" pending={proposeMut.isPending} pendingLabel="Saving…"
              onConfirm={() => proposeMut.mutate(picked)} onKeep={() => setConfirming(false)}
            />
          )}
        </>
      )}

      {/*
        THE SAME FALSE TALLY, THIRD LOCATION. W-UX-P.
        
        This panel got the COPY right - it says "This one is yours to decide" on a lead-decides ground -
        and then printed "0 of 3 people have answered" underneath, with all three listed "not yet". So
        the sentence said one person decides and the list said three were being waited on, four inches
        apart on the same card. Seen on the running Overview tab of a contract renewal.
        
        The report page had the identical fault and was fixed first; this is the copy of it. Where the
        lead decides there is nothing to tally - one answer closes it - and the people in those rows
        never had a say to withhold.
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
