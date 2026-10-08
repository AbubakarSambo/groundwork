import { useNavigate } from 'react-router-dom'
import { TheSharedPictureAPartyReads } from './the-shared-picture-a-party-reads'
import { howCheckable } from './how-checkable-was-that-session'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

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
  /**
   * The check-in's id.
   *
   * NOTHING IN HERE READS IT, AND IT STAYS ON THE PROPS ANYWAY. It was read once, by the
   * against-what-was-said band that came off this tab. Callers pass it and the two pages that
   * mount this both have it to hand, so removing it from the interface buys nothing and costs the
   * next person who needs an id a change at two call sites.
   */
  groundId: string
  /** The report, or null when there is not one yet. */
  report: any
  /** The check-in, for session progress and whether it has a board. */
  ground: any
  /** Open the team board. A prop, because the route is the page's business and not this view's. */
  onOpenBoard: () => void
  /** Open the weekly report (B4, "This week"), same reasoning as `onOpenBoard`. */
  onOpenWeek: () => void
  /**
   * Per-session specificity, so a row can say how checkable that account was.
   *
   * U.9 THIRD REVIEW, ITEM 6: THE SAME `specificityLevel` THE SESSION'S OWN METER READS, NOT A
   * DIFFERENT NUMBER. Was a raw 0-1 score, banded with its own thresholds in `howCheckable`; that
   * could - and did - disagree with the categorical level `HowSpecificThisSessionWas` reads for
   * the very same session. Now a level string, so both surfaces read one fact.
   */
  specificityBySession?: Record<number, string | null>
  /** Who is reading, so their own finished sessions can be listed and nobody else's. */
  viewerUserId?: string | null
}

