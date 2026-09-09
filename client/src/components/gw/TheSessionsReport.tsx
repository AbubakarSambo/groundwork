import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { Sec } from './kit'
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
const PROSE: React.CSSProperties = { maxWidth: '68ch', lineHeight: 1.65 }

/** Attribution is metadata. Same size, same colour, same place, every time. */
function Who({ who, documented }: { who?: string | null; documented?: boolean }) {
  if (!who && !documented) return null
  return (
    <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 2 }}>
      {who ?? ''}{who && documented ? ' · ' : ''}{documented ? 'from a document' : ''}
    </div>
  )
}

/**
 * WHAT SOMEBODY SAID, AS BODY TEXT.
 *
 * THE RAIL IS GONE. A vertical bar with indented text is the visual grammar of verbatim speech,
 * and it was being used for three different kinds of content at once: the quotes, the settled and
 * open items, and the success statements. Two of those three are synthesis - the product's words
 * about what people said, not the words themselves - so the rail was telling the reader that a
 * summary was a quotation.
 *
 * It survives on the private half, where the member's own words legitimately appear.
 *
 * These lists also read LIGHTER than the tiles and the picture above them, which is the point of
 * taking the borders off: after the rails came off, the whole stretch was undifferentiated body
 * text at one weight, so nothing led.
 */
function Lines({ items }: { items: { text: string; who?: string | null; documented?: boolean }[] }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', ...PROSE }}>{it.text}</div>
          <Who who={it.who} documented={it.documented} />
        </div>
      ))}
    </div>
  )
}

