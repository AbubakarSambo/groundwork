/**
 * THE SALES BOARD AS PICTURED (Hafsah, 21 November 2026), ON THE DESIGN SYSTEM (journey 3, 23 November 2026).
 *
 * The prototype's sales board as whoever runs it reads it (docs/prototype/screens/B5-the-board/board-as-lead.txt): its sections in its
 * order and its words, with real data in its slots. On 21 November it was a one-to-one port of the prototype's markup; on 23 November it
 * was rebuilt from the shared building blocks (Section, Panel as the card, EdgeRow as the row, Table, Tag, Button, Empty), so it reads
 * with the same spacing, sizes and buttons as every rebuilt page. Only the deal grid's thirty days keep the prototype's own markup and
 * its stylesheet (the-prototype-boards.css, scoped to .gw-proto): no block draws that picture yet.
 *
 * The header, the tabs and "Last updated" are the board's frame (../TheBoardFrame.tsx), drawn by BoardPage round this.
 *
 * Every slot is filled from the board the server served this reader, after every privacy wall (board.service.ts). Nothing here decides
 * who may read what.
 */
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { namesToCallAmong } from '@/lib/names-that-tell-people-apart'
import { Section, Panel, EdgeList, EdgeRow, Button, Tag, Table, Empty } from '@/components/gw/ui'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { checkInLinksApi } from '@/api/check-in-links'
import { reportsApi } from '@/api/reports'
import { TheNudgeButton } from '../pictured/TheNudgeButton'
import { CORRECT_IT_HERE } from '../pictured/TheBar'
import {
  dealsByGroup, aShortDay, isoDay, lastContactIn, lastTen, aTagForTheWork, useWhatNeedsYou, soldAndProven, TheGoalAsItStands,
  theLastSessionThisWeek, weekNumberOf, ISSUE_STEPS, NOTHING_BOOKED, WhereThisIsHeading,
} from '../pictured/ThePicturedSalesBoard'
import { css, DOT, DOT_FILL } from './the-prototype-markup'
import './the-prototype-boards.css'

/** Each person's own page on this check-in, where The team today links their name. */
const theirPage = (groundId: string, participantId: string) => `/grounds/${groundId}/person/${participantId}`

type Any = any

/** board-as-lead.txt, under the tab bar: one sentence, owned by the board's frame. */
export { THE_BOARD_ONLY_CHANGES } from '../TheBoardFrame'

const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''
/* Each person by first name, and by the whole name where somebody else on the check-in has the same first name (page audit, 24 November, row 11). */
const callThemOn = (b: Any) => namesToCallAmong(((b?.participants ?? []) as Any[]).map((p) => p?.name))
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const inWords = (n: number) => (n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n))
const DAY = 86_400_000

/** The prototype's speech mark, for "Ask" in the header and the Ask bar at the foot. */
export function SpeechMark({ size }: { size: number }) {
  return (
    <svg className="ico-s" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  )
}

/**
 * THE DEAL GROUPS, IN THE PROTOTYPE'S ORDER AND WORDS ("Likely by 30 September", "Possible", "Next quarter", "Cooling", "Cold"), each
 * with the prototype's short reason. The server decides which group each deal is in. A group the server adds that the prototype does
 * not draw (a sale said to be won with nothing shown yet) keeps the server's own heading and reason, after the prototype's.
 */
export function theGroupWords(group: string, ends: string | null): { heading: string; reason: string } | null {
  switch (group) {
    case 'likely': return { heading: ends ? `Likely by ${ends}` : 'Likely', reason: 'Every criterion proven or close, a date before the end, recent contact' }
    case 'possible': return { heading: 'Possible', reason: 'Moving, but missing a criterion or recent contact' }
    case 'next-quarter': return { heading: 'Next quarter', reason: ends ? `Real, but the buying date is after ${ends}` : 'Real, but the buying date is after the end' }
    case 'cooling': return { heading: 'Cooling', reason: 'Contact thinning and nothing booked' }
    case 'cold': return { heading: 'Cold', reason: 'The stall rule you set says drop it' }
    default: return null
  }
}
export const GROUP_ORDER = ['likely', 'possible', 'next-quarter', 'cooling', 'cold']

/** "30 September", as the prototype writes the end of the period. */
export function aLongDay(at: string | null | undefined): string | null {
  if (!at) return null
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(d)
}

/**
 * THE THIRTY WEEKDAYS OF THE DEAL GRID: six weeks of Monday to Friday, this week the fifth, so the last week shows what is booked
 * ahead (the prototype's 24 Aug to 2 Oct around Wednesday 23 September). Each is an ISO day.
 */
export function theThirtyWeekdays(today: string): string[] {
  const monday = new Date(`${today}T12:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) - 4 * 7)
  const out: string[] = []
  for (let w = 0; w < 6; w++) for (let d = 0; d < 5; d++) out.push(new Date(monday.getTime() + (w * 7 + d) * DAY).toISOString().slice(0, 10))
  return out
}

/** A weekend day counts on the Friday before it, so contact on a Saturday is never dropped from the grid. */
export function aWeekdayFor(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T12:00:00Z`)
  const back = d.getUTCDay() === 6 ? 1 : d.getUTCDay() === 0 ? 2 : 0
  return new Date(d.getTime() - back * DAY).toISOString().slice(0, 10)
}

