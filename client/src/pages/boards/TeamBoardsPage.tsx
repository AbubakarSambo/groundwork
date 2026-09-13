import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { HowItIsGoing, type Glance } from '@/components/gw/how-it-is-going'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * EVERY BOARD THE VIEWER MAY READ, ON ONE PAGE.
 *
 * A board lived inside one check-in and nowhere else: to see how three teams were doing you opened
 * three check-ins and clicked Board in each. Asked for directly - "where do I go to see the archive
 * and all team boards" - and the honest answer was that there was no such place.
 *
 * THIS IS NOT A NEW READ. Every row is the board's own summary and the board's own two facts, from
 * the list the check-ins page already draws, through the component that page draws them with. A
 * second place computing "how it is going" is how two screens come to disagree about one week.
 *
 * WHO SEES WHAT IS NOT DECIDED HERE. `grounds.list` applies who-may-read-this-check-in - an admin
 * gets the organisation's, a lead their department's, everybody else what they take part in - so
 * this page shows whatever that returns and never widens it.
 */
export function TeamBoardsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['grounds'], queryFn: () => groundsApi.list() })

  const rows = useMemo(() => {
    const all: any[] = ((data as any)?.grounds ?? data ?? []) as any[]
    /* A board exists once a round has produced one. The rest have nothing to open yet and saying so
       beats a link that lands on an empty page. */
    return all.filter(g => g.hasBoard)
  }, [data])

  const open = rows.filter(g => !g.closedAt)
  const closed = rows.filter(g => !!g.closedAt)

  if (isLoading) return <div style={WRAP}><p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Loading your boards.</p></div>

  return (
    <div style={WRAP}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Team boards</h1>
      <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '0 0 20px', maxWidth: '70ch', lineHeight: 1.55 }}>
        The shared picture from every check-in you can read. Open one to see where people differ,
        where each person is, and what is in the way.
      </p>

      {rows.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '60ch' }}>
          No boards yet. A board is built the first time everybody on a check-in has answered a
          round. <Link to="/grounds" style={{ color: 'var(--gw-navy)' }}>Your check-ins are here.</Link>
        </p>
      )}

      {open.length > 0 && <Pile title="Running" rows={open} go={navigate} />}
      {/*
        THE ARCHIVE, AND IT IS ALWAYS NAMED. The check-in list hides its Closed tab until something
        is closed, which means somebody looking for where finished work goes finds nothing at all.
        Here the heading is drawn whenever there is a closed board and the empty case is a sentence,
        so the answer to "where is the archive" is on the page either way.
      */}
      <Pile
        title="Finished"
        rows={closed}
        go={navigate}
        empty="Nothing has finished yet. When a check-in closes, its board stays here to read."
      />
    </div>
  )
}

const WRAP = { maxWidth: 900, margin: '0 auto', padding: '28px 20px 80px' } as const

function Pile({ title, rows, go, empty }: {
  title: string
  rows: any[]
  go: (to: string) => void
  empty?: string
}) {
  if (rows.length === 0 && !empty) return null
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--gw-muted)', fontWeight: 700, margin: '0 0 10px' }}>
        {title}{rows.length > 0 ? ` (${rows.length})` : ''}
      </h2>
      {rows.length === 0
        ? <p style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.55 }}>{empty}</p>
        : <div style={{ display: 'grid', gap: 12 }}>{rows.map(g => <BoardRow key={g.id} g={g} go={go} />)}</div>}
    </section>
  )
}

function BoardRow({ g, go }: { g: any; go: (to: string) => void }) {
  /*
    ONE PILL PER SESSION, NOT ONE PER PERSON.
    `checkIns` is a row for each participant in each session, so a three-person round drew "Session
    1" three times. Folded by session number, and a session counts as finished once anybody has
    finished it, because that is what makes a report exist to open.
  */
  const sessions = Array.from(
    ((g.checkIns ?? []) as any[])
      .filter((c) => !!c.sessionNumber)
      .reduce((byNumber: Map<number, any>, c) => {
        const seen = byNumber.get(c.sessionNumber)
        if (!seen) byNumber.set(c.sessionNumber, { ...c })
        else if (c.completedAt && (!seen.completedAt || c.completedAt < seen.completedAt)) {
          seen.completedAt = c.completedAt
        }
        return byNumber
      }, new Map<number, any>())
      .values(),
  ).sort((a: any, b: any) => a.sessionNumber - b.sessionNumber)
  return (
    <div
      style={{
        border: '1px solid var(--gw-border)', borderRadius: 12, padding: '14px 16px',
        background: 'var(--gw-card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <button
          onClick={() => go(`/grounds/${g.id}/board`)}
          style={{
            background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer',
            fontSize: 15, fontWeight: 700, color: 'var(--gw-text)', textAlign: 'left',
          }}
        >
          {g.label}
        </button>
        <span style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>
          {g.closedAt ? `Finished ${whenItWas(g.closedAt, 'dayAndMonth')}` : `${(g.participants ?? []).length} people`}
        </span>
      </div>

      <HowItIsGoing summary={g.latestSummary} brief={g.brief} glance={g.glance as Glance} />

      {/*
        THE SESSIONS, SO THE RUN CAN BE WALKED FROM HERE RATHER THAN FROM INSIDE EACH BOARD.
        A finished session opens its REPORT, not its transcript - the rule every other list in this
        product already keeps. A session nobody has finished has nothing behind it, so it is not a
        link.
      */}
      {sessions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {sessions.map((c: any) => {
            const been = !!c.completedAt
            const face = `Session ${c.sessionNumber}${c.completedAt ? ` · ${whenItWas(c.completedAt, 'dayAndMonth')}` : ''}`
            const skin = {
              fontSize: 11, padding: '4px 10px', borderRadius: 20,
              background: been ? 'var(--gw-green-bg)' : 'var(--gw-bg)',
              color: been ? 'var(--gw-green-t)' : 'var(--gw-sub-d)',
              fontWeight: been ? 700 : 500,
            } as const
            if (!been) return <span key={c.sessionNumber} style={skin}>{face}</span>
            return (
              <button
                key={c.sessionNumber}
                onClick={() => go(`/grounds/${g.id}/session/${c.sessionNumber}`)}
                style={{ ...skin, border: '1px solid transparent', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                {face}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
