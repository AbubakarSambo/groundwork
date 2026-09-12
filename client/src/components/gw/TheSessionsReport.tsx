import { useState } from 'react'
import { Folded } from './two-accounts-side-by-side'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { WhatSuccessLooksLike } from './WhatSuccessLooksLike'
import { HowMuchThereIsToGoOn } from './HowMuchThereIsToGoOn'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

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
/**
 * THE TWO SECTIONS THIS PAGE NO LONGER DRAWS, NAMED SO NOTHING DRAWS THEM BY ACCIDENT.
 *
 * "What changed since last session" and "what changed since the beginning" are distances between
 * two points. This is the report for one of them. They are on the board, which is the surface
 * about the whole run. The server still sends them; this page refuses them by name rather than by
 * silence, so a later change to the section list cannot quietly put them back.
 */
const NOT_ON_A_SESSION = ['What changed since last session', 'What changed since the beginning']
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

/**
 * WHAT A PHONE CHANGES ON THIS PAGE, AND IT IS NOT THE TYPE SIZE OF THE BODY.
 *
 * Two blocks were read back as too big to take in on a phone, and both for the same reason: they
 * are sized for a SHORT string and the real ones are not short.
 *
 * The finding is set at 16.5px semi-bold because on a laptop it is one line that has to be the
 * first thing anybody sees. The finding this board actually produced runs to two sentences - "the
 * role was never clearly defined, so there is no boundary to measure work against. Define what
 * this role owns before reading anything into where work is landing." At display size on a 375px
 * column that is eight lines of heavy type before the reader has reached anything else.
 *
 * At a glance has the same shape of problem: four tiles whose sub-clause is a whole sentence, in a
 * grid that collapses to one column, so a block meant to be glanced at becomes a screen of its
 * own. It keeps its clause - a tile that is a label and a figure is a scoreboard - and loses the
 * padding and the display-size figure.
 *
 * Nothing is cut. A phone gets the same words at a size that lets somebody read them.
 */
const SHEET = `
.gw-sr .gw-find     { font-size: 16.5px; line-height: 1.4; font-weight: 600; }
.gw-sr .gw-find-why { font-size: 12.5px; line-height: 1.6; }
.gw-sr .gw-tile     { padding: 14px 18px; }
.gw-sr .gw-tile-n   { border-left: 1px solid var(--gw-border); }
.gw-sr .gw-tile-v   { font-size: 17px; font-weight: 800; line-height: 1.15; }
.gw-sr .gw-tile-l   { font-size: 11.5px; font-weight: 700; }
.gw-sr .gw-tile-s   { font-size: 12px; line-height: 1.45; }
@media (max-width: 640px) {
  .gw-sr .gw-find     { font-size: 15px; line-height: 1.5; font-weight: 600; }
  .gw-sr .gw-find-why { font-size: 13px; }
  /* Stacked, the divider is the rule ABOVE each tile, not a stripe down its left edge. */
  .gw-sr .gw-tile     { padding: 12px 16px; }
  .gw-sr .gw-tile-n   { border-left: none; border-top: 1px solid var(--gw-border); }
  .gw-sr .gw-tile-v   { font-size: 16px; }
  .gw-sr .gw-tile-l   { font-size: 12px; }
  .gw-sr .gw-tile-s   { font-size: 13px; line-height: 1.5; }
}
`
const LABEL: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase',
  color: 'var(--gw-muted)', marginBottom: 10,
}

function Cite({ who, documented, figureIs }: { who: string; documented?: boolean; figureIs?: string }) {
  return (
    <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gw-muted)' }}>
      {who}{documented ? ' · from a document' : ''}
      {/*
        A FIGURE THE READER CANNOT CHECK SAYS SO, BESIDE THE LINE AND NOWHERE ELSE.

        "About a third of the way there I would say" and a count read off a system arrive here as
        two sentences with numbers in them. On the page somebody uses to decide what to do about a
        person, they look identical. This says which; it is about the figure, never about them.
      */}
      {figureIs ? <span style={{ color: 'var(--gw-amber-t)' }}> · {figureIs}</span> : null}
    </div>
  )
}

