import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { BoardPage } from '@/pages/board/BoardPage'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * EVERY BOARD THE VIEWER MAY READ, AS TABS OVER ONE BOARD.
 *
 * A board lived inside one check-in and nowhere else: to see how three teams were doing you opened
 * three check-ins and clicked Board in each. Asked for directly - "where do I go to see the archive
 * and all team boards" - and the honest answer was that there was no such place.
 *
 * TABS AND NOT CARDS. A summary card is a fourth thing to keep true about a week that the board
 * below it already says, and a manager comparing two teams wants the same board twice, not two
 * paragraphs about two boards. So the tab picks the check-in and the board itself draws, whole,
 * from the component the check-in's own Board page draws. There is one board in this product.
 *
 * WHO SEES WHAT IS NOT DECIDED HERE. `grounds.list` applies who-may-read-this-check-in - an admin
 * gets the organisation's, a lead their department's, everybody else what they take part in - so
 * this page shows whatever that returns and never widens it.
 */
export function TeamBoardsPage() {
  const [params, setParams] = useSearchParams()
  const chosen = params.get('ground') ?? ''
  const { data, isLoading } = useQuery({ queryKey: ['grounds'], queryFn: () => groundsApi.list() })

  const all: any[] = ((data as any)?.grounds ?? data ?? []) as any[]
  /* A board exists once a round has produced one. The rest have nothing to open and are not tabs. */
  const boards = all.filter(g => g.hasBoard)
  /* Running first, because that is what somebody came for; finished keep their place at the end. */
  const tabs = [...boards.filter(g => !g.closedAt), ...boards.filter(g => !!g.closedAt)]
  const active = tabs.find(g => g.id === chosen) ?? tabs[0]

  /*
    TWO TABS READING THE SAME WORDS ARE ONE TAB AS FAR AS ANYBODY CAN TELL.

    Seen on real data: five names across ten check-ins, so half the strip was pairs a person had to
    click to tell apart. Nothing is renamed - the name is theirs.

    THE DATE WAS MY FIRST ANSWER AND IT WAS WRONG. All ten started the same day, so every tab grew
    "· from 31 Aug" and none of them became distinguishable. Checked against the payload: those two
    check-ins match on the name, the people, the rounds and the dates. Nothing separates them
    because nothing about them differs except which one it is.

    So: the date where the date actually differs, and a plain count where it does not. "1 of 2" is
    not informative, and it is true - they are two check-ins with one name - which beats a date that
    looks like an answer and is the same on both.
  */
  const qualifierFor = (() => {
    const byLabel = new Map<string, any[]>()
    for (const g of tabs) byLabel.set(g.label, [...(byLabel.get(g.label) ?? []), g])
    const out = new Map<string, string>()
    for (const [, group] of byLabel) {
      if (group.length < 2) continue
      const dates = group.map(g => (g.startsAt ?? g.createdAt) ?? null)
      const datesSeparate = new Set(dates.map(d => (d ? whenItWas(d, 'dayAndMonth') : ''))).size === group.length
      group.forEach((g, i) => {
        out.set(g.id, datesSeparate
          ? `from ${whenItWas(dates[i]!, 'dayAndMonth')}`
          : `${i + 1} of ${group.length}`)
      })
    }
    return out
  })()

  /* The tab someone is on belongs in the address, so a board can be sent to somebody. */
  useEffect(() => {
    if (active && active.id !== chosen) setParams({ ground: active.id }, { replace: true })
  }, [active?.id])

  if (isLoading) {
    return <div style={WRAP}><p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Loading your boards.</p></div>
  }

  if (tabs.length === 0) {
    return (
      <div style={WRAP}>
        <h1 style={H1}>Team boards</h1>
        <p style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '60ch' }}>
          No boards yet. A board is built the first time everybody on a check-in has answered a
          round. <Link to="/grounds" style={{ color: 'var(--gw-navy)' }}>Your check-ins are here.</Link>
        </p>
      </div>
    )
  }

  return (
    <div style={WRAP}>
      <h1 style={H1}>Team boards</h1>
      <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '0 0 16px', maxWidth: '70ch', lineHeight: 1.55 }}>
        The shared picture from every check-in you can read. Switch between them here.
      </p>

      {/*
        ONE STRIP, RUNNING THEN FINISHED, AND THE FINISHED ONES SAY SO ON THE TAB.
        A separate archive would be a second place to look for a board that reads identically to
        the ones beside it - the only difference is that nothing more is coming.
      */}
      <div
        role="tablist"
        aria-label="Which board to show"
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--gw-border)' }}
      >
        {tabs.map(g => {
          const on = g.id === active!.id
          return (
            <button
              key={g.id}
              role="tab"
              aria-selected={on}
              onClick={() => setParams({ ground: g.id })}
              style={{
                fontSize: 12.5, fontWeight: on ? 700 : 500, fontFamily: 'inherit', cursor: 'pointer',
                padding: '7px 12px', borderRadius: 8,
                border: `1px solid ${on ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                background: on ? 'var(--gw-navy)' : 'var(--gw-card)',
                color: on ? '#fff' : 'var(--gw-text)',
                /* A press on a phone needs somewhere to land. */
                minHeight: 36,
              }}
            >
              {g.label}
              {qualifierFor.get(g.id) && (
                <span style={{ fontWeight: 500, color: on ? 'rgba(255,255,255,.75)' : 'var(--gw-sub)' }}>
                  {` · ${qualifierFor.get(g.id)}`}
                </span>
              )}
              {g.closedAt && (
                <span style={{ fontWeight: 500, color: on ? 'rgba(255,255,255,.75)' : 'var(--gw-sub)' }}>
                  {' · finished'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/*
        B-150: ONE WAY TO THE CHECK-IN ITSELF, NOT ITS WHOLE PAGE REDRAWN. The six-tab chrome this
        page used to draw a second time under the switcher is gone (BoardPage no longer carries
        TheCheckInHeader at all), but that left nothing on this page pointing at the check-in
        behind the board it is showing - someone reading a board who wants to open it had no way
        to. One plain link does what the duplicated chrome never needed to.
      */}
      <div style={{ marginBottom: 10 }}>
        <Link to={`/grounds/${active!.id}`} className="gwui-plain-link">Open this check-in</Link>
      </div>

      {/*
        THE BOARD ITSELF, not a summary of it. Keyed by the check-in so switching tabs remounts
        rather than showing one board's answers under another's name while the next request runs.
      */}
      <BoardPage key={active!.id} groundId={active!.id} />
    </div>
  )
}

const WRAP = { maxWidth: 1100, margin: '0 auto', padding: '28px 20px 80px' } as const
const H1 = { fontSize: 22, fontWeight: 800, margin: '0 0 4px' } as const
