import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'

/**
 * SOMEBODY'S OWN PRIVATE REPORT, AND THE TWO THINGS THEY CAN DO WITH IT.
 *
 * Lifted out of `GroundParticipantPage` so the view that RUNS a check-in can show a lead their own
 * private report without sending them to a second page. Same reason as `MyRecord`.
 *
 * THE WHOLE FLOW CAME WITH IT, which is why this is a component and not a fragment. The share
 * button was in the report tab, the confirmation modal was four hundred lines away at page level,
 * and the mutation was near the top with the queries. Three pieces of one decision in three places:
 * moving the button alone would have left a modal on the page that nothing could open.
 *
 * Sign-off is here for the same reason - it is a statement about your own account, made from the
 * screen that shows it.
 */
export interface MyPrivateReportProps {
  /** The check-in's id. */
  groundId: string
  /** This reader's own solo report, from `/grounds/:id/my-solo-report`. */
  mySoloReport: any
  /** Re-read it after sharing changes, so the button and the state cannot disagree. */
  refetchSoloReport: () => void
  /** This reader's participant row, for whether they have signed off. */
  myParticipant: any
  /**
   * Everybody else on the check-in, named, for the confirmation that says who would be able to read
   * this. Resolved by the caller: naming a participant is the page's job and depends on what this
   * reader is allowed to know about them.
   */
  otherParties: { id: string; name: string; email?: string | null }[]
  /**
   * This reader's own finished sessions, newest first, so each one's own report can be opened.
   * "I need my own report to be the same report on my record."
   */
  mySessions?: { id: string; sessionNumber: number; completedAt?: string | Date | null }[]
  /**
   * HOW SPECIFIC EACH SESSION WAS, by session number.
   *
   * Specificity is a fact about ONE session - how checkable the account you gave that day is - so
   * it belongs on that session's row. It used to be a card of its own further down the page,
   * showing a row of bars with no dates on them, next to a separate list of the same sessions with
   * dates and no bars. Two lists of one thing.
   */
  /** Where the session list lives now. The page owns tab names, so it is handed a callback. */
  onGoToReport?: () => void
}

export function MyPrivateReport({
  groundId,
  mySoloReport,
  refetchSoloReport,
  myParticipant,
  otherParties,
  mySessions = [],
  onGoToReport,
}: MyPrivateReportProps) {
  const qc = useQueryClient()
  const [showShareConfirm, setShowShareConfirm] = useState(false)

  const setSoloSharedMut = useMutation({
    mutationFn: (shared: boolean) => groundsApi.setMySoloReportShared(groundId, shared),
    onSuccess: () => {
      refetchSoloReport()
      setShowShareConfirm(false)
    },
    onError: () => toast.error('That did not change - try again.'),
  })

  /**
   * Explicit "my account is accurate" confirmation - the deadline for corrections, in place of a
   * timer. Does not block later corrections; it flags any that come after as "updated after
   * sign-off" on the shared report.
   */
  const signOffMut = useMutation({
    mutationFn: () => groundsApi.signOff(groundId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', groundId] }),
    onError: () => toast.error('Could not sign off. Try again.'),
  })

  return (
    <>
          {/*
            THE REPORT YOU READ AT THE END OF EACH SESSION, WHICH IS WHAT THIS TAB IS FOR.
            "I need my own report to be the same report on my record." My record showed one thing
            called "your private report" - the two-line summary a background job writes - while
            the report a person actually read when they finished their session lived nowhere they
            could reach. One session, one report, and it does not change afterwards.
          */}
          {/*
            THE SESSION LIST MOVED TO REPORT, WHICH IS WHERE ITS NAME SAYS IT GOES.

            It was here and on the Report tab, byte-for-byte the same rows. I removed the Report
            copy first and removed the wrong one: "your sessions on the report page should go to
            reports." A session's report is a report; My record is what you wrote and what it
            amounts to.

            A link rather than nothing, because somebody who has just read what was missing from
            session 1 is exactly the person who wants to open it.
          */}
          {/*
            A LINE, NOT A CARD. It had the same border, padding and radius as a five-item block, so
            a one-line signpost carried the same weight as the reading above it and nothing on the
            page was primary.
          */}
          {mySessions.length > 0 && (
            <button
              onClick={() => onGoToReport?.()}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '2px 0', marginBottom: 14, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 12.5, color: 'var(--gw-navy)', fontWeight: 600,
              }}
            >
              Your session reports are on Report &rarr;
            </button>
          )}

          {/*
            THE CARRY-FORWARD MOVED TO THE TOP OF THE PAGE. Her call: "summary should be the item at
            the very top."

            It is the one block that says in prose what this person's record actually holds, and
            everything else on the page is a read OF it - so it sat fourth, under three cards
            assessing a thing the reader had not been shown yet. See WhatYouAreCarryingForward.
          */}
          {/* Sign-off: the deadline for corrections, in place of a timer.
              Does not block later corrections - it just flags any that come
              after as "updated after sign-off" on the shared report. */}
          {mySoloReport?.report && (
            <div style={{ background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 6 }}>
              {myParticipant?.signedOffAt ? (
                <div style={{ fontSize: 12, color: 'var(--gw-green-t-soft)', fontWeight: 600 }}>
                  You signed off on {new Date(myParticipant.signedOffAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                  {' '}You can still correct it, but it will show as updated after sign-off.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 8 }}>
                Any correction after this is flagged on the shared report.</div>
                  <button
                    onClick={() => signOffMut.mutate()}
                    disabled={signOffMut.isPending}
                    style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: signOffMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: signOffMut.isPending ? 0.6 : 1 }}
                  >
                    {signOffMut.isPending ? 'Signing off…' : "Sign off - this is accurate"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Divider */}
    {/* Share solo report confirmation modal */}
    {showShareConfirm && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gw-dark)', marginBottom: 8 }}>Share your private report?</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 6 }}>
            Your private report will become visible to everyone else in this check-in:
          </div>
          <ul style={{ margin: '0 0 14px', paddingLeft: 18 }}>
            {otherParties.map((p) => (
              <li key={p.id} style={{ fontSize: 13, color: 'var(--gw-text)', marginBottom: 2 }}>
                {p.name}
                {p.email ? <span style={{ color: 'var(--gw-muted)' }}> · {p.email}</span> : null}
              </li>
            ))}
          </ul>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 18, background: 'var(--gw-paper-2)', borderRadius: 8, padding: '10px 12px' }}>
            This is all or nothing. All sections of your private report become visible at once. You can stop sharing at any time.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowShareConfirm(false)}
              style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--gw-paper-2)', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <button
              onClick={() => setSoloSharedMut.mutate(true)}
              disabled={setSoloSharedMut.isPending}
              style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: setSoloSharedMut.isPending ? 0.6 : 1 }}
            >
              {setSoloSharedMut.isPending ? 'Sharing…' : 'Yes, share it'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
