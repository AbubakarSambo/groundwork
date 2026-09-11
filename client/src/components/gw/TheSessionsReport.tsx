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
          <Cite who={it.who == null || it.who === yourName ? (yourName ? `${yourName} (you)` : 'You') : it.who} documented={it.documented} />
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
  /* The read is computed when asked for and takes ten to twenty seconds. Say so, or it looks stuck. */
  if (isLoading) return <div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>Reading everybody's side of this session. It takes a moment.</div>
  if (isError || !data) return null
  const d = data as any
  const final = d.state === 'final'
  const amended = !!d.amendedAt
  const themed = (d.sections ?? [])
    .filter((s: any) => THEMES.includes(s.title) && !NOT_ON_A_SESSION.includes(s.title))
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
  const finding: { key: string; text: string; basis: string | null; wouldHaveSurfaced?: string | null } | null = d.finding ?? null
  const rest = picture.filter((l) => l.key !== 'basis' && l.key !== 'reads' && l.key !== 'written' && l.key !== finding?.key)
  const settled: string[] = d.whereThingsStand?.settled ?? []
  const open: string[] = d.whereThingsStand?.open ?? []
  const definitions: { who: string | null; text: string }[] = d.againstSuccess?.definitions ?? []

  return (
    <div>
      {/*
        HOW MUCH THERE IS TO GO ON MOVED TO THE FOOT, AND THIS REVERSES A WRITTEN DECISION.
        
        It said "first, because it decides how to read everything under it", and that argument is
        real. Two things beat it. The same read is already at a glance a few inches down - "How much
        was said · all from memory" is one of the four tiles - so the band on top was the second copy
        of it, and it was the larger one: a bar, a band word and three paragraphs of caveat filling
        the first screen before the reader reached a single finding.
        
        And the templates put the method last and folded, which is the shape Hafsah asked every
        surface to match. A caveat above the thing it qualifies is read as a verdict on it.
        
        Nothing is lost: the tile carries the glance, and the band itself is at the foot with what
        this rests on, which is where somebody goes when they want to know how solid this is.
      */}

      <div style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* The header line: what this is, and how many are in it. */}
        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
          {/* "Still forming" after everybody had answered and the report was out. Three states, not two. */}
          {/*
            WHAT THIS IS FOR, AND WHERE YOU ARE IN IT - the template's header line.

            It said "Session 3", which is a number without a subject. The objective is the thing
            every line underneath is measured against, so it belongs in the one place a reader
            cannot miss, and the position says how much of the run has happened - the marketing
            card has carried "8 accounts · check-in 3 of 6" since before this page existed.
          */}
          <b style={{ fontSize: 15 }}>
            {d.againstSuccess?.stated?.trim() || `Session ${d.sessionNumber}`}
          </b>
          <em style={{ fontFamily: MONO, fontStyle: 'normal', fontSize: 11, color: 'var(--gw-sub)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {[
              ofPeople ? `${ofPeople} account${ofPeople === 1 ? '' : 's'}` : '',
              `check-in ${d.sessionNumber}${d.plannedSessions ? ` of ${d.plannedSessions}` : ''}`,
              /* The state word stays on the forming case. "2 of 4 answered" says how many but not
                 that the picture is still moving, and a reader who has not read one before does
                 not know that a report changes. Both, not one. */
              final ? 'closed'
                : answered >= ofPeople && ofPeople > 0 ? 'everyone answered'
                  : `still forming · ${answered} of ${ofPeople} answered`,
            ].filter(Boolean).join(' · ')}
          </em>
        </div>

        {/*
          WHO THIS IS COUNTING. On a forming report this is the row that says who to chase; on a
          closed one it is a receipt. Kept compact: one line per person, and the only state left is
          whether they answered.
        */}
        {d.counting?.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--gw-border)', display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
            {d.counting.map((c: any, i: number) => (
              <span key={i} style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                <span style={{ color: 'var(--gw-text)', fontWeight: 600 }}>{c.isYou ? `${c.who} (you)` : c.who}</span>
                {' · '}{c.answered ? 'Answered' : 'Not answered yet'}
              </span>
            ))}
          </div>
        )}

        {/* The finding, in amber. One sentence the engines stand behind, worded by the model. */}
        {finding && (
          <div style={{ padding: '20px 20px', background: 'var(--gw-amber-bg)', borderTop: '1px solid var(--gw-border)' }}>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.38, fontWeight: 600, letterSpacing: '-.012em', color: 'var(--gw-text)', maxWidth: '60ch' }}>{finding.text}</p>
            {finding.basis && <small style={{ display: 'block', marginTop: 9, fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.6 }}>{finding.basis}</small>}
            {/*
              WHEN THIS WOULD HAVE COME UP ON ITS OWN.

              Under the finding and nowhere else: on its own it is a remark about a calendar, and
              under the thing it is about it is the reason that thing matters now rather than later.
              The server sends nothing for a one-off read, a last session, or a shock that has
              already surfaced - so there is no branch here, and there does not need to be one.
            */}
            {finding.wouldHaveSurfaced && (
              <small style={{ display: 'block', marginTop: 7, fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.6, opacity: .85 }}>
                {finding.wouldHaveSurfaced}
              </small>
            )}
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

        {/*
          WHAT THIS SITS UNDER, ABOVE WHAT GOOD LOOKS LIKE.

          Where a team's objectives serve a wider one, the wider one has to be on the page before
          anything measured against it. The no case prints too, and only where the situation asked
          for a cascade: "nothing above this has been named yet" is a finding on an alignment
          check-in, not an empty state.
        */}
        {d.cascade && (
          <Row label={d.cascade.isCascade ? 'What this sits under' : 'Nothing above this'}>
            {d.cascade.parentNamed && (
              <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--gw-text)', lineHeight: 1.35 }}>{d.cascade.parentNamed}</p>
            )}
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-sub)', ...PROSE }}>{d.cascade.why}</p>
          </Row>
        )}

        {d.againstSuccess && (
          <Row label="Against what good looks like">
            {/* The definitions render folded below, once; the component's own copy of them is switched off. */}
            {/*
              THE FULL BAND, NOT THE ONE-LINE VERSION.

              `WhatSuccessLooksLike`'s own header says the full band renders "where there is room to
              work in it: the board, and each session's report" - and this, the session's report,
              was passing `dense`, which drops the per-condition standing and the counts and keeps a
              single sentence. So the one read built to answer "where are we against what we said"
              printed one line on the page most people actually open.
            */}
            <WhatSuccessLooksLike data={{ ...d.againstSuccess, definitions: [] }} yourName={yourName} />
            {definitions.length > 0 && (
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
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
            )}
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
          <Row label="Where things stand">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-sub)', ...PROSE }}>{d.whereThingsStand.saying}</p>
          </Row>
        ) : null}

        {/*
          WHAT GOOD LOOKS LIKE. The four versions people gave are shown as quotes, and the line about
          the standard is said once above them: either what is set, or that nothing is. Not both as
          competing statements, and not the same four lines twice.
        */}
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
                    {/*
                      THE WRITTEN SENTENCE FIRST, THE WORDS UNDER IT.

                      This block was eight stacks of disconnected clauses in italics, one cite each,
                      and a reader could not tell from them what any one person had said. The server
                      writes a sentence now.

                      The fragments are not replaced by it. A written summary is a read of somebody's
                      words; the words are the record, and a reader who wants to check the one
                      against the other has to be able to. So they are folded, not dropped - a real
                      `<details>`, which prints open and is announced as expandable.
                    */}
                    {p.saying && (
                      <div style={{ fontSize: 12.5, color: p.lines?.length ? 'var(--gw-text)' : 'var(--gw-muted)', marginBottom: p.lines?.length ? 8 : 0, ...PROSE }}>{p.saying}</div>
                    )}
                    {p.lines?.length ? (
                      p.saying ? (
                        <Folded summary={`In their own words (${p.lines.length})`}>
                          <Quotes items={p.lines.map((text: string) => ({ text, who: p.isYou ? `${p.who} (you)` : p.who }))} yourName={yourName} />
                        </Folded>
                      ) : (
                        <Quotes items={p.lines.map((text: string) => ({ text, who: p.isYou ? `${p.who} (you)` : p.who }))} yourName={yourName} />
                      )
                    ) : null}
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

        {/*
          AND THE HANDOFFS THAT WENT QUIET, WHICH THE READER WAS NEVER TOLD ABOUT.

          The waiting list on this report is the STILL-RAISED one: a handoff nobody has mentioned
          since is left out of it, correctly, because a four-session run should not still say it is
          "waiting for introductions" about introductions that happened in week six.

          But the reader was shown the shorter list with nothing to explain why it was shorter, and
          read it as resolved. It may be. Nobody has said so, and that is what this says. The server
          has produced the sentence since 11 September; nothing rendered it until now.
        */}
        {d.whatWentQuiet && (
          <Row label="Not raised again">
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-text)', ...PROSE }}>{d.whatWentQuiet}</p>
          </Row>
        )}

        {/*
          WHAT KEEPS SHOWING UP IS NOT A SESSION READ, AND IT WAS ON A SESSION PAGE.

          It printed "seen across N sessions" under a heading on the report for ONE session. A
          pattern is a claim about a run by definition - the product's own rule is that a detection
          observed once has not survived recurrence - so a session report carrying it is the same
          content in two places, one of which cannot support it. It is on the board, which is the
          surface about the whole run, and that is the only place it belongs.

          Nothing is lost and nothing is deleted: the detections are unchanged, the board renders
          them with the same sentences, and this page stops claiming a span it cannot see.
        */}

        {/*
          AND NEITHER IS WHAT MOVED. Its two sections are "what changed since last session" and
          "what changed since the beginning" - distances between two points, on the report for one
          of them. One session is a position; the distance between two descriptions is a movement,
          which is the rule `one-session-is-not-a-movement` already states about the starting point.

          It lives on the board, where every measure now reads as where it started, where it is and
          what was said.
        */}

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

        {/* How much there is to go on, in full, beside what it rests on. */}
        {d.confidence && (
          <div style={{ padding: '4px 18px 0' }}><HowMuchThereIsToGoOn read={d.confidence} /></div>
        )}

        {/* The documents, when there are any. When there are none it is a reason under confidence. */}
        {restsOn.length > 0 && restsOn[0].items.length > 0 && (
          <Row label="What this rests on">
            <Quotes items={restsOn[0].items} yourName={yourName} />
          </Row>
        )}


        <div style={{ ...ROW, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          {!final
            ? 'People are still answering, so this moves. '
            : amended
              ? `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''} and updated since, when somebody corrected their own check-in. `
              : `Closed ${d.takenAt ? whenItWas(d.takenAt, 'day') : ''}. This does not change. `}
          {d.showsEverybody
            ? 'Everybody in this check-in reads this same report. Nothing here decides who is right.'
            : 'Until the shared report is out, the words above are your own. The counts are from everybody\'s answers. Nobody else\'s wording reaches you and yours does not reach them.'}
        </div>
      </div>
    </div>
  )
}
