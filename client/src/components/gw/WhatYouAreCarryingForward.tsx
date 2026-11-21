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
  otherParties = [],
}: {
  groundId: string
  mySoloReport?: { report: Record<string, unknown> | null; shared: boolean }
  refetchSoloReport: () => void
  /**
   * WHO WOULD BE ABLE TO READ IT, NAMED BEFORE ANYBODY AGREES TO IT.
   *
   * The confirmation came here with the Share control. It lists people by name on purpose: "share
   * with everyone" is an abstraction, and the decision is about specific colleagues reading
   * specific words. It was in MyPrivateReport, which is gone - and it had already become
   * unreachable there, because the button that opened it had moved into this file.
   */
  otherParties?: { id: string; name: string; email?: string | null }[]
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
          {/* RE-REVIEW: "the line the next session opens from" was a clipped fragment, not a
              sentence, sitting beside the heading. The line under it already says what this is
              ("From your own check-in only..."), so the fragment is dropped rather than forced
              into a sentence that would only repeat that line. */}
          <Sec title="What you are carrying forward" />
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px', marginBottom: 4 }}>
            From your own check-in only.
          </div>
          {mySoloReport?.report ? (
            /*
              REVIEW ROUND 3, ITEM 5: THE DARK NAVY CARD IS GONE. Every other card on My work
              (and the prototype's own my-record.jpg) sits on white with a thin border; this one
              alone was a dark, high-contrast box that read as a different kind of thing - a
              warning or an alert - rather than a person's own report, the least alarming thing on
              the page. `SoloReportBody`'s `on="light"` draws its labels for a light background
              instead (still `on="dark"` by default, unchanged, where the lead's roster shows a
              shared solo report nested in its own dark row).
            */
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 6 }}>
              <SoloReportBody report={mySoloReport.report as Record<string, unknown>} on="light" />
              <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                {/*
                  SAID ONCE. The band above this card already says "From your own check-in only.
                  Only you can see it unless you choose to share it", so the private state was the
                  same sentence twice, two inches apart - the pattern she called overdoing it. The
                  SHARED state is not a repeat of anything and stays: it is a change of state, and
                  a person needs to see that it took effect.
                */}
                <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
                  {mySoloReport.shared ? 'Shared with everyone in this check-in' : ''}
                </div>
                <button
                  onClick={() => mySoloReport.shared ? setSoloSharedMut.mutate(false) : setShowShareConfirm(true)}
                  disabled={setSoloSharedMut.isPending}
                  type="button"
                  className="gw-link t-small"
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-dark)', marginBottom: 8 }}>Share your private report?</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', marginBottom: 6 }}>
              Your private report will become visible to everyone else in this check-in:
            </div>
            <ul style={{ margin: '0 0 14px', paddingLeft: 18 }}>
              {/*
                U.9 REVIEW FIX 13: JUST THE NAME. "Amani Wekesa · amani.u8@example.test" put an
                email address on a screen for its own sake, joined to the name with a dot. The name
                is who is about to see the report; the address adds nothing she needs to read here.
              */}
              {otherParties.map((p) => (
                <li key={p.id} style={{ fontSize: 13, color: 'var(--gw-text)', marginBottom: 2 }}>
                  {p.name}
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: '19px', marginBottom: 18, background: 'var(--gw-paper-2)', borderRadius: 8, padding: '10px 12px' }}>
              This is all or nothing. All sections of your private report become visible at once. You can stop sharing at any time.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sec"
                onClick={() => setShowShareConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button className="btn pri"
                onClick={() => setSoloSharedMut.mutate(true)}
                disabled={setSoloSharedMut.isPending}
                style={{ flex: 1 }}
              >
                {setSoloSharedMut.isPending ? 'Sharing…' : 'Yes, share it'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
