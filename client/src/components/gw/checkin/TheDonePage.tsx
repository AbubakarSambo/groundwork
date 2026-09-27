import { useQuery } from '@tanstack/react-query'
import { Button, StageLadder, Tag } from '@/components/gw/kit'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'
import { THE_FIVE, wasItThere } from '@/components/gw/TheFiveThingsThatMakeItCheckable'
import { WhoIsStillOut } from '@/components/gw/WhoIsStillOut'
import { whenTheNextOneOpens, whoElseAnswers } from '@/lib/what-the-end-of-a-check-in-can-say'

/**
 * THE DONE PAGE (B3, docs/prototype/screens/B3-the-check-in/done.txt).
 *
 *   Done. Thanks, Miriam.
 *   Your check-in is saved. (and when the next one opens)
 *   Two reports come from this       your own, "Only you", "Read yours"; the team's, and whether it is out
 *   What changed on your deals       the engine's stage ladders, when it sends them (request 7)
 *   That’s saved                     why answering matters, and one thing for next time
 *   How checkable today’s check-in was   the engine's five, "4 of 5", "Only you see it."
 *
 * Every part is said only when it is true for this check-in:
 * - The team's report opens once everyone in the round has answered (reports.listener releases it
 *   then), so it says that, not the prototype's "once Wairimu shares it, usually by 7pm".
 * - "How checkable" reads this person's own check-in, which the server sends to them alone
 *   (how-checkable-is-yours-alone). The five are the engine's own five, in the product's words.
 * - "One thing for next time" is the sentence the session itself wrote (`whatToCarry`), which
 *   arrives a little after the check-in closes.
 */
/**
 * Off until request 45 (docs/requests-to-engine.md) is answered: the "n of 5" count and its bar
 * are a score built from a read of the session that is known to miss real content. Flip this back
 * on once the engine workspace has looked at why.
 */
const SHOW_THE_COUNT = false

export interface WhatChanged {
  title?: string | null
  items: { name: string; says?: string | null; stages: { name: string; mark?: string | null }[] }[]
}

