import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { InferenceReviewPanel } from '@/components/InferenceReviewPanel'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'
import { TheCheckInYouJustFinished } from '@/components/gw/TheCheckInYouJustFinished'
import { TheReportYouSawAtTheEnd } from '@/components/gw/TheReportYouSawAtTheEnd'
import { WhatThisCheckInStillNeeds } from '@/components/gw/WhatThisCheckInStillNeeds'
import { WhatToWorkOnNext } from '@/components/gw/WhatToWorkOnNext'
import { WhatWasTakenFromWhatYouSaid } from '@/components/gw/WhatWasTakenFromWhatYouSaid'
import { WhatToProbeThemOn } from '@/components/gw/WhatToProbeThemOn'
import { UpdatesToTheRecord } from '@/components/gw/UpdatesToTheRecord'
import { HowSpecificThisSessionWas } from '@/components/gw/HowSpecificThisSessionWas'
import { useAuthStore } from '@/stores/auth'
import { peopleLabels } from '@/lib/utils'
import { copy } from '@/components/gw/copying-can-fail'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { whoIsInRound } from '@/lib/who-is-in-this-round'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { TheCheckInHeader } from '@/components/gw/TheCheckInHeader'
import { Page, Button, Panel } from '@/components/gw/ui'

/**
 * U.9 RE-REVIEW: "WHAT YOU SHARED:" IS A LABEL BOLTED ONTO A SENTENCE WITH A COLON.
 *
 * The private closing summary the engine writes is instructed to open with the exact phrase "What
 * you shared:" (conversation.service.ts) - so Amani's own report read "What you shared: You are
 * aiming for…". That is the engine's own prompt, out of this workspace's reach
 * (api/src/modules/conversation/), and is asked for as engine request 60. Until it lands, this
 * screen turns the stored opening into a sentence of its own before drawing it, rather than pass
 * the colon join straight through to a reader.
 */
export function withoutTheColonOpening(summary: string): string {
  return summary.replace(/^What you shared:\s*/, 'Here is what you shared. ')
}

/**
 * THE REPORT ONE SESSION ENDED ON, OPENED AGAIN.
 *
 * Reported four times: "I want the exact same forming report to be openable or seen. I have not
 * seen it anywhere - when I click, it sends me back to the chat and the report looks nothing like
 * what I got at the end."
 *
 * Clicking a finished session went to `/checkin/:id`, which is the CHAT: the whole transcript,
 * with a different, shorter summary underneath it. So the click landed her in the conversation she
 * had already had, and the thing below it was a genuinely different object. This route opens the
 * report itself, on its own page, rendered by the same component the end of the session renders.
 *
 * Read-only on purpose. Correcting it is a session of its own - it asks you questions and changes
 * the record - so it starts a check-in rather than editing a page.
 *
 * GROUP 3, PIECE 2: REBUILT FROM THE SHARED PARTS. The page's own chrome (the wrap, the two report
 * panels, the correction box and "What now?") now draws from `components/gw/ui` - `Page` for the
 * frame, `Panel` for the two report cards, `Button` for every real action - with no inline
 * fontSize/color/margin/padding/border, and the buttons reduced to the one true primary action of
 * this page, "Start a new check-in". `TheCheckInHeader` and every component this page hands the
 * report to (`TheSessionsReport`, `TheCheckInYouJustFinished`, `WhatToWorkOnNext` and the rest) are
 * unchanged - none of them uses an old kit part, so none of them needed to move.
 */
