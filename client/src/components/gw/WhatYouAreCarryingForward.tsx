import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { Sec } from './kit'
import { SoloReportBody } from './SoloReportBody'

/**
 * WHAT YOU ARE CARRYING FORWARD, AT THE TOP OF THE PAGE.
 *
 * "Summary should be the item at the very top." It is the one block on My record that says, in
 * prose, what this person's record actually holds. Everything else on the page is a read OF it -
 * how checkable it was, what the report can say from it, what to add next time - and it was sitting
 * fourth, under three cards assessing a thing the reader had not yet been shown.
 *
 * It keeps its Share control, because the summary and the decision to show it to the others are one
 * object: sharing a sentence is a different act from sharing your whole account, and the sentence is
 * right here to be read before anybody decides.
 */
export function WhatYouAreCarryingForward({
  groundId,
  mySoloReport,
  refetchSoloReport,
}: {
  groundId: string
  mySoloReport?: { report: Record<string, unknown> | null; shared: boolean }
  refetchSoloReport: () => void
}) {
  const [showShareConfirm, setShowShareConfirm] = useState(false)

  const setSoloSharedMut = useMutation({
    mutationFn: (shared: boolean) => groundsApi.setMySoloReportShared(groundId, shared),
    onSuccess: (_d, shared) => {
      refetchSoloReport()
      setShowShareConfirm(false)
      toast.success(shared ? 'Shared with everyone in this check-in.' : 'No longer shared.')
    },
    onError: () => toast.error('That did not go through. Nothing has changed - try again.'),
  })

  return (
    <div>
          {/*
            AND THE ONE-LINE CARRY-FORWARD, WHICH IS NOT A SECOND REPORT.
            It is what the next session opens from, and it is the thing that can be shared with
            the others - a sentence, deliberately, because sharing your whole account with the
            people you are being compared against is a different act.
          */}
          <Sec title="What you are carrying forward" src="the line the next session opens from" />
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 4 }}>
            From your own check-in only. Only you can see it unless you choose to share it.
          </div>
          {mySoloReport?.report ? (
            <div style={{ background: 'var(--gw-dark)', color: 'white', borderRadius: 10, padding: '16px 18px', marginBottom: 6 }}>
              <SoloReportBody report={mySoloReport.report as Record<string, unknown>} />
              <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                {/*
                  SAID ONCE. The band above this card already says "From your own check-in only.
                  Only you can see it unless you choose to share it", so the private state was the
                  same sentence twice, two inches apart - the pattern she called overdoing it. The
                  SHARED state is not a repeat of anything and stays: it is a change of state, and
                  a person needs to see that it took effect.
                */}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                  {mySoloReport.shared ? 'Shared with everyone in this check-in' : ''}
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
              {/* One line, not two. The second was a restatement of the first, and the box below
                  this one was restating both again. */}
              <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>This appears once you finish your first check-in.</div>
            </div>
          )}

      {showShareConfirm && (
        <div style={{ background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 9 }}>
            Everyone on this check-in will be able to read this line. It cannot be unread.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setSoloSharedMut.mutate(true)}
              disabled={setSoloSharedMut.isPending}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {setSoloSharedMut.isPending ? 'Sharing…' : 'Yes, share it'}
            </button>
            <button
              onClick={() => setShowShareConfirm(false)}
              style={{ padding: '7px 12px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