/** What each of a deal's thirty weekdays holds, from its own contact history, its booked next step and today. */
export type ADay = { fill: 'empty' | 'proof' | 'said' | 'booked' | 'ahead'; today: boolean }
export function theDays(r: Any, days: string[], today: string): ADay[] {
  const contact = new Map<string, 'proof' | 'said'>()
  for (const c of r.contactHistory ?? []) {
    const on = aWeekdayFor(String(c.on))
    if (/proof/i.test(c.how ?? '')) contact.set(on, 'proof')
    else if (!contact.has(on)) contact.set(on, 'said')
  }
  const booked = r.due ? aWeekdayFor(String(r.due)) : null
  return days.map((day) => ({
    fill: contact.get(day) ?? (day === booked && day >= today ? 'booked' : day > today ? 'ahead' : 'empty'),
    today: day === today,
  }))
}

/** The lead's board draws each day as the prototype's 13px dot with its fill. */
function theDots(r: Any, days: string[], today: string): string[] {
  return theDays(r, days, today).map((d) => `${DOT}${DOT_FILL[d.fill]}${d.today ? DOT_FILL.today : ''}`)
}

/** The mark beside the stage: filled where a document, a photo or a payment shows it, ringed where it is somebody's word. */
export const aMarkFor = (r: Any) => (r.mark === 'proven' || r.paymentRecord || r.signedOrder ? 'mk rec' : 'mk said')

export interface TheSalesBoardAsPicturedProps {
  b: Any
  groundId: string
  /** The check-in itself (GET /grounds/:id), for its schedule. */
  ground: Any
  sessionRows: Any[]
  /** Who is reading: whoever runs it, an admin who only reads, or a person in it. */
  reader: 'lead' | 'reader' | 'participant'
  /** The engine's own buttons for one thing that needs the lead (the board page's ActionButtons). */
  renderActions: (action: Any) => ReactNode
  onRecordTheDecision: () => void
  navigate: (to: string) => void
}

