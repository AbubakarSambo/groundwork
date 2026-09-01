import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sec } from './kit'
import { reportsApi } from '@/api/reports'
import { ReportBody } from '@/pages/report/ReportPage'

/**
 * THE SHARED REPORT, AS A PARTY READS IT.
 *
 * Where the accounts agree and where they differ, plus what this reader's own record says about
 * their picture - assumptions they are carrying, where they have clarity, and what is still to
 * resolve between them.
 *
 * The last thing on the party view still written into the page rather than composed. The view that
 * RUNS a check-in has its own Report tab carrying the lead's tools - releasing, resolution, how
 * this has moved - and needs to show a lead this as well, because a lead is almost always also a
 * party to their own check-in. Extracted so the merge composes rather than moves.
 *
 * `ReportBody` is untouched and called exactly as both views already called it. It decides for
 * itself what a given reader may see, which is why there was nothing to reconcile between them.
 */
export interface SharedReportForAPartyProps {
  /** The check-in's id. */
  groundId: string
  /** The report, or null when there is not one yet. */
  report: any
  /** The check-in, for session progress and whether it has a board. */
  ground: any
  /** Open the team board. A prop, because the route is the page's business and not this view's. */
  onOpenBoard: () => void
}

export function SharedReportForAParty({
  groundId,
  report,
  ground,
  onOpenBoard,
}: SharedReportForAPartyProps) {
  const qc = useQueryClient()
  /**
   * REVEALING THE REPORT, which came across with the button that does it.
   *
   * It lived on the page with the other mutations while the only button calling it was here. The
   * same split that put the solo-report share button, its modal and its mutation in three places.
   */
  const activateMutation = useMutation({
    mutationFn: () => reportsApi.activate(groundId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', groundId] })
      /* The ground too: the report query is gated on `ground.report`, so refreshing only the
         report would leave the gate shut and the new report unfetched. */
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      toast.success('Report revealed')
    },
    onError: () => toast.error('That did not activate. Nothing has changed - try again.'),
  })

  return (
    <>
          <Sec title="Shared report" />
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.6, marginBottom: 4 }}>
            Shows where your account and the other party's account agree or differ. It does not quote anyone.
          </div>

          {!report ? (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 4 }}>
                {ground?.sessionProgress
                  ? `Report pending - ${ground.sessionProgress.completed} of ${ground.sessionProgress.total} checked in`
                  : 'No report yet.'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
                {ground?.sessionProgress?.requestingUserIsMissing
                  ? "You haven't completed this session yet - that's part of what's holding the report."
                  : 'The report generates once all parties have checked in.'}
              </div>
            </div>
          ) : !report.releasedAt ? (
            <>
              <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>
                  {(report as any)?.forming ? 'A picture is forming' : 'Report is being prepared'}
                </div>
                <div style={{ fontSize: 12, color: '#4A6A9A', lineHeight: 1.6, marginBottom: 0 }}>
                  {(report as any)?.forming
                    ? 'Not everyone has checked in yet, so this is not final - but you can see what has emerged so far. It never fabricates agreement, only what is actually known.'
                    : 'Your report will be available once it is released.'}
                </div>
              </div>
              {(report as any)?.forming && (
                <div style={{ marginTop: 10 }}>
                  <ReportBody groundId={groundId} embedded reportExists={!!(ground as any)?.report} />
                </div>
              )}
            </>
          ) : !report.activated ? (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>The shared report is ready</div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 8 }}>
                All parties reveal it at the same time. Once unlocked, everyone can read it - this cannot be undone.
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 16, background: 'var(--gw-paper-2)', borderRadius: 8, padding: '8px 12px' }}>
                The report shows where accounts agree and where they differ. It does not quote anyone.
              </div>
              <button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                style={{ padding: '11px 28px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: activateMutation.isPending ? 0.6 : 1 }}
              >
                {activateMutation.isPending ? 'Confirming…' : 'Reveal report'}
              </button>
            </div>
          ) : (
            <>
              <ReportBody groundId={groundId} embedded reportExists={!!(ground as any)?.report} />

              {/*
                THE WAY INTO THE TEAM BOARD, WHICH A PARTICIPANT DID NOT HAVE.

                The board stopped being a tab for a good reason - it leaves the page rather than
                changing what is under the tab row - and the lead got a replacement door at the
                foot of their report. A participant got nothing. The route stayed live, the board
                still rendered, and for everybody who is not the lead it simply ceased to exist.

                Hafsah found it the only way it could be found: "the team board no longer exists."

                Same gate as the lead's, because a board with nothing to draw is a worse door than
                no door, and same place - the board is the shared picture you talk over once you
                have read what the accounts said.
              */}
              {!!(ground as any).boardRenders && (
                <button
                  onClick={() => onOpenBoard()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                    background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-border)',
                    borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Team board</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>
                      The same check-in side by side, so you can see where the accounts meet. Opens full screen.
                    </span>
                  </span>
                  <span style={{ fontSize: 13 }}>&rarr;</span>
                </button>
              )}

              {/* Participant report sections */}
              {report.pattern && (
                <div style={{ background: 'var(--gw-dark)', color: 'white', borderRadius: 10, padding: '14px 16px' }}>
                  <Sec title="What your record reveals" on="dark" />
                  <div style={{ fontSize: 13, lineHeight: 1.65 }}>{report.pattern}</div>
                </div>
              )}
              {(report.assumptions ?? []).length > 0 && (
                <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 16px' }}>
                  <Sec title="Assumptions you are carrying" />
                  <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0 }}>
                    {(report.assumptions ?? []).map((a: string, i: number) => <li key={i} style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 5 }}>{a}</li>)}
                  </ul>
                </div>
              )}
              {(report.clarity ?? []).length > 0 && (
                <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '13px 16px' }}>
                  <Sec title="Where you have clarity" />
                  <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0 }}>
                    {(report.clarity ?? []).map((c: string, i: number) => <li key={i} style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 5 }}>{c}</li>)}
                  </ul>
                </div>
              )}

              {/* Cross-reference section (shared picture, after activation) */}
              {(report.alignmentReached ?? []).length > 0 && (
                <div style={{ background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '13px 16px' }}>
                  <Sec title="Shared picture: where you are aligned" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(report.alignmentReached ?? []).map((a: any, i: number) => (
                      <div key={i} style={{ borderLeft: '3px solid var(--gw-green-b)', paddingLeft: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-green-t)' }}>{a.title ?? a}</div>
                        {a.note && <div style={{ fontSize: 12, color: 'var(--gw-green-t-soft)', lineHeight: 1.5, marginTop: 2 }}>{a.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(report.areasRequiringAlignment ?? []).length > 0 && (
                <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 16px' }}>
                  <Sec title="Shared picture: still to resolve" />
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 10, lineHeight: 1.5 }}>These gaps appear in the cross-reference. They show where your account and the other party's account differ. Neither side's raw words are shown here.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(report.areasRequiringAlignment ?? []).map((a: any, i: number) => (
                      <div key={i} style={{ borderLeft: '3px solid var(--gw-amber-b)', paddingLeft: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title ?? a}</div>
                        {a.observation && <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginTop: 2 }}>{a.observation}</div>}
                        {a.recommendedMove && (
                          <div style={{ fontSize: 12, color: 'var(--gw-navy)', fontWeight: 600, marginTop: 4 }}>Next: {a.recommendedMove}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 13px' }}>
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', lineHeight: 1.6 }}>
                  This report shows where both accounts agree and where they differ. The other party's exact words are never visible to you, and yours are never visible to them.
                </div>
              </div>
            </>
          )}
    </>
  )
}
