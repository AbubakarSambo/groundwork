import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sec } from './kit'
import { reportsApi } from '@/api/reports'

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
  /** Where the session list lives now. The page owns tab names, so it is handed a callback. */
  onGoToMyRecord: () => void
  /** Who is reading, so their own finished sessions can be listed and nobody else's. */
  viewerUserId?: string | null
}

export function SharedReportForAParty({
  groundId,
  report,
  ground,
  onOpenBoard,
  onGoToMyRecord,
  viewerUserId,
}: SharedReportForAPartyProps) {
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
          {/*
            THE SESSION LIST IS ON MY RECORD, AND WAS ON BOTH.

            This block was byte-for-byte the block in `MyPrivateReport` - the same rows, the same
            `navigate('/checkin/:id/report')` - so a person with three finished sessions had two
            identical lists two tabs apart and no way to tell whether one held something the other
            did not. Asked about it: "the participant seems to be looking at too many reports".

            My record's copy is the one that stays. It is where a quoted decision put it - "I need
            my own report to be the same report on my record" - and it says something this one did
            not: how checkable each account was, on the session it is about. Deleting the richer of
            two identical lists to keep the plainer one would have been the wrong way round.
          */}
          {mySessions.length > 0 && (
            <button
              onClick={() => onGoToMyRecord()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10,
                padding: '12px 14px', marginBottom: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Your sessions</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 2 }}>
                  {mySessions.length} finished. Each one has its own report, on My record.
                </span>
              </span>
              <span style={{ fontSize: 13, color: 'var(--gw-navy)' }}>&rarr;</span>
            </button>
          )}
          {/*
            THE SHARED REPORT IS THE BOARD NOW.

            This section used to embed the whole report body underneath a heading and a line saying
            "shows where your account and the other party's account agree or differ". Every part of
            that body now has a home that is not a second copy:

              what is still open, with each account and what is at stake   the board
              the read across everybody's accounts                          the session page
              the question it turns on                                      the board, and the session page
              where things stand, who has checked in                        the session page, and the board
              the private lines for the conversation ahead                  My record
              the inferred claims, each with "Correct this"                 the session page
              how it is put together                                        the foot of the board

            None of it was deleted. What went is the fourth place to read the same three findings,
            which is what "the participant seems to be looking at too many reports" was.

            WHAT STAYS HERE is the part that is not a reading surface at all: the reveal. Showing
            yours is an act with a consequence that cannot be undone, and it belongs on the tab a
            person opens expecting the report, not buried on a page about one session.
          */}
          {(!report || (report as any).withheldUntilYouAnswer || !report.releasedAt || !report.activated) && (
            <Sec title="Shared report" />
          )}

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
          ) : (report as any).withheldUntilYouAnswer ? (
            /*
              WAITING ON YOUR OWN ACCOUNT, NOT ON SOMEBODY ELSE'S.

              Walked as a real participant: Zainab, invited and not yet checked in, opened this tab
              and read a summary of her manager's account of her before writing a word. The server
              withholds it now; this says why, and it is a fact about the method rather than a
              refusal - reading somebody else's account first makes yours an answer to theirs.
            */
            <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>
                A picture is forming, and you have not given your account yet
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-blue-body)', lineHeight: 1.6 }}>
                {(report as any).saying}
              </div>
            </div>
          ) : !report.releasedAt ? (
            <>
              <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>
                  {(report as any)?.forming ? 'A picture is forming' : 'Report is being prepared'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-blue-body)', lineHeight: 1.6, marginBottom: 0 }}>
                  {(report as any)?.forming
                    ? 'Not everyone has checked in yet, so this is not final - but you can see what has emerged so far. It never fabricates agreement, only what is actually known.'
                    : 'Your report will be available once it is released.'}
                </div>
                {/*
                  AND A WAY IN, WHICH IS THE WHOLE POINT OF SAYING IT IS FORMING.

                  This message used to be followed by the report body embedded underneath. With the
                  body gone the message would have been a dead end again - "a picture is forming"
                  and nothing to open - which is the exact regression
                  `GroundParticipantPage.formingReport.spec` was written for, and it caught it.

                  Both destinations hold forming content: the board is generated from the check-in
                  and regenerates as people answer, and each session page shows that round's picture
                  while it is still moving. The board is offered only where the scenario has one -
                  a private alignment check-in renders none - so the second button is always there.
                */}
                {(report as any)?.forming && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 }}>
                    {!!(ground as any).boardRenders && (
                      <button
                        onClick={() => onOpenBoard()}
                        style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        See what has emerged so far
                      </button>
                    )}
                    <button
                      onClick={() => onGoToMyRecord()}
                      style={{ padding: '8px 14px', borderRadius: 8, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      My sessions
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : !report.activated ? (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>The shared report is ready</div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 8 }}>
                Each of you shows your own when you are ready. Once everyone has, you can all read them - this cannot be undone.
              </div>
              {/*
                AND WHO IT IS WAITING ON.

                The mechanism was explained and nobody was named, so two people sit either side of
                this button each believing the other has stalled. Seen on a real check-in: report
                released, both parties emailed, neither had pressed it, and nothing on the screen
                said who the other person was or that they had been sent the same thing.
              */}
              {((report as any).waitingToShow ?? []).length > 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 8 }}>
                  Waiting on {((report as any).waitingToShow as string[]).join(' and ')}
                  {(report as any).everyoneWasTold ? ' - they have been told it is ready too.' : '.'}
                </div>
              )}
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
            /*
              ONCE EVERYONE HAS SHOWN THEIRS, THIS SECTION HAS NOTHING TO DO.

              An hour ago it held three sentences saying where the report had gone - "Where the
              accounts agree and where they differ... is on the team board. Your own account of each
              session... on My record" - over two buttons to those places. Read back: "remove". Fair.
              It was a paragraph of directions standing where a document used to be, and the tab
              already has a door to the board and a door to My record at the top of it. Saying it
              again in prose is a third and fourth door to two rooms.

              So the section renders nothing here, and the heading above renders only when there IS
              something. What is left on the tab is the board, your sessions, and - before everyone
              has shown theirs - the one thing that is an act rather than a reading: the reveal.
            */
            null
          )}
    </>
  )
}