export default function SessionReportPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const viewerUserId = useAuthStore(st => st.user?.id)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['session-report', checkInId],
    queryFn: () => conversationApi.sessionReport(checkInId!),
    enabled: !!checkInId,
  })

  /* The per-session shape, for the one fact the correction control needs: whether the window is
     still open. The same query key the shared report below uses, so it is one request either way. */
  const { data: shape } = useQuery({
    queryKey: ['session-shaped-report', data?.groundId, data?.sessionNumber],
    queryFn: () => reportsApi.sessionReport(data!.groundId as string, data!.sessionNumber as number),
    enabled: !!data?.groundId && !!data?.sessionNumber,
  })

  /**
   * THE CLAIMS NOBODY ACTUALLY SAID, AND THE ONLY PLACE TO CHALLENGE THEM.
   *
   * `InferenceReviewPanel` was rendered from exactly one line, inside the shared report body that
   * has now gone. It is the mechanism behind the underlining - "worked out from what people wrote,
   * not stated by anyone" - and the only way a person can dispute a claim the product INFERRED
   * rather than heard. Deleting the block without moving it would have left the underline on the
   * page with nothing behind it.
   *
   * Here, because this is already the page with the correction control on it: everything about
   * putting the record right is now in one place, rather than split between a shared document and
   * a private one.
   */
  /*
    THE CHECK-IN ITSELF, FOR THE TWO SETUP ANSWERS THE END OF A SESSION IS THE RIGHT MOMENT TO ASK.
    See WhatThisCheckInStillNeeds. `cadenceChosen` is false when FORTNIGHTLY is a default nobody
    picked, which the ground payload could not say until now.
  */
  const { data: ground } = useQuery({
    queryKey: ['ground', data?.groundId],
    queryFn: () => groundsApi.get(data!.groundId as string),
    enabled: !!data?.groundId,
    retry: false,
  })

  /* Only the person who runs the check-in is offered these: a party cannot change either, and
     telling somebody about a setting they have no access to is worse than not mentioning it. */
  const amTheInitiator = ((ground as any)?.participants ?? []).some(
    (p: any) => p.userId === viewerUserId && p.partyType === 'INITIATOR',
  )

  const setCadence = useMutation({
    mutationFn: (cadence: string) => groundsApi.update(data!.groundId as string, { cadence } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', data?.groundId] })
      toast.success('Saved. That is how often this runs now.')
    },
    onError: () => toast.error('That did not save. Nothing has changed - try again.'),
  })

  const { data: groundReport } = useQuery({
    queryKey: ['report', data?.groundId],
    queryFn: () => reportsApi.get(data!.groundId as string),
    enabled: !!data?.groundId,
    retry: false,
  })

  /**
   * CORRECTING IT, from the page that shows it.
   *
   * The control was only ever on the shared-report card, which is a different report; the one a
   * person actually wants to correct is the one they just read. Nothing is overwritten - the
   * correction is its own session and shows alongside.
   */
  const correct = useMutation({
    mutationFn: () => reportsApi.startSelfCorrection(data!.groundId as string, data!.sessionNumber as number),
    onSuccess: (res: any) => navigate(`/checkin/${res.checkInId}`),
    onError: () => toast.error('That did not start. Nothing has changed - try again.'),
  })

  /**
   * "THIS RECORD IS YOURS. IT IS PORTABLE AND PERMANENT" - WHICH USED TO BE SAID WITH NO WAY TO
   * TAKE IT ANYWHERE.
   *
   * Moved from the dead Report tab body (ReportBody), which looped over every one of a person's
   * completed sessions and offered a download button for each. This page already IS one of those
   * sessions, so there is exactly one button to offer rather than a list.
   */
  const downloadRecord = useMutation({
    mutationFn: () => conversationApi.download(checkInId!),
    onSuccess: () => toast.success('Your record is downloading.'),
    onError: () => toast.error('Could not download that record. Please try again.'),
  })

  const plannedSessions = ground ? plannedSessionsFor((ground as any).timelineDays, (ground as any).cadence, (ground as any).plannedSessions) : null

  /**
   * A PARTICIPANT ID, SAID AS A NAME, THE WAY THIS READER MAY READ IT.
   *
   * `peopleLabels` is the one function that decides this correctly for a given reader (a real name
   * for the lead, plain words such as "another colleague" for anybody else) - built once here so
   * every section of this page that names a participant (the updates trail, the lead-only probe
   * surface) reads the same person the same way.
   */
  const myParticipant = ((ground as any)?.participants ?? []).find((p: any) => p.userId === viewerUserId)
  const nameFor = (participantId: string): string => {
    const labels = peopleLabels((ground as any)?.participants ?? [], {
      forTheLead: amTheInitiator, readerId: myParticipant?.id ?? null, readerIsInIt: !!myParticipant,
    })
    return labels.get(participantId) ?? 'a colleague'
  }

  return (
    <Page>
      {/*
        U.10 PICTURE-CHECK ROUND 6, ITEM I: THE SHARED HEADER, ONCE THE PAGE HAS SOMETHING TO
        SHOW. Matching U.9 RE-REVIEW ITEM A just below (neither the old heading nor this one is
        drawn on a page that refused you): the header needs `data.groundId`, which only exists
        once the session report itself has loaded, so it is gated the same way. Loading and error
        states keep the plain "Back" link they already had. This is always the viewer's own report
        (the server refuses anyone else's), so `isAParty` is always true here.
      */}
      {!isLoading && !isError && data?.groundId ? (
        <TheCheckInHeader
          id={data.groundId as string}
          title={(ground as any)?.label ?? 'Check-in'}
          cadence={(ground as any)?.cadence ?? null}
          plannedSessions={plannedSessions}
          canRunThisCheckIn={amTheInitiator}
          isAParty
          active="report"
          tabs={[
            { key: 'board', label: 'Board', to: `/grounds/${data.groundId}/board` },
            { key: 'chat', label: 'Check-in', to: `/grounds/${data.groundId}` },
            { key: 'context', label: 'Context and resources', to: `/grounds/${data.groundId}?tab=context` },
            { key: amTheInitiator ? 'sessions' : 'record', label: 'My work', to: `/grounds/${data.groundId}?tab=${amTheInitiator ? 'sessions' : 'record'}` },
            { key: 'settings', label: 'People and setup', to: `/grounds/${data.groundId}?tab=settings` },
            { key: 'report', label: 'Report', to: `/grounds/${data.groundId}?tab=report` },
          ]}
        />
      ) : (
        <button type="button" onClick={() => navigate(-1)} className="gwui-plain-link gwui-fs-13-5">
          Back
        </button>
      )}

      {/*
        U.9 RE-REVIEW, ITEM A: NEITHER LINE APPEARS ON A PAGE THAT HAS REFUSED YOU.
        "Your session" and "Everything about this session... Your report first, then the team's
        report." were said unconditionally, above the error message, so somebody told "This
        session is not yours to open" read a heading and a promise about a report they were just
        refused. Both are now only drawn once the page actually has something to show.
      */}
      {!isError && (
        <div className="gwui-mt-20">
          <div className="gwui-fs-20 gwui-ink-text gwui-mb-2" style={{ fontWeight: 800 }}>
            {data?.sessionNumber ? `Session ${data.sessionNumber}` : 'Your session'}
          </div>
          {/*
            THE PAGE HAS TWO REPORTS ON IT AND THIS LINE DESCRIBED ONE OF THEM.
            "Nobody else can see it" is true of your own half and false of the shared half directly
            below it, so read as the page's subtitle it was a privacy claim over a shared document. It
            says what the page holds; each half now carries its own line about who reads it.
          */}
          <div className="gwui-fs-13 gwui-ink-sub gwui-mb-18">
            {data?.finishedAt
              ? `Everything about this session, on ${whenItWas(data.finishedAt, 'dayAndMonthLong')}. Your report first, then the team’s report.`
              : 'Everything about this session. Your report first, then the team’s report.'}
          </div>
        </div>
      )}

      {isLoading && (
        <div role="status" aria-live="polite" className="gwui-fs-13 gwui-ink-muted">Getting your report...</div>
      )}

      {isError && (
        <Panel>
          {/*
            "WHY SHOULD ME THAT WE COULDN'T OPEN A REPORT AND IT MAY BELONG TO SOMEONE ELSE."
            Fair. The old line guessed at the cause and picked the one that accuses the reader of
            opening somebody else's record - on a page reached by clicking their own session. The
            status says which of the three things actually happened, so it can say the true one,
            and the fallback offers the retry rather than a theory.
          */}
          {/* Three things, three sentences: 404 is "no longer here", only 403 accuses, everything else offers the retry. */}
          <div className="gwui-fs-13-5 gwui-ink-text gwui-mb-5" style={{ fontWeight: 700 }}>
            {(error as any)?.response?.status === 403
              ? 'This session is not yours to open'
              : (error as any)?.response?.status === 404
                ? 'This session is no longer here'
                : 'This did not load'}
          </div>
          <div className="gwui-fs-13 gwui-ink-sub" style={{ lineHeight: 1.6 }}>
            {(error as any)?.response?.status === 403
              ? 'A session report is only ever readable by the person who wrote it.'
              : (error as any)?.response?.status === 404
                ? 'The link may be out of date. Your check-ins page lists the sessions that are.'
                : 'Nothing is wrong with the report - the request did not get through. Try again.'}
          </div>
          {(error as any)?.response?.status === 404 && (
            <div className="gwui-mt-12">
              <a href="/grounds" className="gwui-plain-link">Back to check-ins</a>
            </div>
          )}
          {!((error as any)?.response?.status === 403 || (error as any)?.response?.status === 404) && (
            <div className="gwui-mt-12">
              <Button kind="secondary" onClick={() => refetch()}>Try again</Button>
            </div>
          )}
        </Panel>
      )}

      {/*
        A SESSION RUN WHILE SIGNED IN SAW A DIFFERENT REPORT, and this page owes it the same
        promise. Only the entry flow builds the full report above; a session inside the app ends
        on `SessionReportCard`, under the transcript. So when there is no kept report, this shows
        the card - which is what that person actually read - rather than an apology.
      */}
      {/*
        THE PRIVATE HALF, ON ITS OWN SURFACE.

        The two halves of this page are the product's whole proposition and they looked identical:
        two headings in one column, same background, same card weight, so nothing said where one
        ended and the other began. This half sits inset and tinted, says once at the top that it is
        yours, and never repeats it per card.
      */}
      {!isLoading && !isError && (
        <section className="gwui-rule gwui-pt-18 gwui-pb-18 gwui-pl-20 gwui-pr-20 gwui-mb-34" style={{ background: 'var(--gw-paper-2)', borderRadius: 14 }}>
          <div className="gwui-sentence-row">
            {/* U.9: the prototype's words for this report, "Your report" and "Only you" (own-report.txt). */}
            <h2 className="gwui-fs-15 gwui-m-0" style={{ fontWeight: 800 }}>Your report</h2>
            <span className="gwui-fs-13 gwui-ink-sub" style={{ flexShrink: 0 }}>Only you</span>
          </div>
          <div className="gwui-fs-13 gwui-ink-sub gwui-mt-2 gwui-mb-16" style={{ lineHeight: 1.55, maxWidth: '68ch' }}>
            What you said this session, and what to do with it.
          </div>

          {/* Simple and visual, and only on this half. See the component's own note for why. */}
          <HowSpecificThisSessionWas level={shape?.howClearThisWas?.level} />

          {/*
            THE TOP HALF WAS A SECOND COPY OF THE BOTTOM HALF.

            `SessionReportCard` draws whatever state the ground's report is in, and once a round closes
            that state is the cross reference. So on this page, under a band saying "My report", a
            participant read "WHERE THIS STANDS, ACROSS EVERYONE" and a summary of all three people -
            and then read the same thing again forty lines down under "The shared report". "I have no
            fucking clue what is happening" is the correct response to that page.

            The card is right where it is used at the end of a session, which is a screen with only one
            report on it. Here there are two, so the private half draws the one private thing this
            session produced: the solo record, written for this person alone when their own check-in
            completed. Never the cross reference, which is what the half below is for.
          */}
          {/* A heading and a promise above an empty tinted box read as the product having lost the answers. Say the true thing. */}
          {!isLoading && !isError && !data?.report && !(groundReport as any)?.soloArtifact && (
            <div role="status" className="gwui-rule gwui-pt-14 gwui-pb-14 gwui-pl-16 gwui-pr-16 gwui-mb-16 gwui-fs-13 gwui-ink-sub" style={{ borderRadius: 10, lineHeight: 1.6 }}>
              Your report is still being written. Your answers are saved; this fills in as soon as it is ready.
            </div>
          )}
          {!isLoading && !isError && !data?.report && (groundReport as any)?.soloArtifact && (
            <div className="gwui-rule gwui-pt-14 gwui-pb-14 gwui-pl-16 gwui-pr-16 gwui-mb-16" style={{ borderRadius: 10, background: 'var(--gw-paper)' }}>
              <div className="gwui-fs-13 gwui-ink-text" style={{ lineHeight: 1.65 }}>
                {withoutTheColonOpening((groundReport as any).soloArtifact.summary ?? '')}
              </div>
              {(groundReport as any).soloArtifact.whatToCarry && (
                <div className="gwui-rule-top gwui-fs-13 gwui-ink-sub gwui-mt-8 gwui-pt-8" style={{ lineHeight: 1.6 }}>
                  {/* U.9 THIRD REVIEW, ITEM 4: "WHAT TO CARRY INTO THE NEXT ONE" IS A HEADING, NOT AN
                      INSTRUCTION TO THE READER. It described the section rather than telling them what
                      to do with it, which the prototype's own wording does instead. */}
                  <b className="gwui-ink-text">Carry this into your next check-in. </b>
                  {(groundReport as any).soloArtifact.whatToCarry}
                </div>
              )}
            </div>
          )}

          {data?.report
            ? (
              /*
               * A STORED REPORT IS SHOWN AS IT WAS READ, and that rule outranks the template.
               * "I want the exact same forming report to be openable or seen." Only the entry chat
               * stores one, and that object IS the thing the person read - ten of four hundred and
               * ninety-five sittings have it. Re-rendering it in the new shape would be a different
               * page about the same facts, which is the complaint this rule came from.
               */
              <TheReportYouSawAtTheEnd
                report={data.report!}
                stands={shape?.whereThingsStand ? { settled: shape.whereThingsStand.settled ?? [], open: shape.whereThingsStand.open ?? [] } : null}
                hideCompleteness={!!shape?.howClearThisWas?.level}
                onRecordLine="Built from what you said today."
              />
            )
            : (
              /*
               * AND EVERYTHING ELSE GETS THE TEMPLATE, which is what this surface was always meant
               * to be. The preview page carried the note for months: "not rebuilt yet, and the
               * surface with the real problem under it - one cell, two shapes, two fetches,
               * depending on which door you came through." Eight surfaces were rebuilt and this one
               * was left, then the page that said so was deleted.
               * Nothing was stored for these sittings, so there is no exact thing to be faithful
               * to - only rows to draw, which is what the rebuilt one does, and it brings the
               * coaching note, what you carry and the way to correct the record with it.
               */
              <TheCheckInYouJustFinished
                checkInId={checkInId!}
                groundId={data!.groundId as string}
                sessionNumber={data!.sessionNumber as number}
              />
            )}

          {data?.report && (
            <>
              {/*
                THE COACHING NOTE, ON THE HALF OF THE PAGE THAT IS ACTUALLY YOURS.

                "My report can have a coaching note." It already exists and is already paid for:
                `postReportGuide` is three lines written for one person at each release - a way to
                open, a question worth carrying, and something the other side said worth taking
                seriously - sanitised so it can never name or quote anybody. It was rendered on My
                record and on the shared report page and not here, which is the page somebody lands on
                straight after finishing.

                It goes above the record rather than below it, because it is the part you act on and
                the record is the part you refer back to.
              */}
              {/*
                AND WHAT THIS CHECK-IN STILL NEEDS, drawn by the page rather than handed to the report.
                It was a prop on the old component, so a straight swap would have dropped it - the
                cadence, the start date, the length and the standard, for the lead, on the page they
                land on straight after finishing.
              */}
              {(() => {
                  /*
                   * THE GATE WAS THE CADENCE, AND THE CADENCE IS ALWAYS SET.
                   *
                   * "Meeting cadence at the end of the report does not show up and does not have start
                   * dates." The whole block was gated on `cadenceChosen === false`, and the opening
                   * conversation picks a rhythm, so on any check-in born through the door this never
                   * rendered once - including the two answers it never asked about at all.
                   *
                   * The gate is now whether ANYTHING about how this runs is unset. The component still
                   * disappears when nothing is, which was always the rule; it just asks the whole
                   * question now.
                   */
                  (ground as any) && amTheInitiator ? (
                    <WhatThisCheckInStillNeeds
                      cadenceUnset={(ground as any).cadenceChosen === false}
                      cadence={(ground as any).cadence ?? 'FORTNIGHTLY'}
                      onPickCadence={(c) => setCadence.mutate(c)}
                      startDateUnset={(ground as any).startDateChosen === false}
                      timelineUnset={(ground as any).timelineChosen === false}
                      timelineDays={(ground as any).timelineDays ?? null}
                      briefStandard={(shape as any)?.briefStandard ?? null}
                      alreadyStarted
                      nextOpens={(() => {
                        const mine = ((ground as any).participants ?? []).find((p: any) => p.userId === viewerUserId)
                        const next = (((mine as any)?.checkIns ?? []) as any[]).filter((c) => c.status !== 'COMPLETED' && c.availableFrom && new Date(c.availableFrom).getTime() > Date.now()).sort((a, b) => new Date(a.availableFrom).getTime() - new Date(b.availableFrom).getTime())[0]
                        return next?.availableFrom ?? null
                      })()}
                      saidDate={(shape as any)?.myTimeframe ?? null}
                      /* The board already says the standard is unset and links to Setup; what was
                         missing was any route to Setup from here at all. */
                      standardUnset={((ground as any).objectives ?? []).length === 0}
                      onGoToSetup={() => navigate(`/grounds/${data.groundId}?tab=settings`)}
                    />
                  ) : null
              })()}

              {/*
                THE CORRECTION CONTROL SAYS WHETHER IT IS STILL OPEN, BEFORE IT IS PRESSED.

                "It seems you can still correct a report when it's final." The server refuses it now -
                a released report stays correctable for a short window and then stops - and a button
                that offers something the server will refuse teaches a person the product is
                unreliable. So the same fact arrives here, where they can act on it: what the window
                was, when it closed, and where what they wanted to say can still go.

                `shape` carries it because the report is what the window is about.
              */}
              <div className="gwui-rule gwui-pt-13 gwui-pb-13 gwui-pl-15 gwui-pr-15 gwui-mt-6" style={{ borderRadius: 10 }}>
                <div className="gwui-fs-13 gwui-ink-text gwui-mb-3" style={{ fontWeight: 700 }}>Something here isn’t right</div>
                {/* The inferred claims themselves, each with its own "Correct this". */}
                {Array.isArray((groundReport as any)?.inferences) && (groundReport as any).inferences.length > 0 && (
                  <div className="gwui-mb-14">
                    <InferenceReviewPanel groundId={data!.groundId as string} inferences={(groundReport as any).inferences} />
                  </div>
                )}
                {shape && shape.correctable === false ? (
                  <div className="gwui-fs-13 gwui-ink-sub" style={{ lineHeight: 1.6 }}>
                    {shape.whyNotCorrectable}
                  </div>
                ) : (
                  <>
                    <div className="gwui-fs-13 gwui-ink-sub gwui-mb-10" style={{ lineHeight: 1.6 }}>
                      Correcting it is a short check-in of its own. It asks you what it got wrong. Nothing
                      is overwritten; the change is shown alongside the original, and it closes a short
                      while after the shared report goes out.
                    </div>
                    <Button kind="secondary" onClick={() => correct.mutate()} disabled={correct.isPending || !data.groundId || !data.sessionNumber}>
                      <span role="status">{correct.isPending ? 'Starting...' : 'Correct it'}</span>
                    </Button>
                  </>
                )}
              </div>
              <div className="gwui-mt-10">
                <button type="button" onClick={() => navigate(`/checkin/${checkInId}`)} className="gwui-plain-link gwui-fs-13">
                  Read the conversation this came from
                </button>
              </div>
            </>
          )}

          {/*
            "THIS RECORD IS YOURS. IT IS PORTABLE AND PERMANENT" - offered wherever that is true,
            which is once the session is finished, not only when a stored report happens to exist
            (the branch above). A session run while signed in has no stored `data.report` but is
            just as much a finished session whose record is yours to take away.
          */}
          {data?.finishedAt && (
            <div className="gwui-mt-10">
              <div className="gwui-fs-13 gwui-ink-sub gwui-mb-6" style={{ lineHeight: 1.55 }}>
                This record is yours. It is portable and permanent.
              </div>
              <button
                type="button"
                disabled={downloadRecord.isPending}
                onClick={() => downloadRecord.mutate()}
                className="gwui-plain-link gwui-fs-13"
                aria-label={`Download your session ${data.sessionNumber} record`}
              >
                {downloadRecord.isPending ? 'Downloading…' : 'Download your record'}
              </button>
            </div>
          )}

          {/* Your own rows, before the coaching that is built from them. */}
          {data?.groundId && data?.sessionNumber && (
            <WhatWasTakenFromWhatYouSaid rows={(groundReport as any)?.myRows} groundId={data.groundId} sessionNumber={data.sessionNumber} />
          )}
          {/*
            5. THE COACHING BOX, LAST IN THE PRIVATE HALF.

            The final thing the member reads before the shared half begins, and the one place on
            the page speaking to them rather than about the work. Its own treatment so it does not
            read as another summary card, inside the private surface so its privacy is not in
            question. See WhatToWorkOnNext.
          */}
          <WhatToWorkOnNext
            note={(groundReport as any)?.coaching}
            guide={(groundReport as any)?.postReportGuide}
          />
        </section>
      )}

      {/*
        AND THIS SESSION'S SHARED REPORT, UNDER YOUR OWN.
        Two reports, one session, and they answer different questions: the one above is what you
        said and what it meant, and it does not change. This one is what the accounts together
        show for this session - forming while people are still answering, final once the round
        closed. They belong on one page because that is how a person reads them: mine, then ours.
      */}
      {/*
        THE SHARED HALF IN A BOX OF ITS OWN, LIKE THE PRIVATE ONE.
        Your own report sat on an inset surface and the shared report sat on the bare page, so one
        read as a thing and the other as leftovers under it. Two boxes, two headers, same grammar.
      */}
      {data?.groundId && data?.sessionNumber && (
        <Panel as="section">
          <div className="gwui-sentence-row">
            {/* U.9: "The team’s report", the prototype's name for it (own-report.txt, team-report.txt). */}
            <h2 className="gwui-fs-15 gwui-m-0" style={{ fontWeight: 800 }}>The team’s report</h2>
          </div>
          {/*
            "IT NEVER QUOTES ANYONE" SAT DIRECTLY ABOVE VERBATIM SENTENCES FROM THREE PEOPLE.
            The section below is right and the line was wrong. What the product actually protects,
            and has said carefully for a long time in what-happens-to-what-you-write.ts, is the
            other half: your own words about your own work can appear here, what you said about
            somebody else never does.
          */}
          {/*
            U.9 REVIEW FIX 8: "IT UPDATES AS PEOPLE CHECK IN" IS NOT TRUE ONCE IT HAS CLOSED.
            A released report reads "Closed 27 Sept 2026. This does not change." further down, on
            TheSessionsReport itself - so this line, above it on the same page, was claiming the
            opposite about the same report. It now says the same true thing `shape` already knows,
            in a sentence, with the date through the one shared formatter every other page uses.
          */}
          <div className="gwui-fs-13 gwui-ink-sub gwui-mb-14" style={{ lineHeight: 1.55 }}>
            {shape?.state === 'final'
              ? `Closed${shape.takenAt ? ` ${whenItWas(shape.takenAt, 'day')}` : ''}. This does not change. What each person said about their own work can appear here. What anyone said about somebody else never does.`
              : 'Everybody’s side of this session, together, and it updates as people check in. What each person said about their own work can appear here. What anyone said about somebody else never does.'}
          </div>
          <TheSessionsReport
            groundId={data.groundId}
            sessionNumber={data.sessionNumber}
            totalInThisRound={ground ? whoIsInRound(((ground as any).participants ?? []), data.sessionNumber, (ground as any).scenario).length : null}
          />
          {/* A self-correction shows up as a flagged, dated entry rather than being blended in
              silently. Visible to everyone who reads this report, same as the report itself. */}
          <UpdatesToTheRecord updates={(groundReport as any)?.updates} nameFor={nameFor} />
        </Panel>
      )}
      {/*
        AND THE LEAD'S OWN SECTION, AFTER THE SHARED REPORT.

        Nobody else can see this. The server returns null for anybody who is not the lead or an org
        admin, before it reads a row, so there is nothing here to gate on the client - which is the
        point: a lead-only surface guarded by a caller remembering to check is one refactor away
        from not being lead-only.
      */}
      <WhatToProbeThemOn
        reads={(groundReport as any)?.probes}
        weigh={(groundReport as any)?.whatTheGroundCanTellYou}
        weighNote={(groundReport as any)?.whatTheGroundCanTellYouNote}
        restedOn={(groundReport as any)?.whatItRestedOn}
        startedAt={(groundReport as any)?.whereThisStarted}
        softSpots={(groundReport as any)?.softSpots}
        arcAdvisories={(groundReport as any)?.arcAdvisories}
        nameFor={nameFor}
      />

      {/*
        15. ACTION, AFTER BOTH HALVES.

        It led with "Copy the link to this session", which then needed a caveat explaining that the
        link is not a way to share - a primary control whose own label had to be walked back. And
        it sat directly under the conversation worth having, offering nothing that served it.

        The primary action is the question. Opening a follow-up is how that conversation gets a
        time and a place in this product, so that is the button. The link stays, quieter.
      */}
      {/*
        U.9 REVIEW: "WHAT NOW?" WAS OFFERED ON THE PAGE THAT SAYS THIS ISN'T YOURS TO OPEN.
        This whole block sat outside the `!isLoading && !isError` guard the rest of the page uses,
        so somebody who reached this page for a session that refused them (403, 404, or any other
        failure) still read "Start a new check-in" and "Copy the link" under the error message.
        There is nothing here for a page that has nothing to show.
      */}
      {!isLoading && !isError && (
        <div className="gw-print-none gwui-rule-top gwui-mt-30 gwui-pt-18">
          <div className="gwui-fs-13-5 gwui-ink-text gwui-mb-3" style={{ fontWeight: 700 }}>What now?</div>
          <div className="gwui-fs-13 gwui-ink-sub gwui-mb-11" style={{ lineHeight: 1.6, maxWidth: '68ch' }}>
            Pick the open thing that matters most and agree who owns it. Nobody can do that part for
            you, and a follow-up is where it gets a date.
          </div>
          <div className="gwui-sentence-row" style={{ justifyContent: 'flex-start' }}>
            <Button onClick={() => navigate('/grounds/new')}>Start a new check-in</Button>
            <button
              type="button"
              onClick={async () => {
                /* The .catch below used to be unreachable: `clipboard?.writeText(...)` is undefined where the API is absent, and `.then` on undefined throws. */
                if (await copy(`${window.location.origin}/checkin/${checkInId}/report`)) toast.success('Link copied')
                else toast.error('Could not copy it. Select the address bar instead.')
              }}
              className="gwui-plain-link gwui-fs-13"
            >
              Copy the link
            </button>
          </div>
          <div className="gwui-fs-13 gwui-ink-muted gwui-mt-9" style={{ lineHeight: 1.6 }}>
            The link opens only for people already entitled to read this.
          </div>
        </div>
      )}
    </Page>
  )
}
