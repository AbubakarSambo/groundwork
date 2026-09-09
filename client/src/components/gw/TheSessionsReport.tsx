import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { WhatSuccessLooksLike } from './WhatSuccessLooksLike'
import { HowMuchThereIsToGoOn } from './HowMuchThereIsToGoOn'

/**
 * ONE SESSION'S SHARED REPORT.
 *
 * Everything here is assembled server-side from what people actually said, typed at extraction.
 * Nothing on this screen was asked of a model.
 *
 * WHY THIS WAS REBUILT. It printed every quote twice. "What each person said they did" grouped the
 * lines by person and "What people said this session" grouped the same lines by theme, so one
 * party's block and the Progress and priorities block were word for word identical and the page
 * ran to about double the length it needed. Grouping is a view of one set of facts, not two sets,
 * so there is one rendering and a control that changes how it is grouped.
 *
 * The order below is the order somebody reads in: how much there is to go on, who it counts, the
 * four reads, the picture, then what was said, then what it means, then what to do.
 */

/** The themes, in the order the promise makes them. Server omits a section it cannot fill. */
const THEMES = ['Progress and priorities', 'Commitments', 'Risks and concerns', 'Asks']
const WHAT_MOVED = ['What changed since last session', 'What changed since the beginning']
const RESTS_ON = ['What this rests on']

/** Body copy is capped so a long quote does not run the full width of the container. */
const PROSE: React.CSSProperties = { maxWidth: '68ch', lineHeight: 1.6 }
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

/**
 * THE SHARED REPORT, IN THE SHAPE THE MARKETING PAGE PROMISES.
 *
 * The example reports on the marketing site are one card: a header line, the finding in amber with
 * its basis small underneath, the four states in a row, the words people gave as quotes with a
 * small cite, the two sides of a difference side by side, and one boxed thing to settle first. This
 * page had the same facts as eleven headings of prose. Every block below is one of the card's rows;
 * the facts and their sources are unchanged, only the shape is.
 */
const ROW: React.CSSProperties = { padding: '16px 20px', borderTop: '1px solid var(--gw-border)' }
const LABEL: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase',
  color: 'var(--gw-muted)', marginBottom: 10,
}

function Cite({ who, documented }: { who: string; documented?: boolean }) {
  return (
    <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gw-muted)' }}>
      {who}{documented ? ' · from a document' : ''}
    </div>
  )
}

/**
 * ONE LINE SOMEBODY SAID, AS A QUOTE WITH A NAME UNDER IT.
 * The reader's own lines used to arrive with no name at all, so the list read as three voices and
 * one anonymous one. A line with no name is the reader's, and says so.
 */
function Quotes({ items, yourName }: { items: { text: string; who?: string | null; documented?: boolean }[]; yourName: string | null }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div style={{ fontSize: 13.5, color: 'var(--gw-text)', fontStyle: 'italic', ...PROSE }}>{it.text}</div>
          <Cite who={it.who ?? (yourName ? `${yourName} (you)` : 'You')} documented={it.documented} />
        </div>
      ))}
    </div>
  )
}

