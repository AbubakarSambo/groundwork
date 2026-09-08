import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resolutionApi } from '@/api/resolution'
import { toast } from 'sonner'

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
      toast.success(
        state?.resolution?.closedAt
          ? 'Everyone chose the same outcome. This check-in is closed.'
          : 'Your choice is recorded. This closes when everyone picks the same one.',
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
          {/* WHO DECIDES, SAID PLAINLY, AND ONLY THE RIGHT PERSON IS ASKED.
              A new hire was shown "Let them go" with a button asking him to
              choose it, and the ground could not close until he picked the same
              option as his manager. He still sees what is coming; he is no
              longer asked to agree to his own exit. */}
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
            {!leadDecides ? (
              <>Each person picks the outcome they think the record supports. The check-in closes only when
              everyone picks the same one, and nobody closes it alone.</>
            ) : viewerIsLead ? (
              <>This one is yours to decide. Everyone in the check-in can see the possible outcomes and
              where things stand, and their accounts stay on the record whichever way you go.</>
            ) : (
              <>These are the outcomes this check-in can reach. Your lead decides which one it is. Your
              account stays on the record either way, and you can still correct or add to it.</>
            )}
          </div>

          {split && (
            <div style={{ fontSize: 12.5, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, lineHeight: 1.55 }}>
              People have chosen differently so far. That disagreement is the useful part — it is
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

          {canChoose && (
          <button
            onClick={() => picked && proposeMut.mutate(picked)}
            disabled={!picked || proposeMut.isPending}
            style={{
              padding: '10px 18px', borderRadius: 7, border: 'none', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700,
              background: picked ? 'var(--gw-dark)' : 'var(--gw-border)',
              color: picked ? 'white' : 'var(--gw-muted)',
              cursor: picked && !proposeMut.isPending ? 'pointer' : 'default',
            }}
          >
            {proposeMut.isPending ? 'Recording…' : myChoiceExists ? 'Change my answer' : 'This is my answer'}
          </button>
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