/**
 * ONE LINE SOMEBODY SAID, AS A QUOTE WITH A NAME UNDER IT.
 * The reader's own lines used to arrive with no name at all, so the list read as three voices and
 * one anonymous one. A line with no name is the reader's, and says so.
 */
function Quotes({ items, yourName }: { items: { text: string; who?: string | null; documented?: boolean; figureIs?: string }[]; yourName: string | null }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div style={{ fontSize: 13.5, color: 'var(--gw-text)', fontStyle: 'italic', ...PROSE }}>{it.text}</div>
          <Cite who={it.who == null || it.who === yourName ? (yourName ? `${yourName} (you)` : 'You') : it.who} documented={it.documented} figureIs={it.figureIs} />
        </div>
      ))}
    </div>
  )
}

/**
 * ONE BLOCK OF THE SHARED REPORT, NUMBERED AND ANNOTATED LIKE THE TEMPLATE.
 *
 * The template's signature is that every block carries three things on one line: its number, its
 * name, and a short note on the right saying what the block is FOR. The page had only the name, so
 * seven blocks read as seven headings rather than as a report with a shape - and a reader could not
 * tell that "where things stand" is the second of seven rather than something that happened to be
 * next.
 *
 * The number is the block's position in `THE_ORDER` on the server, written here because the page
 * draws them in that order. `note` is the right-hand half and is never decoration: it says what the
 * block is for, which is the thing a first-time reader does not have.
 */
