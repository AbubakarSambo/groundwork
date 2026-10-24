import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'
import { TheCheckInYouJustFinished } from '@/components/gw/TheCheckInYouJustFinished'
import { TheReportYouSawAtTheEnd } from '@/components/gw/TheReportYouSawAtTheEnd'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { useAuthStore } from '@/stores/auth'
import { askNameFor } from '@/lib/ask-name'

/**
 * EVERY SURFACE THAT SHOWS A REPORT, ON ONE PAGE, ON REAL DATA.
 *
 * The rebuild is being done surface by surface and each one has to be judged against the template
 * and against the one it replaces. Doing that by navigating between six pages loses the
 * comparison: by the time you have found the board you cannot remember what the shared half
 * looked like.
 *
 * WHY IT IS IN THE APP AND NOT A MOCK-UP. Every fault worth finding came from real data - no
 * objective in the database has a number, no behavioural detection has ever reached a second
 * period, and of eight hidden contributors ever produced one survives its own definition. A page
 * of invented content would have shown four beautiful reports and hidden all three.
 *
 * ACCESS IS EACH SURFACE'S OWN. This page calls only what the reader can already call, with the
 * reader's own token, so somebody opening it sees exactly what they would see anywhere else. It
 * adds no route to any data - it only arranges what is already reachable.
 *
 * It is temporary. It goes when the last surface is ported.
 */
const WRAP: React.CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '20px 16px 80px' }
const INPUT: React.CSSProperties = {
  /* The kit's field (app.css .input). */
  padding: '12px 16px', fontSize: 16, border: '1.5px solid var(--gw-rule-2)', borderRadius: 10, background: 'var(--gw-card)', color: 'var(--gw-text)', fontFamily: 'inherit',
}

function Surface({ n, name, cell, note, children }: {
  n: number
  name: string
  cell: string
  note: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 44, scrollMarginTop: 16 }} id={`s${n}`}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11,
          fontWeight: 700, color: 'var(--gw-sub)',
        }}>{String(n).padStart(2, '0')}</span>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--gw-text)' }}>{name}</h2>
        <span style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10.5,
          letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gw-navy)',
          background: 'var(--gw-blue-bg)', padding: '2px 7px', borderRadius: 5,
        }}>{cell}</span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--gw-text)', margin: '0 0 12px', maxWidth: '80ch' }}>{note}</p>
      {children}
    </section>
  )
}

/**
 * A WHOLE PAGE, SHOWN WHOLE.
 *
 * The board and the Report tab are routed pages rather than components: they read their own id
 * out of the URL and assemble several calls around it. Lifting their bodies out to mount them
 * here would mean maintaining a second copy of each, which is the duplication this rebuild
 * exists to remove. So they are shown as themselves, same origin and same token, and what you
 * see in the frame is the page as it ships.
 */
function ThePageItself({ to, tall }: { to: string; tall?: boolean }) {
  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden', background: 'var(--gw-card)' }}>
      <iframe
        src={to}
        title={to}
        style={{ width: '100%', height: tall ? 1100 : 760, border: 'none', display: 'block' }}
      />
    </div>
  )
}

/**
 * WHY THIS SURFACE IS BLANK, SAID PLAINLY RATHER THAN AS AN EMPTY BOX.
 *
 * "Nothing to show" would read as a page that has not loaded. What is actually true is narrower
 * and worth knowing: the report a person read at the end is kept only when they came through the
 * entry chat, so for an ordinary signed-in sitting there is nothing to re-open. Saying that is the
 * point of the workbench.
 */
function NothingStored({ what }: { what: string }) {
  return (
    <div style={{ border: '1px dashed var(--gw-border)', borderRadius: 10, padding: 14, maxWidth: 620 }}>
      <p style={{ fontSize: 12.5, color: 'var(--gw-text)', margin: 0, lineHeight: 1.55 }}>
        Nothing was kept for {what}. The report somebody reads at the end is only stored when they
        came through the entry chat; an ordinary signed-in sitting computes its own and keeps
        nothing, so there is nothing here to open again. That is the state of the product, not a
        fault on this page.
      </p>
    </div>
  )
}

/** The one message the product actually sends. Quoted, not written here, so it cannot drift. */
function AsItIsSent({ head, lines }: { head: string; lines: string[] }) {
  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: 16, maxWidth: 620, background: 'var(--gw-card)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-sub-d)', marginBottom: 8 }}>{head}</div>
      {lines.map(l => (
        <p key={l} style={{ fontSize: 13, color: 'var(--gw-text)', margin: '0 0 8px', lineHeight: 1.55 }}>{l}</p>
      ))}
    </div>
  )
}