export function TheSalesBoardAsPictured(p: TheSalesBoardAsPicturedProps) {
  const { b, groundId } = p
  const now = useMemo(() => new Date(), [])
  const today = isoDay(now)
  const lead = p.reader === 'lead'
  const deals = (b.workRecords ?? []).find((s: Any) => s.section === 'Deal grid') ?? null
  const dealRows: Any[] = (deals?.rows ?? []).filter((r: Any) => r.kind === 'deal')
  const groups = dealsByGroup(deals)
  const needs = useWhatNeedsYou({ b, groundId, deals, sessionRows: p.sessionRows, readOnly: !lead })
  const [openId, setOpenId] = useState<string | null>(null)

  const ends = aLongDay(b.phaseSpine?.endsAt)

  /* ---------------------------------------------------------------- the question, the answer and the gap */
  const aim = (b.objectives ?? []).find((o: Any) => !o.ownerParticipantId && o.target != null) ?? null
  const likely = (groups.likely ?? []).length
  const possible: Any[] = groups.possible ?? []
  const nextQuarter = (groups['next-quarter'] ?? []).length
  const coolingOrCold = (groups.cooling ?? []).length + (groups.cold ?? []).length
  const done = aim?.count ?? null
  const target = aim?.target ?? null
  const proven = aim?.fromTheDeals?.proven ?? null
  const gap = b.toCloseTheGap ?? null
  const gapDeals: Any[] = gap?.deals?.length ? gap.deals.map((d: Any) => dealRows.find((r) => r.id === d.id) ?? d) : possible
  const gapHeading: string | null = gap?.heading ?? (target != null && done != null && possible.length
    ? (Math.max(0, target - done - likely) >= possible.length ? `To close the gap, all ${inWords(possible.length)} of these` : `To close the gap, ${inWords(Math.max(0, target - done - likely))} of these ${inWords(possible.length)}`)
    : null)

  /* ---------------------------------------------------------------- the deals, in their groups */
  const thirty = theThirtyWeekdays(today)
  const byId = new Map(dealRows.map((r) => [r.id, r]))
  const servedGroups: Any[] = deals?.groups ?? []
  const groupOrder = [...GROUP_ORDER.filter((g) => servedGroups.some((x) => x.group === g) || (groups[g] ?? []).length), ...servedGroups.map((x) => x.group).filter((g: string) => !GROUP_ORDER.includes(g))]
  const rowsOf = (g: string): Any[] => {
    const ids: string[] = servedGroups.find((x) => x.group === g)?.rowIds ?? (groups[g] ?? []).map((r) => r.id)
    return ids.map((id) => byId.get(id)).filter(Boolean)
  }
  const inOrder = groupOrder.flatMap(rowsOf)
  const open = (openId && byId.get(openId)) || inOrder[0] || null
  const anyProof = inOrder.some((r) => aMarkFor(r) === 'mk rec')

  /* ---------------------------------------------------------------- the team: the people who check in, never the lead herself */
  const leadId = (b.participants ?? []).find((x: Any) => x.partyType === 'INITIATOR')?.id ?? null
  const team: Any[] = (b.eachPersonToday ?? []).filter((r: Any) => r.participantId !== leadId)
  const reasonOf = new Map<string, string>((b.eachPerson ?? []).map((x: Any) => [x.participantId, x.reason]))
  const keepsOf = (pid: string): string | null => {
    const row = team.find((r) => r.participantId === pid)
    const pat = (b.patterns ?? []).find((x: Any) => x.participantId === pid && x.about !== 'what is said against what happened' && x.whatHappened)
    return row?.keepsComingUp ?? (pat ? String(pat.whatHappened).replace(/\.$/, '') : null)
  }
  const gridRows: Any[] = (b.checkInGrid?.rows ?? []).filter((r: Any) => !r.managingOnly && r.participantId !== leadId)

  const sameDayAs = (a: string, d: Date) => isoDay(new Date(a)) === isoDay(d)
  const reportTitle = (r: Any) => {
    if (!r.opened) return `Session ${r.sessionNumber}`
    const day = aShortDay(r.opened)
    const when = sameDayAs(r.opened, now) ? `Today, ${day}` : sameDayAs(r.opened, new Date(now.getTime() - DAY)) ? `Yesterday, ${day}` : day
    /* Two sessions on one day are told apart by their number (the coordinator's check of 21 November: two "Yesterday, 20 Nov" rows). */
    const twin = p.sessionRows.some((x) => x !== r && x.opened && isoDay(new Date(x.opened)) === isoDay(new Date(r.opened)))
    return twin ? `${when}, session ${r.sessionNumber}` : when
  }
  const movedOn = (r: Any): string => {
    const said = r.opened ? (b.whatMovedEachDay ?? {})[isoDay(new Date(r.opened))] : null
    return said ? ` ${said}` : ''
  }
  const written = theLastSessionThisWeek(b, now)
  const week = weekNumberOf(now)
  const [firstReport, secondReport] = p.sessionRows

  /* ---------------------------------------------------------------- the other teams, from the links the board already reads */
  const { data: links } = useQuery({ queryKey: ['check-in-links', groundId], queryFn: () => checkInLinksApi.get(groundId), staleTime: 30_000, retry: false })
  const waiting: Any[] = (links as Any)?.waitingOnOtherTeams ?? []
  const elsewhere = new Set(waiting.map((w) => w.id))
  const blockers: Any[] = (b.blockers ?? []).filter((x: Any) => x.state !== 'cleared' && !elsewhere.has(x.id))

  /* ---------------------------------------------------------------- what keeps coming up */
  const carried: Any[] = (b.keepsComingUp ?? []).map((x: Any, i: number) => ({ id: `carried-${i}`, participantId: x.participantId, yours: x.yours, about: 'the work', whatHappened: x.says }))
  const patterns: Any[] = [...(b.patterns ?? []), ...carried]
  const nameOf = new Map<string, string>((b.participants ?? []).map((x: Any) => [x.id, firstName(x.name)]))
  const aboutTheWork = patterns.filter((x) => x.about !== 'what is said against what happened')
  const aboutWhatIsSaid = new Map<string, Any[]>()
  for (const x of patterns.filter((y) => y.about === 'what is said against what happened')) aboutWhatIsSaid.set(x.heading, [...(aboutWhatIsSaid.get(x.heading) ?? []), x])

  /* ---------------------------------------------------------------- reported against the criteria */
  const stages: Any[] = b.reportedAgainstCriteria?.stages ?? []
  const most = Math.max(1, ...stages.map((s) => s.reported ?? 0), ...stages.map((s) => s.met ?? 0))

  /* ---------------------------------------------------------------- over time, from the record */
  const workPlan: Any[] = b.workPlan ?? []
  const coaching: Any[] = (b.coaching?.eachPerson ?? []).filter((c: Any) => (c.probe ?? []).length || (c.encourage ?? []).length)
  const commitments: Any[] = (b.obligations ?? []).filter((o: Any) => (o.promised ?? []).length)
  const risks: Any[] = b.risks ?? []
  const lost: Any[] = Array.isArray(deals?.lost) ? deals.lost : []
  /* What changed at the end of each session, the same rounds the Report tab reads. */
  const { data: rounds } = useQuery({ queryKey: ['report-rounds', groundId], queryFn: () => reportsApi.rounds(groundId), enabled: !!groundId, retry: false })
  const moved: Any[] = rounds?.moved ?? []

  /* A figure against its whole, as a share of 100 SVG units (the design system's bar). */
  const share = (n: number) => (target ? Math.max(0, Math.min(100, (n / target) * 100)) : 0)
  const provenShare = share(proven ?? done ?? 0)
  const saidShare = share(Math.max(0, (done ?? 0) - (proven ?? done ?? 0)))
  const likelyShare = share(likely)
  const nameIn = (pid: string | null | undefined, who: string | null | undefined) => (pid && pid === b.myParticipantId ? 'You' : firstName(who))
  const helpLines: string[] = (() => {
    const h = b.helpNobodyMentioned
    return Array.isArray(h?.rows) ? h.rows.map((r: Any) => r.says ?? r.text ?? String(r)) : Array.isArray(h?.lines) ? h.lines : h?.says ? [h.says] : []
  })()

  /*
   * JOURNEY 3, ON THE DESIGN SYSTEM (Hafsah, 23 November 2026). The prototype's sections, in its order and its words, each drawn from the
   * shared blocks: a section is its title, one line, the content and at most one action; a card holds one thing; a row's actions are
   * links on its right; an empty part is one line or nothing. The header, the tabs and "Last updated" are the board's frame
   * (TheBoardFrame.tsx). Only the deal grid keeps the prototype's own markup, the thirty days being a picture no block draws.
   */
  return (
    <>
      {(b.headline || aim) && (
        <div className="ds-grid ds-grid-2">
          <div className="ds-pair">
            {b.headline?.question && <p className="ds-text-secondary">{b.headline.question}</p>}
            {b.headline?.answer && <p className="ds-text-title">{b.headline.answer}</p>}
            <TheGoalAsItStands b={b} aim={aim} cls={{ label: 'ds-text-secondary', goal: 'ds-text-title', said: 'ds-text-body' }} />
            {target != null && done != null && (
              <svg className="ds-bar" viewBox="0 0 100 16" preserveAspectRatio="none" role="img" aria-label={`${done} of ${target} done, ${likely} more likely.`}>
                <rect className="whole" x="0" y="0" width="100" height="16" />
                <rect className="rec" x="0" y="0" width={provenShare} height="16" />
                <rect className="act" x={provenShare} y="0" width={saidShare} height="16" />
                <rect className="att" x={provenShare + saidShare} y="0" width={likelyShare} height="16" />
              </svg>
            )}
            <p className="ds-spread ds-text-secondary">
              {done != null && (aim?.fromTheDeals && aim.fromTheDeals.counts !== 'new leads'
                ? <span>{soldAndProven(aim.fromTheDeals)}</span>
                : <span><b className="ds-num">{done}</b> {aim?.name && /sale/i.test(aim.name) ? 'sold' : 'done'}</span>)}
              <span><b className="ds-num">{likely}</b> likely</span>
              <span><b className="ds-num">{possible.length}</b> possible</span>
              <span><b className="ds-num">{nextQuarter}</b> next quarter, <b className="ds-num">{coolingOrCold}</b> cooling or cold</span>
            </p>
            <p className="ds-text-secondary">No chance-to-close percentages yet. They need a quarter of this team’s own results.</p>
          </div>
          {gapHeading && gapDeals.length > 0 && (
            <Panel as="section" heading={gapHeading} aria-label={gapHeading}>
              <EdgeList label={gapHeading}>
                {gapDeals.map((d) => (
                  <EdgeRow key={d.id} title={d.name} detail={d.nextStep ?? d.next ?? NOTHING_BOOKED} actions={<span className="ds-text-meta">{firstName(d.owner)}</span>} />
                ))}
              </EdgeList>
            </Panel>
          )}
        </div>
      )}
      {(aim?.assumes ?? []).length > 0 && (
        <Panel as="section" id="assumes" heading={`What the target of ${Number(aim.target).toLocaleString('en-GB')} assumes`}>
          <ul className="ds-list ds-text-body">
            {aim.assumes.map((a: string) => <li key={a}>{a}</li>)}
          </ul>
          <p className="ds-text-secondary">If one of these stops being true, the target needs a second look.</p>
        </Panel>
      )}
      {needs.length > 0 && (
        <Section heading="What needs you in this check-in">
          <EdgeList label="What needs you in this check-in">
            {needs.map((n) => (
              <EdgeRow key={n.key} kind={n.kind} title={n.title} detail={n.detail} actions={lead && (n.node || n.action) ? (n.node ?? p.renderActions(n.action)) : undefined} />
            ))}
          </EdgeList>
        </Section>
      )}
      {deals && (
        <Section heading="Every deal, day by day" note="Grouped by what the proof says about closing this quarter." foot={inOrder.length ? CORRECT_IT_HERE : undefined}>
          {inOrder.length === 0 ? <Empty>No deals have come up yet.</Empty> : (
            <div className="gw-proto">
              <div style={css('display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px')} className="t-small mut">
                {anyProof && <span style={css('display:flex;gap:6px;align-items:center')}><i className="mk rec" />Contact with proof: a photo, a quote, a payment</span>}
                <span style={css('display:flex;gap:6px;align-items:center')}><i className="mk said" />Contact in their words</span>
                <span style={css('display:flex;gap:6px;align-items:center')}><i className="mk" style={css('box-shadow:inset 0 0 0 2px var(--act);background:var(--act-soft)')} />Next step booked</span>
                <span style={css('display:flex;gap:6px;align-items:center')}><i className="mk none" />Follow-up, no reply</span>
              </div>
              <div className="panel scroll-x">
                <div style={css('display:grid;grid-template-columns:210px 150px 90px repeat(30,13px) 1fr;column-gap:3px;padding:12px 18px;align-items:end;min-width:960px')}>
                  <span className="t-tiny mut">Deal</span>
                  <span className="t-tiny mut">Stage now</span>
                  <span className="t-tiny mut">Last contact</span>
                  {[0, 5, 10, 15, 20, 25].map((i) => <span key={i} className="t-tiny mut" style={css('grid-column:span 5')}>{aShortDay(`${thirty[i]}T12:00:00Z`)}</span>)}
                  <span className="t-tiny mut" style={css('padding-left:12px')}>Next step</span>
                </div>
                {groupOrder.map((g) => {
                  const words = theGroupWords(g, ends) ?? (() => { const s = servedGroups.find((x) => x.group === g); return s ? { heading: s.heading, reason: s.reason } : null })()
                  const rows = rowsOf(g)
                  if (!words || !rows.length) return null
                  return (
                    <Fragment key={g}>
                      <div style={css('padding:14px 18px 6px;border-top:1px solid var(--rule);background:var(--paper);display:flex;gap:10px;align-items:baseline;min-width:960px')}>
                        <b className="t-small">{words.heading}</b>
                        <span className="t-tiny mut">{words.reason}</span>
                      </div>
                      {rows.map((r) => {
                        const value = r.valueLine ?? r.value ?? null
                        const next = r.group === 'cold' ? 'Stall rule reached' : r.nextStep ?? r.next ?? NOTHING_BOOKED
                        const nextColour = r.group === 'cold' ? 'color:var(--con)' : r.nextStep || r.next ? 'color:var(--act)' : 'color:var(--att)'
                        return (
                          <div key={r.id} style={css('display:grid;grid-template-columns:210px 150px 90px repeat(30,13px) 1fr;column-gap:3px;align-items:center;padding:10px 18px;border-top:1px solid var(--rule);min-width:960px')}
                            className={r.id === open?.id ? 'dealrow on' : 'dealrow'} role="button" tabIndex={0} aria-label={`Show ${r.name}`}
                            onClick={() => setOpenId(r.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(r.id) } }}>
                            <div>
                              <b className="t-small">{r.name}</b>
                              <div className="t-tiny mut">{[firstName(r.owner), value].filter(Boolean).join(', ')}</div>
                            </div>
                            <span className="t-small" style={css('display:flex;gap:6px;align-items:center')}><i className={aMarkFor(r)} />{r.stageSays ?? r.stage ?? 'Not contacted yet'}</span>
                            <span className="t-tiny mut">{lastContactIn(r, today)}</span>
                            {theDots(r, thirty, today).map((s, i) => <i key={i} style={css(s)} />)}
                            <span className="t-small" style={css(`padding-left:12px;${nextColour}`)}>{next}</span>
                          </div>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </div>
            </div>
          )}
          {open && (
            <div className="ds-grid ds-grid-3" id="dealdetail">
              <Panel as="section" aria-label={open.name}>
                <p className="ds-text-card">{open.name}</p>
                <p className="ds-spread ds-text-secondary">
                  {(open.valueLine ?? open.value) && <span className="ds-num">{open.valueLine ?? open.value}</span>}
                  <Tag tone={aMarkFor(open) === 'mk rec' ? 'proven' : 'plain'}>{aMarkFor(open) === 'mk rec' ? 'Proven' : 'In their words'}</Tag>
                  <span>{[firstName(open.owner), lastContactIn(open, today) ? `last contact ${lastContactIn(open, today)}` : null].filter(Boolean).join(', ')}</span>
                </p>
                {(open.groupSays ?? servedGroups.find((g) => (g.rowIds ?? []).includes(open.id))?.reason) && (
                  <p className="ds-text-secondary"><b>Why it’s here.</b> {open.groupSays ?? servedGroups.find((g) => (g.rowIds ?? []).includes(open.id))?.reason}</p>
                )}
                {(open.criteria ?? []).map((c: Any) => <p key={c.criterion} className={c.met ? 'ds-text-secondary ds-note-rec' : 'ds-text-secondary'}>{`${c.met ? '✓' : '○'} ${c.label}`}</p>)}
                <p className="ds-text-secondary ds-note-act"><b>Next:</b> {open.next ?? open.nextStep ?? NOTHING_BOOKED}</p>
              </Panel>
              <Panel as="section" heading="Contact history" aria-label="Contact history">
                {(open.contactHistory ?? []).length ? (
                  <div role="list" aria-label="Contact history">
                    {open.contactHistory.slice(0, 5).map((c: Any) => (
                      <div key={c.on} className="ds-when" role="listitem">
                        <span className="ds-text-secondary ds-num">{aShortDay(`${c.on}T12:00:00Z`)}</span>
                        <span className="ds-text-secondary">{/proof/i.test(c.how ?? '') ? 'With proof' : 'In their words'}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="ds-text-secondary">Nobody has spoken about it in a check-in yet.</p>}
              </Panel>
              {open.theirRead?.words && (
                <Panel as="section" heading={open.theirRead.who === 'You' ? 'Your read, in your words' : `${firstName(open.theirRead.who)}’s read, in their words`}>
                  <p className="ds-text-body">{`“${open.theirRead.words}”`}</p>
                  <Button kind="quiet" onClick={() => p.navigate(`/grounds/${groundId}`)}>Not right? Tell the check-in</Button>
                </Panel>
              )}
            </div>
          )}
        </Section>
      )}
      {team.length > 0 && (
        <Section heading="The team today" note="Each person’s line, their last 10 check-ins, and what keeps coming up.">
          <Table
            caption="The team today"
            hideHeader
            phone="stack"
            onPanel={false}
            limit={50}
            columns={[
              { key: 'who', header: 'Who', rowHeader: true, width: '15%' },
              { key: 'line', header: 'Their line' },
              { key: 'tag', header: 'The work' },
              { key: 'squares', header: 'Last 10 check-ins' },
              { key: 'keeps', header: 'Comes up again' },
            ]}
            rows={team.map((r) => {
              /* The row's own reason, as served: the board says whether they have answered with the same rule as everywhere else. */
              const reason = String(reasonOf.get(r.participantId) ?? '')
              /* What their work shows, never the day they were last in: that is what the squares beside it say. */
              const tag = aTagForTheWork(reason, dealRows.filter((d) => d.ownerParticipantId === r.participantId), today, r.workTag)
              return {
                who: <Link to={theirPage(groundId, r.participantId)}>{callThemOn(b)(r.who)}</Link>,
                line: r.line,
                tag: tag ? { tag: tag.word, tone: tag.tone === 'proven' ? 'proven' : tag.tone === 'attention' ? 'attention' : 'plain' } : '',
                squares: <TenSquares squares={lastTen(b, r.participantId)} />,
                keeps: keepsOf(r.participantId) || (lead && r.nudge) ? <>{keepsOf(r.participantId)}{lead && r.nudge && <> <TheNudgeButton groundId={groundId} nudge={r.nudge} /></>}</> : null,
              }
            })}
          />
        </Section>
      )}
      <Section heading="Blockers" note="Each with its history and the one thing that would clear it.">
        {blockers.length ? blockers.map((x) => {
          const isADecision = !!b.myParticipantId && x.onParticipantId === b.myParticipantId
          const tag = isADecision ? { tone: 'action' as const, word: 'Decision' } : x.state === 'blocking' ? { tone: 'concern' as const, word: 'Blocking' } : { tone: 'attention' as const, word: 'Waiting' }
          const on = isADecision ? 'You' : (x.on ?? x.onLabel ?? null)
          return (
            <Panel as="section" key={x.id} aria-label={x.name ?? x.says}>
              <p className="ds-spread"><span className="ds-text-card">{x.name ? x.name.charAt(0).toUpperCase() + x.name.slice(1) : x.says}</span><Tag tone={tag.tone}>{tag.word}</Tag></p>
              {on && <p className="ds-text-secondary">Waiting on: {on}</p>}
              {x.raised?.says && <p className="ds-text-secondary">Raised: {x.raised.says}</p>}
              {x.holdingUp && <p className="ds-text-secondary">Affects: {x.holdingUp}</p>}
              {x.timeGiven && !/^No time has been given/.test(x.timeGiven) && <p className="ds-text-secondary">Promised: {x.timeGiven}</p>}
              {x.proof?.says && <p className="ds-text-secondary">What the proof shows: {x.proof.says}</p>}
              {(x.wouldClearIt ?? x.wouldClearItSays) && <p className="ds-text-secondary ds-note-act"><b>Would clear it:</b> {x.wouldClearIt ?? x.wouldClearItSays}</p>}
            </Panel>
          )
        }) : (
          <p className="ds-text-body">{(() => {
            const waits = dealRows.filter((r) => (r.waitingOnTheCustomer ?? []).length > 0).length
            return `Nobody has raised anything that blocks the team.${waits ? ` ${waits === 1 ? 'The one wait on a customer is on its deal' : `The ${inWords(waits)} waits on customers are on their deals`}, above.` : ''}`
          })()}</p>
        )}
      </Section>
      {patterns.length > 0 && (
        <Section heading="What keeps coming up">
          <div className="ds-grid ds-grid-2">
            {aboutTheWork.length > 0 && (
              <Panel as="section" heading="About each person’s work">
                <div role="list" aria-label="About each person’s work">
                  {aboutTheWork.map((x) => (
                    <div key={x.id} className="ds-when" role="listitem">
                      <span className="ds-text-secondary"><b>{x.yours ? 'You' : nameOf.get(x.participantId) ?? ''}</b></span>
                      <span className="ds-text-secondary">{x.whatHappened ?? x.heading}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            {aboutWhatIsSaid.size > 0 && (
              <Panel as="section" heading="How what people say can run ahead of what happened">
                <EdgeList label="How what people say can run ahead of what happened">
                  {[...aboutWhatIsSaid.entries()].map(([h, xs]) => (
                    <EdgeRow key={h} title={h} detail={`${xs[0]?.whatHappened ?? ''} ${xs.map((x) => (x.yours ? 'You' : nameOf.get(x.participantId) ?? '')).filter(Boolean).join(', ')}`.trim()} />
                  ))}
                </EdgeList>
              </Panel>
            )}
          </div>
        </Section>
      )}
      {stages.length > 0 && (
        <Section heading="Reported vs criteria met, stage by stage" note="The shape of the work." foot="Outlined: what people reported. Filled: what meets the criteria.">
          <Table
            caption="Reported vs criteria met, stage by stage"
            onPanel={false}
            columns={[
              { key: 'stage', header: 'Stage', rowHeader: true, width: '20%' },
              { key: 'bar', header: 'Reported and met' },
              { key: 'figures', header: 'Said and met', numeric: true, width: '20%' },
            ]}
            rows={stages.map((s) => ({
              stage: s.stage,
              bar: (
                <svg className="ds-bar" viewBox="0 0 100 16" preserveAspectRatio="none" role="img" aria-label={s.says}>
                  {s.reported != null && <rect className="said" x="0.5" y="0.5" width={Math.max(0, (s.reported / most) * 100 - 1)} height="15" />}
                  {(s.met ?? 0) > 0 && <rect className="rec" x="0" y="4" width={(s.met / most) * 100} height="8" />}
                </svg>
              ),
              figures: s.reported == null ? `${s.met} met` : `${s.reported} said, ${s.met ?? 0} met`,
            }))}
          />
        </Section>
      )}
      {gridRows.length > 0 && (
        <Section heading="Who checked in" note="The last 10 sessions, one row each.">
          <Table
            caption="Who checked in"
            hideHeader
            onPanel={false}
            limit={50}
            columns={[{ key: 'who', header: 'Who', rowHeader: true, width: '20%' }, { key: 'squares', header: 'The last 10 sessions' }]}
            rows={gridRows.map((r) => ({ who: callThemOn(b)(r.name), squares: <TenSquares squares={lastTen(b, r.participantId)} /> }))}
          />
        </Section>
      )}
      {(moved.length > 0 || workPlan.length > 0 || coaching.length > 0 || commitments.length > 0 || risks.length > 0 || lost.length > 0) && (
        <details className="ds-fold">
          <summary><span className="ds-text-section">Over time</span><span className="ds-btn ds-btn-link">Show</span></summary>
          <div className="ds-fold-body">
            {moved.length > 0 && (
              <Section heading="What changed" note="Work, response, adaptation, result: week by week.">
                <div role="list" aria-label="What changed">
                  {moved.map((m) => (
                    <div key={`${m.sessionNumber}-${m.takenAt}`} className="ds-when" role="listitem">
                      <span className="ds-text-secondary"><b>{m.sessionNumber != null ? `Session ${m.sessionNumber}` : aShortDay(m.takenAt)}</b></span>
                      <span className="ds-text-body">{m.says}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {workPlan.length > 0 && (
              <Section heading="Work plan, against what happened" note="Where it moved, and whether it was re-agreed.">
                <Table caption="Work plan, against what happened" onPanel={false} phone="stack"
                  columns={[{ key: 'says', header: 'What', rowHeader: true }, { key: 'who', header: 'Who', width: '20%' }, { key: 'when', header: 'When', width: '20%' }]}
                  rows={workPlan.map((w) => ({ says: w.says, who: nameIn(w.participantId, w.who), when: w.when ?? '' }))} />
              </Section>
            )}
            {coaching.length > 0 && (
              <Section heading="Coaching, and whether it changed anything" note="Judged by what changed in the weeks after.">
                <div className="ds-grid ds-grid-3">
                  {coaching.map((c) => (
                    <Panel as="section" key={c.participantId} heading={callThemOn(b)(c.who)}>
                      {[...(c.probe ?? []), ...(c.encourage ?? [])].map((l: string) => <p key={l} className="ds-text-secondary">{l}</p>)}
                    </Panel>
                  ))}
                </div>
              </Section>
            )}
            {commitments.length > 0 && (
              <Section heading="Commitments" note="What each person agreed, how it’s going, and what they said they’ll do next.">
                <Table caption="Commitments" onPanel={false} phone="stack"
                  columns={[{ key: 'who', header: 'Who', rowHeader: true, width: '15%' }, { key: 'promised', header: 'What they agreed' }, { key: 'waits', header: 'Who waits for it' }]}
                  rows={commitments.map((o) => ({ who: nameIn(o.participantId, o.who), promised: o.promised.join(' '), waits: (o.othersWaitFor ?? []).join(' ') }))} />
              </Section>
            )}
            {risks.length > 0 && (
              <Section heading="Risks" note="What could stop the goal, with what the proof shows.">
                <div className="ds-grid ds-grid-3">
                  {risks.map((x) => (
                    <Panel key={x.id}>
                      <p className="ds-text-body">{x.says}</p>
                      {x.because && <p className="ds-text-secondary">{x.because}</p>}
                    </Panel>
                  ))}
                </div>
              </Section>
            )}
            {lost.length > 0 && (
              <Section heading="Lost deals, and why" note="A reason with no source stays unverified.">
                <Table caption="Lost deals, and why" onPanel={false} phone="stack"
                  columns={[
                    { key: 'name', header: 'Deal', rowHeader: true }, { key: 'who', header: 'Who' }, { key: 'on', header: 'When' },
                    { key: 'reason', header: 'Why' }, { key: 'from', header: 'Where the reason comes from' }, { key: 'lesson', header: 'The lesson' },
                  ]}
                  rows={lost.map((l) => ({
                    name: l.name, who: nameIn(l.ownerParticipantId, l.owner), on: aShortDay(`${l.on}T12:00:00Z`),
                    reason: l.reason ?? 'Unknown', from: l.reasonFrom ?? 'No reason given', lesson: l.lesson ?? 'Every lost deal needs a reason',
                  }))} />
              </Section>
            )}
          </div>
        </details>
      )}
      {firstReport && (
        <Section heading="Reports" note="Every session has two: each person’s own, and the team’s once you share it." action={<Button kind="quiet" to={`/grounds/${groundId}?tab=report`}>Every session</Button>}>
          <EdgeList label="Reports">
            {[firstReport, 'this-week', secondReport].filter(Boolean).map((r: Any) => {
              if (r === 'this-week') return (
                <EdgeRow key="week" title="This week" detail={`Week ${week} so far.${written ? ` Written ${written}.` : ''}`}
                  actions={<Button kind="quiet" to={`/grounds/${groundId}/report/week`}>Preview</Button>} />
              )
              /* The one count, as served for this session (session-rows.ts, howManyCheckedIn), never counted here. */
              return (
                <EdgeRow key={r.sessionNumber} title={reportTitle(r)} detail={`${r.answered} of ${r.total} checked in.${movedOn(r)}`}
                  actions={<>
                    <Tag tone={r.shared ? 'proven' : 'attention'}>{r.shared ? 'Shared' : 'Not shared'}</Tag>
                    {r.shared
                      ? <Button kind="quiet" to={`/grounds/${groundId}/session/${r.sessionNumber}`}>Open</Button>
                      : <Button kind="quiet" to={`/grounds/${groundId}?tab=report`}>{lead ? 'Share it' : 'Open'}</Button>}
                  </>} />
              )
            })}
          </EdgeList>
        </Section>
      )}
      {helpLines.length > 0 && (
        <Section heading="Help nobody mentioned" note="You see the help, not who said it.">
          {helpLines.map((l) => <p key={l} className="ds-text-body">{l}</p>)}
        </Section>
      )}
      {/* Only what the links between check-ins hold. Waiting on somebody outside them (Amani on Baraka in Operations) is under Blockers, so
          the empty part is not drawn: "Nothing is waiting on another team" was untrue beside it (release test, 21 November 2026, bug 30). */}
      {waiting.length > 0 && (
        <Section heading="Waiting on other teams" note="These show on their boards too.">
          <EdgeList label="Waiting on other teams">
            {waiting.map((w) => (
              <EdgeRow key={w.id} kind="look" title={w.team ? `${w.team}: ${w.what}` : w.what} detail={`Asked ${aShortDay(w.asked)}.${w.says ? ` ${w.says}` : ''}`}
                actions={w.open ? <Button kind="quiet" to={w.open.to}>{`Open in ${w.open.label}`}</Button> : <Button kind="quiet" to={`/grounds/${groundId}/trace`}>See where it started</Button>} />
            ))}
          </EdgeList>
        </Section>
      )}
      {(b.openIssues?.issues ?? []).length > 0 && (
        <Section heading="Open issues">
          <div className="ds-grid ds-grid-2">
            {b.openIssues.issues.map((i: Any) => {
              const at = Math.max(0, ISSUE_STEPS.indexOf(i.step))
              return (
                <Panel as="section" key={i.id} heading={i.title}>
                  <p className="ds-spread" aria-label="Where it is">
                    {ISSUE_STEPS.map((s, n) => n === at
                      ? <span key={s} aria-current="step"><Tag tone="action">{`${s} (now)`}</Tag></span>
                      : <Tag key={s} tone={n < at ? 'proven' : 'plain'}>{n < at ? `✓ ${s}` : s}</Tag>)}
                  </p>
                  {i.next && <p className="ds-text-secondary"><b>{`Next: ${i.next}`}</b></p>}
                  {i.conversation ? (
                    <>
                      <p className="ds-text-body"><b>{i.conversation.heading}</b></p>
                      <p className="ds-text-secondary">{i.conversation.says}</p>
                      <p className="ds-text-secondary"><b>A way to start:</b> {i.conversation.wayToStart}</p>
                    </>
                  ) : i.says && <p className="ds-text-secondary">{i.says}</p>}
                  {lead && (i.action || i.quiet) && <div className="ds-actions">{i.action && p.renderActions(i.action)}{i.quiet && <TheQuietOne quiet={i.quiet} />}</div>}
                </Panel>
              )
            })}
          </div>
        </Section>
      )}
      <WhereThisIsHeading b={b} onRecordTheDecision={p.onRecordTheDecision} readOnly={!lead} />
    </>
  )
}

/** The last ten check-ins as ten small squares, filled where the person checked in (the design system's squares). */
function TenSquares({ squares }: { squares: string[] }) {
  return (
    <svg className="ds-squares" viewBox={`0 0 ${squares.length * 13} 18`} role="img"
      aria-label={`Checked in ${squares.filter((s) => s === 'done').length} of the last ${squares.length}.`}>
      {squares.map((s, i) => <rect key={i} className={s === 'done' ? 'on' : 'off'} x={i * 13 + 0.75} y="0.75" width="9.5" height="16.5" rx="2.5" />)}
    </svg>
  )
}

/** "Not now": the engine's own sentence for what staying open means, said where the button was. */
function TheQuietOne({ quiet }: { quiet: { label: string; says: string } }) {
  const [said, setSaid] = useState(false)
  return said ? <p className="ds-text-secondary">{quiet.says}</p> : <Button kind="quiet" onClick={() => setSaid(true)}>{quiet.label}</Button>
}
