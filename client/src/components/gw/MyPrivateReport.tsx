import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sec } from './kit'
import { SoloReportBody } from './SoloReportBody'
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
}

export function MyPrivateReport({
  groundId,
  mySoloReport,
  refetchSoloReport,
  myParticipant,
  otherParties,
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
          {/* Individual report section */}
          <Sec title="Your private report" />
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 4 }}>
            This is from your own check-in only. Only you can see it unless you choose to share it.
          </div>
          {mySoloReport?.report ? (
            <div style={{ background: 'var(--gw-dark)', color: 'white', borderRadius: 10, padding: '16px 18px', marginBottom: 6 }}>
              <SoloReportBody report={mySoloReport.report as Record<string, unknown>} />
              <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                  {mySoloReport.shared
                    ? 'Shared with everyone in this check-in'
                    : 'Private - only you can see this'}
                </div>
                <button
                  onClick={() => mySoloReport.shared ? setSoloSharedMut.mutate(false) : setShowShareConfirm(true)}
                  disabled={setSoloSharedMut.isPending}
                  style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {mySoloReport.shared ? 'Stop sharing' : 'Share with everyone'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Your private report is not ready yet.</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 4 }}>It generates once you complete your check-in.</div>
            </div>
          )}

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
                    Confirm your account is accurate. This isn't a lock - you can still correct it later - but any correction after sign-off is flagged on the shared report.
                  </div>
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