function Row({ label, children, style }: { label?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...ROW, ...style }}>
      {label && <div style={LABEL}>{label}</div>}
      {children}
    </div>
  )
}
export function TheSessionsReport({ groundId, sessionNumber }: { groundId: string; sessionNumber: number }) {
  const [byPerson, setByPerson] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-shaped-report', groundId, sessionNumber],
    queryFn: () => reportsApi.sessionReport(groundId, sessionNumber),
    enabled: !!groundId && !!sessionNumber,
  })
  if (isLoading) return <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Reading this session…</div>
  if (isError || !data) return null
  const d = data as any
  const final = d.state === 'final'
  const amended = !!d.amendedAt
  const themed = (d.sections ?? []).filter((s: any) => THEMES.includes(s.title))
  const moved = (d.sections ?? []).filter((s: any) => WHAT_MOVED.includes(s.title))
  const restsOn = (d.sections ?? []).filter((s: any) => RESTS_ON.includes(s.title))
  const yourName: string | null = d.counting?.find((c: any) => c.isYou)?.who ?? null
  const answered = (d.counting ?? []).filter((c: any) => c.answered).length
  const ofPeople = (d.counting ?? []).length

  /*
    THE FINDING LEADS. The server ranks the drafted lines (something in the way, then a read on
    coverage or contribution, then a pattern) and names one. The lines the tiles already carry
    ('reads') and the settled-and-open line ('written', which has its own row below) are not
    repeated; the basis line sits small under the finding.
  */
  const picture: { key: string; text: string }[] = d.picture ?? ((d.pictureLines as string[] | undefined) ?? []).map((text, i) => ({ key: `line-${i}`, text }))
  const finding: { key: string; text: string; basis: string | null } | null = d.finding ?? null
  const rest = picture.filter((l) => l.key !== 'basis' && l.key !== 'reads' && l.key !== 'written' && l.key !== finding?.key)
  const settled: string[] = d.whereThingsStand?.settled ?? []
  const open: string[] = d.whereThingsStand?.open ?? []
  const definitions: { who: string | null; text: string }[] = d.againstSuccess?.definitions ?? []

  return (
    <div>
      {/* How much there is to go on. First, because it decides how to read everything under it. */}
      {d.confidence && <HowMuchThereIsToGoOn read={d.confidence} />}

      <div style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* The header line: what this is, and how many are in it. */}
        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <b style={{ fontSize: 14 }}>Session {d.sessionNumber} · {final ? 'closed' : 'still forming'}</b>
          <em style={{ fontFamily: MONO, fontStyle: 'normal', fontSize: 11, color: 'var(--gw-muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {ofPeople ? `${answered} of ${ofPeople} answered` : ''}
          </em>
        </div>

        {/* The finding, in amber. One sentence the engines stand behind, worded by the model. */}
        {finding && (
          <div style={{ padding: '20px 20px', background: 'var(--gw-amber-bg)', borderTop: '1px solid var(--gw-border)' }}>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.38, fontWeight: 600, letterSpacing: '-.012em', color: 'var(--gw-text)', maxWidth: '60ch' }}>{finding.text}</p>
            {finding.basis && <small style={{ display: 'block', marginTop: 9, fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.6 }}>{finding.basis}</small>}
          </div>
        )}

        {/* The four states, one grammar, same place every time. */}
        {d.atAGlance?.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderTop: '1px solid var(--gw-border)' }}>
            {d.atAGlance.map((r: any, i: number) => {
              const wantsAttention = r.tone === 'warn' || r.tone === 'bad'
              return (
                <div key={r.label} style={{ padding: '14px 18px', borderLeft: i > 0 ? '1px solid var(--gw-border)' : undefined }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gw-sub)', marginBottom: 5 }}>{r.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', color: wantsAttention ? 'var(--gw-amber-t)' : 'var(--gw-green-t)' }}>
                    {r.value}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 3, lineHeight: 1.45 }}>{r.sub}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* The rest of the picture, one claim per line. */}
        {rest.length > 0 && (
          <Row label="The picture from everybody">
            <div style={{ display: 'grid', gap: 8 }}>
              {rest.map((l) => (
                <p key={l.key} style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{l.text}</p>
              ))}
            </div>
          </Row>
        )}

        {/* What keeps showing up: the pattern engine's own sentences, with the span that makes them a pattern. */}
        {d.patterns?.length > 0 && (
          <Row label="What keeps showing up">
            <div style={{ display: 'grid', gap: 10 }}>
              {d.patterns.map((p: any, i: number) => (
                <div key={i}>
                  <div style={{ fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{p.signal}</div>
                  <Cite who={`${p.isYou ? `${p.who} (you)` : p.who} · seen across ${p.periodsObserved} session${p.periodsObserved === 1 ? '' : 's'}${p.positive ? ' · a good sign' : ''}`} />
                </div>
              ))}
            </div>
          </Row>
        )}

        {/* What people said this session. Quotes with a name under each, by theme or by person. */}
        {themed.length > 0 && (
          <Row>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <div style={LABEL}>What people said this session</div>
              <button
                onClick={() => setByPerson(v => !v)}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12, color: 'var(--gw-navy)', textDecoration: 'underline', flexShrink: 0,
                }}
              >
                {byPerson ? 'Group by theme' : 'Group by person'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px 28px' }}>
              {byPerson
                ? (d.whatEachPersonSaid ?? []).map((p: any, i: number) => (
                  <div key={i}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 8 }}>{p.isYou ? `${p.who} (you)` : p.who}</div>
                    {p.lines?.length
                      ? <Quotes items={p.lines.map((text: string) => ({ text, who: p.isYou ? `${p.who} (you)` : p.who }))} yourName={yourName} />
                      : <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', ...PROSE }}>{p.saying}</div>}
                  </div>
                ))
                : themed.map((s: any) => (
                  <div key={s.title}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 8 }}>{s.title}</div>
                    {s.items.length > 0
                      ? <Quotes items={s.items} yourName={yourName} />
                      : <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', ...PROSE }}>{s.saying}</div>}
                    {s.note && (
                      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 7 }}>{s.note}</div>
                    )}
                  </div>
                ))}
            </div>
          </Row>
        )}

        {/* Settled and still open, side by side: the two columns of the difference. */}
        {(settled.length > 0 || open.length > 0) ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 1, background: 'var(--gw-border)', borderTop: '1px solid var(--gw-border)' }}>
            <div style={{ background: 'var(--gw-card)', padding: '16px 20px' }}>
              <div style={LABEL}>Settled</div>
              {settled.length
                ? settled.map((t, i) => <p key={i} style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{t}</p>)
                : <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-muted)' }}>Nothing settled yet.</p>}
            </div>
            <div style={{ background: 'var(--gw-card)', padding: '16px 20px' }}>
              <div style={LABEL}>Still open</div>
              {open.length
                ? open.map((t, i) => <p key={i} style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{t}</p>)
                : <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-muted)' }}>Nothing still open.</p>}
            </div>
          </div>
        ) : d.whereThingsStand?.saying ? (
          <Row label="Where this stands">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-sub)', ...PROSE }}>{d.whereThingsStand.saying}</p>
          </Row>
        ) : null}

        {/*
          WHAT GOOD LOOKS LIKE. The honest line about whether there is anything to read against
          stays visible. The four "X says it is..." lines used to sit under it in the open, saying
          the same thing a second way; they fold, and the count on the fold says how many there are.
        */}
        {d.againstSuccess && (
          <Row label="Against what good looks like">
            {/* The definitions render folded below, once; the component's own copy of them is switched off. */}
            <WhatSuccessLooksLike data={{ ...d.againstSuccess, definitions: [] }} yourName={yourName} dense />
            {definitions.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--gw-navy)' }}>
                  What each person says success is ({definitions.length})
                </summary>
                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  {definitions.map((def, i) => {
                    const who = def.who === null || (yourName && def.who === yourName) ? (yourName ? `${yourName} (you)` : 'You') : def.who
                    return (
                      <div key={i}>
                        <div style={{ fontSize: 13.5, color: 'var(--gw-text)', fontStyle: 'italic', ...PROSE }}>{def.text}</div>
                        <Cite who={who!} />
                      </div>
                    )
                  })}
                </div>
              </details>
            )}
          </Row>
        )}

        {/* What moved. The server sends nothing here on a first session. */}
        {moved.length > 0 && (
          <Row label="What moved">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px 28px' }}>
              {moved.map((s: any) => (
                <div key={s.title}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 8 }}>{s.title}</div>
                  {s.items.length > 0
                    ? <Quotes items={s.items} yourName={yourName} />
                    : <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', ...PROSE }}>{s.saying}</div>}
                </div>
              ))}
            </div>
          </Row>
        )}

        {/* The documents, when there are any. When there are none it is a reason under confidence. */}
        {restsOn.length > 0 && restsOn[0].items.length > 0 && (
          <Row label="What this rests on">
            <Quotes items={restsOn[0].items} yourName={yourName} />
          </Row>
        )}

        {/* The one thing to settle first. From the blocker kind or the role map; never a model over the transcript. */}
        {d.theConversationWorthHaving ? (
          <div style={{ padding: 20, background: 'var(--gw-blue-bg)', borderTop: '1px solid var(--gw-border)' }}>
            <div style={{ ...LABEL, color: 'var(--gw-navy)', marginBottom: 6 }}>The conversation worth having now</div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, fontWeight: 600, color: 'var(--gw-text)', maxWidth: '60ch' }}>{d.theConversationWorthHaving}</p>
          </div>
        ) : d.whyNoQuestion ? (
          <Row label="The conversation worth having now">
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-muted)', ...PROSE }}>{d.whyNoQuestion}</p>
          </Row>
        ) : null}

        <div style={{ ...ROW, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          {!final
            ? 'People are still answering, so this moves. '
            : amended
              ? `Closed ${d.takenAt ? new Date(d.takenAt).toLocaleDateString() : ''} and updated since, when somebody corrected their own check-in. `
              : `Closed ${d.takenAt ? new Date(d.takenAt).toLocaleDateString() : ''}. This does not change. `}
          {d.showsEverybody
            ? 'Everybody in this check-in sees this same report, at the same moment. Nothing here decides who is right.'
            : 'Until the shared report is out, the words above are your own. The counts are from everybody\'s answers. Nobody else\'s wording reaches you and yours does not reach them.'}
        </div>
      </div>
    </div>
  )
}
