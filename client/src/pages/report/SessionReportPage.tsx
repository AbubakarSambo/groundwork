import { TheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TheLeadsOwnWayIn } from '@/components/gw/TheLeadsOwnWayIn'
import { isSessionShared } from '@/lib/session-rows'
import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'
import { isASalesKind } from '@/lib/a-sales-kind'
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
import { theCountOf } from '@/lib/the-one-count'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { useBackOrFallback } from '@/lib/a-back-button-never-leaves-groundwork'
import { TheCheckInHeader } from '@/components/gw/TheCheckInHeader'
import { checkInHeaderTabs } from '@/pages/grounds/ground-tabs'
import { Page, Button, Panel, Callout, Section, SubHeading, Note, Tag, Stack } from '@/components/gw/ui'
import { TheCollectionsOwnReportSections } from '../board/pictured/TheCollectionsBoard'
import '../board/pictured/pictured-board.css'

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
  const [searchParams] = useSearchParams()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['session-report', checkInId],
    queryFn: () => conversationApi.sessionReport(checkInId!),
    enabled: !!checkInId,
    /*
     * B-134: "Your report is still being written... this fills in as soon as it is ready" was never
     * true - this query never re-fetched on its own, so whoever opened the page while the
     * background job was mid-write (`conversationApi.sessionReport`'s own comment: a background job
     * writes it after the session ends) stayed on "still being written" until they reloaded by hand,
     * even once the list on My work had already moved to "Your report is ready". Polling here, the
     * same way the shared report below already polls while it is behind (`theTeamsReportIsBehind`),
     * makes the promise true and keeps every surface agreeing on the same served state.
     */
    /* And not for one the server says will never come ('not-kept'): asking every five seconds for ever changed nothing. */
    refetchInterval: (q: any) => (q?.state?.data && !q.state.data.report && q.state.data.state !== 'not-kept' ? 5_000 : false),
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
    /* Read again once a minute, so someone checking in after you opened this is noticed (below).
       Reading only: opening or watching a report never rebuilds it. */
    refetchInterval: 60_000,
  })

  /* Only the person who runs the check-in is offered these: a party cannot change either, and
     telling somebody about a setting they have no access to is worse than not mentioning it. */
  /* The direct morning (lib/the-direct-morning.tsx), from the check-in this page already reads. */
  const direct = isTheDirectMorningOn(ground)
  const amTheInitiator = ((ground as any)?.participants ?? []).some(
    (p: any) => p.userId === viewerUserId && p.partyType === 'INITIATOR',
  )

  /**
   * GROUP 3'S REVIEW, FAULT 1: THIS SESSION'S OWN PAGE DREW THE LATEST SESSION'S MATERIAL.
   *
   * `groundReport` (`GET /grounds/:id/report`) is always the check-in's CURRENT working copy -
   * whatever the coaching note, the lead's probe list and the inference review are built from "now",
   * not "as of the session this page is about". Reading a closed session 1's report showed "This is
   * session 2 of sales and expansion work" under "Closed 27 Sept 2026. This does not change.", and
   * the lead's probe list said people had not answered a session the team report, two lines above it
   * on the same page, said they had - because the probe list was already about session 2.
   *
   * `GET /grounds/:id/report/session/:n` (`shape`) is the one call that is genuinely locked to this
   * page's own session, but it carries no coaching note, probe list or inferences at all (see
   * `SessionShapedReport` in `api/reports.ts`) - those are engine reads that it has never produced
   * per session, only "as of now". So rather than drop them from a closed session's own report, or
   * silently show session 2's answers where session 1's belong, they are only drawn here when this
   * page's session IS the one the engine's "now" is about - `myRows` already does the right thing on
   * its own, because every row carries its own `sessionNumber` and the component filters to it.
   *
   * `ground.sessionProgress.sessionNumber` is "the highest session anybody has actually completed an
   * answer for" (see `GroundsService.getSessionProgress`), which is exactly what the coaching note,
   * probe list and inference pass are built against. When it is not this page's session, the latest
   * material moves to its own section below, plainly labelled as the latest rather than folded into
   * a session that has already closed. See `docs/requests-to-engine.md` for the ask: a per-session
   * copy of these three reads, so a closed session's own page never needs the live ones at all.
   */
  const latestMaterialSessionNumber: number | null = (ground as any)?.sessionProgress?.sessionNumber ?? null
  const reportIsForThisSession = !!data?.sessionNumber
    && (latestMaterialSessionNumber == null || latestMaterialSessionNumber === data.sessionNumber)

  const setCadence = useMutation({
    mutationFn: (cadence: string) => groundsApi.update(data!.groundId as string, { cadence } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', data?.groundId] })
      toast.success('Saved. That is how often this runs now.')
    },
    onError: () => toast.error('That didn’t save. Try again.'),
  })

  /*
   * YOU ARE READING THE PREVIOUS VERSION (Hafsah, 1 October, decision 71). The old team report's
   * banner, carried over: when somebody has checked in after the team's report was last written, it
   * is being updated, and the page says so and reads it again until the new one is there. When it
   * was last written is `updatedAt` (a regenerated report is upserted, so `createdAt` stays at the
   * first one), with `createdAt` only for a report written before that column existed.
   */
  /*
   * B-198: ONLY ASKED ONCE THE CHECK-IN SAYS IT HAS ONE.
   *
   * `GET /grounds/:id/report` answers 404 for "no report yet" by design (GW-PRI-04, the same 404 a
   * check-in that does not exist answers, so the two cannot be told apart) - but a check-in's first
   * session has no team report at all, so every first visit to its own session-1 report page asked
   * anyway and logged a 404 that nothing was wrong about. `ground.report` already carries whether
   * one exists (the same field `GroundParticipantPage`'s matching query is gated on), known from the
   * `ground` query just above, so this waits for that rather than asking blind.
   */
  const { data: groundReport } = useQuery({
    queryKey: ['report', data?.groundId],
    queryFn: () => reportsApi.get(data!.groundId as string),
    enabled: !!data?.groundId && !!(ground as any)?.report,
    retry: false,
    refetchInterval: (q: any) => (theTeamsReportIsBehind(q?.state?.data, ground) ? 5_000 : false),
  })
  const readingThePreviousVersion = useMemo(() => theTeamsReportIsBehind(groundReport, ground), [groundReport, ground])
  /* When the team's report reaches this reader (Hafsah's answers 1 and 5, 16 October 2026): "It is usually shared by 6:30pm." */
  const { data: sharing } = useQuery({
    queryKey: ['report-sharing', data?.groundId],
    queryFn: () => reportsApi.sharing(data!.groundId as string),
    enabled: !!data?.groundId && !!(ground as any)?.report,
    retry: false,
    staleTime: 30_000,
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

  const plannedSessions = ground ? plannedSessionsFor((ground as any).timelineDays, (ground as any).cadence, (ground as any).plannedSessions, (ground as any)?.cadenceDays) : null
  const contextEnabled = (ground as any)?.contextEnabled === true

  /**
   * B-142: "Start my check-in" PROMISED A SESSION THAT WAS NOT THERE.
   *
   * The header's link always said "Start my check-in" for a party who does not run the check-in,
   * even when nothing is open for them right now - pressing it landed on "No check-in open right
   * now". The same rule GroundParticipantPage already uses for its own "due now" state
   * (an open check-in that has actually started, or whose available date has passed) decides
   * whether this page may still offer that label.
   */
  const myParticipantForOpenCheck = ((ground as any)?.participants ?? []).find((p: any) => p.userId === viewerUserId)
  const myOpenCheckIn = ((ground as any)?.checkIns ?? []).find(
    (ci: any) => ci.participantId === myParticipantForOpenCheck?.id && ci.status !== 'COMPLETED',
  )
  const myOpenAvailableFrom = myOpenCheckIn?.availableFrom ?? null
  const myOpenOpensLater = !!myOpenAvailableFrom && new Date(myOpenAvailableFrom).getTime() > Date.now() && myOpenCheckIn?.status !== 'IN_PROGRESS'
  const hasOpenSessionNow = !!myOpenCheckIn && !myOpenOpensLater

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

  /* B-126: this "Back" only shows while the report is loading or has refused the viewer, so there
     is nothing on this page yet to go back within - no browser history inside the app, say, from a
     link in an email, must not fall through to about:blank. "Back to your check-ins" names where it
     goes instead. */
  const back = useBackOrFallback('/grounds', 'Back to your check-ins')

  /*
   * SCREEN MATCH, 16 OCTOBER: YOUR OWN REPORT AS PICTURED (own-report.jpg), for a sales check-in, where the light own
   * report already lives. The check-in's name and the day, "Only you", "Your report", your own report itself, and
   * whether the team's report is shared yet. Everything else this page shows is one tap away (?whole=1).
   */
  if (!isLoading && !isError && data?.groundId && data?.sessionNumber && isASalesKind((ground as any)?.kindOfWork) && searchParams.get('whole') !== '1') {
    const teamShared = !!shape && (shape as any).released === true
    const checkInLabel: string = (ground as any)?.label ?? 'This check-in'
    return (
      <TheDirectMorning on={direct}>
      <Page>
        {/* The prototype's own report: one narrow column, the check-in and day with "Only you", the title, the report, then
            whether the team's report is shared. */}
        <div className="gw-own">
          <div className="gw-col-18 gw-own-in">
          <div>
            <div className="gw-spread">
              <span className="t-tiny mut">{`${checkInLabel}${data.finishedAt ? `, ${whenItWas(data.finishedAt, 'dayAndMonthLong')}` : ''}`}</span>
              {!direct && <Tag>Only you</Tag>}
            </div>
            <h1 className="t-title gw-mt-4">Your report</h1>
          </div>
          {/* Credit for checking in on time (api engagement/who-answers-and-when.ts): served to the person whose report it is, with the direct morning on. */}
          {data.onTime && <p className="t-small">{data.onTime}</p>}
          <TheCheckInYouJustFinished checkInId={checkInId!} groundId={data.groundId as string} sessionNumber={data.sessionNumber as number} light pictured />
          <div className="gw-spread gw-ruled-top">
            <div>
              <b className="t-small">The team’s report</b>
              <div className="t-tiny mut">{teamShared ? ((shape as any)?.releaseOneSalesReport === true || direct ? 'Shared. Open it.' : 'Shared. Open it to read the whole team’s picture.') : `Not shared yet.${sharing?.says && !sharing.shared ? ` ${sharing.says.replace(/ You’ll get an email when.*$/, '')}` : ''}`}</div>
            </div>
            {teamShared
              ? <Link className="t-small" to={`/grounds/${data.groundId}/session/${data.sessionNumber}`}>Open it</Link>
              : <Tag tone="attention">Waiting</Tag>}
          </div>
          <Link to={`/checkin/${checkInId}/report?whole=1`} className="t-small">See every other part of this report</Link>
          </div>
        </div>
      </Page>
      </TheDirectMorning>
    )
  }

  return (
    <TheDirectMorning on={direct}>
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
          hasOpenSessionNow={hasOpenSessionNow}
          active="report"
          tabs={checkInHeaderTabs({ id: data.groundId as string, contextEnabled, canRunThisCheckIn: amTheInitiator, isAParty: true, ground: ground as any })}
        />
      ) : (
        <button type="button" onClick={back.onClick} className="gwui-plain-link">
          {back.label}
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
        <Section heading={data?.sessionNumber ? `Session ${data.sessionNumber}` : 'Your session'}>
          {/*
            THE PAGE HAS TWO REPORTS ON IT AND THIS LINE DESCRIBED ONE OF THEM.
            "Nobody else can see it" is true of your own half and false of the shared half directly
            below it, so read as the page's subtitle it was a privacy claim over a shared document. It
            says what the page holds; each half now carries its own line about who reads it.
          */}
          <Note>
            {data?.finishedAt
              ? `Everything about this session, on ${whenItWas(data.finishedAt, 'dayAndMonthLong')}. Your report first, then the team’s report.`
              : 'Everything about this session. Your report first, then the team’s report.'}
          </Note>
        </Section>
      )}

      {isLoading && <Note role="status">Getting your report...</Note>}

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
          <Stack gap={12}>
            <SubHeading>
              {(error as any)?.response?.status === 403
                ? 'This report is not yours to open'
                : (error as any)?.response?.status === 404
                  ? 'This session is no longer here'
                  : 'This did not load'}
            </SubHeading>
            <Note>
              {(error as any)?.response?.status === 403
                ? 'Each person’s own report can only be read by that person.'
                : (error as any)?.response?.status === 404
                  ? 'The link may be out of date. Your check-ins page lists the sessions that are.'
                  : 'Nothing is wrong with the report - the request did not get through. Try again.'}
            </Note>
            {/* B-111: a 403 here left nothing to press but the page's own top-of-page browser-back
                link - "There is nothing this page can usefully offer" (above) is true of "Start a
                new check-in"/"Copy the link", which promise something false, but not of a plain
                way back to the list, which promises nothing. Every small state needs a way on. */}
            {((error as any)?.response?.status === 404 || (error as any)?.response?.status === 403) && (
              <a href="/grounds" className="gwui-plain-link">Back to check-ins</a>
            )}
            {!((error as any)?.response?.status === 403 || (error as any)?.response?.status === 404) && (
              <Button kind="secondary" onClick={() => refetch()}>Try again</Button>
            )}
          </Stack>
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
        <Panel as="section" className="gwui-panel-private">
          <div className="gwui-sentence-row">
            {/* U.9: the prototype's words for this report, "Your report" and "Only you" (own-report.txt). */}
            <SubHeading>Your report</SubHeading>
            <Tag>Only you</Tag>
          </div>
          <Note>What you said this session, and what to do with it.</Note>
          {data?.onTime && <p className="pb-on-time">{data.onTime}</p>}

          <Stack gap={18}>
          {/* Simple and visual, and only on this half. See the component's own note for why. */}
          <HowSpecificThisSessionWas level={shape?.howClearThisWas?.level} />
          {/* Release 2: on a "Collect what's owed" check-in, your own report on the bills you follow up (or your own loan), as the server words it. */}
          {(shape as any)?.collectionsOwnReport && <TheCollectionsOwnReportSections r={(shape as any).collectionsOwnReport} />}

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
          {/*
            THE LEAD'S OWN REPORT, WHEN THERE ISN'T ONE (sales-first.md, section 2; the light prototype's s62).
            "Your report is still being written. Your answers are saved" was not true for a lead who has not
            checked in: there are no answers to save. The prototype's own words instead, with the two ways on.
          */}
          {!isLoading && !isError && !data?.report && !(groundReport as any)?.soloArtifact && amTheInitiator && !data?.finishedAt && data?.groundId && (
            <Panel>
              <Stack gap={10}>
                <SubHeading>{direct ? 'Your own report' : 'Own reports are private'}</SubHeading>
                <Note>{direct ? 'Yours appears here after your own check-in.' : 'Each person’s own report is theirs alone. Yours appears here after your own check-in.'}</Note>
                {!['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes((ground as any)?.status) && <TheLeadsOwnWayIn groundId={data.groundId as string} />}
                {!direct && <Note>Your check-ins here are optional. Check in when you want your own view in the picture.</Note>}
              </Stack>
            </Panel>
          )}
          {/*
            "STILL BEING WRITTEN" ONLY WHILE IT IS (staging test, 15 October). A session run while signed in never gets a
            report of its own, so a finished one said "Your report is still being written" for ever. The server says which
            it is (`state`, `says`, where-a-sessions-report-stands.ts): a session that will get no separate report says so.
          */}
          {!isLoading && !isError && !data?.report && !(groundReport as any)?.soloArtifact && !(amTheInitiator && !data?.finishedAt) && (
            <Panel>
              <Note role="status">{data?.state && data.state !== 'ready' && data.says
                ? data.says
                : 'Your report is still being written. Your answers are saved; this fills in as soon as it is ready.'}</Note>
            </Panel>
          )}
          {!isLoading && !isError && !data?.report && (groundReport as any)?.soloArtifact && (
            <Panel>
              <Stack gap={10}>
                <p className="gwui-panel-text">{withoutTheColonOpening((groundReport as any).soloArtifact.summary ?? '')}</p>
                {(groundReport as any).soloArtifact.whatToCarry && (
                  <Note>
                    {/* U.9 THIRD REVIEW, ITEM 4: "WHAT TO CARRY INTO THE NEXT ONE" IS A HEADING, NOT AN
                        INSTRUCTION TO THE READER. It described the section rather than telling them what
                        to do with it, which the prototype's own wording does instead. */}
                    <b>Carry this into your next check-in. </b>
                    {(groundReport as any).soloArtifact.whatToCarry}
                  </Note>
                )}
              </Stack>
            </Panel>
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
                light={isASalesKind((ground as any)?.kindOfWork)}
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
              <Panel>
                <Stack gap={10}>
                  <SubHeading>Something here isn’t right</SubHeading>
                  {/* The inferred claims themselves, each with its own "Correct this". Only when the
                      latest report is this session's own - see `reportIsForThisSession` above. */}
                  {reportIsForThisSession && Array.isArray((groundReport as any)?.inferences) && (groundReport as any).inferences.length > 0 && (
                    <InferenceReviewPanel groundId={data!.groundId as string} inferences={(groundReport as any).inferences} />
                  )}
                  {shape && shape.correctable === false ? (
                    <Note>{shape.whyNotCorrectable}</Note>
                  ) : (
                    <>
                      <Note>
                        {/*
                          GROUP 3'S REVIEW, BATCH A FAULT 6: "NOTHING IS OVERWRITTEN; THE CHANGE IS
                          SHOWN ALONGSIDE THE ORIGINAL" JOINED TWO SENTENCES WITH A SEMICOLON.
                        */}
                        Correcting it is a short check-in of its own. It asks you what it got wrong.
                        Nothing is overwritten. The change is shown alongside the original, and it
                        closes a short while after the shared report goes out.
                      </Note>
                      <Button kind="secondary" onClick={() => correct.mutate()} disabled={correct.isPending || !data.groundId || !data.sessionNumber}>
                        <span role="status">{correct.isPending ? 'Starting...' : 'Correct it'}</span>
                      </Button>
                    </>
                  )}
                </Stack>
              </Panel>
              <button type="button" onClick={() => navigate(`/checkin/${checkInId}`)} className="gwui-plain-link">
                Read the conversation this came from
              </button>
            </>
          )}

          {/*
            "THIS RECORD IS YOURS" - offered wherever that is true, which is once the session is
            finished, not only when a stored report happens to exist (the branch above). A session
            run while signed in has no stored `data.report` but is just as much a finished session
            whose record is yours to take away.
            GROUP 3'S REVIEW, BATCH A FAULT 6: "IT IS PORTABLE AND PERMANENT" IS WORK JARGON. Said
            plainly instead - you can keep your own copy, and it stays here for you either way.
          */}
          {data?.finishedAt && (
            <Stack gap={10}>
              <Note>{direct ? 'You can keep your own copy.' : 'This record is yours. You can keep your own copy, and it will always be here for you.'}</Note>
              <button
                type="button"
                disabled={downloadRecord.isPending}
                onClick={() => downloadRecord.mutate()}
                className="gwui-plain-link"
                aria-label={`Download your session ${data.sessionNumber} record`}
              >
                {downloadRecord.isPending ? 'Downloading…' : 'Download your record'}
              </button>
            </Stack>
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
          {reportIsForThisSession && (
            <WhatToWorkOnNext
              note={(groundReport as any)?.coaching}
              guide={(groundReport as any)?.postReportGuide}
            />
          )}
          </Stack>
        </Panel>
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
      {data?.groundId && data?.sessionNumber && readingThePreviousVersion && (
        <Callout tone="info">
          Someone has checked in since this was written, so it is being updated now. What you are reading is the previous version. It will refresh on its own.
        </Callout>
      )}
      {data?.groundId && data?.sessionNumber && (
        <Panel as="section">
          <Stack gap={12}>
          {/* U.9: "The team’s report", the prototype's name for it (own-report.txt, team-report.txt). */}
          {/*
            AND WHETHER IT IS SHARED YET, BESIDE ITS NAME, on a sales check-in (sales-first.md, sections 2 and 5;
            own-report.txt: "The team’s report / Not shared yet"). The done page's own rule and tags: this
            session's own release, never another session's.
          */}
          {isASalesKind((ground as any)?.kindOfWork) ? (
            <div className="gwui-sentence-row">
              <SubHeading>The team’s report</SubHeading>
              {isSessionShared((ground as any)?.report, data.sessionNumber as number)
                ? <Tag tone="proven">Shared</Tag>
                : <Tag tone="attention">Not shared yet</Tag>}
            </div>
          ) : (
            <SubHeading>The team’s report</SubHeading>
          )}
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
          {/*
            GROUP 3'S REVIEW, BATCH A FAULT 2: "WHAT ANYONE SAID ABOUT SOMEBODY ELSE NEVER DOES" WAS
            NOT TRUE OF THIS SAME REPORT. A person's own words, even when they name somebody else
            ("Four shops for me", a dependency on a colleague), stay as they said them
            (`their-own-words-stay.ts`, decision 18) - only a lead's private judgement of a person is
            withheld from anyone but the lead (`deeplyWithoutTheLeadsDescriptionOfAnyone`). The same
            report that carried the old line also read "Baraka Mwangi and Neema Achieng are waiting
            on Rukia Otieno for 3 things", which is exactly what it claimed never happened. The
            sentence now says only what is true and actually enforced.
          */}
          {/* The direct morning: when it closed, and nothing that explains or defends the report. Who reads what is the backend's rule. */}
          {direct ? (shape?.state === 'final' && <Note>{`Closed${shape.takenAt ? ` ${whenItWas(shape.takenAt, 'day')}` : ''}.`}</Note>) : (
          <Note>
            {shape?.state === 'final'
              ? `Closed${shape.takenAt ? ` ${whenItWas(shape.takenAt, 'day')}` : ''}. This does not change. What each person said about their own work can appear here. Nobody's private judgement of somebody else does.`
              : 'Everybody’s side of this session, together, and it updates as people check in. What each person said about their own work can appear here. Nobody\'s private judgement of somebody else does.'}
          </Note>
          )}
          <TheSessionsReport
            groundId={data.groundId}
            sessionNumber={data.sessionNumber}
            light={isASalesKind((ground as any)?.kindOfWork)}
            totalInThisRound={ground ? theCountOf(ground, data.sessionNumber)?.onTheCheckIn.length ?? null : null}
          />
          {/* A self-correction shows up as a flagged, dated entry rather than being blended in
              silently. Visible to everyone who reads this report, same as the report itself. */}
          <UpdatesToTheRecord updates={(groundReport as any)?.updates} nameFor={nameFor} />
          </Stack>
        </Panel>
      )}
      {/*
        AND THE LEAD'S OWN SECTION, AFTER THE SHARED REPORT.

        Nobody else can see this. The server returns null for anybody who is not the lead or an org
        admin, before it reads a row, so there is nothing here to gate on the client - which is the
        point: a lead-only surface guarded by a caller remembering to check is one refactor away
        from not being lead-only.
      */}
      {reportIsForThisSession && (
        <WhatToProbeThemOn
          reads={(groundReport as any)?.probes}
          weigh={(groundReport as any)?.whatTheGroundCanTellYou}
          weighNote={(groundReport as any)?.whatTheGroundCanTellYouNote}
          restedOn={(groundReport as any)?.whatItRestedOn}
          startedAt={(groundReport as any)?.whereThisStarted}
          softSpots={(groundReport as any)?.softSpots}
          arcAdvisories={(groundReport as any)?.arcAdvisories}
          nameFor={nameFor}
          readerRunsIt={!(myParticipant && !amTheInitiator)}
        />
      )}

      {/*
        THIS SESSION IS CLOSED, AND SOMETHING NEWER EXISTS. See `reportIsForThisSession` above: the
        coaching note, the lead's probe list and the inference review are built from "now", not from
        this session, so they no longer belong under "Session {n}" once a later session has moved
        past it. Shown here instead, plainly labelled as the latest, rather than left out or folded
        silently into a session that has already closed.
      */}
      {!isLoading && !isError && !reportIsForThisSession && (
        <Panel as="section">
          <Stack gap={12}>
            <SubHeading>Since then, in the latest check-in</SubHeading>
            <Note>
              This session is closed and does not change. Since it closed, a later check-in has added
              more. This is what the latest one says now.
            </Note>
            {Array.isArray((groundReport as any)?.inferences) && (groundReport as any).inferences.length > 0 && data?.groundId && (
              <InferenceReviewPanel groundId={data.groundId as string} inferences={(groundReport as any).inferences} />
            )}
            <WhatToWorkOnNext
              note={(groundReport as any)?.coaching}
              guide={(groundReport as any)?.postReportGuide}
            />
            <WhatToProbeThemOn
              reads={(groundReport as any)?.probes}
              weigh={(groundReport as any)?.whatTheGroundCanTellYou}
              weighNote={(groundReport as any)?.whatTheGroundCanTellYouNote}
              restedOn={(groundReport as any)?.whatItRestedOn}
              startedAt={(groundReport as any)?.whereThisStarted}
              softSpots={(groundReport as any)?.softSpots}
              arcAdvisories={(groundReport as any)?.arcAdvisories}
              nameFor={nameFor}
              readerRunsIt={!(myParticipant && !amTheInitiator)}
            />
          </Stack>
        </Panel>
      )}

      {/*
        RELEASE WALKTHROUGH A, FIX 4: THE REPORT SCREEN'S OWN "NOW" - THE PROTOTYPE'S, NOT ONE
        INVENTED FOR IT.

        "Start a new check-in" opened `/grounds/new` - a brand-new check-in, unrelated to this one -
        which is not a door this report page owes anybody, least of all a participant who most often
        has no way to start one at all (`/start` refuses them). The prototype's own report screens
        (own-report.txt, one-session.txt, B4-reports-and-sharing) have no such button at the foot of
        a report, for either reader - a check-in is started from the sidebar's own "Start a check-in"
        link, not repeated here. So the button, and the "What now?" framing built around it, are
        gone; the one genuinely useful thing this block held - a link to this report, for whoever
        already reads it - stays, quieter, with no heading claiming it is this page's "now".

        U.9 REVIEW: "WHAT NOW?" WAS OFFERED ON THE PAGE THAT SAYS THIS ISN'T YOURS TO OPEN. Kept:
        nothing here is drawn on a page that has refused the reader.
      */}
      {/* Decision 133: each report the lead reads ends with "Check in yourself" and "Add context". */}
      {!isLoading && !isError && amTheInitiator && data?.groundId && !['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'].includes((ground as any)?.status) && !(!data?.report && !(groundReport as any)?.soloArtifact && !data?.finishedAt) && (
        <div className="gw-print-none">
          <TheLeadsOwnWayIn groundId={data.groundId as string} />
        </div>
      )}
      {!isLoading && !isError && (
        <div className="gw-print-none">
          <button
            type="button"
            onClick={async () => {
              /* The .catch below used to be unreachable: `clipboard?.writeText(...)` is undefined where the API is absent, and `.then` on undefined throws. */
              if (await copy(`${window.location.origin}/checkin/${checkInId}/report`)) toast.success('Link copied')
              else toast.error('Could not copy it. Select the address bar instead.')
            }}
            className="gwui-plain-link"
          >
            Copy the link to this report
          </button>
          {/* "ENTITLED" IS JARGON (real-user walk, Kijani Foods, fault 6). Plain words for the
              same fact: the link itself does nothing: whoever opens it still has to be someone
              Groundwork already lets read this. */}
          <Note>The link opens only for people who may already read this.</Note>
        </div>
      )}
    </Page>
    </TheDirectMorning>
  )
}

/** Somebody finished a check-in after the team's report was last written. */
export function theTeamsReportIsBehind(report: any, ground: any): boolean {
  const writtenAt = report?.updatedAt ?? report?.createdAt
  const written = writtenAt ? new Date(writtenAt).getTime() : 0
  if (!written) return false
  const newest = ((ground?.checkIns ?? []) as { completedAt?: string | null }[])
    .map((c) => (c.completedAt ? new Date(c.completedAt).getTime() : 0))
    .reduce((m, t) => Math.max(m, t), 0)
  return newest > written
}