export function SharedReportForAParty({
  report,
  ground,
  onOpenBoard,
  onOpenWeek,
  specificityBySession,
  viewerUserId,
}: SharedReportForAPartyProps) {
  const navigate = useNavigate()

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
            AND WHAT SUCCESS LOOKS LIKE IS NOT ON THIS TAB, WHICH REVERSES A DECISION.

            It was put here on the argument that the objective is what the product asks for at
            setup and never shows anybody against. True, and this was still the wrong tab for it.

            Read back on a real check-in with no standard set, the band degrades into the thing
            Hafsah pointed at: a paragraph saying nobody has set the standard so nothing is being
            read against it, then five near-identical sentences from the same person about what
            they think success is. That is the raw material the report is built FROM, printed above
            the report, on the screen whose whole job is to get somebody to the right session.

            It still renders where it has something to say - the board, each session's report, and
            Context, where the standard is actually set. Nothing was lost; it stopped being shown
            somewhere it could only be noise.
          */}

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
                  The same picture for everyone, built from what each person said. Never a verdict.
                </span>
              </span>
              <span style={{ fontSize: 13 }}>&rarr;</span>
            </button>
          )}
          {/* THE WEEKLY REPORT (B4, "This week"), the same door the lead's Report tab offers. */}
          <button
            onClick={() => onOpenWeek()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
              background: 'white', color: 'var(--gw-text)', border: '1px solid var(--gw-border)',
              borderRadius: 10, padding: '14px 16px', marginBottom: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <span>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>This week</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--gw-sub)', marginTop: 2 }}>What kept happening for three check-ins in a row or more</span>
            </span>
            <span aria-hidden style={{ fontSize: 14, color: 'var(--gw-navy)' }}>&rarr;</span>
          </button>
          {/*
            AND THE SESSIONS ARE BACK HERE, WHICH REVERSES WHAT I DID AN HOUR AGO.

            They were on this tab and on My record, byte-for-byte the same rows, so I removed one
            copy - and removed the wrong one. Her call: "your sessions on the report page should go
            to reports." Which is right, and the tab's own name says so: a session's report is a
            report. My record is what you wrote and what it amounts to; Report is what came out of
            it, one row per session, plus the board.

            The duplicate is still gone. This is the list now, and My record links here rather than
            holding its own copy.
          */}
          {/* FOLDED UNDER THE BOARD where a board renders, open where none does yet. Hafsah, 21 Sep 2026: the
              board is the page; each session's report is one click behind a summary. See
              TheReportIsAListOfSessions for the lead's side of the same rule. */}
          {mySessions.length > 0 && (
            <details open={!(ground as any).boardRenders} style={{ marginBottom: 12 }}>
              {/*
                U.9 REVIEW FIX 13: FULL SENTENCES, FOLLOWING THE LEAD'S "EVERY SESSION" PATTERN.
                "Your sessions · 1" and "each one has its own report" were a count and a fragment
                stitched together with a dot. Below, each row read "Session 1" then "Finished 27
                Sept 2026 · specific in places" - a date and a rating of what was said, joined the
                same way. Each is now its own sentence.
              */}
              {/*
                SCREEN FAULT 4: THE TWO HALVES OF THIS ROW READ AS ONE RUN-ON WORD ON A PHONE
                ("Your sessionsYou have one finished session…"). `justify-content: space-between`
                alone puts no floor under the gap when both halves together are wider than the
                row - on a narrow screen they can end up side by side with nothing between them.
                An explicit `gap`, and letting the row wrap rather than force both halves onto one
                line, keeps them apart whatever the width.
              */}
              <summary className="gw-fold-summary" style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--gw-sub)', padding: '6px 2px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '4px 12px' }}>
                <span>Your sessions</span>
                <span style={{ fontSize: 11.5 }}>
                  {mySessions.length === 1 ? 'You have one finished session, with its own report.' : `You have ${mySessions.length} finished sessions, each with its own report.`}
                </span>
              </summary>
              <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden', marginTop: 6 }}>
                {mySessions.map((ci: any, i: number) => {
                  const checkable = howCheckable(specificityBySession?.[ci.sessionNumber])
                  return (
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
                        <span style={{ fontSize: 11.5, color: 'var(--gw-sub)', display: 'block' }}>
                          {ci.completedAt ? `You checked in on ${whenItWas(ci.completedAt, 'day')}.` : 'You checked in.'}
                        </span>
                        {checkable && (
                          <span style={{ fontSize: 11.5, color: 'var(--gw-sub)', display: 'block' }}>{checkable}</span>
                        )}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--gw-navy)' }}>&rarr;</span>
                    </button>
                  )
                })}
              </div>
            </details>
          )}
          {/*
            THE HEADING GOES. The tab is called Report, the row above it opens the board, and the
            only thing under it now is the reveal - which announces itself. A heading naming the tab
            you are on is the page talking about itself.
          */}

          {!report ? (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 4 }}>
                {ground?.sessionProgress
                  ? `Report pending. ${ground.sessionProgress.completed} of ${ground.sessionProgress.total} checked in.`
                  : 'No report yet.'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
                {ground?.sessionProgress?.requestingUserIsMissing
                  ? "You haven't completed this session yet. That's part of what's holding the report."
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
                There is a picture forming, and you have not answered yet
              </div>
              <div style={{ fontSize: 12, color: 'var(--gw-blue-body)', lineHeight: 1.6 }}>
                {(report as any).saying}
              </div>
            </div>
          ) : !report.releasedAt ? (
            /*
              THE FORMING BANNER IS GONE.

              "A picture is forming. Not everyone has checked in yet, so this is not final - but you
              can see what has emerged so far", over two buttons to the board and to My sessions.
              Three sentences and two doors on a tab whose first row is already a door to the board.

              And it said nothing the reader could not already see: My record's coverage bars say
              what the report can and cannot say yet, in one row, on the page that is about exactly
              that. Two screens describing the same half-built report, one of them in prose.
            */
            null
          ) : (
            /*
              THE REVEAL IS GONE FROM HERE TOO.

              A branch on `!report.activated` held "The shared report is ready... Each of you shows
              your own when you are ready... this cannot be undone" over a "Show mine" button. The
              server no longer withholds anything for it to unlock: the gate in reports.service
              get() is removed, because the per-session read handed the same person the same
              content one request later, and the empty payload it returned made the card beneath it
              say "0 areas settled" about a full three-party report.

              "Report updates as people check in, that's all it is."
            */
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
            /*
              AND NOW THE REPORT ITSELF.

              This branch returned null. Once the report released, a person IN it opened their Report
              tab and found a button to the board and a list of their own sessions - no report. Every
              example on the marketing page ends "If you are one of the people in it, this is your
              report too. The same one." It was not true here.

              The lead-only blocks are stripped by the server before this payload is built, and that
              is where they must stay stripped. See the component.
            */
            /* FOLDED WHERE A BOARD RENDERS. Hafsah, 21 Sep 2026: the board is the page and the rest is minimised;
               the picture stays one click away, and open where there is no board to stand in for it. */
            (ground as any).boardRenders ? (
              <details style={{ marginTop: 4 }}>
                <summary className="gw-fold-summary" style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--gw-sub)', padding: '6px 2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>The shared picture</span>
                  <span style={{ fontSize: 11.5 }}>The written report, shared with everyone.</span>
                </summary>
                <div style={{ marginTop: 6 }}><TheSharedPictureAPartyReads report={report} /></div>
              </details>
            ) : (
              <TheSharedPictureAPartyReads report={report} />
            )
          )}
    </>
  )
}
