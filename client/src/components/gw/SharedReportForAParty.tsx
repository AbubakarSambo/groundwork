import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
  /** Who is reading, so their own finished sessions can be listed and nobody else's. */
  viewerUserId?: string | null
}

export function SharedReportForAParty({
  groundId,
  report,
  ground,
  onOpenBoard,
  viewerUserId,
}: SharedReportForAPartyProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  /**
   * SHOWING YOUR REPORT TO THE OTHERS, which came across with the button that does it.
   *
   * It lived on the page with the other mutations while the only button calling it was here. The
   * same split that put the solo-report share button, its modal and its mutation in three places.
   */
  const activateMutation = useMutation({
    mutationFn: () => reportsApi.activate(groundId),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['report', groundId] })
      /* The ground too: the report query is gated on `ground.report`, so refreshing only the
         report would leave the gate shut and the new report unfetched. */
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      /*
       * "REPORT REVEALED" WAS NOT TRUE FOR ANYBODY BUT THE LAST PERSON.
       *
       * Showing yours takes effect only when everyone has done the same, so for all but the final
       * person this said something had happened that had not. The response already carries
       * `allActivated`, so it can say which of the two actually occurred.
       */
      if (res?.allActivated) toast.success('Everyone has shown theirs. You can all read them now.')
      else toast.success('Noted. Yours becomes visible when everyone has done the same.')
    },
    onError: () => toast.error('That did not go through. Nothing has changed - try again.'),
  })

  /**
   * THE SESSIONS OF YOUR OWN THAT ARE FINISHED, newest first.
   *
   * "I still don't see the report to open at the end of the chat or where to correct it." The Report
   * tab on the ADMIN page gained this list; the party's own report view - which is what most people
   * on a check-in actually see - did not, so it still showed the shared report's pending state and
   * nothing else. The private report each finished session produced had nowhere to be opened from,
   * and the correction control lives on that card.
   *
   * Yours only, and that is the wall rather than a shortcut: another person's session is theirs
   * until the shared report releases.
   */
  const mySessions = ((ground?.checkIns ?? []) as any[])
    .filter((c) => c.status === 'COMPLETED')
    .filter((c) => ((ground?.participants ?? []) as any[]).some((p) => p.id === c.participantId && p.userId === viewerUserId))
    .sort((a, b) => (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0))

  return (
    <>
          {/*
            * THE BOARD IS THE FIRST DOOR ON THIS VIEW, AS IT IS ON THE LEAD'S.
            *
            * It was inside the branch that only renders once the report is RELEASED and ACTIVATED,
            * so a party who had checked in and was waiting - which is most of the time, and all of
            * the time for a new hire in their first weeks - never saw it at all. Reported as "the
            * new hire person doesn't see the team board", and it is the same finding as "the team
            * board no longer exists" from before, one branch deeper.
            *
            * Gated only on `boardRenders`, the same as the lead's: whether this SITUATION draws a
            * board is a fact about the check-in, and it does not become more or less true because
            * somebody else has not answered yet. The board's own page handles being early.
            */}
          {!!(ground as any).boardRenders && (
            <button
              onClick={() => onOpenBoard()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                background: 'var(--gw-dark)', color: 'white', border: 'none',
                borderRadius: 10, padding: '14px 18px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Open the team board</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>
                  The same picture for everyone, built from the accounts. Never a verdict.
                </span>
              </span>
              <span style={{ fontSize: 13 }}>&rarr;</span>
            </button>
          )}
          {mySessions.length > 0 && (
            <>
              <Sec n={1} title="Your sessions" src="each one has its own private report" />
              <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
                {mySessions.map((ci, i) => (
                  <button
                    key={ci.id}
                    onClick={() => navigate(`/checkin/${ci.id}/report`)}
                    style={{
                      display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                      gap: 10, padding: '11px 13px', background: 'white', border: 'none',
                      borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    <span>
                      <span style={{ fontSize: 13, fontWeight: 700, display: 'block' }}>Session {ci.sessionNumber}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>
                        {ci.completedAt
                          ? `Finished ${new Date(ci.completedAt).toLocaleDateString()} · your private report, and where to correct it`
                          : 'Finished · your private report, and where to correct it'}
                      </span>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--gw-navy)' }}>&rarr;</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <Sec n={mySessions.length > 0 ? 2 : undefined} title="Shared report" />
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
                Each of you shows your own when you are ready. Once everyone has, you can all read them - this cannot be undone.
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 16, background: 'var(--gw-paper-2)', borderRadius: 8, padding: '8px 12px' }}>
                The report shows where accounts agree and where they differ. It does not quote anyone.
              </div>
              <button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                style={{ padding: '11px 28px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: activateMutation.isPending ? 0.6 : 1 }}
              >
                {activateMutation.isPending ? 'Confirming…' : 'Show mine'}
              </button>
            </div>
          ) : (
            <>
              <ReportBody groundId={groundId} embedded reportExists={!!(ground as any)?.report} />
              {/*
                FIVE SECTIONS THAT NEVER RENDERED, REMOVED.

                "What your record reveals", "Assumptions you are carrying", "Where you have
                clarity", and the two "Shared picture" blocks read `report.pattern`,
                `.assumptions`, `.clarity`, `.alignmentReached` and `.areasRequiringAlignment`.

                None of those are on a check-in report. `GET /grounds/:id/report` returns nineteen
                keys and these are not among them - checked against a real released report, not
                inferred from the code. They belong to the ENTRY flow's report shape, which
                `EntryChatPage` reads correctly; this component was reading them off a different
                object, so every one of these conditions has always been false.

                Removed rather than wired: making them appear would be building a feature nobody
                asked for, on a guess about what they were meant to say. If these readings should
                exist on a check-in report, that is a decision and a build, not a tidy-up.
              */}


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
