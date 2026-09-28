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
import { HowSpecificThisSessionWas } from '@/components/gw/HowSpecificThisSessionWas'
import { useAuthStore } from '@/stores/auth'
import { copy } from '@/components/gw/copying-can-fail'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { whoIsInRound } from '@/lib/who-is-in-this-round'

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

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}
      >
        &larr; Back
      </button>

      {/*
        U.9 RE-REVIEW, ITEM A: NEITHER LINE APPEARS ON A PAGE THAT HAS REFUSED YOU.
        "Your session" and "Everything about this session... Your report first, then the team's
        report." were said unconditionally, above the error message, so somebody told "This
        session is not yours to open" read a heading and a promise about a report they were just
        refused. Both are now only drawn once the page actually has something to show.
      */}
      {!isError && (
        <>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>
            {data?.sessionNumber ? `Session ${data.sessionNumber}` : 'Your session'}
          </div>
          {/*
            THE PAGE HAS TWO REPORTS ON IT AND THIS LINE DESCRIBED ONE OF THEM.
            "Nobody else can see it" is true of your own half and false of the shared half directly
            below it, so read as the page's subtitle it was a privacy claim over a shared document. It
            says what the page holds; each half now carries its own line about who reads it.
          */}
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 18 }}>
            {data?.finishedAt
              ? `Everything about this session, on ${whenItWas(data.finishedAt, 'dayAndMonthLong')}. Your report first, then the team’s report.`
              : 'Everything about this session. Your report first, then the team’s report.'}
          </div>
        </>
      )}

      {isLoading && (
        <div role="status" aria-live="polite" style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Getting your report...</div>
      )}

      {isError && (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: 20 }}>
          {/*
            "WHY SHOULD ME THAT WE COULDN'T OPEN A REPORT AND IT MAY BELONG TO SOMEONE ELSE."

            Fair. The old line guessed at the cause and picked the one that accuses the reader of
            opening somebody else's record - on a page reached by clicking their own session. The
            status says which of the three things actually happened, so it can say the true one,
            and the fallback offers the retry rather than a theory.
          */}
          {/* Three things, three sentences: 404 is "no longer here", only 403 accuses, everything else offers the retry. */}
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
            {(error as any)?.response?.status === 403
              ? 'This session is not yours to open'
              : (error as any)?.response?.status === 404
                ? 'This session is no longer here'
                : 'This did not load'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            {(error as any)?.response?.status === 403
              ? 'A session report is only ever readable by the person who wrote it.'
              : (error as any)?.response?.status === 404
                ? 'The link may be out of date. Your check-ins page lists the sessions that are.'
                : 'Nothing is wrong with the report - the request did not get through. Try again.'}
          </div>
          {(error as any)?.response?.status === 404 && (
            <a href="/grounds" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>Back to check-ins</a>
          )}
          {!((error as any)?.response?.status === 403 || (error as any)?.response?.status === 404) && (
            <button
              onClick={() => refetch()}
              style={{ marginTop: 12, padding: '9px 14px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Try again
            </button>
          )}
        </div>
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
        <section
          style={{
            background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 14,
            padding: '18px 20px', marginBottom: 34,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            {/* U.9: the prototype's words for this report, "Your report" and "Only you" (own-report.txt). */}
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Your report</h2>
            <span style={{ fontSize: 12, color: 'var(--gw-sub)', flexShrink: 0 }}>Only you</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '2px 0 16px', lineHeight: 1.55, maxWidth: '68ch' }}>
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
        <div role="status" style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          Your report is still being written. Your answers are saved; this fills in as soon as it is ready.
        </div>
      )}
      {!isLoading && !isError && !data?.report && (groundReport as any)?.soloArtifact && (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, background: 'var(--gw-paper)', padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--gw-text)' }}>
            {(groundReport as any).soloArtifact.summary}
          </div>
          {(groundReport as any).soloArtifact.whatToCarry && (
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--gw-sub)', marginTop: 8, borderTop: '1px solid var(--gw-border)', paddingTop: 8 }}>
              <b style={{ color: 'var(--gw-text)' }}>What to carry into the next one. </b>
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
            THE REBUILT A-SESSION, WHICH IS WHAT THIS SURFACE WAS ALWAYS MEANT TO BE.
            The preview page carried the note for months: "not rebuilt yet, and the surface with the
            real problem under it - one cell, two shapes, two fetches, depending on which door you
            came through." The other eight surfaces were rebuilt to the template and this one was
            left, then the page that said so was deleted.
            It has everything this page needs: a check-in, a ground and a session. So it draws the
            same component the end of a signed-in check-in draws, which is the template - and gains
            the coaching note, what you carry, and the way to correct the record, none of which the
            old one had.
            The entry chat keeps the old component, and that is not drift: at the end of the entry
            chat there is no ground and no check-in to fetch, so the rebuilt one cannot run there.
            Two shapes because two moments, rather than two shapes by accident.
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
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 15px', marginTop: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>Something here isn’t right</div>
            {/* The inferred claims themselves, each with its own "Correct this". */}
            {Array.isArray((groundReport as any)?.inferences) && (groundReport as any).inferences.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <InferenceReviewPanel groundId={data!.groundId as string} inferences={(groundReport as any).inferences} />
              </div>
            )}
            {shape && shape.correctable === false ? (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                {shape.whyNotCorrectable}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                  Correcting it is a short check-in of its own. It asks you what it got wrong. Nothing
                  is overwritten; the change is shown alongside the original, and it closes a short
                  while after the shared report goes out.
                </div>
                <button
                  onClick={() => correct.mutate()}
                  disabled={correct.isPending || !data.groundId || !data.sessionNumber}
                  style={{ padding: '9px 14px', borderRadius: 8, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-navy)', fontSize: 13, fontWeight: 700, cursor: correct.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
                >
                  <span role="status">{correct.isPending ? 'Starting...' : 'Correct it'}</span>
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => navigate(`/checkin/${checkInId}`)}
            style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            Read the conversation this came from
          </button>
        </>
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
        <section
          style={{
            border: '1px solid var(--gw-border)', borderRadius: 14, background: 'var(--gw-card)',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            {/* U.9: "The team’s report", the prototype's name for it (own-report.txt, team-report.txt). */}
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>The team’s report</h2>
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
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 14, lineHeight: 1.55 }}>
            {shape?.state === 'final'
              ? `Closed${shape.takenAt ? ` ${whenItWas(shape.takenAt, 'day')}` : ''}. This does not change. What each person said about their own work can appear here. What anyone said about somebody else never does.`
              : 'Everybody’s side of this session, together, and it updates as people check in. What each person said about their own work can appear here. What anyone said about somebody else never does.'}
          </div>
          <TheSessionsReport
            groundId={data.groundId}
            sessionNumber={data.sessionNumber}
            totalInThisRound={ground ? whoIsInRound(((ground as any).participants ?? []), data.sessionNumber, (ground as any).scenario).length : null}
          />
        </section>
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
      <div className="gw-print-none" style={{ marginTop: 30, borderTop: '1px solid var(--gw-border)', paddingTop: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>What now?</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 11, maxWidth: '68ch' }}>
          Pick the open thing that matters most and agree who owns it. Nobody can do that part for
          you, and a follow-up is where it gets a date.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/grounds/new')}
            style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Start a new check-in
          </button>
          <button
            onClick={async () => {
              /* The .catch below used to be unreachable: `clipboard?.writeText(...)` is undefined where the API is absent, and `.then` on undefined throws. */
              if (await copy(`${window.location.origin}/checkin/${checkInId}/report`)) toast.success('Link copied')
              else toast.error('Could not copy it. Select the address bar instead.')
            }}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Copy the link
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.6, marginTop: 9 }}>
          The link opens only for people already entitled to read this.
        </div>
      </div>
      )}

    </div>
  )
}