export function TheSessionsReport({ groundId, sessionNumber }: { groundId: string; sessionNumber: number }) {
  /*
   * ONE SET OF FACTS, TWO WAYS TO LOOK AT IT. The toggle re-groups what is already on the page
   * rather than adding a second section, which is what the duplication was.
   */
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

  return (
    <div>
      {/*
        WHAT STATE THIS IS IN, IN ONE LINE INSTEAD OF TWO CONTRADICTORY ONES.

        "Session 1 · final - Closed 09/09/2026. This does not change." sat directly above an amber
        banner saying the report had been updated. Both were true of different things and read as
        the product contradicting itself in consecutive lines. A closed round that was later
        amended is one state, so it is one sentence, and the amber banner is gone: it named the
        categories that could change rather than what did.
      */}
      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          borderBottom: '1px solid var(--gw-border)', paddingBottom: 10, marginBottom: 22,
        }}
      >
        <span style={{ fontSize: 12.5, color: 'var(--gw-text)', fontWeight: 700 }}>
          Session {d.sessionNumber} · {final ? 'closed' : 'still forming'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
          {!final
            ? 'People are still answering, so this moves.'
            : amended
              ? `Closed ${d.takenAt ? new Date(d.takenAt).toLocaleDateString() : ''} and updated since, when somebody corrected their own check-in.`
              : `Closed ${d.takenAt ? new Date(d.takenAt).toLocaleDateString() : ''}. This does not change.`}
        </span>
      </div>

      {/* 6. How much there is to go on. First, because it decides how to read everything under it. */}
      {d.confidence && <HowMuchThereIsToGoOn read={d.confidence} />}

      {/* 7. Who this is counting. */}
      {d.counting?.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <Sec title="Who this is counting" />
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, overflow: 'hidden' }}>
            {d.counting.map((c: any, i: number) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
                  padding: '8px 12px', fontSize: 12.5,
                  borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined,
                }}
              >
                <span style={{ color: 'var(--gw-text)' }}>{c.isYou ? `${c.who} (you)` : c.who}</span>
                <span style={{ color: 'var(--gw-muted)', flexShrink: 0 }}>
                  {c.answered ? 'Answered' : 'Not answered yet'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/*
        8. THE FOUR READS.

        All four used to render identically, so "no blockers noted" looked like the same kind of
        fact as "1 unresolved" and the row read as four failures. The server sends a tone with each
        one now. It is carried in weight rather than in a second colour: one accent on this page.
      */}
      {d.atAGlance?.length > 0 && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 30 }}>
          {d.atAGlance.map((r: any) => {
            const wantsAttention = r.tone === 'warn' || r.tone === 'bad'
            return (
              <div
                key={r.label}
                style={{
                  border: '1px solid var(--gw-border)', borderRadius: 12, background: 'var(--gw-card)',
                  padding: '13px 15px',
                  borderLeft: wantsAttention ? '3px solid var(--gw-navy)' : '1px solid var(--gw-border)',
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--gw-muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, color: wantsAttention ? 'var(--gw-navy)' : 'var(--gw-text)' }}>
                  {r.value}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 4, lineHeight: 1.5 }}>{r.sub}</div>
              </div>
            )
          })}
        </section>
      )}

      {/* 9. The picture from the accounts. Carries weight: it is the thing the report is for. */}
      {d.sharedPicture && (
        <section style={{ marginBottom: 30 }}>
          <Sec title="The picture from everybody" />
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, background: 'var(--gw-card)', padding: '15px 17px' }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{d.sharedPicture}</p>
          </div>
        </section>
      )}

      {/* 10. What people said this session. Themed, with the by-person toggle. One rendering. */}
      {themed.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <Sec title="What people said this session" />
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

          {byPerson ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {(d.whatEachPersonSaid ?? []).map((p: any, i: number) => (
                <div key={i}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>
                    {p.isYou ? `${p.who} (you)` : p.who}
                  </div>
                  {p.lines?.length
                    ? <Lines items={p.lines.map((text: string) => ({ text }))} />
                    : <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', ...PROSE }}>{p.saying}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {themed.map((s: any) => (
                <div key={s.title}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>{s.title}</div>
                  {s.items.length > 0
                    ? <Lines items={s.items} />
                    : <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', ...PROSE }}>{s.saying}</div>}
                  {/*
                    Risks and concerns groups by entry type, so it fills up with whoever names
                    problems out loud. The server decides when that is worth saying; usually there
                    is nothing here.
                  */}
                  {s.note && (
                    <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.55, marginTop: 7, paddingLeft: 13 }}>
                      {s.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/*
        11 AND 12, WHICH WERE THE SAME QUESTION IN THREE FORMATS.

        "Where things stand" was four labels around two facts: a heading, a count line, a "Settled"
        sub-heading, the item, a "Still open" sub-heading, the item - with the counts already sitting
        in a tile two sections up. Then "What success looks like" answered the same question again in
        a third format: the honest line about the lead not having stated theirs, and a bold-name
        em-dash list of what each person says it is.

        One section. Each line carries its own state and there are no sub-headings, because two lines
        that say "settled" and "still open" do not need labels saying so. The honest line about the
        lead stays - that absence is the point of it - and loses its own layout.
      */}
      <section style={{ marginBottom: 30 }}>
        <Sec title="Where this stands, against what good looks like" />

        {(d.whereThingsStand.settled ?? []).map((t: string, i: number) => (
          <p key={`s${i}`} style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--gw-text)', ...PROSE }}>
            <b style={{ fontWeight: 700 }}>Settled.</b> {t}
          </p>
        ))}
        {(d.whereThingsStand.open ?? []).map((t: string, i: number) => (
          <p key={`o${i}`} style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--gw-text)', ...PROSE }}>
            <b style={{ fontWeight: 700 }}>Still open.</b> {t}
          </p>
        ))}
        {!(d.whereThingsStand.settled?.length || d.whereThingsStand.open?.length) && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--gw-sub)', ...PROSE }}>
            {d.whereThingsStand.saying}
          </p>
        )}

        {d.againstSuccess && (
          <div style={{ marginTop: 12 }}>
            <WhatSuccessLooksLike
              data={d.againstSuccess}
              yourName={d.counting?.find((c: any) => c.isYou)?.who ?? null}
              dense
            />
            {(d.againstSuccess.definitions ?? []).length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {d.againstSuccess.definitions.map((def: any, i: number) => {
                  const yourName = d.counting?.find((c: any) => c.isYou)?.who ?? null
                  const who = def.who === null || (yourName && def.who === yourName) ? 'You' : def.who
                  return (
                    <p key={i} style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-sub)', ...PROSE }}>
                      {who} say{who === 'You' ? '' : 's'} it is {def.text}
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 13. What moved. The server sends nothing here on a first session. */}
      {moved.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <Sec title="What moved" />
          <div style={{ display: 'grid', gap: 16 }}>
            {moved.map((s: any) => (
              <div key={s.title}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>{s.title}</div>
                {s.items.length > 0
                  ? <Lines items={s.items} />
                  : <div style={{ fontSize: 12.5, color: 'var(--gw-muted)', ...PROSE }}>{s.saying}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The documents, when there are any. When there are none it is a reason under confidence. */}
      {restsOn.length > 0 && restsOn[0].items.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <Sec title="What this rests on" />
          <Lines items={restsOn[0].items} />
        </section>
      )}

      {/* 14. The conversation worth having now. */}
      {d.theConversationWorthHaving && (
        <section style={{ marginBottom: 30 }}>
          <Sec title="The conversation worth having now" />
          <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, background: 'var(--gw-card)', padding: '15px 17px' }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{d.theConversationWorthHaving}</p>
          </div>
        </section>
      )}

      {!d.showsEverybody && (
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', lineHeight: 1.6, borderTop: '1px solid var(--gw-border)', paddingTop: 12 }}>
          Until the shared report is out, the words above are your own. The counts are from
          everybody's answers. Nobody else's wording reaches you and yours does not reach them.
        </div>
      )}
    </div>
  )
}