export function TheDonePage({
  firstName, checkInId, groundId, sessionNumber, myUserId, isInitiator, whatChanged,
}: {
  firstName: string | null | undefined
  checkInId: string
  groundId: string
  sessionNumber: number
  myUserId: string | null | undefined
  isInitiator: boolean
  whatChanged?: WhatChanged | null
}) {
  /* Read again now: the round may have closed with this answer, and this check-in's own read of
     how checkable it was is written as it completes. */
  const ground = useQuery({
    queryKey: ['ground', groundId, 'done'],
    queryFn: () => groundsApi.get(groundId),
    retry: false,
  })
  const mine = useQuery({
    queryKey: ['my-checkin-status', groundId, 'done'],
    queryFn: () => groundsApi.getMyCheckinStatus(groundId),
    /* The next session's row is written as this one completes; one retry covers the race. */
    retry: 2,
    retryDelay: 1500,
  })
  /* The sentence the session wrote about what to carry, which arrives about twenty seconds later. */
  const artifact = useQuery({
    queryKey: ['artifact', checkInId],
    queryFn: () => conversationApi.artifact(checkInId),
    retry: false,
    refetchInterval: (q: any) => (q.state.data?.artifact?.whatToCarry ? false : 5000),
  })

  const g: any = ground.data
  const leadName = whoElseAnswers(g)
  const next = whenTheNextOneOpens(mine.data?.checkIns, checkInId)
  /*
   * A PLAIN YES/NO FROM THE SERVER, NOT A COUNT OF `g.participants` (U.8 fifth review). That array
   * is reduced to this reader's own row alone on a check-in that hides peers from each other, so
   * counting it always read as a check-in of one there - "Two reports come from this" and the
   * team's report card silently vanished for exactly the readers a hidden check-in has more than
   * one of. `aTeamReportComes` is read off the raw participants before that filter runs.
   */
  const aTeamReport = !!g?.aTeamReportComes
  const roundIsIn = ((g?.roundCompletions ?? []) as { sessionNumber: number }[]).some(r => r.sessionNumber === sessionNumber)
  const carry: string | null = artifact.data?.artifact?.whatToCarry ?? null
  const thisOne = ((g?.checkIns ?? []) as any[]).find(c => c.id === checkInId)
  const dims: Record<string, string> | null = thisOne?.specificityDimensions ?? null
  const five = dims && Object.keys(dims).length > 0 ? THE_FIVE.map(f => ({ ...f, there: wasItThere(dims[f.key]) })) : null
  const changed = (whatChanged?.items ?? []).filter(i => i?.name && Array.isArray(i.stages))

  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '28px 16px 40px', display: 'grid', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--gw-serif, Georgia, serif)', fontWeight: 400, fontSize: 30, lineHeight: 1.2, color: 'var(--gw-text)' }}>
          {firstName ? `Done. Thanks, ${firstName}.` : 'Done. Thank you.'}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
          Your check-in is saved.{next ? ` ${next}` : ''}
        </p>
      </div>

      <section>
        {aTeamReport && <h2 style={h2}>Two reports come from this</h2>}
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, background: 'white' }}>
          <div style={{ padding: '14px 16px' }}>
            <div style={rowHead}>
              <h3 style={h3}>Your own report</h3>
              <Tag tone="plain">Only you</Tag>
            </div>
            <p style={p}>What you said today and what it shows. Ready now.</p>
            <div style={{ marginTop: 10 }}>
              <Button kind="secondary" wide to={`/checkin/${checkInId}/report`}>Read yours</Button>
            </div>
          </div>
          {aTeamReport && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--gw-border)' }}>
              <div style={rowHead}>
                <h3 style={h3}>The team’s report</h3>
                {!roundIsIn && <Tag tone="attention">Not shared yet</Tag>}
              </div>
              {roundIsIn ? (
                <>
                  <p style={p}>Everyone’s check-ins together.</p>
                  <div style={{ marginTop: 10 }}>
                    <Button kind="secondary" wide to={`/grounds/${groundId}/session/${sessionNumber}`}>Read it</Button>
                  </div>
                </>
              ) : (
                <p style={p}>Everyone’s check-ins together. You’ll get it once everyone has answered.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {changed.length > 0 && (
        <section style={card}>
          <h2 style={{ ...h3, marginBottom: 10 }}>{whatChanged?.title?.trim() || 'What changed'}</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {changed.map((c, i) => (
              <div key={c.name + i}>
                <div style={rowHead}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-text)' }}>{c.name}</span>
                  {c.says && <span style={{ fontSize: 13, color: 'var(--gw-sub)' }}>{c.says}</span>}
                </div>
                <StageLadder stages={c.stages} label={c.name} says={(c as any).stagesSays ?? undefined} />
              </div>
            ))}
          </div>
        </section>
      )}

      {(leadName || carry) && (
        <section style={{ borderRadius: 12, padding: '16px 18px', background: 'var(--gw-green-bg)' }}>
          <h2 style={{ ...h3, fontSize: 17, marginBottom: 8 }}>That’s saved</h2>
          {leadName && (
            <p style={p}>
              <strong>Why answering matters:</strong> {leadName} also answers a check-in. The report puts the answers side by side. It does not decide who is right.
            </p>
          )}
          {carry && <p style={{ ...p, marginTop: leadName ? 8 : 0 }}>One thing for next time: {carry}</p>}
        </section>
      )}

      {five && (
        <section style={card} aria-label="How checkable today’s check-in was">
          <h2 style={h3}>How checkable today’s check-in was</h2>
          {/*
            THE COUNT AND THE BAR ARE GONE, ON PURPOSE, NOT ONLY VISUALLY.

            "1 of 5" and a progress bar are a score, and request 45 to the engine workspace asks why
            the read itself misses real things a person said - a real check-in with dates, a number,
            a document and a named person waited on still came back "missing" on two dimensions. A
            score built on a read that is known to undercount is not honest to show, so it stays out
            until request 45 is answered. `SHOW_THE_COUNT` is the one line to flip back on; nothing
            else about this section depends on it.
          */}
          {SHOW_THE_COUNT && (
            <div style={rowHead}>
              <span />
              <span style={{ fontSize: 14, color: 'var(--gw-text)' }}>{five.filter(f => f.there).length} of 5</span>
            </div>
          )}
          <p style={{ ...p, marginTop: 8 }}>
            Groundwork looked for these five things. It may have missed some of what you said.
          </p>
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
            {five.map(f => (
              <li key={f.key} style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: 1.45, color: f.there ? 'var(--gw-text)' : 'var(--gw-sub)' }}>
                <span aria-hidden style={{ width: 14, flexShrink: 0, color: f.there ? 'var(--gw-green-t)' : 'var(--gw-sub-d)', fontWeight: 700 }}>{f.there ? '✓' : '○'}</span>
                {/*
                  NEVER A FACT ABOUT ABSENCE, BUT SAID OUT LOUD, NOT ONLY TO A SCREEN READER.

                  A sighted reader used to see only the icon and the same noun phrase either way -
                  "What you did, not just what was happening" - with the one word that actually
                  distinguished found from missing ("Groundwork found this." / "Groundwork did not
                  pick this up this time.") hidden in a screen-reader-only span. So the only visible
                  difference between "found" and "missing" was a filled or empty circle. Both readers
                  now get the same plain sentence.
                */}
                <span>
                  {f.there ? f.met : f.missing}. {f.there ? 'Groundwork found this.' : 'Groundwork did not pick this up this time.'}
                </span>
              </li>
            ))}
          </ul>
          <p style={{ ...p, fontSize: 13, color: 'var(--gw-sub)', marginTop: 10 }}>This is about the check-in. Only you see it.</p>
        </section>
      )}

      {/* For whoever runs it: who the round is still waiting on. Kept from the old finished screen. */}
      {isInitiator && <WhoIsStillOut groundId={groundId} sessionNumber={sessionNumber} myUserId={myUserId} />}
    </div>
  )
}

const h2: React.CSSProperties = { margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--gw-text)' }
const h3: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gw-text)' }
const p: React.CSSProperties = { margin: '4px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--gw-text)' }
const rowHead: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }
const card: React.CSSProperties = { border: '1px solid var(--gw-border)', borderRadius: 12, padding: '14px 16px', background: 'white' }