function Row({ n, label, note, children, style }: {
  n?: number
  label?: string
  note?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{ ...ROW, ...style }}>
      {label && (
        <div style={{ ...LABEL, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span>
            {/* The space is real, not a margin: a screen reader announces "zero two against what
                good looks like" only if there is one. */}
            {n != null && <span style={{ color: 'var(--gw-muted)', marginRight: 8 }}>{String(n).padStart(2, '0')}{' '}</span>}
            {label}
          </span>
          {note && <span style={{ color: 'var(--gw-sub)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{note}</span>}
        </div>
      )}
      {children}
    </div>
  )
}
/**
 * REBUILT TO THE TEMPLATE, rather than adjusted toward it.
 *
 * The previous version was the old page with its order changed and its labels annotated, and it
 * still did not read like the thing it was meant to be. Told so twice. The difference is not a
 * list of tweaks: the template is a CARD with a finding at the top, four states in a row, numbered
 * blocks with a note each, and the long material folded away until somebody asks for it. The old
 * page was eleven open sections of prose with headings.
 *
 * EVERY RULE THE OLD ONE HELD IS HELD HERE, and they are the reason this is a rebuild of the
 * rendering rather than of the product: no grade on any named person, no run read on a page about
 * one session, the two sections that belong to the board refused by name, nothing reading the
 * parties array, and the state word on a forming report so nobody thinks they are reading a final
 * one.
 *
 * WHAT IS FOLDED, AND WHY THOSE. What everybody agrees, what each person said, and what this rests
 * on. Each is long, each is the part nobody needs twice, and each is still every word it was - a
 * fold is not a deletion, and the summary line says how much is behind it.
 */
export function TheSessionsReport({ groundId, sessionNumber }: { groundId: string; sessionNumber: number }) {
  const [byPerson, setByPerson] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-shaped-report', groundId, sessionNumber],
    queryFn: () => reportsApi.sessionReport(groundId, sessionNumber),
    enabled: !!groundId && !!sessionNumber,
  })
  /* The read is computed when asked for and takes ten to twenty seconds. Say so, or it looks stuck. */
  if (isLoading) return <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Reading everybody&apos;s side of this session. It takes a moment.</div>
  if (isError || !data) return null
  const d = data as any

  const final = d.state === 'final'
  const amended = !!d.amendedAt
  const yourName: string | null = d.counting?.find((c: any) => c.isYou)?.who ?? null
  const answered = (d.counting ?? []).filter((c: any) => c.answered).length
  const ofPeople = (d.counting ?? []).length

  /* The board's two sections, refused by name rather than by silence: a later change to the section
     list cannot quietly put a run read back onto the page about one session. */
  const themed = (d.sections ?? [])
    .filter((x: any) => THEMES.includes(x.title) && !NOT_ON_A_SESSION.includes(x.title))
  const restsOn = (d.sections ?? []).filter((x: any) => RESTS_ON.includes(x.title))

  const settled: string[] = d.whereThingsStand?.settled ?? []
  const open: string[] = d.whereThingsStand?.open ?? []
  const definitions: { who: string | null; text: string }[] = d.againstSuccess?.definitions ?? []
  const finding: { key: string; text: string; basis: string | null; wouldHaveSurfaced?: string | null } | null = d.finding ?? null
  const picture: { key: string; text: string }[] = d.picture ?? (d.pictureLines ?? []).map((t: string, i: number) => ({ key: `l${i}`, text: t }))
  const rest = picture.filter((l) => l.key !== 'basis' && l.key !== 'reads' && l.key !== 'written' && l.key !== finding?.key)

  /* Numbered by what is DRAWN. Fixed numbers skip when a block has nothing, and 02 · 04 · 05 reads
     as pieces missing rather than as a report with four blocks. */
  let step = 0
  const next = () => (step += 1)

  return (
    <div className="gw-sr" style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
      <style>{SHEET}</style>

      {/* ── The masthead: what this is for, and where you are in it. */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gw-text)', lineHeight: 1.3 }}>
          {d.againstSuccess?.stated?.trim() || `Session ${d.sessionNumber}`}
        </div>
        <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)' }}>
          {[
            ofPeople ? `${ofPeople} ${ofPeople === 1 ? 'person' : 'people'}` : '',
            `check-in ${d.sessionNumber}${d.plannedSessions ? ` of ${d.plannedSessions}` : ''}`,
            final ? 'closed' : answered >= ofPeople && ofPeople > 0 ? 'everyone answered' : `still forming · ${answered} of ${ofPeople} answered`,
          ].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/*
        WHO IS COUNTED, AND WHICH OF THEM IS YOU.
        
        Part of the masthead rather than a numbered block: the header says how many people, and
        this says whose. It names people rather than printing a number, says which one the reader
        is, and never counts somebody who was never going to answer - all three are the rule this
        row exists for, and I dropped the whole row in the rebuild before a spec caught it.
      */}
      {(d.counting ?? []).length > 0 && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gw-border)', display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
          {d.counting.map((c: any, i: number) => (
            <span key={i} style={{ fontSize: 12.5, color: 'var(--gw-text)' }}>
              <b style={{ fontWeight: 700 }}>{c.isYou ? `${c.who} (you)` : c.who}</b>
              <span style={{ color: 'var(--gw-sub)' }}> · {c.answered ? 'Answered' : 'Not answered yet'}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── The finding, first and alone. One sentence the engines stand behind. */}
      {finding && (
        <div style={{ padding: '16px 20px', background: 'var(--gw-amber-bg)', borderTop: '1px solid var(--gw-border)' }}>
          <div style={{ ...LABEL, color: 'var(--gw-amber-t)', marginBottom: 8 }}>The finding</div>
          <p className="gw-find" style={{ margin: 0, color: 'var(--gw-text)', maxWidth: '58ch' }}>{finding.text}</p>
          {finding.basis && (
            <small className="gw-find-why" style={{ display: 'block', marginTop: 8, color: 'var(--gw-amber-t)' }}>{finding.basis}</small>
          )}
          {/* When it would have come up on its own. Under the finding and nowhere else: alone it is a
              remark about a calendar; here it is why the finding matters now rather than later. */}
          {finding.wouldHaveSurfaced && (
            <small className="gw-find-why" style={{ display: 'block', marginTop: 6, color: 'var(--gw-amber-t)', opacity: .85 }}>
              {finding.wouldHaveSurfaced}
            </small>
          )}
        </div>
      )}

      {/* ── At a glance. Four states in a row, each a whole clause about what its number is of. */}
      {(d.atAGlance ?? []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', borderTop: '1px solid var(--gw-border)' }}>
          {d.atAGlance.map((r: any, i: number) => (
            <div key={r.label} className={i > 0 ? 'gw-tile gw-tile-n' : 'gw-tile'}>
              <div className="gw-tile-l" style={{ color: 'var(--gw-sub-d)', marginBottom: 4 }}>{r.label}</div>
              <div className="gw-tile-v" style={{ color: r.tone === 'good' ? 'var(--gw-green-t)' : r.tone === 'watch' ? 'var(--gw-amber-t)' : 'var(--gw-text)' }}>{r.value}</div>
              {/* `sub` is the whole clause saying what the number is OF - a tile that is a label
                  and a figure is a scoreboard, and the clause is what stops it being one. */}
              {r.sub && <div className="gw-tile-s" style={{ color: 'var(--gw-sub)', marginTop: 4 }}>{r.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── 01 · what this sits under, where anything does. It qualifies the objective, so it leads. */}
      {d.cascade && (
        <Row n={next()} note="what the objective serves" label={d.cascade.isCascade ? 'What this sits under' : 'Nothing above this'}>
          {d.cascade.parentNamed && (
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--gw-text)', lineHeight: 1.35 }}>{d.cascade.parentNamed}</p>
          )}
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-sub)', ...PROSE }}>{d.cascade.why}</p>
        </Row>
      )}

      {/* ── What this is for. The full band: the stated objective and each person's own version. */}
      {d.againstSuccess && (
        <Row n={next()} note="the objective, and each person's own version of it" label="Against what good looks like">
          <WhatSuccessLooksLike data={{ ...d.againstSuccess, definitions: [] }} yourName={yourName} headingIsTheCallers />
          {definitions.length > 0 && (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {definitions.map((def, i) => (
                <div key={i}>
                  <div style={{ fontSize: 13.5, color: 'var(--gw-text)', fontStyle: 'italic', ...PROSE }}>{def.text}</div>
                  <Cite who={def.who === null || (yourName && def.who === yourName) ? (yourName ? `${yourName} (you)` : 'You') : def.who!} />
                </div>
              ))}
            </div>
          )}
        </Row>
      )}

      {/* ── Where things stand. Still open leads: it is the half somebody can act on. */}
      {(settled.length > 0 || open.length > 0) && (
        <Row n={next()} note="what is not settled, and what is" label="Where things stand">
          <div style={{ display: 'grid', gap: 8 }}>
            {open.length
              ? open.map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 10, alignItems: 'start' }}>
                  <span aria-hidden style={{ marginTop: 6, width: 6, height: 6, borderRadius: 3, background: 'var(--gw-amber-b)' }} />
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{t}</p>
                </div>
              ))
              : <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-sub)' }}>Nothing is open. Everything anybody raised has been settled.</p>}
          </div>
          {settled.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Folded summary={`What everybody agrees (${settled.length})`}>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {settled.map((t, i) => <p key={i} style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{t}</p>)}
                </div>
              </Folded>
            </div>
          )}
        </Row>
      )}

      {/* ── What each person said they did. Folded: long, and their own work only. */}
      {themed.length > 0 && (
        <Row n={next()} label="What people said this session">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: -4, marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>Each person&apos;s own work, in their own words.</span>
            <button
              onClick={() => setByPerson(v => !v)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--gw-navy)', textDecoration: 'underline', flexShrink: 0 }}
            >
              {byPerson ? 'Group by theme' : 'Group by person'}
            </button>
          </div>
          <Folded summary={byPerson ? `What each of the ${(d.whatEachPersonSaid ?? []).length} said` : `All ${themed.length} groups`}>
            <div style={{ display: 'grid', gap: 16, marginTop: 10 }}>
              {byPerson
                ? (d.whatEachPersonSaid ?? []).map((p: any, i: number) => (
                  <div key={i}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>
                      {p.isYou ? `${p.who} (you)` : p.who}
                    </div>
                    {p.saying && <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', ...PROSE }}>{p.saying}</div>}
                    {p.lines?.length ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {p.lines.map((l: string, j: number) => (
                          <div key={j} style={{ fontSize: 13.5, color: 'var(--gw-text)', fontStyle: 'italic', ...PROSE }}>{l}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
                : themed.map((sec: any) => (
                  <div key={sec.title}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 8 }}>{sec.title}</div>
                    {sec.items.length > 0
                      ? <Quotes items={sec.items} yourName={yourName} />
                      : <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', ...PROSE }}>{sec.saying}</div>}
                    {sec.note && <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8, ...PROSE }}>{sec.note}</div>}
                  </div>
                ))}
            </div>
          </Folded>
        </Row>
      )}

      {/* ── The picture from everybody. The long read of the finding, after the sharp part. */}
      {rest.length > 0 && (
        <Row n={next()} note="the long read of the finding above" label="The picture from everybody">
          <div style={{ display: 'grid', gap: 10 }}>
            {rest.map((l) => <p key={l.key} style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{l.text}</p>)}
          </div>
        </Row>
      )}

      {/* ── What went quiet. Somebody was waiting on it and nobody has said it is resolved. */}
      {d.whatWentQuiet && (
        <Row n={next()} note="waiting on somebody, and gone quiet" label="Not raised again">
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{d.whatWentQuiet}</p>
        </Row>
      )}

      {/* ── The one conversation worth having. Boxed, because it is the thing to do next. */}
      {d.theConversationWorthHaving ? (
        <div style={{ padding: '18px 20px', background: 'var(--gw-blue-bg)', borderTop: '1px solid var(--gw-border)' }}>
          <div style={{ ...LABEL, color: 'var(--gw-navy)', marginBottom: 6 }}>
            <span style={{ color: 'var(--gw-navy)', opacity: .6, marginRight: 8 }}>{String(next()).padStart(2, '0')}{' '}</span>
            The conversation worth having now
          </div>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.45, fontWeight: 600, color: 'var(--gw-text)', maxWidth: '58ch' }}>{d.theConversationWorthHaving}</p>
        </div>
      ) : d.whyNoQuestion ? (
        <Row n={next()} note="the one thing to settle first" label="The conversation worth having now">
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-sub)', ...PROSE }}>{d.whyNoQuestion}</p>
        </Row>
      ) : null}

      {/* ── What this rests on. The method, last and folded: a caveat above what it qualifies is
             read as a verdict on it. */}
      <Row n={next()} note="how solid this is, and what it is built from" label="What this rests on">
        <Folded summary="How much there is to go on, and what it is built from">
          <div style={{ marginTop: 10 }}>
            {d.confidence && <HowMuchThereIsToGoOn read={d.confidence} />}
            {restsOn.map((sec: any) => (
              <div key={sec.title} style={{ marginTop: 12 }}>
                {sec.items.length > 0
                  ? <Quotes items={sec.items} yourName={yourName} />
                  : <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', ...PROSE }}>{sec.saying}</div>}
              </div>
            ))}
          </div>
        </Folded>
      </Row>

      {/* ── The promise, and what state this is in. */}
      <div style={{ ...ROW, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
        {!final
          ? 'People are still answering, so this moves. '
          : amended
            ? `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''} and updated since, when somebody corrected their own check-in. `
            : `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''}. This does not change. `}
        {d.showsEverybody
          ? 'Everybody in this check-in reads this same report. Nothing here decides who is right.'
          : 'Until the shared report is out, the words above are your own. The counts are from everybody’s answers. Nobody else’s wording reaches you and yours does not reach them.'}
      </div>
    </div>
  )
}
