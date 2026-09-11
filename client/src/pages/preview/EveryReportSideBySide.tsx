import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'
import { SessionReportCard } from '@/components/gw/SessionReportCard'

/**
 * EVERY REPORT SURFACE, ON ONE PAGE, ON REAL DATA.
 *
 * The rebuild is being done surface by surface and each one has to be judged against the template
 * and against the one it replaces. Doing that by navigating between four pages loses the
 * comparison: by the time you have found the board you cannot remember what the session report
 * looked like.
 *
 * WHY IT IS IN THE APP AND NOT A MOCK-UP. Every fault worth finding today came from real data - no
 * objective in the database has a number, no behavioural detection has ever reached a second
 * period, and of eight hidden contributors ever produced one survives its own definition. A page of
 * invented content would have shown four beautiful reports and hidden all three.
 *
 * ACCESS IS THE COMPONENTS' OWN. Nothing here fetches anything; each surface calls the same
 * endpoint it always does, with the reader's own token, so a participant opening this sees exactly
 * what they would see anywhere else. The page adds no route to any data - it only arranges what the
 * reader can already reach.
 *
 * It is temporary. It goes when the last surface is ported.
 */
const WRAP: React.CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '20px 16px 80px' }

function Surface({ name, cell, note, children }: {
  name: string
  cell: string
  note: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
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

export default function EveryReportSideBySide() {
  const [params, setParams] = useSearchParams()
  const groundId = params.get('ground') ?? ''
  const sessionNumber = Number(params.get('session') ?? '1')
  const checkInId = params.get('checkin') ?? ''
  const [g, setG] = useState(groundId)
  const [s, setS] = useState(String(sessionNumber))
  const [c, setC] = useState(checkInId)

  return (
    <div style={WRAP}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Every report surface</h1>
      <p style={{ fontSize: 13, color: 'var(--gw-text)', margin: '0 0 18px', maxWidth: '80ch' }}>
        All of them, on one check-in, on real data. Four report objects — two readers by two
        scopes — drawn by seven surfaces. This page is for judging the rebuild against what it
        replaces, and it goes when the last surface is ported.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); setParams({ ground: g, session: s, ...(c ? { checkin: c } : {}) }) }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 28 }}
      >
        <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--gw-text)' }}>
          Check-in id
          <input value={g} onChange={(e) => setG(e.target.value)} placeholder="the check-in this belongs to"
            style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 12.5, width: 320, fontFamily: 'inherit' }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--gw-text)' }}>
          Session
          <input value={s} onChange={(e) => setS(e.target.value)} inputMode="numeric"
            style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 12.5, width: 80, fontFamily: 'inherit' }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--gw-text)' }}>
          Your check-in id <span style={{ color: 'var(--gw-sub)' }}>(for the two closes)</span>
          <input value={c} onChange={(e) => setC(e.target.value)} placeholder="optional"
            style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 12.5, width: 320, fontFamily: 'inherit' }} />
        </label>
        <button type="submit" style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Show them
        </button>
      </form>

      {!groundId ? (
        <p style={{ fontSize: 13, color: 'var(--gw-text)' }}>Put a check-in id above and every surface for it draws below.</p>
      ) : (
        <>
          <Surface
            name="The shared half of a session's report"
            cell="B · session"
            note="Rebuilt to the template: the finding first and alone, four states in a row, numbered blocks each with a note saying what it is for, and the long material folded. This is the reference the others are being built against."
          >
            <TheSessionsReport groundId={groundId} sessionNumber={sessionNumber} />
          </Surface>

          {!!checkInId && (
            <>
              {/*
                THE ONE SURFACE THIS PAGE CANNOT MOUNT, WHICH IS ITSELF THE FINDING.
                
                `TheReportYouSawAtTheEnd` takes a report OBJECT rather than an id: it is
                presentational, and each of its two callers fetches the data its own way. So a page
                that wants to show it has to know how to build one, which is exactly the duplication
                the rebuild is for - one cell, two components, two fetches, depending on which door
                somebody came through.
                
                It goes in here the moment A · session is one component that fetches for itself.
              */}
              <Surface
                name="The top half of a session's report — your own"
                cell="A · session"
                note="Not shown here, and that is the finding rather than a gap: this component takes a report object rather than an id, so each of its two callers builds one its own way. It appears here the moment A · session is one component that fetches for itself."
              >
                <a href={`/checkin/${checkInId}/report`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--gw-navy)' }}>
                  Open the session report page, where it is drawn
                </a>
              </Surface>

              <Surface
                name="The end of a signed-in check-in"
                cell="A · session"
                note="Not rebuilt yet, and the first one anybody ever sees. Still carries the alignment-status word and the honest-close block the template retires."
              >
                <SessionReportCard checkInId={checkInId} groundId={groundId} sessionNumber={sessionNumber} isInitiator={false} />
              </Surface>
            </>
          )}

          <p style={{ fontSize: 12.5, color: 'var(--gw-text)', marginTop: 8 }}>
            My record, the board and the Report tab are whole pages rather than components, so they
            open in their own tabs:{' '}
            <a href={`/grounds/${groundId}/board`} target="_blank" rel="noreferrer" style={{ color: 'var(--gw-navy)' }}>the board</a>{' · '}
            <a href={`/grounds/${groundId}?tab=report`} target="_blank" rel="noreferrer" style={{ color: 'var(--gw-navy)' }}>the Report tab</a>{' · '}
            <a href={`/grounds/${groundId}/session/${sessionNumber}`} target="_blank" rel="noreferrer" style={{ color: 'var(--gw-navy)' }}>the session report page</a>
          </p>
        </>
      )}
    </div>
  )
}