export default function EveryReportSideBySide() {
  const [params, setParams] = useSearchParams()
  const groundId = params.get('ground') ?? ''
  const sessionNumber = Number(params.get('session') ?? '1')
  const askedFor = params.get('checkin') ?? ''
  const [g, setG] = useState(groundId)
  const [s, setS] = useState(String(sessionNumber))
  const askName = askNameFor(useAuthStore(state => state.user?.organization?.name?.trim() || state.user?.organizationName))

  /*
    FINDING YOUR OWN CHECK-IN RATHER THAN ASKING FOR ITS ID.
    Three of these surfaces are about one person's own sitting, so they need that person's
    check-in at this session number. Nobody carries such an id in their head; this is the same
    call the participant page makes to decide what to offer, and it resolves the participant from
    the caller's own user id, so it cannot be pointed at anybody else.
  */
  const mine = useQuery({
    queryKey: ['my-checkin-status', groundId],
    queryFn: () => groundsApi.getMyCheckinStatus(groundId),
    enabled: !!groundId,
    retry: false,
  })
  const atThisSession = mine.data?.checkIns?.find(c => c.sessionNumber === sessionNumber)
  const checkInId = askedFor || atThisSession?.id || mine.data?.checkIns?.[0]?.id || ''

  /*
    THE REPORT OBJECT, FETCHED ONCE HERE.
    `TheReportYouSawAtTheEnd` is presentational: it takes a report rather than an id, and each of
    its two callers builds one its own way. Until A · session is one component that fetches for
    itself, anything that wants to draw it has to know how - so this page knows how, and the fact
    that it has to is recorded as the finding above the surface.
  */
  const close = useQuery({
    queryKey: ['session-report', checkInId],
    queryFn: () => conversationApi.sessionReport(checkInId),
    enabled: !!checkInId,
  })
  const shape = useQuery({
    queryKey: ['session-shaped-report', groundId, sessionNumber],
    queryFn: () => reportsApi.sessionReport(groundId, sessionNumber),
    enabled: !!groundId && !!sessionNumber,
  })

  const report = close.data?.report ?? null
  const stands = shape.data?.whereThingsStand
    ? { settled: shape.data.whereThingsStand.settled ?? [], open: shape.data.whereThingsStand.open ?? [] }
    : null

  return (
    <div style={WRAP}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Every report surface</h1>
      <p style={{ fontSize: 13, color: 'var(--gw-text)', margin: '0 0 18px', maxWidth: '80ch' }}>
        All of them, on one check-in, on real data. Four reports - two readers by two scopes - drawn by eight surfaces, two of which turn out to carry no report at all. This page is for
        judging the rebuild against what it replaces, and it goes when the last surface is ported.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); setParams({ ground: g, session: s }) }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}
      >
        <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--gw-text)' }}>
          Check-in id
          <input value={g} onChange={(e) => setG(e.target.value)} placeholder="the check-in these belong to"
            style={{ ...INPUT, width: 340 }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--gw-text)' }}>
          Session
          <input value={s} onChange={(e) => setS(e.target.value)} inputMode="numeric" style={{ ...INPUT, width: 80 }} />
        </label>
        <button className="btn pri sm" type="submit" >
          Show them
        </button>
      </form>

      {!groundId ? (
        <p style={{ fontSize: 13, color: 'var(--gw-text)' }}>Put a check-in id above and every surface for it draws below.</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--gw-text)', margin: '0 0 26px' }}>
            {checkInId
              ? <>Your own sitting at session {sessionNumber}: <code style={{ fontSize: 11.5 }}>{checkInId}</code>{askedFor ? '' : ' - found for you.'}</>
              : 'You have no sitting of your own on this one, so the three surfaces about your own half say so rather than drawing empty.'}
          </p>

          <Surface
            n={1}
            name="The shared half of a session's report"
            cell="B · session"
            note="Rebuilt to the template: the finding first and alone, four states in a row, numbered blocks each with a note saying what it is for, and the long material folded. This is the reference the others are being built against."
          >
            <TheSessionsReport groundId={groundId} sessionNumber={sessionNumber} />
          </Surface>

          <Surface
            n={2}
            name="The top half of a session's report - your own"
            cell="A · session"
            note="Rebuilt. Where a report was stored it is shown exactly as it was read, because that object IS what the person read - only the entry chat stores one, ten of four hundred and ninety-five sittings. Everything else draws the same template as surface 04, from the same component. Its note read 'not rebuilt yet' for months, and the page carrying that note was deleted before the surface was done."
          >
            {/*
              THE SAME CONDITION THE REAL PAGE USES, so this shows what somebody actually gets.
              It drew the stored report or a grey "nothing was kept" box, which was true of the
              product and is no longer: SessionReportPage draws the stored one where there is one -
              that object IS what the person read - and the rebuilt template where there is not,
              which is the other 485 of 495 sittings.
              Mirroring it matters more here than anywhere: this page is what the surfaces are
              judged by, and a preview that lags the product is how a surface stays unrebuilt while
              everybody believes it was done.
            */}
            {report
              ? <TheReportYouSawAtTheEnd report={report} stands={stands} hideCompleteness={!!shape.data?.howClearThisWas?.level} onRecordLine="Built from what you said today." />
              : checkInId
                ? <TheCheckInYouJustFinished checkInId={checkInId} groundId={groundId} sessionNumber={sessionNumber} />
                : <NothingStored what="this sitting" />}
          </Surface>

          <Surface
            n={3}
            name="The end of the entry chat"
            cell="A · session, cropped"
            note="The same component, with two blocks dropped: there is no movement on a first session and nothing earlier to be solid against. The completeness read stays, because on a first session it is the only read there is - extraction has not run yet. Every stored report in the database is one of these, which is the other half of the finding above."
          >
            {report
              ? <TheReportYouSawAtTheEnd report={report} stands={null} onRecordLine="Built from what you said just now." />
              : <NothingStored what="a first sitting of your own" />}
          </Surface>

          <Surface
            n={4}
            name="The end of a signed-in check-in"
            cell="A · session"
            note="Rebuilt and ported. A · session and nothing else: the objective and your part of it, your own rows, the lines taken from what you said with the press that takes one back beside it, what is still open, what you carry with the private note inside it, and how much you gave it folded last. The shared picture is a door rather than a copy."
          >
            {checkInId
              ? <TheCheckInYouJustFinished checkInId={checkInId} groundId={groundId} sessionNumber={sessionNumber} />
              : <p style={{ fontSize: 12.5, color: 'var(--gw-text)' }}>You have no sitting of your own on this one.</p>}
          </Surface>

          <Surface
            n={5}
            name="What you have shared, across the run"
            cell="A · run"
            note="Your own half across every session, and the only place the specificity read has somewhere to stand. Shown as the page itself, because it is assembled from five components - MyRecord, WhatYouAreCarryingForward, TheFiveThingsThatMakeItCheckable, WhatYourRecordCanSupport, MyParticipation - and this page drew only the first of them for months, under a note saying so that nobody acted on. A preview that rebuilds a surface is a preview that can be right about a screen nobody ships."
          >
            <ThePageItself to={`/grounds/${groundId}?tab=record`} tall />
          </Surface>

          <Surface
            n={6}
            name="The board"
            cell="B · run"
            note="The shared picture across the whole run, and the only cell where fairness and patterns can exist at all. A page rather than a component, so it is shown as itself."
          >
            <ThePageItself to={`/grounds/${groundId}/board`} tall />
          </Surface>

          <Surface
            n={7}
            name="Over WhatsApp"
            cell="not a report"
            note="Counted as a report surface by the audit. It is not: it carries a check-in question and a link. A notification says a report exists - the moment it starts carrying content it inherits every rule the report has and can honour almost none of them."
          >
            <AsItIsSent
              head="What is actually sent"
              lines={[
                'A check-in question, and a link back to the check-in it belongs to.',
                'No finding, no difference between two people, no states. A difference read on a phone, in a message with no way to answer it or correct it, is the worst place that block could land.',
              ]}
            />
          </Surface>

          <Surface
            n={8}
            name="The shared-picture mail"
            cell="not a report"
            note="Also counted as a report surface. It holds no read either: four sentences about what a shared picture is, and the way in."
          >
            <AsItIsSent
              head="Subject - The shared picture for this check-in is ready"
              lines={[
                'Everybody has now checked in, so the shared picture is open to all of you at the same moment.',
                `It shows where what you each said lines up, where it does not, and the one question worth answering together. The people in this check-in, including your manager, can see what you say in it. Your questions to ${askName} stay private.`,
                'Read the shared picture →',
              ]}
            />
          </Surface>

          <Surface
            n={9}
            name="The Report tab"
            cell="an index, by decision"
            note="Not a fifth report and not a crop of one: it is how somebody finds the reports, which is a job none of the four does. It held a body once; that was taken out deliberately and the three orphans re-homed one by one. Kept as an index, decided 11 September."
          >
            <ThePageItself to={`/grounds/${groundId}?tab=report`} />
          </Surface>
        </>
      )}
    </div>
  )
}
